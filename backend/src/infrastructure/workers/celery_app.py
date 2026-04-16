"""Celery application factory."""
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
    },
)
