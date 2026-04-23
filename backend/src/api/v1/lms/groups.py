from __future__ import annotations

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import GroupModel, EnrollmentModel, LessonModel, DirectionModel

router = APIRouter(prefix="/groups", tags=["LMS - Groups"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class GroupResponse(CamelModel):
    id: UUID
    name: str
    direction_id: UUID | None = None
    direction_name: str | None = None
    room_id: UUID | None = None
    start_date: str | None = None
    end_date: str | None = None
    schedule: dict | None = None  # type: ignore[type-arg]
    is_active: bool = True
    student_count: int = 0

    @classmethod
    def from_model(cls, m: GroupModel, student_count: int = 0, direction_name: str | None = None) -> GroupResponse:
        return cls(
            id=m.id, name=m.name,
            direction_id=m.direction_id, direction_name=direction_name,
            room_id=m.room_id,
            start_date=str(m.started_at) if m.started_at else None,
            end_date=str(m.ended_at) if m.ended_at else None,
            schedule=m.schedule or {},
            is_active=m.is_active,
            student_count=student_count,
        )


class PagedGroups(CamelModel):
    data: list[GroupResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class CreateGroupRequest(CamelModel):
    name: str
    direction_id: UUID | None = None
    room_id: UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    schedule: dict | None = None  # type: ignore[type-arg]


class UpdateGroupRequest(CamelModel):
    name: str | None = None
    direction_id: UUID | None = None
    room_id: UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    schedule: dict | None = None  # type: ignore[type-arg]
    is_active: bool | None = None


# ── helpers ──────────────────────────────────────────────────────────────────

async def _student_count(db, group_id: UUID) -> int:
    from sqlalchemy import func as fn
    return (await db.execute(
        select(fn.count()).where(EnrollmentModel.group_id == group_id, EnrollmentModel.is_active == True)  # noqa: E712
    )).scalar() or 0


async def _direction_map(db, direction_ids: set[UUID]) -> dict[UUID, str]:
    if not direction_ids:
        return {}
    rows = (await db.execute(
        select(DirectionModel.id, DirectionModel.name).where(DirectionModel.id.in_(direction_ids))
    )).all()
    return {r.id: r.name for r in rows}


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    body: CreateGroupRequest,
    _: StaffGuard,
    db: DbSession,
) -> GroupResponse:
    from uuid import uuid4

    m = GroupModel(
        id=uuid4(),
        name=body.name,
        direction_id=body.direction_id,
        room_id=body.room_id,
        started_at=body.start_date,
        ended_at=body.end_date,
        schedule=body.schedule or {},
        is_active=True,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    d_map = await _direction_map(db, {m.direction_id} if m.direction_id else set())
    return GroupResponse.from_model(m, direction_name=d_map.get(m.direction_id))


@router.get("", response_model=PagedGroups)
async def list_groups(
    current_user: CurrentUser,
    db: DbSession,
    direction_id: UUID | None = Query(None, alias="directionId"),
    teacher_id: UUID | None = Query(None, alias="teacherId"),
    is_active: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> PagedGroups:
    from sqlalchemy import func as fn
    from src.infrastructure.persistence.models.lms import SubjectModel

    q = select(GroupModel)

    # Teacher filter: groups in directions where teacher has subjects
    if teacher_id:
        teacher_dir_ids = (await db.execute(
            select(SubjectModel.direction_id).where(
                SubjectModel.teacher_id == teacher_id,
                SubjectModel.direction_id != None,  # noqa: E711
            ).distinct()
        )).scalars().all()
        if teacher_dir_ids:
            q = q.where(GroupModel.direction_id.in_(teacher_dir_ids))
        else:
            q = q.where(False)

    if direction_id:
        q = q.where(GroupModel.direction_id == direction_id)
    if is_active is not None:
        q = q.where(GroupModel.is_active == is_active)

    total = (await db.execute(select(fn.count()).select_from(q.subquery()))).scalar() or 0
    rows = (await db.execute(
        q.order_by(GroupModel.name).offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    d_map = await _direction_map(db, {m.direction_id for m in rows if m.direction_id})

    result = []
    for m in rows:
        sc = await _student_count(db, m.id)
        result.append(GroupResponse.from_model(m, student_count=sc, direction_name=d_map.get(m.direction_id)))

    return PagedGroups(
        data=result, total=total, page=page, limit=page_size,
        total_pages=max(1, -(-total // page_size)),
    )


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(group_id: UUID, current_user: CurrentUser, db: DbSession) -> GroupResponse:
    m = (await db.execute(select(GroupModel).where(GroupModel.id == group_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Group not found")
    sc = await _student_count(db, m.id)
    d_map = await _direction_map(db, {m.direction_id} if m.direction_id else set())
    return GroupResponse.from_model(m, student_count=sc, direction_name=d_map.get(m.direction_id))


@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    body: UpdateGroupRequest,
    _: StaffGuard,
    db: DbSession,
) -> GroupResponse:
    m = (await db.execute(select(GroupModel).where(GroupModel.id == group_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Group not found")
    if body.name is not None:
        m.name = body.name
    if body.direction_id is not None:
        m.direction_id = body.direction_id
    if body.room_id is not None:
        m.room_id = body.room_id
    if body.start_date is not None:
        m.started_at = body.start_date
    if body.end_date is not None:
        m.ended_at = body.end_date
    if body.schedule is not None:
        m.schedule = body.schedule
    if body.is_active is not None:
        m.is_active = body.is_active
    await db.commit()
    await db.refresh(m)
    sc = await _student_count(db, m.id)
    d_map = await _direction_map(db, {m.direction_id} if m.direction_id else set())
    return GroupResponse.from_model(m, student_count=sc, direction_name=d_map.get(m.direction_id))


@router.post("/{group_id}/archive", response_model=GroupResponse)
async def archive_group(group_id: UUID, _: StaffGuard, db: DbSession) -> GroupResponse:
    m = (await db.execute(select(GroupModel).where(GroupModel.id == group_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Group not found")
    m.is_active = False
    await db.commit()
    await db.refresh(m)
    sc = await _student_count(db, m.id)
    d_map = await _direction_map(db, {m.direction_id} if m.direction_id else set())
    return GroupResponse.from_model(m, student_count=sc, direction_name=d_map.get(m.direction_id))


# ── Sub-resources ────────────────────────────────────────────────────────────

@router.get("/{group_id}/students")
async def get_group_students(
    group_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[dict]:  # type: ignore[type-arg]
    from src.infrastructure.persistence.models.lms import StudentModel

    rows = (await db.execute(
        select(StudentModel)
        .join(EnrollmentModel, EnrollmentModel.student_id == StudentModel.id)
        .where(EnrollmentModel.group_id == group_id, EnrollmentModel.is_active == True)  # noqa: E712
        .order_by(StudentModel.full_name)
    )).scalars().all()

    return [
        {
            "id": str(s.id),
            "fullName": s.full_name or "",
            "phone": s.phone,
            "photoUrl": getattr(s, "photo_url", None),
            "riskLevel": s.risk_level or "low",
            "gpa": float(s.gpa) if s.gpa is not None else None,
            "attendancePercent": float(s.attendance_percent) if s.attendance_percent is not None else None,
        }
        for s in rows
    ]


@router.get("/{group_id}/lessons")
async def get_group_lessons(
    group_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[dict]:  # type: ignore[type-arg]
    from datetime import timedelta

    rows = (await db.execute(
        select(LessonModel).where(LessonModel.group_id == group_id)
        .order_by(LessonModel.scheduled_at.asc().nullslast())
    )).scalars().all()

    result = []
    for r in rows:
        scheduled = r.scheduled_at
        duration = r.duration_minutes or 60
        d = scheduled.strftime("%Y-%m-%d") if scheduled else ""
        st = scheduled.strftime("%H:%M") if scheduled else "00:00"
        end_dt = scheduled + timedelta(minutes=duration) if scheduled else None
        et = end_dt.strftime("%H:%M") if end_dt else "00:00"
        result.append({
            "id": str(r.id),
            "groupId": str(r.group_id),
            "teacherId": str(r.teacher_id) if r.teacher_id else None,
            "date": d,
            "startTime": st,
            "endTime": et,
            "status": r.status,
            "topic": r.topic,
            "isOnline": r.is_online,
        })
    return result
