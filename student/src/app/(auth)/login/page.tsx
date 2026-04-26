'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, GraduationCap, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/student'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useT } from '@/lib/i18n'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { cn } from '@/lib/utils/cn'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})
type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const t               = useT()
  const lang            = useI18nStore((s) => s.lang)
  const setLang         = useI18nStore((s) => s.setLang)
  const router          = useRouter()
  const setAuth         = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useAuthStore((s) => !!s.token && !!s.student)
  const [showPw,       setShowPw]       = useState(false)
  const [serverError,  setServerError]  = useState('')

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, router])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginValues) => {
    setServerError('')
    try {
      const data = await authApi.login(values)
      if (!data.student) {
        setServerError(t('login.error.notStudent'))
        return
      }
      setAuth(data.student, data.accessToken)
      router.replace('/dashboard')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const errorMap: Record<string, string> = {
        user_not_found: t('login.error.userNotFound'),
        wrong_password: t('login.error.wrongPassword'),
        account_deactivated: t('login.error.accountDeactivated'),
      }
      setServerError(errorMap[detail] || (err?.response?.status === 401 ? t('login.error.invalid') : t('login.error.server')))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EduPlatform</h1>
          <p className="text-sm text-gray-500 mt-1">{t('login.subtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{t('login.heading')}</h2>
            <button
              onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
              className="text-xs font-medium text-gray-400 hover:text-primary-600 border border-gray-200 rounded px-2 py-1 transition-colors"
            >
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
          </div>

          {serverError && (
            <div className="flex items-center gap-2 bg-danger-50 border border-danger-200 text-danger-700 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('login.email')}
              </label>
              <Input id="email" type="email" placeholder="you@example.com" autoComplete="email"
                error={!!errors.email} {...register('email')} />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('login.password')}
              </label>
              <div className="relative">
                <Input id="password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  autoComplete="current-password" error={!!errors.password}
                  className="pr-10" {...register('password')} />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPw ? t('login.password.hide') : t('login.password.show')}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" loading={isSubmitting}>
              {t('login.submit')}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">EduPlatform © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
