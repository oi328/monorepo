import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js'
import * as XLSX from 'xlsx'
import { logExportEvent } from '../utils/api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

export default function MonthlyMarketingOverview() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir?.() === 'rtl'
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const tickColor = isDark ? '#e5e7eb' : '#6b7280' // lighter gray for dark mode
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'

  // --- State Management ---
  const [mode, setMode] = useState('simple') // 'simple' | 'advanced'
  const [activeMetric, setActiveMetric] = useState('leads') // 'leads' | 'qualified' | 'converted'
  
  const [startDate, setStartDate] = useState('2025-11-01')
  const [endDate, setEndDate] = useState('2025-11-30')
  const [granularity, setGranularity] = useState('day') // day, week, month
  
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    campaign: 'all',
    source: 'all',
    product: 'all',
    project: 'all'
  })

  // Visibility Toggles for Advanced Mode
  const [showLeads, setShowLeads] = useState(true)
  const [showQualified, setShowQualified] = useState(true)
  const [showConverted, setShowConverted] = useState(true)

  // --- Mock Data & Options ---
  const filterOptions = {
    campaign: ['Spring Launch', 'Black Friday', 'Retargeting Q4', 'Brand Awareness'],
    source: ['Facebook', 'Google Ads', 'Instagram', 'Email', 'Referral'],
    product: ['Premium Subscription', 'Basic Plan', 'Enterprise Add-on'],
    project: ['Cairo Branch', 'Giza Branch', 'Alexandria Expansion']
  }

  // --- Data Generation Logic ---
  const chartData = useMemo(() => {
    let labels = []
    let leadsData = []
    let qualifiedData = []
    let convertedData = []

    const count = granularity === 'day' ? 30 : granularity === 'week' ? 12 : 12
    const labelPrefix = granularity === 'day' ? 'Day' : granularity === 'week' ? 'Week' : 'Month'

    for (let i = 1; i <= count; i++) {
      labels.push(`${labelPrefix} ${i}`)
      // Random data generation logic
      const baseLead = Math.floor(Math.random() * 50) + 20
      leadsData.push(baseLead)
      qualifiedData.push(Math.floor(baseLead * 0.4)) // ~40% qualified
      convertedData.push(Math.floor(baseLead * 0.1)) // ~10% converted
    }

    return {
      labels,
      leads: leadsData,
      qualified: qualifiedData,
      converted: convertedData
    }
  }, [granularity, filters])

  // --- Derived Datasets based on Mode ---
  const trendData = useMemo(() => {
    const datasets = []
    
    // Helper to determine if a dataset should be shown
    const shouldShow = (metricKey, toggleState) => {
      if (mode === 'simple') return activeMetric === metricKey
      return toggleState
    }

    if (shouldShow('leads', showLeads)) {
      datasets.push({
        label: t('Leads'),
        data: chartData.leads,
        borderColor: '#3b82f6', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: mode === 'simple' ? 4 : 2
      })
    }

    if (shouldShow('qualified', showQualified)) {
      datasets.push({
        label: t('Qualified'),
        data: chartData.qualified,
        borderColor: '#f59e0b', // amber-500
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: mode === 'simple' ? 4 : 2
      })
    }

    if (shouldShow('converted', showConverted)) {
      datasets.push({
        label: t('Converted'),
        data: chartData.converted,
        borderColor: '#10b981', // emerald-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: mode === 'simple' ? 4 : 2
      })
    }

    return {
      labels: chartData.labels,
      datasets
    }
  }, [chartData, mode, activeMetric, showLeads, showQualified, showConverted, t])

  // --- Summary Statistics ---
  const summary = useMemo(() => {
    const sum = (arr) => arr.reduce((a, b) => a + b, 0)
    const totalLeads = sum(chartData.leads)
    const totalQualified = sum(chartData.qualified)
    const totalConverted = sum(chartData.converted)
    
    // Find best performing day/period
    let bestIdx = -1, bestVal = -1
    chartData.leads.forEach((val, idx) => {
      if (val > bestVal) { bestVal = val; bestIdx = idx }
    })

    return {
      totalLeads,
      totalQualified,
      totalConverted,
      conversionRate: totalLeads ? Math.round((totalConverted / totalLeads) * 100) : 0,
      qualificationRate: totalLeads ? Math.round((totalQualified / totalLeads) * 100) : 0,
      bestPeriod: bestIdx >= 0 ? chartData.labels[bestIdx] : '-'
    }
  }, [chartData])

  // --- Chart Options ---
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: mode === 'advanced', // Hide legend in simple mode as we use pills
        position: 'top',
        align: 'end',
        labels: { color: tickColor, usePointStyle: true, boxWidth: 8 }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: isDark ? 'rgba(17, 24, 39, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#1f2937',
        bodyColor: isDark ? '#e5e7eb' : '#4b5563',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        padding: 10,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: tickColor, font: { size: 11 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: tickColor, font: { size: 11 } }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }

  // --- Handlers ---
  const applyPreset = (days) => {
    // Logic to set date range (mock implementation for UI)
    // setStartDate(...)
    // setEndDate(...)
  }

  const exportExcel = () => {
    const data = chartData.labels.map((label, index) => ({
      [t('Time Period')]: label,
      [t('Leads')]: chartData.leads[index],
      [t('Qualified')]: chartData.qualified[index],
      [t('Converted')]: chartData.converted[index]
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lead Performance')
    const fileName = 'lead-performance.xlsx'
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Monthly Marketing Overview',
      fileName,
      format: 'xlsx',
    })
  }

  const exportPdf = () => {
    const html = document.getElementById('report-root')?.innerHTML || ''
    const win = window.open('', 'PRINT', 'height=800,width=1000')
    if (!win) return
    win.document.write(`<html><head><title>${t('Lead Performance')}</title></head><body>${html}</body></html>`) 
    win.document.close(); win.focus();
    win.print();
  }

  return (
    <div id="report-root" className="space-y-4">
      
      {/* --- Header & Controls --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {t('Lead Performance Over Time')}
          </h1>
          {mode === 'simple' && (
             <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
               {t('Last 30 Days')} — {(activeMetric === 'leads' && t('Total Leads')) || (activeMetric === 'qualified' && t('Qualified Leads')) || t('Converted Leads')}
             </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Buttons */}
          <div className="flex items-center gap-1 mr-2 border-r border-gray-200 dark:border-gray-700 pr-3">
             <button onClick={exportPdf} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-red-500 transition-colors" title={t('Export PDF')}>
               <RiFilePdfLine size={18} />
             </button>
             <button onClick={exportExcel} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-emerald-500 transition-colors" title={t('Export Excel')}>
               <RiFileExcelLine size={18} />
             </button>
          </div>

          {/* Mode Toggles */}
          {mode === 'simple' ? (
            <>
              <button onClick={() => applyPreset(30)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t('Last 30 Days')}
              </button>
              <button onClick={() => applyPreset(0)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t('This Month')}
              </button>
              <button 
                onClick={() => setMode('advanced')} 
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                {t('Advanced Analysis')}
              </button>
            </>
          ) : (
            <button 
              onClick={() => setMode('simple')} 
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('Back to Simple View')}
            </button>
          )}
        </div>
      </div>

      {/* --- Advanced Controls Panel --- */}
      {mode === 'advanced' && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
          
          {/* Top Row: Filters Toggle, Granularity, Metrics */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
             <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowFilters(prev => !prev)} 
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/20 dark:border-blue-500/50 dark:text-blue-300' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                >
                  <Filter size={14} />
                  {t('Filters')}
                </button>

                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
                  {['day', 'week', 'month'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGranularity(g)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        granularity === g
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                          : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
                      }`}
                    >
                      {t(g.charAt(0).toUpperCase() + g.slice(1) + 'ly')}
                    </button>
                  ))}
                </div>
             </div>

             <div className="flex items-center gap-4 border-l border-gray-200 dark:border-gray-700 pl-4 ml-auto sm:ml-0">
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showLeads ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {showLeads && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <input type="checkbox" className="hidden" checked={showLeads} onChange={e => setShowLeads(e.target.checked)} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{t('Leads')}</span>
                </label>
                
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showQualified ? 'bg-amber-500 border-amber-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {showQualified && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <input type="checkbox" className="hidden" checked={showQualified} onChange={e => setShowQualified(e.target.checked)} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{t('Qualified')}</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showConverted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {showConverted && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <input type="checkbox" className="hidden" checked={showConverted} onChange={e => setShowConverted(e.target.checked)} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{t('Converted')}</span>
                </label>
             </div>
          </div>

          {/* Expanded Filters Section */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
               {/* Date Range */}
               <div className="lg:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t('Date Range')}</label>
                  <AdvancedDateFilter
                    startDate={startDate}
                    endDate={endDate}
                    onChange={({ startDate: s, endDate: e }) => { setStartDate(s); setEndDate(e) }}
                  />
               </div>

               {/* Dropdown Filters */}
               {Object.keys(filterOptions).map((key) => (
                 <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 capitalize">{t(key)}</label>
                    <select
                      className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                      value={filters[key]}
                      onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                    >
                      <option value="all">{t(`All ${key.charAt(0).toUpperCase() + key.slice(1)}s`)}</option>
                      {filterOptions[key].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                 </div>
               ))}
            </div>
          )}
        </div>
      )}

      {/* --- Main Chart Section --- */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 md:p-6">
        
        {/* Simple Mode Metric Pills */}
        {mode === 'simple' && (
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setActiveMetric('leads')}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${activeMetric === 'leads' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-500/20 dark:border-blue-400 dark:text-blue-300 ring-1 ring-blue-500/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {t('Leads')}
            </button>
            <button 
              onClick={() => setActiveMetric('qualified')}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${activeMetric === 'qualified' ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-500/20 dark:border-amber-400 dark:text-amber-300 ring-1 ring-amber-500/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {t('Qualified')}
            </button>
            <button 
              onClick={() => setActiveMetric('converted')}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${activeMetric === 'converted' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-400 dark:text-emerald-300 ring-1 ring-emerald-500/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {t('Converted')}
            </button>
          </div>
        )}

        {/* Chart Area */}
        <div className="h-[350px] w-full relative">
           <Line data={trendData} options={chartOptions} />
        </div>

        {/* --- Bottom Summary Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          
          {/* Total Leads Card */}
          <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400 mb-2">
              <span className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-800">
                <Users size={16} />
              </span>
              {t('Total Leads')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.totalLeads.toLocaleString()}
            </div>
          </div>

          {/* Qualified Leads Card */}
          <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 mb-2">
              <span className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-800">
                <BadgePercent size={16} />
              </span>
              {t('Qualified Leads')}
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.totalQualified.toLocaleString()}
              </div>
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                ({summary.qualificationRate}%)
              </span>
            </div>
          </div>

          {/* Converted Leads Card */}
          <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
              <span className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-800">
                <TrendingUp size={16} />
              </span>
              {t('Converted Leads')}
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.totalConverted.toLocaleString()}
              </div>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                ({summary.conversionRate}%)
              </span>
            </div>
          </div>

          {/* Best Performing Period Card */}
          <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-purple-600 dark:text-purple-400 mb-2">
              <span className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-800">
                <CalendarDays size={16} />
              </span>
              {t('Best Period')}
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {summary.bestPeriod}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
