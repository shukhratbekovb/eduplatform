"""Integration tests -- Public API endpoints (no auth required)."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.crm import (
    FunnelModel,
    LeadSourceModel,
    StageModel,
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


async def _make_landing_source(db: AsyncSession):  # type: ignore[no-untyped-def]
    """Create a funnel + stage + landing source with an api_key."""
    funnel = FunnelModel(
        id=uuid4(),
        name="Landing Funnel",
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

    api_key = secrets.token_urlsafe(32)
    source = LeadSourceModel(
        id=uuid4(),
        name="Test Landing",
        type="landing",
        is_active=True,
        funnel_id=funnel.id,
        api_key=api_key,
        created_at=datetime.now(UTC),
    )
    db.add(source)
    await db.commit()
    return funnel, stage, source


async def _make_api_source(db: AsyncSession):  # type: ignore[no-untyped-def]
    """Create a funnel + stage + API source with an api_key."""
    funnel = FunnelModel(
        id=uuid4(),
        name="API Funnel",
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
        color="#3B82F6",
        win_probability=10,
        order=0,
    )
    db.add(stage)
    await db.commit()

    api_key = secrets.token_urlsafe(32)
    source = LeadSourceModel(
        id=uuid4(),
        name="Test API Source",
        type="api",
        is_active=True,
        funnel_id=funnel.id,
        api_key=api_key,
        created_at=datetime.now(UTC),
    )
    db.add(source)
    await db.commit()
    return funnel, stage, source


# ── POST /public/website-lead ────────────────────────────────────────────────


class TestWebsiteLead:
    async def test_creates_lead_and_auto_provisions(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        # Need a manager so auto-assign works
        await _persist_user(db_session, email="mgr_web@test.com", role=UserRole.SALES_MANAGER)

        resp = await client.post(
            "/api/v1/public/website-lead",
            json={
                "fullName": "Website Visitor",
                "phone": "+998901111111",
                "direction": "Python",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["leadId"]
        assert data["message"]


# ── GET /public/forms/{api_key} ──────────────────────────────────────────────


class TestGetFormConfig:
    async def test_valid_key(self, client: AsyncClient, db_session: AsyncSession) -> None:
        funnel, stage, source = await _make_landing_source(db_session)

        resp = await client.get(f"/api/v1/public/forms/{source.api_key}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["sourceName"] == "Test Landing"
        assert data["funnelName"] == "Landing Funnel"
        assert isinstance(data["fields"], list)
        # Should always have fullName, phone, email base fields
        field_names = [f["name"] for f in data["fields"]]
        assert "fullName" in field_names
        assert "phone" in field_names

    async def test_invalid_key_returns_404(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/public/forms/nonexistent_key_12345")
        assert resp.status_code == 404


# ── POST /public/forms/{api_key}/submit ──────────────────────────────────────


class TestSubmitLandingForm:
    async def test_valid_submit(self, client: AsyncClient, db_session: AsyncSession) -> None:
        await _persist_user(db_session, email="mgr_land@test.com", role=UserRole.SALES_MANAGER)
        funnel, stage, source = await _make_landing_source(db_session)

        resp = await client.post(
            f"/api/v1/public/forms/{source.api_key}/submit",
            json={
                "fullName": "Landing Lead",
                "phone": "+998902222222",
                "email": "landing@example.com",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["leadId"]

    async def test_invalid_key(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/public/forms/bad_key_xyz/submit",
            json={
                "fullName": "Nobody",
                "phone": "+998900000000",
            },
        )
        assert resp.status_code == 404

    async def test_api_source_rejected(self, client: AsyncClient, db_session: AsyncSession) -> None:
        """A source of type 'api' should be rejected when accessed via /forms/ endpoint."""
        funnel, stage, source = await _make_api_source(db_session)

        resp = await client.post(
            f"/api/v1/public/forms/{source.api_key}/submit",
            json={
                "fullName": "Wrong Source Type",
                "phone": "+998903333333",
            },
        )
        assert resp.status_code == 400


# ── POST /public/api/{api_key}/leads ─────────────────────────────────────────


class TestSubmitApiLead:
    async def test_valid_api_lead(self, client: AsyncClient, db_session: AsyncSession) -> None:
        await _persist_user(db_session, email="mgr_api@test.com", role=UserRole.SALES_MANAGER)
        funnel, stage, source = await _make_api_source(db_session)

        resp = await client.post(
            f"/api/v1/public/api/{source.api_key}/leads",
            json={
                "fullName": "API Lead",
                "phone": "+998904444444",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["leadId"]

    async def test_wrong_source_type(self, client: AsyncClient, db_session: AsyncSession) -> None:
        """A landing source should be rejected on the /api/ endpoint."""
        funnel, stage, source = await _make_landing_source(db_session)

        resp = await client.post(
            f"/api/v1/public/api/{source.api_key}/leads",
            json={
                "fullName": "Wrong Type",
                "phone": "+998905555555",
            },
        )
        assert resp.status_code == 400

    async def test_invalid_key(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/public/api/nonexistent_key/leads",
            json={
                "fullName": "Nobody",
                "phone": "+998900000000",
            },
        )
        assert resp.status_code == 404
