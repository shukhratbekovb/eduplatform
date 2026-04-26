"""Celery-задачи: расчёт зарплаты преподавателей и управление платежами.

Модуль реализует два Celery-задания:
    1. ``mark_overdue_payments`` — ежедневная маркировка просроченных
       платежей студентов (pending -> overdue).
    2. ``calculate_teacher_salary`` — расчёт зарплаты преподавателя
       за указанный месяц на основе модели компенсации.

Расчёт зарплаты:
    - Подсчёт количества проведённых уроков (status=completed) за период.
    - Загрузка активной модели компенсации (CompensationModelModel) для
      преподавателя на дату начала периода.
    - Вычисление: base_amount = rate * lessons_count.
    - Upsert в таблицу salary_calculations.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from src.infrastructure.workers.celery_app import celery_app


@celery_app.task(name="src.infrastructure.workers.tasks.salary.mark_overdue_payments")
def mark_overdue_payments() -> dict:  # type: ignore[type-arg]
    """Ежедневно маркирует просроченные платежи студентов.

    Находит все платежи со статусом "pending", у которых due_date < today,
    и меняет статус на "overdue". Используется Celery beat (каждые 24 часа).

    Returns:
        Словарь {"marked_overdue": int} — количество помеченных платежей.
    """
    return asyncio.run(_mark_overdue_payments())


async def _mark_overdue_payments() -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация маркировки просроченных платежей.

    Выполняет атомарный UPDATE с RETURNING для подсчёта затронутых строк.

    Returns:
        Словарь {"marked_overdue": int}.
    """
    from sqlalchemy import select, update
    from src.database import async_session_factory
    from src.infrastructure.persistence.models.lms import PaymentModel

    today = datetime.now(timezone.utc).date()
    async with async_session_factory() as session:
        result = await session.execute(
            update(PaymentModel)
            .where(
                PaymentModel.status == "pending",
                PaymentModel.due_date < today,
            )
            .values(status="overdue")
            .returning(PaymentModel.id)
        )
        count = len(result.all())
        await session.commit()

    return {"marked_overdue": count}


@celery_app.task(name="src.infrastructure.workers.tasks.salary.calculate_teacher_salary")
def calculate_teacher_salary(teacher_id: str, month: int, year: int) -> dict:  # type: ignore[type-arg]
    """Рассчитывает зарплату преподавателя за указанный месяц.

    Celery-задание, вызываемое из административного интерфейса.
    Подсчитывает количество проведённых уроков, применяет ставку
    из модели компенсации и сохраняет (или обновляет) запись
    в таблице salary_calculations.

    Args:
        teacher_id: UUID преподавателя в строковом формате.
        month: Номер месяца (1-12).
        year: Год (например, 2026).

    Returns:
        Словарь {"teacher_id": str, "month": int, "year": int,
        "lessons": int, "total": float, "currency": str}.
    """
    return asyncio.run(_calculate_salary(teacher_id, month, year))


async def _calculate_salary(teacher_id: str, month: int, year: int) -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация расчёта зарплаты преподавателя.

    Алгоритм:
        1. Определяет границы расчётного периода (первый и последний день месяца).
        2. Подсчитывает количество уроков со status=completed за период.
        3. Загружает актуальную модель компенсации (effective_from <= period_start,
           самая свежая по дате).
        4. Вычисляет base_amount = rate * lessons_count.
        5. Если запись SalaryCalculationModel уже существует — обновляет,
           иначе создаёт новую (upsert).

    Args:
        teacher_id: UUID преподавателя в строковом формате.
        month: Номер месяца (1-12).
        year: Год.

    Returns:
        Словарь с результатами расчёта.
    """
    from uuid import UUID, uuid4
    from datetime import date
    from decimal import Decimal
    from sqlalchemy import select, func
    from src.database import async_session_factory
    from src.infrastructure.persistence.models.lms import (
        LessonModel,
        CompensationModelModel,
        SalaryCalculationModel,
    )

    tid = UUID(teacher_id)

    async with async_session_factory() as session:
        # Count completed lessons
        period_start = date(year, month, 1)
        import calendar
        last_day = calendar.monthrange(year, month)[1]
        period_end = date(year, month, last_day)

        count_result = await session.execute(
            select(func.count(LessonModel.id)).where(
                LessonModel.teacher_id == tid,
                LessonModel.status == "completed",
                LessonModel.scheduled_at >= period_start,
                LessonModel.scheduled_at <= period_end,
            )
        )
        lessons_count = count_result.scalar_one() or 0

        # Get active compensation model
        comp_result = await session.execute(
            select(CompensationModelModel).where(
                CompensationModelModel.teacher_id == tid,
                CompensationModelModel.effective_from <= period_start,
            ).order_by(CompensationModelModel.effective_from.desc()).limit(1)
        )
        comp = comp_result.scalar_one_or_none()
        rate = Decimal(str(comp.rate)) if comp else Decimal("0")
        currency = comp.currency if comp else "UZS"

        base_amount = rate * lessons_count
        total_amount = base_amount

        # Upsert
        existing = (await session.execute(
            select(SalaryCalculationModel).where(
                SalaryCalculationModel.teacher_id == tid,
                SalaryCalculationModel.period_month == month,
                SalaryCalculationModel.period_year == year,
            )
        )).scalar_one_or_none()

        if existing:
            existing.lessons_conducted = lessons_count
            existing.base_amount = base_amount
            existing.total_amount = total_amount
            existing.calculated_at = datetime.now(timezone.utc)
        else:
            sc = SalaryCalculationModel(
                id=uuid4(),
                teacher_id=tid,
                period_month=month,
                period_year=year,
                lessons_conducted=lessons_count,
                base_amount=base_amount,
                bonus_amount=Decimal("0"),
                total_amount=total_amount,
                currency=currency,
                calculated_at=datetime.now(timezone.utc),
            )
            session.add(sc)

        await session.commit()

    return {
        "teacher_id": teacher_id,
        "month": month,
        "year": year,
        "lessons": lessons_count,
        "total": float(total_amount),
        "currency": currency,
    }
