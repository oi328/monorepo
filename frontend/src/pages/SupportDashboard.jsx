import React, { useEffect, useMemo, useState, useRef } from 'react'
// Removed page-level tabs per request
import { useTranslation } from 'react-i18next'
 
import { api } from '../utils/api'
import { PieChart } from '../shared/components/PieChart'
import { motion } from 'framer-motion'

export default function SupportDashboard() {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState([])
  const [error, setError] = useState('')
  const [range, setRange] = useState('this_month') // this_month | this_week | last_month | all

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const r = await api.get('/api/tickets', { params: { limit: 500 } })
        const items = Array.isArray(r.data?.items) ? r.data.items : (Array.isArray(r.data) ? r.data : [])
        setTickets(items)
      } catch (e) {
        console.warn('support_dashboard_load_failed', e)
        setError(t('Failed to load tickets'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [t])

  const filtered = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const inRange = (d) => {
      const dt = new Date(d)
      if (range === 'this_week') return dt >= startOfWeek
      if (range === 'this_month') return dt >= startOfMonth
      if (range === 'last_month') return dt >= startOfLastMonth && dt <= endOfLastMonth
      return true
    }
    return tickets.filter(x => x.createdAt && inRange(x.createdAt))
  }, [tickets, range])

  const prevFiltered = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    let start, end
    if (range === 'this_week') {
      end = startOfWeek
      start = new Date(startOfWeek)
      start.setDate(start.getDate() - 7)
    } else if (range === 'this_month') {
      start = startOfLastMonth
      end = endOfLastMonth
    } else if (range === 'last_month') {
      const startPrev = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      const endPrev = new Date(now.getFullYear(), now.getMonth() - 1, 0)
      start = startPrev
      end = endPrev
    } else {
      return []
    }
    return tickets.filter(x => x.createdAt && new Date(x.createdAt) >= start && new Date(x.createdAt) <= end)
  }, [tickets, range])

  const computeMetrics = React.useCallback((list) => {
    const total = list.length
    const statusCount = (s) => list.filter(x => String(x.status) === String(s)).length
    const open = statusCount('Open')
    const inProgress = statusCount('In Progress')
    const escalated = statusCount('Escalated')
    const closed = statusCount('Closed')

    const overdue = list.filter(x => x.slaDeadline && (!x.status || x.status !== 'Closed') && new Date(x.slaDeadline) < new Date()).length

    const closedWithTimes = list.filter(x => x.status === 'Closed' && x.updatedAt && x.createdAt)
    const avgResolutionHours = closedWithTimes.length > 0
      ? Math.round(closedWithTimes.reduce((acc, x) => {
          const dt = (new Date(x.updatedAt) - new Date(x.createdAt)) / (1000 * 60 * 60)
          return acc + Math.max(0, dt)
        }, 0) / closedWithTimes.length)
      : 80

    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 0

    const priorityKeys = ['Low', 'Medium', 'High', 'Urgent']
    const priorityCounts = Object.fromEntries(priorityKeys.map(k => [k, list.filter(x => x.priority === k).length]))

    const channelKeys = ['Email', 'Phone', 'Customer Portal', 'WhatsApp', 'Social Media']
    const channelCounts = Object.fromEntries(channelKeys.map(k => [k, list.filter(x => x.channel === k).length]))

    const typeKeys = ['Complaint', 'Inquiry', 'Request']
    const typeCounts = Object.fromEntries(typeKeys.map(k => [k, list.filter(x => x.type === k).length]))

    const closedTickets = list.filter(x => x.status === 'Closed')
    const onTimeCount = closedTickets.filter(x => x.slaDeadline && x.updatedAt && new Date(x.updatedAt) <= new Date(x.slaDeadline)).length
    const slaOnTimePct = closedTickets.length > 0 ? Math.round((onTimeCount / closedTickets.length) * 100) : 92

    const byAgent = new Map()
    list.forEach(x => {
      const key = x.assignedAgent || t('Unassigned')
      const obj = byAgent.get(key) || { name: key, closed: 0, total: 0 }
      obj.total += 1
      if (x.status === 'Closed') obj.closed += 1
      byAgent.set(key, obj)
    })
    const teamRows = Array.from(byAgent.values()).map(r => ({
      agent: r.name,
      ticketsClosed: r.closed,
      avgResponse: '—',
      satisfaction: '—',
    }))

    return {
      total, open, inProgress, escalated, closed, overdue, avgResolutionHours, resolutionRate,
      priorityCounts, channelCounts, typeCounts, slaOnTimePct, teamRows
    }
  }, [t])

  const metrics = useMemo(() => computeMetrics(filtered), [filtered, computeMetrics])
  const prevMetrics = useMemo(() => computeMetrics(prevFiltered), [prevFiltered, computeMetrics])

  const pctDelta = (curr, prev) => {
    if (!prev || prev === 0) return curr ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  // sparkline series from ticket counts binned over time window
  const seriesCounts = (list, predicate = () => true, bins = 8) => {
    if (!list.length) return new Array(bins).fill(0)
    const dates = list.map(x => new Date(x.createdAt)).sort((a, b) => a - b)
    const start = dates[0]
    const end = dates[dates.length - 1]
    const span = end - start || 1
    const arr = new Array(bins).fill(0)
    list.forEach(x => {
      if (!predicate(x)) return
      const dt = new Date(x.createdAt)
      const p = Math.min(bins - 1, Math.max(0, Math.floor(((dt - start) / span) * bins)))
      arr[p] += 1
    })
    if (arr.every(v => v === 0)) return new Array(bins).fill(0).map((_, i) => (i ? i : 0))
    return arr
  }

  const seriesTotal = useMemo(() => seriesCounts(filtered), [filtered])
  const seriesOpen = useMemo(() => seriesCounts(filtered, (x) => x.status === 'Open'), [filtered])
  const seriesResolutionRate = useMemo(() => seriesCounts(filtered, (x) => x.status === 'Closed'), [filtered])

  const maxChannel = useMemo(() => {
    const vals = Object.values(metrics.channelCounts || {})
    return Math.max(1, ...(vals.length ? vals : [1]))
  }, [metrics])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('Customer Service Dashboard')}</h1>
        <div className="flex items-center gap-2 text-sm">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="px-3 py-1 rounded glass-panel bg-transparent">
            <option value="this_month">{t('This Month')}</option>
            <option value="this_week">{t('This Week')}</option>
            <option value="last_month">{t('Last Month')}</option>
            <option value="all">{t('All')}</option>
          </select>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {(() => { const MotionDiv = motion.div; return (
        <MotionDiv
          key={range}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
        >
          {/* KPI cards */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-panel p-3">
                  <div className="skeleton-line h-3 w-24 mb-2"></div>
                  <div className="skeleton-line h-6 w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              <KpiCard
                title={t('Total Tickets')}
                value={metrics.total}
                delta={pctDelta(metrics.total, prevMetrics.total)}
                series={seriesTotal}
                color="emerald"
              />
              <KpiCard
                title={t('Open')}
                value={metrics.open}
                delta={pctDelta(metrics.open, prevMetrics.open)}
                series={seriesOpen}
                color="emerald"
                dotColor="amber"
              />
              <AlertsCard overdue={metrics.overdue} />
              <KpiCard
                title={t('Average Resolution Time')}
                value={metrics.avgResolutionHours}
                suffix="h"
                delta={pctDelta(metrics.avgResolutionHours, prevMetrics.avgResolutionHours)}
                series={seriesResolutionRate}
                color="emerald"
              />
              <KpiCard
                title={t('Resolution Rate')}
                value={metrics.resolutionRate}
                suffix="%"
                delta={pctDelta(metrics.resolutionRate, prevMetrics.resolutionRate)}
                series={seriesResolutionRate}
                color="rose"
              />
              <KpiCard
                title={t('Reopened Tickets')}
                value={metrics.escalated}
                delta={pctDelta(metrics.escalated, prevMetrics.escalated)}
                series={seriesOpen}
                color="emerald"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tickets by Priority (Donut) */}
            {loading ? (
              <div className="glass-panel p-4">
                <div className="skeleton-line h-4 w-40 mb-3"></div>
                <div className="skeleton-circle h-40 w-40 mx-auto"></div>
              </div>
            ) : (
              <div className="glass-panel p-4 cm-anim transition-transform hover:translate-y-[1px]">
                <div className="text-sm font-medium mb-2">{t('Tickets by Priority')}</div>
                <PieChart
                  segments={[
                    { label: t('High'), value: metrics.priorityCounts.High, color: '#ef4444' },
                    { label: t('Medium'), value: metrics.priorityCounts.Medium, color: '#f59e0b' },
                    { label: t('Low'), value: metrics.priorityCounts.Low, color: '#10b981' },
                    { label: t('Urgent'), value: metrics.priorityCounts.Urgent, color: '#fb7185' },
                  ]}
                  size={180}
                  centerLabel={t('Total')}
                  centerValue={metrics.total}
                  animateCenterCountUp
                  borderRadius={8}
                />
              </div>
            )}

            {/* Tickets by Channel (Bars) */}
            {loading ? (
              <div className="glass-panel p-4">
                <div className="skeleton-line h-4 w-40 mb-3"></div>
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton-line h-3 w-full"></div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-panel p-4 cm-anim delay-200 transition-transform hover:translate-y-[1px]">
                <div className="text-sm font-medium mb-2">{t('Tickets by Channel')}</div>
                <div className="space-y-2">
                  {Object.entries(metrics.channelCounts).map(([label, val]) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-28 text-xs opacity-80">{t(label)}</div>
                      <div className="flex-1 h-3 rounded bg-white/10">
                        <div className="h-3 rounded transition-all bar-gradient-fill-emerald bar-wave" style={{ width: `${Math.round((val / maxChannel) * 100)}%` }}></div>
                      </div>
                      <div className="w-8 text-xs opacity-70 text-right">{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Top Contact Reasons (Types) */}
            {loading ? (
              <div className="glass-panel p-4 animate-pulse">
                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-panel p-4 cm-anim transition-transform hover:translate-y-[1px]">
                <div className="text-sm font-medium mb-2">{t('Top Contact Reasons')}</div>
                <ul className="text-sm opacity-80 space-y-1">
                  {Object.entries(metrics.typeCounts).map(([k, v]) => (
                    <li key={k}>{t(k)} — {v}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* SLA Contact Reasons */}
            {loading ? (
              <div className="glass-panel p-4">
                <div className="skeleton-line h-4 w-40 mb-3"></div>
                <div className="skeleton-circle h-40 w-40 mx-auto"></div>
              </div>
            ) : (
              <div className="glass-panel p-4 cm-anim delay-200 transition-transform hover:translate-y-[1px]">
                <div className="text-sm font-medium mb-2">{t('SLA Contact Reasons')}</div>
                <PieChart
                  percentage={metrics.slaOnTimePct}
                  centerValue={metrics.slaOnTimePct}
                  centerValueSuffix="%"
                  centerLabel={t('On-time')}
                  size={180}
                  animateCenterCountUp
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Customer Satisfaction */}
            <div className="glass-panel p-4 cm-anim transition-transform hover:translate-y-[1px]">
              <div className="text-sm font-medium mb-2">{t('Customer Satisfaction')}</div>
              <div className="flex items-center gap-2 mb-2">
                <span>⭐</span>
                <span className="text-xl font-semibold">4.6/5</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: t('Positive'), pct: 85 },
                  { label: t('Neutral'), pct: 10 },
                  { label: t('Negative'), pct: 5 },
                ].map(({ label, pct }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-24 text-xs opacity-80">{label}</div>
                    <div className="flex-1 h-3 rounded bg-white/10">
                      <div className="h-3 rounded transition-all bar-gradient-fill-emerald bar-wave" style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="w-10 text-xs opacity-70 text-right">{pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Time by Channel (demo) */}
            <div className="glass-panel p-4 cm-anim delay-200 transition-transform hover:translate-y-[1px]">
              <div className="text-sm font-medium mb-2">{t('Avg Response Time')}</div>
              <div className="space-y-2">
                {[
                  { label: t('Email'), val: 30 },
                  { label: t('Phone'), val: 3 },
                  { label: t('Live Chat'), val: 1 },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-28 text-xs opacity-80">{label}</div>
                    <div className="flex-1 h-3 rounded bg-white/10">
                      <div className="h-3 rounded transition-all bar-gradient-fill-blue bar-wave" style={{ width: `${Math.min(100, (val / 30) * 100)}%` }}></div>
                    </div>
                    <div className="w-16 text-xs opacity-70 text-right">{val}m</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team performance table */}
          <div className="glass-panel p-4 mt-4">
            <div className="text-sm font-medium mb-3">{t('Team Performance')}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm nova-table">
                <thead>
                  <tr className="text-left bg-[var(--table-header-bg)]">
                    <th className="px-3 py-2">{t('Agent')}</th>
                    <th className="px-3 py-2">{t('Tickets Closed')}</th>
                    <th className="px-3 py-2">{t('Avg. Response Time')}</th>
                    <th className="px-3 py-2">{t('Satisfaction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.teamRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-[var(--muted-text)]">{loading ? t('Loading...') : t('No data')}</td>
                    </tr>
                  )}
                  {metrics.teamRows.map((r, i) => (
                    <tr key={i} className="border-t border-[var(--table-row-border)] odd:bg-[var(--table-row-bg)] hover:bg-[var(--table-row-hover)] transition-colors">
                      <td className="px-3 py-2">{r.agent}</td>
                      <td className="px-3 py-2">{r.ticketsClosed}</td>
                      <td className="px-3 py-2">{r.avgResponse}</td>
                      <td className="px-3 py-2">{r.satisfaction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <div className="mt-3 text-xs text-rose-400">{error}</div>}
        </MotionDiv>
        ) })()}
      </AnimatePresence>
    </>
  )
}

function Sparkline({ data = [], color = 'emerald' }) {
  const w = 80, h = 36, p = 3
  const min = Math.min(...data, 0)
  const max = Math.max(...data, 1)
  const range = max - min || 1
  const stepX = (w - p * 2) / Math.max(1, data.length - 1)
  const points = data.map((v, i) => {
    const x = p + i * stepX
    const y = h - p - ((v - min) / range) * (h - p * 2)
    return `${x},${y}`
  }).join(' ')
  const stroke = color === 'emerald' ? '#10b981' : color === 'rose' ? '#ef4444' : '#94a3b8'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70">
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
    </svg>
  )
}

function KpiCard({ title, value, suffix, delta, series, color = 'emerald', dotColor }) {
  const deltaColor = delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
  return (
    <div className="glass-panel p-3 cm-anim transition-transform hover:translate-y-[1px]">
      <div className="text-xs opacity-80 flex items-center gap-2">
        {dotColor && <span className={`inline-block h-2 w-2 rounded-full bg-${dotColor}-400`}></span>}
        <span>{title}</span>
      </div>
      <div className="text-2xl font-semibold flex items-baseline gap-1 mt-1">
        <CountUp value={typeof value === 'number' ? value : 0} />
        {suffix && <span className="text-xs opacity-70">{suffix}</span>}
      </div>
      {Array.isArray(series) && series.length > 1 && (
        <div className="mt-1">
          <Sparkline data={series} color={color} />
        </div>
      )}
      <div className={`text-[11px] mt-1 ${deltaColor}`}>{delta >= 0 ? `+${delta}%` : `${delta}%`}</div>
    </div>
  )
}

function AlertsCard({ overdue }) {
  return (
    <div className="glass-panel p-3 cm-anim transition-transform hover:translate-y-[1px]">
      <div className="text-xs opacity-80 flex items-center gap-2">
        <span className="text-base leading-none">❗</span>
        <span>Alerts</span>
      </div>
      <div className="text-2xl font-semibold flex items-baseline gap-1 mt-1">
        <CountUp value={typeof overdue === 'number' ? overdue : 0} />
      </div>
      <div className="text-[11px] mt-1 opacity-80">
        {overdue > 50 ? 'Overdue tickets > 50 (Critical)' : 'Overdue tickets ≤ 50'}
      </div>
    </div>
  )
}

function CountUp({ value, duration = 600 }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    const to = value
    prev.current = to
    const start = performance.now()
    const step = (ts) => {
      const p = Math.min(1, (ts - start) / duration)
      const v = Math.round(from + (to - from) * p)
      setDisplay(v)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value, duration])
  return <span>{display}</span>
}

 
