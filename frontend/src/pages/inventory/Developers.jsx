import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDynamicFields } from '../../hooks/useDynamicFields'
import { useAppState } from '../../shared/context/AppStateProvider'
import { api, logExportEvent } from '../../utils/api'
import { FaFileImport, FaPlus, FaFileExport, FaChevronDown } from 'react-icons/fa'
import { Filter, ChevronDown, ChevronLeft, ChevronRight, Search, Building2, Edit2, Trash2, Briefcase, Users, X, Phone, Mail, MapPin } from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import DevelopersImportModal from './DevelopersImportModal'

export default function Developers() {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const isRTL = isArabic
  const { fields: dynamicFields } = useDynamicFields('developers')
  const { user, refreshInventoryBadges } = useAppState()

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const hasExplicitInventoryPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Inventory')
  const inventoryModulePerms = hasExplicitInventoryPerms && Array.isArray(modulePermissions.Inventory) ? modulePermissions.Inventory : []
  const effectiveInventoryPerms = hasExplicitInventoryPerms ? inventoryModulePerms : []
  const roleLower = String(user?.role || '').toLowerCase()
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'
  const canManageDevelopers =
    effectiveInventoryPerms.includes('addDeveloper') ||
    user?.is_super_admin ||
    isTenantAdmin

  useEffect(() => {
    const markSeen = async () => {
      try {
        await api.post('/api/inventory/mark-seen', { page: 'developers' })
        await refreshInventoryBadges()
      } catch {}
    }
    markSeen()
  }, [refreshInventoryBadges])

  const labels = useMemo(() => ({
    title: isArabic ? ' المطورون' : ' Developers',
    formTitle: isArabic ? 'بيانات الشركة التطوير' : 'Developer Company Details',
    add: isArabic ? 'إضافة مطور' : 'Add Developer',
    close: isArabic ? 'إغلاق' : 'Close',
    filter: isArabic ? 'تصفية' : 'Filter',
    search: isArabic ? 'بحث' : 'Search',
    clearFilters: isArabic ? 'مسح المرشحات' : 'Clear Filters',
    companyName: isArabic ? 'اسم الشركة' : 'Company Name',
    contactPerson: isArabic ? 'الشخص المسؤول' : 'Contact Person',
    phone: isArabic ? 'الهاتف' : 'Phone',
    email: isArabic ? 'البريد الإلكتروني' : 'Email',
    city: isArabic ? 'المدينة' : 'City',
    status: isArabic ? 'الحالة' : 'Status',
    save: isArabic ? 'حفظ الشركة' : 'Save Company',
    listTitle: isArabic ? 'قائمة شركات التطوير' : 'Developers List',
    empty: isArabic ? 'لا توجد سجلات بعد' : 'No records yet',
    actions: isArabic ? 'الإجراءات' : 'Actions',
    delete: isArabic ? 'حذف' : 'Delete',
    edit: isArabic ? 'تعديل' : 'Edit',
    show: isArabic ? 'إظهار' : 'Show',
    hide: isArabic ? 'إخفاء' : 'Hide',
    logo: isArabic ? 'الشعار' : 'Logo',
    projectType: isArabic ? 'نوع المشروع' : 'Project Type',
    residential: isArabic ? 'سكنى' : 'Residential',
    commercial: isArabic ? 'تجارى' : 'Commercial',
    administrative: isArabic ? 'إداري' : 'Administrative',
    medical: isArabic ? 'طبي' : 'Medical',
    select: isArabic ? 'اختر' : 'Select',
  }), [isArabic])

  const STORAGE_KEY = 'inventoryDevelopers'

  const [form, setForm] = useState({ companyName: '', contactPerson: '', phone: '', email: '', city: '', status: isArabic ? 'نشط' : 'Active', logo: '', projectTypes: [] })
  const [developers, setDevelopers] = useState([])
  const [dbCities, setDbCities] = useState([]) // Store cities from DB
  const [showForm, setShowForm] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    companyName: '',
    contactPerson: '',
    city: '',
    status: '',
    phone: ''
  })

  const fetchDevelopers = async () => {
    try {
      const [{ data: devsData }, { data: citiesData }] = await Promise.all([
        api.get('/api/developers'),
        api.get('/api/cities')
      ])
      
      const mapped = devsData.map(d => ({
        id: d.id,
        companyName: d.name,
        contactPerson: d.contact_person,
        phone: d.phone,
        email: d.email,
        city: d.city,
        status: d.status,
        logo: d.logo,
        projectTypes: typeof d.project_types === 'string' ? JSON.parse(d.project_types) : (d.project_types || [])
      }))
      setDevelopers(mapped)
      setDbCities(citiesData || [])
    } catch (err) {
      console.error(err)
    }
  }

  // Derived cities list for select (name_ar or name_en)
  const citiesList = useMemo(() => {
    const list = dbCities.map(c => isArabic ? (c.name_ar || c.name_en) : c.name_en).sort()
    return [isArabic ? 'الكل' : 'All', ...list]
  }, [dbCities, isArabic])

  useEffect(() => {
    fetchDevelopers()
  }, [])

  function onChange(e) { 
    const { name, value } = e.target; 
    
    if (name === 'phone') {
      // Allow only digits, spaces, plus, and dashes
      if (value && !/^[0-9+\s-]*$/.test(value)) return;
    }
    
    setForm(prev => ({ ...prev, [name]: value })) 
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, logo: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    const companyName = form.companyName ? form.companyName.trim() : ''
    if (!companyName) {
      alert(isArabic ? 'يرجى إدخال اسم الشركة' : 'Please enter company name')
      return
    }

    // Phone Validation
    const phone = form.phone ? form.phone.trim() : ''
    if (phone) {
       const digits = phone.replace(/\D/g, '')
       
       // Check generic length (8-15)
       if (digits.length < 8 || digits.length > 15) {
          alert(isArabic ? 'رقم الهاتف غير صحيح (يجب أن يكون بين 8 و 15 رقم)' : 'Invalid phone number (must be 8-15 digits)')
          return
       }

       // Check for repeated digits (e.g. 11111111)
       if (/^(\d)\1+$/.test(digits)) {
          alert(isArabic ? 'رقم الهاتف غير صحيح (أرقام مكررة)' : 'Invalid phone number (Repeated digits)')
          return
       }

       // Specific check for Egyptian mobile (starts with 010, 011, 012, 015)
       if (/^01[0125]/.test(phone)) {
          if (digits.length !== 11) {
             alert(isArabic ? 'رقم المحمول المصري يجب أن يكون 11 رقم' : 'Egyptian mobile number must be 11 digits')
             return
          }
       }
    }

    const payload = {
      name: companyName,
      contact_person: form.contactPerson || '',
      phone: form.phone || '',
      email: form.email || '',
      city: form.city || '',
      status: form.status,
      logo: form.logo || '',
      project_types: Array.isArray(form.projectTypes) ? form.projectTypes : []
    }

    try {
      if (form.id) {
        await api.put(`/api/developers/${form.id}`, payload)
      } else {
        await api.post('/api/developers', payload)
      }
      await fetchDevelopers()
      setForm({ companyName: '', contactPerson: '', phone: '', email: '', city: '', status: isArabic ? 'نشط' : 'Active', logo: '', projectTypes: [] })
      setShowForm(false)
    } catch (err) {
      console.error(err)
      alert(isArabic ? 'حدث خطأ أثناء الحفظ' : 'Error saving developer')
    }
  }

  async function onDelete(id) {
    if (!canManageDevelopers) {
      alert(isArabic ? 'لا تملك صلاحية حذف المطورين' : 'You do not have permission to delete developers')
      return
    }
    if (!window.confirm(isArabic ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return
    try {
      await api.delete(`/api/developers/${id}`)
      setDevelopers(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  function onEdit(rec) {
    if (!canManageDevelopers) {
      alert(isArabic ? 'لا تملك صلاحية تعديل المطورين' : 'You do not have permission to edit developers')
      return
    }
    setForm({ id: rec.id, companyName: rec.companyName || '', contactPerson: rec.contactPerson || '', phone: rec.phone || '', email: rec.email || '', city: rec.city || '', status: rec.status || (isArabic ? 'نشط' : 'Active'), logo: rec.logo || '', projectTypes: Array.isArray(rec.projectTypes) ? rec.projectTypes : (rec.projectType ? [rec.projectType] : []) })
    setShowForm(true)
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { }
  }

  const statusOptions = useMemo(() => (isArabic ? ['نشط', 'متوقف'] : ['Active', 'Inactive']), [isArabic])
  const companyOptions = useMemo(() => Array.from(new Set(developers.map(d => d.companyName).filter(Boolean))), [developers])
  const contactOptions = useMemo(() => Array.from(new Set(developers.map(d => d.contactPerson).filter(Boolean))), [developers])
  const cityOptions = useMemo(() => Array.from(new Set(developers.map(d => d.city).filter(Boolean))), [developers])

  const filtered = useMemo(() => {
    return developers.filter(d => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const pool = [d.companyName, d.contactPerson, d.phone, d.email].map(x => (x || '').toLowerCase())
        if (!pool.some(v => v.includes(q))) return false
      }
      if (filters.companyName && d.companyName !== filters.companyName) return false
      if (filters.contactPerson && !String(d.contactPerson || '').toLowerCase().includes(String(filters.contactPerson).toLowerCase())) return false
      if (filters.city && d.city !== filters.city) return false
      if (filters.status && d.status !== filters.status) return false
      if (filters.phone && !(d.phone || '').includes(filters.phone)) return false
      return true
    })
  }, [developers, filters])

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, itemsPerPage])

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedDevelopers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  const shownFrom = (filtered.length === 0) ? 0 : (currentPage - 1) * itemsPerPage + 1
  const shownTo = Math.min(currentPage * itemsPerPage, filtered.length)

  function clearFilters() { setFilters({ search: '', companyName: '', contactPerson: '', city: '', status: '', phone: '' }) }

  const exportDevelopersCsv = () => {
    const headers = ['Company Name', 'Contact Person', 'Phone', 'Email', 'City', 'Status', 'Project Types']
    const csvContent = [
      headers.join(','),
      ...filtered.map(d => [
        `"${d.companyName}"`,
        `"${d.contactPerson || ''}"`,
        `"${d.phone || ''}"`,
        `"${d.email || ''}"`,
        `"${d.city || ''}"`,
        `"${d.status}"`,
        `"${Array.isArray(d.projectTypes) ? d.projectTypes.join(' | ') : (d.projectType || '')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const fileName = 'developers.csv'
    a.download = fileName
    a.click(); URL.revokeObjectURL(url)
    logExportEvent({
      module: 'Developers',
      fileName,
      format: 'csv',
    })
  }

  const exportDevelopersPdf = async (items) => {
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = await import('jspdf-autotable')
      const doc = new jsPDF()

      const tableColumn = ["Company", "Contact", "Phone", "Email", "City", "Status"]
      const tableRows = []

      items.forEach(item => {
        const rowData = [
          item.companyName,
          item.contactPerson || '',
          item.phone || '',
          item.email || '',
          item.city || '',
          item.status
        ]
        tableRows.push(rowData)
      })

      doc.text("Developers List", 14, 15)
      autoTable.default(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { font: 'helvetica', fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      })
      const fileName = "developers_list.pdf"
      doc.save(fileName)
      logExportEvent({
        module: 'Developers',
        fileName,
        format: 'pdf',
      })
    } catch (error) {
      console.error("Export PDF Error:", error)
    }
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="glass-panel rounded-xl p-4 md:p-6 relative z-30 mb-6">
        <div className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3">
            <div className="relative flex flex-col items-start gap-1">
              <h1 className="page-title text-xl md:text-2xl font-bold text-start">{labels.title}</h1>
              <span aria-hidden="true" className="inline-block h-[2px] w-full rounded bg-gradient-to-r from-blue-500 to-purple-600" />
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
            <button
              className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2"
              onClick={() => setShowImportModal(true)}
            >
              <FaFileImport className='text-white'/>
              <span className='text-white'>{isArabic ? 'استيراد' : 'Import'}</span>
            </button>

            {canManageDevelopers && (
              <button
                className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-green-500 text-white border-none flex items-center justify-center gap-2"
                onClick={() => setShowForm(true)}
              >
                <FaPlus className='text-white'/> <span className='text-white'>{labels.add}</span>
              </button>
            )}
            <div className="relative w-full lg:w-auto">
              <button
                className="btn  btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <span className="flex items-center gap-2">
                  <FaFileExport className='text-white'/>
                  <span className='text-white'>{isArabic ? 'تصدير' : 'Export'}</span>
                </span>
                <FaChevronDown className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} size={12} />
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 w-full sm:w-32 overflow-hidden ltr:right-0 rtl:left-0">
                    <button
                      className="w-full text-gray-700 dark:text-gray-200 text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2"
                      onClick={() => {
                        exportDevelopersCsv()
                        setShowExportMenu(false)
                      }}
                    >
                      <FaFileCsv className="text-green-500" /> CSV
                    </button>
                    <button
                      className="w-full text-gray-700 dark:text-gray-200 text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2"
                      onClick={() => {
                        exportDevelopersPdf(filtered)
                        setShowExportMenu(false)
                      }}
                    >
                      <FaFilePdf className="text-red-500" /> PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showImportModal && (
        <DevelopersImportModal
          onClose={() => setShowImportModal(false)}
          isRTL={isRTL}
          onImport={(data) => {
            setDevelopers(prev => [...data.map(d => ({ ...d, id: Date.now() + Math.random() })), ...prev])
            setShowImportModal(false)
          }}
        />
      )}

      <div className="glass-panel p-4 rounded-xl mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Filter className="text-blue-500" size={16} /> {labels.filter}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAllFilters(prev => !prev)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
              {showAllFilters ? (isArabic ? 'إخفاء' : 'Hide') : (isArabic ? 'عرض الكل' : 'Show All')}
              <ChevronDown size={14} className={`transform transition-transform ${showAllFilters ? 'rotate-180' : ''}`} />
            </button>
            <button onClick={clearFilters} className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              {isArabic ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><Search className="text-blue-500" size={10} /> {labels.search}</label>
            <input className="input w-full" value={filters.search} onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} placeholder={isArabic ? 'بحث...' : 'Search...'} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{labels.companyName}</label>
            <SearchableSelect options={companyOptions} value={filters.companyName} onChange={val => setFilters(prev => ({ ...prev, companyName: val }))} isRTL={isArabic} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{labels.contactPerson}</label>
            <input className="input w-full" value={filters.contactPerson} onChange={e => setFilters(prev => ({ ...prev, contactPerson: e.target.value }))} placeholder={labels.contactPerson} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{labels.city}</label>
            <SearchableSelect options={cityOptions} value={filters.city} onChange={val => setFilters(prev => ({ ...prev, city: val }))} isRTL={isArabic} />
          </div>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-300 overflow-hidden ${showAllFilters ? 'max-h-[300px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{labels.status}</label>
            <SearchableSelect
              options={statusOptions}
              value={filters.status}
              onChange={val => setFilters(prev => ({ ...prev, status: val }))}
              isRTL={isArabic}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-text)]">{labels.phone}</label>
            <input className="input w-full" value={filters.phone} onChange={e => setFilters(prev => ({ ...prev, phone: e.target.value }))} placeholder={labels.phone} />
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-[var(--muted-text)]">
          <p>{labels.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedDevelopers.map(r => (
            <div key={r.id} className="glass-panel rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className={`bg-blue-50 dark:bg-blue-900/20 rounded-lg overflow-hidden flex items-center justify-center shrink-0 w-16 h-16 ${r.logo ? 'p-1 bg-white dark:bg-white border border-gray-100 dark:border-gray-800' : 'p-3'}`}>
                  {r.logo ? (
                    <img src={r.logo} alt={r.companyName} className="w-full h-full object-contain mix-blend-multiply" />
                  ) : (
                    <Building2 className="text-blue-600 dark:text-blue-400" size={28} />
                  )}
                </div>
                <div className="flex gap-2">
                  {canManageDevelopers && (
                    <>
                      <button type="button" className="btn btn-sm btn-circle btn-ghost text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title={labels.edit} aria-label={labels.edit} onClick={() => onEdit(r)}>
                        <Edit2 size={16} />
                      </button>
                      <button type="button" className="btn btn-sm btn-circle btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title={labels.delete} aria-label={labels.delete} onClick={() => onDelete(r.id)}>
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2">{r.companyName}</h3>

              <div className="space-y-2 text-sm text-[var(--muted-text)]">
                {(Array.isArray(r.projectTypes) && r.projectTypes.length > 0) && (
                  <div className="flex items-start gap-2">
                    <div className="w-4 flex justify-center"><Briefcase size={14} className="opacity-70" /></div>
                    <div className="flex flex-wrap gap-1">
                      {r.projectTypes.map((pt, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs">{pt}</span>
                      ))}
                    </div>
                  </div>
                )}
                {!Array.isArray(r.projectTypes) && r.projectType && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 flex justify-center"><Briefcase size={14} className="opacity-70" /></div>
                    <span>{r.projectType}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-4 flex justify-center"><Users size={14} className="opacity-70" /></div>
                  <span className="capitalize">{r.contactPerson}</span>
                </div>
                {r.phone && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 flex justify-center"><Phone size={14} className="opacity-70" /></div>
                    <span dir="ltr">{r.phone}</span>
                  </div>
                )}
                {r.email && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 flex justify-center"><Mail size={14} className="opacity-70" /></div>
                    <span>{r.email}</span>
                  </div>
                )}
                {r.city && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 flex justify-center"><MapPin size={14} className="opacity-70" /></div>
                    <span>{r.city}</span>
                  </div>
                )}
                {/* Dynamic Fields Display */}
                {dynamicFields.map(field => {
                  const val = r.custom_fields?.[field.key];
                  if (!val) return null;
                  return (
                    <div key={field.key} className="flex items-center gap-2">
                      <div className="w-4 flex justify-center"><FaTags size={14} className="opacity-70" /></div>
                      <span className="font-medium text-[var(--muted-text)]">{isArabic ? field.label_ar : field.label_en}:</span>
                      <span>{String(val)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--panel-border)] flex justify-between items-center">
                <span className={`px-2 py-1 text-xs rounded-full ${r.status === 'Active' || r.status === 'نشط'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {filtered.length > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-xl p-2 glass-panel">
          <div className="text-xs text-[var(--muted-text)]">
            {isArabic
              ? `عرض ${shownFrom}–${shownTo} من ${filtered.length}`
              : `Showing ${shownFrom}–${shownTo} of ${filtered.length}`
            }
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                title={isArabic ? 'السابق' : 'Prev'}
              >
                <ChevronLeft className={isArabic ? 'scale-x-[-1]' : ''} size={16} />
              </button>
              <span className="text-sm">{isArabic ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                title={isArabic ? 'التالي' : 'Next'}
              >
                <ChevronRight className={isArabic ? 'scale-x-[-1]' : ''} size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--muted-text)]">{isArabic ? 'لكل صفحة:' : 'Per page:'}</span>
              <select
                className="input w-24 text-sm h-8 min-h-0"
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
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6">
            <div className="card p-4 sm:p-6 w-[92vw] sm:w-[80vw] lg:w-[60vw] xl:max-w-3xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-medium">{labels.formTitle}</h2>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-red-600 hover:bg-red-50 shadow-md transition-colors"
                  onClick={() => setShowForm(false)}
                  aria-label={labels.close}
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">{labels.logo}</label>
                  <div className="flex items-center gap-4">
                    {form.logo && (
                      <img src={form.logo} alt="Logo Preview" className="w-16 h-16 object-contain rounded-lg border bg-white" />
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">
                    {labels.companyName}
                    <span className="text-red-600 ltr:ml-1 rtl:mr-1">*</span>
                  </label>
                  <input name="companyName" value={form.companyName} onChange={onChange} placeholder={labels.companyName} className="input w-full" required />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.projectType}</label>
                  <SearchableSelect
                    options={[labels.residential, labels.commercial, labels.administrative, labels.medical]}
                    value={form.projectTypes}
                    onChange={(vals) => setForm(prev => ({ ...prev, projectTypes: vals }))}
                    isRTL={isArabic}
                    multiple
                  />
                </div>
                <div><label className="block text-sm mb-1">{labels.contactPerson}</label><input name="contactPerson" value={form.contactPerson} onChange={onChange} placeholder={labels.contactPerson} className="input w-full" /></div>
                <div><label className="block text-sm mb-1">{labels.phone}</label><input type="tel" name="phone" value={form.phone} onChange={onChange} placeholder={labels.phone} className="input w-full" /></div>
                <div><label className="block text-sm mb-1">{labels.email}</label><input type="email" name="email" value={form.email} onChange={onChange} placeholder={labels.email} className="input w-full" /></div>
                <div>
                  <label className="block text-sm mb-1">{labels.city}</label>
                  <SearchableSelect 
                    options={citiesList} 
                    value={form.city} 
                    onChange={(val) => setForm(prev => ({ ...prev, city: val }))} 
                    placeholder={labels.city} 
                    isRTL={isArabic}
                    showAllOption={false}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">{labels.status}</label>
                  <select name="status" value={form.status} onChange={onChange} className="input w-full">
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className={`md:col-span-2 flex gap-2 ${isArabic ? 'justify-start' : 'justify-end'}`}>
                  <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium">
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
