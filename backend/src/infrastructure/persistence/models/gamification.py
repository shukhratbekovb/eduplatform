"""ORM-модели подсистемы геймификации.

Определяет SQLAlchemy-модели для системы мотивации студентов:
достижения (ачивки), события активности, магазин наград и покупки.

Таблицы:
    - achievements: каталог достижений с триггерами автоматической разблокировки.
    - student_achievements: связь студент-достижение (М:М) с датой разблокировки.
    - student_activity_events: лента событий (начисление звёзд/кристаллов и т.д.).
    - shop_items: товары магазина наград (стоимость в звёздах/кристаллах).
    - student_purchases: покупки студентов в магазине.

Правила начисления:
    - Звёзды: посещение (+5), опоздание (-2), оценки 9-10 (+10), 7-8 (+5).
    - Кристаллы: серия 5 уроков (+5), серия 10 уроков (+15), ручное начисление.
    - Бейджи: Bronze(0) → Silver(100) → Gold(300) → Platinum(600) → Diamond(1000).
"""
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Integer, Numeric, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base
from src.infrastructure.persistence.models.base import TimestampMixin, UUIDPrimaryKey


class AchievementModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель достижения (ачивки) в системе геймификации.

    Определяет каталог достижений, которые студенты могут разблокировать.
    Каждое достижение имеет категорию, опциональный триггер для автоматической
    разблокировки и награду в звёздах/кристаллах.

    Attributes:
        name: Название достижения (например, "Первая десятка").
        description: Описание условий получения (опционально).
        category: Категория (academic, attendance, activity, social, special).
        icon: Эмодзи-иконка (опционально, до 10 символов).
        reward_stars: Количество звёзд-награды за разблокировку.
        reward_crystals: Количество кристаллов-награды за разблокировку.
        trigger_type: Тип триггера автоматической разблокировки
            (например, "first_grade", "five_tens", "gpa_9"). None — ручная.
        trigger_value: Пороговое значение для триггера (опционально).
        is_active: Флаг активности (неактивные не показываются в каталоге).
    """
    __tablename__ = "achievements"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(
        SAEnum("academic", "attendance", "activity", "social", "special", name="ach_category", create_type=False),
        nullable=False,
    )
    icon: Mapped[str | None] = mapped_column(String(10), nullable=True)
    reward_stars: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reward_crystals: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    trigger_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    trigger_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class StudentAchievementModel(Base, UUIDPrimaryKey):
    """ORM-модель связи студент-достижение.

    Фиксирует факт разблокировки достижения конкретным студентом
    с отметкой времени. Связь многие-ко-многим между students и achievements.

    Attributes:
        student_id: UUID студента, разблокировавшего достижение.
        achievement_id: UUID разблокированного достижения.
        unlocked_at: Дата и время разблокировки (UTC).
    """
    __tablename__ = "student_achievements"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    achievement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("achievements.id", ondelete="CASCADE"),
        nullable=False,
    )
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class StudentActivityEventModel(Base, UUIDPrimaryKey):
    """ORM-модель события активности студента.

    Записывает все события начисления/списания звёзд и кристаллов,
    формируя ленту активности студента. Используется для отображения
    истории в студенческом портале.

    Attributes:
        student_id: UUID студента.
        type: Тип события (stars_earned, crystals_earned, homework_graded,
            attendance, teacher_reply, badge_unlocked).
        description: Текстовое описание события (например,
            "Посещение: Основы Python").
        stars_amount: Количество начисленных/списанных звёзд (None если не применимо).
        crystals_amount: Количество начисленных/списанных кристаллов.
        subject_id: UUID предмета, связанного с событием (опционально).
        linked_lesson_id: UUID урока, связанного с событием (опционально).
        created_at: Дата и время создания события (UTC, индексировано).
    """
    __tablename__ = "student_activity_events"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    type: Mapped[str] = mapped_column(
        SAEnum(
            "stars_earned", "crystals_earned", "homework_graded",
            "attendance", "teacher_reply", "badge_unlocked",
            name="activity_event_type", create_type=False,
        ),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    stars_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    crystals_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    linked_lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)


class ShopItemModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель товара в магазине наград.

    Определяет товары, которые студенты могут приобрести за звёзды
    и/или кристаллы. Поддерживает ограниченный запас (stock).

    Attributes:
        name: Название товара (например, "Стикерпак", "Футболка").
        description: Описание товара (опционально).
        icon: Эмодзи-иконка товара (опционально).
        category: Категория товара (по умолчанию "reward").
        cost_stars: Стоимость в звёздах.
        cost_crystals: Стоимость в кристаллах.
        stock: Количество в наличии (None = безлимитно).
        is_active: Флаг активности (неактивные не показываются).
    """
    __tablename__ = "shop_items"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(10), nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="reward")
    cost_stars: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost_crystals: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stock: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = unlimited
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class StudentPurchaseModel(Base, UUIDPrimaryKey):
    """ORM-модель покупки студента в магазине наград.

    Фиксирует факт покупки товара конкретным студентом.
    Звёзды/кристаллы списываются при создании записи.

    Attributes:
        student_id: UUID студента-покупателя.
        item_id: UUID купленного товара.
        purchased_at: Дата и время покупки (UTC).
    """
    __tablename__ = "student_purchases"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shop_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    purchased_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
