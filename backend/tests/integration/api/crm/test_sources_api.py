"""Integration tests -- CRM Lead Sources API."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.crm import FunnelModel, LeadSourceModel, StageModel
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from tests.conftest import auth_headers, make_user

pytestmark = pytest.mark.asyncio


async def _persist_user(db: AsyncSession, **kwargs):  # type: ignore[no-untyped-def]
    user = make_user(**kwargs)
    repo = SqlUserRepository(db)
    await repo.save(user)
    await db.commit()
    return user


async def _make_funnel(db: AsyncSession):  # type: ignore[no-untyped-def]
    funnel = FunnelModel(
        id=uuid4(),
        name="Sources Test Funnel",
        is_archived=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(funnel)
    await db.commit()

    stage = StageModel(
        id=uuid4(),
        funnel_id=funnel.id,
        name="New",
        color="#6366F1",
        win_probability=10,
        order=0,
    )
    db.add(stage)
    await db.commit()
    return funnel


# ── GET /crm/lead-sources ───────────────────────────────────────────────────


class TestListSources:
    async def test_lists_with_auto_singletons(self, client: AsyncClient, db_session: AsyncSession) -> None:
        manager = await _persist_user(db_session, email="mgr_src_list@test.com", role=UserRole.SALES_MANAGER)

        resp = await client.get("/api/v1/crm/lead-sources", headers=auth_headers(manager))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # Should include auto-created singletons (manual + import)
        types = [s["type"] for s in data]
        assert "manual" in types
        assert "import" in types


# ── POST /crm/lead-sources ──────────────────────────────────────────────────


class TestCreateSource:
    async def test_create_landing_source(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_csrc1@test.com", role=UserRole.DIRECTOR)
        funnel = await _make_funnel(db_session)

        resp = await client.post(
            "/api/v1/crm/lead-sources",
            json={
                "name": "My Landing",
                "type": "landing",
                "funnelId": str(funnel.id),
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "My Landing"
        assert data["type"] == "landing"
        assert data["apiKey"] is not None
        assert data["isSystemSource"] is False

    async def test_create_api_source(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_csrc2@test.com", role=UserRole.DIRECTOR)
        funnel = await _make_funnel(db_session)

        resp = await client.post(
            "/api/v1/crm/lead-sources",
            json={
                "name": "External API",
                "type": "api",
                "funnelId": str(funnel.id),
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "api"
        assert data["apiKey"] is not None

    async def test_block_manual_duplicate(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_csrc3@test.com", role=UserRole.DIRECTOR)
        # Ensure singleton exists first
        manual = LeadSourceModel(
            id=uuid4(),
            name="Existing Manual",
            type="manual",
            is_active=True,
            created_at=datetime.now(UTC),
        )
        db_session.add(manual)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/crm/lead-sources",
            json={"name": "Another Manual", "type": "manual"},
            headers=auth_headers(director),
        )
        assert resp.status_code == 409


# ── DELETE /crm/lead-sources/{id} ────────────────────────────────────────────


class TestDeleteSource:
    async def test_delete_non_system(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_dsrc1@test.com", role=UserRole.DIRECTOR)
        funnel = await _make_funnel(db_session)
        source = LeadSourceModel(
            id=uuid4(),
            name="Landing To Delete",
            type="landing",
            is_active=True,
            funnel_id=funnel.id,
            api_key=secrets.token_urlsafe(32),
            created_at=datetime.now(UTC),
        )
        db_session.add(source)
        await db_session.commit()

        resp = await client.delete(
            f"/api/v1/crm/lead-sources/{source.id}",
            headers=auth_headers(director),
        )
        assert resp.status_code == 204

    async def test_block_system_source_delete(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_dsrc2@test.com", role=UserRole.DIRECTOR)
        manual = LeadSourceModel(
            id=uuid4(),
            name="Manual Source",
            type="manual",
            is_active=True,
            created_at=datetime.now(UTC),
        )
        db_session.add(manual)
        await db_session.commit()

        resp = await client.delete(
            f"/api/v1/crm/lead-sources/{manual.id}",
            headers=auth_headers(director),
        )
        assert resp.status_code == 403


# ── POST /crm/lead-sources/{id}/regenerate-key ──────────────────────────────


class TestRegenerateKey:
    async def test_regenerate(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_regen@test.com", role=UserRole.DIRECTOR)
        funnel = await _make_funnel(db_session)
        old_key = secrets.token_urlsafe(32)
        source = LeadSourceModel(
            id=uuid4(),
            name="Regen Source",
            type="landing",
            is_active=True,
            funnel_id=funnel.id,
            api_key=old_key,
            created_at=datetime.now(UTC),
        )
        db_session.add(source)
        await db_session.commit()

        resp = await client.post(
            f"/api/v1/crm/lead-sources/{source.id}/regenerate-key",
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["apiKey"] is not None
        assert data["apiKey"] != old_key
