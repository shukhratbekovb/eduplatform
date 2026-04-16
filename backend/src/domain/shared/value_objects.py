import re
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Email:
    value: str

    def __post_init__(self) -> None:
        pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, self.value):
            raise ValueError(f"Invalid email: {self.value}")

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class Phone:
    value: str

    def __post_init__(self) -> None:
        digits = re.sub(r"[\s\-()]+", "", self.value)
        if not re.match(r"^\+?\d{7,15}$", digits):
            raise ValueError(f"Invalid phone: {self.value}")

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str = "UZS"

    def __post_init__(self) -> None:
        if self.amount < Decimal("0"):
            raise ValueError("Money amount cannot be negative")

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(self.amount + other.amount, self.currency)

    def __str__(self) -> str:
        return f"{self.amount} {self.currency}"


@dataclass(frozen=True)
class TimeRange:
    start: str  # "HH:MM"
    end: str    # "HH:MM"

    def __post_init__(self) -> None:
        pattern = r"^\d{2}:\d{2}$"
        if not re.match(pattern, self.start) or not re.match(pattern, self.end):
            raise ValueError("TimeRange must be in HH:MM format")
        if self.start >= self.end:
            raise ValueError("start must be before end")


@dataclass(frozen=True)
class Grade:
    """Оценка по шкале 1-12 (Student Portal + LMS)."""
    value: int

    def __post_init__(self) -> None:
        if not (1 <= self.value <= 12):
            raise ValueError(f"Grade must be between 1 and 12, got {self.value}")
