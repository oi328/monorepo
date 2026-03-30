import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { api, logExportEvent } from '../utils/api'
import { useTheme } from '../shared/context/ThemeProvider'
import { FaEdit, FaCheck, FaPlay, FaPause, FaBan, FaCheckDouble, FaDownload, FaPlus, FaFileImport, FaEye, FaTrash, FaStickyNote, FaShoppingCart, FaFileInvoiceDollar, FaUndo } from 'react-icons/fa'
import { Filter, ChevronDown, Search, User, DollarSign, Calendar } from 'lucide-react'
import SearchableSelect from '../components/SearchableSelect'
import SalesOrdersFormModal from '../components/SalesOrdersFormModal'
import SalesInvoicesFormModal from '../components/SalesInvoicesFormModal'
import SalesOrderPreviewModal from '../components/SalesOrderPreviewModal'
import SalesOrdersImportModal from '../components/SalesOrdersImportModal'
import * as XLSX from 'xlsx'

export default function SalesOrders() {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const isRTL = String(i18n.language || '').startsWith('ar')

  // State
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [activeRowId, setActiveRowId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [isViewMode, setIsViewMode] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewOrder, setPreviewOrder] = useState(null)
  
  // Invoice Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceData, setInvoiceData] = useState(null)
  const [invoiceType, setInvoiceType] = useState(null) // 'Full', 'Partial', 'Advance'

  // Status Management
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusAction, setStatusAction] = useState(null) // { type: 'Cancel', orderId: '...', nextStatus: '...' }
  const [statusReason, setStatusReason] = useState('')
  const [activeActionDropdown, setActiveActionDropdown] = useState(null) // ID of row with open dropdown

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveActionDropdown(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Filters
  const [q, setQ] = useState('') // Main search query
  const [filters, setFilters] = useState({
    status: '',
    customerId: '',
    dateFrom: '',
    dateTo: '',
    datePeriod: '' // 'today', 'week', 'month', 'custom'
  })
  const [showAllFilters, setShowAllFilters] = useState(false)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [pageSearch, setPageSearch] = useState('')

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Selection
  const [selectedItems, setSelectedItems] = useState([])

  // Lists for tenant-scoped filters
  const [customersList, setCustomersList] = useState([])
  const [usersList, setUsersList] = useState([])

  // Helper for success messages
  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const getAvailableActions = (status) => {
    switch (status) {
      case 'Draft':
        return [
          { type: 'confirm', label: isRTL ? 'تأكيد الطلب' : 'Confirm Order', icon: FaCheck, color: 'text-green-600' },
          { type: 'edit', label: isRTL ? 'تعديل' : 'Edit Order', icon: FaEdit, color: 'text-blue-600' },
          { type: 'cancel', label: isRTL ? 'إلغاء' : 'Cancel Order', icon: FaBan, color: 'text-red-600' }
        ]
      case 'Confirmed':
        return [
          { type: 'process', label: isRTL ? 'بدء التنفيذ' : 'Start Processing', icon: FaPlay, color: 'text-blue-600' },
          { type: 'hold', label: isRTL ? 'تعليق' : 'Put On Hold', icon: FaPause, color: 'text-orange-600' },
          { type: 'cancel', label: isRTL ? 'إلغاء' : 'Cancel Order', icon: FaBan, color: 'text-red-600' }
        ]
      case 'In Progress':
        return [
          { type: 'complete', label: isRTL ? 'إكمال الطلب' : 'Complete Order', icon: FaCheckDouble, color: 'text-green-600' },
          { type: 'hold', label: isRTL ? 'تعليق' : 'Put On Hold', icon: FaPause, color: 'text-orange-600' },
          { type: 'cancel', label: isRTL ? 'إلغاء' : 'Cancel Order', icon: FaBan, color: 'text-red-600' }
        ]
      case 'On Hold':
        return [
          { type: 'resume', label: isRTL ? 'استئناف' : 'Resume', icon: FaPlay, color: 'text-blue-600' }
        ]
      case 'Completed':
      case 'Cancelled':
      case 'Fully Invoiced':
      case 'Partially Invoiced':
      default:
        return []
    }
  }

  const handleCreateInvoice = (order, type) => {
    // 1. Prepare Base Invoice Data
    const baseInvoice = {
      orderId: order.id,
      customerCode: order.customerCode,
      customerName: order.customerName,
      salesPerson: order.salesPerson,
      currency: 'USD', // Default or from order
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30*24*3600*1000).toISOString(), // Default Net 30
      discountRate: order.discountRate || 0,
      tax: order.tax || 0,
      notes: `Invoice for Order #${order.id}`,
    }

    // 2. Handle specific types
    let items = []
    
    if (type === 'Advance') {
      // Advance Invoice: Single item for percentage
      // Calculate 30% default
      const advanceAmount = order.total * 0.30
      
      items = [{
        id: Date.now(),
        name: `${isRTL ? 'دفعة مقدمة لطلب' : 'Advance Payment for Order'} #${order.id}`,
        description: isRTL ? 'دفعة مقدمة' : 'Advance Payment',
        quantity: 1,
        price: advanceAmount,
        type: 'Service',
        category: 'Financial'
      }]
      
      // Reset tax/discount for advance as it's usually flat amount (simplification)
      baseInvoice.tax = 0
      baseInvoice.discountRate = 0
      
    } else {
      // Full or Partial: Copy items
      items = order.items.map(item => ({
        ...item,
        // Ensure quantity is copied; for Partial, user edits it in modal
        quantity: item.quantity || item.qty || 0,
        // Preserve price
        price: item.price
      }))
    }

    setInvoiceData({
      ...baseInvoice,
      items: items,
      invoiceType: type
    })
    setInvoiceType(type)
    setShowInvoiceModal(true)
    setShowPreview(false) // Close preview
  }

  const handleSaveInvoice = async (data) => {
    try {
      const payload = {
        order_id: data.orderId,
        customer_code: data.customerCode,
        customer_name: data.customerName,
        sales_person: data.salesPerson,
        invoice_type: data.invoiceType,
        issue_date: data.date,
        due_date: data.dueDate,
        items: data.items,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discountAmount || 0,
        total: data.total,
        paid_amount: data.paidAmount,
        payment_status: (data.total - data.paidAmount) <= 0 ? 'Paid' : (data.paidAmount > 0 ? 'Partial' : 'Unpaid'),
        currency: 'USD',
        notes: data.notes,
        status: data.status || 'Draft'
      }

      await api.post('/api/sales-invoices', payload)
      
      // Refresh orders to see updated status
      await fetchOrders()

      setShowInvoiceModal(false)
      setInvoiceData(null)
      setInvoiceType(null)
      showSuccess(isRTL ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice Created Successfully')
    } catch (error) {
      console.error('Failed to save invoice:', error)
      alert(isRTL ? 'فشل إنشاء الفاتورة' : 'Failed to create invoice')
    }
  }

  const handleStatusAction = (order, actionType) => {
    const actionMap = {
      'confirm': { status: 'Confirmed', requireReason: false },
      'process': { status: 'In Progress', requireReason: false },
      'complete': { status: 'Completed', requireReason: false },
      'cancel': { status: 'Cancelled', requireReason: true },
      'hold': { status: 'On Hold', requireReason: true },
      'resume': { status: 'Previous', requireReason: false }
    }

    if (actionType === 'edit') {
      if (order.status !== 'Draft') {
        alert(isRTL ? 'لا يمكن تعديل طلب غير مسودة' : 'Cannot edit non-draft order')
        return
      }
      setEditingItem(order)
      setShowForm(true)
      return
    }

    const actionConfig = actionMap[actionType]
    if (!actionConfig) return

    let nextStatus = actionConfig.status
    if (actionType === 'resume') {
       nextStatus = 'Confirmed' 
    }

    const actionData = {
      type: actionType,
      orderId: order.id,
      nextStatus: nextStatus,
      currentStatus: order.status
    }

    if (actionConfig.requireReason) {
      setStatusAction(actionData)
      setStatusReason('')
      setShowStatusModal(true)
    } else {
      if (window.confirm(isRTL ? 'هل أنت متأكد من هذا الإجراء؟' : 'Are you sure you want to proceed?')) {
        executeStatusChange(actionData)
      }
    }
  }

  const executeStatusChange = async (actionData) => {
    setLoading(true)
    try {
      let updates = { status: actionData.nextStatus }
        
      if (actionData.type === 'confirm') updates.confirmed_at = new Date().toISOString()
      if (actionData.type === 'ship') updates.shipped_at = new Date().toISOString()
      if (actionData.type === 'cancel') updates.cancel_reason = statusReason
      if (actionData.type === 'hold') updates.hold_reason = statusReason
      if (actionData.type === 'resume') {
          updates.status = 'Confirmed' 
      }

      await api.put(`/api/sales-orders/${actionData.orderId}`, updates)
      await fetchOrders()

      showSuccess(isRTL ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully')
      setShowStatusModal(false)
      setStatusAction(null)
      setStatusReason('')
    } catch (e) {
      console.error(e)
      alert(isRTL ? 'فشل التحديث' : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const [pageCount, setPageCount] = useState(1) // Server-side total pages

  // Load Data
  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/sales-orders', {
        params: {
          page: currentPage,
          search: q,
          status: filters.status
        }
      })
      
      console.log('Fetch Orders Response:', response.data); // Debugging Log

      // Laravel paginate returns data inside response.data.data
      // And pagination meta in response.data (current_page, last_page, etc.)
      const rawData = response.data.data || response.data
      const data = Array.isArray(rawData) ? rawData : []
      
      // Update page count from server response
      if (response.data.last_page) {
        setPageCount(response.data.last_page);
      } else {
        // Fallback if not paginated or different structure
        setPageCount(Math.ceil(data.length / itemsPerPage) || 1);
      }

      // Map snake_case to camelCase
      const mappedItems = data.map(item => ({
        ...item,
        id: item.id,
        uuid: item.uuid || `SO-${item.id}`, // Prefer UUID (SO-...) over numeric ID
        customerName: item.customer_name,
        customerCode: item.customer_code,
        salesPerson: item.sales_person,
        total: parseFloat(item.total) || 0, // Ensure number conversion
        deliveryDate: item.delivery_date,
        createdBy: item.created_by,
        quotationId: item.quotation_id,
        createdAt: item.created_at,
        confirmedAt: item.confirmed_at,
        shippedAt: item.shipped_at,
        cancelReason: item.cancel_reason,
        holdReason: item.hold_reason,
        discountRate: item.discount_rate,
        status: item.status
      }))

      console.log('Mapped Items:', mappedItems); // Debugging Log
      setItems(mappedItems)
      setError('')
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      setError(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Load tenant-scoped lists for filters
  useEffect(() => {
    const loadLists = async () => {
      try {
        // Customers of the current tenant
        const cRes = await api.get('/api/customers?all=1')
        const cRaw = cRes.data?.data || cRes.data || []
        setCustomersList(Array.isArray(cRaw) ? cRaw : [])
      } catch {
        setCustomersList([])
      }
      try {
        // Users of the current tenant
        const uRes = await api.get('/api/users?all=1')
        const uRaw = uRes.data?.data || uRes.data || []
        setUsersList(Array.isArray(uRaw) ? uRaw : [])
      } catch {
        setUsersList([])
      }
    }
    loadLists()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [currentPage, q, filters.status])

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search - Only if fetchOrders didn't filter it already, but client side search is useful for quick feedback
      // However, if we paginate on server, client-side filtering only filters current page, which is confusing.
      // So if server-side pagination is active, client-side search should be minimal or just for highlighting.
      // Assuming server returns filtered data based on 'q' and 'filters.status'.

      // We still need to filter by other criteria not sent to server yet (like customerName, date range etc)
      // UNLESS we update fetchOrders to send all filters.
      // For now, let's keep client side filtering for advanced filters not handled by backend index()
      
      // The issue might be that fetchOrders returns paginated data, but here we filter AGAIN.
      // If backend returns 15 items, and client filters them, we might end up with 0 items on page 1, even if page 2 has matches.
      // BUT, let's check what backend handles: 'search' and 'status'.
      
      // If 'q' is present, backend handles it.
      // If 'filters.status' is present, backend handles it.
      
      // So we should NOT filter by 'q' or 'status' here again if they were sent to server.
      // But let's be safe and only filter if needed.
      
      // Client-side filtering for fields NOT sent to backend:
      if (filters.customerName && item.customerName !== filters.customerName) return false
      
      if (filters.salesPerson && Array.isArray(filters.salesPerson) && filters.salesPerson.length > 0) {
        // If filters.salesPerson is an array (multi-select), check if item's salesPerson is in it.
        // Also handle if item.salesPerson is null or undefined gracefully.
        const sp = item.salesPerson || '';
        if (!filters.salesPerson.includes(sp)) return false
      } else if (filters.salesPerson && typeof filters.salesPerson === 'string' && filters.salesPerson.trim() !== '') {
         // Fallback if it's a string
         if (item.salesPerson !== filters.salesPerson) return false
      }

      if (filters.createdBy && item.createdBy !== filters.createdBy) return false
      
      if (filters.dateFrom) {
        if (new Date(item.createdAt) < new Date(filters.dateFrom)) return false
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo)
        endDate.setDate(endDate.getDate() + 1)
        if (new Date(item.createdAt) >= endDate) return false
      }

      if (filters.deliveryDateFrom) {
        if (new Date(item.deliveryDate) < new Date(filters.deliveryDateFrom)) return false
      }
      if (filters.deliveryDateTo) {
        const endDate = new Date(filters.deliveryDateTo)
        endDate.setDate(endDate.getDate() + 1)
        if (new Date(item.deliveryDate) >= endDate) return false
      }

      return true
    })
  }, [items, filters]) // Removed 'q' from dependencies as it's handled by server fetch

  // Pagination Logic
  // Since backend returns paginated data (per page 15), we should use the data as is if we trust backend pagination.
  // BUT the current implementation seems to fetch a page, then filter it client side, then slice it again?
  // The 'fetchOrders' calls '/api/sales-orders?page=...' which returns paginated result.
  // 'items' state holds the items for the CURRENT page.
  // So 'paginatedItems' logic here slicing (currentPage-1)*itemsPerPage is WRONG if 'items' already contains only the current page!
  
  // If backend returns: { data: [15 items], current_page: 1, ... }
  // Then 'items' has 15 items.
  // Slicing (1-1)*10 to 1*10 gives first 10 items. 
  // If itemsPerPage is 10, but backend returned 15 (default pagination), we lose 5 items.
  
  // CORRECT APPROACH:
  // Use 'items' directly as 'paginatedItems' since backend handles pagination.
  // Or update backend to accept 'per_page' parameter.
  
  const paginatedItems = filteredItems; // Just use the filtered items from the current server page

  // const pageCount = Math.ceil(filteredItems.length / itemsPerPage) // Removed local calc

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

  const handleDelete = async (id) => {
    const orderToDelete = items.find(i => i.id === id)
    if (orderToDelete && ['Confirmed', 'In Progress', 'Completed', 'Fully Invoiced', 'Partially Invoiced'].includes(orderToDelete.status)) {
      alert(isRTL ? 'لا يمكن حذف طلب تم تأكيده أو تنفيذه. يرجى إلغاؤه أولاً.' : 'Cannot delete an active or processed order. Please cancel it first.')
      return
    }

    if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا الطلب؟' : 'Are you sure you want to delete this order?')) {
      setLoading(true)
      try {
        await api.delete(`/api/sales-orders/${id}`)
        await fetchOrders()
        showSuccess(isRTL ? 'تم حذف الطلب بنجاح' : 'Order deleted successfully')
      } catch (e) {
        alert(isRTL ? 'فشل الحذف' : 'Delete failed')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleImport = async (importedData) => {
    // Save all imported items
    // This could be optimized with a bulk insert endpoint
    try {
      for (const item of importedData) {
        await api.post('/api/sales-orders', item)
      }
      await fetchOrders()
      setShowImportModal(false)
      showSuccess(isRTL ? `تم استيراد ${importedData.length} طلب بنجاح` : `Successfully imported ${importedData.length} orders`)
    } catch (e) {
      console.error('Import failed:', e)
      alert(isRTL ? 'فشل الاستيراد' : 'Import failed')
    }
  }

  const handleSave = async (orderData) => {
    try {
      // Prepare payload for backend (snake_case)
      const payload = {
        customer_id: orderData.customerCode, // This might be wrong if customerCode is a string code not ID
        customer_name: orderData.customerName,
        customer_code: orderData.customerCode, 
        sales_person: orderData.salesPerson,
        items: orderData.items,
        total: orderData.total,
        amount: orderData.subtotal || orderData.total, // Send amount (subtotal) or total if missing
        status: orderData.status || 'Draft',
        delivery_date: orderData.deliveryDate,
        quotation_id: orderData.quotationId,
        tax: orderData.tax,
        discount_rate: orderData.discountRate,
        notes: orderData.notes,
      }

      // If customer_id is not a valid numeric ID, try to remove it or use null to avoid 422 if it's optional
      // But validation says: 'customer_id' => 'nullable|exists:customers,id'
      // If orderData.customerCode is a string like "CUST-001", it will fail validation if passed as customer_id
      // Let's check if customerCode is numeric, if not, send null for customer_id
      if (payload.customer_id && isNaN(payload.customer_id)) {
         delete payload.customer_id;
      }

      if (editingItem) {
        await api.put(`/api/sales-orders/${editingItem.id}`, payload)
        showSuccess(isRTL ? 'تم تحديث الطلب بنجاح' : 'Order updated successfully')
      } else {
        await api.post('/api/sales-orders', payload)
        showSuccess(isRTL ? 'تم إنشاء الطلب بنجاح' : 'Order created successfully')
      }
      
      await fetchOrders()
      
      setShowForm(false)
      setEditingItem(null)
    } catch (error) {
      console.error('Failed to save order:', error)
      const msg = error.response?.data?.message || (isRTL ? 'فشل حفظ الطلب' : 'Failed to save order')
      alert(msg)
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setIsViewMode(false)
    setShowForm(true)
  }

  const handleView = (item) => {
    setPreviewOrder(item)
    setShowPreview(true)
  }

  const handleExportRange = () => {
    let itemsToExport = []
    let filename = ''

    // Priority 1: Checkbox Selection
    if (selectedItems.length > 0) {
      itemsToExport = items.filter(item => selectedItems.includes(item.id))
      filename = 'selected_orders_export.xlsx'
    } 
    // Priority 2: Page Range (if no selection)
    else if (exportFrom && exportTo) {
      const start = parseInt(exportFrom)
      const end = parseInt(exportTo)
      
      if (!start || !end || start > end || start < 1) {
        alert(isRTL ? 'الرجاء إدخال نطاق صفحات صحيح أو ترك الحقول فارغة لتصدير الكل' : 'Please enter a valid page range or leave empty to export all')
        return
      }

      itemsToExport = filteredItems.slice((start - 1) * itemsPerPage, end * itemsPerPage)
      filename = `orders_pages_${start}_to_${end}.xlsx`
    }
    // Priority 3: All Filtered (Default)
    else {
      itemsToExport = filteredItems
      filename = 'filtered_orders_export.xlsx'
    }
    
    if (itemsToExport.length === 0) {
      alert(isRTL ? 'لا توجد بيانات لتصديرها' : 'No data to export')
      return
    }

    const data = itemsToExport.map(item => ({
      ID: item.id,
      Status: item.status,
      'Customer Code': item.customerCode,
      'Customer Name': item.customerName,
      'Quotation Code': item.quotationId,
      'Items Count': Array.isArray(item.items) ? item.items.length : 0,
      'Delivery Date': item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : '',
      'Total': item.total,
      'Attachments': item.attachments ? item.attachments.length : 0,
      'Created By': item.createdBy,
      'Sales Person': item.salesPerson,
      'Created At': new Date(item.createdAt).toLocaleDateString()
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Orders")
    XLSX.writeFile(wb, filename)
    logExportEvent({
      module: 'Sales Orders',
      fileName: filename,
      format: 'xlsx',
    })
    showSuccess(isRTL ? `تم تصدير ${itemsToExport.length} طلب` : `Exported ${itemsToExport.length} orders`)
  }

  // Calculate export count for button label
  const exportCount = useMemo(() => {
    if (selectedItems.length > 0) return selectedItems.length

    if (!exportFrom && !exportTo) return filteredItems.length
    
    const start = parseInt(exportFrom)
    const end = parseInt(exportTo)
    
    if (!start || !end || start > end || start < 1) return 0
    
    return filteredItems.slice((start - 1) * itemsPerPage, end * itemsPerPage).length
  }, [filteredItems, exportFrom, exportTo, itemsPerPage, selectedItems])

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

  const clearFilters = () => {
    setQ('')
    setFilters({
      status: '',
      customerName: '',
      salesPerson: [],
      createdBy: '',
      dateFrom: '',
      dateTo: '',
      datePeriod: '',
      deliveryDateFrom: '',
      deliveryDateTo: ''
    })
  }

  // Options
  const statusOptions = useMemo(() => [
    { value: 'Draft', label: isRTL ? 'مسودة' : 'Draft' },
    { value: 'Confirmed', label: isRTL ? 'مؤكد' : 'Confirmed' },
    { value: 'In Progress', label: isRTL ? 'قيد التنفيذ' : 'In Progress' },
    { value: 'Completed', label: isRTL ? 'مكتمل' : 'Completed' },
    { value: 'Cancelled', label: isRTL ? 'ملغي' : 'Cancelled' },
    { value: 'Partially Invoiced', label: isRTL ? 'مفوتر جزئياً' : 'Partially Invoiced' },
    { value: 'Fully Invoiced', label: isRTL ? 'مفوتر بالكامل' : 'Fully Invoiced' }
  ], [isRTL])
  const customerOptions = useMemo(() => {
    // Prefer tenant customers list; fallback to values present in orders
    if (customersList && customersList.length > 0) {
      const names = customersList
        .map(c => c.name || c.company_name || c.companyName)
        .filter(Boolean)
      return [...new Set(names)]
    }
    return [...new Set(items.map(i => i.customerName).filter(Boolean))]
  }, [customersList, items])
  const salesPersonOptions = useMemo(() => {
    // Prefer tenant users list; fallback to values present in orders
    if (usersList && usersList.length > 0) {
      const names = usersList.map(u => u.name || u.full_name).filter(Boolean)
      return [...new Set(names)]
    }
    return [...new Set(items.map(i => i.salesPerson).filter(Boolean))]
  }, [usersList, items])
  const createdByOptions = useMemo(() => [...new Set(items.map(i => i.createdBy).filter(Boolean))], [items])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="rounded-xl p-4 md:p-6 relative mb-6">
        <div className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3">
            <div className="relative flex flex-col items-start gap-1">
              <h1 className={`text-xl md:text-2xl font-bold text-start ${isLight ? 'text-black' : 'text-white'} dark:text-white flex items-center gap-2`}>
                {t('Sales Orders')}
                <span className="text-sm font-normal text-[var(--muted-text)] bg-[var(--card-bg)] px-2 py-0.5 rounded-full border border-[var(--border-color)]">
                  {filteredItems.length}
                </span>
              </h1>
              <p className="text-sm text-[var(--muted-text)]">
                {isRTL ? 'إدارة ومتابعة أوامر البيع' : 'Manage and track sales orders'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <button 
              onClick={() => setShowImportModal(true)}
              className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 !text-white border-none flex items-center justify-center gap-2"
            >
              <FaFileImport /> {isRTL ? 'استيراد' : 'Import'}
            </button>
            <button 
              onClick={() => {
                setEditingItem(null)
                setIsViewMode(false)
                setShowForm(true)
              }}
              className="btn   w-full btn-sm bg-green-600 hover:bg-blue-700 !text-white border-none gap-2"
            >
              <FaPlus /> {isRTL ? 'إضافة طلب' : 'Add Order'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Section - Matching Customers Style */}
      <div className="glass-panel p-4 rounded-xl mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className={`text-sm font-semibold flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'} `}>
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
          {/* 1. Search */}
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

          {/* 2. Status */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isRTL ? 'الحالة' : 'Status'}
            </label>
            <SearchableSelect
              options={statusOptions}
              value={filters.status}
              onChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
              placeholder={isRTL ? 'اختر الحالة' : 'Select Status'}
              className="w-full"
              isRTL={isRTL}
            />
          </div>

          {/* 3. Customer Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isRTL ? 'العميل' : 'Customer'}
            </label>
            <SearchableSelect
              options={customerOptions.map(o => ({ value: o, label: o }))}
              value={filters.customerName}
              onChange={(v) => setFilters(prev => ({ ...prev, customerName: v }))}
              placeholder={isRTL ? 'اختر العميل' : 'Select Customer'}
              className="w-full"
              isRTL={isRTL}
            />
          </div>

          {/* 4. Sales Person */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isRTL ? 'مسؤول المبيعات' : 'Sales Person'}
            </label>
            <SearchableSelect
              options={salesPersonOptions.map(o => ({ value: o, label: o }))}
              value={filters.salesPerson}
              onChange={(v) => setFilters(prev => ({ ...prev, salesPerson: v }))}
              placeholder={isRTL ? 'اختر المسؤول' : 'Select Sales Person'}
              className="w-full"
              isRTL={isRTL}
              multiple={true}
            />
          </div>
        </div>

        {/* Secondary/Hidden Filters Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-300 overflow-hidden ${showAllFilters ? 'max-h-[800px] opacity-100 pt-3' : 'max-h-0 opacity-0'}`}>
          
          {/* 6. Payment Terms (removed) */}
          {false && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isRTL ? 'شروط الدفع' : 'Payment Terms'}
            </label>
            <SearchableSelect
              options={paymentTermsOptions.map(o => ({ value: o, label: o }))}
              value={filters.paymentTerms}
              onChange={(v) => setFilters(prev => ({ ...prev, paymentTerms: v }))}
              placeholder={isRTL ? 'اختر شروط الدفع' : 'Select Payment Terms'}
              className="w-full"
              isRTL={isRTL}
            />
          </div>
          )}

          {/* 7. Created By */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">
              {isRTL ? 'تم الإنشاء بواسطة' : 'Created By'}
            </label>
            <SearchableSelect
              options={createdByOptions.map(o => ({ value: o, label: o }))}
              value={filters.createdBy}
              onChange={(v) => setFilters(prev => ({ ...prev, createdBy: v }))}
              placeholder={isRTL ? 'منشئ السجل' : 'Created By'}
              className="w-full"
              isRTL={isRTL}
            />
          </div>

          {/* 8. Created Date */}
          <div className="space-y-1">
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
                  setFilters(prev => ({
                    ...prev,
                    dateFrom: start ? start.toISOString().split('T')[0] : '',
                    dateTo: end ? end.toISOString().split('T')[0] : ''
                  }));
                }}
                isClearable={true}
                placeholderText={isRTL ? 'اختر الفترة الزمنية' : 'Select Date Range'}
                className="input w-full text-sm"
                dateFormat="yyyy-MM-dd"
              />
            </div>
          </div>

          {/* 9. Delivery Date */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <Calendar className="text-blue-500" size={10} /> {isRTL ? 'تاريخ التوصيل' : 'Delivery Date'}
            </label>
            <div className="w-full">
              <DatePicker
                popperContainer={({ children }) => createPortal(children, document.body)}
                selectsRange={true}
                startDate={filters.deliveryDateFrom ? new Date(filters.deliveryDateFrom) : null}
                endDate={filters.deliveryDateTo ? new Date(filters.deliveryDateTo) : null}
                onChange={(update) => {
                  const [start, end] = update;
                  setFilters(prev => ({
                    ...prev,
                    deliveryDateFrom: start ? start.toISOString().split('T')[0] : '',
                    deliveryDateTo: end ? end.toISOString().split('T')[0] : ''
                  }));
                }}
                isClearable={true}
                placeholderText={isRTL ? 'اختر الفترة الزمنية' : 'Select Date Range'}
                className="input w-full text-sm"
                dateFormat="yyyy-MM-dd"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
      </div>

      {/* Table */}
      <div className="card glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted-text)]">
            <span className="loading loading-spinner loading-md"></span>
            <p className="mt-2">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto min-h-[400px] hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead className={`bg-gray-50/50 dark:bg-gray-800/50 text-xs uppercase ${isLight ? 'text-black' : 'text-white'} font-semibold backdrop-blur-sm`}>
                <tr>
                  <th className="p-4 w-10 sticky left-0 z-10 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-sm">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-xs"
                      checked={paginatedItems.length > 0 && selectedItems.length === paginatedItems.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th onClick={() => handleSort('uuid')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors min-w-[120px]">
                    {isRTL ? 'رقم الطلب' : 'Order #'}
                  </th>
                  <th onClick={() => handleSort('status')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors min-w-[120px]">
                    {isRTL ? 'الحالة' : 'Status'}
                  </th>
                  <th onClick={() => handleSort('customerCode')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors min-w-[140px]">
                    {isRTL ? 'كود العميل' : 'Customer Code'}
                  </th>
                  <th onClick={() => handleSort('customerName')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors min-w-[180px]">
                    {isRTL ? 'اسم العميل' : 'Customer Name'}
                  </th>
                  <th onClick={() => handleSort('quotationId')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors min-w-[140px]">
                    {isRTL ? 'كود العرض' : 'Quotation Code'}
                  </th>
                  <th className="p-4 whitespace-nowrap min-w-[100px]">
                    {isRTL ? 'العناصر' : 'Items'}
                  </th>
                  <th onClick={() => handleSort('deliveryDate')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors min-w-[140px]">
                    {isRTL ? 'تاريخ التوصيل' : 'Delivery Date'}
                  </th>
                  <th onClick={() => handleSort('total')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors min-w-[120px]">
                    {isRTL ? 'الإجمالي' : 'Total'}
                  </th>
                  {false && (
                  <th onClick={() => handleSort('paymentTerms')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors min-w-[140px]">
                    {isRTL ? 'شروط الدفع' : 'Payment Terms'}
                  </th>
                  )}
                  <th className="p-4 whitespace-nowrap min-w-[100px]">
                    {isRTL ? 'المرفقات' : 'Attachment'}
                  </th>
                  <th onClick={() => handleSort('createdBy')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors min-w-[140px]">
                    {isRTL ? 'تم الإنشاء بواسطة' : 'Created By'}
                  </th>
                  <th onClick={() => handleSort('salesPerson')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors min-w-[140px]">
                    {isRTL ? 'موظف المبيعات' : 'Sales Person'}
                  </th>
                  <th onClick={() => handleSort('createdAt')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors min-w-[140px]">
                    {isRTL ? 'تاريخ الإنشاء' : 'Creation Date'}
                  </th>
                  <th className="p-4 text-end min-w-[100px]">
                    {isRTL ? 'إجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-sm">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="p-8 text-center text-[var(--muted-text)]">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-3xl">🔍</div>
                        <p>{isRTL ? 'لا توجد بيانات' : 'No data found'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`
                        group transition-colors cursor-pointer
                        ${activeRowId === item.id 
                          ? 'bg-blue-700/50' 
                          : 'hover:bg-gray-700/50 dark:hover:bg-gray-800/50'}
                        ${selectedItems.includes(item.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
                      `}
                      onClick={() => setActiveRowId(activeRowId === item.id ? null : item.id)}
                    >
                      <td className="p-4 sticky left-0 z-10  backdrop-blur-sm " onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="checkbox checkbox-xs"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className={`p-4 font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleView(item)
                          }}
                          className="hover:text-blue-600 hover:underline text-left"
                        >
                          {item.uuid || item.id}
                        </button>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          item.status === 'Draft' ? ` ${isLight ? 'text-black' : 'text-white'} border-gray-200  dark:text-gray-300 dark:border-gray-700` :
                          item.status === 'Confirmed' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' :
                          item.status === 'Delivered' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' :
                          'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className={`p-4 ${isLight ? 'text-black' : 'text-white'}`}>{item.customerCode || '-'}</td>
                      <td className={`p-4 ${isLight ? 'text-black' : 'text-white'} font-medium`}>{item.customerName || '-'}</td>
                      <td className="p-4 text-[var(--muted-text)]">{item.quotationId || '-'}</td>
                      <td className="p-4 text-center">
                        <span className=" px-2 py-0.5 rounded text-xs">
                          {Array.isArray(item.items) ? item.items.length : 0}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--muted-text)]">
                        {item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : '-'}
                      </td>
                      <td className={`p-4 ${isLight ? 'text-black' : 'text-white'}`}>{item.paymentType || '-'}</td>
                      <td className={`p-4 font-medium ${isLight ? 'text-black' : 'text-white'}`}>
                        {item.total ? item.total.toLocaleString() : '0'}
                      </td>
                      <td className="p-4 text-green-600">
                        {item.deposit ? item.deposit.toLocaleString() : '0'}
                      </td>
                      <td className="p-4 text-red-500">
                        {item.BalanceDue ? item.BalanceDue.toLocaleString() : '0'}
                      </td>
                      {false && (
                        <td className="p-4 text-[var(--muted-text)]">{item.paymentTerms || '-'}</td>
                      )}
                      <td className="p-4 text-center">
                        {item.attachments && item.attachments.length > 0 ? (
                          <span className="flex items-center justify-center gap-1 text-blue-600 text-xs">
                            <FaFileImport size={12} /> {item.attachments.length}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className={`p-4 ${isLight ? 'text-black' : 'text-white'}`}>{item.createdBy || '-'}</td>
                      <td className={`p-4 ${isLight ? 'text-black' : 'text-white'}`}>{item.salesPerson || '-'}</td>
                      <td className="p-4 text-[var(--muted-text)]">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className={`p-4 whitespace-nowrap ${activeRowId === item.id ? 'sticky ltr:right-0 rtl:left-0  shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)] dark:shadow-none z-10' : ''}`}>
                        <div className="flex items-center justify-end gap-2">
                          {/* Primary Action */}
                          {getAvailableActions(item.status)[0] && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusAction(item, getAvailableActions(item.status)[0].type)
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm ${getAvailableActions(item.status)[0].color.replace('text-', 'bg-').replace('600', '100')} ${getAvailableActions(item.status)[0].color} dark:bg-opacity-20`}
                              title={getAvailableActions(item.status)[0].label}
                            >
                              {React.createElement(getAvailableActions(item.status)[0].icon, { size: 12 })}
                              <span className="hidden xl:inline">{getAvailableActions(item.status)[0].label}</span>
                            </button>
                          )}

                          {/* View Button */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleView(item)
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors shadow-sm"
                            title={isRTL ? 'عرض' : 'View'}
                          >
                            <FaEye size={12} />
                            <span className="hidden xl:inline">{isRTL ? 'عرض' : 'View'}</span>
                          </button>

                          {/* Dropdown for other actions */}
                          {(getAvailableActions(item.status).length > 1 || true) && (
                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveActionDropdown(activeActionDropdown === item.id ? null : item.id)
                                }}
                                className={`flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isLight ? 'text-black' : 'text-white'} dark:text-gray-400`}
                              >
                                <FaEllipsisV size={12} />
                              </button>
                              
                              {activeActionDropdown === item.id && (
                                <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-1 w-48  rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden`}>
                                  <div className="py-1 bg-white ">
                                    {getAvailableActions(item.status).slice(1).map((action, idx) => (
                                      <button
                                        key={idx}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleStatusAction(item, action.type)
                                          setActiveActionDropdown(null)
                                        }}
                                        className={`w-full text-start px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${action.color}`}
                                      >
                                        <action.icon size={14} />
                                        {action.label}
                                      </button>
                                    ))}
                                    
                                    {/* Delete Option - Always available? Or constrained? Assuming constrained or generally available for admin */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDelete(item.id)
                                        setActiveActionDropdown(null)
                                      }}
                                      className="w-full text-start px-4 py-2 text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                                    >
                                      <FaTrash size={14} />
                                      {isRTL ? 'حذف' : 'Delete'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
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
               <div className="p-8 text-center text-[var(--muted-text)]">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-3xl">🔍</div>
                    <p>{isRTL ? 'لا توجد بيانات' : 'No data found'}</p>
                  </div>
               </div>
            ) : (
              paginatedItems.map((item) => (
                <div key={item.id} className="  rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className={`font-bold ${isLight ? 'text-black' : 'text-white'}`}>{item.customerName || '-'}</h3>
                      <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleView(item)
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                          {item.id}
                        </button>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          item.status === 'Draft' ? ` ${isLight ? 'text-black' : 'text-white'} border-gray-200  dark:text-gray-300 dark:border-gray-700` :
                          item.status === 'Confirmed' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' :
                          item.status === 'Delivered' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' :
                          'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                        }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                     <div className={`flex justify-between text-sm ${isLight ? 'text-black' : 'text-white'}`}>
                       <span className="text-[var(--muted-text)]">{isRTL ? 'التاريخ:' : 'Date:'}</span>
                       <span dir="ltr">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</span>
                     </div>
                     <div className={`flex justify-between text-sm ${isLight ? 'text-black' : 'text-white'}`}>
                       <span className="text-[var(--muted-text)]">{isRTL ? 'الإجمالي:' : 'Total:'}</span>
                       <span className="font-semibold">{item.total ? item.total.toLocaleString() : '0'}</span>
                     </div>
                      <div className={`flex justify-between text-sm ${isLight ? 'text-black' : 'text-white'}`}>
                       <span className="text-[var(--muted-text)]">{isRTL ? 'العناصر:' : 'Items:'}</span>
                       <span>{Array.isArray(item.items) ? item.items.length : 0}</span>
                     </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                       {/* Primary Action */}
                          {getAvailableActions(item.status)[0] && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusAction(item, getAvailableActions(item.status)[0].type)
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm ${getAvailableActions(item.status)[0].color.replace('text-', 'bg-').replace('600', '100')} ${getAvailableActions(item.status)[0].color} dark:bg-opacity-20`}
                              title={getAvailableActions(item.status)[0].label}
                            >
                              {React.createElement(getAvailableActions(item.status)[0].icon, { size: 12 })}
                              <span className="hidden xl:inline">{getAvailableActions(item.status)[0].label}</span>
                            </button>
                          )}
                           {/* View Button */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleView(item)
                            }}
                            className="p-2 rounded-lg bg-blue-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors shadow-sm"
                          >
                            <FaEye size={14} />
                          </button>
                           {/* Delete - if available */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(item.id)
                              }}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors shadow-sm"
                            >
                              <FaTrash size={14} />
                            </button>
                  </div>
                </div>
              ))
            )}
          </div>
          </>
        )}

        {/* Pagination */}
      <nav className="flex flex-col gap-4 p-3 lg:p-4 border-t border-theme-border dark:border-gray-700 dark:bg-transparent rounded-b-lg backdrop-blur-sm">
        {/* Row 1: Show Entries & Page Navigation */}
        <div className="flex  lg:flex-row justify-between items-center gap-3">
          {/* Show Entries */}
          <div className={`flex flex-wrap items-center gap-2 w-full lg:w-auto text-sm font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
            <span style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Show')}</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { 
                setItemsPerPage(Number(e.target.value)); 
                setCurrentPage(1); 
              }} 
              className={`px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'} dark:text-white text-xs`}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('entries')}</span>
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
              className={`ml-2 px-3 py-1.5 border border-theme-border dark:border-gray-600 rounded-lg  dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'} dark:text-white text-xs w-full sm:w-64 lg:w-28  dark:placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400`}
              style={{ color: theme === 'dark' ? '#ffffff' : undefined }}
            />
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`block px-3 py-2 leading-tight ${isLight ? 'text-black' : 'text-white'} border border-theme-border rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-transparent dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 backdrop-blur-sm`}
            >
              <span className={`sr-only ${isLight ? 'text-black' : 'text-white'} dark:text-white focus:text-white`}>{t('Previous')}</span>
              <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
            </button>
            <span className={`text-sm font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>
              {t('Page')} <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{currentPage}</span> {t('of')} <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{Math.ceil(filteredItems.length / itemsPerPage)}</span>
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredItems.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(filteredItems.length / itemsPerPage)}
              className={`block px-3 py-2 leading-tight ${isLight ? 'text-black' : 'text-white'} border border-theme-border rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-transparent dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 backdrop-blur-sm`}
            >
              <span className={`sr-only ${isLight ? 'text-black' : 'text-white'} dark:text-white focus:text-white`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Next')}</span>
              <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
            </button>
          </div>
        </div>

        {/* Row 2: Export Controls */}
        <div className="flex justify-center items-center">
          <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto border p-2 rounded-lg border-theme-border dark:border-gray-600  dark:bg-gray-700 justify-center">
            <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('Export Pages')}</span>
            <input
              type="number"
              min="1"
              max={Math.ceil(filteredItems.length / itemsPerPage)}
              placeholder="From"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className={`w-16 px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'} dark:text-white text-xs focus:border-blue-500`}
              style={{ color: theme === 'dark' ? '#ffffff' : undefined }}
            />
            <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white`} style={{ color: theme === 'dark' ? '#ffffff' : undefined }}>{t('to')}</span>
            <input
              type="number"
              min="1"
              max={Math.ceil(filteredItems.length / itemsPerPage)}
              placeholder="To"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className={`w-16 px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm ${isLight ? 'text-black' : 'text-white'} dark:text-white text-xs focus:border-blue-500`}
              style={{ color: theme === 'dark' ? '#ffffff' : undefined }}
            />
            <button
              onClick={handleExportRange}
              className={`btn btn-sm !text-white border-none flex items-center gap-1 ${
                (selectedItems.length > 0 || (exportFrom && exportTo && exportCount > 0))
                  ? 'bg-orange-500 hover:bg-orange-600' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <FaDownload size={12} />
              {(selectedItems.length > 0 || (exportFrom && exportTo && exportCount > 0)) ? `${isRTL ? 'تصدير المحدد' : 'Export Selected'} (${exportCount})` : t('Export')}
            </button>
          </div>
        </div>
      </nav>
      </div>
      
      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-up flex items-center gap-2">
          <span className="text-xl">✓</span>
          {successMessage}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <SalesOrdersImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          isRTL={isRTL}
        />
      )}

      <SalesOrdersFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingItem(null)
          setIsViewMode(false)
        }}
        onSave={handleSave}
        initialData={editingItem}
        readOnly={isViewMode}
        isRTL={isRTL}
      />

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <SalesInvoicesFormModal
          isOpen={showInvoiceModal}
          onClose={() => {
             setShowInvoiceModal(false)
             setInvoiceData(null)
             setInvoiceType(null)
          }}
          onSave={handleSaveInvoice}
          initialData={invoiceData}
          isRTL={isRTL}
        />
      )}

      {/* Preview Modal */}
      {showPreview && (
        <SalesOrderPreviewModal
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false)
            setPreviewOrder(null)
          }}
          order={previewOrder}
          isRTL={isRTL}
          onCreateInvoice={(type) => handleCreateInvoice(previewOrder, type)}
        />
      )}
    </div>
  )
}
