import { useMemo, useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/context/ThemeProvider';
import { RiBarChart2Line, RiPieChartLine, RiTable2, RiListUnordered, RiUserLine, RiSearchLine, RiCalendarLine, RiMoneyDollarCircleLine, RiCloseLine, RiFilterLine } from 'react-icons/ri';
import { FaSlidersH } from 'react-icons/fa';








ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export const PipelineAnalysis = ({ selectedEmployee, dateFrom, dateTo }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en'
  const { theme, resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light'


  // Toolbar state
  const [selectedMeasure, setSelectedMeasure] = useState('count');
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line' | 'pie' | 'pivot' | 'list'
  const [aggregator, setAggregator] = useState('sum'); // 'sum' | 'avg' | 'min' | 'max'
  const [yearFilter, setYearFilter] = useState('2025');
  const [query, setQuery] = useState('');

  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    employee: '',
    dateFrom: '',
    dateTo: '',
    valueMin: '',
    valueMax: '',
    stage: '',
    leadName: ''
  });

  // Sample data
  const [dbData, setDbData] = useState([]);
  const [serverByStage, setServerByStage] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = {
          created_from: dateFrom,
          created_to: dateTo,
          assigned_to: selectedEmployee
        };
        const { data } = await api.get('/api/leads/pipeline-analysis', { params });
        setServerByStage(Array.isArray(data?.byStage) ? data.byStage : []);
        setDbData(Array.isArray(data?.raw_data) ? data.raw_data : []);
      } catch (e) {
        console.error("Failed to fetch pipeline analysis", e);
        setDbData([]);
        setServerByStage([]);
      }
    };
    fetchData();
  }, [dateFrom, dateTo, selectedEmployee]);

  const sampleData = dbData;

  const [dbStages, setDbStages] = useState([]);
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const { data } = await api.get('/api/stages');
        if (data && Array.isArray(data)) {
          const sorted = data.sort((a, b) => (a.order || 0) - (b.order || 0));
          setDbStages(sorted);
        }
      } catch (err) {
        console.error('Failed to fetch pipeline stages', err);
      }
    };
    fetchStages();
  }, []);

  useEffect(() => {
    if (dbStages.length > 0) {
      setLabels(dbStages.map(s => (lang === 'ar' && s.name_ar) ? s.name_ar : s.name));
    } else {
      setLabels(['Follow up', 'No Answer', 'Meeting', 'Proposal', 'Reservation', 'Closing Deal', 'Cancelation']);
    }
  }, [dbStages, lang]);

  const getStageColor = (index, alpha = 0.8) => {
    if (dbStages[index] && dbStages[index].color) {
      // If color is hex, convert to rgba? Or just use as is. 
      // ChartJS accepts hex.
      return dbStages[index].color;
    }
    return 'rgba(59, 130, 246, 0.8)';
  };

  // Filter data based on search query and advanced filters
  const filteredData = useMemo(() => {
    return sampleData.filter(item => {
      // Basic search filter
      const matchesBasicSearch = !query || 
        item.stage.toLowerCase().includes(query.toLowerCase()) ||
        item.leadName.toLowerCase().includes(query.toLowerCase());

      // Advanced filters
      const mergedEmployee = advancedFilters.employee || selectedEmployee
      const matchesEmployee = !mergedEmployee || item.employee === mergedEmployee;
      const matchesStage = !advancedFilters.stage || matchStage(item.stage, advancedFilters.stage);
      const matchesLeadName = !advancedFilters.leadName || 
        item.leadName.toLowerCase().includes(advancedFilters.leadName.toLowerCase());
      
      // Value range filter
      const matchesValueMin = !advancedFilters.valueMin || item.value >= parseFloat(advancedFilters.valueMin);
      const matchesValueMax = !advancedFilters.valueMax || item.value <= parseFloat(advancedFilters.valueMax);
      
      // Date range filter (placeholder - would need proper date parsing)
      const mergedFrom = advancedFilters.dateFrom || dateFrom
      const mergedTo = advancedFilters.dateTo || dateTo
      const matchesDateFrom = !mergedFrom || item.date >= mergedFrom;
      const matchesDateTo = !mergedTo || item.date <= mergedTo;

      return matchesBasicSearch && matchesEmployee && matchesStage && matchesLeadName && 
             matchesValueMin && matchesValueMax && matchesDateFrom && matchesDateTo;
    });
  }, [sampleData, query, advancedFilters, selectedEmployee, dateFrom, dateTo, dbStages, lang]);

  const seriesLabels = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const employees = new Set(filteredData.map(item => item.employee));
    return Array.from(employees).sort();
  }, [filteredData]);

  const allEmployees = useMemo(() => {
    if (!sampleData || sampleData.length === 0) return [];
    const employees = new Set(sampleData.map(item => item.employee));
    return Array.from(employees).sort();
  }, [sampleData]);

  // Advanced filter functions
  const updateAdvancedFilter = (key, value) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllFilters = () => {
    setAdvancedFilters({
      employee: '',
      dateFrom: '',
      dateTo: '',
      valueMin: '',
      valueMax: '',
      stage: '',
      leadName: ''
    });
  };

  const applyFilters = () => {
    setShowAdvancedSearch(false);
    // The filters are already applied through the useMemo dependency
    // This function mainly serves to close the panel and provide user feedback
  };

  // Apply year filter to date labels
  const applyYearToLabel = (dateStr) => {
    const date = new Date(dateStr);
    date.setFullYear(parseInt(yearFilter));
    return date.toLocaleDateString();
  };

  // Filter data based on search query and advanced filters
  // Helper to match stage
  const matchStage = (itemStage, label) => {
      const norm = (v) => String(v ?? '').trim().toLowerCase();
      const stageDef = dbStages.find(s => (lang === 'ar' && s.name_ar === label) || s.name === label);
      if (stageDef) {
          return norm(itemStage) === norm(stageDef.name) || (stageDef.name_ar && norm(itemStage) === norm(stageDef.name_ar)) || norm(itemStage) === norm(label);
      }
      return norm(itemStage) === norm(label);
  };

  // Aggregate data by stage
  const aggregatedData = useMemo(() => {
    const result = {};
    const noClientFilters =
      !query?.trim() &&
      Object.values(advancedFilters || {}).every(v => !String(v ?? '').trim());

    const canUseServerAgg =
      noClientFilters &&
      Array.isArray(serverByStage) &&
      serverByStage.length > 0 &&
      (selectedMeasure === 'count' || aggregator === 'sum' || aggregator === 'avg');

    labels.forEach(label => {
      if (canUseServerAgg) {
        const matches = serverByStage.filter(item => matchStage(item.stage, label));
        const sumCount = matches.reduce((sum, item) => sum + (Number(item?.count) || 0), 0);
        const sumValue = matches.reduce((sum, item) => sum + (Number(item?.value) || 0), 0);

        if (selectedMeasure === 'count') {
          result[label] = sumCount;
        } else {
          if (aggregator === 'avg') {
            result[label] = sumCount > 0 ? (sumValue / sumCount) : 0;
          } else {
            result[label] = sumValue;
          }
        }
        return;
      }

      result[label] = filteredData
        .filter(item => matchStage(item.stage, label))
        .reduce((sum, item) => {
          const value = selectedMeasure === 'count' ? 1 :
                       selectedMeasure === 'value' ? item.value : item.prorated;
          return aggregator === 'sum' ? sum + value :
                 aggregator === 'avg' ? sum + value :
                 aggregator === 'min' ? Math.min(sum, value) :
                 aggregator === 'max' ? Math.max(sum, value) : sum + value;
        }, aggregator === 'min' ? Infinity : aggregator === 'max' ? -Infinity : 0);

      if (aggregator === 'avg') {
        const count = filteredData.filter(item => matchStage(item.stage, label)).length;
        result[label] = count > 0 ? result[label] / count : 0;
      }
    });
    return result;
  }, [filteredData, selectedMeasure, aggregator, labels, dbStages, lang, serverByStage, query, advancedFilters]);

  // Chart data
  const barAggData = {
    labels,
    datasets: [{
      label: t(selectedMeasure),
      data: labels.map(label => aggregatedData[label] || 0),
      backgroundColor: labels.map((_, i) => getStageColor(i)),
      borderColor: labels.map((_, i) => getStageColor(i)),
      borderWidth: 1,
      maxBarThickness: 40
    }]
  };

  const lineData = {
    labels: filteredData.map(item => applyYearToLabel(item.date)),
    datasets: [{
      label: t(selectedMeasure),
      data: filteredData.map(item => selectedMeasure === 'count' ? 1 : 
                                   selectedMeasure === 'value' ? item.value : item.prorated),
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    }]
  };

  const pieData = useMemo(() => {
      const dataValues = labels.map(label => aggregatedData[label] || 0);
      const total = dataValues.reduce((a, b) => a + b, 0);
      const isAllZero = total === 0;

      return {
        labels: isAllZero ? [t('No Data')] : labels,
        datasets: [{
          data: isAllZero ? [1] : dataValues,
          backgroundColor: isAllZero ? ['#e5e7eb'] : labels.map((_, i) => getStageColor(i)),
          borderWidth: isAllZero ? 0 : 1
        }]
      };
  }, [labels, aggregatedData, t]);

  // Chart options
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const tickColor = isLight ? '#0f172a' : '#e5e7eb';
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480;
  const measureDisplay = selectedMeasure === 'count'
    ? (lang === 'ar' ? 'عدد العملاء المحتملين' : 'No. of Leads')
    : selectedMeasure === 'value'
      ? (lang === 'ar' ? 'قيمة الصفقة' : 'Deal Value')
      : (lang === 'ar' ? 'الإيراد الموزّع' : 'Prorated Revenue')
  const aggDisplay = aggregator === 'sum'
    ? (lang === 'ar' ? 'المجموع' : 'Sum')
    : aggregator === 'avg'
      ? (lang === 'ar' ? 'المتوسط' : 'Average')
      : aggregator === 'min'
        ? (lang === 'ar' ? 'الأدنى' : 'Minimum')
        : (lang === 'ar' ? 'الأعلى' : 'Maximum')
  const xLabelBar = lang === 'ar' ? 'المرحلة' : 'Stage'
  const yLabelBar = `${measureDisplay} (${aggDisplay})`
  const xLabelLine = lang === 'ar' ? 'التاريخ' : 'Date'
  const yLabelLine = measureDisplay
  
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false, position: 'top', labels: { color: tickColor, font: { size: isMobile ? 10 : 13 } } },
      title: { display: true, text: (lang === 'ar' ? `${t('Pipeline Analysis')} - ${measureDisplay} (حسب المرحلة)` : `${t('Pipeline Analysis')} - ${t(selectedMeasure)} (${t('by Stage')})`), color: tickColor, font: { size: isMobile ? 12 : 14, weight: 'bold' } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor, font: { size: isMobile ? 10 : 13, weight: 600 } }, title: { display: true, text: xLabelBar, color: tickColor, font: { size: isMobile ? 10 : 13, weight: 600 } } },
      y: { beginAtZero: true, grid: { display: false }, ticks: { color: tickColor, font: { size: isMobile ? 10 : 13, weight: 600 } }, title: { display: true, text: yLabelBar, color: tickColor, font: { size: isMobile ? 10 : 13, weight: 600 } } }
    }
  };
  
  const optionsBase = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false, position: 'top', labels: { color: tickColor, font: { size: isMobile ? 10 : 13 } } },
      title: { display: true, text: `${t('Pipeline Analysis')} - ${t(selectedMeasure)} (${t('Over Time')})`, color: tickColor, font: { size: isMobile ? 12 : 14, weight: 'bold' } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor, font: { size: isMobile ? 10 : 13, weight: 600 } }, title: { display: true, text: xLabelLine, color: tickColor, font: { size: isMobile ? 10 : 13, weight: 600 } } },
      y: { grid: { display: false }, ticks: { color: tickColor, font: { size: isMobile ? 10 : 13, weight: 600 } }, title: { display: true, text: yLabelLine, color: tickColor, font: { size: isMobile ? 10 : 13, weight: 600 } } }
    }
  };

  // Pivot table data
  const pivotRows = useMemo(() => {
    return labels.map(stage => {
      const values = seriesLabels.map(employee => {
        const items = filteredData.filter(item => matchStage(item.stage, stage) && item.employee === employee);
        const value = items.reduce((sum, item) => {
          const val = selectedMeasure === 'count' ? 1 : 
                     selectedMeasure === 'value' ? item.value : item.prorated;
          return aggregator === 'sum' ? sum + val :
                 aggregator === 'avg' ? sum + val :
                 aggregator === 'min' ? Math.min(sum, val) :
                 aggregator === 'max' ? Math.max(sum, val) : sum + val;
        }, aggregator === 'min' ? Infinity : aggregator === 'max' ? -Infinity : 0);
        
        if (aggregator === 'avg' && items.length > 0) {
          return value / items.length;
        }
        return items.length === 0 && (aggregator === 'min' || aggregator === 'max') ? 0 : value;
      });
      
      const total = values.reduce((sum, val) => sum + val, 0);
      return { stage, values, total };
    });
  }, [filteredData, selectedMeasure, aggregator, labels, seriesLabels, dbStages, lang]);

  // List view data
  const listRows = useMemo(() => {
    return filteredData;
  }, [filteredData]);


  return (
    <div className="w-full">
      {/* Toolbar (simplified like Leads Analysis) */}
      <div className="flex flex-wrap items-center gap-2 mb-3 justify-end">
        <span className={`${isLight ? 'text-blue-700 font-semibold' : 'dark:text-gray-300'} text-sm`}>
          {chartType === 'bar'
            ? (lang === 'ar' ? 'رسم بياني عمودي' : 'Bar Chart')
            : chartType === 'pie'
              ? (lang === 'ar' ? 'رسم بياني دائري' : 'Pie Chart')
              : chartType === 'pivot'
                ? (lang === 'ar' ? 'جدول محوري' : 'Pivot Table')
                : (lang === 'ar' ? 'قائمة' : 'List')}
        </span>
        <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setChartType('bar')}
                title={t('Bar')}
                aria-label={t('Bar')}
                className={`group relative flex items-center justify-center px-2 py-1 sm:px-3 sm:py-2 rounded-md transition-all duration-300 ease-in-out ${chartType === 'bar' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-600 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'} border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500`}>
                <RiBarChart2Line className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setChartType('pie')}
                title={t('Pie')}
                aria-label={t('Pie')}
                className={`group relative flex items-center justify-center px-2 py-1 sm:px-3 sm:py-2 rounded-md transition-all duration-300 ease-in-out ${chartType === 'pie' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 scale-105' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-600 hover:text-orange-600 dark:hover:text-orange-400 hover:scale-105'} border border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500`}>
                <RiPieChartLine className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setChartType('pivot')}
                title={t('Pivot')}
                aria-label={t('Pivot')}
                className={`group relative flex items-center justify-center px-2 py-1 sm:px-3 sm:py-2 rounded-md transition-all duration-300 ease-in-out ${chartType === 'pivot' ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25 scale-105' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-gray-600 hover:text-teal-600 dark:hover:text-teal-400 hover:scale-105'} border border-gray-200 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-500`}>
                <RiTable2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setChartType('list')}
                title={t('List')}
                aria-label={t('List')}
                className={`group relative flex items-center justify-center px-2 py-1 sm:px-3 sm:py-2 rounded-md transition-all duration-300 ease-in-out ${chartType === 'list' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 scale-105' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-600 hover:text-green-600 dark:hover:text-green-400 hover:scale-105'} border border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500`}>
                <RiListUnordered className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FaSlidersH className="text-indigo-600 dark:text-indigo-400" />
                {t('Advanced Search Options')}
              </h3>
              <button
                onClick={() => setShowAdvancedSearch(false)}
                className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <RiCloseLine className="text-lg" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Employee Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <RiUserLine className="text-blue-600 dark:text-blue-400" />
                  {t('Employee')}
                </label>
                <select
                  value={advancedFilters.employee}
                  onChange={(e) => updateAdvancedFilter('employee', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">{t('All Employees')}</option>
                  {allEmployees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* Stage Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <RiFilterLine className="text-green-600 dark:text-green-400" />
                  {t('Stage')}
                </label>
                <select
                  value={advancedFilters.stage}
                  onChange={(e) => updateAdvancedFilter('stage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">{t('All Stages')}</option>
                  {labels.map(label => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Lead Name Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <RiSearchLine className="text-purple-600 dark:text-purple-400" />
                  {t('Lead Name')}
                </label>
                <input
                  type="text"
                  value={advancedFilters.leadName}
                  onChange={(e) => updateAdvancedFilter('leadName', e.target.value)}
                  placeholder={t('Enter lead name')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <RiCalendarLine className="text-orange-600 dark:text-orange-400" />
                  {t('Date From')}
                </label>
                <input
                  type="date"
                  value={advancedFilters.dateFrom}
                  onChange={(e) => updateAdvancedFilter('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <RiCalendarLine className="text-orange-600 dark:text-orange-400" />
                  {t('Date To')}
                </label>
                <input
                  type="date"
                  value={advancedFilters.dateTo}
                  onChange={(e) => updateAdvancedFilter('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Value Range */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <RiMoneyDollarCircleLine className="text-emerald-600 dark:text-emerald-400" />
                  {t('Value Range')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={advancedFilters.valueMin}
                    onChange={(e) => updateAdvancedFilter('valueMin', e.target.value)}
                    placeholder={t('Min')}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={advancedFilters.valueMax}
                    onChange={(e) => updateAdvancedFilter('valueMax', e.target.value)}
                    placeholder={t('Max')}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('Use filters to narrow down your search results')}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border-2 border-gray-300 dark:border-gray-600 hover:border-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 hover:scale-105 font-medium"
                >
                  {t('Clear All')}
                </button>
                <button
                  onClick={applyFilters}
                  className="px-6 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                >
                  {t('Apply Filters')}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Content */}
      {chartType === 'bar' && (
        <div className="w-full h-56 sm:h-72">
          <Bar options={barOptions} data={barAggData} />
        </div>
      )}

      {chartType === 'pie' && (
        <div className="w-full h-56 sm:h-72">
          <Pie options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: isMobile ? 'bottom' : 'right', labels: { color: tickColor, font: { size: isMobile ? 10 : 13 } } },
              title: { display: true, text: (lang === 'ar' ? `${t('Pipeline Analysis')} - ${measureDisplay} (حسب المرحلة)` : `${t('Pipeline Analysis')} - ${t(selectedMeasure)} (${t('by Stage')})`), color: tickColor, font: { size: isMobile ? 12 : 14, weight: 'bold' } }
            }
          }} data={pieData} />
        </div>
      )}

      {chartType === 'pivot' && (
        <div className="w-full overflow-x-auto">
          <table className="min-w-max text-sm whitespace-nowrap border border-gray-200 dark:border-gray-700 rounded-md">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[120px]">{t('Stage')}</th>
                {seriesLabels.map((sl, i) => (
                  <th key={i} className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[120px]">{sl}</th>
                ))}
                <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[140px]">{t('Total')} ({t(aggregator)})</th>
              </tr>
            </thead>
            <tbody>
              {pivotRows.map((row, idx) => (
                <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                  <td className={`px-3 py-2 font-medium whitespace-nowrap min-w-[120px] ${isLight ? 'text-black' : 'dark:text-white'}`}>{row.stage}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className={`px-3 py-2 whitespace-nowrap min-w-[120px] ${isLight ? 'text-black' : 'dark:text-gray-300'}`}>{v}</td>
                  ))}
                  <td className={`px-3 py-2 font-semibold whitespace-nowrap min-w-[140px] ${isLight ? 'text-black' : 'dark:text-gray-100'}`}>{Math.round(row.total * 100) / 100}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {chartType === 'list' && (
        <div className="w-full overflow-x-auto">
          <table className="min-w-max text-sm whitespace-nowrap border border-gray-200 dark:border-gray-700 rounded-md">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[110px]">{t('Date')}</th>
                <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[140px]">{t('Employee')}</th>
                <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[150px]">{t('Lead name')}</th>
                <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[140px]">{t('Stage name')}</th>
                <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[120px]">{t('Value')}</th>
                <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[160px]">{t('Prorated Revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {listRows.map((r, i) => (
                <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                  <td className={`px-3 py-2 whitespace-nowrap ${isLight ? 'text-black' : 'dark:text-gray-300'}`}>{applyYearToLabel(r.date)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap ${isLight ? 'text-black' : 'dark:text-gray-300'}`}>{r.employee}</td>
                  <td className={`px-3 py-2 whitespace-nowrap ${isLight ? 'text-black' : 'dark:text-gray-300'}`}>{r.leadName}</td>
                  <td className={`px-3 py-2 whitespace-nowrap ${isLight ? 'text-black' : 'dark:text-gray-300'}`}>{r.stage}</td>
                  <td className={`px-3 py-2 whitespace-nowrap ${isLight ? 'text-black' : 'dark:text-gray-300'}`}>{r.value}</td>
                  <td className={`px-3 py-2 whitespace-nowrap ${isLight ? 'text-black' : 'dark:text-gray-300'}`}>{r.prorated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
