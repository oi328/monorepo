import { useTheme } from '@shared/context/ThemeProvider';

export const LeadsStatsCard = ({ title, value, change, changeType, icon, color, compact = false }) => {
  const { theme, resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  
  const getChangeColor = () => {
    if (changeType === 'positive') return 'text-green-600 dark:text-green-400';
    if (changeType === 'negative') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getChangeIcon = () => {
    if (changeType === 'positive') return '↗';
    if (changeType === 'negative') return '↘';
    return '→';
  };

  return (
    <div className={`relative bg-transparent ${compact ? 'p-2' : 'p-3'} rounded-lg shadow-none border-none h-full flex flex-col justify-between`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-0.5' : 'mb-1.5'}`}>
        <div className={`rounded-lg ${compact ? 'p-1' : 'p-1.5'} ${color}`}>
          <span className={`text-white ${compact ? 'text-sm' : 'text-base'}`}>{icon}</span>
        </div>
        <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium ${getChangeColor()}`}>
          {getChangeIcon()} {change}
        </div>
      </div>
      <h4 className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-gray-700 ${compact ? 'mb-0' : 'mb-1'}`}>{title}</h4>
      <p className={`${compact ? 'text-base' : 'text-xl'} font-bold text-gray-900`}>{value}</p>
    </div>
  );
};
