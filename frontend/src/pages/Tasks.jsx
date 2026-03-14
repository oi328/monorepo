import React, { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@shared/context/ThemeProvider'
import { api } from '../utils/api'
import { FaDownload, FaFilter, FaChevronDown, FaSearch } from 'react-icons/fa'
import SearchableSelect from '../components/SearchableSelect'
import NewTaskModal from '../components/NewTaskModal'
import TaskDetailsModal from '../components/TaskDetailsModal'

function Badge({ label, tone = 'yellow' }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const tones = {
    yellow: `bg-yellow-500/20 ${isDark ? 'text-white' : 'text-black'} border-yellow-500/40`,
    blue: `bg-sky-500/20 ${isDark ? 'text-white' : 'text-black'} border-sky-500/40`,
    green: `bg-emerald-500/20 ${isDark ? 'text-white' : 'text-black'} border-emerald-500/40`,
    red: `bg-red-500/20 ${isDark ? 'text-white' : 'text-black'} border-red-500/40`
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs border ${tones[tone]}`}>{label}</span>
  )
}

export default function Tasks() {
  const { theme: contextTheme, resolvedTheme } = useTheme()
  const theme = resolvedTheme || contextTheme
  const isLight = theme === 'light'
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const closePage = () => navigate(-1)
  const isArabic = (i18n?.language || '').toLowerCase().startsWith('ar')
  const isRtl = isArabic

  const [query, setQuery] = useState('')
  const [countryFlagEmoji, setCountryFlagEmoji] = useState('')
  const flagsMapRef = React.useRef(null)
  const flagsLoadingRef = React.useRef(false)

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState([])
  const [priorityFilter, setPriorityFilter] = useState([])
  const [assignedToFilter, setAssignedToFilter] = useState([])
  const [relatedToFilter, setRelatedToFilter] = useState([])
  const [showAllFilters, setShowAllFilters] = useState(false)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  const normalizeCode = (s) => {
    const v = (s || '').trim().replace(/\s|-/g, '')
    if (!v) return ''
    if (v.startsWith('+')) return v
    const m = v.match(/^0+(\d{1,4})/)
    if (m) return `+${m[1]}`
    const d = v.match(/^(\d{1,4})$/)
    if (d) return `+${d[1]}`
    return ''
  }

  React.useEffect(() => {
    if (!flagsMapRef.current && !flagsLoadingRef.current) {
      flagsLoadingRef.current = true
      fetch('https://restcountries.com/v3.1/all?fields=idd,flag')
        .then(r => r.json())
        .then(arr => {
          const map = new Map()
          if (Array.isArray(arr)) {
            arr.forEach(c => {
              const root = (c?.idd?.root || '').trim()
              const suffixes = Array.isArray(c?.idd?.suffixes) ? c.idd.suffixes : []
              suffixes.forEach(s => {
                const full = `${root}${s}`
                if (full) map.set(full, c?.flag || '')
              })
            })
          }
          flagsMapRef.current = map
          const code = normalizeCode(query)
          if (code && map.has(code)) {
            setCountryFlagEmoji(map.get(code) || '')
          }
        })
        .catch(() => { flagsMapRef.current = new Map() })
        .finally(() => { flagsLoadingRef.current = false })
    }
  }, [])

  React.useEffect(() => {
    const code = normalizeCode(query)
    if (!code) { setCountryFlagEmoji(''); return }
    const map = flagsMapRef.current
    if (map && map.has(code)) {
      setCountryFlagEmoji(map.get(code) || '')
    } else {
      setCountryFlagEmoji('')
    }
  }, [query])

  // Fetch users and tasks
  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, tasksRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/tasks')
      ])
      
      const usersData = usersRes.data?.data || usersRes.data || []
      setUsers(usersData)

      const tasksData = tasksRes.data?.data || tasksRes.data || []
      const mappedTasks = tasksData.map(t => ({
        id: t.id,
        name: t.title,
        sub: t.description || '',
        assignee: (
          (t?.assigned_to && typeof t.assigned_to === 'object' ? t.assigned_to?.name : null) ||
          t?.assignedTo?.name ||
          t?.assigned_to_user?.name ||
          t?.assigned_to_name ||
          usersData.find(u => u.id == (t?.assigned_to && typeof t.assigned_to === 'object' ? t.assigned_to?.id : t?.assigned_to))?.name ||
          '—'
        ),
        assigneeId: (t?.assigned_to && typeof t.assigned_to === 'object' ? t.assigned_to?.id : t?.assigned_to) || t?.assignedTo?.id || null,
        state1: 'New', // Placeholder
        state2: '',
        due: t.due_date || '',
        salesman: t.created_by_name || 'Admin',
        priority: t.priority || 'medium',
        status: t.status || 'PENDING',
        attachment: t.attachment ? { 
            url: `/api/files/${t.attachment}`, 
            name: t.attachment.split('/').pop() || 'Attachment' 
        } : null,
        startDate: t.start_date,
        taskType: t.task_type,
        relatedType: t.related_to,
        relatedRef: t.related_ref,
        tags: t.tags || [],
        progress: t.progress || 0,
        reminderBefore: t.reminder_before,
        recurring: t.recurring
      }))
      setRows(mappedTasks)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const setStatus = async (id, status) => {
    // Optimistic update
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    try {
      await api.put(`/api/tasks/${id}`, { status })
    } catch (error) {
      console.error('Error updating status:', error)
      fetchData() // Revert on error
    }
  }

  const startTask = (id) => {
    setStatus(id, 'ACCEPTING')
    const task = rows.find(item => item.id === id)
    if (task) {
      const saveReport = async (locationData) => {
        try {
           await api.post('/api/visits', {
             type: 'task',
             task_id: task.id,
             check_in_date: new Date().toISOString(),
             lat: locationData.lat,
             lng: locationData.lng,
             address: locationData.address
           })
        } catch (e) {
          console.error('Error saving check-in report:', e)
        }
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            saveReport({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: 'Current Location'
            })
          },
          (error) => {
            console.error("Error getting location", error)
            saveReport({ lat: 30.0444, lng: 31.2357, address: 'Cairo, Egypt (Default)' })
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        )
      } else {
        saveReport({ lat: 30.0444, lng: 31.2357, address: 'Cairo, Egypt (Default)' })
      }
    }
  }
  const finishTask = (id) => {
    setStatus(id, 'FINISHED')
    const task = rows.find(item => item.id === id)
    if (task) {
      const saveReport = async (locationData) => {
        try {
          const visitsRes = await api.get(`/api/visits?task_id=${task.id}&status=pending`)
          const visits = visitsRes.data?.data || visitsRes.data || []
          const activeVisit = visits.length > 0 ? visits[0] : null
          
          if (activeVisit) {
            await api.put(`/api/visits/${activeVisit.id}`, {
              check_out_date: new Date().toISOString(),
              status: 'completed',
              lat: locationData.lat,
              lng: locationData.lng,
              address: locationData.address
            })
          }
        } catch (e) {
          console.error('Error saving check-out report:', e)
        }
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            saveReport({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: 'Current Location'
            })
          },
          (error) => {
            console.error("Error getting location", error)
            saveReport({ lat: 30.0444, lng: 31.2357, address: 'Cairo, Egypt (Default)' })
          }
        )
      } else {
        saveReport({ lat: 30.0444, lng: 31.2357, address: 'Cairo, Egypt (Default)' })
      }
    }
  }
  const cancelTask = (id) => { if (window.confirm(isArabic ? 'تأكيد إلغاء المهمة؟' : 'Confirm cancel task?')) setStatus(id, 'CANCELLED') }
  const clearTasks = () => setRows([])
  
  const addTask = async (task) => {
    try {
      const formData = new FormData()
      formData.append('title', task.title)
      if (task.description) formData.append('description', task.description)
      if (task.assignedTo) formData.append('assigned_to', task.assignedTo)
      if (task.due || task.endDate) formData.append('due_date', task.due || task.endDate)
      if (task.startDate) formData.append('start_date', task.startDate)
      formData.append('priority', task.priority || 'medium')
      formData.append('status', 'PENDING')
      if (task.attachment?.file) formData.append('attachment', task.attachment.file)
      if (task.taskType) formData.append('task_type', task.taskType)
      if (task.createdBy) formData.append('created_by_name', task.createdBy)
      if (task.relatedType) formData.append('related_to', task.relatedType)
      if (task.relatedRef) formData.append('related_ref', task.relatedRef)
      if (task.tags && task.tags.length) {
          task.tags.forEach((tag, index) => {
              formData.append(`tags[${index}]`, tag)
          })
      }
      if (task.progress) formData.append('progress', task.progress)
      if (task.reminderBefore) formData.append('reminder_before', task.reminderBefore)
      if (task.recurring) formData.append('recurring', task.recurring)

      await api.post('/api/tasks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      fetchData() // Refresh list
    } catch (error) {
      console.error('Error adding task:', error)
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors)
        alert(`${isArabic ? 'خطأ في البيانات:' : 'Validation Error:'} ${Object.values(error.response.data.errors).flat().join(', ')}`)
      } else {
        alert(isArabic ? 'فشل إضافة المهمة' : 'Failed to add task')
      }
    }
  }

  const exportTasks = () => {
    try {
      const headers = ['id','name','sub','assignee','state1','state2','due','salesman','priority','status']
      const csvRows = [headers.join(',')]
      rows.forEach(r => {
        const vals = headers.map(h => String(r[h] ?? '').replace(/"/g, '""'))
        csvRows.push(vals.map(v => `"${v}"`).join(','))
      })
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'tasks.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
      alert('Export failed')
    }
  }

  // Filtered Rows
  const shownRows = useMemo(() => {
    return rows.filter(item => {
      // Search
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = !searchTerm || 
        item.name?.toLowerCase().includes(searchLower) ||
        item.sub?.toLowerCase().includes(searchLower) ||
        item.assignee?.toLowerCase().includes(searchLower)

      // Status
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.status)

      // Priority
      const matchesPriority = priorityFilter.length === 0 || priorityFilter.includes(item.priority)

      // Assigned To
      const matchesAssigned = assignedToFilter.length === 0 || assignedToFilter.includes(item.assignee)

      // Related To
      const matchesRelated = relatedToFilter.length === 0 || relatedToFilter.includes(item.relatedType)

      return matchesSearch && matchesStatus && matchesPriority && matchesAssigned && matchesRelated
    })
  }, [rows, searchTerm, statusFilter, priorityFilter, assignedToFilter, relatedToFilter])

  // Options for filters
  const statusOptions = [
    { value: 'PENDING', label: isArabic ? 'قيد الانتظار' : 'Pending' },
    { value: 'ACCEPTING', label: isArabic ? 'جاري التنفيذ' : 'In Progress' },
    { value: 'FINISHED', label: isArabic ? 'مكتملة' : 'Completed' },
    { value: 'CANCELLED', label: isArabic ? 'ملغاة' : 'Cancelled' }
  ]

  const priorityOptions = [
    { value: 'high', label: isArabic ? 'عالية' : 'High' },
    { value: 'medium', label: isArabic ? 'متوسطة' : 'Medium' },
    { value: 'low', label: isArabic ? 'منخفضة' : 'Low' }
  ]

  const relatedOptions = [
    { value: 'Lead', label: 'Lead' },
    { value: 'Deal', label: 'Deal' },
    { value: 'Project', label: 'Project' }
  ]

  const usersOptions = useMemo(() => users.map(u => ({ value: u.name, label: u.name })), [users])

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter(['PENDING', 'ACCEPTING', 'FINISHED'])
    setPriorityFilter([])
    setAssignedToFilter([])
    setRelatedToFilter([])
  }

  return (
    <div className="px-4 md:px-6 py-4">
        {/* Page header */}
         <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold tracking-wide">{t('Tasks')}</h1>
          <div className="flex items-center gap-2">

           <button
              onClick={() => setShowNewTaskModal(true)}
              className="inline-flex items-center gap-2 p-2 sm:px-4 sm:py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-sm font-medium"
              title={isArabic ? 'مهمة جديدة' : 'New Task'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 sm:w-4 sm:h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">{isArabic ? 'مهمة جديدة' : 'New Task'}</span>
            </button>
            <button
              onClick={exportTasks}
              className="inline-flex items-center gap-2 p-2 sm:px-4 sm:py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors text-sm font-medium"
              title={isArabic ? 'تصدير' : 'Export'}
            >
              <FaDownload className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? 'تصدير' : 'Export'}</span>
            </button>
                       <button
             type="button"
             onClick={closePage}
             className="inline-flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-md border bg-[var(--dropdown-bg)] hover:bg-[var(--table-row-hover)]"
             title={isArabic ? 'إغلاق الصفحة' : 'Close page'}
           >
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
               <path d="M18 6L6 18M6 6l12 12" />
             </svg>
             <span className="hidden sm:inline text-sm">{isArabic ? 'إغلاق' : 'Close'}</span>
           </button>
          </div>
         </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: isArabic ? 'الكل' : 'All', count: rows.length, color: 'gray', value: [] },
          { label: isArabic ? 'قيد الانتظار' : 'Pending', count: rows.filter(r => r.status === 'PENDING').length, color: 'yellow', value: ['PENDING'] },
          { label: isArabic ? 'جاري التنفيذ' : 'In Progress', count: rows.filter(r => r.status === 'ACCEPTING').length, color: 'blue', value: ['ACCEPTING'] },
          { label: isArabic ? 'مكتملة' : 'Completed', count: rows.filter(r => r.status === 'FINISHED').length, color: 'emerald', value: ['FINISHED'] },
          { label: isArabic ? 'ملغاة' : 'Cancelled', count: rows.filter(r => r.status === 'CANCELLED').length, color: 'red', value: ['CANCELLED'] },
        ].map((stat, index) => {
          const isActive = stat.value.length === 0 
            ? statusFilter.length === 0 
            : statusFilter.length === 1 && statusFilter[0] === stat.value[0];
          
          const colors = {
            gray: isActive 
              ? 'bg-slate-800 border-slate-500 text-white dark:bg-slate-700' 
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600',
            yellow: isActive 
              ? 'bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-500' 
              : 'bg-yellow-50 border-yellow-200 text-yellow-600 hover:border-yellow-300 dark:bg-yellow-900/10 dark:border-yellow-900/30 dark:text-yellow-600/70 dark:hover:border-yellow-700/50',
            blue: isActive 
              ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-500' 
              : 'bg-blue-50 border-blue-200 text-blue-600 hover:border-blue-300 dark:bg-blue-900/10 dark:border-blue-900/30 dark:text-blue-600/70 dark:hover:border-blue-700/50',
            emerald: isActive 
              ? 'bg-emerald-100 border-emerald-500 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-500' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:border-emerald-300 dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-600/70 dark:hover:border-emerald-700/50',
            red: isActive 
              ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/40 dark:text-red-500' 
              : 'bg-red-50 border-red-200 text-red-600 hover:border-red-300 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-600/70 dark:hover:border-red-700/50',
          };

          const badgeColors = {
             gray: isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
             yellow: isActive ? 'bg-yellow-500 text-white dark:text-black' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-600',
             blue: isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-600',
             emerald: isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-600',
             red: isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-600',
          }

          return (
            <button
              key={index}
              onClick={() => setStatusFilter(stat.value)}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-200 ${colors[stat.color]}`}
            >
              <span className="font-medium text-sm whitespace-nowrap">{stat.label}</span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${badgeColors[stat.color]}`}>
                {stat.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filter Panel */}
      <div className={`glass-panel rounded-2xl p-3 mb-6 filters-compact`}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold dark:text-white flex items-center gap-2">
              <FaFilter size={16} className="text-blue-500 dark:text-blue-400" /> {t('Filters')}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAllFilters(prev => !prev)} className={`flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors`}>
                {showAllFilters ? (isArabic ? 'إخفاء' : 'Hide') : (isArabic ? 'إظهار' : 'Show')}
                <FaChevronDown size={12} className={`transform transition-transform duration-300 ${showAllFilters ? 'rotate-180' : 'rotate-0'}`} />
              </button>
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 text-sm dark:text-white hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                {t('Reset')}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {/* First Row - Always Visible */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Search */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                  <FaSearch size={12} className="text-blue-500 dark:text-blue-400" />
                  {t('Search')}
                </label>
                <input
                  type="text"
                  placeholder={isArabic ? 'بحث عن مهمة...' : 'Search tasks...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg  dark:bg-gray-700  ${isLight ? 'text-black' : 'text-white'} text-sm font-medium  dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                  </svg>
                  {isArabic ? 'الحالة' : 'Status'}
                </label>
                <SearchableSelect
                  value={statusFilter}
                  multiple={true}
                  onChange={setStatusFilter}
                  options={statusOptions}
                  placeholder={t('All')}
                  isRTL={isRtl}
                />
              </div>

               {/* Priority Filter */}
               <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {isArabic ? 'الأولوية' : 'Priority'}
                </label>
                <SearchableSelect
                  value={priorityFilter}
                  multiple={true}
                  onChange={setPriorityFilter}
                  options={priorityOptions}
                  placeholder={t('All')}
                  isRTL={isRtl}
                />
              </div>

              {/* Assigned To */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {isArabic ? 'مسند إلى' : 'Assigned To'}
                </label>
                <SearchableSelect
                  value={assignedToFilter}
                  multiple={true}
                  onChange={setAssignedToFilter}
                  options={usersOptions}
                  placeholder={t('All')}
                  isRTL={isRtl}
                />
              </div>
            </div>

            {/* Additional Filters (Show/Hide) */}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showAllFilters ? 'max-h-[800px] opacity-100 pt-3' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                 {/* Related To */}
                 <div className="space-y-1">
                  <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                    <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {isArabic ? 'مرتبط بـ' : 'Related To'}
                  </label>
                  <SearchableSelect
                    value={relatedToFilter}
                    multiple={true}
                    onChange={setRelatedToFilter}
                    options={relatedOptions}
                    placeholder={t('All')}
                    isRTL={isRtl}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
             <div className="text-center p-8 text-[var(--muted-text)]">{isArabic ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : shownRows.length === 0 ? (
             <div className="text-center p-8 text-[var(--muted-text)]">
                <div className="flex flex-col items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 opacity-20">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="2" />
                    <path d="M9 14l2 2 4-4" />
                  </svg>
                  <span>{isArabic ? 'لا توجد مهام' : 'No tasks found'}</span>
                </div>
             </div>
        ) : (
            shownRows.map((row) => (
              <div key={row.id} className="bg-[var(--content-bg)] p-4 rounded-lg shadow-sm border border-[var(--divider)]">
                 <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-semibold text-[var(--content-text)]">{row.name}</h3>
                        <p className="text-sm text-[var(--muted-text)] line-clamp-2">{row.sub}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        row.status === 'FINISHED' ? 'bg-emerald-500/10 text-emerald-500' :
                        row.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                        row.status === 'ACCEPTING' ? 'bg-sky-500/10 text-sky-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {row.status === 'FINISHED' ? (isArabic ? 'مكتملة' : 'Completed') :
                         row.status === 'CANCELLED' ? (isArabic ? 'ملغاة' : 'Cancelled') :
                         row.status === 'ACCEPTING' ? (isArabic ? 'جاري التنفيذ' : 'In Progress') :
                         (isArabic ? 'قيد الانتظار' : 'Pending')}
                      </span>
                 </div>
                 
                 <div className="space-y-2 text-sm text-[var(--content-text)] mb-4">
                     <div className="flex items-center justify-between">
                        <span className="text-[var(--muted-text)]">{isArabic ? 'مسند إلى' : 'Assigned To'}</span>
                        <div className="flex items-center gap-1">
                             <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px] font-bold uppercase">
                                  {row.assignee.charAt(0)}
                             </div>
                             <span>{row.assignee}</span>
                        </div>
                     </div>
                     
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--muted-text)]">{isArabic ? 'الأولوية' : 'Priority'}</span>
                         <Badge
                            label={isArabic ? (row.priority === 'high' ? 'عالية' : row.priority === 'low' ? 'منخفضة' : 'متوسطة') : row.priority}
                            tone={row.priority === 'high' ? 'red' : row.priority === 'low' ? 'green' : 'yellow'}
                          />
                     </div>
                     
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--muted-text)]">{isArabic ? 'الموعد' : 'Due Date'}</span>
                        <span>{row.due}</span>
                     </div>
                 </div>

                 <div className="flex justify-end gap-2 pt-3 border-t border-[var(--divider)]">
                        {row.status === 'PENDING' && (
                          <button
                            onClick={() => startTask(row.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-sky-50 text-sky-600 rounded-md hover:bg-sky-100"
                          >
                            {isArabic ? 'بدء' : 'Start'}
                          </button>
                        )}
                        {row.status === 'ACCEPTING' && (
                          <button
                            onClick={() => finishTask(row.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100"
                          >
                             {isArabic ? 'إكمال' : 'Complete'}
                          </button>
                        )}
                        {row.status !== 'FINISHED' && row.status !== 'CANCELLED' && (
                          <button
                            onClick={() => cancelTask(row.id)}
                             className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                          >
                            {isArabic ? 'إلغاء' : 'Cancel'}
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedTask(row)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          {isArabic ? 'تفاصيل' : 'Details'}
                        </button>
                 </div>
              </div>
            ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border border-[var(--divider)] rounded-lg overflow-hidden bg-[var(--content-bg)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--table-header-bg)] text-[var(--muted-text)] font-medium uppercase text-xs border-b border-[var(--divider)]">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">{isArabic ? 'المهمة' : 'Task'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isArabic ? 'مسند إلى' : 'Assigned To'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isArabic ? 'بواسطة' : 'Created By'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isArabic ? 'الأولوية' : 'Priority'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isArabic ? 'الموعد' : 'Due Date'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isArabic ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 whitespace-nowrap text-end">{isArabic ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--divider)]">
              {loading ? (
                 <tr><td colSpan="7" className="p-8 text-center text-[var(--muted-text)]">{isArabic ? 'جاري التحميل...' : 'Loading...'}</td></tr>
              ) : shownRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-[var(--muted-text)]">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 opacity-20">
                        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                        <rect x="9" y="3" width="6" height="4" rx="2" />
                        <path d="M9 14l2 2 4-4" />
                      </svg>
                      <span>{isArabic ? 'لا توجد مهام' : 'No tasks found'}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                shownRows.map((row) => (
                  <tr key={row.id} className="group hover:bg-[var(--table-row-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-[var(--content-text)]">{row.name}</span>
                        <span className="text-xs text-[var(--muted-text)] truncate max-w-[200px]">{row.sub}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-xs font-bold uppercase">
                          {row.assignee.charAt(0)}
                        </div>
                        <span className="text-[var(--content-text)]">{row.assignee}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--content-text)]">
                      {row.salesman}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={isArabic ? (row.priority === 'high' ? 'عالية' : row.priority === 'low' ? 'منخفضة' : 'متوسطة') : row.priority}
                        tone={row.priority === 'high' ? 'red' : row.priority === 'low' ? 'green' : 'yellow'}
                      />
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-text)]">
                      {row.due}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        row.status === 'FINISHED' ? 'bg-emerald-500/10 text-emerald-500' :
                        row.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                        row.status === 'ACCEPTING' ? 'bg-sky-500/10 text-sky-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {row.status === 'FINISHED' ? (isArabic ? 'مكتملة' : 'Completed') :
                         row.status === 'CANCELLED' ? (isArabic ? 'ملغاة' : 'Cancelled') :
                         row.status === 'ACCEPTING' ? (isArabic ? 'جاري التنفيذ' : 'In Progress') :
                         (isArabic ? 'قيد الانتظار' : 'Pending')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Start Task Button */}
                        {row.status === 'PENDING' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); startTask(row.id); }}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title={isArabic ? 'بدء المهمة' : 'Start Task'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          </button>
                        )}
                        
                        {/* Complete Task Button */}
                        {row.status === 'ACCEPTING' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); finishTask(row.id); }}
                            className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors"
                            title={isArabic ? 'إكمال المهمة' : 'Complete Task'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"  className="w-20 h-4">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </button>
                        )}
                        
                        {/* Cancel Task Button */}
                        {row.status !== 'FINISHED' && row.status !== 'CANCELLED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelTask(row.id); }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            title={isArabic ? 'إلغاء' : 'Cancel'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"  className="w-20 h-4">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="15" y1="9" x2="9" y2="15"></line>
                              <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                          </button>
                        )}
                        
                        {/* View Details Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedTask(row); }}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded transition-colors"
                          title={isArabic ? 'تفاصيل' : 'Details'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-20 h-4">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewTaskModal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        onSave={(task) => { addTask(task); setShowNewTaskModal(false); }}
        users={users}
      />

      <TaskDetailsModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
      />
    </div>
  )
}
