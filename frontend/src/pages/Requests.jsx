import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getRequests, saveRequest, deleteRequest } from '../data/inventoryRequests';
import { logExportEvent } from '../utils/api';
import { FaThList, FaThLarge, FaPlus, FaDownload, FaUpload, FaFileExcel, FaFilePdf, FaFilter, FaChevronDown, FaUndoAlt, FaCalendarAlt, FaCheck, FaTimes, FaTrash, FaChevronLeft, FaChevronRight, FaEdit } from 'react-icons/fa';
import SearchableSelect from '../components/SearchableSelect';
import CreateRequestModal from '../components/CreateRequestModal';
import ImportRequestsModal from '../components/ImportRequestsModal';
import AssignmentModal from '../components/AssignmentModal';

export default function Requests() {
  const { t, i18n } = useTranslation();
  const [isRTL, setIsRTL] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [viewMode, setViewMode] = useState('list');

  // Filters
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState([]); // Pending, Approved, Rejected, In Progress
  const [types, setTypes] = useState([]); // Inquiry, Maintenance, Booking
  const [priorities, setPriorities] = useState([]); // Low, Medium, High
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [propertyUnitFilter, setPropertyUnitFilter] = useState('All');
  const [paymentPlanFilter, setPaymentPlanFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('');
  const [quantityFilter, setQuantityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('All');
  const [descriptionFilter, setDescriptionFilter] = useState('');

  const statusOptions = ['Pending','In Progress','Approved','Rejected'];
  const typeOptions = ['Inquiry','Maintenance','Booking'];
  const priorityOptions = ['Low','Medium','High'];

  const toggleInList = (list, setter, value) => {
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    setter(next);
  };

  const chips = [
    ...statuses.map((s) => ({ label: s, kind: 'status' })),
    ...types.map((t) => ({ label: t, kind: 'type' })),
    ...priorities.map((p) => ({ label: p, kind: 'priority' })),
    ...(dateFrom ? [{ label: `From ${dateFrom}`, kind: 'from' }] : []),
    ...(dateTo ? [{ label: `To ${dateTo}`, kind: 'to' }] : []),
  ];

  // Modals
  const [openCreate, setOpenCreate] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openExportMenu, setOpenExportMenu] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [openAssign, setOpenAssign] = useState(false);
  const [assignTargetRequest, setAssignTargetRequest] = useState(null);

  useEffect(() => {
    setIsRTL(String(i18n.language || '').startsWith('ar'));
  }, [i18n.language]);

  const [filtersOpen, setFiltersOpen] = useState(true);

  const translateStatus = (s) => isRTL ? (s === 'Pending' ? 'قيد الانتظار' : s === 'In Progress' ? 'قيد التنفيذ' : s === 'Approved' ? 'معتمد' : s === 'Rejected' ? 'مرفوض' : s) : s;
  const translateType = (s) => isRTL ? (s === 'Inquiry' ? 'استفسار' : s === 'Maintenance' ? 'صيانة' : s === 'Booking' ? 'حجز' : s) : s;
  const translatePriority = (p) => isRTL ? (p === 'High' ? 'عالية' : p === 'Medium' ? 'متوسطة' : p === 'Low' ? 'منخفضة' : p) : p;
  const Label = {
    title: isRTL ? 'لوحة الطلبات' : 'Requests',
    addRequest: isRTL ? 'إضافة طلب' : 'Add Request',
    import: t('Import'),
    export: t('Export'),
    excel: t('Excel'),
    pdf: t('PDF'),
    page: t('Page'),
    prev: t('Previous'),
    next: t('Next'),
    columns: {
      id: t('ID'),
      customerName: isRTL ? 'اسم العميل' : 'Customer Name',
      type: t('Type'),
      priority: t('Priority'),
      propertyUnit: t('Property / Unit'),
      paymentPlan: t('Payment Plan'),
      product: t('Product'),
      quantity: t('Quantity'),
      status: t('Status'),
      createdAt: isRTL ? 'تاريخ الإنشاء' : 'Created At',
      updatedAt: isRTL ? 'تاريخ التحديث' : 'Updated At',
      assignedTo: isRTL ? 'مُعيّن إلى' : 'Assigned To',
      description: t('Description')
    },
    actions: t('Actions'),
    noMatch: isRTL ? 'لا توجد طلبات مطابقة للمرشحات' : 'No requests match filters.'
  };

  const allColumns = Label.columns;

  const getInventoryMode = () => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('systemPrefs') : null;
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs && typeof prefs.inventoryMode === 'string') return prefs.inventoryMode;
      }
    } catch {}
    return 'project';
  };

  const inventoryMode = useMemo(() => getInventoryMode(), []);
  const showPU = inventoryMode === 'project';
  const showPQ = inventoryMode === 'product';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentPlanOptions = useMemo(() => {
    const set = new Set();
    requests.forEach(r => { if (r.paymentPlan) set.add(r.paymentPlan) });
    return Array.from(set);
  }, [requests]);

  const assignedOptions = useMemo(() => {
    const set = new Set();
    requests.forEach(r => { if (r.assignedTo) set.add(r.assignedTo) });
    return Array.from(set);
  }, [requests]);

  const propertyUnitOptions = useMemo(() => {
    const set = new Set();
    requests.forEach(r => { if (r.propertyUnit) set.add(r.propertyUnit) });
    return Array.from(set);
  }, [requests]);

  const productOptions = useMemo(() => {
    const set = new Set();
    requests.forEach(r => { if (r.product) set.add(r.product) });
    return Array.from(set);
  }, [requests]);

  const localizedAll = t('All');
  const statusSelectOptions = useMemo(() => [{ value: 'All', label: localizedAll }, ...statusOptions.map(s => ({ value: s, label: translateStatus(s) }))], [localizedAll, isRTL]);
  const typeSelectOptions = useMemo(() => [{ value: 'All', label: localizedAll }, ...typeOptions.map(s => ({ value: s, label: translateType(s) }))], [localizedAll, isRTL]);
  const prioritySelectOptions = useMemo(() => [{ value: 'All', label: localizedAll }, ...priorityOptions.map(s => ({ value: s, label: translatePriority(s) }))], [localizedAll, isRTL]);
  const paymentPlanSelectOptions = useMemo(() => [{ value: 'All', label: localizedAll }, ...paymentPlanOptions.filter(Boolean).map(p => ({ value: p, label: p }))], [localizedAll, paymentPlanOptions]);
  const assignedSelectOptions = useMemo(() => [{ value: 'All', label: localizedAll }, ...assignedOptions.filter(Boolean).map(u => ({ value: u, label: u }))], [localizedAll, assignedOptions]);
  const propertyUnitSelectOptions = useMemo(() => [{ value: 'All', label: localizedAll }, ...propertyUnitOptions.filter(Boolean).map(u => ({ value: u, label: u }))], [localizedAll, propertyUnitOptions]);
  const productSelectOptions = useMemo(() => [{ value: 'All', label: localizedAll }, ...productOptions.filter(Boolean).map(p => ({ value: p, label: p }))], [localizedAll, productOptions]);

  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    customerName: true,
    type: true,
    priority: true,
    propertyUnit: showPU,
    paymentPlan: true,
    product: showPQ,
    quantity: showPQ,
    status: true,
    createdAt: true,
    updatedAt: true,
    assignedTo: true,
    description: true
  });

  const handleColumnToggle = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetVisibleColumns = () => {
    const allVisible = {};
    Object.keys(allColumns).forEach(k => allVisible[k] = true);
    allVisible.propertyUnit = showPU;
    allVisible.product = showPQ;
    allVisible.quantity = showPQ;
    setVisibleColumns(allVisible);
  };

  const handleCreateClick = () => {
    console.log('Create button clicked');
    setEditingRequest(null);
    setOpenCreate(true);
  };

  useEffect(() => {
    console.log('openCreate changed:', openCreate);
  }, [openCreate]);

  useEffect(() => {
    fetchData();

    const handleUpdate = () => {
      fetchData();
    };

    window.addEventListener('inventory-requests-updated', handleUpdate);
    return () => window.removeEventListener('inventory-requests-updated', handleUpdate);
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const q = query.trim().toLowerCase();
      const matchQuery = !q ||
        String(r.id).includes(q) ||
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.propertyUnit || '').toLowerCase().includes(q) ||
        (r.product || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q);

      const matchStatus = !statuses.length || statuses.includes(r.status);
      const matchType = !types.length || types.includes(r.type);
      const matchPriority = !priorities.length || priorities.includes(r.priority);

      const created = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      const fromOk = !dateFrom || created >= new Date(dateFrom).getTime();
      const toOk = !dateTo || created <= new Date(dateTo).getTime();

      const matchId = !idFilter || String(r.id).includes(String(idFilter).trim());
      const matchCustomer = !customerFilter || (r.customerName || '').toLowerCase().includes(customerFilter.toLowerCase());
      const matchPU = !showPU || propertyUnitFilter === 'All' || (r.propertyUnit || '') === propertyUnitFilter;
      const matchPP = paymentPlanFilter === 'All' || (r.paymentPlan || '') === paymentPlanFilter;
      const matchProd = !showPQ || !productFilter || (r.product || '').toLowerCase().includes(productFilter.toLowerCase());
      const matchQty = !showPQ || !quantityFilter || Number(r.quantity) === Number(quantityFilter);
      const matchAssigned = assignedFilter === 'All' || (r.assignedTo || '') === assignedFilter;
      const matchDesc = !descriptionFilter || (r.description || '').toLowerCase().includes(descriptionFilter.toLowerCase());

      return matchQuery && matchStatus && matchType && matchPriority && fromOk && toOk &&
        matchId && matchCustomer && matchPU && matchPP && matchProd && matchQty && matchAssigned && matchDesc;
    });
  }, [
    requests,
    query,
    statuses,
    types,
    priorities,
    dateFrom,
    dateTo,
    idFilter,
    customerFilter,
    propertyUnitFilter,
    paymentPlanFilter,
    productFilter,
    quantityFilter,
    assignedFilter,
    descriptionFilter,
    showPU,
    showPQ,
  ]);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page, perPage]);
  useEffect(() => { setPage(1); }, [perPage]);

  const clearFilters = () => {
    setQuery('');
    setStatuses([]);
    setTypes([]);
    setPriorities([]);
    setDateFrom('');
    setDateTo('');
    setIdFilter('');
    setCustomerFilter('');
    setPropertyUnitFilter('All');
    setPaymentPlanFilter('All');
    setProductFilter('');
    setQuantityFilter('');
    setAssignedFilter('All');
    setDescriptionFilter('');
  };

  // KPI clicks
  const handleFilterStatus = (s) => setStatuses([s]);
  const handleFilterPriority = (p) => setPriorities([p]);
  const handleFilterType = (t) => setTypes([t]);

  // Actions
  const handleSaveRequest = async (payload) => {
    try {
      await saveRequest(payload);
      const s = String(payload?.status || 'Pending');
      const type = s === 'Approved' ? 'success' : s === 'Rejected' ? 'error' : 'info';
      const msg = isRTL
        ? (s === 'Approved' ? 'تمت إضافة الطلب وتمت الموافقة عليه' : s === 'Rejected' ? 'تمت إضافة الطلب وتم رفضه' : s === 'In Progress' ? 'تمت إضافة الطلب، الحالة: قيد التنفيذ' : 'تمت إضافة الطلب، الحالة: قيد الانتظار')
        : (s === 'Approved' ? 'Request added and approved' : s === 'Rejected' ? 'Request added and rejected' : s === 'In Progress' ? 'Request added, status: In Progress' : 'Request added, status: Pending');
      
      const evt = new CustomEvent('app:toast', { detail: { type, message: msg, source: 'requests' } })
      window.dispatchEvent(evt)
      fetchData();
    } catch (e) {
      console.error('Error saving request', e);
      const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: 'Failed to save request' } })
      window.dispatchEvent(evt)
    }
  };

  const handleDeleteRequest = async (id) => {
    try {
      await deleteRequest(id);
      fetchData();
    } catch (e) {
      console.error('Failed to delete request', e);
    }
  };

  const handleImportRequests = async (rows) => {
    const mapped = rows.map((r, i) => ({
      // id: Number(r.id) || (10000 + i), // Let backend handle ID
      customerName: r.customerName || r.customer || '',
      propertyUnit: r.propertyUnit || r.property || '',
      product: r.product || '',
      quantity: r.quantity != null ? Number(r.quantity) : undefined,
      status: r.status || 'Pending',
      priority: r.priority || 'Medium',
      type: r.type || 'Inquiry',
      description: r.description || '',
      assignedTo: r.assignedTo || '',
      createdAt: r.createdAt || new Date().toISOString(),
      updatedAt: r.updatedAt || new Date().toISOString(),
    }));
    
    try {
      await Promise.all(mapped.map(r => saveRequest(r)));
      fetchData();
    } catch (e) {
      console.error('Error importing requests', e);
    }
  };

  const exportFilteredToExcel = async () => {
    const XLSX = (await import('xlsx')).default;
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Requests');
    const fileName = 'requests_export.xlsx';
    XLSX.writeFile(wb, fileName);
    logExportEvent({
      module: 'Requests',
      fileName,
      format: 'xlsx',
    });
  };

  const exportFilteredToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    const head = showPU
      ? [[Label.columns.id, Label.columns.customerName, Label.columns.propertyUnit, Label.columns.paymentPlan, Label.columns.status, Label.columns.priority, Label.columns.type, Label.columns.createdAt, Label.columns.updatedAt]]
      : [[Label.columns.id, Label.columns.customerName, Label.columns.product, Label.columns.quantity, Label.columns.paymentPlan, Label.columns.status, Label.columns.priority, Label.columns.type, Label.columns.createdAt, Label.columns.updatedAt]];
    const body = showPU
      ? filtered.map((r) => [r.id, r.customerName, r.propertyUnit, r.paymentPlan || '', translateStatus(r.status), translatePriority(r.priority), translateType(r.type), r.createdAt, r.updatedAt])
      : filtered.map((r) => [r.id, r.customerName, r.product || '', r.quantity ?? '', r.paymentPlan || '', translateStatus(r.status), translatePriority(r.priority), translateType(r.type), r.createdAt, r.updatedAt]);
    autoTable(doc, { head, body });
    const fileName = 'requests_export.pdf';
    doc.save(fileName);
    logExportEvent({
      module: 'Requests',
      fileName,
      format: 'pdf',
    });
  };

  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative inline-flex items-center gap-2">
          <h1 className="page-title text-2xl font-semibold  dark:text-white text-start">{Label.title}</h1>
          <span aria-hidden className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" style={{ width: 'calc(100% + 8px)', left: isRTL ? 'auto' : '-4px', right: isRTL ? '-4px' : 'auto', bottom: '-4px' }}></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mr-2 ml-2">
             <button 
               className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
               onClick={() => setViewMode('list')}
               title={isRTL ? 'عرض القائمة' : 'List View'}
             >
               <FaThList />
             </button>
             <button 
               className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
               onClick={() => setViewMode('kanban')}
               title={isRTL ? 'عرض كانبان' : 'Kanban View'}
             >
               <FaThLarge />
             </button>
          </div>
          <button onClick={handleCreateClick} className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none">
            <FaPlus />
            {Label.addRequest}
          </button>
          <button onClick={() => setOpenImport(true)} className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none gap-2">
            <FaDownload />
            {Label.import}
          </button>
          <div className="relative">
            <button onClick={() => setOpenExportMenu((v) => !v)} className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none gap-2">
              <FaUpload />
              {Label.export}
            </button>
            {openExportMenu && (
              <div className={`absolute ${isRTL ? 'left-0 right-auto' : 'right-0 left-auto'} mt-2 w-40 rounded-lg  dark:bg-slate-800/90 dark:backdrop-blur-md border border-gray-200 dark:border-slate-700/50 shadow-xl p-2 space-y-2 z-50`}>
                <button onClick={exportFilteredToExcel} className="w-full text-start px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700/50 flex items-center gap-2">
                  <FaFileExcel /> {Label.excel}
                </button>
                <button onClick={exportFilteredToPDF} className="w-full text-start px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700/50 flex items-center gap-2">
                  <FaFilePdf /> {Label.pdf}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      
      <div className="rounded-lg p-4 space-y-3 border"
           style={{
             background: 'var(--content-bg)',
             color: 'var(--content-text)',
             borderColor: 'var(--separator)' 
           }}>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen} className="inline-flex items-center gap-2 text-sm font-medium dark:text-white">
            <FaFilter />
            <span>{t('Filters')}</span>
            <FaChevronDown className={`transition-transform ${filtersOpen ? 'rotate-0' : 'rotate-180'}`} />
          </button>
       <button onClick={clearFilters} className="btn btn-sm bg-gray-500 hover:bg-gray-600 text-white border-none gap-2">
        <FaUndoAlt className="opacity-80" />
        <span className="dark:text-white">{t('Reset')}</span>
      </button>
        </div>
        {filtersOpen && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs  dark:text-white">{t('Search')}</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Type to search...')}
              className="w-full rounded border p-2  dark:text-white placeholder-gray-500 dark:placeholder-white  dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="text-xs  dark:text-white">{t('Status')}</label>
            <SearchableSelect
              options={statusSelectOptions}
              value={statuses[0] || 'All'}
              onChange={(val) => setStatuses(val === 'All' ? [] : [val])}
              className="rounded border p-2 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs  dark:text-white">{t('Type')}</label>
            <SearchableSelect
              options={typeSelectOptions}
              value={types[0] || 'All'}
              onChange={(val) => setTypes(val === 'All' ? [] : [val])}
              className="rounded border p-2  dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs  dark:text-white">{t('Priority')}</label>
            <SearchableSelect
              options={prioritySelectOptions}
              value={priorities[0] || 'All'}
              onChange={(val) => setPriorities(val === 'All' ? [] : [val])}
              className="rounded border p-2  dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs  dark:text-white">{t('Payment Plan')}</label>
            <SearchableSelect
              options={paymentPlanSelectOptions}
              value={paymentPlanFilter}
              onChange={(val) => setPaymentPlanFilter(val)}
              className="rounded border p-2  dark:text-white"
            />
          </div>
        </div>
        )}
        {filtersOpen && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {showPU && (
            <div className="md:col-span-2">
              <label className="text-xs dark:text-white">{t('Property / Unit')}</label>
              <SearchableSelect
                options={propertyUnitSelectOptions}
                value={propertyUnitFilter}
                onChange={(val) => setPropertyUnitFilter(val)}
                className="rounded border p-2  dark:text-white"
              />
            </div>
          )}
          {showPQ && (
            <>
              <div>
                <label className="text-xs  dark:text-white">{t('Product')}</label>
                <SearchableSelect
                  options={productSelectOptions}
                  value={productFilter || 'All'}
                  onChange={(val) => setProductFilter(val === 'All' ? '' : val)}
                  className="rounded border p-2 dark:text-white"
                />
              </div>
            </>
          )}
          <div>
            <label className="text-xs  dark:text-white">{t('Assigned')}</label>
            <SearchableSelect
              options={assignedSelectOptions}
              value={assignedFilter}
              onChange={(val) => setAssignedFilter(val)}
              className="rounded border p-2  dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs  dark:text-white">{t('From Date')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="mm/dd/yyyy"
              className="w-full rounded border p-2  dark:text-white placeholder-gray-500 dark:placeholder-white  dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="text-xs  dark:text-white">{t('To Date')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="mm/dd/yyyy"
              className="w-full rounded border p-2  dark:text-white placeholder-gray-500 dark:placeholder-white  dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            />
          </div>
        </div>
        )}
        
      </div>

      {/* View Toggle */}
      {viewMode === 'list' ? (
        <>
          <div className="overflow-x-auto  dark:bg-slate-800/50 dark:backdrop-blur-md rounded-lg shadow border border-gray-200 dark:border-slate-700/50">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700/50">
              <thead className=" dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 shadow-md">
                <tr>
                  {(() => {
                    const effective = {
                      ...visibleColumns,
                      propertyUnit: visibleColumns.propertyUnit && showPU,
                      product: visibleColumns.product && showPQ,
                      quantity: visibleColumns.quantity && showPQ,
                    };
                    return Object.entries(allColumns).map(([key, label]) => (
                      effective[key] && (
                        <th key={key} scope="col" className="px-6 py-3 text-xs font-medium  dark:text-white uppercase tracking-wider text-start">
                          {label}
                        </th>
                      )
                    ));
                  })()}
                  <th scope="col" className="px-6 py-3 text-xs font-medium  dark:text-white uppercase tracking-wider text-start min-w-[300px]">
                    {Label.actions}
                  </th>
                </tr>
              </thead>
              <tbody className=" dark:bg-transparent divide-y divide-gray-200 dark:divide-slate-700/50">
                {paginated.length > 0 ? (
                  paginated.map((r) => (
                    <tr key={r.id} className=" dark:hover:bg-transparent transition-colors">
                      {visibleColumns.id && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium dark:text-white">
                          #{r.id}
                        </td>
                      )}
                      {visibleColumns.customerName && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm  dark:text-gray-200">
                          {r.customerName}
                        </td>
                      )}
                      {visibleColumns.type && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-200">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${r.type === 'Inquiry' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : 
                              r.type === 'Maintenance' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' : 
                              'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'}`}>
                            {translateType(r.type)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.priority && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-200">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${r.priority === 'High' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 
                              r.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' : 
                              'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
                            {translatePriority(r.priority)}
                          </span>
                        </td>
                      )}
                      {(visibleColumns.propertyUnit && showPU) && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm  dark:text-gray-200">
                          {r.propertyUnit}
                        </td>
                      )}
                      {visibleColumns.paymentPlan && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm  dark:text-gray-200">
                          {r.paymentPlan || ''}
                        </td>
                      )}
                      {(visibleColumns.product && showPQ) && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm  dark:text-gray-200">
                          {r.product || ''}
                        </td>
                      )}
                      {(visibleColumns.quantity && showPQ) && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-200">
                          {r.quantity ?? ''}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm  dark:text-gray-200">
                           <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${r.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 
                              r.status === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' : 
                              r.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' :
                              'bg-gray-100  dark:bg-gray-700/50 dark:text-gray-300'}`}>
                            {translateStatus(r.status)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.createdAt && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm  dark:text-gray-400">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                        </td>
                      )}
                      {visibleColumns.updatedAt && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm  dark:text-gray-400">
                          {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '-'}
                        </td>
                      )}
                      {visibleColumns.assignedTo && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm  dark:text-gray-200">
                          {r.assignedTo || '-'}
                        </td>
                      )}
                      {visibleColumns.description && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm  dark:text-gray-400 max-w-xs truncate">
                          {r.description}
                        </td>
                      )}
                      
                      {/* Actions Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium min-w-[300px]">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setAssignTargetRequest(r); setOpenAssign(true); }}
                            className="btn btn-sm btn-circle bg-purple-600 hover:bg-purple-700 text-white border-none"
                            title={isRTL ? 'تعيين' : 'Assign'}
                          >
                            <FaCalendarAlt />
                          </button>
                          
                          {r.status !== 'Approved' && (
                          <button 
                            onClick={() => handleSaveRequest({ ...r, status: 'Approved', updatedAt: new Date().toISOString() })}
                            className="btn btn-sm btn-circle bg-green-600 hover:bg-green-700 text-white border-none"
                            title={isRTL ? 'اعتماد' : 'Approve'}
                          >
                            <FaCheck />
                          </button>
                          )}
                          {r.status !== 'Rejected' && (
                          <button 
                            onClick={() => handleSaveRequest({ ...r, status: 'Rejected', updatedAt: new Date().toISOString() })}
                            className="btn btn-sm btn-circle bg-red-600 hover:bg-red-700 text-white border-none"
                            title={isRTL ? 'رفض' : 'Reject'}
                          >
                            <FaTimes />
                          </button>
                          )}
                          
                          <button 
                            onClick={() => handleDeleteRequest(r.id)}
                            className="btn btn-sm btn-circle bg-red-600 hover:bg-red-700 text-white border-none"
                            title={isRTL ? 'حذف' : 'Delete'}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Object.keys(visibleColumns).length + 1} className="px-6 py-4 text-center text-sm dark:text-gray-400">
                      {Label.noMatch}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between rounded-xl p-2 glass-panel gap-4">
            <div className="text-xs text-[var(--muted-text)]">
              {isRTL 
                ? `عرض ${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)} من ${filtered.length}` 
                : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)} of ${filtered.length}`}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  title={isRTL ? 'السابق' : 'Prev'}
                >
                  <FaChevronLeft className={isRTL ? 'scale-x-[-1]' : ''} />
                </button>
                <span className="text-sm whitespace-nowrap">{isRTL ? `الصفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  title={isRTL ? 'التالي' : 'Next'}
                >
                  <FaChevronRight className={isRTL ? 'scale-x-[-1]' : ''} />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--muted-text)] whitespace-nowrap">{isRTL ? 'لكل صفحة:' : 'Per page:'}</span>
                <select
                  className="input w-24 text-sm py-0 px-2 h-8"
                  value={perPage}
                  onChange={e => setPerPage(Number(e.target.value))}
                >
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statusOptions.map(status => {
            const statusItems = filtered.filter(r => r.status === status)
            return (
              <div key={status} className="min-w-[300px] w-[300px] flex-shrink-0 flex flex-col gap-3 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      status === 'Pending' ? 'bg-yellow-500' :
                      status === 'Approved' ? 'bg-green-500' :
                      status === 'Rejected' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    {translateStatus(status)}
                  </h3>
                  <span className="text-xs text-[var(--muted-text)] bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full shadow-sm">
                    {statusItems.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                   {statusItems.map(req => (
                     <div key={req.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer group relative">
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                              #{req.id}
                           </div>
                           <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              req.priority === 'High' ? 'bg-red-100 text-red-700' :
                              req.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                           }`}>
                              {translatePriority(req.priority)}
                           </span>
                        </div>
                        
                        <h4 className="font-medium text-sm mb-1 line-clamp-1">{req.customerName}</h4>
                        <p className="text-xs text-[var(--muted-text)] mb-2 line-clamp-1">{req.type} - {req.propertyUnit || req.product || '-'}</p>
                        
                        <div className="flex items-center justify-between text-xs text-[var(--muted-text)] pt-2 border-t border-gray-100 dark:border-gray-700">
                           <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e)=>{e.stopPropagation(); setEditingRequest(req); setOpenCreate(true)}} className="p-1 hover:bg-gray-100 rounded text-blue-600"><FaEdit size={12} /></button>
                              <button onClick={(e)=>{e.stopPropagation(); handleDeleteRequest(req.id)}} className="p-1 hover:bg-gray-100 rounded text-red-600"><FaTrash size={12} /></button>
                           </div>
                        </div>
                     </div>
                   ))}
                   {statusItems.length === 0 && (
                     <div className="text-center py-4 text-xs text-[var(--muted-text)] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        {Label.noMatch}
                     </div>
                   )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Spacer below cards */}
      <div className="h-4" />

      

      {/* Modals */}
      <CreateRequestModal
        open={openCreate}
        onClose={() => { setOpenCreate(false); setEditingRequest(null); }}
        onSave={handleSaveRequest}
        isRTL={isRTL}
        initial={editingRequest || {}}
      />

      <ImportRequestsModal
        open={openImport}
        onClose={() => setOpenImport(false)}
        onImport={handleImportRequests}
        isRTL={isRTL}
      />

      {openAssign && assignTargetRequest && (
        <AssignmentModal
          open={openAssign}
          onClose={() => { setOpenAssign(false); setAssignTargetRequest(null); }}
          onSubmit={(payload) => {
            const name = payload.targetName || payload.userId || payload.teamId || '';
            if (assignTargetRequest) {
              handleSaveRequest({ ...assignTargetRequest, assignedTo: String(name), updatedAt: new Date().toISOString() });
            }
          }}
          allowMultiAssign={false}
          context="task"
        />
      )}
    </div>
  );
}
