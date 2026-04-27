"""API для записи и получения данных о посещаемости уроков.

Предоставляет эндпоинты для массовой записи посещаемости,
получения посещаемости по уроку и по студенту.
Автоматически пересчитывает процент посещаемости студента.

Допустимые статусы посещаемости:
    - present: присутствовал.
    - absent: отсутствовал.
    - late: опоздал.
    - excused: уважительная причина.

Доступ: директор, МУП, преподаватель (TeacherGuard).

Роуты:
    POST /attendance/lessons/{lesson_id}/bulk — массовая запись посещаемости.
    GET /attendance/lessons/{lesson_id} — посещаемость по уроку.
    GET /attendance/students/{student_id} — история посещаемости студента.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select, update

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import AttendanceRecordModel, StudentModel

router = APIRouter(prefix="/attendance", tags=["LMS - Attendance"])

TeacherGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]
"""Гвард: доступ для директора, МУП и преподавателя."""


class AttendanceRecordIn(BaseModel):
    """Входные данные для одной записи посещаемости.

    Attributes:
        student_id: UUID студента.
        status: Статус посещаемости (present, absent, late, excused).
        minutes_late: Количество минут опоздания (опционально).
        note: Примечание (опционально).
    """

    student_id: UUID
    status: str  # present | absent | late | excused
    minutes_late: int | None = None
    note: str | None = None


class BulkAttendanceRequest(BaseModel):
    """Запрос на массовую запись посещаемости.

    Attributes:
        records: Список записей посещаемости для всех студентов урока.
    """

    records: list[AttendanceRecordIn]


class AttendanceRecordOut(BaseModel):
    """Ответ с данными записи посещаемости.

    Attributes:
        id: UUID записи посещаемости.
        lesson_id: UUID урока.
        student_id: UUID студента.
        status: Статус (present, absent, late, excused).
        minutes_late: Минуты опоздания.
        note: Примечание.
        recorded_at: Дата и время записи (ISO формат).
    """

    id: UUID
    lesson_id: UUID
    student_id: UUID
    status: str
    minutes_late: int | None
    note: str | None
    recorded_at: str


VALID_STATUSES = {"present", "absent", "late", "excused"}
"""Допустимые значения статуса посещаемости."""


@router.post("/lessons/{lesson_id}/bulk", response_model=list[AttendanceRecordOut])
async def record_bulk_attendance(
    lesson_id: UUID,
    body: BulkAttendanceRequest,
    current_user: CurrentUser,
    _: TeacherGuard,
    db: DbSession,
) -> list[AttendanceRecordOut]:
    """Массовая запись посещаемости для всех студентов урока.

    Создаёт записи посещаемости для каждого студента в списке.
    После сохранения автоматически пересчитывает attendance_percent
    для всех затронутых студентов.

    Args:
        lesson_id: UUID урока.
        body: Список записей посещаемости.
        current_user: Текущий авторизованный пользователь (записывается в recorded_by).
        _: Гвард доступа.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        list[AttendanceRecordOut]: Созданные записи посещаемости.

    Raises:
        HTTPException: 400 — если указан невалидный статус посещаемости.
    """
    for rec in body.records:
        if rec.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status: {rec.status!r}")

    now = datetime.now(UTC)
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
        results.append(
            AttendanceRecordOut(
                id=m.id,
                lesson_id=lesson_id,
                student_id=rec.student_id,
                status=rec.status,
                minutes_late=rec.minutes_late,
                note=rec.note,
                recorded_at=now.isoformat(),
            )
        )

    await db.commit()

    # Update each student's attendance_percent
    student_ids = {rec.student_id for rec in body.records}
    for sid in student_ids:
        await _recalculate_attendance(sid, db)
    await db.commit()

    return results


async def _recalculate_attendance(student_id: UUID, db: DbSession) -> None:
    """Пересчитывает и обновляет процент посещаемости студента.

    Формула: (present + late) / total * 100.
    Результат сохраняется в поле attendance_percent модели StudentModel.

    Args:
        student_id: UUID студента для пересчёта.
        db: Асинхронная сессия SQLAlchemy.
    """
    total = (
        await db.execute(
            select(func.count(AttendanceRecordModel.id)).where(AttendanceRecordModel.student_id == student_id)
        )
    ).scalar_one() or 0

    if total == 0:
        return

    present = (
        await db.execute(
            select(func.count(AttendanceRecordModel.id)).where(
                AttendanceRecordModel.student_id == student_id,
                AttendanceRecordModel.status.in_(["present", "late"]),
            )
        )
    ).scalar_one() or 0

    pct = round((present / total) * 100, 2)
    await db.execute(update(StudentModel).where(StudentModel.id == student_id).values(attendance_percent=pct))


@router.get("/lessons/{lesson_id}", response_model=list[AttendanceRecordOut])
async def get_lesson_attendance(
    lesson_id: UUID,
    _: TeacherGuard,
    db: DbSession,
) -> list[AttendanceRecordOut]:
    """Получение записей посещаемости конкретного урока.

    Args:
        lesson_id: UUID урока.
        _: Гвард доступа.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        list[AttendanceRecordOut]: Все записи посещаемости для данного урока.
    """
    rows = (
        (await db.execute(select(AttendanceRecordModel).where(AttendanceRecordModel.lesson_id == lesson_id)))
        .scalars()
        .all()
    )

    return [
        AttendanceRecordOut(
            id=r.id,
            lesson_id=r.lesson_id,
            student_id=r.student_id,
            status=r.status,
            minutes_late=r.minutes_late,
            note=r.note,
            recorded_at=r.recorded_at.isoformat() if r.recorded_at else "",
        )
        for r in rows
    ]


@router.get("/students/{student_id}", response_model=list[AttendanceRecordOut])
async def get_student_attendance(
    student_id: UUID,
    _: TeacherGuard,
    db: DbSession,
) -> list[AttendanceRecordOut]:
    """Получение истории посещаемости студента.

    Возвращает последние 100 записей, отсортированных по дате
    в обратном порядке (сначала последние).

    Args:
        student_id: UUID студента.
        _: Гвард доступа.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        list[AttendanceRecordOut]: Записи посещаемости студента (до 100).
    """
    rows = (
        (
            await db.execute(
                select(AttendanceRecordModel)
                .where(AttendanceRecordModel.student_id == student_id)
                .order_by(AttendanceRecordModel.recorded_at.desc())
                .limit(100)
            )
        )
        .scalars()
        .all()
    )

    return [
        AttendanceRecordOut(
            id=r.id,
            lesson_id=r.lesson_id,
            student_id=r.student_id,
            status=r.status,
            minutes_late=r.minutes_late,
            note=r.note,
            recorded_at=r.recorded_at.isoformat() if r.recorded_at else "",
        )
        for r in rows
    ]
