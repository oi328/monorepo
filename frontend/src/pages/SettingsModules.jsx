import { useTranslation } from 'react-i18next'

export default function SettingsModules() {
  const { t } = useTranslation()
  return (
    <Layout>
      <div className="p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            {t('Modules Settings')}
          </h1>
        </div>
        <ModulesSettings />
      </div>
    </Layout>
  )
}