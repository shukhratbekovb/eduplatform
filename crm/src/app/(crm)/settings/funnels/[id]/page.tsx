'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, GripVertical, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useFunnel, useCustomFields } from '@/lib/hooks/crm/useFunnels'
import { StageList } from '@/components/crm/settings/StageList'
import { CustomFieldForm } from '@/components/crm/settings/CustomFieldForm'
import { funnelsApi } from '@/lib/api/crm/funnels'
import { useQueryClient } from '@tanstack/react-query'
import { crmKeys } from '@/lib/api/crm/query-keys'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'
import type { CustomField } from '@/types/crm'
import type { CustomFieldFormValues } from '@/lib/validators/crm/funnel.schema'

export default function FunnelDetailPage() {
  const t  = useT()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const qc = useQueryClient()

  const { data: funnel, isLoading } = useFunnel(id)
  const { data: fields = [] }       = useCustomFields(id)

  // Create field modal
  const [fieldModal,   setFieldModal]   = useState(false)
  const [savingField,  setSavingField]  = useState(false)

  // Edit field modal
  const [editField,    setEditField]    = useState<CustomField | null>(null)
  const [savingEdit,   setSavingEdit]   = useState(false)

  // Delete field confirmation
  const [deleteField,  setDeleteField]  = useState<CustomField | null>(null)
  const [deletingField, setDeletingField] = useState(false)

  const fieldTypeLabel: Record<string, string> = {
    text:        t('settings.fields.type.text'),
    number:      t('settings.fields.type.number'),
    date:        t('settings.fields.type.date'),
    select:      t('settings.fields.type.select'),
    multiselect: t('settings.fields.type.multiselect'),
    checkbox:    t('settings.fields.type.checkbox'),
  }

  const handleCreateField = async (values: CustomFieldFormValues) => {
    setSavingField(true)
    try {
      await funnelsApi.fields.create(id, values as any)
      qc.invalidateQueries({ queryKey: crmKeys.customFields(id) })
      setFieldModal(false)
      toast.success(t('settings.fields.toast.added'))
    } catch {
      toast.error(t('settings.fields.toast.addError'))
    } finally {
      setSavingField(false)
    }
  }

  const handleEditField = async (values: CustomFieldFormValues) => {
    if (!editField) return
    setSavingEdit(true)
    try {
      await funnelsApi.fields.update(id, editField.id, values as any)
      qc.invalidateQueries({ queryKey: crmKeys.customFields(id) })
      setEditField(null)
      toast.success(t('settings.fields.toast.updated'))
    } catch {
      toast.error(t('settings.fields.toast.updateError'))
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteField = async () => {
    if (!deleteField) return
    setDeletingField(true)
    try {
      await funnelsApi.fields.delete(id, deleteField.id)
      qc.invalidateQueries({ queryKey: crmKeys.customFields(id) })
      setDeleteField(null)
      toast.success(t('settings.fields.toast.deleted'))
    } catch {
      toast.error(t('settings.fields.toast.deleteError'))
    } finally {
      setDeletingField(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('settings.funnel.back')}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-900">{funnel?.name}</h1>
        {funnel?.isArchived && <Badge variant="default">{t('settings.funnels.status.archived')}</Badge>}
      </div>
      <p className="text-sm text-gray-500 mb-8">{t('settings.funnel.subtitle2')}</p>

      {/* ── Stages ──────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('settings.funnel.stages.title')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('settings.funnel.stages.hint')}</p>
          </div>
        </div>
        <StageList funnelId={id} />
      </section>

      {/* ── Custom Fields ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('settings.fields.title')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('settings.fields.hint')}</p>
          </div>
          <Button size="sm" onClick={() => setFieldModal(true)}>
            <Plus className="w-4 h-4" />
            {t('settings.fields.addBtn')}
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-md py-10 text-center">
            <p className="text-sm text-gray-400">{t('settings.fields.empty')}</p>
            <button
              onClick={() => setFieldModal(true)}
              className="mt-2 text-sm text-primary-600 hover:underline"
            >
              {t('settings.fields.addFirst')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field) => (
              <div
                key={field.id}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-md px-4 py-3 group"
              >
                <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                <span className="flex-1 text-sm font-medium text-gray-900">{field.label}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-sm">
                  {fieldTypeLabel[field.type] ?? field.type}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditField(field)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    aria-label={t('common.edit')}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteField(field)}
                    className="p-1.5 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded transition-colors"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create field modal */}
      <CustomFieldForm
        open={fieldModal}
        onOpenChange={setFieldModal}
        onSubmit={handleCreateField}
        loading={savingField}
      />

      {/* Edit field modal */}
      <CustomFieldForm
        key={editField?.id ?? 'create'}
        open={!!editField}
        onOpenChange={(v) => !v && setEditField(null)}
        field={editField ?? undefined}
        onSubmit={handleEditField}
        loading={savingEdit}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteField}
        onOpenChange={(v) => !v && setDeleteField(null)}
        title={t('settings.fields.delete.title')}
        description={`${t('settings.fields.delete.descStart')}${deleteField?.label}${t('settings.fields.delete.descEnd')}`}
        confirmLabel={t('common.delete')}
        destructive
        loading={deletingField}
        onConfirm={handleDeleteField}
      />
    </div>
  )
}
