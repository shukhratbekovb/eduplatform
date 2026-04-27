"""Shared pytest fixtures for all test layers."""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Force test environment before any src import
os.environ.setdefault("APP_ENV", "test")

from src.domain.auth.entities import User, UserRole
from src.domain.shared.value_objects import Email
from src.infrastructure.services.jwt_service import create_access_token
from src.infrastructure.services.password_service import hash_password

# ── Database ─────────────────────────────────────────────────────────────────

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://edu:edu@localhost:5433/eduplatform_test",
)


@pytest_asyncio.fixture()
async def engine():
    from src.database import Base
    from src.infrastructure.persistence.models import auth, crm, gamification, lms  # noqa: F401

    eng = create_async_engine(TEST_DB_URL, echo=False, pool_size=5, max_overflow=10)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    # Cleanup all data after test
    async with eng.begin() as conn:
        await conn.execute(
            text(
                "DO $$ DECLARE r RECORD; BEGIN "
                "FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP "
                "EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE'; "
                "END LOOP; END $$;"
            )
        )
    await eng.dispose()


@pytest_asyncio.fixture()
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Per-test session for setup/assertions. Commits are real."""
    session = AsyncSession(engine, expire_on_commit=False)
    yield session
    await session.close()


# ── App / HTTP client ─────────────────────────────────────────────────────────


@pytest_asyncio.fixture()
async def client(engine) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient wired to the FastAPI app with independent DB sessions."""
    from src.database import get_db
    from src.main import create_app

    app = create_app()
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with factory() as session:
            yield session

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


async def persist_user(session: AsyncSession, user: User) -> None:
    """Persist a domain User entity to the DB as a UserModel row."""
    from src.infrastructure.persistence.models.auth import UserModel

    session.add(
        UserModel(
            id=user.id,
            email=str(user.email),
            password_hash=user.password_hash,
            name=user.name,
            role=user.role.value,
            is_active=user.is_active,
        )
    )
    await session.commit()


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
