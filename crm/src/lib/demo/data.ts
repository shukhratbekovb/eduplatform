// @ts-nocheck
// ─── Demo mock data for EduPlatform CRM ──────────────────────────────────────
// Fictional education center «АкадемияПро»

import type {
  User, Funnel, Stage, LeadSource, Lead, Task, AppNotification,
  Activity, StageChange, LeadComment, TimelineEntry, CustomField,
} from '@/types/crm'

// ── Users ────────────────────────────────────────────────────────────────────

export const DEMO_USERS: User[] = [
  { id: 'u1', name: 'Алексей Директоров', email: 'director@demo.ru', role: 'director' },
  { id: 'u2', name: 'Сания Касымова',     email: 'sania@demo.ru',    role: 'sales_manager' },
  { id: 'u3', name: 'Марат Ибрагимов',   email: 'marat@demo.ru',    role: 'sales_manager' },
]

export const DEMO_DIRECTOR = DEMO_USERS[0]
export const DEMO_TOKEN    = 'demo-token-xxx'

// ── Funnel & Stages ──────────────────────────────────────────────────────────

export const DEMO_FUNNEL: Funnel = {
  id: 'f1',
  name: 'Основная воронка',
  isArchived: false,
  stageCount: 5,
  leadCount: 15,
  createdAt: '2025-09-01T00:00:00Z',
}

export const DEMO_STAGES: Stage[] = [
  { id: 's1', funnelId: 'f1', name: 'Новый',        color: '#6366F1', winProbability: 10, order: 1 },
  { id: 's2', funnelId: 'f1', name: 'Квалификация', color: '#3B82F6', winProbability: 30, order: 2 },
  { id: 's3', funnelId: 'f1', name: 'Презентация',  color: '#F59E0B', winProbability: 50, order: 3 },
  { id: 's4', funnelId: 'f1', name: 'Переговоры',   color: '#8B5CF6', winProbability: 70, order: 4 },
  { id: 's5', funnelId: 'f1', name: 'Договор',      color: '#059669', winProbability: 90, order: 5 },
]

// ── Custom Fields ─────────────────────────────────────────────────────────────

export const DEMO_CUSTOM_FIELDS: CustomField[] = [
  {
    id: 'cf1', funnelId: 'f1', label: 'Направление', type: 'select',
    options: ['Frontend', 'Backend', 'Design', 'Marketing', 'Python'], order: 1,
  },
  {
    id: 'cf2', funnelId: 'f1', label: 'Бюджет (₸)', type: 'number', order: 2,
  },
  {
    id: 'cf3', funnelId: 'f1', label: 'Дата первого контакта', type: 'date', order: 3,
  },
  {
    id: 'cf4', funnelId: 'f1', label: 'Интересующие курсы', type: 'multiselect',
    options: ['HTML/CSS', 'JavaScript', 'React', 'Node.js', 'Python', 'Figma', 'SQL'], order: 4,
  },
  {
    id: 'cf5', funnelId: 'f1', label: 'Нужна рассрочка', type: 'checkbox', order: 5,
  },
  {
    id: 'cf6', funnelId: 'f1', label: 'Комментарий', type: 'text', order: 6,
  },
]

// ── Sources ──────────────────────────────────────────────────────────────────

export const DEMO_SOURCES: LeadSource[] = [
  { id: 'src1', name: 'Сайт',          type: 'api',    isActive: true,  webhookUrl: 'https://api.demo.ru/hook/site' },
  { id: 'src2', name: 'Instagram',     type: 'manual', isActive: true },
  { id: 'src3', name: 'Рекомендация',  type: 'manual', isActive: true },
  { id: 'src4', name: 'Таргетированная реклама', type: 'import', isActive: true },
]

// ── Leads ────────────────────────────────────────────────────────────────────

const mkLead = (
  id: string, name: string, phone: string, stageIdx: number, sourceIdx: number,
  assigneeIdx: number, status: Lead['status'] = 'active',
  extra?: Partial<Lead>
): Lead => ({
  id,
  fullName:    name,
  phone,
  email:       `${id}@example.com`,
  sourceId:    DEMO_SOURCES[sourceIdx].id,
  source:      DEMO_SOURCES[sourceIdx],
  funnelId:    DEMO_FUNNEL.id,
  funnel:      DEMO_FUNNEL,
  stageId:     DEMO_STAGES[stageIdx].id,
  stage:       DEMO_STAGES[stageIdx],
  assignedTo:  DEMO_USERS[assigneeIdx].id,
  assignee:    DEMO_USERS[assigneeIdx],
  status,
  customFields: {},
  createdAt:   '2026-02-15T10:00:00Z',
  updatedAt:   '2026-03-20T14:30:00Z',
  lastActivityAt: '2026-03-22T11:00:00Z',
  ...extra,
})

export const DEMO_LEADS: Lead[] = [
  mkLead('l1', 'Айгерим Сейткали', '+7 701 234 56 78', 0, 0, 1, 'active', {
    customFields: { cf1: 'Frontend', cf2: 1500000, cf3: '2026-03-01', cf4: ['HTML/CSS', 'JavaScript'], cf5: true, cf6: 'Рассматривает онлайн-обучение' },
  }),
  mkLead('l2', 'Данияр Ахметов', '+7 702 345 67 89', 1, 1, 1, 'active', {
    customFields: { cf1: 'Backend', cf2: 2000000, cf3: '2026-03-05', cf4: ['Node.js', 'SQL'], cf5: false },
  }),
  mkLead('l3',  'Лейла Нурланова',    '+7 707 456 78 90', 1, 2, 2, 'active', {
    customFields: { cf1: 'Design', cf4: ['Figma'], cf5: true },
  }),
  mkLead('l4',  'Тимур Жаксыбеков',   '+7 705 567 89 01', 2, 0, 1),
  mkLead('l5',  'Зарина Смагулова',   '+7 700 678 90 12', 2, 3, 2),
  mkLead('l6',  'Асхат Бейсенов',     '+7 771 789 01 23', 2, 1, 1),
  mkLead('l7',  'Назгуль Амирова',    '+7 775 890 12 34', 3, 2, 2),
  mkLead('l8',  'Ерлан Касымов',      '+7 776 901 23 45', 3, 0, 1),
  mkLead('l9',  'Жанар Токова',       '+7 778 012 34 56', 4, 3, 2),
  mkLead('l10', 'Нурсулу Байжанова',  '+7 747 123 45 67', 4, 1, 1),
  mkLead('l11', 'Санжар Алибеков',    '+7 702 234 56 78', 4, 2, 2),
  mkLead('l12', 'Айдана Сейткали',    '+7 701 345 67 89', 0, 0, 1),
  mkLead('l13', 'Бауыржан Нуров',     '+7 707 456 78 91', 1, 3, 2),
  mkLead('l14', 'Гульмира Ахметова',  '+7 705 567 89 02', 0, 1, 1, 'won',  { lostReason: undefined }),
  mkLead('l15', 'Руслан Джаксыбеков', '+7 700 678 90 13', 0, 2, 2, 'lost', { lostReason: 'Не подходит бюджет' }),
]

// ── Tasks ────────────────────────────────────────────────────────────────────

const due = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export const DEMO_TASKS: Task[] = [
  {
    id: 't1', title: 'Позвонить Айгерим и уточнить детали', description: 'Уточнить направление обучения',
    linkedLeadId: 'l1', linkedLead: { id: 'l1', fullName: 'Айгерим Сейткали' },
    assignedTo: 'u2', assignee: DEMO_USERS[1],
    dueDate: due(1), priority: 'high', status: 'pending', isAutoCreated: false, createdAt: due(-2),
  },
  {
    id: 't2', title: 'Отправить КП Данияру', description: 'Выслать PDF с программой курса',
    linkedLeadId: 'l2', linkedLead: { id: 'l2', fullName: 'Данияр Ахметов' },
    assignedTo: 'u2', assignee: DEMO_USERS[1],
    dueDate: due(0), priority: 'medium', status: 'in_progress', isAutoCreated: false, createdAt: due(-3),
  },
  {
    id: 't3', title: 'Провести демо-урок для Зарины', description: undefined,
    linkedLeadId: 'l5', linkedLead: { id: 'l5', fullName: 'Зарина Смагулова' },
    assignedTo: 'u3', assignee: DEMO_USERS[2],
    dueDate: due(2), priority: 'high', status: 'pending', isAutoCreated: false, createdAt: due(-1),
  },
  {
    id: 't4', title: 'Follow-up после встречи с Назгуль', description: undefined,
    linkedLeadId: 'l7', linkedLead: { id: 'l7', fullName: 'Назгуль Амирова' },
    assignedTo: 'u3', assignee: DEMO_USERS[2],
    dueDate: due(3), priority: 'critical', status: 'pending', isAutoCreated: true, createdAt: due(-1),
  },
  {
    id: 't5', title: 'Подготовить договор для Ерлана',
    linkedLeadId: 'l8', linkedLead: { id: 'l8', fullName: 'Ерлан Касымов' },
    assignedTo: 'u2', assignee: DEMO_USERS[1],
    dueDate: due(1), priority: 'high', status: 'pending', isAutoCreated: false, createdAt: due(-2),
  },
  {
    id: 't6', title: 'Проверить оплату Жанар', description: undefined,
    linkedLeadId: 'l9', linkedLead: { id: 'l9', fullName: 'Жанар Токова' },
    assignedTo: 'u3', assignee: DEMO_USERS[2],
    dueDate: due(-1), priority: 'critical', status: 'overdue', isAutoCreated: true, createdAt: due(-5),
  },
  {
    id: 't7', title: 'Позвонить Нурсулу — повторный контакт',
    linkedLeadId: 'l10', linkedLead: { id: 'l10', fullName: 'Нурсулу Байжанова' },
    assignedTo: 'u2', assignee: DEMO_USERS[1],
    dueDate: due(-2), priority: 'high', status: 'overdue', isAutoCreated: false, createdAt: due(-6),
  },
  {
    id: 't8', title: 'Согласовать расписание с Санжаром',
    linkedLeadId: 'l11', linkedLead: { id: 'l11', fullName: 'Санжар Алибеков' },
    assignedTo: 'u3', assignee: DEMO_USERS[2],
    dueDate: due(5), priority: 'medium', status: 'done', isAutoCreated: false, createdAt: due(-7),
  },
  {
    id: 't9', title: 'Обновить базу Instagram-лидов', description: 'Загрузить CSV из рекламного кабинета',
    assignedTo: 'u2', assignee: DEMO_USERS[1],
    dueDate: due(7), priority: 'low', status: 'pending', isAutoCreated: false, createdAt: due(-1),
  },
]

// ── Notifications ────────────────────────────────────────────────────────────

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1', type: 'task_overdue', isRead: false,
    title: 'Задача просрочена',
    body:  'Проверить оплату Жанар — срок вышел вчера',
    linkedTaskId: 't6', createdAt: due(-1),
  },
  {
    id: 'n2', type: 'task_due_soon', isRead: false,
    title: 'Задача выполняется сегодня',
    body:  'Отправить КП Данияру — срок сегодня',
    linkedTaskId: 't2', createdAt: due(0),
  },
  {
    id: 'n3', type: 'task_assigned', isRead: true,
    title: 'Новая задача назначена',
    body:  'Follow-up после встречи с Назгуль',
    linkedTaskId: 't4', createdAt: due(-1),
  },
]

// ── Timeline ─────────────────────────────────────────────────────────────────

export const DEMO_TIMELINES: Record<string, TimelineEntry[]> = {
  l4: [
    {
      type: 'stage_change', date: '2026-03-10T09:00:00Z',
      data: {
        id: 'sc1', leadId: 'l4',
        fromStageId: 's1', fromStage: DEMO_STAGES[0],
        toStageId:   's2', toStage:   DEMO_STAGES[1],
        changedBy: 'u2', changedByUser: DEMO_USERS[1],
        changedAt: '2026-03-10T09:00:00Z',
      } as StageChange,
    },
    {
      type: 'activity', date: '2026-03-12T11:30:00Z',
      data: {
        id: 'a1', leadId: 'l4', type: 'call',
        date: '2026-03-12T11:30:00Z',
        outcome: 'Клиент заинтересован в курсе английского. Согласился на презентацию.',
        durationMinutes: 12,
        needsFollowUp: true,
        createdBy: 'u2', createdByUser: DEMO_USERS[1],
        createdAt: '2026-03-12T11:31:00Z',
      } as Activity,
    },
    {
      type: 'stage_change', date: '2026-03-15T10:00:00Z',
      data: {
        id: 'sc2', leadId: 'l4',
        fromStageId: 's2', fromStage: DEMO_STAGES[1],
        toStageId:   's3', toStage:   DEMO_STAGES[2],
        changedBy: 'u2', changedByUser: DEMO_USERS[1],
        changedAt: '2026-03-15T10:00:00Z',
      } as StageChange,
    },
    {
      type: 'activity', date: '2026-03-18T15:00:00Z',
      data: {
        id: 'a2', leadId: 'l4', type: 'meeting',
        date: '2026-03-18T15:00:00Z',
        outcome: 'Провели презентацию курса. Клиент попросил время подумать.',
        notes: 'Интересует формат: онлайн или оффлайн',
        needsFollowUp: true,
        createdBy: 'u2', createdByUser: DEMO_USERS[1],
        createdAt: '2026-03-18T15:45:00Z',
      } as Activity,
    },
    {
      type: 'comment', date: '2026-03-20T09:00:00Z',
      data: {
        id: 'c1', leadId: 'l4',
        text: 'Клиент сказал, что посоветовался с женой. Скорее всего возьмёт оффлайн.',
        authorId: 'u2', author: DEMO_USERS[1],
        createdAt: '2026-03-20T09:00:00Z',
        updatedAt: '2026-03-20T09:00:00Z',
      } as LeadComment,
    },
  ],
}

// ── Analytics ────────────────────────────────────────────────────────────────

export const DEMO_ANALYTICS = {
  overview: {
    totalTasks: 9, completedTasks: 1, completedTasksPercent: 11,
    overdueTasks: 2, newLeads: 15, wonLeads: 1,
    avgResponseTimeHours: 2.4,
    delta: { newLeads: 18, wonLeads: -50, avgResponseTimeHours: -12 },
  },
  sources: [
    { sourceId: 'src1', sourceName: 'Сайт',                     count: 6, percent: 40 },
    { sourceId: 'src2', sourceName: 'Instagram',                 count: 4, percent: 27 },
    { sourceId: 'src3', sourceName: 'Рекомендация',              count: 3, percent: 20 },
    { sourceId: 'src4', sourceName: 'Таргетированная реклама',   count: 2, percent: 13 },
  ],
  managers: [
    {
      userId: 'u2', userName: 'Сания Касымова',
      leadsHandled: 9, leadsWon: 5, leadsLost: 2,
      wonRate: 0.56, avgResponseTimeHours: 1.8,
    },
    {
      userId: 'u3', userName: 'Марат Ибрагимов',
      leadsHandled: 6, leadsWon: 3, leadsLost: 1,
      wonRate: 0.50, avgResponseTimeHours: 3.1,
    },
  ],
  conversion: [
    { fromStageId: '', fromStageName: '',               toStageId: 's1', toStageName: 'Новый',        conversionRate: 1.00, leadCount: 15 },
    { fromStageId: 's1', fromStageName: 'Новый',        toStageId: 's2', toStageName: 'Квалификация', conversionRate: 0.73, leadCount: 11 },
    { fromStageId: 's2', fromStageName: 'Квалификация', toStageId: 's3', toStageName: 'Презентация',  conversionRate: 0.64, leadCount: 7 },
    { fromStageId: 's3', fromStageName: 'Презентация',  toStageId: 's4', toStageName: 'Переговоры',   conversionRate: 0.57, leadCount: 4 },
    { fromStageId: 's4', fromStageName: 'Переговоры',   toStageId: 's5', toStageName: 'Договор',      conversionRate: 0.75, leadCount: 3 },
  ],
  lossReasons: [
    { reason: 'Не подходит бюджет',   count: 5, percent: 38 },
    { reason: 'Выбрал конкурента',    count: 4, percent: 31 },
    { reason: 'Не актуально сейчас',  count: 2, percent: 15 },
    { reason: 'Нет времени',          count: 1, percent: 8 },
    { reason: 'Другое',               count: 1, percent: 8 },
  ],
  timeToClose:    { avgDays: 18.4, delta: -2.1 },
  touchesToClose: { avgTouches: 4.7, delta: 0.3 },
  leadsOverTime: (() => {
    const days = 30
    const base = new Date('2026-03-11')
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      const date = d.toISOString().split('T')[0]
      const newLeads = Math.floor(Math.random() * 4) + 1
      const wonLeads = Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : 0
      return { date, newLeads, wonLeads }
    })
  })(),
}
