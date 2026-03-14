import { useTranslation } from 'react-i18next';

export const LeadsTrendChart = ({ dateRange = 'last6months' }) => {
  const { t } = useTranslation();

  // Sample trend data based on date range
  const getTrendData = () => {
    const baseData = {
      last6months: [
        { month: 'Jul 2024', leads: 1250, conversions: 280 },
        { month: 'Aug 2024', leads: 1380, conversions: 320 },
        { month: 'Sep 2024', leads: 1420, conversions: 350 },
        { month: 'Oct 2024', leads: 1580, conversions: 390 },
        { month: 'Nov 2024', leads: 1650, conversions: 420 },
        { month: 'Dec 2024', leads: 1750, conversions: 450 }
      ],
      last12months: [
        { month: 'Jan 2024', leads: 980, conversions: 200 },
        { month: 'Feb 2024', leads: 1050, conversions: 220 },
        { month: 'Mar 2024', leads: 1120, conversions: 240 },
        { month: 'Apr 2024', leads: 1180, conversions: 250 },
        { month: 'May 2024', leads: 1200, conversions: 260 },
        { month: 'Jun 2024', leads: 1220, conversions: 270 },
        { month: 'Jul 2024', leads: 1250, conversions: 280 },
        { month: 'Aug 2024', leads: 1380, conversions: 320 },
        { month: 'Sep 2024', leads: 1420, conversions: 350 },
        { month: 'Oct 2024', leads: 1580, conversions: 390 },
        { month: 'Nov 2024', leads: 1650, conversions: 420 },
        { month: 'Dec 2024', leads: 1750, conversions: 450 }
      ]
    };
    return baseData[dateRange] || baseData.last6months;
  };

  const data = getTrendData();
  const maxLeads = Math.max(...data.map(d => d.leads));
  const maxConversions = Math.max(...data.map(d => d.conversions));

  const getLeadsHeight = (value) => (value / maxLeads) * 200;
  const getConversionsHeight = (value) => (value / maxConversions) * 200;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text">
          {t('Leads Trend Analysis')}
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">{t('Total Leads')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">{t('Conversions')}</span>
          </div>
        </div>
      </div>

      <div className="relative h-64 mb-4">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="border-t border-gray-200 dark:border-gray-600 opacity-30"></div>
          ))}
        </div>

        {/* Chart content */}
        <div className="relative h-full flex items-end justify-between px-2">
          {data.map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-2 flex-1">
              {/* Bars */}
              <div className="flex items-end gap-1 h-48">
                {/* Leads bar */}
                <div 
                  className="bg-blue-500 w-4 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${getLeadsHeight(item.leads)}px` }}
                  title={`${t('Leads')}: ${item.leads.toLocaleString()}`}
                ></div>
                {/* Conversions bar */}
                <div 
                  className="bg-green-500 w-4 rounded-t transition-all duration-300 hover:bg-green-600"
                  style={{ height: `${getConversionsHeight(item.conversions)}px` }}
                  title={`${t('Conversions')}: ${item.conversions.toLocaleString()}`}
                ></div>
              </div>
              
              {/* Month label */}
              <span className="text-xs text-gray-600 dark:text-gray-400 transform -rotate-45 origin-center whitespace-nowrap">
                {item.month}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.reduce((sum, item) => sum + item.leads, 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('Total Leads')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.reduce((sum, item) => sum + item.conversions, 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('Total Conversions')}</p>
        </div>
      </div>
    </div>
  );
};