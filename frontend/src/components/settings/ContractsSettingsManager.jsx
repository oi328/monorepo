import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'contracts.settings'

function defaultSettings() {
  return {
    general: {
      enabled: true,
      defaultStatus: 'Draft',
      defaultTemplateId: '',
      defaultAssigneeId: '',
      expiryDays: 30,
      autoRenew: false,
      renewalTermMonths: 12,
      renewalGraceDays: 7,
    },
    templates: [
      {
        id: 'basic-contract',
        name: 'Basic Contract',
        fields: [
          { key: 'customerName', label: 'Customer Name', required: true, type: 'text' },
          { key: 'service', label: 'Product/Service', required: true, type: 'text' },
          { key: 'amount', label: 'Amount', required: true, type: 'number' },
          { key: 'startDate', label: 'Start Date', required: true, type: 'date' },
          { key: 'endDate', label: 'End Date', required: false, type: 'date' },
          { key: 'terms', label: 'Terms', required: false, type: 'textarea' },
        ],
        dynamicTokens: ['{{customer}}', '{{lead.id}}', '{{sales.opportunityId}}'],
      },
    ],
    notifications: {
      recipients: { admin: true, broker: true, customer: true },
      methods: { email: true, sms: false, inApp: true },
      messages: {
        created: 'Contract created for {{customer}}',
        pending: 'Contract pending signature',
        signed: 'Contract signed successfully',
        expired: 'Contract expired. Consider renewal.',
      },
    },
    workflow: {
      autoGenerateFromSales: true,
      autoLinkToInvoice: false,
      autoRenewContracts: false,
      minApprovalRequired: 'Manager', // None | Admin | Manager
    },
  }
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/contracts/settings')
    if (res.ok) return await res.json()
  } catch {}
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (raw) return JSON.parse(raw)
  } catch {}
  return defaultSettings()
}

async function saveSettings(payload) {
  try {
    const res = await fetch('/api/contracts/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    if (res.ok) return true
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      return true
    }
  } catch {}
  return false
}

export default function ContractsSettingsManager() {
  const { t, i18n } = useTranslation()
  const isRTL = useMemo(() => i18n.dir() === 'rtl', [i18n])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState(defaultSettings())
  const [activeTab, setActiveTab] = useState('general')
  const [editingTemplateId, setEditingTemplateId] = useState('')

  const [assignees] = useState([
    { id: 'st1', name: 'Staff A' },
    { id: 'st2', name: 'Staff B' },
    { id: 'bk1', name: 'Broker X' },
  ])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const s = await fetchSettings()
      if (!mounted) return
      setSettings(prev => ({ ...prev, ...s }))
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  const tabs = [
    { key: 'general', label: t('General Settings') },
    { key: 'templates', label: t('Contract Templates') },
    { key: 'notifications', label: t('Notifications') },
    { key: 'workflow', label: t('Workflow & Rules') },
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
    const ok = await saveSettings(settings)
    setSaving(false)
    if (ok) {
      // optional toast
    }
  }

  const handleReset = async () => {
    const d = defaultSettings()
    setSettings(d)
    await saveSettings(d)
  }

  const addTemplate = () => {
    const newId = `tpl-${Date.now()}`
    const tmpl = {
      id: newId,
      name: 'New Template',
      fields: [
        { key: 'customerName', label: 'Customer Name', required: true, type: 'text' },
        { key: 'amount', label: 'Amount', required: true, type: 'number' },
        { key: 'startDate', label: 'Start Date', required: true, type: 'date' },
      ],
      dynamicTokens: ['{{customer}}'],
    }
    setSettings(prev => ({ ...prev, templates: [...prev.templates, tmpl] }))
    setEditingTemplateId(newId)
  }

  const deleteTemplate = (id) => {
    setSettings(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== id) }))
    if (editingTemplateId === id) setEditingTemplateId('')
    if (settings.general.defaultTemplateId === id) update('general.defaultTemplateId', '')
  }

  const updateTemplate = (id, patch) => {
    setSettings(prev => ({
      ...prev,
      templates: prev.templates.map(t => t.id === id ? { ...t, ...patch } : t)
    }))
  }

  if (loading) return (<div className="p-4 text-[var(--muted-text)]">{t('Loading')}...</div>)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button key={tab.key} className={`btn btn-outline btn-sm ${activeTab === tab.key ? 'bg-primary text-white' : ''}`} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'general' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Enable Contracts Module')}</label>
              <input type="checkbox" checked={settings.general.enabled} onChange={e => update('general.enabled', e.target.checked)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Default Contract Status')}</label>
              <select className="input" value={settings.general.defaultStatus} onChange={e => update('general.defaultStatus', e.target.value)}>
                {['Draft','Pending Signature','Signed','Cancelled'].map(s => (<option key={s} value={s}>{t(s)}</option>))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Default Template')}</label>
              <select className="input" value={settings.general.defaultTemplateId} onChange={e => update('general.defaultTemplateId', e.target.value)}>
                <option value="">{t('None')}</option>
                {settings.templates.map(tp => (<option key={tp.id} value={tp.id}>{tp.name}</option>))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Default Assigned Staff / Broker')}</label>
              <select className="input" value={settings.general.defaultAssigneeId} onChange={e => update('general.defaultAssigneeId', e.target.value)}>
                <option value="">{t('None')}</option>
                {assignees.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Contract Expiry (days)')}</label>
              <input type="number" min={0} className="input" value={settings.general.expiryDays} onChange={e => update('general.expiryDays', parseInt(e.target.value || '0', 10))} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Auto-Renew Contracts')}</label>
              <input type="checkbox" checked={settings.general.autoRenew} onChange={e => update('general.autoRenew', e.target.checked)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Renewal Term (months)')}</label>
              <input type="number" min={1} className="input" value={settings.general.renewalTermMonths} onChange={e => update('general.renewalTermMonths', parseInt(e.target.value || '0', 10))} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Renewal Grace (days)')}</label>
              <input type="number" min={0} className="input" value={settings.general.renewalGraceDays} onChange={e => update('general.renewalGraceDays', parseInt(e.target.value || '0', 10))} />
            </div>
          </div>
        </section>
      )}

      {activeTab === 'templates' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{t('Contract Templates')}</h3>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={addTemplate}>{t('Add Template')}</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">{t('Name')}</th>
                  <th className="p-2">{t('Fields')}</th>
                  <th className="p-2">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {settings.templates.map(tp => (
                  <tr key={tp.id} className="border-t">
                    <td className="p-2">
                      <input className="input" value={tp.name} onChange={e => updateTemplate(tp.id, { name: e.target.value })} />
                    </td>
                    <td className="p-2">
                      <span className="text-xs text-gray-600 dark:text-gray-300">{t('Fields')}: {tp.fields.length}</span>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button className="btn btn-outline btn-sm" onClick={() => setEditingTemplateId(editingTemplateId === tp.id ? '' : tp.id)}>
                          {editingTemplateId === tp.id ? t('Close') : t('Edit')}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteTemplate(tp.id)}>{t('Delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editingTemplateId && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              {settings.templates.filter(t => t.id === editingTemplateId).map(tp => (
                <div key={tp.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{t('Edit Template')}: {tp.name}</div>
                    <button className="btn btn-glass btn-sm" onClick={() => setEditingTemplateId('')}>{t('Done')}</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tp.fields.map((f, idx) => (
                      <div key={f.key} className="flex items-center gap-2">
                        <input className="input flex-1" value={f.label} onChange={e => {
                          const nextFields = [...tp.fields]
                          nextFields[idx] = { ...f, label: e.target.value }
                          updateTemplate(tp.id, { fields: nextFields })
                        }} />
                        <select className="input w-32" value={f.type} onChange={e => {
                          const nextFields = [...tp.fields]
                          nextFields[idx] = { ...f, type: e.target.value }
                          updateTemplate(tp.id, { fields: nextFields })
                        }}>
                          {['text','number','date','textarea'].map(tpType => (<option key={tpType} value={tpType}>{tpType}</option>))}
                        </select>
                        <label className="text-xs inline-flex items-center gap-1">
                          <input type="checkbox" checked={f.required} onChange={e => {
                            const nextFields = [...tp.fields]
                            nextFields[idx] = { ...f, required: e.target.checked }
                            updateTemplate(tp.id, { fields: nextFields })
                          }} />
                          {t('Required')}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" onClick={() => {
                      const nextFields = [...tp.fields, { key: `field_${tp.fields.length+1}`, label: 'New Field', required: false, type: 'text' }]
                      updateTemplate(tp.id, { fields: nextFields })
                    }}>{t('Add Field')}</button>
                    <button className="btn btn-glass btn-sm" onClick={() => updateTemplate(tp.id, { dynamicTokens: [...(tp.dynamicTokens||[]), '{{contract.id}}'] })}>{t('Add Dynamic Token')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'notifications' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Recipients')}</div>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={settings.notifications.recipients.admin} onChange={e => update('notifications.recipients', { ...settings.notifications.recipients, admin: e.target.checked })} /> Admin</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={settings.notifications.recipients.broker} onChange={e => update('notifications.recipients', { ...settings.notifications.recipients, broker: e.target.checked })} /> Broker</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={settings.notifications.recipients.customer} onChange={e => update('notifications.recipients', { ...settings.notifications.recipients, customer: e.target.checked })} /> Customer</label>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Methods')}</div>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={settings.notifications.methods.email} onChange={e => update('notifications.methods', { ...settings.notifications.methods, email: e.target.checked })} /> Email</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={settings.notifications.methods.sms} onChange={e => update('notifications.methods', { ...settings.notifications.methods, sms: e.target.checked })} /> SMS</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={settings.notifications.methods.inApp} onChange={e => update('notifications.methods', { ...settings.notifications.methods, inApp: e.target.checked })} /> In-App</label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['created','pending','signed','expired'].map(st => (
              <div key={st} className="flex flex-col">
                <label className="text-sm text-[var(--muted-text)]">{t(`Message: ${st.charAt(0).toUpperCase() + st.slice(1)}`)}</label>
                <textarea className="input h-24" value={settings.notifications.messages[st]} onChange={e => update('notifications.messages', { ...settings.notifications.messages, [st]: e.target.value })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'workflow' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Auto-generate Contract from Sales Opportunity')}</label>
              <input type="checkbox" checked={settings.workflow.autoGenerateFromSales} onChange={e => update('workflow.autoGenerateFromSales', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Auto-link Contract to Invoice')}</label>
              <input type="checkbox" checked={settings.workflow.autoLinkToInvoice} onChange={e => update('workflow.autoLinkToInvoice', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Auto-renew Contracts')}</label>
              <input type="checkbox" checked={settings.workflow.autoRenewContracts} onChange={e => update('workflow.autoRenewContracts', e.target.checked)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Minimum Approval Required')}</label>
              <select className="input" value={settings.workflow.minApprovalRequired} onChange={e => update('workflow.minApprovalRequired', e.target.value)}>
                {['None','Admin','Manager'].map(s => (<option key={s} value={s}>{t(s)}</option>))}
              </select>
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