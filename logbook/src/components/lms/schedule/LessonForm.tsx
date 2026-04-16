'use client'
import { useState, useEffect, useMemo } from 'react'
import { X, CalendarRange } from 'lucide-react'
import { addDays, parseISO, format, getISODay } from 'date-fns'
import { useCreateLesson, useCreateBulkLessons } from '@/lib/hooks/lms/useSchedule'
import { useGroups } from '@/lib/hooks/lms/useGroups'
import { useDirections, useSubjects, useRooms, useLmsUsers } from '@/lib/hooks/lms/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import type { Group, Direction, Subject, Room } from '@/types/lms'

interface LessonFormProps {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  defaultDate?:  string
}

const WEEKDAYS = [
  { label: 'Пн', iso: 1 },
  { label: 'Вт', iso: 2 },
  { label: 'Ср', iso: 3 },
  { label: 'Чт', iso: 4 },
  { label: 'Пт', iso: 5 },
  { label: 'Сб', iso: 6 },
  { label: 'Вс', iso: 7 },
]

function generateDatesInRange(startDate: string, endDate: string, weekdays: number[]): string[] {
  if (!startDate || !endDate || weekdays.length === 0) return []
  const result: string[] = []
  let cur = parseISO(startDate)
  const end = parseISO(endDate)
  if (cur > end) return []
  while (cur <= end) {
    if (weekdays.includes(getISODay(cur))) result.push(format(cur, 'yyyy-MM-dd'))
    cur = addDays(cur, 1)
  }
  return result
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function SelectInput({
  value, onChange, disabled, placeholder, children,
}: {
  value: string; onChange: (v: string) => void
  disabled?: boolean; placeholder: string; children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary-500 transition-colors',
        disabled && 'bg-gray-50 text-gray-400 cursor-not-allowed',
      )}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  )
}

export function LessonForm({ open, onOpenChange, defaultDate }: LessonFormProps) {
  const { data: directions = [] } = useDirections()
  const { data: allGroups  = [] } = useGroups()
  const { data: rooms      = [] } = useRooms()
  const { data: allUsers   = [] } = useLmsUsers()

  const { mutate: createOne,  isPending: creatingOne  } = useCreateLesson()
  const { mutate: createBulk, isPending: creatingBulk } = useCreateBulkLessons()

  // Cascade state
  const [directionId, setDirectionId] = useState('')
  const [groupId,     setGroupId]     = useState('')
  const [subjectId,   setSubjectId]   = useState('')
  const [teacherId,   setTeacherId]   = useState('')
  const [roomId,      setRoomId]      = useState('')

  // Load subjects filtered by direction
  const { data: dirSubjects = [] } = useSubjects(directionId || undefined)

  // Mode
  const [mode, setMode] = useState<'single' | 'series'>('single')

  // Single
  const [date,      setDate]      = useState(defaultDate ?? '')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime,   setEndTime]   = useState('10:30')

  // Series
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd,   setRangeEnd]   = useState('')
  const [weekdays,   setWeekdays]   = useState<number[]>([])

  // Reset on open
  useEffect(() => {
    if (!open) return
    setDirectionId(''); setGroupId(''); setSubjectId(''); setTeacherId(''); setRoomId('')
    setMode('single')
    setDate(defaultDate ?? ''); setStartTime('09:00'); setEndTime('10:30')
    setRangeStart(''); setRangeEnd(''); setWeekdays([])
  }, [open, defaultDate])

  // Derived lists
  const filteredGroups = useMemo(
    () => directionId ? (allGroups as Group[]).filter((g) => g.directionId === directionId) : (allGroups as Group[]),
    [allGroups, directionId]
  )

  const teachers = useMemo(
    () => (allUsers as any[]).filter((u) => u.role === 'teacher'),
    [allUsers]
  )

  const selectedGroup = (allGroups as Group[]).find((g) => g.id === groupId)

  // When direction changes — reset group, subject, teacher
  const handleDirectionChange = (val: string) => {
    setDirectionId(val)
    setGroupId(''); setSubjectId(''); setTeacherId('')
  }

  // When group changes — auto-fill subject and teacher from group
  const handleGroupChange = (val: string) => {
    setGroupId(val)
    const g = (allGroups as Group[]).find((g) => g.id === val)
    if (g) {
      setSubjectId(g.subjectId ?? g.subject?.id ?? '')
      setTeacherId(g.teacherId ?? g.teacher?.id ?? '')
    } else {
      setSubjectId(''); setTeacherId('')
    }
  }

  const toggleWeekday = (iso: number) =>
    setWeekdays((prev) => prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort())

  const previewDates = useMemo(
    () => generateDatesInRange(rangeStart, rangeEnd, weekdays),
    [rangeStart, rangeEnd, weekdays]
  )

  const timeValid = startTime < endTime
  const baseValid = !!groupId && !!subjectId && !!teacherId && timeValid
  const canSubmitSingle = baseValid && !!date
  const canSubmitSeries = baseValid && previewDates.length > 0

  const handleSubmit = () => {
    const common = {
      groupId,
      subjectId: subjectId || undefined,
      teacherId: teacherId || undefined,
      roomId:    roomId    || undefined,
      startTime, endTime,
    }
    if (mode === 'single') {
      if (!canSubmitSingle) return
      createOne({ ...common, date }, { onSuccess: () => onOpenChange(false) })
    } else {
      if (!canSubmitSeries) return
      createBulk(
        { ...common, startDate: rangeStart, endDate: rangeEnd, weekdays },
        { onSuccess: () => onOpenChange(false) }
      )
    }
  }

  if (!open) return null

  const isPending   = creatingOne || creatingBulk
  const activeRooms = (rooms as Room[]).filter((r) => r.isActive)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Новый урок</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* 1. Direction */}
          <Field label="Направление *">
            <SelectInput value={directionId} onChange={handleDirectionChange} placeholder="Выберите направление">
              {(directions as Direction[]).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </SelectInput>
          </Field>

          {/* 2. Group */}
          <Field label="Группа *">
            <SelectInput
              value={groupId}
              onChange={handleGroupChange}
              disabled={!directionId}
              placeholder={directionId ? 'Выберите группу' : 'Сначала выберите направление'}
            >
              {filteredGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </SelectInput>
          </Field>

          {/* 3. Subject */}
          <Field label="Предмет *">
            <SelectInput
              value={subjectId}
              onChange={setSubjectId}
              disabled={!directionId}
              placeholder={directionId ? 'Выберите предмет' : 'Сначала выберите направление'}
            >
              {(dirSubjects as Subject[]).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </SelectInput>
          </Field>

          {/* 4. Teacher */}
          <Field label="Преподаватель *">
            <SelectInput
              value={teacherId}
              onChange={setTeacherId}
              disabled={!directionId}
              placeholder="Выберите преподавателя"
            >
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </SelectInput>
          </Field>

          {/* 5. Room */}
          <Field label="Кабинет">
            <SelectInput value={roomId} onChange={setRoomId} placeholder="Не указан">
              {activeRooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </SelectInput>
          </Field>

          {/* 6. Time */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Начало *">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
            <Field label="Конец *">
              <Input
                type="time" value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                error={!timeValid && !!endTime}
              />
              {!timeValid && !!endTime && (
                <p className="mt-1 text-xs text-danger-500">Конец должен быть позже начала</p>
              )}
            </Field>
          </div>

          {/* 7. Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button" onClick={() => setMode('single')}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                mode === 'single' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              )}
            >
              Один урок
            </button>
            <button
              type="button" onClick={() => setMode('series')}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
                mode === 'series' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              )}
            >
              <CalendarRange className="w-4 h-4" />
              Серия уроков
            </button>
          </div>

          {/* Single: date */}
          {mode === 'single' && (
            <Field label="Дата *">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          )}

          {/* Series: range + weekdays */}
          {mode === 'series' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="С *">
                  <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                </Field>
                <Field label="По *">
                  <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
                </Field>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Дни недели *</label>
                <div className="flex gap-1.5">
                  {WEEKDAYS.map(({ label, iso }) => (
                    <button
                      key={iso} type="button" onClick={() => toggleWeekday(iso)}
                      className={cn(
                        'w-10 h-10 rounded-lg text-sm font-medium border transition-colors',
                        weekdays.includes(iso)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {previewDates.length > 0 && (
                <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <p className="text-sm font-medium text-primary-700">
                    Будет создано {previewDates.length}&nbsp;
                    {previewDates.length === 1 ? 'урок' : previewDates.length < 5 ? 'урока' : 'уроков'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {previewDates.slice(0, 10).map((d) => (
                      <span key={d} className="text-xs bg-white border border-primary-200 rounded px-1.5 py-0.5 text-primary-700">{d}</span>
                    ))}
                    {previewDates.length > 10 && (
                      <span className="text-xs text-primary-500">+{previewDates.length - 10} ещё</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            className="flex-1"
            loading={isPending}
            disabled={mode === 'single' ? !canSubmitSingle : !canSubmitSeries}
            onClick={handleSubmit}
          >
            {mode === 'series' && previewDates.length > 0
              ? `Создать ${previewDates.length} уроков`
              : 'Создать урок'
            }
          </Button>
        </div>
      </div>
    </div>
  )
}
