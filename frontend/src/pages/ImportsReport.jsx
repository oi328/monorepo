import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useNavigate } from 'react-router-dom'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { FileText, CheckCircle2, XCircle, Filter, Calendar, ChevronDown, ChevronLeft, ChevronRight, Eye, Download } from 'lucide-react'
import { FaFileExport, FaFileExcel, FaFilePdf } from 'react-icons/fa'
import { PieChart } from '../shared/components/PieChart'
import * as XLSX from 'xlsx'
import { api, logExportEvent } from '../utils/api'
import BackButton from '../components/BackButton'
import { useTheme } from '@shared/context/ThemeProvider'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const ImportsReport = () => {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { t } = useTranslation()

  const navigate = useNavigate()
  const isRTL = i18n.dir() === 'rtl'

  const [logs, setLogs] = useState([])

  const [managerFilter, setManagerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [datePreset, setDatePreset] = useState('year')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)
  const exportMenuRef = useRef(null)

  const managers = useMemo(() => Array.from(new Set(logs.map(l => l.manager))), [logs])

  const latestDate = useMemo(() => {
    if (!logs.length) return new Date()
    const timestamps = logs.map(l => new Date(l.dateTime).getTime())
    return new Date(Math.max(...timestamps))
  }, [logs])

  const isSameDay = (a, b) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
  const isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  const isSameYear = (a, b) => a.getFullYear() === b.getFullYear()

  const matchDatePreset = (dateString) => {
    const dt = new Date(dateString)
    if (datePreset === 'today') return isSameDay(dt, latestDate)
    if (datePreset === 'week') {
      const diffMs = latestDate.getTime() - dt.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      return diffDays <= 7 && diffDays >= 0
    }
    if (datePreset === 'month') return isSameMonth(dt, latestDate)
    if (datePreset === 'year') return isSameYear(dt, latestDate)
    return true
  }

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const mOk = managerFilter === 'all' || l.manager === managerFilter
      const timeOk = matchDatePreset(l.dateTime)
      return mOk && timeOk
    })
  }, [logs, managerFilter, datePreset, latestDate])

  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(filtered.length / entriesPerPage))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage
    return filtered.slice(start, start + entriesPerPage)
  }, [filtered, currentPage, entriesPerPage])

  const totalImports = filtered.length
  const successful = filtered.filter(l => l.status === 'Success').length
  const failed = filtered.filter(l => l.status === 'Failed').length

  const importsPerManager = useMemo(() => {
    const map = new Map()
    filtered.forEach(l => {
      map.set(l.manager, (map.get(l.manager) || 0) + 1)
    })
    return map
  }, [filtered])

  const statusDist = useMemo(
    () => ({
      Success: successful,
      Failed: failed
    }),
    [successful, failed]
  )

  const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status === 'Success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
      {status === 'Success' ? (isRTL ? 'ناجح' : 'Success') : (isRTL ? 'فشل' : 'Failed')}
    </span>
  )

  const dateOptions = [
    { value: 'today', label: isRTL ? 'اليوم' : 'Today' },
    { value: 'week', label: isRTL ? 'أسبوعيًا' : 'Weekly' },
    { value: 'month', label: isRTL ? 'شهريًا' : 'Monthly' },
    { value: 'year', label: isRTL ? 'سنويًا' : 'Yearly' }
  ]

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/api/exports', {
          params: {
            per_page: 1000,
            action: 'import'
          },
        })
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        const imported = data.filter((row, index) => {
          const action = row.action || 'export'
          return action === 'import'
        })
        const mapped = imported.map((row, index) => {
          const ts = row.created_at || row.updated_at || null
          return {
            id: row.id ?? index + 1,
            fileName: row.file_name || '-',
            type: row.module || 'Import',
            performedBy: row.user?.name || row.user_name || '-',
            manager: row.user?.name || row.user_name || '-',
            dateTime: ts,
            status: row.status === 'success' ? 'Success' : 'Failed',
            error: row.error_message || '',
          }
        })

        setLogs(mapped)
      } catch (e) {
        console.error('Failed to fetch import logs', e)
        setLogs([])
      }
    }

    fetchLogs()
  }, [])

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
    setManagerFilter('all')
    setDatePreset('year')
    setCurrentPage(1)
  }

  const exportToPdf = async () => {
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = await import('jspdf-autotable')
      const doc = new jsPDF()

      const tableColumn = [
        isRTL ? 'اسم الملف' : 'File Name',
        isRTL ? 'الحالة' : 'Status',
        isRTL ? 'تمت بواسطة' : 'Action By',
        isRTL ? 'تاريخ الإجراء' : 'Action Date',
        isRTL ? 'وصف الخطأ' : 'Error Description'
      ]
      const tableRows = []

      filtered.forEach(l => {
        const rowData = [
          l.fileName,
          l.status,
          `${l.performedBy} (${l.manager})`,
          new Date(l.dateTime).toLocaleString(),
          l.error || '—'
        ]
        tableRows.push(rowData)
      })

      doc.text(isRTL ? 'تقرير الواردات' : 'Imports Report', 14, 15)
      autoTable.default(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { font: 'Amiri-Regular', fontSize: 8, halign: isRTL ? 'right' : 'left' },
        headStyles: { fillColor: [66, 139, 202], halign: isRTL ? 'right' : 'left' }
      })
      doc.save('imports_report.pdf')
      logExportEvent({
        module: 'Imports Report',
        fileName: 'imports_report.pdf',
        format: 'pdf',
      })
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export PDF Error:', error)
    }
  }

  const handleExport = () => {
    const wb = XLSX.utils.book_new()
    const wsData = filtered.map(l => ({
      [isRTL ? 'اسم الملف' : 'File Name']: l.fileName,
      [isRTL ? 'الحالة' : 'Status']: l.status,
      [isRTL ? 'تمت بواسطة' : 'Action By']: `${l.performedBy} (${l.manager})`,
      [isRTL ? 'تاريخ الإجراء' : 'Action Date']: new Date(l.dateTime).toLocaleString(),
      [isRTL ? 'وصف الخطأ' : 'Error Description']: l.error || '—'
    }))
    const ws = XLSX.utils.json_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Imports')
    const fileName = 'Imports_Report.xlsx'
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Imports Report',
      fileName,
      format: 'xlsx',
    })
    setShowExportMenu(false)
  }

  const kpiCards = [
    {
      title: isRTL ? 'إجمالي الواردات' : 'Total Imports',
      value: totalImports,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: isRTL ? 'الواردات الناجحة' : 'Successful Imports',
      value: successful,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    {
      title: isRTL ? 'الواردات الفاشلة' : 'Failed Imports',
      value: failed,
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    }
  ]

  return (
    <div className="p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] overflow-hidden min-w-0">
      <div className="mb-6">
        <BackButton to="/reports" />
        <h1 className="text-2xl font-bold dark:text-white mb-2">
          {isRTL ? 'تقرير الواردات' : 'Imports Report'}
        </h1>
        <p className="dark:text-white text-sm">
          {isRTL ? 'راقب كل عمليات استيراد البيانات ومشاكلها' : 'Monitor all data import operations and issues'}
        </p>
      </div>

      <div className="bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md rounded-2xl shadow-sm border border-theme-border dark:border-gray-700/50 p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 dark:text-white font-semibold">
            <Filter size={20} className="text-blue-500 dark:text-blue-400" />
            <h3>{isRTL ? 'تصفية' : 'Filter'}</h3>
          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm dark:text-white hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              {isRTL ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium dark:text-white">
                {isRTL ? 'المدير' : 'Manager'}
              </label>
              <select
                value={managerFilter}
                onChange={(e) => {
                  setManagerFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-transparent"
              >
                <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                {managers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium dark:text-white">
                {isRTL ? 'الحالة' : 'Status'}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-transparent"
              >
                <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                <option value="Success">{isRTL ? 'ناجح' : 'Success'}</option>
                <option value="Failed">{isRTL ? 'فشل' : 'Failed'}</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium dark:text-white">
                <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'تاريخ الإجراء' : 'Action Date'}
              </label>
              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-transparent"
              >
                {dateOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {kpiCards.map((card, idx) => {
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
                  <h3 className="dark:text-white text-sm font-semibold opacity-80">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md border border-theme-border dark:border-gray-700/50 shadow-sm p-4 rounded-2xl">
          <div className="text-sm font-medium mb-2 dark:text-white">
            {isRTL ? 'كمية الواردات لكل مدير' : 'Imports Quantity per Manager'}
          </div>
          <div className="h-[260px]">
            <Bar
              data={{
                labels: Array.from(importsPerManager.keys()),
                datasets: [
                  {
                    label: isRTL ? 'الواردات' : 'Imports',
                    data: Array.from(importsPerManager.values()),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderRadius: 6,
                    maxBarThickness: 40,
                    categoryPercentage: 0.6,
                    barPercentage: 0.7
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    ticks: {
                      autoSkip: false,
                      maxRotation: 0,
                      minRotation: 0,
                      font: { family: isRTL ? 'Amiri-Regular' : undefined }
                    },
                    title: {
                      display: true,
                      text: isRTL ? 'المدير' : 'Manager',
                      font: { family: isRTL ? 'Amiri-Regular' : undefined }
                    },
                    position: isRTL ? 'right' : 'left',
                    reverse: isRTL
                  },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                      precision: 0,
                      callback: (v) => `${v}`
                    },
                    title: {
                      display: true,
                      text: isRTL ? 'الواردات' : 'Imports',
                      font: { family: isRTL ? 'Amiri-Regular' : undefined }
                    },
                    position: isRTL ? 'right' : 'left'
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="  backdrop-blur-md border border-theme-border dark:border-gray-700/50 dark:border-gray-700/50 shadow-sm p-4 rounded-2xl">
          <div className="text-sm font-medium mb-2 dark:text-white">
            {isRTL ? 'الناجحة / الفاشلة' : 'Success & Fail'}
          </div>
          <div className="h-[260px] flex flex-col items-center justify-center">
            <div className="flex-1 flex items-center justify-center">
              <PieChart
                segments={[
                  { label: isRTL ? 'ناجح' : 'Success', value: statusDist.Success, color: '#10b981' },
                  { label: isRTL ? 'فشل' : 'Failed', value: statusDist.Failed, color: '#ef4444' }
                ]}
                size={170}
                centerValue={totalImports}
                centerLabel={isRTL ? 'إجمالي الواردات' : 'Total Imports'}
              />
            </div>
            <div className="mt-4 w-full flex items-center justify-between gap-4 text-xs md:text-sm">
              <div className="inline-flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[var(--content-text)] dark:text-white">
                  {isRTL ? 'ناجح' : 'Success'}: {statusDist.Success}
                  {totalImports > 0 && (
                    <> ({Math.round((statusDist.Success / totalImports) * 100)}%)</>
                  )}
                </span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[var(--content-text)] dark:text-white">
                  {isRTL ? 'فشل' : 'Failed'}: {statusDist.Failed}
                  {totalImports > 0 && (
                    <> ({Math.round((statusDist.Failed / totalImports) * 100)}%)</>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-theme-bg dark:bg-gray-800/30 backdrop-blur-md border border-theme-border dark:border-gray-700/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme-border dark:border-gray-700/50 flex items-center justify-between">
          <h2 className={`text-lg font-bold ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
            {isRTL ? 'قائمة الواردات' : 'Imports List'}
          </h2>
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <FaFileExport /> {isRTL ? 'تصدير' : 'Export'}
              <ChevronDown className={`transform transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} size={12} />
            </button>

            {showExportMenu && (
              <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-1 bg-white dark:bg-[#172554] rounded-lg shadow-xl border border-gray-100 dark:border-[#1e3a8a] py-1 z-50 w-48`}>
                <button
                  onClick={handleExport}
                  className="w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-blue-900/50 flex items-center gap-2 dark:text-white"
                >
                  <FaFileExcel className="text-green-600" /> {isRTL ? 'تصدير كـ Excel' : 'Export to Excel'}
                </button>
                <button
                  onClick={exportToPdf}
                  className="w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-blue-900/50 flex items-center gap-2 dark:text-white"
                >
                  <FaFilePdf className="text-red-600" /> {isRTL ? 'تصدير كـ PDF' : 'Export to PDF'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4 p-4">
          {paginatedRows.map(row => (
            <div key={row.id} className=" rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white text-lg`}>{row.fileName}</h3>
                  <p className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white mt-1`}>{row.type}</p>
                </div>
                <StatusBadge status={row.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'تمت بواسطة' : 'Action By'}</span>
                  <div className={`font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                    <div>{row.performedBy}</div>
                    <div className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{row.manager}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'تاريخ الإجراء' : 'Action Date'}</span>
                  <span className={`font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`} dir="ltr">{new Date(row.dateTime).toLocaleString()}</span>
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <span className={`text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{isRTL ? 'وصف الخطأ' : 'Error'}</span>
                  <span className={`font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white truncate`}>{row.error || '—'}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => setPreviewItem(row)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors"
                >
                  <Eye size={16} />
                  {isRTL ? 'معاينة' : 'Preview'}
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors">
                  <Download size={16} />
                  {isRTL ? 'تحميل' : 'Download'}
                </button>
              </div>
            </div>
          ))}
          {paginatedRows.length === 0 && (
            <div className={`text-center py-8 ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
              {isRTL ? 'لا توجد بيانات' : 'No data available'}
            </div>
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right dark:text-white">
            <thead className="text-xs dark:text-white uppercase bg-gray-50/50 dark:bg-gray-700/50 dark:text-white">
              <tr>
                <th className="px-4 py-3 text-start">{isRTL ? 'اسم الملف' : 'File Name'}</th>
                <th className="px-4 py-3 text-start">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 text-start">{isRTL ? 'النوع' : 'Type'}</th>
                <th className="px-4 py-3 text-start">{isRTL ? 'تمت بواسطة' : 'Action By'}</th>
                <th className="px-4 py-3 text-start">{isRTL ? 'تاريخ الإجراء' : 'Action Date'}</th>
                <th className="px-4 py-3 text-start">{isRTL ? 'اخطاء' : 'error'}</th>
                <th className="px-4 py-3 text-start">{isRTL ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="border-b dark:border-gray-700/50 hover:bg-white/5 dark:hover:bg-white/5 transition-colors">
                    <td className={`px-4 py-3 font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white whitespace-nowrap`}>
                      {row.fileName}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className={`px-4 py-3 ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>{row.type}</td>
                    <td className={`px-4 py-3 ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                      <div>
                        <div className="font-medium">{row.performedBy}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{row.manager}</div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${isLight ? 'text-black' : 'text-white'} dark:text-white`} dir="ltr">
                      {new Date(row.dateTime).toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 max-w-xs truncate ${isLight ? 'text-black' : 'text-white'} dark:text-white`} title={row.error}>
                      {row.error || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setPreviewItem(row)}
                          className="hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400 transition-colors p-1" 
                          title={isRTL ? 'معاينة' : 'Preview'}
                        >
                          <Eye size={16} />
                        </button>
                        <button className="hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400 transition-colors p-1" title={isRTL ? 'تحميل' : 'Download'}>
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-4 py-8 text-center ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                    {isRTL ? 'لا توجد بيانات' : 'No data available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-[var(--content-bg)]/80 border-t border-white/10 dark:border-gray-700/60 flex items-center justify-between gap-3">
          <div className="text-[11px] sm:text-xs text-[var(--muted-text)]">
            {isRTL
              ? `إظهار ${Math.min((currentPage - 1) * entriesPerPage + 1, totalImports)}-${Math.min(currentPage * entriesPerPage, totalImports)} من ${totalImports}`
              : `Showing ${Math.min((currentPage - 1) * entriesPerPage + 1, totalImports)}-${Math.min(currentPage * entriesPerPage, totalImports)} of ${totalImports}`}
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
              <span className={`text-[10px] sm:text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-gray-400 whitespace-nowrap`}>
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

      {previewItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setPreviewItem(null)}
          />
          <div className="card relative z-10 w-full max-w-2xl glass-panel rounded-2xl p-6 shadow-2xl overflow-hidden transform transition-all scale-100">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold dark:text-white flex items-center gap-2">
                 {isRTL ? 'تفاصيل الملف' : 'File Details'}
              </h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 rounded-full hover:bg-gray-500/20 transition-colors text-gray-500 dark:text-gray-300"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Summary Cards */}
              <div className=" grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="glass-panel rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="text-xs text-[var(--muted-text)] mb-1">{isRTL ? 'اسم الملف' : 'File Name'}</div>
                    <div className="font-semibold text-sm break-all" dir="ltr">{previewItem.fileName}</div>
                 </div>
                 <div className="glass-panel rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="text-xs text-[var(--muted-text)] mb-1">{isRTL ? 'الحالة' : 'Status'}</div>
                    <StatusBadge status={previewItem.status} />
                 </div>
                 <div className="glass-panel rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="text-xs text-[var(--muted-text)] mb-1">{isRTL ? 'النوع' : 'Type'}</div>
                    <div className="font-semibold text-sm">{previewItem.type}</div>
                 </div>
              </div>

              {/* Details Grid */}
              <div className="glass-panel rounded-xl p-4">
                 <h4 className="text-sm font-semibold mb-3 border-b border-gray-700/30 pb-2 dark:text-white">{isRTL ? 'معلومات إضافية' : 'Additional Info'}</h4>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--muted-text)] block text-xs">{isRTL ? 'تاريخ الإجراء' : 'Action Date'}</span>
                      <span className="font-medium dark:text-white" dir="ltr">{new Date(previewItem.dateTime).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-text)] block text-xs">{isRTL ? 'تمت بواسطة' : 'Performed By'}</span>
                      <span className="font-medium dark:text-white">{previewItem.performedBy}</span>
                    </div>
                    {previewItem.error && (
                      <div className="col-span-2 mt-2 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                        <span className="font-bold block text-xs mb-1">{isRTL ? 'تفاصيل الخطأ' : 'Error Details'}</span>
                        {previewItem.error}
                      </div>
                    )}
                 </div>
              </div>

              {/* Data Preview Table (Mock) */}
              <div className="glass-panel rounded-xl p-0 overflow-hidden">
                 <div className="px-4 py-3 bg-gray-500/5 border-b border-gray-500/10 flex justify-between items-center">
                    <h4 className="text-sm font-semibold dark:text-white">{isRTL ? 'معاينة البيانات' : 'Data Preview'}</h4>
                    <span className="text-[10px] text-[var(--muted-text)]">{isRTL ? 'عينة' : 'Sample'}</span>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="min-w-full text-xs">
                     <thead className="bg-gray-500/5">
                        <tr>
                           <th className="px-3 py-2 text-start dark:text-gray-300">ID</th>
                           <th className="px-3 py-2 text-start dark:text-gray-300">{isRTL ? 'الاسم' : 'Name'}</th>
                           <th className="px-3 py-2 text-start dark:text-gray-300">{isRTL ? 'البيانات' : 'Data'}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-700/10">
                        {[1, 2, 3].map(i => (
                          <tr key={i} className="hover:bg-gray-500/5">
                             <td className="px-3 py-2 opacity-70 dark:text-gray-400">#{100 + i}</td>
                             <td className="px-3 py-2 dark:text-gray-300">Item {i}</td>
                             <td className="px-3 py-2 opacity-70 dark:text-gray-400">...</td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                 </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-700/20">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors text-sm"
              >
                {isRTL ? 'إغلاق' : 'Close'}
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
              >
                <Download size={16} />
                {isRTL ? 'تحميل الملف' : 'Download File'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default ImportsReport

