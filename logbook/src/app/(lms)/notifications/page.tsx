'use client'

/**
 * Страница уведомлений LMS.
 *
 * Отображает полный список уведомлений с фильтрацией "Все / Непрочитанные".
 * Каждый тип уведомления (debt_alert, risk_alert, homework_overdue и т.д.)
 * имеет свою иконку и цвет. Поддерживает пометку "прочитано" как отдельного
 * уведомления, так и всех сразу.
 *
 * @module NotificationsPage
 */

import { useState } from 'react'
import { Bell, Check, CheckCheck, AlertTriangle, Banknote, BookOpen, Shield } from 'lucide-react'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/lib/hooks/lms/useSettings'
import { formatRelativeDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

const TYPE_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  debt_alert:       { icon: Banknote,      color: 'text-danger-600',  bg: 'bg-danger-100' },
  risk_alert:       { icon: AlertTriangle, color: 'text-warning-600', bg: 'bg-warning-100' },
  homework_overdue: { icon: BookOpen,      color: 'text-orange-600',  bg: 'bg-orange-100' },
  payment_due:      { icon: Banknote,      color: 'text-primary-600', bg: 'bg-primary-100' },
  notification:     { icon: Bell,          color: 'text-gray-600',    bg: 'bg-gray-100' },
  task_overdue:     { icon: AlertTriangle, color: 'text-danger-600',  bg: 'bg-danger-100' },
}

/**
 * Основной компонент страницы уведомлений.
 * Загружает уведомления через React Query и фильтрует по статусу прочтения.
 */
export default function NotificationsPage() {
  const t = useT()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { data: notifications = [], isLoading } = useNotifications()
  const { mutate: markRead }   = useMarkNotificationRead()
  const { mutate: markAll }    = useMarkAllNotificationsRead()

  const items = filter === 'unread'
    ? (notifications as any[]).filter((n) => !n.isRead)
    : (notifications as any[])

  const unreadCount = (notifications as any[]).filter((n) => !n.isRead).length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('notif.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} ${t('notif.unread')}` : t('notif.allRead')}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="secondary" onClick={() => markAll()}>
            <CheckCheck className="w-4 h-4" />
            {t('notif.readAll')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4 w-fit">
        {([['all', t('notif.all')], ['unread', t('notif.unreadOnly')]] as [string, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val as 'all' | 'unread')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              filter === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {filter === 'unread' ? t('notif.noUnread') : t('notif.none')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {items.map((n: any) => {
            const typeConfig = TYPE_ICONS[n.type] ?? TYPE_ICONS.notification
            const Icon = typeConfig.icon
            return (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-4 px-5 py-4 transition-colors',
                  !n.isRead && 'bg-primary-50/30',
                )}
              >
                <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', typeConfig.bg)}>
                  <Icon className={cn('w-4 h-4', typeConfig.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm leading-tight', !n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700')}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-gray-500 mt-1 whitespace-pre-line line-clamp-3">{n.body}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">{formatRelativeDate(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title={t('notif.read')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
