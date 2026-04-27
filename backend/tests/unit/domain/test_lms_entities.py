"""Unit tests — LMS domain entities."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from src.domain.lms.entities import (
    Lesson,
    LessonStatus,
    Payment,
    PaymentStatus,
    RiskLevel,
    Student,
)

# ── Student ───────────────────────────────────────────────────────────────────


class TestStudent:
    def _make(self, **kw) -> Student:  # type: ignore[no-untyped-def]
        return Student(id=uuid4(), full_name="Alisher", **kw)

    def test_recalculate_risk_normal(self) -> None:
        s = self._make(attendance_percent=Decimal("80"), gpa=Decimal("8"))
        s.recalculate_risk()
        assert s.risk_level == RiskLevel.LOW

    def test_recalculate_risk_medium(self) -> None:
        s = self._make(attendance_percent=Decimal("65"), gpa=Decimal("7"))
        s.recalculate_risk()
        assert s.risk_level == RiskLevel.MEDIUM

    def test_recalculate_risk_high_low_attendance(self) -> None:
        s = self._make(attendance_percent=Decimal("40"), gpa=Decimal("10"))
        s.recalculate_risk()
        assert s.risk_level == RiskLevel.HIGH

    def test_recalculate_risk_high_low_gpa(self) -> None:
        s = self._make(attendance_percent=Decimal("90"), gpa=Decimal("3"))
        s.recalculate_risk()
        assert s.risk_level == RiskLevel.HIGH

    def test_risk_change_emits_event(self) -> None:
        s = self._make(attendance_percent=Decimal("40"), gpa=Decimal("3"))
        s.recalculate_risk()
        events = s.pull_events()
        assert len(events) == 1
        assert "StudentRiskChanged" in type(events[0]).__name__

    def test_no_event_when_risk_unchanged(self) -> None:
        s = self._make(
            attendance_percent=Decimal("80"),
            gpa=Decimal("8"),
            risk_level=RiskLevel.LOW,
        )
        s.recalculate_risk()
        assert s.pull_events() == []

    def test_add_stars(self) -> None:
        s = self._make(stars=10)
        s.add_stars(5)
        assert s.stars == 15

    def test_add_stars_ignores_negative(self) -> None:
        s = self._make(stars=10)
        s.add_stars(-3)
        assert s.stars == 10

    def test_add_crystals(self) -> None:
        s = self._make(crystals=0)
        s.add_crystals(20)
        assert s.crystals == 20

    def test_add_coins(self) -> None:
        s = self._make(total_coins=100)
        s.add_coins(50)
        assert s.total_coins == 150


# ── Lesson ────────────────────────────────────────────────────────────────────


class TestLesson:
    def _make(self, **kw) -> Lesson:  # type: ignore[no-untyped-def]
        return Lesson.create(
            group_id=uuid4(),
            lesson_date=date.today(),
            start_time="09:00",
            end_time="10:30",
            **kw,
        )

    def test_conduct_changes_status(self) -> None:
        lesson = self._make()
        lesson.conduct(topic="Algebra basics")
        assert lesson.status == LessonStatus.COMPLETED
        assert lesson.topic == "Algebra basics"

    def test_conduct_emits_event(self) -> None:
        lesson = self._make()
        lesson.conduct()
        events = lesson.pull_events()
        assert len(events) == 1
        assert "LessonConducted" in type(events[0]).__name__

    def test_cannot_conduct_cancelled_lesson(self) -> None:
        lesson = self._make()
        lesson.cancel("rain")
        with pytest.raises(ValueError, match="Cannot conduct"):
            lesson.conduct()

    def test_cancel_changes_status(self) -> None:
        lesson = self._make()
        lesson.cancel("Teacher sick")
        assert lesson.status == LessonStatus.CANCELLED
        assert lesson.cancel_reason == "Teacher sick"

    def test_cancel_emits_event(self) -> None:
        lesson = self._make()
        lesson.cancel("No room")
        events = lesson.pull_events()
        assert len(events) == 1
        assert "LessonCancelled" in type(events[0]).__name__

    def test_cancel_requires_reason(self) -> None:
        lesson = self._make()
        with pytest.raises(ValueError, match="reason"):
            lesson.cancel("   ")

    def test_cannot_cancel_completed_lesson(self) -> None:
        lesson = self._make()
        lesson.conduct()
        lesson.pull_events()
        with pytest.raises(ValueError, match="Cannot cancel"):
            lesson.cancel("changed mind")

    def test_invalid_time_range_raises(self) -> None:
        with pytest.raises(ValueError):
            Lesson.create(
                group_id=uuid4(),
                lesson_date=date.today(),
                start_time="10:00",
                end_time="09:00",  # end before start
            )


# ── Payment ───────────────────────────────────────────────────────────────────


class TestPayment:
    def _make(self) -> Payment:
        return Payment.create(
            student_id=uuid4(),
            period="2026-04",
            amount=Decimal("500000"),
            currency="UZS",
            due_date=date.today(),
        )

    def test_mark_paid(self) -> None:
        p = self._make()
        p.mark_paid()
        assert p.status == PaymentStatus.PAID

    def test_mark_overdue(self) -> None:
        p = self._make()
        p.mark_overdue()
        assert p.status == PaymentStatus.OVERDUE

    def test_already_paid_not_overdue(self) -> None:
        p = self._make()
        p.mark_paid()
        p.mark_overdue()  # should be a no-op for PAID
        assert p.status == PaymentStatus.PAID
