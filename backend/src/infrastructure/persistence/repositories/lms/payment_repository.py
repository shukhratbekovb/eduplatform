from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.interfaces.repositories import Page, PaymentRepository
from src.domain.lms.entities import Payment, PaymentStatus
from src.domain.shared.value_objects import Money
from src.infrastructure.persistence.models.lms import PaymentModel


def _to_domain(m: PaymentModel) -> Payment:
    return Payment(
        id=m.id,
        student_id=m.student_id,
        amount=Money(Decimal(str(m.amount)), m.currency),
        status=PaymentStatus(m.status),
        due_date=m.due_date,
        period=str(m.due_date) if m.due_date else "",
    )


def _apply_fields(m: PaymentModel, p: Payment) -> None:
    m.student_id = p.student_id
    m.amount = p.amount.amount
    m.currency = p.amount.currency
    m.status = p.status.value
    m.due_date = p.due_date


class SqlPaymentRepository(PaymentRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get_by_id(self, payment_id: UUID) -> Payment | None:
        m = await self._s.get(PaymentModel, payment_id)
        return _to_domain(m) if m else None

    async def save(self, payment: Payment) -> None:
        existing = await self._s.get(PaymentModel, payment.id)
        if existing is None:
            m = PaymentModel(id=payment.id)
            _apply_fields(m, payment)
            self._s.add(m)
        else:
            _apply_fields(existing, payment)

    async def list(
        self,
        *,
        student_id: UUID | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Payment]:
        q = select(PaymentModel)
        if student_id is not None:
            q = q.where(PaymentModel.student_id == student_id)
        if status is not None:
            q = q.where(PaymentModel.status == status)

        total = (await self._s.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        q = q.order_by(PaymentModel.due_date).offset((page - 1) * page_size).limit(page_size)
        rows = (await self._s.execute(q)).scalars().all()
        return Page(items=[_to_domain(r) for r in rows], total=total, page=page, page_size=page_size)
