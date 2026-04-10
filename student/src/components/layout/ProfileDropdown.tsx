'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, FileText, LogOut, ChevronRight, Globe, X, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ProfileDropdown() {
  const t        = useT()
  const router   = useRouter()
  const student  = useAuthStore((s) => s.student)
  const logout   = useAuthStore((s) => s.logout)
  const lang     = useI18nStore((s) => s.lang)
  const setLang  = useI18nStore((s) => s.setLang)

  const [open,        setOpen]        = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showPw,      setShowPw]      = useState(false)

  const initials = student?.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? 'ST'

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  return (
    <div className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center hover:ring-2 hover:ring-primary-200 transition-all"
      >
        {initials}
      </button>

      {/* Dropdown menu */}
      {open && !showProfile && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-scale-in">
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{student?.fullName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{student?.studentCode}</p>
            </div>

            <MenuItem icon={User} label={t('profile.title')} onClick={() => { setShowProfile(true); setOpen(false) }} />
            <MenuItem icon={FileText} label={t('profile.getCertificate')} onClick={() => setOpen(false)} />

            {/* Language */}
            <div className="px-3 py-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700 flex-1">{lang === 'ru' ? t('lang.ru') : t('lang.en')}</span>
              <button
                onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                {lang === 'ru' ? 'EN' : 'RU'}
              </button>
            </div>

            <div className="border-t border-gray-100 mt-1" />
            <MenuItem icon={LogOut} label={t('profile.logout')} onClick={handleLogout} danger />
          </div>
        </>
      )}

      {/* Profile slide-in panel */}
      {showProfile && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowProfile(false)} />
          <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{t('profile.title')} и доступы</h2>
              <button onClick={() => setShowProfile(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full bg-primary-600 text-white text-2xl font-bold flex items-center justify-center">
                  {initials}
                </div>
                <p className="text-base font-semibold text-gray-900">{student?.fullName}</p>
                <p className="text-sm text-gray-400">{student?.studentCode}</p>
              </div>

              {/* Personal info */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('profile.personal')}</h3>
                <div className="space-y-3">
                  <Field label={t('profile.dob')}   value={student?.dateOfBirth ?? '—'} />
                  <Field label={t('profile.email')} value={student?.email ?? '—'} />
                  <Field label={t('profile.phone')} value={student?.phone ?? '—'} />
                </div>
              </div>

              {/* Change password */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('profile.changePassword')}</h3>
                <div className="space-y-2">
                  <PasswordField label={t('profile.oldPassword')} show={showPw} onToggle={() => setShowPw((v) => !v)} />
                  <PasswordField label={t('profile.newPassword')} show={showPw} onToggle={() => setShowPw((v) => !v)} />
                  <PasswordField label={t('profile.confirmPassword')} show={showPw} onToggle={() => setShowPw((v) => !v)} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowProfile(false)}>{t('profile.cancelChanges')}</Button>
              <Button className="flex-1">{t('profile.saveChanges')}</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: React.ElementType; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left hover:bg-gray-50',
        danger ? 'text-danger-600' : 'text-gray-700'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
    </button>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm text-gray-800 bg-gray-50 rounded px-3 py-2">{value}</p>
    </div>
  )
}

function PasswordField({ label, show, onToggle }: { label: string; show: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} placeholder={label} className="pr-10" />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}
