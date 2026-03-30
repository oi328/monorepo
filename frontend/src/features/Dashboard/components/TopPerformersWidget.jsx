import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/context/ThemeProvider';
import { api } from '../../../utils/api';
import { Loader2, Crown, Activity, User, Star } from 'lucide-react';

export default function TopPerformersWidget() {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const isRTL = i18n.dir() === 'rtl';
  const _lintKeep = { t };

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today'); // Default to today

  const toLocalYmd = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    const pad2 = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {};
        const now = new Date();

        if (period === 'today') {
          params.date_from = toLocalYmd(now);
          params.date_to = toLocalYmd(now);
        } else if (period === 'week') {
          // Week range: Saturday -> Friday (local timezone)
          // JS getDay(): 0=Sun ... 6=Sat
          const day = now.getDay();
          const daysSinceSaturday = (day - 6 + 7) % 7;
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - daysSinceSaturday);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6); // Friday
          params.date_from = toLocalYmd(startOfWeek);
          params.date_to = toLocalYmd(endOfWeek);
        } else if (period === 'month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          params.date_from = toLocalYmd(startOfMonth);
          // End of month
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          params.date_to = toLocalYmd(endOfMonth);
        } else if (period === 'all') {
          params.period = 'all';
        }

        const response = await api.get('/api/dashboard/top-users', { params });
        setData(response.data || []);
      } catch (error) {
        console.error('Failed to fetch top performers', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const periods = [
    { value: 'today', label: isRTL ? 'اليوم' : 'Today' },
    { value: 'week', label: isRTL ? 'أسبوع' : 'Week' },
    { value: 'month', label: isRTL ? 'شهر' : 'Month' },
    { value: 'all', label: isRTL ? 'الكل' : 'All' },
  ];

  return (
    <div
      className={`rounded-xl shadow-lg border overflow-hidden h-full flex flex-col ${
        isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700'
      }`}
    >
      {/* Header */}
      <div
        className={`p-4 border-b flex flex-col gap-3 ${
          isLight ? 'bg-white border-gray-100' : 'bg-gray-800/50 border-gray-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <div>
            <h3 className={`font-bold text-lg ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {isRTL ? 'الأفضل' : 'The Best'}
            </h3>
          </div>
        </div>

        <div className={`flex items-center w-full p-1 rounded-lg ${isLight ? 'bg-gray-100' : 'bg-gray-800'}`}>
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                period === p.value
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
            <Activity className="w-10 h-10 opacity-20" />
            <span className="text-sm">{isRTL ? 'لا توجد بيانات' : 'No data available'}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((user, index) => (
              <div
                key={user.user_id}
                className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                  index === 0
                    ? (isLight
                        ? 'bg-amber-50 border border-amber-100 shadow-sm'
                        : 'bg-amber-900/10 border border-amber-500/20')
                    : (isLight
                        ? 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                        : 'bg-gray-800/40 border border-gray-700 hover:bg-gray-800/60')
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shadow-sm ${
                      index === 0
                        ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-white'
                        : index === 1
                          ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
                          : index === 2
                            ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white'
                            : (isLight
                                ? 'bg-white text-gray-600 border border-gray-200'
                                : 'bg-gray-700 text-gray-300 border border-gray-600')
                    }`}
                  >
                    {index === 0 ? <Crown className="w-5 h-5 fill-current" /> : index + 1}
                  </div>

                  {/* User Info */}
                  <div>
                    <h4 className={`font-semibold text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      {user.name}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <User className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{user.email || 'No Email'}</span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-lg font-bold ${
                        index === 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : (isLight ? 'text-gray-900' : 'text-white')
                      }`}
                    >
                      {user.total_actions}
                    </span>
                    <Star
                      className={`w-4 h-4 ${
                        index === 0
                          ? 'fill-amber-500 text-amber-500'
                          : 'fill-yellow-400 text-yellow-400'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                    {isRTL ? 'إجراء' : 'Actions'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

