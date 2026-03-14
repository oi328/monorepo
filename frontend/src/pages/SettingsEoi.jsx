import { useTranslation } from 'react-i18next'

export default function SettingsEoi() {
  const { t } = useTranslation()
  return (
    <Layout title={t('EOI Settings')}>
      <div className="p-4 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t('EOI Settings')}</h2>
            <p className="text-gray-600 dark:text-gray-300">
              {t('Manage Expression of Interest and integration with CIL & Sales modules.')}
            </p>
          </div>
          <div className="text-xs text-[var(--muted-text)] bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{t('Admin Only')}</div>
        </div>
        <EoiSettingsManager />
      </div>
    </Layout>
  )
}