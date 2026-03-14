import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaEdit, FaTrash, FaChevronLeft, FaChevronRight, FaFilter, FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa'
import SearchableSelect from '../components/SearchableSelect'

export default function Products() {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  // UI labels with bilingual fallback
  const labels = useMemo(() => ({
    title: isArabic ? ' المنتجات' : ' Products',
    formTitle: isArabic ? 'بيانات المنتج' : 'Product Details',
    add: isArabic ? 'إضافة منتج' : 'Add Product',
    close: isArabic ? 'إغلاق' : 'Close',
    filter: isArabic ? 'تصفية' : 'Filter',
    search: isArabic ? 'بحث' : 'Search',
    clearFilters: isArabic ? 'مسح المرشحات' : 'Clear Filters',
    name: isArabic ? 'اسم المنتج' : 'Product Name',
    brand: isArabic ? 'العلامة التجارية' : 'Brand Name',
    category: isArabic ? 'التصنيف' : 'Category',
    description: isArabic ? 'الوصف' : 'Description',
    uom: isArabic ? 'وحدة القياس' : 'Unit of Measure',
    supplier: isArabic ? 'المورد الافتراضي' : 'Default Supplier',
    price: isArabic ? 'السعر الافتراضي' : 'Default Price',
    save: isArabic ? 'حفظ المنتج' : 'Save Product',
    listTitle: isArabic ? 'قائمة كل المنتجات الرئيسية' : 'All Products',
    empty: isArabic ? 'لا توجد منتجات بعد' : 'No products yet',
    actions: isArabic ? 'الإجراءات' : 'Actions',
    delete: isArabic ? 'حذف' : 'Delete',
    edit: isArabic ? 'تعديل' : 'Edit',
  }), [isArabic])

  // Static options (can be replaced later by API data)
  const categoryOptions = useMemo(() => (
    isArabic ? ['إلكترونيات', 'أثاث', 'ملابس'] : ['Electronics', 'Furniture', 'Clothing']
  ), [isArabic])
  const uomOptions = useMemo(() => (
    isArabic ? ['قطعة', 'علبة', 'كيلوغرام'] : ['Piece', 'Box', 'Kg']
  ), [isArabic])
  const supplierOptions = useMemo(() => (
    isArabic ? ['المورد أ', 'المورد ب', 'المورد ج'] : ['Supplier A', 'Supplier B', 'Supplier C']
  ), [isArabic])

  // Form state
  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: categoryOptions[0] || '',
    description: '',
    uom: uomOptions[0] || '',
    supplier: supplierOptions[0] || '',
    price: ''
  })

  // Products list
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [filters, setFilters] = useState({ search: '', brand: '', productName: '', category: '', supplier: '', uom: '', minPrice: '', maxPrice: '' })
  
  // Pagination
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)

  const brandOptions = useMemo(() => Array.from(new Set(products.map(p => p.brand).filter(Boolean))), [products])
  const productNameOptions = useMemo(() => Array.from(new Set(products.map(p => p.name).filter(Boolean))), [products])

  // Local storage key
  const STORAGE_KEY = 'inventoryProducts'

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed)
          return
        }
      }
      // Seed data
      const sampleData = [
        { id: 1700000011, name: 'Smartphone X', brand: 'TechBrand', category: 'Electronics', description: 'High-end smartphone', uom: 'Piece', supplier: 'TechSupplier', price: '999' },
        { id: 1700000012, name: 'Office Chair', brand: 'ComfySit', category: 'Furniture', description: 'Ergonomic chair', uom: 'Piece', supplier: 'FurniCo', price: '150' },
        { id: 1700000013, name: 'Cotton T-Shirt', brand: 'FashionX', category: 'Clothing', description: '100% Cotton', uom: 'Piece', supplier: 'ClothMakers', price: '20' },
        { id: 1700000014, name: 'Laptop Pro', brand: 'TechBrand', category: 'Electronics', description: 'Professional laptop', uom: 'Piece', supplier: 'TechSupplier', price: '1200' },
        { id: 1700000015, name: 'Wireless Mouse', brand: 'TechBrand', category: 'Electronics', description: 'Ergonomic mouse', uom: 'Piece', supplier: 'TechSupplier', price: '25' },
        { id: 1700000016, name: 'Mechanical Keyboard', brand: 'KeyMasters', category: 'Electronics', description: 'RGB keyboard', uom: 'Piece', supplier: 'TechSupplier', price: '80' },
        { id: 1700000017, name: 'Standing Desk', brand: 'FurniCo', category: 'Furniture', description: 'Electric standing desk', uom: 'Piece', supplier: 'FurniCo', price: '400' },
        { id: 1700000018, name: 'Leather Sofa', brand: 'LuxLiving', category: 'Furniture', description: '3-seater leather sofa', uom: 'Piece', supplier: 'HomeStyle', price: '900' },
        { id: 1700000019, name: 'Running Shoes', brand: 'Sporty', category: 'Clothing', description: 'Lightweight running shoes', uom: 'Pair', supplier: 'SportSupply', price: '60' },
        { id: 1700000020, name: 'Denim Jeans', brand: 'FashionX', category: 'Clothing', description: 'Classic fit jeans', uom: 'Piece', supplier: 'ClothMakers', price: '45' },
        { id: 1700000021, name: 'Monitor 27"', brand: 'ViewClear', category: 'Electronics', description: '4K monitor', uom: 'Piece', supplier: 'TechSupplier', price: '300' },
        { id: 1700000022, name: 'Webcam', brand: 'ClearCam', category: 'Electronics', description: 'HD webcam', uom: 'Piece', supplier: 'TechSupplier', price: '50' },
        { id: 1700000023, name: 'Headset', brand: 'AudioPro', category: 'Electronics', description: 'Noise cancelling headset', uom: 'Piece', supplier: 'TechSupplier', price: '120' },
        { id: 1700000024, name: 'Printer Paper', brand: 'OfficeSupplies', category: 'Stationery', description: 'A4 paper ream', uom: 'Box', supplier: 'PaperCo', price: '5' },
        { id: 1700000025, name: 'Ballpoint Pens', brand: 'OfficeSupplies', category: 'Stationery', description: 'Blue pens pack', uom: 'Box', supplier: 'PaperCo', price: '3' },
        { id: 1700000026, name: 'Filing Cabinet', brand: 'FurniCo', category: 'Furniture', description: 'Metal filing cabinet', uom: 'Piece', supplier: 'FurniCo', price: '180' },
        { id: 1700000027, name: 'Conference Table', brand: 'FurniCo', category: 'Furniture', description: 'Large meeting table', uom: 'Piece', supplier: 'FurniCo', price: '600' },
        { id: 1700000028, name: 'Winter Jacket', brand: 'FashionX', category: 'Clothing', description: 'Warm winter jacket', uom: 'Piece', supplier: 'ClothMakers', price: '100' },
        { id: 1700000029, name: 'Summer Dress', brand: 'FashionX', category: 'Clothing', description: 'Floral summer dress', uom: 'Piece', supplier: 'ClothMakers', price: '35' },
        { id: 1700000030, name: 'USB-C Cable', brand: 'TechBrand', category: 'Electronics', description: 'Fast charging cable', uom: 'Piece', supplier: 'TechSupplier', price: '10' }
      ]
      setProducts(sampleData)
    } catch (e) {
      console.warn('Failed to load products from localStorage', e)
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
    } catch (e) {
      console.warn('Failed to save products to localStorage', e)
    }
  }, [products])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function onSubmit(e) {
    e.preventDefault()
    const trimmedName = form.name.trim()
    if (!trimmedName) return

    const newProduct = {
      id: Date.now(),
      name: trimmedName,
      brand: form.brand,
      category: form.category,
      description: form.description.trim(),
      uom: form.uom,
      supplier: form.supplier,
      price: form.price ? Number(form.price) : 0,
    }

    setProducts(prev => [newProduct, ...prev])
    setForm({
      name: '',
      brand: '',
      category: categoryOptions[0] || '',
      description: '',
      uom: uomOptions[0] || '',
      supplier: supplierOptions[0] || '',
      price: ''
    })
  }

  function onDelete(id) {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  function onEdit(product) {
    setForm({
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || (categoryOptions[0] || ''),
      description: product.description || '',
      uom: product.uom || (uomOptions[0] || ''),
      supplier: product.supplier || (supplierOptions[0] || ''),
      price: product.price != null ? String(product.price) : ''
    })
    setShowForm(true)
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch (e) { void e }
  }

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !(p.description||'').toLowerCase().includes(q)) return false
      }
      if (filters.category && p.category !== filters.category) return false
      if (filters.supplier && p.supplier !== filters.supplier) return false
      if (filters.uom && p.uom !== filters.uom) return false
      if (filters.minPrice !== '' && (p.price ?? 0) < Number(filters.minPrice)) return false
      if (filters.maxPrice !== '' && (p.price ?? 0) > Number(filters.maxPrice)) return false
      return true
    })
  }, [products, filters])

  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, page, itemsPerPage])

  function clearFilters() { setFilters({ search: '', category: '', supplier: '', uom: '', minPrice: '', maxPrice: '' }) }

  return (
      <div className="space-y-6 pt-4">
        <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
          <div className="relative inline-block">
            <h1 className="text-2xl font-semibold">{labels.title}</h1>
            <span aria-hidden className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" style={{ width: 'calc(100% + 8px)', left: isArabic ? 'auto' : '-4px', right: isArabic ? '-4px' : 'auto', bottom: '-4px' }}></span>
          </div>
          <button className="btn btn-xs bg-green-600 hover:bg-green-500 text-white border-none" onClick={() => setShowForm(true)}>{labels.add}</button>
        </div>

        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FaFilter className="text-blue-500" /> {labels.filter}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAllFilters(prev => !prev)} className="btn btn-ghost btn-xs text-blue-600">
                {showAllFilters ? (isArabic ? 'إخفاء' : 'Hide') : (isArabic ? 'إظهار' : 'Show')} <FaChevronDown className={`transform transition-transform ${showAllFilters ? 'rotate-180' : ''}`} />
              </button>
              <button onClick={clearFilters} className="btn btn-ghost btn-xs text-[var(--muted-text)] hover:text-red-500">
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
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.brand}</label>
              <SearchableSelect options={brandOptions} value={filters.brand} onChange={val=>setFilters(prev=>({...prev, brand: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.name}</label>
              <SearchableSelect options={productNameOptions} value={filters.productName} onChange={val=>setFilters(prev=>({...prev, productName: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.supplier}</label>
              <SearchableSelect options={supplierOptions} value={filters.supplier} onChange={val=>setFilters(prev=>({...prev, supplier: val}))} isRTL={isArabic} />
            </div>
          </div>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-300 overflow-hidden ${showAllFilters ? 'max-h-[200px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.category}</label>
              <SearchableSelect options={categoryOptions} value={filters.category} onChange={val=>setFilters(prev=>({...prev, category: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.uom}</label>
              <SearchableSelect options={uomOptions} value={filters.uom} onChange={val=>setFilters(prev=>({...prev, uom: val}))} isRTL={isArabic} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.price} ({isArabic ? 'من' : 'Min'})</label>
              <input type="number" className="input w-full" value={filters.minPrice} onChange={e=>setFilters(prev=>({...prev, minPrice: e.target.value}))} min="0" step="0.01" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)]">{labels.price} ({isArabic ? 'إلى' : 'Max'})</label>
              <input type="number" className="input w-full" value={filters.maxPrice} onChange={e=>setFilters(prev=>({...prev, maxPrice: e.target.value}))} min="0" step="0.01" />
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <h2 className="text-xl font-medium mb-4">{labels.listTitle}</h2>
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--muted-text)]">{labels.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="nova-table w-full">
                <thead className="thead-soft">
                  <tr className="text-gray-600 dark:text-gray-300">
                    <th className="text-start px-3 min-w-[180px]">{labels.name}</th>
                    <th className="text-start px-3 min-w-[140px]">{labels.category}</th>
                    <th className="text-start px-3 min-w-[120px]">{labels.uom}</th>
                    <th className="text-start px-3 min-w-[160px]">{labels.supplier}</th>
                    <th className="text-center px-3 min-w-[110px]">{labels.price}</th>
                    <th className="text-center px-3 min-w-[110px]">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(p => (
                    <tr key={p.id}>
                      <td className="px-3"><span className="font-medium">{p.name}</span></td>
                      <td className="px-3">{p.category}</td>
                      <td className="px-3">{p.uom}</td>
                      <td className="px-3">{p.supplier}</td>
                      <td className="px-3 text-center">{Number(p.price ?? 0).toFixed(2)}</td>
                      <td className="px-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            type="button"
                            className="btn btn-sm btn-circle bg-blue-600 hover:bg-blue-700 text-white border-none"
                            title={labels.edit}
                            aria-label={labels.edit}
                            onClick={() => onEdit(p)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-circle bg-red-600 hover:bg-red-700 text-white border-none"
                            title={labels.delete}
                            aria-label={labels.delete}
                            onClick={() => onDelete(p.id)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Footer */}
          {filtered.length > 0 && (
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
                  {isArabic ? 'صفحة' : 'Page'} {page} {isArabic ? 'من' : 'of'} {Math.ceil(filtered.length / itemsPerPage)}
                </span>
                <div className="join">
                  <button
                    className="join-item btn btn-sm btn-ghost"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <FaChevronLeft className={isArabic ? 'transform scale-x-[-1]' : ''} />
                  </button>
                  <button
                    className="join-item btn btn-sm btn-ghost"
                    disabled={page === Math.ceil(filtered.length / itemsPerPage)}
                    onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / itemsPerPage), p + 1))}
                  >
                    <FaChevronRight className={isArabic ? 'transform scale-x-[-1]' : ''} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>


        {showForm && (
          <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <div className="absolute inset-0 flex items-start justify-center p-6 md:p-6">
              <div className="card p-4 sm:p-6 mt-4 w-[92vw] sm:w-[80vw] lg:w-[60vw] xl:max-w-3xl">
                <div className={`flex items-center justify-between mb-4`}>
                  <h2 className="text-xl font-medium">{labels.formTitle}</h2>
                  <button type="button" className="btn btn-sm btn-circle bg-white text-red-600 hover:bg-red-50 shadow-md" onClick={() => setShowForm(false)} aria-label={labels.close}>
                    <FaTimes size={20} />
                  </button>
                </div>
                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm mb-1">{labels.name}</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder={labels.name}
                  className="input"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm mb-1">{labels.category}</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  className="input"
                >
                  {categoryOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">{labels.description}</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  placeholder={labels.description}
                  className="input h-24"
                />
              </div>

              {/* Unit of Measure */}
              <div>
                <label className="block text-sm mb-1">{labels.uom}</label>
                <select
                  name="uom"
                  value={form.uom}
                  onChange={onChange}
                  className="input"
                >
                  {uomOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Default Supplier */}
              <div>
                <label className="block text-sm mb-1">{labels.supplier}</label>
                <select
                  name="supplier"
                  value={form.supplier}
                  onChange={onChange}
                  className="input"
                >
                  {supplierOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Default Price */}
              <div>
                <label className="block text-sm mb-1">{labels.price}</label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={onChange}
                  placeholder={labels.price}
                  className="input"
                  min="0"
                  step="0.01"
                />
              </div>

                  <div className={`md:col-span-2 flex gap-2 ${isArabic ? 'justify-start' : 'justify-end'}`}>
                    <button type="submit" className="btn btn-sm bg-green-600 hover:bg-green-500 text-white border-none">
                      {labels.save}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
