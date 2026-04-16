"""Gamification domain specifications."""
from __future__ import annotations

from typing import TYPE_CHECKING

from src.domain.shared.specification import Specification

if TYPE_CHECKING:
    from src.domain.gamification.entities import Achievement


class AchievementTriggeredSpec(Specification["Achievement"]):
    """Checks if an achievement's trigger condition is met."""

    def __init__(self, trigger_type: str, current_value: int) -> None:
        self._trigger_type = trigger_type
        self._current_value = current_value

    def is_satisfied_by(self, candidate: Achievement) -> bool:
        if not candidate.is_active:
            return False
        if candidate.trigger_type != self._trigger_type:
            return False
        if candidate.trigger_value is None:
            return False
        return self._current_value >= candidate.trigger_value
