from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.interfaces.repositories import LeadRepository, Page
from src.domain.crm.entities import Lead, LeadStatus
from src.infrastructure.persistence.models.crm import LeadModel


def _to_domain(m: LeadModel) -> Lead:
    return Lead(
        id=m.id,
        full_name=m.full_name,
        phone=m.phone,
        email=m.email,
        source_id=m.source_id,
        funnel_id=m.funnel_id,
        stage_id=m.stage_id,
        assigned_to=m.assigned_to,
        status=LeadStatus(m.status),
        lost_reason=m.lost_reason,
        custom_fields=m.custom_fields or {},
    )


def _apply_fields(m: LeadModel, lead: Lead) -> None:
    m.full_name = lead.full_name
    m.phone = lead.phone
    m.email = lead.email
    m.source_id = lead.source_id
    m.funnel_id = lead.funnel_id
    m.stage_id = lead.stage_id
    m.assigned_to = lead.assigned_to
    m.status = lead.status.value
    m.lost_reason = lead.lost_reason
    m.custom_fields = lead.custom_fields


class SqlLeadRepository(LeadRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get_by_id(self, lead_id: UUID) -> Lead | None:
        m = await self._s.get(LeadModel, lead_id)
        return _to_domain(m) if m else None

    async def save(self, lead: Lead) -> None:
        existing = await self._s.get(LeadModel, lead.id)
        if existing is None:
            m = LeadModel(id=lead.id)
            _apply_fields(m, lead)
            self._s.add(m)
        else:
            _apply_fields(existing, lead)

    async def list(
        self,
        *,
        funnel_id: UUID | None = None,
        stage_id: UUID | None = None,
        assigned_to: UUID | None = None,
        status: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Lead]:
        q = select(LeadModel)
        if funnel_id is not None:
            q = q.where(LeadModel.funnel_id == funnel_id)
        if stage_id is not None:
            q = q.where(LeadModel.stage_id == stage_id)
        if assigned_to is not None:
            q = q.where(LeadModel.assigned_to == assigned_to)
        if status is not None:
            q = q.where(LeadModel.status == status)
        if search:
            pattern = f"%{search}%"
            q = q.where(
                or_(
                    LeadModel.full_name.ilike(pattern),
                    LeadModel.phone.ilike(pattern),
                )
            )

        total = (await self._s.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        q = q.order_by(LeadModel.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        rows = (await self._s.execute(q)).scalars().all()
        return Page(items=[_to_domain(r) for r in rows], total=total, page=page, page_size=page_size)
