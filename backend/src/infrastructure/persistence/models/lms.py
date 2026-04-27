"""ORM-модели подсистемы LMS (Learning Management System).

Определяет все SQLAlchemy-модели для системы управления обучением:
студенты, направления, предметы, кабинеты, группы, зачисления,
уроки, посещаемость, оценки, бриллианты, материалы, домашние задания,
запросы на позднее внесение, монетные транзакции, задачи МУП,
уведомления, компенсации, экзамены, зарплаты, платежи и факторы риска.

Все модели используют UUID в качестве первичных ключей (PostgreSQL).
Timestamps (created_at, updated_at) добавляются через TimestampMixin.

Таблицы:
    students, directions, subjects, rooms, groups, enrollments,
    lessons, attendance_records, grade_records, diamond_records,
    lesson_materials, homework_assignments, homework_submissions,
    late_entry_requests, coin_transactions, mup_tasks,
    lms_notifications, compensation_models, exams,
    salary_calculations, payments, risk_factors.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base
from src.infrastructure.persistence.models.base import TimestampMixin, UUIDPrimaryKey

# ── Students ──────────────────────────────────────────────────────────────────


class StudentModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель студента учебного центра.

    Содержит персональные данные, контакты родителей, привязку
    к учётной записи (user_id), академические показатели (GPA,
    посещаемость) и данные геймификации (звёзды, кристаллы, бейдж).

    Attributes:
        user_id: UUID связанного пользователя (для авторизации через Student Portal).
        student_code: Уникальный код студента (например, "PY-101-001").
        full_name: Полное имя (ФИО).
        phone: Телефон студента.
        email: Email студента.
        date_of_birth: Дата рождения.
        photo_url: URL фотографии.
        parent_name: ФИО родителя/опекуна.
        parent_phone: Телефон родителя.
        address: Адрес проживания.
        direction_id: UUID направления обучения.
        is_active: Флаг активности.
        risk_level: Уровень риска отчисления (low, medium, high, critical).
        risk_last_updated: Дата последнего пересчёта риска.
        coins: Монеты (устаревшее поле, заменено на stars/crystals).
        stars: Звёзды геймификации (основная валюта).
        crystals: Кристаллы (бриллианты) геймификации (премиальная валюта).
        badge_level: Уровень бейджа (bronze, silver, gold, platinum, diamond).
        gpa: Средний балл (10-балльная шкала, формула: avg(score/max_score*10)).
        attendance_percent: Процент посещаемости (present+late / total * 100).

    Note:
        У модели НЕТ полей subject_id, teacher_id и enrollments.
        Количество групп вычисляется через EnrollmentModel.
    """

    __tablename__ = "students"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    student_code: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    parent_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    direction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("directions.id", ondelete="SET NULL"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    risk_level: Mapped[str] = mapped_column(
        SAEnum("low", "medium", "high", "critical", name="risk_level", create_type=False),
        nullable=False,
        default="low",
        index=True,
    )
    risk_last_updated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    coins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stars: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    crystals: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    badge_level: Mapped[str] = mapped_column(
        SAEnum("bronze", "silver", "gold", "platinum", "diamond", name="badge_level", create_type=False),
        nullable=False,
        default="bronze",
    )
    gpa: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True)
    attendance_percent: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)


# ── Directions ────────────────────────────────────────────────────────────────


class DirectionModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель направления обучения (например, Python, JavaScript, DevOps).

    Attributes:
        name: Название направления.
        description: Описание направления.
        is_active: Флаг активности.
        duration_months: Длительность обучения в месяцах (по умолчанию 6).
        total_lessons: Общее количество уроков в программе (по умолчанию 72).
    """

    __tablename__ = "directions"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    duration_months: Mapped[int | None] = mapped_column(Integer, nullable=True, default=6)
    total_lessons: Mapped[int | None] = mapped_column(Integer, nullable=True, default=72)


# ── Subjects ──────────────────────────────────────────────────────────────────


class SubjectModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель учебного предмета.

    Предмет привязан к направлению и преподавателю. При создании урока
    предмет выбирается из тех, что относятся к направлению группы.

    Attributes:
        direction_id: UUID направления, к которому относится предмет.
        teacher_id: UUID преподавателя, ведущего предмет.
        name: Название предмета.
        description: Описание предмета.
        is_active: Флаг активности.
    """

    __tablename__ = "subjects"

    direction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("directions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ── Rooms ─────────────────────────────────────────────────────────────────────


class RoomModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель учебного кабинета.

    Attributes:
        name: Название/номер кабинета.
        capacity: Вместимость (количество мест).
        is_active: Флаг активности.
    """

    __tablename__ = "rooms"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ── Groups ────────────────────────────────────────────────────────────────────


class GroupModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель учебной группы.

    Группа привязана к направлению (direction_id) и может иметь
    кабинет по умолчанию. НЕ имеет полей subject_id и teacher_id —
    предмет и преподаватель привязаны к уроку, не к группе.

    Attributes:
        name: Название группы (например, "PY-101").
        direction_id: UUID направления обучения.
        room_id: UUID кабинета по умолчанию.
        schedule: Расписание в формате JSONB (опционально).
        max_students: Максимальное количество студентов.
        price_per_month: Стоимость обучения в месяц (UZS).
        started_at: Дата начала обучения группы.
        ended_at: Дата окончания обучения группы.
        is_active: Флаг активности.

    Note:
        НЕТ subject_id и teacher_id — они привязаны к урокам.
    """

    __tablename__ = "groups"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    direction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("directions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    room_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    schedule: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # type: ignore[type-arg]
    max_students: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_per_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    ended_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ── Enrollments ───────────────────────────────────────────────────────────────


class EnrollmentModel(Base, UUIDPrimaryKey):
    """ORM-модель зачисления студента в группу.

    Реализует связь многие-ко-многим между студентами и группами
    с возможностью отслеживания даты зачисления и отчисления.

    Attributes:
        student_id: UUID студента.
        group_id: UUID группы.
        enrolled_at: Дата и время зачисления (UTC).
        dropped_at: Дата и время отчисления/перевода (UTC, None если активен).
        is_active: Флаг активного зачисления.
    """

    __tablename__ = "enrollments"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    dropped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ── Lessons ───────────────────────────────────────────────────────────────────


class LessonModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель урока.

    Урок привязан к группе, предмету и преподавателю. Хранит
    дату/время, длительность, статус и тему. Предмет и преподаватель
    привязаны к уроку (НЕ к группе).

    Attributes:
        group_id: UUID группы (обязательно).
        subject_id: UUID предмета (nullable — для обратной совместимости).
        teacher_id: UUID преподавателя (nullable).
        room_id: UUID кабинета (nullable).
        scheduled_at: Дата и время начала (UTC, индексировано).
        duration_minutes: Длительность в минутах.
        status: Статус (scheduled, completed, cancelled).
        is_online: Флаг онлайн-урока.
        online_link: Ссылка на онлайн-урок.
        topic: Тема урока.
        cancel_reason: Причина отмены (если cancelled).

    Note:
        scheduled_at хранится в UTC. Для сравнения с локальным
        временем используйте только даты (now.date() vs sched.date()),
        не время — сервер в UTC, пользователь в UTC+5.
    """

    __tablename__ = "lessons"

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    room_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum("scheduled", "completed", "cancelled", name="lesson_status", create_type=False),
        nullable=False,
        default="scheduled",
        index=True,
    )
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    online_link: Mapped[str | None] = mapped_column(Text, nullable=True)
    topic: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(Text, nullable=True)


# ── Attendance ────────────────────────────────────────────────────────────────


class AttendanceRecordModel(Base, UUIDPrimaryKey):
    """ORM-модель записи посещаемости.

    Фиксирует статус присутствия студента на конкретном уроке.

    Attributes:
        lesson_id: UUID урока.
        student_id: UUID студента.
        status: Статус (present, absent, late, excused).
        minutes_late: Количество минут опоздания.
        note: Примечание.
        recorded_by: UUID записавшего (преподаватель).
        recorded_at: Дата и время записи (UTC).

    Note:
        НЕТ поля created_at — используется recorded_at.
    """

    __tablename__ = "attendance_records"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        SAEnum("present", "absent", "late", "excused", name="attendance_status", create_type=False),
        nullable=False,
        default="present",
    )
    minutes_late: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Grades ────────────────────────────────────────────────────────────────────


class GradeRecordModel(Base, UUIDPrimaryKey):
    """ORM-модель записи оценки.

    Хранит оценки всех типов: за уроки, экзамены, домашки и т.д.
    Связана как с уроком (lesson_id), так и с экзаменом (exam_id).

    Attributes:
        student_id: UUID студента.
        subject_id: UUID предмета (nullable).
        lesson_id: UUID урока (nullable — для урочных оценок).
        exam_id: UUID экзамена (nullable — для экзаменационных оценок).
        type: Тип оценки (homework, exam, quiz, project, participation).
        score: Набранный балл (Decimal, 1 знак после запятой).
        max_score: Максимальный балл (по умолчанию 10).
        comment: Комментарий преподавателя.
        graded_by: UUID преподавателя.
        graded_at: Дата и время выставления (UTC).

    Note:
        GPA вычисляется как avg(score / max_score * 10) по всем записям.
    """

    __tablename__ = "grade_records"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=True, index=True
    )
    exam_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=True, index=True
    )
    type: Mapped[str] = mapped_column(
        SAEnum("homework", "exam", "quiz", "project", "participation", name="grade_type", create_type=False),
        nullable=False,
        index=True,
    )
    score: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False)
    max_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 1), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    graded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Diamonds ──────────────────────────────────────────────────────────────────


class DiamondRecordModel(Base, UUIDPrimaryKey):
    """ORM-модель записи начисления бриллиантов.

    Фиксирует ручное начисление бриллиантов преподавателем
    на конкретном уроке.

    Attributes:
        lesson_id: UUID урока, на котором начислены бриллианты.
        student_id: UUID студента-получателя.
        amount: Количество бриллиантов.
        reason: Причина начисления (текст).
        awarded_by: UUID преподавателя-начислителя.
        awarded_at: Дата и время начисления (UTC).

    Note:
        Поле называется reason, НЕ note.
    """

    __tablename__ = "diamond_records"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    awarded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    awarded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


# ── Lesson Materials ──────────────────────────────────────────────────────────


class LessonMaterialModel(Base, UUIDPrimaryKey):
    """ORM-модель материала урока (файл, видео, ссылка).

    Attributes:
        lesson_id: UUID урока.
        title: Название материала.
        type: Тип (pdf, video, link, image, other).
        url: URL файла или ссылка.
        s3_key: Ключ в Google Cloud Storage.
        size_bytes: Размер файла в байтах.
        language: Язык (ru, en, uz).
        order: Порядок отображения.
        uploaded_by: UUID загрузившего.
        created_at: Дата загрузки.
        updated_at: Дата обновления.

    Note:
        Поля created_at/updated_at, НЕ uploaded_at.
        Есть s3_key для Google Cloud Storage.
    """

    __tablename__ = "lesson_materials"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(
        SAEnum("pdf", "video", "link", "image", "other", name="material_type", create_type=False),
        nullable=False,
        default="pdf",
    )
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    language: Mapped[str] = mapped_column(
        SAEnum("ru", "en", "uz", name="material_lang", create_type=False),
        nullable=False,
        default="ru",
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Homework Assignments ──────────────────────────────────────────────────────


class HomeworkAssignmentModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель домашнего задания (задание от преподавателя).

    Attributes:
        lesson_id: UUID урока, к которому привязано задание.
        title: Название задания.
        description: Описание задания.
        due_date: Дедлайн сдачи (UTC).
        max_score: Максимальный балл за задание.
        file_urls: JSONB с файлами задания [{url, filename, key}].
        created_by: UUID преподавателя, создавшего задание.

    Note:
        НЕТ поля type. file_urls — JSONB массив объектов.
    """

    __tablename__ = "homework_assignments"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 1), nullable=True)
    file_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # [{url, filename}]
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


# ── Homework Submissions ──────────────────────────────────────────────────────


class HomeworkSubmissionModel(Base, UUIDPrimaryKey):
    """ORM-модель ответа студента на домашнее задание.

    При создании задания автоматически создаются submission для
    всех зачисленных студентов со статусом "pending".

    Attributes:
        assignment_id: UUID домашнего задания.
        student_id: UUID студента.
        status: Статус (pending, submitted, graded, overdue).
        submitted_at: Дата и время сдачи (UTC).
        answer_text: Текст ответа.
        file_url: URL загруженного файла ответа.
        s3_key: Ключ файла в GCS.
        score: Оценка за работу.
        feedback: Обратная связь от преподавателя.
        graded_by: UUID проверившего преподавателя.
        graded_at: Дата и время проверки (UTC).

    Note:
        При submit статус всегда "submitted", даже если просрочено.
        Auto-overdue обновляет pending → overdue при запросе.
    """

    __tablename__ = "homework_submissions"

    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("homework_assignments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        SAEnum("pending", "submitted", "graded", "overdue", name="homework_status", create_type=False),
        nullable=False,
        default="pending",
        index=True,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[Decimal | None] = mapped_column(Numeric(4, 1), nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    graded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Late Entry Requests ───────────────────────────────────────────────────────


class LateEntryRequestModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель запроса на позднее внесение данных.

    Преподаватель создаёт запрос, когда окно ввода данных для урока
    закрылось (прошёл день урока). МУП/Директор одобряет или отклоняет.

    Attributes:
        student_id: UUID студента (опционально — может быть общий запрос).
        lesson_id: UUID урока, для которого запрашивается позднее внесение.
        reason: Причина запроса (обязательно).
        is_approved: True — одобрен, False — отклонён, None — на рассмотрении.
        reviewed_by: UUID рассмотревшего (МУП/Директор).
        reviewed_at: Дата и время рассмотрения (UTC).
    """

    __tablename__ = "late_entry_requests"

    student_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    is_approved: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Coin Transactions ─────────────────────────────────────────────────────────


class CoinTransactionModel(Base, UUIDPrimaryKey):
    """ORM-модель транзакции монет (устаревшая, заменена геймификацией).

    Attributes:
        student_id: UUID студента.
        amount: Количество монет (положительное или отрицательное).
        reason: Причина транзакции.
        issued_by: UUID выдавшего.
        created_at: Дата и время транзакции (UTC).
    """

    __tablename__ = "coin_transactions"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    issued_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


# ── MUP Tasks ─────────────────────────────────────────────────────────────────


class MupTaskModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель задачи МУП (менеджера учебного процесса).

    Задачи могут быть созданы вручную или автоматически (по событиям
    посещаемости, домашкам и т.д.). Поддерживают Kanban-статусы.

    Attributes:
        assigned_to: UUID назначенного пользователя.
        created_by: UUID создателя задачи.
        title: Заголовок задачи.
        description: Описание.
        due_date: Дата выполнения.
        is_done: Флаг завершённости.
        status: Статус (pending, in_progress, done, overdue).
        priority: Приоритет (low, medium, high).
        student_id: UUID связанного студента (для автозадач).
        category: Категория (для автозадач, например "attendance", "homework").
    """

    __tablename__ = "mup_tasks"

    assigned_to: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )
    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="medium",
        server_default="medium",
    )
    # Link to student if auto-generated
    student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Category for auto-generated tasks
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)


# ── LMS Notifications ─────────────────────────────────────────────────────────


class LmsNotificationModel(Base, UUIDPrimaryKey):
    """ORM-модель уведомления LMS.

    Attributes:
        user_id: UUID пользователя-получателя.
        type: Тип уведомления.
        title: Заголовок.
        body: Текст уведомления.
        is_read: Флаг прочитанности (индексировано).
        linked_lesson_id: UUID связанного урока.
        created_at: Дата и время создания (UTC).
    """

    __tablename__ = "lms_notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    linked_lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Compensation Models ───────────────────────────────────────────────────────


class CompensationModelModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель компенсации (схемы оплаты преподавателя).

    Определяет тип и ставку оплаты преподавателя с датой начала действия.

    Attributes:
        teacher_id: UUID преподавателя.
        type: Тип компенсации (per_lesson, fixed_monthly, per_student).
        rate: Ставка оплаты (Decimal).
        currency: Валюта (по умолчанию UZS).
        effective_from: Дата начала действия ставки.
        effective_until: Дата окончания действия (None = бессрочно).

    Note:
        Поля teacher_id, type, rate — НЕ name, params.
    """

    __tablename__ = "compensation_models"

    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(30), nullable=False)  # per_lesson, fixed_monthly, per_student
    rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="UZS")
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_until: Mapped[date | None] = mapped_column(Date, nullable=True)


# ── Exams ─────────────────────────────────────────────────────────────────────


class ExamModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель экзамена.

    Attributes:
        subject_id: UUID предмета (auto-resolved из уроков группы).
        group_id: UUID группы.
        title: Название экзамена.
        description: Описание.
        scheduled_at: Дата и время проведения (UTC).
        duration_minutes: Длительность в минутах.
        max_score: Максимальный балл (по умолчанию 12).
        created_by: UUID создателя.
    """

    __tablename__ = "exams"

    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True
    )
    group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_score: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False, default=12)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


# ── Salary Calculations ───────────────────────────────────────────────────────


class SalaryCalculationModel(Base, UUIDPrimaryKey):
    """ORM-модель расчёта зарплаты преподавателя за период.

    Attributes:
        teacher_id: UUID преподавателя.
        period_month: Месяц расчётного периода (1-12).
        period_year: Год расчётного периода.
        lessons_conducted: Количество проведённых уроков за период.
        base_amount: Базовая сумма (по ставке).
        bonus_amount: Бонус.
        total_amount: Итоговая сумма (base + bonus).
        currency: Валюта (по умолчанию UZS).
        is_paid: Флаг выплаты.
        paid_at: Дата и время выплаты (UTC).
        calculated_at: Дата и время расчёта (UTC).

    Note:
        Поля period_month, period_year — НЕ period_start.
    """

    __tablename__ = "salary_calculations"

    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    lessons_conducted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    base_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    bonus_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="UZS")
    is_paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    calculated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Payments ──────────────────────────────────────────────────────────────────


class PaymentModel(Base, UUIDPrimaryKey, TimestampMixin):
    """ORM-модель платежа (график оплаты обучения).

    Автоматически генерируется при создании договора. Поддерживает
    частичную оплату через paid_amount.

    Attributes:
        student_id: UUID студента.
        contract_id: UUID договора.
        group_id: UUID группы.
        description: Описание платежа.
        amount: Сумма к оплате (UZS).
        currency: Валюта (по умолчанию UZS).
        status: Статус (paid, pending, overdue).
        due_date: Дата платежа.
        paid_at: Дата и время фактической оплаты (UTC).
        method: Способ оплаты (наличные, карта, перевод, Payme, Click).
        paid_amount: Фактически оплаченная сумма (для частичной оплаты).
        period_number: Порядковый номер платежа в графике.
        receipt_url: URL квитанции.
        created_by: UUID создателя записи.

    Note:
        paid_amount — сколько реально оплачено (может быть < amount).
        Auto-overdue: pending с прошедшей due_date → overdue при запросе.
    """

    __tablename__ = "payments"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    contract_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True
    )
    group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="UZS")
    status: Mapped[str] = mapped_column(
        SAEnum("paid", "pending", "overdue", name="payment_status", create_type=False),
        nullable=False,
        default="pending",
        index=True,
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0, server_default="0")
    period_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    receipt_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


# ── Risk Factors ──────────────────────────────────────────────────────────────


class RiskFactorModel(Base, UUIDPrimaryKey):
    """ORM-модель фактора риска отчисления студента.

    Хранит результаты ML-скоринга с детализацией по категориям.

    Attributes:
        student_id: UUID студента.
        factor_type: Тип фактора (attendance, grades, homework, payment).
        value: Числовое значение фактора (0-100).
        details: Дополнительные данные в формате JSONB.
        computed_at: Дата и время расчёта (UTC).
    """

    __tablename__ = "risk_factors"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    factor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # type: ignore[type-arg]
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
