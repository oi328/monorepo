import { useTranslation } from 'react-i18next'

export default function SettingsRestUnit() {
  const { t } = useTranslation()
  return (
    <Layout title={t('Rest Unit Settings')}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('Rest Unit Settings')}</h2>
          <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">{t('Admin Only')}</span>
        </div>
        <p className="text-gray-600 dark:text-gray-300">{t('Configure rest durations, scheduling rules, notifications, and reporting.')}</p>

        <RestUnitSettingsManager />
      </div>
    </Layout>
  )
}