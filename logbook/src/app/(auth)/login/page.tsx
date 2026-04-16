'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, GraduationCap, AlertCircle, FlaskConical, LayoutDashboard, Users, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/lms/auth'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { apiClient } from '@/lib/api/axios'
import { demoAdapter } from '@/lib/demo/adapter'
import { DEMO_DIRECTOR, DEMO_MUP, DEMO_TEACHER_1, DEMO_TOKEN } from '@/lib/demo/data'
import { cn } from '@/lib/utils/cn'
import type { User } from '@/types/lms'

const loginSchema = z.object({
  email:    z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
})
type LoginValues = z.infer<typeof loginSchema>

const demoRoles = [
  {
    user:  DEMO_DIRECTOR,
    icon:  LayoutDashboard,
    label: 'Директор',
    desc:  'Полный доступ: расписание, студенты, аналитика, компенсации',
    color: 'border-primary-300 text-primary-700 bg-primary-50 hover:bg-primary-100',
  },
  {
    user:  DEMO_MUP,
    icon:  Users,
    label: 'МУП',
    desc:  'Академический менеджер: расписание, запросы, задачи, аналитика',
    color: 'border-success-500/40 text-success-700 bg-success-50 hover:bg-success-50/80',
  },
  {
    user:  DEMO_TEACHER_1,
    icon:  BookOpen,
    label: 'Преподаватель',
    desc:  'Свои группы и уроки: посещаемость, оценки, домашние задания',
    color: 'border-warning-300 text-warning-700 bg-warning-50 hover:bg-warning-100',
  },
]

export default function LoginPage() {
  const router          = useRouter()
  const setAuth         = useAuthStore((s) => s.setAuth)
  const enableDemo      = useAuthStore((s) => s.enableDemo)
  const isAuthenticated = useAuthStore((s) => !!s.token && !!s.user)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError]   = useState('')
  const [demoLoading, setDemoLoading]   = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) router.replace('/schedule')
  }, [isAuthenticated, router])

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const handleDemoLogin = (user: User) => {
    setDemoLoading(user.role)
    ;(apiClient.defaults as any).adapter = demoAdapter
    enableDemo(user, DEMO_TOKEN)
    router.replace('/schedule')
  }

  const onSubmit = async (values: LoginValues) => {
    setServerError('')
    try {
      const data = await authApi.login(values)
      setAuth(data.user, data.accessToken)
      router.replace('/schedule')
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        setServerError('Неверный email или пароль')
      } else {
        setServerError('Ошибка сервера. Попробуйте позже.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EduPlatform</h1>
          <p className="text-sm text-gray-500 mt-1">LMS — Система управления обучением</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Войти в систему</h2>

          {serverError && (
            <div className="flex items-center gap-2 bg-danger-50 border border-danger-200 text-danger-700 rounded-md px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <Input
                id="email" type="email" placeholder="you@school.ru"
                autoComplete="email" error={!!errors.email}
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-danger-500">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" autoComplete="current-password"
                  error={!!errors.password} className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-danger-500">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" loading={isSubmitting}>
              Войти
            </Button>
          </form>
        </div>

        {/* Demo roles */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="w-4 h-4 text-warning-500" />
            <span className="text-sm font-semibold text-gray-700">Демо-режим — выберите роль</span>
          </div>
          <div className="space-y-2">
            {demoRoles.map(({ user, icon: Icon, label, desc, color }) => (
              <button
                key={user.role}
                type="button"
                onClick={() => handleDemoLogin(user)}
                disabled={demoLoading !== null}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 rounded-lg border-2 text-left transition-colors',
                  color,
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold leading-none mb-1">
                    {demoLoading === user.role ? 'Загрузка…' : label}
                  </p>
                  <p className="text-xs opacity-75 leading-snug">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          EduPlatform © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
