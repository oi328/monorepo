import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import { useAppState } from '@shared/context/AppStateProvider'
import { api, logExportEvent, logImportEvent } from '../utils/api'
import { useStages } from '../hooks/useStages'
import { useNavigate, useLocation } from 'react-router-dom'
import { FaDownload } from 'react-icons/fa'
import SearchableSelect from '../components/SearchableSelect'
import ReAssignLeadModal from '../shared/components/ReAssignLeadModal'
import ColumnToggle from '../components/ColumnToggle'
import CompareLeadsModal from '../components/CompareLeadsModal'
import ImportLeadsModal from '../components/ImportLeadsModal'
import EnhancedLeadDetailsModal from '../shared/components/EnhancedLeadDetailsModal'
import AddActionModal from '../components/AddActionModal'
import LeadModal from '../components/LeadModal'
import LeadHoverTooltip from '../components/LeadHoverTooltip'
 // Import the custom checkbox
import { FaFilter, FaChevronDown, FaSearch, FaEnvelope, FaClone, FaWhatsapp, FaEye, FaPlus, FaPhone } from 'react-icons/fa'


import * as LucideIcons from 'lucide-react'
import { useDynamicFields } from '../hooks/useDynamicFields'
import { countriesData } from '../data/countriesData'
import { getLeadPermissionFlags } from '../services/leadPermissions'

export const ReferralLeads = () => {
  const { t, i18n } = useTranslation()
  const { theme: contextTheme, resolvedTheme } = useTheme()
  const theme = resolvedTheme || contextTheme
  const isLight = theme === 'light'
  const { user, company, crmSettings } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const { stages, statuses } = useStages()
  const { fields: dynamicFields } = useDynamicFields('leads')
  const isRtl = String(i18n.language || '').startsWith('ar')

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then(res => res.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  useEffect(() => {
    if (usersData) {
      setUsersList(usersData)
    }
  }, [usersData])

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
  const isSalesPerson =
    userRole.includes('sales person') ||
    userRole.includes('salesperson')

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
  const leadPermissionFlags = getLeadPermissionFlags(user);
  const canAddLead = leadPermissionFlags.canAddLead;
  const canImportLeads = leadPermissionFlags.canImportLeads;
  const canExportLeads = leadPermissionFlags.canExportLeads;
  const canAddAction = leadPermissionFlags.canAddAction;
  const canShowCreator = leadPermissionFlags.canShowCreator;
  const canViewDuplicateLeads = leadPermissionFlags.canViewDuplicateLeads;
  const canActOnDuplicateLeads = leadPermissionFlags.canActOnDuplicateLeads;
  const isManagerOrAdmin = ['admin', 'manager', 'sales director', 'operations manager', 'super admin'].some(r => userRole.includes(r));
  const isSalesDirector = userRole.includes('sales director') || userRole.includes('director');
  const isOperationsManager = userRole.includes('operations manager') || userRole.includes('operation manager');
  const isSalesAdmin = userRole.includes('sales admin');
  const isSuperAdmin = userRole.includes('super admin') || userRole === 'owner';
  const isAdmin = userRole === 'admin';
  const isTenantAdmin = userRole === 'tenant admin' || userRole === 'tenant-admin';
  const isDuplicateAllowed =
    user?.is_super_admin ||
    isSuperAdmin ||
    canViewDuplicateLeads;

  const controlModulePerms = Array.isArray(modulePermissions.Control) ? modulePermissions.Control : [];

  const isBranchManager = userRole.includes('branch manager');

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

  const canUseBulkAssign =
    user?.is_super_admin ||
    isAdmin ||
    isTenantAdmin ||
    controlModulePerms.includes('assignLeads');
  const canUseBulkMultiActions = canUseBulkActions;

  const MEET_ICON_URL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'><rect x='2' y='4' width='12' height='16' rx='3' fill='%23ffffff'/><rect x='2' y='4' width='12' height='4' rx='2' fill='%234285F4'/><rect x='2' y='4' width='4' height='16' rx='2' fill='%2334A853'/><rect x='10' y='4' width='4' height='16' rx='2' fill='%23FBBC05'/><rect x='2' y='16' width='12' height='4' rx='2' fill='%23EA4335'/><polygon points='14,9 22,5 22,19 14,15' fill='%2334A853'/></svg>"
  
  const [leads, setLeads] = useState([])
  const [filteredLeads, setFilteredLeads] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState([])
  const [projectFilter, setProjectFilter] = useState([])
  const [stageFilter, setStageFilter] = useState([])
  const [managerFilter, setManagerFilter] = useState([])
  const [salesPersonFilter, setSalesPersonFilter] = useState([])
  const [createdByFilter, setCreatedByFilter] = useState([])
  const [campaignFilter, setCampaignFilter] = useState([])
  const [countryFilter, setCountryFilter] = useState([])
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedLeads, setSelectedLeads] = useState([])
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)
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

  useEffect(() => {
    if (!canShowCreator && createdByFilter.length) {
      setCreatedByFilter([])
    }
  }, [canShowCreator, createdByFilter.length])

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
  const [managersList, setManagersList] = useState([])

  // State for database filter options
  const [dbFilters, setDbFilters] = useState({
    stages: [],
    projects: [],
    countries: [],
    campaigns: [],
    managers: [],
    salesPersons: [],
    referrers: []
  });

  const creatorFilterValue = useMemo(
    () => (canShowCreator ? createdByFilter : []),
    [canShowCreator, createdByFilter]
  );

  // Fetch Filter Options for Referral Leads
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await api.get('/api/leads/referral-filters');
        setDbFilters(response.data);
        
        if (response.data.stages) {
          setStagesList((response.data.stages || []).sort((a, b) => (a.order || 0) - (b.order || 0)));
        }
      } catch (e) {
        console.error('Failed to fetch referral options', e)
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
  
  const tableHeaderBgClass = 'bg-theme-sidebar dark:bg-gray-900/95'
  const buttonBase = 'text-sm font-semibold rounded-lg transition-all duration-200 ease-out'
  const primaryButton = `btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none`
  
  const sidebarStages = useMemo(() => {
    const showColdCalls = crmSettings?.showColdCallsStage !== false
    const staticStages = [
      { key: 'new lead', icon: '🆕', backendKey: 'new' },
      { key: 'duplicate', icon: '🔄', backendKey: 'duplicate' },
      { key: 'pending', icon: '⏳', backendKey: 'pending' },
      ...(showColdCalls ? [{ key: 'cold calls', icon: '📞', backendKey: 'coldCall' }] : []),
    ].filter(stage => stage.key !== 'duplicate' || isDuplicateAllowed);

    // Filter out stages from stagesList that are already covered by static stages to avoid duplication
    const staticKeys = staticStages.map(s => s.key.toLowerCase());
    const dynamicStages = stagesList
      .filter(s => {
        const excludeStaticDup = !staticKeys.some(sk => s.name.toLowerCase().includes(sk) || sk.includes(s.name.toLowerCase()))
        const normEn = String(s.name || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '')
        const normAr = String(s.name_ar || '').toLowerCase()
        const isFollow = normEn === 'followup' || normAr.includes('متابعة')
        return excludeStaticDup && !isFollow
      })
      .map(s => ({
        key: s.name,
        icon: s.icon || '📊',
        isDynamic: true
      }));

    return [...staticStages, ...dynamicStages];
  }, [isDuplicateAllowed, stagesList]);

  const fetchStatsApi = async ({ queryKey }) => {
    const [_key, f] = queryKey;
    const params = {
        search: f.search,
        stage: f.stage && f.stage.length > 0 ? f.stage : null,
        manager_id: f.managerId && f.managerId.length > 0 ? f.managerId : null,
        referral_to: f.referralTo && f.referralTo.length > 0 ? f.referralTo : null,
        referrer_id: f.referrerId && f.referrerId.length > 0 ? f.referrerId : null,
        priority: f.priority && f.priority.length > 0 ? f.priority : null,
        project: f.project && f.project.length > 0 ? f.project : null,
        campaign: f.campaign && f.campaign.length > 0 ? f.campaign : null,
        location: f.country && f.country.length > 0 ? f.country : null,
    };
    
    Object.keys(params).forEach(key => (params[key] == null || params[key] === '' || (Array.isArray(params[key]) && params[key].length === 0)) && delete params[key]);
    const response = await api.get('/api/leads/referral-stats', { params });
    return response.data;
  };

  const referralIds = useMemo(() => {
    if (!user?.id) return [];
    const ids = [user.id];
    const roleLower = (user?.role || '').toLowerCase();
    const isManager = roleLower.includes('manager') || roleLower.includes('director') || roleLower.includes('admin') || user?.is_super_admin;
    if (isManager && Array.isArray(usersList) && usersList.length > 0) {
      const queue = [user.id];
      const visited = new Set([user.id]);
      const descendants = [];
      while (queue.length > 0) {
        const current = queue.shift();
        for (const u of usersList) {
          if (u.manager_id === current && !visited.has(u.id)) {
            visited.add(u.id);
            descendants.push(u.id);
            queue.push(u.id);
          }
        }
      }
      return [...ids, ...descendants];
    }
    return ids;
  }, [user?.id, user?.role, usersList]);

  const { data: statsData } = useQuery({
      queryKey: ['referral-leads-stats', { 
          search: searchTerm, 
          stage: stageFilter,
          managerId: managerFilter,
          referralTo: salesPersonFilter,
          referrerId: creatorFilterValue,
          priority: priorityFilter,
          project: projectFilter,
          campaign: campaignFilter,
          country: countryFilter,
      }],
      queryFn: fetchStatsApi,
      staleTime: 1000 * 60 * 5,
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

  const queryClient = useQueryClient();

  const fetchLeadsApi = async ({ queryKey }) => {
    const [_key, f] = queryKey;
    const params = {
      page: f.page,
      per_page: f.perPage,
      search: f.search,
      stage: f.stage && f.stage.length > 0 ? f.stage : null,
      manager_id: f.managerId && f.managerId.length > 0 ? f.managerId : null,
      referral_to: f.referralTo && f.referralTo.length > 0 ? f.referralTo : null,
      referrer_id: f.referrerId && f.referrerId.length > 0 ? f.referrerId : null,
      priority: f.priority && f.priority.length > 0 ? f.priority : null,
      project: f.project && f.project.length > 0 ? f.project : null,
      campaign: f.campaign && f.campaign.length > 0 ? f.campaign : null,
      location: f.country && f.country.length > 0 ? f.country : null,
      sort_by: f.sortBy,
      sort_order: f.sortOrder
    };
    
    Object.keys(params).forEach(key => (params[key] == null || params[key] === '' || (Array.isArray(params[key]) && params[key].length === 0)) && delete params[key]);

    const response = await api.get('/api/leads/referral-index', { params });
    return response.data;
  };

  const { data: leadsQueryData, isLoading, isPlaceholderData, refetch } = useQuery({
    queryKey: ['referral-leads', { 
        page: currentPage, 
        perPage: itemsPerPage, 
        search: searchTerm, 
        stage: stageFilter,
        managerId: managerFilter,
        referralTo: salesPersonFilter,
        referrerId: creatorFilterValue,
        priority: priorityFilter,
        project: projectFilter,
        campaign: campaignFilter,
        country: countryFilter,
        sortBy, 
        sortOrder 
    }],
    queryFn: fetchLeadsApi,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const fetchLeads = () => {
    refetch();
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm, stageFilter, salesPersonFilter, managerFilter, creatorFilterValue, 
    priorityFilter, projectFilter, campaignFilter, countryFilter,
    sortBy, sortOrder
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
        let managerId = null;
        if (usersList.length > 0) {
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
                salesPersonName = assignedUser.name;
            }
        }

        return {
        ...lead,
        assignedTo: lead.assigned_to || lead.assignedTo,
        sales_person: salesPersonName || lead.assignedAgent?.name || lead.assigned_agent?.name, // Fallback to assigned agent relationship or keep existing
        manager: managerName,
        managerId: managerId,
        createdAt: lead.created_at || lead.createdAt,
        lastContact: lead.last_contact || lead.lastContact,
        estimatedValue: lead.estimated_value || lead.estimatedValue,
        customFields: lead.custom_field_values || []
      }});

      setLeads(mappedLeads);
      setFilteredLeads(mappedLeads); // With server-side pagination, the current list IS the filtered list
      setIsDataLoaded(true);
    }
  }, [leadsQueryData, usersList]);

  // Removed direct fetchLeads() call in useEffect as useQuery handles it
  useEffect(() => {
      // Logic for location-based filters is handled in queryKey now
  }, [location.pathname]);


  useEffect(() => {
    try {
      if (location.pathname === '/leads/my-leads') {
        // If user object has name, use it. Otherwise fallback to something that might match or leave empty
        if (user && user.name) {
            setSalesPersonFilter([user.name])
        }
      } else if (location.pathname === '/leads') {
        // Reset sales person filter when navigating to main leads page
        setSalesPersonFilter([])
      }

      const params = new URLSearchParams(location.search || '')
      const s = params.get('stage')
      if (s) {
        setStageFilter([s])
      } else {
        // Only reset stage filter if we are not on my-leads (or maybe my-leads can also have stage?)
        // The original code reset stage filter if no param. 
        // We should keep this behavior but be careful not to conflict.
        // The original code was:
        // if (s) setStageFilter([s]) else setStageFilter([])
        // This runs on location.search change.
        
        // If we are on /leads/my-leads, location.search might be empty.
        // So stage filter is cleared. That's fine.
        setStageFilter([])
      }
    } catch (e) {
      console.error('Error parsing URL for stage filter:', e) // FIX 4: Added console.error
    }
  }, [location.search, location.pathname, user])

  const handleCompareLead = async (duplicateLead) => {
    // Attempt to find the "original" lead
    // 1. Search by phone number (clean format)
    // 2. Search by email
    // 3. Exclude the current duplicate lead ID
    // 4. Sort by creation date (oldest is original)
    
    const cleanPhone = (p) => String(p || '').replace(/[^0-9]/g, '')
    const targetPhone = cleanPhone(duplicateLead.phone || duplicateLead.mobile)
    const targetEmail = (duplicateLead.email || '').toLowerCase()
    
    const possibleOriginals = leads.filter(l => {
      if (l.id === duplicateLead.id) return false // Skip self
      
      const lPhone = cleanPhone(l.phone || l.mobile)
      const lEmail = (l.email || '').toLowerCase()
      
      const phoneMatch = targetPhone && lPhone && targetPhone === lPhone
      const emailMatch = targetEmail && lEmail && targetEmail === lEmail
      
      return phoneMatch || emailMatch
    }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    
    // If found, take the oldest one as original
    // If not found (e.g. pagination), mock one for demonstration or show alert
    let originalLead = possibleOriginals[0]
    
    if (!originalLead) {
       // Try to find via API
       try {
         const searchQ = targetPhone || targetEmail;
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
  const allColumns = useMemo(() => ({
    lead: t('Lead'),
    contact: t('Contact'),
    stage: t('Stage'),
    assignedTo: t('Assigned To'),
    referralTo: t('Referral To'),
    referralFrom: t('Referral From'),
    referralDate: t('Referral Date'),
    actions: t('Actions')
  }), [t])

  const displayColumns = useMemo(() => {
    const dynamicCols = dynamicFields.reduce((acc, field) => {
      acc[field.key] = i18n.language === 'ar' ? field.label_ar : field.label_en
      return acc
    }, {})
    return { ...allColumns, ...dynamicCols }
  }, [allColumns, dynamicFields, i18n.language])

  // ===== Excel Import Helpers =====
  const normalizeKey = (key) => key?.toString()?.toLowerCase()?.trim()?.replace(/\s+/g, '')
  const headerMap = {
    name: ['name', 'الاسم', 'اسم العميل', 'lead', 'lead name'],
    email: ['email', 'البريد', 'البريد الإلكتروني'],
    phone: ['phone', 'الهاتف', 'رقم الهاتف', 'contact'],
    company: ['company', 'الشركة'],
    status: ['status', 'الحالة', 'stage', 'lead status'],
    priority: ['priority', 'الأولوية'],
    source: ['source', 'المصدر'],
    assignedTo: ['assignedto', 'assigned', 'المسؤول', 'المسند إليه', 'salesperson'],
    createdAt: ['createdat', 'تاريخ الإنشاء', 'created'],
    lastContact: ['lastcontact', 'آخر اتصال'],
    estimatedValue: ['estimatedvalue', 'القيمة التقديرية', 'value'],
    probability: ['probability', 'الاحتمالية'],
    notes: ['notes', 'ملاحظات']
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
    const nowDateStr = new Date().toISOString().slice(0, 10)
    const parsed = rows.map((row) => ({
      id: Date.now() + Math.random(),
      name: String(findValue(row, headerMap.name) || '').trim(),
      email: String(findValue(row, headerMap.email) || '').trim(),
      phone: String(findValue(row, headerMap.phone) || '').trim(),
      company: String(findValue(row, headerMap.company) || '').trim(),
      status: String(findValue(row, headerMap.status) || 'new').toLowerCase().trim(),
      priority: String(findValue(row, headerMap.priority) || 'medium').toLowerCase().trim(),
      source: String(findValue(row, headerMap.source) || 'import').trim(),
      assignedTo: String(findValue(row, headerMap.assignedTo) || '').trim(),
      createdAt: String(findValue(row, headerMap.createdAt) || nowDateStr).trim(),
      lastContact: String(findValue(row, headerMap.lastContact) || nowDateStr).trim(),
      estimatedValue: Number(findValue(row, headerMap.estimatedValue)) || 0,
      probability: Number(findValue(row, headerMap.probability)) || 0,
      notes: String(findValue(row, headerMap.notes) || '').trim(),
    }))
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
        errors: backendErrors,
      })
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
    lastComment: true,
    stage: true,
    expectedRevenue: true,
    priority: true,
    actions: true
  })

  // State for column order
  const [columnOrder, setColumnOrder] = useState(Object.keys(allColumns))

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-black dark:bg-blue-900 dark:text-blue-200'
      case 'qualified': return 'bg-green-100 text-black dark:bg-green-900 dark:text-green-200'
      case 'in-progress': return 'bg-yellow-100 text-black dark:bg-yellow-900 dark:text-yellow-200'
      case 'converted': return 'bg-purple-100 text-black dark:bg-purple-900 dark:text-purple-200'
      case 'lost': return 'bg-red-100 text-black dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-900 '
    }
  }

  const getPriorityColor = (priority) => {
    switch (String(priority).toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100  dark:bg-gray-900 '
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
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'Facebook': return '📱'
      case 'Website': return '🌐'
      case 'Referral': return '👥'
      case 'Campaign': return '📧'
      case 'website': return '🌐'
      case 'social-media': return '📱'
      case 'referral': return '👥'
      case 'email-campaign': return '📧'
      case 'direct': return '🏢'
      default: return '📋'
    }
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
    const updatedLeads = leads.map(l => l.id === updatedLead.id ? updatedLead : l)
    setLeads(updatedLeads)
    setFilteredLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l))
    localStorage.setItem('leadsData', JSON.stringify(updatedLeads))
    
    if (selectedLead && selectedLead.id === updatedLead.id) {
      setSelectedLead(updatedLead)
    }
    if (hoveredLead && hoveredLead.id === updatedLead.id) {
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
        assign_role: assignData.assignRole // 'sales' | 'manager'
      });

      setLeads(prev => prev.map(l => {
        if (selectedLeads.includes(l.id)) {
          if (assignData.assignRole === 'manager') {
             return { ...l, manager_id: target };
          } else {
             return { ...l, assignedTo: assignData.userName, sales_person: assignData.userName, stage: 'Follow Up' };
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
    const target = bulkAssignTo?.trim()
    if (!target) {
      setBulkFeedback({ key: 'bulk.selectAssigneeError' })
      return
    }
    const guard = canAssignNow(new Date())
    if (!guard.ok) {
      setBulkFeedback({ key: 'bulk.assignBlocked', params: { reason: guard.reason } })
      return
    }

    try {
      await api.post('/api/leads/bulk-assign', {
        ids: selectedLeads,
        assigned_to: target
      });

      setLeads(prev => prev.map(l => (
        selectedLeads.includes(l.id) ? { ...l, assignedTo: target, stage: 'Follow Up' } : l
      )))
      setBulkFeedback({ key: 'bulk.assignSuccess', params: { count: selectedLeads.length, target } })
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
  const totalPages = leadsQueryData?.last_page || 1;
  const paginatedLeads = filteredLeads; // filteredLeads is already the current page data from API

  // FIX 1: Corrected the incomplete object definition for export
  const handleExportRange = () => {
    const actualTotal = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage))
    const from = Math.max(1, Math.min(Number(exportFrom) || currentPage, actualTotal))
    const to = Math.max(from, Math.min(Number(exportTo) || from, actualTotal))
    const startIdx = (from - 1) * itemsPerPage
    const endIdx = Math.min(to * itemsPerPage, filteredLeads.length)
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
      'Assigned To': l.sales_person || l.assignedAgent?.name || l.assigned_agent?.name || '-',
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
    lastComment: 220,
    stage: 140,
    expectedRevenue: 160,
    priority: 140,
  };

  return (
    <div className={`px-2 max-[480px]:px-1 py-4 md:px-6 md:py-6 min-h-screen  ${textColor}` } dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={`p-4 flex justify-between items-center gap-4 mb-6`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={`relative inline-flex items-center ${isRtl ? 'flex-row-reverse' : ''} gap-2`}>
          <h1 className={`page-title text-2xl md:text-3xl font-bold text-black  flex items-center gap-2 ${isRtl ? 'text-right' : 'text-left'}`} style={{ textAlign: isRtl ? 'right' : 'left', color: theme === 'dark' ? '#ffffff' : '#000000' }}>
            {i18n.language === 'ar' ? 'إحالات' : t('Referral Leads')}
          </h1>
          <span
            aria-hidden
            className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent"
            style={{ width: 'calc(100% + 8px)', left: isRtl ? 'auto' : '-4px', right: isRtl ? '-4px' : 'auto', bottom: '-4px' }}
          ></span>
        </div>
        <div className={`flex items-center gap-2 max-[480px]:gap-1 flex-nowrap ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
          {/* Add New Lead and Import buttons removed for Referral Leads page */}
        </div>
      </div>

      {/* Leads Table Filters & Controls */}
      <div className={`glass-panel rounded-2xl p-3 mb-6 filters-compact`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold   flex items-center gap-2">
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
                setPriorityFilter([])
                setProjectFilter([])
                setStageFilter([])
                setManagerFilter([])
                setSalesPersonFilter([])
                setCreatedByFilter([])
                setCampaignFilter([])
                setCountryFilter([])
                setSortBy('createdAt')
                setSortOrder('desc')
                setCurrentPage(1)
              }}
              className="px-3 py-1.5 text-sm  hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              {t('Reset')}
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="space-y-3">
          {/* First Row - Always Visible (Search + 4 filters) */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2">
            {/* Search */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                <FaSearch size={12} className="text-blue-500 dark:text-blue-400" />
                {t('Search')}
              </label>
              <input
                type="text"
                placeholder={t('Search leads...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-3 py-2 border border-theme-border dark:border-gray-500 rounded-lg    ${isLight ? 'text-black' : 'text-white'} text-sm font-medium  dark:placeholder-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 transition-all duration-200`}
              />
            </div>

            {/* Stage Filter */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                {t('Stage')}
              </label>
              <SearchableSelect
                value={stageFilter}
                multiple={true}
                onChange={setStageFilter}
                options={(dbFilters.stages || []).map(s => ({ 
                  value: s.name, 
                  label: isRtl ? (s.name_ar || s.name) : s.name, 
                  icon: s.icon 
                }))}
                placeholder={t('All')}
                isRTL={isRtl}
              />
            </div>

            {/* Manager Filter */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {t('Manager')}
              </label>
              <SearchableSelect
                value={managerFilter}
                multiple={true}
                onChange={setManagerFilter}
                options={(dbFilters.managers || []).map(u => ({ value: u.id, label: u.name }))}
                placeholder={t('All')}
                isRTL={isRtl}
              />
            </div>

            {/* Referral To (Sales Person) Filter */}
            <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {t('Referral To')}
              </label>
              <SearchableSelect
                value={salesPersonFilter}
                multiple={true}
                onChange={setSalesPersonFilter}
                options={(dbFilters.salesPersons || []).map(u => ({ value: u.id, label: u.name }))}
                placeholder={t('All')}
                isRTL={isRtl}
              />
            </div>

            {/* Referral From (Referrer) Filter */}
            {canShowCreator && <div className="space-y-1">
              <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20h18" />
                </svg>
                {t('Referral From')}
              </label>
              <SearchableSelect
                value={createdByFilter}
                multiple={true}
                onChange={setCreatedByFilter}
                options={(dbFilters.referrers || []).map(u => ({ value: u.id, label: u.name }))}
                placeholder={t('All')}
                isRTL={isRtl}
              />
            </div>}
          </div>

          {/* Additional Filters (Show/Hide) */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showAllFilters ? 'max-h-[400px] opacity-100 pt-3' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Project Filter */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {String(company?.company_type || '').toLowerCase() === 'general' ? t('Item') : t('Project')}
                </label>
                <SearchableSelect
                  value={projectFilter}
                  multiple={true}
                  onChange={setProjectFilter}
                  options={(dbFilters.projects || []).map(p => ({ value: p.name, label: p.name }))}
                  placeholder={t('All')}
                  isRTL={isRtl}
                />
              </div>

              {/* Country Filter */}
              <div className="space-y-1">
                <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                  <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v10a2 2 0 01-2 2H3.055L3 11z" />
                  </svg>
                  {t('Country')}
                </label>
                <SearchableSelect
                  value={countryFilter}
                  multiple={true}
                  onChange={setCountryFilter}
                  options={(dbFilters.countries || []).map(c => ({ 
                    value: c.id, 
                    label: isRtl ? (c.name_ar || c.name) : c.name 
                  }))}
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
                  options={(dbFilters.campaigns || []).map(c => ({ value: c, label: c }))}
                  placeholder={t('All')}
                  isRTL={isRtl}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`flex items-center justify-between mb-3`}>
        <div className="flex items-center gap-3">
          <h2 className={`text-xl font-bold ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>
            {i18n.language === 'ar' ? 'مسار الإحالات' : t('Referral Leads Pipeline')}
          </h2>

        </div>
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
          <span className="font-bold">{new Intl.NumberFormat(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US').format(stageCounts.total || 0)}</span>
        </button>

        {sidebarStages.map((s) => (
          <button
            key={s.key}
            onClick={() => setStageFilter([s.key])}
            className={`btn btn-glass text-sm flex items-center justify-between gap-2 px-3 py-2 min-h-[56px] h-full ${textColor}`}
          >
            <span className="flex items-center gap-2 text-left"><span>{renderStageIcon(s.icon)}</span><span>{t(s.key)}</span></span>
            <span className="font-bold">{new Intl.NumberFormat(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US').format(stageCounts[s.key] || 0)}</span>
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className={`glass-panel rounded-2xl overflow-hidden`}>
        <div className="flex justify-between items-center p-3 border-b border-theme-border dark:border-gray-700">
          {selectedLeads.length > 0 ? (
            <div className="flex items-center gap-4 flex-wrap">
              <span className={`text-sm font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                {t('Selected')}: {selectedLeads.length} {t('Leads')}
              </span>

              {canUseBulkAssign && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowBulkAssignModal(true)} 
                    className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none"
                  >
                    {t('Bulk Assign')}
                  </button>
                </div>
              )}

              {canUseBulkAssign && (
                <div className="flex items-center gap-2">
                  <SearchableSelect
                    value={bulkAssignReferralTo}
                    onChange={setBulkAssignReferralTo}
                    options={referralSupervisors.map(u => ({ value: u.id, label: u.name }))}
                    placeholder={t('Assign Referral To')}
                    showAllOption={false}
                    isRTL={isRtl}
                    className="py-1.5  dark:bg-transparent backdrop-blur-sm text-sm dark:border-gray-600 min-w-[150px]"
                  />
                  <button onClick={applyBulkAssignReferral} className="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white border-none">
                    {t('Assign Referral')}
                  </button>
                </div>
              )}

              {canUseBulkMultiActions && (
                <>
                  {crmSettings?.allowConvertToCustomers !== false && (
                    <button onClick={applyBulkConvert} className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none">
                      {t('Convert to Customer')}
                    </button>
                  )}

                  <button onClick={applyBulkDelete} className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none">
                    {t('Delete Selected')} ({selectedLeads.length})
                  </button>
                </>
              )}
            </div>
          ) : (
            <span className={`text-sm font-medium ${isLight ? 'text-black' : 'text-white'} `}>{t('No leads selected for bulk actions')}</span>
          )}
        </div>
        <div ref={scrollXRef} className="mt-4 w-full overflow-x-auto rounded-lg shadow-md backdrop-blur-lg" style={{ '--table-header-bg': theme === 'dark' ? 'transparent' : undefined, '--scroll-bg': theme === 'dark' ? '#0f172a' : '#f9fafb' }}>
          <table className={`w-max min-w-full divide-y divide-theme-border dark:divide-gray-700 ${isLight ? 'text-black' : 'text-white'} `} style={{ tableLayout: 'auto' }}>
            <thead className={` ${tableHeaderBgClass} backdrop-blur-md sticky top-0 z-30 shadow-md`} style={{ backgroundColor: 'var(--table-header-bg)' }}>
              <tr>
                {/* Checkbox Column */}
                <th scope="col" className={`w-10 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'}  whitespace-nowrap`} style={{ backgroundColor: 'var(--table-header-bg)' }}>
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-theme-border rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800  dark:border-gray-600"
                  />
                </th>

                {columnOrder.map(key => {
                  if (!visibleColumns[key]) return null;

                  if (key === 'lead') {
                    return (
                      <th
                        key="lead"
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'} w-40 whitespace-nowrap cursor-pointer`}
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
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'} w-48 whitespace-nowrap`}
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
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'}  whitespace-nowrap ${isSortable ? 'cursor-pointer' : 'cursor-default'}`}
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
                        return (
                          <td key="lead" className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isLight ? 'text-black' : 'text-white'} `}>
                            <div className="font-semibold text-base flex items-center gap-1">
                              {lead.name}
                              {String(lead.stage || lead.status || '').toLowerCase().includes('duplicate') && (
                                <FaClone className="text-red-500" size={12} title={t('Duplicate Lead')} />
                              )}
                            </div>
                            <div className={`text-gray-500  text-xs mt-0.5`}>{lead.company}</div>
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
                              {canAddAction && (
                                <button
                                  title={t('Add Action')}
                                  onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setShowAddActionModal(true) }}
                                  className={`inline-flex items-center justify-center ${theme === 'light' ? 'text-gray-700 hover:text-blue-500' : 'text-emerald-300 hover:text-emerald-400'}`}
                                >
                                  <FaPlus size={16} className={`${theme === 'light' ? 'text-gray-700' : 'text-emerald-300'}`} />
                                </button>
                              )}
                              {crmSettings?.showMobileNumber !== false && (
                                <button
                                  title={t('Call')}
                                  onClick={(e) => { e.stopPropagation(); const raw = lead.phone || lead.mobile || ''; const digits = String(raw).replace(/[^0-9]/g, ''); if (digits) window.open(`tel:${digits}`); }}
                                  className="inline-flex items-center justify-center text-blue-600 dark:text-[#2563EB] hover:opacity-80"
                                >
                                  <FaPhone size={16} />
                                </button>
                              )}

                              <button
                                title={t('Email')}
                                onClick={(e) => { e.stopPropagation(); if (lead.email) window.open(`mailto:${lead.email}`); }}
                                className="inline-flex items-center justify-center text-[#FFA726] hover:opacity-80"
                              >
                                <FaEnvelope size={16} />
                              </button>
                              <button
                                title="Google Meet"
                                onClick={(e) => { e.stopPropagation(); window.open('https://meet.google.com/', '_blank'); }}
                                className="inline-flex items-center justify-center hover:opacity-80"
                              >
                                <img src={MEET_ICON_URL} alt="Google Meet" className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        );

                      case 'stage':
                        const displayStage = lead.visible_stage || lead.stage;
                        return (
                          <td key="stage" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-black'} `} style={{ minWidth: `${columnMinWidths.stage}px` }}>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold leading-5 rounded-full ${getStatusColor(displayStage)}`}>
                              {t(displayStage || 'N/A')}
                            </span>
                          </td>
                        );

                      case 'assignedTo':
                        const assignedToName =
                          usersList.find(u => String(u.id) === String(lead.assigned_to || lead.assignedTo))?.name;
                        const assignedLabel =
                          String(lead.sales_person || '').trim() ||
                          lead.assignedAgent?.name ||
                          lead.assigned_agent?.name ||
                          assignedToName ||
                          (typeof lead.assignedTo === 'string' ? lead.assignedTo : '') ||
                          '-';
                        return (
                          <td key="assignedTo" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'} `}>
                            {assignedLabel}
                          </td>
                        );

                      case 'referralTo':
                        return (
                          <td key="referralTo" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'} `}>
                            {lead.referral?.user?.name || '-'}
                          </td>
                        );

                      case 'referralFrom':
                        return (
                          <td key="referralFrom" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'} `}>
                            {lead.referral?.referrer?.name || '-'}
                          </td>
                        );

                      case 'referralDate':
                        return (
                          <td key="referralDate" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'} `}>
                            {lead.referral_date ? new Date(lead.referral_date).toLocaleDateString() : '-'}
                          </td>
                        );

                      case 'expectedRevenue':
                        return (
                          <td key="expectedRevenue" className={`px-6 py-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'} `} style={{ minWidth: `${columnMinWidths.expectedRevenue}px` }}>
                            {lead.estimatedValue ? `${lead.estimatedValue.toLocaleString()} ${t('SAR')}` : '-'}
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
            <div className={`text-center py-10 ${isLight ? 'text-black' : 'text-white'}`}>
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <h3 className={`mt-2 text-sm font-medium ${isLight ? 'text-black' : 'text-white'}`}>{t('No Leads Found')}</h3>
              <p className={`mt-1 text-sm ${isLight ? 'text-black' : 'text-white'}`}>{t('Try adjusting your filters or adding new leads.')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      <nav className="flex flex-col gap-4 p-3 lg:p-4 border-t border-theme-border dark:border-gray-700 dark:bg-transparent rounded-b-lg backdrop-blur-sm">
        {/* Row 1: Show Entries & Page Navigation */}
        <div className="flex  lg:flex-row justify-between items-center gap-3">
          {/* Show Entries */}
          <div className={`flex flex-wrap items-center gap-2 w-full lg:w-auto text-sm font-medium ${isLight ? 'text-black' : 'text-white'}`}>
            <span style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Show')}</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { 
                setItemsPerPage(Number(e.target.value)); 
                setCurrentPage(1); 
              }} 
              className={`px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'} text-xs`}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('entries')}</span>
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
                  if (page > 0 && page <= Math.ceil(filteredLeads.length / itemsPerPage)) {
                    setCurrentPage(page)
                    setPageSearch('')
                  }
                }
              }}
              className={`ml-2 px-3 py-1.5 border border-theme-border dark:border-gray-600 rounded-lg  dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'} text-xs w-full sm:w-64 lg:w-28  dark:placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400`}
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
              <span className={`sr-only ${isLight ? 'text-black' : 'text-white'} focus:text-white`}>{t('Previous')}</span>
              <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
            </button>
            <span className={`text-sm font-medium ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>
              {t('Page')} <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{currentPage}</span> {t('of')} <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{Math.ceil(filteredLeads.length / itemsPerPage)}</span>
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredLeads.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(filteredLeads.length / itemsPerPage)}
              className={`block px-3 py-2 leading-tight ${isLight ? 'text-black' : 'text-white'} border border-theme-border rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-transparent dark:border-gray-700  dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 backdrop-blur-sm`}
            >
              <span className={`sr-only ${isLight ? 'text-black' : 'text-white'} focus:text-white`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Next')}</span>
              <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
            </button>
          </div>
        </div>

        {/* Row 2: Export Controls */}
        {canExportLeads && (
          <div className="flex justify-center items-center">
            <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto border p-2 rounded-lg border-theme-border dark:border-gray-600  dark:bg-gray-700 justify-center">
              <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Export Pages')}</span>
              <input
                type="number"
                min="1"
                max={Math.ceil(filteredLeads.length / itemsPerPage)}
                placeholder="From"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="w-16 px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm text-white text-xs focus:border-blue-500"
                style={{ color: theme === 'dark' ? '#ffffff' : undefined }}
              />
              <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('to')}</span>
              <input
                type="number"
                min="1"
                max={Math.ceil(filteredLeads.length / itemsPerPage)}
                placeholder="To"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className={`w-16 px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'} text-xs focus:border-blue-500`}
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
          hideDuplicateCompare
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
                if (canAddAction) {
                  setSelectedLead(hoveredLead)
                  setShowAddActionModal(true)
                }
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
             setShowCompareModal(false);
             return;
          }

          const isMergeLike = action === 'keep_duplicate' || action === 'save_info';
          // Handle edits to original lead (legacy behavior; skipped for merge-like actions)
          if (!isMergeLike && updatedOriginal && JSON.stringify(updatedOriginal) !== JSON.stringify(original)) {
             try {
                await api.put(`/api/leads/${original.id}`, updatedOriginal);
                handleUpdateLead(updatedOriginal);
             } catch (e) { console.error('Failed to update original lead', e); }
          }
          
          // Use updated duplicate if available
          const targetDuplicate = updatedDuplicate || duplicate;

          try {
            switch (action) {
              case 'keep_save':
                await api.post(`/api/leads/${targetDuplicate.id}/resolve-duplicate`, {
                  original_lead_id: original.id,
                  action: 'keep_original',
                });
                setLeads(prev => prev.filter(l => l.id !== targetDuplicate.id));
                break;

              case 'enable_duplicate':
                await api.post('/api/leads/duplicates/bulk-action', {
                  action: 'enable_duplicate',
                  lead_ids: [targetDuplicate.id],
                });
                break;

              case 'save_info': {
                const mergedData = extraData?.merged_data || {};
                await api.post(`/api/leads/${targetDuplicate.id}/resolve-duplicate`, {
                  original_lead_id: original.id,
                  action: 'keep_duplicate',
                  updated_data: mergedData,
                });
                setLeads(prev => prev.filter(l => l.id !== targetDuplicate.id));
                break;
              }

              case 'warn':
                // Call backend to warn agent
                const notes = (targetDuplicate.notes ? targetDuplicate.notes + '\n' : '') + `[System Warning] This lead is a duplicate of ${original.name} (#${original.id}).`;
                await api.post(`/api/leads/${targetDuplicate.id}/warn-duplicate`, {
                    original_lead_id: original.id,
                    notes: notes
                });
                
                // Update frontend
                const warningLead = {
                  ...targetDuplicate,
                  notes: notes
                };
                handleUpdateLead(warningLead);
                break;

              case 'transfer':
                // Transfer original lead to duplicate's owner (the one who created duplicate)
                // and delete duplicate lead
                
                // 1. Get duplicate's owner
                const newSalesPersonName = targetDuplicate.sales_person || targetDuplicate.assignedTo;
                const newSalesPersonId = targetDuplicate.assigned_to || (targetDuplicate.assignedTo && !isNaN(targetDuplicate.assignedTo) ? targetDuplicate.assignedTo : null);

                if (newSalesPersonName) {
                     // 2. Update original lead
                     const transferPayload = {
                       assignedTo: newSalesPersonId || newSalesPersonName,
                       sales_person: newSalesPersonName,
                       notes: (original.notes ? original.notes + '\n' : '') + `[System] Re-assigned to ${newSalesPersonName} (merged with duplicate #${targetDuplicate.id}).`
                     };
                     
                     await api.put(`/api/leads/${original.id}`, transferPayload);
                     
                     // Update frontend for original lead
                     const updatedOriginalForUI = {
                         ...original,
                         ...transferPayload
                     };
                     handleUpdateLead(updatedOriginalForUI);
                }

                // 3. Delete duplicate lead
                await api.delete(`/api/leads/${targetDuplicate.id}`);

                const deletedLeadTransfer = {
                  ...targetDuplicate,
                  deletedAt: new Date().toISOString()
                };
                
                // Save to deleted leads in localStorage
                const existingDeletedLeadsTransfer = JSON.parse(localStorage.getItem('deletedLeads') || '[]');
                existingDeletedLeadsTransfer.push(deletedLeadTransfer);
                localStorage.setItem('deletedLeads', JSON.stringify(existingDeletedLeadsTransfer));
                
                setLeads(prev => prev.filter(l => l.id !== targetDuplicate.id));
                break;

              case 'keep_original':
                // Delete duplicate lead
                await api.delete(`/api/leads/${targetDuplicate.id}`);

                const deletedLead = {
                  ...targetDuplicate,
                  deletedAt: new Date().toISOString()
                };
                
                // Save to deleted leads in localStorage
                const existingDeletedLeads = JSON.parse(localStorage.getItem('deletedLeads') || '[]');
                existingDeletedLeads.push(deletedLead);
                localStorage.setItem('deletedLeads', JSON.stringify(existingDeletedLeads));
                
                setLeads(prev => prev.filter(l => l.id !== targetDuplicate.id));
                break;
            }
          } catch (e) {
            console.error('Failed to resolve duplicate action', e);
            // alert(t('Failed to save changes. Please try again.'));
          }
          fetchLeads();
          setShowCompareModal(false);
        }}
      />
      {showEditModal && (
        <LeadModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          lead={editingLead}
          assignees={uniqueAssignees}
          onAssign={(newAssignee) => handleAssignLead(editingLead.id, newAssignee)}
          canAddAction={canAddAction}
          onSave={(updatedLead) => {
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l))
            fetchLeads();
            setShowEditModal(false)
          }}
        />
      )}

      {false && showAddActionModal && (
        <AddActionModal
          isOpen={showAddActionModal}
          onClose={() => setShowAddActionModal(false)}
          lead={selectedLead}
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

                // Only true "note" actions should overwrite lead.notes.
                // Normal action comments stay attached to the action / last comment, not lead notes.
                const actionType = String(newAction.type || newAction.action_type || '').toLowerCase();
                const newNote = newAction.description || newAction.notes;
                if (actionType === 'note' && newNote) {
                   updatedLead.notes = newNote;
                   hasChanges = true;
                }
                if (newNote) {
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
          }}
          lead={selectedLead}
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

export default ReferralLeads;
