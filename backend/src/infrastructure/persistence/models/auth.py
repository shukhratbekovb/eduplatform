import uuid
from datetime import date

from sqlalchemy import Boolean, Date, String, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.infrastructure.persistence.models.base import TimestampMixin, UUIDPrimaryKey
from src.domain.auth.entities import UserRole


class UserModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        SAEnum(
            "director", "mup", "teacher", "sales_manager", "cashier", "student",
            name="user_role", create_type=False,
        ),
        nullable=False,
        index=True,
    )
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
