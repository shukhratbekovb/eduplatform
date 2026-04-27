"""Celery-задачи: уведомления для CRM, LMS (долги, риски, домашние задания).

Модуль реализует 5 Celery-заданий для автоматической генерации уведомлений:

CRM:
    - ``mark_overdue_crm_tasks`` — каждый час помечает просроченные CRM-задачи
      (status -> overdue) и создаёт уведомления для ответственных менеджеров.

LMS — уведомления студентам:
    - ``send_payment_due_reminders`` — ежедневно создаёт уведомления для
      студентов о платежах, срок которых наступает в ближайшие 3 дня.

LMS — уведомления директору/МУП:
    - ``notify_overdue_debts`` — ежедневная сводка должников (общая сумма
      долга, топ-3 должника).
    - ``notify_risk_changes`` — уведомления о студентах с уровнем риска
      HIGH/CRITICAL (запускается после ночного ML-пересчёта).
    - ``notify_homework_overdue`` — еженедельная сводка просроченных ДЗ
      с разбивкой по группам.

Все уведомления сохраняются в таблицах ``crm_notifications`` или
``lms_notifications`` и отображаются в соответствующих фронтендах.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from src.infrastructure.workers.celery_app import celery_app


async def _get_director_mup_ids(session) -> list:
    """Получает ID пользователей с ролями директора и МУП.

    Используется для определения получателей административных
    уведомлений (задолженности, риски, просроченные ДЗ).

    Args:
        session: Асинхронная сессия SQLAlchemy.

    Returns:
        Список UUID активных пользователей с ролями "director" и "mup".
    """
    from sqlalchemy import select

    from src.infrastructure.persistence.models.auth import UserModel

    rows = (
        (
            await session.execute(
                select(UserModel.id).where(
                    UserModel.role.in_(["director", "mup"]),
                    UserModel.is_active.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )
    return list(rows)


@celery_app.task(name="src.infrastructure.workers.tasks.notifications.mark_overdue_crm_tasks")
def mark_overdue_crm_tasks() -> dict:  # type: ignore[type-arg]
    """Помечает просроченные CRM-задачи и создаёт уведомления.

    Ежечасное Celery-задание. Находит задачи со статусом pending/in_progress,
    у которых due_date < now(), меняет статус на "overdue" и создаёт
    уведомление типа "task_overdue" для ответственного менеджера.

    Returns:
        Словарь {"marked_overdue": int} — количество помеченных задач.
    """
    return asyncio.run(_mark_overdue_crm_tasks())


async def _mark_overdue_crm_tasks() -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация маркировки просроченных CRM-задач.

    Выполняет UPDATE с RETURNING для атомарного обновления и получения
    ID задач, затем создаёт CrmNotificationModel для каждой задачи.

    Returns:
        Словарь {"marked_overdue": int}.
    """
    from sqlalchemy import update

    from src.database import async_session_factory
    from src.infrastructure.persistence.models.crm import CrmNotificationModel, CrmTaskModel

    now = datetime.now(UTC)

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
    """Создаёт LMS-уведомления для студентов о предстоящих платежах.

    Ежедневное Celery-задание. Находит платежи со статусом "pending",
    у которых due_date в пределах ближайших 3 дней, и создаёт
    уведомление типа "payment_due" для каждого студента.

    Returns:
        Словарь {"notifications_created": int} — количество созданных
        уведомлений.
    """
    return asyncio.run(_send_payment_reminders())


async def _send_payment_reminders() -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация отправки напоминаний о платежах.

    Выполняет JOIN payments + students для получения user_id студента,
    фильтрует по due_date в диапазоне [сегодня, сегодня + 3 дня]
    и создаёт LmsNotificationModel для каждого.

    Returns:
        Словарь {"notifications_created": int}.
    """
    from datetime import timedelta

    from sqlalchemy import select

    from src.database import async_session_factory
    from src.infrastructure.persistence.models.lms import (
        LmsNotificationModel,
        PaymentModel,
        StudentModel,
    )

    now = datetime.now(UTC)
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


# ── LMS: Debt alerts for director/MUP ────────────────────────────────────────


@celery_app.task(name="src.infrastructure.workers.tasks.notifications.notify_overdue_debts")
def notify_overdue_debts() -> dict:  # type: ignore[type-arg]
    """Ежедневно уведомляет директора/МУП о студентах с задолженностями.

    Формирует сводку: общая сумма долга (UZS), количество должников,
    топ-3 должника по сумме. Уведомление типа "debt_alert" создаётся
    для каждого директора/МУП.

    Returns:
        Словарь {"notifications_created": int, "debtors": int}.
    """
    return asyncio.run(_notify_overdue_debts())


async def _notify_overdue_debts() -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация уведомлений о задолженностях.

    Выполняет GROUP BY по студентам с просроченными платежами,
    вычисляет сумму долга (amount - paid_amount) и формирует
    текстовую сводку для уведомления.

    Returns:
        Словарь {"notifications_created": int, "debtors": int}.
    """
    from sqlalchemy import func, select

    from src.database import async_session_factory
    from src.infrastructure.persistence.models.lms import (
        LmsNotificationModel,
        PaymentModel,
        StudentModel,
    )

    now = datetime.now(UTC)

    async with async_session_factory() as session:
        # Count students with overdue payments
        result = await session.execute(
            select(
                StudentModel.full_name,
                func.sum(PaymentModel.amount - PaymentModel.paid_amount).label("debt"),
            )
            .join(PaymentModel, PaymentModel.student_id == StudentModel.id)
            .where(PaymentModel.status == "overdue")
            .group_by(StudentModel.id, StudentModel.full_name)
            .order_by(func.sum(PaymentModel.amount - PaymentModel.paid_amount).desc())
        )
        debtors = result.all()

        if not debtors:
            return {"notifications_created": 0}

        total_debt = sum(float(d.debt or 0) for d in debtors)
        count = len(debtors)
        top3 = ", ".join(d.full_name for d in debtors[:3])

        title = f"Задолженности: {count} студентов"
        body = f"Общая сумма долга: {total_debt:,.0f} UZS\n" f"Топ должники: {top3}" + (
            f" и ещё {count - 3}" if count > 3 else ""
        )

        recipients = await _get_director_mup_ids(session)
        created = 0
        for uid in recipients:
            session.add(
                LmsNotificationModel(
                    id=uuid4(),
                    user_id=uid,
                    type="debt_alert",
                    title=title,
                    body=body,
                    created_at=now,
                )
            )
            created += 1

        await session.commit()
    return {"notifications_created": created, "debtors": count}


# ── LMS: Risk change alerts ──────────────────────────────────────────────────


@celery_app.task(name="src.infrastructure.workers.tasks.notifications.notify_risk_changes")
def notify_risk_changes() -> dict:  # type: ignore[type-arg]
    """Уведомляет директора/МУП о студентах с высоким/критическим риском.

    Ежедневное Celery-задание, рекомендуется запускать после ночного
    ML-пересчёта (recalculate_all_students_risk). Находит студентов
    с risk_level HIGH/CRITICAL и создаёт персональные уведомления
    типа "risk_alert" с GPA и посещаемостью для каждого директора/МУП.

    Returns:
        Словарь {"notifications_created": int, "at_risk_students": int}.
    """
    return asyncio.run(_notify_risk_changes())


async def _notify_risk_changes() -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация уведомлений об изменении уровня риска.

    Загружает студентов с risk_level IN ('high', 'critical'),
    формирует персонализированные уведомления (имя студента,
    уровень риска, GPA, посещаемость) и отправляет всем
    директорам и МУП.

    Returns:
        Словарь {"notifications_created": int, "at_risk_students": int}.
    """
    from sqlalchemy import select

    from src.database import async_session_factory
    from src.infrastructure.persistence.models.lms import LmsNotificationModel, StudentModel

    now = datetime.now(UTC)

    async with async_session_factory() as session:
        # Find students with high/critical risk
        rows = (
            await session.execute(
                select(
                    StudentModel.id,
                    StudentModel.full_name,
                    StudentModel.risk_level,
                    StudentModel.gpa,
                    StudentModel.attendance_percent,
                ).where(StudentModel.risk_level.in_(["high", "critical"]))
            )
        ).all()

        if not rows:
            return {"notifications_created": 0}

        recipients = await _get_director_mup_ids(session)
        created = 0

        for student in rows:
            risk_label = "КРИТИЧЕСКИЙ" if student.risk_level == "critical" else "ВЫСОКИЙ"
            title = f"⚠ {risk_label} риск: {student.full_name}"
            gpa_str = f"{float(student.gpa):.1f}" if student.gpa else "—"
            att_str = f"{float(student.attendance_percent):.0f}%" if student.attendance_percent else "—"
            body = f"Уровень: {risk_label}\nGPA: {gpa_str}, Посещаемость: {att_str}"

            for uid in recipients:
                session.add(
                    LmsNotificationModel(
                        id=uuid4(),
                        user_id=uid,
                        type="risk_alert",
                        title=title,
                        body=body,
                        created_at=now,
                    )
                )
                created += 1

        await session.commit()
    return {"notifications_created": created, "at_risk_students": len(rows)}


# ── LMS: Homework overdue weekly summary ─────────────────────────────────────


@celery_app.task(name="src.infrastructure.workers.tasks.notifications.notify_homework_overdue")
def notify_homework_overdue() -> dict:  # type: ignore[type-arg]
    """Еженедельная сводка просроченных домашних заданий для директора/МУП.

    Агрегирует количество просроченных submissions по группам и формирует
    текстовое уведомление с разбивкой (топ-5 групп и общее количество).

    Returns:
        Словарь {"notifications_created": int, "total_overdue": int}.
    """
    return asyncio.run(_notify_homework_overdue())


async def _notify_homework_overdue() -> dict:  # type: ignore[type-arg]
    """Асинхронная реализация еженедельной сводки просроченных ДЗ.

    Выполняет JOIN submissions -> assignments -> lessons -> groups
    с GROUP BY по группам для подсчёта просроченных submissions.
    Формирует текстовую сводку и создаёт уведомления.

    Returns:
        Словарь {"notifications_created": int, "total_overdue": int}.
    """
    from sqlalchemy import func, select

    from src.database import async_session_factory
    from src.infrastructure.persistence.models.lms import (
        HomeworkAssignmentModel,
        HomeworkSubmissionModel,
        LessonModel,
        LmsNotificationModel,
    )

    now = datetime.now(UTC)

    async with async_session_factory() as session:
        # Count overdue submissions grouped by group
        from src.infrastructure.persistence.models.lms import GroupModel

        result = await session.execute(
            select(
                GroupModel.name.label("group_name"),
                func.count(HomeworkSubmissionModel.id).label("overdue_count"),
            )
            .join(HomeworkAssignmentModel, HomeworkSubmissionModel.assignment_id == HomeworkAssignmentModel.id)
            .join(LessonModel, HomeworkAssignmentModel.lesson_id == LessonModel.id)
            .join(GroupModel, LessonModel.group_id == GroupModel.id)
            .where(HomeworkSubmissionModel.status == "overdue")
            .group_by(GroupModel.id, GroupModel.name)
            .order_by(func.count(HomeworkSubmissionModel.id).desc())
        )
        groups = result.all()

        if not groups:
            return {"notifications_created": 0}

        total = sum(g.overdue_count for g in groups)
        breakdown = "\n".join(f"  {g.group_name}: {g.overdue_count}" for g in groups[:5])
        title = f"Просроченные домашки: {total}"
        body = f"По группам:\n{breakdown}"
        if len(groups) > 5:
            body += f"\n  ...и ещё {len(groups) - 5} групп"

        recipients = await _get_director_mup_ids(session)
        created = 0
        for uid in recipients:
            session.add(
                LmsNotificationModel(
                    id=uuid4(),
                    user_id=uid,
                    type="homework_overdue",
                    title=title,
                    body=body,
                    created_at=now,
                )
            )
            created += 1

        await session.commit()
    return {"notifications_created": created, "total_overdue": total}
