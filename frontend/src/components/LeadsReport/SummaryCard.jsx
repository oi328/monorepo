import { useTranslation } from 'react-i18next'

const SummaryCard = ({ title, subtitle, data = [] }) => {
  const { i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  const lastSix = data.slice(-6)
  return (
    <div className="p-4 md:p-6 rounded-xl border border-gray-800 bg-[#0b1220]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold">{title}</h3>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 font-medium text-gray-200 text-start">{isRTL ? 'الشهر' : 'Month'}</th>
                <th className="px-3 py-2 font-medium text-gray-200 text-end">{isRTL ? 'الإيرادات' : 'Revenue'}</th>
              </tr>
            </thead>
            <tbody>
              {lastSix.map((r, idx) => (
                <tr key={idx} className="odd:bg-gray-900 even:bg-gray-800">
                  <td className="px-3 py-2 text-start">{r.name}</td>
                  <td className="px-3 py-2 text-end">{r.revenue?.toLocaleString?.() ?? r.revenue}</td>
                </tr>
              ))}
              {lastSix.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-400" colSpan={2}>{isRTL ? 'لا توجد بيانات' : 'No data'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
            <LineChart data={lastSix} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} reversed={isRTL} />
              <YAxis tick={{ fill: '#94a3b8' }} orientation={isRTL ? 'right' : 'left'} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: isRTL ? 'right' : 'left' }}
                itemStyle={{ color: '#111827', fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '0.25rem' }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">{isRTL ? 'آخر 6 أشهر' : 'Last 6 months'}</div>
    </div>
  )
}

export default SummaryCard