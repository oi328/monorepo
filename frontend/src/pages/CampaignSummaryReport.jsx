import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { api, logExportEvent } from '../utils/api'
import { toast } from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

export default function CampaignSummaryReport() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isRTL = (i18n?.language || '').toLowerCase().startsWith('ar')

  const [startDate, setStartDate] = useState('2024-01-01')
  const [endDate, setEndDate] = useState('2024-03-31')
  const [query, setQuery] = useState('')
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true)
      try {
        const response = await api.get('/api/reports/campaigns/summary', {
          params: {
            start_date: startDate,
            end_date: endDate,
            query: query
          }
        })
        setCampaigns(response.data)
      } catch (error) {
        console.error('Failed to fetch campaign summary:', error)
        toast.error(t('Failed to load campaign summary'))
        setCampaigns([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce query
    const timeoutId = setTimeout(() => {
      fetchReport()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [startDate, endDate, query, t])

  // Since filtering is done on backend, campaigns state is already filtered
  const filtered = campaigns

  const exportExcel = () => {
    // Summary sheet
    const summary = filtered.map(({ name, platform, spend, impressions, clicks, ctr, cpc, leads, cpl, qualifiedPct, roi }) => ({
      'Campaign Name': name,
      Platform: platform,
      Spend: spend,
      Impressions: impressions,
      Clicks: clicks,
      CTR: ctr,
      CPC: cpc,
      'Leads Generated': leads,
      CPL: cpl,
      'Qualified Leads %': qualifiedPct,
      ROI: roi
    }))
    const wsSummary = XLSX.utils.json_to_sheet(summary)

    // Charts data sheet
    const chartsData = filtered.map(({ name, spend, roi, clicks, ctr, leads, qualifiedPct }) => ({
      Campaign: name,
      Spend: spend,
      ROI: roi,
      Clicks: clicks,
      CTR: ctr,
      Leads: leads,
      QualifiedPct: qualifiedPct
    }))
    const wsCharts = XLSX.utils.json_to_sheet(chartsData)

    // Metadata sheet (selected date range, query, counts)
    const metadata = [{
      'Start Date': startDate,
      'End Date': endDate,
      'Query': query || '',
      'Rows Exported': filtered.length,
      'Exported At': new Date().toISOString()
    }]
    const wsMeta = XLSX.utils.json_to_sheet(metadata)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
    XLSX.utils.book_append_sheet(wb, wsCharts, 'Charts Data')
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Metadata')
    const fileName = `campaign-summary-dashboard_${startDate}_to_${endDate}.xlsx`
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Campaign Summary Report',
      fileName,
      format: 'xlsx',
    })
  }

  const exportCsv = () => {
    const rows = [
      ['Campaign Name','Platform','Spend','Impressions','Clicks','CTR','CPC','Leads','CPL','Qualified Leads %','ROI'],
      ...filtered.map(c => [c.name, c.platform, c.spend, c.impressions, c.clicks, c.ctr, c.cpc, c.leads, c.cpl, c.qualifiedPct, c.roi])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'campaign-summary.csv'
    a.click()
    URL.revokeObjectURL(url)
    logExportEvent({
      module: 'Campaign Summary Report',
      fileName: 'campaign-summary.csv',
      format: 'csv',
    })
  }

  // Computed highlights
  const platformStats = useMemo(() => {
    const acc = {}
    for (const c of filtered) {
      const p = c.platform
      if (!acc[p]) acc[p] = { spend: 0, leads: 0, roiSum: 0, count: 0 }
      acc[p].spend += c.spend
      acc[p].leads += c.leads
      acc[p].roiSum += c.roi
      acc[p].count += 1
    }
    const entries = Object.entries(acc).map(([platform, s]) => ({ platform, avgRoi: +(s.roiSum / s.count).toFixed(2), spend: s.spend, leads: s.leads }))
    const best = entries.sort((a, b) => b.avgRoi - a.avgRoi)[0]
    return { entries, best }
  }, [filtered])

  const needingImprovement = useMemo(() => filtered.filter(c => c.roi < 1 || c.cpl > 30).slice(0, 3), [filtered])

  const recommendations = useMemo(() => {
    const recs = []
    if (platformStats.best) {
      recs.push(t('Boost budget on {{platform}} — avg ROI {{roi}}', { 
        platform: platformStats.best.platform, 
        roi: platformStats.best.avgRoi 
      }))
    }
    for (const c of needingImprovement) {
      if (c.roi < 1) {
        recs.push(t('Optimize {{campaign}} ({{platform}}): ROI {{roi}} < 1', {
          campaign: c.name,
          platform: c.platform,
          roi: c.roi
        }))
      }
      if (c.cpl > 30) {
        recs.push(t('Reduce CPL for {{campaign}}: CPL {{cpl}}', {
          campaign: c.name,
          cpl: c.cpl
        }))
      }
    }
    if (recs.length === 0) recs.push(t('All campaigns performing within targets'))
    return recs
  }, [platformStats, needingImprovement, t])

  return (
      <div className="space-y-6">
        <BackButton to="/reports" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{t('Campaign Summary')}</h1>
          <div className={`flex items-center gap-2`}>
            <button onClick={exportExcel} className="btn btn-primary px-3 py-2 rounded-md border">
              <span className="mr-2">📊</span> {t('Export Excel')}
            </button>
            <button onClick={exportCsv} className="btn btn-ghost px-3 py-2 rounded-md border">
              <span className="mr-2">🧾</span> {t('Google Sheets CSV')}
            </button>
          </div>
        </div>
        {/* صف فاضي تحت العنوان */}
        <div className="h-6" aria-hidden="true" />

        <div className="grid grid-cols-1 md:grid-cols-1 gap-3 justify-items-start">
          <div className="px-3 py-2 rounded-lg border bg-[var(--dropdown-bg)] w-full sm:w-[280px] md:w-[360px]">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search by Campaign or Source')} className="bg-transparent outline-none text-sm w-full" />
          </div>
        </div>

        {/* فلتر تاريخ متقدّم */}
        <AdvancedDateFilter
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: s, endDate: e }) => { setStartDate(s); setEndDate(e) }}
          className="mt-2"
        />

        {/* صف فاضي تحت السيرش */}
        <div className="h-6" aria-hidden="true" />

        {/* Main summary table */}
        <section className="glass-panel p-4">
          <h3 className="text-lg font-semibold mb-3">{t('Overview by Campaign')}</h3>
          
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filtered.map((c) => (
              <div key={c.name} className="card glass-card p-4 space-y-3 bg-white/5">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h4 className="font-semibold text-sm">{c.name}</h4>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                    {c.platform}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted-text)] text-xs">💰 {t('Spend')}</span>
                    <span className="text-xs font-medium">${c.spend.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted-text)] text-xs">👀 {t('Impressions')}</span>
                    <span className="text-xs">{c.impressions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted-text)] text-xs">{t('Clicks')}</span>
                    <span className="text-xs">{c.clicks.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted-text)] text-xs">{t('CTR')}</span>
                    <span className="text-xs">{c.ctr}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted-text)] text-xs">{t('CPC')}</span>
                    <span className="text-xs">${c.cpc}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted-text)] text-xs">{t('Leads')}</span>
                    <span className="text-xs font-medium">{c.leads}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted-text)] text-xs">{t('CPL')}</span>
                    <span className="text-xs">${c.cpl}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted-text)] text-xs">{t('Qualified')}</span>
                    <span className="text-xs">{c.qualifiedPct}%</span>
                  </div>
                  <div className="flex justify-between items-center col-span-2 border-t border-gray-100 dark:border-gray-800 pt-2 mt-1">
                    <span className="text-[var(--muted-text)] text-xs font-medium">{t('ROI')}</span>
                    <span className="text-sm font-bold text-green-400">{c.roi}x</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-auto -mx-4">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="text-left opacity-70">
                  <th className="px-4 py-2">{t('Campaign Name')}</th>
                  <th className="px-4 py-2">{t('Platform')}</th>
                  <th className="px-4 py-2">💰 {t('Spend')}</th>
                  <th className="px-4 py-2">👀 {t('Impressions')}</th>
                  <th className="px-4 py-2">{t('Clicks')}</th>
                  <th className="px-4 py-2">{t('CTR')} %</th>
                  <th className="px-4 py-2">{t('CPC')}</th>
                  <th className="px-4 py-2">{t('Leads Generated')}</th>
                  <th className="px-4 py-2">{t('CPL')}</th>
                  <th className="px-4 py-2">{t('Qualified Leads %')}</th>
                  <th className="px-4 py-2">{t('ROI')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.name} className="border-t">
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="px-4 py-2">{c.platform}</td>
                    <td className="px-4 py-2">${c.spend.toLocaleString()}</td>
                    <td className="px-4 py-2">{c.impressions.toLocaleString()}</td>
                    <td className="px-4 py-2">{c.clicks.toLocaleString()}</td>
                    <td className="px-4 py-2">{c.ctr}%</td>
                    <td className="px-4 py-2">${c.cpc}</td>
                    <td className="px-4 py-2">{c.leads}</td>
                    <td className="px-4 py-2">${c.cpl}</td>
                    <td className="px-4 py-2">{c.qualifiedPct}%</td>
                    <td className="px-4 py-2">{c.roi}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {/* صف فاضي تحت جدول Overview by Campaign */}
        <div className="h-6" aria-hidden="true" />

        {/* Charts grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Spend vs ROI (dual axis) */}
          <section className="glass-panel p-4">
            <h3 className="text-lg font-semibold mb-3">{t('Spend vs ROI')}</h3>
            <div style={{ height: '240px' }}>
              <Bar data={{
                labels: filtered.map(c => c.name),
                datasets: [
                  { label: t('Spend'), data: filtered.map(c => c.spend), backgroundColor: '#2563eb', borderRadius: 6, yAxisID: 'y' },
                  { label: t('ROI'), data: filtered.map(c => c.roi), type: 'line', borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.25)', tension: 0.3, yAxisID: 'y1' }
                ]
              }} options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { position: 'left', grid: { display: false } }, y1: { position: 'right', grid: { display: false } } },
                plugins: { legend: { position: 'bottom' } }
              }} />
            </div>
          </section>
          {/* Clicks vs CTR */}
          <section className="glass-panel p-4">
            <h3 className="text-lg font-semibold mb-3">{t('Clicks vs CTR')}</h3>
            <div style={{ height: '240px' }}>
              <Bar data={{
                labels: filtered.map(c => c.name),
                datasets: [
                  { label: t('Clicks'), data: filtered.map(c => c.clicks), backgroundColor: '#8b5cf6', borderRadius: 6, yAxisID: 'y' },
                  { label: t('CTR %'), data: filtered.map(c => c.ctr), type: 'line', borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.25)', tension: 0.3, yAxisID: 'y1' }
                ]
              }} options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { position: 'left', grid: { display: false } }, y1: { position: 'right', grid: { display: false } } },
                plugins: { legend: { position: 'bottom' } }
              }} />
            </div>
          </section>
          {/* Leads vs Qualified Leads % */}
          <section className="glass-panel p-4">
            <h3 className="text-lg font-semibold mb-3">{t('Leads vs Qualified Leads %')}</h3>
            <div style={{ height: '240px' }}>
              <Bar data={{
                labels: filtered.map(c => c.name),
                datasets: [
                  { label: t('Leads'), data: filtered.map(c => c.leads), backgroundColor: '#22c55e', borderRadius: 6, yAxisID: 'y' },
                  { label: t('Qualified %'), data: filtered.map(c => c.qualifiedPct), type: 'line', borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.25)', tension: 0.3, yAxisID: 'y1' }
                ]
              }} options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { position: 'left', grid: { display: false } }, y1: { position: 'right', grid: { display: false } } },
                plugins: { legend: { position: 'bottom' } }
              }} />
            </div>
          </section>
          {/* صف فاضي تحت قسم Leads vs Qualified Leads % */}
          <div className="col-span-1 md:col-span-3 h-6" aria-hidden="true" />
        </div>

        {/* Highlights & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="glass-panel p-4">
            <h3 className="text-lg font-semibold mb-2">{t('Best Performing Platform')}</h3>
            {platformStats.best ? (
              <div className="text-sm">
                <div className="font-medium">{platformStats.best.platform}</div>
                <div className="mt-1">📈 Avg ROI: <span className="font-semibold">{platformStats.best.avgRoi}x</span></div>
                <div className="mt-1">💰 Spend: ${platformStats.best.spend.toLocaleString()}</div>
                <div className="mt-1">👥 Leads: {platformStats.best.leads}</div>
              </div>
            ) : (
              <div className="text-sm text-[var(--muted-text)]">{t('No data')}</div>
            )}
          </section>
          <section className="glass-panel p-4">
            <h3 className="text-lg font-semibold mb-2">{t('Campaigns Needing Improvement')}</h3>
            <ul className="space-y-1 text-sm">
              {needingImprovement.map(c => (
                <li key={c.name}>⚠️ {c.name} — ROI {c.roi}x, CPL ${c.cpl}</li>
              ))}
              {needingImprovement.length === 0 && (
                <li className="text-[var(--muted-text)]">{t('None')}</li>
              )}
            </ul>
          </section>
          <section className="glass-panel p-4">
            <h3 className="text-lg font-semibold mb-2">{t('Recommendations')}</h3>
            <ul className="space-y-1 text-sm">
              {recommendations.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
  )
}
