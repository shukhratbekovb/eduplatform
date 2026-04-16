"""Directions, Subjects, Rooms — catalog CRUD."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import DirectionModel, SubjectModel, RoomModel

router = APIRouter(tags=["LMS - Catalog"])

AdminGuard = Annotated[object, Depends(require_roles("director", "mup"))]


# ── Schemas ───────────────────────────────────────────────────────────────────

class DirectionOut(BaseModel):
    id: UUID
    name: str
    description: str | None
    is_active: bool
    duration_months: int | None = None
    total_lessons: int | None = None


class DirectionIn(BaseModel):
    name: str
    description: str | None = None


class SubjectOut(BaseModel):
    id: UUID
    name: str
    direction_id: UUID | None
    teacher_id: UUID | None
    description: str | None
    is_active: bool


class SubjectIn(BaseModel):
    name: str
    direction_id: UUID | None = None
    teacher_id: UUID | None = None
    description: str | None = None


class RoomOut(BaseModel):
    id: UUID
    name: str
    capacity: int | None
    is_active: bool


class RoomIn(BaseModel):
    name: str
    capacity: int | None = None


# ── Directions ────────────────────────────────────────────────────────────────

@router.post("/directions", response_model=DirectionOut, status_code=status.HTTP_201_CREATED)
async def create_direction(body: DirectionIn, _: AdminGuard, db: DbSession) -> DirectionOut:
    m = DirectionModel(id=uuid4(), name=body.name, description=body.description)
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return DirectionOut(id=m.id, name=m.name, description=m.description, is_active=m.is_active)


@router.get("/directions", response_model=list[DirectionOut])
async def list_directions(current_user: CurrentUser, db: DbSession, is_active: bool | None = None) -> list[DirectionOut]:
    q = select(DirectionModel)
    if is_active is not None:
        q = q.where(DirectionModel.is_active == is_active)
    rows = (await db.execute(q)).scalars().all()
    return [DirectionOut(id=r.id, name=r.name, description=r.description, is_active=r.is_active) for r in rows]


@router.get("/directions/{direction_id}", response_model=DirectionOut)
async def get_direction(direction_id: UUID, current_user: CurrentUser, db: DbSession) -> DirectionOut:
    m = await db.get(DirectionModel, direction_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Direction not found")
    return DirectionOut(id=m.id, name=m.name, description=m.description, is_active=m.is_active)


@router.patch("/directions/{direction_id}", response_model=DirectionOut)
async def update_direction(
    direction_id: UUID, body: DirectionIn, _: AdminGuard, db: DbSession
) -> DirectionOut:
    m = await db.get(DirectionModel, direction_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Direction not found")
    m.name = body.name
    if body.description is not None:
        m.description = body.description
    await db.commit()
    await db.refresh(m)
    return DirectionOut(id=m.id, name=m.name, description=m.description, is_active=m.is_active)


# ── Subjects ──────────────────────────────────────────────────────────────────

@router.post("/subjects", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
async def create_subject(body: SubjectIn, _: AdminGuard, db: DbSession) -> SubjectOut:
    m = SubjectModel(
        id=uuid4(),
        name=body.name,
        direction_id=body.direction_id,
        teacher_id=body.teacher_id,
        description=body.description,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return SubjectOut(id=m.id, name=m.name, direction_id=m.direction_id, teacher_id=m.teacher_id, description=m.description, is_active=m.is_active)


@router.get("/subjects", response_model=list[SubjectOut])
async def list_subjects(
    current_user: CurrentUser,
    db: DbSession,
    direction_id: UUID | None = None,
    teacher_id: UUID | None = None,
) -> list[SubjectOut]:
    q = select(SubjectModel)
    if direction_id is not None:
        q = q.where(SubjectModel.direction_id == direction_id)
    if teacher_id is not None:
        q = q.where(SubjectModel.teacher_id == teacher_id)
    rows = (await db.execute(q)).scalars().all()
    return [SubjectOut(id=r.id, name=r.name, direction_id=r.direction_id, teacher_id=r.teacher_id, description=r.description, is_active=r.is_active) for r in rows]


@router.get("/subjects/{subject_id}", response_model=SubjectOut)
async def get_subject(subject_id: UUID, current_user: CurrentUser, db: DbSession) -> SubjectOut:
    m = await db.get(SubjectModel, subject_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    return SubjectOut(id=m.id, name=m.name, direction_id=m.direction_id, teacher_id=m.teacher_id, description=m.description, is_active=m.is_active)


# ── Rooms ─────────────────────────────────────────────────────────────────────

@router.post("/rooms", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
async def create_room(body: RoomIn, _: AdminGuard, db: DbSession) -> RoomOut:
    m = RoomModel(id=uuid4(), name=body.name, capacity=body.capacity)
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return RoomOut(id=m.id, name=m.name, capacity=m.capacity, is_active=m.is_active)


@router.get("/rooms", response_model=list[RoomOut])
async def list_rooms(current_user: CurrentUser, db: DbSession) -> list[RoomOut]:
    rows = (await db.execute(select(RoomModel).where(RoomModel.is_active == True))).scalars().all()  # noqa: E712
    return [RoomOut(id=r.id, name=r.name, capacity=r.capacity, is_active=r.is_active) for r in rows]


@router.patch("/rooms/{room_id}", response_model=RoomOut)
async def update_room(room_id: UUID, body: RoomIn, _: AdminGuard, db: DbSession) -> RoomOut:
    m = await db.get(RoomModel, room_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Room not found")
    m.name = body.name
    if body.capacity is not None:
        m.capacity = body.capacity
    await db.commit()
    await db.refresh(m)
    return RoomOut(id=m.id, name=m.name, capacity=m.capacity, is_active=m.is_active)
