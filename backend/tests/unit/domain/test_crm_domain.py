"""Unit tests — CRM domain: value objects, specifications, policies."""
from __future__ import annotations

from datetime import date, timedelta
from uuid import uuid4

import pytest

from src.domain.crm.entities import (
    CrmTask, Lead, LeadStatus, Stage, TaskPriority, TaskStatus,
)
from src.domain.crm.value_objects import HexColor, WinProbability
from src.domain.crm.specifications import (
    ActiveLeadSpec,
    OverdueTaskSpec,
    StageBelongsToFunnelSpec,
)
from src.domain.crm.policies import LeadTransitionPolicy


def _make_lead(**kw) -> Lead:
    defaults = dict(
        full_name="Ali Valiyev", phone="+998901234567",
        funnel_id=uuid4(), stage_id=uuid4(), assigned_to=uuid4(),
    )
    return Lead.create(**{**defaults, **kw})


def _make_task(**kw) -> CrmTask:
    defaults = dict(title="Call client", assigned_to=uuid4(), due_date="2026-04-20")
    return CrmTask.create(**{**defaults, **kw})


# ── WinProbability VO ────────────────────────────────────────────────────────


class TestWinProbability:
    def test_valid_zero(self) -> None:
        wp = WinProbability(0)
        assert wp.value == 0
        assert int(wp) == 0

    def test_valid_hundred(self) -> None:
        wp = WinProbability(100)
        assert wp.value == 100

    def test_valid_middle(self) -> None:
        wp = WinProbability(50)
        assert wp.value == 50

    def test_negative_raises(self) -> None:
        with pytest.raises(ValueError, match="0–100"):
            WinProbability(-1)

    def test_over_hundred_raises(self) -> None:
        with pytest.raises(ValueError, match="0–100"):
            WinProbability(101)

    def test_frozen(self) -> None:
        wp = WinProbability(50)
        with pytest.raises(AttributeError):
            wp.value = 60  # type: ignore[misc]


# ── HexColor VO ──────────────────────────────────────────────────────────────


class TestHexColor:
    def test_valid_color(self) -> None:
        c = HexColor("#6366F1")
        assert c.value == "#6366F1"
        assert str(c) == "#6366F1"

    def test_valid_lowercase(self) -> None:
        c = HexColor("#ff0000")
        assert c.value == "#ff0000"

    def test_black(self) -> None:
        c = HexColor("#000000")
        assert c.value == "#000000"

    def test_white(self) -> None:
        c = HexColor("#FFFFFF")
        assert c.value == "#FFFFFF"

    def test_no_hash_raises(self) -> None:
        with pytest.raises(ValueError, match="Invalid hex color"):
            HexColor("FF0000")

    def test_short_hex_raises(self) -> None:
        with pytest.raises(ValueError, match="Invalid hex color"):
            HexColor("#FFF")

    def test_invalid_chars_raises(self) -> None:
        with pytest.raises(ValueError, match="Invalid hex color"):
            HexColor("#GGGGGG")

    def test_frozen(self) -> None:
        c = HexColor("#000000")
        with pytest.raises(AttributeError):
            c.value = "#FFFFFF"  # type: ignore[misc]


# ── Stage with VOs ───────────────────────────────────────────────────────────


class TestStageWithVOs:
    def test_stage_default_values(self) -> None:
        s = Stage(funnel_id=uuid4(), name="New")
        assert s.color.value == "#6366F1"
        assert s.win_probability.value == 0

    def test_stage_custom_values(self) -> None:
        s = Stage(
            funnel_id=uuid4(), name="Qualified",
            color=HexColor("#00FF00"), win_probability=WinProbability(75),
        )
        assert s.color.value == "#00FF00"
        assert s.win_probability.value == 75


# ── LeadTransitionPolicy ────────────────────────────────────────────────────


class TestLeadTransitionPolicy:
    def test_active_to_won(self) -> None:
        assert LeadTransitionPolicy.can_transition(LeadStatus.ACTIVE, LeadStatus.WON) is True

    def test_active_to_lost(self) -> None:
        assert LeadTransitionPolicy.can_transition(LeadStatus.ACTIVE, LeadStatus.LOST) is True

    def test_won_to_lost_blocked(self) -> None:
        assert LeadTransitionPolicy.can_transition(LeadStatus.WON, LeadStatus.LOST) is False

    def test_lost_to_won_blocked(self) -> None:
        assert LeadTransitionPolicy.can_transition(LeadStatus.LOST, LeadStatus.WON) is False

    def test_won_to_active_blocked(self) -> None:
        assert LeadTransitionPolicy.can_transition(LeadStatus.WON, LeadStatus.ACTIVE) is False

    def test_lost_to_active_blocked(self) -> None:
        assert LeadTransitionPolicy.can_transition(LeadStatus.LOST, LeadStatus.ACTIVE) is False

    def test_validate_transition_raises(self) -> None:
        with pytest.raises(ValueError, match="Cannot transition"):
            LeadTransitionPolicy.validate_transition(LeadStatus.WON, LeadStatus.LOST)

    def test_validate_transition_ok(self) -> None:
        LeadTransitionPolicy.validate_transition(LeadStatus.ACTIVE, LeadStatus.WON)


# ── ActiveLeadSpec ───────────────────────────────────────────────────────────


class TestActiveLeadSpec:
    def test_active_lead(self) -> None:
        lead = _make_lead()
        assert ActiveLeadSpec().is_satisfied_by(lead) is True

    def test_won_lead(self) -> None:
        lead = _make_lead()
        lead.pull_events()
        lead.mark_won()
        assert ActiveLeadSpec().is_satisfied_by(lead) is False

    def test_lost_lead(self) -> None:
        lead = _make_lead()
        lead.pull_events()
        lead.mark_lost("No budget")
        assert ActiveLeadSpec().is_satisfied_by(lead) is False


# ── OverdueTaskSpec ──────────────────────────────────────────────────────────


class TestOverdueTaskSpec:
    def test_pending_past_due(self) -> None:
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        t = _make_task(due_date=yesterday)
        assert OverdueTaskSpec().is_satisfied_by(t) is True

    def test_pending_future_due(self) -> None:
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        t = _make_task(due_date=tomorrow)
        assert OverdueTaskSpec().is_satisfied_by(t) is False

    def test_done_past_due_not_overdue(self) -> None:
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        t = _make_task(due_date=yesterday)
        t.complete()
        assert OverdueTaskSpec().is_satisfied_by(t) is False

    def test_no_due_date(self) -> None:
        t = _make_task(due_date="")
        assert OverdueTaskSpec().is_satisfied_by(t) is False

    def test_in_progress_past_due(self) -> None:
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        t = _make_task(due_date=yesterday)
        t.move(TaskStatus.IN_PROGRESS)
        assert OverdueTaskSpec().is_satisfied_by(t) is True


# ── StageBelongsToFunnelSpec ─────────────────────────────────────────────────


class TestStageBelongsToFunnelSpec:
    def test_matches_funnel(self) -> None:
        funnel_id = uuid4()
        stage = Stage(funnel_id=funnel_id, name="Qualified")
        spec = StageBelongsToFunnelSpec(funnel_id)
        assert spec.is_satisfied_by(stage) is True

    def test_different_funnel(self) -> None:
        stage = Stage(funnel_id=uuid4(), name="Qualified")
        spec = StageBelongsToFunnelSpec(uuid4())
        assert spec.is_satisfied_by(stage) is False

    def test_none_funnel_id(self) -> None:
        stage = Stage(funnel_id=None, name="Orphan")
        spec = StageBelongsToFunnelSpec(uuid4())
        assert spec.is_satisfied_by(stage) is False
