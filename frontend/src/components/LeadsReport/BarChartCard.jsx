import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const COLORS = {
  Answered: '#10b981',
  'Not Answered': '#ef4444',
  Busy: '#f59e0b',
  'Wrong Number': '#64748b',
}

const BarChartCard = ({ title, subtitle, data = [] }) => {
  const { i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  const [sortDir, setSortDir] = useState('desc')
  const chartData = useMemo(() => {
    const arr = Array.isArray(data) ? [...data] : []
    return arr.sort((a, b) => sortDir === 'desc' ? (b.value || 0) - (a.value || 0) : (a.value || 0) - (b.value || 0))
  }, [data, sortDir])
  const total = useMemo(() => chartData.reduce((s, d) => s + (d.value || 0), 0), [chartData])

  return (
    <div className="p-4 md:p-6 rounded-xl border border-gray-800 bg-[#0b1220]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold">{title}</h3>
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{isRTL ? 'إجمالي' : 'Total'}: {total}</span>
          <button
            className={`px-2 py-1 text-xs rounded-md border transition ${sortDir==='desc' ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'}`}
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            title={sortDir==='desc' ? (isRTL ? 'ترتيب تصاعدي' : 'Ascending Order') : (isRTL ? 'ترتيب تنازلي' : 'Descending Order')}
          >
            {sortDir === 'desc' ? (isRTL ? '↘︎ تنازلي' : '↘︎ Desc') : (isRTL ? '↗︎ تصاعدي' : '↗︎ Asc')}
          </button>
        </div>
      </div>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 24, left: 24, bottom: 10 }}>
            <XAxis type="number" hide reversed={isRTL} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#94a3b8' }} orientation={isRTL ? 'right' : 'left'} />
            <Tooltip 
              cursor={{ fill: 'rgba(148,163,184,0.15)' }}
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: isRTL ? 'right' : 'left' }}
              itemStyle={{ color: '#111827', fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '0.25rem' }}
              formatter={(value, name) => {
                const pct = Math.round((Number(value) / Math.max(total, 1)) * 100)
                return [`${value} (${pct}%)`, name]
              }}
            />
            <Bar dataKey="value" barSize={18} radius={[8, 8, 8, 8]} isAnimationActive animationDuration={500}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#3b82f6'} />
              ))}
              <LabelList 
                dataKey="value" 
                position={isRTL ? 'left' : 'right'} 
                formatter={(v) => `${v} (${Math.round((v / Math.max(total, 1)) * 100)}%)`} 
                fill="#e2e8f0" 
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2">
        {chartData.map((d, idx) => (
          <span key={`legend-${idx}`} className="inline-flex items-center gap-2 text-xs text-gray-300">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[d.name] || '#3b82f6' }} />
            <span>{d.name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default BarChartCard