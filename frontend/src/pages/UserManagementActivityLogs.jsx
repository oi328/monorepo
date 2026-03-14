import { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/context/ThemeProvider';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createPortal } from 'react-dom';
import { FaFileExport } from 'react-icons/fa';
import { ArrowUpDown, Filter, Search, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, logExportEvent } from '../utils/api';
import SearchableSelect from '../components/SearchableSelect';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const actionTypes = ['Created', 'Updated', 'Deleted', 'Login', 'Failed Login', 'Permission Change'];
const modules = ['Tickets', 'Customers', 'SLA', 'Reports', 'User Management', 'Settings', 'Integrations', 'Custom Modules'];

export default function UserManagementActivityLogs() {
  const { theme: contextTheme, resolvedTheme } = useTheme()
  const theme = resolvedTheme || contextTheme
  const isLight = theme === 'light'
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({
    type: [],
    module: [],
    dateFrom: '',
    dateTo: '',
    datePeriod: ''
  });

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('ts');
  const [sortOrder, setSortOrder] = useState('desc');

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/api/user-management/activity-logs');
        if (!mounted) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setLogs(data);
      } catch (err) {
        console.error('Failed to load activity logs', err);
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: {
            type: 'error',
            message: isArabic ? 'فشل تحميل سجل الأنشطة' : 'Failed to load activity logs',
          },
        }));
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    fetchLogs();
    return () => {
      mounted = false;
    };
  }, [isArabic]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      // Search
      if (q) {
        const query = q.toLowerCase();
        const matchesSearch = [l.description, l.target, l.user, l.ip]
          .join(' ')
          .toLowerCase()
          .includes(query);
        if (!matchesSearch) return false;
      }

      // Filters
      if (filters.type && filters.type.length > 0 && !filters.type.includes(l.type)) return false;
      if (filters.module && filters.module.length > 0 && !filters.module.includes(l.module)) return false;

      // Date Filters
      if (filters.dateFrom) {
         if ((l.ts || '') < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
         if ((l.ts || '') > filters.dateTo) return false;
      }

      return true;
    });
  }, [logs, q, filters]);

  // Sorting
  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const sortedAndPaginated = useMemo(() => {
    let result = [...filtered];

    // Sort
    if (sortBy) {
      result.sort((a, b) => {
        let valA = a[sortBy] || '';
        let valB = b[sortBy] || '';
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    return result.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, sortBy, sortOrder, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const clearFilters = () => {
    setQ('');
    setFilters({
      type: [],
      module: [],
      dateFrom: '',
      dateTo: '',
      datePeriod: ''
    });
  };

  const handleDatePeriodChange = (period) => {
    const now = new Date();
    let from = '';
    let to = '';

    if (period === 'today') {
      from = now.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    } else if (period === 'week') {
      const first = new Date(now.setDate(now.getDate() - now.getDay()));
      const last = new Date(now.setDate(now.getDate() - now.getDay() + 6));
      from = first.toISOString().split('T')[0];
      to = last.toISOString().split('T')[0];
    } else if (period === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      from = first.toISOString().split('T')[0];
      to = last.toISOString().split('T')[0];
    }

    setFilters(prev => ({
      ...prev,
      datePeriod: period,
      dateFrom: from,
      dateTo: to
    }));
  };

  const exportToExcel = () => {
    const rows = filtered.map(l => ({
      'Action Type': l.type,
      'Performed By': l.user,
      'Target': l.target,
      'Description': l.description,
      'Timestamp': l.ts,
      'IP Address': l.ip,
      'Module': l.module
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Logs");
    const fileName = "activity-logs.xlsx";
    XLSX.writeFile(workbook, fileName);
    logExportEvent({
      module: 'User Management Activity Logs',
      fileName,
      format: 'xlsx',
    });
  };

  return (
    <div className="container mx-auto px-4 py-4 space-y-6">
        
        {/* Header */}
        <div className="rounded-xl p-4 md:p-6 relative mb-6">
            <div className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4">
            <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3">
                <div className="relative flex flex-col items-start gap-1">
                <h1 className={`text-xl md:text-2xl font-bold text-start ${isLight ? 'text-black' : 'text-white'} dark:text-white flex items-center gap-2`}>
                    {isArabic ? 'سجل النشاطات' : 'Activity Logs'}
                    <span className="text-sm font-normal text-[var(--muted-text)] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {filtered.length}
                    </span>
                </h1>
                <span aria-hidden="true" className="inline-block h-[2px] w-full rounded bg-gradient-to-r from-blue-500 to-purple-600" />
                </div>
            </div>

            </div>
        </div>

        {/* Filter Section */}
        <div className="glass-panel p-4 rounded-xl mb-6">
            <div className="flex justify-between items-center mb-3">
            <h2 className={`text-sm font-semibold flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'} `}>
                <Filter className="text-blue-500" size={16} /> {isArabic ? 'تصفية' : 'Filter'}
            </h2>
            <div className="flex items-center gap-2">
                <button 
                onClick={clearFilters} 
                className={`px-3 py-1.5 text-sm ${isLight ? 'text-black' : 'text-white'} hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors`}
                >
                {isArabic ? 'إعادة تعيين' : 'Reset'}
                </button>
            </div>
            </div>

            {/* Primary Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. SEARCH */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
                    <Search className="text-blue-500" size={10} /> {isArabic ? 'بحث عام' : 'Search All Data'}
                    </label>
                    <input
                    className="input w-full"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder={isArabic ? 'بحث (وصف، هدف، مستخدم)...' : 'Search (desc, target, user)...'}
                    />
                </div>

                {/* 2. MODULE */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-text)]">
                    {isArabic ? 'الموديول' : 'Module'}
                    </label>
                    <SearchableSelect
                    options={modules.map(o => ({ value: o, label: o }))}
                    value={filters.module}
                    onChange={(v) => setFilters(prev => ({ ...prev, module: v }))}
                    placeholder={isArabic ? 'اختر الموديول' : 'Select Module'}
                    className="w-full"
                    isRTL={isArabic}
                    multiple={true}
                    />
                </div>

                {/* 3. TYPE */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-text)]">
                    {isArabic ? 'نوع النشاط' : 'Action Type'}
                    </label>
                    <SearchableSelect
                    options={actionTypes.map(o => ({ value: o, label: o }))}
                    value={filters.type}
                    onChange={(v) => setFilters(prev => ({ ...prev, type: v }))}
                    placeholder={isArabic ? 'اختر النوع' : 'Select Type'}
                    className="w-full"
                    isRTL={isArabic}
                    multiple={true}
                    />
                </div>

                 {/* 4. DATE RANGE */}
                 <div className="col-span-1 md:col-span-1 space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
                    <Calendar className="text-blue-500" size={10} /> {isArabic ? 'التاريخ' : 'Date'}
                    </label>
                    <div className="w-full">
                        <DatePicker
                            popperContainer={({ children }) => createPortal(children, document.body)}
                            selectsRange={true}
                            startDate={filters.dateFrom ? new Date(filters.dateFrom) : null}
                            endDate={filters.dateTo ? new Date(filters.dateTo) : null}
                            onChange={(update) => {
                            const [start, end] = update;
                            const formatDate = (date) => {
                                if (!date) return '';
                                const offset = date.getTimezoneOffset();
                                const localDate = new Date(date.getTime() - (offset*60*1000));
                                return localDate.toISOString().split('T')[0];
                            };

                            setFilters(prev => ({
                                ...prev,
                                datePeriod: '',
                                dateFrom: formatDate(start),
                                dateTo: formatDate(end)
                            }));
                            }}
                            isClearable={true}
                            placeholderText={isArabic ? "من - إلى" : "From - To"}
                            className="input w-full"
                            wrapperClassName="w-full"
                            dateFormat="yyyy-MM-dd"
                        />
                        <div className="flex items-center gap-2 mt-2">
                            <button 
                            onClick={() => handleDatePeriodChange('today')} 
                            className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filters.datePeriod === 'today' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : `bg-theme-bg   ${isLight ? 'text-black' : 'text-white'} hover:bg-gray-700/50 dark:hover:bg-gray-700`}`}
                            >
                            {isArabic ? 'اليوم' : 'Today'}
                            </button>
                            <button 
                            onClick={() => handleDatePeriodChange('week')} 
                            className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filters.datePeriod === 'week' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : `bg-theme-bg   ${isLight ? 'text-black' : 'text-white'} hover:bg-gray-700/50 dark:hover:bg-gray-700`}`}
                            >
                            {isArabic ? 'أسبوع' : 'Week'}
                            </button>
                            <button 
                            onClick={() => handleDatePeriodChange('month')} 
                            className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filters.datePeriod === 'month' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : `bg-theme-bg   ${isLight ? 'text-black' : 'text-white'} hover:bg-gray-700/50 dark:hover:bg-gray-700`}`}
                            >
                            {isArabic ? 'شهر' : 'Month'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="glass-panel rounded-xl overflow-hidden w-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
             <h3 className="font-semibold text-lg">{isArabic ? 'سجل النشاطات' : 'Activity Logs'}</h3>
             <button
               onClick={exportToExcel}
               className="btn btn-sm bg-blue-600 hover:bg-green-500 !text-white border-none flex items-center justify-center gap-2"
             >
               <FaFileExport />
               {isArabic ? 'تصدير' : 'Export'}
             </button>
          </div>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
             <table className="table w-full text-xs sm:text-sm">
            <thead>
              <tr>
                <th className="p-3 rounded-l-lg cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('type')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'نوع النشاط' : 'Action Type'}
                    <ArrowUpDown size={12} className={sortBy === 'type' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('user')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'المستخدم' : 'Performed By'}
                    <ArrowUpDown size={12} className={sortBy === 'user' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('target')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'الهدف' : 'Target'}
                    <ArrowUpDown size={12} className={sortBy === 'target' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('description')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'الوصف' : 'Description'}
                    <ArrowUpDown size={12} className={sortBy === 'description' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('ts')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'الوقت' : 'Timestamp'}
                    <ArrowUpDown size={12} className={sortBy === 'ts' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 rounded-r-lg cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('ip')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'عنوان IP' : 'IP Address'}
                    <ArrowUpDown size={12} className={sortBy === 'ip' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAndPaginated.map((l, i) => (
                <tr key={i} className="hover:backdrop-blur-lg hover:shadow-sm transition-all border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="p-3 text-sm">{l.type}</td>
                  <td className="p-3 text-sm">{l.user}</td>
                  <td className="p-3 text-sm">{l.target}</td>
                  <td className="p-3 text-sm">{l.description}</td>
                  <td className="p-3 text-sm text-[var(--muted-text)]" dir="ltr">{l.ts}</td>
                  <td className="p-3 text-sm font-mono">{l.ip}</td>
                </tr>
              ))}
              {sortedAndPaginated.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-[var(--muted-text)]">
                    {isArabic ? 'لا توجد بيانات' : 'No data found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden">
          {sortedAndPaginated.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {sortedAndPaginated.map((l, i) => (
                <div key={i} className="p-4 space-y-2 hover:bg-gray-700/50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                       <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                         l.type === 'Created' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                         l.type === 'Deleted' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                         l.type === 'Updated' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                         'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                       }`}>
                         {l.type}
                       </span>
                       <span className={`text-xs ${isLight ? 'text-black' : 'text-white'} font-mono`} dir="ltr">{l.ts}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className={`font-medium ${isLight ? 'text-black' : 'text-white'} text-sm`}>{l.description}</h4>
                    <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-black' : 'text-white'} dark:text-gray-400`}>
                       <span className={`font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-gray-300`}>{l.user}</span>
                       <span>•</span>
                       <span>{l.target}</span>
                    </div>
                     <div className={`flex items-center gap-2 text-[10px] ${isLight ? 'text-black' : 'text-white'}`}>
                       <span className="font-mono">{l.ip}</span>
                       {l.module && (
                         <>
                           <span>•</span>
                           <span>{l.module}</span>
                         </>
                       )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--muted-text)]">
              {isArabic ? 'لا توجد بيانات' : 'No data found'}
            </div>
          )}
        </div>
      </div>

        {/* Pagination */}
        <div className="mt-2 flex items-center justify-between rounded-xl p-1.5 sm:p-2 glass-panel">
          <div className="text-[10px] sm:text-xs text-[var(--muted-text)]">
            {isArabic 
              ? `عرض ${Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}–${Math.min(filtered.length, currentPage * itemsPerPage)} من ${filtered.length}`
              : `Showing ${Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}–${Math.min(filtered.length, currentPage * itemsPerPage)} of ${filtered.length}`
            }
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1">
              <button
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                title={isArabic ? 'السابق' : 'Prev'}
              >
                <ChevronLeft className={`w-5 h-5 block ${isLight ? 'text-black' : 'text-white'} ${isArabic ? 'rotate-180' : ''}`} />
              </button>
              <span className="text-xs sm:text-sm px-2">{isArabic ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                title={isArabic ? 'التالي' : 'Next'}
              >
                <ChevronRight className={`w-5 h-5 block ${isLight ? 'text-black' : 'text-white'} ${isArabic ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="select select-bordered select-sm h-8 min-h-0 w-16 sm:w-20 text-xs bg-[var(--bg-primary)]"
            >
              {[5, 10, 20, 50].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
  );
}
