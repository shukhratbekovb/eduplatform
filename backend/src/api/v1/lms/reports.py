"""LMS Reports — teacher hours, performance by group, income, by direction."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import select, func, extract

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.lms import (
    StudentModel, LessonModel, GroupModel, EnrollmentModel,
    DirectionModel, SubjectModel,
)
from src.infrastructure.persistence.models.auth import UserModel

router = APIRouter(prefix="/lms/reports", tags=["LMS - Reports"])


def _now():
    return datetime.now(timezone.utc)


def _lesson_period_filter(q, month: int, year: int):
    """Filter lessons by month/year via scheduled_at. Skip if 0."""
    if not month or not year:
        return q
    return q.where(
        extract("year", LessonModel.scheduled_at) == year,
        extract("month", LessonModel.scheduled_at) == month,
    )


# ── Available periods ────────────────────────────────────────────────────────

@router.get("/available-periods")
async def available_periods(
    current_user: CurrentUser, db: DbSession,
    teacher_id: UUID | None = Query(default=None, alias="teacherId"),
) -> dict:
    q = select(
        extract("year", LessonModel.scheduled_at).label("y"),
        extract("month", LessonModel.scheduled_at).label("m"),
    ).where(LessonModel.scheduled_at != None)  # noqa: E711
    if teacher_id:
        q = q.where(LessonModel.teacher_id == teacher_id)
    q = q.distinct().order_by("y", "m")
    rows = (await db.execute(q)).all()

    years = sorted(set(int(r.y) for r in rows))
    months_by_year: dict[int, list[int]] = {}
    for r in rows:
        y = int(r.y)
        months_by_year.setdefault(y, []).append(int(r.m))
    return {"years": years, "monthsByYear": months_by_year}


# ── Teacher Hours ────────────────────────────────────────────────────────────

@router.get("/teacher-hours")
async def teacher_hours(
    current_user: CurrentUser, db: DbSession,
    month: int = Query(default=None), year: int = Query(default=None),
    teacher_id: UUID | None = Query(default=None, alias="teacherId"),
) -> list[dict]:
    month = month or _now().month
    year = year or _now().year
    q = select(UserModel).where(UserModel.role == "teacher", UserModel.is_active == True)  # noqa: E712
    if teacher_id:
        q = q.where(UserModel.id == teacher_id)
    teachers = (await db.execute(q)).scalars().all()

    if not teachers:
        return []

    teacher_ids = [t.id for t in teachers]
    teacher_map = {t.id: t.name for t in teachers}

    # Lessons grouped by teacher + subject, filtered by period
    base_q = (
        select(
            LessonModel.teacher_id,
            SubjectModel.name.label("subject_name"),
            func.count(LessonModel.id).filter(LessonModel.status == "completed").label("conducted"),
            func.sum(LessonModel.duration_minutes).filter(LessonModel.status == "completed").label("minutes"),
        )
        .outerjoin(SubjectModel, SubjectModel.id == LessonModel.subject_id)
        .where(LessonModel.teacher_id.in_(teacher_ids))
    )
    base_q = _lesson_period_filter(base_q, month, year)
    rows = (await db.execute(base_q.group_by(LessonModel.teacher_id, SubjectModel.name))).all()

    from collections import defaultdict
    teacher_data: dict = defaultdict(lambda: {"conducted": 0, "minutes": 0, "subjects": []})

    for r in rows:
        td = teacher_data[r.teacher_id]
        conducted = r.conducted or 0
        minutes = r.minutes or 0
        td["conducted"] += conducted
        td["minutes"] += minutes
        if conducted > 0:
            subj_name = r.subject_name or "Без предмета"
            td["subjects"].append({
                "name": subj_name,
                "lessons": conducted,
                "hours": minutes // 60,
                "minutesRemainder": minutes % 60,
            })

    result = []
    for tid in teacher_ids:
        td = teacher_data.get(tid, {"conducted": 0, "minutes": 0, "subjects": []})
        td["subjects"].sort(key=lambda x: x["lessons"], reverse=True)
        result.append({
            "teacherId": str(tid),
            "teacherName": teacher_map.get(tid, ""),
            "lessonsConducted": td["conducted"],
            "hours": td["minutes"] // 60,
            "minutesRemainder": td["minutes"] % 60,
            "subjects": td["subjects"],
        })

    result.sort(key=lambda x: x["lessonsConducted"], reverse=True)
    return result


# ── Performance by Group ─────────────────────────────────────────────────────

@router.get("/performance")
async def performance_report(
    current_user: CurrentUser, db: DbSession,
    month: int = Query(default=None), year: int = Query(default=None),
) -> list[dict]:
    month = month or _now().month
    year = year or _now().year
    groups = (await db.execute(
        select(GroupModel).where(GroupModel.is_active == True)  # noqa: E712
    )).scalars().all()

    if not groups:
        return []

    # Direction names
    dir_ids = {g.direction_id for g in groups if g.direction_id}
    dir_map: dict = {}
    if dir_ids:
        dirs = (await db.execute(select(DirectionModel).where(DirectionModel.id.in_(dir_ids)))).scalars().all()
        dir_map = {d.id: d.name for d in dirs}

    result = []
    for g in groups:
        # Student count
        sc = (await db.execute(
            select(func.count()).where(EnrollmentModel.group_id == g.id, EnrollmentModel.is_active == True)  # noqa: E712
        )).scalar() or 0

        # Lessons (filtered by period)
        lq = select(
            func.count(LessonModel.id).label("total"),
            func.count().filter(LessonModel.status == "completed").label("conducted"),
        ).where(LessonModel.group_id == g.id)
        lq = _lesson_period_filter(lq, month, year)
        lesson_stats = (await db.execute(lq)).one()

        # Avg GPA of enrolled students
        avg_gpa = (await db.execute(
            select(func.avg(StudentModel.gpa))
            .join(EnrollmentModel, EnrollmentModel.student_id == StudentModel.id)
            .where(EnrollmentModel.group_id == g.id, EnrollmentModel.is_active == True)  # noqa: E712
        )).scalar()

        avg_att = (await db.execute(
            select(func.avg(StudentModel.attendance_percent))
            .join(EnrollmentModel, EnrollmentModel.student_id == StudentModel.id)
            .where(EnrollmentModel.group_id == g.id, EnrollmentModel.is_active == True)  # noqa: E712
        )).scalar()

        result.append({
            "groupId": str(g.id),
            "groupName": g.name,
            "direction": dir_map.get(g.direction_id, ""),
            "teacher": "",  # no teacher on group anymore
            "studentCount": sc,
            "avgGrade": round(float(avg_gpa), 1) if avg_gpa else 0.0,
            "attendance": round(float(avg_att), 1) if avg_att else 0.0,
            "lessonsTotal": lesson_stats.total,
        })

    return result


# ── By Direction ─────────────────────────────────────────────────────────────

@router.get("/by-direction")
async def by_direction_report(
    current_user: CurrentUser, db: DbSession,
    month: int = Query(default=None), year: int = Query(default=None),
) -> list[dict]:
    month = month or _now().month
    year = year or _now().year
    directions = (await db.execute(
        select(DirectionModel).where(DirectionModel.is_active == True)  # noqa: E712
    )).scalars().all()

    result = []
    for d in directions:
        group_ids = (await db.execute(
            select(GroupModel.id).where(GroupModel.direction_id == d.id)
        )).scalars().all()

        student_count = 0
        if group_ids:
            student_count = (await db.execute(
                select(func.count(func.distinct(EnrollmentModel.student_id)))
                .where(EnrollmentModel.group_id.in_(group_ids), EnrollmentModel.is_active == True)  # noqa: E712
            )).scalar() or 0

        lesson_stats = {"total": 0, "conducted": 0, "cancelled": 0}
        if group_ids:
            lq = select(
                func.count(LessonModel.id).label("total"),
                func.count().filter(LessonModel.status == "completed").label("conducted"),
                func.count().filter(LessonModel.status == "cancelled").label("cancelled"),
            ).where(LessonModel.group_id.in_(group_ids))
            lq = _lesson_period_filter(lq, month, year)
            row = (await db.execute(lq)).one()
            lesson_stats = {"total": row.total, "conducted": row.conducted, "cancelled": row.cancelled}

        result.append({
            "directionId": str(d.id),
            "directionName": d.name,
            "color": "#6366F1",
            "groupCount": len(group_ids),
            "studentCount": student_count,
            "lessonsTotal": lesson_stats["total"],
            "lessonsConducted": lesson_stats["conducted"],
            "lessonsCancelled": lesson_stats["cancelled"],
        })

    return result


# ── Income (placeholder) ─────────────────────────────────────────────────────

@router.get("/income")
async def income_report(current_user: CurrentUser, db: DbSession) -> list[dict]:
    # Placeholder — real implementation would aggregate from payments table
    return []
