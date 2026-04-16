"""Auth use cases: Login, Refresh, Register (director only), ChangePassword."""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID, uuid4

from src.application.interfaces.repositories import UserRepository
from src.domain.auth.entities import User, UserRole
from src.domain.auth.policies import PasswordPolicy
from src.domain.shared.value_objects import Email
from src.infrastructure.services.jwt_service import create_access_token, create_refresh_token, decode_token
from src.infrastructure.services.password_service import hash_password, verify_password


@dataclass
class TokenPair:
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginUseCase:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self, email: str, password: str) -> TokenPair:
        user = await self._users.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
        if not user.is_active:
            raise ValueError("Account is deactivated")

        return TokenPair(
            access_token=create_access_token(user.id, user.role.value),
            refresh_token=create_refresh_token(user.id),
        )


# ── Refresh ───────────────────────────────────────────────────────────────────

class RefreshTokenUseCase:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self, refresh_token: str) -> TokenPair:
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
    email: str
    password: str
    name: str
    role: str


class CreateUserUseCase:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self, inp: CreateUserInput) -> User:
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
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self, user_id: UUID, old_password: str, new_password: str) -> None:
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
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self, user_id: UUID) -> User:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise ValueError("User not found")
        return user
