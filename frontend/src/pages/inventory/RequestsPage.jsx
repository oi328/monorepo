import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import "react-datepicker/dist/react-datepicker.css"
import { api } from '../../utils/api'
import { useTheme } from '../../shared/context/ThemeProvider'
import { 
  FaFileImport, 
  FaPlus, 
  FaShoppingCart, 
  FaEye, 
  FaCheck, 
  FaBan, 
  FaEllipsisV, 
  FaExchangeAlt, 
  FaTrash,
  FaTimes,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa'
import { 
  Filter, 
  ChevronDown, 
  Search, 
  User, 
  DollarSign, 
  Calendar 
} from 'lucide-react'

import SearchableSelect from '../../components/SearchableSelect'
import RequestPreviewModal from '../../components/RequestPreviewModal'
import RequestsImportModal from './RequestsImportModal'
import { useDynamicFields } from '../../hooks/useDynamicFields'
import { useAppState } from '../../shared/context/AppStateProvider'

export default function RequestsPage() {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const isRTL = String(i18n.language || '').startsWith('ar')

  const { fields: dynamicFields } = useDynamicFields('requests')
  const { user, crmSettings } = useAppState()
  const currencySymbol = crmSettings?.defaultCurrency || crmSettings?.default_currency || '$'

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const hasExplicitInventoryPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Inventory')
  const inventoryModulePerms = hasExplicitInventoryPerms && Array.isArray(modulePermissions.Inventory) ? modulePermissions.Inventory : []
  const effectiveInventoryPerms = hasExplicitInventoryPerms ? inventoryModulePerms : []
  const roleLower = String(user?.role || '').toLowerCase()
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'
  const canManageRequests =
    effectiveInventoryPerms.includes('showRequests') ||
    user?.is_super_admin ||
    isTenantAdmin

  const canDeleteInventory =
    user?.is_super_admin ||
    isTenantAdmin ||
    effectiveInventoryPerms.includes('deleteInventory')

  // State
  const [items, setItems] = useState([])
  const [tenantUsers, setTenantUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    product: '',
    quantity: 1,
    price: 0,
    type: 'Inquiry',
    priority: 'Medium',
    description: '',
    payment_plan: ''
  })
  const [saving, setSaving] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null) // For tracking open dropdown menu
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside the menu or the toggle button
      if (
        openMenuId &&
        !event.target.closest('.action-menu-dropdown') &&
        !event.target.closest('.action-menu-btn')
      ) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])


  // Filters
  const [q, setQ] = useState('') // Main search query
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    datePeriod: '',
    customer: '',
    createdBy: '',
    salesPerson: '',
    minTotal: '',
    maxTotal: '',
    minItems: '',
    maxItems: ''
  })
  const [showAllFilters, setShowAllFilters] = useState(false)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Selection
  const [selectedItems, setSelectedItems] = useState([])

  // Helper for success messages
  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  // Load Data
  const load = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch both requests and users
      const [requestsRes, usersRes] = await Promise.all([
        api.get('/api/inventory-requests'),
        api.get('/api/users')
      ])

      const requestsData = requestsRes.data
      const usersData = usersRes.data.data || usersRes.data || []

      setTenantUsers(usersData)

      const mappedItems = (requestsData.data || []).map(item => ({
        ...item,
        customerCode: item.customer_name, // Fallback as we store name in backend
        customerName: item.customer_name,
        customerPhone: item.meta_data?.customer_phone || '',
        // Map flat product/quantity to items array for UI compatibility
        items: item.product ? [{ id: 1, name: item.product, quantity: item.quantity || 0, price: item.meta_data?.price || 0 }] : [],
        total: item.meta_data?.total || 0,
        notes: item.description,
        salesPerson: item.assigned_to,
        createdBy: item.meta_data?.created_by_name || item.created_by_name || '',
        createdAt: item.created_at || new Date().toISOString()
      }))
      setItems(mappedItems)
    } catch (e) {
      console.error(e)
      setError('Failed to load requests')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmitForm = async (e) => {
    e.preventDefault()
    if (!formData.customer_name && !formData.product) {
      alert(isRTL ? 'اسم العميل أو المنتج مطلوب' : 'Customer name or product is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...formData,
        quantity: formData.quantity ? Number(formData.quantity) : null,
        meta_data: {
          price: Number(formData.price || 0),
          total: Number(formData.quantity || 1) * Number(formData.price || 0)
        }
      }
      await api.post('/api/inventory-requests', payload)
      await load()
      showSuccess(isRTL ? 'تم حفظ الطلب بنجاح' : 'Request saved successfully')
      setShowForm(false)
      setFormData({
        customer_name: '',
        customer_phone: '',
        product: '',
        quantity: 1,
        price: 0,
        type: 'Inquiry',
        priority: 'Medium',
        description: '',
        payment_plan: ''
      })
    } catch (e) {
      console.error('Failed to save request', e)
      alert(isRTL ? 'فشل حفظ الطلب' : 'Failed to save request')
    } finally {
      setSaving(false)
    }
  }

  // Filtering Logic
  const customerOptions = useMemo(() => {
    const unique = [...new Set(items.map(i => i.customerName).filter(Boolean))]
    return unique.map(name => ({ value: name, label: name }))
  }, [items])

  const createdByOptions = useMemo(() => {
    const unique = [...new Set(items.map(i => i.createdBy).filter(Boolean))]
    return unique.map(name => ({ value: name, label: name }))
  }, [items])

  const salesPersonOptions = useMemo(() => {
    return tenantUsers.map(u => ({ value: u.name, label: u.name }))
  }, [tenantUsers])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search
      if (q) {
        const query = q.toLowerCase()
        const match =
          item.id?.toLowerCase().includes(query) ||
          item.customerCode?.toLowerCase().includes(query) ||
          item.customerName?.toLowerCase().includes(query)
        if (!match) return false
      }

      // Filters
      if (filters.dateFrom) {
        if (new Date(item.createdAt) < new Date(filters.dateFrom)) return false
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo)
        endDate.setDate(endDate.getDate() + 1)
        if (new Date(item.createdAt) >= endDate) return false
      }

      if (filters.customer && item.customerName !== filters.customer) return false
      if (filters.createdBy && item.createdBy !== filters.createdBy) return false
      if (filters.salesPerson && item.salesPerson !== filters.salesPerson) return false
      if (filters.minTotal && Number(item.total) < Number(filters.minTotal)) return false
      if (filters.maxTotal && Number(item.total) > Number(filters.maxTotal)) return false

      // Items Count Filter
      const itemsCount = Array.isArray(item.items) ? item.items.length : 0
      if (filters.minItems && itemsCount < Number(filters.minItems)) return false
      if (filters.maxItems && itemsCount > Number(filters.maxItems)) return false

      return true
    })
  }, [items, q, filters])

  // Pagination Logic
  const paginatedItems = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      if (aVal === bVal) return 0
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1
      return aVal < bVal ? 1 : -1
    })

    return sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filteredItems, sortBy, sortOrder, currentPage, itemsPerPage])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(paginatedItems.map(i => i.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectRow = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleApprove = async (id) => {
    if (window.confirm(isRTL ? 'هل أنت متأكد من الموافقة على هذا الطلب؟' : 'Are you sure you want to approve this request?')) {
      try {
        await api.put(`/api/inventory-requests/${id}`, { status: 'Approved' })
        setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'Approved' } : i))
        showSuccess(isRTL ? 'تمت الموافقة على الطلب بنجاح' : 'Request approved successfully')
      } catch (e) {
        console.error(e)
        alert('Failed to approve request')
      }
    }
  }

  const handleReject = async (id) => {
    if (window.confirm(isRTL ? 'هل أنت متأكد من رفض هذا الطلب؟' : 'Are you sure you want to reject this request?')) {
      try {
        await api.put(`/api/inventory-requests/${id}`, { status: 'Rejected' })
        setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'Rejected' } : i))
        showSuccess(isRTL ? 'تم رفض الطلب بنجاح' : 'Request rejected successfully')
      } catch (e) {
        console.error(e)
        alert('Failed to reject request')
      }
    }
  }

  const handleDelete = async (id) => {
    if (!canDeleteInventory) {
      alert(isRTL ? 'لا تملك صلاحية حذف الطلبات' : 'You do not have permission to delete requests')
      return
    }
    if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا الطلب؟' : 'Are you sure you want to delete this request?')) {
      try {
        await api.delete(`/api/inventory-requests/${id}`)
        setItems(prev => prev.filter(i => i.id !== id))
        showSuccess(isRTL ? 'تم حذف الطلب بنجاح' : 'Request deleted successfully')
      } catch (e) {
        console.error(e)
        alert('Failed to delete request')
      }
    }
  }

  const handleConvertToQuotation = async (item) => {
    if (window.confirm(isRTL ? 'هل تريد تحويل هذا الطلب إلى عرض سعر؟' : 'Convert this request to quotation?')) {
      try {
        setLoading(true)
        // 1. Find or Create Customer
        let customerId = null
        try {
          const { data: customersData } = await api.get(`/api/customers?search=${encodeURIComponent(item.customerName)}`)
          const existing = customersData.data ? customersData.data[0] : (customersData[0] || null)

          if (existing) {
            customerId = existing.id
          } else {
            // Create new customer
            const newCustomerRes = await api.post('/api/customers', {
              name: item.customerName,
              phone: item.customerPhone || '',
              source: 'Converted Request',
              status: 'Active',
              type: 'Individual',
              notes: `Auto-created from Request ${item.id}`
            })
            customerId = newCustomerRes.data.id
          }
        } catch (err) {
          console.error('Error handling customer:', err)
          alert('Failed to find or create customer')
          setLoading(false)
          return
        }

        // 2. Prepare Quotation Data
        const subtotal = (item.items || []).reduce((acc, it) => acc + (it.quantity * it.price), 0)
        const tax = subtotal * 0.14
        const total = subtotal + tax

        const quotationData = {
          customer_id: customerId,
          customer_name: item.customerName,
          status: 'Draft',
          date: new Date().toISOString().split('T')[0],
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: item.items || [],
          notes: `Converted from Request ${item.id}. ${item.notes || ''}`,
          subtotal: subtotal,
          total: total,
          sales_person: item.salesPerson || user?.name || '',
          meta_data: {
            converted_from_request_id: item.id,
            customer_phone: item.customerPhone
          }
        }

        await api.post('/api/quotations', quotationData)

        // 3. Update Request Status
        await api.put(`/api/inventory-requests/${item.id}`, { status: 'Converted' })

        const updatedItems = items.map(i => i.id === item.id ? { ...i, status: 'Converted' } : i)
        setItems(updatedItems)

        showSuccess(isRTL ? 'تم التحويل إلى عرض سعر بنجاح' : 'Converted to Quotation successfully')
      } catch (e) {
        console.error('Failed to convert to quotation', e)
        alert('Failed to convert to quotation')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleImport = async (rows) => {
    setLoading(true)
    let successCount = 0
    for (const row of rows) {
      try {
        const price = Number(row['Price'] || row['السعر']) || 0
        const quantity = Number(row['Quantity'] || row['الكمية']) || 1
        
        const payload = {
          customer_name: row['Customer Name'] || row['اسم العميل'],
          customer_phone: row['Customer Phone'] || row['رقم الهاتف'],
          product: row['Product'] || row['المنتج'],
          quantity: quantity,
          price: price,
          priority: row['Priority'] || row['الأولوية'] || 'Medium',
          type: row['Type'] || row['نوع الطلب'] || 'Inquiry',
          payment_plan: row['Payment Plan'] || row['خطة الدفع'] || '',
          description: row['Notes'] || row['ملاحظات'] || '',
          meta_data: {
             price: price,
             total: quantity * price
          }
        }
        
        // Skip empty rows
        if (!payload.customer_name) continue

        await api.post('/api/inventory-requests', payload)
        successCount++
      } catch (e) {
        console.error('Import error', e)
      }
    }
    
    setLoading(false)
    setShowImportModal(false)
    if (successCount > 0) {
      showSuccess(isRTL ? `تم استيراد ${successCount} طلب بنجاح` : `Successfully imported ${successCount} requests`)
      await load()
    } else {
      alert(isRTL ? 'فشل الاستيراد' : 'Import failed')
    }
  }

  const clearFilters = () => {
    setQ('')
    setFilters({
      dateFrom: '',
      dateTo: '',
      datePeriod: '',
      customer: '',
      createdBy: '',
      minTotal: '',
      maxTotal: '',
      minItems: '',
      maxItems: ''
    })
  }

  const handleDatePeriodChange = (period) => {
    const now = new Date()
    let from = ''
    let to = ''

    if (period === 'today') {
      from = now.toISOString().split('T')[0]
      to = now.toISOString().split('T')[0]
    } else if (period === 'week') {
      const first = new Date(now.setDate(now.getDate() - now.getDay()))
      const last = new Date(now.setDate(now.getDate() - now.getDay() + 6))
      from = first.toISOString().split('T')[0]
      to = last.toISOString().split('T')[0]
    } else if (period === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      from = first.toISOString().split('T')[0]
      to = last.toISOString().split('T')[0]
    }

    setFilters(prev => ({
      ...prev,
      datePeriod: period,
      dateFrom: from,
      dateTo: to
    }))
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="rounded-xl p-4 md:p-6 relative mb-6">
        <div className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3">
            <div className="relative flex flex-col items-start gap-1">
              <h1 className={`text-xl md:text-2xl font-bold text-start ${isLight ? 'text-black' : 'text-white'} dark:text-white flex items-center gap-2`}>
                {t('Order Requests')}
                <span className="text-sm font-normal text-[var(--muted-text)] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  {filteredItems.length}
                </span>
              </h1>
              <span aria-hidden="true" className="inline-block h-[2px] w-full rounded bg-gradient-to-r from-blue-500 to-purple-600" />
              <p className="text-sm text-[var(--muted-text)] mt-1">
                {isRTL ? 'إدارة طلبات الشراء' : 'Manage your order requests'}
              </p>
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
            {canManageRequests && (
            <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 !text-white border-none flex items-center justify-center gap-2"
            >
              <FaFileImport />
              {isRTL ? 'استيراد' : 'Import'}
            </button>
            )}

            {canManageRequests && (
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-green-500 !text-white border-none flex items-center justify-center gap-2"
              >
                <FaPlus />
                {isRTL ? 'إضافة طلب' : 'Add Request'}
              </button>
            )}
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-3 p-3 rounded border border-green-300 bg-green-50 text-green-700">{successMessage}</div>
      )}

      {/* Filter Section - Identical structure to SalesQuotations */}
      <div className="glass-panel p-4 rounded-xl mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className={`text-sm font-semibold flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'} `}>
            <Filter className="text-blue-500" size={16} /> {isRTL ? 'تصفية' : 'Filter'}
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setShowAllFilters(prev => !prev)}
              className="flex items-center gap-1.2 px-2.5 py-1.5 text-[11px] md:text-sm font-medium text-blue-600 bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-all border border-blue-100 dark:border-blue-800"
            >
              {showAllFilters ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض الكل' : 'Show All')}
              <ChevronDown size={14} className={`transform transition-transform ${showAllFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={clearFilters}
              className="px-2.5 py-1.5 text-[11px] md:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            >
              {isRTL ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Primary Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* 1. SEARCH */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <Search className="text-blue-500" size={10} /> {isRTL ? 'بحث عام' : 'Search All Data'}
            </label>
            <input
              className="input w-full"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={isRTL ? 'بحث في الطلبات...' : 'Search requests...'}
            />
          </div>

          {/* 2. Lead Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <User className="text-blue-500" size={10} /> {isRTL ? ' العميل ' : 'customer'}
            </label>
            <SearchableSelect
              options={customerOptions}
              value={filters.customer}
              onChange={(val) => setFilters(prev => ({ ...prev, customer: val }))}
              placeholder={isRTL ? 'اختر العميل...' : 'Select Lead...'}
              isRTL={isRTL}
            />
          </div>

          {/* 3. Items Count Range */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <FaShoppingCart className="text-blue-500" size={10} /> {isRTL ? 'عدد العناصر' : 'No. of Items'}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                className="input w-full text-xs"
                placeholder={isRTL ? 'من' : 'Min'}
                value={filters.minItems}
                onChange={e => setFilters(prev => ({ ...prev, minItems: e.target.value }))}
              />
              <input
                type="number"
                className="input w-full text-xs"
                placeholder={isRTL ? 'إلى' : 'Max'}
                value={filters.maxItems}
                onChange={e => setFilters(prev => ({ ...prev, maxItems: e.target.value }))}
              />
            </div>
          </div>

          {/* 4. Total Range */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <DollarSign className="text-blue-500" size={10} /> {isRTL ? 'المبلغ الإجمالي' : 'Total Amount'}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                className="input w-full text-xs"
                placeholder={isRTL ? 'من' : 'Min'}
                value={filters.minTotal}
                onChange={e => setFilters(prev => ({ ...prev, minTotal: e.target.value }))}
              />
              <input
                type="number"
                className="input w-full text-xs"
                placeholder={isRTL ? 'إلى' : 'Max'}
                value={filters.maxTotal}
                onChange={e => setFilters(prev => ({ ...prev, maxTotal: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {showAllFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[var(--card-border)]">
            {/* 5. Created By */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
                <User className="text-blue-500" size={10} /> {isRTL ? 'بواسطة' : 'Created By'}
              </label>
              <SearchableSelect
                options={createdByOptions}
                value={filters.createdBy}
                onChange={(val) => setFilters(prev => ({ ...prev, createdBy: val }))}
                placeholder={isRTL ? 'اختر...' : 'Select...'}
                isRTL={isRTL}
              />
            </div>

            {/* 6. Sales Person */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
                <User className="text-blue-500" size={10} /> {isRTL ? 'مندوب المبيعات' : 'Sales Person'}
              </label>
              <SearchableSelect
                options={salesPersonOptions}
                value={filters.salesPerson}
                onChange={(val) => setFilters(prev => ({ ...prev, salesPerson: val }))}
                placeholder={isRTL ? 'اختر...' : 'Select...'}
                isRTL={isRTL}
              />
            </div>

            {/* 7. Date Range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
                <Calendar className="text-blue-500" size={10} /> {isRTL ? 'التاريخ من' : 'Date From'}
              </label>
              <input
                type="date"
                className="input w-full"
                value={filters.dateFrom}
                onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
                <Calendar className="text-blue-500" size={10} /> {isRTL ? 'التاريخ إلى' : 'Date To'}
              </label>
              <input
                type="date"
                className="input w-full"
                value={filters.dateTo}
                onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>

            {/* 8. Period Buttons */}
            <div className="col-span-1 md:col-span-2 lg:col-span-4 flex gap-2 mt-2">
              {['today', 'week', 'month'].map(period => (
                <button
                  key={period}
                  onClick={() => handleDatePeriodChange(period)}
                  className={`px-3 py-1 text-xs rounded-full border ${filters.datePeriod === period
                    ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                    }`}
                >
                  {isRTL
                    ? (period === 'today' ? 'اليوم' : period === 'week' ? 'هذا الأسبوع' : 'هذا الشهر')
                    : (period.charAt(0).toUpperCase() + period.slice(1))
                  }
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table Section - Identical structure to SalesQuotations */}
      <div className="hidden md:block card p-0 overflow-hidden border border-[var(--card-border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`bg-gray-700/50 ${isLight ? 'text-black' : 'text-white'}  text-[var(--muted-text)] font-medium border-b border-[var(--card-border)]`}>
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={paginatedItems.length > 0 && selectedItems.length === paginatedItems.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="p-4 cursor-pointer hover:text-blue-600" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-1">
                    {isRTL ? 'رقم الطلب' : 'Request ID'}
                    {sortBy === 'id' && <ChevronDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-blue-600" onClick={() => handleSort('customerName')}>
                  <div className="flex items-center gap-1">
                    {isRTL ? ' العميل ' : 'Customer'}
                    {sortBy === 'customerName' && <ChevronDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
                  </div>
                </th>
                {/* Dynamic Headers */}
                {dynamicFields.map(field => (
                  <th key={field.key} className="p-4" style={{ minWidth: '120px' }}>
                    {isRTL ? field.label_ar : field.label_en}
                  </th>
                ))}
                <th className="p-4 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="p-4 text-center">{isRTL ? 'العناصر' : 'Items'}</th>
                <th className="p-4 text-end cursor-pointer hover:text-blue-600" onClick={() => handleSort('total')}>
                  <div className="flex items-center justify-end gap-1">
                    {isRTL ? 'الإجمالي' : 'Total'}
                    {sortBy === 'total' && <ChevronDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
                  </div>
                </th>
                <th className="p-4">{isRTL ? 'الملاحظات' : 'Notes'}</th>
                <th className="p-4">{isRTL ? 'بواسطة' : 'Created By'}</th>
                <th className="p-4">{isRTL ? 'التاريخ' : 'Date'}</th>
                <th className="p-4 whitespace-nowrap min-w-[280px]">
                  {isRTL ? 'إجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {loading ? (
                <tr>
                  <td colSpan={11 + dynamicFields.length} className="p-8 text-center text-[var(--muted-text)]">
                    {isRTL ? 'جاري التحميل...' : 'Loading...'}
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={11 + dynamicFields.length} className="p-8 text-center text-[var(--muted-text)]">
                    {isRTL ? 'لا توجد طلبات مطابقة' : 'No matching requests found'}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-700/50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                      />
                    </td>
                    <td className="p-4 font-medium text-blue-600">
                      {item.id}
                    </td>
                    <td className="p-4 font-medium">
                      {item.customerName}
                    </td>
                    {/* Dynamic Cells */}
                    {dynamicFields.map(field => (
                      <td key={field.key} className="p-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.custom_fields?.[field.key] || '-'}
                      </td>
                    ))}
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        item.status === 'Converted' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          item.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-gray-100 dark:bg-gray-800 text-[var(--muted-text)] px-2 py-1 rounded text-xs">
                        {Array.isArray(item.items) ? item.items.length : 0}
                      </span>
                    </td>
                    <td className="p-4 text-end font-mono font-medium">
                      {Number(item.total).toLocaleString()} {currencySymbol}
                    </td>
                    <td className="p-4 text-sm text-[var(--muted-text)] max-w-[200px] truncate" title={item.notes}>
                      {item.notes || '-'}
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.salesPerson}</span>
                        <span className="text-xs text-[var(--muted-text)]">{item.createdBy}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[var(--muted-text)]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2 relative">
                        {/* Primary Actions (3 buttons) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewItem(item)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium  text-blue-600 hover:bg-blue-100 bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors shadow-sm"
                          title={isRTL ? 'معاينة' : 'Preview'}
                        >
                          <FaEye size={14} />
                          <span className="hidden xl:inline">{isRTL ? 'معاينة' : 'Preview'}</span>
                        </button>

                        {item.status === 'Pending' ? (
                          <>
                            {canDeleteInventory && (<button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleApprove(item.id)
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors shadow-sm"
                              title={isRTL ? 'موافقة' : 'Approve'}
                            >
                              <FaCheck size={14} />
                              <span className="hidden xl:inline">{isRTL ? 'موافقة' : 'Approve'}</span>
                            </button>)}

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReject(item.id)
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 transition-colors shadow-sm"
                              title={isRTL ? 'رفض' : 'Reject'}
                            >
                              <FaBan size={14} />
                              <span className="hidden xl:inline">{isRTL ? 'رفض' : 'Reject'}</span>
                            </button>

                            {/* More Actions Menu */}
                            <div className="relative shrink-0">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  if (openMenuId === item.id) {
                                    setOpenMenuId(null)
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    setMenuPos({
                                      top: rect.bottom + 5,
                                      left: isRTL ? rect.left : rect.right - 192
                                    })
                                    setOpenMenuId(item.id)
                                  }
                                }}
                                className="action-menu-btn flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 transition-colors"
                              >
                                <FaEllipsisV size={14} />
                              </button>

                              {openMenuId === item.id && createPortal(
                                <div
                                  className="action-menu-dropdown fixed z-[9999] w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                                  style={{
                                    top: menuPos.top,
                                    left: menuPos.left
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {canDeleteInventory && (<button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleConvertToQuotation(item)
                                      setOpenMenuId(null)
                                    }}
                                    className="w-full text-start px-4 py-3 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-3 transition-colors"
                                  >
                                    <FaExchangeAlt size={16} />
                                    <span className="font-medium">{isRTL ? 'تحويل لعرض سعر' : 'Convert to Quotation'}</span>
                                  </button>)}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDelete(item.id)
                                      setOpenMenuId(null)
                                    }}
                                    className="w-full text-start px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 border-t border-gray-100 dark:border-gray-700 transition-colors"
                                  >
                                    <FaTrash size={16} />
                                    <span className="font-medium">{isRTL ? 'حذف' : 'Delete'}</span>
                                  </button>
                                </div>,
                                document.body
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {item.status === 'Approved' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleConvertToQuotation(item)
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 transition-colors shadow-sm"
                                title={isRTL ? 'تحويل لعرض سعر' : 'Convert to Quotation'}
                              >
                                <FaExchangeAlt size={14} />
                                <span className="hidden xl:inline">{isRTL ? 'تحويل' : 'Convert'}</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(item.id)
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors shadow-sm"
                              title={isRTL ? 'حذف' : 'Delete'}
                            >
                              <FaTrash size={14} />
                              <span className="hidden xl:inline">{isRTL ? 'حذف' : 'Delete'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div >

      {/* Mobile Cards View */}
      < div className="md:hidden grid grid-cols-1 gap-4 mt-4" >
        {
          loading ? (
            <div className="p-8 text-center text-[var(--muted-text)]" >
              {isRTL ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted-text)]">
              {isRTL ? 'لا توجد طلبات مطابقة' : 'No matching requests found'}
            </div>
          ) : (
            paginatedItems.map((item) => (
              <div key={item.id} className="card bg-white dark:bg-gray-800 p-4 rounded-xl border border-[var(--card-border)] shadow-sm space-y-3">
                {/* Header: ID and Status */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-xs text-blue-600 font-mono">#{item.id}</span>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">{item.customerName}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    item.status === 'Converted' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      item.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                    {item.status}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex flex-col">
                    <span className="text-xs text-[var(--muted-text)]">{isRTL ? 'الإجمالي' : 'Total'}</span>
                    <span className="font-mono font-medium">{Number(item.total).toLocaleString()} {currencySymbol}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[var(--muted-text)]">{isRTL ? 'العناصر' : 'Items'}</span>
                    <span>{Array.isArray(item.items) ? item.items.length : 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[var(--muted-text)]">{isRTL ? 'التاريخ' : 'Date'}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[var(--muted-text)]">{isRTL ? 'بواسطة' : 'By'}</span>
                    <span>{item.salesPerson}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--card-border)] mt-auto">
                  {canDeleteInventory && (<button
                    onClick={() => setPreviewItem(item)}
                    className="flex-1 btn btn-xs h-9 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-900/30 flex items-center justify-center gap-1.5 rounded-lg transition-colors"
                  >
                    <FaEye size={12} /> {isRTL ? 'معاينة' : 'Preview'}
                  </button>)}
                  {(item.status === 'Pending' || item.status === 'Inquiry') && (
                    <>
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="w-10 h-9 flex items-center justify-center bg-green-50 text-green-600 border border-green-100 hover:bg-green-100 dark:bg-green-900/10 dark:text-green-400 dark:border-green-900/30 rounded-lg transition-colors"
                        title={isRTL ? 'موافقة' : 'Approve'}
                      >
                        <FaCheck size={12} />
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        className="w-10 h-9 flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30 rounded-lg transition-colors"
                        title={isRTL ? 'رفض' : 'Reject'}
                      >
                        <FaBan size={12} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleConvertToQuotation(item)}
                    className="w-10 h-9 flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100 dark:bg-purple-900/10 dark:text-purple-400 dark:border-purple-900/30 rounded-lg transition-colors"
                    title={isRTL ? 'تحويل لعرض سعر' : 'Convert to Quotation'}
                  >
                    <FaExchangeAlt size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="w-10 h-9 flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30 rounded-lg transition-colors"
                    title={isRTL ? 'حذف' : 'Delete'}
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>
            ))
          )
        }
      </div >

      {/* Pagination Footer */}
      {
        filteredItems.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between rounded-xl p-2 border border-gray-100 dark:border-gray-700  gap-4">
            <div className="text-xs text-theme">
              {isRTL
                ? `عرض ${(currentPage - 1) * itemsPerPage + 1} إلى ${Math.min(currentPage * itemsPerPage, filteredItems.length)} من ${filteredItems.length} صنف`
                : `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, filteredItems.length)} of ${filteredItems.length} items`
              }
            </div>

            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                title={isRTL ? 'السابق' : 'Prev'}
              >
                <FaChevronLeft className={isRTL ? 'scale-x-[-1]' : ''} />
              </button>
              <span className="text-sm whitespace-nowrap text-theme">
                {isRTL
                  ? `الصفحة ${currentPage} من ${Math.ceil(filteredItems.length / itemsPerPage)}`
                  : `Page ${currentPage} of ${Math.ceil(filteredItems.length / itemsPerPage)}`
                }
              </span>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredItems.length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(filteredItems.length / itemsPerPage)}
                title={isRTL ? 'التالي' : 'Next'}
              >
                <FaChevronRight className={isRTL ? 'scale-x-[-1]' : ''} />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{isRTL ? 'لكل صفحة:' : 'Per page:'}</span>
              <select
                className="select select-bordered select-sm w-18 text-xs py-0 px-2 h-8 min-h-0"
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
        )
      }

      {
        showForm && (
          <div className="fixed inset-0 z-[200]">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />
            <div className="absolute inset-0 flex items-start justify-center p-4 md:p-6">
              <div className="card w-full max-w-xl mt-10 max-h-[85vh] overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <h2 className={`text-lg font-semibold ${isLight ? 'text-black' : 'text-white'}`}>
                    {isRTL ? 'إضافة طلب جديد' : 'Add New Request'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-red-600 hover:bg-red-50 shadow-md"
                  >
                    <FaTimes size={18} />
                  </button>
                </div>
                <form onSubmit={handleSubmitForm} className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                        {isRTL ? 'اسم العميل' : 'Customer Name'}
                      </label>
                      <input
                        name="customer_name"
                        value={formData.customer_name}
                        onChange={handleFormChange}
                        className="input w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                        {isRTL ? 'رقم الهاتف' : 'Customer Phone'}
                      </label>
                      <input
                        name="customer_phone"
                        value={formData.customer_phone}
                        onChange={handleFormChange}
                        className="input w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                        {isRTL ? 'المنتج / البند' : 'Product / Item'}
                      </label>
                      <input
                        name="product"
                        value={formData.product}
                        onChange={handleFormChange}
                        className="input w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                        {isRTL ? 'الكمية' : 'Quantity'}
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleFormChange}
                        className="input w-full"
                        min="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                        {isRTL ? 'السعر' : 'Price'}
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleFormChange}
                        className="input w-full"
                        min="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                        {isRTL ? 'الأولوية' : 'Priority'}
                      </label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleFormChange}
                        className="input w-full"
                      >
                        <option value="Low">{isRTL ? 'منخفضة' : 'Low'}</option>
                        <option value="Medium">{isRTL ? 'متوسطة' : 'Medium'}</option>
                        <option value="High">{isRTL ? 'مرتفعة' : 'High'}</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                        {isRTL ? 'نوع الطلب' : 'Request Type'}
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleFormChange}
                        className="input w-full"
                      >
                        <option value="Inquiry">{isRTL ? 'استعلام' : 'Inquiry'}</option>
                        <option value="Booking">{isRTL ? 'حجز' : 'Booking'}</option>
                        <option value="Maintenance">{isRTL ? 'صيانة' : 'Maintenance'}</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                        {isRTL ? 'خطة الدفع' : 'Payment Plan'}
                      </label>
                      <input
                        name="payment_plan"
                        value={formData.payment_plan}
                        onChange={handleFormChange}
                        className="input w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={`text-xs font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                      {isRTL ? 'ملاحظات' : 'Notes'}
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      className="textarea w-full h-20"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="btn btn-ghost btn-sm"
                    >
                      {isRTL ? 'إغلاق' : 'Close'}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm bg-green-600 hover:bg-green-500 text-white border-none"
                      disabled={saving}
                    >
                      {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ الطلب' : 'Save Request')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      <RequestsImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      <RequestPreviewModal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        request={previewItem}
      />
    </div >
  )
}
