"""CRUD-эндпоинты для задач МУП (менеджера учебного процесса).

Предоставляет REST API для управления задачами академического руководителя,
включая автоматически сгенерированные задачи (по посещаемости, домашкам и т.д.)
и вручную созданные.

Задачи могут быть связаны со студентами (student_id) и категоризированы
(category) для фильтрации. Поддерживается перемещение между статусами
через Kanban-интерфейс.

Статусы задач:
    - pending: ожидает выполнения.
    - in_progress: в работе.
    - done: выполнена.
    - overdue: просрочена.

Приоритеты: low, medium, high.

Доступ:
    - Создание/просмотр: все авторизованные пользователи.
    - Удаление: только директор и МУП (StaffGuard).

Роуты:
    GET /lms/tasks — список задач с фильтрацией.
    POST /lms/tasks — создание задачи.
    GET /lms/tasks/{id} — получение задачи.
    PATCH /lms/tasks/{id} — обновление задачи.
    POST /lms/tasks/{id}/move — перемещение задачи (смена статуса).
    DELETE /lms/tasks/{id} — удаление задачи (директор/МУП).
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.lms import MupTaskModel, StudentModel

router = APIRouter(prefix="/lms/tasks", tags=["LMS - MUP Tasks"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup"))]
"""Гвард: доступ только для директора и МУП."""


class MupTaskOut(BaseModel):
    """Ответ с данными задачи МУП.

    Attributes:
        id: UUID задачи.
        title: Заголовок задачи.
        description: Описание задачи.
        assignedTo: UUID назначенного пользователя.
        createdBy: UUID создателя задачи.
        dueDate: Дата выполнения (ISO формат).
        status: Статус (pending, in_progress, done, overdue).
        priority: Приоритет (low, medium, high).
        isDone: Флаг завершённости.
        studentId: UUID связанного студента (для автозадач).
        studentName: ФИО связанного студента (для отображения).
        category: Категория задачи (для автозадач).
        createdAt: Дата создания (ISO формат).
    """

    id: UUID
    title: str
    description: str | None
    assignedTo: UUID | None
    createdBy: UUID | None
    dueDate: str | None
    status: str
    priority: str
    isDone: bool
    studentId: UUID | None
    studentName: str | None
    category: str | None
    createdAt: str | None


class CreateMupTaskRequest(BaseModel):
    """Запрос на создание задачи МУП.

    Поддерживает оба формата именования (camelCase и snake_case)
    для совместимости с разными клиентами.

    Attributes:
        title: Заголовок задачи (обязательно).
        description: Описание (опционально).
        assignedTo: UUID назначенного (camelCase).
        assigned_to: UUID назначенного (snake_case alias).
        dueDate: Дата выполнения (camelCase).
        due_date: Дата выполнения (snake_case alias).
        priority: Приоритет (по умолчанию "medium").
        studentId: UUID связанного студента (опционально).
    """

    title: str
    description: str | None = None
    assignedTo: UUID | None = None
    assigned_to: UUID | None = None
    dueDate: str | None = None
    due_date: str | None = None
    priority: str = "medium"
    studentId: UUID | None = None

    def resolved_assigned_to(self) -> UUID | None:
        """Возвращает UUID назначенного пользователя из любого формата поля.

        Returns:
            UUID | None: UUID из assignedTo или assigned_to (первый непустой).
        """
        return self.assignedTo or self.assigned_to

    def resolved_due_date(self) -> str | None:
        """Возвращает дату выполнения из любого формата поля.

        Returns:
            str | None: Строка даты из dueDate или due_date (первая непустая).
        """
        return self.dueDate or self.due_date


class UpdateMupTaskRequest(BaseModel):
    """Запрос на обновление задачи МУП.

    Все поля опциональны — обновляются только переданные.

    Attributes:
        title: Новый заголовок.
        description: Новое описание.
        assignedTo: Новый UUID назначенного.
        dueDate: Новая дата выполнения.
        priority: Новый приоритет.
    """

    title: str | None = None
    description: str | None = None
    assignedTo: UUID | None = None
    dueDate: str | None = None
    priority: str | None = None


class MoveTaskRequest(BaseModel):
    """Запрос на перемещение задачи (смена статуса).

    Attributes:
        status: Новый статус (pending, in_progress, done, overdue).
    """

    status: str


async def _task_out(t: MupTaskModel, db: object | None = None) -> MupTaskOut:
    """Преобразует ORM-модель MupTaskModel в ответ MupTaskOut.

    Дополнительно загружает имя студента, если задача связана со студентом.

    Args:
        t: ORM-модель задачи.
        db: Асинхронная сессия SQLAlchemy (для загрузки имени студента).

    Returns:
        MupTaskOut: Сериализованный ответ для API.
    """
    student_name = None
    if t.student_id and db:
        s = (
            await db.execute(  # type: ignore[union-attr]
                select(StudentModel.full_name).where(StudentModel.id == t.student_id)
            )
        ).scalar()
        student_name = s

    return MupTaskOut(
        id=t.id,
        title=t.title,
        description=t.description,
        assignedTo=t.assigned_to,
        createdBy=t.created_by,
        dueDate=t.due_date.isoformat() if t.due_date else None,
        status=t.status if hasattr(t, "status") and t.status else ("done" if t.is_done else "pending"),
        priority=t.priority if hasattr(t, "priority") and t.priority else "medium",
        isDone=t.is_done,
        studentId=t.student_id if hasattr(t, "student_id") else None,
        studentName=student_name,
        category=t.category if hasattr(t, "category") else None,
        createdAt=t.created_at.isoformat() if t.created_at else None,
    )


@router.get("", response_model=list[MupTaskOut])
async def list_tasks(
    current_user: CurrentUser,
    db: DbSession,
    assignedTo: UUID | None = None,
    assigned_to: UUID | None = None,
    task_status: str | None = Query(None, alias="status"),
    category: str | None = None,
) -> list[MupTaskOut]:
    """Получение списка задач МУП с фильтрацией.

    Поддерживает фильтры: по назначенному пользователю, статусу и категории.
    Сортировка по дате создания (сначала новые).

    Args:
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.
        assignedTo: Фильтр по UUID назначенного (camelCase).
        assigned_to: Фильтр по UUID назначенного (snake_case).
        task_status: Фильтр по статусу (alias: status).
        category: Фильтр по категории.

    Returns:
        list[MupTaskOut]: Список задач.
    """
    q = select(MupTaskModel)
    target = assignedTo or assigned_to
    if target:
        q = q.where(MupTaskModel.assigned_to == target)
    if task_status:
        q = q.where(MupTaskModel.status == task_status)
    if category:
        q = q.where(MupTaskModel.category == category)
    q = q.order_by(MupTaskModel.created_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [await _task_out(t, db) for t in rows]


@router.post("", response_model=MupTaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(body: CreateMupTaskRequest, current_user: CurrentUser, db: DbSession) -> MupTaskOut:
    """Создание новой задачи МУП.

    Если assignedTo не указан, задача назначается на текущего пользователя.

    Args:
        body: Данные задачи.
        current_user: Текущий пользователь (created_by, fallback assigned_to).
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        MupTaskOut: Созданная задача.
    """
    due_date_str = body.resolved_due_date()
    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str).date()
        except ValueError:
            pass

    t = MupTaskModel(
        id=uuid4(),
        title=body.title,
        description=body.description,
        assigned_to=body.resolved_assigned_to() or current_user.id,
        created_by=current_user.id,
        due_date=due_date,
        status="pending",
        priority=body.priority,
        student_id=body.studentId,
        is_done=False,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return await _task_out(t, db)


@router.get("/{task_id}", response_model=MupTaskOut)
async def get_task(task_id: UUID, current_user: CurrentUser, db: DbSession) -> MupTaskOut:
    """Получение задачи по UUID.

    Args:
        task_id: UUID задачи.
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        MupTaskOut: Данные задачи.

    Raises:
        HTTPException: 404 — если задача не найдена.
    """
    result = await db.execute(select(MupTaskModel).where(MupTaskModel.id == task_id))
    t = result.scalar_one_or_none()
    if t is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return await _task_out(t, db)


@router.patch("/{task_id}", response_model=MupTaskOut)
async def update_task(
    task_id: UUID, body: UpdateMupTaskRequest, current_user: CurrentUser, db: DbSession
) -> MupTaskOut:
    """Обновление задачи МУП.

    Обновляет только переданные (не None) поля.

    Args:
        task_id: UUID задачи для обновления.
        body: Поля для обновления.
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        MupTaskOut: Обновлённая задача.

    Raises:
        HTTPException: 404 — если задача не найдена.
    """
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
    if body.priority is not None:
        t.priority = body.priority
    if body.dueDate is not None:
        try:
            t.due_date = datetime.fromisoformat(body.dueDate).date()
        except ValueError:
            pass
    await db.commit()
    await db.refresh(t)
    return await _task_out(t, db)


@router.post("/{task_id}/move", response_model=MupTaskOut)
async def move_task(task_id: UUID, body: MoveTaskRequest, current_user: CurrentUser, db: DbSession) -> MupTaskOut:
    """Перемещение задачи — смена статуса (Kanban).

    При переводе в статус "done" автоматически устанавливается is_done=True.

    Args:
        task_id: UUID задачи.
        body: Новый статус.
        current_user: Текущий авторизованный пользователь.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        MupTaskOut: Задача с обновлённым статусом.

    Raises:
        HTTPException: 400 — если указан невалидный статус.
        HTTPException: 404 — если задача не найдена.
    """
    result = await db.execute(select(MupTaskModel).where(MupTaskModel.id == task_id))
    t = result.scalar_one_or_none()
    if t is None:
        raise HTTPException(status_code=404, detail="Task not found")
    valid_statuses = {"pending", "in_progress", "done", "overdue"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
    t.status = body.status
    t.is_done = body.status == "done"
    await db.commit()
    await db.refresh(t)
    return await _task_out(t, db)


@router.delete("/{task_id}")
async def delete_task(task_id: UUID, _: StaffGuard, db: DbSession) -> Response:
    """Удаление задачи МУП (только директор и МУП).

    Args:
        task_id: UUID задачи для удаления.
        _: Гвард доступа (директор/МУП).
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        Response: 204 No Content.

    Raises:
        HTTPException: 404 — если задача не найдена.
    """
    result = await db.execute(select(MupTaskModel).where(MupTaskModel.id == task_id))
    t = result.scalar_one_or_none()
    if t is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(t)
    await db.commit()
    return Response(status_code=204)
