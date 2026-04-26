"""Payments API — contract-based payment flow with schedule & partial payments."""
from __future__ import annotations

from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import func, select, update

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import PaymentModel, StudentModel, DirectionModel
from src.infrastructure.persistence.models.crm import ContractModel
from src.infrastructure.persistence.models.auth import UserModel

router = APIRouter(prefix="/payments", tags=["LMS - Payments"])

CashierGuard = Annotated[object, Depends(require_roles("director", "cashier"))]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ── Schemas ─────────────────────────────────────────────────────────────────

class PaymentOut(CamelModel):
    id: UUID
    student_id: UUID
    student_name: str | None = None
    contract_id: UUID | None = None
    contract_number: str | None = None
    direction_name: str | None = None
    amount: float
    paid_amount: float = 0
    currency: str = "UZS"
    status: str
    description: str | None = None
    due_date: str | None = None
    paid_at: str | None = None
    method: str | None = None
    period_number: int | None = None
    created_at: str | None = None


class PaymentIn(CamelModel):
    student_id: UUID
    contract_id: UUID | None = None
    amount: float
    currency: str = "UZS"
    description: str | None = None
    due_date: str | None = None
    method: str | None = None


class PayIn(CamelModel):
    amount: float
    method: str = "cash"
    description: str | None = None


class PagedPayments(CamelModel):
    data: list[PaymentOut]
    total: int
    page: int


class ContractBalance(CamelModel):
    contract_id: UUID
    contract_number: str | None = None
    direction_name: str | None = None
    payment_type: str
    payment_amount: float
    total_expected: float
    total_paid: float
    remaining: float
    total_periods: int
    paid_periods: int
    overdue_periods: int
    next_payment: PaymentOut | None = None
    status: str  # "ok", "has_debt", "overdue"


class StudentFinanceSummary(CamelModel):
    student_id: UUID
    student_name: str
    total_debt: float
    total_paid: float
    overdue_count: int
    contracts: list[ContractBalance]


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _enrich(m: PaymentModel, db) -> PaymentOut:
    student_name = None
    contract_number = None
    direction_name = None

    student = (await db.execute(select(StudentModel.full_name).where(StudentModel.id == m.student_id))).scalar()
    student_name = student

    if m.contract_id:
        contract = (await db.execute(select(ContractModel).where(ContractModel.id == m.contract_id))).scalar_one_or_none()
        if contract:
            contract_number = contract.contract_number
            if contract.direction_id:
                dn = (await db.execute(select(DirectionModel.name).where(DirectionModel.id == contract.direction_id))).scalar()
                direction_name = dn

    return PaymentOut(
        id=m.id, student_id=m.student_id, student_name=student_name,
        contract_id=m.contract_id, contract_number=contract_number,
        direction_name=direction_name,
        amount=float(m.amount), paid_amount=float(m.paid_amount or 0),
        currency=m.currency, status=m.status,
        description=m.description,
        due_date=m.due_date.isoformat() if m.due_date else None,
        paid_at=m.paid_at.isoformat() if m.paid_at else None,
        method=m.method,
        period_number=m.period_number,
        created_at=m.created_at.isoformat() if m.created_at else None,
    )


async def _auto_mark_overdue(db, student_id: UUID | None = None) -> None:
    """Mark pending payments past due_date as overdue."""
    today = date.today()
    q = (
        update(PaymentModel)
        .where(
            PaymentModel.status == "pending",
            PaymentModel.due_date < today,
        )
        .values(status="overdue")
    )
    if student_id:
        q = q.where(PaymentModel.student_id == student_id)
    await db.execute(q)


# ── Search students ──────────────────────────────────────────────────────────

@router.get("/search-students")
async def search_students(
    _: CashierGuard, db: DbSession,
    q: str = Query("", alias="q"),
) -> list[dict]:
    if len(q) < 2:
        return []
    rows = (await db.execute(
        select(StudentModel)
        .where(
            StudentModel.full_name.ilike(f"%{q}%")
            | StudentModel.phone.ilike(f"%{q}%")
            | StudentModel.student_code.ilike(f"%{q}%")
        )
        .order_by(StudentModel.full_name).limit(10)
    )).scalars().all()
    return [{"id": str(s.id), "fullName": s.full_name, "phone": s.phone, "studentCode": s.student_code} for s in rows]


# ── Student contracts with balance ──────────────────────────────────────────

@router.get("/student-contracts/{student_id}")
async def student_contracts(student_id: UUID, _: CashierGuard, db: DbSession) -> list[dict]:
    await _auto_mark_overdue(db, student_id)

    rows = (await db.execute(
        select(ContractModel).where(ContractModel.student_id == student_id)
        .order_by(ContractModel.created_at.desc())
    )).scalars().all()

    dir_ids = {c.direction_id for c in rows if c.direction_id}
    dir_map: dict = {}
    if dir_ids:
        dirs = (await db.execute(select(DirectionModel).where(DirectionModel.id.in_(dir_ids)))).scalars().all()
        dir_map = {d.id: d.name for d in dirs}

    result = []
    for c in rows:
        paid_total = (await db.execute(
            select(func.coalesce(func.sum(PaymentModel.paid_amount), 0))
            .where(PaymentModel.contract_id == c.id)
        )).scalar() or 0

        total_expected = (await db.execute(
            select(func.coalesce(func.sum(PaymentModel.amount), 0))
            .where(PaymentModel.contract_id == c.id)
        )).scalar() or 0

        overdue_count = (await db.execute(
            select(func.count())
            .where(PaymentModel.contract_id == c.id, PaymentModel.status == "overdue")
        )).scalar() or 0

        result.append({
            "id": str(c.id),
            "contractNumber": c.contract_number,
            "directionName": dir_map.get(c.direction_id),
            "paymentType": c.payment_type,
            "paymentAmount": float(c.payment_amount) if c.payment_amount else 0,
            "currency": c.currency,
            "status": c.status,
            "startDate": str(c.start_date) if c.start_date else None,
            "paidTotal": float(paid_total),
            "totalExpected": float(total_expected),
            "remaining": float(total_expected) - float(paid_total),
            "overdueCount": overdue_count,
        })
    return result


# ── Payment schedule for a contract ─────────────────────────────────────────

@router.get("/schedule/{contract_id}", response_model=list[PaymentOut])
async def payment_schedule(contract_id: UUID, _: CashierGuard, db: DbSession) -> list[PaymentOut]:
    await _auto_mark_overdue(db)

    rows = (await db.execute(
        select(PaymentModel)
        .where(PaymentModel.contract_id == contract_id)
        .order_by(PaymentModel.period_number, PaymentModel.due_date)
    )).scalars().all()

    return [await _enrich(m, db) for m in rows]


# ── Contract balance ────────────────────────────────────────────────────────

@router.get("/contract-balance/{contract_id}", response_model=ContractBalance)
async def contract_balance(contract_id: UUID, _: CashierGuard, db: DbSession) -> ContractBalance:
    await _auto_mark_overdue(db)

    contract = (await db.execute(select(ContractModel).where(ContractModel.id == contract_id))).scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    direction_name = None
    if contract.direction_id:
        direction_name = (await db.execute(
            select(DirectionModel.name).where(DirectionModel.id == contract.direction_id)
        )).scalar()

    payments = (await db.execute(
        select(PaymentModel).where(PaymentModel.contract_id == contract_id)
        .order_by(PaymentModel.period_number)
    )).scalars().all()

    total_expected = sum(float(p.amount) for p in payments)
    total_paid = sum(float(p.paid_amount or 0) for p in payments)
    paid_periods = sum(1 for p in payments if p.status == "paid")
    overdue_periods = sum(1 for p in payments if p.status == "overdue")

    next_payment = None
    for p in payments:
        if p.status in ("pending", "overdue"):
            next_payment = await _enrich(p, db)
            break

    balance_status = "ok"
    if overdue_periods > 0:
        balance_status = "overdue"
    elif total_paid < total_expected:
        balance_status = "has_debt"

    return ContractBalance(
        contract_id=contract_id,
        contract_number=contract.contract_number,
        direction_name=direction_name,
        payment_type=contract.payment_type,
        payment_amount=float(contract.payment_amount or 0),
        total_expected=total_expected,
        total_paid=total_paid,
        remaining=total_expected - total_paid,
        total_periods=len(payments),
        paid_periods=paid_periods,
        overdue_periods=overdue_periods,
        next_payment=next_payment,
        status=balance_status,
    )


# ── Pay a scheduled payment (supports partial) ─────────────────────────────

@router.post("/{payment_id}/pay", response_model=PaymentOut)
async def pay_payment(payment_id: UUID, body: PayIn, _: CashierGuard, db: DbSession) -> PaymentOut:
    m = await db.get(PaymentModel, payment_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if m.status == "paid":
        raise HTTPException(status_code=400, detail="Already fully paid")

    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    new_paid = float(m.paid_amount or 0) + body.amount
    m.paid_amount = Decimal(str(new_paid))
    m.method = body.method
    if body.description:
        m.description = body.description

    if new_paid >= float(m.amount):
        m.status = "paid"
        m.paid_at = datetime.now(timezone.utc)
    else:
        # Partial payment — keep pending/overdue but update paid_amount
        pass

    await db.commit()
    await db.refresh(m)
    return await _enrich(m, db)


# ── Create manual payment (for ad-hoc payments not in schedule) ─────────────

@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
async def create_payment(body: PaymentIn, _: CashierGuard, current_user: CurrentUser, db: DbSession) -> PaymentOut:
    due = None
    if body.due_date:
        try:
            due = date.fromisoformat(body.due_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid due_date")

    is_immediate = body.method is not None

    m = PaymentModel(
        id=uuid4(),
        student_id=body.student_id,
        contract_id=body.contract_id,
        amount=body.amount,
        currency=body.currency,
        description=body.description,
        status="paid" if is_immediate else "pending",
        due_date=due or date.today(),
        paid_at=datetime.now(timezone.utc) if is_immediate else None,
        paid_amount=Decimal(str(body.amount)) if is_immediate else Decimal("0"),
        method=body.method,
        created_by=current_user.id,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return await _enrich(m, db)


# ── List payments ───────────────────────────────────────────────────────────

@router.get("", response_model=PagedPayments)
async def list_payments(
    _: CashierGuard, db: DbSession,
    student_id: UUID | None = Query(None, alias="studentId"),
    contract_id: UUID | None = Query(None, alias="contractId"),
    payment_status: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PagedPayments:
    if student_id:
        await _auto_mark_overdue(db, student_id)

    q = select(PaymentModel)
    if student_id:
        q = q.where(PaymentModel.student_id == student_id)
    if contract_id:
        q = q.where(PaymentModel.contract_id == contract_id)
    if payment_status:
        q = q.where(PaymentModel.status == payment_status)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    rows = (await db.execute(
        q.order_by(PaymentModel.due_date.asc().nullslast(), PaymentModel.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    data = [await _enrich(m, db) for m in rows]
    return PagedPayments(data=data, total=total, page=page)


# ── Mark paid (legacy, kept for backward compat) ───────────────────────────

@router.post("/{payment_id}/mark-paid", response_model=PaymentOut)
async def mark_paid(payment_id: UUID, body: dict, _: CashierGuard, db: DbSession) -> PaymentOut:
    m = await db.get(PaymentModel, payment_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if m.status == "paid":
        raise HTTPException(status_code=400, detail="Already paid")

    m.status = "paid"
    m.method = body.get("method", "cash")
    m.paid_at = datetime.now(timezone.utc)
    m.paid_amount = m.amount
    await db.commit()
    await db.refresh(m)
    return await _enrich(m, db)


# ── Finance summary for a student ──────────────────────────────────────────

@router.get("/student-summary/{student_id}", response_model=StudentFinanceSummary)
async def student_finance_summary(student_id: UUID, _: CashierGuard, db: DbSession) -> StudentFinanceSummary:
    await _auto_mark_overdue(db, student_id)

    student = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    contracts = (await db.execute(
        select(ContractModel).where(ContractModel.student_id == student_id)
        .order_by(ContractModel.created_at.desc())
    )).scalars().all()

    total_debt = 0.0
    total_paid = 0.0
    overdue_count = 0
    contract_balances = []

    for c in contracts:
        payments = (await db.execute(
            select(PaymentModel).where(PaymentModel.contract_id == c.id)
            .order_by(PaymentModel.period_number)
        )).scalars().all()

        c_expected = sum(float(p.amount) for p in payments)
        c_paid = sum(float(p.paid_amount or 0) for p in payments)
        c_paid_periods = sum(1 for p in payments if p.status == "paid")
        c_overdue = sum(1 for p in payments if p.status == "overdue")

        direction_name = None
        if c.direction_id:
            direction_name = (await db.execute(
                select(DirectionModel.name).where(DirectionModel.id == c.direction_id)
            )).scalar()

        next_payment = None
        for p in payments:
            if p.status in ("pending", "overdue"):
                next_payment = await _enrich(p, db)
                break

        bal_status = "ok"
        if c_overdue > 0:
            bal_status = "overdue"
        elif c_paid < c_expected:
            bal_status = "has_debt"

        contract_balances.append(ContractBalance(
            contract_id=c.id,
            contract_number=c.contract_number,
            direction_name=direction_name,
            payment_type=c.payment_type,
            payment_amount=float(c.payment_amount or 0),
            total_expected=c_expected,
            total_paid=c_paid,
            remaining=c_expected - c_paid,
            total_periods=len(payments),
            paid_periods=c_paid_periods,
            overdue_periods=c_overdue,
            next_payment=next_payment,
            status=bal_status,
        ))

        total_debt += (c_expected - c_paid)
        total_paid += c_paid
        overdue_count += c_overdue

    return StudentFinanceSummary(
        student_id=student_id,
        student_name=student.full_name,
        total_debt=total_debt,
        total_paid=total_paid,
        overdue_count=overdue_count,
        contracts=contract_balances,
    )
