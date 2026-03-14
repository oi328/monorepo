import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { logExportEvent } from '../utils/api'
import { useNavigate } from 'react-router-dom'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { useAppState } from '@shared/context/AppStateProvider'
import { api } from '../utils/api'
import BackButton from '../components/BackButton'
import { PieChart } from '../shared/components/PieChart'
import SearchableSelect from '../components/SearchableSelect'
import { Filter, User, Users, Target, FileText, DollarSign, Tag, Briefcase, Calendar, Trophy, ChevronLeft, ChevronRight, Search, Eye, ChevronDown } from 'lucide-react'
import { FaChevronDown, FaFileExport, FaFileExcel, FaFilePdf } from 'react-icons/fa'
import { useTheme } from '@shared/context/ThemeProvider'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function RevenueReport() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isRTL = i18n.language === 'ar'
  const { company } = useAppState()
  const companyType = String(company?.company_type || '').toLowerCase()
  const [salesPersonFilter, setSalesPersonFilter] = useState('all')
  const [managerFilter, setManagerFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [dealTypeFilter, setDealTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showSalesGroupingMenu, setShowSalesGroupingMenu] = useState(false)
  const [showTimeGroupingMenu, setShowTimeGroupingMenu] = useState(false)
  const [revenuePieMode, setRevenuePieMode] = useState('project')
  const salesMenuRef = useRef(null)
  const timeMenuRef = useRef(null)
  const [usersList, setUsersList] = useState([])
  const [sourceOptions, setSourceOptions] = useState(['all'])
  const [projectOptions, setProjectOptions] = useState(['all'])
  const [records, setRecords] = useState([])

  const enrichedRecords = useMemo(() => {
    // Map to store records by user ID
    const revenueMap = new Map()
    records.forEach(r => {
        const uid = r.salespersonId ? String(r.salespersonId) : 'unknown'
        if (!revenueMap.has(uid)) revenueMap.set(uid, [])
        revenueMap.get(uid).push(r)
    })

    const allRows = []
    const processedUserIds = new Set()

    // 1. Process active users
    usersList.forEach(u => {
        const uid = String(u.id)
        processedUserIds.add(uid)
        
        // Check if this is a sales/manager/relevant user
        const role = String(u.role || '').toLowerCase()
        const isSales = role.includes('sales') || role.includes('agent') || role.includes('broker')
        const hasTarget = parseFloat(u.monthly_target || 0) > 0
        const hasRevenue = revenueMap.has(uid)

        // Include user if they are Sales/Agent OR have a Target OR have Revenue
        if (isSales || hasTarget || hasRevenue) {
             const userRevenues = revenueMap.get(uid) || []
             if (userRevenues.length > 0) {
                 userRevenues.forEach(r => {
                     allRows.push({
                         ...r,
                         salesperson: u.name,
                         manager: u.manager ? u.manager.name : (r.manager || ''),
                         target: parseFloat(u.monthly_target || 0),
                        monthlyTarget: parseFloat(u.monthly_target || 0),
                        yearlyTarget: parseFloat(u.yearly_target || 0)
                     })
                 })
             } else {
                 // Add dummy row for users with no revenue
                 allRows.push({
                    id: `empty-${uid}`,
                    salesperson: u.name,
                    salespersonId: u.id,
                    manager: u.manager ? u.manager.name : '',
                    source: '-',
                    project: '-',
                    dealType: '-',
                    status: 'No Sales',
                    date: '', // Empty date
                    target: parseFloat(u.monthly_target || 0),
                    monthlyTarget: parseFloat(u.monthly_target || 0),
                    yearlyTarget: parseFloat(u.yearly_target || 0),
                    revenue: 0
                 })
             }
        }
    })

    // 2. Process orphaned records (users not in usersList)
    records.forEach(r => {
        const uid = r.salespersonId ? String(r.salespersonId) : 'unknown'
        if (!processedUserIds.has(uid) && uid !== 'unknown') {
            allRows.push({
                ...r,
                target: 0, // No user info = no target known
                monthlyTarget: 0,
                yearlyTarget: 0
            })
        }
    })

    return allRows
  }, [records, usersList])

  useEffect(() => {
    const fetchRevenueRecords = async () => {
      try {
        const res = await api.get('/api/revenues')
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        const mapped = raw.map(r => {
          const lead = r.lead || {}
          const user = r.user || {}
          
          const salesperson = user.name || lead.sales_person || lead.salesperson || ''
          const manager = user.manager ? user.manager.name : '' // Ideally we need manager info. User object might have it if eager loaded or we map from usersList
          const source = r.source || lead.source || ''
          const project = lead.project || ''
          const dealType = 'Closed Won' // Revenue implies it's closed/won
          const status = 'Closed Won'

          const revenue = parseFloat(r.amount || 0)

          const dateRaw = r.created_at || ''
          const date =
            typeof dateRaw === 'string' && dateRaw
              ? dateRaw.slice(0, 10)
              : ''

          // We will map target later from usersList
          const target = 0

          return {
            id: r.id,
            salesperson,
            salespersonId: r.user_id,
            manager,
            source,
            project,
            dealType,
            status,
            date,
            target,
            monthlyTarget: 0,
            yearlyTarget: 0,
            revenue
          }
        })
        setRecords(mapped)
      } catch (e) {
        console.error('Failed to fetch revenue records', e)
        setRecords([])
      }
    }

    fetchRevenueRecords()
  }, [])

  useEffect(() => {
    const handleClickOutside = event => {
      if (salesMenuRef.current && !salesMenuRef.current.contains(event.target)) {
        setShowSalesGroupingMenu(false)
      }
      if (timeMenuRef.current && !timeMenuRef.current.contains(event.target)) {
        setShowTimeGroupingMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/api/users')
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        setUsersList(data)
      } catch (e) {
        console.error('Failed to fetch users for revenue report', e)
        setUsersList([])
      }
    }
    fetchUsers()
  }, [])

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await api.get('/api/sources?active=1')
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        const names = Array.from(new Set(data.map(s => s.name).filter(Boolean)))
        setSourceOptions(['all', ...names])
      } catch (e) {
        console.error('Failed to fetch sources for revenue report', e)
        const set = new Set(records.map(r => r.source).filter(Boolean))
        setSourceOptions(['all', ...Array.from(set)])
      }
    }
    fetchSources()
  }, [records])

  useEffect(() => {
    const fetchProjectsOrItems = async () => {
      try {
        let names = []
        if (companyType === 'real estate') {
          const res = await api.get('/api/projects')
          const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
          names = data.map(p => p.name || p.name_ar || p.title).filter(Boolean)
        } else if (companyType === 'general') {
          const res = await api.get('/api/items?all=1')
          const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
          names = data.map(it => it.name || it.product || it.title).filter(Boolean)
        } else {
          const set = new Set(records.map(r => r.project).filter(Boolean))
          names = Array.from(set)
        }
        const unique = Array.from(new Set(names))
        setProjectOptions(['all', ...unique])
      } catch (e) {
        console.error('Failed to fetch projects/items for revenue report', e)
        const set = new Set(records.map(r => r.project).filter(Boolean))
        setProjectOptions(['all', ...Array.from(set)])
      }
    }
    fetchProjectsOrItems()
  }, [companyType, records])

  const salespersonOptions = useMemo(() => {
    if (!usersList.length) {
      const set = new Set(records.map(r => r.salesperson).filter(Boolean))
      return ['all', ...Array.from(set)]
    }
    const uniqueUsers = Array.from(new Map(usersList.map(u => [u.id, u])).values())
    
    // Filter by manager if selected
    const filteredUsers = uniqueUsers.filter(u => {
        if (managerFilter === 'all') return true
        return u.manager && u.manager.name === managerFilter
    })

    return ['all', ...filteredUsers.map(u => {
        const roleName = (Array.isArray(u.roles) && u.roles[0]?.name) || u.role || ''
        return {
            value: u.name,
            label: u.name + (roleName ? ` (${roleName})` : '')
        }
    })]
  }, [usersList, records, managerFilter])

  const managerOptions = useMemo(() => {
    if (!usersList.length) {
      return ['all', 'Manager 1', 'Manager 2']
    }
    const managers = usersList.filter(u => {
      const role = String(u.role || '').toLowerCase()
      // Exclude salespersons and high-level roles from Manager filter
      const isSalesPerson = role.includes('sales person') || role.includes('salesperson')
      const isHighLevel = role.includes('sales admin') || role.includes('director') || role.includes('operator') || role.includes('tenant admin') || role.includes('tenant-admin')
      return !isSalesPerson && !isHighLevel
    })
    const uniqueManagers = Array.from(new Map(managers.map(m => [m.id, m])).values())
    
    return ['all', ...uniqueManagers.map(m => {
      const roleName = (Array.isArray(m.roles) && m.roles[0]?.name) || m.role || ''
      return {
        value: m.name || `#${m.id}`,
        label: m.name + (roleName ? ` (${roleName})` : '')
      }
    })]
  }, [usersList])

  const dealTypeOptions = ['all', 'Proposal', 'Reservation', 'Contract']

  const statusOptions = ['all', 'Closed Won', 'Closed Lost', 'In Progress']

  const filtered = useMemo(() => {
    return enrichedRecords.filter(r => {
      const bySales = salesPersonFilter === 'all' || r.salesperson === salesPersonFilter
      const byManager = managerFilter === 'all' || r.manager === managerFilter || r.salesperson === managerFilter
      const bySource = sourceFilter === 'all' || r.source === sourceFilter
      const byProject = projectFilter === 'all' || r.project === projectFilter
      const byDealType = dealTypeFilter === 'all' || r.dealType === dealTypeFilter
      const byStatus = statusFilter === 'all' || r.status === statusFilter

      const fromDate = dateFromFilter ? new Date(dateFromFilter) : null
      const toDate = dateToFilter ? new Date(dateToFilter) : null
      
      let byFrom = true
      let byTo = true

      if (r.date) {
          const currentDate = new Date(r.date)
          byFrom = !fromDate || currentDate >= fromDate
          byTo = !toDate || currentDate <= toDate
      } else {
          // If date is missing (dummy row), we generally include it unless logic dictates otherwise.
          // For "Targets & Revenue", we want to see the user even if they have no sales in this period.
          // So we consider it a pass for date filters.
          byFrom = true
          byTo = true
      }

      return bySales && byManager && bySource && byProject && byDealType && byStatus && byFrom && byTo
    })
  }, [
    enrichedRecords,
    salesPersonFilter,
    managerFilter,
    sourceFilter,
    projectFilter,
    dealTypeFilter,
    statusFilter,
    dateFromFilter,
    dateToFilter
  ])

  const [currentPage, setCurrentPage] = useState(1)
  const [entriesPerPage, setEntriesPerPage] = useState(10)

  useEffect(() => {
    setCurrentPage(1)
  }, [salesPersonFilter, managerFilter, sourceFilter, projectFilter, dealTypeFilter, statusFilter, dateFromFilter, dateToFilter])

  const totalRecords = filtered.length
  const pageCount = Math.ceil(totalRecords / entriesPerPage)
  const paginatedData = filtered.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  )

  const totalTarget = useMemo(() => {
    const uniqueUserIds = new Set()
    return filtered.reduce((sum, r) => {
      // Only add target once per user
      if (r.salespersonId && !uniqueUserIds.has(r.salespersonId)) {
        uniqueUserIds.add(r.salespersonId)
        
        // Determine effective target based on filters
        let effectiveTarget = r.monthlyTarget || 0
        if (!dateFromFilter && !dateToFilter) {
            effectiveTarget = r.yearlyTarget || (r.monthlyTarget * 12) || 0
        } else if (dateFromFilter && dateToFilter) {
            const d1 = new Date(dateFromFilter)
            const d2 = new Date(dateToFilter)
            const diffTime = Math.abs(d2 - d1)
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
            if (diffDays > 40) { 
                 effectiveTarget = r.yearlyTarget || (r.monthlyTarget * 12) || 0
            }
        }
        return sum + effectiveTarget
      }
      // If it's an unknown user (no ID) but has target (unlikely as per logic), handle it?
      // Our logic sets target=0 for unknown users, so safe to ignore.
      return sum
    }, 0)
  }, [filtered, dateFromFilter, dateToFilter])

  const totalRevenue = filtered.reduce((sum, r) => sum + (r.revenue || 0), 0)
  const achievementPercent = totalTarget ? Math.round((totalRevenue / totalTarget) * 100) : 0

  const [chartMode, setChartMode] = useState('salesperson')
  const [salesGrouping, setSalesGrouping] = useState('salesperson')
  const [timeGrouping, setTimeGrouping] = useState('monthly')

  const barData = useMemo(() => {
    if (chartMode === 'salesperson') {
      const map = new Map()

      // Initialize with all salespersons/teams from usersList
      if (salesGrouping === 'salesperson') {
          usersList.forEach(u => {
              // Apply Manager Filter
              if (managerFilter !== 'all') {
                  const mgrName = u.manager?.name || ''
                  if (mgrName !== managerFilter) return
              }

              const roleName = (Array.isArray(u.roles) && u.roles[0]?.name) || u.role || ''
              const role = String(roleName).toLowerCase()
              const isSales = role.includes('sales person') || role.includes('salesperson') || role.includes('agent')
              
              if (isSales || parseFloat(u.monthly_target || 0) > 0) {
                  const key = String(u.id)
                  map.set(key, {
                      label: u.name,
                      target: parseFloat(u.monthly_target || 0),
                      revenue: 0
                  })
              }
          })
      } else if (salesGrouping === 'team') {
          // Initialize map with managers and their TOTAL targets
          const managerNames = new Set()
          usersList.forEach(u => {
              // Find users who are managers (referenced by others or have manager roles)
              const isReferencedAsManager = usersList.some(child => child.manager && (child.manager.id === u.id || child.manager.name === u.name))
              
              if (isReferencedAsManager) {
                  managerNames.add(u.name)
                  const key = u.name
                  if (!map.has(key)) {
                      map.set(key, {
                          label: key,
                          target: parseFloat(u.total_monthly_target || 0), 
                          revenue: 0
                      })
                  }
              }
          })

          // Fallback: If some managers are not in usersList but referenced in 'manager' field of children
          usersList.forEach(u => {
              if (u.manager && u.manager.name && !managerNames.has(u.manager.name)) {
                  // We found a manager name that wasn't in our usersList logic above
                  // We can't get their total_monthly_target easily if they aren't in usersList
                  // So we might need to sum up children for them
                  const key = u.manager.name
                  if (!map.has(key)) {
                       map.set(key, {
                          label: key,
                          target: 0, 
                          revenue: 0
                      })
                  }
                  // Add child's target to this unknown manager? 
                  // Instruction says "display total aggregate targets for managers". 
                  // If we don't have the manager object, we can only sum children.
                  const current = map.get(key)
                  current.target += parseFloat(u.monthly_target || 0)
              }
          })
      }
      
      // Add revenue from filtered records
      filtered.forEach(r => {
        const id = r.salespersonId
        const name = r.salesperson || (isRTL ? 'غير معروف' : 'Unknown')
        const manager = r.manager || (isRTL ? 'غير معروف' : 'Unknown')
        
        let key
        if (salesGrouping === 'team') {
            key = manager
        } else {
            key = id ? String(id) : name
        }
        
        if (!map.has(key)) {
          map.set(key, { 
            label: salesGrouping === 'team' ? manager : name,
            target: 0, 
            revenue: 0 
          })
        }
        const current = map.get(key)
        current.revenue += r.revenue || 0
      })

      // Filter out entries with no activity and no target
      const entries = Array.from(map.values()).filter(v => v.target > 0 || v.revenue > 0)

      const labels = entries.map(v => v.label)
      const targets = entries.map(v => v.target)
      const revenues = entries.map(v => v.revenue)

      return {
        labels,
        datasets: [
          {
            label: isRTL ? 'الهدف' : 'Target',
            data: targets,
            backgroundColor: 'rgba(148, 163, 184, 0.8)'
          },
          {
            label: isRTL ? 'الإيرادات الفعلية' : 'Actual Revenue',
            data: revenues,
            backgroundColor: 'rgba(59, 130, 246, 0.85)'
          }
        ]
      }
    }

    if (timeGrouping === 'monthly') {
      const monthLabels = isRTL 
        ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const targets = new Array(12).fill(0)
      const revenues = new Array(12).fill(0)

      filtered.forEach(r => {
        if (!r.date) return
        const monthIndex = Number.parseInt(r.date.substring(5, 7), 10) - 1
        if (monthIndex >= 0 && monthIndex < 12) {
          targets[monthIndex] += r.target || 0
          revenues[monthIndex] += r.revenue || 0
        }
      })

      return {
        labels: monthLabels,
        datasets: [
          {
            label: isRTL ? 'الهدف' : 'Target',
            data: targets,
            backgroundColor: 'rgba(148, 163, 184, 0.8)'
          },
          {
            label: isRTL ? 'الإيرادات الفعلية' : 'Actual Revenue',
            data: revenues,
            backgroundColor: 'rgba(59, 130, 246, 0.85)'
          }
        ]
      }
    }

    if (timeGrouping === 'quarterly') {
      const labels = isRTL 
        ? ['الربع الأول', 'الربع الثاني', 'الربع الثالث', 'الربع الرابع']
        : ['Q1', 'Q2', 'Q3', 'Q4']
      const targets = new Array(4).fill(0)
      const revenues = new Array(4).fill(0)

      filtered.forEach(r => {
        if (!r.date) return
        const monthIndex = Number.parseInt(r.date.substring(5, 7), 10) - 1
        if (monthIndex < 0 || monthIndex > 11) return
        const quarterIndex = Math.floor(monthIndex / 3)
        targets[quarterIndex] += r.target || 0
        revenues[quarterIndex] += r.revenue || 0
      })

      return {
        labels,
        datasets: [
          {
            label: isRTL ? 'الهدف' : 'Target',
            data: targets,
            backgroundColor: 'rgba(148, 163, 184, 0.8)'
          },
          {
            label: isRTL ? 'الإيرادات الفعلية' : 'Actual Revenue',
            data: revenues,
            backgroundColor: 'rgba(59, 130, 246, 0.85)'
          }
        ]
      }
    }

    if (timeGrouping === 'semi_annual') {
      const labels = isRTL 
        ? ['النصف الأول', 'النصف الثاني']
        : ['H1', 'H2']
      const targets = new Array(2).fill(0)
      const revenues = new Array(2).fill(0)

      filtered.forEach(r => {
        if (!r.date) return
        const monthIndex = Number.parseInt(r.date.substring(5, 7), 10) - 1
        if (monthIndex < 0 || monthIndex > 11) return
        const halfIndex = monthIndex < 6 ? 0 : 1
        targets[halfIndex] += r.target || 0
        revenues[halfIndex] += r.revenue || 0
      })

      return {
        labels,
        datasets: [
          {
            label: isRTL ? 'الهدف' : 'Target',
            data: targets,
            backgroundColor: 'rgba(148, 163, 184, 0.8)'
          },
          {
            label: isRTL ? 'الإيرادات الفعلية' : 'Actual Revenue',
            data: revenues,
            backgroundColor: 'rgba(59, 130, 246, 0.85)'
          }
        ]
      }
    }

    const map = new Map()
    filtered.forEach(r => {
      if (!r.date) return
      const yearKey = r.date.substring(0, 4)
      if (!map.has(yearKey)) {
        map.set(yearKey, { target: 0, revenue: 0 })
      }
      const current = map.get(yearKey)
      current.target += r.target || 0
      current.revenue += r.revenue || 0
    })
    const labels = Array.from(map.keys()).sort()
    const targets = labels.map(key => map.get(key).target)
    const revenues = labels.map(key => map.get(key).revenue)
    return {
      labels,
      datasets: [
        {
          label: isRTL ? 'الهدف' : 'Target',
          data: targets,
          backgroundColor: 'rgba(148, 163, 184, 0.8)'
        },
        {
          label: isRTL ? 'الإيرادات الفعلية' : 'Actual Revenue',
          data: revenues,
          backgroundColor: 'rgba(59, 130, 246, 0.85)'
        }
      ]
    }
  }, [filtered, isRTL, chartMode, salesGrouping, timeGrouping])

  const barOptions = useMemo(() => {
    const xTitle =
      chartMode === 'salesperson'
        ? salesGrouping === 'team'
          ? (isRTL ? 'الفريق' : 'Team')
          : (isRTL ? 'موظف المبيعات' : 'Sales Person')
        : timeGrouping === 'monthly'
          ? (isRTL ? 'الشهر' : 'Month')
          : timeGrouping === 'quarterly'
            ? (isRTL ? 'الربع' : 'Quarter')
            : timeGrouping === 'semi_annual'
              ? (isRTL ? 'نصف السنة' : 'Half Year')
              : (isRTL ? 'السنة' : 'Year')

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'center',
          labels: {
            usePointStyle: true,
            font: {
              family: isRTL ? 'Cairo' : 'Inter'
            }
          },
          rtl: isRTL,
          textDirection: isRTL ? 'rtl' : 'ltr'
        },
        tooltip: {
          rtl: isRTL,
          textDirection: isRTL ? 'rtl' : 'ltr',
          titleFont: {
            family: isRTL ? 'Cairo' : 'Inter'
          },
          bodyFont: {
            family: isRTL ? 'Cairo' : 'Inter'
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xTitle,
            font: {
              family: isRTL ? 'Cairo' : 'Inter'
            }
          },
          ticks: {
            font: {
              family: isRTL ? 'Cairo' : 'Inter'
            }
          },
          reverse: isRTL
        },
        y: {
          beginAtZero: true,
          position: isRTL ? 'right' : 'left',
          ticks: {
            font: {
              family: isRTL ? 'Cairo' : 'Inter'
            }
          }
        }
      }
    }
  }, [chartMode, salesGrouping, timeGrouping, isRTL])

  const revenueByProjectSegments = useMemo(() => {
    const map = new Map()
    filtered.forEach(r => {
      const key = r.project || (isRTL ? 'غير معروف' : 'Unknown')
      map.set(key, (map.get(key) || 0) + (r.revenue || 0))
    })
    const baseColors = ['#3b82f6', '#10b981', '#f97316', '#a855f7', '#ef4444', '#22c55e']
    return Array.from(map.entries()).map(([label, value], idx) => ({
      label,
      value,
      color: baseColors[idx % baseColors.length]
    }))
  }, [filtered, isRTL])

  const revenueBySourceSegments = useMemo(() => {
    const map = new Map()
    filtered.forEach(r => {
      const key = r.source || (isRTL ? 'غير معروف' : 'Unknown')
      map.set(key, (map.get(key) || 0) + (r.revenue || 0))
    })
    const baseColors = ['#3b82f6', '#10b981', '#f97316', '#a855f7', '#ef4444', '#22c55e']
    return Array.from(map.entries()).map(([label, value], idx) => ({
      label,
      value,
      color: baseColors[idx % baseColors.length]
    }))
  }, [filtered, isRTL])

  const bestAchievers = useMemo(() => {
    const map = new Map()
    const processedUsers = new Set()

    // Use enrichedRecords (all records) instead of filtered to show best in tenant
    enrichedRecords.forEach(r => {
      // Apply ONLY date filter
      let byDate = true
      if (r.date) {
          const currentDate = new Date(r.date)
          const fromDate = dateFromFilter ? new Date(dateFromFilter) : null
          const toDate = dateToFilter ? new Date(dateToFilter) : null
          
          if (fromDate && currentDate < fromDate) byDate = false
          if (toDate && currentDate > toDate) byDate = false
      } else {
          // If no date (dummy row), usually we include it or not. 
          // For best achiever, dummy rows have 0 revenue anyway.
      }
      
      if (!byDate) return

      const key = r.salesperson || (isRTL ? 'غير معروف' : 'Unknown')
      const uid = r.salespersonId ? String(r.salespersonId) : key

      if (!map.has(key)) {
        // Find user to get role
        const user = usersList.find(u => String(u.id) === uid) || usersList.find(u => u.name === key)
        const role = user ? (Array.isArray(user.roles) ? user.roles[0]?.name : user.role) : ''
        
        map.set(key, { name: key, role: role || '', target: 0, revenue: 0 })
      }
      const item = map.get(key)
      item.revenue += r.revenue || 0

      // Only add target once per user
      if (!processedUsers.has(uid)) {
          processedUsers.add(uid)
          
          // Determine effective target
          let effectiveTarget = r.monthlyTarget || 0
          if (!dateFromFilter && !dateToFilter) {
              effectiveTarget = r.yearlyTarget || (r.monthlyTarget * 12) || 0
          } else if (dateFromFilter && dateToFilter) {
              const d1 = new Date(dateFromFilter)
              const d2 = new Date(dateToFilter)
              const diffTime = Math.abs(d2 - d1)
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
              if (diffDays > 40) { 
                   effectiveTarget = r.yearlyTarget || (r.monthlyTarget * 12) || 0
              }
          }
          item.target = effectiveTarget
      }
    })
    
    const list = Array.from(map.values()).map(item => ({
      ...item,
      achievement: item.target ? Math.round((item.revenue / item.target) * 100) : 0
    }))
    return list.sort((a, b) => {
      if (b.achievement !== a.achievement) return b.achievement - a.achievement
      return b.revenue - a.revenue
    }).slice(0, 5)
  }, [enrichedRecords, isRTL, dateFromFilter, dateToFilter])

  const handleExportExcel = () => {
    const rows = filtered.map(r => ({
      [isRTL ? 'موظف المبيعات' : 'Sales Person']: r.salesperson,
      [isRTL ? 'المدير' : 'Manager']: r.manager,
      [isRTL ? 'المصدر' : 'Source']: r.source,
      [isRTL ? 'المشروع' : 'Project']: r.project,
      [isRTL ? 'نوع الصفقة' : 'Deal Type']: r.dealType,
      [isRTL ? 'الحالة' : 'Status']: r.status,
      [isRTL ? 'التاريخ' : 'Date']: r.date,
      [isRTL ? 'الهدف' : 'Target']: r.target,
      [isRTL ? 'الإيرادات' : 'Revenue']: r.revenue
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'TargetsRevenue')
    const fileName = 'Targets_Revenue_Report.xlsx'
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Targets & Revenue Report',
      fileName,
      format: 'xlsx',
    })
    setShowExportMenu(false)
  }

  const handleExportPdf = () => {
    const doc = new jsPDF(isRTL ? 'p' : 'p', 'pt', 'a4')
    const tableColumn = [
      isRTL ? 'موظف المبيعات' : 'Sales Person',
      isRTL ? 'المدير' : 'Manager',
      isRTL ? 'المشروع' : 'Project',
      isRTL ? 'المصدر' : 'Source',
      isRTL ? 'نوع الصفقة' : 'Deal Type',
      isRTL ? 'الحالة' : 'Status',
      isRTL ? 'التاريخ' : 'Date',
      isRTL ? 'الهدف' : 'Target',
      isRTL ? 'الإيرادات' : 'Revenue'
    ]
    const tableRows = []

    filtered.forEach(r => {
      const rowData = [
        r.salesperson,
        r.manager,
        r.project,
        r.source,
        r.dealType,
        r.status,
        r.date,
        r.target,
        r.revenue
      ]
      tableRows.push(rowData)
    })

    doc.text(isRTL ? 'تقرير الأهداف والإيرادات' : 'Targets & Revenue Report', 40, 40, {
      align: isRTL ? 'right' : 'left'
    })
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      styles: {
        font: isRTL ? 'Cairo' : 'helvetica',
        halign: isRTL ? 'right' : 'left'
      },
      headStyles: {
        halign: isRTL ? 'right' : 'left'
      }
    })

    doc.save('Targets_Revenue_Report.pdf')
    logExportEvent({
      module: 'Targets & Revenue Report',
      fileName: 'Targets_Revenue_Report.pdf',
      format: 'pdf',
    })
    setShowExportMenu(false)
  }

  const clearFilters = () => {
    setSalesPersonFilter('all')
    setManagerFilter('all')
    setSourceFilter('all')
    setProjectFilter('all')
    setDealTypeFilter('all')
    setStatusFilter('all')
    setDateFromFilter('')
    setDateToFilter('')
  }

  const renderPieCard = (title, data, headerRight) => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0)
    return (
      <div className="group relative  dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold dark:text-white">{title}</div>
          {headerRight}
        </div>
        <div className="h-48 flex items-center justify-center">
          <PieChart
            segments={data}
            size={170}
            centerValue={total.toLocaleString()}
            centerLabel={isRTL ? 'الإيرادات' : 'Revenue'}
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {data.map(segment => (
            <div key={segment.label} className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }}></div>
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
    <div className={`p-4 md:p-6 bg-theme-bg ${isLight ? 'text-black' : 'text-white'} overflow-hidden min-w-0 max-w-[1600px] mx-auto space-y-6`}>
      <div>
        <BackButton to="/reports" />
        <h1 className="text-2xl font-bold dark:text-white mb-1 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Target size={20} />
          </span>
          {isRTL ? 'تقرير الأهداف والإيرادات' : 'Targets & Revenue'}
        </h1>
        <p className="dark:text-white/80 text-sm">
          {isRTL ? 'تتبع أهداف المبيعات والإيرادات الفعلية والإنجاز لفريقك' : 'Track sales targets, actual revenue and achievement for your team'}
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
              <ChevronDown
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
              <label className="flex items-center gap-1 text-xs font-medium dark:text-white">
                <User size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'موظف المبيعات' : 'Sales Person'}
              </label>
              <SearchableSelect value={salesPersonFilter} onChange={v => setSalesPersonFilter(v)}>
                {salespersonOptions.map(s => {
                  const val = (s && typeof s === 'object') ? s.value : s
                  const lab = (s && typeof s === 'object') ? s.label : s
                  return (
                    <option key={val} value={val}>
                      {val === 'all' ? (isRTL ? 'الكل' : 'All') : lab}
                    </option>
                  )
                })}
              </SearchableSelect>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium dark:text-white">
                <Users size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'المدير' : 'Manager'}
              </label>
              <SearchableSelect value={managerFilter} onChange={v => setManagerFilter(v)}>
                {managerOptions.map(m => {
                  const val = (m && typeof m === 'object') ? m.value : m
                  const lab = (m && typeof m === 'object') ? m.label : m
                  return (
                    <option key={val} value={val}>
                      {val === 'all' ? (isRTL ? 'الكل' : 'All') : lab}
                    </option>
                  )
                })}
              </SearchableSelect>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium dark:text-white">
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
              <label className="flex items-center gap-1 text-xs font-medium dark:text-white">
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
              <label className="flex items-center gap-1 text-xs font-medium dark:text-white">
                <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'من تاريخ' : 'Date From'}
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={dateFromFilter}
                onChange={e => setDateFromFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium dark:text-white">
                <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'إلى تاريخ' : 'Date To'}
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={dateToFilter}
                onChange={e => setDateToFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium dark:text-white">
                <Briefcase size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'نوع الصفقة' : 'Deal Type'}
              </label>
              <SearchableSelect value={dealTypeFilter} onChange={v => setDealTypeFilter(v)}>
                {dealTypeOptions.map(d => (
                  <option key={d} value={d}>
                    {d === 'all' ? (isRTL ? 'الكل' : 'All') : d}
                  </option>
                ))}
              </SearchableSelect>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium dark:text-white">
                <Target size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'الحالة' : 'Status'}
              </label>
              <SearchableSelect value={statusFilter} onChange={v => setStatusFilter(v)}>
                {statusOptions.map(s => (
                  <option key={s} value={s}>
                    {s === 'all' ? (isRTL ? 'الكل' : 'All') : s}
                  </option>
                ))}
              </SearchableSelect>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isRTL ? 'إجمالي الهدف' : 'Total Target', value: `${totalTarget.toLocaleString()} EGP`, accent: 'bg-slate-500' },
          { label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue', value: `${totalRevenue.toLocaleString()} EGP`, accent: 'bg-emerald-500' },
          { label: isRTL ? 'نسبة الإنجاز' : 'Achievement %', value: `${achievementPercent}%`, accent: 'bg-indigo-500' },
          { label: isRTL ? 'عدد الصفقات' : 'Deals Count', value: filtered.length, accent: 'bg-amber-500' }
        ].map(card => (
          <div
            key={card.label}
            className="group relative  backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden flex items-center justify-between"
          >
            <div>
              <div className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{card.label}</div>
              <div className="text-lg font-semibold">{card.value}</div>
            </div>
            <div className={`w-8 h-8 rounded-lg ${card.accent}`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="group relative   dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold dark:text-white flex items-center gap-2">
              <Target size={18} className="text-blue-500" />
              {chartMode === 'salesperson'
                ? salesGrouping === 'team'
                  ? (isRTL ? 'الأهداف والإيرادات حسب الفريق' : 'Targets & Revenue by Team')
                  : (isRTL ? 'الأهداف والإيرادات حسب موظف المبيعات' : 'Targets & Revenue by Salesperson')
                : timeGrouping === 'monthly'
                  ? (isRTL ? 'الأهداف والإيرادات حسب الشهر' : 'Targets & Revenue by Month')
                  : timeGrouping === 'quarterly'
                    ? (isRTL ? 'الأهداف والإيرادات حسب الربع' : 'Targets & Revenue by Quarter')
                    : timeGrouping === 'semi_annual'
                      ? (isRTL ? 'الأهداف والإيرادات حسب نصف السنة' : 'Targets & Revenue by Half Year')
                      : (isRTL ? 'الأهداف والإيرادات حسب السنة' : 'Targets & Revenue by Year')}
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-full p-1">
                <div ref={salesMenuRef} className="relative flex items-stretch">
                  <button
                    type="button"
                    onClick={() => {
                      setChartMode('salesperson')
                    }}
                    className={`px-3 py-1 text-xs rounded-l-full transition-colors border-r border-theme-border dark:border-gray-700/50 ${
                      chartMode === 'salesperson'
                        ? 'bg-blue-600 text-white'
                        : `${isLight ? 'text-black' : 'text-white'} dark:text-white`
                    }`}
                  >
                    {salesGrouping === 'team' ? (isRTL ? 'الفريق' : 'Team') : (isRTL ? 'موظف المبيعات' : 'Sales Person')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSalesGroupingMenu(prev => !prev)
                    }}
                    className={`px-2 py-1 text-xs rounded-r-full transition-colors ${
                      chartMode === 'salesperson'
                        ? 'bg-blue-600 text-white'
                        : `${isLight ? 'text-black' : 'text-white'} dark:text-white`
                    }`}
                  >
                    <ChevronDown
                      size={10}
                      className={`transition-transform duration-200 ${
                        showSalesGroupingMenu && chartMode === 'salesperson' ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </button>
                  {showSalesGroupingMenu && (
                    <div className="absolute top-full left-0 mt-1  dark:bg-gray-50 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-30 min-w-[140px]">
                      <button
                        type="button"
                        onClick={() => {
                          setSalesGrouping('salesperson')
                          setShowSalesGroupingMenu(false)
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(37,99,235,0.28)] dark:hover:bg-gray-700/60 ${
                          salesGrouping === 'salesperson'
                            ? 'text-blue-600 dark:text-blue-400'
                            : `${isLight ? 'text-black' : 'text-white'} dark:text-white`
                        }`}
                      >
                        {isRTL ? 'موظف المبيعات' : 'Sales Person'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSalesGrouping('team')
                          setShowSalesGroupingMenu(false)
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(37,99,235,0.28)] dark:hover:bg-gray-700/60 ${
                          salesGrouping === 'team'
                            ? 'text-blue-600 dark:text-blue-400'
                            : `${isLight ? 'text-black' : 'text-white'} dark:text-white`
                        }`}
                      >
                        {isRTL ? 'الفريق' : 'Team'}
                      </button>
                    </div>
                  )}
                </div>

                <div ref={timeMenuRef} className="relative flex items-stretch">
                  <button
                    type="button"
                    onClick={() => {
                      setChartMode('month')
                    }}
                    className={`px-3 py-1 text-xs rounded-l-full transition-colors border-r border-theme-border dark:border-gray-700/50 ${
                      chartMode === 'month'
                        ? 'bg-blue-600 text-white'
                        : `${isLight ? 'text-black' : 'text-white'} dark:text-white`
                    }`}
                  >
                    {timeGrouping === 'monthly'
                      ? (isRTL ? 'شهري' : 'Months')
                      : timeGrouping === 'quarterly'
                        ? (isRTL ? 'ربع سنوي' : 'Quarterly')
                        : timeGrouping === 'semi_annual'
                          ? (isRTL ? 'نصف سنوي' : 'Semi Annual')
                          : (isRTL ? 'سنوي' : 'Yearly')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTimeGroupingMenu(prev => !prev)
                    }}
                    className={`px-2 py-1 text-xs rounded-r-full transition-colors ${
                      chartMode === 'month'
                        ? 'bg-blue-600 text-white'
                        : `${isLight ? 'text-black' : 'text-white'} dark:text-white`
                    }`}
                  >
                    <ChevronDown
                      size={10}
                      className={`transition-transform duration-200 ${
                        showTimeGroupingMenu && chartMode === 'month' ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </button>
                  {showTimeGroupingMenu && (
                    <div className="absolute top-full left-0 mt-1  dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-30 min-w-[150px]">
                      <button
                        type="button"
                        onClick={() => {
                          setTimeGrouping('monthly')
                          setShowTimeGroupingMenu(false)
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(37,99,235,0.28)]  ${
                          timeGrouping === 'monthly'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-[var(--content-text)]dark:text-white'
                        }`}
                      >
                        {isRTL ? 'شهري' : 'Monthly'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTimeGrouping('quarterly')
                          setShowTimeGroupingMenu(false)
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(37,99,235,0.28)] ${
                          timeGrouping === 'quarterly'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-[var(--content-text)] dark:text-white'
                        }`}
                      >
                        {isRTL ? 'ربع سنوي' : 'Quarterly'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTimeGrouping('semi_annual')
                          setShowTimeGroupingMenu(false)
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(37,99,235,0.28)] ${
                          timeGrouping === 'semi_annual'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-[var(--content-text)] dark:text-white'
                        }`}
                      >
                        {isRTL ? 'نصف سنوي' : 'Semi Annual'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTimeGrouping('yearly')
                          setShowTimeGroupingMenu(false)
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(37,99,235,0.28)] ${
                          timeGrouping === 'yearly'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-[var(--content-text)] dark:text-white'
                        }`}
                      >
                        {isRTL ? 'سنوي' : 'Yearly'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="h-72 min-w-[720px]">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderPieCard(
          revenuePieMode === 'project' 
            ? (isRTL ? 'الإيرادات حسب المشروع' : 'Revenue by project')
            : (isRTL ? 'الإيرادات حسب المصدر' : 'Revenue by source'),
          revenuePieMode === 'project' ? revenueByProjectSegments : revenueBySourceSegments,
          <div className="inline-flex items-center gap-1 bg-black/5 dark:bg-gray-800/30 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => setRevenuePieMode('project')}
              className={`px-2.5 py-0.5 text-[0.7rem] rounded-full transition-colors ${
                revenuePieMode === 'project'
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--content-text)] dark:text-white'
              }`}
            >
              {isRTL ? 'المشروع' : 'Project'}
            </button>
            <button
              type="button"
              onClick={() => setRevenuePieMode('source')}
              className={`px-2.5 py-0.5 text-[0.7rem] rounded-full transition-colors ${
                revenuePieMode === 'source'
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--content-text)] dark:text-white'
              }`}
            >
              {isRTL ? 'المصدر' : 'Source'}
            </button>
          </div>
        )}

        <div className="group relative   dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-yellow-400" />
              <div className="text-sm font-semibold dark:text-white">{isRTL ? 'الأفضل أداءً' : 'The Best Achiever'}</div>
            </div>
          </div>
          <div className="space-y-2">
            {bestAchievers.map((user, index) => (
              <div
                key={user.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg  border border-white/60 dark:border-gray-700/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-semibold text-emerald-500">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium dark:text-white flex items-center gap-2">
                      {user.name}
                      {user.role && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {user.role}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted-text)]">
                      {isRTL ? 'الإيرادات' : 'Revenue'}: {user.revenue.toLocaleString()} EGP
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-emerald-500">{user.achievement}%</div>
              </div>
            ))}
            {bestAchievers.length === 0 && (
              <div className="text-xs text-[var(--muted-text)]">{isRTL ? 'لا توجد بيانات للفلاتر الحالية' : 'No data for current filters'}</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md border border-theme-border dark:border-gray-700/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme-border dark:border-gray-700/50 flex items-center justify-between">
          <h2 className={`text-lg font-bold ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'نظرة عامة على الأهداف والإيرادات' : 'Targets & Revenue Overview'}</h2>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <FaFileExport />
              {isRTL ? 'تصدير' : 'Export'}
              <ChevronDown
                className={`transform transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`}
                size={16}
              />
            </button>
            {showExportMenu && (
              <div
                className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 w-48`}
              >
                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/60 dark:text-white"
                >
                  <FaFileExcel className="text-emerald-500" />
                  <span>{isRTL ? 'تصدير إلى Excel' : 'Export to Excel'}</span>
                </button>
                <button
                  onClick={handleExportPdf}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/60 dark:text-white"
                >
                  <FaFilePdf className="text-red-500" />
                  <span>{isRTL ? 'تصدير إلى PDF' : 'Export to PDF'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4 p-4">
          {paginatedData.map(row => {
              // Determine effective target
              let effectiveTarget = row.monthlyTarget || 0
              if (!dateFromFilter && !dateToFilter) {
                  effectiveTarget = row.yearlyTarget || (row.monthlyTarget * 12) || 0
              } else if (dateFromFilter && dateToFilter) {
                  const d1 = new Date(dateFromFilter)
                  const d2 = new Date(dateToFilter)
                  const diffTime = Math.abs(d2 - d1)
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
                  if (diffDays > 40) {
                       effectiveTarget = row.yearlyTarget || (row.monthlyTarget * 12) || 0
                  }
              }

              const achievement = effectiveTarget ? Math.round((row.revenue / effectiveTarget) * 100) : 0
              
              const dealTypeLabel = {
                'Reservation': isRTL ? 'حجز' : 'Reservation',
                'Contract': isRTL ? 'عقد' : 'Contract',
                'Proposal': isRTL ? 'عرض سعر' : 'Proposal'
              }[row.dealType] || row.dealType

              const statusLabel = {
                'Closed Won': isRTL ? 'مغلق (فوز)' : 'Closed Won',
                'Closed Lost': isRTL ? 'مغلق (خسارة)' : 'Closed Lost',
                'In Progress': isRTL ? 'قيد التنفيذ' : 'In Progress'
              }[row.status] || row.status

              const statusColors = {
                  'Closed Won': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
                  'Closed Lost': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              }[row.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'

            return (
              <div key={row.id} className=" rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white text-lg`}>{row.salesperson}</h3>
                    <p className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white mt-1`}>{row.manager}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'المشروع' : 'Project'}</span>
                    <span className={`font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{row.project}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'المصدر' : 'Source'}</span>
                    <span className={`font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{row.source}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'نوع الصفقة' : 'Deal Type'}</span>
                    <span className={`font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{dealTypeLabel}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'التاريخ' : 'Date'}</span>
                    <span className={`font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{row.date}</span>
                  </div>
                </div>

                {/* Financials & Achievement */}
                <div className=" rounded-lg p-3 space-y-3">
                  <div className="flex justify-between items-center">
                      <span className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'الهدف' : 'Target'}</span>
                      <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{effectiveTarget.toLocaleString()} EGP</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'الإيرادات' : 'Revenue'}</span>
                      <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{row.revenue.toLocaleString()} EGP</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs">
                          <span className={`${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'نسبة الإنجاز' : 'Achievement'}</span>
                          <span className={`${achievement >= 100 ? 'text-emerald-600' : 'text-blue-600'} font-medium`}>{achievement}%</span>
                      </div>
                      <div className="w-full  rounded-full h-1.5 overflow-hidden">
                          <div 
                              className={`h-full rounded-full ${achievement >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(achievement, 100)}%` }}
                          />
                      </div>
                  </div>
                </div>
              </div>
            )
          })}
            {paginatedData.length === 0 && (
              <div className={`text-center py-8 ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                  {isRTL ? 'لا توجد بيانات' : 'No data'}
              </div>
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left rtl:text-right">
            <thead className="text-[0.68rem] uppercase  bg-white/5 dark:bg-white/5 dark:te text-[var(--muted-text)] dark:text-white">
              <tr>
                <th className="px-4 py-3 font-medium">{isRTL ? 'موظف المبيعات' : 'Sales Person'}</th>
                <th className="px-4 py-3 font-medium">{isRTL ? 'المدير' : 'Manager'}</th>
                <th className="px-4 py-3 font-medium">{isRTL ? 'المشروع' : 'Project'}</th>
                <th className="px-4 py-3 font-medium">{isRTL ? 'المصدر' : 'Source'}</th>
                <th className="px-4 py-3 font-medium">{isRTL ? 'نوع الصفقة' : 'Deal Type'}</th>
                <th className="px-4 py-3 font-medium">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 font-medium">{isRTL ? 'التاريخ' : 'Date'}</th>
                <th className="px-4 py-3 font-medium text-right rtl:text-left">{isRTL ? 'الهدف' : 'Target'}</th>
                <th className="px-4 py-3 font-medium text-right rtl:text-left">{isRTL ? 'الإيرادات' : 'Revenue'}</th>
                <th className="px-4 py-3 font-medium text-right rtl:text-left">{isRTL ? 'نسبة الإنجاز' : 'Achievement %'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30 dark:divide-gray-800">
              {paginatedData.map(row => {
                const achievement = row.target ? Math.round((row.revenue / row.target) * 100) : 0
                
                const dealTypeLabel = {
                  'Reservation': isRTL ? 'حجز' : 'Reservation',
                  'Contract': isRTL ? 'عقد' : 'Contract',
                  'Proposal': isRTL ? 'عرض سعر' : 'Proposal'
                }[row.dealType] || row.dealType

                const statusLabel = {
                  'Closed Won': isRTL ? 'مغلق (فوز)' : 'Closed Won',
                  'Closed Lost': isRTL ? 'مغلق (خسارة)' : 'Closed Lost',
                  'In Progress': isRTL ? 'قيد التنفيذ' : 'In Progress'
                }[row.status] || row.status

                return (
                    <tr key={row.id} className="hover:bg-white/30 dark:hover:bg-gray-900/40 transition-colors">
                      <td className={`px-4 py-3 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{row.salesperson}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{row.manager}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{row.project}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{row.source}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{dealTypeLabel}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{statusLabel}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{row.date}</td>
                      <td className={`px-4 py-3 whitespace-nowrap text-right rtl:text-left ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                        {row.target.toLocaleString()} EGP
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-right rtl:text-left ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                        {row.revenue.toLocaleString()} EGP
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-right rtl:text-left ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                        {achievement}%
                      </td>
                    </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-6 text-center text-xs text-[var(--muted-text)]"
                  >
                    {isRTL ? 'لا توجد سجلات تطابق الفلاتر الحالية' : 'No records match current filters'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-[var(--content-bg)]/80 border-t border-white/10 dark:border-gray-700/60 flex items-center justify-between gap-3">
          <div className="text-[11px] sm:text-xs text-[var(--muted-text)]">
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
    </div>
  )
}
