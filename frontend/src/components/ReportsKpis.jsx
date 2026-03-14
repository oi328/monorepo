import { useTranslation } from 'react-i18next';

export default function ReportsKpis({ data }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const isRTL = lang === 'ar';

  const stats = data || {
    generated: 128,
    scheduled: 42,
    failed: 5,
    avgMinutes: 2.4,
    types: [
      { label: t('PDF'), value: 62, color: '#3b82f6' },
      { label: t('Excel'), value: 44, color: '#22c55e' },
      { label: t('Email'), value: 22, color: '#f59e0b' }
    ]
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('Reports KPIs')}</h3>
        <span className="text-xs text-gray-500 dark:text-gray-300">{t('Dashboard Overview')}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { key: 'generated', title: t('Generated Reports'), value: stats.generated, accent: 'bg-blue-500' },
          { key: 'scheduled', title: t('Scheduled Reports'), value: stats.scheduled, accent: 'bg-emerald-500' },
          { key: 'failed', title: t('Failed Reports'), value: stats.failed, accent: 'bg-red-500' },
          { key: 'avgMinutes', title: t('Avg Generation Time'), value: `${stats.avgMinutes} ${t('Minutes')}`, accent: 'bg-indigo-500' }
        ].map((k) => (
          <div key={k.key} className="p-3 rounded-lg border border-gray-200 dark:border-blue-700 bg-white dark:bg-blue-900/30">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-6 rounded ${k.accent}`} />
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{k.title}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{k.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-2">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t('Report Types')}</h4>
      </div>
      <div className="space-y-2">
        {stats.types.map((tItem, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-16">{tItem.label}</span>
            <div className="flex-1 h-2 rounded bg-gray-200 dark:bg-blue-800 overflow-hidden">
              <div
                className="h-2"
                style={{ width: `${Math.min(100, tItem.value)}%`, backgroundColor: tItem.color }}
              />
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300 w-10 text-right">{tItem.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}