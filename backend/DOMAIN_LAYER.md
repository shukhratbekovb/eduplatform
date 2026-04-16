# EduPlatform — Domain Layer Class Diagram

> Clean Architecture: **Domain** слой не зависит ни от чего внешнего.  
> Здесь только Entity, Value Object, Domain Service, Repository Interface, Domain Event.

---

## Структура Domain Layer

```
domain/
├── user/
│   ├── entities.py          # User
│   ├── value_objects.py     # Email, PasswordHash, UserRole
│   ├── repository.py        # IUserRepository (interface)
│   └── events.py            # UserCreated, UserRoleChanged
│
├── student/
│   ├── entities.py          # Student, RiskFactors
│   ├── value_objects.py     # RiskLevel, BadgeLevel, StudentStats
│   ├── repository.py        # IStudentRepository
│   ├── services.py          # RiskCalculationService
│   └── events.py            # StudentCreated, RiskLevelChanged, BadgeLevelChanged
│
├── academic/
│   ├── entities.py          # Direction, Subject, Room, Group, Enrollment
│   ├── value_objects.py     # DateRange, Color
│   ├── repository.py        # IDirectionRepository, ISubjectRepository, IRoomRepository, IGroupRepository, IEnrollmentRepository
│   └── events.py            # GroupCreated, StudentEnrolled, StudentTransferred
│
├── lesson/
│   ├── entities.py          # Lesson, AttendanceRecord, GradeRecord, DiamondRecord, LessonMaterial
│   ├── value_objects.py     # LessonStatus, AttendanceStatus, TimeSlot, LessonWindow
│   ├── repository.py        # ILessonRepository, IAttendanceRepository, IGradeRepository
│   ├── services.py          # LessonWindowService, LessonStatusService
│   └── events.py            # LessonConducted, LessonCancelled, LessonIncomplete
│
├── homework/
│   ├── entities.py          # HomeworkAssignment, HomeworkSubmission
│   ├── value_objects.py     # HomeworkStatus, DueDate
│   ├── repository.py        # IHomeworkRepository, ISubmissionRepository
│   └── events.py            # HomeworkSubmitted, HomeworkReviewed, HomeworkOverdue
│
├── finance/
│   ├── entities.py          # Payment, CompensationModel, SalaryCalculation
│   ├── value_objects.py     # Money, Period, PaymentStatus, CompensationModelType
│   ├── repository.py        # IPaymentRepository, ICompensationRepository, ISalaryRepository
│   ├── services.py          # SalaryCalculationService
│   └── events.py            # PaymentRecorded, SalaryCalculated
│
├── gamification/
│   ├── entities.py          # CoinTransaction
│   ├── value_objects.py     # DiamondCount, CoinAmount
│   ├── repository.py        # ICoinTransactionRepository
│   ├── services.py          # CoinService
│   └── events.py            # CoinsEarned, BadgeUpgraded
│
├── exam/
│   ├── entities.py          # Exam
│   ├── value_objects.py     # ExamStatus, TimeSlot
│   ├── repository.py        # IExamRepository
│   └── events.py            # ExamCreated, ExamStatusChanged
│
├── task/
│   ├── entities.py          # MupTask
│   ├── value_objects.py     # TaskStatus, TaskPriority
│   ├── repository.py        # ITaskRepository
│   └── events.py            # TaskCreated, TaskStatusChanged
│
├── notification/
│   ├── entities.py          # Notification
│   ├── value_objects.py     # NotificationType
│   ├── repository.py        # INotificationRepository
│   └── services.py          # NotificationDispatchService
│
└── late_request/
    ├── entities.py          # LateEntryRequest
    ├── value_objects.py     # LateRequestStatus
    ├── repository.py        # ILateRequestRepository
    └── events.py            # LateRequestCreated, LateRequestReviewed
```

---

## Class Diagrams

### 1. USER Aggregate

```
┌─────────────────────────────────────────┐
│              <<Entity>>                 │
│                User                     │
├─────────────────────────────────────────┤
│ - id: UUID                              │
│ - email: Email                          │  ← Value Object
│ - password_hash: PasswordHash           │  ← Value Object
│ - name: str                             │
│ - role: UserRole                        │  ← Value Object (Enum)
│ - avatar_url: str | None                │
│ - is_active: bool                       │
│ - created_at: datetime                  │
│ - updated_at: datetime                  │
├─────────────────────────────────────────┤
│ + change_role(new_role: UserRole)       │
│ + deactivate()                          │
│ + activate()                            │
│ + verify_password(plain: str) → bool    │
│ + update_avatar(url: str)               │
└─────────────────────────────────────────┘

┌───────────────────────────┐
│       <<Value Object>>    │
│           Email           │
├───────────────────────────┤
│ - value: str              │
├───────────────────────────┤
│ + validate() → bool       │
└───────────────────────────┘

┌───────────────────────────┐
│       <<Value Object>>    │
│        PasswordHash       │
├───────────────────────────┤
│ - hash: str               │
├───────────────────────────┤
│ + from_plain(pwd) → self  │
│ + verify(plain) → bool    │
└───────────────────────────┘

<<Enum>> UserRole
  director | mup | teacher | sales_manager | cashier | student
```

---

### 2. STUDENT Aggregate

```
┌───────────────────────────────────────────────────┐
│                   <<Entity>>                      │
│                    Student                        │
├───────────────────────────────────────────────────┤
│ - id: UUID                                        │
│ - user_id: UUID | None                            │
│ - full_name: str                                  │
│ - phone: str | None                               │
│ - email: str | None                               │
│ - date_of_birth: date | None                      │
│ - photo_url: str | None                           │
│ - parent_name: str | None                         │
│ - parent_phone: str | None                        │
│ - is_active: bool                                 │
│ - risk_level: RiskLevel                           │
│ - risk_last_updated: datetime | None              │
│ - total_coins: int                                │
│ - badge_level: BadgeLevel                         │
│ - gpa: Decimal | None                             │
│ - attendance_percent: Decimal | None              │
│ - created_at: datetime                            │
├───────────────────────────────────────────────────┤
│ + add_coins(amount: int, reason: str) → CoinTransaction   │
│ + update_risk(level: RiskLevel)                   │
│ + recalculate_badge()                             │
│ + update_stats(gpa, attendance)                   │
│ + deactivate()                                    │
└───────────────────────────────────────────────────┘
         │ 1
         │ has
         │ 0..1
┌─────────────────────────┐
│      <<Entity>>         │
│      RiskFactors        │
├─────────────────────────┤
│ - student_id: UUID      │
│ - attendance_score: RiskLevel │
│ - grades_score: RiskLevel     │
│ - homework_score: RiskLevel   │
│ - payment_score: RiskLevel    │
│ - overall_risk: RiskLevel     │
│ - calculated_at: datetime     │
│ - details: RiskDetails        │  ← Value Object
├─────────────────────────┤
│ + recalculate()         │
└─────────────────────────┘

┌──────────────────────────────────────────────┐
│              <<Value Object>>                │
│                 RiskDetails                  │
├──────────────────────────────────────────────┤
│ - attendance_percent_14d: float              │
│ - avg_grade_last_5: float                    │
│ - missed_homework_streak: int                │
│ - debt_days: int                             │
└──────────────────────────────────────────────┘

<<Enum>> RiskLevel     : normal | at_risk | critical
<<Enum>> BadgeLevel    : none | bronze | silver | gold | platinum

┌──────────────────────────────────────────────┐
│           <<Domain Service>>                 │
│          RiskCalculationService              │
├──────────────────────────────────────────────┤
│ + calculate(student_id: UUID) → RiskFactors  │
│   — reads attendance, grades, homework,      │
│     payments; writes back to risk_factors    │
└──────────────────────────────────────────────┘
```

---

### 3. ACADEMIC Aggregate

```
┌──────────────────────────────────┐
│           <<Entity>>             │
│           Direction              │
├──────────────────────────────────┤
│ - id: UUID                       │
│ - name: str                      │
│ - description: str | None        │
│ - color: Color                   │  ← Value Object
│ - is_archived: bool              │
│ - created_at: datetime           │
├──────────────────────────────────┤
│ + archive()                      │
│ + unarchive()                    │
└──────────────────────────────────┘
        │ 1
        │ has many
        │ *
┌──────────────────────────────────┐
│           <<Entity>>             │
│            Subject               │
├──────────────────────────────────┤
│ - id: UUID                       │
│ - direction_id: UUID             │
│ - name: str                      │
│ - description: str | None        │
│ - is_archived: bool              │
├──────────────────────────────────┤
│ + archive()                      │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│           <<Entity>>             │
│              Room                │
├──────────────────────────────────┤
│ - id: UUID                       │
│ - name: str                      │
│ - capacity: int | None           │
│ - is_active: bool                │
├──────────────────────────────────┤
│ + deactivate()                   │
│ + activate()                     │
└──────────────────────────────────┘

┌──────────────────────────────────────────┐
│              <<Entity>>                  │
│                Group                     │
├──────────────────────────────────────────┤
│ - id: UUID                               │
│ - name: str                              │
│ - direction_id: UUID                     │
│ - subject_id: UUID                       │
│ - teacher_id: UUID                       │
│ - date_range: DateRange                  │  ← Value Object
│ - is_archived: bool                      │
│ - created_at: datetime                   │
├──────────────────────────────────────────┤
│ + archive()                              │
│ + reassign_teacher(teacher_id: UUID)     │
│ + change_subject(subject_id: UUID)       │
└──────────────────────────────────────────┘
        │ 1
        │ has many
        │ *
┌──────────────────────────────────────────┐
│              <<Entity>>                  │
│             Enrollment                   │
├──────────────────────────────────────────┤
│ - id: UUID                               │
│ - student_id: UUID                       │
│ - group_id: UUID                         │
│ - enrolled_at: datetime                  │
│ - transferred_from: UUID | None          │
│ - status: EnrollmentStatus               │
├──────────────────────────────────────────┤
│ + complete()                             │
│ + drop()                                 │
│ + transfer(new_group_id: UUID)           │
└──────────────────────────────────────────┘

┌──────────────────────────────────┐
│        <<Value Object>>          │
│           DateRange              │
├──────────────────────────────────┤
│ - start_date: date               │
│ - end_date: date                 │
├──────────────────────────────────┤
│ + is_active() → bool             │
│ + overlaps(other: DateRange)     │
└──────────────────────────────────┘

<<Enum>> EnrollmentStatus : active | completed | dropped
```

---

### 4. LESSON Aggregate

```
┌──────────────────────────────────────────────────┐
│                  <<Entity>>                      │
│                   Lesson                         │
├──────────────────────────────────────────────────┤
│ - id: UUID                                       │
│ - group_id: UUID                                 │
│ - teacher_id: UUID                               │
│ - subject_id: UUID | None                        │
│ - room_id: UUID | None                           │
│ - time_slot: TimeSlot                            │  ← Value Object
│ - topic: str | None                              │
│ - status: LessonStatus                           │
│ - is_recurring: bool                             │
│ - series_id: UUID | None                         │
│ - cancel_reason: str | None                      │
│ - created_at: datetime                           │
├──────────────────────────────────────────────────┤
│ + conduct(topic, attendance, grades, diamonds)   │
│ + cancel(reason: str)                            │
│ + mark_incomplete()                              │
│ + is_editable() → bool                           │
│ + edit_window_end() → datetime                   │
└──────────────────────────────────────────────────┘
    │ 1                    │ 1
    │ has many             │ has many
    │ *                    │ *
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  AttendanceRecord│  │   GradeRecord    │  │  DiamondRecord   │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ lesson_id: UUID  │  │ lesson_id: UUID  │  │ lesson_id: UUID  │
│ student_id: UUID │  │ student_id: UUID │  │ student_id: UUID │
│ status: Attendance│ │ grade: int(1-10) │  │ diamonds: int(1-3│
│ note: str | None │  │ comment: str|None│  └──────────────────┘
└──────────────────┘  └──────────────────┘

┌────────────────────────────────┐
│         <<Value Object>>       │
│            TimeSlot            │
├────────────────────────────────┤
│ - date: date                   │
│ - start_time: time             │
│ - end_time: time               │
├────────────────────────────────┤
│ + start_datetime() → datetime  │
│ + end_datetime() → datetime    │
│ + duration_minutes() → int     │
│ + overlaps(other: TimeSlot)    │
└────────────────────────────────┘

┌────────────────────────────────────────┐
│           <<Domain Service>>           │
│          LessonWindowService           │
├────────────────────────────────────────┤
│ EDIT_WINDOW_HOURS = 3                  │
│                                        │
│ + is_editable(lesson: Lesson) → bool   │
│ + window_end(lesson: Lesson) → datetime│
│ + needs_late_request(lesson) → bool    │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│           <<Domain Service>>           │
│         LessonStatusService            │
├────────────────────────────────────────┤
│ + compute_status(lesson: Lesson)       │
│       → LessonStatus                   │
│ + mark_incomplete_batch(date: date)    │
└────────────────────────────────────────┘

<<Enum>> LessonStatus    : scheduled | in_progress | conducted | incomplete | cancelled
<<Enum>> AttendanceStatus: on_time | late | absent
```

---

### 5. HOMEWORK Aggregate

```
┌──────────────────────────────────────────┐
│              <<Entity>>                  │
│          HomeworkAssignment              │
├──────────────────────────────────────────┤
│ - id: UUID                               │
│ - lesson_id: UUID                        │
│ - group_id: UUID                         │
│ - title: str                             │
│ - description: str | None               │
│ - due_date: date                         │
│ - created_at: datetime                   │
├──────────────────────────────────────────┤
│ + is_overdue() → bool                    │
└──────────────────────────────────────────┘
        │ 1
        │ has many
        │ *
┌──────────────────────────────────────────┐
│              <<Entity>>                  │
│          HomeworkSubmission              │
├──────────────────────────────────────────┤
│ - id: UUID                               │
│ - assignment_id: UUID                    │
│ - student_id: UUID                       │
│ - submitted_at: datetime | None          │
│ - status: HomeworkStatus                 │
│ - file_url: str | None                   │
│ - comment: str | None                    │
│ - grade: int | None                      │
│ - feedback: str | None                   │
│ - reviewed_at: datetime | None           │
│ - reviewed_by: UUID | None               │
├──────────────────────────────────────────┤
│ + submit(file_url, comment)              │
│ + review(grade, feedback, reviewer_id)   │
│ + mark_overdue()                         │
└──────────────────────────────────────────┘

<<Enum>> HomeworkStatus : not_submitted | submitted | reviewed | overdue
```

---

### 6. FINANCE Aggregate

```
┌───────────────────────────────────────────────┐
│                  <<Entity>>                   │
│                  Payment                      │
├───────────────────────────────────────────────┤
│ - id: UUID                                    │
│ - student_id: UUID                            │
│ - amount: Money                               │  ← Value Object
│ - month: Period                               │  ← Value Object
│ - status: PaymentStatus                       │
│ - paid_at: datetime | None                    │
│ - description: str                            │
│ - recorded_by: UUID | None                    │
│ - created_at: datetime                        │
├───────────────────────────────────────────────┤
│ + mark_paid(recorded_by: UUID)                │
│ + mark_overdue()                              │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│                  <<Entity>>                   │
│            CompensationModel                  │
├───────────────────────────────────────────────┤
│ - id: UUID                                    │
│ - teacher_id: UUID                            │
│ - model_type: CompensationModelType           │
│ - is_hybrid: bool                             │
│ - rate_per_lesson: dict[str, Decimal] | None  │
│ - fixed_monthly_rate: Decimal | None          │
│ - rate_per_student: dict[str, Decimal] | None │
│ - effective_from: date                        │
├───────────────────────────────────────────────┤
│ + calculate_for_period(period: Period,        │
│     lessons: list[Lesson]) → Decimal          │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│                  <<Entity>>                   │
│           SalaryCalculation                   │
├───────────────────────────────────────────────┤
│ - id: UUID                                    │
│ - teacher_id: UUID                            │
│ - period: Period                              │
│ - amount: Money                               │
│ - breakdown: list[SalaryBreakdownItem]        │
│ - is_locked: bool                             │
│ - calculated_at: datetime                     │
├───────────────────────────────────────────────┤
│ + lock()                                      │
└───────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                  <<Domain Service>>                    │
│              SalaryCalculationService                  │
├────────────────────────────────────────────────────────┤
│ + calculate(teacher_id: UUID, period: Period)          │
│       → SalaryCalculation                              │
│   — reads compensation model + conducted lessons       │
└────────────────────────────────────────────────────────┘

┌──────────────────────────┐   ┌──────────────────────────┐
│    <<Value Object>>      │   │    <<Value Object>>       │
│         Money            │   │         Period            │
├──────────────────────────┤   ├──────────────────────────┤
│ - amount: Decimal        │   │ - year: int               │
│ - currency: str = 'KZT'  │   │ - month: int              │
├──────────────────────────┤   ├──────────────────────────┤
│ + add(other) → Money     │   │ + to_str() → "YYYY-MM"   │
│ + __str__() → "25000 ₸"  │   │ + prev() → Period         │
└──────────────────────────┘   │ + next() → Period         │
                               └──────────────────────────┘

<<Enum>> PaymentStatus         : paid | pending | overdue
<<Enum>> CompensationModelType : per_lesson | fixed_monthly | per_student
```

---

### 7. GAMIFICATION Aggregate

```
┌──────────────────────────────────────────┐
│              <<Entity>>                  │
│           CoinTransaction                │
├──────────────────────────────────────────┤
│ - id: UUID                               │
│ - student_id: UUID                       │
│ - amount: int                            │
│ - reason: str                            │
│ - lesson_id: UUID | None                 │
│ - created_at: datetime                   │
└──────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│               <<Domain Service>>                   │
│                 CoinService                        │
├────────────────────────────────────────────────────┤
│ DIAMONDS_TO_COINS = 10   (1 diamond = 10 coins)    │
│ BADGE_THRESHOLDS = {bronze:100, silver:300,        │
│                    gold:600, platinum:1000}         │
│                                                    │
│ + award_for_diamonds(student, lesson, diamonds)    │
│       → CoinTransaction                            │
│ + recalculate_badge(student: Student) → BadgeLevel │
└────────────────────────────────────────────────────┘
```

---

### 8. LATE REQUEST Aggregate

```
┌──────────────────────────────────────────────┐
│                <<Entity>>                    │
│            LateEntryRequest                  │
├──────────────────────────────────────────────┤
│ - id: UUID                                   │
│ - lesson_id: UUID                            │
│ - teacher_id: UUID                           │
│ - reason: str                                │
│ - status: LateRequestStatus                  │
│ - reviewed_by: UUID | None                   │
│ - review_note: str | None                    │
│ - reviewed_at: datetime | None               │
│ - created_at: datetime                       │
├──────────────────────────────────────────────┤
│ + approve(reviewer_id: UUID, note: str)      │
│ + reject(reviewer_id: UUID, note: str)       │
└──────────────────────────────────────────────┘

<<Enum>> LateRequestStatus : pending | approved | rejected
```

---

### 9. EXAM Aggregate

```
┌──────────────────────────────────────────┐
│              <<Entity>>                  │
│                 Exam                     │
├──────────────────────────────────────────┤
│ - id: UUID                               │
│ - title: str                             │
│ - group_id: UUID                         │
│ - time_slot: TimeSlot                    │
│ - room_id: UUID | None                   │
│ - description: str | None               │
│ - status: ExamStatus                     │
│ - created_by: UUID                       │
│ - created_at: datetime                   │
├──────────────────────────────────────────┤
│ + start()                                │
│ + complete()                             │
│ + cancel()                              │
└──────────────────────────────────────────┘

<<Enum>> ExamStatus : upcoming | in_progress | completed | cancelled
```

---

### 10. TASK Aggregate

```
┌──────────────────────────────────────────┐
│              <<Entity>>                  │
│               MupTask                    │
├──────────────────────────────────────────┤
│ - id: UUID                               │
│ - title: str                             │
│ - description: str | None               │
│ - status: TaskStatus                     │
│ - priority: TaskPriority                 │
│ - due_date: date | None                  │
│ - assigned_to: UUID                      │
│ - created_by: UUID                       │
│ - created_at: datetime                   │
├──────────────────────────────────────────┤
│ + move_to(status: TaskStatus)            │
│ + is_overdue() → bool                    │
└──────────────────────────────────────────┘

<<Enum>> TaskStatus   : pending | in_progress | done
<<Enum>> TaskPriority : low | medium | high
```

---

### 11. NOTIFICATION Aggregate

```
┌──────────────────────────────────────────────────┐
│                 <<Entity>>                       │
│               Notification                       │
├──────────────────────────────────────────────────┤
│ - id: UUID                                       │
│ - user_id: UUID                                  │
│ - type: NotificationType                         │
│ - title: str                                     │
│ - body: str                                      │
│ - is_read: bool                                  │
│ - linked_id: UUID | None                         │
│ - created_at: datetime                           │
├──────────────────────────────────────────────────┤
│ + mark_read()                                    │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│              <<Domain Service>>                  │
│          NotificationDispatchService             │
├──────────────────────────────────────────────────┤
│ + notify_late_request_result(request, user)      │
│ + notify_risk_changed(student, old, new)         │
│ + notify_homework_due(assignment, students)      │
│ + notify_task_assigned(task, user)               │
└──────────────────────────────────────────────────┘

<<Enum>> NotificationType :
  lesson_reminder | late_request_approved | late_request_rejected |
  homework_due | task_assigned | risk_level_changed
```

---

## Repository Interfaces (Domain Contracts)

```python
# domain/user/repository.py
class IUserRepository(ABC):
    async def get_by_id(self, id: UUID) -> User | None
    async def get_by_email(self, email: str) -> User | None
    async def get_all(self, role: UserRole | None) -> list[User]
    async def save(self, user: User) -> User
    async def delete(self, id: UUID) -> None

# domain/student/repository.py
class IStudentRepository(ABC):
    async def get_by_id(self, id: UUID) -> Student | None
    async def list(self, filters: StudentFilters) → PaginatedResult[Student]
    async def save(self, student: Student) -> Student
    async def update_stats(self, id: UUID, gpa, attendance) -> None

# domain/academic/repository.py
class IGroupRepository(ABC):
    async def get_by_id(self, id: UUID) -> Group | None
    async def list(self, filters: GroupFilters) -> list[Group]
    async def save(self, group: Group) -> Group

class IEnrollmentRepository(ABC):
    async def get_by_student_group(self, student_id, group_id) -> Enrollment | None
    async def list_by_student(self, student_id: UUID) -> list[Enrollment]
    async def save(self, enrollment: Enrollment) -> Enrollment

# domain/lesson/repository.py
class ILessonRepository(ABC):
    async def get_by_id(self, id: UUID) -> Lesson | None
    async def list(self, filters: LessonFilters) -> list[Lesson]
    async def save(self, lesson: Lesson) -> Lesson
    async def create_bulk(self, lessons: list[Lesson]) -> list[Lesson]
    async def get_full(self, id: UUID) -> LessonFull  # with attendance/grades/diamonds

# domain/finance/repository.py
class IPaymentRepository(ABC):
    async def get_by_id(self, id: UUID) -> Payment | None
    async def list(self, filters: PaymentFilters) -> list[Payment]
    async def save(self, payment: Payment) -> Payment
```

---

## Domain Events

```
UserCreated(user_id, email, role, timestamp)
UserRoleChanged(user_id, old_role, new_role, timestamp)

StudentCreated(student_id, full_name, timestamp)
RiskLevelChanged(student_id, old_level, new_level, timestamp)
BadgeLevelChanged(student_id, old_level, new_level, timestamp)
CoinsEarned(student_id, amount, reason, lesson_id, timestamp)

StudentEnrolled(student_id, group_id, timestamp)
StudentTransferred(student_id, from_group_id, to_group_id, timestamp)

LessonConducted(lesson_id, teacher_id, group_id, date, timestamp)
LessonCancelled(lesson_id, teacher_id, reason, timestamp)
LessonMarkedIncomplete(lesson_id, date, timestamp)

HomeworkSubmitted(submission_id, student_id, assignment_id, timestamp)
HomeworkReviewed(submission_id, grade, reviewer_id, timestamp)
HomeworkOverdue(assignment_id, group_id, timestamp)

PaymentRecorded(payment_id, student_id, amount, month, timestamp)
PaymentOverdue(student_id, month, amount, timestamp)

LateRequestCreated(request_id, lesson_id, teacher_id, timestamp)
LateRequestReviewed(request_id, status, reviewer_id, timestamp)

SalaryCalculated(teacher_id, period, amount, timestamp)
TaskStatusChanged(task_id, old_status, new_status, timestamp)
ExamStatusChanged(exam_id, new_status, timestamp)
```
