"""Celery-задачи: пересчёт уровня риска отчисления студентов (ML + legacy fallback).

Модуль реализует два Celery-задания для пересчёта ML-скоринга:
    1. ``recalculate_all_students_risk`` — ночной пакетный пересчёт всех
       активных студентов. Используется MLRiskScorer для batch-предсказания.
    2. ``recalculate_student_risk`` — событийный пересчёт одного студента,
       вызываемый после conduct-урока или выставления оценки.

При ошибке ML-модели (файл не найден, некорректные данные) автоматически
переключается на legacy-алгоритм — пороговый пересчёт на основе GPA
и attendance_percent из доменной сущности Student.

Результаты ML-скоринга (доменные суб-оценки и вероятность отчисления)
сохраняются в таблицу ``risk_factors`` для аудита и отображения в UI.
"""

from __future__ import annotations

import asyncio
from datetime import UTC

from src.infrastructure.workers.celery_app import celery_app


@celery_app.task(name="src.infrastructure.workers.tasks.risk.recalculate_all_students_risk")
def recalculate_all_students_risk() -> dict:  # type: ignore[type-arg]
    """Пересчитывает уровень риска для всех активных студентов через ML-модель.

    Ночное Celery-задание (beat_schedule, каждые 24 часа). Выполняет:
        1. Batch-извлечение 14 признаков для всех активных студентов.
        2. Batch-предсказание вероятности отчисления.
        3. Маппинг вероятности в RiskLevel и обновление записей в БД.
        4. Сохранение RiskFactorModel записей для аудита.

    При ошибке ML (FileNotFoundError, RuntimeError) переключается на legacy
    пороговый алгоритм (Student.recalculate_risk()).

    Returns:
        Словарь {"updated": int, "changed": int} — количество обработанных
        студентов и количество студентов, у которых изменился уровень риска.
    """
    return asyncio.run(_recalculate_all())


async def _recalculate_all() -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация пакетного пересчёта риска.

    Создаёт сессию БД, выполняет ML-скоринг через MLRiskScorer,
    обновляет risk_level студентов и сохраняет risk_factors.
    При ошибке откатывает транзакцию и запускает legacy-пересчёт.

    Returns:
        Словарь {"updated": int, "changed": int}.
    """
    from src.database import async_session_factory
    from src.infrastructure.persistence.repositories.lms.student_repository import (
        SqlStudentRepository,
    )

    updated = 0
    changed = 0

    async with async_session_factory() as session:
        try:
            from src.ml.risk_scorer import MLRiskScorer

            scorer = MLRiskScorer(session)
            results = await scorer.score_all_active(session)
            repo = SqlStudentRepository(session)

            for result in results:
                student = await repo.get_by_id(result.student_id)
                if student is None:
                    continue
                old_level = student.risk_level
                student.risk_level = result.risk_level
                if student.risk_level != old_level:
                    await repo.save(student)
                    changed += 1
                updated += 1

            # Persist risk factors for audit
            await _save_risk_factors_batch(session, results)
            await session.commit()

        except Exception:
            # Fallback to legacy threshold-based calculation
            await session.rollback()
            updated, changed = await _recalculate_all_legacy(session)

    return {"updated": updated, "changed": changed}


async def _recalculate_all_legacy(session: object) -> tuple[int, int]:
    """Резервный пороговый пересчёт риска без ML-модели.

    Загружает всех студентов из БД и вызывает доменный метод
    ``Student.recalculate_risk()``, который использует простые пороги
    GPA и attendance_percent для определения уровня риска.

    Используется как fallback при недоступности ML-модели.

    Args:
        session: Асинхронная сессия SQLAlchemy.

    Returns:
        Кортеж (updated, changed) — количество обработанных студентов
        и количество студентов с изменённым уровнем.
    """
    from sqlalchemy import select

    from src.infrastructure.persistence.models.lms import StudentModel
    from src.infrastructure.persistence.repositories.lms.student_repository import (
        SqlStudentRepository,
        _to_domain,
    )

    updated = 0
    changed = 0
    rows = (await session.execute(select(StudentModel))).scalars().all()  # type: ignore[union-attr]
    repo = SqlStudentRepository(session)  # type: ignore[arg-type]

    for row in rows:
        student = _to_domain(row)
        old_level = student.risk_level
        student.recalculate_risk()
        if student.risk_level != old_level:
            await repo.save(student)
            changed += 1
        updated += 1

    await session.commit()  # type: ignore[union-attr]
    return updated, changed


async def _save_risk_factors_batch(session: object, results: list) -> None:
    """Пакетное сохранение факторов риска в таблицу risk_factors для аудита.

    Удаляет старые записи для обрабатываемых студентов и создаёт новые
    по 4 записи на студента (по одной на каждый домен: attendance, grades,
    homework, payment).

    Каждая запись содержит:
        - factor_type: имя домена
        - value: общая вероятность отчисления (* 100 для процентов)
        - details: JSON с доменным уровнем риска и деталями

    Args:
        session: Асинхронная сессия SQLAlchemy.
        results: Список объектов RiskScoreResult от MLRiskScorer.
    """
    from datetime import datetime
    from uuid import uuid4

    from sqlalchemy import delete

    from src.infrastructure.persistence.models.lms import RiskFactorModel

    if not results:
        return

    student_ids = [r.student_id for r in results]
    # Clear old risk factors for these students
    await session.execute(  # type: ignore[union-attr]
        delete(RiskFactorModel).where(RiskFactorModel.student_id.in_(student_ids))
    )

    now = datetime.now(UTC)
    for result in results:
        for domain, score in [
            ("attendance", result.attendance_score),
            ("grades", result.grades_score),
            ("homework", result.homework_score),
            ("payment", result.payment_score),
        ]:
            factor = RiskFactorModel(
                id=uuid4(),
                student_id=result.student_id,
                factor_type=domain,
                value=round(result.dropout_probability * 100, 2),
                details={
                    "domain_risk_level": score.value,
                    **result.details,
                },
                computed_at=now,
            )
            session.add(factor)  # type: ignore[union-attr]


@celery_app.task(name="src.infrastructure.workers.tasks.risk.recalculate_student_risk")
def recalculate_student_risk(student_id: str) -> dict:  # type: ignore[type-arg]
    """Пересчитывает уровень риска для одного студента.

    Событийное Celery-задание, вызываемое через ``.delay()`` после:
        - conduct-урока (обновлена посещаемость и оценки)
        - проверки домашнего задания
        - изменения статуса платежа

    При ошибке ML использует legacy ``Student.recalculate_risk()``.

    Args:
        student_id: UUID студента в строковом формате.

    Returns:
        Словарь {"student_id": str, "old_level": str, "new_level": str}
        или {"error": str} при ошибке.
    """
    return asyncio.run(_recalculate_one(student_id))


async def _recalculate_one(student_id: str) -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация пересчёта риска для одного студента.

    Загружает студента из репозитория, выполняет ML-скоринг (или legacy
    fallback) и сохраняет обновлённый risk_level.

    Args:
        student_id: UUID студента в строковом формате.

    Returns:
        Словарь с ID студента, старым и новым уровнем риска,
        или словарь с ошибкой.
    """
    from uuid import UUID

    from src.database import async_session_factory
    from src.infrastructure.persistence.repositories.lms.student_repository import (
        SqlStudentRepository,
    )

    async with async_session_factory() as session:
        repo = SqlStudentRepository(session)
        student = await repo.get_by_id(UUID(student_id))
        if student is None:
            return {"error": f"Student {student_id} not found"}

        old_level = student.risk_level

        try:
            from src.ml.risk_scorer import MLRiskScorer

            scorer = MLRiskScorer(session)
            result = await scorer.score_student(UUID(student_id))
            student.risk_level = result.risk_level
        except Exception:
            student.recalculate_risk()

        await repo.save(student)
        await session.commit()

    return {"student_id": student_id, "old_level": old_level.value, "new_level": student.risk_level.value}
