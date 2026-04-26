'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, BookOpen, Search, Users, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useGroups, useArchiveGroup } from '@/lib/hooks/lms/useGroups'
import { useDirections } from '@/lib/hooks/lms/useSettings'
import { useIsDirectorOrMup, useCurrentUser } from '@/lib/stores/useAuthStore'
import { GroupForm } from '@/components/lms/groups/GroupForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils/dates'
import { useT } from '@/lib/i18n'
import type { Group } from '@/types/lms'

export default function GroupsPage() {
  const t        = useT()
  const user       = useCurrentUser()
  const canManage  = useIsDirectorOrMup()
  const isTeacher  = user?.role === 'teacher'

  const [search, setSearch]       = useState('')
  const [filterDir, setFilterDir] = useState('')
  const [showForm, setShowForm]   = useState(false)

  // Teacher's directions
  const { data: teacherDirs } = useQuery({
    queryKey: ['lms', 'teacher-directions', user?.id],
    queryFn: () => apiClient.get(`/lms/users/${user!.id}/directions`).then((r) => r.data as { id: string; name: string }[]),
    enabled: isTeacher && !!user?.id,
    staleTime: 10 * 60_000,
  })
  const { data: allDirections = [] } = useDirections()
  const directions = useMemo(
    () => isTeacher && teacherDirs ? teacherDirs : allDirections,
    [isTeacher, teacherDirs, allDirections],
  )

  // Build params for API
  const apiParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (isTeacher && user?.id) p.teacherId = user.id
    if (filterDir) p.directionId = filterDir
    return Object.keys(p).length ? p : undefined
  }, [isTeacher, user?.id, filterDir])

  const { data: groups = [], isLoading } = useGroups(apiParams)
  const { mutate: archiveGroup }         = useArchiveGroup()

  const filtered = (groups as Group[]).filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          {t('groups.title')}
          <span className="ml-1 text-sm font-normal text-gray-400">({(groups as Group[]).length})</span>
        </h1>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            {t('groups.create')}
          </Button>
        )}
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('groups.search')}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterDir}
          onChange={(e) => setFilterDir(e.target.value)}
          className="h-10 border border-gray-300 rounded text-sm px-3 text-gray-700 focus:outline-none focus:border-primary-500 bg-white"
        >
          <option value="">{t('groups.allDirections')}</option>
          {(directions as any[]).map((d: any) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title={t('groups.notFound')} description={t('common.tryChangeFilters')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}

      <GroupForm open={showForm} onOpenChange={setShowForm} />
    </div>
  )
}

function GroupCard({ group }: { group: Group }) {
  const t = useT()
  return (
    <Link
      href={`/groups/${group.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all group/card"
    >
      <h3 className="font-semibold text-gray-900 group-hover/card:text-primary-700 transition-colors mb-0.5">
        {group.name}
      </h3>
      {group.directionName && (
        <p className="text-xs text-gray-500 mb-2">{group.directionName}</p>
      )}

      <div className="space-y-1 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>{group.studentCount ?? 0} {t('groups.students')}</span>
        </div>
        {(group.startDate || group.endDate) && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(group.startDate)} – {formatDate(group.endDate)}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
