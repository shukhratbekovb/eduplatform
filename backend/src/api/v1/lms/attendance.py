"""Attendance recording and reporting API."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select, update

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import AttendanceRecordModel, StudentModel

router = APIRouter(prefix="/attendance", tags=["LMS - Attendance"])

TeacherGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]


class AttendanceRecordIn(BaseModel):
    student_id: UUID
    status: str       # present | absent | late | excused
    minutes_late: int | None = None
    note: str | None = None


class BulkAttendanceRequest(BaseModel):
    records: list[AttendanceRecordIn]


class AttendanceRecordOut(BaseModel):
    id: UUID
    lesson_id: UUID
    student_id: UUID
    status: str
    minutes_late: int | None
    note: str | None
    recorded_at: str


VALID_STATUSES = {"present", "absent", "late", "excused"}


@router.post("/lessons/{lesson_id}/bulk", response_model=list[AttendanceRecordOut])
async def record_bulk_attendance(
    lesson_id: UUID,
    body: BulkAttendanceRequest,
    current_user: CurrentUser,
    _: TeacherGuard,
    db: DbSession,
) -> list[AttendanceRecordOut]:
    """Record attendance for all students in a lesson at once."""
    for rec in body.records:
        if rec.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status: {rec.status!r}")

    now = datetime.now(timezone.utc)
    results = []

    for rec in body.records:
        m = AttendanceRecordModel(
            id=uuid4(),
            lesson_id=lesson_id,
            student_id=rec.student_id,
            status=rec.status,
            minutes_late=rec.minutes_late,
            note=rec.note,
            recorded_by=current_user.id,
            recorded_at=now,
        )
        db.add(m)
        results.append(AttendanceRecordOut(
            id=m.id,
            lesson_id=lesson_id,
            student_id=rec.student_id,
            status=rec.status,
            minutes_late=rec.minutes_late,
            note=rec.note,
            recorded_at=now.isoformat(),
        ))

    await db.commit()

    # Update each student's attendance_percent
    student_ids = {rec.student_id for rec in body.records}
    for sid in student_ids:
        await _recalculate_attendance(sid, db)
    await db.commit()

    return results


async def _recalculate_attendance(student_id: UUID, db: DbSession) -> None:
    """Recalculate and update attendance_percent for a student."""
    total = (await db.execute(
        select(func.count(AttendanceRecordModel.id))
        .where(AttendanceRecordModel.student_id == student_id)
    )).scalar_one() or 0

    if total == 0:
        return

    present = (await db.execute(
        select(func.count(AttendanceRecordModel.id))
        .where(
            AttendanceRecordModel.student_id == student_id,
            AttendanceRecordModel.status.in_(["present", "late"]),
        )
    )).scalar_one() or 0

    pct = round((present / total) * 100, 2)
    await db.execute(
        update(StudentModel)
        .where(StudentModel.id == student_id)
        .values(attendance_percent=pct)
    )


@router.get("/lessons/{lesson_id}", response_model=list[AttendanceRecordOut])
async def get_lesson_attendance(
    lesson_id: UUID,
    _: TeacherGuard,
    db: DbSession,
) -> list[AttendanceRecordOut]:
    rows = (await db.execute(
        select(AttendanceRecordModel).where(AttendanceRecordModel.lesson_id == lesson_id)
    )).scalars().all()

    return [AttendanceRecordOut(
        id=r.id,
        lesson_id=r.lesson_id,
        student_id=r.student_id,
        status=r.status,
        minutes_late=r.minutes_late,
        note=r.note,
        recorded_at=r.recorded_at.isoformat() if r.recorded_at else "",
    ) for r in rows]


@router.get("/students/{student_id}", response_model=list[AttendanceRecordOut])
async def get_student_attendance(
    student_id: UUID,
    _: TeacherGuard,
    db: DbSession,
) -> list[AttendanceRecordOut]:
    rows = (await db.execute(
        select(AttendanceRecordModel)
        .where(AttendanceRecordModel.student_id == student_id)
        .order_by(AttendanceRecordModel.recorded_at.desc())
        .limit(100)
    )).scalars().all()

    return [AttendanceRecordOut(
        id=r.id,
        lesson_id=r.lesson_id,
        student_id=r.student_id,
        status=r.status,
        minutes_late=r.minutes_late,
        note=r.note,
        recorded_at=r.recorded_at.isoformat() if r.recorded_at else "",
    ) for r in rows]
