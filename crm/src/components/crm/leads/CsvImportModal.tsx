'use client'
import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { leadsApi } from '@/lib/api/crm/leads'
import { useT } from '@/lib/i18n'
import { useQueryClient } from '@tanstack/react-query'
import type { Funnel, Stage } from '@/types/crm'
import type { ImportResult } from '@/types/crm/api'

interface CsvImportModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  funnels: Funnel[]
  stages: Stage[]
}

type Step = 'upload' | 'mapping' | 'result'

export function CsvImportModal({ open, onOpenChange, funnels, stages }: CsvImportModalProps) {
  const t = useT()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [totalRows, setTotalRows] = useState(0)

  // Mapping
  const [phoneCol, setPhoneCol] = useState('')
  const [nameCol, setNameCol] = useState('')
  const [emailCol, setEmailCol] = useState('')
  const [funnelId, setFunnelId] = useState('')
  const [stageId, setStageId] = useState('')

  // Result
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const activeFunnels = funnels.filter((f) => !f.isArchived)
  const funnelStages = stages.filter((s) => s.funnelId === funnelId)

  const resetState = () => {
    setStep('upload')
    setFile(null)
    setHeaders([])
    setPreview([])
    setTotalRows(0)
    setPhoneCol('')
    setNameCol('')
    setEmailCol('')
    setFunnelId('')
    setStageId('')
    setResult(null)
    setImporting(false)
  }

  const handleFile = (f: File) => {
    setFile(f)
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      preview: 100,
      complete: (results) => {
        const data = results.data as Record<string, string>[]
        const cols = results.meta.fields || []
        setHeaders(cols)
        setPreview(data.slice(0, 5))
        setTotalRows(data.length)

        // Auto-detect columns
        for (const col of cols) {
          const lower = col.toLowerCase()
          if (['phone', 'телефон', 'тел'].some(k => lower.includes(k))) setPhoneCol(col)
          if (['name', 'имя', 'фио', 'fullname'].some(k => lower.includes(k))) setNameCol(col)
          if (['email', 'почта', 'e-mail'].some(k => lower.includes(k))) setEmailCol(col)
        }

        setStep('mapping')
      },
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith('.csv')) handleFile(f)
  }

  const handleImport = async () => {
    if (!file || !phoneCol || !funnelId || !stageId) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('funnelId', funnelId)
      formData.append('stageId', stageId)
      formData.append('columnMap', JSON.stringify({
        phone: phoneCol,
        fullName: nameCol || undefined,
        email: emailCol || undefined,
      }))
      const res = await leadsApi.import(formData)
      setResult(res)
      setStep('result')
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
    } catch {
      setResult({ imported: 0, skipped: 0, total: 0, errors: [{ row: 0, reason: 'Server error' }] })
      setStep('result')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(resetState, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {t('csvImport.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-4">
          {(['upload', 'mapping', 'result'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                step === s ? 'bg-primary-500 text-white' : i < ['upload', 'mapping', 'result'].indexOf(step) ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs ${step === s ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {t(`csvImport.${s}`)}
              </span>
              {i < 2 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-10 text-center cursor-pointer hover:border-primary-300 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t('csvImport.dragHint')}</p>
            <p className="text-xs text-gray-400 mt-1">.csv</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            {/* Column mapping */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('csvImport.mapPhone')} *</label>
                <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={phoneCol} onChange={(e) => setPhoneCol(e.target.value)}>
                  <option value="">{t('csvImport.skip')}</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('csvImport.mapName')}</label>
                <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={nameCol} onChange={(e) => setNameCol(e.target.value)}>
                  <option value="">{t('csvImport.skip')}</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('csvImport.mapEmail')}</label>
                <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={emailCol} onChange={(e) => setEmailCol(e.target.value)}>
                  <option value="">{t('csvImport.skip')}</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {/* Funnel + Stage */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('csvImport.selectFunnel')} *</label>
                <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={funnelId} onChange={(e) => { setFunnelId(e.target.value); setStageId('') }}>
                  <option value="">—</option>
                  {activeFunnels.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('csvImport.selectStage')} *</label>
                <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={stageId} onChange={(e) => setStageId(e.target.value)} disabled={!funnelId}>
                  <option value="">—</option>
                  {funnelStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Preview */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">{t('csvImport.preview')} · {t('csvImport.totalRows')}: {totalRows}</p>
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {headers.map((h) => <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {headers.map((h) => <td key={h} className="px-3 py-1.5 text-gray-600 whitespace-nowrap max-w-[200px] truncate">{row[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={() => { setStep('upload'); setFile(null) }}>{t('common.back')}</Button>
              <Button
                onClick={handleImport}
                loading={importing}
                disabled={!phoneCol || !funnelId || !stageId}
              >
                {importing ? t('csvImport.importing') : t('csvImport.btnImport')}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">{t('csvImport.done')}</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-success-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-success-700">{result.imported}</p>
                <p className="text-xs text-success-600">{t('csvImport.imported')}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                <p className="text-xs text-amber-600">{t('csvImport.skipped')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-700">{result.total}</p>
                <p className="text-xs text-gray-500">{t('csvImport.totalRows')}</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {t('csvImport.errors')} ({result.errors.length})
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.errors.slice(0, 20).map((err, i) => (
                    <p key={i} className="text-xs text-red-600">
                      Row {err.row}: {err.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>{t('common.close')}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
