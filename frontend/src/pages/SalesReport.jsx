import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
// Layout removed per app-level layout usage
import { useTranslation } from 'react-i18next'
import { FaBullseye, FaClipboardList, FaFileSignature, FaClipboardCheck, FaHandshake, FaTimesCircle } from 'react-icons/fa'
import { api } from '../utils/api'

export default function SalesReport() {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const isRTL = isArabic
  const navigate = useNavigate()

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeTab, setActiveTab] = useState('opportunities')
  const [page, setPage] = useState(1)
  const pageSize = 10
  // Added per-section filters
  const [opportunitiesStatus, setOpportunitiesStatus] = useState('all')
  const [opportunitiesOwner, setOpportunitiesOwner] = useState('all')
  const [cilsProject, setCilsProject] = useState('all')
  const [cilsDeveloper, setCilsDeveloper] = useState('all')
  const [cilsAgent, setCilsAgent] = useState('all')
  const [eoiStatus, setEoiStatus] = useState('all')
  const [eoiProject, setEoiProject] = useState('all')
  const [reservationStatus, setReservationStatus] = useState('all')
  const [dealsStatus, setDealsStatus] = useState('all')
  const [cancelReason, setCancelReason] = useState('')

  // New manager/employee filters
  const [managerFilter, setManagerFilter] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')

  // Data States
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    fetchOpportunities()
  }, [])

  const fetchOpportunities = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/opportunities')
      const data = response.data.data || response.data
      // Map API data to report format if needed
      // Assuming API returns { id, name, customer_id, amount, status, created_at, ... }
      // And report expects { id, name, customer, owner, value, status, createdAt }
      const mapped = (Array.isArray(data) ? data : []).map(item => ({
        ...item,
        value: item.amount, // Map amount to value
        createdAt: item.created_at ? item.created_at.substring(0, 10) : '',
        customer: item.customer?.name || item.customer_id, // Adjust based on relation loading
        owner: item.user?.name || 'Unknown' // Adjust based on relation
      }))
      setOpportunities(mapped)
    } catch (error) {
      console.error('Error fetching opportunities:', error)
    } finally {
      setLoading(false)
    }
  }

  // Legacy calls dataset removed; CILs model used below

  const eoi = [
    { id: 1, lead: 'Hassan Ali', project: 'Project X', date: '2025-09-30', status: 'interested' },
    { id: 2, lead: 'Mona Saleh', project: 'Project Y', date: '2025-10-02', status: 'interested' },
  ]

  const reservations = [
    { id: 1, lead: 'Ola Sami', unit: 'APT-12B', date: '2025-10-01', status: 'confirmed' },
    { id: 2, lead: 'Karim Mostafa', unit: 'APT-09A', date: '2025-10-06', status: 'cancelled' },
  ]

  const deals = [
    { id: 1, customer: 'Ahmed Ali', amount: 45000, date: '2025-10-05', status: 'won' },
    { id: 2, customer: 'Sara Mohamed', amount: 27000, date: '2025-09-22', status: 'lost' },
    { id: 3, customer: 'Omar Hassan', amount: 18000, date: '2025-10-04', status: 'won' },
  ]

  const cancelReasons = [
    { id: 1, reason: isArabic ? 'السعر مرتفع' : 'High Price', count: 6 },
    { id: 2, reason: isArabic ? 'عدم اهتمام' : 'Not Interested', count: 4 },
    { id: 3, reason: isArabic ? 'تأجيل القرار' : 'Decision Delayed', count: 3 },
  ]

  // Derived metrics
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const openedThisMonth = opportunities.filter(o => (o.createdAt || '').startsWith(currentMonthStr)).length
  const openChances = opportunities.filter(o => o.status === 'open').length
  const missedChances = opportunities.filter(o => o.status === 'missed').length
  const closedChances = opportunities.filter(o => o.status === 'closed').length + deals.filter(d => d.status === 'won' && d.date.startsWith(currentMonthStr)).length
  const closedThisMonth = deals.filter(d => d.status === 'won' && d.date.startsWith(currentMonthStr)).length
  const remaining = Math.max(openChances - closedChances, 0)

  const tabs = [
    { key: 'opportunities', label: t('Opportunities', 'Opportunities'), icon: FaBullseye },
    { key: 'cils', label: t('Cils', 'Cils'), icon: FaClipboardList },
    { key: 'eoi', label: t('EOI', 'EOI'), icon: FaFileSignature },
    { key: 'reservation', label: t('Reservation', 'Reservation'), icon: FaClipboardCheck },
    { key: 'deals', label: t('Deals', 'Deals'), icon: FaHandshake },
    { key: 'cancel_reasons', label: t('Cancel Reasons', 'Cancel Reasons'), icon: FaTimesCircle },
  ]

  const tabColor = useMemo(() => {
    switch (activeTab) {
      case 'opportunities': return '#2563eb'
      case 'cils': return '#10b981'
      case 'eoi': return '#f59e0b'
      case 'reservation': return '#8b5cf6'
      case 'deals': return '#14b8a6'
      case 'cancel_reasons': return '#ef4444'
      default: return '#9ca3af'
    }
  }, [activeTab])

  // Tab indicator sizing and positioning
  const btnGroupRef = useRef(null)
  const btnRefs = useRef({})
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const measure = () => {
      const activeEl = btnRefs.current[activeTab]
      const groupEl = btnGroupRef.current
      if (!activeEl || !groupEl) return
      const rect = activeEl.getBoundingClientRect()
      const groupRect = groupEl.getBoundingClientRect()
      setTabIndicator({ left: rect.left - groupRect.left, width: rect.width })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeTab])

  const filteredByDate = (arr) => {
    if (!dateFrom && !dateTo) return arr
    return arr.filter(item => {
      const k = item.date || item.createdAt || ''
      if (!k) return false
      if (dateFrom && k < dateFrom) return false
      if (dateTo && k > dateTo) return false
      return true
    })
  }

  // cils moved earlier for correct initialization order

  // Replace calls with CILs dataset and localStorage persistence
  const [cils, setCils] = useState(() => {
    try {
      const stored = localStorage.getItem('sales_cils')
      if (stored) return JSON.parse(stored)
    } catch {}
    return [
      { id: 1, client: 'Ahmed Ali', phone: '0100000000', email: 'ahmed@example.com', project: 'Project X', developer: 'DevCo', agent: 'Sara Mohamed', date: '2025-10-09' },
      { id: 2, client: 'Fatima Ali', phone: '0111111111', email: 'fatima@example.com', project: 'Project Y', developer: 'Alpha Dev', agent: 'Khaled Ibrahim', date: '2025-10-08' },
    ]
  })

  useEffect(() => {
    try { localStorage.setItem('sales_cils', JSON.stringify(cils)) } catch {}
  }, [cils])

  const currentData = useMemo(() => {
    switch (activeTab) {
      case 'opportunities': {
        let arr = filteredByDate(opportunities)
        if (opportunitiesStatus !== 'all') arr = arr.filter(r => r.status === opportunitiesStatus)
        if (opportunitiesOwner !== 'all') arr = arr.filter(r => r.owner === opportunitiesOwner)
        return arr
      }
      case 'cils': {
        let arr = filteredByDate(cils)
        if (cilsProject !== 'all') arr = arr.filter(r => r.project === cilsProject)
        if (cilsDeveloper !== 'all') arr = arr.filter(r => r.developer === cilsDeveloper)
        if (cilsAgent !== 'all') arr = arr.filter(r => r.agent === cilsAgent)
        return arr
      }
      case 'eoi': {
        let arr = filteredByDate(eoi)
        if (eoiStatus !== 'all') arr = arr.filter(r => r.status === eoiStatus)
        if (eoiProject !== 'all') arr = arr.filter(r => r.project === eoiProject)
        return arr
      }
      case 'reservation': {
        let arr = filteredByDate(reservations)
        if (reservationStatus !== 'all') arr = arr.filter(r => r.status === reservationStatus)
        return arr
      }
      case 'deals': {
        let arr = filteredByDate(deals)
        if (dealsStatus !== 'all') arr = arr.filter(r => r.status === dealsStatus)
        return arr
      }
      case 'cancel_reasons': {
        let arr = cancelReasons
        if (cancelReason) {
          const q = cancelReason.toLowerCase()
          arr = arr.filter(r => String(r.reason).toLowerCase().includes(q))
        }
        return arr
      }
      default:
        return []
    }
  }, [activeTab, dateFrom, dateTo, opportunitiesStatus, opportunitiesOwner, cilsProject, cilsDeveloper, cilsAgent, eoiStatus, eoiProject, reservationStatus, dealsStatus, cancelReason])

  const totalPages = Math.max(1, Math.ceil(currentData.length / pageSize))
  const pageData = currentData.slice((page - 1) * pageSize, page * pageSize)

  // Helpers for stats
  const toSeconds = (mmss) => {
    if (!mmss) return 0
    const [mm, ss] = String(mmss).split(':').map(n => parseInt(n || '0', 10))
    return (isNaN(mm) ? 0 : mm) * 60 + (isNaN(ss) ? 0 : ss)
  }
  const toMMSS = (secs) => {
    const m = Math.floor(secs / 60)
    const s = Math.max(0, Math.floor(secs % 60))
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  /* Legacy sectionKpis removed; new KPIs for CILs defined below */

  const onApplyFilters = () => {
    setPage(1)
  }

  const toCSV = (rows) => {
    if (!rows || !rows.length) return ''
    const keys = Object.keys(rows[0])
    const header = keys.join(',')
    const lines = rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))
    return [header, ...lines].join('\n')
  }

  const downloadCSV = (name, csv) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }

  const onExportReport = () => {
    const summary = [
      { metric: t('Opened This Month', 'Opened This Month'), value: openedThisMonth },
      { metric: t('Closed This Month', 'Closed This Month'), value: closedThisMonth },
      { metric: t('Open Chances', 'Open Chances'), value: openChances },
      { metric: t('Missed Chances', 'Missed Chances'), value: missedChances },
      { metric: t('Remaining', 'Remaining'), value: remaining },
      { metric: t('Closed Chances', 'Closed Chances'), value: closedChances },
    ]
    downloadCSV('sales_report_summary.csv', toCSV(summary))
  }

  // onExportList defined earlier; removed duplicate to fix redeclaration error.

  /* cils moved earlier for correct initialization order */

  /* currentData block moved above totalPages for correct initialization order */

  const sectionKpis = useMemo(() => {
    const arr = currentData
    switch (activeTab) {
      case 'opportunities':
        return [
          { label: t('Opened This Month', 'Opened This Month'), value: openedThisMonth, color: 'bg-blue-500' },
          { label: t('Closed This Month', 'Closed This Month'), value: closedThisMonth, color: 'bg-green-500' },
          { label: t('Open Chances', 'Open Chances'), value: openChances, color: 'bg-indigo-500' },
          { label: t('Missed Chances', 'Missed Chances'), value: missedChances, color: 'bg-red-500' },
          { label: t('Remaining', 'Remaining'), value: remaining, color: 'bg-amber-500' },
          { label: t('Closed Chances', 'Closed Chances'), value: closedChances, color: 'bg-teal-500' },
        ]
      case 'cils': {
        const total = arr.length
        const thisMonth = arr.filter(r => (r.date || '').startsWith(currentMonthStr)).length
        const projects = new Set(arr.map(r => r.project)).size
        const developers = new Set(arr.map(r => r.developer)).size
        const agents = new Set(arr.map(r => r.agent)).size
        return [
          { label: t('Total CILs', 'Total CILs'), value: total, color: 'bg-blue-500' },
          { label: t('This Month', 'This Month'), value: thisMonth, color: 'bg-amber-600' },
          { label: t('Projects', 'Projects'), value: projects, color: 'bg-violet-600' },
          { label: t('Developers', 'Developers'), value: developers, color: 'bg-indigo-600' },
          { label: t('Agents', 'Agents'), value: agents, color: 'bg-emerald-600' },
        ]
      }
      case 'eoi': {
        const total = arr.length
        const interested = arr.filter(r => r.status === 'interested').length
        const projects = new Set(arr.map(r => r.project)).size
        const thisMonth = arr.filter(r => (r.date || '').startsWith(currentMonthStr)).length
        return [
          { label: t('Total EOI', 'Total EOI'), value: total, color: 'bg-orange-500' },
          { label: t('Interested', 'Interested'), value: interested, color: 'bg-emerald-600' },
          { label: t('Projects', 'Projects'), value: projects, color: 'bg-violet-600' },
          { label: t('This Month', 'This Month'), value: thisMonth, color: 'bg-amber-600' },
        ]
      }
      case 'reservation': {
        const total = arr.length
        const confirmed = arr.filter(r => r.status === 'confirmed').length
        const cancelled = arr.filter(r => r.status === 'cancelled').length
        const thisMonth = arr.filter(r => (r.date || '').startsWith(currentMonthStr)).length
        return [
          { label: t('Total Reservations', 'Total Reservations'), value: total, color: 'bg-purple-500' },
          { label: t('Confirmed', 'Confirmed'), value: confirmed, color: 'bg-emerald-600' },
          { label: t('Cancelled', 'Cancelled'), value: cancelled, color: 'bg-red-600' },
          { label: t('This Month', 'This Month'), value: thisMonth, color: 'bg-amber-600' },
        ]
      }
      case 'deals': {
        const total = arr.length
        const won = arr.filter(r => r.status === 'won').length
        const lost = arr.filter(r => r.status === 'lost').length
        const wonThisMonth = arr.filter(r => r.status === 'won' && (r.date || '').startsWith(currentMonthStr)).length
        return [
          { label: t('Total Deals', 'Total Deals'), value: total, color: 'bg-teal-500' },
          { label: t('Won', 'Won'), value: won, color: 'bg-emerald-600' },
          { label: t('Lost', 'Lost'), value: lost, color: 'bg-red-600' },
          { label: t('Won This Month', 'Won This Month'), value: wonThisMonth, color: 'bg-blue-600' },
        ]
      }
      case 'cancel_reasons': {
        const totalCancelled = arr.reduce((acc, r) => acc + (r.count || 0), 0)
        const topCount = arr.length ? Math.max(...arr.map(r => r.count || 0)) : 0
        const uniqueReasons = arr.length
        return [
          { label: t('Total Cancellations', 'Total Cancellations'), value: totalCancelled, color: 'bg-red-600' },
          { label: t('Top Reason Count', 'Top Reason Count'), value: topCount, color: 'bg-pink-600' },
          { label: t('Unique Reasons', 'Unique Reasons'), value: uniqueReasons, color: 'bg-gray-600' },
        ]
      }
      default:
        return []
    }
  }, [activeTab, currentData])

  const onExportList = () => {
    downloadCSV(`sales_${activeTab}_list.csv`, toCSV(currentData))
  }

  // Add CIL form state and handler
  const todayStr = new Date().toISOString().slice(0, 10)
  const [cilForm, setCilForm] = useState({ client: '', phone: '', email: '', project: '', developer: '', agent: '', date: todayStr })
  const onAddCil = () => {
    const { client, project, agent } = cilForm
    if (!client || !project || !agent) {
      alert(i18n.language === 'ar' ? 'من فضلك أكمل الحقول المطلوبة: العميل، المشروع، الوسيط' : 'Please fill required fields: client, project, agent')
      return
    }
    const id = Date.now()
    setCils(prev => [{ id, ...cilForm }, ...prev])
    setCilForm({ client: '', phone: '', email: '', project: '', developer: '', agent: '', date: todayStr })
  }

  return (
    <>
      <BackButton to="/reports" />
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('Sales Report')}</h1>
        <div className="flex items-center gap-2">
          <button onClick={onExportReport} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border btn-glass">
            {t('Export Report')}
          </button>
          <button onClick={onExportList} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border btn-glass">
            {t('Export Data')}
          </button>
        </div>
      </div>
      <div className="space-y-6">
        {/* Filters */}
        <div className="card glass-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('From')}</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input" placeholder={t('Date Input Placeholder')} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('To')}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input" placeholder={t('Date Input Placeholder')} />
            </div>

            {activeTab === 'opportunities' && (
              <>
                <div className="flex flex-col">
                  <label className="text-sm text-[var(--muted-text)]">{t('Status')}</label>
                  <select value={opportunitiesStatus} onChange={e => setOpportunitiesStatus(e.target.value)} className="input">
                    <option value="all">{t('All', 'All')}</option>
                    <option value="open">{t('Open', 'Open')}</option>
                    <option value="missed">{t('Missed', 'Missed')}</option>
                    <option value="closed">{t('Closed', 'Closed')}</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-[var(--muted-text)]">{t('Owner')}</label>
                  <select value={opportunitiesOwner} onChange={e => setOpportunitiesOwner(e.target.value)} className="input">
                    <option value="all">{t('All', 'All')}</option>
                    {[...new Set(opportunities.map(o => o.owner))].map(o => (<option key={o} value={o}>{o}</option>))}
                  </select>
                </div>
              </>
            )}

            {activeTab === 'cils' && (
              <>
                <div className="flex flex-col">
                  <label className="text-sm text-[var(--muted-text)]">Project</label>
                  <select value={cilsProject} onChange={e => setCilsProject(e.target.value)} className="input">
                    <option value="all">{t('All', 'All')}</option>
                    {[...new Set(cils.map(e => e.project))].map(p => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-[var(--muted-text)]">{t('Developer', 'Developer')}</label>
                  <select value={cilsDeveloper} onChange={e => setCilsDeveloper(e.target.value)} className="input">
                    <option value="all">{t('All', 'All')}</option>
                    {[...new Set(cils.map(e => e.developer))].map(d => (<option key={d} value={d}>{d}</option>))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-[var(--muted-text)]">{t('Agent', 'Agent')}</label>
                  <select value={cilsAgent} onChange={e => setCilsAgent(e.target.value)} className="input">
                    <option value="all">{t('All', 'All')}</option>
                    {[...new Set(cils.map(e => e.agent))].map(a => (<option key={a} value={a}>{a}</option>))}
                  </select>
                </div>
              </>
            )}

            {activeTab === 'eoi' && (
              <>
                <div className="flex flex-col">
                  <label className="text-sm text-[var(--muted-text)]">{t('Status')}</label>
                  <select value={eoiStatus} onChange={e => setEoiStatus(e.target.value)} className="input">
                    <option value="all">{t('All', 'All')}</option>
                    <option value="interested">{t('Interested', 'Interested')}</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-[var(--muted-text)]">Project</label>
                  <select value={eoiProject} onChange={e => setEoiProject(e.target.value)} className="input">
                    <option value="all">{t('All', 'All')}</option>
                    {[...new Set(eoi.map(e => e.project))].map(p => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
              </>
            )}

            {activeTab === 'reservation' && (
              <div className="flex flex-col">
                <label className="text-sm text-[var(--muted-text)]">{t('Status')}</label>
                <select value={reservationStatus} onChange={e => setReservationStatus(e.target.value)} className="input">
                  <option value="all">{t('All', 'All')}</option>
                  <option value="confirmed">{t('Confirmed', 'Confirmed')}</option>
                  <option value="cancelled">{t('Cancelled', 'Cancelled')}</option>
                </select>
              </div>
            )}

            {activeTab === 'deals' && (
              <div className="flex flex-col">
                <label className="text-sm text-[var(--muted-text)]">{t('Status')}</label>
                <select value={dealsStatus} onChange={e => setDealsStatus(e.target.value)} className="input">
                  <option value="all">{t('All', 'All')}</option>
                  <option value="won">{t('Won', 'Won')}</option>
                  <option value="lost">{t('Lost', 'Lost')}</option>
                </select>
              </div>
            )}

            {activeTab === 'cancel_reasons' && (
              <div className="flex flex-col">
                <label className="text-sm text-[var(--muted-text)]">{t('Reason')}</label>
                <input type="text" value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="input" placeholder={t('Search', 'Search')} />
              </div>
            )}

            <button onClick={onApplyFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border btn-glass">
              {t('Apply Filters')}
            </button>
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border btn-glass">
              {t('Reset')}
            </button>
          </div>
        </div>


         {/* Tabs */}
         <div className="card glass-card p-3">
          <div ref={btnGroupRef} className="relative flex flex-wrap gap-4">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  ref={el => { btnRefs.current[tab.key] = el }}
                  onClick={() => { setActiveTab(tab.key); setPage(1) }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm ${activeTab === tab.key ? 'bg-blue-600 text-white border-blue-600' : 'btn-glass'}`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {tab.label}
                </button>
              )})}
            <div
              className="absolute bottom-0 h-1 rounded transition-all"
              style={{ left: tabIndicator.left, width: tabIndicator.width, background: tabColor }}
            ></div>
          </div>
        </div>

        {sectionKpis.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {sectionKpis.map((kpi, idx) => (
              <div key={idx} className="card glass-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-text)]">{kpi.label}</span>
                  <span className={`inline-block w-2 h-2 rounded-full ${kpi.color}`}></span>
                </div>
                <div className="mt-2 text-2xl font-semibold">{kpi.value}</div>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'cils' && (
          <div className="card glass-card p-4">
            <h3 className="text-sm font-medium mb-3">{t('Add CIL', 'Add CIL')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="input" placeholder={t('Client', 'Client')} value={cilForm.client} onChange={e => setCilForm({ ...cilForm, client: e.target.value })} />
              <input className="input" placeholder={t('Phone', 'Phone')} value={cilForm.phone} onChange={e => setCilForm({ ...cilForm, phone: e.target.value })} />
              <input className="input" placeholder={t('Email', 'Email')} value={cilForm.email} onChange={e => setCilForm({ ...cilForm, email: e.target.value })} />
              <input className="input" placeholder="Project" value={cilForm.project} onChange={e => setCilForm({ ...cilForm, project: e.target.value })} />
              <input className="input" placeholder={t('Developer', 'Developer')} value={cilForm.developer} onChange={e => setCilForm({ ...cilForm, developer: e.target.value })} />
              <input className="input" placeholder={t('Agent', 'Agent')} value={cilForm.agent} onChange={e => setCilForm({ ...cilForm, agent: e.target.value })} />
              <input type="date" className="input" value={cilForm.date} onChange={e => setCilForm({ ...cilForm, date: e.target.value })} />
            </div>
            <div className="mt-3">
              <button onClick={onAddCil} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border btn-glass">
                {t('Add', 'Add')}
              </button>
            </div>
          </div>
        )}

        {/* Data List */}
        <div className="card glass-card p-0">
          <div className="px-4 py-3 bg-transparent border-b flex items-center justify-between">
            <h2 className="text-sm font-medium">{t('Data List')}</h2>
            <span className="text-xs text-[var(--muted-text)]">{t('Show Entries')} {pageData.length}</span>
          </div>

        {/* Mobile Cards View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {pageData.length === 0 && (
             <div className="text-center py-8 text-gray-500 dark:text-gray-400">
               {t('No data')}
             </div>
          )}
          {pageData.map((row, idx) => (
            <div key={idx} className="card glass-card p-4 space-y-3 bg-white/5 border border-gray-800 rounded-lg">
              {activeTab === 'opportunities' && (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm dark:text-white">{row.customer}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{row.owner}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.status === 'open' ? 'bg-blue-100 text-blue-800' :
                      row.status === 'closed' ? 'bg-green-100 text-green-800' :
                      row.status === 'missed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {row.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 border-t border-white/10 dark:border-gray-700/50 pt-3">
                    <span className="font-medium">{row.value}</span>
                    <span>{row.createdAt}</span>
                  </div>
                </>
              )}
              
              {activeTab === 'cils' && (
                 <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm dark:text-white">{row.client}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{row.project}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-medium dark:text-white">{row.phone}</p>
                       <p className="text-xs text-gray-500">{row.date}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 border-t border-white/10 dark:border-gray-700/50 pt-3">
                    <div>
                      <span className="block font-medium mb-1">{t('Developer', 'Developer')}</span>
                      {row.developer}
                    </div>
                    <div>
                      <span className="block font-medium mb-1">{t('Agent', 'Agent')}</span>
                      {row.agent}
                    </div>
                  </div>
                 </>
              )}

              {activeTab === 'eoi' && (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm dark:text-white">{row.lead}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{row.project}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {row.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-white/10 dark:border-gray-700/50 pt-3">
                    <span>{row.date}</span>
                  </div>
                </>
              )}

              {activeTab === 'reservation' && (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm dark:text-white">{row.lead}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{row.unit}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                       row.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {row.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-white/10 dark:border-gray-700/50 pt-3">
                    <span>{row.date}</span>
                  </div>
                </>
              )}

              {activeTab === 'deals' && (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm dark:text-white">{row.customer}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{row.amount}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                       row.status === 'won' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {row.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-white/10 dark:border-gray-700/50 pt-3">
                    <span>{row.date}</span>
                  </div>
                </>
              )}

              {activeTab === 'cancel_reasons' && (
                <div className="flex justify-between items-center">
                   <span className="font-medium text-sm dark:text-white">{row.reason}</span>
                   <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{row.count}</span>
                </div>
              )}

            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
            <table className="nova-table nova-table--glass w-full text-sm min-w-[700px]">
              <thead>
                <tr>
                  {activeTab === 'opportunities' && (
                    <>
                      <th>{t('Customer')}</th>
                      <th>{t('Assigned')}</th>
                      <th>{t('Value')}</th>
                      <th>{t('Status')}</th>
                      <th>{t('Last Contact')}</th>
                    </>
                  )}
                  {activeTab === 'cils' && (
                    <>
                      <th>{t('Client', 'Client')}</th>
                      <th>{t('Phone', 'Phone')}</th>
                      <th>{t('Email', 'Email')}</th>
                      <th>Project</th>
                      <th>{t('Developer', 'Developer')}</th>
                      <th>{t('Agent', 'Agent')}</th>
                      <th>{t('Date', 'Date')}</th>
                    </>
                  )}
                  {activeTab === 'eoi' && (
                    <>
                      <th>{t('Lead')}</th>
                      <th>Project</th>
                      <th>{t('Date Range')}</th>
                      <th>{t('Status')}</th>
                    </>
                  )}
                  {activeTab === 'reservation' && (
                    <>
                      <th>{t('Lead')}</th>
                      <th>Unit</th>
                      <th>{t('Date Range')}</th>
                      <th>{t('Status')}</th>
                    </>
                  )}
                  {activeTab === 'deals' && (
                    <>
                      <th>{t('Customer')}</th>
                      <th>{t('Value')}</th>
                      <th>{t('Date Range')}</th>
                      <th>{t('Status')}</th>
                    </>
                  )}
                  {activeTab === 'cancel_reasons' && (
                    <>
                      <th>{t('Reason', 'Reason')}</th>
                      <th>{t('Count', 'Count')}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-[var(--muted-text)]">{t('No data')}</td>
                  </tr>
                )}
                {activeTab === 'opportunities' && pageData.map(row => (
                  <tr key={row.id}>
                    <td>{row.customer}</td>
                    <td>{row.owner}</td>
                    <td>{row.value}</td>
                    <td>{row.status}</td>
                    <td>{row.createdAt}</td>
                  </tr>
                ))}
                {activeTab === 'cils' && pageData.map(row => (
                   <tr key={row.id}>
                     <td>{row.client}</td>
                     <td>{row.phone}</td>
                     <td>{row.email}</td>
                     <td>{row.project}</td>
                     <td>{row.developer}</td>
                     <td>{row.agent}</td>
                     <td>{row.date}</td>
                   </tr>
                 ))}
                {activeTab === 'eoi' && pageData.map(row => (
                  <tr key={row.id}>
                    <td>{row.lead}</td>
                    <td>{row.project}</td>
                    <td>{row.date}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
                {activeTab === 'reservation' && pageData.map(row => (
                  <tr key={row.id}>
                    <td>{row.lead}</td>
                    <td>{row.unit}</td>
                    <td>{row.date}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
                {activeTab === 'deals' && pageData.map(row => (
                  <tr key={row.id}>
                    <td>{row.customer}</td>
                    <td>{row.amount}</td>
                    <td>{row.date}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
                {activeTab === 'cancel_reasons' && pageData.map(row => (
                  <tr key={row.id}>
                    <td>{row.reason}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <nav className="flex items-center justify-between p-4" aria-label="Table navigation">
            <span className="text-sm text-[var(--muted-text)]">
              {t('Show Entries')} {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, currentData.length)} / {currentData.length}
            </span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-[var(--dropdown-bg)] hover:bg-[var(--table-row-hover)] disabled:opacity-50">
                {t('Previous')}
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-[var(--dropdown-bg)] hover:bg-[var(--table-row-hover)] disabled:opacity-50">
                {t('Next')}
              </button>
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}
