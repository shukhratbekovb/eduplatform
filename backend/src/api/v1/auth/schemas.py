from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Camel-case response shapes expected by all frontends ──────────────────────

class UserOut(BaseModel):
    """User representation returned to all frontends (camelCase)."""
    id: UUID
    name: str
    email: str
    role: str
    avatarUrl: str | None = None
    isActive: bool = True


class StudentProfile(BaseModel):
    """Student-specific fields returned to the Student Portal on login."""
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
    """Login / refresh response — consumed by CRM, Logbook, and Student frontends."""
    user: UserOut
    # student is populated only when role == 'student'; the Student Portal reads this field
    student: StudentProfile | None = None
    accessToken: str
    refreshToken: str
    tokenType: str = "bearer"


# ── Legacy snake_case aliases (for any internal callers) ─────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    role: str
    avatar_url: str | None
    is_active: bool


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    avatar_url: str | None = None
