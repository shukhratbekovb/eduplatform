"""Grades API — record grades and recalculate student GPA."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select, update

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import GradeRecordModel, StudentModel

router = APIRouter(prefix="/grades", tags=["LMS - Grades"])

TeacherGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]

VALID_TYPES = {"homework", "exam", "quiz", "project", "participation"}


class GradeOut(BaseModel):
    id: UUID
    student_id: UUID
    subject_id: UUID
    lesson_id: UUID | None
    type: str
    score: float
    max_score: float
    comment: str | None
    graded_by: UUID | None
    graded_at: str


class GradeIn(BaseModel):
    student_id: UUID
    subject_id: UUID
    lesson_id: UUID | None = None
    type: str = "homework"
    score: float
    max_score: float = 100.0
    comment: str | None = None


class BulkGradeIn(BaseModel):
    grades: list[GradeIn]


@router.post("", response_model=GradeOut, status_code=201)
async def create_grade(body: GradeIn, _: TeacherGuard, current_user: CurrentUser, db: DbSession) -> GradeOut:
    if body.type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid grade type. Must be one of {sorted(VALID_TYPES)}")
    if body.score < 0 or body.score > body.max_score:
        raise HTTPException(status_code=400, detail="Score must be between 0 and max_score")

    now = datetime.now(timezone.utc)
    m = GradeRecordModel(
        id=uuid4(),
        student_id=body.student_id,
        subject_id=body.subject_id,
        lesson_id=body.lesson_id,
        type=body.type,
        score=body.score,
        max_score=body.max_score,
        comment=body.comment,
        graded_by=current_user.id,
        graded_at=now,
    )
    db.add(m)
    await db.commit()

    await _recalculate_gpa(body.student_id, db)
    await db.commit()

    return _out(m)


@router.post("/bulk", response_model=list[GradeOut], status_code=201)
async def create_bulk_grades(
    body: BulkGradeIn, _: TeacherGuard, current_user: CurrentUser, db: DbSession
) -> list[GradeOut]:
    for g in body.grades:
        if g.type not in VALID_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid type: {g.type!r}")
        if g.score < 0 or g.score > g.max_score:
            raise HTTPException(status_code=400, detail=f"Invalid score for student {g.student_id}")

    now = datetime.now(timezone.utc)
    records: list[GradeRecordModel] = []
    affected_students: set[UUID] = set()

    for g in body.grades:
        m = GradeRecordModel(
            id=uuid4(),
            student_id=g.student_id,
            subject_id=g.subject_id,
            lesson_id=g.lesson_id,
            type=g.type,
            score=g.score,
            max_score=g.max_score,
            comment=g.comment,
            graded_by=current_user.id,
            graded_at=now,
        )
        db.add(m)
        records.append(m)
        affected_students.add(g.student_id)

    await db.commit()

    for sid in affected_students:
        await _recalculate_gpa(sid, db)
    await db.commit()

    return [_out(r) for r in records]


@router.get("/students/{student_id}", response_model=list[GradeOut])
async def list_student_grades(
    student_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    subject_id: UUID | None = None,
    type: str | None = None,
) -> list[GradeOut]:
    q = select(GradeRecordModel).where(GradeRecordModel.student_id == student_id)
    if subject_id:
        q = q.where(GradeRecordModel.subject_id == subject_id)
    if type:
        q = q.where(GradeRecordModel.type == type)
    q = q.order_by(GradeRecordModel.graded_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [_out(r) for r in rows]


async def _recalculate_gpa(student_id: UUID, db: DbSession) -> None:
    """Average of (score / max_score * 12) across all grade records → 12-point GPA."""
    result = await db.execute(
        select(
            func.avg(GradeRecordModel.score / GradeRecordModel.max_score * 12)
        ).where(GradeRecordModel.student_id == student_id)
    )
    avg = result.scalar_one_or_none()
    if avg is not None:
        gpa = round(float(avg), 2)
        await db.execute(
            update(StudentModel)
            .where(StudentModel.id == student_id)
            .values(gpa=gpa)
        )


def _out(m: GradeRecordModel) -> GradeOut:
    return GradeOut(
        id=m.id,
        student_id=m.student_id,
        subject_id=m.subject_id,
        lesson_id=m.lesson_id,
        type=m.type,
        score=float(m.score),
        max_score=float(m.max_score),
        comment=m.comment,
        graded_by=m.graded_by,
        graded_at=m.graded_at.isoformat() if m.graded_at else "",
    )
