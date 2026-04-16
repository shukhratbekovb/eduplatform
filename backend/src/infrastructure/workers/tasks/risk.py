"""Celery tasks: student risk recalculation."""
from __future__ import annotations

import asyncio

from src.infrastructure.workers.celery_app import celery_app


@celery_app.task(name="src.infrastructure.workers.tasks.risk.recalculate_all_students_risk")
def recalculate_all_students_risk() -> dict:  # type: ignore[type-arg]
    """Recalculate risk level for all active students."""
    return asyncio.run(_recalculate_all())


async def _recalculate_all() -> dict:  # type: ignore[type-arg]
    from sqlalchemy import select
    from src.database import async_session_factory
    from src.infrastructure.persistence.models.lms import StudentModel
    from src.infrastructure.persistence.repositories.lms.student_repository import (
        SqlStudentRepository,
        _to_domain,
    )

    updated = 0
    changed = 0

    async with async_session_factory() as session:
        rows = (await session.execute(select(StudentModel))).scalars().all()
        repo = SqlStudentRepository(session)

        for row in rows:
            student = _to_domain(row)
            old_level = student.risk_level
            student.recalculate_risk()
            if student.risk_level != old_level:
                await repo.save(student)
                changed += 1
            updated += 1

        await session.commit()

    return {"updated": updated, "changed": changed}


@celery_app.task(name="src.infrastructure.workers.tasks.risk.recalculate_student_risk")
def recalculate_student_risk(student_id: str) -> dict:  # type: ignore[type-arg]
    """Recalculate risk for a single student (triggered after lesson/grade events)."""
    return asyncio.run(_recalculate_one(student_id))


async def _recalculate_one(student_id: str) -> dict:  # type: ignore[type-arg]
    from uuid import UUID
    from src.database import async_session_factory
    from src.infrastructure.persistence.repositories.lms.student_repository import SqlStudentRepository

    async with async_session_factory() as session:
        repo = SqlStudentRepository(session)
        student = await repo.get_by_id(UUID(student_id))
        if student is None:
            return {"error": f"Student {student_id} not found"}

        old_level = student.risk_level
        student.recalculate_risk()
        await repo.save(student)
        await session.commit()

    return {"student_id": student_id, "old_level": old_level.value, "new_level": student.risk_level.value}
