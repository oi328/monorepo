import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../shared/context/ThemeProvider'
import { Filter, Users, Tag, Calendar, XCircle, FileText, CheckCircle, ChevronDown, User, Layers, Briefcase, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { FaChevronDown, FaFileExport, FaFileExcel, FaFilePdf } from 'react-icons/fa'
import { useStages } from '../hooks/useStages'
import * as XLSX from 'xlsx'
import { api, logExportEvent } from '../utils/api'
import BackButton from '../components/BackButton'
import SearchableSelect from '../components/SearchableSelect'
import ReassignLeadsReport from '../components/LeadsReport/ReassignLeadsReport'
import { LeadsAnalysisChart } from '../features/Dashboard/components/LeadsAnalysisChart'

export default function LeadsPipelineReport() {
  const { t, i18n } = useTranslation()
  const { stages } = useStages()
  const isRTL = i18n.dir() === 'rtl'

  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  })

  const [activeTab, setActiveTab] = useState('pipeline')
  const [leads, setLeads] = useState([])
  const [users, setUsers] = useState([])
  const [tenantCompany, setTenantCompany] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsRes, usersRes, companyRes] = await Promise.all([
          api.get('/api/leads', { params: { per_page: 1000 } }),
          api.get('/api/users', { params: { per_page: 1000 } }),
          api.get('/api/company-info')
        ])

        const leadsData = leadsRes.data && leadsRes.data.data ? leadsRes.data.data : []
        const mappedLeads = leadsData.map(l => ({
          id: l.id,
          name: l.name,
          salesperson: l.sales_person || l.salesperson || 'Unassigned',
          salespersonId: l.sales_person_id || l.salesperson_id || null,
          manager: l.manager || '',
          managerId: l.manager_id || null,
          stage: l.stage || 'New',
          source: l.source || 'Unknown',
          project: l.project || '',
          assignDate: l.assigned_at || '',
          createdAt: l.created_at ? l.created_at.substring(0, 10) : '',
          lastActionAt: l.updated_at ? l.updated_at.substring(0, 10) : '',
          closedAt: l.closed_at || '',
          status: l.status || 'pending',
          type: l.type || ''
        }))
        setLeads(mappedLeads)

        const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || [])
        const mappedUsers = rawUsers.map(u => ({
          id: u.id,
          name: u.name,
          role: Array.isArray(u.roles) && u.roles[0]?.name ? u.roles[0].name : (u.role || ''),
          manager_id: u.manager_id || null
        }))
        setUsers(mappedUsers)

        const tenant = companyRes.data?.tenant || companyRes.data?.company || null
        setTenantCompany(tenant)
        
        const user = companyRes.data?.user || null
        setCurrentUser(user)
      } catch (err) {
        console.error('Failed to fetch leads or users', err)
      }
    }
    fetchData()
  }, [])

  const canViewReassignment = useMemo(() => {
    if (!currentUser) return false
    const role = (currentUser.role || '').toLowerCase()
    const isAdminOrManager = ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager', 'sales manager', 'branch manager', 'team leader'].includes(role)
    return currentUser.is_super_admin || isAdminOrManager
  }, [currentUser])


  // Filters State
  const [salesPersonFilter, setSalesPersonFilter] = useState('')
  const [managerFilter, setManagerFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [assignDate, setAssignDate] = useState('')
  const [creationDate, setCreationDate] = useState('')
  const [lastActionDate, setLastActionDate] = useState('')
  const [closeDealsDate, setCloseDealsDate] = useState('')
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const managerOptions = useMemo(() => {
    if (!users.length) return [{ value: '', label: isRTL ? 'الكل' : 'All Managers' }]
    const managers = users.filter(u => {
      const role = String(u.role || '').toLowerCase()
      const isSalesPerson = role.includes('sales person') || role.includes('salesperson')
      return !isSalesPerson
    })
    const uniqueManagers = Array.from(new Map(managers.map(m => [m.id, m])).values())
    return [
      { value: '', label: isRTL ? 'الكل' : 'All Managers' },
      ...uniqueManagers.map(m => ({ value: String(m.id), label: m.name || `#${m.id}` }))
    ]
  }, [users, isRTL])

  const salesPersonOptions = useMemo(() => {
    if (!users.length) {
      const uniqueSales = Array.from(new Set(leads.map(d => d.salesperson))).filter(Boolean)
      return [
        { value: '', label: isRTL ? 'الكل' : 'All Sales Persons' },
        ...uniqueSales.map(s => ({ value: s, label: s }))
      ]
    }

    const selectedManagerId = managerFilter ? parseInt(managerFilter, 10) : null

    let candidates = users.filter(u => {
      const role = String(u.role || '').toLowerCase()
      return role.includes('sales person') || role.includes('salesperson')
    })

    if (selectedManagerId) {
      candidates = candidates.filter(u => u.manager_id === selectedManagerId)
    }

    const uniqueSales = Array.from(new Map(candidates.map(s => [s.id, s])).values())

    return [
      { value: '', label: isRTL ? 'الكل' : 'All Sales Persons' },
      ...uniqueSales.map(s => ({ value: s.name, label: s.name || `#${s.id}` }))
    ]
  }, [users, leads, managerFilter, isRTL])

  const projectOrProductOptions = useMemo(() => {
    const type = String(tenantCompany?.company_type || '').toLowerCase()

    if (!leads.length) {
      return [
        { value: '', label: isRTL ? 'الكل' : 'All Projects' }
      ]
    }

    const baseLabel = type === 'real estate'
      ? (isRTL ? 'الكل' : 'All Units')
      : (isRTL ? 'الكل' : 'All Projects')

    const uniqueValues = Array.from(new Set(leads.map(d => d.project).filter(Boolean)))

    return [
      { value: '', label: baseLabel },
      ...uniqueValues.map(v => ({ value: v, label: v }))
    ]
  }, [leads, tenantCompany, isRTL])

  const getDescendants = (rootId, allUsers) => {
    let descendants = []
    const direct = allUsers.filter(u => String(u.manager_id) === String(rootId))
    direct.forEach(u => {
      descendants.push(u)
      descendants = descendants.concat(getDescendants(u.id, allUsers))
    })
    return descendants
  }

  // Filter Logic
  const filteredData = useMemo(() => {
    let allowedUserIds = null
    if (managerFilter) {
      const mgrId = parseInt(managerFilter, 10)
      const descendants = getDescendants(mgrId, users)
      allowedUserIds = new Set([mgrId, ...descendants.map(u => u.id)])
    }

    return leads.filter(lead => {
      const matchSales = salesPersonFilter ? lead.salesperson === salesPersonFilter : true
      // Hierarchical Manager Filter
      let matchManager = true
      if (managerFilter && allowedUserIds) {
        matchManager = allowedUserIds.has(lead.salespersonId) || allowedUserIds.has(lead.managerId)
      }
      
      const matchStage = stageFilter ? lead.stage === stageFilter : true
      const matchSource = sourceFilter ? lead.source === sourceFilter : true
      const matchProject = projectFilter ? lead.project === projectFilter : true
      const matchDate = assignDate ? lead.assignDate === assignDate : true
      const matchCreationDate = creationDate ? lead.createdAt === creationDate : true
      const matchLastActionDate = lastActionDate ? lead.lastActionAt === lastActionDate : true
      const matchCloseDealsDate = closeDealsDate ? lead.closedAt === closeDealsDate : true
      return matchSales && matchManager && matchStage && matchSource && matchProject && matchDate && matchCreationDate && matchLastActionDate && matchCloseDealsDate
    })
  }, [leads, users, salesPersonFilter, managerFilter, stageFilter, sourceFilter, projectFilter, assignDate, creationDate, lastActionDate, closeDealsDate])

  const growthData = useMemo(() => {
    const counts = {}
    filteredData.forEach(lead => {
      if (lead.createdAt) {
        const month = lead.createdAt.substring(0, 7) // YYYY-MM
        counts[month] = (counts[month] || 0) + 1
      }
    })
    
    return Object.keys(counts).sort().map(month => {
      const [year, m] = month.split('-')
      const date = new Date(year, parseInt(m, 10) - 1)
      const label = date.toLocaleString(i18n.language, { month: 'short', year: 'numeric' })
      return { label, value: counts[month] }
    })
  }, [filteredData, i18n.language])

  // KPI Calculations
  const totalLeads = filteredData.length
  const newLeads = useMemo(() => filteredData.filter(l => {
    const stage = (l.stage || '').toLowerCase()
    const status = (l.status || '').toLowerCase()
    return stage.includes('new') || stage.includes('جديد') || status === 'pending'
  }).length, [filteredData])

  const canceledLeads = useMemo(() => filteredData.filter(l => {
    const stage = (l.stage || '').toLowerCase()
    const status = (l.status || '').toLowerCase()
    return stage.includes('cancel') || stage.includes('إلغاء') || status === 'canceled' || status === 'lost' || status === 'خسارة'
  }).length, [filteredData])

  const meetingsCount = useMemo(() => filteredData.filter(l => {
    const stage = (l.stage || '').toLowerCase()
    return stage.includes('meeting') || stage.includes('اجتماع')
  }).length, [filteredData])

  const proposalsCount = useMemo(() => filteredData.filter(l => {
    const stage = (l.stage || '').toLowerCase()
    return stage.includes('proposal') || stage.includes('عرض')
  }).length, [filteredData])

  const reservationCount = useMemo(() => filteredData.filter(l => {
    const stage = (l.stage || '').toLowerCase()
    return stage.includes('reservation') || stage.includes('حجز')
  }).length, [filteredData])

  const closedCount = useMemo(() => filteredData.filter(l => {
    const stage = (l.stage || '').toLowerCase()
    const status = (l.status || '').toLowerCase()
    return stage.includes('closing') || stage.includes('closed') || stage.includes('إغلاق') || status === 'converted' || status === 'won' || status === 'فوز'
  }).length, [filteredData])

  // Aggregation for Table
  const salesPersonStats = useMemo(() => {
    const stats = {}
    filteredData.forEach(lead => {
      const spName = lead.salesperson || (isRTL ? 'غير معين' : 'Unassigned')
      if (!stats[spName]) {
        stats[spName] = {
          name: spName,
          total: 0,
          pendingNew: 0,
          pendingCold: 0,
          followUp: 0,
          proposal: 0,
          meeting: 0,
          reservation: 0,
          closed: 0,
          canceled: 0
        }
      }
      stats[spName].total += 1
      const stage = (lead.stage || '').toLowerCase()
      const status = (lead.status || '').toLowerCase()

      // Pending (New)
      if (stage === 'new' || stage === 'new lead' || stage === 'جديد') {
          stats[spName].pendingNew += 1
      }
      
      // Pending (Cold) - This counts the "Cold Calls" stage
      if (stage.includes('cold') || stage.includes('بارد')) {
          stats[spName].pendingCold += 1
      }

      if (stage.includes('follow') || stage.includes('متابعة')) stats[spName].followUp += 1
      if (stage.includes('proposal') || stage.includes('عرض')) stats[spName].proposal += 1
      if (stage.includes('meeting') || stage.includes('اجتماع')) stats[spName].meeting += 1
      if (stage.includes('reservation') || stage.includes('حجز')) stats[spName].reservation += 1
      if (stage.includes('closing') || stage.includes('closed') || stage.includes('إغلاق') || status === 'converted' || status === 'won' || status === 'فوز') stats[spName].closed += 1
      if (stage.includes('cancel') || stage.includes('إلغاء') || status === 'canceled' || status === 'lost' || status === 'خسارة') stats[spName].canceled += 1
    })
    return Object.values(stats).sort((a, b) => b.total - a.total)
  }, [filteredData, isRTL])

  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(salesPersonStats.length / entriesPerPage))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage
    return salesPersonStats.slice(start, start + entriesPerPage)
  }, [salesPersonStats, currentPage, entriesPerPage])

  const handleExport = () => {
    const rows = filteredData.map(lead => ({
      Name: lead.name,
      Salesperson: lead.salesperson,
      Manager: lead.manager || '',
      Stage: lead.stage,
      Source: lead.source,
      Project: lead.project,
      AssignDate: lead.assignDate,
      CreatedAt: lead.createdAt,
      LastActionAt: lead.lastActionAt,
      ClosedAt: lead.closedAt || '',
      Status: lead.status,
      Type: lead.type
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Pipeline')
    const fileName = 'leads_pipeline_report.xlsx'
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Leads Pipeline Report',
      fileName,
      format: 'xlsx',
    })
    setShowExportMenu(false)
  }

  const exportToPdf = async () => {
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = await import('jspdf-autotable')
      const doc = new jsPDF()
      
      const tableColumn = [
        isRTL ? 'الاسم' : "Name", 
        isRTL ? 'مسؤول المبيعات' : "Salesperson", 
        isRTL ? 'المرحلة' : "Stage", 
        isRTL ? 'المشروع' : "Project", 
        isRTL ? 'الحالة' : "Status", 
        isRTL ? 'النوع' : "Type"
      ]
      const tableRows = []

      filteredData.forEach(lead => {
        const rowData = [
          lead.name,
          lead.salesperson,
          lead.stage,
          lead.project,
          lead.status,
          lead.type
        ]
        tableRows.push(rowData)
      })

      doc.text(isRTL ? 'تقرير مسار العملاء' : "Leads Pipeline Report", 14, 15)
      autoTable.default(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { font: 'helvetica', fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      })
      doc.save("leads_pipeline_report.pdf")
      logExportEvent({
        module: 'Leads Pipeline Report',
        fileName: 'leads_pipeline_report.pdf',
        format: 'pdf',
      })
      setShowExportMenu(false)
    } catch (error) {
      console.error("Export PDF Error:", error)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen ">
        <div>
          <BackButton to="/reports" />
        </div>      
      {/* Header & Navigation */}
      
        {/* Row 1: Back Button */}


        {/* Row 2: Title and Export Button */}
        <div className="flex flex-wrap  md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className={`text-3xl font-bold ${isLight ? 'text-black' : 'text-white'} flex items-center gap-3`}>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Layers size={32} />
            </div>
            {isRTL ? 'التقارير، مسار العملاء...' : 'Leads Pipeline'}
          </h1>
        </div>

        {/* Tabs */}
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl inline-flex mb-6">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'pipeline'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('pipeline')}
          >
            {isRTL ? 'تقرير المسار' : 'Pipeline Report'}
          </button>
          {canViewReassignment && (
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'reassignment'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('reassignment')}
            >
              {isRTL ? 'إعادة تعيين العملاء' : 'Reassign Leads'}
            </button>
          )}
        </div>

      {activeTab === 'reassignment' ? (
        <ReassignLeadsReport users={users} />
      ) : (
        <>
      {/* Filters Section */}
      <div className="bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md border border-theme-border dark:border-gray-700/50 p-4 rounded-2xl shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className={`flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'} font-semibold`}>
            <Filter size={20} className="text-blue-500 dark:text-blue-400" />
            <h3>{isRTL ? 'الفلاتر' : 'Filters'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAllFilters(prev => !prev)} 
              className={`flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors`}
            >
              {showAllFilters ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'إظهار' : 'Show')}
              <ChevronDown size={12} className={`transform transition-transform duration-300 ${showAllFilters ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <button
              onClick={() => {
                setSalesPersonFilter('')
                setManagerFilter('')
                setStageFilter('')
                setSourceFilter('')
                setProjectFilter('')
                setAssignDate('')
                setCreationDate('')
                setLastActionDate('')
                setCloseDealsDate('')
                setShowAllFilters(false)
              }}
              className="px-3 py-1.5 text-sm text-gray-500 dark:text-white hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              {isRTL ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {/* First Row - Always Visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales Person */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                <User size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'مسؤول المبيعات' : 'Sales Person'}
              </label>
              <SearchableSelect 
                options={salesPersonOptions}
                value={salesPersonFilter}
                onChange={setSalesPersonFilter}
                placeholder={isRTL ? 'اختر' : 'Sales Person'}
                icon={<User size={16} />}
                isRTL={isRTL}
              />
            </div>

            {/* Manager */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                <Users size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'المدير' : 'Manager'}
              </label>
              <SearchableSelect 
                options={managerOptions}
                value={managerFilter}
                onChange={setManagerFilter}
                placeholder={isRTL ? 'اختر' : 'Manager'}
                icon={<Users size={16} />}
                isRTL={isRTL}
              />
            </div>

            {/* Stage */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                <Layers size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'المرحلة' : 'Stage'}
              </label>
              <SearchableSelect 
                options={[{ value: '', label: isRTL ? 'الكل' : 'All Stages' }, ...Array.from(new Set(leads.map(d => d.stage))).map(s => ({ value: s, label: s }))]}
                value={stageFilter}
                onChange={setStageFilter}
                placeholder={isRTL ? 'اختر' : 'Stage Pipeline'}
                icon={<Layers size={16} />}
                isRTL={isRTL}
              />
            </div>

            {/* Source */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                <Tag size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'المصدر' : 'Source'}
              </label>
              <SearchableSelect 
                options={[{ value: '', label: isRTL ? 'الكل' : 'All Sources' }, ...Array.from(new Set(leads.map(d => d.source))).map(s => ({ value: s, label: s }))]}
                value={sourceFilter}
                onChange={setSourceFilter}
                placeholder={isRTL ? 'اختر' : 'Source'}
                icon={<Tag size={16} />}
                isRTL={isRTL}
              />
            </div>
          </div>

          {/* Additional Filters (Toggleable) */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showAllFilters ? 'max-h-[800px] opacity-100 pt-3' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Project */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <Briefcase size={12} className="text-blue-500 dark:text-blue-400" />
                  {isRTL ? 'المشروع أو المنتج' : 'Project or Product'}
                </label>
                <SearchableSelect 
                  options={projectOrProductOptions}
                  value={projectFilter}
                  onChange={setProjectFilter}
                  placeholder={isRTL ? 'اختر' : 'Project or Product'}
                  icon={<Briefcase size={16} />}
                  isRTL={isRTL}
                />
              </div>

              {/* Assign Date */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
                  {isRTL ? 'تاريخ التعيين' : 'Assign Date'}
                </label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm  dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={assignDate}
                  onChange={(e) => setAssignDate(e.target.value)}
                />
              </div>

              {/* Creation Date */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
                  {isRTL ? 'تاريخ الإنشاء' : 'Creation Date'}
                </label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={creationDate}
                  onChange={(e) => setCreationDate(e.target.value)}
                />
              </div>

              {/* Last Action Date */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <Clock size={12} className="text-blue-500 dark:text-blue-400" />
                  {isRTL ? 'تاريخ آخر إجراء' : 'Last Action Date'}
                </label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm  dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={lastActionDate}
                  onChange={(e) => setLastActionDate(e.target.value)}
                />
              </div>

              {/* Close Deals Date */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <CheckCircle size={12} className="text-blue-500 dark:text-blue-400" />
                  {isRTL ? 'تاريخ إغلاق الصفقات' : 'Close Deals Date'}
                </label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm  dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={closeDealsDate}
                  onChange={(e) => setCloseDealsDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        {[
          {
            title: isRTL ? 'العملاء' : 'Customers',
            value: totalLeads.toLocaleString(),
            sub: isRTL ? '(الكل)' : '(Total)',
            icon: Users,
            color: 'text-blue-500 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          },
          {
            title: isRTL ? 'العملاء المحتملين' : 'Leads',
            value: newLeads,
            sub: isRTL ? '(جديد/معلق)' : '(New/Pending)',
            icon: Filter,
            color: 'text-indigo-600 dark:text-indigo-400',
            bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
          },
          {
            title: isRTL ? 'الاجتماعات' : 'Meetings',
            value: meetingsCount,
            sub: isRTL ? '(مجدولة)' : '(Scheduled)',
            icon: Calendar,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          },
          {
            title: isRTL ? 'العروض' : 'Proposals',
            value: proposalsCount,
            sub: isRTL ? '(مرسلة)' : '(Sent)',
            icon: FileText,
            color: 'text-cyan-600 dark:text-cyan-400',
            bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
          },
          {
            title: isRTL ? 'الحجوزات' : 'Reservations',
            value: reservationCount,
            sub: isRTL ? '(حجز)' : '(Reservation)',
            icon: Tag,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          },
          {
            title: isRTL ? 'صفقات مغلقة' : 'Closed Deals',
            value: closedCount,
            sub: isRTL ? '(فوز)' : '(Won)',
            icon: CheckCircle,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          },
          {
            title: isRTL ? 'إلغاء' : 'Cancelation',
            value: canceledLeads.toLocaleString(),
            sub: isRTL ? '(خسارة)' : '(Lost)',
            icon: XCircle,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
          },
        ].map((card, idx) => {
          const Icon = card.icon
          return (
            <div 
              key={idx}
              className="group relative bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden h-32"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                <Icon size={80} className={card.color} />
              </div>

              <div className="flex flex-col justify-between h-full relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${card.bgColor} ${card.color}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className={`${isLight ? 'text-black' : 'text-white'} text-sm font-semibold opacity-80`}>
                    {card.title}
                  </h3>
                </div>

                <div className="flex items-baseline space-x-2 rtl:space-x-reverse pl-1">
                  <span className={`text-2xl font-bold ${card.color}`}>
                    {card.value}
                  </span>
                  <span className="text-xs dark:text-white font-medium">
                    {card.sub}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Leads Growth Chart */}
      <div className="bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md border border-theme-border dark:border-gray-700/50 p-4 rounded-2xl shadow-sm mb-6">
        <h2 className={`text-lg font-semibold mb-4 ${isLight ? 'text-black' : 'text-white'}`}>
          {isRTL ? 'نمو العملاء' : 'Leads Growth'}
        </h2>
        <div className="h-64 sm:h-80">
           {growthData.length > 0 ? (
             <LeadsAnalysisChart 
               data={growthData} 
               chartType="line" 
               legendLabel={isRTL ? 'عدد العملاء' : 'No. of Leads'} 
             />
           ) : (
             <div className="flex items-center justify-center h-full text-gray-500">
               {isRTL ? 'لا توجد بيانات متاحة للعرض' : 'No data available to display'}
             </div>
           )}
        </div>
      </div>

      {/* Leads Overview List Table */}
      <div className=" bg-white/10 dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm border border-theme-border dark:border-gray-700/50 overflow-hidden">
        <div className="p-6 border-b border-theme-border dark:border-gray-700/50 flex items-center justify-between">
           <h3 className={`text-lg font-bold ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'قائمة نظرة عامة على العملاء' : 'Leads overview List:'}</h3>
           <div className="relative" ref={exportMenuRef}>
             <button 
               onClick={() => setShowExportMenu(!showExportMenu)} 
               className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
             >
               <FaFileExport /> {isRTL ? 'تصدير' : 'Export'}
               <FaChevronDown className={`transform transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} size={12} />
             </button>
             
             {showExportMenu && (
               <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 w-48`}>
                 <button 
                   onClick={() => {
                     handleExport();
                     setShowExportMenu(false);
                   }}
                   className="w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-white"
                 >
                   <FaFileExcel className="text-green-600" /> {isRTL ? 'تصدير كـ Excel' : 'Export to Excel'}
                 </button>
                 <button 
                   onClick={() => {
                     exportToPdf();
                     setShowExportMenu(false);
                   }}
                   className="w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-white"
                 >
                   <FaFilePdf className="text-red-600" /> {isRTL ? 'تصدير كـ PDF' : 'Export to PDF'}
                 </button>
               </div>
             )}
           </div>
         </div>
        
        {/* Responsive Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right">
            <thead className={`text-xs uppercase bg-white/5 dark:bg-white/5 ${isLight ? 'text-black' : 'text-white'}`}>
              <tr>
                <th className="md:hidden px-6 py-4 border-b border-theme-border dark:border-gray-700/50"></th>
                <th className="px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'مسؤول المبيعات' : 'Sales Person'}</th>
                <th className="hidden md:table-cell px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'إجمالي العملاء' : 'Total Leads'}</th>
                <th className="hidden md:table-cell px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'معلق (جديد)' : 'Pending (New)'}</th>
                <th className="hidden md:table-cell px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'معلق (بارد)' : 'Pending (Cold)'}</th>
                <th className="hidden md:table-cell px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'متابعة' : 'Follow up'}</th>
                <th className="hidden md:table-cell px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'عرض' : 'Proposal'}</th>
                <th className="hidden md:table-cell px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'اجتماع' : 'Meeting'}</th>
                <th className="hidden md:table-cell px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'حجز' : 'Reservation'}</th>
                <th className="hidden md:table-cell px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'مغلق' : 'Closed'}</th>
                <th className="hidden md:table-cell px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'ملغى' : 'Canceled'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border dark:divide-gray-700/50">
              {salesPersonStats.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    {isRTL ? 'لا توجد بيانات' : 'No data'}
                  </td>
                </tr>
              )}
              {salesPersonStats.length > 0 && paginatedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    {isRTL ? 'لا توجد نتائج' : 'No results'}
                  </td>
                </tr>
              )}
              {paginatedRows.map((stat, idx) => (
                <React.Fragment key={idx}>
                  <tr className="hover:bg-white/5 dark:hover:bg-white/5 transition-colors">
                    <td className="md:hidden px-6 py-4">
                      <button onClick={() => toggleRow(stat.name)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400">
                        {expandedRows[stat.name] ? <ChevronDown size={16} className="transform rotate-180" /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                    <td className={`px-6 py-4 font-bold ${isLight ? 'text-black' : 'text-white'}`}>{stat.name}</td>
                    <td className={`hidden md:table-cell px-6 py-4 font-semibold ${isLight ? 'text-black' : 'text-white'}`}>{stat.total}</td>
                    <td className="hidden md:table-cell px-6 py-4 text-blue-600 dark:text-blue-400">{stat.pendingNew}</td>
                    <td className={`hidden md:table-cell px-6 py-4 ${isLight ? 'text-black' : 'text-white'}`}>{stat.pendingCold}</td>
                    <td className="hidden md:table-cell px-6 py-4 text-amber-600 dark:text-amber-400">{stat.followUp}</td>
                    <td className="hidden md:table-cell px-6 py-4 text-purple-600 dark:text-purple-400">{stat.proposal}</td>
                    <td className="hidden md:table-cell px-6 py-4 text-indigo-600 dark:text-indigo-400">{stat.meeting}</td>
                    <td className="hidden md:table-cell px-6 py-4 text-amber-600 dark:text-amber-400">{stat.reservation}</td>
                    <td className="hidden md:table-cell px-6 py-4 text-green-600 dark:text-green-400 font-bold">{stat.closed}</td>
                    <td className="hidden md:table-cell px-6 py-4 text-red-600 dark:text-red-400">{stat.canceled}</td>
                  </tr>
                  {/* Mobile Expandable Row */}
                  {expandedRows[stat.name] && (
                    <tr className="md:hidden bg-gray-50 dark:bg-white/5">
                      <td colSpan={2} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)] text-xs">{isRTL ? 'إجمالي العملاء' : 'Total Leads'}</span>
                            <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{stat.total}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)] text-xs">{isRTL ? 'معلق (جديد)' : 'Pending (New)'}</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{stat.pendingNew}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)] text-xs">{isRTL ? 'معلق (بارد)' : 'Pending (Cold)'}</span>
                            <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{stat.pendingCold}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)] text-xs">{isRTL ? 'متابعة' : 'Follow up'}</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">{stat.followUp}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)] text-xs">{isRTL ? 'عرض' : 'Proposal'}</span>
                            <span className="font-semibold text-purple-600 dark:text-purple-400">{stat.proposal}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)] text-xs">{isRTL ? 'اجتماع' : 'Meeting'}</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{stat.meeting}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)] text-xs">{isRTL ? 'حجز' : 'Reservation'}</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">{stat.reservation}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)] text-xs">{isRTL ? 'مغلق' : 'Closed'}</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{stat.closed}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)] text-xs">{isRTL ? 'ملغى' : 'Canceled'}</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">{stat.canceled}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-3 bg-theme-bg/80 border-t border-theme-border dark:border-gray-700/60 flex items-center justify-between gap-3">
            <div className={`text-[11px] sm:text-xs ${isLight ? 'text-black' : 'text-white'}`}>
              {isRTL
                ? `إظهار ${Math.min((currentPage - 1) * entriesPerPage + 1, salesPersonStats.length)}-${Math.min(currentPage * entriesPerPage, salesPersonStats.length)} من ${salesPersonStats.length}`
                : `Showing ${Math.min((currentPage - 1) * entriesPerPage + 1, salesPersonStats.length)}-${Math.min(currentPage * entriesPerPage, salesPersonStats.length)} of ${salesPersonStats.length}`}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  title={isRTL ? 'السابق' : 'Prev'}
                >
                  {isRTL ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                </button>
                <span className={`text-sm whitespace-nowrap ${isLight ? 'text-black' : 'text-white'}`}>
                  {isRTL
                    ? `الصفحة ${currentPage} من ${pageCount}`
                    : `Page ${currentPage} of ${pageCount}`}
                </span>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, pageCount))}
                  disabled={currentPage === pageCount}
                  title={isRTL ? 'التالي' : 'Next'}
                >
                  {isRTL ? (
                    <ChevronLeft className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className={`text-[10px] sm:text-xs ${isLight ? 'text-black' : 'text-white'} whitespace-nowrap`}>
                  {isRTL ? 'لكل صفحة:' : 'Per page:'}
                </span>
                <select
                  className={`input w-24 text-sm py-0 px-2 h-8 ${isLight ? 'text-black' : 'text-white'} bg-theme-bg dark:bg-gray-700 border-theme-border dark:border-gray-600`}
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
