"""LMS Users — list teachers and other LMS staff."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.auth import UserModel

router = APIRouter(prefix="/lms", tags=["LMS - Users"])


class LmsUserOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    avatarUrl: str | None = None
    isActive: bool = True


@router.get("/users", response_model=list[LmsUserOut])
async def list_lms_users(
    current_user: CurrentUser,
    db: DbSession,
    role: str | None = None,
) -> list[LmsUserOut]:
    q = select(UserModel).where(UserModel.is_active == True)  # noqa: E712
    if role:
        q = q.where(UserModel.role == role)
    else:
        # Return all non-student users for LMS
        from sqlalchemy import not_
        q = q.where(UserModel.role != "student")
    rows = (await db.execute(q.order_by(UserModel.name))).scalars().all()
    return [
        LmsUserOut(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            avatarUrl=u.avatar_url,
            isActive=u.is_active,
        )
        for u in rows
    ]


@router.get("/teachers", response_model=list[LmsUserOut])
async def list_teachers(current_user: CurrentUser, db: DbSession) -> list[LmsUserOut]:
    rows = (await db.execute(
        select(UserModel)
        .where(UserModel.role == "teacher", UserModel.is_active == True)  # noqa: E712
        .order_by(UserModel.name)
    )).scalars().all()
    return [
        LmsUserOut(id=u.id, name=u.name, email=u.email, role=u.role, avatarUrl=u.avatar_url)
        for u in rows
    ]
