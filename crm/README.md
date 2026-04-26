# CRM — Sales Management

Web application for the sales department: funnels, leads, contracts, conversion analytics.

**Port:** 3000 | **URL:** http://localhost:3000

## Roles

| Role | Access |
|------|--------|
| Director | Full access + analytics |
| Sales Manager | Leads, tasks, contracts |

## Technologies

| Library | Version | Purpose |
|-----------|--------|-----------|
| Next.js | 14.2.29 | React framework (App Router) |
| React | ^18.3 | UI library |
| TypeScript | ^5.7 | Type safety |
| Tailwind CSS | ^3.4 | Utility-first styles |
| Zustand | ^5.0 | State management (auth, theme, i18n) |
| TanStack React Query | ^5.62 | Server state |
| Axios | ^1.7 | HTTP client |
| Radix UI | ^1-2 | Headless UI components |
| Lucide React | ^0.468 | Icons |
| Recharts | ^2.14 | Analytics charts (Sankey, Funnel) |
| date-fns | ^4.1 | Date utilities |
| react-hook-form + zod | ^7.54 / ^3.24 | Forms |
| @dnd-kit | ^6.3 | Drag-and-drop for Kanban leads |
| papaparse | ^5.4 | CSV import (leads) |
| sonner | ^1.7 | Toast notifications |

## Structure

```
crm/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx         Login page
│   │   ├── (crm)/
│   │   │   ├── layout.tsx             Layout with auth guard + sidebar
│   │   │   ├── page.tsx               Home (redirect to leads)
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx           Kanban board for leads
│   │   │   │   └── [id]/page.tsx      Lead card
│   │   │   ├── contracts/
│   │   │   │   ├── page.tsx           Contracts list
│   │   │   │   └── [id]/page.tsx      Contract details
│   │   │   ├── analytics/page.tsx     Analytics (conversion, Sankey)
│   │   │   ├── tasks/page.tsx         Manager tasks
│   │   │   ├── contacts/page.tsx      Contact database
│   │   │   ├── dashboard/page.tsx     Dashboard
│   │   │   └── settings/
│   │   │       ├── page.tsx           Settings
│   │   │       ├── funnels/           Funnel management
│   │   │       └── sources/           Lead sources
│   │   └── layout.tsx                 Root layout
│   │
│   ├── components/crm/
│   │   ├── layout/                    CrmSidebar, CrmTopbar (profile, theme, lang)
│   │   ├── leads/                     LeadCard, LeadForm, CustomFieldInput
│   │   ├── analytics/                 PeriodPicker, charts
│   │   └── contracts/                 ContractForm
│   │
│   ├── lib/
│   │   ├── api/crm/                   API clients (leads, funnels, contracts)
│   │   ├── hooks/crm/                 React Query hooks
│   │   ├── stores/                    auth, theme, i18n stores
│   │   └── i18n/                      RU/EN dictionaries
│   │
│   └── types/crm/                     TypeScript types
│
├── package.json
├── Dockerfile
└── README.md                          (this file)
```

## Getting Started

```bash
# Docker
docker compose up -d --build crm

# Dev (local)
cd crm
npm install
npm run dev    # http://localhost:3000
```

## Features

- **Sales funnels** — customizable stages with drag-and-drop lead movement
- **Leads** — cards with custom fields, activity history, comments
- **Contracts** — creation with auto-generation of student account and payment schedule
- **Analytics** — funnel conversion, Sankey diagram, manager performance
- **Dark theme** — light/dark mode toggle
- **i18n** — full RU/EN support
