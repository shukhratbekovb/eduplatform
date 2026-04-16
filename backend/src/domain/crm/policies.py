"""CRM domain policies — business rules for lead management."""
from __future__ import annotations

from src.domain.crm.entities import LeadStatus


class LeadTransitionPolicy:
    """Valid state transitions for a Lead.

    ACTIVE → WON
    ACTIVE → LOST
    No other transitions allowed.
    """
    _ALLOWED: dict[LeadStatus, set[LeadStatus]] = {
        LeadStatus.ACTIVE: {LeadStatus.WON, LeadStatus.LOST},
        LeadStatus.WON: set(),
        LeadStatus.LOST: set(),
    }

    @classmethod
    def can_transition(cls, current: LeadStatus, target: LeadStatus) -> bool:
        return target in cls._ALLOWED.get(current, set())

    @classmethod
    def validate_transition(cls, current: LeadStatus, target: LeadStatus) -> None:
        if not cls.can_transition(current, target):
            raise ValueError(
                f"Cannot transition lead from {current.value} to {target.value}"
            )
