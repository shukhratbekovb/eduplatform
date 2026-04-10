'use client'
import { useT } from '@/lib/i18n'
import { useContacts } from '@/lib/hooks/student'
import { cn } from '@/lib/utils/cn'
import { Mail, Phone, Send } from 'lucide-react'
import type { Contact } from '@/types/student'

const ROLE_COLORS: Record<string, string> = {
  curator:      'bg-primary-50 text-primary-700',
  teacher:      'bg-info-50 text-info-700',
  dean:         'bg-warning-50 text-warning-700',
  admin:        'bg-gray-100 text-gray-600',
  support:      'bg-success-50 text-success-700',
}

export default function ContactsPage() {
  const t = useT()
  const { data: contacts = [], isLoading } = useContacts()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('contacts.title')}</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-36 animate-pulse" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          {t('contacts.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((c) => <ContactCard key={c.id} contact={c} t={t} />)}
        </div>
      )}
    </div>
  )
}

function ContactCard({ contact: c, t }: { contact: Contact; t: (k: string) => string }) {
  const roleColor = ROLE_COLORS[c.role] ?? 'bg-gray-100 text-gray-600'
  const initials  = c.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{c.fullName}</p>
          <span className={cn('inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5', roleColor)}>
            {t(`contacts.role.${c.role}`)}
          </span>
        </div>
      </div>

      {c.subject && (
        <p className="text-xs text-gray-400 -mt-1">{c.subject}</p>
      )}

      <div className="flex flex-col gap-1.5">
        {c.email && (
          <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary-600 transition-colors group">
            <Mail className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-500 shrink-0" />
            <span className="truncate">{c.email}</span>
          </a>
        )}
        {c.phone && (
          <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary-600 transition-colors group">
            <Phone className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-500 shrink-0" />
            <span>{c.phone}</span>
          </a>
        )}
        {c.telegram && (
          <a href={`https://t.me/${c.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary-600 transition-colors group">
            <Send className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-500 shrink-0" />
            <span>{c.telegram}</span>
          </a>
        )}
      </div>
    </div>
  )
}
