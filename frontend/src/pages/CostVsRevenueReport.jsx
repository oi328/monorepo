import { useMemo, useState } from 'react'
// Layout removed per app-level layout usage
import { useTranslation } from 'react-i18next'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import * as XLSX from 'xlsx'
import { logExportEvent } from '../utils/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function CostVsRevenueReport() {
  const { t, i18n } = useTranslation()
  const isRTL = (i18n?.language || '').toLowerCase().startsWith('ar')

  const [startDate, setStartDate] = useState('2024-01-01')
  const [endDate, setEndDate] = useState('2024-03-31')
  const [query, setQuery] = useState('')

  const platforms = useMemo(() => ([
    { platform: 'Facebook', cost: 580, revenue: 1860 },
    { platform: 'Google Ads', cost: 450, revenue: 720 },
    { platform: 'Instagram', cost: 420, revenue: 540 },
  ]), [])

  const filtered = useMemo(() => platforms.filter(p => p.platform.toLowerCase().includes(query.toLowerCase())), [platforms, query])

  const totals = useMemo(() => {
    const totalCost = filtered.reduce((sum, p) => sum + p.cost, 0)
    const totalRevenue = filtered.reduce((sum, p) => sum + p.revenue, 0)
    return { totalCost, totalRevenue }
  }, [filtered])

  const exportExcel = () => {
    // Data sheet (platforms with cost/revenue)
    const wsData = XLSX.utils.json_to_sheet(filtered)

    // Totals sheet
    const totalsRow = [{
      'Total Cost (EGP)': totals.totalCost,
      'Total Revenue (EGP)': totals.totalRevenue,
      'ROI (x)': totals.totalCost ? (totals.totalRevenue / totals.totalCost) : 0
    }]
    const wsTotals = XLSX.utils.json_to_sheet(totalsRow)

    // Metadata sheet (selected date range, query, count)
    const metadata = [{
      'Start Date': startDate,
      'End Date': endDate,
      'Query': query || '',
      'Rows Exported': filtered.length,
      'Exported At': new Date().toISOString()
    }]
    const wsMeta = XLSX.utils.json_to_sheet(metadata)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsData, 'Platforms')
    XLSX.utils.book_append_sheet(wb, wsTotals, 'Totals')
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Metadata')
    const fileName = `cost-vs-revenue_${startDate}_to_${endDate}.xlsx`
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Cost vs Revenue Report',
      fileName,
      format: 'xlsx',
    })
  }

  const exportPdf = () => {
    const html = document.getElementById('report-root')?.innerHTML || ''
    const win = window.open('', 'PRINT', 'height=800,width=1000')
    if (!win) return
    win.document.write(`<html><head><title>${t('Cost vs Revenue by Platform')}</title></head><body>${html}</body></html>`) 
    win.document.close(); win.focus();
    win.print();
    logExportEvent({
      module: 'Cost vs Revenue Report',
      fileName: 'cost-vs-revenue.pdf',
      format: 'pdf',
    })
  }

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const tickColor = isDark ? '#e5e7eb' : '#374151'
  const labels = filtered.map(p => p.platform)
  const costVsRevenueData = {
    labels,
    datasets: [
      { label: t('Cost'), data: filtered.map(p => p.cost), backgroundColor: 'rgba(99, 102, 241, 0.85)', borderRadius: 6 },
      { label: t('Revenue'), data: filtered.map(p => p.revenue), backgroundColor: 'rgba(14, 165, 233, 0.85)', borderRadius: 6 }
    ]
  }
  const chartOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: tickColor } }, y: { grid: { display: false }, ticks: { color: tickColor } } }, plugins: { legend: { labels: { color: tickColor } } } }

  const roiData = {
    labels,
    datasets: [
      { label: t('ROI (x)'), data: filtered.map(p => (p.cost ? (p.revenue / p.cost) : 0)), backgroundColor: 'rgba(34, 197, 94, 0.85)', borderRadius: 6 }
    ]
  }

  return (
    <>
      <div id="report-root" className="space-y-6">
        <BackButton to="/reports" />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t('Cost vs Revenue by Platform')}</h1>
          <div className={`flex items-center gap-2`}>
            <button
              onClick={exportPdf}
              aria-label={t('Export PDF')}
              className="group inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[var(--panel-border)] bg-[var(--dropdown-bg)] hover:bg-[var(--dropdown-bg)]/80 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-300"
            >
              <RiFilePdfLine className="text-red-500" />
              <span className="font-medium">{t('Export PDF')}</span>
            </button>
            <button
              onClick={exportExcel}
              aria-label={t('Export Excel')}
              className="group inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[var(--panel-border)] bg-[var(--dropdown-bg)] hover:bg-[var(--dropdown-bg)]/80 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:focus-visible:ring-emerald-300"
            >
              <RiFileExcelLine className="text-emerald-500" />
              <span className="font-medium">{t('Export Excel')}</span>
            </button>
          </div>
        </div>

        {/* صف فاضي تحت العنوان */}
        <div className="h-6" aria-hidden="true" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="px-3 py-2 rounded-lg border bg-[var(--dropdown-bg)]">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search by Campaign or Source')} className="bg-transparent outline-none text-sm w-full" />
          </div>
        </div>

        {/* صف فاضي تحت فلتر التاريخ */}
        <div className="h-4" aria-hidden="true" />

        {/* فلتر تاريخ متقدّم */}
        <AdvancedDateFilter
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: s, endDate: e }) => { setStartDate(s); setEndDate(e) }}
          className="mt-2"
        />

        {/* عرض العناصر داخل فلتر التاريخ: التاريخ المختار والمنصات الحالية */}
        <div className="px-3 py-2 rounded-lg border bg-[var(--dropdown-bg)]">
          <div className={`flex flex-wrap items-center gap-2 text-sm`}>
            <span className="opacity-70">{t('Date Range')}:</span>
            <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600">{startDate}</span>
            <span className="opacity-60">—</span>
            <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600">{endDate}</span>
            <span className={`opacity-70 ${isRTL ? 'mr-0 ml-3' : 'ml-3'}`}>{t('Platforms')}:</span>
            {filtered.map(p => (
              <span
                key={p.platform}
                className="px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
              >
                {p.platform}
              </span>
            ))}
          </div>
        </div>

        {/* Comparative table */}
        <section className="glass-panel p-4">
          <div className={`flex items-center gap-2 mb-3`}>
            <div className={`${isRTL ? 'border-r-4' : 'border-l-4'} border-primary h-full`}></div>
            <h3 className={`${isRTL ? 'text-right' : ''} text-lg font-semibold`}>{t('Platform Performance')}</h3>
          </div>
          <div className="overflow-auto -mx-4 hidden md:block">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left opacity-70">
                  <th className="px-4 py-2">{t('Platform')}</th>
                  <th className="px-4 py-2">💰 {t('Spend')} (EGP)</th>
                  <th className="px-4 py-2">💵 {t('Revenue')} (EGP)</th>
                  <th className="px-4 py-2">{t('ROI')}</th>
                  <th className="px-4 py-2">{t('Profit / Loss')}</th>
                  <th className="px-4 py-2">{t('Cost %')}</th>
                  <th className="px-4 py-2">{t('Revenue %')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const roi = p.cost ? (p.revenue / p.cost) : 0
                  const profit = p.revenue - p.cost
                  const costPct = totals.totalCost ? ((p.cost / totals.totalCost) * 100) : 0
                  const revenuePct = totals.totalRevenue ? ((p.revenue / totals.totalRevenue) * 100) : 0
                  return (
                    <tr key={p.platform} className="border-t">
                      <td className="px-4 py-2 font-medium">{p.platform}</td>
                      <td className="px-4 py-2">{p.cost.toLocaleString()} EGP</td>
                      <td className="px-4 py-2">{p.revenue.toLocaleString()} EGP</td>
                      <td className="px-4 py-2">{roi.toFixed(1)}x</td>
                      <td className={`px-4 py-2 ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{profit >= 0 ? '+' : ''}{profit.toLocaleString()} EGP</td>
                      <td className="px-4 py-2">{costPct.toFixed(0)}%</td>
                      <td className="px-4 py-2">{revenuePct.toFixed(0)}%</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="px-4 py-2">{t('Total')}</td>
                  <td className="px-4 py-2">{totals.totalCost.toLocaleString()} EGP</td>
                  <td className="px-4 py-2">{totals.totalRevenue.toLocaleString()} EGP</td>
                  <td className="px-4 py-2">{(totals.totalCost ? (totals.totalRevenue / totals.totalCost) : 0).toFixed(1)}x</td>
                  <td className={`px-4 py-2 ${(totals.totalRevenue - totals.totalCost) >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{(totals.totalRevenue - totals.totalCost >= 0 ? '+' : '')}{(totals.totalRevenue - totals.totalCost).toLocaleString()} EGP</td>
                  <td className="px-4 py-2">100%</td>
                  <td className="px-4 py-2">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filtered.map((p) => {
              const roi = p.cost ? (p.revenue / p.cost) : 0
              const profit = p.revenue - p.cost
              const costPct = totals.totalCost ? ((p.cost / totals.totalCost) * 100) : 0
              const revenuePct = totals.totalRevenue ? ((p.revenue / totals.totalRevenue) * 100) : 0
              return (
                <div key={p.platform} className="card glass-card p-4 space-y-3 bg-white/5">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h4 className="font-semibold text-sm">{p.platform}</h4>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                      {roi.toFixed(1)}x ROI
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">💰 {t('Spend')}</span>
                      <span className="text-xs font-medium">{p.cost.toLocaleString()} EGP</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">💵 {t('Revenue')}</span>
                      <span className="text-xs font-medium">{p.revenue.toLocaleString()} EGP</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{t('Profit')}</span>
                      <span className={`text-xs font-medium ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{t('Share')}</span>
                      <span className="text-xs text-[var(--muted-text)]">
                        {costPct.toFixed(0)}% / {revenuePct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Totals Card */}
            <div className="card glass-card p-4 space-y-3 bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                <h4 className="font-semibold text-sm">{t('Total')}</h4>
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--muted-text)] text-xs">💰 {t('Spend')}</span>
                  <span className="text-xs font-medium">{totals.totalCost.toLocaleString()} EGP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--muted-text)] text-xs">💵 {t('Revenue')}</span>
                  <span className="text-xs font-medium">{totals.totalRevenue.toLocaleString()} EGP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--muted-text)] text-xs">{t('ROI')}</span>
                  <span className="text-xs font-medium">{(totals.totalCost ? (totals.totalRevenue / totals.totalCost) : 0).toFixed(1)}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--muted-text)] text-xs">{t('Profit')}</span>
                  <span className={`text-xs font-medium ${(totals.totalRevenue - totals.totalCost) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(totals.totalRevenue - totals.totalCost >= 0 ? '+' : '')}{(totals.totalRevenue - totals.totalCost).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* صف فاضي تحت قسم Platform Performance */}
        <div className="h-6" aria-hidden="true" />

        {/* Charts grid: Cost vs Revenue and ROI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="glass-panel p-4">
            <h3 className="text-lg font-semibold mb-3">{t('Cost vs Revenue')}</h3>
            <div style={{ height: '280px' }}>
              <Bar data={costVsRevenueData} options={chartOptions} />
            </div>
            <div className="mt-3 text-xs text-[var(--muted-text)]">{t('Last 30 Days')}</div>
          </section>
          <section className="glass-panel p-4">
            <h3 className="text-lg font-semibold mb-3">{t('ROI Comparison')}</h3>
            <div style={{ height: '280px' }}>
              <Bar data={roiData} options={chartOptions} />
            </div>
            <div className="mt-3 text-xs text-[var(--muted-text)]">{t('Last 30 Days')}</div>
          </section>
        </div>
        {/* صف فاضي تحت الرسوم (Cost vs Revenue و ROI Comparison) */}
        <div className="h-6" aria-hidden="true" />

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="glass-panel p-4">
            <h3 className="text-lg font-semibold mb-2">{t('Best ROI Platform')}</h3>
            {(() => {
              const best = filtered
                .map(p => ({ ...p, roi: p.cost ? (p.revenue / p.cost) : 0 }))
                .sort((a,b) => b.roi - a.roi)[0]
              return best ? (
                <div className="text-sm">
                  <div className="font-medium">{best.platform}</div>
                  <div className="mt-1">ROI: <span className="font-semibold">{best.roi.toFixed(1)}x</span></div>
                  <div className="mt-1">Spend: {best.cost.toLocaleString()} EGP</div>
                  <div className="mt-1">Revenue: {best.revenue.toLocaleString()} EGP</div>
                </div>
              ) : (
                <div className="text-sm text-[var(--muted-text)]">{t('No data')}</div>
              )
            })()}
          </section>
          <section className="glass-panel p-4">
            <h3 className="text-lg font-semibold mb-2">{t('Highest Revenue Contributor')}</h3>
            {(() => {
              const top = filtered
                .map(p => ({ ...p, revenuePct: totals.totalRevenue ? (p.revenue / totals.totalRevenue) : 0 }))
                .sort((a,b) => b.revenue - a.revenue)[0]
              return top ? (
                <div className="text-sm">
                  <div className="font-medium">{top.platform}</div>
                  <div className="mt-1">Revenue: {top.revenue.toLocaleString()} EGP</div>
                  <div className="mt-1">Contribution: {(top.revenuePct * 100).toFixed(0)}%</div>
                </div>
              ) : (
                <div className="text-sm text-[var(--muted-text)]">{t('No data')}</div>
              )
            })()}
          </section>
          <section className="glass-panel p-4">
            <h3 className="text-lg font-semibold mb-2">{t('Recommendations')}</h3>
            <ul className="text-sm space-y-1">
              {filtered.map(p => {
                const roi = p.cost ? (p.revenue / p.cost) : 0
                const profit = p.revenue - p.cost
                if (roi >= 2) return <li key={`rec-${p.platform}`}>✅ {t('Consider increasing budget for')} {p.platform} ({roi.toFixed(1)}x)</li>
                if (profit < 0) return <li key={`rec-${p.platform}`}>⚠️ {t('Reduce spend or optimize')} {p.platform} ({profit.toLocaleString()} EGP)</li>
                return <li key={`rec-${p.platform}`}>ℹ️ {t('Monitor performance and test creatives for')} {p.platform}</li>
              })}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
