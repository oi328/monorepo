import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../shared/context/ThemeProvider'
import { useAppState } from '../shared/context/AppStateProvider'
import { canExportReport } from '../shared/utils/reportPermissions'
import { Phone, Activity, DollarSign, Target, Filter, ChevronDown, User, Users, Layers, Tag, Briefcase, Calendar, Clock, CheckCircle, ChevronLeft, ChevronRight, PieChart as PieChartIcon } from 'lucide-react'
import { FaFileExport, FaChevronDown, FaFileExcel, FaFilePdf } from 'react-icons/fa'
import * as XLSX from 'xlsx'
import { api, logExportEvent } from '../utils/api'
import BackButton from '../components/BackButton'
import SearchableSelect from '../components/SearchableSelect'
import { PieChart } from '../shared/components/PieChart'
import { motion, AnimatePresence } from 'framer-motion'

const ActionStageTooltip = ({ data, isRTL }) => {
  if (!data || data.length === 0) return null;
  
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[100] min-w-[200px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-4 backdrop-blur-xl"
    >
      <div className="relative">
        <p className="text-xs font-bold mb-3 border-b border-slate-100 dark:border-slate-700 pb-2 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {isRTL ? 'توزيع الأنشطة حسب المرحلة' : 'Activities by Stage'}
        </p>
        <div className="space-y-2.5">
          {data.map((item, index) => {
            const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800" 
                      style={{ backgroundColor: item.color, ringColor: item.color }}
                    ></span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{item.stage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{item.count}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {/* Tooltip Arrow */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-800 border-r border-b border-slate-100 dark:border-slate-700 rotate-45"></div>
      </div>
    </motion.div>
  );
};

export default function SalesActivitiesReport() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { user } = useAppState()
  const canExport = canExportReport(user, 'Sales Activities')
  const isLight = theme === 'light'
  const isRTL = i18n.language === 'ar'

  const actionDefs = [
      { name: isRTL ? 'متابعة' : 'Follow Up', color: '#0ea5e9' },
      { name: isRTL ? 'اجتماع' : 'Meeting', color: '#8b5cf6' },
      { name: isRTL ? 'عرض سعر' : 'Proposal', color: '#06b6d4' },
      { name: isRTL ? 'حجز' : 'Reservation', color: '#db2777' },
      { name: isRTL ? 'إغلاق صفقات' : 'Closing Deals', color: '#22c55e' },
      { name: isRTL ? 'إيجار' : 'Rent', color: '#f97316' },
      { name: isRTL ? 'إلغاء' : 'Cancel', color: '#ef4444' }
  ];

  // State for filters
  const [salesPersonFilter, setSalesPersonFilter] = useState([])
  const [managerFilter, setManagerFilter] = useState([])
  const [stageFilter, setStageFilter] = useState([])
  const [sourceFilter, setSourceFilter] = useState([])
  const [projectFilter, setProjectFilter] = useState([])
  
  const [assignDateFilter, setAssignDateFilter] = useState('')
  const [creationDateFilter, setCreationDateFilter] = useState('')
  const [lastActionDateFilter, setLastActionDateFilter] = useState('')
  const [closeDealsDateFilter, setCloseDealsDateFilter] = useState('')
  const [proposalDateFilter, setProposalDateFilter] = useState('')
  const [showAllFilters, setShowAllFilters] = useState(false)

  const [usersList, setUsersList] = useState([])
  const [sourcesList, setSourcesList] = useState([])
  const [stagesList, setStagesList] = useState([])
  const [projectsList, setProjectsList] = useState([])
  const [company, setCompany] = useState(null)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [actions, setActions] = useState([])
  const [kpiData, setKpiData] = useState({
    totalCalls: 0,
    totalAction: 0,
    totalRevenue: 0,
    achievementFromTarget: 0
  })

  const isSuperManagerRole = (role) => {
    const r = String(role || '').toLowerCase()
    return (
      r === 'admin' ||
      r === 'tenant admin' ||
      r === 'tenant-admin' ||
      r === 'operation manager' ||
      r === 'sales admin' ||
      r === 'director'
    )
  }

  const getDescendants = (rootId, allUsers) => {
    let descendants = []
    const direct = allUsers.filter(u => String(u.manager_id) === String(rootId))
    direct.forEach(u => {
      descendants.push(u)
      descendants = descendants.concat(getDescendants(u.id, allUsers))
    })
    return descendants
  }

  const getActionStageName = (action) => {
    const details = action.details || {}
    const stageObj = action.stage || details.stage
    if (stageObj && (stageObj.name || stageObj.nameAr || stageObj.name_ar)) {
      return stageObj.name || stageObj.nameAr || stageObj.name_ar
    }
    return (
      action.next_action_type ||
      details.nextAction ||
      details.next_action_type ||
      action.action_type ||
      action.type ||
      ''
    )
  }

  useEffect(() => {
    const fetchFilters = async () => {
      setLoadingFilters(true)
      try {
        const [usersRes, sourcesRes, stagesRes, companyRes] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/sources?active=1'),
          api.get('/api/stages?active=1'),
          api.get('/api/company-info')
        ])

        const usersData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || [])
        setUsersList(usersData)

        const sourcesData = Array.isArray(sourcesRes.data) ? sourcesRes.data : (sourcesRes.data?.data || [])
        setSourcesList(sourcesData)

        const stagesData = Array.isArray(stagesRes.data) ? stagesRes.data : (stagesRes.data?.data || [])
        setStagesList(stagesData.sort((a, b) => (a.order || 0) - (b.order || 0)))

        const tenant = companyRes.data?.tenant || companyRes.data?.company || null
        setCompany(tenant)
      } catch (e) {
        console.error('Failed to fetch filter data', e)
      } finally {
        setLoadingFilters(false)
      }
    }

    fetchFilters()
  }, [])

  useEffect(() => {
    const fetchActions = async () => {
      try {
        const res = await api.get('/api/lead-actions')
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        setActions(data)
      } catch (e) {
        console.error('Failed to fetch sales activities actions', e)
        setActions([])
      }
    }

    fetchActions()
  }, [])

  useEffect(() => {
    let totalCalls = 0
    let totalAction = 0
    let totalRevenue = 0

    actions.forEach(action => {
      const details = action.details || {}
      totalAction += 1

      const channel = (details.channel || action.channel || '').toLowerCase()
      const actionType = (action.action_type || action.type || '').toLowerCase()
      if (channel.includes('call') || actionType.includes('call')) {
        totalCalls += 1
      }

      const lead = action.lead || {}
      const valueRaw =
        details.closingRevenue ??
        details.revenue ??
        action.revenue ??
        (lead && lead.estimated_value) ??
        0
      const value =
        typeof valueRaw === 'number'
          ? valueRaw
          : parseFloat(valueRaw || '0') || 0
      totalRevenue += value
    })

    const target = 0
    const achievementFromTarget =
      target > 0 ? Math.round((totalRevenue / target) * 100) : 0

    setKpiData({
      totalCalls,
      totalAction,
      totalRevenue,
      achievementFromTarget
    })
  }, [actions])

  useEffect(() => {
    const fetchProjectsOrItems = async () => {
      try {
        const isGeneral = String(company?.company_type || '').toLowerCase() === 'general'
        const url = isGeneral ? '/api/items?all=1' : '/api/projects'
        const res = await api.get(url)
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        setProjectsList(data)
      } catch (e) {
        console.error('Failed to fetch projects/items for filters', e)
      }
    }

    if (company) {
      fetchProjectsOrItems()
    }
  }, [company])

  const salesPersonOptions = useMemo(() => {
    if (!usersList.length) return []

    let candidates

    if (!managerFilter || managerFilter.length === 0) {
      candidates = usersList
    } else {
      const selectedManagers = usersList.filter(u =>
        managerFilter.includes(String(u.id))
      )
      const hasSuperManager = selectedManagers.some(u =>
        isSuperManagerRole(
          u.role || (Array.isArray(u.roles) && u.roles[0]?.name) || ''
        )
      )

      if (hasSuperManager) {
        candidates = usersList
      } else {
        const all = []
        selectedManagers.forEach(m => {
          all.push(m)
          const subs = getDescendants(m.id, usersList)
          subs.forEach(s => {
            all.push(s)
          })
        })
        const map = new Map()
        all.forEach(u => {
          if (!map.has(u.id)) {
            map.set(u.id, u)
          }
        })
        candidates = Array.from(map.values())
      }
    }

    const names = candidates.map(u => u.name).filter(Boolean)
    const unique = Array.from(new Set(names))
    return unique.map(n => ({ value: n, label: n }))
  }, [usersList, managerFilter])

  const managerOptions = useMemo(() => {
    if (!usersList.length) return []
    const managers = usersList.filter(u => {
      const role = String(u.role || (Array.isArray(u.roles) && u.roles[0]?.name) || '').toLowerCase()
      const isSalesPerson = role.includes('sales person') || role.includes('salesperson')
      return !isSalesPerson
    })
    const uniqueManagers = Array.from(new Map(managers.map(m => [m.id, m])).values())
    return uniqueManagers
      .map(m => ({
        value: String(m.id),
        label: m.name || '',
      }))
      .filter(o => o.label)
  }, [usersList])

  const stageOptions = useMemo(() => {
    if (!stagesList.length) return []
    return stagesList.map(s => ({
      value: s.name,
      label: i18n.language === 'ar' ? (s.nameAr || s.name) : s.name,
      color: actionDefs.find(a => a.name === s.name)?.color || '#6366f1',
    }))
  }, [stagesList, i18n.language])

  const sourceOptions = useMemo(() => {
    if (!sourcesList.length) return []
    return sourcesList
      .map(s => ({
        value: s.name,
        label: s.name,
      }))
      .filter(o => o.label)
  }, [sourcesList])

  const projectOptions = useMemo(() => {
    if (!projectsList.length) return []
    return projectsList
      .map(p => ({
        value: p.name || p.companyName || p.id || '',
        label: p.name || p.companyName || '',
      }))
      .filter(o => o.label)
  }, [projectsList])

  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      const lead = action.lead || {}
      const details = action.details || {}
      const salesperson = (action.user && action.user.name) || ''

      const bySales = !Array.isArray(salesPersonFilter) || salesPersonFilter.length === 0
        ? true
        : salesperson && salesPersonFilter.includes(salesperson)

      const byManager = (() => {
        if (!usersList.length || !Array.isArray(managerFilter) || managerFilter.length === 0) return true
        const selectedManagers = usersList.filter(u =>
          managerFilter.includes(String(u.id))
        )
        if (!selectedManagers.length) return true

        const hasSuperManager = selectedManagers.some(u =>
          isSuperManagerRole(
            u.role || (Array.isArray(u.roles) && u.roles[0]?.name) || ''
          )
        )

        let candidates

        if (hasSuperManager) {
          candidates = usersList
        } else {
          const all = []
          selectedManagers.forEach(m => {
            all.push(m)
            const subs = getDescendants(m.id, usersList)
            subs.forEach(s => {
              all.push(s)
            })
          })
          const map = new Map()
          all.forEach(u => {
            if (!map.has(u.id)) {
              map.set(u.id, u)
            }
          })
          candidates = Array.from(map.values())
        }

        const names = new Set(candidates.map(u => u.name).filter(Boolean))
        if (!names.size) return true
        return !salesperson || names.has(salesperson)
      })()

      const stageName = getActionStageName(action)
      const byStage = !Array.isArray(stageFilter) || stageFilter.length === 0
        ? true
        : stageFilter.includes(stageName)

      const sourceValue = lead.source || details.source || ''
      const bySource = !Array.isArray(sourceFilter) || sourceFilter.length === 0
        ? true
        : sourceFilter.includes(sourceValue)

      const projectValue =
        lead.project ||
        details.projectName ||
        details.project ||
        ''
      const byProject = !Array.isArray(projectFilter) || projectFilter.length === 0
        ? true
        : projectFilter.includes(projectValue)

      return bySales && byManager && byStage && bySource && byProject
    })
  }, [actions, usersList, salesPersonFilter, managerFilter, stageFilter, sourceFilter, projectFilter])

  const [revenueMap, setRevenueMap] = useState({})
  const [revenueByUserId, setRevenueByUserId] = useState({})
  const [targetMap, setTargetMap] = useState({})

  useEffect(() => {
    const mapTargets = () => {
      const m = {}
      usersList.forEach(u => {
        const name = u.name || u.full_name || u.fullName || ''
        if (!name) return
        m[name] = Number(u.monthly_target ?? u.monthlyTarget ?? 0)
      })
      setTargetMap(m)
    }
    mapTargets()
  }, [usersList])

  useEffect(() => {
    const fetchRevenueSummary = async () => {
      try {
        const params = {}
        if (lastActionDateFilter) params.date_from = lastActionDateFilter
        if (closeDealsDateFilter) params.date_to = closeDealsDateFilter
        const res = await api.get('/api/revenues/summary', { params })
        const arr = Array.isArray(res.data?.data) ? res.data.data : []
        const byId = {}
        arr.forEach(r => { byId[r.user_id] = Number(r.total || 0) })
        setRevenueByUserId(byId)
        const nameMap = {}
        usersList.forEach(u => {
          const total = byId[u.id] ?? 0
          const name = u.name || u.full_name || u.fullName || ''
          if (name) nameMap[name] = total
        })
        setRevenueMap(nameMap)
      } catch (e) {
        setRevenueMap({})
      }
    }
    fetchRevenueSummary()
  }, [usersList, lastActionDateFilter, closeDealsDateFilter])

  const filteredData = useMemo(() => {
    const rowsMap = new Map()
    const leadsBySales = new Map()

    // 1. Initialize rows for all eligible users (to show even those with 0 actions but potential revenue)
    let eligibleUsers = usersList

    if (usersList.length && Array.isArray(managerFilter) && managerFilter.length > 0) {
      const selectedManagers = usersList.filter(u => managerFilter.includes(String(u.id)))
      const hasSuperManager = selectedManagers.some(u => isSuperManagerRole(u.role || (Array.isArray(u.roles) && u.roles[0]?.name) || ''))
      
      if (!hasSuperManager) {
        const all = []
        selectedManagers.forEach(m => {
          all.push(m)
          const subs = getDescendants(m.id, usersList)
          subs.forEach(s => all.push(s))
        })
        const map = new Map()
        all.forEach(u => map.set(u.id, u))
        eligibleUsers = Array.from(map.values())
      }
    }

    if (Array.isArray(salesPersonFilter) && salesPersonFilter.length > 0) {
      eligibleUsers = eligibleUsers.filter(u => salesPersonFilter.includes(u.name))
    }

    eligibleUsers.forEach(u => {
      const name = u.name || u.full_name || u.fullName
      if (name && !rowsMap.has(name)) {
        // Calculate inherited/total target and team revenue
        const inheritedTarget = Number(u.inherited_monthly_target || 0)
        const totalTarget = Number(u.total_monthly_target || 0)
        
        // Calculate team revenue (sum of descendants' revenue)
        const descendants = getDescendants(u.id, usersList)
        const teamRevenue = descendants.reduce((sum, d) => sum + (revenueByUserId[d.id] || 0), 0)

        rowsMap.set(name, {
          id: name,
          salesperson: name,
          totalLeads: 0,
          delayed: 0,
          actions: 0,
          calls: 0,
          revenue: 0,
          target: 0,
          actionByStage: '',
          action_by_stage: [], // New breakdown field
          inheritedTarget,
          totalTarget,
          teamRevenue,
          totalRevenue: 0,
          totalAchievement: 0
        })
      }
    })

    // 2. Process Actions (Attribute to Actor) and Leads (Attribute to Owner)
    filteredActions.forEach(action => {
      const lead = action.lead || {}
      const details = action.details || {}
      
      // Attribute action to the User who performed it (Actor)
      const actorName = (action.user && action.user.name) || ''
      if (actorName && rowsMap.has(actorName)) {
        const row = rowsMap.get(actorName)
        row.actions += 1

        const channel = (details.channel || action.channel || '').toLowerCase()
        const actionType = (action.action_type || action.type || '').toLowerCase()
        if (channel.includes('call') || actionType.includes('call')) {
          row.calls += 1
        }

        // Calculate breakdown by stage for this user
        const stageName = getActionStageName(action)
        if (stageName) {
            let stageEntry = row.action_by_stage.find(s => s.stage === stageName)
            if (!stageEntry) {
                const actionDef = actionDefs.find(a => a.name === stageName)
                stageEntry = { stage: stageName, count: 0, color: actionDef?.color || '#ccc' }
                row.action_by_stage.push(stageEntry)
            }
            stageEntry.count += 1
        }
      }

      // Attribute Lead to Owner
      const ownerName = 
        (lead.assigned_agent && lead.assigned_agent.name) || 
        (lead.assignedAgent && lead.assignedAgent.name) || 
        lead.sales_person || 
        lead.salesperson || 
        ''
        
      const leadId = action.lead_id || lead.id
      if (ownerName && leadId) {
        if (!leadsBySales.has(ownerName)) {
          leadsBySales.set(ownerName, new Set())
        }
        leadsBySales.get(ownerName).add(leadId)
      }
    })

    // 3. Process Revenue & Targets & Leads (Attribute to Owner/Salesperson)
    // RevenueMap is already keyed by User Name (based on user_id in revenue table -> lead owner)
    rowsMap.forEach((row, salespersonName) => {
      // Update Total Leads (Leads Owned)
      const set = leadsBySales.get(salespersonName)
      row.totalLeads = set ? set.size : 0

      // Update Revenue (from Revenue Table -> Owner)
      if (revenueMap[salespersonName] !== undefined) {
        row.revenue = revenueMap[salespersonName]
      }

      // Update Target
      if (targetMap[salespersonName] !== undefined) {
        row.target = targetMap[salespersonName]
      }

      // Update Total Revenue and Achievement
      row.totalRevenue = row.revenue + row.teamRevenue
      row.totalAchievement = row.totalTarget > 0 ? Math.round((row.totalRevenue / row.totalTarget) * 100) : 0
      
      // Update actionByStage string for exports
      row.actionByStage = row.action_by_stage
        .sort((a, b) => b.count - a.count)
        .map(s => `${s.stage}: ${s.count}`)
        .join(', ')
    })

    return Array.from(rowsMap.values())
  }, [filteredActions, usersList, managerFilter, salesPersonFilter, revenueMap, targetMap, revenueByUserId])

  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(filteredData.length / entriesPerPage))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage
    return filteredData.slice(start, start + entriesPerPage)
  }, [filteredData, currentPage, entriesPerPage])

  const actionsByStageData = useMemo(() => {
    const stageCounts = filteredActions.reduce((acc, action) => {
      const stage = getActionStageName(action)
      if (!stage) return acc
      acc[stage] = (acc[stage] || 0) + 1
      return acc
    }, {})

    return Object.keys(stageCounts).map(stage => {
      const actionDef = actionDefs.find(s => s.name === stage)
      return {
        name: stage,
        value: stageCounts[stage],
        color: actionDef ? actionDef.color : '#cccccc'
      }
    })
  }, [filteredActions])

  const channelCounts = useMemo(() => {
    const counts = { whatsapp: 0, email: 0, meet: 0 }
    filteredActions.forEach(action => {
      const details = action.details || {}
      const channel = String(details.channel || action.channel || '').toLowerCase()
      if (channel.includes('whatsapp')) counts.whatsapp += 1
      else if (channel.includes('email')) counts.email += 1
      else if (channel.includes('meet')) counts.meet += 1
    })
    return counts
  }, [filteredActions])

  const whatsAppData = useMemo(() => ([
    { label: isRTL ? 'واتساب' : 'WhatsApp', value: channelCounts.whatsapp, color: '#25D366' },
  ]), [channelCounts, isRTL])

  const emailsData = useMemo(() => ([
    { label: isRTL ? 'البريد' : 'Emails', value: channelCounts.email, color: '#2563eb' },
  ]), [channelCounts, isRTL])

  const googleMeetData = useMemo(() => ([
    { label: isRTL ? 'غوغل ميت' : 'Google Meet', value: channelCounts.meet, color: '#10b981' },
  ]), [channelCounts, isRTL])

  const [expandedRows, setExpandedRows] = useState({});
  const [hoveredActionRow, setHoveredActionRow] = useState(null);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  const exportPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = await import('jspdf-autotable')
      const doc = new jsPDF()
      
      const tableColumn = [
        isRTL ? 'مسؤول المبيعات' : 'Salesperson',
        isRTL ? 'إجمالي العملاء' : 'Total Leads',
        isRTL ? 'المتأخرة' : 'Delayed',
        isRTL ? 'الإجراءات' : 'Actions',
        isRTL ? 'المكالمات' : 'Calls',
        isRTL ? 'الإجراء حسب المرحلة' : 'Action by Stage',
        isRTL ? 'الإيرادات' : 'Revenue',
        isRTL ? 'الهدف' : 'Target',
        isRTL ? 'إجمالي الإيرادات (فريق)' : 'Total Revenue (Team)',
        isRTL ? 'الهدف الكلي' : 'Total Target',
        isRTL ? 'الإنجاز الكلي' : 'Total Achievement'
      ]
      const tableRows = []

      filteredData.forEach(row => {
        const rowData = [
          row.salesperson,
          row.totalLeads,
          row.delayed,
          row.actions,
          row.calls,
          row.actionByStage,
          row.revenue.toLocaleString(),
          row.target.toLocaleString(),
          row.totalRevenue.toLocaleString(),
          row.totalTarget.toLocaleString(),
          `${row.totalAchievement}%`
        ]
        tableRows.push(rowData)
      })

      doc.text(isRTL ? 'تقرير نشاطات المبيعات' : 'Sales Activities Report', 14, 15)
      autoTable.default(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { font: 'helvetica', fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      })
      doc.save("sales_activities_report.pdf")
      logExportEvent({
        module: 'Sales Activities',
        fileName: 'sales_activities_report.pdf',
        format: 'pdf',
      })
      setShowExportMenu(false)
    } catch (error) {
      console.error("Export PDF Error:", error)
    }
  }

  const handleExport = async () => {
    const dataToExport = filteredData.map(row => ({
      [isRTL ? 'مسؤول المبيعات' : 'Salesperson']: row.salesperson,
      [isRTL ? 'إجمالي العملاء' : 'Total Leads']: row.totalLeads,
      [isRTL ? 'المتأخرة' : 'Delayed']: row.delayed,
      [isRTL ? 'الإجراءات' : 'Actions']: row.actions,
      [isRTL ? 'المكالمات' : 'Calls']: row.calls,
      [isRTL ? 'الإيرادات' : 'Revenue']: row.revenue,
      [isRTL ? 'الهدف' : 'Target']: row.target,
      [isRTL ? 'إجمالي الإيرادات (فريق)' : 'Total Revenue (Team)']: row.totalRevenue,
      [isRTL ? 'الهدف الكلي' : 'Total Target']: row.totalTarget,
      [isRTL ? 'الإنجاز الكلي %' : 'Total Achievement %']: `${row.totalAchievement}%`
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Activities')
    const fileName = 'Sales_Activities_Report.xlsx'
    XLSX.writeFile(wb, fileName)
    await logExportEvent({
      module: 'Sales Activities',
      fileName,
      format: 'xlsx',
    })
    setShowExportMenu(false)
  }

  const clearFilters = () => {
    setSalesPersonFilter([])
    setManagerFilter([])
    setStageFilter([])
    setSourceFilter([])
    setProjectFilter([])
    setAssignDateFilter('')
    setCreationDateFilter('')
    setLastActionDateFilter('')
    setCloseDealsDateFilter('')
    setProposalDateFilter('')
  }

  const renderPieChart = (title, data) => {
    const segments = data.map(item => ({
      label: item.label || item.name,
      value: item.value,
      color: item.color
    }))
    const total = segments.reduce((sum, item) => sum + (item.value || 0), 0)

    return (
      <div className="group relative bg-theme-bg  backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div className={`text-sm font-semibold mb-2 ${isLight ? 'text-black' : 'text-white'} text-center md:text-left`}>
          {title}
        </div>
        <div className="h-48 flex items-center justify-center">
          <PieChart
            segments={segments}
            size={170}
            centerValue={total}
            centerLabel={isRTL ? 'الإجمالي' : 'Total'}
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {segments.map(segment => (
            <div key={segment.label} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="dark:text-white">
                {segment.label}: {segment.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] overflow-hidden min-w-0">
      {/* Back Btn & Header */}
      <div className="mb-6">
        <BackButton to="/reports" />
        <h1 className={`text-2xl font-bold ${isLight ? 'text-black' : 'text-white'}  mb-2`}>{isRTL ? 'تقرير نشاطات المبيعات' : 'Sales Activities Report'}</h1>
        <p className={`${isLight ? 'text-black' : 'text-white'} text-sm`}>{isRTL ? 'متابعة نشاطات وأداء فريق المبيعات' : 'Monitor your sales team activities and performance'}</p>
      </div>

      {/* Filter Panel */}
      <div className="bg-theme-bg backdrop-blur-md rounded-2xl shadow-sm border border-theme-border dark:border-gray-700/50 p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <div className={`flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'} font-semibold`}>
            <Filter size={20} className="text-blue-500 dark:text-blue-400" />
            <h3 className={`${isLight ? 'text-black' : 'text-white'}`}>{t('Filter')}</h3>
          </div>
          <div className={`flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}>
            <button 
              onClick={() => setShowAllFilters(prev => !prev)} 
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              {showAllFilters ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض الكل' : 'Show All')}
              <ChevronDown size={12} className={`transform transition-transform duration-300 ${showAllFilters ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <button 
              onClick={clearFilters} 
              className="px-3 py-1.5 text-sm dark:text-white hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              {t('Reset')}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* First Row (Always Visible) - Selects */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                      <User size={12} className="text-blue-500 dark:text-blue-400" />
                      {isRTL ? 'مسؤول المبيعات' : 'Sales Person'}
                    </label>
              <SearchableSelect options={salesPersonOptions} value={salesPersonFilter} onChange={setSalesPersonFilter} placeholder={isRTL ? 'اختر' : 'Select'} multiple isRTL={isRTL} icon={<User size={16} />} />
            </div>
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                <Users size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'المدير أو الفريق' : 'Manager or team'}
              </label>
              <SearchableSelect options={managerOptions} value={managerFilter} onChange={setManagerFilter} placeholder={isRTL ? 'اختر' : 'Select'} multiple isRTL={isRTL} icon={<Users size={16} />} />
            </div>
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                <Layers size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'مرحلة البيع' : 'Stage pipeline'}
              </label>
              <SearchableSelect options={stageOptions} value={stageFilter} onChange={setStageFilter} placeholder={isRTL ? 'اختر' : 'Select'} multiple isRTL={isRTL} icon={<Layers size={16} />} />
            </div>
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                <Tag size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'المصدر' : 'Source'}
              </label>
              <SearchableSelect options={sourceOptions} value={sourceFilter} onChange={setSourceFilter} placeholder={isRTL ? 'اختر' : 'Select'} multiple isRTL={isRTL} icon={<Tag size={16} />} />
            </div>
          </div>

          {/* Collapsible Section (Dates) */}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 ease-in-out overflow-hidden ${showAllFilters ? 'max-h-[1000px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
             <div className="space-y-1">
               <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                 <Briefcase size={12} className="text-blue-500 dark:text-blue-400" />
                 {isRTL ? 'المشروع أو المنتج' : 'Project or product'}
               </label>
              <SearchableSelect options={projectOptions} value={projectFilter} onChange={setProjectFilter} placeholder={isRTL ? 'اختر' : 'Select'} multiple isRTL={isRTL} icon={<Briefcase size={16} />} />
            </div>           
             
             <div className="space-y-1">
               <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                 <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
                 {isRTL ? 'تاريخ التعيين' : 'Assign Date'}
               </label>
               <input type="date" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={assignDateFilter} onChange={(e) => setAssignDateFilter(e.target.value)} />
             </div>
             <div className="space-y-1">
               <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                      <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
                      {isRTL ? 'الفترة' : 'Duration'}
                    </label>
               <input type="date" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={creationDateFilter} onChange={(e) => setCreationDateFilter(e.target.value)} />
             </div>
             <div className="space-y-1">
               <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                 <Clock size={12} className="text-blue-500 dark:text-blue-400" />
                 {isRTL ? 'تاريخ آخر إجراء' : 'Last Action Date'}
               </label>
               <input type="date" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={lastActionDateFilter} onChange={(e) => setLastActionDateFilter(e.target.value)} />
             </div>
             <div className="space-y-1">
               <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                 <CheckCircle size={12} className="text-blue-500 dark:text-blue-400" />
                 {isRTL ? 'تاريخ إغلاق الصفقات' : 'Close Deals Date'}
               </label>
               <input type="date" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={closeDealsDateFilter} onChange={(e) => setCloseDealsDateFilter(e.target.value)} />
             </div>
             <div className="space-y-1">
               <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                      <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
                      {isRTL ? 'إلى تاريخ' : 'To Date'}
                    </label>
               <input type="date" className={`w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm ${isLight ? 'text-black' : 'text-white'} focus:outline-none focus:ring-2 focus:ring-blue-500/20`} value={proposalDateFilter} onChange={(e) => setProposalDateFilter(e.target.value)} />
             </div>
          </div>
        </div>
      </div>

      {/* KPI Cards - Moved to top in one row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            title: isRTL ? 'إجمالي المكالمات' : 'Total calls',
            value: kpiData.totalCalls,
            icon: Phone,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          },
          {
            title: isRTL ? 'إجمالي الإجراءات' : 'Total Action',
            value: kpiData.totalAction,
            icon: Activity,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          },
          {
            title: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
            value: kpiData.totalRevenue.toLocaleString(),
            icon: DollarSign,
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
          },
          {
            title: isRTL ? 'تحقيق الهدف' : 'Total Achievement From Target',
            value: `${kpiData.achievementFromTarget}%`,
            icon: Target,
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          },
        ].map((card, idx) => {
          const Icon = card.icon
          return (
            <div 
              key={idx}
              className="group relative  backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden h-32"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                <Icon size={80} className={card.color} />
              </div>

              <div className="flex flex-col justify-between h-full relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${card.bgColor} ${card.color}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className={`${isLight ? 'text-black' : 'dark:text-white'} text-sm font-semibold opacity-80`}>
                    {card.title}
                  </h3>
                </div>

                <div className="flex items-baseline space-x-2 rtl:space-x-reverse pl-1">
                  <span className={`text-2xl font-bold ${card.color}`}>
                    {card.value}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Section - Full width */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
           {renderPieChart(isRTL ? 'واتساب' : 'WhatsApp', whatsAppData)}
           {renderPieChart(isRTL ? 'البريد الإلكتروني' : 'Emails', emailsData)}
           {renderPieChart(isRTL ? 'جوجل ميت' : 'Google Meet', googleMeetData)}
           {renderPieChart(isRTL ? 'الإجراءات حسب المرحلة' : 'Actions by Stage', actionsByStageData)}
      </div>

      {/* Table Section */}
      <div className=" backdrop-blur-md border border-theme-border dark:border-gray-700/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme-border dark:border-gray-700/50 flex items-center justify-between">
          <h2 className={`${isLight ? 'text-black' : 'text-white'} text{'-lg'} font-bold dark:text-2xl`}>{`${isRTL ? 'ظرة عامة على نشاطات المبيعات' : 'Sales Activities Overview'}`}</h2>
          {canExport && (
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
                    onClick={handleExport}
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
          )}
        </div>
        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase ${isLight ? 'text-black ' : 'text-white'}`}>
              <tr>
                <th className="md:hidden px-4 py-3 border-b border-theme-border dark:border-gray-700/50"></th>
                <th className={`px-4 py-3 border-b border-theme-border dark:border-gray-700/50 text-start ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'مسؤول المبيعات' : 'Salesperson'}</th>
                <th className={`hidden md:table-cell px-4 py-3 text-center border-b border-theme-border dark:border-gray-700/50 ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'إجمالي العملاء' : 'Total Leads'}</th>
                <th className={`hidden md:table-cell px-4 py-3 text-center border-b border-theme-border dark:border-gray-700/50 ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'المتأخرة' : 'Delayed'}</th>
                <th className={`hidden md:table-cell px-4 py-3 text-center border-b border-theme-border dark:border-gray-700/50 ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                <th className={`hidden md:table-cell px-4 py-3 text-center border-b border-theme-border dark:border-gray-700/50 ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'المكالمات' : 'Calls'}</th>
                <th className={`hidden md:table-cell px-4 py-3 border-b border-theme-border dark:border-gray-700/50 text-start ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'الإجراء حسب المرحلة' : 'Action by Stage'}</th>
                <th className={`px-4 py-3 text-center border-b border-theme-border dark:border-gray-700/50 ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'الإيرادات' : 'Revenue'}</th>
                <th className={`hidden md:table-cell px-4 py-3 text-center border-b border-theme-border dark:border-gray-700/50 ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'الهدف' : 'Target'}</th>
                <th className={`hidden md:table-cell px-4 py-3 text-center border-b border-theme-border dark:border-gray-700/50 ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}</th>
                <th className={`hidden md:table-cell px-4 py-3 text-center border-b border-theme-border dark:border-gray-700/50 ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'الهدف الكلي' : 'Total Target'}</th>
                <th className={`px-4 py-3 text-center border-b border-theme-border dark:border-gray-700/50 ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'الإنجاز الكلي' : 'Total Achievement'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border dark:divide-gray-700/50">
              {filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-6 text-center text-[var(--muted-text)]"
                  >
                    {isRTL ? 'لا توجد بيانات' : 'No data'}
                  </td>
                </tr>
              )}
              {filteredData.length > 0 && paginatedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-6 text-center text-[var(--muted-text)]"
                  >
                    {isRTL ? 'لا توجد نتائج' : 'No results'}
                  </td>
                </tr>
              )}
              {paginatedRows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className="hover:bg-theme-bg/50 dark:hover:bg-white/5 transition-colors">
                    <td className="md:hidden px-4 py-3">
                      <button onClick={() => toggleRow(row.id)} className="p-1 rounded-full hover:bg-theme-bg/50 text-[var(--muted-text)]">
                        {expandedRows[row.id] ? <ChevronDown size={16} className="transform rotate-180" /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                    <td className={`px-4 py-3 font-medium ${isLight ? 'text-black' : 'text-white'} `}>{row.salesperson}</td>
                    <td className={`hidden md:table-cell px-4 py-3 text-center ${isLight ? 'text-black' : 'text-white'} `}>{row.totalLeads}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-center text-red-500 font-medium">{row.delayed}</td>
                    <td className={`hidden md:table-cell px-4 py-3 text-center ${isLight ? 'text-black' : 'text-white'} `}>{row.actions}</td>
                    <td className={`hidden md:table-cell px-4 py-3 text-center ${isLight ? 'text-black' : 'text-white'} `}>{row.calls}</td>
                    <td className="hidden md:table-cell px-4 py-3 border-b border-theme-border dark:border-gray-700/50 text-start">
                      <div className="relative inline-block">
                        <button 
                          onMouseEnter={() => setHoveredActionRow(row.id)}
                          onMouseLeave={() => setHoveredActionRow(null)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-100 dark:border-slate-700 transition-all duration-200 group"
                        >
                          <PieChartIcon size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-semibold dark:text-slate-200 uppercase">
                            {isRTL ? 'عرض التوزيع' : 'View Stats'}
                          </span>
                        </button>
                        
                        <AnimatePresence>
                          {hoveredActionRow === row.id && (
                            <ActionStageTooltip data={row.action_by_stage} isRTL={isRTL} />
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-green-600">{row.revenue.toLocaleString()}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-center font-bold text-blue-600">{row.target.toLocaleString()}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-center font-bold text-purple-600">{row.totalRevenue.toLocaleString()}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-center font-bold text-indigo-600">{row.totalTarget.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-center font-bold ${row.totalAchievement >= 100 ? 'text-green-500' : 'text-orange-500'}`}>{row.totalAchievement}%</td>
                  </tr>
                  {expandedRows[row.id] && (
                    <tr className="md:hidden ">
                      <td colSpan={3} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex justify-between">
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'إجمالي العملاء' : 'Total Leads'}:</span>
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{row.totalLeads}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'المتأخرة' : 'Delayed'}:</span>
                              <span className="text-red-500">{row.delayed}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'الActions' : 'Actions'}:</span>
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{row.actions}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'المكالمات' : 'Calls'}:</span>
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{row.calls}</span>
                            </div>
                            <div className="col-span-2 space-y-2 py-2 border-t border-white/5 mt-1">
                              <span className="text-[var(--muted-text)] block mb-1">{isRTL ? 'توزيع الإجراءات:' : 'Actions Distribution:'}</span>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {row.action_by_stage.map((s, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                                      <span className="text-slate-300">{s.stage}</span>
                                    </div>
                                    <span className="font-bold text-blue-500">{s.count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="col-span-2 flex justify-between">
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'الهدف' : 'Target'}:</span>
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{row.target.toLocaleString()}</span>
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'إجمالي إيرادات' : 'Total Revenue'}:</span>
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{row.totalRevenue.toLocaleString()}</span>
                            </div>
                            <div className="col-span-2 flex justify-between">
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{isRTL ? 'الهدف الكلي' : 'Total Target'}:</span>
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'} `}>{row.totalTarget.toLocaleString()}</span>
                            </div>
                            <div className="col-span-2 flex justify-between">
                              <span className={`text-[var(--muted-text)] ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'الإنجاز الكلي' : 'Total Achievement'}:</span>
                              <span className={`font-bold ${row.totalAchievement >= 100 ? 'text-green-500' : 'text-orange-500'}`}>{row.totalAchievement}%</span>
                            </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3  border-t border-theme-border dark:border-gray-700/60 flex sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] sm:text-xs text-[var(--muted-text)]">
            {isRTL
              ? `إظهار ${Math.min((currentPage - 1) * entriesPerPage + 1, filteredData.length)}-${Math.min(currentPage * entriesPerPage, filteredData.length)} من ${filteredData.length}`
              : `Showing ${Math.min((currentPage - 1) * entriesPerPage + 1, filteredData.length)}-${Math.min(currentPage * entriesPerPage, filteredData.length)} of ${filteredData.length}`}
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
    </div>
  )
}
