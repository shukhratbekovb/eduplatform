'use client'
import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Check, X, Pencil } from 'lucide-react'
import { StageColorPicker } from './StageColorPicker'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { cn } from '@/lib/utils/cn'
import type { Stage } from '@/types/crm'

interface StageItemProps {
  stage: Stage
  onUpdate: (stageId: string, data: { name: string; color: string; winProbability: number }) => void
  onDelete: (stageId: string) => void
  isDeleting?: boolean
}

export function StageItem({ stage, onUpdate, onDelete, isDeleting }: StageItemProps) {
  const [editing, setEditing]       = useState(false)
  const [name, setName]             = useState(stage.name)
  const [color, setColor]           = useState(stage.color)
  const [prob, setProb]             = useState(stage.winProbability)
  const [confirmDel, setConfirmDel] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: stage.id })

  useEffect(() => {
    if (editing) nameRef.current?.focus()
  }, [editing])

  const save = () => {
    onUpdate(stage.id, { name, color, winProbability: prob })
    setEditing(false)
  }

  const cancel = () => {
    setName(stage.name)
    setColor(stage.color)
    setProb(stage.winProbability)
    setEditing(false)
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn(
          'bg-white border border-gray-200 rounded-md group',
          isDragging && 'opacity-50 shadow-drag z-50',
          editing && 'ring-2 ring-primary-200 border-primary-300'
        )}
      >
        {editing ? (
          /* Edit mode */
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-gray-200 shrink-0" />
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
                className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                placeholder="Название этапа"
              />
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="number"
                  value={prob}
                  onChange={(e) => setProb(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-14 border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                  min={0} max={100}
                />
                <span>%</span>
              </div>
            </div>
            <div className="pl-7">
              <p className="text-xs text-gray-500 mb-2">Цвет этапа</p>
              <StageColorPicker value={color} onChange={setColor} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors">
                <X className="w-3 h-3" /> Отмена
              </button>
              <button onClick={save} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-600 text-white hover:bg-primary-700 rounded transition-colors">
                <Check className="w-3 h-3" /> Сохранить
              </button>
            </div>
          </div>
        ) : (
          /* View mode */
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 transition-colors touch-none"
              aria-label="Перетащить"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
            <span className="flex-1 text-sm font-medium text-gray-900">{stage.name}</span>
            <span className="text-xs text-gray-400 tabular-nums">{stage.winProbability}%</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                aria-label="Редактировать"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setConfirmDel(true)}
                className="p-1.5 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded transition-colors"
                aria-label="Удалить"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Удалить этап?"
        description={`Этап «${stage.name}» будет удалён. Лиды в нём нужно сначала перенести.`}
        confirmLabel="Удалить"
        destructive
        loading={isDeleting}
        onConfirm={() => onDelete(stage.id)}
      />
    </>
  )
}
