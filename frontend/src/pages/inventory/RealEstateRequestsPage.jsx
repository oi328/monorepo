import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaFilter, FaChevronDown, FaSearch, FaFileImport, FaPlus, FaFileExport, FaEdit, FaTrash, FaCheck, FaBuilding, FaTimes, FaChevronLeft, FaChevronRight, FaFileContract } from 'react-icons/fa';

import { useDynamicFields } from '../../hooks/useDynamicFields';
import { getRequests, saveRequest, deleteRequest } from '../../data/realEstateRequests';
import { useAppState } from '../../shared/context/AppStateProvider'
import { api } from '../../utils/api';
import SearchableSelect from '../../components/SearchableSelect';

export default function RealEstateRequestsPage() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    
    const { fields: dynamicFields } = useDynamicFields('realEstateRequests');
    const { user, refreshInventoryBadges } = useAppState();

    const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {};
    const hasExplicitInventoryPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Inventory');
    const inventoryModulePerms = hasExplicitInventoryPerms && Array.isArray(modulePermissions.Inventory) ? modulePermissions.Inventory : [];
    const effectiveInventoryPerms = hasExplicitInventoryPerms ? inventoryModulePerms : (() => {
        const role = user?.role || '';
        if (role === 'Operation Manager') return ['addItems', 'addProject', 'addProperties', 'addBroker', 'addDeveloper', 'showRequests'];
        if (role === 'Branch Manager') return ['addItems', 'addProject', 'addProperties', 'addBroker', 'addDeveloper', 'showRequests'];
        return [];
    })();
    const roleLower = String(user?.role || '').toLowerCase();
    const isTenantAdmin =
        roleLower === 'admin' ||
        roleLower === 'tenant admin' ||
        roleLower === 'tenant-admin';
    const canManageRequests =
        effectiveInventoryPerms.includes('showRequests') ||
        user?.is_super_admin ||
        isTenantAdmin ||
        roleLower.includes('director');

    useEffect(() => {
        const markSeen = async () => {
            try {
                await api.post('/api/inventory/mark-seen', { page: 'requests' });
                await refreshInventoryBadges();
            } catch {}
        };
        markSeen();
    }, [refreshInventoryBadges]);

    const [requests, setRequests] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showAllFilters, setShowAllFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        project: '',
        unit: '',
        customer: '',
        search: ''
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newRequest, setNewRequest] = useState({
        customer: '',
        project: '',
        unit: '',
        amount: '',
        type: 'Booking',
        notes: ''
    });

    const [projects, setProjects] = useState([]);
    const [units, setUnits] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const [showImportModal, setShowImportModal] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const exportRealEstateRequestsCsv = () => {
        const headers = ['ID', 'Customer', 'Project', 'Unit', 'Type', 'Status', 'Date', 'Notes']
        const csvContent = [
            headers.join(','),
            ...filteredRequests.map(req => [
                `"${req.id}"`,
                `"${req.customer}"`,
                `"${req.project || ''}"`,
                `"${req.unit || ''}"`,
                `"${req.type}"`,
                `"${req.status}"`,
                `"${req.date}"`,
                `"${req.notes || ''}"`
            ].join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'real_estate_requests.csv'
        a.click(); URL.revokeObjectURL(url)
        setShowExportMenu(false)
    }

    const exportRealEstateRequestsPdf = async () => {
        try {
            const jsPDF = (await import('jspdf')).default
            const autoTable = (await import('jspdf-autotable')).default
            const doc = new jsPDF()
            
            const tableColumn = ["ID", "Customer", "Project", "Unit", "Type", "Status", "Date"]
            const tableRows = []

            filteredRequests.forEach(req => {
                const rowData = [
                    req.id,
                    req.customer,
                    req.project || '',
                    req.unit || '',
                    req.type,
                    req.status,
                    req.date
                ]
                tableRows.push(rowData)
            })

            doc.text("Real Estate Requests List", 14, 15)
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 20,
                styles: { font: 'helvetica', fontSize: 9 },
                headStyles: { fillColor: [66, 139, 202] }
            })
            doc.save("real_estate_requests_list.pdf")
            setShowExportMenu(false)
        } catch (error) {
            console.error("Export PDF Error:", error)
        }
    }

    const handleImport = (importedData) => {
        const newRequests = importedData.map((item, index) => ({
            ...item,
            id: Date.now() + index,
            status: item.status || 'Pending',
            date: item.date || new Date().toISOString().split('T')[0]
        }))
        
        const stored = localStorage.getItem('real_estate_requests');
        const existingRequests = stored ? JSON.parse(stored) : [];
        const updatedRequests = [...newRequests, ...existingRequests];
        
        localStorage.setItem('real_estate_requests', JSON.stringify(updatedRequests));
        window.dispatchEvent(new Event('real-estate-requests-updated'));
        setShowImportModal(false)
    }

    // Load data from API and listen for updates
    useEffect(() => {
        const fetchData = async () => {
            const data = await getRequests();
            setRequests(data);
        };
        
        fetchData();

        const handleUpdate = async () => {
            const data = await getRequests();
            setRequests(data);
        };

        window.addEventListener('real-estate-requests-updated', handleUpdate);
        return () => window.removeEventListener('real-estate-requests-updated', handleUpdate);
    }, []);

    // Load projects and units (from properties) for Add Request modal
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [propertiesRes, projectsRes] = await Promise.all([
                    api.get('/api/properties'),
                    api.get('/api/projects'),
                ]);

                const rawProjects = Array.isArray(projectsRes.data)
                    ? projectsRes.data
                    : (projectsRes.data.data || []);

                const rawProperties = Array.isArray(propertiesRes.data)
                    ? propertiesRes.data
                    : (propertiesRes.data.data || []);

                const mappedUnits = rawProperties.map(p => {
                    const projectMatch = rawProjects.find(pr =>
                        pr.id === p.project_id ||
                        pr.name === p.project ||
                        pr.name_ar === p.project ||
                        pr.title === p.project
                    );

                    return {
                        id: p.id,
                        name: p.unit_code || p.name || p.title || `#${p.id}`,
                        project_id: projectMatch ? projectMatch.id : (p.project_id ?? undefined),
                    };
                });

                setProjects(rawProjects);
                setUnits(mappedUnits);
            } catch (e) {
                console.error('Failed to fetch projects/units for real estate requests', e);
            }
        };
        fetchMeta();
    }, []);

    // Derived Data
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            if (filters.search) {
                const q = filters.search.toLowerCase();
                const pool = [req.customer, req.unit, req.project, req.type].map(x => (x || '').toLowerCase());
                if (!pool.some(v => v.includes(q))) return false;
            }
            if (filters.status && req.status !== filters.status) return false;
            if (filters.project && req.project !== filters.project) return false;
            if (filters.unit) {
                const q = filters.unit.toLowerCase();
                const unitStr = (req.unit || '').toLowerCase();
                const meta = req.meta_data || {};
                const unitCode = (meta.unit_code || meta.code || '').toLowerCase();
                const unitName = (meta.unit_name || meta.name || '').toLowerCase();
                if (![unitStr, unitCode, unitName].some(v => v && v.includes(q))) return false;
            }
            if (filters.customer && !req.customer.toLowerCase().includes(filters.customer.toLowerCase())) return false;
            return true;
        });
    }, [requests, filters]);

    const projectOptions = useMemo(() => [...new Set(requests.map(r => r.project))], [requests]);
    const statusOptions = ['Pending', 'Approved', 'Rejected', 'Converted'];

    // Pagination Logic
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredRequests.slice(start, start + itemsPerPage);
    }, [filteredRequests, currentPage]);

    // Handlers
    const handleStatusChange = async (id, newStatus) => {
        if (!canManageRequests) return;
        const request = requests.find(r => r.id === id);
        if (request) {
            await saveRequest({ ...request, status: newStatus });
        }
    };

    const handleAddRequest = async (e) => {
        e.preventDefault();
        if (!canManageRequests) return;
        if (editingId) {
            const request = requests.find(r => r.id === editingId);
            if (request) {
                await saveRequest({ ...request, ...newRequest });
            }
            setEditingId(null);
        } else {
            const request = {
                // id: Date.now(), // ID generated by backend
                ...newRequest,
                status: 'Pending',
                date: new Date().toISOString().split('T')[0]
            };
            await saveRequest(request);
        }
        setShowAddModal(false);
        setNewRequest({ customer: '', project: '', unit: '', amount: '', type: 'Booking', notes: '' });
    };

    const handleEdit = (request) => {
        setEditingId(request.id);
        setNewRequest({
            customer: request.customer,
            project: request.project,
            unit: request.unit,
            amount: request.amount || '',
            type: request.type,
            notes: request.notes || ''
        });
        setShowAddModal(true);
    };

    const handleDelete = async (id) => {
        if (!canManageRequests) return;
        if (window.confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this request?')) {
            await deleteRequest(id);
        }
    };

    const handleConvertToDeal = (request) => {
        if (!canManageRequests) return;
        // Create a new opportunity in localStorage
        const newOpportunity = {
            id: `OPP-RE-${Date.now()}`,
            customerId: request.customerId || `CUST-${Math.floor(Math.random() * 1000)}`,
            customerName: request.customer,
            status: 'New',
            amount: request.budget || 0,
            stage: 'Qualification',
            expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks for Real Estate
            createdAt: new Date().toISOString(),
            notes: `Converted from Real Estate Request #${request.id} for Project: ${request.project || 'N/A'}, Unit: ${request.unit || 'N/A'}. ${request.notes || ''}`,
            source: 'Real Estate Request'
        };

        try {
            const stored = localStorage.getItem('crm_opportunities');
            const opportunities = stored ? JSON.parse(stored) : [];
            opportunities.unshift(newOpportunity);
            localStorage.setItem('crm_opportunities', JSON.stringify(opportunities));
            
            // Dispatch event to notify other components
            window.dispatchEvent(new Event('crm_opportunities_updated'));
            
            alert(isRTL ? 'تم تحويل الطلب إلى صفقة بنجاح' : 'Request converted to deal successfully');
        } catch (error) {
            console.error('Error converting to deal:', error);
            alert(isRTL ? 'حدث خطأ أثناء التحويل' : 'Error converting to deal');
        }
    };

    const clearFilters = () => {
        setFilters({
            status: '',
            project: '',
            unit: '',
            customer: '',
            search: ''
        });
    };

    return (
        <div className="space-y-6 pt-4">
            {/* Header */}
            <div className="flex  flex-wrap items-center justify-between">
                <div className="relative inline-block">
                    <h1 className="text-2xl font-bold  dark:text-white flex items-center gap-2">
                        {isRTL ? 'طلبات العقارات' : 'Real Estate Requests'}
                    </h1>
                    <span aria-hidden className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" style={{ width: 'calc(100% + 8px)', left: isRTL ? 'auto' : '-4px', right: isRTL ? '-4px' : 'auto', bottom: '-4px' }}></span>
                </div>
                <div className="w-full lg:w-auto flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">

                     <button 
                       className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2"
                       onClick={() => setShowImportModal(true)}
                     >
                       <FaFileImport className='text-white'/>
                       <span className="text-white">{isRTL ? 'استيراد' : 'Import'}</span>
                     </button>
                    {canManageRequests && (
                        <button 
                            onClick={() => {
                                setEditingId(null);
                                setSelectedProjectId('');
                                setNewRequest({ customer: '', project: '', unit: '', amount: '', type: 'Booking', notes: '' });
                                setShowAddModal(true);
                            }}
                            className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-green-500 text-white border-none flex items-center justify-center gap-2"
                        >
                            <FaPlus size={14} className='text-white'/>
                            <span className="text-white">{isRTL ? 'إضافة طلب' : 'Add Request'}</span>
                        </button>
                    )}
                    <div className="relative w-full lg:w-auto">
                       <button 
                         className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2"
                         onClick={() => setShowExportMenu(!showExportMenu)}
                       >
                         <FaFileExport className='text-white' />
                         <span className="text-white">{isRTL ? 'تصدير' : 'Export'}</span>
                       </button>
                       {showExportMenu && (
                         <div className="absolute w-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                           <button onClick={exportRealEstateRequestsCsv} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center gap-2">
                             <span className="text-green-600 font-bold">CSV</span> Export as CSV
                           </button>
                           <button onClick={exportRealEstateRequestsPdf} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center gap-2">
                             <span className="text-red-600 font-bold">PDF</span> Export as PDF
                           </button>
                         </div>
                       )}
                     </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                        <FaFilter className="text-blue-500" /> {isRTL ? 'تصفية' : 'Filter'}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowAllFilters(prev => !prev)} 
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                        >
                            {showAllFilters ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض الكل' : 'Show All')} <FaChevronDown className={`transform transition-transform ${showAllFilters ? 'rotate-180' : ''}`} />
                        </button>
                        <button 
                            onClick={clearFilters} 
                            className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            {isRTL ? 'إعادة تعيين' : 'Reset'}
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
                            <FaSearch className="text-blue-500" size={10} /> {isRTL ? 'بحث' : 'Search'}
                        </label>
                        <input 
                            className="input w-full" 
                            value={filters.search} 
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} 
                            placeholder={isRTL ? 'بحث...' : 'Search...'} 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[var(--muted-text)]">{isRTL ? 'المشروع' : 'Project'}</label>
                        <SearchableSelect 
                            options={projectOptions} 
                            value={filters.project} 
                            onChange={val => setFilters(prev => ({ ...prev, project: val }))} 
                            isRTL={isRTL} 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[var(--muted-text)]">{isRTL ? 'العميل' : 'Customer'}</label>
                        <input 
                            className="input w-full" 
                            value={filters.customer} 
                            onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))} 
                            placeholder={isRTL ? 'اسم العميل' : 'Customer Name'} 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[var(--muted-text)]">{isRTL ? 'الوحدة' : 'Unit'}</label>
                        <input 
                            className="input w-full" 
                            value={filters.unit} 
                            onChange={(e) => setFilters(prev => ({ ...prev, unit: e.target.value }))} 
                            placeholder={isRTL ? 'اسم أو كود الوحدة' : 'Unit name or code'} 
                        />
                    </div>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-300 overflow-hidden ${showAllFilters ? 'max-h-[300px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[var(--muted-text)]">{isRTL ? 'الحالة' : 'Status'}</label>
                        <select 
                            className="input w-full" 
                            value={filters.status} 
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="">{isRTL ? 'الكل' : 'All'}</option>
                            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
                <h2 className="text-xl font-medium mb-4">{isRTL ? 'قائمة الطلبات' : 'Requests List'}</h2>
                <div className="overflow-x-auto hidden md:block">
                    <table className="nova-table w-full">
                        <thead className="thead-soft">
                            <tr >
                                <th className={`px-3 py-3 text-xs font-semibold  uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'رقم الطلب' : 'Request ID'}</th>
                                <th className={`px-3 py-3 text-xs font-semibold  uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'النوع' : 'Type'}</th>
                                <th className={`px-3 py-3 text-xs font-semibold  uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'العميل' : 'Customer'}</th>
                                <th className={`px-3 py-3 text-xs font-semibold  uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المشروع' : 'Project'}</th>
                                <th className={`px-3 py-3 text-xs font-semibold  uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الوحدة' : 'Unit'}</th>
                                {/* Dynamic Headers */}
                                {dynamicFields.map(field => (
                                    <th key={field.key} className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`} style={{ minWidth: '120px' }}>
                                        {isRTL ? field.label_ar : field.label_en}
                                    </th>
                                ))}
                                <th className={`px-3 py-3 text-xs font-semibold  uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التاريخ' : 'Date'}</th>
                                <th className={`px-3 py-3 text-xs font-semibold  uppercase tracking-wider text-center`}>{isRTL ? 'الحالة' : 'Status'}</th>
                                <th className={`px-3 py-3 text-xs font-semibold  uppercase tracking-wider text-center`}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedRequests.map((request) => (
                                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                                        #{request.id}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm  dark:text-gray-300">
                                        {request.type}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center  dark:text-blue-400 font-bold text-xs">
                                                {request.customer.charAt(0)}
                                            </div>
                                            <div className="text-sm font-medium t dark:text-white">{request.customer}</div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm  dark:text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <FaBuilding  size={12} />
                                            {request.project}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-mono  dark:text-gray-300">
                                        {request.unit}
                                    </td>
                                    {/* Dynamic Cells */}
                                    {dynamicFields.map(field => (
                                        <td key={field.key} className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                            {request.custom_fields?.[field.key] || '-'}
                                        </td>
                                    ))}
                                    <td className="px-3 py-4 whitespace-nowrap text-sm  dark:text-gray-400">
                                        {request.date}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${request.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
                                              request.status === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 
                                              request.status === 'Converted' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                                            {request.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {canManageRequests && request.status === 'Pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleStatusChange(request.id, 'Approved')}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                                        title={isRTL ? 'قبول' : 'Approve'}
                                                    >
                                                        <FaCheck size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleStatusChange(request.id, 'Rejected')}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                        title={isRTL ? 'رفض' : 'Reject'}
                                                    >
                                                        <FaTimes size={16} />
                                                    </button>
                                                </>
                                            )}
                                            {canManageRequests && request.status === 'Approved' && (
                                                <button 
                                                    onClick={() => handleConvertToDeal(request)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                                    title={isRTL ? 'تحويل إلى صفقة' : 'Convert to Deal'}
                                                >
                                                    <FaFileContract size={16} />
                                                </button>
                                            )}
                                            
                                            {canManageRequests && (
                                                <button 
                                                    onClick={() => handleDelete(request.id)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                    title={isRTL ? 'حذف' : 'Delete'}
                                                >
                                                    <FaTrash size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {paginatedRequests.map((request) => (
                        <div key={request.id} className="p-4 rounded-xl glass-panel border border-gray-100 dark:border-gray-700/50 space-y-3">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/30">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">#{request.id}</span>
                                <span className="text-xs text-[var(--muted-text)]">{request.date}</span>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[var(--muted-text)]">{isRTL ? 'العميل' : 'Customer'}:</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center dark:text-blue-400 font-bold text-[10px]">
                                            {request.customer.charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium">{request.customer}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[var(--muted-text)]">{isRTL ? 'النوع' : 'Type'}:</span>
                                    <span className="text-sm">{request.type}</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[var(--muted-text)]">{isRTL ? 'المشروع' : 'Project'}:</span>
                                    <div className="flex items-center gap-2 text-sm">
                                        <FaBuilding size={12} className="text-[var(--muted-text)]" />
                                        <span>{request.project}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[var(--muted-text)]">{isRTL ? 'الوحدة' : 'Unit'}:</span>
                                    <span className="text-sm font-mono">{request.unit}</span>
                                </div>

                                {/* Dynamic Fields Display */}
                                {dynamicFields.map(field => {
                                    const val = request.custom_fields?.[field.key];
                                    if (!val) return null;
                                    return (
                                        <div key={field.key} className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <FaTags size={10} className="text-[var(--muted-text)]" />
                                                <span className="text-xs text-[var(--muted-text)]">{isRTL ? field.label_ar : field.label_en}:</span>
                                            </div>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{String(val)}</span>
                                        </div>
                                    );
                                })}
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[var(--muted-text)]">{isRTL ? 'الحالة' : 'Status'}:</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                        ${request.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
                                          request.status === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 
                                          request.status === 'Converted' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                                        {request.status}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="pt-3 border-t border-gray-100 dark:border-gray-700/30 flex justify-end gap-2">
                                {canManageRequests && request.status === 'Pending' && (
                                    <>
                                        <button 
                                            onClick={() => handleStatusChange(request.id, 'Approved')}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                            title={isRTL ? 'قبول' : 'Approve'}
                                        >
                                            <FaCheck size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleStatusChange(request.id, 'Rejected')}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                            title={isRTL ? 'رفض' : 'Reject'}
                                        >
                                            <FaTimes size={16} />
                                        </button>
                                    </>
                                )}
                                {canManageRequests && request.status === 'Approved' && (
                                    <button 
                                        onClick={() => handleConvertToDeal(request)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                        title={isRTL ? 'تحويل إلى صفقة' : 'Convert to Deal'}
                                    >
                                        <FaFileContract size={16} />
                                    </button>
                                )}
                                {canManageRequests && (
                                    <>
                                        <button 
                                            onClick={() => handleEdit(request)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                            title={isRTL ? 'تعديل' : 'Edit'}
                                        >
                                            <FaEdit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(request.id)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                            title={isRTL ? 'حذف' : 'Delete'}
                                        >
                                            <FaTrash size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination Footer */}
                {filteredRequests.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center justify-between rounded-xl p-2 glass-panel gap-4">
                        <div className="text-xs text-[var(--muted-text)]">
                            {isRTL 
                                ? `عرض ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredRequests.length)} من ${filteredRequests.length}`
                                : `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredRequests.length)} of ${filteredRequests.length}`
                            }
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage <= 1}
                                    title={isRTL ? 'السابق' : 'Prev'}
                                >
                                    <FaChevronLeft className={isRTL ? 'scale-x-[-1]' : ''} />
                                </button>
                                <span className="text-sm whitespace-nowrap">{isRTL ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
                                <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                    title={isRTL ? 'التالي' : 'Next'}
                                >
                                    <FaChevronRight className={isRTL ? 'scale-x-[-1]' : ''} />
                                </button>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-[var(--muted-text)] whitespace-nowrap">{isRTL ? 'لكل صفحة:' : 'Per page:'}</span>
                                <select
                                    className="input w-16 text-sm py-0 px-2 h-8"
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showImportModal && (
                <RealEstateRequestsImportModal
                    onClose={() => setShowImportModal(false)}
                    onImport={handleImport}
                    isRTL={isRTL}
                />
            )}

            {/* Add Request Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                    <div className="absolute inset-0 flex items-start justify-center p-6 md:p-6">
                        <div className="card p-4 sm:p-6 mt-4 w-[92vw] sm:w-[80vw] lg:w-[60vw] xl:max-w-3xl">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-medium">
                                    {editingId 
                                        ? (isRTL ? 'تعديل الطلب' : 'Edit Request') 
                                        : (isRTL ? 'إضافة طلب جديد' : 'Add New Request')
                                    }
                                </h2>
                                <button 
                                    type="button" 
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-red-600 hover:bg-red-50 shadow-md transition-colors" 
                                    onClick={() => setShowAddModal(false)}
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAddRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">{isRTL ? 'العميل' : 'Customer'}</label>
                                    <input 
                                        required
                                        className="input w-full bg-gray-50 dark:bg-gray-800/60" 
                                        value={newRequest.customer}
                                        onChange={e => setNewRequest(prev => ({ ...prev, customer: e.target.value }))}
                                        placeholder={isRTL ? 'اسم العميل' : 'Customer Name'} 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">{isRTL ? 'المشروع' : 'Project'}</label>
                                    <div className="relative">
                                        <select
                                            className="input w-full appearance-none pr-8"
                                            value={selectedProjectId}
                                            onChange={e => {
                                                const id = e.target.value;
                                                setSelectedProjectId(id);
                                                const proj = projects.find(p => String(p.id) === id);
                                                setNewRequest(prev => ({
                                                    ...prev,
                                                    project: proj ? (proj.name || proj.name_ar || proj.title || '') : '',
                                                    unit: ''
                                                }));
                                            }}
                                        >
                                            <option value="">{isRTL ? 'اختر' : 'Select'}</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name || p.name_ar || p.title || p.name_en}
                                                </option>
                                            ))}
                                        </select>
                                        <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">{isRTL ? 'الوحدة' : 'Unit'}</label>
                                    <div className="relative">
                                        <select
                                            className="input w-full appearance-none pr-8"
                                            value={newRequest.unit}
                                            onChange={e => setNewRequest(prev => ({ ...prev, unit: e.target.value }))}
                                        >
                                            <option value="">{isRTL ? 'اختر' : 'Select'}</option>
                                            {units
                                                .filter(u => !selectedProjectId || String(u.project_id) === String(selectedProjectId))
                                                .map(u => (
                                                    <option key={u.id} value={u.name}>
                                                        {u.name}
                                                    </option>
                                                ))}
                                        </select>
                                        <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">{isRTL ? 'قيمة الحجز' : 'Reservation Amount'}</label>
                                    <input 
                                        type="number"
                                        className="input w-full" 
                                        value={newRequest.amount}
                                        onChange={e => setNewRequest(prev => ({ ...prev, amount: e.target.value }))}
                                        placeholder={isRTL ? 'قيمة الحجز' : 'Reservation Amount'} 
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-1">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                                    <textarea 
                                        className="input w-full h-24 resize-none" 
                                        value={newRequest.notes}
                                        onChange={e => setNewRequest(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder={isRTL ? 'تفاصيل الطلب...' : 'Request details...'}
                                    ></textarea>
                                </div>
                                <div className={`md:col-span-2 flex gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                                    <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium">
                                        {isRTL ? 'حفظ' : 'Save'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
