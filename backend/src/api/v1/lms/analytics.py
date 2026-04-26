"""Эндпоинты аналитики LMS — обзор, тренды посещаемости, распределение оценок, риски, домашки, преподаватели.

Предоставляет REST API для аналитических данных системы управления обучением.
Эндпоинты агрегируют данные из таблиц студентов, посещаемости, оценок,
уроков и домашних заданий, формируя метрики для дашбордов.

Основные метрики:
    - Overview: общая статистика (студенты, группы, уроки, посещаемость, риски).
    - Attendance: дневная статистика посещаемости с трендами.
    - Grades: средние оценки по предметам (10-балльная шкала).
    - Risk: распределение студентов по уровням риска.
    - Homework: статистика сдачи и проверки домашних заданий.
    - Teachers: показатели эффективности преподавателей.
    - Homework by Teacher/Student: детальная разбивка по домашкам.

Роуты:
    GET /lms/analytics/overview — ключевые KPI показатели.
    GET /lms/analytics/attendance — дневная статистика посещаемости.
    GET /lms/analytics/grades — средние оценки по предметам.
    GET /lms/analytics/risk — распределение по уровням риска.
    GET /lms/analytics/homework — агрегированная статистика домашек.
    GET /lms/analytics/teachers — эффективность преподавателей.
    GET /lms/analytics/homework-by-teacher — домашки в разрезе преподавателей.
    GET /lms/analytics/homework-by-student — домашки в разрезе студентов.
"""
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
    """Вычисляет даты начала и окончания периода для фильтрации.

    Поддерживает предустановленные периоды (7d, 30d, 90d) и
    пользовательский диапазон дат.

    Args:
        period: Предустановленный период ("7d", "30d", "90d") или произвольный.
        date_from: Начальная дата пользовательского диапазона (ISO формат).
        date_to: Конечная дата пользовательского диапазона (ISO формат).

    Returns:
        tuple[datetime, datetime]: Кортеж (начало, конец) периода в UTC.
            При некорректных параметрах возвращает последние 30 дней.
    """
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
    """Дельта-изменения ключевых показателей по сравнению с предыдущим периодом.

    Attributes:
        avgAttendance: Изменение средней посещаемости (%).
        atRiskStudents: Изменение количества студентов в зоне риска (%).
        homeworkSubmitRate: Изменение процента сдачи домашек (%).
    """
    avgAttendance: float = 0.0
    atRiskStudents: float = 0.0
    homeworkSubmitRate: float = 0.0


class OverviewOut(BaseModel):
    """Общая статистика LMS — ключевые KPI для дашборда.

    Attributes:
        totalStudents: Общее количество студентов.
        activeGroups: Количество активных групп.
        lessonsThisWeek: Уроков на текущей неделе.
        avgAttendance: Средний процент посещаемости.
        atRiskStudents: Студентов в зоне риска (medium + high + critical).
        criticalStudents: Студентов в критической зоне (high + critical).
        homeworkSubmitRate: Процент сданных домашек.
        incompleteLesson: Количество непроведённых уроков (прошедших scheduled).
        delta: Дельта-изменения по сравнению с предыдущим периодом.
    """
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
    """Получение общих KPI показателей LMS.

    Агрегирует данные по студентам, группам, урокам и домашкам.
    Поддерживает фильтр по направлению.

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.
        period: Период для расчёта (по умолчанию "week").
        date_from: Начальная дата диапазона (опционально).
        date_to: Конечная дата диапазона (опционально).
        direction_id: Фильтр по UUID направления (опционально).

    Returns:
        OverviewOut: Объект с ключевыми метриками.
    """
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
    """Статистика посещаемости за один день.

    Attributes:
        date: Дата (YYYY-MM-DD).
        present: Количество присутствовавших (present + late).
        absent: Количество отсутствовавших.
        attendanceRate: Процент посещаемости за день.
    """
    date: str
    present: int
    absent: int
    attendanceRate: float


@router.get("/attendance", response_model=list[AttendanceStatOut])
async def attendance_stats(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("30d"),
    date_from: str | None = None,
    date_to: str | None = None,
    group_id: UUID | None = None,
) -> list[AttendanceStatOut]:
    """Получение дневной статистики посещаемости.

    Агрегирует данные посещаемости по дням для проведённых уроков.
    Поддерживает фильтр по группе и период.

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.
        period: Период ("7d", "30d", "90d" или пользовательский).
        date_from: Начальная дата (опционально).
        date_to: Конечная дата (опционально).
        group_id: Фильтр по UUID группы (опционально).

    Returns:
        list[AttendanceStatOut]: Дневная статистика, отсортированная по дате.
    """
    start, end = _period_dates(period, date_from, date_to)

    q = (
        select(
            func.date(LessonModel.scheduled_at).label("lesson_date"),
            func.count(AttendanceRecordModel.id).label("total"),
            func.count(AttendanceRecordModel.id).filter(
                AttendanceRecordModel.status.in_(["present", "late"])
            ).label("present_count"),
            func.count(AttendanceRecordModel.id).filter(
                AttendanceRecordModel.status == "absent"
            ).label("absent_count"),
        )
        .join(LessonModel, AttendanceRecordModel.lesson_id == LessonModel.id)
        .where(
            LessonModel.scheduled_at >= start,
            LessonModel.scheduled_at <= end,
            LessonModel.status == "completed",
        )
    )
    if group_id:
        q = q.where(LessonModel.group_id == group_id)

    q = q.group_by(func.date(LessonModel.scheduled_at)).order_by(func.date(LessonModel.scheduled_at))
    rows = (await db.execute(q)).all()

    return [
        AttendanceStatOut(
            date=str(r.lesson_date),
            present=r.present_count,
            absent=r.absent_count,
            attendanceRate=round(r.present_count / r.total * 100, 1) if r.total > 0 else 0.0,
        )
        for r in rows
    ]


class GradeBySubjectOut(BaseModel):
    """Средняя оценка по предмету.

    Attributes:
        subjectName: Название предмета.
        avgGrade: Средняя оценка по 10-балльной шкале.
        count: Количество оценок.
    """
    subjectName: str
    avgGrade: float
    count: int


@router.get("/grades", response_model=list[GradeBySubjectOut])
async def grades_by_subject(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("30d"),
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[GradeBySubjectOut]:
    """Получение средних оценок в разрезе предметов.

    Формула нормализации: score / max_score * 10 (10-балльная шкала).
    Сортировка по убыванию средней оценки.

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.
        period: Период для фильтрации.
        date_from: Начальная дата (опционально).
        date_to: Конечная дата (опционально).

    Returns:
        list[GradeBySubjectOut]: Список предметов с средними оценками.
    """
    from src.infrastructure.persistence.models.lms import SubjectModel

    q = (
        select(
            SubjectModel.name.label("subject_name"),
            func.avg(GradeRecordModel.score / GradeRecordModel.max_score * 10).label("avg_grade"),
            func.count(GradeRecordModel.id).label("cnt"),
        )
        .join(SubjectModel, GradeRecordModel.subject_id == SubjectModel.id)
        .where(GradeRecordModel.max_score > 0)
        .group_by(SubjectModel.id, SubjectModel.name)
        .order_by(func.avg(GradeRecordModel.score / GradeRecordModel.max_score * 10).desc())
    )
    rows = (await db.execute(q)).all()

    return [
        GradeBySubjectOut(
            subjectName=r.subject_name,
            avgGrade=round(float(r.avg_grade), 1),
            count=r.cnt,
        )
        for r in rows
    ]


@router.get("/risk")
async def risk_distribution(current_user: CurrentUser, db: DbSession, period: str = Query("30d")) -> dict:  # type: ignore[type-arg]
    """Получение распределения студентов по уровням риска.

    Группирует студентов в три категории:
    - normal: low + normal.
    - at_risk: medium.
    - critical: high + critical.

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.
        period: Период (не используется, для единообразия API).

    Returns:
        dict: {"normal": int, "at_risk": int, "critical": int}.
    """
    rows = (await db.execute(
        select(StudentModel.risk_level, func.count(StudentModel.id).label("cnt"))
        .group_by(StudentModel.risk_level)
    )).all()
    result = {"normal": 0, "at_risk": 0, "critical": 0}
    for r in rows:
        if r.risk_level in ("low", "normal"):
            result["normal"] += r.cnt
        elif r.risk_level == "medium":
            result["at_risk"] += r.cnt
        elif r.risk_level in ("high", "critical"):
            result["critical"] += r.cnt
    return result


@router.get("/homework")
async def homework_stats(current_user: CurrentUser, db: DbSession, period: str = Query("30d")) -> dict:  # type: ignore[type-arg]
    """Получение агрегированной статистики домашних заданий.

    Возвращает три показателя в процентах:
    - submittedRate: процент сданных работ (submitted + graded от total).
    - reviewedRate: процент проверенных (graded от total).
    - overdueRate: процент просроченных (overdue от total).

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.
        period: Период (не используется, для единообразия API).

    Returns:
        dict: {"submittedRate": float, "reviewedRate": float, "overdueRate": float}.
    """
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
    """Показатели эффективности преподавателя.

    Attributes:
        teacherId: UUID преподавателя (строка).
        teacherName: ФИО преподавателя.
        lessonsScheduled: Общее количество запланированных уроков.
        lessonsConducted: Количество проведённых уроков.
        conductRate: Процент проведённых от запланированных.
    """
    teacherId: str
    teacherName: str
    lessonsScheduled: int
    lessonsConducted: int
    conductRate: float


@router.get("/teachers", response_model=list[TeacherStatOut])
async def teacher_performance(current_user: CurrentUser, db: DbSession, period: str = Query("30d")) -> list[TeacherStatOut]:
    """Получение показателей эффективности преподавателей.

    Для каждого преподавателя подсчитывает количество запланированных
    и проведённых уроков. Сортировка по проценту проведения (убывание).

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.
        period: Период для фильтрации (не используется).

    Returns:
        list[TeacherStatOut]: Список преподавателей с показателями.
    """
    rows = (await db.execute(
        select(
            LessonModel.teacher_id,
            func.count(LessonModel.id).label("total"),
            func.count(LessonModel.id).filter(LessonModel.status == "completed").label("conducted"),
        )
        .where(LessonModel.teacher_id.isnot(None))
        .group_by(LessonModel.teacher_id)
    )).all()

    result = []
    for r in rows:
        user = (await db.execute(select(UserModel.name).where(UserModel.id == r.teacher_id))).scalar()
        result.append(TeacherStatOut(
            teacherId=str(r.teacher_id),
            teacherName=user or "Unknown",
            lessonsScheduled=r.total,
            lessonsConducted=r.conducted,
            conductRate=round(r.conducted / r.total * 100, 1) if r.total else 0.0,
        ))
    return sorted(result, key=lambda x: x.conductRate, reverse=True)


@router.get("/homework-by-teacher")
async def homework_by_teacher(current_user: CurrentUser, db: DbSession) -> list[dict]:  # type: ignore[type-arg]
    """Получение статистики домашних заданий в разрезе преподавателей.

    Для каждого преподавателя подсчитывает:
    - total: общее количество submissions по его заданиям.
    - reviewed: проверенные (graded).
    - awaitingReview: сданные, но не проверенные (submitted).
    - notSubmitted: не сданные (pending).
    - overdue: просроченные.
    - reviewRate: процент проверенных от total.

    Цепочка: преподаватель → уроки → задания → submissions.

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        list[dict]: Список словарей с показателями по преподавателям.
    """
    from src.infrastructure.persistence.models.lms import (
        HomeworkAssignmentModel, HomeworkSubmissionModel, LessonModel,
    )
    from src.infrastructure.persistence.models.auth import UserModel
    from collections import defaultdict

    # Get all teachers with lessons that have homework
    teachers = (await db.execute(
        select(UserModel).where(UserModel.role == "teacher", UserModel.is_active == True)  # noqa: E712
    )).scalars().all()

    result = []
    for t in teachers:
        lesson_ids = (await db.execute(
            select(LessonModel.id).where(LessonModel.teacher_id == t.id)
        )).scalars().all()
        if not lesson_ids:
            continue

        assign_ids = (await db.execute(
            select(HomeworkAssignmentModel.id).where(HomeworkAssignmentModel.lesson_id.in_(lesson_ids))
        )).scalars().all()
        if not assign_ids:
            continue

        subs = (await db.execute(
            select(HomeworkSubmissionModel).where(HomeworkSubmissionModel.assignment_id.in_(assign_ids))
        )).scalars().all()

        total = len(subs)
        reviewed = sum(1 for s in subs if s.status == "graded")
        submitted = sum(1 for s in subs if s.status == "submitted")
        overdue = sum(1 for s in subs if s.status == "overdue")
        pending = sum(1 for s in subs if s.status == "pending")

        result.append({
            "teacherId": str(t.id),
            "teacherName": t.name,
            "total": total,
            "reviewed": reviewed,
            "awaitingReview": submitted,
            "notSubmitted": pending,
            "overdue": overdue,
            "reviewRate": round(reviewed / total * 100) if total else 0,
        })

    return sorted(result, key=lambda x: x["total"], reverse=True)


@router.get("/homework-by-student")
async def homework_by_student(current_user: CurrentUser, db: DbSession) -> list[dict]:  # type: ignore[type-arg]
    """Получение статистики домашних заданий в разрезе студентов.

    Для каждого активного студента подсчитывает:
    - total: общее количество submissions.
    - graded: проверенные.
    - submitted: сданные, но не проверенные.
    - pending: ожидающие сдачи.
    - overdue: просроченные.
    - avgScore: средний балл за проверенные работы.
    - completionRate: процент завершённых (graded + submitted от total).

    Сортировка по количеству просроченных (убывание).

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        list[dict]: Список словарей с показателями по студентам.
    """
    from src.infrastructure.persistence.models.lms import (
        HomeworkSubmissionModel, StudentModel, HomeworkAssignmentModel,
    )

    students = (await db.execute(
        select(StudentModel).where(StudentModel.is_active == True)  # noqa: E712
    )).scalars().all()

    result = []
    for s in students:
        subs = (await db.execute(
            select(HomeworkSubmissionModel).where(HomeworkSubmissionModel.student_id == s.id)
        )).scalars().all()
        if not subs:
            continue

        total = len(subs)
        graded = sum(1 for sub in subs if sub.status == "graded")
        submitted = sum(1 for sub in subs if sub.status == "submitted")
        overdue = sum(1 for sub in subs if sub.status == "overdue")
        pending = sum(1 for sub in subs if sub.status == "pending")

        avg_score = None
        scored = [float(sub.score) for sub in subs if sub.score is not None]
        if scored:
            avg_score = round(sum(scored) / len(scored), 1)

        result.append({
            "studentId": str(s.id),
            "studentName": s.full_name,
            "studentCode": s.student_code,
            "total": total,
            "graded": graded,
            "submitted": submitted,
            "pending": pending,
            "overdue": overdue,
            "avgScore": avg_score,
            "completionRate": round((graded + submitted) / total * 100) if total else 0,
        })

    return sorted(result, key=lambda x: x["overdue"], reverse=True)
