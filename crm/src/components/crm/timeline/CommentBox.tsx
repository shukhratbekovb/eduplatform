'use client'
import { useState, useRef } from 'react'
import { Send } from 'lucide-react'
import { UserAvatar } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useCreateComment } from '@/lib/hooks/crm/useLeads'

interface CommentBoxProps {
  leadId: string
}

export function CommentBox({ leadId }: CommentBoxProps) {
  const user    = useAuthStore((s) => s.user)
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { mutate: createComment, isPending } = useCreateComment(leadId)

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || isPending) return
    createComment(trimmed, { onSuccess: () => setText('') })
  }

  return (
    <div className="flex gap-3 pt-2">
      {user && <UserAvatar name={user.name} size="sm" className="mt-0.5 shrink-0" />}

      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) submit()
          }}
          rows={3}
          placeholder="Написать комментарий… (Ctrl+Enter для отправки)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-colors"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || isPending}
          className="absolute right-2 bottom-2.5 p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Отправить комментарий"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
