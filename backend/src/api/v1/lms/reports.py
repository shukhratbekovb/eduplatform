"""LMS Reports — teacher hours, performance by group, financial reports."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func, select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.auth import UserModel
from src.infrastructure.persistence.models.crm import ContractModel
from src.infrastructure.persistence.models.lms import (
    DirectionModel,
    EnrollmentModel,
    GroupModel,
    LessonModel,
    PaymentModel,
    StudentModel,
    SubjectModel,
)

router = APIRouter(prefix="/lms/reports", tags=["LMS - Reports"])

CashierGuard = Annotated[object, Depends(require_roles("director", "cashier"))]


def _now():
    return datetime.now(UTC)


def _lesson_period_filter(q, month: int, year: int):
    """Filter lessons by month/year via scheduled_at. Skip if 0."""
    if not month or not year:
        return q
    return q.where(
        extract("year", LessonModel.scheduled_at) == year,
        extract("month", LessonModel.scheduled_at) == month,
    )


# ── Available periods ────────────────────────────────────────────────────────


@router.get("/available-periods")
async def available_periods(
    current_user: CurrentUser,
    db: DbSession,
    teacher_id: UUID | None = Query(default=None, alias="teacherId"),
) -> dict:
    q = select(
        extract("year", LessonModel.scheduled_at).label("y"),
        extract("month", LessonModel.scheduled_at).label("m"),
    ).where(LessonModel.scheduled_at != None)  # noqa: E711
    if teacher_id:
        q = q.where(LessonModel.teacher_id == teacher_id)
    q = q.distinct().order_by("y", "m")
    rows = (await db.execute(q)).all()

    years = sorted(set(int(r.y) for r in rows))
    months_by_year: dict[int, list[int]] = {}
    for r in rows:
        y = int(r.y)
        months_by_year.setdefault(y, []).append(int(r.m))
    return {"years": years, "monthsByYear": months_by_year}


# ── Teacher Hours ────────────────────────────────────────────────────────────


@router.get("/teacher-hours")
async def teacher_hours(
    current_user: CurrentUser,
    db: DbSession,
    month: int = Query(default=None),
    year: int = Query(default=None),
    teacher_id: UUID | None = Query(default=None, alias="teacherId"),
) -> list[dict]:
    month = month or _now().month
    year = year or _now().year
    q = select(UserModel).where(UserModel.role == "teacher", UserModel.is_active == True)  # noqa: E712
    if teacher_id:
        q = q.where(UserModel.id == teacher_id)
    teachers = (await db.execute(q)).scalars().all()

    if not teachers:
        return []

    teacher_ids = [t.id for t in teachers]
    teacher_map = {t.id: t.name for t in teachers}

    base_q = (
        select(
            LessonModel.teacher_id,
            SubjectModel.name.label("subject_name"),
            func.count(LessonModel.id).filter(LessonModel.status == "completed").label("conducted"),
            func.sum(LessonModel.duration_minutes).filter(LessonModel.status == "completed").label("minutes"),
        )
        .outerjoin(SubjectModel, SubjectModel.id == LessonModel.subject_id)
        .where(LessonModel.teacher_id.in_(teacher_ids))
    )
    base_q = _lesson_period_filter(base_q, month, year)
    rows = (await db.execute(base_q.group_by(LessonModel.teacher_id, SubjectModel.name))).all()

    from collections import defaultdict

    teacher_data: dict = defaultdict(lambda: {"conducted": 0, "minutes": 0, "subjects": []})

    for r in rows:
        td = teacher_data[r.teacher_id]
        conducted = r.conducted or 0
        minutes = r.minutes or 0
        td["conducted"] += conducted
        td["minutes"] += minutes
        if conducted > 0:
            subj_name = r.subject_name or "Без предмета"
            td["subjects"].append(
                {
                    "name": subj_name,
                    "lessons": conducted,
                    "hours": minutes // 60,
                    "minutesRemainder": minutes % 60,
                }
            )

    result = []
    for tid in teacher_ids:
        td = teacher_data.get(tid, {"conducted": 0, "minutes": 0, "subjects": []})
        td["subjects"].sort(key=lambda x: x["lessons"], reverse=True)
        result.append(
            {
                "teacherId": str(tid),
                "teacherName": teacher_map.get(tid, ""),
                "lessonsConducted": td["conducted"],
                "hours": td["minutes"] // 60,
                "minutesRemainder": td["minutes"] % 60,
                "subjects": td["subjects"],
            }
        )

    result.sort(key=lambda x: x["lessonsConducted"], reverse=True)
    return result


# ── Performance by Group ─────────────────────────────────────────────────────


@router.get("/performance")
async def performance_report(
    current_user: CurrentUser,
    db: DbSession,
    month: int = Query(default=None),
    year: int = Query(default=None),
) -> list[dict]:
    month = month or _now().month
    year = year or _now().year
    groups = (
        (
            await db.execute(
                select(GroupModel).where(GroupModel.is_active == True)  # noqa: E712
            )
        )
        .scalars()
        .all()
    )

    if not groups:
        return []

    dir_ids = {g.direction_id for g in groups if g.direction_id}
    dir_map: dict = {}
    if dir_ids:
        dirs = (await db.execute(select(DirectionModel).where(DirectionModel.id.in_(dir_ids)))).scalars().all()
        dir_map = {d.id: d.name for d in dirs}

    result = []
    for g in groups:
        sc = (
            await db.execute(
                select(func.count()).where(EnrollmentModel.group_id == g.id, EnrollmentModel.is_active == True)  # noqa: E712
            )
        ).scalar() or 0

        lq = select(
            func.count(LessonModel.id).label("total"),
            func.count().filter(LessonModel.status == "completed").label("conducted"),
        ).where(LessonModel.group_id == g.id)
        lq = _lesson_period_filter(lq, month, year)
        lesson_stats = (await db.execute(lq)).one()

        avg_gpa = (
            await db.execute(
                select(func.avg(StudentModel.gpa))
                .join(EnrollmentModel, EnrollmentModel.student_id == StudentModel.id)
                .where(EnrollmentModel.group_id == g.id, EnrollmentModel.is_active == True)  # noqa: E712
            )
        ).scalar()

        avg_att = (
            await db.execute(
                select(func.avg(StudentModel.attendance_percent))
                .join(EnrollmentModel, EnrollmentModel.student_id == StudentModel.id)
                .where(EnrollmentModel.group_id == g.id, EnrollmentModel.is_active == True)  # noqa: E712
            )
        ).scalar()

        result.append(
            {
                "groupId": str(g.id),
                "groupName": g.name,
                "direction": dir_map.get(g.direction_id, ""),
                "teacher": "",
                "studentCount": sc,
                "avgGrade": round(float(avg_gpa), 1) if avg_gpa else 0.0,
                "attendance": round(float(avg_att), 1) if avg_att else 0.0,
                "lessonsTotal": lesson_stats.total,
            }
        )

    return result


# ── By Direction ─────────────────────────────────────────────────────────────


@router.get("/by-direction")
async def by_direction_report(
    current_user: CurrentUser,
    db: DbSession,
    month: int = Query(default=None),
    year: int = Query(default=None),
) -> list[dict]:
    month = month or _now().month
    year = year or _now().year
    directions = (
        (
            await db.execute(
                select(DirectionModel).where(DirectionModel.is_active == True)  # noqa: E712
            )
        )
        .scalars()
        .all()
    )

    result = []
    for d in directions:
        group_ids = (await db.execute(select(GroupModel.id).where(GroupModel.direction_id == d.id))).scalars().all()

        student_count = 0
        if group_ids:
            student_count = (
                await db.execute(
                    select(func.count(func.distinct(EnrollmentModel.student_id))).where(
                        EnrollmentModel.group_id.in_(group_ids), EnrollmentModel.is_active == True
                    )  # noqa: E712
                )
            ).scalar() or 0

        lesson_stats = {"total": 0, "conducted": 0, "cancelled": 0}
        if group_ids:
            lq = select(
                func.count(LessonModel.id).label("total"),
                func.count().filter(LessonModel.status == "completed").label("conducted"),
                func.count().filter(LessonModel.status == "cancelled").label("cancelled"),
            ).where(LessonModel.group_id.in_(group_ids))
            lq = _lesson_period_filter(lq, month, year)
            row = (await db.execute(lq)).one()
            lesson_stats = {"total": row.total, "conducted": row.conducted, "cancelled": row.cancelled}

        result.append(
            {
                "directionId": str(d.id),
                "directionName": d.name,
                "color": "#6366F1",
                "groupCount": len(group_ids),
                "studentCount": student_count,
                "lessonsTotal": lesson_stats["total"],
                "lessonsConducted": lesson_stats["conducted"],
                "lessonsCancelled": lesson_stats["cancelled"],
            }
        )

    return result


# ══════════════════════════════════════════════════════════════════════════════
# FINANCIAL REPORTS (director + cashier)
# ══════════════════════════════════════════════════════════════════════════════


# ── Available payment periods ────────────────────────────────────────────────


@router.get("/finance/available-periods")
async def finance_available_periods(_: CashierGuard, db: DbSession) -> dict:
    """Return years/months that have payment activity (paid_at or due_date)."""
    q = select(
        extract("year", PaymentModel.due_date).label("y"),
        extract("month", PaymentModel.due_date).label("m"),
    ).where(PaymentModel.due_date != None)  # noqa: E711
    q = q.distinct().order_by("y", "m")
    rows = (await db.execute(q)).all()

    years = sorted(set(int(r.y) for r in rows))
    months_by_year: dict[int, list[int]] = {}
    for r in rows:
        y = int(r.y)
        months_by_year.setdefault(y, []).append(int(r.m))
    return {"years": years, "monthsByYear": months_by_year}


# ── 1. Income report — actual received money by month/direction ──────────────


@router.get("/finance/income")
async def finance_income(
    _: CashierGuard,
    db: DbSession,
    month: int = Query(default=None),
    year: int = Query(default=None),
) -> dict:
    """
    Income report: how much money was actually received.
    Groups by direction. Filters by paid_at month/year.
    """
    month = month or _now().month
    year = year or _now().year

    # All payments that were paid in the given month/year
    q = (
        select(
            DirectionModel.name.label("direction_name"),
            func.coalesce(func.sum(PaymentModel.paid_amount), 0).label("total"),
            func.count(PaymentModel.id).label("payment_count"),
        )
        .join(ContractModel, ContractModel.id == PaymentModel.contract_id, isouter=True)
        .join(DirectionModel, DirectionModel.id == ContractModel.direction_id, isouter=True)
        .where(
            PaymentModel.paid_at != None,  # noqa: E711
            extract("year", PaymentModel.paid_at) == year,
            extract("month", PaymentModel.paid_at) == month,
        )
        .group_by(DirectionModel.name)
        .order_by(func.sum(PaymentModel.paid_amount).desc())
    )
    rows = (await db.execute(q)).all()

    directions = []
    grand_total = 0.0
    for r in rows:
        amount = float(r.total or 0)
        grand_total += amount
        directions.append(
            {
                "directionName": r.direction_name or "Без направления",
                "amount": amount,
                "paymentCount": r.payment_count or 0,
            }
        )

    # Monthly trend for the year (all months)
    trend_q = (
        select(
            extract("month", PaymentModel.paid_at).label("m"),
            func.coalesce(func.sum(PaymentModel.paid_amount), 0).label("total"),
        )
        .where(
            PaymentModel.paid_at != None,  # noqa: E711
            extract("year", PaymentModel.paid_at) == year,
        )
        .group_by(extract("month", PaymentModel.paid_at))
        .order_by("m")
    )
    trend_rows = (await db.execute(trend_q)).all()
    monthly_trend = [{"month": int(r.m), "amount": float(r.total or 0)} for r in trend_rows]

    return {
        "month": month,
        "year": year,
        "grandTotal": grand_total,
        "byDirection": directions,
        "monthlyTrend": monthly_trend,
    }


# ── 2. Debtors report — students with overdue or unpaid payments ─────────────


@router.get("/finance/debtors")
async def finance_debtors(
    _: CashierGuard,
    db: DbSession,
    direction_id: UUID | None = Query(default=None, alias="directionId"),
) -> list[dict]:
    """
    List of students who have overdue payments or outstanding debt.
    Sorted by total debt descending.
    """
    today = date.today()

    # Auto-mark overdue
    from sqlalchemy import update

    await db.execute(
        update(PaymentModel)
        .where(PaymentModel.status == "pending", PaymentModel.due_date < today)
        .values(status="overdue")
    )

    # Students with non-paid payments (overdue or pending with partial)
    q = (
        select(
            StudentModel.id.label("student_id"),
            StudentModel.full_name,
            StudentModel.phone,
            StudentModel.student_code,
            func.sum(PaymentModel.amount - PaymentModel.paid_amount).label("total_debt"),
            func.count().filter(PaymentModel.status == "overdue").label("overdue_count"),
            func.min(PaymentModel.due_date).filter(PaymentModel.status == "overdue").label("oldest_overdue"),
        )
        .join(PaymentModel, PaymentModel.student_id == StudentModel.id)
        .where(PaymentModel.status.in_(["pending", "overdue"]))
    )

    if direction_id:
        q = q.join(ContractModel, ContractModel.id == PaymentModel.contract_id).where(
            ContractModel.direction_id == direction_id
        )

    q = q.group_by(StudentModel.id, StudentModel.full_name, StudentModel.phone, StudentModel.student_code)
    q = q.having(func.sum(PaymentModel.amount - PaymentModel.paid_amount) > 0)
    q = q.order_by(
        func.count().filter(PaymentModel.status == "overdue").desc(),
        func.sum(PaymentModel.amount - PaymentModel.paid_amount).desc(),
    )

    rows = (await db.execute(q)).all()

    result = []
    for r in rows:
        # Get contracts for this student
        contracts = (
            await db.execute(
                select(
                    ContractModel.contract_number,
                    DirectionModel.name.label("direction_name"),
                )
                .join(DirectionModel, DirectionModel.id == ContractModel.direction_id, isouter=True)
                .where(ContractModel.student_id == r.student_id, ContractModel.status == "active")
            )
        ).all()

        result.append(
            {
                "studentId": str(r.student_id),
                "fullName": r.full_name,
                "phone": r.phone,
                "studentCode": r.student_code,
                "totalDebt": float(r.total_debt or 0),
                "overdueCount": r.overdue_count or 0,
                "oldestOverdue": r.oldest_overdue.isoformat() if r.oldest_overdue else None,
                "contracts": [
                    {"contractNumber": c.contract_number, "directionName": c.direction_name} for c in contracts
                ],
            }
        )

    return result


# ── 3. Forecast — expected payments in upcoming months ───────────────────────


@router.get("/finance/forecast")
async def finance_forecast(
    _: CashierGuard,
    db: DbSession,
    months_ahead: int = Query(default=3, alias="monthsAhead", ge=1, le=12),
) -> dict:
    """
    Forecast of expected payments for the next N months.
    Shows pending payments grouped by month and direction.
    """
    today = date.today()
    from dateutil.relativedelta import relativedelta

    end_date = today + relativedelta(months=months_ahead)

    q = (
        select(
            extract("year", PaymentModel.due_date).label("y"),
            extract("month", PaymentModel.due_date).label("m"),
            DirectionModel.name.label("direction_name"),
            func.sum(PaymentModel.amount - PaymentModel.paid_amount).label("expected"),
            func.count(PaymentModel.id).label("payment_count"),
        )
        .join(ContractModel, ContractModel.id == PaymentModel.contract_id, isouter=True)
        .join(DirectionModel, DirectionModel.id == ContractModel.direction_id, isouter=True)
        .where(
            PaymentModel.status.in_(["pending", "overdue"]),
            PaymentModel.due_date >= today,
            PaymentModel.due_date < end_date,
        )
        .group_by("y", "m", DirectionModel.name)
        .order_by("y", "m")
    )
    rows = (await db.execute(q)).all()

    # Group by month
    from collections import defaultdict

    by_month: dict = defaultdict(lambda: {"directions": [], "total": 0.0, "count": 0})
    for r in rows:
        key = f"{int(r.y)}-{int(r.m):02d}"
        amount = float(r.expected or 0)
        by_month[key]["directions"].append(
            {
                "directionName": r.direction_name or "Без направления",
                "expected": amount,
                "paymentCount": r.payment_count or 0,
            }
        )
        by_month[key]["total"] += amount
        by_month[key]["count"] += r.payment_count or 0

    months_list = []
    grand_total = 0.0
    for key in sorted(by_month.keys()):
        data = by_month[key]
        y, m = key.split("-")
        grand_total += data["total"]
        months_list.append(
            {
                "month": int(m),
                "year": int(y),
                "period": key,
                "total": data["total"],
                "paymentCount": data["count"],
                "byDirection": data["directions"],
            }
        )

    # Also include current overdue total
    overdue_total = (
        await db.execute(
            select(func.coalesce(func.sum(PaymentModel.amount - PaymentModel.paid_amount), 0)).where(
                PaymentModel.status == "overdue"
            )
        )
    ).scalar() or 0

    return {
        "monthsAhead": months_ahead,
        "grandTotal": grand_total,
        "overdueTotal": float(overdue_total),
        "months": months_list,
    }


# ── 4. Contracts summary ────────────────────────────────────────────────────


@router.get("/finance/contracts-summary")
async def finance_contracts_summary(
    _: CashierGuard,
    db: DbSession,
    direction_id: UUID | None = Query(default=None, alias="directionId"),
) -> dict:
    """
    Summary of all contracts: counts, amounts, by direction, by payment type.
    """
    q = select(ContractModel)
    if direction_id:
        q = q.where(ContractModel.direction_id == direction_id)
    contracts = (await db.execute(q)).scalars().all()

    if not contracts:
        return {
            "totalContracts": 0,
            "activeContracts": 0,
            "totalContractValue": 0,
            "avgContractValue": 0,
            "byDirection": [],
            "byPaymentType": [],
            "byStatus": [],
        }

    # Direction map
    dir_ids = {c.direction_id for c in contracts if c.direction_id}
    dir_map: dict = {}
    if dir_ids:
        dirs = (await db.execute(select(DirectionModel).where(DirectionModel.id.in_(dir_ids)))).scalars().all()
        dir_map = {d.id: d.name for d in dirs}

    # Aggregate
    from collections import Counter, defaultdict

    status_counts = Counter(c.status for c in contracts)
    type_counts = Counter(c.payment_type for c in contracts)

    dir_stats: dict = defaultdict(lambda: {"count": 0, "totalValue": 0.0, "activeCount": 0})
    total_value = 0.0

    for c in contracts:
        # Contract total value = payment_amount * periods (from payments table)
        payment_total = (
            await db.execute(
                select(func.coalesce(func.sum(PaymentModel.amount), 0)).where(PaymentModel.contract_id == c.id)
            )
        ).scalar() or 0
        paid_total = (
            await db.execute(
                select(func.coalesce(func.sum(PaymentModel.paid_amount), 0)).where(PaymentModel.contract_id == c.id)
            )
        ).scalar() or 0

        cv = float(payment_total)
        total_value += cv

        dn = dir_map.get(c.direction_id, "Без направления")
        dir_stats[dn]["count"] += 1
        dir_stats[dn]["totalValue"] += cv
        dir_stats[dn]["paidValue"] = dir_stats[dn].get("paidValue", 0.0) + float(paid_total)
        if c.status == "active":
            dir_stats[dn]["activeCount"] += 1

    active_count = status_counts.get("active", 0)
    total_count = len(contracts)

    PAYMENT_TYPE_LABELS = {
        "monthly": "Ежемесячная",
        "quarterly": "Квартальная",
        "semiannual": "Полугодовая",
        "annual": "Годовая",
    }

    return {
        "totalContracts": total_count,
        "activeContracts": active_count,
        "totalContractValue": total_value,
        "avgContractValue": round(total_value / total_count, 2) if total_count else 0,
        "byDirection": [
            {
                "directionName": dn,
                "count": stats["count"],
                "activeCount": stats["activeCount"],
                "totalValue": stats["totalValue"],
                "paidValue": stats.get("paidValue", 0.0),
            }
            for dn, stats in sorted(dir_stats.items(), key=lambda x: x[1]["totalValue"], reverse=True)
        ],
        "byPaymentType": [
            {"type": t, "label": PAYMENT_TYPE_LABELS.get(t, t), "count": c} for t, c in type_counts.most_common()
        ],
        "byStatus": [{"status": s, "count": c} for s, c in status_counts.most_common()],
    }


# ── 5. Dashboard finance widget ─────────────────────────────────────────────


@router.get("/finance/dashboard-stats")
async def finance_dashboard_stats(_: CashierGuard, db: DbSession) -> dict:
    """
    Lightweight stats for the dashboard cards.
    Returns income this month, today's income, debtor count,
    overdue total, and expected this month.
    """
    today = date.today()
    month_start = today.replace(day=1)

    # Auto-mark overdue
    from sqlalchemy import update as sa_update

    await db.execute(
        sa_update(PaymentModel)
        .where(PaymentModel.status == "pending", PaymentModel.due_date < today)
        .values(status="overdue")
    )

    # 1. Income this month (paid_at in current month)
    income_month = (
        await db.execute(
            select(func.coalesce(func.sum(PaymentModel.paid_amount), 0)).where(
                PaymentModel.paid_at != None,  # noqa: E711
                extract("year", PaymentModel.paid_at) == today.year,
                extract("month", PaymentModel.paid_at) == today.month,
            )
        )
    ).scalar() or 0

    # 2. Income today
    income_today = (
        await db.execute(
            select(func.coalesce(func.sum(PaymentModel.paid_amount), 0)).where(
                PaymentModel.paid_at != None,  # noqa: E711
                func.date(PaymentModel.paid_at) == today,
            )
        )
    ).scalar() or 0

    # 3. Debtor count (distinct students with overdue payments)
    debtor_count = (
        await db.execute(
            select(func.count(func.distinct(PaymentModel.student_id))).where(PaymentModel.status == "overdue")
        )
    ).scalar() or 0

    # 4. Total overdue amount
    overdue_total = (
        await db.execute(
            select(func.coalesce(func.sum(PaymentModel.amount - PaymentModel.paid_amount), 0)).where(
                PaymentModel.status == "overdue"
            )
        )
    ).scalar() or 0

    # 5. Expected this month (pending payments with due_date in current month)
    from dateutil.relativedelta import relativedelta

    next_month = month_start + relativedelta(months=1)
    expected_month = (
        await db.execute(
            select(func.coalesce(func.sum(PaymentModel.amount - PaymentModel.paid_amount), 0)).where(
                PaymentModel.status.in_(["pending"]),
                PaymentModel.due_date >= month_start,
                PaymentModel.due_date < next_month,
            )
        )
    ).scalar() or 0

    return {
        "incomeMonth": float(income_month),
        "incomeToday": float(income_today),
        "debtorCount": int(debtor_count),
        "overdueTotal": float(overdue_total),
        "expectedMonth": float(expected_month),
    }
