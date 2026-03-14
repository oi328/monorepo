import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'rest_unit.settings'

function defaultSettings() {
  return {
    general: {
      enabled: true,
      defaultDurationMinutes: 30,
      defaultNumberPerDay: 2,
      workingHours: { start: '09:00', end: '17:00' },
    },
    rules: {
      allowStaffSelection: true,
      fixedTimeSlots: ['12:00', '15:00'],
      autoAdjustAroundRest: true,
    },
    notifications: {
      notifyStaffBeforeRest: { enabled: true, minutesBefore: 10 },
      notifyManagerIfMissed: false,
    },
    reporting: {
      trackPerStaffPerDay: true,
      dailyReports: true,
      weeklyReports: true,
      linkToPayrollOrProductivity: false,
    },
  }
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/rest-unit/settings')
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
    const res = await fetch('/api/rest-unit/settings', {
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

export default function RestUnitSettingsManager() {
  const { t, i18n } = useTranslation()
  const isRTL = useMemo(() => i18n.dir() === 'rtl', [i18n])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState(defaultSettings())
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { key: 'general', label: t('General Settings') },
    { key: 'rules', label: t('Rest Scheduling Rules') },
    { key: 'notifications', label: t('Notifications') },
    { key: 'reporting', label: t('Workflow & Reporting') },
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
              <div className="font-medium text-sm">{t('Enable Rest Unit System')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.general.enabled} onChange={e => update('general.enabled', e.target.checked)} />
                <span>{settings.general.enabled ? t('Enabled') : t('Disabled')}</span>
              </label>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Default Rest Duration')}</div>
              <select className="input" value={settings.general.defaultDurationMinutes} onChange={e => update('general.defaultDurationMinutes', Number(e.target.value))}>
                {[10, 15, 20, 30, 45, 60].map(m => (<option key={m} value={m}>{m} {t('minutes')}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Default Number of Rest Units per Day')}</div>
              <input type="number" min={0} className="input" value={settings.general.defaultNumberPerDay} onChange={e => update('general.defaultNumberPerDay', Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium text-sm">{t('Working Hours')}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3">
                <span className="text-sm w-24">{t('Start')}</span>
                <input type="time" className="input" value={settings.general.workingHours.start} onChange={e => update('general.workingHours', { ...settings.general.workingHours, start: e.target.value })} />
              </label>
              <label className="flex items-center gap-3">
                <span className="text-sm w-24">{t('End')}</span>
                <input type="time" className="input" value={settings.general.workingHours.end} onChange={e => update('general.workingHours', { ...settings.general.workingHours, end: e.target.value })} />
              </label>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'rules' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Allow Staff to choose rest time')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.rules.allowStaffSelection} onChange={e => update('rules.allowStaffSelection', e.target.checked)} />
                <span>{settings.rules.allowStaffSelection ? t('Allowed') : t('Not Allowed')}</span>
              </label>
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="font-medium text-sm">{t('Fixed Rest Time Slots')}</div>
              <TimeSlotsEditor slots={settings.rules.fixedTimeSlots} onChange={slots => update('rules.fixedTimeSlots', slots)} isRTL={isRTL} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-sm">{t('Auto-adjust Reservations / Meetings around Rest Units')}</div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.rules.autoAdjustAroundRest} onChange={e => update('rules.autoAdjustAroundRest', e.target.checked)} />
              <span>{settings.rules.autoAdjustAroundRest ? t('Enabled') : t('Disabled')}</span>
            </label>
          </div>
        </section>
      )}

      {activeTab === 'notifications' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Notify Staff Before Rest Time')}</div>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={settings.notifications.notifyStaffBeforeRest.enabled} onChange={e => update('notifications.notifyStaffBeforeRest', { ...settings.notifications.notifyStaffBeforeRest, enabled: e.target.checked })} />
                <input type="number" min={0} className="input w-28" value={settings.notifications.notifyStaffBeforeRest.minutesBefore} onChange={e => update('notifications.notifyStaffBeforeRest', { ...settings.notifications.notifyStaffBeforeRest, minutesBefore: Number(e.target.value) })} />
                <span className="text-sm">{t('minutes')}</span>
              </label>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Notify Manager if Rest Missed')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.notifications.notifyManagerIfMissed} onChange={e => update('notifications.notifyManagerIfMissed', e.target.checked)} />
                <span>{settings.notifications.notifyManagerIfMissed ? t('Enabled') : t('Disabled')}</span>
              </label>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'reporting' && (
        <section className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Track Rest Units per Staff per Day')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.reporting.trackPerStaffPerDay} onChange={e => update('reporting.trackPerStaffPerDay', e.target.checked)} />
                <span>{settings.reporting.trackPerStaffPerDay ? t('Enabled') : t('Disabled')}</span>
              </label>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Daily Reports')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.reporting.dailyReports} onChange={e => update('reporting.dailyReports', e.target.checked)} />
                <span>{settings.reporting.dailyReports ? t('Enabled') : t('Disabled')}</span>
              </label>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Weekly Reports')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.reporting.weeklyReports} onChange={e => update('reporting.weeklyReports', e.target.checked)} />
                <span>{settings.reporting.weeklyReports ? t('Enabled') : t('Disabled')}</span>
              </label>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">{t('Link Rest Units to Payroll or Productivity Metrics')}</div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.reporting.linkToPayrollOrProductivity} onChange={e => update('reporting.linkToPayrollOrProductivity', e.target.checked)} />
                <span>{settings.reporting.linkToPayrollOrProductivity ? t('Enabled') : t('Disabled')}</span>
              </label>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t('Reports endpoint available at')} /api/rest-unit/report
          </div>
        </section>
      )}
    </div>
  )
}

function TimeSlotsEditor({ slots, onChange, isRTL }) {
  const { t } = useTranslation()
  const [newSlot, setNewSlot] = useState('')

  const addSlot = () => {
    const s = (newSlot || '').trim()
    if (!s) return
    // basic HH:mm validation
    const ok = /^\d{2}:\d{2}$/.test(s)
    if (!ok) return
    if (slots.includes(s)) return
    onChange([...(slots || []), s].sort())
    setNewSlot('')
  }

  const removeSlot = (s) => {
    onChange((slots || []).filter(x => x !== s))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="time"
          className="input w-40"
          value={newSlot}
          onChange={e => setNewSlot(e.target.value)}
        />
        <button onClick={addSlot} className="px-3 py-2 text-sm rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          {t('Add Slot')}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(slots || []).length === 0 && (
          <span className="text-xs text-gray-500">{t('No fixed slots')}</span>
        )}
        {(slots || []).map(s => (
          <span key={s} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span>{s}</span>
            <button onClick={() => removeSlot(s)} className="text-red-600 hover:underline">
              {isRTL ? 'إزالة' : t('Remove')}
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}