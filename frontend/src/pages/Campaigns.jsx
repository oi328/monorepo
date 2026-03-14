import { useEffect, useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { api, logExportEvent } from '../utils/api'
import { useAppState } from '../shared/context/AppStateProvider'
import { FaPlus, FaFilter, FaChevronDown, FaSearch, FaEdit, FaTrash, FaFileExport, FaFileExcel, FaFilePdf, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import SearchableSelect from '../components/SearchableSelect'

// Alias for compatibility
const ChevronDown = FaChevronDown
const ChevronLeft = FaChevronLeft
const ChevronRight = FaChevronRight

export default function Campaigns() {
  const { i18n } = useTranslation()
  const isArabic = (i18n?.language || '').toLowerCase().startsWith('ar')
  const { user } = useAppState()

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const hasExplicitMarketingPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Marketing')
  const marketingModulePerms = hasExplicitMarketingPerms && Array.isArray(modulePermissions.Marketing) ? modulePermissions.Marketing : []
  const effectiveMarketingPerms = hasExplicitMarketingPerms ? marketingModulePerms : (() => {
    const role = user?.role || ''
    if (role === 'Director') return ['showMarketingDashboard', 'showCampaign', 'addLandingPage', 'integration']
    if (role === 'Marketing Manager') return ['showMarketingDashboard', 'showCampaign', 'addLandingPage', 'integration']
    if (role === 'Marketing Moderator') return ['showMarketingDashboard', 'showCampaign']
    if (role === 'Sales Admin') return ['showMarketingDashboard', 'showCampaign', 'addLandingPage']
    return []
  })()
  const roleLower = String(user?.role || '').toLowerCase()
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'

  const canManageCampaigns =
    effectiveMarketingPerms.includes('showCampaign') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  const [campaigns, setCampaigns] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters] = useState({ 
    search: '', 
    source: '',
    status: '',
    budgetType: '',
    createdBy: '',
    startDateFrom: '',
    startDateTo: '',
    endDateFrom: '',
    endDateTo: '',
    budgetMin: '',
    budgetMax: '',
    cplMin: '',
    cplMax: '',
    cpaMin: '',
    cpaMax: '',
    convMin: '',
    convMax: '',
    cpdMin: '',
    cpdMax: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef(null)
  
  // Selection
  const [selectedItems, setSelectedItems] = useState([])

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(paginatedCampaigns.map(i => i.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectRow = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const [form, setForm] = useState({
    id: null,
    name: '',
    source: '',
    budgetType: 'daily',
    totalBudget: '',
    currency: 'EGP',
    startDate: '',
    endDate: '',
    landingPage: '',
    notes: '',
    status: 'Active'
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [landingPages, setLandingPages] = useState([])
  const [leadsData, setLeadsData] = useState([])
  const [sources, setSources] = useState([])
  const [usersList, setUsersList] = useState([])

  // Load Data
  const fetchCampaigns = async () => {
    try {
      const { data } = await api.get('/api/campaigns')
      if (data && data.data) {
        setCampaigns(data.data)
      } else if (Array.isArray(data)) {
        setCampaigns(data)
      }
    } catch (err) {
      console.error('Failed to load campaigns', err)
    }
  }

  const fetchSources = async () => {
    try {
      const { data } = await api.get('/api/sources')
      if (Array.isArray(data)) {
        setSources(data)
      } else if (data && Array.isArray(data.data)) {
        setSources(data.data)
      }
    } catch (err) {
      console.error('Failed to load sources', err)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/api/users')
      if (Array.isArray(data)) {
        setUsersList(data)
      } else if (data && Array.isArray(data.data)) {
        setUsersList(data.data)
      }
    } catch (err) {
      console.error('Failed to load users', err)
    }
  }

  const fetchLandingPages = async () => {
    try {
      const { data } = await api.get('/api/landing-pages')
      if (data && data.data) {
        setLandingPages(data.data)
      } else if (Array.isArray(data)) {
        setLandingPages(data)
      }
    } catch (err) {
      console.error('Failed to load landing pages', err)
    }
  }

  useEffect(() => {
    fetchCampaigns()
    fetchSources()
    fetchUsers()
    fetchLandingPages()
  }, [])

  // Sync leads data from API for CPL/CPA/Conversion calculations
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data } = await api.get('/api/leads')
        if (data && data.data) {
           setLeadsData(data.data)
        }
      } catch (err) {
        console.error('Failed to load leads for stats', err)
      }
    }
    fetchLeads()
  }, [])

  const normalize = (s) => String(s || '').toLowerCase().trim()
  const getDays = (start, end) => {
    if (!start || !end) return 0
    const s = new Date(start)
    const e = new Date(end)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0
    const diffMs = e.getTime() - s.getTime()
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1
    return Math.max(1, days)
  }
  const getPlannedSpend = (c) => {
    const total = Number(c.totalBudget) || 0
    if (c.budgetType === 'daily') {
      const d = getDays(c.startDate, c.endDate)
      return d > 0 ? total * d : total
    }
    return total
  }
  const getCostPerDay = (c) => {
    const total = Number(c.totalBudget) || 0
    if (c.budgetType === 'daily') return total
    const d = getDays(c.startDate, c.endDate)
    return d > 0 ? (total / d) : 0
  }
  const getCampaignLeadsStats = (campaignName) => {
    const leads = leadsData.filter(l => normalize(l.campaign) === normalize(campaignName))
    const totalLeads = leads.length
    const closed = leads.filter(l => normalize(l.stage) === 'closed').length
    return { totalLeads, closed }
  }

  // Filtering
  const filteredCampaigns = useMemo(() => {
    const toNum = (v) => {
      if (v === '' || v === null || v === undefined) return null
      const n = Number(v)
      return isFinite(n) ? n : null
    }
    const toMs = (d) => {
      const t = new Date(d).getTime()
      return isFinite(t) ? t : null
    }
    const sFrom = toMs(filters.startDateFrom)
    const sTo = toMs(filters.startDateTo)
    const eFrom = toMs(filters.endDateFrom)
    const eTo = toMs(filters.endDateTo)
    const bMin = toNum(filters.budgetMin)
    const bMax = toNum(filters.budgetMax)
    const cplMin = toNum(filters.cplMin)
    const cplMax = toNum(filters.cplMax)
    const cpaMin = toNum(filters.cpaMin)
    const cpaMax = toNum(filters.cpaMax)
    const convMin = toNum(filters.convMin)
    const convMax = toNum(filters.convMax)
    const cpdMin = toNum(filters.cpdMin)
    const cpdMax = toNum(filters.cpdMax)
    return campaigns.filter(c => {
      if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase())) return false
      if (filters.source && c.source !== filters.source) return false
      if (filters.status && c.status && c.status !== filters.status) return false
      if (filters.budgetType && c.budgetType !== filters.budgetType) return false
      if (filters.createdBy && c.createdBy !== filters.createdBy) return false
      const sMs = toMs(c.startDate)
      const eMs = toMs(c.endDate)
      if (sFrom && (!sMs || sMs < sFrom)) return false
      if (sTo && (!sMs || sMs > sTo)) return false
      if (eFrom && (!eMs || eMs < eFrom)) return false
      if (eTo && (!eMs || eMs > eTo)) return false
      const budget = Number(c.totalBudget) || 0
      if (bMin != null && budget < bMin) return false
      if (bMax != null && budget > bMax) return false
      
      let cpl, cpa, conv, cpd
      
      if (c.provider === 'meta' || c.provider === 'google') {
          cpl = Number(c.cpl) || 0
          cpa = Number(c.cpa) || 0
          conv = Number(c.conversionRate) || 0
          cpd = Number(c.cpd) || 0
      } else {
          const spend = getPlannedSpend(c)
          const { totalLeads, closed } = getCampaignLeadsStats(c.name)
          cpl = totalLeads > 0 ? (spend / totalLeads) : 0
          cpa = closed > 0 ? (spend / closed) : 0
          conv = totalLeads > 0 ? (closed / totalLeads) * 100 : 0
          cpd = getCostPerDay(c)
      }

      if (cplMin != null && cpl < cplMin) return false
      if (cplMax != null && cpl > cplMax) return false
      if (cpaMin != null && cpa < cpaMin) return false
      if (cpaMax != null && cpa > cpaMax) return false
      if (convMin != null && conv < convMin) return false
      if (convMax != null && conv > convMax) return false
      if (cpdMin != null && cpd < cpdMin) return false
      if (cpdMax != null && cpd > cpdMax) return false
      return true
    })
  }, [campaigns, filters, leadsData])

  // Pagination
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage)
  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredCampaigns.slice(start, start + itemsPerPage)
  }, [filteredCampaigns, currentPage])

  function clearFilters() {
    setFilters({ 
      search: '', 
      
      source: '',
      status: '',
      budgetType: '',
      createdBy: '',
      startDateFrom: '',
      startDateTo: '',
      endDateFrom: '',
      endDateTo: '',
      budgetMin: '',
      budgetMax: '',
      cplMin: '',
      cplMax: '',
      cpaMin: '',
      cpaMax: '',
      convMin: '',
      convMax: '',
      cpdMin: '',
      cpdMax: ''
    })
    setCurrentPage(1)
  }

  function handleEdit(campaign) {
    setForm(campaign)
    setShowForm(true)
    setMessage(null)
  }

  async function handleDelete(id) {
    if (!canManageCampaigns) return
    if (window.confirm(isArabic ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) {
      try {
        await api.delete(`/api/campaigns/${id}`)
        setCampaigns(prev => prev.filter(c => c.id !== id))
      } catch (err) {
        console.error('Failed to delete campaign', err)
      }
    }
  }

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!canManageCampaigns) return
    if (!form.name || !form.source) {
      setMessage({ type: 'error', text: isArabic ? 'من فضلك أدخل الاسم والمنصة' : 'Please enter name and platform' })
      return
    }

    setSaving(true)
    try {
      if (form.id) {
        await api.put(`/api/campaigns/${form.id}`, form)
      } else {
        await api.post('/api/campaigns', form)
      }
      
      await fetchCampaigns()
      
      setMessage({ type: 'success', text: isArabic ? 'تم حفظ الحملة بنجاح' : 'Campaign saved successfully' })
      setTimeout(() => {
        setShowForm(false)
        setForm({ name: '', source: '', budgetType: 'daily', totalBudget: '', currency: 'EGP', startDate: '', endDate: '', landingPage: '', notes: '', status: 'Active' })
        setMessage(null)
      }, 1000)
    } catch (err) {
      setMessage({ type: 'error', text: isArabic ? 'حدث خطأ أثناء الحفظ' : 'Error while saving' })
    } finally {
      setSaving(false)
    }
  }

  const exportExcel = () => {
    const itemsToExport = selectedItems.length > 0 
      ? filteredCampaigns.filter(c => selectedItems.includes(c.id))
      : filteredCampaigns

    const rows = itemsToExport.map(c => ({
      [isArabic ? 'اسم الحملة' : 'Campaign Name']: c.name,
      [isArabic ? 'المصدر' : 'Source']: c.source,
      [isArabic ? 'نوع الميزانية' : 'Budget Type']: c.budgetType,
      [isArabic ? 'الميزانية' : 'Budget']: c.totalBudget,
      [isArabic ? 'تاريخ البدء' : 'Start Date']: c.startDate,
      [isArabic ? 'تاريخ الانتهاء' : 'End Date']: c.endDate,
      [isArabic ? 'الحالة' : 'Status']: c.status,
      [isArabic ? 'صفحة الهبوط' : 'Landing Page']: c.landingPage,
      [isArabic ? 'ملاحظات' : 'Notes']: c.notes,
      [isArabic ? 'تم الإنشاء بواسطة' : 'Created By']: c.createdBy,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Campaigns')
    const fileName = 'campaigns_report.xlsx'
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Campaigns',
      fileName,
      format: 'xlsx',
    })
    setShowExportMenu(false)
  }

  const exportPDF = () => {
    const itemsToExport = selectedItems.length > 0 
      ? campaigns.filter(c => selectedItems.includes(c.id))
      : filteredCampaigns

    const doc = new jsPDF(isArabic ? 'p' : 'p', 'mm', 'a4')
    
    const tableColumn = [
        isArabic ? 'اسم الحملة' : 'Campaign Name',
        isArabic ? 'المصدر' : 'Source',
        isArabic ? 'نوع الميزانية' : 'Budget Type',
        isArabic ? 'الميزانية' : 'Budget',
        isArabic ? 'تاريخ البدء' : 'Start Date',
        isArabic ? 'تاريخ الانتهاء' : 'End Date',
        isArabic ? 'الحالة' : 'Status',
    ]
    
    const tableRows = itemsToExport.map(c => [
        c.name,
        c.source,
        c.budgetType,
        c.totalBudget,
        c.startDate,
        c.endDate,
        c.status
    ])

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: {
            halign: isArabic ? 'right' : 'left'
        },
        headStyles: {
            halign: isArabic ? 'right' : 'left'
        }
    })
    
    const fileName = 'campaigns_report.pdf'
    doc.save(fileName)
    logExportEvent({
      module: 'Campaigns',
      fileName,
      format: 'pdf',
    })
    setShowExportMenu(false)
  }
  
  return (
    <div className="space-y-6 pt-4 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative inline-block">
          <h1 className="text-2xl font-semibold">{isArabic ? 'الحملات' : 'Campaigns'}</h1>
          <span className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent w-full bottom-[-4px]"></span>
        </div>
        
        <div className="flex items-center gap-2">
          {canManageCampaigns && (
            <button 
              className="btn btn-sm bg-green-600 hover:bg-blue-700 text-white border-none gap-2 flex items-center" 
              onClick={() => {
                setForm({ id: null, name: '', source: '', budgetType: 'daily', totalBudget: '', currency: 'EGP', startDate: '', endDate: '', landingPage: '', notes: '', status: 'Active' })
                setShowForm(true)
                setMessage(null)
              }}
            >
              <FaPlus /> <span className="text-white">{isArabic ? 'إضافة حملة' : 'Create Campaign'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <div className=" p-4 sm:p-6 bg-transparent rounded-2xl border border-white/10" style={{ backgroundColor: 'transparent' }}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FaFilter className="text-blue-500" /> {isArabic ? 'تصفية' : 'Filter'}
          </h2>  
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAllFilters(prev => !prev)} className={`flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors`}>
                {showAllFilters ? (isArabic ? 'إخفاء' : 'Hide') : (isArabic ? 'عرض الكل' : 'Show All')} 
                <FaChevronDown size={14} className={`transform transition-transform ${showAllFilters ? 'rotate-180' : ''}`} />
              </button>
            <button onClick={clearFilters} className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              {isArabic ? 'إعادة تعيين' : 'Reset'}
            </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <FaSearch className="text-blue-500" size={10} /> {isArabic ? 'بحث' : 'Search'}
            </label>
            <input 
              className="input w-full text-sm" 
              value={filters.search} 
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} 
              placeholder={isArabic ? 'اسم الحملة...' : 'Campaign Name...'} 
            />
          </div>

          {/* Source */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'المصدر' : 'Source'}</label>
            <SearchableSelect
              value={filters.source}
              onChange={(val) => setFilters(prev => ({ ...prev, source: val }))}
              options={sources.map(s => ({ value: s.name, label: s.name }))}
              isRTL={isArabic}
              placeholder={isArabic ? 'الكل' : 'All'}
            />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'الحالة' : 'Status'}</label>
            <SearchableSelect
              value={filters.status}
              onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Paused', label: 'Paused' },
                { value: 'Scheduled', label: 'Scheduled' },
                { value: 'Ended', label: 'Ended' }
              ]}
              isRTL={isArabic}
              placeholder={isArabic ? 'الكل' : 'All'}
            />
          </div>

          {/* Budget Type */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'نوع الميزانية' : 'Budget Type'}</label>
            <SearchableSelect
              value={filters.budgetType}
              onChange={(val) => setFilters(prev => ({ ...prev, budgetType: val }))}
              options={[
                // {
                { value: 'daily', label: isArabic ? 'يومي' : 'Daily' },
                { value: 'lifetime', label: isArabic ? 'إجمالي' : 'Lifetime' }
              ]}
              isRTL={isArabic}
              placeholder={isArabic ? 'الكل' : 'All'}
            />
          </div>
        </div>
        <div className={`mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 transition-all duration-300 overflow-hidden ${showAllFilters ? 'max-h-[1000px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
          {/* Created By */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'بواسطة' : 'Created By'}</label>
            <SearchableSelect
              value={filters.createdBy}
              onChange={(val) => setFilters(prev => ({ ...prev, createdBy: val }))}
              options={usersList.map(u => ({ value: u.name, label: u.name }))}
              isRTL={isArabic}
              placeholder={isArabic ? 'الكل' : 'All'}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'تاريخ البداية من' : 'Start Date From'}</label>
            <input type="date" className="input w-full text-sm" value={filters.startDateFrom} onChange={e => setFilters(p => ({ ...p, startDateFrom: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'تاريخ البداية إلى' : 'Start Date To'}</label>
            <input type="date" className="input w-full text-sm" value={filters.startDateTo} onChange={e => setFilters(p => ({ ...p, startDateTo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'تاريخ الانتهاء من' : 'End Date From'}</label>
            <input type="date" className="input w-full text-sm" value={filters.endDateFrom} onChange={e => setFilters(p => ({ ...p, endDateFrom: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'تاريخ الانتهاء إلى' : 'End Date To'}</label>
            <input type="date" className="input w-full text-sm" value={filters.endDateTo} onChange={e => setFilters(p => ({ ...p, endDateTo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'الميزانية من' : 'Budget Min'}</label>
            <input type="number" className="input w-full text-sm" value={filters.budgetMin} onChange={e => setFilters(p => ({ ...p, budgetMin: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'الميزانية إلى' : 'Budget Max'}</label>
            <input type="number" className="input w-full text-sm" value={filters.budgetMax} onChange={e => setFilters(p => ({ ...p, budgetMax: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">CPL Min</label>
            <input type="number" className="input w-full text-sm" value={filters.cplMin} onChange={e => setFilters(p => ({ ...p, cplMin: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">CPL Max</label>
            <input type="number" className="input w-full text-sm" value={filters.cplMax} onChange={e => setFilters(p => ({ ...p, cplMax: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">CPA Min</label>
            <input type="number" className="input w-full text-sm" value={filters.cpaMin} onChange={e => setFilters(p => ({ ...p, cpaMin: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">CPA Max</label>
            <input type="number" className="input w-full text-sm" value={filters.cpaMax} onChange={e => setFilters(p => ({ ...p, cpaMax: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'معدل التحويل من' : 'Conv. Rate Min (%)'}</label>
            <input type="number" className="input w-full text-sm" value={filters.convMin} onChange={e => setFilters(p => ({ ...p, convMin: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'معدل التحويل إلى' : 'Conv. Rate Max (%)'}</label>
            <input type="number" className="input w-full text-sm" value={filters.convMax} onChange={e => setFilters(p => ({ ...p, convMax: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'التكلفة اليومية من' : 'Cost/Day Min'}</label>
            <input type="number" className="input w-full text-sm" value={filters.cpdMin} onChange={e => setFilters(p => ({ ...p, cpdMin: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'التكلفة اليومية إلى' : 'Cost/Day Max'}</label>
            <input type="number" className="input w-full text-sm" value={filters.cpdMax} onChange={e => setFilters(p => ({ ...p, cpdMax: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className=" dark:bg-gray-800/30 backdrop-blur-md border border-white/50 dark:border-gray-700/50 shadow-sm rounded-2xl overflow-hidden mb-4">
        <div className="p-4 border-b border-white/20 dark:border-gray-700/50 flex items-center justify-between">
          <h2 className="text-lg font-bold dark:text-white">
            {isArabic ? 'قائمة الحملات' : 'Campaigns List'}
          </h2>
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <FaFileExport /> {isArabic ? 'تصدير' : 'Export'}
              <ChevronDown
                className={`transform transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`}
                size={12}
              />
            </button>
            {showExportMenu && (
              <div
                className={`absolute top-full ${isArabic ? 'left-0' : 'right-0'} mt-1 bg-[var(--dropdown-bg)] rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 w-48`}
              >
                <button
                  onClick={exportExcel}
                  className="w-full text-start px-4 py-2 text-sm hover:bg-blue-900/30 flex items-center gap-2 dark:text-white transition-colors"
                >
                  <FaFileExcel className="text-green-600" /> {isArabic ? 'تصدير كـ Excel' : 'Export to Excel'}
                </button>
                <button
                  onClick={exportPDF}
                  className="w-full text-start px-4 py-2 text-sm hover:bg-blue-900/30 flex items-center gap-2 dark:text-white transition-colors"
                >
                  <FaFilePdf className="text-red-600" /> {isArabic ? 'تصدير كـ PDF' : 'Export to PDF'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <p className="text-[var(--muted-text)] text-lg">{isArabic ? 'لا توجد حملات مطابقة للبحث' : 'No campaigns match your search'}</p>
            <button 
              onClick={() => {
                if(window.confirm(isArabic ? 'هل تريد استعادة البيانات التجريبية؟ سيتم حذف أي تغييرات.' : 'Reset to sample data? This will clear changes.')) {
                   localStorage.removeItem('marketingCampaigns')
                   localStorage.removeItem('leadsData')
                   window.location.reload()
                }
              }}
              className="text-xs text-blue-500 hover:text-blue-400 underline opacity-80 hover:opacity-100 transition-opacity"
            >
              {isArabic ? 'استعادة البيانات الافتراضية' : 'Restore Default Data'}
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="grid grid-cols-1 md:hidden gap-4 p-4">
              {paginatedCampaigns.map(campaign => (
                <div key={campaign.id} className="card glass-card p-4 space-y-3 bg-white/5 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                    <div>
                      <h4 className="font-semibold text-sm">{campaign.name}</h4>
                      <p className="text-xs text-[var(--muted-text)]">{campaign.source || '-'}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                       <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        campaign.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                        campaign.status === 'Paused' ? 'bg-yellow-500/20 text-yellow-400' :
                        campaign.status === 'Ended' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {campaign.status || 'Active'}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(campaign)} className="text-blue-400 hover:text-blue-300 transition-colors p-1">
                          <FaEdit size={14} />
                        </button>
                        {canManageCampaigns && (
                          <button onClick={() => handleDelete(campaign.id)} className="text-red-400 hover:text-red-300 transition-colors p-1">
                          <FaTrash size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Grid Stats */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{isArabic ? 'تاريخ البداية' : 'Start Date'}</span>
                      <span className="text-xs">{campaign.startDate || '-'}</span>
                    </div>
                     <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{isArabic ? 'تاريخ الانتهاء' : 'End Date'}</span>
                      <span className="text-xs">{campaign.endDate || '-'}</span>
                    </div>

                    <div className="flex justify-between items-center col-span-2 border-t border-gray-100 dark:border-gray-800 pt-2 mt-1">
                       <span className="text-[var(--muted-text)] text-xs">{isArabic ? 'الميزانية' : 'Budget'}</span>
                       <div className="flex flex-col text-right">
                          <span className="font-semibold font-mono text-sm">{(Number(campaign.totalBudget) || 0).toLocaleString()} {campaign.currency || 'EGP'}</span>
                          <span className="text-[10px] opacity-60 capitalize">{campaign.budgetType}</span>
                       </div>
                    </div>

                     {(() => {
                      const spend = getPlannedSpend(campaign)
                      const { totalLeads, closed } = getCampaignLeadsStats(campaign.name)
                      const cpl = totalLeads > 0 ? (spend / totalLeads) : 0
                      const cpa = closed > 0 ? (spend / closed) : 0
                      const conv = totalLeads > 0 ? (closed / totalLeads) * 100 : 0
                      const cpd = getCostPerDay(campaign)
                      const curr = campaign.currency || 'EGP'
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--muted-text)] text-xs">CPD</span>
                            <span className="font-mono font-medium">{cpd ? `${cpd.toFixed(2)} ${curr}` : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--muted-text)] text-xs">{isArabic ? 'CPL' : 'CPL'}</span>
                            <span className="font-mono font-medium">{cpl ? `${cpl.toFixed(2)} ${curr}` : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--muted-text)] text-xs">{isArabic ? 'CPA' : 'CPA'}</span>
                            <span className="font-mono font-medium">{cpa ? `${cpa.toFixed(2)} ${curr}` : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--muted-text)] text-xs">{isArabic ? 'معدل التحويل' : 'Conv. Rate'}</span>
                            <span className="font-mono font-medium">{conv ? `${conv.toFixed(1)}%` : '-'}</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left rtl:text-right dark:text-white">
                <thead className="text-xs uppercase bg-white/5 dark:bg-gray-700/50 dark:text-white border-b border-white/10 dark:border-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 w-[50px]">
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-sm rounded border-gray-500"
                        checked={paginatedCampaigns.length > 0 && selectedItems.length === paginatedCampaigns.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3">{isArabic ? 'اسم الحملة' : 'Campaign Name'}</th>
                    <th className="px-4 py-3">{isArabic ? 'المصدر' : 'Source'}</th>
                    <th className="px-4 py-3">{isArabic ? 'تاريخ البداية' : 'Start Date'}</th>
                    <th className="px-4 py-3">{isArabic ? 'تاريخ الانتهاء' : 'End Date'}</th>
                    <th className="px-4 py-3">{isArabic ? 'الميزانية' : 'Budget'}</th>
                    <th className="px-4 py-3">CPD</th>
                    <th className="px-4 py-3">{isArabic ? 'CPL' : 'CPL'}</th>
                    <th className="px-4 py-3">{isArabic ? 'CPA' : 'CPA'}</th>
                    <th className="px-4 py-3">{isArabic ? 'معدل التحويل' : 'Conversion Rate'}</th>
                    <th className="px-4 py-3">{isArabic ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3">{isArabic ? 'بواسطة' : 'Created By'}</th>
                    <th className="px-4 py-3 text-center">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 dark:divide-gray-700/50">
                  {paginatedCampaigns.map(campaign => (
                    <tr key={campaign.id} className="hover:bg-gray-700/50 transition-colors border-b border-white/5 dark:border-gray-700/50">
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="checkbox checkbox-sm rounded border-gray-500"
                          checked={selectedItems.includes(campaign.id)}
                          onChange={() => handleSelectRow(campaign.id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{campaign.name}</td>
                      <td className="px-4 py-3 opacity-80">{campaign.source || '-'}</td>
                      <td className="px-4 py-3 text-xs">{campaign.startDate || '-'}</td>
                      <td className="px-4 py-3 text-xs">{campaign.endDate || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold">{(Number(campaign.totalBudget) || 0).toLocaleString()} {campaign.currency || 'EGP'}</span>
                          <span className="opacity-60 capitalize">{campaign.budgetType}</span>
                        </div>
                      </td>
                      {(() => {
                        let cpl, cpa, conv, cpd
                        const curr = campaign.currency || 'EGP'
                        
                        if (campaign.provider === 'meta' || campaign.provider === 'google') {
                             cpl = Number(campaign.cpl) || 0
                             cpa = Number(campaign.cpa) || 0
                             conv = Number(campaign.conversionRate) || 0
                             cpd = Number(campaign.cpd) || 0
                        } else {
                            const spend = getPlannedSpend(campaign)
                            const { totalLeads, closed } = getCampaignLeadsStats(campaign.name)
                            cpl = totalLeads > 0 ? (spend / totalLeads) : 0
                            cpa = closed > 0 ? (spend / closed) : 0
                            conv = totalLeads > 0 ? (closed / totalLeads) * 100 : 0
                            cpd = getCostPerDay(campaign)
                        }

                        return (
                          <>
                            <td className="px-4 py-3 text-xs font-semibold">{cpd ? `${cpd.toFixed(2)} ${curr}` : '-'}</td>
                            <td className="px-4 py-3 text-xs font-semibold">{cpl ? `${cpl.toFixed(2)} ${curr}` : '-'}</td>
                            <td className="px-4 py-3 text-xs font-semibold">{cpa ? `${cpa.toFixed(2)} ${curr}` : '-'}</td>
                            <td className="px-4 py-3 text-xs">{conv ? `${conv.toFixed(1)}%` : '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                campaign.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                                campaign.status === 'Paused' ? 'bg-yellow-500/20 text-yellow-400' :
                                campaign.status === 'Ended' ? 'bg-red-500/20 text-red-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {campaign.status || 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 opacity-80">{campaign.createdBy || '-'}</td>
                          </>
                        )
                      })()}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(campaign)} className="text-blue-400 hover:text-blue-300 transition-colors">
                            <FaEdit />
                          </button>
                          {canManageCampaigns && (
                            <button onClick={() => handleDelete(campaign.id)} className="text-red-400 hover:text-red-300 transition-colors">
                              <FaTrash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-[var(--content-bg)]/80 border-t border-white/10 dark:border-gray-700/60 flex sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] sm:text-xs text-[var(--muted-text)]">
                {isArabic
                  ? `إظهار ${Math.min((currentPage - 1) * itemsPerPage + 1, filteredCampaigns.length)}-${Math.min(currentPage * itemsPerPage, filteredCampaigns.length)} من ${filteredCampaigns.length}`
                  : `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, filteredCampaigns.length)}-${Math.min(currentPage * itemsPerPage, filteredCampaigns.length)} of ${filteredCampaigns.length}`}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    title={isArabic ? 'السابق' : 'Prev'}
                  >
                    {isArabic ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronLeft className="w-4 h-4" />
                    )}
                  </button>
                  <span className="text-sm whitespace-nowrap">
                    {isArabic
                      ? `الصفحة ${currentPage} من ${totalPages}`
                      : `Page ${currentPage} of ${totalPages}`}
                  </span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    title={isArabic ? 'التالي' : 'Next'}
                  >
                    {isArabic ? (
                      <ChevronLeft className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] sm:text-xs text-[var(--muted-text)] whitespace-nowrap">
                    {isArabic ? 'لكل صفحة:' : 'Per page:'}
                  </span>
                  <select
                    className="input w-24 text-sm py-0 px-2 h-8"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                  >
                    <option value={6}>6</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="absolute inset-0 flex items-start justify-center p-6 md:p-6 overflow-y-auto">
            <div className="card p-4 sm:p-6 mt-4 w-[95vw] sm:w-[85vw] lg:w-[70vw] xl:max-w-4xl my-auto dark:bg-gray-800 dark:text-white shadow-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium">{isArabic ? (form.id ? 'تعديل حملة' : 'إضافة حملة') : (form.id ? 'Edit Campaign' : 'create Campaign')}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white transition-colors">
                  <FaTimes size={20} />
                </button>
              </div>

              <form onSubmit={onSubmit} className={`space-y-4 ${isArabic ? 'text-right' : 'text-left'}`}>
                {/* Campaign Name */}
                <div>
                  <label className="block dark:!text-white text-sm mb-1">{isArabic ? 'اسم الحملة' : 'Campaign Name'}</label>
                  <input name="name" value={form.name} onChange={onChange} placeholder={isArabic ? 'اكتب اسم الحملة' : 'Enter campaign name'} className="input w-full dark:!text-white" />
                </div>

                {/* Platform */}
                <div>
                  <label className="block dark:!text-white text-sm mb-1">{isArabic ? 'المنصة' : 'source'}</label>
                  <select name="source" value={form.source} onChange={onChange} className="input w-full dark:!text-white">
                    <option value="">{isArabic ? 'اختر المنصة' : 'Select source'}</option>
                    <option value="Meta">Meta</option>
                    <option value="Google">Google</option>
                    <option value="TikTok">TikTok</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Manual">{isArabic ? 'يدوي' : 'Manual'}</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block dark:!text-white text-sm mb-1">{isArabic ? 'الحالة' : 'Status'}</label>
                  <select name="status" value={form.status} onChange={onChange} className="input w-full dark:!text-white">
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Ended">Ended</option>
                  </select>
                </div>

                {/* Budget Section Group */}
                <div className="p-4 rounded-xl bg-gray-50/5 border border-white/5 space-y-4">
                  {/* Currency */}
                  <div>
                    <label className="block dark:!text-white text-sm font-medium mb-2">{isArabic ? 'العملة' : 'Currency'}</label>
                    <select name="currency" value={form.currency} onChange={onChange} className="input w-full dark:!text-white">
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="SAR">SAR</option>
                      <option value="AED">AED</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>

                  {/* Budget Type */}
                  <div>
                    <label className="block dark:!text-white text-sm font-medium mb-2">{isArabic ? 'نوع الميزانية' : 'Budget Type'}</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-900/50 p-1 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, budgetType: 'daily' }))}
                        className={`py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                          form.budgetType === 'daily' 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {isArabic ? 'يومي' : 'Daily'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, budgetType: 'lifetime' }))}
                        className={`py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                          form.budgetType === 'lifetime' 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {isArabic ? 'مدى الحياة' : 'Lifetime'}
                      </button>
                    </div>
                  </div>

                  {/* Total Budget */}
                  <div>
                    <label className="block dark:!text-white text-sm font-medium mb-2">
                      {isArabic ? 'الميزانية الإجمالية' : 'Total Budget'}
                      <span className="text-xs font-normal text-gray-500 mx-1">
                        ({form.budgetType === 'daily' ? (isArabic ? 'في اليوم' : 'per day') : (isArabic ? 'للحملة كاملة' : 'for entire campaign')})
                      </span>
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        name="totalBudget" 
                        value={form.totalBudget} 
                        onChange={onChange} 
                        className={`input w-full dark:!text-white ${isArabic ? 'pl-12' : 'pr-12'} font-mono text-lg`} 
                        placeholder="0.00" 
                        min="0"
                        step="0.01"
                      />
                      <div className={`absolute inset-y-0 ${isArabic ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none`}>
                        <span className="text-gray-400 font-bold text-sm">{form.currency || (isArabic ? 'ج.م' : 'EGP')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block dark:!text-white text-sm mb-1">{isArabic ? 'تاريخ البداية' : 'Start Date'}</label>
                    <input type="date" name="startDate" value={form.startDate} onChange={onChange} className="input w-full dark:!text-white" />
                  </div>
                  <div>
                    <label className="block dark:!text-white text-sm mb-1">{isArabic ? 'تاريخ الانتهاء' : 'End Date'}</label>
                    <input type="date" name="endDate" value={form.endDate} onChange={onChange} className="input w-full dark:!text-white" />
                  </div>
                </div>

                {/* Linked Landing Page */}
                <div>
                  <label className="block dark:!text-white text-sm mb-1">{isArabic ? 'ربط بصفحة هبوط' : 'Linked Landing Page'}</label>
                  <select name="landingPage" value={form.landingPage} onChange={onChange} className="input w-full dark:!text-white">
                    <option value="">{isArabic ? 'اختر صفحة هبوط' : 'Select Landing Page'}</option>
                    {landingPages.map(lp => (
                      <option key={lp.id} value={lp.id}>{lp.name || lp.title || `LP ${lp.id}`}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block dark:!text-white text-sm mb-1">{isArabic ? 'ملاحظات' : 'Notes'}</label>
                  <textarea name="notes" value={form.notes} onChange={onChange} className="input w-full dark:!text-white" rows={3} placeholder={isArabic ? 'ملاحظات إضافية' : 'Additional notes'} />
                </div>

                {/* Save */}
                <div className={`flex ${isArabic ? 'justify-start' : 'justify-end'} gap-3 pt-4 border-t border-white/10 mt-6`}>
                   <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : (isArabic ? 'حفظ' : 'Save')}
                  </button>
                </div>

                {message && (
                  <div className={`text-sm mt-2 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {message.text}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
