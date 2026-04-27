"""Сущности домена LMS (Learning Management System).

Этот модуль определяет все доменные сущности и перечисления подсистемы
управления обучением. Включает сущности для управления студентами,
направлениями, предметами, кабинетами, группами, уроками и платежами.

Архитектурные решения:
    - Группа (Group) НЕ имеет subject_id и teacher_id — предмет
      и преподаватель привязаны к уроку (Lesson).
    - Студент (Student) является корнем агрегата с поддержкой
      геймификации (звёзды, бриллианты, уровень значка).
    - Платёж (Payment) использует value object Money для суммы.
    - Все сущности наследуются от AggregateRoot для поддержки
      доменных событий.

Типичное использование:
    student = Student.create(full_name="Алиев Шахзод")
    lesson = Lesson.create(
        group_id=group.id,
        lesson_date=date.today(),
        start_time="09:00",
        end_time="10:30",
    )
    lesson.conduct(topic="Введение в Python")
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from src.domain.lms.events import (
    LessonCancelledEvent,
    LessonConductedEvent,
    StudentRiskChangedEvent,
)
from src.domain.shared.entity import AggregateRoot
from src.domain.shared.value_objects import Money, TimeRange

# ── Enums ─────────────────────────────────────────────────────────────────────


class RiskLevel(StrEnum):
    """Уровень риска отчисления студента.

    Определяется на основе ML-модели (вероятность отчисления)
    или fallback-логики на основе посещаемости и GPA.

    Attributes:
        LOW: Низкий риск — студент в норме.
        MEDIUM: Средний риск — требуется внимание преподавателя.
        HIGH: Высокий риск — требуется вмешательство МУП.
        CRITICAL: Критический риск — срочное вмешательство директора.
    """

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class BadgeLevel(StrEnum):
    """Уровень значка студента в системе геймификации.

    Значок автоматически повышается при накоплении определённого
    количества звёзд: Bronze(0) -> Silver(100) -> Gold(300)
    -> Platinum(600) -> Diamond(1000).

    Attributes:
        BRONZE: Бронзовый значок (начальный уровень, 0+ звёзд).
        SILVER: Серебряный значок (100+ звёзд).
        GOLD: Золотой значок (300+ звёзд).
        PLATINUM: Платиновый значок (600+ звёзд).
        DIAMOND: Бриллиантовый значок (1000+ звёзд).
    """

    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"


class LessonStatus(StrEnum):
    """Статус урока в расписании.

    Attributes:
        SCHEDULED: Урок запланирован, ещё не проведён.
        COMPLETED: Урок проведён (conduct выполнен).
        CANCELLED: Урок отменён с указанием причины.
    """

    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AttendanceStatus(StrEnum):
    """Статус посещаемости студента на уроке.

    Attributes:
        PRESENT: Студент присутствовал (+5 звёзд геймификации).
        ABSENT: Студент отсутствовал (0 баллов).
        LATE: Студент опоздал (-2 звезды геймификации).
        EXCUSED: Уважительная причина отсутствия.
    """

    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class GradeType(StrEnum):
    """Тип оценки в журнале.

    Attributes:
        CLASS: Оценка за работу на уроке.
        INDEPENDENT: Оценка за самостоятельную работу.
        CONTROL: Оценка за контрольную работу.
        THEMATIC: Тематическая оценка.
        HOMEWORK: Оценка за домашнее задание.
    """

    CLASS = "class"
    INDEPENDENT = "independent"
    CONTROL = "control"
    THEMATIC = "thematic"
    HOMEWORK = "homework"


class HomeworkStatus(StrEnum):
    """Статус домашнего задания студента.

    Attributes:
        PENDING: Задание назначено, ожидает выполнения.
        SUBMITTED: Задание сдано студентом (даже если с опозданием).
        REVIEWED: Задание проверено преподавателем, оценка выставлена.
        OVERDUE: Срок сдачи истёк, задание не сдано.
    """

    PENDING = "pending"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    OVERDUE = "overdue"


class PaymentStatus(StrEnum):
    """Статус платежа по договору.

    Attributes:
        PAID: Платёж полностью оплачен.
        PENDING: Платёж ожидает оплаты (срок ещё не наступил).
        OVERDUE: Просроченный платёж (срок оплаты истёк).
    """

    PAID = "paid"
    PENDING = "pending"
    OVERDUE = "overdue"


# ── Student ───────────────────────────────────────────────────────────────────


@dataclass
class Student(AggregateRoot):
    """Сущность студента — корень агрегата.

    Основная сущность подсистемы LMS, представляющая студента
    учебного центра. Содержит персональные данные, академическую
    статистику и данные геймификации.

    Студент создаётся автоматически при оформлении договора в CRM
    (contract -> student account auto-creation). Связан с User
    через user_id для аутентификации в студенческом портале.

    Attributes:
        full_name: Полное имя студента (ФИО).
        phone: Номер телефона студента.
        email: Электронная почта студента.
        date_of_birth: Дата рождения.
        photo_url: URL фотографии студента.
        parent_name: Имя родителя/опекуна.
        parent_phone: Телефон родителя/опекуна.
        student_code: Уникальный код студента.
        user_id: Связь с учётной записью User (для аутентификации).
        is_active: Флаг активности (отчисленные — False).
        risk_level: Текущий уровень риска отчисления.
        total_coins: Общее количество монет (устаревшее поле).
        stars: Количество звёзд (основная валюта геймификации).
        crystals: Количество бриллиантов (премиальная валюта).
        badge_level: Текущий уровень значка геймификации.
        gpa: Средний балл (10-балльная шкала: avg(score/max_score*10)).
        attendance_percent: Процент посещаемости (0-100).

    Example:
        >>> student = Student.create(full_name="Каримова Дилноза")
        >>> student.add_stars(10)
        >>> student.stars
        10
        >>> student.recalculate_risk()
    """

    full_name: str = ""
    phone: str | None = None
    email: str | None = None
    date_of_birth: date | None = None
    photo_url: str | None = None
    parent_name: str | None = None
    parent_phone: str | None = None
    student_code: str | None = None
    user_id: UUID | None = None
    is_active: bool = True
    risk_level: RiskLevel = RiskLevel.LOW
    total_coins: int = 0
    stars: int = 0
    crystals: int = 0
    badge_level: BadgeLevel = BadgeLevel.BRONZE
    gpa: Decimal | None = None
    attendance_percent: Decimal | None = None

    @classmethod
    def create(cls, full_name: str, **kwargs: object) -> "Student":
        """Фабричный метод создания нового студента.

        Args:
            full_name: Полное имя студента (обязательное поле).
            **kwargs: Дополнительные атрибуты студента (phone,
                email, date_of_birth, parent_name, parent_phone и т.д.).

        Returns:
            Student: Новый экземпляр студента с уникальным UUID.
        """
        return cls(full_name=full_name, **kwargs)  # type: ignore[arg-type]

    def recalculate_risk(self) -> None:
        """Пересчитывает уровень риска отчисления студента.

        Использует RiskCalculationPolicy для определения нового
        уровня риска на основе текущей посещаемости и GPA.
        Если уровень изменился — генерирует доменное событие
        StudentRiskChangedEvent.

        Примечание:
            Импорт RiskCalculationPolicy выполняется внутри метода
            для избежания циклических зависимостей.
        """
        from src.domain.lms.policies import RiskCalculationPolicy

        old = self.risk_level
        new = RiskCalculationPolicy.calculate(self.attendance_percent, self.gpa)

        if new != old:
            self.risk_level = new
            self.add_event(
                StudentRiskChangedEvent(
                    student_id=self.id,
                    old_level=old,
                    new_level=new,
                )
            )

    def add_stars(self, amount: int) -> None:
        """Начисляет звёзды студенту.

        Звёзды — основная валюта геймификации, начисляются за
        посещаемость, оценки и домашние задания.

        Args:
            amount: Количество звёзд для начисления.
                Игнорируется, если amount <= 0.
        """
        if amount > 0:
            self.stars += amount

    def add_crystals(self, amount: int) -> None:
        """Начисляет бриллианты студенту.

        Бриллианты — премиальная валюта геймификации, начисляются
        за серии посещений и вручную преподавателем.

        Args:
            amount: Количество бриллиантов для начисления.
                Игнорируется, если amount <= 0.
        """
        if amount > 0:
            self.crystals += amount

    def add_coins(self, amount: int) -> None:
        """Начисляет монеты студенту (устаревший метод).

        Args:
            amount: Количество монет (может быть отрицательным).
        """
        self.total_coins += amount


# ── Direction / Subject / Room ────────────────────────────────────────────────


@dataclass
class Direction(AggregateRoot):
    """Направление обучения (например, Python, JavaScript, Data Science).

    Направление — верхний уровень иерархии учебного процесса.
    К направлению привязаны предметы и группы.

    Attributes:
        name: Название направления.
        description: Описание направления (опционально).
        is_active: Флаг активности направления.
    """

    name: str = ""
    description: str | None = None
    is_active: bool = True

    @classmethod
    def create(cls, name: str, description: str | None = None) -> "Direction":
        """Фабричный метод создания нового направления.

        Args:
            name: Название направления.
            description: Описание направления (опционально).

        Returns:
            Direction: Новый экземпляр направления.
        """
        return cls(name=name, description=description)


@dataclass
class Subject(AggregateRoot):
    """Учебный предмет, привязанный к направлению.

    Предмет принадлежит одному направлению и назначается
    конкретному уроку (не группе). Преподаватель автоматически
    определяется по назначенным ему предметам.

    Attributes:
        name: Название предмета.
        direction_id: Идентификатор направления, к которому
            относится предмет.
        description: Описание предмета (опционально).
        is_active: Флаг активности предмета.
    """

    name: str = ""
    direction_id: UUID | None = None
    description: str | None = None
    is_active: bool = True

    @classmethod
    def create(cls, name: str, direction_id: UUID | None = None) -> "Subject":
        """Фабричный метод создания нового предмета.

        Args:
            name: Название предмета.
            direction_id: Идентификатор направления (опционально).

        Returns:
            Subject: Новый экземпляр предмета.
        """
        return cls(name=name, direction_id=direction_id)


@dataclass
class Room(AggregateRoot):
    """Учебный кабинет (аудитория).

    Используется для привязки урока к физическому помещению
    и проверки конфликтов по кабинету при составлении расписания.

    Attributes:
        name: Название или номер кабинета.
        capacity: Вместимость кабинета (количество мест).
        is_active: Флаг активности кабинета.
    """

    name: str = ""
    capacity: int | None = None
    is_active: bool = True

    @classmethod
    def create(cls, name: str, capacity: int | None = None) -> "Room":
        """Фабричный метод создания нового кабинета.

        Args:
            name: Название или номер кабинета.
            capacity: Вместимость (опционально).

        Returns:
            Room: Новый экземпляр кабинета.
        """
        return cls(name=name, capacity=capacity)


# ── Group ─────────────────────────────────────────────────────────────────────


@dataclass
class Group(AggregateRoot):
    """Учебная группа студентов.

    Группа объединяет студентов для совместного обучения.
    Важно: группа НЕ имеет полей subject_id и teacher_id —
    предмет и преподаватель привязаны к конкретному уроку (Lesson),
    а не к группе.

    Группа имеет direction_id (привязка к направлению) на уровне
    модели БД, но не на уровне доменной сущности.

    Attributes:
        name: Название группы (например, "PY-101", "JS-201").
        start_date: Дата начала обучения.
        end_date: Дата окончания обучения.
        schedule: Расписание в формате JSON (дни недели, время).
        is_active: Флаг активности группы.
    """

    name: str = ""
    start_date: date | None = None
    end_date: date | None = None
    schedule: dict | None = None  # type: ignore[type-arg]
    is_active: bool = True

    @classmethod
    def create(cls, name: str) -> "Group":
        """Фабричный метод создания новой группы.

        Args:
            name: Название группы.

        Returns:
            Group: Новый экземпляр группы.
        """
        return cls(name=name)


# ── Lesson ────────────────────────────────────────────────────────────────────


@dataclass
class Lesson(AggregateRoot):
    """Учебный урок (занятие).

    Центральная сущность расписания. Урок привязан к группе,
    предмету, преподавателю и кабинету. Может быть частью серии
    (recurring) для массового создания по дням недели.

    Жизненный цикл: SCHEDULED -> COMPLETED (conduct) или CANCELLED.

    При проведении урока (conduct) генерируется событие
    LessonConductedEvent, которое запускает пересчёт посещаемости,
    начисление геймификационных баллов и обновление GPA.

    Attributes:
        group_id: Идентификатор группы.
        subject_id: Идентификатор предмета (nullable).
        teacher_id: Идентификатор преподавателя (nullable).
        room_id: Идентификатор кабинета (nullable).
        lesson_date: Дата проведения урока.
        start_time: Время начала в формате "HH:MM".
        end_time: Время окончания в формате "HH:MM".
        status: Текущий статус урока (scheduled/completed/cancelled).
        is_online: Флаг онлайн-урока.
        topic: Тема урока (заполняется при conduct).
        is_recurring: Является ли частью серии.
        series_id: Идентификатор серии уроков.
        cancel_reason: Причина отмены (заполняется при cancel).

    Example:
        >>> lesson = Lesson.create(
        ...     group_id=uuid4(),
        ...     lesson_date=date(2026, 4, 24),
        ...     start_time="09:00",
        ...     end_time="10:30",
        ...     teacher_id=teacher.id,
        ...     subject_id=subject.id,
        ... )
        >>> lesson.conduct(topic="Циклы и итераторы")
        >>> lesson.status
        <LessonStatus.COMPLETED: 'completed'>
    """

    group_id: UUID = field(default_factory=UUID)  # type: ignore[call-arg]
    subject_id: UUID | None = None
    teacher_id: UUID | None = None
    room_id: UUID | None = None
    lesson_date: date = field(default_factory=date.today)
    start_time: str = "19:00"
    end_time: str = "20:30"
    status: LessonStatus = LessonStatus.SCHEDULED
    is_online: bool = False
    topic: str | None = None
    is_recurring: bool = False
    series_id: UUID | None = None
    cancel_reason: str | None = None

    @classmethod
    def create(
        cls,
        group_id: UUID,
        lesson_date: date,
        start_time: str,
        end_time: str,
        **kwargs: object,
    ) -> "Lesson":
        """Фабричный метод создания нового урока.

        Выполняет валидацию временного диапазона через value object
        TimeRange перед созданием экземпляра.

        Args:
            group_id: Идентификатор группы (обязательное поле).
            lesson_date: Дата проведения урока.
            start_time: Время начала в формате "HH:MM".
            end_time: Время окончания в формате "HH:MM".
            **kwargs: Дополнительные атрибуты (subject_id, teacher_id,
                room_id, is_online, topic и т.д.).

        Returns:
            Lesson: Новый экземпляр урока со статусом SCHEDULED.

        Raises:
            ValueError: Если формат времени неверный или start >= end.
        """
        TimeRange(start_time, end_time)  # validate
        return cls(
            group_id=group_id,
            lesson_date=lesson_date,
            start_time=start_time,
            end_time=end_time,
            **kwargs,  # type: ignore[arg-type]
        )

    def conduct(self, topic: str | None = None) -> None:
        """Проводит урок — переводит в статус COMPLETED.

        Фиксирует тему урока и генерирует доменное событие
        LessonConductedEvent для запуска побочных эффектов
        (пересчёт посещаемости, начисление баллов).

        Важно: проводить может только преподаватель, только
        в день урока (до 23:59). После дня урока требуется
        одобренный запрос МУП.

        Args:
            topic: Тема проведённого урока (опционально).

        Raises:
            ValueError: Если урок не в статусе SCHEDULED.
        """
        if self.status != LessonStatus.SCHEDULED:
            raise ValueError(f"Cannot conduct lesson with status {self.status}")
        self.status = LessonStatus.COMPLETED
        self.topic = topic
        self.add_event(
            LessonConductedEvent(
                lesson_id=self.id,
                group_id=self.group_id,
                teacher_id=self.teacher_id,
            )
        )

    def cancel(self, reason: str) -> None:
        """Отменяет урок с указанием причины.

        Генерирует доменное событие LessonCancelledEvent.
        Нельзя отменить уже проведённый урок.

        Args:
            reason: Причина отмены (обязательное поле, не может
                быть пустой строкой).

        Raises:
            ValueError: Если урок уже проведён (COMPLETED)
                или причина не указана.
        """
        if self.status == LessonStatus.COMPLETED:
            raise ValueError("Cannot cancel a completed lesson")
        if not reason.strip():
            raise ValueError("Cancel reason is required")
        self.status = LessonStatus.CANCELLED
        self.cancel_reason = reason
        self.add_event(
            LessonCancelledEvent(
                lesson_id=self.id,
                group_id=self.group_id,
                reason=reason,
            )
        )


# ── Payment ───────────────────────────────────────────────────────────────────


@dataclass
class Payment(AggregateRoot):
    """Платёж студента по договору.

    Представляет запланированный или совершённый платёж по
    контракту студента. Платежи автоматически генерируются
    при создании контракта (график платежей).

    Жизненный цикл: PENDING -> PAID (при оплате)
                     PENDING -> OVERDUE (при просрочке)

    Attributes:
        student_id: Идентификатор студента-плательщика.
        enrollment_id: Идентификатор зачисления (связь с контрактом).
        period: Период оплаты (текстовое описание).
        description: Дополнительное описание платежа.
        amount: Сумма платежа (value object Money, по умолчанию UZS).
        status: Текущий статус платежа (paid/pending/overdue).
        due_date: Крайний срок оплаты.

    Example:
        >>> payment = Payment.create(
        ...     student_id=student.id,
        ...     period="Март 2026",
        ...     amount=Decimal("1500000"),
        ...     due_date=date(2026, 3, 15),
        ... )
        >>> payment.mark_paid()
        >>> payment.status
        <PaymentStatus.PAID: 'paid'>
    """

    student_id: UUID = field(default_factory=UUID)  # type: ignore[call-arg]
    enrollment_id: UUID | None = None
    period: str = ""
    description: str | None = None
    amount: Money = field(default_factory=lambda: Money(Decimal("0")))
    status: PaymentStatus = PaymentStatus.PENDING
    due_date: date | None = None

    @classmethod
    def create(
        cls,
        student_id: UUID,
        period: str,
        amount: Decimal,
        currency: str = "UZS",
        due_date: date | None = None,
    ) -> "Payment":
        """Фабричный метод создания нового платежа.

        Args:
            student_id: Идентификатор студента.
            period: Период оплаты (например, "Март 2026").
            amount: Сумма платежа (Decimal для точности).
            currency: Код валюты (по умолчанию "UZS").
            due_date: Крайний срок оплаты (опционально).

        Returns:
            Payment: Новый платёж со статусом PENDING.

        Raises:
            ValueError: Если сумма отрицательная.
        """
        return cls(
            student_id=student_id,
            period=period,
            amount=Money(amount, currency),
            due_date=due_date,
        )

    def mark_paid(self) -> None:
        """Помечает платёж как полностью оплаченный.

        Переводит статус в PAID. Может быть вызван из любого
        статуса (PENDING или OVERDUE).
        """
        self.status = PaymentStatus.PAID

    def mark_overdue(self) -> None:
        """Помечает платёж как просроченный.

        Переводит статус из PENDING в OVERDUE.
        Если платёж уже оплачен (PAID) — статус не изменяется.
        """
        if self.status == PaymentStatus.PENDING:
            self.status = PaymentStatus.OVERDUE
