from __future__ import annotations

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.application.lms.groups.use_cases import (
    CreateGroupInput,
    CreateGroupUseCase,
    GetGroupUseCase,
    ListGroupsUseCase,
    UpdateGroupInput,
    UpdateGroupUseCase,
)
from src.domain.lms.entities import Group
from src.infrastructure.persistence.repositories.lms.group_repository import SqlGroupRepository
from src.infrastructure.persistence.models.lms import LessonModel

router = APIRouter(prefix="/groups", tags=["LMS - Groups"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]


class GroupResponse(BaseModel):
    id: UUID
    name: str
    subjectId: UUID | None = None
    teacherId: UUID | None = None
    roomId: UUID | None = None
    startDate: str | None = None
    endDate: str | None = None
    schedule: dict | None = None  # type: ignore[type-arg]
    maxStudents: int | None = None
    pricePerMonth: int | None = None
    isActive: bool = True
    studentCount: int = 0

    @classmethod
    def from_model(cls, m, student_count: int = 0) -> "GroupResponse":  # type: ignore[no-untyped-def]
        return cls(
            id=m.id, name=m.name,
            subjectId=m.subject_id, teacherId=m.teacher_id, roomId=m.room_id,
            startDate=str(m.started_at) if m.started_at else None,
            endDate=str(m.ended_at) if m.ended_at else None,
            schedule=m.schedule or {},
            maxStudents=m.max_students, pricePerMonth=m.price_per_month,
            isActive=m.is_active,
            studentCount=student_count,
        )


class PagedGroups(BaseModel):
    data: list[GroupResponse]
    total: int
    page: int
    limit: int
    totalPages: int


class CreateGroupRequest(BaseModel):
    name: str
    subject_id: UUID
    teacher_id: UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    schedule: dict | None = None  # type: ignore[type-arg]


class UpdateGroupRequest(BaseModel):
    name: str | None = None
    teacher_id: UUID | None = None
    schedule: dict | None = None  # type: ignore[type-arg]
    is_active: bool | None = None


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    body: CreateGroupRequest,
    _: StaffGuard,
    db: DbSession,
) -> GroupResponse:
    uc = CreateGroupUseCase(SqlGroupRepository(db))
    try:
        group = await uc.execute(CreateGroupInput(**body.model_dump()))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return GroupResponse.from_domain(group)


@router.get("", response_model=PagedGroups)
async def list_groups(
    current_user: CurrentUser,
    db: DbSession,
    subject_id: UUID | None = None,
    teacher_id: UUID | None = None,
    teacherId: UUID | None = None,
    is_active: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> PagedGroups:
    from sqlalchemy import func as fn
    from src.infrastructure.persistence.models.lms import GroupModel, EnrollmentModel

    t_id = teacher_id or teacherId
    q = select(GroupModel)
    if subject_id:
        q = q.where(GroupModel.subject_id == subject_id)
    if t_id:
        q = q.where(GroupModel.teacher_id == t_id)
    if is_active is not None:
        q = q.where(GroupModel.is_active == is_active)

    total = (await db.execute(select(fn.count()).select_from(q.subquery()))).scalar() or 0
    rows = (await db.execute(
        q.order_by(GroupModel.name).offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    # Count students per group
    result = []
    for m in rows:
        sc = (await db.execute(
            select(fn.count()).where(EnrollmentModel.group_id == m.id, EnrollmentModel.is_active == True)  # noqa: E712
        )).scalar() or 0
        result.append(GroupResponse.from_model(m, student_count=sc))

    return PagedGroups(
        data=result, total=total, page=page, limit=page_size,
        totalPages=max(1, -(-total // page_size)),
    )


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(group_id: UUID, current_user: CurrentUser, db: DbSession) -> GroupResponse:
    from sqlalchemy import func as fn
    from src.infrastructure.persistence.models.lms import GroupModel, EnrollmentModel

    m = (await db.execute(select(GroupModel).where(GroupModel.id == group_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Group not found")
    sc = (await db.execute(
        select(fn.count()).where(EnrollmentModel.group_id == m.id, EnrollmentModel.is_active == True)  # noqa: E712
    )).scalar() or 0
    return GroupResponse.from_model(m, student_count=sc)


@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    body: UpdateGroupRequest,
    _: StaffGuard,
    db: DbSession,
) -> GroupResponse:
    uc = UpdateGroupUseCase(SqlGroupRepository(db))
    try:
        group = await uc.execute(group_id, UpdateGroupInput(**body.model_dump()))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    await db.commit()
    return GroupResponse.from_domain(group)


@router.get("/{group_id}/students")
async def get_group_students(
    group_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[dict]:  # type: ignore[type-arg]
    from src.infrastructure.persistence.models.lms import EnrollmentModel, StudentModel

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
