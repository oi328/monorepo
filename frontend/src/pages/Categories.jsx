import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import 'jspdf-autotable'
import { api, logExportEvent } from '../utils/api'
import { useAppState } from '../shared/context/AppStateProvider'
import { FaFileImport, FaPlus, FaFileExport, FaFileCsv, FaFilePdf, FaFilter, FaSearch, FaEdit, FaTrash, FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa'
import SearchableSelect from '../components/SearchableSelect'
import CategoriesImportModal from './inventory/CategoriesImportModal'

export default function Categories() {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  const labels = useMemo(() => ({
    title: isArabic ? ' التصنيفات' : ' Categories',
    formTitle: isArabic ? 'بيانات التصنيف' : 'Category Details',
    add: isArabic ? 'إضافة تصنيف' : 'Add Category',
    close: isArabic ? 'إغلاق' : 'Close',
    filter: isArabic ? 'تصفية' : 'Filter',
    search: isArabic ? 'بحث' : 'Search',
    clearFilters: isArabic ? 'إعادة تعيين' : 'Reset',
    name: isArabic ? 'اسم التصنيف' : 'Category Name',
    code: isArabic ? 'الكود' : 'Code',
    appliesTo: isArabic ? 'ينطبق على' : 'Applies To',
    status: isArabic ? 'الحالة' : 'Status',
    offeringsCount: isArabic ? 'عدد العروض' : 'Offerings Count',
    description: isArabic ? 'الوصف' : 'Description',
    save: isArabic ? 'حفظ التصنيف' : 'Save Category',
    listTitle: isArabic ? 'كل التصنيفات' : 'All Categories',
    empty: isArabic ? 'لا توجد تصنيفات بعد' : 'No categories yet',
    actions: isArabic ? 'الإجراءات' : 'Actions',
    delete: isArabic ? 'حذف' : 'Delete',
    edit: isArabic ? 'تعديل' : 'Edit',
    active: isArabic ? 'نشط' : 'Active',
    inactive: isArabic ? 'غير نشط' : 'Inactive',
    all: isArabic ? 'الكل' : 'All',
    product: isArabic ? 'منتج' : 'Product',
    service: isArabic ? 'خدمة' : 'Service',
    subscription: isArabic ? 'اشتراك' : 'Subscription',
    brandName: isArabic ? 'اسم العلامة التجارية' : 'Brand Name',
    productName: isArabic ? 'اسم المنتج' : 'Product Name',
    itemName: isArabic ? 'اسم الصنف' : 'Item Name',
    sku: isArabic ? 'SKU' : 'SKU',
    warehouseName: isArabic ? 'اسم المستودع' : 'Warehouse Name',
    warehouseCode: isArabic ? 'رمز المستودع' : 'Warehouse Code',
    warehouseType: isArabic ? 'نوع المستودع' : 'Warehouse Type',
    supplierName: isArabic ? 'اسم المورد' : 'Supplier Name',
    supplierCode: isArabic ? 'كود المورد' : 'Supplier Code',
    basicInfo: isArabic ? 'البيانات الأساسية' : 'Basic Info',
    scope: isArabic ? 'النطاق' : 'Category Scope',
  }), [isArabic])

  const appliesToOptions = useMemo(() => (
    [ 'Product', 'Service', 'Subscription', 'Package']
  ), [])

  const [form, setForm] = useState({
    id: null,
    name: '',
    appliesTo: 'Product',
    status: 'Active',
    description: ''
  })

  const { user } = useAppState()

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const hasExplicitInventoryPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Inventory')
  const inventoryModulePerms = hasExplicitInventoryPerms && Array.isArray(modulePermissions.Inventory) ? modulePermissions.Inventory : []
  const effectiveInventoryPerms = hasExplicitInventoryPerms ? inventoryModulePerms : []
  const roleLower = String(user?.role || '').toLowerCase()
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'
  const canManageCategories =
    effectiveInventoryPerms.includes('addCategory') ||
    effectiveInventoryPerms.includes('addProducts') ||
    user?.is_super_admin ||
    isTenantAdmin

  const canDeleteInventory =
    user?.is_super_admin ||
    isTenantAdmin ||
    effectiveInventoryPerms.includes('deleteInventory')

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [isFiltering, setIsFiltering] = useState(false)
  const [filters, setFilters] = useState({ 
    search: '', 
    appliesTo: '',
    status: ''
  })

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/item-categories')
      const data = response.data || []
      // Map backend fields to frontend state
      const mapped = data.map(c => ({
        ...c,
        appliesTo: c.applies_to || c.appliesTo || 'Product',
        code: c.code || '',
        status: c.status || 'Active',
        description: c.description || '',
        offeringsCount: typeof c.items_count === 'number' ? c.items_count : 0
      }))
      setCategories(mapped)
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return

    const payload = {
        name,
        applies_to: form.appliesTo, // Map to snake_case
        status: form.status,
        description: form.description
    }

    setLoading(true)
    try {
        if (form.id) {
            await api.put(`/api/item-categories/${form.id}`, payload)
        } else {
            await api.post('/api/item-categories', payload)
        }
        await fetchCategories()
        setShowForm(false)
        setForm({ id: null, name: '', appliesTo: 'Product', status: 'Active', description: '' })
    } catch (error) {
        console.error('Error saving category:', error)
        alert(isArabic ? 'فشل الحفظ' : 'Failed to save')
    } finally {
        setLoading(false)
    }
  }

  async function onDelete(id) {
    if (!canDeleteInventory) {
      alert(isArabic ? 'لا تملك صلاحية حذف التصنيفات' : 'You do not have permission to delete categories')
      return
    }
    if (!window.confirm(isArabic ? 'هل أنت متأكد؟' : 'Are you sure?')) return
    try {
      await api.delete(`/api/item-categories/${id}`)
      await fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert(isArabic ? 'فشل الحذف' : 'Failed to delete')
    }
  }

  function onEdit(cat) { 
    if (!canManageCategories) {
      alert(isArabic ? 'لا تملك صلاحية تعديل التصنيفات' : 'You do not have permission to edit categories')
      return
    }
    setForm({ 
      id: cat.id,
      name: cat.name || '', 
      appliesTo: cat.appliesTo || 'Product',
      status: cat.status || 'Active',
      description: cat.description || '' 
    })
    setShowForm(true)
    setActiveTab('basic')
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch (e) { void e }
  }

  const appliesToFilterOptions = useMemo(() => [ 'Product', 'Service', 'Subscription', 'Package'], [])
  const statusFilterOptions = useMemo(() => [ 'Active', 'Inactive'], [])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const filtered = useMemo(() => {
    return categories.filter(c => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!c.name.toLowerCase().includes(q) && !(c.description || '').toLowerCase().includes(q) && !(c.code || '').toLowerCase().includes(q)) return false
      }
      if (filters.appliesTo && filters.appliesTo !== 'All' && c.appliesTo !== filters.appliesTo) return false
      if (filters.status && filters.status !== 'All' && c.status !== filters.status) return false
      
      return true
    })
  }, [categories, filters])

  function clearFilters() { 
    setIsFiltering(true)
    setFilters({ 
      search: '', 
      appliesTo: '',
      status: ''
    })
    setTimeout(() => setIsFiltering(false), 300)
  }

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage])

  const handleImport = async (importedData) => {
    setLoading(true)
    let successCount = 0
    for (const item of importedData) {
        try {
            await api.post('/api/item-categories', {
                name: item.name,
                code: item.code,
                applies_to: item.appliesTo || 'Product',
                status: item.status || 'Active',
                description: item.description
            })
            successCount++
        } catch (e) {
            console.error('Import error:', e)
        }
    }
    setLoading(false)
    setShowImportModal(false)
    if (successCount > 0) {
        await fetchCategories()
        alert(isArabic ? `تم استيراد ${successCount} تصنيف بنجاح` : `Successfully imported ${successCount} categories`)
    }
  }

  const exportCategoriesCsv = () => {
    const data = filtered.map(c => ({
      ID: c.id,
      Name: c.name,
      Code: c.code,
      AppliesTo: c.appliesTo,
      Status: c.status,
      Description: c.description
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Categories")
    const fileName = "categories.xlsx"
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Categories',
      fileName,
      format: 'xlsx',
    })
    setShowExportMenu(false)
  }

  const exportCategoriesPdf = async () => {
    try {
        const jsPDF = (await import('jspdf')).default
        const autoTable = (await import('jspdf-autotable')).default
        const doc = new jsPDF()
        doc.text("Categories List", 14, 10)
        autoTable(doc, {
        head: [['ID', 'Name', 'Code', 'Applies To', 'Status', 'Description']],
        body: filtered.map(c => [c.id, c.name, c.code, c.appliesTo, c.status, c.description]),
        startY: 20
        })
        doc.save("categories.pdf")
        logExportEvent({
          module: 'Categories',
          fileName: 'categories.pdf',
          format: 'pdf',
        })
        setShowExportMenu(false)
    } catch (e) {
        console.error("PDF Export Error", e)
    }
  }

  return (
      <div className="space-y-6 pt-4 px-4 sm:px-6">
        <div className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative inline-block">
            <h1 className={`page-title text-2xl font-semibold ${isArabic ? 'text-right' : 'text-left'}`}>{labels.title}</h1>
            <span aria-hidden className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" style={{ width: 'calc(100% + 8px)', left: isArabic ? 'auto' : '-4px', right: isArabic ? '-4px' : 'auto', bottom: '-4px' }}></span>
          </div>
          <div className=" w-full lg:w-auto flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">

            {canManageCategories && (
              <button
                className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2"
                onClick={() => setShowImportModal(true)}
              >
              <FaFileImport className="text-white" /> <span className="text-white">{isArabic ? 'استيراد' : 'Import'}</span>
              </button>
            )}
            {canManageCategories && (
              <button className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-green-500 text-white border-none gap-2" onClick={() => { setShowForm(true); setActiveTab('basic'); }}>
                <FaPlus className="text-white" /><span className="text-white">{labels.add}</span>
              </button>
            )}
            <div className="relative  dropdown-container w-full lg:w-auto">
              <button 
                className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <FaFileExport className="text-white" /> <span className="text-white">{isArabic ? 'تصدير' : 'Export'}</span>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <button
                      onClick={exportCategoriesCsv}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                    >
                      <FaFileCsv className="mr-3 text-green-600" /> CSV
                    </button>
                    <button
                      onClick={exportCategoriesPdf}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                    >
                      <FaFilePdf className="mr-3 text-red-600" /> PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6 bg-transparent rounded-2xl filters-compact" style={{ backgroundColor: 'transparent' }}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FaFilter className="text-blue-500" /> {labels.filter}
            </h2>

            <div className="flex items-center gap-2">
              <button onClick={clearFilters} className="px-3 py-1.5 text-sm  dark:text-white hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                {isArabic ? 'إعادة تعيين' : 'Reset'}
              </button>
            </div>
          </div>
          <div className="space-y-4 overflow-x-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaSearch className="text-blue-500" size={10} /> {labels.search}</label>
                <input className="input w-full" value={filters.search} onChange={e=>setFilters(prev=>({...prev, search: e.target.value}))} placeholder={isArabic ? 'بحث...' : 'Search...'} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{labels.appliesTo}</label>
                <SearchableSelect options={appliesToFilterOptions} value={filters.appliesTo} onChange={val=>setFilters(prev=>({...prev, appliesTo: val}))} isRTL={isArabic} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-text)]">{labels.status}</label>
                <SearchableSelect 
                  options={statusFilterOptions} 
                  value={filters.status || 'All'} 
                  onChange={val => setFilters(prev => ({ ...prev, status: val === 'All' ? '' : val }))} 
                  isRTL={isArabic} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <h2 className="text-xl font-medium mb-4">{labels.listTitle}</h2>
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--muted-text)]">{labels.empty}</p>
          ) : (
            <>
            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {paginatedCategories.map(c => (
                <div key={c.id} className=" dark:bg-gray-800/40 dark:backdrop-blur-md p-4 rounded-lg shadow-sm border border-gray-100 dark:border-white/10">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg  dark:text-white">{c.name}</h3>
                      <p className="text-xs font-mono ">{c.code || '-'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${c.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 '}`}>
                      {c.status === 'Active' ? labels.active : labels.inactive}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm  dark:text-white mb-4">
                    <div className="flex justify-between border-b border-gray-100 dark:border-white/10 pb-2">
                      <span className=" dark:text-white">{labels.appliesTo}:</span>
                      <span className="font-medium dark:text-white">{c.appliesTo}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 dark:border-white/10 pb-2">
                      <span className=" dark:text-white">{labels.offeringsCount}:</span>
                      <span className="font-medium dark:text-white">{c.offeringsCount ?? 0}</span>
                    </div>
                     <div className="flex flex-col gap-1 pt-1">
                      <span className=" dark:text-white">{labels.description}:</span>
                      <p className=" dark:text-white text-sm line-clamp-2">{c.description}</p>
                    </div>
                  </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-white/10">
                  {canManageCategories && (
                    <button type="button" className="btn btn-sm btn-ghost text-blue-600 hover:bg-blue-50" onClick={() => onEdit(c)}>
                      <FaEdit size={16} className="mr-1" /> {labels.edit}
                    </button>
                  )}
                  {canDeleteInventory && (
                    <button type="button" className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50" onClick={() => onDelete(c.id)}>
                      <FaTrash size={16} className="mr-1" /> {labels.delete}
                    </button>
                  )}
                </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="nova-table w-full">
                <thead className="thead-soft">
                  <tr className=" hover:bg-gray-700/50 transition-colors group">
                    <th className="text-start px-3 min-w-[120px]">{labels.code || 'Code'}</th>
                    <th className="text-start px-3 min-w-[200px]">{labels.name}</th>
                    <th className="text-start px-3 min-w-[160px]">{labels.appliesTo}</th>
                    <th className="text-start px-3 min-w-[100px]">{labels.status}</th>
                    <th className="text-center px-3 min-w-[120px]">{labels.offeringsCount}</th>
                    <th className="text-start px-3 min-w-[220px]">{labels.description}</th>
                    <th className="text-center px-3 min-w-[110px]">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCategories.map(c => (
                    <tr key={c.id} className=" hover:bg-gray-700/50 transition-colors group">
                      <td className="px-3 text-xs font-mono text-[var(--muted-text)]">{c.code || '-'}</td>
                      <td className="px-3"><span className="font-medium">{c.name}</span></td>
                      <td className="px-3">{c.appliesTo}</td>
                      <td className="px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 '}`}>
                          {c.status === 'Active' ? labels.active : labels.inactive}
                        </span>
                      </td>
                      <td className="px-3 text-center">{c.offeringsCount ?? 0}</td>
                      <td className="px-3">{c.description}</td>
                      <td className="px-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          {canManageCategories && (
                            <button className="text-blue-600 hover:text-blue-800" onClick={() => onEdit(c)}>
                              <FaEdit />
                            </button>
                          )}
                          {canDeleteInventory && (
                            <button className="text-red-600 hover:text-red-800" onClick={() => onDelete(c.id)}>
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}

           {/* Pagination */}
           {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
                <button
                    className="btn btn-sm btn-ghost"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                    <FaChevronLeft />
                </button>
                <span className="text-sm">
                    {currentPage} / {totalPages}
                </span>
                <button
                    className="btn btn-sm btn-ghost"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                    <FaChevronRight />
                </button>
            </div>
           )}
        </div>

        {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="card w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {form.id ? labels.edit : labels.add}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full">
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="form-control">
                  <label className="label text-sm font-medium mb-1">{labels.name} <span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={form.name} onChange={onChange} className="input input-bordered w-full" required />
                </div>
                
                <div className="form-control">
                  <label className="label text-sm font-medium mb-1">{labels.appliesTo}</label>
                  <SearchableSelect options={appliesToOptions} value={form.appliesTo} onChange={val => setForm(prev => ({...prev, appliesTo: val}))} isRTL={isArabic} />
                </div>

                <div className="form-control">
                  <label className="label text-sm font-medium mb-1">{labels.status}</label>
                  <div className="inline-flex rounded-lg border border-gray-700 bg-[#020617] overflow-hidden">
                    <label
                      className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                        form.status === 'Active'
                          ? 'bg-green-500/20 text-green-300 border-r border-gray-700'
                          : 'text-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="Active"
                        checked={form.status === 'Active'}
                        onChange={onChange}
                        className="hidden"
                      />
                      {labels.active}
                    </label>
                    <label
                      className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                        form.status === 'Inactive'
                          ? 'bg-gray-500/20 text-gray-200'
                          : 'text-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="Inactive"
                        checked={form.status === 'Inactive'}
                        onChange={onChange}
                        className="hidden"
                      />
                      {labels.inactive}
                    </label>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label text-sm font-medium mb-1">{labels.description}</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    className="textarea w-full rounded-md border border-gray-600 bg-transparent text-sm text-theme focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows="3"
                  ></textarea>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">{labels.close}</button>
                  <button type="submit" className="btn bg-blue-600 hover:bg-blue-700 text-white border-none" disabled={loading}>
                    {loading ? <span className="loading loading-spinner loading-sm"></span> : labels.save}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <CategoriesImportModal 
            isOpen={showImportModal} 
            onClose={() => setShowImportModal(false)} 
            onImport={handleImport} 
        />
      )}

      </div>
  )
}
