import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../utils/api'
import { PieChart } from '../shared/components/PieChart'
import { useAppState } from '../shared/context/AppStateProvider'

export default function SupportReports() {
  const { t } = useTranslation()
  const { user } = useAppState()

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const supportModulePerms = Array.isArray(modulePermissions.Support) ? modulePermissions.Support : []

  const effectiveSupportPerms = supportModulePerms.length ? supportModulePerms : (() => {
    const role = user?.role || ''
    if (role === 'Sales Admin') return ['showModule']
    if (role === 'Operation Manager') return ['showModule', 'addTickets', 'sla', 'reports']
    if (role === 'Branch Manager') return ['showModule']
    if (role === 'Director') return ['showModule']
    if (role === 'Support Manager') return ['showModule', 'addTickets', 'sla', 'reports', 'exportReports', 'deleteTickets']
    if (role === 'Support Team Leader') return ['showModule', 'addTickets', 'sla', 'reports']
    if (role === 'Support Agent') return ['showModule', 'addTickets']
    return []
  })()

  const roleLower = String(user?.role || '').toLowerCase()
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'

  const canViewSupportReports =
    effectiveSupportPerms.includes('reports') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  const canExportSupportReports =
    effectiveSupportPerms.includes('exportReports') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  if (!canViewSupportReports) {
    return (
      <div className="p-6 text-center text-sm text-red-500">
        {t('You do not have permission to view support reports.')}
      </div>
    )
  }

  const typeOptions = ['Complaint', 'Inquiry', 'Request']
  const priorityOptions = ['Low', 'Medium', 'High', 'Urgent']
  const channelOptions = ['Email', 'Phone', 'WhatsApp', 'Customer Portal', 'Social Media']

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [priority, setPriority] = useState('')
  const [channel, setChannel] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadTickets = async () => {
    try {
      setLoading(true)
      const r = await api.get('/api/tickets', { params: { limit: 2000 } })
      setTickets(Array.isArray(r.data?.items) ? r.data.items : [])
    } catch (e) {
      console.warn('reports_tickets_load_failed', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTickets() }, [])

  const filtered = useMemo(() => {
    let items = [...tickets]
    const q = query.trim().toLowerCase()
    if (q) items = items.filter((x) => JSON.stringify(x).toLowerCase().includes(q))
    if (type) items = items.filter((x) => String(x.type) === String(type))
    if (priority) items = items.filter((x) => String(x.priority) === String(priority))
    if (channel) items = items.filter((x) => String(x.channel) === String(channel))
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(dateTo) : null
    if (from) items = items.filter((x) => new Date(x.createdAt) >= from)
    if (to) items = items.filter((x) => new Date(x.createdAt) <= to)
    return items
  }, [tickets, query, type, priority, channel, dateFrom, dateTo])

  // Average Resolution Time (hours) for closed tickets
  const closed = useMemo(() => filtered.filter((x) => String(x.status) === 'Closed'), [filtered])
  const avgResolutionHours = useMemo(() => {
    const durations = closed
      .map((x) => {
        const start = new Date(x.createdAt).getTime()
        const end = x.updatedAt ? new Date(x.updatedAt).getTime() : start
        const diffH = Math.max(0, (end - start) / (1000 * 60 * 60))
        return diffH
      })
      .filter((h) => Number.isFinite(h))
    if (!durations.length) return 0
    return Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
  }, [closed])

  const sameDayCount = useMemo(() => {
    return closed.filter((x) => {
      const s = new Date(x.createdAt)
      const e = x.updatedAt ? new Date(x.updatedAt) : s
      return s.toDateString() === e.toDateString()
    }).length
  }, [closed])

  const afterSlaCount = useMemo(() => {
    return closed.filter((x) => {
      if (!x.slaDeadline) return false
      const e = x.updatedAt ? new Date(x.updatedAt) : new Date(x.createdAt)
      return e > new Date(x.slaDeadline)
    }).length
  }, [closed])

  // Tickets by Channel / Priority
  const byChannel = useMemo(() => {
    const map = new Map()
    filtered.forEach((x) => map.set(x.channel, (map.get(x.channel) || 0) + 1))
    return channelOptions.map((c) => ({ label: t(c), value: map.get(c) || 0 }))
  }, [filtered])

  const byPriority = useMemo(() => {
    const map = new Map()
    filtered.forEach((x) => map.set(x.priority, (map.get(x.priority) || 0) + 1))
    return priorityOptions.map((p) => ({ label: t(p), value: map.get(p) || 0 }))
  }, [filtered])

  // Trend line (tickets per day)
  const trendSeries = useMemo(() => {
    const map = new Map()
    filtered.forEach((x) => {
      const k = new Date(x.createdAt).toISOString().slice(0, 10)
      map.set(k, (map.get(k) || 0) + 1)
    })
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    return entries.map((e) => e[1]).slice(-14)
  }, [filtered])

  const TinyTrend = ({ series = [] }) => {
    const w = 160, h = 40
    const max = Math.max(1, ...series)
    const step = series.length > 1 ? (w - 4) / (series.length - 1) : w - 4
    const pts = series.map((v, i) => {
      const x = 2 + i * step
      const y = h - 2 - (v / max) * (h - 4)
      return `${x},${y}`
    }).join(' ')
    const up = series.length > 1 && series[series.length - 1] >= series[0]
    const stroke = up ? '#10b981' : '#ef4444'
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline fill="none" stroke={stroke} strokeWidth="2" points={pts} />
      </svg>
    )
  }

  // Colors for charts
  const colors = {
    emerald: '#10b981', yellow: '#f59e0b', blue: '#3b82f6', red: '#ef4444', gray: '#64748b', teal: '#2dd4bf'
  }

  const channelSegments = [
    { label: t('Email'), value: byChannel[0]?.value || 0, color: colors.teal },
    { label: t('Phone'), value: byChannel[1]?.value || 0, color: colors.blue },
    { label: t('WhatsApp'), value: byChannel[2]?.value || 0, color: colors.emerald },
    { label: t('Customer Portal'), value: byChannel[3]?.value || 0, color: colors.yellow },
    { label: t('Social Media'), value: byChannel[4]?.value || 0, color: colors.gray },
  ]

  const prioritySegments = [
    { label: t('Low'), value: byPriority[0]?.value || 0, color: colors.gray },
    { label: t('Medium'), value: byPriority[1]?.value || 0, color: colors.blue },
    { label: t('High'), value: byPriority[2]?.value || 0, color: colors.yellow },
    { label: t('Urgent'), value: byPriority[3]?.value || 0, color: colors.red },
  ]

  // CSAT (optional: if tickets include csatRating 1–5)
  const csatRatings = useMemo(() => filtered.map(x => x.csatRating).filter((n) => typeof n === 'number'), [filtered])
  const avgCsat = useMemo(() => csatRatings.length ? Math.round((csatRatings.reduce((a,b)=>a+b,0) / csatRatings.length) * 10) / 10 : 0, [csatRatings])
  const csatDist = useMemo(() => {
    const map = new Map()
    csatRatings.forEach((n) => map.set(n, (map.get(n) || 0) + 1))
    return [1,2,3,4,5].map((n) => ({ label: String(n), value: map.get(n) || 0 }))
  }, [csatRatings])

  // Agent performance
  const agentPerf = useMemo(() => {
    const map = new Map()
    filtered.forEach((x) => {
      const key = x.assignedAgent || 'Unassigned'
      const arr = map.get(key) || []
      arr.push(x)
      map.set(key, arr)
    })
    const rows = Array.from(map.entries()).map(([agent, list]) => {
      const closedList = list.filter((x) => String(x.status) === 'Closed')
      const avgHours = closedList.length ? Math.round((closedList.reduce((sum, x) => {
        const s = new Date(x.createdAt).getTime()
        const e = x.updatedAt ? new Date(x.updatedAt).getTime() : s
        return sum + Math.max(0, (e - s) / (1000 * 60 * 60))
      }, 0) / closedList.length) * 10) / 10 : 0
      const slaOk = closedList.filter((x) => x.slaDeadline && new Date(x.updatedAt || x.createdAt) <= new Date(x.slaDeadline)).length
      const slaRate = closedList.length ? Math.round((slaOk / closedList.length) * 100) : 0
      const escalations = list.filter((x) => String(x.status) === 'Escalated').length
      const ratingAvg = list.map(x=>x.csatRating).filter(n=>typeof n==='number').reduce((a,b)=>a+b,0)
      const ratingCount = list.map(x=>x.csatRating).filter(n=>typeof n==='number').length
      const csatAvg = ratingCount ? Math.round((ratingAvg / ratingCount) * 10) / 10 : 0
      return { agent, tickets: list.length, closed: closedList.length, avgHours, slaRate, escalations, csatAvg }
    })
    rows.sort((a,b)=> b.tickets - a.tickets)
    return rows
  }, [filtered])

  const ExportCSV = ({ rows, fileName }) => {
    if (!canExportSupportReports || !rows || !rows.length) return null
    const onExport = () => {
      const headers = Object.keys(rows[0] || {})
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileName || 'export.csv'; a.click(); URL.revokeObjectURL(url)
    }
    return <button className="btn btn-outline btn-xs" onClick={onExport}>{t('Export CSV')}</button>
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{t('Support Reports & Analytics')}</h1>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={t('Search...')} className="px-3 py-1 rounded bg-white/5 border border-white/10 text-sm" />
        <SearchableSelect value={type} onChange={(v)=>setType(v)} className="px-3 py-1 text-sm">
          <option value="">{t('Type')}</option>
          {typeOptions.map(x => <option key={x} value={x}>{t(x)}</option>)}
        </SearchableSelect>
        <SearchableSelect value={priority} onChange={(v)=>setPriority(v)} className="px-3 py-1 text-sm">
          <option value="">{t('Priority')}</option>
          {priorityOptions.map(x => <option key={x} value={x}>{t(x)}</option>)}
        </SearchableSelect>
        <SearchableSelect value={channel} onChange={(v)=>setChannel(v)} className="px-3 py-1 text-sm">
          <option value="">{t('Channel')}</option>
          {channelOptions.map(x => <option key={x} value={x}>{t(x)}</option>)}
        </SearchableSelect>
        <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="px-3 py-1 rounded bg-white/5 border border-white/10 text-sm" />
        <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="px-3 py-1 rounded bg-white/5 border border-white/10 text-sm" />
        <button onClick={loadTickets} className="px-3 py-1 rounded bg-white/10 text-sm">{t('Refresh')}</button>
      </div>

      {/* Average Resolution Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">{t('Average Resolution Time')}</h2>
            <ExportCSV rows={[{ avgResolutionHours }]} fileName="avg-resolution.csv" />
          </div>
          <div className="text-3xl font-bold">{avgResolutionHours} <span className="text-sm opacity-70">{t('hours')}</span></div>
          <div className="text-sm opacity-80 mt-2">{t('Same day')}: {sameDayCount} • {t('After SLA')}: {afterSlaCount}</div>
          <div className="mt-3"><TinyTrend series={trendSeries} /></div>
        </div>

        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <h2 className="text-lg font-semibold mb-2">{t('Tickets by Channel')}</h2>
          <div className="h-40"><PieChart segments={channelSegments} centerLabel={t('Channels')} centerValue={byChannel.reduce((s,c)=>s+c.value,0)} animateCenterCountUp centerValueDuration={800} /></div>
        </div>

        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <h2 className="text-lg font-semibold mb-2">{t('Tickets by Priority')}</h2>
          <div className="h-40"><PieChart segments={prioritySegments} centerLabel={t('Priority')} centerValue={byPriority.reduce((s,c)=>s+c.value,0)} animateCenterCountUp centerValueDuration={800} /></div>
        </div>
      </div>

      {/* CSAT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">{t('Customer Satisfaction (CSAT)')}</h2>
            {csatRatings.length > 0 && <ExportCSV rows={csatDist} fileName="csat.csv" />}
          </div>
          {csatRatings.length > 0 ? (
            <>
              <div className="text-3xl font-bold">{avgCsat} <span className="text-sm opacity-70">/ 5</span></div>
              <div className="mt-3"><PieChart segments={csatDist.map(d=>({ label: d.label, value: d.value, color: colors.teal }))} centerLabel={t('Ratings')} centerValue={csatRatings.length} animateCenterCountUp /></div>
            </>
          ) : (
            <div className="text-sm opacity-70">{t('No CSAT data available')}</div>
          )}
        </div>

        {/* Agent Performance */}
        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">{t('Agent Performance')}</h2>
            {agentPerf.length > 0 && <ExportCSV rows={agentPerf} fileName="agents.csv" />}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left opacity-70">
                <th className="py-1">{t('Agent')}</th>
                <th className="py-1">{t('Tickets')}</th>
                <th className="py-1">{t('Closed')}</th>
                <th className="py-1">{t('Avg Hours')}</th>
                <th className="py-1">{t('SLA %')}</th>
                <th className="py-1">{t('Escalations')}</th>
                <th className="py-1">{t('CSAT')}</th>
              </tr>
            </thead>
            <tbody>
              {agentPerf.map((r) => (
                <tr key={r.agent} className="border-t border-white/10">
                  <td className="py-1">{r.agent}</td>
                  <td className="py-1">{r.tickets}</td>
                  <td className="py-1">{r.closed}</td>
                  <td className="py-1">{r.avgHours}</td>
                  <td className="py-1">{r.slaRate}%</td>
                  <td className="py-1">{r.escalations}</td>
                  <td className="py-1">{r.csatAvg ? `${r.csatAvg}/5` : '-'}</td>
                </tr>
              ))}
              {!agentPerf.length && (
                <tr><td colSpan={7} className="py-2 text-sm opacity-70">{t('No agent data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {loading && <div className="mt-2 text-sm opacity-70">{t('Loading...')}</div>}
    </>
  )
}

