"""Integration tests — LMS Lessons API."""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.lms import (
    DirectionModel,
    GroupModel,
    LessonModel,
    RoomModel,
    SubjectModel,
)
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from tests.conftest import auth_headers, make_user

pytestmark = pytest.mark.asyncio


async def _persist_user(db: AsyncSession, **kwargs):  # type: ignore[no-untyped-def]
    user = make_user(**kwargs)
    repo = SqlUserRepository(db)
    await repo.save(user)
    await db.commit()
    return user


async def _setup_lesson_prereqs(db: AsyncSession):
    """Create direction, subject, room, teacher, group for lesson tests."""
    teacher = await _persist_user(db, email=f"tch_les_{uuid4().hex[:6]}@test.com", role=UserRole.TEACHER)
    d = DirectionModel(id=uuid4(), name="Python Les", is_active=True)
    db.add(d)
    await db.commit()

    s = SubjectModel(id=uuid4(), name="OOP", direction_id=d.id, teacher_id=teacher.id, is_active=True)
    r = RoomModel(id=uuid4(), name="Room A", capacity=20, is_active=True)
    g = GroupModel(id=uuid4(), name="PY-LES-101", direction_id=d.id, is_active=True)
    db.add_all([s, r, g])
    await db.commit()

    return {
        "teacher": teacher,
        "direction": d,
        "subject": s,
        "room": r,
        "group": g,
    }


def _future_date(days: int = 30) -> str:
    """Return a date string days in the future."""
    return (datetime.utcnow() + timedelta(days=days)).strftime("%Y-%m-%d")


# ── POST /lms/lessons ────────────────────────────────────────────────────────


class TestCreateLesson:
    async def test_create_lesson(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_les_crt@test.com", role=UserRole.DIRECTOR)
        prereqs = await _setup_lesson_prereqs(db_session)

        resp = await client.post(
            "/api/v1/lms/lessons",
            json={
                "groupId": str(prereqs["group"].id),
                "subjectId": str(prereqs["subject"].id),
                "teacherId": str(prereqs["teacher"].id),
                "roomId": str(prereqs["room"].id),
                "date": _future_date(),
                "startTime": "10:00",
                "endTime": "11:00",
                "topic": "Intro to OOP",
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "scheduled"
        assert data["groupId"] == str(prereqs["group"].id)
        assert data["topic"] == "Intro to OOP"

    async def test_student_cannot_create_lesson(self, client: AsyncClient, db_session: AsyncSession) -> None:
        student = await _persist_user(db_session, email="stu_les_crt@test.com", role=UserRole.STUDENT)
        resp = await client.post(
            "/api/v1/lms/lessons",
            json={
                "groupId": str(uuid4()),
                "date": _future_date(),
                "startTime": "10:00",
                "endTime": "11:00",
            },
            headers=auth_headers(student),
        )
        assert resp.status_code == 403


# ── GET /lms/lessons ─────────────────────────────────────────────────────────


class TestListLessons:
    async def test_list_with_date_filter(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_les_lst@test.com", role=UserRole.DIRECTOR)
        prereqs = await _setup_lesson_prereqs(db_session)

        future_date = _future_date(45)
        lesson = LessonModel(
            id=uuid4(),
            group_id=prereqs["group"].id,
            subject_id=prereqs["subject"].id,
            teacher_id=prereqs["teacher"].id,
            room_id=prereqs["room"].id,
            scheduled_at=datetime.fromisoformat(f"{future_date}T10:00:00"),
            duration_minutes=60,
            status="scheduled",
        )
        db_session.add(lesson)
        await db_session.commit()

        resp = await client.get(
            "/api/v1/lms/lessons",
            params={"dateFrom": future_date, "dateTo": future_date},
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        found_ids = [item["id"] for item in data["items"]]
        assert str(lesson.id) in found_ids

    async def test_list_filter_by_group(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_les_lstg@test.com", role=UserRole.DIRECTOR)
        prereqs = await _setup_lesson_prereqs(db_session)

        lesson = LessonModel(
            id=uuid4(),
            group_id=prereqs["group"].id,
            scheduled_at=datetime.fromisoformat(f"{_future_date(50)}T14:00:00"),
            duration_minutes=60,
            status="scheduled",
        )
        db_session.add(lesson)
        await db_session.commit()

        resp = await client.get(
            "/api/v1/lms/lessons",
            params={"groupId": str(prereqs["group"].id)},
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1


# ── GET /lms/lessons/{id} ────────────────────────────────────────────────────


class TestGetLesson:
    async def test_get_existing(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_les_get@test.com", role=UserRole.DIRECTOR)
        prereqs = await _setup_lesson_prereqs(db_session)

        lesson = LessonModel(
            id=uuid4(),
            group_id=prereqs["group"].id,
            subject_id=prereqs["subject"].id,
            scheduled_at=datetime.fromisoformat(f"{_future_date(20)}T09:00:00"),
            duration_minutes=90,
            status="scheduled",
            topic="Test Topic",
        )
        db_session.add(lesson)
        await db_session.commit()

        resp = await client.get(f"/api/v1/lms/lessons/{lesson.id}", headers=auth_headers(director))
        assert resp.status_code == 200
        assert resp.json()["topic"] == "Test Topic"

    async def test_missing_returns_404(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_les_404@test.com", role=UserRole.DIRECTOR)
        resp = await client.get(f"/api/v1/lms/lessons/{uuid4()}", headers=auth_headers(director))
        assert resp.status_code == 404


# ── DELETE /lms/lessons/{id} ─────────────────────────────────────────────────


class TestDeleteLesson:
    async def test_delete_scheduled_lesson(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_les_del@test.com", role=UserRole.DIRECTOR)
        prereqs = await _setup_lesson_prereqs(db_session)

        lesson = LessonModel(
            id=uuid4(),
            group_id=prereqs["group"].id,
            scheduled_at=datetime.fromisoformat(f"{_future_date(60)}T10:00:00"),
            duration_minutes=60,
            status="scheduled",
        )
        db_session.add(lesson)
        await db_session.commit()

        resp = await client.delete(f"/api/v1/lms/lessons/{lesson.id}", headers=auth_headers(director))
        assert resp.status_code == 204

    async def test_delete_completed_lesson_fails(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_les_delc@test.com", role=UserRole.DIRECTOR)
        prereqs = await _setup_lesson_prereqs(db_session)

        lesson = LessonModel(
            id=uuid4(),
            group_id=prereqs["group"].id,
            scheduled_at=datetime.fromisoformat(f"{_future_date(10)}T10:00:00"),
            duration_minutes=60,
            status="completed",
        )
        db_session.add(lesson)
        await db_session.commit()

        resp = await client.delete(f"/api/v1/lms/lessons/{lesson.id}", headers=auth_headers(director))
        assert resp.status_code == 400

    async def test_delete_missing_returns_404(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_les_del404@test.com", role=UserRole.DIRECTOR)
        resp = await client.delete(f"/api/v1/lms/lessons/{uuid4()}", headers=auth_headers(director))
        assert resp.status_code == 404
