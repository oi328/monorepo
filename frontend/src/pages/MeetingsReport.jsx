import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { useTheme } from '@shared/context/ThemeProvider'
import { api, logExportEvent } from '../utils/api'
import { PieChart } from '../shared/components/PieChart'
import { useAppState } from '../shared/context/AppStateProvider'
import BackButton from '../components/BackButton'
import SearchableSelect from '../components/SearchableSelect'
import { Filter, ChevronDown, User, Users, Tag, Briefcase, Calendar, Trophy, ChevronRight, ChevronLeft } from 'lucide-react'
import { FaChevronDown, FaFileExport, FaFileExcel, FaFilePdf } from 'react-icons/fa'
import { RiEyeLine, RiDeleteBinLine } from 'react-icons/ri'
import EnhancedLeadDetailsModal from '../shared/components/EnhancedLeadDetailsModal'

export default function MeetingsReport() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { company, user } = useAppState()

  const isAdminOrManager = useMemo(() => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    const role = (user.role || '').toLowerCase();
    return ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager', 'sales manager', 'branch manager'].includes(role);
  }, [user]);

  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(false)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [expandedRows, setExpandedRows] = useState({})
  
  // Filter States
  const [salesPersonFilter, setSalesPersonFilter] = useState([])
  const [projectFilter, setProjectFilter] = useState([])
  const [sourceFilter, setSourceFilter] = useState([])
  const [managerFilter, setManagerFilter] = useState([])
  const [meetingDateFilter, setMeetingDateFilter] = useState('')
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])

  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const exportMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Metadata Fetching
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [usersRes, projectsRes, itemsRes] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/projects'),
          api.get('/api/items')
        ])

        const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || [])
        const mappedUsers = rawUsers.map(u => ({
          id: u.id,
          name: u.name,
          role: Array.isArray(u.roles) && u.roles[0]?.name ? u.roles[0].name : (u.role || ''),
          manager_id: u.manager_id || null
        }))
        setUsers(mappedUsers)

        const rawProjects = Array.isArray(projectsRes.data) ? projectsRes.data : (projectsRes.data.data || [])
        const rawItems = Array.isArray(itemsRes.data) ? itemsRes.data : (itemsRes.data.data || [])

        const type = String(company?.company_type || '').toLowerCase()
        if (type === 'real estate') {
          setProjects(rawProjects)
        } else {
          setProjects(rawItems)
        }
      } catch (e) {
        console.error('Failed to fetch metadata', e)
        setUsers([])
        setProjects([])
      }
    }
    fetchMeta()
  }, [company?.company_type])

  // Data Loading with Server-side Filtering
  useEffect(() => {
    let isMounted = true
    const loadMeetings = async () => {
      try {
        setLoading(true)
        const params = {
          sales_person: salesPersonFilter,
          manager_id: managerFilter,
          project: projectFilter,
          source: sourceFilter,
          meeting_date: meetingDateFilter
        }
        
        // Clean up empty params
        Object.keys(params).forEach(key => {
          if (Array.isArray(params[key]) && params[key].length === 0) delete params[key]
          if (!params[key]) delete params[key]
        })

        const res = await api.get('/api/leads/meetings-report', { params })
        const data = Array.isArray(res.data) ? res.data : res.data?.data || []
        
        if (!isMounted) return
        
        const mappedData = data.map(item => {
          const arranged = item.arranged_meetings || 0;
          const done = item.done_meetings || 0;
          // Calculate score: (Done / Arrange) * 100
          const calculatedScore = arranged > 0 ? Math.round((done / arranged) * 100) : 0;

          return {
            id: item.id,
            leadId: item.id,
            leadName: item.name || 'Unknown',
            mobile: item.phone || '',
            source: item.source || '',
            project: item.project || '',
            assigned_to: item.assigned_to || null,
            score: calculatedScore,
            salesPerson: item.sales_person || '',
            arrangedCount: arranged,
            doneCount: done,
            missedCount: item.missed_meetings || 0,
            meetingDate: item.meeting_date ? item.meeting_date.substring(0, 10) : ''
          }
        })

        setMeetings(mappedData)
        setCurrentPage(1) // Reset to first page on filter change
      } catch (e) {
        if (isMounted) {
          console.error('Failed to load meetings report', e)
          setMeetings([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadMeetings()

    const handleUpdate = () => loadMeetings()
    window.addEventListener('leadsDataUpdated', handleUpdate)
    return () => {
      isMounted = false
      window.removeEventListener('leadsDataUpdated', handleUpdate)
    }
  }, [salesPersonFilter, managerFilter, projectFilter, sourceFilter, meetingDateFilter])

  // Options for Filters
  const salesPersonOptions = useMemo(() => {
    return users.map(u => ({ value: u.id, label: u.name || `#${u.id}` }))
  }, [users])

  const managerOptions = useMemo(() => {
    const managerIds = new Set(users.map(u => u.manager_id).filter(Boolean))
    return users.filter(u => managerIds.has(u.id)).map(u => ({
      value: String(u.id),
      label: u.name || `#${u.id}`
    }))
  }, [users])

  const sourceOptions = useMemo(() => {
    const values = Array.from(new Set(meetings.map(m => m.source).filter(Boolean)))
    return values.map(v => ({ value: v, label: v }))
  }, [meetings])

  const projectOptions = useMemo(() => {
    return projects.map(p => {
      const label = p.name || p.title || p.name_en || `#${p.id}`
      return { value: label, label }
    })
  }, [projects])

  // Stats & Charts Logic
  const kpiData = useMemo(() => {
    let totalArranged = 0;
    let totalDone = 0;
    meetings.forEach(m => {
      totalArranged += Number(m.arrangedCount || 0);
      totalDone += Number(m.doneCount || 0);
    });
    return {
      totalMeetings: totalArranged,
      totalLeads: meetings.length,
      arrangeMeetings: totalArranged,
      doneMeetings: totalDone,
      missedMeetings: Math.max(0, totalArranged - totalDone)
    };
  }, [meetings]);

  const channelData = useMemo(() => {
    const map = new Map();
    meetings.forEach(m => {
      const source = m.source || (isRTL ? 'غير معروف' : 'Unknown');
      map.set(source, (map.get(source) || 0) + 1);
    });
    const colors = ['#3b82f6', '#10b981', '#f97316', '#a855f7', '#ef4444'];
    return Array.from(map.entries()).map(([label, value], i) => ({
      label,
      value,
      color: colors[i % colors.length]
    }));
  }, [meetings, isRTL]);

  const projectSegments = useMemo(() => {
    const map = new Map()
    meetings.forEach(meeting => {
      const key = meeting.project || (isRTL ? 'غير معروف' : 'Unknown')
      map.set(key, (map.get(key) || 0) + 1)
    })
    const baseColors = ['#8b5cf6', '#ec4899', '#10b981', '#f97316', '#3b82f6', '#22c55e']
    return Array.from(map.entries()).map(([label, value], idx) => ({
      label,
      value,
      color: baseColors[idx % baseColors.length]
    }))
  }, [meetings, isRTL])

  const bestPerformers = useMemo(() => {
    const map = new Map();
    meetings.forEach(m => {
      if (m.doneCount > 0) {
        const person = m.salesPerson || (isRTL ? 'غير معروف' : 'Unknown');
        map.set(person, (map.get(person) || 0) + m.doneCount);
      }
    });
    return Array.from(map.entries())
      .map(([name, score], id) => ({ id, name, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [meetings, isRTL]);

  const pageCount = Math.max(1, Math.ceil(meetings.length / entriesPerPage))
  const paginatedMeetings = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage
    return meetings.slice(start, start + entriesPerPage)
  }, [meetings, currentPage, entriesPerPage])

  // Handlers
  const handleExport = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(meetings)
    XLSX.utils.book_append_sheet(wb, ws, 'Meetings')
    XLSX.writeFile(wb, 'Meetings_Report.xlsx')
    logExportEvent({ module: 'Meetings Report', fileName: 'Meetings_Report.xlsx', format: 'xlsx' })
  }

  const exportToPdf = async () => {
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()
      
      const tableColumn = [
        isRTL ? 'الاسم' : "Lead Name", 
        isRTL ? 'رقم الهاتف' : "Mobile Contact", 
        isRTL ? 'ترتيب' : "Arrange",
        isRTL ? 'تم' : "Done",
        isRTL ? 'لم يحضر' : "Missed",
        isRTL ? 'الجدية' : "Score",
        isRTL ? 'المصدر' : "Source", 
        isRTL ? 'المشروع' : "Project", 
        isRTL ? 'مسؤول المبيعات' : "Sales Person",
        isRTL ? 'تاريخ الاجتماع' : "Meeting Date"
      ]
      const tableRows = meetings.map(m => [
        m.leadName, m.mobile, m.arrangedCount, m.doneCount, m.missedCount, `${m.score}%`, m.source, m.project, m.salesPerson, m.meetingDate
      ])

      doc.text(isRTL ? 'تقرير الاجتماعات' : "Meetings Report", 14, 15)
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { font: 'helvetica', fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      })
      doc.save("meetings_report.pdf")
      logExportEvent({ module: 'Meetings Report', fileName: 'meetings_report.pdf', format: 'pdf' })
      setShowExportMenu(false)
    } catch (error) {
      console.error("Export PDF Error:", error)
    }
  }

  const handleDelete = (id) => {
    if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا السجل من العرض؟' : 'Are you sure you want to remove this record from view?')) {
      setMeetings(prev => prev.filter(m => m.id !== id))
    }
  }

  const clearFilters = () => {
    setSalesPersonFilter([])
    setManagerFilter([])
    setSourceFilter([])
    setProjectFilter([])
    setMeetingDateFilter('')
    setCurrentPage(1)
  }

  const renderPieChart = (title, data) => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0)
    return (
      <div className="group relative bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div className={`text-sm font-semibold mb-2 text-center md:text-left ${isLight ? 'text-black' : 'text-white'}`}>{title}</div>
        <div className="h-48 flex items-center justify-center">
          <PieChart segments={data} size={170} centerValue={total} centerLabel={isRTL ? 'الإجمالي' : 'Total'} />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {data.map((segment) => (
            <div key={segment.label} className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }}></div>
              <span className="dark:text-white">{segment.label}: {segment.value}</span>
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
        <h1 className="text-2xl font-bold dark:text-white mb-2">{isRTL ? 'تقرير الاجتماعات' : ' Meetings '}</h1>
        <p className="dark:text-white text-sm">{isRTL ? 'تتبع وتحليل أداء الاجتماعات الخاصة بك' : 'Track and analyze your meetings performance'}</p>
      </div>

      <div className="bg-theme-bg backdrop-blur-md rounded-2xl shadow-sm border border-theme-border dark:border-gray-700/50 p-6 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 dark:text-white font-semibold">
            <Filter size={20} className="text-blue-500 dark:text-blue-400" />
            <h3 className={`${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'تصفية' : 'Filter'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAllFilters(prev => !prev)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
              {showAllFilters ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض الكل' : 'Show All')}
              <ChevronDown size={12} className={`transform transition-transform duration-300 ${showAllFilters ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <button onClick={clearFilters} className="px-3 py-1.5 text-sm dark:text-white hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">{isRTL ? 'إعادة تعيين' : 'Reset'}</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}><User size={12} className="text-blue-500 dark:text-blue-400" />{isRTL ? 'مسؤول المبيعات' : 'Sales Person'}</label>
              <SearchableSelect options={salesPersonOptions} value={salesPersonFilter} onChange={setSalesPersonFilter} placeholder={isRTL ? 'اختر' : 'Select'} multiple isRTL={isRTL} icon={<User size={16} />} />
            </div>
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}><Users size={12} className="text-blue-500 dark:text-blue-400" />{isRTL ? 'المدير' : 'Manager'}</label>
              <SearchableSelect options={managerOptions} value={managerFilter} onChange={setManagerFilter} placeholder={isRTL ? 'اختر' : 'Select'} multiple isRTL={isRTL} icon={<Users size={16} />} />
            </div>
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}><Tag size={12} className="text-blue-500 dark:text-blue-400" />{isRTL ? 'المصدر' : 'Source'}</label>
              <SearchableSelect options={sourceOptions} value={sourceFilter} onChange={setSourceFilter} placeholder={isRTL ? 'اختر' : 'Select'} multiple isRTL={isRTL} icon={<Tag size={16} />} />
            </div>
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}><Briefcase size={12} className="text-blue-500 dark:text-blue-400" />{isRTL ? 'المشروع' : 'Project'}</label>
              <SearchableSelect options={projectOptions} value={projectFilter} onChange={setProjectFilter} placeholder={isRTL ? 'اختر' : 'Select'} multiple isRTL={isRTL} icon={<Briefcase size={16} />} />
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 ease-in-out overflow-hidden ${showAllFilters ? 'max-h-[1000px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}><Calendar size={12} className="text-blue-500 dark:text-blue-400" />{isRTL ? 'تاريخ الاجتماع' : 'Meeting Date'}</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={meetingDateFilter} onChange={(e) => setMeetingDateFilter(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isRTL ? 'ترتيب اجتماعات' : 'Arrange Meetings', value: kpiData.arrangeMeetings, color: 'text-blue-600' },
          { label: isRTL ? 'إجمالي العملاء' : 'Total Leads', value: kpiData.totalLeads, color: 'text-purple-600' },
          { label: isRTL ? 'لم يحضر' : 'Missed Meetings', value: kpiData.missedMeetings, color: 'text-orange-600' },
          { label: isRTL ? 'اجتماعات تمت' : 'Done Meetings', value: kpiData.doneMeetings, color: 'text-green-600' }
        ].map((card, idx) => (
          <div key={idx} className="bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-6 flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1">
            <h3 className={`${isLight ? 'text-black' : 'text-white'} text-lg font-semibold mb-2`}>{card.label}</h3>
            <span className={`text-3xl font-bold ${card.color}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Charts & Best Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {renderPieChart(isRTL ? 'تحليل الاجتماعات حسب القناة' : 'Meeting by Channel Analysis', channelData)}
        {renderPieChart(isRTL ? 'تحليل الاجتماعات حسب المشروع' : 'Meetings by Project Analysis', projectSegments)}

        <div className="bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm border border-theme-border dark:border-gray-700/50 p-4 flex flex-col transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700/50">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400"><Trophy size={20} /></div>
            <div className={`text-sm font-semibold ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'الأفضل' : 'Top Performers'}</div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {bestPerformers.length === 0 ? <li className="text-xs dark:text-white text-center py-4">{isRTL ? 'لا توجد بيانات' : 'No data'}</li> :
                bestPerformers.map((performer, index) => (
                  <li key={performer.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs shadow-sm ${index === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 dark:bg-gray-700 dark:text-white'}`}>
                        {index === 0 ? <Trophy size={12} /> : index + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium dark:text-white group-hover/item:text-blue-600 transition-colors">{performer.name}</span>
                        <span className="text-[10px] dark:text-white">{index === 0 ? (isRTL ? 'الأفضل أداء' : 'Top Performer') : `${isRTL ? 'الترتيب' : 'Rank'} #${index + 1}`}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold dark:text-white">{performer.score}</span>
                      <span className="text-[10px] dark:text-white">{isRTL ? 'اجتماعات' : 'Meetings'}</span>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md border border-theme-border dark:border-gray-700/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme-border dark:border-gray-700/50 flex items-center justify-between">
          <h2 className={`text-lg font-bold ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'نظرة عامة على الاجتماعات' : 'Meetings Overview'}</h2>
          <div className="relative" ref={exportMenuRef}>
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
              <FaFileExport /> {isRTL ? 'تصدير' : 'Export'}
              <FaChevronDown className={`transform transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} size={12} />
            </button>
            {showExportMenu && (
              <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 w-48`}>
                <button onClick={handleExport} className="w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-white"><FaFileExcel className="text-green-600" /> {isRTL ? 'Excel' : 'Excel'}</button>
                <button onClick={exportToPdf} className="w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-white"><FaFilePdf className="text-red-600" /> {isRTL ? 'PDF' : 'PDF'}</button>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase bg-theme-bg dark:bg-white/5 ${isLight ? 'text-black' : 'text-white'}`}>
              <tr>
                <th className="px-4 py-3 border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'اسم العميل' : 'Lead Name'}</th>
                <th className="hidden md:table-cell px-4 py-3 border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'رقم الهاتف' : 'Mobile Contact'}</th>
                <th className="hidden md:table-cell px-4 py-3 border-b border-theme-border dark:border-gray-700/50 text-center">{isRTL ? 'ترتيب' : 'Arrange'}</th>
                <th className="hidden md:table-cell px-4 py-3 border-b border-theme-border dark:border-gray-700/50 text-center">{isRTL ? 'تم' : 'Done'}</th>
                <th className="hidden md:table-cell px-4 py-3 border-b border-theme-border dark:border-gray-700/50 text-center">{isRTL ? 'لم يحضر' : 'Missed'}</th>
                <th className="hidden md:table-cell px-4 py-3 border-b border-theme-border dark:border-gray-700/50 text-center">{isRTL ? 'الجدية' : 'Score'}</th>
                <th className="hidden md:table-cell px-4 py-3 border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'المصدر' : 'Source'}</th>
                <th className="hidden md:table-cell px-4 py-3 border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'المشروع' : 'Project'}</th>
                <th className="hidden md:table-cell px-4 py-3 border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'مسؤول المبيعات' : 'Sales Person'}</th>
                <th className="hidden md:table-cell px-4 py-3 border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'تاريخ الاجتماع' : 'Date'}</th>
                <th className="px-4 py-3 border-b border-theme-border dark:border-gray-700/50 text-center">{isRTL ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border dark:divide-gray-700/50">
              {paginatedMeetings.map((meeting) => (
                <React.Fragment key={meeting.id}>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium dark:text-white flex items-center gap-2">
                      <button onClick={() => toggleRow(meeting.id)} className="md:hidden p-1 hover:bg-white/10 rounded-full transition-colors">
                         <ChevronRight size={16} className={`transform transition-transform duration-200 ${expandedRows[meeting.id] ? 'rotate-90' : 'rtl:rotate-180'}`} />
                      </button>
                      {meeting.leadName}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 dark:text-white ">{meeting.mobile}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-center"><span className="font-bold text-orange-600">{meeting.arrangedCount}</span></td>
                    <td className="hidden md:table-cell px-4 py-3 text-center"><span className="font-bold text-green-600">{meeting.doneCount}</span></td>
                    <td className="hidden md:table-cell px-4 py-3 text-center"><span className="font-bold text-red-600">{meeting.missedCount}</span></td>
                    <td className="hidden md:table-cell px-4 py-3 text-center">
                      <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                        meeting.score >= 70 ? 'bg-green-100 text-green-700' :
                        meeting.score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {meeting.score}%
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 dark:text-white ">{meeting.source}</td>
                    <td className="hidden md:table-cell px-4 py-3 dark:text-white ">{meeting.project}</td>
                    <td className="hidden md:table-cell px-4 py-3 dark:text-white ">{meeting.salesPerson}</td>
                    <td className="hidden md:table-cell px-4 py-3 dark:text-white ">{meeting.meetingDate}</td>
                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={isRTL ? 'عرض العميل' : 'Preview'} onClick={() => { setSelectedLead({ id: meeting.leadId, name: meeting.leadName, phone: meeting.mobile, source: meeting.source, project: meeting.project, assigned_to: meeting.assigned_to, sales_person: meeting.salesPerson }); setShowLeadModal(true); }}>
                        <RiEyeLine size={18} />
                      </button>
                      {isAdminOrManager && (
                        <button onClick={() => handleDelete(meeting.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={isRTL ? 'حذف' : 'Remove'}>
                          <RiDeleteBinLine size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedRows[meeting.id] && (
                    <tr className="md:hidden bg-white/5">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex flex-col"><span>{isRTL ? 'الهاتف' : 'Mobile'}</span><span className="dark:text-white font-medium">{meeting.mobile}</span></div>
                          <div className="flex flex-col"><span>{isRTL ? 'الحالة' : 'Status'}</span><div className="flex gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">A: {meeting.arrangedCount}</span>
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">D: {meeting.doneCount}</span>
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">M: {meeting.missedCount}</span>
                          </div></div>
                          <div className="flex flex-col"><span>{isRTL ? 'المصدر' : 'Source'}</span><span className="dark:text-white">{meeting.source}</span></div>
                          <div className="flex flex-col"><span>{isRTL ? 'المشروع' : 'Project'}</span><span className="dark:text-white">{meeting.project}</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {meetings.length === 0 && !loading && (
                <tr><td colSpan="9" className="px-4 py-8 text-center dark:text-white ">{isRTL ? 'لا توجد بيانات' : 'No data found'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-4 py-3 bg-theme-bg border-t border-theme-border dark:border-gray-700/60 flex items-center justify-between gap-3">
          <div className="text-xs dark:text-white">
            {isRTL ? `إظهار ${meetings.length} سجل` : `Showing ${meetings.length} records`}
          </div>
          <div className="flex items-center gap-4">
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded disabled:opacity-50" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
              {isRTL ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            <span className="text-sm dark:text-white">{currentPage} / {pageCount}</span>
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded disabled:opacity-50" onClick={() => setCurrentPage(p => Math.min(p + 1, pageCount))} disabled={currentPage === pageCount}>
              {isRTL ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
        </div>
      </div>

      {showLeadModal && (
        <EnhancedLeadDetailsModal
          isOpen={showLeadModal}
          onClose={() => { setShowLeadModal(false); setSelectedLead(null); }}
          lead={selectedLead}
          isArabic={isRTL}
          theme={theme}
        />
      )}
    </div>
  )
}
