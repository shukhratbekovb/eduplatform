// Custom axios adapter for demo mode.
// Intercepts all requests and returns mock data — zero network calls.

import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import {
  DEMO_FUNNEL, DEMO_STAGES, DEMO_SOURCES, DEMO_LEADS, DEMO_TASKS,
  DEMO_NOTIFICATIONS, DEMO_TIMELINES, DEMO_ANALYTICS, DEMO_USERS,
  DEMO_DIRECTOR, DEMO_TOKEN, DEMO_CUSTOM_FIELDS,
} from './data'
import type { Lead, Task } from '@/types/crm'

// In-memory mutable state so CRUD feels real within a session
let leads         = [...DEMO_LEADS]
let tasks         = [...DEMO_TASKS]
let notifications = [...DEMO_NOTIFICATIONS]
let sources       = [...DEMO_SOURCES]
let customFields  = [...DEMO_CUSTOM_FIELDS]

// ── Response helpers ──────────────────────────────────────────────────────────

function ok(data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

function resolve(res: AxiosResponse): Promise<AxiosResponse> {
  return new Promise((r) => setTimeout(() => r(res), 120))
}

function parseBody(data: unknown): Record<string, any> {
  if (!data) return {}
  if (typeof data === 'string') { try { return JSON.parse(data) } catch { return {} } }
  if (typeof data === 'object') return data as Record<string, any>
  return {}
}

function idFrom(url: string, resource: string): string {
  const m = url.match(new RegExp(`\\/${resource}\\/([^/?]+)`))
  return m?.[1] ?? ''
}

let _n = 100
function uid() { return `demo-${++_n}` }

// ── Main adapter ──────────────────────────────────────────────────────────────

export function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const url    = config.url ?? ''
  const method = (config.method ?? 'get').toLowerCase()
  const body   = parseBody(config.data)

  // ── Auth ─────────────────────────────────────────────────────────────────
  if (url.includes('/auth/login'))    return resolve(ok({ user: DEMO_DIRECTOR, accessToken: DEMO_TOKEN }, config))
  if (url.includes('/auth/me'))       return resolve(ok(DEMO_DIRECTOR, config))
  if (url.includes('/auth/logout'))   return resolve(ok({}, config))

  // ── Notifications  (/notifications — no /crm prefix) ─────────────────────
  if (url.includes('/notifications/read-all') || url.includes('/read-all'))
    return resolve(ok({}, config))
  if (url.includes('/notifications') && url.includes('/read'))
    return resolve(ok({}, config))
  if (url.includes('/notifications')) {
    if (method === 'post') {
      const id = idFrom(url, 'notifications')
      notifications = notifications.map((n) => n.id === id ? { ...n, isRead: true } : n)
      return resolve(ok({}, config))
    }
    return resolve(ok(notifications, config))
  }

  // ── CRM users/managers  (GET /crm/users) ─────────────────────────────────
  if (url.includes('/crm/users'))
    return resolve(ok(DEMO_USERS, config))

  // ── Sources  (/crm/lead-sources) ─────────────────────────────────────────
  if (url.includes('/lead-sources')) {
    const sourceId = idFrom(url, 'lead-sources')
    if (method === 'get')  return resolve(ok(sources, config))
    if (method === 'post') {
      const src = { id: uid(), isActive: true, ...body }
      sources.push(src)
      return resolve(ok(src, config))
    }
    if (method === 'patch') {
      sources = sources.map((s) => s.id === sourceId ? { ...s, ...body } : s)
      return resolve(ok(sources.find((s) => s.id === sourceId), config))
    }
    if (method === 'delete') {
      sources = sources.filter((s) => s.id !== sourceId)
      return resolve(ok({}, config))
    }
    // regenerate-secret
    return resolve(ok({ webhookSecret: `secret-${uid()}` }, config))
  }

  // ── Funnel archive ────────────────────────────────────────────────────────
  if (url.includes('/archive'))
    return resolve(ok({}, config))

  // ── Stages ────────────────────────────────────────────────────────────────
  if (url.includes('/stages')) {
    if (url.includes('/reorder'))     return resolve(ok(DEMO_STAGES, config))
    if (url.includes('/migrate-leads')) return resolve(ok({}, config))
    if (method === 'get')             return resolve(ok(DEMO_STAGES, config))
    if (method === 'post') {
      const stage = { id: uid(), funnelId: 'f1', order: DEMO_STAGES.length + 1, winProbability: 0, color: '#6366F1', ...body }
      return resolve(ok(stage, config))
    }
    if (method === 'patch')  return resolve(ok({ ...DEMO_STAGES[0], ...body }, config))
    if (method === 'delete') return resolve(ok({}, config))
  }

  // ── Custom fields ─────────────────────────────────────────────────────────
  if (url.includes('/custom-fields')) {
    const funnelId = idFrom(url, 'funnels')
    const fieldId  = idFrom(url, 'custom-fields')

    if (method === 'get') {
      const result = funnelId
        ? customFields.filter((f) => f.funnelId === funnelId)
        : customFields
      return resolve(ok(result, config))
    }
    if (method === 'post' && !url.includes('/reorder')) {
      const newField = { id: uid(), funnelId: funnelId ?? 'f1', order: customFields.length + 1, options: [], label: body.label ?? '', type: body.type ?? 'text', ...body }
      customFields = [...customFields, newField as any]
      return resolve(ok(newField, config))
    }
    if (method === 'patch' && fieldId) {
      customFields = customFields.map((f) => f.id === fieldId ? { ...f, ...body } : f)
      return resolve(ok(customFields.find((f) => f.id === fieldId) ?? {}, config))
    }
    if (method === 'delete' && fieldId) {
      customFields = customFields.filter((f) => f.id !== fieldId)
      return resolve(ok({}, config))
    }
    return resolve(ok(customFields, config))
  }

  // ── Funnels ───────────────────────────────────────────────────────────────
  if (url.includes('/crm/funnels')) {
    if (method === 'get' && !idFrom(url, 'funnels')) return resolve(ok([DEMO_FUNNEL], config))
    if (method === 'get')    return resolve(ok(DEMO_FUNNEL, config))
    if (method === 'post')   return resolve(ok({ ...DEMO_FUNNEL, id: uid(), ...body }, config))
    if (method === 'patch')  return resolve(ok({ ...DEMO_FUNNEL, ...body }, config))
    if (method === 'delete') return resolve(ok({}, config))
  }

  // ── Lead status transitions (POST endpoints) ──────────────────────────────
  if (url.includes('/mark-won')) {
    const id = idFrom(url, 'leads')
    leads = leads.map((l) => l.id === id ? { ...l, status: 'won' as const } : l)
    return resolve(ok(leads.find((l) => l.id === id) ?? {}, config))
  }
  if (url.includes('/mark-lost')) {
    const id = idFrom(url, 'leads')
    leads = leads.map((l) => l.id === id ? { ...l, status: 'lost' as const, lostReason: body.reason } : l)
    return resolve(ok(leads.find((l) => l.id === id) ?? {}, config))
  }
  if (url.includes('/move-stage')) {
    const id    = idFrom(url, 'leads')
    const stage = DEMO_STAGES.find((s) => s.id === body.stageId)
    leads = leads.map((l) => l.id === id ? { ...l, stageId: body.stageId, stage } : l)
    return resolve(ok(leads.find((l) => l.id === id) ?? {}, config))
  }

  // ── Timeline ──────────────────────────────────────────────────────────────
  if (url.includes('/timeline')) {
    const leadId  = idFrom(url, 'leads')
    const entries = DEMO_TIMELINES[leadId] ?? []
    return resolve(ok({ data: entries, total: entries.length, page: 1, limit: 20, totalPages: 1 }, config))
  }

  // ── Activities ────────────────────────────────────────────────────────────
  if (url.includes('/activities')) {
    const leadId = idFrom(url, 'leads')
    const act    = { id: uid(), leadId, ...body, createdBy: 'u1', createdByUser: DEMO_USERS[0], createdAt: new Date().toISOString() }
    if (!DEMO_TIMELINES[leadId]) DEMO_TIMELINES[leadId] = []
    DEMO_TIMELINES[leadId].unshift({ type: 'activity', date: body.date ?? act.createdAt, data: act } as any)
    return resolve(ok(act, config))
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  if (url.includes('/comments')) {
    const leadId = idFrom(url, 'leads')
    if (method === 'post') {
      const comment = { id: uid(), leadId, text: body.text, authorId: 'u1', author: DEMO_USERS[0], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      if (!DEMO_TIMELINES[leadId]) DEMO_TIMELINES[leadId] = []
      DEMO_TIMELINES[leadId].unshift({ type: 'comment', date: comment.createdAt, data: comment } as any)
      return resolve(ok(comment, config))
    }
    return resolve(ok({}, config))
  }

  // ── Leads list / create  (/crm/leads?...) ────────────────────────────────
  if (url.match(/\/crm\/leads\??[^/]*$/) || url === '/crm/leads') {
    if (method === 'get') {
      return resolve(ok({ data: leads, total: leads.length, page: 1, limit: 200, totalPages: 1 }, config))
    }
    if (method === 'post') {
      const stage = DEMO_STAGES.find((s) => s.id === body.stageId)
      const src   = DEMO_SOURCES.find((s) => s.id === body.sourceId)
      const asgn  = DEMO_USERS.find((u) => u.id === body.assignedTo)
      const lead: Lead = {
        id: uid(), status: 'active', customFields: {},
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        funnelId: 'f1', funnel: DEMO_FUNNEL, stage, source: src, assignee: asgn,
        ...body,
      }
      leads.push(lead)
      return resolve(ok(lead, config))
    }
  }

  // ── Lead detail  (/crm/leads/:id) ─────────────────────────────────────────
  if (url.includes('/crm/leads/')) {
    const id = idFrom(url, 'leads')
    if (method === 'get')    return resolve(ok(leads.find((l) => l.id === id) ?? leads[0], config))
    if (method === 'patch') {
      leads = leads.map((l) => l.id === id ? { ...l, ...body, updatedAt: new Date().toISOString() } : l)
      return resolve(ok(leads.find((l) => l.id === id), config))
    }
    if (method === 'delete') {
      leads = leads.filter((l) => l.id !== id)
      return resolve(ok({}, config))
    }
  }

  // ── Tasks move  (POST /crm/tasks/:id/move) ────────────────────────────────
  if (url.includes('/tasks/') && url.includes('/move')) {
    const id = idFrom(url, 'tasks')
    tasks = tasks.map((t) => t.id === id ? { ...t, status: body.status } : t)
    return resolve(ok(tasks.find((t) => t.id === id), config))
  }

  // ── Tasks list / create ───────────────────────────────────────────────────
  if (url.match(/\/crm\/tasks\??[^/]*$/) || url === '/crm/tasks') {
    if (method === 'get')  return resolve(ok(tasks, config))
    if (method === 'post') {
      const asgn = DEMO_USERS.find((u) => u.id === body.assignedTo)
      const task: Task = { id: uid(), status: 'pending', isAutoCreated: false, createdAt: new Date().toISOString(), assignee: asgn, ...body }
      tasks.push(task)
      return resolve(ok(task, config))
    }
  }

  // ── Tasks detail ──────────────────────────────────────────────────────────
  if (url.includes('/crm/tasks/')) {
    const id = idFrom(url, 'tasks')
    if (method === 'patch') {
      tasks = tasks.map((t) => t.id === id ? { ...t, ...body } : t)
      return resolve(ok(tasks.find((t) => t.id === id), config))
    }
    if (method === 'delete') {
      tasks = tasks.filter((t) => t.id !== id)
      return resolve(ok({}, config))
    }
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  if (url.includes('/analytics/overview'))          return resolve(ok(DEMO_ANALYTICS.overview, config))
  if (url.includes('/analytics/sources'))           return resolve(ok(DEMO_ANALYTICS.sources, config))
  if (url.includes('/analytics/managers'))          return resolve(ok(DEMO_ANALYTICS.managers, config))
  if (url.includes('/analytics/funnel-conversion')) return resolve(ok(DEMO_ANALYTICS.conversion, config))
  if (url.includes('/analytics/loss-reasons'))      return resolve(ok(DEMO_ANALYTICS.lossReasons, config))
  if (url.includes('/analytics/time-to-close'))     return resolve(ok(DEMO_ANALYTICS.timeToClose, config))
  if (url.includes('/analytics/touches-to-close'))  return resolve(ok(DEMO_ANALYTICS.touchesToClose, config))
  if (url.includes('/analytics/forecast'))          return resolve(ok({ forecast: 4_800_000 }, config))
  if (url.includes('/analytics/leads-over-time'))   return resolve(ok(DEMO_ANALYTICS.leadsOverTime, config))

  // ── Sankey: Source → Stage → Outcome ──────────────────────────────────────
  if (url.includes('/analytics/sankey')) {
    const OUTCOME_COLORS: Record<string, string> = {
      active: '#6366F1',
      won:    '#059669',
      lost:   '#EF4444',
    }
    const OUTCOME_LABELS: Record<string, string> = {
      active: 'В работе',
      won:    'Выиграно',
      lost:   'Проиграно',
    }
    const SOURCE_COLORS = ['#3B82F6', '#EC4899', '#F97316', '#8B5CF6']

    const srcMap: Record<string, { label: string; color: string; value: number }> = {}
    const stgMap: Record<string, { label: string; color: string; value: number }> = {}
    const outMap: Record<string, { label: string; color: string; value: number }> = {
      won:    { label: OUTCOME_LABELS.won,    color: OUTCOME_COLORS.won,    value: 0 },
      lost:   { label: OUTCOME_LABELS.lost,   color: OUTCOME_COLORS.lost,   value: 0 },
      active: { label: OUTCOME_LABELS.active, color: OUTCOME_COLORS.active, value: 0 },
    }
    const linkMap: Record<string, number> = {}
    let srcColorIdx = 0

    for (const lead of leads) {
      const srcId = lead.sourceId ?? 'unknown'
      const stgId = lead.stageId  ?? 'unknown'
      const out   = lead.status   ?? 'active'

      if (!srcMap[srcId]) {
        srcMap[srcId] = {
          label: lead.source?.name ?? srcId,
          color: SOURCE_COLORS[srcColorIdx++ % SOURCE_COLORS.length],
          value: 0,
        }
      }
      srcMap[srcId].value++

      if (!stgMap[stgId]) {
        stgMap[stgId] = {
          label: lead.stage?.name ?? stgId,
          color: lead.stage?.color ?? '#6366F1',
          value: 0,
        }
      }
      stgMap[stgId].value++
      outMap[out].value++

      const k1 = `${srcId}|${stgId}`
      const k2 = `${stgId}|${out}`
      linkMap[k1] = (linkMap[k1] ?? 0) + 1
      linkMap[k2] = (linkMap[k2] ?? 0) + 1
    }

    const nodes = [
      ...Object.entries(srcMap).map(([id, n]) => ({ id, column: 0 as const, ...n })),
      ...Object.entries(stgMap).map(([id, n]) => ({ id, column: 1 as const, ...n })),
      ...Object.entries(outMap).filter(([, n]) => n.value > 0).map(([id, n]) => ({ id, column: 2 as const, ...n })),
    ]

    const links = Object.entries(linkMap).map(([key, value]) => {
      const [sourceId, targetId] = key.split('|')
      return { sourceId, targetId, value }
    })

    return resolve(ok({ nodes, links }, config))
  }

  // Fallback
  return resolve(ok({}, config))
}
