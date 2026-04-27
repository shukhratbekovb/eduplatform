"""API подсистемы геймификации — достижения, таблица лидеров, начисление наград, магазин.

Предоставляет REST API для управления системой мотивации студентов:
    - Каталог достижений (ачивок) с возможностью создания новых.
    - Ручное начисление звёзд и кристаллов студентам.
    - Разблокировка достижений с автобонусами.
    - Таблица лидеров (рейтинг по звёздам или кристаллам).
    - Магазин наград с товарами и покупками.
    - Каталог достижений с персональным статусом разблокировки.

Правила начисления:
    - Посещение: +5 звёзд (present), -2 звезды (late), 0 (absent).
    - Оценка урока: +10 звёзд (9-10), +5 звёзд (7-8).
    - Домашка вовремя: +15 звёзд.
    - Оценка домашки: +20 звёзд (9-10), +10 звёзд (7-8).
    - Серия посещений: +5 кристаллов (5 подряд), +15 кристаллов (10 подряд).

Бейджи: Bronze(0) → Silver(100) → Gold(300) → Platinum(600) → Diamond(1000).

Роуты:
    GET /gamification/achievements — каталог достижений.
    POST /gamification/achievements — создание достижения (персонал).
    POST /gamification/award — начисление звёзд/кристаллов (персонал).
    POST /gamification/unlock — разблокировка достижения (персонал).
    GET /gamification/leaderboard — таблица лидеров.
    GET /gamification/shop — каталог товаров магазина.
    POST /gamification/shop — создание товара (персонал).
    POST /gamification/shop/purchase — покупка товара (студент).
    GET /gamification/achievements/catalog — персональный каталог с unlock-статусом.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.auth import UserModel
from src.infrastructure.persistence.models.gamification import (
    AchievementModel,
    ShopItemModel,
    StudentAchievementModel,
    StudentActivityEventModel,
    StudentPurchaseModel,
)
from src.infrastructure.persistence.models.lms import StudentModel

router = APIRouter(prefix="/gamification", tags=["Gamification"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]
"""Гвард: доступ для персонала (директор, МУП, преподаватель)."""


# ── Achievements catalog ──────────────────────────────────────────────────────


class AchievementOut(BaseModel):
    """Ответ с данными достижения.

    Attributes:
        id: UUID достижения.
        name: Название.
        description: Описание условий получения.
        category: Категория (academic, attendance, activity, social, special).
        icon: Эмодзи-иконка.
        reward_stars: Награда в звёздах.
        reward_crystals: Награда в кристаллах.
        trigger_type: Тип триггера автоматической разблокировки.
        trigger_value: Пороговое значение триггера.
        is_active: Флаг активности.
    """

    id: UUID
    name: str
    description: str | None
    category: str
    icon: str | None
    reward_stars: int
    reward_crystals: int
    trigger_type: str | None
    trigger_value: int | None
    is_active: bool


class AchievementIn(BaseModel):
    """Запрос на создание достижения.

    Attributes:
        name: Название достижения.
        description: Описание (опционально).
        category: Категория (обязательно).
        icon: Эмодзи-иконка (опционально).
        reward_stars: Награда в звёздах (по умолчанию 0).
        reward_crystals: Награда в кристаллах (по умолчанию 0).
        trigger_type: Тип триггера (опционально).
        trigger_value: Пороговое значение (опционально).
    """

    name: str
    description: str | None = None
    category: str
    icon: str | None = None
    reward_stars: int = 0
    reward_crystals: int = 0
    trigger_type: str | None = None
    trigger_value: int | None = None


@router.get("/achievements", response_model=list[AchievementOut])
async def list_achievements(current_user: CurrentUser, db: DbSession) -> list[AchievementOut]:
    """Получение каталога активных достижений.

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        list[AchievementOut]: Список всех активных достижений.
    """
    rows = (
        (
            await db.execute(
                select(AchievementModel).where(AchievementModel.is_active == True)  # noqa: E712
            )
        )
        .scalars()
        .all()
    )
    return [_ach_out(r) for r in rows]


@router.post("/achievements", response_model=AchievementOut, status_code=201)
async def create_achievement(body: AchievementIn, _: StaffGuard, db: DbSession) -> AchievementOut:
    """Создание нового достижения (только персонал).

    Валидирует категорию из допустимого набора.

    Args:
        body: Данные нового достижения.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        AchievementOut: Созданное достижение.

    Raises:
        HTTPException: 400 — если категория невалидна.
    """
    VALID_CATS = {"academic", "attendance", "activity", "social", "special"}
    if body.category not in VALID_CATS:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of {sorted(VALID_CATS)}")
    m = AchievementModel(id=uuid4(), **body.model_dump())
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return _ach_out(m)


# ── Award stars/crystals ──────────────────────────────────────────────────────


class AwardRequest(BaseModel):
    """Запрос на ручное начисление звёзд/кристаллов студенту.

    Attributes:
        student_id: UUID студента.
        stars: Количество звёзд (>= 0).
        crystals: Количество кристаллов (>= 0).
        description: Описание причины начисления (обязательно).
        subject_id: UUID предмета (опционально, для привязки).
        lesson_id: UUID урока (опционально, для привязки).
    """

    student_id: UUID
    stars: int = 0
    crystals: int = 0
    description: str
    subject_id: UUID | None = None
    lesson_id: UUID | None = None


@router.post("/award", response_model=dict)  # type: ignore[type-arg]
async def award_student(body: AwardRequest, _: StaffGuard, current_user: CurrentUser, db: DbSession) -> dict:  # type: ignore[type-arg]
    """Ручное начисление звёзд и/или кристаллов студенту.

    Создаёт записи в ленте активности студента. Обновляет балансы
    звёзд и кристаллов в профиле студента.

    Args:
        body: Данные начисления (student_id, stars, crystals, description).
        _: Гвард доступа персонала.
        current_user: Текущий пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        dict: {"student_id": str, "stars": int, "crystals": int} — обновлённые балансы.

    Raises:
        HTTPException: 400 — если stars и crystals оба <= 0.
        HTTPException: 404 — если студент не найден.
    """
    if body.stars <= 0 and body.crystals <= 0:
        raise HTTPException(status_code=400, detail="Must award at least 1 star or crystal")

    student = await db.get(StudentModel, body.student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    now = datetime.now(UTC)

    if body.stars > 0:
        student.stars = (student.stars or 0) + body.stars
        db.add(
            StudentActivityEventModel(
                id=uuid4(),
                student_id=body.student_id,
                type="stars_earned",
                description=body.description,
                stars_amount=body.stars,
                crystals_amount=None,
                subject_id=body.subject_id,
                linked_lesson_id=body.lesson_id,
                created_at=now,
            )
        )

    if body.crystals > 0:
        student.crystals = (student.crystals or 0) + body.crystals
        db.add(
            StudentActivityEventModel(
                id=uuid4(),
                student_id=body.student_id,
                type="crystals_earned",
                description=body.description,
                stars_amount=None,
                crystals_amount=body.crystals,
                subject_id=body.subject_id,
                linked_lesson_id=body.lesson_id,
                created_at=now,
            )
        )

    await db.commit()
    return {"student_id": str(body.student_id), "stars": student.stars, "crystals": student.crystals}


# ── Unlock achievement ────────────────────────────────────────────────────────


class UnlockRequest(BaseModel):
    """Запрос на ручную разблокировку достижения для студента.

    Attributes:
        student_id: UUID студента.
        achievement_id: UUID достижения для разблокировки.
    """

    student_id: UUID
    achievement_id: UUID


@router.post("/unlock", response_model=dict)  # type: ignore[type-arg]
async def unlock_achievement(body: UnlockRequest, _: StaffGuard, db: DbSession) -> dict:  # type: ignore[type-arg]
    """Ручная разблокировка достижения для студента.

    Проверяет существование достижения и студента, отсутствие
    дублирующей разблокировки. При разблокировке автоматически
    начисляет бонусные звёзды/кристаллы из достижения.

    Args:
        body: Данные разблокировки (student_id, achievement_id).
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        dict: {"unlocked": True, "achievement": str, "reward_stars": int,
            "reward_crystals": int}.

    Raises:
        HTTPException: 404 — если достижение или студент не найдены.
        HTTPException: 409 — если достижение уже разблокировано.
    """
    ach = await db.get(AchievementModel, body.achievement_id)
    if ach is None:
        raise HTTPException(status_code=404, detail="Achievement not found")

    student = await db.get(StudentModel, body.student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check already unlocked
    existing = (
        await db.execute(
            select(StudentAchievementModel).where(
                StudentAchievementModel.student_id == body.student_id,
                StudentAchievementModel.achievement_id == body.achievement_id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Achievement already unlocked")

    now = datetime.now(UTC)
    db.add(
        StudentAchievementModel(
            id=uuid4(),
            student_id=body.student_id,
            achievement_id=body.achievement_id,
            unlocked_at=now,
        )
    )

    # Award bonus stars/crystals from achievement
    if ach.reward_stars > 0:
        student.stars = (student.stars or 0) + ach.reward_stars
    if ach.reward_crystals > 0:
        student.crystals = (student.crystals or 0) + ach.reward_crystals

    db.add(
        StudentActivityEventModel(
            id=uuid4(),
            student_id=body.student_id,
            type="badge_unlocked",
            description=f"Achievement unlocked: {ach.name}",
            stars_amount=ach.reward_stars or None,
            crystals_amount=ach.reward_crystals or None,
            created_at=now,
        )
    )

    await db.commit()
    return {
        "unlocked": True,
        "achievement": ach.name,
        "reward_stars": ach.reward_stars,
        "reward_crystals": ach.reward_crystals,
    }


# ── Leaderboard ───────────────────────────────────────────────────────────────


class LeaderboardEntry(BaseModel):
    """Запись таблицы лидеров.

    Attributes:
        rank: Позиция в рейтинге (начиная с 1).
        student_id: UUID студента.
        full_name: ФИО студента.
        stars: Количество звёзд.
        crystals: Количество кристаллов.
        badge_level: Уровень бейджа (bronze, silver, gold, platinum, diamond).
    """

    rank: int
    student_id: UUID
    full_name: str
    stars: int
    crystals: int
    badge_level: str


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(
    current_user: CurrentUser,
    db: DbSession,
    limit: int = Query(20, ge=1, le=100),
    metric: str = Query("stars", pattern="^(stars|crystals)$"),
) -> list[LeaderboardEntry]:
    """Получение таблицы лидеров.

    Сортирует студентов по выбранной метрике (звёзды или кристаллы)
    в убывающем порядке. Требует привязку студента к пользователю (user_id).

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.
        limit: Максимальное количество записей (1-100).
        metric: Метрика сортировки ("stars" или "crystals").

    Returns:
        list[LeaderboardEntry]: Рейтинг студентов с позициями.
    """
    order_col = StudentModel.stars if metric == "stars" else StudentModel.crystals
    rows = (
        await db.execute(
            select(StudentModel, UserModel)
            .join(UserModel, UserModel.id == StudentModel.user_id)
            .order_by(desc(order_col))
            .limit(limit)
        )
    ).all()

    return [
        LeaderboardEntry(
            rank=i + 1,
            student_id=s.id,
            full_name=u.name,
            stars=s.stars or 0,
            crystals=s.crystals or 0,
            badge_level=s.badge_level or "bronze",
        )
        for i, (s, u) in enumerate(rows)
    ]


# ── Helpers ───────────────────────────────────────────────────────────────────

# ── Shop ─────────────────────────────────────────────────────────────────────


class ShopItemOut(BaseModel):
    """Ответ с данными товара магазина наград.

    Attributes:
        id: UUID товара.
        name: Название.
        description: Описание.
        icon: Эмодзи-иконка.
        category: Категория.
        cost_stars: Стоимость в звёздах.
        cost_crystals: Стоимость в кристаллах.
        stock: Количество в наличии (None = безлимитно).
        is_active: Флаг активности.
    """

    id: UUID
    name: str
    description: str | None
    icon: str | None
    category: str
    cost_stars: int
    cost_crystals: int
    stock: int | None
    is_active: bool


class ShopItemIn(BaseModel):
    """Запрос на создание товара в магазине наград.

    Attributes:
        name: Название товара.
        description: Описание (опционально).
        icon: Эмодзи-иконка (опционально).
        category: Категория (по умолчанию "reward").
        cost_stars: Цена в звёздах (по умолчанию 0).
        cost_crystals: Цена в кристаллах (по умолчанию 0).
        stock: Количество (None = безлимитно).
    """

    name: str
    description: str | None = None
    icon: str | None = None
    category: str = "reward"
    cost_stars: int = 0
    cost_crystals: int = 0
    stock: int | None = None


class PurchaseRequest(BaseModel):
    """Запрос на покупку товара в магазине (от студента).

    Attributes:
        item_id: UUID товара для покупки.
    """

    item_id: UUID


@router.get("/shop", response_model=list[ShopItemOut])
async def list_shop_items(current_user: CurrentUser, db: DbSession) -> list[ShopItemOut]:
    """Получение каталога активных товаров магазина наград.

    Сортировка по стоимости в звёздах (по возрастанию).

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        list[ShopItemOut]: Список активных товаров.
    """
    rows = (
        (
            await db.execute(
                select(ShopItemModel)
                .where(ShopItemModel.is_active == True)  # noqa: E712
                .order_by(ShopItemModel.cost_stars)
            )
        )
        .scalars()
        .all()
    )
    return [
        ShopItemOut(
            id=m.id,
            name=m.name,
            description=m.description,
            icon=m.icon,
            category=m.category,
            cost_stars=m.cost_stars,
            cost_crystals=m.cost_crystals,
            stock=m.stock,
            is_active=m.is_active,
        )
        for m in rows
    ]


@router.post("/shop", response_model=ShopItemOut, status_code=201)
async def create_shop_item(body: ShopItemIn, _: StaffGuard, db: DbSession) -> ShopItemOut:
    """Создание нового товара в магазине наград (только персонал).

    Args:
        body: Данные товара.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        ShopItemOut: Созданный товар.
    """
    m = ShopItemModel(id=uuid4(), **body.model_dump())
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return ShopItemOut(
        id=m.id,
        name=m.name,
        description=m.description,
        icon=m.icon,
        category=m.category,
        cost_stars=m.cost_stars,
        cost_crystals=m.cost_crystals,
        stock=m.stock,
        is_active=m.is_active,
    )


@router.post("/shop/purchase", response_model=dict)  # type: ignore[type-arg]
async def purchase_item(
    body: PurchaseRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:  # type: ignore[type-arg]
    """Покупка товара в магазине наград (только для студентов).

    Проверяет:
    1. Что текущий пользователь — студент.
    2. Что товар существует и активен.
    3. Наличие товара (stock > 0 или None = безлимитно).
    4. Достаточность баланса звёзд и кристаллов.

    При успешной покупке:
    - Списывает стоимость с баланса студента.
    - Уменьшает stock товара (если не безлимитный).
    - Создаёт запись покупки и событие в ленте активности.

    Args:
        body: UUID товара для покупки.
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        dict: {"purchased": True, "item": str, "stars": int, "crystals": int}.

    Raises:
        HTTPException: 400 — если недостаточно средств или товар закончился.
        HTTPException: 403 — если пользователь не студент.
        HTTPException: 404 — если товар не найден или неактивен.
    """
    # Find student
    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=403, detail="Only students can purchase")

    item = await db.get(ShopItemModel, body.item_id)
    if not item or not item.is_active:
        raise HTTPException(status_code=404, detail="Item not found")

    # Check stock
    if item.stock is not None and item.stock <= 0:
        raise HTTPException(status_code=400, detail="Out of stock")

    # Check balance
    if (student.stars or 0) < item.cost_stars:
        raise HTTPException(status_code=400, detail="Not enough stars")
    if (student.crystals or 0) < item.cost_crystals:
        raise HTTPException(status_code=400, detail="Not enough crystals")

    # Deduct
    student.stars = (student.stars or 0) - item.cost_stars
    student.crystals = (student.crystals or 0) - item.cost_crystals

    if item.stock is not None:
        item.stock -= 1

    now = datetime.now(UTC)
    db.add(
        StudentPurchaseModel(
            id=uuid4(),
            student_id=student.id,
            item_id=item.id,
            purchased_at=now,
        )
    )
    db.add(
        StudentActivityEventModel(
            id=uuid4(),
            student_id=student.id,
            type="stars_earned",
            description=f"Покупка: {item.name} (-{item.cost_stars}⭐ -{item.cost_crystals}💎)",
            stars_amount=-item.cost_stars if item.cost_stars else None,
            crystals_amount=-item.cost_crystals if item.cost_crystals else None,
            created_at=now,
        )
    )

    await db.commit()
    return {"purchased": True, "item": item.name, "stars": student.stars, "crystals": student.crystals}


# ── Student Achievement Catalog ──────────────────────────────────────────────


class AchievementCatalogOut(BaseModel):
    """Достижение из каталога с персональным статусом разблокировки.

    Attributes:
        id: UUID достижения.
        name: Название.
        description: Описание.
        category: Категория.
        icon: Эмодзи-иконка.
        reward_stars: Награда в звёздах.
        reward_crystals: Награда в кристаллах.
        trigger_type: Тип триггера.
        is_unlocked: Разблокировано ли текущим студентом.
        unlocked_at: Дата разблокировки (ISO, None если не разблокировано).
    """

    id: UUID
    name: str
    description: str | None
    category: str
    icon: str | None
    reward_stars: int
    reward_crystals: int
    trigger_type: str | None
    is_unlocked: bool
    unlocked_at: str | None


@router.get("/achievements/catalog", response_model=list[AchievementCatalogOut])
async def achievement_catalog(current_user: CurrentUser, db: DbSession) -> list[AchievementCatalogOut]:
    """Получение каталога всех достижений с персональным статусом разблокировки.

    Для текущего студента показывает, какие достижения разблокированы
    (цветные) и какие ещё нет (серые с замком).

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        list[AchievementCatalogOut]: Каталог достижений с unlock-статусом.
    """
    student = (
        await db.execute(select(StudentModel).where(StudentModel.user_id == current_user.id))
    ).scalar_one_or_none()

    achievements = (
        (
            await db.execute(
                select(AchievementModel).where(AchievementModel.is_active == True)  # noqa: E712
            )
        )
        .scalars()
        .all()
    )

    unlocked: dict = {}
    if student:
        rows = (
            (await db.execute(select(StudentAchievementModel).where(StudentAchievementModel.student_id == student.id)))
            .scalars()
            .all()
        )
        unlocked = {r.achievement_id: r.unlocked_at for r in rows}

    return [
        AchievementCatalogOut(
            id=a.id,
            name=a.name,
            description=a.description,
            category=a.category,
            icon=a.icon,
            reward_stars=a.reward_stars,
            reward_crystals=a.reward_crystals,
            trigger_type=a.trigger_type,
            is_unlocked=a.id in unlocked,
            unlocked_at=unlocked[a.id].isoformat() if a.id in unlocked else None,
        )
        for a in achievements
    ]


# ── Helpers ───────────────────────────────────────────────────────────────────


def _ach_out(m: AchievementModel) -> AchievementOut:
    """Преобразует ORM-модель AchievementModel в ответ AchievementOut.

    Args:
        m: ORM-модель достижения.

    Returns:
        AchievementOut: Сериализованный ответ для API.
    """
    return AchievementOut(
        id=m.id,
        name=m.name,
        description=m.description,
        category=m.category,
        icon=m.icon,
        reward_stars=m.reward_stars,
        reward_crystals=m.reward_crystals,
        trigger_type=m.trigger_type,
        trigger_value=m.trigger_value,
        is_active=m.is_active,
    )
