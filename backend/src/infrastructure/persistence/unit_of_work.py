"""Unit of Work — wraps a single AsyncSession and provides all repositories."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from src.infrastructure.persistence.repositories.lms.student_repository import SqlStudentRepository
from src.infrastructure.persistence.repositories.lms.lesson_repository import SqlLessonRepository
from src.infrastructure.persistence.repositories.lms.group_repository import SqlGroupRepository
from src.infrastructure.persistence.repositories.lms.payment_repository import SqlPaymentRepository
from src.infrastructure.persistence.repositories.crm.lead_repository import SqlLeadRepository
from src.infrastructure.persistence.repositories.crm.funnel_repository import SqlFunnelRepository, SqlStageRepository
from src.infrastructure.persistence.repositories.crm.task_repository import SqlCrmTaskRepository


class UnitOfWork:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self.users = SqlUserRepository(session)
        self.students = SqlStudentRepository(session)
        self.lessons = SqlLessonRepository(session)
        self.groups = SqlGroupRepository(session)
        self.payments = SqlPaymentRepository(session)
        self.leads = SqlLeadRepository(session)
        self.funnels = SqlFunnelRepository(session)
        self.stages = SqlStageRepository(session)
        self.crm_tasks = SqlCrmTaskRepository(session)

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
