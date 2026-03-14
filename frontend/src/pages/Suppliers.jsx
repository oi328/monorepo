import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { api } from '../utils/api'
import { useAppState } from '../shared/context/AppStateProvider'

export default function Suppliers() {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const isRTL = isArabic

  // Labels & Translations
  const labels = useMemo(() => ({
    title: isArabic ? 'الموردين' : 'Suppliers',
    subtitle: isArabic ? 'إدارة الموردين والخدمات' : 'Manage Suppliers & Services',
    add: isArabic ? 'إضافة مورد' : 'Add Supplier',
    filterAll: isArabic ? 'الكل' : 'All',
    filterProducts: isArabic ? 'منتجات' : 'Products',
    filterServices: isArabic ? 'خدمات' : 'Services',
    companyName: isArabic ? 'اسم الشركة' : 'Company Name',
    contactPerson: isArabic ? 'الشخص المسؤول' : 'Contact Person',
    whatsapp: isArabic ? 'واتساب' : 'WhatsApp',
    email: isArabic ? 'البريد الإلكتروني' : 'Email',
    supplyType: isArabic ? 'نوع التوريد' : 'Supply Type',
    catalogName: isArabic ? 'اسم الكتالوج' : 'Catalog Name',
    serviceDescription: isArabic ? 'وصف الخدمة' : 'Service Description',
    save: isArabic ? 'حفظ' : 'Save',
    cancel: isArabic ? 'إلغاء' : 'Cancel',
    actions: isArabic ? 'إجراءات' : 'Actions',
    viewLinked: isArabic ? 'المرتبطات' : 'Linked Items',
    searchPlaceholder: isArabic ? 'بحث عن مورد...' : 'Search suppliers...',
    typeProduct: isArabic ? 'منتج' : 'Product',
    typeService: isArabic ? 'خدمة' : 'Service',
    typeBoth: isArabic ? 'كلاهما' : 'Both',
    filter: isArabic ? 'تصفية' : 'Filter',
    clearFilters: isArabic ? 'مسح المرشحات' : 'Clear Filters',
    search: isArabic ? 'بحث' : 'Search',
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
  const canManageSuppliers =
    effectiveInventoryPerms.includes('addSuppliers') ||
    user?.is_super_admin ||
    isTenantAdmin

  // State
  const [suppliers, setSuppliers] = useState([])
  const [filterType, setFilterType] = useState('all') // 'all', 'product', 'service'
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // Form State
  const initialForm = {
    companyName: '',
    contactPerson: '',
    whatsapp: '',
    email: '',
    supplyType: 'product', // 'product', 'service', 'both'
    catalogName: '',
    serviceDescription: ''
  }
  const [formData, setFormData] = useState(initialForm)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Load Data
  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/third-parties')
      const data = response.data || []
      
      // Filter only Suppliers if needed, but for now we assume all third-parties are potential suppliers or we filter by type='Supplier'
      // Ideally backend should support ?type=Supplier
      // But let's just map all third parties for now, or filter client side if we strictly want 'Supplier' type
      // The current requirement is just to replace local storage.
      
      const mapped = data.filter(d => d.type === 'Supplier').map(d => ({
        id: d.id,
        companyName: d.name,
        contactPerson: d.contact_person,
        whatsapp: d.phone,
        email: d.email,
        supplyType: d.supply_type || 'product',
        catalogName: d.catalog_name,
        serviceDescription: d.service_description,
        type: d.type // backend type
      }))
      setSuppliers(mapped)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  // Filter Logic
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      // Type Filter
      if (filterType !== 'all') {
        if (filterType === 'product' && s.supplyType === 'service') return false
        if (filterType === 'service' && s.supplyType === 'product') return false
      }
      
      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          s.companyName?.toLowerCase().includes(q) ||
          s.contactPerson?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.whatsapp?.includes(q)
        )
      }
      return true
    })
  }, [suppliers, filterType, searchQuery])

  // Pagination Logic
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage)
  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredSuppliers.slice(start, start + itemsPerPage)
  }, [filteredSuppliers, page, itemsPerPage])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [filterType, searchQuery])

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canManageSuppliers) {
      alert(isArabic ? 'لا تملك صلاحية تعديل الموردين' : 'You do not have permission to modify suppliers')
      return
    }
    setLoading(true)
    
    const payload = {
        name: formData.companyName,
        contact_person: formData.contactPerson,
        phone: formData.whatsapp,
        email: formData.email,
        supply_type: formData.supplyType,
        catalog_name: formData.catalogName,
        service_description: formData.serviceDescription,
        type: 'Supplier' // Force type to Supplier
    }

    try {
        if (editingId) {
            await api.put(`/api/third-parties/${editingId}`, payload)
        } else {
            await api.post('/api/third-parties', payload)
        }
        await fetchSuppliers()
        setShowModal(false)
        resetForm()
    } catch (error) {
        console.error('Error saving supplier:', error)
        alert(isArabic ? 'فشل الحفظ' : 'Failed to save')
    } finally {
        setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!canManageSuppliers) {
      alert(isArabic ? 'لا تملك صلاحية حذف الموردين' : 'You do not have permission to delete suppliers')
      return
    }
    if (window.confirm(isArabic ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this supplier?')) {
      try {
          await api.delete(`/api/third-parties/${id}`)
          await fetchSuppliers()
      } catch (error) {
          console.error('Error deleting supplier:', error)
          alert(isArabic ? 'فشل الحذف' : 'Failed to delete')
      }
    }
  }

  const openEditModal = (supplier) => {
    if (!canManageSuppliers) {
      alert(isArabic ? 'لا تملك صلاحية تعديل الموردين' : 'You do not have permission to edit suppliers')
      return
    }
    setFormData({
      companyName: supplier.companyName || '',
      contactPerson: supplier.contactPerson || '',
      whatsapp: supplier.whatsapp || '',
      email: supplier.email || '',
      supplyType: supplier.supplyType || 'product',
      catalogName: supplier.catalogName || '',
      serviceDescription: supplier.serviceDescription || ''
    })
    setEditingId(supplier.id)
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData(initialForm)
    setEditingId(null)
  }

  const clearFilters = () => {
    setFilterType('all')
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 p-4 sm:p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaLayerGroup className="text-blue-600" />
            {labels.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{labels.subtitle}</p>
        </div>
        {canManageSuppliers && (
          <button 
            onClick={() => { resetForm(); setShowModal(true) }}
            className="btn bg-blue-600 hover:bg-blue-700 text-white border-none gap-2 shadow-lg shadow-blue-500/20"
          >
            <FaPlus /> {labels.add}
          </button>
        )}
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Search */}
        <div className="relative w-full md:w-96 group">
          <FaSearch className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors`} />
          <input 
            type="text" 
            placeholder={labels.searchPlaceholder} 
            className={`input input-bordered w-full ${isRTL ? 'pr-10' : 'pl-10'} bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 transition-all`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {['all', 'product', 'service'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                filterType === type 
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {type === 'all' ? labels.filterAll : type === 'product' ? labels.filterProducts : labels.filterServices}
            </button>
          ))}
        </div>
      </div>

      {/* Suppliers Grid */}
      {paginatedSuppliers.length === 0 ? (
        <div className="text-center py-12">
            <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaSearch className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No suppliers found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
            <button onClick={clearFilters} className="btn btn-ghost btn-sm mt-4 text-blue-600">
                {labels.clearFilters}
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedSuppliers.map(supplier => (
            <div key={supplier.id} className="card bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 group">
              <div className="card-body p-5">
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${
                      supplier.supplyType === 'product' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                      supplier.supplyType === 'service' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                      'bg-gradient-to-br from-teal-500 to-teal-600'
                    }`}>
                      {supplier.companyName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{supplier.companyName}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                        <span className={`w-2 h-2 rounded-full ${
                           supplier.supplyType === 'product' ? 'bg-blue-500' :
                           supplier.supplyType === 'service' ? 'bg-purple-500' :
                           'bg-teal-500'
                        }`}></span>
                        {supplier.supplyType === 'product' ? labels.typeProduct : 
                         supplier.supplyType === 'service' ? labels.typeService : 
                         labels.typeBoth}
                      </p>
                    </div>
                  </div>
                  {canManageSuppliers && (
                    <div className="dropdown dropdown-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <label tabIndex={0} className="btn btn-ghost btn-xs btn-circle">
                        <FaTools className="text-gray-400" />
                      </label>
                      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-white dark:bg-gray-800 rounded-box w-32 border border-gray-100 dark:border-gray-700">
                        <li><a onClick={() => openEditModal(supplier)} className="text-blue-600"><FaEdit size={14} /> {labels.actions}</a></li>
                        <li><a onClick={() => handleDelete(supplier.id)} className="text-red-600"><FaTrash size={14} /> {labels.actions}</a></li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <FaBoxOpen className="text-gray-400" />
                    <span className="font-medium">{supplier.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <FaWhatsapp className="text-green-500 text-lg" />
                    <span className="font-mono dir-ltr">{supplier.whatsapp}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <FaEnvelope className="text-gray-400 text-lg" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                </div>

                {/* Additional Details */}
                {(supplier.catalogName || supplier.serviceDescription) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    {supplier.supplyType !== 'service' && supplier.catalogName && (
                      <div className="text-xs mb-2">
                        <span className="text-gray-400 block mb-1">{labels.catalogName}:</span>
                        <span className="font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                          {supplier.catalogName}
                        </span>
                      </div>
                    )}
                    {supplier.supplyType !== 'product' && supplier.serviceDescription && (
                      <div className="text-xs">
                         <span className="text-gray-400 block mb-1">{labels.serviceDescription}:</span>
                         <p className="text-gray-600 dark:text-gray-300 line-clamp-2">{supplier.serviceDescription}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Actions Footer */}
                {canManageSuppliers && (
                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <button 
                      className="btn btn-xs btn-ghost text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 gap-1"
                      onClick={() => openEditModal(supplier)}
                    >
                      <FaEdit /> {labels.save}
                    </button>
                    <button 
                      className="btn btn-xs btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1"
                      onClick={() => handleDelete(supplier.id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="join">
            <button className="join-item btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <FaChevronLeft />
            </button>
            <button className="join-item btn btn-sm bg-white dark:bg-gray-800 pointer-events-none">
              {labels.page} {page} / {totalPages}
            </button>
            <button className="join-item btn btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? labels.actions : labels.add}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <FaTimes size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label text-xs font-medium text-gray-500">{labels.companyName} <span className="text-red-500">*</span></label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} className="input input-bordered w-full" required />
                </div>
                <div className="form-control">
                  <label className="label text-xs font-medium text-gray-500">{labels.contactPerson}</label>
                  <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="input input-bordered w-full" />
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="form-control">
                  <label className="label text-xs font-medium text-gray-500">{labels.whatsapp}</label>
                  <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="input input-bordered w-full font-mono dir-ltr" placeholder="966..." />
                </div>
                <div className="form-control">
                  <label className="label text-xs font-medium text-gray-500">{labels.email}</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input input-bordered w-full" />
                </div>
              </div>

              {/* Supply Type */}
              <div className="form-control">
                <label className="label text-xs font-medium text-gray-500">{labels.supplyType}</label>
                <div className="flex gap-4 pt-1">
                  {['product', 'service', 'both'].map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg flex-1 justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20">
                      <input 
                        type="radio" 
                        name="supplyType" 
                        value={type} 
                        checked={formData.supplyType === type} 
                        onChange={handleInputChange} 
                        className="radio radio-primary radio-sm" 
                      />
                      <span className="text-sm font-medium capitalize">
                        {type === 'product' ? labels.typeProduct : type === 'service' ? labels.typeService : labels.typeBoth}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Conditional Fields */}
              <div className="space-y-4">
                {formData.supplyType !== 'service' && (
                   <div className="form-control animate-fade-in">
                    <label className="label text-xs font-medium text-gray-500">{labels.catalogName}</label>
                    <input type="text" name="catalogName" value={formData.catalogName} onChange={handleInputChange} className="input input-bordered w-full" placeholder="e.g. Summer Collection 2024" />
                  </div>
                )}
                
                {formData.supplyType !== 'product' && (
                  <div className="form-control animate-fade-in">
                    <label className="label text-xs font-medium text-gray-500">{labels.serviceDescription}</label>
                    <textarea name="serviceDescription" value={formData.serviceDescription} onChange={handleInputChange} className="textarea textarea-bordered w-full h-24" placeholder="Briefly describe the services offered..."></textarea>
                  </div>
                )}
              </div>
            </form>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">{labels.cancel}</button>
              <button type="button" onClick={handleSubmit} className="btn bg-blue-600 hover:bg-blue-700 text-white border-none min-w-[100px]" disabled={loading}>
                {loading ? <span className="loading loading-spinner loading-sm"></span> : labels.save}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
