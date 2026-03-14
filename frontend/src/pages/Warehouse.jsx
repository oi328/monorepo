import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '../shared/context/AppStateProvider'

export default function Warehouse() {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  const labels = useMemo(() => ({
    title: isArabic ? ' المستودعات' : 'Warehouse',
    add: isArabic ? 'إضافة مستودع' : 'Add Warehouse',
    close: isArabic ? 'إغلاق' : 'Close',
    save: isArabic ? 'حفظ المستودع' : 'Save Warehouse',
    listTitle: isArabic ? 'قائمة المستودعات' : 'Warehouses List',
    empty: isArabic ? 'لا توجد مستودعات بعد' : 'No warehouses yet',
    actions: isArabic ? 'الإجراءات' : 'Actions',
    edit: isArabic ? 'تعديل' : 'Edit',
    delete: isArabic ? 'حذف' : 'Delete',
    search: isArabic ? 'بحث...' : 'Search...',
    filter: isArabic ? 'تصفية' : 'Filter',
    clearFilters: isArabic ? 'مسح الفلاتر' : 'Clear Filters',

    formTitleBasic: isArabic ? '1- المعلومات الأساسية' : '1- Basic Information',
    warehouseName: isArabic ? 'اسم المستودع' : 'Warehouse Name',
    warehouseCode: isArabic ? 'رمز المستودع' : 'Warehouse Code',
    warehouseType: isArabic ? 'نوع المستودع' : 'Warehouse Type',
    status: isArabic ? 'الحالة' : 'Status',
    manager: isArabic ? 'المدير/الشخص المسؤول' : 'Manager/Responsible Person',
    contactNumber: isArabic ? 'رقم التواصل' : 'Contact Number',
    email: isArabic ? 'البريد الإلكتروني' : 'Email',
    address: isArabic ? 'العنوان' : 'Address',
    city: isArabic ? 'المدينة' : 'City',
    country: isArabic ? 'الدولة' : 'Country',

    formTitleOperational: isArabic ? '2- التفاصيل التشغيلية' : '2- Operational Details',
    storageCapacity: isArabic ? 'سعة التخزين' : 'Storage Capacity',
    sections: isArabic ? 'الأقسام' : 'Sections',
    allowedUsers: isArabic ? 'المستخدمون المسموح لهم' : 'Allowed Users',
    temperatureControlled: isArabic ? 'تحكم حراري' : 'Temperature Controlled',
    defaultSupplier: isArabic ? 'المورد الافتراضي' : 'Default Supplier',
    operatingHours: isArabic ? 'ساعات التشغيل' : 'Operating Hours',

    formTitleStock: isArabic ? '3- المخزون والجرد' : '3- Stock & Inventory',
    currentStockValue: isArabic ? 'قيمة المخزون الحالية' : 'Current Stock Value',
    minThreshold: isArabic ? 'الحد الأدنى' : 'Min Threshold',
    maxThreshold: isArabic ? 'الحد الأقصى' : 'Max Threshold',
    nextStockAudit: isArabic ? 'الجرد القادم' : 'Next Stock Audit',
    totalSkusStored: isArabic ? 'إجمالي الأكواد المخزنة' : 'Total SKUs Stored',
    lastStockAudit: isArabic ? 'آخر جرد' : 'Last Stock Audit',

    formTitleAttachments: isArabic ? '4- المرفقات' : '4- Attachments',
    validityCertificates: isArabic ? 'شهادات الصلاحية' : 'Validity Certificates',
    maintenanceReports: isArabic ? 'تقارير الصيانة الدورية' : 'Periodic Maintenance Reports',
    note: isArabic ? 'ملاحظة' : 'Note',
  }), [isArabic])

  const { user } = useAppState()

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const hasExplicitInventoryPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Inventory')
  const inventoryModulePerms =
    hasExplicitInventoryPerms && Array.isArray(modulePermissions.Inventory) ? modulePermissions.Inventory : []
  const effectiveInventoryPerms = hasExplicitInventoryPerms ? inventoryModulePerms : []
  const roleLower = String(user?.role || '').toLowerCase()
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'
  const canManageWarehouses =
    effectiveInventoryPerms.includes('addWarehouse') ||
    user?.is_super_admin ||
    isTenantAdmin

  const typeOptions = useMemo(() => (
    isArabic ? ['مركزي', 'إقليمي', 'تبريد'] : ['Central', 'Regional', 'Cold Storage']
  ), [isArabic])

  const statusOptions = useMemo(() => (
    isArabic ? ['نشط', 'متوقف'] : ['Active', 'Inactive']
  ), [isArabic])

  const STORAGE_KEY = 'inventoryWarehouses'

  const [form, setForm] = useState({
    warehouseName: '',
    warehouseCode: '',
    warehouseType: typeOptions[0] || '',
    status: statusOptions[0] || '',
    manager: '',
    contactNumber: '',
    email: '',
    address: '',
    city: '',
    country: '',
    storageCapacity: '',
    sections: '',
    allowedUsers: '',
    temperatureControlled: false,
    defaultSupplier: '',
    operatingHours: '',
    currentStockValue: '',
    minThreshold: '',
    maxThreshold: '',
    nextStockAudit: '',
    totalSkusStored: '',
    lastStockAudit: '',
    attachments: { validityCertificates: [], maintenanceReports: [] },
    note: ''
  })

  const [warehouses, setWarehouses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    warehouseName: '',
    warehouseCode: '',
    warehouseType: '',
    status: '',
    country: '',
    city: '',
    manager: '',
    contactNumber: ''
  })

  // Pagination
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWarehouses(parsed)
          return
        }
      }
      // Seed data
      const sampleData = [
        { id: 1700000031, warehouseName: 'Main Warehouse', warehouseCode: 'WH-001', warehouseType: 'Central', status: 'Active', manager: 'John Doe', contactNumber: '1234567890', email: 'main@warehouse.com', city: 'Riyadh', country: 'Saudi Arabia', address: 'Industrial District' },
        { id: 1700000032, warehouseName: 'City Branch', warehouseCode: 'WH-002', warehouseType: 'Regional', status: 'Active', manager: 'Jane Smith', contactNumber: '0987654321', email: 'city@warehouse.com', city: 'Jeddah', country: 'Saudi Arabia', address: 'Downtown' }
      ]
      setWarehouses(sampleData)
    } catch (e) { console.warn('Failed to load warehouses', e) }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(warehouses)) } catch (e) { void e }
  }, [warehouses])

  const warehouseNameOptions = useMemo(() => Array.from(new Set(warehouses.map(w => w.warehouseName).filter(Boolean))), [warehouses])
  const warehouseCodeOptions = useMemo(() => Array.from(new Set(warehouses.map(w => w.warehouseCode).filter(Boolean))), [warehouses])
  const countryOptions = useMemo(() => Array.from(new Set(warehouses.map(w => w.country).filter(Boolean))), [warehouses])
  const cityOptions = useMemo(() => Array.from(new Set(warehouses.map(w => w.city).filter(Boolean))), [warehouses])
  
  const filtered = useMemo(() => {
    return warehouses.filter(w => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!w.warehouseName.toLowerCase().includes(q) && 
            !w.warehouseCode.toLowerCase().includes(q) &&
            !w.manager.toLowerCase().includes(q) &&
            !(w.city||'').toLowerCase().includes(q)) return false
      }
      if (filters.warehouseName && w.warehouseName !== filters.warehouseName) return false
      if (filters.warehouseCode && w.warehouseCode !== filters.warehouseCode) return false
      if (filters.warehouseType && w.warehouseType !== filters.warehouseType) return false
      if (filters.status && w.status !== filters.status) return false
      if (filters.country && w.country !== filters.country) return false
      if (filters.city && w.city !== filters.city) return false
      if (filters.manager && !w.manager.toLowerCase().includes(filters.manager.toLowerCase())) return false
      if (filters.contactNumber && !w.contactNumber.includes(filters.contactNumber)) return false
      return true
    })
  }, [warehouses, filters])

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, page, itemsPerPage])

  useEffect(() => {
    setPage(1)
  }, [filtered, itemsPerPage])

  const goPrevPage = () => setPage(p => Math.max(1, p - 1))
  const goNextPage = () => setPage(p => Math.min(totalPages, p + 1))

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const onFileChange = (key, fileList) => {
    const names = Array.from(fileList || []).map(f => f.name)
    setForm(prev => ({
      ...prev,
      attachments: { ...prev.attachments, [key]: names }
    }))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (!canManageWarehouses) {
      alert(isArabic ? 'لا تملك صلاحية تعديل المستودعات' : 'You do not have permission to modify warehouses')
      return
    }
    const trimmedName = (form.warehouseName || '').trim()
    if (!trimmedName) return

    const entry = {
      id: Date.now(),
      ...form,
      storageCapacity: form.storageCapacity ? Number(form.storageCapacity) : 0,
      currentStockValue: form.currentStockValue ? Number(form.currentStockValue) : 0,
      minThreshold: form.minThreshold ? Number(form.minThreshold) : 0,
      maxThreshold: form.maxThreshold ? Number(form.maxThreshold) : 0,
      totalSkusStored: form.totalSkusStored ? Number(form.totalSkusStored) : 0,
    }
    setWarehouses(prev => [entry, ...prev])
    setForm({
      warehouseName: '',
      warehouseCode: '',
      warehouseType: typeOptions[0] || '',
      status: statusOptions[0] || '',
      manager: '',
      contactNumber: '',
      email: '',
      address: '',
      city: '',
      country: '',
      storageCapacity: '',
      sections: '',
      allowedUsers: '',
      temperatureControlled: false,
      defaultSupplier: '',
      operatingHours: '',
      currentStockValue: '',
      minThreshold: '',
      maxThreshold: '',
      nextStockAudit: '',
      totalSkusStored: '',
      lastStockAudit: '',
      attachments: { validityCertificates: [], maintenanceReports: [] },
      note: ''
    })
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch (e) { void e }
  }

  const onDelete = (id) => {
    if (!canManageWarehouses) {
      alert(isArabic ? 'لا تملك صلاحية حذف المستودعات' : 'You do not have permission to delete warehouses')
      return
    }
    setWarehouses(prev => prev.filter(s => s.id !== id))
  }

  const onEdit = (w) => {
    if (!canManageWarehouses) {
      alert(isArabic ? 'لا تملك صلاحية تعديل المستودعات' : 'You do not have permission to edit warehouses')
      return
    }
    setForm({
      warehouseName: w.warehouseName || '',
      warehouseCode: w.warehouseCode || '',
      warehouseType: w.warehouseType || (typeOptions[0] || ''),
      status: w.status || (statusOptions[0] || ''),
      manager: w.manager || '',
      contactNumber: w.contactNumber || '',
      email: w.email || '',
      address: w.address || '',
      city: w.city || '',
      country: w.country || '',
      storageCapacity: w.storageCapacity != null ? String(w.storageCapacity) : '',
      sections: w.sections || '',
      allowedUsers: w.allowedUsers || '',
      temperatureControlled: Boolean(w.temperatureControlled),
      defaultSupplier: w.defaultSupplier || '',
      operatingHours: w.operatingHours || '',
      currentStockValue: w.currentStockValue != null ? String(w.currentStockValue) : '',
      minThreshold: w.minThreshold != null ? String(w.minThreshold) : '',
      maxThreshold: w.maxThreshold != null ? String(w.maxThreshold) : '',
      nextStockAudit: w.nextStockAudit || '',
      totalSkusStored: w.totalSkusStored != null ? String(w.totalSkusStored) : '',
      lastStockAudit: w.lastStockAudit || '',
      attachments: {
        validityCertificates: w.attachments?.validityCertificates || [],
        maintenanceReports: w.attachments?.maintenanceReports || [],
      },
      note: w.note || ''
    })
    setShowForm(true)
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch (e) { void e }
  }

  return (
      <div className="space-y-6 pt-4">
        <div className={`flex items-center justify-between`}>
          <div className="relative inline-block">
            <h1 className={`page-title text-2xl font-semibold ${isArabic ? 'text-right' : 'text-left'}`}>{labels.title}</h1>
            <span aria-hidden className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" style={{ width: 'calc(100% + 8px)', left: isArabic ? 'auto' : '-4px', right: isArabic ? '-4px' : 'auto', bottom: '-4px' }}></span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className={`btn btn-sm ${showFilters ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'btn-ghost'}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <FaFilter /> {labels.filter}
            </button>
            {canManageWarehouses && (
              <button className="btn btn-sm bg-green-600 hover:bg-green-500 text-white border-none" onClick={() => setShowForm(true)}>{labels.add}</button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="card p-4 bg-[var(--panel-bg)] border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-[var(--text-primary)]">{labels.filter}</h3>
              <button 
                onClick={() => setFilters({
                  search: '',
                  warehouseName: '',
                  warehouseCode: '',
                  warehouseType: '',
                  status: '',
                  country: '',
                  city: '',
                  manager: '',
                  contactNumber: ''
                })}
                className="text-xs text-red-500 hover:text-red-600 hover:underline"
              >
                {labels.clearFilters}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{labels.warehouseName}</label>
                <SearchableSelect options={warehouseNameOptions} value={filters.warehouseName} onChange={val=>setFilters(prev=>({...prev, warehouseName: val}))} isRTL={isArabic} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{labels.warehouseCode}</label>
                <SearchableSelect options={warehouseCodeOptions} value={filters.warehouseCode} onChange={val=>setFilters(prev=>({...prev, warehouseCode: val}))} isRTL={isArabic} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{labels.warehouseType}</label>
                <select className="input w-full" value={filters.warehouseType} onChange={e=>setFilters(prev=>({...prev, warehouseType: e.target.value}))}>
                  <option value="">{isArabic ? 'الكل' : 'All'}</option>
                  {typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{labels.status}</label>
                <select className="input w-full" value={filters.status} onChange={e=>setFilters(prev=>({...prev, status: e.target.value}))}>
                  <option value="">{isArabic ? 'الكل' : 'All'}</option>
                  {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{labels.country}</label>
                <SearchableSelect options={countryOptions} value={filters.country} onChange={val=>setFilters(prev=>({...prev, country: val}))} isRTL={isArabic} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{labels.city}</label>
                <SearchableSelect options={cityOptions} value={filters.city} onChange={val=>setFilters(prev=>({...prev, city: val}))} isRTL={isArabic} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{labels.manager}</label>
                <input className="input w-full" value={filters.manager} onChange={e=>setFilters(prev=>({...prev, manager: e.target.value}))} placeholder={labels.manager} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{labels.contactNumber}</label>
                <input className="input w-full" value={filters.contactNumber} onChange={e=>setFilters(prev=>({...prev, contactNumber: e.target.value}))} placeholder={labels.contactNumber} />
              </div>
            </div>
          </div>
        )}

        {/* Warehouses List */}
        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <h2 className="text-xl font-medium mb-4">{labels.listTitle}</h2>
          {paginated.length === 0 ? (
            <p className="text-sm text-[var(--muted-text)]">{labels.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="nova-table w-full">
                <thead className="thead-soft">
                  <tr className="text-gray-600 dark:text-gray-300">
                    <th className="text-start">{labels.warehouseName}</th>
                    <th className="text-start">{labels.warehouseCode}</th>
                    <th className="text-start">{labels.city}</th>
                    <th className="text-start">{labels.status}</th>
                    <th className="text-start">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(w => (
                    <tr key={w.id}>
                      <td>{w.warehouseName}</td>
                      <td>{w.warehouseCode}</td>
                      <td>{w.city}</td>
                      <td>{w.status}</td>
                      <td>
                        <div className="flex items-center gap-2 justify-center">
                          {canManageWarehouses && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-circle bg-blue-600 hover:bg-blue-700 text-white border-none"
                                title={labels.edit}
                                aria-label={labels.edit}
                                onClick={() => onEdit(w)}
                              >
                                <FaEdit />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-circle bg-red-600 hover:bg-red-700 text-white border-none"
                                title={labels.delete}
                                aria-label={labels.delete}
                                onClick={() => onDelete(w.id)}
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2 text-sm text-[var(--muted-text)]">
            <div className="flex items-center gap-2">
              <span>{isArabic ? 'عرض' : 'Showing'}</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => setItemsPerPage(Number(e.target.value))} 
                className="select select-bordered select-xs w-16"
              >
                <option>5</option>
                <option>10</option>
                <option>20</option>
                <option>50</option>
              </select>
              <span>{isArabic ? 'من' : 'of'} {filtered.length} {isArabic ? 'عنصر' : 'entries'}</span>
            </div>

            <div className="flex items-center gap-2">
               <span className="text-xs">
                {isArabic ? 'صفحة' : 'Page'} {page} {isArabic ? 'من' : 'of'} {totalPages}
              </span>
              <div className="join">
                <button 
                  className="join-item btn btn-sm btn-ghost" 
                  onClick={goPrevPage} 
                  disabled={page <= 1}
                  title={isArabic ? 'السابق' : 'Prev'}
                >
                  <FaChevronLeft className={isArabic ? 'scale-x-[-1]' : ''} />
                </button>
                <button 
                  className="join-item btn btn-sm btn-ghost" 
                  onClick={goNextPage} 
                  disabled={page >= totalPages}
                  title={isArabic ? 'التالي' : 'Next'}
                >
                  <FaChevronRight className={isArabic ? 'scale-x-[-1]' : ''} />
                </button>
              </div>
            </div>
          </div>
        </div>


        {showForm && (
          <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <div className="absolute inset-0 flex items-start justify-center p-6 md:p-6 overflow-auto">
              <form onSubmit={onSubmit} className="space-y-6 mt-4 w-[95vw] sm:w-[85vw] lg:w-[70vw] xl:max-w-4xl">
                <div className="card p-4 sm:p-6">
                  <div className={`flex items-center justify-between mb-4`}>
                    <h2 className="text-xl font-medium">{labels.formTitleBasic}</h2>
                    <button type="button" className="btn btn-glass btn-sm text-red-500 hover:text-red-600" onClick={() => setShowForm(false)} aria-label={labels.close}>
                      <FaTimes />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">{labels.warehouseName}</label>
                  <input name="warehouseName" value={form.warehouseName} onChange={onChange} placeholder={labels.warehouseName} className="input" required />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.warehouseCode}</label>
                  <input name="warehouseCode" value={form.warehouseCode} onChange={onChange} placeholder={labels.warehouseCode} className="input" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.warehouseType}</label>
                  <select name="warehouseType" value={form.warehouseType} onChange={onChange} className="input">
                    {typeOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.status}</label>
                  <select name="status" value={form.status} onChange={onChange} className="input">
                    {statusOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.manager}</label>
                  <input name="manager" value={form.manager} onChange={onChange} placeholder={labels.manager} className="input" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.contactNumber}</label>
                  <input name="contactNumber" value={form.contactNumber} onChange={onChange} placeholder={labels.contactNumber} className="input" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.email}</label>
                  <input type="email" name="email" value={form.email} onChange={onChange} placeholder={labels.email} className="input" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.address}</label>
                  <input name="address" value={form.address} onChange={onChange} placeholder={labels.address} className="input" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.city}</label>
                  <input name="city" value={form.city} onChange={onChange} placeholder={labels.city} className="input" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.country}</label>
                  <input name="country" value={form.country} onChange={onChange} placeholder={labels.country} className="input" />
                </div>
              </div>
            </div>

                <div className="card p-4 sm:p-6">
                  <h2 className="text-xl font-medium mb-4">{labels.formTitleOperational}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">{labels.storageCapacity}</label>
                  <input type="number" name="storageCapacity" value={form.storageCapacity} onChange={onChange} placeholder={labels.storageCapacity} className="input" min="0" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.sections}</label>
                  <input name="sections" value={form.sections} onChange={onChange} placeholder={labels.sections} className="input" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.allowedUsers}</label>
                  <input name="allowedUsers" value={form.allowedUsers} onChange={onChange} placeholder={labels.allowedUsers} className="input" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="temperatureControlled" name="temperatureControlled" checked={form.temperatureControlled} onChange={onChange} />
                  <label htmlFor="temperatureControlled" className="text-sm">{labels.temperatureControlled}</label>
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.defaultSupplier}</label>
                  <input name="defaultSupplier" value={form.defaultSupplier} onChange={onChange} placeholder={labels.defaultSupplier} className="input" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.operatingHours}</label>
                  <input name="operatingHours" value={form.operatingHours} onChange={onChange} placeholder={labels.operatingHours} className="input" />
                </div>
              </div>
            </div>

                <div className="card p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/50">
                  <h2 className="text-xl font-medium mb-4">{labels.formTitleStock}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">{labels.currentStockValue}</label>
                  <input type="number" name="currentStockValue" value={form.currentStockValue} onChange={onChange} placeholder={labels.currentStockValue} className="input" min="0" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.totalSkusStored}</label>
                  <input type="number" name="totalSkusStored" value={form.totalSkusStored} onChange={onChange} placeholder={labels.totalSkusStored} className="input" min="0" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.minThreshold}</label>
                  <input type="number" name="minThreshold" value={form.minThreshold} onChange={onChange} placeholder={labels.minThreshold} className="input" min="0" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.maxThreshold}</label>
                  <input type="number" name="maxThreshold" value={form.maxThreshold} onChange={onChange} placeholder={labels.maxThreshold} className="input" min="0" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.nextStockAudit}</label>
                  <input type="date" name="nextStockAudit" value={form.nextStockAudit} onChange={onChange} className="input" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.lastStockAudit}</label>
                  <input type="date" name="lastStockAudit" value={form.lastStockAudit} onChange={onChange} className="input" />
                </div>
              </div>
            </div>

                <div className="card p-4 sm:p-6">
                  <h2 className="text-xl font-medium mb-4">{labels.formTitleAttachments}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">{labels.validityCertificates}</label>
                  <input type="file" multiple onChange={(e) => onFileChange('validityCertificates', e.target.files)} className="input" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.maintenanceReports}</label>
                  <input type="file" multiple onChange={(e) => onFileChange('maintenanceReports', e.target.files)} className="input" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">{labels.note}</label>
                  <textarea name="note" value={form.note} onChange={onChange} placeholder={labels.note} className="input h-24" />
                </div>
              </div>
            </div>

                <div className="h-6"></div>
                <div className={`flex gap-2 ${isArabic ? 'justify-start' : 'justify-end'}`}>
                  <button type="submit" className="btn btn-sm bg-green-600 hover:bg-green-500 text-white border-none">{labels.save}</button>
                </div>
                <div className="h-6"></div>
              </form>
            </div>
          </div>
        )}
      </div>
  )
}
