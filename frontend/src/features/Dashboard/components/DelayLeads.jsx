import { useTranslation } from 'react-i18next';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '@shared/context/ThemeProvider';
import { useAppState } from '@shared/context/AppStateProvider';
import { api } from "@utils/api";
import { FaEye, FaPlus, FaPhone, FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import EnhancedLeadDetailsModal from '@shared/components/EnhancedLeadDetailsModal';
import AddActionModal from '../../../components/AddActionModal';
import { getLeadPermissionFlags } from '../../../services/leadPermissions';
import { formatPhoneForDisplay } from '@shared/utils/phoneDisplay';

const formatDateSafe = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString()
  } catch {
    return dateStr
  }
}

const renderStageBadge = (stage) => {
    if (!stage) return <span className="text-gray-400">-</span>
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
        {stage}
      </span>
    )
}

import { useStages } from '@hooks/useStages';

export const DelayLeads = ({ dateFrom, dateTo, selectedEmployee, selectedEmployeeName, stageFilter }) => {
  const { t, i18n } = useTranslation();
  const { theme, resolvedTheme } = useTheme();
  const isLight = (resolvedTheme || theme) === 'light';
  const { user, crmSettings } = useAppState();
  const showMobileNumber = Boolean(crmSettings?.showMobileNumber);
  const displayMobile = (value) => formatPhoneForDisplay(value, { showFull: showMobileNumber });
  const { stages } = useStages(); // Fetch dynamic stages from hook
  const MEET_ICON_URL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'><rect x='2' y='4' width='12' height='16' rx='3' fill='%23ffffff'/><rect x='2' y='4' width='12' height='4' rx='2' fill='%234285F4'/><rect x='2' y='4' width='4' height='16' rx='2' fill='%2334A853'/><rect x='10' y='4' width='4' height='16' rx='2' fill='%23FBBC05'/><rect x='2' y='16' width='12' height='4' rx='2' fill='%23EA4335'/><polygon points='14,9 22,5 22,19 14,15' fill='%2334A853'/></svg>"
  const SCROLLBAR_CSS = `
    .scrollbar-thin-blue { scrollbar-width: thin; scrollbar-color: #2563eb transparent; }
    .scrollbar-thin-blue::-webkit-scrollbar { height: 6px; }
    .scrollbar-thin-blue::-webkit-scrollbar-track { background: transparent; }
    .scrollbar-thin-blue::-webkit-scrollbar-thumb { background-color: #2563eb; border-radius: 9999px; }
    .scrollbar-thin-blue:hover::-webkit-scrollbar-thumb { background-color: #1d4ed8; }
  `
  const ICON_CSS = `
    .icon-whatsapp { color: #25D366; }
    .icon-call { color: #007AFF; }
    .icon-email { color: #FFA726; }
    .icon-preview { color: #616161; }
    .icon-googlemeet { color: #00897B; }
    .btn-preview { background-color: #eeeeee; color: #1f2937; }
    .btn-preview:hover { background-color: #e0e0e0; }
    .btn-addaction { background-color: #2563EB; color: #ffffff; }
    .btn-addaction:hover { background-color: #1D4ED8; }
  `
  const STORAGE_KEY = 'userActionsByDate'
  const loadActions = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  }
  const saveActions = (obj) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)) } catch {}
  }
  const [showAddActionModal, setShowAddActionModal] = useState(false)
  const handleSaveAction = (action) => {
    try {
      const map = loadActions()
      const key = action?.date || new Date().toISOString().slice(0,10)
      const label = (action?.title || '').trim() || (action?.notes ? String(action.notes).slice(0,60) : `${action?.type || 'action'}`)
      map[key] = [ ...(map[key] || []), label ]
      saveActions(map)
      // Refetch leads to update the list
      fetchLeads();
    } finally {
      setShowAddActionModal(false)
    }
  }
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const leadPermissionFlags = getLeadPermissionFlags(user);
  const roleLower = String(user?.role || '').toLowerCase();
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin';
  const isSalesPerson = roleLower.includes('sales person') || roleLower.includes('salesperson');
  const isAdminOrManager = user?.is_super_admin || 
                           isTenantAdmin || 
                           roleLower.includes('admin') || 
                           roleLower.includes('manager') || 
                           roleLower.includes('director') || 
                           roleLower.includes('leader');
  
  const canAddAction = leadPermissionFlags.canAddAction;
  const canShowCreator = leadPermissionFlags.canShowCreator;

  const computeIsOwner = (lead) => {
    const currentUserId = user?.id
    const normalizeName = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ')
    const leadAssigneeId =
      lead?.assigned_to_id ||
      lead?.assigned_to ||
      lead?.assignedSalesId ||
      lead?.assigned_sales_id ||
      lead?.salesPersonId ||
      lead?.sales_person_id ||
      lead?.employeeId ||
      lead?.employee_id ||
      lead?.assigneeId ||
      lead?.assignedUserId
    const leadAssigneeName =
      lead?.employeeName ||
      lead?.employee_name ||
      lead?.sales_person ||
      (typeof lead?.assigned_to === 'string' ? lead?.assigned_to : '') ||
      (typeof lead?.assignedTo === 'string' ? lead?.assignedTo : '')
    const byId = leadAssigneeId && currentUserId && String(leadAssigneeId) === String(currentUserId)
    const byName = leadAssigneeName && user?.name && normalizeName(leadAssigneeName) === normalizeName(user?.name)
    return Boolean(byId || byName)
  }

  // Logic for showing "Add Action" button:
  // 1. User must have general permission (canAddAction)
  // 2. Managers/Admins can add actions (comments) to any lead.
  // 3. Sales Person can only add actions to their own leads.
  const shouldShowAddAction = (lead) => {
    if (!canAddAction) return false;
    
    // Managers/Admins can see the button for any lead (to add comments/notes)
    if (isAdminOrManager) return true;
    
    const leadAssigneeId = lead.id ? (lead.assigned_to || lead.assignedTo || lead.assigned_to_id) : null;
    
    // If user is Sales Person, they see only their leads (filtered by backend), so they can add.
    if (isSalesPerson) return true;
    
    // Fallback for others
    return String(leadAssigneeId) === String(user?.id);
  };

  // Tooltip state (click-based)
  const [hoveredLead, setHoveredLead] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);
  const activeRowRef = useRef(null);
  
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (selectedEmployee) params.assigned_to = selectedEmployee;
      
      // Use the dedicated delayed leads endpoint
      const response = await api.get('/api/leads/delayed', { params });
      const data = response.data.data || response.data;
      const leadsArray = Array.isArray(data) ? data : (data.data || []);
      setLeads(leadsArray);
    } catch (error) {
      console.error('Failed to fetch leads for DelayLeads', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // Poll every minute for updates
    const interval = setInterval(fetchLeads, 60000);
    return () => clearInterval(interval);
  }, [selectedEmployee]);

  // Filter leads by employee (supports ID or name)
  const allLeads = useMemo(() => {
    let arr = leads;
    const selId = String(selectedEmployee || '').trim();
    const selName = String(selectedEmployeeName || '').trim();
    if (selId || selName) {
      arr = arr.filter(l => {
        const leadAssigneeId = l.assigned_to || l.assigned_to_id || l.assignedUserId || l.assigneeId || l.sales_person_id || l.employeeId;
        const leadAssigneeName = String(l.sales_person || l.assignedTo || l.employee || l.assigned_agent?.name || l.assignedAgent?.name || '').trim();
        const idMatch = selId && String(leadAssigneeId || '') === selId;
        const nameMatch = selName && leadAssigneeName === selName;
        return idMatch || nameMatch;
      });
    }
    return arr;
  }, [leads, selectedEmployee, selectedEmployeeName]);

  // Pipeline stage names (align with Dashboard cards) including dynamic stages
  const stageNames = useMemo(() => {
    const fixed = ['new', 'duplicate', 'pending', 'coldcalls', 'followup'];
    const dynamic = (stages || [])
      .map(s => String(s.name || '').toLowerCase().trim().replace(/[\s_]+/g, '-'))
      .filter(s => s && !fixed.includes(s));
    return [...fixed, ...dynamic];
  }, [stages]);

  const delayThresholdMs = 60 * 1000; // دقيقة واحدة قبل اعتبار الليد متأخرًا

  const deriveDelayCategory = (lead) => {
    const notes = (lead?.notes || '').toLowerCase();
    if (notes.includes('meeting') || notes.includes('اجتماع')) return 'followUpAfterMeeting';
    if (notes.includes('reschedule') || notes.includes('إعادة')) return 'rescheduleMeeting';
    if (notes.includes('no answer') || notes.includes('لا يرد')) return 'noAnswer1stCall';
    return 'followUp';
  };

  // Map real lead data to pipeline stage categories (match Dashboard logic)
  const derivePipelineStage = (l) => {
    // Priority 1: Direct stage from backend
    if (l?.stage) return l.stage;
    
    const status = String(l?.status || '').toLowerCase();
    const stage = String(l?.stage || '').toLowerCase();
    const source = String(l?.source || '').toLowerCase();
    const callType = String(l?.callType || '').toLowerCase();
    const normalize = (str) => String(str || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
    const ns = normalize(stage);
    if (ns) {
      if (ns === 'new') return 'new';
      if (ns === 'duplicate') return 'duplicate';
      if (ns === 'inprogress' || ns === 'pending') return 'pending';
      if (ns === 'coldcalls' || ns === 'coldcall') return 'coldcalls';
      if (ns === 'followup') return 'followup';
    }
    // Check if assigned to manager but not to sales person (Pending)
    const assignedTo = l.assigned_to || l.assignedTo;
    const managerId = l.manager_id || l.managerId;
    // If has manager_id but no sales_person assigned_to (or assigned_to is same as manager which implies no downward assignment yet if that's the logic, 
    // but usually assigned_to is the final assignee. 
    // If the requirement is "Assigned to Manager AND NOT assigned to Sales Person", 
    // we need to check if assigned_to is null/empty OR if assigned_to equals manager_id (meaning it stuck at manager level)
    
    // Assuming if assigned_to is missing it's unassigned. 
    // But if manager_id is present, it is "Pending" distribution.
    if (managerId && (!assignedTo || String(assignedTo) === String(managerId))) {
        return 'pending';
    }

    const sRaw = String(stage || '');
    const stRaw = String(status || '');
    if (sRaw.includes('جديد') || stRaw.includes('جديد')) return 'new';
    if (sRaw.includes('مكرر') || stRaw.includes('مكرر')) return 'duplicate';
    if (sRaw.includes('معلقة') || stRaw.includes('معلقة') || sRaw.includes('قيد') || stRaw.includes('قيد')) return 'pending';
    if (sRaw.includes('عميل محتمل') || sRaw.includes('عميل محتمل') || sRaw.includes('مكالمات') || stRaw.includes('عميل محتمل') || stRaw.includes('العملاء المحتملون')) return 'coldcalls';
    if (sRaw.includes('متابعة') || stRaw.includes('متابعة')) return 'followup';
    if (stage === 'new' || status === 'new') return 'new';
    if (l?.isDuplicate === true || String(l?.duplicateStatus || '').toLowerCase() === 'duplicate') return 'duplicate';
    if (stage === 'in-progress' || status === 'in-progress' || status === 'pending') return 'pending';
    if (source === 'cold-call' || source === 'direct' || source === 'coldcalls') return 'coldcalls';
    if (callType === 'follow-up' || stage === 'follow-up' || status === 'follow-up') return 'followup';
    
    // Check against dynamic stages
    if (ns) {
      // Direct match normalized
      const found = (stages || []).find(ds => String(ds.name).toLowerCase().replace(/[\s_]+/g, '-') === ns);
      if (found) return ns;
    }
    
    return 'new';
  };

  const pickScheduledDate = (l) => {
    const candidates = [
      l.scheduled_at, l.scheduledAt, l.schedule_at, l.scheduleAt,
      l.next_action_at, l.nextActionAt,
      l.appointment_at, l.meeting_at, l.meetingAt, l.meetingDate,
      l.follow_up_at, l.followUpAt,
      l.next_follow_up_at, l.nextFollowUp,
      l.reminder_at, l.reminderAt,
    ];
    const str = candidates.find((v) => !!v) || null;
    return str || null;
  };

  const isDelayedLead = (lead) => {
    // Trust backend if actions are present (fetched from /leads/delayed)
    if (lead?.actions && lead.actions.length > 0) return true;

    const statusRaw = String(lead?.status || '');
    const ns = statusRaw.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
    const arActive = statusRaw.includes('جديد') || statusRaw.includes('مؤهل') || statusRaw.includes('قيد') || statusRaw.includes('قيد التنفيذ') || statusRaw.includes('جار');
    const active = ns === 'new' || ns === 'qualified' || ns === 'inprogress' || arActive;
    if (!active) return false;
    const scheduledStr = pickScheduledDate(lead);
    if (!scheduledStr) return false;
    const scheduled = new Date(scheduledStr);
    if (isNaN(scheduled)) return false;
    const now = new Date();
    const diffMs = now - scheduled;
    return diffMs >= delayThresholdMs;
  };

  // Project delayed leads into the UI shape used by this component
  const delayLeads = useMemo(() => {
    const delayed = allLeads.filter(isDelayedLead);
    return delayed.map((l) => {
        const rawNextAction = l.actions && l.actions.length > 0 ? l.actions[0] : null;
        let nextAction = null;
        
        if (rawNextAction) {
            const details = rawNextAction.details || {};
            nextAction = {
                ...rawNextAction,
                type: rawNextAction.action_type || rawNextAction.type || 'action',
                date: rawNextAction.date || details.date,
                time: rawNextAction.time || details.time
            };
        }

        let actionDate = pickScheduledDate(l) || l.lastContact || l.createdAt;
        
        // Prefer the action date from the delayed action if available
        if (nextAction && nextAction.date) {
            const d = nextAction.date;
            const t = nextAction.time || '00:00:00';
            actionDate = `${d}T${t}`;
        }

        return {
          // keep original fields for tooltip actions
          id: l.id,
          name: l.name,
          email: l.email,
          phone: l.phone,
          company: l.company,
          status: l.status,
          priority: l.priority,
          source: l.source,
          createdAt: l.createdAt,
          lastContact: l.lastContact,
          notes: l.notes,
          employeeName: l.sales_person || l.assigned_agent?.name || l.assignedAgent?.name || (l.assigned_agent && typeof l.assigned_agent === 'object' ? l.assigned_agent.name : '') || (l.assignedAgent && typeof l.assignedAgent === 'object' ? l.assignedAgent.name : '') || '',
          // fields used by DelayLeads table rendering
          leadName: l.name,
          mobile: l.phone || '',
          actionDate: actionDate,
          lastComment: l.notes || '',
          category: deriveDelayCategory(l),
          pipelineStage: derivePipelineStage(l),
          pendingActionsCount: l.actions ? l.actions.length : 0,
          nextDelayedAction: nextAction,
        };
    });
  }, [allLeads]);

  const formatDateSafe = (iso) => {
    try {
      const d = new Date(iso)
      return new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    } catch {
      return iso || ''
    }
  }

  const renderStageBadge = (pipelineStage) => {
    const s = String(pipelineStage || '').toLowerCase();
    const isAr = i18n.language === 'ar';
    
    // Check if it's a dynamic stage first to get correct label
    const dynamicStage = (stages || []).find(ds => String(ds.name).toLowerCase().replace(/[\s_]+/g, '-') === s);
    if (dynamicStage) {
        return (isAr && dynamicStage.nameAr) ? dynamicStage.nameAr : dynamicStage.name;
    }

    const label = s === 'new' ? (isAr ? 'جديد' : 'New')
      : s === 'duplicate' ? (isAr ? 'مكرر' : 'Duplicate')
      : s === 'pending' ? (isAr ? 'معلقة' : 'Pending')
      : s === 'coldcalls' ? (isAr ? 'العملاء المحتملين' : 'Cold Calls')
      : s === 'followup' ? (isAr ? 'متابعة' : 'Follow-up')
      : (pipelineStage || '-')

    if (isLight) {
      const clsLight = s === 'new' ? 'bg-green-100/60 text-green-700 border border-green-300'
        : s === 'duplicate' ? 'bg-red-100/60 text-red-700 border border-red-300'
        : s === 'pending' ? 'bg-yellow-100/60 text-yellow-700 border border-yellow-300'
        : s === 'coldcalls' ? 'bg-orange-100/60 text-orange-700 border border-orange-300'
        : s === 'followup' ? 'bg-purple-100/60 text-purple-700 border border-purple-300'
        : 'bg-gray-100 text-gray-700 border border-gray-300'
      return <span className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-[2px] rounded-md ${clsLight}`}>{label}</span>
    }

    const clsDark = s === 'new' ? 'dark:bg-green-500/20 dark:text-green-200 dark:border dark:border-green-500'
      : s === 'duplicate' ? 'dark:bg-red-500/20 dark:text-red-200 dark:border dark:border-red-500'
      : s === 'pending' ? 'dark:bg-yellow-500/20 dark:text-yellow-200 dark:border dark:border-yellow-500'
      : s === 'coldcalls' ? 'dark:bg-orange-500/20 dark:text-orange-200 dark:border dark:border-orange-500'
      : s === 'followup' ? 'dark:bg-purple-500/20 dark:text-purple-200 dark:border dark:border-purple-500'
      : 'dark:bg-gray-500/20 dark:text-gray-200 dark:border dark:border-gray-500'
    return <span className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-[2px] rounded-md ${clsDark}`}>{label}</span>
  }

  // Helper: parse and compare dates safely
  const inDateRange = (leadDateStr) => {
    // If no range provided, include all
    if (!dateFrom && !dateTo) return true;
    const d = new Date(leadDateStr);
    if (isNaN(d)) return true; // If parsing fails, don't exclude
    // Normalize time for inclusive comparison
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (day < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(0, 0, 0, 0);
      if (day > to) return false;
    }
    return true;
  };

  // Calculate counts per stage within the selected date range
  const stageCounts = useMemo(() => {
    const init = Object.fromEntries(stageNames.map((n) => [n, 0]));
    const ranged = delayLeads.filter((lead) => inDateRange(lead.actionDate));
    ranged.forEach((lead) => {
      const key = String(lead?.pipelineStage || '').toLowerCase();
      const matched = stageNames.find((n) => String(n).toLowerCase() === key);
      if (matched) init[matched] = (init[matched] || 0) + 1;
    });
    return init;
  }, [delayLeads, dateFrom, dateTo, stageNames]);

  // Filter leads based on selected stage and date range, with fallback data when empty
  const filteredLeads = useMemo(() => {
    const ranged = delayLeads.filter((lead) => inDateRange(lead.actionDate));
    const matchesStage = (lead) => {
      const s = String(selectedFilter || '').toLowerCase();
      if (!s) return true;
      const ps = String(lead?.pipelineStage || '').toLowerCase();
      return ps === s;
    };
    const primary = ranged.filter(matchesStage);
    // Ensure newest leads (by creation date) are at the top
    return [...primary].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [delayLeads, selectedFilter, dateFrom, dateTo]);
  
  // Determine if we need to show scrollbar (when leads > 5)
  const showScroll = filteredLeads.length > 5;

  // Background colors matching the sidebar
  const bgColor = isLight ? 'bg-gray-100' : 'bg-gray-900';
  const textColor = isLight ? 'text-gray-800' : 'text-gray-100';

  // Click handler to show tooltip anchored above the clicked row/card
  const handleRowClick = (lead, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    activeRowRef.current = event.currentTarget;
    setHoveredLead(lead);
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    setShowTooltip(true);
  };

  // Click-away to hide tooltip when clicking any other element
  useEffect(() => {
    const handleDocumentMouseDown = (e) => {
      if (!showTooltip) return;
      if (tooltipRef.current && tooltipRef.current.contains(e.target)) return;
      if (activeRowRef.current && activeRowRef.current.contains(e.target)) return;
      setShowTooltip(false);
      setHoveredLead(null);
      activeRowRef.current = null;
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [showTooltip]);

  return (
    <div className={`p-4 ${bgColor} h-full overflow-auto rounded-lg shadow-md border ${isLight ? 'border-gray-200' : 'border-gray-700'} ${textColor}`}>

      <div className="hidden">
        {(() => {
          // Build filter buttons from Settings stages with counts
          const filterButtons = stageNames.map((name) => {
            // Get display label
            const dynamicStage = (stages || []).find(ds => String(ds.name).toLowerCase().replace(/[\s_]+/g, '-') === name);
            let label = name;
            if (dynamicStage) {
                label = (i18n.language === 'ar' && dynamicStage.nameAr) ? dynamicStage.nameAr : dynamicStage.name;
            } else {
                // Fallback for fixed stages
                const isAr = i18n.language === 'ar';
                if (name === 'new') label = isAr ? 'جديد' : 'New';
                else if (name === 'duplicate') label = isAr ? 'مكرر' : 'Duplicate';
                else if (name === 'pending') label = isAr ? 'معلقة' : 'Pending';
                else if (name === 'coldcalls') label = isAr ? 'العملاء المحتملين' : 'Cold Calls';
                else if (name === 'followup') label = isAr ? 'متابعة' : 'Follow-up';
            }

            return {
                key: name,
                label: label,
                count: stageCounts[name] || 0,
            };
          });

          return (
            <>
              {/* Show first 2 buttons */}
              {filterButtons.slice(0, 2).map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key)}
                  className={`px-3 py-2 text-xs sm:px-2 sm:py-1 sm:text-sm rounded ${selectedFilter === filter.key ? 'bg-blue-600 text-white' : isLight ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  <span>{filter.label}</span>
                  <span className="ml-1">{filter.count}</span>
                </button>
              ))}

              {/* Show More button after the second button */}
              {!showAllFilters && filterButtons.length > 2 && (
                <button
                  onClick={() => setShowAllFilters(true)}
                  className={`px-3 py-2 text-xs sm:px-2 sm:py-1 sm:text-sm rounded border-2 border-dashed ${isLight ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-blue-600 bg-blue-900/20 text-blue-400'}`}
                >
                  <span className="hidden sm:inline">{t('Show More')} ({filterButtons.length - 2})</span>
                  <span className="sm:hidden">+{filterButtons.length - 2}</span>
                </button>
              )}

              {/* Show remaining buttons when expanded */}
              {showAllFilters && filterButtons.slice(2).map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key)}
                  className={`px-3 py-2 text-xs sm:px-2 sm:py-1 sm:text-sm rounded ${selectedFilter === filter.key ? 'bg-blue-600 text-white' : isLight ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  <span>{filter.label}</span>
                  <span className="ml-1">{filter.count}</span>
                </button>
              ))}

              {selectedFilter && (
                <button
                  onClick={() => setSelectedFilter(null)}
                  className={`px-3 py-2 text-xs sm:px-2 sm:py-1 sm:text-sm rounded ${isLight ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  {t('Show All')}
                </button>
              )}

              {showAllFilters && (
                <button
                  onClick={() => setShowAllFilters(false)}
                  className={`px-3 py-2 text-xs sm:px-2 sm:py-1 sm:text-sm rounded border-2 border-dashed ${isLight ? 'border-gray-300 bg-gray-50 text-gray-600' : 'border-gray-600 bg-gray-800 text-gray-400'}`}
                >
                  <span className="hidden sm:inline">{t('Show Less')}</span>
                  <span className="sm:hidden">−</span>
                </button>
              )}
            </>
          );
        })()}
      </div>
      
      {/* Table container with conditional max height and scrolling */}
      <style>{SCROLLBAR_CSS}</style>
      <style>{ICON_CSS}</style>
      <div className={`overflow-x-auto scrollbar-thin-blue ${showScroll ? 'max-h-80 overflow-y-auto' : ''}`}>
        <div className="sm:hidden">
          {/* Mobile card layout */}
          {filteredLeads.map((lead, index) => (
            <div
              key={index}
              className={`p-3 mb-2 rounded-lg border ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} cursor-default`}
            >
                  <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-sm">{lead.leadName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">{displayMobile(lead.mobile)}</div>
                  {lead.pendingActionsCount > 0 && (
                    <div className="text-xs text-red-600 font-bold mt-1">
                      {t('Pending Actions')}: {lead.pendingActionsCount}
                    </div>
                  )}
                  {lead.nextDelayedAction && (
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        {t('Next')}: {lead.nextDelayedAction.type} <br/>
                        {lead.nextDelayedAction.date} {String(lead.nextDelayedAction.time || '').slice(0,5)}
                    </div>
                  )}
                  <div className="mt-1">{renderStageBadge(lead.pipelineStage)}</div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{formatDateSafe(lead.actionDate)}</div>
              </div>
              <div className="text-sm mb-3">{lead.lastComment}</div>
              <div className="flex items-center justify-end gap-2 flex-nowrap">
                <button
                  title={t('Preview')}
                  onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setShowLeadModal(true); }}
                  className={`inline-flex items-center justify-center ${isLight ? 'text-gray-700 hover:text-blue-500' : 'text-indigo-300 hover:text-indigo-400'}`}
                >
                  <FaEye size={16} className={`${isLight ? 'text-gray-700' : 'text-indigo-300'}`} />
                </button>
                {shouldShowAddAction(lead) && (
                <button
                  title={t('Add Action')}
                  onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setShowAddActionModal(true) }}
                  className={`inline-flex items-center justify-center ${isLight ? 'text-gray-700 hover:text-blue-500' : 'text-emerald-300 hover:text-emerald-400'}`}
                >
                  <FaPlus size={16} className={`${isLight ? 'text-gray-700' : 'text-emerald-300'}`} />
                </button>
                )}
                <button
                  title={t('Call')}
                  onClick={(e) => { e.stopPropagation(); const raw = lead.phone || lead.mobile || ''; const digits = String(raw).replace(/[^0-9]/g, ''); if (digits) window.open(`tel:${digits}`); }}
                  className={`inline-flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-500`}
                >
                  <FaPhone size={16} className="icon-call" />
                </button>
                <button
                  title="WhatsApp"
                  onClick={(e) => { e.stopPropagation(); const raw = lead.phone || lead.mobile || ''; const digits = String(raw).replace(/[^0-9]/g, ''); if (digits) window.open(`https://wa.me/${digits}`); }}
                  className={`inline-flex items-center justify-center text-green-600 dark:text-green-400 hover:text-green-500`}
                >
                  <FaWhatsapp size={16} className="icon-whatsapp" />
                </button>
                <button
                  title={t('Email')}
                  onClick={(e) => { e.stopPropagation(); if (lead.email) window.open(`mailto:${lead.email}`); }}
                  className={`inline-flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-blue-500`}
                >
                  <FaEnvelope size={16} className="icon-email" />
                </button>
                <button
                  title="Google Meet"
                  onClick={(e) => { e.stopPropagation(); window.open('https://meet.google.com/', '_blank'); }}
                  className={`inline-flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-blue-500`}
                >
                  <img src={MEET_ICON_URL} alt="Google Meet" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="hidden sm:block">
          {/* Desktop table layout */}
          <table dir={i18n.dir() === 'rtl' ? 'rtl' : 'ltr'} className={`delay-table w-full min-w-max text-sm ${i18n.dir() === 'rtl' ? 'text-right' : 'text-left'}`}>
            <thead className={`text-xs uppercase`}>
              <tr>
                <th scope="col" className="px-6 py-3">{t('Lead Name')}</th>
                <th scope="col" className="px-6 py-3">{t('Next Action')}</th>
                <th scope="col" className="px-6 py-3">{t('Mobile')}</th>
                <th scope="col" className="px-6 py-3">{t('Actions')}</th>
                <th scope="col" className="px-6 py-3">{t('Source')}</th>
                <th scope="col" className="px-6 py-3">{t('Sales Person')}</th>
                <th scope="col" className="px-6 py-3">{t('Stage')}</th>
                <th scope="col" className="px-6 py-3">{t('Last Comment')}</th>
                <th scope="col" className="px-6 py-3">{t('Action Date')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead, index) => (
                <tr
                  key={index}
                  className={`border-b ${isLight ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-gray-800 border-gray-700 dark:hover:bg-blue-900/25 dark:hover:shadow-md dark:hover:shadow-black/40'}`}
                >
                  <td className="px-6 py-4">{lead.leadName}</td>
                  <td className="px-6 py-4">
                    {lead.nextDelayedAction ? (
                    <div className="flex flex-col text-xs">
                        <span className="font-semibold">{lead.nextDelayedAction.type}</span>
                        <span className="text-gray-500">{lead.nextDelayedAction.date} {lead.nextDelayedAction.time ? String(lead.nextDelayedAction.time).slice(0,5) : ''}</span>
                    </div>
                    ) : '-'}
                  </td>
                  <td className={`px-6 py-4`} dir="ltr">{displayMobile(lead.mobile)}</td>
                  <td className={`px-6 py-4`}>
                    <div className="flex items-center gap-2 flex-nowrap">
                <button
                        title={t('Preview')}
                        onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setShowLeadModal(true); }}
                        className={`inline-flex items-center justify-center ${isLight ? 'text-gray-700 hover:text-blue-500' : 'text-indigo-300 hover:text-indigo-400'}`}
                      >
                        <FaEye size={16} className={`${isLight ? 'text-gray-700' : 'text-indigo-300'}`} />
                      </button>
                {shouldShowAddAction(lead) && (
                <button
                        title={t('Add Action')}
                        onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setShowAddActionModal(true) }}
                        className={`inline-flex items-center justify-center ${isLight ? 'text-gray-700 hover:text-blue-500' : 'text-emerald-300 hover:text-emerald-400'}`}
                      >
                        <FaPlus size={16} className={`${isLight ? 'text-gray-700' : 'text-emerald-300'}`} />
                </button>
                )}
                      <button
                        title={t('Call')}
                        onClick={(e) => { e.stopPropagation(); const raw = lead.phone || lead.mobile || ''; const digits = String(raw).replace(/[^0-9]/g, ''); if (digits) window.open(`tel:${digits}`); }}
                        className={`inline-flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-500`}
                      >
                        <FaPhone size={16} className="icon-call" />
                      </button>
                      <button
                        title="WhatsApp"
                        onClick={(e) => { e.stopPropagation(); const raw = lead.phone || lead.mobile || ''; const digits = String(raw).replace(/[^0-9]/g, ''); if (digits) window.open(`https://wa.me/${digits}`); }}
                        className={`inline-flex items-center justify-center text-green-600 dark:text-green-400 hover:text-green-500`}
                      >
                        <FaWhatsapp size={16} className="icon-whatsapp" />
                      </button>
                      <button
                        title={t('Email')}
                        onClick={(e) => { e.stopPropagation(); if (lead.email) window.open(`mailto:${lead.email}`); }}
                        className={`inline-flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-blue-500`}
                      >
                        <FaEnvelope size={16} className="icon-email" />
                      </button>
                      <button
                        title="Google Meet"
                        onClick={(e) => { e.stopPropagation(); window.open('https://meet.google.com/', '_blank'); }}
                        className={`inline-flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-blue-500`}
                      >
                        <img src={MEET_ICON_URL} alt="Google Meet" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className={`px-6 py-4`}>{lead.source || '-'}</td>
                  <td className={`px-6 py-4`}>{lead.employeeName || '-'}</td>
                  <td className={`px-6 py-4 ${isLight ? 'stage-cell' : ''}`}>{renderStageBadge(lead.pipelineStage)}</td>
                  <td className={`px-6 py-4`}>{lead.lastComment}</td>
                  <td className={`px-6 py-4`}>{formatDateSafe(lead.actionDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Lead Details Modal (same as Lead Management page) */}
      {showLeadModal && (
        <EnhancedLeadDetailsModal
          isOpen={showLeadModal}
          onClose={() => {
            setShowLeadModal(false);
            setSelectedLead(null);
          }}
          lead={selectedLead}
          isArabic={i18n.language === 'ar'}
          theme={theme}
          canAddAction={canAddAction}
          canShowCreator={canShowCreator}
        />
      )}

      {showAddActionModal && (
        <AddActionModal
          isOpen={true}
          onClose={() => setShowAddActionModal(false)}
          onSave={handleSaveAction}
          lead={selectedLead}
          isOwnerProp={computeIsOwner(selectedLead)}
          isSuperAdminProp={user?.is_super_admin}
        />
      )}
    </div>
  );
};
