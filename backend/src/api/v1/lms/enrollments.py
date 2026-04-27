"""Enrollment API — enroll / drop students from groups."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import EnrollmentModel, GroupModel, StudentModel

router = APIRouter(prefix="/enrollments", tags=["LMS - Enrollments"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup"))]


class EnrollmentOut(BaseModel):
    id: UUID
    student_id: UUID
    group_id: UUID
    enrolled_at: str
    dropped_at: str | None
    is_active: bool


class EnrollRequest(BaseModel):
    student_id: UUID
    group_id: UUID


@router.post("", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
async def enroll_student(body: EnrollRequest, _: StaffGuard, db: DbSession) -> EnrollmentOut:
    # Validate group exists
    group = await db.get(GroupModel, body.group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")

    # Validate student exists
    student = await db.get(StudentModel, body.student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check for existing active enrollment
    existing = (
        await db.execute(
            select(EnrollmentModel).where(
                EnrollmentModel.student_id == body.student_id,
                EnrollmentModel.group_id == body.group_id,
                EnrollmentModel.is_active == True,  # noqa: E712
            )
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=409, detail="Student is already enrolled in this group")

    now = datetime.now(UTC)
    m = EnrollmentModel(
        id=uuid4(),
        student_id=body.student_id,
        group_id=body.group_id,
        enrolled_at=now,
        is_active=True,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)

    return EnrollmentOut(
        id=m.id,
        student_id=m.student_id,
        group_id=m.group_id,
        enrolled_at=m.enrolled_at.isoformat(),
        dropped_at=m.dropped_at.isoformat() if m.dropped_at else None,
        is_active=m.is_active,
    )


@router.delete("/{enrollment_id}", response_model=EnrollmentOut)
async def drop_student(enrollment_id: UUID, _: StaffGuard, db: DbSession) -> EnrollmentOut:
    m = await db.get(EnrollmentModel, enrollment_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    if not m.is_active:
        raise HTTPException(status_code=400, detail="Enrollment is already inactive")

    m.is_active = False
    m.dropped_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(m)

    return EnrollmentOut(
        id=m.id,
        student_id=m.student_id,
        group_id=m.group_id,
        enrolled_at=m.enrolled_at.isoformat(),
        dropped_at=m.dropped_at.isoformat() if m.dropped_at else None,
        is_active=m.is_active,
    )


@router.get("/groups/{group_id}", response_model=list[EnrollmentOut])
async def list_group_enrollments(
    group_id: UUID, current_user: CurrentUser, db: DbSession, is_active: bool | None = None
) -> list[EnrollmentOut]:
    q = select(EnrollmentModel).where(EnrollmentModel.group_id == group_id)
    if is_active is not None:
        q = q.where(EnrollmentModel.is_active == is_active)
    rows = (await db.execute(q)).scalars().all()
    return [
        EnrollmentOut(
            id=r.id,
            student_id=r.student_id,
            group_id=r.group_id,
            enrolled_at=r.enrolled_at.isoformat(),
            dropped_at=r.dropped_at.isoformat() if r.dropped_at else None,
            is_active=r.is_active,
        )
        for r in rows
    ]


@router.get("/students/{student_id}", response_model=list[EnrollmentOut])
async def list_student_enrollments(student_id: UUID, current_user: CurrentUser, db: DbSession) -> list[EnrollmentOut]:
    rows = (
        (
            await db.execute(
                select(EnrollmentModel).where(
                    EnrollmentModel.student_id == student_id,
                    EnrollmentModel.is_active == True,  # noqa: E712
                )
            )
        )
        .scalars()
        .all()
    )
    return [
        EnrollmentOut(
            id=r.id,
            student_id=r.student_id,
            group_id=r.group_id,
            enrolled_at=r.enrolled_at.isoformat(),
            dropped_at=r.dropped_at.isoformat() if r.dropped_at else None,
            is_active=r.is_active,
        )
        for r in rows
    ]
