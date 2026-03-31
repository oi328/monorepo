import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  Eye, Pencil, Key, ToggleLeft, ToggleRight, MoreVertical, 
  UserCog, Trash2, Clock, CheckCircle, Plus, FileSpreadsheet,
  Download, Upload, Search, Filter, X, ChevronDown, Check, UserPlus, Calendar,
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, Handshake, Ticket
} from 'lucide-react';
import { FaPlus, FaFileImport, FaFileExport, FaFilter, FaSearch, FaTimes, FaUserEdit, FaTrash } from 'react-icons/fa';

import { api, logExportEvent } from '@utils/api';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createPortal } from 'react-dom';
import { useAppState } from '@shared/context/AppStateProvider';
import { updateRotationSettings } from '@services/rotationService';
import SearchableSelect from '@components/SearchableSelect';
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import ImportUsersModal from '@components/ImportUsersModal.jsx';
import UserManagementUserCreate from '@features/Users/UserForm.jsx';
import UserPreviewModal from '@features/Users/UserPreviewModal.jsx';
import UserManagementUserProfile from '@pages/UserManagementUserProfile.jsx';
import UserChangePasswordModal from '@features/Users/UserChangePasswordModal.jsx';

// User Management Component
const roles = ['Admin', 'Manager', 'Agent', 'Viewer'];
const statuses = ['Active', 'Inactive', 'Suspended'];

const { canAssignNow } = (() => {
  try {
    const mod = require('../../utils/rotation');
    return { canAssignNow: mod.canAssignNow };
  } catch {
    return { canAssignNow: () => ({ ok: true }) };
  }
})();

const UserActions = ({
  user,
  canEdit,
  canChangePassword,
  canToggleStatus,
  canDelete,
  canManageRotation,
  onEdit,
  onPreview,
  onChangePassword,
  onToggleActive,
  onDelete,
  onAssignRotation,
  onDelayRotation,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className={`flex items-center justify-end gap-1 sm:gap-2 relative ${showDropdown ? 'z-50' : ''}`}
      ref={dropdownRef}
    >
      <button 
        onClick={onPreview} 
        title="Preview" 
        className="p-1 sm:p-1.5 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
      >
        <Eye className="w-4 h-4 sm:w-5 sm:h-5 block shrink-0 text-purple-600" />
      </button>

      {canEdit && (
        <button 
          onClick={onEdit} 
          title="Edit" 
          className="p-1 sm:p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          <Pencil className="w-4 h-4 sm:w-5 sm:h-5 block shrink-0 text-blue-600" />
        </button>
      )}
      
      {canChangePassword && (
        <button 
          onClick={onChangePassword} 
          title="Change Password" 
          className="p-1 sm:p-1.5 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
        >
          <Key className="w-4 h-4 sm:w-5 sm:h-5 block shrink-0 text-amber-600" />
        </button>
      )}
      
      {canToggleStatus && (
        <button 
          onClick={onToggleActive} 
          title={user.status === 'Active' ? 'Deactivate' : 'Activate'} 
          className={`p-1 sm:p-1.5 rounded-md transition-colors ${
            user.status === 'Active' 
            ? 'hover:bg-green-100 dark:hover:bg-green-900/30' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {user.status === 'Active' ? (
            <ToggleRight className="w-4 h-4 sm:w-5 sm:h-5 block shrink-0 text-green-600" />
          ) : (
            <ToggleLeft className="w-4 h-4 sm:w-5 sm:h-5 block shrink-0 text-gray-400" />
          )}
        </button>
      )}
      
      {(canManageRotation || canDelete) && (
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)} 
            className="p-1 sm:p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 block shrink-0 text-gray-600 dark:text-gray-400" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
               {canManageRotation && (
                 <button onClick={() => { onAssignRotation(); setShowDropdown(false); }} className="w-full text-start px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <UserCog className="w-4 h-4 block shrink-0 text-purple-500"/> Assign Rotation
                 </button>
               )}
               {canManageRotation && (
                 <button onClick={() => { onDelayRotation(); setShowDropdown(false); }} className="w-full text-start px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <Clock className="w-4 h-4 block shrink-0 text-orange-500"/> Delay Rotation
                 </button>
               )}
               {canManageRotation && canDelete && <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>}
               {canDelete && (
                 <button onClick={() => { onDelete(); setShowDropdown(false); }} className="w-full text-start px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 block shrink-0 text-red-600"/> Delete
                 </button>
               )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function UserManagementUsers() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user } = useAppState();

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {};
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

  const roleLower = String(user?.role || '').toLowerCase();
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin';
  const isSuperAdmin = !!user?.is_super_admin;
  
  // User Management Permission Logic:
  // - Admin (Tenant Admin/Super Admin) can do everything.
  // - For other users, each action depends on Control module permissions.
  const canManageUsers =
    isSuperAdmin ||
    isTenantAdmin; 

  const canViewUsers = 
    canManageUsers ||
    effectiveControlPerms.includes('userManagement') ||
    roleLower.includes('director') ||
    roleLower.includes('operation manager') ||
    roleLower.includes('branch manager'); // Branch Manager can view users

  const canAddUsers = canManageUsers || effectiveControlPerms.includes('addUsers');
  const canEditUsers = canManageUsers || effectiveControlPerms.includes('editUsers');
  const canToggleUsers = canManageUsers || effectiveControlPerms.includes('toggleUsers');
  const canChangeUsersPassword = canManageUsers || effectiveControlPerms.includes('changeUserPassword');
  const canDeleteUsers = canManageUsers || effectiveControlPerms.includes('deleteUsers');
  const canRunMultiAction = canManageUsers || effectiveControlPerms.includes('multiAction');

  if (!canViewUsers) {
    return (
      <div className="p-6 text-center text-sm text-red-500">
        {i18n.language === 'ar'
          ? 'لا تملك صلاحية لعرض المستخدمين.'
          : 'You do not have permission to view users.'}
      </div>
    );
  }
  const isArabic = i18n.language === 'ar';
  const [q, setQ] = useState('');
  
  const canUseBulkAssign = canRunMultiAction;
  const canUseBulkDelete = canDeleteUsers;
  const canUseBulkSelection = canUseBulkAssign || canUseBulkDelete;

  const [filters, setFilters] = useState({
    role: [],
    status: [],
    
    department: [],
    dateFrom: '',
    dateTo: '',
    datePeriod: ''
  });

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // Default: after admins, sort by creation date+time (most recent first)
  const [sortBy, setSortBy] = useState('createdAtTs');
  const [sortOrder, setSortOrder] = useState('desc');

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/departments')
      ]);
      const rawUsers = Array.isArray(usersRes.data)
        ? usersRes.data
        : (usersRes.data?.data || []);

      const normalizedUsers = rawUsers.map((u) => {
        const departmentName =
          (u.department && u.department.name) ||
          (u.team && u.team.department && u.team.department.name) ||
          '';

        const departmentId =
          (u.department && u.department.id) ||
          (u.team && u.team.department && u.team.department.id) ||
          u.department_id ||
          '';

        const createdAtIso = typeof u.created_at === 'string' ? u.created_at : '';
        const createdDate = createdAtIso ? createdAtIso.split('T')[0] : '';
        const createdAtTs = createdAtIso ? (Date.parse(createdAtIso) || 0) : 0;

        let userRole = u.job_title || u.role || '';
        if (userRole.toLowerCase() === 'tenant admin' || userRole.toLowerCase() === 'tenant-admin') {
          userRole = 'admin';
        }

        return {
          ...u,
          fullName: u.name,
          department: departmentName,
          departmentId,
          role: userRole,
          createdAt: createdDate,
          createdAtIso,
          createdAtTs,
        };
      });

      setUsers(normalizedUsers);
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
      window.dispatchEvent(new CustomEvent('app:toast', { 
        detail: { type: 'error', message: isArabic ? 'فشل تحميل البيانات' : 'Failed to load data' } 
      }));
    } finally {
      setIsLoading(false);
    }
  }, [isArabic]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const leads = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('leads') || '[]');
    } catch {
      return [];
    }
  }, []);

  // Assignment modal state
  const [showAssign, setShowAssign] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assignContext, setAssignContext] = useState('task'); // 'task' | 'lead' | 'ticket' | 'user'
  const [defaultAssignType, setDefaultAssignType] = useState('user');
  const [defaultTargetId, setDefaultTargetId] = useState('');
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleEditUser = (user) => {
    if (!canEditUsers) return;
    setSelectedUser(user);
    setShowUserProfileModal(true);
  };

  const handlePreviewUser = (user) => {
    setSelectedUser(user);
    setShowPreviewModal(true);
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (q) {
        const query = q.toLowerCase();
        const matchesSearch = [u.name, u.email, u.phone]
          .join(' ')
          .toLowerCase()
          .includes(query);
        if (!matchesSearch) return false;
      }

      // Filters
      if (filters.role && filters.role.length > 0 && !filters.role.includes(u.role)) return false;
      if (filters.status && filters.status.length > 0 && !filters.status.includes(u.status)) return false;
      
      // Multi-select for Team
     

      // Multi-select for Department
      if (filters.department && filters.department.length > 0) {
        if (!filters.department.includes(u.department)) return false;
      }

      // Date Filters
      if (filters.dateFrom) {
         if ((u.createdAt || '') < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
         if ((u.createdAt || '') > filters.dateTo) return false;
      }

      return true;
    });
  }, [users, q, filters]);

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
        const roleA = String(a?.role || a?.job_title || '').toLowerCase().trim();
        const roleB = String(b?.role || b?.job_title || '').toLowerCase().trim();
        const isAdminA = !!a?.is_super_admin || roleA === 'admin' || roleA === 'tenant admin' || roleA === 'tenant-admin';
        const isAdminB = !!b?.is_super_admin || roleB === 'admin' || roleB === 'tenant admin' || roleB === 'tenant-admin';

        // Always keep admins pinned to the top. Sorting applies after admins.
        if (isAdminA !== isAdminB) return isAdminA ? -1 : 1;
        if (isAdminA && isAdminB) return 0;

        // Special case: created_at sorting must include time, not date only.
        if (sortBy === 'createdAtTs') {
          const tsA = Number(a?.createdAtTs || 0);
          const tsB = Number(b?.createdAtTs || 0);
          return sortOrder === 'asc' ? (tsA - tsB) : (tsB - tsA);
        }

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

  const allUsersSelected = sortedAndPaginated.length > 0 && sortedAndPaginated.every(u => selectedUserIds.includes(u.id));

  const clearFilters = () => {
    setQ('');
    setFilters({
      role: [],
      status: [],
     
      department: [],
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

  const deactivateActivate = async (id) => {
    if (!canToggleUsers) return;
    const target = users.find((u) => u.id === id);
    if (!target) return;

    const previousStatus = target.status || 'Inactive';
    const nextStatus = previousStatus === 'Active' ? 'Inactive' : 'Active';

    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: nextStatus } : u
      )
    );

    try {
      await api.put(`/api/users/${id}`, { status: nextStatus });
      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'success',
          message: isArabic
            ? (nextStatus === 'Active' ? 'تم تفعيل المستخدم بنجاح' : 'تم إيقاف المستخدم بنجاح')
            : (nextStatus === 'Active' ? 'User activated successfully' : 'User deactivated successfully'),
        },
      });
      window.dispatchEvent(evt);
    } catch (error) {
      console.error('Failed to toggle user status', error);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: previousStatus } : u
        )
      );
      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'error',
          message: isArabic
            ? 'فشل تغيير حالة المستخدم'
            : 'Failed to change user status',
        },
      });
      window.dispatchEvent(evt);
    }
  };

  const deleteUser = async (id) => {
    if (!canDeleteUsers) return;

    const target = users.find((u) => u.id === id);
    if (!target) return;

    const targetRole = String(target.role || '').toLowerCase();
    const isTargetTenantAdmin =
      targetRole === 'admin' ||
      targetRole === 'tenant admin' ||
      targetRole === 'tenant-admin';
    if (isTargetTenantAdmin) {
      const message = isArabic
        ? 'لا يمكن حذف مسؤول التينانت الأساسي.'
        : 'You cannot delete the primary tenant admin user.';
      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'error',
          message,
        },
      });
      window.dispatchEvent(evt);
      return;
    }

    const confirmed = window.confirm(
      isArabic
        ? `هل أنت متأكد من حذف المستخدم ${target.name || ''}؟`
        : 'Are you sure you want to delete this user?'
    );
    if (!confirmed) return;

    const previousUsers = users;
    setUsers((prev) => prev.filter((u) => u.id !== id));

    try {
      await api.delete(`/api/users/${id}`);
      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'success',
          message: isArabic
            ? 'تم حذف المستخدم بنجاح'
            : 'User deleted successfully',
        },
      });
      window.dispatchEvent(evt);
    } catch (error) {
      console.error('Failed to delete user', error);
      setUsers(previousUsers);
      const message =
        error?.response?.data?.message ||
        (isArabic ? 'فشل حذف المستخدم' : 'Failed to delete user');
      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'error',
          message,
        },
      });
      window.dispatchEvent(evt);
    }
  };

  const changePassword = (id) => {
    if (!canChangeUsersPassword) return;
    const user = users.find(u => u.id === id);
    if (user) {
      setSelectedUser(user);
      setShowChangePasswordModal(true);
    }
  };

  const handleChangePasswordSubmit = async (userId, newPassword) => {
    if (!canChangeUsersPassword) return;
    try {
      await api.put(`/api/users/${userId}`, { password: newPassword });
      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'success',
          message: isArabic
            ? 'تم تغيير كلمة المرور بنجاح'
            : 'Password changed successfully',
        },
      });
      window.dispatchEvent(evt);
    } catch (error) {
      console.error('Failed to change user password', error);
      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'error',
          message:
            error.response?.data?.message ||
            (isArabic ? 'فشل تغيير كلمة المرور' : 'Failed to change password'),
        },
      });
      window.dispatchEvent(evt);
    }
  };

  const refreshUser = (id) => {
    alert(`Refreshed user ${id}`);
  };

  const assignRotation = (id) => {
    const guard = canAssignNow(new Date());

    if (!guard.ok) {
      let message;
      if (guard.reason === 'Rotation disabled') {
        message = isArabic
          ? 'تم إيقاف الروتيشن من إعدادات النظام، لا يمكن الإسناد الآن.'
          : 'Rotation assignment is disabled in settings; cannot assign rotation now.';
      } else if (guard.reason === 'Outside working hours') {
        message = isArabic
          ? 'محاولة إسناد الروتيشن خارج أوقات العمل المحددة في الإعدادات.'
          : 'Attempting rotation assignment outside configured working hours.';
      } else if (guard.reason === 'Delayed assignment enabled') {
        message = isArabic
          ? 'النظام في وضع تأجيل الروتيشن حاليًا، لا يمكن الإسناد الآن.'
          : 'System is currently in delayed-rotation mode; rotation assignment is blocked.';
      } else {
        message = isArabic
          ? 'لا يمكن تنفيذ الروتيشن حاليًا بسبب إعدادات النظام.'
          : 'Rotation assignment is currently blocked by system settings.';
      }

      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'error',
          message,
        },
      });
      window.dispatchEvent(evt);
      return;
    }

    openAssign('user', 'user', String(id));
  };

  const delayRotation = async () => {
    let prefs = {
      allowAssignRotation: true,
      delayAssignRotation: false,
      workFrom: '00:00',
      workTo: '23:59',
      reshuffleColdLeads: false,
      reshuffleColdLeadsNumber: 0,
    };

    try {
      const raw = window.localStorage.getItem('rotationSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        prefs = { ...prefs, ...parsed };
      }
    } catch {}

    const nextDelay = !prefs.delayAssignRotation;

    try {
      await updateRotationSettings({
        delay_assign_rotation: nextDelay,
      });

      const updatedPrefs = { ...prefs, delayAssignRotation: nextDelay };
      try {
        window.localStorage.setItem('rotationSettings', JSON.stringify(updatedPrefs));
      } catch {}

      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'success',
          message: isArabic
            ? (nextDelay
                ? 'تم تفعيل وضع تأجيل الروتيشن لهذا التينانت.'
                : 'تم إلغاء وضع تأجيل الروتيشن، سيتم استخدام الروتيشن حسب الإعدادات.')
            : (nextDelay
                ? 'Rotation delay mode has been enabled for this tenant.'
                : 'Rotation delay mode has been disabled; rotation will follow settings.'),
        },
      });
      window.dispatchEvent(evt);
    } catch (error) {
      console.error('Failed to update rotation settings', error);
      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'error',
          message: isArabic
            ? 'فشل تحديث إعدادات الروتيشن'
            : 'Failed to update rotation settings',
        },
      });
      window.dispatchEvent(evt);
    }
  };

  const openAssign = (context, assignType='user', userId='') => {
    setAssignContext(context);
    setDefaultAssignType(assignType);
    setDefaultTargetId(userId);
    setShowAssign(true);
  };

  // Labels used in bulk actions (only required buttons)
  const bulkLabels = useMemo(() => ({
    title: isArabic ? 'أكشنات جماعية على المحدد' : 'Bulk actions on selected',
    deleteSelected: 'delete',
    assignTask: isArabic ? 'تعيين تاسك' : 'Assign task',
    assignLead: isArabic ? 'تعيين ليد' : 'Assign lead',
    assignTicket: isArabic ? 'تعيين تيكت' : 'Assign ticket',
    selectUsersFirst: isArabic ? 'اختر مستخدمين أولًا' : 'Select users first',
    bulkAssignUsersFirst: isArabic ? 'اختر مستخدمين أولًا لتنفيذ التعيين الجماعي' : 'Select users first to perform bulk assignment',
    deletedMsg: isArabic ? 'تم حذف المستخدمين المحددين' : 'Selected users deleted',
    confirmDelete: isArabic ? `سيتم حذف ${selectedUserIds.length} مستخدم(ين). هل أنت متأكد؟` : `This will delete ${selectedUserIds.length} user(s). Are you sure?`,
  }), [isArabic, selectedUserIds.length]);

  // Bulk actions for selected users
  const bulkDeactivateSelectedUsers = () => {
    if (!canToggleUsers) return;
    if (selectedUserIds.length === 0) return alert(bulkLabels.selectUsersFirst);
    setUsers(prev => prev.map(u => selectedUserIds.includes(u.id) ? { ...u, status: 'Inactive' } : u));
    alert(bulkLabels.deactivatedMsg);
  };

  const bulkActivateSelectedUsers = () => {
    if (!canToggleUsers) return;
    if (selectedUserIds.length === 0) return alert(bulkLabels.selectUsersFirst);
    setUsers(prev => prev.map(u => selectedUserIds.includes(u.id) ? { ...u, status: 'Active' } : u));
    alert(bulkLabels.activatedMsg);
  };

  const bulkDeleteSelectedUsers = async () => {
    if (!canDeleteUsers) return;
    if (selectedUserIds.length === 0) {
      alert(bulkLabels.selectUsersFirst);
      return;
    }
    const confirmed = window.confirm(bulkLabels.confirmDelete);
    if (!confirmed) return;

    const previousUsers = users;
    setUsers(prev => prev.filter(u => !selectedUserIds.includes(u.id)));
    setSelectedUserIds([]);

    try {
      await Promise.all(
        selectedUserIds.map(id => api.delete(`/api/users/${id}`))
      );
      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'success',
          message: bulkLabels.deletedMsg,
        },
      });
      window.dispatchEvent(evt);
    } catch (error) {
      console.error('Failed to bulk delete users', error);
      setUsers(previousUsers);
      const message =
        error?.response?.data?.message ||
        (isArabic ? 'فشل حذف بعض المستخدمين' : 'Failed to delete some users');
      const evt = new CustomEvent('app:toast', {
        detail: {
          type: 'error',
          message,
        },
      });
      window.dispatchEvent(evt);
      fetchData();
    }
  };

  const openBulkAssign = (context) => {
    if (!canRunMultiAction) return;
    if (selectedUserIds.length === 0) return alert(bulkLabels.selectUsersFirst);
    setAssignContext(context);
    setDefaultAssignType('user');
    setDefaultTargetId('');
    setShowAssign(true);
  };

  

  const toggleSelectAllUsers = () => {
    if (allUsersSelected) {
      // Unselect users on current page
      const currentPageIds = sortedAndPaginated.map(u => u.id);
      setSelectedUserIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      // Select all users on current page
      const currentPageIds = sortedAndPaginated.map(u => u.id);
      setSelectedUserIds(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const toggleSelectUser = (id) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const exportUsersToExcel = () => {
    const rows = filtered.map(u => ({
      'ID': u.id,
      'Full Name': u.name,
      'Email': u.email,
      'Phone': u.phone,
      'Role': u.role,
      'Status': u.status,
      
      'Created At': u.createdAt || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    const fileName = "users-export.xlsx";
    XLSX.writeFile(workbook, fileName);
    logExportEvent({
      module: 'Users',
      fileName,
      format: 'xlsx',
    });
  };

  const openBulkAssignToTeam = () => {
    if (!canRunMultiAction) return;
    if (selectedUserIds.length === 0) {
      alert(bulkLabels.bulkAssignUsersFirst);
      return;
    }
    setAssignContext('user');
   
    setDefaultTargetId('');
    setShowAssign(true);
  };

  const handleSubmitAssign = (payload) => {
    console.log('Assignment payload (Users):', { ...payload, selectedUserIds });
    alert('تم حفظ التعيين بنجاح');
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="rounded-xl p-4 md:p-6 relative mb-6">
        <div className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3">
            <div className="relative flex flex-col items-start gap-1">
              <h1 className="text-xl md:text-2xl font-bold text-start text-theme-text dark:text-white flex items-center gap-2">
                {isArabic ? 'المستخدمين' : 'Users'}
                <span className="text-sm font-normal text-[var(--muted-text)] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  {filtered.length}
                </span>
              </h1>
              <span aria-hidden="true" className="inline-block h-[2px] w-full rounded bg-gradient-to-r from-blue-500 to-purple-600" />
            </div>
          </div>
          
          <div className="w-full lg:w-auto flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
            {canAddUsers && (
              <>
                <button 
                  onClick={() => setImportModalOpen(true)}
                  className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 !text-white border-none flex items-center justify-center gap-2"
                >
                  <FaFileImport />
                  {isArabic ? 'استيراد' : 'Import'}
                </button>
                
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-blue-700 !text-white border-none flex items-center justify-center gap-2"
                >
                  <FaPlus />
                  {isArabic ? 'إضافة مستخدم' : 'Add New User'}
                </button>
              </>
            )}
          </div>
        </div>
        {showUserProfileModal && (
          <UserManagementUserProfile
            userProp={selectedUser}
            asModal={true}
            onClose={() => setShowUserProfileModal(false)}
            onUpdate={(updatedUser) => {
              setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
              if (selectedUser && selectedUser.id === updatedUser.id) {
                setSelectedUser(updatedUser);
              }
            }}
          />
        )}
        {showPreviewModal && (
          <UserPreviewModal
            isOpen={showPreviewModal}
            onClose={() => setShowPreviewModal(false)}
            user={selectedUser}
          />
        )}
        {showChangePasswordModal && (
          <UserChangePasswordModal
            isOpen={showChangePasswordModal}
            onClose={() => setShowChangePasswordModal(false)}
            user={selectedUser}
            onSubmit={handleChangePasswordSubmit}
          />
        )}
      </div>

      {/* Filter Section */}
      <div className="glass-panel p-4 rounded-xl mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-theme-text ">
            <Filter className="text-blue-500" size={16} /> {isArabic ? 'تصفية' : 'Filter'}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-3 py-1.5 text-sm  text-blue-600 hover:bg-blue-100 bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>{isArabic ? 'عرض الكل' : 'Show All'}</span>
              {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button 
              onClick={clearFilters} 
              className="px-3 py-1.5 text-sm text-theme-text hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
              placeholder={isArabic ? 'بحث (اسم، إيميل، هاتف)...' : 'Search (name, email, phone)...'}
            />
          </div>

          {/* 2. ROLE */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isArabic ? 'الدور' : 'Role'}
            </label>
            <SearchableSelect
              options={roles.map(o => ({ value: o, label: o }))}
              value={filters.role}
              onChange={(v) => setFilters(prev => ({ ...prev, role: v }))}
              placeholder={isArabic ? 'اختر الدور' : 'Select Role'}
              className="w-full"
              isRTL={isArabic}
              multiple={true}
            />
          </div>

          {/* 3. STATUS */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isArabic ? 'الحالة' : 'Status'}
            </label>
            <SearchableSelect
              options={statuses.map(o => ({ value: o, label: o }))}
              value={filters.status}
              onChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
              placeholder={isArabic ? 'اختر الحالة' : 'Select Status'}
              className="w-full"
              isRTL={isArabic}
              multiple={true}
            />
          </div>

          {/* 4. DEPARTMENT (Multi) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isArabic ? 'القسم' : 'Department'}
            </label>
            <SearchableSelect
              options={departments.map(o => ({ value: o.name, label: o.name }))}
              value={filters.department}
              onChange={(v) => setFilters(prev => ({ ...prev, department: v }))}
              placeholder={isArabic ? 'اختر القسم' : 'Select Department'}
              className="w-full"
              isRTL={isArabic}
              multiple={true}
            />
          </div>
          
          {/* 6. CREATED DATE (Range) */}
          {showAdvancedFilters && (
          <div className="col-span-1 md:col-span-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <Calendar className="text-blue-500" size={10} /> {isArabic ? 'تاريخ الإنشاء' : 'Created Date'}
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
                  className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filters.datePeriod === 'today' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-theme-bg   text-theme-text hover:bg-gray-700/50 dark:hover:bg-gray-700'}`}
                >
                  {isArabic ? 'اليوم' : 'Today'}
                </button>
                <button 
                  onClick={() => handleDatePeriodChange('week')} 
                  className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filters.datePeriod === 'week' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-theme-bg   text-theme-text hover:bg-gray-700/50 dark:hover:bg-gray-700'}`}
                >
                  {isArabic ? 'أسبوع' : 'Week'}
                </button>
                <button 
                  onClick={() => handleDatePeriodChange('month')} 
                  className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filters.datePeriod === 'month' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-theme-bg   text-theme-text hover:bg-gray-700/50 dark:hover:bg-gray-700'}`}
                >
                  {isArabic ? 'شهر' : 'Month'}
                </button>
              </div>
            </div>
          </div>
          )}

        </div>
      </div>

        {/* Bulk actions bar (only shows when rows selected) */}
        {selectedUserIds.length > 0 && canUseBulkSelection && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 text-sm font-medium text-theme-text border-r border-gray-200 dark:border-gray-700 pr-4 rtl:border-l rtl:border-r-0 rtl:pl-4 rtl:pr-0">
              <span className="text-[var(--muted-text)]">{bulkLabels.title}:</span>
            </div>
            
            <div className="flex items-center gap-2">
              {canUseBulkAssign && (
                <>
                  <button 
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors tooltip"
                    onClick={()=>openBulkAssign('task')}
                    title={bulkLabels.assignTask}
                  >
                    <ClipboardCheck size={18} />
                  </button>
                  <button 
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors tooltip"
                    onClick={()=>openBulkAssign('lead')}
                    title={bulkLabels.assignLead}
                  >
                    <Handshake size={18} />
                  </button>
                  <button 
                    className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors tooltip"
                    onClick={()=>openBulkAssign('ticket')}
                    title={bulkLabels.assignTicket}
                  >
                    <Ticket size={18} />
                  </button>
                </>
              )}
              {canUseBulkDelete && (
                <button 
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors tooltip"
                  onClick={bulkDeleteSelectedUsers}
                  title={bulkLabels.deleteSelected}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="glass-panel rounded-xl overflow-hidden w-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-lg">{isArabic ? 'قائمة المستخدمين' : 'Users List'}</h3>
            <button
              onClick={exportUsersToExcel}
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
                <th className="w-10 p-3 rounded-l-lg">
                  {canUseBulkSelection && (
                    <input type="checkbox" className="checkbox" checked={allUsersSelected} onChange={toggleSelectAllUsers} />
                  )}
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('fullName')}>
                  <div className="flex items-center gap-1">
                    {isArabic ? 'الاسم' : 'Full Name'}
                    <ArrowUpDown size={12} className={sortBy === 'fullName' ? 'text-blue-500' : 'opacity-30'} />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('email')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'البريد الإلكتروني' : 'Email'}
                    <ArrowUpDown size={12} className={sortBy === 'email' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('role')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'الدور' : 'Role'}
                    <ArrowUpDown size={12} className={sortBy === 'role' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('status')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'الحالة' : 'Status'}
                    <ArrowUpDown size={12} className={sortBy === 'status' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('department')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'القسم' : 'Department'}
                    <ArrowUpDown size={12} className={sortBy === 'department' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 rounded-r-lg">{isArabic ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-3"><Skeleton className="h-4 w-4" /></td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-20 md:hidden" />
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-3"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-3"><div className="flex gap-1"><Skeleton className="h-6 w-6 rounded" /><Skeleton className="h-6 w-6 rounded" /></div></td>
                  </tr>
                ))
              ) : (
                <>
                  {sortedAndPaginated.map((u) => (
                    <tr key={u.id} className="group hover:bg-gray-800/50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="p-3">
                        {canUseBulkSelection && (
                          <input type="checkbox" className="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleSelectUser(u.id)} />
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                              <span>{u.name?.[0] || '?'}</span>
                            </div>
                          </div>
                          <Link to={`/user-management/users/${u.id}`} className="font-medium hover:text-blue-600 transition-colors">
                            {u.name}
                          </Link>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-[var(--muted-text)]">
                        {u.email}
                      </td>
                      <td className="p-3 text-sm">{u.role}</td>
                      <td className="p-3">
                        <span className={`badge border-0 ${
                          u.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                          u.status === 'Suspended' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-[var(--muted-text)]">
                        {u.department || (isArabic ? 'بدون قسم' : 'No department')}
                      </td>
                      <td className="p-3">
                        <UserActions
                          user={u}
                          canEdit={canEditUsers}
                          canChangePassword={canChangeUsersPassword}
                          canToggleStatus={canToggleUsers}
                          canDelete={canDeleteUsers}
                          canManageRotation={canRunMultiAction}
                          onPreview={() => handlePreviewUser(u)}
                          onEdit={() => handleEditUser(u)}
                          onChangePassword={() => changePassword(u.id)}
                          onToggleActive={() => deactivateActivate(u.id)}
                          onDelete={() => deleteUser(u.id)}
                          onAssignRotation={() => assignRotation(u.id)}
                          onDelayRotation={() => delayRotation(u.id)}
                        />
                      </td>
                    </tr>
                  ))}
                  {sortedAndPaginated.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-[var(--muted-text)]">
                        {isArabic ? 'لا توجد بيانات' : 'No data found'}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden grid grid-cols-1 gap-3 p-4">
          {isLoading ? (
             Array.from({ length: 3 }).map((_, i) => (
               <div key={i} className=" p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                 <div className="flex items-center gap-3">
                   <Skeleton className="w-12 h-12 rounded-full" />
                   <div className="flex-1">
                     <Skeleton className="h-4 w-32 mb-2" />
                     <Skeleton className="h-3 w-24" />
                   </div>
                 </div>
                 <Skeleton className="h-8 w-full rounded-lg" />
               </div>
             ))
          ) : (
             sortedAndPaginated.map((u) => (
               <div key={u.id} className=" p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative group">
                 <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto">
                    {canUseBulkSelection && (
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-sm" 
                        checked={selectedUserIds.includes(u.id)} 
                        onChange={() => toggleSelectUser(u.id)} 
                      />
                    )}
                  </div>
                 
                 <div className="flex  items-start gap-3 pr-8 rtl:pr-0 rtl:pl-8">
                   <div className="avatar placeholder">
                      <div className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                        <span>{u.name?.[0] || '?'}</span>
                      </div>
                   </div>
                   <div className="flex-1 min-w-0">
                     <Link to={`/user-management/users/${u.id}`} className="font-bold text-base hover:text-blue-600 transition-colors block truncate">
                       {u.name}
                     </Link>
                     <div className="text-xs text-[var(--muted-text)] truncate mb-1">
                      {u.email}
                    </div>
                     <div className="flex flex-wrap items-center gap-2 mt-2">
                       <span className={`badge badge-sm border-0 ${
                          u.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                          u.status === 'Suspended' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {u.status}
                        </span>
                        <span className="badge badge-sm badge-ghost">{u.role}</span>
                     </div>
                   </div>
                 </div>

                 <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                   <div className="flex flex-wrap items-center gap-1 text-[var(--muted-text)] text-xs max-w-[70%]">
                       <span className="truncate max-w-[120px]">
                         {u.department || (isArabic ? 'بدون قسم' : 'No department')}
                       </span>
                       {u.createdAt && (
                         <>
                           <span className="text-xs">•</span>
                           <span className="text-xs whitespace-nowrap">{u.createdAt}</span>
                         </>
                       )}
                    </div>
                     <div className="flex justify-end gap-1">
                       <UserActions
                         user={u}
                        canEdit={canEditUsers}
                        canChangePassword={canChangeUsersPassword}
                        canToggleStatus={canToggleUsers}
                        canDelete={canDeleteUsers}
                        canManageRotation={canRunMultiAction}
                         onPreview={() => handlePreviewUser(u)}
                         onEdit={() => handleEditUser(u)}
                         onChangePassword={() => changePassword(u.id)}
                        onToggleActive={() => deactivateActivate(u.id)}
                        onDelete={() => deleteUser(u.id)}
                        onAssignRotation={() => assignRotation(u.id)}
                        onDelayRotation={() => delayRotation(u.id)}
                      />
                    </div>
                 </div>
               </div>
             ))
          )}
          {sortedAndPaginated.length === 0 && !isLoading && (
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
                <ChevronLeft className={`w-5 h-5 block text-theme-text ${isArabic ? 'rotate-180' : ''}`} />
              </button>
              <span className="text-xs sm:text-sm px-2">{isArabic ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                title={isArabic ? 'التالي' : 'Next'}
              >
                <ChevronRight className={`w-5 h-5 block text-theme-text ${isArabic ? 'rotate-180' : ''}`} />
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

        {showAssign && (
          <AssignmentModal
            open={showAssign}
            onClose={()=>setShowAssign(false)}
            onSubmit={handleSubmitAssign}
            context={assignContext}
            users={users.map(u=>({ id: u.id, fullName: u.name,  role: u.role }))}
            leads={leads}
            defaultAssignType={defaultAssignType}
            defaultTargetId={defaultTargetId}
            defaultTargetIds={!defaultTargetId && selectedUserIds.length > 0 ? selectedUserIds : []}
          />
        )}

        {canAddUsers && showCreateModal && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
             <div className="w-full max-w-5xl h-[90vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="absolute top-6 right-6 z-20 btn btn-circle btn-sm btn-ghost bg-base-100/50 hover:bg-base-100"
                >
                  <X size={20} />
                </button>
               <UserManagementUserCreate 
                 onClose={() => setShowCreateModal(false)} 
                 onSuccess={(newUser) => {
                   setUsers(prev => [newUser, ...prev]);
                   setShowCreateModal(false);
                 }}
               />
             </div>
          </div>,
          document.body
        )}

        {canAddUsers && (
          <ImportUsersModal
            isOpen={isImportModalOpen}
            onClose={() => setImportModalOpen(false)}
            onImportSuccess={(data) => {
              setUsers(prev => [...prev, ...data]);
              setImportModalOpen(false);
              alert(isArabic ? `تم استيراد ${data.length} مستخدم` : `Imported ${data.length} users`);
            }}
          />
        )}
      </div>
  );
}
