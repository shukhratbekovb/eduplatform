'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Mail, Phone, Cake, Copy, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useIsDirectorOrMup } from '@/lib/stores/useAuthStore'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from 'sonner'
import type { UserRole } from '@/types/lms'

// ── Hooks ────────────────────────────────────────────────────────────────────

function useStaff() {
  return useQuery({
    queryKey: ['lms', 'staff'],
    queryFn: () => apiClient.get('/lms/users').then((r) => r.data as any[]),
    staleTime: 5 * 60_000,
  })
}

function useCreateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiClient.post('/lms/users', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'staff'] })
      toast.success('Сотрудник создан')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Не удалось создать'),
  })
}

// ── Config ───────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
  director:      { label: 'Директор',        variant: 'danger'  },
  mup:           { label: 'МУП',             variant: 'warning' },
  teacher:       { label: 'Преподаватель',   variant: 'success' },
  sales_manager: { label: 'Менеджер продаж', variant: 'default' },
  cashier:       { label: 'Кассир',          variant: 'default' },
}

const ASSIGNABLE_ROLES: { value: string; label: string }[] = [
  { value: 'teacher',       label: 'Преподаватель' },
  { value: 'mup',           label: 'МУП' },
  { value: 'sales_manager', label: 'Менеджер продаж' },
  { value: 'cashier',       label: 'Кассир' },
]

const ROLE_ORDER: UserRole[] = ['director', 'mup', 'teacher', 'sales_manager', 'cashier']

function formatBirthday(dob: string | null) {
  if (!dob) return null
  const d = new Date(dob)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const canManage = useIsDirectorOrMup()
  const { data: staff = [], isLoading } = useStaff()
  const users = (staff as any[]).filter((u: any) => u.role !== 'student')
  const [showCreate, setShowCreate] = useState(false)

  const grouped: Record<string, any[]> = {}
  users.forEach((u) => {
    if (!grouped[u.role]) grouped[u.role] = []
    grouped[u.role].push(u)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          Персонал
          <span className="text-sm font-normal text-gray-400">({users.length})</span>
        </h1>
        {canManage && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Добавить
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Нет сотрудников" />
      ) : (
        <div className="space-y-8">
          {ROLE_ORDER.map((role) => {
            const list = grouped[role]
            if (!list?.length) return null
            const cfg = ROLE_CFG[role]
            return (
              <section key={role}>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {cfg.label} ({list.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((u: any) => (
                    <Link
                      key={u.id}
                      href={`/staff/${u.id}`}
                      className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
                    >
                      <UserAvatar name={u.name} src={u.avatarUrl} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          <Mail className="w-3 h-3 shrink-0" />{u.email}
                        </p>
                        {u.dateOfBirth && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Cake className="w-3 h-3 shrink-0" />{formatBirthday(u.dateOfBirth)}
                          </p>
                        )}
                      </div>
                      <Badge variant={cfg.variant} className="shrink-0">{cfg.label}</Badge>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <CreateStaffDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}

// ── Create dialog ────────────────────────────────────────────────────────────

function CreateStaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [role, setRole] = useState('teacher')
  const { mutate, isPending } = useCreateStaff()
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate({
      name: name.trim(), email: email.trim(), role,
      phone: phone.trim() || null,
      dateOfBirth: dob || null,
    }, {
      onSuccess: (data: any) => {
        setCredentials({ email: data.email, password: data.generatedPassword })
        setName(''); setEmail(''); setPhone(''); setDob(''); setRole('teacher')
      },
    })
  }

  const handleClose = () => { setCredentials(null); setCopied(false); onOpenChange(false) }

  const copyCredentials = () => {
    if (!credentials) return
    navigator.clipboard.writeText(`Email: ${credentials.email}\nПароль: ${credentials.password}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (credentials) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Аккаунт создан</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-500 mb-4">Пароль сгенерирован. Скопируйте — повторно он не покажется.</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
              <div><span className="text-gray-400">Email:</span> {credentials.email}</div>
              <div><span className="text-gray-400">Пароль:</span> {credentials.password}</div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={copyCredentials}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Скопировано' : 'Копировать'}
            </Button>
            <Button onClick={handleClose}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Новый сотрудник</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ФИО *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Иванов Иван" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Роль</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white">
                  {ASSIGNABLE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@edu.uz" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Телефон</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Дата рождения</label>
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-gray-400">Пароль будет сгенерирован автоматически</p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" loading={isPending} disabled={!name.trim() || !email.trim()}>Создать</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
