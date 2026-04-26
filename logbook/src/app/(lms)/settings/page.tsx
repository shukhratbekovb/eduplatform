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
import { useT } from '@/lib/i18n'

const DIRECTION_COLORS = [
  '#4F46E5', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#6366F1', '#14B8A6', '#F97316',
]

export default function SettingsPage() {
  const t = useT()

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-primary-600" />
        <h1 className="text-xl font-semibold text-gray-900">{t('settings.title')}</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <Tabs defaultValue="directions">
          <div className="px-4 border-b border-gray-200">
            <TabsList className="border-none">
              <TabsTrigger value="directions">{t('settings.directions')}</TabsTrigger>
              <TabsTrigger value="subjects">{t('settings.subjects')}</TabsTrigger>
              <TabsTrigger value="rooms">{t('settings.rooms')}</TabsTrigger>
              <TabsTrigger value="pricing">{t('settings.prices')}</TabsTrigger>
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
  const t = useT()
  const { data: directions = [], isLoading } = useDirections()
  const { mutate: create }  = useCreateDirection()
  const { mutate: update }  = useUpdateDirection()
  const { mutate: destroy } = useDeleteDirection()

  const [form, setForm] = useState<{ name: string; description: string; color: string; durationMonths: string; totalLessons: string } | null>(null)
  const [editId, setEditId]   = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openCreate = () => { setEditId(null); setForm({ name: '', description: '', color: DIRECTION_COLORS[0], durationMonths: '', totalLessons: '' }) }
  const openEdit   = (d: Direction) => { setEditId(d.id); setForm({ name: d.name, description: d.description ?? '', color: d.color, durationMonths: String((d as any).durationMonths ?? ''), totalLessons: String((d as any).totalLessons ?? '') }) }

  const handleSave = () => {
    if (!form?.name.trim()) return
    const payload = {
      name: form.name, description: form.description || undefined, color: form.color,
      durationMonths: form.durationMonths ? Number(form.durationMonths) : undefined,
      totalLessons: form.totalLessons ? Number(form.totalLessons) : undefined,
    }
    if (editId) {
      update({ id: editId, data: payload as any }, { onSuccess: () => setForm(null) })
    } else {
      create(payload as any, { onSuccess: () => setForm(null) })
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" />{t('common.add')}</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {(directions as Direction[]).map((d) => (
            <div key={d.id} className="flex items-center justify-between p-3 rounded-md border border-gray-100 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <div>
                  <span className="text-sm font-medium text-gray-900">{d.name}</span>
                  {d.description && <p className="text-xs text-gray-400">{d.description}</p>}
                </div>
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
          {directions.length === 0 && <p className="text-sm text-gray-400 text-center py-8">{t('settings.noDirections')}</p>}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? t('settings.editDirection') : t('settings.newDirection')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.name')} *</label>
                <Input
                  value={form?.name ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : f)}
                  placeholder={t('settings.nameExample')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.description')}</label>
                <textarea
                  value={form?.description ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, description: e.target.value } : f)}
                  placeholder={t('settings.descPlaceholder')}
                  rows={2}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('settings.duration')}</label>
                  <Input
                    type="number"
                    value={form?.durationMonths ?? ''}
                    onChange={(e) => setForm((f) => f ? { ...f, durationMonths: e.target.value } : f)}
                    placeholder="6"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('settings.lessonsCount')}</label>
                  <Input
                    type="number"
                    value={form?.totalLessons ?? ''}
                    onChange={(e) => setForm((f) => f ? { ...f, totalLessons: e.target.value } : f)}
                    placeholder="72"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">{t('settings.color')}</label>
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
            <Button variant="secondary" onClick={() => setForm(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form?.name.trim()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title={t('settings.deleteDirection')}
        description={t('settings.deleteWarning')}
        variant="danger"
        onConfirm={() => { if (deleteId) destroy(deleteId); setDeleteId(null) }}
        onOpenChange={(o) => { if (!o) setDeleteId(null) }}
      />
    </div>
  )
}

/* ─── Subjects ───────────────────────────────────────────────────── */
function SubjectsTab() {
  const t = useT()
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
          <option value="">{t('settings.allDirections')}</option>
          {(directions as Direction[]).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" />{t('common.add')}</Button>
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
          {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-8">{t('settings.noSubjects')}</p>}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? t('settings.editSubject') : t('settings.newSubject')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.name')} *</label>
                <Input
                  value={form?.name ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : f)}
                  placeholder={t('settings.subjectExample')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('reports.direction')}</label>
                <select
                  value={form?.directionId ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, directionId: e.target.value || undefined } : f)}
                  className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white"
                >
                  <option value="">{t('settings.noDirection')}</option>
                  {(directions as Direction[]).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setForm(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form?.name.trim()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title={t('settings.deleteSubject')}
        description={t('settings.cannotUndo')}
        variant="danger"
        onConfirm={() => { if (deleteId) destroy(deleteId); setDeleteId(null) }}
        onOpenChange={(o) => { if (!o) setDeleteId(null) }}
      />
    </div>
  )
}

/* ─── Rooms ──────────────────────────────────────────────────────── */
function RoomsTab() {
  const t = useT()
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
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" />{t('common.add')}</Button>
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
                  <span className="text-xs text-gray-400 ml-2">{t('settings.upTo')} {r.capacity} {t('settings.people')}</span>
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
          {rooms.length === 0 && <p className="text-sm text-gray-400 text-center py-8">{t('settings.noRooms')}</p>}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? t('settings.editRoom') : t('settings.newRoom')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.name')} *</label>
                <Input
                  value={form?.name ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : f)}
                  placeholder={t('settings.roomExample')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('settings.capacity')}</label>
                <Input
                  type="number"
                  value={form?.capacity ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, capacity: e.target.value ? Number(e.target.value) : undefined } : f)}
                  placeholder={t('settings.optional')}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setForm(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form?.name.trim()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title={t('settings.deleteRoom')}
        description={t('settings.cannotUndo')}
        variant="danger"
        onConfirm={() => { if (deleteId) destroy(deleteId); setDeleteId(null) }}
        onOpenChange={(o) => { if (!o) setDeleteId(null) }}
      />
    </div>
  )
}

/* ─── Pricing (Course Pricing) ───────────────────────────────────── */
function PricingTab() {
  const t = useT()
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
      <p className="text-sm text-gray-500 mb-4">{t('settings.priceDescription')}</p>
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
                placeholder="0 UZS"
                className="w-36 text-right"
              />
              <Button
                size="sm"
                variant={saved[dir.id] ? 'secondary' : 'primary' as any}
                onClick={() => handleSave(dir.id)}
                disabled={!prices[dir.id]}
              >
                {saved[dir.id] ? `✓ ${t('settings.saved')}` : t('common.save')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
