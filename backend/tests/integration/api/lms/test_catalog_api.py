"""Integration tests — LMS Catalog API (directions, subjects, rooms)."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.lms import DirectionModel, SubjectModel
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from tests.conftest import auth_headers, make_user

pytestmark = pytest.mark.asyncio


async def _persist_user(db: AsyncSession, **kwargs):  # type: ignore[no-untyped-def]
    user = make_user(**kwargs)
    repo = SqlUserRepository(db)
    await repo.save(user)
    await db.commit()
    return user


# ── Directions ───────────────────────────────────────────────────────────────


class TestCreateDirection:
    async def test_director_creates_direction(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_cat_cdir@test.com", role=UserRole.DIRECTOR)
        resp = await client.post(
            "/api/v1/lms/directions",
            json={"name": "Python", "description": "Python Backend"},
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Python"
        assert data["isActive"] is True

    async def test_teacher_cannot_create_direction(self, client: AsyncClient, db_session: AsyncSession) -> None:
        teacher = await _persist_user(db_session, email="tch_cat_cdir@test.com", role=UserRole.TEACHER)
        resp = await client.post(
            "/api/v1/lms/directions",
            json={"name": "JS"},
            headers=auth_headers(teacher),
        )
        assert resp.status_code == 403

    async def test_student_blocked_by_platform_guard(self, client: AsyncClient, db_session: AsyncSession) -> None:
        student = await _persist_user(db_session, email="stu_cat_cdir@test.com", role=UserRole.STUDENT)
        resp = await client.post(
            "/api/v1/lms/directions",
            json={"name": "Java"},
            headers=auth_headers(student),
        )
        assert resp.status_code == 403


class TestListDirections:
    async def test_list_returns_created(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_cat_ldir@test.com", role=UserRole.DIRECTOR)
        # Create a direction first
        d = DirectionModel(id=uuid4(), name="DevOps", is_active=True)
        db_session.add(d)
        await db_session.commit()

        resp = await client.get("/api/v1/lms/directions", headers=auth_headers(director))
        assert resp.status_code == 200
        names = [item["name"] for item in resp.json()]
        assert "DevOps" in names


# ── Subjects ─────────────────────────────────────────────────────────────────


class TestCreateSubject:
    async def test_director_creates_subject_with_direction(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_cat_csub@test.com", role=UserRole.DIRECTOR)
        d = DirectionModel(id=uuid4(), name="Python Dir", is_active=True)
        db_session.add(d)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/lms/subjects",
            json={"name": "OOP Basics", "directionId": str(d.id)},
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "OOP Basics"
        assert data["directionId"] == str(d.id)


class TestListSubjects:
    async def test_filter_by_direction(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_cat_lsub@test.com", role=UserRole.DIRECTOR)
        d1 = DirectionModel(id=uuid4(), name="Dir A", is_active=True)
        d2 = DirectionModel(id=uuid4(), name="Dir B", is_active=True)
        db_session.add_all([d1, d2])
        await db_session.commit()

        s1 = SubjectModel(id=uuid4(), name="Subject A1", direction_id=d1.id, is_active=True)
        s2 = SubjectModel(id=uuid4(), name="Subject B1", direction_id=d2.id, is_active=True)
        db_session.add_all([s1, s2])
        await db_session.commit()

        resp = await client.get(
            "/api/v1/lms/subjects",
            params={"directionId": str(d1.id)},
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        names = [item["name"] for item in resp.json()]
        assert "Subject A1" in names
        assert "Subject B1" not in names


# ── Rooms ────────────────────────────────────────────────────────────────────


class TestCreateRoom:
    async def test_director_creates_room(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_cat_crm@test.com", role=UserRole.DIRECTOR)
        resp = await client.post(
            "/api/v1/lms/rooms",
            json={"name": "Room 101", "capacity": 25},
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Room 101"
        assert data["capacity"] == 25
        assert data["isActive"] is True


class TestListRooms:
    async def test_list_rooms(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_cat_lrm@test.com", role=UserRole.DIRECTOR)
        from src.infrastructure.persistence.models.lms import RoomModel

        r = RoomModel(id=uuid4(), name="Room 202", capacity=30, is_active=True)
        db_session.add(r)
        await db_session.commit()

        resp = await client.get("/api/v1/lms/rooms", headers=auth_headers(director))
        assert resp.status_code == 200
        names = [item["name"] for item in resp.json()]
        assert "Room 202" in names
