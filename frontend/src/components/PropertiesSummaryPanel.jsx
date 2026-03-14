
export default function PropertiesSummaryPanel({ stats, isRTL, onFilter }) {
  const Item = ({ label, value, filter, tone = 'tinted-blue' }) => (
    <button
      className={`glass-panel ${tone} rounded-xl p-4 w-full text-left hover:shadow-md transition`}
      onClick={()=> filter && onFilter(filter)}
    >
      <div className="text-sm text-[var(--muted-text)]">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </button>
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Item tone="tinted-blue" label={isRTL ? 'إجمالي العقارات' : 'Total Properties'} value={stats.total} filter={{type: 'all'}} />
      <Item tone="tinted-amber" label={isRTL ? 'المتاحة' : 'Available'} value={stats.available} filter={{type: 'status', value: 'Available'}} />
      <Item tone="tinted-violet" label={isRTL ? 'الحجوزات' : 'Reserved'} value={stats.reserved} filter={{type: 'status', value: 'Reserved'}} />
      <Item tone="tinted-emerald" label={isRTL ? 'المباعة' : 'Sold'} value={stats.sold} filter={{type: 'status', value: 'Sold'}} />
      <Item tone="tinted-orange" label={isRTL ? 'إعادة بيع' : 'Resale'} value={stats.resale} filter={{type: 'status', value: 'Resale'}} />
      <Item tone="tinted-cyan" label={isRTL ? 'إيجار' : 'Rent'} value={stats.rent} filter={{type: 'status', value: 'Rent'}} />
    </div>
  )
}
