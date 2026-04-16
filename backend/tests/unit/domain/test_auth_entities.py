"""Unit tests — Auth domain entities."""
import pytest
from uuid import uuid4

from src.domain.auth.entities import User, UserRole
from src.domain.shared.value_objects import Email


def make_user(**kwargs) -> User:  # type: ignore[no-untyped-def]
    defaults = dict(
        id=uuid4(),
        email=Email("admin@test.com"),
        password_hash="hashed",
        name="Admin",
        role=UserRole.DIRECTOR,
        is_active=True,
    )
    return User(**{**defaults, **kwargs})


class TestUser:
    def test_create_user(self) -> None:
        u = make_user()
        assert u.role == UserRole.DIRECTOR
        assert u.is_active is True

    def test_deactivate(self) -> None:
        u = make_user()
        u.deactivate()
        assert u.is_active is False

    def test_change_role(self) -> None:
        u = make_user(role=UserRole.TEACHER)
        u.change_role(UserRole.MUP)
        assert u.role == UserRole.MUP

    def test_user_role_values(self) -> None:
        roles = {r.value for r in UserRole}
        assert "director" in roles
        assert "student" in roles
        assert "sales_manager" in roles
