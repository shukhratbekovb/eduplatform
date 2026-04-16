"""LMS Notifications — list and mark-read."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import select, update

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.lms import LmsNotificationModel

router = APIRouter(prefix="/notifications/lms", tags=["LMS - Notifications"])


class NotifOut(BaseModel):
    id: UUID
    type: str
    title: str
    body: str | None
    is_read: bool
    linked_lesson_id: UUID | None
    created_at: str


@router.get("", response_model=list[NotifOut])
async def list_notifications(
    current_user: CurrentUser,
    db: DbSession,
    unread_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
) -> list[NotifOut]:
    q = select(LmsNotificationModel).where(LmsNotificationModel.user_id == current_user.id)
    if unread_only:
        q = q.where(LmsNotificationModel.is_read == False)  # noqa: E712
    q = q.order_by(LmsNotificationModel.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return [_out(r) for r in rows]


@router.post("/{notif_id}/read", response_model=NotifOut)
async def mark_read(notif_id: UUID, current_user: CurrentUser, db: DbSession) -> NotifOut:
    m = await db.get(LmsNotificationModel, notif_id)
    if m is None or m.user_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notification not found")
    m.is_read = True
    await db.commit()
    await db.refresh(m)
    return _out(m)


@router.post("/read-all")
async def mark_all_read(current_user: CurrentUser, db: DbSession) -> dict:  # type: ignore[type-arg]
    await db.execute(
        update(LmsNotificationModel)
        .where(LmsNotificationModel.user_id == current_user.id, LmsNotificationModel.is_read == False)  # noqa: E712
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read"}


def _out(m: LmsNotificationModel) -> NotifOut:
    return NotifOut(
        id=m.id, type=m.type, title=m.title, body=m.body,
        is_read=m.is_read, linked_lesson_id=m.linked_lesson_id,
        created_at=m.created_at.isoformat() if m.created_at else "",
    )
