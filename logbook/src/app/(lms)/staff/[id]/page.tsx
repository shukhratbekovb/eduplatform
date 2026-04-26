'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, Cake, Pencil, KeyRound, BookOpen,
  Calendar, Plus, X, Copy, Check, Trash2, FolderOpen,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useIsDirectorOrMup } from '@/lib/stores/useAuthStore'
import { useSubjects, useDirections } from '@/lib/hooks/lms/useSettings'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'

// ── Hooks ────────────────────────────────────────────────────────────────────

function useStaffDetail(id: string) {
  return useQuery({
    queryKey: ['lms', 'staff', id],
    queryFn: () => apiClient.get(`/lms/users/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

function useUpdateStaff() {
  const t = useT()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      apiClient.patch(`/lms/users/${id}`, data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lms', 'staff', vars.id] })
      qc.invalidateQueries({ queryKey: ['lms', 'staff'] })
      toast.success(t('staff.dataUpdated'))
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || t('common.error')),
  })
}

function useResetPassword() {
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/lms/users/${id}/reset-password`).then((r) => r.data),
  })
}

function useBulkAssignSubjects() {
  const t = useT()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, subjectIds }: { userId: string; subjectIds: string[] }) =>
      apiClient.put(`/lms/users/${userId}/subjects`, { subjectIds }).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lms', 'staff', vars.userId] })
      toast.success(t('staff.subjectsAssigned'))
    },
    onError: () => toast.error(t('staff.subjectsAssignError')),
  })
}

function useUnassignSubject() {
  const t = useT()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, subjectId }: { userId: string; subjectId: string }) =>
      apiClient.delete(`/lms/users/${userId}/subjects/${subjectId}`).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lms', 'staff', vars.userId] })
      toast.success(t('staff.subjectRemoved'))
    },
    onError: () => toast.error(t('common.error')),
  })
}

// ── Config ───────────────────────────────────────────────────────────────────

const ROLE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  director:      'danger',
  mup:           'warning',
  teacher:       'success',
  sales_manager: 'default',
  cashier:       'default',
}

const ASSIGNABLE_ROLE_VALUES = ['teacher', 'mup', 'sales_manager', 'cashier', 'director']

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const canManage = useIsDirectorOrMup()
  const t = useT()

  const { data: detail, isLoading } = useStaffDetail(id)
  const { mutate: updateUser, isPending: saving } = useUpdateStaff()
  const { mutate: resetPw, isPending: resetting } = useResetPassword()
  const { mutate: bulkAssign } = useBulkAssignSubjects()
  const { mutate: unassignSubject } = useUnassignSubject()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', dateOfBirth: '', role: '' })
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)

  const d = detail as any
  const roleVariant = d ? ROLE_VARIANT[d.role] ?? 'default' : 'default'
  const roleLabel = d ? t(`role.${d.role}`) : ''

  const startEdit = () => {
    if (!d) return
    setForm({
      name: d.name, email: d.email,
      phone: d.phone || '', dateOfBirth: d.dateOfBirth || '', role: d.role,
    })
    setEditing(true)
  }

  const saveEdit = () => {
    const data: Record<string, any> = {}
    if (form.name !== d.name) data.name = form.name
    if (form.email !== d.email) data.email = form.email
    if (form.phone !== (d.phone || '')) data.phone = form.phone || null
    if (form.dateOfBirth !== (d.dateOfBirth || '')) data.dateOfBirth = form.dateOfBirth || null
    if (form.role !== d.role) data.role = form.role
    if (Object.keys(data).length === 0) { setEditing(false); return }
    updateUser({ id, data }, { onSuccess: () => setEditing(false) })
  }

  const handleResetPassword = () => {
    resetPw(id, {
      onSuccess: (data: any) => {
        setNewPassword(data.generatedPassword)
        toast.success(t('staff.passwordReset'))
      },
      onError: () => toast.error(t('common.error')),
    })
  }

  const copyPw = () => {
    if (!newPassword) return
    navigator.clipboard.writeText(newPassword)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading || !d) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        {t('staff.backToStaff')}
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        {editing ? (
          <EditForm form={form} setForm={setForm} saving={saving} onSave={saveEdit} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <div className="flex items-start gap-5">
              <UserAvatar name={d.name} src={d.avatarUrl} size="lg" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-bold text-gray-900">{d.name}</h1>
                  <Badge variant={roleVariant}>{roleLabel}</Badge>
                </div>

                <div className="space-y-1 mt-2">
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />{d.email}
                  </p>
                  {d.phone && (
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />{d.phone}
                    </p>
                  )}
                  {d.dateOfBirth && (
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Cake className="w-4 h-4 text-gray-400" />
                      {new Date(d.dateOfBirth).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={startEdit}>
                    <Pencil className="w-4 h-4" />
                    {t('common.edit')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleResetPassword} loading={resetting}>
                    <KeyRound className="w-4 h-4" />
                    {t('profile.resetPassword')}
                  </Button>
                </div>
              )}
            </div>

            {/* New password banner */}
            {newPassword && (
              <div className="mt-4 bg-warning-50 border border-warning-200 rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-warning-700">{t('profile.newPassword')}</p>
                  <code className="text-sm font-mono text-warning-900">{newPassword}</code>
                </div>
                <button onClick={copyPw} className="text-warning-600 hover:text-warning-800 p-1">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Teacher stats */}
      {d.role === 'teacher' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-gray-700">{t('staff.monthlyStats')}</h2>
          </div>
          <div className="bg-primary-50 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-primary-700">{d.lessonsThisMonth ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{t('staff.lessonsConducted')}</p>
          </div>
        </div>
      )}

      {/* Subjects grouped by direction */}
      {d.role === 'teacher' && (
        <SubjectsSection
          subjects={d.subjects ?? []}
          userId={id}
          canManage={canManage}
          showPicker={showSubjectPicker}
          onShowPicker={setShowSubjectPicker}
          onBulkAssign={(ids) => bulkAssign({ userId: id, subjectIds: ids })}
          onUnassign={(subjectId) => unassignSubject({ userId: id, subjectId })}
        />
      )}
    </div>
  )
}

// ── Edit form ────────────────────────────────────────────────────────────────

function EditForm({
  form, setForm, saving, onSave, onCancel,
}: {
  form: { name: string; email: string; phone: string; dateOfBirth: string; role: string }
  setForm: (fn: (f: typeof form) => typeof form) => void
  saving: boolean; onSave: () => void; onCancel: () => void
}) {
  const t = useT()
  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{t('staff.editing')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('staff.fullName')}</label>
          <Input value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('staff.email')}</label>
          <Input type="email" value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('staff.phone')}</label>
          <Input value={form.phone} onChange={set('phone')} placeholder={t('staff.phonePlaceholder')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('staff.dob')}</label>
          <DatePicker value={form.dateOfBirth} onChange={(v) => set('dateOfBirth')({ target: { value: v } } as any)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('staff.role')}</label>
          <select value={form.role} onChange={set('role')}
            className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white">
            {ASSIGNABLE_ROLE_VALUES.map((v) => <option key={v} value={v}>{t(`role.${v}`)}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button onClick={onSave} loading={saving}>{t('common.save')}</Button>
      </div>
    </div>
  )
}

// ── Subjects section (grouped by direction) ──────────────────────────────────

function SubjectsSection({
  subjects, userId, canManage, showPicker, onShowPicker, onBulkAssign, onUnassign,
}: {
  subjects: any[]; userId: string; canManage: boolean
  showPicker: boolean; onShowPicker: (v: boolean) => void
  onBulkAssign: (ids: string[]) => void; onUnassign: (id: string) => void
}) {
  const t = useT()
  // Group subjects by direction
  const grouped: Record<string, { directionName: string; items: any[] }> = {}
  for (const s of subjects) {
    const key = s.directionName || t('settings.noDirection')
    if (!grouped[key]) grouped[key] = { directionName: key, items: [] }
    grouped[key].items.push(s)
  }
  const dirEntries = Object.values(grouped)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary-500" />
          <h2 className="text-sm font-semibold text-gray-700">{t('staff.subjects')}</h2>
        </div>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => onShowPicker(true)}>
            <Plus className="w-4 h-4" />
            {t('staff.assign')}
          </Button>
        )}
      </div>

      {dirEntries.length > 0 ? (
        <div className="space-y-4">
          {dirEntries.map(({ directionName, items }) => (
            <div key={directionName}>
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{directionName}</h3>
              </div>
              <div className="space-y-1 ml-5">
                {items.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 group/item">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                      <span className="text-sm text-gray-900">{s.name}</span>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => onUnassign(s.id)}
                        className="p-1 text-gray-300 hover:text-danger-500 rounded opacity-0 group-hover/item:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">{t('staff.noSubjects')}</p>
      )}

      <AssignSubjectsDialog
        open={showPicker}
        onOpenChange={onShowPicker}
        assignedIds={subjects.map((s: any) => s.id)}
        onAssign={onBulkAssign}
      />
    </div>
  )
}

// ── Assign subjects dialog (direction → multiselect) ─────────────────────────

function AssignSubjectsDialog({
  open, onOpenChange, assignedIds, onAssign,
}: {
  open: boolean; onOpenChange: (v: boolean) => void
  assignedIds: string[]; onAssign: (ids: string[]) => void
}) {
  const t = useT()
  const { data: directions = [] } = useDirections()
  const { data: allSubjects = [] } = useSubjects()
  const [selectedDir, setSelectedDir] = useState<string>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const available = (allSubjects as any[]).filter((s: any) =>
    !assignedIds.includes(s.id) && s.isActive !== false
    && (!selectedDir || s.directionId === selectedDir)
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = () => {
    if (selected.size === 0) return
    onAssign(Array.from(selected))
    setSelected(new Set())
    setSelectedDir('')
    onOpenChange(false)
  }

  const handleClose = () => {
    setSelected(new Set())
    setSelectedDir('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('staff.assignSubjects')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Direction filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('staff.direction')}</label>
              <select
                value={selectedDir}
                onChange={(e) => { setSelectedDir(e.target.value); setSelected(new Set()) }}
                className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white"
              >
                <option value="">{t('staff.allDirections')}</option>
                {(directions as any[]).map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Subjects multiselect */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('staff.subjects')} {selected.size > 0 && <span className="text-primary-600">({selected.size} {t('staff.selected')})</span>}
              </label>
              {available.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {selectedDir ? t('staff.noSubjectsInDirection') : t('staff.allSubjectsAssigned')}
                </p>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {available.map((s: any) => {
                    const checked = selected.has(s.id)
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          checked ? 'bg-primary-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(s.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-900">{s.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={selected.size === 0}>
            {t('staff.assign')} ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
