import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@utils/api'
import { useAppState } from '@shared/context/AppStateProvider'
import { Toggle } from '../../shared/components'

const DEFAULTS = {
  requestApprovals: false,
  duplicationSystem: true,
  allowDuplicateProjects: false,
  allowDuplicateProperties: false,
  allowCustomerPaymentPlan: true,
  showBroker: true,
  showDeveloper: true,
  showColdCallsStage: true,
  showMobileNumber: false,
  startUnitCode: '0001',
  startCustomerCode: '0001',
  startInvoiceCode: '0001',
  startOrderCode: '0001',
  startQuotationCode: '0001',
  allowConvertToCustomers: true,
  enableTwoFactorAuth: false,
  defaultCountryCode: 'EG',
  defaultCurrency: 'EGP',
  timeZone: 'Africa/Cairo',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  numberFormat: '1,234.56',
  animations: true,
  sidebarCollapsible: true,
  allowTimeline: true,
  allowCallLog: true,
  reservationHoldHours: '', // empty = lifetime (no auto-expiry)
}

function Section({ title, children }) {
  return (
    <div className="glass-panel rounded-2xl p-4 md:p-6 overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
        <h3 className="text-lg font-semibold text-theme-text">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function CRMSettings() {
  const { t, i18n } = useTranslation()
  const { setCrmSettings } = useAppState()
  const isRTL = String(i18n.language || '').startsWith('ar')
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      try {
        const res = await api.get('/api/crm-settings')
        const s = res?.data?.settings
        if (s && typeof s === 'object') {
          const patched = { ...s }
          if (patched.reservationHoldHours === null || patched.reservationHoldHours === undefined) {
            patched.reservationHoldHours = ''
          }
          setSettings(prev => ({ ...prev, ...patched }))
        }
      } catch (_) {}
      setLoading(false)
    }
    fetchSettings()
  }, [])

  const setField = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))
  const save = async () => {
    try {
      const payload = { ...settings }
      const rawHold = String(payload.reservationHoldHours ?? '').trim()
      if (!rawHold) {
        payload.reservationHoldHours = null
      } else {
        const n = Number(rawHold)
        payload.reservationHoldHours = Number.isFinite(n) && n > 0 ? n : null
      }

      const res = await api.put('/api/crm-settings', { settings: payload })
      const s = res?.data?.settings || settings
      setCrmSettings(s)
      const msg = isRTL ? 'تم تنفيذ التغييرات' : 'Changes applied'
      const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: msg } })
      window.dispatchEvent(evt)
    } catch (err) {
      const msg = isRTL ? 'فشل حفظ الإعدادات' : 'Failed to save settings'
      const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: msg } })
      window.dispatchEvent(evt)
    }
  }
  const reset = async () => {
    setSettings(DEFAULTS)
    try {
      await api.put('/api/crm-settings', { settings: DEFAULTS })
    } catch (_) {}
  }

  const countries = [
    { code: 'EG', name: 'Egypt' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'AE', name: 'United Arab Emirates' },
  ]
  const currencies = ['EGP', 'SAR', 'AED', 'USD']
  const timeZones = ['Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'UTC']
  const dateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
  const timeFormats = ['24h', '12h']
  const numberFormats = ['1,234.56', '1.234,56']

  return (
    <div className="space-y-6">
      <Section title={t('Requests & Duplication')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Toggle label={t('Requests Approvals')} value={settings.requestApprovals} onChange={v => setField('requestApprovals', v)} />
          <Toggle label={t('Enable Duplication System')} value={settings.duplicationSystem} onChange={v => setField('duplicationSystem', v)} />
          <Toggle label={t('Allow Duplicate Projects')} value={settings.allowDuplicateProjects} onChange={v => setField('allowDuplicateProjects', v)} />
          <Toggle label={t('Allow Duplicate Properties')} value={settings.allowDuplicateProperties} onChange={v => setField('allowDuplicateProperties', v)} />
          <Toggle label={t('Allow Add Payment Plan (Customer)')} value={settings.allowCustomerPaymentPlan} onChange={v => setField('allowCustomerPaymentPlan', v)} />
        </div>
      </Section>

      <Section title={t('Reservations')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-theme">
            <label className="block text-sm font-medium text-theme-text mb-2">{t('Reservation Hold (Hours)')}</label>
            <input
              type="number"
              min="1"
              value={settings.reservationHoldHours}
              onChange={e => setField('reservationHoldHours', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-theme-text placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder={t('Lifetime')}
              inputMode="numeric"
            />
            <div className="text-xs text-[var(--muted-text)] mt-2">
              {t('Leave empty to make reservations lifetime (no auto-expiry).')}
            </div>
          </div>
        </div>
      </Section>
       

      <Section title={t('Visibility & Pipeline')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Toggle label={t('Show Broker')} value={settings.showBroker} onChange={v => setField('showBroker', v)} />
          <Toggle label={t('Show Developer')} value={settings.showDeveloper} onChange={v => setField('showDeveloper', v)} />
          <Toggle label={t('Show Cold Calls Stage (Pipeline)')} value={settings.showColdCallsStage} onChange={v => setField('showColdCallsStage', v)} />
          <Toggle label={t('Mobile Number (Lead Management)')} value={settings.showMobileNumber} onChange={v => setField('showMobileNumber', v)} />
        </div>
      </Section>

      <Section title={t('Conversions & Codes')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-theme">
            <label className="block text-sm font-medium text-theme-text mb-2">{t('Start Unit Code (Properties)')}</label>
            <input
              type="text"
              value={settings.startUnitCode}
              onChange={e => setField('startUnitCode', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-theme-text placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="0001"
              inputMode="numeric"
            />
          </div>
          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-theme">
            <label className="block text-sm font-medium text-theme-text mb-2">{t('Start Customer Code')}</label>
            <input
              type="text"
              value={settings.startCustomerCode}
              onChange={e => setField('startCustomerCode', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-theme-text placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="0001"
              inputMode="numeric"
            />
          </div>
          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-theme">
            <label className="block text-sm font-medium text-theme-text mb-2">{t('Start Invoice Code')}</label>
            <input
              type="text"
              value={settings.startInvoiceCode}
              onChange={e => setField('startInvoiceCode', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-theme-text placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="0001"
              inputMode="numeric"
            />
          </div>
          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-theme">
            <label className="block text-sm font-medium text-theme-text mb-2">{t('Start Sales Order Code')}</label>
            <input
              type="text"
              value={settings.startOrderCode}
              onChange={e => setField('startOrderCode', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-theme-text placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="0001"
              inputMode="numeric"
            />
          </div>
          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-theme">
            <label className="block text-sm font-medium text-theme-text mb-2">{t('Start Quotation Code')}</label>
            <input
              type="text"
              value={settings.startQuotationCode}
              onChange={e => setField('startQuotationCode', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-theme-text placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="0001"
              inputMode="numeric"
            />
          </div>
          <Toggle label={t('Allow Convert to Customers')} value={settings.allowConvertToCustomers} onChange={v => setField('allowConvertToCustomers', v)} />
        </div>
      </Section>

      <Section title={t('Defaults')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-text">{t('Default Country Code')}</label>
            <select
              value={settings.defaultCountryCode}
              onChange={e => setField('defaultCountryCode', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-theme-text focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-text">{t('Default Currency')}</label>
            <select
              value={settings.defaultCurrency}
              onChange={e => setField('defaultCurrency', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-theme-text focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              {currencies.map(cur => <option key={cur} value={cur}>{cur}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-text">{t('Time Zone')}</label>
            <select
              value={settings.timeZone}
              onChange={e => setField('timeZone', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-theme-text focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              {timeZones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-text">{t('Date Format')}</label>
            <select
              value={settings.dateFormat}
              onChange={e => setField('dateFormat', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-theme-text focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              {dateFormats.map(df => <option key={df} value={df}>{df}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-text">{t('Time Format')}</label>
            <select
              value={settings.timeFormat}
              onChange={e => setField('timeFormat', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-theme-text focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              {timeFormats.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-text">{t('Number Format')}</label>
            <select
              value={settings.numberFormat}
              onChange={e => setField('numberFormat', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-theme-text focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              {numberFormats.map(nf => <option key={nf} value={nf}>{nf}</option>)}
            </select>
          </div>
          <Toggle label={t('Enable Animations')} value={settings.animations} onChange={v => setField('animations', v)} />
          <Toggle label={t('Sidebar Collapsed')} value={settings.sidebarCollapsible} onChange={v => setField('sidebarCollapsible', v)} />
          <Toggle label={t('Enable Two-Factor Authentications')} value={settings.enableTwoFactorAuth} onChange={v => setField('enableTwoFactorAuth', v)} />
        </div>
      </Section>

      <Section title={t('Other')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Toggle label={t('Allow Timeline')} value={settings.allowTimeline} onChange={v => setField('allowTimeline', v)} disabled hint={t('Coming Soon')} />
          <Toggle label={t('Allow Call Log')} value={settings.allowCallLog} onChange={v => setField('allowCallLog', v)} disabled hint={t('Coming Soon')} />
          <Toggle label={t('Allow Chatbot')} value={settings.allowChatbot} onChange={v => setField('allowChatbot', v)} disabled hint={t('Coming Soon')} />

        </div>
      </Section>

      <div className="flex flex-wrap justify-between items-center gap-3">

        <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-black rounded-xl transition-all font-medium" onClick={reset}>
          {t('Reset to Default')}
        </button>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all font-medium" onClick={save}>
          {t('Save Changes')}
        </button>
      </div>
    </div>
  )
}
