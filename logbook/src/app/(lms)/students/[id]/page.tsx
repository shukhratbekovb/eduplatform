'use client'

/**
 * Детальная страница профиля студента.
 *
 * Содержит 5 вкладок:
 * - Личные данные (ФИО, телефон, email, родители, сброс пароля)
 * - Группы (текущие, добавление, перевод, история)
 * - Договоры (список контрактов с суммами и статусами)
 * - Успеваемость (GPA, посещаемость, ML-анализ риска отчисления)
 * - Геймификация (монеты, звёзды, бриллианты, уровень, транзакции)
 *
 * ML-анализ риска включает 4 домена: посещаемость, оценки, домашки, финансы.
 * Каждый домен имеет свой уровень (low/medium/high/critical).
 *
 * @module StudentProfilePage
 */

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Phone, Mail, User, Pencil, FileText, BookOpen, Calendar, CreditCard, Key, Copy, Check, ArrowRight, Users, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useStudent, useStudentRisk, useStudentCoins } from '@/lib/hooks/lms/useStudents'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { RiskBadge } from '@/components/lms/students/RiskBadge'
import { StudentForm } from '@/components/lms/students/StudentForm'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/dates'
import { useIsDirectorOrMup } from '@/lib/stores/useAuthStore'
import { apiClient } from '@/lib/api/axios'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'

const BADGE_CONFIG: Record<string, { label: string; color: string }> = {
  bronze:   { label: 'Bronze',   color: 'text-amber-700' },
  silver:   { label: 'Silver',   color: 'text-gray-500' },
  gold:     { label: 'Gold',     color: 'text-yellow-500' },
  platinum: { label: 'Platinum', color: 'text-purple-500' },
  diamond:  { label: 'Diamond',  color: 'text-blue-400' },
}

interface Contract {
  id: string; contractNumber?: string; directionName?: string
  paymentType: string; paymentTypeLabel?: string; paymentAmount?: number; currency: string
  durationMonths?: number; totalLessons?: number; startDate?: string
  status: string; createdAt?: string
}

/**
 * Основной компонент страницы профиля студента.
 * Загружает данные студента, факторы риска, монеты, группы и договоры.
 */
export default function StudentProfilePage() {
  const t = useT()
  const params    = useParams()
  const id        = (params?.id as string) ?? ''
  const router    = useRouter()
  const canManage = useIsDirectorOrMup()
  const [showEdit, setShowEdit] = useState(false)

  const { data: student, isLoading } = useStudent(id)
  const { data: riskFactors }        = useStudentRisk(id)
  const { data: coins = [] }         = useStudentCoins(id)
  const { data: groupsData, refetch: refetchGroups } = useQuery<any>({
    queryKey: ['lms', 'students', id, 'groups'],
    queryFn: () => apiClient.get(`/lms/students/${id}/groups`).then(r => r.data),
    enabled: !!id, staleTime: 60_000,
  })
  const currentGroups = groupsData?.currentGroups ?? []
  const availableGroups = groupsData?.availableGroups ?? []

  const { data: contracts = [] }     = useQuery<Contract[]>({
    queryKey: ['crm', 'contracts', 'by-student', id],
    queryFn: () => apiClient.get(`/crm/contracts/by-student/${id}`).then(r => r.data),
    enabled: !!id,
    staleTime: 60_000,
  })

  const RISK_DOMAIN_LABELS: Record<string, string> = {
    low: t('profile.riskNormal'), medium: t('profile.riskWarning'), high: t('profile.riskHigh'), critical: t('profile.riskCritical'),
  }

  if (isLoading || !student) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
  }

  const s = student as any
  const badge = BADGE_CONFIG[s.badgeLevel] ?? BADGE_CONFIG.bronze

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" />{t('common.back')}
      </button>

      {canManage && <StudentForm open={showEdit} onOpenChange={setShowEdit} student={student} />}

      {/* Profile header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <div className="flex items-start gap-5">
          <UserAvatar name={s.fullName} src={s.photoUrl} size="2xl" />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{s.fullName}</h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <RiskBadge level={s.riskLevel ?? 'low'} />
                  <span className={cn('text-sm font-semibold', badge.color)}>🏅 {badge.label}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {canManage && (
                  <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
                    <Pencil className="w-3.5 h-3.5" />{t('profile.edit')}
                  </Button>
                )}
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-500">{s.totalCoins ?? 0}</p>
                  <p className="text-xs text-gray-400">{t('profile.coins')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div><p className="text-xs text-gray-400">{t('students.avgGrade')}</p><p className={cn('text-lg font-bold', s.gpa != null && s.gpa < 6 ? 'text-danger-600' : 'text-gray-900')}>{s.gpa != null ? Number(s.gpa).toFixed(1) : '—'}</p></div>
              <div><p className="text-xs text-gray-400">{t('students.attendance')}</p><p className={cn('text-lg font-bold', s.attendancePercent != null && s.attendancePercent < 70 ? 'text-danger-600' : 'text-gray-900')}>{s.attendancePercent != null ? s.attendancePercent + '%' : '—'}</p></div>
              <div><p className="text-xs text-gray-400">{t('profile.code')}</p><p className="text-lg font-bold text-gray-900">{s.studentCode ?? '—'}</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <Tabs defaultValue="personal">
          <div className="px-4 border-b border-gray-200 overflow-x-auto">
            <TabsList className="border-none whitespace-nowrap">
              <TabsTrigger value="personal">{t('profile.personal')}</TabsTrigger>
              <TabsTrigger value="groups">{t('students.groups')} ({currentGroups.filter((g:any) => g.isActive).length})</TabsTrigger>
              <TabsTrigger value="contracts">{t('profile.contracts')} ({contracts.length})</TabsTrigger>
              <TabsTrigger value="academic">{t('profile.academic')}</TabsTrigger>
              <TabsTrigger value="gamification">{t('profile.achievements')}</TabsTrigger>
            </TabsList>
          </div>

          {/* Personal */}
          <TabsContent value="personal" className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field icon={User} label={t('profile.name')} value={s.fullName} />
              {s.phone && <Field icon={Phone} label={t('profile.phone')} value={s.phone} />}
              {s.email && <Field icon={Mail} label={t('profile.emailLogin')} value={s.email} />}
              {s.dateOfBirth && <Field icon={Calendar} label={t('profile.dob')} value={formatDate(s.dateOfBirth)} />}
              {s.parentName && <Field icon={User} label={t('profile.parent')} value={s.parentName} />}
              {s.parentPhone && <Field icon={Phone} label={t('profile.parentPhone')} value={s.parentPhone} />}
              {s.address && <Field icon={User} label={t('profile.address')} value={s.address} />}
              {s.studentCode && <Field icon={User} label={t('profile.studentCode')} value={s.studentCode} />}
            </div>

            {/* Reset password */}
            {canManage && s.userId && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <ResetPasswordButton studentId={id} />
              </div>
            )}
          </TabsContent>

          {/* Groups */}
          <TabsContent value="groups" className="p-6">
            <StudentGroupsTab
              studentId={id}
              currentGroups={currentGroups}
              availableGroups={availableGroups}
              canManage={canManage}
              onRefresh={refetchGroups}
            />
          </TabsContent>

          {/* Contracts */}
          <TabsContent value="contracts" className="p-6">
            {contracts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{t('profile.noContracts')}</p>
            ) : (
              <div className="space-y-3">
                {contracts.map(c => (
                  <ContractCardProfile key={c.id} contract={c} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Academic */}
          <TabsContent value="academic" className="p-6">
            <AcademicTab student={s} riskFactors={riskFactors} riskDomainLabels={RISK_DOMAIN_LABELS} />
          </TabsContent>

          {/* Gamification */}
          <TabsContent value="gamification" className="p-6">
            <GamificationTab student={s} badge={badge} coins={coins as any[]} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function ContractCardProfile({ contract: c }: { contract: Contract }) {
  const t = useT()
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-200 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-primary-700 font-semibold">{c.contractNumber}</span>
            <Badge variant={c.status === 'active' ? 'success' : 'default'}>
              {c.status === 'active' ? t('common.active') : c.status}
            </Badge>
          </div>
          <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-gray-400" />
            {c.directionName ?? '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{c.paymentAmount?.toLocaleString()} {c.currency}</p>
          <p className="text-xs text-gray-400">{c.paymentTypeLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        {c.durationMonths && (
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.durationMonths} {t('fin.months')} · {c.totalLessons} {t('fin.lessons')}</span>
        )}
        {c.startDate && (
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t('profile.start')}: {formatDate(c.startDate)}</span>
        )}
        {c.createdAt && (
          <span>{t('profile.created')}: {formatDate(c.createdAt)}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Вкладка "Успеваемость" с GPA, посещаемостью и ML-анализом риска.
 *
 * ML-анализ отображает вероятность отчисления (прогресс-бар)
 * и 4 домена риска: посещаемость, оценки, домашки, финансы.
 */
function AcademicTab({ student: s, riskFactors, riskDomainLabels }: { student: any; riskFactors: any; riskDomainLabels: Record<string, string> }) {
  const t = useT()
  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-center">
          <p className="text-3xl font-bold text-gray-900">{s.gpa != null ? Number(s.gpa).toFixed(2) : '—'}</p>
          <p className="text-sm text-gray-500 mt-1">{t('profile.gpa')}</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-center">
          <p className="text-3xl font-bold text-gray-900">{s.attendancePercent ?? '—'}{s.attendancePercent != null ? '%' : ''}</p>
          <p className="text-sm text-gray-500 mt-1">{t('students.attendance')}</p>
        </div>
      </div>

      {/* ML Risk Analysis */}
      {riskFactors && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('profile.mlRisk')}</h3>
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 space-y-4">
            {/* Dropout probability bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{t('profile.dropoutProb')}</span>
                <span className="text-sm font-bold text-gray-900">{(riskFactors.details.dropoutProbability * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    riskFactors.details.dropoutProbability < 0.25 ? 'bg-success-500' :
                    riskFactors.details.dropoutProbability < 0.5 ? 'bg-warning-500' :
                    riskFactors.details.dropoutProbability < 0.75 ? 'bg-orange-500' : 'bg-danger-500',
                  )}
                  style={{ width: `${Math.min(riskFactors.details.dropoutProbability * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Domain risk scores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <RiskDomainCard label={t('students.attendance')} level={riskFactors.attendanceScore} detail={`${riskFactors.details.attendancePercent14d}% ${t('profile.per14d')}`} riskDomainLabels={riskDomainLabels} />
              <RiskDomainCard label={t('profile.grades')} level={riskFactors.gradesScore} detail={`${t('students.avgGrade')} ${riskFactors.details.avgGradeLast5} / 10`} riskDomainLabels={riskDomainLabels} />
              <RiskDomainCard label={t('profile.hw')} level={riskFactors.homeworkScore} detail={`${riskFactors.details.missedHomeworkStreak} ${t('profile.missed')}`} riskDomainLabels={riskDomainLabels} />
              <RiskDomainCard label={t('profile.finance')} level={riskFactors.paymentScore} detail={riskFactors.details.debtDays > 0 ? `${riskFactors.details.debtDays} ${t('profile.debtDays')}` : t('profile.noDebt')} riskDomainLabels={riskDomainLabels} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Вкладка "Геймификация" — звёзды, бриллианты, уровень и история транзакций.
 * Уровни: Bronze(0) -> Silver(100) -> Gold(300) -> Platinum(600) -> Diamond(1000).
 */
function GamificationTab({ student: s, badge, coins }: { student: any; badge: { label: string; color: string }; coins: any[] }) {
  const t = useT()
  return (
    <>
      <div className="flex items-center gap-6 mb-6">
        <div className="text-center"><p className="text-4xl font-bold text-yellow-500">{s.totalCoins ?? 0}</p><p className="text-sm text-gray-500">{t('profile.coins')}</p></div>
        <div className="text-center"><p className="text-2xl">⭐ {s.stars ?? 0}</p><p className="text-sm text-gray-500">{t('profile.stars')}</p></div>
        <div className="text-center"><p className="text-2xl">💎 {s.crystals ?? 0}</p><p className="text-sm text-gray-500">{t('profile.crystals')}</p></div>
        <div className="text-center"><p className={cn('text-2xl font-bold', badge.color)}>{badge.label}</p><p className="text-sm text-gray-500">{t('profile.level')}</p></div>
      </div>
      {coins.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('profile.noTransactions')}</p>
      ) : (
        <div className="space-y-2">
          {coins.slice(0, 20).map((tx: any) => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-md bg-gray-50 text-sm">
              <span className="text-gray-700">{tx.reason}</span>
              <span className={cn('font-semibold', tx.amount > 0 ? 'text-success-600' : 'text-danger-600')}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

const RISK_DOMAIN_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  low:      { bg: 'bg-success-50',  border: 'border-success-200', text: 'text-success-700' },
  medium:   { bg: 'bg-warning-50',  border: 'border-warning-200', text: 'text-warning-700' },
  high:     { bg: 'bg-orange-50',   border: 'border-orange-200',  text: 'text-orange-700' },
  critical: { bg: 'bg-danger-50',   border: 'border-danger-200',  text: 'text-danger-700' },
}

function RiskDomainCard({ label, level, detail, riskDomainLabels }: { label: string; level: string; detail: string; riskDomainLabels: Record<string, string> }) {
  const c = RISK_DOMAIN_COLORS[level] ?? RISK_DOMAIN_COLORS.low
  return (
    <div className={cn('p-3 rounded-lg border', c.bg, c.border)}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={cn('text-sm font-semibold', c.text)}>{riskDomainLabels[level] ?? level}</p>
      <p className="text-xs text-gray-400 mt-0.5">{detail}</p>
    </div>
  )
}

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5"><Icon className="w-3.5 h-3.5" />{label}</div>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

/**
 * Кнопка сброса пароля студента (доступна только директору/МУП).
 * После сброса показывает новый логин и пароль с возможностью копирования.
 *
 * @param studentId - UUID студента
 */
function ResetPasswordButton({ studentId }: { studentId: string }) {
  const t = useT()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ login: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleReset = async () => {
    if (!confirm(t('profile.resetConfirm'))) return
    setLoading(true)
    try {
      const r = await apiClient.post(`/lms/students/${studentId}/reset-password`)
      setResult(r.data)
      toast.success(t('profile.passwordReset'))
    } catch {
      toast.error('Error')
    } finally {
      setLoading(false)
    }
  }

  const copyAll = () => {
    if (!result) return
    navigator.clipboard.writeText(`${t('profile.login')}: ${result.login}\n${t('profile.password')}: ${result.password}`)
    setCopied(true)
    toast.success(t('common.copied'))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {!result ? (
        <Button size="sm" variant="secondary" onClick={handleReset} loading={loading}>
          <Key className="w-3.5 h-3.5" />
          {t('profile.resetPassword')}
        </Button>
      ) : (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">{t('profile.newPassword')}</p>
          <div className="bg-white rounded-lg p-3 space-y-2">
            <div><span className="text-xs text-gray-400">{t('profile.login')}:</span> <span className="font-mono font-semibold text-sm">{result.login}</span></div>
            <div><span className="text-xs text-gray-400">{t('profile.password')}:</span> <span className="font-mono font-semibold text-sm">{result.password}</span></div>
          </div>
          <Button size="sm" variant="secondary" onClick={copyAll}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('common.copied') : t('common.copy')}
          </Button>
          <p className="text-xs text-gray-400">{t('profile.showOnce')}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Вкладка "Группы" — текущие группы, зачисление, перевод между группами.
 *
 * Директор/МУП может:
 * - Зачислить студента в новую группу
 * - Перевести из одной группы в другую
 * - Просмотреть историю (отчисленные группы)
 */
function StudentGroupsTab({ studentId, currentGroups, availableGroups, canManage, onRefresh }: {
  studentId: string; currentGroups: any[]; availableGroups: any[];
  canManage: boolean; onRefresh: () => void;
}) {
  const t = useT()
  const [enrolling, setEnrolling] = useState(false)
  const [transferring, setTransferring] = useState<string | null>(null) // fromGroupId
  const [selectedTarget, setSelectedTarget] = useState('')

  const activeGroups = currentGroups.filter((g: any) => g.isActive)
  const inactiveGroups = currentGroups.filter((g: any) => !g.isActive)
  const notEnrolled = availableGroups.filter((g: any) => !g.isEnrolled)

  const handleEnroll = async (groupId: string) => {
    setEnrolling(true)
    try {
      await apiClient.post(`/lms/students/${studentId}/enroll?groupId=${groupId}`)
      toast.success('OK')
      onRefresh()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    } finally { setEnrolling(false) }
  }

  const handleTransfer = async () => {
    if (!transferring || !selectedTarget) return
    try {
      await apiClient.post(`/lms/students/${studentId}/transfer?fromGroupId=${transferring}&toGroupId=${selectedTarget}`)
      toast.success('OK')
      setTransferring(null); setSelectedTarget('')
      onRefresh()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Active groups */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('profile.currentGroups')}</h3>
        {activeGroups.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">{t('profile.notEnrolled')}</p>
        ) : (
          <div className="space-y-2">
            {activeGroups.map((g: any) => (
              <div key={g.enrollmentId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.groupName}</p>
                  <p className="text-xs text-gray-400">{g.subjectName} · {t('common.from')} {formatDate(g.enrolledAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">{t('common.active')}</Badge>
                  {canManage && (
                    <Button size="sm" variant="secondary" onClick={() => { setTransferring(g.groupId); setSelectedTarget('') }}>
                      <ArrowRight className="w-3.5 h-3.5" />{t('profile.transfer')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer dialog */}
      {transferring && (
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg space-y-3">
          <p className="text-sm font-medium text-gray-700">
            {t('profile.transferFrom')} <strong>{activeGroups.find((g: any) => g.groupId === transferring)?.groupName}</strong> {t('profile.transferTo')}
          </p>
          <select className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm" value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)}>
            <option value="">{t('profile.selectGroup')}</option>
            {notEnrolled.map((g: any) => (
              <option key={g.groupId} value={g.groupId}>{g.groupName} — {g.subjectName} ({g.directionName})</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleTransfer} disabled={!selectedTarget}>{t('profile.transfer')}</Button>
            <Button size="sm" variant="secondary" onClick={() => setTransferring(null)}>{t('common.cancel')}</Button>
          </div>
        </div>
      )}

      {/* Add to group */}
      {canManage && notEnrolled.length > 0 && !transferring && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('profile.addToGroup')}</h3>
          <p className="text-xs text-gray-400 mb-2">{t('profile.availableGroups')}</p>
          <div className="space-y-2">
            {notEnrolled.map((g: any) => (
              <div key={g.groupId} className="flex items-center justify-between p-3 border border-dashed border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-700">{g.groupName}</p>
                  <p className="text-xs text-gray-400">{g.subjectName} · {g.directionName}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleEnroll(g.groupId)} loading={enrolling}>
                  <Plus className="w-3.5 h-3.5" />{t('profile.enroll')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive (history) */}
      {inactiveGroups.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('profile.history')}</h3>
          <div className="space-y-2">
            {inactiveGroups.map((g: any) => (
              <div key={g.enrollmentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-60">
                <div>
                  <p className="text-sm text-gray-500">{g.groupName}</p>
                  <p className="text-xs text-gray-400">{g.subjectName} · {formatDate(g.enrolledAt)} → {formatDate(g.droppedAt)}</p>
                </div>
                <Badge variant="default">{t('profile.dropped')}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
