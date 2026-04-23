"""Student Portal API — endpoints used by the student-facing frontend."""
from __future__ import annotations

from datetime import date, datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func

from src.api.dependencies import CurrentUser, DbSession
from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.lms import (
    AttendanceRecordModel,
    EnrollmentModel,
    GradeRecordModel,
    HomeworkAssignmentModel,
    HomeworkSubmissionModel,
    LessonModel,
    LessonMaterialModel,
    PaymentModel,
    StudentModel,
    GroupModel,
    SubjectModel,
)
from src.infrastructure.persistence.models.auth import UserModel
from src.infrastructure.persistence.models.gamification import (
    AchievementModel,
    StudentAchievementModel,
    StudentActivityEventModel,
)

router = APIRouter(prefix="/student", tags=["Student Portal"])


def _require_student(current_user: CurrentUser) -> None:
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access this resource")


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    student_id: UUID
    full_name: str
    student_code: str | None
    stars: int
    crystals: int
    total_coins: int
    badge_level: str
    risk_level: str
    gpa: float | None
    attendance_percent: float | None


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(current_user: CurrentUser, db: DbSession) -> DashboardResponse:
    _require_student(current_user)

    result = await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="Student profile not found")

    return DashboardResponse(
        student_id=student.id,
        full_name=current_user.name,
        student_code=student.student_code,
        stars=student.stars,
        crystals=student.crystals,
        total_coins=student.coins,
        badge_level=student.badge_level,
        risk_level=student.risk_level,
        gpa=float(student.gpa) if student.gpa is not None else None,
        attendance_percent=float(student.attendance_percent) if student.attendance_percent is not None else None,
    )


# ── My Lessons (schedule) ─────────────────────────────────────────────────────

class LessonSummary(BaseModel):
    id: UUID
    group_id: UUID
    date: str
    startTime: str
    endTime: str
    status: str
    topic: str | None
    is_online: bool


@router.get("/lessons", response_model=list[LessonSummary])
async def my_lessons(
    current_user: CurrentUser,
    db: DbSession,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[LessonSummary]:
    _require_student(current_user)

    # Get student record
    student_result = await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )
    student = student_result.scalar_one_or_none()
    if student is None:
        return []

    # Get enrolled group IDs
    enrollment_result = await db.execute(
        select(EnrollmentModel.group_id).where(
            EnrollmentModel.student_id == student.id,
            EnrollmentModel.is_active == True,  # noqa: E712
        )
    )
    group_ids = [r for r in enrollment_result.scalars().all()]
    if not group_ids:
        return []

    q = select(LessonModel).where(LessonModel.group_id.in_(group_ids))
    if date_from:
        q = q.where(LessonModel.scheduled_at >= date_from)
    if date_to:
        q = q.where(LessonModel.scheduled_at <= date_to)
    q = q.order_by(LessonModel.scheduled_at)

    lessons = (await db.execute(q)).scalars().all()

    def _build(l: LessonModel) -> LessonSummary:
        return LessonSummary(
            id=l.id,
            group_id=l.group_id,
            date=l.scheduled_at.strftime("%Y-%m-%d") if l.scheduled_at else "",
            startTime=l.scheduled_at.strftime("%H:%M") if l.scheduled_at else "",
            endTime=(l.scheduled_at + timedelta(minutes=l.duration_minutes or 60)).strftime("%H:%M") if l.scheduled_at else "",
            status=l.status,
            topic=l.topic,
            is_online=l.is_online,
        )

    return [_build(l) for l in lessons]


# ── My Homework ───────────────────────────────────────────────────────────────

class HomeworkSummary(BaseModel):
    id: UUID
    assignment_id: UUID
    title: str
    due_date: str
    status: str
    score: float | None
    feedback: str | None


@router.get("/homework", response_model=list[HomeworkSummary])
async def my_homework(
    current_user: CurrentUser,
    db: DbSession,
    status: str | None = None,
) -> list[HomeworkSummary]:
    _require_student(current_user)

    student_result = await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )
    student = student_result.scalar_one_or_none()
    if student is None:
        return []

    q = (
        select(HomeworkSubmissionModel, HomeworkAssignmentModel)
        .join(HomeworkAssignmentModel, HomeworkAssignmentModel.id == HomeworkSubmissionModel.assignment_id)
        .where(HomeworkSubmissionModel.student_id == student.id)
    )
    if status:
        q = q.where(HomeworkSubmissionModel.status == status)

    rows = (await db.execute(q)).all()
    result = []
    for sub, assign in rows:
        result.append(HomeworkSummary(
            id=sub.id,
            assignment_id=assign.id,
            title=assign.title,
            due_date=assign.due_date.isoformat() if assign.due_date else "",
            status=sub.status,
            score=float(sub.score) if sub.score is not None else None,
            feedback=sub.feedback,
        ))
    return result


# ── My Payments ───────────────────────────────────────────────────────────────

class PaymentSummary(BaseModel):
    id: UUID
    amount: float
    currency: str
    status: str
    due_date: str
    paid_at: str | None


@router.get("/payments", response_model=list[PaymentSummary])
async def my_payments(
    current_user: CurrentUser,
    db: DbSession,
) -> list[PaymentSummary]:
    _require_student(current_user)

    student_result = await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )
    student = student_result.scalar_one_or_none()
    if student is None:
        return []

    rows = (await db.execute(
        select(PaymentModel)
        .where(PaymentModel.student_id == student.id)
        .order_by(PaymentModel.due_date)
    )).scalars().all()

    return [PaymentSummary(
        id=p.id,
        amount=float(p.amount),
        currency=p.currency,
        status=p.status,
        due_date=p.due_date.isoformat() if p.due_date else "",
        paid_at=p.paid_at.isoformat() if p.paid_at else None,
    ) for p in rows]


# ── Activity Feed ─────────────────────────────────────────────────────────────

class ActivityEvent(BaseModel):
    id: UUID
    type: str
    description: str
    stars_amount: int | None
    crystals_amount: int | None
    created_at: str


@router.get("/activity", response_model=list[ActivityEvent])
async def my_activity(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> list[ActivityEvent]:
    _require_student(current_user)

    student_result = await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )
    student = student_result.scalar_one_or_none()
    if student is None:
        return []

    rows = (await db.execute(
        select(StudentActivityEventModel)
        .where(StudentActivityEventModel.student_id == student.id)
        .order_by(StudentActivityEventModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )).scalars().all()

    return [ActivityEvent(
        id=r.id,
        type=r.type,
        description=r.description,
        stars_amount=r.stars_amount,
        crystals_amount=r.crystals_amount,
        created_at=r.created_at.isoformat(),
    ) for r in rows]


# ── Achievements ──────────────────────────────────────────────────────────────

class AchievementOut(BaseModel):
    id: UUID
    name: str
    description: str | None
    category: str
    icon: str | None
    reward_stars: int
    reward_crystals: int
    unlocked_at: str | None


@router.get("/achievements", response_model=list[AchievementOut])
async def my_achievements(current_user: CurrentUser, db: DbSession) -> list[AchievementOut]:
    _require_student(current_user)

    student_result = await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )
    student = student_result.scalar_one_or_none()
    if student is None:
        return []

    rows = (await db.execute(
        select(AchievementModel, StudentAchievementModel)
        .join(StudentAchievementModel, StudentAchievementModel.achievement_id == AchievementModel.id)
        .where(StudentAchievementModel.student_id == student.id)
    )).all()

    return [AchievementOut(
        id=ach.id,
        name=ach.name,
        description=ach.description,
        category=ach.category,
        icon=ach.icon,
        reward_stars=ach.reward_stars,
        reward_crystals=ach.reward_crystals,
        unlocked_at=sa.unlocked_at.isoformat() if sa.unlocked_at else None,
    ) for ach, sa in rows]


# ── Schedule (week view) ──────────────────────────────────────────────────────

class ScheduleLesson(BaseModel):
    id: UUID
    subjectName: str
    subjectId: str | None
    teacherName: str
    startTime: str
    endTime: str
    weekDate: str
    groupNumber: str
    room: str | None
    isOnline: bool


@router.get("/schedule", response_model=list[ScheduleLesson])
async def my_schedule(
    current_user: CurrentUser,
    db: DbSession,
    weekStart: str | None = None,
) -> list[ScheduleLesson]:
    _require_student(current_user)

    student = (await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )).scalar_one_or_none()
    if student is None:
        return []

    group_ids = (await db.execute(
        select(EnrollmentModel.group_id).where(
            EnrollmentModel.student_id == student.id,
            EnrollmentModel.is_active == True,  # noqa: E712
        )
    )).scalars().all()
    if not group_ids:
        return []

    # Filter by week
    q = select(LessonModel).where(LessonModel.group_id.in_(group_ids))
    if weekStart:
        try:
            ws_date = date.fromisoformat(weekStart)
            we_date = ws_date + timedelta(days=7)
            q = q.where(LessonModel.scheduled_at >= ws_date, LessonModel.scheduled_at < we_date)
        except ValueError:
            pass
    q = q.order_by(LessonModel.scheduled_at)
    lessons = (await db.execute(q)).scalars().all()

    result = []
    for l in lessons:
        group = (await db.execute(
            select(GroupModel).where(GroupModel.id == l.group_id)
        )).scalar_one_or_none()
        subject_name = ""
        subject_id_str = None
        if l.subject_id:
            subject_id_str = str(l.subject_id)
            subj = (await db.execute(
                select(SubjectModel).where(SubjectModel.id == l.subject_id)
            )).scalar_one_or_none()
            subject_name = subj.name if subj else ""
        teacher_name = ""
        if l.teacher_id:
            u = (await db.execute(
                select(UserModel.name).where(UserModel.id == l.teacher_id)
            )).scalar()
            teacher_name = u or ""
        result.append(ScheduleLesson(
            id=l.id,
            subjectName=subject_name,
            subjectId=subject_id_str,
            teacherName=teacher_name,
            startTime=l.scheduled_at.strftime("%H:%M") if l.scheduled_at else "",
            endTime=(l.scheduled_at + timedelta(minutes=l.duration_minutes or 60)).strftime("%H:%M") if l.scheduled_at else "",
            weekDate=l.scheduled_at.strftime("%Y-%m-%d") if l.scheduled_at else "",
            groupNumber=group.name if group else "",
            room=None,
            isOnline=l.is_online,
        ))
    return result


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    studentId: UUID
    fullName: str
    photo: str | None
    points: int
    isCurrentUser: bool


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("30d"),
) -> list[LeaderboardEntry]:
    _require_student(current_user)

    student = (await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )).scalar_one_or_none()

    # Sort by stars descending
    students = (await db.execute(
        select(StudentModel).where(StudentModel.is_active == True).order_by(StudentModel.stars.desc()).limit(50)  # noqa: E712
    )).scalars().all()

    result = []
    for i, s in enumerate(students):
        result.append(LeaderboardEntry(
            rank=i + 1,
            studentId=s.id,
            fullName=s.full_name,
            photo=s.photo_url,
            points=s.stars,
            isCurrentUser=(student is not None and s.id == student.id),
        ))
    return result


# ── Assignments ───────────────────────────────────────────────────────────────

class AssignmentOut(BaseModel):
    id: UUID
    title: str
    type: str
    subjectId: str
    subjectName: str
    teacherName: str
    description: str | None
    lessonDate: str
    deadline: str
    status: str
    grade: float | None
    teacherComment: str | None
    submittedFileUrl: str | None
    materialsCount: int


@router.get("/assignments", response_model=list[AssignmentOut])
async def my_assignments(
    current_user: CurrentUser,
    db: DbSession,
    status: str | None = None,
) -> list[AssignmentOut]:
    _require_student(current_user)

    student = (await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )).scalar_one_or_none()
    if student is None:
        return []

    q = (
        select(HomeworkSubmissionModel, HomeworkAssignmentModel)
        .join(HomeworkAssignmentModel, HomeworkAssignmentModel.id == HomeworkSubmissionModel.assignment_id)
        .where(HomeworkSubmissionModel.student_id == student.id)
    )
    if status:
        q = q.where(HomeworkSubmissionModel.status == status)
    rows = (await db.execute(q)).all()

    result = []
    for sub, assign in rows:
        lesson = (await db.execute(
            select(LessonModel).where(LessonModel.id == assign.lesson_id)
        )).scalar_one_or_none()
        subject_name = ""
        subject_id = ""
        teacher_name = ""
        lesson_date = ""
        if lesson:
            lesson_date = lesson.scheduled_at.isoformat() if lesson.scheduled_at else ""
            if lesson.teacher_id:
                u = (await db.execute(select(UserModel.name).where(UserModel.id == lesson.teacher_id))).scalar()
                teacher_name = u or ""
            if lesson.subject_id:
                subject_id = str(lesson.subject_id)
                subj = (await db.execute(select(SubjectModel).where(SubjectModel.id == lesson.subject_id))).scalar_one_or_none()
                subject_name = subj.name if subj else ""
        result.append(AssignmentOut(
            id=sub.id,
            title=assign.title,
            type=assign.type,
            subjectId=subject_id,
            subjectName=subject_name,
            teacherName=teacher_name,
            description=assign.description,
            lessonDate=lesson_date,
            deadline=assign.due_date.isoformat() if assign.due_date else "",
            status=sub.status,
            grade=float(sub.score) if sub.score is not None else None,
            teacherComment=sub.feedback,
            submittedFileUrl=sub.file_url,
            materialsCount=0,
        ))
    return result


class SubmitAssignmentRequest(BaseModel):
    fileUrl: str | None = None
    text: str | None = None


@router.post("/assignments/{assignment_id}/submit", response_model=AssignmentOut)
async def submit_assignment(
    assignment_id: UUID,
    body: SubmitAssignmentRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AssignmentOut:
    _require_student(current_user)

    student = (await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="Student profile not found")

    sub = (await db.execute(
        select(HomeworkSubmissionModel).where(
            HomeworkSubmissionModel.id == assignment_id,
            HomeworkSubmissionModel.student_id == student.id,
        )
    )).scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=404, detail="Assignment submission not found")

    sub.status = "submitted"
    sub.submitted_at = datetime.now(timezone.utc)
    if body.fileUrl:
        sub.file_url = body.fileUrl
    await db.commit()
    await db.refresh(sub)

    assign = (await db.execute(
        select(HomeworkAssignmentModel).where(HomeworkAssignmentModel.id == sub.assignment_id)
    )).scalar_one_or_none()
    return AssignmentOut(
        id=sub.id,
        title=assign.title if assign else "",
        type=assign.type if assign else "homework",
        subjectId="",
        subjectName="",
        teacherName="",
        description=assign.description if assign else None,
        lessonDate="",
        deadline=assign.due_date.isoformat() if assign and assign.due_date else "",
        status=sub.status,
        grade=float(sub.score) if sub.score is not None else None,
        teacherComment=sub.feedback,
        submittedFileUrl=sub.file_url,
        materialsCount=0 if assign else 0,
    )


# ── Subjects ──────────────────────────────────────────────────────────────────

class SubjectOut(BaseModel):
    id: UUID
    name: str
    teacherName: str
    currentAvgGrade: float


@router.get("/subjects", response_model=list[SubjectOut])
async def my_subjects(current_user: CurrentUser, db: DbSession) -> list[SubjectOut]:
    _require_student(current_user)

    student = (await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )).scalar_one_or_none()
    if student is None:
        return []

    group_ids = (await db.execute(
        select(EnrollmentModel.group_id).where(
            EnrollmentModel.student_id == student.id,
            EnrollmentModel.is_active == True,  # noqa: E712
        )
    )).scalars().all()

    result = []
    for gid in group_ids:
        group = (await db.execute(select(GroupModel).where(GroupModel.id == gid))).scalar_one_or_none()
        # Find subject through lessons of this group
        lesson_subj_id = (await db.execute(
            select(LessonModel.subject_id).where(LessonModel.group_id == gid, LessonModel.subject_id != None).limit(1)  # noqa: E711
        )).scalar()
        if not lesson_subj_id:
            continue
        subj = (await db.execute(select(SubjectModel).where(SubjectModel.id == lesson_subj_id))).scalar_one_or_none()
        if not subj:
            continue
        teacher_name = ""
        if subj.teacher_id:
            u = (await db.execute(select(UserModel.name).where(UserModel.id == subj.teacher_id))).scalar()
            teacher_name = u or ""
        # Average grade for this subject
        lesson_ids = (await db.execute(
            select(LessonModel.id).where(LessonModel.group_id == gid)
        )).scalars().all()
        avg_grade = 0.0
        if lesson_ids:
            avg = (await db.execute(
                select(func.avg(GradeRecordModel.score)).where(
                    GradeRecordModel.student_id == student.id,
                    GradeRecordModel.lesson_id.in_(lesson_ids),
                )
            )).scalar()
            avg_grade = round(float(avg), 2) if avg else 0.0
        result.append(SubjectOut(
            id=subj.id,
            name=subj.name,
            teacherName=teacher_name,
            currentAvgGrade=avg_grade,
        ))
    return result


# ── Performance per subject ───────────────────────────────────────────────────

class GradeEntry(BaseModel):
    id: UUID
    date: str
    subjectId: str
    type: str
    value: float


class AttendanceEntry(BaseModel):
    date: str
    subjectId: str
    status: str


class SubjectPerformance(BaseModel):
    subject: SubjectOut
    level: str
    levelDescription: str
    pendingTasks: int
    overdueTasks: int
    attendance: dict
    grades: list[GradeEntry]
    attendanceCalendar: list[AttendanceEntry]


@router.get("/performance/{subject_id}", response_model=SubjectPerformance)
async def subject_performance(subject_id: UUID, current_user: CurrentUser, db: DbSession) -> SubjectPerformance:
    _require_student(current_user)

    student = (await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="Student profile not found")

    subj = (await db.execute(select(SubjectModel).where(SubjectModel.id == subject_id))).scalar_one_or_none()
    if subj is None:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Find group for this subject
    group_ids = (await db.execute(
        select(EnrollmentModel.group_id).where(
            EnrollmentModel.student_id == student.id,
            EnrollmentModel.is_active == True,  # noqa: E712
        )
    )).scalars().all()

    subject_group = None
    for gid in group_ids:
        g = (await db.execute(select(GroupModel).where(GroupModel.id == gid, GroupModel.subject_id == subject_id))).scalar_one_or_none()
        if g:
            subject_group = g
            break

    teacher_name = ""
    if subj.teacher_id:
        u = (await db.execute(select(UserModel.name).where(UserModel.id == subj.teacher_id))).scalar()
        teacher_name = u or ""

    lesson_ids: list = []
    if subject_group:
        lesson_ids = (await db.execute(select(LessonModel.id).where(LessonModel.group_id == subject_group.id))).scalars().all()

    # Grades
    grade_rows = (await db.execute(
        select(GradeRecordModel).where(
            GradeRecordModel.student_id == student.id,
            GradeRecordModel.lesson_id.in_(lesson_ids),
        ).order_by(GradeRecordModel.graded_at)
    )).scalars().all() if lesson_ids else []

    avg_grade = round(sum(float(g.score) for g in grade_rows) / len(grade_rows), 2) if grade_rows else 0.0

    # Attendance
    att_rows = (await db.execute(
        select(AttendanceRecordModel).where(
            AttendanceRecordModel.student_id == student.id,
            AttendanceRecordModel.lesson_id.in_(lesson_ids),
        )
    )).scalars().all() if lesson_ids else []

    total_att = len(att_rows)
    present = sum(1 for a in att_rows if a.status == "present")
    absent = sum(1 for a in att_rows if a.status == "absent")
    late = sum(1 for a in att_rows if a.status == "late")

    # Level
    if avg_grade >= 9:
        level, desc = "high", "Отличный прогресс"
    elif avg_grade >= 6:
        level, desc = "medium", "Хороший прогресс"
    else:
        level, desc = "low", "Нужна дополнительная работа"

    # Pending/overdue homework
    pending_q = select(func.count()).where(
        HomeworkSubmissionModel.student_id == student.id,
        HomeworkSubmissionModel.status == "pending",
    )
    overdue_q = select(func.count()).where(
        HomeworkSubmissionModel.student_id == student.id,
        HomeworkSubmissionModel.status == "overdue",
    )
    pending = (await db.execute(pending_q)).scalar() or 0
    overdue = (await db.execute(overdue_q)).scalar() or 0

    subject_out = SubjectOut(id=subj.id, name=subj.name, teacherName=teacher_name, currentAvgGrade=avg_grade)

    return SubjectPerformance(
        subject=subject_out,
        level=level,
        levelDescription=desc,
        pendingTasks=pending,
        overdueTasks=overdue,
        attendance={
            "presentPercent": round(present / total_att * 100, 1) if total_att else 0.0,
            "absentPercent": round(absent / total_att * 100, 1) if total_att else 0.0,
            "latePercent": round(late / total_att * 100, 1) if total_att else 0.0,
        },
        grades=[GradeEntry(
            id=g.id,
            date=g.graded_at.date().isoformat(),
            subjectId=str(subject_id),
            type=g.type,
            value=float(g.score),
        ) for g in grade_rows],
        attendanceCalendar=[AttendanceEntry(
            date=a.created_at.date().isoformat() if a.created_at else "",
            subjectId=str(subject_id),
            status=a.status,
        ) for a in att_rows],
    )


# ── Materials ─────────────────────────────────────────────────────────────────

class MaterialOut(BaseModel):
    id: UUID
    title: str
    type: str
    language: str
    url: str
    subjectId: str | None
    uploadedAt: str


@router.get("/materials", response_model=list[MaterialOut])
async def my_materials(
    current_user: CurrentUser,
    db: DbSession,
    subjectId: str | None = None,
    language: str | None = None,
) -> list[MaterialOut]:
    _require_student(current_user)

    student = (await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )).scalar_one_or_none()
    if student is None:
        return []

    group_ids = (await db.execute(
        select(EnrollmentModel.group_id).where(
            EnrollmentModel.student_id == student.id,
            EnrollmentModel.is_active == True,  # noqa: E712
        )
    )).scalars().all()

    lesson_ids = (await db.execute(
        select(LessonModel.id).where(LessonModel.group_id.in_(group_ids))
    )).scalars().all() if group_ids else []

    if not lesson_ids:
        return []

    q = select(LessonMaterialModel).where(LessonMaterialModel.lesson_id.in_(lesson_ids))
    if language:
        q = q.where(LessonMaterialModel.language == language)
    rows = (await db.execute(q.order_by(LessonMaterialModel.uploaded_at.desc()))).scalars().all()

    # Build subject map per lesson
    lesson_subject: dict = {}
    for lid in lesson_ids:
        lesson = (await db.execute(select(LessonModel).where(LessonModel.id == lid))).scalar_one_or_none()
        if lesson:
            lesson_subject[str(lid)] = str(lesson.subject_id) if lesson.subject_id else None

    result = []
    for m in rows:
        sid = lesson_subject.get(str(m.lesson_id))
        if subjectId and sid != subjectId:
            continue
        result.append(MaterialOut(
            id=m.id,
            title=m.title,
            type=m.type,
            language=m.language,
            url=m.url,
            subjectId=sid,
            uploadedAt=m.uploaded_at.isoformat(),
        ))
    return result


# ── Contacts ─────────────────────────────────────────────────────────────────

class ContactOut(BaseModel):
    id: UUID
    fullName: str
    role: str
    subject: str | None
    photo: str | None
    email: str
    phone: str | None
    telegram: str | None


@router.get("/contacts", response_model=list[ContactOut])
async def my_contacts(current_user: CurrentUser, db: DbSession) -> list[ContactOut]:
    _require_student(current_user)

    student = (await db.execute(
        select(StudentModel).where(StudentModel.user_id == current_user.id)
    )).scalar_one_or_none()
    if student is None:
        return []

    group_ids = (await db.execute(
        select(EnrollmentModel.group_id).where(
            EnrollmentModel.student_id == student.id,
            EnrollmentModel.is_active == True,  # noqa: E712
        )
    )).scalars().all()

    result = []
    seen_ids: set = set()
    for gid in group_ids:
        group = (await db.execute(select(GroupModel).where(GroupModel.id == gid))).scalar_one_or_none()
        # Find subject through lessons of this group
        lesson_subj_id = (await db.execute(
            select(LessonModel.subject_id).where(LessonModel.group_id == gid, LessonModel.subject_id != None).limit(1)  # noqa: E711
        )).scalar()
        if not lesson_subj_id:
            continue
        subj = (await db.execute(select(SubjectModel).where(SubjectModel.id == lesson_subj_id))).scalar_one_or_none()
        if not subj or not subj.teacher_id:
            continue
        if subj.teacher_id in seen_ids:
            continue
        seen_ids.add(subj.teacher_id)
        teacher = (await db.execute(select(UserModel).where(UserModel.id == subj.teacher_id))).scalar_one_or_none()
        if not teacher:
            continue
        result.append(ContactOut(
            id=teacher.id,
            fullName=teacher.name,
            role="teacher",
            subject=subj.name,
            photo=None,
            email=teacher.email,
            phone=None,
            telegram=None,
        ))
    return result
