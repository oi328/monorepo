import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import ProfileSettingsPanel from '../../../components/settings/ProfileSettingsPanel'

export default function SettingsProfile() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>
            {t('Profile Settings')}
          </h1>
        </div>
        <ProfileSettingsPanel />
      </div>
    </>
  )
}
