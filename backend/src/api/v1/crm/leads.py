"""CRM Leads router — full CRUD + workflow actions."""
from __future__ import annotations

import secrets
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Response, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, update, delete

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.application.crm.leads.use_cases import (
    AssignLeadUseCase,
    CreateLeadInput,
    CreateLeadUseCase,
    GetLeadUseCase,
    ListLeadsUseCase,
    LoseLeadUseCase,
    MoveLeadStageUseCase,
    WinLeadUseCase,
)
from src.domain.crm.entities import Lead
from src.infrastructure.persistence.models.crm import (
    LeadModel,
    LeadActivityModel,
    LeadCommentModel,
    LeadSourceModel,
)
from src.infrastructure.persistence.models.auth import UserModel
from src.infrastructure.persistence.repositories.crm.lead_repository import SqlLeadRepository
from src.infrastructure.persistence.repositories.crm.funnel_repository import SqlStageRepository

router = APIRouter(prefix="/crm", tags=["CRM - Leads"])

CrmGuard = Annotated[object, Depends(require_roles("director", "sales_manager"))]


# ── Schemas ───────────────────────────────────────────────────────────────────

class LeadOut(BaseModel):
    id: UUID
    fullName: str
    phone: str
    email: str | None
    sourceId: UUID | None
    funnelId: UUID | None
    stageId: UUID | None
    assignedTo: UUID | None
    contactId: UUID | None = None
    status: str
    lostReason: str | None
    customFields: dict  # type: ignore[type-arg]
    createdAt: str | None = None
    updatedAt: str | None = None
    lastActivityAt: str | None = None

    @classmethod
    def from_model(cls, m: LeadModel) -> "LeadOut":
        return cls(
            id=m.id,
            fullName=m.full_name,
            phone=m.phone,
            email=m.email,
            sourceId=m.source_id,
            funnelId=m.funnel_id,
            stageId=m.stage_id,
            assignedTo=m.assigned_to,
            contactId=m.contact_id,
            status=m.status,
            lostReason=m.lost_reason,
            customFields=m.custom_fields or {},
            createdAt=m.created_at.isoformat() if hasattr(m, "created_at") and m.created_at else None,
            updatedAt=m.updated_at.isoformat() if hasattr(m, "updated_at") and m.updated_at else None,
            lastActivityAt=m.last_activity_at.isoformat() if m.last_activity_at else None,
        )

    @classmethod
    def from_domain(cls, l: Lead) -> "LeadOut":
        return cls(
            id=l.id,
            fullName=l.full_name,
            phone=l.phone,
            email=l.email,
            sourceId=l.source_id,
            funnelId=l.funnel_id,
            stageId=l.stage_id,
            assignedTo=l.assigned_to,
            status=l.status.value,
            lostReason=l.lost_reason,
            customFields=l.custom_fields,
        )


class PagedLeads(BaseModel):
    data: list[LeadOut]
    total: int
    page: int
    limit: int
    totalPages: int


class CreateLeadRequest(BaseModel):
    fullName: str | None = None
    full_name: str | None = None  # support both
    phone: str
    funnelId: UUID | None = None
    funnel_id: UUID | None = None
    stageId: UUID | None = None
    stage_id: UUID | None = None
    assignedTo: UUID | None = None
    assigned_to: UUID | None = None
    sourceId: UUID | None = None
    source_id: UUID | None = None
    email: str | None = None
    customFields: dict | None = None  # type: ignore[type-arg]

    def resolved_full_name(self) -> str:
        return self.fullName or self.full_name or ""

    def resolved_funnel_id(self) -> UUID:
        v = self.funnelId or self.funnel_id
        if v is None:
            raise ValueError("funnelId is required")
        return v

    def resolved_stage_id(self) -> UUID:
        v = self.stageId or self.stage_id
        if v is None:
            raise ValueError("stageId is required")
        return v

    def resolved_assigned_to(self) -> UUID | None:
        return self.assignedTo or self.assigned_to


class UpdateLeadRequest(BaseModel):
    fullName: str | None = None
    phone: str | None = None
    email: str | None = None
    stageId: UUID | None = None
    assignedTo: UUID | None = None
    customFields: dict | None = None  # type: ignore[type-arg]


class MoveStageRequest(BaseModel):
    stageId: UUID | None = None
    stage_id: UUID | None = None

    def resolved(self) -> UUID:
        v = self.stageId or self.stage_id
        if v is None:
            raise ValueError("stageId is required")
        return v


class LostReasonRequest(BaseModel):
    reason: str


class AssignRequest(BaseModel):
    userId: UUID | None = None
    user_id: UUID | None = None

    def resolved(self) -> UUID:
        v = self.userId or self.user_id
        if v is None:
            raise ValueError("userId is required")
        return v


# ── Lead CRUD ─────────────────────────────────────────────────────────────────

@router.post("/leads", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(body: CreateLeadRequest, current_user: CurrentUser, db: DbSession) -> LeadOut:
    from uuid import uuid4 as _uid
    from sqlalchemy import func as fn, or_
    from src.infrastructure.persistence.models.crm import CrmContactModel

    # ── Auto-assign manager if not provided (round-robin by least active leads) ──
    assigned_to = body.resolved_assigned_to()
    if not assigned_to:
        managers = (await db.execute(
            select(UserModel)
            .where(or_(UserModel.role == "sales_manager", UserModel.role == "director"))
            .where(UserModel.is_active == True)  # noqa: E712
        )).scalars().all()
        if managers:
            # Pick manager with fewest active leads
            best, best_count = None, float("inf")
            for m in managers:
                cnt = (await db.execute(
                    select(fn.count()).where(LeadModel.assigned_to == m.id, LeadModel.status == "active")
                )).scalar() or 0
                if cnt < best_count:
                    best, best_count = m.id, cnt
            assigned_to = best

    # ── Find or create contact by phone ──────────────────────────────────────
    existing_contact = (await db.execute(
        select(CrmContactModel).where(CrmContactModel.phone == body.phone)
    )).scalar_one_or_none()

    if existing_contact:
        contact = existing_contact
        if body.resolved_full_name():
            contact.full_name = body.resolved_full_name()
        if body.email:
            contact.email = body.email
    else:
        contact = CrmContactModel(
            id=_uid(), full_name=body.resolved_full_name() or "Unknown",
            phone=body.phone, email=body.email,
        )
        db.add(contact)
        await db.flush()

    # ── Create lead ──────────────────────────────────────────────────────────
    uc = CreateLeadUseCase(SqlLeadRepository(db), SqlStageRepository(db))
    try:
        lead = await uc.execute(CreateLeadInput(
            full_name=body.resolved_full_name(),
            phone=body.phone,
            funnel_id=body.resolved_funnel_id(),
            stage_id=body.resolved_stage_id(),
            assigned_to=assigned_to,
            source_id=body.sourceId or body.source_id,
            email=body.email,
        ))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Link lead to contact + save customFields
    lead_model = (await db.execute(select(LeadModel).where(LeadModel.id == lead.id))).scalar_one_or_none()
    if lead_model:
        lead_model.contact_id = contact.id
        if body.customFields:
            lead_model.custom_fields = body.customFields

    await db.commit()
    await db.refresh(lead_model)
    return LeadOut.from_model(lead_model)


@router.get("/leads", response_model=PagedLeads)
async def list_leads(
    current_user: CurrentUser,
    db: DbSession,
    funnelId: UUID | None = None,
    stageIds: list[UUID] | None = Query(None),
    sourceIds: list[UUID] | None = Query(None),
    assignedTo: list[UUID] | None = Query(None),
    status: list[str] | None = Query(None),
    search: str | None = None,
    createdFrom: str | None = None,
    createdTo: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
) -> PagedLeads:
    from sqlalchemy import func as fn
    from datetime import datetime as dt, timezone

    page_size = limit
    q = select(LeadModel)

    if funnelId:
        q = q.where(LeadModel.funnel_id == funnelId)
    if stageIds:
        q = q.where(LeadModel.stage_id.in_(stageIds))
    if sourceIds:
        q = q.where(LeadModel.source_id.in_(sourceIds))
    if assignedTo:
        q = q.where(LeadModel.assigned_to.in_(assignedTo))
    if status:
        q = q.where(LeadModel.status.in_(status))

    # Text search
    if search:
        q = q.where(
            LeadModel.full_name.ilike(f"%{search}%")
            | LeadModel.phone.ilike(f"%{search}%")
            | LeadModel.email.ilike(f"%{search}%")
        )

    # Date range
    if createdFrom:
        q = q.where(LeadModel.created_at >= dt.fromisoformat(createdFrom).replace(tzinfo=timezone.utc))
    if createdTo:
        q = q.where(LeadModel.created_at <= dt.fromisoformat(createdTo).replace(tzinfo=timezone.utc))

    total = (await db.execute(select(fn.count()).select_from(q.subquery()))).scalar() or 0
    rows = (await db.execute(
        q.order_by(LeadModel.created_at.desc().nullslast())
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    return PagedLeads(
        data=[LeadOut.from_model(m) for m in rows],
        total=total,
        page=page,
        limit=page_size,
        totalPages=max(1, -(-total // page_size)),
    )


@router.get("/leads/{lead_id}", response_model=LeadOut)
async def get_lead(lead_id: UUID, current_user: CurrentUser, db: DbSession) -> LeadOut:
    uc = GetLeadUseCase(SqlLeadRepository(db))
    try:
        lead = await uc.execute(lead_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return LeadOut.from_domain(lead)


@router.patch("/leads/{lead_id}", response_model=LeadOut)
async def update_lead(lead_id: UUID, body: UpdateLeadRequest, current_user: CurrentUser, db: DbSession) -> LeadOut:
    result = await db.execute(select(LeadModel).where(LeadModel.id == lead_id))
    lead = result.scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")

    if body.fullName is not None:
        lead.full_name = body.fullName
    if body.phone is not None:
        lead.phone = body.phone
    if body.email is not None:
        lead.email = body.email
    if body.stageId is not None:
        lead.stage_id = body.stageId
    if body.assignedTo is not None:
        lead.assigned_to = body.assignedTo
    if body.customFields is not None:
        lead.custom_fields = body.customFields

    await db.commit()
    await db.refresh(lead)
    return LeadOut.from_model(lead)


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: UUID, _: CrmGuard, db: DbSession) -> Response:
    result = await db.execute(select(LeadModel).where(LeadModel.id == lead_id))
    lead = result.scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)
    await db.commit()
    return Response(status_code=204)


# ── Lead workflow ─────────────────────────────────────────────────────────────

@router.post("/leads/{lead_id}/move-stage", response_model=LeadOut)
async def move_stage(lead_id: UUID, body: MoveStageRequest, current_user: CurrentUser, db: DbSession) -> LeadOut:
    try:
        stage_id = body.resolved()
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    uc = MoveLeadStageUseCase(SqlLeadRepository(db), SqlStageRepository(db))
    try:
        lead = await uc.execute(lead_id, stage_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return LeadOut.from_domain(lead)


@router.post("/leads/{lead_id}/mark-won", response_model=LeadOut)
async def mark_won(lead_id: UUID, current_user: CurrentUser, db: DbSession) -> LeadOut:
    uc = WinLeadUseCase(SqlLeadRepository(db))
    try:
        lead = await uc.execute(lead_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return LeadOut.from_domain(lead)


@router.post("/leads/{lead_id}/mark-lost", response_model=LeadOut)
async def mark_lost(lead_id: UUID, body: LostReasonRequest, current_user: CurrentUser, db: DbSession) -> LeadOut:
    uc = LoseLeadUseCase(SqlLeadRepository(db))
    try:
        lead = await uc.execute(lead_id, body.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return LeadOut.from_domain(lead)


@router.post("/leads/{lead_id}/assign", response_model=LeadOut)
async def assign_lead(lead_id: UUID, body: AssignRequest, current_user: CurrentUser, db: DbSession) -> LeadOut:
    try:
        user_id = body.resolved()
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    from src.application.crm.leads.use_cases import AssignLeadUseCase
    uc = AssignLeadUseCase(SqlLeadRepository(db))
    try:
        lead = await uc.execute(lead_id, user_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return LeadOut.from_domain(lead)


# ── Lead timeline (activities + comments merged) ──────────────────────────────


@router.get("/leads/{lead_id}/timeline")
async def get_timeline(
    lead_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict:  # type: ignore[type-arg]
    from src.infrastructure.persistence.models.auth import UserModel

    activities = (await db.execute(
        select(LeadActivityModel)
        .where(LeadActivityModel.lead_id == lead_id)
    )).scalars().all()

    comments = (await db.execute(
        select(LeadCommentModel)
        .where(LeadCommentModel.lead_id == lead_id)
    )).scalars().all()

    # Cache user lookups
    user_ids = {a.created_by for a in activities if a.created_by}
    user_ids.update(c.author_id for c in comments if c.author_id)
    users_map: dict = {}  # type: ignore[type-arg]
    if user_ids:
        users = (await db.execute(
            select(UserModel).where(UserModel.id.in_(user_ids))
        )).scalars().all()
        users_map = {u.id: {"name": u.name, "avatarUrl": u.avatar_url} for u in users}

    entries: list[dict] = []  # type: ignore[type-arg]
    for a in activities:
        entries.append({
            "type": "activity",
            "date": a.created_at.isoformat() if a.created_at else "",
            "data": {
                "id": str(a.id),
                "leadId": str(a.lead_id),
                "type": a.type,
                "date": a.date.isoformat() if a.date else "",
                "outcome": a.outcome or "",
                "notes": a.notes,
                "durationMinutes": a.duration_minutes,
                "channel": a.channel,
                "needsFollowUp": a.needs_follow_up,
                "createdBy": str(a.created_by) if a.created_by else None,
                "createdByUser": users_map.get(a.created_by),
                "createdAt": a.created_at.isoformat() if a.created_at else "",
            },
        })
    for c in comments:
        entries.append({
            "type": "comment",
            "date": c.created_at.isoformat() if c.created_at else "",
            "data": {
                "id": str(c.id),
                "leadId": str(c.lead_id),
                "text": c.text,
                "authorId": str(c.author_id) if c.author_id else None,
                "author": users_map.get(c.author_id),
                "createdAt": c.created_at.isoformat() if c.created_at else "",
                "updatedAt": c.updated_at.isoformat() if c.updated_at else "",
            },
        })

    entries.sort(key=lambda e: e["date"], reverse=True)
    total = len(entries)
    start = (page - 1) * limit
    page_entries = entries[start: start + limit]
    return {"data": page_entries, "total": total, "page": page, "limit": limit, "totalPages": -(-total // limit)}


# ── Lead Sources ──────────────────────────────────────────────────────────────

class LeadSourceOut(BaseModel):
    id: UUID
    name: str
    type: str
    isActive: bool
    funnelId: UUID | None = None
    apiKey: str | None = None
    webhookUrl: str | None = None
    webhookSecret: str | None = None
    createdAt: str


class CreateLeadSourceRequest(BaseModel):
    name: str
    type: str = "manual"
    funnelId: UUID | None = None
    webhookUrl: str | None = None


class UpdateLeadSourceRequest(BaseModel):
    name: str | None = None
    isActive: bool | None = None
    funnelId: UUID | None = None
    webhookUrl: str | None = None


def _src_out(s: LeadSourceModel) -> LeadSourceOut:
    return LeadSourceOut(
        id=s.id,
        name=s.name,
        type=s.type,
        isActive=s.is_active,
        funnelId=s.funnel_id,
        apiKey=s.api_key,
        webhookUrl=s.webhook_url,
        webhookSecret=s.webhook_secret,
        createdAt=s.created_at.isoformat(),
    )


@router.get("/lead-sources", response_model=list[LeadSourceOut])
async def list_sources(current_user: CurrentUser, db: DbSession) -> list[LeadSourceOut]:
    rows = (await db.execute(select(LeadSourceModel).order_by(LeadSourceModel.created_at))).scalars().all()
    return [_src_out(s) for s in rows]


@router.post("/lead-sources", response_model=LeadSourceOut, status_code=status.HTTP_201_CREATED)
async def create_source(body: CreateLeadSourceRequest, _: CrmGuard, db: DbSession) -> LeadSourceOut:
    from datetime import datetime, timezone

    # For api/landing types — auto-generate api_key
    api_key = None
    if body.type in ("api", "landing"):
        api_key = secrets.token_urlsafe(32)

    # For api/landing — funnel_id is required
    if body.type in ("api", "landing") and not body.funnelId:
        raise HTTPException(status_code=422, detail="funnelId is required for api/landing sources")

    s = LeadSourceModel(
        name=body.name,
        type=body.type,
        funnel_id=body.funnelId,
        api_key=api_key,
        webhook_url=body.webhookUrl,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return _src_out(s)


@router.patch("/lead-sources/{source_id}", response_model=LeadSourceOut)
async def update_source(source_id: UUID, body: UpdateLeadSourceRequest, _: CrmGuard, db: DbSession) -> LeadSourceOut:
    result = await db.execute(select(LeadSourceModel).where(LeadSourceModel.id == source_id))
    s = result.scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=404, detail="Lead source not found")
    if body.name is not None:
        s.name = body.name
    if body.isActive is not None:
        s.is_active = body.isActive
    if body.funnelId is not None:
        s.funnel_id = body.funnelId
    if body.webhookUrl is not None:
        s.webhook_url = body.webhookUrl
    await db.commit()
    await db.refresh(s)
    return _src_out(s)


@router.delete("/lead-sources/{source_id}")
async def delete_source(source_id: UUID, _: CrmGuard, db: DbSession) -> Response:
    result = await db.execute(select(LeadSourceModel).where(LeadSourceModel.id == source_id))
    s = result.scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=404, detail="Lead source not found")
    await db.delete(s)
    await db.commit()
    return Response(status_code=204)


@router.post("/lead-sources/{source_id}/regenerate-key", response_model=LeadSourceOut)
async def regenerate_api_key(source_id: UUID, _: CrmGuard, db: DbSession) -> LeadSourceOut:
    result = await db.execute(select(LeadSourceModel).where(LeadSourceModel.id == source_id))
    s = result.scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=404, detail="Lead source not found")
    s.api_key = secrets.token_urlsafe(32)
    await db.commit()
    await db.refresh(s)
    return _src_out(s)


# ── CRM Contacts ─────────────────────────────────────────────────────────────

class ContactOut(BaseModel):
    id: UUID
    fullName: str
    phone: str
    email: str | None = None
    notes: str | None = None
    createdAt: str | None = None
    leadsCount: int = 0


@router.get("/contacts", response_model=list[ContactOut])
async def list_contacts(
    current_user: CurrentUser, db: DbSession,
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
) -> list[ContactOut]:
    from src.infrastructure.persistence.models.crm import CrmContactModel
    from sqlalchemy import func as fn

    q = select(CrmContactModel)
    if search:
        q = q.where(
            CrmContactModel.full_name.ilike(f"%{search}%")
            | CrmContactModel.phone.ilike(f"%{search}%")
            | CrmContactModel.email.ilike(f"%{search}%")
        )
    q = q.order_by(CrmContactModel.created_at.desc())
    q = q.offset((page - 1) * limit).limit(limit)
    rows = (await db.execute(q)).scalars().all()

    result = []
    for c in rows:
        leads_count = (await db.execute(
            select(fn.count()).where(LeadModel.contact_id == c.id)
        )).scalar() or 0
        result.append(ContactOut(
            id=c.id, fullName=c.full_name, phone=c.phone, email=c.email,
            notes=c.notes,
            createdAt=c.created_at.isoformat() if c.created_at else None,
            leadsCount=leads_count,
        ))
    return result


@router.get("/contacts/{contact_id}", response_model=ContactOut)
async def get_contact(contact_id: UUID, current_user: CurrentUser, db: DbSession) -> ContactOut:
    from src.infrastructure.persistence.models.crm import CrmContactModel
    from sqlalchemy import func as fn

    c = (await db.execute(select(CrmContactModel).where(CrmContactModel.id == contact_id))).scalar_one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    leads_count = (await db.execute(
        select(fn.count()).where(LeadModel.contact_id == c.id)
    )).scalar() or 0
    return ContactOut(
        id=c.id, fullName=c.full_name, phone=c.phone, email=c.email,
        notes=c.notes,
        createdAt=c.created_at.isoformat() if c.created_at else None,
        leadsCount=leads_count,
    )


# ── CRM Users / Managers ──────────────────────────────────────────────────────

class CrmUserOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    avatarUrl: str | None = None
    isActive: bool = True


class CreateCrmUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "sales_manager"


class UpdateCrmUserRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    isActive: bool | None = None


def _crm_user_out(u: UserModel) -> CrmUserOut:
    return CrmUserOut(id=u.id, name=u.name, email=u.email, role=u.role,
                      avatarUrl=u.avatar_url, isActive=u.is_active)


@router.get("/users", response_model=list[CrmUserOut])
async def list_crm_users(current_user: CurrentUser, db: DbSession) -> list[CrmUserOut]:
    from sqlalchemy import or_
    rows = (await db.execute(
        select(UserModel).where(
            or_(UserModel.role == "director", UserModel.role == "sales_manager")
        ).order_by(UserModel.name)
    )).scalars().all()
    return [_crm_user_out(u) for u in rows]


@router.post("/users", response_model=CrmUserOut, status_code=status.HTTP_201_CREATED)
async def create_crm_user(body: CreateCrmUserRequest, _: CrmGuard, db: DbSession, current_user: CurrentUser) -> CrmUserOut:
    from src.domain.auth.entities import UserRole
    from src.infrastructure.services.password_service import hash_password
    from src.domain.auth.policies import PasswordPolicy

    # Only directors can create users
    if current_user.role != "director":
        raise HTTPException(status_code=403, detail="Only directors can create users")

    if body.role not in ("director", "sales_manager"):
        raise HTTPException(status_code=400, detail="Role must be director or sales_manager")

    errors = PasswordPolicy.validate(body.password)
    if errors:
        raise HTTPException(status_code=422, detail="; ".join(errors))

    existing = (await db.execute(select(UserModel).where(UserModel.email == body.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    from uuid import uuid4
    from datetime import datetime, timezone
    u = UserModel(
        id=uuid4(), name=body.name, email=body.email,
        password_hash=hash_password(body.password),
        role=body.role, is_active=True,
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return _crm_user_out(u)


@router.patch("/users/{user_id}", response_model=CrmUserOut)
async def update_crm_user(user_id: UUID, body: UpdateCrmUserRequest, _: CrmGuard, db: DbSession, current_user: CurrentUser) -> CrmUserOut:
    if current_user.role != "director":
        raise HTTPException(status_code=403, detail="Only directors can edit users")

    u = (await db.execute(select(UserModel).where(UserModel.id == user_id))).scalar_one_or_none()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name is not None:
        u.name = body.name
    if body.email is not None:
        existing = (await db.execute(select(UserModel).where(UserModel.email == body.email, UserModel.id != user_id))).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Email already taken")
        u.email = body.email
    if body.role is not None:
        if body.role not in ("director", "sales_manager"):
            raise HTTPException(status_code=400, detail="Role must be director or sales_manager")
        u.role = body.role
    if body.isActive is not None:
        u.is_active = body.isActive
    await db.commit()
    await db.refresh(u)
    return _crm_user_out(u)
