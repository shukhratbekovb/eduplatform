"""CRM Lead use cases."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from src.application.interfaces.repositories import LeadRepository, Page, StageRepository
from src.domain.crm.entities import Lead


@dataclass
class CreateLeadInput:
    full_name: str
    phone: str
    funnel_id: UUID
    stage_id: UUID
    assigned_to: UUID | None = None
    source_id: UUID | None = None
    email: str | None = None


class CreateLeadUseCase:
    def __init__(self, leads: LeadRepository, stages: StageRepository) -> None:
        self._leads = leads
        self._stages = stages

    async def execute(self, inp: CreateLeadInput) -> Lead:
        stage = await self._stages.get_by_id(inp.stage_id)
        if stage is None:
            raise ValueError(f"Stage {inp.stage_id} not found")
        if stage.funnel_id != inp.funnel_id:
            raise ValueError("Stage does not belong to the given funnel")

        lead = Lead.create(
            full_name=inp.full_name,
            phone=inp.phone,
            funnel_id=inp.funnel_id,
            stage_id=inp.stage_id,
            assigned_to=inp.assigned_to,
            source_id=inp.source_id,
            email=inp.email,
        )
        await self._leads.save(lead)
        return lead


class GetLeadUseCase:
    def __init__(self, leads: LeadRepository) -> None:
        self._leads = leads

    async def execute(self, lead_id: UUID) -> Lead:
        lead = await self._leads.get_by_id(lead_id)
        if lead is None:
            raise ValueError(f"Lead {lead_id} not found")
        return lead


class ListLeadsUseCase:
    def __init__(self, leads: LeadRepository) -> None:
        self._leads = leads

    async def execute(
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
        return await self._leads.list(
            funnel_id=funnel_id,
            stage_id=stage_id,
            assigned_to=assigned_to,
            status=status,
            search=search,
            page=page,
            page_size=page_size,
        )


class MoveLeadStageUseCase:
    def __init__(self, leads: LeadRepository, stages: StageRepository) -> None:
        self._leads = leads
        self._stages = stages

    async def execute(self, lead_id: UUID, new_stage_id: UUID, changed_by: UUID) -> Lead:
        lead = await self._leads.get_by_id(lead_id)
        if lead is None:
            raise ValueError(f"Lead {lead_id} not found")
        stage = await self._stages.get_by_id(new_stage_id)
        if stage is None:
            raise ValueError(f"Stage {new_stage_id} not found")
        lead.move_to_stage(new_stage_id, changed_by)
        await self._leads.save(lead)
        return lead


class WinLeadUseCase:
    def __init__(self, leads: LeadRepository) -> None:
        self._leads = leads

    async def execute(self, lead_id: UUID) -> Lead:
        lead = await self._leads.get_by_id(lead_id)
        if lead is None:
            raise ValueError(f"Lead {lead_id} not found")
        lead.mark_won()
        await self._leads.save(lead)
        return lead


class LoseLeadUseCase:
    def __init__(self, leads: LeadRepository) -> None:
        self._leads = leads

    async def execute(self, lead_id: UUID, reason: str) -> Lead:
        lead = await self._leads.get_by_id(lead_id)
        if lead is None:
            raise ValueError(f"Lead {lead_id} not found")
        lead.mark_lost(reason)
        await self._leads.save(lead)
        return lead


class AssignLeadUseCase:
    def __init__(self, leads: LeadRepository) -> None:
        self._leads = leads

    async def execute(self, lead_id: UUID, new_user_id: UUID, changed_by: UUID) -> Lead:
        lead = await self._leads.get_by_id(lead_id)
        if lead is None:
            raise ValueError(f"Lead {lead_id} not found")
        lead.reassign(new_user_id, changed_by)
        await self._leads.save(lead)
        return lead
