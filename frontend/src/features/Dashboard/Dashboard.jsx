import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api as axios } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/context/ThemeProvider';
import { useAppState } from '@shared/context/AppStateProvider';
// أضف Sparkles لهذا السطر في أعلى الملف
import { Users, Sparkles, DollarSign, Briefcase, Activity,Copy,Clock,Phone,CalendarClock,TrendingUp,Timer,Flame,CheckCircle,XCircle,Target,BarChart2,FileText,PhoneOff,Calendar,Bookmark } from 'lucide-react';
import { RiBarChart2Line, RiLineChartLine, RiPieChartLine } from 'react-icons/ri';
import { SearchableSelect } from '@shared/components';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DelayLeads } from './components/DelayLeads';
import { LeadsStatsCard } from './components/PipelineStagesCards';
import ActiveCampaignsCard from './components/ActiveCampaignsCard';
import RecentPhoneCalls from './components/RecentPhoneCalls';
import { Comments } from './components/Comments';
import { LeadsAnalysisChart } from './components/LeadsAnalysisChart';
import { PipelineAnalysis } from './components/PipelineAnalysis';
import TopPerformersWidget from './components/TopPerformersWidget';
import ActiveUsersChart from './components/ActiveUsersChart';
const ICON_MAP = {
  Users: <Users className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  Copy: <Copy className="w-5 h-5" />,
  Clock: <Clock className="w-5 h-5" />,
  Phone: <Phone className="w-5 h-5" />,
  CalendarClock: <CalendarClock className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  Timer: <Timer className="w-5 h-5" />,
  Flame: <Flame className="w-5 h-5" />,
  CheckCircle: <CheckCircle className="w-5 h-5" />,
  XCircle: <XCircle className="w-5 h-5" />,
  Target: <Target className="w-5 h-5" />,
  BarChart2: <BarChart2 className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  PhoneOff: <PhoneOff className="w-5 h-5" />,
  Calendar: <Calendar className="w-5 h-5" />,
  Bookmark: <Bookmark className="w-5 h-5" />
};

// Helpers to support custom hex colors from Settings
const isHexColor = (c) => typeof c === 'string' && /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
const hexToRgb = (hex) => {
  try {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  } catch {
    return { r: 0, g: 0, b: 0 };
  }
};
const withAlpha = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Color style presets for named colors
const COLOR_STYLES = {
  blue: {
    container: 'border-blue-400 dark:border-blue-500 bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 dark:from-blue-800 dark:via-blue-700 dark:to-blue-600 shadow-blue-300/50 dark:shadow-blue-500/25',
    containerLight: 'border-blue-400 bg-gradient-to-br from-blue-100 via-blue-100 to-blue-100 backdrop-blur-sm shadow-blue-300/30',
    containerDark: 'border-blue-500 bg-transparent shadow-blue-500/25',
    patternFrom: 'from-blue-200',
    patternTo: 'to-blue-300',
    patternFromLight: 'from-blue-200/40',
    patternToLight: 'to-blue-300/30',
    iconBg: 'bg-blue-600 dark:bg-blue-500',
    iconBgLight: 'bg-blue-600/80',
    iconBgDark: 'bg-blue-500',
    badgeLightBg: 'bg-blue-100/60',
    badgeLightText: 'text-blue-700',
    badgeLightBorder: 'border-blue-300',
  },
  green: {
    container: 'border-green-400 dark:border-green-500 bg-gradient-to-br from-green-100 via-green-200 to-green-300 dark:from-green-800 dark:via-green-700 dark:to-green-600 shadow-green-300/50 dark:shadow-green-500/25',
    containerLight: 'border-green-400 bg-gradient-to-br from-green-100 via-green-100 to-green-100 backdrop-blur-sm shadow-green-300/30',
    containerDark: 'border-green-500 bg-transparent shadow-green-500/25',
    patternFrom: 'from-green-200',
    patternTo: 'to-green-300',
    patternFromLight: 'from-green-200/40',
    patternToLight: 'to-green-300/30',
    iconBg: 'bg-green-600 dark:bg-green-500',
    iconBgLight: 'bg-green-600/80',
    iconBgDark: 'bg-green-500',
    badgeLightBg: 'bg-green-100/60',
    badgeLightText: 'text-green-700',
    badgeLightBorder: 'border-green-300',
  },
  yellow: {
    container: 'border-yellow-400 dark:border-yellow-500 bg-gradient-to-br from-yellow-100 via-yellow-200 to-yellow-300 dark:from-yellow-800 dark:via-yellow-700 dark:to-yellow-600 shadow-yellow-300/50 dark:shadow-yellow-500/25',
    containerLight: 'border-yellow-400 bg-gradient-to-br from-yellow-100 via-yellow-100 to-yellow-100 backdrop-blur-sm shadow-yellow-300/30',
    containerDark: 'border-yellow-500 bg-transparent shadow-yellow-500/25',
    patternFrom: 'from-yellow-200',
    patternTo: 'to-yellow-300',
    patternFromLight: 'from-yellow-200/40',
    patternToLight: 'to-yellow-300/30',
    iconBg: 'bg-yellow-600 dark:bg-yellow-500',
    iconBgLight: 'bg-yellow-600/80',
    iconBgDark: 'bg-yellow-500',
    badgeLightBg: 'bg-yellow-100/60',
    badgeLightText: 'text-yellow-700',
    badgeLightBorder: 'border-yellow-300',
  },
  red: {
    container: 'border-red-400 dark:border-red-500 bg-gradient-to-br from-red-100 via-red-200 to-red-300 dark:from-red-800 dark:via-red-700 dark:to-red-600 shadow-red-300/50 dark:shadow-red-500/25',
    containerLight: 'border-red-400 bg-gradient-to-br from-red-100 via-red-100 to-red-100 backdrop-blur-sm shadow-red-300/30',
    containerDark: 'border-red-500 bg-transparent shadow-red-500/25',
    patternFrom: 'from-red-200',
    patternTo: 'to-red-300',
    patternFromLight: 'from-red-200/40',
    patternToLight: 'to-red-300/30',
    iconBg: 'bg-red-600 dark:bg-red-500',
    iconBgLight: 'bg-red-600/80',
    iconBgDark: 'bg-red-500',
    badgeLightBg: 'bg-red-100/60',
    badgeLightText: 'text-red-700',
    badgeLightBorder: 'border-red-300',
  },
  purple: {
    container: 'border-purple-400 dark:border-purple-500 bg-gradient-to-br from-purple-100 via-purple-200 to-purple-300 dark:from-purple-800 dark:via-purple-700 dark:to-purple-600 shadow-purple-300/50 dark:shadow-purple-500/25',
    containerLight: 'border-purple-400 bg-gradient-to-br from-purple-100 via-purple-100 to-purple-100 backdrop-blur-sm shadow-purple-300/30',
    containerDark: 'border-purple-500 bg-transparent shadow-purple-500/25',
    patternFrom: 'from-purple-200',
    patternTo: 'to-purple-300',
    patternFromLight: 'from-purple-200/40',
    patternToLight: 'to-purple-300/30',
    iconBg: 'bg-purple-600 dark:bg-purple-500',
    iconBgLight: 'bg-purple-600/80',
    iconBgDark: 'bg-purple-500',
    badgeLightBg: 'bg-purple-100/60',
    badgeLightText: 'text-purple-700',
    badgeLightBorder: 'border-purple-300',
  },
  orange: {
    container: 'border-orange-400 dark:border-orange-500 bg-gradient-to-br from-orange-100 via-orange-200 to-orange-300 dark:from-orange-800 dark:via-orange-700 dark:to-orange-600 shadow-orange-300/50 dark:shadow-orange-500/25',
    containerLight: 'border-orange-400 bg-gradient-to-br from-orange-100 via-orange-100 to-orange-100 backdrop-blur-sm shadow-orange-300/30',
    containerDark: 'border-orange-500 bg-transparent shadow-orange-500/25',
    patternFrom: 'from-orange-200',
    patternTo: 'to-orange-300',
    patternFromLight: 'from-orange-200/40',
    patternToLight: 'to-orange-300/30',
    iconBg: 'bg-orange-600 dark:bg-orange-500',
    iconBgLight: 'bg-orange-600/80',
    iconBgDark: 'bg-orange-500',
    badgeLightBg: 'bg-orange-100/60',
    badgeLightText: 'text-orange-700',
    badgeLightBorder: 'border-orange-300',
  },
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { theme, resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { user, canAccess, crmSettings } = useAppState();
  const roleLower = String(user?.role || '').toLowerCase();
  const emailLower = String(user?.email || '').toLowerCase();
  const isSuperAdmin =
    !!user?.is_super_admin ||
    roleLower === 'owner' ||
    roleLower.includes('super admin') ||
    roleLower.includes('superadmin') ||
    emailLower === 'system@besouhoula.com' ||
    emailLower === 'admin@example.com' ||
    emailLower === 'admin@besouhoula.com';
  const isAdmin = roleLower === 'admin';
  const isTeamLeader = roleLower.includes('team leader');
  const isSalesManager = roleLower.includes('sales manager');
  const isBranchManager = roleLower.includes('branch manager');
  const isSalesAdmin = roleLower.includes('sales admin');
  const isSalesDirector = roleLower.includes('sales director') || roleLower.includes('director');
  const isOperationsManager = roleLower.includes('operations manager') || roleLower.includes('operation manager');
  const isTenantAdmin = roleLower === 'tenant admin' || roleLower === 'tenant-admin';
  
  // Use consistent logic with Leads.jsx for viewing duplicates
  const allowedDuplicateRoles = [
    'admin',
    'tenant admin',
    'tenant-admin',
  ];
  
  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {};
  const leadModulePerms = Array.isArray(modulePermissions.Leads) ? modulePermissions.Leads : [];
  const hasExplicitDupPerm = leadModulePerms.includes('viewDuplicateLeads');

  // Hide Pending leads for Sales Person (report requirement)
  // The 'Pending' stage logic should be handled in LeadsStatsCard or data fetching
  // But generally, Dashboard should reflect what user sees.
  // We will pass `isSalesPerson` to child components if needed, or handle filtering here.
  
  const [userRoles, setUserRoles] = useState([]);

  useEffect(() => {
    if (isSuperAdmin) {
      navigate('/system/dashboard', { replace: true });
    }
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data } = await axios.get('/api/user');
        const roles = Array.isArray(data?.roles)
          ? data.roles.map(r => (r?.name || String(r))).map(s => String(s).toLowerCase())
          : [];
        setUserRoles(roles);
      } catch {}
    };
    fetchRoles();
  }, []);
  const userRolesFromUser = Array.isArray(user?.roles)
    ? user.roles.map(r => String(r?.name || r)).map(s => String(s).toLowerCase())
    : [];
  const isSalesPerson = roleLower.includes('sales person') || roleLower.includes('salesperson') || userRoles.includes('sales person') || userRoles.includes('sales_person') || userRoles.includes('salesperson') || userRolesFromUser.includes('sales person') || userRolesFromUser.includes('sales_person') || userRolesFromUser.includes('salesperson');
  const isDuplicateAllowed =
    isAdmin || isTenantAdmin ||
    hasExplicitDupPerm;
  const canViewAllLeads = canAccess('leads', 'view_all_leads');
  const canViewOwnLeads = canAccess('leads', 'view_own_leads');
  const showSalesLimited = isSalesPerson || (!canViewAllLeads && canViewOwnLeads);
  useEffect(() => {
    if (showSalesLimited) {
      setSelectedManager('');
      setSelectedEmployee(String(user?.id || ''));
    }
  }, [showSalesLimited, user]);
  const isManagerOrAbove = isSuperAdmin || isAdmin || isTeamLeader || isSalesManager || isBranchManager || isSalesAdmin;
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedManager, setSelectedManager] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [isMobileQuick, setIsMobileQuick] = useState(false);
  const [showAllQuick, setShowAllQuick] = useState(false);
  const [isDesktopQuick, setIsDesktopQuick] = useState(false);
  const [showAllDesktopQuick, setShowAllDesktopQuick] = useState(false);
  const [filtersOpenMobile, setFiltersOpenMobile] = useState(true);
  const [quickOpenMobile, setQuickOpenMobile] = useState(true);
  const [leadsAnalysisOpenMobile, setLeadsAnalysisOpenMobile] = useState(true);
  const [pipelineAnalysisOpenMobile, setPipelineAnalysisOpenMobile] = useState(true);
  const [delayLeadsOpenMobile, setDelayLeadsOpenMobile] = useState(true);
  const [bestOpenMobile, setBestOpenMobile] = useState(true);
  const [commentsOpenMobile, setCommentsOpenMobile] = useState(true);
  const [recentCallsOpenMobile, setRecentCallsOpenMobile] = useState(true);
  const [selectedStageFilter, setSelectedStageFilter] = useState('');
  const [bestAgentFilter, setBestAgentFilter] = useState('all');
  const [selectedMeasure, setSelectedMeasure] = useState('Count');
  const [activeFilter, setActiveFilter] = useState('active');
  const [yearFilter, setYearFilter] = useState('2025');
  const [stageDefs, setStageDefs] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [managerOptions, setManagerOptions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const byId = useMemo(() => new Map(allUsers.map(u => [String(u.id), u])), [allUsers]);
  const effectiveEmployeeId = (selectedEmployee || selectedManager || '').trim();
  const effectiveEmployeeName = effectiveEmployeeId ? (byId.get(String(effectiveEmployeeId))?.name || '') : '';
  const subordinateSalespersonIds = useMemo(() => {
    if (!isTeamLeader || !user?.id) return [];
    const res = [];
    const queue = [Number(user.id)];
    const visited = new Set();
    while (queue.length) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      for (const u of allUsers) {
        if (Number(u.manager_id) === Number(currentId)) {
          const r = String(u.role || '').toLowerCase();
          if (r.includes('sales person') || r.includes('salesperson')) {
            res.push(Number(u.id));
          } else {
            queue.push(Number(u.id));
          }
        }
      }
    }
    return res;
  }, [isTeamLeader, user, allUsers]);
  const subordinateSalespersons = useMemo(() => {
    return subordinateSalespersonIds.map(id => byId.get(String(id))).filter(Boolean);
  }, [subordinateSalespersonIds, byId]);



  const [bestAgents, setBestAgents] = useState([]);
  const [activeUsersData, setActiveUsersData] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const fetchActiveUsers = async () => {
      try {
        const params = {
            date_from: dateFrom,
            date_to: dateTo,
            manager_id: (selectedManager || '').trim() || undefined
        };
        const { data } = await axios.get('/api/dashboard-data/active-users', { params });
        if (!cancelled && Array.isArray(data)) {
            const transformed = data.map(u => {
                const lastSeen = u.last_active ? new Date(u.last_active) : null;
                const isOnline = lastSeen && (new Date() - lastSeen < 15 * 60 * 1000); // 15 mins threshold
                return {
                    name: u.name,
                    active: isOnline,
                    lastSeen: lastSeen,
                    role: u.role,
                    avatar: u.avatar,
                    actions_count: u.actions_count
                };
            });
            setActiveUsersData(transformed);
        }
      } catch (e) {
        console.error("Failed to fetch active users", e);
      }
    };
    fetchActiveUsers();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, selectedManager, refreshTrigger]);

  useEffect(() => {
    let cancelled = false;
    const fetchBest = async () => {
      try {
        const { data } = await axios.get('/api/dashboard-data/top-agents', { params: { range: bestAgentFilter } });
        if (!cancelled && Array.isArray(data)) setBestAgents(data);
      } catch {
        const fallback = [
          { id: 1, name: 'Top Agent', avatar: '', score: 100, isCrowned: true },
          { id: 2, name: 'Second Agent', avatar: '', score: 80, isCrowned: false },
          { id: 3, name: 'Third Agent', avatar: '', score: 60, isCrowned: false },
        ];
        if (!cancelled) setBestAgents(fallback);
      }
    };
    fetchBest();
    return () => { cancelled = true; };
  }, [bestAgentFilter]);
  const currentBestAgents = bestAgents || [];
  const topBestAgent = currentBestAgents[0];

  // Load pipeline stages with colors/icons from Settings
  const defaultIconForName = (name) => {
    const key = (name || '').toLowerCase();
    if (key.includes('convert')) return <CheckCircle className="w-5 h-5" />;
    if (key.includes('progress')) return <Clock className="w-5 h-5" />;
    if (key.includes('lost')) return <XCircle className="w-5 h-5" />;
    if (key.includes('new')) return <Sparkles className="w-5 h-5" />;
    if (key.includes('qual')) return <Target className="w-5 h-5" />;
    return <BarChart2 className="w-5 h-5" />;
  };

  const resolveIcon = (icon, name) => {
    if (icon && ICON_MAP[icon]) return ICON_MAP[icon];
    if (icon) return icon;
    return defaultIconForName(name);
  };

  const defaultColorForName = (name) => {
    const key = (name || '').toLowerCase();
    if (key.includes('convert')) return 'green';
    if (key.includes('progress')) return 'yellow';
    if (key.includes('lost')) return 'red';
    if (key.includes('new')) return 'blue';
    if (key.includes('qual')) return 'purple';
    return 'blue';
  };
  
  // New states for Leads Analysis
  const [leadsChartType, setLeadsChartType] = useState('bar');
  const [leadsDataType, setLeadsDataType] = useState('monthly');
  const [leadsStatusFilter, setLeadsStatusFilter] = useState('all');
  const [leadsSourceFilter, setLeadsSourceFilter] = useState('all');

  const chartData = {
    Count: [
      { label: 'April 2025', value: 25, color: 'bg-blue-500' },
      { label: 'May 2025', value: 28, color: 'bg-blue-500' },
      { label: 'June 2025', value: 15, color: 'bg-blue-500' },
      { label: 'July 2025', value: 20, color: 'bg-blue-500' },
      { label: 'August 2025', value: 42, color: 'bg-blue-500' },
      { label: 'September 2025', value: 90, color: 'bg-blue-500' }
    ],
    'Days to Assign': [
      { label: 'April 2025', value: 3.2, color: 'bg-green-500' },
      { label: 'May 2025', value: 2.8, color: 'bg-green-500' },
      { label: 'June 2025', value: 4.1, color: 'bg-green-500' },
      { label: 'July 2025', value: 3.7, color: 'bg-green-500' },
      { label: 'August 2025', value: 2.5, color: 'bg-green-500' },
      { label: 'September 2025', value: 1.8, color: 'bg-green-500' }
    ],
    'Expected Revenue': [
      { label: 'April 2025', value: 125000, color: 'bg-purple-500' },
      { label: 'May 2025', value: 145000, color: 'bg-purple-500' },
      { label: 'June 2025', value: 98000, color: 'bg-purple-500' },
      { label: 'July 2025', value: 112000, color: 'bg-purple-500' },
      { label: 'August 2025', value: 189000, color: 'bg-purple-500' },
      { label: 'September 2025', value: 234000, color: 'bg-purple-500' }
    ]
  };

  const getCurrentChartData = () => {
    return chartData[selectedMeasure] || chartData.Count;
  };

  const getChartMax = () => {
    const currentData = getCurrentChartData();
    return Math.max(...currentData.map(d => d.value));
  };

  // يعرض بيانات الرسم مع تعديل سنة الملصقات حسب المرشح الحالي
  const getDisplayChartData = () => {
    if (analysisData && analysisData.monthly) {
        return analysisData.monthly.map(d => {
          let val = 0;
          if (selectedMeasure === 'Expected Revenue') {
             val = d.revenue || 0;
          } else {
             val = d.value || 0;
          }
          
          return {
            label: `${d.label} ${d.month.split('-')[0]}`,
            value: Number(val),
            color: selectedMeasure === 'Expected Revenue' ? 'bg-purple-500' : 'bg-blue-500'
          };
        });
    }

    const current = getCurrentChartData();
    return current.map(d => ({
      ...d,
      label: d.label.replace(/\b\d{4}\b/, yearFilter)
    }));
  };

  const formatValue = (value, measure) => {
    if (measure === 'Expected Revenue') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    if (measure === 'Days to Assign' || measure === 'Days to Close') {
      return `${value.toFixed(1)} days`;
    }
    return value.toLocaleString();
  };

  useEffect(() => {
    const handleResizeQN = () => setIsMobileQuick(window.innerWidth < 640);
    handleResizeQN();
    window.addEventListener('resize', handleResizeQN);
    return () => window.removeEventListener('resize', handleResizeQN);
  }, []);

  useEffect(() => {
    const handleResizeDesktop = () => setIsDesktopQuick(window.innerWidth >= 1024);
    handleResizeDesktop();
    window.addEventListener('resize', handleResizeDesktop);
    return () => window.removeEventListener('resize', handleResizeDesktop);
  }, []);

  useEffect(() => {
    const loadManagers = async () => {
      try {
        const roles = ['Team Leader','Sales Manager','Branch Manager','Sales Admin'];
        const { data } = await axios.get('/api/users', { params: { roles: roles.join(',') } });
        const options = Array.isArray(data) ? data.map(u => ({ id: u.id, name: u.name, role: Array.isArray(u.roles) && u.roles[0]?.name ? u.roles[0].name : (u.role || '') })) : [];
        setManagerOptions(options);
      } catch {}
    };
    loadManagers();
  }, []);
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const { data } = await axios.get('/api/users');
        const users = Array.isArray(data) ? data.map(u => ({ id: u.id, name: u.name, role: Array.isArray(u.roles) && u.roles[0]?.name ? u.roles[0].name : (u.role || ''), manager_id: u.manager_id })) : [];
        setAllUsers(users);
        setEmployeeOptions(users.map(u => ({ id: u.id, name: u.name, role: u.role })));
      } catch {}
    };
    loadAllUsers();
  }, []);
  useEffect(() => {
    const selId = (selectedManager || '').trim();
    if (!selId) {
      setEmployeeOptions(allUsers.map(u => ({ id: u.id, name: u.name, role: u.role })));
      return;
    }
    const mgr = managerOptions.find(m => String(m.id) === String(selId));
    if (!mgr) {
      setEmployeeOptions(allUsers.map(u => ({ id: u.id, name: u.name, role: u.role })));
      return;
    }
    const result = [];
    const queue = [mgr.id];
    const visited = new Set();
    while (queue.length) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      for (const u of allUsers) {
        if (u.manager_id === currentId) {
          result.push(u);
          queue.push(u.id);
        }
      }
    }
    setEmployeeOptions(result.map(u => ({ id: u.id, name: u.name, role: u.role })));
  }, [selectedManager, managerOptions, allUsers]);

  // Load stages from Database with localStorage fallback
  const [stagesLoading, setStagesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    // Optimistic load from cache
    try {
       const saved = JSON.parse(localStorage.getItem('crmStages') || '[]');
       if (Array.isArray(saved) && saved.length > 0) {
           setStageDefs(saved);
           setStagesLoading(false); // Found in cache, so not "loading" visually
       }
    } catch {}

    const fromDb = async () => {
      try {
        if (!stageDefs.length) setStagesLoading(true);
        const { data } = await axios.get('/api/stages', { params: { _t: Date.now() } });
        const validColors = new Set(['blue', 'green', 'yellow', 'red', 'purple', 'orange']);
        const normalized = Array.isArray(data)
          ? data.map((s) => {
              let c = String(s.color || '').toLowerCase();
              // If it is a valid preset, keep it. If it is a hex, keep it. 
              // Only if it is some invalid string, try to map or default.
              if (c && !validColors.has(c) && !isHexColor(c)) {
                   if (c.includes('green')) c = 'green';
                   else if (c.includes('red')) c = 'red';
                   else if (c.includes('blue')) c = 'blue';
                   else if (c.includes('yellow') || c.includes('amber')) c = 'yellow';
                   else if (c.includes('purple') || c.includes('violet')) c = 'purple';
                   else if (c.includes('orange')) c = 'orange';
                   else c = null;
              }
              // If it was a hex but normalized logic above didn't catch it (it shouldn't if isHexColor works), it stays as is.
              // We prefer the hex from DB if available.
              return {
                  name: s.name || String(s),
                  name_ar: s.name_ar,
                  color: c || defaultColorForName(s.name || String(s)),
                  icon: s.icon,
              };
            })
          : [];
        if (!cancelled) {
          setStageDefs(normalized);
          localStorage.setItem('crmStages', JSON.stringify(normalized));
        }
      } catch (e) {
        try {
          const saved = JSON.parse(localStorage.getItem('crmStages') || '[]');
          const normalized = Array.isArray(saved)
            ? (typeof saved[0] === 'string'
                ? saved.map((name) => ({ name, name_ar: null, color: defaultColorForName(name), icon: null }))
                : saved.map((s) => ({ 
                    name: s.name || String(s), 
                    name_ar: s.name_ar,
                    color: s.color || defaultColorForName(s.name || String(s)), 
                    icon: s.icon || null
                  }))
              )
            : [];
          if (!cancelled) setStageDefs(normalized);
        } catch {
          if (!cancelled) setStageDefs([]);
        }
      } finally {
        if (!cancelled) setStagesLoading(false);
      }
    };
    fromDb();
    return () => { cancelled = true; };
  }, [refreshTrigger]);





  // Fetch leads statistics from API
  const [leadsStatsData, setLeadsStatsData] = useState({
    total: 0,
    new: 0,
    duplicate: 0,
    pending: 0,
    coldCall: 0,
    byStage: {}
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const params = {
          created_from: dateFrom,
          created_to: dateTo,
          assigned_to: selectedEmployee,
          _t: Date.now() // Cache buster
        };
        const { data } = await axios.get('/api/leads/stats', { params });
        if (!cancelled) {
            setLeadsStatsData({
                total: data.total || 0,
                new: data.new || 0,
                duplicate: data.duplicate || 0,
                pending: data.pending || 0,
                coldCall: data.coldCall || 0,
                byStage: data.byStage || {}
            });
        }
      } catch (e) {
        console.error("Failed to fetch leads stats", e);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, selectedEmployee, refreshTrigger]);

  // Fetch Leads Analysis Data
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  
  useEffect(() => {
    let cancelled = false;
    const fetchAnalysis = async () => {
      try {
        setAnalysisLoading(true);
        const params = {
          created_from: dateFrom,
          created_to: dateTo,
          assigned_to: selectedEmployee || selectedManager,
          _t: Date.now() // Cache buster
        };
        const { data } = await axios.get('/api/leads/analysis', { params });
        if (!cancelled) {
          setAnalysisData(data);
        }
      } catch (e) {
        console.error("Failed to fetch leads analysis", e);
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    };
    fetchAnalysis();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, selectedEmployee, selectedManager, refreshTrigger]);

  // Use API data
  const leadsStats = leadsStatsData;

  const quickNumbersBase = [
    {
      title: i18n.language === 'ar' ? 'أجمالى العملاء' : 'All Leads',
      value: leadsStats.total.toLocaleString(),
      icon: <Users className="w-6 h-6" />,
      color: 'text-blue-800',
      bgColor: 'bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 dark:from-blue-800 dark:via-blue-700 dark:to-blue-600',
      borderColor: 'border-blue-400 dark:border-blue-500',
      iconBg: 'bg-blue-600 dark:bg-blue-500',
      glowColor: 'shadow-blue-300/50 dark:shadow-blue-500/25',
      accentColor: 'from-blue-200 to-blue-300',
      subtitle: `${t('of all system leads')}`
    },
    {
      title: 'Duplicate Leads',
      key: 'duplicate',
      value: leadsStats.duplicate.toLocaleString(),
      icon: <Copy className="w-6 h-6" />,
      color: 'text-red-800',
      bgColor: 'bg-gradient-to-br from-red-100 via-red-200 to-red-300 dark:from-red-800 dark:via-red-700 dark:to-red-600',
      borderColor: 'border-red-400 dark:border-red-500',
      iconBg: 'bg-red-600 dark:bg-red-500',
      glowColor: 'shadow-red-300/50 dark:shadow-red-500/25',
      accentColor: 'from-red-200 to-red-300',
      subtitle: `${leadsStats.total > 0 ? ((leadsStats.duplicate / leadsStats.total) * 100).toFixed(1) : 0}% ${t('of all system leads')}`
    },
    {
      title: 'New Leads',
      value: leadsStats.new.toLocaleString(),
      icon: <Sparkles className="w-6 h-6" />,
      color: 'text-green-800',
      bgColor: 'bg-gradient-to-br from-green-100 via-green-200 to-green-300 dark:from-green-800 dark:via-green-700 dark:to-green-600',
      borderColor: 'border-green-400 dark:border-green-500',
      iconBg: 'bg-green-600 dark:bg-green-500',
      glowColor: 'shadow-green-300/50 dark:shadow-green-500/25',
      accentColor: 'from-green-200 to-green-300',
      subtitle: `${leadsStats.total > 0 ? ((leadsStats.new / leadsStats.total) * 100).toFixed(1) : 0}% ${t('of all system leads')}`
    },
    ...(crmSettings?.showColdCallsStage !== false ? [{
      title: 'Cold Calls',
      value: leadsStats.coldCall.toLocaleString(),
      icon: <Phone className="w-6 h-6" />,
      color: 'text-orange-800',
      bgColor: 'bg-gradient-to-br from-orange-100 via-orange-200 to-orange-300 dark:from-orange-800 dark:via-orange-700 dark:to-orange-600',
      borderColor: 'border-orange-400 dark:border-orange-500',
      iconBg: 'bg-orange-600 dark:bg-orange-500',
      glowColor: 'shadow-orange-300/50 dark:shadow-orange-500/25',
      accentColor: 'from-orange-200 to-orange-300',
      subtitle: `${leadsStats.total > 0 ? ((leadsStats.coldCall / leadsStats.total) * 100).toFixed(1) : 0}% ${t('of all system leads')}`
    }] : []),
    {
      title: i18n.language === 'ar' ? 'معلقة' : 'Pending Leads',
      key: 'pending',
      value: leadsStats.pending.toLocaleString(),
      icon: <Clock className="w-6 h-6" />,
      color: 'text-yellow-500',
      subtitle: `${leadsStats.total > 0 ? ((leadsStats.pending / leadsStats.total) * 100).toFixed(1) : 0}% ${t('of all system leads')}`
    }
  ];
  const quickNumbersFixed = quickNumbersBase.filter(card => {
    // Hide duplicate if not allowed OR if sales person
    if (card.key === 'duplicate' && !isDuplicateAllowed) return false;
    // Hide pending if sales person
    if (card.key === 'pending' && isSalesPerson) return false;
    return true;
  });

  // Dynamic cards from System Settings (Pipeline Stages)
  const fixedStageNames = new Set(['new','duplicate','pending','cold-calls','coldcalls','total']);
  const extraStageCards = (stageDefs || []).filter(s => {
    const norm = String(s?.name || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
    return !!norm && !fixedStageNames.has(norm);
  }).map(s => {
    const findCount = (name) => {
        if (!name) return 0;
        if (leadsStats.byStage[name]) return leadsStats.byStage[name];
        const target = String(name).toLowerCase().trim();
        for (const [k, v] of Object.entries(leadsStats.byStage)) {
             if (String(k).toLowerCase().trim() === target) return v;
        }
        return 0;
    }
    const count = findCount(s.name);
    const share = leadsStats.total > 0 ? ((count / leadsStats.total) * 100).toFixed(1) : 0;
    const isAr = i18n.language.startsWith('ar');
    const displayName = (isAr && s.name_ar) ? s.name_ar : s.name;
    return {
      title: displayName,
      value: count.toLocaleString(),
      icon: resolveIcon(s.icon, s.name),
      color: 'text-blue-800',
      subtitle: `${share}% ${t('of all system leads')}`,
    };
  });

  const quickNumbers = [...quickNumbersFixed, ...extraStageCards];

  const pieChartData = [
    { name: 'New', value: 400, color: '#3b82f6' },
    { name: 'Contacted', value: 300, color: '#10b981' },
    { name: 'Qualified', value: 200, color: '#f97316' },
    { name: 'Proposal', value: 150, color: '#8b5cf6' },
    { name: 'Won', value: 100, color: '#ef4444' },
    { name: 'Lost', value: 50, color: '#6b7280' },
  ];

  return (
    <>
      
      
          <div className="mt-1 mb-3">
            <div className={`relative inline-flex items-center ${i18n.language === 'ar' ? 'flex-row-reverse' : ''} gap-2`}>
              <h1 className="page-title text-2xl font-bold text-primary">{t('Dashboard')}</h1>
              <span
                aria-hidden
                className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent"
                style={{
                  width: 'calc(100% + 8px)',
                  left: i18n.language === 'ar' ? 'auto' : '-4px',
                  right: i18n.language === 'ar' ? '-4px' : 'auto',
                  bottom: '-4px'
                }}
              ></span>
            </div>
          </div>
          
          <section 
            className="p-1.5 rounded-lg shadow-md glass-panel filter-card w-full mb-3"
          >
            <style>{`
              .lm-input::placeholder{font-size:11px}
              @media (max-width:480px){.lm-input::placeholder{font-size:10px}}
            `}</style>
            {/* Filter Header */}
              <div className="flex items-center justify-between mb-1 pb-1 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 bg-blue-600 rounded-md">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                  </svg>
                  </div>
                  <h3 className={`text-[12px] font-bold ${isLight ? 'text-black' : 'text-white'}`}>
                   {t('Filters')}
                   </h3>
                </div>
                <div className="flex items-center gap-2">
                <button onClick={() => { setSelectedManager(''); setSelectedEmployee(''); setDateFrom(''); setDateTo(''); }} className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">

                  {t('Reset')}
                </button>
                <button onClick={() => setFiltersOpenMobile(v=>!v)} className="md:hidden flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                </div>
              </div>

            {/* Filter Controls */}
            {/* Mobile layout: pair inputs stacked in two columns */}
            <div className={`${filtersOpenMobile ? 'grid' : 'hidden'} grid-cols-2 gap-1.5 md:hidden`}> 
              <div className="space-y-2">
                {/* Manager Filter */}
                <div className={`${showSalesLimited ? 'hidden' : 'space-y-2'}`}>
                  <label className={`flex items-center gap-2 text-[11px] font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t('Manager')}
                  </label>
                  <SearchableSelect
                    options={managerOptions.map(u => ({ value: String(u.id), label: u.role ? `${u.name} - ${u.role}` : u.name }))}
                    value={selectedManager}
                    onChange={setSelectedManager}
                    placeholder={t('Manager')}
                    className="lm-input !w-[9rem] text-[9px] px-1 py-[2px]"
                  >
                  </SearchableSelect>
                </div>
                {/* Employees Filter */}
                <div className={`${showSalesLimited ? 'hidden' : 'space-y-2'}`}>
                  <label className={`flex items-center gap-2 text-[11px] font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {t('Employees')}
                  </label>
                  <SearchableSelect
                    options={employeeOptions.map(u => ({ value: String(u.id), label: u.role ? `${u.name} - ${u.role}` : u.name }))}
                    value={selectedEmployee}
                    onChange={setSelectedEmployee}
                    placeholder={t('Employee')}
                    className="lm-input !w-[9rem] text-[9px] px-1 py-[2px]"
                  >
                  </SearchableSelect>
                </div>
              </div>
              <div className="space-y-2">
                <div className="space-y-2">
                  <label className={`flex items-center gap-2 text-[10px] font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t('Date Range')}
                  </label>
                  <div className="w-full">
                    <DatePicker
                        popperContainer={({ children }) => createPortal(children, document.body)}
                        selectsRange={true}
                        startDate={dateFrom ? new Date(dateFrom) : null}
                        endDate={dateTo ? new Date(dateTo) : null}
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        yearDropdownItemNumber={12}
                        onChange={(update) => {
                            const [start, end] = update;
                            const formatDate = (date) => {
                                if (!date) return '';
                                const offset = date.getTimezoneOffset();
                                const localDate = new Date(date.getTime() - (offset*60*1000));
                                return localDate.toISOString().split('T')[0];
                            };
                            setDateFrom(formatDate(start));
                            setDateTo(formatDate(end));
                        }}
                        isClearable={true}
                        placeholderText={i18n.language === 'ar' ? "من - إلى" : "From - To"}
                        className="lm-input !w-full text-[9px] px-1 py-[2px]"
                        wrapperClassName="w-full"
                        dateFormat="yyyy-MM-dd"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Desktop/tablet layout: original four inputs */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-1.5">
              {/* Manager Filter */}
              <div className={`${(showSalesLimited || isTeamLeader) ? 'hidden' : 'space-y-2'}`}>
                <label className={`flex items-center gap-2 text-[11px] font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t('Manager')}
                </label>
                <SearchableSelect
                  options={managerOptions.map(u => ({ value: String(u.id), label: u.role ? `${u.name} - ${u.role}` : u.name }))}
                  value={selectedManager}
                  onChange={setSelectedManager}
                  placeholder={t('Manager')}
                  className="lm-input !w-[9rem] text-[9px] px-1 py-[2px]"
                >
                </SearchableSelect>
              </div>
              {/* Employees Filter */}
              <div className={`${showSalesLimited ? 'hidden' : 'space-y-2'}`}>
                <label className={`flex items-center gap-2 text-[11px] font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {t('Employees')}
                </label>
                <SearchableSelect
                  options={employeeOptions.map(u => ({ value: String(u.id), label: u.role ? `${u.name} - ${u.role}` : u.name }))}
                  value={selectedEmployee}
                  onChange={setSelectedEmployee}
                  placeholder={t('Employee')}
                  className="lm-input !w-[9rem] text-[9px] px-1 py-[2px]"
                >
                </SearchableSelect>
              </div>
              {/* Date Range */}
              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <label className={`flex items-center gap-2 text-[10px] font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t('Date Range')}
                </label>
                <div className="w-full">
                  <DatePicker
                      popperContainer={({ children }) => createPortal(children, document.body)}
                      selectsRange={true}
                      startDate={dateFrom ? new Date(dateFrom) : null}
                      endDate={dateTo ? new Date(dateTo) : null}
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      yearDropdownItemNumber={12}
                      onChange={(update) => {
                          const [start, end] = update;
                          const formatDate = (date) => {
                              if (!date) return '';
                              const offset = date.getTimezoneOffset();
                              const localDate = new Date(date.getTime() - (offset*60*1000));
                              return localDate.toISOString().split('T')[0];
                          };
                          setDateFrom(formatDate(start));
                          setDateTo(formatDate(end));
                      }}
                      isClearable={true}
                      placeholderText={i18n.language === 'ar' ? "من - إلى" : "From - To"}
                      className="lm-input !w-full text-[9px] px-1 py-[2px]"
                      wrapperClassName="w-full"
                      dateFormat="yyyy-MM-dd"
                  />
                </div>
              </div>
            </div>
          </section>

          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h2 className={`text-[20px] font-bold ${isLight ? 'text-gray-900' : 'bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent'}`}>{t('Quick Numbers')}</h2>
            </div>
              <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (isMobileQuick) {
                    setShowAllQuick(v => !v);
                  } else if (isDesktopQuick) {
                    setShowAllDesktopQuick(v => !v);
                  } else {
                    setShowAllQuick(v => !v);
                  }
                }}
                className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-md bg-transparent border-none shadow-none hover:bg-transparent"
              >
                {(() => {
                  const expanded = (isMobileQuick ? showAllQuick : (isDesktopQuick ? showAllDesktopQuick : showAllQuick));
                  const ChevronDown = (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  );
                  const ChevronUp = (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  );
                  return expanded ? (
                    <span className="inline-flex items-center gap-1 text-blue-600">
                      {t('Show Less')}
                      {ChevronUp}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-blue-600">
                      {t('Show More')}
                      {ChevronDown}
                    </span>
                  );
                })()}
              </button>
              <button onClick={() => setQuickOpenMobile(v=>!v)} className="md:hidden flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              </div>
          </div>
          <div className={`${quickOpenMobile ? 'grid' : 'hidden'} md:grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-10`}>
            {stagesLoading || statsLoading ? (
                // Loading Skeletons for Cards
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="relative overflow-hidden rounded-2xl p-1 h-24 bg-gray-200 dark:bg-gray-700 animate-pulse">
                     <div className="h-full w-full rounded-xl bg-gray-300 dark:bg-gray-600"></div>
                  </div>
                ))
            ) : (
            (() => {
              const findCount = (name) => {
                  if (!name) return 0;
                  if (leadsStats.byStage[name]) return leadsStats.byStage[name];
                  const target = String(name).toLowerCase().trim().replace(/[\s_]+/g, '-');
                  for (const [k, v] of Object.entries(leadsStats.byStage)) {
                       if (String(k).toLowerCase().trim().replace(/[\s_]+/g, '-') === target) return v;
                  }
                  return 0;
              };

              const newCount = leadsStats.new;
              const duplicateCount = leadsStats.duplicate;
              const pendingCount = leadsStats.pending;
              const coldCallCount = leadsStats.coldCall;
              const followUpCount = findCount('follow-up');
              const totalLeadsCount = leadsStats.total;

              const totalCard = (
                <div
                  key={'__fixed_total__'}
                  className={`relative overflow-hidden rounded-2xl p-1 group border-2 border-blue-400 bg-gradient-to-br from-blue-100 via-blue-100 to-blue-100 backdrop-blur-sm shadow-blue-300/30 shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500`}
                  onClick={() => navigate('/leads')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="absolute inset-0 opacity-15 dark:hidden">
                    <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-200/30 to-blue-300/25 rounded-full transform translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-700`}></div>
                    <div className={`absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-tr from-blue-200/30 to-blue-300/25 rounded-full transform -translate-x-10 translate-y-10 group-hover:scale-105 transition-transform duration-500`}></div>
                  </div>
                  <div className="relative z-20">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 pr-2">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider mb-0.5 block text-black`}>{t('Total Leads')}</span>
                        <div className={`text-xl font-black mb-0 tracking-tight text-gray-900`}>{totalLeadsCount}</div>
                      </div>
                      <div className={`flex items-center justify-center w-8 h-8 ${isLight ? 'bg-blue-600/80' : 'bg-blue-500'} rounded-md shadow-xl group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 border-2 border-white/30`}>
                        <Users className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                </div>
              );

              let fixedCards = [
                {
                  key: '__fixed_new__',
                  title: t('New'),
                  count: newCount,
                  percent: totalLeadsCount > 0 ? Math.round((newCount / totalLeadsCount) * 100) : 0,
                  icon: <Sparkles className="w-5 h-5" />,
                  color: 'green',
                  borderClass: 'border-green-400 dark:border-green-500',
                },
                {
                  key: '__fixed_duplicate__',
                  title: t('Duplicate'),
                  count: duplicateCount,
                  percent: totalLeadsCount > 0 ? Math.round((duplicateCount / totalLeadsCount) * 100) : 0,
                  icon: <Copy className="w-5 h-5" />,
                  color: 'red',
                  borderClass: 'border-red-400 dark:border-red-500',
                },
                {
                  key: '__fixed_pending__',
                  title: i18n.language === 'ar' ? 'معلقة' : t('Pending'),
                  count: pendingCount,
                  percent: totalLeadsCount > 0 ? Math.round((pendingCount / totalLeadsCount) * 100) : 0,
                  icon: <Clock className="w-5 h-5" />,
                  color: 'yellow',
                  borderClass: 'border-yellow-400 dark:border-yellow-500',
                },
                ...(crmSettings?.showColdCallsStage !== false ? [{
                  key: '__fixed_coldcalls__',
                  title: t('Cold Calls'),
                  count: coldCallCount,
                  percent: totalLeadsCount > 0 ? Math.round((coldCallCount / totalLeadsCount) * 100) : 0,
                  icon: <Phone className="w-5 h-5" />,
                  color: 'orange',
                  borderClass: 'border-orange-400 dark:border-orange-500',
                }] : []),
              ].map(({ key, title, count, percent, icon, color, borderClass }) => {
                const style = COLOR_STYLES[color];
                const stageKey = key === '__fixed_new__' ? 'new lead'
                  : key === '__fixed_duplicate__' ? 'duplicate'
                  : key === '__fixed_pending__' ? 'pending'
                  : key === '__fixed_coldcalls__' ? 'coldCall'
                  : '';
                return (
                  <div
                    key={key}
                    className={`relative overflow-hidden rounded-2xl p-1 group ${style.containerLight} border-2 shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 cursor-pointer ${selectedStageFilter === stageKey ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => {
                      setSelectedStageFilter(stageKey)
                      navigate(`/leads?stage=${encodeURIComponent(stageKey)}`)
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="absolute inset-0 opacity-15 dark:hidden">
                      <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${style.patternFromLight} ${style.patternToLight} rounded-full transform translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-700`}></div>
                      <div className={`absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-tr ${style.patternFromLight} ${style.patternToLight} rounded-full transform -translate-x-10 translate-y-10 group-hover:scale-105 transition-transform duration-500`}></div>
                    </div>
                    <div className="relative z-20">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 pr-2">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider mb-0.5 block text-black`}>{title}</span>
                        <div className={`text-xl font-black mb-0 tracking-tight text-gray-900`}>{count}</div>
                        </div>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-md shadow-xl group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 border-2 border-white/30 ${style.iconBgLight}`}>
                          <span className="text-white">{icon}</span>
                        </div>
                      </div>
                      <div className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-[2px] rounded-md border ${style.badgeLightBg} ${style.badgeLightText} ${style.badgeLightBorder}`}>
                        {t('Stage share of total')}: {percent}%
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                  </div>
                );
              });
              if (showSalesLimited) {
                fixedCards = fixedCards.filter(card => card.key !== '__fixed_duplicate__');
              }
              if (!isDuplicateAllowed) {
                fixedCards = fixedCards.filter(card => card.key !== '__fixed_duplicate__');
              }
              if (isSalesPerson) {
                fixedCards = fixedCards.filter(card => card.key !== '__fixed_pending__');
              }

              const normalizedFixed = new Set(['new','duplicate','pending','coldcalls']);
              const dbStageCards = (stageDefs || []).filter(s => {
                const norm = String(s?.name || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
                return !!norm && !normalizedFixed.has(norm);
              }).map(s => {
                const norm = String(s?.name || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
                const count = findCount(s.name);
                const percent = totalLeadsCount > 0 ? Math.round((count / totalLeadsCount) * 100) : 0;
                const isAr = i18n.language.startsWith('ar');
                const displayName = (isAr && s.name_ar) ? s.name_ar : s.name;
                
                let style = COLOR_STYLES[s.color];
                let isCustom = false;
                let customContainer = {};
                let customIcon = {};
                let customBadge = {};
                let customPattern1 = {};
                let customPattern2 = {};
                let iconTextColor = 'text-white';

                if (!style) {
                    style = COLOR_STYLES['blue']; // Fallback for structure
                    if (isHexColor(s.color)) {
                        isCustom = true;
                        const c = s.color;
                        customContainer = {
                             borderColor: c,
                             backgroundColor: '#ffffff',
                             backgroundImage: `linear-gradient(135deg, ${withAlpha(c, 0.15)} 0%, ${withAlpha(c, 0.05)} 100%)`,
                             boxShadow: `0 10px 25px -5px ${withAlpha(c, 0.3)}, 0 8px 10px -6px ${withAlpha(c, 0.2)}`,
                             backdropFilter: 'blur(4px)',
                             WebkitBackdropFilter: 'blur(4px)'
                         };
                        customIcon = {
                            backgroundColor: c,
                            borderColor: withAlpha(c, 0.5)
                        };
                        customBadge = {
                            backgroundColor: withAlpha(c, 0.1),
                            color: c,
                            borderColor: withAlpha(c, 0.3)
                        };
                        customPattern1 = {
                            backgroundImage: `linear-gradient(to bottom right, ${withAlpha(c, 0.2)}, transparent)`
                        };
                        customPattern2 = {
                             backgroundImage: `linear-gradient(to top right, ${withAlpha(c, 0.2)}, transparent)`
                        };

                        const { r, g, b } = hexToRgb(c);
                        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                        iconTextColor = yiq >= 160 ? 'text-black' : 'text-white';
                    }
                }

                return (
                  <div
                    key={`__db_${norm}__`}
                    className={`relative overflow-hidden rounded-2xl p-1 group ${style.containerLight} border-2 shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 cursor-pointer ${selectedStageFilter === norm ? 'ring-2 ring-blue-500' : ''}`}
                    style={customContainer}
                    onClick={() => {
                      setSelectedStageFilter(norm);
                      navigate(`/leads?stage=${encodeURIComponent(norm)}`);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="absolute inset-0 opacity-15 dark:hidden">
                      <div 
                        className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${style.patternFromLight} ${style.patternToLight} rounded-full transform translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-700`}
                        style={customPattern1}
                      ></div>
                      <div 
                        className={`absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-tr ${style.patternFromLight} ${style.patternToLight} rounded-full transform -translate-x-10 translate-y-10 group-hover:scale-105 transition-transform duration-500`}
                        style={customPattern2}
                      ></div>
                    </div>
                    <div className="relative z-20">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 pr-2">
                          <span className={`text-[11px] font-semibold uppercase tracking-wider mb-0.5 block text-black`}>{displayName}</span>
                          <div className={`text-xl font-black mb-0 tracking-tight text-gray-900`}>{count}</div>
                        </div>
                        <div 
                            className={`flex items-center justify-center w-8 h-8 rounded-md shadow-xl group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 border-2 border-white/30 ${style.iconBgLight}`}
                            style={customIcon}
                        >
                          <span className={iconTextColor}>{resolveIcon(s.icon, s.name)}</span>
                        </div>
                      </div>
                      <div 
                        className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-[2px] rounded-md border ${style.badgeLightBg} ${style.badgeLightText} ${style.badgeLightBorder}`}
                        style={customBadge}
                      >
                        {t('Stage share of total')}: {percent}%
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                  </div>
                );
              });

              const cards = [totalCard, ...fixedCards, ...dbStageCards];
              const showMore = isMobileQuick ? showAllQuick : (isDesktopQuick ? showAllDesktopQuick : showAllQuick);
              // Show 1 row: 5 cards for desktop (lg), 2 for mobile/tablet
              const initialCount = isDesktopQuick ? 5 : 2;
              const displayed = showMore ? cards : cards.slice(0, initialCount);
              return displayed;
            })())}
          </div>
          <section className={`${(showSalesLimited && !isSalesPerson) ? 'grid grid-cols-1' : 'grid grid-cols-1 lg:grid-cols-3'} gap-4 mb-12 mt-8`}>
            <div className="lg:col-span-2">
              <div className="p-4 glass-panel h-full overflow-auto rounded-lg shadow-md">
                <div className="section-header flex items-center w-full justify-between gap-2 mb-3">
                  <h3 className={`flex-1 text-xl font-semibold text-primary ${i18n.dir() === 'rtl' ? 'text-right' : 'text-left'}`}>{t('Delay Leads')}</h3>
                  <button onClick={() => setDelayLeadsOpenMobile(v=>!v)} className="close-btn md:hidden flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>
                <div className={`${delayLeadsOpenMobile ? 'block' : 'hidden'} md:block`}>
                  <DelayLeads dateFrom={dateFrom} dateTo={dateTo} selectedEmployee={selectedEmployee || selectedManager} selectedEmployeeName={effectiveEmployeeName} stageFilter={selectedStageFilter} />
                </div>
              </div>
            </div>
              <div className={`${showSalesLimited && !isSalesPerson ? 'hidden' : 'lg:col-span-1'}`}>
              <TopPerformersWidget />
            </div>
          </section>

          {/* Last Comments & Recent Phone Calls (moved up) */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <div className="p-4 glass-panel rounded-lg shadow-md lg:col-span-2">
              <div className="section-header flex items-center w-full justify-between gap-2 mb-4">
                <h3 className={`flex-1 text-2xl font-bold text-primary ${i18n.dir() === 'rtl' ? 'text-right' : 'text-left'}`}>{t('Last Comments')}</h3>
                <button onClick={() => setCommentsOpenMobile(v=>!v)} className="close-btn md:hidden flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
              <div className={`${commentsOpenMobile ? 'block' : 'hidden'} md:block`}>
              <Comments employee={effectiveEmployeeName} employeeIds={(isTeamLeader && subordinateSalespersonIds.length) ? subordinateSalespersonIds : ((effectiveEmployeeId && !showSalesLimited) ? [Number(effectiveEmployeeId)] : [])} dateFrom={dateFrom} dateTo={dateTo} stageFilter={selectedStageFilter} managerId={(isTeamLeader && !effectiveEmployeeId) ? Number(user?.id || 0) : undefined} />
              </div>
            </div>
            <div className="p-4 glass-panel rounded-lg shadow-md lg:col-span-1">
              <div className="section-header flex items-center w-full justify-between gap-2 mb-4">
                <h3 className={`flex-1 text-2xl font-bold text-primary ${i18n.dir() === 'rtl' ? 'text-right' : 'text-left'}`}>{t('Recent Phone Calls')}</h3>
                <button onClick={() => setRecentCallsOpenMobile(v=>!v)} className="close-btn md:hidden flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
              <div className={`${recentCallsOpenMobile ? 'block' : 'hidden'} md:block`}>
                <RecentPhoneCalls employee={effectiveEmployeeName} employeeIds={(isTeamLeader && subordinateSalespersonIds.length) ? subordinateSalespersonIds : ((effectiveEmployeeId && !showSalesLimited) ? [Number(effectiveEmployeeId)] : [])} dateFrom={dateFrom} dateTo={dateTo} stageFilter={selectedStageFilter} managerId={(isTeamLeader && !effectiveEmployeeId) ? Number(user?.id || 0) : undefined} />
              </div>
            </div>
          </section>
          {/* Leads Status (3), Active Users (4), Active Campaigns (5) in 12 cols - moved above Leads Analysis */}
          <div className={`${showSalesLimited ? 'grid grid-cols-1' : 'grid grid-cols-1 lg:grid-cols-12'} gap-4 mb-10 items-stretch`}>
            {/* Active Users (first) */}
            <div className={`${showSalesLimited ? 'hidden' : 'p-3 glass-panel rounded-lg shadow-md lg:col-span-4 h-[550px]'}`}>
              <ActiveUsersChart users={activeUsersData} />
            </div>

            {/* Leads Status (second) */}
            <div className={`${showSalesLimited ? 'hidden' : 'p-3 glass-panel rounded-lg shadow-md lg:col-span-3 h-full flex flex-col min-h-0'}`}>
              <div dir={i18n.dir() === 'rtl' ? 'rtl' : 'ltr'} className={`section-header flex items-center w-full ${i18n.dir() === 'rtl' ? 'flex-row-reverse' : ''} gap-2 mb-2 rounded-md p-2 ${isLight ? 'bg-gray-100 border border-gray-200 shadow-sm' : 'bg-gray-800/40 border border-gray-700 shadow-sm'}`}>
                <div className={`p-1.5 rounded-md ${isLight ? 'bg-blue-100 border border-blue-200' : 'bg-gray-700 border border-gray-600'}`}>
                  <RiBarChart2Line className={`${isLight ? 'text-blue-600' : 'text-blue-300'} w-4 h-4`} />
                </div>
                <h3 className={`flex-1 text-lg font-bold text-primary ${i18n.dir() === 'rtl' ? 'text-right' : 'text-left'}`}>{t('Leads Status')}</h3>
              </div>

              <div className={`flex-1 min-h-0 grid grid-cols-1 gap-2 text-black`}>
                <div className={`p-3 rounded-lg bg-white border border-gray-200 shadow-sm`}>
                  <LeadsStatsCard
                    title={t('Total Leads')}
                    value={leadsStats.total.toLocaleString()}
                    change="-"
                    changeType="neutral"
                    icon={<Users className="w-5 h-5" />}
                    color="bg-blue-500"
                    compact
                  />
                </div>
                <div className={`p-3 rounded-lg bg-white border border-gray-200 shadow-sm`}>
                  <LeadsStatsCard
                    title={t('Conversion Rate')}
                    value="-"
                    change="-"
                    changeType="neutral"
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="bg-green-500"
                    compact
                  />
                </div>
                <div className={`p-3 rounded-lg bg-white border border-gray-200 shadow-sm`}>
                  <LeadsStatsCard
                    title={t('Avg Response Time')}
                    value="-"
                    change="-"
                    changeType="neutral"
                    icon={<Timer className="w-5 h-5" />}
                    color="bg-purple-500"
                    compact
                  />
                </div>
                <div className={`p-3 rounded-lg bg-white border border-gray-200 shadow-sm`}>
                  <LeadsStatsCard
                    title={t('Hot Leads')}
                    value={(leadsStats.byStage['hot'] || 0).toLocaleString()}
                    change="-"
                    changeType="neutral"
                    icon={<Flame className="w-5 h-5" />}
                    color="bg-red-500"
                    compact
                  />
                </div>
              </div>
            </div>

            {/* Active Campaigns */}
            <div className={`${showSalesLimited ? 'hidden' : 'p-3 glass-panel rounded-lg shadow-md lg:col-span-5 h-full'}`}>
              <ActiveCampaignsCard employee={effectiveEmployeeName} dateFrom={dateFrom} dateTo={dateTo} />
            </div>
          </div>
          {/* Leads Analysis Section (Toolbar style like screenshot) */}
          <div className="grid grid-cols-1 gap-4 mb-12">
            <div className="col-span-1 p-4 glass-panel rounded-lg shadow-md">
              <div className="section-header flex items-center w-full justify-between gap-2 mb-3">
                <h3 className={`flex-1 text-2xl font-bold text-primary ${i18n.dir() === 'rtl' ? 'text-right' : 'text-left'}`}>{t('Leads Analysis')}</h3>
                <button onClick={() => setLeadsAnalysisOpenMobile(v=>!v)} className="close-btn md:hidden flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>

              {/* Top toolbar (chart type only) */}
              <div className={`${leadsAnalysisOpenMobile ? 'flex' : 'hidden'} md:flex flex-wrap items-center gap-2 mb-3 justify-end`}>
                <span className={`${isLight ? 'text-blue-700 font-semibold' : 'dark:text-gray-300'} text-sm`}>
                  {leadsChartType === 'bar'
                    ? (i18n.language === 'ar' ? 'رسم بياني عمودي' : 'Bar Chart')
                    : leadsChartType === 'stackedBar'
                      ? (i18n.language === 'ar' ? 'رسم بياني عمودي مكدس' : 'Stacked Bar Chart')
                      : leadsChartType === 'line'
                        ? (i18n.language === 'ar' ? 'رسم بياني خطي' : 'Line Chart')
                        : (i18n.language === 'ar' ? 'رسم بياني دائري' : 'Pie Chart')}
                </span>
                {/* Chart type buttons - Enhanced Design */}
                <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  {/* Bar Chart Button */}
                  <button 
                    onClick={() => setLeadsChartType('bar')} 
                    className={`
                      group relative flex items-center justify-center px-2 py-1 sm:px-3 sm:py-2 rounded-md transition-all duration-300 ease-in-out
                      ${leadsChartType === 'bar' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105' 
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-600 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                      }
                      border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500
                    `}
                    title={i18n.language === 'ar' ? 'رسم بياني عمودي' : 'Bar Chart'}
                  >
                    <RiBarChart2Line className="w-3 h-3 sm:w-4 sm:h-4" />
                    {leadsChartType === 'bar' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </button>


                  {/* Line Chart Button */}
                  <button 
                    onClick={() => setLeadsChartType('line')} 
                    className={`
                      group relative flex items-center justify-center px-2 py-1 sm:px-3 sm:py-2 rounded-md transition-all duration-300 ease-in-out
                      ${leadsChartType === 'line' 
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 scale-105' 
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-600 hover:text-purple-600 dark:hover:text-purple-400 hover:scale-105'
                      }
                      border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500
                    `}
                    title={i18n.language === 'ar' ? 'رسم بياني خطي' : 'Line Chart'}
                  >
                    <RiLineChartLine className="w-3 h-3 sm:w-4 sm:h-4" />
                    {leadsChartType === 'line' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-500 rounded-full"></div>
                    )}
                  </button>

                  {/* Pie Chart Button */}
                  <button 
                    onClick={() => setLeadsChartType('pie')} 
                    className={`
                      group relative flex items-center justify-center px-2 py-1 sm:px-3 sm:py-2 rounded-md transition-all duration-300 ease-in-out
                      ${leadsChartType === 'pie' 
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 scale-105' 
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-600 hover:text-orange-600 dark:hover:text-orange-400 hover:scale-105'
                      }
                      border border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500
                    `}
                    title={i18n.language === 'ar' ? 'رسم بياني دائري' : 'Pie Chart'}
                  >
                    <RiPieChartLine className="w-3 h-3 sm:w-4 sm:h-4" />
                    {leadsChartType === 'pie' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full"></div>
                    )}
                  </button>
                </div>

                

              </div>

              {/* Removed filter chips row per request */}

              {/* Chart */}
              <div className={`${leadsAnalysisOpenMobile ? 'block' : 'hidden'} md:block h-auto`}>
                <LeadsAnalysisChart 
                  data={analysisData ? analysisData.monthly : null}
                  chartType={leadsChartType}
                  filters={{ dataType: 'monthly', status: activeFilter, year: yearFilter, employee: selectedEmployee || selectedManager, dateFrom, dateTo }}
                />
              </div>
          </div>
          </div>

          <section className="grid grid-cols-1 gap-4 mt-4">
            <div className="lg:col-span-3">
              <div className="p-4 glass-panel h-full overflow-auto rounded-lg shadow-md">
                <div className="section-header flex items-center w-full justify-between gap-2 mb-4">
                  <h3 className={`flex-1 text-2xl font-bold text-primary ${i18n.dir() === 'rtl' ? 'text-right' : 'text-left'}`}>{t('Pipeline Analysis')}</h3>
                  <button onClick={() => setPipelineAnalysisOpenMobile(v=>!v)} className="close-btn md:hidden flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>
                <div className={`${pipelineAnalysisOpenMobile ? 'block' : 'hidden'} md:block`}>
                  <PipelineAnalysis selectedEmployee={effectiveEmployeeName} dateFrom={dateFrom} dateTo={dateTo} />
                </div>
              </div>
            </div>
          </section>

          
          
          {/* Leads Trend Analysis Section removed per request */}
          
          
    </>
  )
}

export default Dashboard;
