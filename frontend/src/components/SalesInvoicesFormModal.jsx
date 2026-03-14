import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../shared/context/ThemeProvider'
import { api } from '../utils/api'
import { FaFileInvoiceDollar, FaTimes, FaHashtag, FaUser, FaBoxOpen, FaCalendarAlt, FaPlus, FaTrash, FaStickyNote, FaPaperclip, FaSave } from 'react-icons/fa'
import SearchableSelect from './SearchableSelect'

const SalesInvoicesFormModal = ({ isOpen, onClose, onSave, initialData = null, isRTL, readOnly = false }) => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const [customers, setCustomers] = useState([])
  const [availableOrders, setAvailableOrders] = useState([])
  const [invoices, setInvoices] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [salesPersons, setSalesPersons] = useState([])
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          setLoadingData(true)
          const [cRes, catRes, itemsRes, oRes, iRes, usersRes] = await Promise.all([
            api.get('/api/customers'),
            api.get('/api/item-categories'),
            api.get('/api/items'),
            api.get('/api/sales-orders'),
            api.get('/api/sales-invoices'),
            api.get('/api/users')
          ])

          if (cRes.data?.data) {
            setCustomers(cRes.data.data.map(c => ({
              ...c, 
              code: c.customer_code, 
              name: c.name || c.customer_name || c.company_name || (isRTL ? 'بدون اسم' : 'No Name'),
              assignedSalesRep: c.assignee?.name || c.assigned_to
            })))
          }

          const catData = catRes.data?.data || catRes.data || []
          setCategories(catData.map(c => ({
              value: c.name,
              label: c.name
          })))

          if (itemsRes.data?.data) {
            const mappedItems = itemsRes.data.data.map(item => ({
               id: item.id,
               name: item.name,
               price: item.price || 0,
               type: 'Product',
               category: item.category
            }))
            setProducts(mappedItems)
          }

          const oData = oRes.data.data || oRes.data || []
          if (Array.isArray(oData)) {
            setAvailableOrders(oData.map(o => ({
              ...o,
              // Use uuid for display if available, fallback to id
              label: o.uuid || o.id,
              customerCode: o.customer_code || o.customerCode,
              customerName: o.customer_name || o.customerName,
              salesPerson: o.sales_person || o.salesPerson,
            })))
          }

          const iData = iRes.data.data || iRes.data || []
          if (Array.isArray(iData)) {
            setInvoices(iData.map(i => ({
              ...i,
              orderId: i.order_id || i.orderId,
              invoiceType: i.invoice_type || i.invoiceType,
              items: i.items || []
            })))
          }

          const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || [])
          const filteredSales = rawUsers.filter(u => {
            const role = String(u.role || (Array.isArray(u.roles) && u.roles[0]?.name) || u.job_title || '').toLowerCase()
            const status = String(u.status || '').toLowerCase()
            const isSalesRole = role.includes('sales') || role.includes('agent') || role.includes('broker')
            const isActive = status === 'active' || status === ''
            return isSalesRole && isActive
          }).map(u => ({
            id: u.id,
            value: u.name || u.fullName || u.username,
            label: `${u.name || u.fullName} (${u.username || 'N/A'})`,
            username: u.username
          }))
          setSalesPersons(filteredSales)

        } catch (err) {
          console.error('Error loading form data:', err)
        } finally {
          setLoadingData(false)
        }
      }
      fetchData()
    }
  }, [isOpen])
  
  const [formData, setFormData] = useState({
    id: '',
    orderId: '',
    customerCode: '',
    customerName: '',
    status: 'Draft',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [], // Array of line items
    tax: 0,
    paidAmount: 0,
    paymentTerms: '',
    paymentMethod: '', // Renamed from paymentType to paymentMethod as per strict requirements
    invoiceType: 'Full', // Advance, Partial, Full
    notes: '',
    attachment: null,
    salesPerson: '',
    discountRate: 0
  })

  const [errors, setErrors] = useState({})

  const [isManual, setIsManual] = useState(false)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        orderId: initialData.orderId || '',
        date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
        items: initialData.items || [],
        tax: initialData.tax || 0,
        paidAmount: initialData.paidAmount || 0,
        discountRate: initialData.discountRate || 0,
        customerCode: initialData.customerCode || '',
        customerName: initialData.customerName || '',
        salesPerson: initialData.salesPerson || '',
        paymentTerms: initialData.paymentTerms || '',
        paymentMethod: initialData.paymentMethod || initialData.paymentType || '',
        invoiceType: initialData.invoiceType || 'Full',
        status: initialData.status || 'Draft'
      })
      // If no order ID, assume manual
      setIsManual(!initialData.orderId)
    } else {
      setFormData({
        id: `INV-${Math.floor(Math.random() * 10000)}`,
        orderId: '',
        customerCode: '',
        customerName: '',
        status: 'Draft',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        items: [],
        tax: 0,
        paidAmount: 0,
        discountRate: 0,
        paymentTerms: '',
        paymentMethod: '',
        invoiceType: 'Full',
        notes: '',
        attachment: null,
        salesPerson: ''
      })
      setIsManual(false)
    }
    setIsNewCustomer(false)
    setErrors({})
  }, [initialData, isOpen])

  const [paymentTermsOptions, setPaymentTermsOptions] = useState([
    { value: 'Immediate', label: isRTL ? 'فوري' : 'Immediate' },
    { value: 'Net 15', label: isRTL ? '15 يوم' : 'Net 15' },
    { value: 'Net 30', label: isRTL ? '30 يوم' : 'Net 30' },
    { value: 'Net 60', label: isRTL ? '60 يوم' : 'Net 60' },
    { value: 'COD', label: isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery' }
  ])

  // Resolve Sales Person name if it's an ID
  useEffect(() => {
    if (formData.salesPerson && !isNaN(formData.salesPerson) && salesPersons.length > 0) {
      const user = salesPersons.find(u => String(u.id) === String(formData.salesPerson));
      if (user) {
        setFormData(prev => ({ ...prev, salesPerson: user.value }));
      }
    }
  }, [salesPersons, formData.salesPerson])

  // Calculations
  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.price) || 0
      const discount = parseFloat(item.discount) || 0
      return sum + (qty * price) - discount
    }, 0)
  }

  const subtotal = calculateSubtotal()
  const globalDiscountAmount = subtotal * (formData.discountRate || 0)
  const taxAmount = parseFloat(formData.tax) || 0
  const total = subtotal - globalDiscountAmount + taxAmount
  const balanceDue = total - (parseFloat(formData.paidAmount) || 0)

  // Helper to calculate items based on Order and Type
  const calculateInvoiceItems = (order, type) => {
    if (!order) return { items: [], paidAmount: 0 }

    let newItems = []
    let newPaidAmount = 0

    // Advanced Deduction Logic
    const allInvoices = invoices.filter(i => i.orderId === order.id && i.status !== 'Cancelled')
    
    // 1. Total Advance Paid
    const totalAdvancePaid = allInvoices
      .filter(i => i.invoiceType === 'Advance')
      .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0)

    // 2. Total Advance Already Deducted (in previous Partial/Full invoices)
    const totalAdvanceDeducted = allInvoices
      .filter(i => i.invoiceType !== 'Advance')
      .reduce((sum, inv) => {
        const deductItem = inv.items.find(item => item.id === 'ADV-DEDUCT')
        return sum + (deductItem ? Math.abs(parseFloat(deductItem.price) || 0) : 0)
      }, 0)
      
    const remainingAdvance = Math.max(0, totalAdvancePaid - totalAdvanceDeducted)

    if (type === 'Advance') {
      // Advance: Create a single item for advance payment (e.g., 30% of remaining value)
      const totalOrderValue = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0)
      const advanceValue = totalOrderValue * 0.30
      
      newItems = [{
        id: Date.now(),
        name: isRTL ? 'دفعة مقدمة' : 'Advance Payment',
        quantity: 1,
        price: advanceValue,
        discount: 0,
        type: 'Service',
        category: 'Financial'
      }]
      newPaidAmount = advanceValue 
    } else if (type === 'Full' || type === 'Partial') {
      // Load items
      newItems = order.items
        .map(item => {
          const remaining = item.quantity - (item.invoicedQuantity || 0)
          return {
            ...item,
            quantity: remaining,
            discount: item.discount || 0
          }
        })
        .filter(item => item.quantity > 0)
      
      // Calculate Subtotal of items to ensure we don't deduct more than the invoice value
      const itemsSubtotal = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0)
      
      // Add Deduction if exists
      if (remainingAdvance > 0) {
        const deductionAmount = Math.min(itemsSubtotal, remainingAdvance)
        
        if (deductionAmount > 0) {
            newItems.push({
              id: 'ADV-DEDUCT',
              name: isRTL ? 'خصم دفعة مقدمة' : 'Less: Advance Payment',
              quantity: 1,
              price: -deductionAmount,
              discount: 0,
              type: 'Service',
              category: 'Financial'
            })
        }
      }
    }
    
    return { items: newItems, paidAmount: newPaidAmount }
  }

  // Handle Invoice Type Change Logic
  const handleInvoiceTypeChange = (type) => {
    if (isManual || !formData.orderId) {
      setFormData(prev => ({ ...prev, invoiceType: type }))
      return
    }

    const order = availableOrders.find(o => o.id === formData.orderId)
    if (!order) return

    const { items: newItems, paidAmount: newPaidAmount } = calculateInvoiceItems(order, type)

    setFormData(prev => ({
      ...prev,
      invoiceType: type,
      items: newItems,
      paidAmount: newPaidAmount
    }))
  }

  if (!isOpen) return null

  const validate = () => {
    const newErrors = {}
    if (!formData.customerName) newErrors.customerName = isRTL ? 'اسم العميل مطلوب' : 'Customer Name is required'
    if (!formData.dueDate) newErrors.dueDate = isRTL ? 'تاريخ الاستحقاق مطلوب' : 'Due Date is required'
    if (!isManual && !formData.orderId) newErrors.orderId = isRTL ? 'رقم طلب البيع مطلوب' : 'Reference Sales Order is required'
    if (!formData.invoiceType) newErrors.invoiceType = isRTL ? 'نوع الفاتورة مطلوب' : 'Invoice Type is required'
    if (formData.items.length === 0) newErrors.items = isRTL ? 'يجب إضافة عنصر واحد على الأقل' : 'At least one item is required'
    
    // Validate Paid Amount
    if (formData.paidAmount > total) {
       newErrors.paidAmount = isRTL ? 'المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي' : 'Paid Amount cannot exceed Total'
    }
    
    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.name) newErrors[`item_name_${index}`] = true
      if (!item.quantity || item.quantity <= 0) newErrors[`item_qty_${index}`] = true
      // if (!item.price || item.price < 0) newErrors[`item_price_${index}`] = true // Allow zero price for some cases?
    })

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0]
      if (typeof firstError === 'string') {
        alert(firstError)
      } else {
        alert(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (validate()) {
      // If new customer, save them first
      let finalCustomerCode = formData.customerCode
      if (isNewCustomer && !finalCustomerCode) {
         try {
             const tempCode = `CUST-${Math.floor(Math.random() * 10000)}`
             const res = await api.post('/api/customers', {
                company_name: formData.customerName,
                customer_code: tempCode
             })
             if (res.data?.data?.customer_code) {
                 finalCustomerCode = res.data.data.customer_code
             } else {
                 finalCustomerCode = tempCode
             }
         } catch (err) {
             console.error("Failed to create customer", err)
             return
         }
      }

      onSave({ 
        ...formData, 
        customerCode: finalCustomerCode,
        subtotal, 
        discountAmount: globalDiscountAmount,
        total,
        balanceDue,
        createdAt: new Date().toISOString()
      })
    }
  }

  // Item Management
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), type: 'Product', category: '', name: '', quantity: 1, price: 0, discount: 0 }
      ]
    }))
  }

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }))
  }

  // Options
  const itemTypeOptions = [
    { value: 'Product', label: isRTL ? 'منتج' : 'Product' },
    { value: 'Service', label: isRTL ? 'خدمة' : 'Service' }
  ]

  const categoryOptions = categories.length > 0 ? categories : [
    { value: 'Electronics', label: isRTL ? 'إلكترونيات' : 'Electronics' },
    { value: 'Software', label: isRTL ? 'برمجيات' : 'Software' },
    { value: 'Consulting', label: isRTL ? 'استشارات' : 'Consulting' }
  ]
  
  const paymentTypeOptions = [
    { value: 'Cash', label: isRTL ? 'نقدي' : 'Cash' },
    { value: 'Bank Transfer', label: isRTL ? 'تحويل بنكي' : 'Bank Transfer' },
    { value: 'Check', label: isRTL ? 'شيك' : 'Check' },
    { value: 'Credit Card', label: isRTL ? 'بطاقة ائتمان' : 'Credit Card' }
  ]
  
  const inputClass = `w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
    isDark 
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
      : 'bg-white border-gray-300 text-theme-text placeholder-gray-400'
  } ${readOnly ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}`

  const labelClass = `block text-sm font-medium mb-1 text-theme-text`
  const errorClass = "text-xs text-red-500 mt-1"

  return (
    <div className="fixed inset-0 z-[2050] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`card relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 text-theme-text`}>
            <FaFileInvoiceDollar className="text-blue-600" />
            {readOnly 
              ? (isRTL ? 'عرض تفاصيل الفاتورة' : 'View Invoice Details')
              : initialData 
                ? (isRTL ? 'تعديل فاتورة مبيعات' : 'Edit Sales Invoice') 
                : (isRTL ? 'إضافة فاتورة مبيعات' : 'Add Sales Invoice')}
          </h2>
          <button 
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-theme-text hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Mode Selection */}
          {!initialData && (
            <div className="flex gap-4 p-4  rounded-lg">
            
               <label className={`flex items-center gap-2 cursor-pointer p-5 rounded-lg ${!isManual ? 'bg-orange-600 text-white' : ''}`}>
                 <input 
                    type="radio" 
                    name="entryMode" 
                    checked={!isManual} 
                    onChange={() => {
                        setIsManual(false)
                        setFormData(prev => ({ ...prev, orderId: '', items: [] }))
                    }} 
                    className="radio radio-primary  radio-sm" 
                 />
                 <span className="text-sm font-medium">{isRTL ? 'ربط بطلب بيع' : 'Link to Sales Order'}</span>
               </label>
               <label className={`flex items-center gap-2 cursor-pointer p-5 rounded-lg ${isManual ? 'bg-orange-600 text-white' : ''}`}>
                 <input 
                    type="radio" 
                    name="entryMode" 
                    checked={isManual} 
                    onChange={() => {
                        setIsManual(true)
                        setFormData(prev => ({ ...prev, orderId: '', items: [] }))
                    }} 
                    className="radio radio-primary radio-sm" 
                 />
                 <span className="text-sm font-medium">{isRTL ? 'إدخال يدوي (بدون طلب)' : 'Manual Entry (No Order)'}</span>
               </label>
            </div>
          )}

          {/* Section 1: Basic Info & Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Row 1: Invoice # & Customer Code */}
            <div>
              <label className={labelClass}>{isRTL ? 'رقم الفاتورة' : 'Invoice #'}</label>
              <div className="relative">
                <FaHashtag className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text`} />
                <input
                  type="text"
                  value={formData.id}
                  readOnly
                  className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'} opacity-70 cursor-not-allowed`}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                 <label className={labelClass}>{isRTL ? 'العميل' : 'Customer'}</label>
                 {isManual && (
                    <button 
                        type="button" 
                        onClick={() => {
                            setIsNewCustomer(!isNewCustomer)
                            setFormData(prev => ({ ...prev, customerCode: '', customerName: '' }))
                        }}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        {isNewCustomer ? (isRTL ? 'اختيار عميل موجود' : 'Select Existing') : (isRTL ? 'عميل جديد' : 'New Customer')}
                    </button>
                 )}
              </div>
              
              {isNewCustomer ? (
                  <div className="relative">
                    <FaUser className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text`} />
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                      className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`}
                      placeholder={isRTL ? 'أدخل اسم العميل الجديد' : 'Enter New Customer Name'}
                      autoFocus
                    />
                  </div>
              ) : (
                  <div className="relative">
                    <FaUser className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text`} />
                    <SearchableSelect
                      options={customers.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))}
                      value={formData.customerCode}
                      onChange={val => {
                        const selectedCode = val;
                        const customer = customers.find(c => c.code === selectedCode);
                        
                        // Find sales person name if assignedSalesRep is an ID
                        let salesPersonName = customer?.assignedSalesRep || formData.salesPerson;
                        if (salesPersonName && !isNaN(salesPersonName)) {
                          const user = salesPersons.find(u => String(u.id) === String(salesPersonName) || u.value === salesPersonName);
                          if (user) salesPersonName = user.value;
                        }

                        setFormData({
                          ...formData,
                          customerCode: selectedCode,
                          customerName: customer ? customer.name : '',
                          salesPerson: salesPersonName,
                          orderId: ''
                        });
                      }}
                      placeholder={isRTL ? 'اختر العميل' : 'Select Customer'}
                      className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`}
                      isRTL={isRTL}
                    />
                  </div>
              )}
              {errors.customerName && <p className={errorClass}>{errors.customerName}</p>}
            </div>

            {/* Sales Order - Only if not manual */}
            {!isManual && (
                <div>
                  <label className={labelClass}>{isRTL ? 'رقم طلب البيع' : 'Sales Order Code'}</label>
                  <div className="relative">
                    <FaBoxOpen className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text`} />
                    <select
                      value={formData.orderId}
                      onChange={e => {
                        const selectedOId = e.target.value;
                        const order = availableOrders.find(o => o.id === selectedOId);
                        
                        if (order) {
                          const { items: newItems, paidAmount: newPaidAmount } = calculateInvoiceItems(order, 'Partial')

                          setFormData(prev => ({
                            ...prev,
                            orderId: selectedOId,
                            customerCode: order.customerCode || prev.customerCode,
                            customerName: order.customerName || prev.customerName,
                            salesPerson: order.salesPerson || prev.salesPerson,
                            invoiceType: 'Partial',
                            items: newItems,
                            paidAmount: newPaidAmount
                          }));
                        } else {
                          setFormData(prev => ({ ...prev, orderId: selectedOId }));
                        }
                      }}
                      className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`}
                      disabled={!formData.customerCode} // Disable if no customer selected
                    >
                      <option value="">
                        {formData.customerCode 
                          ? (isRTL ? 'اختر الطلب' : 'Select Order') 
                          : (isRTL ? 'يرجى اختيار العميل أولاً' : 'Please select customer first')}
                      </option>
                      {availableOrders
                        .filter(o => o.customerCode === formData.customerCode && ['Confirmed', 'Partially Invoiced', 'In Progress'].includes(o.status))
                        .map((o, idx) => (
                        <option key={o.id || idx} value={o.id}>{o.label || o.id} ({o.status})</option>
                      ))}
                    </select>
                  </div>
                  {errors.orderId && <p className={errorClass}>{errors.orderId}</p>}
                </div>
            )}
             
             <div>
              <label className={labelClass}>{isRTL ? 'مندوب المبيعات' : 'Sales Person'}</label>
              <div className="relative">
                <SearchableSelect
                  options={salesPersons}
                  value={formData.salesPerson}
                  onChange={(val) => setFormData({ ...formData, salesPerson: val })}
                  placeholder={isRTL ? 'اختر مندوب المبيعات' : 'Select Sales Person'}
                  className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`}
                  isRTL={isRTL}
                  showAllOption={false}
                />
                {loadingData && (
                  <div className="absolute inset-y-0 right-10 flex items-center pr-3 pointer-events-none">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Row 3: Dates */}
            <div>
              <label className={labelClass}>{isRTL ? 'تاريخ الفاتورة' : 'Invoice Date'}</label>
              <div className="relative">
                <FaCalendarAlt className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text`} />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`}
                />
              </div>
            </div>
            
            <div>
              <label className={labelClass}>{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
              <div className="relative">
                <FaCalendarAlt className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text`} />
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'} ${errors.dueDate ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.dueDate && <p className={errorClass}>{errors.dueDate}</p>}
            </div>
            
            {/* Row 4: Invoice Type */}
             <div>
              <label className={labelClass}>{isRTL ? 'نوع الفاتورة' : 'Invoice Type'}</label>
              <div className="relative">
                <FaFileInvoiceDollar className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text`} />
                <select
                  value={formData.invoiceType}
                  onChange={(e) => handleInvoiceTypeChange(e.target.value)}
                  className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`}
                >
                  <option value="Full">{isRTL ? 'فاتورة كاملة' : 'Full Invoice'}</option>
                  <option value="Partial">{isRTL ? 'فاتورة جزئية' : 'Partial Invoice'}</option>
                  <option value="Advance">{isRTL ? 'دفعة مقدمة' : 'Advance Invoice'}</option>
                </select>
              </div>
            </div>
          </div>

          <div className={`h-px w-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />

          {/* Section 2: Items (Dynamic List) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-theme-text">{isRTL ? 'المنتجات / البنود' : 'Products / Items'}</h3>
              {!readOnly && (isManual || formData.invoiceType !== 'Full') && (
                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-sm btn-primary gap-2"
                >
                  <FaPlus size={12} />
                  {isRTL ? 'إضافة بند' : 'Add Item'}
                </button>
              )}
            </div>
            
            {errors.items && <p className="text-red-500 text-sm">{errors.items}</p>}

            <div className="overflow-x-auto rounded-lg border border-theme-border dark:border-gray-700">
              <table className="w-full text-sm text-left">
                <thead className="  text-xs uppercase text-theme-text">
                  <tr>
                    <th className="px-4 py-3 min-w-[120px]">{isRTL ? 'النوع' : 'Type'}</th>
                    <th className="px-4 py-3 min-w-[120px]">{isRTL ? 'الفئة' : 'Category'}</th>
                    <th className="px-4 py-3 min-w-[200px]">{isRTL ? 'اسم البند' : 'Item Name'}</th>
                    <th className="px-4 py-3 w-[100px]">{isRTL ? 'الكمية' : 'Qty'}</th>
                    <th className="px-4 py-3 w-[120px]">{isRTL ? 'السعر' : 'Price'}</th>
                    <th className="px-4 py-3 w-[120px]">{isRTL ? 'الخصم' : 'Discount'}</th>
                    <th className="px-4 py-3 w-[120px]">{isRTL ? 'المجموع' : 'Total'}</th>
                    <th className="px-4 py-3 w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {formData.items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-700/50 ">
                      <td className="px-2 py-2">
                        <select 
                          className="input input-sm w-full"
                          value={item.type || ''}
                          disabled={!isManual && (readOnly || formData.invoiceType === 'Full')}
                          onChange={e => updateItem(index, 'type', e.target.value)}
                        >
                          {itemTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                         <select 
                          className="input input-sm w-full"
                          value={item.category || ''}
                          disabled={!isManual && (readOnly || formData.invoiceType === 'Full')}
                          onChange={e => {
                            const newCategory = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              items: prev.items.map((it, i) => i === index ? { 
                                ...it, 
                                category: newCategory,
                                name: '',
                                price: 0
                              } : it)
                            }));
                          }}
                        >
                          <option value="">{isRTL ? 'اختر...' : 'Select...'}</option>
                          {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <SearchableSelect
                            options={products
                                .filter(i => !item.category || i.category === item.category)
                                .map(i => ({ value: i.name, label: i.name }))
                            }
                            value={item.name || ''}
                            disabled={!isManual && (readOnly || formData.invoiceType === 'Full')}
                            onChange={val => {
                                const selectedName = val;
                                const product = products.find(p => p.name === selectedName);
                                setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((it, i) => i === index ? { 
                                    ...it, 
                                    name: selectedName,
                                    price: product ? product.price : it.price,
                                    type: product ? product.type : it.type,
                                    category: product ? product.category : it.category
                                } : it)
                                }));
                            }}
                            placeholder={isRTL ? 'اختر العنصر' : 'Select Item'}
                            className={`min-w-[180px] ${errors[`item_name_${index}`] ? 'border-red-500' : ''}`}
                            isRTL={isRTL}
                            showAllOption={false}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="1"
                          className={`input input-sm w-full ${errors[`item_qty_${index}`] ? 'border-red-500' : ''}`}
                          value={item.quantity}
                          readOnly={!isManual && (readOnly || formData.invoiceType === 'Full')}
                          onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={`input input-sm w-full ${errors[`item_price_${index}`] ? 'border-red-500' : ''}`}
                          value={item.price}
                          readOnly={!isManual && (readOnly || formData.invoiceType === 'Full')}
                          onChange={e => updateItem(index, 'price', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input input-sm w-full"
                          value={item.discount || 0}
                          readOnly={!isManual && (readOnly || formData.invoiceType === 'Full')}
                          onChange={e => updateItem(index, 'discount', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {((item.quantity * item.price) - item.discount).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {!readOnly && (isManual || formData.invoiceType !== 'Full') && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {formData.items.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-theme-text ">
                        {isRTL ? 'لا توجد عناصر. أضف بند جديد.' : 'No items. Add a new item.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`h-px w-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />

          {/* Section 3: Financials & Attachments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Notes & Attachments */}
            <div className="space-y-4">
               <div>
                <label className={labelClass}>{isRTL ? 'ملاحظات' : 'Notes'}</label>
                <div className="relative">
                  <FaStickyNote className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text`} />
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'} min-h-[80px] py-3`}
                    placeholder={isRTL ? 'أضف ملاحظات...' : 'Add notes...'}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>{isRTL ? 'المرفقات' : 'Attachment'}</label>
                <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                  <input type="file" className="hidden" id="file-upload" onChange={e => setFormData({...formData, attachment: e.target.files[0]})} />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <FaPaperclip className="text-gray-400" size={24} />
                    <span className="text-sm text-theme-text ">
                      {formData.attachment ? formData.attachment.name : (isRTL ? 'انقر لرفع ملف' : 'Click to upload file')}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Totals */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
              <div className="space-y-3">
                 {/* Payment Fields */}
                 <div className="mb-4 space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="text-xs font-medium text-theme-text mb-1 block">{isRTL ? 'طريقة الدفع' : 'Payment Method'}</label>
                      <select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className={`w-full text-sm px-3 py-2 rounded border bg-transparent ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                      >
                        <option value="">{isRTL ? 'اختر الطريقة' : 'Select Method'}</option>
                        {paymentTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-theme-text mb-1 block">{isRTL ? 'شروط الدفع' : 'Payment Terms'}</label>
                      <select
                        value={formData.paymentTerms}
                        onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                        className={`w-full text-sm px-3 py-2 rounded border bg-transparent ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                      >
                        <option value="">{isRTL ? 'اختر الشروط' : 'Select Terms'}</option>
                        {paymentTermsOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                 </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-theme-text">{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span className="font-medium">{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-theme-text">{isRTL ? 'قيمة الخصم' : 'Discount Value'}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input input-sm w-24 text-end text-green-600 font-medium"
                    value={globalDiscountAmount ? parseFloat(globalDiscountAmount.toFixed(2)) : 0}
                    disabled={readOnly || formData.invoiceType === 'Full'}
                    onChange={e => {
                       const val = parseFloat(e.target.value);
                       const amount = isNaN(val) ? 0 : val;
                       const rate = subtotal > 0 ? amount / subtotal : 0;
                       setFormData({...formData, discountRate: rate});
                    }}
                  />
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-theme-text">{isRTL ? 'الضريبة' : 'Tax'}</span>
                  <input
                    type="number"
                    min="0"
                    className="input input-sm w-24 text-end"
                    value={formData.tax}
                    onChange={e => setFormData({...formData, tax: e.target.value})}
                  />
                </div>
                
                <div className={`h-px w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-theme-text">{isRTL ? 'الإجمالي' : 'Total'}</span>
                  <span className="text-blue-600">{total.toLocaleString()}</span>
                </div>
                
                 <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-theme-text">{isRTL ? 'المبلغ المدفوع' : 'Paid Amount'}</span>
                  <input
                    type="number"
                    min="0"
                    className={`input input-sm w-24 text-end ${errors.paidAmount ? 'border-red-500' : ''}`}
                    value={formData.paidAmount}
                    onChange={e => setFormData({...formData, paidAmount: e.target.value})}
                  />
                </div>
                {errors.paidAmount && <p className="text-xs text-red-500 text-end mt-1">{errors.paidAmount}</p>}
                
                 <div className="flex justify-between items-center text-sm text-red-500 font-medium">
                  <span>{isRTL ? 'المستحق (المتبقي)' : 'Balance Due'}</span>
                  <span>{balanceDue.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost flex-1"
                >
                  {readOnly ? (isRTL ? 'إغلاق' : 'Close') : (isRTL ? 'إلغاء' : 'Cancel')}
                </button>
                {!readOnly && (
                  <button
                    type="submit"
                    className="btn btn-primary flex-1 gap-2"
                  >
                    <FaSave />
                    {isRTL ? 'حفظ الفاتورة' : 'Save Invoice'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SalesInvoicesFormModal
