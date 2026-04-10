'use client'
import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { usePayments } from '@/lib/hooks/student'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatMoney } from '@/lib/utils/dates'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { Payment } from '@/types/student'

type Tab = 'upcoming' | 'history'

const STATUS_CONFIG = {
  paid:    { icon: CheckCircle2, color: 'text-success-600', bg: 'bg-success-50' },
  pending: { icon: Clock,        color: 'text-warning-600', bg: 'bg-warning-50' },
  overdue: { icon: AlertCircle,  color: 'text-danger-600',  bg: 'bg-danger-50'  },
}

export default function PaymentPage() {
  const t    = useT()
  const lang = useI18nStore((s) => s.lang)
  const [tab, setTab] = useState<Tab>('upcoming')

  const { data: payments = [], isLoading } = usePayments()

  const upcoming = payments.filter((p) => p.status !== 'paid')
  const history  = payments.filter((p) => p.status === 'paid')
  const list     = tab === 'upcoming' ? upcoming : history

  const currency      = payments[0]?.currency ?? 'UZS'
  const totalUpcoming = upcoming.reduce((sum, p) => sum + p.amount, 0)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'upcoming', label: t('payment.tab.upcoming') },
    { key: 'history',  label: t('payment.tab.history') },
  ]

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('payment.title')}</h1>

      {/* Summary */}
      {tab === 'upcoming' && upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-500">{t('payment.totalUpcoming')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatMoney(totalUpcoming, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{t('payment.count')}</p>
            <p className="text-lg font-bold text-gray-700">{upcoming.length}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {tabs.map(({ key, label }) => (
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
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-16 animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <CheckCircle2 className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">
            {tab === 'upcoming' ? t('payment.empty.upcoming') : t('payment.empty.history')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{t('payment.col.period')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{t('payment.col.description')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{t('payment.col.amount')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">{t('payment.col.status')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{t('payment.col.due')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, idx) => <PaymentRow key={p.id} payment={p} lang={lang} t={t} isLast={idx === list.length - 1} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PaymentRow({ payment: p, lang, t, isLast }: {
  payment: Payment; lang: string; t: (k: string) => string; isLast: boolean
}) {
  const cfg  = STATUS_CONFIG[p.status]
  const Icon = cfg.icon

  return (
    <tr className={cn('hover:bg-gray-50 transition-colors', !isLast && 'border-b border-gray-100')}>
      <td className="px-4 py-3 text-gray-700 font-medium">{p.period}</td>
      <td className="px-4 py-3 text-gray-500">{p.description}</td>
      <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatMoney(p.amount, p.currency)}</td>
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
}
