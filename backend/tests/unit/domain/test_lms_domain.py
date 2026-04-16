"""Unit tests — LMS domain: value objects, specifications, policies."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest

from src.domain.lms.entities import (
    Lesson, LessonStatus, Payment, PaymentStatus, RiskLevel, Student,
)
from src.domain.lms.value_objects import Percentage, StudentCode
from src.domain.lms.specifications import (
    HighRiskStudentSpec,
    LessonCancellableSpec,
    LessonConductibleSpec,
    OverduePaymentSpec,
    StudentAtRiskSpec,
)
from src.domain.lms.policies import PaymentOverduePolicy, RiskCalculationPolicy
from src.domain.shared.value_objects import Money


def _make_student(**kw) -> Student:
    return Student(id=uuid4(), full_name="Test Student", **kw)


def _make_lesson(**kw) -> Lesson:
    return Lesson.create(
        group_id=uuid4(), lesson_date=date.today(),
        start_time="09:00", end_time="10:30", **kw,
    )


def _make_payment(**kw) -> Payment:
    defaults = dict(student_id=uuid4(), period="2026-04", amount=Decimal("500000"))
    return Payment.create(**{**defaults, **kw})


# ── StudentCode ──────────────────────────────────────────────────────────────


class TestStudentCode:
    def test_valid_code(self) -> None:
        sc = StudentCode("STU-001")
        assert sc.value == "STU-001"
        assert str(sc) == "STU-001"

    def test_valid_longer_code(self) -> None:
        sc = StudentCode("STUD-123456")
        assert sc.value == "STUD-123456"

    def test_empty_raises(self) -> None:
        with pytest.raises(ValueError, match="empty"):
            StudentCode("")

    def test_whitespace_only_raises(self) -> None:
        with pytest.raises(ValueError, match="empty"):
            StudentCode("   ")

    def test_invalid_format_lowercase(self) -> None:
        with pytest.raises(ValueError, match="Invalid student code"):
            StudentCode("stu-001")

    def test_invalid_format_no_dash(self) -> None:
        with pytest.raises(ValueError, match="Invalid student code"):
            StudentCode("STU001")

    def test_invalid_format_too_few_digits(self) -> None:
        with pytest.raises(ValueError, match="Invalid student code"):
            StudentCode("STU-01")

    def test_frozen(self) -> None:
        sc = StudentCode("STU-001")
        with pytest.raises(AttributeError):
            sc.value = "STU-002"  # type: ignore[misc]


# ── Percentage ───────────────────────────────────────────────────────────────


class TestPercentage:
    def test_valid_percentage(self) -> None:
        p = Percentage(Decimal("85.5"))
        assert p.value == Decimal("85.5")

    def test_zero(self) -> None:
        p = Percentage(Decimal("0"))
        assert p.value == Decimal("0")

    def test_hundred(self) -> None:
        p = Percentage(Decimal("100"))
        assert p.value == Decimal("100")

    def test_negative_raises(self) -> None:
        with pytest.raises(ValueError, match="0–100"):
            Percentage(Decimal("-1"))

    def test_over_hundred_raises(self) -> None:
        with pytest.raises(ValueError, match="0–100"):
            Percentage(Decimal("101"))

    def test_comparison_lt(self) -> None:
        assert Percentage(Decimal("50")) < Percentage(Decimal("70"))
        assert not (Percentage(Decimal("70")) < Percentage(Decimal("50")))

    def test_comparison_ge(self) -> None:
        assert Percentage(Decimal("70")) >= Percentage(Decimal("70"))
        assert Percentage(Decimal("80")) >= Percentage(Decimal("70"))

    def test_comparison_with_int(self) -> None:
        assert Percentage(Decimal("50")) < 70
        assert Percentage(Decimal("70")) >= 70

    def test_str(self) -> None:
        assert str(Percentage(Decimal("85"))) == "85%"

    def test_frozen(self) -> None:
        p = Percentage(Decimal("50"))
        with pytest.raises(AttributeError):
            p.value = Decimal("60")  # type: ignore[misc]


# ── RiskCalculationPolicy ────────────────────────────────────────────────────


class TestRiskCalculationPolicy:
    def test_normal_good_stats(self) -> None:
        assert RiskCalculationPolicy.calculate(Decimal("90"), Decimal("10")) == RiskLevel.LOW

    def test_normal_threshold_boundary(self) -> None:
        assert RiskCalculationPolicy.calculate(Decimal("70"), Decimal("6")) == RiskLevel.LOW

    def test_medium_low_attendance(self) -> None:
        assert RiskCalculationPolicy.calculate(Decimal("60"), Decimal("8")) == RiskLevel.MEDIUM

    def test_medium_low_gpa(self) -> None:
        assert RiskCalculationPolicy.calculate(Decimal("80"), Decimal("5")) == RiskLevel.MEDIUM

    def test_high_very_low_attendance(self) -> None:
        assert RiskCalculationPolicy.calculate(Decimal("40"), Decimal("10")) == RiskLevel.HIGH

    def test_high_very_low_gpa(self) -> None:
        assert RiskCalculationPolicy.calculate(Decimal("90"), Decimal("3")) == RiskLevel.HIGH

    def test_high_both_low(self) -> None:
        assert RiskCalculationPolicy.calculate(Decimal("30"), Decimal("2")) == RiskLevel.HIGH

    def test_none_attendance_defaults_normal(self) -> None:
        assert RiskCalculationPolicy.calculate(None, Decimal("10")) == RiskLevel.LOW

    def test_none_gpa_defaults_normal(self) -> None:
        assert RiskCalculationPolicy.calculate(Decimal("90"), None) == RiskLevel.LOW

    def test_both_none_defaults_normal(self) -> None:
        assert RiskCalculationPolicy.calculate(None, None) == RiskLevel.LOW

    def test_boundary_50_attendance_is_medium(self) -> None:
        # att=50 is NOT < 50, so not HIGH; but 50 < 70 → MEDIUM
        assert RiskCalculationPolicy.calculate(Decimal("50"), Decimal("10")) == RiskLevel.MEDIUM

    def test_boundary_49_attendance_is_high(self) -> None:
        assert RiskCalculationPolicy.calculate(Decimal("49"), Decimal("10")) == RiskLevel.HIGH


# ── PaymentOverduePolicy ────────────────────────────────────────────────────


class TestPaymentOverduePolicy:
    def test_pending_past_due_is_overdue(self) -> None:
        p = _make_payment(due_date=date.today() - timedelta(days=1))
        assert PaymentOverduePolicy.is_overdue(p) is True

    def test_pending_future_due_not_overdue(self) -> None:
        p = _make_payment(due_date=date.today() + timedelta(days=1))
        assert PaymentOverduePolicy.is_overdue(p) is False

    def test_pending_today_not_overdue(self) -> None:
        p = _make_payment(due_date=date.today())
        assert PaymentOverduePolicy.is_overdue(p) is False

    def test_paid_past_due_not_overdue(self) -> None:
        p = _make_payment(due_date=date.today() - timedelta(days=1))
        p.mark_paid()
        assert PaymentOverduePolicy.is_overdue(p) is False

    def test_no_due_date_not_overdue(self) -> None:
        p = _make_payment()
        assert PaymentOverduePolicy.is_overdue(p) is False


# ── StudentAtRiskSpec ────────────────────────────────────────────────────────


class TestStudentAtRiskSpec:
    def test_high_risk_satisfies(self) -> None:
        s = _make_student(risk_level=RiskLevel.HIGH)
        assert StudentAtRiskSpec().is_satisfied_by(s) is True

    def test_medium_risk_satisfies(self) -> None:
        s = _make_student(risk_level=RiskLevel.MEDIUM)
        assert StudentAtRiskSpec().is_satisfied_by(s) is True

    def test_normal_risk_does_not_satisfy(self) -> None:
        s = _make_student(risk_level=RiskLevel.LOW)
        assert StudentAtRiskSpec().is_satisfied_by(s) is False


class TestHighRiskStudentSpec:
    def test_high_risk(self) -> None:
        s = _make_student(risk_level=RiskLevel.HIGH)
        assert HighRiskStudentSpec().is_satisfied_by(s) is True

    def test_medium_risk_not_high(self) -> None:
        s = _make_student(risk_level=RiskLevel.MEDIUM)
        assert HighRiskStudentSpec().is_satisfied_by(s) is False

    def test_normal_risk_not_high(self) -> None:
        s = _make_student(risk_level=RiskLevel.LOW)
        assert HighRiskStudentSpec().is_satisfied_by(s) is False


# ── OverduePaymentSpec ───────────────────────────────────────────────────────


class TestOverduePaymentSpec:
    def test_pending_past_due(self) -> None:
        p = _make_payment(due_date=date.today() - timedelta(days=5))
        assert OverduePaymentSpec().is_satisfied_by(p) is True

    def test_pending_future_due(self) -> None:
        p = _make_payment(due_date=date.today() + timedelta(days=5))
        assert OverduePaymentSpec().is_satisfied_by(p) is False

    def test_paid_past_due(self) -> None:
        p = _make_payment(due_date=date.today() - timedelta(days=5))
        p.mark_paid()
        assert OverduePaymentSpec().is_satisfied_by(p) is False


# ── LessonConductibleSpec ───────────────────────────────────────────────────


class TestLessonConductibleSpec:
    def test_scheduled_lesson(self) -> None:
        lesson = _make_lesson()
        assert LessonConductibleSpec().is_satisfied_by(lesson) is True

    def test_completed_lesson(self) -> None:
        lesson = _make_lesson()
        lesson.conduct("Math")
        assert LessonConductibleSpec().is_satisfied_by(lesson) is False

    def test_cancelled_lesson(self) -> None:
        lesson = _make_lesson()
        lesson.cancel("No students")
        assert LessonConductibleSpec().is_satisfied_by(lesson) is False


# ── LessonCancellableSpec ───────────────────────────────────────────────────


class TestLessonCancellableSpec:
    def test_scheduled_lesson(self) -> None:
        lesson = _make_lesson()
        assert LessonCancellableSpec().is_satisfied_by(lesson) is True

    def test_completed_lesson_not_cancellable(self) -> None:
        lesson = _make_lesson()
        lesson.conduct("Math")
        assert LessonCancellableSpec().is_satisfied_by(lesson) is False

    def test_cancelled_lesson_still_cancellable(self) -> None:
        # Already cancelled is technically not COMPLETED
        lesson = _make_lesson()
        lesson.cancel("Reason")
        assert LessonCancellableSpec().is_satisfied_by(lesson) is True


# ── Specification combinators on LMS specs ───────────────────────────────────


class TestLmsSpecCombinators:
    def test_at_risk_and_high_risk(self) -> None:
        spec = StudentAtRiskSpec() & HighRiskStudentSpec()
        high = _make_student(risk_level=RiskLevel.HIGH)
        medium = _make_student(risk_level=RiskLevel.MEDIUM)
        normal = _make_student(risk_level=RiskLevel.LOW)
        assert spec.is_satisfied_by(high) is True
        assert spec.is_satisfied_by(medium) is False
        assert spec.is_satisfied_by(normal) is False

    def test_not_at_risk(self) -> None:
        spec = ~StudentAtRiskSpec()
        normal = _make_student(risk_level=RiskLevel.LOW)
        medium = _make_student(risk_level=RiskLevel.MEDIUM)
        assert spec.is_satisfied_by(normal) is True
        assert spec.is_satisfied_by(medium) is False
