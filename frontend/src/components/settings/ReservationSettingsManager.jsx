import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'reservation.settings'

function defaultSettings() {
  return {
    general: {
      enabled: true,
      defaultStatus: 'Pending',
      defaultDurationMin: 30,
      defaultAssigneeId: '', // staff or broker id
      timezone: 'Africa/Cairo',
      workingHours: { // 24h format
        mon: { enabled: true, from: '09:00', to: '17:00' },
        tue: { enabled: true, from: '09:00', to: '17:00' },
        wed: { enabled: true, from: '09:00', to: '17:00' },
        thu: { enabled: true, from: '09:00', to: '17:00' },
        fri: { enabled: true, from: '10:00', to: '16:00' },
        sat: { enabled: false, from: '00:00', to: '00:00' },
        sun: { enabled: false, from: '00:00', to: '00:00' },
      },
    },
    sources: [
      { id: 'website', name: 'Website', enabled: true, autoAssignId: '' },
      { id: 'app', name: 'Mobile App', enabled: true, autoAssignId: '' },
      { id: 'manual', name: 'Manual Entry', enabled: true, autoAssignId: '' },
    ],
    notifications: {
      recipients: { admin: true, broker: true, customer: true },
      methods: { email: true, sms: false, inApp: true },
      messages: {
        pending: 'Reservation pending for {{customer}} at {{datetime}}',
        confirmed: 'Reservation confirmed: {{datetime}}',
        completed: 'Reservation completed, thank you!',
        cancelled: 'Reservation cancelled. Contact us to reschedule.',
      },
    },
    rules: {
      maxPerDayPerStaff: 12,
      minNoticeMinutes: 120,
      allowReschedule: true,
      allowCancel: true,
      autoConvertToLead: false,
    },
    integration: {
      eoiToLeadAutoReservation: true,
      onCompleteTriggerSales: true,
      onCompleteCreateCil: false,
    },
  }
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/reservation/settings')
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
    const res = await fetch('/api/reservation/settings', {
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

export default function ReservationSettingsManager() {
  const { t, i18n } = useTranslation()
  const isRTL = useMemo(() => i18n.dir() === 'rtl', [i18n])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState(defaultSettings())
  const [activeTab, setActiveTab] = useState('general')

  // demo lists for staff/brokers
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
    { key: 'sources', label: t('Reservation Sources') },
    { key: 'notifications', label: t('Notifications') },
    { key: 'rules', label: t('Workflow & Rules') },
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
      // Could show toast here
    }
  }

  const handleReset = async () => {
    const d = defaultSettings()
    setSettings(d)
    await saveSettings(d)
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
              <label className="text-sm text-[var(--muted-text)]">{t('Enable Reservation System')}</label>
              <input type="checkbox" checked={settings.general.enabled} onChange={e => update('general.enabled', e.target.checked)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Default Reservation Status')}</label>
              <select className="input" value={settings.general.defaultStatus} onChange={e => update('general.defaultStatus', e.target.value)}>
                {['Pending','Confirmed','Cancelled','Completed'].map(s => (<option key={s} value={s}>{t(s)}</option>))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Default Reservation Duration (min)')}</label>
              <input type="number" min={5} className="input" value={settings.general.defaultDurationMin} onChange={e => update('general.defaultDurationMin', parseInt(e.target.value || '0', 10))} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Default Assigned Staff / Broker')}</label>
              <select className="input" value={settings.general.defaultAssigneeId} onChange={e => update('general.defaultAssigneeId', e.target.value)}>
                <option value="">{t('None')}</option>
                {assignees.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Timezone')}</label>
              <input className="input" value={settings.general.timezone} onChange={e => update('general.timezone', e.target.value)} />
            </div>
          </div>

          {/* Working hours */}
          <div>
            <h3 className="text-base font-semibold mb-2">{t('Working Hours')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(settings.general.workingHours).map(([day, cfg]) => (
                <div key={day} className="flex items-center gap-3">
                  <label className="w-24 capitalize">{t(day)}</label>
                  <input type="checkbox" checked={cfg.enabled} onChange={e => setSettings(prev => ({
                    ...prev,
                    general: { ...prev.general, workingHours: { ...prev.general.workingHours, [day]: { ...cfg, enabled: e.target.checked } } }
                  }))} />
                  <input type="time" className="input" value={cfg.from} onChange={e => setSettings(prev => ({
                    ...prev,
                    general: { ...prev.general, workingHours: { ...prev.general.workingHours, [day]: { ...cfg, from: e.target.value } } }
                  }))} />
                  <span>→</span>
                  <input type="time" className="input" value={cfg.to} onChange={e => setSettings(prev => ({
                    ...prev,
                    general: { ...prev.general, workingHours: { ...prev.general.workingHours, [day]: { ...cfg, to: e.target.value } } }
                  }))} />
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
                  <th className="p-2">{t('Source')}</th>
                  <th className="p-2">{t('Enabled')}</th>
                  <th className="p-2">{t('Auto-Assign Staff')}</th>
                </tr>
              </thead>
              <tbody>
                {settings.sources.map((src, i) => (
                  <tr key={src.id} className="border-t">
                    <td className="p-2">{t(src.name)}</td>
                    <td className="p-2"><input type="checkbox" checked={src.enabled} onChange={e => setSettings(prev => { const next = [...prev.sources]; next[i] = { ...src, enabled: e.target.checked }; return { ...prev, sources: next } })} /></td>
                    <td className="p-2">
                      <select className="input" value={src.autoAssignId || ''} onChange={e => setSettings(prev => { const next = [...prev.sources]; next[i] = { ...src, autoAssignId: e.target.value }; return { ...prev, sources: next } })}>
                        <option value="">{t('None')}</option>
                        {assignees.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            {['pending','confirmed','completed','cancelled'].map(st => (
              <div key={st} className="flex flex-col">
                <label className="text-sm text-[var(--muted-text)]">{t(`Message: ${st.charAt(0).toUpperCase() + st.slice(1)}`)}</label>
                <textarea className="input h-24" value={settings.notifications.messages[st]} onChange={e => update('notifications.messages', { ...settings.notifications.messages, [st]: e.target.value })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'rules' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Max Reservations Per Day / Staff')}</label>
              <input type="number" min={1} className="input" value={settings.rules.maxPerDayPerStaff} onChange={e => update('rules.maxPerDayPerStaff', parseInt(e.target.value || '0', 10))} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[var(--muted-text)]">{t('Minimum Notice Time (minutes)')}</label>
              <input type="number" min={0} className="input" value={settings.rules.minNoticeMinutes} onChange={e => update('rules.minNoticeMinutes', parseInt(e.target.value || '0', 10))} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Allow Rescheduling')}</label>
              <input type="checkbox" checked={settings.rules.allowReschedule} onChange={e => update('rules.allowReschedule', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Allow Cancellation')}</label>
              <input type="checkbox" checked={settings.rules.allowCancel} onChange={e => update('rules.allowCancel', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('Auto-Convert Reservation to Lead')}</label>
              <input type="checkbox" checked={settings.rules.autoConvertToLead} onChange={e => update('rules.autoConvertToLead', e.target.checked)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('EOI → Lead → Auto Reservation')}</label>
              <input type="checkbox" checked={settings.integration.eoiToLeadAutoReservation} onChange={e => update('integration.eoiToLeadAutoReservation', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('On Complete → Trigger Sales Opportunity')}</label>
              <input type="checkbox" checked={settings.integration.onCompleteTriggerSales} onChange={e => update('integration.onCompleteTriggerSales', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--muted-text)]">{t('On Complete → Create CIL Record')}</label>
              <input type="checkbox" checked={settings.integration.onCompleteCreateCil} onChange={e => update('integration.onCompleteCreateCil', e.target.checked)} />
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