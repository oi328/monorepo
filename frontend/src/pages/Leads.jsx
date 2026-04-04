import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import { useAppState } from '@shared/context/AppStateProvider'
import { api, logExportEvent, logImportEvent } from '../utils/api'
import { useStages } from '../hooks/useStages'
import { useNavigate, useLocation } from 'react-router-dom'
 // Import the custom checkbox
import * as XLSX from 'xlsx'
import * as LucideIcons from 'lucide-react'
import { FaPlus, FaFilter, FaChevronDown, FaSearch, FaEnvelope, FaWhatsapp, FaEye, FaPhone, FaChevronLeft, FaChevronRight, FaClone, FaExchangeAlt, FaUserTie, FaUserCheck, FaTrash, FaDownload, FaList } from 'react-icons/fa'
import SearchableSelect from '../components/SearchableSelect'
import EnhancedLeadDetailsModal from '../shared/components/EnhancedLeadDetailsModal'
import ReAssignLeadModal from '../shared/components/ReAssignLeadModal'
import ImportLeadsModal from '../components/ImportLeadsModal'
import AddActionModal from '../components/AddActionModal'
import ColumnToggle from '../components/ColumnToggle'
import CompareLeadsModal from '../components/CompareLeadsModal'
import TransferSalesModal from '../components/TransferSalesModal'
import LeadModal from '../components/LeadModal'
import LeadHoverTooltip from '../components/LeadHoverTooltip'
import { useDynamicFields } from '../hooks/useDynamicFields'
import { countriesData } from '../data/countriesData'
import { getLeadModulePermissions, getLeadPermissionFlags } from '../services/leadPermissions'

export const Leads = () => {
  const { t, i18n } = useTranslation()
  const { theme: contextTheme, resolvedTheme } = useTheme()
  const theme = resolvedTheme || contextTheme
  const isLight = theme === 'light'
  const { user, company, crmSettings } = useAppState()
  const currencyCode = crmSettings?.defaultCurrency || crmSettings?.default_currency || 'EGP'
  const formatMoney = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    try {
      return new Intl.NumberFormat('en-EG', { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(n)
    } catch {
      return `${n.toLocaleString()} ${currencyCode}`
    }
  }
  const navigate = useNavigate()
  const location = useLocation()
  const { stages, statuses } = useStages()
  const { fields: dynamicFields } = useDynamicFields('leads')
  const isRtl = String(i18n.language || '').startsWith('ar')

  const maskPhoneNumber = (phone) => {
    if (!phone) return '';
    const str = String(phone);
    if (str.length < 5) return str;
    // Show first 3 digits, mask the rest until the last 2 digits or similar
    // User requested "hidden with asterisk"
    // Assuming format 010******* or similar
    // Let's keep first 3 digits visible and replace rest with *
    return str.slice(0, 3) + '*'.repeat(Math.max(0, str.length - 3));
  };

  const userRole = (user?.role || '').toLowerCase();
  const userRolesLower = Array.isArray(user?.roles)
    ? user.roles.map(r => String(r?.name || r)).map(s => String(s).toLowerCase())
    : [];
  const isSalesPerson =
    userRole.includes('sales person') ||
    userRole.includes('salesperson') ||
    userRolesLower.some(r => r.includes('sales person') || r.includes('salesperson') || r.includes('sales_person'))

  useEffect(() => {
    if (location.pathname === '/leads/my-leads' && isSalesPerson) {
      navigate('/leads', { replace: true })
    }
  }, [location.pathname, isSalesPerson, navigate])

  const renderStageIcon = (icon) => {
    if (!icon) return '📊';
    if (typeof icon !== 'string') return icon;
    
    // Check if it's a Lucide icon name
    const IconComponent = LucideIcons[icon];
    if (IconComponent) {
      return <IconComponent size={14} />;
    }
    
    // Return the string if no component found (could be an emoji)
    return icon;
  };

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {};
  const leadModulePerms = getLeadModulePermissions(user);
  const leadPermissionFlags = getLeadPermissionFlags(user);
  const canAddLead = leadPermissionFlags.canAddLead;
  const canImportLeads = leadPermissionFlags.canImportLeads;
  const canExportLeads = leadPermissionFlags.canExportLeads;
  const canAddAction = leadPermissionFlags.canAddAction;
  const canShowCreator = leadPermissionFlags.canShowCreator;

  const isDuplicateLead = (lead) => {
    if (!lead) return false;
    const st = String(lead.stage || '').toLowerCase();
    const status = String(lead.status || '').toLowerCase();
    return st === 'duplicate' || status === 'duplicate';
  };

  const getSelectedDuplicateIds = () => {
    // NOTE: this is intentionally a function (not a hook) because it appears before the state declarations.
    // Accessing leads/selectedLeads here is safe as long as we only call it after those states are initialized.
    if (!Array.isArray(selectedLeads) || selectedLeads.length === 0) return [];
    const byId = new Map((leads || []).map(l => [String(l.id || l._id), l]));
    return selectedLeads
      .map(id => String(id))
      .filter(id => isDuplicateLead(byId.get(id)));
  };

  const runBulkDuplicateAction = async (action, extra = {}) => {
    const ids = getSelectedDuplicateIds();
    if (!ids.length) return;
    try {
      await api.post('/api/leads/duplicates/bulk-action', {
        action,
        lead_ids: ids,
        ...extra,
      });

      const okEvt = new CustomEvent('app:toast', {
        detail: {
          type: 'success',
          message: isRtl ? 'تم تنفيذ الإجراء بنجاح' : 'Action completed successfully',
        },
      });
      window.dispatchEvent(okEvt);
      setSelectedLeads([]);
      setShowBulkDuplicateMenu(false);
      fetchLeads();
    } catch (e) {
      console.error('Bulk duplicate action failed', e);
      const msg = e?.response?.data?.message || (isRtl ? 'فشل تنفيذ الإجراء' : 'Action failed');
      const errEvt = new CustomEvent('app:toast', { detail: { type: 'error', message: msg } });
      window.dispatchEvent(errEvt);
    }
  };

  // New Rule: Directors and Operation Managers cannot delete anything.
  const isAdmin = userRole === 'admin';
  const isTenantAdmin = userRole === 'tenant admin' || userRole === 'tenant-admin';
  const isSuperAdmin = user?.is_super_admin || userRole.includes('super admin') || userRole === 'owner';
  const isDirectorOrOpManager = userRole.includes('director') || userRole.includes('operation manager') || userRole.includes('operations manager');
  const isSalesDirector = userRole.includes('sales director') || userRole.includes('director');
  const isOperationsManager = userRole.includes('operations manager') || userRole.includes('operation manager');
  const isSalesAdmin = userRole.includes('sales admin');
  const isBranchManager = userRole.includes('branch manager');

  const canDeleteLead =
    !isDirectorOrOpManager && // Directors/Op Managers cannot delete
    (leadModulePerms.includes('deleteLead') ||
    user?.is_super_admin ||
    isAdmin ||
    isTenantAdmin);

  const canViewDuplicateLeads =
    isAdmin || isTenantAdmin || leadPermissionFlags.canViewDuplicateLeads;

  const canActOnDuplicateLeads =
    isAdmin || isTenantAdmin || leadPermissionFlags.canActOnDuplicateLeads;
  
  const isDuplicateAllowed =
    isAdmin || isTenantAdmin ||
    canViewDuplicateLeads; 

  const controlModulePerms = Array.isArray(modulePermissions.Control) ? modulePermissions.Control : [];
  const effectiveControlPerms = controlModulePerms.length ? controlModulePerms : (() => {
    const role = user?.role || '';
    if (role === 'Sales Admin') return ['addRegions','addArea','addSource','userManagement','allowActionOnTeam','assignLeads','showReports','addDepartment'];
    if (role === 'Operation Manager') return ['allowActionOnTeam','showReports','addDepartment'];
    if (role === 'Branch Manager') return ['allowActionOnTeam','assignLeads','showReports'];
    if (role === 'Director') return ['userManagement','assignLeads','exportLeads','showReports','multiAction','salesComment'];
    if (role === 'Sales Manager') return ['assignLeads','showReports'];
    if (role === 'Team Leader') return ['allowActionOnTeam','assignLeads'];
    if (role === 'Customer Manager') return ['showReports'];
    return [];
  })();

  const isAdminOrManager = user?.is_super_admin || 
                           isAdmin || 
                           isTenantAdmin || 
                           isSalesDirector || 
                           isSalesAdmin || 
                           isOperationsManager || 
                           isBranchManager || 
                           userRole.includes('manager') || 
                           userRole.includes('leader') ||
                           userRolesLower.some(r => r.includes('manager') || r.includes('leader'));

  const canAssignLeads =
    user?.is_super_admin ||
    effectiveControlPerms.includes('assignLeads');

  // Restrict bulk actions to specific roles as requested: 
  // Tenant Admin, Director, Sales Admin, Operation Manager, Branch Manager
  const canUseBulkActions =
    isTenantAdmin ||
    isSalesDirector ||
    isSalesAdmin ||
    isOperationsManager ||
    isBranchManager ||
    user?.is_super_admin ||
    isAdmin;

  const canUseBulkAssign = canAssignLeads;
  const canUseBulkMultiActions = canUseBulkActions;
  const MEET_ICON_URL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'><rect x='2' y='4' width='12' height='16' rx='3' fill='%23ffffff'/><rect x='2' y='4' width='12' height='4' rx='2' fill='%234285F4'/><rect x='2' y='4' width='4' height='16' rx='2' fill='%2334A853'/><rect x='10' y='4' width='4' height='16' rx='2' fill='%23FBBC05'/><rect x='2' y='16' width='12' height='4' rx='2' fill='%23EA4335'/><polygon points='14,9 22,5 22,19 14,15' fill='%2334A853'/></svg>"
  
  const [leads, setLeads] = useState([])
  const [filteredLeads, setFilteredLeads] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState([])
  const [priorityFilter, setPriorityFilter] = useState([])
  // New filter states
  const [projectFilter, setProjectFilter] = useState([])
  const [stageFilter, setStageFilter] = useState([])
  const [managerFilter, setManagerFilter] = useState([])
  const [salesPersonFilter, setSalesPersonFilter] = useState([])
  const [createdByFilter, setCreatedByFilter] = useState([])
  const [assignDateFrom, setAssignDateFrom] = useState('')
  const [assignDateTo, setAssignDateTo] = useState('')
  const [lastActionFrom, setLastActionFrom] = useState('')
  const [lastActionTo, setLastActionTo] = useState('')
  const [creationDateFrom, setCreationDateFrom] = useState('')
  const [creationDateTo, setCreationDateTo] = useState('')
  const [oldStageFilter, setOldStageFilter] = useState([])
  const [closedDateFrom, setClosedDateFrom] = useState('')
  const [closedDateTo, setClosedDateTo] = useState('')
  const [campaignFilter, setCampaignFilter] = useState([])
  const [countryFilter, setCountryFilter] = useState([])
  const [expectedRevenueFilter, setExpectedRevenueFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [whatsappIntentsFilter, setWhatsappIntentsFilter] = useState([])
  const [actionTypeFilter, setActionTypeFilter] = useState([])
  const [duplicateStatusFilter, setDuplicateStatusFilter] = useState([])
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedLeads, setSelectedLeads] = useState([])
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)
  const [showBulkDuplicateMenu, setShowBulkDuplicateMenu] = useState(false)
  const [showBulkDuplicateTransferModal, setShowBulkDuplicateTransferModal] = useState(false)
  const [activeRowId, setActiveRowId] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [pageSearch, setPageSearch] = useState('')
  const [exportFrom, setExportFrom] = useState(1)
  const [exportTo, setExportTo] = useState(1)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [showAddActionModal, setShowAddActionModal] = useState(false)
  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSummary, setImportSummary] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [stageDefs, setStageDefs] = useState([])
  const [isMobile, setIsMobile] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [initialActionId, setInitialActionId] = useState(null)

  useEffect(() => {
    if (!canShowCreator && createdByFilter.length) {
      setCreatedByFilter([])
    }
  }, [canShowCreator, createdByFilter.length])

  // Handle lead_id and action_id from URL (Deep Linking from Notifications)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const leadId = searchParams.get('lead_id');
    const actionId = searchParams.get('action_id');

    if (leadId) {
      const fetchLead = async () => {
        try {
          const res = await api.get(`/api/leads/${leadId}`);
          const lead = res.data.data || res.data;
          if (lead) {
            setSelectedLead(lead);
            if (actionId) {
              setInitialActionId(actionId);
            }
            setShowLeadModal(true);
            
            // Clear URL params without reloading to avoid re-triggering
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          }
        } catch (error) {
          console.error('Failed to fetch lead from URL:', error);
          // toast.error(t('Failed to load lead'));
        }
      };
      fetchLead();
    }
  }, [location.search]);

  // Handle search query from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const search = searchParams.get('s') || searchParams.get('search');
    setSearchTerm(search || '');
  }, [location.search]);
  
  // Dynamic Options States
  const [sourcesList, setSourcesList] = useState([])
  const [projectsList, setProjectsList] = useState([])
  const [stagesList, setStagesList] = useState([])
  const [campaignsList, setCampaignsList] = useState([])
  const [usersList, setUsersList] = useState([])

  // Fetch Sources & Stages & Campaigns
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [sourcesRes, stagesRes, campaignsRes, usersRes] = await Promise.all([
          api.get('/api/sources?active=1'),
          api.get('/api/stages?active=1'),
          api.get('/api/campaigns'),
          api.get('/api/users')
        ])
        
        const sourcesData = Array.isArray(sourcesRes.data) ? sourcesRes.data : (sourcesRes.data?.data || [])
        setSourcesList(sourcesData)

        const stagesData = Array.isArray(stagesRes.data) ? stagesRes.data : (stagesRes.data?.data || [])
        // Sort stages by order if available
        setStagesList(stagesData.sort((a, b) => (a.order || 0) - (b.order || 0)))

        const campaignsData = Array.isArray(campaignsRes.data) ? campaignsRes.data : (campaignsRes.data?.data || [])
        setCampaignsList(campaignsData)

        const usersData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || [])
        setUsersList(usersData)

      } catch (e) {
        console.error('Failed to fetch options', e)
      }
    }
    fetchOptions()
  }, [])

  // Fetch Projects or Items based on company type
  useEffect(() => {
    const fetchProjectsOrItems = async () => {
      try {
        const isGeneral = String(company?.company_type || '').toLowerCase() === 'general'
        const url = isGeneral ? '/api/items?all=1' : '/api/projects'
        const res = await api.get(url)
        // Projects API usually returns { data: [...] }, Items might vary but often { data: [...] }
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        setProjectsList(data)
      } catch (e) {
        console.error('Failed to fetch projects/items', e)
      }
    }
    fetchProjectsOrItems()
  }, [company?.company_type])
  
  const textColor = isLight ? 'text-black' : 'text-white'
  const bgColor = 'bg-white dark:bg-gray-900'
  
  const normStageKey = (s) => String(s || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '')
  const staticStageAliases = useMemo(() => ({
     'fresh': 'new lead',
    'new': 'new lead',
    'newlead': 'new lead',
    'duplicate': 'duplicate',
    'pending': 'pending',
    'coldcalls': 'cold calls',
    'coldcall': 'cold calls',
    'cold calls': 'cold calls',
    'cold-call': 'cold calls',
  }), [])
  const stageAliasMap = useMemo(() => {
    const map = { ...staticStageAliases }
    stagesList.forEach(s => {
      const en = String(s.name || '').trim()
      const ar = String(s.name_ar || '').trim()
      if (en) map[normStageKey(en)] = en
      if (ar) map[normStageKey(ar)] = en
    })
    return map
  }, [stagesList, staticStageAliases])
  const levenshtein = (a, b) => {
    const A = String(a || ''), B = String(b || '')
    const m = A.length, n = B.length
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = A[i - 1] === B[j - 1] ? 0 : 1
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        )
      }
    }
    return dp[m][n]
  }
  const normalizeStageName = (stageStr, sourceStr) => {
    const s = String(stageStr || '').trim()
    const src = String(sourceStr || '').trim()
    const sNorm = normStageKey(s)
    const srcNorm = normStageKey(src)
if (!s) {
  return 'new lead'
}
    if (stageAliasMap[sNorm]) return stageAliasMap[sNorm]
    const aliases = Object.keys(stageAliasMap)
    let best = null
    let bestD = Infinity
    for (const a of aliases) {
      const d = levenshtein(sNorm, a)
      if (d < bestD) {
        bestD = d
        best = a
      }
    }
    if (best && bestD <= Math.max(1, Math.floor(sNorm.length * 0.25))) {
      return stageAliasMap[best]
    }
    return s
  }
  
  const tableHeaderBgClass = 'bg-theme-sidebar dark:bg-gray-900/95'
  const buttonBase = 'text-sm font-semibold rounded-lg transition-all duration-200 ease-out'
  const primaryButton = `btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none`
  
  const sidebarStages = useMemo(() => {
    const showColdCalls = crmSettings?.showColdCallsStage !== false
    const isMyLeads = location.pathname === '/leads/my-leads';
    const staticStages = [
      { key: 'new lead', icon: '🆕', backendKey: 'new' },
      ...(!isMyLeads ? [{ key: 'duplicate', icon: '🔄', backendKey: 'duplicate' }] : []),
      ...(!(isSalesPerson || (isMyLeads && isAdminOrManager)) ? [{ key: 'pending', icon: '⏳', backendKey: 'pending' }] : []),
      ...(showColdCalls ? [{ key: 'cold calls', icon: '📞', backendKey: 'coldCall' }] : []),
    ].filter(stage => stage.key !== 'duplicate' || isDuplicateAllowed);

    // Filter out stages from stagesList that are already covered by static stages to avoid duplication
    const staticKeys = staticStages.map(s => s.key.toLowerCase());
    const dynamicStages = stagesList
      .filter(s => {
        // Normalize dynamic stage name
        const name = String(s.name || '').toLowerCase().trim();
        const nameAr = String(s.name_ar || '').toLowerCase().trim();
        
        // Check if this stage corresponds to a static stage (exact match or known alias)
        // We avoid fuzzy 'includes' to allow stages like "Cold Call Follow Up"
        const isStatic = staticKeys.some(sk => {
            return name === sk || 
                   nameAr === sk || 
                   (sk === 'cold calls' && (name === 'cold call' || name === 'cold calls' || name === 'cold-call'));
        });
        
        return !isStatic;
      })
      .map(s => ({
        key: s.name,
        icon: s.icon || '📊',
        isDynamic: true
      }));

    return [...staticStages, ...dynamicStages];
  }, [crmSettings, isDuplicateAllowed, isSalesPerson, isAdminOrManager, stagesList, location.pathname]);

  const fetchStatsApi = async ({ queryKey }) => {
    const [_key, filters] = queryKey;
    const isMyLeads = location.pathname === '/leads/my-leads';
    const params = {
        search: filters.search,
        source: filters.source.length > 0 ? filters.source : null,
        priority: filters.priority.length > 0 ? filters.priority : null,
        campaign: filters.campaign.length > 0 ? filters.campaign : null,
        country: filters.country.length > 0 ? filters.country : null,
        project_id: filters.project.length > 0 ? filters.project : null,
        assigned_to: filters.assignedTo.length > 0 ? filters.assignedTo : null,
        manager_id: filters.managerId.length > 0 ? filters.managerId[0] : null,
        old_stage: filters.oldStage.length > 0 ? filters.oldStage : null,
        created_by: filters.createdBy.length > 0 ? filters.createdBy : null,
        created_from: filters.createdFrom,
        created_to: filters.createdTo,
        last_action_from: filters.lastActionFrom,
        last_action_to: filters.lastActionTo,
        assigned_date_from: filters.assignedFrom,
        assigned_date_to: filters.assignedToDate,
        closed_from: filters.closedFrom,
        closed_to: filters.closedTo,
        view_type: isMyLeads ? 'my_leads' : 'all_leads'
    };
    // Clean params
    Object.keys(params).forEach(key => {
        if (params[key] == null || params[key] === '') delete params[key];
        if (Array.isArray(params[key]) && params[key].length === 0) delete params[key];
    });

    const response = await api.get('/api/leads/stats', { params });
    return response.data;
  };

  const { data: statsData } = useQuery({
      queryKey: ['leads-stats', { 
          viewType: location.pathname === '/leads/my-leads' ? 'my_leads' : 'all_leads',
          search: searchTerm, 
          source: sourceFilter,
          priority: priorityFilter,
          campaign: campaignFilter,
          country: countryFilter,
          project: projectFilter,
          assignedTo: salesPersonFilter,
          managerId: managerFilter,
          oldStage: oldStageFilter,
          createdBy: createdByFilter,
          createdFrom: creationDateFrom,
          createdTo: creationDateTo,
          lastActionFrom: lastActionFrom,
          lastActionTo: lastActionTo,
          assignedFrom: assignDateFrom,
          assignedToDate: assignDateTo,
          closedFrom: closedDateFrom,
          closedTo: closedDateTo,
      }],
      queryFn: fetchStatsApi,
      staleTime: 1000 * 60 * 5,
      refetchInterval: 30000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: false,
  });

  const stageCounts = useMemo(() => {
    if (!statsData) return { total: 0 };
    
    const counts = { total: statsData.total || 0 };
    
    // Map static stages using their backend keys or byStage
    sidebarStages.forEach(s => {
      if (!s.isDynamic) {
        // Try backend specific key first, then byStage, then default to 0
        counts[s.key] = statsData[s.backendKey] || statsData.byStage?.[s.key] || 0;
      } else {
        // Map dynamic stages from byStage
        counts[s.key] = statsData.byStage?.[s.key] || 0;
      }
    });
    
    return counts;
  }, [statsData, sidebarStages])

  const numberFormatter = useMemo(() => new Intl.NumberFormat(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US'), [i18n.language])
  const formatInt = (n) => numberFormatter.format(n || 0)

  const _formatLocalYMD = (d) => {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const _parseToYMD = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const s = value.trim();
      if (!s) return null;
      // Fast-path: ISO date or ISO datetime
      const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
      if (isoMatch) return isoMatch[1];
      const d = new Date(s);
      return _formatLocalYMD(d);
    }
    if (value instanceof Date) return _formatLocalYMD(value);
    return null;
  };

  const _inDateRange = (rawValue, fromYmd, toYmd) => {
    if (!fromYmd && !toYmd) return true;
    const ymd = _parseToYMD(rawValue);
    if (!ymd) return false;
    if (fromYmd && ymd < fromYmd) return false;
    if (toYmd && ymd > toYmd) return false;
    return true;
  };

  const queryClient = useQueryClient();

  const fetchLeadsApi = async ({ queryKey }) => {
    const [_key, filters] = queryKey;
    const isMyLeads = location.pathname === '/leads/my-leads';
    const params = {
      page: filters.page,
      per_page: filters.perPage,
      search: filters.search,
      stage: filters.stage.length > 0 ? filters.stage : null,
      old_stage: filters.oldStage.length > 0 ? filters.oldStage : null,
      source: filters.source.length > 0 ? filters.source : null,
      priority: filters.priority.length > 0 ? filters.priority : null,
      campaign: filters.campaign.length > 0 ? filters.campaign : null,
      country: filters.country.length > 0 ? filters.country : null,
      project_id: filters.project.length > 0 ? filters.project : null,
      assigned_to: filters.assignedTo.length > 0 ? filters.assignedTo : null,
      manager_id: filters.managerId.length > 0 ? filters.managerId[0] : null,
      created_by: filters.createdBy.length > 0 ? filters.createdBy : null,
      created_from: filters.createdFrom,
      created_to: filters.createdTo,
      last_action_from: filters.lastActionFrom,
      last_action_to: filters.lastActionTo,
      assigned_date_from: filters.assignedFrom,
      assigned_date_to: filters.assignedToDate,
      closed_from: filters.closedFrom,
      closed_to: filters.closedTo,
      sort_by: filters.sortBy,
      sort_order: filters.sortOrder,
      view_type: isMyLeads ? 'my_leads' : 'all_leads'
    };
    
    // Clean params
    Object.keys(params).forEach(key => {
        if (params[key] == null || params[key] === '') delete params[key];
        if (Array.isArray(params[key]) && params[key].length === 0) delete params[key];
    });

    const response = await api.get('/api/leads', { params });
    return response.data;
  };

  const { data: leadsQueryData, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['leads', { 
        viewType: location.pathname === '/leads/my-leads' ? 'my_leads' : 'all_leads',
        page: currentPage, 
        perPage: itemsPerPage, 
        search: searchTerm, 
        stage: stageFilter,
        oldStage: oldStageFilter,
        source: sourceFilter,
        priority: priorityFilter,
        campaign: campaignFilter,
        country: countryFilter,
        project: projectFilter,
        assignedTo: salesPersonFilter,
        managerId: managerFilter,
        createdBy: createdByFilter,
        createdFrom: creationDateFrom,
        createdTo: creationDateTo,
        lastActionFrom: lastActionFrom,
        lastActionTo: lastActionTo,
        assignedFrom: assignDateFrom,
        assignedToDate: assignDateTo,
        closedFrom: closedDateFrom,
        closedTo: closedDateTo,
        sortBy, 
        sortOrder 
    }],
    queryFn: fetchLeadsApi,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const fetchLeads = () => {
    queryClient.invalidateQueries({ queryKey: ['leads-stats'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    stageFilter,
    oldStageFilter,
    sourceFilter,
    priorityFilter,
    campaignFilter,
    salesPersonFilter,
    createdByFilter,
    sortBy,
    sortOrder,
    // Date ranges
    assignDateFrom,
    assignDateTo,
    lastActionFrom,
    lastActionTo,
    creationDateFrom,
    creationDateTo,
    closedDateFrom,
    closedDateTo,
  ]);

  // Helper for hierarchy
  const getDescendants = (rootId, allUsers) => {
    let descendants = [];
    const direct = allUsers.filter(u => u.manager_id === rootId);
    direct.forEach(u => {
      descendants.push(u);
      descendants = [...descendants, ...getDescendants(u.id, allUsers)];
    });
    return descendants;
  };

  useEffect(() => {
    if (leadsQueryData) {
      const data = leadsQueryData.data || [];
      
      const mappedLeads = data.map(lead => {
        // Find manager
        let managerName = null;
        let managerId = lead.manager_id || lead.managerId || null;
        if (managerId && usersList.length > 0) {
          const manager = usersList.find(m => m.id == managerId);
          if (manager) {
            managerName = manager.name;
          }
        }
        if (!managerName && usersList.length > 0) {
          const assignedUserId = lead.assigned_to || (typeof lead.assignedTo === 'object' ? lead.assignedTo?.id : lead.assignedTo);
          const assignedUser = usersList.find(u => u.id == assignedUserId);
          if (assignedUser && assignedUser.manager_id) {
            const manager = usersList.find(m => m.id == assignedUser.manager_id);
            if (manager) {
              managerName = manager.name;
              managerId = manager.id;
            }
          }
        }

        // Find assigned user name if not present
        let salesPersonName = lead.sales_person;
        if (!salesPersonName && usersList.length > 0) {
            const assignedUserId = lead.assigned_to || (typeof lead.assignedTo === 'object' ? lead.assignedTo?.id : lead.assignedTo);
            const assignedUser = usersList.find(u => u.id == assignedUserId);
            if (assignedUser) {
                const assignedRole = String(assignedUser.role || '').toLowerCase();
                const isSales =
                  assignedRole.includes('sales person') ||
                  assignedRole.includes('salesperson') ||
                  assignedRole.includes('sales_person');
                if (isSales) {
                  salesPersonName = assignedUser.name;
                }
            }
        }

       return {
        ...lead,
        assignedTo: lead.assigned_to || lead.assignedTo,
        sales_person: salesPersonName || lead.assignedAgent?.name || lead.assigned_agent?.name, // Fallback to assigned agent relationship or keep existing
        action_owner: lead.latest_action?.user?.name || null,
        manager: managerName,
        managerId: managerId,
        createdAt: lead.created_at || lead.createdAt,
        lastContact: lead.last_contact || lead.lastContact,
        // Normalize date fields used by the filters UI
        assignDate: lead.assignDate || lead.assigned_at || lead.assignedAt || lead.assigned_date || lead.assign_date || null,
        actionDate: lead.actionDate || lead.last_contact || lead.lastContact || null,
        closedDate: lead.closedDate || lead.closed_at || lead.closedAt || lead.closed_date || null,
        estimatedValue: lead.estimated_value || lead.estimatedValue,
        customFields: lead.custom_field_values || []
      }});

      setLeads(mappedLeads);
      setFilteredLeads(mappedLeads); // With server-side pagination, the current list IS the filtered list
      setIsDataLoaded(true);
    }
  }, [leadsQueryData, usersList]);

  // Filter Options Calculation
  const availableManagers = useMemo(() => {
      if (!usersList.length) return [];
      
      let candidates = [];
      // Admin/Super Admin/General Manager see all
      if (['admin', 'super admin', 'general manager'].includes(userRole)) {
          candidates = usersList;
      } else {
          // Others see themselves + descendants
          if (user?.id) {
              candidates = [user, ...getDescendants(user.id, usersList)];
          }
      }
      
      const usersWithSubordinates = new Set(usersList.map(u => u.manager_id).filter(Boolean));
      const managersOfLeads = new Set(leads.map(l => l.managerId).filter(Boolean));
      
      return candidates.filter(u => usersWithSubordinates.has(u.id) || managersOfLeads.has(u.id));

  }, [usersList, userRole, user, leads]);

  const availableSalesPersons = useMemo(() => {
      if (!usersList.length) return [];
      
      let candidates = [];
      if (['admin', 'super admin', 'general manager'].includes(userRole)) {
          candidates = usersList;
      } else {
          if (user?.id) {
            candidates = [user, ...getDescendants(user.id, usersList)];
          }
      }

      // Apply Manager Filter
      if (managerFilter.length > 0) {
           const selectedManagerIdStrings = managerFilter.map(v => String(v))
           candidates = candidates.filter(u => selectedManagerIdStrings.includes(String(u.manager_id)))
      }
      
      return candidates;

  }, [usersList, userRole, user, managerFilter]);

  // Removed direct fetchLeads() call in useEffect as useQuery handles it
  useEffect(() => {
      // Logic for location-based filters is handled in queryKey now
  }, [location.pathname]);


  useEffect(() => {
    try {
      if (location.pathname === '/leads/my-leads') {
        if (user && user.id) {
            const idStr = String(user.id)
            setSalesPersonFilter(prev => (Array.isArray(prev) && prev.length === 1 && String(prev[0]) === idStr ? prev : [idStr]))
        }
      } else if (location.pathname === '/leads') {
        setSalesPersonFilter(prev => (Array.isArray(prev) && prev.length === 0 ? prev : []))
      }

      const params = new URLSearchParams(location.search || '')
      const s = params.get('stage')
      if (s) {
        const raw = String(s || '').trim()
        const normalized = normStageKey(raw)
        const mapped = stageAliasMap[normalized] || raw
        const mappedLower = String(mapped).toLowerCase().trim()
        const resolvedStage =
          mappedLower === 'cold calls' || normalized === 'coldcalls' || normalized === 'coldcall'
            ? 'coldCall'
            : mappedLower === 'new'
              ? 'new lead'
              : mapped
        setStageFilter(prev => (Array.isArray(prev) && prev.length === 1 && String(prev[0]) === String(resolvedStage) ? prev : [resolvedStage]))
      } else {
        // Only reset stage filter if we are not on my-leads (or maybe my-leads can also have stage?)
        // The original code reset stage filter if no param. 
        // We should keep this behavior but be careful not to conflict.
        // The original code was:
        // if (s) setStageFilter([s]) else setStageFilter([])
        // This runs on location.search change.
        
        // If we are on /leads/my-leads, location.search might be empty.
        // So stage filter is cleared. That's fine.
        setStageFilter(prev => (Array.isArray(prev) && prev.length === 0 ? prev : []))
    }
    } catch (e) {
      console.error('Error parsing URL for stage filter:', e) // FIX 4: Added console.error
    }
  }, [location.search, location.pathname, stageAliasMap, user])

  const handleCompareLead = async (duplicateLead) => {
    // Attempt to find the "original" lead
    // 1) Prefer backend link meta_data.duplicate_of when available
    // 2) Otherwise search by phone number only (duplicates are phone-based)
    // 3) Exclude the current duplicate lead ID
    // 4) Sort by creation date (oldest is original)
    
    const cleanPhone = (p) => String(p || '').replace(/[^0-9]/g, '')
    const targetPhone = cleanPhone(duplicateLead.phone || duplicateLead.mobile)

    const duplicateOfId =
      duplicateLead?.meta_data?.duplicate_of ||
      duplicateLead?.meta_data?.duplicateOf ||
      duplicateLead?.metaData?.duplicate_of ||
      duplicateLead?.metaData?.duplicateOf ||
      null

    const leadCreatedAt = (l) => l?.createdAt || l?.created_at || l?.created || null

    let originalLead = null

    if (duplicateOfId) {
      try {
        const { data } = await api.get(`/api/leads/${encodeURIComponent(String(duplicateOfId))}`)
        originalLead = data?.data || data
      } catch (err) {
        console.error('Failed to load original lead by duplicate_of', err)
      }
    }
    
    if (!originalLead) {
      const possibleOriginals = leads
        .filter(l => {
          if ((l.id || l._id) === (duplicateLead.id || duplicateLead._id)) return false // Skip self
          const lPhone = cleanPhone(l.phone || l.mobile)
          return targetPhone && lPhone && targetPhone === lPhone
        })
        .sort((a, b) => new Date(leadCreatedAt(a) || 0) - new Date(leadCreatedAt(b) || 0))

      originalLead = possibleOriginals[0] || null
    }
    
    if (!originalLead) {
       // Try to find via API
       try {
         const searchQ = targetPhone;
         if (searchQ) {
             const { data } = await api.get('/api/leads', { 
               params: { 
                 search: searchQ
               } 
             });
             const apiLeads = Array.isArray(data) ? data : (data.data || []);
             // Filter out self and find match
             originalLead = apiLeads.find(l => l.id !== duplicateLead.id);
         }
       } catch (err) {
         console.error('Failed to search original lead', err);
       }
    }

    if (!originalLead) {
        // If still not found, show toast and return
        const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: isRtl ? 'لم يتم العثور على السجل الأصلي' : 'Original record not found' } })
        window.dispatchEvent(evt)
        return
    }
    
    setCompareData({
      duplicate: duplicateLead,
      original: originalLead
    })
    setShowCompareModal(true)
  }

  // Hover tooltip state
  const [hoveredLead, setHoveredLead] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef(null)
  
  // Compare Modal State
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [compareData, setCompareData] = useState({ duplicate: null, original: null })

  // Direct Transfer Modal State (for Duplicates)
  const [showDirectTransferModal, setShowDirectTransferModal] = useState(false)
  const [leadForTransfer, setLeadForTransfer] = useState(null)

  // Filter visibility state
  const [showAllFilters, setShowAllFilters] = useState(false)
  const activeRowRef = useRef(null)

  const scrollXRef = useRef(null)


  

  // Load pipeline stages with colors from settings
  const defaultIconForName = (name) => {
    const key = (name || '').toLowerCase();
    if (key.includes('convert')) return '✅';
    if (key.includes('progress')) return '⏳';
    if (key.includes('lost')) return '❌';
    if (key.includes('new')) return '🆕';
    if (key.includes('qual')) return '🎯';
    return '📊';
  }
  useEffect(() => {
    const defaultColorForName = (name) => {
      const key = (name || '').toLowerCase();
      if (key.includes('convert')) return '#10b981'; // green-500
      if (key.includes('progress')) return '#f59e0b'; // amber-500
      if (key.includes('lost')) return '#ef4444'; // red-500
      if (key.includes('new')) return '#3b82f6'; // blue-500
      if (key.includes('qual')) return '#8b5cf6'; // violet-500
      return '#3b82f6';
    };
    try {
      const saved = JSON.parse(localStorage.getItem('crmStages') || '[]');
      const normalized = Array.isArray(saved)
        ? (typeof saved[0] === 'string'
            ? saved.map((name) => ({ name, nameAr: '', type: '', color: defaultColorForName(name), icon: defaultIconForName(name) }))
            : saved.map((s) => ({ 
                name: s.name || String(s), 
                nameAr: s.nameAr || '',
                type: s.type || '',
                order: s.order,
                color: s.color || defaultColorForName(s.name || String(s)), 
                icon: s.icon || defaultIconForName(s.name || String(s)) 
              }))
          )
        : [];
      
      // If no stages are saved, use default stages
      if (normalized.length === 0) {
        const defaultStages = [
          { name: 'new', color: '#10b981', icon: '🆕' },
          { name: 'qualified', color: '#3b82f6', icon: '✅' },
          { name: 'in-progress', color: '#f59e0b', icon: '⏳' },
          { name: 'converted', color: '#059669', icon: '🎉' },
          { name: 'lost', color: '#ef4444', icon: '❌' }
        ];
        setStageDefs(defaultStages);
      } else {
        setStageDefs(normalized);
      }
    } catch (e) {
      // If there's an error, use default stages
      const defaultStages = [
        { name: 'new', color: '#10b981', icon: '🆕' },
        { name: 'qualified', color: '#3b82f6', icon: '✅' },
        { name: 'in-progress', color: '#f59e0b', icon: '⏳' },
        { name: 'converted', color: '#059669', icon: '🎉' },
        { name: 'lost', color: '#ef4444', icon: '❌' }
      ];
      setStageDefs(defaultStages);
    }
  }, [])



  // Color style presets for stage cards
  const COLOR_STYLES = {
    blue: {
      container: 'border-blue-400 dark:border-blue-500 bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 dark:from-blue-800 dark:via-blue-700 dark:to-blue-600 shadow-blue-300/50 dark:shadow-blue-500/25',
      patternFrom: 'from-blue-200',
      patternTo: 'to-blue-300',
      iconBg: 'bg-blue-600 dark:bg-blue-500',
    },
    green: {
      container: 'border-green-400 dark:border-green-500 bg-gradient-to-br from-green-100 via-green-200 to-green-300 dark:from-green-800 dark:via-green-700 dark:to-green-600 shadow-green-300/50 dark:shadow-green-500/25',
      patternFrom: 'from-green-200',
      patternTo: 'to-green-300',
      iconBg: 'bg-green-600 dark:bg-green-500',
    },
    yellow: {
      container: 'border-yellow-400 dark:border-yellow-500 bg-gradient-to-br from-yellow-100 via-yellow-200 to-yellow-300 dark:from-yellow-800 dark:via-yellow-700 dark:to-yellow-600 shadow-yellow-300/50 dark:shadow-yellow-500/25',
      patternFrom: 'from-yellow-200',
      patternTo: 'to-yellow-300',
      iconBg: 'bg-yellow-600 dark:bg-yellow-500',
    },
    red: {
      container: 'border-red-400 dark:border-red-500 bg-gradient-to-br from-red-100 via-red-200 to-red-300 dark:from-red-800 dark:via-red-700 dark:to-red-600 shadow-red-300/50 dark:shadow-red-500/25',
      patternFrom: 'from-red-200',
      patternTo: 'to-red-300',
      iconBg: 'bg-red-600 dark:bg-red-500',
    },
    purple: {
      container: 'border-purple-400 dark:border-purple-500 bg-gradient-to-br from-purple-100 via-purple-200 to-purple-300 dark:from-purple-800 dark:via-purple-700 dark:to-purple-600 shadow-purple-300/50 dark:shadow-purple-500/25',
      patternFrom: 'from-purple-200',
      patternTo: 'to-purple-300',
      iconBg: 'bg-purple-600 dark:bg-purple-500',
    },
  }

  

  // Columns visibility state (ordered to match requested design)
  const isGeneralTenant = useMemo(() => String(company?.company_type || '').toLowerCase() === 'general', [company?.company_type])
  const labels = useMemo(() => ({
    lead: t('Lead'),
    contact: t('Contact'),
    source: t('Source'),
    project: isGeneralTenant ? t('Item') : t('Project'),
    salesPerson: t('Sales Person'),
    actionOwner: t('Action Owner'),
    lastComment: t('Last Comment'),
    stage: t('Stage'),
    expectedRevenue: t('Expected Revenue'),
    priority: t('Priority'),
    actions: t('Actions')
  }), [t, isGeneralTenant])

  const allColumns = useMemo(() => ({
    lead: labels.lead,
    contact: labels.contact,
    source: labels.source,
    project: labels.project,
    salesPerson: labels.salesPerson,
    actionOwner: labels.actionOwner,
    lastComment: labels.lastComment,
    stage: labels.stage,
    expectedRevenue: labels.expectedRevenue,
    priority: labels.priority,
    actions: labels.actions
  }), [labels])

  const displayColumns = useMemo(() => {
    const dynamicCols = dynamicFields.reduce((acc, field) => {
      acc[field.key] = i18n.language === 'ar' ? field.label_ar : field.label_en
      return acc
    }, {})
    return { ...allColumns, ...dynamicCols }
  }, [allColumns, dynamicFields, i18n.language])

  // ===== Excel Import Helpers =====
  const normalizeKey = (key) => key?.toString()?.toLowerCase()?.trim()?.replace(/\s+/g, '')
  const pad2 = (n) => String(n).padStart(2, '0')
  const toLocalYmd = (d) => {
    const date = d instanceof Date ? d : new Date(d)
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
  }

  const normalizeExcelDatePart = (value) => {
    if (value === null || value === undefined || value === '') return ''

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return toLocalYmd(value)
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      try {
        const parsed = XLSX.SSF.parse_date_code(value)
        if (parsed && parsed.y && parsed.m && parsed.d) {
          return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`
        }
      } catch {
      }

      const ms = Math.round((value - 25569) * 86400 * 1000)
      const date = new Date(ms)
      if (!Number.isNaN(date.getTime())) return toLocalYmd(date)
      return ''
    }

    const raw = String(value).trim()
    if (!raw) return ''

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

    // Common formats: dd/mm/yyyy or mm/dd/yyyy
    const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (m) {
      const a = Number(m[1])
      const b = Number(m[2])
      let year = Number(m[3])
      if (year < 100) year += 2000

      // Assume dd/mm if first part > 12
      const day = a > 12 ? a : b
      const month = a > 12 ? b : a
      if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${pad2(month)}-${pad2(day)}`
      }
    }

    const asDate = new Date(raw)
    if (!Number.isNaN(asDate.getTime())) return toLocalYmd(asDate)
    return ''
  }

  const normalizeExcelTimePart = (value) => {
    if (value === null || value === undefined || value === '') return ''

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      try {
        const parsed = XLSX.SSF.parse_date_code(value)
        if (parsed && (parsed.H !== undefined || parsed.M !== undefined)) {
          return `${pad2(parsed.H || 0)}:${pad2(parsed.M || 0)}`
        }
      } catch {
      }

      const totalMinutes = Math.round((value * 24 * 60) % (24 * 60))
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return `${pad2(hours)}:${pad2(minutes)}`
    }

    const raw = String(value).trim()
    if (!raw) return ''

    // 09:30 or 9:30
    const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/)
    if (hhmm) return `${pad2(Number(hhmm[1]))}:${pad2(Number(hhmm[2]))}`

    // 9:30 AM / PM
    const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
    if (ampm) {
      let hours = Number(ampm[1])
      const minutes = Number(ampm[2])
      const ap = String(ampm[3]).toLowerCase()
      if (ap === 'pm' && hours < 12) hours += 12
      if (ap === 'am' && hours === 12) hours = 0
      return `${pad2(hours)}:${pad2(minutes)}`
    }

    return ''
  }
  const headerMap = {
    name: ['name', 'الاسم', 'اسم العميل', 'lead', 'lead name'],
    email: ['email', 'البريد', 'البريد الإلكتروني'],
    phone: ['phone', 'mobile', 'الهاتف', 'رقم الهاتف', 'الموبايل', 'contact'],
    phoneCountry: ['phonecountry', 'phone_country', 'phone country', 'country code', 'countrycode', 'country', 'كود الدولة', 'رمز الدولة', 'الدولة', 'رمز الهاتف'],
    otherMobile: ['other mobile', 'other_mobile', 'other phone', 'otherphone', 'الموبايل الآخر', 'الهاتف الآخر'],
    company: ['company', 'الشركة'],
    status: ['status', 'الحالة', 'lead status'],
    stage: ['stage', 'الاستيدج', 'المرحلة'],
    priority: ['priority', 'الأولوية'],
    source: ['source', 'المصدر'],
    project: ['project', 'المشروع', 'project/item', 'project or item', 'project/item', 'item/project'],
    item: ['item', 'الصنف', 'product', 'project/item'],
    assignedTo: ['assignedto', 'assigned', 'المسؤول', 'المسند إليه', 'salesperson', 'sales person', 'بائع', 'المندوب', 'sales_person'],
    creationDate: ['creation date', 'creationdate', 'creation_date', 'createdat', 'created_at', 'تاريخ الإنشاء', 'created'],
    firstActionDate: ['first action date', 'firstactiondate', 'first_action_date', 'تاريخ أول إجراء', 'تاريخ اول إجراء', 'تاريخ أول اكشن', 'تاريخ اول اكشن'],
    lastContact: ['lastcontact', 'آخر اتصال'],
    estimatedValue: ['estimatedvalue', 'القيمة التقديرية', 'value'],
    probability: ['probability', 'الاحتمالية'],
    nextActionDate: ['next action date', 'nextactiondate', 'next_action_date', 'تاريخ الإجراء القادم', 'تاريخ الاكشن القادم', 'تاريخ المتابعة'],
    nextActionTime: ['next action time', 'nextactiontime', 'next_action_time', 'وقت الإجراء القادم', 'وقت الاكشن القادم', 'وقت المتابعة'],
    notes: ['notes', 'ملاحظات'],
    comment: ['comment', 'تعليق', 'comments', 'تعليق إضافي']
  }

  const findValue = (row, keys) => {
    if (!Array.isArray(keys) || !keys.length) return ''
    const rowKeys = Object.keys(row || {})
    for (const rk of rowKeys) {
      const nk = normalizeKey(rk)
      for (const k of keys) {
        if (nk === normalizeKey(k)) {
          return row[rk]
        }
      }
    }
    return ''
  }

  const parseExcelToLeads = async (file) => {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
    const nowDateStr = toLocalYmd(new Date())
    const parsed = rows.map((row) => {
      const sourceStr = String(findValue(row, headerMap.source) || '').trim()
      const stageStr = String(findValue(row, headerMap.stage) || '').trim()
      const normalizedStage = normalizeStageName(stageStr, sourceStr)
      const rawNextDate = findValue(row, headerMap.nextActionDate)
      const rawNextTime = findValue(row, headerMap.nextActionTime)
      const next_action_date = normalizeExcelDatePart(rawNextDate)
      const next_action_time = normalizeExcelTimePart(rawNextTime)
      const rawCreationDate = findValue(row, headerMap.creationDate)
      const rawFirstActionDate = findValue(row, headerMap.firstActionDate)
      const creation_date = normalizeExcelDatePart(rawCreationDate) || ''
      const first_action_date = normalizeExcelDatePart(rawFirstActionDate) || ''
      const phone_country = String(findValue(row, headerMap.phoneCountry) || '').trim()
      return {
        id: Date.now() + Math.random(),
        name: String(findValue(row, headerMap.name) || '').trim(),
        email: String(findValue(row, headerMap.email) || '').trim(),
        phone: String(findValue(row, headerMap.phone) || '').trim(),
        phone_country,
        otherMobile: String(findValue(row, headerMap.otherMobile) || '').trim(),
        company: String(findValue(row, headerMap.company) || '').trim(),
        stage: normalizedStage,
        status: String(findValue(row, headerMap.status) || '').trim(),
        priority: String(findValue(row, headerMap.priority) || 'medium').toLowerCase().trim(),
        source: sourceStr,
        project: String(findValue(row, headerMap.project) || '').trim(),
        item: String(findValue(row, headerMap.item) || '').trim(),
        assignedTo: String(findValue(row, headerMap.assignedTo) || '').trim(),
        creation_date,
        first_action_date,
        createdAt: creation_date || nowDateStr,
        lastContact: String(findValue(row, headerMap.lastContact) || nowDateStr).trim(),
        estimatedValue: Number(findValue(row, headerMap.estimatedValue)) || 0,
        probability: Number(findValue(row, headerMap.probability)) || 0,
        next_action_date,
        next_action_time,
        notes: String(findValue(row, headerMap.notes) || '').trim(),
        comment: String(findValue(row, headerMap.comment) || '').trim(),
      }
    })
    return parsed
  }

  const handleExcelUpload = async () => {
    if (!excelFile) {
      setImportError('import.selectFileError')
      return
    }
    setImporting(true)
    setImportError(null)
    setImportSummary(null)
    try {
      const newLeads = await parseExcelToLeads(excelFile)
      // Row-level validation: name, phone, source, and (project or item) are REQUIRED
      const invalidRows = newLeads.filter((l) => {
        const hasName = !!String(l.name || '').trim()
        const hasPhone = !!String(l.phone || '').trim()
        const hasSource = !!String(l.source || '').trim()
        const hasProjectOrItem = !!String(l.project || l.item || '').trim()
        
        return !(hasName && hasPhone && hasSource && hasProjectOrItem)
      })
      
      if (invalidRows.length > 0) {
        setImportError(isRtl 
          ? 'بعض الصفوف تفتقد حقولاً إجبارية (الاسم، الهاتف، المصدر، المشروع/الصنف). يرجى التحقق من الملف.'
          : 'Some rows are missing required fields (Name, Phone, Source, Project/Item). Please check your file.')
        // Don't block the whole import; proceed and let the backend skip invalid rows and return detailed warnings.
      }
      
      const fileName = excelFile?.name || 'leads_import.xlsx'
      const phoneCountryHint = String(newLeads?.find?.((l) => String(l?.phone_country || '').trim())?.phone_country || '').trim()

      const response = await api.post('/api/import-jobs', {
        module: 'leads',
        file_name: fileName,
        rows: newLeads,
        mapping: {},
        phone_country: phoneCountryHint || undefined,
      })

      const jobId = Number(response.data?.job_id || 0) || null
      const summary = response.data?.summary || {}

      const successRows = Number(summary?.success_rows ?? 0) || 0
      const duplicateRows = Number(summary?.duplicate_rows ?? 0) || 0
      const skippedRows = Number(summary?.skipped_rows ?? 0) || 0
      const failedRows = Number(summary?.failed_rows ?? 0) || 0
      const warningRows = Number(summary?.warning_rows ?? 0) || 0

      const importedCount = successRows + duplicateRows
      const duplicateCount = duplicateRows
      const newCount = successRows

      // Load job rows to show detailed warnings in the modal (best-effort).
      let jobRows = []
      try {
        if (jobId) {
          const rowsRes = await api.get(`/api/import-jobs/${jobId}/rows`, { params: { per_page: 200 } })
          jobRows = Array.isArray(rowsRes.data?.data) ? rowsRes.data.data : (Array.isArray(rowsRes.data) ? rowsRes.data : [])
        }
      } catch {
        jobRows = []
      }

      const dupExisting = Array.isArray(jobRows) ? jobRows.filter(r => r?.reason_code === 'duplicate_existing').length : 0
      const dupInFile = Array.isArray(jobRows) ? jobRows.filter(r => r?.reason_code === 'duplicate_in_file').length : 0
      const duplicateExistingCount = dupExisting
      const duplicateInFileCount = dupInFile

      const issues = []
      if (Array.isArray(jobRows)) {
        jobRows.forEach((r) => {
          const rowNo = r?.row_number ?? ''
          const status = String(r?.status || '')
          if (status === 'failed' || status === 'skipped') {
            const msg = r?.reason_message ? String(r.reason_message) : (status === 'skipped' ? 'Row skipped' : 'Row failed')
            issues.push(`Row ${rowNo}: ${msg}`)
          }
          if (Array.isArray(r?.warnings) && r.warnings.length) {
            r.warnings.forEach((w) => {
              const msg = String(w?.message || w?.code || 'Warning')
              issues.push(`Row ${rowNo}: ${msg}`)
            })
          }
        })
      }
      const backendErrors = issues
      
      setImportSummary({ 
        jobId,
        jobRows,
        added: importedCount,
        duplicates: duplicateCount,
        duplicateExisting: duplicateExistingCount,
        duplicateInFile: duplicateInFileCount,
        skipped: skippedRows,
        failed: failedRows,
        warnings: warningRows,
        newCount,
        errors: backendErrors 
      })
      setImportError(null)
      
      if (backendErrors.length > 0 || skippedRows > 0 || failedRows > 0 || warningRows > 0) {
          // Keep modal open to show row-level warnings/errors
          setImporting(false);
          // Auto-close after 5 seconds instead of 2 if there are errors
          setTimeout(() => {
            setShowImportModal(false)
            setImportSummary(null)
            setImportError('')
            setExcelFile(null)
          }, 5000)
      } else {
          // Auto-close modal after success with a small delay
          setTimeout(() => {
            setShowImportModal(false)
            setImportSummary(null)
            setImportError('')
            setExcelFile(null)
          }, 2000)
      }

      const successEvt = new CustomEvent('app:toast', { 
        detail: { 
          type: (importedCount > 0 || (typeof duplicateCount === 'number' && duplicateCount > 0)) ? 'success' : (backendErrors.length > 0 ? 'error' : 'warning'), 
          message: isRtl 
            ? (importedCount > 0
                ? `تم استيراد ${importedCount} عميل. جديد: ${typeof newCount === 'number' ? newCount : '-'} — مكرر: ${typeof duplicateCount === 'number' ? duplicateCount : '-'}${typeof duplicateExistingCount === 'number' ? ` (قاعدة البيانات: ${duplicateExistingCount})` : ''}${typeof duplicateInFileCount === 'number' ? ` (داخل الملف: ${duplicateInFileCount})` : ''}`
                : 'لم يتم استيراد أي عملاء، يرجى التحقق من البيانات')
            : (importedCount > 0
                ? `Imported ${importedCount} leads. New: ${typeof newCount === 'number' ? newCount : '-'} — Duplicates: ${typeof duplicateCount === 'number' ? duplicateCount : '-'}${typeof duplicateExistingCount === 'number' ? ` (DB: ${duplicateExistingCount})` : ''}${typeof duplicateInFileCount === 'number' ? ` (File: ${duplicateInFileCount})` : ''}`
                : 'No leads were imported, please check the data') 
        } 
      });
      window.dispatchEvent(successEvt);
      fetchLeads()
    } catch (err) {
      console.error(err)
      if (excelFile) {
        const fileName = excelFile.name
        logImportEvent({
          module: 'Leads',
          fileName,
          format: 'xlsx',
          status: 'failed',
          errorMessage: err?.message,
        })
      }
      setImportError('import.readFileError')
    } finally {
      setImporting(false)
    }
  }


  const [visibleColumns, setVisibleColumns] = useState({
    lead: true,
    contact: true,
    source: true,
    project: true,
    salesPerson: true,
    actionOwner: true,
    lastComment: true,
    stage: true,
    expectedRevenue: true,
    priority: true,
    actions: true
  })

  // State for column order
  const [columnOrder, setColumnOrder] = useState(() => {
    // Default order: Lead, Contact, Actions, Source, Project, Sales Person, Last Comment, Stage, Expected Revenue, Priority
    // Note: Actions is 3rd (index 2)
    const defaults = ['lead', 'contact', 'actions', 'source', 'project', 'salesPerson', 'actionOwner', 'lastComment', 'stage', 'expectedRevenue', 'priority']
    const allKeys = Object.keys(allColumns)
    // Merge any other keys that might exist in allColumns but not in defaults
    const remaining = allKeys.filter(k => !defaults.includes(k))
    return [...defaults, ...remaining]
  })

  const handleColumnReorder = (newOrder) => {
    setColumnOrder(newOrder)
  }

  // Sync dynamic fields with visibleColumns and columnOrder
  useEffect(() => {
    const allKeys = Object.keys(displayColumns)
    
    // Update visibleColumns if needed
    setVisibleColumns(prev => {
      const next = { ...prev }
      let changed = false
      allKeys.forEach(k => {
        if (next[k] === undefined) {
          next[k] = true
          changed = true
        }
      })
      // Also remove keys that no longer exist
      Object.keys(next).forEach(k => {
        if (!allKeys.includes(k)) {
          delete next[k]
          changed = true
        }
      })
      return changed ? next : prev
    })

    // Update columnOrder if needed
    setColumnOrder(prev => {
      // 1. Keep existing keys that are still valid
      const validExisting = prev.filter(k => allKeys.includes(k))
      
      // 2. Find new keys that are not in prev
      const newKeys = allKeys.filter(k => !prev.includes(k))
      
      // 3. Combine
      const next = [...validExisting, ...newKeys]
      
      // 4. Check if changed
      if (next.length !== prev.length || next.some((k, i) => k !== prev[i])) {
        return next
      }
      return prev
    })
  }, [displayColumns])

  const handleColumnToggle = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const resetVisibleColumns = () => {
    const all = Object.keys(displayColumns).reduce((acc, k) => { acc[k] = true; return acc }, {})
    setVisibleColumns(all)
  }

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 640)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!isMobile) return
    setVisibleColumns(prev => ({
      ...prev,
      source: false,
      project: false,
      salesPerson: false,
      lastComment: false,
      stage: false,
      expectedRevenue: false,
      priority: false,
      status: false,
    }))
  }, [isMobile])



  useEffect(() => {
    let filtered = leads.filter(lead => {
      // VISIBILITY CONTROL: Duplicate leads only visible to managers
      const isDuplicateStage = String(lead.stage || '').toLowerCase() === 'duplicate';
      
      if (isDuplicateStage && !isDuplicateAllowed) {
        return false;
      }

      // Helper for multi-select matching
      const matchesMulti = (filter, value) => {
        if (!Array.isArray(filter) || filter.length === 0) return true;
        const v = String(value || '').toLowerCase();
        return filter.some(f => String(f).toLowerCase() === v);
      }

      // Server handled: search, stage, source, priority, campaign, assignedTo (salesPerson), sort
      // We remove these from client-side filtering/sorting to prevent conflicts.
      
      const matchesProject = matchesMulti(projectFilter, lead.project)
      
      const matchesManager = (() => {
        if (!managerFilter || managerFilter.length === 0) return true;
        
        const selectedManagerIds = managerFilter.map(v => String(v))
        const selectedManagerUsers = usersList.filter(u => selectedManagerIds.includes(String(u.id)))
        
        if (selectedManagerUsers.length === 0) return false;

        // 2. Build a set of all valid assignee IDs (The managers themselves + all their subordinates)
        const validAssigneeIds = new Set(selectedManagerIds);
        
        selectedManagerUsers.forEach(manager => {
            const subordinates = getDescendants(manager.id, usersList);
            subordinates.forEach(sub => validAssigneeIds.add(sub.id));
        });
        
        // 3. Check if the lead's assigned user is in this set
        const leadAssigneeId = lead.assigned_to || (typeof lead.assignedTo === 'object' ? lead.assignedTo?.id : lead.assignedTo);
        
        return validAssigneeIds.has(String(leadAssigneeId));
      })();

      const matchesCreatedBy = matchesMulti(canShowCreator ? createdByFilter : [], lead.createdBy)
      const matchesOldStage = matchesMulti(oldStageFilter, lead.oldStage)
      const matchesCountry = matchesMulti(countryFilter, lead.country)
      const matchesWhatsappIntents = matchesMulti(whatsappIntentsFilter, lead.whatsappIntents)
      const matchesActionType = matchesMulti(actionTypeFilter, lead.actionType)
      const matchesDuplicateStatus = matchesMulti(duplicateStatusFilter, lead.duplicateStatus)
      
      // Date filters (From/To)
      const matchesAssignDate = _inDateRange(lead.assignDate, assignDateFrom, assignDateTo)
      const matchesActionDate = _inDateRange(lead.actionDate, lastActionFrom, lastActionTo)
      const matchesCreationDate = _inDateRange(lead.createdAt, creationDateFrom, creationDateTo)
      const matchesClosedDate = _inDateRange(lead.closedDate, closedDateFrom, closedDateTo)
      
      // Text filters
      // Email is partially covered by server search, but if specific email filter is used, keep it.
      const matchesEmail = !emailFilter || (lead.email && lead.email.toLowerCase().includes(emailFilter.toLowerCase()))
      const matchesExpectedRevenue = !expectedRevenueFilter || (lead.estimatedValue && lead.estimatedValue.toString().includes(expectedRevenueFilter))
      
      return matchesProject && matchesManager && matchesCreatedBy && matchesOldStage && 
             matchesCountry && matchesWhatsappIntents && matchesActionType && matchesDuplicateStatus &&
             matchesAssignDate && matchesActionDate && matchesCreationDate && matchesClosedDate &&
             matchesEmail && matchesExpectedRevenue
    })

    setFilteredLeads(filtered)
  }, [leads, projectFilter, managerFilter, createdByFilter, oldStageFilter, countryFilter, 
      whatsappIntentsFilter, actionTypeFilter, duplicateStatusFilter, assignDateFrom, assignDateTo,
      lastActionFrom, lastActionTo, creationDateFrom, creationDateTo, closedDateFrom, closedDateTo,
      emailFilter, expectedRevenueFilter, 
      isAdminOrManager, canShowCreator])

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-black dark:bg-blue-900 dark:text-blue-200'
      case 'qualified': return 'bg-green-100 text-black dark:bg-green-900 dark:text-green-200'
      case 'in-progress': return 'bg-yellow-100 text-black dark:bg-yellow-900 dark:text-yellow-200'
      case 'converted': return 'bg-purple-100 text-black dark:bg-purple-900 dark:text-purple-200'
      case 'lost': return 'bg-red-100 text-black dark:bg-red-900 dark:text-red-200'
      default: return ` bg-gray-900 ${isLight ? 'text-black' : 'text-white'}`
    }
  }

  const getPriorityColor = (priority) => {
    switch (String(priority).toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return `bg-gray-900 ${isLight ? 'text-black' : 'text-white'}`
    }
  }

  const getStageStyle = (stageName) => {
    const stage = stages.find(s => s.name === stageName);
    if (stage && stage.color) {
      return {
        style: { backgroundColor: `${stage.color}20`, color: stage.color, borderColor: `${stage.color}40` },
        className: 'border'
      };
    }
    return {
      style: {},
      className: 'bg-gray-700 text-gray-300'
    };
  };

  const getSourceIcon = (source) => {
    const s = String(source || '').toLowerCase();
    if (s.includes('facebook')) return '📱';
    if (s.includes('website')) return '🌐';
    if (s.includes('referral')) return '👥';
    if (s.includes('campaign')) return '📧';
    if (s.includes('social-media')) return '📱';
    if (s.includes('email-campaign')) return '📧';
    if (s.includes('direct')) return '🏢';
    if (s.includes('cold') || s.includes('call')) return '📞';
    return '📋';
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(paginatedLeads.map(lead => lead.id))
    } else {
      setSelectedLeads([])
    }
  }

  const handleSelectLead = (leadId) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  

  // Click-away to hide tooltip when clicking any other element
  useEffect(() => {
    const handleDocumentMouseDown = (e) => {
      if (!showTooltip) return
      // If clicking inside tooltip, ignore
      if (tooltipRef.current && tooltipRef.current.contains(e.target)) return
      // If clicking the active row, ignore (we handle showing via row click)
      if (activeRowRef.current && activeRowRef.current.contains(e.target)) return
      // Otherwise hide
      setShowTooltip(false)
      setHoveredLead(null)
      activeRowRef.current = null
    }
    document.addEventListener('mousedown', handleDocumentMouseDown)
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown)
  }, [showTooltip])

  const [bulkAssignTo, setBulkAssignTo] = useState('')
  const [bulkAssignReferralTo, setBulkAssignReferralTo] = useState('')
  const [referralSupervisors, setReferralSupervisors] = useState([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkFeedback, setBulkFeedback] = useState(null)

  const uniqueAssignees = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.assignedTo).filter(Boolean))).sort()
  }, [leads])

  const handleAssignLead = async (leadId, newAssignee) => {
    // Optimistic Update
    const updatedLeads = leads.map(l => l.id === leadId ? { 
      ...l, 
      assignedTo: newAssignee, 
      sales_person: newAssignee,
      assignedAgent: { ...(l.assignedAgent || {}), name: newAssignee },
      stage: 'Pending' 
    } : l)
    setLeads(updatedLeads)
    setFilteredLeads(prev => prev.map(l => l.id === leadId ? { 
      ...l, 
      assignedTo: newAssignee, 
      sales_person: newAssignee,
      assignedAgent: { ...(l.assignedAgent || {}), name: newAssignee },
      stage: 'Pending' 
    } : l))
    localStorage.setItem('leadsData', JSON.stringify(updatedLeads))

    // Also update selectedLead if it matches, so the modal reflects the change immediately
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(prev => ({ 
        ...prev, 
        assignedTo: newAssignee, 
        sales_person: newAssignee,
        assignedAgent: { ...(prev.assignedAgent || {}), name: newAssignee },
        stage: 'Pending' 
      }))
    }
    if (hoveredLead && hoveredLead.id === leadId) {
      setHoveredLead(prev => ({ 
        ...prev, 
        assignedTo: newAssignee, 
        sales_person: newAssignee,
        assignedAgent: { ...(prev.assignedAgent || {}), name: newAssignee },
        stage: 'Pending' 
      }))
    }
    window.dispatchEvent(new CustomEvent('leadsDataUpdated'))

    // API Call to sync with backend
    try {
      const assignedUser = usersList.find(u => u.name === newAssignee);
      const assignedUserId = assignedUser ? assignedUser.id : null;
      
      await api.put(`/api/leads/${leadId}`, {
        assignedTo: newAssignee,
        assigned_to_id: assignedUserId
      });
      fetchLeads();
    } catch (error) {
      console.error('Failed to assign lead:', error);
      const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: isRtl ? 'فشل تعيين العميل' : 'Failed to assign lead' } });
      window.dispatchEvent(evt);
      // Revert state by fetching fresh data
      fetchLeads();
    }
  }

  useEffect(() => {
    if (canUseBulkAssign) {
      api.get('/api/referral-supervisors')
        .then(res => setReferralSupervisors(res.data))
        .catch(err => console.error('Failed to fetch referral supervisors', err))
    }
  }, [canUseBulkAssign])

  const handleUpdateLead = (updatedLead) => {
    const isMatch = (l) => (l.id && l.id === updatedLead.id) || (l._id && l._id === updatedLead._id);
    const updatedLeads = leads.map(l => isMatch(l) ? updatedLead : l)
    setLeads(updatedLeads)
    setFilteredLeads(prev => prev.map(l => isMatch(l) ? updatedLead : l))
    localStorage.setItem('leadsData', JSON.stringify(updatedLeads))
    
    if (selectedLead && isMatch(selectedLead)) {
      setSelectedLead(updatedLead)
    }
    if (hoveredLead && isMatch(hoveredLead)) {
      setHoveredLead(updatedLead)
    }
    window.dispatchEvent(new CustomEvent('leadsDataUpdated'))
    fetchLeads();
  }

  // Rotation rules: guard bulk assignment using settings (working hours, allow/delay)
  const { canAssignNow } = (() => {
    try {
      // Lazy import to avoid bundling cycles
      const mod = require('../utils/rotation')
      return { canAssignNow: mod.canAssignNow }
    } catch {
      return { canAssignNow: () => ({ ok: true }) }
    }
  })()

  const handleBulkReAssign = async (assignData) => {
    const target = assignData.userId;
    
    if (!target) {
      setBulkFeedback({ key: 'bulk.selectAssigneeError' })
      return
    }

    try {
      await api.post('/api/leads/bulk-assign', {
        ids: selectedLeads,
        assigned_to: target,
        assign_role: assignData.assignRole,
        options: assignData.options
      });

      setLeads(prev => prev.map(l => {
        if (selectedLeads.includes(l.id)) {
          if (assignData.assignRole === 'manager') {
             const next = {
               ...l,
               manager_id: target,
               managerId: target,
               manager: assignData.userName,
               assigned_to: null,
               assignedTo: '',
               sales_person: '',
             };
             return next;
          } else {
             return { ...l, assignedTo: assignData.userName, sales_person: assignData.userName };
          }
        }
        return l;
      }))
      
      setBulkFeedback({ key: 'bulk.assignSuccess', params: { count: selectedLeads.length, target: assignData.userName } })
      setSelectedLeads([])
      setShowBulkAssignModal(false)
      
      fetchLeads();
    } catch (error) {
      console.error('Bulk assign failed', error);
      setBulkFeedback({ key: 'bulk.assignError' });
    }
  }

  const applyBulkAssign = async () => {
    // If bulkAssignTo is an object (from SearchableSelect), extract value, otherwise use as string
    const target = (typeof bulkAssignTo === 'object' ? bulkAssignTo?.value : bulkAssignTo) || '';
    const trimmedTarget = String(target).trim();
    
    if (!trimmedTarget) {
      setBulkFeedback({ key: 'bulk.selectAssigneeError' })
      return
    }
    // const guard = canAssignNow(new Date()) // Commented out temporarily to fix build/require issue
    // if (!guard.ok) {
    //   setBulkFeedback({ key: 'bulk.assignBlocked', params: { reason: guard.reason } })
    //   return
    // }

    try {
      await api.post('/api/leads/bulk-assign', {
        ids: selectedLeads,
        assigned_to: trimmedTarget
      });

      setLeads(prev => prev.map(l => (
        selectedLeads.includes(l.id) ? { ...l, assignedTo: trimmedTarget } : l
      )))
      setBulkFeedback({ key: 'bulk.assignSuccess', params: { count: selectedLeads.length, target: trimmedTarget } })
      setSelectedLeads([])
      setBulkAssignTo('')
      
      // Refresh data to ensure sync
      fetchLeads();
    } catch (error) {
      console.error('Bulk assign failed', error);
      setBulkFeedback({ key: 'bulk.assignError' });
    }
  }

  const applyBulkAssignReferral = async () => {
    const target = bulkAssignReferralTo
    if (!target) {
      setBulkFeedback({ key: 'bulk.selectAssigneeError' })
      return
    }

    try {
      await api.post('/api/leads/bulk-assign-referral', {
        lead_ids: selectedLeads,
        referral_user_id: target
      });

      setBulkFeedback({ key: 'bulk.assignReferralSuccess', params: { count: selectedLeads.length } })
      setSelectedLeads([])
      setBulkAssignReferralTo('')
      
      fetchLeads();
    } catch (error) {
      console.error('Bulk assign referral failed', error);
      const msg = error.response?.data?.message || 'Bulk assign referral failed';
      const errors = error.response?.data?.errors;
      alert(`${msg}\n${errors ? errors.join('\n') : ''}`);
    }
  }

  const applyBulkStatus = async () => {
    const status = bulkStatus?.trim()
    if (!status) {
      setBulkFeedback({ key: 'bulk.selectStatusError' })
      return
    }

    try {
      await api.post('/api/leads/bulk-status', {
        ids: selectedLeads,
        status: status
      });

      setLeads(prev => prev.map(l => (
        selectedLeads.includes(l.id) ? { ...l, status } : l
      )))
      setBulkFeedback({ key: 'bulk.statusUpdateSuccess', params: { count: selectedLeads.length, status } })
      setSelectedLeads([])
      setBulkStatus('')
      
      fetchLeads();
    } catch (error) {
      console.error('Bulk status update failed', error);
      setBulkFeedback({ key: 'bulk.statusError' });
    }
  }

  const applyBulkDelete = async () => {
    try {
      await api.post('/api/leads/bulk-delete', {
        ids: selectedLeads
      });
      
      setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)))
      setBulkFeedback({ key: 'bulk.deleteSuccess', params: { count: selectedLeads.length } })
      setSelectedLeads([])
      
      fetchLeads();
    } catch (error) {
      console.error('Bulk delete failed', error);
      setBulkFeedback({ key: 'bulk.deleteError' });
    }
  }

  // Bulk Convert selected leads to Customers
  const applyBulkConvert = async () => {
    if (crmSettings?.allowConvertToCustomers === false) {
      alert(i18n.language === 'ar' ? 'تم إيقاف التحويل إلى عملاء من إعدادات النظام' : t('Conversion to customers is disabled in system settings'));
      return;
    }
    const leadsToConvert = leads.filter(l => selectedLeads.includes(l.id))
    if (leadsToConvert.length === 0) return

    const validLeads = []
    const invalidLeads = []
    for (const lead of leadsToConvert) {
      const name = String(lead?.name || lead?.company || '').trim()
      const phone = String(lead?.phone || '').trim()
      if (!name || !phone || phone.length < 5) {
        invalidLeads.push(lead)
        continue
      }
      const tagsArr = Array.isArray(lead?.tags)
        ? lead.tags
        : (lead?.tags ? String(lead.tags).split(',').map(s => s.trim()).filter(Boolean) : (lead?.source ? [String(lead.source)] : []))

      const payload = {
        name,
        phone,
        email: String(lead?.email || '').trim(),
        type: String(lead?.type || (lead?.company ? 'Company' : 'Individual')),
        companyName: lead?.company || '',
        country: String(lead?.country || '').trim(),
        city: String(lead?.city || '').trim(),
        addressLine: String(lead?.address || '').trim(),
        contacts: lead?.company ? [{
          name: String(lead?.name || '').trim(),
          phone: String(lead?.phone || '').trim(),
          email: String(lead?.email || '').trim(),
        }] : [],
        tags: tagsArr,
        notes: String(lead?.notes || '').trim(),
        assignedSalesRep: String(lead?.salesPerson || lead?.assignedTo || '').trim(),
      }
      validLeads.push(payload)
    }

    try {
      // API call to create customers
      await Promise.all(validLeads.map(p => api.post('/api/customers', p)))

      setBulkFeedback({ key: 'bulk.convertSuccess', params: { success: validLeads.length, failed: invalidLeads.length } })
      
      // Update local leads to reflect conversion (e.g., change stage to 'converted' or delete)
      // Optionally we can delete them or just update status
      const convertedIds = leadsToConvert.filter(l => validLeads.some(v => v.phone === l.phone)).map(l => l.id);
      
      // Update status to converted on backend if needed
      if (convertedIds.length > 0) {
          try {
            await api.post('/api/leads/bulk-status', {
                ids: convertedIds,
                status: 'converted'
            });
          } catch (e) { console.warn('Failed to update lead status after conversion', e); }
      }

      setLeads(prev => prev.map(l => {
        if (selectedLeads.includes(l.id)) {
          const isValid = validLeads.some(v => v.phone === l.phone)
          if (isValid) return { ...l, stage: 'converted', status: 'converted' }
          return l
        }
        return l
      }))

      setSelectedLeads([])
      fetchLeads();

    } catch (e) {
      console.error('bulk convert failed', e)
      setBulkFeedback({ key: 'bulk.convertError' })
    }
  }

  // Delete single lead (ظهر فقط إذا كان الصف مُحدد)
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من نقل هذا السجل إلى سلة المحذوفات؟' : 'Are you sure you want to move this lead to recycle bin?')) {
      return;
    }

    try {
      // استدعاء API الحذف من الباك اند
      await api.delete(`/api/leads/${leadId}`);
      
      // تحديث الواجهة بحذف العنصر من القائمة الحالية دون إعادة تحميل الصفحة
      setLeads(prev => prev.filter(l => l.id !== leadId));
      fetchLeads();
      
      // إظهار رسالة نجاح (اختياري حسب نظام التنبيهات لديك)
      // toast.success(isRtl ? 'تم النقل إلى سلة المحذوفات' : 'Moved to recycle bin');
      
    } catch (error) {
      console.error('Failed to delete lead:', error);
      alert(isRtl ? 'فشل حذف السجل' : 'Failed to delete lead');
    }
  }

  // Convert Lead -> Customer (إضافة إلى جدول العملاء)
  const handleConvertCustomer = async (lead) => {
    if (crmSettings?.allowConvertToCustomers === false) {
      alert(i18n.language === 'ar' ? 'تم إيقاف التحويل إلى عملاء من إعدادات النظام' : t('Conversion to customers is disabled in system settings'));
      return;
    }
    try {
      const name = String(lead?.name || lead?.company || '').trim()
      const phone = String(lead?.phone || '').trim()
      if (!name || !phone || phone.length < 5) {
        alert(i18n.language === 'ar' ? 'لا يمكن التحويل: الاسم/الهاتف مفقود' : t('Conversion failed: missing name/phone'))
        return
      }
      const tagsArr = Array.isArray(lead?.tags)
        ? lead.tags
        : (lead?.tags ? String(lead.tags).split(',').map(s => s.trim()).filter(Boolean) : (lead?.source ? [String(lead.source)] : []))

      const payload = {
        name,
        phone,
        email: String(lead?.email || '').trim(),
        type: String(lead?.type || (lead?.company ? 'Company' : 'Individual')),
        companyName: lead?.company || '',
        country: String(lead?.country || '').trim(),
        city: String(lead?.city || '').trim(),
        addressLine: String(lead?.address || '').trim(),
        contacts: lead?.company ? [{
          name: String(lead?.name || '').trim(),
          phone: String(lead?.phone || '').trim(),
          email: String(lead?.email || '').trim(),
        }] : [],
        tags: tagsArr,
        notes: String(lead?.notes || '').trim(),
        assignedSalesRep: String(lead?.sales || lead?.assignedTo || '').trim(),
      }
      
      await api.post('/api/customers', payload) 

      alert(i18n.language === 'ar' ? 'تم تحويل الليد إلى عميل بنجاح' : t('Lead converted to customer successfully'))
      
      // Update local leads: remove the converted lead or update its stage/status
      // Also update status on backend
      try {
          await api.put(`/leads/${lead.id}`, { status: 'converted', stage: 'converted' });
      } catch (e) { console.warn('Failed to update lead status', e); }

      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: 'converted', status: 'converted' } : l))
      fetchLeads();

    } catch (err) {
      console.error('convert customer failed', err)
      alert(i18n.language === 'ar' ? 'فشل التحويل إلى عميل' : t('Failed to convert to customer'))
    }
  }

  // Pagination
  const totalPages = Math.max(1, Number(leadsQueryData?.last_page) || 1);
  const totalItems = Math.max(0, Number(leadsQueryData?.total) || 0);
  const paginatedLeads = filteredLeads; // filteredLeads is already the current page data from API

  // FIX 1: Corrected the incomplete object definition for export
  const handleExportRange = () => {
    const actualTotal = totalPages
    const from = Math.max(1, Math.min(Number(exportFrom) || currentPage, actualTotal))
    const to = Math.max(from, Math.min(Number(exportTo) || from, actualTotal))
    const startIdx = (from - 1) * itemsPerPage
    const endIdx = Math.min(to * itemsPerPage, totalItems)
    const rangeLeads = filteredLeads.slice(startIdx, endIdx)
    
    // FIX 1: Completed the object definition to fix the syntax error 'l...'
    const rows = rangeLeads.map(l => ({
      'Name': l.name,
      'Email': l.email,
      'Phone': l.phone,
      'Company': l.company,
      'Stage': l.stage,
      'Priority': l.priority,
      'Source': l.source,
      'Assigned To': l.assignedTo,
      'Created At': l.createdAt,
      'Last Contact': l.lastContact,
      'Last Comment': l.latest_action?.description || l.latest_action?.details?.notes || l.notes || '-',
      'Estimated Value': l.estimatedValue,
      'Probability': l.probability
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')
    const fileName = `Leads_Page_${from}_to_${to}.xlsx`
    XLSX.writeFile(workbook, fileName)
    logExportEvent({
      module: 'Leads',
      fileName,
      format: 'xlsx',
    })
  }

  const columnMinWidths = {
    source: 140,
    project: 140,
    salesPerson: 140,
    actionOwner: 140,
    lastComment: 220,
    stage: 140,
    expectedRevenue: 160,
    priority: 140,
  };

  return (
    <div className={`px-2 max-[480px]:px-1 py-4 md:px-6 md:py-6 min-h-screen  ${textColor}` } dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={`p-4 flex justify-between items-center gap-4 mb-6`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={`relative inline-flex items-center ${isRtl ? 'flex-row-reverse' : ''} gap-2`}>
          <h1 className={`page-title text-2xl md:text-3xl font-bold ${isLight ? 'text-black' : 'text-white'} flex items-center gap-2 ${isRtl ? 'text-right' : 'text-left'}`} style={{ textAlign: isRtl ? 'right' : 'left', color: theme === 'dark' ? '#ffffff' : '#000000' }}>
            {location.pathname === '/leads/my-leads' ? (i18n.language === 'ar' ? 'مسار ليداتي' : t('My Leads Pipeline')) : t('Leads')}
          </h1>
          <span
            aria-hidden
            className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent"
            style={{ width: 'calc(100% + 8px)', left: isRtl ? 'auto' : '-4px', right: isRtl ? '-4px' : 'auto', bottom: '-4px' }}
          ></span>
        </div>
        <div className={`flex items-center gap-2 max-[480px]:gap-1 flex-nowrap ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
          {canAddLead && (
            <button
              onClick={() => navigate('/leads/new')}
              className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none gap-2 max-[480px]:px-2 max-[480px]:py-1.5 max-[480px]:h-8 max-[480px]:gap-1 max-[480px]:text-xs whitespace-nowrap"
            >
              <FaPlus className=" w-3 h-3 text-white" />
              <span className="text-white">{t('Add New Lead')}</span>
            </button>
          )}
          {canImportLeads && (
            <button onClick={() => setShowImportModal(true)} className="btn btn-sm bg-blue-600 hover:bg-blue-700  border-none gap-2 max-[480px]:px-2 max-[480px]:py-1.5 max-[480px]:h-8 max-[480px]:gap-1 max-[480px]:text-xs whitespace-nowrap" >
              <svg className="  w-3 h-3 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
                <path d="M4 20h16" />
              </svg>
              <span className="text-white">{t('Import')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Leads Table Filters & Controls */}
      <div className={`glass-panel rounded-2xl p-3 mb-6 filters-compact`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className={`text-lg font-semibold  ${isLight ? 'text-black' : 'text-white'} flex items-center gap-2`}>
            <FaFilter size={16} className="text-blue-500 dark:text-blue-400" /> {t('Filters')}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAllFilters(prev => !prev)} className={`flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors`}>
              {showAllFilters ? t('Hide ') : t('Show ')}
              <FaChevronDown size={12} className={`transform transition-transform duration-300 ${showAllFilters ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <button
              onClick={() => {
                setSearchTerm('')
                setSourceFilter([])
                setPriorityFilter([])
                setProjectFilter([])
                setStageFilter([])
                setManagerFilter([])
                setSalesPersonFilter([])
                setCreatedByFilter([])
                setAssignDateFrom('')
                setAssignDateTo('')
                setLastActionFrom('')
                setLastActionTo('')
                setCreationDateFrom('')
                setCreationDateTo('')
                setOldStageFilter([])
                setClosedDateFrom('')
                setClosedDateTo('')
                setCampaignFilter([])
                setCountryFilter([])
                setExpectedRevenueFilter('')
                setEmailFilter('')
                setActionTypeFilter([])
                setDuplicateStatusFilter([])
                setSortBy('createdAt')
                setSortOrder('desc')
                setCurrentPage(1)
              }}
              className={`px-3 py-1.5 text-sm ${isLight ? 'text-black' : 'text-white'} hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors`}
            >
              {t('Reset')}
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="space-y-3">
          {/* First Row - Always Visible (Search + 3 filters) */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Search */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                <FaSearch size={12} className="text-blue-500 dark:text-blue-400" />
                {t('Search')}
              </label>
              <input
                type="text"
                placeholder={t('Search leads...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg   ${isLight ? 'text-black' : 'text-white'} text-sm font-medium  dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
              />
            </div>

            {/* Source Filter */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 4l-4 4 4 4" />
                </svg>
                {t('Source')}
              </label>
              <SearchableSelect
                value={sourceFilter}
                multiple={true}
                onChange={setSourceFilter}
                options={sourcesList.map(s => ({ value: s.name, label: s.name }))}
                placeholder={t('All')}
                isRTL={isRtl}
              />
            </div>

            {/* Priority Filter */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('Priority')}
              </label>
              <SearchableSelect
                value={priorityFilter}
                multiple={true}
                onChange={setPriorityFilter}
                options={[
                  { value: 'high', label: t('High') },
                  { value: 'medium', label: t('Medium') },
                  { value: 'low', label: t('Low') }
                ]}
                placeholder={t('All ')}
                isRTL={isRtl}
              />
            </div>

            {/* Project Filter */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {String(company?.company_type || '').toLowerCase() === 'general' ? t('Item') : t('Project')}
              </label>
              <SearchableSelect
                value={projectFilter}
                multiple={true}
                onChange={setProjectFilter}
                options={projectsList.map(p => ({ value: p.name, label: p.name }))}
                placeholder={t('All')}
                isRTL={isRtl}
              />
            </div>
          </div>

          {/* Additional Filters (Show/Hide) */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showAllFilters ? 'max-h-[800px] opacity-100 pt-3' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2">

              {/* Stage Filter (using sidebar stages for options) */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  {t('Stage')}
                </label>
                <SearchableSelect
                value={stageFilter}
                multiple={true}
                onChange={setStageFilter}
                  options={(() => {
                    // Create list of all stages including fixed ones
                    const fixedStages = [
                      { name: 'New', name_ar: 'جديد', icon: 'Sparkles' },
                      { name: 'Follow Up', name_ar: 'متابعة', icon: 'Clock' },
                      { name: 'Cold Calls', name_ar: 'العملاء المحتملين', icon: 'Phone' },
                      ...(!isSalesPerson ? [{ name: 'Pending', name_ar: 'معلقة', icon: 'Hourglass' }] : []),
                      { name: 'Duplicate', name_ar: 'مكرر', icon: 'Copy' }
                    ];
                    
                    // Filter out duplicate or special stages from dynamic list if needed
                    const dynamicStages = stagesList.filter(s => {
                      const normEn = String(s.name || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '')
                      const normAr = String(s.name_ar || '').toLowerCase()
                      return normEn !== 'followup' && !normAr.includes('متابعة')
                    });

                    // Combine fixed and dynamic stages
                    const allStages = [...fixedStages, ...dynamicStages];

                    return allStages.map(s => ({ 
                      value: s.name, 
                      label: isRtl ? (s.name_ar || s.name) : s.name, 
                      icon: s.icon 
                    }));
                  })()}
                  placeholder={t('All ')}
                  isRTL={isRtl}
                />
              </div>

              {/* Manager Filter */}
              {!['sales person', 'team leader'].includes(userRole) && (
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t('Manager')}
                </label>
                <SearchableSelect
                  value={managerFilter}
                  multiple={true}
                  onChange={setManagerFilter}
                  options={availableManagers.map(u => ({ value: u.id, label: u.name }))}
                  placeholder={t('All ')}
                  isRTL={isRtl}
                />
              </div>
              )}

              {/* Sales Person Filter */}
              {userRole !== 'sales person' && (
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {t('Sales Person')}
                </label>
                <SearchableSelect
                  value={salesPersonFilter}
                  multiple={true}
                  onChange={setSalesPersonFilter}
                  options={availableSalesPersons.map(u => ({ value: u.id, label: u.name }))}
                  placeholder={t('All ')}
                  isRTL={isRtl}
                />
              </div>
              )}

              {/* Created By Filter */}
              {canShowCreator && <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20h18" />
                  </svg>
                  {t('Created By')}
                </label>
                <SearchableSelect
                  value={createdByFilter}
                  multiple={true}
                  onChange={setCreatedByFilter}
                  options={usersList.map(u => ({ value: u.id, label: u.name }))}
                  placeholder={t('All ')}
                  isRTL={isRtl}
                />
              </div>}

              {/* Old Stage Filter */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.657 0 3 1.343 3 3v1h1a2 2 0 012 2v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5a2 2 0 012-2h1v-1c0-1.657 1.343-3 3-3z" />
                  </svg>
                  {t('Old Stage')}
                </label>
                <SearchableSelect
                  value={oldStageFilter}
                  onChange={setOldStageFilter}
                  options={stagesList.map(s => ({ value: s.name, label: isRtl ? (s.name_ar || s.name) : s.name, icon: s.icon }))}
                  placeholder={t('All')}
                  isRTL={isRtl}
                />
              </div>

              {/* Campaign Filter */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m0 0a2 2 0 104 0m-4 0h4" />
                  </svg>
                  {t('Campaign')}
                </label>
                <SearchableSelect
                  value={campaignFilter}
                  multiple={true}
                  onChange={setCampaignFilter}
                  options={campaignsList.map(c => ({ value: c.name, label: c.name }))}
                  placeholder={t('All ')}
                  isRTL={isRtl}
                />
              </div>

              {/* Country Filter */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v10a2 2 0 01-2 2H3.055L3 11zM11 5h2m-2 0V3m0 2v2m0-2h-2m2 0h2m-2 0V3a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                  {t('Country')}
                </label>
                <SearchableSelect
                value={countryFilter}
                multiple={true}
                onChange={setCountryFilter}
                  options={countriesData.map(c => ({ value: c.nameEn, label: isRtl ? c.nameAr : c.nameEn }))}
                  placeholder={t('All ')}
                  isRTL={isRtl}
                />
              </div>

              {/* Expected Revenue Filter (Text/Number Input) */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .343-3 .768V11a.5.5 0 00.5.5h5a.5.5 0 00.5-.5V8.768C15 8.343 13.657 8 12 8z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11.5v6.5m-3-6.5h6m-3 0V5m0 0h3m-3 0H9" />
                  </svg>
                  {t('Expected Revenue')}
                </label>
                <input
                  type="number"
                  placeholder={t('Enter minimum value...')}
                  value={expectedRevenueFilter}
                  onChange={(e) => setExpectedRevenueFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg     text-xs font-medium  dark:placeholder-text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200"
                />
              </div>

              {/* Email Filter (Text Input) */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <FaEnvelope size={12} className="text-blue-500 dark:text-blue-400" />
                  {t('Email')}
                </label>
                <input
                  type="text"
                  placeholder={t('Search email...')}
                  value={emailFilter}
                  onChange={(e) => setEmailFilter(e.target.value)}
                  className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg  dark:bg-gray-700  ${isLight ? 'text-black' : 'text-white'} text-sm font-medium  dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
                />
              </div>



              {/* action Type Filter */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {t('action Type')}
                </label>
                <SearchableSelect
                  value={actionTypeFilter}
                  multiple={true}
                  onChange={setActionTypeFilter}
                  options={[
                    { value: 'call', label: t('Call ') },
                    { value: 'whatsapp', label: t('whatsapp') },
                    { value: 'email', label: t('email') },

                    { value: 'google meet ', label: t('google meet') },
                    { value: 'sms', label: t('sms ') }

                  ]}
                  placeholder={t('Action Types')}
                  isRTL={isRtl}
                />
              </div>

              {/* Duplicate Status Filter */}
              {isDuplicateAllowed && (
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v4a1 1 0 001 1h4a1 1 0 001-1V7m0 10v4a1 1 0 001 1h4a1 1 0 001-1v-4m-6-4H6a2 2 0 00-2 2v4a2 2 0 002 2h4m-6-4h4m-4 0v-4" />
                  </svg>
                  {t('Duplicate Status')}
                </label>
                <SearchableSelect
                  value={duplicateStatusFilter}
                  multiple={true}
                  onChange={setDuplicateStatusFilter}
                  options={[
                    { value: 'duplicate', label: t('Duplicate') },
                    { value: 'unique', label: t('Unique') }
                  ]}
                  placeholder={t('All ')}
                  isRTL={isRtl}
                />
              </div>
              )}

              {/* Assign Date Filter */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {t('Assign Date')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={assignDateFrom}
                    max={assignDateTo || undefined}
                    title={isRtl ? 'من' : 'From'}
                    aria-label={`${t('Assign Date')} ${isRtl ? 'من' : 'From'}`}
                    onChange={(e) => setAssignDateFrom(e.target.value)}
                    className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg dark:bg-gray-700 ${isLight ? 'text-black' : 'text-white'} text-xs font-medium dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
                  />
                  <input
                    type="date"
                    value={assignDateTo}
                    min={assignDateFrom || undefined}
                    title={isRtl ? 'إلى' : 'To'}
                    aria-label={`${t('Assign Date')} ${isRtl ? 'إلى' : 'To'}`}
                    onChange={(e) => setAssignDateTo(e.target.value)}
                    className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg dark:bg-gray-700 ${isLight ? 'text-black' : 'text-white'} text-xs font-medium dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
                  />
                </div>
              </div>

              {/* Action Date Filter */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {t('Last Action Date')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={lastActionFrom}
                    max={lastActionTo || undefined}
                    title={isRtl ? 'من' : 'From'}
                    aria-label={`${t('Last Action Date')} ${isRtl ? 'من' : 'From'}`}
                    onChange={(e) => setLastActionFrom(e.target.value)}
                    className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg dark:bg-gray-700 ${isLight ? 'text-black' : 'text-white'} text-xs font-medium dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
                  />
                  <input
                    type="date"
                    value={lastActionTo}
                    min={lastActionFrom || undefined}
                    title={isRtl ? 'إلى' : 'To'}
                    aria-label={`${t('Last Action Date')} ${isRtl ? 'إلى' : 'To'}`}
                    onChange={(e) => setLastActionTo(e.target.value)}
                    className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg dark:bg-gray-700 ${isLight ? 'text-black' : 'text-white'} text-xs font-medium dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
                  />
                </div>
              </div>

              {/* Creation Date Filter */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {t('Creation Date')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={creationDateFrom}
                    max={creationDateTo || undefined}
                    title={isRtl ? 'من' : 'From'}
                    aria-label={`${t('Creation Date')} ${isRtl ? 'من' : 'From'}`}
                    onChange={(e) => setCreationDateFrom(e.target.value)}
                    className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg dark:bg-gray-700 ${isLight ? 'text-black' : 'text-white'} text-xs font-medium dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
                  />
                  <input
                    type="date"
                    value={creationDateTo}
                    min={creationDateFrom || undefined}
                    title={isRtl ? 'إلى' : 'To'}
                    aria-label={`${t('Creation Date')} ${isRtl ? 'إلى' : 'To'}`}
                    onChange={(e) => setCreationDateTo(e.target.value)}
                    className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg dark:bg-gray-700 ${isLight ? 'text-black' : 'text-white'} text-xs font-medium dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
                  />
                </div>
              </div>

              {/* Closed Date Filter */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {t('Closed Date')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={closedDateFrom}
                    max={closedDateTo || undefined}
                    title={isRtl ? 'من' : 'From'}
                    aria-label={`${t('Closed Date')} ${isRtl ? 'من' : 'From'}`}
                    onChange={(e) => setClosedDateFrom(e.target.value)}
                    className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg dark:bg-gray-700 ${isLight ? 'text-black' : 'text-white'} text-xs font-medium dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
                  />
                  <input
                    type="date"
                    value={closedDateTo}
                    min={closedDateFrom || undefined}
                    title={isRtl ? 'إلى' : 'To'}
                    aria-label={`${t('Closed Date')} ${isRtl ? 'إلى' : 'To'}`}
                    onChange={(e) => setClosedDateTo(e.target.value)}
                    className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg dark:bg-gray-700 ${isLight ? 'text-black' : 'text-white'} text-xs font-medium dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
                  />
                </div>
              </div>
            </div>

          </div>

          
        </div>
      </div>

      <div className={`flex items-center justify-between mb-3`}>
        <h2 className={`text-xl font-bold ${isLight ? 'text-black' : 'text-white'} `} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>
          {location.pathname === '/leads/my-leads' ? (i18n.language === 'ar' ? 'مسار ليداتي' : t('My Leads Pipeline')) : t('Leads Pipeline')}
        </h2>
        <ColumnToggle
          columns={displayColumns}
          visibleColumns={visibleColumns}
          onColumnToggle={handleColumnToggle}
          onResetColumns={resetVisibleColumns}
          align={'right'}
          compact
          order={columnOrder}
          onReorder={handleColumnReorder}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4 items-stretch">
        <button
          onClick={() => setStageFilter([])}
          className={`btn btn-glass text-sm flex items-center justify-between gap-2 px-3 py-2 min-h-[56px] h-full ${textColor}`}
        >
          <span className="flex items-center gap-2 text-left"><span>Σ</span><span>{t('total leads')}</span></span>
          <span className="font-bold">{formatInt(stageCounts.total)}</span>
        </button>

        {sidebarStages.map((s) => (
          <button
            key={s.key}
            onClick={() => {
                // Special handling for Cold Calls
                if (s.backendKey === 'coldCall' || s.key === 'cold calls') {
                    // Toggle logic
                    if (stageFilter.includes('coldCall')) {
                        setStageFilter([]);
                    } else {
                        setStageFilter(['coldCall']);
                    }
                } else {
                    setStageFilter([s.key]);
                }
            }}
            className={`btn btn-glass text-sm flex items-center justify-between gap-2 px-3 py-2 min-h-[56px] h-full ${textColor} ${
               // Highlight active filter
               (stageFilter.includes(s.key) || (s.backendKey === 'coldCall' && stageFilter.includes('coldCall'))) 
               ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
               : ''
            }`}
          >
            <span className="flex items-center gap-2 text-left"><span>{renderStageIcon(s.icon)}</span><span>{t(s.key)}</span></span>
            <span className="font-bold">{formatInt(stageCounts[s.key] || 0)}</span>
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className={`glass-panel rounded-2xl overflow-hidden`}>
        <div className="relative z-[60] flex flex-col md:flex-row justify-between items-center p-4 gap-4 border-b border-theme-border dark:border-gray-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md">
          {selectedLeads.length > 0 ? (
            <div className="flex items-center gap-3 flex-wrap w-full">
              <div className={`flex items-center px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-sm font-semibold ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
                {t('Selected')}: {selectedLeads.length}
              </div>

              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1 hidden md:block"></div>

              <div className="flex items-center gap-2 flex-wrap">
                {canUseBulkAssign && (
                  <button 
                    onClick={() => setShowBulkAssignModal(true)} 
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium shadow-lg shadow-blue-500/20 transition-all duration-200 active:scale-95"
                  >
                    <FaUserTie className="text-xs" />
                    {isRtl ? 'تعيين العملاء' : 'Assign Leads'}
                  </button>
                )}

                {canUseBulkAssign && referralSupervisors.length > 0 && (
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700/50 p-1 rounded-2xl border border-gray-200 dark:border-slate-600">
                    <SearchableSelect
                      value={bulkAssignReferralTo}
                      onChange={setBulkAssignReferralTo}
                      options={referralSupervisors.map(u => ({ value: u.id, label: u.name }))}
                      placeholder={t('Assign Referral To')}
                      showAllOption={false}
                      isRTL={isRtl}
                      className="!py-1 !px-3 !bg-transparent !border-none !text-xs min-w-[140px]"
                    />
                    <button 
                      onClick={applyBulkAssignReferral} 
                      className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200"
                      title={t('Assign Referral')}
                    >
                      <FaExchangeAlt className="text-xs" />
                    </button>
                  </div>
                )}

                {isDuplicateAllowed && getSelectedDuplicateIds().length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowBulkDuplicateMenu(v => !v)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium shadow-lg shadow-slate-500/10 transition-all duration-200 active:scale-95 dark:bg-slate-700 dark:hover:bg-slate-600"
                      title={t('Bulk Action')}
                    >
                      <FaClone className="text-xs" />
                      {t('Bulk Action')}
                      <FaChevronDown className="text-xs opacity-80" />
                    </button>

                    {showBulkDuplicateMenu && (
                      <div className={`${isLight ? 'bg-white border-gray-200' : 'bg-slate-800 border-slate-700'} absolute z-[9999] mt-2 w-56 rounded-xl border shadow-2xl overflow-hidden`}>
                        <button
                          onClick={() => runBulkDuplicateAction('keep_save')}
                          className={`${isLight ? 'hover:bg-gray-50 text-slate-900' : 'hover:bg-slate-700 text-white'} w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-2`}
                        >
                          <FaUserCheck className="text-xs opacity-80" />
                          {t('Keep & Save')}
                        </button>
                        <button
                          onClick={() => {
                            setShowBulkDuplicateMenu(false);
                            setShowBulkDuplicateTransferModal(true);
                          }}
                          className={`${isLight ? 'hover:bg-gray-50 text-slate-900' : 'hover:bg-slate-700 text-white'} w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-2`}
                        >
                          <FaExchangeAlt className="text-xs opacity-80" />
                          {t('Transfer')}
                        </button>
                        <button
                          onClick={() => runBulkDuplicateAction('enable_duplicate')}
                          className={`${isLight ? 'hover:bg-gray-50 text-slate-900' : 'hover:bg-slate-700 text-white'} w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-2`}
                        >
                          <FaClone className="text-xs opacity-80" />
                          {t('Enable Duplicate')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {canUseBulkMultiActions && (
                  <>
                    {crmSettings?.allowConvertToCustomers !== false && (
                      <button 
                        onClick={applyBulkConvert} 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/20 transition-all duration-200 active:scale-95"
                      >
                        <FaUserCheck className="text-xs" />
                        {t('To Customer')}
                      </button>
                    )}

                    <button 
                      onClick={applyBulkDelete} 
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium shadow-lg shadow-red-500/20 transition-all duration-200 active:scale-95"
                    >
                      <FaTrash className="text-xs" />
                      {t('Delete')}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <FaList className="text-xs" />
              <span className="text-sm font-medium">{t('No leads selected for bulk actions')}</span>
            </div>
          )}
        </div>
        <div ref={scrollXRef} className="mt-4 w-full overflow-x-auto rounded-lg shadow-md backdrop-blur-lg" style={{ '--table-header-bg': theme === 'dark' ? 'transparent' : undefined, '--scroll-bg': theme === 'dark' ? '#0f172a' : '#f9fafb' }}>
          <table className={`w-max min-w-full divide-y divide-theme-border dark:divide-gray-700 ${isLight ? 'text-black' : 'text-white'}`} style={{ tableLayout: 'auto' }}>
            <thead className={` ${tableHeaderBgClass} backdrop-blur-md sticky top-0 z-30 shadow-md`} style={{ backgroundColor: 'var(--table-header-bg)' }}>
              <tr>
                {/* Checkbox Column */}
                <th scope="col" className={`w-10 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'}  whitespace-nowrap`} style={{ backgroundColor: 'var(--table-header-bg)' }}>
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-theme-border rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                  />
                </th>

                {columnOrder.map(key => {
                  if (!visibleColumns[key]) return null;

                  if (key === 'lead') {
                    return (
                      <th
                        key="lead"
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'}  w-40 whitespace-nowrap cursor-pointer`}
                        style={{ backgroundColor: 'var(--table-header-bg)' }}
                        onClick={() => {
                          if (sortBy === 'lead') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortBy('lead')
                            setSortOrder('desc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {allColumns.lead}
                          {sortBy === 'lead' && (
                            <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                    );
                  }

                  if (key === 'contact') {
                    return (
                      <th
                        key="contact"
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'}  w-48 whitespace-nowrap`}
                        style={{ backgroundColor: 'var(--table-header-bg)' }}
                      >
                        <div className="flex items-center gap-1">{allColumns.contact}</div>
                      </th>
                    );
                  }

                  if (key === 'actions') {
                    return (
                      <th
                        key="actions"
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'}  whitespace-nowrap sticky ${i18n.language === 'ar' ? 'right-0' : 'left-0'} z-30`}
                        style={{ minWidth: '160px', backgroundColor: 'var(--table-header-bg)' }}
                      >
                        {t('Actions')}
                      </th>
                    );
                  }

                  // Check if it is a standard column
                  if (allColumns[key]) {
                    const isSortable = ['source','stage','priority','expectedRevenue'].includes(key);
                    return (
                      <th
                        key={key}
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'} whitespace-nowrap ${isSortable ? 'cursor-pointer' : 'cursor-default'}`}
                        style={{ minWidth: `${columnMinWidths[key] || 140}px`, backgroundColor: 'var(--table-header-bg)' }}
                        onClick={isSortable ? () => {
                          if (sortBy === key) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortBy(key)
                            setSortOrder('desc')
                          }
                        } : undefined}
                      >
                        <div className="flex items-center gap-1">
                          {allColumns[key]}
                          {sortBy === key && (
                            <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                    );
                  }

                  // Check if it is a dynamic field
                  const dynamicField = dynamicFields.find(f => f.key === key);
                  if (dynamicField) {
                    return (
                      <th key={key} className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'}  whitespace-nowrap`} style={{ minWidth: '150px', backgroundColor: 'var(--table-header-bg)' }}>
                        {i18n.language === 'ar' ? dynamicField.label_ar : dynamicField.label_en}
                      </th>
                    );
                  }

                  return null;
                })}
              </tr>
            </thead>

            <tbody className=" divide-y divide-theme-border dark:bg-transparent dark:divide-gray-700">
              {paginatedLeads.map((lead, index) => (
                <tr
                  key={lead.id}
                  className={` hover:bg-white/5 transition-colors duration-300 transition-colors duration-150 ${hoveredLead?.id === lead.id ? 'bg-white/5' : ''}`}
                  
                  onMouseEnter={() => setHoveredLead(lead)}
                  onMouseLeave={() => setHoveredLead(null)}
                  onClick={() => setActiveRowId(activeRowId === lead.id ? null : lead.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Checkbox Cell */}
                  <td className="w-10 px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => handleSelectLead(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-theme-border rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </td>

                  {columnOrder.map(key => {
                    if (!visibleColumns[key]) return null;

                    // Check if it is a dynamic field
                    const dynamicField = dynamicFields.find(f => f.key === key);
                    if (dynamicField) {
                      return (
                        <td key={key} className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'} `}>
                          {lead.custom_fields?.[key] ? String(lead.custom_fields[key]) : '-'}
                        </td>
                      );
                    }

                    switch (key) {
                      case 'lead':
                        // Only show duplicate icon if duplicate is allowed for the user
                        const isDuplicate = isDuplicateAllowed && (String(lead.stage || '').toLowerCase().includes('duplicate') || 
                                          String(lead.status || '').toLowerCase().includes('duplicate'));
                        return (
                          <td key="lead" className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                            <div className="font-semibold text-base flex items-center gap-1">
                              {lead.name}
                              {isDuplicate && (
                                <span title={t('Duplicate Lead')}>
                                  <FaClone className="text-red-500 min-w-[14px]" size={14} />
                                </span>
                              )}
                            </div>
                            <div className={`${isLight ? 'text-black' : 'text-white'} text-xs mt-0.5`}>{lead.company}</div>
                          </td>
                        );

                      case 'contact':
                        return (
                          <td key="contact" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'} `}>
                            <div className={`font-normal ${isLight ? 'text-black' : 'text-white'} `}>{lead.email}</div>
                            {crmSettings?.showMobileNumber !== false && (
                              <div 
                                className={`font-normal ${isLight ? 'text-black' : 'text-white'}  hover:text-[#25D366] cursor-pointer transition-colors duration-200 flex items-center gap-1`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const raw = lead.phone || lead.mobile || '';
                                  const digits = String(raw).replace(/[^0-9]/g, '');
                                  if (digits) window.open(`https://wa.me/${digits}`, '_blank');
                                }}
                                title={t('Open WhatsApp')}
                              >
                                <FaWhatsapp size={12} className="text-[#25D366]" />
                                <span dir="ltr">{maskPhoneNumber(lead.phone)}</span>
                              </div>
                            )}
                          </td>
                        );

                      case 'actions':
                        const canPerformActions = user?.is_super_admin || lead.assigned_to == user.id || lead.assignedTo == user.id;
                        
                        return (
                          <td key="actions" className={`px-6 py-3 whitespace-nowrap text-xs font-medium ${activeRowId === lead.id ? `sticky ${i18n.language === 'ar' ? 'right-0' : 'left-0'} z-20 bg-gray-50 dark:bg-slate-900/25 border border-theme-border dark:border-slate-700/40 shadow-sm` : ''} `}>
                            <div className="flex items-center gap-2 flex-nowrap">
                              <button
                                title={t('Preview')}
                                onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setShowLeadModal(true); }}
                                className={`inline-flex items-center justify-center ${theme === 'light' ? 'text-gray-700 hover:text-blue-500' : 'text-indigo-300 hover:text-indigo-400'}`}
                              >
                                <FaEye size={16} className={`${theme === 'light' ? 'text-gray-700' : 'text-indigo-300'}`} />
                              </button>
                              {canPerformActions && canAddAction && (
                                <button
                                  title={t('Add Action')}
                                  onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setShowAddActionModal(true) }}
                                  className={`inline-flex items-center justify-center ${theme === 'light' ? 'text-gray-700 hover:text-blue-500' : 'text-emerald-300 hover:text-emerald-400'}`}
                                >
                                  <FaPlus size={16} className={`${theme === 'light' ? 'text-gray-700' : 'text-emerald-300'}`} />
                                </button>
                              )}
                              {canActOnDuplicateLeads && String(lead.stage || lead.status || '').toLowerCase().includes('duplicate') && (
                                <div className="flex items-center gap-1">
                                  <button
                                    title={t('Compare')}
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleCompareLead(lead);
                                    }}
                                    className={`inline-flex items-center justify-center ${theme === 'light' ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'}`}
                                  >
                                    <FaExchangeAlt size={16} />
                                  </button>
                                  <button
                                    title={t('Transfer to Other Sales')}
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setLeadForTransfer(lead);
                                      setShowDirectTransferModal(true);
                                    }}
                                    className={`inline-flex items-center justify-center ${theme === 'light' ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                                  >
                                    <FaUserTie size={16} />
                                  </button>
                                </div>
                              )}
                              {canPerformActions && crmSettings?.showMobileNumber !== false && (
                                <button
                                  title={t('Call')}
                                  onClick={(e) => { e.stopPropagation(); const raw = lead.phone || lead.mobile || ''; const digits = String(raw).replace(/[^0-9]/g, ''); if (digits) window.open(`tel:${digits}`); }}
                                  className="inline-flex items-center justify-center text-blue-600 dark:text-[#2563EB] hover:opacity-80"
                                >
                                  <FaPhone size={16} />
                                </button>
                              )}

                              {canPerformActions && (
                                <button
                                  title={t('Email')}
                                  onClick={(e) => { e.stopPropagation(); if (lead.email) window.open(`mailto:${lead.email}`); }}
                                  className="inline-flex items-center justify-center text-[#FFA726] hover:opacity-80"
                                >
                                  <FaEnvelope size={16} />
                                </button>
                              )}
                              {canPerformActions && (
                                <button
                                  title="Google Meet"
                                  onClick={(e) => { e.stopPropagation(); window.open('https://meet.google.com/', '_blank'); }}
                                  className="inline-flex items-center justify-center hover:opacity-80"
                                >
                                  <img src={MEET_ICON_URL} alt="Google Meet" className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        );

                      case 'source':
                        return (
                          <td key="source" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'}`} style={{ minWidth: `${columnMinWidths.source}px` }}>
                            <span className="text-base">{getSourceIcon(lead.source)}</span> {lead.source}
                          </td>
                        );

                      case 'project':
                        return (
                          <td key="project" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'}`} style={{ minWidth: `${columnMinWidths.project}px` }}>
                            {(() => {
                              if (isGeneralTenant) {
                                const byId = projectsList.find(p => p.id === lead.item_id)?.name;
                                return lead.item_name || byId || lead.item || '-';
                              } else {
                                const byId = projectsList.find(p => p.id === lead.project_id)?.name;
                                return lead.project_name || byId || lead.project || '-';
                              }
                            })()}
                          </td>
                        );

                      case 'salesPerson':
                        return (
                          <td key={`salesPerson" className="px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'}`} style={{ minWidth: `${columnMinWidths.salesPerson}px` }}>
                            {(() => {
                              const explicit = String(lead.sales_person || '').trim();
                              if (explicit) return explicit;

                              const assignedId = lead.assigned_to || (typeof lead.assignedTo === 'object' ? lead.assignedTo?.id : null);
                              if (assignedId && usersList.length > 0) {
                                const assignedUser = usersList.find(u => u.id == assignedId);
                                if (assignedUser) {
                                  const role = String(assignedUser.role || '').toLowerCase();
                                  const isSales =
                                    role.includes('sales person') ||
                                    role.includes('salesperson') ||
                                    role.includes('sales_person');
                                  if (isSales) return assignedUser.name;
                                }
                              }

                              const assignedName = typeof lead.assignedTo === 'string' ? lead.assignedTo : '';
                              if (assignedName && usersList.length > 0) {
                                const u = usersList.find(x => String(x.name || '').toLowerCase() === String(assignedName).toLowerCase());
                                if (u) {
                                  const role = String(u.role || '').toLowerCase();
                                  const isSales =
                                    role.includes('sales person') ||
                                    role.includes('salesperson') ||
                                    role.includes('sales_person');
                                  if (isSales) return u.name;
                                }
                              }

                              return lead.assignedAgent?.name || lead.assigned_agent?.name || '-';
                            })()}
                          </td>
                        );
                      
                      case 'actionOwner':
                        return (
                          <td key="actionOwner" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'} `} style={{ minWidth: `${columnMinWidths.actionOwner}px` }}>
                            {lead.action_owner || '-'}
                          </td>
                        );

                      case 'lastComment':
                        return (
                          <td key="lastComment" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'} `} style={{ minWidth: `${columnMinWidths.lastComment}px` }}>
                            {(() => {
                              const dbAssignedTo = lead.assigned_to || (typeof lead.assignedTo === 'object' ? lead.assignedTo?.id : lead.assignedTo);
                              const currentUserId = user?.id;
                              const isOwner = dbAssignedTo == currentUserId;

                              const hiddenBefore = Number(lead.history_hidden_before_action_id || 0);
                              const latestId = Number(lead.latest_action?.id || 0);
                              const hideOldActionFromSales = isOwner && hiddenBefore > 0 && latestId > 0 && latestId <= hiddenBefore;

                              const text = hideOldActionFromSales
                                ? (lead.notes || '-')
                                : (lead.latest_action?.description || lead.latest_action?.details?.notes || lead.notes || '-');

                              const title = hideOldActionFromSales
                                ? (lead.notes || '')
                                : (lead.latest_action?.description || lead.latest_action?.details?.notes || lead.notes || '');

                              return (
                                <div className="max-w-[200px] truncate" title={title}>
                                  {text}
                                </div>
                              );
                            })()}
                          </td>
                        );

                      case 'stage':
                        // Use virtual stage from backend if available, otherwise fallback to standard logic
                        let displayStage = lead.display_stage || lead.stage;
                        
                        const dbAssignedTo = lead.assigned_to || (typeof lead.assignedTo === 'object' ? lead.assignedTo?.id : lead.assignedTo);
                        const currentUserId = user?.id;
                        const isOwner = dbAssignedTo == currentUserId;
                        const leadStatus = String(lead.status || '').toLowerCase();

                        // Hard rule: if lead is Pending and viewer is NOT the owner -> show Pending
                        // (even if backend sent display_stage)
                        if (leadStatus === 'pending' && !isOwner) {
                          displayStage = 'Pending';
                        }

                        // Backward compatibility: some flows mark assigned New Lead as stage=New Lead without status=pending.
                        // In that case, non-owner should still see Pending.
                        const isNewLead = ['new', 'new lead'].includes(String(lead.stage || '').toLowerCase());
                        const isUnassigned = !dbAssignedTo;
                        if (!isOwner && isNewLead && !isUnassigned) {
                          displayStage = 'Pending';
                        }

                        return (
                          <td key="stage" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'} `} style={{ minWidth: `${columnMinWidths.stage}px` }}>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold leading-5 rounded-full `}>
                              {t(displayStage || 'N/A')}
                            </span>
                          </td>
                        );

                      case 'expectedRevenue':
                        return (
                          <td key="expectedRevenue" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'}`} style={{ minWidth: `${columnMinWidths.expectedRevenue}px` }}>
                            {lead.estimatedValue ? formatMoney(lead.estimatedValue) : '-'}
                          </td>
                        );

                      case 'priority':
                        return (
                          <td key="priority" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'} `} style={{ minWidth: `${columnMinWidths.priority}px` }}>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold leading-5 rounded-full ${getPriorityColor(lead.priority)}`}>
                              {t(lead.priority || 'N/A')}
                            </span>
                          </td>
                        );

                      default:
                        return null;
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          
          {paginatedLeads.length === 0 && (
            <div className={`text-center py-10 ${isLight ? 'text-black' : 'text-white'} `}>
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <h3 className={`mt-2 text-sm font-medium ${isLight ? 'text-black' : 'text-white'} `}>{t('No Leads Found')}</h3>
              <p className={`mt-1 text-sm ${isLight ? 'text-black' : 'text-white'} `}>{t('Try adjusting your filters or adding new leads.')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      <nav className="flex flex-col gap-4 p-3 lg:p-4 border-t border-theme-border dark:border-gray-700 dark:bg-transparent rounded-b-lg backdrop-blur-sm">
        {/* Row 1: Show Entries & Page Navigation */}
        <div className="flex  lg:flex-row justify-between items-center gap-3">
          {/* Show Entries */}
          <div className={`flex flex-wrap items-center gap-2 w-full lg:w-auto text-sm font-medium ${isLight ? 'text-black' : 'text-white'} `}>
            <span style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Show')}</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { 
                setItemsPerPage(Number(e.target.value)); 
                setCurrentPage(1); 
              }} 
              className={`px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'}  text-xs`}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'} `} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('entries')}</span>
            <label htmlFor="page-search" className="sr-only">{t('Search Page')}</label>
            <input
              id="page-search"
              type="text"
              placeholder={t('Go to page...')}
              value={pageSearch}
              onChange={(e) => setPageSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const page = Number(pageSearch)
                  if (page > 0 && page <= totalPages) {
                    setCurrentPage(page)
                    setPageSearch('')
                  }
                }
              }}
              className={`ml-2 px-3 py-1.5 border border-theme-border dark:border-gray-600 rounded-lg  dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'}  text-xs w-full sm:w-64 lg:w-28  dark:placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400`}
              style={{ color: theme === 'dark' ? '#ffffff' : undefined }}
            />
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`block px-3 py-2 leading-tight ${isLight ? 'text-black' : 'text-white'} border border-theme-border rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-transparent dark:border-gray-700  dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 backdrop-blur-sm`}
            >
              <span className={`sr-only ${isLight ? 'text-black' : 'text-white'}  focus:text-white`}>{t('Previous')}</span>
              <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
            </button>
            <span className={`text-sm font-medium ${isLight ? 'text-black' : 'text-white'} `} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>
              {t('Page')} <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'} `} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{currentPage}</span> {t('of')} <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'} `} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`block px-3 py-2 leading-tight ${isLight ? 'text-black' : 'text-white'} border border-theme-border rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-transparent dark:border-gray-700  dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 backdrop-blur-sm`}
            >
              <span className={`sr-only ${isLight ? 'text-black' : 'text-white'}  focus:text-white`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Next')}</span>
              <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
            </button>
          </div>
        </div>

        {/* Row 2: Export Controls */}
        {canExportLeads && (
          <div className="flex justify-center items-center">
            <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto border p-2 rounded-lg border-theme-border dark:border-gray-600  dark:bg-gray-700 justify-center">
              <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'} `} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Export Pages')}</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                placeholder="From"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className={`w-16 px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'} text-xs focus:border-blue-500`}
                style={{ color: theme === 'dark' ? '#ffffff' : undefined }}
              />
              <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'} `} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('to')}</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                placeholder="To"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className={`w-16 px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'}  text-xs focus:border-blue-500`}
                style={{ color: theme === 'dark' ? '#ffffff' : undefined }}
              />
              <button
                onClick={handleExportRange}
                className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center gap-1"
              >
                <FaDownload size={12} />
                {t('Export')}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hover Tooltip - Hidden by default, shown on row click */}
      {showTooltip && hoveredLead && (
        <LeadHoverTooltip
          ref={tooltipRef}
          innerRef={tooltipRef}
          lead={hoveredLead}
          position={tooltipPosition}
          theme={theme}
          getStageStyle={getStageStyle}
          getPriorityColor={getPriorityColor}
          allowConvertToCustomer={crmSettings?.allowConvertToCustomers !== false}
          showMobileNumberAllowed={crmSettings?.showMobileNumber !== false}
          onAction={(action) => {
            setShowTooltip(false)
            switch (action) {
              case 'preview':
                setSelectedLead(hoveredLead)
                setShowLeadModal(true)
                break
              case 'edit':
                setEditingLead(hoveredLead)
                setShowEditModal(true)
                break
              case 'add_action':
                setSelectedLead(hoveredLead)
                setShowAddActionModal(true)
                break
              case 'compare':
                 handleCompareLead(hoveredLead)
                 break
              case 'call':
                if (crmSettings?.showMobileNumber === false) return
                window.open(`tel:${hoveredLead.phone}`)
                break
              case 'whatsapp':
                if (crmSettings?.showMobileNumber === false) return
                window.open(`https://wa.me/${String(hoveredLead.phone || '').replace(/[^0-9]/g, '')}`)
                break
              case 'email':
                window.open(`mailto:${hoveredLead.email}`)
                break
              case 'video':
                // Handle video call action
                console.log('Video call:', hoveredLead)
                break
              case 'convert':
                handleConvertCustomer(hoveredLead)
                break
              case 'delete':
                if (!canDeleteLead) {
                   const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: isRtl ? 'ليس لديك صلاحية الحذف' : 'You do not have permission to delete' } })
                   window.dispatchEvent(evt)
                   return;
                }
                if (window.confirm(t('Are you sure you want to delete this lead?'))) {
                  // Add deletion timestamp
                  const deletedLead = {
                    ...hoveredLead,
                    deletedAt: new Date().toISOString()
                  }
                  
                  // Save to deleted leads in localStorage
                  const existingDeletedLeads = JSON.parse(localStorage.getItem('deletedLeads') || '[]')
                  existingDeletedLeads.push(deletedLead)
                  localStorage.setItem('deletedLeads', JSON.stringify(existingDeletedLeads))
                  
                  setLeads(prev => prev.filter(l => l.id !== hoveredLead.id))
                }
                break
            }
          }}
          isRtl={i18n.language === 'ar'}
        />
      )}

      {/* Modals */}
      <CompareLeadsModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        duplicateLead={compareData.duplicate}
        originalLead={compareData.original}
        usersList={usersList}
        onResolve={async (action, updatedOriginal, updatedDuplicate, extraData) => {
          const { duplicate, original } = compareData;
          if (!duplicate || !original) {
             console.error('Resolve failed: Missing duplicate or original lead data');
             setShowCompareModal(false);
             return;
          }

          const originalId = original.id || original._id;
          const duplicateId = duplicate.id || duplicate._id;

          if (!originalId || !duplicateId) {
            console.error('Resolve failed: Missing lead IDs', { originalId, duplicateId });
            const errEvt = new CustomEvent('app:toast', { 
              detail: { type: 'error', message: isRtl ? 'فشل التحقق من معرفات البيانات' : 'Failed to verify lead IDs' } 
            });
            window.dispatchEvent(errEvt);
            setShowCompareModal(false);
            return;
          }

          const isMergeLike = action === 'keep_duplicate' || action === 'save_info';
          // Handle edits to original lead (legacy behavior; skipped for merge-like actions)
          if (!isMergeLike && updatedOriginal && JSON.stringify(updatedOriginal) !== JSON.stringify(original)) {
             try {
                await api.put(`/api/leads/${originalId}`, updatedOriginal);
                handleUpdateLead(updatedOriginal);
             } catch (e) { console.error('Failed to update original lead', e); }
          }
          
          // Use updated duplicate if available
          const targetDuplicate = updatedDuplicate || duplicate;
          const targetDuplicateId = targetDuplicate.id || targetDuplicate._id || duplicateId;

          try {
            switch (action) {
              case 'keep_save': {
                await api.post(`/api/leads/${targetDuplicateId}/resolve-duplicate`, {
                  original_lead_id: originalId,
                  action: 'keep_original',
                });

                setLeads(prev => prev.filter(l => (l.id || l._id) !== targetDuplicateId));
                fetchLeads();
                break;
              }

              case 'enable_duplicate': {
                await api.post('/api/leads/duplicates/bulk-action', {
                  action: 'enable_duplicate',
                  lead_ids: [targetDuplicateId],
                });
                fetchLeads();
                break;
              }

              case 'save_info': {
                const mergedData = extraData?.merged_data || {};
                const resolveResponse = await api.post(`/api/leads/${targetDuplicateId}/resolve-duplicate`, {
                  original_lead_id: originalId,
                  action: 'keep_duplicate',
                  updated_data: mergedData,
                });

                const updatedOriginalFromMerge =
                  resolveResponse.data?.lead || { ...original, ...mergedData, id: originalId };

                handleUpdateLead(updatedOriginalFromMerge);
                setLeads(prev => prev.filter(l => (l.id || l._id) !== targetDuplicateId));
                fetchLeads();
                break;
              }

              case 'warn':
                // Call backend to warn agent
                const warnNotes = (targetDuplicate.notes ? targetDuplicate.notes + '\n' : '') + `[System Warning] This lead is a duplicate of ${original.name} (#${originalId}).`;
                await api.post(`/api/leads/${targetDuplicateId}/warn-duplicate`, {
                    original_lead_id: originalId,
                    notes: warnNotes
                });
                
                // Update frontend
                const warningLead = {
                  ...targetDuplicate,
                  id: targetDuplicateId,
                  notes: warnNotes
                };
                handleUpdateLead(warningLead);
                break;

              case 'transfer':
                const { salesPersonId, historyOption, stageOption } = extraData || {};
                if (!salesPersonId) {
                    console.error('Transfer failed: No sales person selected');
                    break;
                }

                // Call backend transfer
                await api.post(`/api/leads/${originalId}/transfer`, {
                    assigned_to: salesPersonId,
                    stage: stageOption,
                    history_option: historyOption,
                    assign_as_new: historyOption === 'assign_as_new',
                    duplicate_id: targetDuplicateId // Inform backend to resolve this duplicate
                });

                // The backend now handles deletion of the duplicate and updating original
                
                // Add to deleted leads local storage for undo (optional)
                const deletedLeadTransfer = { ...targetDuplicate, id: targetDuplicateId, deletedAt: new Date().toISOString() };
                const existingDeletedLeadsTransfer = JSON.parse(localStorage.getItem('deletedLeads') || '[]');
                existingDeletedLeadsTransfer.push(deletedLeadTransfer);
                localStorage.setItem('deletedLeads', JSON.stringify(existingDeletedLeadsTransfer));
                
                // Remove duplicate from local state
                setLeads(prev => prev.filter(l => (l.id || l._id) !== targetDuplicateId));
                
                // Refresh to see original updated
                fetchLeads(); 
                break;
                
              case 'keep_duplicate':
                 // Update original with duplicate data
                 // We take all fields from targetDuplicate except ID and timestamps
                 const { 
                   id: dupId, _id: dupId2, created_at, updated_at, deleted_at, 
                   permissions, activities, creator, assignedAgent, customFieldValues,
                   ...duplicateData 
                 } = targetDuplicate;
                 
                 const mergePayload = {
                     ...duplicateData,
                     // Ensure we use correct keys for API
                     name: duplicateData.name || duplicateData.fullName,
                     assigned_to: duplicateData.assigned_to || duplicateData.assignedTo,
                     sales_person: duplicateData.sales_person || duplicateData.salesPerson,
                 };
                 
                 // Call atomic backend merge endpoint
                 const resolveResponse = await api.post(`/api/leads/${targetDuplicateId}/resolve-duplicate`, {
                     original_lead_id: originalId,
                     action: 'keep_duplicate',
                     updated_data: mergePayload
                 });
                 
                 const updatedOriginalFromDup = resolveResponse.data?.lead || { ...original, ...mergePayload, id: originalId };
                 
                 handleUpdateLead(updatedOriginalFromDup);
                 setLeads(prev => prev.filter(l => (l.id || l._id) !== targetDuplicateId));
                 fetchLeads();
                 break;

              case 'keep_original':
                // Call atomic backend resolve endpoint
                await api.post(`/api/leads/${targetDuplicateId}/resolve-duplicate`, {
                    original_lead_id: originalId,
                    action: 'keep_original'
                });

                const deletedLead = {
                  ...targetDuplicate,
                  id: targetDuplicateId,
                  deletedAt: new Date().toISOString()
                };
                
                // Save to deleted leads in localStorage
                const existingDeletedLeads = JSON.parse(localStorage.getItem('deletedLeads') || '[]');
                existingDeletedLeads.push(deletedLead);
                localStorage.setItem('deletedLeads', JSON.stringify(existingDeletedLeads));
                
                setLeads(prev => prev.filter(l => (l.id || l._id) !== targetDuplicateId));
                fetchLeads();
                break;
            }
          } catch (e) {
            console.error('Failed to resolve duplicate action', e);
            const errEvt = new CustomEvent('app:toast', { 
              detail: { type: 'error', message: isRtl ? 'فشل في تنفيذ الإجراء. يرجى المحاولة مرة أخرى.' : 'Failed to resolve duplicate. Please try again.' } 
            });
            window.dispatchEvent(errEvt);
          }
          fetchLeads();
          setShowCompareModal(false);
        }}
      />

      {/* Bulk Transfer Modal for Duplicate Leads */}
      <TransferSalesModal
        isOpen={showBulkDuplicateTransferModal}
        onClose={() => setShowBulkDuplicateTransferModal(false)}
        usersList={usersList}
        onConfirm={async (data) => {
          const { salesPersonId, historyOption, stageOption } = data || {};
          if (!salesPersonId) return;
          await runBulkDuplicateAction('transfer', {
            sales_id: salesPersonId,
            stage: stageOption || 'same_stage',
            history_option: historyOption || 'keep_history',
          });
          setShowBulkDuplicateTransferModal(false);
        }}
      />

      {/* Direct Transfer Modal for Duplicates */}
      <TransferSalesModal
        isOpen={showDirectTransferModal}
        onClose={() => {
          setShowDirectTransferModal(false);
          setLeadForTransfer(null);
        }}
        usersList={usersList}
        onConfirm={async (data) => {
          if (!leadForTransfer) return;
          
          try {
            const { salesPersonId, historyOption, stageOption } = data;
            
            await api.post(`/api/leads/${leadForTransfer.id}/transfer`, {
                assigned_to: salesPersonId,
                stage: stageOption,
                history_option: historyOption,
                assign_as_new: historyOption === 'assign_as_new',
                duplicate_id: leadForTransfer.id // When transferring a duplicate directly, it resolves itself
            });

            const successEvt = new CustomEvent('app:toast', { 
              detail: { 
                type: 'success', 
                message: isRtl ? 'تم نقل الليد بنجاح' : 'Lead transferred successfully' 
              } 
            });
            window.dispatchEvent(successEvt);
            
            // If it was a duplicate transfer, it might have been deleted on backend
            // or transformed. To be safe, filter it out from local state and refresh.
            setLeads(prev => prev.filter(l => l.id !== leadForTransfer.id));
            
            setShowDirectTransferModal(false);
            setLeadForTransfer(null);
            fetchLeads(); 
          } catch (err) {
            console.error('Failed to transfer lead', err);
            const errEvt = new CustomEvent('app:toast', { 
              detail: { 
                type: 'error', 
                message: isRtl ? 'فشل في نقل الليد' : 'Failed to transfer lead' 
              } 
            });
            window.dispatchEvent(errEvt);
          }
        }}
      />
      {showEditModal && (
        <LeadModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          lead={editingLead}
          assignees={uniqueAssignees}
          onAssign={(newAssignee) => handleAssignLead(editingLead.id, newAssignee)}
          onSave={(updatedLead) => {
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l))
            fetchLeads();
            setShowEditModal(false)
          }}
        />
      )}

      {showAddActionModal && (
        <AddActionModal
          isOpen={showAddActionModal}
          onClose={() => setShowAddActionModal(false)}
          lead={selectedLead}
          isOwnerProp={String(selectedLead?.assigned_to || selectedLead?.assigned_to_id) === String(user?.id)}
          isSuperAdminProp={user?.is_super_admin}
          onSave={(newAction) => {
            if (newAction && selectedLead) {
                let newStage = null;
                // Helper to normalize string
                const norm = (str) => String(str || '').toLowerCase().trim();
                
                let matchedStageObj = null;

                // 1. Try to match by type (most robust, works with renamed stages)
                const typeMatches = (Array.isArray(stages) ? stages : []).filter(s => s.type === newAction.nextAction);
                
                if (typeMatches.length > 0) {
                   if (newAction.nextAction === 'follow_up') {
                       // Priority 1: Exact "Follow Up" or "Pending" match by name
                       const priorityMatch = typeMatches.find(s => {
                           const n = norm(s.name);
                           const nAr = norm(s.nameAr);
                           return n === 'follow up' || n === 'follow-up' || n === 'pending' ||
                                  nAr === 'متابعة' || nAr === 'قيد الانتظار';
                       });

                       if (priorityMatch) {
                           matchedStageObj = priorityMatch;
                       } else {
                           // Priority 2: Anything that is NOT "No Answer"
                           const notNoAnswer = typeMatches.find(s => {
                               const n = norm(s.name);
                               const nAr = norm(s.nameAr);
                               return !n.includes('no answer') && !nAr.includes('لا رد') && !n.includes('phone off');
                           });
                           matchedStageObj = notNoAnswer;
                       }
                   } else {
                       matchedStageObj = typeMatches[0];
                   }
                }

                // 2. If no type match, fall back to Name matching
                if (!matchedStageObj) {
                    const normalizedNextAction = String(newAction.nextAction || '').replace(/_/g, ' ').toLowerCase();

                    // Expanded map to cover more cases and exact default stage names
                    const actionToStageMap = {
                      'reservation': ['reservation', 'booking', 'won', 'closed', 'حجز', 'مباع'],
                      'closing_deals': ['closing deal', 'closing', 'deal', 'won', 'closed', 'إغلاق', 'صفقة'],
                      'rent': ['rent', 'leased', 'won', 'إيجار', 'مؤجر'],
                      'cancel': ['cancelation', 'cancellation', 'cancelled', 'lost', 'archive', 'cold calls', 'إلغاء', 'خسارة',' العملاء المحتملين '],
                      'meeting': ['meeting', 'negotiation', 'pending', 'اجتماع', 'تفاوض'],
                      'proposal': ['proposal', 'quote', 'negotiation', 'pending', 'عرض سعر', 'عرض'],
                      'follow_up': ['follow up', 'follow-up', 'pending', 'متابعة', 'قيد الانتظار']
                    };

                    let candidates = actionToStageMap[newAction.nextAction] || [];
                    if (!candidates.includes(normalizedNextAction)) {
                        candidates = [normalizedNextAction, ...candidates];
                    }

                    for (const candidate of candidates) {
                      const match = (Array.isArray(stages) ? stages : []).find(s => {
                        const sName = norm(typeof s === 'string' ? s : s.name);
                        const sNameAr = norm(s.nameAr);
                        
                        // 1. Exact match
                        if (sName === candidate || sNameAr === candidate) return true;
                        
                        // 2. Partial match (if candidate is significant length)
                        if (candidate.length > 3 && (sName.includes(candidate) || (sNameAr && sNameAr.includes(candidate)))) return true;
                        
                        return false;
                      });
                      
                      if (match) {
                        matchedStageObj = typeof match === 'string' ? { name: match } : match;
                        break;
                      }
                    }
                }
                
                if (matchedStageObj) {
                    newStage = matchedStageObj.name;
                }
                
                let updatedLead = { ...selectedLead };
                let hasChanges = false;

                // Update stage if changed
                if (newStage && newStage !== selectedLead.stage) {
                  updatedLead.stage = newStage;
                  hasChanges = true;
                }

                // Update notes (Last Comment) if present
                const newNote = newAction.description || newAction.notes;
                if (newNote) {
                   updatedLead.notes = newNote;
                   updatedLead.latest_action = newAction;
                   hasChanges = true;
                }

                // Add action to history and update last contact
                if (!updatedLead.actions) updatedLead.actions = [];
                const actionEntry = {
                    ...newAction,
                    id: Date.now(),
                    date: new Date().toISOString(),
                    stageAtCreation: newStage || selectedLead.stage, // Capture new stage if changed, otherwise current
                    assignee: newAction.assignedTo || newAction.assignee || selectedLead.assignedTo || selectedLead.salesPerson || 'غير محدد'
                };
                updatedLead.actions = [actionEntry, ...updatedLead.actions];
                updatedLead.lastAction = actionEntry;
                updatedLead.lastContact = new Date().toISOString();
                hasChanges = true;

                if (hasChanges) {
                  handleUpdateLead(updatedLead);
                }

                // INTEGRATION: Create Order Request for General Reservations
                // Check for general reservation or if we have general items
                const isGeneralReservation = newAction.nextAction === 'reservation' && 
                                            (newAction.reservationType === 'general' || 
                                             (newAction.reservationGeneralItems && newAction.reservationGeneralItems.length > 0 && newAction.reservationGeneralItems.some(i => i.item)));

                if (isGeneralReservation) {
                    // TODO: Migrate to API
                    console.log('General Reservation: Inventory Request creation via API pending.');
                    /*
                    try {
                        let existingRequests = [];
                        const storedRequests = localStorage.getItem('inventory_requests_data');
                        
                        if (storedRequests) {
                            existingRequests = JSON.parse(storedRequests);
                        } else {
                            // If no storage exists yet, we can't easily access MOCK_REQUESTS from here
                            // but we initialize as empty array. RequestsPage will handle merging or displaying what we have.
                            existingRequests = [];
                        }
                        
                        // Map items
                        const requestItems = (newAction.reservationGeneralItems || []).map((item, idx) => ({
                            id: idx + 1,
                            name: `${item.category || ''} - ${item.item || ''}`.replace(/^ - | - $/g, ''), // Clean up empty parts
                            price: Number(item.price) || 0,
                            quantity: Number(item.quantity) || 1
                        })).filter(i => i.name); // Ensure we have a name

                        const totalAmount = Number(newAction.reservationAmount || 0);

                        const newRequest = {
                            id: `REQ-${Date.now()}`,
                            customerCode: selectedLead.id || `CUST-${Date.now()}`, // Ensure ID
                            customerName: selectedLead.name || selectedLead.fullName || 'Unknown Customer',
                            status: 'Pending',
                            items: requestItems,
                            subtotal: totalAmount,
                            tax: 0,
                            total: totalAmount,
                            notes: newAction.reservationNotes || newAction.notes || '',
                            createdAt: new Date().toISOString(),
                            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            createdBy: 'System', 
                            salesPerson: selectedLead.assignedTo || selectedLead.salesPerson || 'Unassigned'
                        };

                        // Add to beginning
                        existingRequests.unshift(newRequest);
                        
                        localStorage.setItem('inventory_requests_data', JSON.stringify(existingRequests));
                        
                        // Force update event for other components listening
                        window.dispatchEvent(new Event('storage'));
                        
                        console.log('Successfully created order request:', newRequest);
                    } catch (error) {
                        console.error('Failed to create order request:', error);
                    }
                    */
                }
             }
            setShowAddActionModal(false)
          }}
        />
      )}
      
      {showImportModal && (
        <ImportLeadsModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false)
            setImportError('')
            setImportSummary(null)
          }}
          companyType={company?.company_type}
          excelFile={excelFile}
          setExcelFile={setExcelFile}
          onImport={handleExcelUpload}
          importing={importing}
          importError={importError}
          importSummary={importSummary}
          t={t}
          theme={theme}
        />
      )}

      

      {/* Enhanced Lead Details Modal */}
      {showLeadModal && (
        <EnhancedLeadDetailsModal
          isOpen={showLeadModal}
          onClose={() => {
            setShowLeadModal(false)
            setSelectedLead(null)
            setInitialActionId(null)
          }}
          lead={selectedLead}
          initialActionId={initialActionId}
          initialTab="overview"
          isArabic={i18n.language === 'ar'}
          theme={theme}
          assignees={uniqueAssignees}
          usersList={usersList}
          onAssign={(newAssignee) => handleAssignLead(selectedLead.id, newAssignee)}
          onUpdateLead={handleUpdateLead}
          canAddAction={canAddAction}
          canShowCreator={canShowCreator}
        />
      )}

      {/* Bulk Re-Assign Modal */}
      {showBulkAssignModal && (
        <ReAssignLeadModal
          isOpen={showBulkAssignModal}
          onClose={() => setShowBulkAssignModal(false)}
          lead={null}
          onAssign={handleBulkReAssign}
          isArabic={isRtl}
          currentUser={user}
        />
      )}
    </div>
  );
}

export default Leads;
