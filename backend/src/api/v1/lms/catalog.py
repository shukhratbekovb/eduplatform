"""Directions, Subjects, Rooms — catalog CRUD."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import DirectionModel, SubjectModel, RoomModel

router = APIRouter(tags=["LMS - Catalog"])

AdminGuard = Annotated[object, Depends(require_roles("director", "mup"))]


# ── Schemas ───────────────────────────────────────────────────────────────────

class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class DirectionOut(CamelModel):
    id: UUID
    name: str
    description: str | None
    is_active: bool
    duration_months: int | None = None
    total_lessons: int | None = None


class DirectionIn(CamelModel):
    name: str
    description: str | None = None
    duration_months: int | None = None
    total_lessons: int | None = None


class SubjectOut(CamelModel):
    id: UUID
    name: str
    direction_id: UUID | None
    teacher_id: UUID | None
    description: str | None
    is_active: bool


class SubjectIn(CamelModel):
    name: str
    direction_id: UUID | None = None
    teacher_id: UUID | None = None
    description: str | None = None


class RoomOut(CamelModel):
    id: UUID
    name: str
    capacity: int | None
    is_active: bool


class RoomIn(CamelModel):
    name: str
    capacity: int | None = None


# ── Directions ────────────────────────────────────────────────────────────────

@router.post("/directions", response_model=DirectionOut, status_code=status.HTTP_201_CREATED)
async def create_direction(body: DirectionIn, _: AdminGuard, db: DbSession) -> DirectionOut:
    m = DirectionModel(
        id=uuid4(), name=body.name, description=body.description,
        duration_months=body.duration_months, total_lessons=body.total_lessons,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return DirectionOut(id=m.id, name=m.name, description=m.description, is_active=m.is_active,
                        duration_months=m.duration_months, total_lessons=m.total_lessons)


@router.get("/directions", response_model=list[DirectionOut])
async def list_directions(current_user: CurrentUser, db: DbSession, is_active: bool | None = None) -> list[DirectionOut]:
    q = select(DirectionModel)
    if is_active is not None:
        q = q.where(DirectionModel.is_active == is_active)
    rows = (await db.execute(q)).scalars().all()
    return [DirectionOut(id=r.id, name=r.name, description=r.description, is_active=r.is_active,
                        duration_months=r.duration_months, total_lessons=r.total_lessons) for r in rows]


@router.get("/directions/{direction_id}", response_model=DirectionOut)
async def get_direction(direction_id: UUID, current_user: CurrentUser, db: DbSession) -> DirectionOut:
    m = await db.get(DirectionModel, direction_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Direction not found")
    return DirectionOut(id=m.id, name=m.name, description=m.description, is_active=m.is_active,
                        duration_months=m.duration_months, total_lessons=m.total_lessons)


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
    if body.duration_months is not None:
        m.duration_months = body.duration_months
    if body.total_lessons is not None:
        m.total_lessons = body.total_lessons
    await db.commit()
    await db.refresh(m)
    return DirectionOut(id=m.id, name=m.name, description=m.description, is_active=m.is_active,
                        duration_months=m.duration_months, total_lessons=m.total_lessons)


@router.post("/directions/{direction_id}/archive", response_model=DirectionOut)
async def archive_direction(direction_id: UUID, _: AdminGuard, db: DbSession) -> DirectionOut:
    m = await db.get(DirectionModel, direction_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Direction not found")
    m.is_active = False
    await db.commit()
    await db.refresh(m)
    return DirectionOut(id=m.id, name=m.name, description=m.description, is_active=m.is_active,
                        duration_months=m.duration_months, total_lessons=m.total_lessons)


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
    direction_id: UUID | None = Query(None, alias="directionId"),
    teacher_id: UUID | None = Query(None, alias="teacherId"),
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


@router.patch("/subjects/{subject_id}", response_model=SubjectOut)
async def update_subject(
    subject_id: UUID, body: SubjectIn, _: AdminGuard, db: DbSession
) -> SubjectOut:
    m = await db.get(SubjectModel, subject_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    m.name = body.name
    if body.direction_id is not None:
        m.direction_id = body.direction_id
    if body.teacher_id is not None:
        m.teacher_id = body.teacher_id
    if body.description is not None:
        m.description = body.description
    await db.commit()
    await db.refresh(m)
    return SubjectOut(id=m.id, name=m.name, direction_id=m.direction_id, teacher_id=m.teacher_id, description=m.description, is_active=m.is_active)


@router.post("/subjects/{subject_id}/archive", response_model=SubjectOut)
async def archive_subject(subject_id: UUID, _: AdminGuard, db: DbSession) -> SubjectOut:
    m = await db.get(SubjectModel, subject_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    m.is_active = False
    await db.commit()
    await db.refresh(m)
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


@router.delete("/rooms/{room_id}", response_model=RoomOut)
async def delete_room(room_id: UUID, _: AdminGuard, db: DbSession) -> RoomOut:
    m = await db.get(RoomModel, room_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Room not found")
    m.is_active = False
    await db.commit()
    await db.refresh(m)
    return RoomOut(id=m.id, name=m.name, capacity=m.capacity, is_active=m.is_active)
