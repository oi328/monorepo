import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../shared/context/ThemeProvider'
import { useAppState } from '../shared/context/AppStateProvider'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { logExportEvent } from '../utils/api'
import { Users, Target, FileText, DollarSign, Filter, ChevronDown as LucideChevronDown, User, Tag, Briefcase, Calendar, Trophy, ChevronLeft, ChevronRight, Search, Eye } from 'lucide-react'
import { FaFileExport, FaFileExcel, FaFilePdf, FaChevronDown } from 'react-icons/fa'
import { PieChart } from '../shared/components/PieChart'
import { api } from '../utils/api'
import BackButton from '../components/BackButton'
import SearchableSelect from '../components/SearchableSelect'
import EnhancedLeadDetailsModal from '../shared/components/EnhancedLeadDetailsModal'
import { canExportReport } from '../shared/utils/reportPermissions'

export default function CustomersReport() {
  const { i18n } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const navigate = useNavigate()
  const isRTL = i18n.language === 'ar'
  const { user } = useAppState()
  const canExport = canExportReport(user, 'Customers Report')

  const [customers, setCustomers] = useState([])
  const [salesperson, setSalesperson] = useState('all')
  const [manager, setManager] = useState('all')
  const [source, setSource] = useState('all')
  const [project, setProject] = useState('all')
  const [convertDate, setConvertDate] = useState('')
  const [clientType, setClientType] = useState('all')
  const [actionDate, setActionDate] = useState('')
  const [showAllFilters, setShowAllFilters] = useState(true)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const exportMenuRef = useRef(null)

  // Filter options state
  const [usersList, setUsersList] = useState([])
  const [sourcesList, setSourcesList] = useState([])
  const [projectsList, setProjectsList] = useState([])

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [usersRes, sourcesRes, projectsRes] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/sources'),
          api.get('/api/projects?all=1')
        ])
        
        setUsersList(Array.isArray(usersRes.data) ? usersRes.data : [])
        setSourcesList(Array.isArray(sourcesRes.data) ? sourcesRes.data : [])
        setProjectsList(Array.isArray(projectsRes.data) ? projectsRes.data : [])
      } catch (error) {
        console.error('Failed to fetch filter options', error)
      }
    }
    fetchFilterOptions()
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchCustomers = async () => {
      try {
        const res = await api.get('/api/reports/customers', {
          params: { per_page: 500 },
        })
        const payload = res?.data
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : []

        const normalized = rows.map((c) => ({
          id: c.id,
          name: c.name || '',
          type: c.type || '',
          clientType: c.clientType || (c.company_name ? 'Company' : 'Individual'),
          manager: c.manager || '',
          source: c.source || '',
          project: c.project || '',
          phone: c.phone || '',
          email: c.email || '',
          joinedDate: c.joinedDate || c.created_at || '',
          totalRevenue: Number(c.totalRevenue ?? c.total_revenue ?? 0),
          orders: Number(c.orders ?? c.orders_count ?? 0),
          lastActivity: c.lastActivity || c.last_activity || c.updated_at || c.created_at || new Date().toISOString(),
          salesperson: c.salesperson || c.sales_person || '',
          invoicePaidTotal: Number(c.invoicePaidTotal ?? 0),
          invoicePartialTotal: Number(c.invoicePartialTotal ?? 0),
          invoiceUnpaidTotal: Number(c.invoiceUnpaidTotal ?? 0),
          quotationTotal: Number(c.quotationTotal ?? 0),
          quotationConverted: Number(c.quotationConverted ?? 0),
          quotationPending: Number(c.quotationPending ?? 0),
          quotationLost: Number(c.quotationLost ?? 0),
        }))

        if (!cancelled) {
          setCustomers(normalized)
        }
      } catch (error) {
        console.error('Failed to load customers report data', error)
        if (!cancelled) {
          setCustomers([])
        }
      }
    }

    fetchCustomers()

    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const spOk = salesperson === 'all' || c.salesperson === salesperson
      const mgrOk = manager === 'all' || c.manager === manager
      const srcOk = source === 'all' || c.source === source
      const prjOk = project === 'all' || c.project === project
      const typeOk = clientType === 'all' || c.clientType === clientType
      
      const convOk = !convertDate || c.joinedDate === convertDate
      const actOk = !actionDate || c.lastActivity === actionDate

      return spOk && mgrOk && srcOk && prjOk && typeOk && convOk && actOk
    })
  }, [customers, salesperson, manager, source, project, clientType, convertDate, actionDate])

  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(filtered.length / entriesPerPage))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage
    return filtered.slice(start, start + entriesPerPage)
  }, [filtered, currentPage, entriesPerPage])

  const isActive = (c) => {
    const last = c.lastActivity ? new Date(c.lastActivity) : null
    if (!last || Number.isNaN(last.getTime())) return false
    const now = new Date()
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24))
    return diffDays <= 60
  }

  const totalCustomers = filtered.length
  const totalRevenue = filtered.reduce((s, c) => s + (c.totalRevenue || 0), 0)
  const activeCount = filtered.reduce((s, c) => s + (isActive(c) ? 1 : 0), 0)
  const inactiveCount = Math.max(0, totalCustomers - activeCount)
  const totalSalesOrders = filtered.reduce((s, c) => s + (c.orders || 0), 0)
  const totalInvoices = totalSalesOrders
  const totalOpportunities = totalCustomers * 2
  const totalQuotations = totalCustomers
  const top5 = [...filtered].sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0)).slice(0, 5)

  const quotationsSegments = useMemo(() => {
    const converted = filtered.reduce((s, c) => s + (c.quotationConverted || 0), 0)
    const pending = filtered.reduce((s, c) => s + (c.quotationPending || 0), 0)
    const lost = filtered.reduce((s, c) => s + (c.quotationLost || 0), 0)
    const total = converted + pending + lost

    if (!total) {
      return [
        { label: isRTL ? 'محول' : 'Converted', value: 0, color: '#22c55e', pct: 0 },
        { label: isRTL ? 'قيد الانتظار' : 'Pending', value: 0, color: '#facc15', pct: 0 },
        { label: isRTL ? 'مفقود / ملغى' : 'Lost / Cancelled', value: 0, color: '#ef4444', pct: 0 },
      ]
    }

    return [
      { label: isRTL ? 'محول' : 'Converted', value: converted, color: '#22c55e', pct: Math.round((converted / total) * 100) },
      { label: isRTL ? 'قيد الانتظار' : 'Pending', value: pending, color: '#facc15', pct: Math.round((pending / total) * 100) },
      { label: isRTL ? 'مفقود / ملغى' : 'Lost / Cancelled', value: lost, color: '#ef4444', pct: Math.round((lost / total) * 100) },
    ]
  }, [filtered, isRTL])

  const invoicesSegments = useMemo(() => {
    const paid = filtered.reduce((s, c) => s + (c.invoicePaidTotal || 0), 0)
    const partial = filtered.reduce((s, c) => s + (c.invoicePartialTotal || 0), 0)
    const unpaid = filtered.reduce((s, c) => s + (c.invoiceUnpaidTotal || 0), 0)
    const total = paid + partial + unpaid

    if (!total) {
      return [
        { label: isRTL ? 'مدفوع' : 'Paid', value: 0, color: '#22c55e', pct: 0 },
        { label: isRTL ? 'مدفوع جزئياً' : 'Partially Paid', value: 0, color: '#0ea5e9', pct: 0 },
        { label: isRTL ? 'غير مدفوع' : 'Unpaid', value: 0, color: '#ef4444', pct: 0 },
      ]
    }

    return [
      { label: isRTL ? 'مدفوع' : 'Paid', value: paid, color: '#22c55e', pct: Math.round((paid / total) * 100) },
      { label: isRTL ? 'مدفوع جزئياً' : 'Partially Paid', value: partial, color: '#0ea5e9', pct: Math.round((partial / total) * 100) },
      { label: isRTL ? 'غير مدفوع' : 'Unpaid', value: unpaid, color: '#ef4444', pct: Math.round((unpaid / total) * 100) },
    ]
  }, [filtered, isRTL])

  const revenueSegments = useMemo(() => {
    const total = totalRevenue || 0
    if (!total) {
      return [
        { label: isRTL ? 'المنتج أ' : 'Product A', value: 0, color: '#22c55e', pct: 0 },
        { label: isRTL ? 'المنتج ب' : 'Product B', value: 0, color: '#3b82f6', pct: 0 },
        { label: isRTL ? 'أخرى' : 'Other', value: 0, color: '#a855f7', pct: 0 },
      ]
    }

    const productA = total * 0.4
    const productB = total * 0.35
    const other = Math.max(0, total - productA - productB)

    return [
      { label: isRTL ? 'المنتج أ' : 'Product A', value: productA, color: '#22c55e', pct: Math.round((productA / total) * 100) },
      { label: isRTL ? 'المنتج ب' : 'Product B', value: productB, color: '#3b82f6', pct: Math.round((productB / total) * 100) },
      { label: isRTL ? 'أخرى' : 'Other', value: other, color: '#a855f7', pct: Math.round((other / total) * 100) },
    ]
  }, [totalRevenue, isRTL])

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

  const clearFilters = () => {
    setSalesperson('all')
    setManager('all')
    setSource('all')
    setProject('all')
    setConvertDate('')
    setClientType('all')
    setActionDate('')
    setCurrentPage(1)
  }

  const exportExcel = () => {
    if (!canExport) return
    const rows = filtered.map(c => ({
      [isRTL ? 'الاسم' : 'Name']: c.name,
      [isRTL ? 'النوع' : 'Type']: c.type,
      [isRTL ? 'الهاتف' : 'Phone']: c.phone,
      [isRTL ? 'البريد الإلكتروني' : 'Email']: c.email,
      [isRTL ? 'تاريخ الانضمام' : 'Joined']: c.joinedDate,
      [isRTL ? 'إجمالي الإيرادات (ج.م)' : 'TotalRevenueEGP']: c.totalRevenue,
      [isRTL ? 'الطلبات' : 'Orders']: c.orders,
      [isRTL ? 'آخر نشاط' : 'LastActivity']: c.lastActivity,
      [isRTL ? 'مسؤول المبيعات' : 'Salesperson']: c.salesperson,
      [isRTL ? 'الحالة' : 'Status']: isActive(c) ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Customers')
    const fileName = 'customers_report.xlsx'
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Customers Report',
      fileName,
      format: 'xlsx',
    })
    setShowExportMenu(false)
  }

  const exportPdf = async () => {
    if (!canExport) return
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = await import('jspdf-autotable')
      const doc = new jsPDF()

      const tableColumn = [
        isRTL ? 'اسم العميل' : 'Customer Name',
        isRTL ? 'النوع' : 'Type',
        isRTL ? 'جهة الاتصال' : 'Contact',
        isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
        isRTL ? 'الطلبات' : 'Orders',
        isRTL ? 'آخر نشاط' : 'Last Activity',
        isRTL ? 'الحالة' : 'Status',
        isRTL ? 'مسؤول المبيعات' : 'Salesperson'
      ]
      const tableRows = []

      filtered.forEach(c => {
        const rowData = [
          c.name,
          c.type,
          `${c.phone} / ${c.email}`,
          c.totalRevenue.toLocaleString(),
          c.orders,
          new Date(c.lastActivity).toLocaleDateString(),
          isActive(c) ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive'),
          c.salesperson
        ]
        tableRows.push(rowData)
      })

      doc.text(isRTL ? 'تقرير العملاء' : 'Customers Report', 14, 15)
      autoTable.default(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { font: 'helvetica', fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      })
      doc.save('customers_report.pdf')
      logExportEvent({
        module: 'Customers Report',
        fileName: 'customers_report.pdf',
        format: 'pdf',
      })
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export PDF Error:', error)
    }
  }

  const statusBadge = (active) => (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'}`}>
      {active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
    </span>
  )

  const kpiCards = [
    {
      label: isRTL ? 'إجمالي العملاء' : 'Total Customers',
      value: totalCustomers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      label: isRTL ? 'إجمالي الفرص' : 'Total Opportunities',
      value: totalOpportunities.toLocaleString(),
      icon: Target,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      label: isRTL ? 'إجمالي عروض الأسعار' : 'Total Quotations',
      value: totalQuotations.toLocaleString(),
      icon: FileText,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20'
    },
    {
      label: isRTL ? 'إجمالي أوامر البيع' : 'Total Sales Orders',
      value: totalSalesOrders.toLocaleString(),
      icon: FileText,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20'
    },
    {
      label: isRTL ? 'إجمالي الفواتير' : 'Total Invoices',
      value: totalInvoices.toLocaleString(),
      icon: FileText,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20'
    },
    {
      label: isRTL ? 'إجمالي الإيرادات (ج.م)' : 'Total Revenue (EGP)',
      value: totalRevenue.toLocaleString(),
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    }
  ]

  return (
    <div className="p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] overflow-hidden min-w-0">
      <div className="mb-6">
        <BackButton to="/reports" />
        <h1 className={`text-2xl font-bold ${isLight ? 'text-black' : 'text-white'} mb-2`}>
          {isRTL ? 'تقرير العملاء' : 'Customers Report'}
        </h1>
        <p className={`${isLight ? 'text-black' : 'text-white'} text-sm`}>
          {isRTL ? 'تحليل العملاء والإيرادات والأنشطة' : 'Analyze your customers, revenue and activities'}
        </p>
      </div>

      <div className=" backdrop-blur-md rounded-2xl shadow-sm border border-theme-border dark:border-gray-700/50 p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <div className={`flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'} font-semibold`}>
            <Filter size={20} className="text-blue-400" />
            <h3>{isRTL ? 'تصفية' : 'Filter'}</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllFilters(prev => !prev)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              {showAllFilters ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض الكل' : 'Show All')}
              <LucideChevronDown size={12} className={`transform transition-transform duration-300 ${showAllFilters ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <button
              onClick={clearFilters}
              className={`px-3 py-1.5 text-sm ${isLight ? 'text-black' : 'text-white'} hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors`}
            >
              {isRTL ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                {isRTL ? 'مسؤول المبيعات' : 'Salesperson'}
              </label>
              <SearchableSelect
                value={salesperson}
                onChange={(v) => {
                  setSalesperson(v)
                  setCurrentPage(1)
                }}
                className="min-w-[160px]"
              >
                <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.name || u.email}>{u.name || u.email}</option>
                ))}
              </SearchableSelect>
            </div>
            <div className="space-y-1">
              <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                {isRTL ? 'المدير' : 'Manager'}
              </label>
              <SearchableSelect
                value={manager}
                onChange={(v) => {
                  setManager(v)
                  setCurrentPage(1)
                }}
                className="min-w-[160px]"
              >
                <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.name || u.email}>{u.name || u.email}</option>
                ))}
              </SearchableSelect>
            </div>
            <div className="space-y-1">
              <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                {isRTL ? 'المصدر' : 'Source'}
              </label>
              <SearchableSelect
                value={source}
                onChange={(v) => {
                  setSource(v)
                  setCurrentPage(1)
                }}
                className="min-w-[160px]"
              >
                <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                {sourcesList.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </SearchableSelect>
            </div>
            <div className="space-y-1">
              <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                {isRTL ? 'المشروع' : 'Project'}
              </label>
              <SearchableSelect
                value={project}
                onChange={(v) => {
                  setProject(v)
                  setCurrentPage(1)
                }}
                className="min-w-[160px]"
              >
                <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                {projectsList.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </SearchableSelect>
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 ease-in-out overflow-hidden ${showAllFilters ? 'max-h-[200px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-1">
              <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                {isRTL ? 'تاريخ التحويل' : 'Convert Date'}
              </label>
              <input
                type="date"
                value={convertDate}
                onChange={e => {
                  setConvertDate(e.target.value)
                  setCurrentPage(1)
                }}
                className={`w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-transparent ${isLight ? 'text-black' : 'text-white'} focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
            </div>
            <div className="space-y-1">
              <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                {isRTL ? 'نوع العميل' : 'Customer Type'}
              </label>
              <SearchableSelect
                value={clientType}
                onChange={(v) => {
                  setClientType(v)
                  setCurrentPage(1)
                }}
                className="min-w-[160px]"
              >
                <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                <option value="Individual">{isRTL ? 'فرد' : 'Individual'}</option>
                <option value="Company">{isRTL ? 'شركة' : 'Company'}</option>
              </SearchableSelect>
            </div>
            <div className="space-y-1">
              <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                {isRTL ? 'تاريخ الإجراء' : 'Action Date'}
              </label>
              <input
                type="date"
                value={actionDate}
                onChange={e => {
                  setActionDate(e.target.value)
                  setCurrentPage(1)
                }}
                className={`w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-transparent ${isLight ? 'text-black' : 'text-white'} focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {kpiCards.map((card, idx) => {
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
                  <h3 className={`${isLight ? 'text-black' : 'text-white'} text-sm font-semibold opacity-80`}>
                    {card.label}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {[
          {
            title: isRTL ? 'عروض الأسعار' : 'Quotations',
            totalLabel: isRTL ? 'إجمالي عروض الأسعار' : 'Total Quotations',
            total: totalQuotations,
            segments: quotationsSegments
          },
          {
            title: isRTL ? 'الفواتير' : 'Invoices',
            totalLabel: isRTL ? 'إجمالي الفواتير' : 'Total Invoices',
            total: totalInvoices,
            segments: invoicesSegments
          },
          {
            title: isRTL ? 'الإيرادات' : 'Revenue',
            totalLabel: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
            total: totalRevenue,
            segments: revenueSegments
          }
        ].map(card => (
          <div
            key={card.title}
            className="group relative  backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
        <div className={`text-sm font-semibold mb-2 ${isLight ? 'text-black' : 'text-white'} text-center md:text-left`}>
              {card.title}
            </div>
            <div className="h-48 flex items-center justify-center">
              <PieChart
                segments={card.segments}
                size={170}
                centerValue={card.total}
                centerLabel={card.totalLabel}
              />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {card.segments.map(segment => (
                <div key={segment.label} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className={`${isLight ? 'text-black' : 'text-white'}`}>
                    {segment.label}: {segment.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className=" backdrop-blur-md border border-theme-border dark:border-gray-700/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme-border dark:border-gray-700/50 flex items-center justify-between">
          <h2 className={`text-lg font-bold ${isLight ? 'text-black' : 'text-white'}`}>
            {isRTL ? 'العملاء' : 'Customers'}
          </h2>
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
                <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-1  rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 w-48`}>
                  <button
                    onClick={exportExcel}
                    className={`w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}
                  >
                    <FaFileExcel className="text-green-600" /> {isRTL ? 'تصدير كـ Excel' : 'Export to Excel'}
                  </button>
                  <button
                    onClick={exportPdf}
                    className={`w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}
                  >
                    <FaFilePdf className="text-red-600" /> {isRTL ? 'تصدير كـ PDF' : 'Export to PDF'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4">
          {/* Mobile View - Cards */}
          <div className="md:hidden space-y-4">
            {paginatedRows.map(c => (
              <div key={c.id} className=" rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-semibold ${isLight ? 'text-black' : 'text-white'} text-lg`}>{c.name}</h3>
                    <span className={`text-xs ${isLight ? 'text-black' : 'text-white'}`}>{c.type}</span>
                  </div>
                  <div>{statusBadge(isActive(c))}</div>
                </div>
                
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {/* Contact Info */}
                  <div className="flex flex-col gap-1 p-2  rounded-lg">
                    <div className={`flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}>
                        <span className="text-xs">{isRTL ? 'الهاتف' : 'Phone'}:</span>
                        <span className="font-medium dir-ltr">{c.phone}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'} `}>
                        <span className="text-xs">{isRTL ? 'البريد' : 'Email'}:</span>
                        <span className="font-medium break-all">{c.email}</span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-1">
                      <div className="flex flex-col">
                          <span className={`text-xs ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}</span>
                          <span className={`font-medium ${isLight ? 'text-black' : 'text-white'}`}>{c.totalRevenue.toLocaleString()} EGP</span>
                      </div>
                      <div className="flex flex-col">
                          <span className={`text-xs ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'الطلبات' : 'Orders'}</span>
                          <span className={`font-medium ${isLight ? 'text-black' : 'text-white'}`}>{c.orders}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className={`text-xs ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'آخر نشاط' : 'Last Activity'}</span>
                          <span className={`font-medium ${isLight ? 'text-black' : 'text-white'}`}>{new Date(c.lastActivity).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className={`text-xs ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'مسؤول المبيعات' : 'Salesperson'}</span>
                          <span className={`font-medium ${isLight ? 'text-black' : 'text-white'}`}>{c.salesperson}</span>
                      </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
                <div className={`text-center py-8 ${isLight ? 'text-black' : 'text-white'}`}>
                    {isRTL ? 'لا توجد بيانات' : 'No data'}
                </div>
            )}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm nova-table nova-table--glass">
            <thead className={`bg-gray-700/50 ${isLight ? 'text-black' : 'text-white'}`}>
              <tr className="text-left bg-[var(--table-header-bg)]">
                <th className="px-3 py-2">{isRTL ? 'اسم العميل' : 'Customer Name'}</th>
                <th className="px-3 py-2">{isRTL ? 'النوع' : 'Type'}</th>
                <th className="px-3 py-2">{isRTL ? 'جهة الاتصال' : 'Contact'}</th>
                <th className="px-3 py-2">{isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}</th>
                <th className="px-3 py-2">{isRTL ? 'الطلبات' : 'Orders'}</th>
                <th className="px-3 py-2">{isRTL ? 'آخر نشاط' : 'Last Activity'}</th>
                <th className="px-3 py-2">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="px-3 py-2">{isRTL ? 'مسؤول المبيعات' : 'Salesperson'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border dark:divide-gray-700/50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-[var(--muted-text)]">{isRTL ? 'لا توجد بيانات' : 'No data'}</td>
                </tr>
              )}
              {filtered.length > 0 && paginatedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-[var(--muted-text)]"
                  >
                    {isRTL ? 'لا توجد نتائج' : 'No results'}
                  </td>
                </tr>
              )}
              {paginatedRows.map(c => (
                <tr key={c.id} className="border-t border-[var(--table-row-border)] odd:bg-[var(--table-row-bg)] hover:bg-[var(--table-row-hover)] transition-colors">
                  <td className={`px-3 py-2 font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                    {c.name}
                  </td>
                  <td className="px-3 py-2">{c.type}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span>{c.phone}</span>
                      <span className="text-[var(--muted-text)]">{c.email}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{c.totalRevenue.toLocaleString()} EGP</td>
                  <td className="px-3 py-2">{c.orders}</td>
                  <td className="px-3 py-2">{new Date(c.lastActivity).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{statusBadge(isActive(c))}</td>
                  <td className="px-3 py-2">{c.salesperson}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
          <div className="px-6 py-3 border-t border-theme-border dark:border-gray-700/60 flex sm:flex-row items-center justify-between gap-3">
            <div className={`text-[11px] sm:text-xs ${isLight ? 'text-black' : 'text-white'} opacity-70`}>
            {isRTL
              ? `إظهار ${Math.min((currentPage - 1) * entriesPerPage + 1, filtered.length)}-${Math.min(currentPage * entriesPerPage, filtered.length)} من ${filtered.length}`
              : `Showing ${Math.min((currentPage - 1) * entriesPerPage + 1, filtered.length)}-${Math.min(currentPage * entriesPerPage, filtered.length)} of ${filtered.length}`}
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
