# CRM Module — Frontend Development Plan
## EduPlatform

**Version:** 2.0
**Date:** 2026-03-25
**Based on:** PRD v1.2 + crm/DESIGN.md
**Module:** CRM (Sales)
**Access:** Director, Sales Manager (МПП)

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [TypeScript Types & Interfaces](#3-typescript-types--interfaces)
4. [Design Tokens & Tailwind Config](#4-design-tokens--tailwind-config)
5. [State Management](#5-state-management)
6. [Data Layer](#6-data-layer)
7. [Development Phases](#7-development-phases)
8. [Component Reference](#8-component-reference)
9. [Accessibility Requirements](#9-accessibility-requirements)
10. [Animations & Transitions](#10-animations--transitions)
11. [API Contract](#11-api-contract)
12. [UI Screens Index](#12-ui-screens-index)

---

## 1. Tech Stack

| Layer | Выбор | Версия | Причина |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.x | Routing, layouts, SSR/CSR hybrid |
| Language | TypeScript | 5.x | Type safety, автодополнение, рефакторинг |
| UI Components | shadcn/ui + Radix UI | latest | Accessible primitives, кастомизация через Tailwind |
| Styles | Tailwind CSS | 3.x | Утилитарные классы, кастомные токены |
| Server State | TanStack Query (React Query) | 5.x | Cache, pagination, optimistic updates, background refetch |
| Client State | Zustand | 4.x | Фильтры, UI state, sidebar, активная воронка |
| Forms | React Hook Form + Zod | latest | Валидация, производительность, type-safe схемы |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | latest | Accessible DnD, поддержка Kanban и reorder списков |
| Charts | Recharts | 2.x | Composable, React-native, кастомизируемые |
| Dates | date-fns | 3.x | Tree-shakable, форматирование, locale RU |
| Icons | Lucide React | latest | Consistent, SVG, tree-shakable |
| HTTP | Axios | 1.x | Interceptors, instance с base URL и токеном |
| Fonts | next/font/google (Inter) | — | Автооптимизация, без layout shift |
| Notifications (toast) | sonner | latest | Современные toast-уведомления |
| CSV | papaparse | 5.x | Parse CSV на клиенте для импорта |

---

## 2. Project Structure

```
apps/web/src/
│
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx                  # Страница входа
│   │
│   └── (crm)/
│       ├── layout.tsx                    # CRM Shell: sidebar + topbar + providers
│       ├── page.tsx                      # Redirect → /crm/leads
│       ├── leads/
│       │   ├── page.tsx                  # Leads: Kanban / List view
│       │   └── [id]/
│       │       └── page.tsx              # Lead Detail full page
│       ├── tasks/
│       │   └── page.tsx                  # Task Board: Kanban / Calendar
│       ├── analytics/
│       │   └── page.tsx                  # Analytics Dashboard
│       └── settings/
│           ├── layout.tsx                # Settings sub-layout (tabs nav)
│           ├── funnels/
│           │   ├── page.tsx              # Funnels list
│           │   └── [id]/
│           │       └── page.tsx          # Funnel detail (stages + custom fields)
│           └── sources/
│               └── page.tsx              # Lead sources
│
├── components/
│   ├── ui/                               # shadcn/ui base components (auto-generated)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tabs.tsx
│   │   ├── avatar.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   ├── tooltip.tsx
│   │   ├── popover.tsx
│   │   ├── select.tsx
│   │   ├── switch.tsx
│   │   ├── calendar.tsx
│   │   └── ...
│   │
│   ├── shared/                           # Shared компоненты всех модулей
│   │   ├── GlobalSearch.tsx              # Глобальный поиск (Cmd+K)
│   │   ├── NotificationBell.tsx          # Bell + dropdown
│   │   ├── UserMenu.tsx                  # Аватар + dropdown
│   │   ├── EmptyState.tsx                # Пустое состояние (icon + text + CTA)
│   │   ├── ConfirmDialog.tsx             # Reusable confirm/delete modal
│   │   ├── DateRangePicker.tsx           # Выбор диапазона дат
│   │   ├── PeriodFilter.tsx              # Today/Week/Month/Custom tabs
│   │   ├── PageHeader.tsx                # Заголовок страницы + actions slot
│   │   ├── StatCard.tsx                  # Карточка метрики с delta
│   │   ├── SortableItem.tsx              # Wrapper для dnd-kit sortable
│   │   └── RoleBadge.tsx                 # Бейдж роли пользователя
│   │
│   └── crm/
│       ├── layout/
│       │   ├── CrmSidebar.tsx            # Sidebar с навигацией
│       │   ├── CrmTopbar.tsx             # Топбар с поиском + bell + user
│       │   └── CrmSettingsNav.tsx        # Вертикальный nav для /settings
│       │
│       ├── leads/
│       │   ├── LeadsPageHeader.tsx       # Header: funnel selector + toggle + actions
│       │   ├── LeadsFiltersBar.tsx       # Панель фильтров (collapsible)
│       │   ├── LeadKanban.tsx            # DnD Kanban board
│       │   ├── LeadKanbanColumn.tsx      # Колонка Kanban (droppable)
│       │   ├── LeadCard.tsx              # Карточка лида (draggable)
│       │   ├── LeadTable.tsx             # Tabular view
│       │   ├── LeadTableRow.tsx          # Строка таблицы
│       │   ├── LeadDrawer.tsx            # Drawer (slide from right, из Kanban)
│       │   ├── LeadDetail.tsx            # Full detail (используется и в drawer и в page)
│       │   ├── LeadForm.tsx              # Create / Edit форма лида
│       │   ├── LeadStatusActions.tsx     # Won / Lost кнопки + модали
│       │   ├── CsvImportWizard.tsx       # 3-step CSV import modal
│       │   └── FunnelSelector.tsx        # Dropdown выбора активной воронки
│       │
│       ├── timeline/
│       │   ├── LeadTimeline.tsx          # Вся лента событий
│       │   ├── TimelineItem.tsx          # Один элемент ленты (polymorphic)
│       │   ├── TimelineActivity.tsx      # Активность (звонок / встреча / сообщение)
│       │   ├── TimelineStageChange.tsx   # Смена этапа
│       │   ├── TimelineAssignment.tsx    # Смена менеджера
│       │   ├── TimelineComment.tsx       # Комментарий (edit/delete)
│       │   ├── ActivityForm.tsx          # Форма записи активности
│       │   └── CommentBox.tsx            # Поле добавления комментария
│       │
│       ├── tasks/
│       │   ├── TaskKanban.tsx            # Task DnD Kanban (4 колонки)
│       │   ├── TaskKanbanColumn.tsx      # Колонка задач
│       │   ├── TaskCard.tsx              # Карточка задачи
│       │   ├── TaskCalendar.tsx          # Calendar view (month/week)
│       │   ├── TaskForm.tsx              # Create / Edit форма задачи
│       │   ├── TaskDetail.tsx            # Детальный вид задачи (modal)
│       │   └── TaskFiltersBar.tsx        # Фильтры задач
│       │
│       ├── analytics/
│       │   ├── AnalyticsOverviewCards.tsx    # 6 stat cards
│       │   ├── LeadSourcesChart.tsx          # PieChart по источникам
│       │   ├── FunnelConversionChart.tsx     # Step/funnel chart
│       │   ├── RevenueByManagerChart.tsx     # BarChart
│       │   ├── LossReasonsChart.tsx          # Horizontal BarChart
│       │   ├── ManagersTable.tsx             # Таблица по менеджерам
│       │   └── ManagerEfficiencyTable.tsx    # Детальная эффективность
│       │
│       └── settings/
│           ├── FunnelList.tsx            # Список воронок (grid карточек)
│           ├── FunnelCard.tsx            # Карточка воронки
│           ├── FunnelForm.tsx            # Create / Edit воронки (modal)
│           ├── StageList.tsx             # DnD список этапов
│           ├── StageItem.tsx             # Один этап (draggable, inline edit)
│           ├── StageForm.tsx             # Inline форма этапа
│           ├── CustomFieldList.tsx       # DnD список кастомных полей
│           ├── CustomFieldItem.tsx       # Одно поле (draggable)
│           ├── CustomFieldForm.tsx       # Modal форма кастомного поля
│           └── SourceList.tsx            # Таблица источников
│
├── lib/
│   ├── api/
│   │   ├── axios.ts                      # Axios instance + interceptors
│   │   └── crm/
│   │       ├── leads.ts                  # API functions для лидов
│   │       ├── funnels.ts                # API functions для воронок
│   │       ├── stages.ts                 # API functions для этапов
│   │       ├── custom-fields.ts          # API functions для кастомных полей
│   │       ├── sources.ts                # API functions для источников
│   │       ├── timeline.ts               # API functions для timeline
│   │       ├── tasks.ts                  # API functions для задач
│   │       ├── analytics.ts              # API functions для аналитики
│   │       └── notifications.ts          # API functions для уведомлений
│   │
│   ├── hooks/
│   │   └── crm/
│   │       ├── useLeads.ts               # useLeads, useLead, useCreateLead...
│   │       ├── useFunnels.ts             # useFunnels, useFunnel, useCreateFunnel...
│   │       ├── useStages.ts              # useStages, useReorderStages...
│   │       ├── useCustomFields.ts        # useCustomFields, useCreateCustomField...
│   │       ├── useSources.ts             # useSources, useCreateSource...
│   │       ├── useTimeline.ts            # useTimeline, useCreateActivity...
│   │       ├── useTasks.ts               # useTasks, useCreateTask, useMoveTask...
│   │       ├── useAnalytics.ts           # useAnalyticsOverview, useSources...
│   │       └── useNotifications.ts       # useNotifications, useMarkRead...
│   │
│   ├── stores/
│   │   ├── useAuthStore.ts               # Auth: user, token, role
│   │   └── useCrmStore.ts                # CRM UI state: filters, views, funnel
│   │
│   ├── utils/
│   │   ├── cn.ts                         # clsx + twMerge utility
│   │   ├── dates.ts                      # date-fns helpers (formatRelative, ru locale)
│   │   ├── currency.ts                   # Форматирование валюты
│   │   └── csv.ts                        # CSV parse helpers (papaparse wrappers)
│   │
│   └── validators/
│       └── crm/
│           ├── lead.schema.ts            # Zod schema для лида
│           ├── task.schema.ts            # Zod schema для задачи
│           ├── funnel.schema.ts          # Zod schema для воронки
│           ├── stage.schema.ts           # Zod schema для этапа
│           ├── custom-field.schema.ts    # Zod schema для кастомного поля
│           └── activity.schema.ts        # Zod schema для активности
│
└── types/
    └── crm/
        ├── entities.ts                   # Lead, Task, Funnel, Stage, etc.
        ├── api.ts                        # Request/Response types
        ├── filters.ts                    # LeadsFilters, TasksFilters
        └── analytics.ts                  # Analytics response types
```

---

## 3. TypeScript Types & Interfaces

### 3.1 Сущности (entities.ts)

```typescript
// ─── Пользователь ───────────────────────────────────────────
export type UserRole = 'director' | 'sales_manager'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
}

// ─── Лид ────────────────────────────────────────────────────
export type LeadStatus = 'active' | 'won' | 'lost'

export type CustomFieldValue = string | number | boolean | string[] | null

export interface Lead {
  id: string
  fullName: string
  phone: string
  email?: string
  sourceId: string
  source?: LeadSource
  funnelId: string
  funnel?: Funnel
  stageId: string
  stage?: Stage
  assignedTo: string
  assignee?: User
  status: LeadStatus
  lostReason?: string
  customFields: Record<string, CustomFieldValue>
  createdAt: string
  updatedAt: string
  lastActivityAt?: string
}

// ─── Воронка ─────────────────────────────────────────────────
export interface Funnel {
  id: string
  name: string
  isArchived: boolean
  stageCount: number
  leadCount: number
  createdAt: string
}

// ─── Этап ────────────────────────────────────────────────────
export interface Stage {
  id: string
  funnelId: string
  name: string
  color: string           // hex, e.g. "#4F46E5"
  winProbability: number  // 0–100
  order: number
}

// ─── Кастомное поле ──────────────────────────────────────────
export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox'

export interface CustomField {
  id: string
  funnelId: string
  label: string
  type: CustomFieldType
  options?: string[]   // для select / multiselect
  order: number
}

// ─── Источник лидов ──────────────────────────────────────────
export type LeadSourceType = 'manual' | 'import' | 'api'

export interface LeadSource {
  id: string
  name: string
  type: LeadSourceType
  isActive: boolean
  webhookUrl?: string     // только для type = 'api'
  webhookSecret?: string  // только для type = 'api'
}

// ─── Timeline ────────────────────────────────────────────────
export type ActivityType = 'call' | 'meeting' | 'message' | 'other'

export interface Activity {
  id: string
  leadId: string
  type: ActivityType
  date: string
  outcome: string
  notes?: string
  durationMinutes?: number  // для calls
  channel?: string          // для messages
  needsFollowUp: boolean
  createdBy: string
  createdByUser?: User
  createdAt: string
}

export interface StageChange {
  id: string
  leadId: string
  fromStageId: string
  fromStage?: Stage
  toStageId: string
  toStage?: Stage
  changedBy: string
  changedByUser?: User
  changedAt: string
}

export interface AssignmentChange {
  id: string
  leadId: string
  fromUserId: string
  fromUser?: User
  toUserId: string
  toUser?: User
  changedBy: string
  changedByUser?: User
  changedAt: string
}

export interface LeadComment {
  id: string
  leadId: string
  text: string
  authorId: string
  author: User
  createdAt: string
  updatedAt: string
}

export type TimelineEntry =
  | { type: 'activity'; date: string; data: Activity }
  | { type: 'stage_change'; date: string; data: StageChange }
  | { type: 'assignment_change'; date: string; data: AssignmentChange }
  | { type: 'comment'; date: string; data: LeadComment }

// ─── Задача ─────────────────────────────────────────────────
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue'

export interface Task {
  id: string
  title: string
  description?: string
  linkedLeadId?: string
  linkedLead?: Pick<Lead, 'id' | 'fullName'>
  assignedTo: string
  assignee?: User
  dueDate: string
  priority: TaskPriority
  status: TaskStatus
  reminderAt?: string
  isAutoCreated: boolean
  createdAt: string
}

// ─── Уведомление ─────────────────────────────────────────────
export type NotificationType =
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_assigned'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  linkedTaskId?: string
  createdAt: string
}
```

### 3.2 API Types (api.ts)

```typescript
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>  // field-level validation errors
}

// ─── Lead requests ──────────────────────────────────────────
export interface CreateLeadDto {
  fullName: string
  phone: string
  email?: string
  sourceId: string
  funnelId: string
  stageId: string
  assignedTo: string
  customFields?: Record<string, CustomFieldValue>
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {}

export interface MoveLeadStageDto {
  stageId: string
}

export interface MarkLeadLostDto {
  reason: string
}

// ─── Stage requests ──────────────────────────────────────────
export interface CreateStageDto {
  name: string
  color: string
  winProbability: number
}

export interface ReorderStagesDto {
  orderedIds: string[]
}

// ─── Task requests ───────────────────────────────────────────
export interface CreateTaskDto {
  title: string
  description?: string
  linkedLeadId?: string
  assignedTo: string
  dueDate: string
  priority: TaskPriority
  reminderAt?: string
}

export interface MoveTaskDto {
  status: TaskStatus
}

// ─── Activity requests ───────────────────────────────────────
export interface CreateActivityDto {
  type: ActivityType
  date: string
  outcome: string
  notes?: string
  durationMinutes?: number
  channel?: string
  needsFollowUp: boolean
}
```

### 3.3 Filter Types (filters.ts)

```typescript
export interface LeadsFilters {
  search: string
  stageIds: string[]
  sourceIds: string[]
  assignedTo: string[]
  status: LeadStatus[]
  createdFrom?: string
  createdTo?: string
}

export const defaultLeadsFilters: LeadsFilters = {
  search: '',
  stageIds: [],
  sourceIds: [],
  assignedTo: [],
  status: [],
}

export interface TasksFilters {
  assignedTo: string[]
  priority: TaskPriority[]
  leadId?: string
  dueDateFrom?: string
  dueDateTo?: string
}

export type AnalyticsPeriodType = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

export interface AnalyticsPeriod {
  type: AnalyticsPeriodType
  from?: string   // ISO date, только для custom
  to?: string     // ISO date, только для custom
}
```

### 3.4 Analytics Types (analytics.ts)

```typescript
export interface AnalyticsOverview {
  totalTasks: number
  completedTasks: number
  completedTasksPercent: number
  overdueTasks: number
  newLeads: number
  avgResponseTimeHours: number
  salesForecast: number
  delta: {
    newLeads: number            // % vs previous period
    avgResponseTimeHours: number
    salesForecast: number
  }
}

export interface LeadSourceStat {
  sourceId: string
  sourceName: string
  count: number
  percent: number
}

export interface FunnelConversionStat {
  fromStageId: string
  fromStageName: string
  toStageId: string
  toStageName: string
  conversionRate: number
  leadCount: number
}

export interface ManagerStat {
  userId: string
  userName: string
  avatarUrl?: string
  leadsHandled: number
  leadsWon: number
  wonRate: number
  revenue: number
  avgResponseTimeHours: number
}

export interface LossReasonStat {
  reason: string
  count: number
  percent: number
}
```

---

## 4. Design Tokens & Tailwind Config

### 4.1 tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand / Primary (Indigo)
        primary: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',  // default
          700: '#4338CA',  // hover
          800: '#3730A3',  // active
        },
        // Sidebar dark
        sidebar: {
          bg:          '#1E1B4B',
          hover:       '#2D2A6E',
          active:      '#312E81',
          text:        '#C7D2FE',
          'text-active': '#FFFFFF',
          icon:        '#818CF8',
        },
        // Semantic
        success: {
          50:  '#ECFDF5',
          500: '#10B981',
          700: '#047857',
        },
        warning: {
          50:  '#FFFBEB',
          500: '#F59E0B',
          700: '#B45309',
        },
        danger: {
          50:  '#FEF2F2',
          500: '#EF4444',
          700: '#B91C1C',
        },
        info: {
          50:  '#EFF6FF',
          500: '#3B82F6',
          700: '#1D4ED8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        xs:   ['12px', { lineHeight: '16px' }],
        sm:   ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg:   ['18px', { lineHeight: '28px' }],
        xl:   ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
      },
      boxShadow: {
        xs:     '0 1px 2px rgba(0,0,0,0.05)',
        sm:     '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
        md:     '0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -1px rgba(0,0,0,0.06)',
        lg:     '0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -2px rgba(0,0,0,0.05)',
        drawer: '-4px 0 24px rgba(0,0,0,0.12)',
        drag:   '0 8px 32px rgba(0,0,0,0.18)',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      width: {
        sidebar: '240px',
        'sidebar-collapsed': '64px',
        drawer: '560px',
      },
      height: {
        topbar: '64px',
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to:   { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-out-right': 'slide-out-right 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
```

### 4.2 Общие CSS классы (Quick Reference)

```
// Layout
page-bg:        bg-gray-50 min-h-screen
card:           bg-white rounded-lg shadow-sm border border-gray-200 p-6
section-title:  text-lg font-semibold text-gray-900

// Buttons
btn-primary:    bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                text-white font-semibold rounded px-4 py-2 transition-colors
btn-secondary:  border border-gray-300 bg-white hover:bg-gray-50
                text-gray-700 font-medium rounded px-4 py-2 transition-colors
btn-danger:     bg-danger-500 hover:bg-danger-700 text-white ...
btn-ghost:      hover:bg-gray-100 text-gray-600 rounded px-3 py-2

// Lead Status badges
badge-active:   text-info-700 bg-info-50 border border-info-200
badge-won:      text-success-700 bg-success-50 border border-success-200
badge-lost:     text-danger-700 bg-danger-50 border border-danger-200

// Priority badges
badge-low:      text-gray-700 bg-gray-100
badge-medium:   text-info-700 bg-info-50
badge-high:     text-orange-700 bg-orange-50
badge-critical: text-danger-700 bg-danger-50

// Inputs
input:          border border-gray-300 rounded px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-100
                focus:border-primary-500 transition-colors

// Sidebar
sidebar:        bg-sidebar-bg w-sidebar min-h-screen flex flex-col
nav-item:       flex items-center gap-3 px-4 py-2.5 rounded-md
                text-sidebar-text text-sm font-medium cursor-pointer
                hover:bg-sidebar-hover transition-colors
nav-item-active: bg-sidebar-active text-sidebar-text-active
```

---

## 5. State Management

### 5.1 useAuthStore (lib/stores/useAuthStore.ts)

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types/crm/entities'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'auth-store', partialize: (s) => ({ token: s.token }) }
  )
)

// Selectors
export const useCurrentUser = () => useAuthStore((s) => s.user)
export const useUserRole = () => useAuthStore((s) => s.user?.role)
export const useIsDirector = () => useAuthStore((s) => s.user?.role === 'director')
```

### 5.2 useCrmStore (lib/stores/useCrmStore.ts)

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  LeadsFilters, TasksFilters, AnalyticsPeriod,
  defaultLeadsFilters
} from '@/types/crm/filters'

interface CrmStore {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Leads view
  activeFunnelId: string | null
  setActiveFunnelId: (id: string) => void
  leadsView: 'kanban' | 'list'
  setLeadsView: (v: 'kanban' | 'list') => void
  leadsFilters: LeadsFilters
  setLeadsFilter: <K extends keyof LeadsFilters>(k: K, v: LeadsFilters[K]) => void
  clearLeadsFilters: () => void

  // Tasks view
  tasksView: 'kanban' | 'calendar'
  setTasksView: (v: 'kanban' | 'calendar') => void
  tasksFilters: TasksFilters
  setTasksFilter: <K extends keyof TasksFilters>(k: K, v: TasksFilters[K]) => void
  showAllManagersTasks: boolean    // Director only
  setShowAllManagersTasks: (v: boolean) => void

  // Analytics
  analyticsPeriod: AnalyticsPeriod
  setAnalyticsPeriod: (p: AnalyticsPeriod) => void
}

export const useCrmStore = create<CrmStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      activeFunnelId: null,
      setActiveFunnelId: (id) => set({ activeFunnelId: id }),
      leadsView: 'kanban',
      setLeadsView: (v) => set({ leadsView: v }),
      leadsFilters: defaultLeadsFilters,
      setLeadsFilter: (k, v) =>
        set((s) => ({ leadsFilters: { ...s.leadsFilters, [k]: v } })),
      clearLeadsFilters: () => set({ leadsFilters: defaultLeadsFilters }),

      tasksView: 'kanban',
      setTasksView: (v) => set({ tasksView: v }),
      tasksFilters: { assignedTo: [], priority: [] },
      setTasksFilter: (k, v) =>
        set((s) => ({ tasksFilters: { ...s.tasksFilters, [k]: v } })),
      showAllManagersTasks: false,
      setShowAllManagersTasks: (v) => set({ showAllManagersTasks: v }),

      analyticsPeriod: { type: 'month' },
      setAnalyticsPeriod: (p) => set({ analyticsPeriod: p }),
    }),
    {
      name: 'crm-store',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        activeFunnelId: s.activeFunnelId,
        leadsView: s.leadsView,
        tasksView: s.tasksView,
      }),
    }
  )
)

// Derived selectors
export const useActiveFiltersCount = () =>
  useCrmStore((s) => {
    const f = s.leadsFilters
    return (
      (f.search ? 1 : 0) +
      f.stageIds.length +
      f.sourceIds.length +
      f.assignedTo.length +
      f.status.length +
      (f.createdFrom ? 1 : 0)
    )
  })
```

---

## 6. Data Layer

### 6.1 Axios Instance (lib/api/axios.ts)

```typescript
import axios from 'axios'
import { useAuthStore } from '@/lib/stores/useAuthStore'

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 → logout
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### 6.2 Query Keys Convention

```typescript
// lib/api/crm/query-keys.ts
export const crmKeys = {
  funnels:        () => ['crm', 'funnels'] as const,
  funnel:         (id: string) => ['crm', 'funnels', id] as const,
  stages:         (funnelId: string) => ['crm', 'funnels', funnelId, 'stages'] as const,
  customFields:   (funnelId: string) => ['crm', 'funnels', funnelId, 'custom-fields'] as const,
  sources:        () => ['crm', 'sources'] as const,
  leads:          (filters: LeadsFilters & { funnelId?: string }) => ['crm', 'leads', filters] as const,
  lead:           (id: string) => ['crm', 'leads', id] as const,
  timeline:       (leadId: string) => ['crm', 'leads', leadId, 'timeline'] as const,
  tasks:          (filters: TasksFilters) => ['crm', 'tasks', filters] as const,
  task:           (id: string) => ['crm', 'tasks', id] as const,
  notifications:  () => ['crm', 'notifications'] as const,
  analytics: {
    overview:    (period: AnalyticsPeriod) => ['crm', 'analytics', 'overview', period] as const,
    sources:     (period: AnalyticsPeriod) => ['crm', 'analytics', 'sources', period] as const,
    managers:    (period: AnalyticsPeriod) => ['crm', 'analytics', 'managers', period] as const,
    conversion:  (funnelId: string, period: AnalyticsPeriod) =>
                   ['crm', 'analytics', 'conversion', funnelId, period] as const,
    lossReasons: (period: AnalyticsPeriod) => ['crm', 'analytics', 'loss-reasons', period] as const,
  },
}
```

### 6.3 Пример хука — useLeads (lib/hooks/crm/useLeads.ts)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { crmKeys } from '@/lib/api/crm/query-keys'
import { Lead, PaginatedResponse, CreateLeadDto, UpdateLeadDto } from '@/types/crm'
import { useCrmStore } from '@/lib/stores/useCrmStore'
import { toast } from 'sonner'

// Получить все лиды с фильтрами
export function useLeads(funnelId: string, page = 1, limit = 50) {
  const filters = useCrmStore((s) => s.leadsFilters)
  return useQuery({
    queryKey: crmKeys.leads({ ...filters, funnelId }),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<Lead>>('/crm/leads', {
          params: { funnelId, ...filters, page, limit },
        })
        .then((r) => r.data),
    staleTime: 30_000,
    enabled: !!funnelId,
  })
}

// Создать лид
export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateLeadDto) =>
      apiClient.post<Lead>('/crm/leads', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
      toast.success('Лид создан')
    },
    onError: () => toast.error('Не удалось создать лид'),
  })
}

// Переместить лид в другой этап (optimistic)
export function useMoveLeadStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leadId, stageId }: { leadId: string; stageId: string }) =>
      apiClient.post(`/crm/leads/${leadId}/move-stage`, { stageId }),
    onMutate: async ({ leadId, stageId }) => {
      // Optimistic update: обновляем кэш немедленно
      await qc.cancelQueries({ queryKey: ['crm', 'leads'] })
      const snapshot = qc.getQueriesData({ queryKey: ['crm', 'leads'] })
      qc.setQueriesData({ queryKey: ['crm', 'leads'] }, (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((l: Lead) =>
            l.id === leadId ? { ...l, stageId } : l
          ),
        }
      })
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      // Откатить при ошибке
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error('Не удалось переместить лид')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
    },
  })
}

// Отметить как Won
export function useMarkLeadWon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (leadId: string) =>
      apiClient.post(`/crm/leads/${leadId}/mark-won`),
    onSuccess: (_data, leadId) => {
      qc.invalidateQueries({ queryKey: crmKeys.lead(leadId) })
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
      toast.success('Лид отмечен как Won')
    },
  })
}

// Отметить как Lost
export function useMarkLeadLost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leadId, reason }: { leadId: string; reason: string }) =>
      apiClient.post(`/crm/leads/${leadId}/mark-lost`, { reason }),
    onSuccess: (_data, { leadId }) => {
      qc.invalidateQueries({ queryKey: crmKeys.lead(leadId) })
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
      toast.success('Лид отмечен как Lost')
    },
  })
}
```

### 6.4 Caching Strategy

| Данные | staleTime | Причина |
|---|---|---|
| Список воронок | 5 минут | Меняются редко |
| Этапы воронки | 5 минут | Меняются редко |
| Кастомные поля | 5 минут | Меняются редко |
| Источники | 5 минут | Меняются редко |
| Список лидов | 30 секунд | Активно меняются |
| Детали лида | 30 секунд | Частые обновления |
| Timeline | 15 секунд | Живая лента |
| Задачи | 30 секунд | Меняются при работе |
| Уведомления | 0 (refetch on focus) | Всегда актуальны |
| Аналитика | 2 минуты | Периодические данные |

---

## 7. Development Phases

---

### Phase 1 — Foundation: Auth, Layout, Providers

**Цель:** Рабочая авторизация, CRM shell с навигацией, пустые страницы.

#### 7.1.1 Задачи

**Providers и конфигурация**
- [ ] `next/font/google` — подключить Inter в `app/layout.tsx`
- [ ] `QueryClientProvider` — в `app/(crm)/layout.tsx`
- [ ] `Sonner <Toaster />` — глобально в root layout
- [ ] Переменные окружения: `NEXT_PUBLIC_API_URL`
- [ ] `tailwind.config.ts` — добавить все кастомные токены из Section 4.1

**Auth**
- [ ] Страница `/login`:
  - Центрированная карточка `max-w-md mx-auto mt-20`
  - Логотип SVG + название платформы
  - `<form>` с React Hook Form + Zod schema
  - Email input + Password input (с show/hide toggle)
  - Button primary "Войти" + loading state
  - Error banner (красный) при 401
- [ ] `useAuthStore` — persist token в localStorage
- [ ] Axios instance с auth interceptor
- [ ] Route guard в `(crm)/layout.tsx` — redirect на `/login` если нет токена

**CRM Shell Layout**
- [ ] `CrmSidebar.tsx`:
  - Тёмный фон `bg-sidebar-bg`
  - Logo блок сверху (240px → collapsed: только иконка)
  - NavItems: Лиды / Задачи / Аналитика / Настройки (Director only)
  - Активный элемент: `bg-sidebar-active text-sidebar-text-active`
  - Collapse button снизу + `transition-all duration-300`
  - Tooltip на collapsed иконках (shadcn Tooltip)
- [ ] `CrmTopbar.tsx`:
  - Высота `h-topbar` (64px)
  - Breadcrumb слева
  - `GlobalSearch.tsx` по центру (Cmd+K shortcut)
  - `NotificationBell.tsx` справа
  - `UserMenu.tsx` справа

**Zustand Stores**
- [ ] `useAuthStore` — user, token, setAuth, logout
- [ ] `useCrmStore` — sidebarCollapsed, leadsView, tasksView, activeFunnelId, все фильтры

**Пустые страницы**
- [ ] Каждая основная страница с `EmptyState.tsx` placeholder

#### 7.1.2 Компоненты Phase 1

**`EmptyState.tsx`**
```typescript
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}
// Классы: flex flex-col items-center justify-center py-16 text-center
// icon: text-gray-300 w-12 h-12 mb-4
// title: text-lg font-semibold text-gray-900 mb-2
// description: text-sm text-gray-500 mb-6
// action button: btn-primary
```

**`NotificationBell.tsx`**
```typescript
// Badge: absolute -top-1 -right-1, bg-danger-500, text-white, text-xs, rounded-full, min-w-5 h-5
// Dropdown: w-80, shadow-md, max-h-96, overflow-y-auto
// Unread dot: w-2 h-2 bg-primary-600 rounded-full
// Polling: refetchInterval: 60_000 (каждую минуту)
// Mark all read: POST /notifications/read-all → invalidate
```

#### 7.1.3 Deliverable Phase 1
Рабочий вход → CRM layout с пустыми страницами, sidebar навигация, notifications bell.

---

### Phase 2 — Settings: Funnels, Stages, Sources, Custom Fields

**Цель:** Director настраивает воронки до начала работы с лидами.

#### 7.2.1 Задачи

**Funnels List (`/crm/settings/funnels`)**
- [ ] `FunnelList.tsx` — grid карточек `grid-cols-3 gap-6`
- [ ] `FunnelCard.tsx`:
  - Белая карточка, `shadow-sm hover:shadow-md transition-shadow`
  - Название `text-xl font-semibold`
  - Meta: "X этапов · Y лидов", `text-sm text-gray-500`
  - Status badge: Active / Archived
  - Actions: Edit (inline rename) / Archive / Delete (если 0 лидов)
- [ ] `FunnelForm.tsx` (Modal):
  - Create: одно поле "Название воронки"
  - Edit: то же самое, pre-fill
  - Zod schema: `z.object({ name: z.string().min(2).max(50) })`
- [ ] Archive confirmation: `ConfirmDialog.tsx`
- [ ] **Edge case:** при архивировании воронки с активными лидами — предупреждение

**Stages (`/crm/settings/funnels/:id`)**
- [ ] `StageList.tsx` — dnd-kit `SortableContext` (verticalListSortingStrategy)
- [ ] `StageItem.tsx` (draggable):
  - DragHandle иконка слева
  - Color swatch (10 preset цветов)
  - Inline name input (click to edit)
  - Win probability % input (`w-16`)
  - Delete button → ConfirmDialog
- [ ] `StageForm.tsx` (inline, ниже последнего этапа):
  - Color picker (10 swatches: preset hex массив)
  - Name input + Win% input + Save / Cancel
- [ ] `useReorderStages` мутация с optimistic update
- [ ] **Edge case:** попытка удалить этап с лидами → Modal "Переместить X лидов в:" + stage selector

**Custom Fields (`/crm/settings/funnels/:id`)**
- [ ] `CustomFieldList.tsx` — dnd-kit sortable
- [ ] `CustomFieldItem.tsx` (draggable):
  - Type icon (text/number/date/select/checkbox)
  - Label + type badge
  - Edit / Delete кнопки
- [ ] `CustomFieldForm.tsx` (Modal `max-w-lg`):
  - Label input
  - Type selector (shadcn Select)
  - Если type = select/multiselect: `OptionsEditor` (add/remove/reorder options)
  - Zod schema с discriminated union по типу
- [ ] **Edge case:** удаление поля с данными → ввод "DELETE" для подтверждения

**Lead Sources (`/crm/settings/sources`)**
- [ ] `SourceList.tsx` — таблица с `border-collapse`
- [ ] Columns: Название | Тип | Статус | Действия
- [ ] Type badge: manual=gray / import=info / api=primary
- [ ] Active toggle: shadcn Switch
- [ ] API source: аккордеон раскрывает webhook URL + secret
  - Copy button (navigator.clipboard)
  - "Обновить secret" → POST /crm/lead-sources/:id/regenerate-secret + confirm

#### 7.2.2 Zod Schemas

```typescript
// validators/crm/stage.schema.ts
export const stageSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Некорректный цвет'),
  winProbability: z.number().min(0).max(100),
})

// validators/crm/custom-field.schema.ts
export const customFieldSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    label: z.string().min(1).max(50),
  }),
  z.object({
    type: z.enum(['select', 'multiselect']),
    label: z.string().min(1).max(50),
    options: z.array(z.string().min(1)).min(1, 'Добавьте хотя бы один вариант'),
  }),
  // ... остальные типы
])
```

#### 7.2.3 Deliverable Phase 2
Director полностью настраивает воронки перед работой с лидами.

---

### Phase 3 — Lead Management: Kanban, List, Filters, Create, CSV Import

**Цель:** Полное управление лидами.

#### 7.3.1 LeadKanban.tsx

```typescript
// Использует: @dnd-kit/core DndContext + @dnd-kit/sortable SortableContext
// Стратегия: horizontalListSortingStrategy для колонок
//            verticalListSortingStrategy внутри каждой колонки
// Sensors: PointerSensor (delay 250ms для разделения click / drag)

interface LeadKanbanProps {
  funnelId: string
  stages: Stage[]
  leadsByStage: Record<string, Lead[]>
  onLeadClick: (leadId: string) => void
}

// DragOverlay: рендерит <LeadCard /> в portal при перетаскивании
// className при drag: opacity-50 на оригинальном месте
// Drop zone highlight: border-2 border-dashed border-primary-400 bg-primary-50
```

#### 7.3.2 LeadCard.tsx

```typescript
interface LeadCardProps {
  lead: Lead
  onClick: () => void
  isDragging?: boolean
}

// Размер: w-[280px]
// Состояния:
//   default: bg-white shadow-sm border border-gray-200 rounded-md
//   hover:   shadow-md border-gray-300
//   dragging: shadow-drag opacity-80 rotate-1 scale-105
//   won:     border-l-4 border-l-success-500
//   lost:    border-l-4 border-l-danger-500 opacity-70
//
// Структура карточки (p-4):
//   Row 1: [status dot] [fullName text-sm font-semibold] [⋮ menu]
//   Row 2: [phone text-xs text-gray-500]
//   Row 3: [source badge] [assigned manager avatar + name text-xs]
//   Row 4 (если lastActivityAt): ["Активность: 2 дня назад" text-xs text-gray-400]
```

#### 7.3.3 LeadKanbanColumn.tsx

```typescript
interface LeadKanbanColumnProps {
  stage: Stage
  leads: Lead[]
  onAddLead: (stageId: string) => void
}

// Header: flex justify-between items-center mb-4
//   [color dot] [stage.name font-semibold text-gray-900]
//   [leads.length badge: text-xs bg-gray-200 rounded-full px-2 py-0.5]
// "Add lead" кнопка: text-xs text-primary-600 hover:underline + Plus icon
// Droppable area: min-h-[200px] space-y-3
// isOver (DnD active): border-2 border-dashed border-primary-400 bg-primary-50 rounded-md
```

#### 7.3.4 LeadsFiltersBar.tsx

```typescript
// Collapsible panel (animateHeight через max-height transition)
// isOpen хранится в local state
// Кнопка "Фильтры" с badge: activeFiltersCount из useActiveFiltersCount()

// Фильтры (flex flex-wrap gap-3):
//   Search:    debounced 300ms → setLeadsFilter('search', value)
//   Stage:     MultiSelect из shadcn (checkboxes в dropdown)
//   Source:    MultiSelect
//   Manager:   MultiSelect (только Director)
//   Status:    ToggleGroup (Active/Won/Lost)
//   Date range: DateRangePicker

// "Сбросить" кнопка: видна если activeFiltersCount > 0
// clearLeadsFilters() → Zustand
```

#### 7.3.5 LeadForm.tsx

```typescript
// Zod schema:
export const leadSchema = z.object({
  fullName: z.string().min(2, 'Минимум 2 символа'),
  phone:    z.string().min(9, 'Некорректный номер'),
  email:    z.string().email().optional().or(z.literal('')),
  sourceId: z.string().min(1, 'Выберите источник'),
  funnelId: z.string().min(1, 'Выберите воронку'),
  stageId:  z.string().min(1, 'Выберите этап'),
  assignedTo: z.string().min(1, 'Назначьте менеджера'),
  customFields: z.record(z.any()).optional(),
})

// Кастомные поля рендерятся динамически по CustomField[]:
//   text → Input
//   number → Input type=number
//   date → DatePicker
//   select → Select
//   multiselect → MultiSelect
//   checkbox → Checkbox
```

#### 7.3.6 CsvImportWizard.tsx

```typescript
// 3-step modal (720px wide)
// Step indicator: 3 dots с connected line, active = primary-600

// Step 1 — Upload:
//   Dropzone (drag & drop или click): border-2 border-dashed border-gray-300
//   Parse CSV: papaparse.parse(file, { header: true, preview: 5 })
//   Preview table: первые 5 строк

// Step 2 — Mapping:
//   Для каждой колонки CSV: Select → поля лида (required/optional помечены)
//   Обязательные поля выделены: fullName, phone
//   Validation: все required поля должны быть замаплены

// Step 3 — Confirm:
//   Preview первых 10 лидов
//   "48 лидов будут импортированы | 3 пропущены (нет телефона)"
//   Import button → useBulkImportLeads mutation
//   Progress bar (0→100% по SSE или polling)
//   Result summary: toast + count badges
```

#### 7.3.7 Deliverable Phase 3
Полный pipeline управления лидами: Kanban, List, все фильтры, создание, CSV импорт.

---

### Phase 4 — Lead Detail & Timeline

**Цель:** Полный профиль лида с историей всех взаимодействий.

#### 7.4.1 LeadDrawer.tsx

```typescript
// Реализация: shadcn Sheet (right side)
// Ширина: w-drawer (560px)
// Анимация: slide-in-right / slide-out-right (0.25s)
// Overlay: bg-black/40, click → close
// Close button: X icon top-right, Escape key

// Keyboard:
//   Escape → закрыть
//   Tab → focus trap внутри drawer (Radix FocusTrap)
```

#### 7.4.2 LeadDetail.tsx (shared между Drawer и Page)

```typescript
// Tabs: shadcn Tabs (Info / Timeline / Tasks)
// Tab header фиксирован, content прокручивается

// Header (всегда видим):
//   [LeadStatus badge] [fullName text-xl font-bold]
//   [Stage selector dropdown] [Won button] [Lost button] [Edit button]

// Tab — Info:
//   Grid 2-column для полей
//   Inline edit: click field → показать input, Enter/blur → save (PATCH /crm/leads/:id)
//   Manager change: search dropdown с debounced поиском по менеджерам
//   Custom fields section (динамический рендер по типу)

// Tab — Timeline:
//   <LeadTimeline leadId={id} />

// Tab — Tasks:
//   Список задач + inline создание новой задачи
```

#### 7.4.3 LeadTimeline.tsx

```typescript
// Группировка по дате: ["Сегодня", "Вчера", "23 марта 2026"]
// Каждая группа: date divider + список TimelineItem

// TimelineItem — polymorphic:
//   type='activity'   → <TimelineActivity />
//   type='stage_change' → <TimelineStageChange />
//   type='assignment_change' → <TimelineAssignment />
//   type='comment'    → <TimelineComment />

// Loading: skeleton items (3 шт)
// Infinite scroll: useInfiniteQuery, loadMore при scroll bottom
```

#### 7.4.4 ActivityForm.tsx

```typescript
// Inline форма (не modal) — раскрывается в Timeline
// Fields:
//   type: SegmentedControl (Call/Meeting/Message/Other) с иконками
//   date + time: DateTimePicker
//   outcome: Textarea (обязательно)
//   notes: Textarea (опционально)
//   durationMinutes: Input (только для Call)
//   channel: Select (только для Message: WhatsApp/Telegram/Email/Other)
//   needsFollowUp: Checkbox → при check показать toast "Задача создана автоматически"

// Анимация появления: animate-scale-in
```

#### 7.4.5 TimelineComment.tsx

```typescript
// Просмотр: аватар + имя + дата + текст
// Если author === currentUser:
//   Edit: click "Изменить" → contenteditable или textarea inline
//   Delete: button "Удалить" → ConfirmDialog
// Optimistic update для edit/delete
```

#### 7.4.6 Deliverable Phase 4
Полная история взаимодействий с лидом, все типы активностей, edit/delete комментариев.

---

### Phase 5 — Task Board

**Цель:** Личный task management для менеджеров + контроль для Director.

#### 7.5.1 TaskKanban.tsx

```typescript
// 4 колонки: Pending / In Progress / Done / Overdue
// Overdue колонка:
//   Заголовок: text-danger-700 bg-danger-50
//   Карточки не перетаскиваются (isDropDisabled=true)
//   CTA на карточке: "Решить" → открыть TaskDetail

// Перетаскивание Pending ↔ In Progress ↔ Done
// onDragEnd → useMoveTask мутация с optimistic update
```

#### 7.5.2 TaskCard.tsx

```typescript
interface TaskCardProps {
  task: Task
  onClick: () => void
}

// Левая граница: 3px solid по цвету приоритета
//   low:      border-l-gray-300
//   medium:   border-l-info-500
//   high:     border-l-orange-500
//   critical: border-l-danger-500

// Структура (p-3):
//   [Priority badge] [⋮ menu: Edit, Delete]
//   [Title text-sm font-medium mt-1]
//   [Linked lead: Link icon + lead name, text-xs text-primary-600]
//   [Due date: Calendar icon + date, text-xs (red если overdue)]
//   [Assignee avatar small]
```

#### 7.5.3 TaskCalendar.tsx

```typescript
// Режимы: Month / Week toggle
// Библиотека: самодельный на date-fns (или react-big-calendar как опция)
//
// Month view:
//   7 cols, 6 rows
//   Каждая ячейка: дата + задачи (max 3, "+N ещё")
//   Задача = цветная полоска с названием
//
// Week view:
//   Временные слоты (8:00–22:00 по 30 мин)
//   Задачи в слотах по dueDate
//
// Click задачи → TaskDetail modal
// Текущий день: bg-primary-50 border border-primary-200
```

#### 7.5.4 TaskForm.tsx (Modal)

```typescript
// Zod schema:
export const taskSchema = z.object({
  title:       z.string().min(1, 'Название обязательно').max(100),
  description: z.string().max(500).optional(),
  linkedLeadId: z.string().optional(),
  assignedTo:  z.string().min(1, 'Назначьте менеджера'),
  dueDate:     z.string().min(1, 'Укажите дату'),
  priority:    z.enum(['low', 'medium', 'high', 'critical']),
  reminderAt:  z.string().optional(),
})

// linkedLeadId: поиск лидов autocomplete (debounce 300ms → GET /crm/leads?search=)
// assignedTo: Select по менеджерам (Director: все, Manager: только себя)
// reminderAt: DateTimePicker (опционально)
```

#### 7.5.5 Director Task Controls

```typescript
// Дополнительный toolbar для Director:
// [Toggle: "Мои задачи" / "Все менеджеры"]
// [Manager filter: Select → фильтрует задачи по assignedTo]
// Overdue badge в sidebar: абсолютный счётчик поверх Tasks иконки
```

#### 7.5.6 Deliverable Phase 5
Полный task board с Kanban и Calendar view, создание задач, Director-контроль.

---

### Phase 6 — Analytics Dashboard

**Цель:** Дашборд со всеми метриками из PRD 5.8.

#### 7.6.1 Period Filter (sticky)

```typescript
// Sticky top-0 z-10 bg-white border-b border-gray-200
// Tabs: Today / Yesterday / This Week / This Month / Кастомный
// "Кастомный" → DateRangePicker popover
// При изменении → setAnalyticsPeriod() в Zustand → все хуки refetch
```

#### 7.6.2 AnalyticsOverviewCards.tsx

```typescript
// 6 карточек в grid: grid-cols-2 lg:grid-cols-3 gap-4

// StatCard props:
interface StatCardProps {
  icon: LucideIcon
  iconColor: string       // text-primary-600 / text-success-500 etc.
  iconBg: string          // bg-primary-50 etc.
  label: string
  value: string | number
  delta?: number          // % изменение vs предыдущий период
  onClick?: () => void    // Overdue Tasks → открыть filtered task list
}

// Delta: +12% ▲ зелёный / -5% ▼ красный / 0% серый
// Skeleton: пока грузится useAnalyticsOverview
```

#### 7.6.3 Charts

```typescript
// LeadSourcesChart.tsx — Recharts PieChart
//   PieChart + Pie + Cell (custom цвета из palette)
//   Legend справа: name + count + %
//   Custom Tooltip: название + count

// FunnelConversionChart.tsx — Recharts BarChart horizontal
//   Каждый бар = конверсия stage N → stage N+1
//   Label на баре: "72%"
//   Цвет: primary-600 → fades by conversion rate

// RevenueByManagerChart.tsx — Recharts BarChart vertical
//   X-axis: имена менеджеров
//   Y-axis: сумма (форматирование: formatCurrency)
//   Color: primary-600 / hover: primary-700

// LossReasonsChart.tsx — Recharts BarChart horizontal
//   X-axis: count
//   Y-axis: reason text (truncate 30 chars)
//   Color: danger-400

// Общие настройки Recharts:
//   Responsive: <ResponsiveContainer width="100%" height={300} />
//   Tooltip: кастомный с white bg + shadow-md
//   Animations: isAnimationActive={true}, animationDuration={600}
```

#### 7.6.4 ManagersTable.tsx

```typescript
// Таблица: border-collapse, hover row bg-gray-50
// Columns: Менеджер (avatar+name) | Лидов | Закрыто | Win Rate | Выручка | Avg Время
// Sortable columns (onClick → toggle asc/desc)
// Director: видит всех, Sort по выручке default
// Sales Manager: видит только себя (1 строка)
```

#### 7.6.5 Deliverable Phase 6
Полный аналитический дашборд со всеми метриками PRD 5.8.

---

## 8. Component Reference

Полный список компонентов с props-сигнатурами:

### 8.1 Shared

| Компонент | Key Props | Зависимости |
|---|---|---|
| `EmptyState` | `icon, title, description?, action?` | Lucide React |
| `ConfirmDialog` | `open, title, description, onConfirm, onCancel, destructive?` | shadcn Dialog |
| `DateRangePicker` | `value, onChange` | shadcn Popover + Calendar, date-fns |
| `PeriodFilter` | `value, onChange` | useCrmStore |
| `PageHeader` | `title, breadcrumb?, actions?` | — |
| `StatCard` | `icon, label, value, delta?, onClick?` | Lucide React |
| `GlobalSearch` | — | useQuery (leads + students + teachers) |
| `NotificationBell` | — | useNotifications, Zustand |
| `UserMenu` | — | useAuthStore |

### 8.2 CRM — Leads

| Компонент | Key Props | Зависимости |
|---|---|---|
| `LeadsPageHeader` | `funnels, activeFunnelId, onFunnelChange, view, onViewChange` | useCrmStore |
| `LeadsFiltersBar` | `isOpen, onToggle` | useCrmStore (filters) |
| `LeadKanban` | `stages, leadsByStage, onLeadClick` | @dnd-kit, useMoveLeadStage |
| `LeadKanbanColumn` | `stage, leads, onAddLead` | @dnd-kit, LeadCard |
| `LeadCard` | `lead, onClick, isDragging?` | — |
| `LeadTable` | `leads, isLoading, onLeadClick` | — |
| `LeadDrawer` | `leadId, open, onClose` | LeadDetail, shadcn Sheet |
| `LeadDetail` | `leadId, mode: 'drawer' \| 'page'` | useLead, LeadTimeline, TaskList |
| `LeadForm` | `defaultValues?, funnelId?, stageId?, onSuccess` | RHF + Zod, useCreateLead |
| `LeadStatusActions` | `lead, onSuccess` | useMarkLeadWon, useMarkLeadLost |
| `CsvImportWizard` | `open, onClose, funnelId` | papaparse, useImportLeads |
| `FunnelSelector` | `funnels, value, onChange` | — |

### 8.3 CRM — Timeline

| Компонент | Key Props | Зависимости |
|---|---|---|
| `LeadTimeline` | `leadId` | useTimeline (infinite) |
| `TimelineItem` | `entry: TimelineEntry` | polymorphic |
| `ActivityForm` | `leadId, onSuccess, onCancel` | useCreateActivity, RHF+Zod |
| `CommentBox` | `leadId, onSuccess` | useCreateComment |
| `TimelineComment` | `comment, currentUserId` | useUpdateComment, useDeleteComment |

### 8.4 CRM — Tasks

| Компонент | Key Props | Зависимости |
|---|---|---|
| `TaskKanban` | `tasks, onTaskClick` | @dnd-kit, useMoveTask |
| `TaskKanbanColumn` | `status, tasks, isDropDisabled?` | @dnd-kit |
| `TaskCard` | `task, onClick` | — |
| `TaskCalendar` | `tasks, view, onViewChange` | date-fns |
| `TaskForm` | `defaultValues?, leadId?, onSuccess` | RHF+Zod, useCreateTask |
| `TaskDetail` | `taskId, open, onClose` | useTask, useUpdateTask |

### 8.5 CRM — Settings

| Компонент | Key Props | Зависимости |
|---|---|---|
| `FunnelList` | `funnels, isLoading` | useFunnels |
| `FunnelCard` | `funnel, onEdit, onArchive` | FunnelForm, ConfirmDialog |
| `StageList` | `stages, funnelId` | @dnd-kit, useReorderStages |
| `StageItem` | `stage, funnelId, onUpdate, onDelete` | inline form |
| `CustomFieldList` | `fields, funnelId` | @dnd-kit |
| `CustomFieldForm` | `field?, funnelId, open, onClose` | RHF+Zod |
| `SourceList` | `sources, isLoading` | useSources |

---

## 9. Accessibility Requirements

### 9.1 Глобальные требования (WCAG 2.1 AA)

- **Контрастность текста:** минимум 4.5:1 для обычного текста, 3:1 для крупного
  - gray-700 (#374151) на white: ✅ 10.7:1
  - primary-600 (#4F46E5) на white: ✅ 5.9:1
  - sidebar-text (#C7D2FE) на sidebar-bg (#1E1B4B): ✅ 8.2:1
- **Focus ring:** `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2` на всех интерактивных элементах
- **Skip link:** `<a href="#main-content" className="sr-only focus:not-sr-only">` в topbar

### 9.2 Kanban DnD

```typescript
// @dnd-kit уже поддерживает keyboard DnD из коробки:
// Space / Enter → начать drag
// Arrow Keys → переместить
// Space / Enter → сбросить в текущей позиции
// Escape → отменить

// Announcements для screen readers:
const announcements: Announcements = {
  onDragStart: ({ active }) => `Начато перемещение: ${active.data.current?.lead?.fullName}`,
  onDragOver:  ({ active, over }) => over ? `Перемещение над этапом: ${over.data.current?.stage?.name}` : '',
  onDragEnd:   ({ active, over }) => over ? `Перемещён в этап: ${over.data.current?.stage?.name}` : 'Перемещение отменено',
}
```

### 9.3 Modals и Drawers

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- Focus trap: Radix UI Dialog делает автоматически
- `Escape` → закрыть
- Возврат фокуса на trigger-элемент при закрытии

### 9.4 Формы

- Все `<input>` имеют `<label>` с `htmlFor`
- Ошибки валидации: `aria-describedby` + `aria-invalid="true"`
- Обязательные поля: `aria-required="true"` + визуальная звёздочка `*`
- Loading state кнопки: `aria-busy="true"` + `disabled`

### 9.5 Таблицы

- `<table>` с `<caption className="sr-only">`
- `scope="col"` на заголовках
- Sortable columns: `aria-sort="ascending" | "descending" | "none"`

---

## 10. Animations & Transitions

### 10.1 Transition Defaults

```css
/* Все интерактивные элементы */
transition-colors duration-150 ease-in-out   /* цвет, фон */
transition-shadow duration-150 ease-in-out   /* тени */
transition-all duration-300 ease-in-out      /* layout transitions (sidebar) */
```

### 10.2 По компонентам

| Компонент | Анимация | Длительность |
|---|---|---|
| Sidebar collapse/expand | `transition-all duration-300` ширина 240→64px | 300ms |
| Lead Drawer open | `animate-slide-in-right` | 250ms |
| Lead Drawer close | `animate-slide-out-right` | 250ms |
| Modal открытие | `animate-scale-in` + `animate-fade-in` overlay | 150ms |
| Dropdown открытие | `animate-fade-in` (Radix built-in) | 100ms |
| Toast (sonner) | slide in bottom-right | 200ms |
| Kanban card drag | `rotate-1 scale-105 shadow-drag` immediate | — |
| Kanban drop zone | fade bg-primary-50 + border | 100ms |
| Filters bar open | max-height 0→auto transition | 250ms |
| Tab switch | opacity fade (shadcn built-in) | 150ms |
| Stat card number | не анимировать (данные точные, не counter) | — |
| Chart появление | Recharts animationDuration={600} | 600ms |
| Skeleton → content | opacity fade-in | 200ms |
| Button loading | spinner fade-in, текст fade-out | 150ms |

### 10.3 DnD Transitions

```typescript
// Не добавлять transition на draggable элементы —
// это вызывает lag при перетаскивании.
// Transition только на non-dragging элементах при reorder:
<SortableContext strategy={verticalListSortingStrategy}>
  {items.map(item => (
    <SortableItem key={item.id} id={item.id}
      // transition срабатывает только когда НЕ перетаскиваем
      className={!isDragging ? 'transition-transform duration-200' : ''}
    />
  ))}
</SortableContext>
```

### 10.4 Reduced Motion

```typescript
// Уважать prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// В Tailwind:
<div className="motion-safe:animate-slide-in-right motion-reduce:animate-none">
```

---

## 11. API Contract

### Auth
```
POST   /auth/login                body: { email, password }
POST   /auth/refresh              body: { refreshToken }
POST   /auth/logout
GET    /auth/me                   → User
```

### Funnels & Stages
```
GET    /crm/funnels               → Funnel[]
POST   /crm/funnels               body: { name }
PATCH  /crm/funnels/:id           body: { name? }
DELETE /crm/funnels/:id           → 409 если есть лиды
POST   /crm/funnels/:id/archive

GET    /crm/funnels/:id/stages    → Stage[]
POST   /crm/funnels/:id/stages    body: CreateStageDto
PATCH  /crm/funnels/:id/stages/:stageId
DELETE /crm/funnels/:id/stages/:stageId
       → 409 { conflictLeadCount, suggestMigrateTo: true } если есть лиды
POST   /crm/funnels/:id/stages/:stageId/migrate-leads  body: { toStageId }
POST   /crm/funnels/:id/stages/reorder  body: { orderedIds: string[] }
```

### Custom Fields & Sources
```
GET    /crm/funnels/:id/custom-fields      → CustomField[]
POST   /crm/funnels/:id/custom-fields      body: CustomFieldDto
PATCH  /crm/funnels/:id/custom-fields/:fieldId
DELETE /crm/funnels/:id/custom-fields/:fieldId
       → 409 { affectedLeadCount } если есть данные
POST   /crm/funnels/:id/custom-fields/reorder   body: { orderedIds }

GET    /crm/lead-sources           → LeadSource[]
POST   /crm/lead-sources           body: { name, type }
PATCH  /crm/lead-sources/:id       body: { name?, isActive? }
POST   /crm/lead-sources/:id/regenerate-secret   → { webhookSecret }
```

### Leads
```
GET    /crm/leads
  ?funnelId=&stageId[]=&sourceId[]=&assignedTo[]=
  &status[]=&search=&createdFrom=&createdTo=
  &page=&limit=&sortBy=&sortDir=
  → PaginatedResponse<Lead>

POST   /crm/leads               body: CreateLeadDto  → Lead
GET    /crm/leads/:id           → Lead
PATCH  /crm/leads/:id           body: UpdateLeadDto  → Lead
POST   /crm/leads/:id/move-stage      body: { stageId }
POST   /crm/leads/:id/assign          body: { userId }
POST   /crm/leads/:id/mark-won        → Lead
POST   /crm/leads/:id/mark-lost       body: { reason }  → Lead
POST   /crm/leads/import              multipart/form-data (csv file)
  → { jobId } для polling / SSE
GET    /crm/leads/import/:jobId/status  → { status, imported, skipped, errors[] }
```

### Timeline
```
GET    /crm/leads/:id/timeline    ?page=&limit=20  → PaginatedResponse<TimelineEntry>
POST   /crm/leads/:id/activities  body: CreateActivityDto  → Activity
POST   /crm/leads/:id/comments    body: { text }  → LeadComment
PATCH  /crm/leads/:id/comments/:commentId  body: { text }
DELETE /crm/leads/:id/comments/:commentId
```

### Tasks
```
GET    /crm/tasks
  ?assignedTo[]=&status[]=&priority[]=&leadId=&dueDateFrom=&dueDateTo=
  → Task[]

POST   /crm/tasks               body: CreateTaskDto  → Task
GET    /crm/tasks/:id           → Task
PATCH  /crm/tasks/:id           body: Partial<CreateTaskDto & { status }>
DELETE /crm/tasks/:id
POST   /crm/tasks/:id/move      body: { status: TaskStatus }
```

### Analytics
```
GET    /crm/analytics/overview          ?period=&from=&to=  → AnalyticsOverview
GET    /crm/analytics/sources           ?period=&from=&to=  → LeadSourceStat[]
GET    /crm/analytics/managers          ?period=&from=&to=  → ManagerStat[]
GET    /crm/analytics/funnel-conversion ?funnelId=&period=  → FunnelConversionStat[]
GET    /crm/analytics/loss-reasons      ?period=&from=&to=  → LossReasonStat[]
GET    /crm/analytics/forecast          ?funnelId=          → { forecast: number }
GET    /crm/analytics/time-to-close     ?period=&from=&to=  → { avgDays, delta }
GET    /crm/analytics/touches-to-close  ?period=&from=&to=  → { avgTouches, delta }
```

### Notifications
```
GET    /notifications              ?unreadOnly=true  → AppNotification[]
POST   /notifications/:id/read
POST   /notifications/read-all
```

---

## 12. UI Screens Index

| # | Экран | Route | Компонент (page.tsx) | Доступ |
|---|---|---|---|---|
| 1 | Login | /login | `(auth)/login/page.tsx` | Все |
| 2 | Leads — Kanban | /crm/leads | `(crm)/leads/page.tsx` | Director, Manager |
| 3 | Leads — List | /crm/leads?view=list | То же, условный рендер | Director, Manager |
| 4 | Lead Detail | /crm/leads/:id | `(crm)/leads/[id]/page.tsx` | Director, Manager |
| 5 | Tasks — Kanban | /crm/tasks | `(crm)/tasks/page.tsx` | Director, Manager |
| 6 | Tasks — Calendar | /crm/tasks?view=calendar | То же, условный рендер | Director, Manager |
| 7 | Analytics | /crm/analytics | `(crm)/analytics/page.tsx` | Director, Manager |
| 8 | Settings — Funnels | /crm/settings/funnels | `(crm)/settings/funnels/page.tsx` | Director only |
| 9 | Settings — Funnel Detail | /crm/settings/funnels/:id | `(crm)/settings/funnels/[id]/page.tsx` | Director only |
| 10 | Settings — Sources | /crm/settings/sources | `(crm)/settings/sources/page.tsx` | Director only |

---

## Phase Summary

| Фаза | Фокус | Ключевой результат | Компонентов |
|---|---|---|---|
| 1 | Foundation | Auth, layout, sidebar, topbar, providers | ~12 |
| 2 | Settings | Воронки, этапы, поля, источники | ~14 |
| 3 | Lead Core | Kanban, List, фильтры, создание, CSV import | ~10 |
| 4 | Lead Detail | Timeline, активности, комментарии | ~9 |
| 5 | Tasks | Task board, calendar, уведомления | ~7 |
| 6 | Analytics | Полный дашборд, все метрики PRD 5.8 | ~8 |
| **Итого** | | | **~60 компонентов** |
