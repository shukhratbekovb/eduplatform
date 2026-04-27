"""CRM Funnel and Stage use cases."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID, uuid4

from src.application.interfaces.repositories import FunnelRepository, StageRepository
from src.domain.crm.entities import Funnel, Stage


class CreateFunnelUseCase:
    def __init__(self, funnels: FunnelRepository) -> None:
        self._funnels = funnels

    async def execute(self, name: str) -> Funnel:
        if not name.strip():
            raise ValueError("Funnel name is required")
        funnel = Funnel.create(name=name)
        await self._funnels.save(funnel)
        return funnel


class ListFunnelsUseCase:
    def __init__(self, funnels: FunnelRepository) -> None:
        self._funnels = funnels

    async def execute(self, *, is_archived: bool | None = None) -> list[Funnel]:
        return await self._funnels.list(is_archived=is_archived)


class ArchiveFunnelUseCase:
    def __init__(self, funnels: FunnelRepository) -> None:
        self._funnels = funnels

    async def execute(self, funnel_id: UUID) -> Funnel:
        funnel = await self._funnels.get_by_id(funnel_id)
        if funnel is None:
            raise ValueError(f"Funnel {funnel_id} not found")
        funnel.archive()
        await self._funnels.save(funnel)
        return funnel


@dataclass
class CreateStageInput:
    funnel_id: UUID
    name: str
    color: str = "#6366F1"
    win_probability: int = 0
    order: int = 0


class CreateStageUseCase:
    def __init__(self, stages: StageRepository, funnels: FunnelRepository) -> None:
        self._stages = stages
        self._funnels = funnels

    async def execute(self, inp: CreateStageInput) -> Stage:
        funnel = await self._funnels.get_by_id(inp.funnel_id)
        if funnel is None:
            raise ValueError(f"Funnel {inp.funnel_id} not found")
        stage = Stage(
            id=uuid4(),
            funnel_id=inp.funnel_id,
            name=inp.name,
            color=inp.color,
            win_probability=inp.win_probability,
            order=inp.order,
        )
        await self._stages.save(stage)
        return stage


class ListStagesUseCase:
    def __init__(self, stages: StageRepository) -> None:
        self._stages = stages

    async def execute(self, funnel_id: UUID) -> list[Stage]:
        return await self._stages.get_by_funnel(funnel_id)
