"""Integration tests — LMS Attendance API."""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.lms import (
    DirectionModel,
    EnrollmentModel,
    GroupModel,
    LessonModel,
    StudentModel,
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


async def _setup_attendance_prereqs(db: AsyncSession):
    """Create direction, group, lesson, students for attendance tests."""
    director = await _persist_user(db, email=f"dir_att_{uuid4().hex[:6]}@test.com", role=UserRole.DIRECTOR)
    d = DirectionModel(id=uuid4(), name="Att Dir", is_active=True)
    db.add(d)
    await db.commit()

    g = GroupModel(id=uuid4(), name="ATT-101", direction_id=d.id, is_active=True)
    db.add(g)
    await db.commit()

    # Create lesson in the future
    future_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
    lesson = LessonModel(
        id=uuid4(),
        group_id=g.id,
        scheduled_at=datetime.fromisoformat(f"{future_date}T10:00:00"),
        duration_minutes=60,
        status="scheduled",
    )
    db.add(lesson)
    await db.commit()

    # Create two students
    students = []
    for i in range(2):
        stu_user = await _persist_user(db, email=f"stu_att_{uuid4().hex[:6]}@test.com", role=UserRole.STUDENT)
        s = StudentModel(
            id=uuid4(),
            user_id=stu_user.id,
            full_name=f"Student Att {i+1}",
            student_code=f"SA{uuid4().hex[:6].upper()}",
        )
        db.add(s)
        await db.commit()
        enroll = EnrollmentModel(
            id=uuid4(),
            student_id=s.id,
            group_id=g.id,
            enrolled_at=datetime.utcnow(),
            is_active=True,
        )
        db.add(enroll)
        students.append(s)
    await db.commit()

    return {
        "director": director,
        "group": g,
        "lesson": lesson,
        "students": students,
    }


# ── POST /lms/attendance/lessons/{id}/bulk ───────────────────────────────────


class TestBulkAttendance:
    async def test_record_attendance(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_attendance_prereqs(db_session)
        director = prereqs["director"]
        lesson = prereqs["lesson"]
        students = prereqs["students"]

        resp = await client.post(
            f"/api/v1/lms/attendance/lessons/{lesson.id}/bulk",
            json={
                "records": [
                    {"student_id": str(students[0].id), "status": "present"},
                    {"student_id": str(students[1].id), "status": "late", "minutes_late": 10},
                ]
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        statuses = {r["student_id"]: r["status"] for r in data}
        assert statuses[str(students[0].id)] == "present"
        assert statuses[str(students[1].id)] == "late"

    async def test_invalid_status_rejected(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_attendance_prereqs(db_session)
        resp = await client.post(
            f"/api/v1/lms/attendance/lessons/{prereqs['lesson'].id}/bulk",
            json={
                "records": [
                    {"student_id": str(prereqs["students"][0].id), "status": "unknown_status"},
                ]
            },
            headers=auth_headers(prereqs["director"]),
        )
        assert resp.status_code == 400

    async def test_student_cannot_record_attendance(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_attendance_prereqs(db_session)
        stu_user = await _persist_user(db_session, email="stu_att_deny@test.com", role=UserRole.STUDENT)
        resp = await client.post(
            f"/api/v1/lms/attendance/lessons/{prereqs['lesson'].id}/bulk",
            json={
                "records": [
                    {"student_id": str(prereqs["students"][0].id), "status": "present"},
                ]
            },
            headers=auth_headers(stu_user),
        )
        assert resp.status_code == 403


# ── GET /lms/attendance/lessons/{id} ─────────────────────────────────────────


class TestGetLessonAttendance:
    async def test_get_attendance_empty(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_attendance_prereqs(db_session)
        resp = await client.get(
            f"/api/v1/lms/attendance/lessons/{prereqs['lesson'].id}",
            headers=auth_headers(prereqs["director"]),
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_get_attendance_after_recording(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_attendance_prereqs(db_session)
        director = prereqs["director"]
        lesson = prereqs["lesson"]
        students = prereqs["students"]

        # Record attendance first
        await client.post(
            f"/api/v1/lms/attendance/lessons/{lesson.id}/bulk",
            json={
                "records": [
                    {"student_id": str(students[0].id), "status": "present"},
                    {"student_id": str(students[1].id), "status": "absent"},
                ]
            },
            headers=auth_headers(director),
        )

        # Now retrieve
        resp = await client.get(
            f"/api/v1/lms/attendance/lessons/{lesson.id}",
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
