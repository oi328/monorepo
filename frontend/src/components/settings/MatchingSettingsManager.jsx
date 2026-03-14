import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'matching.settings'

function defaultProfile(name = 'Default Profile') {
  return {
    id: `${Date.now()}`,
    name,
    fields: {
      location: true,
      budget: true,
      propertyType: true,
      leadPriority: true,
      tags: false,
    },
    weights: {
      location: 40,
      budget: 30,
      propertyType: 30,
      leadPriority: 0,
      tags: 0,
    },
  }
}

function defaultSettings() {
  const profile = defaultProfile()
  return {
    general: {
      enabled: true,
      defaultStatus: 'Pending', // Pending | Matched | Unmatched
      autoMatching: true,
    },
    criteria: {
      profiles: [profile],
      activeProfileId: profile.id,
    },
    notifications: {
      notifyBroker: true,
      notifyCustomer: false,
      methods: { email: true, sms: false, inApp: true },
    },
    workflow: {
      trackHistory: true,
      showScore: true,
      manualOverride: { admin: true, broker: true },
    },
  }
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/matching/settings')
    if (res.ok) return await res.json()
  } catch {}
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (raw) return JSON.parse(raw)
  } catch {}
  return defaultSettings()
}

async function persistSettings(settings) {
  try {
    const res = await fetch('/api/matching/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) return true
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      return true
    }
  } catch {}
  return false
}

async function fetchLogs() {
  try {
    const res = await fetch('/api/matching/logs')
    if (res.ok) return await res.json()
  } catch {}
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('matching.logs') : null
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

async function runMatching(payload = {}) {
  try {
    const res = await fetch('/api/matching/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) return await res.json()
  } catch {}
  return { status: 'mocked', matchedCount: 0, message: 'Mock run completed.' }
}

async function sendNotifications(payload = {}) {
  try {
    const res = await fetch('/api/matching/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) return await res.json()
  } catch {}
  return { status: 'mocked', message: 'Notifications simulated.' }
}

export default function MatchingSettingsManager() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  const [settings, setSettings] = useState(defaultSettings())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('General')
  const [logs, setLogs] = useState([])
  const [newProfileName, setNewProfileName] = useState('')

  useEffect(() => {
    let mounted = true
    fetchSettings().then(s => {
      if (!mounted) return
      setSettings(s)
      setLoading(false)
    })
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

  const profiles = settings.criteria.profiles || []
  const activeProfile = useMemo(() => profiles.find(p => p.id === settings.criteria.activeProfileId) || profiles[0], [profiles, settings.criteria.activeProfileId])

  const weightSum = useMemo(() => {
    const w = activeProfile?.weights || {}
    return (Number(w.location) || 0) + (Number(w.budget) || 0) + (Number(w.propertyType) || 0) + (Number(w.leadPriority) || 0) + (Number(w.tags) || 0)
  }, [activeProfile])

  const addProfile = () => {
    const name = newProfileName.trim() || 'Profile'
    const profile = defaultProfile(name)
    const nextProfiles = [...profiles, profile]
    update('criteria.profiles', nextProfiles)
    update('criteria.activeProfileId', profile.id)
    setNewProfileName('')
    setToast({ type: 'success', message: t('Profile added') })
    setTimeout(() => setToast(null), 1800)
  }

  const removeProfile = (id) => {
    const nextProfiles = profiles.filter(p => p.id !== id)
    const nextActive = id === settings.criteria.activeProfileId ? (nextProfiles[0]?.id || null) : settings.criteria.activeProfileId
    update('criteria.profiles', nextProfiles)
    update('criteria.activeProfileId', nextActive)
    setToast({ type: 'info', message: t('Profile removed') })
    setTimeout(() => setToast(null), 1800)
  }

  const updateProfile = (id, updater) => {
    const next = profiles.map(p => (p.id === id ? updater({ ...p }) : p))
    update('criteria.profiles', next)
  }

  const save = async () => {
    setSaving(true)
    const ok = await persistSettings(settings)
    setSaving(false)
    setToast({ type: ok ? 'success' : 'error', message: ok ? t('Settings saved') : t('Failed to save settings') })
    setTimeout(() => setToast(null), 2000)
  }

  const reset = () => {
    const s = defaultSettings()
    setSettings(s)
    setToast({ type: 'info', message: t('Settings reset to default') })
    setTimeout(() => setToast(null), 2000)
  }

  const refreshLogs = async () => {
    const l = await fetchLogs()
    setLogs(Array.isArray(l) ? l : [])
  }

  const triggerRunMatching = async () => {
    const payload = { profile: activeProfile, general: settings.general }
    const res = await runMatching(payload)
    setToast({ type: 'success', message: t('Matching run completed') })
    setTimeout(() => setToast(null), 1500)
    await refreshLogs()
  }

  const triggerNotify = async () => {
    const res = await sendNotifications({ methods: settings.notifications.methods })
    setToast({ type: 'info', message: t('Notifications sent (mock)') })
    setTimeout(() => setToast(null), 1500)
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {['General', 'Matching Criteria', 'Notifications', 'Workflow & Logs'].map(key => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded text-sm ${tab === key ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {tab === 'General' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={settings.general.enabled} onChange={e => update('general.enabled', e.target.checked)} />
            <label className="font-medium">{t('Enable Matching System')}</label>
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium w-48">{t('Default Matching Status')}</label>
            <select
              value={settings.general.defaultStatus}
              onChange={e => update('general.defaultStatus', e.target.value)}
              className="px-2 py-1 rounded bg-[var(--content-bg)] border border-gray-300 dark:border-gray-700"
            >
              {['Pending', 'Matched', 'Unmatched'].map(opt => <option key={opt} value={opt}>{t(opt)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={settings.general.autoMatching} onChange={e => update('general.autoMatching', e.target.checked)} />
            <label className="font-medium">{t('Auto-Matching Enabled')}</label>
          </div>
        </div>
      )}

      {tab === 'Matching Criteria' && (
        <div className="space-y-6">
          {/* Profiles management */}
          <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{t('Matching Profiles')}</div>
              <div className="flex items-center gap-2">
                <input
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  placeholder={t('Profile name')}
                  className="px-2 py-1 rounded bg-[var(--content-bg)] border border-gray-300 dark:border-gray-700"
                />
                <button onClick={addProfile} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">{t('Add Profile')}</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {profiles.map(p => (
                <div key={p.id} className={`px-3 py-1 rounded text-sm flex items-center gap-2 ${p.id === activeProfile?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <input type="radio" name="activeProfile" checked={p.id === activeProfile?.id} onChange={() => update('criteria.activeProfileId', p.id)} />
                  <span>{p.name}</span>
                  <button onClick={() => removeProfile(p.id)} className="text-xs opacity-80">{t('Remove')}</button>
                </div>
              ))}
            </div>
          </div>

          {/* Active profile fields */}
          {activeProfile && (
            <div className="space-y-4">
              <div className="font-semibold">{t('Fields for Matching')}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'location', label: 'Location' },
                  { key: 'budget', label: 'Budget' },
                  { key: 'propertyType', label: 'Property Type' },
                  { key: 'leadPriority', label: 'Lead Priority' },
                  { key: 'tags', label: 'Tags / Keywords' },
                ].map(f => (
                  <label key={f.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!activeProfile.fields[f.key]}
                      onChange={e => updateProfile(activeProfile.id, prof => { prof.fields[f.key] = e.target.checked; return prof })}
                    />
                    <span>{t(f.label)}</span>
                  </label>
                ))}
              </div>

              <div className="font-semibold">{t('Matching Priority Weight (%)')}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'location', label: 'Location' },
                  { key: 'budget', label: 'Budget' },
                  { key: 'propertyType', label: 'Property Type' },
                  { key: 'leadPriority', label: 'Lead Priority' },
                  { key: 'tags', label: 'Tags / Keywords' },
                ].map(w => (
                  <div key={w.key} className="flex items-center gap-2">
                    <label className="w-40">{t(w.label)}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={activeProfile.weights[w.key] ?? 0}
                      onChange={e => updateProfile(activeProfile.id, prof => { prof.weights[w.key] = Number(e.target.value) || 0; return prof })}
                      className="px-2 py-1 rounded bg-[var(--content-bg)] border border-gray-300 dark:border-gray-700 w-28"
                    />
                    <span className="text-xs text-gray-500">{t('%')}</span>
                  </div>
                ))}
              </div>
              <div className={`text-sm ${weightSum === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                {t('Total weight')}: {weightSum}% {weightSum !== 100 && t('(recommended: 100%)')}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'Notifications' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={settings.notifications.notifyBroker} onChange={e => update('notifications.notifyBroker', e.target.checked)} />
            <label className="font-medium">{t('Notify Assigned Broker / Staff After Match')}</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={settings.notifications.notifyCustomer} onChange={e => update('notifications.notifyCustomer', e.target.checked)} />
            <label className="font-medium">{t('Notify Customer if Matched')}</label>
          </div>
          <div className="space-y-2">
            <div className="font-semibold">{t('Methods')}</div>
            <div className="flex flex-wrap gap-4">
              {[
                { key: 'email', label: 'Email' },
                { key: 'sms', label: 'SMS' },
                { key: 'inApp', label: 'In-App' },
              ].map(m => (
                <label key={m.key} className="flex items-center gap-2">
                  <input type="checkbox" checked={settings.notifications.methods[m.key]} onChange={e => update(`notifications.methods.${m.key}`, e.target.checked)} />
                  <span>{t(m.label)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Workflow & Logs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={settings.workflow.trackHistory} onChange={e => update('workflow.trackHistory', e.target.checked)} />
            <label className="font-medium">{t('Track Matching History')}</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={settings.workflow.showScore} onChange={e => update('workflow.showScore', e.target.checked)} />
            <label className="font-medium">{t('Display Matches & Score %')}</label>
          </div>
          <div className="space-y-2">
            <div className="font-semibold">{t('Manual Override Option')}</div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.workflow.manualOverride.admin} onChange={e => update('workflow.manualOverride.admin', e.target.checked)} />
                <span>{t('Admin')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.workflow.manualOverride.broker} onChange={e => update('workflow.manualOverride.broker', e.target.checked)} />
                <span>{t('Broker')}</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={triggerRunMatching} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">{t('Run Matching')}</button>
            <button onClick={refreshLogs} className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-sm">{t('Refresh Logs')}</button>
            <button onClick={triggerNotify} className="px-3 py-1.5 rounded bg-amber-500 text-white text-sm">{t('Send Notifications')}</button>
          </div>

          <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="font-semibold mb-2">{t('Matching History')}</div>
            {logs.length === 0 ? (
              <div className="text-sm text-gray-500">{t('No matching logs yet.')}</div>
            ) : (
              <div className="space-y-2">
                {logs.map((l, idx) => (
                  <div key={idx} className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{l.entity || 'Item'}</span>
                      <span className="opacity-70">{l.score ? `${l.score}%` : ''}</span>
                    </div>
                    <div className="opacity-70">{l.time || ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-60">
          {saving ? t('Saving...') : t('Save Changes')}
        </button>
        <button onClick={reset} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700">
          {t('Reset to Default')}
        </button>
      </div>

      {toast && (
        <div className={`fixed bottom-4 ${isRTL ? 'left-4' : 'right-4'} px-3 py-2 rounded text-sm shadow ${toast.type === 'error' ? 'bg-red-600 text-white' : toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}