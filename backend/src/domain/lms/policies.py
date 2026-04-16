"""LMS domain policies — business rules with thresholds and calculations."""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.domain.lms.entities import Payment

from src.domain.lms.entities import RiskLevel, PaymentStatus


class RiskCalculationPolicy:
    """Calculates student risk level based on attendance and GPA.

    Thresholds:
        HIGH:   attendance < 50% OR gpa < 4
        MEDIUM: attendance < 70% OR gpa < 6
        NORMAL: everything else
    """
    ATT_HIGH_THRESHOLD = Decimal("50")
    ATT_MEDIUM_THRESHOLD = Decimal("70")
    GPA_HIGH_THRESHOLD = Decimal("4")
    GPA_MEDIUM_THRESHOLD = Decimal("6")

    @classmethod
    def calculate(
        cls,
        attendance_percent: Decimal | None,
        gpa: Decimal | None,
    ) -> RiskLevel:
        att = attendance_percent if attendance_percent is not None else Decimal("100")
        g = gpa if gpa is not None else Decimal("12")

        if att < cls.ATT_HIGH_THRESHOLD or g < cls.GPA_HIGH_THRESHOLD:
            return RiskLevel.HIGH
        if att < cls.ATT_MEDIUM_THRESHOLD or g < cls.GPA_MEDIUM_THRESHOLD:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW


class PaymentOverduePolicy:
    """Determines if a payment should be marked as overdue."""

    @staticmethod
    def is_overdue(payment: Payment) -> bool:
        return (
            payment.status == PaymentStatus.PENDING
            and payment.due_date is not None
            and payment.due_date < date.today()
        )
