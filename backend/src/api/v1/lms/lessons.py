"""CRUD-эндпоинты для управления уроками и проведение урока (conduct).

Предоставляет REST API для полного жизненного цикла урока:
создание, расписание, проведение (с отметкой посещаемости и оценками),
отмена, редактирование и удаление. Также управляет материалами уроков.

Ключевые бизнес-правила:
    - Предмет урока должен относиться к тому же направлению, что и группа.
    - При создании/редактировании проверяются конфликты по преподавателю,
      кабинету и группе (пересечение времени).
    - Проведение (conduct) доступно в день урока до 23:59. После — нужен
      одобренный запрос на позднее внесение (кроме директора/МУП).
    - При проведении автоматически начисляются звёзды/кристаллы
      через модуль геймификации, пересчитываются GPA и посещаемость.

Статусы урока (lesson_status):
    - scheduled: запланирован.
    - completed: проведён.
    - cancelled: отменён.

Роуты:
    POST /lessons — создание урока.
    POST /lessons/bulk — массовое создание серии уроков.
    GET /lessons — список уроков с фильтрацией.
    GET /lessons/{id} — получение урока.
    GET /lessons/{id}/full — урок + посещаемость + оценки + бриллианты + материалы.
    POST /lessons/{id}/conduct — проведение урока.
    POST /lessons/{id}/cancel — отмена урока.
    PATCH /lessons/{id} — редактирование урока.
    DELETE /lessons/{id} — удаление урока.
    GET /lessons/{id}/materials — материалы урока.
    POST /lessons/{id}/materials — добавление материала.
    DELETE /lessons/{id}/materials/{mid} — удаление материала.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Response, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Annotated
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import (
    AttendanceRecordModel, GradeRecordModel, DiamondRecordModel,
    LessonMaterialModel, LessonModel, GroupModel, SubjectModel, StudentModel,
)

router = APIRouter(prefix="/lessons", tags=["LMS - Lessons"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]
"""Гвард: доступ для директора, МУП и преподавателя."""

TeacherGuard = Annotated[object, Depends(require_roles("teacher"))]
"""Гвард: доступ только для преподавателя."""


class CamelModel(BaseModel):
    """Базовая Pydantic-модель с автоматическим преобразованием camelCase.

    Используется для request-схем, принимающих данные в camelCase
    от фронтенд-приложений.
    """
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ── Schemas ──────────────────────────────────────────────────────────────────

class LessonResponse(BaseModel):
    """Ответ с данными урока (camelCase).

    Attributes:
        id: UUID урока.
        groupId: UUID группы.
        subjectId: UUID предмета (nullable).
        teacherId: UUID преподавателя (nullable).
        roomId: UUID кабинета (nullable).
        date: Дата урока (YYYY-MM-DD).
        startTime: Время начала (HH:MM).
        endTime: Время окончания (HH:MM).
        status: Статус (scheduled, completed, cancelled).
        topic: Тема урока.
        isOnline: Флаг онлайн-урока.
        cancelReason: Причина отмены.
        createdAt: Дата создания (ISO).
    """
    id: UUID
    groupId: UUID
    subjectId: UUID | None = None
    teacherId: UUID | None = None
    roomId: UUID | None = None
    date: str
    startTime: str
    endTime: str
    status: str
    topic: str | None = None
    isOnline: bool = False
    cancelReason: str | None = None
    createdAt: str | None = None

    @classmethod
    def from_model(cls, m: LessonModel) -> LessonResponse:
        """Создаёт LessonResponse из ORM-модели LessonModel.

        Вычисляет дату, время начала и окончания из scheduled_at
        и duration_minutes.

        Args:
            m: ORM-модель урока.

        Returns:
            LessonResponse: Сериализованный ответ для фронтенда.
        """
        scheduled = m.scheduled_at
        duration = m.duration_minutes or 60
        d = scheduled.strftime("%Y-%m-%d") if scheduled else ""
        st = scheduled.strftime("%H:%M") if scheduled else "00:00"
        end_dt = scheduled + timedelta(minutes=duration) if scheduled else None
        et = end_dt.strftime("%H:%M") if end_dt else "00:00"
        return cls(
            id=m.id, groupId=m.group_id, subjectId=m.subject_id,
            teacherId=m.teacher_id, roomId=m.room_id,
            date=d, startTime=st, endTime=et,
            status=m.status, topic=m.topic, isOnline=m.is_online,
            cancelReason=m.cancel_reason,
            createdAt=m.created_at.isoformat() if m.created_at else None,
        )


class PagedLessons(BaseModel):
    """Пагинированный список уроков.

    Attributes:
        items: Массив уроков на текущей странице.
        total: Общее количество уроков.
        page: Текущая страница.
        pages: Общее количество страниц.
    """
    items: list[LessonResponse]
    total: int
    page: int
    pages: int


class CreateLessonRequest(CamelModel):
    """Запрос на создание одного урока.

    Attributes:
        group_id: UUID группы.
        subject_id: UUID предмета (опционально).
        teacher_id: UUID преподавателя (опционально).
        room_id: UUID кабинета (опционально).
        date: Дата урока (YYYY-MM-DD).
        start_time: Время начала (HH:MM).
        end_time: Время окончания (HH:MM).
        topic: Тема урока (опционально).
        is_online: Онлайн-формат (по умолчанию False).
    """
    group_id: UUID
    subject_id: UUID | None = None
    teacher_id: UUID | None = None
    room_id: UUID | None = None
    date: str            # YYYY-MM-DD
    start_time: str      # HH:MM
    end_time: str        # HH:MM
    topic: str | None = None
    is_online: bool = False


class BulkCreateRequest(CamelModel):
    """Запрос на массовое создание серии уроков.

    Создаёт уроки для указанных дней недели в заданном диапазоне дат.
    Уроки с конфликтами пропускаются.

    Attributes:
        group_id: UUID группы.
        subject_id: UUID предмета (опционально).
        teacher_id: UUID преподавателя (опционально).
        room_id: UUID кабинета (опционально).
        start_date: Начальная дата диапазона (YYYY-MM-DD).
        end_date: Конечная дата диапазона (YYYY-MM-DD).
        weekdays: Дни недели (1=Пн, ..., 7=Вс).
        start_time: Время начала (HH:MM).
        end_time: Время окончания (HH:MM).
    """
    group_id: UUID
    subject_id: UUID | None = None
    teacher_id: UUID | None = None
    room_id: UUID | None = None
    start_date: str      # YYYY-MM-DD
    end_date: str        # YYYY-MM-DD
    weekdays: list[int]  # 1=Mon … 7=Sun
    start_time: str      # HH:MM
    end_time: str        # HH:MM


class AttendanceIn(CamelModel):
    """Данные посещаемости одного студента при проведении урока.

    Attributes:
        student_id: UUID студента.
        status: Статус (present, absent, late, excused).
        note: Примечание (опционально).
    """
    student_id: UUID
    status: str
    note: str | None = None

class GradeIn(CamelModel):
    """Данные оценки одного студента при проведении урока.

    Attributes:
        student_id: UUID студента.
        grade: Оценка (0-10).
        comment: Комментарий (опционально).
    """
    student_id: UUID
    grade: float
    comment: str | None = None

class DiamondIn(CamelModel):
    """Данные начисления бриллиантов студенту при проведении урока.

    Attributes:
        student_id: UUID студента.
        diamonds: Количество бриллиантов для начисления.
    """
    student_id: UUID
    diamonds: int

class ConductRequest(CamelModel):
    """Запрос на проведение урока (conduct).

    Комплексный запрос, содержащий тему, посещаемость, оценки
    и начисления бриллиантов для всех студентов группы.

    Attributes:
        topic: Тема урока (обновляет существующую, опционально).
        attendance: Список записей посещаемости.
        grades: Список оценок (0-10).
        diamonds: Список начислений бриллиантов.
    """
    topic: str | None = None
    attendance: list[AttendanceIn] = []
    grades: list[GradeIn] = []
    diamonds: list[DiamondIn] = []


class CancelRequest(BaseModel):
    """Запрос на отмену урока.

    Attributes:
        reason: Причина отмены (обязательно).
    """
    reason: str


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _validate_subject_direction(db, group_id: UUID, subject_id: UUID | None) -> None:
    """Проверяет, что предмет относится к тому же направлению, что и группа.

    Args:
        db: Асинхронная сессия SQLAlchemy.
        group_id: UUID группы.
        subject_id: UUID предмета (None — проверка пропускается).

    Raises:
        HTTPException: 400 — если предмет не найден или его направление
            не совпадает с направлением группы.
    """
    if not subject_id:
        return
    group = (await db.execute(select(GroupModel).where(GroupModel.id == group_id))).scalar_one_or_none()
    if not group or not group.direction_id:
        return
    subj = (await db.execute(select(SubjectModel).where(SubjectModel.id == subject_id))).scalar_one_or_none()
    if not subj:
        raise HTTPException(status_code=400, detail="Subject not found")
    if subj.direction_id and subj.direction_id != group.direction_id:
        raise HTTPException(
            status_code=400,
            detail="Предмет не относится к направлению группы",
        )


async def _check_conflicts(
    db, scheduled_at: datetime, duration: int,
    group_id: UUID, teacher_id: UUID | None, room_id: UUID | None,
    exclude_id: UUID | None = None,
) -> None:
    """Проверяет конфликты расписания по преподавателю, кабинету и группе.

    Ищет пересечения по времени с существующими уроками. Урок считается
    пересекающимся, если: existing.start < new.end AND existing.end > new.start.

    Args:
        db: Асинхронная сессия SQLAlchemy.
        scheduled_at: Дата и время начала нового/редактируемого урока.
        duration: Длительность в минутах.
        group_id: UUID группы.
        teacher_id: UUID преподавателя (None — конфликт не проверяется).
        room_id: UUID кабинета (None — конфликт не проверяется).
        exclude_id: UUID урока для исключения (при редактировании).

    Raises:
        HTTPException: 409 Conflict — если обнаружены конфликты (список ошибок).
    """
    from sqlalchemy import and_, or_

    end_at = scheduled_at + timedelta(minutes=duration)
    # Overlaps: existing.start < new.end AND existing.end > new.start
    # existing.end = scheduled_at + duration_minutes (in minutes)
    base = select(LessonModel).where(
        LessonModel.status != "cancelled",
        LessonModel.scheduled_at < end_at,
        # scheduled_at + duration > new start
    )
    if exclude_id:
        base = base.where(LessonModel.id != exclude_id)

    # We need: existing_end > scheduled_at
    # existing_end = LessonModel.scheduled_at + interval(duration_minutes)
    # SQLAlchemy: use text or func
    from sqlalchemy import text as sa_text, literal_column

    overlap_cond = and_(
        LessonModel.status != "cancelled",
        LessonModel.scheduled_at < end_at,
        # LessonModel.scheduled_at + interval(duration_minutes minutes) > scheduled_at
        literal_column("scheduled_at + make_interval(mins => duration_minutes)") > scheduled_at,
    )
    if exclude_id:
        overlap_cond = and_(overlap_cond, LessonModel.id != exclude_id)

    errors: list[str] = []

    # Group conflict
    q = select(LessonModel.id).where(overlap_cond, LessonModel.group_id == group_id).limit(1)
    if (await db.execute(q)).scalar():
        errors.append("Группа уже занята в это время")

    # Teacher conflict
    if teacher_id:
        q = select(LessonModel.id).where(overlap_cond, LessonModel.teacher_id == teacher_id).limit(1)
        if (await db.execute(q)).scalar():
            errors.append("Преподаватель уже занят в это время")

    # Room conflict
    if room_id:
        q = select(LessonModel.id).where(overlap_cond, LessonModel.room_id == room_id).limit(1)
        if (await db.execute(q)).scalar():
            errors.append("Кабинет уже занят в это время")

    if errors:
        raise HTTPException(status_code=409, detail="; ".join(errors))


def _parse_scheduled(d: str, t: str) -> datetime:
    """Парсит дату и время из строк в объект datetime.

    Args:
        d: Дата в формате YYYY-MM-DD.
        t: Время в формате HH:MM.

    Returns:
        datetime: Объект datetime (без timezone).
    """
    return datetime.fromisoformat(f"{d}T{t}:00")


def _duration_minutes(start: str, end: str) -> int:
    """Вычисляет длительность в минутах между временем начала и окончания.

    Args:
        start: Время начала в формате HH:MM.
        end: Время окончания в формате HH:MM.

    Returns:
        int: Длительность в минутах.
    """
    h1, m1 = map(int, start.split(":"))
    h2, m2 = map(int, end.split(":"))
    return (h2 * 60 + m2) - (h1 * 60 + m1)


def _create_lesson_model(
    group_id: UUID, subject_id: UUID | None, teacher_id: UUID | None,
    room_id: UUID | None, d: str, start_time: str, end_time: str,
    is_online: bool = False, topic: str | None = None,
) -> LessonModel:
    """Создаёт ORM-модель урока с заполненными полями.

    Args:
        group_id: UUID группы.
        subject_id: UUID предмета.
        teacher_id: UUID преподавателя.
        room_id: UUID кабинета.
        d: Дата урока (YYYY-MM-DD).
        start_time: Время начала (HH:MM).
        end_time: Время окончания (HH:MM).
        is_online: Онлайн-формат.
        topic: Тема урока.

    Returns:
        LessonModel: Новая ORM-модель со статусом "scheduled".
    """
    return LessonModel(
        id=uuid4(),
        group_id=group_id,
        subject_id=subject_id,
        teacher_id=teacher_id,
        room_id=room_id,
        scheduled_at=_parse_scheduled(d, start_time),
        duration_minutes=_duration_minutes(start_time, end_time),
        status="scheduled",
        is_online=is_online,
        topic=topic,
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(body: CreateLessonRequest, _: StaffGuard, db: DbSession) -> LessonResponse:
    """Создание одного урока.

    Валидирует соответствие предмета направлению группы и
    проверяет конфликты расписания. Урок создаётся со статусом "scheduled".

    Args:
        body: Данные урока (группа, предмет, дата, время и т.д.).
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        LessonResponse: Созданный урок.

    Raises:
        HTTPException: 400 — если предмет не совпадает с направлением.
        HTTPException: 409 — если обнаружены конфликты расписания.
    """
    await _validate_subject_direction(db, body.group_id, body.subject_id)

    scheduled = _parse_scheduled(body.date, body.start_time)
    duration = _duration_minutes(body.start_time, body.end_time)
    await _check_conflicts(db, scheduled, duration, body.group_id, body.teacher_id, body.room_id)

    m = _create_lesson_model(
        group_id=body.group_id, subject_id=body.subject_id,
        teacher_id=body.teacher_id, room_id=body.room_id,
        d=body.date, start_time=body.start_time, end_time=body.end_time,
        is_online=body.is_online, topic=body.topic,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return LessonResponse.from_model(m)


@router.post("/bulk", response_model=list[LessonResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_lessons(body: BulkCreateRequest, _: StaffGuard, db: DbSession) -> list[LessonResponse]:
    """Массовое создание серии уроков по дням недели в диапазоне дат.

    Перебирает все даты в диапазоне [start_date, end_date], для каждого
    совпадающего дня недели пытается создать урок. Уроки с конфликтами
    пропускаются. Если все даты имеют конфликты — возвращается ошибка.

    Args:
        body: Параметры серии (группа, дни недели, время, диапазон дат).
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        list[LessonResponse]: Список успешно созданных уроков.

    Raises:
        HTTPException: 400 — если startDate > endDate или нет совпадающих дней.
        HTTPException: 409 — если все даты имеют конфликты.
    """
    from datetime import date as d_type

    start = d_type.fromisoformat(body.start_date)
    end = d_type.fromisoformat(body.end_date)
    if start > end:
        raise HTTPException(status_code=400, detail="startDate must be before endDate")

    await _validate_subject_direction(db, body.group_id, body.subject_id)

    duration = _duration_minutes(body.start_time, body.end_time)
    conflicts: list[str] = []
    created: list[LessonModel] = []
    cur = start
    while cur <= end:
        if cur.isoweekday() in body.weekdays:
            scheduled = _parse_scheduled(cur.isoformat(), body.start_time)
            try:
                await _check_conflicts(db, scheduled, duration, body.group_id, body.teacher_id, body.room_id)
                m = _create_lesson_model(
                    group_id=body.group_id, subject_id=body.subject_id,
                    teacher_id=body.teacher_id, room_id=body.room_id,
                    d=cur.isoformat(), start_time=body.start_time, end_time=body.end_time,
                )
                db.add(m)
                created.append(m)
            except HTTPException:
                conflicts.append(cur.isoformat())
        cur += timedelta(days=1)

    if not created and conflicts:
        raise HTTPException(status_code=409, detail=f"Все даты имеют конфликты: {', '.join(conflicts)}")
    if not created:
        raise HTTPException(status_code=400, detail="No lessons match the given weekdays in range")

    await db.commit()
    for m in created:
        await db.refresh(m)
    return [LessonResponse.from_model(m) for m in created]


@router.get("", response_model=PagedLessons)
async def list_lessons(
    current_user: CurrentUser,
    db: DbSession,
    group_id: UUID | None = Query(None, alias="groupId"),
    teacher_id: UUID | None = Query(None, alias="teacherId"),
    room_id: UUID | None = Query(None, alias="roomId"),
    lesson_status: str | None = Query(None, alias="status"),
    week_start: str | None = Query(None, alias="weekStart"),
    week_end: str | None = Query(None, alias="weekEnd"),
    date_from: str | None = Query(None, alias="dateFrom"),
    date_to: str | None = Query(None, alias="dateTo"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> PagedLessons:
    """Получение списка уроков с фильтрацией и пагинацией.

    Поддерживает фильтры: по группе, преподавателю, кабинету, статусу
    и диапазону дат (weekStart/weekEnd или dateFrom/dateTo).

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.
        group_id: Фильтр по UUID группы.
        teacher_id: Фильтр по UUID преподавателя.
        room_id: Фильтр по UUID кабинета.
        lesson_status: Фильтр по статусу (scheduled, completed, cancelled).
        week_start: Начало недели (YYYY-MM-DD).
        week_end: Конец недели (YYYY-MM-DD).
        date_from: Начальная дата (YYYY-MM-DD).
        date_to: Конечная дата (YYYY-MM-DD).
        page: Номер страницы.
        page_size: Размер страницы (1-200).

    Returns:
        PagedLessons: Пагинированный список уроков.
    """
    from sqlalchemy import func as fn

    q = select(LessonModel)
    if group_id:
        q = q.where(LessonModel.group_id == group_id)
    if teacher_id:
        q = q.where(LessonModel.teacher_id == teacher_id)
    if room_id:
        q = q.where(LessonModel.room_id == room_id)
    if lesson_status:
        q = q.where(LessonModel.status == lesson_status)
    start_str = week_start or date_from
    end_str = week_end or date_to
    if start_str:
        q = q.where(LessonModel.scheduled_at >= datetime.fromisoformat(start_str).replace(tzinfo=timezone.utc))
    if end_str:
        q = q.where(LessonModel.scheduled_at < datetime.fromisoformat(end_str).replace(tzinfo=timezone.utc) + timedelta(days=1))

    total = (await db.execute(select(fn.count()).select_from(q.subquery()))).scalar() or 0
    rows = (await db.execute(
        q.order_by(LessonModel.scheduled_at.asc().nullslast())
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    return PagedLessons(
        items=[LessonResponse.from_model(m) for m in rows],
        total=total, page=page,
        pages=max(1, -(-total // page_size)),
    )


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(lesson_id: UUID, current_user: CurrentUser, db: DbSession) -> LessonResponse:
    """Получение данных урока по UUID.

    Args:
        lesson_id: UUID урока.
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        LessonResponse: Данные урока.

    Raises:
        HTTPException: 404 — если урок не найден.
    """
    m = (await db.execute(select(LessonModel).where(LessonModel.id == lesson_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return LessonResponse.from_model(m)


@router.post("/{lesson_id}/conduct", response_model=LessonResponse)
async def conduct_lesson(lesson_id: UUID, body: ConductRequest, _: StaffGuard, current_user: CurrentUser, db: DbSession) -> LessonResponse:
    """Проведение урока — сохранение посещаемости, оценок и бриллиантов.

    Комплексная операция, выполняющая в рамках одной транзакции:
    1. Проверку статуса урока и окна ввода данных.
    2. Сохранение/обновление записей посещаемости (upsert по student_id).
    3. Сохранение/обновление оценок (upsert по student_id).
    4. Сохранение начислений бриллиантов от преподавателя.
    5. Автоначисление звёзд/кристаллов через движок геймификации.
    6. Пересчёт GPA и attendance_percent для всех затронутых студентов.
    7. Асинхронная генерация MUP-задач через Celery (если доступен).

    Окно ввода данных:
        - В день урока: доступно до 23:59.
        - После дня урока: только с одобренным запросом на позднее внесение
          (или для директора/МУП).

    Args:
        lesson_id: UUID урока для проведения.
        body: Данные проведения (тема, посещаемость, оценки, бриллианты).
        _: Гвард доступа персонала.
        current_user: Текущий пользователь (recorded_by, graded_by).
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        LessonResponse: Обновлённый урок со статусом "completed".

    Raises:
        HTTPException: 400 — если урок уже проведён или отменён.
        HTTPException: 403 — если время ввода данных истекло (для преподавателя).
        HTTPException: 404 — если урок не найден.
    """
    m = (await db.execute(select(LessonModel).where(LessonModel.id == lesson_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if m.status == "completed":
        raise HTTPException(status_code=400, detail="Already conducted")
    if m.status == "cancelled":
        raise HTTPException(status_code=400, detail="Lesson is cancelled")

    # Check edit window: lesson can be conducted on the same day (any time)
    # Compare dates only — ignore time, since server may be in different timezone
    now = datetime.now(timezone.utc)
    if m.scheduled_at:
        sched = m.scheduled_at if m.scheduled_at.tzinfo else m.scheduled_at.replace(tzinfo=timezone.utc)
        lesson_day_end = sched.replace(hour=23, minute=59, second=59)
        if now.date() < sched.date():
            raise HTTPException(status_code=400, detail="Урок ещё не начался")
        if now > lesson_day_end:
            # Allow directors/MUP to bypass, or if there's an approved late request
            if current_user.role not in ("director", "mup"):
                from src.infrastructure.persistence.models.lms import LateEntryRequestModel
                approved = (await db.execute(
                    select(LateEntryRequestModel.id).where(
                        LateEntryRequestModel.lesson_id == lesson_id,
                        LateEntryRequestModel.is_approved == True,  # noqa: E712
                    ).limit(1)
                )).scalar()
                if not approved:
                    raise HTTPException(
                        status_code=403,
                        detail="Время ввода данных истекло. Подайте запрос на позднее внесение.",
                    )

    m.status = "completed"
    if body.topic:
        m.topic = body.topic

    now_ts = datetime.now(timezone.utc)

    # Save attendance
    for att in body.attendance:
        existing = (await db.execute(
            select(AttendanceRecordModel).where(
                AttendanceRecordModel.lesson_id == lesson_id,
                AttendanceRecordModel.student_id == att.student_id,
            )
        )).scalar_one_or_none()
        if existing:
            existing.status = att.status
            existing.note = att.note
        else:
            db.add(AttendanceRecordModel(
                id=uuid4(), lesson_id=lesson_id, student_id=att.student_id,
                status=att.status, note=att.note,
                recorded_by=current_user.id, recorded_at=now_ts,
            ))

    # Save grades
    for gr in body.grades:
        existing = (await db.execute(
            select(GradeRecordModel).where(
                GradeRecordModel.lesson_id == lesson_id,
                GradeRecordModel.student_id == gr.student_id,
            )
        )).scalar_one_or_none()
        if existing:
            existing.score = gr.grade
            existing.comment = gr.comment
        else:
            grade_params: dict = {
                "id": uuid4(), "student_id": gr.student_id, "lesson_id": lesson_id,
                "type": "participation", "score": gr.grade, "max_score": 10,
                "comment": gr.comment, "graded_by": current_user.id, "graded_at": now_ts,
            }
            if m.subject_id:
                grade_params["subject_id"] = m.subject_id
            db.add(GradeRecordModel(**grade_params))

    # Save diamonds
    for dia in body.diamonds:
        db.add(DiamondRecordModel(
            id=uuid4(), lesson_id=lesson_id, student_id=dia.student_id,
            amount=dia.diamonds, reason="Урок",
            awarded_by=current_user.id, awarded_at=now_ts,
        ))

    await db.flush()

    # Gamification: auto-award stars/crystals
    from src.infrastructure.services.gamification_engine import on_lesson_conducted, on_diamonds_awarded

    att_map = {a.student_id: a.status for a in body.attendance}
    grade_map = {g.student_id: g.grade for g in body.grades}

    for sid in {a.student_id for a in body.attendance}:
        await on_lesson_conducted(
            student_id=sid,
            attendance_status=att_map.get(sid, "present"),
            grade=grade_map.get(sid),
            lesson_id=lesson_id,
            subject_id=m.subject_id,
            lesson_topic=m.topic,
            db=db,
        )

    for dia in body.diamonds:
        await on_diamonds_awarded(
            student_id=dia.student_id,
            amount=dia.diamonds,
            reason="Урок",
            awarded_by=current_user.id,
            lesson_id=lesson_id,
            db=db,
        )

    # Recalculate GPA and attendance for affected students
    from sqlalchemy import func as fn
    affected_ids = {a.student_id for a in body.attendance}
    for sid in affected_ids:
        # GPA = avg of all grades
        avg_gpa = (await db.execute(
            select(fn.avg(GradeRecordModel.score)).where(GradeRecordModel.student_id == sid)
        )).scalar()
        # Attendance = present / total * 100
        total_att = (await db.execute(
            select(fn.count()).where(AttendanceRecordModel.student_id == sid)
        )).scalar() or 0
        present_att = (await db.execute(
            select(fn.count()).where(
                AttendanceRecordModel.student_id == sid,
                AttendanceRecordModel.status.in_(["present", "late"]),
            )
        )).scalar() or 0
        att_pct = round(present_att / total_att * 100, 1) if total_att > 0 else 0.0

        student = (await db.execute(
            select(StudentModel).where(StudentModel.id == sid)
        )).scalar_one_or_none()
        if student:
            if avg_gpa is not None:
                student.gpa = round(float(avg_gpa), 2)
            student.attendance_percent = att_pct

    await db.commit()
    await db.refresh(m)

    # Trigger async auto-task generation via Celery/RabbitMQ
    try:
        from src.infrastructure.workers.tasks.auto_tasks import process_lesson_attendance
        process_lesson_attendance.delay(str(lesson_id))
    except Exception:
        pass  # Don't fail conduct if Celery is unavailable

    return LessonResponse.from_model(m)


@router.post("/{lesson_id}/cancel", response_model=LessonResponse)
async def cancel_lesson(lesson_id: UUID, body: CancelRequest, _: StaffGuard, db: DbSession) -> LessonResponse:
    """Отмена запланированного урока.

    Устанавливает статус "cancelled" и сохраняет причину отмены.

    Args:
        lesson_id: UUID урока для отмены.
        body: Причина отмены.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        LessonResponse: Обновлённый урок со статусом "cancelled".

    Raises:
        HTTPException: 404 — если урок не найден.
    """
    m = (await db.execute(select(LessonModel).where(LessonModel.id == lesson_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    m.status = "cancelled"
    m.cancel_reason = body.reason
    await db.commit()
    await db.refresh(m)
    return LessonResponse.from_model(m)


class UpdateLessonRequest(CamelModel):
    """Запрос на обновление урока.

    Все поля опциональны — обновляются только переданные.

    Attributes:
        date: Новая дата (YYYY-MM-DD).
        start_time: Новое время начала (HH:MM).
        end_time: Новое время окончания (HH:MM).
        subject_id: Новый UUID предмета.
        teacher_id: Новый UUID преподавателя.
        room_id: Новый UUID кабинета.
        topic: Новая тема урока.
    """
    date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    subject_id: UUID | None = None
    teacher_id: UUID | None = None
    room_id: UUID | None = None
    topic: str | None = None


@router.patch("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(lesson_id: UUID, body: UpdateLessonRequest, _: StaffGuard, db: DbSession) -> LessonResponse:
    """Редактирование запланированного урока.

    Позволяет изменить дату, время, предмет, преподавателя, кабинет и тему.
    Нельзя редактировать проведённые или прошедшие уроки.
    При изменении времени проверяются конфликты расписания.

    Args:
        lesson_id: UUID урока для редактирования.
        body: Поля для обновления.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        LessonResponse: Обновлённый урок.

    Raises:
        HTTPException: 400 — если урок проведён или прошёл.
        HTTPException: 404 — если урок не найден.
        HTTPException: 409 — если новое время конфликтует.
    """
    m = (await db.execute(select(LessonModel).where(LessonModel.id == lesson_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if m.status == "completed":
        raise HTTPException(status_code=400, detail="Нельзя редактировать проведённый урок")

    # Check if lesson day has passed
    if m.scheduled_at and datetime.now(timezone.utc).date() > m.scheduled_at.date():
        raise HTTPException(status_code=400, detail="Нельзя редактировать прошедший урок")

    new_date = body.date or (m.scheduled_at.strftime("%Y-%m-%d") if m.scheduled_at else None)
    new_start = body.start_time or (m.scheduled_at.strftime("%H:%M") if m.scheduled_at else None)
    new_end = body.end_time
    new_teacher = body.teacher_id if body.teacher_id is not None else m.teacher_id
    new_room = body.room_id if body.room_id is not None else m.room_id

    if new_date and new_start:
        scheduled = _parse_scheduled(new_date, new_start)
        duration = _duration_minutes(new_start, new_end or (m.scheduled_at + timedelta(minutes=m.duration_minutes or 60)).strftime("%H:%M")) if new_start else m.duration_minutes or 60
        await _check_conflicts(db, scheduled, duration, m.group_id, new_teacher, new_room, exclude_id=m.id)
        m.scheduled_at = scheduled
        if new_end:
            m.duration_minutes = _duration_minutes(new_start, new_end)

    if body.subject_id is not None:
        await _validate_subject_direction(db, m.group_id, body.subject_id)
        m.subject_id = body.subject_id
    if body.teacher_id is not None:
        m.teacher_id = body.teacher_id
    if body.room_id is not None:
        m.room_id = body.room_id
    if body.topic is not None:
        m.topic = body.topic

    await db.commit()
    await db.refresh(m)
    return LessonResponse.from_model(m)


@router.delete("/{lesson_id}")
async def delete_lesson(lesson_id: UUID, _: StaffGuard, db: DbSession) -> Response:
    """Удаление урока.

    Удаляет урок из БД. Нельзя удалить проведённый урок.

    Args:
        lesson_id: UUID урока для удаления.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        Response: 204 No Content.

    Raises:
        HTTPException: 400 — если урок уже проведён.
        HTTPException: 404 — если урок не найден.
    """
    m = (await db.execute(select(LessonModel).where(LessonModel.id == lesson_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if m.status == "completed":
        raise HTTPException(status_code=400, detail="Нельзя удалить проведённый урок")
    await db.delete(m)
    await db.commit()
    return Response(status_code=204)


# ── Lesson Full (lesson + attendance + grades + diamonds) ────────────────────

class AttendanceOut(BaseModel):
    """Запись посещаемости в контексте полной информации об уроке.

    Attributes:
        id: UUID записи.
        studentId: UUID студента.
        status: Статус посещаемости.
        note: Примечание.
    """
    id: UUID
    studentId: UUID
    status: str
    note: str | None


class GradeOut(BaseModel):
    """Запись оценки в контексте полной информации об уроке.

    Attributes:
        id: UUID записи.
        studentId: UUID студента.
        type: Тип оценки.
        value: Числовое значение оценки.
        comment: Комментарий.
    """
    id: UUID
    studentId: UUID
    type: str
    value: float
    comment: str | None


class DiamondOut(BaseModel):
    """Запись начисления бриллиантов в контексте урока.

    Attributes:
        id: UUID записи.
        studentId: UUID студента.
        amount: Количество бриллиантов.
        note: Примечание (причина начисления).
    """
    id: UUID
    studentId: UUID
    amount: int
    note: str | None


class MaterialOut(BaseModel):
    """Материал урока.

    Attributes:
        id: UUID материала.
        lessonId: UUID урока.
        title: Название.
        type: Тип (pdf, video, link, image, other).
        language: Язык (ru, en, uz).
        url: URL или signed URL файла.
        s3Key: Ключ в Google Cloud Storage.
        uploadedBy: UUID загрузившего.
        uploadedAt: Дата загрузки (ISO).
    """
    id: UUID
    lessonId: UUID
    title: str
    type: str
    language: str
    url: str
    s3Key: str | None = None
    uploadedBy: UUID | None
    uploadedAt: str


class LessonFullResponse(BaseModel):
    """Полная информация об уроке: данные + посещаемость + оценки + бриллианты + материалы.

    Используется для страницы деталей урока в Logbook.

    Attributes:
        lesson: Основные данные урока.
        attendance: Записи посещаемости.
        grades: Записи оценок.
        diamonds: Записи начислений бриллиантов.
        materials: Материалы урока.
    """
    lesson: LessonResponse
    attendance: list[AttendanceOut]
    grades: list[GradeOut]
    diamonds: list[DiamondOut]
    materials: list[MaterialOut]


@router.get("/{lesson_id}/full", response_model=LessonFullResponse)
async def get_lesson_full(lesson_id: UUID, current_user: CurrentUser, db: DbSession) -> LessonFullResponse:
    """Получение полной информации об уроке.

    Возвращает данные урока вместе с посещаемостью, оценками,
    начислениями бриллиантов и материалами в одном запросе.

    Args:
        lesson_id: UUID урока.
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        LessonFullResponse: Полная информация об уроке.

    Raises:
        HTTPException: 404 — если урок не найден.
    """
    m = (await db.execute(select(LessonModel).where(LessonModel.id == lesson_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    attendance = (await db.execute(
        select(AttendanceRecordModel).where(AttendanceRecordModel.lesson_id == lesson_id)
    )).scalars().all()
    grades = (await db.execute(
        select(GradeRecordModel).where(GradeRecordModel.lesson_id == lesson_id)
    )).scalars().all()
    diamonds = (await db.execute(
        select(DiamondRecordModel).where(DiamondRecordModel.lesson_id == lesson_id)
    )).scalars().all()
    materials = (await db.execute(
        select(LessonMaterialModel).where(LessonMaterialModel.lesson_id == lesson_id)
    )).scalars().all()

    return LessonFullResponse(
        lesson=LessonResponse.from_model(m),
        attendance=[AttendanceOut(id=a.id, studentId=a.student_id, status=a.status, note=a.note) for a in attendance],
        grades=[GradeOut(id=g.id, studentId=g.student_id, type=g.type, value=float(g.score), comment=g.comment) for g in grades],
        diamonds=[DiamondOut(id=d.id, studentId=d.student_id, amount=d.amount, note=d.reason) for d in diamonds],
        materials=[MaterialOut(
            id=m.id, lessonId=m.lesson_id, title=m.title, type=m.type,
            language=m.language, url=m.url, s3Key=m.s3_key, uploadedBy=m.uploaded_by,
            uploadedAt=m.created_at.isoformat() if m.created_at else "",
        ) for m in materials],
    )


# ── Lesson Materials CRUD ────────────────────────────────────────────────────

class AddMaterialRequest(BaseModel):
    """Запрос на добавление материала к уроку.

    Attributes:
        title: Название материала.
        type: Тип файла (pdf, video, link, image, other).
        language: Язык (ru, en, uz).
        url: URL файла или ссылка.
        key: Ключ S3/GCS (опционально, при загрузке через /files/upload).
    """
    title: str
    type: str = "pdf"
    language: str = "ru"
    url: str
    key: str | None = None


@router.get("/{lesson_id}/materials", response_model=list[MaterialOut])
async def list_materials(lesson_id: UUID, current_user: CurrentUser, db: DbSession) -> list[MaterialOut]:
    """Получение списка материалов урока.

    Args:
        lesson_id: UUID урока.
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        list[MaterialOut]: Список материалов урока.
    """
    rows = (await db.execute(
        select(LessonMaterialModel).where(LessonMaterialModel.lesson_id == lesson_id)
    )).scalars().all()
    return [MaterialOut(
        id=m.id, lessonId=m.lesson_id, title=m.title, type=m.type,
        language=m.language, url=m.url, s3Key=m.s3_key, uploadedBy=m.uploaded_by,
        uploadedAt=m.created_at.isoformat() if m.created_at else "",
    ) for m in rows]


@router.post("/{lesson_id}/materials", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
async def add_material(
    lesson_id: UUID, body: AddMaterialRequest,
    current_user: CurrentUser, db: DbSession,
) -> MaterialOut:
    """Добавление материала к уроку.

    Создаёт запись материала со ссылкой на файл (URL или GCS key).

    Args:
        lesson_id: UUID урока.
        body: Данные материала (title, type, url, key).
        current_user: Текущий пользователь (uploaded_by).
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        MaterialOut: Созданный материал.
    """
    now = datetime.now(timezone.utc)
    m = LessonMaterialModel(
        id=uuid4(), lesson_id=lesson_id,
        title=body.title, type=body.type, language=body.language, url=body.url,
        s3_key=body.key,
        uploaded_by=current_user.id, created_at=now, updated_at=now,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return MaterialOut(
        id=m.id, lessonId=m.lesson_id, title=m.title, type=m.type,
        language=m.language, url=m.url, s3Key=m.s3_key, uploadedBy=m.uploaded_by,
        uploadedAt=m.created_at.isoformat() if m.created_at else "",
    )


@router.delete("/{lesson_id}/materials/{material_id}")
async def delete_material(lesson_id: UUID, material_id: UUID, current_user: CurrentUser, db: DbSession) -> Response:
    """Удаление материала урока.

    Args:
        lesson_id: UUID урока.
        material_id: UUID материала для удаления.
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        Response: 204 No Content.

    Raises:
        HTTPException: 404 — если материал не найден.
    """
    m = (await db.execute(
        select(LessonMaterialModel).where(
            LessonMaterialModel.id == material_id,
            LessonMaterialModel.lesson_id == lesson_id,
        )
    )).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Material not found")
    await db.delete(m)
    await db.commit()
    return Response(status_code=204)
