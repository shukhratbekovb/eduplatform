"""Unified notifications endpoint — merges LMS + CRM notifications for frontends."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Response, Query
from pydantic import BaseModel
from sqlalchemy import select, update

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.lms import LmsNotificationModel
from src.infrastructure.persistence.models.crm import CrmNotificationModel

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    id: UUID
    type: str
    title: str
    body: str | None
    isRead: bool
    source: str      # "lms" | "crm"
    createdAt: str


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    current_user: CurrentUser,
    db: DbSession,
    unreadOnly: bool = Query(False),
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
) -> list[NotificationOut]:
    only_unread = unreadOnly or unread_only
    result = []

    # LMS notifications
    lms_q = select(LmsNotificationModel).where(LmsNotificationModel.user_id == current_user.id)
    if only_unread:
        lms_q = lms_q.where(LmsNotificationModel.is_read == False)  # noqa: E712
    lms_rows = (await db.execute(lms_q.order_by(LmsNotificationModel.created_at.desc()))).scalars().all()
    for n in lms_rows:
        result.append(NotificationOut(
            id=n.id,
            type="notification",
            title=n.title,
            body=n.body,
            isRead=n.is_read,
            source="lms",
            createdAt=n.created_at.isoformat(),
        ))

    # CRM notifications
    crm_q = select(CrmNotificationModel).where(CrmNotificationModel.user_id == current_user.id)
    if only_unread:
        crm_q = crm_q.where(CrmNotificationModel.is_read == False)  # noqa: E712
    crm_rows = (await db.execute(crm_q.order_by(CrmNotificationModel.created_at.desc()))).scalars().all()
    for n in crm_rows:
        result.append(NotificationOut(
            id=n.id,
            type=n.type,
            title=n.title,
            body=n.body,
            isRead=n.is_read,
            source="crm",
            createdAt=n.created_at.isoformat(),
        ))

    result.sort(key=lambda n: n.createdAt, reverse=True)
    start = (page - 1) * limit
    return result[start: start + limit]


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(notification_id: UUID, current_user: CurrentUser, db: DbSession) -> NotificationOut:
    # Try LMS first
    lms = (await db.execute(
        select(LmsNotificationModel).where(
            LmsNotificationModel.id == notification_id,
            LmsNotificationModel.user_id == current_user.id,
        )
    )).scalar_one_or_none()
    if lms:
        lms.is_read = True
        await db.commit()
        await db.refresh(lms)
        return NotificationOut(id=lms.id, type="notification", title=lms.title, body=lms.body,
                               isRead=lms.is_read, source="lms", createdAt=lms.created_at.isoformat())

    crm = (await db.execute(
        select(CrmNotificationModel).where(
            CrmNotificationModel.id == notification_id,
            CrmNotificationModel.user_id == current_user.id,
        )
    )).scalar_one_or_none()
    if crm:
        crm.is_read = True
        await db.commit()
        await db.refresh(crm)
        return NotificationOut(id=crm.id, type=crm.type, title=crm.title, body=crm.body,
                               isRead=crm.is_read, source="crm", createdAt=crm.created_at.isoformat())

    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Notification not found")


@router.post("/read-all")
async def mark_all_read(current_user: CurrentUser, db: DbSession) -> Response:
    await db.execute(
        LmsNotificationModel.__table__.update()
        .where(LmsNotificationModel.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.execute(
        CrmNotificationModel.__table__.update()
        .where(CrmNotificationModel.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()
    return Response(status_code=204)
