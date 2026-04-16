"""LMS MUP Tasks — tasks created by MUP (academic supervisor) role."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Response, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import MupTaskModel

router = APIRouter(prefix="/lms/tasks", tags=["LMS - MUP Tasks"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup"))]


class MupTaskOut(BaseModel):
    id: UUID
    title: str
    description: str | None
    assignedTo: UUID | None
    createdBy: UUID | None
    dueDate: str | None
    status: str
    isDone: bool
    createdAt: str | None


class CreateMupTaskRequest(BaseModel):
    title: str
    description: str | None = None
    assignedTo: UUID | None = None
    assigned_to: UUID | None = None
    dueDate: str | None = None
    due_date: str | None = None

    def resolved_assigned_to(self) -> UUID | None:
        return self.assignedTo or self.assigned_to

    def resolved_due_date(self) -> str | None:
        return self.dueDate or self.due_date


class UpdateMupTaskRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    assignedTo: UUID | None = None
    dueDate: str | None = None


class MoveTaskRequest(BaseModel):
    status: str


def _task_out(t: MupTaskModel) -> MupTaskOut:
    return MupTaskOut(
        id=t.id,
        title=t.title,
        description=t.description,
        assignedTo=t.assigned_to,
        createdBy=t.created_by,
        dueDate=t.due_date.isoformat() if t.due_date else None,
        status=t.status,
        isDone=t.is_done,
        createdAt=t.created_at.isoformat() if t.created_at else None,
    )


@router.get("", response_model=list[MupTaskOut])
async def list_tasks(
    current_user: CurrentUser,
    db: DbSession,
    assignedTo: UUID | None = None,
    assigned_to: UUID | None = None,
    task_status: str | None = Query(None, alias="status"),
) -> list[MupTaskOut]:
    q = select(MupTaskModel)
    target = assignedTo or assigned_to
    if target:
        q = q.where(MupTaskModel.assigned_to == target)
    if task_status:
        q = q.where(MupTaskModel.status == task_status)
    q = q.order_by(MupTaskModel.created_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [_task_out(t) for t in rows]


@router.post("", response_model=MupTaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(body: CreateMupTaskRequest, current_user: CurrentUser, db: DbSession) -> MupTaskOut:
    due_date_str = body.resolved_due_date()
    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str)
        except ValueError:
            pass

    t = MupTaskModel(
        id=uuid4(),
        title=body.title,
        description=body.description,
        assigned_to=body.resolved_assigned_to(),
        created_by=current_user.id,
        due_date=due_date,
        status="pending",
        is_done=False,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return _task_out(t)


@router.get("/{task_id}", response_model=MupTaskOut)
async def get_task(task_id: UUID, current_user: CurrentUser, db: DbSession) -> MupTaskOut:
    result = await db.execute(select(MupTaskModel).where(MupTaskModel.id == task_id))
    t = result.scalar_one_or_none()
    if t is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_out(t)


@router.patch("/{task_id}", response_model=MupTaskOut)
async def update_task(task_id: UUID, body: UpdateMupTaskRequest, current_user: CurrentUser, db: DbSession) -> MupTaskOut:
    result = await db.execute(select(MupTaskModel).where(MupTaskModel.id == task_id))
    t = result.scalar_one_or_none()
    if t is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if body.title is not None:
        t.title = body.title
    if body.description is not None:
        t.description = body.description
    if body.assignedTo is not None:
        t.assigned_to = body.assignedTo
    if body.dueDate is not None:
        try:
            t.due_date = datetime.fromisoformat(body.dueDate)
        except ValueError:
            pass
    await db.commit()
    await db.refresh(t)
    return _task_out(t)


@router.post("/{task_id}/move", response_model=MupTaskOut)
async def move_task(task_id: UUID, body: MoveTaskRequest, current_user: CurrentUser, db: DbSession) -> MupTaskOut:
    result = await db.execute(select(MupTaskModel).where(MupTaskModel.id == task_id))
    t = result.scalar_one_or_none()
    if t is None:
        raise HTTPException(status_code=404, detail="Task not found")
    valid_statuses = {"pending", "in_progress", "done", "overdue"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
    t.status = body.status
    await db.commit()
    await db.refresh(t)
    return _task_out(t)


@router.delete("/{task_id}")
async def delete_task(task_id: UUID, _: StaffGuard, db: DbSession) -> Response:
    result = await db.execute(select(MupTaskModel).where(MupTaskModel.id == task_id))
    t = result.scalar_one_or_none()
    if t is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(t)
    await db.commit()
    return Response(status_code=204)
