"""CRM Lead Activities (calls, meetings, messages) and Comments."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.crm import (
    LeadActivityModel,
    LeadCommentModel,
    LeadModel,
)

router = APIRouter(prefix="/crm/leads/{lead_id}", tags=["CRM - Timeline"])

VALID_ACTIVITY_TYPES = {"call", "meeting", "message", "other"}


# ── Schemas ──────────────────────────────────────────────────────────────────

class ActivityOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    leadId: UUID
    type: str
    date: str
    outcome: str
    notes: str | None = None
    durationMinutes: int | None = None
    channel: str | None = None
    needsFollowUp: bool = False
    createdBy: UUID | None = None
    createdByUser: dict | None = None  # type: ignore[type-arg]
    createdAt: str = ""


class ActivityIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: str
    date: str
    outcome: str
    notes: str | None = None
    durationMinutes: int | None = None
    channel: str | None = None
    needsFollowUp: bool = False


class CommentOut(BaseModel):
    id: UUID
    leadId: UUID
    text: str
    authorId: UUID
    createdAt: str = ""
    updatedAt: str = ""


class CommentIn(BaseModel):
    text: str


# ── Activities ───────────────────────────────────────────────────────────────

@router.post("/activities", response_model=ActivityOut, status_code=201)
async def create_activity(
    lead_id: UUID, body: ActivityIn, current_user: CurrentUser, db: DbSession
) -> ActivityOut:
    if body.type not in VALID_ACTIVITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid type. Must be one of {sorted(VALID_ACTIVITY_TYPES)}")

    lead = await db.get(LeadModel, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")

    try:
        date_dt = datetime.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format (use ISO 8601)")

    now = datetime.now(timezone.utc)
    m = LeadActivityModel(
        id=uuid4(),
        lead_id=lead_id,
        type=body.type,
        date=date_dt,
        outcome=body.outcome,
        notes=body.notes,
        duration_minutes=body.durationMinutes,
        channel=body.channel,
        needs_follow_up=body.needsFollowUp,
        created_by=current_user.id,
        created_at=now,
    )
    db.add(m)

    lead.last_activity_at = now
    await db.commit()
    await db.refresh(m)

    return _activity_out(m, current_user)


@router.get("/activities", response_model=list[ActivityOut])
async def list_activities(
    lead_id: UUID, current_user: CurrentUser, db: DbSession,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
) -> list[ActivityOut]:
    rows = (await db.execute(
        select(LeadActivityModel)
        .where(LeadActivityModel.lead_id == lead_id)
        .order_by(LeadActivityModel.date.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()
    return [_activity_out(r) for r in rows]


# ── Comments ─────────────────────────────────────────────────────────────────

@router.post("/comments", response_model=CommentOut, status_code=201)
async def create_comment(
    lead_id: UUID, body: CommentIn, current_user: CurrentUser, db: DbSession
) -> CommentOut:
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Comment text cannot be empty")

    lead = await db.get(LeadModel, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")

    m = LeadCommentModel(
        id=uuid4(),
        lead_id=lead_id,
        text=body.text.strip(),
        author_id=current_user.id,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return _comment_out(m)


@router.get("/comments", response_model=list[CommentOut])
async def list_comments(lead_id: UUID, current_user: CurrentUser, db: DbSession) -> list[CommentOut]:
    rows = (await db.execute(
        select(LeadCommentModel)
        .where(LeadCommentModel.lead_id == lead_id)
        .order_by(LeadCommentModel.created_at.asc())
    )).scalars().all()
    return [_comment_out(r) for r in rows]


@router.delete("/comments/{comment_id}")
async def delete_comment(
    lead_id: UUID, comment_id: UUID, current_user: CurrentUser, db: DbSession
) -> dict:  # type: ignore[type-arg]
    m = await db.get(LeadCommentModel, comment_id)
    if m is None or m.lead_id != lead_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if m.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's comment")
    await db.delete(m)
    await db.commit()
    return {"message": "Deleted"}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _activity_out(m: LeadActivityModel, user=None) -> ActivityOut:  # type: ignore[no-untyped-def]
    created_by_user = None
    if user and hasattr(user, 'name'):
        created_by_user = {"name": user.name, "avatarUrl": getattr(user, 'avatar_url', None)}
    return ActivityOut(
        id=m.id,
        leadId=m.lead_id,
        type=m.type,
        date=m.date.isoformat() if m.date else "",
        outcome=m.outcome,
        notes=m.notes,
        durationMinutes=m.duration_minutes,
        channel=m.channel,
        needsFollowUp=m.needs_follow_up,
        createdBy=m.created_by,
        createdByUser=created_by_user,
        createdAt=m.created_at.isoformat() if m.created_at else "",
    )


def _comment_out(m: LeadCommentModel) -> CommentOut:
    return CommentOut(
        id=m.id,
        leadId=m.lead_id,
        text=m.text,
        authorId=m.author_id,
        createdAt=m.created_at.isoformat() if m.created_at else "",
        updatedAt=m.updated_at.isoformat() if m.updated_at else "",
    )
