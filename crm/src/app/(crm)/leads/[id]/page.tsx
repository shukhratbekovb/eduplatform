'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Pencil, Trophy, XCircle, Trash2,
  Phone, Mail, User2, Calendar, Tag, GitBranch,
} from 'lucide-react'
import { useLead, useUpdateLead, useMarkLeadWon, useMarkLeadLost, useDeleteLead } from '@/lib/hooks/crm/useLeads'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/ui/avatar'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LeadForm } from '@/components/crm/leads/LeadForm'
import { MarkLostDialog } from '@/components/crm/leads/MarkLostDialog'
import { LeadTimeline } from '@/components/crm/timeline/LeadTimeline'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { useFunnels, useStages, useCustomFields } from '@/lib/hooks/crm/useFunnels'
import { useSources } from '@/lib/hooks/crm/useLeads'
import { useIsDirector } from '@/lib/stores/useAuthStore'
import { CustomFieldDisplay } from '@/components/crm/leads/CustomFieldDisplay'
import { useT } from '@/lib/i18n'
import { toast } from 'sonner'
import type { LeadStatus } from '@/types/crm'

const statusVariant: Record<LeadStatus, 'active' | 'won' | 'lost'> = {
  active: 'active',
  won:    'won',
  lost:   'lost',
}
const statusLabel: Record<LeadStatus, string> = {
  active: 'Активный',
  won:    'Won',
  lost:   'Lost',
}

export default function LeadDetailPage() {
  const params = useParams()
  const id     = (params?.id as string) ?? ''
  const router  = useRouter()
  const isDir   = useIsDirector()

  const { data: lead, isLoading }          = useLead(id)
  const { data: funnels = [] }             = useFunnels()
  const { data: stages  = [] }             = useStages(lead?.funnelId ?? '')
  const { data: sources = [] }             = useSources()
  const { data: customFieldDefs = [] }     = useCustomFields(lead?.funnelId ?? '')
  const { mutate: markWon }            = useMarkLeadWon()
  const { mutate: deleteLead, isPending: deleting } = useDeleteLead()

  const t = useT()

  const [editOpen, setEditOpen]       = useState(false)
  const [lostOpen, setLostOpen]       = useState(false)
  const [deleteOpen, setDeleteOpen]   = useState(false)

  const activeFunnels = funnels.filter((f) => !f.isArchived)

  const handleMarkWon = () => {
    markWon(id, { onSuccess: () => toast.success(t('leads.toast.won')) })
  }

  const handleDelete = () => {
    deleteLead(id, {
      onSuccess: () => {
        toast.success(t('lead.toast.deleted'))
        router.push('/leads')
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }
  if (!lead) {
    return <p className="text-sm text-gray-500">{t('lead.notFound')}</p>
  }

  // Only show custom fields that are defined in the funnel schema
  const customFieldEntries = customFieldDefs
    .slice()
    .sort((a, b) => a.order - b.order)

  return (
    <div className="max-w-3xl">
      {/* Back */}
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('lead.back')}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{lead.fullName}</h1>
            <Badge variant={statusVariant[lead.status]}>{statusLabel[lead.status]}</Badge>
            {lead.stage && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded text-white"
                style={{ backgroundColor: lead.stage.color ?? '#6366F1' }}
              >
                {lead.stage.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
            {lead.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {lead.phone}
              </span>
            )}
            {lead.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {lead.email}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {lead.status === 'active' && (
            <>
              <Button size="sm" variant="secondary" onClick={handleMarkWon}>
                <Trophy className="w-3.5 h-3.5" />
                Won
              </Button>
              <Button size="sm" variant="danger" onClick={() => setLostOpen(true)}>
                <XCircle className="w-3.5 h-3.5" />
                Lost
              </Button>
            </>
          )}
          <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />
            {t('lead.edit')}
          </Button>
          {isDir && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
              className="text-danger-500 hover:bg-danger-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t('lead.tab.info')}</TabsTrigger>
          <TabsTrigger value="timeline">{t('lead.tab.timeline')}</TabsTrigger>
        </TabsList>

        {/* ── Info Tab ─────────────────────────────────────── */}
        <TabsContent value="info">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            {/* Core fields */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t('lead.section.main')}
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <InfoRow icon={User2} label={t('lead.field.assignee')} value={lead.assignee?.name ?? '—'} />
                <InfoRow icon={Tag} label={t('lead.field.source')} value={lead.source?.name ?? '—'} />
                <InfoRow icon={GitBranch} label={t('lead.field.funnel')} value={lead.funnel?.name ?? '—'} />
                <InfoRow icon={Calendar} label={t('lead.field.createdAt')} value={formatDate(lead.createdAt)} />
                <InfoRow icon={Calendar} label={t('lead.field.updatedAt')} value={formatDate(lead.updatedAt)} />
                {lead.lastActivityAt && (
                  <InfoRow
                    icon={Calendar}
                    label={t('lead.field.lastActivity')}
                    value={formatDateTime(lead.lastActivityAt)}
                  />
                )}
              </dl>
            </div>

            {/* Lost reason */}
            {lead.status === 'lost' && lead.lostReason && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {t('lead.lostReason')}
                </h3>
                <p className="text-sm text-gray-700 bg-danger-50 border border-danger-100 rounded px-3 py-2">
                  {lead.lostReason}
                </p>
              </div>
            )}

            {/* Custom fields */}
            {customFieldEntries.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  {t('lead.section.customFields')}
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {customFieldEntries.map((fieldDef) => {
                    const rawValue = lead.customFields?.[fieldDef.id] ?? null
                    return (
                      <div
                        key={fieldDef.id}
                        className={fieldDef.type === 'multiselect' ? 'sm:col-span-2' : ''}
                      >
                        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {fieldDef.label}
                        </dt>
                        <dd>
                          <CustomFieldDisplay field={fieldDef} value={rawValue} />
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Timeline Tab ─────────────────────────────────── */}
        <TabsContent value="timeline">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <LeadTimeline leadId={id} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <LeadForm
        open={editOpen}
        onOpenChange={setEditOpen}
        lead={lead}
        defaultFunnelId={lead.funnelId}
        funnels={activeFunnels}
        stages={stages}
        sources={sources}
        managers={[]}
      />

      <MarkLostDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        leadId={id}
        leadName={lead.fullName}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('lead.delete.title')}
        description={`${t('lead.delete.descStart')}${lead.fullName}${t('lead.delete.descEnd')}`}
        confirmLabel={t('lead.delete.confirmLabel')}
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-gray-500 text-xs mb-0.5">{label}</dt>
        <dd className="font-medium text-gray-900 truncate">{value}</dd>
      </div>
    </div>
  )
}
