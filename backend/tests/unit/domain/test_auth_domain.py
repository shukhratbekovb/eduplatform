"""Unit tests — Auth domain: value objects, specifications, policies."""
from __future__ import annotations

from uuid import uuid4

import pytest

from src.domain.auth.entities import User, UserRole
from src.domain.auth.value_objects import Password
from src.domain.auth.specifications import (
    HasDigitSpec,
    HasLowercaseSpec,
    HasSpecialCharSpec,
    HasUppercaseSpec,
    IsActiveUserSpec,
    IsStaffSpec,
    MinLengthSpec,
    NoWhitespaceOnlySpec,
    STRONG_PASSWORD_SPEC,
)
from src.domain.auth.policies import PasswordPolicy, UserCreationPolicy
from src.domain.shared.value_objects import Email


def _make_user(**kw) -> User:
    defaults = dict(
        id=uuid4(), email=Email("test@test.com"), password_hash="hash",
        name="Test", role=UserRole.DIRECTOR, is_active=True,
    )
    return User(**{**defaults, **kw})


# ── Password value object ────────────────────────────────────────────────────


class TestPassword:
    def test_valid_strong_password(self) -> None:
        p = Password("Str0ng!Pass")
        assert p.value == "Str0ng!Pass"

    def test_str_hides_value(self) -> None:
        p = Password("Str0ng!Pass")
        assert str(p) == "***"

    def test_frozen(self) -> None:
        p = Password("Str0ng!Pass")
        with pytest.raises(AttributeError):
            p.value = "Other1!"  # type: ignore[misc]

    def test_missing_uppercase_raises(self) -> None:
        with pytest.raises(ValueError, match="заглавная"):
            Password("str0ng!pass")

    def test_missing_lowercase_raises(self) -> None:
        with pytest.raises(ValueError, match="строчная"):
            Password("STR0NG!PASS")

    def test_missing_digit_raises(self) -> None:
        with pytest.raises(ValueError, match="цифра"):
            Password("Strong!Pass")

    def test_missing_special_char_raises(self) -> None:
        with pytest.raises(ValueError, match="спецсимвол"):
            Password("Str0ngPass1")

    def test_too_short_raises(self) -> None:
        with pytest.raises(ValueError, match="символов"):
            Password("A1!a")

    def test_whitespace_only_raises(self) -> None:
        with pytest.raises(ValueError, match="пробел"):
            Password("          ")

    def test_empty_raises(self) -> None:
        with pytest.raises(ValueError):
            Password("")

    def test_multiple_errors_joined(self) -> None:
        """Short password without any character classes reports all failures."""
        with pytest.raises(ValueError) as exc_info:
            Password("abc")
        msg = str(exc_info.value)
        assert "символов" in msg
        assert "заглавная" in msg
        assert "цифра" in msg
        assert "спецсимвол" in msg

    def test_various_special_chars(self) -> None:
        for char in "!@#$%^&*()-_=+[]{};:'\",.<>?/`~|\\":
            Password(f"Abcdef1{char}")

    def test_unicode_password(self) -> None:
        Password("Пароль1!Aa")


# ── Password Specifications (individual) ─────────────────────────────────────


class TestMinLengthSpec:
    def test_exact_min(self) -> None:
        assert MinLengthSpec().is_satisfied_by("12345678") is True

    def test_below_min(self) -> None:
        assert MinLengthSpec().is_satisfied_by("1234567") is False

    def test_above_min(self) -> None:
        assert MinLengthSpec().is_satisfied_by("123456789") is True

    def test_empty(self) -> None:
        assert MinLengthSpec().is_satisfied_by("") is False


class TestHasUppercaseSpec:
    def test_has_uppercase(self) -> None:
        assert HasUppercaseSpec().is_satisfied_by("Hello") is True

    def test_no_uppercase(self) -> None:
        assert HasUppercaseSpec().is_satisfied_by("hello") is False

    def test_all_uppercase(self) -> None:
        assert HasUppercaseSpec().is_satisfied_by("HELLO") is True

    def test_digits_only(self) -> None:
        assert HasUppercaseSpec().is_satisfied_by("12345") is False


class TestHasLowercaseSpec:
    def test_has_lowercase(self) -> None:
        assert HasLowercaseSpec().is_satisfied_by("Hello") is True

    def test_no_lowercase(self) -> None:
        assert HasLowercaseSpec().is_satisfied_by("HELLO") is False

    def test_all_lowercase(self) -> None:
        assert HasLowercaseSpec().is_satisfied_by("hello") is True


class TestHasDigitSpec:
    def test_has_digit(self) -> None:
        assert HasDigitSpec().is_satisfied_by("abc1") is True

    def test_no_digit(self) -> None:
        assert HasDigitSpec().is_satisfied_by("abcdef") is False

    def test_only_digits(self) -> None:
        assert HasDigitSpec().is_satisfied_by("123456") is True


class TestHasSpecialCharSpec:
    def test_has_special(self) -> None:
        assert HasSpecialCharSpec().is_satisfied_by("abc!") is True

    def test_no_special(self) -> None:
        assert HasSpecialCharSpec().is_satisfied_by("abc123ABC") is False

    def test_various_specials(self) -> None:
        for ch in "!@#$%^&*()_+-=[]{}|;:',.<>?/`~":
            assert HasSpecialCharSpec().is_satisfied_by(ch) is True, f"Failed for: {ch}"


class TestNoWhitespaceOnlySpec:
    def test_normal_text(self) -> None:
        assert NoWhitespaceOnlySpec().is_satisfied_by("hello") is True

    def test_whitespace_only(self) -> None:
        assert NoWhitespaceOnlySpec().is_satisfied_by("   ") is False

    def test_empty(self) -> None:
        assert NoWhitespaceOnlySpec().is_satisfied_by("") is False

    def test_text_with_spaces(self) -> None:
        assert NoWhitespaceOnlySpec().is_satisfied_by("hello world") is True


class TestStrongPasswordSpec:
    def test_strong_password(self) -> None:
        assert STRONG_PASSWORD_SPEC.is_satisfied_by("MyP@ss1!") is True

    def test_missing_one_requirement(self) -> None:
        # No digit
        assert STRONG_PASSWORD_SPEC.is_satisfied_by("MyP@ssss!") is False

    def test_all_requirements_met(self) -> None:
        assert STRONG_PASSWORD_SPEC.is_satisfied_by("Abcdef1!") is True

    def test_weak_password(self) -> None:
        assert STRONG_PASSWORD_SPEC.is_satisfied_by("password") is False


# ── IsActiveUserSpec ─────────────────────────────────────────────────────────


class TestIsActiveUserSpec:
    def test_active_user_satisfies(self) -> None:
        u = _make_user(is_active=True)
        assert IsActiveUserSpec().is_satisfied_by(u) is True

    def test_inactive_user_does_not_satisfy(self) -> None:
        u = _make_user(is_active=False)
        assert IsActiveUserSpec().is_satisfied_by(u) is False

    def test_deactivated_user(self) -> None:
        u = _make_user()
        u.deactivate()
        assert IsActiveUserSpec().is_satisfied_by(u) is False


# ── IsStaffSpec ──────────────────────────────────────────────────────────────


class TestIsStaffSpec:
    def test_director_is_staff(self) -> None:
        assert IsStaffSpec().is_satisfied_by(_make_user(role=UserRole.DIRECTOR)) is True

    def test_teacher_is_staff(self) -> None:
        assert IsStaffSpec().is_satisfied_by(_make_user(role=UserRole.TEACHER)) is True

    def test_mup_is_staff(self) -> None:
        assert IsStaffSpec().is_satisfied_by(_make_user(role=UserRole.MUP)) is True

    def test_sales_manager_is_staff(self) -> None:
        assert IsStaffSpec().is_satisfied_by(_make_user(role=UserRole.SALES_MANAGER)) is True

    def test_cashier_is_staff(self) -> None:
        assert IsStaffSpec().is_satisfied_by(_make_user(role=UserRole.CASHIER)) is True

    def test_student_is_not_staff(self) -> None:
        assert IsStaffSpec().is_satisfied_by(_make_user(role=UserRole.STUDENT)) is False

    def test_combined_active_staff(self) -> None:
        spec = IsActiveUserSpec() & IsStaffSpec()
        assert spec.is_satisfied_by(_make_user(role=UserRole.TEACHER, is_active=True)) is True
        assert spec.is_satisfied_by(_make_user(role=UserRole.TEACHER, is_active=False)) is False
        assert spec.is_satisfied_by(_make_user(role=UserRole.STUDENT, is_active=True)) is False


# ── UserCreationPolicy ───────────────────────────────────────────────────────


class TestUserCreationPolicy:
    def test_director_can_create_any_role(self) -> None:
        director = _make_user(role=UserRole.DIRECTOR)
        for role in UserRole:
            assert UserCreationPolicy.can_create(director, role) is True

    def test_mup_can_create_teacher(self) -> None:
        mup = _make_user(role=UserRole.MUP)
        assert UserCreationPolicy.can_create(mup, UserRole.TEACHER) is True

    def test_mup_can_create_student(self) -> None:
        mup = _make_user(role=UserRole.MUP)
        assert UserCreationPolicy.can_create(mup, UserRole.STUDENT) is True

    def test_mup_cannot_create_director(self) -> None:
        mup = _make_user(role=UserRole.MUP)
        assert UserCreationPolicy.can_create(mup, UserRole.DIRECTOR) is False

    def test_mup_cannot_create_sales_manager(self) -> None:
        mup = _make_user(role=UserRole.MUP)
        assert UserCreationPolicy.can_create(mup, UserRole.SALES_MANAGER) is False

    def test_teacher_cannot_create_anyone(self) -> None:
        teacher = _make_user(role=UserRole.TEACHER)
        for role in UserRole:
            assert UserCreationPolicy.can_create(teacher, role) is False

    def test_student_cannot_create_anyone(self) -> None:
        student = _make_user(role=UserRole.STUDENT)
        for role in UserRole:
            assert UserCreationPolicy.can_create(student, role) is False


# ── PasswordPolicy ───────────────────────────────────────────────────────────


class TestPasswordPolicy:
    def test_strong_password_no_errors(self) -> None:
        assert PasswordPolicy.validate("Str0ng!Pass") == []

    def test_is_strong_true(self) -> None:
        assert PasswordPolicy.is_strong("Str0ng!Pass") is True

    def test_is_strong_false(self) -> None:
        assert PasswordPolicy.is_strong("weak") is False

    def test_too_short(self) -> None:
        errors = PasswordPolicy.validate("A1!a")
        assert any("символов" in e for e in errors)

    def test_no_uppercase(self) -> None:
        errors = PasswordPolicy.validate("str0ng!pass")
        assert any("заглавная" in e for e in errors)

    def test_no_lowercase(self) -> None:
        errors = PasswordPolicy.validate("STR0NG!PASS")
        assert any("строчная" in e for e in errors)

    def test_no_digit(self) -> None:
        errors = PasswordPolicy.validate("Strong!Pass")
        assert any("цифра" in e for e in errors)

    def test_no_special_char(self) -> None:
        errors = PasswordPolicy.validate("Str0ngPass1")
        assert any("спецсимвол" in e for e in errors)

    def test_whitespace_only(self) -> None:
        errors = PasswordPolicy.validate("          ")
        assert len(errors) > 0

    def test_all_errors_for_empty(self) -> None:
        errors = PasswordPolicy.validate("")
        assert len(errors) >= 5  # all rules fail

    def test_reports_multiple_failures(self) -> None:
        errors = PasswordPolicy.validate("abc")
        # Should report: short, no uppercase, no digit, no special
        assert len(errors) >= 4
