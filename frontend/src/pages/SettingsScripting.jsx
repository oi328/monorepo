import { useTranslation } from 'react-i18next'

export default function SettingsScripting() {
  const { t } = useTranslation()
  const openAddModal = () => {
    window.dispatchEvent(new Event('open-add-script-modal'))
  }

  return (
    <Layout>
      <div className="p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {t('Scripting Settings')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('Manage custom scripts and logic that control system behavior dynamically.')}
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={openAddModal}>
            {t('Add New Script')}
          </button>
        </div>

        {/* Scripts Manager */}
        <ScriptingScriptsManager />
      </div>
    </Layout>
  )
}