import { useMemo, useState } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title } from 'chart.js'
import { useTranslation } from 'react-i18next'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title)

export default function MarketingPerformance() {
  const { t } = useTranslation()

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); const f = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    return f.toISOString().slice(0,10)
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); const l = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return l.toISOString().slice(0,10)
  })
  const [granularity, setGranularity] = useState('month')
  const [showSpend, setShowSpend] = useState(true)
  const [showClicks, setShowClicks] = useState(true)
  const [showLeads, setShowLeads] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [campaignStart, setCampaignStart] = useState(() => {
    const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth(), 12)
    return s.toISOString().slice(0,10)
  })
  const [campaignEnd, setCampaignEnd] = useState(() => {
    const d = new Date(); const e = new Date(d.getFullYear(), d.getMonth(), 30)
    return e.toISOString().slice(0,10)
  })

  const [mode, setMode] = useState('simple') // 'simple' | 'advanced'
  const [activeMetric, setActiveMetric] = useState('leads')

  // Presets
  const applyPreset = (days) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    setEndDate(end.toISOString().slice(0, 10))
    setStartDate(start.toISOString().slice(0, 10))
  }
  const applyMonthPreset = () => {
    const d = new Date()
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    setEndDate(end.toISOString().slice(0, 10))
    setStartDate(start.toISOString().slice(0, 10))
  }

  // Computed granularity for simple mode
  const computedGranularity = useMemo(() => {
    if (mode === 'advanced') return granularity
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = (end - start) / (1000 * 60 * 60 * 24)
    return days > 45 ? 'week' : 'day'
  }, [mode, granularity, startDate, endDate])

  const effectiveGranularity = computedGranularity

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const tickColor = isDark ? '#cbd5e1' : '#334155'

  const daySeries = useMemo(() => {
    const from = new Date(startDate)
    const to = new Date(endDate)
    const campFrom = new Date(campaignStart)
    const campTo = new Date(campaignEnd)
    const labels = []
    const spend = []
    const clicks = []
    const leads = []
    const cur = new Date(from)
    const base = (i) => Math.max(0, Math.round(60 + i * 8 + ((i % 3) - 1) * 12))
    let i = 0
    while (cur <= to) {
      const key = cur.toISOString().slice(0,10)
      labels.push(key)
      const active = cur >= campFrom && cur <= campTo
      if (!active) {
        spend.push(null); clicks.push(null); leads.push(null)
      } else {
        const s = base(i) * 10
        const c = Math.max(0, Math.round(base(i) * 1.1 + (i % 2 ? 35 : -20)))
        const l = Math.max(0, Math.round(c * 0.1 + (i % 3 ? 4 : -2)))
        spend.push(s); clicks.push(c); leads.push(l)
      }
      cur.setDate(cur.getDate() + 1)
      i += 1
    }
    return { labels, spend, clicks, leads, campFrom, campTo }
  }, [startDate, endDate, campaignStart, campaignEnd])

  const weekSeries = useMemo(() => {
    const labels = []
    const spend = []
    const clicks = []
    const leads = []
    let idx = 0
    while (idx < daySeries.labels.length) {
      const weekStartDate = new Date(daySeries.labels[idx])
      const weekEndIndex = Math.min(daySeries.labels.length - 1, idx + 6)
      const weekEndDate = new Date(daySeries.labels[weekEndIndex])
      const activeDays = []
      let s = 0, c = 0, l = 0
      for (let j = idx; j <= weekEndIndex; j++) {
        const d = new Date(daySeries.labels[j])
        const inside = d >= daySeries.campFrom && d <= daySeries.campTo
        if (inside) {
          activeDays.push(d)
          s += daySeries.spend[j] || 0
          c += daySeries.clicks[j] || 0
          l += daySeries.leads[j] || 0
        }
      }
      const label = weekStartDate.toISOString().slice(0,10) + ' — ' + weekEndDate.toISOString().slice(0,10)
      labels.push(label)
      if (activeDays.length === 0) {
        spend.push(null); clicks.push(null); leads.push(null)
      } else {
        spend.push(s); clicks.push(c); leads.push(l)
      }
      idx = weekEndIndex + 1
    }
    return { labels, spend, clicks, leads }
  }, [daySeries])

  const monthSeries = useMemo(() => {
    const from = new Date(startDate)
    const to = new Date(endDate)
    const labels = []
    const spend = []
    const clicks = []
    const leads = []
    const activeDaysPerLabel = []
    const cur = new Date(from.getFullYear(), from.getMonth(), 1)
    while (cur <= to) {
      const label = cur.toLocaleString('en', { month: 'short' }) + ' ' + cur.getFullYear()
      const start = new Date(cur.getFullYear(), cur.getMonth(), 1)
      const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
      let s = 0, c = 0, l = 0, activeDays = 0
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0,10)
        const idx = daySeries.labels.indexOf(key)
        if (idx !== -1) {
          const inside = d >= daySeries.campFrom && d <= daySeries.campTo
          if (inside) {
            activeDays += 1
            s += daySeries.spend[idx] || 0
            c += daySeries.clicks[idx] || 0
            l += daySeries.leads[idx] || 0
          }
        }
      }
      labels.push(label)
      activeDaysPerLabel.push(activeDays)
      if (activeDays === 0) {
        spend.push(null); clicks.push(null); leads.push(null)
      } else {
        spend.push(s); clicks.push(c); leads.push(l)
      }
      cur.setMonth(cur.getMonth() + 1)
    }
    return { labels, spend, clicks, leads, activeDaysPerLabel }
  }, [daySeries, startDate, endDate])

  const series = useMemo(() => {
    if (granularity === 'day') return daySeries
    if (granularity === 'week') return weekSeries
    return monthSeries
  }, [granularity, daySeries, weekSeries, monthSeries])

  const trendData = useMemo(() => {
    const datasets = []
    const maxLeadIdx = (() => {
      let idx = -1, maxVal = -1
      for (let i = 0; i < series.leads.length; i++) {
        const v = series.leads[i]
        if (v != null && v > maxVal) { maxVal = v; idx = i }
      }
      return idx
    })()
    const makeRadius = (highlightIdx) => series.labels.map((_, i) => i === highlightIdx ? 5 : 2)
    
    const displaySpend = mode === 'advanced' ? showSpend : activeMetric === 'spend'
    const displayClicks = mode === 'advanced' ? showClicks : activeMetric === 'clicks'
    const displayLeads = mode === 'advanced' ? showLeads : activeMetric === 'leads'

    if (displaySpend) datasets.push({
      label: t('Total Spend'),
      data: series.spend,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.18)',
      tension: 0.35,
      pointRadius: 2,
      yAxisID: 'y1',
      fill: true
    })
    if (displayClicks) datasets.push({
      label: t('Clicks'),
      data: series.clicks,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.18)',
      tension: 0.35,
      pointRadius: 2,
      fill: true
    })
    if (displayLeads) datasets.push({
      label: t('Leads'),
      data: series.leads,
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34,197,94,0.18)',
      tension: 0.35,
      pointRadius: makeRadius(maxLeadIdx),
      fill: true
    })
    return { labels: series.labels, datasets }
  }, [series, showSpend, showClicks, showLeads, t, mode, activeMetric])

  const hasData = useMemo(() => {
    try {
      return trendData.datasets.some(ds => ds.data.some(v => v != null))
    } catch {
      return false
    }
  }, [trendData])

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: mode !== 'simple', labels: { color: tickColor } },
      title: {
        display: mode === 'advanced',
        text: `${t('Marketing Performance')} • ${granularity === 'day' ? t('Daily') : granularity === 'week' ? t('Weekly') : t('Monthly')} • ${startDate} → ${endDate}`,
        color: tickColor,
        font: { weight: '600' }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (ctx) => {
            const i = ctx.dataIndex
            const label = series.labels[i]
            const spend = series.spend[i]
            const leads = series.leads[i]
            const active = granularity === 'day'
              ? (new Date(label) >= daySeries.campFrom && new Date(label) <= daySeries.campTo)
              : (spend != null || leads != null)
            const parts = []
            parts.push(`${ctx.dataset.label}: ${ctx.parsed.y ?? '—'}`)
            if (granularity === 'day') {
              const dayNum = new Date(label) >= daySeries.campFrom ? Math.floor((new Date(label) - daySeries.campFrom) / (1000*60*60*24)) + 1 : null
              parts.push(`${t('Campaign Status')}: ${active ? 'Active' : t('Campaign not active')}`)
              if (active && dayNum) parts.push(`${t('Day')} #${dayNum}`)
            } else if (granularity === 'month') {
              const days = monthSeries.activeDaysPerLabel[i] || 0
              if (days) parts.push(`${t('Partial Month')}: ${days} ${t('Days')}`)
            }
            return parts.join(' | ')
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 12 } } },
      y: { grid: { display: false }, ticks: { color: tickColor, font: { size: 12 } }, position: 'left' },
      y1: { grid: { display: false }, ticks: { color: tickColor, font: { size: 12 } }, position: 'right' }
    }
  }

  const activeDays = useMemo(() => {
    if (granularity === 'day') {
      let n = 0
      for (let i = 0; i < daySeries.labels.length; i++) {
        const d = new Date(daySeries.labels[i])
        if (d >= daySeries.campFrom && d <= daySeries.campTo) n++
      }
      return n
    }
    if (granularity === 'week') {
      let n = 0
      for (let i = 0; i < daySeries.labels.length; i++) {
        const d = new Date(daySeries.labels[i])
        if (d >= daySeries.campFrom && d <= daySeries.campTo) n++
      }
      return n
    }
    const monthIdx = 0
    return monthSeries.activeDaysPerLabel[monthIdx] || 0
  }, [granularity, daySeries, monthSeries])

  const avgLeadsPerDay = useMemo(() => {
    let totalLeads = 0
    if (granularity === 'day') {
      for (let i = 0; i < daySeries.leads.length; i++) totalLeads += daySeries.leads[i] || 0
    } else {
      for (let i = 0; i < weekSeries.leads.length; i++) totalLeads += weekSeries.leads[i] || 0
    }
    return activeDays ? Math.round(totalLeads / activeDays) : 0
  }, [granularity, daySeries, weekSeries, activeDays])

  const avgCostPerDay = useMemo(() => {
    let totalSpend = 0
    if (granularity === 'day') {
      for (let i = 0; i < daySeries.spend.length; i++) totalSpend += daySeries.spend[i] || 0
    } else {
      for (let i = 0; i < weekSeries.spend.length; i++) totalSpend += weekSeries.spend[i] || 0
    }
    return activeDays ? Math.round(totalSpend / activeDays) : 0
  }, [granularity, daySeries, weekSeries, activeDays])

  const adminSummary = useMemo(() => {
    const sum = (arr) => arr.reduce((acc, v) => acc + (v || 0), 0)
    const totalSpend = sum(series.spend)
    const totalLeads = sum(series.leads)
    const avgCpl = totalLeads ? Math.round(totalSpend / totalLeads) : 0
    let bestIdx = -1, bestVal = -1
    for (let i = 0; i < series.leads.length; i++) {
      const v = series.leads[i]
      if (v != null && v > bestVal) { bestVal = v; bestIdx = i }
    }
    const bestDayLabel = bestIdx >= 0 ? series.labels[bestIdx] : ''
    return { totalSpend, totalLeads, avgCpl, bestDayLabel, bestVal }
  }, [series])

  return (
    <div id="reporting-over-time-root">
      {/* Executive View Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">{t('Marketing Performance')}</h3>
          {mode === 'simple' && (
            <div className="text-xs text-[var(--muted-text)]">
              {t('Last 30 Days')} — {(activeMetric === 'spend' && t('Spend')) || (activeMetric === 'clicks' && t('Clicks')) || t('Leads')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'simple' ? (
            <>
              <button onClick={()=>applyPreset(30)} className="px-2 py-1 text-xs rounded-lg border hover:bg-[var(--dropdown-bg)] sm:px-3 sm:py-1.5 sm:text-sm">{t('Last 30 Days')}</button>
              <button onClick={()=>applyMonthPreset()} className="px-2 py-1 text-xs rounded-lg border hover:bg-[var(--dropdown-bg)] sm:px-3 sm:py-1.5 sm:text-sm">{t('This Month')}</button>
              <button onClick={()=>setMode('advanced')} className="px-2 py-1 text-xs rounded-lg border bg-primary text-white sm:px-3 sm:py-1.5 sm:text-sm">{t('Advanced Analysis')}</button>
            </>
          ) : (
            <button onClick={()=>setMode('simple')} className="px-2 py-1 text-xs rounded-lg border bg-[var(--dropdown-bg)] sm:px-3 sm:py-1.5 sm:text-sm">{t('Back to Simple View')}</button>
          )}
        </div>
      </div>

      {/* Advanced Controls */}
      {mode === 'advanced' && (
        <div className="mb-3 p-3 border rounded-lg bg-[var(--bg-secondary)]">
          <div className="flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-2">
                <button onClick={()=>setShowFilters(v=>!v)} className="px-3 py-2 rounded-lg border bg-[var(--dropdown-bg)]">{t('Date Range')}</button>
                <select value={granularity} onChange={(e)=>setGranularity(e.target.value)} className="px-3 py-2 rounded-lg border bg-[var(--dropdown-bg)]">
                  <option value="day">{t('Daily')}</option>
                  <option value="week">{t('Weekly')}</option>
                  <option value="month">{t('Monthly')}</option>
                </select>
             </div>
             <div className="flex items-center gap-3 border-l pl-3">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={showSpend} onChange={e=>setShowSpend(e.target.checked)} />
                  <span className="text-sm">{t('Total Spend')}</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={showClicks} onChange={e=>setShowClicks(e.target.checked)} />
                  <span className="text-sm">{t('Clicks')}</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={showLeads} onChange={e=>setShowLeads(e.target.checked)} />
                  <span className="text-sm">{t('Leads')}</span>
                </label>
             </div>
          </div>
          {showFilters && (
            <div className="mt-3">
              <AdvancedDateFilter
                startDate={startDate}
                endDate={endDate}
                onChange={({ startDate: s, endDate: e }) => { setStartDate(s); setEndDate(e) }}
              />
            </div>
          )}
        </div>
      )}

      {mode === 'simple' && (
        <div className="flex items-center gap-2 mb-3">
          <button 
            onClick={()=>setActiveMetric('leads')}
            className={`px-2.5 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm rounded-full border transition-colors ${activeMetric === 'leads' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'hover:bg-[var(--bg-secondary)]'}`}
          >
            {t('Leads')}
          </button>
          <button 
            onClick={()=>setActiveMetric('spend')}
            className={`px-2.5 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm rounded-full border transition-colors ${activeMetric === 'spend' ? 'bg-indigo-100 border-indigo-500 text-indigo-800' : 'hover:bg-[var(--bg-secondary)]'}`}
          >
            {t('Spend')}
          </button>
          <button 
            onClick={()=>setActiveMetric('clicks')}
            className={`px-2.5 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm rounded-full border transition-colors ${activeMetric === 'clicks' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'hover:bg-[var(--bg-secondary)]'}`}
          >
            {t('Clicks')}
          </button>
        </div>
      )}
      <div className="relative" style={{ height: '260px' }}>
        {effectiveGranularity === 'day' && mode === 'advanced' && (() => {
          const startIdx = daySeries.labels.findIndex(k => k === campaignStart)
          const endIdx = daySeries.labels.findIndex(k => k === campaignEnd)
          const total = daySeries.labels.length
          const left = startIdx >= 0 ? (startIdx / total) * 100 : 0
          const width = startIdx >= 0 && endIdx >= 0 ? ((endIdx - startIdx + 1) / total) * 100 : 0
          return (
            <div
              style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, top: 0, bottom: 0, background: 'rgba(59,130,246,0.10)' }}
              title="Campaign A – Active Period"
            />
          )
        })()}
        {hasData ? (
          <Line data={trendData} options={commonOptions} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-4 py-2 rounded-lg border bg-white/10 dark:bg-gray-900/20 backdrop-blur-md text-sm text-[var(--muted-text)]">
              {t('Campaign not active in selected range')}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-gray-900/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--muted-text)]">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <DollarSign size={14} />
            </span>
            {t('Total Spend')}
          </div>
          <div className="mt-2 text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-400">
            {adminSummary.totalSpend.toLocaleString()}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-gray-900/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--muted-text)]">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
              <Users size={14} />
            </span>
            {t('Total Leads')}
          </div>
          <div className="mt-2 text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-indigo-400">
            {adminSummary.totalLeads.toLocaleString()}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-gray-900/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--muted-text)]">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white">
              <BadgePercent size={14} />
            </span>
            {t('Avg CPL')}
          </div>
          <div className="mt-2 text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 to-pink-400">
            {adminSummary.avgCpl.toLocaleString()}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-gray-900/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--muted-text)]">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-500 text-white">
              <CalendarDays size={14} />
            </span>
            {t('Best Performing Day')}
          </div>
          <div className="mt-2 text-sm font-semibold">{adminSummary.bestDayLabel}</div>
          <div className="text-xs opacity-70">{t('Leads')}: {adminSummary.bestVal.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-gray-900/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--muted-text)]">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <Gauge size={14} />
            </span>
            {t('Active Days')}
          </div>
          <div className="mt-2 text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-400">
            {activeDays.toLocaleString()}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-gray-900/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--muted-text)]">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
              <TrendingUp size={14} />
            </span>
            {t('Avg Leads / Day')}
          </div>
          <div className="mt-2 text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-teal-400">
            {avgLeadsPerDay.toLocaleString()}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-gray-900/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--muted-text)]">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-blue-500 text-white">
              <Wallet size={14} />
            </span>
            {t('Avg Cost / Day')}
          </div>
          <div className="mt-2 text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-blue-400">
            {avgCostPerDay.toLocaleString()}
          </div>
        </div>
      </div>

      {effectiveGranularity === 'month' && monthSeries.activeDaysPerLabel.length > 0 && monthSeries.activeDaysPerLabel[0] > 0 && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md border bg-[var(--dropdown-bg)] text-xs">
            {t('Partial Month')} ({monthSeries.activeDaysPerLabel[0]} {t('Days')})
          </span>
        </div>
      )}
    </div>
  )
}
