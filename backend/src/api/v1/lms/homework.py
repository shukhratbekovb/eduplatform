"""Homework assignments, submissions, and grading API."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func, update

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import (
    HomeworkAssignmentModel, HomeworkSubmissionModel,
    GradeRecordModel, StudentModel, LessonModel,
)

router = APIRouter(prefix="/homework", tags=["LMS - Homework"])

TeacherGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]


# ── Schemas ───────────────────────────────────────────────────────────────────

class FileInfo(BaseModel):
    url: str
    filename: str
    key: str | None = None


class AssignmentOut(BaseModel):
    id: UUID
    lesson_id: UUID
    title: str
    description: str | None
    due_date: str
    max_score: float
    file_urls: list[FileInfo] = []


class AssignmentIn(BaseModel):
    lesson_id: UUID
    title: str
    description: str | None = None
    due_date: str
    max_score: float = 10.0
    file_urls: list[FileInfo] = []


class SubmissionOut(BaseModel):
    id: UUID
    assignment_id: UUID
    student_id: UUID
    student_name: str | None = None
    homework_title: str | None = None
    status: str
    is_late: bool = False
    due_date: str | None = None
    submitted_at: str | None
    answer_text: str | None
    file_url: str | None
    file_key: str | None = None
    score: float | None
    feedback: str | None
    graded_at: str | None = None


class SubmitHomeworkRequest(BaseModel):
    answer_text: str | None = None
    file_url: str | None = None


class GradeHomeworkRequest(BaseModel):
    score: float
    feedback: str | None = None


class ReviewHomeworkRequest(BaseModel):
    grade: float
    feedback: str | None = None


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _submission_out(sub: HomeworkSubmissionModel, db) -> SubmissionOut:
    student_name = None
    homework_title = None

    student = (await db.execute(
        select(StudentModel.full_name).where(StudentModel.id == sub.student_id)
    )).scalar()
    student_name = student

    assign = await db.get(HomeworkAssignmentModel, sub.assignment_id)
    if assign:
        homework_title = assign.title

    # Check if submitted late
    is_late = False
    due_date_str = None
    if assign and assign.due_date:
        due_date_str = assign.due_date.isoformat()
        if sub.submitted_at and sub.submitted_at > assign.due_date:
            is_late = True

    return SubmissionOut(
        id=sub.id,
        assignment_id=sub.assignment_id,
        student_id=sub.student_id,
        student_name=student_name,
        homework_title=homework_title,
        status=sub.status,
        is_late=is_late,
        due_date=due_date_str,
        submitted_at=sub.submitted_at.isoformat() if sub.submitted_at else None,
        answer_text=sub.answer_text,
        file_url=sub.file_url,
        file_key=sub.s3_key,
        score=float(sub.score) if sub.score is not None else None,
        feedback=sub.feedback,
        graded_at=sub.graded_at.isoformat() if sub.graded_at else None,
    )


async def _sync_grade_record(sub: HomeworkSubmissionModel, graded_by: UUID, db) -> None:
    """Create or update a GradeRecordModel when homework is graded, so it feeds into GPA."""
    assign = await db.get(HomeworkAssignmentModel, sub.assignment_id)
    if not assign:
        return

    lesson = await db.get(LessonModel, assign.lesson_id)
    subject_id = lesson.subject_id if lesson else None

    # Check for existing grade record for this homework
    existing = (await db.execute(
        select(GradeRecordModel).where(
            GradeRecordModel.student_id == sub.student_id,
            GradeRecordModel.lesson_id == assign.lesson_id,
            GradeRecordModel.type == "homework",
        )
    )).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if existing:
        existing.score = sub.score
        existing.max_score = assign.max_score
        existing.graded_by = graded_by
        existing.graded_at = now
    else:
        db.add(GradeRecordModel(
            id=uuid4(),
            student_id=sub.student_id,
            subject_id=subject_id,
            lesson_id=assign.lesson_id,
            type="homework",
            score=sub.score,
            max_score=assign.max_score,
            graded_by=graded_by,
            graded_at=now,
        ))

    # Recalculate GPA
    avg = (await db.execute(
        select(func.avg(GradeRecordModel.score / GradeRecordModel.max_score * 10))
        .where(GradeRecordModel.student_id == sub.student_id)
    )).scalar()
    if avg is not None:
        await db.execute(
            update(StudentModel).where(StudentModel.id == sub.student_id)
            .values(gpa=round(float(avg), 2))
        )


def _assignment_out(m: HomeworkAssignmentModel) -> AssignmentOut:
    files = []
    if m.file_urls:
        files = [FileInfo(url=f["url"], filename=f["filename"], key=f.get("key")) for f in m.file_urls]
    return AssignmentOut(
        id=m.id, lesson_id=m.lesson_id, title=m.title, description=m.description,
        due_date=m.due_date.isoformat() if m.due_date else "",
        max_score=float(m.max_score) if m.max_score else 10.0,
        file_urls=files,
    )


# ── Assignments (teacher creates) ─────────────────────────────────────────────

@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    body: AssignmentIn,
    _: TeacherGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> AssignmentOut:
    try:
        due = datetime.fromisoformat(body.due_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid due_date format (use ISO 8601)")

    files_data = [f.model_dump() for f in body.file_urls] if body.file_urls else None

    m = HomeworkAssignmentModel(
        id=uuid4(),
        lesson_id=body.lesson_id,
        title=body.title,
        description=body.description,
        due_date=due,
        max_score=body.max_score,
        file_urls=files_data,
        created_by=current_user.id,
    )
    db.add(m)

    # Auto-create pending submissions for all students enrolled in the lesson's group
    lesson = await db.get(LessonModel, body.lesson_id)
    if lesson:
        from src.infrastructure.persistence.models.lms import EnrollmentModel
        enrolled = (await db.execute(
            select(EnrollmentModel.student_id).where(
                EnrollmentModel.group_id == lesson.group_id,
                EnrollmentModel.is_active == True,  # noqa: E712
            )
        )).scalars().all()
        for sid in enrolled:
            db.add(HomeworkSubmissionModel(
                id=uuid4(),
                assignment_id=m.id,
                student_id=sid,
                status="pending",
            ))

    await db.commit()

    return _assignment_out(m)


@router.get("/assignments", response_model=list[AssignmentOut])
async def list_assignments_by_lesson(
    current_user: CurrentUser, db: DbSession,
    lesson_id: UUID | None = None,
) -> list[AssignmentOut]:
    q = select(HomeworkAssignmentModel)
    if lesson_id:
        q = q.where(HomeworkAssignmentModel.lesson_id == lesson_id)
    rows = (await db.execute(q.order_by(HomeworkAssignmentModel.due_date))).scalars().all()
    return [_assignment_out(m) for m in rows]


@router.get("/assignments/{assignment_id}", response_model=AssignmentOut)
async def get_assignment(assignment_id: UUID, current_user: CurrentUser, db: DbSession) -> AssignmentOut:
    m = await db.get(HomeworkAssignmentModel, assignment_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return _assignment_out(m)


# ── Submissions list (paginated, for teacher review page) ───────────────────

@router.get("/submissions")
async def list_all_submissions(
    _: TeacherGuard, db: DbSession,
    status_filter: str | None = Query(None, alias="status"),
    teacher_id: str | None = Query(None, alias="teacherId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> dict:
    q = select(HomeworkSubmissionModel)

    # Filter by teacher's lessons
    if teacher_id:
        lesson_ids = (await db.execute(
            select(LessonModel.id).where(LessonModel.teacher_id == teacher_id)
        )).scalars().all()
        if lesson_ids:
            assign_ids = (await db.execute(
                select(HomeworkAssignmentModel.id).where(HomeworkAssignmentModel.lesson_id.in_(lesson_ids))
            )).scalars().all()
            q = q.where(HomeworkSubmissionModel.assignment_id.in_(assign_ids))
        else:
            return {"data": [], "total": 0, "page": page}

    if status_filter:
        q = q.where(HomeworkSubmissionModel.status == status_filter)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    rows = (await db.execute(
        q.order_by(HomeworkSubmissionModel.submitted_at.desc().nullslast())
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    data = [await _submission_out(r, db) for r in rows]
    return {"data": data, "total": total, "page": page}


# ── Submissions (student submits) ─────────────────────────────────────────────

@router.post("/assignments/{assignment_id}/submit", response_model=SubmissionOut)
async def submit_homework(
    assignment_id: UUID,
    body: SubmitHomeworkRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SubmissionOut:
    assignment = await db.get(HomeworkAssignmentModel, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    student = (await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=403, detail="Only students can submit homework")

    now = datetime.now(timezone.utc)
    is_overdue = assignment.due_date and now > assignment.due_date

    existing = (await db.execute(
        select(HomeworkSubmissionModel).where(
            HomeworkSubmissionModel.assignment_id == assignment_id,
            HomeworkSubmissionModel.student_id == student.id,
        )
    )).scalar_one_or_none()

    if existing:
        existing.answer_text = body.answer_text
        existing.file_url = body.file_url
        existing.submitted_at = now
        existing.status = "submitted"
        sub = existing
    else:
        sub = HomeworkSubmissionModel(
            id=uuid4(),
            assignment_id=assignment_id,
            student_id=student.id,
            status="submitted",
            submitted_at=now,
            answer_text=body.answer_text,
            file_url=body.file_url,
        )
        db.add(sub)

    await db.commit()
    return await _submission_out(sub, db)


# ── Grading (teacher grades) ────────────────────────────────────────────────

@router.post("/submissions/{submission_id}/grade", response_model=SubmissionOut)
async def grade_submission(
    submission_id: UUID,
    body: GradeHomeworkRequest,
    _: TeacherGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> SubmissionOut:
    sub = await db.get(HomeworkSubmissionModel, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    assignment = await db.get(HomeworkAssignmentModel, sub.assignment_id)
    if assignment and body.score > float(assignment.max_score):
        raise HTTPException(status_code=400, detail=f"Score exceeds max_score ({assignment.max_score})")

    sub.score = body.score
    sub.feedback = body.feedback
    sub.status = "graded"
    sub.graded_by = current_user.id
    sub.graded_at = datetime.now(timezone.utc)

    # Sync to GradeRecordModel for GPA calculation
    await _sync_grade_record(sub, current_user.id, db)

    # Gamification: award stars for homework grade
    from src.infrastructure.services.gamification_engine import on_homework_graded
    max_s = float(assignment.max_score) if assignment and assignment.max_score else 10
    await on_homework_graded(sub.student_id, body.score, max_s, db)

    await db.commit()
    return await _submission_out(sub, db)


# ── Review alias (used by logbook frontend) ─────────────────────────────────

@router.post("/submissions/{submission_id}/review", response_model=SubmissionOut)
async def review_submission(
    submission_id: UUID,
    body: ReviewHomeworkRequest,
    _: TeacherGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> SubmissionOut:
    """Alias for grade — accepts { grade, feedback } from logbook frontend."""
    grade_body = GradeHomeworkRequest(score=body.grade, feedback=body.feedback)
    return await grade_submission(submission_id, grade_body, _, current_user, db)


# ── Submissions for assignment ──────────────────────────────────────────────

@router.get("/assignments/{assignment_id}/submissions", response_model=list[SubmissionOut])
async def list_submissions(
    assignment_id: UUID,
    _: TeacherGuard,
    db: DbSession,
) -> list[SubmissionOut]:
    rows = (await db.execute(
        select(HomeworkSubmissionModel).where(HomeworkSubmissionModel.assignment_id == assignment_id)
    )).scalars().all()

    return [await _submission_out(r, db) for r in rows]
