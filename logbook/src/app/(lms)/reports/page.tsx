'use client'
import { useState } from 'react'
import { BarChart2, Download } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/lib/stores/useAuthStore'
import { cn } from '@/lib/utils/cn'

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useIncomeReport()      { return useQuery({ queryKey: ['reports', 'income'],      queryFn: () => apiClient.get('/lms/reports/income').then((r) => r.data as any[]) }) }

function usePerformanceReport(month: number, year: number) {
  return useQuery({
    queryKey: ['reports', 'performance', month, year],
    queryFn: () => apiClient.get('/lms/reports/performance', { params: { month, year } }).then((r) => r.data as any[]),
  })
}

function useTeacherHoursReport(month: number, year: number, teacherId?: string) {
  return useQuery({
    queryKey: ['reports', 'teacher-hours', month, year, teacherId],
    queryFn: () => apiClient.get('/lms/reports/teacher-hours', { params: { month, year, teacherId } }).then((r) => r.data as any[]),
  })
}

function useDirectionReport(month: number, year: number) {
  return useQuery({
    queryKey: ['reports', 'by-direction', month, year],
    queryFn: () => apiClient.get('/lms/reports/by-direction', { params: { month, year } }).then((r) => r.data as any[]),
  })
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  return n.toLocaleString('ru-RU') + ' ₸'
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  )
}

// ── Income report ─────────────────────────────────────────────────────────────

function IncomeReport() {
  const { data = [], isLoading } = useIncomeReport()

  if (isLoading) return <Skeleton />

  const MONTH_NAMES: Record<string, string> = {
    '2026-01': 'Январь 2026', '2026-02': 'Февраль 2026',
    '2026-03': 'Март 2026',   '2026-04': 'Апрель 2026',
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Период</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Математика</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Английский</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Программирование</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 bg-primary-50">Итого</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row: any) => (
            <tr key={row.month} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{MONTH_NAMES[row.month] ?? row.month}</td>
              <td className="px-4 py-3 text-right text-gray-700">{formatMoney(row.byDirection['Математика'] ?? 0)}</td>
              <td className="px-4 py-3 text-right text-gray-700">{formatMoney(row.byDirection['Английский язык'] ?? 0)}</td>
              <td className="px-4 py-3 text-right text-gray-700">{formatMoney(row.byDirection['Программирование'] ?? 0)}</td>
              <td className="px-4 py-3 text-right font-bold text-primary-700 bg-primary-50">{formatMoney(row.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-gray-200 bg-gray-50">
          <tr>
            <td className="px-4 py-3 font-bold text-gray-900">Итого за период</td>
            <td className="px-4 py-3 text-right font-semibold text-gray-700">
              {formatMoney(data.reduce((s: number, r: any) => s + (r.byDirection['Математика'] ?? 0), 0))}
            </td>
            <td className="px-4 py-3 text-right font-semibold text-gray-700">
              {formatMoney(data.reduce((s: number, r: any) => s + (r.byDirection['Английский язык'] ?? 0), 0))}
            </td>
            <td className="px-4 py-3 text-right font-semibold text-gray-700">
              {formatMoney(data.reduce((s: number, r: any) => s + (r.byDirection['Программирование'] ?? 0), 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-primary-700 bg-primary-50">
              {formatMoney(data.reduce((s: number, r: any) => s + r.total, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Performance report (avg grades by group) ──────────────────────────────────

function useAvailablePeriods(teacherId?: string) {
  return useQuery({
    queryKey: ['reports', 'available-periods', teacherId],
    queryFn: () => apiClient.get('/lms/reports/available-periods', { params: { teacherId } })
      .then((r) => r.data as { years: number[]; monthsByYear: Record<string, number[]> }),
    staleTime: 10 * 60_000,
  })
}

function PeriodFilter({ month, year, setMonth, setYear, onGenerate, onDownload, teacherId }: {
  month: number; year: number
  setMonth: (v: number) => void; setYear: (v: number) => void
  onGenerate?: () => void
  onDownload?: () => void
  teacherId?: string
}) {
  const { data: periods } = useAvailablePeriods(teacherId)
  const availableYears = periods?.years ?? []
  const availableMonths = periods?.monthsByYear?.[String(year)] ?? []

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 flex-wrap">
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Месяц</p>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.length > 0
              ? availableMonths.map((m) => (
                  <SelectItem key={m} value={String(m)}>{MONTHS[m - 1]}</SelectItem>
                ))
              : MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))
            }
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Год</p>
        <Select value={String(year)} onValueChange={(v) => {
          const newYear = Number(v)
          setYear(newYear)
          const newMonths = periods?.monthsByYear?.[v] ?? []
          if (newMonths.length > 0) setMonth(newMonths[0])
        }}>
          <SelectTrigger className="w-24 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.length > 0
              ? availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))
              : [2024, 2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))
            }
          </SelectContent>
        </Select>
      </div>
      <div className="ml-auto self-end flex gap-2">
        {onGenerate && (
          <Button type="button" onClick={onGenerate} size="sm" className="h-9 px-5">
            Сформировать
          </Button>
        )}
        {onDownload && (
          <Button type="button" onClick={onDownload} variant="secondary" size="sm" className="h-9 px-4">
            <Download className="w-4 h-4" />
            PDF
          </Button>
        )}
      </div>
    </div>
  )
}

function usePeriod() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [applied, setApplied] = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const generate = () => setApplied({ month, year })
  return { month, year, setMonth, setYear, appliedMonth: applied.month, appliedYear: applied.year, generate }
}

function PerformanceReport() {
  const { data = [], isLoading } = usePerformanceReport(0, 0)

  return (
    <div>
      {isLoading ? <Skeleton /> : (
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Группа</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Преподаватель</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Студентов</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Ср. балл</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Посещаемость</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Уроков</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row: any) => (
            <tr key={row.groupId} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{row.groupName}</p>
                <p className="text-xs text-gray-400">{row.direction}</p>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{row.teacher}</td>
              <td className="px-4 py-3 text-center text-gray-700">{row.studentCount}</td>
              <td className="px-4 py-3 text-center">
                <span className={cn('font-bold', row.avgGrade < 6 ? 'text-danger-600' : row.avgGrade >= 8 ? 'text-success-700' : 'text-gray-900')}>
                  {row.avgGrade.toFixed(1)}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={cn('font-medium', row.attendance < 70 ? 'text-danger-600' : row.attendance >= 85 ? 'text-success-700' : 'text-gray-700')}>
                  {row.attendance.toFixed(0)}%
                </span>
              </td>
              <td className="px-4 py-3 text-center text-gray-700 hidden md:table-cell">{row.lessonsTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      )}
    </div>
  )
}

// ── Teacher hours report ──────────────────────────────────────────────────────

function formatHours(hours: number, mins: number) {
  if (hours === 0 && mins === 0) return '—'
  if (hours === 0) return `${mins} мин`
  if (mins === 0) return `${hours} часов`  // simplified
  return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} ${mins} мин`
}

async function loadFontBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function generateTeacherHoursPdf(data: any[], month: number, year: number) {
  const jsPDFModule = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')

  const [fontRegular, fontBold] = await Promise.all([
    loadFontBase64('/fonts/Roboto.ttf'),
    loadFontBase64('/fonts/Roboto-Bold.ttf'),
  ])

  const jsPDF = jsPDFModule.default
  const doc = new jsPDF()

  doc.addFileToVFS('Roboto.ttf', fontRegular)
  doc.addFont('Roboto.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', fontBold)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.setFont('Roboto')

  const monthName = MONTHS[month - 1] ?? ''

  doc.setFontSize(16)
  doc.text('Отчёт: Часы преподавателей', 14, 20)
  doc.setFontSize(11)
  doc.text(`Период: ${monthName} ${year}`, 14, 28)

  const rows: any[] = []
  for (const teacher of data) {
    rows.push([
      { content: teacher.teacherName, styles: { fontStyle: 'bold' } },
      { content: String(teacher.lessonsConducted), styles: { fontStyle: 'bold', halign: 'center' } },
      { content: formatHours(teacher.hours, teacher.minutesRemainder), styles: { fontStyle: 'bold' } },
    ])
    for (const s of teacher.subjects ?? []) {
      rows.push([
        { content: '   ' + s.name },
        { content: String(s.lessons), styles: { halign: 'center' } },
        formatHours(s.hours, s.minutesRemainder),
      ])
    }
  }

  const autoTable = autoTableModule.default
  autoTable(doc, {
    startY: 34,
    head: [['Предмет', 'Кол-во занятий', 'Часов']],
    body: rows,
    styles: { fontSize: 10, font: 'Roboto' },
    headStyles: { fillColor: [99, 102, 241], font: 'Roboto' },
    columnStyles: { 1: { halign: 'center' } },
  })

  doc.save(`teacher-hours-${year}-${String(month).padStart(2, '0')}.pdf`)
}

function TeacherHoursReport() {
  const user = useCurrentUser()
  const isTeacher = user?.role === 'teacher'
  const { month, year, setMonth, setYear, appliedMonth, appliedYear, generate } = usePeriod()
  const { data = [], isLoading } = useTeacherHoursReport(appliedMonth, appliedYear, isTeacher ? user?.id : undefined)

  const handleDownloadPdf = async () => {
    if (data.length === 0) return
    try {
      await generateTeacherHoursPdf(data, appliedMonth, appliedYear)
    } catch (err) {
      console.error('PDF generation error:', err)
      alert('Ошибка генерации PDF: ' + (err as Error).message)
    }
  }

  return (
    <div>
      <PeriodFilter
        month={month} year={year} setMonth={setMonth} setYear={setYear}
        onGenerate={generate}
        onDownload={handleDownloadPdf}
        teacherId={isTeacher ? user?.id : undefined}
      />
      {isLoading ? <Skeleton /> : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Предмет</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Кол-во занятий</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Часов</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row: any) => (
            <>
              {/* Teacher header row */}
              <tr key={row.teacherId} className="bg-gray-50 border-t border-gray-200">
                <td className="px-4 py-2.5 font-bold text-gray-900">{row.teacherName}</td>
                <td className="px-4 py-2.5 text-center font-bold text-gray-900">{row.lessonsConducted}</td>
                <td className="px-4 py-2.5 font-bold text-gray-900">{formatHours(row.hours, row.minutesRemainder)}</td>
              </tr>
              {/* Subject rows */}
              {(row.subjects ?? []).map((s: any) => (
                <tr key={`${row.teacherId}-${s.name}`} className="hover:bg-gray-50 border-t border-gray-100">
                  <td className="px-4 py-2 pl-8 text-gray-700">{s.name}</td>
                  <td className="px-4 py-2 text-center text-gray-600">{s.lessons}</td>
                  <td className="px-4 py-2 text-gray-600">{formatHours(s.hours, s.minutesRemainder)}</td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
      )}
    </div>
  )
}

// ── Lessons by direction ──────────────────────────────────────────────────────

function DirectionReport() {
  const { data = [], isLoading } = useDirectionReport(0, 0)

  return (
    <div>
      {isLoading ? <Skeleton /> : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Направление</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Групп</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Студентов</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Уроков</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Проведено</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Отменено</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row: any) => (
            <tr key={row.directionId} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: row.color }} />
                  <span className="font-medium text-gray-900">{row.directionName}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center text-gray-700">{row.groupCount}</td>
              <td className="px-4 py-3 text-center text-gray-700">{row.studentCount}</td>
              <td className="px-4 py-3 text-center text-gray-700">{row.lessonsTotal}</td>
              <td className="px-4 py-3 text-center text-success-700 font-semibold">{row.lessonsConducted}</td>
              <td className="px-4 py-3 text-center text-danger-600">{row.lessonsCancelled}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      )}
    </div>
  )
}

// ── Main reports page ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const user = useCurrentUser()
  const isTeacher = user?.role === 'teacher'

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
        <BarChart2 className="w-5 h-5 text-primary-600" />
        {isTeacher ? 'Мои часы' : 'Отчёты'}
      </h1>

      {isTeacher ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <TeacherHoursReport />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Tabs defaultValue="hours">
            <div className="px-4 border-b border-gray-200 overflow-x-auto">
              <TabsList className="border-none whitespace-nowrap">
                <TabsTrigger value="hours">Часы преподавателей</TabsTrigger>
                <TabsTrigger value="performance">Успеваемость по группам</TabsTrigger>
                <TabsTrigger value="directions">По направлениям</TabsTrigger>
                <TabsTrigger value="income">Финансовые доходы</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="hours" className="p-0">
              <TeacherHoursReport />
            </TabsContent>

            <TabsContent value="performance" className="p-0">
              <PerformanceReport />
            </TabsContent>

            <TabsContent value="directions" className="p-0">
              <DirectionReport />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
