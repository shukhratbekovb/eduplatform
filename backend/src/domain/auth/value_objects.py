"""Auth domain value objects."""
from dataclasses import dataclass

from src.domain.auth.specifications import PASSWORD_RULES


@dataclass(frozen=True)
class Password:
    """Raw password before hashing — validates all strength rules via specifications."""
    value: str

    def __post_init__(self) -> None:
        errors = []
        for spec, message in PASSWORD_RULES:
            if not spec.is_satisfied_by(self.value):
                errors.append(message)
        if errors:
            raise ValueError("; ".join(errors))

    def __str__(self) -> str:
        return "***"  # never expose raw password in logs
