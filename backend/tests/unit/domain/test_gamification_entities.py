"""Unit tests — Gamification domain entities."""
from __future__ import annotations

from uuid import uuid4

import pytest

from src.domain.gamification.entities import (
    Achievement,
    AchievementCategory,
    StudentAchievement,
)


class TestAchievement:
    def test_create(self) -> None:
        a = Achievement.create(
            name="First Steps",
            description="Complete your first lesson",
            category=AchievementCategory.ACADEMIC,
            reward_stars=10,
            reward_crystals=5,
        )
        assert a.name == "First Steps"
        assert a.reward_stars == 10
        assert a.reward_crystals == 5
        assert a.is_active is True

    def test_default_category(self) -> None:
        a = Achievement.create(
            name="Bonus",
            description="Special",
            category=AchievementCategory.SPECIAL,
        )
        assert a.category == AchievementCategory.SPECIAL

    def test_categories_exist(self) -> None:
        cats = {c.value for c in AchievementCategory}
        assert "academic" in cats
        assert "attendance" in cats
        assert "social" in cats


class TestStudentAchievement:
    def test_unlock_emits_event(self) -> None:
        sid = uuid4()
        aid = uuid4()
        sa = StudentAchievement.unlock(sid, aid)
        events = sa.pull_events()
        assert len(events) == 1
        assert "AchievementUnlocked" in type(events[0]).__name__

    def test_unlock_sets_ids(self) -> None:
        sid = uuid4()
        aid = uuid4()
        sa = StudentAchievement.unlock(sid, aid)
        assert sa.student_id == sid
        assert sa.achievement_id == aid
