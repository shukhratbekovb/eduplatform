'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { UserAvatar } from '@/components/ui/avatar'
import type { Student } from '@/types/lms'

const POOL_TOTAL = 5
const MAX_PER_STUDENT = 3

interface DiamondRow {
  studentId: string
  student:   Student
  diamonds:  number
}

interface DiamondDistributorProps {
  rows:      DiamondRow[]
  onChange:  (studentId: string, diamonds: number) => void
  readonly?: boolean
}

function DiamondIcon({ filled, animated }: { filled: boolean; animated?: boolean }) {
  return (
    <span
      className={cn(
        'text-lg select-none transition-transform',
        filled ? 'text-diamond' : 'text-gray-200',
        animated && 'animate-diamond-pop',
      )}
    >
      ◆
    </span>
  )
}

export function DiamondDistributor({ rows, onChange, readonly }: DiamondDistributorProps) {
  const [animated, setAnimated] = useState<string | null>(null)

  const totalUsed = rows.reduce((sum, r) => sum + r.diamonds, 0)
  const remaining = POOL_TOTAL - totalUsed

  const handleClick = (studentId: string, current: number, target: number) => {
    if (readonly) return
    if (target > current && remaining <= 0) return  // pool empty
    if (target > MAX_PER_STUDENT) return

    const newVal = target === current ? 0 : target
    onChange(studentId, newVal)

    if (newVal > current) {
      setAnimated(studentId)
      setTimeout(() => setAnimated(null), 400)
    }
  }

  return (
    <div className="space-y-2">
      {/* Pool indicator */}
      {!readonly && (
        <div className="flex items-center gap-2 mb-3 p-3 rounded-md bg-primary-50 border border-primary-100">
          <span className="text-sm font-medium text-primary-700">Пул бриллиантов:</span>
          <div className="flex gap-0.5">
            {Array.from({ length: POOL_TOTAL }).map((_, i) => (
              <DiamondIcon key={i} filled={i < totalUsed} />
            ))}
          </div>
          <span className="text-sm text-primary-600 ml-auto">
            {remaining} из {POOL_TOTAL} доступно
          </span>
        </div>
      )}

      {rows.map((row) => (
        <div key={row.studentId} className="flex items-center gap-3 p-2.5 rounded-md bg-white border border-gray-100">
          <div className="flex items-center gap-2 w-44 shrink-0">
            <UserAvatar name={row.student.fullName} src={row.student.photoUrl} size="xs" />
            <span className="text-sm font-medium text-gray-900 truncate">{row.student.fullName}</span>
          </div>

          <div className="flex gap-1 items-center">
            {Array.from({ length: MAX_PER_STUDENT }).map((_, i) => {
              const isActive = i < row.diamonds
              const canSet   = !readonly && (isActive || remaining > 0)

              return (
                <button
                  key={i}
                  type="button"
                  disabled={readonly || (!isActive && remaining <= 0)}
                  onClick={() => handleClick(row.studentId, row.diamonds, i + 1)}
                  className={cn(
                    'text-lg transition-transform hover:scale-110 disabled:cursor-not-allowed',
                    isActive ? 'text-diamond' : 'text-gray-200',
                    !isActive && remaining <= 0 && 'opacity-40',
                    animated === row.studentId && isActive && 'animate-diamond-pop',
                  )}
                  aria-label={`${i + 1} бриллиант${i === 0 ? '' : 'а'}`}
                >
                  ◆
                </button>
              )
            })}

            {row.diamonds > 0 && !readonly && (
              <button
                type="button"
                onClick={() => onChange(row.studentId, 0)}
                className="ml-1 text-xs text-gray-400 hover:text-danger-500 transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {row.diamonds > 0 && (
            <span className="ml-auto text-xs text-primary-600 font-medium">
              +{row.diamonds * 10} монет
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
