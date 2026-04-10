'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { funnelsApi } from '@/lib/api/crm/funnels'
import { crmKeys } from '@/lib/api/crm/query-keys'
import type { CreateFunnelDto, UpdateFunnelDto, CreateStageDto, UpdateStageDto, ReorderStagesDto } from '@/types/crm'

// ── Funnels ────────────────────────────────────────────────────────────────────
export function useFunnels() {
  return useQuery({
    queryKey: crmKeys.funnels(),
    queryFn:  funnelsApi.list,
    staleTime: 5 * 60_000,
  })
}

export function useFunnel(id: string) {
  return useQuery({
    queryKey: crmKeys.funnel(id),
    queryFn:  () => funnelsApi.get(id),
    enabled:  !!id,
    staleTime: 5 * 60_000,
  })
}

export function useCreateFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateFunnelDto) => funnelsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.funnels() })
      toast.success('Воронка создана')
    },
    onError: () => toast.error('Не удалось создать воронку'),
  })
}

export function useUpdateFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFunnelDto }) =>
      funnelsApi.update(id, dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: crmKeys.funnels() })
      qc.invalidateQueries({ queryKey: crmKeys.funnel(id) })
      toast.success('Воронка обновлена')
    },
    onError: () => toast.error('Не удалось обновить воронку'),
  })
}

export function useArchiveFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => funnelsApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.funnels() })
      toast.success('Воронка архивирована')
    },
    onError: () => toast.error('Не удалось архивировать воронку'),
  })
}

// ── Stages ─────────────────────────────────────────────────────────────────────
export function useStages(funnelId: string) {
  return useQuery({
    queryKey: crmKeys.stages(funnelId),
    queryFn:  () => funnelsApi.stages.list(funnelId),
    enabled:  !!funnelId,
    staleTime: 5 * 60_000,
  })
}

export function useCreateStage(funnelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateStageDto) => funnelsApi.stages.create(funnelId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.stages(funnelId) })
      toast.success('Этап добавлен')
    },
    onError: () => toast.error('Не удалось добавить этап'),
  })
}

export function useUpdateStage(funnelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ stageId, dto }: { stageId: string; dto: UpdateStageDto }) =>
      funnelsApi.stages.update(funnelId, stageId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.stages(funnelId) }),
    onError: () => toast.error('Не удалось обновить этап'),
  })
}

export function useDeleteStage(funnelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (stageId: string) => funnelsApi.stages.delete(funnelId, stageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.stages(funnelId) })
      toast.success('Этап удалён')
    },
    onError: () => toast.error('Не удалось удалить этап'),
  })
}

export function useReorderStages(funnelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: ReorderStagesDto) => funnelsApi.stages.reorder(funnelId, dto),
    onMutate: async ({ orderedIds }) => {
      await qc.cancelQueries({ queryKey: crmKeys.stages(funnelId) })
      const prev = qc.getQueryData(crmKeys.stages(funnelId))
      qc.setQueryData(crmKeys.stages(funnelId), (old: any[]) =>
        orderedIds.map((id, i) => {
          const s = old?.find((s) => s.id === id)
          return s ? { ...s, order: i } : s
        }).filter(Boolean)
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(crmKeys.stages(funnelId), ctx.prev)
      toast.error('Не удалось изменить порядок')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: crmKeys.stages(funnelId) }),
  })
}

// ── Custom Fields ──────────────────────────────────────────────────────────────
export function useCustomFields(funnelId: string) {
  return useQuery({
    queryKey: crmKeys.customFields(funnelId),
    queryFn:  () => funnelsApi.fields.list(funnelId),
    enabled:  !!funnelId,
    staleTime: 5 * 60_000,
  })
}
