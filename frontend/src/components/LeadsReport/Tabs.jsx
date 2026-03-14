import { useTranslation } from 'react-i18next'

const Tabs = ({ activeTab, setActiveTab }) => {
  const { i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  
  const tabs = [
    { key: 'actions', label: isRTL ? 'إجراءات المبيعات' : 'Sales Actions' },
    { key: 'leads', label: isRTL ? 'العملاء المحتملين' : 'Sales Leads' }
  ]
  
  return (
    <div className="flex gap-2 border-b border-gray-800">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`px-3 py-2 rounded-t-md border-b-2 transition-colors ${
            activeTab === tab.key
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-transparent hover:border-gray-600'
          }`}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default Tabs