import { useTheme } from '@shared/context/ThemeProvider'
import { useTranslation } from 'react-i18next'

const MobileSidebarToggle = ({ isOpen, onToggle }) => {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`mobile-sidebar-toggle ${isOpen ? 'sidebar-open' : ''} ${
        isLight 
          ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500' 
          : 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
      }`}
      aria-label={t('Toggle sidebar')}
      title={t('Toggle sidebar')}
    >
      {isOpen ? (
        // Close icon (X)
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      ) : (
        // Menu icon (hamburger)
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      )}
    </button>
  )
}

export default MobileSidebarToggle
