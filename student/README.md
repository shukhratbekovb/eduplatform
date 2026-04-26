# Student Portal — Student Dashboard

Web application for students: schedule, grades, homework, gamification, rewards shop.

**Port:** 3002 | **URL:** http://localhost:3002

## Roles

Access is restricted to users with the **student** role only.

## Technologies

| Library | Version | Purpose |
|-----------|--------|-----------|
| Next.js | 14.2.35 | React framework (App Router) |
| React | ^18 | UI library |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^3.4 | Utility-first styles |
| Zustand | ^5.0 | State management (auth, i18n, portal) |
| TanStack React Query | ^5.97 | Server state |
| Axios | ^1.15 | HTTP client |
| Radix UI | ^1-2 | Dialog, DropdownMenu, Tabs, Tooltip, Progress |
| Lucide React | ^0.468 | Icons |
| Recharts | ^2.15 | Performance charts |
| date-fns | ^4.1 | Date utilities |
| react-hook-form + zod | ^7.72 / ^3.25 | Forms (login) |
| sonner | ^1.7 | Toast notifications |

## Structure

```
student/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx         Login page
│   │   ├── (portal)/
│   │   │   ├── layout.tsx             Layout with auth guard + sidebar
│   │   │   ├── dashboard/page.tsx     Dashboard (7 widgets)
│   │   │   ├── schedule/page.tsx      Schedule (weekly calendar)
│   │   │   ├── homework/page.tsx      Homework (submission + files)
│   │   │   ├── performance/page.tsx   Performance (grades by subject)
│   │   │   ├── materials/page.tsx     Lesson materials (download)
│   │   │   ├── achievements/page.tsx  Achievements (unlocked/locked)
│   │   │   ├── shop/page.tsx          Rewards shop
│   │   │   ├── payment/page.tsx       Payments (3 tabs)
│   │   │   └── contacts/page.tsx      Learning center contacts
│   │   ├── page.tsx                   Public landing page
│   │   └── layout.tsx                 Root layout
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx         GPA, attendance, assignments
│   │   │   ├── GradesWidget.tsx       Recent grades
│   │   │   ├── AttendanceWidget.tsx   Attendance pie chart
│   │   │   ├── TodaySchedule.tsx      Today's schedule
│   │   │   ├── UpcomingDeadlines.tsx   Upcoming deadlines
│   │   │   ├── ActivityFeed.tsx       Stars/crystals earning feed
│   │   │   └── Leaderboard.tsx        Stars leaderboard
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx            Side navigation
│   │   │   ├── TopBar.tsx             Top bar (stars, crystals)
│   │   │   └── ProfileDropdown.tsx    Profile + password change
│   │   └── ui/                        Reusable UI components
│   │
│   ├── lib/
│   │   ├── api/                       API clients (axios instance)
│   │   ├── stores/                    auth, i18n, portal stores
│   │   ├── i18n/                      RU/EN dictionaries (~300 keys)
│   │   └── utils/                     cn, dates
│   │
│   └── types/                         TypeScript types
│
├── package.json
├── Dockerfile
└── README.md                          (this file)
```

## Getting Started

```bash
# Docker
docker compose up -d --build student

# Dev (local)
cd student
npm install
npm run dev    # http://localhost:3002
```

## Dashboard Widgets

1. **StatsCards** — GPA, attendance %, assignments due, completed on time
2. **GradesWidget** — recent grades with type (Lesson / HW / Exam)
3. **AttendanceWidget** — pie chart (present / absent / late %)
4. **TodaySchedule** — today's schedule with current lesson highlighting
5. **UpcomingDeadlines** — upcoming deadlines (overdue / urgent / countdown)
6. **ActivityFeed** — stars and crystals earning feed
7. **Leaderboard** — group stars leaderboard

## Gamification

- **TopBar** — stars + crystals (live from dashboard API)
- **Achievements** — achievement catalog (colored unlocked + gray locked)
- **Shop** — items with prices, balance, "Buy" button
- **Badge** — level (Bronze → Diamond) in profile

## i18n

RU/EN toggle in the profile menu. Language is persisted in localStorage.
