import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import { useAppState } from '@shared/context/AppStateProvider'
import { api } from '../../utils/api'
import SearchableSelect from './SearchableSelect'
import EnhancedLeadDetailsModal from './EnhancedLeadDetailsModal'

const getActionType = (action) => {
  const text = (typeof action === 'string' ? action : (action.title || action.type || '')).toLowerCase()
  if (text.includes('meeting') || text.includes('اجتماع') || text.includes('قابلة')) return 'meeting'
  if (text.includes('follow') || text.includes('متابعة') || text.includes('اتصال')) return 'followup'
  if (text.includes('deadline') || text.includes('closing') || text.includes('إغلاق')) return 'deadline'
  return 'task'
}

const getActionColor = (type) => {
  switch (type) {
    case 'meeting': return 'bg-blue-500'
    case 'followup': return 'bg-green-500'
    case 'deadline': return 'bg-red-500'
    default: return 'bg-gray-400'
  }
}

// Utility: get days for a month view
const getMonthGrid = (year, month) => {
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay() // 0 Sun - 6 Sat
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const cells = []
  // Leading days from previous month
  for (let i = 0; i < startWeekday; i++) {
    const day = prevMonthDays - startWeekday + 1 + i
    cells.push({ date: new Date(year, month - 1, day), inMonth: false })
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true })
  }
  // Trailing days to complete weeks (42 cells = 6 weeks grid)
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    const next = new Date(last)
    next.setDate(last.getDate() + 1)
    cells.push({ date: next, inMonth: false })
  }
  return cells
}

export default function CalendarWidget({ tone }) {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const { crmSettings } = useAppState()
  const _lintKeep = { SearchableSelect, EnhancedLeadDetailsModal }
  const showFullMobileNumber = crmSettings?.showMobileNumber === true
  const maskPhoneNumber = (phone) => {
    if (!phone) return ''
    const str = String(phone)
    if (str.length < 5) return str
    return str.slice(0, 3) + 'X'.repeat(Math.max(0, str.length - 3))
  }
  const effectiveTone = tone || theme || 'light'
  const isLight = effectiveTone === 'light'
  const [today] = useState(new Date())
  const [cursor, setCursor] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [hoverDate, setHoverDate] = useState(null)
  const [actionsByDate, setActionsByDate] = useState({})
  const [showAddActionModal, setShowAddActionModal] = useState(false)
  const [actionModalDate, setActionModalDate] = useState(null)
  const [showDailyActions, setShowDailyActions] = useState(false)
  const [actionsView, setActionsView] = useState('selected')
  const [selectedAction, setSelectedAction] = useState(null)
  // Dynamic column height for calendar and actions column
  const [columnHeight, setColumnHeight] = useState(520)
  const adjustColumnHeight = (delta) => {
    setColumnHeight((h) => Math.max(380, Math.min(800, h + delta)))
  }

  // Filters state
  const [selectedStage, setSelectedStage] = useState('all')
  const [selectedManager, setSelectedManager] = useState('all')
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [selectedLeadFilter, setSelectedLeadFilter] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')

  const [stageOptions, setStageOptions] = useState([])
  const [managerOptions, setManagerOptions] = useState([])
  const [employeeOptions, setEmployeeOptions] = useState([])
  const [leadFilterOptions, setLeadFilterOptions] = useState([])

  // Fetch filter data
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        // Fetch Stages
        const stagesRes = await api.get('/api/stages')
        const stagesData = Array.isArray(stagesRes.data) ? stagesRes.data : (stagesRes.data?.data || [])
        const sOpts = stagesData.map(s => ({ value: s.id, label: s.name }))
        setStageOptions([{ value: 'all', label: t('All Stages') }, ...sOpts])

        // Fetch Users (Managers & Employees)
        const usersRes = await api.get('/api/users')
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || [])
        
        // Simple heuristic for managers: role contains 'Manager' or 'Admin'
        // But for now, populate both with all users to be safe, or split if roles are clear
        const allUsers = usersData.map(u => ({ value: u.id, label: u.name, role: u.role }))
        
        const mOpts = allUsers.filter(u => 
             (u.role && (u.role.toLowerCase().includes('manager') || u.role.toLowerCase().includes('admin')))
        )
        // If no managers found by role, maybe just show all users in managers dropdown too?
        // Let's just show all users in both for maximum flexibility if roles are messy
        const mOptsFinal = mOpts.length > 0 ? mOpts : allUsers

        setManagerOptions([{ value: 'all', label: t('All Managers') }, ...mOptsFinal])
        setEmployeeOptions([{ value: 'all', label: t('All Employees') }, ...allUsers])

        // Fetch Leads
        // Limit to 1000 to avoid huge payload, or rely on search (SearchableSelect supports async but we are using static options here)
        const leadsRes = await api.get('/api/leads?limit=1000&select=id,name')
        const leadsData = Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.data || [])
        const lOpts = leadsData.map(l => ({ value: l.id, label: l.name }))
        setLeadFilterOptions([{ value: 'all', label: t('All Leads') }, ...lOpts])

      } catch (e) {
        console.error("Failed to fetch filter data", e)
      }
    }
    fetchFilters()
  }, [t])

  const priorities = useMemo(() => [
    { value: 'all', label: t('All Priorities') },
    { value: 'High', label: t('High') },
    { value: 'Medium', label: t('Medium') },
    { value: 'Low', label: t('Low') }
  ], [t])

  const [visibleColumns, setVisibleColumns] = useState(['title', 'lead', 'date', 'stage', 'assigned'])
  const [query, setQuery] = useState('')
  const [showLeadDetails, setShowLeadDetails] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const notifications = useMemo(() => {
    const list = []
    const now = currentTime
    // Format now to YYYY-MM-DD using local time
    const offset = now.getTimezoneOffset()
    const todayStr = new Date(now.getTime() - (offset*60*1000)).toISOString().split('T')[0]
    
    Object.values(actionsByDate).flat().forEach(action => {
       // Safety check
       if (!action || !action.date) return

       // 1. Upcoming (Today, pending, future time within 30m)
       if (action.date === todayStr && (action.status === 'pending' || action.status === 'new')) {
           if (action.time) {
               const [h, m] = action.time.split(':').map(Number)
               const actionTime = new Date(now)
               actionTime.setHours(h, m, 0, 0)
               
               const diffMs = actionTime - now
               const diffMins = Math.floor(diffMs / 60000)
               
               if (diffMins >= 0 && diffMins <= 30) {
                   list.push({
                       id: `upcoming-${action.id}`,
                       type: 'upcoming',
                       message: i18n.language === 'ar' 
                         ? `تذكير: ${action.type || 'إجراء'} مع ${action.leadName} خلال ${diffMins} دقيقة`
                         : `Reminder: ${action.type} with ${action.leadName} in ${diffMins} min`,
                       color: 'bg-blue-500'
                   })
               }
           }
       }
       
       // 2. Delayed (Pending, time passed > 1 min)
       if (action.status === 'pending' || action.status === 'new') {
           let isDelayed = false
           let delayMins = 0
           
           if (action.date < todayStr) {
               isDelayed = true
           } else if (action.date === todayStr && action.time) {
               const [h, m] = action.time.split(':').map(Number)
               const actionTime = new Date(now)
               actionTime.setHours(h, m, 0, 0)
               
               const diffMs = now - actionTime
               const diffMins = Math.floor(diffMs / 60000)
               
               if (diffMins >= 1) {
                   isDelayed = true
                   delayMins = diffMins
               }
           }
           
           if (isDelayed) {
               list.push({
                   id: `delayed-${action.id}`,
                   type: 'delayed',
                   message: i18n.language === 'ar'
                     ? `تأخير: ${action.type || 'إجراء'} مع ${action.leadName} (${delayMins > 0 ? delayMins + ' دقيقة' : 'فائت'})`
                     : `Delayed: ${action.type} with ${action.leadName} (${delayMins > 0 ? delayMins + ' min ago' : 'Overdue'})`,
                   color: 'bg-red-500'
               })
           }
       }
    })
    
    return list.slice(0, 5)
  }, [actionsByDate, currentTime, i18n.language])

  const fetchActions = async () => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const fromDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const toDate = new Date(year, month + 2, 0).toISOString().split('T')[0]

    try {
        const res = await api.get('/api/lead-actions', {
            params: {
                scheduled_date_from: fromDate,
                scheduled_date_to: toDate,
                limit: 5000
            }
        })
        
        const grouped = {}
        if (Array.isArray(res.data)) {
            res.data.forEach(action => {
                const date = action.details?.date || action.date || action.created_at?.split('T')[0]
                if (date) {
                    if (!grouped[date]) grouped[date] = []
                    
                    let details = action.details
                    if (typeof details === 'string') {
                        try { details = JSON.parse(details) } catch (e) {}
                    }

                    const mapped = {
                        ...action,
                        id: action.id,
                        title: action.description || action.type,
                        leadName: action.lead?.name || 'Unknown',
                        leadPhone: action.lead?.phone,
                        leadId: action.lead_id || action.lead?.id,
                        stage: action.lead?.stage || 'Unknown',
                        stageId: action.lead?.stage_id || action.stage_id,
                        assignedTo: action.lead?.assignedAgent?.name || action.lead?.assigned_agent?.name || action.user?.name,
                        assignedToId: action.lead?.assignedAgent?.id || action.lead?.assigned_agent?.id || action.user?.id,
                        priority: details?.priority || 'Medium',
                        time: details?.time,
                        date: date,
                        type: action.action_type || action.type,
                        status: details?.status || action.status || 'pending',
                        outcome: details?.outcome || action.outcome || 'answer',
                        stage_id: action.stage_id_at_creation,
                        next_action_type: action.next_action_type,
                        details: details
                    }
                    
                    grouped[date].push(mapped)
                }
            })
        }
        setActionsByDate(grouped)
    } catch (e) {
        console.error("Failed to fetch actions", e)
    }
  }

  // Load actions on mount and when cursor changes
  useEffect(() => {
    fetchActions()
  }, [cursor])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const grid = useMemo(() => getMonthGrid(year, month), [year, month])

  const weekdayNames = useMemo(() => {
    const d = new Date(2023, 0, 1) // Sunday
    return Array.from({ length: 7 }).map((_, i) => {
      const w = new Date(2023, 0, 1 + i)
      return w.toLocaleString(i18n.language, { weekday: 'short' })
    })
  }, [i18n.language])

  const actionsFor = (date) => {
    const k = date.toDateString() // Basic key
    // Also try ISO date key
    const iso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10)
    
    let list = []
    // Check various key formats
    if (actionsByDate[k]) list = [...list, ...actionsByDate[k]]
    if (actionsByDate[iso]) list = [...list, ...actionsByDate[iso]]
    
    // Inject date for Drag & Drop context
    list = list.map(a => {
        if (typeof a === 'string') return { title: a, date: iso, originalKey: iso }
        return { ...a, date: iso, originalKey: iso }
    })

    // Filter by search query if any
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(a => {
        const title = a.title || ''
        return title.toLowerCase().includes(q)
      })
    }
    
    // Apply filters
    if (selectedPriority && selectedPriority !== 'all') {
      list = list.filter(a => (a.priority || 'Medium') === selectedPriority)
    }
    if (selectedEmployee && selectedEmployee !== 'all') {
      list = list.filter(a => a.assignedToId == selectedEmployee)
    }
    if (selectedManager && selectedManager !== 'all') {
      list = list.filter(a => a.assignedToId == selectedManager)
    }
    if (selectedLeadFilter && selectedLeadFilter !== 'all') {
      list = list.filter(a => a.leadId == selectedLeadFilter)
    }
    if (selectedStage && selectedStage !== 'all') {
      list = list.filter(a => a.stageId == selectedStage)
    }

    return list
  }

  const handleDragStart = (e, action) => {
    e.dataTransfer.setData('action', JSON.stringify(action))
  }

  const handleDropAction = async (e, targetDate) => {
    e.preventDefault()
    const actionData = e.dataTransfer.getData('action')
    if (!actionData) return

    const action = JSON.parse(actionData)
    const oldDate = action.date
    const targetKey = new Date(targetDate.getTime() - (targetDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 10)
    
    if (oldDate === targetKey) return

    const reason = window.prompt(t('Enter reason for postponing:'))
    if (reason === null) return 

    try {
        const payload = {
            lead_id: action.leadId || action.lead_id,
            type: action.type,
            status: action.status || 'pending',
            date: targetKey,
            time: action.time || '09:00',
            description: (action.description ? action.description + '\n' : '') + `${t('Postponed from')} ${oldDate}. ${t('Reason')}: ${reason}`,
            outcome: action.outcome || 'answer',
            stage_id: action.stage_id,
            next_action_type: action.next_action_type || action.type,
            details: action.details
        }
        
        delete payload.id
        
        await api.post('/api/lead-actions', payload)
        fetchActions()
    } catch (e) {
        console.error("Failed to reschedule", e)
        alert(t('Failed to reschedule action'))
    }
  }


  // Helper to get actions for the current view
  const getActionsByTimeframe = (view) => {
    let all = []
    if (view === 'selected') {
      if (selectedDate) all = actionsFor(selectedDate)
    } else if (view === 'week') {
      // Find week start/end for selectedDate
      const d = selectedDate || today
      const day = d.getDay()
      const start = new Date(d)
      start.setDate(d.getDate() - day)
      for (let i=0; i<7; i++) {
        const curr = new Date(start)
        curr.setDate(start.getDate() + i)
        all = [...all, ...actionsFor(curr)]
      }
    } else if (view === 'month') {
      // All days in current month view
      grid.forEach(cell => {
        if (cell.inMonth) {
          all = [...all, ...actionsFor(cell.date)]
        }
      })
    } else if (view === 'upcoming') {
      // Next 7 days from today
      for (let i=0; i<7; i++) {
        const curr = new Date(today)
        curr.setDate(today.getDate() + i)
        all = [...all, ...actionsFor(curr)]
      }
    }
    return all
  }

  const handleSaveAction = (newAction) => {
    fetchActions()
    setShowAddActionModal(false)
  }
  
  const handleLeadPreview = (leadId) => {
    // Find lead in local storage
    try {
      const saved = localStorage.getItem('leadsData')
      if (saved) {
        const leads = JSON.parse(saved)
        const found = leads.find(l => l.id === leadId)
        if (found) {
          setSelectedLead(found)
          setShowLeadDetails(true)
        }
      }
    } catch (e) {}
  }

  const availableColumns = [
    { value: 'title', label: t('Title') },
    { value: 'lead', label: t('Lead') },
    { value: 'phone', label: t('Phone') },
    { value: 'source', label: t('Source') },
    { value: 'stage', label: t('Stage') },
    { value: 'date', label: t('Date') },
    { value: 'time', label: t('Time') },
    { value: 'priority', label: t('Priority') },
    { value: 'assigned', label: t('Sales Person') }
  ]

  return (
    <div className={`rounded-xl border shadow-sm ${
      isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-gray-900 border-gray-700 text-gray-100'
    }`}>
        <div className="p-4 pt-4 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
              <div>
                <h2 className={`text-base font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('Calendar')}</h2>
                <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('Calendar Subtitle')}</p>
              </div>
            </div>
        {/* Header */}
        <div className={`flex items-center justify-between px-3 py-2 border-b gap-2 ${
          isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800 border-gray-700'
        } flex-row flex-nowrap`}>
          <div className="flex items-center gap-4 flex-1">
          <span className={`font-bold text-base ${isLight ? 'text-gray-800' : 'text-white'} whitespace-nowrap`}>
              {cursor.toLocaleString(i18n.language, { month: 'long', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={month}
                onChange={(e) => {
                  const m = parseInt(e.target.value, 10)
                  setCursor(new Date(year, m, 1))
                }}
                className={`px-2 py-1 text-xs rounded-md border ${isLight ? 'bg-white border-gray-300 text-gray-800' : 'bg-gray-700 border-gray-600 text-gray-200'}`}
                aria-label="Select month"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>
                    {new Date(2000, i, 1).toLocaleString(i18n.language, { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => {
                  const y = parseInt(e.target.value, 10)
                  setCursor(new Date(y, month, 1))
                }}
                className={`px-2 py-1 text-xs rounded-md border ${isLight ? 'bg-white border-gray-300 text-gray-800' : 'bg-gray-700 border-gray-600 text-gray-200'}`}
                aria-label="Select year"
              >
                {Array.from({ length: 21 }).map((_, idx) => {
                  const y = today.getFullYear() - 10 + idx
                  return (
                    <option key={y} value={y}>{y}</option>
                  )
                })}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`p-1 rounded-md ${isLight ? 'hover:bg-gray-200' : 'hover:bg-gray-700'}`}
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                aria-label="Prev month"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </button>
              <button
                className={`p-1 rounded-md ${isLight ? 'hover:bg-gray-200' : 'hover:bg-gray-700'}`}
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                aria-label="Next month"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 text-sm font-semibold rounded-md ${isLight ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-700 hover:bg-gray-600'}`}
              onClick={() => { const now = new Date(); setCursor(now); setSelectedDate(now); setActionsView('selected') }}
            >
              {t('Today')}
            </button>
          </div>
        </div>

        {/* Filters + Calendar */}
        <div className="p-3">
          {/* Filters Row */}
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Stage Dropdown */}
              <SearchableSelect
                value={selectedStage}
                onChange={(val) => setSelectedStage(val)}
                options={stageOptions}
              />
              
              {/* Manager Dropdown */}
              <SearchableSelect
                value={selectedManager}
                onChange={(val) => setSelectedManager(val)}
                options={managerOptions}
              />
              
              {/* Employee Dropdown */}
              <SearchableSelect
                value={selectedEmployee}
                onChange={(val) => setSelectedEmployee(val)}
                options={employeeOptions}
              />

              {/* Leads Dropdown */}
              <SearchableSelect
                value={selectedLeadFilter}
                onChange={(val) => setSelectedLeadFilter(val)}
                options={leadFilterOptions}
              />

              {/* Priority Dropdown */}
              <SearchableSelect
                value={selectedPriority}
                onChange={(val) => setSelectedPriority(val)}
                options={priorities}
              />
              {/* Column Selection */}
              <SearchableSelect
                multiple
                value={visibleColumns}
                onChange={(val) => setVisibleColumns(val)}
                options={availableColumns}
                placeholder={t('Columns')}
              />
            </div>
            <div className="flex-1 md:flex-none">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('Search...')}
                className={`w-full md:w-64 px-3 py-1 text-sm rounded-md border ${isLight ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500' : 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* Calendar Column */}
            <div className="min-h-[360px] flex flex-col" style={{ minHeight: columnHeight }}>
              {/* Month Header */}
              <div className={`grid grid-cols-7 text-xs mb-2 ${isLight ? 'text-gray-600 opacity-70' : 'text-gray-300 opacity-80'}`}>
                {weekdayNames.map((w) => (
                  <div key={w} className="text-center py-1">{w}</div>
                ))}
              </div>
              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-1 flex-1">
                {grid.map(({ date, inMonth }, idx) => {
                  const isToday = date.toDateString() === today.toDateString()
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
                  let acts = actionsFor(date)
                  // Decide popover placement: show above for bottom rows
                  const rowIndex = Math.floor(idx / 7)
                  const popoverPlacement = rowIndex >= 4 ? 'bottom-full mb-2' : 'top-full mt-2'
                  return (
                    <div className="relative group h-full" key={idx}>
                      <div
                        onClick={() => { setSelectedDate(date); setActionsView('selected') }}
                        onMouseEnter={() => setHoverDate(date)}
                        onMouseLeave={() => setHoverDate(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropAction(e, date)}
                        className={`text-center rounded-lg border p-1 h-full min-h-[80px] w-full transition-all duration-200 relative flex flex-col items-start justify-start gap-1 cursor-pointer ${
                          inMonth
                            ? isLight
                              ? 'bg-white border-gray-200 hover:bg-gray-50'
                              : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                            : isLight
                              ? 'bg-gray-50 border-gray-200 opacity-60'
                              : 'bg-gray-900 border-gray-800 opacity-60'
                        } ${isToday ? 'ring-2 ring-indigo-500 z-10' : ''} ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''}`}
                      >
                        <div className="w-full flex items-center justify-between px-1">
                            <span className={`text-sm font-semibold ${isToday ? 'text-indigo-600' : ''}`}>{date.getDate()}</span>
                            {/* Add Button */}
                            <button 
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-indigo-100 text-indigo-600"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActionModalDate(date);
                                    setShowAddActionModal(true);
                                }}
                                title={t('Add Action')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        {/* Event Dots/Bars */}
                        <div className="w-full flex flex-col gap-0.5 px-1 overflow-hidden">
                            {acts.slice(0, 3).map((act, i) => {
                                const type = getActionType(act)
                                const color = getActionColor(type)
                                const title = typeof act === 'string' ? act : (act.title || 'Event')
                                return (
                                    <div key={i} className={`text-[10px] truncate px-1 rounded-sm text-white ${color} w-full text-left`}>
                                        {title}
                                    </div>
                                )
                            })}
                            {acts.length > 3 && (
                                <div className="text-[9px] text-gray-400 text-left px-1">+{acts.length - 3} more</div>
                            )}
                        </div>
                      </div>
                      
                      {/* Hover Tooltip (Popup) */}
                      {hoverDate && hoverDate.toDateString() === date.toDateString() && acts.length > 0 && (
                        <div className={`absolute z-50 left-1/2 -translate-x-1/2 w-48 p-3 rounded-lg shadow-xl pointer-events-none transition-all transform ${popoverPlacement} ${isLight ? 'bg-white text-gray-800 border border-gray-100' : 'bg-gray-800 text-white border border-gray-600'}`}>
                            <div className="font-bold text-xs mb-2 border-b pb-1 border-gray-200 dark:border-gray-700 flex justify-between">
                                <span>{date.toLocaleDateString()}</span>
                                <span className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-[10px]">{acts.length} Actions</span>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                {acts.map((a, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getActionColor(getActionType(a))}`}></span>
                                        <span className="truncate">{typeof a === 'string' ? a : a.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Actions + Notifications stacked */}
            <div className="min-h-[360px] flex flex-col" style={{ minHeight: columnHeight }}>
              {/* Actions List */}
              <div className={`rounded-xl border ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} shadow-sm flex-1 flex flex-col overflow-hidden`}>
                <div className={`px-4 py-2 border-b flex items-center justify-between ${isLight ? 'border-gray-200' : 'border-gray-700 bg-gray-800'}`}>
                  <span className="font-semibold text-sm">{t('Actions')}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        {[
                        { key: 'selected', label: (selectedDate && selectedDate.toDateString() === today.toDateString()) ? t('Today') : t('Selected') },
                        { key: 'week', label: t('Week') },
                        { key: 'month', label: t('Month') },
                        { key: 'upcoming', label: t('Upcoming') }
                      ].map(btn => (
                        <button
                          key={btn.key}
                          className={`px-2 py-1 text-xs rounded-md border ${isLight ? 'border-gray-300' : 'border-gray-600'} ${actionsView === btn.key ? (isLight ? 'bg-gray-200' : 'bg-gray-700') : ''}`}
                          onClick={() => setActionsView(btn.key)}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className={`text-xs uppercase sticky top-0 z-10 ${isLight ? 'bg-gray-50 text-gray-700' : 'bg-gray-700 text-gray-200'}`}>
                      <tr>
                        {availableColumns.filter(c => visibleColumns.includes(c.value)).map(c => (
                          <th key={c.value} className="px-4 py-3 font-medium whitespace-nowrap border-b border-gray-200 dark:border-gray-700">{c.label}</th>
                        ))}
                        <th className="px-4 py-3 w-16 border-b border-gray-200 dark:border-gray-700"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {getActionsByTimeframe(actionsView).length === 0 ? (
                         <tr>
                           <td colSpan={visibleColumns.length + 1} className="px-4 py-8 text-center opacity-50 text-sm">
                             {t('No actions for selected range.')}
                           </td>
                         </tr>
                      ) : (
                        getActionsByTimeframe(actionsView).map((a, i) => {
                          const isStr = typeof a === 'string'
                          return (
                            <tr
                              key={i}
                              draggable
                              onDragStart={(e) => handleDragStart(e, a)}
                              className={`group transition-colors cursor-pointer ${isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-700/50'}`}
                              onClick={() => {
                                if (!isStr && a.leadId) {
                                  handleLeadPreview(a.leadId)
                                } else {
                                  setSelectedAction(a)
                                }
                              }}
                            >
                              {availableColumns.filter(c => visibleColumns.includes(c.value)).map(col => (
                                <td key={col.value} className="px-4 py-2 whitespace-nowrap max-w-[200px] truncate">
                                  {(() => {
                                    if (isStr) return col.value === 'title' ? a : ''
                                    switch (col.value) {
                                      case 'title': return (
                                        <div className="flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-full ${getActionColor(getActionType(a))} flex-shrink-0`}></span>
                                          <span className="font-medium truncate">{a.title || 'Action'}</span>
                                        </div>
                                      )
                                      case 'lead': return a.leadName || '—'
                                      case 'phone': return a.leadPhone || '—'
                                      case 'source': return a.source || '—'
                                      case 'stage': return a.stage || '—'
                                      case 'date': return (
                                        <div className="flex flex-col">
                                            <span>{a.date || '—'}</span>
                                            {a.time && <span className="text-xs opacity-75 dir-ltr">{a.time}</span>}
                                        </div>
                                      )
                                      case 'time': return a.time || '—'
                                      case 'priority': return (
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                                          (a.priority || 'medium') === 'high' ? 'bg-red-100 text-red-800' : 
                                          (a.priority || 'medium') === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                          'bg-green-100 text-green-800'
                                        }`}>
                                          {a.priority || 'Medium'}
                                        </span>
                                      )
                                      case 'assigned': return a.assignedTo || '—'
                                      default: return ''
                                    }
                                  })()}
                                </td>
                              ))}
                              <td className="px-4 py-2 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!isStr && a.leadId && (
                                    <button 
                                      className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 text-blue-600"
                                      onClick={(e) => { e.stopPropagation(); handleLeadPreview(a.leadId) }}
                                      title={t('View Lead')}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  )}
                                  {!isStr && a.leadPhone && (
                                    <>
                                      <button 
                                        className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-green-100 text-green-600"
                                        onClick={(e) => { e.stopPropagation(); window.open(`tel:${a.leadPhone}`, '_self') }}
                                        title={t('Call')}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                        </svg>
                                      </button>
                                      <button 
                                        className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-emerald-100 text-emerald-600"
                                        onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${a.leadPhone.replace('+', '')}`, '_blank') }}
                                        title={t('WhatsApp')}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-15 h-3">
                                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notifications */}
              <div className={`mt-3 rounded-xl border ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} shadow-sm`}>
                <div className={`px-4 py-2 border-b font-semibold text-sm ${isLight ? 'border-gray-200' : 'border-gray-700 text-gray-100'}`}>{t('Notifications')}</div>
                <div className="p-3 space-y-2 text-sm">
                  {notifications.length > 0 ? (
                    notifications.map((note) => (
                      <div key={note.id} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${note.color} flex-shrink-0`}></span>
                        <span>{note.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-center py-2">{t('No notifications')}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showAddActionModal && (
          <AddActionModal
            isOpen={true}
            onClose={() => setShowAddActionModal(false)}
            onSave={handleSaveAction}
            lead={null}
            initialDate={actionModalDate}
          />
        )}

        {/* Action Details Modal */}
        {selectedAction && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedAction(null)} />
            <div className={`relative w-[92%] sm:w-[480px] rounded-2xl border shadow-xl ${
              isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-gray-800 border-gray-700 text-gray-100'
            }`}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <div className="font-semibold text-sm">تفاصيل الأكشن</div>
                <button className={`px-2 py-1 rounded-md text-xs ${isLight ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-700 hover:bg-gray-600'}`} onClick={() => setSelectedAction(null)}>✕</button>
              </div>
              <div className="px-4 py-3 space-y-2 text-sm">
                <div className="font-medium">{typeof selectedAction === 'string' ? selectedAction : (selectedAction.title || 'Action')}</div>
                {typeof selectedAction !== 'string' && (
                  <>
                    {selectedAction.description && <div className="opacity-80">{selectedAction.description}</div>}
                    <div className="opacity-75">👤 {selectedAction.leadName || '—'} | 🧑‍💼 {selectedAction.assignedTo || '—'}</div>
                    {selectedAction.location && <div className="opacity-75">📍 {selectedAction.location}</div>}
                    {selectedAction.leadPhone && <div className="opacity-75" dir="ltr">📞 {showFullMobileNumber ? selectedAction.leadPhone : maskPhoneNumber(selectedAction.leadPhone)}</div>}
                  </>
                )}
                <div className="flex items-center gap-2 pt-2">
                  {typeof selectedAction !== 'string' && selectedAction.leadId && (
                    <button className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={() => handleLeadPreview(selectedAction.leadId)}>معاينة العميل</button>
                  )}
                  {typeof selectedAction !== 'string' && selectedAction.leadPhone && (
                    <button className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600" onClick={() => window.open(`tel:${String(selectedAction.leadPhone).replace(/[^0-9]/g, '')}`, '_self')}>اتصال</button>
                  )}
                  {typeof selectedAction !== 'string' && selectedAction.leadPhone && (
                    <button className="text-xs px-2 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600" onClick={() => window.open(`https://wa.me/${String(selectedAction.leadPhone).replace(/[^0-9]/g, '')}`, '_blank')}>واتساب</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lead Details Modal */}
        {selectedLead && (
            <EnhancedLeadDetailsModal
                lead={selectedLead}
                isOpen={showLeadDetails}
                onClose={() => setShowLeadDetails(false)}
                isArabic={i18n.language === 'ar'}
            />
        )}
        </div>
    </div>
  )
}

