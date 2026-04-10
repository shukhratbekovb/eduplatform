export interface AnalyticsOverview {
  totalTasks: number
  completedTasks: number
  completedTasksPercent: number
  overdueTasks: number
  newLeads: number
  wonLeads: number
  avgResponseTimeHours: number
  delta: {
    newLeads: number
    wonLeads: number
    avgResponseTimeHours: number
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
  leadsLost: number
  wonRate: number
  avgResponseTimeHours: number
}

export interface LossReasonStat {
  reason: string
  count: number
  percent: number
}

export interface CloseStat {
  avgDays: number
  delta: number
}

export interface TouchesStat {
  avgTouches: number
  delta: number
}

export interface LeadsOverTimeStat {
  date: string      // 'YYYY-MM-DD'
  newLeads: number
  wonLeads: number
}

// ── Sankey: Source → Stage → Outcome ─────────────────────────────────────────

export interface SankeyNode {
  id: string
  label: string
  color: string
  column: 0 | 1 | 2   // 0=source, 1=stage, 2=outcome
  value: number
}

export interface SankeyLink {
  sourceId: string
  targetId: string
  value: number
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}
