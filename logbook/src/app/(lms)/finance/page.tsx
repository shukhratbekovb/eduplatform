'use client'
import { useState } from 'react'
import { Banknote, Plus, X, AlertTriangle, CheckCircle2, Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useStudents } from '@/lib/hooks/lms/useStudents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Payment {
  id:          string
  studentId:   string
  studentName: string
  amount:      number
  month:       string  // "2026-04"
  status:      'paid' | 'pending' | 'overdue'
  paidAt:      string | null
  description: string
}

// ── Demo data via adapter ─────────────────────────────────────────────────────

function usePayments(status?: string) {
  return useQuery({
    queryKey: ['lms', 'finance', 'payments', status ?? 'all'],
    queryFn: () => apiClient.get<Payment[]>('/lms/finance/payments', { params: status ? { status } : {} }).then((r) => r.data),
  })
}

function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { studentId: string; amount: number; month: string; description: string }) =>
      apiClient.post<Payment>('/lms/finance/payments', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'finance'] })
      toast.success('Оплата зафиксирована')
    },
    onError: () => toast.error('Не удалось зафиксировать оплату'),
  })
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  paid:    { label: 'Оплачено',  variant: 'success' as const },
  pending: { label: 'Ожидает',   variant: 'warning' as const },
  overdue: { label: 'Просрочено', variant: 'danger' as const },
}

// ── Record payment form ────────────────────────────────────────────────────────

function PaymentForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState({
    studentId: '', amount: '', month: format(new Date(), 'yyyy-MM'), description: 'Оплата курса',
  })
  const [search, setSearch] = useState('')
  const { data: studentsData } = useStudents({ search, page: 1 })
  const students = (studentsData as any)?.data ?? []
  const { mutate, isPending } = useRecordPayment()

  if (!open) return null

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.studentId || !form.amount || !form.month) return
    mutate(
      {
        studentId:   form.studentId,
        amount:      Number(form.amount),
        month:       form.month,
        description: form.description.trim() || 'Оплата курса',
      },
      { onSuccess: () => { setForm({ studentId: '', amount: '', month: format(new Date(), 'yyyy-MM'), description: 'Оплата курса' }); onOpenChange(false) } }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Принять оплату</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Студент <span className="text-danger-500">*</span></label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск студента…"
                className="pl-9"
              />
            </div>
            {search && students.length > 0 && !form.studentId && (
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                {students.slice(0, 5).map((s: any) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setForm((p) => ({ ...p, studentId: s.id })); setSearch(s.fullName) }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm"
                  >
                    <UserAvatar name={s.fullName} size="xs" />
                    {s.fullName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₸) <span className="text-danger-500">*</span></label>
              <Input type="number" value={form.amount} onChange={set('amount')} placeholder="25000" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Месяц</label>
              <Input type="month" value={form.month} onChange={set('month')} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <Input value={form.description} onChange={set('description')} placeholder="Оплата курса" />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" className="flex-1" loading={isPending} disabled={!form.studentId || !form.amount}>
              <CheckCircle2 className="w-4 h-4" />
              Зафиксировать
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Payments list ─────────────────────────────────────────────────────────────

function PaymentsList({ status }: { status?: string }) {
  const { data: payments = [], isLoading } = usePayments(status)

  if (isLoading) return <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
  if ((payments as Payment[]).length === 0) return <EmptyState icon={Banknote} title="Нет платежей" description="Платежи появятся здесь после фиксации" />

  return (
    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
      {(payments as Payment[]).map((p) => {
        const cfg = STATUS_CONFIG[p.status]
        return (
          <div key={p.id} className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{p.studentName}</p>
              <p className="text-xs text-gray-400">{p.description} · {p.month}</p>
            </div>
            <span className="text-sm font-semibold text-gray-900 shrink-0">
              {p.amount.toLocaleString('ru-RU')} ₸
            </span>
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
          </div>
        )
      })}
    </div>
  )
}

// ── Debtors summary ───────────────────────────────────────────────────────────

function DebtorsList() {
  const { data: payments = [] } = usePayments('overdue')
  const debtors = payments as Payment[]

  if (debtors.length === 0) return (
    <div className="flex items-center gap-2 p-4 bg-success-50 border border-success-200 rounded-lg text-sm text-success-700">
      <CheckCircle2 className="w-4 h-4" />
      Долгов нет — все оплаты актуальны
    </div>
  )

  return (
    <div>
      <div className="flex items-start gap-2 p-3 bg-danger-50 border border-danger-200 rounded-md mb-4">
        <AlertTriangle className="w-4 h-4 text-danger-500 mt-0.5 shrink-0" />
        <p className="text-sm text-danger-700">
          <strong>{debtors.length}</strong> студентов с просроченной оплатой.
          Общая сумма долга: <strong>{debtors.reduce((s, p) => s + p.amount, 0).toLocaleString('ru-RU')} ₸</strong>
        </p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {debtors.map((p) => (
          <div key={p.id} className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{p.studentName}</p>
              <p className="text-xs text-danger-500">{p.description} · {p.month}</p>
            </div>
            <span className="text-sm font-bold text-danger-600">{p.amount.toLocaleString('ru-RU')} ₸</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary-600" />
          Финансы
        </h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Принять оплату
        </Button>
      </div>

      <PaymentForm open={showForm} onOpenChange={setShowForm} />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Tabs defaultValue="all">
          <div className="px-4 border-b border-gray-200">
            <TabsList className="border-none">
              <TabsTrigger value="all">Все платежи</TabsTrigger>
              <TabsTrigger value="pending">Ожидают</TabsTrigger>
              <TabsTrigger value="debtors">Должники</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="p-4">
            <PaymentsList />
          </TabsContent>

          <TabsContent value="pending" className="p-4">
            <PaymentsList status="pending" />
          </TabsContent>

          <TabsContent value="debtors" className="p-4">
            <DebtorsList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
