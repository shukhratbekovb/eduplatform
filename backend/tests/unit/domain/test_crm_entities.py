"""Unit tests — CRM domain entities."""

from __future__ import annotations

from uuid import uuid4

import pytest

from src.domain.crm.entities import (
    CrmTask,
    Funnel,
    Lead,
    LeadStatus,
    Stage,
    TaskPriority,
    TaskStatus,
)

# ── Lead ──────────────────────────────────────────────────────────────────────


class TestLead:
    def _make(self, **kw) -> Lead:
        defaults = dict(
            full_name="Ali Valiyev",
            phone="+998901234567",
            funnel_id=uuid4(),
            stage_id=uuid4(),
            assigned_to=uuid4(),
        )
        return Lead.create(**{**defaults, **kw})

    def test_create_emits_event(self) -> None:
        lead = self._make()
        events = lead.pull_events()
        assert len(events) == 1
        assert "LeadCreated" in type(events[0]).__name__

    def test_mark_won(self) -> None:
        lead = self._make()
        lead.pull_events()
        lead.mark_won()
        assert lead.status == LeadStatus.WON

    def test_mark_won_emits_event(self) -> None:
        lead = self._make()
        lead.pull_events()
        lead.mark_won()
        events = lead.pull_events()
        assert any("LeadWon" in type(e).__name__ for e in events)

    def test_mark_won_twice_raises(self) -> None:
        lead = self._make()
        lead.pull_events()
        lead.mark_won()
        with pytest.raises(ValueError, match="Cannot transition"):
            lead.mark_won()

    def test_mark_lost(self) -> None:
        lead = self._make()
        lead.pull_events()
        lead.mark_lost("No budget")
        assert lead.status == LeadStatus.LOST
        assert lead.lost_reason == "No budget"

    def test_mark_lost_emits_event(self) -> None:
        lead = self._make()
        lead.pull_events()
        lead.mark_lost("No budget")
        events = lead.pull_events()
        assert any("LeadLost" in type(e).__name__ for e in events)

    def test_mark_lost_requires_reason(self) -> None:
        lead = self._make()
        lead.pull_events()
        with pytest.raises(ValueError, match="reason"):
            lead.mark_lost("   ")

    def test_cannot_lose_won_lead(self) -> None:
        lead = self._make()
        lead.pull_events()
        lead.mark_won()
        with pytest.raises(ValueError, match="Cannot transition"):
            lead.mark_lost("changed mind")

    def test_move_to_stage(self) -> None:
        lead = self._make()
        lead.pull_events()
        new_stage = uuid4()
        changed_by = uuid4()
        lead.move_to_stage(new_stage, changed_by)
        assert lead.stage_id == new_stage

    def test_move_to_stage_emits_event(self) -> None:
        lead = self._make()
        lead.pull_events()
        lead.move_to_stage(uuid4(), uuid4())
        events = lead.pull_events()
        assert any("LeadStageMoved" in type(e).__name__ for e in events)

    def test_reassign(self) -> None:
        lead = self._make()
        lead.pull_events()
        new_user = uuid4()
        lead.reassign(new_user, uuid4())
        assert lead.assigned_to == new_user

    def test_invalid_phone_raises(self) -> None:
        with pytest.raises(ValueError):
            Lead.create(
                full_name="Test",
                phone="not-a-phone",
                funnel_id=uuid4(),
                stage_id=uuid4(),
                assigned_to=uuid4(),
            )


# ── Funnel ────────────────────────────────────────────────────────────────────


class TestFunnel:
    def test_create(self) -> None:
        f = Funnel.create(name="Sales")
        assert f.name == "Sales"
        assert f.is_archived is False

    def test_archive(self) -> None:
        f = Funnel.create(name="Old")
        f.archive()
        assert f.is_archived is True


# ── Stage ─────────────────────────────────────────────────────────────────────


class TestStage:
    def test_valid_win_probability(self) -> None:
        from src.domain.crm.value_objects import WinProbability

        s = Stage(funnel_id=uuid4(), name="Qualified", win_probability=WinProbability(60))
        assert s.win_probability.value == 60

    def test_win_probability_boundary_zero(self) -> None:
        from src.domain.crm.value_objects import WinProbability

        s = Stage(funnel_id=uuid4(), name="Cold", win_probability=WinProbability(0))
        assert s.win_probability.value == 0

    def test_win_probability_boundary_hundred(self) -> None:
        from src.domain.crm.value_objects import WinProbability

        s = Stage(funnel_id=uuid4(), name="Won", win_probability=WinProbability(100))
        assert s.win_probability.value == 100

    def test_invalid_win_probability_raises(self) -> None:
        from src.domain.crm.value_objects import WinProbability

        with pytest.raises(ValueError):
            WinProbability(101)

    def test_negative_win_probability_raises(self) -> None:
        from src.domain.crm.value_objects import WinProbability

        with pytest.raises(ValueError):
            WinProbability(-1)


# ── CrmTask ───────────────────────────────────────────────────────────────────


class TestCrmTask:
    def _make(self, **kw) -> CrmTask:
        defaults = dict(
            title="Call client",
            assigned_to=uuid4(),
            due_date="2026-04-20",
        )
        return CrmTask.create(**{**defaults, **kw})

    def test_create(self) -> None:
        t = self._make()
        assert t.title == "Call client"
        assert t.status == TaskStatus.PENDING

    def test_empty_title_raises(self) -> None:
        with pytest.raises(ValueError, match="title"):
            self._make(title="   ")

    def test_complete(self) -> None:
        t = self._make()
        t.complete()
        assert t.status == TaskStatus.DONE

    def test_move_status(self) -> None:
        t = self._make()
        t.move(TaskStatus.IN_PROGRESS)
        assert t.status == TaskStatus.IN_PROGRESS

    def test_priority_default(self) -> None:
        t = self._make()
        assert t.priority == TaskPriority.MEDIUM

    def test_priority_custom(self) -> None:
        t = self._make(priority=TaskPriority.CRITICAL)
        assert t.priority == TaskPriority.CRITICAL
