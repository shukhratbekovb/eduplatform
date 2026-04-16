from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.interfaces.repositories import LessonRepository, Page
from src.domain.lms.entities import Lesson, LessonStatus
from src.infrastructure.persistence.models.lms import LessonModel


def _to_domain(m: LessonModel) -> Lesson:
    # scheduled_at -> lesson_date + start_time
    lesson_date = m.scheduled_at.date() if m.scheduled_at else None
    start_time = m.scheduled_at.strftime("%H:%M") if m.scheduled_at else "00:00"
    # approximate end_time from duration_minutes
    if m.scheduled_at and m.duration_minutes:
        from datetime import timedelta
        end_dt = m.scheduled_at + timedelta(minutes=m.duration_minutes)
        end_time = end_dt.strftime("%H:%M")
    else:
        end_time = start_time

    from datetime import date
    return Lesson(
        id=m.id,
        group_id=m.group_id,
        teacher_id=m.teacher_id,
        room_id=m.room_id,
        lesson_date=lesson_date or date.today(),
        start_time=start_time,
        end_time=end_time,
        status=LessonStatus(m.status),
        topic=m.topic,
        is_online=m.is_online,
        cancel_reason=m.cancel_reason,
    )


def _apply_fields(m: LessonModel, lesson: Lesson) -> None:
    from datetime import timedelta
    # combine lesson_date + start_time into scheduled_at
    try:
        hour, minute = map(int, lesson.start_time.split(":"))
        end_hour, end_minute = map(int, lesson.end_time.split(":"))
        scheduled_at = datetime(
            lesson.lesson_date.year,
            lesson.lesson_date.month,
            lesson.lesson_date.day,
            hour,
            minute,
            tzinfo=timezone.utc,
        )
        duration = (end_hour * 60 + end_minute) - (hour * 60 + minute)
    except Exception:
        scheduled_at = datetime.now(timezone.utc)
        duration = 90

    m.group_id = lesson.group_id
    m.teacher_id = lesson.teacher_id
    m.room_id = lesson.room_id
    m.scheduled_at = scheduled_at
    m.duration_minutes = duration
    m.status = lesson.status.value
    m.topic = lesson.topic
    m.is_online = lesson.is_online
    m.cancel_reason = lesson.cancel_reason


class SqlLessonRepository(LessonRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get_by_id(self, lesson_id: UUID) -> Lesson | None:
        m = await self._s.get(LessonModel, lesson_id)
        return _to_domain(m) if m else None

    async def save(self, lesson: Lesson) -> None:
        existing = await self._s.get(LessonModel, lesson.id)
        if existing is None:
            m = LessonModel(id=lesson.id)
            _apply_fields(m, lesson)
            self._s.add(m)
        else:
            _apply_fields(existing, lesson)

    async def list(
        self,
        *,
        group_id: UUID | None = None,
        teacher_id: UUID | None = None,
        status: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Lesson]:
        q = select(LessonModel)
        if group_id is not None:
            q = q.where(LessonModel.group_id == group_id)
        if teacher_id is not None:
            q = q.where(LessonModel.teacher_id == teacher_id)
        if status is not None:
            q = q.where(LessonModel.status == status)
        if date_from is not None:
            q = q.where(LessonModel.scheduled_at >= date_from)
        if date_to is not None:
            q = q.where(LessonModel.scheduled_at <= date_to)

        total = (await self._s.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        q = q.order_by(LessonModel.scheduled_at).offset((page - 1) * page_size).limit(page_size)
        rows = (await self._s.execute(q)).scalars().all()
        return Page(items=[_to_domain(r) for r in rows], total=total, page=page, page_size=page_size)
