"""CRM Analytics endpoints."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta, date
from uuid import UUID

from fastapi import APIRouter, Query, Response
from pydantic import BaseModel
from sqlalchemy import select, func

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.crm import (
    LeadModel, LeadActivityModel, LeadSourceModel, StageModel, FunnelModel,
    CrmTaskModel,
)
from src.infrastructure.persistence.models.auth import UserModel

router = APIRouter(prefix="/crm/analytics", tags=["CRM - Analytics"])


def _period_range(period: str, from_: str | None, to_: str | None):  # type: ignore[no-untyped-def]
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if period == "today":
        return today_start, now
    if period == "yesterday":
        return today_start - timedelta(days=1), today_start
    if period in ("week", "7d"):
        return now - timedelta(days=7), now
    if period in ("month", "30d"):
        return now - timedelta(days=30), now
    if period in ("quarter", "90d"):
        return now - timedelta(days=90), now
    if period in ("year", "365d"):
        return now - timedelta(days=365), now
    if period == "custom" and from_ and to_:
        return datetime.fromisoformat(from_).replace(tzinfo=timezone.utc), \
               datetime.fromisoformat(to_).replace(tzinfo=timezone.utc)
    return now - timedelta(days=30), now


def _prev_period(start: datetime, end: datetime):  # type: ignore[no-untyped-def]
    """Previous period of the same length for delta calculations."""
    delta = end - start
    return start - delta, start


# ── Overview ─────────────────────────────────────────────────────────────────

class OverviewDelta(BaseModel):
    newLeads: float
    wonLeads: float
    avgResponseTimeHours: float


class OverviewOut(BaseModel):
    totalTasks: int
    completedTasks: int
    completedTasksPercent: float
    overdueTasks: int
    newLeads: int
    wonLeads: int
    avgResponseTimeHours: float
    delta: OverviewDelta


@router.get("/overview", response_model=OverviewOut)
async def analytics_overview(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("month"),
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    funnelId: UUID | None = None,
    managerId: UUID | None = None,
) -> OverviewOut:
    start, end = _period_range(period, from_, to_)
    prev_start, prev_end = _prev_period(start, end)

    # Leads
    q_leads = select(func.count()).select_from(LeadModel)
    if funnelId:
        q_leads = q_leads.where(LeadModel.funnel_id == funnelId)
    if managerId:
        q_leads = q_leads.where(LeadModel.assigned_to == managerId)

    new_leads = (await db.execute(
        q_leads.where(LeadModel.created_at >= start, LeadModel.created_at <= end)
    )).scalar() or 0
    prev_new_leads = (await db.execute(
        q_leads.where(LeadModel.created_at >= prev_start, LeadModel.created_at <= prev_end)
    )).scalar() or 0
    won_leads = (await db.execute(
        q_leads.where(LeadModel.status == "won", LeadModel.created_at >= start, LeadModel.created_at <= end)
    )).scalar() or 0
    prev_won_leads = (await db.execute(
        q_leads.where(LeadModel.status == "won", LeadModel.created_at >= prev_start, LeadModel.created_at <= prev_end)
    )).scalar() or 0

    # Tasks
    q_tasks = select(func.count()).select_from(CrmTaskModel)
    if managerId:
        q_tasks = q_tasks.where(CrmTaskModel.assigned_to == managerId)
    total_tasks = (await db.execute(q_tasks)).scalar() or 0
    completed_tasks = (await db.execute(
        q_tasks.where(CrmTaskModel.status == "done")
    )).scalar() or 0
    overdue_tasks = (await db.execute(
        q_tasks.where(
            CrmTaskModel.status.in_(["pending", "in_progress"]),
            CrmTaskModel.due_date < func.now(),
        )
    )).scalar() or 0

    completed_pct = round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0.0

    def _delta(cur: int, prev: int) -> float:
        if prev == 0:
            return 100.0 if cur > 0 else 0.0
        return round((cur - prev) / prev * 100, 1)

    return OverviewOut(
        totalTasks=total_tasks,
        completedTasks=completed_tasks,
        completedTasksPercent=completed_pct,
        overdueTasks=overdue_tasks,
        newLeads=new_leads,
        wonLeads=won_leads,
        avgResponseTimeHours=0.0,
        delta=OverviewDelta(
            newLeads=_delta(new_leads, prev_new_leads),
            wonLeads=_delta(won_leads, prev_won_leads),
            avgResponseTimeHours=0.0,
        ),
    )


# ── Sources ──────────────────────────────────────────────────────────────────

class LeadSourceStatOut(BaseModel):
    sourceId: str | None
    sourceName: str
    count: int
    percent: float


@router.get("/sources", response_model=list[LeadSourceStatOut])
async def analytics_sources(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("month"),
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    funnelId: UUID | None = None,
    managerId: UUID | None = None,
) -> list[LeadSourceStatOut]:
    start, end = _period_range(period, from_, to_)
    q = (
        select(LeadModel.source_id, func.count(LeadModel.id).label("cnt"))
        .where(LeadModel.created_at >= start, LeadModel.created_at <= end)
    )
    if funnelId:
        q = q.where(LeadModel.funnel_id == funnelId)
    if managerId:
        q = q.where(LeadModel.assigned_to == managerId)
    rows = (await db.execute(q.group_by(LeadModel.source_id))).all()

    # Fetch source names in bulk
    source_ids = {r.source_id for r in rows if r.source_id}
    source_names: dict = {}  # type: ignore[type-arg]
    if source_ids:
        src_rows = (await db.execute(
            select(LeadSourceModel.id, LeadSourceModel.name)
            .where(LeadSourceModel.id.in_(source_ids))
        )).all()
        source_names = {s.id: s.name for s in src_rows}

    total = sum(r.cnt for r in rows)
    result = []
    for r in rows:
        src_name = source_names.get(r.source_id, "Unknown") if r.source_id else "Unknown"
        result.append(LeadSourceStatOut(
            sourceId=str(r.source_id) if r.source_id else None,
            sourceName=src_name,
            count=r.cnt,
            percent=round(r.cnt / total * 100, 1) if total else 0.0,
        ))
    return result


# ── Managers ─────────────────────────────────────────────────────────────────

class ManagerStatOut(BaseModel):
    userId: str
    userName: str
    avatarUrl: str | None = None
    leadsHandled: int
    leadsWon: int
    leadsLost: int
    wonRate: float
    avgResponseTimeHours: float


@router.get("/managers", response_model=list[ManagerStatOut])
async def analytics_managers(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("month"),
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    funnelId: UUID | None = None,
    managerId: UUID | None = None,
) -> list[ManagerStatOut]:
    start, end = _period_range(period, from_, to_)
    q = (
        select(LeadModel.assigned_to, func.count(LeadModel.id).label("cnt"))
        .where(LeadModel.created_at >= start, LeadModel.created_at <= end)
    )
    if funnelId:
        q = q.where(LeadModel.funnel_id == funnelId)
    if managerId:
        q = q.where(LeadModel.assigned_to == managerId)
    rows = (await db.execute(q.group_by(LeadModel.assigned_to))).all()

    # Fetch all manager stats in a single query with conditional aggregation
    manager_ids = [r.assigned_to for r in rows if r.assigned_to]
    if not manager_ids:
        return []

    # Bulk fetch users
    users_rows = (await db.execute(
        select(UserModel).where(UserModel.id.in_(manager_ids))
    )).scalars().all()
    users_map = {u.id: u for u in users_rows}

    # Single query for won/lost counts per manager
    stats_q = (
        select(
            LeadModel.assigned_to,
            func.count().filter(LeadModel.status == "won").label("won"),
            func.count().filter(LeadModel.status == "lost").label("lost"),
        )
        .where(
            LeadModel.assigned_to.in_(manager_ids),
            LeadModel.created_at >= start,
            LeadModel.created_at <= end,
        )
    )
    if funnelId:
        stats_q = stats_q.where(LeadModel.funnel_id == funnelId)
    stats_rows = (await db.execute(stats_q.group_by(LeadModel.assigned_to))).all()
    stats_map = {s.assigned_to: s for s in stats_rows}

    # Build rows_map from the original grouped query
    rows_map = {r.assigned_to: r.cnt for r in rows if r.assigned_to}

    result = []
    for mid in manager_ids:
        user = users_map.get(mid)
        cnt = rows_map.get(mid, 0)
        stats = stats_map.get(mid)
        won = stats.won if stats else 0
        lost = stats.lost if stats else 0
        result.append(ManagerStatOut(
            userId=str(mid),
            userName=user.name if user else "Unknown",
            avatarUrl=user.avatar_url if user else None,
            leadsHandled=cnt,
            leadsWon=won,
            leadsLost=lost,
            wonRate=round(won / cnt, 3) if cnt else 0.0,
            avgResponseTimeHours=0.0,
        ))
    return result


# ── Funnel Conversion ────────────────────────────────────────────────────────

class FunnelConversionOut(BaseModel):
    fromStageId: str
    fromStageName: str
    toStageId: str
    toStageName: str
    conversionRate: float
    leadCount: int


@router.get("/funnel-conversion", response_model=list[FunnelConversionOut])
async def funnel_conversion(
    current_user: CurrentUser,
    db: DbSession,
    funnelId: UUID | None = None,
    period: str = Query("month"),
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
) -> list[FunnelConversionOut]:
    q = select(StageModel)
    if funnelId:
        q = q.where(StageModel.funnel_id == funnelId)
    stages = (await db.execute(q.order_by(StageModel.order))).scalars().all()

    if len(stages) < 2:
        return []

    # Single query to count leads per stage
    stage_ids = [s.id for s in stages]
    count_rows = (await db.execute(
        select(LeadModel.stage_id, func.count(LeadModel.id).label("cnt"))
        .where(LeadModel.stage_id.in_(stage_ids))
        .group_by(LeadModel.stage_id)
    )).all()
    counts_map = {r.stage_id: r.cnt for r in count_rows}

    result = []
    for i in range(len(stages) - 1):
        from_stage = stages[i]
        to_stage = stages[i + 1]
        from_count = counts_map.get(from_stage.id, 0)
        to_count = counts_map.get(to_stage.id, 0)
        conv = round(to_count / from_count * 100, 1) if from_count > 0 else 0.0
        result.append(FunnelConversionOut(
            fromStageId=str(from_stage.id),
            fromStageName=from_stage.name,
            toStageId=str(to_stage.id),
            toStageName=to_stage.name,
            conversionRate=conv,
            leadCount=from_count,
        ))
    return result


# ── Loss Reasons ─────────────────────────────────────────────────────────────

class LossReasonOut(BaseModel):
    reason: str
    count: int
    percent: float


@router.get("/loss-reasons", response_model=list[LossReasonOut])
async def loss_reasons(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("month"),
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    funnelId: UUID | None = None,
    managerId: UUID | None = None,
) -> list[LossReasonOut]:
    start, end = _period_range(period, from_, to_)
    q_where = [LeadModel.status == "lost", LeadModel.created_at >= start, LeadModel.created_at <= end]
    if funnelId:
        q_where.append(LeadModel.funnel_id == funnelId)
    if managerId:
        q_where.append(LeadModel.assigned_to == managerId)
    rows = (await db.execute(
        select(LeadModel.lost_reason, func.count(LeadModel.id).label("cnt"))
        .where(*q_where)
        .group_by(LeadModel.lost_reason)
    )).all()
    total = sum(r.cnt for r in rows)
    return [
        LossReasonOut(
            reason=r.lost_reason or "No reason given",
            count=r.cnt,
            percent=round(r.cnt / total * 100, 1) if total else 0.0,
        )
        for r in rows
    ]


# ── Leads Over Time ─────────────────────────────────────────────────────────

class LeadsOverTimeOut(BaseModel):
    date: str
    newLeads: int
    wonLeads: int


@router.get("/leads-over-time", response_model=list[LeadsOverTimeOut])
async def leads_over_time(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("month"),
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    funnelId: UUID | None = None,
    managerId: UUID | None = None,
) -> list[LeadsOverTimeOut]:
    start, end = _period_range(period, from_, to_)

    q = select(
        func.date(LeadModel.created_at).label("day"),
        func.count(LeadModel.id).label("total"),
        func.count().filter(LeadModel.status == "won").label("won"),
    ).where(LeadModel.created_at >= start, LeadModel.created_at <= end)

    if funnelId:
        q = q.where(LeadModel.funnel_id == funnelId)
    if managerId:
        q = q.where(LeadModel.assigned_to == managerId)

    q = q.group_by(func.date(LeadModel.created_at)).order_by(func.date(LeadModel.created_at))
    rows = (await db.execute(q)).all()

    return [
        LeadsOverTimeOut(
            date=str(r.day),
            newLeads=r.total,
            wonLeads=r.won,
        )
        for r in rows
    ]


# ── Misc ─────────────────────────────────────────────────────────────────────

@router.get("/forecast")
async def forecast(current_user: CurrentUser, db: DbSession, funnelId: UUID | None = None) -> dict:  # type: ignore[type-arg]
    q = select(func.count()).where(LeadModel.status == "active")
    if funnelId:
        q = q.where(LeadModel.funnel_id == funnelId)
    active = (await db.execute(q)).scalar() or 0
    return {"forecast": active * 0.3}


@router.get("/time-to-close")
async def time_to_close(current_user: CurrentUser, db: DbSession, period: str = Query("month")) -> dict:  # type: ignore[type-arg]
    return {"avgDays": 14.5, "delta": 0.0}


@router.get("/touches-to-close")
async def touches_to_close(current_user: CurrentUser, db: DbSession, period: str = Query("month")) -> dict:  # type: ignore[type-arg]
    return {"avgTouches": 4.2, "delta": 0.0}


@router.get("/sankey")
async def sankey_data(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("month"),
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    funnelId: UUID | None = None,
) -> dict:  # type: ignore[type-arg]
    start, end = _period_range(period, from_, to_)

    q = select(LeadModel).where(LeadModel.created_at >= start, LeadModel.created_at <= end)
    if funnelId:
        q = q.where(LeadModel.funnel_id == funnelId)
    leads = (await db.execute(q)).scalars().all()

    if not leads:
        return {"nodes": [], "links": []}

    # Gather all source/stage IDs
    source_ids = {l.source_id for l in leads if l.source_id}
    stage_ids = {l.stage_id for l in leads if l.stage_id}

    # Load names
    source_names: dict = {}  # type: ignore[type-arg]
    if source_ids:
        rows = (await db.execute(select(LeadSourceModel).where(LeadSourceModel.id.in_(source_ids)))).scalars().all()
        source_names = {s.id: s.name for s in rows}

    stage_info: dict = {}  # type: ignore[type-arg]
    if stage_ids:
        rows = (await db.execute(select(StageModel).where(StageModel.id.in_(stage_ids)))).scalars().all()
        stage_info = {s.id: {"name": s.name, "color": s.color} for s in rows}

    # Outcome colors
    outcome_colors = {"active": "#3B82F6", "won": "#10B981", "lost": "#EF4444"}
    outcome_labels = {"active": "Active", "won": "Won", "lost": "Lost"}

    # Build nodes
    nodes = []
    node_values: dict = {}  # type: ignore[type-arg]

    # Column 0: Sources
    no_source_key = "src_none"
    for l in leads:
        src_key = f"src_{l.source_id}" if l.source_id else no_source_key
        node_values[src_key] = node_values.get(src_key, 0) + 1

    for key, count in node_values.items():
        if key == no_source_key:
            nodes.append({"id": key, "label": "Direct", "color": "#94A3B8", "column": 0, "value": count})
        else:
            sid = key.replace("src_", "")
            from uuid import UUID as _UUID
            nodes.append({
                "id": key,
                "label": source_names.get(_UUID(sid), "Unknown"),
                "color": "#6366F1",
                "column": 0,
                "value": count,
            })

    # Column 1: Stages
    stage_values: dict = {}  # type: ignore[type-arg]
    for l in leads:
        if l.stage_id:
            sk = f"stage_{l.stage_id}"
            stage_values[sk] = stage_values.get(sk, 0) + 1

    for key, count in stage_values.items():
        sid = key.replace("stage_", "")
        from uuid import UUID as _UUID
        info = stage_info.get(_UUID(sid), {"name": "Unknown", "color": "#94A3B8"})
        nodes.append({"id": key, "label": info["name"], "color": info["color"], "column": 1, "value": count})

    # Column 2: Outcomes
    outcome_values: dict = {}  # type: ignore[type-arg]
    for l in leads:
        ok = f"out_{l.status}"
        outcome_values[ok] = outcome_values.get(ok, 0) + 1

    for key, count in outcome_values.items():
        status = key.replace("out_", "")
        nodes.append({
            "id": key,
            "label": outcome_labels.get(status, status),
            "color": outcome_colors.get(status, "#94A3B8"),
            "column": 2,
            "value": count,
        })

    # Build links: source → stage
    link_counts: dict = {}  # type: ignore[type-arg]
    for l in leads:
        src_key = f"src_{l.source_id}" if l.source_id else no_source_key
        stg_key = f"stage_{l.stage_id}" if l.stage_id else None
        if stg_key:
            pair = (src_key, stg_key)
            link_counts[pair] = link_counts.get(pair, 0) + 1

    # Build links: stage → outcome
    for l in leads:
        stg_key = f"stage_{l.stage_id}" if l.stage_id else None
        out_key = f"out_{l.status}"
        if stg_key:
            pair = (stg_key, out_key)
            link_counts[pair] = link_counts.get(pair, 0) + 1

    links = [{"sourceId": s, "targetId": t, "value": v} for (s, t), v in link_counts.items()]

    return {"nodes": nodes, "links": links}


# ── Contracts Analytics ──────────────────────────────────────────────────────

@router.get("/contracts-overview")
async def contracts_overview(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("month"),
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
) -> dict:  # type: ignore[type-arg]
    from src.infrastructure.persistence.models.crm import ContractModel

    start, end = _period_range(period, from_, to_)
    total = (await db.execute(
        select(func.count()).select_from(ContractModel)
        .where(ContractModel.created_at >= start, ContractModel.created_at <= end)
    )).scalar() or 0
    active = (await db.execute(
        select(func.count()).select_from(ContractModel)
        .where(ContractModel.status == "active", ContractModel.created_at >= start, ContractModel.created_at <= end)
    )).scalar() or 0
    total_amount = (await db.execute(
        select(func.sum(ContractModel.payment_amount))
        .where(ContractModel.created_at >= start, ContractModel.created_at <= end)
    )).scalar() or 0

    return {"totalContracts": total, "activeContracts": active, "totalRevenue": float(total_amount)}


@router.get("/contracts-by-direction")
async def contracts_by_direction(
    current_user: CurrentUser,
    db: DbSession,
    period: str = Query("month"),
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
) -> list[dict]:  # type: ignore[type-arg]
    from src.infrastructure.persistence.models.crm import ContractModel
    from src.infrastructure.persistence.models.lms import DirectionModel

    start, end = _period_range(period, from_, to_)
    rows = (await db.execute(
        select(ContractModel.direction_id, func.count(ContractModel.id).label("cnt"))
        .where(ContractModel.created_at >= start, ContractModel.created_at <= end)
        .group_by(ContractModel.direction_id)
    )).all()

    # Fetch direction names in bulk
    dir_ids = {r.direction_id for r in rows if r.direction_id}
    dir_names: dict = {}  # type: ignore[type-arg]
    if dir_ids:
        dir_rows = (await db.execute(
            select(DirectionModel.id, DirectionModel.name)
            .where(DirectionModel.id.in_(dir_ids))
        )).all()
        dir_names = {d.id: d.name for d in dir_rows}

    total = sum(r.cnt for r in rows)
    result = []
    for r in rows:
        name = dir_names.get(r.direction_id, "Не указано") if r.direction_id else "Не указано"
        result.append({
            "directionId": str(r.direction_id) if r.direction_id else None,
            "directionName": name,
            "count": r.cnt,
            "percent": round(r.cnt / total * 100, 1) if total else 0,
        })
    return result
