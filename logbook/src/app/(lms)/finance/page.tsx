'use client'
import { useState } from 'react'
import { Banknote, Search, Plus, Check, Clock, AlertTriangle, FileText, ChevronDown, ChevronUp, CreditCard, Wallet } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'

function fmt(n: number) { return n.toLocaleString('ru-RU') + ' UZS' }

// ── Main page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const t = useT()
  const [search, setSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedStudentName, setSelectedStudentName] = useState('')
  const [payingPayment, setPayingPayment] = useState<any | null>(null)
  const [expandedContract, setExpandedContract] = useState<string | null>(null)
  const [tab, setTab] = useState<'contracts' | 'history'>('contracts')

  const PAYMENT_TYPE_LABELS: Record<string, string> = {
    monthly: t('fin.paymentType.monthly'),
    quarterly: t('fin.paymentType.quarterly'),
    semiannual: t('fin.paymentType.semiannual'),
    annual: t('fin.paymentType.annual'),
  }

  const METHOD_LABELS: Record<string, string> = {
    cash: t('fin.cash'),
    card: t('fin.card'),
    transfer: t('fin.transfer'),
    payme: 'Payme',
    click: 'Click',
  }

  const { data: searchResults = [] } = useQuery({
    queryKey: ['finance', 'search', search],
    queryFn: () => apiClient.get('/lms/payments/search-students', { params: { q: search } }).then((r) => r.data as any[]),
    enabled: search.length >= 2 && !selectedStudentId,
  })

  const { data: contracts = [] } = useQuery({
    queryKey: ['finance', 'contracts', selectedStudentId],
    queryFn: () => apiClient.get(`/lms/payments/student-contracts/${selectedStudentId}`).then((r) => r.data as any[]),
    enabled: !!selectedStudentId,
  })

  const { data: allPayments } = useQuery({
    queryKey: ['finance', 'payments', selectedStudentId],
    queryFn: () => apiClient.get('/lms/payments', { params: { studentId: selectedStudentId, pageSize: 100 } }).then((r) => r.data),
    enabled: !!selectedStudentId,
  })
  const payments = (allPayments as any)?.data ?? []

  const selectStudent = (s: any) => {
    setSelectedStudentId(s.id)
    setSelectedStudentName(s.fullName)
    setSearch(s.fullName)
  }

  const clearStudent = () => {
    setSelectedStudentId(null)
    setSelectedStudentName('')
    setSearch('')
    setPayingPayment(null)
    setExpandedContract(null)
  }

  // Summary
  const totalDebt = contracts.reduce((s: number, c: any) => s + (c.remaining ?? 0), 0)
  const totalPaid = contracts.reduce((s: number, c: any) => s + (c.paidTotal ?? 0), 0)
  const totalOverdue = contracts.reduce((s: number, c: any) => s + (c.overdueCount ?? 0), 0)

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
        <Banknote className="w-5 h-5 text-primary-600" />
        {t('fin.title')}
      </h1>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('fin.searchStudent')}</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('fin.searchPlaceholder')}
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (selectedStudentId) clearStudent() }}
          />
        </div>

        {search.length >= 2 && searchResults.length > 0 && !selectedStudentId && (
          <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {searchResults.map((s: any) => (
              <button
                key={s.id}
                onClick={() => selectStudent(s)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-primary-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.fullName}</p>
                  <p className="text-xs text-gray-400">{s.phone ?? ''} {s.studentCode ? `· ${s.studentCode}` : ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedStudentId && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="success">{selectedStudentName}</Badge>
            <button onClick={clearStudent} className="text-xs text-gray-400 hover:text-gray-600 underline">{t('fin.change')}</button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {selectedStudentId && contracts.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-400 mb-1">{t('fin.paid')}</p>
            <p className="text-lg font-semibold text-success-600">{fmt(totalPaid)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-400 mb-1">{t('fin.remaining')}</p>
            <p className={cn("text-lg font-semibold", totalDebt > 0 ? "text-amber-600" : "text-gray-900")}>{fmt(totalDebt)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-400 mb-1">{t('fin.overdue')}</p>
            <p className={cn("text-lg font-semibold", totalOverdue > 0 ? "text-red-600" : "text-gray-900")}>
              {totalOverdue} {totalOverdue === 1 ? t('fin.payment') : t('fin.payments')}
            </p>
          </div>
        </div>
      )}

      {/* Contracts + payments */}
      {selectedStudentId && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button onClick={() => setTab('contracts')}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === 'contracts' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500')}>
              {t('fin.contractsSchedule')} ({contracts.length})
            </button>
            <button onClick={() => setTab('history')}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === 'history' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500')}>
              {t('fin.allPayments')} ({payments.length})
            </button>
          </div>

          {tab === 'contracts' ? (
            <div className="p-4">
              {contracts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">{t('fin.noContracts')}</p>
              ) : (
                <div className="space-y-3">
                  {contracts.map((c: any) => (
                    <ContractCard
                      key={c.id}
                      contract={c}
                      expanded={expandedContract === c.id}
                      onToggle={() => setExpandedContract(expandedContract === c.id ? null : c.id)}
                      onPay={(payment: any) => setPayingPayment(payment)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {payments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">{t('fin.noPayments')}</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p: any) => (
                    <PaymentRow key={p.id} payment={p} onPay={() => setPayingPayment(p)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment dialog */}
      {payingPayment && (
        <PaymentDialog
          payment={payingPayment}
          studentId={selectedStudentId!}
          studentName={selectedStudentName}
          onClose={() => setPayingPayment(null)}
        />
      )}
    </div>
  )
}

// ── Contract card with expandable schedule ──────────────────────────────────

function ContractCard({ contract: c, expanded, onToggle, onPay }: {
  contract: any; expanded: boolean; onToggle: () => void; onPay: (p: any) => void
}) {
  const t = useT()
  const { data: schedule = [] } = useQuery({
    queryKey: ['finance', 'schedule', c.id],
    queryFn: () => apiClient.get(`/lms/payments/schedule/${c.id}`).then((r) => r.data as any[]),
    enabled: expanded,
  })

  const PAYMENT_TYPE_LABELS: Record<string, string> = {
    monthly: t('fin.paymentType.monthly'),
    quarterly: t('fin.paymentType.quarterly'),
    semiannual: t('fin.paymentType.semiannual'),
    annual: t('fin.paymentType.annual'),
  }

  const METHOD_LABELS: Record<string, string> = {
    cash: t('fin.cash'),
    card: t('fin.card'),
    transfer: t('fin.transfer'),
    payme: 'Payme',
    click: 'Click',
  }

  const progress = c.totalExpected > 0 ? Math.min(100, (c.paidTotal / c.totalExpected) * 100) : 0

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs text-primary-700 font-semibold">{c.contractNumber}</span>
              <Badge variant={c.status === 'active' ? 'success' : 'default'}>
                {c.status === 'active' ? t('common.active') : c.status}
              </Badge>
              {c.overdueCount > 0 && (
                <Badge variant="danger">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {c.overdueCount} {t('fin.overdue').toLowerCase()}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-gray-900">{c.directionName ?? '—'}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{t('fin.paid')}: {fmt(c.paidTotal)}</span>
            <span>{t('fin.total')}: {fmt(c.totalExpected)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", c.overdueCount > 0 ? "bg-red-500" : "bg-success-500")}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-4 text-xs text-gray-400 flex-wrap">
            <span>{t('fin.paymentLabel')}: {fmt(c.paymentAmount)}/{PAYMENT_TYPE_LABELS[c.paymentType] ?? c.paymentType}</span>
            <span>{t('fin.remaining')}: <strong className={cn(c.remaining > 0 ? "text-amber-600" : "text-success-600")}>{fmt(c.remaining)}</strong></span>
            {c.startDate && <span>{t('common.from').charAt(0).toUpperCase() + t('common.from').slice(1)} {formatDate(c.startDate)}</span>}
          </div>
          <button
            onClick={onToggle}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('fin.schedule')}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Schedule */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4">
          {schedule.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">{t('common.loading')}</p>
          ) : (
            <div className="space-y-2">
              {schedule.map((p: any) => (
                <div key={p.id} className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  p.status === 'paid' ? "border-success-200 bg-success-50/50" :
                  p.status === 'overdue' ? "border-red-200 bg-red-50/50" :
                  "border-gray-200 bg-white"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
                      p.status === 'paid' ? "bg-success-100 text-success-700" :
                      p.status === 'overdue' ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {p.periodNumber ?? '#'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {fmt(p.amount)}
                        {p.paidAmount > 0 && p.status !== 'paid' && (
                          <span className="text-xs text-success-600 ml-1">({t('fin.deposited')} {fmt(p.paidAmount)})</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {t('common.to')} {p.dueDate ? formatDate(p.dueDate) : '—'}
                        {p.method && ` · ${METHOD_LABELS[p.method] ?? p.method}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'danger' : 'warning'}>
                      {p.status === 'paid' ? t('fin.paid') : p.status === 'overdue' ? t('fin.overdue') : t('fin.pending')}
                    </Badge>
                    {p.status !== 'paid' && (
                      <Button size="sm" variant="secondary" onClick={() => onPay(p)}>
                        <Wallet className="w-3.5 h-3.5" />
                        {t('fin.pay')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Payment row (for "All payments" tab) ───────────────────────────────────

function PaymentRow({ payment: p, onPay }: { payment: any; onPay: () => void }) {
  const t = useT()

  const METHOD_LABELS: Record<string, string> = {
    cash: t('fin.cash'),
    card: t('fin.card'),
    transfer: t('fin.transfer'),
    payme: 'Payme',
    click: 'Click',
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
      <div>
        <p className="text-sm font-medium text-gray-900">
          {fmt(p.amount)}
          {p.paidAmount > 0 && p.status !== 'paid' && (
            <span className="text-xs text-success-600 ml-1">({t('fin.deposited')} {fmt(p.paidAmount)})</span>
          )}
        </p>
        <p className="text-xs text-gray-400">
          {p.contractNumber && `${p.contractNumber} · `}
          {p.directionName && `${p.directionName} · `}
          {p.periodNumber && `#${p.periodNumber} · `}
          {p.description ?? ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <Badge variant={p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'danger' : 'warning'}>
            {p.status === 'paid' ? t('fin.paid') : p.status === 'overdue' ? t('fin.overdue') : t('fin.pending')}
          </Badge>
          <p className="text-xs text-gray-400 mt-0.5">
            {p.paidAt ? formatDate(p.paidAt) : p.dueDate ? `${t('common.to')} ${formatDate(p.dueDate)}` : ''}
          </p>
          {p.method && <p className="text-[10px] text-gray-300">{METHOD_LABELS[p.method] ?? p.method}</p>}
        </div>
        {p.status !== 'paid' && (
          <Button size="sm" variant="secondary" onClick={onPay}>
            <Wallet className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Payment dialog ──────────────────────────────────────────────────────────

function PaymentDialog({ payment, studentId, studentName, onClose }: {
  payment: any; studentId: string; studentName: string; onClose: () => void
}) {
  const t = useT()
  const qc = useQueryClient()
  const remaining = payment.amount - (payment.paidAmount ?? 0)
  const [amount, setAmount] = useState(String(remaining > 0 ? remaining : payment.amount))
  const [method, setMethod] = useState('cash')
  const [description, setDescription] = useState('')

  const pay = useMutation({
    mutationFn: (data: any) => apiClient.post(`/lms/payments/${payment.id}/pay`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance'] })
      toast.success(t('fin.paymentAccepted'))
      onClose()
    },
    onError: () => toast.error(t('fin.paymentError')),
  })

  const handleSubmit = () => {
    if (!amount || Number(amount) <= 0) return
    pay.mutate({
      amount: Number(amount),
      method,
      description: description.trim() || undefined,
    })
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('fin.acceptPayment')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">{studentName}</p>
              <p className="text-xs text-gray-400">
                {payment.contractNumber && `${payment.contractNumber} · `}
                {payment.directionName ?? '—'}
                {payment.periodNumber && ` · ${t('fin.paymentNum')} #${payment.periodNumber}`}
              </p>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-gray-500">{t('fin.sum')}: {fmt(payment.amount)}</span>
                {payment.paidAmount > 0 && (
                  <span className="text-success-600">{t('fin.paidDeposited')}: {fmt(payment.paidAmount)}</span>
                )}
                <span className="text-amber-600 font-medium">{t('fin.remaining')}: {fmt(remaining)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('fin.amount')}</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500000" />
              {remaining > 0 && Number(amount) < remaining && Number(amount) > 0 && (
                <p className="text-xs text-amber-500 mt-1">{t('fin.partialRemain')} {fmt(remaining - Number(amount))}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('fin.paymentMethod')}</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white">
                <option value="cash">{t('fin.cash')}</option>
                <option value="card">{t('fin.card')}</option>
                <option value="transfer">{t('fin.transfer')}</option>
                <option value="payme">Payme</option>
                <option value="click">Click</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('fin.comment')}</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('fin.commentPlaceholder')} />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} loading={pay.isPending} disabled={!amount || Number(amount) <= 0}>
            {t('fin.accept')} {amount ? fmt(Number(amount)) : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
