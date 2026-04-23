"""Homework assignments, submissions, and grading API."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import HomeworkAssignmentModel, HomeworkSubmissionModel

router = APIRouter(prefix="/homework", tags=["LMS - Homework"])

TeacherGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]


# ── Schemas ───────────────────────────────────────────────────────────────────

class AssignmentOut(BaseModel):
    id: UUID
    lesson_id: UUID
    title: str
    description: str | None
    due_date: str
    max_score: float


class AssignmentIn(BaseModel):
    lesson_id: UUID
    title: str
    description: str | None = None
    due_date: str
    max_score: float = 100.0


class SubmissionOut(BaseModel):
    id: UUID
    assignment_id: UUID
    student_id: UUID
    status: str
    submitted_at: str | None
    answer_text: str | None
    file_url: str | None
    score: float | None
    feedback: str | None


class SubmitHomeworkRequest(BaseModel):
    answer_text: str | None = None
    file_url: str | None = None   # S3 URL after presigned upload


class GradeHomeworkRequest(BaseModel):
    score: float
    feedback: str | None = None


# ── Assignments (teacher creates) ─────────────────────────────────────────────

@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    body: AssignmentIn,
    _: TeacherGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> AssignmentOut:
    from datetime import date
    try:
        due = datetime.fromisoformat(body.due_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid due_date format (use ISO 8601)")

    m = HomeworkAssignmentModel(
        id=uuid4(),
        lesson_id=body.lesson_id,
        title=body.title,
        description=body.description,
        due_date=due,
        max_score=body.max_score,
        created_by=current_user.id,
    )
    db.add(m)
    await db.commit()

    return AssignmentOut(
        id=m.id,
        lesson_id=m.lesson_id,
        title=m.title,
        description=m.description,
        due_date=m.due_date.isoformat() if m.due_date else "",
        max_score=float(m.max_score),
    )


@router.get("/assignments", response_model=list[AssignmentOut])
async def list_assignments_by_lesson(
    current_user: CurrentUser, db: DbSession,
    lesson_id: UUID | None = None,
) -> list[AssignmentOut]:
    q = select(HomeworkAssignmentModel)
    if lesson_id:
        q = q.where(HomeworkAssignmentModel.lesson_id == lesson_id)
    rows = (await db.execute(q.order_by(HomeworkAssignmentModel.due_date))).scalars().all()
    return [AssignmentOut(
        id=m.id, lesson_id=m.lesson_id, title=m.title, description=m.description,
        due_date=m.due_date.isoformat() if m.due_date else "", max_score=float(m.max_score),
    ) for m in rows]


@router.get("/assignments/{assignment_id}", response_model=AssignmentOut)
async def get_assignment(assignment_id: UUID, current_user: CurrentUser, db: DbSession) -> AssignmentOut:
    m = await db.get(HomeworkAssignmentModel, assignment_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return AssignmentOut(
        id=m.id,
        lesson_id=m.lesson_id,
        title=m.title,
        description=m.description,
        due_date=m.due_date.isoformat() if m.due_date else "",
        max_score=float(m.max_score),
    )


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

    # Find student record for current user
    from src.infrastructure.persistence.models.lms import StudentModel
    student_result = await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )
    student = student_result.scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=403, detail="Only students can submit homework")

    now = datetime.now(timezone.utc)
    is_overdue = assignment.due_date and now > assignment.due_date

    # Check for existing submission
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
        existing.status = "overdue" if is_overdue else "submitted"
        sub = existing
    else:
        sub = HomeworkSubmissionModel(
            id=uuid4(),
            assignment_id=assignment_id,
            student_id=student.id,
            status="overdue" if is_overdue else "submitted",
            submitted_at=now,
            answer_text=body.answer_text,
            file_url=body.file_url,
        )
        db.add(sub)

    await db.commit()

    return SubmissionOut(
        id=sub.id,
        assignment_id=sub.assignment_id,
        student_id=sub.student_id,
        status=sub.status,
        submitted_at=sub.submitted_at.isoformat() if sub.submitted_at else None,
        answer_text=sub.answer_text,
        file_url=sub.file_url,
        score=float(sub.score) if sub.score is not None else None,
        feedback=sub.feedback,
    )


# ── Grading (teacher grades) ──────────────────────────────────────────────────

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

    await db.commit()

    return SubmissionOut(
        id=sub.id,
        assignment_id=sub.assignment_id,
        student_id=sub.student_id,
        status=sub.status,
        submitted_at=sub.submitted_at.isoformat() if sub.submitted_at else None,
        answer_text=sub.answer_text,
        file_url=sub.file_url,
        score=float(sub.score) if sub.score is not None else None,
        feedback=sub.feedback,
    )


@router.get("/assignments/{assignment_id}/submissions", response_model=list[SubmissionOut])
async def list_submissions(
    assignment_id: UUID,
    _: TeacherGuard,
    db: DbSession,
) -> list[SubmissionOut]:
    rows = (await db.execute(
        select(HomeworkSubmissionModel).where(HomeworkSubmissionModel.assignment_id == assignment_id)
    )).scalars().all()

    return [SubmissionOut(
        id=r.id,
        assignment_id=r.assignment_id,
        student_id=r.student_id,
        status=r.status,
        submitted_at=r.submitted_at.isoformat() if r.submitted_at else None,
        answer_text=r.answer_text,
        file_url=r.file_url,
        score=float(r.score) if r.score is not None else None,
        feedback=r.feedback,
    ) for r in rows]
