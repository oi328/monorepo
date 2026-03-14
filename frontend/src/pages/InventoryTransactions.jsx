import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../shared/context/ThemeProvider'
import { FaFilter, FaChevronDown, FaSearch, FaTrash, FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa'
import SearchableSelect from '../components/SearchableSelect'

export default function InventoryTransactions() {
  const { i18n } = useTranslation()
  const { theme } = useTheme()
  const isArabic = i18n.language === 'ar'

  const labels = useMemo(() => ({
    title: isArabic ? ' الحركات' : ' Transactions',
    formTitle: isArabic ? 'تسجيل حركة مخزون' : 'Record Stock Transaction',
    add: isArabic ? 'إضافة حركة' : 'Add Transaction',
    date: isArabic ? 'التاريخ' : 'Date',
    type: isArabic ? 'النوع (ادخال/اخراج/نقل)' : 'Type (in/out/transfer)',
    quantity: isArabic ? 'الكمية' : 'Quantity',
    reference: isArabic ? 'المرجع (أمر بيع/شراء)' : 'Reference (Sales/Purchase Order)',
    username: isArabic ? 'اسم المستخدم' : 'User name',
    save: isArabic ? 'حفظ الحركة' : 'Save Transaction',
    listTitle: isArabic ? 'سجل الحركات' : 'Transaction Log',
    empty: isArabic ? 'لا توجد حركات بعد' : 'No transactions yet',
    actions: isArabic ? 'الإجراءات' : 'Actions',
    delete: isArabic ? 'حذف' : 'Delete',
    type_in: isArabic ? 'ادخال' : 'In',
    type_out: isArabic ? 'اخراج' : 'Out',
    type_transfer: isArabic ? 'نقل' : 'Transfer',
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
    status: isArabic ? 'الحالة' : 'Status',
    selectItem: isArabic ? 'اختر الصنف' : 'Select Item',
  }), [isArabic])

  const STORAGE_KEY = 'inventoryTransactions'

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'in',
    quantity: '',
    reference: '',
    username: '',
    itemId: ''
  })
  const [transactions, setTransactions] = useState([])
  const [items, setItems] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])

  const [showForm, setShowForm] = useState(false)
  const [showAllFilters, setShowAllFilters] = useState(false)
  
  const [filters, setFilters] = useState({
    search: '',
    type: '',
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

  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Load existing
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTransactions(parsed)
        } else {
          setTransactions([
            { id: 1, date: '2023-10-25', type: 'in', quantity: 50, reference: 'PO-2023-1001', username: 'Ahmed Ali', itemId: '1' },
            { id: 2, date: '2023-10-26', type: 'out', quantity: 5, reference: 'SO-2023-5001', username: 'Sara Ahmed', itemId: '2' },
            { id: 3, date: '2023-10-27', type: 'transfer', quantity: 10, reference: 'TR-2023-001', username: 'Khaled Omar', itemId: '4' },
            { id: 4, date: '2023-10-28', type: 'in', quantity: 100, reference: 'PO-2023-1002', username: 'Ahmed Ali', itemId: '2' },
            { id: 5, date: '2023-10-29', type: 'out', quantity: 2, reference: 'SO-2023-5002', username: 'Sara Ahmed', itemId: '1' },
          ])
        }
      } else {
        setTransactions([
          { id: 1, date: '2023-10-25', type: 'in', quantity: 50, reference: 'PO-2023-1001', username: 'Ahmed Ali', itemId: '1' },
          { id: 2, date: '2023-10-26', type: 'out', quantity: 5, reference: 'SO-2023-5001', username: 'Sara Ahmed', itemId: '2' },
          { id: 3, date: '2023-10-27', type: 'transfer', quantity: 10, reference: 'TR-2023-001', username: 'Khaled Omar', itemId: '4' },
          { id: 4, date: '2023-10-28', type: 'in', quantity: 100, reference: 'PO-2023-1002', username: 'Ahmed Ali', itemId: '2' },
          { id: 5, date: '2023-10-29', type: 'out', quantity: 2, reference: 'SO-2023-5002', username: 'Sara Ahmed', itemId: '1' },
        ])
      }
      
      const rawItems = localStorage.getItem('inventoryItems')
      if (rawItems) setItems(JSON.parse(rawItems))

      const rawProducts = localStorage.getItem('inventoryProducts')
      if (rawProducts) setProducts(JSON.parse(rawProducts))

      const rawWarehouses = localStorage.getItem('inventoryWarehouses')
      if (rawWarehouses) setWarehouses(JSON.parse(rawWarehouses))

      const rawSuppliers = localStorage.getItem('inventorySuppliers')
      if (rawSuppliers) setSuppliers(JSON.parse(rawSuppliers))
      
      const rawCategories = localStorage.getItem('inventoryCategories')
      if (rawCategories) setCategories(JSON.parse(rawCategories))

    } catch (e) { console.warn('Failed to load data', e) }
  }, [])

  // Persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)) } catch (e) { void e }
  }, [transactions])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const quantity = Number(form.quantity || 0)
    if (!form.date || !form.type || quantity <= 0) return

    const newTx = {
      id: Date.now(),
      date: form.date,
      type: form.type,
      quantity,
      reference: form.reference || '',
      username: form.username || '',
      itemId: form.itemId
    }
    setTransactions((t) => [newTx, ...t])
    setForm({ date: new Date().toISOString().slice(0, 10), type: 'in', quantity: '', reference: '', username: '', itemId: '' })
  }

  const removeTx = (id) => setTransactions((t) => t.filter((x) => x.id !== id))

  const typeLabel = (t) => {
    switch (t) {
      case 'in': return labels.type_in
      case 'out': return labels.type_out
      case 'transfer': return labels.type_transfer
      default: return t
    }
  }

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
    return transactions.filter(tx => {
      // Basic Filters
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!tx.reference.toLowerCase().includes(q) && !tx.username.toLowerCase().includes(q)) return false
      }
      if (filters.type && tx.type !== filters.type) return false

      // Resolve Entities
      const item = items.find(i => i.id === tx.itemId) || items.find(i => i.itemName === tx.itemName) // Fallback
      if (!item) {
        // If we can't find the item, and we are filtering by item properties, exclude it?
        // Or if the transaction itself has legacy fields?
        // For strict filtering: if filter is present and item missing, return false.
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

      // Product Filters (via Item -> Product)
      const product = products.find(p => p.name === item.productName) // Assuming item stores productName
      if (filters.productName && item.productName !== filters.productName) return false
      if (filters.brandName && item.brandName !== filters.brandName) return false // Assuming item stores brandName

      // Warehouse Filters (via Item -> Warehouse)
      const warehouse = warehouses.find(w => w.warehouseName === item.warehouse) // Assuming item stores warehouseName
      if (filters.warehouseName && item.warehouse !== filters.warehouseName) return false
      if (filters.warehouseCode && warehouse && warehouse.warehouseCode !== filters.warehouseCode) return false
      if (filters.warehouseType && warehouse && warehouse.warehouseType !== filters.warehouseType) return false
      if (filters.status && warehouse && warehouse.status !== filters.status) return false

      // Supplier Filters (via Item -> Supplier)
      const supplier = suppliers.find(s => s.supplierName === item.supplier) // Assuming item stores supplierName
      if (filters.supplierName && item.supplier !== filters.supplierName) return false
      if (filters.supplierCode && supplier && supplier.supplierCode !== filters.supplierCode) return false
      if (filters.companyName && supplier && supplier.companyName !== filters.companyName) return false
      
      // Shared Detail Filters (Contact, Location) - Match EITHER Warehouse OR Supplier
      if (filters.contactPerson) {
        const q = filters.contactPerson.toLowerCase()
        const inWarehouse = warehouse && warehouse.manager && warehouse.manager.toLowerCase().includes(q)
        const inSupplier = supplier && supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(q)
        if (!inWarehouse && !inSupplier) return false
      }
      if (filters.contactNumber) {
        const q = filters.contactNumber
        const inWarehouse = warehouse && warehouse.contactNumber && warehouse.contactNumber.includes(q)
        const inSupplier = supplier && supplier.phone && supplier.phone.includes(q)
        if (!inWarehouse && !inSupplier) return false
      }
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
      
      // Category Filters (via Item -> Category)
      const category = categories.find(c => c.name === item.category)
      if (filters.categoryName && item.category !== filters.categoryName) return false
      if (filters.categoryType && category && category.type !== filters.categoryType) return false

      return true
    })
  }, [transactions, filters, items, products, warehouses, suppliers, categories])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, page, itemsPerPage])

  const goPrevPage = () => setPage(p => Math.max(1, p - 1))
  const goNextPage = () => setPage(p => Math.min(totalPages, p + 1))

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [filters])

  function clearFilters() {
    setFilters({
      search: '',
      type: '',
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

  return (
      <div className="space-y-6 pt-4">
        <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
          <div className="relative inline-block">
            <h1 className={`page-title text-2xl font-semibold ${isArabic ? 'text-right' : 'text-left'}`}>{labels.title}</h1>
            <span aria-hidden className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" style={{ width: 'calc(100% + 8px)', left: isArabic ? 'auto' : '-4px', right: isArabic ? '-4px' : 'auto', bottom: '-4px' }}></span>
          </div>
          <button className="btn btn-sm bg-green-600 hover:bg-green-500 text-white border-none" onClick={() => setShowForm(true)}>{labels.add}</button>
        </div>

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
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.type}</label>
              <select className="input w-full" value={filters.type} onChange={e=>setFilters(prev=>({...prev, type: e.target.value}))}>
                <option value="">{isArabic ? 'الكل' : 'All'}</option>
                <option value="in">{labels.type_in}</option>
                <option value="out">{labels.type_out}</option>
                <option value="transfer">{labels.type_transfer}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.itemName}</label>
              <SearchableSelect options={itemNameOptions} value={filters.itemName} onChange={val=>setFilters(prev=>({...prev, itemName: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.sku}</label>
              <SearchableSelect options={skuOptions} value={filters.sku} onChange={val=>setFilters(prev=>({...prev, sku: val}))} isRTL={isArabic} />
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
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.warehouseName}</label>
              <SearchableSelect options={warehouseNameOptions} value={filters.warehouseName} onChange={val=>setFilters(prev=>({...prev, warehouseName: val}))} isRTL={isArabic} />
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
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.contactPerson}</label>
              <input className="input w-full" value={filters.contactPerson} onChange={e=>setFilters(prev=>({...prev, contactPerson: e.target.value}))} placeholder={labels.contactPerson} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.contactNumber}</label>
              <input className="input w-full" value={filters.contactNumber} onChange={e=>setFilters(prev=>({...prev, contactNumber: e.target.value}))} placeholder={labels.contactNumber} />
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <h2 className="text-xl font-medium mb-4">{labels.listTitle}</h2>
          {paginated.length === 0 ? (
            <p className="text-sm text-[var(--muted-text)]">{labels.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="nova-table w-full">
                <thead className="thead-soft">
                  <tr className="text-gray-600 dark:text-gray-300">
                    <th className="text-start px-3 min-w-[140px]">{labels.date}</th>
                    <th className="text-start px-3 min-w-[160px]">{labels.itemName}</th>
                    <th className="text-start px-3 min-w-[160px]">{labels.type}</th>
                    <th className="text-center px-3 min-w-[110px]">{labels.quantity}</th>
                    <th className="text-start px-3 min-w-[220px]">{labels.reference}</th>
                    <th className="text-start px-3 min-w-[160px]">{labels.username}</th>
                    <th className="text-center px-3 min-w-[100px]">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((tx) => {
                    const item = items.find(i => i.id === tx.itemId) || items.find(i => i.itemName === tx.itemName)
                    return (
                    <tr key={tx.id}>
                      <td className="px-3"><span className="font-medium">{tx.date}</span></td>
                      <td className="px-3">{item ? item.itemName : '-'}</td>
                      <td className="px-3">{typeLabel(tx.type)}</td>
                      <td className="px-3 text-center">{tx.quantity}</td>
                      <td className="px-3">{tx.reference}</td>
                      <td className="px-3">{tx.username}</td>
                      <td className="px-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <button type="button" className="btn btn-sm btn-circle bg-red-600 hover:bg-red-700 text-white border-none" onClick={() => removeTx(tx.id)} title={labels.delete}>
                            <FaTrash />
                          </button>
                        </div>
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
              <div 
                className="bg-white dark:!bg-blue-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mt-4 w-[92vw] sm:w-[80vw] lg:w-[60vw] xl:max-w-3xl"
                style={{ backgroundColor: theme === 'dark' ? '#1e3a8a' : undefined }}
              >
                <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''} mb-4`}>
                  <h2 className="text-xl font-medium text-gray-900 dark:text-white">{labels.formTitle}</h2>
                  <button type="button" className="btn btn-sm btn-circle bg-transparent text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setShowForm(false)} aria-label={labels.close}>
                    <FaTimes size={20} />
                  </button>
                </div>
                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--muted-text)]">{labels.date}</label>
                    <input type="date" required className="input w-full" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--muted-text)]">{labels.selectItem}</label>
                    <SearchableSelect 
                      options={itemNameOptions} 
                      value={items.find(i => i.id === form.itemId)?.itemName || ''} 
                      onChange={(val) => {
                         const item = items.find(i => i.itemName === val)
                         setForm(prev => ({ ...prev, itemId: item ? item.id : '' }))
                      }} 
                      isRTL={isArabic} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--muted-text)]">{labels.type}</label>
                    <select className="input w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="in">{labels.type_in}</option>
                      <option value="out">{labels.type_out}</option>
                      <option value="transfer">{labels.type_transfer}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--muted-text)]">{labels.quantity}</label>
                    <input type="number" required min="1" className="input w-full" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--muted-text)]">{labels.reference}</label>
                    <input className="input w-full" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--muted-text)]">{labels.username}</label>
                    <input className="input w-full" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
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
