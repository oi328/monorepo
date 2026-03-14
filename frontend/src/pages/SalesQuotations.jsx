import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { api, logExportEvent } from '../utils/api'
import { useTheme } from '../shared/context/ThemeProvider'
import { FaDownload, FaFileExport, FaPlus, FaFileImport, FaEye, FaEdit, FaTrash, FaStickyNote, FaShoppingCart } from 'react-icons/fa'
import { Filter, ChevronDown, Search, User, DollarSign, Calendar } from 'lucide-react'
import SearchableSelect from '../components/SearchableSelect'
import QuotationsFormModal from '../components/QuotationsFormModal'
import QuotationsImportModal from '../components/QuotationsImportModal'
import QuotationPreviewModal from '../components/QuotationPreviewModal'
import SalesOrdersFormModal from '../components/SalesOrdersFormModal'
import * as XLSX from 'xlsx'

// Mock data removed

export default function SalesQuotations() {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const isRTL = String(i18n.language || '').startsWith('ar')
  
  // State
  const [items, setItems] = useState([])
  const [customersList, setCustomersList] = useState([])
  const [usersList, setUsersList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [previewItem, setPreviewItem] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [activeRowId, setActiveRowId] = useState(null)
  const [expandedRowId, setExpandedRowId] = useState(null)
  
  // Conversion State
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderData, setOrderData] = useState(null)
  
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
  const [pageSearch, setPageSearch] = useState('')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')

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
      
      const [quotationsRes, customersRes, usersRes] = await Promise.all([
        api.get('/api/quotations?all=1'),
        api.get('/api/customers?all=1'),
        api.get('/api/users?all=1')
      ])

      const rawQuotations = quotationsRes.data?.data || quotationsRes.data || []
      const usersData = usersRes.data?.data || usersRes.data || []
      const customersData = customersRes.data?.data || customersRes.data || []

      const usersById = {}
      ;(Array.isArray(usersData) ? usersData : []).forEach(u => {
        usersById[u.id] = u.name || u.username || ''
      })

      const mapped = (Array.isArray(rawQuotations) ? rawQuotations : []).map(q => {
        // Debugging logs for empty fields
        if (!q.created_by && !q.created_by_name) console.warn('Missing created_by for quotation:', q.id, q);
        if (q.tax === undefined && q.tax_amount === undefined) console.warn('Missing tax for quotation:', q.id, q);

        return {
        id: q.id,
        quotationCode: q.meta_data?.quotation_code || q.id, // Prefer code from meta_data
        customerCode: q.customer?.customer_code || q.customer_id || q.customer_code || q.customerCode || '',
        customerName: q.customer_name || q.customerName || '',
        status: q.status || 'Draft',
        items: Array.isArray(q.items) ? q.items : [],
        subtotal: Number(q.subtotal || 0),
         tax: Number(q.tax || q.tax_amount || 0),
         discount: Number(q.discount || q.discount_amount || 0),
         total: Number(q.total || 0),
        createdBy: q.created_by_name || usersById[q.created_by] || (q.created_by ? String(q.created_by) : '') || 'System', // Fallback to 'System' or ID if name not found
        salesPerson: q.sales_person_name || usersById[q.sales_person] || q.sales_person || q.salesPerson || '',
        createdAt: q.created_at || q.date || new Date().toISOString(),
        expiryDate: q.valid_until || q.expiryDate || '',
        notes: q.notes || '',
        attachment: q.meta_data?.attachment || null,
        attachmentName: q.meta_data?.attachment_name || null
      }})
      setItems(mapped)
      setCustomersList(Array.isArray(customersData) ? customersData : [])
      setUsersList(Array.isArray(usersData) ? usersData : [])

    } catch (e) {
      console.error('Failed to load data', e)
      setError('Failed to load data')
      // Don't clear items if just one fails, but here we might want to be careful
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Removed useEffect that was saving to localStorage on every change


  // Filtering Logic
  const customerOptions = useMemo(() => {
    // Combine existing items' customers with fetched customers to ensure we have all used ones + all available ones
    const fromItems = items.map(i => i.customerName).filter(Boolean)
    const fromList = customersList.map(c => c.name || c.company_name).filter(Boolean)
    const unique = [...new Set([...fromItems, ...fromList])]
    return unique.map(name => ({ value: name, label: name }))
  }, [items, customersList])

  const createdByOptions = useMemo(() => {
    const fromItems = items.map(i => i.createdBy).filter(Boolean)
    const fromList = usersList.map(u => u.name).filter(Boolean)
    const unique = [...new Set([...fromItems, ...fromList])]
    return unique.map(name => ({ value: name, label: name }))
  }, [items, usersList])

  const salesPersonOptions = useMemo(() => {
    const fromItems = items.map(i => i.salesPerson).filter(Boolean)
    const fromList = usersList.map(u => u.name).filter(Boolean)
    const unique = [...new Set([...fromItems, ...fromList])]
    return unique.map(name => ({ value: name, label: name }))
  }, [items, usersList])

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
        // Add one day to include the end date fully
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

  const handleDelete = async (id) => {
    if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا العرض؟' : 'Are you sure you want to delete this quotation?')) {
      setLoading(true)
      try {
        await api.delete(`/api/quotations/${id}`)
        await load()
        showSuccess(isRTL ? 'تم حذف العرض بنجاح' : 'Quotation deleted successfully')
      } catch (e) {
        alert(isRTL ? 'فشل الحذف' : 'Delete failed')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleConvertToOrder = (quotation) => {
    // Calculate discount rate if amount is present
    const discountAmount = Number(quotation.discount || 0)
    const subtotal = Number(quotation.subtotal || 0)
    const discountRate = subtotal > 0 ? discountAmount / subtotal : 0

    // Prepare order data from quotation
    const newOrder = {
        id: `SO-${Date.now()}`, // Generate a temporary new ID
        quotationId: quotation.id,
        customerCode: quotation.customerCode,
        customerName: quotation.customerName,
        items: quotation.items || [],
        total: quotation.total,
        tax: quotation.tax,
        discountRate: discountRate, // Pass calculated rate
        salesPerson: quotation.salesPerson,
        status: 'Draft',
        date: new Date().toISOString().split('T')[0], // Default to today
        deliveryDate: '', // Let user fill this
        paymentTerms: '', // Let user fill this
        notes: quotation.notes || ''
    }
    setOrderData(newOrder)
    setShowOrderModal(true)
  }

  const handleImport = async (importedItems) => {
    try {
        setLoading(true)
        // Process sequentially or in parallel? Parallel is faster.
        const promises = importedItems.map(item => {
            const payload = {
                customer_id: item.customerCode || item.customer_id || '',
                customer_name: item.customerName || item.customer_name || '',
                status: item.status || 'Draft',
                date: item.createdAt || item.date || new Date().toISOString(),
                valid_until: item.expiryDate || item.valid_until || '',
                subtotal: item.subtotal || 0,
                total: item.total || 0,
                items: item.items || [],
                notes: item.notes || '',
                sales_person: item.salesPerson || item.sales_person || '',
                tax: item.tax || 0
            }
            if (payload.customer_id !== undefined && payload.customer_id !== null) payload.customer_id = String(payload.customer_id)
            if (payload.sales_person !== undefined && payload.sales_person !== null) payload.sales_person = String(payload.sales_person)
            if (!payload.valid_until) delete payload.valid_until
            if (!payload.date) delete payload.date
            return api.post('/api/quotations', payload)
        })

        await Promise.all(promises)
        
        load() // Refresh list
        setShowImportModal(false)
        showSuccess(isRTL ? 'تم استيراد البيانات بنجاح' : 'Data imported successfully')
    } catch (e) {
        console.error('Import failed', e)
        alert(isRTL ? 'فشل الاستيراد' : 'Import failed')
    } finally {
        setLoading(false)
    }
  }

  const handleExport = () => {
    // 1. Export Selected
    if (selectedItems.length > 0) {
      const itemsToExport = items.filter(item => selectedItems.includes(item.id))
      const data = itemsToExport.map(item => ({
        ID: item.id,
        'Customer Code': item.customerCode,
        'Customer Name': item.customerName,
        'Total': item.total,
        'Created By': item.createdBy,
        'Sales Person': item.salesPerson,
        'Date': new Date(item.createdAt).toLocaleDateString(),
        'Notes': item.notes
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Selected Quotations")
      const fileName = "Selected_Quotations_Export.xlsx"
      XLSX.writeFile(wb, fileName)
      logExportEvent({
        module: 'Sales Quotations',
        fileName,
        format: 'xlsx',
      })
      showSuccess(isRTL ? 'تم تصدير العناصر المحددة بنجاح' : 'Selected items exported successfully')
      return
    }

    // 2. Export Range
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
      'Customer Code': item.customerCode,
      'Customer Name': item.customerName,
      'Total': item.total,
      'Created By': item.createdBy,
      'Sales Person': item.salesPerson,
      'Date': new Date(item.createdAt).toLocaleDateString(),
      'Notes': item.notes
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Quotations")
    const fileName = "Quotations_Export.xlsx"
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Sales Quotations',
      fileName,
      format: 'xlsx',
    })
  }

  // Options for filters
  // const statusOptions = useMemo(() => [...new Set(items.map(i => i.status).filter(Boolean))], [items])

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
      <div className=" rounded-xl p-4 md:p-6 relative  mb-6">
        <div className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3">
            <div className="relative flex flex-col items-start gap-1">
              <h1 className={`text-xl md:text-2xl font-bold text-start ${isLight ? 'text-black' : 'text-white'} dark:text-white flex items-center gap-2`}>
                {t('Quotations')}
                <span className="text-sm font-normal text-[var(--muted-text)] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  {filteredItems.length}
                </span>
              </h1>
              <span aria-hidden="true" className="inline-block h-[2px] w-full rounded bg-gradient-to-r from-blue-500 to-purple-600" />
              <p className="text-sm text-[var(--muted-text)] mt-1">
                {isRTL ? 'إدارة عروض الأسعار' : 'Manage your sales quotations'}
              </p>
            </div>
          </div>
          
          <div className="w-full lg:w-auto flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 !text-white border-none flex items-center justify-center gap-2"
            >
              <FaFileImport />
              {isRTL ? 'استيراد' : 'Import'}
            </button>
            
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-green-500 !text-white border-none flex items-center justify-center gap-2"
            >
              <FaPlus />
              {isRTL ? 'إضافة ء عرض سعر' : 'Add Quotation'}
            </button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-3 p-3 rounded border border-green-300 bg-green-50 text-green-700">{successMessage}</div>
      )}

      {/* Filter Section */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. SEARCH */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <Search className="text-blue-500" size={10} /> {isRTL ? 'بحث عام' : 'Search All Data'}
            </label>
            <input
              className="input w-full"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={isRTL ? 'بحث في العروض...' : 'Search quotations...'}
            />
          </div>

          {/* 2. Customer */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1">
              <User className="text-blue-500" size={10} /> {isRTL ? 'العميل' : 'Customer'}
            </label>
            <SearchableSelect
              options={customerOptions}
              value={filters.customer}
              onChange={(val) => setFilters(prev => ({ ...prev, customer: val }))}
              placeholder={isRTL ? 'اختر العميل...' : 'Select Customer...'}
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

          {showAllFilters && (
            <>
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
                  <Calendar className="text-blue-500" size={10} /> {isRTL ? 'تاريخ الانشاء' : 'Creation Date'}
                </label>
                <DatePicker
                    popperContainer={({ children }) => createPortal(children, document.body)}
                    selectsRange={true}
                    startDate={filters.dateFrom ? new Date(filters.dateFrom) : null}
                    endDate={filters.dateTo ? new Date(filters.dateTo) : null}
                    onChange={(update) => {
                      const [start, end] = update;
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
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-panel rounded-xl overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-10 flex items-center justify-center">
            <div className="loading loading-spinner loading-lg text-blue-600"></div>
          </div>
        )}
        
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead className={`bg-gray-50/50 dark:bg-gray-800/50 text-xs uppercase ${isLight ? 'text-black' : 'text-white'} font-semibold backdrop-blur-sm`}>
              <tr>
                <th className="p-4 w-10">
                </th>
                <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    className="checkbox checkbox-xs"
                    checked={paginatedItems.length > 0 && selectedItems.length === paginatedItems.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th onClick={() => handleSort('id')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'رقم العرض' : 'Quotation #'}
                </th>
                <th onClick={() => handleSort('customerCode')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'كود العميل' : 'Customer Code'}
                </th>
                <th onClick={() => handleSort('customerName')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'اسم العميل' : 'Customer Name'}
                </th>
                <th onClick={() => handleSort('status')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'الحالة' : 'Status'}
                </th>
                <th className="p-4 whitespace-nowrap">
                  {isRTL ? 'عدد العناصر' : 'Items'}
                </th>
                <th onClick={() => handleSort('subtotal')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'المجموع الفرعي' : 'Subtotal'}
                </th>
                <th onClick={() => handleSort('tax')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'الضريبة' : 'Tax'}
                </th>
                <th onClick={() => handleSort('total')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'الإجمالي' : 'Total'}
                </th>
                <th onClick={() => handleSort('createdBy')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'بواسطة' : 'Created By'}
                </th>
                <th onClick={() => handleSort('salesPerson')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'مندوب المبيعات' : 'Sales Person'}
                </th>
                <th onClick={() => handleSort('createdAt')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'تاريخ الإنشاء' : 'Creation Date'}
                </th>
                <th onClick={() => handleSort('expiryDate')} className="p-4 cursor-pointer hover:text-blue-600 whitespace-nowrap transition-colors">
                  {isRTL ? 'صالح حتى' : 'Valid Until'}
                </th>
                <th className="p-4 whitespace-nowrap">
                  {isRTL ? 'ملاحظات' : 'Notes'}
                </th>
                <th className="p-4 whitespace-nowrap w-[140px]">
                  {isRTL ? 'خيارات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className={`p-8 text-center ${isLight ? 'text-black' : 'text-white'}`}>
                    {isRTL ? 'لا توجد بيانات' : 'No data available'}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr 
                      className={`transition-colors group cursor-pointer ${activeRowId === item.id ? ' dark:bg-blue-900/20' : 'hover:bg-blue-900/10'}`}
                      onClick={() => setActiveRowId(activeRowId === item.id ? null : item.id)}
                    >
                      <td className="p-4 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRowId(expandedRowId === item.id ? null : item.id);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <ChevronDown size={16} className={`transform transition-transform duration-200 ${expandedRowId === item.id ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="checkbox checkbox-xs"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                        />
                      </td>
                    <td className="p-4 font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {item.quotationCode || item.id}
                    </td>
                    <td className={`p-4 ${isLight ? 'text-black' : 'text-white'} whitespace-nowrap`}>
                      {item.customerCode || '—'}
                    </td>
                    <td className={`p-4 ${isLight ? 'text-black' : 'text-white'} whitespace-nowrap`}>
                      {item.customerName || '—'}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        item.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        item.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status || 'Draft'}
                      </span>
                    </td>
                    <td className={`p-4 ${isLight ? 'text-black' : 'text-white'} whitespace-nowrap text-center`}>
                      {item.items ? item.items.length : 0}
                    </td>
                    <td className={`p-4 ${isLight ? 'text-black' : 'text-white'} whitespace-nowrap`}>
                      {Number(item.subtotal || 0).toLocaleString()}
                    </td>
                    <td className={`p-4 ${isLight ? 'text-black' : 'text-white'} whitespace-nowrap`}>
                      {Number(item.tax || 0).toLocaleString()}
                    </td>
                    <td className={`p-4 font-semibold ${isLight ? 'text-black' : 'text-white'} whitespace-nowrap`}>
                      {Number(item.total).toLocaleString()}
                    </td>
                    <td className={`p-4 ${isLight ? 'text-black' : 'text-white'} whitespace-nowrap`}>
                      {item.createdBy || '—'}
                    </td>
                     <td className={`p-4 ${isLight ? 'text-black' : 'text-white'} whitespace-nowrap`}>
                      {item.salesPerson || '—'}
                    </td>
                    <td className={`p-4 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'}`} dir="ltr">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className={`p-4 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'}`} dir="ltr">
                      {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}
                    </td>
                    <td className={`p-4 whitespace-nowrap ${isLight ? 'text-black' : 'text-white'} text-center`}>
                      {item.notes ? (
                        <div className="tooltip" data-tip={item.notes}>
                          <FaStickyNote className="text-yellow-500 inline-block" />
                        </div>
                      ) : '—'}
                    </td>
                    <td className={`p-4 whitespace-nowrap ${activeRowId === item.id ? 'sticky ltr:right-0 rtl:left-0 bg-theme-bg shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)] dark:shadow-none z-10' : ''}`}>
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 transition-colors shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleConvertToOrder(item)
                          }}
                          title={isRTL ? 'تحويل لطلب' : 'Convert to Order'}
                        >
                          <FaShoppingCart size={14} />
                          <span className="hidden xl:inline">{isRTL ? 'تحويل' : 'Convert'}</span>
                        </button>
                        <button 
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewItem(item)
                          }}
                        >
                          <FaEye size={14} />
                          <span className="hidden xl:inline">{isRTL ? 'معاينة' : 'Preview'}</span>
                        </button>
                        <button 
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingItem(item)
                            setShowForm(true)
                          }}
                        >
                          <FaEdit size={14} />
                          <span className="hidden xl:inline">{isRTL ? 'تعديل' : 'Edit'}</span>
                        </button>
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
                      </div>
                    </td>
                  </tr>
                  {expandedRowId === item.id && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan="12" className="p-4">
                        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                          <table className="w-full text-sm text-left">
                            <thead className={`bg-gray-100 dark:bg-gray-800 text-xs uppercase ${isLight ? 'text-black' : 'text-white'} font-semibold`}>
                              <tr>
                                <th className="px-4 py-2">{isRTL ? 'النوع' : 'Type'}</th>
                                <th className="px-4 py-2">{isRTL ? 'الفئة' : 'Category'}</th>
                                <th className="px-4 py-2">{isRTL ? 'اسم العنصر' : 'Item Name'}</th>
                                <th className="px-4 py-2">{isRTL ? 'الكمية' : 'Qty'}</th>
                                <th className="px-4 py-2">{isRTL ? 'السعر' : 'Price'}</th>
                                <th className="px-4 py-2">{isRTL ? 'الخصم' : 'Discount'}</th>
                                <th className="px-4 py-2">{isRTL ? 'المجموع' : 'Total'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {item.items && item.items.length > 0 ? (
                                item.items.map((subItem, idx) => (
                                  <tr key={idx} className="hover:bg-gray-200 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-2">{subItem.type || '—'}</td>
                                    <td className="px-4 py-2">{subItem.category || '—'}</td>
                                    <td className="px-4 py-2 font-medium">{subItem.name}</td>
                                    <td className="px-4 py-2">{subItem.quantity}</td>
                                    <td className="px-4 py-2">{Number(subItem.price).toLocaleString()}</td>
                                    <td className="px-4 py-2">{Number(subItem.discount || 0).toLocaleString()}</td>
                                    <td className="px-4 py-2 font-semibold">
                                      {((subItem.quantity * subItem.price) - (subItem.discount || 0)).toLocaleString()}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="8" className="px-4 py-4 text-center text-gray-500">
                                    {isRTL ? 'لا توجد عناصر' : 'No items found'}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
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
              <div key={item.id} className=" rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className={`font-bold ${isLight ? 'text-black' : 'text-white'}`}>{item.customerName || '—'}</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{item.quotationCode || item.id}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    item.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    item.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    item.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.status || 'Draft'}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className={`flex justify-between text-sm ${isLight ? 'text-black' : 'text-white'}`}>
                    <span className="text-[var(--muted-text)]">{isRTL ? 'التاريخ:' : 'Date:'}</span>
                    <span dir="ltr">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className={`flex justify-between text-sm ${isLight ? 'text-black' : 'text-white'}`}>
                    <span className="text-[var(--muted-text)]">{isRTL ? 'المجموع:' : 'Total:'}</span>
                    <span className="font-semibold">{Number(item.total).toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between text-sm ${isLight ? 'text-black' : 'text-white'}`}>
                    <span className="text-[var(--muted-text)]">{isRTL ? 'عدد العناصر:' : 'Items:'}</span>
                    <span>{item.items ? item.items.length : 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button 
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewItem(item)
                    }}
                  >
                    <FaEye size={16} />
                  </button>
                  <button 
                    className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingItem(item)
                      setShowForm(true)
                    }}
                  >
                    <FaEdit size={16} />
                  </button>
                  <button 
                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(item.id)
                    }}
                  >
                    <FaTrash size={16} />
                  </button>
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
              className="w-16 px-2 py-1 border border-theme-border dark:border-gray-600 rounded-md dark:bg-transparent backdrop-blur-sm text-white text-xs focus:border-blue-500"
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
              onClick={handleExport}
              className={`btn btn-sm ${selectedItems.length > 0 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} !text-white border-none flex items-center gap-1`}
            >
              {selectedItems.length > 0 ? <FaFileExport size={12} /> : <FaDownload size={12} />}
              {selectedItems.length > 0 
                ? (isRTL ? `تصدير المحدد (${selectedItems.length})` : `Export Selected (${selectedItems.length})`) 
                : t('Export')}
            </button>
          </div>
        </div>
      </nav>
      </div>

      {/* Form Modal */}
      <QuotationsFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingItem(null)
        }}
        onSave={async (data) => {
          try {
            const formData = new FormData();
            
            // Helper to append data
            const appendData = (key, value) => {
                if (value === null || value === undefined) return;
                if (typeof value === 'object' && !(value instanceof File)) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, value);
                }
            };

            // Map fields
            const customerId = data.customerCode ?? editingItem?.customerCode ?? editingItem?.customer_id;
            const salesPerson = data.salesPerson ?? editingItem?.salesPerson ?? editingItem?.sales_person;
            
            if (customerId) formData.append('customer_id', String(customerId));
            if (data.customerName) formData.append('customer_name', data.customerName);
            if (data.status) formData.append('status', data.status);
            if (data.date) formData.append('date', data.date);
            if (data.expiryDate) formData.append('valid_until', data.expiryDate);
            if (data.subtotal !== undefined) formData.append('subtotal', data.subtotal);
            if (data.total !== undefined) formData.append('total', data.total);
            if (data.items) formData.append('items', JSON.stringify(data.items)); // Send as JSON string
            if (data.notes) formData.append('notes', data.notes);
            if (salesPerson) formData.append('sales_person', String(salesPerson));
            if (data.tax !== undefined) formData.append('tax', data.tax);
            
            // Attachment
            if (data.attachment instanceof File) {
                formData.append('attachment', data.attachment);
            }

            if (editingItem) {
              formData.append('_method', 'PUT'); // Laravel method spoofing for FormData
              await api.post(`/api/quotations/${editingItem.id}`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
              });
              await load();
              showSuccess(isRTL ? 'تم تحديث عرض السعر' : 'Quotation updated successfully');
            } else {
              await api.post('/api/quotations', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
              });
              await load();
              showSuccess(isRTL ? 'تم إضافة عرض السعر' : 'Quotation added successfully');
            }
            setShowForm(false)
            setEditingItem(null)
          } catch (e) {
             console.error('Save failed', e)
             alert(isRTL ? 'فشل الحفظ' : 'Save failed')
          }
        }}
        initialData={editingItem}
        isRTL={isRTL}
      />

      <QuotationPreviewModal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        quotation={previewItem}
      />

      <SalesOrdersFormModal
        isOpen={showOrderModal}
        onClose={() => {
            setShowOrderModal(false)
            setOrderData(null)
        }}
        onSave={async (data) => {
            try {
                // Save Order
                await api.post('/api/sales-orders', data)
                // Update Quotation Status if needed (e.g., to Sent or Accepted)
                // await api.put(`/api/quotations/${data.quotationId}`, { status: 'Accepted' })
                
                showSuccess(isRTL ? 'تم إنشاء الطلب بنجاح' : 'Order created successfully')
                setShowOrderModal(false)
                setOrderData(null)
                load() // Refresh quotations to show status change if any
            } catch (e) {
                console.error('Failed to create order', e)
                alert(isRTL ? 'فشل إنشاء الطلب' : 'Failed to create order')
            }
        }}
        initialData={orderData}
        isRTL={isRTL}
      />

      {showImportModal && (
        <QuotationsImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          isRTL={isRTL}
        />
      )}

    </div>
  )
}
