from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from sqlalchemy import select
from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.application.lms.students.use_cases import (
    CreateStudentInput,
    CreateStudentUseCase,
    GetStudentUseCase,
    ListStudentsUseCase,
    RecalculateRiskUseCase,
    UpdateStudentInput,
    UpdateStudentUseCase,
)
from src.domain.lms.entities import Student
from src.infrastructure.persistence.models.lms import StudentModel
from src.infrastructure.persistence.repositories.lms.student_repository import SqlStudentRepository
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository

router = APIRouter(prefix="/students", tags=["LMS - Students"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]


class StudentResponse(BaseModel):
    id: UUID
    userId: UUID | None = None
    studentCode: str | None = None
    fullName: str = ""
    phone: str | None = None
    email: str | None = None
    photoUrl: str | None = None
    dateOfBirth: str | None = None
    parentName: str | None = None
    parentPhone: str | None = None
    address: str | None = None
    riskLevel: str = "low"
    stars: int = 0
    crystals: int = 0
    totalCoins: int = 0
    badgeLevel: str = "bronze"
    gpa: float | None = None
    attendancePercent: float | None = None
    groupCount: int = 0

    @classmethod
    def from_model(cls, m, group_count: int = 0) -> "StudentResponse":  # type: ignore[no-untyped-def]
        return cls(
            id=m.id,
            userId=m.user_id,
            studentCode=m.student_code,
            fullName=m.full_name or "",
            phone=m.phone,
            email=getattr(m, "email", None),
            photoUrl=getattr(m, "photo_url", None),
            dateOfBirth=str(m.date_of_birth) if getattr(m, "date_of_birth", None) else None,
            parentName=getattr(m, "parent_name", None),
            parentPhone=m.parent_phone,
            address=getattr(m, "address", None),
            riskLevel=m.risk_level or "low",
            stars=m.stars or 0,
            crystals=m.crystals or 0,
            totalCoins=m.coins or 0,
            badgeLevel=m.badge_level or "bronze",
            gpa=float(m.gpa) if m.gpa is not None else None,
            attendancePercent=float(m.attendance_percent) if m.attendance_percent is not None else None,
            groupCount=group_count,
        )


class PagedStudents(BaseModel):
    data: list[StudentResponse]
    total: int
    page: int
    limit: int
    totalPages: int


class CreateStudentRequest(BaseModel):
    user_id: UUID
    phone: str | None = None
    parent_phone: str | None = None
    student_code: str | None = None


class UpdateStudentRequest(BaseModel):
    fullName: str | None = None
    phone: str | None = None
    email: str | None = None
    dateOfBirth: str | None = None
    parentName: str | None = None
    parentPhone: str | None = None
    address: str | None = None
    studentCode: str | None = None


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    body: CreateStudentRequest,
    _: StaffGuard,
    db: DbSession,
) -> StudentResponse:
    uc = CreateStudentUseCase(
        students=SqlStudentRepository(db),
        users=SqlUserRepository(db),
    )
    try:
        student = await uc.execute(CreateStudentInput(
            user_id=body.user_id,
            phone=body.phone,
            parent_phone=body.parent_phone,
            student_code=body.student_code,
        ))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return StudentResponse.from_domain(student)


@router.get("", response_model=PagedStudents)
async def list_students(
    _: StaffGuard,
    db: DbSession,
    direction_id: UUID | None = Query(None, alias="directionId"),
    teacher_id: UUID | None = Query(None, alias="teacherId"),
    risk_level: str | None = Query(None, alias="riskLevel"),
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PagedStudents:
    from sqlalchemy import func as fn
    from src.infrastructure.persistence.models.lms import SubjectModel, EnrollmentModel, GroupModel

    q = select(StudentModel)

    # If teacherId — find students in groups whose direction matches teacher's subjects
    if teacher_id:
        teacher_dir_ids = (await db.execute(
            select(SubjectModel.direction_id).where(
                SubjectModel.teacher_id == teacher_id,
                SubjectModel.direction_id != None,  # noqa: E711
            ).distinct()
        )).scalars().all()
        if teacher_dir_ids:
            # Students enrolled in groups of those directions
            group_ids_q = select(GroupModel.id).where(GroupModel.direction_id.in_(teacher_dir_ids))
            enrolled_student_ids = select(EnrollmentModel.student_id).where(
                EnrollmentModel.group_id.in_(group_ids_q),
                EnrollmentModel.is_active == True,  # noqa: E712
            ).distinct()
            q = q.where(StudentModel.id.in_(enrolled_student_ids))
        else:
            q = q.where(False)  # teacher has no subjects → no students

    if direction_id:
        q = q.where(StudentModel.direction_id == direction_id)
    if risk_level:
        q = q.where(StudentModel.risk_level == risk_level)
    if search:
        q = q.where(
            StudentModel.full_name.ilike(f"%{search}%")
            | StudentModel.phone.ilike(f"%{search}%")
            | StudentModel.student_code.ilike(f"%{search}%")
        )

    total = (await db.execute(select(fn.count()).select_from(q.subquery()))).scalar() or 0
    rows = (await db.execute(
        q.order_by(StudentModel.full_name)
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    # Bulk count enrollments
    student_ids = [m.id for m in rows]
    enroll_counts: dict = {}
    if student_ids:
        enroll_rows = (await db.execute(
            select(EnrollmentModel.student_id, fn.count(EnrollmentModel.id).label("cnt"))
            .where(EnrollmentModel.student_id.in_(student_ids), EnrollmentModel.is_active == True)  # noqa: E712
            .group_by(EnrollmentModel.student_id)
        )).all()
        enroll_counts = {r.student_id: r.cnt for r in enroll_rows}

    return PagedStudents(
        data=[StudentResponse.from_model(m, group_count=enroll_counts.get(m.id, 0)) for m in rows],
        total=total,
        page=page,
        limit=page_size,
        totalPages=max(1, -(-total // page_size)),
    )


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: UUID,
    _: StaffGuard,
    db: DbSession,
) -> StudentResponse:
    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return StudentResponse.from_model(m)


@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: UUID,
    body: UpdateStudentRequest,
    _: StaffGuard,
    db: DbSession,
) -> StudentResponse:
    from datetime import date as _date
    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")
    if body.fullName is not None:
        m.full_name = body.fullName
    if body.phone is not None:
        m.phone = body.phone
    if body.email is not None:
        m.email = body.email
    if body.dateOfBirth is not None:
        try:
            m.date_of_birth = _date.fromisoformat(body.dateOfBirth)
        except ValueError:
            pass
    if body.parentName is not None:
        m.parent_name = body.parentName
    if body.parentPhone is not None:
        m.parent_phone = body.parentPhone
    if body.address is not None:
        m.address = body.address
    if body.studentCode is not None:
        m.student_code = body.studentCode
    await db.commit()
    await db.refresh(m)
    return StudentResponse.from_model(m)


@router.post("/{student_id}/recalculate-risk", response_model=StudentResponse)
async def recalculate_risk(
    student_id: UUID,
    _: StaffGuard,
    db: DbSession,
) -> StudentResponse:
    uc = RecalculateRiskUseCase(SqlStudentRepository(db))
    try:
        student = await uc.execute(student_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    await db.commit()
    return StudentResponse.from_domain(student)


@router.post("/{student_id}/reset-password")
async def reset_student_password(
    student_id: UUID,
    _: StaffGuard,
    db: DbSession,
) -> dict:  # type: ignore[type-arg]
    import secrets, string
    from src.infrastructure.persistence.models.auth import UserModel
    from src.infrastructure.services.password_service import hash_password

    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")
    if m.user_id is None:
        raise HTTPException(status_code=400, detail="Student has no user account")

    user = (await db.execute(select(UserModel).where(UserModel.id == m.user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User account not found")

    # Generate new password
    chars = string.ascii_letters + string.digits + "!@#$"
    pw = [secrets.choice(string.ascii_uppercase), secrets.choice(string.ascii_lowercase),
          secrets.choice(string.digits), secrets.choice("!@#$")]
    pw += [secrets.choice(chars) for _ in range(6)]
    secrets.SystemRandom().shuffle(pw)
    new_password = "".join(pw)

    user.password_hash = hash_password(new_password)
    await db.commit()

    return {"login": user.email, "password": new_password}


# ── Student Groups (enrollments + transfer) ──────────────────────────────────

@router.get("/{student_id}/groups")
async def get_student_groups(
    student_id: UUID, _: StaffGuard, db: DbSession,
) -> dict:  # type: ignore[type-arg]
    from src.infrastructure.persistence.models.lms import EnrollmentModel, GroupModel, SubjectModel, DirectionModel
    from src.infrastructure.persistence.models.crm import ContractModel
    from sqlalchemy import func as fn

    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")

    # Current enrollments with group info
    enrollments = (await db.execute(
        select(EnrollmentModel, GroupModel)
        .join(GroupModel, GroupModel.id == EnrollmentModel.group_id)
        .where(EnrollmentModel.student_id == student_id)
        .order_by(EnrollmentModel.enrolled_at.desc())
    )).all()

    # Resolve direction names
    dir_ids = {grp.direction_id for _, grp in enrollments if grp.direction_id}
    dir_map: dict = {}
    if dir_ids:
        dirs = (await db.execute(select(DirectionModel).where(DirectionModel.id.in_(dir_ids)))).scalars().all()
        dir_map = {d.id: d.name for d in dirs}

    current_groups = []
    for enr, grp in enrollments:
        current_groups.append({
            "enrollmentId": str(enr.id),
            "groupId": str(grp.id),
            "groupName": grp.name,
            "directionName": dir_map.get(grp.direction_id),
            "isActive": enr.is_active,
            "enrolledAt": enr.enrolled_at.isoformat() if enr.enrolled_at else None,
            "droppedAt": enr.dropped_at.isoformat() if enr.dropped_at else None,
        })

    # Available groups: all active groups not yet enrolled
    enrolled_group_ids = {g["groupId"] for g in current_groups if g["isActive"]}
    all_groups = (await db.execute(
        select(GroupModel).where(GroupModel.is_active == True)  # noqa: E712
    )).scalars().all()

    # Resolve all direction names
    all_dir_ids = {g.direction_id for g in all_groups if g.direction_id} - set(dir_map.keys())
    if all_dir_ids:
        extra_dirs = (await db.execute(select(DirectionModel).where(DirectionModel.id.in_(all_dir_ids)))).scalars().all()
        for d in extra_dirs:
            dir_map[d.id] = d.name

    available_groups = []
    for grp in all_groups:
        available_groups.append({
            "groupId": str(grp.id),
            "groupName": grp.name,
            "directionName": dir_map.get(grp.direction_id),
            "isEnrolled": str(grp.id) in enrolled_group_ids,
        })

    return {"currentGroups": current_groups, "availableGroups": available_groups}


@router.post("/{student_id}/enroll")
async def enroll_student(
    student_id: UUID, _: StaffGuard, db: DbSession,
    groupId: str = "",
) -> dict:  # type: ignore[type-arg]
    from src.infrastructure.persistence.models.lms import EnrollmentModel, GroupModel, SubjectModel
    from src.infrastructure.persistence.models.crm import ContractModel
    from uuid import uuid4 as _uid
    from datetime import datetime, timezone

    if not groupId:
        raise HTTPException(status_code=400, detail="groupId is required")
    group_uuid = UUID(groupId)

    # Verify student exists
    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify group exists
    grp = (await db.execute(select(GroupModel).where(GroupModel.id == group_uuid))).scalar_one_or_none()
    if grp is None:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check direction constraint from contracts
    if grp.direction_id:
        allowed_dirs = (await db.execute(
            select(ContractModel.direction_id).where(
                ContractModel.student_id == student_id, ContractModel.status == "active",
                ContractModel.direction_id.isnot(None),
            ).distinct()
        )).scalars().all()
        if allowed_dirs and grp.direction_id not in allowed_dirs:
            raise HTTPException(status_code=400, detail="Student contract does not include this direction")

    # Check not already enrolled
    existing = (await db.execute(
        select(EnrollmentModel).where(
            EnrollmentModel.student_id == student_id,
            EnrollmentModel.group_id == group_uuid,
            EnrollmentModel.is_active == True,  # noqa: E712
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Already enrolled in this group")

    db.add(EnrollmentModel(
        id=_uid(), student_id=student_id, group_id=group_uuid,
        enrolled_at=datetime.now(timezone.utc), is_active=True,
    ))
    await db.commit()
    return {"message": "Enrolled successfully"}


@router.post("/{student_id}/transfer")
async def transfer_student(
    student_id: UUID, _: StaffGuard, db: DbSession,
    fromGroupId: str = "", toGroupId: str = "",
) -> dict:  # type: ignore[type-arg]
    from src.infrastructure.persistence.models.lms import EnrollmentModel, GroupModel, SubjectModel
    from src.infrastructure.persistence.models.crm import ContractModel
    from uuid import uuid4 as _uid
    from datetime import datetime, timezone

    if not fromGroupId or not toGroupId:
        raise HTTPException(status_code=400, detail="fromGroupId and toGroupId required")

    from_uuid = UUID(fromGroupId)
    to_uuid = UUID(toGroupId)

    # Verify student
    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify target group direction is allowed
    to_grp = (await db.execute(select(GroupModel).where(GroupModel.id == to_uuid))).scalar_one_or_none()
    if to_grp is None:
        raise HTTPException(status_code=404, detail="Target group not found")
    if to_grp.direction_id:
        allowed_dirs = (await db.execute(
            select(ContractModel.direction_id).where(
                ContractModel.student_id == student_id, ContractModel.status == "active",
                ContractModel.direction_id.isnot(None),
            ).distinct()
        )).scalars().all()
        if allowed_dirs and to_grp.direction_id not in allowed_dirs:
            raise HTTPException(status_code=400, detail="Student contract does not include target direction")

    # Deactivate old enrollment
    now = datetime.now(timezone.utc)
    old_enr = (await db.execute(
        select(EnrollmentModel).where(
            EnrollmentModel.student_id == student_id,
            EnrollmentModel.group_id == from_uuid,
            EnrollmentModel.is_active == True,  # noqa: E712
        )
    )).scalar_one_or_none()
    if old_enr:
        old_enr.is_active = False
        old_enr.dropped_at = now

    # Create new enrollment
    db.add(EnrollmentModel(
        id=_uid(), student_id=student_id, group_id=to_uuid,
        enrolled_at=now, is_active=True,
    ))
    await db.commit()
    return {"message": "Transferred successfully"}
