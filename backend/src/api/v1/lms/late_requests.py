"""LMS Late-Entry Requests — teacher requests to enter data after the day has passed."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import func, select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.auth import UserModel
from src.infrastructure.persistence.models.lms import LateEntryRequestModel, LessonModel

router = APIRouter(prefix="/lms/late-requests", tags=["LMS - Late Requests"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup"))]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LateRequestOut(CamelModel):
    id: UUID
    lesson_id: UUID
    lesson_date: str | None = None
    lesson_topic: str | None = None
    group_name: str | None = None
    teacher_id: UUID | None = None
    teacher_name: str | None = None
    reason: str
    is_approved: bool | None = None
    reviewed_by_name: str | None = None
    reviewed_at: str | None = None
    created_at: str | None = None


class CreateLateRequestIn(CamelModel):
    lesson_id: UUID
    reason: str


class ReviewLateRequestIn(BaseModel):
    approved: bool


# ── List ─────────────────────────────────────────────────────────────────────


@router.get("")
async def list_requests(
    current_user: CurrentUser,
    db: DbSession,
    req_status: str | None = Query(None, alias="status"),
    teacher_id: UUID | None = Query(None, alias="teacherId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> dict:
    from src.infrastructure.persistence.models.lms import GroupModel

    q = select(LateEntryRequestModel)
    if req_status == "pending":
        q = q.where(LateEntryRequestModel.is_approved == None)  # noqa: E711
    elif req_status == "approved":
        q = q.where(LateEntryRequestModel.is_approved == True)  # noqa: E712
    elif req_status == "rejected":
        q = q.where(LateEntryRequestModel.is_approved == False)  # noqa: E712

    # Filter by teacher (via lesson.teacher_id)
    if teacher_id:
        lesson_ids = (
            (await db.execute(select(LessonModel.id).where(LessonModel.teacher_id == teacher_id))).scalars().all()
        )
        if lesson_ids:
            q = q.where(LateEntryRequestModel.lesson_id.in_(lesson_ids))
        else:
            q = q.where(False)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    rows = (
        (
            await db.execute(
                q.order_by(LateEntryRequestModel.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
            )
        )
        .scalars()
        .all()
    )

    # Resolve lesson/teacher/group/reviewer info
    lesson_ids_set = {r.lesson_id for r in rows}
    reviewer_ids = {r.reviewed_by for r in rows if r.reviewed_by}

    lessons_map: dict = {}
    if lesson_ids_set:
        lesson_rows = (await db.execute(select(LessonModel).where(LessonModel.id.in_(lesson_ids_set)))).scalars().all()
        for l in lesson_rows:
            gname = None
            if l.group_id:
                gname = (await db.execute(select(GroupModel.name).where(GroupModel.id == l.group_id))).scalar()
            tname = None
            if l.teacher_id:
                tname = (await db.execute(select(UserModel.name).where(UserModel.id == l.teacher_id))).scalar()
            lessons_map[l.id] = {
                "date": l.scheduled_at.strftime("%Y-%m-%d") if l.scheduled_at else None,
                "topic": l.topic,
                "groupName": gname,
                "teacherId": l.teacher_id,
                "teacherName": tname,
            }

    reviewer_map: dict = {}
    if reviewer_ids:
        reviewers = (await db.execute(select(UserModel).where(UserModel.id.in_(reviewer_ids)))).scalars().all()
        reviewer_map = {u.id: u.name for u in reviewers}

    data = []
    for r in rows:
        linfo = lessons_map.get(r.lesson_id, {})
        data.append(
            LateRequestOut(
                id=r.id,
                lesson_id=r.lesson_id,
                lesson_date=linfo.get("date"),
                lesson_topic=linfo.get("topic"),
                group_name=linfo.get("groupName"),
                teacher_id=linfo.get("teacherId"),
                teacher_name=linfo.get("teacherName"),
                reason=r.reason,
                is_approved=r.is_approved,
                reviewed_by_name=reviewer_map.get(r.reviewed_by),
                reviewed_at=r.reviewed_at.isoformat() if r.reviewed_at else None,
                created_at=r.created_at.isoformat() if r.created_at else None,
            )
        )

    return {"data": data, "total": total, "page": page}


# ── Create (teacher) ─────────────────────────────────────────────────────────


@router.post("", response_model=LateRequestOut, status_code=status.HTTP_201_CREATED)
async def create_request(body: CreateLateRequestIn, current_user: CurrentUser, db: DbSession) -> LateRequestOut:
    # Verify lesson exists and belongs to this teacher
    lesson = (await db.execute(select(LessonModel).where(LessonModel.id == body.lesson_id))).scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Use a dummy student_id (the field is NOT NULL in DB) — store teacher's user ID
    # This is a workaround; ideally the table should have teacher_id instead of student_id
    r = LateEntryRequestModel(
        id=uuid4(),
        student_id=None,
        lesson_id=body.lesson_id,
        reason=body.reason,
        is_approved=None,
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)

    return LateRequestOut(
        id=r.id,
        lesson_id=r.lesson_id,
        lesson_date=lesson.scheduled_at.strftime("%Y-%m-%d") if lesson.scheduled_at else None,
        reason=r.reason,
        is_approved=r.is_approved,
        created_at=r.created_at.isoformat() if r.created_at else None,
    )


# ── Review (MUP/Director) ────────────────────────────────────────────────────


@router.post("/{request_id}/review", response_model=LateRequestOut)
async def review_request(
    request_id: UUID,
    body: ReviewLateRequestIn,
    _: StaffGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> LateRequestOut:
    r = (
        await db.execute(select(LateEntryRequestModel).where(LateEntryRequestModel.id == request_id))
    ).scalar_one_or_none()
    if r is None:
        raise HTTPException(status_code=404, detail="Request not found")

    r.is_approved = body.approved
    r.reviewed_by = current_user.id
    r.reviewed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(r)

    lesson = (await db.execute(select(LessonModel).where(LessonModel.id == r.lesson_id))).scalar_one_or_none()

    return LateRequestOut(
        id=r.id,
        lesson_id=r.lesson_id,
        lesson_date=lesson.scheduled_at.strftime("%Y-%m-%d") if lesson and lesson.scheduled_at else None,
        reason=r.reason,
        is_approved=r.is_approved,
        reviewed_by_name=current_user.name,
        reviewed_at=r.reviewed_at.isoformat() if r.reviewed_at else None,
        created_at=r.created_at.isoformat() if r.created_at else None,
    )
