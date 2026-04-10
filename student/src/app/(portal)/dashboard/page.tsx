'use client'
import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { useDashboard } from '@/lib/hooks/student'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { GradesWidget } from '@/components/dashboard/GradesWidget'
import { GradesCalendar } from '@/components/dashboard/GradesCalendar'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { AttendanceWidget } from '@/components/dashboard/AttendanceWidget'
import { Leaderboard } from '@/components/dashboard/Leaderboard'

export default function DashboardPage() {
  const t = useT()
  const { data, isLoading } = useDashboard()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>

      {/* Row 1: Stats */}
      <StatsCards data={data} isLoading={isLoading} />

      {/* Row 2: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: grades */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <GradesWidget data={data} isLoading={isLoading} />
          <GradesCalendar grades={data?.recentGrades ?? []} isLoading={isLoading} />
        </div>

        {/* Center: activity + attendance */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <ActivityFeed events={data?.activityFeed ?? []} isLoading={isLoading} />
          <AttendanceWidget data={data?.attendance30d} calendar={data?.attendanceCalendar ?? []} isLoading={isLoading} />
        </div>

        {/* Right: leaderboard */}
        <div className="lg:col-span-1">
          <Leaderboard entries={data?.leaderboard ?? []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
