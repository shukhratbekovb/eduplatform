"""Public endpoints — no auth required.

Used by:
- API-type lead sources: external systems push leads via api_key
- Landing-type lead sources: public form page fetches fields and submits leads
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import DbSession
from src.infrastructure.persistence.models.crm import (
    CrmContactModel, CustomFieldModel, FunnelModel, LeadModel, LeadSourceModel, StageModel,
)

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
