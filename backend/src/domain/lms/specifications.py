"""LMS domain specifications."""
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from src.domain.shared.specification import Specification

if TYPE_CHECKING:
    from src.domain.lms.entities import Lesson, Payment, Student


class StudentAtRiskSpec(Specification["Student"]):
    """Student whose risk level is MEDIUM or higher."""

    def is_satisfied_by(self, candidate: Student) -> bool:
        from src.domain.lms.entities import RiskLevel
        risk_order = {RiskLevel.LOW: 0, RiskLevel.MEDIUM: 1, RiskLevel.HIGH: 2, RiskLevel.CRITICAL: 3}
        return risk_order.get(candidate.risk_level, 0) >= 1


class HighRiskStudentSpec(Specification["Student"]):
    """Student with HIGH risk level."""

    def is_satisfied_by(self, candidate: Student) -> bool:
        from src.domain.lms.entities import RiskLevel
        return candidate.risk_level == RiskLevel.HIGH


class OverduePaymentSpec(Specification["Payment"]):
    """Payment that is pending and past due date."""

    def is_satisfied_by(self, candidate: Payment) -> bool:
        from src.domain.lms.entities import PaymentStatus
        return (
            candidate.status == PaymentStatus.PENDING
            and candidate.due_date is not None
            and candidate.due_date < date.today()
        )


class LessonConductibleSpec(Specification["Lesson"]):
    """Lesson that can be conducted (must be in SCHEDULED status)."""

    def is_satisfied_by(self, candidate: Lesson) -> bool:
        from src.domain.lms.entities import LessonStatus
        return candidate.status == LessonStatus.SCHEDULED


class LessonCancellableSpec(Specification["Lesson"]):
    """Lesson that can be cancelled (must not be COMPLETED)."""

    def is_satisfied_by(self, candidate: Lesson) -> bool:
        from src.domain.lms.entities import LessonStatus
        return candidate.status != LessonStatus.COMPLETED
