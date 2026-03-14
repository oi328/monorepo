import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDynamicFields } from '../../hooks/useDynamicFields'
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import { useAppState } from '../../shared/context/AppStateProvider'
import { FaFileImport, FaPlus, FaFile, FaChevronRight, FaChevronLeft, FaFilePdf, FaFileCsv, FaChevronDown, FaFileExport, FaPaperclip, FaTimes, FaMapMarkerAlt, FaTags } from 'react-icons/fa'
import { Filter, Search, Users, Edit2, Trash2, Building2, Phone, Mail, Percent, X, ChevronDown } from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import DynamicFieldRenderer from '../../components/DynamicFieldRenderer'
import BrokersImportModal from '../../components/BrokersImportModal'

export default function Brokers() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { fields: dynamicFields } = useDynamicFields('brokers')
  const { user, refreshInventoryBadges } = useAppState()

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const hasExplicitInventoryPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Inventory')
  const inventoryModulePerms = hasExplicitInventoryPerms && Array.isArray(modulePermissions.Inventory) ? modulePermissions.Inventory : []
  const effectiveInventoryPerms = hasExplicitInventoryPerms ? inventoryModulePerms : []
  const roleLower = String(user?.role || '').toLowerCase()
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'
  const canManageBrokers =
    effectiveInventoryPerms.includes('addBroker') ||
    user?.is_super_admin ||
    isTenantAdmin
  
  useEffect(() => {
    const markSeen = async () => {
      try {
        await api.post('/api/inventory/mark-seen', { page: 'brokers' })
        await refreshInventoryBadges()
      } catch {}
    }
    markSeen()
  }, [refreshInventoryBadges])
  
  // State
  const [brokers, setBrokers] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    brokerType: ''
  });
  
  const [form, setForm] = useState({
    id: null,
    name: '',
    agencyName: '',
    address: '',
    phones: [''],
    email: '',
    commissionRate: '',
    status: 'Active',
    brokerType: 'individual',
    salesPersons: [],
    contracted: false,
    taxId: '',
    nationalId: '',
    taxAttachment: null,
    nationalAttachment: null,
    custom_fields: {}
  });

  // Dynamic fields state
  const [dynamicValues, setDynamicValues] = useState({});

  useEffect(() => {
    if (showForm) document.body.classList.add('app-modal-open')
    else document.body.classList.remove('app-modal-open')
    return () => document.body.classList.remove('app-modal-open')
  }, [showForm])

  const handleDynamicChange = (key, value) => {
    setDynamicValues(prev => ({ ...prev, [key]: value }));
  };

  // Load Data
  const fetchBrokers = async () => {
    try {
      setIsLoading(true);
      const [brokersRes, usersRes] = await Promise.all([
        api.get('/api/brokers'),
        api.get('/api/users')
      ]);
      setBrokers(Array.isArray(brokersRes.data) ? brokersRes.data : brokersRes.data.data || []);
      setSalesUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error(isArabic ? 'فشل تحميل البيانات' : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrokers();
  }, []);

  // Form Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    const effectiveName = (form.name || '').trim() || ((form.brokerType === 'company' ? (form.agencyName || '').trim() : '') || '');
    if (!effectiveName) {
      toast.error(isArabic ? 'الاسم مطلوب' : 'Name is required');
      return;
    }
    
    // Phone Validation
    if (Array.isArray(form.phones)) {
      for (const phone of form.phones) {
        if (!phone) continue;
        const digits = phone.replace(/\D/g, '');
        
        // Check length
        if (digits.length < 8 || digits.length > 15) {
          toast.error(isArabic ? `رقم الهاتف ${phone} غير صحيح (الطول يجب أن يكون بين 8 و 15)` : `Invalid phone number ${phone} (Length must be 8-15)`);
          return;
        }

        // Check for repeated digits (e.g. 11111111)
        if (/^(\d)\1+$/.test(digits)) {
          toast.error(isArabic ? `رقم الهاتف ${phone} غير صحيح (أرقام مكررة)` : `Invalid phone number ${phone} (Repeated digits)`);
          return;
        }

        // Egyptian Mobile Check
        if (/^01[0125]/.test(phone)) {
           if (digits.length !== 11) {
              toast.error(isArabic ? `رقم المحمول المصري ${phone} يجب أن يكون 11 رقم` : `Egyptian mobile number ${phone} must be 11 digits`);
              return;
           }
        }
      }
    }

    setIsLoading(true);
    const cleanPhones = Array.isArray(form.phones) ? form.phones.map(p => String(p || '').trim()).filter(Boolean) : [];

    const payload = {
      ...form,
      name: effectiveName,
      phones: cleanPhones,
      custom_fields: dynamicValues
    };
    
    // Remove id from payload for create/update logic handling
    if (!payload.id) delete payload.id;

    try {
      if (form.id) {
        await api.put(`/api/brokers/${form.id}`, payload);
        toast.success(isArabic ? 'تم تحديث الوسيط بنجاح' : 'Broker updated successfully');
      } else {
        await api.post('/api/brokers', payload);
        toast.success(isArabic ? 'تم إضافة الوسيط بنجاح' : 'Broker added successfully');
      }
      setShowForm(false);
      resetForm();
      fetchBrokers();
    } catch (error) {
      console.error('Failed to save broker:', error);
      toast.error(isArabic ? 'فشل حفظ الوسيط' : 'Failed to save broker');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      name: '',
      agencyName: '',
      address: '',
      phones: [''],
      email: '',
      commissionRate: '',
      status: 'Active',
      brokerType: 'individual',
      salesPersons: [],
      contracted: false,
      taxId: '',
      nationalId: '',
      taxAttachment: null,
      nationalAttachment: null,
      custom_fields: {}
    });
    setDynamicValues({});
  };

  const handleEdit = (broker) => {
    const nextPhones = Array.isArray(broker.phones) ? broker.phones : (broker.phone ? [broker.phone] : []);
    setForm({ 
      ...broker, 
      salesPersons: Array.isArray(broker.salesPersons) ? broker.salesPersons : [], 
      address: broker.address || '', 
      phones: nextPhones.length > 0 ? nextPhones : [''],
      contracted: typeof broker.contracted === 'boolean' ? broker.contracted : false,
      taxId: broker.taxId || broker.taxIdOrCard || '',
      nationalId: broker.nationalId || '',
      taxAttachment: broker.taxAttachment || broker.documentAttachment || null,
      nationalAttachment: broker.nationalAttachment || null,
      custom_fields: broker.custom_fields || {}
    });
    setDynamicValues(broker.custom_fields || {});
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!canManageBrokers) {
      alert(isArabic ? 'لا تملك صلاحية حذف الوسطاء' : 'You do not have permission to delete brokers')
      return
    }
    if (window.confirm(isArabic ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this broker?')) {
      try {
        await api.delete(`/api/brokers/${id}`);
        toast.success(isArabic ? 'تم حذف الوسيط بنجاح' : 'Broker deleted successfully');
        fetchBrokers();
      } catch (error) {
        console.error('Failed to delete broker:', error);
        toast.error(isArabic ? 'فشل حذف الوسيط' : 'Failed to delete broker');
      }
    }
  };

  // Filtering
  const brokerTypeOptions = useMemo(() => [
    { value: 'individual', label: isArabic ? 'فرد' : 'Individual' },
    { value: 'company', label: isArabic ? 'شركة' : 'Company' }
  ], [isArabic]);

  const statusOptions = useMemo(() => [
    { value: 'Active', label: isArabic ? 'نشط' : 'Active' },
    { value: 'Inactive', label: isArabic ? 'غير نشط' : 'Inactive' }
  ], [isArabic]);

  const filteredBrokers = useMemo(() => {
    return brokers.filter(b => {
      // Search Text
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchPhone = (Array.isArray(b.phones) ? b.phones : (b.phone ? [b.phone] : [])).some(ph => String(ph).toLowerCase().includes(q));
        const matchEmail = b.email?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail) return false;
      }

      // Status
      if (filters.status && b.status !== filters.status) return false;

      // Broker Type
      if (filters.brokerType && b.brokerType !== filters.brokerType) return false;

      return true;
    });
  }, [brokers, filters]);

  const salesTeamOptions = useMemo(() => {
    return salesUsers.map(m => m.name || m.username || m.email)
  }, [salesUsers])

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredBrokers.length / itemsPerPage);
  const paginatedBrokers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBrokers.slice(start, start + itemsPerPage);
  }, [filteredBrokers, currentPage, itemsPerPage]);

  const shownFrom = (filteredBrokers.length === 0) ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const shownTo = Math.min(currentPage * itemsPerPage, filteredBrokers.length);

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      brokerType: ''
    });
  };

  const handleImport = async (importedData) => {
    try {
      setIsLoading(true);
      const promises = importedData.map(broker => api.post('/api/brokers', {
        ...broker,
        status: broker.status || 'Active',
        brokerType: broker.brokerType || 'individual'
      }));
      await Promise.all(promises);
      toast.success(isArabic ? 'تم استيراد البيانات بنجاح' : 'Data imported successfully');
      setShowImportModal(false);
      fetchBrokers();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(isArabic ? 'فشل الاستيراد' : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  const exportBrokersCsv = () => {
    const headers = ['Name', 'Agency', 'Type', 'Phone', 'Email', 'Commission', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredBrokers.map(b => [
        `"${b.name}"`,
        `"${b.agencyName || ''}"`,
        `"${b.brokerType}"`,
        `"${Array.isArray(b.phones) ? b.phones.filter(Boolean).join(' | ') : (b.phone || '')}"`,
        `"${b.email || ''}"`,
        `"${b.commissionRate || ''}"`,
        `"${b.status}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brokers.csv';
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportBrokersPdf = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = await import('jspdf-autotable');
      const doc = new jsPDF();
      
      const tableColumn = ["Name", "Agency", "Type", "Phone", "Status"];
      const tableRows = [];

      filteredBrokers.forEach(item => {
        const rowData = [
          item.name,
          item.agencyName || '',
          item.brokerType,
          Array.isArray(item.phones) ? item.phones.filter(Boolean).join(' | ') : (item.phone || ''),
          item.status
        ];
        tableRows.push(rowData);
      });

      doc.text(isArabic ? "Brokers List" : "Brokers List", 14, 15); // Arabic font support issue in jsPDF standard, keep English title or generic
      autoTable.default(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { font: 'helvetica', fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      });
      doc.save("brokers_list.pdf");
      setShowExportMenu(false);
    } catch (error) {
      console.error("Export PDF Error:", error);
    }
  };

  const handleTaxAttachmentChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm(prev => ({
          ...prev,
          taxAttachment: { name: file.name, dataUrl: reader.result }
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNationalAttachmentChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm(prev => ({
          ...prev,
          nationalAttachment: { name: file.name, dataUrl: reader.result }
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] overflow-x-hidden min-w-0" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-6">
        <div className="relative flex flex-wrap items-start gap-1">
          <h1 className="page-title text-2xl font-bold text-start">
            {isArabic ? 'الوسطاء العقاريين' : 'Real Estate Brokers'}
          </h1>
          <span
            aria-hidden="true"
            className="inline-block h-[2px] w-full rounded bg-gradient-to-r from-blue-500 to-purple-600"
          />
        </div>
        <div className="flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
           <button 
              className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2"
              onClick={() => setShowImportModal(true)}
           >
              <FaFileImport className='text-white' />
              <span className='text-white'>{isArabic ? 'استيراد' : 'Import'}</span>
           </button>



           {canManageBrokers && (
             <button
               onClick={() => { resetForm(); setShowForm(true); }}
               className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-green-500 text-white border-none flex items-center justify-center gap-2"
             >
               <FaPlus className='text-white' /> <span className='text-white'>{isArabic ? 'إضافة وسيط' : 'Add Broker'}</span>
             </button>
           )}
           <div className="relative w-full lg:w-auto">
              <button 
                  className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2"
                  onClick={() => setShowExportMenu(!showExportMenu)}
              >
                  <span className="flex items-center gap-2">
                    <FaFileExport  className='text-white'/>
                    <span className='text-white'>{isArabic ? 'تصدير' : 'Export'}</span>
                  </span>
                  <FaChevronDown className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} size={12} />
              </button>
              
              {showExportMenu && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 min-w-[150px]">
                      <button 
                          className="w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                          onClick={exportBrokersCsv}
                      >
                          <FaFileCsv className="text-green-500" /> CSV
                      </button>
                      <button 
                          className="w-full text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                          onClick={exportBrokersPdf}
                      >
                          <FaFilePdf className="text-red-500" /> PDF
                      </button>
                  </div>
              )}
           </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-xl mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Filter className="text-blue-500" size={16} /> {isArabic ? 'تصفية' : 'Filter'}
          </h2>
          <div className="flex items-center gap-2">

            <button onClick={clearFilters} className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              {isArabic ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <Search className="text-blue-500" size={10} /> {isArabic ? 'بحث' : 'Search'}
            </label>
            <div className="relative">
              <input 
                type="text"
                className="input w-full" 
                value={filters.search} 
                onChange={e => setFilters(prev => ({...prev, search: e.target.value}))} 
                placeholder={isArabic ? 'بحث بالاسم، الهاتف، البريد...' : 'Search name, phone, email...'} 
              />
            </div>
          </div>
          
          <div className={`space-y-1 ${!showAllFilters && 'hidden md:block'}`}>
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'النوع' : 'Type'}</label>
            <SearchableSelect 
              options={brokerTypeOptions} 
              value={filters.brokerType} 
              onChange={val => setFilters(prev => ({...prev, brokerType: val}))} 
              isRTL={isArabic} 
            />
          </div>

          <div className={`space-y-1 ${!showAllFilters && 'hidden md:block'}`}>
            <label className="text-xs font-medium text-[var(--muted-text)]">{isArabic ? 'الحالة' : 'Status'}</label>
            <SearchableSelect 
              options={statusOptions} 
              value={filters.status} 
              onChange={val => setFilters(prev => ({...prev, status: val}))} 
              isRTL={isArabic} 
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedBrokers.map(broker => (
          <div key={broker.id} className="glass-panel rounded-xl p-0 overflow-hidden hover:shadow-lg transition-all duration-200 border border-[var(--panel-border)] group">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/10 dark:to-[var(--content-bg)] p-4 border-b border-[var(--panel-border)] flex justify-between items-start">
              <div className="flex gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${broker.brokerType === 'company' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                  {broker.brokerType === 'company' ? <Building2 size={20} /> : <Users size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight mb-1">{broker.name}</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                     <span className={`px-2 py-0.5 rounded-full ${broker.brokerType === 'company' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                       {broker.brokerType === 'company' ? (isArabic ? 'شركة' : 'Company') : (isArabic ? 'فرد' : 'Individual')}
                     </span>
                     <span className={`px-2 py-0.5 rounded-full ${broker.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                       {broker.status === 'Active' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                     </span>
                  </div>
                </div>
              </div>
              
              {canManageBrokers && (
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(broker)} className="w-8 h-8 rounded-full hover:bg-white dark:hover:bg-gray-700 flex items-center justify-center text-blue-600 shadow-sm transition-colors" title={isArabic ? 'تعديل' : 'Edit'}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(broker.id)} className="w-8 h-8 rounded-full hover:bg-white dark:hover:bg-gray-700 flex items-center justify-center text-red-600 shadow-sm transition-colors" title={isArabic ? 'حذف' : 'Delete'}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 text-sm">
              
              {/* Contact Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider mb-2">{isArabic ? 'معلومات الاتصال' : 'Contact Info'}</h4>
                
                {broker.email && (
                  <div className="flex items-center gap-2 text-[var(--content-text)]">
                    <Mail size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate" title={broker.email}>{broker.email}</span>
                  </div>
                )}
                
                {(Array.isArray(broker.phones) && broker.phones.length > 0) || broker.phone ? (
                  <div className="flex items-start gap-2 text-[var(--content-text)]">
                    <Phone size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      {(Array.isArray(broker.phones) ? broker.phones.filter(Boolean) : (broker.phone ? [broker.phone] : [])).map((ph, idx) => (
                         <span key={idx} dir="ltr" className="leading-tight hover:text-blue-600 cursor-pointer" onClick={() => window.open(`tel:${ph}`)}>{ph}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {broker.address && (
                  <div className="flex items-start gap-2 text-[var(--content-text)]">
                    <FaMapMarkerAlt size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{broker.address}</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-[var(--panel-border)]/50" />

              {/* Business Info */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <h4 className="text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider mb-2">{isArabic ? 'تفاصيل العمل' : 'Business Details'}</h4>
                    <div className="space-y-2">
                      {broker.agencyName && (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">{isArabic ? 'اسم الوكالة' : 'Agency'}</span>
                          <span className="font-medium">{broker.agencyName}</span>
                        </div>
                      )}
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500">{isArabic ? 'الحالة التعاقدية' : 'Contract Status'}</span>
                        <span className={`font-medium ${broker.contracted ? 'text-green-600' : 'text-gray-600'}`}>
                          {broker.contracted ? (isArabic ? 'متعاقد' : 'Contracted') : (isArabic ? 'غير متعاقد' : 'Not Contracted')}
                        </span>
                      </div>

                      {broker.commissionRate && (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">{isArabic ? 'العمولة' : 'Commission'}</span>
                          <span className="font-medium">{broker.commissionRate}%</span>
                        </div>
                      )}
                    </div>
                 </div>

                 <div>
                    <h4 className="text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider mb-2">{isArabic ? 'المستندات' : 'Documents'}</h4>
                    <div className="space-y-2">
                      {broker.taxId ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">{isArabic ? 'الرقم الضريبي' : 'Tax ID'}</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{broker.taxId}</span>
                            {broker.taxAttachment && (
                              <a href={broker.taxAttachment.dataUrl} download={broker.taxAttachment.name} className="text-blue-600 hover:text-blue-800" title={isArabic ? 'تحميل' : 'Download'}>
                                <FaPaperclip size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">{isArabic ? 'لا يوجد رقم ضريبي' : 'No Tax ID'}</div>
                      )}

                      {broker.nationalId ? (
                        <div className="flex flex-col">
                           <span className="text-xs text-gray-500">{isArabic ? 'رقم البطاقة' : 'National ID'}</span>
                           <div className="flex items-center gap-1">
                             <span className="font-medium">{broker.nationalId}</span>
                             {broker.nationalAttachment && (
                               <a href={broker.nationalAttachment.dataUrl} download={broker.nationalAttachment.name} className="text-blue-600 hover:text-blue-800" title={isArabic ? 'تحميل' : 'Download'}>
                                 <FaPaperclip size={12} />
                               </a>
                             )}
                           </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">{isArabic ? 'لا يوجد رقم بطاقة' : 'No ID'}</div>
                      )}
                    </div>
                 </div>
              </div>

              {/* Sales Assignment */}
              {Array.isArray(broker.salesPersons) && broker.salesPersons.length > 0 && (
                <>
                  <div className="h-px bg-[var(--panel-border)]/50" />
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider mb-2">{isArabic ? 'معين إلى' : 'Assigned To'}</h4>
                    <div className="flex flex-wrap gap-1">
                      {broker.salesPersons.map((sp, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs border border-gray-200 dark:border-gray-700 flex items-center gap-1">
                           <Users size={10} className="opacity-50" /> {sp}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Dynamic Fields */}
              {dynamicFields.length > 0 && Object.keys(broker.custom_fields || {}).length > 0 && (
                 <>
                   <div className="h-px bg-[var(--panel-border)]/50" />
                   <div>
                     <h4 className="text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider mb-2">{isArabic ? 'بيانات إضافية' : 'Additional Info'}</h4>
                     <div className="grid grid-cols-2 gap-2">
                       {dynamicFields.map(field => {
                          const val = broker.custom_fields?.[field.key];
                          if (!val) return null;
                          return (
                            <div key={field.key} className="flex flex-col">
                              <span className="text-xs text-gray-500">{isArabic ? field.label_ar : field.label_en}</span>
                              <span className="text-sm font-medium">{String(val)}</span>
                            </div>
                          );
                       })}
                     </div>
                   </div>
                 </>
              )}
              
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Footer */}
      {filteredBrokers.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-between rounded-xl p-2 glass-panel gap-4">
          <div className="text-xs text-[var(--muted-text)]">
            {isArabic 
              ? `عرض ${shownFrom}–${shownTo} من ${filteredBrokers.length}`
              : `Showing ${shownFrom}–${shownTo} of ${filteredBrokers.length}`
            }
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                title={isArabic ? 'السابق' : 'Prev'}
              >
                <FaChevronLeft className={isArabic ? 'scale-x-[-1]' : ''} />
              </button>
              <span className="text-sm whitespace-nowrap">{isArabic ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                title={isArabic ? 'التالي' : 'Next'}
              >
                <FaChevronRight className={isArabic ? 'scale-x-[-1]' : ''} />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--muted-text)] whitespace-nowrap">{isArabic ? 'لكل صفحة:' : 'Per page:'}</span>
              <select
                className="input w-16 text-sm py-0 px-2 h-8"
                value={itemsPerPage}
                onChange={e => setItemsPerPage(Number(e.target.value))}
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

      {/* Modal */}
      {showImportModal && (
        <BrokersImportModal 
          onClose={() => setShowImportModal(false)} 
          isRTL={isArabic} 
          onImport={handleImport}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6">
            <div className="card p-4 sm:p-6 w-full max-w-lg animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-medium">
                  {form.id ? (isArabic ? 'تعديل وسيط' : 'Edit Broker') : (isArabic ? 'إضافة وسيط جديد' : 'Add New Broker')}
                </h2>
                <button 
                  onClick={() => setShowForm(false)} 
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-red-600 hover:bg-red-50 shadow-md transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'نوع الوسيط' : 'Broker Type'}</label>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setForm({...form, brokerType: 'individual'})}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 border shadow-sm ${
                        form.brokerType === 'individual'
                          ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600 ring-offset-1 dark:ring-offset-gray-900'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {isArabic ? 'فرد' : 'Individual'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({...form, brokerType: 'company'})}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 border shadow-sm ${
                        form.brokerType === 'company'
                          ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600 ring-offset-1 dark:ring-offset-gray-900'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {isArabic ? 'شركة' : 'Company'}
                    </button>
                  </div>
                </div>

                {form.brokerType === 'company' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'اسم الشركة' : 'Company Name'}</label>
                      <input
                        type="text"
                        required
                        className="input w-full"
                        value={form.agencyName}
                        onChange={e => setForm({...form, agencyName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'اسم المسؤول' : 'Contact Person'}</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'اسم الوسيط' : 'Broker Name'}</label>
                      <input
                        type="text"
                        required
                        className="input w-full"
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'اسم الوكالة (اختياري)' : 'Agency Name (Optional)'}</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={form.agencyName}
                        onChange={e => setForm({...form, agencyName: e.target.value})}
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'متعاقد' : 'Contracted'}</label>
                    <select
                      className="input w-full appearance-none"
                      value={form.contracted ? 'yes' : 'no'}
                      onChange={e => setForm(prev => ({ ...prev, contracted: e.target.value === 'yes' }))}
                    >
                      <option value="yes">{isArabic ? 'نعم' : 'Yes'}</option>
                      <option value="no">{isArabic ? 'لا' : 'No'}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'الرقم الضريبي' : 'Tax ID'}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input w-full"
                        value={form.taxId}
                        onChange={e => setForm({...form, taxId: e.target.value})}
                      />
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        onChange={handleTaxAttachmentChange}
                        className="hidden" 
                        id="tax-attachment-input"
                      />
                      <label htmlFor="tax-attachment-input" className="btn btn-ghost text-blue-600 cursor-pointer">
                        <FaPaperclip />
                      </label>
                    </div>
                    {form.taxAttachment && (
                      <div className="mt-1">
                        <a 
                          href={form.taxAttachment.dataUrl} 
                          download={form.taxAttachment.name} 
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[10px]"
                        >
                          <FaPaperclip className="mr-1" size={10} />
                          {form.taxAttachment.name}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'رقم البطاقة' : 'National ID'}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input w-full"
                        value={form.nationalId}
                        onChange={e => setForm({...form, nationalId: e.target.value})}
                      />
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        onChange={handleNationalAttachmentChange}
                        className="hidden" 
                        id="national-attachment-input"
                      />
                      <label htmlFor="national-attachment-input" className="btn btn-ghost text-blue-600 cursor-pointer">
                        <FaPaperclip />
                      </label>
                    </div>
                    {form.nationalAttachment && (
                      <div className="mt-1">
                        <a 
                          href={form.nationalAttachment.dataUrl} 
                          download={form.nationalAttachment.name} 
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[10px]"
                        >
                          <FaPaperclip className="mr-1" size={10} />
                          {form.nationalAttachment.name}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'تعيين إلى موظفي المبيعات' : 'Assign to Sales Persons'}</label>
                  <SearchableSelect
                    options={salesTeamOptions}
                    value={form.salesPersons}
                    onChange={(vals)=>setForm(prev=>({...prev, salesPersons: vals}))}
                    isRTL={isArabic}
                    multiple
                  />
                </div>

                

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'أرقام الهاتف' : 'Phone Numbers'}</label>
                    <div className="space-y-2">
                      {(Array.isArray(form.phones) && form.phones.length > 0 ? form.phones : ['']).map((ph, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="tel"
                            className="input w-full"
                            value={ph}
                            onChange={e => {
                              const val = e.target.value;
                              if (val && !/^[0-9+\s-]*$/.test(val)) return;
                              const arr = Array.isArray(form.phones) ? [...form.phones] : ['']
                              arr[idx] = val
                              setForm(prev => ({ ...prev, phones: arr }))
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost text-red-600"
                            onClick={() => {
                              const arr = (Array.isArray(form.phones) ? [...form.phones] : ['']).filter((_, i) => i !== idx)
                              setForm(prev => ({ ...prev, phones: arr.length > 0 ? arr : [''] }))
                            }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-ghost text-blue-600"
                        onClick={() => {
                          const arr = Array.isArray(form.phones) ? [...form.phones] : []
                          setForm(prev => ({ ...prev, phones: [...arr, ''] }))
                        }}
                      >
                        <FaPlus /> {isArabic ? 'إضافة رقم' : 'Add Number'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'نسبة العمولة (%)' : 'Commission Rate (%)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input w-full"
                      value={form.commissionRate}
                      onChange={e => setForm({...form, commissionRate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'العنوان' : 'Address'}</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={form.address}
                    onChange={e => setForm({...form, address: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
                  <input
                    type="email"
                    className="input w-full"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--muted-text)]">{isArabic ? 'الحالة' : 'Status'}</label>
                  <div className="relative">
                    <select
                      className="input w-full appearance-none"
                      value={form.status}
                      onChange={e => setForm({...form, status: e.target.value})}
                    >
                      <option value="Active">{isArabic ? 'نشط' : 'Active'}</option>
                      <option value="Inactive">{isArabic ? 'غير نشط' : 'Inactive'}</option>
                    </select>
                    <ChevronDown className={`absolute top-1/2 -translate-y-1/2 text-[var(--muted-text)] pointer-events-none ${isArabic ? 'left-3' : 'right-3'}`} size={14} />
                  </div>
                </div>

                {/* Dynamic Fields */}
                <div className="border-t pt-4 border-gray-100 dark:border-gray-700 mt-4">
                  <DynamicFieldRenderer 
                    entityKey="brokers"
                    values={dynamicValues}
                    onChange={handleDynamicChange}
                    isRTL={isArabic}
                  />
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn btn-ghost text-[var(--muted-text)]"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="btn bg-blue-600 hover:bg-blue-700 text-white border-none"
                    disabled={isLoading}
                  >
                    {isLoading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (form.id ? (isArabic ? 'حفظ التغييرات' : 'Save Changes') : (isArabic ? 'إضافة' : 'Add'))}
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
