import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { FaDownload, FaFileImport, FaPlus, FaFileInvoiceDollar, FaComment, FaTrash, FaEdit, FaEye, FaEnvelope, FaSearch, FaPhone, FaEllipsisV, FaShoppingCart } from 'react-icons/fa'
import { Filter, ChevronDown, Search, Calendar } from 'lucide-react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { api, logExportEvent, logImportEvent } from '../utils/api'
import { useTheme } from '../shared/context/ThemeProvider'
import { useAppState } from '../shared/context/AppStateProvider'
import SearchableSelect from '../shared/components/SearchableSelect'
import CustomersFormModal from '../components/CustomersFormModal'
import CustomersImportModal from '../components/CustomersImportModal'
import CustomerDetailsModal from '../components/CustomerDetailsModal'
import QuotationsFormModal from '../components/QuotationsFormModal'
import SalesOrdersFormModal from '../components/SalesOrdersFormModal'

import { useDynamicFields } from '../hooks/useDynamicFields'
import * as XLSX from 'xlsx'

export const Customers = () => {
  const { t, i18n } = useTranslation()
  const routeParams = useParams()
  const [searchParams] = useSearchParams()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { user } = useAppState()
  const isRTL = String(i18n.language || '').startsWith('ar')
  const { fields: dynamicFields } = useDynamicFields('customers')

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const customerModulePerms = Array.isArray(modulePermissions.Customers) ? modulePermissions.Customers : []

  const effectiveCustomerPerms = customerModulePerms.length ? customerModulePerms : (() => {
    const role = user?.role || ''
    if (role === 'Sales Admin') return ['convertFromLead', 'addCustomer', 'showModule']
    if (role === 'Operation Manager') return ['editInfo', 'showModule']
    if (role === 'Branch Manager') return ['addCustomer', 'editInfo', 'showModule']
    if (role === 'Director') return ['convertFromLead', 'addCustomer', 'editInfo', 'showModule']
    if (role === 'Sales Manager') return ['convertFromLead', 'addCustomer', 'editInfo', 'showModule']
    if (role === 'Team Leader') return ['editInfo', 'showModule']
    if (role === 'Sales Person') return ['showModule']
    if (role === 'Customer Manager') return ['convertFromLead', 'addCustomer', 'editInfo', 'deleteCustomer', 'showModule']
    if (role === 'Customer Team Leader') return ['editInfo', 'showModule']
    if (role === 'Customer Agent') return ['showModule']
    return []
  })()

  const roleLower = String(user?.role || '').toLowerCase()
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'

  const canViewCustomersModule =
    effectiveCustomerPerms.includes('showModule') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  const canAddCustomer =
    effectiveCustomerPerms.includes('addCustomer') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  const canEditCustomer =
    effectiveCustomerPerms.includes('editInfo') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  const canDeleteCustomer =
    effectiveCustomerPerms.includes('deleteCustomer') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  const deepLinkCustomerId = routeParams?.id || searchParams?.get('open') || null

  // State
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [detailsModalTab, setDetailsModalTab] = useState('details')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeRowId, setActiveRowId] = useState(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, aboveTop: 0 })
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [openDropdownAbove, setOpenDropdownAbove] = useState(false)
  const [usersList, setUsersList] = useState([])
  const openedDeepLinkRef = useRef(null)

  // Notes Modal State (Removed)

  // const [showNoteModal, setShowNoteModal] = useState(false)
  // const [currentNoteItem, setCurrentNoteItem] = useState(null)
  // const [noteContent, setNoteContent] = useState('')

  // Quotation & Sales Order Modal State
  const [showQuotationModal, setShowQuotationModal] = useState(false)
  const [showSalesOrderModal, setShowSalesOrderModal] = useState(false)
  const [targetCustomer, setTargetCustomer] = useState(null)

  // Filters
  const [q, setQ] = useState('') // Main search query
  const [filters, setFilters] = useState({
    type: '',
    source: '',
    country: '',
    city: '',
    assignedSalesRep: [], // Changed to array for multi-select
    createdBy: '',
    dateFrom: '',
    dateTo: '',
    datePeriod: '' // 'today', 'week', 'month', 'custom'
  })
  const [showAllFilters, setShowAllFilters] = useState(false)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [pageSearch, setPageSearch] = useState('')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Selection
  const [selectedItems, setSelectedItems] = useState([])
  
  // View Mode (Fixed/Floating Actions)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('customersViewMode') || 'floating')

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdownId) {
        console.log('Click outside detected, closing dropdown')
        setOpenDropdownId(null)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openDropdownId])

  const toggleViewMode = () => {
    const newMode = viewMode === 'floating' ? 'static' : 'floating'
    setViewMode(newMode)
    localStorage.setItem('customersViewMode', newMode)
  }

  // Helper for success messages
  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  // Load Data (server-side filters)
  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams()
      params.set('per_page', itemsPerPage)
      params.set('sort_by', sortBy)
      params.set('sort_order', sortOrder)
      params.set('page', currentPage)
      if (q) params.set('q', q)
      if (filters.type) params.set('type', filters.type)
      if (filters.source) params.set('source', filters.source)
      if (filters.country) params.set('country', filters.country)
      if (filters.city) params.set('city', filters.city)
      if (filters.createdBy) params.set('created_by', filters.createdBy)
      if (Array.isArray(filters.assignedSalesRep) && filters.assignedSalesRep.length > 0) {
        params.set('assigned_sales_rep', filters.assignedSalesRep[0])
      }
      if (filters.dateFrom) params.set('date_from', filters.dateFrom)
      if (filters.dateTo) params.set('date_to', filters.dateTo)

      const { data } = await api.get(`/api/customers?${params.toString()}`)
      // Map backend snake_case to frontend camelCase
      const mappedItems = (data?.data || data || []).map(item => ({
        ...item,
        customerCode: item.customer_code,
        companyName: item.company_name,
        taxNumber: item.tax_number,
        addressLine: item.address,
        assignedSalesRep: item.assignee?.name || item.assigned_to,
        createdBy: item.created_by,
        createdAt: item.created_at
      }))
      setItems(mappedItems)
    } catch (e) {
      console.error(e)
      setError('Failed to load customers')
      // Fallback to empty or keep existing?
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/api/users', { params: { page: 1 } })
        const raw = res.data?.data || res.data || []
        setUsersList(Array.isArray(raw) ? raw : [])
      } catch (e) {
        try {
          const res2 = await api.get('/api/users?all=1')
          const raw2 = res2.data?.data || res2.data || []
          setUsersList(Array.isArray(raw2) ? raw2 : [])
        } catch {
          setUsersList([])
        }
      }
    }
    fetchUsers()
  }, [])
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (canViewCustomersModule) {
      load()
    }
  }, [canViewCustomersModule])

  // Refetch on filters/pagination/sorting changes
  useEffect(() => {
    if (canViewCustomersModule) {
      load()
    }
  }, [q, filters, sortBy, sortOrder, currentPage, itemsPerPage, canViewCustomersModule])

  // Removed legacy localStorage sync
  // useEffect(() => {
  //   if (isFirstRender.current) {
  //     isFirstRender.current = false
  //     return
  //   }
  //   try {
  //     localStorage.setItem('customersData', JSON.stringify(items))
  //   } catch (e) {}
  // }, [items])

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search
      if (q) {
        const query = q.toLowerCase()
        const match = 
          item.name?.toLowerCase().includes(query) ||
          item.phone?.toLowerCase().includes(query) ||
          item.email?.toLowerCase().includes(query) ||
          item.id?.toLowerCase().includes(query) ||
          item.companyName?.toLowerCase().includes(query)
        if (!match) return false
      }

      // Filters
      if (filters.type && item.type !== filters.type) return false
      if (filters.source && item.source !== filters.source) return false
      if (filters.country && item.country !== filters.country) return false
      if (filters.city && item.city !== filters.city) return false
      
      // Multi-select for Sales Rep
      if (filters.assignedSalesRep && filters.assignedSalesRep.length > 0) {
        if (!filters.assignedSalesRep.includes(item.assignedSalesRep)) return false
      }

      if (filters.createdBy && item.createdBy !== filters.createdBy) return false
      
      if (filters.dateFrom) {
        if (new Date(item.createdAt) < new Date(filters.dateFrom)) return false
      }
      if (filters.dateTo) {
        // Add one day to include the end date fully
        const endDate = new Date(filters.dateTo)
        endDate.setDate(endDate.getDate() + 1)
        if (new Date(item.createdAt) >= endDate) return false
      }

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

  const pageCount = Math.ceil(filteredItems.length / itemsPerPage)

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

  const handlePreviewCustomer = (customer, tab = 'details') => {
    setSelectedCustomer(customer)
    setDetailsModalTab(tab)
    setShowCustomerDetailsModal(true)
  }

  useEffect(() => {
    const id = deepLinkCustomerId ? String(deepLinkCustomerId) : ''
    if (!id) return
    if (!canViewCustomersModule) return
    if (openedDeepLinkRef.current === id) return

    openedDeepLinkRef.current = id
    const open = async () => {
      try {
        let data = null
        try {
          const res = await api.get(`/api/customers/${encodeURIComponent(id)}`)
          data = res.data
        } catch (err) {
          if (err?.response?.status !== 404) throw err
          const searchRes = await api.get('/api/customers', { params: { q: String(id), per_page: 1 } })
          const first = Array.isArray(searchRes?.data?.data)
            ? (searchRes.data.data[0] || null)
            : (Array.isArray(searchRes?.data) ? (searchRes.data[0] || null) : null)
          if (!first?.id) {
            throw err
          }
          const res2 = await api.get(`/api/customers/${encodeURIComponent(first.id)}`)
          data = res2.data
        }

        const mapped = {
          ...data,
          customerCode: data?.customer_code,
          companyName: data?.company_name,
          taxNumber: data?.tax_number,
          addressLine: data?.address,
          assignedSalesRep: data?.assignee?.name || data?.assigned_to,
          createdBy: data?.created_by,
          createdAt: data?.created_at
        }

        handlePreviewCustomer(mapped)
      } catch (e) {
        console.warn('customers_deeplink_open_failed', e)
      }
    }
    open()
  }, [deepLinkCustomerId, canViewCustomersModule])

  const handleAddQuotation = (customer) => {
    const preparedData = {
      customerCode: customer.id,
      customerName: customer.name,
      salesPerson: customer.assignedSalesRep
    }
    setTargetCustomer(preparedData)
    setShowQuotationModal(true)
  }

  const handleAddSalesOrder = (customer) => {
    const preparedData = {
      customerCode: customer.id,
      customerName: customer.name,
      salesPerson: customer.assignedSalesRep
    }
    setTargetCustomer(preparedData)
    setShowSalesOrderModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا العميل؟' : 'Are you sure you want to delete this customer?')) {
      setLoading(true)
      try {
        await api.delete(`/api/customers/${id}`)
        setItems(prev => prev.filter(i => i.id !== id))
        showSuccess(isRTL ? 'تم حذف العميل بنجاح' : 'Customer deleted successfully')
      } catch (e) {
        alert(isRTL ? 'فشل الحذف' : 'Delete failed')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleImport = async (importedData) => {
    if (!canAddCustomer) {
      alert(isRTL ? 'ليس لديك صلاحية استيراد العملاء' : 'You do not have permission to import customers')
      return
    }
    try {
      setLoading(true)
      let successCount = 0

      // Process sequentially to avoid overwhelming the server
      for (const item of importedData) {
        try {
           const payload = {
            customer_code: item.customerCode,
            name: item.name,
            phone: item.phone,
            email: item.email,
            type: item.type,
            source: item.source,
            company_name: item.companyName,
            tax_number: item.taxNumber,
            country: item.country,
            city: item.city,
            address: item.addressLine,
            assigned_to: item.assignedSalesRep,
            notes: item.notes,
            created_by: 'Import' 
          }
          
          await api.post('/api/customers', payload)
          successCount++
        } catch (err) {
          console.error('Import error for item:', item, err)
        }
      }

      setShowImportModal(false)
      showSuccess(isRTL ? `تم استيراد ${successCount} عميل بنجاح` : `Successfully imported ${successCount} customers`)
      logImportEvent({
        module: 'Customers',
        fileName: 'customers_import.xlsx',
        format: 'xlsx',
        status: successCount > 0 ? 'success' : 'failed',
        meta: {
          total: importedData.length,
          success: successCount,
        },
      })
      load()
      
    } catch (e) {
       console.error(e)
       logImportEvent({
         module: 'Customers',
         fileName: 'customers_import.xlsx',
         format: 'xlsx',
         status: 'failed',
         error: e?.message,
       })
       alert(isRTL ? 'فشل الاستيراد' : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCustomer = async (customerData) => {
    try {
      setLoading(true)
      // Map back to snake_case and clean up camelCase keys that backend doesn't expect
      const payload = {
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email,
        type: customerData.type,
        source: customerData.source,
        company_name: customerData.companyName,
        tax_number: customerData.taxNumber,
        country: customerData.country,
        city: customerData.city,
        address: customerData.addressLine,
        assigned_to: customerData.assignedSalesRep || undefined,
        notes: customerData.notes,
        created_by: customerData.createdBy || user?.name || 'Admin',
        custom_fields: customerData.custom_fields
      }

      if (editingItem) {
        // Edit
        const { data } = await api.put(`/api/customers/${editingItem.id}`, payload)
        const updatedItem = {
          ...data,
          customerCode: data.customer_code,
          companyName: data.company_name,
          taxNumber: data.tax_number,
          addressLine: data.address,
          assignedSalesRep: data.assignee?.name || data.assigned_to,
          createdBy: data.created_by,
          createdAt: data.created_at
        }
        setItems(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item))
        showSuccess(isRTL ? 'تم تحديث بيانات العميل' : 'Customer updated successfully')
      } else {
        // Add
        const { data } = await api.post('/api/customers', payload)
        const newItem = {
          ...data,
          customerCode: data.customer_code,
          companyName: data.company_name,
          taxNumber: data.tax_number,
          addressLine: data.address,
          assignedSalesRep: data.assignee?.name || data.assigned_to,
          createdBy: data.created_by,
          createdAt: data.created_at
        }
        setItems(prev => [newItem, ...prev])
        showSuccess(isRTL ? 'تم إضافة العميل بنجاح' : 'Customer added successfully')
      }
      setShowForm(false)
      setEditingItem(null)
    } catch (e) {
      console.error(e)
      const errors = e?.response?.data?.errors
      if (errors && typeof errors === 'object') {
        const phoneMsg = Array.isArray(errors.phone) ? errors.phone[0] : errors.phone
        if (phoneMsg) {
          alert(phoneMsg)
          return
        }
        const firstKey = Object.keys(errors)[0]
        const firstMsg = firstKey ? (Array.isArray(errors[firstKey]) ? errors[firstKey][0] : errors[firstKey]) : null
        if (firstMsg) {
          alert(firstMsg)
          return
        }
      }
      const msg = e?.response?.data?.message || e?.message || (isRTL ? 'فشل الحفظ' : 'Failed to save')
      const detail = e?.response?.data?.error
      alert(detail ? `${msg}\n${detail}` : msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveQuotation = async (data) => {
    try {
      setLoading(true)
      const payload = {
        customer_id: data.customerCode, // backend expects customer_id
        customer_name: data.customerName,
        status: data.status,
        date: data.date,
        valid_until: data.expiryDate,
        subtotal: data.subtotal,
        total: data.total,
        items: data.items,
        notes: data.notes,
        sales_person: data.salesPerson
      }
      await api.post('/api/quotations', payload)
      setShowQuotationModal(false)
      setTargetCustomer(null)
      showSuccess(isRTL ? 'تم إضافة عرض السعر بنجاح' : 'Quotation added successfully')
    } catch (e) {
      console.error(e)
      alert(isRTL ? 'فشل حفظ عرض السعر' : 'Failed to save quotation')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSalesOrder = async (data) => {
    try {
      setLoading(true)
      const payload = {
        customer_id: data.customerCode,
        customer_name: data.customerName,
        customer_code: data.customerCode,
        sales_person: data.salesPerson,
        items: data.items,
        total: data.total,
        status: data.status,
        payment_terms: data.paymentTerms,
        delivery_date: data.deliveryDate,
        quotation_id: data.quotationId,
        tax: data.tax,
        discount_rate: data.discountRate,
        notes: data.notes
      }
      await api.post('/api/sales-orders', payload)
      setShowSalesOrderModal(false)
      setTargetCustomer(null)
      showSuccess(isRTL ? 'تم إضافة طلب البيع بنجاح' : 'Sales Order added successfully')
    } catch (e) {
      console.error(e)
      alert(isRTL ? 'فشل حفظ طلب البيع' : 'Failed to save sales order')
    } finally {
      setLoading(false)
    }
  }

  // const saveNote = () => { ... } (Removed)

  // Options for filters
  const typeOptions = useMemo(() => [...new Set(items.map(i => i.type).filter(Boolean))], [items])
  const sourceOptions = ['Lead', 'New']
  const countryOptions = useMemo(() => [...new Set(items.map(i => i.country).filter(Boolean))], [items])
  const repOptions = useMemo(() => [...new Set(usersList.map(u => u.name).filter(Boolean))], [usersList])
  const createdByOptions = useMemo(() => [...new Set(usersList.map(u => u.name).filter(Boolean))], [usersList])

  const clearFilters = () => {
    setQ('')
    setFilters({
      type: '',
      source: '',
      country: '',
      city: '',
      assignedSalesRep: [],
      createdBy: '',
      dateFrom: '',
      dateTo: '',
      datePeriod: ''
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

  const handleExportRange = () => {
    const from = parseInt(exportFrom)
    const to = parseInt(exportTo)
    if (!from || !to || from > to || from < 1) return
    
    // Calculate range of items
    const startIdx = (from - 1) * itemsPerPage
    const endIdx = to * itemsPerPage
    const itemsToExport = filteredItems.slice(startIdx, endIdx)
    
    if (itemsToExport.length === 0) return

    const data = itemsToExport.map(item => ({
      ID: item.id,
      Name: item.name,
      Phone: item.phone,
      Email: item.email,
      Type: item.type,
      Source: item.source,
      Company: item.companyName,
      TaxNumber: item.taxNumber,
      Country: item.country,
      City: item.city,
      SalesRep: item.assignedSalesRep,
      CreatedBy: item.createdBy,
      CreatedAt: new Date(item.createdAt).toLocaleDateString(),
      Notes: item.notes
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Customers")
    const fileName = "customers_export.xlsx"
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Customers',
      fileName,
      format: 'xlsx',
    })
  }

  const handleBulkExport = () => {
    if (selectedItems.length === 0) return

    const itemsToExport = items.filter(item => selectedItems.includes(item.id))
    
    const data = itemsToExport.map(item => ({
      ID: item.id,
      Name: item.name,
      Phone: item.phone,
      Email: item.email,
      Type: item.type,
      Source: item.source,
      Company: item.companyName,
      TaxNumber: item.taxNumber,
      Country: item.country,
      City: item.city,
      SalesRep: item.assignedSalesRep,
      CreatedBy: item.createdBy,
      CreatedAt: new Date(item.createdAt).toLocaleDateString(),
      Notes: item.notes
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Selected Customers")
    const fileName = "selected_customers_export.xlsx"
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Customers',
      fileName,
      format: 'xlsx',
    })
    showSuccess(isRTL ? `تم تصدير ${itemsToExport.length} عميل` : `Exported ${itemsToExport.length} customers`)
  }

  // const handleBulkAction = (action) => { ... } (Removed)

  // Styles
  const tableHeaderBgClass = 'bg-theme-sidebar dark:bg-gray-900/95'
  const primaryButton = `btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none`

  return !canViewCustomersModule ? (
      <div className="p-6 text-center text-sm text-red-500">
        {isRTL ? 'ليست لديك صلاحية لعرض العملاء' : 'You do not have permission to view customers.'}
      </div>
    ) : (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className=" rounded-xl p-4 md:p-6 relative  mb-6">
        <div className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3">
            <div className="relative flex flex-col items-start gap-1">
              <h1 className={`text-xl md:text-2xl font-bold text-start ${isLight ? 'text-black' : 'text-white'} flex items-center gap-2`}>
                {t('Customers')}
                <span className="text-sm font-normal text-[var(--muted-text)] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  {filteredItems.length}
                </span>
              </h1>
              <span aria-hidden="true" className="inline-block h-[2px] w-full rounded bg-gradient-to-r from-blue-500 to-purple-600" />
              <p className="text-sm text-[var(--muted-text)] mt-1">
                {isRTL ? 'إدارة قاعدة بيانات العملاء' : 'Manage your customer database'}
              </p>
            </div>
          </div>
          
          <div className="w-full lg:w-auto flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
            {canAddCustomer && (
              <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 !text-white border-none flex items-center justify-center gap-2"
              >
              <FaFileImport />
              {isRTL ? 'استيراد' : 'Import'}
              </button>
            )}
            
            {canAddCustomer && (
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-green-500 !text-white border-none flex items-center justify-center gap-2"
              >
                <FaPlus />
                {isRTL ? 'إضافة عميل' : 'Add Customer'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Section - Matching Developers.jsx Style */}
      <div className="glass-panel p-4 rounded-xl mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className={`text-sm font-semibold flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}>
            <Filter className="text-blue-500" size={16} /> {isRTL ? 'تصفية' : 'Filter'}
          </h2>
          <div className="flex items-center gap-2">
         
            <button 
              onClick={() => setShowAllFilters(prev => !prev)} 
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              {showAllFilters ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض الكل' : 'Show All')} 
              <ChevronDown size={14} className={`transform transition-transform ${showAllFilters ? 'rotate-180' : ''}`} />
            </button>
            <button 
              onClick={clearFilters} 
              className={`px-3 py-1.5 text-sm ${isLight ? 'text-black' : 'text-white'} hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors`}
            >
              {isRTL ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Primary Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. SEARCH BY ALL DATA */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <Search className="text-blue-500" size={10} /> {isRTL ? 'بحث عام' : 'Search All Data'}
            </label>
            <input
              className="input w-full"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={isRTL ? 'بحث في كل البيانات...' : 'Search in all data...'}
            />
          </div>

          {/* 2. TYPE */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isRTL ? 'النوع' : 'Type'}
            </label>
            <SearchableSelect
              options={typeOptions.map(o => ({ value: o, label: o }))}
              value={filters.type}
              onChange={(v) => setFilters(prev => ({ ...prev, type: v }))}
              placeholder={isRTL ? 'اختر النوع' : 'Select Type'}
              className="w-full"
              isRTL={isRTL}
            />
          </div>

          {/* 3. SALES PERSONS (Multi-select) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isRTL ? 'مسؤول المبيعات' : 'Sales Persons'}
            </label>
            <SearchableSelect
              options={repOptions.map(o => ({ value: o, label: o }))}
              value={filters.assignedSalesRep}
              onChange={(v) => setFilters(prev => ({ ...prev, assignedSalesRep: v }))}
              placeholder={isRTL ? 'اختر المسؤولين' : 'Select Sales Person'}
              className="w-full"
              isRTL={isRTL}
              multiple={true}
            />
          </div>

          {/* 4. CREATED BY */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isRTL ? 'تم الإنشاء بواسطة' : 'Created By'}
            </label>
            <SearchableSelect
              options={createdByOptions.map(o => ({ value: o, label: o }))}
              value={filters.createdBy}
              onChange={(v) => setFilters(prev => ({ ...prev, createdBy: v }))}
              placeholder={isRTL ? 'منشئ السجل' : 'Record Creator'}
              className="w-full"
              isRTL={isRTL}
            />
          </div>
        </div>

        {/* Secondary/Hidden Filters Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-300 overflow-hidden ${showAllFilters ? 'max-h-[500px] opacity-100 pt-3' : 'max-h-0 opacity-0'}`}>
          
          {/* 5. CREATED DATE (Range) */}
          <div className="col-span-1 md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <Calendar className="text-blue-500" size={10} /> {isRTL ? 'تاريخ الإنشاء' : 'Created Date'}
            </label>
            <div className="w-full">
              <DatePicker
                popperContainer={({ children }) => createPortal(children, document.body)}
                selectsRange={true}
                startDate={filters.dateFrom ? new Date(filters.dateFrom) : null}
                endDate={filters.dateTo ? new Date(filters.dateTo) : null}
                onChange={(update) => {
                  const [start, end] = update;
                  // Adjust for timezone offset if needed, but ISO string split is usually safe for dates
                  // However, DatePicker returns local Date objects.
                  // To avoid timezone issues when converting to YYYY-MM-DD:
                  const formatDate = (date) => {
                     if (!date) return '';
                     const offset = date.getTimezoneOffset();
                     const localDate = new Date(date.getTime() - (offset*60*1000));
                     return localDate.toISOString().split('T')[0];
                  };

                  setFilters(prev => ({
                    ...prev,
                    dateFrom: formatDate(start),
                    dateTo: formatDate(end),
                    datePeriod: ''
                  }));
                }}
                isClearable={true}
                placeholderText={isRTL ? "من - إلى" : "From - To"}
                className="input w-full"
                wrapperClassName="w-full"
                dateFormat="yyyy-MM-dd"
              />
              <div className="flex items-center gap-2 mt-2">
                <button 
                  onClick={() => handleDatePeriodChange('today')} 
                  className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filters.datePeriod === 'today' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : `bg-theme-bg   ${isLight ? 'text-black' : 'text-white'} hover:bg-gray-700/50 dark:hover:bg-gray-700`}`}
                >
                  {isRTL ? 'اليوم' : 'Today'}
                </button>
                <button 
                  onClick={() => handleDatePeriodChange('week')} 
                  className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filters.datePeriod === 'week' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : `bg-theme-bg   ${isLight ? 'text-black' : 'text-white'} hover:bg-gray-700/50 dark:hover:bg-gray-700`}`}
                >
                  {isRTL ? 'أسبوع' : 'Week'}
                </button>
                <button 
                  onClick={() => handleDatePeriodChange('month')} 
                  className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filters.datePeriod === 'month' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : `bg-theme-bg   ${isLight ? 'text-black' : 'text-white'} hover:bg-gray-700/50 dark:hover:bg-gray-700`}`}
                >
                  {isRTL ? 'شهر' : 'Month'}
                </button>
              </div>
            </div>
          </div>

          {/* Extra Filters (Source & Country) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isRTL ? 'المصدر' : 'Source'}
            </label>
            <SearchableSelect
              options={sourceOptions.map(o => ({ value: o, label: o }))}
              value={filters.source}
              onChange={(v) => setFilters(prev => ({ ...prev, source: v }))}
              placeholder={isRTL ? 'المصدر' : 'Source'}
              className="w-full"
              isRTL={isRTL}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isRTL ? 'الدولة' : 'Country'}
            </label>
            <SearchableSelect
              options={countryOptions.map(o => ({ value: o, label: o }))}
              value={filters.country}
              onChange={(v) => setFilters(prev => ({ ...prev, country: v }))}
              placeholder={isRTL ? 'الدولة' : 'Country'}
              className="w-full"
              isRTL={isRTL}
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-panel rounded-xl overflow-visible">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-10 flex items-center justify-center">
            <div className="loading loading-spinner loading-lg text-blue-600"></div>
          </div>
        )}
        
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className={`bg-gray-50/50 dark:bg-gray-800/50 text-xs uppercase ${isLight ? 'text-black' : 'text-white'} font-semibold backdrop-blur-sm`}>
              <tr>
                <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    className="checkbox checkbox-xs"
                    checked={paginatedItems.length > 0 && selectedItems.length === paginatedItems.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th onClick={() => handleSort('id')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'كود العميل' : 'Customer Code'}
                </th>
                <th onClick={() => handleSort('name')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'اسم العميل' : 'Customer Name'}
                </th>
                <th className="p-4 whitespace-nowrap">{isRTL ? 'جهة الاتصال' : 'Contact Info'}</th>
                <th onClick={() => handleSort('type')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'النوع' : 'Type'}
                </th>
                <th onClick={() => handleSort('source')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'المصدر' : 'Source'}
                </th>
                <th onClick={() => handleSort('companyName')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'اسم الشركة' : 'Company Name'}
                </th>
                <th className="p-4 whitespace-nowrap">{isRTL ? 'الرقم الضريبي' : 'Tax Number'}</th>
                <th onClick={() => handleSort('country')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'الدولة' : 'Country'}
                </th>
                <th onClick={() => handleSort('city')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'المدينة' : 'City'}
                </th>
                <th onClick={() => handleSort('assignedSalesRep')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'مسؤول المبيعات' : 'Sales Rep'}
                </th>
                <th onClick={() => handleSort('createdBy')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'تم الإنشاء بواسطة' : 'Created By'}
                </th>
                <th onClick={() => handleSort('createdAt')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'تاريخ الإنشاء' : 'Creation Date'}
                </th>
                <th className="p-4 whitespace-nowrap">{isRTL ? 'الملاحظات' : 'Notes'}</th>
                {/* Dynamic Fields Columns */}
                {dynamicFields.map(field => (
                  <th key={field.key} className={`p-4 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'}`} style={{ minWidth: '150px' }}>
                    {i18n.language === 'ar' ? field.label_ar : field.label_en}
                  </th>
                ))}
                <th className={`p-4 whitespace-nowrap w-[140px] `}
                 >
                  {isRTL ? 'خيارات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="15" className={`p-8 text-center ${isLight ? 'text-black' : 'text-white'}`}>
                    {isRTL ? 'لا توجد بيانات' : 'No data available'}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr 
                    key={item.id || index} 
                    className={`transition-colors group cursor-pointer ${activeRowId === item.id ? ' dark:bg-blue-900/20' : 'hover:bg-blue-900/10'}`}
                    onClick={() => setActiveRowId(activeRowId === item.id ? null : item.id)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-xs"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                      />
                    </td>
                    <td className="p-4 font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {item.customerCode || item.id}
                    </td>
                    <td className={`p-4 font-semibold ${isLight ? 'text-black' : 'text-white'} whitespace-nowrap`}>
                      {item.name}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5">
                        {item.phone && (
                          <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-black' : 'text-white'}`}>
                            <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                              <FaPhone size={10} />
                            </div>
                            <span dir="ltr" className="font-mono">{item.phone}</span>
                          </div>
                        )}
                        {item.email && (
                          <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-black' : 'text-white'}`}>
                            <div className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                              <FaEnvelope size={10} />
                            </div>
                            <span>{item.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        {item.type}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.source === 'Lead' 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {item.source}
                      </span>
                    </td>
                    <td className={`p-4 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'}`}>
                      {item.companyName || '—'}
                    </td>
                    <td className={`p-4 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'}`}>
                      {item.taxNumber || '—'}
                    </td>
                    <td className={`p-4 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'}`}>
                      {item.country}
                    </td>
                    <td className={`p-4 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'}`}>
                      {item.city}
                    </td>
                    <td className={`p-4 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200 flex items-center justify-center text-xs font-bold">
                          {item.assignedSalesRep?.charAt(0)}
                        </div>
                        {item.assignedSalesRep}
                      </div>
                    </td>
                    <td className={`p-4 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'}`}>
                      {item.createdBy}
                    </td>
                    <td className={`p-4 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'}`} dir="ltr">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className={`p-4 whitespace-nowrap max-w-[200px] truncate ${isLight ? 'text-black' : 'text-white'}`} title={item.notes}>
                      {item.notes || '—'}
                    </td>
                    {/* Dynamic Fields Values */}
                    {dynamicFields.map(field => (
                      <td key={field.key} className={`p-4 whitespace-nowrap text-sm ${isLight ? 'text-black' : 'text-white'}`}>
                        {item.custom_fields?.[field.key] ? String(item.custom_fields[field.key]) : '-'}
                      </td>
                    ))}
                    <td className={`p-4 whitespace-nowrap ${
                      viewMode === 'floating' 
                        ? `sticky ltr:right-0 rtl:left-0 bg-theme-bg shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)] dark:shadow-none z-10 transition-opacity duration-200 ${activeRowId === item.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`
                        : ''
                    }`}>
                      <div className="flex items-center justify-end gap-2">
                        {/* 3 Main Action Buttons */}
                        <button 
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePreviewCustomer(item)
                          }}
                        >
                          <FaEye size={14} />
                          <span className="hidden xl:inline">{isRTL ? 'معاينة' : 'Preview'}</span>
                        </button>
                        {canEditCustomer && (
                          <button 
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 transition-colors shadow-sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingItem(item)
                              setShowForm(true)
                            }}
                          >
                            <FaEdit size={14} />
                            <span className="hidden xl:inline">{isRTL ? 'تعديل' : 'Edit'}</span>
                          </button>
                        )}
                        {canDeleteCustomer && (
                          <button 
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors shadow-sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(item.id)
                            }}
                          >
                            <FaTrash size={14} />
                            <span className="hidden xl:inline">{isRTL ? 'حذف' : 'Delete'}</span>
                          </button>
                        )}

                        {/* Dropdown for More Actions (matching Sales Orders) */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              const opening = openDropdownId !== item.id
                              if (opening) {
                                const r = e.currentTarget.getBoundingClientRect()
                                const vh = window.innerHeight
                                const mh = 180 // approximate menu height
                                const spaceBelow = vh - r.bottom
                              const spaceAbove = r.top
                              // Open above if no space below AND space above exists
                              const openAbove = spaceBelow < mh && spaceAbove > mh

                              setDropdownPos({
                                top: r.bottom + 5,
                                left: isRTL ? r.left : (r.right - 192), // 192px = w-48
                                aboveTop: r.top - 5
                              })
                              setOpenDropdownAbove(openAbove)
                              }
                              setOpenDropdownId(opening ? item.id : null)
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-white"
                            title={isRTL ? 'خيارات أخرى' : 'More Actions'}
                          >
                            <FaEllipsisV size={12} />
                          </button>

                          {openDropdownId === item.id && createPortal(
                            <>
                              <div 
                                className="fixed inset-0 z-[9998]" 
                                onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }} 
                              />
                              <div 
                                id={`customer-actions-dropdown-${item.id}`} 
                                className={`fixed w-48 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden bg-white dark:bg-gray-800`}
                                style={{
                                  top: openDropdownAbove ? 'auto' : dropdownPos.top,
                                  bottom: openDropdownAbove ? (window.innerHeight - dropdownPos.aboveTop) : 'auto',
                                  left: dropdownPos.left,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              > 
                                <div className="py-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handlePreviewCustomer(item, 'comments'); setOpenDropdownId(null) }}
                                    className="w-full text-start text-black dark:text-gray-200 px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <FaComment size={14} className="text-indigo-500" />
                                    <span className="font-medium">{isRTL ? 'إضافة تعليق' : 'Add Comment'}</span>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleAddQuotation(item); setOpenDropdownId(null) }}
                                    className="w-full text-start text-black dark:text-gray-200 px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <FaFileInvoiceDollar size={14} className="text-green-500" />
                                    <span className="font-medium">{isRTL ? 'عرض سعر' : 'Quotation'}</span>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleAddSalesOrder(item); setOpenDropdownId(null) }}
                                    className="w-full text-start px-4 py-2 text-black dark:text-gray-200 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <FaShoppingCart size={14} className="text-purple-500" />
                                    <span className="font-medium">{isRTL ? 'أمر بيع' : 'Sales Order'}</span>
                                  </button>
                                </div>
                              </div>
                            </>,
                            document.body
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 p-4">
          {paginatedItems.length === 0 ? (
            <div className="text-center p-8 text-[var(--muted-text)]">
              {isRTL ? 'لا توجد بيانات' : 'No data available'}
            </div>
          ) : (
            paginatedItems.map((item) => (
              <div key={item.id} className="  rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className={`font-bold ${isLight ? 'text-black' : 'text-white'}`}>{item.name}</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{item.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-sm"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectRow(item.id)}
                    />
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      {item.type}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {item.phone && (
                    <div className={`flex items-center gap-2 text-sm ${isLight ? 'text-black' : 'text-white'}`}>
                      <FaPhone size={12} className="text-[var(--muted-text)]" />
                      <span dir="ltr">{item.phone}</span>
                    </div>
                  )}
                  {item.email && (
                    <div className={`flex items-center gap-2 text-sm ${isLight ? 'text-black' : 'text-white'}`}>
                      <FaEnvelope size={12} className="text-[var(--muted-text)]" />
                      <span>{item.email}</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-2 text-sm ${isLight ? 'text-black' : 'text-white'}`}>
                    <span className="text-[var(--muted-text)]">{isRTL ? 'المصدر:' : 'Source:'}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      item.source === 'Lead' 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {item.source}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button 
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePreviewCustomer(item)
                    }}
                    title={isRTL ? 'عرض التفاصيل' : 'View Details'}
                  >
                    <FaEye size={16} />
                  </button>
                  <button 
                    className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddQuotation(item)
                    }}
                    title={isRTL ? 'إضافة عرض سعر' : 'Add Quotation'}
                  >
                    <FaFileInvoiceDollar size={16} />
                  </button>
                  <button 
                    className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddSalesOrder(item)
                    }}
                    title={isRTL ? 'إضافة أمر بيع' : 'Add Sales Order'}
                  >
                    <FaShoppingCart size={16} />
                  </button>
                  {canEditCustomer && (
                    <button 
                      className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400"
                      onClick={() => {
                        setEditingItem(item)
                        setShowForm(true)
                      }}
                    >
                      <FaEdit size={16} />
                    </button>
                  )}
                  {canDeleteCustomer && (
                    <button 
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                      onClick={() => handleDelete(item.id)}
                    >
                      <FaTrash size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
      <nav className="flex flex-col gap-4 p-3 lg:p-4 border-t border-theme-border dark:border-gray-700 dark:bg-transparent rounded-b-lg backdrop-blur-sm">
        {/* Row 1: Show Entries & Page Navigation */}
        <div className="flex  lg:flex-row justify-between items-center gap-3">
          {/* Show Entries */}
          <div className={`flex flex-wrap items-center gap-2 w-full lg:w-auto text-sm font-medium ${isLight ? 'text-black' : 'text-white'}`}>
            <span style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Show')}</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { 
                setItemsPerPage(Number(e.target.value)); 
                setCurrentPage(1); 
              }} 
              className={`px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'} text-xs`}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('entries')}</span>
            <label htmlFor="page-search" className="sr-only">{t('Search Page')}</label>
            <input
              id="page-search"
              type="text"
              placeholder={t('Go to page...')}
              value={pageSearch}
              onChange={(e) => setPageSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const page = Number(pageSearch)
                  if (page > 0 && page <= Math.ceil(filteredItems.length / itemsPerPage)) {
                    setCurrentPage(page)
                    setPageSearch('')
                  }
                }
              }}
              className={`ml-2 px-3 py-1.5 border border-theme-border dark:border-gray-600 rounded-lg  dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'} text-xs w-full sm:w-64 lg:w-28  dark:placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400`}
              style={{ color: theme === 'dark' ? '#ffffff' : undefined }}
            />
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`block px-3 py-2 leading-tight ${isLight ? 'text-black' : 'text-white'} border border-theme-border rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 backdrop-blur-sm`}
            >
              <span className={`sr-only ${isLight ? 'text-black' : 'text-white'} focus:text-white`}>{t('Previous')}</span>
              <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
            </button>
            <span className={`text-sm font-medium ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>
              {t('Page')} <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{currentPage}</span> {t('of')} <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{Math.ceil(filteredItems.length / itemsPerPage)}</span>
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredItems.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(filteredItems.length / itemsPerPage)}
              className={`block px-3 py-2 leading-tight ${isLight ? 'text-black' : 'text-white'} border border-theme-border rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 backdrop-blur-sm`}
            >
              <span className={`sr-only ${isLight ? 'text-black' : 'text-white'} focus:text-white`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Next')}</span>
              <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
            </button>
          </div>
        </div>

        {/* Row 2: Export Controls */}
        <div className="flex justify-center items-center">
          <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto border p-2 rounded-lg border-theme-border dark:border-gray-600  dark:bg-gray-700 justify-center">
            <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Export Pages')}</span>
            <input
              type="number"
              min="1"
              max={Math.ceil(filteredItems.length / itemsPerPage)}
              placeholder="From"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="w-16 px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm text-white text-xs focus:border-blue-500"
              style={{ color: theme === 'dark' ? '#ffffff' : undefined }}
            />
            <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'}`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('to')}</span>
            <input
              type="number"
              min="1"
              max={Math.ceil(filteredItems.length / itemsPerPage)}
              placeholder="To"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className={`w-16 px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'} text-xs focus:border-blue-500`}
              style={{ color: theme === 'dark' ? '#ffffff' : undefined }}
            />
            <button
              onClick={handleExportRange}
              className="btn btn-sm bg-blue-600 hover:bg-blue-700 !text-white border-none flex items-center gap-1"
            >
              <FaDownload size={12} />
              {t('Export')}
            </button>
            {selectedItems.length > 0 && (
              <button
                onClick={handleBulkExport}
                className="btn btn-sm bg-green-600 hover:bg-green-700 !text-white border-none flex items-center gap-1"
                title={isRTL ? 'تصدير العملاء المحددين' : 'Export selected customers'}
              >
                <FaDownload size={12} />
                {isRTL ? `تصدير المحدد (${selectedItems.length})` : `Export Selected (${selectedItems.length})`}
              </button>
            )}
          </div>
        </div>
      </nav>
      </div>

      {/* Import Modal */}
      {showImportModal && canAddCustomer && (
        <CustomersImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          isRTL={isRTL}
        />
      )}

      {/* Customer Details Modal */}
      {showCustomerDetailsModal && (
        <CustomerDetailsModal
          isOpen={showCustomerDetailsModal}
          onClose={() => {
            setShowCustomerDetailsModal(false)
            setSelectedCustomer(null)
          }}
          customer={selectedCustomer}
          initialTab={detailsModalTab}
          isRTL={isRTL}
        />
      )}

      {/* Form Modal */}
      {showForm && (
        <CustomersFormModal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false)
            setEditingItem(null)
          }}
          onSave={handleSaveCustomer}
          initialData={editingItem}
          isRTL={isRTL}
        />
      )}

      {/* Note Modal Removed */}

      {/* Quotation Form Modal */}

      {/* Quotation Form Modal */}
      {showQuotationModal && (
        <QuotationsFormModal
          isOpen={showQuotationModal}
          onClose={() => {
            setShowQuotationModal(false)
            setTargetCustomer(null)
          }}
          onSave={handleSaveQuotation}
          initialData={targetCustomer}
          isRTL={isRTL}
        />
      )}

      {/* Sales Order Form Modal */}
      {showSalesOrderModal && (
        <SalesOrdersFormModal
          isOpen={showSalesOrderModal}
          onClose={() => {
            setShowSalesOrderModal(false)
            setTargetCustomer(null)
          }}
          onSave={handleSaveSalesOrder}
          initialData={targetCustomer}
          isRTL={isRTL}
        />
      )}

      {/* Bulk Actions Bar Removed */}
    </div>
  )
}

export default Customers
