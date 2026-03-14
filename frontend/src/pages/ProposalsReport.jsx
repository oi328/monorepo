import React, { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { useTheme } from '@shared/context/ThemeProvider'
import { useAppState } from '../shared/context/AppStateProvider'
import { api, logExportEvent } from '../utils/api'
import BackButton from '../components/BackButton'
import SearchableSelect from '../components/SearchableSelect'
import EnhancedLeadDetailsModal from '../shared/components/EnhancedLeadDetailsModal'
import { PieChart } from '../shared/components/PieChart'
import { Filter, ChevronDown, ChevronUp, User, Users, Tag, Briefcase, Calendar, Trophy, FileText, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react'
import { FaChevronDown, FaFileExport } from 'react-icons/fa'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function ProposalsReport() {
  const { i18n } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const isRTL = i18n.language === 'ar'
  const { user } = useAppState()

  const isAdminOrManager = useMemo(() => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    const role = (user.role || '').toLowerCase();
    return ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager', 'sales manager', 'branch manager'].includes(role);
  }, [user]);

  const [proposals, setProposals] = useState([])
  const [usersList, setUsersList] = useState([])
  const [sourceOptions, setSourceOptions] = useState(['all'])
  const [projectOptions, setProjectOptions] = useState(['all'])
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [expandedRows, setExpandedRows] = useState({})

  const getDescendants = (rootId, allUsers) => {
    let descendants = []
    const direct = allUsers.filter(u => u.manager_id === rootId)
    direct.forEach(u => {
      descendants.push(u)
      descendants = descendants.concat(getDescendants(u.id, allUsers))
    })
    return descendants
  }

  useEffect(() => {
    let isMounted = true

    const loadUsers = async () => {
      try {
        const res = await api.get('/api/users')
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        if (!isMounted) return
        setUsersList(data)
      } catch (e) {
        if (!isMounted) return
        setUsersList([])
      }
    }

    const loadProposals = async () => {
      try {
        const [byNext, byType] = await Promise.all([
          api.get('/api/lead-actions', { params: { next_action_type: 'proposal' } }),
          api.get('/api/lead-actions', { params: { type: 'proposal' } })
        ])

        const extract = res =>
          Array.isArray(res.data) ? res.data : (res.data?.data || [])

        const combined = [...extract(byNext), ...extract(byType)]
        const uniqueMap = new Map()
        combined.forEach(action => {
          if (action && !uniqueMap.has(action.id)) {
            uniqueMap.set(action.id, action)
          }
        })
        const unique = Array.from(uniqueMap.values())

        const mapped = unique.map(action => {
          const details = action.details || {}
          const lead = action.lead || {}

          const rawAmount =
            details.proposalAmount ??
            details.proposal_amount ??
            details.amount ??
            0

          const value =
            typeof rawAmount === 'number'
              ? rawAmount
              : parseFloat(rawAmount || '0') || 0

          const dateRaw =
            details.proposalDate ||
            details.proposal_date ||
            action.date ||
            action.created_at

          const proposalDate = dateRaw ? String(dateRaw).slice(0, 10) : ''

          const leadName =
            lead.name || lead.fullName || lead.company || ''

          const contact =
            lead.phone || lead.mobile || lead.whatsapp || ''

          const salesperson =
            (action.user && action.user.name) ||
            lead.sales_person ||
            lead.salesperson ||
            lead.assigned_to ||
            ''

          const source = lead.source || lead.channel || ''
          const project = lead.project || details.project || ''

          return {
            id: action.id,
            leadId: lead.id,
            leadName,
            contact,
            source,
            project,
            value,
            salesperson,
            proposalDate
          }
        })

        if (!isMounted) return
        setProposals(mapped)
      } catch (e) {
        if (!isMounted) return
        console.error('Failed to load proposals actions', e)
        setProposals([])
      }
    }

    loadUsers()
    loadProposals()

    const handleUpdate = () => {
      loadProposals()
    }

    window.addEventListener('leadsDataUpdated', handleUpdate)

    return () => {
      isMounted = false
      window.removeEventListener('leadsDataUpdated', handleUpdate)
    }
  }, [])

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await api.get('/api/sources?active=1')
        const data = Array.isArray(res.data) ? res.data : (res.data.data || [])
        const names = Array.from(new Set(data.map(s => s.name).filter(Boolean)))
        setSourceOptions(['all', ...names])
      } catch (e) {
        console.error('Failed to fetch sources for proposals report', e)
        const set = new Set(proposals.map(p => p.source).filter(Boolean))
        setSourceOptions(['all', ...Array.from(set)])
      }
    }

    fetchSources()
  }, [proposals])

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/api/projects')
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        const names = data.map(p => p.name || p.name_ar || p.title).filter(Boolean)
        const unique = Array.from(new Set(names))
        setProjectOptions(['all', ...unique])
      } catch (e) {
        console.error('Failed to fetch projects for proposals report', e)
        const set = new Set(proposals.map(p => p.project).filter(Boolean))
        setProjectOptions(['all', ...Array.from(set)])
      }
    }

    fetchProjects()
  }, [proposals])

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [salesPersonFilter, setSalesPersonFilter] = useState('all')
  const [managerFilter, setManagerFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [proposalDateFilter, setProposalDateFilter] = useState('')
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [entriesPerPage, setEntriesPerPage] = useState(10)

  const salesPersonOptions = useMemo(() => {
    const fromUsers = usersList.map(u => u.name).filter(Boolean)
    const fromData = proposals.map(p => p.salesperson).filter(Boolean)

    if (usersList.length && managerFilter !== 'all') {
      const mgr = usersList.find(u => String(u.id) === String(managerFilter))
      if (mgr) {
        const team = [mgr, ...getDescendants(mgr.id, usersList)]
        const names = team.map(u => u.name).filter(Boolean)
        const set = new Set(names)
        return ['all', ...Array.from(set)]
      }
    }

    const set = new Set([...fromUsers, ...fromData])
    return ['all', ...Array.from(set)]
  }, [usersList, proposals, managerFilter])

  const managerOptions = useMemo(() => {
    const uniqueUsers = Array.from(
      new Map(usersList.map(u => [u.id, u])).values()
    )
    return [{ id: 'all', name: isRTL ? 'الكل' : 'All' }, ...uniqueUsers]
  }, [usersList, isRTL])

  const filtered = useMemo(() => {
    return proposals.filter(p => {
      const bySales = salesPersonFilter === 'all' || p.salesperson === salesPersonFilter
      const byManager = (() => {
        if (!usersList.length || managerFilter === 'all') return true
        const mgr = usersList.find(u => String(u.id) === String(managerFilter))
        if (!mgr) return true
        const all = [mgr, ...getDescendants(mgr.id, usersList)]
        const salesNames = new Set(all.map(u => u.name).filter(Boolean))
        return !p.salesperson || salesNames.has(p.salesperson)
      })()
      const bySource = sourceFilter === 'all' || p.source === sourceFilter
      const byProject = projectFilter === 'all' || p.project === projectFilter
      const byDate = !proposalDateFilter ? true : p.proposalDate === proposalDateFilter
      return bySales && byManager && bySource && byProject && byDate
    })
  }, [proposals, salesPersonFilter, managerFilter, sourceFilter, projectFilter, proposalDateFilter, usersList])

  useEffect(() => {
    setCurrentPage(1)
  }, [salesPersonFilter, managerFilter, sourceFilter, projectFilter, proposalDateFilter])

  const totalRecords = filtered.length
  const pageCount = Math.ceil(totalRecords / entriesPerPage)
  const paginatedData = filtered.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  )

  const totalProposals = filtered.length
  const totalRevenue = filtered.reduce((sum, p) => sum + (p.value || 0), 0)
  const totalLeads = useMemo(() => {
    const set = new Set(filtered.map(p => p.leadName))
    return set.size
  }, [filtered])

  const proposalsByChannelSegments = useMemo(() => {
    const map = new Map()
    filtered.forEach(p => {
      const key = p.source || (isRTL ? 'غير معروف' : 'Unknown')
      map.set(key, (map.get(key) || 0) + 1)
    })
    const baseColors = ['#3b82f6', '#10b981', '#f97316', '#a855f7', '#ef4444', '#22c55e']
    return Array.from(map.entries()).map(([label, value], idx) => ({
      label,
      value,
      color: baseColors[idx % baseColors.length]
    }))
  }, [filtered, isRTL])

  const proposalsByProjectSegments = useMemo(() => {
    const map = new Map()
    filtered.forEach(p => {
      const key = p.project || (isRTL ? 'غير معروف' : 'Unknown')
      map.set(key, (map.get(key) || 0) + 1)
    })
    const baseColors = ['#8b5cf6', '#ec4899', '#10b981', '#f97316', '#3b82f6', '#22c55e']
    return Array.from(map.entries()).map(([label, value], idx) => ({
      label,
      value,
      color: baseColors[idx % baseColors.length]
    }))
  }, [filtered, isRTL])

  const leaderboard = useMemo(() => {
    const map = new Map()
    filtered.forEach(p => {
      const key = p.salesperson || (isRTL ? 'غير معروف' : 'Unknown')
      if (!map.has(key)) {
        map.set(key, { name: key, proposals: 0, value: 0 })
      }
      const item = map.get(key)
      item.proposals += 1
      item.value += p.value || 0
    })
    return Array.from(map.values()).sort((a, b) => {
      if (b.proposals !== a.proposals) return b.proposals - a.proposals
      return b.value - a.value
    })
  }, [filtered, isRTL])

  const handleExportExcel = () => {
    const rows = filtered.map(p => ({
      [isRTL ? 'اسم العميل' : 'Lead Name']: p.leadName,
      [isRTL ? 'رقم الهاتف' : 'Contact']: p.contact,
      [isRTL ? 'المصدر' : 'Source']: p.source,
      [isRTL ? 'المشروع' : 'Project']: p.project,
      [isRTL ? 'قيمة العرض' : 'Proposal Revenue']: p.value,
      [isRTL ? 'مسؤول المبيعات' : 'Sales Person']: p.salesperson,
      [isRTL ? 'تاريخ العرض' : 'Proposal Date']: p.proposalDate
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Proposals')
    const fileName = 'Proposals_Report.xlsx'
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Proposals Report',
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
        isRTL ? 'اسم العميل' : "Lead Name",
        isRTL ? 'رقم الهاتف' : "Contact",
        isRTL ? 'المصدر' : "Source",
        isRTL ? 'المشروع' : "Project",
        isRTL ? 'قيمة العرض' : "Proposal Revenue",
        isRTL ? 'مسؤول المبيعات' : "Sales Person",
        isRTL ? 'تاريخ العرض' : "Proposal Date"
      ]
      
      const tableRows = []

      filtered.forEach(p => {
        const rowData = [
          p.leadName,
          p.contact,
          p.source,
          p.project,
          p.value.toLocaleString(),
          p.salesperson,
          p.proposalDate
        ]
        tableRows.push(rowData)
      })

      doc.text(isRTL ? 'تقرير العروض' : "Proposals Report", 14, 15)
      autoTable.default(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { font: 'helvetica', fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      })
      doc.save("proposals_report.pdf")
      logExportEvent({
        module: 'Proposals Report',
        fileName: 'proposals_report.pdf',
        format: 'pdf',
      })
      setShowExportMenu(false)
    } catch (error) {
      console.error("Export PDF Error:", error)
    }
  }

  const handleDelete = (id) => {
    setProposals(prev => prev.filter(p => p.id !== id))
  }

  const handlePreview = (proposal) => {
    setSelectedLead({
      id: proposal.leadId,
      name: proposal.leadName,
      phone: proposal.contact,
      source: proposal.source,
      status: 'proposal_sent',
      assignedTo: proposal.salesperson,
      project: proposal.project
    })
    setShowLeadModal(true)
  }

  const clearFilters = () => {
    setSalesPersonFilter('all')
    setManagerFilter('all')
    setSourceFilter('all')
    setProjectFilter('all')
    setProposalDateFilter('')
  }

  const renderPieCard = (title, data) => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0)
    return (
      <div className="group relative bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div className={`text-sm font-semibold mb-2 ${isLight ? 'text-black' : 'text-white'} dark:text-white text-center md:text-left`}>{title}</div>
        <div className="h-48 flex items-center justify-center">
          <PieChart
            segments={data}
            size={170}
            centerValue={total}
            centerLabel={isRTL ? 'الإجمالي' : 'Total'}
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {data.map(segment => (
            <div key={segment.label} className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }}></div>
              <span className="dark:text-white">
                {segment.label}: {segment.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] overflow-hidden min-w-0 max-w-[1600px] mx-auto space-y-6">
      <div>
        <BackButton to="/reports" />
        <h1 className="text-2xl font-bold dark:text-white mb-2">
          {isRTL ? 'تقارير العروض' : 'Proposals Report'}
        </h1>
        <p className="dark:text-white text-sm">
          {isRTL ? 'تحليل أداء العروض والإيرادات' : 'Analyze your proposals performance and revenue'}
        </p>
      </div>

      <div className="backdrop-blur-md rounded-2xl shadow-sm border border-theme-border dark:border-gray-700/50 p-6 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 dark:text-white font-semibold">
            <Filter size={20} className="text-blue-500 dark:text-blue-400" />
            <h3>{isRTL ? 'تصفية' : 'Filter'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllFilters(prev => !prev)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              {showAllFilters ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض الكل' : 'Show All')}
              <FaChevronDown
                size={12}
                className={`transform transition-transform duration-300 ${showAllFilters ? 'rotate-180' : 'rotate-0'}`}
              />
            </button>
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm dark:text-white hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              {isRTL ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                <User size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'مسؤول المبيعات' : 'Sales Person'}
              </label>
              <SearchableSelect value={salesPersonFilter} onChange={v => setSalesPersonFilter(v)}>
                {salesPersonOptions.map(s => (
                  <option key={s} value={s}>
                    {s === 'all' ? (isRTL ? 'الكل' : 'All') : s}
                  </option>
                ))}
              </SearchableSelect>
            </div>
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                <Users size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'المدير' : 'Manager'}
              </label>
              <SearchableSelect value={managerFilter} onChange={v => setManagerFilter(v)}>
                {managerOptions.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id === 'all' ? (isRTL ? 'الكل' : 'All') : m.name}
                  </option>
                ))}
              </SearchableSelect>
            </div>
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                <Tag size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'المصدر' : 'Source'}
              </label>
              <SearchableSelect value={sourceFilter} onChange={v => setSourceFilter(v)}>
                {sourceOptions.map(s => (
                  <option key={s} value={s}>
                    {s === 'all' ? (isRTL ? 'الكل' : 'All') : s}
                  </option>
                ))}
              </SearchableSelect>
            </div>
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                <Briefcase size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'المشروع' : 'Project'}
              </label>
              <SearchableSelect value={projectFilter} onChange={v => setProjectFilter(v)}>
                {projectOptions.map(p => (
                  <option key={p} value={p}>
                    {p === 'all' ? (isRTL ? 'الكل' : 'All') : p}
                  </option>
                ))}
              </SearchableSelect>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 ease-in-out overflow-hidden ${
              showAllFilters ? 'max-h-[1000px] opacity-100 pt-2' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'تاريخ العرض' : 'Proposal Date'}
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={proposalDateFilter}
                onChange={e => setProposalDateFilter(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isRTL ? 'إجمالي العروض' : 'Total Proposals', value: totalProposals, accent: 'bg-emerald-500' },
          { label: isRTL ? 'إجمالي العملاء المحتملين' : 'Total Leads', value: totalLeads, accent: 'bg-indigo-500' },
          { label: isRTL ? 'إيرادات العروض' : 'Proposals Revenue', value: `${totalRevenue.toLocaleString()} EGP`, accent: 'bg-blue-500' }
        ].map(card => (
          <div
            key={card.label}
            className="group relative bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden flex items-center justify-between"
          >
            <div>
              <div className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{card.label}</div>
              <div className="text-lg font-semibold">{card.value}</div>
            </div>
            <div className={`w-8 h-8 rounded-lg ${card.accent}`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {renderPieCard(isRTL ? 'العروض حسب القناة' : 'Proposals by channel', proposalsByChannelSegments)}
        {renderPieCard(isRTL ? 'العروض حسب المشروع' : 'Proposals by project', proposalsByProjectSegments)}
        <div className="group relative bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700/50">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                <Trophy size={20} />
              </div>
              <div className={`text-sm font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'الأفضل أداءً' : 'Top Performers'}</div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {leaderboard.length === 0 && (
                  <li className="text-xs dark:text-white text-center py-4">{isRTL ? 'لا توجد بيانات' : 'No data'}</li>
                )}
                {leaderboard.map((item, index) => {
                  let rankColor = 'bg-gray-100 dark:bg-gray-700 dark:text-white'
                  let rankIcon = null

                  if (index === 0) {
                    rankColor =
                      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700'
                    rankIcon = <Trophy size={12} />
                  } else if (index === 1) {
                    rankColor =
                      'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                  } else if (index === 2) {
                    rankColor =
                      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700'
                  }

                  return (
                    <li
                      key={item.name}
                      className="flex items-center justify-between p-3 hover:bg-gray-700/50 transition-colors group/item"
                    >
                      <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs shadow-sm ${rankColor}`}
                      >
                        {rankIcon || index + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium dark:text-white group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                          {item.name}
                        </span>
                        <span className="text-[10px] dark:text-white">
                          {isRTL ? 'العروض' : 'Proposals'}: {item.proposals} • {isRTL ? 'الإيرادات' : 'Revenue'}: {item.value.toLocaleString()} EGP
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md border border-theme-border dark:border-gray-700/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme-border dark:border-gray-700/50 flex items-center justify-between">
          <h2 className={`text-lg font-semibold ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'نظرة عامة على العروض' : 'Proposals Overview'}</h2>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <FaFileExport />
              {isRTL ? 'تصدير' : 'Export'}
              <FaChevronDown
                className={`transform transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`}
                size={12}
              />
            </button>
            {showExportMenu && (
              <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 w-48`}>
                <button
                  onClick={handleExportExcel}
                  className="w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-white"
                >
                  <FaFileExcel className="text-green-600" /> {isRTL ? 'تصدير كـ Excel' : 'Export to Excel'}
                </button>
                <button
                  onClick={exportToPdf}
                  className="w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-white"
                >
                  <FaFilePdf className="text-red-600" /> {isRTL ? 'تصدير كـ PDF' : 'Export to PDF'}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase bg-theme-bg dark:bg-gray-800 ${isLight ? 'text-black' : 'text-white'} hidden md:table-header-group`}>
              <tr>
                <th className="px-4 py-3">{isRTL ? 'اسم العميل' : 'Lead Name'}</th>
                <th className="px-4 py-3">{isRTL ? 'رقم الهاتف' : 'Contact'}</th>
                <th className="px-4 py-3">{isRTL ? 'المصدر' : 'Source'}</th>
                <th className="px-4 py-3">{isRTL ? 'المشروع' : 'Project'}</th>
                <th className="px-4 py-3 text-center">{isRTL ? 'قيمة العرض' : 'Proposal Revenue'}</th>
                <th className="px-4 py-3">{isRTL ? 'مسؤول المبيعات' : 'Sales Person'}</th>
                <th className="px-4 py-3">{isRTL ? 'تاريخ العرض' : 'Proposal Date'}</th>
                <th className="px-4 py-3 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border dark:divide-gray-700/50">
              {paginatedData.map(proposal => (
                <React.Fragment key={proposal.id}>
                  <tr className="hover:bg-gray-700/30 transition-colors border-b border-theme-border dark:border-gray-700/50 last:border-0">
                    <td className={`px-4 py-3 font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                      <div className="flex items-center gap-2">
                        <button 
                          className={`md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${isLight ? 'text-black' : 'text-white'}`}
                          onClick={() => toggleRow(proposal.id)}
                        >
                          {expandedRows[proposal.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {proposal.leadName}
                      </div>
                      {/* Mobile-only info preview */}
                      <div className={`md:hidden text-xs ${isLight ? 'text-black' : 'text-white'} opacity-70 mt-1`}>
                        {proposal.value.toLocaleString()} EGP • {proposal.salesperson}
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${isLight ? 'text-black' : 'text-white'} hidden md:table-cell`}>{proposal.contact}</td>
                    <td className={`px-4 py-3 ${isLight ? 'text-black' : 'text-white'} hidden md:table-cell`}>{proposal.source}</td>
                    <td className={`px-4 py-3 ${isLight ? 'text-black' : 'text-white'} hidden md:table-cell`}>{proposal.project}</td>
                    <td className={`px-4 py-3 text-center font-semibold ${isLight ? 'text-black' : 'text-white'} hidden md:table-cell`}>
                      {proposal.value.toLocaleString()} EGP
                    </td>
                    <td className={`px-4 py-3 ${isLight ? 'text-black' : 'text-white'} hidden md:table-cell`}>{proposal.salesperson}</td>
                    <td className={`px-4 py-3 ${isLight ? 'text-black' : 'text-white'} hidden md:table-cell`}>{proposal.proposalDate}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(proposal)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title={isRTL ? 'معاينة' : 'Preview'}
                        >
                          <Eye size={16} />
                        </button>
                        {isAdminOrManager && (
                          <button
                            onClick={() => handleDelete(proposal.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title={isRTL ? 'حذف' : 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Mobile Expandable Row */}
                  {expandedRows[proposal.id] && (
                    <tr className="md:hidden bg-white/5 dark:bg-white/5">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)]">{isRTL ? 'رقم الهاتف' : 'Contact'}</span>
                            <span className="dark:text-white font-medium">{proposal.contact}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)]">{isRTL ? 'المصدر' : 'Source'}</span>
                            <span className="dark:text-white font-medium">{proposal.source}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)]">{isRTL ? 'المشروع' : 'Project'}</span>
                            <span className="dark:text-white font-medium">{proposal.project}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)]">{isRTL ? 'قيمة العرض' : 'Proposal Revenue'}</span>
                            <span className="dark:text-white font-medium">{proposal.value.toLocaleString()} EGP</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)]">{isRTL ? 'مسؤول المبيعات' : 'Sales Person'}</span>
                            <span className="dark:text-white font-medium">{proposal.salesperson}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--muted-text)]">{isRTL ? 'تاريخ العرض' : 'Proposal Date'}</span>
                            <span className="dark:text-white font-medium">{proposal.proposalDate}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center dark:text-white">
                    {isRTL ? 'لا توجد عروض' : 'No proposals found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-theme-bg border-t border-theme-border dark:border-gray-700/60 flex items-center justify-between gap-3">
          <div className={`text-[11px] sm:text-xs ${isLight ? 'text-black' : 'text-white'}`}>
            {isRTL
              ? `إظهار ${Math.min((currentPage - 1) * entriesPerPage + 1, totalRecords)}-${Math.min(currentPage * entriesPerPage, totalRecords)} من ${totalRecords}`
              : `Showing ${Math.min((currentPage - 1) * entriesPerPage + 1, totalRecords)}-${Math.min(currentPage * entriesPerPage, totalRecords)} of ${totalRecords}`}
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
              <span className="text-sm whitespace-nowrap">
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
              <span className="text-[10px] sm:text-xs text-[var(--muted-text)] whitespace-nowrap">
                {isRTL ? 'لكل صفحة:' : 'Per page:'}
              </span>
              <select
                className="input w-24 text-sm py-0 px-2 h-8"
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
      <EnhancedLeadDetailsModal
        lead={selectedLead}
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        theme={theme}
      />
    </div>
  )
}
