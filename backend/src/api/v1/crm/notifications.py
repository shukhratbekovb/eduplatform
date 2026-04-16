"""CRM Notifications — list and mark-read."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import select, update

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.crm import CrmNotificationModel

router = APIRouter(prefix="/notifications/crm", tags=["CRM - Notifications"])


class CrmNotifOut(BaseModel):
    id: UUID
    type: str
    title: str
    body: str | None
    is_read: bool
    linked_task_id: UUID | None
    created_at: str


@router.get("", response_model=list[CrmNotifOut])
async def list_crm_notifications(
    current_user: CurrentUser,
    db: DbSession,
    unread_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
) -> list[CrmNotifOut]:
    q = select(CrmNotificationModel).where(CrmNotificationModel.user_id == current_user.id)
    if unread_only:
        q = q.where(CrmNotificationModel.is_read == False)  # noqa: E712
    q = q.order_by(CrmNotificationModel.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return [_out(r) for r in rows]


@router.post("/{notif_id}/read", response_model=CrmNotifOut)
async def mark_crm_read(notif_id: UUID, current_user: CurrentUser, db: DbSession) -> CrmNotifOut:
    m = await db.get(CrmNotificationModel, notif_id)
    if m is None or m.user_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notification not found")
    m.is_read = True
    await db.commit()
    await db.refresh(m)
    return _out(m)


@router.post("/read-all")
async def mark_all_crm_read(current_user: CurrentUser, db: DbSession) -> dict:  # type: ignore[type-arg]
    await db.execute(
        update(CrmNotificationModel)
        .where(CrmNotificationModel.user_id == current_user.id, CrmNotificationModel.is_read == False)  # noqa: E712
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "All CRM notifications marked as read"}


def _out(m: CrmNotificationModel) -> CrmNotifOut:
    return CrmNotifOut(
        id=m.id, type=m.type, title=m.title, body=m.body,
        is_read=m.is_read, linked_task_id=m.linked_task_id,
        created_at=m.created_at.isoformat() if m.created_at else "",
    )
