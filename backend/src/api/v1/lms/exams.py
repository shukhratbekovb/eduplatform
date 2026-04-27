"""LMS Exams — CRUD + grading."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import func, select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import (
    EnrollmentModel,
    ExamModel,
    GradeRecordModel,
    GroupModel,
    LessonModel,
    StudentModel,
    SubjectModel,
)

router = APIRouter(prefix="/exams", tags=["LMS - Exams"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ── Schemas ──────────────────────────────────────────────────────────────────


class ExamOut(CamelModel):
    id: UUID
    title: str
    group_id: UUID | None = None
    group_name: str | None = None
    subject_id: UUID | None = None
    subject_name: str | None = None
    date: str
    start_time: str
    end_time: str
    status: str
    description: str | None = None
    max_score: float = 10
    grades_count: int = 0


class CreateExamIn(CamelModel):
    title: str
    group_id: UUID | None = None
    subject_id: UUID | None = None
    date: str
    start_time: str = "10:00"
    end_time: str = "12:00"
    description: str | None = None
    max_score: float = 10


class ExamGradeIn(CamelModel):
    student_id: UUID
    score: float
    comment: str | None = None


class ExamGradeOut(CamelModel):
    id: UUID
    student_id: UUID
    student_name: str | None = None
    score: float
    max_score: float
    comment: str | None = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def _duration(start: str, end: str) -> int:
    h1, m1 = map(int, start.split(":"))
    h2, m2 = map(int, end.split(":"))
    return (h2 * 60 + m2) - (h1 * 60 + m1)


def _exam_status(m: ExamModel) -> str:
    dur = m.duration_minutes or 120
    now = datetime.now()
    sched = m.scheduled_at.replace(tzinfo=None) if m.scheduled_at and m.scheduled_at.tzinfo else m.scheduled_at
    if sched and now > sched + timedelta(minutes=dur):
        return "completed"
    if sched and now >= sched:
        return "in_progress"
    return "upcoming"


async def _exam_out(
    m: ExamModel,
    db,
    group_name: str | None = None,
    subject_name: str | None = None,
) -> ExamOut:
    d = m.scheduled_at.strftime("%Y-%m-%d") if m.scheduled_at else ""
    st = m.scheduled_at.strftime("%H:%M") if m.scheduled_at else "00:00"
    dur = m.duration_minutes or 120
    end_dt = m.scheduled_at + timedelta(minutes=dur) if m.scheduled_at else None
    et = end_dt.strftime("%H:%M") if end_dt else "00:00"

    # Count grades for this exam
    grades_count = (
        await db.execute(
            select(func.count()).where(
                GradeRecordModel.exam_id == m.id,
                GradeRecordModel.type == "exam",
            )
        )
    ).scalar() or 0

    return ExamOut(
        id=m.id,
        title=m.title,
        group_id=m.group_id,
        group_name=group_name,
        subject_id=m.subject_id,
        subject_name=subject_name,
        date=d,
        start_time=st,
        end_time=et,
        status=_exam_status(m),
        description=m.description,
        max_score=float(m.max_score) if m.max_score else 12,
        grades_count=grades_count,
    )


# ── CRUD ─────────────────────────────────────────────────────────────────────


@router.get("", response_model=list[ExamOut])
async def list_exams(current_user: CurrentUser, db: DbSession) -> list[ExamOut]:
    rows = (await db.execute(select(ExamModel).order_by(ExamModel.scheduled_at.desc()))).scalars().all()

    # Bulk resolve names
    gids = {m.group_id for m in rows if m.group_id}
    sids = {m.subject_id for m in rows if m.subject_id}
    gmap: dict = {}
    smap: dict = {}
    if gids:
        groups = (await db.execute(select(GroupModel).where(GroupModel.id.in_(gids)))).scalars().all()
        gmap = {g.id: g.name for g in groups}
    if sids:
        subjects = (await db.execute(select(SubjectModel).where(SubjectModel.id.in_(sids)))).scalars().all()
        smap = {s.id: s.name for s in subjects}

    return [await _exam_out(m, db, gmap.get(m.group_id), smap.get(m.subject_id)) for m in rows]


@router.get("/{exam_id}", response_model=ExamOut)
async def get_exam(exam_id: UUID, current_user: CurrentUser, db: DbSession) -> ExamOut:
    m = (await db.execute(select(ExamModel).where(ExamModel.id == exam_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    gname = (
        (await db.execute(select(GroupModel.name).where(GroupModel.id == m.group_id))).scalar() if m.group_id else None
    )
    sname = (
        (await db.execute(select(SubjectModel.name).where(SubjectModel.id == m.subject_id))).scalar()
        if m.subject_id
        else None
    )
    return await _exam_out(m, db, gname, sname)


@router.post("", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
async def create_exam(body: CreateExamIn, _: StaffGuard, current_user: CurrentUser, db: DbSession) -> ExamOut:
    scheduled = datetime.fromisoformat(f"{body.date}T{body.start_time}:00")
    dur = _duration(body.start_time, body.end_time)

    # Auto-resolve subject from group's lessons if not provided
    subject_id = body.subject_id
    if not subject_id and body.group_id:
        subj = (
            await db.execute(
                select(LessonModel.subject_id)
                .where(LessonModel.group_id == body.group_id, LessonModel.subject_id != None)  # noqa: E711
                .limit(1)
            )
        ).scalar()
        subject_id = subj

    m = ExamModel(
        id=uuid4(),
        title=body.title,
        description=body.description,
        group_id=body.group_id,
        subject_id=subject_id,
        scheduled_at=scheduled,
        duration_minutes=dur,
        max_score=body.max_score,
        created_by=current_user.id,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)

    gname = (
        (await db.execute(select(GroupModel.name).where(GroupModel.id == m.group_id))).scalar() if m.group_id else None
    )
    sname = (
        (await db.execute(select(SubjectModel.name).where(SubjectModel.id == m.subject_id))).scalar()
        if m.subject_id
        else None
    )
    return await _exam_out(m, db, gname, sname)


@router.delete("/{exam_id}")
async def delete_exam(exam_id: UUID, _: StaffGuard, db: DbSession) -> Response:
    m = (await db.execute(select(ExamModel).where(ExamModel.id == exam_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    await db.delete(m)
    await db.commit()
    return Response(status_code=204)


# ── Grading ──────────────────────────────────────────────────────────────────


@router.get("/{exam_id}/grades", response_model=list[ExamGradeOut])
async def get_exam_grades(exam_id: UUID, current_user: CurrentUser, db: DbSession) -> list[ExamGradeOut]:
    m = (await db.execute(select(ExamModel).where(ExamModel.id == exam_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    rows = (
        (
            await db.execute(
                select(GradeRecordModel).where(
                    GradeRecordModel.exam_id == exam_id,
                    GradeRecordModel.type == "exam",
                )
            )
        )
        .scalars()
        .all()
    )

    # Resolve student names
    sids = {r.student_id for r in rows}
    smap: dict = {}
    if sids:
        students = (await db.execute(select(StudentModel).where(StudentModel.id.in_(sids)))).scalars().all()
        smap = {s.id: s.full_name for s in students}

    return [
        ExamGradeOut(
            id=r.id,
            student_id=r.student_id,
            student_name=smap.get(r.student_id),
            score=float(r.score),
            max_score=float(m.max_score) if m.max_score else 12,
            comment=r.comment,
        )
        for r in rows
    ]


@router.get("/{exam_id}/students")
async def get_exam_students(exam_id: UUID, current_user: CurrentUser, db: DbSession) -> list[dict]:
    """Get students eligible for this exam (enrolled in the group)."""
    m = (await db.execute(select(ExamModel).where(ExamModel.id == exam_id))).scalar_one_or_none()
    if m is None or not m.group_id:
        return []

    rows = (
        (
            await db.execute(
                select(StudentModel)
                .join(EnrollmentModel, EnrollmentModel.student_id == StudentModel.id)
                .where(EnrollmentModel.group_id == m.group_id, EnrollmentModel.is_active == True)  # noqa: E712
                .order_by(StudentModel.full_name)
            )
        )
        .scalars()
        .all()
    )

    return [{"id": str(s.id), "fullName": s.full_name or ""} for s in rows]


@router.post("/{exam_id}/grades", response_model=list[ExamGradeOut])
async def save_exam_grades(
    exam_id: UUID,
    body: list[ExamGradeIn],
    _: StaffGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> list[ExamGradeOut]:
    m = (await db.execute(select(ExamModel).where(ExamModel.id == exam_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    now = datetime.now(UTC)

    for gr in body:
        existing = (
            await db.execute(
                select(GradeRecordModel).where(
                    GradeRecordModel.exam_id == exam_id,
                    GradeRecordModel.student_id == gr.student_id,
                    GradeRecordModel.type == "exam",
                )
            )
        ).scalar_one_or_none()

        if existing:
            existing.score = gr.score
            existing.comment = gr.comment
        else:
            db.add(
                GradeRecordModel(
                    id=uuid4(),
                    student_id=gr.student_id,
                    exam_id=exam_id,
                    subject_id=m.subject_id,
                    type="exam",
                    score=gr.score,
                    max_score=float(m.max_score) if m.max_score else 12,
                    comment=gr.comment,
                    graded_by=current_user.id,
                    graded_at=now,
                )
            )

    await db.commit()

    # Return updated grades
    return await get_exam_grades(exam_id, current_user, db)
