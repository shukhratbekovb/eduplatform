"""Auth domain specifications."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

from src.domain.shared.specification import Specification

if TYPE_CHECKING:
    from src.domain.auth.entities import User


# ── User specifications ──────────────────────────────────────────────────────


class IsActiveUserSpec(Specification["User"]):
    """User account is active and can perform operations."""

    def is_satisfied_by(self, candidate: User) -> bool:
        return candidate.is_active


class IsStaffSpec(Specification["User"]):
    """User is a staff member (not a student)."""

    def is_satisfied_by(self, candidate: User) -> bool:
        from src.domain.auth.entities import UserRole

        return candidate.role != UserRole.STUDENT


# ── Password specifications ──────────────────────────────────────────────────


class MinLengthSpec(Specification[str]):
    """Password has at least N characters."""

    MIN = 8

    def is_satisfied_by(self, candidate: str) -> bool:
        return len(candidate) >= self.MIN


class HasUppercaseSpec(Specification[str]):
    """Password contains at least one uppercase letter."""

    def is_satisfied_by(self, candidate: str) -> bool:
        return bool(re.search(r"[A-Z]", candidate))


class HasLowercaseSpec(Specification[str]):
    """Password contains at least one lowercase letter."""

    def is_satisfied_by(self, candidate: str) -> bool:
        return bool(re.search(r"[a-z]", candidate))


class HasDigitSpec(Specification[str]):
    """Password contains at least one digit."""

    def is_satisfied_by(self, candidate: str) -> bool:
        return bool(re.search(r"\d", candidate))


class HasSpecialCharSpec(Specification[str]):
    """Password contains at least one special character."""

    SPECIAL = r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]"

    def is_satisfied_by(self, candidate: str) -> bool:
        return bool(re.search(self.SPECIAL, candidate))


class NoWhitespaceOnlySpec(Specification[str]):
    """Password is not only whitespace."""

    def is_satisfied_by(self, candidate: str) -> bool:
        return bool(candidate) and not candidate.isspace()


# ── Composite: full Apple-style password strength ────────────────────────────

STRONG_PASSWORD_SPEC = (
    MinLengthSpec()
    & HasUppercaseSpec()
    & HasLowercaseSpec()
    & HasDigitSpec()
    & HasSpecialCharSpec()
    & NoWhitespaceOnlySpec()
)

# Map each spec to a user-friendly error message
PASSWORD_RULES: list[tuple[Specification[str], str]] = [
    (MinLengthSpec(), f"Минимум {MinLengthSpec.MIN} символов"),
    (HasUppercaseSpec(), "Минимум одна заглавная буква (A-Z)"),
    (HasLowercaseSpec(), "Минимум одна строчная буква (a-z)"),
    (HasDigitSpec(), "Минимум одна цифра (0-9)"),
    (HasSpecialCharSpec(), "Минимум один спецсимвол (!@#$%^&*...)"),
    (NoWhitespaceOnlySpec(), "Пароль не может состоять только из пробелов"),
]
