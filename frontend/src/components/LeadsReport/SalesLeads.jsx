import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { logExportEvent } from '../../utils/api'

const normalize = (s) => String(s || '').trim().toLowerCase()

const SalesLeads = ({ leads = [] }) => {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'

  // Source filter
  const sources = useMemo(() => ['All', ...Array.from(new Set(leads.map(l => l.source).filter(Boolean)))], [leads])
  const [source, setSource] = useState('All')
  const filtered = useMemo(() => source === 'All' ? leads : leads.filter(l => l.source === source), [leads, source])

  // Stage counts for funnel visualization
  const stageOrder = ['new', 'contacted', 'qualified', 'proposal', 'closed']
  const stageCounts = useMemo(() => {
    const map = Object.fromEntries(stageOrder.map(s => [s, 0]))
    filtered.forEach(l => {
      const key = normalize(l.stage)
      if (key in map) map[key] = (map[key] || 0) + 1
    })
    return map
  }, [filtered])

  const totalLeads = filtered.length
  const qualified = stageCounts.qualified || 0
  const closed = stageCounts.closed || 0
  const lost = filtered.filter(l => normalize(l.status) === 'lost').length
  const conversionPct = totalLeads > 0 ? Math.round((closed / totalLeads) * 100) : 0
  const qualifiedPct = totalLeads > 0 ? Math.round((qualified / totalLeads) * 100) : 0
  const avgResponseTimeHrs = useMemo(() => {
    // Approximate: time between createdAt and lastContact if available
    const times = filtered.map(l => {
      const c = l.createdAt ? new Date(l.createdAt).getTime() : null
      const lc = l.lastContact ? new Date(l.lastContact).getTime() : null
      if (!c || !lc) return null
      return Math.max(0, (lc - c) / (1000 * 60 * 60))
    }).filter(v => v != null)
    if (times.length === 0) return 0
    const avg = times.reduce((s, v) => s + v, 0) / times.length
    return Math.round(avg)
  }, [filtered])

  // Top-performing source (by closed leads)
  const topSource = useMemo(() => {
    const map = {}
    filtered.forEach(l => {
      const s = l.source || 'Unknown'
      if (!map[s]) map[s] = { total: 0, closed: 0 }
      map[s].total += 1
      if (normalize(l.stage) === 'closed') map[s].closed += 1
    })
    const entries = Object.entries(map)
    if (entries.length === 0) return null
    entries.sort((a, b) => b[1].closed - a[1].closed)
    const [name, stats] = entries[0]
    return { name, stats }
  }, [filtered])

  // Responsive Table State
  const [expandedRows, setExpandedRows] = useState(new Set())
  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  // Lead details modal
  const [showModal, setShowModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const openLead = (l) => { setSelectedLead(l); setShowModal(true) }

  // Export Logic
  const [showExportMenu, setShowExportMenu] = useState(false)
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

  const exportToPdf = async () => {
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = await import('jspdf-autotable')
      const doc = new jsPDF()

      // Load Arabic font if possible
      try {
        const response = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf')
        if (response.ok) {
          const fontData = await response.arrayBuffer()
          const base64Font = btoa(
            new Uint8Array(fontData).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          doc.addFileToVFS('Amiri-Regular.ttf', base64Font)
          doc.addFont('Amiri-Regular.ttf', 'Amiri-Regular', 'normal')
          doc.setFont('Amiri-Regular')
        }
      } catch (fontError) {
        console.warn('Could not load Arabic font:', fontError)
      }

      const tableColumn = [
        isRTL ? 'الاسم' : 'Name',
        isRTL ? 'الهاتف' : 'Phone',
        isRTL ? 'المصدر' : 'Source',
        isRTL ? 'المرحلة' : 'Stage',
        isRTL ? 'آخر اتصال' : 'Last Contact'
      ]
      const tableRows = []

      filtered.forEach(l => {
        const rowData = [
          l.name || '',
          l.phone || '',
          l.source || '',
          l.stage || '',
          l.lastContact ? new Date(l.lastContact).toLocaleString() : '—'
        ]
        tableRows.push(rowData)
      })

      doc.text(isRTL ? 'تقرير العملاء المحتملين' : 'Sales Leads Report', 14, 15)
      autoTable.default(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { font: 'Amiri-Regular', fontSize: 10, halign: isRTL ? 'right' : 'left' },
        headStyles: { fillColor: [66, 139, 202], halign: isRTL ? 'right' : 'left' }
      })
      doc.save('sales_leads_report.pdf')
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export PDF Error:', error)
    }
  }

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const wsData = filtered.map(l => ({
      [isRTL ? 'الاسم' : 'Name']: l.name,
      [isRTL ? 'الهاتف' : 'Phone']: l.phone,
      [isRTL ? 'المصدر' : 'Source']: l.source,
      [isRTL ? 'المرحلة' : 'Stage']: l.stage,
      [isRTL ? 'آخر اتصال' : 'Last Contact']: l.lastContact ? new Date(l.lastContact).toLocaleString() : '—',
      [isRTL ? 'تاريخ الإنشاء' : 'Created At']: l.createdAt ? new Date(l.createdAt).toLocaleString() : '—'
    }))
    const ws = XLSX.utils.json_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Leads')
    const fileName = 'sales_leads_report.xlsx'
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Sales Leads Report',
      fileName,
      format: 'xlsx',
    })
    setShowExportMenu(false)
  }

  return (
    <div className="space-y-6 my-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{isRTL ? 'نظرة عامة على العملاء المحتملين' : 'Sales Leads Overview'}</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">{isRTL ? 'المصدر' : 'Source'}</label>
          <select value={source} onChange={e => setSource(e.target.value)} className="px-3 py-2 rounded-md border border-gray-700 bg-gray-800 text-gray-100">
            {sources.map(s => <option key={s} value={s}>{s === 'All' ? (isRTL ? 'الكل' : 'All') : s}</option>)}
          </select>
        </div>
      </div>

      {/* Funnel Visualization */}
      <FunnelChart
        stages={[
          { key: 'new', label: isRTL ? 'جديد' : 'New', value: stageCounts.new },
          { key: 'contacted', label: isRTL ? 'تم الاتصال' : 'Contacted', value: stageCounts.contacted },
          { key: 'qualified', label: isRTL ? 'مؤهل' : 'Qualified', value: stageCounts.qualified },
          { key: 'proposal', label: isRTL ? 'مقترح' : 'Proposal', value: stageCounts.proposal },
          { key: 'closed', label: isRTL ? 'مغلق' : 'Closed', value: stageCounts.closed },
        ]}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="p-4 md:p-6 rounded-xl border border-gray-800 bg-[#0b1220]">
          <div className="text-sm text-gray-400">{isRTL ? 'إجمالي العملاء' : 'Total Leads'}</div>
          <div className="text-2xl font-bold text-green-400">{totalLeads}</div>
        </div>
        <div className="p-4 md:p-6 rounded-xl border border-gray-800 bg-[#0b1220]">
          <div className="text-sm text-gray-400">{isRTL ? 'العملاء المؤهلين %' : 'Qualified Leads %'}</div>
          <div className="text-2xl font-bold text-green-400">{qualifiedPct}%</div>
        </div>
        <div className="p-4 md:p-6 rounded-xl border border-gray-800 bg-[#0b1220]">
          <div className="text-sm text-gray-400">{isRTL ? 'متوسط وقت الاستجابة' : 'Average Response Time'}</div>
          <div className="text-2xl font-bold text-green-400">{avgResponseTimeHrs}h</div>
        </div>
        <div className="p-4 md:p-6 rounded-xl border border-gray-800 bg-[#0b1220]">
          <div className="text-sm text-gray-400">{isRTL ? 'معدل التحويل' : 'Conversion Rate'}</div>
          <div className="text-2xl font-bold text-green-400">{conversionPct}%</div>
        </div>
        <div className="p-4 md:p-6 rounded-xl border border-gray-800 bg-[#0b1220]">
          <div className="text-sm text-gray-400">{isRTL ? 'العملاء المفقودين' : 'Lost Leads'}</div>
          <div className="text-2xl font-bold text-green-400">{lost}</div>
        </div>
      </div>

      {/* Responsive Table View */}
      <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-md border border-white/50 dark:border-gray-700/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/20 dark:border-gray-700/50 flex items-center justify-between">
          <h2 className="text-lg font-bold dark:text-white">
            {isRTL ? 'قائمة العملاء المحتملين' : 'Leads List'}
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
          <table className="w-full text-sm text-left dark:text-white">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 dark:bg-gray-700/50 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-start">{isRTL ? 'الاسم' : 'Name'}</th>
                <th className="px-4 py-3 hidden md:table-cell text-start">{isRTL ? 'الهاتف' : 'Phone'}</th>
                <th className="px-4 py-3 hidden md:table-cell text-start">{isRTL ? 'المصدر' : 'Source'}</th>
                <th className="px-4 py-3 hidden md:table-cell text-start">{isRTL ? 'المرحلة' : 'Stage'}</th>
                <th className="px-4 py-3 text-start">{isRTL ? 'الإجراءات' : 'Actions'}</th>
                <th className="px-4 py-3 md:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, idx) => {
                const isRowExpanded = expandedRows.has(idx)
                return (
                  <React.Fragment key={idx}>
                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium">{l.name || '-'}</td>
                      <td className="px-4 py-3 hidden md:table-cell">{l.phone || '-'}</td>
                      <td className="px-4 py-3 hidden md:table-cell">{l.source || '-'}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {l.stage || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 transition text-xs" 
                          onClick={() => openLead(l)}
                        >
                          <Eye size={14} /> {isRTL ? 'عرض' : 'View'}
                        </button>
                      </td>
                      <td className="px-4 py-3 md:hidden">
                        <button
                          onClick={() => toggleRow(idx)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          {isRowExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    {isRowExpanded && (
                      <tr className="md:hidden bg-gray-50 dark:bg-gray-800/30">
                        <td colSpan="6" className="px-4 py-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">{isRTL ? 'الهاتف' : 'Phone'}:</span>
                            <span>{l.phone || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{isRTL ? 'المصدر' : 'Source'}:</span>
                            <span>{l.source || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{isRTL ? 'المرحلة' : 'Stage'}:</span>
                            <span>{l.stage || '-'}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {isRTL ? 'لا توجد بيانات' : 'No data available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Source */}
      <div className="p-4 md:p-6 rounded-xl border border-gray-800 bg-[#0b1220]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{isRTL ? 'المصدر الأفضل أداءً' : 'Top-performing Source'}</h3>
          <span className="text-xs text-gray-400">{isRTL ? 'بناءً على الصفقات المغلقة' : 'Based on closed leads'}</span>
        </div>
        {topSource ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-1 rounded-md border border-gray-700 bg-gray-800">{topSource.name}</span>
            <span className="text-[var(--muted-text)]">{isRTL ? 'مغلق' : 'Closed'}:</span>
            <span className="font-semibold text-green-400">{topSource.stats.closed}</span>
            <span className="text-[var(--muted-text)]">{isRTL ? 'الإجمالي' : 'Total'}:</span>
            <span className="font-semibold">{topSource.stats.total}</span>
          </div>
        ) : (
          <div className="text-sm text-gray-400">{isRTL ? 'لا توجد بيانات للمصدر' : 'No source data'}</div>
        )}
      </div>

      {/* Lead Details Modal */}
      {showModal && selectedLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-[#0b1220] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{isRTL ? 'تفاصيل العميل المحتمل' : 'Lead Details'}</h3>
              <button className="px-2 py-1 rounded-md border border-gray-700 hover:bg-gray-800" onClick={() => setShowModal(false)}>{isRTL ? 'إغلاق' : 'Close'}</button>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="text-[var(--muted-text)]">{isRTL ? 'الاسم' : 'Name'}:</span> <span className="font-semibold">{selectedLead.name}</span></div>
              <div><span className="text-[var(--muted-text)]">{isRTL ? 'الهاتف' : 'Phone'}:</span> <span>{selectedLead.phone}</span></div>
              <div><span className="text-[var(--muted-text)]">{isRTL ? 'المصدر' : 'Source'}:</span> <span>{selectedLead.source}</span></div>
              <div><span className="text-[var(--muted-text)]">{isRTL ? 'المرحلة' : 'Stage'}:</span> <span>{selectedLead.stage}</span></div>
              {selectedLead.lastContact && (
                <div><span className="text-[var(--muted-text)]">{isRTL ? 'آخر اتصال' : 'Last Contact'}:</span> <span>{new Date(selectedLead.lastContact).toLocaleString()}</span></div>
              )}
              {selectedLead.createdAt && (
                <div><span className="text-[var(--muted-text)]">{isRTL ? 'تاريخ الإنشاء' : 'Created At'}:</span> <span>{new Date(selectedLead.createdAt).toLocaleString()}</span></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesLeads
