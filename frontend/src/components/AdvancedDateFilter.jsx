import { useTranslation } from 'react-i18next'

export default function AdvancedDateFilter({ startDate, endDate, onChange, className = '' }) {
  const { t, i18n } = useTranslation()
  const isRTL = (i18n?.language || '').toLowerCase().startsWith('ar')

  const setRange = (from, to) => {
    const fmt = (d) => new Date(d).toISOString().split('T')[0]
    onChange?.({ startDate: fmt(from), endDate: fmt(to) })
  }

  const today = new Date()
  const presets = [
    { key: 'today', label: t('Today'), range: [today, today] },
    { key: 'last7', label: t('Last 7 Days'), range: [new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6), today] },
    { key: 'last30', label: t('Last 30 Days'), range: [new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29), today] },
    { key: 'thisMonth', label: t('This Month'), range: [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 0)] },
    { key: 'lastMonth', label: t('Last Month'), range: [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)] },
    { key: 'thisQuarter', label: t('This Quarter'), range: (() => { const q = Math.floor(today.getMonth() / 3) * 3; return [new Date(today.getFullYear(), q, 1), new Date(today.getFullYear(), q + 3, 0)] })() },
    { key: 'thisYear', label: t('This Year'), range: [new Date(today.getFullYear(), 0, 1), new Date(today.getFullYear(), 11, 31)] },
  ]

  return (
    <div className={`rounded-lg border border-[var(--panel-border)] bg-[var(--dropdown-bg)] p-3 ${className}`}>
      <div className={`flex flex-wrap items-center gap-2`}>
        <span className="text-sm opacity-70">{t('Advanced Date Filter')}</span>
        <div className={`flex flex-wrap items-center gap-2`}>
          {presets.map(p => (
            <button
              key={p.key}
              onClick={() => setRange(p.range[0], p.range[1])}
              className="px-2 py-1 text-xs rounded-full border border-[var(--panel-border)] bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 ${isRTL ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-70">{t('From')}</span>
          <input
            type="date"
            lang={isRTL ? 'ar' : 'en'}
            dir={isRTL ? 'rtl' : 'ltr'}
            placeholder={isRTL ? 'اليوم/الشهر/السنة' : 'mm/dd/yyyy'}
            value={startDate}
            onChange={(e) => onChange?.({ startDate: e.target.value, endDate })}
            className="bg-transparent outline-none text-sm px-2 py-1 rounded-md border"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-70">{t('To')}</span>
          <input
            type="date"
            lang={isRTL ? 'ar' : 'en'}
            dir={isRTL ? 'rtl' : 'ltr'}
            placeholder={isRTL ? 'اليوم/الشهر/السنة' : 'mm/dd/yyyy'}
            value={endDate}
            onChange={(e) => onChange?.({ startDate, endDate: e.target.value })}
            className="bg-transparent outline-none text-sm px-2 py-1 rounded-md border"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-70">{t('Month')}</span>
          <input
            type="month"
            value={`${(startDate || '').slice(0,7)}`}
            onChange={(e) => {
              const [y,m] = e.target.value.split('-')
              const first = new Date(parseInt(y), parseInt(m)-1, 1)
              const last = new Date(parseInt(y), parseInt(m), 0)
              setRange(first, last)
            }}
            className="bg-transparent outline-none text-sm px-2 py-1 rounded-md border"
          />
        </div>
      </div>
    </div>
  )
}
