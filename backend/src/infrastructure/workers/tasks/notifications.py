"""Celery tasks: mark overdue CRM tasks and send notification records."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from uuid import uuid4

from src.infrastructure.workers.celery_app import celery_app


@celery_app.task(name="src.infrastructure.workers.tasks.notifications.mark_overdue_crm_tasks")
def mark_overdue_crm_tasks() -> dict:  # type: ignore[type-arg]
    return asyncio.run(_mark_overdue_crm_tasks())


async def _mark_overdue_crm_tasks() -> dict:  # type: ignore[type-arg]
    from sqlalchemy import select, update
    from src.database import async_session_factory
    from src.infrastructure.persistence.models.crm import CrmTaskModel, CrmNotificationModel

    now = datetime.now(timezone.utc)

    async with async_session_factory() as session:
        # Mark overdue tasks
        result = await session.execute(
            update(CrmTaskModel)
            .where(
                CrmTaskModel.status.in_(["pending", "in_progress"]),
                CrmTaskModel.due_date < now,
            )
            .values(status="overdue")
            .returning(CrmTaskModel.id, CrmTaskModel.assigned_to)
        )
        overdue_rows = result.all()

        # Create notifications for each overdue task
        for task_id, user_id in overdue_rows:
            if user_id is None:
                continue
            notif = CrmNotificationModel(
                id=uuid4(),
                user_id=user_id,
                type="task_overdue",
                title="Task is overdue",
                body="One of your CRM tasks has passed its due date.",
                linked_task_id=task_id,
                created_at=now,
            )
            session.add(notif)

        await session.commit()

    return {"marked_overdue": len(overdue_rows)}


@celery_app.task(name="src.infrastructure.workers.tasks.notifications.send_payment_due_reminders")
def send_payment_due_reminders() -> dict:  # type: ignore[type-arg]
    """Create LMS notifications for payments due in the next 3 days."""
    return asyncio.run(_send_payment_reminders())


async def _send_payment_reminders() -> dict:  # type: ignore[type-arg]
    from datetime import timedelta
    from sqlalchemy import select
    from src.database import async_session_factory
    from src.infrastructure.persistence.models.lms import PaymentModel, LmsNotificationModel, StudentModel

    now = datetime.now(timezone.utc)
    threshold = now + timedelta(days=3)

    async with async_session_factory() as session:
        result = await session.execute(
            select(PaymentModel, StudentModel)
            .join(StudentModel, StudentModel.id == PaymentModel.student_id)
            .where(
                PaymentModel.status == "pending",
                PaymentModel.due_date <= threshold.date(),
                PaymentModel.due_date >= now.date(),
            )
        )
        rows = result.all()

        created = 0
        for payment, student in rows:
            if student.user_id is None:
                continue
            notif = LmsNotificationModel(
                id=uuid4(),
                user_id=student.user_id,
                type="payment_due",
                title="Payment due soon",
                body=f"Your payment of {payment.amount} {payment.currency} is due on {payment.due_date}.",
                created_at=now,
            )
            session.add(notif)
            created += 1

        await session.commit()

    return {"notifications_created": created}
