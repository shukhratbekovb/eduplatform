"""Auth domain policies — business rules for user management."""
from __future__ import annotations

from typing import TYPE_CHECKING

from src.domain.auth.specifications import PASSWORD_RULES, STRONG_PASSWORD_SPEC

if TYPE_CHECKING:
    from src.domain.auth.entities import User, UserRole


class UserCreationPolicy:
    """Determines who can create users of a given role."""

    ROLE_HIERARCHY: dict[str, set[str]] = {
        "director": {"director", "mup", "teacher", "sales_manager", "cashier", "student"},
        "mup": {"teacher", "student"},
    }

    @classmethod
    def can_create(cls, creator: User, target_role: UserRole) -> bool:
        allowed = cls.ROLE_HIERARCHY.get(creator.role.value, set())
        return target_role.value in allowed


class PasswordPolicy:
    """Apple-style password strength validation using specifications."""

    @staticmethod
    def is_strong(password: str) -> bool:
        return STRONG_PASSWORD_SPEC.is_satisfied_by(password)

    @staticmethod
    def validate(password: str) -> list[str]:
        """Returns list of unmet password requirements (empty = valid)."""
        return [
            message
            for spec, message in PASSWORD_RULES
            if not spec.is_satisfied_by(password)
        ]
