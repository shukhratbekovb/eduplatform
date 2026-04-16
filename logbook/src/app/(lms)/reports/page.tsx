'use client'
import { BarChart2, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils/cn'

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useIncomeReport()      { return useQuery({ queryKey: ['reports', 'income'],      queryFn: () => apiClient.get('/lms/reports/income').then((r) => r.data as any[]) }) }
function usePerformanceReport() { return useQuery({ queryKey: ['reports', 'performance'], queryFn: () => apiClient.get('/lms/reports/performance').then((r) => r.data as any[]) }) }
function useTeacherHoursReport(){ return useQuery({ queryKey: ['reports', 'teacher-hours'], queryFn: () => apiClient.get('/lms/reports/teacher-hours').then((r) => r.data as any[]) }) }
function useDirectionReport()   { return useQuery({ queryKey: ['reports', 'by-direction'], queryFn: () => apiClient.get('/lms/reports/by-direction').then((r) => r.data as any[]) }) }

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

function PerformanceReport() {
  const { data = [], isLoading } = usePerformanceReport()

  if (isLoading) return <Skeleton />

  return (
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
  )
}

// ── Teacher hours report ──────────────────────────────────────────────────────

function TeacherHoursReport() {
  const { data = [], isLoading } = useTeacherHoursReport()

  if (isLoading) return <Skeleton />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Преподаватель</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Групп</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Уроков всего</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Проведено</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Часов</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row: any) => (
            <tr key={row.teacherId} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{row.teacherName}</td>
              <td className="px-4 py-3 text-center text-gray-700">{row.groups}</td>
              <td className="px-4 py-3 text-center text-gray-700">{row.lessonsTotal}</td>
              <td className="px-4 py-3 text-center">
                <span className={cn('font-semibold', row.lessonsConducted < row.lessonsTotal * 0.8 ? 'text-danger-600' : 'text-success-700')}>
                  {row.lessonsConducted}
                </span>
              </td>
              <td className="px-4 py-3 text-center font-semibold text-primary-700">{row.hoursTotal.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Lessons by direction ──────────────────────────────────────────────────────

function DirectionReport() {
  const { data = [], isLoading } = useDirectionReport()

  if (isLoading) return <Skeleton />

  return (
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
  )
}

// ── Main reports page ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
        <BarChart2 className="w-5 h-5 text-primary-600" />
        Отчёты
      </h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Tabs defaultValue="income">
          <div className="px-4 border-b border-gray-200 overflow-x-auto">
            <TabsList className="border-none whitespace-nowrap">
              <TabsTrigger value="income">Финансовые доходы</TabsTrigger>
              <TabsTrigger value="performance">Успеваемость по группам</TabsTrigger>
              <TabsTrigger value="hours">Часы преподавателей</TabsTrigger>
              <TabsTrigger value="directions">По направлениям</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="income" className="p-0">
            <IncomeReport />
          </TabsContent>

          <TabsContent value="performance" className="p-0">
            <PerformanceReport />
          </TabsContent>

          <TabsContent value="hours" className="p-0">
            <TeacherHoursReport />
          </TabsContent>

          <TabsContent value="directions" className="p-0">
            <DirectionReport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
