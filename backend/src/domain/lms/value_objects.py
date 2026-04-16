"""LMS domain value objects."""
import re
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class StudentCode:
    """Unique student identifier code (e.g. STU-001)."""
    value: str

    def __post_init__(self) -> None:
        if not self.value or not self.value.strip():
            raise ValueError("Student code cannot be empty")
        if not re.match(r"^[A-Z]{2,5}-\d{3,6}$", self.value):
            raise ValueError(
                f"Invalid student code format: {self.value}. "
                "Expected: 2-5 uppercase letters, dash, 3-6 digits (e.g. STU-001)"
            )

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class Percentage:
    """A value constrained to 0–100 (attendance, completion rate, etc.)."""
    value: Decimal

    def __post_init__(self) -> None:
        if not (Decimal("0") <= self.value <= Decimal("100")):
            raise ValueError(f"Percentage must be 0–100, got {self.value}")

    def __str__(self) -> str:
        return f"{self.value}%"

    def __lt__(self, other: object) -> bool:
        if isinstance(other, Percentage):
            return self.value < other.value
        if isinstance(other, (int, float, Decimal)):
            return self.value < Decimal(str(other))
        return NotImplemented

    def __ge__(self, other: object) -> bool:
        if isinstance(other, Percentage):
            return self.value >= other.value
        if isinstance(other, (int, float, Decimal)):
            return self.value >= Decimal(str(other))
        return NotImplemented
