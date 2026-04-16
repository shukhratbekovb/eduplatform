from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Response, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Annotated
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.application.lms.lessons.use_cases import (
    CancelLessonUseCase,
    ConductLessonUseCase,
    CreateLessonInput,
    CreateLessonUseCase,
    GetLessonUseCase,
    ListLessonsUseCase,
)
from src.domain.lms.entities import Lesson
from src.infrastructure.persistence.repositories.lms.group_repository import SqlGroupRepository
from src.infrastructure.persistence.repositories.lms.lesson_repository import SqlLessonRepository
from src.infrastructure.persistence.models.lms import (
    AttendanceRecordModel, GradeRecordModel, DiamondRecordModel,
    LessonMaterialModel, LessonModel,
)

router = APIRouter(prefix="/lessons", tags=["LMS - Lessons"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]


class LessonResponse(BaseModel):
    id: UUID
    groupId: UUID
    teacherId: UUID | None = None
    roomId: UUID | None = None
    date: str            # YYYY-MM-DD
    startTime: str       # HH:MM
    endTime: str         # HH:MM
    status: str
    topic: str | None = None
    isOnline: bool = False
    cancelReason: str | None = None
    createdAt: str | None = None

    @classmethod
    def from_model(cls, m) -> "LessonResponse":  # type: ignore[no-untyped-def]
        from datetime import timedelta as td
        scheduled = m.scheduled_at
        duration = m.duration_minutes or 60
        d = scheduled.strftime("%Y-%m-%d") if scheduled else ""
        st = scheduled.strftime("%H:%M") if scheduled else "00:00"
        end_dt = scheduled + td(minutes=duration) if scheduled else None
        et = end_dt.strftime("%H:%M") if end_dt else "00:00"
        return cls(
            id=m.id, groupId=m.group_id, teacherId=m.teacher_id, roomId=m.room_id,
            date=d, startTime=st, endTime=et,
            status=m.status, topic=m.topic, isOnline=m.is_online,
            cancelReason=m.cancel_reason,
            createdAt=m.created_at.isoformat() if m.created_at else None,
        )


class PagedLessons(BaseModel):
    items: list[LessonResponse]
    total: int
    page: int
    pages: int


class CreateLessonRequest(BaseModel):
    group_id: UUID
    lesson_date: date
    start_time: str
    end_time: str
    teacher_id: UUID | None = None
    room_id: UUID | None = None
    is_online: bool = False
    topic: str | None = None


class ConductRequest(BaseModel):
    topic: str | None = None


class CancelRequest(BaseModel):
    reason: str


@router.post("", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    body: CreateLessonRequest,
    _: StaffGuard,
    db: DbSession,
) -> LessonResponse:
    uc = CreateLessonUseCase(SqlLessonRepository(db), SqlGroupRepository(db))
    try:
        lesson = await uc.execute(CreateLessonInput(**body.model_dump()))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return LessonResponse.from_domain(lesson)


@router.get("", response_model=PagedLessons)
async def list_lessons(
    current_user: CurrentUser,
    db: DbSession,
    group_id: UUID | None = None,
    teacher_id: UUID | None = None,
    roomId: UUID | None = None,
    status: str | None = None,
    weekStart: str | None = None,
    weekEnd: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> PagedLessons:
    from datetime import datetime as dt, timezone
    from sqlalchemy import func as fn

    q = select(LessonModel)
    if group_id:
        q = q.where(LessonModel.group_id == group_id)
    if teacher_id:
        q = q.where(LessonModel.teacher_id == teacher_id)
    if roomId:
        q = q.where(LessonModel.room_id == roomId)
    if status:
        q = q.where(LessonModel.status == status)
    # Support both weekStart/weekEnd and date_from/date_to
    start_str = weekStart or date_from
    end_str = weekEnd or date_to
    if start_str:
        q = q.where(LessonModel.scheduled_at >= dt.fromisoformat(start_str).replace(tzinfo=timezone.utc))
    if end_str:
        q = q.where(LessonModel.scheduled_at < dt.fromisoformat(end_str).replace(tzinfo=timezone.utc))

    total = (await db.execute(select(fn.count()).select_from(q.subquery()))).scalar() or 0
    rows = (await db.execute(
        q.order_by(LessonModel.scheduled_at.asc().nullslast())
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    return PagedLessons(
        items=[LessonResponse.from_model(m) for m in rows],
        total=total,
        page=page,
        pages=max(1, -(-total // page_size)),
    )


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(lesson_id: UUID, current_user: CurrentUser, db: DbSession) -> LessonResponse:
    m = (await db.execute(select(LessonModel).where(LessonModel.id == lesson_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return LessonResponse.from_model(m)


@router.post("/{lesson_id}/conduct", response_model=LessonResponse)
async def conduct_lesson(
    lesson_id: UUID,
    body: ConductRequest,
    _: StaffGuard,
    db: DbSession,
) -> LessonResponse:
    uc = ConductLessonUseCase(SqlLessonRepository(db))
    try:
        lesson = await uc.execute(lesson_id, body.topic)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return LessonResponse.from_domain(lesson)


@router.post("/{lesson_id}/cancel", response_model=LessonResponse)
async def cancel_lesson(
    lesson_id: UUID,
    body: CancelRequest,
    _: StaffGuard,
    db: DbSession,
) -> LessonResponse:
    uc = CancelLessonUseCase(SqlLessonRepository(db))
    try:
        lesson = await uc.execute(lesson_id, body.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return LessonResponse.from_domain(lesson)


# ── Lesson Full (lesson + attendance + grades + diamonds) ─────────────────────

class AttendanceOut(BaseModel):
    id: UUID
    studentId: UUID
    status: str
    note: str | None


class GradeOut(BaseModel):
    id: UUID
    studentId: UUID
    type: str
    value: float
    comment: str | None


class DiamondOut(BaseModel):
    id: UUID
    studentId: UUID
    amount: int
    note: str | None


class MaterialOut(BaseModel):
    id: UUID
    lessonId: UUID
    title: str
    type: str
    language: str
    url: str
    uploadedBy: UUID | None
    uploadedAt: str


class LessonFullResponse(BaseModel):
    lesson: LessonResponse
    attendance: list[AttendanceOut]
    grades: list[GradeOut]
    diamonds: list[DiamondOut]
    materials: list[MaterialOut]


@router.get("/{lesson_id}/full", response_model=LessonFullResponse)
async def get_lesson_full(lesson_id: UUID, current_user: CurrentUser, db: DbSession) -> LessonFullResponse:
    uc = GetLessonUseCase(SqlLessonRepository(db))
    try:
        lesson = await uc.execute(lesson_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    attendance = (await db.execute(
        select(AttendanceRecordModel).where(AttendanceRecordModel.lesson_id == lesson_id)
    )).scalars().all()

    grades = (await db.execute(
        select(GradeRecordModel).where(GradeRecordModel.lesson_id == lesson_id)
    )).scalars().all()

    diamonds = (await db.execute(
        select(DiamondRecordModel).where(DiamondRecordModel.lesson_id == lesson_id)
    )).scalars().all()

    materials = (await db.execute(
        select(LessonMaterialModel).where(LessonMaterialModel.lesson_id == lesson_id)
    )).scalars().all()

    return LessonFullResponse(
        lesson=LessonResponse.from_domain(lesson),
        attendance=[AttendanceOut(
            id=a.id, studentId=a.student_id, status=a.status, note=a.note
        ) for a in attendance],
        grades=[GradeOut(
            id=g.id, studentId=g.student_id, type=g.type,
            value=float(g.value), comment=g.comment
        ) for g in grades],
        diamonds=[DiamondOut(
            id=d.id, studentId=d.student_id, amount=d.amount, note=d.note
        ) for d in diamonds],
        materials=[MaterialOut(
            id=m.id, lessonId=m.lesson_id, title=m.title, type=m.type,
            language=m.language, url=m.url, uploadedBy=m.uploaded_by,
            uploadedAt=m.uploaded_at.isoformat(),
        ) for m in materials],
    )


# ── Lesson Materials CRUD ─────────────────────────────────────────────────────

class AddMaterialRequest(BaseModel):
    title: str
    type: str = "pdf"
    language: str = "ru"
    url: str


@router.get("/{lesson_id}/materials", response_model=list[MaterialOut])
async def list_materials(lesson_id: UUID, current_user: CurrentUser, db: DbSession) -> list[MaterialOut]:
    rows = (await db.execute(
        select(LessonMaterialModel).where(LessonMaterialModel.lesson_id == lesson_id)
    )).scalars().all()
    return [MaterialOut(
        id=m.id, lessonId=m.lesson_id, title=m.title, type=m.type,
        language=m.language, url=m.url, uploadedBy=m.uploaded_by,
        uploadedAt=m.uploaded_at.isoformat(),
    ) for m in rows]


@router.post("/{lesson_id}/materials", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
async def add_material(
    lesson_id: UUID,
    body: AddMaterialRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> MaterialOut:
    m = LessonMaterialModel(
        id=uuid4(),
        lesson_id=lesson_id,
        title=body.title,
        type=body.type,
        language=body.language,
        url=body.url,
        uploaded_by=current_user.id,
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return MaterialOut(
        id=m.id, lessonId=m.lesson_id, title=m.title, type=m.type,
        language=m.language, url=m.url, uploadedBy=m.uploaded_by,
        uploadedAt=m.uploaded_at.isoformat(),
    )


@router.delete("/{lesson_id}/materials/{material_id}")
async def delete_material(lesson_id: UUID, material_id: UUID, current_user: CurrentUser, db: DbSession) -> Response:
    m = (await db.execute(
        select(LessonMaterialModel).where(
            LessonMaterialModel.id == material_id,
            LessonMaterialModel.lesson_id == lesson_id,
        )
    )).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Material not found")
    await db.delete(m)
    await db.commit()
    return Response(status_code=204)
