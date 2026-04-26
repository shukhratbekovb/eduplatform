"""CRM Contracts — create contract, auto-create student, handle documents."""
from __future__ import annotations

import secrets
import string
from datetime import date, datetime, timezone
from dateutil.relativedelta import relativedelta
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import select, func

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.crm import ContractModel, LeadModel
from src.infrastructure.persistence.models.lms import StudentModel, DirectionModel, PaymentModel
from src.infrastructure.persistence.models.auth import UserModel
from src.infrastructure.services.password_service import hash_password

router = APIRouter(prefix="/crm/contracts", tags=["CRM - Contracts"])

PAYMENT_TYPES = {
    "monthly":    "Ежемесячная",
    "quarterly":  "Квартальная (3 мес.)",
    "semiannual": "Полугодовая (6 мес.)",
    "annual":     "Годовая",
}

PAYMENT_TYPE_MONTHS = {
    "monthly": 1,
    "quarterly": 3,
    "semiannual": 6,
    "annual": 12,
}


async def _generate_payment_schedule(
    db, contract: ContractModel, direction, created_by: UUID | None,
) -> None:
    """Auto-generate payment records (invoices) for the contract."""
    duration_months = direction.duration_months or 6
    step_months = PAYMENT_TYPE_MONTHS.get(contract.payment_type, 1)
    num_periods = max(1, duration_months // step_months)
    start = contract.start_date or date.today()

    for i in range(num_periods):
        due = start + relativedelta(months=step_months * i)
        db.add(PaymentModel(
            id=uuid4(),
            student_id=contract.student_id,
            contract_id=contract.id,
            description=f"Оплата #{i + 1} по договору {contract.contract_number}",
            amount=contract.payment_amount or 0,
            currency=contract.currency,
            status="pending",
            due_date=due,
            paid_amount=0,
            period_number=i + 1,
            created_by=created_by,
        ))
    await db.flush()

DOCUMENT_TYPES = {
    "passport":          "Паспорт",
    "birth_certificate": "Метрика (свидетельство о рождении)",
    "photo":             "Фото 3x4",
    "other":             "Другое",
}


# ── Schemas ──────────────────────────────────────────────────────────────────

class CreateContractRequest(BaseModel):
    leadId: UUID | None = None
    studentId: UUID | None = None       # existing student — skip account creation
    fullName: str
    phone: str
    email: str | None = None
    directionId: UUID
    paymentType: str = "monthly"
    paymentAmount: float
    currency: str = "UZS"
    startDate: str | None = None
    notes: str | None = None


class DocumentOut(BaseModel):
    id: UUID
    type: str
    typeLabel: str
    fileName: str
    fileUrl: str
    uploadedAt: str | None = None


class ContractOut(BaseModel):
    id: UUID
    contractNumber: str | None = None
    leadId: UUID | None = None
    studentId: UUID | None = None
    userId: UUID | None = None
    directionId: UUID | None = None
    directionName: str | None = None
    fullName: str
    phone: str
    email: str | None = None
    paymentType: str
    paymentTypeLabel: str | None = None
    paymentAmount: float | None = None
    currency: str
    durationMonths: int | None = None
    totalLessons: int | None = None
    startDate: str | None = None
    notes: str | None = None
    status: str
    createdAt: str | None = None
    studentLogin: str | None = None
    studentPassword: str | None = None
    hasDocuments: bool = False
    documents: list[DocumentOut] = []
    studentCode: str | None = None
    createdByName: str | None = None


class ContractListOut(BaseModel):
    data: list[ContractOut]
    total: int
    page: int
    limit: int
    totalPages: int


class StudentSearchOut(BaseModel):
    id: UUID
    fullName: str
    phone: str | None = None
    email: str | None = None
    studentCode: str | None = None
    hasDocuments: bool = False


# ── Helpers ──────────────────────────────────────────────────────────────────

def _generate_password(length: int = 10) -> str:
    chars = string.ascii_letters + string.digits + "!@#$"
    pw = [secrets.choice(string.ascii_uppercase), secrets.choice(string.ascii_lowercase),
          secrets.choice(string.digits), secrets.choice("!@#$")]
    pw += [secrets.choice(chars) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pw)
    return "".join(pw)


async def _resolve_direction(db, did):  # type: ignore[no-untyped-def]
    if not did:
        return None
    return (await db.execute(select(DirectionModel).where(DirectionModel.id == did))).scalar_one_or_none()


async def _student_has_docs(db, student_id: UUID) -> bool:
    from sqlalchemy import text
    r = (await db.execute(text("SELECT count(*) FROM student_documents WHERE student_id = :sid"), {"sid": student_id})).scalar()
    return (r or 0) > 0


def _contract_out(m: ContractModel, direction=None, login=None, password=None, has_docs=False, documents=None) -> ContractOut:  # type: ignore[no-untyped-def]
    return ContractOut(
        id=m.id, contractNumber=getattr(m, 'contract_number', None),
        leadId=m.lead_id, studentId=m.student_id, userId=m.user_id,
        directionId=m.direction_id,
        directionName=direction.name if direction else None,
        fullName=m.full_name, phone=m.phone, email=m.email,
        paymentType=m.payment_type or "monthly",
        paymentTypeLabel=PAYMENT_TYPES.get(m.payment_type or "monthly"),
        paymentAmount=float(m.payment_amount) if m.payment_amount else None,
        currency=m.currency,
        durationMonths=direction.duration_months if direction else None,
        totalLessons=direction.total_lessons if direction else None,
        startDate=str(m.start_date) if m.start_date else None,
        notes=m.notes, status=m.status,
        createdAt=m.created_at.isoformat() if m.created_at else None,
        studentLogin=login, studentPassword=password, hasDocuments=has_docs,
    )


# ── Search existing students ─────────────────────────────────────────────────

@router.get("/students/search", response_model=list[StudentSearchOut])
async def search_students(
    current_user: CurrentUser,
    db: DbSession,
    q: str = Query("", min_length=2),
) -> list[StudentSearchOut]:
    """Search existing students by name/phone/code for adding a second direction."""
    rows = (await db.execute(
        select(StudentModel)
        .where(
            StudentModel.full_name.ilike(f"%{q}%")
            | StudentModel.phone.ilike(f"%{q}%")
            | StudentModel.student_code.ilike(f"%{q}%")
        )
        .limit(10)
    )).scalars().all()

    result = []
    for s in rows:
        hd = await _student_has_docs(db, s.id)
        result.append(StudentSearchOut(
            id=s.id, fullName=s.full_name, phone=s.phone,
            email=s.email, studentCode=s.student_code, hasDocuments=hd,
        ))
    return result


# ── Document types ────────────────────────────────────────────────────────────

@router.get("/document-types")
async def get_document_types() -> dict:  # type: ignore[type-arg]
    return DOCUMENT_TYPES


# ── Upload document for student ───────────────────────────────────────────────

@router.post("/students/{student_id}/documents", response_model=DocumentOut)
async def upload_document(
    student_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
) -> DocumentOut:
    from sqlalchemy import text

    if doc_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of: {list(DOCUMENT_TYPES.keys())}")

    s = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=404, detail="Student not found")

    # For MVP: store file content as base64 data URL (production would use S3)
    content = await file.read()
    import base64
    data_url = f"data:{file.content_type};base64,{base64.b64encode(content).decode()}"

    doc_id = uuid4()
    now = datetime.now(timezone.utc)
    await db.execute(text("""
        INSERT INTO student_documents (id, student_id, type, file_url, file_name, uploaded_at)
        VALUES (:id, :sid, :type, :url, :fname, :at)
        ON CONFLICT (student_id, type) DO UPDATE SET file_url = :url, file_name = :fname, uploaded_at = :at
    """), {"id": doc_id, "sid": student_id, "type": doc_type, "url": data_url, "fname": file.filename, "at": now})
    await db.commit()

    return DocumentOut(
        id=doc_id, type=doc_type, typeLabel=DOCUMENT_TYPES[doc_type],
        fileName=file.filename or "", fileUrl=data_url,
        uploadedAt=now.isoformat(),
    )


# ── Get student documents ────────────────────────────────────────────────────

@router.get("/students/{student_id}/documents", response_model=list[DocumentOut])
async def list_student_documents(
    student_id: UUID, current_user: CurrentUser, db: DbSession,
) -> list[DocumentOut]:
    from sqlalchemy import text
    rows = (await db.execute(
        text("SELECT id, type, file_url, file_name, uploaded_at FROM student_documents WHERE student_id = :sid ORDER BY uploaded_at"),
        {"sid": student_id},
    )).all()
    return [
        DocumentOut(id=r[0], type=r[1], typeLabel=DOCUMENT_TYPES.get(r[1], r[1]),
                    fileUrl=r[2], fileName=r[3], uploadedAt=r[4].isoformat() if r[4] else None)
        for r in rows
    ]


# ── Payment types ─────────────────────────────────────────────────────────────

@router.get("/payment-types")
async def get_payment_types() -> dict:  # type: ignore[type-arg]
    return PAYMENT_TYPES


# ── Create contract ──────────────────────────────────────────────────────────

@router.post("", response_model=ContractOut, status_code=201)
async def create_contract(
    body: CreateContractRequest, current_user: CurrentUser, db: DbSession,
) -> ContractOut:
    now = datetime.now(timezone.utc)

    if body.paymentType not in PAYMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"paymentType must be one of: {list(PAYMENT_TYPES.keys())}")

    direction = await _resolve_direction(db, body.directionId)
    if direction is None:
        raise HTTPException(status_code=404, detail="Direction not found")

    if body.leadId:
        lead = (await db.execute(select(LeadModel).where(LeadModel.id == body.leadId))).scalar_one_or_none()
        if lead and lead.status != "won":
            raise HTTPException(status_code=400, detail="Lead must be in 'won' status")

    raw_password: str | None = None
    user_id: UUID | None = None
    student_id: UUID | None = body.studentId
    email = body.email

    if student_id:
        # Existing student — just add new direction contract, no new account
        s = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
        if s is None:
            raise HTTPException(status_code=404, detail="Student not found")
        user_id = s.user_id
        email = email or s.email
    else:
        # New student — create account
        email = email or f"student_{body.phone.replace('+', '').replace(' ', '')}@edu.uz"

        existing_user = (await db.execute(select(UserModel).where(UserModel.email == email))).scalar_one_or_none()
        if existing_user:
            user_id = existing_user.id
            s = (await db.execute(select(StudentModel).where(StudentModel.user_id == existing_user.id))).scalar_one_or_none()
            if s:
                student_id = s.id
        else:
            raw_password = _generate_password()
            user_id = uuid4()
            db.add(UserModel(
                id=user_id, email=email, password_hash=hash_password(raw_password),
                name=body.fullName, role="student", is_active=True,
            ))
            await db.flush()

            student_id = uuid4()
            student_code = f"STU-{secrets.randbelow(900000) + 100000}"
            db.add(StudentModel(
                id=student_id, user_id=user_id, full_name=body.fullName,
                phone=body.phone, email=email, student_code=student_code,
                direction_id=body.directionId,
                risk_level="low", badge_level="bronze", stars=0, crystals=0, coins=0,
            ))
            await db.flush()

    start_dt = None
    if body.startDate:
        try:
            start_dt = date.fromisoformat(body.startDate)
        except ValueError:
            pass

    # Generate contract number D-00001
    from sqlalchemy import text
    seq = (await db.execute(text("SELECT nextval('contract_number_seq')"))).scalar()
    contract_number = f"D-{seq:05d}"

    contract = ContractModel(
        id=uuid4(), contract_number=contract_number,
        lead_id=body.leadId, student_id=student_id, user_id=user_id,
        direction_id=body.directionId,
        full_name=body.fullName, phone=body.phone, email=email,
        payment_type=body.paymentType, payment_amount=body.paymentAmount,
        currency=body.currency, start_date=start_dt, notes=body.notes,
        status="active", created_by=current_user.id,
    )
    db.add(contract)
    await db.flush()

    # Auto-generate payment schedule
    await _generate_payment_schedule(db, contract, direction, created_by=current_user.id)

    await db.commit()
    await db.refresh(contract)

    has_docs = await _student_has_docs(db, student_id) if student_id else False
    return _contract_out(contract, direction=direction, login=email, password=raw_password, has_docs=has_docs)


# ── List / Get ────────────────────────────────────────────────────────────────

@router.get("", response_model=ContractListOut)
async def list_contracts(
    current_user: CurrentUser, db: DbSession,
    search: str | None = None, status: str | None = None,
    directionId: UUID | None = None, paymentType: str | None = None,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
) -> ContractListOut:
    q = select(ContractModel)
    if search:
        q = q.where(ContractModel.full_name.ilike(f"%{search}%") | ContractModel.phone.ilike(f"%{search}%")
                     | ContractModel.contract_number.ilike(f"%{search}%"))
    if status:
        q = q.where(ContractModel.status == status)
    if directionId:
        q = q.where(ContractModel.direction_id == directionId)
    if paymentType:
        q = q.where(ContractModel.payment_type == paymentType)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    rows = (await db.execute(q.order_by(ContractModel.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()

    result = []
    for m in rows:
        d = await _resolve_direction(db, m.direction_id)
        hd = await _student_has_docs(db, m.student_id) if m.student_id else False
        result.append(_contract_out(m, direction=d, has_docs=hd))
    return ContractListOut(data=result, total=total, page=page, limit=limit, totalPages=max(1, -(-total // limit)))


@router.get("/{contract_id}", response_model=ContractOut)
async def get_contract(contract_id: UUID, current_user: CurrentUser, db: DbSession) -> ContractOut:
    from sqlalchemy import text as sa_text

    m = (await db.execute(select(ContractModel).where(ContractModel.id == contract_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Contract not found")

    d = await _resolve_direction(db, m.direction_id)
    out = _contract_out(m, direction=d, has_docs=False)

    # Load documents
    if m.student_id:
        doc_rows = (await db.execute(
            sa_text("SELECT id, type, file_url, file_name, uploaded_at FROM student_documents WHERE student_id = :sid ORDER BY uploaded_at"),
            {"sid": m.student_id},
        )).all()
        out.documents = [
            DocumentOut(id=r[0], type=r[1], typeLabel=DOCUMENT_TYPES.get(r[1], r[1]),
                        fileUrl=r[2], fileName=r[3], uploadedAt=r[4].isoformat() if r[4] else None)
            for r in doc_rows
        ]
        out.hasDocuments = len(out.documents) > 0

        # Student code
        student = (await db.execute(select(StudentModel).where(StudentModel.id == m.student_id))).scalar_one_or_none()
        if student:
            out.studentCode = student.student_code

    # Creator name
    if m.created_by:
        creator = (await db.execute(select(UserModel).where(UserModel.id == m.created_by))).scalar_one_or_none()
        if creator:
            out.createdByName = creator.name

    return out


# ── Contracts by student ─────────────────────────────────────────────────────

@router.get("/by-student/{student_id}", response_model=list[ContractOut])
async def contracts_by_student(
    student_id: UUID, current_user: CurrentUser, db: DbSession,
) -> list[ContractOut]:
    rows = (await db.execute(
        select(ContractModel).where(ContractModel.student_id == student_id)
        .order_by(ContractModel.created_at.desc())
    )).scalars().all()
    result = []
    for m in rows:
        d = await _resolve_direction(db, m.direction_id)
        result.append(_contract_out(m, direction=d))
    return result
