'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { Search, Users, AlertTriangle, Plus } from 'lucide-react'
import { useStudents } from '@/lib/hooks/lms/useStudents'
import { useDirections } from '@/lib/hooks/lms/useSettings'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/avatar'
import { RiskBadge } from '@/components/lms/students/RiskBadge'
import { StudentForm } from '@/components/lms/students/StudentForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { useLmsStore } from '@/lib/stores/useLmsStore'
import { useIsDirectorOrMup } from '@/lib/stores/useAuthStore'
import type { RiskLevel } from '@/types/lms'
import { cn } from '@/lib/utils/cn'

const riskFilters: { value: RiskLevel | ''; label: string }[] = [
  { value: '',         label: 'Все' },
  { value: 'low',      label: 'Норма' },
  { value: 'medium',   label: 'Риск' },
  { value: 'high',     label: 'Высокий' },
  { value: 'critical', label: 'Критично' },
]

export default function StudentsPage() {
  const filters    = useLmsStore((s) => s.studentFilters)
  const setFilters = useLmsStore((s) => s.setStudentFilters)
  const canManage  = useIsDirectorOrMup()

  const [search, setSearch]   = useState(filters.search ?? '')
  const [showForm, setShowForm] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: directions = [] } = useDirections()
  const { data, isLoading }       = useStudents(filters)

  const students  = (data as any)?.data ?? []
  const total     = (data as any)?.total ?? 0

  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setFilters({ search: val, page: 1 }), 300)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          Студенты
          <span className="text-sm font-normal text-gray-400">({total})</span>
        </h1>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Добавить студента
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Поиск по имени…"
            className="pl-9"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <select
          value={filters.directionId ?? ''}
          onChange={(e) => setFilters({ directionId: e.target.value || undefined, page: 1 })}
          className="h-10 border border-gray-300 rounded text-sm px-3 text-gray-700 focus:outline-none focus:border-primary-500 bg-white"
        >
          <option value="">Все направления</option>
          {directions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Risk filter buttons */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-md">
          {riskFilters.map((r) => (
            <button
              key={r.value}
              onClick={() => setFilters({ riskLevel: r.value as RiskLevel || undefined, page: 1 })}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                (filters.riskLevel ?? '') === r.value
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk alert */}
      {filters.riskLevel === undefined && (
        <RiskSummary students={students} />
      )}

      <StudentForm open={showForm} onOpenChange={setShowForm} />

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="Студенты не найдены" description="Попробуйте изменить фильтры" />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Студент</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Группы</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Ср. балл</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Посещаемость</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Риск</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student: any) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/students/${student.id}`} className="flex items-center gap-3 group">
                      <UserAvatar name={student.fullName} src={student.photoUrl} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-primary-700 transition-colors">
                          {student.fullName}
                        </p>
                        {student.phone && (
                          <p className="text-xs text-gray-400">{student.phone}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-gray-500">{student.enrollments?.length ?? 0} гр.</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn('font-semibold', student.gpa && student.gpa < 6 ? 'text-danger-600' : 'text-gray-900')}>
                      {student.gpa !== null ? student.gpa.toFixed(1) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn(
                      'font-medium',
                      student.attendancePercent && student.attendancePercent < 70 ? 'text-danger-600' : 'text-gray-900'
                    )}>
                      {student.attendancePercent !== null ? student.attendancePercent + '%' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={student.riskLevel} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RiskSummary({ students }: { students: any[] }) {
  const critical = students.filter((s) => s.riskLevel === 'critical' || s.riskLevel === 'high').length
  const atRisk   = students.filter((s) => s.riskLevel === 'medium').length
  if (critical === 0 && atRisk === 0) return null
  return (
    <div className="flex items-start gap-2 p-3 bg-warning-50 border border-warning-200 rounded-md mb-4 text-sm">
      <AlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 shrink-0" />
      <span className="text-warning-700">
        {critical > 0 && <><strong>{critical}</strong> в критичном состоянии · </>}
        {atRisk > 0 && <><strong>{atRisk}</strong> под риском</>}
        {' '}— требуют внимания
      </span>
    </div>
  )
}
