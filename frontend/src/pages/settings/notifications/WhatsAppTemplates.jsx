import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'

export default function WhatsAppTemplates() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  return (
    <div className="w-full p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>{t('WhatsApp Templates')}</h1>
      </div>
      <div className="glass-panel rounded-2xl p-6">
        <p className="text-sm text-gray-500">{t('Manage WhatsApp template content.')}</p>
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg">
          {t('WhatsApp integration must be active to configure templates.')}
        </div>
      </div>
    </div>
  )
}
