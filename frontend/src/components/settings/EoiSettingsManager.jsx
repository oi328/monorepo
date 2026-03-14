import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Lightweight API helpers with localStorage fallback
const STORAGE_KEY = 'eoi.settings'

async function fetchEoiSettings() {
  try {
    const res = await fetch('/api/eoi/settings')
    if (res.ok) {
      const json = await res.json()
      return json || {}
    }
  } catch (e) {
    // ignore
  }
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (raw) return JSON.parse(raw)
  } catch {}
  return defaultSettings()
}

async function saveEoiSettings(payload) {
  try {
    const res = await fetch('/api/eoi/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) return true
  } catch (e) {
    // ignore
  }
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      return true
    }
  } catch {}
  return false
}

function defaultSettings() {
  return {
    general: {
      enabled: true,
      defaultStatus: 'Pending',
      autoConvertToLead: false,
      defaultBrokerId: '',
      linkToCil: true,
      linkToSales: true,
      workflow: [
        { key: 'Pending', color: '#94a3b8' },
        { key: 'Verified', color: '#22c55e' },
        { key: 'Converted', color: '#3b82f6' },
        { key: 'Closed', color: '#64748b' },
      ],
      defaultWorkflowStatus: 'Pending',
    },
    sources: [
      { id: 'website', name: 'Website', active: true, requiresCil: false, autoConvertToSales: false, notes: '' },
      { id: 'broker', name: 'Broker', active: true, requiresCil: true, autoConvertToSales: true, notes: 'Broker entries require CIL verification.' },
      { id: 'facebook_ads', name: 'Facebook Ads', active: true, requiresCil: false, autoConvertToSales: false, notes: '' },
      { id: 'manual', name: 'Manual Entry', active: true, requiresCil: false, autoConvertToSales: false, notes: '' },
    ],
    fields: [
      { key: 'name', label: 'Name', required: true, type: 'text', validation: 'min:2' },
      { key: 'phone', label: 'Phone', required: true, type: 'phone', validation: 'phone' },
      { key: 'email', label: 'Email', required: false, type: 'email', validation: 'email' },
      { key: 'budget', label: 'Budget', required: false, type: 'number', validation: 'min:0' },
      { key: 'propertyType', label: 'Property Type', required: false, type: 'select', validation: '', options: ['Apartment', 'Villa', 'Townhouse'] },
      { key: 'location', label: 'Location', required: false, type: 'text', validation: '' },
      { key: 'notes', label: 'Notes', required: false, type: 'textarea', validation: 'max:1000' },
    ],
    notifications: {
      recipients: ['Admin'],
      methods: { email: true, inApp: true, sms: false },
      messages: {
        newEoi: 'New EOI received for {{name}}',
        convertedLead: 'EOI converted to Lead: {{leadId}}',
        createdCil: 'CIL record created for broker {{brokerId}}',
        salesOpportunity: 'Sales Opportunity created: Stage {{stage}}',
      },
    },
    cilIntegration: {
      autoGenerateOnLead: true,
      verificationRequired: true,
      defaultStatus: 'Pending',
      mapping: { brokerId: 'eoi.broker', leadId: 'lead.id', customerInfo: 'eoi.customer_data' },
    },
    salesIntegration: {
      autoCreateOpportunity: true,
      defaultStage: 'New',
      defaultSalesRepId: '',
      valueMapping: 'eoi.budget',
      notesMapping: 'eoi.notes',
    },
  }
}

export default function EoiSettingsManager() {
  const { t, i18n } = useTranslation()
  const isRTL = useMemo(() => i18n.dir() === 'rtl', [i18n])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState(defaultSettings())
  const [activeTab, setActiveTab] = useState('general')
  const [brokers, setBrokers] = useState([{ id: 'b1', name: 'Broker A' }, { id: 'b2', name: 'Broker B' }])
  const [salesReps, setSalesReps] = useState([{ id: 's1', name: 'Sales Rep 1' }, { id: 's2', name: 'Sales Rep 2' }])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const fetched = await fetchEoiSettings()
      if (!mounted) return
      setSettings(prev => ({ ...prev, ...fetched }))
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  const tabs = [
    { key: 'general', label: t('General') },
    { key: 'sources', label: t('Sources') },
    { key: 'fields', label: t('Fields') },
    { key: 'notifications', label: t('Notifications') },
    { key: 'cil', label: t('CIL Integration') },
    { key: 'sales', label: t('Sales Integration') },
  ]

  const update = (path, value) => {
    setSettings(prev => {
      const next = { ...prev }
      const segs = path.split('.')
      let ref = next
      for (let i = 0; i < segs.length - 1; i++) {
        ref[segs[i]] = { ...ref[segs[i]] }
        ref = ref[segs[i]]
      }
      ref[segs[segs.length - 1]] = value
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const ok = await saveEoiSettings(settings)
    setSaving(false)
    if (ok) {
      // optionally show a toast
    }
  }

  const handleReset = async () => {
    const d = defaultSettings()
    setSettings(d)
    await saveEoiSettings(d)
  }

  const moveWorkflow = (index, dir) => {
    setSettings(prev => {
      const wf = [...prev.general.workflow]
      const newIndex = index + dir
      if (newIndex < 0 || newIndex >= wf.length) return prev
      const [item] = wf.splice(index, 1)
      wf.splice(newIndex, 0, item)
      return { ...prev, general: { ...prev.general, workflow: wf } }
    })
  }

  if (loading) {
    return (
      <div className="p-4"><div className="text-[var(--muted-text)]">{t('Loading')}...</div></div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`btn btn-outline btn-sm ${activeTab === tab.key ? 'bg-primary text-white' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >{tab.label}</button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'general' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Enable EOI System')}</label>
              <input type="checkbox" checked={settings.general.enabled} onChange={e => update('general.enabled', e.target.checked)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Default Status')}</label>
              <select className="input" value={settings.general.defaultStatus} onChange={e => update('general.defaultStatus', e.target.value)}>
                {['Pending','Approved','Rejected'].map(s => (<option key={s} value={s}>{t(s)}</option>))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Auto-convert EOI to Lead')}</label>
              <input type="checkbox" checked={settings.general.autoConvertToLead} onChange={e => update('general.autoConvertToLead', e.target.checked)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Default Assigned Broker')}</label>
              <select className="input" value={settings.general.defaultBrokerId} onChange={e => update('general.defaultBrokerId', e.target.value)}>
                <option value="">{t('None')}</option>
                {brokers.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Link EOI to CIL Module')}</label>
              <input type="checkbox" checked={settings.general.linkToCil} onChange={e => update('general.linkToCil', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Link EOI to Sales Module')}</label>
              <input type="checkbox" checked={settings.general.linkToSales} onChange={e => update('general.linkToSales', e.target.checked)} />
            </div>
          </div>

          {/* Workflow settings */}
          <div className="mt-2">
            <h3 className="text-base font-semibold mb-2">{t('Workflow Settings')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm text-[var(--muted-text)]">{t('Default Workflow Status')}</label>
                <select className="input" value={settings.general.defaultWorkflowStatus} onChange={e => update('general.defaultWorkflowStatus', e.target.value)}>
                  {settings.general.workflow.map(s => (<option key={s.key} value={s.key}>{t(s.key)}</option>))}
                </select>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {settings.general.workflow.map((s, idx) => (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="w-32">{t(s.key)}</span>
                  <input type="color" value={s.color} onChange={e => {
                    setSettings(prev => {
                      const wf = prev.general.workflow.map((x, i) => i===idx ? { ...x, color: e.target.value } : x)
                      return { ...prev, general: { ...prev.general, workflow: wf } }
                    })
                  }} />
                  <div className="ml-auto flex items-center gap-2">
                    <button className="btn btn-glass btn-xs" onClick={() => moveWorkflow(idx, -1)}>{isRTL ? '⬇️' : '⬆️'}</button>
                    <button className="btn btn-glass btn-xs" onClick={() => moveWorkflow(idx, +1)}>{isRTL ? '⬆️' : '⬇️'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'sources' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">{t('Source Name')}</th>
                  <th className="p-2">{t('Active')}</th>
                  <th className="p-2">{t('Requires CIL')}</th>
                  <th className="p-2">{t('Auto Convert to Sales')}</th>
                  <th className="p-2">{t('Notes')}</th>
                </tr>
              </thead>
              <tbody>
                {settings.sources.map((src, i) => (
                  <tr key={src.id} className="border-t">
                    <td className="p-2">{t(src.name)}</td>
                    <td className="p-2"><input type="checkbox" checked={src.active} onChange={e => setSettings(prev => {
                      const next = [...prev.sources]; next[i] = { ...src, active: e.target.checked }; return { ...prev, sources: next }
                    })} /></td>
                    <td className="p-2"><input type="checkbox" checked={src.requiresCil} onChange={e => setSettings(prev => {
                      const next = [...prev.sources]; next[i] = { ...src, requiresCil: e.target.checked }; return { ...prev, sources: next }
                    })} /></td>
                    <td className="p-2"><input type="checkbox" checked={src.autoConvertToSales} onChange={e => setSettings(prev => {
                      const next = [...prev.sources]; next[i] = { ...src, autoConvertToSales: e.target.checked }; return { ...prev, sources: next }
                    })} /></td>
                    <td className="p-2">
                      <input className="input" value={src.notes} onChange={e => setSettings(prev => {
                        const next = [...prev.sources]; next[i] = { ...src, notes: e.target.value }; return { ...prev, sources: next }
                      })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'fields' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-4">
          {settings.fields.map((f, i) => (
            <div key={f.key} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="flex flex-col">
                <label className="text-sm text-[var(--muted-text)]">{t('Field')}</label>
                <input className="input" value={f.label} onChange={e => setSettings(prev => {
                  const next = [...prev.fields]; next[i] = { ...f, label: e.target.value }; return { ...prev, fields: next }
                })} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-[var(--muted-text)]">{t('Required')}</label>
                <input type="checkbox" checked={f.required} onChange={e => setSettings(prev => {
                  const next = [...prev.fields]; next[i] = { ...f, required: e.target.checked }; return { ...prev, fields: next }
                })} />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-[var(--muted-text)]">{t('Input Type')}</label>
                <select className="input" value={f.type} onChange={e => setSettings(prev => {
                  const next = [...prev.fields]; next[i] = { ...f, type: e.target.value }; return { ...prev, fields: next }
                })}>
                  {['text','email','phone','number','select','textarea'].map(tp => (<option key={tp} value={tp}>{tp}</option>))}
                </select>
              </div>
              {f.type === 'select' ? (
                <div className="flex flex-col">
                  <label className="text-sm text-[var(--muted-text)]">{t('Options (comma separated)')}</label>
                  <input className="input" value={(f.options || []).join(', ')} onChange={e => setSettings(prev => {
                    const next = [...prev.fields]; next[i] = { ...f, options: e.target.value.split(',').map(x => x.trim()).filter(Boolean) }; return { ...prev, fields: next }
                  })} />
                </div>
              ) : (
                <div className="flex flex-col">
                  <label className="text-sm text-[var(--muted-text)]">{t('Validation Rule')}</label>
                  <input className="input" value={f.validation || ''} onChange={e => setSettings(prev => {
                    const next = [...prev.fields]; next[i] = { ...f, validation: e.target.value }; return { ...prev, fields: next }
                  })} />
                </div>
              )}
              <div className="flex justify-end">
                <button className="btn btn-danger btn-sm" onClick={() => setSettings(prev => ({ ...prev, fields: prev.fields.filter((x, idx) => idx !== i) }))}>{t('Delete')}</button>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button className="btn btn-secondary btn-sm" onClick={() => setSettings(prev => ({ ...prev, fields: [...prev.fields, { key: `field_${prev.fields.length+1}`, label: 'Custom Field', required: false, type: 'text', validation: '' }] }))}>{t('Add Field')}</button>
          </div>
        </section>
      )}

      {activeTab === 'notifications' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Recipients')}</label>
              <select multiple className="input" value={settings.notifications.recipients} onChange={e => {
                const opts = Array.from(e.target.selectedOptions).map(o => o.value)
                update('notifications.recipients', opts)
              }}>
                {['Admin','Broker','Sales Manager','All'].map(r => (<option key={r} value={r}>{t(r)}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm text-[var(--muted-text)]">{t('Methods')}</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={settings.notifications.methods.email} onChange={e => update('notifications.methods', { ...settings.notifications.methods, email: e.target.checked })} /> Email</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={settings.notifications.methods.inApp} onChange={e => update('notifications.methods', { ...settings.notifications.methods, inApp: e.target.checked })} /> In-App</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={settings.notifications.methods.sms} onChange={e => update('notifications.methods', { ...settings.notifications.methods, sms: e.target.checked })} /> SMS</label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Message: New EOI')}</label>
              <textarea className="input h-24" value={settings.notifications.messages.newEoi} onChange={e => update('notifications.messages', { ...settings.notifications.messages, newEoi: e.target.value })} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Message: Converted to Lead')}</label>
              <textarea className="input h-24" value={settings.notifications.messages.convertedLead} onChange={e => update('notifications.messages', { ...settings.notifications.messages, convertedLead: e.target.value })} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Message: Created CIL')}</label>
              <textarea className="input h-24" value={settings.notifications.messages.createdCil} onChange={e => update('notifications.messages', { ...settings.notifications.messages, createdCil: e.target.value })} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Message: Sales Opportunity Generated')}</label>
              <textarea className="input h-24" value={settings.notifications.messages.salesOpportunity} onChange={e => update('notifications.messages', { ...settings.notifications.messages, salesOpportunity: e.target.value })} />
            </div>
          </div>
        </section>
      )}

      {activeTab === 'cil' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Auto-generate CIL on Lead')}</label>
              <input type="checkbox" checked={settings.cilIntegration.autoGenerateOnLead} onChange={e => update('cilIntegration.autoGenerateOnLead', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('CIL Verification Required Before Sale')}</label>
              <input type="checkbox" checked={settings.cilIntegration.verificationRequired} onChange={e => update('cilIntegration.verificationRequired', e.target.checked)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Default CIL Status')}</label>
              <select className="input" value={settings.cilIntegration.defaultStatus} onChange={e => update('cilIntegration.defaultStatus', e.target.value)}>
                {['Pending','Verified'].map(s => (<option key={s} value={s}>{t(s)}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Mapping: Broker ID')}</label>
              <input className="input" value={settings.cilIntegration.mapping.brokerId} onChange={e => update('cilIntegration.mapping', { ...settings.cilIntegration.mapping, brokerId: e.target.value })} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Mapping: Lead ID')}</label>
              <input className="input" value={settings.cilIntegration.mapping.leadId} onChange={e => update('cilIntegration.mapping', { ...settings.cilIntegration.mapping, leadId: e.target.value })} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Mapping: Customer Info')}</label>
              <input className="input" value={settings.cilIntegration.mapping.customerInfo} onChange={e => update('cilIntegration.mapping', { ...settings.cilIntegration.mapping, customerInfo: e.target.value })} />
            </div>
          </div>
        </section>
      )}

      {activeTab === 'sales' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Auto-create Sales Opportunity')}</label>
              <input type="checkbox" checked={settings.salesIntegration.autoCreateOpportunity} onChange={e => update('salesIntegration.autoCreateOpportunity', e.target.checked)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Assign Default Sales Stage')}</label>
              <select className="input" value={settings.salesIntegration.defaultStage} onChange={e => update('salesIntegration.defaultStage', e.target.value)}>
                {['New','Negotiation','Closed Won','Closed Lost'].map(s => (<option key={s} value={s}>{t(s)}</option>))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Auto-assign Sales Rep')}</label>
              <select className="input" value={settings.salesIntegration.defaultSalesRepId} onChange={e => update('salesIntegration.defaultSalesRepId', e.target.value)}>
                <option value="">{t('None')}</option>
                {salesReps.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Link EOI Budget → Opportunity Value')}</label>
              <input className="input" value={settings.salesIntegration.valueMapping} onChange={e => update('salesIntegration.valueMapping', e.target.value)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Notes Mapping')}</label>
              <input className="input" value={settings.salesIntegration.notesMapping} onChange={e => update('salesIntegration.notesMapping', e.target.value)} />
            </div>
          </div>
        </section>
      )}

      {/* Sticky actions */}
      <div className="sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-t p-4 flex items-center justify-end gap-2 rounded-t-2xl">
        <button className="btn btn-glass" onClick={handleReset}>{t('Reset to Default')}</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? t('Saving...') : t('Save Changes')}</button>
      </div>
    </div>
  )
}