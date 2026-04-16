"""Celery tasks: salary calculation and payment management."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from src.infrastructure.workers.celery_app import celery_app


@celery_app.task(name="src.infrastructure.workers.tasks.salary.mark_overdue_payments")
def mark_overdue_payments() -> dict:  # type: ignore[type-arg]
    return asyncio.run(_mark_overdue_payments())


async def _mark_overdue_payments() -> dict:  # type: ignore[type-arg]
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
    return asyncio.run(_calculate_salary(teacher_id, month, year))


async def _calculate_salary(teacher_id: str, month: int, year: int) -> dict:  # type: ignore[type-arg]
    """
    Count completed lessons in the period, apply compensation model,
    upsert a SalaryCalculation record.
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
