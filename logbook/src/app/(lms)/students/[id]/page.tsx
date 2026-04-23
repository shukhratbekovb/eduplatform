'use client'
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

export default function StudentProfilePage() {
  const params    = useParams()
  const id        = (params?.id as string) ?? ''
  const router    = useRouter()
  const canManage = useIsDirectorOrMup()
  const [showEdit, setShowEdit] = useState(false)

  const { data: student, isLoading } = useStudent(id)
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

  if (isLoading || !student) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
  }

  const s = student as any
  const badge = BADGE_CONFIG[s.badgeLevel] ?? BADGE_CONFIG.bronze

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" />Назад
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
                    <Pencil className="w-3.5 h-3.5" />Редактировать
                  </Button>
                )}
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-500">{s.totalCoins ?? 0}</p>
                  <p className="text-xs text-gray-400">монет</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div><p className="text-xs text-gray-400">Средний балл</p><p className={cn('text-lg font-bold', s.gpa != null && s.gpa < 6 ? 'text-danger-600' : 'text-gray-900')}>{s.gpa != null ? Number(s.gpa).toFixed(1) : '—'}</p></div>
              <div><p className="text-xs text-gray-400">Посещаемость</p><p className={cn('text-lg font-bold', s.attendancePercent != null && s.attendancePercent < 70 ? 'text-danger-600' : 'text-gray-900')}>{s.attendancePercent != null ? s.attendancePercent + '%' : '—'}</p></div>
              <div><p className="text-xs text-gray-400">Код</p><p className="text-lg font-bold text-gray-900">{s.studentCode ?? '—'}</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <Tabs defaultValue="personal">
          <div className="px-4 border-b border-gray-200 overflow-x-auto">
            <TabsList className="border-none whitespace-nowrap">
              <TabsTrigger value="personal">Личные данные</TabsTrigger>
              <TabsTrigger value="groups">Группы ({currentGroups.filter((g:any) => g.isActive).length})</TabsTrigger>
              <TabsTrigger value="contracts">Договоры ({contracts.length})</TabsTrigger>
              <TabsTrigger value="academic">Успеваемость</TabsTrigger>
              <TabsTrigger value="gamification">Достижения</TabsTrigger>
            </TabsList>
          </div>

          {/* Personal */}
          <TabsContent value="personal" className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field icon={User} label="Имя" value={s.fullName} />
              {s.phone && <Field icon={Phone} label="Телефон" value={s.phone} />}
              {s.email && <Field icon={Mail} label="Email (логин)" value={s.email} />}
              {s.dateOfBirth && <Field icon={Calendar} label="Дата рождения" value={formatDate(s.dateOfBirth)} />}
              {s.parentName && <Field icon={User} label="Родитель / контакт" value={s.parentName} />}
              {s.parentPhone && <Field icon={Phone} label="Телефон родителя" value={s.parentPhone} />}
              {s.address && <Field icon={User} label="Адрес" value={s.address} />}
              {s.studentCode && <Field icon={User} label="Код студента" value={s.studentCode} />}
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
              <p className="text-sm text-gray-400 text-center py-8">Нет договоров</p>
            ) : (
              <div className="space-y-3">
                {contracts.map(c => (
                  <div key={c.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-200 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-primary-700 font-semibold">{c.contractNumber}</span>
                          <Badge variant={c.status === 'active' ? 'success' : 'default'}>
                            {c.status === 'active' ? 'Активен' : c.status}
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
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.durationMonths} мес. · {c.totalLessons} уроков</span>
                      )}
                      {c.startDate && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Начало: {formatDate(c.startDate)}</span>
                      )}
                      {c.createdAt && (
                        <span>Создан: {formatDate(c.createdAt)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Academic */}
          <TabsContent value="academic" className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-center">
                <p className="text-3xl font-bold text-gray-900">{s.gpa != null ? Number(s.gpa).toFixed(2) : '—'}</p>
                <p className="text-sm text-gray-500 mt-1">Средний балл (GPA)</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-center">
                <p className="text-3xl font-bold text-gray-900">{s.attendancePercent ?? '—'}{s.attendancePercent != null ? '%' : ''}</p>
                <p className="text-sm text-gray-500 mt-1">Посещаемость</p>
              </div>
            </div>
          </TabsContent>

          {/* Gamification */}
          <TabsContent value="gamification" className="p-6">
            <div className="flex items-center gap-6 mb-6">
              <div className="text-center"><p className="text-4xl font-bold text-yellow-500">{s.totalCoins ?? 0}</p><p className="text-sm text-gray-500">Монет</p></div>
              <div className="text-center"><p className="text-2xl">⭐ {s.stars ?? 0}</p><p className="text-sm text-gray-500">Звёзд</p></div>
              <div className="text-center"><p className="text-2xl">💎 {s.crystals ?? 0}</p><p className="text-sm text-gray-500">Кристаллов</p></div>
              <div className="text-center"><p className={cn('text-2xl font-bold', badge.color)}>{badge.label}</p><p className="text-sm text-gray-500">Уровень</p></div>
            </div>
            {(coins as any[]).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Нет транзакций</p>
            ) : (
              <div className="space-y-2">
                {(coins as any[]).slice(0, 20).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-md bg-gray-50 text-sm">
                    <span className="text-gray-700">{tx.reason}</span>
                    <span className={cn('font-semibold', tx.amount > 0 ? 'text-success-600' : 'text-danger-600')}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
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

function ResetPasswordButton({ studentId }: { studentId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ login: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleReset = async () => {
    if (!confirm('Сбросить пароль студента? Старый пароль перестанет работать.')) return
    setLoading(true)
    try {
      const r = await apiClient.post(`/lms/students/${studentId}/reset-password`)
      setResult(r.data)
      toast.success('Пароль сброшен')
    } catch {
      toast.error('Ошибка сброса пароля')
    } finally {
      setLoading(false)
    }
  }

  const copyAll = () => {
    if (!result) return
    navigator.clipboard.writeText(`Логин: ${result.login}\nПароль: ${result.password}`)
    setCopied(true)
    toast.success('Скопировано')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {!result ? (
        <Button size="sm" variant="secondary" onClick={handleReset} loading={loading}>
          <Key className="w-3.5 h-3.5" />
          Сбросить пароль
        </Button>
      ) : (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Новый пароль:</p>
          <div className="bg-white rounded-lg p-3 space-y-2">
            <div><span className="text-xs text-gray-400">Логин:</span> <span className="font-mono font-semibold text-sm">{result.login}</span></div>
            <div><span className="text-xs text-gray-400">Пароль:</span> <span className="font-mono font-semibold text-sm">{result.password}</span></div>
          </div>
          <Button size="sm" variant="secondary" onClick={copyAll}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Скопировано' : 'Скопировать'}
          </Button>
          <p className="text-xs text-gray-400">Покажите эти данные студенту. Они больше не будут показаны.</p>
        </div>
      )}
    </div>
  )
}

function StudentGroupsTab({ studentId, currentGroups, availableGroups, canManage, onRefresh }: {
  studentId: string; currentGroups: any[]; availableGroups: any[];
  canManage: boolean; onRefresh: () => void;
}) {
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
      toast.success('Студент зачислен в группу')
      onRefresh()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Ошибка зачисления')
    } finally { setEnrolling(false) }
  }

  const handleTransfer = async () => {
    if (!transferring || !selectedTarget) return
    try {
      await apiClient.post(`/lms/students/${studentId}/transfer?fromGroupId=${transferring}&toGroupId=${selectedTarget}`)
      toast.success('Студент переведён')
      setTransferring(null); setSelectedTarget('')
      onRefresh()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Ошибка перевода')
    }
  }

  return (
    <div className="space-y-6">
      {/* Active groups */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Текущие группы</h3>
        {activeGroups.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Не зачислен ни в одну группу</p>
        ) : (
          <div className="space-y-2">
            {activeGroups.map((g: any) => (
              <div key={g.enrollmentId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.groupName}</p>
                  <p className="text-xs text-gray-400">{g.subjectName} · с {formatDate(g.enrolledAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Активен</Badge>
                  {canManage && (
                    <Button size="sm" variant="secondary" onClick={() => { setTransferring(g.groupId); setSelectedTarget('') }}>
                      <ArrowRight className="w-3.5 h-3.5" />Перевести
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
            Перевести из <strong>{activeGroups.find((g: any) => g.groupId === transferring)?.groupName}</strong> в:
          </p>
          <select className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm" value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)}>
            <option value="">Выберите группу…</option>
            {notEnrolled.map((g: any) => (
              <option key={g.groupId} value={g.groupId}>{g.groupName} — {g.subjectName} ({g.directionName})</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleTransfer} disabled={!selectedTarget}>Перевести</Button>
            <Button size="sm" variant="secondary" onClick={() => setTransferring(null)}>Отмена</Button>
          </div>
        </div>
      )}

      {/* Add to group */}
      {canManage && notEnrolled.length > 0 && !transferring && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Добавить в группу</h3>
          <p className="text-xs text-gray-400 mb-2">Доступны группы по направлениям из договоров студента</p>
          <div className="space-y-2">
            {notEnrolled.map((g: any) => (
              <div key={g.groupId} className="flex items-center justify-between p-3 border border-dashed border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-700">{g.groupName}</p>
                  <p className="text-xs text-gray-400">{g.subjectName} · {g.directionName}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleEnroll(g.groupId)} loading={enrolling}>
                  <Plus className="w-3.5 h-3.5" />Зачислить
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive (history) */}
      {inactiveGroups.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">История</h3>
          <div className="space-y-2">
            {inactiveGroups.map((g: any) => (
              <div key={g.enrollmentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-60">
                <div>
                  <p className="text-sm text-gray-500">{g.groupName}</p>
                  <p className="text-xs text-gray-400">{g.subjectName} · {formatDate(g.enrolledAt)} → {formatDate(g.droppedAt)}</p>
                </div>
                <Badge variant="default">Выбыл</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
