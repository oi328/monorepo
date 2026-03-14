import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { playNotificationSound } from '../../../hooks/useNotifications'
import { Mail, MessageCircle, Bell, Volume2 } from 'lucide-react'
import Toggle from '../../../shared/components/Toggle'

export default function ProfileNotificationSettings({
  notifEmail,
  setNotifEmail,
  notifSms,
  setNotifSms,
  notifApp,
  setNotifApp,
  notifMonthly,
  setNotifMonthly,
  notifNewDevice,
  setNotifNewDevice,
}) {
  const { t } = useTranslation()
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('notificationsSettings')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed.soundEnabled === 'boolean') {
          setSoundEnabled(parsed.soundEnabled)
        }
      }
    } catch {}
  }, [])

  const handleSoundChange = (val) => {
    setSoundEnabled(val)
    try {
      const raw = localStorage.getItem('notificationsSettings')
      let parsed = {}
      if (raw) {
        parsed = JSON.parse(raw) || {}
      }
      parsed.soundEnabled = val
      localStorage.setItem('notificationsSettings', JSON.stringify(parsed))
    } catch {}
  }

  return (
    <div className="space-y-6 max-w-4xl w-full mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-theme-text">
                {t('Email Notifications')}
              </div>
              <div className="text-xs text-[var(--muted-text)]">
                {t('Important updates to your inbox.')}
              </div>
            </div>
          </div>
          <Toggle
            label={t('Enable email notifications')}
            value={notifEmail}
            onChange={setNotifEmail}
          />

        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-theme-text">
                {t('SMS Notifications')}
              </div>
              <div className="text-xs text-[var(--muted-text)]">
                {t('Time‑sensitive alerts to your phone.')}
              </div>
            </div>
          </div>
          <Toggle
            label={t('Enable SMS notifications')}
            value={notifSms}
            onChange={setNotifSms}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent p-4 space-y-4">
          <div className="flex items-start gap-2">
            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-theme-text">
                {t('App Notifications')}
              </div>
              <div className="text-xs text-[var(--muted-text)]">
                {t('In‑app alerts while you are working.')}
              </div>
            </div>
          </div>
          <Toggle
            label={t('Enable app notifications')}
            value={notifApp}
            onChange={setNotifApp}
          />
          <Toggle
            label={t('New device alerts')}
            value={notifNewDevice}
            onChange={setNotifNewDevice}
          />
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Toggle
                label={t('Notification Sound')}
                value={soundEnabled}
                onChange={handleSoundChange}
              />
            </div>
            {soundEnabled && (
              <button
                type="button"
                onClick={() => playNotificationSound()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                title={t('Test notification sound')}
              >
                <Volume2 className="w-3.5 h-3.5" />
                {t('Test')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
