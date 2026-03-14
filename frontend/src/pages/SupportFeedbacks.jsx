import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../utils/api'

export default function SupportFeedbacks() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'

  const [surveys, setSurveys] = useState([])
  const [stats, setStats] = useState({ avgCSAT: 0, topAgents: [], bottomAgents: [], dissatisfiedCountThisMonth: 0, responseRatePercent: 0 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [agent, setAgent] = useState('All')
  const [minRating, setMinRating] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ ticketId: '', customerId: '', rating: 5, comment: '', channel: 'Email' })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [listRes, statsRes] = await Promise.all([
          api.get('/api/feedbacks/surveys'),
          api.get('/api/feedbacks/surveys/stats'),
        ])
        setSurveys(listRes.data?.data?.items || [])
        setStats(statsRes.data?.data || {})
      } catch (e) {
        console.warn('Failed to load surveys', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let arr = surveys.slice()
    if (q) arr = arr.filter(s => JSON.stringify(s).toLowerCase().includes(q.toLowerCase()))
    if (agent !== 'All') arr = arr.filter(s => String(s.agent || '') === String(agent))
    if (minRating) arr = arr.filter(s => Number(s.rating) >= Number(minRating))
    return arr
  }, [surveys, q, agent, minRating])

  const agents = useMemo(() => {
    const a = Array.from(new Set(surveys.map(s => s.agent || '—')))
    return ['All', ...a]
  }, [surveys])

  const submitSurvey = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const payload = { ...form, rating: Number(form.rating) }
      await api.post('/api/feedbacks/surveys', payload)
      setForm({ ticketId: '', customerId: '', rating: 5, comment: '', channel: 'Email' })
      const [listRes, statsRes] = await Promise.all([
        api.get('/api/feedbacks/surveys'),
        api.get('/api/feedbacks/surveys/stats'),
      ])
      setSurveys(listRes.data?.data?.items || [])
      setStats(statsRes.data?.data || {})
    } catch (e) {
      console.warn('Submit survey failed', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <section className="px-2 sm:px-4">
        <h1 className="text-xl font-bold mb-3">{t('Feedback & Surveys')}</h1>

        {/* Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="nova-card p-4">
            <div className="text-sm opacity-70">{t('Average CSAT')}</div>
            <div className="text-2xl font-semibold">{Number(stats.avgCSAT || 0).toFixed(2)}</div>
          </div>
          <div className="nova-card p-4">
            <div className="text-sm opacity-70">{t('Dissatisfied Customers (This Month)')}</div>
            <div className="text-2xl font-semibold">{stats.dissatisfiedCountThisMonth || 0}</div>
          </div>
          <div className="nova-card p-4">
            <div className="text-sm opacity-70">{t('Response Rate')}</div>
            <div className="text-2xl font-semibold">{(stats.responseRatePercent || 0)}%</div>
          </div>
          <div className="nova-card p-4">
            <div className="text-sm opacity-70">{t('Total Surveys')}</div>
            <div className="text-2xl font-semibold">{stats?.totals?.surveys || surveys.length}</div>
          </div>
        </div>

        {/* Top/Bottom agents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <div className="nova-card p-4">
            <h2 className="text-lg font-semibold mb-2">{t('Top 5 Agents')}</h2>
            <ul className="space-y-1 text-sm">
              {(stats.topAgents || []).map((a, idx) => (
                <li key={idx} className="flex justify-between"><span>{a.agent}</span><span className="font-medium">{a.avg?.toFixed(2)}</span></li>
              ))}
            </ul>
          </div>
          <div className="nova-card p-4">
            <h2 className="text-lg font-semibold mb-2">{t('Bottom 5 Agents')}</h2>
            <ul className="space-y-1 text-sm">
              {(stats.bottomAgents || []).map((a, idx) => (
                <li key={idx} className="flex justify-between"><span>{a.agent}</span><span className="font-medium">{a.avg?.toFixed(2)}</span></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Filters bar */}
        <div className="glass-neon nova-card p-3 mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              className="input-sm rounded-md px-3 py-2 border"
              placeholder={t('Search...')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--content-text)', borderColor: 'var(--panel-border)' }}
            />
            <select
              className="input-sm rounded-md px-3 py-2"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--content-text)', borderColor: 'var(--panel-border)' }}
            >
              {agents.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              className="input-sm rounded-md px-3 py-2"
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--content-text)', borderColor: 'var(--panel-border)' }}
            >
              {[1,2,3,4,5].map((n) => (<option key={n} value={n}>{t('Min Rating')} {n}</option>))}
            </select>
          </div>
        </div>

        {/* Submit survey (manual for demo) */}
        <div className="nova-card p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">{t('Submit Survey')}</h2>
          <form onSubmit={submitSurvey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <input className="input-sm rounded-md px-3 py-2 border" placeholder={t('Ticket ID')} value={form.ticketId} onChange={(e)=>setForm(f=>({...f,ticketId:e.target.value}))}
              style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--content-text)', borderColor: 'var(--panel-border)' }} />
            <input className="input-sm rounded-md px-3 py-2 border" placeholder={t('Customer ID')} value={form.customerId} onChange={(e)=>setForm(f=>({...f,customerId:e.target.value}))}
              style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--content-text)', borderColor: 'var(--panel-border)' }} />
            <select className="input-sm rounded-md px-3 py-2" value={form.rating} onChange={(e)=>setForm(f=>({...f,rating:Number(e.target.value)}))}
              style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--content-text)', borderColor: 'var(--panel-border)' }}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
            </select>
            <select className="input-sm rounded-md px-3 py-2" value={form.channel} onChange={(e)=>setForm(f=>({...f,channel:e.target.value}))}
              style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--content-text)', borderColor: 'var(--panel-border)' }}>
              {['Email','SMS','WhatsApp'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea className="input-sm rounded-md px-3 py-2 sm:col-span-2 lg:col-span-4" placeholder={t('Optional comment')} value={form.comment} onChange={(e)=>setForm(f=>({...f,comment:e.target.value}))}
              style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--content-text)', borderColor: 'var(--panel-border)' }} />
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button className="btn btn-primary" disabled={submitting}>{submitting ? t('Submitting...') : t('Submit')}</button>
            </div>
          </form>
          <p className="text-xs opacity-70 mt-2">{t('Note')}: {t('Negative ratings (≤2) auto-escalate with 24h SLA')}</p>
        </div>

        {/* Table */}
        <div className="nova-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="nova-table w-full">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">{t('Rating')}</th>
                  <th className="px-3 py-2 text-left">{t('Comment')}</th>
                  <th className="px-3 py-2 text-left">{t('Ticket ID')}</th>
                  <th className="px-3 py-2 text-left">{t('Customer ID')}</th>
                  <th className="px-3 py-2 text-left">{t('Agent')}</th>
                  <th className="px-3 py-2 text-left">{t('Submitted At')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-6" colSpan={6}>{t('Loading...')}</td></tr>
                ) : filtered.length ? (
                  filtered.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2">{s.rating} ⭐</td>
                      <td className="px-3 py-2">{s.comment || '—'}</td>
                      <td className="px-3 py-2">{s.ticketId}</td>
                      <td className="px-3 py-2">{s.customerId}</td>
                      <td className="px-3 py-2">{s.agent || '—'}</td>
                      <td className="px-3 py-2">{(s.submittedAt || '').replace('T',' ').slice(0,16)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td className="px-3 py-6" colSpan={6}>{t('No surveys found')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}
