'use client'
import { cn } from '@/lib/utils/cn'
import { UserAvatar } from '@/components/ui/avatar'
import type { Student, AttendanceStatus } from '@/types/lms'

interface AttendanceRow {
  studentId: string
  student:   Student
  status:    AttendanceStatus
  note:      string
}

interface AttendanceTableProps {
  rows:      AttendanceRow[]
  onChange:  (studentId: string, field: 'status' | 'note', value: string) => void
  readonly?: boolean
}

const statuses: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present', label: 'Присутствует', color: 'bg-success-50 text-success-700 border-success-200' },
  { value: 'late',    label: 'Опоздал',      color: 'bg-warning-50 text-warning-700 border-warning-200' },
  { value: 'absent',  label: 'Отсутствует',  color: 'bg-danger-50 text-danger-700 border-danger-200' },
]

export function AttendanceTable({ rows, onChange, readonly }: AttendanceTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-48">Студент</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">Статус</th>
            {!readonly && <th className="text-left px-4 py-2.5 font-medium text-gray-600">Примечание</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.studentId} className="h-12">
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <UserAvatar name={row.student.fullName} src={row.student.photoUrl} size="xs" />
                  <span className="font-medium text-gray-900 text-sm truncate max-w-[140px]">
                    {row.student.fullName}
                  </span>
                </div>
              </td>
              <td className="px-4 py-2">
                {readonly ? (
                  <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
                    statuses.find((s) => s.value === row.status)?.color ?? ''
                  )}>
                    {statuses.find((s) => s.value === row.status)?.label}
                  </span>
                ) : (
                  <div className="flex gap-1.5">
                    {statuses.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => onChange(row.studentId, 'status', s.value)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                          row.status === s.value
                            ? s.color + ' ring-1 ring-offset-1 ' + s.color.split(' ')[2]
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </td>
              {!readonly && (
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.note}
                    onChange={(e) => onChange(row.studentId, 'note', e.target.value)}
                    placeholder="Комментарий…"
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-primary-400 bg-transparent placeholder:text-gray-300"
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
