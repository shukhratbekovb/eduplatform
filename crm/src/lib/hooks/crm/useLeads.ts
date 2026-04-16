'use client'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { leadsApi, sourcesApi, usersApi } from '@/lib/api/crm/leads'
import { crmKeys } from '@/lib/api/crm/query-keys'
import { useCrmStore } from '@/lib/stores/useCrmStore'
import type { CreateLeadDto, UpdateLeadDto, MarkLeadLostDto, CreateActivityDto, CreateSourceDto, UpdateSourceDto } from '@/types/crm'

// ── Leads ──────────────────────────────────────────────────────────────────────
export function useLeads(funnelId?: string) {
  const filters = useCrmStore((s) => s.leadsFilters)
  const params = { ...filters, limit: 200, ...(funnelId ? { funnelId } : {}) }
  return useQuery({
    queryKey: crmKeys.leads(params),
    queryFn:  () => leadsApi.list(params),
    staleTime: 30_000,
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: crmKeys.lead(id),
    queryFn:  () => leadsApi.get(id),
    enabled:  !!id,
    staleTime: 30_000,
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateLeadDto) => leadsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
      toast.success('Лид создан')
    },
    onError: () => toast.error('Не удалось создать лид'),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateLeadDto }) =>
      leadsApi.update(id, dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: crmKeys.lead(id) })
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
    },
    onError: () => toast.error('Не удалось обновить лид'),
  })
}

export function useMoveLeadStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leadId, stageId }: { leadId: string; stageId: string }) =>
      leadsApi.moveStage(leadId, { stageId }),

    onMutate: async ({ leadId, stageId }) => {
      await qc.cancelQueries({ queryKey: ['crm', 'leads'] })
      const snapshots = qc.getQueriesData<{ data: any[] }>({ queryKey: ['crm', 'leads'] })
      qc.setQueriesData<{ data: any[] }>({ queryKey: ['crm', 'leads'] }, (old) => {
        if (!old?.data) return old
        return { ...old, data: old.data.map((l) => l.id === leadId ? { ...l, stageId } : l) }
      })
      return { snapshots }
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error('Не удалось переместить лид')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['crm', 'leads'] }),
  })
}

export function useMarkLeadWon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (leadId: string) => leadsApi.markWon(leadId),
    onSuccess: (_data, leadId) => {
      qc.invalidateQueries({ queryKey: crmKeys.lead(leadId) })
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
      toast.success('Лид отмечен как Won')
    },
    onError: () => toast.error('Не удалось изменить статус'),
  })
}

export function useMarkLeadLost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leadId, dto }: { leadId: string; dto: MarkLeadLostDto }) =>
      leadsApi.markLost(leadId, dto),
    onSuccess: (_data, { leadId }) => {
      qc.invalidateQueries({ queryKey: crmKeys.lead(leadId) })
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
      toast.success('Лид отмечен как Lost')
    },
    onError: () => toast.error('Не удалось изменить статус'),
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
      toast.success('Лид удалён')
    },
    onError: () => toast.error('Не удалось удалить лид'),
  })
}

// ── Timeline ───────────────────────────────────────────────────────────────────
export function useTimeline(leadId: string) {
  return useInfiniteQuery({
    queryKey:    crmKeys.timeline(leadId),
    queryFn:     ({ pageParam = 1 }) => leadsApi.timeline(leadId, pageParam as number),
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
    initialPageParam: 1,
    enabled:     !!leadId,
    staleTime:   15_000,
  })
}

export function useCreateActivity(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateActivityDto) => leadsApi.createActivity(leadId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.timeline(leadId) })
      toast.success('Активность записана')
    },
    onError: () => toast.error('Не удалось записать активность'),
  })
}

export function useCreateComment(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => leadsApi.createComment(leadId, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.timeline(leadId) }),
    onError: () => toast.error('Не удалось добавить комментарий'),
  })
}

export function useDeleteComment(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => leadsApi.deleteComment(leadId, commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.timeline(leadId) }),
    onError: () => toast.error('Не удалось удалить комментарий'),
  })
}

// ── CRM Users / Managers ───────────────────────────────────────────────────────
export function useManagers() {
  return useQuery({
    queryKey: crmKeys.managers(),
    queryFn:  usersApi.list,
    staleTime: 10 * 60_000,
  })
}

export function useCreateCrmUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: import('@/lib/api/crm/leads').CreateCrmUserDto) => usersApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.managers() })
      toast.success('Менеджер добавлен')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Не удалось создать'),
  })
}

export function useUpdateCrmUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: import('@/lib/api/crm/leads').UpdateCrmUserDto }) =>
      usersApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.managers() })
      toast.success('Сохранено')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Не удалось обновить'),
  })
}

// ── Sources ────────────────────────────────────────────────────────────────────
export function useSources() {
  return useQuery({
    queryKey: crmKeys.sources(),
    queryFn:  sourcesApi.list,
    staleTime: 5 * 60_000,
  })
}

export function useCreateSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateSourceDto) => sourcesApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.sources() })
      toast.success('Источник создан')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Не удалось создать источник'
      toast.error(msg)
    },
  })
}

export function useUpdateSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSourceDto }) =>
      sourcesApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.sources() }),
    onError:   () => toast.error('Не удалось обновить источник'),
  })
}

export function useDeleteSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sourcesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.sources() })
      toast.success('Источник удалён')
    },
    onError: () => toast.error('Не удалось удалить источник'),
  })
}
