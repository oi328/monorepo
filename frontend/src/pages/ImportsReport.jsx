import { useMemo, useState, useEffect, useRef } from 'react'
import i18n from '../i18n'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { FileText, CheckCircle2, XCircle, Filter, Calendar, ChevronDown, ChevronLeft, ChevronRight, Eye, Download } from 'lucide-react'
import { FaFileExport, FaFileExcel, FaFilePdf } from 'react-icons/fa'
import { PieChart } from '../shared/components/PieChart'
import * as XLSX from 'xlsx'
import { api, logExportEvent } from '../utils/api'
import { getImportDisplayStatus } from '../utils/importStatus'
import BackButton from '../components/BackButton'
import { useTheme } from '@shared/context/ThemeProvider'
import { useAppState } from '../shared/context/AppStateProvider'
import { canExportReport } from '../shared/utils/reportPermissions'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const ImportsReport = () => {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { user } = useAppState()
  const canExport = canExportReport(user, 'Imports Report')

  const isRTL = i18n.dir() === 'rtl'

  const [logs, setLogs] = useState([])

  const [managerFilter, setManagerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [datePreset, setDatePreset] = useState('year')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)
  const [jobPreview, setJobPreview] = useState(null)
  const [downloadingJobId, setDownloadingJobId] = useState(null)
  const exportMenuRef = useRef(null)

  const managers = useMemo(() => Array.from(new Set(logs.map(l => l.manager))), [logs])

  const toStatusLabelForLocale = (rawLabel) => {
    const label = String(rawLabel || '').trim()
    if (!isRTL) return label
    if (label === 'Completed') return 'مكتمل'
    if (label === 'Completed with Issues') return 'مكتمل مع مشاكل'
    if (label === 'Processing') return 'قيد المعالجة'
    if (label === 'Canceled') return 'ملغي'
    if (label === 'Failed') return 'فشل'
    if (label === '—') return '—'
    return label
  }

  const formatImportErrorForUi = (rawError) => {
    const text = String(rawError || '').trim()
    if (!text) return null

    const fieldLabel = (col) => {
      const key = String(col || '').trim()
      if (!key) return ''
      const mapEn = {
        phone_country: 'Phone Country',
        phone: 'Phone',
        name: 'Name',
        email: 'Email',
        source: 'Source',
        project_id: 'Project',
        item_id: 'Item',
        stage: 'Stage',
      }
      const mapAr = {
        phone_country: 'كود الدولة',
        phone: 'رقم الهاتف',
        name: 'الاسم',
        email: 'البريد الإلكتروني',
        source: 'المصدر',
        project_id: 'المشروع',
        item_id: 'العنصر',
        stage: 'المرحلة',
      }
      return (isRTL ? mapAr[key] : mapEn[key]) || key
    }

    const isTechnicalLine = (line) => /(SQLSTATE|insert into|Connection:|Database:|Host:|Port:)/i.test(String(line || ''))

    const formatRowLine = (line) => {
      const mRow = String(line || '').match(/^Row\s*(\d+)\s*:\s*(.*)$/i)
      if (!mRow) return String(line || '').trim()
      const rowNumber = mRow[1]
      const message = String(mRow[2] || '').trim()

      const mTooLong = message.match(/Data too long for column '([^']+)'/i)
      if (mTooLong) {
        const col = mTooLong[1]
        return isRTL
          ? `الصف ${rowNumber}: القيمة طويلة جدًا لحقل "${fieldLabel(col)}".`
          : `Row ${rowNumber}: Value is too long for "${fieldLabel(col)}".`
      }

      const mNull = message.match(/Column '([^']+)' cannot be null/i)
      if (mNull) {
        const col = mNull[1]
        return isRTL
          ? `الصف ${rowNumber}: حقل "${fieldLabel(col)}" مطلوب.`
          : `Row ${rowNumber}: "${fieldLabel(col)}" is required.`
      }

      if (/Duplicate entry/i.test(message)) {
        return isRTL ? `الصف ${rowNumber}: بيانات مكررة.` : `Row ${rowNumber}: Duplicate data.`
      }

      if (/SQLSTATE/i.test(message)) {
        return isRTL
          ? `الصف ${rowNumber}: خطأ في بيانات الصف (راجع ملف الأخطاء).`
          : `Row ${rowNumber}: Row data error (check error file).`
      }

      return isRTL ? `الصف ${rowNumber}: ${message}` : `Row ${rowNumber}: ${message}`
    }

    const lines = text
      .split(/\r?\n/)
      .map(l => String(l || '').trim())
      .filter(Boolean)

    let hasTechnical = false
    const userLines = []

    for (const line of lines) {
      if (isTechnicalLine(line)) hasTechnical = true
      if (/^Row\s*\d+\s*:/i.test(line)) {
        userLines.push(formatRowLine(line))
        continue
      }
      if (!isTechnicalLine(line)) userLines.push(line)
    }

    const userMessage = userLines.join('\n').trim() || (isRTL ? 'حدث خطأ أثناء الاستيراد.' : 'An error occurred during import.')
    const technicalMessage = hasTechnical ? text : ''

    return { userMessage, technicalMessage }
  }

  const safeDate = useMemo(() => {
    const toDate = (value) => {
      if (!value) return null
      if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null
      const raw = String(value)
      let d = new Date(raw)
      if (Number.isFinite(d.getTime())) return d
      // Safari-safe: "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(raw)) {
        d = new Date(raw.replace(' ', 'T'))
        if (Number.isFinite(d.getTime())) return d
      }
      return null
    }

    const toTs = (value) => {
      const d = toDate(value)
      return d ? d.getTime() : null
    }

    const toLocale = (value) => {
      const d = toDate(value)
      return d ? d.toLocaleString() : '-'
    }

    return { toDate, toTs, toLocale }
  }, [])

  const latestDate = useMemo(() => {
    if (!logs.length) return new Date()
    const timestamps = logs
      .map(l => safeDate.toTs(l.dateTime))
      .filter(v => typeof v === 'number' && Number.isFinite(v))
    if (!timestamps.length) return new Date()
    return new Date(Math.max(...timestamps))
  }, [logs, safeDate])

  const matchDatePreset = useMemo(() => (dateString) => {
    const dt = safeDate.toDate(dateString)
    if (!dt) return false
    const isSameDay = (a, b) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
    const isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
    const isSameYear = (a, b) => a.getFullYear() === b.getFullYear()

    if (datePreset === 'today') return isSameDay(dt, latestDate)
    if (datePreset === 'week') {
      const diffMs = latestDate.getTime() - dt.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      return diffDays <= 7 && diffDays >= 0
    }
    if (datePreset === 'month') return isSameMonth(dt, latestDate)
    if (datePreset === 'year') return isSameYear(dt, latestDate)
    return true
  }, [datePreset, latestDate, safeDate])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const mOk = managerFilter === 'all' || l.manager === managerFilter
      const sOk =
        statusFilter === 'all' ||
        (statusFilter === 'success' ? l.statusCategory === 'completed' || l.statusCategory === 'issues' : l.statusCategory === 'failed')
      const timeOk = matchDatePreset(l.dateTime)
      return mOk && sOk && timeOk
    })
  }, [logs, managerFilter, statusFilter, matchDatePreset])

  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(filtered.length / entriesPerPage))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage
    return filtered.slice(start, start + entriesPerPage)
  }, [filtered, currentPage, entriesPerPage])

  const totalImports = filtered.length
  const completedCount = filtered.filter(l => l.statusCategory === 'completed').length
  const issuesCount = filtered.filter(l => l.statusCategory === 'issues').length
  const failedCount = filtered.filter(l => l.statusCategory === 'failed').length
  const successfulCount = completedCount + issuesCount

  const importsPerManager = useMemo(() => {
    const map = new Map()
    filtered.forEach(l => {
      map.set(l.manager, (map.get(l.manager) || 0) + 1)
    })
    return map
  }, [filtered])

  const statusDist = useMemo(
    () => ({
      Success: successfulCount,
      Failed: failedCount,
    }),
    [successfulCount, failedCount]
  )

  const previewCounters = useMemo(() => {
    if (!previewItem) return null
    const job = jobPreview && !jobPreview.error ? jobPreview : null
    if (!previewItem.jobId || !job) return null
    return {
      total_rows: Number(job.total_rows ?? 0) || 0,
      success_rows: Number(job.success_rows ?? 0) || 0,
      failed_rows: Number(job.failed_rows ?? 0) || 0,
      duplicate_rows: Number(job.duplicate_rows ?? 0) || 0,
      skipped_rows: Number(job.skipped_rows ?? 0) || 0,
      warning_rows: Number(job.warning_rows ?? 0) || 0,
    }
  }, [previewItem, jobPreview])

  const StatusBadge = ({ label, variant, hint }) => {
    const cls =
      variant === 'warning'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
        : variant === 'error'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          : variant === 'info'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            : variant === 'neutral'
              ? 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'

    const rtlLabel = toStatusLabelForLocale(label)
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] leading-4 font-medium ${cls}`}
        title={hint || undefined}
      >
        {rtlLabel}
      </span>
    )
  }

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
        const imported = data.filter((row) => {
          const action = row.action || 'export'
          return action === 'import'
        })
        const mapped = imported.map((row, index) => {
          const ts = row.created_at || row.updated_at || null
          const meta = row.meta_data || row.metaData || {}
          const jobId = meta?.job_id ?? meta?.jobId ?? null
          const metaHasCounters =
            meta?.total_rows != null ||
            meta?.success_rows != null ||
            meta?.failed_rows != null ||
            meta?.duplicate_rows != null ||
            meta?.skipped_rows != null ||
            meta?.warning_rows != null

          const jobSummaryFromMeta = jobId && metaHasCounters
            ? {
                total_rows: Number(meta?.total_rows ?? 0) || 0,
                success_rows: Number(meta?.success_rows ?? 0) || 0,
                failed_rows: Number(meta?.failed_rows ?? 0) || 0,
                duplicate_rows: Number(meta?.duplicate_rows ?? 0) || 0,
                skipped_rows: Number(meta?.skipped_rows ?? 0) || 0,
                warning_rows: Number(meta?.warning_rows ?? 0) || 0,
              }
            : null

          const displayStatus = getImportDisplayStatus(row, jobSummaryFromMeta)
          const statusCategory = (() => {
            const label = String(displayStatus?.label || '')
            if (label === 'Completed') return 'completed'
            if (label === 'Completed with Issues') return 'issues'
            if (label === 'Failed') return 'failed'
            if (label === 'Processing') return 'processing'
            return 'other'
          })()
          return {
            id: row.id ?? index + 1,
            fileName: row.file_name || '-',
            type: row.module || 'Import',
            performedBy: row.user?.name || row.user_name || '-',
            manager: row.user?.name || row.user_name || '-',
            dateTime: ts,
            statusLabel: displayStatus.label,
            statusVariant: displayStatus.variant,
            statusHint: displayStatus.hint || '',
            statusCategory,
            error: row.error_message || '',
            jobId: jobId ? Number(jobId) : null,
            legacySummary: {
              total_rows: Number(meta?.total_rows ?? 0) || 0,
              success_rows: Number(meta?.success_rows ?? 0) || 0,
              failed_rows: Number(meta?.failed_rows ?? 0) || 0,
              duplicate_rows: Number(meta?.duplicate_rows ?? 0) || 0,
              skipped_rows: Number(meta?.skipped_rows ?? 0) || 0,
              warning_rows: Number(meta?.warning_rows ?? 0) || 0,
            },
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
    const jobId = previewItem?.jobId
    if (!jobId) {
      setJobPreview(null)
      return
    }

    const loadJob = async () => {
      try {
        const res = await api.get(`/api/import-jobs/${jobId}`)
        setJobPreview(res.data)
      } catch (e) {
        setJobPreview({
          error: true,
          message: e?.response?.data?.message || e?.message || 'Failed to load job details',
          hint: e?.response?.status === 404 ? 'Enable IMPORT_JOBS_ENABLED=true on the backend.' : undefined,
        })
      }
    }

    loadJob()
  }, [previewItem?.jobId])

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
    if (!canExport) return
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
          l.statusLabel,
          `${l.performedBy} (${l.manager})`,
          safeDate.toLocale(l.dateTime),
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
    if (!canExport) return
    const wb = XLSX.utils.book_new()
    const wsData = filtered.map(l => ({
      [isRTL ? 'اسم الملف' : 'File Name']: l.fileName,
      [isRTL ? 'الحالة' : 'Status']: l.statusLabel,
      [isRTL ? 'تمت بواسطة' : 'Action By']: `${l.performedBy} (${l.manager})`,
      [isRTL ? 'تاريخ الإجراء' : 'Action Date']: safeDate.toLocale(l.dateTime),
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

  const downloadReviewedFileForRow = async (row, { issuesOnly = false } = {}) => {
    const jobId = row?.jobId ? Number(row.jobId) : null
    if (!jobId) {
      alert(isRTL ? 'التحميل غير متاح لهذا السجل.' : 'Download is not available for this record.')
      return
    }

    try {
      setDownloadingJobId(jobId)
      const res = await api.get(`/api/import-jobs/${jobId}/reviewed-file`, {
        params: {
          ...(issuesOnly ? { issues_only: 1 } : null),
          lang: i18n.language,
        },
        responseType: 'blob',
      })

      const blob = new Blob([res.data], {
        type:
          res.headers?.['content-type'] ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Try to use filename from headers; fallback to the row file name.
      let filename = ''
      const disposition = String(res.headers?.['content-disposition'] || '')
      const match = disposition.match(/filename\\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i)
      if (match) {
        filename = decodeURIComponent(match[1] || match[2] || '').trim()
      }
      if (!filename) {
        const baseName = String(row?.fileName || `import_job_${jobId}`).replace(/\\.(xlsx|xls)$/i, '')
        filename = `${baseName}${issuesOnly ? '_issues' : '_reviewed'}.xlsx`
      }

      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert(isRTL ? 'فشل تنزيل الملف.' : 'Failed to download file.')
    } finally {
      setDownloadingJobId(null)
    }
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
      value: successfulCount,
        icon: CheckCircle2,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
      },
      {
        title: isRTL ? 'الواردات الفاشلة' : 'Failed Imports',
      value: failedCount,
        icon: XCircle,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20'
      }
    ]

  return (
    <div className="p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] overflow-hidden min-w-0">
      <div className="mb-6">
        <BackButton to="/reports" />
        <h1 className={`text-2xl font-bold ${isLight ? 'text-black' : 'text-white'} mb-2`}>
          {isRTL ? 'تقرير الواردات' : 'Imports Report'}
        </h1>
        <p className={`${isLight ? 'text-black' : 'text-white'} text-sm`}>
          {isRTL ? 'راقب كل عمليات استيراد البيانات ومشاكلها' : 'Monitor all data import operations and issues'}
        </p>
      </div>

      <div className="backdrop-blur-md rounded-2xl shadow-sm border border-theme-border dark:border-gray-700/50 p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <div className={`flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'} font-semibold`}>
            <Filter size={20} className="text-blue-500 dark:text-blue-400" />
            <h3>{isRTL ? 'تصفية' : 'Filter'}</h3>
          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={clearFilters}
              className={`px-3 py-1.5 text-sm ${isLight ? 'text-black' : 'text-white'} hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors`}
            >
              {isRTL ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                {isRTL ? 'المدير' : 'Manager'}
              </label>
              <select
                value={managerFilter}
                onChange={(e) => {
                  setManagerFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className={`w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm ${isLight ? 'text-black' : 'text-white'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-transparent`}
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
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                {isRTL ? 'الحالة' : 'Status'}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className={`w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm ${isLight ? 'text-black' : 'text-white'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-transparent`}
              >
                <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                <option value="success">{isRTL ? 'ناجح' : 'Success'}</option>
                <option value="failed">{isRTL ? 'فشل' : 'Failed'}</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
                {isRTL ? 'تاريخ الإجراء' : 'Action Date'}
              </label>
              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value)
                  setCurrentPage(1)
                }}
                className={`w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm ${isLight ? 'text-black' : 'text-white'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-transparent`}
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
              className="group relative backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden h-32"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                <Icon size={80} className={card.color} />
              </div>
              <div className="flex flex-col justify-between h-full relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${card.bgColor} ${card.color}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className={`text-sm font-semibold opacity-80 ${isLight ? 'text-black' : 'text-white'}`}>
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
        <div className="backdrop-blur-md border border-theme-border dark:border-gray-700/50 shadow-sm p-4 rounded-2xl">
          <div className={`text-sm font-medium mb-2 ${isLight ? 'text-black' : 'text-white'}`}>
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
          <div className={`text-sm font-medium mb-2 ${isLight ? 'text-black' : 'text-white'}`}>
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
                <span className={`text-[var(--content-text)] ${isLight ? 'text-black' : 'text-white'}`}>
                  {isRTL ? 'ناجح' : 'Success'}: {statusDist.Success}
                  {totalImports > 0 && (
                    <> ({Math.round((statusDist.Success / totalImports) * 100)}%)</>
                  )}
                </span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
                <span className={`text-[var(--content-text)] ${isLight ? 'text-black' : 'text-white'}`}>
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

      <div className="backdrop-blur-md border border-theme-border dark:border-gray-700/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme-border dark:border-gray-700/50 flex items-center justify-between">
          <h2 className={`text-lg font-bold ${isLight ? 'text-black' : 'text-white'}`}>
            {isRTL ? 'قائمة الواردات' : 'Imports List'}
          </h2>
          {canExport && (
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
                    className={`w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-blue-900/50 flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}
                  >
                    <FaFileExcel className="text-green-600" /> {isRTL ? 'تصدير كـ Excel' : 'Export to Excel'}
                  </button>
                  <button
                    onClick={exportToPdf}
                    className={`w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-blue-900/50 flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}
                  >
                    <FaFilePdf className="text-red-600" /> {isRTL ? 'تصدير كـ PDF' : 'Export to PDF'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4 p-4">
          {paginatedRows.map(row => (
            <div key={row.id} className="rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-semibold ${isLight ? 'text-black' : 'text-white'} text-base truncate max-w-[70vw]`} title={row.fileName} dir="ltr">
                    {row.fileName}
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-black' : 'text-white'} mt-1`}>{row.type}</p>
                </div>
                <StatusBadge label={row.statusLabel} variant={row.statusVariant} hint={row.statusHint} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className={`text-xs ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'تمت بواسطة' : 'Action By'}</span>
                  <div className={`font-medium ${isLight ? 'text-black' : 'text-white'} truncate`} title={row.performedBy}>
                    {row.performedBy}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`text-xs ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'تاريخ الإجراء' : 'Action Date'}</span>
                  <span className={`font-medium ${isLight ? 'text-black' : 'text-white'}`} dir="ltr">{safeDate.toLocale(row.dateTime)}</span>
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <span className={`text-xs ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'وصف الخطأ' : 'Error'}</span>
                  <span className={`font-medium ${isLight ? 'text-black' : 'text-white'} truncate`}>{row.error || '—'}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => setPreviewItem(row)}
                  className="flex-1 flex items-center justify-center gap-2 py-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-xs font-medium transition-colors"
                >
                  <Eye size={14} />
                  {isRTL ? 'معاينة' : 'Preview'}
                </button>
                <button
                  onClick={() => downloadReviewedFileForRow(row)}
                  disabled={!row.jobId || downloadingJobId === row.jobId}
                  className="flex-1 flex items-center justify-center gap-2 py-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!row.jobId ? (isRTL ? 'غير متاح لهذا السجل' : 'Not available for this record') : undefined}
                >
                  <Download size={14} />
                  {isRTL ? 'تحميل' : 'Download'}
                </button>
                <button
                  onClick={() => downloadReviewedFileForRow(row, { issuesOnly: true })}
                  disabled={!row.jobId || downloadingJobId === row.jobId}
                  className="flex-1 flex items-center justify-center gap-2 py-1.5 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!row.jobId ? (isRTL ? 'غير متاح لهذا السجل' : 'Not available for this record') : (isRTL ? 'تحميل ملف الأخطاء' : 'Download Error File')}
                >
                  <Download size={14} />
                  {isRTL ? 'أخطاء' : 'Errors'}
                </button>
              </div>
            </div>
          ))}
          {paginatedRows.length === 0 && (
            <div className={`text-center py-8 ${isLight ? 'text-black' : 'text-white'}`}>
              {isRTL ? 'لا توجد بيانات' : 'No data available'}
            </div>
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className={`w-full min-w-[980px] table-fixed text-[13px] text-left rtl:text-right ${isLight ? 'text-black' : 'text-white'}`}>
            <thead className="text-[11px] uppercase bg-gray-50/50 dark:bg-gray-700/50">
              <tr>
                <th className="px-3 py-2 text-start w-80">{isRTL ? 'اسم الملف' : 'File Name'}</th>
                <th className="px-3 py-2 text-start w-44">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="px-3 py-2 text-start w-28">{isRTL ? 'النوع' : 'Type'}</th>
                <th className="px-3 py-2 text-start w-36">{isRTL ? 'تمت بواسطة' : 'Action By'}</th>
                <th className="px-3 py-2 text-start w-44">{isRTL ? 'تاريخ الإجراء' : 'Action Date'}</th>
                <th className="px-3 py-2 text-start w-[360px]">{isRTL ? 'اخطاء' : 'Error'}</th>
                <th className="px-3 py-2 text-end w-28">{isRTL ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="border-b border-theme-border/70 dark:border-gray-700/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className={`px-3 py-2 font-medium ${isLight ? 'text-black' : 'text-white'} truncate`} title={row.fileName} dir="ltr">
                      {row.fileName}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge label={row.statusLabel} variant={row.statusVariant} hint={row.statusHint} />
                    </td>
                    <td className={`px-3 py-2 ${isLight ? 'text-black' : 'text-white'} truncate`} title={row.type}>{row.type}</td>
                    <td className={`px-3 py-2 ${isLight ? 'text-black' : 'text-white'} truncate`} title={row.performedBy}>{row.performedBy}</td>
                    <td className={`px-3 py-2 ${isLight ? 'text-black' : 'text-white'}`} dir="ltr">
                      {safeDate.toLocale(row.dateTime)}
                    </td>
                    <td className={`px-3 py-2 truncate ${isLight ? 'text-black' : 'text-white'}`} title={row.error}>
                      {row.error || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button 
                          onClick={() => setPreviewItem(row)}
                          className="hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400 transition-colors p-1" 
                          title={isRTL ? 'معاينة' : 'Preview'}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => downloadReviewedFileForRow(row)}
                          disabled={!row.jobId || downloadingJobId === row.jobId}
                          className="hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!row.jobId ? (isRTL ? 'غير متاح لهذا السجل' : 'Not available for this record') : (isRTL ? 'تحميل' : 'Download')}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => downloadReviewedFileForRow(row, { issuesOnly: true })}
                          disabled={!row.jobId || downloadingJobId === row.jobId}
                          className="hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded text-amber-700 dark:text-amber-300 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!row.jobId ? (isRTL ? 'غير متاح لهذا السجل' : 'Not available for this record') : (isRTL ? 'تحميل ملف الأخطاء' : 'Download Error File')}
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-4 py-8 text-center ${isLight ? 'text-black' : 'text-white'}`}>
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
              <div className="flex items-center gap-2">
               <h3 className={`text-xl font-semibold flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}>
                  {isRTL ? 'تفاصيل الملف' : 'File Details'}
               </h3>
               {!previewItem.jobId && (
                 <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-500/10 text-gray-600 dark:text-gray-200 border border-gray-500/20">
                   {isRTL ? 'سجل قديم' : 'Old Log'}
                 </span>
               )}
               {previewItem.jobId && (
                 <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 border border-emerald-500/20">
                   Import Job
                 </span>
               )}
              </div>
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
                    <StatusBadge label={previewItem.statusLabel} variant={previewItem.statusVariant} hint={previewItem.statusHint} />
                 </div>
                 <div className="glass-panel rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="text-xs text-[var(--muted-text)] mb-1">{isRTL ? 'النوع' : 'Type'}</div>
                    <div className="font-semibold text-sm">{previewItem.type}</div>
                 </div>
              </div>

              {/* Details Grid */}
              <div className="glass-panel rounded-xl p-4">
                 <h4 className={`text-sm font-semibold mb-3 border-b border-gray-700/30 pb-2 ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'معلومات إضافية' : 'Additional Info'}</h4>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--muted-text)] block text-xs">{isRTL ? 'تاريخ الإجراء' : 'Action Date'}</span>
                      <span className={`font-medium ${isLight ? 'text-black' : 'text-white'}`} dir="ltr">{new Date(previewItem.dateTime).toLocaleString()}</span>
                    </div>
                     <div>
                       <span className="text-[var(--muted-text)] block text-xs">{isRTL ? 'تمت بواسطة' : 'Performed By'}</span>
                       <span className={`font-medium ${isLight ? 'text-black' : 'text-white'}`}>{previewItem.performedBy}</span>
                     </div>
                     <div className="col-span-2">
                       <span className="text-[var(--muted-text)] block text-xs">{isRTL ? 'مصدر البيانات' : 'Data Source'}</span>
                        <span className={`font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                          {previewItem.jobId
                            ? (isRTL ? 'نظام الاستيراد الجديد' : 'New import system')
                            : (isRTL ? 'سجل الاستيراد' : 'Import log')}
                        </span>
                      </div>
                     {previewItem.error && (
                        <div className="col-span-2 mt-2 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm whitespace-pre-line">
                          <span className="font-bold block text-xs mb-1">{isRTL ? 'تفاصيل الخطأ' : 'Error Details'}</span>
                           {(() => {
                             const formatted = formatImportErrorForUi(previewItem.error)
                             if (!formatted) return null
                             return (
                               <div className="space-y-2">
                                 <div>{formatted.userMessage}</div>
                               </div>
                             )
                           })()}
                          {!previewItem.jobId && (
                            <div className="mt-1 text-[10px] opacity-80">
                              {isRTL ? 'هذه رسالة خطأ من سجل قديم وليست تفاصيل صفوف.' : 'This is an old log message (not a row-by-row breakdown).'}
                           </div>
                         )}
                       </div>
                     )}
                 </div>
              </div>

              {previewItem.jobId && (
                <div className="space-y-4">
                  {jobPreview?.error && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                      <div className="font-semibold">{jobPreview.message}</div>
                      {jobPreview.hint && <div className="opacity-80 mt-1">{jobPreview.hint}</div>}
                    </div>
                  )}

                  {previewCounters && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="glass-panel rounded-xl p-3">
                        <div className="text-[10px] text-[var(--muted-text)]">Total Rows</div>
                        <div className="text-lg font-semibold">{previewCounters.total_rows}</div>
                      </div>
                      <div className="glass-panel rounded-xl p-3">
                        <div className="text-[10px] text-[var(--muted-text)]">Success</div>
                        <div className="text-lg font-semibold">{previewCounters.success_rows}</div>
                      </div>
                      <div className="glass-panel rounded-xl p-3">
                        <div className="text-[10px] text-[var(--muted-text)]">Failed</div>
                        <div className="text-lg font-semibold">{previewCounters.failed_rows}</div>
                      </div>
                      <div className="glass-panel rounded-xl p-3">
                        <div className="text-[10px] text-[var(--muted-text)]">Duplicate</div>
                        <div className="text-lg font-semibold">{previewCounters.duplicate_rows}</div>
                      </div>
                      <div className="glass-panel rounded-xl p-3">
                        <div className="text-[10px] text-[var(--muted-text)]">Skipped</div>
                        <div className="text-lg font-semibold">{previewCounters.skipped_rows}</div>
                      </div>
                      <div className="glass-panel rounded-xl p-3">
                        <div className="text-[10px] text-[var(--muted-text)]">Warnings</div>
                        <div className="text-lg font-semibold">{previewCounters.warning_rows}</div>
                      </div>
                    </div>
                  )}

                  <div className="glass-panel rounded-xl p-4 text-sm text-[var(--muted-text)]">
                    {isRTL
                      ? 'تفاصيل الصفوف غير معروضة هنا. استخدم أزرار التحميل لمراجعة الملف.'
                      : 'Row details are not shown here. Use the download buttons to review the file.'}
                  </div>
                </div>
              )}

              {!previewItem.jobId && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-200">
                    {isRTL
                      ? 'هذه العملية مسجلة كسجل قديم ولا تحتوي على تفاصيل صفوف أو ملخص Counters موثوق. للحصول على العدادات وتفاصيل الصفوف، استخدم نظام الاستيراد الجديد (Import Jobs).'
                      : 'This import is stored in an old log (exports) and does not include reliable row-level details or summary counters. To get counters + row details, use the new Import Jobs flow.'}
                  </div>
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex flex-nowrap items-center justify-end gap-2 pt-4 border-t border-gray-700/20 overflow-x-auto">
              <button
                onClick={() => setPreviewItem(null)}
                className="shrink-0 whitespace-nowrap px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors text-xs"
              >
                {isRTL ? 'إغلاق' : 'Close'}
              </button>
              <button
                onClick={() => downloadReviewedFileForRow(previewItem)}
                disabled={!previewItem?.jobId || downloadingJobId === previewItem?.jobId}
                className="shrink-0 whitespace-nowrap px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                {isRTL ? 'تحميل الملف' : 'Download File'}
              </button>
              <button
                onClick={() => downloadReviewedFileForRow(previewItem, { issuesOnly: true })}
                disabled={!previewItem?.jobId || downloadingJobId === previewItem?.jobId}
                className="shrink-0 whitespace-nowrap px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={isRTL ? 'Download Error File' : 'Download Error File'}
              >
                <Download size={16} />
                {isRTL ? 'تحميل ملف الأخطاء' : 'Download Error File'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default ImportsReport
