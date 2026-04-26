"""Сервис управления JWT-токенами.

Предоставляет функции для создания и декодирования JSON Web Token (JWT),
используемых для аутентификации и авторизации в платформе EduPlatform.

Поддерживает два типа токенов:
    - access: краткосрочный токен для доступа к API (время жизни из настроек).
    - refresh: долгосрочный токен для обновления access-токена.

Алгоритм шифрования и секретный ключ берутся из конфигурации приложения
(settings.SECRET_KEY, settings.ALGORITHM).

Example:
    >>> from src.infrastructure.services.jwt_service import (
    ...     create_access_token, create_refresh_token, decode_token,
    ... )
    >>> token = create_access_token(user_id, role="teacher")
    >>> payload = decode_token(token)
    >>> print(payload["sub"])  # UUID пользователя в виде строки
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt

from src.config import settings


def _now() -> datetime:
    """Возвращает текущее время в UTC.

    Returns:
        datetime: Текущий момент времени с timezone-aware UTC.
    """
    return datetime.now(timezone.utc)


def create_access_token(user_id: UUID, role: str) -> str:
    """Создаёт краткосрочный access JWT-токен.

    Токен содержит идентификатор пользователя, роль, время истечения
    и тип 'access'. Используется для авторизации запросов к API.

    Args:
        user_id: UUID пользователя, для которого создаётся токен.
        role: Роль пользователя (например, "director", "teacher", "student").

    Returns:
        str: Закодированный JWT-токен в виде строки.

    Example:
        >>> token = create_access_token(
        ...     user_id=UUID("550e8400-e29b-41d4-a716-446655440000"),
        ...     role="teacher",
        ... )
    """
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": _now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: UUID) -> str:
    """Создаёт долгосрочный refresh JWT-токен.

    Используется клиентом для получения новой пары access/refresh токенов
    без повторного ввода логина и пароля.

    Args:
        user_id: UUID пользователя, для которого создаётся токен.

    Returns:
        str: Закодированный JWT refresh-токен в виде строки.

    Example:
        >>> refresh = create_refresh_token(
        ...     user_id=UUID("550e8400-e29b-41d4-a716-446655440000"),
        ... )
    """
    payload = {
        "sub": str(user_id),
        "exp": _now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Декодирует и валидирует JWT-токен.

    Проверяет подпись токена, срок действия и возвращает payload.
    При невалидном или истёкшем токене выбрасывает исключение.

    Args:
        token: JWT-токен в виде строки для декодирования.

    Returns:
        dict: Словарь payload токена с ключами 'sub', 'type', 'exp'
            и опционально 'role' (для access-токенов).

    Raises:
        JWTError: Если токен невалиден, повреждён или истёк срок действия.

    Example:
        >>> payload = decode_token("eyJhbGciOiJIUzI1NiIs...")
        >>> user_id = payload["sub"]  # "550e8400-e29b-41d4-a716-446655440000"
        >>> token_type = payload["type"]  # "access" или "refresh"
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
