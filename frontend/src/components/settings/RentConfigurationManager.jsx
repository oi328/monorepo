import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'rent.configuration'

function defaultUnit(index = 1) {
  return {
    id: `${Date.now()}-${index}`,
    name: `Unit ${index}`,
    rentPrice: 1000,
    minContractMonths: 12,
    depositAmount: 500,
    autoRenew: true,
    currency: 'USD',
  }
}

function defaultSettings() {
  const units = [defaultUnit(1), defaultUnit(2)]
  return {
    general: {
      enabled: true,
      defaultStatus: 'Active', // Active | Pending | Expired
      defaultCurrency: 'USD',
      paymentTerms: 'Monthly', // Monthly | Quarterly | Yearly
      autoGenerateInvoice: true,
    },
    units: units,
    notifications: {
      customerBeforeDue: { email: true, sms: true, inApp: true },
      adminLatePayment: true,
      beforeExpiry: false,
    },
    workflow: {
      autoUpdateStatus: true,
      trackPaymentHistory: true,
      linkToContract: true,
      linkToSalesOpportunity: true,
    },
  }
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/rent/configuration')
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
    const res = await fetch('/api/rent/configuration', {
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

async function generateInvoice(payload = {}) {
  try {
    const res = await fetch('/api/rent/generate-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) return await res.json()
  } catch {}
  return { status: 'mocked', message: 'Invoice generation simulated.' }
}

async function fetchPaymentHistory() {
  try {
    const res = await fetch('/api/rent/payment-history')
    if (res.ok) return await res.json()
  } catch {}
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('rent.paymentHistory') : null
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

async function sendNotifications(payload = {}) {
  try {
    const res = await fetch('/api/rent/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) return await res.json()
  } catch {}
  return { status: 'mocked', message: 'Notifications simulated.' }
}

export default function RentConfigurationManager() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  const [settings, setSettings] = useState(defaultSettings())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('General')
  const [history, setHistory] = useState([])

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

  const addUnit = () => {
    const next = [...settings.units, defaultUnit(settings.units.length + 1)]
    update('units', next)
  }

  const removeUnit = (id) => {
    const next = settings.units.filter(u => u.id !== id)
    update('units', next)
  }

  const updateUnit = (id, updater) => {
    const next = settings.units.map(u => (u.id === id ? updater({ ...u }) : u))
    update('units', next)
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

  const refreshHistory = async () => {
    const h = await fetchPaymentHistory()
    setHistory(Array.isArray(h) ? h : [])
  }

  const triggerGenerateInvoice = async () => {
    const res = await generateInvoice({ units: settings.units, general: settings.general })
    setToast({ type: 'success', message: t('Invoice generation triggered') })
    setTimeout(() => setToast(null), 1500)
    await refreshHistory()
  }

  const triggerNotify = async () => {
    const res = await sendNotifications({ methods: settings.notifications.customerBeforeDue })
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
        {['General', 'Rent Units / Properties', 'Notifications', 'Workflow & Rules'].map(key => (
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
            <label className="font-medium">{t('Enable Rent Module')}</label>
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium w-56">{t('Default Rent Status')}</label>
            <select
              value={settings.general.defaultStatus}
              onChange={e => update('general.defaultStatus', e.target.value)}
              className="px-2 py-1 rounded bg-[var(--content-bg)] border border-gray-300 dark:border-gray-700"
            >
              {['Active', 'Pending', 'Expired'].map(opt => <option key={opt} value={opt}>{t(opt)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium w-56">{t('Default Currency')}</label>
            <input
              value={settings.general.defaultCurrency}
              onChange={e => update('general.defaultCurrency', e.target.value)}
              className="px-2 py-1 rounded bg-[var(--content-bg)] border border-gray-300 dark:border-gray-700 w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium w-56">{t('Default Payment Terms')}</label>
            <select
              value={settings.general.paymentTerms}
              onChange={e => update('general.paymentTerms', e.target.value)}
              className="px-2 py-1 rounded bg-[var(--content-bg)] border border-gray-300 dark:border-gray-700"
            >
              {['Monthly', 'Quarterly', 'Yearly'].map(opt => <option key={opt} value={opt}>{t(opt)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={settings.general.autoGenerateInvoice} onChange={e => update('general.autoGenerateInvoice', e.target.checked)} />
            <label className="font-medium">{t('Auto-generate Invoice for Rent')}</label>
          </div>
        </div>
      )}

      {tab === 'Rent Units / Properties' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{t('List of Units / Properties')}</div>
            <button onClick={addUnit} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">{t('Add Unit / Property')}</button>
          </div>
          <div className="space-y-3">
            {settings.units.map(u => (
              <div key={u.id} className="rounded border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <label className="w-40">{t('Name / ID')}</label>
                  <input value={u.name} onChange={e => updateUnit(u.id, v => { v.name = e.target.value; return v })} className="input px-2 py-1 rounded bg-[var(--content-bg)] border border-gray-300 dark:border-gray-700 w-full" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-40">{t('Rent Price')}</label>
                  <input type="number" value={u.rentPrice} onChange={e => updateUnit(u.id, v => { v.rentPrice = Number(e.target.value)||0; return v })} className="px-2 py-1 rounded bg-[var(--content-bg)] border border-gray-300 dark:border-gray-700 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-56">{t('Minimum Contract Duration')}</label>
                  <input type="number" value={u.minContractMonths} onChange={e => updateUnit(u.id, v => { v.minContractMonths = Number(e.target.value)||0; return v })} className="px-2 py-1 rounded bg-[var(--content-bg)] border border-gray-300 dark:border-gray-700 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-40">{t('Deposit Amount')}</label>
                  <input type="number" value={u.depositAmount} onChange={e => updateUnit(u.id, v => { v.depositAmount = Number(e.target.value)||0; return v })} className="px-2 py-1 rounded bg-[var(--content-bg)] border border-gray-300 dark:border-gray-700 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-40">{t('Auto-Renew Option')}</label>
                  <input type="checkbox" checked={u.autoRenew} onChange={e => updateUnit(u.id, v => { v.autoRenew = e.target.checked; return v })} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-40">{t('Currency')}</label>
                  <input value={u.currency} onChange={e => updateUnit(u.id, v => { v.currency = e.target.value; return v })} className="px-2 py-1 rounded bg-[var(--content-bg)] border border-gray-300 dark:border-gray-700 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => removeUnit(u.id)} className="px-3 py-1 rounded bg-red-600 text-white text-sm">{t('Remove')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Notifications' && (
        <div className="space-y-4">
          <div className="font-semibold">{t('Notify Customer Before Payment Due')}</div>
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'email', label: 'Email' },
              { key: 'sms', label: 'SMS' },
              { key: 'inApp', label: 'In-App' },
            ].map(m => (
              <label key={m.key} className="flex items-center gap-2">
                <input type="checkbox" checked={settings.notifications.customerBeforeDue[m.key]} onChange={e => update(`notifications.customerBeforeDue.${m.key}`, e.target.checked)} />
                <span>{t(m.label)}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.notifications.adminLatePayment} onChange={e => update('notifications.adminLatePayment', e.target.checked)} />
            <span>{t('Notify Admin / Broker on Late Payment')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.notifications.beforeExpiry} onChange={e => update('notifications.beforeExpiry', e.target.checked)} />
            <span>{t('Notify before Contract Expiry')}</span>
          </label>
        </div>
      )}

      {tab === 'Workflow & Rules' && (
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.workflow.autoUpdateStatus} onChange={e => update('workflow.autoUpdateStatus', e.target.checked)} />
            <span className="font-medium">{t('Auto-Update Rent Status (Active → Expired)')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.workflow.trackPaymentHistory} onChange={e => update('workflow.trackPaymentHistory', e.target.checked)} />
            <span className="font-medium">{t('Track Rent Payment History')}</span>
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.workflow.linkToContract} onChange={e => update('workflow.linkToContract', e.target.checked)} />
              <span>{t('Link Rent to Contract')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.workflow.linkToSalesOpportunity} onChange={e => update('workflow.linkToSalesOpportunity', e.target.checked)} />
              <span>{t('Link to Sales Opportunity')}</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={triggerGenerateInvoice} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">{t('Generate Invoice')}</button>
            <button onClick={refreshHistory} className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-sm">{t('Refresh Payment History')}</button>
            <button onClick={triggerNotify} className="px-3 py-1.5 rounded bg-amber-500 text-white text-sm">{t('Send Notifications')}</button>
          </div>

          <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="font-semibold mb-2">{t('Payment History')}</div>
            {history.length === 0 ? (
              <div className="text-sm text-gray-500">{t('No payment history yet.')}</div>
            ) : (
              <div className="space-y-2">
                {history.map((h, idx) => (
                  <div key={idx} className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{h.contract || 'Contract'}</span>
                      <span className="opacity-70">{h.amount ? `${h.amount} ${h.currency || settings.general.defaultCurrency}` : ''}</span>
                    </div>
                    <div className="opacity-70">{h.time || ''}</div>
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