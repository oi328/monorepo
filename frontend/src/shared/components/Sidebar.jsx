import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { useTheme } from '@shared/context/ThemeProvider'
import { RiCloseLine } from 'react-icons/ri'
import { Table, Users, Key, Settings2, Settings, Share2, Server, Database, Bell, MessageCircle, Mail, Globe, RefreshCw, Smartphone, Wrench, User, Building2, Building, Kanban, XCircle, MapPin, Flag, Map, FormInput, UserPlus, Box, Home, Briefcase } from 'lucide-react'
import lightLogo from '../../assets/be-souhola-logo-light.png'
import darkLogo from '../../assets/be-souhola-logo-dark.png'
import lightLogoCollapse from '../../assets/be-souhola-logo-light-collapse.png'
import darkLogoCollapse from '../../assets/be-souhola-logo-dark-collapse.png'
import { useAppState } from '@shared/context/AppStateProvider'
import { useTranslation } from 'react-i18next';
import { useStages } from '@hooks/useStages';
import { ICON_MAP } from '../../components/settings/IconSelector';


// دالة ترجع أيقونة مناسبة لكل عنصر
const getIcon = (key) => {
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.6',
    className: 'w-5 h-5',
    style: { display: 'block' } // Ensure consistent block display
  }

  switch (key) {
    case 'Dashboard':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="4" rx="1" />
          <rect x="14" y="11" width="6" height="9" rx="1" />
          <rect x="4" y="13" width="6" height="7" rx="1" />
        </svg>
      )
    case 'Lead Management':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="8" r="3" />
          <path d="M6 21v-2a6 6 0 0112 0v2" />
        </svg>
      )
    case 'All Leads':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      )
    case 'My Leads':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <polygon points="12 15 13 13 15 13 13.5 12 14 10 12 11 10 10 10.5 12 9 13 11 13 12 15" fill="currentColor" opacity="0.5" />
        </svg>
      )
    case 'Referral Leads':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )
    case 'Add New Lead':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      )
    case 'Inventory':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 7l9-4 9 4v10l-9 4-9-4V7" />
          <path d="M3 7l9 4 9-4" />
        </svg>
      )
    case 'Marketing Modules':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 10v4l12 4V6L3 10z" />
          <path d="M19 8v8" />
          <circle cx="7" cy="12" r="2" />
        </svg>
      )
    case 'Customers':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="8" cy="9" r="2.5" />
          <circle cx="16" cy="9" r="2.5" />
          <path d="M3 20v-1a5 5 0 015-5h8a5 5 0 015 5v1" />
        </svg>
      )
    case 'Reports':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 20V10" />
          <path d="M10 20V6" />
          <path d="M15 20V13" />
          <path d="M20 20V4" />
        </svg>
      )
    case 'User Management':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="8" r="3" />
          <path d="M4 20v-1a7 7 0 0116 0v1" />
        </svg>
      )
    case 'Support':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M21 12a9 9 0 10-18 0 3 3 0 003 3h1v3l4-3h6a3 3 0 003-3z" />
        </svg>
      )
    case 'Settings':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="2.5" />
          <path d="M19.4 15a7.5 7.5 0 000-6l-2 .7-1-1.7 1.3-1.6a9 9 0 00-6 0L12 7 10.3 5.4a9 9 0 00-6 0L5.6 7 4.6 8.7l-2-.7a7.5 7.5 0 000 6l2-.7 1 1.7-1.3 1.6a9 9 0 006 0L12 17l1.7 1.6a9 9 0 006 0L18.4 17l1-1.7 2 .7z" />
        </svg>
      )
    case 'Recycle Bin':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          <path d="M19 6v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      )
    case 'Contact us':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M4 8l8 6 8-6" />
        </svg>
      )
    default:
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      )
  }
}

// أيقونات العناصر الفرعية تحت قسم Inventory
const getInventoryItemIcon = (key) => {
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.6',
    className: 'w-4 h-4',
    style: { display: 'block' }
  }

  switch (key) {
    case 'Families':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
          <circle cx="2" cy="6" r="1" />
          <circle cx="2" cy="12" r="1" />
          <circle cx="2" cy="18" r="1" />
        </svg>
      )
    case 'Overview':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    case 'Groups':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="2" y="2" width="9" height="9" rx="1" />
          <rect x="13" y="2" width="9" height="9" rx="1" />
          <rect x="2" y="13" width="9" height="9" rx="1" />
          <rect x="13" y="13" width="9" height="9" rx="1" />
        </svg>
      )
    case 'Categories':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 7h14" />
          <path d="M4 12h14" />
          <path d="M4 17h10" />
          <rect x="2" y="5" width="2" height="2" rx="0.5" />
          <rect x="2" y="10" width="2" height="2" rx="0.5" />
          <rect x="2" y="15" width="2" height="2" rx="0.5" />
        </svg>
      )
    case 'Brands':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      )
    case 'Developers':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="4" y="5" width="6" height="14" rx="1" />
          <rect x="12" y="9" width="8" height="10" rx="1" />
          <path d="M6 7h2M6 10h2M6 13h2M6 16h2" />
          <path d="M14 11h2M14 14h2M14 17h2" />
        </svg>
      )
    case 'Brokers':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="7" cy="8" r="2.5" />
          <path d="M2 20v-1a6 6 0 016-6" />
          <circle cx="17" cy="8" r="2.5" />
          <path d="M22 20v-1a6 6 0 00-6-6" />
          <path d="M8 14l4 3 4-3" />
        </svg>
      )
    case 'Products':
      // Box/package icon
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 3l7 4-7 4-7-4 7-4" />
          <path d="M5 7v7l7 4 7-4V7" />
        </svg>
      )
    case 'Items':
      // List/bullets icon
      return (
        <svg {...common} aria-hidden="true">
          <path d="M6 6h12" />
          <path d="M6 12h12" />
          <path d="M6 18h12" />
          <circle cx="3" cy="6" r="1" />
          <circle cx="3" cy="12" r="1" />
          <circle cx="3" cy="18" r="1" />
        </svg>
      )
    case 'Warehouse':
      // Warehouse shelves icon
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 7l9-4 9 4v10l-9 4-9-4V7" />
          <path d="M7 10h10" />
          <path d="M7 14h10" />
          <path d="M7 18h10" />
        </svg>
      )
    case 'Price Books':
      // Book/Price tag icon
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    case 'Suppliers':
      // Truck/cart icon for suppliers/vendors
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="7" width="12" height="7" rx="1" />
          <path d="M15 10h3l2 3v1h-5v-4" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      )
    case 'Stock Management':
      // Clipboard/list icon for stock management
      return (
        <svg {...common} aria-hidden="true">
          <rect x="6" y="4" width="12" height="16" rx="2" />
          <path d="M9 9h6" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        </svg>
      )
    case 'Transactions':
      // Bidirectional arrows icon for inventory transactions
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 8h10" />
          <path d="M13 6l2 2-2 2" />
          <path d="M19 16h-10" />
          <path d="M11 14l-2 2 2 2" />
        </svg>
      )
    case 'Projects':
      // Folder icon
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      )
    case 'Properties':
      // Home/house icon
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 10l9-7 9 7" />
          <path d="M5 10v9h14v-9" />
          <path d="M10 19v-5h4v5" />
        </svg>
      )
    case 'Requests':
    case 'Order Requests':
    case 'Requests (General)':
    case 'Requests (Real Estate)':
      // Inbox/document icon
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M7 10h10" />
          <path d="M7 7h10" />
        </svg>
      )
    case 'Buyer Requests':
      // User with arrow down (receive)
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="9" cy="8" r="2.5" />
          <path d="M3 20v-1a6 6 0 016-6" />
          <path d="M16 7v6" />
          <path d="M13 10l3 3 3-3" />
        </svg>
      )
    case 'Seller Requests':
      // User with arrow up (send)
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="9" cy="8" r="2.5" />
          <path d="M3 20v-1a6 6 0 016-6" />
          <path d="M16 13V7" />
          <path d="M13 10l3-3 3 3" />
        </svg>
      )
    case 'Dev Companies':
      // Office building icon
      return (
        <svg {...common} aria-hidden="true">
          <rect x="4" y="5" width="6" height="14" rx="1" />
          <rect x="12" y="9" width="8" height="10" rx="1" />
          <path d="M6 7h2M6 10h2M6 13h2M6 16h2" />
          <path d="M14 11h2M14 14h2M14 17h2" />
        </svg>
      )
    default:
      return (
        <svg {...common} aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      )
  }
}

// أيقونات عناصر التسويق
const getMarketingItemIcon = (key) => {
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.6',
    className: 'w-4 h-4',
    style: { display: 'block' }
  }

  switch (key) {
    case 'Dashboard':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="4" rx="1" />
          <rect x="14" y="11" width="6" height="9" rx="1" />
          <rect x="4" y="13" width="6" height="7" rx="1" />
        </svg>
      )
    case 'Campaigns':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 5h10l6 4v6l-6 4H4V5z" />
          <circle cx="8" cy="12" r="2" />
        </svg>
      )
    case 'Landing Pages':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M4 9h16" />
          <path d="M8 13h8" />
        </svg>
      )
    case 'Integrations':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M6 12c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5z" />
          <path d="M7 12c1-3 3-5 4-5 2 0 4 4 6 5" />
        </svg>
      )
    case 'Reports':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M2 20h20" />
          <path d="M5 20v-4" />
          <path d="M9 20v-8" />
          <path d="M13 20v-6" />
          <path d="M17 20v-10" />
        </svg>
      )
    case 'Leads Performance':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 18V6" />
          <path d="M8 18V10" />
          <path d="M12 18V8" />
          <path d="M16 18V13" />
          <path d="M20 18V5" />
        </svg>
      )
    default:
      return (
        <svg {...common} aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      )
  }
}

export const Sidebar = ({ isOpen, onClose = () => { }, className, collapsed, setCollapsed }) => {
  const { activeModules, user, company, canAccess, crmSettings, inventoryBadges } = useAppState()
  const { theme, resolvedTheme } = useTheme()
  const { t, i18n } = useTranslation();

  // Handle Collapsed State (Prop or Local)
  const [localCollapsed, setLocalCollapsed] = useState(false)
  const isCollapsed = collapsed !== undefined ? collapsed : localCollapsed
  const allowCollapse = !crmSettings || crmSettings.sidebarCollapsible !== false
  const uiCollapsed = allowCollapse ? isCollapsed : false

  const location = useLocation();
  const navigate = useNavigate();
  const isSystemArea = location.pathname.startsWith('/system');
  const isLight = resolvedTheme === 'light'
  const currentLogo = uiCollapsed
    ? (resolvedTheme === 'dark' ? darkLogoCollapse : lightLogoCollapse)
    : (resolvedTheme === 'dark' ? darkLogo : lightLogo);
  const langCode = (i18n.language || 'en').toLowerCase();
  const isRTL = i18n.dir(langCode) === 'rtl';
  const navRef = useRef(null)
  const role = user?.role || ''
  const roleLower = role.toLowerCase()
  const isSalesPerson = roleLower.includes('sales person') || roleLower.includes('salesperson')
  const isTeamLeader = roleLower.includes('team leader') || roleLower.includes('teamleader')
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'
  const isDirectorRole = role === 'Director' || roleLower.includes('director')
  const isOperationManagerRole = roleLower.includes('operation manager') || roleLower.includes('operations manager')
  const isSuperAdmin = !!(
    user?.is_super_admin || 
    roleLower.includes('super admin') || 
    roleLower.includes('superadmin') || 
    roleLower === 'owner' ||
    String(user?.email || '').toLowerCase() === 'system@besouhoula.com' ||
    String(user?.email || '').toLowerCase() === 'admin@example.com' ||
    String(user?.email || '').toLowerCase() === 'admin@besouhoula.com'
  )
  const hasFullSettingsAccess = isSuperAdmin || isTenantAdmin || isDirectorRole || isOperationManagerRole

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const controlModulePerms = Array.isArray(modulePermissions.Control) ? modulePermissions.Control : []
  const effectiveControlPerms = controlModulePerms.length ? controlModulePerms : (() => {
    if (role === 'Sales Admin') return ['addRegions', 'addArea', 'addSource', 'userManagement', 'allowActionOnTeam', 'assignLeads', 'showReports', 'addDepartment']
    if (role === 'Operation Manager') return ['allowActionOnTeam', 'showReports', 'addDepartment']
    if (role === 'Branch Manager') return ['allowActionOnTeam', 'assignLeads', 'showReports']
    if (role === 'Director') return ['userManagement', 'assignLeads', 'exportLeads', 'showReports', 'multiAction', 'salesComment']
    if (role === 'Sales Manager') return ['assignLeads', 'showReports']
    if (role === 'Team Leader') return ['allowActionOnTeam', 'assignLeads', 'showReports']
    if (role === 'Sales Person') return ['showReports']
    if (role === 'Customer Manager') return ['showReports']
    if (role === 'Support Manager') return ['showReports']
    if (role === 'Support Team Leader') return ['showReports']
    return []
  })()

  const canViewCompanyDetails = hasFullSettingsAccess || effectiveControlPerms.includes('editConfigurationSettings')
  const canViewCompanySetupSection = false
  const canViewSystemSettingsSection =
    hasFullSettingsAccess ||
    effectiveControlPerms.some(p =>
      ['addStage', 'addSource', 'addRegions', 'addArea', 'addInputs', 'editConfigurationSettings'].includes(p)
    )
  const canViewPipelineStages = hasFullSettingsAccess || effectiveControlPerms.includes('addStage')
  const canViewCancelReasons = hasFullSettingsAccess || effectiveControlPerms.includes('editConfigurationSettings')
  const canViewCrmSettings = hasFullSettingsAccess || effectiveControlPerms.includes('editConfigurationSettings')
  const canViewSourcesSettings = hasFullSettingsAccess || effectiveControlPerms.includes('addSource')
  const canViewLocationsSettings =
    hasFullSettingsAccess || effectiveControlPerms.some(p => ['addRegions', 'addArea'].includes(p))
  const canViewFormInputsSettings = hasFullSettingsAccess || effectiveControlPerms.includes('addInputs')
  const canViewConfigurationsSection = hasFullSettingsAccess || effectiveControlPerms.includes('editConfigurationSettings')

  const canSeeMyLeadsLink = !isSalesPerson
  const isSalesAdminRole = roleLower.includes('sales admin')
  const isSalesManagerRole = roleLower.includes('sales manager')
  const isBranchManagerRole = roleLower.includes('branch manager')
  const isMarketingManagerRole = roleLower.includes('marketing manager')
  const isMarketingModeratorRole = roleLower.includes('marketing moderator')
  
  // New: Sales Person Visibility Logic
  // Pending and Duplicate cards/links should NOT be visible to Sales Person
  const canSeePendingCard = !isSalesPerson;
  const canSeeDuplicateCard = !isSalesPerson;

  const canSeeMarketingModules =
    isSuperAdmin ||
    isTenantAdmin ||
    isDirectorRole ||
    isOperationManagerRole ||
    isSalesAdminRole ||
    isSalesManagerRole ||
    isBranchManagerRole ||
    isMarketingManagerRole ||
    isMarketingModeratorRole

  const canSeeRecycleBin =
    isSuperAdmin ||
    isTenantAdmin ||
    isDirectorRole ||
    isOperationManagerRole ||
    isSalesAdminRole ||
    isBranchManagerRole

  const canViewUserManagementSection =
    user?.is_super_admin ||
    isTenantAdmin ||
    isDirectorRole ||
    isOperationManagerRole ||
    effectiveControlPerms.includes('userManagement')

  const canSeeReportsLink =
    user?.is_super_admin ||
    isTenantAdmin ||
    isDirectorRole ||
    isOperationManagerRole ||
    isSalesAdminRole ||
    isSalesManagerRole ||
    isTeamLeader ||
    isSalesPerson ||
    roleLower.includes('customer') ||
    roleLower.includes('support') ||
    effectiveControlPerms.includes('showReports')

  const [inventoryOpen, setInventoryOpen] = useState(false)
  const isInventoryActive = location.pathname.startsWith('/inventory');
  const [leadMgmtOpen, setLeadMgmtOpen] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('leadMgmtOpen');
        if (saved === 'true') return true;
        if (saved === 'false') return false;
      }
    } catch { }
    return false; // مقفولة افتراضيًا
  })
  const isLeadMgmtActive = location.pathname.startsWith('/leads') || location.pathname.startsWith('/recycle');
  // أغلق قائمة الليد تلقائيًا عند الانتقال لأي مسار خارج الليد/الريسايكل
  useEffect(() => {
    if (!isLeadMgmtActive) {
      setLeadMgmtOpen(false);
      try { if (typeof window !== 'undefined' && window.localStorage) { window.localStorage.setItem('leadMgmtOpen', 'false') } } catch { }
    }
  }, [location.pathname, isLeadMgmtActive])
  // افتح قسم إدارة العملاء تلقائيًا عند التواجد في مسارات الليد/الريسايكل
  useEffect(() => {
    if (isLeadMgmtActive) {
      setLeadMgmtOpen(true)
      try { if (typeof window !== 'undefined' && window.localStorage) { window.localStorage.setItem('leadMgmtOpen', 'true') } } catch { }
    }
  }, [isLeadMgmtActive])
  const [stagesOpen, setStagesOpen] = useState(true)
  const isMarketingActive = location.pathname.startsWith('/marketing') || location.pathname.startsWith('/reports/marketing')
  const isRecycleActive = location.pathname.startsWith('/recycle')

  // Sidebar expandable sections: open states
  const [customersOpen, setCustomersOpen] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Settings subsections open states
  const [profileCompanyOpen, setProfileCompanyOpen] = useState(false)
  const [systemSettingsOpen, setSystemSettingsOpen] = useState(false)
  const [locationsOpen, setLocationsOpen] = useState(false)
  const [formInputsOpen, setFormInputsOpen] = useState(false)
  const [configurationOpen, setConfigurationOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [companySetupOpen, setCompanySetupOpen] = useState(false)
  const [billingOpen, setBillingOpen] = useState(false)

  // Accordion helpers
  const openOnly = (section) => {
    setProfileCompanyOpen(section === 'profileCompany')
    setSystemSettingsOpen(section === 'systemSettings')
    setCompanySetupOpen(section === 'companySetup')
    setBillingOpen(section === 'billing')
    setConfigurationOpen(section === 'configuration')
    setNotificationsOpen(section === 'notifications')
  }

  const handleAccordionToggle = (section) => {
    const isOpen = (
      (section === 'profileCompany' && profileCompanyOpen) ||
      (section === 'systemSettings' && systemSettingsOpen) ||
      (section === 'companySetup' && companySetupOpen) ||
      (section === 'billing' && billingOpen) ||
      (section === 'configuration' && configurationOpen) ||
      (section === 'notifications' && notificationsOpen)
    )
    if (isOpen) {
      openOnly('') // close all
    } else {
      openOnly(section)
    }
  }

  const onSidebarItemClick = (e) => {
    onClose()
    try {
      e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    } catch { }
  }

  // Active flags for top-level sections
  // إبقاء قائمة Customers مفتوحة عند التنقل في مسارات العملاء والمبيعات الفرعية
  const isCustomersActive = location.pathname.startsWith('/customers') || location.pathname.startsWith('/sales')
  const isSettingsActive = location.pathname.startsWith('/settings') || location.pathname.startsWith('/stages-setup') || location.pathname.startsWith('/cancel-reasons')
  const isProfileCompanyActive = location.pathname.startsWith('/settings/profile')
  const isSystemSettingsActive = location.pathname.startsWith('/settings/system') || location.pathname.startsWith('/stages-setup') || location.pathname.startsWith('/cancel-reasons')
  const isConfigurationActive = location.pathname.startsWith('/settings/configuration') || location.pathname.startsWith('/settings/integrations') || location.pathname.startsWith('/settings/operations') || location.pathname.startsWith('/settings/notifications')
  const isNotificationsActive = location.pathname.startsWith('/settings/notifications')
  const isLocationsActive = location.pathname.startsWith('/settings/system/locations')
  const isFormInputsActive = location.pathname.startsWith('/settings/system/form-inputs')
  const isCompanySetupActive = location.pathname.startsWith('/settings/company-setup')
  const isBillingActiveFlag = location.pathname.startsWith('/settings/billing')
  const isAdminOwnerUser = roleLower.includes('admin') || roleLower.includes('super admin') || roleLower.includes('owner')
  const _isReportsActive = location.pathname.startsWith('/reports') || location.pathname.startsWith('/marketing/reports')
  const isUsersActive = location.pathname.startsWith('/user-management')
  const isSupportActive = location.pathname.startsWith('/support')
  // Restore missing Marketing submenu state with persistence and route-aware default
  const [marketingOpen, setMarketingOpen] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('marketingOpen')
        if (saved === 'true') return true
        if (saved === 'false') return false
      }
    } catch { }
    return false
  })

  // Auto-close Marketing submenu when navigating away from marketing routes
  useEffect(() => {
    if (!isMarketingActive) {
      setMarketingOpen(false)
      try { if (typeof window !== 'undefined' && window.localStorage) { window.localStorage.setItem('marketingOpen', 'false') } } catch { }
    }
  }, [location.pathname, isMarketingActive])

  // Ensure Marketing-only mode: close other module menus when on marketing routes
  useEffect(() => {
    if (isMarketingActive) {
      setLeadMgmtOpen(false)
      setInventoryOpen(false)
      setCustomersOpen(false)
      setUsersOpen(false)
      setSupportOpen(false)
      setSettingsOpen(false)
      try { if (typeof window !== 'undefined' && window.localStorage) { window.localStorage.setItem('leadMgmtOpen', 'false') } } catch { }
    }
  }, [isMarketingActive])

  // Auto-open matching Settings subsection when navigating within it
  useEffect(() => { if (isProfileCompanyActive) { openOnly('profileCompany') } else { setProfileCompanyOpen(false) } }, [isProfileCompanyActive])
  useEffect(() => { if (isSystemSettingsActive) { openOnly('systemSettings') } else { setSystemSettingsOpen(false) } }, [isSystemSettingsActive])
  useEffect(() => { setLocationsOpen(!!isLocationsActive) }, [isLocationsActive])
  useEffect(() => { setFormInputsOpen(!!isFormInputsActive) }, [isFormInputsActive])
  useEffect(() => { setConfigurationOpen(!!isConfigurationActive) }, [isConfigurationActive])
  useEffect(() => { setNotificationsOpen(!!isNotificationsActive) }, [isNotificationsActive])
  useEffect(() => { if (isCompanySetupActive) { openOnly('companySetup') } else { setCompanySetupOpen(false) } }, [isCompanySetupActive])
  useEffect(() => { if (isBillingActiveFlag) { openOnly('billing') } else { setBillingOpen(false) } }, [isBillingActiveFlag])

  const isSectionViewOpen = leadMgmtOpen || inventoryOpen || marketingOpen || customersOpen || usersOpen || supportOpen || reportsOpen || settingsOpen

  // Auto-open Settings submenu when on any /settings route; close when leaving
  useEffect(() => {
    if (isSettingsActive) {
      setSettingsOpen(true)
    } else {
      setSettingsOpen(false)
    }
  }, [isSettingsActive])

  // Keep Inventory submenu in sync with /inventory routes
  useEffect(() => {
    setInventoryOpen(!!isInventoryActive)
  }, [isInventoryActive])

  // Keep Customers submenu in sync with /customers routes
  useEffect(() => {
    setCustomersOpen(!!isCustomersActive)
  }, [isCustomersActive])

  // Keep Support submenu in sync with /support routes
  useEffect(() => {
    setSupportOpen(!!isSupportActive)
  }, [isSupportActive])

  useEffect(() => {
    if (isSupportActive) {
      setLeadMgmtOpen(false)
      setInventoryOpen(false)
      setMarketingOpen(false)
      setCustomersOpen(false)
      setUsersOpen(false)
      setSettingsOpen(false)
    }
  }, [isSupportActive])

  // Keep User Management submenu in sync with /user-management routes
  useEffect(() => {
    setUsersOpen(!!isUsersActive)
  }, [isUsersActive])



  const { stages } = useStages()
  const _safeStages = Array.isArray(stages) ? stages.map(s => typeof s === 'string' ? { name: s, nameAr: '', color: '#3B82F6', icon: '📊' } : s) : []
  const currentStageParam = (() => { try { return new URLSearchParams(location.search || '').get('stage') || null } catch { return null } })()

  // Leads data for counts and percentages (shared with Dashboard)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const allLeads = useMemo(() => {
    try {
      const saved = localStorage.getItem('leadsData')
      if (!saved) return []
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [refreshTrigger])
  const deletedLeads = useMemo(() => {
    try {
      const saved = localStorage.getItem('deletedLeads')
      if (!saved) return []
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [refreshTrigger])
  const _currentLeadsDataset = isRecycleActive ? deletedLeads : allLeads
  useEffect(() => {
    const handleStorageChange = () => setRefreshTrigger(prev => prev + 1)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('leadsDataUpdated', handleStorageChange)
    window.addEventListener('deletedLeadsUpdated', handleStorageChange)
    setRefreshTrigger(prev => prev + 1)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('leadsDataUpdated', handleStorageChange)
      window.removeEventListener('deletedLeadsUpdated', handleStorageChange)
    }
  }, [])

  // Helpers for color styles (hex and named presets)
  const _isHexColor = (c) => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)
  const hexToRgb = (hex) => {
    try {
      let h = hex.replace('#', '')
      if (h.length === 3) h = h.split('').map((x) => x + x).join('')
      const bigint = parseInt(h, 16)
      const r = (bigint >> 16) & 255
      const g = (bigint >> 8) & 255
      const b = bigint & 255
      return { r, g, b }
    } catch {
      return { r: 0, g: 0, b: 0 }
    }
  }
  const _withAlpha = (hex, alpha) => {
    const { r, g, b } = hexToRgb(hex)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  const _COLOR_STYLES = {
    blue: { container: 'border-blue-400 dark:border-blue-500 bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 dark:from-blue-800 dark:via-blue-700 dark:to-blue-600', iconBg: 'bg-blue-600 dark:bg-blue-500' },
    green: { container: 'border-green-400 dark:border-green-500 bg-gradient-to-br from-green-100 via-green-200 to-green-300 dark:from-green-800 dark:via-green-700 dark:to-green-600', iconBg: 'bg-green-600 dark:bg-green-500' },
    yellow: { container: 'border-yellow-400 dark:border-yellow-500 bg-gradient-to-br from-yellow-100 via-yellow-200 to-yellow-300 dark:from-yellow-800 dark:via-yellow-700 dark:to-yellow-600', iconBg: 'bg-yellow-600 dark:bg-yellow-500' },
    red: { container: 'border-red-400 dark:border-red-500 bg-gradient-to-br from-red-100 via-red-200 to-red-300 dark:from-red-800 dark:via-red-700 dark:to-red-600', iconBg: 'bg-red-600 dark:bg-red-500' },
    purple: { container: 'border-purple-400 dark:border-purple-500 bg-gradient-to-br from-purple-100 via-purple-200 to-purple-300 dark:from-purple-800 dark:via-purple-700 dark:to-purple-600', iconBg: 'bg-purple-600 dark:bg-purple-500' },
    orange: { container: 'border-orange-400 dark:border-orange-500 bg-gradient-to-br from-orange-100 via-orange-200 to-orange-300 dark:from-orange-800 dark:via-orange-700 dark:to-orange-600', iconBg: 'bg-orange-600 dark:bg-orange-500' },
  }
  const [inventoryMode, setInventoryMode] = useState(() => {
    try {
      return typeof window !== 'undefined' ? (window.localStorage.getItem('inventoryMode') || 'Advanced') : 'Advanced'
    } catch { return 'Advanced' }
  })

  // Listen for inventory mode changes from settings
  useEffect(() => {
    const handleInventoryModeChange = () => {
      const newMode = window.localStorage.getItem('inventoryMode') || 'Advanced';
      setInventoryMode(newMode);
    };

    window.addEventListener('storage', handleInventoryModeChange);
    window.addEventListener('inventoryModeUpdated', handleInventoryModeChange);

    return () => {
      window.removeEventListener('storage', handleInventoryModeChange);
      window.removeEventListener('inventoryModeUpdated', handleInventoryModeChange);
    };
  }, []);

  // Expose toggle function for testing or settings page
  useEffect(() => {
    window.toggleInventoryMode = () => {
      setInventoryMode(prev => {
        const next = prev === 'Advanced' ? 'Simple' : 'Advanced';
        window.localStorage.setItem('inventoryMode', next);
        window.dispatchEvent(new Event('inventoryModeUpdated'));
        return next;
      });
    }
  }, []);

  const asideTone = isLight ? 'bg-theme-sidebar border-theme-border text-theme-text' : 'bg-gray-900 border-gray-800 text-gray-100'
  const baseLink = isLight
    ? 'group flex items-center gap-3 px-4 py-2.5 rounded-md text-theme-text hover:bg-blue-50 transition overflow-hidden'
    : 'group flex items-center gap-3 px-4 py-2.5 rounded-md text-gray-200 hover:bg-gray-800 transition overflow-hidden'
  const iconContainer = 'flex-shrink-0 nova-icon flex items-center justify-center'
  const activeLink = isLight
    ? `bg-theme-sidebar-active text-theme-sidebar-active-text ${isRTL ? 'active-link-indicator' : 'border-l-4'} border-blue-500 font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]`
    : `bg-gray-800 text-blue-400 ${isRTL ? 'active-link-indicator' : 'border-l-4'} border-blue-500 font-bold`
  const iconTone = isLight ? 'text-theme-text group-hover:text-blue-600' : 'text-gray-400 group-hover:text-blue-400'
  const backLabel = langCode.startsWith('ar') ? 'رجوع' : 'Back'

  const _items = [
    { to: '/', key: 'Dashboard' },
    { to: '/leads', key: 'Lead Management' },
    // Inventory & Marketing will be rendered as sections below
    { to: '/customers', key: 'Customers' },
    { to: '/reports', key: 'Reports' },
    { to: '/users', key: 'User Management' },
    { to: '/support', key: 'Support' },
    { to: '/settings', key: 'Settings' },
    // Contact us is rendered separately at the bottom
  ]

  // Filter out Pending and Duplicate links for Sales Person if they exist in _items
  // Currently they are not explicit links in _items, but if they were, we would filter them here.
  // However, there are separate sections for "My Leads", "Team Leads", "Pending Leads", etc. in some sidebars.
  // Checking the file content, it seems the sidebar is dynamically built or simple.
  // If there are sub-menus for Leads, we need to find them.
  // Based on current file read, _items only has '/leads'.
  // But wait, there might be a "My Leads" link handled separately or inside Lead Management?
  
  // Let's check if there are other sections rendered below.
  
  const inventoryChildren = useMemo(() => {
    // Check if Super Admin in Global View (no specific company context)
    // or simply if activeModules contains modules from both worlds.
    // Ideally, Super Admin should see whatever is in activeModules.

    const showBrokerFlag = crmSettings?.showBroker !== false
    const showDeveloperFlag = crmSettings?.showDeveloper !== false
    const reChildren = [
      { to: '/inventory/projects', key: 'Projects', module: 'projects' },
      { to: '/inventory/properties', key: 'Properties', module: 'properties' },
      { to: '/inventory/developers', key: 'Developers', module: 'developers' },
      { to: '/inventory/brokers', key: 'Brokers', module: 'brokers' },
      { to: '/inventory/real-estate-requests', key: 'Requests', module: 'requests' },
    ].filter(item => canAccess(item.module) && (item.module !== 'developers' || showDeveloperFlag) && (item.module !== 'brokers' || showBrokerFlag));

    const genChildren = [
      { to: '/inventory/categories', key: 'Categories', module: 'items' }, // Categories is part of Items
      { to: '/inventory/items', key: 'Items', module: 'items' },
      { to: '/inventory/requests', key: 'Order Requests', module: 'orders' },
    ].filter(item => canAccess(item.module));

    // If we are strictly a Tenant User, we might want to respect company_type to avoid clutter
    // But for Super Admin (who might have all modules), we want to show everything available.
    // The previous logic forced one or the other based on company_type.

    // Improved Logic:
    // If we have children for Real Estate, show RE Section.
    // If we have children for General, show General Section.
    // This handles the "Mixed" case for Super Admin automatically.

    const groups = [];

    // Only enforce company_type restriction if NOT super admin? 
    // Actually, relying on activeModules is safer. If the backend says you have 'items', you should see 'items'.
    // If the backend says you have 'properties', you should see 'properties'.
    // The backend `enabled_modules` logic dictates what is active.

    if (reChildren.length > 0) {
      groups.push({
        key: 'Real Estate Inventory',
        isSection: true,
        children: reChildren
      });
    }

    if (genChildren.length > 0) {
      groups.push({
        key: 'General Inventory',
        isSection: true,
        children: genChildren
      });
    }

    return groups;
  }, [company, activeModules, canAccess, crmSettings]);

  const marketingChildren = [
    { to: '/marketing', key: 'Dashboard' },
    { to: '/marketing/campaigns', key: 'Campaigns' },
    { to: '/marketing/landing-pages', key: 'Landing Pages' },
    { to: '/marketing/meta-integration', key: 'Integrations' },
  ]

  // (Removed unused integrations/operations effects)

  return (
    <aside
      id="app-sidebar"
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`nova-sidebar group fixed inset-y-0 z-[130] md:z-[100] ${uiCollapsed ? 'px-2' : 'px-4'} py-4 ${asideTone} flex flex-col h-full relative ${uiCollapsed ? 'overflow-visible' : 'overflow-x-hidden overflow-y-hidden'} transition-all duration-300 ease-in-out ${uiCollapsed ? 'w-[88px]' : 'w-[280px]'
        } ${isRTL ? 'right-0' : 'left-0'
        } ${uiCollapsed ? '' : (isRTL ? 'border-l' : 'border-r')} ${isOpen ? 'sidebar-open' : ''} ${className || ''}`}
    >
      <button
        type="button"
        aria-label={isRTL ? 'إغلاق القائمة' : 'Close sidebar'}
        onClick={onClose}
        className={`md:hidden absolute top-3 ${isRTL ? 'left-3' : 'right-3'} z-[140] h-10 w-10 grid place-items-center rounded-full border backdrop-blur-sm shadow-lg transition ${isLight ? 'bg-black/10 hover:bg-black/20 border-black/20' : 'bg-white/10 hover:bg-white/20 border-white/20'}`}
      >
        <RiCloseLine className={`${isLight ? 'text-gray-900' : 'text-white'} text-2xl`} />
      </button>

      {/* Styles for collapsed state */}
      {uiCollapsed && (
        <style>{`
          .link-label { display: none !important; }
          .nova-badge { display: none !important; }
          .close-btn span { display: none !important; }
          .sidebar-label { display: none !important; }
          .logo-brand { justify-content: center !important; padding: 0 !important; }
          .nova-sidebar nav a, .nova-sidebar nav button { justify-content: center !important; padding-left: 0 !important; padding-right: 0 !important; }
          .nova-icon { margin: 0 !important; }
        `}</style>
      )}



      {/* Logo and company name */}
      <button
        type="button"
        aria-label={t('Dashboard')}
        onClick={() => {
          if (isSystemArea && isSuperAdmin) {
            navigate('/system/dashboard')
          } else {
            navigate('/dashboard')
          }
        }}
        className={`logo-brand flex items-center gap-2 mb-1 mt-0 cursor-pointer`}
      >
        {/* Replaced Inlined Logo SVG with dynamic logo image */}
        <img src={currentLogo} alt="Be Souhola" className="logo-brand h-15 flex-shrink-0" />

      </button>
      {/* Spacer below brand to push menu down */}
      <div className={`sidebar-brand-spacer h-2 ${uiCollapsed ? 'hidden' : ''}`}></div>

      <nav ref={navRef} className={`flex-1 pt-2 md:pt-3 overflow-y-auto overflow-x-hidden mt-0 pb-3 ${inventoryOpen ? 'inventory-open' : ''}`}>
        {isSystemArea && isSuperAdmin && (
          <div className="w-full mb-3 space-y-1">
            <div className="px-4 py-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-theme sidebar-label">
                {langCode.startsWith('ar') ? 'لوحة تحكم السوبر أدمن' : 'Super Admin Panel'}
              </span>
            </div>

            {(() => {
              const isSystemDashboard = location.pathname === '/system/dashboard'
              const isSystemTenants = location.pathname === '/system/tenants'
              const params = new URLSearchParams(location.search || '')
              const section = params.get('section') || null
              const isTenantOverview = isSystemTenants && !section
              const isTenantSubscriptions = isSystemTenants && section === 'subscriptions'
              const isTenantModules = isSystemTenants && section === 'modules'
              const isTenantAdminSettings = isSystemTenants && section === 'admin-settings'
              const isSystemErrorLog = location.pathname === '/system/error-log'
              const isTransactions = location.pathname === '/inventory/transactions'

              return (
                <>

                  {/* Admin Dashboard */}
                  <NavLink
                    to="/system/dashboard"
                    title={uiCollapsed ? (langCode.startsWith('ar') ? 'لوحة التحكم' : 'Admin Dashboard') : ''}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('impersonateTenantSlug')
                      }
                      onClose()
                    }}
                    className={() => `${baseLink} !py-3 ${isSystemDashboard ? activeLink : ''}`}
                  >
                    <span className="nova-icon-label">
                      <span className={`${iconContainer} ${iconTone}`}>
                        <Table size={18} />
                      </span>
                      <span className="link-label">
                        {langCode.startsWith('ar') ? 'Admin Dashboard' : 'Admin Dashboard'}
                      </span>
                    </span>
                  </NavLink>

                  {/* Tenant Management */}
                  <NavLink
                    to="/system/tenants"
                    title={uiCollapsed ? (langCode.startsWith('ar') ? 'إدارة المستأجرين' : 'Tenant Management') : ''}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('impersonateTenantSlug')
                      }
                      onClose()
                    }}
                    className={() => `${baseLink} !py-3 ${isTenantOverview ? activeLink : ''}`}
                  >
                    <span className="nova-icon-label">
                      <span className={`${iconContainer} ${iconTone}`}>
                        <Users size={18} />
                      </span>
                      <span className="link-label">
                        {langCode.startsWith('ar') ? 'إدارة المستأجرين' : 'Tenant Management'}
                      </span>
                    </span>
                  </NavLink>

                  {/* Separator */}
                  <div className="px-4 py-1">
                    <div className="h-px bg-theme-border/80" />
                  </div>

                  {/* Subscription Plans */}
                  <NavLink
                    to="/system/tenants?section=subscriptions"
                    title={uiCollapsed ? (langCode.startsWith('ar') ? 'خطط الاشتراك' : 'Subscription Plans') : ''}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('impersonateTenantSlug')
                      }
                      onClose()
                    }}
                    className={() => `${baseLink} !py-3 ${isTenantSubscriptions ? activeLink : ''}`}
                  >
                    <span className="nova-icon-label">
                      <span className={`${iconContainer} ${iconTone}`}>
                        <Key size={18} />
                      </span>
                      <span className="link-label">
                        {langCode.startsWith('ar') ? 'خطط الاشتراك' : 'Subscription Plans'}
                      </span>
                    </span>
                  </NavLink>

                  {/* Modules Management */}
                  <NavLink
                    to="/system/tenants?section=modules"
                    title={uiCollapsed ? (langCode.startsWith('ar') ? 'إدارة الموديولات' : 'Modules Management') : ''}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('impersonateTenantSlug')
                      }
                      onClose()
                    }}
                    className={() => `${baseLink} !py-3 ${isTenantModules ? activeLink : ''}`}
                  >
                    <span className="nova-icon-label">
                      <span className={`${iconContainer} ${iconTone}`}>
                        <Settings2 size={18} />
                      </span>
                      <span className="link-label">
                        {langCode.startsWith('ar') ? 'إدارة الموديولات' : 'Modules Management'}
                      </span>
                    </span>
                  </NavLink>

                  <NavLink
                    to="/system/tenants?section=admin-settings"
                    title={uiCollapsed ? (langCode.startsWith('ar') ? 'إعدادات الإدارة' : 'Administration Settings') : ''}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('impersonateTenantSlug')
                      }
                      onClose()
                    }}
                    className={() => `${baseLink} !py-3 ${isTenantAdminSettings ? activeLink : ''}`}
                  >
                    <span className="nova-icon-label">
                      <span className={`${iconContainer} ${iconTone}`}>
                        <Settings size={18} />
                      </span>
                      <span className="link-label">
                        {langCode.startsWith('ar') ? 'إعدادات الإدارة' : 'Administration Settings'}
                      </span>
                    </span>
                  </NavLink>

                  <NavLink
                    to="/system/integrations"
                    title={uiCollapsed ? (langCode.startsWith('ar') ? 'الربط العالمي' : 'Global Integrations') : ''}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('impersonateTenantSlug')
                      }
                      onClose()
                    }}
                    className={() => `${baseLink} !py-3 ${location.pathname === '/system/integrations' ? activeLink : ''}`}
                  >
                    <span className="nova-icon-label">
                      <span className={`${iconContainer} ${iconTone}`}>
                        <Share2 size={18} />
                      </span>
                      <span className="link-label">
                        {langCode.startsWith('ar') ? 'الربط العالمي' : 'Global Integrations'}
                      </span>
                    </span>
                  </NavLink>

                  {/* Separator */}
                  <div className="px-4 py-1">
                    <div className="h-px bg-theme-border/80" />
                  </div>

                  <NavLink
                    to="/system/error-log"
                    title={uiCollapsed ? (langCode.startsWith('ar') ? 'سجل الأخطاء' : 'Error Log') : ''}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('impersonateTenantSlug')
                      }
                      onClose()
                    }}
                    className={() => `${baseLink} !py-3 ${isSystemErrorLog ? activeLink : ''}`}
                  >
                    <span className="nova-icon-label">
                      <span className={`${iconContainer} ${iconTone}`}>
                        <Server size={18} />
                      </span>
                      <span className="link-label">
                        {langCode.startsWith('ar') ? 'سجل الأخطاء' : 'Error Log'}
                      </span>
                    </span>
                  </NavLink>

                  <NavLink
                    to="/system/backup"
                    title={uiCollapsed ? (langCode.startsWith('ar') ? 'النسخة الاحتياطية' : 'Backup') : ''}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('impersonateTenantSlug')
                      }
                      onClose()
                    }}
                    className={() => `${baseLink} !py-3 ${location.pathname === '/system/backup' ? activeLink : ''}`}
                  >
                    <span className="nova-icon-label">
                      <span className={`${iconContainer} ${iconTone}`}>
                        <Database size={18} />
                      </span>
                      <span className="link-label">
                        {langCode.startsWith('ar') ? 'النسخة الاحتياطية' : 'Backup'}
                      </span>
                    </span>
                  </NavLink>

                  {/* Transactions */}
                  <NavLink
                    to="/inventory/transactions"
                    title={uiCollapsed ? (langCode.startsWith('ar') ? 'المعاملات المالية' : 'Transactions') : ''}
                    onClick={onClose}
                    className={() => `${baseLink} !py-3 ${isTransactions ? activeLink : ''}`}
                  >
                    <span className="nova-icon-label">
                      <span className={`${iconContainer} ${iconTone}`}>
                        <Table size={18} />
                      </span>
                      <span className="link-label">
                        {langCode.startsWith('ar') ? 'المعاملات المالية' : 'Transactions'}
                      </span>
                    </span>
                  </NavLink>
                </>
              )
            })()}
          </div>
        )}
        {!isSystemArea && !isSuperAdmin && !isSectionViewOpen && !isMarketingActive && (
          <NavLink
            to="/dashboard"
            title={uiCollapsed ? t('Dashboard') : ''}
            onClick={onClose}
            className={({ isActive }) => `${baseLink} !py-4 ${isActive ? activeLink : ''}`}
          >
            <span className="nova-icon-label">
              <span className={`${iconContainer} ${iconTone}`}>
                {getIcon('Dashboard')}
              </span>
              <span className="link-label">{t('Dashboard')}</span>
            </span>
          </NavLink>
        )}

        {/* Lead Management (gated by activeModules) */}
        {!isSystemArea && !isSuperAdmin && !isMarketingActive && (!isSectionViewOpen || leadMgmtOpen) && canAccess('leads') && (
          <div className="w-full">
            {leadMgmtOpen && (
              <div className={`sticky top-0 z-10 section-header flex items-center mb-2 ${isLight ? 'bg-theme-sidebar' : 'bg-gray-900'} px-2 py-1`}>
                <span className="text-sm font-bold link-label">{t('Lead Management')}</span>
                <button type="button" onClick={() => setLeadMgmtOpen(false)} className={`close-btn text-sm font-semibold ${isLight ? 'text-theme-text hover:text-gray-900' : 'text-gray-200 hover:text-white'} flex items-center gap-2`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  <span>{backLabel}</span>
                </button>
              </div>
            )}
            {!leadMgmtOpen && (
              <NavLink
                to="/leads"
                title={uiCollapsed ? t('Lead Management') : ''}
                end
                onClick={() => { setLeadMgmtOpen(true); onClose(); }}
                className={() => `${baseLink} w-full justify-between`}
              >
                <span className="nova-icon-label">
                  <span className={`${iconContainer} ${iconTone}`}>{getIcon('Lead Management')}</span>
                  <span className="link-label text-[16px]">{t('Lead Management')}</span>
                </span>
                <span className={`link-label ${isLight ? 'text-theme-text' : 'text-gray-400'} transition-transform`} style={{ transform: leadMgmtOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </NavLink>
            )}

            <div
              className={`${isRTL ? 'mr-0 pr-0 border-r' : 'ml-0 pl-0 border-l'} border-theme-border dark:border-gray-700 space-y-0.5 transition-all`}
              style={{ maxHeight: leadMgmtOpen ? '800px' : '0', overflow: 'hidden', opacity: leadMgmtOpen ? 1 : 0 }}
            >
              <NavLink
                to="/leads"
                end
                title={isCollapsed ? t('All Leads') : ''}
                onClick={onClose}
                className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-0' : '!pl-0'} ${isActive ? activeLink : ''}`}
              >
                <span className="nova-icon-label">
                  <span className={`${iconContainer} ${iconTone}`}>{getIcon('All Leads')}</span>
                  <span className="text-[15px] link-label">{t('All Leads')}</span>
                </span>
              </NavLink>
              {canSeeMyLeadsLink && (
                <NavLink
                  to="/leads/my-leads"
                  title={isCollapsed ? t('My Leads') : ''}
                  onClick={onClose}
                  className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-0' : '!pl-0'} ${isActive ? activeLink : ''}`}
                >
                  <span className="nova-icon-label">
                    <span className={`${iconContainer} ${iconTone}`}>{getIcon('My Leads')}</span>
                    <span className="text-[15px] link-label">{t('My Leads')}</span>
                  </span>
                </NavLink>
              )}
              <NavLink
                to="/leads/referral"
                title={isCollapsed ? t('Referral Leads') : ''}
                onClick={onClose}
                className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-0' : '!pl-0'} ${isActive ? activeLink : ''}`}
              >
                <span className="nova-icon-label">
                  <span className={`${iconContainer} ${iconTone}`}>{getIcon('Referral Leads')}</span>
                  <span className="text-[15px] link-label">{i18n.language === 'ar' ? 'إحالات' : t('Referral Leads')}</span>
                </span>
              </NavLink>
              <NavLink
                to="/leads/new"
                title={isCollapsed ? t('Add New Lead') : ''}
                onClick={onClose}
                className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-0' : '!pl-0'} ${isActive ? activeLink : ''}`}
              >
                <span className="nova-icon-label">
                  <span className={`${iconContainer} ${iconTone}`}>{getIcon('Add New Lead')}</span>
                  <span className="text-[15px] link-label">{t('Add New Lead')}</span>
                </span>
              </NavLink>
              {canSeeRecycleBin && (
                <NavLink
                  to="/recycle"
                  title={isCollapsed ? t('Recycle Bin') : ''}
                  onClick={onClose}
                  className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-0' : '!pl-0'} ${isActive ? activeLink : ''}`}
                >
                  <span className="nova-icon-label">
                    <span className={`${iconContainer} ${iconTone}`}>{getIcon('Recycle Bin')}</span>
                    <span className="text-[15px] link-label">{t('Recycle Bin')}</span>
                  </span>
                </NavLink>
              )}

              <div className={`${isRTL ? '!pr-0' : '!pl-0'}`}>
                <button
                  type="button"
                  title={isCollapsed ? t('Stages') : ''}
                  onClick={() => setStagesOpen(v => !v)}
                  className={`${baseLink} w-full justify-between ${isRTL ? '!pr-0' : '!pl-0'}`}
                >
                  <span className="nova-icon-label">
                    <span className={`${iconContainer} ${iconTone}`}>🗂️</span>
                    <span className="text-[15px] link-label">{t('Stages')}</span>
                  </span>
                  <span className={`link-label ${isLight ? 'text-theme-text' : 'text-gray-400'} transition-transform`} style={{ transform: stagesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>
                <div className="space-y-0.5" style={{ maxHeight: stagesOpen ? '600px' : '0', overflow: 'hidden', opacity: stagesOpen ? 1 : 0 }}>
                  {(() => {
                    // Hide duplicate and pending from Sales Person
                    const fixedStages = [
                      { key: 'new lead', icon: '🆕' },
                      ...(!isSalesPerson ? [{ key: 'duplicate', icon: '🔄' }] : []),
                      ...(!isSalesPerson ? [{ key: 'pending', icon: '⏳' }] : []),
                      ...(crmSettings?.showColdCallsStage === false ? [] : [{ key: 'cold calls', icon: '📞' }]),
                    ]
                    const staticKeys = fixedStages.map(s => s.key.toLowerCase())
                    const dynamicStages = _safeStages
                      .filter(s => {
                        const name = String(s.name || '').toLowerCase()
                        const nameNorm = name.replace(/\s+/g, '').replace(/-/g, '')
                        const isFollow = nameNorm === 'followup' || String(s.nameAr || '').toLowerCase().includes('متابعة')
                        const overlapsStatic = staticKeys.some(sk => name.includes(sk) || sk.includes(name))
                        return !isFollow && !overlapsStatic
                      })
                      .map(s => ({ key: s.name, icon: s.icon || 'BarChart2', iconUrl: s.iconUrl }))
                    const list = [...fixedStages, ...dynamicStages]
                    return list.map((s, idx) => {
                    const targetBase = location.pathname.startsWith('/recycle') ? '/recycle' : '/leads'
                    const toUrl = `${targetBase}?stage=${encodeURIComponent(s.key)}`
                    const isActiveStage = currentStageParam === s.key
                    const highlight = isActiveStage ? `glass-neon border ${isLight ? 'border-blue-200' : 'border-blue-900'}` : ''
                    
                    let IconComponent = null
                    if (s.icon && ICON_MAP[s.icon]) {
                      IconComponent = ICON_MAP[s.icon]
                    }

                      return (
                      <NavLink
                        key={`fixed-stage-${idx}-${s.key}`}
                        to={toUrl}
                        title={isCollapsed ? t(s.key) : ''}
                        onClick={onClose}
                        className={() => `${baseLink} ${isRTL ? '!pr-10' : '!pl-10'} ${highlight}`}
                      >
                        <span className="nova-icon-label">
                          <span className={`${iconContainer} ${iconTone}`}>
                            {s.iconUrl ? (
                              <img src={s.iconUrl} alt={s.key} className="w-5 h-5 object-contain" />
                            ) : (
                              IconComponent ? <IconComponent size={18} /> : s.icon
                            )}
                          </span>
                          <span className="text-[15px] link-label">{t(s.key)}</span>
                        </span>
                      </NavLink>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory section with full-view submenu */}
        {!isSystemArea && !isSuperAdmin && !isMarketingActive && (!isSectionViewOpen || inventoryOpen) && ['items', 'orders', 'projects', 'properties', 'developers', 'brokers', 'requests'].some(key => canAccess(key)) && (
          <div className="w-full">
            {inventoryOpen ? (
              <div className={`sticky top-0 z-10 section-header flex items-center mb-2 ${isLight ? 'bg-gray-100' : 'bg-gray-900'} px-2 py-1`}>
                <span className="text-sm font-bold link-label text-[16px]">{t('Inventory')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setInventoryOpen(false)
                    setCustomersOpen(false)
                    setSettingsOpen(false)
                  }}
                  className={`close-btn text-sm font-semibold ${isLight ? 'text-theme-text hover:text-gray-900' : 'text-gray-200 hover:text-white'} flex items-center gap-2`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  <span>{backLabel}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                title={isCollapsed ? t('Inventory') : ''}
                onClick={() => {
                  setInventoryOpen(true)
                  setCustomersOpen(false)
                  setSettingsOpen(false)
                }}
                className={`${baseLink} w-full justify-between ${isInventoryActive ? 'active-parent' : ''}`}
                aria-expanded={inventoryOpen}
              >
                <span className="nova-icon-label">
                  <span className={`${iconContainer} ${iconTone}`}>{getIcon('Inventory')}</span>
                  <span className="link-label text-[16px]">{t('Inventory')}</span>
                </span>
                <span className={`link-label ${isLight ? 'text-theme-text' : 'text-gray-400'} transition-transform`} style={{ transform: inventoryOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
            )}

            <div
              className={`${isRTL ? 'mr-0 pr-0 border-r' : 'ml-0 pl-0 border-l'} border-theme-border dark:border-gray-700 space-y-0.5 transition-all`}
              style={{ maxHeight: inventoryOpen ? '1000px' : '0', overflow: 'hidden', opacity: inventoryOpen ? 1 : 0 }}
            >
              {/** extra indent for all sub items */}
              {/** note: keeping baseLink styles while adding side-specific padding */}
              {/** subLinkIndent applied below per direction */}
              {inventoryChildren.map(child => {
                if (child.isSection) {
                  return (
                    <div key={child.key} className="mt-2 mb-1">
                      <div className={`px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t(child.key)}
                      </div>
                      {child.children.map(subChild => {
                        const badgeCount = subChild.module && inventoryBadges && Number(inventoryBadges[subChild.module]) > 0
                          ? Number(inventoryBadges[subChild.module])
                          : 0;
                        return (
                          <NavLink
                            key={subChild.to}
                            to={subChild.to}
                            title={isCollapsed ? t(subChild.key) : ''}
                            onClick={onClose}
                            className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-4' : '!pl-4'} ${isActive ? activeLink : ''}`}
                          >
                            <span className="nova-icon-label">
                              <span className={`${iconContainer} ${iconTone}`}>
                                {getInventoryItemIcon(subChild.key)}
                              </span>
                              <span className="flex-1 flex items-center justify-between text-[15px] link-label">
                                <span>{t(subChild.key)}</span>
                                {badgeCount > 0 && (
                                  <span className="nova-badge ml-2 text-xs">{badgeCount}</span>
                                )}
                              </span>
                            </span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )
                }
                const badgeCount = child.module && inventoryBadges && Number(inventoryBadges[child.module]) > 0
                  ? Number(inventoryBadges[child.module])
                  : 0;
                return (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    title={isCollapsed ? t(child.key) : ''}
                    onClick={onClose}
                    className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-0' : '!pl-0'} ${isActive ? activeLink : ''}`}
                  >
                    <span className="nova-icon-label">
                      <span className={`${iconContainer} ${iconTone}`}>
                        {getInventoryItemIcon(child.key)}
                      </span>
                      <span className="flex-1 flex items-center justify-between text-[15px] link-label">
                        <span>{t(child.key)}</span>
                        {badgeCount > 0 && (
                          <span className="nova-badge ml-2 text-xs">{badgeCount}</span>
                        )}
                      </span>
                    </span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        )}

        {/* Marketing section with subsections (gated by activeModules + role) */}
        {!isSystemArea && !isSuperAdmin && canSeeMarketingModules && (!isSectionViewOpen || marketingOpen) && canAccess('campaigns') && (
          <div className="w-full">
            {(isMarketingActive || marketingOpen) && (
              <div className={`sticky top-0 z-10 section-header flex items-center mb-2 ${isLight ? 'bg-theme-sidebar' : 'bg-gray-900'} px-2 py-1`}>
                <span className="text-sm font-bold link-label">{t('Marketing Modules')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMarketingOpen(false);
                    try { if (typeof window !== 'undefined' && window.localStorage) { window.localStorage.setItem('marketingOpen', 'false') } } catch { }
                    try {
                      navigate('/dashboard')
                    } catch { }
                  }}
                  className={`close-btn text-sm font-semibold ${isLight ? 'text-theme-text hover:text-gray-900' : 'text-gray-200 hover:text-white'} flex items-center gap-2`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  <span>{backLabel}</span>
                </button>
              </div>
            )}
            {!marketingOpen && (
              <button
                type="button"
                title={isCollapsed ? t('Marketing Modules') : ''}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMarketingOpen(v => {
                    const next = !v;
                    try { if (typeof window !== 'undefined' && window.localStorage) { window.localStorage.setItem('marketingOpen', String(next)); } } catch { }
                    return next;
                  })
                }}
                className={`${baseLink} w-full justify-between ${isMarketingActive ? 'active-parent' : ''}`}
                aria-expanded={marketingOpen}
              >
                <span className="nova-icon-label min-w-0">
                  <span className={`${iconContainer} ${iconTone}`}>{getIcon('Marketing Modules')}</span>
                  <span className="text-[15px] link-label whitespace-nowrap truncate">{t('Marketing Modules')}</span>
                </span>
                <span className={`link-label ${isLight ? 'text-theme-text' : 'text-gray-400'} transition-transform`} style={{ transform: marketingOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
            )}

            <div
              className={`${isRTL ? 'mr-0 pr-0 border-r' : 'ml-0 pl-0 border-l'} border-theme-border dark:border-gray-700 space-y-0.5 transition-all`}
              style={{ maxHeight: marketingOpen ? '1500px' : '0', overflow: 'hidden', opacity: marketingOpen ? 1 : 0 }}
            >
              {marketingChildren.map(child => (
                <NavLink
                  key={child.to}
                  to={child.to}
                  end={child.to === '/marketing'}
                  title={isCollapsed ? t(child.key) : ''}
                  onClick={onClose}
                  className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-10' : '!pl-10'} ${isActive ? activeLink : ''}`}
                >
                  <span className="nova-icon-label">
                    <span className={`${iconContainer} ${iconTone}`}>
                      {getMarketingItemIcon(child.key)}
                    </span>
                    <span className="text-[15px] link-label">{t(child.key)}</span>
                  </span>
                </NavLink>
              ))}


            </div>
          </div>
        )}

        {/* Customers section with full-view submenu (gated by activeModules) */}
        {!isSystemArea && !isSuperAdmin && !isMarketingActive && (!isSectionViewOpen || customersOpen) && canAccess('customers') && (
          <div className="w-full">
            {customersOpen ? (
              <div className={`sticky top-0 z-10 section-header flex items-center mb-2 ${isLight ? 'bg-theme-sidebar' : 'bg-gray-900'} px-2 py-1`}>
                <span className="text-sm font-bold link-label">{t('Customers')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomersOpen(false)
                    setInventoryOpen(false)
                    setSettingsOpen(false)
                  }}
                  className={`close-btn text-sm font-semibold ${isLight ? 'text-theme-text hover:text-gray-900' : 'text-gray-200 hover:text-white'} flex items-center gap-2`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  <span>{backLabel}</span>
                </button>
              </div>
            ) : (
              <NavLink
                to="/customers"
                title={isCollapsed ? t('Customers') : ''}
                onClick={() => {
                  setCustomersOpen(true)
                  setInventoryOpen(false)
                  setSettingsOpen(false)
                  onClose()
                }}
                className={({ isActive }) => `${baseLink} w-full justify-between ${isActive ? `glass-neon border ${isLight ? 'border-blue-200' : 'border-blue-900'} active-parent` : ''}`}
              >
                <span className="nova-icon-label">
                  <span className={`${iconContainer} ${iconTone}`}>{getIcon('Customers')}</span>
                  <span className="link-label">{t('Customers')}</span>
                </span>
                <span className="ml-auto nova-badge link-label">12</span>
                <span className={`link-label ${isLight ? 'text-theme-text' : 'text-gray-400'} transition-transform`} style={{ transform: customersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </NavLink>
            )}
            <div
              className={`${isRTL ? 'mr-0 pr-0 border-r' : 'ml-0 pl-0 border-l'} border-theme-border dark:border-gray-700 space-y-0.5 transition-all glass-neon`}
              style={{ maxHeight: customersOpen ? '800px' : '0', overflow: 'hidden', opacity: customersOpen ? 1 : 0 }}
            >
              <NavLink
                to="/customers"
                title={isCollapsed ? t('Customers') : ''}
                onClick={onClose}
                className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-0' : '!pl-0'} ${isActive ? activeLink : ''}`}
              >
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>{getIcon('Customers')}</span><span className="text-[15px] link-label">{t('Customers')}</span></span>
              </NavLink>
              {/* Sales workflow pages under Customers (Sales Customers removed per request) */}
              <NavLink
                to="/sales/quotations"
                title={isCollapsed ? t('Quotations') : ''}
                onClick={onClose}
                className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-0' : '!pl-0'} ${isActive ? activeLink : ''}`}
              >
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>🧾</span><span className="text-[15px] link-label">{t('Quotations')}</span></span>
              </NavLink>
              <NavLink
                to="/sales/orders"
                title={isCollapsed ? t('Sales Orders') : ''}
                onClick={onClose}
                className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-0' : '!pl-0'} ${isActive ? activeLink : ''}`}
              >
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>📦</span><span className="text-[15px] link-label">{t('Sales Orders')}</span></span>
              </NavLink>
              <NavLink
                to="/sales/invoices"
                title={isCollapsed ? t('Invoices') : ''}
                onClick={onClose}
                className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-0' : '!pl-0'} ${isActive ? activeLink : ''}`}
              >
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>💳</span><span className="text-[15px] link-label">{t('Invoices')}</span></span>
              </NavLink>
              {/* Customer Tickets removed per request */}
            </div>
          </div>
        )}

        {/* Support section (gated by activeModules) */}
        {!isSystemArea && !isSuperAdmin && !isMarketingActive && (!isSectionViewOpen || supportOpen) && canAccess('support') && (
          <div className="w-full">
            {supportOpen && (
              <div className={`${isLight ? 'bg-theme-sidebar' : 'bg-gray-900'} sticky top-0 z-10 section-header flex items-center mb-2 px-2 py-1`}>
                <span className="text-sm font-bold link-label">{t('Support')}</span>
                <button type="button" onClick={() => setSupportOpen(false)} className={`close-btn text-sm font-semibold ${isLight ? 'text-theme-text hover:text-gray-900' : 'text-gray-200 hover:text-white'} flex items-center gap-2`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
                  <span>{backLabel}</span>
                </button>
              </div>
            )}
            {!supportOpen && (
              <button type="button" title={isCollapsed ? t('Support') : ''} onClick={() => { setSupportOpen(true); setLeadMgmtOpen(false); setInventoryOpen(false); setMarketingOpen(false); setCustomersOpen(false); setUsersOpen(false); setSettingsOpen(false); }} className={`${baseLink} w-full justify-between ${isSupportActive ? 'active-parent' : ''}`} aria-expanded={supportOpen}>
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>{getIcon('Support')}</span><span className="link-label">{t('Support')}</span></span>
                <span className={`link-label ${isLight ? 'text-theme-text' : 'text-gray-400'} transition-transform`} style={{ transform: supportOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </button>
            )}
            <div className={`${isRTL ? 'mr-0 pr-0 border-r' : 'ml-0 pl-0 border-l'} border-theme-border dark:border-gray-700 space-y-0.5 transition-all`} style={{ maxHeight: supportOpen ? '800px' : '0', overflow: 'hidden', opacity: supportOpen ? 1 : 0 }}>
              <NavLink to="/support" end title={isCollapsed ? t('Dashboard') : ''} onClick={onClose} className={({ isActive }) => `${baseLink} !py-3 ${isRTL ? '!pr-10' : '!pl-10'} ${isActive ? activeLink : ''}`}>
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>🛟</span><span className="text-[15px] link-label">{t('Dashboard')}</span></span>
              </NavLink>
              <NavLink to="/support/tickets" title={isCollapsed ? t('Tickets') : ''} onClick={onClose} className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-10' : '!pl-10'} ${isActive ? activeLink : ''}`}>
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>🎫</span><span className="text-[15px] link-label">{t('Tickets')}</span></span>
              </NavLink>
              <NavLink to="/support/customers" title={isCollapsed ? t('Customers') : ''} onClick={onClose} className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-10' : '!pl-10'} ${isActive ? activeLink : ''}`}>
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>👥</span><span className="text-[15px] link-label">{t('Customers')}</span></span>
              </NavLink>
              <NavLink to="/support/sla" title={isCollapsed ? t('SLA') : ''} onClick={onClose} className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-10' : '!pl-10'} ${isActive ? activeLink : ''}`}>
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>⏱️</span><span className="text-[15px] link-label">{t('SLA')}</span></span>
              </NavLink>
              <NavLink to="/support/reports" title={isCollapsed ? t('Reports') : ''} onClick={onClose} className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-10' : '!pl-10'} ${isActive ? activeLink : ''}`}>
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>📊</span><span className="text-[15px] link-label">{t('Reports')}</span></span>
              </NavLink>
              <NavLink to="/support/feedbacks" title={isCollapsed ? t('Feedbacks') : ''} onClick={onClose} className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-10' : '!pl-10'} ${isActive ? activeLink : ''}`}>
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>⭐</span><span className="text-[15px] link-label">{t('Feedbacks')}</span></span>
              </NavLink>
            </div>
          </div>
        )}

        {/* Reports section - Single Link */}
        {canSeeReportsLink && !isSystemArea && !isSuperAdmin && !isMarketingActive && !isSectionViewOpen && (
          <NavLink
            to="/reports"
            title={isCollapsed ? t('Reports') : ''}
            onClick={onClose}
            className={({ isActive }) => `${baseLink} !py-4 ${isActive ? activeLink : ''}`}
          >
            <span className="nova-icon-label">
              <span className={`${iconContainer} ${iconTone}`}>{getIcon('Reports')}</span>
              <span className="link-label">{t('Reports')}</span>
            </span>
          </NavLink>
        )}

        {/* User Management section with full-view submenu (same style as Inventory/Marketing) */}
        {canViewUserManagementSection && !isSystemArea && !isSuperAdmin && !isMarketingActive && (!isSectionViewOpen || usersOpen) && (
          <div className="w-full">
            {usersOpen ? (
              <div className={`sticky top-0 z-10 section-header flex items-center mb-2 ${isLight ? 'bg-theme-sidebar' : 'bg-gray-900'} px-2 py-1`}>
                <span className="text-sm font-bold link-label">{t('User Management')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setUsersOpen(false)
                    setLeadMgmtOpen(false)
                    setInventoryOpen(false)
                    setMarketingOpen(false)
                    setCustomersOpen(false)
                    setSettingsOpen(false)
                  }}
                  className={`close-btn text-sm font-semibold ${isLight ? 'text-theme-text hover:text-gray-900' : 'text-gray-200 hover:text-white'} flex items-center gap-2`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  <span>{backLabel}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                title={isCollapsed ? t('User Management') : ''}
                onClick={() => {
                  setUsersOpen(true)
                  setLeadMgmtOpen(false)
                  setInventoryOpen(false)
                  setMarketingOpen(false)
                  setCustomersOpen(false)
                  setSettingsOpen(false)
                }}
                className={`${baseLink} w-full justify-between ${isUsersActive ? 'active-parent' : ''}`}
                aria-expanded={usersOpen}
              >
                <span className="nova-icon-label">
                  <span className={`${iconContainer} ${iconTone}`}>{getIcon('User Management')}</span>
                  <span className="link-label">{t('User Management')}</span>
                </span>
                <span className={`link-label ${isLight ? 'text-gray-500' : 'text-gray-400'} transition-transform`} style={{ transform: usersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
            )}
            <div
              className={`${isRTL ? 'mr-0 pr-0 border-r' : 'ml-0 pl-0 border-l'} border-gray-300 dark:border-gray-700 space-y-0.5 transition-all`}
              style={{ maxHeight: usersOpen ? '480px' : '0', overflow: 'hidden', opacity: usersOpen ? 1 : 0 }}
            >
              <NavLink
                to="/user-management/users"
                title={isCollapsed ? t('Users') : ''}
                onClick={onClose}
                className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-10' : '!pl-10'} ${isActive ? activeLink : ''}`}
              >
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>👥</span><span className="text-[15px] link-label">{t('Users')}</span></span>
              </NavLink>
              <NavLink
                to="/user-management/departments"
                title={isCollapsed ? t('Departments') : ''}
                onClick={onClose}
                className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-10' : '!pl-10'} ${isActive ? activeLink : ''}`}
              >
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>🏢</span><span className="text-[15px] link-label">{t('Departments')}</span></span>
              </NavLink>
              <NavLink
                to="/user-management/activity-logs"
                title={isCollapsed ? t('Activity Logs') : ''}
                onClick={onClose}
                className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-10' : '!pl-10'} ${isActive ? activeLink : ''}`}
              >
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>📝</span><span className="text-[15px] link-label">{t('Activity Logs')}</span></span>
              </NavLink>
              <NavLink
                to="/user-management/access-logs"
                title={isCollapsed ? t('Access Logs') : ''}
                onClick={onClose}
                className={({ isActive }) => `${baseLink} ${isRTL ? '!pr-10' : '!pl-10'} ${isActive ? activeLink : ''}`}
              >
                <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}>🔐</span><span className="text-[15px] link-label">{t('Access Logs')}</span></span>
              </NavLink>
            </div>
          </div>
        )}




        {/* Settings Section - Expanded View */}
        {!isSystemArea && !isSuperAdmin && !isMarketingActive && (!isSectionViewOpen || settingsOpen) && canAccess('settings') && (
          <div className="w-full">
            {settingsOpen && (
              <div className={`sticky top-0 z-10 section-header flex items-center mb-2 ${isLight ? 'bg-theme-sidebar' : 'bg-gray-900'} px-2 py-1`}>
                <span className="text-sm font-bold link-label">{t('Settings')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    setInventoryOpen(false)
                    setCustomersOpen(false)
                    setUsersOpen(false)
                    setMarketingOpen(false)
                    setLeadMgmtOpen(false)
                  }}
                  className={`close-btn text-sm font-semibold ${isLight ? 'text-theme-text hover:text-gray-900' : 'text-gray-200 hover:text-white'} flex items-center gap-2`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  <span>{backLabel}</span>
                </button>
              </div>
            )}

            {settingsOpen && (
              <div className={`${isRTL ? 'mr-0 pr-0 border-r' : 'ml-0 pl-0 border-l'} border-theme-border dark:border-gray-700 space-y-0.5 transition-all`}>

                {/* Profile & Company */}
                <div className="border-b border-theme-border dark:border-gray-800 pb-1">
                  <button
                    type="button"
                    onClick={() => handleAccordionToggle('profileCompany')}
                    className={`${baseLink} w-full justify-between`}
                  >
                    <span className="nova-icon-label">
                      <span className={`${iconContainer} ${iconTone}`}>👤</span>
                      <span className="link-label">{t('Profile & Company')}</span>
                    </span>
                    <span className={`link-label transition-transform ${profileCompanyOpen ? 'rotate-180' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </span>
                  </button>
                  {profileCompanyOpen && (
                    <div className={`space-y-0.5 ${isRTL ? 'pr-4' : 'pl-4'}`}>
                      <NavLink to="/settings/profile" end onClick={onClose} title={isCollapsed ? t('My Profile') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                        <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><User size={18} /></span><span className="text-[14px] link-label">{t('My Profile')}</span></span>
                      </NavLink>
                      {canViewCompanyDetails && (
                        <NavLink to="/settings/profile/company" onClick={onClose} title={isCollapsed ? t('Company Details') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                          <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Building2 size={18} /></span><span className="text-[14px] link-label">{t('Company Details')}</span></span>
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>

                {/* Company Setup */}
                {canViewCompanySetupSection && (
                  <div className="border-b border-theme-border dark:border-gray-800 pb-1">
                    <button
                      type="button"
                      onClick={() => handleAccordionToggle('companySetup')}
                      title={isCollapsed ? t('Company Setup') : ''}
                      className={`${baseLink} w-full justify-between`}
                    >
                      <span className="nova-icon-label">
                        <span className={`${iconContainer} ${iconTone}`}><Building size={18} /></span>
                        <span className="link-label">{t('Company Setup')}</span>
                      </span>
                      <span className={`link-label transition-transform ${companySetupOpen ? 'rotate-180' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </span>
                    </button>
                    {companySetupOpen && (
                      <div className={`space-y-0.5 ${isRTL ? 'pr-4' : 'pl-4'}`}>
                        <NavLink to="/system/tenants" onClick={onClose} title={isCollapsed ? t('Tenant Setup') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                          <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Building size={18} /></span><span className="text-[14px] link-label">{t('Tenant Setup')}</span></span>
                        </NavLink>
                      </div>
                    )}
                  </div>
                )}

                {/* System Settings (Restored) */}
                {canViewSystemSettingsSection && (
                  <div className="border-b border-theme-border dark:border-gray-800 pb-1">
                    <button
                      type="button"
                      onClick={() => handleAccordionToggle('systemSettings')}
                      title={isCollapsed ? t('System Settings') : ''}
                      className={`${baseLink} w-full justify-between`}
                    >
                      <span className="nova-icon-label">
                        <span className={`${iconContainer} ${iconTone}`}><Settings size={18} /></span>
                        <span className="link-label">{t('System Settings')}</span>
                      </span>
                      <span className={`link-label transition-transform ${systemSettingsOpen ? 'rotate-180' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </span>
                    </button>
                    {systemSettingsOpen && (
                      <div className={`space-y-0.5 ${isRTL ? 'pr-4' : 'pl-4'}`}>
                        {canViewPipelineStages && (
                          <NavLink to="/stages-setup" onClick={onClose} title={isCollapsed ? t('Pipeline Stages Setup') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                            <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Kanban size={18} /></span><span className="text-[14px] link-label">{t('Pipeline Stages Setup')}</span></span>
                          </NavLink>
                        )}
                        {canViewCancelReasons && (
                          <NavLink to="/cancel-reasons" onClick={onClose} title={isCollapsed ? t('Cancel Reasons') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                            <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><XCircle size={18} /></span><span className="text-[14px] link-label">{t('Cancel Reasons')}</span></span>
                          </NavLink>
                        )}
                        {canViewCrmSettings && (
                          <NavLink to="/settings/system/crm" onClick={onClose} title={isCollapsed ? t('CRM Settings') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                            <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Settings2 size={18} /></span><span className="text-[14px] link-label">{t('CRM Settings')}</span></span>
                          </NavLink>
                        )}
                        {canViewSourcesSettings && (
                          <NavLink to="/settings/system/sources" onClick={onClose} title={isCollapsed ? t('Sources') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                            <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Share2 size={18} /></span><span className="text-[14px] link-label">{t('Sources')}</span></span>
                          </NavLink>
                        )}
                        {/* Locations Submenu */}
                        {canViewLocationsSettings && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setLocationsOpen(!locationsOpen)}
                              title={isCollapsed ? t('Locations') : ''}
                              className={`${baseLink} w-full justify-between`}
                            >
                              <span className="nova-icon-label">
                                <span className={`${iconContainer} ${iconTone}`}><MapPin size={18} /></span>
                                <span className="text-[14px] link-label">{t('Locations')}</span>
                              </span>
                              <span className={`link-label transition-transform ${locationsOpen ? 'rotate-180' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                              </span>
                            </button>
                            {locationsOpen && (
                              <div className={`space-y-0.5 ${isRTL ? 'pr-4' : 'pl-4'} mt-1`}>
                                <NavLink to="/settings/system/locations/country" onClick={onClose} title={isCollapsed ? t('Country') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                                  <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><MapPin size={18} /></span><span className="text-[13px] link-label">{t('Country')}</span></span>
                                </NavLink>
                                <NavLink to="/settings/system/locations/cities" onClick={onClose} title={isCollapsed ? t('Cities') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                                  <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Flag size={18} /></span><span className="text-[13px] link-label">{t('Cities')}</span></span>
                                </NavLink>
                                <NavLink to="/settings/system/locations/regions" onClick={onClose} title={isCollapsed ? t('Regions') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                                  <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Building size={18} /></span><span className="text-[13px] link-label">{t('Regions')}</span></span>
                                </NavLink>
                                <NavLink to="/settings/system/locations/area" onClick={onClose} title={isCollapsed ? t('Area') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                                  <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Map size={18} /></span><span className="text-[13px] link-label">{t('Area')}</span></span>
                                </NavLink>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Form Inputs Submenu */}
                        {canViewFormInputsSettings && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setFormInputsOpen(!formInputsOpen)}
                              title={isCollapsed ? t('Form Inputs') : ''}
                              className={`${baseLink} w-full justify-between`}
                            >
                              <span className="nova-icon-label">
                                <span className={`${iconContainer} ${iconTone}`}><FormInput size={18} /></span>
                                <span className="text-[14px] link-label">{t('Form Inputs')}</span>
                              </span>
                              <span className={`link-label transition-transform ${formInputsOpen ? 'rotate-180' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                              </span>
                            </button>
                            {formInputsOpen && (
                              <div className={`space-y-0.5 ${isRTL ? 'pr-4' : 'pl-4'} mt-1`}>
                                <NavLink to="/settings/system/form-inputs/leads" onClick={onClose} title={isCollapsed ? t('Lead Inputs') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                                  <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><FormInput size={18} /></span><span className="text-[13px] link-label">{t('Lead Inputs')}</span></span>
                                </NavLink>
                                <NavLink to="/settings/system/form-inputs/customers" onClick={onClose} title={isCollapsed ? t('Customer Inputs') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                                  <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><UserPlus size={18} /></span><span className="text-[13px] link-label">{t('Customer Inputs')}</span></span>
                                </NavLink>
                                <NavLink to="/settings/system/form-inputs/items" onClick={onClose} title={isCollapsed ? t('Item Inputs') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                                  <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Box size={18} /></span><span className="text-[13px] link-label">{t('Item Inputs')}</span></span>
                                </NavLink>
                                <NavLink to="/settings/system/form-inputs/properties" onClick={onClose} title={isCollapsed ? t('Property Inputs') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                                  <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Home size={18} /></span><span className="text-[13px] link-label">{t('Property Inputs')}</span></span>
                                </NavLink>
                                <NavLink to="/settings/system/form-inputs/brokers" onClick={onClose} title={isCollapsed ? t('Broker Inputs') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                                  <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Briefcase size={18} /></span><span className="text-[13px] link-label">{t('Broker Inputs')}</span></span>
                                </NavLink>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )}

                {/* Configurations Accordion */}
                {canViewConfigurationsSection && (
                  <div className="border-b border-theme-border dark:border-gray-800 pb-1">
                    <button
                      type="button"
                      onClick={() => handleAccordionToggle('configuration')}
                      title={isCollapsed ? t('Configurations') : ''}
                      className={`${baseLink} w-full justify-between`}
                    >
                      <span className="nova-icon-label">
                        <span className={`${iconContainer} ${iconTone}`}><Wrench size={18} /></span>
                        <span className="link-label">{t('Configurations')}</span>
                      </span>
                      <span className={`link-label transition-transform ${configurationOpen ? 'rotate-180' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </span>
                    </button>

                    {configurationOpen && (
                      <div className={`space-y-0.5 ${isRTL ? 'pr-4' : 'pl-4'}`}>
                        <NavLink to="/settings/notifications/general" onClick={onClose} title={isCollapsed ? t('Notification Settings') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                          <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Bell size={18} /></span><span className="text-[14px] link-label">{t('Notification Settings')}</span></span>
                        </NavLink>

                        <NavLink to="/settings/integrations/whatsapp" onClick={onClose} title={isCollapsed ? t('Whats Settings') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                          <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><MessageCircle size={18} /></span><span className="text-[14px] link-label">{t('Whats Settings')}</span></span>
                        </NavLink>
                        <NavLink to="/settings/notifications/email-settings" onClick={onClose} title={isCollapsed ? t('Email Settings') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                          <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Mail size={18} /></span><span className="text-[14px] link-label">{t('Email Settings')}</span></span>
                        </NavLink>
                        <NavLink to="/marketing/meta-integration" onClick={onClose} title={isCollapsed ? t('Social Media Settings') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                          <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Globe size={18} /></span><span className="text-[14px] link-label">{t('Social Media Settings')}</span></span>
                        </NavLink>
                        <NavLink to="/settings/operations/rotation" onClick={onClose} title={isCollapsed ? t('Rotation Settings') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                          <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><RefreshCw size={18} /></span><span className="text-[14px] link-label">{t('Rotation Settings')}</span></span>
                        </NavLink>
                        <NavLink to="/settings/notifications/sms-templates" onClick={onClose} title={isCollapsed ? t('SMS Settings') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                          <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Smartphone size={18} /></span><span className="text-[14px] link-label">{t('SMS Settings')}</span></span>
                        </NavLink>
                        <NavLink to="/settings/integrations/erp" onClick={onClose} title={isCollapsed ? t('ERP Integrations') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                          <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Server size={18} /></span><span className="text-[14px] link-label">{t('ERP Integrations')}</span></span>
                        </NavLink>
                        <NavLink to="/settings/integrations/api-keys" onClick={onClose} title={isCollapsed ? t('API Integrations') : ''} className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ''}`}>
                          <span className="nova-icon-label"><span className={`${iconContainer} ${iconTone}`}><Key size={18} /></span><span className="text-[14px] link-label">{t('API Integrations')}</span></span>
                        </NavLink>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        )}

      </nav>

      {/* Settings moved near bottom, above Contact us */}
      {/* Settings Trigger (only visible when settings closed) */}
      {!isSystemArea && !isSuperAdmin && !isMarketingActive && !isSectionViewOpen && !settingsOpen && canAccess('settings') && (
        <div className="pt-2 w-full">
          <div className={`border-t ${isLight ? 'border-theme-border' : 'border-gray-800'} mb-3`}></div>
          <NavLink
            to="/settings/profile"
            title={uiCollapsed ? t('Settings') : ''}
            onClick={() => {
              setSettingsOpen(true)
              setInventoryOpen(false)
              setCustomersOpen(false)
              onClose()
            }}
            className={() => `${baseLink} group/settings w-full justify-between ${isSettingsActive ? 'active-parent' : ''} bg-indigo-50 dark:bg-gray-800 border border-indigo-200 dark:border-gray-700`}
          >
            <span className="nova-icon-label">
              <span className={`${iconContainer} ${iconTone}`}>{getIcon('Settings')}</span>
              <span className="link-label text-slate-900 dark:text-gray-100 group-hover/settings:text-slate-900 dark:group-hover/settings:text-white">
                {t('Settings')}
              </span>
            </span>
            <span className={`link-label ${isLight ? 'text-gray-500' : 'text-gray-400'} transition-transform`} style={{ transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </NavLink>
        </div>
      )}

      {/* Bottom section */}
      {!isSystemArea && !isSuperAdmin && (
        <div className={`mt-auto pt-2 w-full`}>
          <div className={`border-t ${isLight ? 'border-gray-200' : 'border-gray-800'} mb-3 ${uiCollapsed ? 'mx-2' : ''}`}></div>
          <NavLink
            to="/contact"
            onClick={onClose}
            className={({ isActive }) => `${baseLink} group/contact ${isActive ? activeLink : ''} bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 ${uiCollapsed ? '!px-0 justify-center' : ''}`}
            title={uiCollapsed ? t('Contact us') : ''}
          >
            <span className="nova-icon-label justify-center">
              <span className={`${iconContainer} ${iconTone}`}>{getIcon('Contact us')}</span>
              <span className="link-label text-slate-900 dark:text-gray-100 group-hover/contact:text-slate-900 dark:group-hover/contact:text-white">
                {t('Contact us')}
              </span>
            </span>
          </NavLink>
        </div>
      )}

      {isSystemArea && isSuperAdmin && (
        <div className="mt-auto pt-2 w-full">
          <div className={`border-t ${isLight ? 'border-gray-200' : 'border-gray-800'} mb-3 ${uiCollapsed ? 'mx-2' : ''}`}></div>
          <button
            type="button"
            onClick={() => navigate('/system/tenants')}
            className={`${baseLink} group/contact w-full justify-center bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 ${uiCollapsed ? '!px-0' : ''}`}
            title={uiCollapsed ? t('Login as tenant') : ''}
          >
            <span className="nova-icon-label justify-center">
              <span className={`${iconContainer} ${iconTone}`}>🔑</span>
              <span className="link-label text-slate-900 dark:text-gray-100 group-hover/contact:text-slate-900 dark:group-hover/contact:text-white">
                {t('Login as tenant')}
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Collapse Toggle Button */}
      <div className="hidden md:flex w-full pt-2 justify-center">
        <button
          type="button"
          onClick={() => {
            if (!allowCollapse) return
            if (setCollapsed) setCollapsed(!isCollapsed)
            else setLocalCollapsed(v => !v)
          }}
          className={`p-2 rounded-full ${allowCollapse ? 'hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer' : 'opacity-50 cursor-not-allowed'} transition-colors text-gray-500 dark:text-gray-400`}
          title={allowCollapse ? (uiCollapsed ? t('Expand') : t('Collapse')) : t('Collapse disabled by admin')}
        >
          {uiCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRTL ? "rotate-180" : ""}>
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRTL ? "rotate-180" : ""}>
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          )}
        </button>
      </div>

      {/* Logout removed per request */}
    </aside>
  )
}
