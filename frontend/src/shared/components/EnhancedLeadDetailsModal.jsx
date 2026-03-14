import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeProvider';
import { useAppState } from '../context/AppStateProvider';
import { FaUser, FaCheckCircle, FaMapMarkerAlt, FaSearch, FaEye, FaDownload, FaCalendarAlt, FaClock, FaPlus, FaUserCheck, FaEdit, FaEllipsisV, FaTimes, FaDollarSign, FaPaperclip, FaPhone, FaEnvelope, FaList, FaCog, FaTrash, FaChevronDown, FaComments, FaFilter, FaWhatsapp, FaFileAlt } from 'react-icons/fa';

import AddActionModal from '../../components/AddActionModal';
import EditLeadModal from '../../components/EditLeadModal';
import PaymentPlanModal from '../../components/PaymentPlanModal';
import CreateRequestModal from '../../components/CreateRequestModal';
import ReAssignLeadModal from './ReAssignLeadModal';

import { useStages } from '@hooks/useStages';
import { saveRequest as saveRealEstateRequest } from '../../data/realEstateRequests';
import { saveRequest as saveInventoryRequest } from '../../data/inventoryRequests';
import { api } from '../../utils/api';
import echo from '../../echo';
import { getLeadWhatsappMessages, sendWhatsappTemplate, sendWhatsappText, getWhatsappTemplates } from '../../services/whatsappService';
import { getLeadEmailMessages, sendEmailText } from '../../services/emailService';
import { getEmailTemplates } from '../../services/emailTemplateService';
import { canManagerAddActionForLead } from '../../services/leadPermissions';

const EnhancedLeadDetailsModal = ({ lead, isOpen, onClose, isArabic = false, theme: propTheme = 'light', assignees = [], usersList = [], onAssign, onUpdateLead, initialTab = 'all-actions', canAddAction: propCanAddAction, initialActionId }) => {
  const { theme: contextTheme, resolvedTheme } = useTheme();
  const { user, company, crmSettings } = useAppState();
  const theme = resolvedTheme || contextTheme || propTheme;
  const [activeTab, setActiveTab] = useState(initialTab);

  const [fetchedLead, setFetchedLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leadActions, setLeadActions] = useState([]);

  useEffect(() => {
    if (initialActionId && leadActions.length > 0) {
      const actionExists = leadActions.find(a => a.id == initialActionId);
      if (actionExists) {
        if (activeTab !== 'all-actions') {
          setActiveTab('all-actions');
        }
        
        setExpandedComments(prev => ({
          ...prev,
          [initialActionId]: true
        }));

        setTimeout(() => {
          const element = document.getElementById(`action-${initialActionId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-emerald-500', 'transition-all', 'duration-500');
            setTimeout(() => element.classList.remove('ring-2', 'ring-emerald-500'), 3000);
          }
        }, 500);
      }
    }
  }, [initialActionId, leadActions, activeTab]);

  useEffect(() => {
    if (isOpen && lead?.id) {
      setLoading(true);
      setError(null);
      api.get(`/api/leads/${lead.id}`)
        .then(response => {
          setFetchedLead(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch lead details:', err);
          setError('Failed to load data');
          setLoading(false);
        });
    } else {
      setFetchedLead(null);
    }
  }, [isOpen, lead?.id]);


  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  useEffect(() => {
    if (!isOpen || activeTab !== 'communication' || !lead?.id) return;
    setWaLoading(true);
    getLeadWhatsappMessages(lead.id)
      .then(data => {
        setWaMessages(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setWaMessages([]);
      })
      .finally(() => setWaLoading(false));
    setEmailLoading(true);
    getLeadEmailMessages(lead.id)
      .then(data => {
        setEmailMessages(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setEmailMessages([]);
      })
      .finally(() => setEmailLoading(false));
    setTplLoading(true);
    getWhatsappTemplates()
      .then(data => {
        setTemplates(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setTemplates([]);
      })
      .finally(() => setTplLoading(false));
    getEmailTemplates()
      .then(list => setEmailTemplates(Array.isArray(list) ? list : []))
      .catch(() => { });
  }, [isOpen, activeTab, lead?.id]);
  useEffect(() => {
    if (!isOpen || !company?.id) return;
    const channelName = `tenant-${company.id}-whatsapp`;
    try {
      if (echo) {
        const ch = echo.channel(channelName);
        ch.listen('InboundWhatsappMessage', (e) => {
          const m = e?.message;
          if (!m) return;
          const raw = lead?.phone || lead?.mobile || '';
          const digits = String(raw).replace(/[^0-9]/g, '');
          const fromMatch = String(m.from || '').replace(/[^0-9]/g, '') === digits;
          const toMatch = String(m.to || '').replace(/[^0-9]/g, '') === digits;
          if (fromMatch || toMatch) {
            setWaMessages(prev => [...prev, {
              body: m.body,
              direction: m.direction || 'inbound',
              timestamp: m.timestamp || new Date().toISOString(),
              status: 'delivered',
              type: 'text',
              id: m.id || Math.random().toString(36).slice(2),
            }]);
            if (activeTab !== 'communication') {
              setUnreadComm(c => c + 1);
            }
          }
        });
      }
    } catch { }
    return () => {
      try {
        if (echo) {
          echo.leave(channelName);
        }
      } catch { }
    };
  }, [isOpen, company?.id, lead?.phone, activeTab]);
  useEffect(() => {
    if (!isOpen || activeTab !== 'communication' || !lead?.id) return;
    let timer = null;
    const shouldPoll = !echo;
    if (shouldPoll) {
      const run = async () => {
        try {
          const data = await getLeadWhatsappMessages(lead.id);
          if (Array.isArray(data)) {
            setWaMessages(data);
          }
          const edata = await getLeadEmailMessages(lead.id);
          if (Array.isArray(edata)) {
            setEmailMessages(edata);
          }
        } catch { }
      };
      timer = setInterval(run, 5000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, activeTab, lead?.id, echo]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedComments, setExpandedComments] = useState({});

  useEffect(() => {
    if (!isOpen || !lead?.id) return;
    
    // Listen for real-time comment updates
    let channel = null;
    try {
      // Assuming we have access to echo via context or prop, but here it seems we might need to access it differently.
      // If echo is not available in props, we might need to use window.Echo if set globally, or import it.
      // The code above uses `echo` variable, let's see where it comes from.
      // It seems it is likely from props or context.
      // Let's assume `echo` is available in scope as seen in line 92.
      
      if (window.Echo) {
         channel = window.Echo.private(`leads.${lead.id}`);
         channel.listen('.comment.added', (e) => {
            if (e && e.action_id && e.comment) {
                // Determine if the comment is from the current user to avoid self-notification/toast
                // (Though usually we want to see our own comment appear, we don't need a toast for it)
                const isMine = String(e.comment.userId) === String(user?.id);

                setLeadActions(prevActions => {
                    return prevActions.map(action => {
                        if (action.id === e.action_id) {
                            const currentComments = action.comments || [];
                            // Avoid duplicates if we optimistically added it
                            const exists = currentComments.some(c => c.id === e.comment.id || (c.text === e.comment.text && c.createdAt === e.comment.createdAt));
                            if (exists) return action;

                            // Add the new comment
                            return {
                                ...action,
                                comments: [...currentComments, e.comment]
                            };
                        }
                        return action;
                    });
                });
                
                // Show toast notification if it's not my comment
                if (!isMine) {
                    const event = new CustomEvent('app:toast', {
                        detail: {
                            type: 'info',
                            message: isArabic 
                                ? `تعليق جديد من ${e.comment.user}` 
                                : `New comment from ${e.comment.user}`
                        }
                    });
                    window.dispatchEvent(event);
                }
            }
         });
      }
    } catch (err) {
        console.error('Failed to subscribe to lead channel', err);
    }

    return () => {
        if (channel) {
            channel.stopListening('.comment.added');
        }
    };
  }, [isOpen, lead?.id]);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('timeline');
  const [selectedActions, setSelectedActions] = useState([]);
  const [showAddActionModal, setShowAddActionModal] = useState(false);
  // showAttachmentsModal removed
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(false);
  const [waMessages, setWaMessages] = useState([]);
  const [waLoading, setWaLoading] = useState(false);
  const [emailMessages, setEmailMessages] = useState([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [sendingTpl, setSendingTpl] = useState('');
  const [textBody, setTextBody] = useState('');
  const [sendingText, setSendingText] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [unreadComm, setUnreadComm] = useState(0);
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [actionType, setActionType] = useState('call');
  const [commFilter, setCommFilter] = useState('all');
  const [showCompose, setShowCompose] = useState(false);
  const [composeChannel, setComposeChannel] = useState('whatsapp');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeText, setComposeText] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showReAssignModal, setShowReAssignModal] = useState(false);
  const [assignStep, setAssignStep] = useState('teams');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [checkInHistory, setCheckInHistory] = useState([]);
  const [commentInputs, setCommentInputs] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState({});

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {};
  const hasExplicitLeadPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Leads');
  const leadModulePerms = hasExplicitLeadPerms && Array.isArray(modulePermissions.Leads) ? modulePermissions.Leads : [];
  const customersModulePerms = Array.isArray(modulePermissions.Customers) ? modulePermissions.Customers : [];
  const effectiveLeadPerms = hasExplicitLeadPerms ? leadModulePerms : (() => {
    const role = user?.role || '';
    if (role === 'Sales Admin') return ['addLead', 'importLeads'];
    if (role === 'Operation Manager') return ['addLead', 'importLeads', 'editInfo', 'editPhone'];
    if (role === 'Branch Manager') return ['addLead', 'importLeads', 'editInfo'];
    if (role === 'Director') return ['addLead', 'importLeads', 'editInfo'];
    if (role === 'Sales Manager') return ['addLead', 'importLeads', 'editInfo'];
    if (role === 'Team Leader') return ['addLead', 'importLeads'];
    if (role === 'Sales Person') return ['addLead', 'importLeads'];
    return [];
  })();
  const roleLowerFromState = String(user?.role || '').toLowerCase();
  const isTenantAdmin =
    roleLowerFromState === 'admin' ||
    roleLowerFromState === 'tenant admin' ||
    roleLowerFromState === 'tenant-admin';

  const allAttachments = useMemo(() => {
    const list = [];
    const currentLead = fetchedLead || lead;
    
    // 1. Lead Attachments
    const leadAtts = currentLead?.attachments || [];
    if (Array.isArray(leadAtts)) {
      leadAtts.forEach(path => list.push({ 
        path, 
        source: isArabic ? 'الملف الشخصي' : 'Lead Profile', 
        date: currentLead.created_at 
      }));
    }

    // 2. Action Attachments
    // Use leadActions state if populated, otherwise fallback to currentLead.actions
    const actions = (leadActions.length > 0 ? leadActions : (currentLead?.actions || []));
    
    if (Array.isArray(actions)) {
      actions.forEach(action => {
        let details = action.details || {};
        // If details is mixed into the action object (transformedAction), use action itself
        if (!action.details && (action.proposalAttachment || action.rentAttachment || action.attachments)) {
            details = action;
        }
        
        if (typeof details === 'string') {
            try { details = JSON.parse(details); } catch(e) {}
        }
        
        if (details.proposalAttachment) {
           list.push({ 
             path: details.proposalAttachment, 
             source: isArabic ? 'عرض سعر' : 'Proposal', 
             date: action.created_at || action.date,
             actionId: action.id
           });
        }
        
        if (details.rentAttachment) {
           list.push({ 
             path: details.rentAttachment, 
             source: isArabic ? 'عقد إيجار' : 'Rent Contract', 
             date: action.created_at || action.date,
             actionId: action.id
           });
        }

        if (Array.isArray(details.attachments)) {
           details.attachments.forEach(path => {
             list.push({ 
               path, 
               source: action.action_type || action.type || 'Action', 
               date: action.created_at || action.date,
               actionId: action.id
             });
           });
        }
      });
    }
    
    return list;
  }, [fetchedLead, lead, leadActions, isArabic]);

  const effectiveLead = fetchedLead || lead || {};
  const permissions = effectiveLead.permissions || {};
  
  // Lead Ownership Logic
  const currentUserId = user?.id;
  const normalizeName = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const dbAssignedTo =
    effectiveLead.assignedSalesId ??
    effectiveLead.assigned_sales_id ??
    effectiveLead.salesPersonId ??
    effectiveLead.sales_person_id ??
    effectiveLead.employeeId ??
    effectiveLead.employee_id ??
    effectiveLead.assigneeId ??
    effectiveLead.assignee_id ??
    effectiveLead.assignedUserId ??
    effectiveLead.assigned_user_id ??
    (typeof effectiveLead.sales_person === 'object' ? (effectiveLead.sales_person?.id ?? effectiveLead.sales_person?.user_id) : effectiveLead.sales_person) ??
    (typeof effectiveLead.assigned_to === 'object' ? (effectiveLead.assigned_to?.id ?? effectiveLead.assigned_to?.user_id) : effectiveLead.assigned_to) ??
    (typeof effectiveLead.assignedTo === 'object' ? (effectiveLead.assignedTo?.id ?? effectiveLead.assignedTo?.user_id) : effectiveLead.assignedTo);
  const assignedToName =
    effectiveLead.sales_person_name ||
    effectiveLead.salesPersonName ||
    effectiveLead.employeeName ||
    effectiveLead.employee_name ||
    (typeof effectiveLead.sales_person === 'string' ? effectiveLead.sales_person : '') ||
    (typeof effectiveLead.assigned_to === 'string' ? effectiveLead.assigned_to : '') ||
    (typeof effectiveLead.assignedTo === 'string' ? effectiveLead.assignedTo : '') ||
    (typeof effectiveLead.sales_person === 'object' ? effectiveLead.sales_person?.name : '') ||
    (typeof effectiveLead.assigned_to === 'object' ? effectiveLead.assigned_to?.name : '') ||
    (typeof effectiveLead.assignedTo === 'object' ? effectiveLead.assignedTo?.name : '');
  const isOwnerById = dbAssignedTo && currentUserId && String(dbAssignedTo) === String(currentUserId);
  const isOwnerByName = assignedToName && user?.name && normalizeName(assignedToName) === normalizeName(user?.name);
  const isOwner = Boolean(isOwnerById || isOwnerByName);

  const canEditInfo = (() => {
    if (permissions.can_edit === false) return false;
    // Check if user is the receiver of a referral for this lead
    const isReferralReceiver = effectiveLead?.referral_user_id && String(effectiveLead.referral_user_id) === String(currentUserId);
    const isManagerOfOwner = permissions?.can_manage === true;

    return isOwner || isReferralReceiver || isManagerOfOwner || user?.is_super_admin;
  })();

  const canEditPhone = (() => {
    if (permissions.can_edit === false) return false;
    const isReferralReceiver = effectiveLead?.referral_user_id && String(effectiveLead.referral_user_id) === String(currentUserId);
    const isManagerOfOwner = permissions?.can_manage === true;

    return isOwner || isReferralReceiver || isManagerOfOwner || user?.is_super_admin;
  })();

  const canAddAction = useMemo(() => {
    if (showAddActionModal) return false;
    
    const roleLower = String(user?.role || '').toLowerCase();
    const isSalesPersonRole = roleLower.includes('sales person');
    
    // Basic permissions check
    const baseCanAdd =
      propCanAddAction ||
      user?.is_super_admin ||
      user?.meta_data?.module_permissions?.Leads?.includes('addAction') ||
      isSalesPersonRole ||
      isOwner;
    
    // Check if user is a referral supervisor (they can't add actions)
    const isReferralSupervisor = permissions?.is_referral_supervisor || 
                                 (user?.meta_data?.module_permissions?.Leads?.includes('is_referral_supervisor'));
    
    if (!baseCanAdd || isReferralSupervisor || permissions.can_add_action === false) return false;

    // Check if user is the receiver of a referral for this lead
    const isReferralReceiver = effectiveLead?.referral_user_id && String(effectiveLead.referral_user_id) === String(currentUserId);
    const isManagerOfOwner = permissions?.can_manage === true;

    return isOwner || isReferralReceiver || isManagerOfOwner || user?.is_super_admin;
  }, [showAddActionModal, propCanAddAction, user, permissions, isOwner, effectiveLead?.referral_user_id, currentUserId]);

  const AddActionIconButton = ({ visible, onClick }) => {
    if (!visible) return null;
    return (
      <button
        onClick={onClick}
        aria-label={isArabic ? 'إضافة إجراء' : 'Add Action'}
        title={isArabic ? 'إضافة إجراء' : 'Add Action'}
        className="btn-icon bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        <FaPlus className="text-sm" />
      </button>
    );
  };

  const canConvertToCustomer = (() => {
    if (permissions.can_edit === false) return false;
    // Strict Rule: Only Lead Owner can convert
    return isOwner && crmSettings?.allowConvertToCustomers !== false;
  })();

  // Helper to transform API action to UI format
  const transformAction = (action) => {
    if (!action) return null;
    let details = action.details || {};
    if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch(e) { details = {}; }
    }
    const creator = action.creator || (typeof action.user === 'object' ? action.user : null);
    const creatorRole = creator?.role || action.role || '';

    return {
      ...action,
      id: action.id,
      details: details,
      type: action.action_type || action.type || 'call',
      title: action.title || details.title || getTypeLabel(action.action_type || action.type),
      description: action.description || details.description || '',
      date: details.date || action.date || (action.created_at ? action.created_at.split('T')[0] : ''),
      time: details.time || action.time || (action.created_at ? action.created_at.split('T')[1]?.substring(0, 5) : ''),
      user: action.creator?.name || action.user?.name || action.user || 'Unknown', // Handle object or string
      userRole: creatorRole,
      status: details.status || action.status || 'pending',
      priority: details.priority || action.priority || 'medium',
      notes: details.notes || action.notes || '',
      comments: details.comments || [],
    };
  };

  const getActionExtraFields = (action) => {
    const details = action.details || {};
    const merged = { ...details, ...action };
    const fields = [];
    const addField = (key, labelAr, labelEn, formatter) => {
      const raw = merged[key];
      if (raw === undefined || raw === null || raw === '') return;
      const val = formatter ? formatter(raw) : raw;
      fields.push({
        key,
        label: isArabic ? labelAr : labelEn,
        value: val
      });
    };

    const currentType = String(merged.action_type || merged.type || '').toLowerCase();
    const nextType = merged.next_action_type || merged.nextAction || merged.next_action || '';
    const lowerNext = String(nextType || '').toLowerCase();

    if (currentType === 'closing_deals' || lowerNext === 'closing_deals') {
      addField('closingRevenue', 'الإيرادات', 'Revenue', v => Number(v).toLocaleString());
    }

    if (currentType === 'proposal' || lowerNext === 'proposal') {
      addField('proposalAmount', 'قيمة العرض', 'Proposal Amount', v => Number(v).toLocaleString());
      addField('proposalDiscount', 'الخصم %', 'Discount %');
      addField('proposalValidityDays', 'مدة الصلاحية (أيام)', 'Validity Days');
    }

    if (currentType === 'reservation' || lowerNext === 'reservation') {
      addField('reservationType', 'نوع الحجز', 'Reservation Type');
      addField('reservationAmount', 'قيمة الحجز', 'Reservation Amount', v => Number(v).toLocaleString());
    }

    if (currentType === 'rent' || lowerNext === 'rent') {
      addField('rentAmount', 'قيمة الإيجار', 'Rent Amount', v => Number(v).toLocaleString());
      addField('rentStart', 'بداية الإيجار', 'Rent Start');
      addField('rentEnd', 'نهاية الإيجار', 'Rent End');
    }

    if (currentType === 'cancel' || lowerNext === 'cancel') {
      addField('cancelReason', 'سبب الإلغاء', 'Cancel Reason');
    }

    if (currentType === 'meeting' || lowerNext === 'meeting' || currentType === 'google_meet') {
      addField('meetingType', 'نوع الاجتماع', 'Meeting Type');
      addField('meetingLocation', 'مكان الاجتماع', 'Meeting Location');
      
      // Update: use the detailed meeting_status if available, fallback to doneMeeting
      if (merged.meeting_status) {
        addField('meeting_status', 'حالة الاجتماع', 'Meeting Status', s => {
          if (isArabic) {
            if (s === 'scheduled') return 'مجدول';
            if (s === 'done') return 'تم بنجاح';
            if (s === 'no_show') return 'لم يحضر (ميسد)';
            if (s === 'cancelled') return 'ملغي';
          }
          return String(s).charAt(0).toUpperCase() + String(s).slice(1).replace('_', ' ');
        });
      } else {
        addField('doneMeeting', 'حالة الاجتماع', 'Meeting Status', v => v ? (isArabic ? 'تم الاجتماع' : 'Meeting Done') : (isArabic ? 'لم يتم' : 'Not Done'));
      }
    }

    if (merged.answerStatus) {
      addField('answerStatus', 'حالة الرد', 'Answer Status', v => v === 'answer' ? (isArabic ? 'إجابة' : 'Answered') : (isArabic ? 'لا يوجد رد' : 'No Answer'));
    }

    return fields;
  };

  useEffect(() => {
    const source = fetchedLead || lead;
    const id = source?.id;
    if (!id) {
      setLeadActions([]);
      return;
    }

    let cancelled = false;

    const fetchActions = async () => {
      try {
        const res = await api.get('/api/lead-actions', { params: { lead_id: id } });
        const data = Array.isArray(res.data) ? res.data : (res.data.actions || []);
        if (!cancelled) {
          setLeadActions(data.map(transformAction));
        }
      } catch (e) {
        console.error('Failed to fetch actions for lead details modal', e);
        if (!cancelled) {
          setLeadActions([]);
        }
      }
    };

    fetchActions();

    return () => {
      cancelled = true;
    };
  }, [lead?.id, fetchedLead?.id]);

  // Sample data for demonstration
  const leadData = {
    name: effectiveLead?.fullName || effectiveLead?.leadName || effectiveLead?.name || '-',
    phone: effectiveLead?.mobile || effectiveLead?.phone || '-',
    email: effectiveLead?.email || '-',
    company: effectiveLead?.company || '-',
    location: effectiveLead?.location || (isArabic ? 'غير محدد' : 'Not specified'),
    source: effectiveLead?.source || '-',
    createdDate: effectiveLead?.created_at ? new Date(effectiveLead.created_at).toLocaleDateString() : (effectiveLead?.createdDate || '-'),
    status: effectiveLead?.status || 'qualified',
    priority: effectiveLead?.priority || 'high',
    stage: effectiveLead?.stage || (isArabic ? 'جديد' : 'New'),
    createdBy: effectiveLead?.creator?.name || effectiveLead?.createdBy || (isArabic ? 'غير محدد' : 'Not specified'),
    salesPerson: (() => {
      let sp = effectiveLead?.sales_person || effectiveLead?.assignedAgent?.name;
      // Fallback: Lookup in usersList if we only have an ID
      if (!sp && usersList && usersList.length > 0) {
        const assignedId = effectiveLead?.assigned_to || effectiveLead?.assignedTo || effectiveLead?.salesPerson;
        if (assignedId && !isNaN(assignedId)) {
          const u = usersList.find(user => user.id == assignedId);
          if (u) sp = u.name;
        }
      }
      return sp || effectiveLead?.assigned_to || effectiveLead?.assignedTo || effectiveLead?.salesPerson || (isArabic ? 'غير محدد' : 'Not specified');
    })()
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!lead?.id) {
        setCheckInHistory([]);
        return;
      }
      try {
        const res = await api.get(`/api/visits`, { params: { lead_id: lead.id, limit: 500 } });
        const visits = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const sorted = visits
          .filter(v => v.type === 'lead')
          .sort((a, b) => new Date(b.checkInDate || b.check_in_at) - new Date(a.checkInDate || a.check_in_at));
        setCheckInHistory(sorted);
      } catch (e) {
        console.error('Error loading check-in history', e);
        setCheckInHistory([]);
      }
    };
    fetchHistory();
  }, [lead?.id]);

  const filteredCheckInHistory = checkInHistory.filter(item => {
    if (!historyDateFilter) return true;
    const itemDate = new Date(item.checkInDate).toISOString().split('T')[0];
    return itemDate === historyDateFilter;
  }).sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));

  // Mock Teams Data
  const TEAMS_DATA = {
    'Sales Team A': ['Ahmed Ali', 'Sara Noor'],
    'Sales Team B': ['Ibrahim'],
    'Marketing': ['Dina', 'Elias']
  };

  const headerMenuRef = useRef(null);
  const headerMenuBtnRef = useRef(null);
  const assignMenuRef = useRef(null);
  const assignMenuBtnRef = useRef(null);
  const { stages } = useStages();

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Header Menu
      if (showHeaderMenu) {
        const menuEl = headerMenuRef.current;
        const btnEl = headerMenuBtnRef.current;
        if (menuEl && !menuEl.contains(e.target) && btnEl && !btnEl.contains(e.target)) {
          setShowHeaderMenu(false);
        }
      }
      // Assign Menu
      if (showAssignMenu) {
        const menuEl = assignMenuRef.current;
        const btnEl = assignMenuBtnRef.current;
        if (menuEl && !menuEl.contains(e.target) && btnEl && !btnEl.contains(e.target)) {
          setShowAssignMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showHeaderMenu, showAssignMenu]);
  const [paymentPlan, setPaymentPlan] = useState(lead?.paymentPlan || null);
  const [cardsLoading, setCardsLoading] = useState(false);

  useEffect(() => {
    setPaymentPlan(lead?.paymentPlan || null);
  }, [lead]);



  useEffect(() => {
    // When lead changes or opens, start loading effect
    if (isOpen) {
      setCardsLoading(true);
      const timer = setTimeout(() => {
        setCardsLoading(false);
      }, 1000); // 1 second delay for realistic effect
      return () => clearTimeout(timer);
    }
  }, [isOpen, lead?.id]);



  if (!isOpen) return null;
  const handleAddAction = async (newAction) => {
    console.log('إضافة إجراء جديد:', newAction);

    // Save reservation data if applicable
    if (newAction.nextAction === 'reservation') {
      // ... existing reservation logic (kept as is) ...
      console.log('Processing Reservation. Raw Action:', newAction);

      // Intelligent Type Detection to resolve potential mismatches
      let effectiveType = newAction.reservationType;
      // If item is present (and it's not a project), force general
      if (newAction.reservationItem && newAction.reservationItem !== '') {
        effectiveType = 'general';
      }
      // If project is present (and it's not general item), force project
      if (newAction.reservationProject && newAction.reservationProject !== '') {
        effectiveType = 'project';
      }

      console.log('Effective Reservation Type:', effectiveType);

      if (effectiveType === 'project') {
        const realEstateRequest = {
          id: Date.now(),
          customer: leadData.name,
          project: newAction.reservationProject,
          unit: newAction.reservationUnit,
          amount: newAction.reservationAmount,
          status: 'Pending',
          type: 'Booking',
          date: new Date().toISOString().split('T')[0],
          notes: newAction.reservationNotes,
          phone: leadData.phone
        };
        console.log('Saving to Real Estate:', realEstateRequest);
        await saveRealEstateRequest(realEstateRequest);
        const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: isArabic ? 'تم حفظ طلب المشروع' : 'Project Request Saved' } });
        window.dispatchEvent(evt);
      } else if (effectiveType === 'general') {
        let requestType = 'Purchase Order';
        if (newAction.reservationCategory === 'service') requestType = 'Inquiry';
        if (newAction.reservationCategory === 'subscription') requestType = 'Subscription';

        const inventoryRequest = {
          customer: leadData.name,
          item: newAction.reservationItem || 'Unspecified Item',
          amount: Number(newAction.reservationAmount) || 0,
          type: requestType,
          status: 'Pending',
          date: new Date().toISOString().split('T')[0],
          notes: newAction.reservationNotes || '',
          phone: leadData.phone
        };

        try {
          console.log('Saving inventory request:', inventoryRequest);
          await saveInventoryRequest(inventoryRequest);
          // Dispatch event to ensure RequestsPage updates
          window.dispatchEvent(new Event('inventory-requests-updated'));

          const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: isArabic ? 'تم حفظ طلب المخزون' : 'Inventory Request Saved' } });
          window.dispatchEvent(evt);
        } catch (error) {
          console.error('Error saving inventory request:', error);
          const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: isArabic ? 'حدث خطأ أثناء الحفظ' : 'Error saving request' } });
          window.dispatchEvent(evt);
        }
      }
    }

    // Update Lead Stage if nextAction corresponds to a stage
    let newStage = null;
    if (newAction.nextAction) {
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
        const normalizedNextAction = String(newAction.nextAction).replace(/_/g, ' ').toLowerCase();

        // Expanded map to cover more cases and exact default stage names
        const actionToStageMap = {
          'reservation': ['reservation', 'booking', 'won', 'closed', 'حجز', 'مباع'],
          'closing_deals': ['closing deal', 'closing', 'deal', 'won', 'closed', 'إغلاق', 'صفقة'],
          'rent': ['rent', 'leased', 'won', 'إيجار', 'مؤجر'],
          'cancel': ['cancelation', 'cancellation', 'cancelled', 'lost', 'archive', 'cold calls', 'إلغاء', 'خسارة', 'العملاء المحتملين'],
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
    }

    const stageToUse = newStage || (fetchedLead?.stage || lead?.stage);

    const actionEntry = {
      ...newAction,
      id: Date.now(),
      date: newAction.date || new Date().toISOString().split('T')[0],
      time: newAction.time || new Date().toTimeString().slice(0, 5),
      created_at: new Date().toISOString(),
      stageAtCreation: stageToUse,
      description: newAction.description || newAction.notes || '',
      assignee: newAction.assignedTo || newAction.assignee || lead?.assignedTo || lead?.salesPerson || 'غير محدد'
    };

    try {
      const leadUpdatePayload = {};
      let shouldUpdateLead = false;

      if (newStage && newStage !== (fetchedLead?.stage || lead?.stage)) {
        leadUpdatePayload.stage = newStage;
        shouldUpdateLead = true;
      }

      const newNote = newAction.description || newAction.notes;
      if (newNote && (!fetchedLead?.notes || newNote !== fetchedLead.notes)) {
        leadUpdatePayload.notes = newNote;
        shouldUpdateLead = true;
      }

      if (shouldUpdateLead) {
        await api.put(`/api/leads/${lead.id}`, leadUpdatePayload);
      }

      try {
        const actionsRes = await api.get('/api/lead-actions', { params: { lead_id: lead.id } });
        const serverActions = Array.isArray(actionsRes.data)
          ? actionsRes.data
          : (actionsRes.data.actions || []);
        setLeadActions(serverActions.map(transformAction));
      } catch (actionsErr) {
        console.error('Failed to fetch updated actions after saving action', actionsErr);
      }

      try {
        const freshLeadRes = await api.get(`/api/leads/${lead.id}`);
        const freshLead = freshLeadRes.data.lead || freshLeadRes.data;

        setFetchedLead(freshLead);

        if (onUpdateLead) {
          onUpdateLead(freshLead);
        }
      } catch (fetchErr) {
        console.error('Failed to fetch updated lead after saving action', fetchErr);
        setFetchedLead(prev => ({ ...prev, ...leadUpdatePayload }));
        if (onUpdateLead) {
          onUpdateLead({ ...fetchedLead, ...leadUpdatePayload });
        }
      }

      const storedLeads = JSON.parse(localStorage.getItem('leadsData') || '[]');
      const leadIndex = storedLeads.findIndex(l => l.id === lead.id);
      if (leadIndex >= 0) {
        storedLeads[leadIndex] = { ...storedLeads[leadIndex], ...leadUpdatePayload };
        localStorage.setItem('leadsData', JSON.stringify(storedLeads));
        window.dispatchEvent(new CustomEvent('leadsDataUpdated'));
      }

      const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: isArabic ? 'تم حفظ الإجراء بنجاح' : 'Action saved successfully' } });
      window.dispatchEvent(evt);

    } catch (err) {
      console.error('Failed to save action to API:', err);
      const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: isArabic ? 'فشل حفظ الإجراء' : 'Failed to save action' } });
      window.dispatchEvent(evt);
    }

    setShowAddActionModal(false);
  };

  const handleReAssign = async (assignData) => {
    try {
      const payload = {
        assignedTo: assignData.userName,
        assigned_to_id: assignData.userId,
        assign_method: assignData.method,
        assign_options: assignData.options
      };

      await api.put(`/api/leads/${lead.id}`, payload);

      try {
        const freshLeadRes = await api.get(`/api/leads/${lead.id}`);
        const freshLead = freshLeadRes.data.lead || freshLeadRes.data;

        setFetchedLead(freshLead);

        if (onAssign) {
          onAssign(freshLead.sales_person || assignData.userName);
        }
      } catch (fetchErr) {
        console.error('Failed to fetch updated lead after re-assign', fetchErr);
        // Fallback
        setFetchedLead(prev => ({
          ...prev,
          assignedTo: assignData.userName,
          salesPerson: assignData.userName,
          assignedAgent: { id: assignData.userId, name: assignData.userName }
        }));
        if (onAssign) {
          onAssign(assignData.userName);
        }
      }

      const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: isArabic ? 'تم إعادة التعيين بنجاح' : 'Lead re-assigned successfully' } });
      window.dispatchEvent(evt);
    } catch (err) {
      console.error('Failed to re-assign lead:', err);
      const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: isArabic ? 'فشل إعادة التعيين' : 'Failed to re-assign lead' } });
      window.dispatchEvent(evt);
    }
  };

  const getStageStyle = (stageName) => {
    const currentStageValue = String(stageName || '').toLowerCase();
    const matchedStage = (Array.isArray(stages) ? stages : []).find((s) => {
      const name = typeof s === 'string' ? s : s?.name;
      const nameAr = typeof s === 'string' ? '' : s?.nameAr;
      return String(name || '').toLowerCase() === currentStageValue || String(nameAr || '').toLowerCase() === currentStageValue;
    });

    const style = matchedStage ? (
      (typeof matchedStage !== 'string' && typeof matchedStage.color === 'string')
        ? (matchedStage.color.trim().startsWith('#')
          ? { backgroundColor: matchedStage.color }
          : { background: `var(--stage-${matchedStage.color}-swatch, ${matchedStage.color})` }
        )
        : {}
    ) : {};

    const className = `px-3 py-1 text-white text-sm rounded-full font-medium${matchedStage ? '' : ' bg-blue-500'}`;

    return { style, className };
  };

  const { style: stageColorStyle, className: stageBadgeClass } = getStageStyle(leadData.stage);
  const activities = [
    {
      id: 1,
      text: 'الشهر هكذا لم نتمكن الحصان إبن علي',
      date: '15-01-2024',
      status: 'completed',
      icon: 'check'
    },
    {
      id: 2,
      text: 'الشهر هكذا لم نتمكن الحصان إبن علي',
      date: '15-01-2024',
      status: 'completed',
      icon: 'check'
    },
    {
      id: 3,
      text: 'الشهر هكذا لم نتمكن الحصان إبن علي',
      date: '15-01-2024',
      status: 'scheduled',
      icon: 'clock'
    }
  ];

  // تمت إزالة بيانات العينة؛ ستُدار الإجراءات من خلال الحالة actions المُحدّثة عبر AddActionModal

  const handleActionCommentSubmit = async (actionId, text) => {
    if (!text || !text.trim()) return;

    setCommentSubmitting(prev => ({ ...prev, [actionId]: true }));

    try {
      const actionIndex = leadActions.findIndex(a => a.id === actionId);
      if (actionIndex === -1) return;

      const action = leadActions[actionIndex];
      const currentComments = action.comments || [];

      const newComment = {
        id: Date.now().toString(),
        text: text.trim(),
        user: user?.name || 'Unknown',
        userId: user?.id,
        role: user?.role || 'Unknown',
        createdAt: new Date().toISOString()
      };

      const updatedComments = [...currentComments, newComment];

      // Optimistic update
      const updatedAction = { ...action, comments: updatedComments };
      const updatedActions = [...leadActions];
      updatedActions[actionIndex] = updatedAction;
      setLeadActions(updatedActions);

      // API Call
      await api.put(`/api/lead-actions/${actionId}`, {
        details: {
          comments: updatedComments
        }
      });

      // Clear input
      setCommentInputs(prev => ({ ...prev, [actionId]: '' }));

      const toast = new CustomEvent('app:toast', { detail: { type: 'success', message: isArabic ? 'تم إضافة التعليق' : 'Comment added' } });
      window.dispatchEvent(toast);

    } catch (error) {
      console.error('Failed to add comment', error);
      const toast = new CustomEvent('app:toast', { detail: { type: 'error', message: isArabic ? 'فشل إضافة التعليق' : 'Failed to add comment' } });
      window.dispatchEvent(toast);
    } finally {
      setCommentSubmitting(prev => ({ ...prev, [actionId]: false }));
    }
  };

  const filteredActions = leadActions
    .filter(action => {
      const matchesSearch = action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || action.status === filterStatus;
      const matchesType = filterType === 'all' || 
                        (filterType === 'meeting' 
                          ? (String(action.type).toLowerCase() === 'meeting' || String(action.next_action_type).toLowerCase() === 'meeting') 
                          : filterType === 'email' 
                            ? ['email', 'whatsapp', 'sms'].includes(String(action.type).toLowerCase())
                            : String(action.type).toLowerCase() === filterType);
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (createdA !== createdB) {
          return createdB - createdA;
        }
        const dateA = new Date(`${a.date}T${(a.time || '00:00')}`).getTime();
        const dateB = new Date(`${b.date}T${(b.time || '00:00')}`).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return createdB - createdA;
    });

  // Action statistics
  const actionStats = useMemo(() => {
    const total = leadActions.length;
    const completed = leadActions.filter(a => a.status === 'completed').length;
    
    // Logic for Delay:
    // 1. If there's a scheduled action in the future, it's NOT a delay.
    // 2. If there's an action whose scheduled date/time has passed, it's a delay.
    // 3. If there are NO future actions and the lead is active, it might be considered a delay (depending on business rules).
    
    const now = new Date();
    const delayedActions = leadActions.filter(a => {
      if (a.status === 'completed') return false;
      if (!a.date) return false;
      
      const scheduledDate = new Date(`${a.date}T${a.time || '00:00'}`);
      return scheduledDate < now;
    });

    return {
      total,
      completed,
      delay: delayedActions.length,
      scheduled: leadActions.filter(a => a.status === 'scheduled').length
    };
  }, [leadActions]);

  // Helper functions
  const getActionStage = (action) => {
    const details = action.details || {};

    // 1) أولاً: محاولة جلب اسم المرحلة الفعلي وقت إنشاء الإجراء (الأكثر دقة)
    const stageIdRaw =
      action.stage_id_at_creation ||
      action.stage_id ||
      details.stage_id_at_creation ||
      details.stage_id;

    if (stageIdRaw && Array.isArray(stages)) {
      const stageId = String(stageIdRaw);
      const match = stages.find(s => String(s.id) === stageId);
      if (match && match.name) {
        return match.name;
      }
    }

    // بدائل لاسم المرحلة مخزنة مسبقاً
    if (details.stage_at_creation_name) return details.stage_at_creation_name;
    if (details.stageAtCreationName) return details.stageAtCreationName;
    if (action.stageAtCreation) return action.stageAtCreation;
    if (action.stage) return action.stage;
    if (details.stage) return details.stage;

    // 2) ثانياً: إذا لم تتوفر مرحلة محددة، نستخدم نوع الإجراء المختار (next_action_type أو action_type) كبديل للعرض
    const rawType =
      action.next_action_type ||
      details.next_action_type ||
      details.nextAction ||
      action.action_type ||
      action.type;

    if (rawType) {
      const key = String(rawType).toLowerCase();
      switch (key) {
        case 'reservation':
          return isArabic ? 'حجز' : 'Reservation';
        case 'closing_deals':
          return isArabic ? 'إغلاق الصفقات' : 'Closing Deals';
        case 'rent':
          return isArabic ? 'إيجار' : 'Rent';
        case 'cancel':
          return isArabic ? 'إلغاء' : 'Cancel';
        case 'meeting':
          return isArabic ? 'اجتماع' : 'Meeting';
        case 'follow_up':
          return isArabic ? 'متابعة' : 'Follow Up';
        case 'call':
          return isArabic ? 'مكالمة' : 'Call';
        default:
          return key.replace(/_/g, ' ');
      }
    }

    return leadData.stage;
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'call': return <FaPhone className="text-blue-400" />;
      case 'email': return <FaEnvelope className="text-green-400" />;
      case 'meeting': return <FaCalendarAlt className="text-purple-400" />;
      case 'note': return <FaEdit className="text-yellow-400" />;
      case 'task': return <FaList className="text-orange-400" />;
      default: return <FaCog className="text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-orange-500';
      case 'scheduled': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-green-400 border-green-400';
      case 'medium': return 'text-yellow-400 border-yellow-400';
      case 'low': return 'text-red-400 border-red-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  const getTypeColor = (type) => {
    switch (String(type).toLowerCase()) {
      case 'call': return 'text-blue-400 border-blue-400';
      case 'email': return 'text-yellow-400 border-yellow-400';
      case 'meeting': return 'text-purple-400 border-purple-400';
      case 'task': return 'text-orange-400 border-orange-400';
      case 'note': return 'text-slate-300 border-slate-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  const getTypeLabel = (type) => {
    switch (String(type).toLowerCase()) {
      case 'call': return isArabic ? 'مكالمة' : 'Call';
      case 'email': return isArabic ? 'بريد' : 'Email';
      case 'meeting': return isArabic ? 'اجتماع' : 'Meeting';
      case 'task': return isArabic ? 'مهمة' : 'Task';
      case 'note': return isArabic ? 'ملاحظة' : 'Note';
      default: return isArabic ? 'غير محدد' : 'Unknown';
    }
  };

  const toggleActionSelection = (actionId) => {
    setSelectedActions(prev =>
      prev.includes(actionId)
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
  };

  const pendingReplyCount = leadActions.filter(a => {
    if (!a.comments || a.comments.length === 0) return false;
    const lastComment = a.comments[a.comments.length - 1];
    // Check if last comment is NOT by current user
    const isMyComment = (lastComment.userId && String(lastComment.userId) === String(user?.id));
    return !isMyComment;
  }).length;

  const tabs = [
    { id: 'overview', label: isArabic ? 'نظرة عامة' : 'Overview' },
    { id: 'all-actions', label: (isArabic ? 'كل الإجراءات' : 'All Actions') + (pendingReplyCount > 0 ? ` (${pendingReplyCount})` : '') },
    { id: 'communication', label: isArabic ? 'التواصل' : 'Communication' },
    { id: 'attachments', label: isArabic ? 'المرفقات' : 'Attachments' }
  ];

  const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseApi = api?.defaults?.baseURL || '';
    const baseUrl = String(baseApi).replace(/\/api\/?$/i, '') || window.location.origin;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/storage/${cleanPath}`;
  };

  const getFileName = (path) => {
    if (!path) return '';
    return path.split('/').pop();
  };

  const isImage = (path) => {
    if (!path) return false;
    const ext = path.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  // Determine if currently checked in (latest record has no checkOutDate)
  const latestCheckIn = checkInHistory.length > 0 ? checkInHistory[0] : null;
  const isCheckedIn = latestCheckIn && !latestCheckIn.checkOutDate;

  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      alert(isArabic ? 'المتصفح لا يدعم تحديد الموقع' : 'Geolocation is not supported by your browser');
      return;
    }

    const toastEvent = new CustomEvent('app:toast', {
      detail: {
        type: 'info',
        message: isArabic ? 'جاري تحديد الموقع...' : 'Getting location...'
      }
    });
    window.dispatchEvent(toastEvent);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const payload = {
          lat: latitude,
          lng: longitude,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        };

        if (isCheckedIn && latestCheckIn) {
          const body = {
            check_out_date: new Date().toISOString(),
            lat: payload.lat,
            lng: payload.lng,
            address: payload.address,
            status: 'completed'
          };

          api
            .put(`/api/visits/${latestCheckIn.id}`, body)
            .then(res => {
              const updated = res.data;
              setCheckInHistory(prev =>
                prev.map(item => (item.id === updated.id ? updated : item))
              );
              const successEvent = new CustomEvent('app:toast', {
                detail: {
                  type: 'success',
                  message: isArabic ? 'تم تسجيل الانصراف بنجاح' : 'Check-Out recorded successfully'
                }
              });
              window.dispatchEvent(successEvent);
            })
            .catch(error => {
              console.error('Error updating visit (check-out)', error);
              const errorEvent = new CustomEvent('app:toast', {
                detail: {
                  type: 'error',
                  message: isArabic ? 'فشل تسجيل الانصراف' : 'Failed to record check-out'
                }
              });
              window.dispatchEvent(errorEvent);
            });
        } else {
          const body = {
            type: 'lead',
            lead_id: lead?.id,
            customer_name: leadData.name,
            sales_person_name:
              lead?.sales_person ||
              lead?.assignedAgent?.name ||
              leadData?.salesPerson ||
              (isArabic ? 'غير محدد' : 'Unassigned'),
            check_in_date: new Date().toISOString(),
            lat: payload.lat,
            lng: payload.lng,
            address: payload.address
          };

          api
            .post('/api/visits', body)
            .then(res => {
              const created = res.data;
              setCheckInHistory(prev => [created, ...prev]);
              const successEvent = new CustomEvent('app:toast', {
                detail: {
                  type: 'success',
                  message: isArabic ? 'تم تسجيل الحضور بنجاح' : 'Check-In recorded successfully'
                }
              });
              window.dispatchEvent(successEvent);
            })
            .catch(error => {
              console.error('Error creating visit (check-in)', error);
              const errorEvent = new CustomEvent('app:toast', {
                detail: {
                  type: 'error',
                  message: isArabic ? 'فشل تسجيل الحضور' : 'Failed to record check-in'
                }
              });
              window.dispatchEvent(errorEvent);
            });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = isArabic ? 'فشل تحديد الموقع' : 'Failed to get location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = isArabic ? 'تم رفض إذن الموقع. يرجى تفعيل الموقع من إعدادات المتصفح.' : 'Location permission denied. Please enable location in browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = isArabic ? 'معلومات الموقع غير متوفرة.' : 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = isArabic ? 'انتهت مهلة طلب الموقع.' : 'The request to get user location timed out.';
            break;
          default:
            errorMessage = isArabic ? 'حدث خطأ غير معروف أثناء تحديد الموقع.' : 'An unknown error occurred getting location.';
            break;
        }

        const errorEvent = new CustomEvent('app:toast', {
          detail: {
            type: 'error',
            message: errorMessage
          }
        });
        window.dispatchEvent(errorEvent);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const isLight = theme === 'light';
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-0">
      <div className={`${isLight ? 'bg-white/70 backdrop-blur-md text-slate-800' : 'bg-slate-800 text-white'} w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[85vh] h-auto sm:rounded-3xl overflow-y-auto shadow-2xl p-2 sm:p-4`}>
        {/* Header */}
        <div className={`${isLight ? 'bg-white/60 border-gray-200' : 'bg-slate-800 border-slate-700'} p-2 sm:p-4 border-b`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 rtl:space-x-reverse">
              {/* Profile Picture */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-600 rounded-full flex items-center justify-center">
                <FaUser className="text-xl sm:text-2xl text-slate-300" />
              </div>

              {/* Lead Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className={`text-base sm:text-lg font-semibold mb-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{leadData.name}</h2>
                  {/* Lead Seriousness Score Badge */}
                  <div 
                    title={isArabic ? 'تقييم جدية العميل (0-100)' : 'Lead Seriousness Score (0-100)'}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      (effectiveLead?.score || 50) >= 70 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      (effectiveLead?.score || 50) >= 40 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}
                  >
                    {effectiveLead?.score || 50}%
                  </div>
                </div>
                {crmSettings?.showMobileNumber !== false && (
                  <p className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs mb-0.5`}>{leadData.phone}</p>
                )}
                <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-[10px] sm:text-xs`}>{leadData.email}</p>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex flex-col items-end space-y-2 sm:space-y-3">
              {/* Action Buttons Row */}
              <div className="flex items-center justify-end gap-1 sm:gap-2 w-auto relative">
                {/* Removed Check-In Button from here */}
                {/* Removed preview toggle button */}
                <AddActionIconButton visible={canAddAction} onClick={() => setShowAddActionModal(true)} />
                {/* Assign (icon-only) */}
                {!(user?.role?.toLowerCase() === 'sales person' || user?.role?.toLowerCase() === 'salesperson') && !permissions?.is_referral_supervisor && (
                  <button
                    ref={assignMenuBtnRef}
                    onClick={() => setShowReAssignModal(true)}
                    aria-label={isArabic ? 'تعيين' : 'Assign'}
                    title={isArabic ? 'تعيين' : 'Assign'}
                    className="btn-icon relative"
                  >
                    <FaUserCheck className="text-sm" />
                  </button>
                )}
                {false && showAssignMenu && (
                  <div
                    ref={assignMenuRef}
                    className={`${isLight ? 'bg-white/90 backdrop-blur-md border border-gray-200 text-slate-800' : 'bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white'} absolute right-0 top-10 z-50 rounded-xl shadow-xl min-w-[200px] p-2`}
                  >
                    <div className="text-xs font-semibold px-3 py-2 text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      {assignStep === 'members' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignStep('teams');
                            setSelectedTeam(null);
                          }}
                          className="hover:text-blue-600"
                        >
                          {isArabic ? '←' : '←'}
                        </button>
                      )}
                      {assignStep === 'teams'
                        ? (isArabic ? 'اختر الفريق' : 'Select Team')
                        : (isArabic ? 'اختر الموظف' : 'Select Person')
                      }
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {assignStep === 'teams' ? (
                        Object.keys(TEAMS_DATA).map((team) => (
                          <button
                            key={team}
                            onClick={() => {
                              setSelectedTeam(team);
                              setAssignStep('members');
                            }}
                            className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-black/5 text-sm"
                          >
                            <span className="truncate">{team}</span>
                            <span className="text-xs text-gray-400">
                              ({TEAMS_DATA[team].length})
                            </span>
                          </button>
                        ))
                      ) : (
                        TEAMS_DATA[selectedTeam] && TEAMS_DATA[selectedTeam].length > 0 ? (
                          TEAMS_DATA[selectedTeam].map((assignee) => (
                            <button
                              key={assignee}
                              onClick={() => {
                                if (onAssign) onAssign(assignee);
                                setShowAssignMenu(false);
                                setAssignStep('teams');
                                setSelectedTeam(null);
                              }}
                              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-black/5 text-sm ${leadData.salesPerson === assignee ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : ''}`}
                            >
                              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                                {assignee.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate">{assignee}</span>
                              {leadData.salesPerson === assignee && <FaCheckCircle className="ml-auto text-xs" />}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 italic">
                            {isArabic ? 'لا يوجد موظفين' : 'No sales persons found'}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
                {/* Edit Lead (icon-only) */}
                {canEditInfo && !permissions?.is_referral_supervisor && (
                  <button
                    onClick={() => setShowEditLeadModal(true)}
                    aria-label={isArabic ? 'تعديل' : 'Edit'}
                    title={isArabic ? 'تعديل' : 'Edit'}
                    className="btn-icon"
                  >
                    <FaEdit className="text-sm" />
                  </button>
                )}
                {/* Kebab Menu (three vertical dots) */}
                <button
                  ref={headerMenuBtnRef}
                  onClick={() => setShowHeaderMenu(prev => !prev)}
                  aria-label={isArabic ? 'المزيد' : 'More'}
                  title={isArabic ? 'المزيد' : 'More'}
                  className="btn-icon"
                >
                  <FaEllipsisV className="text-sm" />
                </button>
                {/* Dropdown Menu */}
                {showHeaderMenu && (
                  <div ref={headerMenuRef} className={`${isLight ? 'bg-white/70 backdrop-blur-md border border-gray-200 text-slate-800' : 'bg-slate-900/70 backdrop-blur-md border border-slate-700 text-white'} absolute right-12 top-10 z-50 rounded-xl shadow-xl min-w-[220px] p-2`}>

                    <button onClick={() => { setShowHeaderMenu(false); handleCheckIn(); }}
                      className="flex items-center justify-start text-start gap-3 w-full px-3 py-2 rounded-lg hover:bg-black/5 whitespace-nowrap">
                      {isCheckedIn ? <FaCheckCircle className="text-red-500 text-lg flex-shrink-0" /> : <FaMapMarkerAlt className="text-blue-500 text-lg flex-shrink-0" />}
                      <span className="text-sm font-medium">
                        {isCheckedIn
                          ? (isArabic ? 'تسجيل انصراف' : 'Check-Out')
                          : (isArabic ? 'تسجيل حضور' : 'Check-In')}
                      </span>
                    </button>

                    <button onClick={() => { setShowHeaderMenu(false); setShowPaymentPlanModal(true); }}
                      className="flex items-center justify-start text-start gap-3 w-full px-3 py-2 rounded-lg hover:bg-black/5 whitespace-nowrap">
                      <FaDollarSign className="text-emerald-500 text-lg flex-shrink-0" />
                      <span className="text-sm font-medium">
                        {isArabic
                          ? (paymentPlan ? 'تعديل خطة الدفع' : 'إضافة خطة دفع')
                          : (paymentPlan ? 'Edit Payment Plan' : 'Add Payment Plan')}
                      </span>
                    </button>

                    {canConvertToCustomer && (
                      <button onClick={() => {
                        setShowHeaderMenu(false);
                        const ok = window.confirm(isArabic ? 'هل تريد تحويل العميل إلى عميل فعلي؟' : 'Convert this lead to a customer?');
                        if (ok) {
                          const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: isArabic ? 'تم التحويل إلى عميل' : 'Converted to customer' } });
                          window.dispatchEvent(evt);
                        }
                      }}
                        className="flex items-center justify-start text-start gap-3 w-full px-3 py-2 rounded-lg hover:bg-black/5 whitespace-nowrap">
                        <FaUserCheck className="text-yellow-500 text-lg flex-shrink-0" />
                        <span className="text-sm font-medium">{isArabic ? 'تحويل إلى عميل' : 'Convert to Customer'}</span>
                      </button>
                    )}
                  </div>
                )}
                {/* Close (X) - stays far right */}
                <button
                  onClick={onClose}
                  aria-label={isArabic ? 'إغلاق' : 'Close'}
                  className="btn-icon"
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>
              <div className="w-full h-px"></div>

              {/* Status Badges Row */}
              <div className="flex flex-wrap justify-end gap-1 sm:gap-6 rtl:space-x-reverse">
                {/* Supervisor Mode Badge */}
                {permissions.is_referral_supervisor && (
                  <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-600 text-white text-[10px] sm:text-sm rounded-full font-medium shadow-md animate-pulse">
                    {isArabic ? 'مشرف إحالة' : 'Supervisor Mode'}
                  </span>
                )}
                {/* Stage Badge */}
                {(() => {
                  const { style, className } = getStageStyle(leadData.stage);
                  return (
                    <span className={`${className} px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-sm rounded-full font-medium`} style={style}>
                      {leadData.stage || 'N/A'}
                    </span>
                  );
                })()}

                {/* Priority Badge */}
                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-sm rounded-full font-medium border ${getPriorityColor(leadData.priority)}`}>
                  {leadData.priority || 'N/A'}
                </span>

                {/* Sales Person Badge */}
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-500 text-white text-[10px] sm:text-sm rounded-full font-medium">
                  {leadData.salesPerson || 'Unassigned'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <EditLeadModal
          isOpen={showEditLeadModal}
          onClose={() => setShowEditLeadModal(false)}
          onSave={(updatedLead) => { }}
          lead={lead}
          canEditInfo={canEditInfo}
          canEditPhone={canEditPhone}
        />

        {showAddActionModal && (
          <div className="px-0 sm:px-0">
            <AddActionModal
              isOpen={showAddActionModal}
              onClose={() => setShowAddActionModal(false)}
              onSave={handleAddAction}
              lead={effectiveLead}
              isOwnerProp={isOwner}
              isSuperAdminProp={user?.is_super_admin}
              inline={true}
              initialType={actionType}
            />
          </div>
        )}

        <PaymentPlanModal
          isOpen={showPaymentPlanModal}
          onClose={() => setShowPaymentPlanModal(false)}
          onSave={(plan) => {
            const updatedLead = { ...lead, paymentPlan: plan };
            setPaymentPlan(plan);
            if (onUpdateLead) onUpdateLead(updatedLead);
            const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: isArabic ? 'تم حفظ خطة الدفع' : 'Payment plan saved' } });
            window.dispatchEvent(evt);
          }}
          lead={lead}
        />



        <CreateRequestModal
          open={showCreateRequestModal}
          onClose={() => setShowCreateRequestModal(false)}
          onSave={(payload) => {
            const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: isArabic ? 'تم إرسال الطلب بنجاح' : 'Request sent successfully', source: 'lead' } });
            window.dispatchEvent(evt);
          }}
          initial={{ customerName: leadData.name || '', assignedTo: leadData.salesPerson || '' }}
          isRTL={isArabic}
        />

        {/* Tabs */}
        <div className={`${isLight ? 'bg-white/60 border-gray-200' : 'bg-slate-800 border-slate-700'} px-0 sm:px-6 border-b ${showAddActionModal ? 'hidden' : ''}`}>
          <div className="flex justify-between w-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 sm:py-4 px-2 sm:px-4 text-[10px] sm:text-sm font-medium border-b-2 transition-all duration-200 text-center ${activeTab === tab.id
                  ? `${isLight ? 'border-emerald-500 text-slate-900 bg-emerald-50 rounded-t-lg shadow-lg shadow-emerald-200/50 font-semibold' : 'border-emerald-400 text-white bg-emerald-500/20 rounded-t-lg shadow-lg shadow-emerald-500/10 font-semibold'}`
                  : `${isLight ? 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100' : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-700/30'}`
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-2 sm:p-6 ${isLight ? 'bg-white/70' : 'bg-slate-800'} ${showAddActionModal ? 'hidden' : ''}`}>
          {activeTab === 'overview' && (
            <div className="space-y-3 sm:space-y-8">
              {/* Two Column: Current Status (left) and Lead Information (right) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-8">
                {/* Left: Current Status */}
                <div>
                  <h3 className={`${isLight ? 'text-black border-gray-300' : 'text-white border-slate-700'} font-semibold mb-3 border-b pb-2 text-left`}>
                    {isArabic ? 'الحالة الحالية' : 'Current Status'}
                  </h3>
                  <div className="flex justify-around sm:justify-start items-center gap-2 sm:gap-16 mb-4 sm:mb-6">
                    {/* Stat 1 - Dark circle with 3 and "Total Actions" label */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-14 h-14 sm:w-24 sm:h-24 rounded-full mb-1 sm:mb-2 bg-[conic-gradient(#34d399_0_12%,_#334155_12%)]">
                        <div className={`absolute inset-2 rounded-full flex items-center justify-center ${isLight ? 'bg-white border border-gray-300' : 'bg-slate-700 border border-slate-600'}`}>
                          <span className={`text-base sm:text-2xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>
                            {cardsLoading ? '...' : actionStats.total}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] sm:text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {isArabic ? 'إجمالي الإجراءات' : 'Total Actions'}
                      </span>
                    </div>

                    {/* Stat 2 - Green circle with 2 and "Completed" label */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-14 h-14 sm:w-24 sm:h-24 rounded-full mb-1 sm:mb-2 bg-[conic-gradient(#10b981_0_100%)]">
                        <div className={`absolute inset-2 rounded-full flex items-center justify-center ${isLight ? 'bg-white border border-emerald-300' : 'bg-slate-700 border border-emerald-400'}`}>
                          <span className={`text-base sm:text-2xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>
                            {cardsLoading ? '...' : actionStats.completed}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] sm:text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {isArabic ? 'مكتملة' : 'Completed'}
                      </span>
                    </div>

                    {/* Stat 3 - Orange circle with 1 and "Delay" label */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-14 h-14 sm:w-24 sm:h-24 rounded-full mb-1 sm:mb-2 bg-[conic-gradient(#f59e0b_0_100%)]">
                        <div className={`absolute inset-2 rounded-full flex items-center justify-center ${isLight ? 'bg-white border border-orange-300' : 'bg-slate-700 border border-orange-400'}`}>
                          <span className={`text-base sm:text-2xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>
                            {cardsLoading ? '...' : actionStats.delay}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] sm:text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {isArabic ? 'المتأخرات' : 'Delay'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                    <div className="space-y-3 mt-4 sm:mt-6">
                      <h4 className={`${isLight ? 'text-black border-gray-300' : 'text-white border-slate-700'} font-semibold mb-2 sm:mb-3 border-b pb-2`}>
                        {isArabic ? 'إجراءات سريعة' : 'Quick Actions'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 rtl:flex-row-reverse">
                        {canAddAction && (
                          <button
                            onClick={() => setShowAddActionModal(true)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 sm:py-2 px-3 sm:px-4 rounded-full font-medium transition-colors flex items-center justify-center gap-2 flex-grow sm:flex-grow-0"
                          >
                            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-400 flex items-center justify-center">
                              <FaPlus className="text-[10px] sm:text-xs" />
                            </span>
                            <span className="text-xs sm:text-sm whitespace-nowrap">
                              {isArabic ? '+ إضافة إجراء جديد' : '+ Add New Action'}
                            </span>
                          </button>
                        )}
                      <button
                        onClick={() => setActiveTab('attachments')}
                        className={`${isLight ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white py-1.5 sm:py-2 px-3 sm:px-4 rounded-full font-medium transition-colors flex items-center justify-center gap-2 flex-grow sm:flex-grow-0`}
                      >
                        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-400 flex items-center justify-center">
                          <FaPaperclip className="text-[10px] sm:text-xs" />
                        </span>
                        <span className="text-xs sm:text-sm whitespace-nowrap">{isArabic ? 'المرفقات' : 'Attachments'}</span>
                      </button>
                      {canConvertToCustomer && (
                        <button
                          onClick={() => {
                            const ok = window.confirm(isArabic ? 'هل تريد تحويل العميل إلى عميل فعلي؟' : 'Convert this lead to a customer?');
                            if (ok) {
                              console.log(isArabic ? 'تم التحويل إلى عميل' : 'Converted to customer');
                            }
                          }}
                          className={`${isLight ? 'bg-white text-slate-700 border border-gray-300 hover:bg-slate-100' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'} py-1.5 sm:py-2 px-3 sm:px-4 rounded-full font-medium transition-colors flex items-center justify-center gap-2 flex-grow sm:flex-grow-0`}
                        >
                          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-yellow-600 flex items-center justify-center">
                            <FaUserCheck className="text-[10px] sm:text-xs text-white" />
                          </span>
                          <span className="text-xs sm:text-sm whitespace-nowrap">{isArabic ? 'تحويل لعميل' : 'To Customer'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Lead Information */}
                <div className="space-y-2 sm:space-y-4">
                  <h3 className={`text-base sm:text-lg font-semibold mb-2 sm:mb-4 border-b pb-2 ${isLight ? 'text-black border-gray-300' : 'text-white border-slate-700'}`}>
                    {isArabic ? 'بيانات العميل' : 'Lead Information'}
                  </h3>
                  <div className={`space-y-2 sm:space-y-4 p-2 sm:p-4 rounded-lg ${isLight ? 'bg-white border border-gray-200' : 'bg-slate-700'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>
                        {isArabic ? 'الشركة:' : 'Company:'}
                      </span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} text-xs sm:text-sm font-medium text-right`}>{leadData.company}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>
                        {isArabic ? 'الموقع:' : 'Location:'}
                      </span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} text-xs sm:text-sm`}>{leadData.location}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>
                        {isArabic ? 'المصدر:' : 'Source:'}
                      </span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} text-xs sm:text-sm`}>{leadData.source}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>
                        {isArabic ? 'تم الإنشاء بواسطة:' : 'Created By:'}
                      </span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} text-xs sm:text-sm`}>{leadData.createdBy}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>
                        {isArabic ? 'موظف المبيعات:' : 'Sales Person:'}
                      </span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} text-xs sm:text-sm`}>{leadData.salesPerson}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>
                        {isArabic ? 'تاريخ الإنشاء:' : 'Created Date:'}
                      </span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} text-xs sm:text-sm`}>{leadData.createdDate}</span>
                    </div>
                  </div>


                </div>
              </div>

              {/* Payment Plan Information */}
              {paymentPlan && (
                <>
                  <h3 className={`text-base sm:text-lg font-semibold mb-2 sm:mb-4 mt-4 sm:mt-6 border-b pb-2 ${isLight ? 'text-black border-gray-300' : 'text-white border-slate-700'}`}>
                    {isArabic ? 'خطة الدفع' : 'Payment Plan'}
                  </h3>
                  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 p-3 sm:p-6 rounded-lg ${isLight ? 'bg-white border border-gray-200' : 'bg-slate-700'}`}>
                    <div className="flex flex-col gap-1">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>{isArabic ? 'المشروع:' : 'Project:'}</span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} font-medium text-sm sm:text-lg`}>{paymentPlan.projectName || '-'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>{isArabic ? 'رقم الوحدة:' : 'Unit No:'}</span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} font-medium text-sm sm:text-lg`}>{paymentPlan.unitNo || '-'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>{isArabic ? 'سعر الوحدة:' : 'Unit Price:'}</span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} font-medium text-sm sm:text-lg`}>{paymentPlan.totalAmount ? Number(paymentPlan.totalAmount).toLocaleString() : '0'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>{isArabic ? 'الجراج:' : 'Garage:'}</span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} font-medium text-sm sm:text-lg`}>{paymentPlan.garageAmount ? Number(paymentPlan.garageAmount).toLocaleString() : '0'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>{isArabic ? 'الصيانة:' : 'Maintenance:'}</span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} font-medium text-sm sm:text-lg`}>{paymentPlan.maintenanceAmount ? Number(paymentPlan.maintenanceAmount).toLocaleString() : '0'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>{isArabic ? 'صافي المبلغ:' : 'Net Amount:'}</span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} font-bold text-sm sm:text-lg`}>{paymentPlan.netAmount ? Number(paymentPlan.netAmount).toLocaleString() : '0'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>{isArabic ? 'المقدم:' : 'Down Payment:'}</span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} font-medium text-sm sm:text-lg`}>{paymentPlan.downPayment ? Number(paymentPlan.downPayment).toLocaleString() : '0'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>{isArabic ? 'أقساط إضافية:' : 'Extra Installments:'}</span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} font-medium text-sm sm:text-lg`}>{paymentPlan.extraInstallments ? Number(paymentPlan.extraInstallments).toLocaleString() : '0'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>{isArabic ? 'قيمة القسط:' : 'Installment:'}</span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} font-medium text-sm sm:text-lg`}>{paymentPlan.installmentAmount ? Number(paymentPlan.installmentAmount).toLocaleString() : '0'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-xs sm:text-sm`}>{isArabic ? 'عدد الأشهر:' : 'Months:'}</span>
                      <span className={`${isLight ? 'text-black' : 'text-white'} font-medium text-sm sm:text-lg`}>{paymentPlan.noOfMonths || '0'}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Check-In History Table */}
              <div className="mt-4 sm:mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-base sm:text-lg font-semibold ${isLight ? 'text-black border-gray-300' : 'text-white border-slate-700'}`}>
                    {isArabic ? 'سجل الزيارات' : 'Check-In History'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (window.confirm(isArabic ? 'هل أنت متأكد من مسح جميع سجلات الزيارة؟' : 'Are you sure you want to clear all check-in history?')) {
                          localStorage.removeItem('checkInReports');
                          setCheckInHistory([]);
                          const toast = new CustomEvent('app:toast', { detail: { type: 'success', message: isArabic ? 'تم مسح السجل بنجاح' : 'History cleared successfully' } });
                          window.dispatchEvent(toast);
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title={isArabic ? 'مسح السجل' : 'Clear History'}
                    >
                      <FaTrash />
                    </button>
                    <span className={`text-xs sm:text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{isArabic ? 'تاريخ:' : 'Date:'}</span>
                    <input
                      type="date"
                      value={historyDateFilter}
                      onChange={(e) => setHistoryDateFilter(e.target.value)}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg border focus:outline-none ${isLight ? 'bg-white border-gray-300 text-black' : 'bg-slate-600 border-slate-500 text-white'}`}
                    />
                  </div>
                </div>

                <div className={`overflow-x-auto rounded-lg border ${isLight ? 'border-gray-200' : 'border-slate-600'}`}>
                  <table className={`w-full text-xs sm:text-sm text-left ${isArabic ? 'text-right' : ''} ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    <thead className={`text-[10px] sm:text-xs uppercase ${isLight ? 'bg-gray-50 text-slate-700' : 'bg-slate-700 text-slate-300'}`}>
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap">{isArabic ? 'الموظف' : 'Sales Person'}</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap">{isArabic ? 'وقت الحضور' : 'Check-In Time'}</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap">{isArabic ? 'وقت الانصراف' : 'Check-Out Time'}</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap">{isArabic ? 'موقع الحضور' : 'Check-In Location'}</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap">{isArabic ? 'موقع الانصراف' : 'Check-Out Location'}</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap">{isArabic ? 'الحالة' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                      {filteredCheckInHistory.length > 0 ? (
                        filteredCheckInHistory.map((item) => (
                          <tr key={item.id} className={`${isLight ? 'bg-white hover:bg-gray-50' : 'bg-slate-800 hover:bg-slate-700'}`}>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap dark:text-white">
                              {(() => {
                                let displayName = item.salesPerson;
                                // If numeric or looks like ID, try to lookup
                                if (usersList && usersList.length > 0 && (!displayName || !isNaN(displayName))) {
                                  const user = usersList.find(u => u.id == displayName);
                                  if (user) displayName = user.name;
                                }
                                return displayName || '-';
                              })()}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span>{new Date(item.checkInDate).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}</span>
                                <span className="text-[10px] sm:text-xs text-gray-500">{new Date(item.checkInDate).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                              {item.checkOutDate ? (
                                <div className="flex flex-col">
                                  <span>{new Date(item.checkOutDate).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}</span>
                                  <span className="text-[10px] sm:text-xs text-gray-500">{new Date(item.checkOutDate).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[100px] sm:max-w-[150px]" title={item.location?.address || `${item.location?.lat}, ${item.location?.lng}`}>
                                  {item.location?.address || (item.location?.lat ? `${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}` : '-')}
                                </span>
                                {item.location && (item.location.lat || item.location.address) && (
                                  <button
                                    onClick={() => {
                                      const url = item.location.lat && item.location.lng
                                        ? `https://www.google.com/maps/search/?api=1&query=${item.location.lat},${item.location.lng}`
                                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location.address)}`;
                                      window.open(url, '_blank');
                                    }}
                                    className="px-2 py-1 text-[10px] sm:text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                                    title={isArabic ? 'عرض موقع الحضور' : 'Preview Check-In Location'}
                                  >
                                    <FaMapMarkerAlt />
                                    {isArabic ? 'عرض' : 'Preview'}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[100px] sm:max-w-[150px]" title={item.checkOutLocation?.address || `${item.checkOutLocation?.lat}, ${item.checkOutLocation?.lng}`}>
                                  {item.checkOutLocation?.address || (item.checkOutLocation?.lat ? `${item.checkOutLocation.lat.toFixed(4)}, ${item.checkOutLocation.lng.toFixed(4)}` : '-')}
                                </span>
                                {item.checkOutLocation && (item.checkOutLocation.lat || item.checkOutLocation.address) && (
                                  <button
                                    onClick={() => {
                                      const url = item.checkOutLocation.lat && item.checkOutLocation.lng
                                        ? `https://www.google.com/maps/search/?api=1&query=${item.checkOutLocation.lat},${item.checkOutLocation.lng}`
                                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.checkOutLocation.address)}`;
                                      window.open(url, '_blank');
                                    }}
                                    className="px-2 py-1 text-[10px] sm:text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                                    title={isArabic ? 'عرض موقع الانصراف' : 'Preview Check-Out Location'}
                                  >
                                    <FaMapMarkerAlt />
                                    {isArabic ? 'عرض' : 'Preview'}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${item.status === 'completed' ? 'bg-green-100 text-green-800' :
                                item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                {item.status === 'pending'
                                  ? (isArabic ? 'تشيك ان' : 'Check-In')
                                  : item.status === 'completed'
                                    ? (isArabic ? 'تشيك اوت' : 'Check-Out')
                                    : (item.status || '-')
                                }
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                            {isArabic ? 'لا توجد سجلات زيارة' : 'No check-in history found'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>


            </div>
          )}

          {/* Other tab contents */}
          {activeTab === 'all-actions' && (
            <div className="space-y-6">
              {/* Type cards: All Actions / Calls Done / Messages / Meetings */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <button
                  onClick={() => { setFilterType('all'); setFilterStatus('all'); }}
                  className={`${isLight ? 'bg-white border border-gray-200 hover:bg-slate-100' : 'bg-slate-700 border border-slate-600 hover:bg-slate-600'} p-5 rounded-xl text-center transition-colors`}
                >
                  <div className={`text-2xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>{leadActions.length}</div>
                  <div className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-sm`}>{isArabic ? 'كل الإجراءات' : 'All Actions'}</div>
                </button>
                <button
                  onClick={() => { setFilterType('call'); setFilterStatus('completed'); }}
                  className={`${isLight ? 'bg-white border border-green-300 hover:bg-slate-100' : 'bg-slate-700 border border-green-600 hover:bg-slate-600'} p-5 rounded-xl text-center transition-colors`}
                >
                  <div className="text-2xl font-bold text-green-400">{leadActions.filter(a => String(a.type).toLowerCase() === 'call').length}</div>
                  <div className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-sm`}>{isArabic ? 'مكالمات مكتملة' : 'Calls Done'}</div>
                </button>
                <button
                  onClick={() => { setFilterType('email'); setFilterStatus('all'); }}
                  className={`${isLight ? 'bg-white border border-blue-300 hover:bg-slate-100' : 'bg-slate-700 border border-blue-600 hover:bg-slate-600'} p-5 rounded-xl text-center transition-colors`}
                >
                  <div className="text-2xl font-bold text-blue-400">{leadActions.filter(a => ['email', 'whatsapp', 'sms'].includes(String(a.type).toLowerCase())).length}</div>
                  <div className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-sm`}>{isArabic ? 'الرسائل' : 'Messages'}</div>
                </button>
                <button
                  onClick={() => { setFilterType('meeting'); setFilterStatus('all'); }}
                  className={`${isLight ? 'bg-white border border-purple-300 hover:bg-slate-100' : 'bg-slate-700 border border-purple-600 hover:bg-slate-600'} p-5 rounded-xl text-center transition-colors`}
                >
                  <div className="text-2xl font-bold text-purple-400">{leadActions.filter(a => String(a.type).toLowerCase() === 'meeting' || String(a.next_action_type).toLowerCase() === 'meeting').length}</div>
                  <div className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-sm`}>{isArabic ? 'الاجتماعات' : 'Meetings'}</div>
                </button>
              </div>

              {/* Simple header with Add button */}
              <div className="flex items-center justify-between mb-2">
                <h3 className={`${isLight ? 'text-black' : 'text-white'} font-semibold`}>{isArabic ? 'الإجراءات' : 'Actions'}</h3>
                {canAddAction && (
                  <button
                    onClick={() => setShowAddActionModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <FaPlus />
                    {isArabic ? 'إضافة إجراء جديد' : 'Add New Action'}
                  </button>
                )}
              </div>

              {/* Search and Filters (Status & Type) */}
              <div className={`${isLight ? 'bg-white border border-gray-200' : 'bg-slate-700'} p-4 rounded-lg space-y-3 mb-2`}>
                <div className="flex flex-row gap-3 items-center">
                  <div className="flex-1 relative w-full">
                    <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      placeholder={isArabic ? 'البحث في الإجراءات...' : 'Search actions...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg placeholder-slate-400 focus:outline-none ${isLight ? 'bg-white border border-gray-300 text-black focus:border-emerald-500' : 'bg-slate-600 border border-slate-500 text-white focus:border-emerald-400'}`}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className={`rounded-lg px-3 py-2 text-sm focus:outline-none ${isLight ? 'bg-white border border-gray-300 text-black focus:border-emerald-500' : 'bg-slate-600 border border-slate-500 text-white focus:border-emerald-400'}`}
                    >
                      <option value="all">{isArabic ? 'جميع الأنواع' : 'All types'}</option>
                      <option value="call">{isArabic ? 'مكالمة' : 'Call'}</option>
                      <option value="email">{isArabic ? 'بريد' : 'Email'}</option>
                      <option value="meeting">{isArabic ? 'اجتماع' : 'Meeting'}</option>
                      <option value="task">{isArabic ? 'مهمة' : 'Task'}</option>
                      <option value="note">{isArabic ? 'ملاحظة' : 'Note'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions List */}
              <div className="space-y-4">
                {filteredActions.length === 0 ? (
                  /* Empty State */
                  <div className={`text-center py-12 rounded-lg ${isLight ? 'bg-white border border-gray-200' : 'bg-slate-700'}`}>
                    <FaList className={`mx-auto text-4xl mb-4 ${isLight ? 'text-slate-500' : 'text-slate-500'}`} />
                    <h3 className={`text-lg font-medium mb-2 ${isLight ? 'text-black' : 'text-slate-300'}`}>لا توجد إجراءات</h3>
                    <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} mb-4`}>
                      {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                        ? 'لم يتم العثور على إجراءات تطابق البحث أو الفلتر المحدد'
                        : 'لم يتم إنشاء أي إجراءات بعد'
                      }
                    </p>
                    {canAddAction && (
                      <button
                        onClick={() => setShowAddActionModal(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <FaPlus className="inline mr-2" />
                        {isArabic ? 'إضافة أول إجراء' : 'Add First Action'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={`rounded-xl overflow-hidden ${isLight ? 'bg-white border border-gray-200 divide-y divide-gray-300' : 'border border-slate-600 divide-y divide-slate-600'}`}>
                    {filteredActions.map((action) => (
                      <div
                        key={action.id}
                        id={`action-${action.id}`}
                        className={`flex items-start gap-4 p-4 transition-colors ${isLight ? 'bg-white hover:bg-slate-50' : 'bg-slate-700 hover:bg-slate-600'} ${selectedActions.includes(action.id) ? (isLight ? 'bg-emerald-50' : 'bg-emerald-500/5') : ''}`}
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isLight ? 'bg-slate-200' : 'bg-slate-600'}`}>
                          {getActionIcon(action.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`${isArabic ? 'text-right' : ''}`}>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 min-w-0">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs`}>{isArabic ? 'اسم العميل:' : 'Lead Name:'}</span>
                                <span className={`${isLight ? 'text-black' : 'text-white'} font-semibold max-w-[220px] break-words`}>{leadData.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs`}>{isArabic ? 'المرحلة:' : 'Stage:'}</span>
                                {(() => {
                                  const actionStage = getActionStage(action);
                                  const { style, className } = getStageStyle(actionStage);
                                  return <span className={className} style={style}>{actionStage}</span>;
                                })()}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs`}>{isArabic ? 'الأولوية:' : 'Priority:'}</span>
                                <span className={`px-2 py-1 rounded border text-xs ${getPriorityColor(action.priority)}`}>{isArabic ? (action.priority === 'high' ? 'عالية' : action.priority === 'medium' ? 'متوسطة' : 'منخفضة') : (action.priority === 'high' ? 'High' : action.priority === 'medium' ? 'Medium' : 'Low')}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs`}>{isArabic ? 'نوع الإجراء:' : 'Action Type:'}</span>
                                <span className={`px-2 py-1 rounded border text-xs ${getTypeColor(action.type)}`}>{getTypeLabel(action.type)}</span>
                              </div>
                              {/* Meeting Status Display */}
                              {action.type === 'meeting' && action.details?.meeting_status && (
                                <div className="flex items-center gap-1">
                                  <span className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs`}>{isArabic ? 'حالة الاجتماع:' : 'Meeting Status:'}</span>
                                  <span className={`px-2 py-1 rounded border text-xs font-bold ${
                                    action.details.meeting_status === 'done' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                    action.details.meeting_status === 'no_show' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                    action.details.meeting_status === 'cancelled' ? 'bg-gray-500/10 text-gray-500 border-gray-500/20' :
                                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                  }`}>
                                    {(() => {
                                      const s = action.details.meeting_status;
                                      if (isArabic) {
                                        if (s === 'scheduled') return 'مجدول';
                                        if (s === 'done') return 'تم بنجاح';
                                        if (s === 'no_show') return 'لم يحضر (ميسد)';
                                        if (s === 'cancelled') return 'ملغي';
                                      }
                                      return String(s).charAt(0).toUpperCase() + String(s).slice(1).replace('_', ' ');
                                    })()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 min-w-0">
                                <span className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs`}>{isArabic ? 'مسؤول المبيعات:' : 'Sales Person:'}</span>
                                <span className={`${isLight ? 'text-slate-800' : 'text-slate-300'} max-w-[200px] break-words`}>
                                  {leadData.salesPerson || (isArabic ? 'غير محدد' : 'Not specified')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <span className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs`}>{isArabic ? 'قام بالإجراء:' : 'Action By:'}</span>
                                <span className={`${isLight ? 'text-slate-800' : 'text-slate-300'} max-w-[200px] break-words`}>
                                  {action.user}
                                  {(action.userRole && (action.userRole.toLowerCase().includes('manager') || action.userRole.toLowerCase().includes('admin'))) && (
                                    <span className="text-xs text-gray-500 mx-1">({isArabic ? 'كمدير' : 'as manager'})</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <span className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs`}>{isArabic ? 'تاريخ الانشاء:' : 'Creation Date:'}</span>
                                <span className={`${isLight ? 'text-slate-800' : 'text-slate-300'} whitespace-nowrap`}>
                                  {(() => {
                                    if (!action.created_at) return '-';
                                    const d = new Date(action.created_at);
                                    return d.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US') + ' ' + d.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs`}>{isArabic ? 'الموعد القادم:' : 'Scheduled Next Action:'}</span>
                                <span className={`${isLight ? 'text-slate-800' : 'text-slate-300'} whitespace-nowrap`}>
                                  {(() => {
                                    const datePart = (action.date || '').includes('T') ? action.date.split('T')[0] : action.date;
                                    return `${datePart} ${action.time ? String(action.time).slice(0, 5) : ''}`;
                                  })()}
                                </span>
                              </div>
                            </div>
                          <div className="mt-2 w-full">
                            <div className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs mb-1`}>{isArabic ? 'الملاحظات:' : 'Notes:'}</div>
                            <div className={`${isLight ? 'text-black' : 'text-slate-300'} text-sm break-words whitespace-pre-line mb-4`}>{action.description || action.notes}</div>

                            {/* Comments Section */}
                            <div className={`mt-4 pt-4 border-t ${isLight ? 'border-gray-200' : 'border-slate-600'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <h5 className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                                  {isArabic ? 'التعليقات' : 'Comments'} ({action.comments ? action.comments.length : 0})
                                </h5>
                                {action.comments && action.comments.length > 0 && (
                                  <button
                                    onClick={() => setExpandedComments(prev => ({ ...prev, [action.id]: !prev[action.id] }))}
                                    className={`text-xs flex items-center gap-1 ${isLight ? 'text-blue-600 hover:text-blue-800' : 'text-blue-400 hover:text-blue-300'}`}
                                  >
                                    {expandedComments[action.id] ? (isArabic ? 'إخفاء' : 'Hide') : (isArabic ? 'إظهار' : 'Show')}
                                    <FaChevronDown className={`transform transition-transform ${expandedComments[action.id] ? 'rotate-180' : ''}`} />
                                  </button>
                                )}
                              </div>
                              
                              {/* Comments List */}
                              {expandedComments[action.id] && action.comments && action.comments.length > 0 ? (
                                <div className="space-y-3 mb-4 max-h-52 overflow-y-auto pr-1">
                                  {action.comments.map((comment, idx) => (
                                    <div key={comment.id || idx} className={`flex gap-3 ${isLight ? 'bg-gray-50' : 'bg-slate-800'} p-3 rounded-lg`}>
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                        (comment.role || '').toLowerCase().includes('manager') ? 'bg-purple-500' :
                                        (comment.role || '').toLowerCase().includes('referral') ? 'bg-orange-500' :
                                        'bg-blue-500'
                                      }`}>
                                        {(comment.user || 'U').charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className={`text-xs font-bold block ${isLight ? 'text-slate-800' : 'text-white'}`}>{comment.user}</span>
                                            <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{comment.role || 'User'}</span>
                                          </div>
                                          <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {new Date(comment.createdAt).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                          </span>
                                        </div>
                                        <p className={`text-xs mt-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{comment.text}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              {/* Add Comment Input */}
                              {(() => {
                                // RBAC Logic
                                const role = (user?.role || '').toLowerCase();
                                const isManager = ['admin', 'manager', 'director', 'owner', 'super admin', 'superadmin'].some(r => role.includes(r));
                                const isReferral = role.includes('referral');
                                const isAssigned = lead?.assigned_to == user?.id || lead?.assignedTo == user?.id || 
                                                   (leadData.salesPerson === user?.name);
                                
                                const canComment = isManager || isReferral || isAssigned || user?.is_super_admin;

                                if (!canComment) return null;

                                return (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={commentInputs[action.id] || ''}
                                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [action.id]: e.target.value }))}
                                      placeholder={isArabic ? 'أضف تعليقاً...' : 'Add a comment...'}
                                      className={`flex-1 text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                        isLight ? 'bg-white border-gray-300 text-black' : 'bg-slate-600 border-slate-500 text-white'
                                      }`}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleActionCommentSubmit(action.id, commentInputs[action.id]);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => handleActionCommentSubmit(action.id, commentInputs[action.id])}
                                      disabled={commentSubmitting[action.id] || !commentInputs[action.id]?.trim()}
                                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        commentSubmitting[action.id] || !commentInputs[action.id]?.trim()
                                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                      }`}
                                    >
                                      {commentSubmitting[action.id] ? (isArabic ? '...' : '...') : (isArabic ? 'إرسال' : 'Post')}
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          {(() => {
                            const extra = getActionExtraFields(action);
                            if (!extra || extra.length === 0) return null;
                            return (
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {extra.map(field => (
                                  <div key={field.key} className="text-xs">
                                    <span className={`${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{field.label}: </span>
                                    <span className={`${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{field.value}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          </div>
                        </div>
                        {/* Removed trailing preview/edit buttons */}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="p-8 space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                    <div className="bg-blue-500 p-2 rounded-xl mr-3 ml-3 rtl:mr-0 rtl:ml-3">
                      <FaComments className="text-white text-sm" />
                    </div>
                    {isArabic ? 'التواصل مع العميل' : 'Client Communication'}
                    {unreadComm > 0 && <span className="mx-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadComm}</span>}
                  </h3>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <button className="p-2 text-gray-500 hover:text-blue-500 transition-colors">
                      <FaFilter />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions (ordered: Call / WhatsApp / Email / Google Meet) */}
              {canAddAction && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {crmSettings?.showMobileNumber !== false && (
                  <>
                    <button
                      onClick={() => { const raw = lead?.phone || ''; const digits = String(raw).replace(/[^0-9]/g, ''); if (digits) window.open(`tel:${digits}`, '_blank'); }}
                      className={`${isLight ? 'bg-white/70 backdrop-blur-md text-slate-800 border border-gray-200 hover:bg-white/80' : 'bg-slate-800/70 backdrop-blur-md text-white border border-slate-700 hover:bg-slate-800/80'} flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl`}
                    >
                      <FaPhone className="text-2xl mb-2" style={{ color: '#2563EB' }} />
                      <span className="text-sm font-medium">{isArabic ? 'مكالمة' : 'Call'}</span>
                    </button>
                    <button
                      onClick={() => { const raw = lead?.phone || ''; const digits = String(raw).replace(/[^0-9]/g, ''); if (digits) window.open(`https://wa.me/${digits}`, '_blank'); }}
                      className={`${isLight ? 'bg-white/70 backdrop-blur-md text-slate-800 border border-gray-200 hover:bg-white/80' : 'bg-slate-800/70 backdrop-blur-md text-white border border-slate-700 hover:bg-slate-800/80'} flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl`}
                    >
                      <FaWhatsapp className="text-2xl mb-2" style={{ color: '#25D366' }} />
                      <span className="text-sm font-medium">{isArabic ? 'واتساب' : 'WhatsApp'}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => { if (lead?.email) window.open(`mailto:${lead.email}`, '_blank'); }}
                  className={`${isLight ? 'bg-white/70 backdrop-blur-md text-slate-800 border border-gray-200 hover:bg-white/80' : 'bg-slate-800/70 backdrop-blur-md text-white border border-slate-700 hover:bg-slate-800/80'} flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl`}
                >
                  <FaEnvelope className="text-2xl mb-2" style={{ color: '#FFA726' }} />
                  <span className="text-sm font-medium">{isArabic ? 'بريد إلكتروني' : 'Email'}</span>
                </button>
                <button
                  onClick={() => window.open('https://meet.google.com/new', '_blank')}
                  className={`${isLight ? 'bg-white/70 backdrop-blur-md text-slate-800 border border-gray-200 hover:bg-white/80' : 'bg-slate-800/70 backdrop-blur-md text-white border border-slate-700 hover:bg-slate-800/80'} flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl`}
                >
                  <img alt="Google Meet" className="w-6 h-6 mb-2" src={"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'><rect x='2' y='4' width='12' height='16' rx='3' fill='%23ffffff'/><rect x='2' y='4' width='12' height='4' rx='2' fill='%234285F4'/><rect x='2' y='4' width='4' height='16' rx='2' fill='%2334A853'/><rect x='10' y='4' width='4' height='16' rx='2' fill='%23FBBC05'/><rect x='2' y='16' width='12' height='4' rx='2' fill='%23EA4335'/><polygon points='14,9 22,5 22,19 14,15' fill='%2334A853'/></svg>"} />
                  <span className="text-sm font-medium">{isArabic ? 'جوجل ميت' : 'Google Meet'}</span>
                </button>
              </div>
              )}

              {/* Filters */}
              <div className={`${isLight ? 'bg-white rounded-xl p-4 border border-gray-100 shadow-sm' : 'bg-slate-900/60 backdrop-blur-md rounded-xl p-4 border border-slate-700 shadow-sm'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-medium ${isLight ? 'text-gray-600' : 'text-white'}`}>{isArabic ? 'فلترة:' : 'Filter:'}</span>
                  <button onClick={() => setCommFilter('all')} className={`px-3 py-1 rounded-full text-xs transition-colors ${commFilter === 'all' ? (isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/30 text-white border border-blue-500') : (isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-slate-800/60 text-white border border-slate-700 hover:bg-slate-800/80')}`}>
                    {isArabic ? 'الكل' : 'All'}
                  </button>
                  <button onClick={() => setCommFilter('whatsapp')} className={`px-3 py-1 rounded-full text-xs transition-colors ${commFilter === 'whatsapp' ? (isLight ? 'bg-green-100 text-green-700' : 'bg-green-500/30 text-white border border-green-500') : (isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-slate-800/60 text-white border border-slate-700 hover:bg-slate-800/80')}`}>
                    {isArabic ? 'واتساب' : 'WhatsApp'}
                  </button>
                  <button onClick={() => setCommFilter('email')} className={`px-3 py-1 rounded-full text-xs transition-colors ${commFilter === 'email' ? (isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/30 text-white border border-blue-500') : (isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-slate-800/60 text-white border border-slate-700 hover:bg-slate-800/80')}`}>
                    {isArabic ? 'بريد إلكتروني' : 'Email'}
                  </button>

                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`${isLight ? 'bg-white rounded-2xl p-6 border border-gray-100 shadow-sm' : 'bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700 shadow-sm'} md:col-span-2`}>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className={`text-lg font-medium ${isLight ? 'text-black' : 'text-white'}`}>{isArabic ? 'سجل واتساب' : 'WhatsApp Chat'}</h4>
                    <div className="text-sm">{waLoading ? (isArabic ? 'جاري التحميل...' : 'Loading...') : ''}</div>
                  </div>
                  <div className={`${waMessages.length > 3 ? 'max-h-64 overflow-y-auto pr-1' : ''} space-y-3`}>
                    {waMessages.map((m) => (
                      <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`${m.direction === 'outbound' ? 'bg-green-500 text-white' : 'bg-white text-gray-800'} max-w-[75%] rounded-xl px-3 py-2 border ${m.direction === 'outbound' ? 'border-green-600' : 'border-gray-200'} shadow-sm`}>
                          <div className="text-sm">{m.body || '-'}</div>
                          <div className="mt-1 text-[10px] opacity-70 flex items-center gap-2">
                            <span>{new Date(m.timestamp).toLocaleString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>{m.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {waMessages.length === 0 && !waLoading && (
                      <div className={`${isLight ? 'text-gray-500' : 'text-white/70'} text-sm`}>{isArabic ? 'لا توجد رسائل' : 'No messages'}</div>
                    )}
                  </div>
                  <div className="mt-6">
                    {canAddAction ? (
                    <>
                    <div className="flex items-center gap-2 mb-2">
                      <FaWhatsapp className="text-green-500" />
                      <span className={`text-sm ${isLight ? 'text-black' : 'text-white'}`}>{isArabic ? 'اكتب رسالة' : 'Type a message'}</span>
                    </div>
                    <textarea
                      rows="3"
                      value={textBody}
                      onChange={(e) => setTextBody(e.target.value)}
                      placeholder={isArabic ? 'اكتب رسالتك...' : 'Type your message...'}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLight ? 'border-gray-300' : 'bg-slate-800/70 text-white border-slate-700 placeholder-slate-300'}`}
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        disabled={sendingText || !textBody.trim()}
                        onClick={async () => {
                          if (sendingText) return;
                          const raw = lead?.phone || lead?.mobile || '';
                          const digits = String(raw).replace(/[^0-9]/g, '');
                          const inbound = [...waMessages].filter(x => x.direction === 'inbound').pop();
                          if (!inbound || (Date.now() - new Date(inbound.timestamp).getTime()) > 24 * 60 * 60 * 1000) {
                            alert(isArabic ? 'لا يمكن إرسال رسالة حرة. مر أكثر من 24 ساعة على آخر رسالة من العميل. الرجاء استخدام قالب لبدء محادثة جديدة.' : 'Cannot send free-form. More than 24 hours since last customer message. Use a template.');
                            return;
                          }
                          setSendingText(true);
                          try {
                            const res = await sendWhatsappText({ recipient_number: digits, message_body: textBody.trim() });
                            const ok = !!res?.ok;
                            setWaMessages(prev => [...prev, {
                              body: textBody.trim(),
                              direction: 'outbound',
                              timestamp: new Date().toISOString(),
                              status: ok ? 'sent' : 'failed',
                              type: 'text',
                              id: Math.random().toString(36).slice(2),
                            }]);
                            setTextBody('');
                          } catch {
                          } finally {
                            setSendingText(false);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg ${sendingText ? 'opacity-60' : ''} ${isLight ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-500 text-white'}`}
                      >
                        {sendingText ? (isArabic ? 'جاري الإرسال...' : 'Sending...') : (isArabic ? 'إرسال' : 'Send')}
                      </button>
                    </div>
                    </>
                    ) : (
                      <div className="text-sm opacity-60 text-center py-4">{isArabic ? 'لا يمكنك إرسال رسائل لأنك لست المالك' : 'You cannot send messages because you are not the owner'}</div>
                    )}
                  </div>
                </div>
                <div className={`${isLight ? 'bg-white rounded-2xl p-6 border border-gray-100 shadow-sm' : 'bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700 shadow-sm'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`text-lg font-medium ${isLight ? 'text-black' : 'text-white'}`}>{isArabic ? 'قوالب واتساب' : 'WhatsApp Templates'}</h4>
                    <div className="text-sm">{tplLoading ? (isArabic ? 'جاري التحميل...' : 'Loading...') : ''}</div>
                  </div>
                  <div className="space-y-3">
                    {templates.map((t) => (
                      <div key={t.id} className="rounded-xl border border-gray-200 dark:border-slate-700 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`text-sm font-semibold ${isLight ? 'text-black' : 'text-white'}`}>{t.name}</div>
                            <div className="text-xs opacity-70">{t.language}</div>
                          </div>
                          <button
                            disabled={sendingTpl === t.name}
                            onClick={async () => {
                              const raw = lead?.phone || lead?.mobile || '';
                              const digits = String(raw).replace(/[^0-9]/g, '');
                              setSendingTpl(t.name);
                              try {
                                const res = await sendWhatsappTemplate({ recipient_number: digits, template_name: t.name, variables: {} });
                                const ok = !!res?.ok;
                                setWaMessages(prev => [...prev, {
                                  body: t.body || t.name,
                                  direction: 'outbound',
                                  timestamp: new Date().toISOString(),
                                  status: ok ? 'sent' : 'failed',
                                  type: 'template',
                                  id: Math.random().toString(36).slice(2),
                                }]);
                              } catch { }
                              setSendingTpl('');
                            }}
                            className={`px-3 py-1 rounded-md text-xs ${isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white'}`}
                          >
                            {sendingTpl === t.name ? (isArabic ? 'جاري الإرسال...' : 'Sending...') : (isArabic ? 'إرسال' : 'Send')}
                          </button>
                        </div>
                        <div className="mt-2 text-xs opacity-80">{t.body}</div>
                      </div>
                    ))}
                    {templates.length === 0 && !tplLoading && (
                      <div className="text-sm opacity-70">{isArabic ? 'لا توجد قوالب' : 'No templates found'}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Email Panel */}
              <div className={`${isLight ? 'bg-white rounded-2xl p-6 border border-gray-100 shadow-sm' : 'bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700 shadow-sm'} mt-6`}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className={`text-lg font-medium ${isLight ? 'text-black' : 'text-white'}`}>{isArabic ? 'سجل البريد الإلكتروني' : 'Email Thread'}</h4>
                  <div className="text-sm">{emailLoading ? (isArabic ? 'جاري التحميل...' : 'Loading...') : ''}</div>
                </div>
                <div className="space-y-3">
                  {emailMessages.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`${m.direction === 'outbound' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'} max-w-[75%] rounded-xl px-3 py-2 border ${m.direction === 'outbound' ? 'border-blue-600' : 'border-gray-200'} shadow-sm`}>
                        <div className="text-xs font-semibold opacity-80">{m.subject || (isArabic ? 'بدون عنوان' : 'No Subject')}</div>
                        <div className="text-sm whitespace-pre-wrap">{m.body || '-'}</div>
                        <div className="mt-1 text-[10px] opacity-70 flex items-center gap-2">
                          <span>{new Date(m.timestamp).toLocaleString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>{m.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {emailMessages.length === 0 && !emailLoading && (
                    <div className={`${isLight ? 'text-gray-500' : 'text-white/70'} text-sm`}>{isArabic ? 'لا توجد رسائل بريد' : 'No email messages'}</div>
                  )}
                </div>
                <div className="mt-6">
                  {canAddAction ? (
                  <>
                  <div className="flex items-center gap-2 mb-2">
                    <FaEnvelope className="text-orange-400" />
                    <span className={`text-sm ${isLight ? 'text-black' : 'text-white'}`}>{isArabic ? 'اكتب بريدًا' : 'Compose email'}</span>
                  </div>
                  <div className="mb-2">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        const tpl = emailTemplates.find(t => String(t.id) === String(id));
                        if (tpl) {
                          setEmailSubject((tpl.subject || '').trim());
                          setEmailBody((tpl.body || '').trim());
                        }
                        e.target.value = '';
                      }}
                      className={`w-full mb-2 px-3 py-2 border rounded-lg ${isLight ? 'border-gray-300' : 'bg-slate-800/70 text-white border-slate-700'}`}
                    >
                      <option value="">{isArabic ? 'اختر قالباً' : 'Choose a template'}</option>
                      {emailTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={isArabic ? 'العنوان' : 'Subject'}
                    className={`w-full mb-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLight ? 'border-gray-300' : 'bg-slate-800/70 text-white border-slate-700 placeholder-slate-300'}`}
                  />
                  <textarea
                    rows="4"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder={isArabic ? 'محتوى البريد...' : 'Email body...'}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLight ? 'border-gray-300' : 'bg-slate-800/70 text-white border-slate-700 placeholder-slate-300'}`}
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim() || !lead?.email}
                      onClick={async () => {
                        if (sendingEmail) return;
                        setSendingEmail(true);
                        try {
                          const res = await sendEmailText({
                            lead_id: lead?.id,
                            recipient_email: lead?.email,
                            subject: emailSubject.trim(),
                            body: emailBody.trim(),
                          });
                          const ok = !!res?.ok;
                          setEmailMessages(prev => [...prev, {
                            subject: emailSubject.trim(),
                            body: emailBody.trim(),
                            direction: 'outbound',
                            timestamp: new Date().toISOString(),
                            status: ok ? 'sent' : 'failed',
                            id: Math.random().toString(36).slice(2),
                          }]);
                          setEmailSubject('');
                          setEmailBody('');
                        } catch { }
                        setSendingEmail(false);
                      }}
                      className={`px-4 py-2 rounded-lg ${sendingEmail ? 'opacity-60' : ''} ${isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white'}`}
                    >
                      {sendingEmail ? (isArabic ? 'جاري الإرسال...' : 'Sending...') : (isArabic ? 'إرسال' : 'Send')}
                    </button>
                  </div>
                  </>
                  ) : (
                    <div className="text-sm opacity-60 text-center py-4">{isArabic ? 'لا يمكنك إرسال بريد لأنك لست المالك' : 'You cannot send emails because you are not the owner'}</div>
                  )}
                </div>
              </div>

              {/* Compose Panel moved near Add Message button */}

              {/* Quick Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <h5 className="font-medium text-green-800 mb-2">{isArabic ? 'أفضل قناة استجابة' : 'Best Response Channel'}</h5>
                  <p className="text-2xl font-bold text-green-600">WhatsApp</p>
                  <p className="text-sm text-green-600">{isArabic ? '85% نسبة الرد' : '85% Response Rate'}</p>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <h5 className="font-medium text-blue-800 mb-2">{isArabic ? 'زمن الرد المتوسط' : 'Avg Response Time'}</h5>
                  <p className="text-2xl font-bold text-blue-600">2.5h</p>
                  <p className="text-sm text-blue-600">{isArabic ? 'تحسن بنسبة 15%' : '15% Improvement'}</p>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <h5 className="font-medium text-purple-800 mb-2">{isArabic ? 'نشاط هذا الأسبوع' : 'This Week Activity'}</h5>
                  <p className="text-2xl font-bold text-purple-600">12</p>
                  <p className="text-sm text-purple-600">{isArabic ? 'تفاعل جديد' : 'New Interactions'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className={`${isLight ? 'text-black' : 'text-white'} font-semibold`}>
                  {isArabic ? 'المرفقات' : 'Attachments'} ({allAttachments.length})
                </h3>
              </div>

              {allAttachments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <FaFileAlt className="text-4xl mb-3 opacity-50" />
                  <p>{isArabic ? 'لا توجد مرفقات' : 'No attachments found'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {allAttachments.map((item, index) => {
                    const url = getFileUrl(item.path);
                    const name = getFileName(item.path);
                    const isImg = isImage(item.path);

                    return (
                      <div key={index} className={`group relative rounded-xl border overflow-hidden transition-all hover:shadow-md ${isLight ? 'bg-white border-gray-200' : 'bg-slate-700 border-slate-600'}`}>
                        <div className="aspect-square bg-gray-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden relative">
                          {isImg ? (
                            <img src={url} alt={name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <FaFileAlt className="text-4xl text-blue-400" />
                          )}
                          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                            {item.source}
                          </div>
                        </div>
                        <div className="p-3">
                          <p className={`text-sm font-medium truncate mb-1 ${isLight ? 'text-gray-700' : 'text-gray-200'}`} title={name}>{name}</p>
                          <p className="text-xs text-gray-500 mb-2">{item.date ? new Date(item.date).toLocaleDateString() : ''}</p>
                          <div className="flex items-center gap-2">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg text-xs font-medium transition-colors"
                            >
                              <FaEye /> {isArabic ? 'عرض' : 'View'}
                            </a>
                            <a
                              href={url}
                              download
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors"
                            >
                              <FaDownload /> {isArabic ? 'تحميل' : 'Download'}
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab !== 'overview' && activeTab !== 'all-actions' && activeTab !== 'communication' && activeTab !== 'attachments' && (
            <div className="text-center py-12">
              <p className="text-slate-400">Content for {activeTab} tab will be implemented here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Action Modal - inline بدل overlay */}
      {false && showAddActionModal && (
        <div className="mt-6">
          <AddActionModal
            isOpen={showAddActionModal}
            onClose={() => setShowAddActionModal(false)}
            onSave={handleAddAction}
            lead={lead}
            inline={true}
          />
        </div>
      )}

      {/* Re-Assign Lead Modal */}
      {!permissions?.is_referral_supervisor && (
        <ReAssignLeadModal
          isOpen={showReAssignModal}
          onClose={() => setShowReAssignModal(false)}
          lead={effectiveLead}
          onAssign={handleReAssign}
          isArabic={isArabic}
          currentUser={user}
        />
      )}

    </div>,
    document.body
  );
};

export default EnhancedLeadDetailsModal;
