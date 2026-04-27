"""Gamification domain value objects."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Reward:
    """Achievement reward — stars and crystals bundle."""

    stars: int = 0
    crystals: int = 0

    def __post_init__(self) -> None:
        if self.stars < 0:
            raise ValueError(f"Reward stars cannot be negative, got {self.stars}")
        if self.crystals < 0:
            raise ValueError(f"Reward crystals cannot be negative, got {self.crystals}")

    @property
    def is_empty(self) -> bool:
        return self.stars == 0 and self.crystals == 0
