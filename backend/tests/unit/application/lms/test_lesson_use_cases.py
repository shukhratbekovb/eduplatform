"""Unit tests — LMS Lesson use cases (in-memory repos)."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import uuid4

import pytest

from src.application.interfaces.repositories import Page
from src.application.lms.lessons.use_cases import (
    CancelLessonUseCase,
    ConductLessonUseCase,
    CreateLessonInput,
    CreateLessonUseCase,
    GetLessonUseCase,
    ListLessonsUseCase,
)
from src.domain.lms.entities import Group, Lesson, LessonStatus

# ── In-memory stubs ──────────────────────────────────────────────────────────


class InMemoryGroupRepo:
    def __init__(self) -> None:
        self._store: dict[Any, Group] = {}

    async def get_by_id(self, group_id: Any) -> Group | None:
        return self._store.get(group_id)

    async def save(self, group: Group) -> None:
        self._store[group.id] = group

    async def list(self, **kw: Any) -> Page[Group]:
        items = list(self._store.values())
        return Page(items=items, total=len(items), page=1, page_size=20)


class InMemoryLessonRepo:
    def __init__(self) -> None:
        self._store: dict[Any, Lesson] = {}

    async def get_by_id(self, lesson_id: Any) -> Lesson | None:
        return self._store.get(lesson_id)

    async def save(self, lesson: Lesson) -> None:
        self._store[lesson.id] = lesson

    async def list(self, **kw: Any) -> Page[Lesson]:
        items = list(self._store.values())
        return Page(items=items, total=len(items), page=kw.get("page", 1), page_size=kw.get("page_size", 20))


# ── CreateLessonUseCase ──────────────────────────────────────────────────────


class TestCreateLessonUseCase:
    async def test_creates_lesson(self) -> None:
        groups = InMemoryGroupRepo()
        lessons = InMemoryLessonRepo()
        group = Group.create("PY-101")
        await groups.save(group)

        uc = CreateLessonUseCase(lessons, groups)
        lesson = await uc.execute(
            CreateLessonInput(
                group_id=group.id,
                lesson_date=date(2026, 4, 25),
                start_time="09:00",
                end_time="10:30",
                topic="Intro to Python",
            )
        )
        assert lesson.group_id == group.id
        assert lesson.lesson_date == date(2026, 4, 25)
        assert lesson.start_time == "09:00"
        assert lesson.end_time == "10:30"
        assert lesson.topic == "Intro to Python"
        assert lesson.status == LessonStatus.SCHEDULED

    async def test_creates_lesson_with_teacher(self) -> None:
        groups = InMemoryGroupRepo()
        lessons = InMemoryLessonRepo()
        group = Group.create("JS-201")
        await groups.save(group)
        teacher_id = uuid4()

        uc = CreateLessonUseCase(lessons, groups)
        lesson = await uc.execute(
            CreateLessonInput(
                group_id=group.id,
                lesson_date=date(2026, 5, 1),
                start_time="14:00",
                end_time="15:30",
                teacher_id=teacher_id,
            )
        )
        assert lesson.teacher_id == teacher_id

    async def test_missing_group_raises(self) -> None:
        uc = CreateLessonUseCase(InMemoryLessonRepo(), InMemoryGroupRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(
                CreateLessonInput(
                    group_id=uuid4(),
                    lesson_date=date(2026, 4, 25),
                    start_time="09:00",
                    end_time="10:30",
                )
            )

    async def test_saves_to_repo(self) -> None:
        groups = InMemoryGroupRepo()
        lessons = InMemoryLessonRepo()
        group = Group.create("G1")
        await groups.save(group)

        uc = CreateLessonUseCase(lessons, groups)
        lesson = await uc.execute(
            CreateLessonInput(
                group_id=group.id,
                lesson_date=date(2026, 4, 25),
                start_time="09:00",
                end_time="10:30",
            )
        )
        saved = await lessons.get_by_id(lesson.id)
        assert saved is not None


# ── ConductLessonUseCase ─────────────────────────────────────────────────────


class TestConductLessonUseCase:
    async def test_conducts_lesson(self) -> None:
        lessons = InMemoryLessonRepo()
        lesson = Lesson.create(
            group_id=uuid4(),
            lesson_date=date(2026, 4, 25),
            start_time="09:00",
            end_time="10:30",
        )
        await lessons.save(lesson)

        uc = ConductLessonUseCase(lessons)
        result = await uc.execute(lesson.id, topic="Loops")
        assert result.status == LessonStatus.COMPLETED
        assert result.topic == "Loops"

    async def test_conduct_without_topic(self) -> None:
        lessons = InMemoryLessonRepo()
        lesson = Lesson.create(
            group_id=uuid4(),
            lesson_date=date(2026, 4, 25),
            start_time="09:00",
            end_time="10:30",
        )
        await lessons.save(lesson)

        uc = ConductLessonUseCase(lessons)
        result = await uc.execute(lesson.id)
        assert result.status == LessonStatus.COMPLETED

    async def test_conduct_already_completed_raises(self) -> None:
        lessons = InMemoryLessonRepo()
        lesson = Lesson.create(
            group_id=uuid4(),
            lesson_date=date(2026, 4, 25),
            start_time="09:00",
            end_time="10:30",
        )
        lesson.conduct("First conduct")
        await lessons.save(lesson)

        uc = ConductLessonUseCase(lessons)
        with pytest.raises(ValueError, match="Cannot conduct"):
            await uc.execute(lesson.id)

    async def test_missing_lesson_raises(self) -> None:
        uc = ConductLessonUseCase(InMemoryLessonRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(uuid4())


# ── CancelLessonUseCase ──────────────────────────────────────────────────────


class TestCancelLessonUseCase:
    async def test_cancels_lesson(self) -> None:
        lessons = InMemoryLessonRepo()
        lesson = Lesson.create(
            group_id=uuid4(),
            lesson_date=date(2026, 4, 25),
            start_time="09:00",
            end_time="10:30",
        )
        await lessons.save(lesson)

        uc = CancelLessonUseCase(lessons)
        result = await uc.execute(lesson.id, "Teacher absent")
        assert result.status == LessonStatus.CANCELLED
        assert result.cancel_reason == "Teacher absent"

    async def test_cancel_completed_raises(self) -> None:
        lessons = InMemoryLessonRepo()
        lesson = Lesson.create(
            group_id=uuid4(),
            lesson_date=date(2026, 4, 25),
            start_time="09:00",
            end_time="10:30",
        )
        lesson.conduct("Done")
        await lessons.save(lesson)

        uc = CancelLessonUseCase(lessons)
        with pytest.raises(ValueError, match="Cannot cancel"):
            await uc.execute(lesson.id, "Reason")

    async def test_cancel_empty_reason_raises(self) -> None:
        lessons = InMemoryLessonRepo()
        lesson = Lesson.create(
            group_id=uuid4(),
            lesson_date=date(2026, 4, 25),
            start_time="09:00",
            end_time="10:30",
        )
        await lessons.save(lesson)

        uc = CancelLessonUseCase(lessons)
        with pytest.raises(ValueError, match="reason"):
            await uc.execute(lesson.id, "   ")

    async def test_missing_lesson_raises(self) -> None:
        uc = CancelLessonUseCase(InMemoryLessonRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(uuid4(), "Reason")


# ── ListLessonsUseCase ───────────────────────────────────────────────────────


class TestListLessonsUseCase:
    async def test_list_all(self) -> None:
        lessons = InMemoryLessonRepo()
        for _ in range(3):
            l = Lesson.create(
                group_id=uuid4(),
                lesson_date=date(2026, 4, 25),
                start_time="09:00",
                end_time="10:30",
            )
            await lessons.save(l)

        uc = ListLessonsUseCase(lessons)
        page = await uc.execute()
        assert page.total == 3

    async def test_list_empty(self) -> None:
        uc = ListLessonsUseCase(InMemoryLessonRepo())
        page = await uc.execute()
        assert page.total == 0
        assert page.items == []


# ── GetLessonUseCase ─────────────────────────────────────────────────────────


class TestGetLessonUseCase:
    async def test_get_existing(self) -> None:
        lessons = InMemoryLessonRepo()
        lesson = Lesson.create(
            group_id=uuid4(),
            lesson_date=date(2026, 4, 25),
            start_time="09:00",
            end_time="10:30",
        )
        await lessons.save(lesson)

        uc = GetLessonUseCase(lessons)
        result = await uc.execute(lesson.id)
        assert result.id == lesson.id

    async def test_missing_raises(self) -> None:
        uc = GetLessonUseCase(InMemoryLessonRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(uuid4())
