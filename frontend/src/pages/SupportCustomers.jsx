import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../utils/api'

export default function SupportCustomers() {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState([])
  const [tickets, setTickets] = useState([])
  const [q, setQ] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [cRes, tRes] = await Promise.all([
        api.get('/api/customers', { params: { limit: 500 } }),
        api.get('/api/tickets', { params: { limit: 1000 } }),
      ])
      setCustomers(Array.isArray(cRes.data?.items) ? cRes.data.items : [])
      setTickets(Array.isArray(tRes.data?.items) ? tRes.data.items : [])
    } catch (e) {
      console.warn('customers_load_failed', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredCustomers = useMemo(() => {
    if (!q) return customers
    const qq = String(q).toLowerCase()
    return customers.filter((c) =>
      String(c.name || '').toLowerCase().includes(qq) ||
      String(c.phone || '').toLowerCase().includes(qq) ||
      String(c.email || '').toLowerCase().includes(qq) ||
      String(c.companyName || '').toLowerCase().includes(qq)
    )
  }, [customers, q])

  const rows = useMemo(() => {
    const byCustomer = new Map()
    tickets.forEach((t) => {
      const key = String(t.customerId || '')
      if (!key) return
      const arr = byCustomer.get(key) || []
      arr.push(t)
      byCustomer.set(key, arr)
    })
    return filteredCustomers.map((c) => {
      const list = byCustomer.get(String(c.id)) || []
      const last = list.length ? list[0] : null // tickets are typically sorted by createdAt desc
      return {
        id: c.id,
        name: c.name,
        company: c.type === 'Company' ? (c.companyName || '-') : '-',
        contactPhone: c.phone || '-',
        contactEmail: c.email || '-',
        products: Array.isArray(c.tags) ? c.tags : [],
        ticketsCount: list.length,
        lastTicket: last,
      }
    })
  }, [filteredCustomers, tickets])

  const Pill = ({ text }) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/10 dark:bg-gray-800/40 border border-white/10 mr-1 mb-1">{text}</span>
  )

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('Customers')}</h1>
        <div className="flex gap-2 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Search customers...')}
            className="px-3 py-2 rounded bg-white/5 border border-white/10 text-sm w-64"
          />
          <button onClick={loadData} className="px-3 py-2 rounded bg-white/10 text-sm">{t('Refresh')}</button>
        </div>
      </div>

      <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left opacity-70">
              <th className="py-2">{t('Customer ID')}</th>
              <th className="py-2">{t('Name')}</th>
              <th className="py-2">{t('Company')}</th>
              <th className="py-2">{t('Contact Info')}</th>
              <th className="py-2">{t('Active Contracts / Products Owned')}</th>
              <th className="py-2">{t('Previous Tickets History')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              [...Array(6)].map((_, i) => (
                <tr key={`s-${i}`} className="border-t border-white/10">
                  <td className="py-3"><div className="skeleton-line h-4 w-24" /></td>
                  <td className="py-3"><div className="skeleton-line h-4 w-32" /></td>
                  <td className="py-3"><div className="skeleton-line h-4 w-28" /></td>
                  <td className="py-3"><div className="skeleton-line h-4 w-48" /></td>
                  <td className="py-3"><div className="skeleton-block h-6 w-64" /></td>
                  <td className="py-3"><div className="skeleton-line h-4 w-40" /></td>
                </tr>
              ))
            )}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="py-2">{String(r.id).slice(0, 12)}</td>
                <td className="py-2">{r.name}</td>
                <td className="py-2">{r.company || '-'}</td>
                <td className="py-2">
                  <div className="opacity-80">{t('Phone')}: {r.contactPhone || '-'}</div>
                  <div className="opacity-80">{t('Email')}: {r.contactEmail || '-'}</div>
                </td>
                <td className="py-2">
                  {Array.isArray(r.products) && r.products.length ? (
                    <div className="flex flex-wrap">
                      {r.products.map((p, idx) => <Pill key={idx} text={p} />)}
                    </div>
                  ) : (
                    <span className="opacity-60">-</span>
                  )}
                </td>
                <td className="py-2">
                  <div className="opacity-90">{t('Total')}: {r.ticketsCount}</div>
                  {r.lastTicket ? (
                    <div className="opacity-70">
                      {t('Last')}: {r.lastTicket.status} • {r.lastTicket.subject}
                    </div>
                  ) : (
                    <div className="opacity-70">{t('No previous tickets')}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <div className="mt-3 text-sm opacity-70">{t('No customers found')}</div>
        )}
      </div>
    </>
  )
}
