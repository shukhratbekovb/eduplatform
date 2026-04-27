"""Unit tests — Gamification domain: value objects, specifications."""

from __future__ import annotations

import pytest

from src.domain.gamification.entities import Achievement, AchievementCategory
from src.domain.gamification.specifications import AchievementTriggeredSpec
from src.domain.gamification.value_objects import Reward

# ── Reward VO ────────────────────────────────────────────────────────────────


class TestReward:
    def test_default_reward(self) -> None:
        r = Reward()
        assert r.stars == 0
        assert r.crystals == 0
        assert r.is_empty is True

    def test_reward_with_values(self) -> None:
        r = Reward(stars=10, crystals=5)
        assert r.stars == 10
        assert r.crystals == 5
        assert r.is_empty is False

    def test_stars_only(self) -> None:
        r = Reward(stars=5)
        assert r.is_empty is False

    def test_crystals_only(self) -> None:
        r = Reward(crystals=3)
        assert r.is_empty is False

    def test_negative_stars_raises(self) -> None:
        with pytest.raises(ValueError, match="negative"):
            Reward(stars=-1)

    def test_negative_crystals_raises(self) -> None:
        with pytest.raises(ValueError, match="negative"):
            Reward(crystals=-1)

    def test_frozen(self) -> None:
        r = Reward(stars=10)
        with pytest.raises(AttributeError):
            r.stars = 20  # type: ignore[misc]

    def test_equality(self) -> None:
        assert Reward(stars=10, crystals=5) == Reward(stars=10, crystals=5)
        assert Reward(stars=10) != Reward(stars=5)


# ── Achievement with Reward VO ───────────────────────────────────────────────


class TestAchievementWithReward:
    def test_create_with_reward(self) -> None:
        a = Achievement.create(
            name="First Steps",
            description="Complete first lesson",
            category=AchievementCategory.ACADEMIC,
            reward_stars=10,
            reward_crystals=5,
        )
        assert a.reward == Reward(stars=10, crystals=5)
        assert a.reward.stars == 10
        assert a.reward.crystals == 5

    def test_backward_compat_properties(self) -> None:
        a = Achievement.create(
            name="Star Student",
            description="Get 100 stars",
            category=AchievementCategory.ACADEMIC,
            reward_stars=20,
            reward_crystals=10,
        )
        assert a.reward_stars == 20
        assert a.reward_crystals == 10

    def test_create_with_zero_reward(self) -> None:
        a = Achievement.create(
            name="Participator",
            description="Just show up",
            category=AchievementCategory.ATTENDANCE,
        )
        assert a.reward.is_empty is True

    def test_achievement_trigger_fields(self) -> None:
        a = Achievement(
            name="Streak",
            description="10 day streak",
            category=AchievementCategory.ATTENDANCE,
            trigger_type="attendance_streak",
            trigger_value=10,
            is_active=True,
        )
        assert a.trigger_type == "attendance_streak"
        assert a.trigger_value == 10


# ── AchievementTriggeredSpec ─────────────────────────────────────────────────


class TestAchievementTriggeredSpec:
    def _make_achievement(self, **kw) -> Achievement:
        defaults = dict(
            name="Streak",
            description="10 day streak",
            category=AchievementCategory.ATTENDANCE,
            trigger_type="attendance_streak",
            trigger_value=10,
            is_active=True,
        )
        return Achievement(**{**defaults, **kw})

    def test_triggered_when_value_meets_threshold(self) -> None:
        a = self._make_achievement()
        spec = AchievementTriggeredSpec("attendance_streak", 10)
        assert spec.is_satisfied_by(a) is True

    def test_triggered_when_value_exceeds_threshold(self) -> None:
        a = self._make_achievement()
        spec = AchievementTriggeredSpec("attendance_streak", 15)
        assert spec.is_satisfied_by(a) is True

    def test_not_triggered_below_threshold(self) -> None:
        a = self._make_achievement()
        spec = AchievementTriggeredSpec("attendance_streak", 5)
        assert spec.is_satisfied_by(a) is False

    def test_not_triggered_wrong_type(self) -> None:
        a = self._make_achievement()
        spec = AchievementTriggeredSpec("grade_12", 10)
        assert spec.is_satisfied_by(a) is False

    def test_not_triggered_inactive(self) -> None:
        a = self._make_achievement(is_active=False)
        spec = AchievementTriggeredSpec("attendance_streak", 15)
        assert spec.is_satisfied_by(a) is False

    def test_not_triggered_no_trigger_value(self) -> None:
        a = self._make_achievement(trigger_value=None)
        spec = AchievementTriggeredSpec("attendance_streak", 10)
        assert spec.is_satisfied_by(a) is False

    def test_not_triggered_no_trigger_type(self) -> None:
        a = self._make_achievement(trigger_type=None)
        spec = AchievementTriggeredSpec("attendance_streak", 10)
        assert spec.is_satisfied_by(a) is False

    def test_multiple_achievements_filter(self) -> None:
        """Use spec to filter matching achievements from a list."""
        a1 = self._make_achievement(trigger_type="attendance_streak", trigger_value=10)
        a2 = self._make_achievement(trigger_type="grade_12", trigger_value=1)
        a3 = self._make_achievement(trigger_type="attendance_streak", trigger_value=20)

        spec = AchievementTriggeredSpec("attendance_streak", 15)
        matched = [a for a in [a1, a2, a3] if spec.is_satisfied_by(a)]
        assert len(matched) == 1
        assert matched[0].trigger_value == 10
