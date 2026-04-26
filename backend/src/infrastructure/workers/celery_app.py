"""Конфигурация и фабрика Celery-приложения для EduPlatform.

Модуль создаёт экземпляр Celery с настройками брокера (RabbitMQ),
бэкенда результатов (Redis) и расписанием периодических задач (beat_schedule).

Периодические задачи:
    - **recalculate-all-risk-nightly** — ночной ML-пересчёт уровня риска
      для всех активных студентов (каждые 24 часа).
    - **mark-overdue-payments-daily** — маркировка просроченных платежей
      (pending -> overdue) для платежей с прошедшей due_date.
    - **mark-overdue-crm-tasks-hourly** — маркировка просроченных CRM-задач
      каждый час.
    - **payment-due-reminders-daily** — отправка уведомлений студентам
      о платежах, срок которых наступает в ближайшие 3 дня.
    - **debt-alerts-daily** — уведомление директора/МУП о студентах
      с задолженностями.
    - **risk-alerts-daily** — уведомление директора/МУП о студентах
      с уровнем риска HIGH/CRITICAL (запускается после risk-recalc).
    - **homework-overdue-weekly** — еженедельная сводка просроченных ДЗ
      по группам для директора/МУП.
    - **auto-debt-tasks-daily** — автогенерация задач МУП для должников
      с просрочкой > 30 дней.
    - **auto-risk-tasks-daily** — автогенерация задач МУП для студентов
      с высоким/критическим уровнем риска.

Конфигурация:
    - Сериализация: JSON (task + result).
    - Таймзона: UTC (Docker-контейнер работает в UTC).
    - Prefetch: 1 (worker берёт по одной задаче для равномерного распределения).
"""
from celery import Celery

from src.config import settings

celery_app = Celery(
    "eduplatform",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "src.infrastructure.workers.tasks.risk",
        "src.infrastructure.workers.tasks.salary",
        "src.infrastructure.workers.tasks.notifications",
        "src.infrastructure.workers.tasks.auto_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        # Run risk recalculation every night at 02:00 UTC
        "recalculate-all-risk-nightly": {
            "task": "src.infrastructure.workers.tasks.risk.recalculate_all_students_risk",
            "schedule": 86400,  # every 24h; use crontab for exact time in prod
        },
        # Mark overdue payments daily at 08:00 UTC
        "mark-overdue-payments-daily": {
            "task": "src.infrastructure.workers.tasks.salary.mark_overdue_payments",
            "schedule": 86400,
        },
        # Mark overdue CRM tasks every hour
        "mark-overdue-crm-tasks-hourly": {
            "task": "src.infrastructure.workers.tasks.notifications.mark_overdue_crm_tasks",
            "schedule": 3600,
        },
        # Payment due reminders daily
        "payment-due-reminders-daily": {
            "task": "src.infrastructure.workers.tasks.notifications.send_payment_due_reminders",
            "schedule": 86400,
        },
        # Debt alerts for director/MUP daily
        "debt-alerts-daily": {
            "task": "src.infrastructure.workers.tasks.notifications.notify_overdue_debts",
            "schedule": 86400,
        },
        # Risk change alerts daily (after risk recalc)
        "risk-alerts-daily": {
            "task": "src.infrastructure.workers.tasks.notifications.notify_risk_changes",
            "schedule": 86400,
        },
        # Homework overdue weekly summary
        "homework-overdue-weekly": {
            "task": "src.infrastructure.workers.tasks.notifications.notify_homework_overdue",
            "schedule": 604800,
        },
        # Auto-generate debt tasks daily
        "auto-debt-tasks-daily": {
            "task": "src.infrastructure.workers.tasks.auto_tasks.generate_debt_tasks",
            "schedule": 86400,
        },
        # Auto-generate risk tasks daily
        "auto-risk-tasks-daily": {
            "task": "src.infrastructure.workers.tasks.auto_tasks.generate_risk_tasks",
            "schedule": 86400,
        },
    },
)
