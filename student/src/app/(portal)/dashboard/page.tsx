'use client'

/**
 * Дашборд студенческого портала.
 *
 * Отображает комплексную информацию для студента:
 * - Карточки статистики: средний балл, посещаемость, задания, своевременность
 * - Виджет последних оценок (GradesWidget)
 * - Виджет посещаемости за 30 дней (AttendanceWidget)
 * - Расписание на сегодня (TodaySchedule)
 * - Ближайшие дедлайны домашних заданий (UpcomingDeadlines)
 * - Лента начислений звёзд/бриллиантов (ActivityFeed)
 * - Рейтинг (Leaderboard) среди студентов группы
 *
 * Данные загружаются параллельно из 5 API-эндпоинтов через React Query.
 *
 * @module StudentDashboardPage
 */

import { useT } from '@/lib/i18n'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useDashboard, useSchedule } from '@/lib/hooks/student'
import { isoDate, getWeekStart } from '@/lib/utils/dates'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { GradesWidget } from '@/components/dashboard/GradesWidget'
import { AttendanceWidget } from '@/components/dashboard/AttendanceWidget'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { Leaderboard } from '@/components/dashboard/Leaderboard'
import { TodaySchedule } from '@/components/dashboard/TodaySchedule'
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines'

/**
 * Основной компонент дашборда студента.
 *
 * Загружает данные дашборда, расписание на неделю, задания,
 * рейтинг и ленту активности. Фильтрует уроки на сегодня
 * и задания с невыполненным статусом для виджета дедлайнов.
 */
export default function DashboardPage() {
  const t = useT()
  const { data, isLoading } = useDashboard()

  const weekStart = isoDate(getWeekStart(new Date()))
  const { data: weekLessons = [], isLoading: schedLoading } = useSchedule(weekStart)
  const today = isoDate(new Date())
  const todayLessons = weekLessons.filter((l: any) => l.weekDate === today)

  const { data: allAssignments = [], isLoading: hwLoading } = useQuery({
    queryKey: ['student', 'assignments', 'all-dash'],
    queryFn: () => apiClient.get('/student/assignments').then((r) => r.data as any[]),
    staleTime: 60_000,
  })

  const deadlines = allAssignments.filter((a: any) => a.status === 'pending' || a.status === 'overdue')

  const { data: leaderboard = [], isLoading: lbLoading } = useQuery({
    queryKey: ['student', 'leaderboard'],
    queryFn: () => apiClient.get('/student/leaderboard').then((r) => r.data as any[]),
    staleTime: 60_000,
  })

  const { data: rawActivity = [], isLoading: actLoading } = useQuery({
    queryKey: ['student', 'activity'],
    queryFn: () => apiClient.get('/student/activity').then((r) => r.data as any[]),
    staleTime: 60_000,
  })

  // Маппинг snake_case полей API (created_at, stars_amount) в camelCase для фронтенда
  const activityEvents = rawActivity.map((e: any) => ({
    id: e.id,
    date: e.created_at?.slice(0, 10) ?? '',
    type: e.type,
    description: e.description,
    starsAmount: e.stars_amount,
    crystalsAmount: e.crystals_amount,
    subjectName: null,
  }))

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>

      {/* Row 1: Stats */}
      <StatsCards data={data} isLoading={isLoading} />

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Grades */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <GradesWidget data={data} isLoading={isLoading} />
          <ActivityFeed events={activityEvents} isLoading={actLoading} />
        </div>

        {/* Attendance + Today schedule */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <AttendanceWidget data={data?.attendance30d ?? undefined} calendar={[]} isLoading={isLoading} />
          <TodaySchedule lessons={todayLessons} isLoading={schedLoading} />
          <UpcomingDeadlines assignments={deadlines} isLoading={hwLoading} />
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-1">
          <Leaderboard entries={leaderboard} isLoading={lbLoading} />
        </div>
      </div>
    </div>
  )
}
