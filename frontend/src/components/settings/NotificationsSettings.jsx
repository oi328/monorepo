import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const Toggle = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-transparent border border-gray-200 dark:border-gray-700">
    <div className="space-y-1">
      <h4 className="font-medium text-theme-text">{label}</h4>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
    </label>
  </div>
)

const Section = ({ title, children }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-theme-text border-b border-gray-200 dark:border-gray-700 pb-2">{title}</h3>
    <div className="space-y-3">
      {children}
    </div>
  </div>
)

export default function NotificationsSettings() {
  const { t } = useTranslation()

  // State
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    marketingEmails: true,
    securityAlerts: true,
    newDeviceLogin: true,
    weeklyDigest: false,
    soundEnabled: true
  })

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notificationsSettings')
      if (saved) {
        setSettings(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Failed to load notification settings', e)
    }
  }, [])

  // Save to localStorage
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('notificationsSettings', JSON.stringify(newSettings))
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="grid gap-8">
        <Section title={t('General Notifications')}>
          <Toggle 
            label={t('Email Notifications')} 
            description={t('Receive emails about your account activity')}
            checked={settings.emailNotifications}
            onChange={(v) => updateSetting('emailNotifications', v)}
          />
          <Toggle 
            label={t('Push Notifications')} 
            description={t('Receive push notifications on your device')}
            checked={settings.pushNotifications}
            onChange={(v) => updateSetting('pushNotifications', v)}
          />
          <Toggle 
            label={t('SMS Notifications')} 
            description={t('Receive text messages for urgent updates')}
            checked={settings.smsNotifications}
            onChange={(v) => updateSetting('smsNotifications', v)}
          />
        </Section>

        <Section title={t('Marketing & Updates')}>
          <Toggle 
            label={t('Marketing Emails')} 
            description={t('Receive news, updates, and special offers')}
            checked={settings.marketingEmails}
            onChange={(v) => updateSetting('marketingEmails', v)}
          />
          <Toggle 
            label={t('Weekly Digest')} 
            description={t('Get a weekly summary of your activity')}
            checked={settings.weeklyDigest}
            onChange={(v) => updateSetting('weeklyDigest', v)}
          />
        </Section>

        <Section title={t('Security')}>
          <Toggle 
            label={t('Security Alerts')} 
            description={t('Get notified about suspicious activity')}
            checked={settings.securityAlerts}
            onChange={(v) => updateSetting('securityAlerts', v)}
          />
          <Toggle 
            label={t('New Device Login')} 
            description={t('Get notified when a new device logs in')}
            checked={settings.newDeviceLogin}
            onChange={(v) => updateSetting('newDeviceLogin', v)}
          />
        </Section>

        <Section title={t('Preferences')}>
          <Toggle 
            label={t('Notification Sound')} 
            description={t('Play a sound when receiving notifications')}
            checked={settings.soundEnabled}
            onChange={(v) => updateSetting('soundEnabled', v)}
          />
        </Section>
      </div>
    </div>
  )
}
