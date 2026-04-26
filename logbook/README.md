# Logbook (LMS) — Teacher's Journal

Web application for managing the educational process: schedule, attendance, grades, homework, analytics, reports.

**Port:** 3001 | **URL:** http://localhost:3001

## Roles

| Role | Access |
|------|--------|
| Director | Full access + finances + settings |
| Academic Manager (MUP) | Educational process management + tasks + analytics |
| Teacher | Own lessons, students, homework, schedule |
| Cashier | Finances + reports |

## Technologies

| Library | Version | Purpose |
|-----------|--------|-----------|
| Next.js | 14.2.29 | React framework (App Router, SSR) |
| React | ^18.3 | UI library |
| TypeScript | ^5.7 | Type safety |
| Tailwind CSS | ^3.4 | Utility-first CSS |
| Zustand | ^5.0 | State management (auth, i18n, filters) |
| TanStack React Query | ^5.62 | Server state, caching, mutations |
| Axios | ^1.7 | HTTP client for API |
| Radix UI | ^1-2 | Headless UI components (Dialog, Dropdown, Tabs, Popover) |
| Lucide React | ^0.468 | Icons (200+ used) |
| Recharts | ^2.14 | Charts (Line, Bar, Pie) for analytics |
| date-fns | ^4.1 | Date formatting and manipulation |
| react-hook-form + zod | ^7.54 / ^3.24 | Forms with validation |
| @dnd-kit | ^6.3 | Drag-and-drop for task Kanban board |
| jspdf + jspdf-autotable | ^4.2 / ^5.0 | PDF report generation |
| sonner | ^1.7 | Toast notifications |

## Structure

```
logbook/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx         Login page
│   │   ├── (lms)/
│   │   │   ├── layout.tsx             Layout with auth guard
│   │   │   ├── dashboard/page.tsx     Dashboard (4 roles)
│   │   │   ├── schedule/page.tsx      Schedule (weekly calendar)
│   │   │   ├── attendance/page.tsx    Attendance
│   │   │   ├── students/
│   │   │   │   ├── page.tsx           Student list + risk filters
│   │   │   │   └── [id]/page.tsx      Student profile + ML risk
│   │   │   ├── groups/
│   │   │   │   ├── page.tsx           Group list
│   │   │   │   └── [id]/page.tsx      Group details
│   │   │   ├── homework/page.tsx      Homework assignments
│   │   │   ├── lessons/[id]/page.tsx  Lesson conduct
│   │   │   ├── analytics/page.tsx     Analytics (5 charts)
│   │   │   ├── reports/page.tsx       Reports (7 types + PDF)
│   │   │   ├── finance/page.tsx       Payments and schedule
│   │   │   ├── tasks/page.tsx         MUP task Kanban board
│   │   │   ├── notifications/page.tsx Notifications
│   │   │   ├── staff/
│   │   │   │   ├── page.tsx           Staff
│   │   │   │   └── [id]/page.tsx      Staff member profile
│   │   │   ├── exams/page.tsx         Exams
│   │   │   ├── settings/page.tsx      Settings (directions, subjects, rooms)
│   │   │   ├── compensation/page.tsx  Teacher compensation
│   │   │   ├── late-requests/page.tsx Late entry requests
│   │   │   ├── materials/page.tsx     Lesson materials
│   │   │   └── works/page.tsx         Student works
│   │   └── layout.tsx                 Root layout
│   │
│   ├── components/
│   │   ├── lms/
│   │   │   ├── layout/               LmsSidebar, LmsTopbar (notifications, profile)
│   │   │   ├── students/             RiskBadge, StudentForm, TransferForm
│   │   │   ├── lessons/              AttendanceTable, GradeInput, DiamondDistributor
│   │   │   ├── schedule/             LessonCard, LessonForm, ScheduleColumn
│   │   │   ├── groups/               GroupForm
│   │   │   └── tasks/                TaskCard, TaskColumn
│   │   ├── shared/                   EmptyState, ConfirmDialog, Providers
│   │   └── ui/                       Button, Input, Dialog, DatePicker, Tabs, Badge
│   │
│   ├── lib/
│   │   ├── api/lms/                  API clients (students, analytics, homework...)
│   │   ├── hooks/lms/                React Query hooks
│   │   ├── stores/                   Zustand stores (auth, i18n, lms)
│   │   ├── i18n/                     RU/EN dictionaries (~500 keys)
│   │   └── utils/                    cn, dates, formatters
│   │
│   └── types/lms/                    TypeScript types (entities, filters)
│
├── public/fonts/                     Roboto Regular + Bold (for PDF)
├── package.json
├── Dockerfile
├── tailwind.config.ts
└── README.md                         (this file)
```

## Running

```bash
# Docker
docker compose up -d --build logbook

# Dev (local)
cd logbook
npm install
npm run dev    # http://localhost:3001
```

## i18n (Internationalization)

RU/EN toggle in the topbar. Language preference is saved in localStorage.

- Dictionaries: `src/lib/i18n/ru.ts`, `src/lib/i18n/en.ts`
- Hook: `useT()` → `t('key')`
- Coverage: all 19 pages + all components + toast messages
