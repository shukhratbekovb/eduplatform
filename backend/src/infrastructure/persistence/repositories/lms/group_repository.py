from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.interfaces.repositories import GroupRepository, Page
from src.domain.lms.entities import Group
from src.infrastructure.persistence.models.lms import GroupModel


def _to_domain(m: GroupModel) -> Group:
    return Group(
        id=m.id,
        name=m.name,
        subject_id=m.subject_id,
        teacher_id=m.teacher_id,
        start_date=m.started_at,
        end_date=m.ended_at,
        schedule=m.schedule or {},
        is_active=m.is_active,
    )


def _apply_fields(m: GroupModel, g: Group) -> None:
    m.name = g.name
    m.subject_id = g.subject_id
    m.teacher_id = g.teacher_id
    m.started_at = g.start_date
    m.ended_at = g.end_date
    m.schedule = g.schedule or {}
    m.is_active = g.is_active


class SqlGroupRepository(GroupRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get_by_id(self, group_id: UUID) -> Group | None:
        m = await self._s.get(GroupModel, group_id)
        return _to_domain(m) if m else None

    async def save(self, group: Group) -> None:
        existing = await self._s.get(GroupModel, group.id)
        if existing is None:
            m = GroupModel(id=group.id)
            _apply_fields(m, group)
            self._s.add(m)
        else:
            _apply_fields(existing, group)

    async def list(
        self,
        *,
        subject_id: UUID | None = None,
        teacher_id: UUID | None = None,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Group]:
        q = select(GroupModel)
        if subject_id is not None:
            q = q.where(GroupModel.subject_id == subject_id)
        if teacher_id is not None:
            q = q.where(GroupModel.teacher_id == teacher_id)
        if is_active is not None:
            q = q.where(GroupModel.is_active == is_active)

        total = (await self._s.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        q = q.offset((page - 1) * page_size).limit(page_size)
        rows = (await self._s.execute(q)).scalars().all()
        return Page(items=[_to_domain(r) for r in rows], total=total, page=page, page_size=page_size)
