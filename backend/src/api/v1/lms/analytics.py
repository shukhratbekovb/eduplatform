"""LMS Analytics — overview, attendance trends, grade distribution, risk, homework, teachers."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import select, func

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.lms import (
    StudentModel, AttendanceRecordModel, GradeRecordModel, LessonModel,
    HomeworkAssignmentModel, HomeworkSubmissionModel, EnrollmentModel,
)
from src.infrastructure.persistence.models.auth import UserModel

router = APIRouter(prefix="/lms/analytics", tags=["LMS - Analytics"])


def _period_dates(period: str, date_from: str | None, date_to: str | None):  # type: ignore[no-untyped-def]
    now = datetime.now(timezone.utc)
    if period == "7d":
        return now - timedelta(days=7), now
    if period == "30d":
        return now - timedelta(days=30), now
    if period == "90d":
        return now - timedelta(days=90), now
    if date_from and date_to:
        return datetime.fromisoformat(date_from), datetime.fromisoformat(date_to)
    return now - timedelta(days=30), now


class OverviewDelta(BaseModel):
    avgAttendance: float = 0.0
    atRiskStudents: float = 0.0
    homeworkSubmitRate: float = 0.0


class OverviewOut(BaseModel):
    totalStudents: int = 0
    activeGroups: int = 0
    lessonsThisWeek: int = 0
    avgAttendance: float = 0.0
    atRiskStudents: int = 0
    criticalStudents: int = 0
    homeworkSubmitRate: float = 0.0
    incompleteLesson: int = 0
    delta: OverviewDelta = OverviewDelta()


@router.get("/overview", response_model=OverviewOut)
async def overview(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("week"),
    date_from: str | None = None,
    date_to: str | None = None,
    direction_id: UUID | None = None,
) -> OverviewOut:
    from src.infrastructure.persistence.models.lms import GroupModel

    # Students
    q = select(StudentModel)
    if direction_id:
        q = q.where(StudentModel.direction_id == direction_id)
    students = (await db.execute(q)).scalars().all()
    total_students = len(students)
    at_risk = sum(1 for s in students if s.risk_level in ("medium", "high", "critical"))
    critical = sum(1 for s in students if s.risk_level in ("high", "critical"))
    avg_att = sum(float(s.attendance_percent) for s in students if s.attendance_percent) / total_students if total_students else 0.0

    # Active groups
    active_groups = (await db.execute(
        select(func.count()).select_from(GroupModel).where(GroupModel.is_active == True)  # noqa: E712
    )).scalar() or 0

    # Lessons this week
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_end = week_start + timedelta(days=7)
    lessons_this_week = (await db.execute(
        select(func.count()).select_from(LessonModel)
        .where(LessonModel.scheduled_at >= week_start, LessonModel.scheduled_at < week_end)
    )).scalar() or 0

    # Incomplete lessons (scheduled but not conducted, past date)
    incomplete = (await db.execute(
        select(func.count()).select_from(LessonModel)
        .where(LessonModel.status == "scheduled", LessonModel.scheduled_at < now)
    )).scalar() or 0

    # Homework submit rate
    total_hw = (await db.execute(select(func.count()).select_from(HomeworkSubmissionModel))).scalar() or 0
    submitted_hw = (await db.execute(
        select(func.count()).select_from(HomeworkSubmissionModel)
        .where(HomeworkSubmissionModel.status.in_(["submitted", "graded"]))
    )).scalar() or 0
    hw_rate = round(submitted_hw / total_hw * 100, 1) if total_hw > 0 else 0.0

    return OverviewOut(
        totalStudents=total_students,
        activeGroups=active_groups,
        lessonsThisWeek=lessons_this_week,
        avgAttendance=round(avg_att, 1),
        atRiskStudents=at_risk,
        criticalStudents=critical,
        homeworkSubmitRate=hw_rate,
        incompleteLesson=incomplete,
        delta=OverviewDelta(),
    )


class AttendanceStatOut(BaseModel):
    date: str
    present: int
    absent: int
    rate: float


@router.get("/attendance", response_model=list[AttendanceStatOut])
async def attendance_stats(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("30d"),
    date_from: str | None = None,
    date_to: str | None = None,
    group_id: UUID | None = None,
) -> list[AttendanceStatOut]:
    return []  # simplified — real impl would group by day


class GradeDistributionOut(BaseModel):
    grade: str
    count: int
    percentage: float


@router.get("/grades", response_model=list[GradeDistributionOut])
async def grade_distribution(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("30d"),
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[GradeDistributionOut]:
    buckets = {"12": 0, "10-11": 0, "7-9": 0, "4-6": 0, "1-3": 0}
    rows = (await db.execute(select(GradeRecordModel.score, GradeRecordModel.max_score))).all()
    total = len(rows)
    for r in rows:
        if r.max_score and r.max_score > 0:
            pct = float(r.score) / float(r.max_score) * 12
            if pct >= 12:
                buckets["12"] += 1
            elif pct >= 10:
                buckets["10-11"] += 1
            elif pct >= 7:
                buckets["7-9"] += 1
            elif pct >= 4:
                buckets["4-6"] += 1
            else:
                buckets["1-3"] += 1
    return [
        GradeDistributionOut(grade=k, count=v, percentage=round(v / total * 100, 1) if total else 0.0)
        for k, v in buckets.items()
    ]


@router.get("/risk")
async def risk_distribution(current_user: CurrentUser, db: DbSession, period: str = Query("30d")) -> dict:  # type: ignore[type-arg]
    rows = (await db.execute(
        select(StudentModel.risk_level, func.count(StudentModel.id).label("cnt"))
        .group_by(StudentModel.risk_level)
    )).all()
    result = {"normal": 0, "at_risk": 0, "critical": 0}
    for r in rows:
        if r.risk_level == "normal":
            result["normal"] = r.cnt
        elif r.risk_level == "medium":
            result["at_risk"] = r.cnt
        elif r.risk_level == "high":
            result["critical"] = r.cnt
    return result


@router.get("/homework")
async def homework_stats(current_user: CurrentUser, db: DbSession, period: str = Query("30d")) -> dict:  # type: ignore[type-arg]
    total = (await db.execute(select(func.count()).select_from(HomeworkSubmissionModel))).scalar() or 0
    reviewed = (await db.execute(
        select(func.count()).where(HomeworkSubmissionModel.status == "graded")
    )).scalar() or 0
    overdue = (await db.execute(
        select(func.count()).where(HomeworkSubmissionModel.status == "overdue")
    )).scalar() or 0
    return {
        "submittedRate": 100.0 if total > 0 else 0.0,
        "reviewedRate": round(reviewed / total * 100, 1) if total else 0.0,
        "overdueRate": round(overdue / total * 100, 1) if total else 0.0,
    }


class TeacherStatOut(BaseModel):
    teacherId: str
    teacherName: str
    totalLessons: int
    conductedLessons: int
    conductionRate: float


@router.get("/teachers", response_model=list[TeacherStatOut])
async def teacher_performance(current_user: CurrentUser, db: DbSession, period: str = Query("30d")) -> list[TeacherStatOut]:
    rows = (await db.execute(
        select(LessonModel.teacher_id, func.count(LessonModel.id).label("total"))
        .group_by(LessonModel.teacher_id)
    )).all()

    result = []
    for r in rows:
        if not r.teacher_id:
            continue
        user = (await db.execute(select(UserModel.name).where(UserModel.id == r.teacher_id))).scalar()
        conducted = (await db.execute(
            select(func.count()).where(
                LessonModel.teacher_id == r.teacher_id,
                LessonModel.status == "completed",
            )
        )).scalar() or 0
        result.append(TeacherStatOut(
            teacherId=str(r.teacher_id),
            teacherName=user or "Unknown",
            totalLessons=r.total,
            conductedLessons=conducted,
            conductionRate=round(conducted / r.total * 100, 1) if r.total else 0.0,
        ))
    return result


@router.get("/homework-by-teacher")
async def homework_by_teacher(current_user: CurrentUser, db: DbSession) -> list[dict]:  # type: ignore[type-arg]
    return []
