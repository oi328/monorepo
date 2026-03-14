import { useTranslation } from 'react-i18next'

export default function SettingsSocialMedia() {
  const { t } = useTranslation()
  const handleSave = () => {
    const ev = new Event('save-social-settings')
    window.dispatchEvent(ev)
  }
  const handleRefreshAll = () => {
    const ev = new Event('refresh-all-social-tokens')
    window.dispatchEvent(ev)
  }
  return (
    <Layout title={t('Social Media Settings')}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t('Social Media Settings')}</h2>
          <div className="flex items-center gap-2">
            <button className="btn btn-glass btn-sm" onClick={handleRefreshAll}>{t('Refresh All Tokens')}</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>{t('Save Changes')}</button>
            <a href="#logs" className="btn btn-glass btn-sm">{t('View Activity Logs')}</a>
          </div>
        </div>
        <SocialMediaSettings />
      </div>
    </Layout>
  )
}