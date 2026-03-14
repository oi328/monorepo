import { 
  Eye, Pencil, Trash2, ToggleLeft, ToggleRight, MoreVertical, 
  UserPlus, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ClipboardCheck, Handshake, Ticket, Trash, Filter, Plus, ArrowUpDown, Calendar
} from 'lucide-react';
import { FaFileImport, FaFileExport, FaPlus } from 'react-icons/fa';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createPortal } from 'react-dom';
import { api, logExportEvent } from '@utils/api';
import { useAppState } from '@shared/context/AppStateProvider';
import SearchableSelect from '@components/SearchableSelect';
import AssignmentModal from '@components/AssignmentModal.jsx';
import UserManagementDepartmentForm from '@features/Users/DepartmentForm.jsx';
import DepartmentPreviewModal from '@features/Users/DepartmentPreviewModal.jsx';
import ImportDepartmentsModal from '@components/ImportDepartmentsModal.jsx';

const DepartmentActions = ({ dept, onPreview, onEdit, onToggleActive, onDelete, onAssignManager }) => {
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
    <div className={`flex items-center gap-2 relative min-w-[140px] ${showDropdown ? 'z-50' : ''}`} ref={dropdownRef}>
      {/* Preview */}
      <button 
        onClick={onPreview} 
        title="Preview"
        className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
      >
        <Eye className="w-5 h-5 block shrink-0 text-blue-600" />
      </button>

      {/* Edit */}
      <button 
        onClick={onEdit} 
        title="Edit"
        className="p-1.5 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
      >
        <Pencil className="w-5 h-5 block shrink-0 text-amber-600" />
      </button>

      {/* Toggle Active */}
      <button 
        onClick={onToggleActive} 
        title={dept.status === 'Active' ? 'Deactivate' : 'Activate'}
        className={`p-1.5 rounded-md transition-colors ${
          dept.status === 'Active' 
          ? 'hover:bg-green-100 dark:hover:bg-green-900/30' 
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        {dept.status === 'Active' ? (
          <ToggleRight className="w-5 h-5 block shrink-0 text-green-600" />
        ) : (
          <ToggleLeft className="w-5 h-5 block shrink-0 text-gray-400" />
        )}
      </button>
      
      {/* Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setShowDropdown(!showDropdown)} 
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <MoreVertical className="w-5 h-5 block shrink-0 text-gray-600 dark:text-gray-400" />
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
             <button onClick={() => { onAssignManager(); setShowDropdown(false); }} className="w-full text-start px-3 py-2 text-xs hover:bg-gray-800/50 dark:hover:bg-gray-700/50 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                <UserPlus className="w-4 h-4 block shrink-0 text-purple-500"/> Assign Manager
             </button>
             <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
             <button onClick={() => { onDelete(); setShowDropdown(false); }} className="w-full text-start px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2">
                <Trash className="w-4 h-4 block shrink-0 text-red-600" /> Delete
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function UserManagementDepartments() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({
    status: [],
    manager: [],
    dateFrom: '',
    dateTo: '',
    datePeriod: ''
  });
  const [showAllFilters, setShowAllFilters] = useState(false);

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // Assignment modal state
  const [showAssign, setShowAssign] = useState(false);
  const [assignContext, setAssignContext] = useState('task'); // 'task' | 'lead' | 'ticket'
  const [defaultAssignType, setDefaultAssignType] = useState('department');
  const [defaultTargetId, setDefaultTargetId] = useState('');

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const [deptRes, usersRes] = await Promise.all([
        api.get('/api/departments'),
        api.get('/api/users') // Fetch users for assignment
      ]);
      setDepartments(deptRes.data);
      // Map users to expected format for AssignmentModal
      const mappedUsers = (usersRes.data.data || usersRes.data).map(u => ({
        id: u.id,
        fullName: u.name || `${u.first_name} ${u.last_name}`,
        role: u.role,
        team: u.team?.name
      }));
      setUsers(mappedUsers);
    } catch (err) {
      console.error('Error fetching data:', err);
      window.dispatchEvent(new CustomEvent('app:toast', { 
        detail: { type: 'error', message: isArabic ? 'فشل تحميل البيانات' : 'Failed to load data' } 
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const managers = useMemo(() => {
    return Array.from(new Set(departments.map(d => d.manager?.name || d.manager).filter(Boolean)));
  }, [departments]);

  const filtered = useMemo(() => {
    return departments.filter(d => {
      // Search
      if (q) {
        const query = q.toLowerCase();
        const managerName = d.manager?.name || d.manager || '';
        const matchesSearch = [d.name, managerName, d.id]
          .join(' ')
          .toLowerCase()
          .includes(query);
        if (!matchesSearch) return false;
      }

      // Filters
      if (filters.status && filters.status.length > 0 && !filters.status.includes(d.status)) return false;

      // Multi-select for Manager
      if (filters.manager && filters.manager.length > 0) {
        const managerName = d.manager?.name || d.manager;
        if (!filters.manager.includes(managerName)) return false;
      }

      // Date Filters
      if (filters.dateFrom) {
         if ((d.createdAt || '') < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
         if ((d.createdAt || '') > filters.dateTo) return false;
      }

      return true;
    });
  }, [departments, q, filters]);

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
        let valA = a[sortBy];
        let valB = b[sortBy];
        
        // Handle nested properties or objects
        if (sortBy === 'manager') {
            valA = a.manager?.name || a.manager || '';
            valB = b.manager?.name || b.manager || '';
        } else {
            valA = valA || '';
            valB = valB || '';
        }
        
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

  const allSelected = sortedAndPaginated.length > 0 && sortedAndPaginated.every(d => selectedDeptIds.includes(d.id));

  const clearFilters = () => {
    setQ('');
    setFilters({
      status: [],
      manager: [],
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

  const toggleSelect = (id) => {
    setSelectedDeptIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDeptIds([]);
    } else {
      setSelectedDeptIds(sortedAndPaginated.map(d => d.id));
    }
  };

  const deleteDepartment = async (id) => {
    if (window.confirm(isArabic ? 'هل أنت متأكد من حذف هذا القسم؟' : 'Are you sure you want to delete this department?')) {
      try {
        await api.delete(`/api/departments/${id}`);
        setDepartments(prev => prev.filter(d => d.id !== id));
        if (selectedDeptIds.includes(id)) {
          setSelectedDeptIds(prev => prev.filter(x => x !== id));
        }
        window.dispatchEvent(new CustomEvent('app:toast', { 
          detail: { type: 'success', message: isArabic ? 'تم حذف القسم بنجاح' : 'Department deleted successfully' } 
        }));
      } catch (err) {
        console.error(err);
        window.dispatchEvent(new CustomEvent('app:toast', { 
          detail: { type: 'error', message: isArabic ? 'فشل حذف القسم' : 'Failed to delete department' } 
        }));
      }
    }
  };

  const handleStatusToggle = async (dept) => {
    const newStatus = dept.status === 'Active' ? 'Inactive' : 'Active';
    try {
        await api.put(`/api/departments/${dept.id}`, { status: newStatus });
        setDepartments(prev => prev.map(d => d.id === dept.id ? { ...d, status: newStatus } : d));
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'success', message: isArabic ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully' } }));
    } catch (err) {
        console.error(err);
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'error', message: isArabic ? 'حدث خطأ أثناء تحديث الحالة' : 'Error updating status' } }));
    }
  };

  const handleEditDepartment = (dept) => {
    setSelectedDepartment(dept);
    setShowEditModal(true);
  };

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
  const canAddDepartment =
    effectiveControlPerms.includes('addDepartment') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director');

  const handlePreviewDepartment = (dept) => {
    setSelectedDepartment(dept);
    setShowPreviewModal(true);
  };

  const exportDepartmentsToExcel = () => {
    const dataToExport = selectedDeptIds.length > 0 
      ? departments.filter(d => selectedDeptIds.includes(d.id))
      : filtered;

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Departments");
    const fileName = "departments.xlsx";
    XLSX.writeFile(wb, fileName);
    logExportEvent({
      module: 'Departments',
      fileName,
      format: 'xlsx',
    });
  };

  // Bulk actions labels
  const bulkLabels = {
    title: isArabic ? 'إجراءات جماعية' : 'Bulk Actions',
    deleteSelected: isArabic ? 'حذف المحدد' : 'Delete Selected',
    assignTask: isArabic ? 'إسناد مهمة' : 'Assign Task',
    assignLead: isArabic ? 'إسناد عميل محتمل' : 'Assign Lead',
    assignTicket: isArabic ? 'إسناد تذكرة' : 'Assign Ticket',
    selectFirst: isArabic ? 'يرجى تحديد عناصر أولاً' : 'Please select items first',
    confirmDelete: (count) => isArabic ? `هل أنت متأكد من حذف ${count} عنصر؟` : `Are you sure you want to delete ${count} items?`,
    deletedMsg: isArabic ? 'تم الحذف بنجاح' : 'Deleted successfully'
  };

  const openAssign = (ctx) => {
    if (selectedDeptIds.length === 0) return alert(bulkLabels.selectFirst);
    setAssignContext(ctx);
    setDefaultAssignType('department');
    // If single selection, we can set defaultTargetId
    if (selectedDeptIds.length === 1) {
       setDefaultTargetId(selectedDeptIds[0]);
    } else {
       setDefaultTargetId('');
    }
    setShowAssign(true);
  };

  const handleAssignManager = (dept) => {
    setSelectedDepartment(dept);
    setAssignContext('user');
    setDefaultAssignType('user');
    // Pre-select current manager if any
    const managerId = dept.manager?.id || (users.find(u => u.fullName === dept.manager)?.id) || '';
    setDefaultTargetId(managerId);
    setShowAssign(true);
  };

  const handleAssignSubmit = async (payload) => {
    try {
      if (assignContext === 'user' && selectedDepartment) {
        // ... (existing user assignment logic)
        const { userId } = payload;
        if (!userId) return;
        
        await api.put(`/api/departments/${selectedDepartment.id}`, { manager_id: userId });
        
        setDepartments(prev => prev.map(d => 
          d.id === selectedDepartment.id 
            ? { ...d, manager: users.find(u => u.id === userId) || { id: userId, name: payload.targetName } } 
            : d
        ));
        
        window.dispatchEvent(new CustomEvent('app:toast', { 
          detail: { type: 'success', message: isArabic ? 'تم تعيين المدير بنجاح' : 'Manager assigned successfully' } 
        }));
        setShowAssign(false);
      } 
      else if (assignContext === 'task') {
        // Handle Task Assignment
        const taskPayload = {
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          start_date: payload.startDate,
          due_date: payload.deadline,
          type: payload.taskType,
          related_to: 'Department',
          related_ids: selectedDeptIds,
          assignees: payload.assignType === 'user' ? payload.userIds : [], // If user assignment
          team_ids: payload.assignType === 'team' ? payload.teamIds : []   // If team assignment
        };

        // If we assign to department (as a team unit) or users within department
        // The payload structure depends on the backend. Assuming standard task creation:
        await api.post('/api/tasks', taskPayload);

        window.dispatchEvent(new CustomEvent('app:toast', { 
          detail: { type: 'success', message: isArabic ? 'تم إسناد المهمة بنجاح' : 'Task assigned successfully' } 
        }));
        setShowAssign(false);
        // Navigate to tasks page
        navigate('/tasks');
      }
      else if (assignContext === 'lead') {
         // Handle Lead Assignment
         // Usually assigning existing leads to these departments/users
         // But here we are likely creating a lead or assigning these departments to a lead?
         // The context "Assign Lead" in bulk usually means "Assign selected items (Departments) to a Lead" OR "Assign a Lead to selected Departments".
         // Given "Assignment Center" nature, it's likely creating/assigning a work item to the selected targets.
         
         // If payload has leadId, we are assigning that lead to selected departments
         if (payload.leadId) {
            await api.post('/api/leads/assign', {
               lead_id: payload.leadId,
               department_ids: selectedDeptIds
            });
             window.dispatchEvent(new CustomEvent('app:toast', { 
              detail: { type: 'success', message: isArabic ? 'تم إسناد العميل المحتمل بنجاح' : 'Lead assigned successfully' } 
            }));
            setShowAssign(false);
         }
      }
      else if (assignContext === 'ticket') {
         // Handle Ticket Assignment
         const ticketPayload = {
            subject: payload.title,
            description: payload.description,
            priority: payload.priority,
            status: payload.ticketStatus,
            type: payload.ticketType,
            channel: payload.channel,
            department_ids: selectedDeptIds,
            // ... other fields
         };
         await api.post('/api/tickets', ticketPayload);
          window.dispatchEvent(new CustomEvent('app:toast', { 
            detail: { type: 'success', message: isArabic ? 'تم إنشاء التذكرة بنجاح' : 'Ticket created successfully' } 
          }));
          setShowAssign(false);
      }
    } catch (err) {
      console.error('Assignment error:', err);
      window.dispatchEvent(new CustomEvent('app:toast', { 
        detail: { type: 'error', message: isArabic ? 'فشل العملية' : 'Operation failed' } 
      }));
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-theme-text mb-1">
            {isArabic ? 'الأقسام' : 'Departments'}
          </h1>
          <p className="text-sm text-[var(--muted-text)]">
            {isArabic ? 'إدارة الهيكل التنظيمي والأقسام' : 'Manage organizational structure and departments'}
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-row gap-3 w-full lg:w-auto">
          {/* Import/Export/Add Actions */}
          <div className="w-full lg:w-auto flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
            {canAddDepartment && (
              <>
                <button 
                  onClick={() => setImportModalOpen(true)}
                  className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-500 !text-white border-none flex items-center justify-center gap-2"
                >
                  <FaFileImport />
                  {isArabic ? 'استيراد' : 'Import'}
                </button>
                
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-blue-700 !text-white border-none flex items-center justify-center gap-2"
                >
                  <FaPlus />
                  {isArabic ? 'إضافة قسم' : 'Add New Department'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="glass-panel p-4 rounded-xl mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-theme-text ">
            <Filter className="text-blue-500" size={16} /> {isArabic ? 'تصفية' : 'Filter'}
          </h2>
          <div className="flex items-center gap-2">

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
              placeholder={isArabic ? 'بحث (اسم، مدير)...' : 'Search (name, manager)...'}
            />
          </div>

          {/* 2. STATUS */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isArabic ? 'الحالة' : 'Status'}
            </label>
            <SearchableSelect
              options={['Active', 'Inactive'].map(o => ({ value: o, label: o }))}
              value={filters.status}
              onChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
              placeholder={isArabic ? 'اختر الحالة' : 'Select Status'}
              className="w-full"
              isRTL={isArabic}
              multiple={true}
            />
          </div>

          {/* 3. MANAGER (Multi) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isArabic ? 'المدير' : 'Manager'}
            </label>
            <SearchableSelect
              options={managers.map(o => ({ value: o, label: o }))}
              value={filters.manager}
              onChange={(v) => setFilters(prev => ({ ...prev, manager: v }))}
              placeholder={isArabic ? 'اختر المدير' : 'Select Manager'}
              className="w-full"
              isRTL={isArabic}
              multiple={true}
            />
          </div>

          {/* 4. CREATED DATE (Range) */}
          <div className="space-y-1">
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
        </div>

        {/* Secondary/Hidden Filters Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-300 overflow-hidden ${showAllFilters ? 'max-h-[500px] opacity-100 pt-3' : 'max-h-0 opacity-0'}`}>
          
        </div>
      </div>

        {/* Bulk actions bar (only shows when rows selected) */}
        {selectedDeptIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 text-sm font-medium text-theme-text border-r border-gray-200 dark:border-gray-700 pr-4 rtl:border-l rtl:border-r-0 rtl:pl-4 rtl:pr-0">
              <span className="text-[var(--muted-text)]">{bulkLabels.title}:</span>
            </div>
            
            <div className="flex items-center gap-2">
               <button 
                 className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors tooltip"
                 onClick={()=>openAssign('task')}
                 title={bulkLabels.assignTask}
               >
                 <ClipboardCheck size={18} />
               </button>
               <button 
                 className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors tooltip"
                 onClick={()=>openAssign('lead')}
                 title={bulkLabels.assignLead}
               >
                 <Handshake size={18} />
               </button>
               <button 
                 className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors tooltip"
                 onClick={()=>openAssign('ticket')}
                 title={bulkLabels.assignTicket}
               >
                 <Ticket size={18} />
               </button>
               <button 
                 className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors tooltip"
                 onClick={()=>{
                    if (selectedDeptIds.length===0) return alert(bulkLabels.selectFirst)
                    if (!window.confirm(bulkLabels.confirmDelete(selectedDeptIds.length))) return
                    setDepartments(prev=>prev.filter(d=>!selectedDeptIds.includes(d.id)))
                    setSelectedDeptIds([])
                    alert(bulkLabels.deletedMsg)
                 }}
                 title={bulkLabels.deleteSelected}
               >
                 <Trash size={18} />
               </button>
             </div>
          </div>
        )}

        <div className="glass-panel rounded-xl overflow-hidden w-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-lg">{isArabic ? 'قائمة الأقسام' : 'Departments List'}</h3>
            <button
              onClick={exportDepartmentsToExcel}
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
                  <input type="checkbox" className="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-1">
                    {isArabic ? 'معرّف القسم' : 'Department ID'}
                    <ArrowUpDown size={12} className={sortBy === 'id' ? 'text-blue-500' : 'opacity-30'} />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('name')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'اسم القسم' : 'Department Name'}
                    <ArrowUpDown size={12} className={sortBy === 'name' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('manager')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'مدير القسم' : 'Department Manager'}
                    <ArrowUpDown size={12} className={sortBy === 'manager' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('teamsCount')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'عدد الفرق' : 'Teams Count'}
                    <ArrowUpDown size={12} className={sortBy === 'teamsCount' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('employeesCount')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'عدد الموظفين' : 'Employees Count'}
                    <ArrowUpDown size={12} className={sortBy === 'employeesCount' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('createdAt')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'تاريخ الإنشاء' : 'Created Date'}
                    <ArrowUpDown size={12} className={sortBy === 'createdAt' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('status')}>
                   <div className="flex items-center gap-1">
                    {isArabic ? 'الحالة' : 'Status'}
                    <ArrowUpDown size={12} className={sortBy === 'status' ? 'text-blue-500' : 'opacity-30'} />
                   </div>
                </th>
                <th className="p-3 rounded-r-lg">{isArabic ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndPaginated.map((d) => (
                <tr key={d.id} className="hover:bg-gray-800/50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="p-3">
                    <input type="checkbox" className="checkbox" checked={selectedDeptIds.includes(d.id)} onChange={() => toggleSelect(d.id)} />
                  </td>
                  <td className="p-3 text-sm">{d.id}</td>
                  <td className="p-3">
                    <Link to={`/user-management/departments/${d.id}`} className="font-medium hover:text-blue-600 transition-colors">
                      {d.name}
                    </Link>
                  </td>
                  <td className="p-3 text-sm">{d.manager?.name || d.manager || '-'}</td>
                  <td className="p-3 text-sm">{d.teamsCount || d.teams_count || 0}</td>
                  <td className="p-3 text-sm">{d.employeesCount || d.employees_count || 0}</td>
                  <td className="p-3 text-sm text-[var(--muted-text)]" dir="ltr">{d.createdAt}</td>
                  <td className="p-3">
                    <span className={`badge border-0 ${
                      d.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <DepartmentActions
                      dept={d}
                      onPreview={() => handlePreviewDepartment(d)}
                      onEdit={() => handleEditDepartment(d)}
                      onToggleActive={() => handleStatusToggle(d)}
                      onDelete={() => deleteDepartment(d.id)}
                      onAssignManager={() => alert(isArabic ? 'تعيين مدير للقسم' : 'Assign department manager')}
                    />
                  </td>
                </tr>
              ))}
              {sortedAndPaginated.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-[var(--muted-text)]">
                    {isArabic ? 'لا توجد بيانات' : 'No data found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden grid grid-cols-1 gap-3 p-4">
           {sortedAndPaginated.map((d) => (
             <div key={d.id} className=" p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative group">
                <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-sm" 
                      checked={selectedDeptIds.includes(d.id)} 
                      onChange={() => toggleSelect(d.id)} 
                    />
                 </div>

                 <div className="pr-8 rtl:pr-0 rtl:pl-8">
                   <div className="flex items-start justify-between mb-2">
                     <div>
                       <Link to={`/user-management/departments/${d.id}`} className="font-bold text-base hover:text-blue-600 transition-colors block">
                         {d.name}
                       </Link>
                       <span className="text-xs text-[var(--muted-text)]">{d.id}</span>
                     </div>
                     <span className={`badge badge-sm border-0 ${
                        d.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                        'bg-gray-100 text-theme-text dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {d.status}
                      </span>
                   </div>
                   
                   <div className="space-y-1 mb-3">
                    <div className="text-sm flex items-center gap-2">
                        <span className="text-[var(--muted-text)] text-xs">{isArabic ? 'المدير:' : 'Manager:'}</span>
                        <span className="font-medium">{d.manager?.name || d.manager || '-'}</span>
                     </div>
                     <div className="flex items-center gap-4 text-xs text-[var(--muted-text)]">
                        <div className="flex items-center gap-1">
                           <span>{isArabic ? 'الفرق:' : 'Teams:'}</span>
                           <span className="font-semibold text-theme-text">{d.teamsCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <span>{isArabic ? 'الموظفين:' : 'Employees:'}</span>
                           <span className="font-semibold text-theme-text">{d.employeesCount}</span>
                        </div>
                     </div>
                   </div>
                 </div>

                 <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs text-[var(--muted-text)]">{d.createdAt}</span>
                    <div className="flex justify-end">
                      <DepartmentActions
                          dept={d}
                          onPreview={() => handlePreviewDepartment(d)}
                          onEdit={() => handleEditDepartment(d)}
                          onToggleActive={() => setDepartments(prev => prev.map(x => x.id === d.id ? { ...x, status: x.status === 'Active' ? 'Inactive' : 'Active' } : x))}
                          onDelete={() => deleteDepartment(d.id)}
                          onAssignManager={() => alert(isArabic ? 'تعيين مدير للقسم' : 'Assign department manager')}
                        />
                    </div>
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
                <ChevronLeft className={`w-5 h-5 block text-theme-text ${isArabic ? 'rotate-180' : ''}`} />
              </button>
              <span className="text-xs sm:text-sm px-2 text-theme-text">{isArabic ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
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

      {/* Assignment Modal */}
      {showAssign && (
        <AssignmentModal
          open={showAssign}
          onClose={() => setShowAssign(false)}
          onSubmit={handleAssignSubmit}
          context={assignContext}
          defaultTargetId={defaultTargetId}
          defaultTargetIds={!defaultTargetId && selectedDeptIds.length > 0 ? selectedDeptIds : []}
          defaultAssignType={defaultAssignType}
          users={users}
        />
      )}

      {showCreateModal && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
             <div className="w-full max-w-5xl h-[90vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
               <UserManagementDepartmentForm 
                 onClose={() => setShowCreateModal(false)} 
                 onSuccess={(newDept) => {
                   fetchDepartments();
                   setShowCreateModal(false);
                 }}
               />
             </div>
          </div>,
          document.body
        )}

      {showEditModal && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
             <div className="w-full max-w-5xl h-[90vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
               <UserManagementDepartmentForm 
                 initialData={selectedDepartment}
                 onClose={() => setShowEditModal(false)} 
                 onSuccess={(updatedDept) => {
                   fetchDepartments();
                   setShowEditModal(false);
                 }}
               />
             </div>
          </div>,
          document.body
        )}

      <DepartmentPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        department={selectedDepartment}
      />

        <ImportDepartmentsModal
        isOpen={isImportModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={(data) => {
          setDepartments(prev => [...prev, ...data]);
          setImportModalOpen(false);
          alert(isArabic ? `تم استيراد ${data.length} قسم` : `Imported ${data.length} departments`);
        }}
      />
    </div>
  );
}
