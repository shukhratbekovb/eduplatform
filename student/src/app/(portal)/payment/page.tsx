'use client'
import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { useFinanceDashboard } from '@/lib/hooks/student'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatMoney } from '@/lib/utils/dates'
import {
  CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp,
  Wallet, TrendingDown, AlertTriangle, CreditCard,
} from 'lucide-react'
import type { Payment, ContractPaymentInfo } from '@/types/student'

type Tab = 'upcoming' | 'contracts' | 'history'

const STATUS_CONFIG = {
  paid:    { icon: CheckCircle2, color: 'text-success-600', bg: 'bg-success-50' },
  pending: { icon: Clock,        color: 'text-warning-600', bg: 'bg-warning-50' },
  overdue: { icon: AlertCircle,  color: 'text-danger-600',  bg: 'bg-danger-50'  },
}

// Payment type labels resolved via t() calls

export default function PaymentPage() {
  const t    = useT()
  const lang = useI18nStore((s) => s.lang)
  const [tab, setTab] = useState<Tab>('upcoming')

  const { data: finance, isLoading } = useFinanceDashboard()

  // Flatten all payments from all contracts
  const allPayments = finance?.contracts.flatMap((c) => c.payments) ?? []
  const upcoming = allPayments.filter((p) => p.status !== 'paid')
  const history  = allPayments.filter((p) => p.status === 'paid')

  const currency      = allPayments[0]?.currency ?? 'UZS'
  const totalUpcoming = upcoming.reduce((sum, p) => sum + p.amount - p.paidAmount, 0)

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'upcoming',  label: t('payment.tab.upcoming'), count: upcoming.length },
    { key: 'contracts', label: t('payment.tab.contracts'), count: finance?.contracts.length },
    { key: 'history',   label: t('payment.tab.history'), count: history.length },
  ]

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('payment.title')}</h1>

      {/* Summary cards */}
      {finance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-success-500" />
              <p className="text-xs text-gray-500">{t('payment.totalPaid')}</p>
            </div>
            <p className="text-xl font-bold text-success-600">{formatMoney(finance.totalPaid, currency)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-amber-500" />
              <p className="text-xs text-gray-500">{t('payment.remaining')}</p>
            </div>
            <p className={cn("text-xl font-bold", finance.totalDebt > 0 ? "text-amber-600" : "text-gray-900")}>
              {formatMoney(finance.totalDebt, currency)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-xs text-gray-500">{t('payment.overdue')}</p>
            </div>
            <p className={cn("text-xl font-bold", finance.overdueCount > 0 ? "text-red-600" : "text-gray-900")}>
              {finance.overdueCount}
            </p>
          </div>
        </div>
      )}

      {/* Next payment alert */}
      {finance?.upcomingPayment && (
        <div className={cn(
          "rounded-xl border p-4 flex items-center gap-4",
          finance.upcomingPayment.status === 'overdue'
            ? "bg-red-50 border-red-200"
            : "bg-amber-50 border-amber-200"
        )}>
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            finance.upcomingPayment.status === 'overdue' ? "bg-red-100" : "bg-amber-100"
          )}>
            {finance.upcomingPayment.status === 'overdue'
              ? <AlertCircle className="w-5 h-5 text-red-600" />
              : <Clock className="w-5 h-5 text-amber-600" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {finance.upcomingPayment.status === 'overdue'
                ? t('payment.overduePayment')
                : t('payment.nextPayment')}
            </p>
            <p className="text-xs text-gray-500">
              {finance.upcomingPayment.directionName}
              {finance.upcomingPayment.dueDate && ` · ${t('payment.by')} ${formatDate(finance.upcomingPayment.dueDate, lang)}`}
            </p>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {formatMoney(finance.upcomingPayment.amount - finance.upcomingPayment.paidAmount, currency)}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {label} {count !== undefined && <span className="text-xs opacity-60">({count})</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-16 animate-pulse" />
          ))}
        </div>
      ) : tab === 'contracts' ? (
        <ContractsView contracts={finance?.contracts ?? []} lang={lang} t={t} currency={currency} />
      ) : (
        <PaymentsList
          payments={tab === 'upcoming' ? upcoming : history}
          lang={lang}
          t={t}
          emptyKey={tab === 'upcoming' ? 'payment.empty.upcoming' : 'payment.empty.history'}
        />
      )}
    </div>
  )
}

// ── Contracts view ──────────────────────────────────────────────────────────

function ContractsView({ contracts, lang, t, currency }: {
  contracts: ContractPaymentInfo[]; lang: string; t: (k: string) => string; currency: string
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
        <CreditCard className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">{t('payment.empty.contracts')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {contracts.map((c) => {
        const isOpen = expanded === c.contractId
        const progress = c.totalExpected > 0 ? Math.min(100, (c.totalPaid / c.totalExpected) * 100) : 0
        const typeLabel = t(`payment.type.${c.paymentType}`)

        return (
          <div key={c.contractId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : c.contractId)}
              className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-primary-700 font-semibold">{c.contractNumber}</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      c.status === 'ok' ? "bg-success-50 text-success-600" :
                      c.status === 'overdue' ? "bg-danger-50 text-danger-600" :
                      "bg-warning-50 text-warning-600"
                    )}>
                      {c.status === 'overdue' && <AlertCircle className="w-3 h-3" />}
                      {t(`payment.status.${c.status}`)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{c.directionName ?? '—'}</p>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>

              {/* Progress */}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{formatMoney(c.totalPaid, currency)} / {formatMoney(c.totalExpected, currency)}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all",
                      c.status === 'overdue' ? "bg-red-500" : "bg-success-500"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-4 text-xs text-gray-400 mt-2">
                <span>{formatMoney(c.paymentAmount, currency)}/{typeLabel}</span>
                <span>{c.paidPeriods}/{c.totalPeriods} {t('payment.paid')}</span>
                {c.remaining > 0 && (
                  <span className="text-amber-600">{t('payment.remaining')}: {formatMoney(c.remaining, currency)}</span>
                )}
              </div>
            </button>

            {/* Expanded schedule */}
            {isOpen && (
              <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                <div className="space-y-2">
                  {c.payments.map((p) => {
                    const cfg = STATUS_CONFIG[p.status]
                    const Icon = cfg.icon
                    return (
                      <div key={p.id} className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
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
                              {formatMoney(p.amount, currency)}
                              {p.paidAmount > 0 && p.status !== 'paid' && (
                                <span className="text-xs text-success-600 ml-1">({t('payment.partial')} {formatMoney(p.paidAmount, currency)})</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              {p.dueDate ? formatDate(p.dueDate, lang) : '—'}
                            </p>
                          </div>
                        </div>
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                          <Icon className="w-3 h-3" />
                          {t(`payment.status.${p.status}`)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Payments list (upcoming / history) ──────────────────────────────────────

function PaymentsList({ payments, lang, t, emptyKey }: {
  payments: Payment[]; lang: string; t: (k: string) => string; emptyKey: string
}) {
  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
        <CheckCircle2 className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">{t(emptyKey)}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">#</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{t('payment.col.description')}</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{t('payment.col.amount')}</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">{t('payment.col.status')}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{t('payment.col.due')}</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p, idx) => {
            const cfg  = STATUS_CONFIG[p.status]
            const Icon = cfg.icon
            const currency = p.currency ?? 'UZS'
            return (
              <tr key={p.id} className={cn('hover:bg-gray-50 transition-colors', idx < payments.length - 1 && 'border-b border-gray-100')}>
                <td className="px-4 py-3 text-gray-500 text-xs">{p.periodNumber ?? '—'}</td>
                <td className="px-4 py-3">
                  <p className="text-gray-700 font-medium text-sm">{p.directionName ?? '—'}</p>
                  <p className="text-xs text-gray-400">{p.contractNumber}{p.description ? ` · ${p.description}` : ''}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="font-semibold text-gray-800">{formatMoney(p.amount, currency)}</p>
                  {p.paidAmount > 0 && p.status !== 'paid' && (
                    <p className="text-xs text-success-600">{t('payment.partial')} {formatMoney(p.paidAmount, currency)}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                    <Icon className="w-3 h-3" />
                    {t(`payment.status.${p.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {p.paidAt ? formatDate(p.paidAt, lang) : p.dueDate ? formatDate(p.dueDate, lang) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
