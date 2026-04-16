'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, BookOpen, Search, Users, Calendar } from 'lucide-react'
import { useGroups, useArchiveGroup } from '@/lib/hooks/lms/useGroups'
import { useDirections, useSubjects, useLmsUsers } from '@/lib/hooks/lms/useSettings'
import { useIsDirectorOrMup, useCurrentUser } from '@/lib/stores/useAuthStore'
import { GroupForm } from '@/components/lms/groups/GroupForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import type { Group } from '@/types/lms'

export default function GroupsPage() {
  const user       = useCurrentUser()
  const isTeacher  = user?.role === 'teacher'
  const canManage  = useIsDirectorOrMup()

  const params = isTeacher ? { teacherId: user?.id } : undefined
  const { data: groups = [], isLoading } = useGroups(params as any)
  const { data: directions = [] }        = useDirections()
  const { data: subjects = [] }          = useSubjects()
  const { data: allUsers = [] }          = useLmsUsers()
  const { mutate: archiveGroup }         = useArchiveGroup()

  const [search, setSearch]       = useState('')
  const [filterDir, setFilterDir] = useState('')
  const [showForm, setShowForm]   = useState(false)

  // Build lookup maps
  const subjectMap   = useMemo(() => new Map((subjects as any[]).map((s: any) => [s.id, s])), [subjects])
  const teacherMap   = useMemo(() => new Map((allUsers as any[]).map((u: any) => [u.id, u])), [allUsers])

  const filtered = (groups as Group[]).filter((g) => {
    const matchName = g.name.toLowerCase().includes(search.toLowerCase())
    return matchName
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          Группы
          <span className="ml-1 text-sm font-normal text-gray-400">({(groups as Group[]).length})</span>
        </h1>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Создать группу
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Поиск по названию…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="Группы не найдены" description="Попробуйте изменить фильтры" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group: any) => {
            const subject = subjectMap.get(group.subjectId)
            const teacher = teacherMap.get(group.teacherId)
            return (
              <GroupCard
                key={group.id}
                group={group}
                subjectName={subject?.name}
                teacherName={teacher?.name}
                canManage={canManage}
                onArchive={() => archiveGroup(group.id)}
              />
            )
          })}
        </div>
      )}

      <GroupForm open={showForm} onOpenChange={setShowForm} />
    </div>
  )
}

function GroupCard({
  group, subjectName, teacherName, canManage, onArchive,
}: {
  group: any; subjectName?: string; teacherName?: string;
  canManage: boolean; onArchive: () => void;
}) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all group"
    >
      <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors mb-1">
        {group.name}
      </h3>
      {subjectName && <p className="text-sm text-gray-500 mb-3">{subjectName}</p>}

      <div className="space-y-1 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>
            {group.studentCount ?? 0} студентов
            {teacherName && ` · ${teacherName.split(' ')[0]}`}
          </span>
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
