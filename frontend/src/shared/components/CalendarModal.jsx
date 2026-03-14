import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import CalendarWidget from './CalendarWidget'

export default function CalendarModal({ open, onClose, tone }) {
  const { i18n } = useTranslation()
  const { theme } = useTheme()
  const effectiveTone = tone || theme || 'light'
  const isLight = effectiveTone === 'light'

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10">
        {/* Close Button */}
        <button
          className={`absolute top-4 ${i18n.language === 'ar' ? 'left-4' : 'right-4'} z-20 p-2 rounded-md transition-colors ${
            isLight ? 'bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 shadow-sm' : 'bg-gray-800/80 hover:bg-gray-800 text-gray-400 hover:text-gray-200 shadow-sm'
          }`}
          onClick={onClose}
          aria-label="Close calendar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Calendar Widget */}
        <CalendarWidget tone={effectiveTone} />
      </div>
    </div>
  )
}
