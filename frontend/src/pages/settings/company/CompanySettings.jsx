import { useTranslation } from 'react-i18next'
import CompanySettings from '../../../components/settings/CompanySettings'
import { useTheme } from '@shared/context/ThemeProvider'

export default function SettingsCompany() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { t } = useTranslation()
  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
          <h1 className={`text-2xl ${isLight ? 'text-black' : 'text-white'} sm:text-3xl font-bold`}>
            {t('Company Details')}
          </h1>
        </div>
        <CompanySettings />
      </div>
    </>
  )
}
