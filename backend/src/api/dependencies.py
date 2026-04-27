"""Модуль зависимостей (dependencies) для FastAPI.

Предоставляет механизмы аутентификации и авторизации для всех
эндпоинтов платформы EduPlatform. Включает извлечение текущего
пользователя из JWT-токена, проверку ролей и платформенные
ограничения доступа.

Основные компоненты:
    - get_current_user: извлечение и валидация пользователя из Bearer-токена.
    - require_roles: фабрика зависимостей для ограничения по ролям.
    - require_platform: фабрика зависимостей для ограничения по платформам.
    - Предустановленные гварды для LMS, CRM и студенческого портала.

Пример использования:
    >>> from src.api.dependencies import CurrentUser, lms_platform_guard
    >>>
    >>> @router.get("/data")
    >>> async def get_data(user: CurrentUser):
    ...     return {"user_id": user.id}
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.domain.auth.entities import User
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from src.infrastructure.services.jwt_service import decode_token

bearer_scheme = HTTPBearer()

DbSession = Annotated[AsyncSession, Depends(get_db)]
"""Тип-аннотация для инъекции асинхронной сессии БД через FastAPI Depends."""


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: DbSession,
) -> User:
    """Извлекает и валидирует текущего пользователя из JWT Bearer-токена.

    Декодирует JWT-токен из заголовка Authorization, проверяет его тип
    (должен быть 'access'), находит пользователя в базе данных и
    проверяет, что учётная запись активна.

    Args:
        credentials: HTTP Bearer-токен, извлечённый из заголовка Authorization.
        db: Асинхронная сессия SQLAlchemy для доступа к базе данных.

    Returns:
        User: Доменная сущность текущего авторизованного пользователя.

    Raises:
        HTTPException: 401 Unauthorized — если токен невалиден, истёк,
            не является access-токеном, пользователь не найден или
            деактивирован.

    Example:
        >>> # Используется как зависимость FastAPI:
        >>> @router.get("/profile")
        >>> async def profile(user: CurrentUser):
        ...     return {"name": user.name}
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise credentials_exception

    if payload.get("type") != "access":
        raise credentials_exception

    user_id = UUID(payload["sub"])
    repo = SqlUserRepository(db)
    user = await repo.get_by_id(user_id)
    if user is None or not user.is_active:
        raise credentials_exception

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
"""Тип-аннотация для инъекции текущего авторизованного пользователя."""


def require_roles(*roles: str):
    """Создаёт FastAPI-зависимость, ограничивающую доступ по ролям пользователя.

    Фабрика зависимостей, возвращающая guard-функцию, которая проверяет,
    входит ли роль текущего пользователя в список допустимых ролей.

    Args:
        *roles: Допустимые роли (например, "director", "mup", "teacher").

    Returns:
        Callable: Асинхронная зависимость FastAPI, возвращающая User
            при успешной проверке.

    Raises:
        HTTPException: 403 Forbidden — если роль пользователя не входит
            в список допустимых.

    Example:
        >>> DirectorGuard = Annotated[object, Depends(require_roles("director"))]
        >>>
        >>> @router.post("/admin-action")
        >>> async def admin_action(_: DirectorGuard):
        ...     return {"ok": True}
    """

    async def guard(current_user: CurrentUser) -> User:
        if current_user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {list(roles)}",
            )
        return current_user

    return guard


def require_platform(*allowed_roles: str):
    """Создаёт зависимость для ограничения доступа к определённой платформе.

    Аналогична require_roles, но семантически используется для разграничения
    доступа между платформами (CRM, LMS, студенческий портал).

    Args:
        *allowed_roles: Роли, которым разрешён доступ к данной платформе.

    Returns:
        Callable: Асинхронная зависимость FastAPI, возвращающая User
            при успешной проверке.

    Raises:
        HTTPException: 403 Forbidden — если роль пользователя не соответствует
            разрешённым для данной платформы.

    Example:
        >>> lms_guard = require_platform("director", "mup", "teacher", "cashier")
    """

    async def guard(current_user: CurrentUser) -> User:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. This platform is for: {', '.join(allowed_roles)}",
            )
        return current_user

    return guard


# Platform guards
block_student_role = require_platform("director", "mup", "teacher", "cashier", "sales_manager")
"""Гвард: блокирует доступ для роли 'student' (все платформы кроме студенческой)."""

lms_platform_guard = require_platform("director", "mup", "teacher", "cashier")
"""Гвард: доступ только для пользователей LMS-платформы (журнал преподавателя)."""

crm_platform_guard = require_platform("director", "sales_manager")
"""Гвард: доступ только для пользователей CRM-платформы."""

student_platform_guard = require_platform("student")
"""Гвард: доступ только для студентов (студенческий портал)."""
