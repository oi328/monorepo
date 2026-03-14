import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export default function LeadsPerformance() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'

  // Data aligned with the shared design
  const sourcesData = [
    { source: 'Facebook', leads: 500, converted: 120, revenue: 90000 },
    { source: 'Google Ads', leads: 300, converted: 110, revenue: 110000 },
    { source: 'Referral', leads: 150, converted: 80, revenue: 130000 },
    { source: 'Email', leads: 100, converted: 40, revenue: 30000 }
  ]

  // Options state
  const [sortBy, setSortBy] = useState('Leads')
  const [descending, setDescending] = useState(true)
  const [stacked, setStacked] = useState(true)
  const [horizontal, setHorizontal] = useState(false)
  const [showLeads, setShowLeads] = useState(true)
  const [showConverted, setShowConverted] = useState(true)
  const [search, setSearch] = useState('')
  const [advStartDate, setAdvStartDate] = useState('2024-01-01')
  const [advEndDate, setAdvEndDate] = useState('2024-03-31')
  const [subtitle, setSubtitle] = useState('Last 30 Days')
  const [selected, setSelected] = useState(sourcesData.map(s => s.source))
  const [normalize, setNormalize] = useState(false)
  const [topN, setTopN] = useState(sourcesData.length)

  const displaySources = useMemo(() => {
    const getConvRate = (r) => (r.leads > 0 ? Math.min(r.converted, r.leads) / r.leads : 0)
    let arr = sourcesData.filter(s => selected.includes(s.source))
    if (search) arr = arr.filter(s => s.source.toLowerCase().includes(search.toLowerCase()))
    arr = arr.slice().sort((a, b) => {
      if (sortBy === 'Conversion Rate') {
        return descending ? (getConvRate(b) - getConvRate(a)) : (getConvRate(a) - getConvRate(b))
      }
      const metric = sortBy === 'Leads' ? 'leads' : sortBy === 'Converted' ? 'converted' : 'revenue'
      return descending ? (b[metric] - a[metric]) : (a[metric] - b[metric])
    })
    if (topN && topN > 0) arr = arr.slice(0, Math.min(topN, arr.length))
    return arr
  }, [sourcesData, selected, search, sortBy, descending, topN])

  const totalLeads = displaySources.reduce((sum, s) => sum + s.leads, 0)

  const toggleSelected = (name) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  const handleExportCSV = () => {
    const headers = ['Source','Leads','Converted','Revenue']
    const rows = displaySources.map(s => [s.source, s.leads, s.converted, s.revenue])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lead-source-performance.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 bg-transparent text-[var(--content-text)]">
      <BackButton to="/reports" />
      <h1 className="text-2xl font-semibold">{t('Lead Source Performance')}</h1>

        {/* Options card */}
        <div className="card glass-card p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sorting group */}
            <div className="rounded-lg ring-1 ring-gray-200 dark:ring-gray-800 p-3">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('Sorting')}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="label">{t('Time Range')}</label>
                  <SearchableSelect value={subtitle} onChange={(v) => setSubtitle(v)}>
                    <option value="Last 30 Days">{t('Last 30 Days')}</option>
                    <option value="Last Quarter">{t('Last Quarter')}</option>
                    <option value="Last Year">{t('Last Year')}</option>
                  </SearchableSelect>
                </div>
                <div className="flex flex-col">
                  <label className="label">{t('Sort By')}</label>
                  <SearchableSelect value={sortBy} onChange={(v) => setSortBy(v)}>
                    <option value="Leads">{t('Leads')}</option>
                    <option value="Converted">{t('Converted')}</option>
                    <option value="Revenue">{t('Revenue')}</option>
                    <option value="Conversion Rate">{t('Conversion Rate')}</option>
                  </SearchableSelect>
                </div>
                <div className="flex items-center gap-2">
                  <input id="desc" type="checkbox" checked={descending} onChange={(e) => setDescending(e.target.checked)} />
                  <label htmlFor="desc" className="text-sm">{t('Descending')}</label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm" htmlFor="topN">{t('Top N')}</label>
                  <input id="topN" className="input w-20" type="number" min="1" max={sourcesData.length} value={topN} onChange={(e) => setTopN(Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Chart group */}
            <div className="rounded-lg ring-1 ring-gray-200 dark:ring-gray-800 p-3">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('Chart')}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <input id="stacked" type="checkbox" checked={stacked} onChange={(e) => setStacked(e.target.checked)} />
                  <label htmlFor="stacked" className="text-sm">{t('Stacked')}</label>
                </div>
                <div className="flex items-center gap-2">
                  <input id="normalize" type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} />
                  <label htmlFor="normalize" className="text-sm">{t('100% Stacked')}</label>
                </div>
                <div className="flex items-center gap-2">
                  <input id="horizontal" type="checkbox" checked={horizontal} onChange={(e) => setHorizontal(e.target.checked)} />
                  <label htmlFor="horizontal" className="text-sm">{t('Horizontal')}</label>
                </div>
              </div>
            </div>

            {/* Display group */}
            <div className="rounded-lg ring-1 ring-gray-200 dark:ring-gray-800 p-3">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('Display')}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-indigo-500"></span>
                  <input id="showLeads" type="checkbox" checked={showLeads} onChange={(e) => setShowLeads(e.target.checked)} />
                  <label htmlFor="showLeads" className="text-sm">{t('Show Unconverted')}</label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-sky-500"></span>
                  <input id="showConverted" type="checkbox" checked={showConverted} onChange={(e) => setShowConverted(e.target.checked)} />
                  <label htmlFor="showConverted" className="text-sm">{t('Show Converted')}</label>
                </div>
              </div>
            </div>
          </div>

          {/* Search + actions */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="label">{t('Search')}</label>
              <input className="input" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder={t('Search source...')} />
            </div>
            <div className="flex md:justify-end">
              <button className="btn btn-outline" onClick={handleExportCSV}>{t('Export CSV')}</button>
            </div>
          </div>

          {/* Advanced Date Filter */}
          <AdvancedDateFilter
            startDate={advStartDate}
            endDate={advEndDate}
            onChange={({ startDate: s, endDate: e }) => { setAdvStartDate(s); setAdvEndDate(e) }}
            className="mt-2"
          />

          {/* Source filters */}
          <div className="mt-4 rounded-lg ring-1 ring-gray-200 dark:ring-gray-800 p-3">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('Sources')}</div>
            <div className="flex flex-wrap gap-3">
              {sourcesData.map(s => (
                <label key={s.source} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.includes(s.source)} onChange={() => toggleSelected(s.source)} />
                  <span>{s.source}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Top section: table + total leads */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Table */}
          <div className="card glass-card p-4 md:col-span-2">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="nova-table w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="py-2 pr-4">{t('Source')}</th>
                    <th className="py-2 pr-4">{t('Leads')}</th>
                    <th className="py-2 pr-4">{t('Converted')}</th>
                    <th className="py-2 pr-4">{t('Conversion Rate')}</th>
                    <th className="py-2 pr-4">{t('Revenue')}</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-100">
                  {displaySources.map((row) => (
                    <tr key={row.source} className="border-t border-gray-200 dark:border-gray-800">
                      <td className="py-2 pr-4">{row.source}</td>
                      <td className="py-2 pr-4">{row.leads.toLocaleString()}</td>
                      <td className="py-2 pr-4">{row.converted.toLocaleString()}</td>
                      <td className="py-2 pr-4">{(((Math.min(row.converted, row.leads) / (row.leads || 1)) * 100)).toFixed(1)}%</td>
                      <td className="py-2 pr-4">${row.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {displaySources.map((row) => (
                <div key={row.source} className="card glass-card p-4 space-y-3 bg-white/5">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h4 className="font-semibold text-sm">{row.source}</h4>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                      {t('Source')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{t('Leads')}</span>
                      <span className="text-xs font-medium">{row.leads.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{t('Converted')}</span>
                      <span className="text-xs">{row.converted.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{t('Conv. Rate')}</span>
                      <span className="text-xs font-medium text-green-400">
                        {(((Math.min(row.converted, row.leads) / (row.leads || 1)) * 100)).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-text)] text-xs">{t('Revenue')}</span>
                      <span className="text-xs font-medium">${row.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Leads metric */}
          <div className="card glass-card p-6 flex flex-col items-start justify-between">
            <div>
              <div className="text-lg font-semibold mb-1">{t('Total Leads')}</div>
              <div className="text-5xl font-extrabold tracking-tight">{totalLeads.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Chart section */}
        <div className="card glass-card p-4">
          <LeadSourcePerformanceChart sources={displaySources} height={280} stacked={stacked} horizontal={horizontal} showLeads={showLeads} showConverted={showConverted} subtitle={subtitle} normalize={normalize} />
        </div>
      </div>
  )
}
