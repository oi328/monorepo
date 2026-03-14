import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@shared/context/ThemeProvider'

export default function SettingsEmail() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('templates')

  const handleSave = () => window.dispatchEvent(new Event('save-email-settings'))
  const handleTestEmail = () => window.dispatchEvent(new Event('test-email-settings'))
  const handleReset = () => window.dispatchEvent(new Event('reset-email-settings'))

  return (
    <div className="w-full">
      <div className="flex  sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className={`text-2xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>{t('Email Settings')}</h1>
        
        
      </div>

      <div className="mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`py-2 px-4 font-medium text-sm transition-colors relative ${
              activeTab === 'templates' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('templates')}
          >
            {t('Email Templates')}
            {activeTab === 'templates' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm transition-colors relative ${
              activeTab === 'settings' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('settings')}
          >
            {t('SMTP Settings')}
            {activeTab === 'settings' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>
      </div>

      <div className="p-1">
        {activeTab === 'templates' ? (
          <EmailTemplatesList />
        ) : (
          <EmailSettings />
        )}
      </div>
    </div>
  )
}
