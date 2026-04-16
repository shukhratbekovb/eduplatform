from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.interfaces.repositories import CrmTaskRepository, Page
from src.domain.crm.entities import CrmTask, TaskPriority, TaskStatus
from src.infrastructure.persistence.models.crm import CrmTaskModel


def _to_domain(m: CrmTaskModel) -> CrmTask:
    return CrmTask(
        id=m.id,
        title=m.title,
        description=m.description,
        linked_lead_id=m.linked_lead_id,
        assigned_to=m.assigned_to,
        due_date=m.due_date.isoformat() if m.due_date else "",
        priority=TaskPriority(m.priority),
        status=TaskStatus(m.status),
        reminder_at=m.reminder_at.isoformat() if m.reminder_at else None,
        is_auto_created=m.is_auto_created,
    )


def _apply_fields(m: CrmTaskModel, t: CrmTask) -> None:
    from datetime import datetime
    m.title = t.title
    m.description = t.description
    m.linked_lead_id = t.linked_lead_id
    m.assigned_to = t.assigned_to
    m.due_date = datetime.fromisoformat(t.due_date) if t.due_date else None  # type: ignore[assignment]
    m.priority = t.priority.value
    m.status = t.status.value
    m.reminder_at = datetime.fromisoformat(t.reminder_at) if t.reminder_at else None
    m.is_auto_created = t.is_auto_created


class SqlCrmTaskRepository(CrmTaskRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get_by_id(self, task_id: UUID) -> CrmTask | None:
        m = await self._s.get(CrmTaskModel, task_id)
        return _to_domain(m) if m else None

    async def save(self, task: CrmTask) -> None:
        existing = await self._s.get(CrmTaskModel, task.id)
        if existing is None:
            m = CrmTaskModel(id=task.id)
            _apply_fields(m, task)
            self._s.add(m)
        else:
            _apply_fields(existing, task)

    async def list(
        self,
        *,
        assigned_to: UUID | None = None,
        lead_id: UUID | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[CrmTask]:
        q = select(CrmTaskModel)
        if assigned_to is not None:
            q = q.where(CrmTaskModel.assigned_to == assigned_to)
        if lead_id is not None:
            q = q.where(CrmTaskModel.linked_lead_id == lead_id)
        if status is not None:
            q = q.where(CrmTaskModel.status == status)

        total = (await self._s.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        q = q.order_by(CrmTaskModel.due_date).offset((page - 1) * page_size).limit(page_size)
        rows = (await self._s.execute(q)).scalars().all()
        return Page(items=[_to_domain(r) for r in rows], total=total, page=page, page_size=page_size)
