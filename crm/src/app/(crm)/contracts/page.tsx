'use client'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, Plus, Search, AlertCircle, Copy, Check, Upload, UserCheck, FileUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api/axios'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils/dates'
import { useT } from '@/lib/i18n'

// ── Types ────────────────────────────────────────────────────────────────────
interface Contract {
  contractNumber?: string;
  id: string; fullName: string; phone: string; email?: string
  directionId?: string; directionName?: string
  paymentType: string; paymentTypeLabel?: string; paymentAmount?: number; currency: string
  durationMonths?: number; totalLessons?: number
  startDate?: string; notes?: string; status: string; createdAt?: string
  studentLogin?: string; studentPassword?: string; hasDocuments?: boolean; studentId?: string
}
interface Direction { id: string; name: string; durationMonths?: number; totalLessons?: number; isActive: boolean }
interface StudentResult { id: string; fullName: string; phone?: string; email?: string; studentCode?: string; hasDocuments: boolean }

const PAYMENT_TYPES = [
  { value: 'monthly', label: 'Ежемесячная' }, { value: 'quarterly', label: 'Квартальная (3 мес.)' },
  { value: 'semiannual', label: 'Полугодовая (6 мес.)' }, { value: 'annual', label: 'Годовая' },
]
const DOC_TYPES = [
  { value: 'passport', label: 'Паспорт' }, { value: 'birth_certificate', label: 'Метрика' },
  { value: 'photo', label: 'Фото 3x4' }, { value: 'other', label: 'Другое' },
]

// ── Hooks ────────────────────────────────────────────────────────────────────
interface ContractFilters { search?: string; status?: string; directionId?: string; paymentType?: string }
function useContracts(f: ContractFilters) {
  const params: Record<string,string> = {}
  if (f.search) params.search = f.search
  if (f.status) params.status = f.status
  if (f.directionId) params.directionId = f.directionId
  if (f.paymentType) params.paymentType = f.paymentType
  return useQuery({ queryKey: ['crm','contracts', params], queryFn: () => apiClient.get('/crm/contracts',{params}).then(r=>r.data), staleTime: 30_000 })
}
function useDirections() { return useQuery<Direction[]>({ queryKey: ['lms','directions'], queryFn: () => apiClient.get('/lms/directions').then(r=>r.data), staleTime: 5*60_000 }) }

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ContractsPage() {
  const t = useT()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDirection, setFilterDirection] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [showForm, setShowForm] = useState(false)
  const searchParams = useSearchParams()
  useEffect(() => { if (searchParams?.get("newContract")) setShowForm(true) }, [searchParams])
  const [creds, setCreds] = useState<{login:string;password:string;studentId:string}|null>(null)
  const { data: directions = [] } = useDirections()

  const filters: ContractFilters = {
    search: search || undefined,
    status: filterStatus || undefined,
    directionId: filterDirection || undefined,
    paymentType: filterPayment || undefined,
  }
  const { data, isLoading } = useContracts(filters)
  const contracts: Contract[] = data?.data ?? []

  const activeFilters = [filterStatus, filterDirection, filterPayment].filter(Boolean).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('contracts.title')}</h1>
        <Button onClick={()=>setShowForm(true)}><Plus className="w-4 h-4"/>{t('contracts.addBtn')}</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <Input placeholder={t('contracts.search')} className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        <Select value={filterDirection || '__all__'} onValueChange={v=>setFilterDirection(v==='__all__'?'':v)}>
          <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder={t('contracts.filter.allDir')}/></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('contracts.filter.allDir')}</SelectItem>
            {directions.filter(d=>d.isActive).map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPayment || '__all__'} onValueChange={v=>setFilterPayment(v==='__all__'?'':v)}>
          <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder={t('contracts.filter.allPay')}/></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('contracts.filter.allPay')}</SelectItem>
            {PAYMENT_TYPES.map(pt=><SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus || '__all__'} onValueChange={v=>setFilterStatus(v==='__all__'?'':v)}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder={t('contracts.filter.allSt')}/></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('contracts.filter.allSt')}</SelectItem>
            <SelectItem value="active">{t('contracts.status.active')}</SelectItem>
            <SelectItem value="completed">{t('contracts.status.completed')}</SelectItem>
            <SelectItem value="cancelled">{t('contracts.status.cancelled')}</SelectItem>
          </SelectContent>
        </Select>

        {activeFilters > 0 && (
          <button onClick={()=>{setFilterStatus('');setFilterDirection('');setFilterPayment('')}} className="text-sm text-gray-500 hover:text-danger-500">
            {t('contracts.filter.reset')} ({activeFilters})
          </button>
        )}
      </div>
      {isLoading ? <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"/>)}</div>
       : contracts.length===0 ? <EmptyState icon={FileText} title={t('contracts.empty')} description={t('contracts.emptyHint')} action={{label:t('contracts.emptyAdd'),onClick:()=>setShowForm(true)}}/>
       : <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase">
            <th className="text-left px-4 py-3">№</th><th className="text-left px-4 py-3">{t('contracts.col.student')}</th><th className="text-left px-4 py-3">{t('contracts.col.direction')}</th>
            <th className="text-left px-4 py-3">{t('contracts.col.payment')}</th><th className="text-left px-4 py-3">{t('contracts.col.amount')}</th>
            <th className="text-left px-4 py-3">{t('contracts.col.docs')}</th><th className="text-left px-4 py-3">{t('contracts.col.status')}</th>
            <th className="text-left px-4 py-3">{t('contracts.col.created')}</th>
          </tr></thead><tbody className="divide-y divide-gray-50">
            {contracts.map(c=><tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={()=>window.location.href=`/contracts/${c.id}`}>
              <td className="px-4 py-3"><span className="font-mono text-xs text-primary-700 font-semibold">{c.contractNumber}</span></td><td className="px-4 py-3"><p className="font-medium text-gray-900">{c.fullName}</p><p className="text-xs text-gray-400">{c.phone}</p></td>
              <td className="px-4 py-3 text-gray-700">{c.directionName??'—'}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{c.paymentTypeLabel??c.paymentType}</td>
              <td className="px-4 py-3 font-semibold">{c.paymentAmount?.toLocaleString()??'—'} {c.currency}</td>
              <td className="px-4 py-3">{c.hasDocuments ? <Badge variant="success">{t('contracts.docs.yes')}</Badge> : <Badge variant="default">{t('contracts.docs.no')}</Badge>}</td>
              <td className="px-4 py-3"><Badge variant={c.status==='active'?'success':'default'}>{t(`contracts.status.${c.status}`) || c.status}</Badge></td>
              <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(c.createdAt)}</td>
            </tr>)}
          </tbody></table>
        </div>}
      <ContractForm open={showForm} onClose={()=>setShowForm(false)} onCreated={(data)=>{
        setShowForm(false)
        if(data.studentLogin&&data.studentPassword) setCreds({login:data.studentLogin,password:data.studentPassword,studentId:data.studentId||''})
      }}/>
      {creds&&<CredsDialog open onClose={()=>setCreds(null)} login={creds.login} password={creds.password} studentId={creds.studentId}/>}
    </div>
  )
}

// ── Contract Form ────────────────────────────────────────────────────────────
function ContractForm({open,onClose,onCreated}:{open:boolean;onClose:()=>void;onCreated:(c:Contract)=>void}) {
  const qc = useQueryClient()
  const {data:directions=[]} = useDirections()
  const activeDirections = directions.filter(d=>d.isActive)
  const createMut = useMutation({
    mutationFn:(dto:any)=>apiClient.post<Contract>('/crm/contracts',dto).then(r=>r.data),
    onSuccess:()=>qc.invalidateQueries({queryKey:['crm','contracts']}),
    onError:(err:any)=>toast.error(err?.response?.data?.detail||'Ошибка'),
  })

  const [mode,setMode] = useState<'new'|'existing'>('new')
  const [studentSearch,setStudentSearch] = useState('')
  const [searchResults,setSearchResults] = useState<StudentResult[]>([])
  const [selectedStudent,setSelectedStudent] = useState<StudentResult|null>(null)
  const [form,setForm] = useState({fullName:'',phone:'',email:'',directionId:'',paymentType:'monthly',paymentAmount:'',currency:'UZS',startDate:'',notes:''})
  const set = (k:string,v:string)=>setForm(p=>({...p,[k]:v}))
  const selectedDir = directions.find(d=>d.id===form.directionId)

  const doSearch = useCallback(async(q:string)=>{
    if(q.length<2){setSearchResults([]);return}
    try{
      const r = await apiClient.get('/crm/contracts/students/search',{params:{q}})
      setSearchResults(r.data)
    }catch{setSearchResults([])}
  },[])

  const pickStudent = (s:StudentResult)=>{
    setSelectedStudent(s)
    setForm(p=>({...p,fullName:s.fullName,phone:s.phone||'',email:s.email||''}))
    setSearchResults([])
    setStudentSearch('')
  }

  const handleSubmit = (e:React.FormEvent)=>{
    e.preventDefault()
    if(!form.fullName||!form.phone||!form.directionId||!form.paymentAmount){toast.error('Заполните обязательные поля');return}
    createMut.mutate({
      studentId:selectedStudent?.id||undefined,
      fullName:form.fullName,phone:form.phone,email:form.email||undefined,
      directionId:form.directionId,paymentType:form.paymentType,paymentAmount:Number(form.paymentAmount),
      currency:form.currency,startDate:form.startDate||undefined,notes:form.notes||undefined,
    },{
      onSuccess:(data:Contract)=>{
        toast.success('Договор создан!')
        onCreated(data)
        setForm({fullName:'',phone:'',email:'',directionId:'',paymentType:'monthly',paymentAmount:'',currency:'UZS',startDate:'',notes:''})
        setSelectedStudent(null);setMode('new')
      },
    })
  }

  const sel = "w-full h-10 border border-gray-200 rounded px-3 text-sm bg-white focus:outline-none focus:border-primary-500"

  return (
    <Dialog open={open} onOpenChange={v=>!v&&onClose()}>
      <DialogContent size="lg">
        <DialogHeader><DialogTitle>Новый договор</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button type="button" onClick={()=>{setMode('new');setSelectedStudent(null)}} className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${mode==='new'?'bg-white shadow-sm text-gray-900':'text-gray-500'}`}>
              Новый студент
            </button>
            <button type="button" onClick={()=>setMode('existing')} className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${mode==='existing'?'bg-white shadow-sm text-gray-900':'text-gray-500'}`}>
              <UserCheck className="w-3.5 h-3.5 inline mr-1"/>Действующий студент
            </button>
          </div>

          {mode==='existing'&&!selectedStudent&&(
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Найти студента</label>
              <Input placeholder="Имя, телефон или код…" value={studentSearch} onChange={e=>{setStudentSearch(e.target.value);doSearch(e.target.value)}}/>
              {searchResults.length>0&&(
                <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
                  {searchResults.map(s=>(
                    <button key={s.id} type="button" onClick={()=>pickStudent(s)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{s.fullName}</p>
                        <p className="text-xs text-gray-400">{s.phone} · {s.studentCode}</p>
                      </div>
                      {s.hasDocuments&&<Badge variant="success" className="text-[10px]">Документы есть</Badge>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedStudent&&(
            <div className="flex items-center gap-3 p-3 bg-success-50 border border-success-200 rounded-lg">
              <UserCheck className="w-5 h-5 text-success-600"/>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{selectedStudent.fullName}</p>
                <p className="text-xs text-gray-500">{selectedStudent.phone} · {selectedStudent.studentCode}</p>
              </div>
              {selectedStudent.hasDocuments&&<Badge variant="success">Документы есть</Badge>}
              <button type="button" onClick={()=>{setSelectedStudent(null);setForm(p=>({...p,fullName:'',phone:'',email:''}))}} className="text-xs text-gray-400 hover:text-gray-600">Сменить</button>
            </div>
          )}

          {(mode==='new'||selectedStudent)&&(<>
            <div className="grid grid-cols-2 gap-4">
              {mode==='new'&&<>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">ФИО студента *</label><Input value={form.fullName} onChange={e=>set('fullName',e.target.value)} placeholder="Иванов Иван"/></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Телефон *</label><Input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+998..."/></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Email</label><Input value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email"/></div>
              </>}
              <div className={mode==='existing'?"col-span-2":""}>
                <label className="block text-xs font-medium text-gray-500 mb-1">Направление *</label>
                <Select value={form.directionId || '__none__'} onValueChange={v=>set('directionId',v==='__none__'?'':v)}>
                  <SelectTrigger><SelectValue placeholder="Выберите…"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Выберите…</SelectItem>
                    {activeDirections.map(d=><SelectItem key={d.id} value={d.id} description={`${d.durationMonths} мес. · ${d.totalLessons} уроков`}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedDir&&(
              <div className="flex gap-4 p-3 bg-primary-50 border border-primary-100 rounded-lg text-sm">
                <div><span className="text-gray-500">Длительность:</span> <strong>{selectedDir.durationMonths} мес.</strong></div>
                <div><span className="text-gray-500">Уроков:</span> <strong>{selectedDir.totalLessons}</strong></div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Вид оплаты *</label>
                <Select value={form.paymentType} onValueChange={v=>set('paymentType',v)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map(pt=><SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Сумма платежа *</label>
                <Input type="number" value={form.paymentAmount} onChange={e=>set('paymentAmount',e.target.value)} placeholder="500000"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Валюта</label>
                <Select value={form.currency} onValueChange={v=>set('currency',v)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UZS">UZS — Сум</SelectItem>
                    <SelectItem value="USD">USD — Доллар</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Дата начала</label>
                <DatePicker value={form.startDate} onChange={(v) => set('startDate', v)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Примечания</label>
              <textarea className="w-full border border-gray-200 rounded px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)}/>
            </div>
          </>)}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
            <Button type="submit" loading={createMut.isPending} disabled={mode==='existing'&&!selectedStudent}>Создать договор</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Credentials + Documents ──────────────────────────────────────────────────
function CredsDialog({open,onClose,login,password,studentId}:{open:boolean;onClose:()=>void;login:string;password:string;studentId:string}) {
  const [copied,setCopied] = useState(false)
  const [uploading,setUploading] = useState(false)
  const [docType,setDocType] = useState('passport')
  const [uploadedDocs,setUploadedDocs] = useState<string[]>([])

  const copyAll = ()=>{
    navigator.clipboard.writeText(`Логин: ${login}\nПароль: ${password}`)
    setCopied(true);toast.success('Скопировано!');setTimeout(()=>setCopied(false),2000)
  }

  const uploadDoc = async(file:File)=>{
    if(!studentId)return
    setUploading(true)
    try{
      const fd = new FormData()
      fd.append('file',file)
      fd.append('doc_type',docType)
      await apiClient.post(`/crm/contracts/students/${studentId}/documents`,fd,{headers:{'Content-Type':'multipart/form-data'}})
      toast.success(`${DOC_TYPES.find(d=>d.value===docType)?.label} загружен`)
      setUploadedDocs(p=>[...p,docType])
    }catch{toast.error('Не удалось загрузить файл')}
    finally{setUploading(false)}
  }

  return (
    <Dialog open={open} onOpenChange={v=>!v&&onClose()}>
      <DialogContent size="md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-success-600"/>Договор создан</DialogTitle></DialogHeader>
        <div className="space-y-5">
          {/* Credentials */}
          {password&&(<>
            <p className="text-sm text-gray-600">Аккаунт студента создан. Данные показываются один раз!</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div><p className="text-xs text-gray-400">Логин</p><p className="text-sm font-mono font-semibold">{login}</p></div>
              <div><p className="text-xs text-gray-400">Пароль</p><p className="text-sm font-mono font-semibold">{password}</p></div>
            </div>
            <Button onClick={copyAll} variant="secondary" className="w-full">
              {copied?<Check className="w-4 h-4"/>:<Copy className="w-4 h-4"/>}{copied?'Скопировано!':'Скопировать'}
            </Button>
          </>)}

          {/* Document upload */}
          {studentId&&(
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><FileUp className="w-4 h-4"/>Загрузить документы</p>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <select className="w-full h-9 border border-gray-200 rounded px-2 text-sm" value={docType} onChange={e=>setDocType(e.target.value)}>
                    {DOC_TYPES.map(d=><option key={d.value} value={d.value} disabled={uploadedDocs.includes(d.value)}>{d.label}{uploadedDocs.includes(d.value)?' ✓':''}</option>)}
                  </select>
                </div>
                <label className={`flex items-center gap-1.5 px-3 h-9 rounded border text-sm font-medium cursor-pointer transition-colors ${uploading?'opacity-50 pointer-events-none':'border-primary-300 text-primary-700 hover:bg-primary-50'}`}>
                  <Upload className="w-3.5 h-3.5"/>Выбрать файл
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e=>{const f=e.target.files?.[0];if(f)uploadDoc(f);e.target.value=''}} disabled={uploading}/>
                </label>
              </div>
              {uploadedDocs.length>0&&(
                <div className="flex gap-1 mt-2 flex-wrap">
                  {uploadedDocs.map(d=><Badge key={d} variant="success" className="text-[10px]">{DOC_TYPES.find(t=>t.value===d)?.label} ✓</Badge>)}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter><Button onClick={onClose}>Закрыть</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
