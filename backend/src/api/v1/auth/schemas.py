"""Pydantic-схемы для модуля аутентификации.

Определяет request/response модели для эндпоинтов аутентификации:
логин, обновление токена, управление профилем и пользователями.

Фронтенды (CRM, Logbook, Student Portal) ожидают ответы в camelCase,
поэтому основные response-модели используют camelCase-поля.
Для обратной совместимости сохранены также snake_case-модели.

Классы:
    - LoginRequest / LoginResponse: вход в систему.
    - UserOut: представление пользователя для всех фронтендов.
    - StudentProfile: студент-специфичные данные при логине.
    - CreateUserRequest: создание нового пользователя (директор).
    - ChangePasswordRequest: смена пароля текущим пользователем.
    - UpdateProfileRequest: обновление профиля.
"""
from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    """Запрос на вход в систему.

    Attributes:
        email: Email пользователя (валидируется как EmailStr).
        password: Пароль в открытом виде.
    """
    email: EmailStr
    password: str


# ── Camel-case response shapes expected by all frontends ──────────────────────

class UserOut(BaseModel):
    """Представление пользователя, возвращаемое всем фронтендам (camelCase).

    Используется в ответах /auth/login, /auth/me и /auth/users.
    Все поля в camelCase для совместимости с фронтенд-приложениями.

    Attributes:
        id: Уникальный идентификатор пользователя.
        name: Полное имя пользователя.
        email: Email-адрес.
        role: Роль пользователя (director, mup, teacher, cashier, student и т.д.).
        avatarUrl: URL аватара (опционально).
        phone: Номер телефона (опционально).
        dateOfBirth: Дата рождения в формате ISO (опционально).
        isActive: Флаг активности учётной записи.
    """
    id: UUID
    name: str
    email: str
    role: str
    avatarUrl: str | None = None
    phone: str | None = None
    dateOfBirth: str | None = None
    isActive: bool = True


class StudentProfile(BaseModel):
    """Студент-специфичные данные, возвращаемые при логине в Student Portal.

    Содержит информацию о студенте, его группе и игровых показателях
    (звёзды, кристаллы). Поле student в LoginResponse заполняется
    только при role == 'student'.

    Attributes:
        id: UUID студента (из таблицы students, не users).
        fullName: Полное имя студента.
        photo: URL фотографии (опционально).
        studentCode: Уникальный код студента (опционально).
        groupId: UUID текущей группы (опционально).
        groupName: Название текущей группы (опционально).
        stars: Количество звёзд в геймификации.
        crystals: Количество кристаллов (бриллиантов).
        email: Email студента.
        phone: Телефон студента (опционально).
        dateOfBirth: Дата рождения в формате ISO (опционально).
    """
    id: UUID
    fullName: str
    photo: str | None = None
    studentCode: str | None = None
    groupId: str | None = None
    groupName: str | None = None
    stars: int = 0
    crystals: int = 0
    email: str
    phone: str | None = None
    dateOfBirth: str | None = None


class LoginResponse(BaseModel):
    """Ответ на запрос логина или обновления токена.

    Используется эндпоинтами /auth/login и /auth/refresh.
    Содержит информацию о пользователе, JWT-токены и опционально
    профиль студента.

    Attributes:
        user: Основная информация о пользователе.
        student: Профиль студента (только для role == 'student').
        accessToken: JWT access-токен для авторизации запросов.
        refreshToken: JWT refresh-токен для обновления access-токена.
        tokenType: Тип токена (всегда "bearer").
    """
    user: UserOut
    # student is populated only when role == 'student'; the Student Portal reads this field
    student: StudentProfile | None = None
    accessToken: str
    refreshToken: str
    tokenType: str = "bearer"


# ── Legacy snake_case aliases (for any internal callers) ─────────────────────

class TokenResponse(BaseModel):
    """Ответ с парой токенов (snake_case, для внутренних вызовов).

    Attributes:
        access_token: JWT access-токен.
        refresh_token: JWT refresh-токен.
        token_type: Тип токена (по умолчанию "bearer").
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Запрос на обновление JWT-токенов.

    Attributes:
        refresh_token: Действующий refresh-токен для обмена на новую пару.
    """
    refresh_token: str


class UserResponse(BaseModel):
    """Представление пользователя в snake_case (для внутренних вызовов).

    Attributes:
        id: UUID пользователя.
        email: Email-адрес.
        name: Полное имя.
        role: Роль пользователя.
        avatar_url: URL аватара.
        is_active: Флаг активности.
    """
    id: UUID
    email: str
    name: str
    role: str
    avatar_url: str | None
    is_active: bool


class CreateUserRequest(BaseModel):
    """Запрос на создание нового пользователя (доступно только директору).

    Attributes:
        email: Email нового пользователя.
        password: Пароль (минимум 8 символов).
        name: Полное имя.
        role: Роль (director, mup, teacher, cashier, sales_manager, student).
    """
    email: EmailStr
    password: str
    name: str
    role: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        """Валидирует минимальную длину пароля.

        Args:
            v: Значение пароля для проверки.

        Returns:
            str: Пароль, если длина >= 8 символов.

        Raises:
            ValueError: Если пароль короче 8 символов.
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class ChangePasswordRequest(BaseModel):
    """Запрос на смену пароля текущим пользователем.

    Attributes:
        old_password: Текущий пароль для верификации.
        new_password: Новый пароль (минимум 8 символов).
    """
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        """Валидирует минимальную длину нового пароля.

        Args:
            v: Значение нового пароля для проверки.

        Returns:
            str: Новый пароль, если длина >= 8 символов.

        Raises:
            ValueError: Если новый пароль короче 8 символов.
        """
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v


class UpdateProfileRequest(BaseModel):
    """Запрос на обновление профиля текущего пользователя.

    Все поля опциональны — обновляются только переданные.

    Attributes:
        name: Новое имя (опционально).
        avatar_url: URL нового аватара (опционально).
        phone: Новый номер телефона (опционально).
        date_of_birth: Дата рождения в формате ISO (опционально).
    """
    name: str | None = None
    avatar_url: str | None = None
    phone: str | None = None
    date_of_birth: str | None = None
