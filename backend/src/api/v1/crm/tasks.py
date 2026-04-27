"""CRM Tasks router."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.application.crm.leads.use_cases import GetLeadUseCase  # noqa: F401 (for context)
from src.domain.crm.entities import CrmTask, TaskPriority, TaskStatus
from src.infrastructure.persistence.repositories.crm.task_repository import SqlCrmTaskRepository

router = APIRouter(prefix="/crm/tasks", tags=["CRM - Tasks"])

CrmGuard = Annotated[object, Depends(require_roles("director", "sales_manager"))]


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    linkedLeadId: UUID | None
    assignedTo: UUID | None
    dueDate: str
    priority: str
    status: str
    reminderAt: str | None
    isAutoCreated: bool

    @classmethod
    def from_domain(cls, t: CrmTask) -> TaskResponse:
        due = t.due_date if isinstance(t.due_date, str) else str(t.due_date)
        return cls(
            id=t.id,
            title=t.title,
            description=t.description,
            linkedLeadId=t.linked_lead_id,
            assignedTo=t.assigned_to,
            dueDate=due,
            priority=t.priority.value,
            status=t.status.value,
            reminderAt=str(t.reminder_at) if t.reminder_at else None,
            isAutoCreated=t.is_auto_created,
        )


class PagedTasks(BaseModel):
    items: list[TaskResponse]
    total: int
    page: int
    pages: int


class CreateTaskRequest(BaseModel):
    title: str
    description: str | None = None
    linkedLeadId: UUID | None = None
    linked_lead_id: UUID | None = None
    assignedTo: UUID | None = None
    assigned_to: UUID | None = None
    dueDate: str | None = None
    due_date: str | None = None
    priority: str = "medium"
    reminderAt: str | None = None

    def resolved_assigned_to(self) -> UUID:
        v = self.assignedTo or self.assigned_to
        if v is None:
            raise ValueError("assignedTo is required")
        return v

    def resolved_due_date(self) -> str:
        return self.dueDate or self.due_date or ""

    def resolved_lead_id(self) -> UUID | None:
        return self.linkedLeadId or self.linked_lead_id


class UpdateTaskRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    dueDate: str | None = None
    priority: str | None = None
    assignedTo: UUID | None = None
    reminderAt: str | None = None


class UpdateTaskStatusRequest(BaseModel):
    status: str


class MoveTaskRequest(BaseModel):
    status: str


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: CreateTaskRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> TaskResponse:
    from uuid import uuid4

    try:
        priority = TaskPriority(body.priority)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid priority: {body.priority}")

    try:
        assigned_to = body.resolved_assigned_to()
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    task = CrmTask(
        id=uuid4(),
        title=body.title,
        description=body.description,
        linked_lead_id=body.resolved_lead_id(),
        assigned_to=assigned_to,
        due_date=body.resolved_due_date(),
        priority=priority,
        reminder_at=body.reminderAt,
    )
    repo = SqlCrmTaskRepository(db)
    await repo.save(task)
    await db.commit()
    return TaskResponse.from_domain(task)


@router.get("", response_model=PagedTasks)
async def list_tasks(
    current_user: CurrentUser,
    db: DbSession,
    assigned_to: UUID | None = None,
    lead_id: UUID | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PagedTasks:
    repo = SqlCrmTaskRepository(db)
    result = await repo.list(
        assigned_to=assigned_to,
        lead_id=lead_id,
        status=status,
        page=page,
        page_size=page_size,
    )
    return PagedTasks(
        items=[TaskResponse.from_domain(t) for t in result.items],
        total=result.total,
        page=result.page,
        pages=result.pages,
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: UUID, current_user: CurrentUser, db: DbSession) -> TaskResponse:
    repo = SqlCrmTaskRepository(db)
    task = await repo.get_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse.from_domain(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: UUID, body: UpdateTaskRequest, current_user: CurrentUser, db: DbSession) -> TaskResponse:
    repo = SqlCrmTaskRepository(db)
    task = await repo.get_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if body.title is not None:
        task.title = body.title
    if body.description is not None:
        task.description = body.description
    if body.dueDate is not None:
        task.due_date = body.dueDate
    if body.priority is not None:
        try:
            task.priority = TaskPriority(body.priority)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid priority: {body.priority}")
    if body.assignedTo is not None:
        task.assigned_to = body.assignedTo
    if body.reminderAt is not None:
        task.reminder_at = body.reminderAt
    await repo.save(task)
    await db.commit()
    return TaskResponse.from_domain(task)


@router.delete("/{task_id}")
async def delete_task(task_id: UUID, current_user: CurrentUser, db: DbSession) -> Response:
    repo = SqlCrmTaskRepository(db)
    task = await repo.get_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    from sqlalchemy import select as sa_select

    from src.infrastructure.persistence.models.crm import CrmTaskModel

    result = await db.execute(sa_select(CrmTaskModel).where(CrmTaskModel.id == task_id))
    model = result.scalar_one_or_none()
    if model:
        await db.delete(model)
        await db.commit()
    return Response(status_code=204)


@router.post("/{task_id}/move", response_model=TaskResponse)
async def move_task(task_id: UUID, body: MoveTaskRequest, current_user: CurrentUser, db: DbSession) -> TaskResponse:
    repo = SqlCrmTaskRepository(db)
    task = await repo.get_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        task.move(TaskStatus(body.status))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await repo.save(task)
    await db.commit()
    return TaskResponse.from_domain(task)


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: UUID,
    body: UpdateTaskStatusRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> TaskResponse:
    repo = SqlCrmTaskRepository(db)
    task = await repo.get_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        task.move(TaskStatus(body.status))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await repo.save(task)
    await db.commit()
    return TaskResponse.from_domain(task)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(task_id: UUID, current_user: CurrentUser, db: DbSession) -> TaskResponse:
    repo = SqlCrmTaskRepository(db)
    task = await repo.get_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    task.complete()
    await repo.save(task)
    await db.commit()
    return TaskResponse.from_domain(task)
