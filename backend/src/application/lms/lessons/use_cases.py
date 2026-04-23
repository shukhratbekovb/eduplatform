"""LMS Lesson use cases."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from uuid import UUID, uuid4

from src.application.interfaces.repositories import GroupRepository, LessonRepository, Page
from src.domain.lms.entities import Lesson, LessonStatus


@dataclass
class CreateLessonInput:
    group_id: UUID
    lesson_date: date
    start_time: str
    end_time: str
    teacher_id: UUID | None = None
    room_id: UUID | None = None
    is_online: bool = False
    topic: str | None = None


class CreateLessonUseCase:
    def __init__(self, lessons: LessonRepository, groups: GroupRepository) -> None:
        self._lessons = lessons
        self._groups = groups

    async def execute(self, inp: CreateLessonInput) -> Lesson:
        group = await self._groups.get_by_id(inp.group_id)
        if group is None:
            raise ValueError(f"Group {inp.group_id} not found")

        lesson = Lesson.create(
            group_id=inp.group_id,
            lesson_date=inp.lesson_date,
            start_time=inp.start_time,
            end_time=inp.end_time,
            teacher_id=inp.teacher_id,
            room_id=inp.room_id,
            is_online=inp.is_online,
            topic=inp.topic,
        )
        await self._lessons.save(lesson)
        return lesson


class ConductLessonUseCase:
    def __init__(self, lessons: LessonRepository) -> None:
        self._lessons = lessons

    async def execute(self, lesson_id: UUID, topic: str | None = None) -> Lesson:
        lesson = await self._lessons.get_by_id(lesson_id)
        if lesson is None:
            raise ValueError(f"Lesson {lesson_id} not found")
        lesson.conduct(topic)
        await self._lessons.save(lesson)
        return lesson


class CancelLessonUseCase:
    def __init__(self, lessons: LessonRepository) -> None:
        self._lessons = lessons

    async def execute(self, lesson_id: UUID, reason: str) -> Lesson:
        lesson = await self._lessons.get_by_id(lesson_id)
        if lesson is None:
            raise ValueError(f"Lesson {lesson_id} not found")
        lesson.cancel(reason)
        await self._lessons.save(lesson)
        return lesson


class ListLessonsUseCase:
    def __init__(self, lessons: LessonRepository) -> None:
        self._lessons = lessons

    async def execute(
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
        return await self._lessons.list(
            group_id=group_id,
            teacher_id=teacher_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size,
        )


class GetLessonUseCase:
    def __init__(self, lessons: LessonRepository) -> None:
        self._lessons = lessons

    async def execute(self, lesson_id: UUID) -> Lesson:
        lesson = await self._lessons.get_by_id(lesson_id)
        if lesson is None:
            raise ValueError(f"Lesson {lesson_id} not found")
        return lesson
