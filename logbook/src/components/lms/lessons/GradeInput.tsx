'use client'
import { cn } from '@/lib/utils/cn'
import { UserAvatar } from '@/components/ui/avatar'
import type { Student } from '@/types/lms'

interface GradeRow {
  studentId: string
  student:   Student
  grade:     number | null
  comment:   string
}

interface GradeInputTableProps {
  rows:      GradeRow[]
  onChange:  (studentId: string, field: 'grade' | 'comment', value: string | number) => void
  readonly?: boolean
}

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function gradeColor(grade: number | null) {
  if (!grade) return 'text-gray-300'
  if (grade >= 8) return 'text-success-700 font-bold'
  if (grade >= 6) return 'text-gray-900 font-bold'
  return 'text-danger-600 font-bold'
}

export function GradeInputTable({ rows, onChange, readonly }: GradeInputTableProps) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.studentId} className="flex items-start gap-3 p-3 rounded-md bg-white border border-gray-100 hover:border-gray-200 transition-colors">
          <div className="flex items-center gap-2 w-44 shrink-0 mt-1">
            <UserAvatar name={row.student.fullName} src={row.student.photoUrl} size="xs" />
            <span className="text-sm font-medium text-gray-900 truncate">{row.student.fullName}</span>
          </div>

          {readonly ? (
            <div className="flex items-center gap-2">
              <span className={cn('text-lg w-8 text-center', gradeColor(row.grade))}>
                {row.grade ?? '—'}
              </span>
              {row.comment && <span className="text-xs text-gray-500 italic">{row.comment}</span>}
            </div>
          ) : (
            <div className="flex-1 space-y-2">
              {/* Grade picker */}
              <div className="flex gap-1 flex-wrap">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onChange(row.studentId, 'grade', g)}
                    className={cn(
                      'w-8 h-8 rounded text-sm font-semibold transition-all border',
                      row.grade === g
                        ? g < 6
                          ? 'bg-danger-500 text-white border-danger-500'
                          : g < 8
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-success-500 text-white border-success-500'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                    )}
                  >
                    {g}
                  </button>
                ))}
                {row.grade !== null && (
                  <button
                    type="button"
                    onClick={() => onChange(row.studentId, 'grade', 0)}
                    className="px-2 h-8 rounded text-xs text-gray-400 border border-gray-200 hover:bg-gray-50"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Comment — required when grade < 6 */}
              {row.grade !== null && row.grade < 6 && (
                <div>
                  <input
                    type="text"
                    value={row.comment}
                    onChange={(e) => onChange(row.studentId, 'comment', e.target.value)}
                    placeholder="Обязательный комментарий для оценки < 6…"
                    className={cn(
                      'w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:border-primary-400',
                      !row.comment ? 'border-danger-300 bg-danger-50' : 'border-gray-200'
                    )}
                  />
                  {!row.comment && (
                    <p className="text-[10px] text-danger-500 mt-0.5">Комментарий обязателен для оценки ниже 6</p>
                  )}
                </div>
              )}
              {row.grade !== null && row.grade >= 6 && (
                <input
                  type="text"
                  value={row.comment}
                  onChange={(e) => onChange(row.studentId, 'comment', e.target.value)}
                  placeholder="Комментарий (необязательно)"
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary-400"
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
