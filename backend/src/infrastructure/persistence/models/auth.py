"""ORM-модель пользователя (таблица users).

Определяет SQLAlchemy-модель для хранения учётных записей
всех пользователей платформы EduPlatform. Поддерживает роли:
director, mup, teacher, sales_manager, cashier, student.

Таблица:
    users — основная таблица пользователей с полями аутентификации,
    контактной информацией и флагом активности.

Связи:
    - StudentModel.user_id → users.id (один-к-одному для студентов).
    - LessonModel.teacher_id → users.id (преподаватель урока).
    - SubjectModel.teacher_id → users.id (преподаватель предмета).
"""
import uuid
from datetime import date

from sqlalchemy import Boolean, Date, String, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.infrastructure.persistence.models.base import TimestampMixin, UUIDPrimaryKey
from src.domain.auth.entities import UserRole


class UserModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель пользователя системы.

    Хранит учётные данные, контактную информацию и роль пользователя.
    Используется для аутентификации через JWT и авторизации по ролям.

    Attributes:
        email: Уникальный email-адрес (индексирован).
        password_hash: Bcrypt-хеш пароля.
        name: Полное имя пользователя (ФИО).
        role: Роль пользователя (director, mup, teacher, sales_manager,
            cashier, student). Хранится как строка в PostgreSQL enum.
        phone: Номер телефона (опционально, до 30 символов).
        date_of_birth: Дата рождения (опционально).
        avatar_url: URL аватара пользователя (опционально).
        is_active: Флаг активности учётной записи.
            Деактивированные пользователи не могут авторизоваться.

    Note:
        Поле role — строка, НЕ enum Python. Никогда не используйте
        `user.role.value` — просто `user.role`.
    """
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
