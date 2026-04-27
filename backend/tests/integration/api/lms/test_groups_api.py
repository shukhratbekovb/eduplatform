"""Integration tests — LMS Groups API."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.lms import DirectionModel, GroupModel
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from tests.conftest import auth_headers, make_user

pytestmark = pytest.mark.asyncio


async def _persist_user(db: AsyncSession, **kwargs):  # type: ignore[no-untyped-def]
    user = make_user(**kwargs)
    repo = SqlUserRepository(db)
    await repo.save(user)
    await db.commit()
    return user


async def _make_direction(db: AsyncSession, name: str = "Test Direction") -> DirectionModel:
    d = DirectionModel(id=uuid4(), name=name, is_active=True)
    db.add(d)
    await db.commit()
    return d


# ── POST /lms/groups ────────────────────────────────────────────────────────


class TestCreateGroup:
    async def test_director_creates_group(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_grp_crt@test.com", role=UserRole.DIRECTOR)
        d = await _make_direction(db_session, "Python")

        resp = await client.post(
            "/api/v1/lms/groups",
            json={"name": "PY-101", "directionId": str(d.id)},
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "PY-101"
        assert data["directionId"] == str(d.id)
        assert data["isActive"] is True

    async def test_teacher_creates_group(self, client: AsyncClient, db_session: AsyncSession) -> None:
        teacher = await _persist_user(db_session, email="tch_grp_crt@test.com", role=UserRole.TEACHER)
        d = await _make_direction(db_session, "JS")

        resp = await client.post(
            "/api/v1/lms/groups",
            json={"name": "JS-201", "directionId": str(d.id)},
            headers=auth_headers(teacher),
        )
        assert resp.status_code == 201

    async def test_student_cannot_create_group(self, client: AsyncClient, db_session: AsyncSession) -> None:
        student = await _persist_user(db_session, email="stu_grp_crt@test.com", role=UserRole.STUDENT)
        resp = await client.post(
            "/api/v1/lms/groups",
            json={"name": "BAD-101"},
            headers=auth_headers(student),
        )
        assert resp.status_code == 403


# ── GET /lms/groups ──────────────────────────────────────────────────────────


class TestListGroups:
    async def test_list_groups(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_grp_lst@test.com", role=UserRole.DIRECTOR)
        d = await _make_direction(db_session, "DevOps")
        g = GroupModel(id=uuid4(), name="DO-101", direction_id=d.id, is_active=True)
        db_session.add(g)
        await db_session.commit()

        resp = await client.get("/api/v1/lms/groups", headers=auth_headers(director))
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        names = [item["name"] for item in data["data"]]
        assert "DO-101" in names

    async def test_filter_by_direction(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_grp_flt@test.com", role=UserRole.DIRECTOR)
        d1 = await _make_direction(db_session, "Direction A")
        d2 = await _make_direction(db_session, "Direction B")
        g1 = GroupModel(id=uuid4(), name="GA-101", direction_id=d1.id, is_active=True)
        g2 = GroupModel(id=uuid4(), name="GB-101", direction_id=d2.id, is_active=True)
        db_session.add_all([g1, g2])
        await db_session.commit()

        resp = await client.get(
            "/api/v1/lms/groups",
            params={"directionId": str(d1.id)},
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        names = [item["name"] for item in resp.json()["data"]]
        assert "GA-101" in names
        assert "GB-101" not in names


# ── GET /lms/groups/{id} ─────────────────────────────────────────────────────


class TestGetGroup:
    async def test_get_existing_group(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_grp_get@test.com", role=UserRole.DIRECTOR)
        d = await _make_direction(db_session, "Mobile")
        g = GroupModel(id=uuid4(), name="MB-301", direction_id=d.id, is_active=True)
        db_session.add(g)
        await db_session.commit()

        resp = await client.get(f"/api/v1/lms/groups/{g.id}", headers=auth_headers(director))
        assert resp.status_code == 200
        assert resp.json()["name"] == "MB-301"

    async def test_missing_group_returns_404(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_grp_404@test.com", role=UserRole.DIRECTOR)
        resp = await client.get(f"/api/v1/lms/groups/{uuid4()}", headers=auth_headers(director))
        assert resp.status_code == 404


# ── PATCH /lms/groups/{id} ───────────────────────────────────────────────────


class TestUpdateGroup:
    async def test_update_group_name(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_grp_upd@test.com", role=UserRole.DIRECTOR)
        d = await _make_direction(db_session, "Data Science")
        g = GroupModel(id=uuid4(), name="DS-100", direction_id=d.id, is_active=True)
        db_session.add(g)
        await db_session.commit()

        resp = await client.patch(
            f"/api/v1/lms/groups/{g.id}",
            json={"name": "DS-101-Updated"},
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "DS-101-Updated"

    async def test_update_missing_group_returns_404(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_grp_upd404@test.com", role=UserRole.DIRECTOR)
        resp = await client.patch(
            f"/api/v1/lms/groups/{uuid4()}",
            json={"name": "Ghost"},
            headers=auth_headers(director),
        )
        assert resp.status_code == 404
