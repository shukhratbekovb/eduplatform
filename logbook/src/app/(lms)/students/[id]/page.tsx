'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Phone, Mail, Calendar, User, Pencil, UserPlus } from 'lucide-react'
import { useStudent, useStudentRisk, useStudentCoins } from '@/lib/hooks/lms/useStudents'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/ui/avatar'
import { RiskBadge } from '@/components/lms/students/RiskBadge'
import { StudentForm } from '@/components/lms/students/StudentForm'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/dates'
import { useIsDirectorOrMup } from '@/lib/stores/useAuthStore'
import { cn } from '@/lib/utils/cn'

const BADGE_CONFIG: Record<string, { label: string; color: string }> = {
  bronze:   { label: 'Bronze',   color: 'text-amber-700' },
  silver:   { label: 'Silver',   color: 'text-gray-500' },
  gold:     { label: 'Gold',     color: 'text-yellow-500' },
  platinum: { label: 'Platinum', color: 'text-purple-500' },
  diamond:  { label: 'Diamond',  color: 'text-blue-400' },
}

export default function StudentProfilePage() {
  const { id }     = useParams<{ id: string }>()
  const router     = useRouter()
  const canManage  = useIsDirectorOrMup()
  const [showEdit, setShowEdit] = useState(false)

  const { data: student, isLoading } = useStudent(id)
  const { data: risk }               = useStudentRisk(id)
  const { data: coins = [] }         = useStudentCoins(id)

  if (isLoading || !student) {
    return <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
    </div>
  }

  const s = student as any
  const badge = BADGE_CONFIG[s.badgeLevel] ?? BADGE_CONFIG.bronze

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к студентам
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
                  <span className={cn('text-sm font-semibold', badge.color)}>
                    🏅 {badge.label}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {canManage && (
                  <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
                    <Pencil className="w-3.5 h-3.5" />
                    Редактировать
                  </Button>
                )}
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-500">{s.totalCoins ?? 0}</p>
                  <p className="text-xs text-gray-400">монет</p>
                </div>
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-400">Средний балл</p>
                <p className={cn('text-lg font-bold', s.gpa != null && s.gpa < 6 ? 'text-danger-600' : 'text-gray-900')}>
                  {s.gpa != null ? Number(s.gpa).toFixed(1) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Посещаемость</p>
                <p className={cn('text-lg font-bold', s.attendancePercent != null && s.attendancePercent < 70 ? 'text-danger-600' : 'text-gray-900')}>
                  {s.attendancePercent != null ? s.attendancePercent + '%' : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Код</p>
                <p className="text-lg font-bold text-gray-900">{s.studentCode ?? '—'}</p>
              </div>
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
              <TabsTrigger value="academic">Успеваемость</TabsTrigger>
              <TabsTrigger value="gamification">Достижения</TabsTrigger>
            </TabsList>
          </div>

          {/* Personal */}
          <TabsContent value="personal" className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field icon={User} label="Имя" value={s.fullName} />
              {s.phone && <Field icon={Phone} label="Телефон" value={s.phone} />}
              {s.email && <Field icon={Mail} label="Email" value={s.email} />}
              {s.parentPhone && <Field icon={Phone} label="Телефон родителя" value={s.parentPhone} />}
              {s.studentCode && <Field icon={User} label="Код студента" value={s.studentCode} />}
            </div>
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
              <div className="text-center">
                <p className="text-4xl font-bold text-yellow-500">{s.totalCoins ?? 0}</p>
                <p className="text-sm text-gray-500">Монет</p>
              </div>
              <div className="text-center">
                <p className="text-2xl">⭐ {s.stars ?? 0}</p>
                <p className="text-sm text-gray-500">Звёзд</p>
              </div>
              <div className="text-center">
                <p className="text-2xl">💎 {s.crystals ?? 0}</p>
                <p className="text-sm text-gray-500">Кристаллов</p>
              </div>
              <div className="text-center">
                <p className={cn('text-2xl font-bold', badge.color)}>{badge.label}</p>
                <p className="text-sm text-gray-500">Уровень</p>
              </div>
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
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}
