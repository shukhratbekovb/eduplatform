'use client'
import { useState } from 'react'
import { Users, Plus, X, Mail, Shield, Eye, EyeOff } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useIsDirector } from '@/lib/stores/useAuthStore'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from 'sonner'
import type { User, UserRole } from '@/types/lms'

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useStaff() {
  return useQuery({
    queryKey: ['lms', 'staff'],
    queryFn: () => apiClient.get<User[]>('/lms/users').then((r) => r.data),
  })
}

function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<User>('/lms/users', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'staff'] })
      qc.invalidateQueries({ queryKey: ['lms', 'users'] })
      toast.success('Сотрудник добавлен')
    },
    onError: () => toast.error('Не удалось добавить сотрудника'),
  })
}

// ── Role config ───────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
  director:      { label: 'Директор',        variant: 'danger' },
  mup:           { label: 'МУП',             variant: 'warning' },
  teacher:       { label: 'Преподаватель',   variant: 'success' },
  sales_manager: { label: 'Менеджер продаж', variant: 'default' },
  cashier:       { label: 'Кассир',          variant: 'default' },
}

const ASSIGNABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: 'teacher',       label: 'Преподаватель' },
  { value: 'mup',           label: 'МУП (Менеджер учебного процесса)' },
  { value: 'sales_manager', label: 'Менеджер продаж' },
  { value: 'cashier',       label: 'Кассир' },
]

// ── Staff form modal ──────────────────────────────────────────────────────────

function StaffForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'teacher' as UserRole })
  const [showPassword, setShowPassword] = useState(false)
  const { mutate, isPending } = useCreateUser()

  if (!open) return null

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return
    mutate(
      { name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role, avatarUrl: null },
      { onSuccess: () => { setForm({ name: '', email: '', password: '', role: 'teacher' }); onOpenChange(false) } }
    )
  }

  const canSubmit = !!form.name.trim() && !!form.email.trim() && form.password.length >= 6

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Новый сотрудник</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Имя <span className="text-danger-500">*</span></label>
            <Input value={form.name} onChange={set('name')} placeholder="Иванов Иван Иванович" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
            <select value={form.role} onChange={set('role')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500">
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="pt-1 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Данные для входа</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Логин (Email) <span className="text-danger-500">*</span>
                </label>
                <Input type="email" value={form.email} onChange={set('email')} placeholder="user@academy.ru" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Пароль <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Минимум 6 символов"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password.length > 0 && form.password.length < 6 && (
                  <p className="mt-1 text-xs text-danger-500">Минимум 6 символов</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" className="flex-1" loading={isPending} disabled={!canSubmit}>
              Создать аккаунт
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [showForm, setShowForm] = useState(false)
  const isDirector = useIsDirector()

  const { data: staff = [], isLoading } = useStaff()
  const users = (staff as User[]).filter((u) => u.role !== 'student')

  const groupedByRole: Record<string, User[]> = {}
  users.forEach((u) => {
    if (!groupedByRole[u.role]) groupedByRole[u.role] = []
    groupedByRole[u.role].push(u)
  })

  const roleOrder: UserRole[] = ['director', 'mup', 'teacher', 'sales_manager', 'cashier']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          Персонал
          <span className="text-sm font-normal text-gray-400">({users.length})</span>
        </h1>
        {isDirector && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Добавить сотрудника
          </Button>
        )}
      </div>

      <StaffForm open={showForm} onOpenChange={setShowForm} />

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Нет сотрудников" />
      ) : (
        <div className="space-y-6">
          {roleOrder.map((role) => {
            const roleUsers = groupedByRole[role]
            if (!roleUsers?.length) return null
            const cfg = ROLE_CONFIG[role]
            return (
              <section key={role}>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {cfg.label} ({roleUsers.length})
                </h2>
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {roleUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-4 px-4 py-3">
                      <UserAvatar name={user.name} src={user.avatarUrl} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />{user.email}
                        </p>
                      </div>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
