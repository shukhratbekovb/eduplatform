'use client'
import Link from 'next/link'
import { format, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Users, BookOpen, BarChart2, AlertTriangle, Clock, CheckSquare,
  TrendingUp, TrendingDown, Minus, CalendarDays, ClipboardList,
  ArrowRight, GraduationCap, UserCheck,
} from 'lucide-react'
import { useCurrentUser, useIsDirector, useIsDirectorOrMup, useIsMup, useIsTeacher } from '@/lib/stores/useAuthStore'
import { useAnalyticsOverview } from '@/lib/hooks/lms/useAnalytics'
import { useLateRequests } from '@/lib/hooks/lms/useLateRequests'
import { useMupTasks } from '@/lib/hooks/lms/useMupTasks'
import { useSchedule } from '@/lib/hooks/lms/useSchedule'
import { useGroups } from '@/lib/hooks/lms/useGroups'
import { toIsoDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import type { LmsAnalyticsOverview } from '@/types/lms'

// ── Stat card ────────────────────────────────────────────────────────────────

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

// ── Director / MUP dashboard ──────────────────────────────────────────────────

function DirectorDashboard({ overview }: { overview: LmsAnalyticsOverview }) {
  return (
    <>
      <SectionHeader title="Обзор" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Студентов"
          value={overview.totalStudents}
          icon={Users}
          iconColor="bg-primary-50 text-primary-600"
          href="/students"
        />
        <StatCard
          label="Активных групп"
          value={overview.activeGroups}
          icon={BookOpen}
          iconColor="bg-indigo-50 text-indigo-600"
          href="/groups"
        />
        <StatCard
          label="Уроков на этой неделе"
          value={overview.lessonsThisWeek}
          icon={CalendarDays}
          iconColor="bg-blue-50 text-blue-600"
          href="/schedule"
        />
        <StatCard
          label="Средняя посещаемость"
          value={`${overview.avgAttendance}%`}
          icon={UserCheck}
          iconColor="bg-success-50 text-success-600"
          delta={overview.delta.avgAttendance}
          deltaLabel="% за 7 дней"
        />
        <StatCard
          label="В зоне риска"
          value={overview.atRiskStudents}
          icon={AlertTriangle}
          iconColor="bg-warning-50 text-warning-600"
          delta={overview.delta.atRiskStudents}
          deltaLabel="за 7 дней"
          warning={overview.atRiskStudents > 0}
          href="/students"
        />
        <StatCard
          label="Критических студентов"
          value={overview.criticalStudents}
          icon={AlertTriangle}
          iconColor="bg-danger-50 text-danger-600"
          danger={overview.criticalStudents > 0}
          href="/students"
        />
      </div>

      <SectionHeader title="Академическое" />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Незаполненных уроков"
          value={overview.incompleteLesson}
          icon={Clock}
          iconColor="bg-danger-50 text-danger-600"
          danger={overview.incompleteLesson > 0}
          href="/schedule"
        />
        <StatCard
          label="Выполнение домашних заданий"
          value={`${overview.homeworkSubmitRate}%`}
          icon={ClipboardList}
          iconColor="bg-purple-50 text-purple-600"
          delta={overview.delta.homeworkSubmitRate}
          deltaLabel="% за 7 дней"
          href="/homework"
        />
      </div>

      <SectionHeader title="Быстрые ссылки" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <QuickLink href="/analytics"    label="Аналитика"          icon={BarChart2} />
        <QuickLink href="/reports"      label="Отчёты"             icon={BarChart2} />
        <QuickLink href="/attendance"   label="Посещаемость"       icon={UserCheck} />
        <QuickLink href="/compensation" label="Компенсации"        icon={GraduationCap} />
      </div>
    </>
  )
}

function MupDashboard({ overview, pendingLate, openTasks }: {
  overview: LmsAnalyticsOverview
  pendingLate: number
  openTasks: number
}) {
  return (
    <>
      <SectionHeader title="Задачи и запросы" />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Поздних запросов (ожидают)"
          value={pendingLate}
          icon={Clock}
          iconColor="bg-warning-50 text-warning-600"
          warning={pendingLate > 0}
          href="/late-requests"
        />
        <StatCard
          label="Открытых задач"
          value={openTasks}
          icon={CheckSquare}
          iconColor="bg-primary-50 text-primary-600"
          href="/tasks"
        />
      </div>

      <SectionHeader title="Учебный процесс" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Средняя посещаемость"
          value={`${overview.avgAttendance}%`}
          icon={UserCheck}
          iconColor="bg-success-50 text-success-600"
          delta={overview.delta.avgAttendance}
          deltaLabel="%"
        />
        <StatCard
          label="В зоне риска"
          value={overview.atRiskStudents}
          icon={AlertTriangle}
          iconColor="bg-warning-50 text-warning-600"
          warning={overview.atRiskStudents > 0}
          href="/students"
        />
        <StatCard
          label="Незаполненных уроков"
          value={overview.incompleteLesson}
          icon={Clock}
          iconColor="bg-danger-50 text-danger-600"
          danger={overview.incompleteLesson > 0}
          href="/schedule"
        />
      </div>

      <SectionHeader title="Быстрые ссылки" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <QuickLink href="/late-requests" label="Поздние запросы"    icon={Clock} />
        <QuickLink href="/tasks"         label="Мои задачи"         icon={CheckSquare} />
        <QuickLink href="/students"      label="Студенты"           icon={Users} />
        <QuickLink href="/analytics"     label="Аналитика"          icon={BarChart2} />
      </div>
    </>
  )
}

function TeacherDashboard({ todayLessons, groupCount }: {
  todayLessons: any[]
  groupCount: number
}) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const today = todayLessons.filter((l: any) => l.date === todayStr)

  return (
    <>
      <SectionHeader title="Сегодня" />
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          label="Уроков сегодня"
          value={today.length}
          icon={CalendarDays}
          iconColor="bg-primary-50 text-primary-600"
          href="/schedule"
        />
        <StatCard
          label="Моих групп"
          value={groupCount}
          icon={BookOpen}
          iconColor="bg-indigo-50 text-indigo-600"
          href="/groups"
        />
      </div>

      {today.length > 0 && (
        <>
          <SectionHeader title="Расписание на сегодня" />
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
                    {lesson.status === 'conducted' ? 'Проведён' :
                     lesson.status === 'in_progress' ? 'Идёт' :
                     lesson.status === 'incomplete' ? 'Не завершён' : 'Запланирован'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <SectionHeader title="Быстрые ссылки" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <QuickLink href="/schedule"  label="Расписание"          icon={CalendarDays} />
        <QuickLink href="/homework"  label="Домашние задания"    icon={ClipboardList} />
        <QuickLink href="/students"  label="Студенты"            icon={Users} />
        <QuickLink href="/attendance" label="Посещаемость"       icon={UserCheck} />
      </div>
    </>
  )
}

function CashierDashboard() {
  return (
    <>
      <SectionHeader title="Быстрые ссылки" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <QuickLink href="/students"  label="Студенты"   icon={Users} />
        <QuickLink href="/settings"  label="Настройки"  icon={GraduationCap} />
      </div>
    </>
  )
}

// ── Main dashboard page ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const user       = useCurrentUser()
  const isDirector = useIsDirector()
  const isMup      = useIsMup()
  const isDirOrMup = useIsDirectorOrMup()
  const isTeacher  = useIsTeacher()

  const today     = new Date()
  const weekStart = toIsoDate(startOfWeek(today, { weekStartsOn: 1 }))

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview({ period: 'week' })
  const { data: lateData  } = useLateRequests(isDirOrMup ? { status: 'pending' } : undefined)
  const { data: taskData  } = useMupTasks(isMup ? { status: 'pending' } : undefined)
  const { data: schedule  } = useSchedule(weekStart)
  const { data: groupsData } = useGroups()

  const pendingLate = (lateData as any)?.total ?? 0
  const openTasks   = Array.isArray(taskData) ? taskData.length : 0
  const todayLessons = Array.isArray(schedule) ? schedule : []
  const groupCount  = Array.isArray(groupsData) ? groupsData.length : 0

  const greeting = user?.name ? `Привет, ${user.name.split(' ')[0]}!` : 'Добро пожаловать!'
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
        <DirectorDashboard overview={overview as LmsAnalyticsOverview} />
      ) : isMup ? (
        <MupDashboard
          overview={overview as LmsAnalyticsOverview}
          pendingLate={pendingLate}
          openTasks={openTasks}
        />
      ) : isTeacher ? (
        <TeacherDashboard todayLessons={todayLessons} groupCount={groupCount} />
      ) : (
        <CashierDashboard />
      )}
    </div>
  )
}
