
// Simple funnel using progress bars to visualize stages
const stageColors = {
  new: '#60a5fa',
  contacted: '#34d399',
  qualified: '#f59e0b',
  proposal: '#a78bfa',
  closed: '#22d3ee'
}

const FunnelChart = ({ stages = [] }) => {
  // Use 'value' or 'count' consistently. SalesLeads uses 'value'.
  const total = stages.reduce((s, st) => s + (st.value || st.count || 0), 0) || 1
  return (
    <div className="space-y-3">
      {stages.map((st, idx) => {
        const val = st.value || st.count || 0
        const pct = Math.round((val / total) * 100)
        // Use st.key for color lookup if available
        const color = st.color || stageColors[st.key] || stageColors[st.label] || '#64748b'
        return (
          <div key={idx}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-gray-200">{st.label}</div>
              <div className="text-xs text-gray-400">{val} • {pct}%</div>
            </div>
            <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FunnelChart