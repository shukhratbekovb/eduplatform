"""Unit tests — Auth use cases (in-memory repos)."""

from __future__ import annotations

from typing import Any
from unittest.mock import patch
from uuid import uuid4

import pytest

from src.application.auth.use_cases import (
    ChangePasswordUseCase,
    CreateUserInput,
    CreateUserUseCase,
    GetMeUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
)
from src.application.interfaces.repositories import Page
from src.domain.auth.entities import User, UserRole
from src.domain.shared.value_objects import Email

# Simple test-only password helpers that avoid bcrypt (passlib+bcrypt4 incompatibility)
_FAKE_HASH_PREFIX = "TESTHASH:"


def _test_hash(plain: str) -> str:
    return _FAKE_HASH_PREFIX + plain


def _test_verify(plain: str, hashed: str) -> bool:
    return hashed == _FAKE_HASH_PREFIX + plain


# ── In-memory stub ────────────────────────────────────────────────────────────


class InMemoryUserRepo:
    def __init__(self) -> None:
        self._store: dict[Any, User] = {}

    async def get_by_id(self, user_id: Any) -> User | None:
        return self._store.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        for u in self._store.values():
            if str(u.email) == email:
                return u
        return None

    async def save(self, user: User) -> None:
        self._store[user.id] = user

    async def list(self, **kw: Any) -> Page[User]:
        items = list(self._store.values())
        return Page(items=items, total=len(items), page=1, page_size=len(items) or 20)


def _make_user(email: str = "test@test.com", password: str = "pass1234", role: UserRole = UserRole.DIRECTOR) -> User:
    return User(
        id=uuid4(),
        email=Email(email),
        password_hash=_test_hash(password),
        name="Test",
        role=role,
        is_active=True,
    )


_USE_CASES_MODULE = "src.application.auth.use_cases"


# ── LoginUseCase ──────────────────────────────────────────────────────────────


class TestLoginUseCase:
    async def test_success(self) -> None:
        repo = InMemoryUserRepo()
        user = _make_user(email="admin@test.com", password="secret123")
        await repo.save(user)

        with patch(f"{_USE_CASES_MODULE}.verify_password", side_effect=_test_verify):
            uc = LoginUseCase(repo)
            pair = await uc.execute("admin@test.com", "secret123")
        assert pair.access_token
        assert pair.refresh_token

    async def test_wrong_password_raises(self) -> None:
        repo = InMemoryUserRepo()
        user = _make_user(email="admin@test.com", password="correct")
        await repo.save(user)

        with patch(f"{_USE_CASES_MODULE}.verify_password", side_effect=_test_verify):
            uc = LoginUseCase(repo)
            with pytest.raises(ValueError, match="wrong_password"):
                await uc.execute("admin@test.com", "wrong")

    async def test_unknown_email_raises(self) -> None:
        with patch(f"{_USE_CASES_MODULE}.verify_password", side_effect=_test_verify):
            uc = LoginUseCase(InMemoryUserRepo())
            with pytest.raises(ValueError, match="user_not_found"):
                await uc.execute("nobody@test.com", "pass")

    async def test_inactive_user_raises(self) -> None:
        repo = InMemoryUserRepo()
        user = _make_user(email="inactive@test.com", password="pass1234")
        user.is_active = False
        await repo.save(user)

        with patch(f"{_USE_CASES_MODULE}.verify_password", side_effect=_test_verify):
            uc = LoginUseCase(repo)
            with pytest.raises(ValueError, match="deactivated"):
                await uc.execute("inactive@test.com", "pass1234")


# ── CreateUserUseCase ─────────────────────────────────────────────────────────


class TestCreateUserUseCase:
    async def test_creates_user(self) -> None:
        repo = InMemoryUserRepo()
        with patch(f"{_USE_CASES_MODULE}.hash_password", side_effect=_test_hash):
            uc = CreateUserUseCase(repo)
            user = await uc.execute(
                CreateUserInput(
                    email="new@test.com",
                    password="Passw0rd!",
                    name="New User",
                    role="teacher",
                )
            )
        assert user.role == UserRole.TEACHER
        assert str(user.email) == "new@test.com"

    async def test_weak_password_raises(self) -> None:
        repo = InMemoryUserRepo()
        with patch(f"{_USE_CASES_MODULE}.hash_password", side_effect=_test_hash):
            uc = CreateUserUseCase(repo)
            with pytest.raises(ValueError):
                await uc.execute(
                    CreateUserInput(
                        email="new@test.com",
                        password="weak",
                        name="New User",
                        role="teacher",
                    )
                )

    async def test_duplicate_email_raises(self) -> None:
        repo = InMemoryUserRepo()
        existing = _make_user(email="dup@test.com")
        await repo.save(existing)

        with patch(f"{_USE_CASES_MODULE}.hash_password", side_effect=_test_hash):
            uc = CreateUserUseCase(repo)
            with pytest.raises(ValueError, match="already registered"):
                await uc.execute(
                    CreateUserInput(
                        email="dup@test.com",
                        password="Passw0rd!",
                        name="Dup",
                        role="teacher",
                    )
                )

    async def test_invalid_role_raises(self) -> None:
        with patch(f"{_USE_CASES_MODULE}.hash_password", side_effect=_test_hash):
            uc = CreateUserUseCase(InMemoryUserRepo())
            with pytest.raises(ValueError, match="Invalid role"):
                await uc.execute(
                    CreateUserInput(
                        email="x@test.com",
                        password="Passw0rd!",
                        name="X",
                        role="superadmin",
                    )
                )


# ── ChangePasswordUseCase ─────────────────────────────────────────────────────


class TestChangePasswordUseCase:
    async def test_success(self) -> None:
        repo = InMemoryUserRepo()
        user = _make_user(password="OldPass1!")
        await repo.save(user)

        with (
            patch(f"{_USE_CASES_MODULE}.verify_password", side_effect=_test_verify),
            patch(f"{_USE_CASES_MODULE}.hash_password", side_effect=_test_hash),
        ):
            uc = ChangePasswordUseCase(repo)
            await uc.execute(user.id, "OldPass1!", "NewPass9!")

        saved = await repo.get_by_id(user.id)
        assert saved is not None
        assert _test_verify("NewPass9!", saved.password_hash)

    async def test_wrong_old_password_raises(self) -> None:
        repo = InMemoryUserRepo()
        user = _make_user(password="Correct1!")
        await repo.save(user)

        with patch(f"{_USE_CASES_MODULE}.verify_password", side_effect=_test_verify):
            uc = ChangePasswordUseCase(repo)
            with pytest.raises(ValueError, match="Wrong"):
                await uc.execute(user.id, "wrong", "NewPass9!")

    async def test_weak_new_password_raises(self) -> None:
        repo = InMemoryUserRepo()
        user = _make_user(password="Correct1!")
        await repo.save(user)

        with patch(f"{_USE_CASES_MODULE}.verify_password", side_effect=_test_verify):
            uc = ChangePasswordUseCase(repo)
            with pytest.raises(ValueError):
                await uc.execute(user.id, "Correct1!", "short")

    async def test_user_not_found_raises(self) -> None:
        with patch(f"{_USE_CASES_MODULE}.verify_password", side_effect=_test_verify):
            uc = ChangePasswordUseCase(InMemoryUserRepo())
            with pytest.raises(ValueError, match="User not found"):
                await uc.execute(uuid4(), "Old1!", "New1!")


# ── RefreshTokenUseCase ──────────────────────────────────────────────────────


class TestRefreshTokenUseCase:
    async def test_success(self) -> None:
        repo = InMemoryUserRepo()
        user = _make_user(email="refresh@test.com", password="pass1234")
        await repo.save(user)

        # Create a real refresh token
        from src.infrastructure.services.jwt_service import create_refresh_token

        token = create_refresh_token(user.id)

        uc = RefreshTokenUseCase(repo)
        pair = await uc.execute(token)
        assert pair.access_token
        assert pair.refresh_token

    async def test_invalid_token_raises(self) -> None:
        uc = RefreshTokenUseCase(InMemoryUserRepo())
        with pytest.raises(ValueError, match="Invalid"):
            await uc.execute("not.a.valid.token")

    async def test_access_token_as_refresh_raises(self) -> None:
        repo = InMemoryUserRepo()
        user = _make_user(email="access@test.com", password="pass1234")
        await repo.save(user)

        from src.infrastructure.services.jwt_service import create_access_token

        token = create_access_token(user.id, user.role.value)

        uc = RefreshTokenUseCase(repo)
        with pytest.raises(ValueError, match="Not a refresh token"):
            await uc.execute(token)

    async def test_user_not_found_raises(self) -> None:
        from src.infrastructure.services.jwt_service import create_refresh_token

        token = create_refresh_token(uuid4())

        uc = RefreshTokenUseCase(InMemoryUserRepo())
        with pytest.raises(ValueError, match="not found or inactive"):
            await uc.execute(token)

    async def test_inactive_user_raises(self) -> None:
        repo = InMemoryUserRepo()
        user = _make_user(email="inactive@test.com", password="pass1234")
        user.is_active = False
        await repo.save(user)

        from src.infrastructure.services.jwt_service import create_refresh_token

        token = create_refresh_token(user.id)

        uc = RefreshTokenUseCase(repo)
        with pytest.raises(ValueError, match="not found or inactive"):
            await uc.execute(token)


# ── GetMeUseCase ─────────────────────────────────────────────────────────────


class TestGetMeUseCase:
    async def test_returns_user(self) -> None:
        repo = InMemoryUserRepo()
        user = _make_user(email="me@test.com")
        await repo.save(user)

        uc = GetMeUseCase(repo)
        result = await uc.execute(user.id)
        assert result.id == user.id
        assert str(result.email) == "me@test.com"

    async def test_user_not_found_raises(self) -> None:
        uc = GetMeUseCase(InMemoryUserRepo())
        with pytest.raises(ValueError, match="User not found"):
            await uc.execute(uuid4())
