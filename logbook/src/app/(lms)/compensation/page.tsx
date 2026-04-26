'use client'
import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useCompensations, useSetCompensation, useSalaries } from '@/lib/hooks/lms/useCompensation'
import { useTeachers } from '@/lib/hooks/lms/useStudents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { UserAvatar } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import type { CompensationModel, CompensationModelType } from '@/types/lms'
import { useT } from '@/lib/i18n'

export default function CompensationPage() {
  const t = useT()

  const MODEL_OPTIONS: { value: CompensationModelType; label: string; hint: string }[] = [
    { value: 'per_lesson',    label: t('comp.perLesson'),    hint: t('comp.perLessonHint') },
    { value: 'fixed_monthly', label: t('comp.fixedMonthly'), hint: t('comp.fixedHint') },
    { value: 'per_student',   label: t('comp.perStudent'),   hint: t('comp.perStudentHint') },
  ]

  const { data: compensations = [], isLoading } = useCompensations()
  const { data: teachers = [] }                 = useTeachers()
  const { data: salaries = [] }                 = useSalaries()

  const [configTarget, setConfigTarget] = useState<string | null>(null)
  const [showSalaries, setShowSalaries] = useState(false)

  const targetTeacher = (teachers as any[]).find((t: any) => t.id === configTarget)

  const getRateDisplay = (model: CompensationModel): string => {
    if (model.modelType === 'fixed_monthly' && model.fixedMonthlyRate != null) {
      return `${model.fixedMonthlyRate.toLocaleString()} UZS/${t('fin.paymentType.monthly')}`
    }
    if (model.modelType === 'per_lesson' && model.ratePerLesson) {
      const vals = Object.values(model.ratePerLesson)
      const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1)
      return `~${Math.round(avg).toLocaleString()} UZS/${t('comp.perLessonSuffix').replace('/ ', '')}`
    }
    if (model.modelType === 'per_student' && model.ratePerStudent) {
      const vals = Object.values(model.ratePerStudent)
      const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1)
      return `~${Math.round(avg).toLocaleString()} UZS/${t('comp.perStudentSuffix').replace('/ ', '')}`
    }
    return t('comp.notConfigured')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary-600" />
          {t('comp.teacherComp')}
        </h1>
        <Button variant="secondary" size="sm" onClick={() => setShowSalaries(true)}>
          {t('comp.salaryHistory')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {(teachers as any[]).map((teacher: any) => {
            const model = (compensations as CompensationModel[]).find((c) => c.teacherId === teacher.id)
            return (
              <div key={teacher.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <UserAvatar name={teacher.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{teacher.name}</p>
                    {model ? (
                      <p className="text-xs text-gray-400">
                        {MODEL_OPTIONS.find((m) => m.value === model.modelType)?.label} · {getRateDisplay(model)}
                      </p>
                    ) : (
                      <p className="text-xs text-warning-600">{t('comp.notConfigured')}</p>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setConfigTarget(teacher.id)}>
                  {t('comp.configure')}
                </Button>
              </div>
            )
          })}
          {(teachers as any[]).length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">{t('comp.noTeachers')}</div>
          )}
        </div>
      )}

      {/* Configure dialog */}
      {configTarget && (
        <CompensationConfigDialog
          open={!!configTarget}
          teacherId={configTarget}
          teacherName={targetTeacher?.name ?? ''}
          currentModel={(compensations as CompensationModel[]).find((c) => c.teacherId === configTarget)}
          onClose={() => setConfigTarget(null)}
        />
      )}

      {/* Salary history */}
      <Dialog open={showSalaries} onOpenChange={(o) => !o && setShowSalaries(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('comp.salaryHistoryTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {(salaries as any[]).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{t('comp.noCalc')}</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(salaries as any[]).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-md bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.teacher?.name}</p>
                      <p className="text-xs text-gray-400">{s.period}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{s.amount?.toLocaleString()} UZS</p>
                      <Badge variant={s.isLocked ? 'success' : 'warning'}>
                        {s.isLocked ? t('comp.paidOut') : t('comp.accrued')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CompensationConfigDialog({ open, teacherId, teacherName, currentModel, onClose }: {
  open: boolean
  teacherId: string
  teacherName: string
  currentModel?: CompensationModel
  onClose: () => void
}) {
  const t = useT()
  const { mutate: setModel, isPending } = useSetCompensation()

  const MODEL_OPTIONS: { value: CompensationModelType; label: string; hint: string }[] = [
    { value: 'per_lesson',    label: t('comp.perLesson'),    hint: t('comp.perLessonHint') },
    { value: 'fixed_monthly', label: t('comp.fixedMonthly'), hint: t('comp.fixedHint') },
    { value: 'per_student',   label: t('comp.perStudent'),   hint: t('comp.perStudentHint') },
  ]

  const [modelType, setModelType]       = useState<CompensationModelType>(currentModel?.modelType ?? 'per_lesson')
  const [fixedRate, setFixedRate]       = useState(String(currentModel?.fixedMonthlyRate ?? ''))
  const [defaultRate, setDefaultRate]   = useState('')

  const handleSave = () => {
    const today = new Date().toISOString().slice(0, 10)

    const dto = modelType === 'fixed_monthly'
      ? { modelType, isHybrid: false, fixedMonthlyRate: Number(fixedRate), effectiveFrom: today }
      : modelType === 'per_lesson'
      ? { modelType, isHybrid: false, ratePerLesson: { default: Number(defaultRate) }, effectiveFrom: today }
      : { modelType, isHybrid: false, ratePerStudent: { default: Number(defaultRate) }, effectiveFrom: today }

    setModel({ teacherId, data: dto }, { onSuccess: onClose })
  }

  const isValid = modelType === 'fixed_monthly' ? !!fixedRate : !!defaultRate

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('comp.compensation')} — {teacherName}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">{t('comp.calcModel')}</label>
              <div className="space-y-2">
                {MODEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setModelType(opt.value)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-md border transition-colors',
                      modelType === opt.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <p className={cn('text-sm font-medium', modelType === opt.value ? 'text-primary-700' : 'text-gray-900')}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {modelType === 'fixed_monthly' ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('comp.monthlyAmount')}</label>
                <Input type="number" value={fixedRate} onChange={(e) => setFixedRate(e.target.value)} placeholder={t('comp.exampleAmount')} />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('comp.defaultRate')} (UZS {modelType === 'per_lesson' ? t('comp.perLessonSuffix') : t('comp.perStudentSuffix')})
                </label>
                <Input type="number" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} placeholder={t('comp.exampleRate')} />
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={!isValid || isPending}>
            {isPending ? t('comp.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
