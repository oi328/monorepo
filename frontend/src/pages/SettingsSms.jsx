import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import { Plug, FileText } from 'lucide-react'
import SmsConnection from '../components/integrations/SmsConnection'
import SmsTemplates from '../components/settings/SmsTemplates'

export default function SettingsSms() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [activeTab, setActiveTab] = useState('connection')

  return (
   
      <div className="p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-6">
        <div className="flex flex-col gap-2">
           <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
            <h1 className={`text-3xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>
              {t('SMS Settings')}
            </h1>
          </div>
          <p className={`${isLight ? 'text-black' : 'text-white'} opacity-60 ml-4`}>
            {t('Manage your SMS provider connection and message templates')}
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
            <button
            onClick={() => setActiveTab('connection')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'connection'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            >
            <Plug className="w-4 h-4" />
            {t('Connection')}
            </button>
            <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'templates'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            >
            <FileText className="w-4 h-4" />
            {t('Templates')}
            </button>
        </div>

        {/* Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {activeTab === 'connection' ? <SmsConnection /> : <SmsTemplates />}
        </div>
      </div>
   
  )
}
