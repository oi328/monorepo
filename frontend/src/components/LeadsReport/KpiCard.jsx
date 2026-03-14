
const KpiCard = ({ icon, label, value, tone = 'default', tooltip }) => {
  const toneClass = tone === 'success'
    ? 'text-green-400'
    : tone === 'warning'
    ? 'text-amber-400'
    : tone === 'info'
    ? 'text-blue-400'
    : 'text-[#f1f5f9]'

  return (
    <div className="p-4 md:p-6 rounded-xl border border-gray-800 bg-[#0b1220] hover:scale-105 transition">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400" title={tooltip}>{label}</div>
        <div className="text-xl text-gray-300">{icon}</div>
      </div>
      <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  )
}

export default KpiCard