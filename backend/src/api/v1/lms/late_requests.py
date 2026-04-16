"""LMS Late-Entry Requests — students requesting attendance correction."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.lms import LateEntryRequestModel

router = APIRouter(prefix="/lms/late-requests", tags=["LMS - Late Requests"])


class LateRequestOut(BaseModel):
    id: UUID
    studentId: UUID
    lessonId: UUID
    reason: str
    status: str
    resolvedBy: UUID | None
    resolvedAt: str | None
    createdAt: str | None


class CreateLateRequestRequest(BaseModel):
    lessonId: UUID | None = None
    lesson_id: UUID | None = None
    reason: str

    def resolved_lesson_id(self) -> UUID:
        v = self.lessonId or self.lesson_id
        if v is None:
            raise ValueError("lessonId is required")
        return v


class ReviewLateRequestRequest(BaseModel):
    status: str  # "approved" | "rejected"
    comment: str | None = None


def _out(r: LateEntryRequestModel) -> LateRequestOut:
    return LateRequestOut(
        id=r.id,
        studentId=r.student_id,
        lessonId=r.lesson_id,
        reason=r.reason,
        status=r.status,
        resolvedBy=r.resolved_by,
        resolvedAt=r.resolved_at.isoformat() if r.resolved_at else None,
        createdAt=r.created_at.isoformat() if r.created_at else None,
    )


@router.get("", response_model=list[LateRequestOut])
async def list_requests(
    current_user: CurrentUser,
    db: DbSession,
    req_status: str | None = Query(None, alias="status"),
    student_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> list[LateRequestOut]:
    q = select(LateEntryRequestModel)
    if req_status:
        q = q.where(LateEntryRequestModel.status == req_status)
    if student_id:
        q = q.where(LateEntryRequestModel.student_id == student_id)
    q = q.order_by(LateEntryRequestModel.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return [_out(r) for r in rows]


@router.get("/{request_id}", response_model=LateRequestOut)
async def get_request(request_id: UUID, current_user: CurrentUser, db: DbSession) -> LateRequestOut:
    result = await db.execute(select(LateEntryRequestModel).where(LateEntryRequestModel.id == request_id))
    r = result.scalar_one_or_none()
    if r is None:
        raise HTTPException(status_code=404, detail="Late request not found")
    return _out(r)


@router.post("", response_model=LateRequestOut, status_code=status.HTTP_201_CREATED)
async def create_request(body: CreateLateRequestRequest, current_user: CurrentUser, db: DbSession) -> LateRequestOut:
    from src.infrastructure.persistence.models.lms import StudentModel
    student = (await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="Student profile not found")

    try:
        lesson_id = body.resolved_lesson_id()
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    r = LateEntryRequestModel(
        id=uuid4(),
        student_id=student.id,
        lesson_id=lesson_id,
        reason=body.reason,
        status="pending",
        resolved_by=None,
        resolved_at=None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return _out(r)


@router.post("/{request_id}/review", response_model=LateRequestOut)
async def review_request(
    request_id: UUID,
    body: ReviewLateRequestRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LateRequestOut:
    result = await db.execute(select(LateEntryRequestModel).where(LateEntryRequestModel.id == request_id))
    r = result.scalar_one_or_none()
    if r is None:
        raise HTTPException(status_code=404, detail="Late request not found")

    if body.status not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="status must be 'approved' or 'rejected'")

    r.status = body.status
    r.resolved_by = current_user.id
    r.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(r)
    return _out(r)
