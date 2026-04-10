'use client'
import { useState } from 'react'
import { Pencil, Trash2, Check, X, MessageCircle } from 'lucide-react'
import { UserAvatar } from '@/components/ui/avatar'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatRelativeDate } from '@/lib/utils/dates'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { apiClient } from '@/lib/api/axios'
import { useQueryClient } from '@tanstack/react-query'
import { crmKeys } from '@/lib/api/crm/query-keys'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { LeadComment } from '@/types/crm'

interface TimelineCommentProps {
  comment: LeadComment
  leadId: string
}

export function TimelineComment({ comment, leadId }: TimelineCommentProps) {
  const currentUser    = useAuthStore((s) => s.user)
  const isOwn          = currentUser?.id === comment.authorId
  const qc             = useQueryClient()

  const [editing, setEditing]   = useState(false)
  const [text, setText]         = useState(comment.text)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const invalidate = () => qc.invalidateQueries({ queryKey: crmKeys.timeline(leadId) })

  const saveEdit = async () => {
    if (!text.trim() || text === comment.text) { setEditing(false); return }
    setSaving(true)
    try {
      await apiClient.patch(`/crm/leads/${leadId}/comments/${comment.id}`, { text })
      invalidate()
      toast.success('Комментарий обновлён')
    } catch {
      toast.error('Не удалось обновить')
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await apiClient.delete(`/crm/leads/${leadId}/comments/${comment.id}`)
      invalidate()
      toast.success('Комментарий удалён')
    } catch {
      toast.error('Не удалось удалить')
    } finally {
      setDeleting(false)
      setConfirmDel(false)
    }
  }

  return (
    <>
      <div className="flex gap-3 group">
        <div className="mt-0.5 w-7 h-7 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
          <MessageCircle className="w-3.5 h-3.5 text-gray-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserAvatar name={comment.author.name} size="sm" />
              <span className="text-sm font-medium text-gray-900">{comment.author.name}</span>
              <span className="text-xs text-gray-400">{formatRelativeDate(comment.createdAt)}</span>
            </div>

            {isOwn && !editing && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditing(true)}
                  className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  aria-label="Изменить"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirmDel(true)}
                  className="p-1 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded transition-colors"
                  aria-label="Удалить"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) saveEdit()
                  if (e.key === 'Escape') { setEditing(false); setText(comment.text) }
                }}
                rows={3}
                autoFocus
                className="w-full border border-primary-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-600 text-white hover:bg-primary-700 rounded transition-colors disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
                <button
                  onClick={() => { setEditing(false); setText(comment.text) }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Удалить комментарий?"
        description="Это действие нельзя отменить."
        confirmLabel="Удалить"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  )
}
