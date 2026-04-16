'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, GraduationCap, AlertCircle, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/crm/auth'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { apiClient } from '@/lib/api/axios'
import { demoAdapter } from '@/lib/demo/adapter'
import { DEMO_DIRECTOR, DEMO_TOKEN } from '@/lib/demo/data'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})
type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const t               = useT()
  const router          = useRouter()
  const setAuth         = useAuthStore((s) => s.setAuth)
  const enableDemo      = useAuthStore((s) => s.enableDemo)
  const isAuthenticated = useAuthStore((s) => !!s.token && !!s.user)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError]   = useState('')
  const [demoLoading, setDemoLoading]   = useState(false)

  useEffect(() => {
    if (isAuthenticated) router.replace('/leads')
  }, [isAuthenticated, router])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const handleDemoLogin = async () => {
    setDemoLoading(true)
    ;(apiClient.defaults as any).adapter = demoAdapter
    enableDemo(DEMO_DIRECTOR, DEMO_TOKEN)
    router.replace('/leads')
  }

  const onSubmit = async (values: LoginValues) => {
    setServerError('')
    try {
      const data = await authApi.login(values)
      setAuth(data.user, data.accessToken)
      router.replace('/leads')
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        setServerError(t('login.error.invalid'))
      } else {
        setServerError(t('login.error.server'))
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EduPlatform</h1>
          <p className="text-sm text-gray-500 mt-1">{t('login.subtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('login.heading')}</h2>

          {/* Server error */}
          {serverError && (
            <div className="flex items-center gap-2 bg-danger-50 border border-danger-200 text-danger-700 rounded-md px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
                {...register('email')}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('login.password')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? t('login.password.hide') : t('login.password.show')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              loading={isSubmitting}
            >
              {t('login.submit')}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">{t('login.or')}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Demo button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed text-sm font-medium transition-colors',
              'border-warning-300 text-warning-700 bg-warning-50 hover:bg-warning-100',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            <FlaskConical className="w-4 h-4" />
            {demoLoading ? t('login.demo.loading') : t('login.demo')}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          EduPlatform © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
