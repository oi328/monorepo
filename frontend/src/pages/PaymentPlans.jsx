import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import { useStages } from '@hooks/useStages'

const LS_KEY = 'paymentPlans.templates'

function safeParse(json) {
  try { return JSON.parse(json) } catch { return null }
}

function loadTemplates() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEY) : null
    const parsed = raw ? safeParse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function persistTemplates(tpls) {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(LS_KEY, JSON.stringify(tpls)) } catch (err) { void err }
}

function defaultTemplate() {
  return {
    id: `tpl-${Date.now()}`,
    name: 'New Payment Plan',
    allowedStages: ['deal'],
    installments: [
      { label: 'Down Payment', percentage: 20, dueAfterDays: 0 },
      { label: 'Installment 1', percentage: 40, dueAfterDays: 30 },
      { label: 'Installment 2', percentage: 40, dueAfterDays: 60 },
    ],
    usedCount: 0,
  }
}

async function fetchTemplatesAPI() {
  try {
    const r = await fetch('/api/payment-plans/templates')
    if (!r.ok) throw new Error('network')
    const j = await r.json()
    const items = Array.isArray(j.items) ? j.items : []
    return items
  } catch {
    return loadTemplates()
  }
}

async function saveTemplateAPI(payload) {
  try {
    const r = await fetch('/api/payment-plans/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!r.ok) throw new Error('network')
    const j = await r.json()
    return j.item
  } catch {
    const list = loadTemplates()
    const item = { ...payload, id: payload.id || `tpl-${Date.now()}` }
    const next = [...list, item]
    persistTemplates(next)
    return item
  }
}

async function updateTemplateAPI(id, patch) {
  try {
    const r = await fetch(`/api/payment-plans/templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    if (!r.ok) throw new Error('network')
    const j = await r.json()
    return j.item
  } catch {
    const list = loadTemplates()
    const next = list.map(t => t.id === id ? { ...t, ...patch } : t)
    persistTemplates(next)
    return next.find(t => t.id === id)
  }
}

async function deleteTemplateAPI(id) {
  try {
    const r = await fetch(`/api/payment-plans/templates/${id}`, { method: 'DELETE' })
    if (!r.ok) throw new Error('network')
    const j = await r.json()
    return j.item
  } catch {
    const list = loadTemplates()
    const next = list.filter(t => t.id !== id)
    persistTemplates(next)
    return true
  }
}

async function generateScheduleAPI({ templateId, amount, startDate }) {
  try {
    const r = await fetch('/api/payment-plans/generate-schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId, amount, startDate }) })
    if (!r.ok) throw new Error('network')
    const j = await r.json()
    return Array.isArray(j.items) ? j.items : []
  } catch {
    const tpls = loadTemplates()
    const tp = tpls.find(x => x.id === templateId)
    if (!tp) return []
    const amt = Number(amount || 0)
    const start = new Date(startDate || Date.now())
    return tp.installments.map(inst => {
      const due = new Date(start.getTime() + (inst.dueAfterDays || 0) * 24 * 60 * 60 * 1000)
      return {
        label: inst.label,
        percentage: inst.percentage,
        amount: Math.round((amt * inst.percentage) / 100 * 100) / 100,
        dueDate: due.toISOString().slice(0, 10),
        status: 'Pending'
      }
    })
  }
}

export default function PaymentPlans() {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const { stages } = useStages()
  const isRTL = String(i18n.language || '').startsWith('ar')
  const isDark = theme === 'dark'

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState('')
  const [preview, setPreview] = useState([])
  const [previewParams, setPreviewParams] = useState({ amount: 100000, startDate: new Date().toISOString().slice(0,10), templateId: '' })

  const stageOptions = useMemo(() => {
    const arr = Array.isArray(stages) ? stages : []
    const useArabic = String(i18n.language || '').startsWith('ar')
    return arr.map(s => {
      if (typeof s === 'string') return { key: s, label: s }
      const key = s.name || s.key || s
      const label = useArabic ? (s.nameAr || s.name || s.key || '') : (s.name || s.nameAr || s.key || '')
      return { key, label }
    })
  }, [stages, i18n.language])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const items = await fetchTemplatesAPI()
      if (!mounted) return
      const list = Array.isArray(items) && items.length ? items : loadTemplates()
      let seeded = []
      if (!list.length) {
        seeded = [defaultTemplate()]
        persistTemplates(seeded)
        setTemplates(seeded)
      } else {
        setTemplates(list)
      }
      setLoading(false)
      const firstId = list[0]?.id || seeded[0]?.id || ''
      setPreviewParams(p => ({ ...p, templateId: firstId }))
    })()
    return () => { mounted = false }
  }, [])

  const totalPct = (tpl) => (Array.isArray(tpl.installments) ? tpl.installments.reduce((acc, i) => acc + Number(i.percentage || 0), 0) : 0)

  const addTemplate = async () => {
    const tpl = defaultTemplate()
    const saved = await saveTemplateAPI(tpl)
    setTemplates(prev => [saved, ...prev])
    setEditingId(saved.id)
  }

  const removeTemplate = async (id) => {
    const current = templates.find(t => t.id === id)
    if (current?.usedCount > 0) return
    await deleteTemplateAPI(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    if (editingId === id) setEditingId('')
  }

  const updateTemplate = async (id, patch) => {
    const next = await updateTemplateAPI(id, patch)
    setTemplates(prev => prev.map(t => t.id === id ? next : t))
  }

  const addInstallment = async (id) => {
    const tpl = templates.find(t => t.id === id)
    const nextInst = [...(tpl?.installments || []), { label: t('Installment'), percentage: 0, dueAfterDays: 30 }]
    await updateTemplate(id, { installments: nextInst })
  }

  const onGeneratePreview = async () => {
    const items = await generateScheduleAPI(previewParams)
    setPreview(items)
  }

  if (loading) return (<div className="p-4 text-[var(--muted-text)]">{t('Loading')}...</div>)

  return (
    <div className={`px-2 py-4 md:px-6 md:py-6 min-h-screen ${isDark ? 'text-white' : 'text-gray-900'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="p-4 flex justify-between items-center gap-4">
        <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>{t('Payment Plans')}</h1>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={addTemplate}>{t('Add Payment Plan')}</button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 space-y-4">
        <div className="space-y-4">
          {templates.map(tp => (
            <div key={tp.id} className="border rounded p-3 space-y-3">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-4">
                  <label className="text-xs opacity-70">{t('Template Name')}</label>
                  <input className="input w-full" value={tp.name} onChange={e => updateTemplate(tp.id, { name: e.target.value })} />
                  <div className="mt-1 text-xs opacity-70">{t('Total')} %: {totalPct(tp)}</div>
                  {totalPct(tp) !== 100 && (
                    <div className="text-xs text-red-600 mt-1">{t('Total must equal 100%')}</div>
                  )}
                </div>
                <div className="col-span-12 md:col-span-4">
                  <label className="text-xs opacity-70">{t('Allowed Stages')}</label>
                  <select multiple className="input w-full h-[120px]" value={tp.allowedStages} onChange={e => {
                    const opts = Array.from(e.target.selectedOptions).map(o => o.value)
                    updateTemplate(tp.id, { allowedStages: opts })
                  }}>
                    {stageOptions.map(opt => (<option key={opt.key} value={opt.key}>{opt.label || opt.key}</option>))}
                  </select>
                  <div className="text-xs opacity-70">{t('Use in contract stages only')}</div>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <label className="text-xs opacity-70">{t('Actions')}</label>
                  <div className="flex flex-col gap-2 mt-1">
                    <button className="btn btn-glass text-xs px-2 py-1 h-7 min-h-[28px]" onClick={() => setEditingId(editingId === tp.id ? '' : tp.id)}>{editingId === tp.id ? t('Close') : t('Edit')}</button>
                    <button className="btn btn-danger text-xs px-2 py-1 h-7 min-h-[28px]" disabled={tp.usedCount > 0} onClick={() => removeTemplate(tp.id)}>{t('Delete')}</button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-70">{t('Installments')}</label>
                {Array.from({ length: Math.ceil(((tp.installments||[]).length) / 3) }).map((_, rowIdx) => {
                  const idx1 = rowIdx * 3
                  const idx2 = idx1 + 1
                  const idx3 = idx1 + 2
                  const inst1 = (tp.installments||[])[idx1]
                  const inst2 = (tp.installments||[])[idx2]
                  const inst3 = (tp.installments||[])[idx3]
                  return (
                    <div key={`${tp.id}-row-${rowIdx}`} className="grid grid-cols-12 gap-2">
                      {inst1 && (
                        <div className="col-span-12 md:col-span-4">
                          <div className="border rounded-md p-2 space-y-2">
                            <div>
                              <label className="text-xs opacity-70">{t('Installment')}</label>
                              <input className="input w-full" value={inst1.label} onChange={e => {
                                const next = [...tp.installments]
                                next[idx1] = { ...inst1, label: e.target.value }
                                updateTemplate(tp.id, { installments: next })
                              }} />
                            </div>
                            <div className="grid grid-cols-12 gap-2">
                              <div className="col-span-12 md:col-span-6">
                                <label className="text-xs opacity-70">{t('Percentage')}</label>
                                <input type="number" min={0} max={100} className="input w-full" value={inst1.percentage} onChange={e => {
                                  const next = [...tp.installments]
                                  next[idx1] = { ...inst1, percentage: Number(e.target.value || 0) }
                                  updateTemplate(tp.id, { installments: next })
                                }} />
                              </div>
                              <div className="col-span-12 md:col-span-6">
                                <label className="text-xs opacity-70">{t('Due After (days)')}</label>
                                <input type="number" min={0} className="input w-full" value={inst1.dueAfterDays} onChange={e => {
                                  const next = [...tp.installments]
                                  next[idx1] = { ...inst1, dueAfterDays: Number(e.target.value || 0) }
                                  updateTemplate(tp.id, { installments: next })
                                }} />
                              </div>
                            </div>
                            <div className="flex items-center justify-end">
                              <button className="btn btn-outline btn-sm" onClick={() => {
                                const next = tp.installments.filter((_, i) => i !== idx1)
                                updateTemplate(tp.id, { installments: next })
                              }}>{t('Delete')}</button>
                            </div>
                          </div>
                        </div>
                      )}
                      {inst2 && (
                        <div className="col-span-12 md:col-span-4">
                          <div className="border rounded-md p-2 space-y-2">
                            <div>
                              <label className="text-xs opacity-70">{t('Installment')}</label>
                              <input className="input w-full" value={inst2.label} onChange={e => {
                                const next = [...tp.installments]
                                next[idx2] = { ...inst2, label: e.target.value }
                                updateTemplate(tp.id, { installments: next })
                              }} />
                            </div>
                            <div className="grid grid-cols-12 gap-2">
                              <div className="col-span-12 md:col-span-6">
                                <label className="text-xs opacity-70">{t('Percentage')}</label>
                                <input type="number" min={0} max={100} className="input w-full" value={inst2.percentage} onChange={e => {
                                  const next = [...tp.installments]
                                  next[idx2] = { ...inst2, percentage: Number(e.target.value || 0) }
                                  updateTemplate(tp.id, { installments: next })
                                }} />
                              </div>
                              <div className="col-span-12 md:col-span-6">
                                <label className="text-xs opacity-70">{t('Due After (days)')}</label>
                                <input type="number" min={0} className="input w-full" value={inst2.dueAfterDays} onChange={e => {
                                  const next = [...tp.installments]
                                  next[idx2] = { ...inst2, dueAfterDays: Number(e.target.value || 0) }
                                  updateTemplate(tp.id, { installments: next })
                                }} />
                              </div>
                            </div>
                            <div className="flex items-center justify-end">
                              <button className="btn btn-outline btn-sm" onClick={() => {
                                const next = tp.installments.filter((_, i) => i !== idx2)
                                updateTemplate(tp.id, { installments: next })
                              }}>{t('Delete')}</button>
                            </div>
                          </div>
                        </div>
                      )}
                      {inst3 && (
                        <div className="col-span-12 md:col-span-4">
                          <div className="border rounded-md p-2 space-y-2">
                            <div>
                              <label className="text-xs opacity-70">{t('Installment')}</label>
                              <input className="input w-full" value={inst3.label} onChange={e => {
                                const next = [...tp.installments]
                                next[idx3] = { ...inst3, label: e.target.value }
                                updateTemplate(tp.id, { installments: next })
                              }} />
                            </div>
                            <div className="grid grid-cols-12 gap-2">
                              <div className="col-span-12 md:col-span-6">
                                <label className="text-xs opacity-70">{t('Percentage')}</label>
                                <input type="number" min={0} max={100} className="input w-full" value={inst3.percentage} onChange={e => {
                                  const next = [...tp.installments]
                                  next[idx3] = { ...inst3, percentage: Number(e.target.value || 0) }
                                  updateTemplate(tp.id, { installments: next })
                                }} />
                              </div>
                              <div className="col-span-12 md:col-span-6">
                                <label className="text-xs opacity-70">{t('Due After (days)')}</label>
                                <input type="number" min={0} className="input w-full" value={inst3.dueAfterDays} onChange={e => {
                                  const next = [...tp.installments]
                                  next[idx3] = { ...inst3, dueAfterDays: Number(e.target.value || 0) }
                                  updateTemplate(tp.id, { installments: next })
                                }} />
                              </div>
                            </div>
                            <div className="flex items-center justify-end">
                              <button className="btn btn-outline btn-sm" onClick={() => {
                                const next = tp.installments.filter((_, i) => i !== idx3)
                                updateTemplate(tp.id, { installments: next })
                              }}>{t('Delete')}</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="flex items-center justify-end">
                  <button className="btn btn-secondary btn-sm" onClick={() => addInstallment(tp.id)}>{t('Add Installment')}</button>
                </div>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="p-2 text-[var(--muted-text)]">{t('No data')}</div>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="font-semibold">{t('Schedule Preview')}</div>
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-12 md:col-span-4">
            <label className="text-xs opacity-70">{t('Template')}</label>
            <select className="input w-full" value={previewParams.templateId} onChange={e => setPreviewParams(p => ({ ...p, templateId: e.target.value }))}>
              {templates.map(tp => (<option key={tp.id} value={tp.id}>{tp.name}</option>))}
            </select>
          </div>
          <div className="col-span-6 md:col-span-4">
            <label className="text-xs opacity-70">{t('Contract Amount')}</label>
            <input type="number" min={0} className="input w-full" value={previewParams.amount} onChange={e => setPreviewParams(p => ({ ...p, amount: Number(e.target.value || 0) }))} />
          </div>
          <div className="col-span-6 md:col-span-4">
            <label className="text-xs opacity-70">{t('Start Date')}</label>
            <input type="date" className="input w-full" value={previewParams.startDate} onChange={e => setPreviewParams(p => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div className="col-span-12 flex items-center justify-end">
            <button className="btn btn-primary" onClick={onGeneratePreview}>{t('Generate')}</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded">
            <thead className={isDark ? 'bg-[#0b2b4f]' : 'bg-gray-100'}>
              <tr className="text-left">
                <th className="p-2">{t('Installment')}</th>
                <th className="p-2">{t('Percentage')}</th>
                <th className="p-2">{t('Amount')}</th>
                <th className="p-2">{t('Due Date')}</th>
                <th className="p-2">{t('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row, idx) => (
                <tr key={`prev-${idx}`} className="border-t">
                  <td className="p-2">{row.label}</td>
                  <td className="p-2">{row.percentage}%</td>
                  <td className="p-2">{row.amount}</td>
                  <td className="p-2">{row.dueDate}</td>
                  <td className="p-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${row.status === 'Paid' ? 'bg-green-100 text-green-700' : row.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{t(row.status)}</span>
                  </td>
                </tr>
              ))}
              {preview.length === 0 && (
                <tr><td className="p-2 text-[var(--muted-text)]" colSpan={5}>{t('No data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
