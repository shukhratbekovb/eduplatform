"""Integration tests — Student Portal API endpoints."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.gamification import (
    AchievementModel,
    StudentAchievementModel,
)
from src.infrastructure.persistence.models.lms import (
    DirectionModel,
    EnrollmentModel,
    GroupModel,
    HomeworkAssignmentModel,
    HomeworkSubmissionModel,
    LessonModel,
    StudentModel,
)
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from tests.conftest import auth_headers, make_user

pytestmark = pytest.mark.asyncio


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _create_student_env(db: AsyncSession):
    """Create a student user + StudentModel + direction + group + enrollment + lesson."""
    user = make_user(role=UserRole.STUDENT, name="Portal Student", email="portal_student@test.com")
    repo = SqlUserRepository(db)
    await repo.save(user)
    await db.commit()

    direction = DirectionModel(id=uuid4(), name="Python", is_active=True)
    db.add(direction)
    await db.commit()

    group = GroupModel(id=uuid4(), name="PY-101", direction_id=direction.id, is_active=True)
    db.add(group)
    await db.commit()

    student = StudentModel(
        id=uuid4(),
        user_id=user.id,
        full_name="Portal Student",
        phone="+998901234567",
        is_active=True,
        risk_level="low",
        stars=50,
        crystals=10,
        coins=0,
        badge_level="bronze",
        direction_id=direction.id,
    )
    db.add(student)
    await db.commit()

    enrollment = EnrollmentModel(
        id=uuid4(),
        student_id=student.id,
        group_id=group.id,
        enrolled_at=datetime.now(UTC),
        is_active=True,
    )
    db.add(enrollment)
    await db.commit()

    lesson = LessonModel(
        id=uuid4(),
        group_id=group.id,
        scheduled_at=datetime.now(UTC) + timedelta(hours=1),
        duration_minutes=60,
        status="scheduled",
        is_online=False,
    )
    db.add(lesson)
    await db.commit()

    return user, student, direction, group, lesson


# ── GET /student/dashboard ───────────────────────────────────────────────────


class TestStudentDashboard:
    async def test_student_gets_dashboard(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student, *_ = await _create_student_env(db_session)

        resp = await client.get("/api/v1/student/dashboard", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert data["student_id"] == str(student.id)
        assert data["full_name"] == "Portal Student"
        assert data["stars"] == 50
        assert data["crystals"] == 10
        assert data["badge_level"] == "bronze"
        assert data["risk_level"] == "low"

    async def test_non_student_forbidden(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = make_user(role=UserRole.DIRECTOR, email="dir_portal@test.com")
        repo = SqlUserRepository(db_session)
        await repo.save(director)
        await db_session.commit()

        resp = await client.get("/api/v1/student/dashboard", headers=auth_headers(director))
        assert resp.status_code == 403

    async def test_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/student/dashboard")
        assert resp.status_code in (401, 403)


# ── GET /student/schedule ────────────────────────────────────────────────────


class TestStudentSchedule:
    async def test_student_sees_schedule(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student, direction, group, lesson = await _create_student_env(db_session)

        resp = await client.get("/api/v1/student/schedule", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["groupNumber"] == "PY-101"

    async def test_teacher_cannot_access(self, client: AsyncClient, db_session: AsyncSession) -> None:
        teacher = make_user(role=UserRole.TEACHER, email="teacher_portal@test.com")
        repo = SqlUserRepository(db_session)
        await repo.save(teacher)
        await db_session.commit()

        resp = await client.get("/api/v1/student/schedule", headers=auth_headers(teacher))
        assert resp.status_code == 403


# ── GET /student/lessons ─────────────────────────────────────────────────────


class TestStudentLessons:
    async def test_student_sees_lessons(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, *_ = await _create_student_env(db_session)

        resp = await client.get("/api/v1/student/lessons", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1


# ── GET /student/homework ────────────────────────────────────────────────────


class TestStudentHomework:
    async def test_student_sees_homework(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student, direction, group, lesson = await _create_student_env(db_session)

        assignment = HomeworkAssignmentModel(
            id=uuid4(),
            lesson_id=lesson.id,
            title="Test HW",
            due_date=datetime.now(UTC) + timedelta(days=3),
        )
        db_session.add(assignment)
        await db_session.commit()

        submission = HomeworkSubmissionModel(
            id=uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status="pending",
        )
        db_session.add(submission)
        await db_session.commit()

        resp = await client.get("/api/v1/student/homework", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["title"] == "Test HW"
        assert data[0]["status"] == "pending"

    async def test_homework_empty_for_new_student(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, *_ = await _create_student_env(db_session)

        resp = await client.get("/api/v1/student/homework", headers=auth_headers(user))
        assert resp.status_code == 200
        assert resp.json() == []


# ── GET /student/achievements ────────────────────────────────────────────────


class TestStudentAchievements:
    async def test_student_sees_achievements(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student, *_ = await _create_student_env(db_session)

        achievement = AchievementModel(
            id=uuid4(),
            name="First Grade",
            category="academic",
            reward_stars=10,
            reward_crystals=0,
            is_active=True,
        )
        db_session.add(achievement)
        await db_session.commit()

        sa = StudentAchievementModel(
            id=uuid4(),
            student_id=student.id,
            achievement_id=achievement.id,
            unlocked_at=datetime.now(UTC),
        )
        db_session.add(sa)
        await db_session.commit()

        resp = await client.get("/api/v1/student/achievements", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "First Grade"

    async def test_no_achievements_returns_empty(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, *_ = await _create_student_env(db_session)

        resp = await client.get("/api/v1/student/achievements", headers=auth_headers(user))
        assert resp.status_code == 200
        assert resp.json() == []


# ── GET /student/leaderboard ─────────────────────────────────────────────────


class TestStudentLeaderboard:
    async def test_leaderboard_returns_students(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student, *_ = await _create_student_env(db_session)

        resp = await client.get("/api/v1/student/leaderboard", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        entry = data[0]
        assert "rank" in entry
        assert "fullName" in entry
        assert "points" in entry

    async def test_mup_cannot_access_leaderboard(self, client: AsyncClient, db_session: AsyncSession) -> None:
        mup = make_user(role=UserRole.MUP, email="mup_portal@test.com")
        repo = SqlUserRepository(db_session)
        await repo.save(mup)
        await db_session.commit()

        resp = await client.get("/api/v1/student/leaderboard", headers=auth_headers(mup))
        assert resp.status_code == 403
