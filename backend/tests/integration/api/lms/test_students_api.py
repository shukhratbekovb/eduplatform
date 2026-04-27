"""Integration tests — LMS Students API."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.lms import StudentModel
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from tests.conftest import auth_headers, make_user

pytestmark = pytest.mark.asyncio


async def _persist_user(db: AsyncSession, **kwargs):  # type: ignore[no-untyped-def]
    user = make_user(**kwargs)
    repo = SqlUserRepository(db)
    await repo.save(user)
    await db.commit()
    return user


async def _persist_student(db: AsyncSession, user_id, full_name: str = "Test Student"):  # type: ignore[no-untyped-def]
    from uuid import uuid4

    s = StudentModel(
        id=uuid4(),
        user_id=user_id,
        full_name=full_name,
        student_code=f"S{uuid4().hex[:6].upper()}",
    )
    db.add(s)
    await db.commit()
    return s


# ── GET /lms/students ─────────────────────────────────────────────────────────


class TestListStudents:
    async def test_director_can_list(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_list_s@test.com", role=UserRole.DIRECTOR)
        resp = await client.get("/api/v1/lms/students", headers=auth_headers(director))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (list, dict))

    async def test_student_cannot_list(self, client: AsyncClient, db_session: AsyncSession) -> None:
        student_user = await _persist_user(db_session, email="stu_list_s@test.com", role=UserRole.STUDENT)
        resp = await client.get("/api/v1/lms/students/", headers=auth_headers(student_user))
        assert resp.status_code == 403


# ── POST /lms/students ────────────────────────────────────────────────────────


class TestCreateStudent:
    @pytest.mark.skip(reason="Create student endpoint requires matching use case — tested via CRM contract flow")
    async def test_creates_student_profile(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_cstu@test.com", role=UserRole.DIRECTOR)
        target_user = await _persist_user(db_session, email="stu_target@test.com", role=UserRole.STUDENT)

        resp = await client.post(
            "/api/v1/lms/students",
            json={
                "user_id": str(target_user.id),
                "phone": "+998901234567",
                "full_name": target_user.name,
            },
            headers=auth_headers(director),
        )
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert "id" in data or "fullName" in data

    async def test_duplicate_raises_409(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_dup_stu@test.com", role=UserRole.DIRECTOR)
        target_user = await _persist_user(db_session, email="stu_dup_tgt@test.com", role=UserRole.STUDENT)
        await _persist_student(db_session, target_user.id)

        resp = await client.post(
            "/api/v1/lms/students/",
            json={"user_id": str(target_user.id)},
            headers=auth_headers(director),
        )
        assert resp.status_code in (400, 409)


# ── GET /lms/students/{id} ────────────────────────────────────────────────────


class TestGetStudent:
    async def test_get_existing(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_get_stu@test.com", role=UserRole.DIRECTOR)
        target_user = await _persist_user(db_session, email="stu_get_tgt@test.com", role=UserRole.STUDENT)
        s = await _persist_student(db_session, target_user.id, full_name="Bobur Aliyev")

        resp = await client.get(f"/api/v1/lms/students/{s.id}", headers=auth_headers(director))
        assert resp.status_code == 200
        assert resp.json()["fullName"] == "Bobur Aliyev"

    async def test_missing_returns_404(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_404_stu@test.com", role=UserRole.DIRECTOR)
        resp = await client.get(f"/api/v1/lms/students/{uuid4()}", headers=auth_headers(director))
        assert resp.status_code == 404
