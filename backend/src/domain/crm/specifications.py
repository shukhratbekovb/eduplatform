"""CRM domain specifications."""
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING
from uuid import UUID

from src.domain.shared.specification import Specification

if TYPE_CHECKING:
    from src.domain.crm.entities import CrmTask, Lead, Stage


class ActiveLeadSpec(Specification["Lead"]):
    """Lead that is still active (not won/lost)."""

    def is_satisfied_by(self, candidate: Lead) -> bool:
        from src.domain.crm.entities import LeadStatus
        return candidate.status == LeadStatus.ACTIVE


class OverdueTaskSpec(Specification["CrmTask"]):
    """CRM task that is past due and not completed."""

    def is_satisfied_by(self, candidate: CrmTask) -> bool:
        from src.domain.crm.entities import TaskStatus
        if candidate.status == TaskStatus.DONE:
            return False
        if not candidate.due_date:
            return False
        try:
            due = date.fromisoformat(candidate.due_date)
            return due < date.today()
        except ValueError:
            return False


class StageBelongsToFunnelSpec(Specification["Stage"]):
    """Stage belongs to the specified funnel."""

    def __init__(self, funnel_id: UUID) -> None:
        self._funnel_id = funnel_id

    def is_satisfied_by(self, candidate: Stage) -> bool:
        return candidate.funnel_id == self._funnel_id
