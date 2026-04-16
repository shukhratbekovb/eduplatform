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
    return SqlUserRepository(db)


async def _build_student_profile(user, db: DbSession) -> StudentProfile | None:  # type: ignore[no-untyped-def]
    """Return student-shaped data if the user is a student, else None."""
    from sqlalchemy import select
    from src.infrastructure.persistence.models.lms import StudentModel, EnrollmentModel, GroupModel

    if user.role.value != "student":
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
    return UserOut(
        id=user.id,
        name=user.name,
        email=str(user.email),
        role=user.role.value,
        avatarUrl=user.avatar_url,
        isActive=user.is_active,
    )


def _user_response(user) -> UserResponse:  # type: ignore[no-untyped-def]
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
    uc = LoginUseCase(_user_repo(db))
    try:
        pair = await uc.execute(body.email, body.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

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
    """Stateless JWT logout — client must discard the token."""
    return FastAPIResponse(status_code=204)


# ── Current user ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
async def get_me(current_user: CurrentUser) -> UserOut:
    return _user_out(current_user)


@router.patch("/me", response_model=UserOut)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> UserOut:
    repo = _user_repo(db)
    if body.name is not None:
        current_user.name = body.name
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    await repo.save(current_user)
    await db.commit()
    return _user_out(current_user)


# ── Change password ───────────────────────────────────────────────────────────

@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:  # type: ignore[type-arg]
    uc = ChangePasswordUseCase(_user_repo(db))
    try:
        await uc.execute(current_user.id, body.old_password, body.new_password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    await db.commit()
    return {"message": "Password changed successfully"}


# ── Admin: user management ────────────────────────────────────────────────────

DirectorGuard = Annotated[object, Depends(require_roles("director"))]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserRequest,
    _: DirectorGuard,
    db: DbSession,
) -> UserOut:
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
    repo = _user_repo(db)
    result = await repo.list(role=role, page=page, page_size=page_size)
    return [_user_out(u) for u in result.items]
