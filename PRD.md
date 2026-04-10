# Product Requirements Document
## EduPlatform — All-in-One Platform for Educational Centers

**Version:** 1.2
**Date:** 2026-03-25
**Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Users & Roles](#3-users--roles)
4. [System Architecture](#4-system-architecture)
5. [Module 1: CRM (Sales)](#5-module-1-crm-sales)
6. [Module 2: LMS (Learning Management)](#6-module-2-lms-learning-management)
7. [Module 3: Finance](#7-module-3-finance)
8. [Module 4: Student Portal](#8-module-4-student-portal)
9. [Cross-Module Features](#9-cross-module-features)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Out of Scope](#11-out-of-scope)
12. [Appendix A: Glossary](#appendix-a-glossary)
13. [Appendix B: Open Questions](#appendix-b-open-questions)

---

## 1. Overview

EduPlatform is a unified SaaS platform built specifically for educational centers. It consolidates sales pipelines, academic management, financial tracking, and student self-service into a single system with one shared database.

The platform is divided into three end-user portals that share a common data layer:

| Portal | Primary Users |
|---|---|
| CRM | Sales Managers, Director |
| LMS | Academic Managers (MUP), Teachers, Director |
| Student Portal | Students |

The Director has access to all three portals.

---

## 2. Goals & Success Metrics

### Business Goals
- Eliminate data silos between sales, academic, and finance teams
- Reduce manual work through automation (task creation, debt tracking, risk scoring)
- Provide real-time visibility to the Director across all operations

### Key Success Metrics
- Lead-to-student conversion rate
- Teacher attendance compliance rate (% of lessons marked on time)
- Student payment on-time rate
- Average homework completion rate
- MUP response time on late-entry requests

---

## 3. Users & Roles

### 3.1 Role Definitions

| Role | Russian Name | Description |
|---|---|---|
| Director | Директор | Full access to all modules and analytics |
| Academic Manager | МУП (Менеджер учебного процесса) | Manages schedules, groups, teachers, student progress |
| Sales Manager | МПП (Менеджер по продажам) | Works in CRM with leads and deals |
| Cashier-Accountant | Кассир-Бухгалтер | Records and manages all payments |
| Teacher | Преподаватель | Conducts lessons, grades students, reviews homework |
| Student | Студент | Accesses schedule, materials, grades via Student Portal |

### 3.2 Access Matrix

| Feature Area | Director | MUP | Sales Manager | Cashier | Teacher | Student |
|---|---|---|---|---|---|---|
| CRM | Full | No | Full | No | No | No |
| LMS — Schedule (all) | Full | Full | No | No | Own only | Own only |
| LMS — Students (all) | Full | Full | No | No | Own groups | No |
| LMS — Lessons | Full | Full | No | No | Own lessons | View |
| Finance — Payments | Full | View (debt alerts) | No | Full | No | Own |
| Finance — Salaries | Full | No | No | No | Own | No |
| Student Portal | N/A | N/A | N/A | N/A | N/A | Full |
| Analytics | Full | LMS only | CRM only | Finance only | No | No |

---

## 4. System Architecture

### 4.1 Shared Data Model (Conceptual)

```
Educational Structure:
  Direction (Направление)
    └── Subject (Предмет)
          └── Group (Группа)
                └── Students (Студенты)

People:
  User (base entity with role)
    ├── Director
    ├── Academic Manager (MUP)
    ├── Sales Manager
    ├── Cashier-Accountant
    ├── Teacher (+ compensation model)
    └── Student (+ coin wallet)

Lessons:
  Lesson → Group + Teacher + Room + Subject + DateTime
    ├── Attendance records
    ├── Grades
    ├── Diamonds → Coins (gamification)
    ├── Materials
    └── Homework

Finance:
  Student → Payment Schedule → Payment Transactions
  Teacher → Compensation Model → Salary Calculations

CRM:
  Funnel → Stages → Leads → Activities → Tasks
```

### 4.2 Key Design Principles
- Single database — no data duplication between modules
- Role-based access control enforced at API level
- All mutations are logged with user + timestamp
- Automation triggers are event-driven (not polling)
- Risk scores recalculated once daily (nightly batch)

---

## 5. Module 1: CRM (Sales)

**Access:** Director, Sales Manager

### 5.1 Funnels

- The system supports **multiple independent sales funnels**
- Each funnel has its own stages (configurable, with drag-and-drop ordering)
- There is one **global unified funnel** used for cross-funnel analytics only
- **Only the Director** can create, rename, or archive funnels

### 5.2 Lead Sources

- Lead sources are fully configurable (add, rename, deactivate)
- Supported intake methods:
  - Manual entry by a manager
  - Bulk CSV import
  - API integration (webhook-based, per source)
- Each lead has a `source` field that references a configured source

#### 5.2.1 Sources Management UI (Settings)

The **Settings → Sources** screen provides full CRUD for lead sources:

| Action | Who | Notes |
|---|---|---|
| Create source | Director | Name + type (manual / import / api) |
| Rename source | Director | Inline edit |
| Activate / Deactivate | Director | Toggle; deactivated sources are hidden in lead form dropdowns |
| Delete source | Director | Only if no leads reference this source |
| Copy webhook URL | Director, Sales Manager | For API-type sources |
| Regenerate webhook secret | Director | Invalidates previous secret immediately |

- **Settings page uses tabs:** "Воронки" and "Источники" (avoids separate navigation items for two closely related settings)
- API-type sources auto-generate a webhook URL and a secret on creation
- Source types: `manual` (managers enter leads by hand), `import` (bulk CSV), `api` (webhook integration)

### 5.3 Lead Object

A lead contains:

| Field | Notes |
|---|---|
| Full Name | Required |
| Phone / Email | At least one required |
| Source | Dropdown from configured sources |
| Funnel | Which funnel this lead belongs to |
| Stage | Current stage within the funnel |
| Assigned Manager | The responsible sales manager |
| Custom Fields | Per-funnel configurable fields (see below) |
| Status | Active / Won / Lost |
| Lost Reason | Required if status = Lost |
| Created At | Auto |
| Updated At | Auto |

#### Custom Fields per Funnel
- **Only the Director** can add/remove/reorder custom fields per funnel
- Field types: text, number, date, dropdown (single/multi), checkbox
- Custom fields are visible in the lead card and in list/kanban views (configurable columns)

### 5.4 Lead Activities & History

For each lead, the following is tracked:

- **Activity log** (immutable timeline):
  - Calls (date, duration, outcome, notes)
  - Meetings (date, location/format, outcome, notes)
  - Messages (channel: WhatsApp/Telegram/email/etc., content summary)
  - Other interactions (free-form type + notes)
- **Stage change history** (who moved it, when, from/to)
- **Assignment history** (who was assigned, when changed)
- **Comments** (any team member with CRM access can add)

### 5.5 Task Management for Sales Managers

#### Task Object
| Field | Notes |
|---|---|
| Title | Required |
| Description | Optional |
| Linked Lead | Optional |
| Assigned To | Sales Manager |
| Due Date | Required |
| Priority | Low / Medium / High / Critical |
| Status | Pending / In Progress / Done / Overdue |
| Reminder | Date+time for in-app notification |

#### Automatic Task Creation
Tasks are auto-created when:
- A new lead is assigned to a manager → "Make initial contact"
- A lead has had no activity for X days (configurable per funnel)
- A manager logs a call/meeting and marks it "Follow-up needed"

#### Task Form — Assignee & Linked Lead

- **Assigned To** — dropdown populated from the list of active Sales Managers (and Director). Not a free-text ID field. Fetched from `GET /crm/users?role=sales_manager`.
- **Linked Lead** — searchable combobox: user types a name or phone number, results appear inline (debounced, min 2 chars). Shows lead name + phone + current stage. Not a free-text ID field.

#### Task Views
- Personal task board (Kanban by status) for each manager
- Calendar view (day/week/month)
- Director sees all managers' tasks with filter by manager

### 5.6 Lead Stages & Conversion

- Each stage has a configurable name and color
- A lead can be moved between stages manually (drag in Kanban) or via stage-change button
- Conversion rates are calculated between each consecutive stage pair
- A lead marked "Lost" must have a reason selected from a configurable list

### 5.7 Lead → Student Conversion

- **Only a Sales Manager** can trigger conversion (manually, after marking lead as Won)
- System prompts to create a Student profile, pre-filling data from the lead
- The converted lead is linked to the student record
- CRM retains the lead for analytics; LMS creates the student

### 5.8 Contacts Directory

A dedicated **Contacts** page provides a unified address book view of all leads in the system.

**Access:** Director, Sales Manager

#### Purpose
- Quickly find any person by name, phone, or email without opening the full leads board
- See contact history at a glance
- Jump to the full lead detail in one click

#### Columns / Card fields

| Field | Notes |
|---|---|
| Full Name | Clickable → Lead Detail page |
| Phone | Click to copy |
| Email | Click to copy |
| Source | Badge |
| Stage | Color-coded stage badge |
| Status | Active / Won / Lost badge |
| Assigned Manager | Avatar + name |
| Last Activity | Relative date |
| Created At | Date |

#### Search & Filters
- Global search: name, phone, email (debounced 300 ms)
- Filter by status (Active / Won / Lost)
- Filter by source
- Filter by assigned manager (Director only)
- Sort by: Name, Created At, Last Activity

#### View modes
- Table view (default) — dense, all columns visible
- Card view — larger cards showing more contact detail

#### Business rules
- Read-only directory — edits happen via Lead Detail page
- Contacts = all leads regardless of funnel or stage

---

### 5.9 CRM Analytics

**Time period filters:** Today, Yesterday, This Week, This Month, Custom Range

#### Dashboard Widgets

| Widget | Description |
|---|---|
| Total Tasks | Count for period |
| Completed Tasks | Count + % of total |
| Overdue Tasks | Count + list |
| Total Leads | New leads created in period |
| Lead Sources Chart | Pie/bar chart: count per source |
| Deals by Manager | Table: manager → leads won, revenue |
| Average Response Time | Time from lead creation to first activity |
| Sales Forecast | Projected revenue based on open leads × stage win probability |

#### Detailed Analytics

| Metric | Description |
|---|---|
| Funnel Conversion | % conversion between each stage pair |
| Time to Close | Average days from lead creation to Won |
| Touches to Close | Average number of activities before Won |
| Loss Reasons | Breakdown of Lost leads by reason |
| Manager Efficiency | Leads handled, won rate, avg response time per manager |
| Revenue by Manager | Won deal value attributed to each manager |

---

## 6. Module 2: LMS (Learning Management)

**Access:** Director, MUP (full), Teacher (own scope), Student (own scope via Portal)

### 6.1 Educational Structure

```
Direction (Направление)
  e.g., Frontend Development, Design, Marketing

  └── Subject (Предмет)
        e.g., HTML/CSS, JavaScript, React

        └── Group (Группа)
              - Fixed student roster
              - Fixed schedule template
              - Has one primary Teacher per Subject

              └── Student Enrollment
```

- A student can be enrolled in **multiple directions simultaneously**
- Lesson conflicts across directions for the same student are automatically detected and blocked
- Groups are created by MUP and have a defined start/end date

### 6.2 Schedule Management

**Who creates:** MUP

#### Single Lesson Entry
MUP fills in:
- Direction
- Subject
- Group
- Teacher
- Room (Кабинет)
- Date
- Start time / End time

#### Bulk Schedule Creation
- MUP can create a recurring schedule template for a group:
  - Select days of week (Mon–Sun)
  - Select time slot
  - Select date range (e.g., 2026-04-01 to 2026-06-30)
  - System generates all lessons at once
- MUP can edit or delete individual lessons from the generated set

#### Conflict Detection (automatic, real-time)
The system checks and blocks scheduling if:
- The **teacher** is already assigned to another lesson at the same time
- The **room** is already booked at the same time
- Any **student in the group** has a lesson in another group at the same time

If a conflict is detected, the system shows which specific teacher/room/student is conflicting.

#### Schedule Views
- **Kanban by weekday** (Mon–Sun columns), each cell = time slot, cards = lessons
- Filters: by Teacher, by Room, by Group, by Date range, by Direction
- Color coding by Direction or Subject (configurable)
- MUP sees all lessons; Teacher sees only their own; Student sees only their own

### 6.3 Lesson Execution

**Who conducts:** Teacher

#### During a Lesson (accessible from lesson start until 23:59 same day)

The teacher fills in:

**1. Attendance** (required to mark lesson as "Conducted")
Per student:
- On time (Вовремя)
- Late (Опоздал)
- Absent (Отсутствует)

**2. Lesson Topic** (required to mark lesson as "Conducted")
- Free-text field

**3. Grades** (optional per student, 1–10 scale)
- If grade < 6: comment is mandatory

**4. Diamond Award** (optional)
- Pool: 5 diamonds per lesson total
- Max 3 diamonds to any single student
- Teacher distributes diamonds to motivate students
- Awarded diamonds are immediately converted to coins in the student's wallet (see Section 6.10)

**5. Materials**
- Attach files (PDF, images, video links, etc.) — max 200 MB per file
- Add links (external URLs)

**6. Homework Assignment** (optional)
- Description text
- Attach files or links — max 200 MB per file
- Deadline date

#### Lesson Status
| Status | Condition |
|---|---|
| Scheduled | Default, lesson in future |
| In Progress | Current day, within time window |
| Conducted | Attendance + Topic filled, time window passed |
| Incomplete | Time window passed, attendance or topic missing |
| Cancelled | MUP cancels a lesson |

#### Late Entry Request
If a teacher did not mark attendance/topic on the lesson day:
1. Teacher submits a "Late Entry Request" with a comment explaining why
2. MUP receives a notification and reviews the request
3. MUP approves or rejects with a comment
4. If approved: teacher can fill in the lesson data (all fields unlocked temporarily)
5. If rejected: lesson stays Incomplete

### 6.4 Homework Management

#### Homework Lifecycle

```
Assigned (by teacher)
  └── Not Submitted (default state for student)
  └── Submitted (student uploads work)
        └── Reviewed (teacher grades + comments)
        └── Not Reviewed (pending teacher review)
```

#### Teacher View
- List of all submitted homework for their students
- Filters: by Group, by Subject, by Status (submitted/not reviewed)
- Per submission: view files, grade (1–10), write feedback comment
- Overdue submissions highlighted

#### Student View (in Student Portal)
- See all assigned homework
- Submit files or links (max 200 MB per file)
- View grade and feedback after review

### 6.5 Reports

#### Teacher Reports
Available to the teacher for their own data:
- Worked hours in period (sum of lesson durations with status = Conducted)
- Lessons conducted (count, list)
- Homework reviewed (count, pending count)
- Salary calculation breakdown for the period (see Section 7.7)

#### MUP / Director Reports

**Teacher Reports (all teachers):**
- Worked hours per teacher per period
- Incomplete lessons per teacher
- Late entry request rate per teacher
- Salary totals per teacher (Director only)

**Group Reports:**
- Attendance summary: % present per lesson, per student
- Absent students list per lesson
- Homework completion: submitted/not submitted per student per assignment

**Homework Reports:**
- Total assigned in period
- Total submitted
- Total reviewed by teacher
- Total not yet reviewed (backlog)

### 6.6 Student Management

#### Who Sees What
| Action | Teacher | MUP | Director |
|---|---|---|---|
| See student list | Own groups only | All | All |
| Edit student data | No | Yes | Yes |
| Move student between groups | No | Yes | Yes |
| Bulk edit | No | Yes | Yes |

#### Student Filters
- By Direction
- By Group
- By Name / Phone
- By Risk Status

#### Student Profile
The student profile contains:

| Section | Fields |
|---|---|
| Personal Info | Name, phone, email, date of birth, photo |
| Parent/Guardian | Name, phone, relationship |
| Enrollments | Active directions, groups, subjects |
| Academic | Grades per subject, GPA, attendance %, homework completion % |
| Gamification | Total coins, badge level, diamond history |
| Financial | Payment schedule, paid amount, debt amount, payment history |
| Risk Status | Current risk level + contributing factors |
| Activity Log | Key events (enrollment, group transfer, payments, alerts) |

### 6.7 Student Risk System

Each student has an automatically calculated **Risk Status**, recalculated **once daily** (nightly batch):

| Status | Color | Meaning |
|---|---|---|
| Normal | Green | No concerns |
| At Risk | Yellow | Some warning signs |
| Critical | Red | Immediate attention needed |

#### Risk Calculation Factors

| Factor | Trigger: Yellow | Trigger: Red |
|---|---|---|
| Attendance | < 70% over last 2 weeks | < 50% over last 2 weeks |
| Grades | Average < 6 over last 5 lessons | Average < 4 over last 5 lessons |
| Homework | > 2 missed HW in a row | > 4 missed HW in a row |
| Payment | Any overdue debt | Debt overdue > 1 month |

The final status is the highest triggered level across all factors.

### 6.8 MUP Task System

MUP has a personal task board (similar in structure to Sales Manager tasks but focused on academic issues).

#### Automatic Task Creation Triggers

| Trigger | Task Created |
|---|---|
| Student missed 2+ consecutive lessons | "Contact student: [Name] — missed lessons" |
| Student has 3+ unsubmitted homeworks | "Follow up on homework: [Name]" |
| Student has unpaid debt (detected in daily batch) | "Payment follow-up: [Name]" |
| Student risk status changes to Critical | "Critical student alert: [Name]" |
| Teacher submits Late Entry Request | "Review late entry request: [Teacher] — [Lesson]" |

Tasks have: title, linked student/teacher, due date, priority, status, notes.

### 6.9 Management Operations

Operations available to MUP and Director:

| Operation | Description |
|---|---|
| Create Direction | Add new направление |
| Create Subject | Add subject under a direction |
| Create Group | Create group, assign direction + subject, set start/end |
| Enroll Student | Add student to a group |
| Transfer Student | Move student from one group to another (with effective date) |
| Bulk Edit | Select multiple students → edit field (e.g., group, status) |
| Archive Group | Close a group at end of term |

### 6.10 Diamond & Coin Gamification System

#### Overview

Gamification uses two units:
- **Diamonds** — per-lesson tokens awarded by the teacher
- **Coins** — the student's permanent cumulative wallet, fed by diamonds

The teacher thinks in diamonds (simple, per-lesson). The student sees their growing coin balance.

#### Diamond Award Rules (per lesson)
- Total pool per lesson: **5 diamonds**
- Max per single student: **3 diamonds**
- Teacher distributes freely within these constraints
- Diamonds must be awarded during the lesson window (same rules as attendance)

#### Diamond → Coin Conversion
- 1 diamond = **10 coins**
- Conversion happens immediately when the teacher submits the lesson
- Coins are added to the student's cumulative wallet and never expire
- Coins are never subtracted (no penalty system)

#### Badge Levels (based on total accumulated coins)

| Badge | Coin Threshold | Description |
|---|---|---|
| — | 0–99 | No badge yet |
| Bronze | 100–299 | Consistent effort |
| Silver | 300–599 | Strong performer |
| Gold | 600–999 | Top student |
| Platinum | 1000+ | Elite |

#### Leaderboard
- Available per Group and per Direction
- Period filters: This Week, This Month, All Time
- Shows: rank, student full name, coins earned in period, badge
- Visible to: MUP, Teacher (own groups), Student (own group/direction — full names shown)

#### Visibility
- Student profile (LMS): total coins, badge, diamond history per lesson
- Student Portal: coin wallet, badge, leaderboard position
- Teacher: can see coins per student in their groups (to understand motivation context)

### 6.11 Teacher Compensation Configuration

Teacher compensation is configured per teacher by the Director or MUP. Each teacher is assigned **one compensation model**:

#### Model A: Per-Lesson Rate
- Rate is defined **per teacher per subject**
- The same teacher can have different rates for different subjects
- Example: Teacher Alisher — Hardware subject: 120,000 UZS/lesson; HTML subject: 200,000 UZS/lesson
- Salary for a period = sum of (lessons conducted × rate per subject)

#### Model B: Fixed Monthly Salary
- A fixed amount per calendar month
- Defined individually per teacher
- Does not depend on number of lessons or students
- Partial month pro-rated if teacher starts/ends mid-month (configurable)

#### Model C: Per-Student Rate
- Rate defined per teacher (one rate applies to all their students)
- Salary = number of active students in teacher's groups × rate per student
- Calculated monthly based on enrolled students at the time of calculation

#### Hybrid Models
A teacher can have **multiple models active simultaneously**. Examples:
- Fixed monthly base + per-student bonus
- Per-lesson rate + fixed monthly top-up

When hybrid, the total salary = sum of all active model calculations for the period.

#### Configuration Rules
- Director or MUP can view and edit each teacher's compensation setup
- Changes take effect from the next month (cannot be backdated)
- History of model changes is logged

> Salary **payment** (disbursement to teacher) is outside the system scope — the Finance module tracks student income only. Teacher compensation is tracked for reporting/calculation purposes only.

---

## 7. Module 3: Finance

**Access:** Director (full), Cashier-Accountant (full), MUP (view debt info only)

### 7.1 Payment Recording

The Cashier records a payment by:
1. Selecting a student
2. Selecting the direction/course being paid for
3. Entering the amount
4. Selecting payment method: Cash / Card / Bank Transfer
5. Setting payment date (defaults to today, can be backdated)
6. Adding an optional comment

Each payment creates an **immutable record** in the payment history. Corrections are made via reversal entries only (see Section 7.5).

### 7.2 Payment Schedule

When a student is enrolled, a payment schedule is configured:

| Schedule Type | Description |
|---|---|
| One-time | Full payment due on a specific date |
| Monthly | Fixed amount due on the Nth day of each month |

The schedule defines:
- Expected payment amounts and due dates
- Links each expected payment to a specific enrollment/direction

### 7.3 Payment Status

The system automatically calculates and updates payment status per student:

| Status | Condition |
|---|---|
| Paid | Total paid ≥ total owed to date |
| Partially Paid | Total paid > 0 but < total owed to date |
| In Debt | A due date has passed with insufficient payment |

Debt is calculated as: `total owed to date − total paid`

### 7.4 Student Financial Profile

Visible in the student profile and in the cashier's student view:

- Total course cost
- Total paid
- Outstanding balance (debt)
- Full payment history (date, amount, method, cashier who recorded, comment)
- Next payment due date and amount

### 7.5 Payment Reversal

- Only the **Director** can create a reversal entry
- A reversal is a new negative transaction linked to the original payment record
- The original record is never deleted or modified
- Both original and reversal are visible in payment history

### 7.6 Finance Automation

| Trigger | Automated Action |
|---|---|
| Payment due date passes with unpaid balance (detected in daily batch) | System marks debt; creates MUP task "Payment overdue: [Student]" |
| Payment recorded that clears all debt | Debt status cleared; linked MUP task auto-closed |

> Note: Risk score recalculation (which incorporates debt status) runs once daily as a nightly batch, not immediately on payment.

### 7.7 Teacher Salary Reports

The system calculates teacher salary based on their configured compensation models (see Section 6.11) and conducted lessons data from LMS.

#### Calculation Trigger
- The **Director manually triggers** salary calculation for a selected period (typically month-end)
- Once triggered, a salary snapshot is created and locked for that period
- Re-calculation for the same period is only possible if the Director explicitly resets it

#### Per-Teacher Salary Report
Shows for a selected period:
- Active compensation models
- Lessons conducted (for Model A: broken down by subject with rate per subject)
- Active students count (for Model C)
- Calculated salary total per model + grand total

#### All-Teachers Salary Summary (Director only)
- Table: teacher name, active models, calculated salary total
- Period filter: month/custom range
- Exportable to CSV

Teachers can see their own salary calculation breakdown in their LMS profile.

### 7.8 Financial Analytics

#### Director Dashboard

| Metric | Description |
|---|---|
| Total Revenue | Sum of all student payments in period |
| Revenue by Direction/Course | Breakdown per direction |
| Revenue by Period | Line/bar chart over selected time range |
| Total Outstanding Debt | Sum of all unpaid balances |
| Debt by Student | Ranked list of highest debtors |
| Total Calculated Teacher Salaries | Sum of all teacher salary calculations for period |

#### Cashier Dashboard

| Metric | Description |
|---|---|
| Payments Recorded Today | Count and total amount |
| Payments in Period | Total received in selected period |
| Breakdown by Method | Cash / Card / Transfer split |

**Period filters:** Today, Yesterday, This Week, This Month, Custom Range

---

## 8. Module 4: Student Portal

> **Status: Requirements Pending**
> The Student Portal requirements will be defined in a separate session and added to this document as Section 8.

**Confirmed scope (from system overview):**
- Students access the Portal as a separate interface
- Data is shared from the same database (LMS + Finance)
- Students can view their own schedule, grades, homework, payment info
- Students can submit homework
- Students can view their coin wallet, badge level, and leaderboard

---

## 9. Cross-Module Features

### 9.1 Notifications

All users receive **in-app notifications only** (v1 — no email or SMS):
- New task assigned to them
- Task approaching deadline (configurable reminder)
- Task overdue
- Late Entry Request status changed (for Teachers)
- Late Entry Request submitted (for MUP)
- Payment overdue (for MUP)
- Student risk status changed to Critical (for MUP)

> Email and SMS notification channels are planned for v2.

### 9.2 Global Search

From any module, users can search by:
- Student name / phone
- Lead name / phone
- Teacher name
- Group name

Results link directly to the relevant profile.

### 9.3 Activity & Audit Log

All critical actions are logged system-wide:
- Who did what, on which record, at what time
- Accessible to Director in an audit trail view
- Cannot be deleted or modified

---

## 10. Non-Functional Requirements

### 10.1 Performance
- Dashboard and list views load in < 2 seconds for up to 1,000 concurrent users
- Schedule conflict checks return results in < 500ms

### 10.2 Security
- Role-based access control enforced server-side (not just UI-level)
- All API endpoints require authentication
- Sensitive data (payments, personal info) encrypted at rest
- HTTPS enforced for all traffic

### 10.3 Data Integrity
- Payments are immutable once recorded (corrections via Director-only reversal entries)
- Attendance records locked after lesson window closes (except via approved Late Entry Request)
- Grades and diamond records tied to specific lesson instances
- Salary calculations are read-only outputs derived from LMS lesson data

### 10.4 Availability
- Target uptime: 99.5% monthly
- Scheduled maintenance during off-peak hours (2:00–5:00 AM local time)
- Nightly batch jobs (risk score, debt detection, salary calc) run at 2:00 AM local time

### 10.5 Branch Support

v1 supports a **single branch** per installation. Multi-branch support (multiple locations of the same center) is deferred to v2.

### 10.6 Localization
- Primary language: Russian
- Date/time: local timezone per center (configurable)
- Currency: local (configurable symbol and format)

---

## 11. Out of Scope (v1.0)

The following are explicitly out of scope for the first version:

- Mobile native apps (iOS/Android) — web responsive only
- Video conferencing / online lessons integration
- Parent portal (parents are contact-only data in student profiles)
- Multi-branch management (single installation = single branch; planned for v2)
- Marketplace or course catalog for external enrollment
- Teacher salary disbursement tracking (salary is calculated, not paid through the system)
- Email and SMS notifications (in-app only for v1)

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| МУП | Менеджер учебного процесса — Academic/Learning Process Manager |
| МПП | Менеджер по продажам — Sales Manager |
| Направление | Direction — top-level educational track (e.g., Frontend, Design) |
| Предмет | Subject — specific topic within a direction (e.g., HTML, CSS) |
| Группа | Group — fixed cohort of students with a fixed schedule |
| Алмазы (Diamonds) | Per-lesson gamification tokens awarded by teacher (max 3 per student, pool of 5) |
| Монеты (Coins) | Cumulative student wallet — 1 diamond = 10 coins; never expire |
| Риск | Risk — automated daily student health score based on attendance, grades, homework, payment |
| Late Entry Request | Request from teacher to enter lesson data after the allowed same-day time window |
| Compensation Model | Teacher salary calculation method: per-lesson rate, fixed monthly, or per-student rate |

---

## Appendix B: Open Questions

1. **Student Portal** — full requirements TBD in next session
