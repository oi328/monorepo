import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../utils/api'
import { PieChart } from '../shared/components/PieChart'
import { FaFileExport, FaFilePdf, FaFileExcel, FaChevronDown, FaFacebook, FaWhatsapp, FaGoogle } from 'react-icons/fa'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { logExportEvent } from '../utils/api'
import { useAppState } from '../shared/context/AppStateProvider'

// --- Helper Components from original file ---
function Sparkline({ data = [], color = 'emerald', width = 120, height = 36, padding = 6 }) {
  const w = width
  const h = height
  const p = padding
  if (!Array.isArray(data) || data.length < 2) return <svg width={w} height={h} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = (w - p * 2) / (data.length - 1)
  const points = data.map((v, i) => {
    const x = p + i * stepX
    const y = h - p - ((v - min) / range) * (h - p * 2)
    return `${x},${y}`
  }).join(' ')
  const stroke =
    color === 'emerald' ? '#10b981' :
    color === 'rose' ? '#ef4444' :
    color === 'blue' ? '#3b82f6' : '#94a3b8'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80">
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
    </svg>
  )
}

function CountUp({ value = 0, duration = 600 }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    const to = value
    prev.current = to
    const start = performance.now()
    const step = (ts) => {
      const p = Math.min(1, (ts - start) / duration)
      const v = Math.round(from + (to - from) * p)
      setDisplay(v)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value, duration])
  return <span>{display}</span>
}

function ChannelXAxisLabel(props) {
  const viewBox = props.viewBox || {}
  const x = (viewBox.x || 0) + (viewBox.width || 0)
  const y = (viewBox.y || 0) + (viewBox.height || 0) + 20
  return (
    <text x={x} y={y} textAnchor="end" fill="var(--muted-text)" fontSize={12}>
      {props.value}
    </text>
  )
}

export default function Marketing() {
  const { t, i18n } = useTranslation()
  const isRTL = (i18n.language || '').toLowerCase() === 'ar'
  const { user } = useAppState()

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const hasExplicitMarketingPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Marketing')
  const marketingModulePerms = hasExplicitMarketingPerms && Array.isArray(modulePermissions.Marketing) ? modulePermissions.Marketing : []
  const effectiveMarketingPerms = hasExplicitMarketingPerms ? marketingModulePerms : (() => {
    const role = user?.role || ''
    if (role === 'Tenant Admin' || role === 'Admin') return ['showMarketingDashboard', 'showCampaign', 'addLandingPage', 'integration']
    if (role === 'Director') return ['showMarketingDashboard', 'showCampaign', 'addLandingPage', 'integration']
    if (role === 'Marketing Manager') return ['showMarketingDashboard', 'showCampaign', 'addLandingPage', 'integration']
    if (role === 'Marketing Moderator') return ['showMarketingDashboard', 'showCampaign']
    if (role === 'Sales Admin') return ['showMarketingDashboard', 'showCampaign', 'addLandingPage']
    return []
  })()
  const roleLower = String(user?.role || '').toLowerCase()
  const canViewDashboard =
    effectiveMarketingPerms.includes('showMarketingDashboard') ||
    user?.is_super_admin ||
    roleLower === 'admin' ||
    roleLower.includes('tenant admin') ||
    roleLower.includes('tenant-admin') ||
    roleLower.includes('director')

  if (!canViewDashboard) {
    return (
      <div className="pt-6 px-4 sm:px-6">
        <div className="alert alert-warning max-w-xl">
          <span>{isRTL ? 'ليس لديك صلاحية عرض لوحة التسويق.' : 'You do not have permission to view the Marketing dashboard.'}</span>
        </div>
      </div>
    )
  }

  // --- Real Data/State ---
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState({ active: 0, inactive: 0, paused: 0 })
  const [channels, setChannels] = useState([])
  const [campaignsList, setCampaignsList] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/reports/campaigns/dashboard')
      if (res.data) {
        setOverview(res.data.overview || { active: 0, inactive: 0, paused: 0 })
        setChannels(res.data.channels || [])
        setCampaignsList(res.data.campaigns_list || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalActive = overview.active
  const totalInactive = overview.inactive
  const totalPaused = overview.paused

  const [prevOverview, setPrevOverview] = useState(null)
  useEffect(() => {
    if (!loading) {
        setPrevOverview({
        totalActive,
        totalInactive,
        totalPaused
        })
    }
  }, [totalActive, totalInactive, totalPaused, loading])

  const pctDelta = (current, prev) => {
    if (typeof prev !== 'number' || prev === 0) return 0
    return Number((((current - prev) / prev) * 100).toFixed(1))
  }

  const [metric, setMetric] = useState('leads')
  const [showCostRevenueExport, setShowCostRevenueExport] = useState(false)
  const [showMonthlyOverviewExport, setShowMonthlyOverviewExport] = useState(false)

  const costRevenueExportRef = useRef(null)
  const monthlyOverviewExportRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (costRevenueExportRef.current && !costRevenueExportRef.current.contains(event.target)) {
        setShowCostRevenueExport(false);
      }
      if (monthlyOverviewExportRef.current && !monthlyOverviewExportRef.current.contains(event.target)) {
        setShowMonthlyOverviewExport(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const costRevenueData = channels
  const chartData = channels.map(c => ({
      name: c.channel,
      leads: Number(c.leads) || 0,
      spend: Number(c.spend) || 0
  }))
  const monthlyOverviewData = campaignsList

  const handleExportCostRevenue = (type) => {
    if (type === 'csv') {
      const ws = XLSX.utils.json_to_sheet(costRevenueData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "CostRevenue");
      const fileName = "cost_revenue.csv";
      XLSX.writeFile(wb, fileName);
      logExportEvent({
        module: 'Marketing Dashboard',
        fileName,
        format: 'csv',
      });
    } else {
      const doc = new jsPDF();
      const tableColumn = ["Channel", "Spend", "Revenue", "ROI", "Profit", "Spend %", "Revenue %"];
      const tableRows = costRevenueData.map(item => [
        item.channel,
        item.spend,
        item.revenue,
        item.roi,
        item.profit,
        item.spendPct,
        item.revenuePct
      ]);
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
      });
      doc.save("cost_revenue.pdf");
      logExportEvent({
        module: 'Marketing Dashboard',
        fileName: 'cost_revenue.pdf',
        format: 'pdf',
      });
    }
    setShowCostRevenueExport(false);
  }

  const handleExportMonthlyOverview = (type) => {
     if (type === 'csv') {
      const ws = XLSX.utils.json_to_sheet(monthlyOverviewData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "MonthlyOverview");
      const fileName = "monthly_overview.csv";
      XLSX.writeFile(wb, fileName);
      logExportEvent({
        module: 'Marketing Dashboard',
        fileName,
        format: 'csv',
      });
    } else {
      const doc = new jsPDF();
      const tableColumn = ["Month", "Campaign", "Channel", "Spend", "Revenue", "Leads", "CPL", "CPA"];
      const tableRows = monthlyOverviewData.map(item => [
        item.month,
        item.campaign,
        item.channel,
        item.spend,
        item.revenue,
        item.leads,
        item.cpl,
        item.cpa
      ]);
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
      });
      doc.save("monthly_overview.pdf");
      logExportEvent({
        module: 'Marketing Dashboard',
        fileName: 'monthly_overview.pdf',
        format: 'pdf',
      });
    }
    setShowMonthlyOverviewExport(false);
  }

  return (
    <div className={`p-4 md:p-6 min-h-screen space-y-6`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold dark:text-white">
          {t('Welcome Marketing Dashboard,')}
        </h1>
      </div>

      {/* Top Section: Overview & Channel Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Overview (Span 7) */}
        <div className="lg:col-span-7">
            <section className="card glass-card p-4 h-full">
                <h3 className="text-lg font-semibold mb-3">{t('Overview')}</h3>
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="flex-shrink-0">
                        <PieChart
                          percentage={80}
                          centerValue={totalActive}
                          centerLabel={`${t('Total Active Campaigns')}:`}
                          centerLabelPosition="below"
                          subLabel={t('Last 30 Days')}
                          size={200}
                          primaryColor="#2dd4bf"
                          secondaryColor="#475569"
                          cutout="72%"
                          spacing={0}
                          borderRadius={12}
                          centerValueClass="text-3xl font-bold"
                          centerLabelClass="text-[11px] text-[var(--muted-text)] mt-1"
                          subLabelClass="text-[10px] text-[var(--muted-text)] mt-0.5 text-center"
                        
                        />
                    </div>
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="card glass-card p-3">
                          <div className="text-xs font-medium text-[var(--muted-text)]">{t('Active')}</div>
                          <div className="text-2xl font-bold"><span><CountUp value={totalActive} /></span></div>
                          <div className="text-xs text-emerald-500">
                            {pctDelta(totalActive, prevOverview?.totalActive)}% {t('vs Last Month')}
                          </div>
                        </div>
                        <div className="card glass-card p-3">
                          <div className="text-xs font-medium text-[var(--muted-text)]">{t('Inactive')}</div>
                          <div className="text-2xl font-bold"><span><CountUp value={totalInactive} /></span></div>
                          <div className="text-xs text-amber-500">
                            {pctDelta(totalInactive, prevOverview?.totalInactive)}% {t('vs Last Month')}
                          </div>
                        </div>
                        <div className="card glass-card p-3">
                          <div className="text-xs font-medium text-[var(--muted-text)]">{t('Paused')}</div>
                          <div className="text-2xl font-bold"><span><CountUp value={totalPaused} /></span></div>
                          <div className="text-xs text-rose-500">
                            {pctDelta(totalPaused, prevOverview?.totalPaused)}% {t('vs Last Month')}
                          </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        {/* Top Active Campaigns Channel Performance (Span 5) */}
        <div className="xl:col-span-5">
             <section className="card glass-card p-4 h-full min-h-[300px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text">
                    {t('Top Active Campaigns Channel Performance')}
                  </h3>
                  <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-1 py-1">
                    <button 
                      onClick={() => setMetric('leads')} 
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${metric === 'leads' ? 'bg-blue-500 text-white shadow-sm' : 'dark:text-white hover:bg-gray-50 dark:hover:bg-gray-50'}`}
                    >
                      {t('Leads')}
                    </button>
                    <button 
                      onClick={() => setMetric('spend')} 
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${metric === 'spend' ? 'bg-amber-500 text-white shadow-sm' : 'dark:text-white hover:bg-gray-50 dark:hover:bg-gray-50'}`}
                    >
                      {t('Spend')}
                    </button>
                  </div>
                </div>
                <div className="w-full h-[250px] lg:h-[300px] min-w-0">
                  {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12 }} 
                        dy={10}
                        label={<ChannelXAxisLabel value={t('Channel')} />}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12 }}
                        label={{ value: metric === 'spend' ? t('Spend') : t('Leads'), angle: -90, position: 'left', offset: 0, fill: 'var(--muted-text)', fontSize: 12 }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',color:'#000' }}
                      />
                      {metric === 'leads' && (
                        <Bar dataKey="leads" name={t('Leads')} fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                      )}
                      {metric === 'spend' && (
                        <Bar dataKey="spend" name={t('Spend')} fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      {loading ? t('Loading...') : t('No data available')}
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                  {t('Last 30 Days')}
                </div>
             </section>
        </div>

      </div>

      {/* Middle Section: Cost & Revenue Table */}
      <div className="grid grid-cols-1">
          <section className="card glass-card p-4">
            <h3 className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              {t('Cost & Revenue')}
          <div className="relative" ref={costRevenueExportRef}>
            <button
              onClick={() => setShowCostRevenueExport(!showCostRevenueExport)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <FaFileExport /> {isRTL ? 'تصدير' : 'Export'}
              <FaChevronDown
                className={`transform transition-transform duration-200 ${showCostRevenueExport ? 'rotate-180' : ''}`}
                size={12}
              />
            </button>
            {showCostRevenueExport && (
              <div
                className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-1 bg-[var(--dropdown-bg)] rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 w-48`}
              >
                <button
                  onClick={() => handleExportCostRevenue('csv')}
                  className="w-full text-start px-4 py-2 text-sm hover:bg-blue-900/30 flex items-center gap-2 dark:text-white transition-colors"
                >
                  <FaFileExcel className="text-green-600" /> {isRTL ? 'تصدير كـ Excel' : 'Export to Excel'}
                </button>
                <button
                  onClick={() => handleExportCostRevenue('pdf')}
                  className="w-full text-start px-4 py-2 text-sm hover:bg-blue-900/30 flex items-center gap-2 dark:text-white transition-colors"
                >
                  <FaFilePdf className="text-red-600" /> {isRTL ? 'تصدير كـ PDF' : 'Export to PDF'}
                </button>
              </div>
            )}
          </div>
            </h3>
            
            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-4">
              {costRevenueData.map((row, idx) => (
                <div key={idx} className="  p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                    <div className="flex items-center gap-2 font-medium dark:text-white">
                      {row.channel === 'Facebook' && <FaFacebook className="text-blue-600" />}
                      {row.channel === 'WhatsApp' && <FaWhatsapp className="text-green-500" />}
                      {row.channel === 'Google' && <FaGoogle className="text-red-500" />}
                      {row.channel}
                    </div>
                    <div className={`font-semibold ${row.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {row.profit}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[var(--muted-text)] block text-xs mb-1">{t('Spend')}</span>
                      <span className="font-mono font-medium dark:text-gray-200">{row.spend}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-text)] block text-xs mb-1">{t('Revenue')}</span>
                      <span className="font-mono font-medium dark:text-gray-200">{row.revenue}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-text)] block text-xs mb-1">{t('ROI')}</span>
                      <span className="text-green-600 font-semibold">{row.roi}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-text)] block text-xs mb-1">{t('Profit/Lose')}</span>
                       <span className={`font-semibold ${row.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {row.profit}
                      </span>
                    </div>
                     <div className="col-span-2 grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700/50 mt-1">
                        <div>
                            <span className="text-[var(--muted-text)] block text-xs">{t('Spend %')}</span>
                            <span className="text-sm dark:text-gray-300">{row.spendPct}</span>
                        </div>
                         <div>
                            <span className="text-[var(--muted-text)] block text-xs">{t('Revenue %')}</span>
                            <span className="text-sm dark:text-gray-300">{row.revenuePct}</span>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-x-auto">
               <table className="w-full text-sm text-left rtl:text-right">
                <thead className="text-xs uppercase   text-[var(--muted-text)]">
                  <tr>
                    <th className="px-3 py-3 rounded-s-lg">{t('Channel')}</th>
                    <th className="px-3 py-3">{t('Spend')}</th>
                    <th className="px-3 py-3">{t('Revenue')}</th>
                    <th className="px-3 py-3">{t('ROI')}</th>
                    <th className="px-3 py-3">{t('Profit/Lose')}</th>
                    <th className="px-3 py-3">{t('Spend %')}</th>
                    <th className="px-3 py-3 rounded-e-lg">{t('Revenue %')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {costRevenueData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-700/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-3 py-3 font-medium flex items-center gap-2 dark:text-white">
                        {row.channel === 'Facebook' && <FaFacebook className="text-blue-600" />}
                        {row.channel === 'WhatsApp' && <FaWhatsapp className="text-green-500" />}
                        {row.channel === 'Google' && <FaGoogle className="text-red-500" />}
                        {row.channel}
                      </td>
                      <td className="px-3 py-3 font-mono dark:text-gray-300">{row.spend}</td>
                      <td className="px-3 py-3 font-mono dark:text-gray-300">{row.revenue}</td>
                      <td className="px-3 py-3 text-green-600 font-semibold">{row.roi}</td>
                      <td className={`px-3 py-3 font-semibold ${row.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {row.profit}
                      </td>
                      <td className="px-3 py-3 text-[var(--muted-text)]">{row.spendPct}</td>
                      <td className="px-3 py-3 text-[var(--muted-text)]">{row.revenuePct}</td>
                    </tr>
                  ))}
                </tbody>
               </table>
            </div>
          </section>
      </div>

      {/* Bottom Section: Monthly Marketing Overview */}
      <section className="card glass-card p-4 overflow-hidden">
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h3 className="text-lg font-semibold">{t('Monthly Marketing Overview')}</h3>
          <div className="relative" ref={monthlyOverviewExportRef}>
            <button
              onClick={() => setShowMonthlyOverviewExport(!showMonthlyOverviewExport)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <FaFileExport /> {isRTL ? 'تصدير' : 'Export'}
              <FaChevronDown
                className={`transform transition-transform duration-200 ${showMonthlyOverviewExport ? 'rotate-180' : ''}`}
                size={12}
              />
            </button>
            {showMonthlyOverviewExport && (
              <div
                className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-1 bg-[var(--dropdown-bg)] rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 w-48`}
              >
                <button
                  onClick={() => handleExportMonthlyOverview('csv')}
                  className="w-full text-start px-4 py-2 text-sm hover:bg-blue-900/30 flex items-center gap-2 dark:text-white transition-colors"
                >
                  <FaFileExcel className="text-green-600" /> {isRTL ? 'تصدير كـ Excel' : 'Export to Excel'}
                </button>
                <button
                  onClick={() => handleExportMonthlyOverview('pdf')}
                  className="w-full text-start px-4 py-2 text-sm hover:bg-blue-900/30 flex items-center gap-2 dark:text-white transition-colors"
                >
                  <FaFilePdf className="text-red-600" /> {isRTL ? 'تصدير كـ PDF' : 'Export to PDF'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile View (Cards) */}
        <div className="md:hidden space-y-4">
          {monthlyOverviewData.map((row, idx) => (
            <div key={idx} className=" p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                <div className="flex flex-col">
                    <span className="font-semibold text-primary">{row.campaign}</span>
                    <span className="text-xs text-[var(--muted-text)]">{row.month}</span>
                </div>
                 <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${row.channel === 'Facebook' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 
                    row.channel === 'WhatsApp' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                    'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                  {row.channel}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                 <div className="flex justify-between items-center">
                   <span className="text-[var(--muted-text)] text-xs">{t('Spend')}</span>
                   <span className="font-mono font-medium dark:text-gray-200">{row.spend}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-[var(--muted-text)] text-xs">{t('Revenue')}</span>
                   <span className="font-mono font-medium dark:text-gray-200">{row.revenue}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-[var(--muted-text)] text-xs">{t('Leads')}</span>
                   <span className="font-mono font-medium dark:text-gray-200">{row.leads}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-[var(--muted-text)] text-xs">{t('CPL')}</span>
                   <span className="font-mono font-medium dark:text-gray-200">{row.cpl}</span>
                 </div>
                 <div className="flex justify-between items-center col-span-2 border-t border-gray-200 dark:border-gray-700/50 pt-2 mt-1">
                   <span className="text-[var(--muted-text)] text-xs">{t('CPA')}</span>
                   <span className="font-mono font-medium dark:text-gray-200">{row.cpa}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right">
            <thead className=" text-[var(--muted-text)] font-medium">
              <tr>
                <th className="px-4 py-3 rounded-s-lg">{t('Month')}</th>
                <th className="px-4 py-3">{t('Campaign Name')}</th>
                <th className="px-4 py-3">{t('Channel')}</th>
                <th className="px-4 py-3">{t('Spend')}</th>
                <th className="px-4 py-3">{t('Revenue')}</th>
                <th className="px-4 py-3">{t('Leads')}</th>
                <th className="px-4 py-3">{t('CPL')}</th>
                <th className="px-4 py-3 rounded-e-lg">{t('CPA')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {monthlyOverviewData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-700/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium dark:text-gray-300">{row.month}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{row.campaign}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${row.channel === 'Facebook' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 
                        row.channel === 'WhatsApp' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                        'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                      {row.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 dark:text-gray-300">{row.spend}</td>
                  <td className="px-4 py-3 dark:text-gray-300">{row.revenue}</td>
                  <td className="px-4 py-3 dark:text-gray-300">{row.leads}</td>
                  <td className="px-4 py-3 dark:text-gray-300">{row.cpl}</td>
                  <td className="px-4 py-3 dark:text-gray-300">{row.cpa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
