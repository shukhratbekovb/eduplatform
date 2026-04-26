"""Маршруты аутентификации и управления пользователями.

Предоставляет REST API эндпоинты для:
    - Входа в систему (логин) с выдачей JWT-токенов.
    - Обновления токенов (refresh).
    - Выхода из системы (stateless logout).
    - Получения и обновления профиля текущего пользователя.
    - Смены пароля.
    - Управления пользователями (создание, список — только для директора).

Все ответы в camelCase для совместимости с фронтенд-приложениями
(CRM, Logbook, Student Portal).

Роуты:
    POST /auth/login — вход с email/password, возврат токенов и профиля.
    POST /auth/refresh — обновление пары токенов по refresh_token.
    POST /auth/logout — stateless выход (клиент удаляет токен).
    GET /auth/me — получение данных текущего пользователя.
    PATCH /auth/me — обновление профиля текущего пользователя.
    POST /auth/change-password — смена пароля.
    POST /auth/users — создание пользователя (директор).
    GET /auth/users — список пользователей (директор).
"""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.api.v1.auth.schemas import (
    ChangePasswordRequest,
    CreateUserRequest,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    StudentProfile,
    UpdateProfileRequest,
    UserOut,
    UserResponse,
)
from src.application.auth.use_cases import (
    ChangePasswordUseCase,
    CreateUserUseCase,
    CreateUserInput,
    GetMeUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
)
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository

router = APIRouter(prefix="/auth", tags=["Auth"])


def _user_repo(db: DbSession) -> SqlUserRepository:
    """Создаёт экземпляр репозитория пользователей.

    Args:
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        SqlUserRepository: Репозиторий для работы с пользователями в БД.
    """
    return SqlUserRepository(db)


async def _build_student_profile(user, db: DbSession) -> StudentProfile | None:  # type: ignore[no-untyped-def]
    """Формирует профиль студента, если пользователь имеет роль 'student'.

    Загружает данные студента из таблицы students, находит активную
    запись зачисления (enrollment) для определения текущей группы.

    Args:
        user: Объект пользователя (доменная сущность или ORM-модель).
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        StudentProfile | None: Профиль студента с данными о группе,
            звёздах и кристаллах; None, если пользователь не студент
            или запись студента не найдена.
    """
    from sqlalchemy import select
    from src.infrastructure.persistence.models.lms import StudentModel, EnrollmentModel, GroupModel

    role = user.role.value if hasattr(user.role, 'value') else user.role
    if role != "student":
        return None
    from sqlalchemy.ext.asyncio import AsyncSession
    student = (await db.execute(
        select(StudentModel).where(StudentModel.user_id == user.id)
    )).scalar_one_or_none()
    if student is None:
        return None
    # Find first active enrollment to get group info
    enrollment = (await db.execute(
        select(EnrollmentModel).where(
            EnrollmentModel.student_id == student.id,
            EnrollmentModel.is_active == True,  # noqa: E712
        ).limit(1)
    )).scalar_one_or_none()
    group_id = None
    group_name = None
    if enrollment:
        group = (await db.execute(
            select(GroupModel).where(GroupModel.id == enrollment.group_id)
        )).scalar_one_or_none()
        if group:
            group_id = str(group.id)
            group_name = group.name
    return StudentProfile(
        id=student.id,
        fullName=student.full_name,
        photo=student.photo_url,
        studentCode=student.student_code,
        groupId=group_id,
        groupName=group_name,
        stars=student.stars,
        crystals=student.crystals,
        email=student.email or str(user.email),
        phone=student.phone,
        dateOfBirth=student.date_of_birth.isoformat() if student.date_of_birth else None,
    )


def _user_out(user) -> UserOut:  # type: ignore[no-untyped-def]
    """Преобразует объект пользователя в camelCase-ответ UserOut.

    Args:
        user: Объект пользователя (доменная сущность или ORM-модель).

    Returns:
        UserOut: Сериализованное представление пользователя для фронтенда.
    """
    return UserOut(
        id=user.id,
        name=user.name,
        email=str(user.email),
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        avatarUrl=getattr(user, 'avatar_url', None),
        phone=getattr(user, 'phone', None),
        dateOfBirth=user.date_of_birth.isoformat() if getattr(user, 'date_of_birth', None) else None,
        isActive=user.is_active,
    )


def _user_response(user) -> UserResponse:  # type: ignore[no-untyped-def]
    """Преобразует объект пользователя в snake_case-ответ UserResponse.

    Используется для внутренних вызовов.

    Args:
        user: Объект пользователя (доменная сущность или ORM-модель).

    Returns:
        UserResponse: Сериализованное представление пользователя (snake_case).
    """
    return UserResponse(
        id=user.id,
        email=str(user.email),
        name=user.name,
        role=user.role.value,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
    )


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: DbSession) -> LoginResponse:
    """Аутентификация пользователя по email и паролю.

    Выполняет проверку учётных данных, генерирует пару JWT-токенов
    (access + refresh) и возвращает информацию о пользователе.
    Для студентов дополнительно загружается профиль с данными
    о группе и геймификации.

    Args:
        body: Данные для входа (email, password).
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        LoginResponse: Объект с пользователем, токенами и профилем студента.

    Raises:
        HTTPException: 401 Unauthorized — если email или пароль неверны,
            или учётная запись деактивирована.
    """
    uc = LoginUseCase(_user_repo(db))
    try:
        pair = await uc.execute(body.email, body.password)
    except ValueError as e:
        error_code = str(e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_code,
        )

    # Fetch user to include in response
    from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
    user = await SqlUserRepository(db).get_by_email(body.email)
    student_profile = await _build_student_profile(user, db)
    return LoginResponse(
        user=_user_out(user),
        student=student_profile,
        accessToken=pair.access_token,
        refreshToken=pair.refresh_token,
    )


# ── Refresh ───────────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=LoginResponse)
async def refresh(body: RefreshRequest, db: DbSession) -> LoginResponse:
    """Обновление пары JWT-токенов по refresh-токену.

    Декодирует refresh-токен, находит пользователя и генерирует
    новую пару access + refresh токенов.

    Args:
        body: Объект с refresh_token.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        LoginResponse: Объект с обновлёнными токенами и данными пользователя.

    Raises:
        HTTPException: 401 Unauthorized — если refresh-токен невалиден,
            истёк или пользователь не найден.
    """
    repo = _user_repo(db)
    uc = RefreshTokenUseCase(repo)
    try:
        pair = await uc.execute(body.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    from jose import JWTError
    from src.infrastructure.services.jwt_service import decode_token
    from uuid import UUID as _UUID
    try:
        payload = decode_token(body.refresh_token)
        user = await repo.get_by_id(_UUID(payload["sub"]))
    except Exception:
        user = None

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return LoginResponse(
        user=_user_out(user),
        accessToken=pair.access_token,
        refreshToken=pair.refresh_token,
    )


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout() -> FastAPIResponse:
    """Выход из системы (stateless).

    JWT-архитектура не требует серверной инвалидации токена.
    Клиент должен самостоятельно удалить сохранённые токены.

    Returns:
        Response: Пустой ответ с кодом 204 No Content.
    """
    return FastAPIResponse(status_code=204)


# ── Current user ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
async def get_me(current_user: CurrentUser, db: DbSession) -> UserOut:
    """Получение данных текущего авторизованного пользователя.

    Загружает актуальные данные из БД (включая phone, date_of_birth),
    которые могут отсутствовать в JWT-токене.

    Args:
        current_user: Текущий авторизованный пользователь (из JWT).
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        UserOut: Полные данные пользователя в camelCase.
    """
    from sqlalchemy import select
    from src.infrastructure.persistence.models.auth import UserModel
    m = (await db.execute(select(UserModel).where(UserModel.id == current_user.id))).scalar_one()
    return _user_out(m)


@router.patch("/me", response_model=UserOut)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> UserOut:
    """Обновление профиля текущего пользователя.

    Позволяет изменить имя, аватар, телефон и дату рождения.
    Обновляются только переданные (не None) поля.

    Args:
        body: Данные для обновления (опциональные поля).
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        UserOut: Обновлённые данные пользователя.
    """
    from sqlalchemy import select
    from src.infrastructure.persistence.models.auth import UserModel

    # Update via ORM model (domain entity doesn't have phone/dob)
    m = (await db.execute(select(UserModel).where(UserModel.id == current_user.id))).scalar_one()
    if body.name is not None:
        m.name = body.name
    if body.avatar_url is not None:
        m.avatar_url = body.avatar_url
    if body.phone is not None:
        m.phone = body.phone
    if body.date_of_birth is not None:
        from datetime import date as date_type
        try:
            m.date_of_birth = date_type.fromisoformat(body.date_of_birth)
        except ValueError:
            pass
    await db.commit()
    await db.refresh(m)
    return _user_out(m)


# ── Change password ───────────────────────────────────────────────────────────

@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:  # type: ignore[type-arg]
    """Смена пароля текущим пользователем.

    Проверяет старый пароль, затем устанавливает новый.
    Новый пароль должен быть не менее 8 символов.

    Args:
        body: Старый и новый пароли.
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        dict: Сообщение об успехе {"message": "Password changed successfully"}.

    Raises:
        HTTPException: 400 Bad Request — если старый пароль неверен.
    """
    uc = ChangePasswordUseCase(_user_repo(db))
    try:
        await uc.execute(current_user.id, body.old_password, body.new_password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    await db.commit()
    return {"message": "Password changed successfully"}


# ── Admin: user management ────────────────────────────────────────────────────

DirectorGuard = Annotated[object, Depends(require_roles("director"))]
"""Гвард: доступ только для пользователей с ролью 'director'."""


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserRequest,
    _: DirectorGuard,
    db: DbSession,
) -> UserOut:
    """Создание нового пользователя (доступно только директору).

    Регистрирует нового пользователя в системе с указанной ролью.
    Пароль хешируется перед сохранением.

    Args:
        body: Данные нового пользователя (email, password, name, role).
        _: Гвард доступа — проверка роли директора.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        UserOut: Данные созданного пользователя.

    Raises:
        HTTPException: 400 Bad Request — если email уже занят или
            данные некорректны.
    """
    uc = CreateUserUseCase(_user_repo(db))
    try:
        user = await uc.execute(CreateUserInput(
            email=body.email,
            password=body.password,
            name=body.name,
            role=body.role,
        ))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    await db.commit()
    return _user_out(user)


@router.get("/users", response_model=list[UserOut])
async def list_users(
    _: DirectorGuard,
    db: DbSession,
    role: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> list[UserOut]:
    """Получение списка пользователей (доступно только директору).

    Поддерживает фильтрацию по роли и пагинацию.

    Args:
        _: Гвард доступа — проверка роли директора.
        db: Асинхронная сессия SQLAlchemy.
        role: Фильтр по роли (опционально).
        page: Номер страницы (по умолчанию 1).
        page_size: Размер страницы (по умолчанию 20).

    Returns:
        list[UserOut]: Список пользователей с пагинацией.
    """
    repo = _user_repo(db)
    result = await repo.list(role=role, page=page, page_size=page_size)
    return [_user_out(u) for u in result.items]
