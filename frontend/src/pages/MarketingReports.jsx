import React, { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

import { FaArrowUp, FaArrowDown 
} from 'react-icons/fa'

// --- Mock Data ---

const kpiData = [
  { 
    title: 'Total Revenue', 
    value: '$124,500', 
    change: 15.2, 
    trend: [4000, 3000, 2000, 2780, 1890, 2390, 3490, 4000, 4500, 5000, 6000, 7000] 
  },
  { 
    title: 'Total Ad Spend', 
    value: '$32,400', 
    change: -5.4, 
    trend: [3000, 3500, 3200, 3100, 2900, 2800, 2700, 2600, 2500, 2400, 2300, 2200] 
  },
  { 
    title: 'ROAS', 
    value: '3.84', 
    change: 8.1, 
    trend: [2.1, 2.5, 2.8, 3.0, 3.2, 3.5, 3.6, 3.8, 3.9, 4.0, 4.1, 3.8] 
  },
  { 
    title: 'CPA', 
    value: '$12.50', 
    change: -12.3, // Improvement (lower cost)
    isInverse: true,
    trend: [18, 17, 16, 15, 14, 13, 12, 12, 11, 12, 12, 12] 
  }
]

const campaignsData = [
  { id: 1, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), name: 'Summer Sale Promo', platform: 'meta', status: 'Active', spend: 5400, revenue: 22000, roas: 4.07, impressions: 150000, clicks: 3200, ctr: 2.13, cpc: 1.69, leads: 514, cpl: 10.51, qualifiedLeadsPct: 45 },
  { id: 2, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), name: 'Search - Brand Keywords', platform: 'google', status: 'Active', spend: 3200, revenue: 15000, roas: 4.68, impressions: 80000, clicks: 4500, ctr: 5.62, cpc: 0.71, leads: 390, cpl: 8.21, qualifiedLeadsPct: 62 },
  { id: 3, date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), name: 'TikTok Viral Video #1', platform: 'tiktok', status: 'Paused', spend: 1200, revenue: 1800, roas: 1.5, impressions: 500000, clicks: 2000, ctr: 0.40, cpc: 0.60, leads: 48, cpl: 25.00, qualifiedLeadsPct: 15 },
  { id: 4, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), name: 'Retargeting - Cart Abandon', platform: 'meta', status: 'Active', spend: 2100, revenue: 12500, roas: 5.95, impressions: 45000, clicks: 900, ctr: 2.00, cpc: 2.33, leads: 323, cpl: 6.50, qualifiedLeadsPct: 55 },
  { id: 5, date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), name: 'Display - Awareness', platform: 'google', status: 'Active', spend: 1500, revenue: 2000, roas: 1.33, impressions: 300000, clicks: 1200, ctr: 0.40, cpc: 1.25, leads: 33, cpl: 45.45, qualifiedLeadsPct: 10 },
  { id: 6, date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), name: 'Influencer Collab', platform: 'tiktok', status: 'Active', spend: 4000, revenue: 11000, roas: 2.75, impressions: 800000, clicks: 15000, ctr: 1.88, cpc: 0.27, leads: 266, cpl: 15.04, qualifiedLeadsPct: 25 },
  { id: 7, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), name: 'Organic SEO Traffic', platform: 'web', status: 'Active', spend: 0, revenue: 8500, roas: 0, impressions: 25000, clicks: 4000, ctr: 16.00, cpc: 0, leads: 150, cpl: 0, qualifiedLeadsPct: 70 },
]

// --- Components ---

const KPICard = ({ title, value, change, trend, isInverse }) => {
  const isPositive = change >= 0
  // For cost metrics (like CPA), negative change is usually "good" (green), but usually arrow direction implies value direction.
  // Standard: Green = Good, Red = Bad.
  // If isInverse is true (CPA): Decrease (Negative) is Good (Green). Increase (Positive) is Bad (Red).
  // If isInverse is false (Revenue): Increase (Positive) is Good (Green). Decrease (Negative) is Bad (Red).
  
  const isGood = isInverse ? change <= 0 : change >= 0
  const colorClass = isGood ? 'text-emerald-500' : 'text-rose-500'
  const Icon = change >= 0 ? FaArrowUp : FaArrowDown

  return (
    <div className="card glass-card p-4 flex flex-col justify-between h-32 relative overflow-hidden">
      <div className="flex justify-between items-start z-10">
        <div>
          <p className="text-sm dark:text-white font-medium">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
        </div>
        <div className={`flex items-center text-xs font-bold ${colorClass}  px-2 py-1 rounded-full`}>
          <Icon className="mr-1" size={10} />
          {Math.abs(change)}%
        </div>
      </div>
      
      {/* Sparkline */}
      <div className="absolute bottom-0 left-0 right-0 h-16 min-w-0 min-h-0 opacity-20 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={trend.map((v, i) => ({ v, i }))}>
            <Area type="monotone" dataKey="v" stroke={isGood ? '#10B981' : '#F43F5E'} fill={isGood ? '#10B981' : '#F43F5E'} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const PlatformIcon = ({ platform }) => {
  switch(platform) {
    case 'meta': return <FaFacebook className="text-blue-600" />
    case 'google': return <FaGoogle className="text-yellow-500" />
    case 'tiktok': return <FaTiktok className="text-black dark:text-white" />
    case 'web': return <FaGlobe className="text-green-500" />
    default: return <FaGlobe  />
  }
}

export default function MarketingReports() {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const [startDate, setStartDate] = useState('')

  const kpiData = useMemo(() => [
    { 
      title: t('Total Revenue'), 
      value: '$124,500', 
      change: 15.2, 
      trend: [4000, 3000, 2000, 2780, 1890, 2390, 3490, 4000, 4500, 5000, 6000, 7000] 
    },
    { 
      title: t('Total Ad Spend'), 
      value: '$32,400', 
      change: -5.4, 
      trend: [3000, 3500, 3200, 3100, 2900, 2800, 2700, 2600, 2500, 2400, 2300, 2200] 
    },
    { 
      title: t('ROAS'), 
      value: '3.84', 
      change: 8.1, 
      trend: [2.1, 2.5, 2.8, 3.0, 3.2, 3.5, 3.6, 3.8, 3.9, 4.0, 4.1, 3.8] 
    },
    { 
      title: t('CPA'), 
      value: '$12.50', 
      change: -12.3, // Improvement (lower cost)
      isInverse: true,
      trend: [18, 17, 16, 15, 14, 13, 12, 12, 11, 12, 12, 12] 
    }
  ], [t])

  const [endDate, setEndDate] = useState('')
  const [activeTab, setActiveTab] = useState('monthly')
  const [searchQuery, setSearchQuery] = useState('')
  const [costRevenueView, setCostRevenueView] = useState('chart')
  const reportRef = useRef(null)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)
  const [sourceMetric, setSourceMetric] = useState('leads')
  const [sourceSortDir, setSourceSortDir] = useState('desc')
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  React.useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Reset pagination when tab or filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, startDate, endDate])

  const renderPaginationFooter = (totalItems) => {
    if (totalItems === 0) return null
    
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const shownFrom = (currentPage - 1) * itemsPerPage + 1
    const shownTo = Math.min(currentPage * itemsPerPage, totalItems)

    return (
      <div className="mt-2 flex items-center justify-between rounded-xl p-1.5 sm:p-2 glass-panel">
        <div className="text-[10px] sm:text-xs text-[var(--muted-text)]">
          {isArabic 
            ? `عرض ${shownFrom}–${shownTo} من ${totalItems}`
            : `Showing ${shownFrom}–${shownTo} of ${totalItems}`
          }
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1">
            <button
              className="btn btn-ghost p-1 h-7 w-7 sm:btn-sm sm:h-8 sm:w-8 dark:text-white"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              title={isArabic ? 'السابق' : 'Prev'}
            >
              <ChevronLeft className={`${isArabic ? 'scale-x-[-1]' : ''} dark:text-white`} size={12} />
            </button>
            <span className="text-xs sm:text-sm">{isArabic ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
            <button
              className="btn btn-ghost p-1 h-7 w-7 sm:btn-sm sm:h-8 sm:w-8 dark:text-white"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              title={isArabic ? 'التالي' : 'Next'}
            >
              <ChevronRight className={`${isArabic ? 'scale-x-[-1]' : ''} dark:text-white`} size={12} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs text-[var(--muted-text)]">{isArabic ? 'لكل صفحة:' : 'Per page:'}</span>
            <select
              className="input w-20 sm:w-24 text-xs sm:text-sm h-7 sm:h-8 min-h-0"
              value={itemsPerPage}
              onChange={e => setItemsPerPage(Number(e.target.value))}
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>
      </div>
    )
  }

  // Helper to filter by date range
  const isWithinDateRange = (dateString, start, end) => {
    if (!start && !end) return true
    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)
    
    if (start) {
      const startDate = new Date(start)
      startDate.setHours(0, 0, 0, 0)
      if (date < startDate) return false
    }
    
    if (end) {
      const endDate = new Date(end)
      endDate.setHours(0, 0, 0, 0)
      if (date > endDate) return false
    }
    
    return true
  }

  // Filter Data based on Search
  const filteredCampaigns = useMemo(() => {
    return campaignsData.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.platform.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDate = isWithinDateRange(c.date, startDate, endDate)
      return matchesSearch && matchesDate
    }).sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [searchQuery, startDate, endDate])

  // Derive Source Data from Filtered Campaigns
  const filteredSources = useMemo(() => {
    const stats = {
      meta: { name: t('Meta Ads'), leads: 0, spend: 0, clicks: 0, revenue: 0, fill: '#3B82F6' },
      google: { name: t('Google Ads'), leads: 0, spend: 0, clicks: 0, revenue: 0, fill: '#FACC15' },
      tiktok: { name: t('TikTok Ads'), leads: 0, spend: 0, clicks: 0, revenue: 0, fill: '#FE2C55' }, // Updated Color
      web: { name: t('Organic Search'), leads: 0, spend: 0, clicks: 0, revenue: 0, fill: '#10B981' }
    }

    filteredCampaigns.forEach(c => {
      const p = c.platform
      if (stats[p]) {
        stats[p].leads += c.leads
        stats[p].spend += c.spend
        stats[p].clicks += c.clicks
        stats[p].revenue += c.revenue
      }
    })

    return Object.values(stats)
      .filter(s => s.leads > 0 || s.spend > 0 || s.revenue > 0) // Only show active sources
      .map(s => ({
        ...s,
        cpa: s.leads ? (s.spend / s.leads) : 0,
        conversionRate: s.clicks ? ((s.leads / s.clicks) * 100) : 0
      }))
  }, [filteredCampaigns])

  // Platform Performance Table Data
  const platformTableData = useMemo(() => {
    const totalSpend = filteredSources.reduce((sum, s) => sum + s.spend, 0)
    const totalRevenue = filteredSources.reduce((sum, s) => sum + s.revenue, 0)
    
    const rows = filteredSources.map(s => {
      const profit = s.revenue - s.spend
      const roi = s.spend > 0 ? (s.revenue / s.spend) : 0
      const costPct = totalSpend > 0 ? (s.spend / totalSpend) * 100 : 0
      const revenuePct = totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0
      
      return {
        ...s,
        profit,
        roi,
        costPct,
        revenuePct
      }
    })

    // Sort by Spend desc by default for this table
    rows.sort((a, b) => b.spend - a.spend)

    const totalRow = {
      name: 'Total',
      spend: totalSpend,
      revenue: totalRevenue,
      profit: totalRevenue - totalSpend,
      roi: totalSpend > 0 ? (totalRevenue / totalSpend) : 0,
      costPct: 100,
      revenuePct: 100,
      isTotal: true
    }

    return [...rows, totalRow]
  }, [filteredSources])

  const sourceMetricLabel = (k) => {
    if (k === 'leads') return t('Leads')
    if (k === 'spend') return t('Spend')
    if (k === 'conversionRate') return t('Conv. Rate')
    if (k === 'cpa') return t('CPA')
    return k
  }

  const formatMetricValue = (k, v) => {
    if (k === 'spend') return `$${Number(v).toLocaleString()}`
    if (k === 'conversionRate') return `${Number(v).toFixed(1)}%`
    if (k === 'cpa') return `$${Number(v).toFixed(2)}`
    return Number(v).toLocaleString()
  }

  const sortedSources = useMemo(() => {
    const arr = [...filteredSources]
    const key = sourceMetric
    arr.sort((a, b) => {
      const av = Number(a[key] || 0)
      const bv = Number(b[key] || 0)
      return sourceSortDir === 'asc' ? av - bv : bv - av
    })
    return arr
  }, [filteredSources, sourceMetric, sourceSortDir])

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max)
  const sourceChartHeight = useMemo(() => {
    const perRow = 34
    const padding = 80
    const count = Math.max(1, sortedSources.length)
    const minH = vw >= 1280 ? 380 : vw >= 1024 ? 360 : vw >= 768 ? 340 : 320
    const maxH = vw >= 1280 ? 600 : vw >= 1024 ? 560 : vw >= 768 ? 520 : 480
    return clamp(count * perRow + padding, minH, maxH)
  }, [sortedSources, vw])

  // Derive Chart Data from Filtered Campaigns
  const filteredChartData = useMemo(() => {
    // Group by date
    const grouped = {}
    
    filteredCampaigns.forEach(c => {
      const dateKey = new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, meta_cost: 0, google_cost: 0, tiktok_cost: 0, web_cost: 0, revenue: 0 }
      }
      grouped[dateKey][`${c.platform}_cost`] += c.spend
      grouped[dateKey].revenue += c.revenue
    })

    return Object.values(grouped)
  }, [filteredCampaigns])
  const costRevenueChartWidth = useMemo(() => {
    const base = vw >= 1280 ? 800 : vw >= 1024 ? 700 : vw >= 768 ? 620 : 520
    const perPoint = vw >= 1280 ? 70 : vw >= 1024 ? 60 : vw >= 768 ? 50 : 42
    const len = Math.max(1, filteredChartData.length)
    return Math.max(base, len * perPoint)
  }, [filteredChartData, vw])
  // Horizontal scroll is handled by container overflow; UI indicators removed per request

  // Derive Monthly Data
  const monthlyData = useMemo(() => {
    const grouped = {}
    
    filteredCampaigns.forEach(c => {
      const date = new Date(c.date)
      const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' })
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = { 
          month: monthKey, 
          sortDate: date, // For sorting
          spend: 0, 
          revenue: 0, 
          leads: 0, 
          clicks: 0, 
          impressions: 0 
        }
      }
      
      grouped[monthKey].spend += c.spend
      grouped[monthKey].revenue += c.revenue
      grouped[monthKey].leads += c.leads
      grouped[monthKey].clicks += c.clicks
      grouped[monthKey].impressions += c.impressions
    })
    
    return Object.values(grouped)
      .sort((a, b) => b.sortDate - a.sortDate) // Sort by date descending
      .map(m => ({
        ...m,
        roas: m.spend ? (m.revenue / m.spend).toFixed(2) : 0,
        cpa: m.leads ? (m.spend / m.leads).toFixed(2) : 0,
        ctr: m.impressions ? ((m.clicks / m.impressions) * 100).toFixed(2) : 0
      }))
  }, [filteredCampaigns])

  const handleExport = async () => {
    if (!reportRef.current) return
    
    try {
      // Temporarily hide the export button for the screenshot
      const exportBtn = reportRef.current.querySelector('.export-btn-container')
      if (exportBtn) exportBtn.style.display = 'none'

      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight
      })
      
      // Restore the button
      if (exportBtn) exportBtn.style.display = ''

      const imgData = canvas.toDataURL('image/png')
      
      // Calculate dimensions to fit width but keep aspect ratio for height
      // A4 width in mm is 210
      const pdfWidth = 210
      const pxToMm = 25.4 / 96 // approx conversion, but better to rely on aspect ratio
      
      const imgWidthPx = canvas.width
      const imgHeightPx = canvas.height
      
      const pdfHeight = (imgHeightPx * pdfWidth) / imgWidthPx
      
      // Create PDF with custom height
      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight])
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save('marketing-report.pdf')
    } catch (err) {
      console.error('Error exporting PDF:', err)
      alert(t('Failed to export PDF'))
    }
  }

  const exportPdf = () => {
    handleExport()
  }

  const exportExcel = () => {
    handleExport()
  }

  return (
    <div ref={reportRef} className="p-4 space-y-6 pb-24 relative">
      <BackButton to="/reports" />

      {/* 1. Header */}
      <div className="flex items-center justify-between gap-4 border-b border-theme-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">{t('Marketing Pulse')}</h1>
          <p className="text-sm ">{t('Overview of your marketing performance across all channels')}</p>
        </div>
      <div className="flex justify-end gap-2 mb-4 export-btn-container">
        <button onClick={handleExport} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                  <span className="flex items-center gap-2">
                    <FaFileExport  />
                    {isArabic ? 'تصدير' : 'Export'}
                  </span>
        </button>
      </div>
      </div>

      {/* Filter Section */}
      <div className="card p-4 sm:p-6 bg-transparent rounded-2xl border border-theme-border" style={{ backgroundColor: 'transparent' }}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FaFilter className="text-blue-500" /> {t('Filter')}
          </h2>
          <button 
            onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate('') }} 
            className="px-3 py-1.5 text-sm  dark:text-white hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            {t('Reset')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <FaSearch className="text-blue-500" size={10} /> {t('Search')}
            </label>
            <input 
              className="input w-full" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder={t('Search campaigns or sources...')} 
            />
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{t('From')}</label>
            <input 
              type="date"
              className="input w-full" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{t('To')}</label>
            <input 
              type="date"
              className="input w-full" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 2. KPI Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      {/* 3. Cost vs Revenue by Platform (Dual Axis) */}
      <div className="card glass-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">{t('Cost vs. Revenue by Platform')}</h3>
          <div className="flex  p-1 rounded-lg">
            <button
              onClick={() => setCostRevenueView('chart')}
              className={`p-2 rounded-md transition-all ${
                costRevenueView === 'chart' 
                  ? 'shadow text-blue-600' 
                  : ' hover:text-gray-700 dark:text-white'
              }`}
              title={t('Chart View')}
            >
              <FaChartBar />
            </button>
            <button
              onClick={() => setCostRevenueView('table')}
              className={`p-2 rounded-md transition-all ${
                costRevenueView === 'table' 
                  ? ' shadow text-blue-600' 
                  : ' hover:text-gray-700 dark:text-white'
              }`}
              title={t('Table View')}
            >
              <FaTable />
            </button>
          </div>
        </div>

        {costRevenueView === 'chart' ? (
        <div className="w-full overflow-x-auto min-w-0 min-h-0">
          <div className="min-w-0 min-h-0" style={{ width: costRevenueChartWidth, height: 320 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <ComposedChart data={filteredChartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                
                {/* Left Y Axis: Cost */}
                <YAxis yAxisId="left" tick={{fontSize: 12}} tickLine={false} axisLine={false} label={{ value: t('Cost ($)'), angle: -90, position: 'insideLeft', offset: 0, style: { fill: '#6B7280' } }} />
                
                {/* Right Y Axis: Revenue */}
                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} tickLine={false} axisLine={false} label={{ value: t('Revenue ($)'), angle: 90, position: 'insideRight', offset: 0, style: { fill: '#10B981' } }} />
                
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#111827' }}
                  labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36}/>
                
                {/* Stacked Bars for Costs */}
                <Bar yAxisId="left" dataKey="meta_cost" name="Meta Cost" stackId="a" fill="#3B82F6" radius={[0, 0, 4, 4]} barSize={20} />
                <Bar yAxisId="left" dataKey="google_cost" name="Google Cost" stackId="a" fill="#FACC15" radius={[0, 0, 0, 0]} barSize={20} />
                <Bar yAxisId="left" dataKey="tiktok_cost" name="TikTok Cost" stackId="a" fill="#FE2C55" radius={[4, 4, 0, 0]} barSize={20} />

                {/* Line for Revenue */}
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {platformTableData.map((row, i) => (
                <div key={i} className={`p-4 rounded-xl border ${row.isTotal ? 'bg-theme-bg/50 border-theme-border' : 'bg-theme-bg border-theme-border'} shadow-sm`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {!row.isTotal && (
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.fill }} />
                      )}
                      <span className={`font-medium ${row.isTotal ? 'text-base' : 'text-sm'}`}>
                        {row.isTotal ? t('Total') : row.name}
                      </span>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        row.roi >= 2 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        row.roi >= 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      ROI: {row.roi.toFixed(1)}x
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-[var(--muted-text)] text-xs mb-1">💰 {t('Spend')}</div>
                      <div className="font-medium">{Number(row.spend).toLocaleString()} EGP</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[var(--muted-text)] text-xs mb-1">💵 {t('Revenue')}</div>
                      <div className="font-medium">{Number(row.revenue).toLocaleString()} EGP</div>
                    </div>
                    <div>
                      <div className="text-[var(--muted-text)] text-xs mb-1">{t('Profit / Loss')}</div>
                      <div className={`font-medium ${row.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {row.profit >= 0 ? '+' : ''}{Number(row.profit).toLocaleString()} EGP
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16">{t('Cost %')}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${row.costPct}%` }} />
                      </div>
                      <span className="text-xs w-8 text-right">{row.costPct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16">{t('Rev %')}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${row.revenuePct}%` }} />
                      </div>
                      <span className="text-xs w-8 text-right">{row.revenuePct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="table w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-theme-border ">
                    <th className="p-3 font-semibold">{t('Platform')}</th>
                    <th className="p-3 font-semibold text-right">💰 {t('Spend (EGP)')}</th>
                    <th className="p-3 font-semibold text-right">💵 {t('Revenue (EGP)')}</th>
                    <th className="p-3 font-semibold text-center">{t('ROI')}</th>
                    <th className="p-3 font-semibold text-right">{t('Profit / Loss')}</th>
                    <th className="p-3 font-semibold text-center">{t('Cost %')}</th>
                    <th className="p-3 font-semibold text-center">{t('Revenue %')}</th>
                  </tr>
                </thead>
                <tbody>
                  {platformTableData.map((row, i) => (
                    <tr 
                      key={i} 
                      className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${
                        row.isTotal 
                          ? ' font-bold border-t-2 border-gray-300 dark:border-gray-600  dark:text-white' 
                          : 'hover:bg-black/5 dark:hover:bg-white/5 dark:text-white'
                      }`}
                    >
                      <td className="p-3 flex items-center gap-2">
                        {!row.isTotal && (
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: row.fill }}
                          />
                        )}
                        <span className={row.isTotal ? 'text-base' : ''}>
                          {row.isTotal ? t('Total') : row.name}
                        </span>
                      </td>
                      <td className="p-3 text-right">{Number(row.spend).toLocaleString()} EGP</td>
                      <td className="p-3 text-right">{Number(row.revenue).toLocaleString()} EGP</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          row.roi >= 2 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          row.roi >= 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {row.roi.toFixed(1)}x
                        </span>
                      </td>
                      <td className={`p-3 text-right font-medium ${row.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {row.profit >= 0 ? '+' : ''}{Number(row.profit).toLocaleString()} EGP
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs">{row.costPct.toFixed(0)}%</span>
                          <div className="w-12 h-1.5  rounded-full overflow-hidden">
                            <div className="h-full " style={{ width: `${row.costPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs">{row.revenuePct.toFixed(0)}%</span>
                          <div className="w-12 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${row.revenuePct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {platformTableData.length === 1 && ( // Only Total row exists means no data
                    <tr>
                      <td colSpan={7} className="p-4 text-center dark:text-white">
                        {t('No data available')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 4. Campaign & Source Performance (Tabs) */}
      <div className="card glass-card overflow-visible">
        {/* Tabs Header */}
        <div className="border-b border-theme-border">
          <div className="flex">
            <button 
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'monthly' ? 'border-primary text-primary' : 'border-transparent  hover:text-gray-700'}`}
              onClick={() => setActiveTab('monthly')}
            >
              {t('Monthly Marketing Overview')}
            </button>
            <button 
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'campaigns' ? 'border-primary text-primary' : 'border-transparent  hover:text-gray-700'}`}
              onClick={() => setActiveTab('campaigns')}
            >
              {t('Campaign Summary')}
            </button>
            <button 
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sources' ? 'border-primary text-primary' : 'border-transparent  hover:text-gray-700'}`}
              onClick={() => setActiveTab('sources')}
            >
              {t('Lead Source Performance')}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'monthly' && (
            <div>
              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4 mb-4">
                {monthlyData.length > 0 ? (
                  monthlyData
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((m, idx) => (
                      <div key={`${m.month}-${idx}`} className="card glass-card p-4 space-y-3 bg-theme-bg border border-theme-border rounded-lg">
                        <div className="flex items-center justify-between border-b border-theme-border pb-3">
                          <h4 className="font-semibold text-sm">{m.month}</h4>
                          <span className="text-xs px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            ROAS: {m.roas}x
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-text)] text-xs">{t('Spend')}</span>
                            <span className="font-mono font-medium">${m.spend.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-text)] text-xs">{t('Revenue')}</span>
                            <span className="font-mono font-medium text-emerald-600">${m.revenue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-text)] text-xs">{t('Leads')}</span>
                            <span className="font-semibold">{m.leads}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-text)] text-xs">{t('CPA')}</span>
                            <span className="font-mono font-medium">${m.cpa}</span>
                          </div>
                          <div className="col-span-2 flex justify-between">
                            <span className="text-[var(--muted-text)] text-xs">{t('CTR')}</span>
                            <span className="font-medium">{m.ctr}%</span>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-[var(--muted-text)]">
                    {t('No data available for this period.')}
                  </div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table w-full text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th className="rounded-l-lg">{t('Month')}</th>
                      <th className="text-right">{t('Spend')}</th>
                      <th className="text-right">{t('Revenue')}</th>
                      <th className="text-right">{t('ROAS')}</th>
                      <th className="text-right">{t('Leads')}</th>
                      <th className="text-right">{t('CPA')}</th>
                      <th className="rounded-r-lg text-right">{t('CTR')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.length > 0 ? (
                      monthlyData
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((m, idx) => (
                          <tr key={idx} className="hover:backdrop-blur-lg hover:shadow-sm transition-all border-b border-gray-100 dark:border-gray-800 last:border-0">
                            <td className="font-medium">{m.month}</td>
                            <td className="font-mono text-right">${m.spend.toLocaleString()}</td>
                            <td className="font-mono text-right text-emerald-600">${m.revenue.toLocaleString()}</td>
                            <td className="font-bold text-right">{m.roas}x</td>
                            <td className="text-right">{m.leads}</td>
                            <td className="font-mono text-right">${m.cpa}</td>
                            <td className="text-right">{m.ctr}%</td>
                          </tr>
                        ))
                    ) : (
                      <tr><td colSpan="7" className="text-center py-8">{t('No data available for this period.')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPaginationFooter(monthlyData.length)}
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4 mb-4">
                {filteredCampaigns.length > 0 ? (
                  filteredCampaigns
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((campaign) => (
                      <div key={campaign.id} className="card glass-card p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full shrink-0  dark:text-white">
                              <PlatformIcon platform={campaign.platform} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">{campaign.name}</h4>
                              <p className="text-xs text-[var(--muted-text)]">{t(campaign.platform)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                              ROAS: {campaign.roas}x
                            </span>
                          </div>
                        </div>
                        
                        {/* Grid Stats */}
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--muted-text)] text-xs">{t('Spend')}</span>
                            <span className="font-mono font-medium">${campaign.spend.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--muted-text)] text-xs">{t('Impressions')}</span>
                            <span className="font-mono font-medium">{campaign.impressions.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--muted-text)] text-xs">{t('Clicks')}</span>
                            <span className="font-mono font-medium">{campaign.clicks.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--muted-text)] text-xs">{t('CTR')}</span>
                            <span className="font-medium">{campaign.ctr}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--muted-text)] text-xs">{t('CPC')}</span>
                            <span className="font-mono font-medium">${campaign.cpc}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--muted-text)] text-xs">{t('Leads')}</span>
                            <span className="font-bold">{campaign.leads}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--muted-text)] text-xs">{t('CPL')}</span>
                            <span className="font-mono font-medium">${campaign.cpl}</span>
                          </div>
                          
                          <div className="col-span-2 space-y-1 pt-2 border-t border-theme-border mt-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[var(--muted-text)] text-xs">{t('Qual. Leads %')}</span>
                              <span className="text-xs font-medium">{campaign.qualifiedLeadsPct}%</span>
                            </div>
                            <div className="w-full  rounded-full h-1.5 overflow-hidden">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${campaign.qualifiedLeadsPct}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-[var(--muted-text)]">
                    {t('No campaigns found matching your search.')}
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="table w-full text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th className="rounded-l-lg">{t('Campaign')}</th>
                      <th className="text-right">{t('Spend')}</th>
                      <th className="text-right">{t('Impressions')}</th>
                      <th className="text-right">{t('Clicks / CTR')}</th>
                      <th className="text-right">{t('CPC')}</th>
                      <th className="text-right">{t('Leads')}</th>
                      <th className="text-right">{t('CPL')}</th>
                      <th className="text-right">{t('Qual. Leads %')}</th>
                      <th className="rounded-r-lg text-right">{t('ROAS')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.length > 0 ? (
                      filteredCampaigns
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((campaign) => (
                          <tr key={campaign.id} className="  hover:backdrop-blur-lg hover:shadow-sm transition-all border-b border-gray-100 dark:border-gray-800 last:border-0">
                            <td>
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full  shrink-0">
                                  <PlatformIcon platform={campaign.platform} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium">{campaign.name}</span>
                                    <span className="text-xs ">{t(campaign.platform)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="font-mono text-right">${campaign.spend.toLocaleString()}</td>
                            <td className="font-mono text-right">{campaign.impressions.toLocaleString()}</td>
                            <td className="text-right">
                                <div className="flex flex-col items-end">
                                    <span className="font-mono">{campaign.clicks.toLocaleString()}</span>
                                    <span className="text-xs ">{campaign.ctr}%</span>
                                </div>
                            </td>
                            <td className="font-mono text-right">${campaign.cpc}</td>
                            <td className="font-bold text-right">{campaign.leads}</td>
                            <td className="font-mono text-right">${campaign.cpl}</td>
                            <td className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <div className="w-16  rounded-full h-1.5 overflow-hidden">
                                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${campaign.qualifiedLeadsPct}%` }}></div>
                                    </div>
                                    <span className="text-xs">{campaign.qualifiedLeadsPct}%</span>
                                </div>
                            </td>
                            <td className="font-bold text-right text-green-600 dark:text-green-400">{campaign.roas}x</td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center py-8 ">
                          {t('No campaigns found matching your search.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPaginationFooter(filteredCampaigns.length)}
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Bar Chart */}
              <div>
                <h4 className="text-sm font-semibold mb-4 text-center">{t('Leads by Source')}</h4>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {['leads','spend','conversionRate','cpa'].map((m) => (
                      <button
                        key={m}
                        className={`px-2 py-1 text-xs rounded-md ${sourceMetric === m ? 'bg-primary text-white' : 'btn btn-ghost'}`}
                        onClick={() => setSourceMetric(m)}
                        title={sourceMetricLabel(m)}
                      >
                        {sourceMetricLabel(m)}
                      </button>
                    ))}
                  </div>
                  <button
                    className="px-2 py-1 text-xs rounded-md btn btn-ghost"
                    onClick={() => setSourceSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                    title={sourceSortDir === 'desc' ? (isArabic ? 'ترتيب تنازلي' : 'Sort Desc') : (isArabic ? 'ترتيب تصاعدي' : 'Sort Asc')}
                  >
                    {sourceSortDir === 'desc' ? (isArabic ? '↘︎ تنازلي' : '↘︎ Desc') : (isArabic ? '↗︎ تصاعدي' : '↗︎ Asc')}
                  </button>
                </div>
                <div className="w-full overflow-y-auto min-w-0 min-h-0" style={{ maxHeight: clamp(sourceChartHeight, 320, vw >= 1280 ? 600 : vw >= 1024 ? 560 : vw >= 768 ? 520 : 480) }}>
                  <div className="min-w-0 min-h-0" style={{ height: sourceChartHeight }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={sortedSources} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" opacity={0.5} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                      <Tooltip 
                         cursor={{fill: 'transparent'}} 
                         contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                         itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#111827' }}
                         labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '0.25rem' }}
                         formatter={(value) => [formatMetricValue(sourceMetric, value), sourceMetricLabel(sourceMetric)]}
                       />
                    <Bar dataKey={sourceMetric} radius={[0, 4, 4, 0]} barSize={30} name={sourceMetricLabel(sourceMetric)}>
                      {sortedSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList dataKey={sourceMetric} position="right" formatter={(v) => formatMetricValue(sourceMetric, v)} fill="#6B7280" />
                    </Bar>
                  </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Right: Summary Table */}
              <div>
                 <h4 className="text-sm font-semibold mb-4">{t('Performance Breakdown')}</h4>
                 
                 {/* Desktop Table */}
                 <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                   <table className="table w-full text-sm">
                     <thead >
                       <tr>
                         <th>{t('Source')}</th>
                         <th className="text-right">{t('Leads')}</th>
                         <th className="text-right">{t('CPA')}</th>
                         <th className="text-right">{t('Conv. Rate')}</th>
                       </tr>
                     </thead>
                     <tbody>
                       {sortedSources
                         .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                         .map((source, idx) => (
                         <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                           <td className="font-medium flex items-center gap-2">
                             <span className="w-3 h-3 rounded-full" style={{ backgroundColor: source.fill }}></span>
                             {source.name}
                           </td>
                           <td className="text-right font-bold">{source.leads}</td>
                           <td className="text-right font-mono">${Number(source.cpa).toFixed(2)}</td>
                           <td className="text-right">{Number(source.conversionRate).toFixed(1)}%</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>

                 {/* Mobile Cards */}
                 <div className="md:hidden space-y-4">
                   {sortedSources
                     .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                     .map((source, idx) => (
                     <div key={idx} className="card glass-card p-4 space-y-3 border border-gray-100 dark:border-gray-800">
                       <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                         <div className="flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full" style={{ backgroundColor: source.fill }}></span>
                           <h4 className="font-semibold text-sm">{source.name}</h4>
                         </div>
                         <span className="font-bold text-sm">{source.leads} {t('Leads')}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4 text-sm">
                         <div className="flex flex-col">
                           <span className="text-[var(--muted-text)] text-xs">{t('CPA')}</span>
                           <span className="font-mono font-medium">${Number(source.cpa).toFixed(2)}</span>
                         </div>
                         <div className="flex flex-col text-right">
                           <span className="text-[var(--muted-text)] text-xs">{t('Conv. Rate')}</span>
                           <span className="font-medium">{Number(source.conversionRate).toFixed(1)}%</span>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
