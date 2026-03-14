import { useTranslation } from 'react-i18next'

export default function Country({ countries, onEdit, onDelete, onToggleStatus }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-3 md:p-6 overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-theme-text dark:text-white">{t('Country List')}</h3>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/80 dark:bg-gray-800/80 text-gray-500 font-medium backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap w-12 md:w-16 hidden sm:table-cell">{t('No.')}</th>
                <th className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap">{t('Country Name Eng')}</th>
                <th className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap">{t('Country Name Arabic')}</th>
                <th className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap">{t('Status')}</th>
                <th className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 ">
              {countries && countries.map((country, index) => (
                <tr key={country.id} className="hover:bg-blue-900/50  transition-colors">
                  <td className="px-3 py-2 md:px-4 md:py-3 text-theme-text font-medium hidden sm:table-cell">{index + 1}</td>
                  <td className="px-3 py-2 md:px-4 md:py-3 text-theme-text font-medium">{country.nameEn}</td>
                  <td className="px-3 py-2 md:px-4 md:py-3 text-theme-text font-medium">{country.nameAr}</td>
                  <td className="px-3 py-2 md:px-4 md:py-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={country.status}
                        onChange={() => onToggleStatus && onToggleStatus(country.id)}
                      />
                      <div className="w-9 h-5 md:w-11 md:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 md:after:h-5 md:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-3 py-2 md:px-4 md:py-3 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onEdit && onEdit(country)}
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors" 
                      title={t('Edit')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button 
                      onClick={() => onDelete && onDelete(country.id)}
                      className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 rounded-lg transition-colors" 
                      title={t('Delete')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {countries && countries.map((country) => (
            <div key={country.id} className="card dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-semibold text-theme-text dark:text-white">{country.nameEn}</h4>
                  <p className="text-sm text-theme-text">{country.nameAr}</p>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                      onClick={() => onEdit && onEdit(country)}
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors" 
                      title={t('Edit')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button 
                      onClick={() => onDelete && onDelete(country.id)}
                      className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 rounded-lg transition-colors" 
                      title={t('Delete')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-sm text-theme-text">{t('Status')}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={country.status}
                    onChange={() => onToggleStatus && onToggleStatus(country.id)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
