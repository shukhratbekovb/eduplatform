'use client'
import { useState } from 'react'
import { Settings, Plus, Pencil, Trash2, Banknote } from 'lucide-react'
import {
  useDirections, useCreateDirection, useUpdateDirection, useDeleteDirection,
  useSubjects,   useCreateSubject,   useUpdateSubject,   useDeleteSubject,
  useRooms,      useCreateRoom,      useUpdateRoom,      useDeleteRoom,
} from '@/lib/hooks/lms/useSettings'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { Direction, Subject, Room } from '@/types/lms'
import { cn } from '@/lib/utils/cn'

const DIRECTION_COLORS = [
  '#4F46E5', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#6366F1', '#14B8A6', '#F97316',
]

export default function SettingsPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-primary-600" />
        <h1 className="text-xl font-semibold text-gray-900">Настройки</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <Tabs defaultValue="directions">
          <div className="px-4 border-b border-gray-200">
            <TabsList className="border-none">
              <TabsTrigger value="directions">Направления</TabsTrigger>
              <TabsTrigger value="subjects">Предметы</TabsTrigger>
              <TabsTrigger value="rooms">Кабинеты</TabsTrigger>
              <TabsTrigger value="pricing">Цены на курсы</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="directions" className="p-4">
            <DirectionsTab />
          </TabsContent>

          <TabsContent value="subjects" className="p-4">
            <SubjectsTab />
          </TabsContent>

          <TabsContent value="rooms" className="p-4">
            <RoomsTab />
          </TabsContent>

          <TabsContent value="pricing" className="p-4">
            <PricingTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/* ─── Directions ─────────────────────────────────────────────────── */
function DirectionsTab() {
  const { data: directions = [], isLoading } = useDirections()
  const { mutate: create }  = useCreateDirection()
  const { mutate: update }  = useUpdateDirection()
  const { mutate: destroy } = useDeleteDirection()

  const [form, setForm]       = useState<{ name: string; color: string } | null>(null)
  const [editId, setEditId]   = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openCreate = () => { setEditId(null); setForm({ name: '', color: DIRECTION_COLORS[0] }) }
  const openEdit   = (d: Direction) => { setEditId(d.id); setForm({ name: d.name, color: d.color }) }

  const handleSave = () => {
    if (!form?.name.trim()) return
    if (editId) {
      update({ id: editId, data: form }, { onSuccess: () => setForm(null) })
    } else {
      create(form, { onSuccess: () => setForm(null) })
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" />Добавить</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {(directions as Direction[]).map((d) => (
            <div key={d.id} className="flex items-center justify-between p-3 rounded-md border border-gray-100 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-sm font-medium text-gray-900">{d.name}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(d)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteId(d.id)} className="p-1.5 text-gray-400 hover:text-danger-500 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {directions.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Нет направлений</p>}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? 'Редактировать' : 'Новое'} направление</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Название *</label>
                <Input
                  value={form?.name ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : f)}
                  placeholder="Например: IT"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Цвет</label>
                <div className="flex gap-2 flex-wrap">
                  {DIRECTION_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((f) => f ? { ...f, color: c } : f)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form?.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setForm(null)}>Отмена</Button>
            <Button onClick={handleSave} disabled={!form?.name.trim()}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Удалить направление?"
        description="Это действие нельзя отменить. Все связанные группы будут затронуты."
        variant="danger"
        onConfirm={() => { if (deleteId) destroy(deleteId); setDeleteId(null) }}
        onOpenChange={(o) => { if (!o) setDeleteId(null) }}
      />
    </div>
  )
}

/* ─── Subjects ───────────────────────────────────────────────────── */
function SubjectsTab() {
  const { data: subjects = [], isLoading } = useSubjects()
  const { mutate: create }  = useCreateSubject()
  const { mutate: update }  = useUpdateSubject()
  const { mutate: destroy } = useDeleteSubject()

  const [filterDir, setFilterDir] = useState('')
  const [form, setForm]       = useState<{ name: string; directionId?: string } | null>(null)
  const [editId, setEditId]   = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { data: directions = [] } = useDirections()

  const openCreate = () => { setEditId(null); setForm({ name: '' }) }
  const openEdit   = (s: Subject) => { setEditId(s.id); setForm({ name: s.name, directionId: (s as any).directionId }) }

  const handleSave = () => {
    if (!form?.name.trim()) return
    if (editId) {
      update({ id: editId, data: form as any }, { onSuccess: () => setForm(null) })
    } else {
      create(form as any, { onSuccess: () => setForm(null) })
    }
  }

  const filtered = filterDir
    ? (subjects as Subject[]).filter((s) => s.directionId === filterDir)
    : (subjects as Subject[])

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <select
          value={filterDir}
          onChange={(e) => setFilterDir(e.target.value)}
          className="h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-primary-500 bg-white"
        >
          <option value="">Все направления</option>
          {(directions as Direction[]).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" />Добавить</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-md border border-gray-100 hover:bg-gray-50">
              <div>
                <span className="text-sm font-medium text-gray-900">{s.name}</span>
                {s.direction && <span className="ml-2 text-xs text-gray-400">{s.direction.name}</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteId(s.id)} className="p-1.5 text-gray-400 hover:text-danger-500 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Нет предметов</p>}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? 'Редактировать' : 'Новый'} предмет</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Название *</label>
                <Input
                  value={form?.name ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : f)}
                  placeholder="Например: Математика"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Направление</label>
                <select
                  value={form?.directionId ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, directionId: e.target.value || undefined } : f)}
                  className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white"
                >
                  <option value="">Без направления</option>
                  {(directions as Direction[]).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setForm(null)}>Отмена</Button>
            <Button onClick={handleSave} disabled={!form?.name.trim()}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Удалить предмет?"
        description="Это действие нельзя отменить."
        variant="danger"
        onConfirm={() => { if (deleteId) destroy(deleteId); setDeleteId(null) }}
        onOpenChange={(o) => { if (!o) setDeleteId(null) }}
      />
    </div>
  )
}

/* ─── Rooms ──────────────────────────────────────────────────────── */
function RoomsTab() {
  const { data: rooms = [], isLoading } = useRooms()
  const { mutate: create }  = useCreateRoom()
  const { mutate: update }  = useUpdateRoom()
  const { mutate: destroy } = useDeleteRoom()

  const [form, setForm]       = useState<{ name: string; capacity?: number } | null>(null)
  const [editId, setEditId]   = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openCreate = () => { setEditId(null); setForm({ name: '', capacity: undefined }) }
  const openEdit   = (r: Room) => { setEditId(r.id); setForm({ name: r.name, capacity: r.capacity ?? undefined }) }

  const handleSave = () => {
    if (!form?.name.trim()) return
    const payload = { name: form.name, capacity: form.capacity || undefined }
    if (editId) {
      update({ id: editId, data: payload }, { onSuccess: () => setForm(null) })
    } else {
      create(payload, { onSuccess: () => setForm(null) })
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" />Добавить</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {(rooms as Room[]).map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-md border border-gray-100 hover:bg-gray-50">
              <div>
                <span className="text-sm font-medium text-gray-900">{r.name}</span>
                {r.capacity && (
                  <span className="text-xs text-gray-400 ml-2">до {r.capacity} чел.</span>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-gray-400 hover:text-danger-500 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {rooms.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Нет кабинетов</p>}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? 'Редактировать' : 'Новый'} кабинет</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Название *</label>
                <Input
                  value={form?.name ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : f)}
                  placeholder="Например: Кабинет 101"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Вместимость</label>
                <Input
                  type="number"
                  value={form?.capacity ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, capacity: e.target.value ? Number(e.target.value) : undefined } : f)}
                  placeholder="Необязательно"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setForm(null)}>Отмена</Button>
            <Button onClick={handleSave} disabled={!form?.name.trim()}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Удалить кабинет?"
        description="Это действие нельзя отменить."
        variant="danger"
        onConfirm={() => { if (deleteId) destroy(deleteId); setDeleteId(null) }}
        onOpenChange={(o) => { if (!o) setDeleteId(null) }}
      />
    </div>
  )
}

/* ─── Pricing (Course Pricing) ───────────────────────────────────── */
function PricingTab() {
  const { data: directions = [], isLoading } = useDirections()
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [saved, setSaved]   = useState<Record<string, boolean>>({})

  const handleSave = (dirId: string) => {
    setSaved((prev) => ({ ...prev, [dirId]: true }))
    setTimeout(() => setSaved((prev) => ({ ...prev, [dirId]: false })), 2000)
  }

  if (isLoading) return <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}</div>

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Установите стоимость курса по каждому направлению (в тенге в месяц)</p>
      <div className="space-y-3">
        {(directions as Direction[]).map((dir) => (
          <div key={dir.id} className="flex items-center gap-4 p-3 rounded-md border border-gray-100">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: dir.color }} />
            <span className="text-sm font-medium text-gray-900 flex-1">{dir.name}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={prices[dir.id] ?? ''}
                onChange={(e) => setPrices((prev) => ({ ...prev, [dir.id]: e.target.value }))}
                placeholder="0 ₸"
                className="w-36 text-right"
              />
              <Button
                size="sm"
                variant={saved[dir.id] ? 'secondary' : 'primary' as any}
                onClick={() => handleSave(dir.id)}
                disabled={!prices[dir.id]}
              >
                {saved[dir.id] ? '✓ Сохранено' : 'Сохранить'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
