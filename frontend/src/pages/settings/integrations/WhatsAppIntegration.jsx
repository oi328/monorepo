import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plug, FileText } from 'lucide-react';
import WhatsAppConnection from '../../../components/integrations/WhatsAppConnection';
import WhatsAppTemplates from '../../../components/integrations/WhatsAppTemplates';
import { useTheme } from '@shared/context/ThemeProvider'

const WhatsAppIntegration = () => {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('connection'); // connection | templates

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className={`text-2xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>{t('WhatsApp Integration')}</h1>
        <p className={`${isLight ? 'text-black' : 'text-white'} opacity-60`}>
          {t('Manage your WhatsApp Business API connection and message templates')}
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('connection')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
            activeTab === 'connection'
              ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
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
              ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          {t('Templates')}
        </button>
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeTab === 'connection' ? (
          <WhatsAppConnection />
        ) : (
          <WhatsAppTemplates />
        )}
      </div>
    </div>
  );
};

export default WhatsAppIntegration;
