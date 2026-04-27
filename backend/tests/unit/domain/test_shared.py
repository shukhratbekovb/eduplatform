"""Unit tests — Shared domain: value objects, entity base, specification pattern."""

from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest

from src.domain.shared.entity import AggregateRoot, Entity
from src.domain.shared.events import DomainEvent
from src.domain.shared.specification import Specification
from src.domain.shared.value_objects import Email, Grade, Money, Phone, TimeRange

# ── Entity base class ───────────────────────────────────────────────────────


class TestEntity:
    def test_equality_same_id(self) -> None:
        uid = uuid4()
        e1 = Entity(id=uid)
        e2 = Entity(id=uid)
        assert e1 == e2

    def test_inequality_different_id(self) -> None:
        e1 = Entity(id=uuid4())
        e2 = Entity(id=uuid4())
        assert e1 != e2

    def test_not_equal_to_non_entity(self) -> None:
        e = Entity(id=uuid4())
        assert e != "not an entity"
        assert e != 42
        assert e != None  # noqa: E711

    def test_hash_based_on_id(self) -> None:
        uid = uuid4()
        e = Entity(id=uid)
        assert hash(e) == hash(uid)

    def test_usable_in_set(self) -> None:
        uid = uuid4()
        e1 = Entity(id=uid)
        e2 = Entity(id=uid)
        s = {e1, e2}
        assert len(s) == 1


# ── AggregateRoot ───────────────────────────────────────────────────────────


class TestAggregateRoot:
    def test_add_and_pull_events(self) -> None:
        agg = AggregateRoot(id=uuid4())
        event = DomainEvent()
        agg.add_event(event)
        events = agg.pull_events()
        assert len(events) == 1
        assert events[0] is event
        # pulling again returns empty
        assert agg.pull_events() == []

    def test_domain_events_property_does_not_clear(self) -> None:
        agg = AggregateRoot(id=uuid4())
        event = DomainEvent()
        agg.add_event(event)
        # domain_events returns a copy without clearing
        events = agg.domain_events
        assert len(events) == 1
        # still available
        assert len(agg.domain_events) == 1
        # pull clears
        pulled = agg.pull_events()
        assert len(pulled) == 1
        assert agg.domain_events == []

    def test_multiple_events(self) -> None:
        agg = AggregateRoot(id=uuid4())
        e1 = DomainEvent()
        e2 = DomainEvent()
        agg.add_event(e1)
        agg.add_event(e2)
        assert len(agg.domain_events) == 2
        pulled = agg.pull_events()
        assert len(pulled) == 2


# ── Email ────────────────────────────────────────────────────────────────────


class TestEmail:
    def test_valid_email(self) -> None:
        e = Email("user@example.com")
        assert str(e) == "user@example.com"

    def test_valid_email_with_dots(self) -> None:
        e = Email("first.last@company.co.uk")
        assert e.value == "first.last@company.co.uk"

    def test_valid_email_with_plus(self) -> None:
        e = Email("user+tag@gmail.com")
        assert e.value == "user+tag@gmail.com"

    def test_invalid_email_no_at(self) -> None:
        with pytest.raises(ValueError, match="Invalid email"):
            Email("not-an-email")

    def test_invalid_email_no_domain(self) -> None:
        with pytest.raises(ValueError, match="Invalid email"):
            Email("user@")

    def test_invalid_email_no_tld(self) -> None:
        with pytest.raises(ValueError, match="Invalid email"):
            Email("user@domain")

    def test_email_is_frozen(self) -> None:
        e = Email("a@b.com")
        with pytest.raises(AttributeError):
            e.value = "x@y.com"  # type: ignore[misc]


# ── Phone ────────────────────────────────────────────────────────────────────


class TestPhone:
    def test_valid_phone_with_plus(self) -> None:
        p = Phone("+998901234567")
        assert str(p) == "+998901234567"

    def test_valid_phone_digits_only(self) -> None:
        p = Phone("998901234567")
        assert p.value == "998901234567"

    def test_valid_phone_with_spaces(self) -> None:
        p = Phone("+998 90 123 45 67")
        assert p.value == "+998 90 123 45 67"

    def test_invalid_phone_too_short(self) -> None:
        with pytest.raises(ValueError, match="Invalid phone"):
            Phone("123")

    def test_invalid_phone_letters(self) -> None:
        with pytest.raises(ValueError, match="Invalid phone"):
            Phone("not-a-phone")


# ── Money ────────────────────────────────────────────────────────────────────


class TestMoney:
    def test_create_money(self) -> None:
        m = Money(Decimal("500000"), "UZS")
        assert m.amount == Decimal("500000")
        assert m.currency == "UZS"

    def test_default_currency(self) -> None:
        m = Money(Decimal("100"))
        assert m.currency == "UZS"

    def test_negative_amount_raises(self) -> None:
        with pytest.raises(ValueError, match="negative"):
            Money(Decimal("-1"))

    def test_add_same_currency(self) -> None:
        a = Money(Decimal("100"), "UZS")
        b = Money(Decimal("200"), "UZS")
        result = a + b
        assert result.amount == Decimal("300")

    def test_add_different_currency_raises(self) -> None:
        a = Money(Decimal("100"), "UZS")
        b = Money(Decimal("200"), "USD")
        with pytest.raises(ValueError, match="currencies"):
            a + b

    def test_str_representation(self) -> None:
        m = Money(Decimal("500000"), "UZS")
        assert str(m) == "500000 UZS"


# ── TimeRange ────────────────────────────────────────────────────────────────


class TestTimeRange:
    def test_valid_range(self) -> None:
        tr = TimeRange("09:00", "10:30")
        assert tr.start == "09:00"
        assert tr.end == "10:30"

    def test_invalid_format(self) -> None:
        with pytest.raises(ValueError, match="HH:MM"):
            TimeRange("9am", "10am")

    def test_start_after_end_raises(self) -> None:
        with pytest.raises(ValueError, match="before"):
            TimeRange("10:00", "09:00")

    def test_same_start_end_raises(self) -> None:
        with pytest.raises(ValueError, match="before"):
            TimeRange("10:00", "10:00")


# ── Grade ────────────────────────────────────────────────────────────────────


class TestGrade:
    def test_valid_grade(self) -> None:
        g = Grade(12)
        assert g.value == 12

    def test_min_grade(self) -> None:
        g = Grade(1)
        assert g.value == 1

    def test_grade_too_low(self) -> None:
        with pytest.raises(ValueError, match="between 1 and 12"):
            Grade(0)

    def test_grade_too_high(self) -> None:
        with pytest.raises(ValueError, match="between 1 and 12"):
            Grade(13)


# ── Specification combinators ────────────────────────────────────────────────


class _AlwaysTrue(Specification[int]):
    def is_satisfied_by(self, candidate: int) -> bool:
        return True


class _AlwaysFalse(Specification[int]):
    def is_satisfied_by(self, candidate: int) -> bool:
        return False


class _GreaterThan(Specification[int]):
    def __init__(self, threshold: int) -> None:
        self._threshold = threshold

    def is_satisfied_by(self, candidate: int) -> bool:
        return candidate > self._threshold


class TestSpecification:
    def test_single_spec(self) -> None:
        spec = _GreaterThan(5)
        assert spec.is_satisfied_by(10) is True
        assert spec.is_satisfied_by(3) is False

    def test_and_combinator(self) -> None:
        spec = _GreaterThan(5) & _GreaterThan(8)
        assert spec.is_satisfied_by(10) is True
        assert spec.is_satisfied_by(7) is False
        assert spec.is_satisfied_by(3) is False

    def test_or_combinator(self) -> None:
        spec = _AlwaysTrue() | _AlwaysFalse()
        assert spec.is_satisfied_by(0) is True

    def test_or_both_false(self) -> None:
        spec = _AlwaysFalse() | _AlwaysFalse()
        assert spec.is_satisfied_by(0) is False

    def test_not_combinator(self) -> None:
        spec = ~_AlwaysTrue()
        assert spec.is_satisfied_by(0) is False

    def test_not_false_becomes_true(self) -> None:
        spec = ~_AlwaysFalse()
        assert spec.is_satisfied_by(0) is True

    def test_complex_combination(self) -> None:
        # (x > 5) AND NOT (x > 15) => 5 < x <= 15
        spec = _GreaterThan(5) & ~_GreaterThan(15)
        assert spec.is_satisfied_by(10) is True
        assert spec.is_satisfied_by(3) is False
        assert spec.is_satisfied_by(20) is False
