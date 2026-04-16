from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.interfaces.repositories import FunnelRepository, StageRepository
from src.domain.crm.entities import Funnel, Stage
from src.infrastructure.persistence.models.crm import FunnelModel, StageModel


def _funnel_to_domain(m: FunnelModel) -> Funnel:
    return Funnel(id=m.id, name=m.name, is_archived=m.is_archived)


def _stage_to_domain(m: StageModel) -> Stage:
    return Stage(
        id=m.id,
        funnel_id=m.funnel_id,
        name=m.name,
        color=m.color,
        win_probability=m.win_probability,
        order=m.order,
    )


class SqlFunnelRepository(FunnelRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get_by_id(self, funnel_id: UUID) -> Funnel | None:
        m = await self._s.get(FunnelModel, funnel_id)
        return _funnel_to_domain(m) if m else None

    async def save(self, funnel: Funnel) -> None:
        existing = await self._s.get(FunnelModel, funnel.id)
        if existing is None:
            m = FunnelModel(id=funnel.id, name=funnel.name, is_archived=funnel.is_archived)
            self._s.add(m)
        else:
            existing.name = funnel.name
            existing.is_archived = funnel.is_archived

    async def list(self, *, is_archived: bool | None = None) -> list[Funnel]:
        q = select(FunnelModel)
        if is_archived is not None:
            q = q.where(FunnelModel.is_archived == is_archived)
        rows = (await self._s.execute(q)).scalars().all()
        return [_funnel_to_domain(r) for r in rows]


class SqlStageRepository(StageRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get_by_id(self, stage_id: UUID) -> Stage | None:
        m = await self._s.get(StageModel, stage_id)
        return _stage_to_domain(m) if m else None

    async def save(self, stage: Stage) -> None:
        existing = await self._s.get(StageModel, stage.id)
        if existing is None:
            m = StageModel(
                id=stage.id,
                funnel_id=stage.funnel_id,
                name=stage.name,
                color=stage.color,
                win_probability=stage.win_probability,
                order=stage.order,
            )
            self._s.add(m)
        else:
            existing.name = stage.name
            existing.color = stage.color
            existing.win_probability = stage.win_probability
            existing.order = stage.order

    async def get_by_funnel(self, funnel_id: UUID) -> list[Stage]:
        result = await self._s.execute(
            select(StageModel)
            .where(StageModel.funnel_id == funnel_id)
            .order_by(StageModel.order)
        )
        return [_stage_to_domain(r) for r in result.scalars().all()]
