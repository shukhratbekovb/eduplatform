'use client'
import { useState } from 'react'
import { BarChart2, Download, AlertTriangle, TrendingUp, FileText, Banknote, Users, Clock, GraduationCap, Layers } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCurrentUser, useIsDirector, useIsCashier } from '@/lib/stores/useAuthStore'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('ru-RU') + ' UZS' }

// MONTHS kept only for PDF generation (always Russian)
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function useMonthNames() {
  const t = useT()
  return Array.from({ length: 12 }, (_, i) => t(`month.${i}`))
}

function useShortMonthNames() {
  const t = useT()
  return Array.from({ length: 12 }, (_, i) => t(`monthShort.${i}`))
}

function Skeleton() {
  return (
    <div className="space-y-2 p-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
      ))}
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

// ── Shared hooks ────────────────────────────────────────────────────────────

function useAvailablePeriods(teacherId?: string) {
  return useQuery({
    queryKey: ['reports', 'available-periods', teacherId],
    queryFn: () => apiClient.get('/lms/reports/available-periods', { params: { teacherId } })
      .then((r) => r.data as { years: number[]; monthsByYear: Record<string, number[]> }),
    staleTime: 10 * 60_000,
  })
}

function useFinanceAvailablePeriods() {
  return useQuery({
    queryKey: ['reports', 'finance-available-periods'],
    queryFn: () => apiClient.get('/lms/reports/finance/available-periods')
      .then((r) => r.data as { years: number[]; monthsByYear: Record<string, number[]> }),
    staleTime: 10 * 60_000,
  })
}

function useDirections() {
  return useQuery({
    queryKey: ['lms', 'directions'],
    queryFn: () => apiClient.get('/lms/directions').then((r) => r.data as any[]),
    staleTime: 10 * 60_000,
  })
}

// ── Period filter ───────────────────────────────────────────────────────────

function PeriodFilter({ month, year, setMonth, setYear, onGenerate, onDownload, periodsData }: {
  month: number; year: number
  setMonth: (v: number) => void; setYear: (v: number) => void
  onGenerate?: () => void
  onDownload?: () => void
  periodsData?: { years: number[]; monthsByYear: Record<string, number[]> }
}) {
  const t = useT()
  const monthNames = useMonthNames()
  const availableYears = periodsData?.years ?? []
  const availableMonths = periodsData?.monthsByYear?.[String(year)] ?? []

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 flex-wrap">
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{t('reports.month')}</p>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableMonths.length > 0
              ? availableMonths.map((m) => <SelectItem key={m} value={String(m)}>{monthNames[m - 1]}</SelectItem>)
              : monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)
            }
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{t('reports.year')}</p>
        <Select value={String(year)} onValueChange={(v) => {
          const newYear = Number(v)
          setYear(newYear)
          const newMonths = periodsData?.monthsByYear?.[v] ?? []
          if (newMonths.length > 0) setMonth(newMonths[0])
        }}>
          <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableYears.length > 0
              ? availableYears.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)
              : [2024, 2025, 2026, 2027].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)
            }
          </SelectContent>
        </Select>
      </div>
      <div className="ml-auto self-end flex gap-2">
        {onGenerate && (
          <Button type="button" onClick={onGenerate} size="sm" className="h-9 px-5">{t('reports.generate')}</Button>
        )}
        {onDownload && (
          <Button type="button" onClick={onDownload} variant="secondary" size="sm" className="h-9 px-4">
            <Download className="w-4 h-4" /> {t('common.pdf')}
          </Button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER HOURS (existing, kept as-is)
// ══════════════════════════════════════════════════════════════════════════════

function formatHoursI18n(hours: number, mins: number, t: (key: string) => string) {
  if (hours === 0 && mins === 0) return '—'
  if (hours === 0) return `${mins} ${t('reports.min')}`
  const hourWord = hours === 1 ? t('reports.hour1') : hours < 5 ? t('reports.hour2_4') : t('reports.hour5plus')
  if (mins === 0) return `${hours} ${hourWord}`
  return `${hours} ${hourWord} ${mins} ${t('reports.min')}`
}

// Keep original for PDF generation (always Russian)
function formatHours(hours: number, mins: number) {
  if (hours === 0 && mins === 0) return '—'
  if (hours === 0) return `${mins} мин`
  if (mins === 0) return `${hours} часов`
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
    loadFontBase64('/fonts/Roboto.ttf'), loadFontBase64('/fonts/Roboto-Bold.ttf'),
  ])
  const doc = new jsPDFModule.default()
  doc.addFileToVFS('Roboto.ttf', fontRegular); doc.addFont('Roboto.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', fontBold); doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.setFont('Roboto')
  doc.setFontSize(16); doc.text('Отчёт: Часы преподавателей', 14, 20)
  doc.setFontSize(11); doc.text(`Период: ${MONTHS[month - 1]} ${year}`, 14, 28)
  const rows: any[] = []
  for (const t of data) {
    rows.push([
      { content: t.teacherName, styles: { fontStyle: 'bold' } },
      { content: String(t.lessonsConducted), styles: { fontStyle: 'bold', halign: 'center' } },
      { content: formatHours(t.hours, t.minutesRemainder), styles: { fontStyle: 'bold' } },
    ])
    for (const s of t.subjects ?? []) {
      rows.push([{ content: '   ' + s.name }, { content: String(s.lessons), styles: { halign: 'center' } }, formatHours(s.hours, s.minutesRemainder)])
    }
  }
  autoTableModule.default(doc, {
    startY: 34, head: [['Предмет', 'Кол-во занятий', 'Часов']], body: rows,
    styles: { fontSize: 10, font: 'Roboto' }, headStyles: { fillColor: [99, 102, 241], font: 'Roboto' },
    columnStyles: { 1: { halign: 'center' } },
  })
  doc.save(`teacher-hours-${year}-${String(month).padStart(2, '0')}.pdf`)
}

function TeacherHoursReport() {
  const t = useT()
  const user = useCurrentUser()
  const isTeacher = user?.role === 'teacher'
  const { month, year, setMonth, setYear, appliedMonth, appliedYear, generate } = usePeriod()
  const { data: periods } = useAvailablePeriods(isTeacher ? user?.id : undefined)
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'teacher-hours', appliedMonth, appliedYear, isTeacher ? user?.id : undefined],
    queryFn: () => apiClient.get('/lms/reports/teacher-hours', { params: { month: appliedMonth, year: appliedYear, teacherId: isTeacher ? user?.id : undefined } }).then((r) => r.data as any[]),
  })

  return (
    <div>
      <PeriodFilter month={month} year={year} setMonth={setMonth} setYear={setYear}
        onGenerate={generate} onDownload={() => data.length && generateTeacherHoursPdf(data, appliedMonth, appliedYear)}
        periodsData={periods} />
      {isLoading ? <Skeleton /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('reports.subject')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.lessonsCount')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('reports.hours')}</th>
              </tr>
            </thead>
            <tbody>
              {data.flatMap((row: any) => [
                <tr key={row.teacherId} className="bg-gray-50 border-t border-gray-200">
                  <td className="px-4 py-2.5 font-bold text-gray-900">{row.teacherName}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-gray-900">{row.lessonsConducted}</td>
                  <td className="px-4 py-2.5 font-bold text-gray-900">{formatHoursI18n(row.hours, row.minutesRemainder, t)}</td>
                </tr>,
                ...(row.subjects ?? []).map((s: any) => (
                  <tr key={`${row.teacherId}-${s.name}`} className="hover:bg-gray-50 border-t border-gray-100">
                    <td className="px-4 py-2 pl-8 text-gray-700">{s.name}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{s.lessons}</td>
                    <td className="px-4 py-2 text-gray-600">{formatHoursI18n(s.hours, s.minutesRemainder, t)}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE (existing)
// ══════════════════════════════════════════════════════════════════════════════

function PerformanceReport() {
  const t = useT()
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'performance'],
    queryFn: () => apiClient.get('/lms/reports/performance').then((r) => r.data as any[]),
  })

  if (isLoading) return <Skeleton />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">{t('reports.group')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.students')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.avgGrade')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.attendance')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 hidden md:table-cell">{t('reports.lessons')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row: any) => (
            <tr key={row.groupId} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{row.groupName}</p>
                <p className="text-xs text-gray-400">{row.direction}</p>
              </td>
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
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// DIRECTION REPORT (existing)
// ══════════════════════════════════════════════════════════════════════════════

function DirectionReport() {
  const t = useT()
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'by-direction'],
    queryFn: () => apiClient.get('/lms/reports/by-direction').then((r) => r.data as any[]),
  })

  if (isLoading) return <Skeleton />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">{t('reports.direction')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.groups')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.students')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.lessons')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.conducted')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.cancelled')}</th>
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
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// FINANCIAL REPORTS
// ══════════════════════════════════════════════════════════════════════════════

// ── 1. Income ───────────────────────────────────────────────────────────────

async function generateIncomePdf(data: any, month: number, year: number) {
  const jsPDFModule = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const [fontRegular, fontBold] = await Promise.all([
    loadFontBase64('/fonts/Roboto.ttf'), loadFontBase64('/fonts/Roboto-Bold.ttf'),
  ])
  const doc = new jsPDFModule.default()
  doc.addFileToVFS('Roboto.ttf', fontRegular); doc.addFont('Roboto.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', fontBold); doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.setFont('Roboto')
  doc.setFontSize(16); doc.text('Отчёт: Доходы', 14, 20)
  doc.setFontSize(11); doc.text(`Период: ${MONTHS[month - 1]} ${year}`, 14, 28)
  doc.setFontSize(12); doc.text(`Итого: ${fmt(data.grandTotal)}`, 14, 36)

  const rows = data.byDirection.map((d: any) => [d.directionName, String(d.paymentCount), fmt(d.amount)])
  rows.push([{ content: 'Итого', styles: { fontStyle: 'bold' } }, '', { content: fmt(data.grandTotal), styles: { fontStyle: 'bold' } }])

  autoTableModule.default(doc, {
    startY: 42, head: [['Направление', 'Платежей', 'Сумма']], body: rows,
    styles: { fontSize: 10, font: 'Roboto' }, headStyles: { fillColor: [34, 197, 94], font: 'Roboto' },
  })
  doc.save(`income-${year}-${String(month).padStart(2, '0')}.pdf`)
}

function IncomeReport() {
  const t = useT()
  const monthNames = useMonthNames()
  const shortMonthNames = useShortMonthNames()
  const { month, year, setMonth, setYear, appliedMonth, appliedYear, generate } = usePeriod()
  const { data: periods } = useFinanceAvailablePeriods()
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'finance-income', appliedMonth, appliedYear],
    queryFn: () => apiClient.get('/lms/reports/finance/income', { params: { month: appliedMonth, year: appliedYear } }).then((r) => r.data as any),
  })

  return (
    <div>
      <PeriodFilter month={month} year={year} setMonth={setMonth} setYear={setYear}
        onGenerate={generate} onDownload={() => data && generateIncomePdf(data, appliedMonth, appliedYear)}
        periodsData={periods} />

      {isLoading ? <Skeleton /> : !data ? <p className="p-4 text-sm text-gray-400">{t('reports.noData')}</p> : (
        <div className="p-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-success-50 rounded-lg p-4 border border-success-200">
              <p className="text-xs text-success-600 mb-1">{t('reports.receivedFor')} {monthNames[appliedMonth - 1]} {appliedYear}</p>
              <p className="text-2xl font-bold text-success-700">{fmt(data.grandTotal)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">{t('reports.directionsWithPayments')}</p>
              <p className="text-2xl font-bold text-gray-900">{data.byDirection.length}</p>
            </div>
          </div>

          {/* By direction table */}
          {data.byDirection.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('reports.direction')}</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.paymentsCount')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t('reports.amount')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t('reports.share')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.byDirection.map((d: any) => (
                    <tr key={d.directionName} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{d.directionName}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{d.paymentCount}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(d.amount)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {data.grandTotal > 0 ? Math.round((d.amount / data.grandTotal) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-900">{t('common.total')}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700">
                      {data.byDirection.reduce((s: number, d: any) => s + d.paymentCount, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-success-700">{fmt(data.grandTotal)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-500">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Monthly trend */}
          {data.monthlyTrend.length > 1 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{t('reports.dynamicFor')} {appliedYear} {t('reports.yearSuffix')}</p>
              <div className="flex items-end gap-1 h-32">
                {data.monthlyTrend.map((tr: any) => {
                  const max = Math.max(...data.monthlyTrend.map((x: any) => x.amount))
                  const h = max > 0 ? Math.max(4, (tr.amount / max) * 100) : 4
                  const isActive = tr.month === appliedMonth
                  return (
                    <div key={tr.month} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={cn("w-full rounded-t transition-all", isActive ? "bg-success-500" : "bg-gray-200")}
                        style={{ height: `${h}%` }}
                        title={`${monthNames[tr.month - 1]}: ${fmt(tr.amount)}`}
                      />
                      <span className={cn("text-[9px]", isActive ? "text-success-700 font-bold" : "text-gray-400")}>
                        {shortMonthNames[tr.month - 1]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 2. Debtors ──────────────────────────────────────────────────────────────

async function generateDebtorsPdf(data: any[]) {
  const jsPDFModule = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const [fontRegular, fontBold] = await Promise.all([
    loadFontBase64('/fonts/Roboto.ttf'), loadFontBase64('/fonts/Roboto-Bold.ttf'),
  ])
  const doc = new jsPDFModule.default()
  doc.addFileToVFS('Roboto.ttf', fontRegular); doc.addFont('Roboto.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', fontBold); doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.setFont('Roboto')
  doc.setFontSize(16); doc.text('Отчёт: Должники', 14, 20)
  doc.setFontSize(11); doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, 14, 28)

  const rows = data.map((d: any) => [
    d.fullName,
    d.studentCode || '—',
    d.phone || '—',
    fmt(d.totalDebt),
    String(d.overdueCount),
    d.contracts.map((c: any) => c.directionName).join(', '),
  ])

  autoTableModule.default(doc, {
    startY: 34, head: [['Студент', 'Код', 'Телефон', 'Долг', 'Просрочено', 'Направления']], body: rows,
    styles: { fontSize: 9, font: 'Roboto' }, headStyles: { fillColor: [239, 68, 68], font: 'Roboto' },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'center' } },
  })
  doc.save(`debtors-${new Date().toISOString().slice(0, 10)}.pdf`)
}

function DebtorsReport() {
  const t = useT()
  const { data: directions = [] } = useDirections()
  const [directionId, setDirectionId] = useState<string>('all')
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'finance-debtors', directionId],
    queryFn: () => apiClient.get('/lms/reports/finance/debtors', {
      params: directionId !== 'all' ? { directionId } : undefined,
    }).then((r) => r.data as any[]),
  })

  const totalDebt = data.reduce((s: number, d: any) => s + d.totalDebt, 0)
  const totalOverdue = data.reduce((s: number, d: any) => s + d.overdueCount, 0)

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 flex-wrap">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{t('reports.direction')}</p>
          <Select value={directionId} onValueChange={setDirectionId}>
            <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('reports.allDirections')}</SelectItem>
              {directions.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto self-end">
          <Button type="button" onClick={() => data.length && generateDebtorsPdf(data)} variant="secondary" size="sm" className="h-9 px-4">
            <Download className="w-4 h-4" /> {t('common.pdf')}
          </Button>
        </div>
      </div>

      {isLoading ? <Skeleton /> : (
        <div className="p-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-xs text-red-500 mb-1">{t('reports.debtorsCount')}</p>
              <p className="text-xl font-bold text-red-700">{data.length}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <p className="text-xs text-amber-600 mb-1">{t('reports.totalDebt')}</p>
              <p className="text-xl font-bold text-amber-700">{fmt(totalDebt)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-xs text-red-500 mb-1">{t('reports.overduePayments')}</p>
              <p className="text-xl font-bold text-red-700">{totalOverdue}</p>
            </div>
          </div>

          {data.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('reports.noDebtors')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('reports.student')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">{t('reports.phone')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('reports.directions')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t('reports.debt')}</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.overdue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((d: any) => (
                    <tr key={d.studentId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{d.fullName}</p>
                        <p className="text-xs text-gray-400">{d.studentCode}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{d.phone || '—'}</td>
                      <td className="px-4 py-3">
                        {d.contracts.map((c: any, i: number) => (
                          <span key={i} className="text-xs text-gray-500">
                            {c.directionName}{i < d.contracts.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(d.totalDebt)}</td>
                      <td className="px-4 py-3 text-center">
                        {d.overdueCount > 0 ? (
                          <Badge variant="danger">{d.overdueCount}</Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 3. Forecast ─────────────────────────────────────────────────────────────

function ForecastReport() {
  const t = useT()
  const monthNames = useMonthNames()
  const [monthsAhead, setMonthsAhead] = useState(3)
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'finance-forecast', monthsAhead],
    queryFn: () => apiClient.get('/lms/reports/finance/forecast', { params: { monthsAhead } }).then((r) => r.data as any),
  })

  return (
    <div>
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{t('reports.forecastPeriod')}</p>
          <Select value={String(monthsAhead)} onValueChange={(v) => setMonthsAhead(Number(v))}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t('reports.month1')}</SelectItem>
              <SelectItem value="3">{t('reports.month3')}</SelectItem>
              <SelectItem value="6">{t('reports.month6')}</SelectItem>
              <SelectItem value="12">{t('reports.month12')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? <Skeleton /> : !data ? <p className="p-4 text-sm text-gray-400">{t('reports.noData')}</p> : (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-500 mb-1">{t('reports.expected')}</p>
              <p className="text-xl font-bold text-blue-700">{fmt(data.grandTotal)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-xs text-red-500 mb-1">{t('reports.currentOverdueDebt')}</p>
              <p className="text-xl font-bold text-red-700">{fmt(data.overdueTotal)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">{t('reports.forecastMonths')}</p>
              <p className="text-xl font-bold text-gray-900">{data.months.length}</p>
            </div>
          </div>

          {data.months.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('reports.noExpectedPayments')}</p>
          ) : (
            <div className="space-y-3">
              {data.months.map((m: any) => (
                <div key={m.period} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{monthNames[m.month - 1]} {m.year}</p>
                      <p className="text-xs text-gray-400">{m.paymentCount} {t('fin.payments')}</p>
                    </div>
                    <p className="text-lg font-bold text-blue-700">{fmt(m.total)}</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {m.byDirection.map((d: any) => (
                      <div key={d.directionName} className="flex items-center justify-between px-4 py-2">
                        <span className="text-sm text-gray-600">{d.directionName}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{fmt(d.expected)}</span>
                          <span className="text-xs text-gray-400 ml-2">({d.paymentCount})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 4. Contracts Summary ────────────────────────────────────────────────────

function ContractsSummaryReport() {
  const t = useT()
  const { data: directions = [] } = useDirections()
  const [directionId, setDirectionId] = useState<string>('all')
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'finance-contracts-summary', directionId],
    queryFn: () => apiClient.get('/lms/reports/finance/contracts-summary', {
      params: directionId !== 'all' ? { directionId } : undefined,
    }).then((r) => r.data as any),
  })

  return (
    <div>
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{t('reports.direction')}</p>
          <Select value={directionId} onValueChange={setDirectionId}>
            <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('reports.allDirections')}</SelectItem>
              {directions.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? <Skeleton /> : !data ? <p className="p-4 text-sm text-gray-400">{t('reports.noData')}</p> : (
        <div className="p-4 space-y-4">
          {/* Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-primary-50 rounded-lg p-3 border border-primary-200">
              <p className="text-xs text-primary-500 mb-1">{t('reports.totalContracts')}</p>
              <p className="text-xl font-bold text-primary-700">{data.totalContracts}</p>
            </div>
            <div className="bg-success-50 rounded-lg p-3 border border-success-200">
              <p className="text-xs text-success-500 mb-1">{t('reports.activeContracts')}</p>
              <p className="text-xl font-bold text-success-700">{data.activeContracts}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">{t('reports.totalCost')}</p>
              <p className="text-lg font-bold text-gray-900">{fmt(data.totalContractValue)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">{t('reports.avgCheck')}</p>
              <p className="text-lg font-bold text-gray-900">{fmt(data.avgContractValue)}</p>
            </div>
          </div>

          {/* By direction */}
          {data.byDirection.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{t('reports.byDirections')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('reports.direction')}</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.contracts')}</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">{t('reports.activeContracts')}</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">{t('reports.cost')}</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">{t('reports.paidAmount')}</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">{t('reports.collectionPct')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.byDirection.map((d: any) => (
                      <tr key={d.directionName} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{d.directionName}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{d.count}</td>
                        <td className="px-4 py-3 text-center text-success-700">{d.activeCount}</td>
                        <td className="px-4 py-3 text-right text-gray-900">{fmt(d.totalValue)}</td>
                        <td className="px-4 py-3 text-right text-success-700 font-medium">{fmt(d.paidValue)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn("font-medium",
                            d.totalValue > 0 && (d.paidValue / d.totalValue) < 0.5 ? "text-red-600" :
                            d.totalValue > 0 && (d.paidValue / d.totalValue) >= 0.8 ? "text-success-600" : "text-gray-600"
                          )}>
                            {d.totalValue > 0 ? Math.round((d.paidValue / d.totalValue) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By payment type */}
          {data.byPaymentType.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.byPaymentType.map((pt: any) => (
                <div key={pt.type} className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
                  <p className="text-xs text-gray-400 mb-1">{pt.label}</p>
                  <p className="text-lg font-bold text-gray-900">{pt.count}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function ReportsPage() {
  const t = useT()
  const user = useCurrentUser()
  const isTeacher = user?.role === 'teacher'
  const isDirector = useIsDirector()
  const isCashier = useIsCashier()
  const showFinance = isDirector || isCashier

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
        <BarChart2 className="w-5 h-5 text-primary-600" />
        {isTeacher ? t('reports.myHours') : t('reports.title')}
      </h1>

      {isTeacher ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <TeacherHoursReport />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Tabs defaultValue={showFinance ? 'income' : 'hours'}>
            <div className="px-4 border-b border-gray-200 overflow-x-auto">
              <TabsList className="border-none whitespace-nowrap">
                {showFinance && (
                  <>
                    <TabsTrigger value="income">
                      <Banknote className="w-4 h-4" /> {t('reports.income')}
                    </TabsTrigger>
                    <TabsTrigger value="debtors">
                      <AlertTriangle className="w-4 h-4" /> {t('reports.debtors')}
                    </TabsTrigger>
                    <TabsTrigger value="forecast">
                      <TrendingUp className="w-4 h-4" /> {t('reports.forecast')}
                    </TabsTrigger>
                    <TabsTrigger value="contracts">
                      <FileText className="w-4 h-4" /> {t('profile.contracts')}
                    </TabsTrigger>
                  </>
                )}
                <TabsTrigger value="hours">
                  <Clock className="w-4 h-4" /> {t('reports.teacherHours')}
                </TabsTrigger>
                <TabsTrigger value="performance">
                  <GraduationCap className="w-4 h-4" /> {t('reports.performance')}
                </TabsTrigger>
                <TabsTrigger value="directions">
                  <Layers className="w-4 h-4" /> {t('reports.byDirection')}
                </TabsTrigger>
              </TabsList>
            </div>

            {showFinance && (
              <>
                <TabsContent value="income" className="p-0"><IncomeReport /></TabsContent>
                <TabsContent value="debtors" className="p-0"><DebtorsReport /></TabsContent>
                <TabsContent value="forecast" className="p-0"><ForecastReport /></TabsContent>
                <TabsContent value="contracts" className="p-0"><ContractsSummaryReport /></TabsContent>
              </>
            )}

            <TabsContent value="hours" className="p-0"><TeacherHoursReport /></TabsContent>
            <TabsContent value="performance" className="p-0"><PerformanceReport /></TabsContent>
            <TabsContent value="directions" className="p-0"><DirectionReport /></TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
