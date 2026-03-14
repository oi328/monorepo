import { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/context/ThemeProvider';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createPortal } from 'react-dom';
import { Filter, Search, Calendar, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { FaFileExport } from 'react-icons/fa';
import { api, logExportEvent } from '../utils/api';
import SearchableSelect from '../components/SearchableSelect';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const deviceTypes = ['Windows PC', 'MacBook', 'Linux PC', 'iPhone', 'Android'];

export default function UserManagementAccessLogs() {
  const { theme: contextTheme, resolvedTheme } = useTheme()
  const theme = resolvedTheme || contextTheme
  const isLight = theme === 'light'
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({
    browser: [],
    location: [],
    device: [],
    dateFrom: '',
    dateTo: '',
    datePeriod: ''
  });

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('login');
  const [sortOrder, setSortOrder] = useState('desc');

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/api/user-management/access-logs');
        if (!mounted) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setLogs(data);
      } catch (err) {
        console.error('Failed to load access logs', err);
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: {
            type: 'error',
            message: isArabic ? 'فشل تحميل سجل الوصول' : 'Failed to load access logs',
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
        const matchesSearch = [l.user, l.ip, l.location]
          .join(' ')
          .toLowerCase()
          .includes(query);
        if (!matchesSearch) return false;
      }

      // Filters
      if (filters.browser && filters.browser.length > 0 && !filters.browser.includes(l.browser)) return false;
      if (filters.location && filters.location.length > 0 && !filters.location.includes(l.location)) return false;
      if (filters.device && filters.device.length > 0 && !filters.device.includes(l.device)) return false;

      // Date Filters (Login Time)
      if (filters.dateFrom) {
         if ((l.login || '') < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
         if ((l.login || '') > filters.dateTo) return false;
      }

      return true;
    });
  }, [logs, q, filters]);

  // Date Period Change Handler
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
      browser: [],
      location: [],
      device: [],
      dateFrom: '',
      dateTo: '',
      datePeriod: ''
    });
  };

  const exportToExcel = () => {
    const rows = filtered.map(l => ({
      'User': l.user,
      'Login Time': l.login,
      'Logout Time': l.logout,
      'IP Address': l.ip,
      'Location': l.location,
      'Device': l.device,
      'Browser': l.browser
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Access Logs");
    const fileName = "access-logs.xlsx";
    XLSX.writeFile(workbook, fileName);
    logExportEvent({
      module: 'User Management Access Logs',
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
                    {isArabic ? 'سجل الوصول' : 'Access Logs'}
                    <span className="text-sm font-normal text-[var(--muted-text)] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {filtered.length}
                    </span>
                </h1>
                <span aria-hidden="true" className="inline-block h-[2px] w-full rounded bg-gradient-to-r from-blue-500 to-purple-600" />
                </div>
            </div>
            
            <div className="w-full lg:w-auto flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. SEARCH */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
                    <Search className="text-blue-500" size={10} /> {isArabic ? 'بحث عام' : 'Search All Data'}
                    </label>
                    <input
                    className="input w-full"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder={isArabic ? 'بحث (مستخدم، IP، موقع)...' : 'Search (user, IP, location)...'}
                    />
                </div>

                {/* 2. BROWSER */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-text)]">
                    {isArabic ? 'المتصفح' : 'Browser'}
                    </label>
                    <SearchableSelect
                    options={Array.from(new Set(logs.map(l => l.browser))).map(b => ({ value: b, label: b }))}
                    value={filters.browser}
                    onChange={(v) => setFilters(prev => ({ ...prev, browser: v }))}
                    placeholder={isArabic ? 'اختر المتصفح' : 'Select Browser'}
                    className="w-full"
                    isRTL={isArabic}
                    multiple={true}
                    />
                </div>

                {/* 3. LOCATION */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-text)]">
                    {isArabic ? 'الموقع' : 'Location'}
                    </label>
                    <SearchableSelect
                    options={Array.from(new Set(logs.map(l => l.location))).map(l => ({ value: l, label: l }))}
                    value={filters.location}
                    onChange={(v) => setFilters(prev => ({ ...prev, location: v }))}
                    placeholder={isArabic ? 'اختر الموقع' : 'Select Location'}
                    className="w-full"
                    isRTL={isArabic}
                    multiple={true}
                    />
                </div>

                {/* 4. DEVICE */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-text)]">
                    {isArabic ? 'الجهاز' : 'Device'}
                    </label>
                    <SearchableSelect
                    options={deviceTypes.map(o => ({ value: o, label: o }))}
                    value={filters.device}
                    onChange={(v) => setFilters(prev => ({ ...prev, device: v }))}
                    placeholder={isArabic ? 'اختر الجهاز' : 'Select Device'}
                    className="w-full"
                    isRTL={isArabic}
                    multiple={true}
                    />
                </div>

                 {/* 5. DATE RANGE */}
                 <div className="col-span-1 md:col-span-2 lg:col-span-1 space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
                    <Calendar className="text-blue-500" size={10} /> {isArabic ? 'تاريخ الدخول' : 'Login Date'}
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
             <h3 className="font-semibold text-lg">{isArabic ? 'سجل الوصول' : 'Access Logs'}</h3>
             <button
               onClick={exportToExcel}
               className="btn btn-sm bg-blue-600 hover:bg-green-500 !text-white border-none flex items-center justify-center gap-2"
             >
               <FaFileExport />
               {isArabic ? 'تصدير' : 'Export'}
             </button>
          </div>
          <div className="overflow-x-auto hidden md:block">
             <table className="table w-full text-xs sm:text-sm">
            <thead>
              <tr>
                <th className="p-3 rounded-l-lg cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('user')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'المستخدم' : 'User'}
                    <ArrowUpDown size={12} className={sortBy === 'user' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('login')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'وقت الدخول' : 'Login Time'}
                    <ArrowUpDown size={12} className={sortBy === 'login' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('logout')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'وقت الخروج' : 'Logout Time'}
                    <ArrowUpDown size={12} className={sortBy === 'logout' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('ip')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'عنوان IP' : 'IP Address'}
                    <ArrowUpDown size={12} className={sortBy === 'ip' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('location')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'الموقع' : 'Location'}
                    <ArrowUpDown size={12} className={sortBy === 'location' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('device')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'الجهاز' : 'Device'}
                    <ArrowUpDown size={12} className={sortBy === 'device' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 rounded-r-lg cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('browser')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'المتصفح' : 'Browser'}
                    <ArrowUpDown size={12} className={sortBy === 'browser' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAndPaginated.map((l, i) => (
                <tr key={i} className="hover:backdrop-blur-lg hover:shadow-sm transition-all border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="p-3 text-sm">{l.user}</td>
                  <td className="p-3 text-sm text-[var(--muted-text)]" dir="ltr">{l.login}</td>
                  <td className="p-3 text-sm text-[var(--muted-text)]" dir="ltr">{l.logout}</td>
                  <td className="p-3 text-sm font-mono">{l.ip}</td>
                  <td className="p-3 text-sm">{l.location}</td>
                  <td className="p-3 text-sm">{l.device}</td>
                  <td className="p-3 text-sm">{l.browser}</td>
                </tr>
              ))}
              {sortedAndPaginated.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-[var(--muted-text)]">
                    {isArabic ? 'لا توجد بيانات' : 'No data found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden grid grid-cols-1 gap-3 p-4">
           {sortedAndPaginated.map((l, i) => (
             <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative space-y-3">
                 <div className="flex justify-between items-start">
                    <div className="font-bold text-base">{l.user}</div>
                    <div className="text-xs text-[var(--muted-text)] font-mono">{l.ip}</div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-[var(--muted-text)] text-xs block">{isArabic ? 'وقت الدخول' : 'Login Time'}</span>
                      <span className="font-mono text-xs" dir="ltr">{l.login}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-text)] text-xs block">{isArabic ? 'وقت الخروج' : 'Logout Time'}</span>
                      <span className="font-mono text-xs" dir="ltr">{l.logout}</span>
                    </div>
                 </div>

                 <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-[var(--muted-text)]">
                    <div className="flex items-center gap-2">
                       <span>{l.device}</span>
                       <span>•</span>
                       <span>{l.browser}</span>
                    </div>
                    <div>{l.location}</div>
                 </div>
             </div>
           ))}
           {sortedAndPaginated.length === 0 && (
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
