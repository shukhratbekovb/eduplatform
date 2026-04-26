'use client'

/**
 * Страница дашборда LMS с ролевым распределением виджетов.
 *
 * Отображает разные наборы виджетов в зависимости от роли пользователя:
 * - Директор: обзор учебного процесса, финансы, уведомления, быстрые ссылки
 * - МУП: задачи, запросы на позднее внесение, академический процесс
 * - Преподаватель: сегодняшние уроки, мои группы, расписание
 * - Кассир: финансовые показатели (доход, должники, просрочки)
 *
 * Данные загружаются через React Query из нескольких API-эндпоинтов.
 *
 * @module DashboardPage
 */

import Link from 'next/link'
import { format, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Users, BookOpen, BarChart2, AlertTriangle, Clock, CheckSquare,
  TrendingUp, TrendingDown, Minus, CalendarDays, ClipboardList,
  ArrowRight, GraduationCap, UserCheck, Banknote, Wallet, CircleDollarSign,
} from 'lucide-react'
import { Bell as BellIcon } from 'lucide-react'
import { useCurrentUser, useIsDirector, useIsDirectorOrMup, useIsMup, useIsTeacher, useIsCashier } from '@/lib/stores/useAuthStore'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useAnalyticsOverview } from '@/lib/hooks/lms/useAnalytics'
import { useNotifications } from '@/lib/hooks/lms/useSettings'
import { useLateRequests } from '@/lib/hooks/lms/useLateRequests'
import { useMupTasks } from '@/lib/hooks/lms/useMupTasks'
import { useSchedule } from '@/lib/hooks/lms/useSchedule'
import { useGroups } from '@/lib/hooks/lms/useGroups'
import { toIsoDate, formatRelativeDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'
import type { LmsAnalyticsOverview } from '@/types/lms'

/** Форматирование суммы в UZS (узбекских сумах) */
function fmt(n: number) { return n.toLocaleString() + ' UZS' }

/**
 * Хук для загрузки финансовой статистики дашборда.
 * Доступен только директору и кассиру.
 *
 * @param enabled - включить ли запрос (зависит от роли)
 * @returns доход за месяц/сегодня, кол-во должников, сумма просрочки
 */
function useFinanceDashboardStats(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'finance-stats'],
    queryFn: () => apiClient.get('/lms/reports/finance/dashboard-stats').then((r) => r.data as {
      incomeMonth: number; incomeToday: number; debtorCount: number; overdueTotal: number; expectedMonth: number
    }),
    enabled,
    staleTime: 60_000,
  })
}

// ── Карточка статистики ──────────────────────────────────────────────────────

/** Пропсы карточки статистики с опциональной дельтой и ссылкой */
interface StatCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  iconColor: string
  delta?: number
  deltaLabel?: string
  href?: string
  danger?: boolean
  warning?: boolean
}

/**
 * Универсальная карточка статистики.
 * Отображает значение, иконку, опциональную дельту (тренд) и может быть ссылкой.
 * Поддерживает стили danger (красный) и warning (жёлтый) для критических показателей.
 */
function StatCard({ label, value, icon: Icon, iconColor, delta, deltaLabel, href, danger, warning }: StatCardProps) {
  const inner = (
    <div className={cn(
      'bg-white rounded-xl border p-5 flex flex-col gap-3 transition-shadow',
      href ? 'hover:shadow-md cursor-pointer' : '',
      danger ? 'border-danger-200 bg-danger-50/40' : warning ? 'border-warning-200 bg-warning-50/40' : 'border-gray-200',
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={cn('p-2 rounded-lg', iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {delta != null && (
        <div className="flex items-center gap-1 text-xs">
          {delta > 0
            ? <TrendingUp className="w-3.5 h-3.5 text-success-500" />
            : delta < 0
            ? <TrendingDown className="w-3.5 h-3.5 text-danger-500" />
            : <Minus className="w-3.5 h-3.5 text-gray-400" />
          }
          <span className={delta > 0 ? 'text-success-600' : delta < 0 ? 'text-danger-600' : 'text-gray-400'}>
            {delta > 0 ? '+' : ''}{typeof delta === 'number' ? delta.toFixed(delta % 1 === 0 ? 0 : 1) : delta}
          </span>
          {deltaLabel && <span className="text-gray-400">{deltaLabel}</span>}
        </div>
      )}
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

// ── Quick link ───────────────────────────────────────────────────────────────

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors group"
    >
      <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
    </Link>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-4 w-24 bg-gray-100 rounded mb-4" />
      <div className="h-8 w-16 bg-gray-100 rounded" />
    </div>
  )
}

// ── Виджет уведомлений ───────────────────────────────────────────────────────

const NOTIF_TYPE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  debt_alert:       { icon: Banknote,       color: 'text-danger-600' },
  risk_alert:       { icon: AlertTriangle,  color: 'text-warning-600' },
  homework_overdue: { icon: ClipboardList,  color: 'text-orange-600' },
  payment_due:      { icon: Banknote,       color: 'text-primary-600' },
}

/**
 * Виджет последних уведомлений на дашборде.
 * Показывает до 5 последних уведомлений с иконками по типу.
 */
function NotificationsWidget() {
  const t = useT()
  const { data: notifications = [] } = useNotifications()
  const recent = (notifications as any[]).slice(0, 5)
  const unread = (notifications as any[]).filter((n) => !n.isRead).length

  if (recent.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader title={t('dash.notifications')} />
        {unread > 0 && (
          <Link href="/notifications" className="text-xs text-primary-600 hover:underline">
            {unread} {t('dash.unread')}
          </Link>
        )}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-50 overflow-hidden">
        {recent.map((n: any) => {
          const cfg = NOTIF_TYPE_ICONS[n.type] ?? { icon: BellIcon, color: 'text-gray-500' }
          const Icon = cfg.icon
          return (
            <div key={n.id} className={cn('flex items-start gap-3 px-4 py-3', !n.isRead && 'bg-primary-50/30')}>
              <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', cfg.color)} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm leading-tight', !n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700')}>
                  {n.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{formatRelativeDate(n.createdAt)}</p>
              </div>
            </div>
          )
        })}
      </div>
      <Link href="/notifications" className="block mt-2 text-center text-xs text-primary-600 hover:underline py-1">
        {t('topbar.allNotifications')}
      </Link>
    </div>
  )
}

// ── Дашборд директора ────────────────────────────────────────────────────────

/**
 * Дашборд для роли "Директор".
 * Обзорные KPI, академические показатели, финансовый блок, уведомления.
 */
function DirectorDashboard({ overview, finStats }: { overview: LmsAnalyticsOverview; finStats?: { incomeMonth: number; incomeToday: number; debtorCount: number; overdueTotal: number; expectedMonth: number } }) {
  const t = useT()
  return (
    <>
      <SectionHeader title={t('dash.overview')} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label={t('dash.students')}
          value={overview.totalStudents}
          icon={Users}
          iconColor="bg-primary-50 text-primary-600"
          href="/students"
        />
        <StatCard
          label={t('dash.activeGroups')}
          value={overview.activeGroups}
          icon={BookOpen}
          iconColor="bg-indigo-50 text-indigo-600"
          href="/groups"
        />
        <StatCard
          label={t('dash.lessonsThisWeek')}
          value={overview.lessonsThisWeek}
          icon={CalendarDays}
          iconColor="bg-blue-50 text-blue-600"
          href="/schedule"
        />
        <StatCard
          label={t('dash.avgAttendance')}
          value={`${overview.avgAttendance}%`}
          icon={UserCheck}
          iconColor="bg-success-50 text-success-600"
          delta={overview.delta.avgAttendance}
          deltaLabel={t('dash.pct7days')}
        />
        <StatCard
          label={t('dash.atRisk')}
          value={overview.atRiskStudents}
          icon={AlertTriangle}
          iconColor="bg-warning-50 text-warning-600"
          delta={overview.delta.atRiskStudents}
          deltaLabel={t('dash.per7days')}
          warning={overview.atRiskStudents > 0}
          href="/students"
        />
        <StatCard
          label={t('dash.criticalStudents')}
          value={overview.criticalStudents}
          icon={AlertTriangle}
          iconColor="bg-danger-50 text-danger-600"
          danger={overview.criticalStudents > 0}
          href="/students"
        />
      </div>

      <SectionHeader title={t('dash.academic')} />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          label={t('dash.incompleteLessons')}
          value={overview.incompleteLesson}
          icon={Clock}
          iconColor="bg-danger-50 text-danger-600"
          danger={overview.incompleteLesson > 0}
          href="/schedule"
        />
        <StatCard
          label={t('dash.hwSubmitRate')}
          value={`${overview.homeworkSubmitRate}%`}
          icon={ClipboardList}
          iconColor="bg-purple-50 text-purple-600"
          delta={overview.delta.homeworkSubmitRate}
          deltaLabel={t('dash.pct7days')}
          href="/homework"
        />
      </div>

      {finStats && (
        <>
          <SectionHeader title={t('dash.finance')} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label={t('dash.incomeMonth')}
              value={fmt(finStats.incomeMonth)}
              icon={Banknote}
              iconColor="bg-success-50 text-success-600"
              href="/reports"
            />
            <StatCard
              label={t('dash.expectedMonth')}
              value={fmt(finStats.expectedMonth)}
              icon={CircleDollarSign}
              iconColor="bg-blue-50 text-blue-600"
              href="/reports"
            />
            <StatCard
              label={t('dash.debtors')}
              value={finStats.debtorCount}
              icon={AlertTriangle}
              iconColor="bg-danger-50 text-danger-600"
              danger={finStats.debtorCount > 0}
              href="/reports"
            />
            <StatCard
              label={t('dash.overdueDebt')}
              value={fmt(finStats.overdueTotal)}
              icon={Wallet}
              iconColor="bg-warning-50 text-warning-600"
              warning={finStats.overdueTotal > 0}
              href="/reports"
            />
          </div>
        </>
      )}

      <NotificationsWidget />

      <SectionHeader title={t('dash.quickLinks')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <QuickLink href="/finance"      label={t('dash.acceptPayment')}  icon={Banknote} />
        <QuickLink href="/reports"      label={t('dash.reports')}        icon={BarChart2} />
        <QuickLink href="/analytics"    label={t('nav.analytics')}       icon={BarChart2} />
        <QuickLink href="/attendance"   label={t('nav.attendance')}      icon={UserCheck} />
      </div>
    </>
  )
}

/**
 * Дашборд для роли "МУП" (менеджер учебного процесса).
 * Запросы на позднее внесение, открытые задачи, академические показатели.
 */
function MupDashboard({ overview, pendingLate, openTasks }: {
  overview: LmsAnalyticsOverview
  pendingLate: number
  openTasks: number
}) {
  const t = useT()
  return (
    <>
      <SectionHeader title={t('dash.tasksAndRequests')} />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          label={t('dash.pendingLateRequests')}
          value={pendingLate}
          icon={Clock}
          iconColor="bg-warning-50 text-warning-600"
          warning={pendingLate > 0}
          href="/late-requests"
        />
        <StatCard
          label={t('dash.openTasks')}
          value={openTasks}
          icon={CheckSquare}
          iconColor="bg-primary-50 text-primary-600"
          href="/tasks"
        />
      </div>

      <SectionHeader title={t('dash.academicProcess')} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label={t('dash.avgAttendance')}
          value={`${overview.avgAttendance}%`}
          icon={UserCheck}
          iconColor="bg-success-50 text-success-600"
          delta={overview.delta.avgAttendance}
          deltaLabel="%"
        />
        <StatCard
          label={t('dash.atRisk')}
          value={overview.atRiskStudents}
          icon={AlertTriangle}
          iconColor="bg-warning-50 text-warning-600"
          warning={overview.atRiskStudents > 0}
          href="/students"
        />
        <StatCard
          label={t('dash.incompleteLessons')}
          value={overview.incompleteLesson}
          icon={Clock}
          iconColor="bg-danger-50 text-danger-600"
          danger={overview.incompleteLesson > 0}
          href="/schedule"
        />
      </div>

      <NotificationsWidget />

      <SectionHeader title={t('dash.quickLinks')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <QuickLink href="/late-requests" label={t('nav.lateRequests')}  icon={Clock} />
        <QuickLink href="/tasks"         label={t('nav.tasks')}         icon={CheckSquare} />
        <QuickLink href="/students"      label={t('nav.students')}      icon={Users} />
        <QuickLink href="/analytics"     label={t('nav.analytics')}     icon={BarChart2} />
      </div>
    </>
  )
}

/**
 * Дашборд для роли "Преподаватель".
 * Уроки на сегодня, количество групп, расписание дня.
 */
function TeacherDashboard({ todayLessons, groupCount }: {
  todayLessons: any[]
  groupCount: number
}) {
  const t = useT()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const today = todayLessons.filter((l: any) => l.date === todayStr)

  return (
    <>
      <SectionHeader title={t('common.today')} />
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          label={t('dash.lessonsToday')}
          value={today.length}
          icon={CalendarDays}
          iconColor="bg-primary-50 text-primary-600"
          href="/schedule"
        />
        <StatCard
          label={t('dash.myGroups')}
          value={groupCount}
          icon={BookOpen}
          iconColor="bg-indigo-50 text-indigo-600"
          href="/groups"
        />
      </div>

      {today.length > 0 && (
        <>
          <SectionHeader title={t('dash.todaySchedule')} />
          <div className="space-y-2 mb-8">
            {today.map((lesson: any) => (
              <Link
                key={lesson.id}
                href={`/lessons/${lesson.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{(lesson as any).group?.name ?? ""}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lesson.startTime} – {lesson.endTime}
                    {(lesson as any).room && ` · ${(lesson as any).room.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    lesson.status === 'conducted'   ? 'bg-success-50 text-success-700' :
                    lesson.status === 'in_progress' ? 'bg-warning-50 text-warning-700' :
                    lesson.status === 'incomplete'  ? 'bg-danger-50 text-danger-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {lesson.status === 'conducted' ? t('dash.conducted') :
                     lesson.status === 'in_progress' ? t('dash.inProgress') :
                     lesson.status === 'incomplete' ? t('dash.incomplete') : t('dash.scheduled')}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <SectionHeader title={t('dash.quickLinks')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <QuickLink href="/schedule"  label={t('nav.schedule')}      icon={CalendarDays} />
        <QuickLink href="/homework"  label={t('nav.homework')}      icon={ClipboardList} />
        <QuickLink href="/students"  label={t('nav.students')}      icon={Users} />
        <QuickLink href="/attendance" label={t('nav.attendance')}   icon={UserCheck} />
      </div>
    </>
  )
}

/**
 * Дашборд для роли "Кассир".
 * Доход за сегодня/месяц, должники, просроченная задолженность.
 */
function CashierDashboard({ finStats }: { finStats?: { incomeMonth: number; incomeToday: number; debtorCount: number; overdueTotal: number; expectedMonth: number } }) {
  const t = useT()
  return (
    <>
      {finStats && (
        <>
          <SectionHeader title={t('common.today')} />
          <div className="grid grid-cols-2 gap-4 mb-8">
            <StatCard
              label={t('dash.incomeToday')}
              value={fmt(finStats.incomeToday)}
              icon={Banknote}
              iconColor="bg-success-50 text-success-600"
              href="/finance"
            />
            <StatCard
              label={t('dash.debtors')}
              value={finStats.debtorCount}
              icon={AlertTriangle}
              iconColor="bg-danger-50 text-danger-600"
              danger={finStats.debtorCount > 0}
              href="/reports"
            />
          </div>

          <SectionHeader title={t('dash.general')} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <StatCard
              label={t('dash.incomeMonth')}
              value={fmt(finStats.incomeMonth)}
              icon={Wallet}
              iconColor="bg-success-50 text-success-600"
              href="/reports"
            />
            <StatCard
              label={t('dash.overdueDebt')}
              value={fmt(finStats.overdueTotal)}
              icon={AlertTriangle}
              iconColor="bg-warning-50 text-warning-600"
              warning={finStats.overdueTotal > 0}
              href="/reports"
            />
            <StatCard
              label={t('dash.expectedMonth')}
              value={fmt(finStats.expectedMonth)}
              icon={CircleDollarSign}
              iconColor="bg-blue-50 text-blue-600"
            />
          </div>
        </>
      )}

      <SectionHeader title={t('dash.quickLinks')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <QuickLink href="/finance"   label={t('dash.acceptPayment')} icon={Banknote} />
        <QuickLink href="/reports"   label={t('dash.reports')}       icon={BarChart2} />
        <QuickLink href="/students"  label={t('nav.students')}       icon={Users} />
      </div>
    </>
  )
}

// ── Основная страница дашборда ────────────────────────────────────────────────

/**
 * Главная страница дашборда LMS.
 *
 * Определяет роль текущего пользователя и рендерит соответствующий
 * ролевой дашборд. Загружает общую аналитику, расписание, задачи
 * и финансовую статистику параллельно через React Query.
 */
export default function DashboardPage() {
  const t = useT()
  const user       = useCurrentUser()
  const isDirector = useIsDirector()
  const isMup      = useIsMup()
  const isDirOrMup = useIsDirectorOrMup()
  const isTeacher  = useIsTeacher()
  const isCashier  = useIsCashier()

  const showFinance = isDirector || isCashier

  const today     = new Date()
  const weekStart = toIsoDate(startOfWeek(today, { weekStartsOn: 1 }))

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview({ period: 'week' })
  const { data: lateData  } = useLateRequests(isDirOrMup ? { status: 'pending' } : undefined)
  const { data: taskData  } = useMupTasks(isMup ? { status: 'pending' } : undefined)
  const { data: schedule  } = useSchedule(weekStart)
  const { data: groupsData } = useGroups()
  const { data: finStats } = useFinanceDashboardStats(showFinance)

  const pendingLate = (lateData as any)?.total ?? 0
  const openTasks   = Array.isArray(taskData) ? taskData.length : 0
  const todayLessons = Array.isArray(schedule) ? schedule : []
  const groupCount  = Array.isArray(groupsData) ? groupsData.length : 0

  const greeting = user?.name ? `${t('dash.greeting')}, ${user.name.split(' ')[0]}!` : t('dash.welcome')
  const dateStr = format(today, 'EEEE, d MMMM yyyy', { locale: ru })

  return (
    <div className="max-w-3xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">{dateStr}</p>
      </div>

      {/* Role-based content */}
      {overviewLoading && isDirOrMup ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isDirector ? (
        <DirectorDashboard overview={overview as LmsAnalyticsOverview} finStats={finStats} />
      ) : isMup ? (
        <MupDashboard
          overview={overview as LmsAnalyticsOverview}
          pendingLate={pendingLate}
          openTasks={openTasks}
        />
      ) : isTeacher ? (
        <TeacherDashboard todayLessons={todayLessons} groupCount={groupCount} />
      ) : isCashier ? (
        <CashierDashboard finStats={finStats} />
      ) : (
        <CashierDashboard finStats={finStats} />
      )}
    </div>
  )
}
