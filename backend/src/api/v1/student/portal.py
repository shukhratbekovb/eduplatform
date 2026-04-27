"""Student Portal API — endpoints used by the student-facing frontend."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import func, select

from src.api.dependencies import CurrentUser, DbSession
from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.auth import UserModel
from src.infrastructure.persistence.models.crm import ContractModel
from src.infrastructure.persistence.models.gamification import (
    AchievementModel,
    StudentAchievementModel,
    StudentActivityEventModel,
)
from src.infrastructure.persistence.models.lms import (
    AttendanceRecordModel,
    DirectionModel,
    EnrollmentModel,
    GradeRecordModel,
    GroupModel,
    HomeworkAssignmentModel,
    HomeworkSubmissionModel,
    LessonMaterialModel,
    LessonModel,
    PaymentModel,
    StudentModel,
    SubjectModel,
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
    pending_assignments: int = 0
    on_time_assignments: int = 0
    total_assignments: int = 0
    overdue_assignments: int = 0
    attendance30d: dict | None = None
    recent_grades: list[dict] = []


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(current_user: CurrentUser, db: DbSession) -> DashboardResponse:
    _require_student(current_user)

    result = await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    student = result.scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Assignments stats
    subs = (
        (await db.execute(select(HomeworkSubmissionModel).where(HomeworkSubmissionModel.student_id == student.id)))
        .scalars()
        .all()
    )
    total_assignments = len(subs)
    pending_assignments = sum(1 for s in subs if s.status == "pending")
    overdue_assignments = sum(1 for s in subs if s.status == "overdue")
    on_time = sum(1 for s in subs if s.status in ("submitted", "graded"))

    # Attendance breakdown
    att_rows = (
        (await db.execute(select(AttendanceRecordModel).where(AttendanceRecordModel.student_id == student.id)))
        .scalars()
        .all()
    )
    total_att = len(att_rows)
    present = sum(1 for a in att_rows if a.status == "present")
    absent = sum(1 for a in att_rows if a.status == "absent")
    late = sum(1 for a in att_rows if a.status == "late")
    att30d = {
        "presentPercent": round(present / total_att * 100, 1) if total_att else 0.0,
        "absentPercent": round(absent / total_att * 100, 1) if total_att else 0.0,
        "latePercent": round(late / total_att * 100, 1) if total_att else 0.0,
    }

    # Recent grades (last 10)
    grade_rows = (
        (
            await db.execute(
                select(GradeRecordModel)
                .where(GradeRecordModel.student_id == student.id)
                .order_by(GradeRecordModel.graded_at.desc())
                .limit(10)
            )
        )
        .scalars()
        .all()
    )
    # Resolve subject names and lesson topics for grades
    subject_name_cache: dict = {}
    lesson_topic_cache: dict = {}
    recent_grades = []
    for g in grade_rows:
        subj_name = ""
        if g.subject_id:
            sid = str(g.subject_id)
            if sid not in subject_name_cache:
                sn = (await db.execute(select(SubjectModel.name).where(SubjectModel.id == g.subject_id))).scalar()
                subject_name_cache[sid] = sn or ""
            subj_name = subject_name_cache[sid]

        lesson_topic = ""
        if g.lesson_id:
            lid = str(g.lesson_id)
            if lid not in lesson_topic_cache:
                lesson = (await db.execute(select(LessonModel.topic).where(LessonModel.id == g.lesson_id))).scalar()
                lesson_topic_cache[lid] = lesson or ""
            lesson_topic = lesson_topic_cache[lid]

        recent_grades.append(
            {
                "id": str(g.id),
                "date": g.graded_at.date().isoformat() if g.graded_at else "",
                "type": g.type,
                "value": float(g.score),
                "subjectId": str(g.subject_id) if g.subject_id else "",
                "subjectName": subj_name,
                "lessonTopic": lesson_topic,
            }
        )

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
        pending_assignments=pending_assignments,
        on_time_assignments=on_time,
        total_assignments=total_assignments,
        overdue_assignments=overdue_assignments,
        attendance30d=att30d,
        recent_grades=recent_grades,
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
    student_result = await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
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
            endTime=(l.scheduled_at + timedelta(minutes=l.duration_minutes or 60)).strftime("%H:%M")
            if l.scheduled_at
            else "",
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

    student_result = await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
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
        result.append(
            HomeworkSummary(
                id=sub.id,
                assignment_id=assign.id,
                title=assign.title,
                due_date=assign.due_date.isoformat() if assign.due_date else "",
                status=sub.status,
                score=float(sub.score) if sub.score is not None else None,
                feedback=sub.feedback,
            )
        )
    return result


# ── My Payments ───────────────────────────────────────────────────────────────


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PaymentSummary(CamelModel):
    id: UUID
    amount: float
    paid_amount: float = 0
    currency: str
    status: str
    due_date: str
    paid_at: str | None
    description: str | None = None
    method: str | None = None
    period_number: int | None = None
    contract_number: str | None = None
    direction_name: str | None = None


class ContractPaymentInfo(CamelModel):
    contract_id: UUID
    contract_number: str | None = None
    direction_name: str | None = None
    payment_type: str
    payment_amount: float
    total_expected: float
    total_paid: float
    remaining: float
    total_periods: int
    paid_periods: int
    overdue_periods: int
    status: str  # "ok", "has_debt", "overdue"
    payments: list[PaymentSummary]


class StudentFinanceDashboard(CamelModel):
    total_debt: float
    total_paid: float
    overdue_count: int
    upcoming_payment: PaymentSummary | None = None
    contracts: list[ContractPaymentInfo]


@router.get("/payments", response_model=list[PaymentSummary])
async def my_payments(
    current_user: CurrentUser,
    db: DbSession,
) -> list[PaymentSummary]:
    _require_student(current_user)

    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()
    if student is None:
        return []

    # Auto-mark overdue
    from sqlalchemy import update as sa_update

    today = date.today()
    await db.execute(
        sa_update(PaymentModel)
        .where(PaymentModel.student_id == student.id, PaymentModel.status == "pending", PaymentModel.due_date < today)
        .values(status="overdue")
    )

    rows = (
        (
            await db.execute(
                select(PaymentModel).where(PaymentModel.student_id == student.id).order_by(PaymentModel.due_date)
            )
        )
        .scalars()
        .all()
    )

    # Build contract lookup
    contract_ids = {p.contract_id for p in rows if p.contract_id}
    contract_map: dict = {}
    dir_map: dict = {}
    if contract_ids:
        contracts = (await db.execute(select(ContractModel).where(ContractModel.id.in_(contract_ids)))).scalars().all()
        contract_map = {c.id: c for c in contracts}
        d_ids = {c.direction_id for c in contracts if c.direction_id}
        if d_ids:
            dirs = (await db.execute(select(DirectionModel).where(DirectionModel.id.in_(d_ids)))).scalars().all()
            dir_map = {d.id: d.name for d in dirs}

    result = []
    for p in rows:
        cn = None
        dn = None
        c = contract_map.get(p.contract_id)
        if c:
            cn = c.contract_number
            dn = dir_map.get(c.direction_id)
        result.append(
            PaymentSummary(
                id=p.id,
                amount=float(p.amount),
                paid_amount=float(p.paid_amount or 0),
                currency=p.currency,
                status=p.status,
                due_date=p.due_date.isoformat() if p.due_date else "",
                paid_at=p.paid_at.isoformat() if p.paid_at else None,
                description=p.description,
                method=p.method,
                period_number=p.period_number,
                contract_number=cn,
                direction_name=dn,
            )
        )
    return result


@router.get("/finance", response_model=StudentFinanceDashboard)
async def my_finance(
    current_user: CurrentUser,
    db: DbSession,
) -> StudentFinanceDashboard:
    _require_student(current_user)

    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Auto-mark overdue
    from sqlalchemy import update as sa_update

    today = date.today()
    await db.execute(
        sa_update(PaymentModel)
        .where(PaymentModel.student_id == student.id, PaymentModel.status == "pending", PaymentModel.due_date < today)
        .values(status="overdue")
    )

    contracts = (
        (
            await db.execute(
                select(ContractModel)
                .where(ContractModel.student_id == student.id)
                .order_by(ContractModel.created_at.desc())
            )
        )
        .scalars()
        .all()
    )

    dir_ids = {c.direction_id for c in contracts if c.direction_id}
    dir_map: dict = {}
    if dir_ids:
        dirs = (await db.execute(select(DirectionModel).where(DirectionModel.id.in_(dir_ids)))).scalars().all()
        dir_map = {d.id: d.name for d in dirs}

    total_debt = 0.0
    total_paid = 0.0
    overdue_count = 0
    upcoming_payment = None
    contract_infos = []

    for c in contracts:
        payments = (
            (
                await db.execute(
                    select(PaymentModel).where(PaymentModel.contract_id == c.id).order_by(PaymentModel.period_number)
                )
            )
            .scalars()
            .all()
        )

        c_expected = sum(float(p.amount) for p in payments)
        c_paid = sum(float(p.paid_amount or 0) for p in payments)
        c_paid_periods = sum(1 for p in payments if p.status == "paid")
        c_overdue = sum(1 for p in payments if p.status == "overdue")

        dn = dir_map.get(c.direction_id)

        payment_summaries = []
        for p in payments:
            ps = PaymentSummary(
                id=p.id,
                amount=float(p.amount),
                paid_amount=float(p.paid_amount or 0),
                currency=p.currency,
                status=p.status,
                due_date=p.due_date.isoformat() if p.due_date else "",
                paid_at=p.paid_at.isoformat() if p.paid_at else None,
                description=p.description,
                method=p.method,
                period_number=p.period_number,
                contract_number=c.contract_number,
                direction_name=dn,
            )
            payment_summaries.append(ps)
            if upcoming_payment is None and p.status in ("pending", "overdue"):
                upcoming_payment = ps

        bal_status = "ok"
        if c_overdue > 0:
            bal_status = "overdue"
        elif c_paid < c_expected:
            bal_status = "has_debt"

        contract_infos.append(
            ContractPaymentInfo(
                contract_id=c.id,
                contract_number=c.contract_number,
                direction_name=dn,
                payment_type=c.payment_type,
                payment_amount=float(c.payment_amount or 0),
                total_expected=c_expected,
                total_paid=c_paid,
                remaining=c_expected - c_paid,
                total_periods=len(payments),
                paid_periods=c_paid_periods,
                overdue_periods=c_overdue,
                status=bal_status,
                payments=payment_summaries,
            )
        )

        total_debt += c_expected - c_paid
        total_paid += c_paid
        overdue_count += c_overdue

    return StudentFinanceDashboard(
        total_debt=total_debt,
        total_paid=total_paid,
        overdue_count=overdue_count,
        upcoming_payment=upcoming_payment,
        contracts=contract_infos,
    )


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

    student_result = await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    student = student_result.scalar_one_or_none()
    if student is None:
        return []

    rows = (
        (
            await db.execute(
                select(StudentActivityEventModel)
                .where(StudentActivityEventModel.student_id == student.id)
                .order_by(StudentActivityEventModel.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .scalars()
        .all()
    )

    return [
        ActivityEvent(
            id=r.id,
            type=r.type,
            description=r.description,
            stars_amount=r.stars_amount,
            crystals_amount=r.crystals_amount,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


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

    student_result = await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    student = student_result.scalar_one_or_none()
    if student is None:
        return []

    rows = (
        await db.execute(
            select(AchievementModel, StudentAchievementModel)
            .join(StudentAchievementModel, StudentAchievementModel.achievement_id == AchievementModel.id)
            .where(StudentAchievementModel.student_id == student.id)
        )
    ).all()

    return [
        AchievementOut(
            id=ach.id,
            name=ach.name,
            description=ach.description,
            category=ach.category,
            icon=ach.icon,
            reward_stars=ach.reward_stars,
            reward_crystals=ach.reward_crystals,
            unlocked_at=sa.unlocked_at.isoformat() if sa.unlocked_at else None,
        )
        for ach, sa in rows
    ]


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

    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()
    if student is None:
        return []

    group_ids = (
        (
            await db.execute(
                select(EnrollmentModel.group_id).where(
                    EnrollmentModel.student_id == student.id,
                    EnrollmentModel.is_active == True,  # noqa: E712
                )
            )
        )
        .scalars()
        .all()
    )
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
        group = (await db.execute(select(GroupModel).where(GroupModel.id == l.group_id))).scalar_one_or_none()
        subject_name = ""
        subject_id_str = None
        if l.subject_id:
            subject_id_str = str(l.subject_id)
            subj = (await db.execute(select(SubjectModel).where(SubjectModel.id == l.subject_id))).scalar_one_or_none()
            subject_name = subj.name if subj else ""
        teacher_name = ""
        if l.teacher_id:
            u = (await db.execute(select(UserModel.name).where(UserModel.id == l.teacher_id))).scalar()
            teacher_name = u or ""
        result.append(
            ScheduleLesson(
                id=l.id,
                subjectName=subject_name,
                subjectId=subject_id_str,
                teacherName=teacher_name,
                startTime=l.scheduled_at.strftime("%H:%M") if l.scheduled_at else "",
                endTime=(l.scheduled_at + timedelta(minutes=l.duration_minutes or 60)).strftime("%H:%M")
                if l.scheduled_at
                else "",
                weekDate=l.scheduled_at.strftime("%Y-%m-%d") if l.scheduled_at else "",
                groupNumber=group.name if group else "",
                room=None,
                isOnline=l.is_online,
            )
        )
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

    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()

    # Sort by stars descending
    students = (
        (
            await db.execute(
                select(StudentModel).where(StudentModel.is_active == True).order_by(StudentModel.stars.desc()).limit(50)  # noqa: E712
            )
        )
        .scalars()
        .all()
    )

    result = []
    for i, s in enumerate(students):
        result.append(
            LeaderboardEntry(
                rank=i + 1,
                studentId=s.id,
                fullName=s.full_name,
                photo=s.photo_url,
                points=s.stars,
                isCurrentUser=(student is not None and s.id == student.id),
            )
        )
    return result


# ── Assignments ───────────────────────────────────────────────────────────────


class AssignmentFileInfo(BaseModel):
    url: str
    filename: str
    key: str | None = None


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
    submittedText: str | None = None
    assignmentFiles: list[AssignmentFileInfo] = []
    materialsCount: int


@router.get("/assignments", response_model=list[AssignmentOut])
async def my_assignments(
    current_user: CurrentUser,
    db: DbSession,
    status: str | None = None,
) -> list[AssignmentOut]:
    _require_student(current_user)

    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()
    if student is None:
        return []

    # Auto-mark overdue: pending submissions past due_date
    now = datetime.now(UTC)
    overdue_subs = (
        (
            await db.execute(
                select(HomeworkSubmissionModel)
                .join(HomeworkAssignmentModel, HomeworkAssignmentModel.id == HomeworkSubmissionModel.assignment_id)
                .where(
                    HomeworkSubmissionModel.student_id == student.id,
                    HomeworkSubmissionModel.status == "pending",
                    HomeworkAssignmentModel.due_date < now,
                )
            )
        )
        .scalars()
        .all()
    )
    for s in overdue_subs:
        s.status = "overdue"
    if overdue_subs:
        await db.flush()

    q = (
        select(HomeworkSubmissionModel, HomeworkAssignmentModel)
        .join(HomeworkAssignmentModel, HomeworkAssignmentModel.id == HomeworkSubmissionModel.assignment_id)
        .where(HomeworkSubmissionModel.student_id == student.id)
    )
    if status:
        # Frontend uses "reviewed" but backend stores "graded"
        db_status = "graded" if status == "reviewed" else status
        q = q.where(HomeworkSubmissionModel.status == db_status)
    rows = (await db.execute(q)).all()

    result = []
    for sub, assign in rows:
        lesson = (await db.execute(select(LessonModel).where(LessonModel.id == assign.lesson_id))).scalar_one_or_none()
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
                subj = (
                    await db.execute(select(SubjectModel).where(SubjectModel.id == lesson.subject_id))
                ).scalar_one_or_none()
                subject_name = subj.name if subj else ""
        # Map "graded" → "reviewed" for frontend compatibility
        display_status = "reviewed" if sub.status == "graded" else sub.status
        # Parse assignment files
        a_files = []
        if assign.file_urls:
            a_files = [
                AssignmentFileInfo(url=f["url"], filename=f["filename"], key=f.get("key")) for f in assign.file_urls
            ]

        result.append(
            AssignmentOut(
                id=sub.id,
                title=assign.title,
                type="homework",
                subjectId=subject_id,
                subjectName=subject_name,
                teacherName=teacher_name,
                description=assign.description,
                lessonDate=lesson_date,
                deadline=assign.due_date.isoformat() if assign.due_date else "",
                status=display_status,
                grade=float(sub.score) if sub.score is not None else None,
                teacherComment=sub.feedback,
                submittedFileUrl=sub.file_url,
                submittedText=sub.answer_text,
                assignmentFiles=a_files,
                materialsCount=len(a_files),
            )
        )
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

    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Frontend sends submission.id — try by sub.id first, then by assignment_id
    from sqlalchemy import or_

    sub = (
        await db.execute(
            select(HomeworkSubmissionModel).where(
                or_(
                    HomeworkSubmissionModel.id == assignment_id,
                    HomeworkSubmissionModel.assignment_id == assignment_id,
                ),
                HomeworkSubmissionModel.student_id == student.id,
            )
        )
    ).scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=404, detail="Assignment submission not found")

    assign = (
        await db.execute(select(HomeworkAssignmentModel).where(HomeworkAssignmentModel.id == sub.assignment_id))
    ).scalar_one_or_none()

    now = datetime.now(UTC)
    is_overdue = assign and assign.due_date and now > assign.due_date

    # Always mark as submitted — teacher will see it was late by comparing dates
    sub.status = "submitted"
    sub.submitted_at = now
    if body.fileUrl:
        sub.file_url = body.fileUrl
    if body.text:
        sub.answer_text = body.text

    # Gamification: reward for on-time submission
    if not is_overdue:
        from src.infrastructure.services.gamification_engine import on_homework_submitted

        await on_homework_submitted(student.id, on_time=True, db=db)

    await db.commit()
    await db.refresh(sub)

    a_files = []
    if assign and assign.file_urls:
        a_files = [AssignmentFileInfo(url=f["url"], filename=f["filename"], key=f.get("key")) for f in assign.file_urls]

    return AssignmentOut(
        id=sub.id,
        title=assign.title if assign else "",
        type="homework",
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
        submittedText=sub.answer_text,
        assignmentFiles=a_files,
        materialsCount=len(a_files),
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

    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()
    if student is None:
        return []

    group_ids = (
        (
            await db.execute(
                select(EnrollmentModel.group_id).where(
                    EnrollmentModel.student_id == student.id,
                    EnrollmentModel.is_active == True,  # noqa: E712
                )
            )
        )
        .scalars()
        .all()
    )

    result = []
    for gid in group_ids:
        (await db.execute(select(GroupModel).where(GroupModel.id == gid))).scalar_one_or_none()
        # Find subject through lessons of this group
        lesson_subj_id = (
            await db.execute(
                select(LessonModel.subject_id)
                .where(LessonModel.group_id == gid, LessonModel.subject_id != None)
                .limit(1)  # noqa: E711
            )
        ).scalar()
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
        lesson_ids = (await db.execute(select(LessonModel.id).where(LessonModel.group_id == gid))).scalars().all()
        avg_grade = 0.0
        if lesson_ids:
            avg = (
                await db.execute(
                    select(func.avg(GradeRecordModel.score)).where(
                        GradeRecordModel.student_id == student.id,
                        GradeRecordModel.lesson_id.in_(lesson_ids),
                    )
                )
            ).scalar()
            avg_grade = round(float(avg), 2) if avg else 0.0
        result.append(
            SubjectOut(
                id=subj.id,
                name=subj.name,
                teacherName=teacher_name,
                currentAvgGrade=avg_grade,
            )
        )
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

    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="Student profile not found")

    subj = (await db.execute(select(SubjectModel).where(SubjectModel.id == subject_id))).scalar_one_or_none()
    if subj is None:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Find group for this subject
    group_ids = (
        (
            await db.execute(
                select(EnrollmentModel.group_id).where(
                    EnrollmentModel.student_id == student.id,
                    EnrollmentModel.is_active == True,  # noqa: E712
                )
            )
        )
        .scalars()
        .all()
    )

    # Find group that has lessons with this subject
    subject_group = None
    for gid in group_ids:
        has_subject = (
            await db.execute(
                select(LessonModel.id).where(LessonModel.group_id == gid, LessonModel.subject_id == subject_id).limit(1)
            )
        ).scalar()
        if has_subject:
            subject_group = (await db.execute(select(GroupModel).where(GroupModel.id == gid))).scalar_one_or_none()
            break

    teacher_name = ""
    if subj.teacher_id:
        u = (await db.execute(select(UserModel.name).where(UserModel.id == subj.teacher_id))).scalar()
        teacher_name = u or ""

    lesson_ids: list = []
    lesson_date_map: dict = {}
    if subject_group:
        lesson_rows = (
            await db.execute(
                select(LessonModel.id, LessonModel.scheduled_at).where(LessonModel.group_id == subject_group.id)
            )
        ).all()
        lesson_ids = [r.id for r in lesson_rows]
        lesson_date_map = {r.id: r.scheduled_at for r in lesson_rows}

    # Grades
    grade_rows = (
        (
            await db.execute(
                select(GradeRecordModel)
                .where(
                    GradeRecordModel.student_id == student.id,
                    GradeRecordModel.lesson_id.in_(lesson_ids),
                )
                .order_by(GradeRecordModel.graded_at)
            )
        )
        .scalars()
        .all()
        if lesson_ids
        else []
    )

    avg_grade = round(sum(float(g.score) for g in grade_rows) / len(grade_rows), 2) if grade_rows else 0.0

    # Attendance
    att_rows = (
        (
            await db.execute(
                select(AttendanceRecordModel).where(
                    AttendanceRecordModel.student_id == student.id,
                    AttendanceRecordModel.lesson_id.in_(lesson_ids),
                )
            )
        )
        .scalars()
        .all()
        if lesson_ids
        else []
    )

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
        grades=[
            GradeEntry(
                id=g.id,
                date=g.graded_at.date().isoformat(),
                subjectId=str(subject_id),
                type=g.type,
                value=float(g.score),
            )
            for g in grade_rows
        ],
        attendanceCalendar=[
            AttendanceEntry(
                date=lesson_date_map.get(a.lesson_id, a.recorded_at).date().isoformat()
                if lesson_date_map.get(a.lesson_id) or a.recorded_at
                else "",
                subjectId=str(subject_id),
                status=a.status,
            )
            for a in att_rows
        ],
    )


# ── Materials ─────────────────────────────────────────────────────────────────


class MaterialOut(BaseModel):
    id: UUID
    title: str
    type: str
    language: str
    url: str
    subjectId: str | None
    subjectName: str = ""
    uploadedAt: str


@router.get("/materials", response_model=list[MaterialOut])
async def my_materials(
    current_user: CurrentUser,
    db: DbSession,
    subjectId: str | None = None,
    language: str | None = None,
) -> list[MaterialOut]:
    _require_student(current_user)

    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()
    if student is None:
        return []

    group_ids = (
        (
            await db.execute(
                select(EnrollmentModel.group_id).where(
                    EnrollmentModel.student_id == student.id,
                    EnrollmentModel.is_active == True,  # noqa: E712
                )
            )
        )
        .scalars()
        .all()
    )

    lesson_ids = (
        (await db.execute(select(LessonModel.id).where(LessonModel.group_id.in_(group_ids)))).scalars().all()
        if group_ids
        else []
    )

    if not lesson_ids:
        return []

    q = select(LessonMaterialModel).where(LessonMaterialModel.lesson_id.in_(lesson_ids))
    if language:
        q = q.where(LessonMaterialModel.language == language)
    rows = (await db.execute(q.order_by(LessonMaterialModel.created_at.desc()))).scalars().all()

    # Build subject map per lesson + subject names
    lesson_subject: dict = {}
    subject_names: dict = {}
    for lid in lesson_ids:
        lesson = (await db.execute(select(LessonModel).where(LessonModel.id == lid))).scalar_one_or_none()
        if lesson and lesson.subject_id:
            sid_str = str(lesson.subject_id)
            lesson_subject[str(lid)] = sid_str
            if sid_str not in subject_names:
                subj = (
                    await db.execute(select(SubjectModel.name).where(SubjectModel.id == lesson.subject_id))
                ).scalar()
                subject_names[sid_str] = subj or ""

    result = []
    for m in rows:
        sid = lesson_subject.get(str(m.lesson_id))
        if subjectId and sid != subjectId:
            continue
        result.append(
            MaterialOut(
                id=m.id,
                title=m.title,
                type=m.type,
                language=m.language,
                url=m.url,
                subjectId=sid,
                subjectName=subject_names.get(sid, "") if sid else "",
                uploadedAt=m.created_at.isoformat() if m.created_at else "",
            )
        )
    return result


# ── Lessons with Materials ───────────────────────────────────────────────────


class LessonMaterialItem(BaseModel):
    id: UUID
    title: str
    type: str
    language: str
    url: str
    key: str | None = None
    uploadedAt: str


class LessonWithMaterials(BaseModel):
    id: UUID
    topic: str | None
    date: str
    subjectName: str
    teacherName: str
    materialsCount: int
    materials: list[LessonMaterialItem]


@router.get("/lessons-materials", response_model=list[LessonWithMaterials])
async def my_lessons_materials(
    current_user: CurrentUser,
    db: DbSession,
) -> list[LessonWithMaterials]:
    """Lessons that have materials, grouped by lesson. For the Materials page."""
    _require_student(current_user)

    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()
    if student is None:
        return []

    group_ids = (
        (
            await db.execute(
                select(EnrollmentModel.group_id).where(
                    EnrollmentModel.student_id == student.id,
                    EnrollmentModel.is_active == True,  # noqa: E712
                )
            )
        )
        .scalars()
        .all()
    )
    if not group_ids:
        return []

    # Get completed lessons that have materials
    lessons = (
        (
            await db.execute(
                select(LessonModel)
                .where(
                    LessonModel.group_id.in_(group_ids),
                    LessonModel.status == "completed",
                )
                .order_by(LessonModel.scheduled_at.desc())
            )
        )
        .scalars()
        .all()
    )

    result = []
    for lesson in lessons:
        mats = (
            (
                await db.execute(
                    select(LessonMaterialModel)
                    .where(LessonMaterialModel.lesson_id == lesson.id)
                    .order_by(LessonMaterialModel.created_at)
                )
            )
            .scalars()
            .all()
        )

        if not mats:
            continue

        # Resolve subject + teacher names
        subject_name = ""
        if lesson.subject_id:
            sn = (await db.execute(select(SubjectModel.name).where(SubjectModel.id == lesson.subject_id))).scalar()
            subject_name = sn or ""

        teacher_name = ""
        if lesson.teacher_id:
            tn = (await db.execute(select(UserModel.name).where(UserModel.id == lesson.teacher_id))).scalar()
            teacher_name = tn or ""

        result.append(
            LessonWithMaterials(
                id=lesson.id,
                topic=lesson.topic,
                date=lesson.scheduled_at.strftime("%Y-%m-%d") if lesson.scheduled_at else "",
                subjectName=subject_name,
                teacherName=teacher_name,
                materialsCount=len(mats),
                materials=[
                    LessonMaterialItem(
                        id=m.id,
                        title=m.title,
                        type=m.type,
                        language=m.language,
                        url=m.url,
                        key=m.s3_key,
                        uploadedAt=m.created_at.isoformat() if m.created_at else "",
                    )
                    for m in mats
                ],
            )
        )

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

    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()
    if student is None:
        return []

    group_ids = (
        (
            await db.execute(
                select(EnrollmentModel.group_id).where(
                    EnrollmentModel.student_id == student.id,
                    EnrollmentModel.is_active == True,  # noqa: E712
                )
            )
        )
        .scalars()
        .all()
    )

    result = []
    seen_ids: set = set()
    for gid in group_ids:
        (await db.execute(select(GroupModel).where(GroupModel.id == gid))).scalar_one_or_none()
        # Find subject through lessons of this group
        lesson_subj_id = (
            await db.execute(
                select(LessonModel.subject_id)
                .where(LessonModel.group_id == gid, LessonModel.subject_id != None)
                .limit(1)  # noqa: E711
            )
        ).scalar()
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
        result.append(
            ContactOut(
                id=teacher.id,
                fullName=teacher.name,
                role="teacher",
                subject=subj.name,
                photo=None,
                email=teacher.email,
                phone=None,
                telegram=None,
            )
        )
    return result
