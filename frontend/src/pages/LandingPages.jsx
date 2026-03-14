import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../utils/api'
import { useAppState } from '../shared/context/AppStateProvider'
import SearchableSelect from '../components/SearchableSelect'
import AddLandingPage from './AddLandingPage'
import { FaLayerGroup, FaPlus, FaTimes, FaGlobe, FaCopy, FaEdit, FaTrash, FaUsers, FaMousePointer, FaChartLine, FaFilter, FaSearch } from 'react-icons/fa'
import { Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

function Sparkline({ data = [], color = 'emerald', width = 120, height = 36, padding = 6 }) {
  const w = width
  const h = height
  const p = padding
  if (!Array.isArray(data) || data.length < 2) {
    return <svg width={w} height={h} />
  }
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

export default function LandingPages() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  const { user } = useAppState()

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const hasExplicitMarketingPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Marketing')
  const marketingModulePerms = hasExplicitMarketingPerms && Array.isArray(modulePermissions.Marketing) ? modulePermissions.Marketing : []
  const effectiveMarketingPerms = hasExplicitMarketingPerms ? marketingModulePerms : (() => {
    const role = user?.role || ''
    if (role === 'Director') return ['showMarketingDashboard', 'showCampaign', 'addLandingPage', 'integration']
    if (role === 'Marketing Manager') return ['showMarketingDashboard', 'showCampaign', 'addLandingPage', 'integration']
    if (role === 'Marketing Moderator') return ['showMarketingDashboard', 'showCampaign']
    if (role === 'Sales Admin') return ['showMarketingDashboard', 'showCampaign', 'addLandingPage']
    return []
  })()
  const roleLower = String(user?.role || '').toLowerCase()
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'
  const canAddLandingPage =
    effectiveMarketingPerms.includes('addLandingPage') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  const [isAddModalOpen, setAddModalOpen] = useState(false)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const [sources, setSources] = useState([])
  const [campaigns, setCampaigns] = useState([])

  const fetchLandingPages = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/landing-pages')
      const mapped = (res.data.data || []).map(item => ({
        ...item,
        name: item.title,
        campaign: item.campaign || '-',
        visitors: item.visits || 0,
        leads: item.conversions || 0,
        url: item.url || `${window.location.origin}/#/p/${item.slug}`
      }))
      setRows(mapped)
    } catch (error) {
      console.error('Failed to fetch landing pages:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFilters = async () => {
    try {
        const [sourcesRes, campaignsRes] = await Promise.all([
            api.get('/api/sources'),
            api.get('/api/campaigns')
        ])
        setSources(sourcesRes.data || [])
        setCampaigns(campaignsRes.data.data || [])
    } catch (error) {
        console.error('Failed to fetch filters:', error)
    }
  }

  useEffect(() => {
    fetchLandingPages()
    fetchFilters()
  }, [])

  const [q, setQ] = useState('')
  const [fSource, setFSource] = useState('')
  const [fCampaign, setFCampaign] = useState('')
  const [fTheme, setFTheme] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)

  const sourceOptions = useMemo(() => {
    if (sources.length > 0) return sources.map(s => s.name)
    return Array.from(new Set(rows.map(r => r.source))).filter(Boolean)
  }, [sources, rows])

  const campaignOptions = useMemo(() => {
    if (campaigns.length > 0) return campaigns.map(c => c.name)
    return Array.from(new Set(rows.map(r => r.campaign))).filter(Boolean)
  }, [campaigns, rows])
  const themeOptions = [
    { value: 'theme1', label: 'LIGHT' },
    { value: 'theme2', label: 'DARK' }
  ]

  const stats = useMemo(() => {
    const totalPages = rows.length
    const totalVisitors = rows.reduce((sum, r) => sum + (r.visitors || 0), 0)
    const totalLeads = rows.reduce((sum, r) => sum + (r.leads || 0), 0)
    const conversionRate = totalVisitors > 0 ? ((totalLeads / totalVisitors) * 100).toFixed(1) : '0.0'
    const visitorsSeries = rows.map(r => Number(r.visitors || 0))
    const leadsSeries = rows.map(r => Number(r.leads || 0))
    const convSeries = rows.map(r => {
      const v = Number(r.visitors || 0)
      const l = Number(r.leads || 0)
      return v > 0 ? (l / v) * 100 : 0
    })
    return { totalPages, totalVisitors, totalLeads, conversionRate, visitorsSeries, leadsSeries, convSeries }
  }, [rows])

  const [prevStats, setPrevStats] = useState(() => {
    try {
      const saved = localStorage.getItem('landing_pages_prev_stats')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('landing_pages_prev_stats', JSON.stringify({
        totalPages: stats.totalPages,
        totalVisitors: stats.totalVisitors,
        totalLeads: stats.totalLeads,
        conversionRate: Number(stats.conversionRate)
      }))
      setPrevStats({
        totalPages: stats.totalPages,
        totalVisitors: stats.totalVisitors,
        totalLeads: stats.totalLeads,
        conversionRate: Number(stats.conversionRate)
      })
    } catch {}
  }, [stats.totalPages, stats.totalVisitors, stats.totalLeads, stats.conversionRate])

  const pctDelta = (current, prev) => {
    if (typeof prev !== 'number' || prev === 0) return 0
    return Number((((current - prev) / prev) * 100).toFixed(1))
  }

  const visibleRows = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return rows.filter(r => {
      const matchesQuery = !ql || r.name.toLowerCase().includes(ql) || r.url.toLowerCase().includes(ql)
      const matchesSource = !fSource || r.source === fSource
      const matchesCampaign = !fCampaign || r.campaign === fCampaign
      const matchesTheme = !fTheme || r.theme === fTheme
      return matchesQuery && matchesSource && matchesCampaign && matchesTheme
    })
  }, [rows, q, fSource, fCampaign, fTheme])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [q, fSource, fCampaign, fTheme])

  const totalPages = Math.ceil(visibleRows.length / itemsPerPage)
  const paginatedRows = visibleRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const resetFilters = () => {
    setQ('')
    setFSource('')
    setFCampaign('')
    setFTheme('')
  }

  const [editingPage, setEditingPage] = useState(null)

  const handleEdit = (page) => {
    setEditingPage(page)
    setAddModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('Are you sure you want to delete this landing page?'))) return
    try {
      await api.delete(`/api/landing-pages/${id}`)
      fetchLandingPages()
    } catch (error) {
      console.error('Failed to delete landing page:', error)
      alert(t('Failed to delete landing page'))
    }
  }

  const handleModalClose = () => {
    setAddModalOpen(false)
    setEditingPage(null)
  }

  const handleAddPage = () => {
    fetchLandingPages()
    handleModalClose()
  }

  return (
      <div className="space-y-6 pt-4 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Page Title */}
          <h1 className="page-title text-2xl font-bold">{isRTL ? 'صفحات الهبوط' : 'Landing Pages'}</h1>

          {/* Actions */}
          {canAddLandingPage && (
            <button 
              className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2" 
              onClick={() => setAddModalOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-white">{isRTL ? 'إنشاء صفحة هبوط' : 'Create Landing Page'}</span>
            </button>
          )}
        </div> 

        {/* Overview */}
        <div className="mb-2">
          <h2 className="text-lg font-semibold">{isRTL ? 'نظرة عامة' : 'Overview'}</h2>
        </div>

        {/* Stats Cards (enhanced) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 space-y-2 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <FaLayerGroup size={20} />
              </div>
              <div className="text-xs font-medium text-blue-700 dark:text-blue-300">{isRTL ? 'إجمالي الصفحات' : 'Total Pages'}</div>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100"><CountUp value={stats.totalPages} /></div>
            <div className={`text-xs ${pctDelta(stats.totalPages, prevStats?.totalPages) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {pctDelta(stats.totalPages, prevStats?.totalPages) >= 0 ? '▲' : '▼'} {Math.abs(pctDelta(stats.totalPages, prevStats?.totalPages))}% {isRTL ? 'مقارنة بآخر تحديث' : 'vs Last Update'}
            </div>
          </div>

          <div className="card p-4 space-y-2 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-100 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                <FaUsers size={20} />
              </div>
              <div className="text-xs font-medium text-purple-700 dark:text-purple-300">{isRTL ? 'الزوار' : 'Total Visitors'}</div>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100"><CountUp value={stats.totalVisitors} /></div>
            <Sparkline data={stats.visitorsSeries} color="blue" />
            <div className={`text-xs ${pctDelta(stats.totalVisitors, prevStats?.totalVisitors) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {pctDelta(stats.totalVisitors, prevStats?.totalVisitors) >= 0 ? '▲' : '▼'} {Math.abs(pctDelta(stats.totalVisitors, prevStats?.totalVisitors))}% {isRTL ? 'مقارنة بآخر تحديث' : 'vs Last Update'}
            </div>
          </div>

          <div className="card p-4 space-y-2 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-100 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                <FaMousePointer size={20} />
              </div>
              <div className="text-xs font-medium text-green-700 dark:text-green-300">{isRTL ? 'العملاء المحتملين' : 'Total Leads'}</div>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100"><CountUp value={stats.totalLeads} /></div>
            <Sparkline data={stats.leadsSeries} color="emerald" />
            <div className={`text-xs ${pctDelta(stats.totalLeads, prevStats?.totalLeads) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {pctDelta(stats.totalLeads, prevStats?.totalLeads) >= 0 ? '▲' : '▼'} {Math.abs(pctDelta(stats.totalLeads, prevStats?.totalLeads))}% {isRTL ? 'مقارنة بآخر تحديث' : 'vs Last Update'}
            </div>
          </div>

          <div className="card p-4 space-y-2 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 border-orange-100 dark:border-orange-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                <FaChartLine size={20} />
              </div>
              <div className="text-xs font-medium text-orange-700 dark:text-orange-300">{isRTL ? 'معدل التحويل' : 'Conversion Rate'}</div>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.conversionRate}%</div>
            <Sparkline data={stats.convSeries} color="rose" />
            <div className={`text-xs ${pctDelta(Number(stats.conversionRate), prevStats?.conversionRate) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {pctDelta(Number(stats.conversionRate), prevStats?.conversionRate) >= 0 ? '▲' : '▼'} {Math.abs(pctDelta(Number(stats.conversionRate), prevStats?.conversionRate))}% {isRTL ? 'مقارنة بآخر تحديث' : 'vs Last Update'}
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="card p-4 sm:p-6 bg-transparent rounded-2xl filters-compact" style={{ backgroundColor: 'transparent' }}>
            <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
                <FaFilter className="text-blue-500" /> {t('Filters')}
            </h2>
            <div className="flex items-center gap-2">
                <button onClick={resetFilters} className="px-3 py-1.5 text-sm  dark:text-white hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                {isRTL ? 'إعادة تعيين' : 'Reset'}
                </button>
            </div>
            </div>

            <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaSearch className="text-blue-500" size={10} /> {t('Search')}</label>
                <input className="input w-full text-sm" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search by name or URL...')} />
                </div>
                <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{t('Source')}</label>
                <SearchableSelect
                    value={fSource}
                    onChange={(val) => setFSource(val)}
                    options={sourceOptions}
                    isRTL={isRTL}
                    placeholder={isRTL ? 'الكل' : 'All'}
                />
                </div>
                <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{t('Campaign')}</label>
                <SearchableSelect
                    value={fCampaign}
                    onChange={(val) => setFCampaign(val)}
                    options={campaignOptions}
                    isRTL={isRTL}
                    placeholder={isRTL ? 'الكل' : 'All'}
                />
                </div>
                <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{t('Theme')}</label>
                <SearchableSelect
                    value={fTheme}
                    onChange={(val) => setFTheme(val)}
                    options={themeOptions}
                    isRTL={isRTL}
                    placeholder={isRTL ? 'الكل' : 'All'}
                />
                </div>
            </div>
            </div>
        </div>

        {/* Table Container */}
        <div className="card backdrop-blur-md border border-white/50 dark:border-gray-700/50 shadow-sm rounded-2xl overflow-hidden mb-4">
          <div className="p-4 border-b border-white/20 dark:border-gray-700/50 flex items-center justify-between">
             <h2 className="text-lg font-bold dark:text-white">
                {isRTL ? 'قائمة صفحات الهبوط' : 'Landing Pages List'}
             </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden p-4">
            {/* Mobile Card View */}
             {paginatedRows.map((r, idx) => (
               <div key={idx} className="card glass-card p-4 space-y-3 bg-white/5 border border-gray-800 rounded-lg">
                 <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                   <div>
                     <h4 className="font-semibold text-sm">{r.name}</h4>
                     <a href={r.url} className="text-xs text-blue-500 truncate block max-w-[200px]" target="_blank" rel="noreferrer">{r.url}</a>
                   </div>
                   <span className={`px-2 py-1 rounded text-xs font-medium ${r.theme === 'theme2' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {r.theme === 'theme1' ? 'LIGHT' : (r.theme === 'theme2' ? 'DARK' : r.theme)}
                   </span>
                 </div>
                 <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{t('Source')}</span>
                      <span className="text-xs font-medium">{r.source}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{t('Linked Campaign')}</span>
                      <span className="text-xs font-medium">{r.campaign}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{t('Email')}</span>
                      <span className="text-xs">{r.email || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{t('Phone')}</span>
                      <span className="text-xs">{r.phone || '-'}</span>
                    </div>
                 </div>
                 <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button 
                      onClick={() => handleEdit(r)}
                      className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-colors flex items-center gap-1 text-xs"
                    >
                      <Edit size={14} /> {t('Edit')}
                    </button>
                    <button 
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors flex items-center gap-1 text-xs"
                    >
                      <Trash2 size={14} /> {t('Delete')}
                    </button>
                 </div>
               </div>
             ))}
             {paginatedRows.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {isRTL ? 'لا توجد نتائج' : 'No results'}
                </div>
             )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-white/5 dark:bg-white/5 dark:text-white">
                <tr>
                  <th className="px-4 py-3 border-b border-white/10 dark:border-gray-700/50">{t('Title')}</th>
                  <th className="px-4 py-3 border-b border-white/10 dark:border-gray-700/50">{t('Source')}</th>
                  <th className="px-4 py-3 border-b border-white/10 dark:border-gray-700/50">{t('Linked Campaign')}</th>
                  <th className="px-4 py-3 border-b border-white/10 dark:border-gray-700/50">{t('Email')}</th>
                  <th className="px-4 py-3 border-b border-white/10 dark:border-gray-700/50">{t('Phone')}</th>
                  <th className="px-4 py-3 border-b border-white/10 dark:border-gray-700/50">URL</th>
                  <th className="px-4 py-3 border-b border-white/10 dark:border-gray-700/50">{t('Theme')}</th>
                  <th className="px-4 py-3 border-b border-white/10 dark:border-gray-700/50 text-end">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 dark:divide-gray-700/50">
                {paginatedRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-white/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.source}</td>
                    <td className="px-4 py-3">{r.campaign}</td>
                    <td className="px-4 py-3">{r.email}</td>
                    <td className="px-4 py-3">{r.phone}</td>
                    <td className="px-4 py-3"><a href={r.url} className="text-blue-600 hover:underline truncate block" target="_blank" rel="noreferrer">{r.url}</a></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${r.theme === 'theme2' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {r.theme === 'theme1' ? 'LIGHT' : (r.theme === 'theme2' ? 'DARK' : r.theme)}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(r)}
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-colors"
                          title={t('Edit')}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                          title={t('Delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                    </td>
                  </tr>
                ))}
                {paginatedRows.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-center text-sm text-gray-500" colSpan={7}>
                      {isRTL ? 'لا توجد نتائج' : 'No results'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {visibleRows.length > 0 && (
            <div className="px-4 py-3 bg-[var(--content-bg)]/80 border-t border-white/10 dark:border-gray-700/60 flex  sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] sm:text-xs text-[var(--muted-text)]">
                {isRTL
                  ? `إظهار ${Math.min((currentPage - 1) * itemsPerPage + 1, visibleRows.length)}-${Math.min(currentPage * itemsPerPage, visibleRows.length)} من ${visibleRows.length}`
                  : `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, visibleRows.length)}-${Math.min(currentPage * itemsPerPage, visibleRows.length)} of ${visibleRows.length}`}
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
                      ? `الصفحة ${currentPage} من ${totalPages}`
                      : `Page ${currentPage} of ${totalPages}`}
                  </span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
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
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                  >
                    <option value={6}>6</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Modal */}
        <AddLandingPage 
          isOpen={isAddModalOpen} 
          onClose={handleModalClose} 
          onAdd={handleAddPage}
          campaigns={campaignOptions}
          initialData={editingPage}
        />
      </div>
  )
}
