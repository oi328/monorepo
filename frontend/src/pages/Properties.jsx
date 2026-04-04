import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDynamicFields } from '../hooks/useDynamicFields'
// import { projectsData } from '../data/projectsData' // Removed manual mock data
import { useCompanySetup } from './settings/company-setup/store/CompanySetupContext.jsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '../utils/api'
import { useAppState } from '../shared/context/AppStateProvider'
import { FaFileImport, FaPlus, FaFileExport, FaChevronDown, FaChevronLeft, FaChevronRight, FaTimes, FaFilter, FaSearch, FaBuilding, FaUser, FaMapMarkerAlt, FaImage, FaCloudDownloadAlt, FaPaperclip, FaVideo } from 'react-icons/fa'
import SearchableSelect from '../components/SearchableSelect'
import PropertiesSummaryPanel from '../components/PropertiesSummaryPanel'
import PropertyCard from '../components/PropertyCard'
import CreatePropertyModal from '../components/CreatePropertyModal'
import ImportPropertiesModal from '../components/ImportPropertiesModal'
import toast from 'react-hot-toast'

const getApiOrigin = () => {
  const apiUrl = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'https://api.besouholacrm.net/api'
  const clean = String(apiUrl).replace(/\/+$/, '')
  return clean.endsWith('/api') ? clean.slice(0, -4) : clean
}

const getFileUrl = (path) => {
  if (!path) return ''
  if (typeof path !== 'string') return ''
  if (path.startsWith('data:') || path.startsWith('blob:')) return path

  const baseUrl = getApiOrigin()
  const pathStr = String(path)

  if (pathStr.startsWith('http')) {
    try {
      const u = new URL(pathStr)
      const idxPublic = u.pathname.indexOf('/api/public-files/')
      if (idxPublic !== -1) {
        const rel = u.pathname.slice(idxPublic + '/api/public-files/'.length).replace(/^\/+/, '')
        return `${baseUrl}/storage/${rel}`
      }
      const idx = u.pathname.indexOf('/storage/')
      if (idx !== -1) {
        const rel = u.pathname.slice(idx + '/storage/'.length).replace(/^\/+/, '')
        return `${baseUrl}/storage/${rel}`
      }
      return pathStr
    } catch {
      return pathStr
    }
  }

  let cleanPath = pathStr
  if (cleanPath.startsWith('/api/public-files/')) cleanPath = cleanPath.substring(17)
  else if (cleanPath.startsWith('api/public-files/')) cleanPath = cleanPath.substring(16)
  if (cleanPath.startsWith('/storage/')) cleanPath = cleanPath.substring(9)
  else if (cleanPath.startsWith('storage/')) cleanPath = cleanPath.substring(8)
  else if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1)
  return `${baseUrl}/storage/${cleanPath}`
}

const getPublicFilesUrl = (path) => {
  if (!path) return ''
  if (typeof path !== 'string') return ''
  if (path.startsWith('data:') || path.startsWith('blob:')) return path

  const baseUrl = getApiOrigin()
  const pathStr = String(path)

  if (pathStr.startsWith('http')) {
    try {
      const u = new URL(pathStr)
      const idx = u.pathname.indexOf('/storage/')
      if (idx !== -1) {
        const rel = u.pathname.slice(idx + '/storage/'.length).replace(/^\/+/, '')
        return `${baseUrl}/api/public-files/${rel}`
      }
      const idxPublic = u.pathname.indexOf('/api/public-files/')
      if (idxPublic !== -1) {
        const rel = u.pathname.slice(idxPublic + '/api/public-files/'.length).replace(/^\/+/, '')
        return `${baseUrl}/api/public-files/${rel}`
      }
      return pathStr
    } catch {
      return pathStr
    }
  }

  let cleanPath = pathStr
  if (cleanPath.startsWith('/storage/')) cleanPath = cleanPath.substring(9)
  else if (cleanPath.startsWith('storage/')) cleanPath = cleanPath.substring(8)
  else if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1)
  return `${baseUrl}/api/public-files/${cleanPath}`
}

const getFetchFileUrl = (src) => {
  if (!src || typeof src !== 'string') return src
  const baseUrl = getApiOrigin()
  const storagePrefix = `${baseUrl}/storage/`
  const publicPrefix = `${baseUrl}/api/public-files/`

  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src
  }

  if (src.startsWith(publicPrefix)) {
    const rel = src.slice(publicPrefix.length)
    return `${baseUrl}/storage/${rel}`
  }

  if (src.startsWith(storagePrefix)) {
    return src
  }

  if (!src.startsWith('http')) {
    const cleanPath = src.startsWith('/') ? src.substring(1) : src
    if (cleanPath.startsWith('api/public-files/')) return `${baseUrl}/storage/${cleanPath.substring(16)}`
    return `${baseUrl}/storage/${cleanPath}`
  }

  return src
}

const toDataUrl = async (src) => {
  if (!src) throw new Error('empty src')
  if (src instanceof File) {
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(src); })
  }
  let url = ''
  if (typeof src === 'string') {
    url = getFetchFileUrl(src)
  } else {
    url = src
  }
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`failed to fetch image: ${resp.status}`)
  const blob = await resp.blob()
  return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob) })
}

// Range Slider Component
const RangeSlider = ({ min, max, value, onChange, label, isRTL, unit = '' }) => {
  const [minVal, maxVal] = value

  // Handlers
  const handleMinChange = (e) => {
    const val = Math.min(Number(e.target.value), maxVal - 1)
    onChange([val, maxVal])
  }
  const handleMaxChange = (e) => {
    const val = Math.max(Number(e.target.value), minVal + 1)
    onChange([minVal, val])
  }

  // Percentages for track
  const minPercent = ((minVal - min) / (max - min)) * 100
  const maxPercent = ((maxVal - min) / (max - min)) * 100

  return (
    <div className="w-full p-1">
      <h3 className="text-xs font-medium text-[var(--muted-text)] mb-4">{label}</h3>

      <div className="relative w-full h-4 mb-4 group">
        {/* Track Background */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 rounded-full"></div>

        {/* Active Range Track */}
        <div
          className="absolute top-1/2 h-1 bg-gray-800 dark:bg-gray-200 -translate-y-1/2 rounded-full"
          style={{
            left: isRTL ? `${100 - maxPercent}%` : `${minPercent}%`,
            right: isRTL ? `${minPercent}%` : `${100 - maxPercent}%`
          }}
        ></div>

        {/* Inputs */}
        <style>{`
          .range-slider-thumb::-webkit-slider-thumb {
            -webkit-appearance: none;
            pointer-events: auto;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: white;
            border: 2px solid #333;
            cursor: pointer;
            margin-top: -5px; /* centers thumb on track */
          }
          .range-slider-thumb::-moz-range-thumb {
            pointer-events: auto;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: white;
            border: 2px solid #333;
            cursor: pointer;
            border: none;
          }
        `}</style>
        <input
          type="range"
          min={min}
          max={max}
          value={minVal}
          onChange={handleMinChange}
          className="range-slider-thumb absolute top-1/2 -translate-y-1/2 left-0 w-full appearance-none bg-transparent pointer-events-none z-20"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={maxVal}
          onChange={handleMaxChange}
          className="range-slider-thumb absolute top-1/2 -translate-y-1/2 left-0 w-full appearance-none bg-transparent pointer-events-none z-20"
        />
      </div>

      <div className="flex items-center gap-3 mt-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">{isRTL ? 'من' : 'From'}</span>
          <div className="relative">
            <input
              type="number"
              value={minVal}
              onChange={handleMinChange}
              className="input py-0.5 px-2 w-20 text-center text-xs font-bold border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">{isRTL ? 'إلى' : 'To'}</span>
          <div className="relative">
            <input
              type="number"
              value={maxVal}
              onChange={handleMaxChange}
              className="input py-0.5 px-2 w-20 text-center text-xs font-bold border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Properties() {
  const { i18n } = useTranslation()
  const isRTL = String(i18n.language || '').startsWith('ar')
  const { fields: dynamicFields } = useDynamicFields('properties')
  const { companySetup } = useCompanySetup()
  const getShareOrigin = () => {
    const normalizeHost = (hostLike) => {
      const host = String(hostLike || '')
      return host
        .replace(/\.$/, '')
        .replace(/\.(?=:\d+$)/, '')
    }
    const normalizeOrigin = (originLike) => {
      try {
        const u = new URL(String(originLike))
        const hostname = normalizeHost(u.hostname)
        return `${u.protocol}//${hostname}${u.port ? `:${u.port}` : ''}`
      } catch {
        return String(originLike).replace(/\/$/, '')
      }
    }
    const raw = import.meta.env?.VITE_SHARE_ORIGIN
    if (raw) return normalizeOrigin(raw)
    const protocol = import.meta.env?.VITE_SHARE_PROTOCOL
    const proto = protocol ? String(protocol).replace(':', '') : ''
    const current = new URL(window.location.href)
    const host = normalizeHost(current.host)
    const defaultProto = String(current.protocol || 'https:')
    const desiredProto = proto === 'http' || proto === 'https' ? `${proto}:` : defaultProto
    if (String(import.meta.env?.VITE_FORCE_HTTP_SHARE || '') === 'true') return `http://${host}`
    return normalizeOrigin(`${desiredProto}//${host}`)
  }
  const [planPreview, setPlanPreview] = useState(null)
  const [isPlanPreviewOpen, setIsPlanPreviewOpen] = useState(false)
  const openPlanPreview = (plan) => { setPlanPreview(plan); setIsPlanPreviewOpen(true) }
  const closePlanPreview = () => { setIsPlanPreviewOpen(false); setPlanPreview(null) }
  const printPlan = (plan) => {
    const w = window.open('', '_blank')
    if (!w) return
    const currencyFmt = (v) => new Intl.NumberFormat('en-EG', { maximumFractionDigits: 2 }).format(Number(v || 0))
    w.document.write(`
      <html><head><title>Payment Plan</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
        th { background: #f3f4f6; }
        .actions { margin-top: 16px; }
      </style>
      </head><body>
      <h2>${isRTL ? 'معاينة خطة الدفع' : 'Payment Plan Preview'}</h2>
      <table>
        <tbody>
          <tr><th>${isRTL ? 'المقدم' : 'Down Payment'}</th><td>${plan.downPayment || '-'} ${String(plan.downPaymentType || 'amount') === 'percentage' ? '%' : ''}</td></tr>
          <tr><th>${isRTL ? 'نوع الحجز' : 'Reservation Type'}</th><td>${plan.reservationType || '-'}</td></tr>
          <tr><th>${isRTL ? 'دفعة الاستلام' : 'Receipt Amount'}</th><td>${currencyFmt(plan.receiptAmount)}</td></tr>
          <tr><th>${isRTL ? 'قيمة القسط' : 'Installment Amount'}</th><td>${currencyFmt(plan.installmentAmount)}</td></tr>
          <tr><th>${isRTL ? 'تكرار القسط' : 'Installment Frequency'}</th><td>${plan.installmentFrequency || '-'}</td></tr>
          <tr><th>${isRTL ? 'السنوات' : 'Years'}</th><td>${plan.years || '-'}</td></tr>
          <tr><th>${isRTL ? 'دفعة إضافية' : 'Additional Payment'}</th><td>${currencyFmt(plan.extraPayment)}</td></tr>
          <tr><th>${isRTL ? 'تكرار الدفعة الإضافية' : 'Additional Payment Frequency'}</th><td>${plan.extraPaymentFrequency || '-'}</td></tr>
          <tr><th>${isRTL ? 'عدد الدفعات الإضافية' : 'Additional Payment Count'}</th><td>${plan.extraPaymentCount || '0'}</td></tr>
          <tr><th>${isRTL ? 'الاستلام' : 'Delivery'}</th><td>${plan.deliveryDate || '-'}</td></tr>
        </tbody>
      </table>
      <div class="actions">
        <button onclick="window.print()" style="padding:8px 12px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;">${isRTL ? 'طباعة' : 'Print'}</button>
      </div>
      </body></html>
    `)
    w.document.close()
  }
  const downloadPlanPdf = (plan, index, property = {}) => {
    const p = property
    const title = p.name || 'Property'
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text(`${isRTL ? 'خطة الدفع' : 'Payment Plan'} #${index + 1} - ${title}`, 14, 18)
    const rows = [
      [isRTL ? 'المقدم' : 'Down Payment', `${plan.downPayment || '-'} ${String(plan.downPaymentType || 'amount') === 'percentage' ? '%' : ''}`],
      [isRTL ? 'مبلغ الحجز' : 'Reservation Amount', String(plan.reservationAmount ?? p.reservationAmount ?? '0')],
      [isRTL ? 'دفعة الاستلام' : 'Receipt Amount', String(plan.receiptAmount || '0')],
      [isRTL ? 'قيمة القسط' : 'Installment Amount', String(plan.installmentAmount || '0')],
      [isRTL ? 'السنوات' : 'Years', String(plan.years || '-')],
      [isRTL ? 'دفعة إضافية' : 'Additional Payment', String(plan.extraPayment || '0')],
      [isRTL ? 'إجمالي المبلغ' : 'Total Amount', String(p.totalAfterDiscount || p.price || '0')],
      [isRTL ? 'الاستلام' : 'Delivery Date', plan.deliveryDate || '-'],
      [isRTL ? 'قيمة الجراج' : 'Garage Amount', String(p.garageAmount || '0')],
      [isRTL ? 'قيمة الصيانة' : 'Maintenance Amount', String(p.maintenanceAmount || '0')],
      [isRTL ? 'صافي المبلغ' : 'Net Amount', String(p.netAmount || '0')],
    ]
    autoTable(doc, {
      head: [[isRTL ? 'الحقل' : 'Field', isRTL ? 'القيمة' : 'Value']],
      body: rows,
      startY: 24,
      styles: { fontSize: 10 }
    })
    doc.save(`payment-plan-${index + 1}.pdf`)
  }
  useEffect(() => {
    try { document.documentElement.dir = isRTL ? 'rtl' : 'ltr' } catch { }
  }, [isRTL])
  // theme toggle removed on this page per request

  const [properties, setProperties] = useState([])
  const [dbProjects, setDbProjects] = useState([])
  const [buildings, setBuildings] = useState([])
  const [thirdParties, setThirdParties] = useState([])
  const [developers, setDevelopers] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const results = await Promise.allSettled([
        api.get('/api/properties?with=creator'),
        api.get('/api/projects'),
        api.get('/api/developers'),
        api.get('/api/users')
      ])

      if (results[0].status === 'fulfilled') {
        const propsRes = results[0].value.data
        const parseMaybeJson = (v) => {
          let cur = v
          for (let i = 0; i < 2; i++) {
            if (typeof cur !== 'string') break
            const s = cur.trim()
            if (!s) break
            if (!((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}')))) break
            try {
              cur = JSON.parse(s)
            } catch {
              break
            }
          }
          return cur
        }
        const pickPathFromObject = (obj) => {
          if (!obj || typeof obj !== 'object') return ''
          const candidates = [
            obj.path,
            obj.url,
            obj.src,
            obj.href,
            obj.download_url,
            obj.downloadUrl,
            obj.file_url,
            obj.fileUrl,
          ]
          for (const c of candidates) {
            if (typeof c === 'string' && c.trim()) return c.trim()
          }
          return ''
        }
        const asStringArray = (v) => {
          const parsed = parseMaybeJson(v)
          if (Array.isArray(parsed)) {
            return parsed
              .flat(Infinity)
              .map((x) => {
                if (typeof x === 'string') return x.trim()
                return pickPathFromObject(x)
              })
              .filter(Boolean)
          }
          if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()]
          if (parsed && typeof parsed === 'object') {
            const picked = pickPathFromObject(parsed)
            return picked ? [picked] : []
          }
          return []
        }
        const asArray = (v) => {
          const parsed = parseMaybeJson(v)
          return Array.isArray(parsed) ? parsed : []
        }
        const asSinglePath = (v) => {
          if (typeof v === 'string') {
            const parsed = parseMaybeJson(v)
            if (Array.isArray(parsed)) {
              const first = parsed.flat(Infinity).find(x => typeof x === 'string' && x.trim())
              return first ? first.trim() : ''
            }
            if (parsed && typeof parsed === 'object') {
              const picked = pickPathFromObject(parsed)
              return picked || ''
            }
            return v
          }
          if (Array.isArray(v)) {
            const first = v
              .flat(Infinity)
              .map((x) => {
                if (typeof x === 'string') return x.trim()
                return pickPathFromObject(x)
              })
              .find(Boolean)
            return first || ''
          }
          if (v && typeof v === 'object') {
            const picked = pickPathFromObject(v)
            return picked || ''
          }
          return ''
        }
        const mappedItems = (propsRes?.data || []).map(item => ({
          ...item,
          title: item.name || item.title,
          adTitle: item.ad_title,
          adTitleAr: item.ad_title_ar,
          propertyType: item.property_type,
          unitNumber: item.unit_number,
          unitCode: item.unit_code,
          bua: item.bua,
          internalArea: item.internal_area,
          externalArea: item.external_area,
          totalArea: item.total_area,
          ownerName: item.owner_name,
          ownerMobile: item.owner_mobile,
          rentCost: item.rent_cost,
          description: item.description,
          descriptionAr: item.description_ar,
          address: item.location,
          addressAr: item.address_ar,
          locationUrl: item.location_url,
          videoUrl: item.video_url,
          virtualTourUrl: item.virtual_tour_url,
          amenities: asArray(item.amenities),
          nearby: asArray(item.nearby),
          mainImage: asSinglePath(item.main_image || item.mainImage || item.image || item.cover || item.mainImageUrl || item.main_image_url),
          images: asStringArray(item.images || item.gallery_images || item.galleryImages || item.images_gallery || item.gallery || item.photos),
          floorPlans: asStringArray(item.floor_plans || item.floorPlans || item.plans),
          documents: asStringArray(item.documents || item.docs || item.attachments),
          areaUnit: item.area_unit,
          totalPrice: item.total_price,
          discount: item.discount,
          discountType: item.discount_type,
          reservationAmount: item.reservation_amount,
          garageAmount: item.garage_amount,
          maintenanceAmount: item.maintenance_amount,
          netAmount: item.net_amount,
          totalAfterDiscount: item.total_after_discount,
          installmentPlans: (() => {
            const parsed = parseMaybeJson(item.installment_plans)
            if (Array.isArray(parsed)) return parsed
            return parsed || []
          })(),
          // Group CIL for detail view compatibility
          cil: {
            to: item.cil_to,
            toAr: item.cil_to_ar,
            subject: item.cil_subject,
            subjectAr: item.cil_subject_ar,
            content: item.cil_content,
            contentAr: item.cil_content_ar,
            signature: item.cil_signature,
            signatureAr: item.cil_signature_ar,
            attachments: asStringArray(item.cil_attachments || item.cilAttachments || item.cil?.attachments)
          },
          cilTo: item.cil_to,
          cilToAr: item.cil_to_ar,
          cilSubject: item.cil_subject,
          cilSubjectAr: item.cil_subject_ar,
          cilContent: item.cil_content,
          cilContentAr: item.cil_content_ar,
          cilSignature: item.cil_signature,
          cilSignatureAr: item.cil_signature_ar,
          cilAttachments: asStringArray(item.cil_attachments || item.cilAttachments || item.cil?.attachments),
          contactName: item.contact_name,
          contactEmail: item.contact_email,
          contactPhone: item.contact_phone,
          city: item.city,
          building: item.building,
          internalMeterPrice: item.internal_meter_price,
          externalMeterPrice: item.external_meter_price,
          meterPrice: item.meter_price,
          area: item.total_area || item.area,
          createdDate: item.created_at ? new Date(item.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US') : '-',
          lastUpdated: item.updated_at ? new Date(item.updated_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US') : '-',
          createdBy: item.creator?.name || '-',
          // Visibility triggers for frontend
          hasExternalArea: !!item.external_area,
          purpose: item.purpose || (['Resale', 'Rent'].includes(item.status) ? item.status : 'Primary')
        }))
        setProperties(mappedItems)
      } else {
        toast.error(isRTL ? 'فشل تحميل العقارات' : 'Failed to load properties')
      }

      if (results[1].status === 'fulfilled') {
        const projectsRes = results[1].value.data
        setDbProjects(projectsRes?.data || [])
      } else {
        toast.error(isRTL ? 'فشل تحميل المشاريع' : 'Failed to load projects')
      }

      if (results[2].status === 'fulfilled') {
        const devRes = results[2].value.data
        const list = Array.isArray(devRes?.data) ? devRes.data : (Array.isArray(devRes) ? devRes : [])
        setDevelopers(list)
      }

      if (results[3].status === 'fulfilled') {
        const usersRes = results[3].value.data
        const list = Array.isArray(usersRes?.data) ? usersRes.data : (Array.isArray(usersRes) ? usersRes : [])
        setUsers(list)
      }
    } catch (e) {
      console.error(e)
      toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchProperties = fetchData

  useEffect(() => {
    fetchData()
  }, [])

  const { user, refreshInventoryBadges } = useAppState()

  useEffect(() => {
    const markSeen = async () => {
      try {
        await api.post('/api/inventory/mark-seen', { page: 'properties' })
        await refreshInventoryBadges()
      } catch {}
    }
    markSeen()
  }, [refreshInventoryBadges])

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const inventoryModulePerms = Array.isArray(modulePermissions.Inventory) ? modulePermissions.Inventory : []
  const effectiveInventoryPerms = inventoryModulePerms.length ? inventoryModulePerms : (() => {
    const role = user?.role || ''
    if (role === 'Operation Manager') return ['addItems', 'addProject', 'addProperties', 'addBroker', 'addDeveloper', 'showRequests']
    if (role === 'Branch Manager') return ['addItems', 'addProject', 'addProperties', 'addBroker', 'addDeveloper', 'showRequests']
    return []
  })()
  const roleLower = String(user?.role || '').toLowerCase()
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'
  const canManageProperties =
    effectiveInventoryPerms.includes('addProperties') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  const canDeleteInventory =
    user?.is_super_admin ||
    isTenantAdmin ||
    effectiveInventoryPerms.includes('deleteInventory')

  const canRevertSoldProperty =
    user?.is_super_admin ||
    isTenantAdmin ||
    effectiveInventoryPerms.includes('revertSoldProperty')

  const [showAllFilters, setShowAllFilters] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    project: '',
    building: '',
    owner: '',
    developer: '',
    type: '',
    status: '',
    unit: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    createdBy: '',
    createdDate: '',
    paymentPlan: '',
    room: '',
    floor: ''
  })

  const [showImportModal, setShowImportModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const revertSoldToAvailable = async (prop) => {
    if (!canRevertSoldProperty) return
    const id = prop?.id
    if (!id) return
    const ok = window.confirm(isRTL ? 'هل تريد إرجاع الوحدة إلى Available؟ هذا سيعيد فتحها للحجز والبيع.' : 'Revert this unit back to Available? This will reopen it for reservation and sale.')
    if (!ok) return
    const reason = window.prompt(isRTL ? 'سبب الإرجاع (اختياري):' : 'Reason (optional):') || ''
    try {
      await api.put(`/api/properties/${id}`, { status: 'Available', revert_reason: reason })
      setProperties(prev => prev.map(p => (p.id === id ? { ...p, status: 'Available' } : p)))
      toast.success(isRTL ? 'تم إرجاع الوحدة إلى Available' : 'Unit reverted to Available')
    } catch {
      toast.error(isRTL ? 'فشل إرجاع الوحدة' : 'Failed to revert unit')
    }
  }


  const cities = useMemo(() => Array.from(new Set([...dbProjects.map(p => p.city), ...properties.map(p => p.city)].filter(Boolean))).sort(), [dbProjects, properties])

  const developerOptions = useMemo(() => {
    if (developers.length) {
      return developers
        .filter(d => d && (d.name || d.id))
        .map(d => ({
          value: String(d.id),
          label: d.name || String(d.id)
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }
    const fromProjects = dbProjects.map(p => p.developer).filter(Boolean)
    const fromProps = properties.map(p => p.developer).filter(Boolean)
    return Array.from(new Set([...fromProjects, ...fromProps])).sort()
  }, [developers, dbProjects, properties])

  const types = useMemo(() => Array.from(new Set([...dbProjects.map(p => p.category), ...properties.map(p => p.propertyType)].filter(Boolean))).sort(), [dbProjects, properties])
  const allStatuses = useMemo(() => Array.from(new Set([...dbProjects.map(p => p.status), ...properties.map(p => p.status)].filter(Boolean))).sort(), [dbProjects, properties])
  const allPaymentPlans = useMemo(() => {
    const set = new Set()
    properties.forEach(p => {
      if (Array.isArray(p.installmentPlans)) {
        p.installmentPlans.forEach(plan => {
          if (!plan) return
          const dp = plan.downPayment ?? plan.down_payment ?? plan.dp
          const years = plan.years ?? plan.duration ?? plan.y
          const delivery = plan.deliveryDate ?? plan.delivery_date ?? plan.delivery
          const label = [dp, years, delivery].map(v => (v === null || v === undefined ? '-' : String(v))).join(' / ')
          set.add(label)
        })
      } else if (p.paymentPlan) {
        set.add(String(p.paymentPlan))
      }
    })
    return Array.from(set).sort()
  }, [properties])

  const allUnits = useMemo(() => Array.from(new Set(properties.map(p => p.unitCode || p.unit || p.unit_code).filter(Boolean))).sort(), [properties])

  const allProjects = useMemo(() => {
    const fromProjects = dbProjects.map(p => ((isRTL ? p.name_ar : p.name) || p.name || p.title || '').trim())
    const fromProps = properties.map(p => (p.project || '').trim())
    return Array.from(new Set([...fromProjects, ...fromProps])).filter(Boolean).sort()
  }, [dbProjects, properties, isRTL])

  const createdByOptions = useMemo(() => {
    if (users.length) {
      return users
        .filter(u => u && (u.name || u.id))
        .map(u => ({
          value: String(u.id),
          label: u.name || String(u.id)
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }
    return Array.from(new Set(properties.map(p => p.createdBy).filter(Boolean))).sort()
  }, [users, properties])

  const allRooms = useMemo(() => {
    const fromData = properties.map(p => p.rooms).filter(v => typeof v === 'number' && !Number.isNaN(v))
    const base = [1, 2, 3, 4, 5, 6]
    return Array.from(new Set([...base, ...fromData])).sort((a, b) => a - b)
  }, [properties])

  const allfloor = useMemo(() => {
    const fromData = properties.map(p => p.floor).filter(v => typeof v === 'number' && !Number.isNaN(v))
    const base = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    return Array.from(new Set([...base, ...fromData])).sort((a, b) => a - b)
  }, [properties])

  const allBuildings = useMemo(() => buildings.map(b => b.name), [buildings])
  const allOwners = useMemo(() => thirdParties.filter(t => t.type === 'Owner').map(t => t.name), [thirdParties])

  const filtered = useMemo(() => {
    return properties.filter(p => {
      // 0. Search
      if (filters.search) {
        const q = String(filters.search || '').toLowerCase().trim()
        if (q) {
          const name = String(p?.name || '').toLowerCase()
          const developer = String(p?.developer || '').toLowerCase()
          const city = String(p?.city || '').toLowerCase()
          const unit = String(p?.unit || '').toLowerCase()
          if (!name.includes(q) &&
            !developer.includes(q) &&
            !city.includes(q) &&
            !unit.includes(q)) return false
        }
      }
      // 1. Projects
      if (filters.project && p.project !== filters.project) return false
      // 1.1 Buildings
      if (filters.building && p.building !== filters.building) return false
      // 1.2 Owners
      if (filters.owner && p.owner !== filters.owner) return false

      // 2. Developer
      if (filters.developer && filters.developer !== 'All' && p.developer !== filters.developer) return false
      // 3. Type
      if (filters.type && filters.type !== 'All' && (p.type || 'Apartment') !== filters.type) return false
      // 4. Status
      if (filters.status && filters.status !== 'All' && p.status !== filters.status) return false
      // 5. Unit Code
      if (filters.unit && p.unit !== filters.unit) return false
      // 6. City
      if (filters.city && filters.city !== 'All' && p.city !== filters.city) return false

      // 7. Price Range
      if (filters.minPrice && p.price < Number(filters.minPrice)) return false
      if (filters.maxPrice && p.price > Number(filters.maxPrice)) return false

      // 8. Space Range
      if (filters.minArea && p.area < Number(filters.minArea)) return false
      if (filters.maxArea && p.area > Number(filters.maxArea)) return false

      // 9. Created By
      if (filters.createdBy && p.createdBy !== filters.createdBy) return false

      // 10. Created Date
      if (filters.createdDate && p.createdDate !== filters.createdDate) return false

      // 11. Payment Plan
      if (filters.paymentPlan && p.paymentPlan !== filters.paymentPlan) return false

      // 12. Rooms
      if (filters.room && p.rooms !== Number(filters.room)) return false

      // 13. floor
      if (filters.floor && p.floor !== Number(filters.floor)) return false

      return true
    })
  }, [properties, filters])

  const stats = useMemo(() => {
    return {
      total: properties.length,
      totalUnits: properties.reduce((a, b) => a + (b.units || 0), 0),
      sold: properties.filter(p => p.status === 'Sold').length,
      available: properties.filter(p => p.status === 'Available').length,
      reserved: properties.filter(p => p.status === 'Reserved').length,
      resale: properties.filter(p => p.status === 'Resale').length,
      rent: properties.filter(p => p.status === 'Rent').length,
    }
  }, [properties])

  const clearFilters = () => {
    setFilters({
      search: '',
      project: '',
      building: '',
      owner: '',
      developer: '',
      type: '',
      status: '',
      unit: '',
      city: '',
      minPrice: '',
      maxPrice: '',
      minArea: '',
      maxArea: '',
      createdBy: '',
      createdDate: '',
      paymentPlan: '',
      room: '',
      floor: ''
    })
  }

  const handleSaveProperty = async (rawPayload) => {
    try {
      setLoading(true)

      const payload = { ...rawPayload }
      const fd = new FormData()
      const appendKV = (k, v) => {
        if (v !== undefined && v !== '' && v !== null) fd.append(k, v)
      }
      appendKV('title', payload.adTitle || payload.project || 'Untitled Property')
      appendKV('name', payload.adTitle || payload.project || 'Untitled Property')
      appendKV('ad_title', payload.adTitle)
      appendKV('ad_title_ar', payload.adTitleAr)
      appendKV('project', payload.project)
      appendKV('category', payload.category)
      appendKV('property_type', payload.propertyType)
      appendKV('unit_number', payload.unitNumber)
      appendKV('unit_code', payload.unitCode)
      appendKV('building', payload.building)
      appendKV('floor', payload.floor)
      appendKV('rooms', payload.rooms)
      appendKV('bedrooms', payload.bedrooms)
      appendKV('bathrooms', payload.bathrooms)
      appendKV('finishing', payload.finishing)
      appendKV('view', payload.view)
      appendKV('delivery_date', payload.deliveryDate)
      appendKV('purpose', payload.purpose)
      appendKV('status', payload.status)
      appendKV('description', payload.description)
      appendKV('description_ar', payload.descriptionAr)
      appendKV('location', payload.address || payload.locationUrl)
      appendKV('location_url', payload.locationUrl)
      appendKV('bua', payload.bua)
      appendKV('internal_area', payload.internalArea)
      appendKV('external_area', payload.externalArea)
      appendKV('total_area', payload.totalArea)
      appendKV('area_unit', payload.areaUnit)
      appendKV('price', payload.price)
      appendKV('currency', payload.currency)
      appendKV('total_price', payload.totalPrice)
      appendKV('owner_name', payload.ownerName)
      appendKV('owner_mobile', payload.ownerMobile)
      appendKV('rent_cost', payload.rentCost)
      appendKV('video_url', payload.videoUrl)
      appendKV('virtual_tour_url', payload.virtualTourUrl)
      appendKV('amenities', Array.isArray(payload.amenities) ? JSON.stringify(payload.amenities) : payload.amenities)
      appendKV('cil_to', payload.cilTo)
      appendKV('cil_to_ar', payload.cilToAr)
      appendKV('cil_subject', payload.cilSubject)
      appendKV('cil_subject_ar', payload.cilSubjectAr)
      appendKV('cil_content', payload.cilContent)
      appendKV('cil_content_ar', payload.cilContentAr)
      appendKV('cil_signature', payload.cilSignature)
      appendKV('cil_signature_ar', payload.cilSignatureAr)
      appendKV('contact_name', payload.contactName)
      appendKV('contact_email', payload.contactEmail)
      appendKV('contact_phone', payload.contactPhone)
      appendKV('marketing_package', payload.marketingPackage)
      appendKV('city', payload.city)
      appendKV('address_ar', payload.addressAr)
      appendKV('nearby', Array.isArray(payload.nearby) ? JSON.stringify(payload.nearby) : payload.nearby)
      const cleanInstallmentPlans = Array.isArray(payload.installmentPlans)
        ? payload.installmentPlans.map((p) => {
            const { installmentAmountAuto, ...rest } = p || {}
            return rest
          })
        : payload.installmentPlans
      appendKV('installment_plans', Array.isArray(cleanInstallmentPlans) ? JSON.stringify(cleanInstallmentPlans) : cleanInstallmentPlans)
      appendKV('net_amount', payload.netAmount)
      appendKV('total_after_discount', payload.totalAfterDiscount)
      appendKV('discount_type', payload.discountType)
      appendKV('reservation_amount', payload.reservationAmount)
      appendKV('garage_amount', payload.garageAmount)
      appendKV('maintenance_amount', payload.maintenanceAmount)
      appendKV('elevator', payload.elevator)
      appendKV('internal_meter_price', payload.internalMeterPrice)
      appendKV('external_meter_price', payload.externalMeterPrice)
      appendKV('meter_price', payload.meterPrice)
      appendKV('internalMeterPrice', payload.internalMeterPrice)
      appendKV('externalMeterPrice', payload.externalMeterPrice)
      appendKV('meterPrice', payload.meterPrice)
      if (payload.mainImage instanceof File) {
        fd.append('main_image', payload.mainImage)
      } else if (typeof payload.mainImage === 'string') {
        fd.append('main_image_existing', payload.mainImage)
      }
      if (Array.isArray(payload.images)) {
        payload.images.forEach((img) => {
          if (img instanceof File) fd.append('images[]', img)
          else if (typeof img === 'string') fd.append('images_existing[]', img)
        })
      }
      if (Array.isArray(payload.floorPlans)) {
        payload.floorPlans.forEach((item) => {
          if (item instanceof File) fd.append('floor_plans[]', item)
          else if (typeof item === 'string') fd.append('floor_plans_existing[]', item)
        })
      }
      if (Array.isArray(payload.documents)) {
        payload.documents.forEach((item) => {
          if (item instanceof File) fd.append('documents[]', item)
          else if (typeof item === 'string') fd.append('documents_existing[]', item)
        })
      }
      if (Array.isArray(payload.cilAttachments)) {
        payload.cilAttachments.forEach((item) => {
          if (item instanceof File) fd.append('cil_attachments[]', item)
          else if (typeof item === 'string') fd.append('cil_attachments_existing[]', item)
        })
      }

      if (isEdit && selected) {
        fd.append('_method', 'PUT')
        await api.post(`/api/properties/${selected.id}`, fd)
        toast.success(isRTL ? 'تم تحديث العقار بنجاح' : 'Property updated successfully')
      } else {
        await api.post('/api/properties', fd)
        toast.success(isRTL ? 'تم إضافة العقار بنجاح' : 'Property added successfully')
      }
      fetchProperties()
      setShowCreateModal(false)
      setIsEdit(false)
      setSelected(null)
    } catch (e) {
      const serverData = e?.response?.data
      console.error('property_save_failed', serverData || e?.message, e)
      const serverText = typeof serverData === 'string' ? serverData.trim() : ''
      const serverTextShort = serverText ? serverText.slice(0, 300) : ''
      const errorMsg =
        (serverData && typeof serverData === 'object' && (serverData.message || serverData.error)) ||
        (serverTextShort ? serverTextShort : '') ||
        (isRTL ? 'فشل حفظ العقار' : 'Failed to save property')
      if (e.response?.data?.errors) {
        console.table(e.response.data.errors)
        const firstError = Object.values(e.response.data.errors)[0]
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError)
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProperty = async (id) => {
    if (!canDeleteInventory) {
      toast.error(isRTL ? 'لا تملك صلاحية الحذف' : 'You do not have permission to delete')
      return
    }
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا العقار؟' : 'Are you sure you want to delete this property?')) return
    try {
      setLoading(true)
      await api.delete(`/api/properties/${id}`)
      toast.success(isRTL ? 'تم حذف العقار بنجاح' : 'Property deleted successfully')
      fetchProperties()
    } catch (e) {
      console.error(e)
      toast.error(isRTL ? 'فشل حذف العقار' : 'Failed to delete property')
    } finally {
      setLoading(false)
    }
  }

  const Label = {
    title: isRTL ? 'العقارات' : 'Properties',
    search: isRTL ? 'بحث' : 'Search',
    filter: isRTL ? 'تصفية' : 'Filter',
    importProperties: isRTL ? 'استيراد' : 'Import',
    createProperty: isRTL ? 'إضافة عقار' : 'Add Property',
    clearFilters: isRTL ? 'اعادة التعيين' : 'Reset',
    exportCSV: isRTL ? 'تصدير CSV' : 'Export CSV',
    exportPDF: isRTL ? 'تصدير PDF' : 'Export PDF',
    projects: isRTL ? 'المشاريع' : 'Projects',
    buildings: isRTL ? 'المباني' : 'Buildings',
    owners: isRTL ? 'الملاك' : 'Owners',
    developer: isRTL ? 'المطور' : 'Developer',
    city: isRTL ? 'المدينة' : 'City',
    status: isRTL ? 'الحالة' : 'Status',
    unitCode: isRTL ? 'كود الوحدة' : 'Unit Code',
    type: isRTL ? 'النوع' : 'Type',
    paymentPlan: isRTL ? 'خطة الدفع' : 'Payment Plan',
    priceRange: isRTL ? 'نطاق السعر' : 'Price Range',
    spaceRange: isRTL ? 'نطاق المساحة' : 'Space Range',
    createdBy: isRTL ? 'بواسطة' : 'Created By',
    createdDate: isRTL ? 'تاريخ الإنشاء' : 'Created Date',
    room: isRTL ? 'الغرف' : 'Rooms',
    floor: isRTL ? 'الدور' : 'Floor',
  }

  const exportCSV = () => {
    const headers = ['name', 'city', 'developer', 'status', 'units', 'area', 'price', 'documents', 'lastUpdated', 'progress']
    const rows = filtered.map(p => headers.map(h => p[h] ?? ''))
    const csv = headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'properties.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    const [{ default: jsPDF }, autotable] = await Promise.all([
      import('jspdf'), import('jspdf-autotable')
    ])
    const doc = new jsPDF()
    const headers = ['Name', 'City', 'Dev', 'Status', 'Units', 'Area', 'Price']
    const rows = filtered.map(p => [p.name, p.city, p.developer, p.status, p.units, p.area, p.price])
    autotable.default(doc, { head: [headers], body: rows })
    doc.save('properties.pdf')
  }

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    setPage(1)
  }, [filtered, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  const goPrevPage = () => setPage(p => Math.max(1, p - 1))
  const goNextPage = () => setPage(p => Math.min(totalPages, p + 1))

  const shownFrom = useMemo(() => (filtered.length === 0 ? 0 : (page - 1) * pageSize + 1), [page, pageSize, filtered.length])
  const shownTo = useMemo(() => Math.min(page * pageSize, filtered.length), [page, pageSize, filtered.length])

  return (
    <div className="p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] overflow-x-hidden min-w-0">
      <div className="glass-panel rounded-xl p-4 md:p-6 relative z-30">

        <div className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3">
            <div className="relative flex flex-col items-start gap-1">
              <h1 className="page-title text-xl md:text-2xl font-bold text-start">{Label.title}</h1>
              <span
                aria-hidden="true"
                className="inline-block h-[2px] w-full rounded
               bg-gradient-to-r from-blue-500 to-purple-600"
              />
            </div>

          </div>

          <div className="w-full lg:w-auto flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
            {canManageProperties && (
              <button className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2" onClick={() => setShowImportModal(true)}>
                <FaFileImport className='text-white'/> <span className='text-white'>{Label.importProperties}</span>
              </button>
            )}

            {canManageProperties && (
              <button className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-green-500 text-white border-none flex items-center justify-center gap-2" onClick={() => { setIsEdit(false); setShowCreateModal(true); }}>
                <FaPlus className='text-white'/> <span className='text-white'>{Label.createProperty}</span>
              </button>
            )}

            <div className="relative w-full lg:w-auto">
              <button
                className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <FaFileExport className='text-white'/>
                <span className='text-white'>{isRTL ? 'تصدير' : 'Export'}</span>
                <FaChevronDown className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} size={10} />
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 w-full sm:w-32 overflow-hidden ltr:right-0 rtl:left-0">
                    <button
                      className="w-full text-black text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      onClick={() => {
                        exportCSV()
                        setShowExportMenu(false)
                      }}
                    >
                      CSV
                    </button>
                    <button
                      className="w-full text-black text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      onClick={() => {
                        exportPDF()
                        setShowExportMenu(false)
                      }}
                    >
                      PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FaFilter className="text-blue-500" /> {Label.filter}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAllFilters(prev => !prev)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                {showAllFilters ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض الكل' : 'Show All')}
                <FaChevronDown size={10} className={`transform transition-transform duration-300 ${showAllFilters ? 'rotate-180' : 'rotate-0'}`} />
              </button>
              <button onClick={clearFilters} className="flex-1 sm:flex-none px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-center">
                {Label.clearFilters}
              </button>
            </div>
          </div>

          {/* First Row (Always Visible) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-3">
            {/* 1. Search */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaSearch className="text-blue-500" size={10} /> {Label.search}</label>
              <input className="input w-full" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder={isRTL ? 'بحث...' : 'Search...'} />
            </div>

            {/* 2. Developer */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaBuilding className="text-blue-500" size={10} /> {Label.developer}</label>
              <SearchableSelect
                options={developerOptions}
                value={filters.developer}
                onChange={val => setFilters({ ...filters, developer: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 3. Projects */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaBuilding className="text-blue-500" size={10} /> {Label.projects}</label>
              <SearchableSelect
                options={allProjects}
                value={filters.project}
                onChange={val => setFilters({ ...filters, project: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 3.1 Buildings */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaBuilding className="text-blue-500" size={10} /> {Label.buildings}</label>
              <SearchableSelect
                options={allBuildings}
                value={filters.building}
                onChange={val => setFilters({ ...filters, building: val })}
                isRTL={isRTL}
              />
            </div>
          </div>

          {/* Collapsible Section (Rest of the filters) */}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 transition-all duration-300 overflow-hidden ${showAllFilters ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>

            {/* 3.2 Owners */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaUser className="text-blue-500" size={10} /> {Label.owners}</label>
              <SearchableSelect
                options={allOwners}
                value={filters.owner}
                onChange={val => setFilters({ ...filters, owner: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 4. Unit Code */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaSearch className="text-blue-500" size={10} /> {Label.unitCode}</label>
              <SearchableSelect
                options={allUnits}
                value={filters.unit}
                onChange={val => setFilters({ ...filters, unit: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 5. Payment Plan */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaFilter className="text-blue-500" size={10} /> {Label.paymentPlan}</label>
              <SearchableSelect
                options={allPaymentPlans}
                value={filters.paymentPlan}
                onChange={val => setFilters({ ...filters, paymentPlan: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 6. Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaFilter className="text-blue-500" size={10} /> {Label.type}</label>
              <SearchableSelect
                options={types}
                value={filters.type}
                onChange={val => setFilters({ ...filters, type: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 7. Status */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaFilter className="text-blue-500" size={10} /> {Label.status}</label>
              <SearchableSelect
                options={allStatuses}
                value={filters.status}
                onChange={val => setFilters({ ...filters, status: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 8. City */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaMapMarkerAlt className="text-blue-500" size={10} /> {Label.city}</label>
              <SearchableSelect
                options={cities}
                value={filters.city}
                onChange={val => setFilters({ ...filters, city: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 9. Created By */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaFilter className="text-blue-500" size={10} /> {Label.createdBy}</label>
              <SearchableSelect
                options={createdByOptions}
                value={filters.createdBy}
                onChange={val => setFilters({ ...filters, createdBy: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 10. Created Date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaFilter className="text-blue-500" size={10} /> {Label.createdDate}</label>
              <input
                type="date"
                className="input w-full"
                value={filters.createdDate}
                onChange={e => setFilters({ ...filters, createdDate: e.target.value })}
              />
            </div>

            {/* 11. Price Range */}
            <div className="col-span-1">
              <RangeSlider
                label={Label.priceRange}
                min={0}
                max={10000000}
                value={[Number(filters.minPrice || 0), Number(filters.maxPrice || 10000000)]}
                onChange={([min, max]) => setFilters({ ...filters, minPrice: min, maxPrice: max })}
                isRTL={isRTL}
              />
            </div>

            {/* 12. Space Range */}
            <div className="col-span-1">
              <RangeSlider
                label={Label.spaceRange}
                min={0}
                max={1000}
                value={[Number(filters.minArea || 0), Number(filters.maxArea || 1000)]}
                onChange={([min, max]) => setFilters({ ...filters, minArea: min, maxArea: max })}
                isRTL={isRTL}
              />
            </div>

            {/* 13. Rooms */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaFilter className="text-blue-500" size={10} /> {Label.room}</label>
              <SearchableSelect
                options={allRooms.map(String)}
                value={filters.room}
                onChange={val => setFilters({ ...filters, room: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 14. floor */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaFilter className="text-blue-500" size={10} /> {Label.floor}</label>
              <SearchableSelect
                options={allfloor.map(String)}
                value={filters.floor}
                onChange={val => setFilters({ ...filters, floor: val })}
                isRTL={isRTL}
              />
            </div>
          </div>
        </div>
      </div>

      {/* صف فاضي فوق "الجدول" (نعتبر الملخص كجدول) */}
      <div className="h-4" />

      {/* Summary KPIs */}
      <PropertiesSummaryPanel stats={stats} isRTL={isRTL} onFilter={(f) => {
        if (f.type === 'status') setFilters(prev => ({ ...prev, status: f.value }))
        else clearFilters()
      }} />

      {/* 5 صفوف فاضية تحت الفلتر */}
      <div className="h-4" />
      <div className="h-4" />
      <div className="h-4" />
      <div className="h-4" />
      <div className="h-4" />

      {/* Properties List */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {paged.map(p => (
          <PropertyCard
            key={p.id}
            p={p}
            isRTL={isRTL}
            dynamicFields={dynamicFields}
            onView={setSelected}
            onEdit={() => { setSelected(p); setIsEdit(true); setShowCreateModal(true) }}
            onRevertSoldToAvailable={canRevertSoldProperty ? revertSoldToAvailable : null}
            onShare={async () => {
              try {
                const companyInfo = (companySetup && companySetup.companyInfo) || {}
                const isPdfUrl = (u) => typeof u === 'string' && u.toLowerCase().includes('.pdf')
                const galleryImages = Array.isArray(p.images)
                  ? p.images
                      .filter(img => typeof img === 'string')
                      .map(img => getFileUrl(img))
                      .filter(Boolean)
                  : []
                const floorPlans = Array.isArray(p.floorPlans)
                  ? p.floorPlans
                      .filter(fp => typeof fp === 'string')
                      .map(fp => getFileUrl(fp))
                      .filter(Boolean)
                  : []
                const documents = Array.isArray(p.documents)
                  ? p.documents
                      .filter(d => typeof d === 'string')
                      .map(d => getFileUrl(d))
                      .filter(Boolean)
                  : []
                const safeMedia = [...galleryImages, ...floorPlans].filter(u => !isPdfUrl(u))
                const payload = {
                  theme: 'theme1',
                  title: p.adTitle || p.name,
                  description: p.description,
                  email: companyInfo.email || '',
                  phone: companyInfo.phone || p.ownerMobile || '',
                  logo: companyInfo.logoUrl || p.logo || '',
                  cover: (typeof p.mainImage === 'string' ? getFileUrl(p.mainImage) : p.mainImage) || galleryImages[0] || '',
                  media: safeMedia,
                  facebook: companyInfo.facebook || '',
                  instagram: companyInfo.instagram || '',
                  twitter: companyInfo.twitter || '',
                  linkedin: companyInfo.linkedin || '',
                  url: companyInfo.websiteUrl || '',
                  property: {
                    id: p.id,
                    name: p.adTitle || p.name,
                    status: p.status,
                    project: p.project,
                    purpose: p.purpose,
                    unitCode: p.unitCode || p.code,
                    building: p.building,
                    owner: p.owner,
                    city: p.city,
                    address: p.address,
                    price: p.price,
                    currency: p.currency,
                    bedrooms: p.bedrooms ?? p.rooms,
                    bathrooms: p.bathrooms ?? p.doors,
                    area: p.area ?? p.totalArea,
                    areaUnit: p.areaUnit,
                    ownerMobile: p.ownerMobile,
                    propertyType: p.propertyType || p.type,
                    mainImage: (typeof p.mainImage === 'string' ? getFileUrl(p.mainImage) : p.mainImage) || '',
                    images: galleryImages,
                    floorPlans,
                    documents,
                    videoUrl: p.videoUrl,
                    virtualTourUrl: p.virtualTourUrl,
                    locationUrl: p.locationUrl,
                    installmentPlans: Array.isArray(p.installmentPlans) ? p.installmentPlans : [],
                  },
                }
                const base = (import.meta.env?.BASE_URL || '/')
                const prefix = base.endsWith('/') ? base.slice(0, -1) : base
                const scope = prefix === '/' ? '' : prefix
                const companyName = (companySetup && companySetup.companyInfo && companySetup.companyInfo.companyName) || ''
                const companyParam = companyName ? `&company=${encodeURIComponent(companyName)}` : ''
                const useServerLandingShare = String(import.meta.env?.VITE_SHARE_SERVER_LANDING || '') === 'true'
                const baseUrl = getShareOrigin()

                let url = ''
                try {
                  const res = await api.post('/share-links', { payload, expires_in_days: 14 })
                  const token = res?.data?.data?.token || res?.data?.token || ''
                  if (token) {
                    if (useServerLandingShare) {
                      const companyQuery = companyName ? `?company=${encodeURIComponent(companyName)}` : ''
                      url = `${baseUrl}${scope}/l/${encodeURIComponent(token)}${companyQuery}`
                    } else {
                      url = `${baseUrl}${scope}/#/landing-preview?token=${encodeURIComponent(token)}${companyParam}`
                    }
                  }
                } catch {}

                if (!url) {
                  const json = JSON.stringify(payload)
                  const bytes = new TextEncoder().encode(json)
                  let bin = ''
                  bytes.forEach(b => { bin += String.fromCharCode(b) })
                  const data = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
                  url = `${baseUrl}${scope}/#/landing-preview?data=${encodeURIComponent(data)}${companyParam}`
                }

                try {
                  const u = new URL(url)
                  u.hostname = String(u.hostname || '').replace(/\.$/, '')
                  url = u.toString()
                } catch {}

                if (navigator?.share) {
                  navigator.share({ title: payload.title || 'Property', text: (isRTL ? 'عرض تفاصيل الوحدة' : 'View property details'), url })
                } else {
                  navigator.clipboard && navigator.clipboard.writeText(url)
                  const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: (isRTL ? 'تم نسخ رابط المشاركة' : 'Share link copied') } })
                  window.dispatchEvent(evt)
                }
              } catch { }
            }}
              onDelete={canDeleteInventory ? () => handleDeleteProperty(p.id) : null}
          />
        ))}
      </div>

      {/* صف فاضي تحت الكروت */}
      <div className="h-4" />

      {/* Pagination Footer */}
      <div className="mt-2 flex items-center justify-between rounded-xl p-2 glass-panel">
        <div className="text-xs text-[var(--muted-text)]">
          {isRTL ? `عرض ${shownFrom}–${shownTo} من ${filtered.length}` : `Showing ${shownFrom}–${shownTo} of ${filtered.length}`}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              className="btn btn-sm btn-ghost"
              onClick={goPrevPage}
              disabled={page <= 1}
              title={isRTL ? 'السابق' : 'Prev'}
            >
              <FaChevronLeft className={isRTL ? 'scale-x-[-1]' : ''} />
            </button>
            <span className="text-sm">{isRTL ? `الصفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
            <button
              className="btn btn-sm btn-ghost"
              onClick={goNextPage}
              disabled={page >= totalPages}
              title={isRTL ? 'التالي' : 'Next'}
            >
              <FaChevronRight className={isRTL ? 'scale-x-[-1]' : ''} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--muted-text)]">{isRTL ? 'لكل صفحة:' : 'Per page:'}</span>
            <select
              className="input w-24 text-sm"
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
            >
              <option value={4}>4</option>
              <option value={6}>6</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100]">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <ImportPropertiesModal
            onClose={() => setShowImportModal(false)}
            isRTL={isRTL}
            onImported={() => {
              fetchProperties()
            }}
          />
        </div>
      )}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100]">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
           <CreatePropertyModal
             onClose={() => { setShowCreateModal(false); setSelected(null); setIsEdit(false) }}
             isRTL={isRTL}
             isEdit={isEdit}
             onSave={handleSaveProperty}
             buildings={buildings}
             projects={dbProjects}
             owners={thirdParties.filter(t => t.type === 'Owner')}
             initialData={isEdit ? selected : null}
           />
        </div>
      )}
      {selected && !showCreateModal && (<PropertyDetailsModal p={selected} isRTL={isRTL} onClose={() => setSelected(null)} />)}
    </div>
  )
}

function PropertyDetailsModal({ p, isRTL, onClose }) {
  const [activeTab, setActiveTab] = useState('core')
  const [preview, setPreview] = useState({ list: [], index: -1 })
  const tabs = [
    { id: 'core', label: isRTL ? 'التفاصيل الأساسية' : 'Core Details' },
    { id: 'features', label: isRTL ? 'مواصفات العقار' : 'Features' },
    { id: 'media', label: isRTL ? 'الوسائط' : 'Media' },
    { id: 'location', label: isRTL ? 'الموقع' : 'Location' },
    { id: 'financial', label: isRTL ? 'المالية' : 'Financial' },
    { id: 'cil', label: isRTL ? 'بيانات العميل' : 'CIL' },
    { id: 'publish', label: isRTL ? 'النشر والتوزيع' : 'Publish & Marketing' },
  ]
  const ReadOnlyField = ({ label, value }) => (
    <div>
      <label className="block text-xs text-[var(--muted-text)] mb-1">{label}</label>
      <div className="p-2 rounded-lg bg-transparent border border-gray-200 dark:border-gray-700 text-sm min-h-[38px]">{value || '-'}</div>
    </div>
  )
  const hasAddress = p.address && p.address !== '-'
  const hasAddressAr = p.addressAr && p.addressAr !== '-'
  const hasCity = p.city && p.city !== '-'
  const hasLocationUrl = !!p.locationUrl
  const hasNearby = Array.isArray(p.nearby) && p.nearby.length > 0
  const hasLocationData = hasAddress || hasAddressAr || hasCity || hasLocationUrl || hasNearby
  const SectionTitle = ({ children }) => (
    <h3 className="text-lg font-semibold mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">{children}</h3>
  )
  const normalizeSrc = (img) => {
    if (!img) return ''
    if (img instanceof File) return URL.createObjectURL(img)
    if (typeof img === 'string') return getFileUrl(img)
    return ''
  }
  const normalizeSrcPair = (img) => {
    if (!img) return null
    if (img instanceof File) return { src: URL.createObjectURL(img), fallback: '' }
    if (typeof img === 'string') return { src: getFileUrl(img), fallback: getPublicFilesUrl(img) }
    return null
  }
  const openPreview = (list, idx) => {
    const mapped = (Array.isArray(list) ? list : []).map(normalizeSrcPair).filter((v) => v && v.src)
    const nextIndex = mapped.length ? Math.max(0, Math.min(idx, mapped.length - 1)) : -1
    setPreview({ list: mapped, index: nextIndex })
  }
  const closePreview = () => setPreview({ list: [], index: -1 })
  const prevImg = () => setPreview(v => ({ ...v, index: (v.index - 1 + v.list.length) % v.list.length }))
  const nextImg = () => setPreview(v => ({ ...v, index: (v.index + 1) % v.list.length }))
  const fitAddImage = async (doc, dataUrl) => {
    const img = new Image()
    img.src = dataUrl
    await new Promise((r) => { img.onload = r })
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()
    const m = 20
    const aw = pw - m * 2
    const ah = ph - m * 2
    const ratio = Math.min(aw / img.width, ah / img.height)
    const w = img.width * ratio
    const h = img.height * ratio
    const x = m + (aw - w) / 2
    const y = m + (ah - h) / 2
    const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
    doc.addImage(dataUrl, fmt, x, y, w, h)
  }
  const downloadImagesPdf = async () => {
    const rawList = [
      ...(p.mainImage ? [p.mainImage] : []),
      ...(Array.isArray(p.images) ? p.images : []),
      ...(Array.isArray(p.floorPlans) ? p.floorPlans : []),
    ]
    const list = (Array.isArray(rawList) ? rawList : []).map((img) => {
      if (img instanceof File) return img
      return normalizeSrc(img)
    }).filter(Boolean)
    if (list.length === 0) {
      toast.error(isRTL ? 'لا توجد صور لتحويلها إلى PDF' : 'No images to export')
      return
    }
    try {
      const jsPDF = (await import('jspdf')).default
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      let added = 0
      for (let i = 0; i < list.length; i++) {
        const src = list[i]
        try {
          const dataUrl = await toDataUrl(src)
          await fitAddImage(doc, dataUrl)
          added++
          if (i < list.length - 1) doc.addPage()
        } catch (e) {
          console.error('Failed to add image to PDF', e)
        }
      }
      if (added === 0) {
        toast.error(isRTL ? 'تعذر إنشاء ملف PDF من الصور' : 'Failed to generate PDF from images')
        return
      }
      doc.save(`${(p.adTitle || p.name || 'property').replace(/[\\/:*?\"<>|]/g, '_')}_media.pdf`)
    } catch (e) {
      console.error('downloadImagesPdf error', e)
      toast.error(isRTL ? 'حدث خطأ أثناء تنزيل ملف PDF' : 'Error while downloading PDF')
    }
  }
  const [planPreview, setPlanPreview] = useState(null)
  const [isPlanPreviewOpen, setIsPlanPreviewOpen] = useState(false)
  const openPlanPreview = (plan) => { setPlanPreview({ ...plan, reservationAmount: plan.reservationAmount ?? p.reservationAmount, garageAmount: p.garageAmount, maintenanceAmount: p.maintenanceAmount, netAmount: p.netAmount, totalAmount: p.totalAfterDiscount || p.price }); setIsPlanPreviewOpen(true) }
  const closePlanPreview = () => { setIsPlanPreviewOpen(false); setPlanPreview(null) }
  const printPlan = (plan) => {
    const w = window.open('', '_blank')
    if (!w) return
    const currencyFmt = (v) => new Intl.NumberFormat('en-EG', { maximumFractionDigits: 2 }).format(Number(v || 0))
    w.document.write(`
      <html><head><title>Payment Plan</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
        th { background: #f3f4f6; }
        .actions { margin-top: 16px; }
      </style>
      </head><body>
      <h2>${isRTL ? 'معاينة خطة الدفع' : 'Payment Plan Preview'}</h2>
      <table>
        <tbody>
          <tr><th>${isRTL ? 'المقدم' : 'Down Payment'}</th><td>${plan.downPayment || '-'} ${String(plan.downPaymentType || 'amount') === 'percentage' ? '%' : ''}</td></tr>
          <tr><th>${isRTL ? 'مبلغ الحجز' : 'Reservation Amount'}</th><td>${currencyFmt(plan.reservationAmount)}</td></tr>
          <tr><th>${isRTL ? 'دفعة الاستلام' : 'Receipt Amount'}</th><td>${currencyFmt(plan.receiptAmount)}</td></tr>
          <tr><th>${isRTL ? 'قيمة القسط' : 'Installment Amount'}</th><td>${currencyFmt(plan.installmentAmount)}</td></tr>
          <tr><th>${isRTL ? 'السنوات' : 'Years'}</th><td>${plan.years || '-'}</td></tr>
          <tr><th>${isRTL ? 'دفعة إضافية' : 'Additional Payment'}</th><td>${currencyFmt(plan.extraPayment)}</td></tr>
          <tr><th>${isRTL ? 'إجمالي المبلغ' : 'Total Amount'}</th><td>${currencyFmt(plan.totalAmount)}</td></tr>
          <tr><th>${isRTL ? 'الاستلام' : 'Delivery Date'}</th><td>${plan.deliveryDate || '-'}</td></tr>
          <tr><th>${isRTL ? 'قيمة الجراج' : 'Garage Amount'}</th><td>${currencyFmt(plan.garageAmount)}</td></tr>
          <tr><th>${isRTL ? 'قيمة الصيانة' : 'Maintenance Amount'}</th><td>${currencyFmt(plan.maintenanceAmount)}</td></tr>
          <tr><th>${isRTL ? 'صافي المبلغ' : 'Net Amount'}</th><td>${currencyFmt(plan.netAmount)}</td></tr>
        </tbody>
      </table>
      <div class="actions">
        <button onclick="window.print()" style="padding:8px 12px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;">${isRTL ? 'طباعة' : 'Print'}</button>
      </div>
      </body></html>
    `)
    w.document.close()
  }
  const downloadPlanPdf = (plan, index, title = 'Property') => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text(`${isRTL ? 'خطة الدفع' : 'Payment Plan'} #${index + 1} - ${title}`, 14, 18)
    const rows = [
      [isRTL ? 'المقدم' : 'Down Payment', `${plan.downPayment || '-'} ${String(plan.downPaymentType || 'amount') === 'percentage' ? '%' : ''}`],
      [isRTL ? 'نوع الحجز' : 'Reservation Type', plan.reservationType || '-'],
      [isRTL ? 'دفعة الاستلام' : 'Receipt Amount', String(plan.receiptAmount || '0')],
      [isRTL ? 'قيمة القسط' : 'Installment Amount', String(plan.installmentAmount || '0')],
      [isRTL ? 'تكرار القسط' : 'Installment Frequency', plan.installmentFrequency || '-'],
      [isRTL ? 'السنوات' : 'Years', String(plan.years || '-')],
      [isRTL ? 'دفعة إضافية' : 'Additional Payment', String(plan.extraPayment || '0')],
      [isRTL ? 'تكرار الدفعة الإضافية' : 'Additional Payment Frequency', plan.extraPaymentFrequency || '-'],
      [isRTL ? 'عدد الدفعات الإضافية' : 'Additional Payment Count', String(plan.extraPaymentCount || '0')],
      [isRTL ? 'الاستلام' : 'Delivery', plan.deliveryDate || '-'],
      [isRTL ? 'قيمة الجراج' : 'Garage Amount', String(plan.garageAmount || '0')],
      [isRTL ? 'قيمة الصيانة' : 'Maintenance Amount', String(plan.maintenanceAmount || '0')],
      [isRTL ? 'صافي المبلغ' : 'Net Amount', String(plan.netAmount || '0')],
    ]
    autoTable(doc, {
      head: [[isRTL ? 'الحقل' : 'Field', isRTL ? 'القيمة' : 'Value']],
      body: rows,
      startY: 24,
      styles: { fontSize: 10 }
    })
    doc.save(`payment-plan-${index + 1}.pdf`)
  }
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[210] bg-[var(--content-bg)] text-[var(--content-text)] w-full h-screen sm:w-[900px] sm:max-w-[92vw] sm:max-h-[88vh] sm:h-auto sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-xl font-bold truncate flex-1">{p.adTitle || p.name}</h2>
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{p.status || '-'}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title={isRTL ? 'إغلاق' : 'Close'}><FaTimes /></button>
        </div>
        <div className="px-4 pt-4">
          <div className={`flex items-center gap-4 ${isRTL ? 'justify-end' : 'justify-start'} overflow-x-auto`} dir={isRTL ? 'rtl' : 'ltr'}>
            {(isRTL ? [...tabs].slice().reverse() : tabs).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-3 py-2 text-sm rounded-lg border whitespace-nowrap ${activeTab === t.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 text-[var(--content-text)]'}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="p-4 min-h-[400px]">
          {activeTab === 'core' && (
            <div className="space-y-6">
              <SectionTitle>{isRTL ? 'المعلومات الأساسية' : 'Basic Info'}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadOnlyField label={isRTL ? 'عنوان الإعلان' : 'Ad Title'} value={p.adTitle || p.name} />
                <ReadOnlyField label={isRTL ? 'عنوان الإعلان (عربي)' : 'Ad Title (Ar)'} value={p.adTitleAr} />
                <ReadOnlyField label={isRTL ? 'المشروع' : 'Project'} value={p.project} />
                <ReadOnlyField label={isRTL ? 'التصنيف' : 'Category'} value={p.category} />
                <ReadOnlyField label={isRTL ? 'نوع العقار' : 'Property Type'} value={p.propertyType || p.type} />
                <ReadOnlyField label={isRTL ? 'رقم الوحدة' : 'Unit Number'} value={p.unitNumber} />
                <ReadOnlyField label={isRTL ? 'كود الوحدة' : 'Unit Code'} value={p.unitCode || p.unit} />
                <ReadOnlyField label={isRTL ? 'المبنى' : 'Building'} value={p.building} />
                <ReadOnlyField label={isRTL ? 'الغرض' : 'Purpose'} value={p.purpose} />
                <ReadOnlyField label={isRTL ? 'الحالة' : 'Status'} value={p.status} />
                <ReadOnlyField label={isRTL ? 'تاريخ الإنشاء' : 'Created Date'} value={p.createdDate} />
                <ReadOnlyField label={isRTL ? 'تم الإنشاء بواسطة' : 'Created By'} value={p.createdBy} />
                {p.purpose === 'Rent' && <ReadOnlyField label={isRTL ? 'قيمة الإيجار' : 'Rent Cost'} value={p.rentCost} />}
                <ReadOnlyField label={isRTL ? 'سعر المتر' : 'Meter Price'} value={p.meterPrice} />
              </div>

              <SectionTitle>{isRTL ? 'المساحات' : 'Areas'}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadOnlyField label={isRTL ? 'المساحة الكلية' : 'Total Area'} value={`${p.totalArea || p.area || 0} ${p.areaUnit || 'm²'}`} />
                <ReadOnlyField label={isRTL ? 'مساحة المباني' : 'BUA'} value={p.bua} />
                {p.hasExternalArea && (
                  <>
                    <ReadOnlyField label={isRTL ? 'المساحة الداخلية' : 'Internal Area'} value={p.internalArea} />
                    <ReadOnlyField label={isRTL ? 'المساحة الخارجية' : 'External Area'} value={p.externalArea} />
                  </>
                )}
                <ReadOnlyField label={isRTL ? 'سعر المتر الداخلي' : 'Internal Meter Price'} value={p.internalMeterPrice} />
                <ReadOnlyField label={isRTL ? 'سعر المتر الخارجي' : 'External Meter Price'} value={p.externalMeterPrice} />
              </div>

              <SectionTitle>{isRTL ? 'تفاصيل الوحدة' : 'Unit Details'}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadOnlyField label={isRTL ? 'غرف النوم' : 'Bedrooms'} value={p.bedrooms ?? p.rooms} />
                <ReadOnlyField label={isRTL ? 'الحمامات' : 'Bathrooms'} value={p.bathrooms} />
                <ReadOnlyField label={isRTL ? 'الدور' : 'Floor'} value={p.floor} />
                <ReadOnlyField label={isRTL ? 'التشطيب' : 'Finishing'} value={p.finishing} />
                <ReadOnlyField label={isRTL ? 'الإطلالة' : 'View'} value={p.view} />
                <ReadOnlyField label={isRTL ? 'مصعد' : 'Elevator'} value={p.elevator ? (isRTL ? 'نعم' : 'Yes') : (isRTL ? 'لا' : 'No')} />
              </div>

              <SectionTitle>{isRTL ? 'بيانات المالك' : 'Owner Info'}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadOnlyField label={isRTL ? 'اسم المالك' : 'Owner Name'} value={p.ownerName} />
                <ReadOnlyField label={isRTL ? 'هاتف المالك' : 'Owner Mobile'} value={p.ownerMobile} />
              </div>
            </div>
          )}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <SectionTitle>{isRTL ? 'الوصف' : 'Description'}</SectionTitle>
              <div className="text-sm text-[var(--content-text)] whitespace-pre-wrap p-3 rounded border border-gray-200 dark:border-gray-700">
                {(isRTL ? (p.descriptionAr || p.description) : (p.description || p.descriptionAr)) || '-'}
              </div>
              {p.description && p.descriptionAr && (
                <div className="text-sm text-[var(--content-text)] whitespace-pre-wrap p-3 rounded border border-gray-200 dark:border-gray-700 mt-2" dir={isRTL ? 'ltr' : 'rtl'}>
                  {isRTL ? p.description : p.descriptionAr}
                </div>
              )}
              <SectionTitle>{isRTL ? 'المواصفات' : 'Amenities'}</SectionTitle>
              {Array.isArray(p.amenities) && p.amenities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {p.amenities.map((item, idx) => (
                    <div key={idx} className="p-2 rounded border border-gray-200 dark:border-gray-700 text-sm">{item}</div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--muted-text)]">{isRTL ? 'لا توجد مواصفات' : 'No amenities'}</div>
              )}
            </div>
          )}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="label font-bold text-blue-600">{isRTL ? 'الصورة الرئيسية' : 'Main Image'}</label>
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-64 bg-transparent flex items-center justify-center">
                  {p.mainImage ? (
                    <img
                      src={normalizeSrc(p.mainImage)}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        if (typeof p.mainImage !== 'string') return
                        const imgEl = e.currentTarget
                        if (imgEl.dataset.fallbackTried === '1') return
                        const fallback = getPublicFilesUrl(p.mainImage)
                        if (!fallback || fallback === imgEl.src) return
                        imgEl.dataset.fallbackTried = '1'
                        imgEl.src = fallback
                      }}
                    />
                  ) : (
                    <FaImage className="text-4xl text-gray-300" />
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <SectionTitle>{isRTL ? 'معرض الصور' : 'Gallery'}</SectionTitle>
                  <button className="btn btn-glass inline-flex items-center gap-2 text-xs" onClick={downloadImagesPdf} title={isRTL ? 'تنزيل PDF' : 'Download PDF'}>
                    <FaCloudDownloadAlt /> {isRTL ? 'تنزيل PDF' : 'Download PDF'}
                  </button>
                </div>
                {Array.isArray(p.images) && p.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {p.images.map((img, idx) => {
                      const src = normalizeSrc(img)
                      if (!src) return null
                      const fallback = typeof img === 'string' ? getPublicFilesUrl(img) : ''
                      return (
                        <button key={idx} className="rounded-lg overflow-hidden h-32 border border-gray-200 dark:border-gray-700 focus:outline-none" onClick={() => openPreview(p.images, idx)} title={isRTL ? 'عرض' : 'View'}>
                          <img
                            src={src}
                            alt={`gallery-${idx}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const imgEl = e.currentTarget
                              if (!fallback || fallback === imgEl.src) return
                              if (imgEl.dataset.fallbackTried === '1') return
                              imgEl.dataset.fallbackTried = '1'
                              imgEl.src = fallback
                            }}
                          />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-[var(--muted-text)]">{isRTL ? 'لا توجد صور' : 'No images'}</div>
                )}
              </div>
              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'المخططات' : 'Floor Plans'}</SectionTitle>
                {Array.isArray(p.floorPlans) && p.floorPlans.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {p.floorPlans.map((item, idx) => {
                      const isFile = item instanceof File
                      const isPdf = isFile ? String(item.type || '').includes('pdf') : (typeof item === 'string' ? item.toLowerCase().endsWith('.pdf') : false)
                      if (isPdf) {
                        const href = isFile ? URL.createObjectURL(item) : getFileUrl(String(item))
                        const name = isFile ? (item.name || `plan-${idx}.pdf`) : `plan-${idx}.pdf`
                        return (
                          <a key={idx} href={href} download={name} target="_blank" rel="noreferrer" className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm">
                            <FaPaperclip /> {isRTL ? 'تحميل مخطط PDF' : 'Download PDF Plan'}
                          </a>
                        )
                      }
                      const src = normalizeSrc(item)
                      if (!src) return null
                      const fallback = typeof item === 'string' ? getPublicFilesUrl(item) : ''
                      return (
                        <button key={idx} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus:outline-none" onClick={() => openPreview(p.floorPlans, idx)} title={isRTL ? 'عرض' : 'View'}>
                          <img
                            src={src}
                            alt={`floor-${idx}`}
                            className="w-full h-auto object-contain"
                            onError={(e) => {
                              const imgEl = e.currentTarget
                              if (!fallback || fallback === imgEl.src) return
                              if (imgEl.dataset.fallbackTried === '1') return
                              imgEl.dataset.fallbackTried = '1'
                              imgEl.src = fallback
                            }}
                          />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-[var(--muted-text)] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">{isRTL ? 'لا توجد مخططات' : 'No plans'}</div>
                )}
              </div>
              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'الملفات' : 'Documents'}</SectionTitle>
                {Array.isArray(p.documents) && p.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {p.documents.map((doc, idx) => {
                      const isFile = doc instanceof File
                      const href = isFile ? URL.createObjectURL(doc) : getFileUrl(String(doc))
                      const name = isFile ? (doc.name || `document-${idx}.pdf`) : `document-${idx}.pdf`
                      return (
                        <a key={idx} href={href} download={name} target="_blank" rel="noreferrer" className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2"><FaPaperclip /> {name}</span>
                          <span className="btn btn-glass inline-flex items-center gap-2 text-xs"><FaCloudDownloadAlt /> {isRTL ? 'تنزيل' : 'Download'}</span>
                        </a>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--muted-text)]">{isRTL ? 'لا توجد ملفات' : 'No documents'}</div>
                )}
              </div>
              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'روابط الفيديو' : 'Video Links'}</SectionTitle>
                {p.videoUrl || p.virtualTourUrl ? (
                  <div className="space-y-2">
                    {p.videoUrl && (
                      <div className="p-3 rounded-lg bg-transparent border border-gray-200 dark:border-gray-700">
                        <a href={p.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline"><FaVideo /> {p.videoUrl}</a>
                      </div>
                    )}
                    {p.virtualTourUrl && (
                      <div className="p-3 rounded-lg bg-transparent border border-gray-200 dark:border-gray-700">
                        <a href={p.virtualTourUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline"><FaVideo /> {p.virtualTourUrl}</a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--muted-text)]">{isRTL ? 'لا يوجد فيديو' : 'No videos'}</div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'location' && (
            <div className="space-y-4">
              {hasLocationData ? (
                <>
                  <SectionTitle>{isRTL ? 'العنوان' : 'Address'}</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hasAddress && <ReadOnlyField label={isRTL ? 'العنوان (إنجليزي)' : 'Address (EN)'} value={p.address} />}
                    {hasAddressAr && <ReadOnlyField label={isRTL ? 'العنوان (عربي)' : 'Address (Ar)'} value={p.addressAr} />}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hasCity && <ReadOnlyField label={isRTL ? 'المدينة' : 'City'} value={p.city} />}
                    {hasLocationUrl && (
                      <div>
                        <label className="block text-xs text-[var(--muted-text)] mb-1">{isRTL ? 'رابط الموقع' : 'Location URL'}</label>
                        <a
                          href={p.locationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-transparent border border-gray-200 dark:border-gray-700 text-sm min-h-[38px] break-all text-blue-600 hover:underline"
                        >
                          {p.locationUrl}
                        </a>
                      </div>
                    )}
                  </div>
                  {hasNearby && (
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--muted-text)]">{isRTL ? 'الأماكن المجاورة' : 'Nearby'}</label>
                      <div className="flex flex-wrap gap-2">
                        {p.nearby.map((n, i) => (
                          <span key={i} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs">{n}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-[var(--muted-text)]">
                  {isRTL ? 'لا توجد بيانات موقع' : 'No location details'}
                </div>
              )}
            </div>
          )}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'خطط السداد' : 'Payment Plans'}</SectionTitle>
                {Array.isArray(p.installmentPlans) && p.installmentPlans.length > 0 ? (
                  <div className="rounded-xl overflow-x-auto border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className=" dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="text-start p-3 min-w-[50px] font-medium text-[var(--muted-text)]">ID</th>
                          <th className="text-start p-3 min-w-[100px] font-medium text-[var(--muted-text)]">{isRTL ? 'المقدم' : 'Down Payment'}</th>
                          <th className="text-start p-3 min-w-[130px] font-medium text-[var(--muted-text)]">{isRTL ? 'مبلغ الحجز' : 'Reservation Amount'}</th>
                          <th className="text-start p-3 min-w-[140px] font-medium text-[var(--muted-text)]">{isRTL ? 'دفعة الاستلام' : 'Receipt Amount'}</th>
                          <th className="text-start p-3 min-w-[140px] font-medium text-[var(--muted-text)]">{isRTL ? 'قيمة القسط' : 'Installment Amount'}</th>
                          <th className="text-start p-3 font-medium text-[var(--muted-text)]">{isRTL ? 'السنوات' : 'Years'}</th>
                          <th className="text-start p-3 min-w-[140px] font-medium text-[var(--muted-text)]">{isRTL ? 'دفعة إضافية' : 'Additional Payment'}</th>
                          <th className="text-start p-3 min-w-[140px] font-medium text-[var(--muted-text)]">{isRTL ? 'إجمالي المبلغ' : 'Total Amount'}</th>
                          <th className="text-start p-3 font-medium text-[var(--muted-text)]">{isRTL ? 'الاستلام' : 'Delivery Date'}</th>
                          <th className="text-start p-3 min-w-[140px] font-medium text-[var(--muted-text)]">{isRTL ? 'قيمة الجراج' : 'Garage Amount'}</th>
                          <th className="text-start p-3 min-w-[140px] font-medium text-[var(--muted-text)]">{isRTL ? 'قيمة الصيانة' : 'Maintenance Amount'}</th>
                          <th className="text-start p-3 min-w-[140px] font-medium text-[var(--muted-text)]">{isRTL ? 'صافي المبلغ' : 'Net Amount'}</th>
                          <th className="text-start p-3 min-w-[140px] font-medium text-[var(--muted-text)]">{isRTL ? 'إجراءات' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.installmentPlans.map((r, i) => (
                          <tr key={i} className="border-t border-gray-100 dark:border-gray-700 transition-all duration-300 hover:bg-white/40 dark:hover:bg-white/5 hover:backdrop-blur-sm hover:shadow-sm">
                            <td className="p-3 font-medium ">{i + 1}</td>
                            <td className="p-3">
                              <div className="font-semibold">
                                {r.downPaymentType === 'percentage'
                                  ? `${r.downPayment}%`
                                  : new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(Number(r.downPayment || 0))
                                }
                              </div>
                            </td>
                            <td className="p-3">
                              {new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(Number((r.reservationAmount ?? p.reservationAmount) || 0))}
                            </td>
                            <td className="p-3">
                              {new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(Number(r.receiptAmount || 0))}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold">{new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(Number(r.installmentAmount || 0))}</div>
                            </td>
                            <td className="p-3">{r.years}</td>
                            <td className="p-3">
                              {new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(Number(r.extraPayment || 0))}
                            </td>
                            <td className="p-3">
                              {new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(Number(p.netAmount || 0))}
                            </td>
                            <td className="p-3">{r.deliveryDate}</td>
                            <td className="p-3">
                              {new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(Number(p.garageAmount || 0))}
                            </td>
                            <td className="p-3">
                              {new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(Number(p.maintenanceAmount || 0))}
                            </td>
                            <td className="p-3">
                              {new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(Number(p.netAmount || 0))}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => openPlanPreview(r)} className="btn btn-xs bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm">{isRTL ? 'عرض' : 'View'}</button>
                                <button onClick={() => downloadPlanPdf(r, i, p)} className="btn btn-xs bg-green-600 hover:bg-green-700 text-white border-none shadow-sm">{isRTL ? 'تحميل' : 'Download'}</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--muted-text)] bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    {isRTL ? 'لا توجد خطط سداد متاحة' : 'No payment plans available'}
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'cil' && (
            <div className="space-y-4">
              <SectionTitle>{isRTL ? 'بيانات العميل' : 'CIL'}</SectionTitle>
              {p.cil ? (
                <div className="space-y-3">
                  <ReadOnlyField label={isRTL ? 'إلى' : 'To'} value={p.cil.to} />
                  <ReadOnlyField label={isRTL ? 'الموضوع' : 'Subject'} value={p.cil.subject} />
                  <div className="p-4 rounded-lg bg-transparent border border-gray-200 dark:border-gray-700 text-sm whitespace-pre-wrap">{p.cil.content || '-'}</div>
                  <ReadOnlyField label={isRTL ? 'التوقيع' : 'Signature'} value={p.cil.signature} />
                  {Array.isArray(p.cil.attachments) && p.cil.attachments.length > 0 ? (
                    <div className="space-y-2">
                      {p.cil.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-blue-600"><FaPaperclip /><span>{typeof att === 'string' ? att : (att.name || 'Attachment')}</span></div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--muted-text)]">{isRTL ? 'لا توجد مرفقات' : 'No attachments'}</div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--muted-text)]">{isRTL ? 'لا توجد بيانات' : 'No CIL data'}</div>
              )}
            </div>
          )}
          {activeTab === 'publish' && (
            <div className="space-y-4">
              <SectionTitle>{isRTL ? 'النشر والتوزيع' : 'Publish & Marketing'}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <ReadOnlyField label={isRTL ? 'الاسم' : 'Name'} value={p.contactName} />
                <ReadOnlyField label={isRTL ? 'البريد' : 'Email'} value={p.contactEmail} />
                <ReadOnlyField label={isRTL ? 'الهاتف' : 'Phone'} value={p.contactPhone} />
                <ReadOnlyField label={isRTL ? 'الحالة' : 'Status'} value={p.status} />
                <ReadOnlyField label={isRTL ? 'الحزمة التسويقية' : 'Marketing Package'} value={p.marketingPackage} />
              </div>
            </div>
          )}
        </div>
        {preview.index >= 0 && (
          <div className="absolute inset-0 z-[220] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={closePreview} />
            <div className="relative z-[230] max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3">
              {(() => {
                const item = Array.isArray(preview.list) ? preview.list[preview.index] : null
                if (!item?.src) return null
                return (
                  <img
                    src={item.src}
                    alt="preview"
                    className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl border border-gray-200 dark:border-gray-700"
                    onError={(e) => {
                      const imgEl = e.currentTarget
                      if (!item.fallback || item.fallback === imgEl.src) return
                      if (imgEl.dataset.fallbackTried === '1') return
                      imgEl.dataset.fallbackTried = '1'
                      imgEl.src = item.fallback
                    }}
                  />
                )
              })()}
              <div className="flex items-center gap-2">
                <button aria-label="Prev" className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 text-white border border-white/30 hover:bg-white/25" onClick={prevImg}>
                  <FaChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button aria-label="Next" className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 text-white border border-white/30 hover:bg-white/25" onClick={nextImg}>
                  <FaChevronRight className="w-3.5 h-3.5" />
                </button>
                <button className="px-3 py-1.5 text-xs rounded-full bg-blue-600 text-white hover:bg-blue-700" onClick={closePreview}>
                  {isRTL ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}
        {isPlanPreviewOpen && planPreview && (
          <div className="absolute inset-0 z-[220] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={closePlanPreview} />
            <div className="relative z-[230] w-[90vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-4 bg-[var(--content-bg)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{isRTL ? 'معاينة خطة الدفع' : 'Payment Plan Preview'}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => printPlan(planPreview)} className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none">{isRTL ? 'طباعة' : 'Print'}</button>
                  <button onClick={closePlanPreview} className="btn btn-sm bg-gray-500 hover:bg-gray-600 text-white border-none">{isRTL ? 'إغلاق' : 'Close'}</button>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100 dark:border-gray-700"><td className="p-3">{isRTL ? 'المقدم' : 'Down Payment'}</td><td className="p-3">{planPreview.downPayment} {String(planPreview.downPaymentType || 'amount') === 'percentage' ? '%' : ''}</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700"><td className="p-3">{isRTL ? 'مبلغ الحجز' : 'Reservation Amount'}</td><td className="p-3">{new Intl.NumberFormat('en-EG').format(Number(planPreview.reservationAmount || 0))}</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700"><td className="p-3">{isRTL ? 'دفعة الاستلام' : 'Receipt Amount'}</td><td className="p-3">{new Intl.NumberFormat('en-EG').format(Number(planPreview.receiptAmount || 0))}</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700"><td className="p-3">{isRTL ? 'قيمة القسط' : 'Installment Amount'}</td><td className="p-3">{new Intl.NumberFormat('en-EG').format(Number(planPreview.installmentAmount || 0))}</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700"><td className="p-3">{isRTL ? 'السنوات' : 'Years'}</td><td className="p-3">{planPreview.years || '-'}</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700"><td className="p-3">{isRTL ? 'دفعة إضافية' : 'Additional Payment'}</td><td className="p-3">{new Intl.NumberFormat('en-EG').format(Number(planPreview.extraPayment || 0))}</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700"><td className="p-3">{isRTL ? 'إجمالي المبلغ' : 'Total Amount'}</td><td className="p-3">{new Intl.NumberFormat('en-EG').format(Number(planPreview.totalAmount || 0))}</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700"><td className="p-3">{isRTL ? 'الاستلام' : 'Delivery Date'}</td><td className="p-3">{planPreview.deliveryDate || '-'}</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700"><td className="p-3">{isRTL ? 'قيمة الجراج' : 'Garage Amount'}</td><td className="p-3">{new Intl.NumberFormat('en-EG').format(Number(planPreview.garageAmount || 0))}</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700"><td className="p-3">{isRTL ? 'قيمة الصيانة' : 'Maintenance Amount'}</td><td className="p-3">{new Intl.NumberFormat('en-EG').format(Number(planPreview.maintenanceAmount || 0))}</td></tr>
                    <tr><td className="p-3">{isRTL ? 'صافي المبلغ' : 'Net Amount'}</td><td className="p-3">{new Intl.NumberFormat('en-EG').format(Number(planPreview.netAmount || 0))}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
