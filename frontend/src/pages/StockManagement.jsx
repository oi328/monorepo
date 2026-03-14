import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../utils/api'

export default function StockManagement() {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  // UI labels
  const labels = useMemo(() => ({
    title: isArabic ? ' إدارة المخزون' : ' Stock Management',
    formTitle: isArabic ? 'بيانات إدارة المخزون' : 'Stock Entry',
    add: isArabic ? 'إضافة سجل مخزون' : 'Add Stock Entry',
    close: isArabic ? 'إغلاق' : 'Close',
    itemOrSku: isArabic ? 'العنصر / SKU' : 'Item / SKU',
    selectItem: isArabic ? 'اختر عنصرًا' : 'Select Item',
    manualSku: isArabic ? 'أدخل SKU يدويًا' : 'Enter SKU manually',
    qtyAvailable: isArabic ? 'الكمية المتاحة' : 'Quantity Available',
    qtyReserved: isArabic ? 'الكمية المحجوزة' : 'Reserved Quantity',
    minAlert: isArabic ? 'حدّ التنبيه الأدنى' : 'Minimum Quantity Alert',
    warehouse: isArabic ? 'المستودع' : 'Warehouse location',
    save: isArabic ? 'حفظ السجل' : 'Save Entry',
    listTitle: isArabic ? 'سجلات إدارة المخزون' : 'Stock Records',
    empty: isArabic ? 'لا توجد سجلات بعد' : 'No records yet',
    actions: isArabic ? 'الإجراءات' : 'Actions',
    delete: isArabic ? 'حذف' : 'Delete',
    effective: isArabic ? 'الصافي المتاح' : 'Effective Available',
    status: isArabic ? 'الحالة' : 'Status',
    country: isArabic ? 'الدولة' : 'Country',
    city: isArabic ? 'المدينة' : 'City',
    lowStock: isArabic ? 'منخفض' : 'Low',
    okStock: isArabic ? 'جيد' : 'OK',
    filter: isArabic ? 'تصفية' : 'Filter',
    search: isArabic ? 'بحث' : 'Search',
    clearFilters: isArabic ? 'مسح المرشحات' : 'Clear Filters',
    itemName: isArabic ? 'اسم الصنف' : 'Item Name',
    brandName: isArabic ? 'اسم العلامة التجارية' : 'Brand Name',
    productName: isArabic ? 'اسم المنتج' : 'Product Name',
    sku: isArabic ? 'SKU' : 'SKU',
    barcode: isArabic ? 'باركود' : 'Barcode',
    warehouseName: isArabic ? 'اسم المستودع' : 'Warehouse Name',
    warehouseCode: isArabic ? 'رمز المستودع' : 'Warehouse Code',
    warehouseType: isArabic ? 'نوع المستودع' : 'Warehouse Type',
    supplierName: isArabic ? 'اسم المورد' : 'Supplier Name',
    supplierCode: isArabic ? 'كود المورد' : 'Supplier Code',
    companyName: isArabic ? 'اسم الشركة' : 'Company Name',
    categoryName: isArabic ? 'اسم التصنيف' : 'Category Name',
    categoryType: isArabic ? 'نوع التصنيف' : 'Category Type',
    contactPerson: isArabic ? 'الشخص المسؤول' : 'Contact Person',
    contactNumber: isArabic ? 'رقم التواصل' : 'Contact Number',
  }), [isArabic])

  const STORAGE_KEY = 'inventoryStock'
  const ITEMS_KEY = 'inventoryItems'

  const [items, setItems] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
  const [records, setRecords] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showAllFilters, setShowAllFilters] = useState(false)
  
  const [form, setForm] = useState({
    itemId: '',
    manualSku: '',
    qtyAvailable: '',
    qtyReserved: '',
    minAlert: '',
    warehouse: ''
  })
  
  const [filters, setFilters] = useState({
    search: '',
    itemName: '',
    brandName: '',
    productName: '',
    sku: '',
    barcode: '',
    warehouseName: '',
    warehouseCode: '',
    warehouseType: '',
    status: '',
    country: '',
    city: '',
    contactPerson: '',
    contactNumber: '',
    supplierName: '',
    supplierCode: '',
    companyName: '',
    categoryName: '',
    categoryType: ''
  })

  // Pagination
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

    // Load
    useEffect(() => {
      const fetchStockData = async () => {
        try {
          const { data } = await api.get('/api/items')
          if (data && data.data) {
             const mappedRecords = data.data.map(item => ({
               id: item.id,
               itemId: item.id,
               itemName: item.name,
               sku: item.code || item.sku,
               qtyAvailable: item.quantity || 0,
               qtyReserved: item.reserved_quantity || 0,
               minAlert: item.min_alert || 0,
               warehouse: item.warehouse || '',
               // Additional fields mapped from item if needed for filters
               category: item.category,
               brand: item.brand,
               supplier: item.supplier,
               // Map these to support existing filter logic where possible
               productName: item.name,
               brandName: item.brand
             }))
             setRecords(mappedRecords)
             setItems(mappedRecords)
             // Use these records to populate products for now as they are 1:1
             setProducts(mappedRecords.map(r => ({ name: r.itemName, brand: r.brand, category: r.category })))
             
             // Derive warehouses from records as we don't have a warehouse API yet
             const uniqueWarehouses = [...new Set(mappedRecords.map(r => r.warehouse).filter(Boolean))].map(w => ({
               warehouseName: w,
               warehouseCode: '', // Not available
               warehouseType: '' // Not available
             }))
             setWarehouses(uniqueWarehouses)
          }
        } catch (err) {
          console.error('Failed to load stock records', err)
        }
      }

      const fetchAuxData = async () => {
        try {
          const catRes = await api.get('/api/item-categories')
          if (catRes.data) {
            setCategories(Array.isArray(catRes.data) ? catRes.data : (catRes.data.data || []))
          }
        } catch (err) {
          console.error('Failed to load aux data', err)
        }
      }

      fetchStockData()
      fetchAuxData()
    }, [])

  // Persist removed as we use API


  // Filter Options
  const itemNameOptions = useMemo(() => Array.from(new Set(items.map(i => i.itemName).filter(Boolean))), [items])
  const brandNameOptions = useMemo(() => Array.from(new Set(products.map(p => p.brand).filter(Boolean))), [products])
  const productNameOptions = useMemo(() => Array.from(new Set(products.map(p => p.name).filter(Boolean))), [products])
  const skuOptions = useMemo(() => Array.from(new Set(items.map(i => i.sku).filter(Boolean))), [items])
  const warehouseNameOptions = useMemo(() => Array.from(new Set(warehouses.map(w => w.warehouseName).filter(Boolean))), [warehouses])
  const warehouseCodeOptions = useMemo(() => Array.from(new Set(warehouses.map(w => w.warehouseCode).filter(Boolean))), [warehouses])
  const warehouseTypeOptions = useMemo(() => Array.from(new Set(warehouses.map(w => w.warehouseType).filter(Boolean))), [warehouses])
  const supplierNameOptions = useMemo(() => Array.from(new Set(suppliers.map(s => s.supplierName).filter(Boolean))), [suppliers])
  const supplierCodeOptions = useMemo(() => Array.from(new Set(suppliers.map(s => s.supplierCode).filter(Boolean))), [suppliers])
  const companyNameOptions = useMemo(() => Array.from(new Set(suppliers.map(s => s.companyName).filter(Boolean))), [suppliers])
  const categoryNameOptions = useMemo(() => Array.from(new Set(categories.map(c => c.name).filter(Boolean))), [categories])
  const categoryTypeOptions = useMemo(() => Array.from(new Set(categories.map(c => c.type).filter(Boolean))), [categories])

  const filtered = useMemo(() => {
    return records.filter(rec => {
      // Basic Filters
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!rec.itemName.toLowerCase().includes(q) && !rec.sku.toLowerCase().includes(q)) return false
      }

      // Resolve Entities
      const item = items.find(i => i.id === rec.itemId) || items.find(i => i.itemName === rec.itemName) // Fallback
      if (!item) {
         // Strict filtering if item missing but filters active
         const hasItemFilters = filters.itemName || filters.sku || filters.barcode || 
                                filters.brandName || filters.productName || 
                                filters.warehouseName || filters.warehouseCode || filters.warehouseType ||
                                filters.supplierName || filters.supplierCode || filters.companyName ||
                                filters.categoryName || filters.categoryType
         if (hasItemFilters) return false
         return true
      }

      // Item Filters
      if (filters.itemName && item.itemName !== filters.itemName) return false
      if (filters.sku && item.sku !== filters.sku) return false
      if (filters.barcode && item.barcode !== filters.barcode) return false

      // Product Filters
      const product = products.find(p => p.name === item.productName)
      if (filters.productName && item.productName !== filters.productName) return false
      if (filters.brandName && item.brandName !== filters.brandName) return false

      // Warehouse Filters
      // Note: Stock Record has 'warehouse' field which is name. 
      // But we also have Item -> Warehouse link. 
      // Usually Stock Record location overrides Item default location?
      // Let's filter by the Stock Record's warehouse if present, or Item's warehouse?
      // The user wants to filter Stock Records. Stock Record has a specific location.
      // So we should filter by `rec.warehouse` (name).
      
      const recordWarehouseName = rec.warehouse
      const warehouse = warehouses.find(w => w.warehouseName === recordWarehouseName)
      
      if (filters.warehouseName && recordWarehouseName !== filters.warehouseName) return false
      if (filters.warehouseCode && warehouse && warehouse.warehouseCode !== filters.warehouseCode) return false
      if (filters.warehouseType && warehouse && warehouse.warehouseType !== filters.warehouseType) return false
      // Location Filters (Warehouse or Supplier)
      if (filters.country) {
        const q = filters.country.toLowerCase()
        const inWarehouse = warehouse && warehouse.country && warehouse.country.toLowerCase().includes(q)
        const inSupplier = supplier && supplier.countryCity && supplier.countryCity.toLowerCase().includes(q)
        if (!inWarehouse && !inSupplier) return false
      }
      if (filters.city) {
        const q = filters.city.toLowerCase()
        const inWarehouse = warehouse && warehouse.city && warehouse.city.toLowerCase().includes(q)
        const inSupplier = supplier && supplier.countryCity && supplier.countryCity.toLowerCase().includes(q)
        if (!inWarehouse && !inSupplier) return false
      }

      // Status (Warehouse Status)
      if (filters.status && warehouse && warehouse.status && !warehouse.status.toLowerCase().includes(filters.status.toLowerCase())) return false

      // Supplier Filters (via Item -> Supplier)
      const supplier = suppliers.find(s => s.supplierName === item.supplier)
      if (filters.supplierName && item.supplier !== filters.supplierName) return false
      if (filters.supplierCode && supplier && supplier.supplierCode !== filters.supplierCode) return false
      if (filters.companyName && supplier && supplier.companyName !== filters.companyName) return false
      
      // Shared Detail Filters (Contact Person, Contact Number)
      // Match EITHER Warehouse OR Supplier
      if (filters.contactPerson) {
        const q = filters.contactPerson.toLowerCase()
        const inWarehouse = warehouse && warehouse.manager && warehouse.manager.toLowerCase().includes(q)
        const inSupplier = supplier && supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(q)
        if (!inWarehouse && !inSupplier) return false
      }
      
      if (filters.contactNumber) {
        const q = filters.contactNumber.toLowerCase()
        const inWarehouse = warehouse && warehouse.contactNumber && warehouse.contactNumber.toLowerCase().includes(q)
        const inSupplier = supplier && supplier.phone && supplier.phone.toLowerCase().includes(q)
        if (!inWarehouse && !inSupplier) return false
      }
      
      // Category Filters (via Item -> Category)
      const category = categories.find(c => c.name === item.category)
      if (filters.categoryName && item.category !== filters.categoryName) return false
      if (filters.categoryType && category && category.type !== filters.categoryType) return false

      return true
    })
  }, [records, filters, items, products, warehouses, suppliers, categories])

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

  function clearFilters() {
    setFilters({
      search: '',
      itemName: '',
      brandName: '',
      productName: '',
      sku: '',
      barcode: '',
      warehouseName: '',
      warehouseCode: '',
      warehouseType: '',
      status: '',
      country: '',
      city: '',
      contactPerson: '',
      contactNumber: '',
      supplierName: '',
      supplierCode: '',
      companyName: '',
      categoryName: '',
      categoryType: ''
    })
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    
    const payload = {
      quantity: Number(form.qtyAvailable) || 0,
      reserved_quantity: Number(form.qtyReserved) || 0,
      min_alert: Number(form.minAlert) || 0,
      warehouse: form.warehouse
    }

    try {
      if (form.itemId) {
        // Update existing item
        await api.put(`/api/items/${form.itemId}`, payload)
        
        setRecords(prev => prev.map(rec => 
          rec.id === Number(form.itemId) ? { 
            ...rec, 
            qtyAvailable: payload.quantity, 
            qtyReserved: payload.reserved_quantity, 
            minAlert: payload.min_alert,
            warehouse: payload.warehouse
          } : rec
        ))
      } else if (form.manualSku) {
        // Create new item
        payload.name = 'Manual Item ' + Date.now()
        payload.sku = form.manualSku
        const { data } = await api.post('/api/items', payload)
        
        const newRecord = {
             id: data.id,
             itemId: data.id,
             itemName: data.name,
             sku: data.code || data.sku,
             qtyAvailable: data.quantity || 0,
             qtyReserved: data.reserved_quantity || 0,
             minAlert: data.min_alert || 0,
             warehouse: data.warehouse || '',
             category: data.category,
             brand: data.brand,
             supplier: data.supplier
        }
        setRecords(prev => [newRecord, ...prev])
        setItems(prev => [newRecord, ...prev])
      }
      
      setShowForm(false)
      setForm({ itemId: '', manualSku: '', qtyAvailable: '', qtyReserved: '', minAlert: '', warehouse: '' })
    } catch (err) {
      console.error('Failed to save stock record', err)
    }
  }

  const removeRecord = async (id) => {
    if (!window.confirm(isArabic ? 'هل أنت متأكد؟' : 'Are you sure?')) return
    try {
      await api.delete(`/api/items/${id}`)
      setRecords((r) => r.filter((rec) => rec.id !== id))
    } catch (err) {
      console.error('Failed to delete item', err)
    }
  }

  const renderStatus = (rec) => {
    const effective = (rec.qtyAvailable || 0) - (rec.qtyReserved || 0)
    const low = effective <= (rec.minAlert || 0)
    const tone = low ? 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/40' : 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/40'
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${tone}`}>{low ? labels.lowStock : labels.okStock}</span>
    )
  }

  return (
      <div className="space-y-6 pt-4">
        <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
          <div className="relative inline-block">
            <h1 className={`page-title text-2xl font-semibold ${isArabic ? 'text-right' : 'text-left'}`}>{labels.title}</h1>
            <span aria-hidden className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" style={{ width: 'calc(100% + 8px)', left: isArabic ? 'auto' : '-4px', right: isArabic ? '-4px' : 'auto', bottom: '-4px' }}></span>
          </div>
          <button className="btn btn-sm bg-green-600 hover:bg-green-500 text-white border-none" onClick={() => setShowForm(true)}>{labels.add}</button>
        </div>

        {/* Filter Section */}
        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FaFilter className="text-blue-500" /> {labels.filter}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAllFilters(prev => !prev)} className="btn btn-glass btn-compact text-blue-600">
                {showAllFilters ? (isArabic ? 'إخفاء' : 'Hide') : (isArabic ? 'إظهار' : 'Show')} <FaChevronDown className={`transform transition-transform ${showAllFilters ? 'rotate-180' : ''}`} />
              </button>
              <button onClick={clearFilters} className="btn btn-glass btn-compact text-[var(--muted-text)] hover:text-red-500">
                {labels.clearFilters}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaSearch className="text-blue-500" size={10} /> {labels.search}</label>
              <input className="input w-full" value={filters.search} onChange={e=>setFilters(prev=>({...prev, search: e.target.value}))} placeholder={isArabic ? 'بحث...' : 'Search...'} />
            </div>
             <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.itemName}</label>
              <SearchableSelect options={itemNameOptions} value={filters.itemName} onChange={val=>setFilters(prev=>({...prev, itemName: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.sku}</label>
              <SearchableSelect options={skuOptions} value={filters.sku} onChange={val=>setFilters(prev=>({...prev, sku: val}))} isRTL={isArabic} />
            </div>
             <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.warehouseName}</label>
              <SearchableSelect options={warehouseNameOptions} value={filters.warehouseName} onChange={val=>setFilters(prev=>({...prev, warehouseName: val}))} isRTL={isArabic} />
            </div>
          </div>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-300 overflow-hidden ${showAllFilters ? 'max-h-[800px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
             <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.barcode}</label>
              <input className="input w-full" value={filters.barcode} onChange={e=>setFilters(prev=>({...prev, barcode: e.target.value}))} placeholder={labels.barcode} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.brandName}</label>
              <SearchableSelect options={brandNameOptions} value={filters.brandName} onChange={val=>setFilters(prev=>({...prev, brandName: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.productName}</label>
              <SearchableSelect options={productNameOptions} value={filters.productName} onChange={val=>setFilters(prev=>({...prev, productName: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.warehouseCode}</label>
              <SearchableSelect options={warehouseCodeOptions} value={filters.warehouseCode} onChange={val=>setFilters(prev=>({...prev, warehouseCode: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.warehouseType}</label>
              <SearchableSelect options={warehouseTypeOptions} value={filters.warehouseType} onChange={val=>setFilters(prev=>({...prev, warehouseType: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.status}</label>
              <input className="input w-full" value={filters.status} onChange={e=>setFilters(prev=>({...prev, status: e.target.value}))} placeholder={labels.status} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.country}</label>
              <input className="input w-full" value={filters.country} onChange={e=>setFilters(prev=>({...prev, country: e.target.value}))} placeholder={labels.country} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.city}</label>
              <input className="input w-full" value={filters.city} onChange={e=>setFilters(prev=>({...prev, city: e.target.value}))} placeholder={labels.city} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.supplierName}</label>
              <SearchableSelect options={supplierNameOptions} value={filters.supplierName} onChange={val=>setFilters(prev=>({...prev, supplierName: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.supplierCode}</label>
              <SearchableSelect options={supplierCodeOptions} value={filters.supplierCode} onChange={val=>setFilters(prev=>({...prev, supplierCode: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.companyName}</label>
              <SearchableSelect options={companyNameOptions} value={filters.companyName} onChange={val=>setFilters(prev=>({...prev, companyName: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.categoryName}</label>
              <SearchableSelect options={categoryNameOptions} value={filters.categoryName} onChange={val=>setFilters(prev=>({...prev, categoryName: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.categoryType}</label>
              <SearchableSelect options={categoryTypeOptions} value={filters.categoryType} onChange={val=>setFilters(prev=>({...prev, categoryType: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.contactPerson}</label>
              <input className="input w-full" value={filters.contactPerson} onChange={e=>setFilters(prev=>({...prev, contactPerson: e.target.value}))} placeholder={labels.contactPerson} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.contactNumber}</label>
              <input className="input w-full" value={filters.contactNumber} onChange={e=>setFilters(prev=>({...prev, contactNumber: e.target.value}))} placeholder={labels.contactNumber} />
            </div>
          </div>
        </div>

        {/* Records List */}
        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <h2 className="text-xl font-medium mb-4">{labels.listTitle}</h2>
          {paginated.length === 0 ? (
            <p className="text-sm text-[var(--muted-text)]">{labels.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="nova-table w-full">
                <thead className="thead-soft">
                  <tr className="text-gray-600 dark:text-gray-300">
                    <th className="text-start px-3 min-w-[180px]">{labels.itemOrSku}</th>
                    <th className="text-center px-3 min-w-[110px]">{labels.qtyAvailable}</th>
                    <th className="text-center px-3 min-w-[110px]">{labels.qtyReserved}</th>
                    <th className="text-center px-3 min-w-[110px]">{labels.effective}</th>
                    <th className="text-center px-3 min-w-[110px]">{labels.minAlert}</th>
                    <th className="text-start px-3 min-w-[160px]">{labels.warehouse}</th>
                    <th className="text-center px-3 min-w-[110px]">{labels.status}</th>
                    <th className="text-center px-3 min-w-[100px]">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((rec) => {
                    const effective = (rec.qtyAvailable || 0) - (rec.qtyReserved || 0)
                    const low = effective <= (rec.minAlert || 0)
                    return (
                      <tr key={rec.id} className={low ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <td className="px-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{rec.itemName || '-'}</span>
                            <span className="text-xs text-[var(--muted-text)]">{rec.sku || '-'}</span>
                          </div>
                        </td>
                        <td className="px-3 text-center">{rec.qtyAvailable ?? 0}</td>
                        <td className="px-3 text-center">{rec.qtyReserved ?? 0}</td>
                        <td className="px-3 text-center">{effective}</td>
                        <td className="px-3 text-center">{rec.minAlert ?? 0}</td>
                        <td className="px-3">{rec.warehouse || '-'}</td>
                        <td className="px-3 text-center">{renderStatus(rec)}</td>
                        <td className="px-3 text-center">
                          <button
                            type="button"
                            className="btn btn-sm btn-circle bg-red-600 hover:bg-red-700 text-white border-none"
                            onClick={() => removeRecord(rec.id)}
                            title={labels.delete}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
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
            <div className="absolute inset-0 flex items-start justify-center p-6 md:p-6">
              <div className="card p-4 sm:p-6 mt-4 w-[92vw] sm:w-[80vw] lg:w-[60vw] xl:max-w-3xl">
                <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''} mb-4`}>
                  <h2 className="text-xl font-medium">{labels.formTitle}</h2>
                  <button type="button" className="btn btn-sm btn-circle bg-white text-red-600 hover:bg-red-50 shadow-md" onClick={() => setShowForm(false)} aria-label={labels.close}>
                    <FaTimes size={20} />
                  </button>
                </div>
                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item selection */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--muted-text)]">{labels.itemOrSku}</label>
                <SearchableSelect 
                  options={items.map(it => it.itemName)} 
                  value={items.find(i => i.id === form.itemId)?.itemName || ''} 
                  onChange={(val) => {
                     const item = items.find(i => i.itemName === val)
                     setForm(prev => ({ ...prev, itemId: item ? item.id : '' }))
                  }} 
                  isRTL={isArabic} 
                />
              </div>

              {/* Manual SKU */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--muted-text)]">{labels.manualSku}</label>
                <input name="manualSku" value={form.manualSku} onChange={onChange} placeholder={labels.manualSku} className="input w-full" />
              </div>

              {/* Qty Available */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--muted-text)]">{labels.qtyAvailable}</label>
                <input type="number" name="qtyAvailable" value={form.qtyAvailable} onChange={onChange} min="0" step="1" placeholder={labels.qtyAvailable} className="input w-full" />
              </div>

              {/* Reserved Qty */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--muted-text)]">{labels.qtyReserved}</label>
                <input type="number" name="qtyReserved" value={form.qtyReserved} onChange={onChange} min="0" step="1" placeholder={labels.qtyReserved} className="input w-full" />
              </div>

              {/* Min Alert */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--muted-text)]">{labels.minAlert}</label>
                <input type="number" name="minAlert" value={form.minAlert} onChange={onChange} min="0" step="1" placeholder={labels.minAlert} className="input w-full" />
              </div>

              {/* Warehouse */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--muted-text)]">{labels.warehouse}</label>
                <SearchableSelect 
                  options={warehouses.map(w => w.warehouseName)} 
                  value={form.warehouse} 
                  onChange={(val) => setForm(prev => ({ ...prev, warehouse: val }))} 
                  isRTL={isArabic} 
                />
              </div>

                  <div className={`md:col-span-2 flex gap-2 justify-end`}>
                    <button type="submit" className="btn btn-sm bg-green-600 hover:bg-green-500 text-white border-none">{labels.save}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
