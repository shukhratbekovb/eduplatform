"""Integration tests — LMS Grades API."""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.lms import (
    DirectionModel,
    GradeRecordModel,
    GroupModel,
    LessonModel,
    StudentModel,
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


async def _setup_grades_prereqs(db: AsyncSession):
    """Create direction, subject, group, lesson, student for grades tests."""
    director = await _persist_user(db, email=f"dir_grd_{uuid4().hex[:6]}@test.com", role=UserRole.DIRECTOR)
    teacher = await _persist_user(db, email=f"tch_grd_{uuid4().hex[:6]}@test.com", role=UserRole.TEACHER)

    d = DirectionModel(id=uuid4(), name="Grade Dir", is_active=True)
    db.add(d)
    await db.commit()

    s = SubjectModel(id=uuid4(), name="Algorithms", direction_id=d.id, teacher_id=teacher.id, is_active=True)
    g = GroupModel(id=uuid4(), name="GRD-101", direction_id=d.id, is_active=True)
    db.add_all([s, g])
    await db.commit()

    future_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
    lesson = LessonModel(
        id=uuid4(),
        group_id=g.id,
        subject_id=s.id,
        teacher_id=teacher.id,
        scheduled_at=datetime.fromisoformat(f"{future_date}T10:00:00"),
        duration_minutes=60,
        status="scheduled",
    )
    db.add(lesson)
    await db.commit()

    stu_user = await _persist_user(db, email=f"stu_grd_{uuid4().hex[:6]}@test.com", role=UserRole.STUDENT)
    student = StudentModel(
        id=uuid4(),
        user_id=stu_user.id,
        full_name="Grade Student",
        student_code=f"SG{uuid4().hex[:6].upper()}",
    )
    db.add(student)
    await db.commit()

    return {
        "director": director,
        "teacher": teacher,
        "direction": d,
        "subject": s,
        "group": g,
        "lesson": lesson,
        "student": student,
    }


# ── POST /lms/grades ────────────────────────────────────────────────────────


class TestCreateGrade:
    async def test_create_participation_grade(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_grades_prereqs(db_session)
        director = prereqs["director"]

        resp = await client.post(
            "/api/v1/lms/grades",
            json={
                "student_id": str(prereqs["student"].id),
                "subject_id": str(prereqs["subject"].id),
                "lesson_id": str(prereqs["lesson"].id),
                "type": "participation",
                "score": 8.5,
                "max_score": 10.0,
                "comment": "Good work",
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["score"] == 8.5
        assert data["type"] == "participation"
        assert data["student_id"] == str(prereqs["student"].id)

    async def test_create_homework_grade(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_grades_prereqs(db_session)
        resp = await client.post(
            "/api/v1/lms/grades",
            json={
                "student_id": str(prereqs["student"].id),
                "subject_id": str(prereqs["subject"].id),
                "type": "homework",
                "score": 9.0,
                "max_score": 10.0,
            },
            headers=auth_headers(prereqs["director"]),
        )
        assert resp.status_code == 201
        assert resp.json()["type"] == "homework"

    async def test_invalid_type_rejected(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_grades_prereqs(db_session)
        resp = await client.post(
            "/api/v1/lms/grades",
            json={
                "student_id": str(prereqs["student"].id),
                "subject_id": str(prereqs["subject"].id),
                "type": "invalid_type",
                "score": 5.0,
            },
            headers=auth_headers(prereqs["director"]),
        )
        assert resp.status_code == 400

    async def test_score_exceeding_max_rejected(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_grades_prereqs(db_session)
        resp = await client.post(
            "/api/v1/lms/grades",
            json={
                "student_id": str(prereqs["student"].id),
                "subject_id": str(prereqs["subject"].id),
                "type": "quiz",
                "score": 15.0,
                "max_score": 10.0,
            },
            headers=auth_headers(prereqs["director"]),
        )
        assert resp.status_code == 400

    async def test_student_cannot_create_grade(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_grades_prereqs(db_session)
        stu_user = await _persist_user(db_session, email="stu_grd_deny@test.com", role=UserRole.STUDENT)
        resp = await client.post(
            "/api/v1/lms/grades",
            json={
                "student_id": str(prereqs["student"].id),
                "subject_id": str(prereqs["subject"].id),
                "type": "participation",
                "score": 5.0,
            },
            headers=auth_headers(stu_user),
        )
        assert resp.status_code == 403


# ── GET /lms/grades/students/{id} ────────────────────────────────────────────


class TestGetStudentGrades:
    async def test_get_empty_grades(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_grades_prereqs(db_session)
        resp = await client.get(
            f"/api/v1/lms/grades/students/{prereqs['student'].id}",
            headers=auth_headers(prereqs["director"]),
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) == 0

    async def test_get_grades_after_creation(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_grades_prereqs(db_session)
        director = prereqs["director"]
        student = prereqs["student"]
        subject = prereqs["subject"]

        # Create a grade via ORM directly
        grade = GradeRecordModel(
            id=uuid4(),
            student_id=student.id,
            subject_id=subject.id,
            lesson_id=prereqs["lesson"].id,
            type="participation",
            score=7.5,
            max_score=10.0,
            graded_by=director.id,
            graded_at=datetime.utcnow(),
        )
        db_session.add(grade)
        await db_session.commit()

        resp = await client.get(
            f"/api/v1/lms/grades/students/{student.id}",
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["score"] == 7.5

    async def test_filter_grades_by_subject(self, client: AsyncClient, db_session: AsyncSession) -> None:
        prereqs = await _setup_grades_prereqs(db_session)
        director = prereqs["director"]
        student = prereqs["student"]
        subject = prereqs["subject"]

        # Create another subject
        other_subject = SubjectModel(
            id=uuid4(), name="Other Subject", direction_id=prereqs["direction"].id, is_active=True
        )
        db_session.add(other_subject)
        await db_session.commit()

        # Grade for first subject
        g1 = GradeRecordModel(
            id=uuid4(),
            student_id=student.id,
            subject_id=subject.id,
            type="quiz",
            score=9.0,
            max_score=10.0,
            graded_by=director.id,
            graded_at=datetime.utcnow(),
        )
        # Grade for other subject
        g2 = GradeRecordModel(
            id=uuid4(),
            student_id=student.id,
            subject_id=other_subject.id,
            type="exam",
            score=6.0,
            max_score=10.0,
            graded_by=director.id,
            graded_at=datetime.utcnow(),
        )
        db_session.add_all([g1, g2])
        await db_session.commit()

        resp = await client.get(
            f"/api/v1/lms/grades/students/{student.id}",
            params={"subject_id": str(subject.id)},
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["score"] == 9.0
