import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function EmployeesReportingStats({ list }) {
  const { t, i18n } = useTranslation();
  const [hideLess, setHideLess] = useState(false);
  const lang = i18n.language || 'en';
  const isRTL = lang === 'ar';

  const data = list || [
    { name: lang === 'ar' ? 'إبراهيم' : 'Ibrahim', reports: 34, successRate: 94, last: lang === 'ar' ? 'اليوم' : 'Today' },
    { name: lang === 'ar' ? 'سارة' : 'Sara', reports: 28, successRate: 90, last: lang === 'ar' ? 'أمس' : 'Yesterday' },
    { name: lang === 'ar' ? 'آدم' : 'Adam', reports: 22, successRate: 87, last: lang === 'ar' ? 'منذ يومين' : '2 days ago' },
    { name: lang === 'ar' ? 'منى' : 'Mona', reports: 12, successRate: 80, last: lang === 'ar' ? 'منذ 3 أيام' : '3 days ago' }
  ];

  const shown = hideLess ? data.filter(d => d.reports >= 20) : data;
  const maxReports = Math.max(...data.map(d => d.reports), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('Employees Reporting')}</h3>
        <button
          type="button"
          onClick={() => setHideLess(v => !v)}
          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-blue-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-blue-800"
        >
          {hideLess ? t('Show All') : t('Hide Less Active')}
        </button>
      </div>

      <div className="w-full hidden md:block overflow-x-auto">
        <table className="min-w-[520px] w-full text-sm nova-table nova-table--glass">
          <thead>
            <tr className="text-gray-600 dark:text-gray-300">
              <th className={`text-left py-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('Employee')}</th>
              <th className={`text-left py-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('Reports per Employee')}</th>
              <th className={`text-left py-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('Success Rate')}</th>
              <th className={`text-left py-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('Last Activity')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((d, idx) => (
              <tr key={idx} className="border-t border-gray-200 dark:border-blue-700">
                <td className="py-2 text-gray-900 dark:text-gray-100">{d.name}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded bg-gray-200 dark:bg-blue-800 overflow-hidden">
                      <div
                        className="h-2 bg-blue-500"
                        style={{ width: `${Math.round((d.reports / maxReports) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs w-8 text-gray-700 dark:text-gray-300">{d.reports}</span>
                  </div>
                </td>
                <td className="py-2">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-16 h-2 rounded bg-gray-200 dark:bg-blue-800 overflow-hidden">
                      <div
                        className="h-2 bg-emerald-500"
                        style={{ width: `${Math.min(d.successRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">{d.successRate}%</span>
                  </div>
                </td>
                <td className="py-2 text-gray-700 dark:text-gray-300">{d.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {shown.map((d, idx) => (
          <div key={idx} className="card glass-card p-4 space-y-3 bg-white/5 border border-gray-800 rounded-lg">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h4 className="font-semibold text-sm">{d.name}</h4>
              <span className="text-xs text-[var(--muted-text)]">{d.last}</span>
            </div>
            <div className="grid grid-cols-1 gap-y-3 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                   <span className="text-[var(--muted-text)]">{t('Reports')}</span>
                   <span>{d.reports}</span>
                </div>
                <div className="h-1.5 rounded bg-gray-200 dark:bg-blue-800 overflow-hidden w-full">
                   <div className="h-full bg-blue-500" style={{ width: `${Math.round((d.reports / maxReports) * 100)}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                   <span className="text-[var(--muted-text)]">{t('Success Rate')}</span>
                   <span>{d.successRate}%</span>
                </div>
                <div className="h-1.5 rounded bg-gray-200 dark:bg-blue-800 overflow-hidden w-full">
                   <div className="h-full bg-emerald-500" style={{ width: `${Math.min(d.successRate, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}