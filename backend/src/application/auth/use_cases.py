"""Сценарии использования (Use Cases) подсистемы аутентификации.

Этот модуль реализует прикладные сценарии (Application Layer) для
аутентификации и управления учётными записями пользователей:

- **LoginUseCase**: Вход в систему по email и паролю.
- **RefreshTokenUseCase**: Обновление пары JWT-токенов.
- **CreateUserUseCase**: Создание нового пользователя (только для администратора).
- **ChangePasswordUseCase**: Смена пароля текущим пользователем.
- **GetMeUseCase**: Получение профиля текущего пользователя.

Все сценарии принимают зависимости через конструктор (Dependency Injection)
и работают с абстрактным UserRepository, что обеспечивает независимость
от инфраструктурного слоя.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID, uuid4

from src.application.interfaces.repositories import UserRepository
from src.domain.auth.entities import User, UserRole
from src.domain.auth.policies import PasswordPolicy
from src.domain.shared.value_objects import Email
from src.infrastructure.services.jwt_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from src.infrastructure.services.password_service import hash_password, verify_password


@dataclass
class TokenPair:
    """Пара JWT-токенов для аутентификации.

    Содержит access token (короткоживущий, для авторизации запросов)
    и refresh token (долгоживущий, для обновления access token).

    Attributes:
        access_token: JWT access token с ролью и ID пользователя.
        refresh_token: JWT refresh token для обновления пары.
        token_type: Тип токена (всегда "bearer").
    """

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ── Login ─────────────────────────────────────────────────────────────────────


class LoginUseCase:
    """Сценарий входа пользователя в систему.

    Проверяет учётные данные (email + пароль), верифицирует
    активность аккаунта и возвращает пару JWT-токенов.

    Attributes:
        _users: Репозиторий пользователей для поиска по email.
    """

    def __init__(self, users: UserRepository) -> None:
        """Инициализирует сценарий с зависимостью от репозитория.

        Args:
            users: Абстрактный репозиторий пользователей.
        """
        self._users = users

    async def execute(self, email: str, password: str) -> TokenPair:
        """Выполняет аутентификацию пользователя.

        Последовательность проверок:
            1. Поиск пользователя по email.
            2. Верификация пароля (bcrypt).
            3. Проверка активности аккаунта.
            4. Генерация JWT access + refresh токенов.

        Args:
            email: Адрес электронной почты пользователя.
            password: Пароль в открытом виде (будет верифицирован
                против bcrypt-хэша).

        Returns:
            TokenPair: Пара JWT-токенов (access + refresh).

        Raises:
            ValueError: С сообщением "user_not_found", если пользователь
                не найден по email.
            ValueError: С сообщением "wrong_password", если пароль неверный.
            ValueError: С сообщением "account_deactivated", если аккаунт
                деактивирован.
        """
        user = await self._users.get_by_email(email)
        if user is None:
            raise ValueError("user_not_found")
        if not verify_password(password, user.password_hash):
            raise ValueError("wrong_password")
        if not user.is_active:
            raise ValueError("account_deactivated")

        return TokenPair(
            access_token=create_access_token(user.id, user.role.value),
            refresh_token=create_refresh_token(user.id),
        )


# ── Refresh ───────────────────────────────────────────────────────────────────


class RefreshTokenUseCase:
    """Сценарий обновления JWT-токенов.

    Принимает валидный refresh token, проверяет его тип и срок
    действия, находит пользователя и генерирует новую пару токенов.

    Attributes:
        _users: Репозиторий пользователей для поиска по ID.
    """

    def __init__(self, users: UserRepository) -> None:
        """Инициализирует сценарий с зависимостью от репозитория.

        Args:
            users: Абстрактный репозиторий пользователей.
        """
        self._users = users

    async def execute(self, refresh_token: str) -> TokenPair:
        """Обновляет пару JWT-токенов по refresh token.

        Последовательность:
            1. Декодирование и валидация refresh token.
            2. Проверка типа токена (должен быть "refresh").
            3. Поиск пользователя по ID из payload.
            4. Проверка активности аккаунта.
            5. Генерация новой пары токенов.

        Args:
            refresh_token: Текущий JWT refresh token.

        Returns:
            TokenPair: Новая пара JWT-токенов (access + refresh).

        Raises:
            ValueError: Если токен невалидный, истёк, не является
                refresh-токеном, или пользователь не найден/деактивирован.
        """
        from jose import JWTError

        try:
            payload = decode_token(refresh_token)
        except JWTError:
            raise ValueError("Invalid or expired refresh token")

        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")

        user_id = UUID(payload["sub"])
        user = await self._users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise ValueError("User not found or inactive")

        return TokenPair(
            access_token=create_access_token(user.id, user.role.value),
            refresh_token=create_refresh_token(user.id),
        )


# ── Create User (admin) ───────────────────────────────────────────────────────


@dataclass
class CreateUserInput:
    """DTO для создания нового пользователя.

    Attributes:
        email: Адрес электронной почты нового пользователя.
        password: Пароль (будет провалидирован PasswordPolicy
            и захэширован bcrypt).
        name: Полное имя пользователя (ФИО).
        role: Строковое представление роли (director, mup,
            teacher, sales_manager, cashier, student).
    """

    email: str
    password: str
    name: str
    role: str


class CreateUserUseCase:
    """Сценарий создания нового пользователя (только для администратора).

    Валидирует пароль по PasswordPolicy (Apple-style), проверяет
    уникальность email, создаёт доменную сущность User и сохраняет
    через репозиторий.

    Attributes:
        _users: Репозиторий пользователей.
    """

    def __init__(self, users: UserRepository) -> None:
        """Инициализирует сценарий с зависимостью от репозитория.

        Args:
            users: Абстрактный репозиторий пользователей.
        """
        self._users = users

    async def execute(self, inp: CreateUserInput) -> User:
        """Создаёт нового пользователя в системе.

        Последовательность:
            1. Валидация пароля через PasswordPolicy.
            2. Проверка уникальности email.
            3. Валидация роли (должна быть из UserRole).
            4. Хэширование пароля (bcrypt).
            5. Создание и сохранение сущности User.

        Args:
            inp: DTO с данными нового пользователя.

        Returns:
            User: Созданная доменная сущность пользователя.

        Raises:
            ValueError: Если пароль не соответствует требованиям
                PasswordPolicy (с перечислением невыполненных правил).
            ValueError: Если email уже зарегистрирован в системе.
            ValueError: Если указана невалидная роль.
        """
        errors = PasswordPolicy.validate(inp.password)
        if errors:
            raise ValueError("; ".join(errors))

        existing = await self._users.get_by_email(inp.email)
        if existing is not None:
            raise ValueError(f"Email {inp.email!r} already registered")

        try:
            role = UserRole(inp.role)
        except ValueError:
            raise ValueError(f"Invalid role: {inp.role!r}")

        user = User(
            id=uuid4(),
            email=Email(inp.email),
            password_hash=hash_password(inp.password),
            name=inp.name,
            role=role,
        )
        await self._users.save(user)
        return user


# ── Change Password ───────────────────────────────────────────────────────────


class ChangePasswordUseCase:
    """Сценарий смены пароля текущим пользователем.

    Требует подтверждение текущего пароля для безопасности.
    Новый пароль проверяется через PasswordPolicy.

    Attributes:
        _users: Репозиторий пользователей.
    """

    def __init__(self, users: UserRepository) -> None:
        """Инициализирует сценарий с зависимостью от репозитория.

        Args:
            users: Абстрактный репозиторий пользователей.
        """
        self._users = users

    async def execute(self, user_id: UUID, old_password: str, new_password: str) -> None:
        """Выполняет смену пароля пользователя.

        Последовательность:
            1. Поиск пользователя по ID.
            2. Верификация текущего пароля.
            3. Валидация нового пароля через PasswordPolicy.
            4. Хэширование и сохранение нового пароля.

        Args:
            user_id: UUID текущего пользователя.
            old_password: Текущий пароль для подтверждения.
            new_password: Новый пароль (будет провалидирован
                и захэширован).

        Raises:
            ValueError: Если пользователь не найден, текущий
                пароль неверный, или новый пароль не соответствует
                требованиям PasswordPolicy.
        """
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise ValueError("User not found")
        if not verify_password(old_password, user.password_hash):
            raise ValueError("Wrong current password")
        errors = PasswordPolicy.validate(new_password)
        if errors:
            raise ValueError("; ".join(errors))

        user.password_hash = hash_password(new_password)
        await self._users.save(user)


# ── Get Me ────────────────────────────────────────────────────────────────────


class GetMeUseCase:
    """Сценарий получения профиля текущего пользователя.

    Используется для отображения данных авторизованного пользователя
    в интерфейсе (имя, роль, email, аватар).

    Attributes:
        _users: Репозиторий пользователей.
    """

    def __init__(self, users: UserRepository) -> None:
        """Инициализирует сценарий с зависимостью от репозитория.

        Args:
            users: Абстрактный репозиторий пользователей.
        """
        self._users = users

    async def execute(self, user_id: UUID) -> User:
        """Возвращает данные пользователя по его идентификатору.

        Args:
            user_id: UUID авторизованного пользователя
                (извлекается из JWT-токена).

        Returns:
            User: Доменная сущность пользователя.

        Raises:
            ValueError: Если пользователь не найден в системе.
        """
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise ValueError("User not found")
        return user
