from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.interfaces.repositories import Page, UserRepository
from src.domain.auth.entities import User, UserRole
from src.domain.shared.value_objects import Email
from src.infrastructure.persistence.models.auth import UserModel


def _to_domain(m: UserModel) -> User:
    return User(
        id=m.id,
        email=Email(m.email),
        password_hash=m.password_hash,
        name=m.name,
        role=UserRole(m.role),
        avatar_url=m.avatar_url,
        is_active=m.is_active,
    )


def _to_model(u: User) -> dict:
    return {
        "id": u.id,
        "email": str(u.email),
        "password_hash": u.password_hash,
        "name": u.name,
        "role": u.role.value,
        "avatar_url": u.avatar_url,
        "is_active": u.is_active,
    }


class SqlUserRepository(UserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        result = await self._s.get(UserModel, user_id)
        return _to_domain(result) if result else None

    async def get_by_email(self, email: str) -> User | None:
        result = await self._s.execute(select(UserModel).where(UserModel.email == email))
        m = result.scalar_one_or_none()
        return _to_domain(m) if m else None

    async def save(self, user: User) -> None:
        existing = await self._s.get(UserModel, user.id)
        if existing is None:
            m = UserModel(**_to_model(user))
            self._s.add(m)
        else:
            data = _to_model(user)
            for k, v in data.items():
                setattr(existing, k, v)

    async def list(
        self,
        *,
        role: str | None = None,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[User]:
        q = select(UserModel)
        if role is not None:
            q = q.where(UserModel.role == role)
        if is_active is not None:
            q = q.where(UserModel.is_active == is_active)

        total_q = select(func.count()).select_from(q.subquery())
        total = (await self._s.execute(total_q)).scalar_one()

        q = q.offset((page - 1) * page_size).limit(page_size)
        rows = (await self._s.execute(q)).scalars().all()
        return Page(items=[_to_domain(r) for r in rows], total=total, page=page, page_size=page_size)
