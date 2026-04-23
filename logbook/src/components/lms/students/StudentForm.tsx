'use client'
import { useState, useEffect } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateStudent, useUpdateStudent } from '@/lib/hooks/lms/useStudents'
import type { Student } from '@/types/lms'

interface StudentFormProps {
  open:        boolean
  onOpenChange: (v: boolean) => void
  student?:    Student | null  // pass to edit; omit to create
}

interface FormState {
  fullName:    string
  phone:       string
  email:       string
  password:    string
  dateOfBirth: string
  parentName:  string
  parentPhone: string
  address:     string
}

const empty: FormState = {
  fullName: '', phone: '', email: '', password: '',
  dateOfBirth: '', parentName: '', parentPhone: '', address: '',
}

export function StudentForm({ open, onOpenChange, student }: StudentFormProps) {
  const [form, setForm] = useState<FormState>(empty)
  const [showPassword, setShowPassword] = useState(false)
  const { mutate: create, isPending: creating } = useCreateStudent()
  const { mutate: update, isPending: updating }  = useUpdateStudent()

  const isEdit = !!student
  const isPending = creating || updating

  useEffect(() => {
    if (open) {
      setForm(student ? {
        fullName:    student.fullName,
        phone:       student.phone ?? '',
        email:       student.email ?? '',
        password:    '',
        dateOfBirth: student.dateOfBirth ?? '',
        parentName:  student.parentName ?? '',
        parentPhone: student.parentPhone ?? '',
        address:     (student as any).address ?? '',
      } : empty)
      setShowPassword(false)
    }
  }, [open, student])

  if (!open) return null

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName.trim()) return

    const dto = {
      fullName:    form.fullName.trim(),
      phone:       form.phone.trim() || undefined,
      email:       form.email.trim() || undefined,
      password:    !isEdit && form.password ? form.password : undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      parentName:  form.parentName.trim() || undefined,
      parentPhone: form.parentPhone.trim() || undefined,
      address:     form.address.trim() || undefined,
    }

    if (isEdit && student) {
      update({ id: student.id, data: dto }, { onSuccess: () => onOpenChange(false) })
    } else {
      create(dto, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Редактировать студента' : 'Новый студент'}
          </h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Полное имя <span className="text-danger-500">*</span>
            </label>
            <Input value={form.fullName} onChange={set('fullName')} placeholder="Иванов Иван Иванович" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <Input value={form.phone} onChange={set('phone')} placeholder="+7 (999) 000-00-00" type="tel" />
            </div>
            {(
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input value={form.email} onChange={set('email')} placeholder="student@example.com" type="email" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата рождения</label>
            <Input value={form.dateOfBirth} onChange={set('dateOfBirth')} type="date" />
          </div>

          {!isEdit && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Данные для входа</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Логин (Email) <span className="text-danger-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="student@example.com"
                    required={!isEdit}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Пароль <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={set('password')}
                      placeholder="Мин. 6 символов"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password.length > 0 && form.password.length < 6 && (
                    <p className="mt-1 text-xs text-danger-500">Минимум 6 символов</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Контакт родителя</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя родителя</label>
                <Input value={form.parentName} onChange={set('parentName')} placeholder="Иванова Мария" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон родителя</label>
                <Input value={form.parentPhone} onChange={set('parentPhone')} placeholder="+7 (999) 000-00-00" type="tel" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
            <Input value={form.address} onChange={set('address')} placeholder="Город, улица, дом" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit" className="flex-1" loading={isPending}
              disabled={
                !form.fullName.trim() ||
                (!isEdit && (!form.email.trim() || form.password.length < 6))
              }
            >
              {isEdit ? 'Сохранить' : 'Создать студента'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
