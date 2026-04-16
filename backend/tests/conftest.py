"""Shared pytest fixtures for all test layers."""
from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncGenerator
from typing import Any
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Force test environment before any src import
os.environ.setdefault("APP_ENV", "test")

from src.domain.auth.entities import User, UserRole
from src.domain.shared.value_objects import Email
from src.infrastructure.services.jwt_service import create_access_token
from src.infrastructure.services.password_service import hash_password


# ── Database (testcontainers) ─────────────────────────────────────────────────

@pytest.fixture(scope="session")
def pg_url() -> str:
    """
    Returns a PostgreSQL URL.
    If TESTCONTAINERS_HOST is set → use it (CI).
    Otherwise spin up a Docker container via testcontainers.
    """
    tc_url = os.environ.get("TEST_DATABASE_URL")
    if tc_url:
        return tc_url

    try:
        from testcontainers.postgres import PostgresContainer

        container = PostgresContainer("postgres:16-alpine")
        container.start()
        url = container.get_connection_url().replace("postgresql://", "postgresql+asyncpg://")
        # Store for cleanup — pytest-sessionfinish not trivial, so we just let Docker clean up
        return url
    except Exception:
        # Fallback: use local DB
        return "postgresql+asyncpg://edu:edu@localhost:5432/eduplatform_test"


@pytest_asyncio.fixture(scope="session")
async def engine(pg_url: str):  # type: ignore[no-untyped-def]
    from src.database import Base
    # Import all models so metadata is populated
    from src.infrastructure.persistence.models import auth, lms, crm, gamification  # noqa: F401

    eng = create_async_engine(pg_url, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture()
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:  # type: ignore[no-untyped-def]
    """Per-test transactional session — rolls back after each test."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        async with session.begin():
            yield session
            await session.rollback()


# ── App / HTTP client ─────────────────────────────────────────────────────────

@pytest_asyncio.fixture()
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient wired to the FastAPI app with the test DB session."""
    from src.main import create_app
    from src.database import get_db

    app = create_app()

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()


# ── Auth helpers ──────────────────────────────────────────────────────────────

def make_user(
    role: UserRole = UserRole.DIRECTOR,
    name: str = "Test User",
    email: str | None = None,
) -> User:
    uid = uuid4()
    return User(
        id=uid,
        email=Email(email or f"user{uid.hex[:6]}@test.com"),
        password_hash=hash_password("password123"),
        name=name,
        role=role,
        is_active=True,
    )


def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(user.id, user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def director() -> User:
    return make_user(role=UserRole.DIRECTOR, name="Director User")


@pytest.fixture()
def teacher() -> User:
    return make_user(role=UserRole.TEACHER, name="Teacher User")


@pytest.fixture()
def student_user() -> User:
    return make_user(role=UserRole.STUDENT, name="Student User")


@pytest.fixture()
def director_headers(director: User) -> dict[str, str]:
    return auth_headers(director)


@pytest.fixture()
def teacher_headers(teacher: User) -> dict[str, str]:
    return auth_headers(teacher)


@pytest.fixture()
def student_headers(student_user: User) -> dict[str, str]:
    return auth_headers(student_user)
