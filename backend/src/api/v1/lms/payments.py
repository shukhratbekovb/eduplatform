"""Payments CRUD API."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select

from src.api.dependencies import CurrentUser, DbSession, require_roles

router = APIRouter(prefix="/payments", tags=["LMS - Payments"])

CashierGuard = Annotated[object, Depends(require_roles("director", "cashier"))]


class PaymentOut(BaseModel):
    id: UUID
    student_id: UUID
    group_id: UUID | None
    amount: float
    currency: str
    status: str
    due_date: str
    paid_at: str | None
    method: str | None


class PaymentIn(BaseModel):
    student_id: UUID
    group_id: UUID | None = None
    amount: float
    currency: str = "UZS"
    due_date: str


class MarkPaidRequest(BaseModel):
    method: str
    paid_at: str | None = None
    receipt_url: str | None = None


class PagedPayments(BaseModel):
    items: list[PaymentOut]
    total: int
    page: int
    pages: int


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
async def create_payment(
    body: PaymentIn,
    _: CashierGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> PaymentOut:
    from src.infrastructure.persistence.models.lms import PaymentModel
    from datetime import date

    try:
        due = date.fromisoformat(body.due_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid due_date format (use YYYY-MM-DD)")

    m = PaymentModel(
        id=uuid4(),
        student_id=body.student_id,
        group_id=body.group_id,
        amount=body.amount,
        currency=body.currency,
        status="pending",
        due_date=due,
        created_by=current_user.id,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return _out(m)


@router.get("", response_model=PagedPayments)
async def list_payments(
    _: CashierGuard,
    db: DbSession,
    student_id: UUID | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PagedPayments:
    from src.infrastructure.persistence.models.lms import PaymentModel
    from sqlalchemy import select, func

    q = select(PaymentModel)
    if student_id:
        q = q.where(PaymentModel.student_id == student_id)
    if status:
        q = q.where(PaymentModel.status == status)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    q = q.order_by(PaymentModel.due_date).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()

    return PagedPayments(
        items=[_out(r) for r in rows],
        total=total,
        page=page,
        pages=(total + page_size - 1) // page_size,
    )


@router.get("/{payment_id}", response_model=PaymentOut)
async def get_payment(payment_id: UUID, _: CashierGuard, db: DbSession) -> PaymentOut:
    from src.infrastructure.persistence.models.lms import PaymentModel
    m = await db.get(PaymentModel, payment_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return _out(m)


@router.post("/{payment_id}/mark-paid", response_model=PaymentOut)
async def mark_paid(
    payment_id: UUID,
    body: MarkPaidRequest,
    _: CashierGuard,
    db: DbSession,
) -> PaymentOut:
    from src.infrastructure.persistence.models.lms import PaymentModel

    m = await db.get(PaymentModel, payment_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if m.status == "paid":
        raise HTTPException(status_code=400, detail="Payment already marked as paid")

    m.status = "paid"
    m.method = body.method
    m.receipt_url = body.receipt_url
    if body.paid_at:
        try:
            m.paid_at = datetime.fromisoformat(body.paid_at)
        except ValueError:
            m.paid_at = datetime.now(timezone.utc)
    else:
        m.paid_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(m)
    return _out(m)


def _out(m) -> PaymentOut:  # type: ignore[no-untyped-def]
    return PaymentOut(
        id=m.id,
        student_id=m.student_id,
        group_id=m.group_id,
        amount=float(m.amount),
        currency=m.currency,
        status=m.status,
        due_date=m.due_date.isoformat() if m.due_date else "",
        paid_at=m.paid_at.isoformat() if m.paid_at else None,
        method=m.method,
    )
