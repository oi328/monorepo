import { useTranslation } from 'react-i18next'

export default function Sources({ sources, onEdit, onDelete }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
        <div className="glass-panel rounded-2xl p-4 md:p-6 overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-theme-text">{t('Sources List')}</h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-gray-50/80 dark:bg-gray-800/80 text-gray-500 font-medium backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap w-16">{t('No.')}</th>
                            <th className="px-4 py-3 whitespace-nowrap">{t('Name')}</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700  dark:bg-gray-900/50">
                        {sources && sources.map((source, index) => (
                            <tr key={source.id} className="hover:bg-blue-900/50  transition-colors">
                                <td className="px-4 py-3 text-theme-text font-medium">{index + 1}</td>
                                <td className="px-4 py-3 text-theme-text font-medium">{source.name}</td>
                                <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => onEdit && onEdit(source)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" 
                                        title={t('Edit')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                    </button>
                                    <button 
                                        onClick={() => onDelete && onDelete(source.id)}
                                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" 
                                        title={t('Delete')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  )
}
