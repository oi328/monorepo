import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../utils/api';
import { UserMinus, ArrowRight, Filter, ChevronDown, Calendar, User, Users, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import SearchableSelect from '../SearchableSelect';
import { useTheme } from '@shared/context/ThemeProvider'

const StatCard = ({ title, value, sub, icon: Icon, color, bgColor }) => {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
  <div
    className={`group relative backdrop-blur-md rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden h-32 ${
      isLight
        ? 'bg-gradient-to-br from-white via-blue-50/70 to-sky-50/80 border-blue-100/90 shadow-[0_12px_28px_rgba(37,99,235,0.12)] hover:shadow-[0_18px_36px_rgba(37,99,235,0.18)]'
        : 'shadow-sm hover:shadow-xl border-theme-border dark:border-gray-700/50'
    }`}
  >
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
      <Icon size={80} className={color} />
    </div>

    <div className="flex flex-col justify-between h-full relative z-10">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${bgColor} ${color}`}>
          <Icon size={20} />
        </div>
        <h3 className={`${isLight ? 'text-black' : 'text-white'} text-sm font-semibold opacity-80`}>
          {title}
        </h3>
      </div>

      <div className="flex items-baseline space-x-2 rtl:space-x-reverse pl-1">
        <span className={`text-2xl font-bold ${color}`}>
          {value}
        </span>
        <span className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-white/90'}`}>
          {sub}
        </span>
      </div>
    </div>
  </div>
  )
};

const ReassignLeadsReport = ({ users = [] }) => {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const lightPanelClass = 'bg-gradient-to-br from-white via-blue-50/65 to-slate-50 border-blue-100/90 shadow-[0_10px_30px_rgba(37,99,235,0.12)]';
  const darkPanelClass = 'border-theme-border dark:border-gray-700/50';
  const panelClass = isLight ? lightPanelClass : darkPanelClass;

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get('/api/company-info');
        setCurrentUser(response.data?.user || null);
      } catch (err) {
        console.error('Failed to fetch current user', err);
      }
    };
    fetchCurrentUser();
  }, []);

  const isSalesPerson = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.role || '').toLowerCase();
    return role.includes('sales person') || role.includes('salesperson');
  }, [currentUser]);

  const formatDate = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  // Filters State
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return formatDate(date);
  });
  const [dateTo, setDateTo] = useState(() => formatDate(new Date()));
  const [fromManager, setFromManager] = useState('');
  const [toManager, setToManager] = useState('');
  const [fromSales, setFromSales] = useState('');
  const [toSales, setToSales] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAllFilters, setShowAllFilters] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSearch, setPageSearch] = useState('');

  // Data State
  const [reportData, setReportData] = useState({
    transactions: [],
    stats: {
      total_reassigned: 0,
      unassigned_leads: 0,
    },
    top_receivers: [],
    top_senders: [],
  });

  // Fetch Report Data
  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const params = {
          date_from: dateFrom,
          date_to: dateTo,
          from_manager_id: fromManager,
          to_manager_id: toManager,
          from_sales_id: fromSales,
          to_sales_id: toSales,
          page: currentPage,
          per_page: itemsPerPage
        };

        const response = await api.get('/api/leads/reassignment-report', { params });
        if (response.data) {
          const data = response.data;
          
          setReportData({
            transactions: data.transactions?.data || [],
            stats: {
                total_reassigned: data.stats?.total_reassigned || 0,
                unassigned_leads: data.stats?.unassigned_count || 0,
            },
            top_receivers: data.aggregates?.top_receivers || [],
            top_senders: data.aggregates?.top_senders || []
          });
          setTotalRecords(data.transactions?.total || 0);
        }
      } catch (error) {
        console.error("Failed to fetch reassignment report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [dateFrom, dateTo, fromManager, toManager, fromSales, toSales, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, fromManager, toManager, fromSales, toSales]);

  const handleExport = () => {
    // Note: This export only exports current page. 
    // Ideally, we should fetch all data for export or ask backend for export.
    // For now, let's keep it simple as per request or just export what we have?
    // User asked to move the button. Usually export implies "all data".
    // If we paginate, "export" usually means "export all matching query".
    // I will implement a separate fetch for export to get all data.
    
    const fetchAllAndExport = async () => {
        try {
            const params = {
                date_from: dateFrom,
                date_to: dateTo,
                from_manager_id: fromManager,
                to_manager_id: toManager,
                from_sales_id: fromSales,
                to_sales_id: toSales,
                per_page: 999999 // Hack to get all
            };
            const response = await api.get('/api/leads/reassignment-report', { params });
            const allTransactions = response.data?.transactions?.data || [];
            
            const data = allTransactions.map(t => ({
                [isRTL ? 'التاريخ' : 'Date']: t.date,
                [isRTL ? 'بواسطة' : 'By']: t.by_user?.name || 'System',
                [isRTL ? 'من المدير' : 'From Manager']: t.from_user?.manager?.name || '-',
                [isRTL ? 'إلى المدير' : 'To Manager']: t.to_user?.manager?.name || '-',
                [isRTL ? 'من البائع' : 'From Sales']: t.from_user?.name || '-',
                [isRTL ? 'إلى البائع' : 'To Sales']: t.to_user?.name || '-',
                [isRTL ? 'المرحلة بعد' : 'Stage After']: t.stage_after,
                [isRTL ? 'المرحلة قبل' : 'Stage Before']: t.stage_before,
                [isRTL ? 'عدد العملاء' : 'Leads Quantity']: t.quantity,
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reassignment Report");
            XLSX.writeFile(wb, `Reassignment_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (e) {
            console.error("Export failed", e);
        }
    };
    
    fetchAllAndExport();
  };

  // Prepare Filter Options
  const managerOptions = useMemo(() => {
    const managers = users.filter(u => {
      const role = String(u.role || '').toLowerCase();
      return !role.includes('sales person') && !role.includes('salesperson');
    });
    return [
      { value: '', label: isRTL ? 'الكل' : 'All Managers' },
      ...managers.map(m => ({ value: String(m.id), label: m.name }))
    ];
  }, [users, isRTL]);

  const salesOptions = useMemo(() => {
    const sales = users.filter(u => {
      const role = String(u.role || '').toLowerCase();
      return role.includes('sales person') || role.includes('salesperson');
    });
    return [
      { value: '', label: isRTL ? 'الكل' : 'All Sales Persons' },
      ...sales.map(s => ({ value: String(s.id), label: s.name }))
    ];
  }, [users, isRTL]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filters Section */}
      <div className={`backdrop-blur-md border p-4 rounded-2xl mb-6 ${panelClass}`}>
        <div className="flex justify-between items-center mb-3">
          <div className={`flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'} font-semibold`}>
            <Filter size={20} className="text-blue-500 dark:text-blue-400" />
            <h3>{isRTL ? 'الفلاتر' : 'Filters'}</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAllFilters(!showAllFilters)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isLight
                  ? 'text-blue-700 bg-blue-100/80 hover:bg-blue-200/70'
                  : 'text-blue-600 bg-blue-900/20 hover:bg-blue-900/30'
              }`}
            >
              {showAllFilters ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض الكل' : 'Show All')}
              <ChevronDown
                size={12}
                className={`transform transition-transform duration-300 ${showAllFilters ? 'rotate-180' : 'rotate-0'}`}
              />
            </button>
            <button
                onClick={() => {
                    const d = new Date();
                    d.setDate(1);
                    setDateFrom(formatDate(d));
                    setDateTo(formatDate(new Date()));
                    setFromManager('');
                    setToManager('');
                    setFromSales('');
                    setToSales('');
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  isLight
                    ? 'text-slate-600 hover:text-red-600 hover:bg-red-50'
                    : 'text-white hover:text-red-400 hover:bg-red-900/20'
                }`}
            >
                {isRTL ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-300">
          {/* Date From */}
          <div className="space-y-1">
            <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
              <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
              {isRTL ? 'من تاريخ' : 'Date From'}
            </label>
            <input 
              type="date" 
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                isLight
                  ? 'border-blue-200/90 bg-white text-slate-700'
                  : `border-gray-700 bg-transparent ${isLight ? 'text-black' : 'text-white'}`
              }`}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          {/* Date To */}
          <div className="space-y-1">
            <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
              <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
              {isRTL ? 'إلى تاريخ' : 'Date To'}
            </label>
            <input 
              type="date" 
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                isLight
                  ? 'border-blue-200/90 bg-white text-slate-700'
                  : `border-gray-700 bg-transparent ${isLight ? 'text-black' : 'text-white'}`
              }`}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Managers Filter */}
          <div className="space-y-1">
            <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
              <User size={12} className="text-blue-500 dark:text-blue-400" />
              {isRTL ? 'من المدير' : 'From Manager'}
            </label>
            <SearchableSelect 
              options={managerOptions}
              value={fromManager}
              onChange={setFromManager}
              placeholder={isRTL ? 'اختر المدير' : 'Select Manager'}
              icon={<User size={16} />}
              isRTL={isRTL}
            />
          </div>
          <div className="space-y-1">
            <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
              <User size={12} className="text-blue-500 dark:text-blue-400" />
              {isRTL ? 'إلى المدير' : 'To Manager'}
            </label>
            <SearchableSelect 
              options={managerOptions}
              value={toManager}
              onChange={setToManager}
              placeholder={isRTL ? 'اختر المدير' : 'Select Manager'}
              icon={<User size={16} />}
              isRTL={isRTL}
            />
          </div>

          {/* Sales Filter - Hidden by default */}
          {showAllFilters && (
            <>
              <div className="space-y-1 animate-fadeIn">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <Users size={12} className="text-blue-500 dark:text-blue-400" />
                  {isRTL ? 'من البائع' : 'From Sales'}
                </label>
                <SearchableSelect 
                  options={salesOptions}
                  value={fromSales}
                  onChange={setFromSales}
                  placeholder={isRTL ? 'اختر البائع' : 'Select Sales Person'}
                  icon={<Users size={16} />}
                  isRTL={isRTL}
                />
              </div>
              <div className="space-y-1 animate-fadeIn">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <Users size={12} className="text-blue-500 dark:text-blue-400" />
                  {isRTL ? 'إلى البائع' : 'To Sales'}
                </label>
                <SearchableSelect 
                  options={salesOptions}
                  value={toSales}
                  onChange={setToSales}
                  placeholder={isRTL ? 'اختر البائع' : 'Select Sales Person'}
                  icon={<Users size={16} />}
                  isRTL={isRTL}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard 
            title={isRTL ? 'إجمالي العملاء المعاد تعيينهم' : 'Total Reassigned'}
            value={reportData.stats.total_reassigned}
            sub={isRTL ? '(الكل)' : '(Total)'}
            icon={ArrowRight}
            color="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
         />
         <StatCard 
            title={isRTL ? 'عملاء غير معينين' : 'Unassigned Leads'}
            value={reportData.stats.unassigned_leads}
            sub={isRTL ? '(حالي)' : '(Current)'}
            icon={UserMinus}
            color="text-red-600 dark:text-red-400"
            bgColor="bg-red-50 dark:bg-red-900/20"
         />
      </div>

      {/* Top Lists */}
      {!isSalesPerson && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Receivers */}
          <div className={`backdrop-blur-md rounded-2xl border overflow-hidden ${panelClass}`}>
              <div className="p-4 border-b border-theme-border dark:border-gray-700/50">
                <h3 className={`font-bold ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'أكثر المستلمين' : 'Top Receivers'}</h3>
              </div>
          <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right">
                  <thead className={`text-xs uppercase ${isLight ? 'bg-blue-50/80 text-slate-700' : 'bg-white/5 dark:bg-white/5'}`}>
                    <tr>
                      <th className="px-6 py-3 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'الاسم' : 'Name'}</th>
                      <th className="px-6 py-3 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'العدد' : 'Count'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border dark:divide-gray-700/50">
                    {reportData.top_receivers.map((item, idx) => (
                      <tr key={idx} className={`transition-colors ${isLight ? 'hover:bg-blue-50/70' : 'hover:bg-white/5 dark:hover:bg-white/5'}`}>
                        <td className={`px-6 py-3 ${isLight ? 'text-black' : 'text-white'}`}>{item.name}</td>
                        <td className="px-6 py-3 font-bold text-blue-600 dark:text-blue-400">{item.count}</td>
                      </tr>
                    ))}
                    {reportData.top_receivers.length === 0 && (
                      <tr><td colSpan="2" className="px-6 py-3 text-center text-gray-500">{isRTL ? 'لا توجد بيانات' : 'No data'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>

          {/* Top Senders */}
          <div className={`backdrop-blur-md rounded-2xl border overflow-hidden ${panelClass}`}>
              <div className="p-4 border-b border-theme-border dark:border-gray-700/50">
                <h3 className={`font-bold ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'أكثر المرسلين' : 'Top Senders'}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right">
                  <thead className={`text-xs uppercase ${isLight ? 'bg-blue-50/80 text-slate-700' : 'bg-white/5 dark:bg-white/5'}`}>
                    <tr>
                      <th className="px-6 py-3 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'الاسم' : 'Name'}</th>
                      <th className="px-6 py-3 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'العدد' : 'Count'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border dark:divide-gray-700/50">
                    {reportData.top_senders.map((item, idx) => (
                      <tr key={idx} className={`transition-colors ${isLight ? 'hover:bg-blue-50/70' : 'hover:bg-white/5 dark:hover:bg-white/5'}`}>
                        <td className={`px-6 py-3 ${isLight ? 'text-black' : 'text-white'}`}>{item.name}</td>
                        <td className="px-6 py-3 font-bold text-blue-600 dark:text-blue-400">{item.count}</td>
                      </tr>
                    ))}
                    {reportData.top_senders.length === 0 && (
                      <tr><td colSpan="2" className="px-6 py-3 text-center text-gray-500">{isRTL ? 'لا توجد بيانات' : 'No data'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className={`backdrop-blur-md rounded-2xl border overflow-hidden ${panelClass}`}>
        <div className="p-6 border-b border-theme-border dark:border-gray-700/50 flex items-center justify-between">
           <h3 className={`text-lg font-bold ${isLight ? 'text-black' : 'text-white'}`}>{isRTL ? 'سجل الحركات' : 'Transaction Log'}</h3>
           <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
                <Download size={16} />
                {isRTL ? 'تصدير' : 'Export'}
            </button>
        </div>
        
        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 p-4">
          {reportData.transactions.length > 0 ? (
            reportData.transactions.map((tx) => (
              <div
                key={tx.id}
                className={`border rounded-xl p-4 shadow-sm ${
                  isLight
                    ? 'bg-white border-blue-100/90 shadow-[0_8px_22px_rgba(30,64,175,0.10)]'
                    : 'bg-white/5 border-theme-border dark:border-gray-700/50'
                }`}
              >
                <div className="flex justify-between items-start mb-3 border-b border-gray-100 dark:border-gray-700/50 pb-2">
                   <span className="text-xs text-gray-400">{tx.date}</span>
                   <span className="font-bold text-blue-600 dark:text-blue-400">{tx.count} {isRTL ? 'عملاء' : 'Leads'}</span>
                </div>
                
                <div className="space-y-3 text-sm">
                   <div className="flex justify-between items-center">
                     <span className="text-gray-500 dark:text-gray-400 text-xs">{isRTL ? 'بواسطة' : 'By'}:</span>
                     <span className={`${isLight ? 'text-black' : 'text-white'} font-medium text-xs`}>{tx.by_user?.name || 'System'}</span>
                   </div>
                   
                   {/* Manager Flow */}
	                    <div className={`grid grid-cols-2 gap-3 p-2.5 rounded-lg border ${isLight ? 'bg-blue-50/60 border-blue-100/90' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/30'}`}>
                      <div>
                         <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">{isRTL ? 'من المدير' : 'From Manager'}</span>
                         <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-gray-200 truncate block`}>{tx.from_user?.manager?.name || '-'}</span>
                      </div>
                      <div className="text-right rtl:text-left">
                         <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">{isRTL ? 'إلى المدير' : 'To Manager'}</span>
                         <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-gray-200 truncate block`}>{tx.to_user?.manager?.name || '-'}</span>
                      </div>
                   </div>

                   {/* Sales Flow */}
	                   <div className={`grid grid-cols-2 gap-3 p-2.5 rounded-lg border ${isLight ? 'bg-blue-50/60 border-blue-100/90' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/30'}`}>
                      <div>
                         <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">{isRTL ? 'من البائع' : 'From Sales'}</span>
                         <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-gray-200 truncate block`}>{tx.from_user?.name || <span className="text-gray-400 italic">Unassigned</span>}</span>
                      </div>
                      <div className="text-right rtl:text-left">
                         <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">{isRTL ? 'إلى البائع' : 'To Sales'}</span>
                         <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-gray-200 truncate block`}>{tx.to_user?.name || <span className="text-gray-400 italic">Unassigned</span>}</span>
                      </div>
                   </div>

                   {/* Stage Flow */}
                    <div className="flex items-center gap-2 text-xs pt-1">
	                      <span className={`px-2 py-1 rounded font-medium truncate max-w-[45%] ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{tx.stage_before}</span>
	                      <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
	                      <span className={`px-2 py-1 rounded font-medium truncate max-w-[45%] ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'}`}>{tx.stage_after}</span>
                   </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {isRTL ? 'لا توجد بيانات متاحة' : 'No reassignment data found'}
            </div>
          )}
        </div>
        
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right">
	            <thead className={`text-xs uppercase ${isLight ? 'bg-blue-50/80 text-slate-700' : 'bg-white/5 dark:bg-white/5'}`}>
              <tr>
                <th className="px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'التاريخ' : 'Date'}</th>
                <th className="px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'بواسطة' : 'By'}</th>
                <th className="px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'من المدير' : 'From Manager'}</th>
                <th className="px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'إلى المدير' : 'To Manager'}</th>
                <th className="px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'من البائع' : 'From Sales'}</th>
                <th className="px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'إلى البائع' : 'To Sales'}</th>
                <th className="px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'المرحلة بعد' : 'Stage After'}</th>
                <th className="px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'المرحلة قبل' : 'Stage Before'}</th>
                <th className="px-6 py-4 font-medium border-b border-theme-border dark:border-gray-700/50">{isRTL ? 'عدد العملاء' : 'Leads Quantity'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border dark:divide-gray-700/50">
              {reportData.transactions.length > 0 ? (
                reportData.transactions.map((tx) => (
	                  <tr key={tx.id} className={`transition-colors ${isLight ? 'hover:bg-blue-50/70' : 'hover:bg-white/5 dark:hover:bg-white/5'}`}>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {tx.date}
                    </td>
                    <td className={`px-6 py-4 ${isLight ? 'text-black' : 'text-white'} dark:text-gray-300`}>
                      {tx.by_user?.name || 'System'}
                    </td>
                    <td className={`px-6 py-4 ${isLight ? 'text-black' : 'text-white'} dark:text-gray-300`}>
                      {tx.from_user?.manager?.name || '-'}
                    </td>
                    <td className={`px-6 py-4 ${isLight ? 'text-black' : 'text-white'} dark:text-gray-300`}>
                      {tx.to_user?.manager?.name || '-'}
                    </td>
                    <td className={`px-6 py-4 ${isLight ? 'text-black' : 'text-white'} dark:text-gray-300`}>
                      {tx.from_user?.name || <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className={`px-6 py-4 ${isLight ? 'text-black' : 'text-white'} dark:text-gray-300`}>
                      {tx.to_user?.name || <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className={`px-6 py-4 ${isLight ? 'text-black' : 'text-white'} dark:text-gray-300`}>
                      {tx.stage_after}
                    </td>
                    <td className={`px-6 py-4 ${isLight ? 'text-black' : 'text-white'} dark:text-gray-300`}>
                      {tx.stage_before}
                    </td>
                    <td className={`px-6 py-4 ${isLight ? 'text-black' : 'text-white'} dark:text-gray-300 font-bold`}>
                      {tx.quantity}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {isRTL ? 'لا توجد بيانات متاحة' : 'No reassignment data found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
	        <nav className={`flex flex-col gap-4 p-3 lg:p-4 border-t rounded-b-lg backdrop-blur-sm ${
            isLight ? 'border-blue-100/90 bg-blue-50/35' : 'border-theme-border dark:border-gray-700 dark:bg-transparent'
          }`}>
          <div className="flex lg:flex-row justify-between items-center gap-3">
            <div className={`flex flex-wrap items-center gap-2 w-full lg:w-auto text-sm font-medium ${isLight ? 'text-black' : 'text-white'}`}>
              <span>{t('Show')}</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => { 
                  setItemsPerPage(Number(e.target.value)); 
                  setCurrentPage(1); 
                }} 
	                className={`px-2 py-1 border rounded-md backdrop-blur-sm text-xs ${
                    isLight
                      ? 'text-slate-700 border-blue-200/90 bg-white'
                      : 'text-white border-theme-border dark:border-gray-600 dark:bg-transparent dark:text-white'
                  }`}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'}`}>{t('entries')}</span>
              <input
                type="text"
                placeholder={t('Go to page...')}
                value={pageSearch}
                onChange={(e) => setPageSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const page = Number(pageSearch)
                    if (page > 0 && page <= Math.ceil(totalRecords / itemsPerPage)) {
                      setCurrentPage(page)
                      setPageSearch('')
                    }
                  }
                }}
	                className={`ml-2 px-3 py-1.5 border rounded-lg backdrop-blur-sm text-xs w-full sm:w-64 lg:w-28 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 ${
                    isLight
                      ? 'text-slate-700 border-blue-200/90 bg-white placeholder:text-slate-400'
                      : 'text-white border-theme-border dark:border-gray-600 dark:bg-transparent dark:text-white dark:placeholder-gray-500'
                  }`}
              />
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
	                className={`block px-3 py-2 leading-tight border rounded-l-lg disabled:opacity-50 backdrop-blur-sm ${
                    isLight
                      ? 'text-slate-700 border-blue-200/90 bg-white hover:bg-blue-50 hover:text-blue-700'
                      : 'text-white border-theme-border dark:bg-transparent dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white'
                  }`}
              >
                <span className="sr-only">{t('Previous')}</span>
                <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
              </button>
              <span className={`text-sm font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                {t('Page')} <span className="font-semibold">{currentPage}</span> {t('of')} <span className="font-semibold">{Math.ceil(totalRecords / itemsPerPage) || 1}</span>
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalRecords / itemsPerPage)))}
                disabled={currentPage === Math.ceil(totalRecords / itemsPerPage) || totalRecords === 0}
	                className={`block px-3 py-2 leading-tight border rounded-r-lg disabled:opacity-50 backdrop-blur-sm ${
                    isLight
                      ? 'text-slate-700 border-blue-200/90 bg-white hover:bg-blue-50 hover:text-blue-700'
                      : 'text-white border-theme-border dark:bg-transparent dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white'
                  }`}
              >
                <span className="sr-only">{t('Next')}</span>
                <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default ReassignLeadsReport;
