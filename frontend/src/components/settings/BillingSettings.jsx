import { useMemo, useState } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

const statusTone = (s) => {
  switch (s) {
    case 'Active': return 'bg-green-100 text-green-700 border-green-200'
    case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'Expired': return 'bg-gray-200 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

const Badge = ({ status }) => (
  <span className={`px-2 py-1 text-xs rounded-full border ${statusTone(status)}`}>{status}</span>
)

const BillingSettings = () => {
  const [subscriptions, setSubscriptions] = useState([
    { id: 'SUB-001', customer: 'Acme Corp', plan: 'Pro', start: '2025-01-01', end: '2026-01-01', status: 'Active' },
    { id: 'SUB-002', customer: 'Globex LLC', plan: 'Basic', start: '2025-06-01', end: '2025-12-01', status: 'Pending' },
    { id: 'SUB-003', customer: 'Soylent Inc', plan: 'Enterprise', start: '2024-01-01', end: '2025-01-01', status: 'Expired' },
    { id: 'SUB-004', customer: 'Umbrella Co', plan: 'Pro', start: '2025-02-15', end: '2026-02-15', status: 'Cancelled' },
  ])

  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const [billingInfo, setBillingInfo] = useState({
    address: 'Building 12, Business Park, Cairo',
    method: 'Credit Card',
    taxId: 'EG-123456789',
    cardLast4: '4242',
  })

  const [invoices, setInvoices] = useState([
    { id: 'INV-1001', amount: 49, currency: 'USD', date: '2025-10-01', status: 'Paid' },
    { id: 'INV-1002', amount: 49, currency: 'USD', date: '2025-11-01', status: 'Paid' },
    { id: 'INV-1003', amount: 49, currency: 'USD', date: '2025-12-01', status: 'Unpaid' },
    { id: 'INV-1004', amount: 49, currency: 'USD', date: '2026-01-01', status: 'Overdue' },
  ])

  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('All')
  const [invoiceDateFilter, setInvoiceDateFilter] = useState('')

  const [showEdit, setShowEdit] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [editRecord, setEditRecord] = useState(null)

  const filteredSubs = useMemo(() => {
    return subscriptions.filter(s =>
      (planFilter === 'All' || s.plan === planFilter) &&
      (statusFilter === 'All' || s.status === statusFilter) &&
      (!search || s.customer.toLowerCase().includes(search.toLowerCase()))
    )
  }, [subscriptions, planFilter, statusFilter, search])

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv =>
      (invoiceStatusFilter === 'All' || inv.status === invoiceStatusFilter) &&
      (!invoiceDateFilter || inv.date.startsWith(invoiceDateFilter))
    )
  }, [invoices, invoiceStatusFilter, invoiceDateFilter])

  const totals = useMemo(() => {
    const totalRevenue = invoices.filter(i=>i.status==='Paid').reduce((sum, i)=>sum+i.amount,0)
    const active = subscriptions.filter(s=>s.status==='Active').length
    const expired = subscriptions.filter(s=>s.status==='Expired').length
    return { totalRevenue, active, expired }
  }, [invoices, subscriptions])

  // Pricing map for simple MRR/ARPU calculations
  const PLAN_PRICE = { Basic: 19, Pro: 49, Enterprise: 99 }

  // Analytics controls
  const [analyticsMonths, setAnalyticsMonths] = useState(6)
  const [includeUnpaid, setIncludeUnpaid] = useState(false)
  const [chartType, setChartType] = useState('line') // 'line' | 'bar'

  // Derived KPIs
  const analyticsKpis = useMemo(() => {
    const activeSubs = subscriptions.filter(s=>s.status==='Active')
    const mrr = activeSubs.reduce((sum, s)=> sum + (PLAN_PRICE[s.plan] || 0), 0)
    const arpu = activeSubs.length ? Math.round((mrr / activeSubs.length) * 100) / 100 : 0
    const cancelled = subscriptions.filter(s=>s.status==='Cancelled').length
    const churnRate = (activeSubs.length + cancelled) ? Math.round((cancelled / (activeSubs.length + cancelled)) * 1000) / 10 : 0
    const overdueInvoices = invoices.filter(i=>i.status==='Overdue').length
    return { mrr, arpu, churnRate, overdueInvoices }
  }, [subscriptions, invoices])

  // Build monthly revenue series for the selected period (Paid vs Unpaid)
  const monthlySeries = useMemo(() => {
    const end = new Date()
    const start = new Date(end)
    start.setMonth(end.getMonth() - (analyticsMonths - 1))

    const key = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = (d) => d.toLocaleString(undefined, { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2)

    // initialize buckets
    const bucketsPaid = {}
    const bucketsUnpaid = {}
    const labels = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const k = key(cursor)
      bucketsPaid[k] = 0
      bucketsUnpaid[k] = 0
      labels.push(label(cursor))
      cursor.setMonth(cursor.getMonth()+1)
    }

    // aggregate invoices
    invoices.forEach(inv => {
      const d = new Date(inv.date)
      if (d >= start && d <= end) {
        const k = key(d)
        if (inv.status === 'Paid' && bucketsPaid[k] !== undefined) bucketsPaid[k] += inv.amount
        if (inv.status === 'Unpaid' && bucketsUnpaid[k] !== undefined) bucketsUnpaid[k] += inv.amount
      }
    })

    const paidValues = Object.keys(bucketsPaid).map(k => bucketsPaid[k])
    const unpaidValues = Object.keys(bucketsUnpaid).map(k => bucketsUnpaid[k])
    const total = paidValues.reduce((s,v)=>s+v,0)
    const last = paidValues[paidValues.length-1] || 0
    const prev = paidValues[paidValues.length-2] || 0
    const mom = prev ? Math.round(((last - prev) / prev) * 1000) / 10 : 0
    return { labels, paidValues, unpaidValues, total, last, mom }
  }, [invoices, analyticsMonths, includeUnpaid])

  const onEdit = (s) => { setEditRecord(s); setShowEdit(true) }
  const onCancel = (s) => { setEditRecord(s); setShowCancel(true) }

  const saveEdit = (updated) => {
    setSubscriptions(prev => prev.map(s => s.id === updated.id ? updated : s))
    setShowEdit(false)
  }
  const confirmCancel = () => {
    if (!editRecord) return
    setSubscriptions(prev => prev.map(s => s.id === editRecord.id ? { ...s, status: 'Cancelled' } : s))
    setShowCancel(false)
  }

  const generateInvoice = () => {
    const newId = `INV-${String(1000 + invoices.length + 1)}`
    setInvoices(prev => [{ id: newId, amount: 49, currency: 'USD', date: new Date().toISOString().slice(0,10), status: 'Unpaid' }, ...prev])
  }

  const updatePaymentInfo = () => {
    alert('Payment info updated')
  }

  return (
    <div className="space-y-0">
      {/* A) Active Subscriptions Table */}
      <div className="glass-panel rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Active Subscriptions</h3>
          <div className="flex items-center gap-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by customer" className="input-soft w-[180px]" />
            <select value={planFilter} onChange={e=>setPlanFilter(e.target.value)} className="input-soft">
              {['All','Basic','Pro','Enterprise'].map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="input-soft">
              {['All','Active','Pending','Expired','Cancelled'].map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: '0 12px' }}>
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.map(s => (
                <tr key={s.id} className="rounded-lg bg-white/40 dark:bg-gray-800/40">
                  <td className="px-4 py-3">{s.customer}</td>
                  <td className="px-4 py-3">{s.plan}</td>
                  <td className="px-4 py-3">{s.start}</td>
                  <td className="px-4 py-3">{s.end}</td>
                  <td className="px-4 py-3"><Badge status={s.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 rounded-lg bg-white/60 dark:bg-gray-800/60 border hover:bg-white" onClick={()=>onEdit(s)} title="Edit">✏️ Edit</button>
                      <button className="px-3 py-1 rounded-lg bg-white/60 dark:bg-gray-800/60 border hover:bg-white" onClick={()=>onCancel(s)} title="Cancel">🗑️ Cancel</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Spacer between sections */}
      <div className="h-6" aria-hidden="true"></div>

      {/* B) Billing Information */}
      <div className="glass-panel rounded-2xl p-4 md:p-6">
        <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-[var(--muted-text)]">Customer Billing Address</label>
            <textarea value={billingInfo.address} onChange={e=>setBillingInfo({ ...billingInfo, address: e.target.value })} className="input-soft w-full h-[90px]" />
          </div>
          <div>
            <label className="text-xs text-[var(--muted-text)]">Payment Method</label>
            <select value={billingInfo.method} onChange={e=>setBillingInfo({ ...billingInfo, method: e.target.value })} className="input-soft w-full">
              {['Credit Card','PayPal'].map(m=> <option key={m} value={m}>{m}</option>)}
            </select>
            {billingInfo.method==='Credit Card' && (
              <div className="mt-2 text-sm text-[var(--muted-text)]">Card ending in {billingInfo.cardLast4}</div>
            )}
          </div>
          <div>
            <label className="text-xs text-[var(--muted-text)]">Tax Info</label>
            <input value={billingInfo.taxId} onChange={e=>setBillingInfo({ ...billingInfo, taxId: e.target.value })} className="input-soft w-full" />
          </div>
        </div>
        <div className="mt-4">
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700" onClick={updatePaymentInfo}>Update Payment Info</button>
        </div>
      </div>
      {/* Spacer between sections */}
      <div className="h-6" aria-hidden="true"></div>

      {/* C) Invoices & Payments */}
      <div className="glass-panel rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Invoices & Payments</h3>
          <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white shadow hover:bg-indigo-700" onClick={generateInvoice}>Generate New Invoice</button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <select value={invoiceStatusFilter} onChange={e=>setInvoiceStatusFilter(e.target.value)} className="input-soft">
            {['All','Paid','Unpaid','Overdue'].map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="month" value={invoiceDateFilter} onChange={e=>setInvoiceDateFilter(e.target.value)} className="input-soft" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: '0 12px' }}>
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => (
                <tr key={inv.id} className="rounded-lg bg-white/40 dark:bg-gray-800/40">
                  <td className="px-4 py-3">{inv.id}</td>
                  <td className="px-4 py-3">{inv.date}</td>
                  <td className="px-4 py-3">{inv.amount} {inv.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full border ${inv.status==='Paid'?'bg-green-100 text-green-700 border-green-200':inv.status==='Unpaid'?'bg-amber-100 text-amber-700 border-amber-200':'bg-red-100 text-red-700 border-red-200'}`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-3 py-1 rounded-lg bg-white/60 dark:bg-gray-800/60 border hover:bg-white" title="Download">⬇️ Download PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spacer between sections */}
      <div className="h-6" aria-hidden="true"></div>

      {/* D) Plans & Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: 'Basic', price: '$19/mo', duration: 'Monthly', features: ['Up to 3 users','Email support','Basic reports'] },
          { name: 'Pro', price: '$49/mo', duration: 'Monthly', features: ['Up to 10 users','Priority support','Advanced analytics'] },
          { name: 'Enterprise', price: 'Custom', duration: 'Annual', features: ['Unlimited users','Dedicated manager','Custom integrations'] },
        ].map((p,i) => (
          <div key={i} className="glass-panel rounded-2xl p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold">{p.name}</h4>
              <span>⭐</span>
            </div>
            <div className="text-2xl font-bold mb-1">{p.price}</div>
            <div className="text-sm text-[var(--muted-text)] mb-3">{p.duration}</div>
            <ul className="text-sm space-y-1 mb-4">
              {p.features.map((f, idx) => <li key={idx}>• {f}</li>)}
            </ul>
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700">Upgrade Plan</button>
          </div>
        ))}
      </div>

      {/* Spacer between sections */}
      <div className="h-6" aria-hidden="true"></div>

      {/* Reports & Analytics */}
      <div className="glass-panel rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Reports & Analytics</h3>
          <div className="flex items-center gap-3">
            <select className="input-soft" value={analyticsMonths} onChange={e=>setAnalyticsMonths(Number(e.target.value))}>
              {[6,12,24].map(m=> <option key={m} value={m}>Last {m} months</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeUnpaid} onChange={e=>setIncludeUnpaid(e.target.checked)} />
              Include Unpaid
            </label>
            <div className="rounded-lg border bg-white/60 dark:bg-gray-800/60 overflow-hidden">
              <button aria-pressed={chartType==='line'} className={`px-3 py-1 text-sm border-r border-gray-300 dark:border-gray-700 ${chartType==='line'?'bg-blue-600 text-white':'text-[var(--text-muted)]'}`} onClick={()=>setChartType('line')}>Line</button>
              <button aria-pressed={chartType==='bar'} className={`px-3 py-1 text-sm ${chartType==='bar'?'bg-blue-600 text-white':'text-[var(--text-muted)]'}`} onClick={()=>setChartType('bar')}>Bar</button>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="rounded-xl border bg-white/60 dark:bg-gray-800/60 p-4">
            <div className="text-sm text-[var(--muted-text)]">Total Revenue (Paid)</div>
            <div className="text-2xl font-bold">${totals.totalRevenue}</div>
          </div>
          <div className="rounded-xl border bg-white/60 dark:bg-gray-800/60 p-4">
            <div className="text-sm text-[var(--muted-text)]">MRR (Active)</div>
            <div className="text-2xl font-bold">${analyticsKpis.mrr}</div>
          </div>
          <div className="rounded-xl border bg-white/60 dark:bg-gray-800/60 p-4">
            <div className="text-sm text-[var(--muted-text)]">ARPU</div>
            <div className="text-2xl font-bold">${analyticsKpis.arpu}</div>
          </div>
          <div className="rounded-xl border bg-white/60 dark:bg-gray-800/60 p-4">
            <div className="text-sm text-[var(--muted-text)]">Churn Rate</div>
            <div className="text-2xl font-bold">{analyticsKpis.churnRate}%</div>
          </div>
        </div>

        {/* Trend chart */}
        {chartType === 'line' ? (
          <div className="h-64 w-full">
            <Line
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: includeUnpaid }, tooltip: { mode: 'index', intersect: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 12 } } },
                  y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#94a3b8', font: { size: 12 } } }
                }
              }}
              data={{
                labels: monthlySeries.labels,
                datasets: [
                  {
                    label: 'Paid',
                    data: monthlySeries.paidValues,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59,130,246,0.25)',
                    tension: 0.3,
                    pointRadius: 2,
                    fill: true,
                  },
                  ...(includeUnpaid ? [{
                    label: 'Unpaid',
                    data: monthlySeries.unpaidValues,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245,158,11,0.25)',
                    tension: 0.3,
                    pointRadius: 2,
                    fill: true,
                  }] : [])
                ]
              }}
            />
          </div>
        ) : (
          <div className="h-64 w-full">
            <Bar
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: includeUnpaid }, tooltip: { mode: 'index', intersect: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 12 } } },
                  y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#94a3b8', font: { size: 12 } } }
                }
              }}
              data={{
                labels: monthlySeries.labels,
                datasets: [
                  {
                    label: 'Paid',
                    data: monthlySeries.paidValues,
                    backgroundColor: 'rgba(59,130,246,0.6)',
                    borderRadius: 8,
                  },
                  ...(includeUnpaid ? [{
                    label: 'Unpaid',
                    data: monthlySeries.unpaidValues,
                    backgroundColor: 'rgba(245,158,11,0.6)',
                    borderRadius: 8,
                  }] : [])
                ]
              }}
            />
          </div>
        )}

        {/* Bottom summary */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border bg-white/60 dark:bg-gray-800/60 p-3">Period Total: <span className="font-semibold">${monthlySeries.total}</span></div>
          <div className="rounded-xl border bg-white/60 dark:bg-gray-800/60 p-3">Last Month: <span className="font-semibold">${monthlySeries.last}</span></div>
          <div className="rounded-xl border bg-white/60 dark:bg-gray-800/60 p-3">MoM Change: <span className={`font-semibold ${monthlySeries.mom>=0?'text-green-500':'text-red-500'}`}>{monthlySeries.mom}%</span></div>
        </div>
      </div>

      {/* Modals */}
      {showEdit && editRecord && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowEdit(false)} />
          <div className="relative z-[1001] w-[92vw] max-w-[520px]">
            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <h4 className="text-lg font-semibold">Edit Subscription</h4>
              <input className="input-soft w-full" value={editRecord.customer} onChange={e=>setEditRecord({ ...editRecord, customer: e.target.value })} />
              <select className="input-soft w-full" value={editRecord.plan} onChange={e=>setEditRecord({ ...editRecord, plan: e.target.value })}>
                {['Basic','Pro','Enterprise'].map(p=> <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-2 rounded-lg border bg-white/60 dark:bg-gray-800/60" onClick={()=>setShowEdit(false)}>Cancel</button>
                <button className="px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={()=>saveEdit(editRecord)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancel && editRecord && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowCancel(false)} />
          <div className="relative z-[1001] w-[92vw] max-w-[520px]">
            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <h4 className="text-lg font-semibold">Confirm Cancellation</h4>
              <p className="text-sm text-[var(--muted-text)]">Cancel subscription for {editRecord.customer}? This action can be reverted by re-activating later.</p>
              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-2 rounded-lg border bg-white/60 dark:bg-gray-800/60" onClick={()=>setShowCancel(false)}>Close</button>
                <button className="px-3 py-2 rounded-lg bg-red-600 text-white" onClick={confirmCancel}>Confirm Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BillingSettings