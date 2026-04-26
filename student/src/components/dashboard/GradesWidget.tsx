'use client'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import type { DashboardData } from '@/types/student'

const GRADE_TYPE_COLORS: Record<string, string> = {
  participation: 'bg-primary-100 text-primary-700',
  homework: 'bg-amber-100 text-amber-700',
  exam: 'bg-red-100 text-red-700',
  quiz: 'bg-purple-100 text-purple-700',
  project: 'bg-teal-100 text-teal-700',
}

function gradeColor(v: number) {
  if (v >= 9) return 'text-success-600'
  if (v >= 7) return 'text-primary-600'
  if (v >= 5) return 'text-warning-600'
  return 'text-danger-600'
}

interface Props { data?: DashboardData; isLoading?: boolean }

export function GradesWidget({ data, isLoading }: Props) {
  const t = useT()

  const grades = data?.recent_grades ?? []
  const gpa = data?.gpa

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{t('dashboard.avgGrade')}</h3>
        {gpa != null && (
          <span className={cn('text-2xl font-bold', gradeColor(gpa))}>{gpa.toFixed(1)}<span className="text-sm font-normal text-gray-400">/10</span></span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : grades.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('dashboard.noGrades')}</p>
      ) : (
        <div className="space-y-1.5">
          {grades.slice(0, 8).map((g: any) => {
            const typeLabel = t(`grade.type.${g.type}`) || g.type
            const typeColor = GRADE_TYPE_COLORS[g.type] ?? 'bg-gray-100 text-gray-600'
            return (
              <div key={g.id} className="flex items-center justify-between py-1.5">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', typeColor)}>
                    {typeLabel}
                  </span>
                  <span className="text-xs text-gray-600 truncate">{g.lessonTopic || g.subjectName || g.date}</span>
                </div>
                <span className={cn('text-sm font-bold shrink-0 ml-2', gradeColor(g.value))}>{g.value}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
