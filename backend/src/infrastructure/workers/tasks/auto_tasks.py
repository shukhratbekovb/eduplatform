"""Celery-задачи: автоматическая генерация задач МУП на основе паттернов поведения.

Модуль реализует систему проактивного реагирования на проблемных студентов.
При обнаружении негативных паттернов (серия пропусков, задолженности,
высокий риск отчисления) автоматически создаются задачи для МУП (менеджера
учебного процесса) с инструкциями по действию.

Триггеры:
    - **После conduct-урока** (через Celery delay): ``process_lesson_attendance``
      проверяет каждого отсутствовавшего студента на серию пропусков.
    - **Ежедневный batch-скан**: ``generate_debt_tasks`` и ``generate_risk_tasks``
      сканируют всех студентов на предмет задолженностей и высокого риска.

Дедупликация: перед созданием задачи проверяется наличие открытой задачи
(pending/in_progress) для того же студента и категории через ``_task_exists()``.

Категории задач:
    - ``absence_streak`` — серия пропусков (3+ подряд -> medium, 5+ -> high)
    - ``payment_overdue`` — задолженность > 30 дней
    - ``high_risk`` — ML-модель определила HIGH/CRITICAL риск отчисления
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta, date
from uuid import UUID, uuid4

from src.infrastructure.workers.celery_app import celery_app


async def _get_mup_ids(session) -> list[UUID]:
    """Получает список ID пользователей с ролью МУП.

    МУП (менеджер учебного процесса) — основной получатель автоматических
    задач. Если в системе нет МУП, задачи не создаются.

    Args:
        session: Асинхронная сессия SQLAlchemy.

    Returns:
        Список UUID активных пользователей с ролью "mup".
    """
    from sqlalchemy import select
    from src.infrastructure.persistence.models.auth import UserModel
    rows = (await session.execute(
        select(UserModel.id).where(
            UserModel.role == "mup",
            UserModel.is_active.is_(True),
        )
    )).scalars().all()
    return list(rows)


async def _task_exists(session, student_id: UUID, category: str) -> bool:
    """Проверяет наличие открытой задачи для данного студента и категории.

    Используется для дедупликации: если задача уже создана и не завершена,
    повторная не создаётся. Проверяет статусы "pending" и "in_progress".

    Args:
        session: Асинхронная сессия SQLAlchemy.
        student_id: UUID студента.
        category: Категория задачи (absence_streak, payment_overdue, high_risk).

    Returns:
        True, если существует хотя бы одна открытая задача.
    """
    from sqlalchemy import select, func
    from src.infrastructure.persistence.models.lms import MupTaskModel
    count = (await session.execute(
        select(func.count()).select_from(MupTaskModel).where(
            MupTaskModel.student_id == student_id,
            MupTaskModel.category == category,
            MupTaskModel.status.in_(["pending", "in_progress"]),
        )
    )).scalar() or 0
    return count > 0


# ── Task 1: Process attendance after lesson conduct ──────────────────────────

@celery_app.task(name="src.infrastructure.workers.tasks.auto_tasks.process_lesson_attendance")
def process_lesson_attendance(lesson_id: str) -> dict:  # type: ignore[type-arg]
    """Обрабатывает посещаемость после проведения урока.

    Событийное Celery-задание, вызываемое через ``.delay()`` из endpoint
    conduct_lesson. Для каждого отсутствовавшего студента проверяет серию
    пропусков подряд и при необходимости создаёт задачи для МУП.

    Логика:
        - 3+ пропусков подряд -> задача "Связаться с родителями" (medium)
        - 5+ пропусков подряд -> эскалация до high priority

    Args:
        lesson_id: UUID урока в строковом формате.

    Returns:
        Словарь {"tasks_created": int, "absent_students": int}
        или {"error": str} при ошибке.
    """
    return asyncio.run(_process_lesson_attendance(lesson_id))


async def _process_lesson_attendance(lesson_id: str) -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация обработки посещаемости после conduct-урока.

    Последовательность действий:
        1. Загрузка информации об уроке.
        2. Получение списка отсутствовавших студентов.
        3. Для каждого — подсчёт серии пропусков (ORDER BY scheduled_at DESC).
        4. При streak >= 3 — создание MupTaskModel с контактами родителей.
        5. При streak >= 5 — эскалация существующих задач до high priority.
        6. Создание LmsNotificationModel для МУП.

    Args:
        lesson_id: UUID урока в строковом формате.

    Returns:
        Словарь {"tasks_created": int, "absent_students": int}
        или {"error": str} при ошибке.
    """
    from sqlalchemy import select, func
    from src.database import async_session_factory
    from src.infrastructure.persistence.models.lms import (
        AttendanceRecordModel, LessonModel, StudentModel, MupTaskModel,
        LmsNotificationModel,
    )

    now = datetime.now(timezone.utc)
    tasks_created = 0

    async with async_session_factory() as session:
        # Get lesson info
        lesson = (await session.execute(
            select(LessonModel).where(LessonModel.id == UUID(lesson_id))
        )).scalar_one_or_none()
        if not lesson:
            return {"error": "Lesson not found"}

        # Get absent students from this lesson
        absent_records = (await session.execute(
            select(AttendanceRecordModel.student_id)
            .where(
                AttendanceRecordModel.lesson_id == UUID(lesson_id),
                AttendanceRecordModel.status == "absent",
            )
        )).scalars().all()

        mup_ids = await _get_mup_ids(session)
        if not mup_ids:
            return {"error": "No MUP users found"}

        for student_id in absent_records:
            # Count consecutive absences (most recent first)
            att_rows = (await session.execute(
                select(AttendanceRecordModel.status)
                .join(LessonModel, AttendanceRecordModel.lesson_id == LessonModel.id)
                .where(AttendanceRecordModel.student_id == student_id)
                .order_by(LessonModel.scheduled_at.desc())
            )).scalars().all()

            streak = 0
            for s in att_rows:
                if s == "absent":
                    streak += 1
                else:
                    break

            # Get student info
            student = (await session.execute(
                select(StudentModel.full_name, StudentModel.phone, StudentModel.parent_phone)
                .where(StudentModel.id == student_id)
            )).one_or_none()
            if not student:
                continue

            # 3+ consecutive absences → create task "Связаться с родителями"
            if streak >= 3 and not await _task_exists(session, student_id, "absence_streak"):
                for mup_id in mup_ids:
                    parent_info = f"Тел. родителя: {student.parent_phone}" if student.parent_phone else "Тел. родителя не указан"
                    session.add(MupTaskModel(
                        id=uuid4(),
                        title=f"Пропуски: {student.full_name} ({streak} подряд)",
                        description=(
                            f"Студент {student.full_name} пропустил {streak} уроков подряд.\n"
                            f"Телефон: {student.phone or '—'}\n"
                            f"{parent_info}\n"
                            f"Необходимо связаться с родителями и выяснить причину."
                        ),
                        assigned_to=mup_id,
                        due_date=date.today() + timedelta(days=2),
                        status="pending",
                        priority="high" if streak >= 5 else "medium",
                        student_id=student_id,
                        category="absence_streak",
                    ))
                    tasks_created += 1

                # Also notify
                session.add(LmsNotificationModel(
                    id=uuid4(),
                    user_id=mup_ids[0],
                    type="risk_alert",
                    title=f"Серия пропусков: {student.full_name}",
                    body=f"Студент пропустил {streak} уроков подряд. Создана задача.",
                    created_at=now,
                ))

            # 5+ absences → escalate to HIGH priority
            if streak >= 5:
                # Check if existing task needs escalation
                existing = (await session.execute(
                    select(MupTaskModel).where(
                        MupTaskModel.student_id == student_id,
                        MupTaskModel.category == "absence_streak",
                        MupTaskModel.status.in_(["pending", "in_progress"]),
                        MupTaskModel.priority != "high",
                    )
                )).scalars().all()
                for task in existing:
                    task.priority = "high"
                    task.title = f"СРОЧНО: {student.full_name} ({streak} пропусков подряд)"

        await session.commit()

    return {"tasks_created": tasks_created, "absent_students": len(absent_records)}


# ── Task 2: Daily scan for debt-related tasks ────────────────────────────────

@celery_app.task(name="src.infrastructure.workers.tasks.auto_tasks.generate_debt_tasks")
def generate_debt_tasks() -> dict:  # type: ignore[type-arg]
    """Ежедневно создаёт задачи МУП для студентов с просрочкой платежей > 30 дней.

    Сканирует таблицу payments на предмет overdue-платежей, у которых
    самая ранняя due_date старше 30 дней. Для каждого должника создаётся
    задача с суммой долга, сроком просрочки и контактами.

    Приоритет: medium (просрочка 30-59 дней), high (60+ дней).

    Returns:
        Словарь {"tasks_created": int, "debtors_found": int}.
    """
    return asyncio.run(_generate_debt_tasks())


async def _generate_debt_tasks() -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация генерации задач по задолженностям.

    Выполняет GROUP BY по студентам с overdue-платежами, вычисляет
    сумму долга и дату самого старого просроченного платежа.
    Фильтрует HAVING min(due_date) <= today - 30 дней.

    Returns:
        Словарь {"tasks_created": int, "debtors_found": int}.
    """
    from sqlalchemy import select, func
    from src.database import async_session_factory
    from src.infrastructure.persistence.models.lms import (
        PaymentModel, StudentModel, MupTaskModel,
    )

    today = date.today()
    tasks_created = 0

    async with async_session_factory() as session:
        mup_ids = await _get_mup_ids(session)
        if not mup_ids:
            return {"error": "No MUP users found"}

        # Students with overdue payments > 30 days
        debtors = (await session.execute(
            select(
                StudentModel.id,
                StudentModel.full_name,
                StudentModel.phone,
                func.sum(PaymentModel.amount - PaymentModel.paid_amount).label("debt"),
                func.min(PaymentModel.due_date).label("oldest_due"),
            )
            .join(PaymentModel, PaymentModel.student_id == StudentModel.id)
            .where(PaymentModel.status == "overdue")
            .group_by(StudentModel.id, StudentModel.full_name, StudentModel.phone)
            .having(func.min(PaymentModel.due_date) <= today - timedelta(days=30))
        )).all()

        for d in debtors:
            if await _task_exists(session, d.id, "payment_overdue"):
                continue

            days_overdue = (today - d.oldest_due).days
            debt_amount = float(d.debt or 0)

            for mup_id in mup_ids:
                session.add(MupTaskModel(
                    id=uuid4(),
                    title=f"Долг: {d.full_name} ({debt_amount:,.0f} UZS)",
                    description=(
                        f"Студент {d.full_name} имеет задолженность {debt_amount:,.0f} UZS.\n"
                        f"Просрочка: {days_overdue} дней.\n"
                        f"Телефон: {d.phone or '—'}\n"
                        f"Необходимо связаться и обсудить оплату."
                    ),
                    assigned_to=mup_id,
                    due_date=today + timedelta(days=3),
                    status="pending",
                    priority="high" if days_overdue >= 60 else "medium",
                    student_id=d.id,
                    category="payment_overdue",
                ))
                tasks_created += 1

        await session.commit()

    return {"tasks_created": tasks_created, "debtors_found": len(debtors)}


# ── Task 3: Daily scan for high-risk students ────────────────────────────────

@celery_app.task(name="src.infrastructure.workers.tasks.auto_tasks.generate_risk_tasks")
def generate_risk_tasks() -> dict:  # type: ignore[type-arg]
    """Ежедневно создаёт задачи МУП для студентов с HIGH/CRITICAL уровнем риска.

    Сканирует таблицу students на предмет risk_level IN ('high', 'critical').
    Для каждого студента создаётся задача с GPA, посещаемостью и инструкцией
    провести беседу.

    Приоритет: medium (high risk), high (critical risk).
    Срок: 3 дня (high), 1 день (critical).

    Returns:
        Словарь {"tasks_created": int, "at_risk_students": int}.
    """
    return asyncio.run(_generate_risk_tasks())


async def _generate_risk_tasks() -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация генерации задач по уровню риска.

    Загружает активных студентов с risk_level high/critical,
    проверяет дедупликацию и создаёт MupTaskModel с описанием,
    включающим результат ML-модели, GPA и посещаемость.

    Returns:
        Словарь {"tasks_created": int, "at_risk_students": int}.
    """
    from sqlalchemy import select
    from src.database import async_session_factory
    from src.infrastructure.persistence.models.lms import StudentModel, MupTaskModel

    tasks_created = 0

    async with async_session_factory() as session:
        mup_ids = await _get_mup_ids(session)
        if not mup_ids:
            return {"error": "No MUP users found"}

        at_risk = (await session.execute(
            select(StudentModel).where(
                StudentModel.risk_level.in_(["high", "critical"]),
                StudentModel.is_active.is_(True),
            )
        )).scalars().all()

        for student in at_risk:
            if await _task_exists(session, student.id, "high_risk"):
                continue

            gpa_str = f"{float(student.gpa):.1f}" if student.gpa else "—"
            att_str = f"{float(student.attendance_percent):.0f}%" if student.attendance_percent else "—"
            is_critical = student.risk_level == "critical"

            for mup_id in mup_ids:
                session.add(MupTaskModel(
                    id=uuid4(),
                    title=f"{'КРИТИЧЕСКИЙ' if is_critical else 'Высокий'} риск: {student.full_name}",
                    description=(
                        f"ML-модель определила {'критический' if is_critical else 'высокий'} риск отчисления.\n"
                        f"GPA: {gpa_str}, Посещаемость: {att_str}\n"
                        f"Необходимо провести беседу со студентом и родителями."
                    ),
                    assigned_to=mup_id,
                    due_date=date.today() + timedelta(days=1 if is_critical else 3),
                    status="pending",
                    priority="high" if is_critical else "medium",
                    student_id=student.id,
                    category="high_risk",
                ))
                tasks_created += 1

        await session.commit()

    return {"tasks_created": tasks_created, "at_risk_students": len(at_risk)}
