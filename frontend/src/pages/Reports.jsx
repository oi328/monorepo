import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import ReportsKpis from '../components/ReportsKpis';
import EmployeesReportingStats from '../components/EmployeesReportingStats';

const { isLight } = useTheme();
export default function Reports() {
  const { t } = useTranslation();

  return (
    <>
      <h1 className={`text-2xl font-semibold mb-4 ${isLight ? 'text-black' : 'text-white'}`}>{t('Reports Dashboard')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 glass-panel rounded-lg shadow-md">
          <ReportsKpis />
        </div>
        <div className="p-4 glass-panel rounded-lg shadow-md">
          <EmployeesReportingStats />
        </div>
      </div>
    </>
  );
}
