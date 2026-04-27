"""Унифицированный API уведомлений — объединяет LMS и CRM уведомления.

Предоставляет единый интерфейс для получения и управления уведомлениями
из обеих подсистем (LMS и CRM). Уведомления объединяются, сортируются
по дате создания и пагинируются.

Источники уведомлений:
    - lms: уведомления из LMS (связанные с уроками, домашками и т.д.).
    - crm: уведомления из CRM (связанные с лидами, договорами и т.д.).

Роуты:
    GET /notifications — список уведомлений (с пагинацией и фильтром по непрочитанным).
    POST /notifications/{id}/read — пометить уведомление как прочитанное.
    POST /notifications/read-all — пометить все уведомления как прочитанные.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query, Response
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.crm import CrmNotificationModel
from src.infrastructure.persistence.models.lms import LmsNotificationModel

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    """Представление уведомления для фронтенда.

    Attributes:
        id: UUID уведомления.
        type: Тип уведомления (например, "lesson_reminder", "lead_assigned").
        title: Заголовок уведомления.
        body: Текст уведомления (опционально).
        isRead: Флаг прочитанности.
        source: Источник уведомления ("lms" или "crm").
        createdAt: Дата и время создания (ISO формат).
    """

    id: UUID
    type: str
    title: str
    body: str | None
    isRead: bool
    source: str  # "lms" | "crm"
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
    """Получение списка уведомлений текущего пользователя.

    Объединяет уведомления из LMS и CRM, сортирует по дате
    (сначала новые) и применяет пагинацию. Поддерживает фильтр
    по непрочитанным уведомлениям.

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.
        unreadOnly: Показывать только непрочитанные (camelCase).
        unread_only: Показывать только непрочитанные (snake_case alias).
        page: Номер страницы (>= 1).
        limit: Количество уведомлений на странице (1-100).

    Returns:
        list[NotificationOut]: Отсортированный и пагинированный список уведомлений.
    """
    only_unread = unreadOnly or unread_only
    result = []

    # LMS notifications
    lms_q = select(LmsNotificationModel).where(LmsNotificationModel.user_id == current_user.id)
    if only_unread:
        lms_q = lms_q.where(LmsNotificationModel.is_read == False)  # noqa: E712
    lms_rows = (await db.execute(lms_q.order_by(LmsNotificationModel.created_at.desc()))).scalars().all()
    for n in lms_rows:
        result.append(
            NotificationOut(
                id=n.id,
                type=n.type or "notification",
                title=n.title,
                body=n.body,
                isRead=n.is_read,
                source="lms",
                createdAt=n.created_at.isoformat(),
            )
        )

    # CRM notifications
    crm_q = select(CrmNotificationModel).where(CrmNotificationModel.user_id == current_user.id)
    if only_unread:
        crm_q = crm_q.where(CrmNotificationModel.is_read == False)  # noqa: E712
    crm_rows = (await db.execute(crm_q.order_by(CrmNotificationModel.created_at.desc()))).scalars().all()
    for n in crm_rows:
        result.append(
            NotificationOut(
                id=n.id,
                type=n.type,
                title=n.title,
                body=n.body,
                isRead=n.is_read,
                source="crm",
                createdAt=n.created_at.isoformat(),
            )
        )

    result.sort(key=lambda n: n.createdAt, reverse=True)
    start = (page - 1) * limit
    return result[start : start + limit]


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(notification_id: UUID, current_user: CurrentUser, db: DbSession) -> NotificationOut:
    """Пометить уведомление как прочитанное.

    Ищет уведомление сначала в LMS, затем в CRM. Обновляет
    флаг is_read на True.

    Args:
        notification_id: UUID уведомления для пометки.
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        NotificationOut: Обновлённое уведомление с isRead=True.

    Raises:
        HTTPException: 404 — если уведомление не найдено ни в LMS, ни в CRM.
    """
    # Try LMS first
    lms = (
        await db.execute(
            select(LmsNotificationModel).where(
                LmsNotificationModel.id == notification_id,
                LmsNotificationModel.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if lms:
        lms.is_read = True
        await db.commit()
        await db.refresh(lms)
        return NotificationOut(
            id=lms.id,
            type="notification",
            title=lms.title,
            body=lms.body,
            isRead=lms.is_read,
            source="lms",
            createdAt=lms.created_at.isoformat(),
        )

    crm = (
        await db.execute(
            select(CrmNotificationModel).where(
                CrmNotificationModel.id == notification_id,
                CrmNotificationModel.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if crm:
        crm.is_read = True
        await db.commit()
        await db.refresh(crm)
        return NotificationOut(
            id=crm.id,
            type=crm.type,
            title=crm.title,
            body=crm.body,
            isRead=crm.is_read,
            source="crm",
            createdAt=crm.created_at.isoformat(),
        )

    from fastapi import HTTPException

    raise HTTPException(status_code=404, detail="Notification not found")


@router.post("/read-all")
async def mark_all_read(current_user: CurrentUser, db: DbSession) -> Response:
    """Пометить все уведомления текущего пользователя как прочитанные.

    Массово обновляет is_read=True для всех уведомлений пользователя
    в обеих таблицах (LMS и CRM).

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        Response: Пустой ответ с кодом 204 No Content.
    """
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
