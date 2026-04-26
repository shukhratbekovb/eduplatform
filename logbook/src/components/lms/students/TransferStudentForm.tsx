'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGroups, useEnrollStudent } from '@/lib/hooks/lms/useGroups'
import { useT } from '@/lib/i18n'
import type { Student } from '@/types/lms'

interface TransferStudentFormProps {
  open:         boolean
  onOpenChange: (v: boolean) => void
  student:      Student
}

export function TransferStudentForm({ open, onOpenChange, student }: TransferStudentFormProps) {
  const t = useT()
  const [groupId, setGroupId] = useState('')
  const { data: groups = [] }          = useGroups()
  const { mutate: enroll, isPending }  = useEnrollStudent()

  if (!open) return null

  const enrolledGroupIds = new Set(student.enrollments.map((e) => e.groupId))
  const available = (groups as any[]).filter((g) => !g.isArchived && !enrolledGroupIds.has(g.id))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupId) return
    enroll(
      { studentId: student.id, groupId },
      { onSuccess: () => { setGroupId(''); onOpenChange(false) } }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{t('profile.enrollToGroup')}</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {t('profile.studentLabel')} <span className="font-medium text-gray-900">{student.fullName}</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.groupLabel')} <span className="text-danger-500">*</span>
            </label>
            {available.length === 0 ? (
              <p className="text-sm text-gray-400">{t('profile.noAvailableGroups')}</p>
            ) : (
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-primary-500"
                required
              >
                <option value="">{t('profile.selectGroup')}</option>
                {available.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={isPending}
              disabled={!groupId || available.length === 0}
            >
              {t('profile.enrollBtn')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
