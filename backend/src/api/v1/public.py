"""Public endpoints — no auth required.

Used by:
- API-type lead sources: external systems push leads via api_key
- Landing-type lead sources: public form page fetches fields and submits leads
- Website form: auto-provisioned landing source for the website
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import DbSession
from src.infrastructure.persistence.models.crm import (
    CrmContactModel, CustomFieldModel, FunnelModel, LeadModel, LeadSourceModel, StageModel,
)

# Направления обучения — варианты для select-поля
_DIRECTION_CHOICES = [
    "Python", "JavaScript / Frontend", "Java", "Mobile", "DevOps",
    "Data Science", "Кибербезопасность", "UI/UX Дизайн", "English for IT", "Робототехника",
]

router = APIRouter(prefix="/public", tags=["Public"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class PublicFieldOut(BaseModel):
    name: str
    label: str
    type: str          # text, number, date, select, etc.
    required: bool
    options: dict | None = None  # type: ignore[type-arg]


class FormConfigOut(BaseModel):
    sourceName: str
    funnelName: str
    fields: list[PublicFieldOut]


class PublicLeadSubmit(BaseModel):
    fullName: str
    phone: str
    email: str | None = None
    customFields: dict | None = None  # type: ignore[type-arg]


class PublicLeadResult(BaseModel):
    success: bool
    leadId: str
    message: str


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_source(api_key: str, db) -> LeadSourceModel:  # type: ignore[no-untyped-def]
    result = await db.execute(
        select(LeadSourceModel).where(
            LeadSourceModel.api_key == api_key,
            LeadSourceModel.is_active == True,  # noqa: E712
        )
    )
    source = result.scalar_one_or_none()
    if source is None:
        raise HTTPException(status_code=404, detail="Invalid or inactive API key")
    return source


async def _get_first_stage(funnel_id, db) -> StageModel | None:  # type: ignore[no-untyped-def]
    result = await db.execute(
        select(StageModel)
        .where(StageModel.funnel_id == funnel_id)
        .order_by(StageModel.order)
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _find_or_create_contact(
    full_name: str, phone: str, email: str | None, db,  # type: ignore[no-untyped-def]
) -> CrmContactModel:
    existing = (await db.execute(
        select(CrmContactModel).where(CrmContactModel.phone == phone)
    )).scalar_one_or_none()
    if existing:
        if full_name:
            existing.full_name = full_name
        if email:
            existing.email = email
        return existing
    contact = CrmContactModel(id=uuid4(), full_name=full_name or "Unknown", phone=phone, email=email)
    db.add(contact)
    await db.flush()
    return contact


async def _auto_assign_manager(db) -> uuid4 | None:  # type: ignore[no-untyped-def]
    """Pick the active sales_manager/director with fewest active leads."""
    from sqlalchemy import func as fn, or_
    from src.infrastructure.persistence.models.auth import UserModel

    managers = (await db.execute(
        select(UserModel)
        .where(or_(UserModel.role == "sales_manager", UserModel.role == "director"))
        .where(UserModel.is_active == True)  # noqa: E712
    )).scalars().all()
    if not managers:
        return None
    best, best_count = None, float("inf")
    for m in managers:
        cnt = (await db.execute(
            select(fn.count()).select_from(LeadModel)
            .where(LeadModel.assigned_to == m.id, LeadModel.status == "active")
        )).scalar() or 0
        if cnt < best_count:
            best, best_count = m.id, cnt
    return best


async def _create_lead_from_public(
    source: LeadSourceModel,
    body: PublicLeadSubmit,
    db,  # type: ignore[no-untyped-def]
) -> LeadModel:
    first_stage = await _get_first_stage(source.funnel_id, db)
    if first_stage is None:
        raise HTTPException(status_code=422, detail="Funnel has no stages configured")

    contact = await _find_or_create_contact(body.fullName, body.phone, body.email, db)
    assigned_to = await _auto_assign_manager(db)

    lead = LeadModel(
        id=uuid4(),
        full_name=body.fullName,
        phone=body.phone,
        email=body.email,
        source_id=source.id,
        funnel_id=source.funnel_id,
        stage_id=first_stage.id,
        contact_id=contact.id,
        assigned_to=assigned_to,
        status="active",
        custom_fields=body.customFields or {},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead


# ── GET /public/forms/{api_key} — landing form configuration ────────────────

@router.get("/forms/{api_key}", response_model=FormConfigOut)
async def get_form_config(api_key: str, db: DbSession) -> FormConfigOut:
    """Returns form fields for a landing-type source.
    Used by the public form page to render the form dynamically.
    """
    source = await _get_source(api_key, db)

    # Get funnel name
    funnel = (await db.execute(
        select(FunnelModel).where(FunnelModel.id == source.funnel_id)
    )).scalar_one_or_none()
    funnel_name = funnel.name if funnel else "Unknown"

    # Base fields (always present)
    fields: list[PublicFieldOut] = [
        PublicFieldOut(name="fullName", label="Полное имя", type="text", required=True),
        PublicFieldOut(name="phone", label="Телефон", type="text", required=True),
        PublicFieldOut(name="email", label="Email", type="text", required=False),
    ]

    # Custom fields from the linked funnel
    if source.funnel_id:
        cf_rows = (await db.execute(
            select(CustomFieldModel)
            .where(
                CustomFieldModel.funnel_id == source.funnel_id,
                CustomFieldModel.is_active == True,  # noqa: E712
            )
            .order_by(CustomFieldModel.order)
        )).scalars().all()
        for cf in cf_rows:
            fields.append(PublicFieldOut(
                name=f"cf_{cf.id}",
                label=cf.label,
                type=cf.type,
                required=False,
                options=cf.options,
            ))

    return FormConfigOut(sourceName=source.name, funnelName=funnel_name, fields=fields)


# ── POST /public/forms/{api_key}/submit — landing form submission ───────────

@router.post("/forms/{api_key}/submit", response_model=PublicLeadResult)
async def submit_landing_form(api_key: str, body: PublicLeadSubmit, db: DbSession) -> PublicLeadResult:
    """Accepts a lead from a public landing page form."""
    source = await _get_source(api_key, db)
    if source.type != "landing":
        raise HTTPException(status_code=400, detail="This source is not a landing form")

    lead = await _create_lead_from_public(source, body, db)
    return PublicLeadResult(
        success=True,
        leadId=str(lead.id),
        message="Заявка успешно отправлена",
    )


# ── POST /public/api/{api_key}/leads — external API lead submission ─────────

@router.post("/api/{api_key}/leads", response_model=PublicLeadResult)
async def submit_api_lead(api_key: str, body: PublicLeadSubmit, db: DbSession) -> PublicLeadResult:
    """Accepts a lead from an external system via API key."""
    source = await _get_source(api_key, db)
    if source.type != "api":
        raise HTTPException(status_code=400, detail="This source is not an API source")

    lead = await _create_lead_from_public(source, body, db)
    return PublicLeadResult(
        success=True,
        leadId=str(lead.id),
        message="Lead created successfully",
    )


# ── POST /public/website-lead — website form (auto-provisioned) ──────────

_WEBSITE_SOURCE_NAME = "Веб-сайт (лендинг)"
_DEFAULT_FUNNEL_NAME = "Заявки с сайта"

_DEFAULT_STAGES = [
    {"name": "Новый",            "color": "#6366F1", "order": 0, "win_probability": 10},
    {"name": "Связались",        "color": "#3B82F6", "order": 1, "win_probability": 25},
    {"name": "Консультация",     "color": "#F59E0B", "order": 2, "win_probability": 50},
    {"name": "Пробный урок",     "color": "#10B981", "order": 3, "win_probability": 75},
    {"name": "Договор",          "color": "#22C55E", "order": 4, "win_probability": 90},
]


class WebsiteLeadSubmit(BaseModel):
    fullName: str
    phone: str
    email: str | None = None
    direction: str | None = None
    comment: str | None = None


class _WebsiteInfra:
    """Кэш ID кастомных полей, чтобы не делать лишние запросы после первого вызова."""
    direction_field_id: str | None = None
    comment_field_id: str | None = None

_cache = _WebsiteInfra()


async def _get_or_create_website_source(db) -> LeadSourceModel:  # type: ignore[no-untyped-def]
    """Возвращает источник для лендинга, создавая воронку + этапы + кастомные поля + источник при первом вызове."""
    result = await db.execute(
        select(LeadSourceModel).where(
            LeadSourceModel.name == _WEBSITE_SOURCE_NAME,
            LeadSourceModel.type == "landing",
            LeadSourceModel.is_active == True,  # noqa: E712
        )
    )
    source = result.scalar_one_or_none()
    if source is not None:
        return source

    now = datetime.now(timezone.utc)

    # Создаём дефолтную воронку
    funnel = FunnelModel(
        id=uuid4(),
        name=_DEFAULT_FUNNEL_NAME,
        is_archived=False,
        created_at=now,
        updated_at=now,
    )
    db.add(funnel)
    await db.flush()

    # Создаём этапы
    for stage_cfg in _DEFAULT_STAGES:
        stage = StageModel(
            id=uuid4(),
            funnel_id=funnel.id,
            name=stage_cfg["name"],
            color=stage_cfg["color"],
            order=stage_cfg["order"],
            win_probability=stage_cfg["win_probability"],
        )
        db.add(stage)

    # Создаём кастомные поля для воронки
    direction_field = CustomFieldModel(
        id=uuid4(),
        funnel_id=funnel.id,
        label="Направление",
        type="select",
        options={"choices": _DIRECTION_CHOICES},
        order=0,
        is_active=True,
        created_at=now,
    )
    db.add(direction_field)

    comment_field = CustomFieldModel(
        id=uuid4(),
        funnel_id=funnel.id,
        label="Комментарий",
        type="text",
        options=None,
        order=1,
        is_active=True,
        created_at=now,
    )
    db.add(comment_field)

    await db.flush()

    # Кэшируем ID полей
    _cache.direction_field_id = str(direction_field.id)
    _cache.comment_field_id = str(comment_field.id)

    # Создаём источник
    source = LeadSourceModel(
        id=uuid4(),
        name=_WEBSITE_SOURCE_NAME,
        type="landing",
        is_active=True,
        funnel_id=funnel.id,
        api_key=secrets.token_urlsafe(32),
        created_at=now,
    )
    db.add(source)
    await db.flush()

    return source


async def _get_custom_field_ids(funnel_id, db) -> tuple[str | None, str | None]:  # type: ignore[no-untyped-def]
    """Возвращает (direction_field_id, comment_field_id) для воронки."""
    if _cache.direction_field_id and _cache.comment_field_id:
        return _cache.direction_field_id, _cache.comment_field_id

    rows = (await db.execute(
        select(CustomFieldModel).where(
            CustomFieldModel.funnel_id == funnel_id,
            CustomFieldModel.is_active == True,  # noqa: E712
        ).order_by(CustomFieldModel.order)
    )).scalars().all()

    direction_id = None
    comment_id = None
    for row in rows:
        if row.label == "Направление":
            direction_id = str(row.id)
        elif row.label == "Комментарий":
            comment_id = str(row.id)

    _cache.direction_field_id = direction_id
    _cache.comment_field_id = comment_id
    return direction_id, comment_id


@router.post("/website-lead", response_model=PublicLeadResult)
async def submit_website_lead(body: WebsiteLeadSubmit, db: DbSession) -> PublicLeadResult:
    """Принимает заявку с лендинга. Автоматически создаёт воронку и источник при первом вызове."""
    source = await _get_or_create_website_source(db)

    direction_fid, comment_fid = await _get_custom_field_ids(source.funnel_id, db)

    custom_fields: dict = {}
    if body.direction and direction_fid:
        custom_fields[direction_fid] = body.direction
    if body.comment and comment_fid:
        custom_fields[comment_fid] = body.comment

    public_body = PublicLeadSubmit(
        fullName=body.fullName,
        phone=body.phone,
        email=body.email,
        customFields=custom_fields,
    )

    lead = await _create_lead_from_public(source, public_body, db)
    return PublicLeadResult(
        success=True,
        leadId=str(lead.id),
        message="Заявка успешно отправлена",
    )
