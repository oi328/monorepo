import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'buyer_request_reset.settings'

function defaultSettings() {
  return {
    general: {
      enabled: true,
      defaultResetStatus: 'pending', // 'pending' | 'draft' | 'verified'
      maxResetsPerRequest: 3,
    },
    rules: {
      allowedRoles: ['admin', 'broker'], // 'admin' | 'broker' | 'customer'
      allowedFields: ['budget', 'location', 'propertyType', 'notes'],
      autoNotifyAssignedBroker: true,
    },
    notifications: {
      customer: { enabled: true, methods: { email: true, sms: false, inApp: true } },
      admin: { enabled: true, methods: { email: true, sms: false, inApp: true } },
      broker: { enabled: true, methods: { email: true, sms: false, inApp: true } },
    },
    workflowLogs: {
      trackResetHistory: true,
      displayChanges: true,
      autoConvertToLead: false,
      autoConvertToEoi: false,
    },
  }
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/buyer-request-reset/settings')
    if (res.ok) return await res.json()
  } catch {}
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (raw) return JSON.parse(raw)
  } catch {}
  return defaultSettings()
}

async function saveSettings(settings) {
  try {
    const res = await fetch('/api/buyer-request-reset/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (!res.ok) throw new Error('Failed to save')
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    }
  } catch {}
}

export default function BuyerRequestResetSettingsManager() {
  const { t, i18n } = useTranslation()
  const isRTL = useMemo(() => i18n.dir() === 'rtl', [i18n])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState(defaultSettings())
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { key: 'general', label: t('General Settings') },
    { key: 'rules', label: t('Reset Rules') },
    { key: 'notifications', label: t('Notifications') },
    { key: 'workflow', label: t('Workflow & Logs') },
  ]

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
    await saveSettings(settings)
    setSaving(false)
  }

  const handleReset = () => {
    const d = defaultSettings()
    setSettings(d)
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6">
        <div className="animate-pulse text-sm text-gray-500">{t('Loading settings...')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-sm rounded-full border ${activeTab === tab.key ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200'} border-gray-200 dark:border-gray-700`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="px-3 py-2 text-sm rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
            {t('Reset to Default')}
          </button>
          <button onClick={handleSave} disabled={saving} className={`px-3 py-2 text-sm rounded ${saving ? 'opacity-70 cursor-not-allowed' : ''} bg-blue-600 text-white`}>
            {saving ? t('Saving...') : t('Save Changes')}
          </button>
        </div>
      </div>

      {activeTab === 'general' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Enable Buyer Request Reset')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.general.enabled} onChange={e => update('general.enabled', e.target.checked)} />
                <span>{settings.general.enabled ? t('Enabled') : t('Disabled')}</span>
              </label>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Default Reset Status')}</div>
              <select className="input" value={settings.general.defaultResetStatus} onChange={e => update('general.defaultResetStatus', e.target.value)}>
                {['pending','draft','verified'].map(s => (<option key={s} value={s}>{t(s)}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Max Number of Resets per Request')}</div>
              <input type="number" min={0} className="input" value={settings.general.maxResetsPerRequest} onChange={e => update('general.maxResetsPerRequest', Number(e.target.value))} />
            </div>
          </div>
        </section>
      )}

      {activeTab === 'rules' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Allowed Roles')}</div>
              <div className="flex flex-wrap gap-3 text-sm">
                {['admin','broker','customer'].map(r => (
                  <label key={r} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.rules.allowedRoles.includes(r)}
                      onChange={e => {
                        const checked = e.target.checked
                        const next = checked
                          ? [...settings.rules.allowedRoles, r]
                          : settings.rules.allowedRoles.filter(x => x !== r)
                        update('rules.allowedRoles', next)
                      }}
                    />
                    <span>{t(r)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Fields Allowed for Reset')}</div>
              <div className="flex flex-wrap gap-3 text-sm">
                {[
                  { key: 'budget', label: t('Budget') },
                  { key: 'location', label: t('Location') },
                  { key: 'propertyType', label: t('Property Type') },
                  { key: 'notes', label: t('Notes') },
                ].map(f => (
                  <label key={f.key} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.rules.allowedFields.includes(f.key)}
                      onChange={e => {
                        const checked = e.target.checked
                        const next = checked
                          ? [...settings.rules.allowedFields, f.key]
                          : settings.rules.allowedFields.filter(x => x !== f.key)
                        update('rules.allowedFields', next)
                      }}
                    />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-sm">{t('Auto-Notify Assigned Broker After Reset')}</div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.rules.autoNotifyAssignedBroker} onChange={e => update('rules.autoNotifyAssignedBroker', e.target.checked)} />
              <span>{settings.rules.autoNotifyAssignedBroker ? t('Enabled') : t('Disabled')}</span>
            </label>
          </div>
        </section>
      )}

      {activeTab === 'notifications' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['customer','admin','broker'].map(role => (
              <div key={role} className="space-y-2">
                <div className="font-medium text-sm">{t(`Notify ${role.charAt(0).toUpperCase() + role.slice(1)}`)}</div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={settings.notifications[role].enabled} onChange={e => update(`notifications.${role}.enabled`, e.target.checked)} />
                  <span>{settings.notifications[role].enabled ? t('Enabled') : t('Disabled')}</span>
                </label>
                <div className="flex items-center gap-3 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={settings.notifications[role].methods.email} onChange={e => update(`notifications.${role}.methods`, { ...settings.notifications[role].methods, email: e.target.checked })} />
                    <span>{t('Email')}</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={settings.notifications[role].methods.sms} onChange={e => update(`notifications.${role}.methods`, { ...settings.notifications[role].methods, sms: e.target.checked })} />
                    <span>{t('SMS')}</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={settings.notifications[role].methods.inApp} onChange={e => update(`notifications.${role}.methods`, { ...settings.notifications[role].methods, inApp: e.target.checked })} />
                    <span>{t('In-App')}</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'workflow' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Track Reset History per Request')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.workflowLogs.trackResetHistory} onChange={e => update('workflowLogs.trackResetHistory', e.target.checked)} />
                <span>{settings.workflowLogs.trackResetHistory ? t('Enabled') : t('Disabled')}</span>
              </label>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Display Who Reset, When, and Which Fields Changed')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.workflowLogs.displayChanges} onChange={e => update('workflowLogs.displayChanges', e.target.checked)} />
                <span>{settings.workflowLogs.displayChanges ? t('Enabled') : t('Disabled')}</span>
              </label>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Auto-Convert Reset to Lead')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.workflowLogs.autoConvertToLead} onChange={e => update('workflowLogs.autoConvertToLead', e.target.checked)} />
                <span>{settings.workflowLogs.autoConvertToLead ? t('Enabled') : t('Disabled')}</span>
              </label>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Auto-Convert Reset to EOI')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.workflowLogs.autoConvertToEoi} onChange={e => update('workflowLogs.autoConvertToEoi', e.target.checked)} />
                <span>{settings.workflowLogs.autoConvertToEoi ? t('Enabled') : t('Disabled')}</span>
              </label>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>{t('Logs endpoint')}: /api/buyer-request-reset/logs</div>
            <div>{t('Apply reset endpoint')}: /api/buyer-request-reset/apply</div>
            <div>{t('Notifications endpoint')}: /api/buyer-request-reset/notify</div>
          </div>
        </section>
      )}
    </div>
  )
}