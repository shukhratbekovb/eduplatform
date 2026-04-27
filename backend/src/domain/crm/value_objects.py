"""CRM domain value objects."""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class WinProbability:
    """Stage win probability — integer 0 to 100."""

    value: int

    def __post_init__(self) -> None:
        if not (0 <= self.value <= 100):
            raise ValueError(f"Win probability must be 0–100, got {self.value}")

    def __int__(self) -> int:
        return self.value


@dataclass(frozen=True)
class HexColor:
    """CSS hex color code (e.g. #6366F1)."""

    value: str

    def __post_init__(self) -> None:
        if not re.match(r"^#[0-9A-Fa-f]{6}$", self.value):
            raise ValueError(f"Invalid hex color: {self.value}. Expected #RRGGBB format")

    def __str__(self) -> str:
        return self.value
