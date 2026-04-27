"""CRM Funnels — funnels, stages, and custom fields."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.application.crm.funnels.use_cases import (
    ArchiveFunnelUseCase,
    CreateFunnelUseCase,
    CreateStageInput,
    CreateStageUseCase,
    ListFunnelsUseCase,
)
from src.domain.crm.entities import Funnel
from src.infrastructure.persistence.models.crm import (
    CustomFieldModel,
    FunnelModel,
    LeadModel,
    StageModel,
)
from src.infrastructure.persistence.repositories.crm.funnel_repository import (
    SqlFunnelRepository,
    SqlStageRepository,
)

router = APIRouter(prefix="/crm/funnels", tags=["CRM - Funnels"])

CrmGuard = Annotated[object, Depends(require_roles("director", "sales_manager"))]


# ── Schemas ───────────────────────────────────────────────────────────────────


class FunnelOut(BaseModel):
    id: UUID
    name: str
    isArchived: bool
    stageCount: int = 0
    leadCount: int = 0
    createdAt: str | None = None


class StageOut(BaseModel):
    id: UUID
    funnelId: UUID | None
    name: str
    color: str
    winProbability: int
    order: int


class CustomFieldOut(BaseModel):
    id: UUID
    funnelId: UUID
    label: str
    type: str
    options: dict | None  # type: ignore[type-arg]
    order: int
    isActive: bool


class CreateFunnelRequest(BaseModel):
    name: str


class UpdateFunnelRequest(BaseModel):
    name: str | None = None


class CreateStageRequest(BaseModel):
    name: str
    color: str = "#6366F1"
    winProbability: int = 0
    win_probability: int = 0
    order: int = 0


class UpdateStageRequest(BaseModel):
    name: str | None = None
    color: str | None = None
    winProbability: int | None = None
    order: int | None = None


class ReorderStagesRequest(BaseModel):
    stageIds: list[UUID]


class MigrateLeadsRequest(BaseModel):
    targetStageId: UUID


class CreateCustomFieldRequest(BaseModel):
    label: str
    type: str = "text"
    options: dict | None = None  # type: ignore[type-arg]
    order: int = 0


class UpdateCustomFieldRequest(BaseModel):
    label: str | None = None
    options: dict | None = None  # type: ignore[type-arg]
    isActive: bool | None = None


class ReorderCustomFieldsRequest(BaseModel):
    fieldIds: list[UUID]


def _funnel_out(f: Funnel) -> FunnelOut:
    return FunnelOut(id=f.id, name=f.name, isArchived=f.is_archived)


def _stage_out(s: StageModel) -> StageOut:
    return StageOut(
        id=s.id,
        funnelId=s.funnel_id,
        name=s.name,
        color=s.color,
        winProbability=s.win_probability,
        order=s.order,
    )


def _cf_out(cf: CustomFieldModel) -> CustomFieldOut:
    return CustomFieldOut(
        id=cf.id,
        funnelId=cf.funnel_id,
        label=cf.label,
        type=cf.type,
        options=cf.options,
        order=cf.order,
        isActive=cf.is_active,
    )


# ── Funnel CRUD ───────────────────────────────────────────────────────────────


@router.post("", response_model=FunnelOut, status_code=status.HTTP_201_CREATED)
async def create_funnel(body: CreateFunnelRequest, _: CrmGuard, db: DbSession) -> FunnelOut:
    uc = CreateFunnelUseCase(SqlFunnelRepository(db))
    try:
        funnel = await uc.execute(body.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return _funnel_out(funnel)


@router.get("", response_model=list[FunnelOut])
async def list_funnels(current_user: CurrentUser, db: DbSession, is_archived: bool | None = None) -> list[FunnelOut]:
    uc = ListFunnelsUseCase(SqlFunnelRepository(db))
    funnels = await uc.execute(is_archived=is_archived)
    return [_funnel_out(f) for f in funnels]


@router.get("/{funnel_id}", response_model=FunnelOut)
async def get_funnel(funnel_id: UUID, current_user: CurrentUser, db: DbSession) -> FunnelOut:
    result = await db.execute(select(FunnelModel).where(FunnelModel.id == funnel_id))
    f = result.scalar_one_or_none()
    if f is None:
        raise HTTPException(status_code=404, detail="Funnel not found")
    stage_count = len((await db.execute(select(StageModel.id).where(StageModel.funnel_id == funnel_id))).all())
    lead_count = len((await db.execute(select(LeadModel.id).where(LeadModel.funnel_id == funnel_id))).all())
    return FunnelOut(
        id=f.id,
        name=f.name,
        isArchived=f.is_archived,
        stageCount=stage_count,
        leadCount=lead_count,
        createdAt=f.created_at.isoformat() if f.created_at else None,
    )


@router.patch("/{funnel_id}", response_model=FunnelOut)
async def update_funnel(funnel_id: UUID, body: UpdateFunnelRequest, _: CrmGuard, db: DbSession) -> FunnelOut:
    result = await db.execute(select(FunnelModel).where(FunnelModel.id == funnel_id))
    f = result.scalar_one_or_none()
    if f is None:
        raise HTTPException(status_code=404, detail="Funnel not found")
    if body.name is not None:
        f.name = body.name
    await db.commit()
    await db.refresh(f)
    return FunnelOut(id=f.id, name=f.name, isArchived=f.is_archived)


@router.delete("/{funnel_id}")
async def delete_funnel(funnel_id: UUID, _: CrmGuard, db: DbSession) -> Response:
    result = await db.execute(select(FunnelModel).where(FunnelModel.id == funnel_id))
    f = result.scalar_one_or_none()
    if f is None:
        raise HTTPException(status_code=404, detail="Funnel not found")
    await db.delete(f)
    await db.commit()
    return Response(status_code=204)


@router.post("/{funnel_id}/archive", response_model=FunnelOut)
async def archive_funnel(funnel_id: UUID, _: CrmGuard, db: DbSession) -> FunnelOut:
    uc = ArchiveFunnelUseCase(SqlFunnelRepository(db))
    try:
        funnel = await uc.execute(funnel_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    await db.commit()
    return _funnel_out(funnel)


# ── Stages ────────────────────────────────────────────────────────────────────


@router.get("/{funnel_id}/stages", response_model=list[StageOut])
async def list_stages(funnel_id: UUID, current_user: CurrentUser, db: DbSession) -> list[StageOut]:
    rows = (
        (await db.execute(select(StageModel).where(StageModel.funnel_id == funnel_id).order_by(StageModel.order)))
        .scalars()
        .all()
    )
    return [_stage_out(s) for s in rows]


@router.post("/{funnel_id}/stages", response_model=StageOut, status_code=status.HTTP_201_CREATED)
async def create_stage(funnel_id: UUID, body: CreateStageRequest, _: CrmGuard, db: DbSession) -> StageOut:
    win_prob = body.winProbability or body.win_probability
    uc = CreateStageUseCase(SqlStageRepository(db), SqlFunnelRepository(db))
    try:
        stage = await uc.execute(
            CreateStageInput(
                funnel_id=funnel_id,
                name=body.name,
                color=body.color,
                win_probability=win_prob,
                order=body.order,
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    result = await db.execute(select(StageModel).where(StageModel.id == stage.id))
    sm = result.scalar_one()
    return _stage_out(sm)


@router.patch("/{funnel_id}/stages/{stage_id}", response_model=StageOut)
async def update_stage(
    funnel_id: UUID, stage_id: UUID, body: UpdateStageRequest, _: CrmGuard, db: DbSession
) -> StageOut:
    result = await db.execute(select(StageModel).where(StageModel.id == stage_id, StageModel.funnel_id == funnel_id))
    s = result.scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=404, detail="Stage not found")
    if body.name is not None:
        s.name = body.name
    if body.color is not None:
        s.color = body.color
    if body.winProbability is not None:
        if not (0 <= body.winProbability <= 100):
            raise HTTPException(status_code=400, detail="winProbability must be 0-100")
        s.win_probability = body.winProbability
    if body.order is not None:
        s.order = body.order
    await db.commit()
    await db.refresh(s)
    return _stage_out(s)


@router.delete("/{funnel_id}/stages/{stage_id}")
async def delete_stage(funnel_id: UUID, stage_id: UUID, _: CrmGuard, db: DbSession) -> Response:
    result = await db.execute(select(StageModel).where(StageModel.id == stage_id, StageModel.funnel_id == funnel_id))
    s = result.scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=404, detail="Stage not found")
    await db.delete(s)
    await db.commit()
    return Response(status_code=204)


@router.post("/{funnel_id}/stages/reorder")
async def reorder_stages(funnel_id: UUID, body: ReorderStagesRequest, _: CrmGuard, db: DbSession) -> Response:
    for idx, stage_id in enumerate(body.stageIds):
        await db.execute(
            StageModel.__table__.update()
            .where(StageModel.id == stage_id, StageModel.funnel_id == funnel_id)
            .values(order=idx)
        )
    await db.commit()
    return Response(status_code=204)


@router.post("/{funnel_id}/stages/{stage_id}/migrate-leads")
async def migrate_leads(
    funnel_id: UUID, stage_id: UUID, body: MigrateLeadsRequest, _: CrmGuard, db: DbSession
) -> Response:
    await db.execute(
        LeadModel.__table__.update()
        .where(LeadModel.stage_id == stage_id, LeadModel.funnel_id == funnel_id)
        .values(stage_id=body.targetStageId)
    )
    await db.commit()
    return Response(status_code=204)


# ── Custom Fields ─────────────────────────────────────────────────────────────


@router.get("/{funnel_id}/custom-fields", response_model=list[CustomFieldOut])
async def list_custom_fields(funnel_id: UUID, current_user: CurrentUser, db: DbSession) -> list[CustomFieldOut]:
    rows = (
        (
            await db.execute(
                select(CustomFieldModel).where(CustomFieldModel.funnel_id == funnel_id).order_by(CustomFieldModel.order)
            )
        )
        .scalars()
        .all()
    )
    return [_cf_out(cf) for cf in rows]


@router.post("/{funnel_id}/custom-fields", response_model=CustomFieldOut, status_code=status.HTTP_201_CREATED)
async def create_custom_field(
    funnel_id: UUID, body: CreateCustomFieldRequest, _: CrmGuard, db: DbSession
) -> CustomFieldOut:
    cf = CustomFieldModel(
        funnel_id=funnel_id,
        label=body.label,
        type=body.type,
        options=body.options,
        order=body.order,
        is_active=True,
        created_at=datetime.now(UTC),
    )
    db.add(cf)
    await db.commit()
    await db.refresh(cf)
    return _cf_out(cf)


@router.patch("/{funnel_id}/custom-fields/{field_id}", response_model=CustomFieldOut)
async def update_custom_field(
    funnel_id: UUID, field_id: UUID, body: UpdateCustomFieldRequest, _: CrmGuard, db: DbSession
) -> CustomFieldOut:
    result = await db.execute(
        select(CustomFieldModel).where(CustomFieldModel.id == field_id, CustomFieldModel.funnel_id == funnel_id)
    )
    cf = result.scalar_one_or_none()
    if cf is None:
        raise HTTPException(status_code=404, detail="Custom field not found")
    if body.label is not None:
        cf.label = body.label
    if body.options is not None:
        cf.options = body.options
    if body.isActive is not None:
        cf.is_active = body.isActive
    await db.commit()
    await db.refresh(cf)
    return _cf_out(cf)


@router.delete("/{funnel_id}/custom-fields/{field_id}")
async def delete_custom_field(funnel_id: UUID, field_id: UUID, _: CrmGuard, db: DbSession) -> Response:
    result = await db.execute(
        select(CustomFieldModel).where(CustomFieldModel.id == field_id, CustomFieldModel.funnel_id == funnel_id)
    )
    cf = result.scalar_one_or_none()
    if cf is None:
        raise HTTPException(status_code=404, detail="Custom field not found")
    await db.delete(cf)
    await db.commit()
    return Response(status_code=204)


@router.post("/{funnel_id}/custom-fields/reorder")
async def reorder_custom_fields(
    funnel_id: UUID, body: ReorderCustomFieldsRequest, _: CrmGuard, db: DbSession
) -> Response:
    for idx, field_id in enumerate(body.fieldIds):
        await db.execute(
            CustomFieldModel.__table__.update()
            .where(CustomFieldModel.id == field_id, CustomFieldModel.funnel_id == funnel_id)
            .values(order=idx)
        )
    await db.commit()
    return Response(status_code=204)
