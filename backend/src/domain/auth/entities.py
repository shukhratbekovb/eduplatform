from dataclasses import dataclass, field
from enum import StrEnum
from uuid import UUID

from src.domain.shared.entity import AggregateRoot
from src.domain.shared.value_objects import Email


class UserRole(StrEnum):
    DIRECTOR = "director"
    MUP = "mup"
    TEACHER = "teacher"
    SALES_MANAGER = "sales_manager"
    CASHIER = "cashier"
    STUDENT = "student"


@dataclass
class User(AggregateRoot):
    email: Email = field(default_factory=lambda: Email("placeholder@example.com"))
    password_hash: str = ""
    name: str = ""
    role: UserRole = UserRole.TEACHER
    avatar_url: str | None = None
    is_active: bool = True

    @classmethod
    def create(
        cls,
        name: str,
        email: str,
        password_hash: str,
        role: UserRole,
        avatar_url: str | None = None,
    ) -> "User":
        return cls(
            email=Email(email),
            password_hash=password_hash,
            name=name,
            role=role,
            avatar_url=avatar_url,
        )

    def deactivate(self) -> None:
        self.is_active = False

    def change_role(self, new_role: UserRole) -> None:
        self.role = new_role

    @property
    def email_str(self) -> str:
        return str(self.email)

    def is_staff(self) -> bool:
        return self.role != UserRole.STUDENT
