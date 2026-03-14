import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { logExportEvent } from '../utils/api'
import { useLocation, useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'
import SearchableSelect from '../components/SearchableSelect'
import Layout from '../components/Layout'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

const fmtEGP = (n) => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n)

const TargetBadge = ({ pct }) => {
  const color = pct >= 90 ? 'text-emerald-700 bg-emerald-100 ring-emerald-200'
    : pct >= 60 ? 'text-amber-700 bg-amber-100 ring-amber-200'
    : 'text-rose-700 bg-rose-100 ring-rose-200'
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${color}`}>{pct}%</span>
}

const ProgressBar = ({ value, max = 100 }) => {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const barColor = value >= 90 ? 'bg-emerald-600' : value >= 60 ? 'bg-amber-600' : 'bg-rose-600'
  return (
    <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-gray-800">
      <div className={`h-2.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

const TeamPerformanceReport = () => {
  const { t } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  const location = useLocation()
  const navigate = useNavigate()

  // Filters state
  const [selectedManager, setSelectedManager] = useState('All')
  const [selectedTeam, setSelectedTeam] = useState('All')
  const [dateMode, setDateMode] = useState('month') // day | week | month | range
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [query, setQuery] = useState('')

  // Demo managers and teams
  const managers = ['All', 'Ahmed Ali', 'Sara Hassan']
  const teams = ['All', 'Sales', 'Operations']

  // Demo dataset: employees with activity across dates
  const [rows] = useState(() => {
    const today = new Date()
    const mk = (name, manager, team, calls, actions, delayed, lead, qualified, proposal, closed, revenue, targetPct, dayOffset) => ({
      name, manager, team, calls, actions, delayed,
      stages: { lead, qualified, proposal, closed },
      revenue, targetPct,
      date: new Date(today.getTime() - dayOffset * 24 * 60 * 60 * 1000),
    })
    return [
      mk('Ahmed Ali', 'Ahmed Ali', 'Sales', 45, 30, 3, 10, 12, 0, 8, 82000, 82, 2),
      mk('Sara Hassan', 'Sara Hassan', 'Sales', 58, 40, 1, 14, 18, 0, 8, 105000, 105, 1),
      mk('Omar Tarek', 'Ahmed Ali', 'Operations', 32, 20, 2, 8, 7, 0, 5, 65000, 65, 6),
      mk('Lina Ops', 'Sara Hassan', 'Operations', 50, 35, 4, 15, 12, 3, 5, 73000, 88, 10),
      mk('Maram Admin', 'Ahmed Ali', 'Sales', 62, 43, 2, 20, 15, 5, 3, 98000, 91, 15),
    ]
  })

  // Derived filtering
  const inDateRange = (d) => {
    if (dateMode === 'day' && selectedDate) {
      const sel = new Date(selectedDate)
      return d.toDateString() === sel.toDateString()
    }
    if (dateMode === 'week' && selectedDate) {
      const sel = new Date(selectedDate)
      const start = new Date(sel)
      start.setDate(sel.getDate() - sel.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return d >= start && d <= end
    }
    if (dateMode === 'month' && selectedDate) {
      const sel = new Date(selectedDate)
      return d.getFullYear() === sel.getFullYear() && d.getMonth() === sel.getMonth()
    }
    if (dateMode === 'range' && startDate && endDate) {
      const s = new Date(startDate)
      const e = new Date(endDate)
      return d >= s && d <= e
    }
    return true
  }

  const filtered = useMemo(() => {
    return rows.filter(r =>
      (selectedManager === 'All' || r.manager === selectedManager) &&
      (selectedTeam === 'All' || r.team === selectedTeam) &&
      inDateRange(r.date) &&
      (!query || r.name.toLowerCase().includes(query.toLowerCase()))
    )
  }, [rows, selectedManager, selectedTeam, dateMode, selectedDate, startDate, endDate, query])

  // Initialize filters from URL params (e.g., /reports/team?team=Sales&manager=All)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '')
      const teamParam = params.get('team')
      const managerParam = params.get('manager')
      if (teamParam) setSelectedTeam(teamParam)
      if (managerParam) setSelectedManager(managerParam)
    } catch (e) {}
     
  }, [location.search])

  // KPIs
  const kpis = useMemo(() => {
    const totalCalls = filtered.reduce((sum, r) => sum + r.calls, 0)
    const totalActions = filtered.reduce((sum, r) => sum + r.actions, 0)
    const totalRevenue = filtered.reduce((sum, r) => sum + r.revenue, 0)
    const avgTarget = filtered.length ? Math.round(filtered.reduce((sum, r) => sum + r.targetPct, 0) / filtered.length) : 0
    const top = filtered.slice().sort((a, b) => b.targetPct - a.targetPct)[0] || null
    return { totalCalls, totalActions, totalRevenue, avgTarget, top }
  }, [filtered])

  // Charts
  const callsActionsData = useMemo(() => {
    const labels = filtered.map(r => r.name)
    return {
      labels,
      datasets: [
        { label: isRTL ? 'المكالمات' : 'Calls', data: filtered.map(r => r.calls), backgroundColor: '#4f46e5' },
        { label: isRTL ? 'الإجراءات' : 'Actions', data: filtered.map(r => r.actions), backgroundColor: '#10b981' },
      ],
    }
  }, [filtered, isRTL])

  const actionsStageDistribution = useMemo(() => {
    const totalLead = filtered.reduce((s, r) => s + (r.stages.lead || 0), 0)
    const totalQualified = filtered.reduce((s, r) => s + (r.stages.qualified || 0), 0)
    const totalProposal = filtered.reduce((s, r) => s + (r.stages.proposal || 0), 0)
    const totalClosed = filtered.reduce((s, r) => s + (r.stages.closed || 0), 0)
    return {
      labels: [isRTL ? 'عميل' : 'Lead', isRTL ? 'مؤهل' : 'Qualified', isRTL ? 'مقترح' : 'Proposal', isRTL ? 'مغلق' : 'Closed'],
      datasets: [{ data: [totalLead, totalQualified, totalProposal, totalClosed], backgroundColor: ['#60a5fa', '#f59e0b', '#a78bfa', '#10b981'] }],
    }
  }, [filtered, isRTL])

  const performanceTrend = useMemo(() => {
    const byDay = new Map()
    filtered.forEach(r => {
      const key = new Date(r.date.getFullYear(), r.date.getMonth(), r.date.getDate()).toLocaleDateString()
      byDay.set(key, (byDay.get(key) || 0) + r.targetPct)
    })
    const labels = Array.from(byDay.keys()).sort((a, b) => new Date(a) - new Date(b))
    const data = labels.map(l => Math.round((byDay.get(l) || 0) / filtered.length))
    return { labels, data }
  }, [filtered])

  // Helpers (Moved outside)


  // Export handlers
  const exportExcel = () => {
    const rowsX = filtered.map(r => ({
      'Employee Name': r.name,
      'Manager': r.manager,
      'Team': r.team,
      'Calls': r.calls,
      'Actions': r.actions,
      'Delayed': r.delayed,
      'Lead': r.stages.lead,
      'Qualified': r.stages.qualified,
      'Proposal': r.stages.proposal,
      'Closed': r.stages.closed,
      'Revenue': r.revenue,
      'Target %': r.targetPct,
      'Date': r.date.toLocaleDateString(),
    }))
    const ws = XLSX.utils.json_to_sheet(rowsX)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Team Performance')
    const fileName = 'team_performance_report.xlsx'
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Team Performance Report',
      fileName,
      format: 'xlsx',
    })
  }

  const exportPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4')
    doc.setFontSize(14)
    doc.text(isRTL ? 'تقرير أداء الفريق' : 'Team Performance Report', 40, 40)
    const head = [[
      isRTL ? 'الموظف' : 'Employee', isRTL ? 'المدير' : 'Manager', isRTL ? 'الفريق' : 'Team',
      isRTL ? 'مكالمات' : 'Calls', isRTL ? 'إجراءات' : 'Actions', isRTL ? 'متأخرة' : 'Delayed',
      isRTL ? 'عميل' : 'Lead', isRTL ? 'مؤهل' : 'Qualified', isRTL ? 'مقترح' : 'Proposal', isRTL ? 'مغلق' : 'Closed',
      isRTL ? 'الإيراد' : 'Revenue', isRTL ? 'الهدف ٪' : 'Target %', isRTL ? 'التاريخ' : 'Date',
    ]]
    const body = filtered.map(r => [
      r.name, r.manager, r.team, r.calls, r.actions, r.delayed,
      r.stages.lead, r.stages.qualified, r.stages.proposal, r.stages.closed,
      fmtEGP(r.revenue), `${r.targetPct}%`, r.date.toLocaleDateString(),
    ])
    doc.autoTable({ head, body, startY: 60 })
    doc.save('team_performance_report.pdf')
    logExportEvent({
      module: 'Team Performance Report',
      fileName: 'team_performance_report.pdf',
      format: 'pdf',
    })
  }

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <BackButton to="/reports" />

        {/* Header + Actions */}
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{isRTL ? 'لوحة أداء الفريق' : 'Team Performance Report'}</h1>
            <div className="flex items-center gap-2">
              <button className="btn btn-glass" onClick={exportPDF}>{isRTL ? 'تنزيل PDF' : 'Download PDF'}</button>
              <button className="btn btn-glass" onClick={exportExcel}>{isRTL ? 'تنزيل Excel' : 'Download Excel'}</button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="label">{isRTL ? 'المدير' : 'Manager'}</label>
              <SearchableSelect value={selectedManager} onChange={(v)=>setSelectedManager(v)}>
                {managers.map(m => <option key={m} value={m}>{m}</option>)}
              </SearchableSelect>
            </div>
            <div>
              <label className="label">{isRTL ? 'الفريق / القسم' : 'Team / Department'}</label>
              <SearchableSelect value={selectedTeam} onChange={(v)=>setSelectedTeam(v)}>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </SearchableSelect>
            </div>
            <div>
              <label className="label">{isRTL ? 'بحث' : 'Search'}</label>
              <input className="input w-full" placeholder={isRTL ? 'اسم الموظف' : 'Employee name'} value={query} onChange={(e)=>setQuery(e.target.value)} />
            </div>
            <div>
              <label className="label">{isRTL ? 'الوضع الزمني' : 'Period Mode'}</label>
              <SearchableSelect value={dateMode} onChange={(v)=>{ setDateMode(v); setSelectedDate(''); setStartDate(''); setEndDate('') }}>
                <option value="day">{isRTL ? 'يوم' : 'Day'}</option>
                <option value="week">{isRTL ? 'أسبوع' : 'Week'}</option>
                <option value="month">{isRTL ? 'شهر' : 'Month'}</option>
                <option value="range">{isRTL ? 'مدى مخصص' : 'Custom Range'}</option>
              </SearchableSelect>
            </div>
            {dateMode !== 'range' && (
              <div>
                <label className="label">{isRTL ? 'التاريخ' : 'Date'}</label>
                <input type="date" className="input w-full" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} />
              </div>
            )}
            {dateMode === 'range' && (
              <>
                <div>
                  <label className="label">{isRTL ? 'من' : 'Start'}</label>
                  <input type="date" className="input w-full" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">{isRTL ? 'إلى' : 'End'}</label>
                  <input type="date" className="input w-full" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Spacer under filters */}
        <div className="h-4" aria-hidden="true" />

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="glass-panel rounded-xl p-4">
            <div className="text-sm text-gray-500">{isRTL ? 'إجمالي المكالمات' : 'Total Calls'}</div>
            <div className="text-2xl font-semibold">{kpis.totalCalls}</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="text-sm text-gray-500">{isRTL ? 'إجمالي الإجراءات' : 'Total Actions Completed'}</div>
            <div className="text-2xl font-semibold">{kpis.totalActions}</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="text-sm text-gray-500">{isRTL ? 'إجمالي الإيرادات' : 'Total Revenue Achieved'}</div>
            <div className="text-2xl font-semibold text-indigo-600">{fmtEGP(kpis.totalRevenue)}</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="text-sm text-gray-500">{isRTL ? 'متوسط تحقيق الهدف ٪' : 'Avg Target Achievement %'}</div>
            <div className="text-2xl font-semibold"><TargetBadge pct={kpis.avgTarget} /></div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="text-sm text-gray-500">{isRTL ? 'أفضل أداء' : 'Top Performer of the Period'}</div>
            <div className="text-base font-semibold">{kpis.top ? kpis.top.name : (isRTL ? 'لا يوجد' : 'N/A')}</div>
          </div>
        </div>

        {/* Spacer under cards */}
        <div className="h-4" aria-hidden="true" />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="glass-panel rounded-xl p-4">
            <div className="font-semibold mb-2">{isRTL ? 'المكالمات والإجراءات لكل موظف' : 'Calls & Actions per Employee'}</div>
            <Bar data={callsActionsData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="font-semibold mb-2">{isRTL ? 'توزيع الإجراءات حسب المرحلة' : 'Actions Distribution by Stage'}</div>
            <Doughnut data={actionsStageDistribution} options={{ responsive: true }} />
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="font-semibold mb-2">{isRTL ? 'اتجاه الأداء عبر الزمن' : 'Team Performance Trend Over Time'}</div>
            <Line data={{ labels: performanceTrend.labels, datasets: [{ label: isRTL ? 'الهدف ٪' : 'Target %', data: performanceTrend.data, borderColor: '#4f46e5', backgroundColor: '#4f46e5' }] }} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>
        </div>

        {/* Spacer above table */}
        <div className="h-4" aria-hidden="true" />

        {/* Table / Cards */}
        <div className="glass-panel rounded-xl p-0 overflow-hidden">
          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-4 bg-gray-50/50 dark:bg-gray-800/20">
            {filtered.map((r, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.team} · {r.manager}</div>
                  </div>
                  <TargetBadge pct={r.targetPct} />
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-gray-100 dark:border-gray-700">
                  <div>
                    <div className="text-xs text-gray-500">{isRTL ? 'المكالمات' : 'Calls'}</div>
                    <div className="font-medium">{r.calls}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{isRTL ? 'الإجراءات' : 'Actions'}</div>
                    <div className="font-medium">{r.actions}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{isRTL ? 'متأخرة' : 'Delayed'}</div>
                    <div className="font-medium text-rose-600">{r.delayed}</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                     <span className="text-gray-500">{isRTL ? 'الإيراد' : 'Revenue'}</span>
                     <span className="font-medium">{fmtEGP(r.revenue)}</span>
                  </div>
                  <ProgressBar value={r.targetPct} />
                </div>

                <div className="pt-2">
                   <div className="text-xs text-gray-500 mb-2">{isRTL ? 'حسب المرحلة' : 'Actions by Stage'}</div>
                   <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-200 text-xs">{isRTL ? 'عميل' : 'Lead'}: {r.stages.lead}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-xs">{isRTL ? 'مؤهل' : 'Qualified'}: {r.stages.qualified}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-50 text-violet-700 ring-1 ring-violet-200 text-xs">{isRTL ? 'مقترح' : 'Proposal'}: {r.stages.proposal}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-xs">{isRTL ? 'مغلق' : 'Closed'}: {r.stages.closed}</span>
                   </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
               <div className="text-center text-gray-500 py-8">{isRTL ? 'لا توجد نتائج' : 'No results'}</div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="nova-table nova-table--glass w-full">
            <thead className="nova-thead bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="nova-th">{isRTL ? 'الموظف' : 'Employee Name'}</th>
                <th className="nova-th">{isRTL ? 'المكالمات' : 'Calls'}</th>
                <th className="nova-th">{isRTL ? 'الإجراءات' : 'Actions'}</th>
                <th className="nova-th">{isRTL ? 'متأخرة' : 'Delayed'}</th>
                <th className="nova-th">{isRTL ? 'حسب المرحلة' : 'Actions by Stage'}</th>
                <th className="nova-th">{isRTL ? 'الإيراد' : 'Revenue'}</th>
                <th className="nova-th">{isRTL ? 'تحقيق الهدف ٪' : 'Target %'}</th>
              </tr>
            </thead>
            <tbody className="nova-tbody">
              {filtered.map((r, idx) => (
                <tr key={idx} className="nova-tr">
                  <td className="nova-td text-sm">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.team} · {r.manager}</div>
                  </td>
                  <td className="nova-td text-sm">{r.calls}</td>
                  <td className="nova-td text-sm">{r.actions}</td>
                  <td className="nova-td text-sm">{r.delayed}</td>
                  <td className="nova-td text-xs">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-200">{isRTL ? 'عميل' : 'Lead'}: {r.stages.lead}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200">{isRTL ? 'مؤهل' : 'Qualified'}: {r.stages.qualified}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-50 text-violet-700 ring-1 ring-violet-200">{isRTL ? 'مقترح' : 'Proposal'}: {r.stages.proposal}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">{isRTL ? 'مغلق' : 'Closed'}: {r.stages.closed}</span>
                    </div>
                  </td>
                  <td className="nova-td text-sm">{fmtEGP(r.revenue)}
                    <div className="mt-1"><ProgressBar value={r.targetPct} /></div>
                  </td>
                  <td className="nova-td"><TargetBadge pct={r.targetPct} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="nova-td text-center text-sm text-gray-500" colSpan={7}>{isRTL ? 'لا توجد نتائج' : 'No results'}</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Spacer under table */}
        <div className="h-4" aria-hidden="true" />
      </div>
    </Layout>
  )
}

export default TeamPerformanceReport
