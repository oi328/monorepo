import React, { useState, useEffect, useRef } from 'react'
import { useMapEvents, MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { FaHome, FaList, FaImages, FaMapMarkedAlt,
  FaFileContract, FaAddressCard, FaExternalLinkAlt, FaTimes,
  FaInfoCircle, FaCloudUploadAlt, FaCloudDownloadAlt, FaBuilding, FaHeading, FaAlignLeft,
  FaLink, FaTag, FaPercentage, FaPhone, FaEnvelope, FaCheck, FaPlus, FaUser, FaBullhorn, FaGlobe, FaTrash
} from 'react-icons/fa'
import SearchableSelect from './SearchableSelect'
import DynamicFieldRenderer from './DynamicFieldRenderer'
import { PROJECT_PLANS } from '../data/projectPlans'
import { useAppState } from '../shared/context/AppStateProvider'

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map Component to handle clicks
const MapPicker = ({ location, setLocation, setLocationUrl }) => {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setLocation(e.latlng)
      map.flyTo(e.latlng, map.getZoom())
      // Generate Google Maps URL
      const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
      setLocationUrl(googleMapsUrl)
    },
  })

  // Ensure location is valid before rendering Marker
  const isValid = location && (
    (typeof location === 'object' && 'lat' in location && 'lng' in location) || 
    (Array.isArray(location) && location.length === 2)
  )

  return !isValid ? null : (
    <Marker position={location}></Marker>
  )
}


// --- Constants & Options ---
const STEPS = [
  { id: 1, label: ' Details', labelAr: 'التفاصيل ', icon: FaHome },
  { id: 2, label: 'Features', labelAr: 'مواصفات العقار', icon: FaList },
  { id: 3, label: 'Media', labelAr: 'الوسائط', icon: FaImages },
  { id: 4, label: 'Location', labelAr: 'الموقع', icon: FaMapMarkedAlt },
  { id: 5, label: 'Financial', labelAr: 'المالية', icon: FaFileContract },
  { id: 6, label: 'CIL', labelAr: 'بيانات العميل', icon: FaAddressCard },
  { id: 7, label: 'Publish & Marketing', labelAr: 'النشر والتوزيع', icon: FaExternalLinkAlt },
]

const PROPERTY_TYPES = ['Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Stand Alone', 'Duplex', 'Store', 'Shop', 'Office', 'Retail', 'Warehouse', 'Land']
const FINISHING_TYPES = ['Core & Shell', 'Semi Finished', 'Finished', 'Furnished']
const VIEW_TYPES = ['Front', 'Back', 'Main Street', 'Garden', 'Pool']
const PROJECTS = [] // Removed static list
const PURPOSES = ['Primary', 'Resale', 'Rent']
const BEDROOMS = ['Studio', '1', '2', '3', '4', '5', '6', '7+']
const BATHROOMS = ['1', '2', '3', '4', '5', '6+']
const FLOORS = ['Ground', ...Array.from({length: 11}, (_, i) => String(i + 1))]
const AMENITIES_INDOOR = ['Built-in Wardrobes', 'Central A/C', "Maid's Room", 'Kitchen Appliances', 'Balcony', 'Private Garden', 'Private Pool', 'Walk-in Closet']
const AMENITIES_BUILDING = ['Shared Pool', 'Shared Gym', 'Security', 'Covered Parking', 'Concierge', 'Pets Allowed', "Children's Play Area", 'Barbecue Area']
const PAYMENT_TERMS = ['Cash', 'Bank Finance', 'Installments', 'Cheques']
const PROPERTY_CATEGORIES = ['Residential', 'Commercial', 'Administrative', 'Medical', 'Coastal', 'Mixed Use']
// --- Helper Components ---

const Tooltip = ({ text }) => (
  <div className="group relative inline-block ml-2 cursor-help">
    <FaInfoCircle className="text-gray-400 hover:text-blue-500 transition-colors" size={14} />
    <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
    </div>
  </div>
)

const FileUploader = ({ label, subLabel, files, onDrop, accept = "*", multiple = true, maxFileSizeMb = 10, isRTL = false }) => (
  <div className="border-2 border-dashed border-black dark:border-gray-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative">
    <input
      type="file"
      multiple={multiple}
      accept={accept}
      onChange={(e) => {
        const list = Array.from(e.target.files || [])
        const maxBytes = Math.max(1, Number(maxFileSizeMb || 10)) * 1024 * 1024
        const ok = list.filter(f => f && typeof f.size === 'number' ? f.size <= maxBytes : true)
        const rejected = list.filter(f => f && typeof f.size === 'number' ? f.size > maxBytes : false)
        if (rejected.length) {
          const msg = (rejected.length === 1)
            ? (isRTL ? `الملف كبير جدًا (أقصى ${maxFileSizeMb}MB): ${rejected[0].name}` : `File too large (max ${maxFileSizeMb}MB): ${rejected[0].name}`)
            : (isRTL ? `تم تجاهل ${rejected.length} ملفات لأن حجمها أكبر من ${maxFileSizeMb}MB` : `Ignored ${rejected.length} files larger than ${maxFileSizeMb}MB`)
          try {
            const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: msg } })
            window.dispatchEvent(evt)
          } catch {}
        }
        onDrop(ok)
      }}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    />
    <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
        <FaCloudUploadAlt size={24} />
      </div>
      <h4 className="font-medium text-sm">{label}</h4>
      <p className="text-xs text-[var(--muted-text)]">{subLabel}</p>
    </div>
    {files && files.length > 0 && (
      <div className="mt-4 flex flex-wrap gap-2 justify-center pointer-events-none">
        {files.map((f, i) => (
          <div key={i} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded truncate max-w-[150px]">
            {typeof f === 'string' ? (f.split('/').pop() || f) : (f?.name || 'file')}
          </div>
        ))}
      </div>
    )}
  </div>
)

const ButtonGroup = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${value === opt
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-gray-100 dark:bg-gray-700 text-[var(--muted-text)] hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
      >
        {opt}
      </button>
    ))}
  </div>
)

// --- Main Wizard Component ---

export default function CreatePropertyModal({ onClose, isRTL, onSave, isEdit, buildings = [], projects = [], owners = [], initialData = null }) {
  const { crmSettings } = useAppState()
  const [currentStep, setCurrentStep] = useState(1)
  const [inputLanguage, setInputLanguage] = useState('en')
  const [showEnglish, setShowEnglish] = useState(false)
  const [priceEdited, setPriceEdited] = useState(!!isEdit)
  const [formData, setFormData] = useState({
    // Step 1
    project: '',
    category: '',
    propertyType: 'Apartment',
    unitNumber: '',
    unitCode: '',
    building: '',
    bua: '',
    hasExternalArea: false,
    internalArea: '',
    externalArea: '',
    totalArea: '',
    internalMeterPrice: '',
    externalMeterPrice: '',
    meterPrice: '',
    totalPrice: '',
    bedrooms: '',
    bathrooms: '',
    floor: '',
    finishing: '',
    view: '',
    purpose: 'For Sale',
    status: 'Available',
    elevator: false,
    ownerName: '',
    ownerMobile: '',
    rentCost: '',

    // Legacy / Shared
    adTitle: '',
    adTitleAr: '',
    area: '', // Keeping for compatibility or fallback
    areaUnit: 'm²',
    // Step 2
    amenities: [],
    description: '',
    descriptionAr: '',
    // Step 3
    mainImage: null,
    images: [],
    videoUrl: '',
    virtualTourUrl: '',
    floorPlans: [],
    documents: [],
    // Step 4
    address: '',
    addressAr: '',
    city: '',
    locationUrl: '',
    location: null, // Would be coords
    nearby: [],
    // Step 5
    price: '',
    currency: 'EGP',
    discount: '',
    discountType: 'amount',
    reservationAmount: '',
    garageAmount: '',
    maintenanceAmount: '',
    netAmount: '',
    totalAfterDiscount: '',
    installmentPlans: [],
    serviceCharges: '',
    maintenanceDeposit: '',
    receipt: '',
    // Step 6 (CIL)
    cilTo: '',
    cilToAr: '',
    cilSubject: '',
    cilSubjectAr: '',
    cilContent: '',
    cilContentAr: '',
    cilSignature: '',
    cilSignatureAr: '',
    cilAttachments: [],
    // Step 7
    contactName: 'Current User',
    contactEmail: 'user@example.com',
    contactPhone: '+20 123 456 7890',
    publishStatus: 'Draft',
    marketingPackage: 'standard',
    custom_fields: {}
  })

  const [errors, setErrors] = useState({})
  const [channels, setChannels] = useState([
    {
      id: 'company-site',
      name: 'Company Website',
      type: 'website',
      active: true,
      selectedPackage: null,
      packages: [],
      status: 'Live',
      lastSyncAt: 'Just now',
    },
    {
      id: 'property-finder',
      name: 'Property Finder',
      type: 'portal',
      active: false,
      selectedPackage: 'standard',
      packages: [
        { id: 'standard', name: 'Standard Listing', remaining: 80 },
        { id: 'featured', name: 'Featured Listing', remaining: 3 },
        { id: 'premium', name: 'Premium Listing', remaining: 1 },
      ],
      status: 'Not Published',
      lastSyncAt: '—',
    },
    {
      id: 'bayut',
      name: 'Bayut',
      type: 'portal',
      active: false,
      selectedPackage: 'standard',
      packages: [
        { id: 'standard', name: 'Standard Listing', remaining: 40 },
        { id: 'featured', name: 'Featured Listing', remaining: 5 },
      ],
      status: 'Not Published',
      lastSyncAt: '—',
    },
    {
      id: 'zillow',
      name: 'Zillow',
      type: 'portal',
      active: false,
      selectedPackage: 'standard',
      packages: [
        { id: 'standard', name: 'Standard Listing', remaining: 120 },
        { id: 'premium', name: 'Premium Listing', remaining: 2 },
      ],
      status: 'Not Published',
      lastSyncAt: '—',
    },
  ])
  const [actionMessage, setActionMessage] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')

  const projectOptions = React.useMemo(() => projects.map(p => (isRTL ? p.name_ar : p.name) || p.name || p.title || p.name_en), [projects, isRTL])
  const resolveSelectedProject = (label) => {
    const projectLabel = String(label || '').trim()
    return (
      projects.find(p => String(p?.name || '').trim() === projectLabel) ||
      projects.find(p => String(p?.name_ar || '').trim() === projectLabel) ||
      projects.find(p => String(p?.title || '').trim() === projectLabel) ||
      null
    )
  }

  const buildingOptions = React.useMemo(() => {
    if (!formData.project) return buildings.map(b => b.name)
    return buildings.filter(b => b.project === formData.project).map(b => b.name)
  }, [buildings, formData.project])

  const categoryOptions = React.useMemo(() => {
    return PROPERTY_CATEGORIES
  }, [])

  const ownerOptions = React.useMemo(() => owners.map(o => o.name), [owners])

  // Dynamic fields state
  const [dynamicValues, setDynamicValues] = useState({})

  useEffect(() => {
    document.body.classList.add('app-modal-open')
    return () => document.body.classList.remove('app-modal-open')
  }, [])

  useEffect(() => {
    if (initialData) {
      const normalized = { ...initialData }
      Object.keys(normalized).forEach(key => {
        // Skip location to keep it as null/object
        if (normalized[key] === null && key !== 'location') normalized[key] = ''
      })
      const ensureArray = (v) => (Array.isArray(v) ? v : (v ? [v] : []))
      normalized.amenities = ensureArray(normalized.amenities)
      normalized.images = ensureArray(normalized.images)
      normalized.floorPlans = ensureArray(normalized.floorPlans)
      normalized.documents = ensureArray(normalized.documents)
      normalized.nearby = ensureArray(normalized.nearby)
      normalized.installmentPlans = ensureArray(normalized.installmentPlans)
      normalized.cilAttachments = ensureArray(normalized.cilAttachments)
      setFormData(prev => ({ ...prev, ...normalized, custom_fields: initialData.custom_fields || {} }))
      setDynamicValues(initialData.custom_fields || {})
      setPriceEdited(true)
    }
  }, [initialData])

  const handleDynamicChange = (key, value) => {
    setDynamicValues(prev => ({ ...prev, [key]: value }))
  }

  // Auto-calculate Total Price and Total Area
  useEffect(() => {
    if (formData.hasExternalArea) {
      const internal = parseFloat(formData.internalArea) || 0
      const external = parseFloat(formData.externalArea) || 0
      const internalPrice = parseFloat(formData.internalMeterPrice) || 0
      const externalPrice = parseFloat(formData.externalMeterPrice) || 0

      const total = (internal * internalPrice) + (external * externalPrice)
      const totalAreaCalc = internal + external

      setFormData(prev => ({
        ...prev,
        totalPrice: total > 0 ? total.toString() : '',
        totalArea: totalAreaCalc > 0 ? totalAreaCalc.toString() : ''
      }))
    } else {
      const area = parseFloat(formData.bua) || 0
      const price = parseFloat(formData.meterPrice) || 0

      const total = area * price
      const totalAreaCalc = area

      setFormData(prev => ({
        ...prev,
        totalPrice: total > 0 ? total.toString() : '',
        totalArea: totalAreaCalc > 0 ? totalAreaCalc.toString() : ''
      }))
    }
  }, [
    formData.hasExternalArea,
    formData.internalArea,
    formData.externalArea,
    formData.internalMeterPrice,
    formData.externalMeterPrice,
    formData.bua,
    formData.meterPrice
  ])

  // Sync Price with Total Price from Step 1
  useEffect(() => {
    if (formData.totalPrice && !priceEdited) {
      setFormData(prev => ({ ...prev, price: prev.totalPrice }))
    }
  }, [formData.totalPrice, priceEdited])

  // Auto-calculate Net Amount
  useEffect(() => {
    const price = parseFloat(formData.price) || 0
    const rawDiscount = parseFloat(formData.discount) || 0
    const garage = parseFloat(formData.garageAmount) || 0
    const maintenance = parseFloat(formData.maintenanceAmount) || 0
    const discount = formData.discountType === 'percentage' ? (price * rawDiscount / 100) : rawDiscount

    const afterDiscount = price - discount
    const net = afterDiscount + garage + maintenance
    setFormData(prev => ({
      ...prev,
      totalAfterDiscount: afterDiscount > 0 ? afterDiscount.toString() : '',
      netAmount: net > 0 ? net.toString() : ''
    }))
  }, [formData.price, formData.discount, formData.discountType, formData.garageAmount, formData.maintenanceAmount])

  useEffect(() => {
    if (isRTL) {
      setInputLanguage('ar')
      setShowEnglish(false)
    } else {
      setInputLanguage('en')
    }
  }, [isRTL])

  // Scroll to top on step change
  useEffect(() => {
    const content = document.getElementById('wizard-content')
    if (content) content.scrollTop = 0
  }, [currentStep])

  // Validation Logic
  const validateStep = (step) => {
    const newErrors = {}
    let isValid = true

    if (step === 1) {
      if (!formData.project) newErrors.project = 'Project is required'
      if (!formData.category) newErrors.category = 'Category is required'
      if (!formData.propertyType) newErrors.propertyType = 'Property Type is required'
      if (!formData.unitNumber) newErrors.unitNumber = 'Unit Number is required'
      if (!formData.totalArea || formData.totalArea === '0') newErrors.totalArea = 'Total Area is required'
      if (!formData.totalPrice || formData.totalPrice === '0') newErrors.totalPrice = 'Total Price is required'
    }
    if (step === 5) {
      if (formData.installmentPlans.length > 0 && !formData.price) newErrors.price = 'Price is required'
    }
    // CIL validation removed per request


    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateAll = () => {
    const step1Valid = validateStep(1)
    const step5Valid = validateStep(5)
    return step1Valid && step5Valid
  }


  const handleFinish = () => {
    if (validateAll()) {
      const dataToSave = {
        ...formData,
        marketingChannels: channels,
        custom_fields: dynamicValues
      }
      onSave && onSave(dataToSave)
      try {
        const msg = inputLanguage === 'ar' ? 'تم حفظ بيانات العقار' : 'Property data saved'
        const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: msg } })
        window.dispatchEvent(evt)
      } catch (_) { }
      onClose()
    } else {
      // Find first invalid step and jump to it
      if (!validateStep(1)) setCurrentStep(1)
      else if (!validateStep(5)) setCurrentStep(5)
    }
  }

  // --- Payment Plan Helpers ---
  const addInstallmentPlan = () => {
    setFormData(prev => ({
      ...prev,
      installmentPlans: [...prev.installmentPlans, {
        downPayment: '',
        downPaymentType: 'amount',
        downPaymentSource: 'custom',
        reservationType: 'amount',
        installmentAmount: '',
        installmentFrequency: 'Monthly',
        years: '',
        deliveryDate: '',
        receiptAmount: '',
        extraPayment: '',
        extraPaymentFrequency: 'Monthly',
        extraPaymentCount: '0'
      }]
    }))
  }

  const removeInstallmentPlan = (index) => {
    setFormData(prev => ({
      ...prev,
      installmentPlans: prev.installmentPlans.filter((_, i) => i !== index)
    }))
  }

  const updateInstallmentPlan = (index, field, value) => {
    const newPlans = [...formData.installmentPlans]
    const prevPlan = newPlans[index]
    if (field === 'downPaymentType') {
      const net = parseFloat(formData.totalAfterDiscount) || 0
      const oldType = prevPlan.downPaymentType || 'amount'
      const dpVal = parseFloat(prevPlan.downPayment) || 0
      if (prevPlan.downPaymentSource === 'custom' && net > 0 && dpVal > 0) {
        if (value === 'percentage' && oldType === 'amount') {
          newPlans[index].downPayment = ((dpVal / net) * 100).toFixed(2)
        } else if (value === 'amount' && oldType === 'percentage') {
          newPlans[index].downPayment = ((dpVal / 100) * net).toFixed(2)
        }
      }
    }
    if (field === 'downPayment') {
      newPlans[index].downPaymentSource = 'custom'
    }
    if (field === 'installmentAmount') {
      newPlans[index].installmentAmountAuto = false
    }
    if (field === 'years' || field === 'installmentFrequency') {
      if (newPlans[index].installmentAmountAuto !== false) newPlans[index].installmentAmountAuto = true
    }
    newPlans[index][field] = value
    setFormData(prev => ({ ...prev, installmentPlans: newPlans }))
  }

  const handleDiscountTypeChange = (newType) => {
    const price = parseFloat(formData.price) || 0
    const oldType = formData.discountType || 'amount'
    const val = parseFloat(formData.discount) || 0
    let nextVal = formData.discount
    if (price > 0 && val > 0) {
      if (newType === 'percentage' && oldType === 'amount') {
        nextVal = ((val / price) * 100).toFixed(2)
      } else if (newType === 'amount' && oldType === 'percentage') {
        nextVal = ((val / 100) * price).toFixed(2)
      }
    }
    setFormData(prev => ({ ...prev, discountType: newType, discount: String(nextVal) }))
  }

  const handleReservationTypeChange = (index, newType) => {
    const net = parseFloat(formData.totalAfterDiscount) || 0
    const plan = formData.installmentPlans[index] || {}
    const oldType = plan.reservationType || 'amount'
    const val = parseFloat(formData.reservationAmount) || 0
    let nextVal = formData.reservationAmount
    if (net > 0 && val > 0) {
      if (newType === 'percentage' && oldType === 'amount') {
        nextVal = ((val / net) * 100).toFixed(2)
      } else if (newType === 'amount' && oldType === 'percentage') {
        nextVal = ((val / 100) * net).toFixed(2)
      }
    }
    const newPlans = [...formData.installmentPlans]
    if (newPlans[index]) newPlans[index].reservationType = newType
    setFormData(prev => ({ ...prev, reservationAmount: String(nextVal), installmentPlans: newPlans }))
  }

  const stepperRef = useRef(null)
  const stepRefs = useRef([])
  const [progressWidth, setProgressWidth] = useState(0)
  useEffect(() => {
    const container = stepperRef.current
    const idx = Math.max(0, (currentStep - 1))
    const node = stepRefs.current[idx]
    if (!container || !node) return
    const cRect = container.getBoundingClientRect()
    const nRect = node.getBoundingClientRect()
    const center = nRect.left + nRect.width / 2
    const leftWidth = Math.max(0, Math.min(cRect.width, center - cRect.left))
    const rightWidth = Math.max(0, Math.min(cRect.width, cRect.right - center))
    setProgressWidth(inputLanguage === 'ar' ? rightWidth : leftWidth)
  }, [currentStep, inputLanguage])

  const formatWithCommas = (v) => {
    const s = String(v ?? '')
    if (!s) return ''
    const raw = s.replace(/,/g, '')
    if (!raw) return ''
    const parts = raw.split('.')
    let int = parts[0]
    const dec = parts[1] ?? ''
    int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return dec ? `${int}.${dec}` : int
  }
  const unformatNumber = (v) => String(v ?? '').replace(/,/g, '')

  const availablePlans = React.useMemo(() => {
    const projectLabel = String(formData.project || '').trim()
    const selectedProject =
      projects.find(p => String(p?.name || '').trim() === projectLabel) ||
      projects.find(p => String(p?.name_ar || '').trim() === projectLabel) ||
      projects.find(p => String(p?.title || '').trim() === projectLabel) ||
      null

    const paymentPlan = selectedProject?.payment_plan || selectedProject?.paymentPlan || selectedProject?.paymentPlans
    if (Array.isArray(paymentPlan) && paymentPlan.length > 0) {
      return paymentPlan.map((pl, idx) => {
        const down = pl?.downPayment ?? pl?.down_payment ?? pl?.downPct ?? pl?.down_pct ?? ''
        const years = pl?.years ?? pl?.y ?? ''
        const delivery = pl?.deliveryDate ?? pl?.delivery_date ?? ''
        const type = pl?.type ? String(pl.type) : ''
        const name = pl?.name
          ? String(pl.name)
          : [down ? `${down}%` : '', years ? `${years}` : '', delivery ? `${delivery}` : '', type].filter(Boolean).join(' / ') || `Plan ${idx + 1}`
        return { ...pl, id: pl?.id ?? String(idx), name }
      })
    }

    const key = formData.project || 'default'
    const list = PROJECT_PLANS[key] || PROJECT_PLANS['default'] || []
    return Array.isArray(list) ? list : []
  }, [formData.project, projects])

  const applyPlanTemplate = (plan) => {
    if (!plan) return
    const net = parseFloat(formData.totalAfterDiscount) || 0

    const downPctRaw =
      plan?.downPayment ??
      plan?.down_payment ??
      plan?.downPct ??
      plan?.down_pct ??
      ''
    const yearsRaw = plan?.years ?? plan?.y ?? ''
    const deliveryRaw = plan?.deliveryDate ?? plan?.delivery_date ?? ''
    const downPct = Number(downPctRaw) || 0

    let years = Number(yearsRaw) || 0
    if (!years) {
      const freq = String(plan.frequency || 'monthly').toLowerCase()
      const inst = Number(plan.installments || 0)
      years = freq.includes('quarter') ? inst / 4 : freq.includes('semi') ? inst / 2 : inst / 12
    }

    const nowYear = new Date().getFullYear()
    const delivery = deliveryRaw ? String(deliveryRaw) : (years ? String(Math.ceil(nowYear + years)) : '')
    const dpAmount = net > 0 && downPct > 0 ? (net * downPct / 100) : 0
    const installmentsCount = years > 0 ? Math.max(0, Math.round(years * 12)) : 0
    const installmentAmount = (installmentsCount > 0 && net > 0)
      ? Math.round(((net - dpAmount) / installmentsCount) * 100) / 100
      : 0

    setFormData(prev => ({
      ...prev,
      installmentPlans: [
        {
          downPayment: downPct ? String(downPct) : '',
          downPaymentType: 'percentage',
          downPaymentSource: 'custom',
          reservationType: 'amount',
          installmentAmount: installmentAmount ? String(installmentAmount) : '',
          installmentAmountAuto: true,
          installmentFrequency: 'Monthly',
          years: String(years || ''),
          deliveryDate: delivery,
          receiptAmount: '',
          extraPayment: '',
          extraPaymentFrequency: 'Monthly',
          extraPaymentCount: '0'
        }
      ]
    }))
  }

  const importProjectPlan = () => {
    const plan = availablePlans[0]
    applyPlanTemplate(plan)
  }

  useEffect(() => {
    if (isEdit) return
    if (!formData.project) return
    if (!Array.isArray(availablePlans) || availablePlans.length === 0) return
    if (formData.installmentPlans.length > 0) return
    const first = availablePlans[0]
    setSelectedPlanId(first?.id ?? '')
    applyPlanTemplate(first)
  }, [isEdit, formData.project, availablePlans])

  useEffect(() => {
    const net = parseFloat(formData.totalAfterDiscount) || 0
    if (!net || !Array.isArray(formData.installmentPlans) || formData.installmentPlans.length === 0) return
    let changed = false
    const nextPlans = formData.installmentPlans.map((plan) => {
      if (plan.installmentAmountAuto !== true) return plan
      const years = parseFloat(plan.years) || 0
      const perYearInst = String(plan.installmentFrequency) === 'Quarterly' ? 4
        : String(plan.installmentFrequency) === 'Semi-Annual' ? 2
          : String(plan.installmentFrequency) === 'Annual' ? 1
            : 12
      const installmentsCount = years > 0 ? Math.max(0, Math.round(years * perYearInst)) : 0
      const rawDP = parseFloat(plan.downPayment) || 0
      const dp = plan.downPaymentType === 'percentage' ? (net * rawDP / 100) : rawDP
      const receipt = plan.receiptAmountType === 'percentage'
        ? (net * (parseFloat(plan.receiptAmount) || 0) / 100)
        : (parseFloat(plan.receiptAmount) || 0)
      const base = net - dp - receipt
      const instAmt = (installmentsCount > 0 && base > 0) ? Math.round((base / installmentsCount) * 100) / 100 : 0
      const next = { ...plan, installmentAmount: instAmt ? String(instAmt) : '' }
      if (next.installmentAmount !== plan.installmentAmount) changed = true
      return next
    })
    if (changed) setFormData(prev => ({ ...prev, installmentPlans: nextPlans }))
  }, [formData.totalAfterDiscount, formData.installmentPlans])

  useEffect(() => {
    const net = parseFloat(formData.totalAfterDiscount) || 0
    let changed = false
    const newPlans = formData.installmentPlans.map((plan) => {
      const years = parseFloat(plan.years) || 0
      const perYearInst = String(plan.installmentFrequency) === 'Quarterly' ? 4
        : String(plan.installmentFrequency) === 'Semi-Annual' ? 2
          : String(plan.installmentFrequency) === 'Annual' ? 1
            : 12
      const installmentsCount = Math.max(0, Math.round(years * perYearInst))
      const instAmt = parseFloat(plan.installmentAmount) || 0
      const receipt = parseFloat(plan.receiptAmount) || 0
      const rawRes = parseFloat(formData.reservationAmount) || 0
      const resDp = plan.reservationType === 'percentage' ? (net * rawRes / 100) : rawRes
      const rawDP = parseFloat(plan.downPayment) || 0
      const customDp = plan.downPaymentType === 'percentage' ? (net * rawDP / 100) : rawDP
      const dp = (plan.downPaymentSource === 'custom') ? customDp : resDp
      const base = net - dp - receipt
      const paidByInstallments = instAmt * installmentsCount
      const leftover = base - paidByInstallments
      const freq = String(plan.extraPaymentFrequency || 'Monthly')
      const perYear = freq === 'Monthly' ? 12 : freq === 'Quarterly' ? 4 : freq === 'Semi-Annual' ? 2 : freq === 'Annual' ? 1 : 12
      const count = years > 0 ? Math.max(0, Math.round(years * perYear)) : 0
      const extraAmt = (count > 0 && leftover > 0) ? Math.round((leftover / count) * 100) / 100 : 0
      const next = {
        ...plan,
        extraPayment: extraAmt ? String(extraAmt) : '',
        extraPaymentCount: count ? String(count) : '0'
      }
      if (
        next.extraPayment !== plan.extraPayment ||
        next.extraPaymentCount !== plan.extraPaymentCount
      ) changed = true
      return next
    })
    if (changed) setFormData(prev => ({ ...prev, installmentPlans: newPlans }))
  }, [formData.totalAfterDiscount, formData.reservationAmount, formData.installmentPlans])
  // --- Step Renderers ---

  const renderStep1 = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Project & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project */}
        <div className="space-y-2">
          <label className="label">
            {inputLanguage === 'ar' ? 'المشروع' : 'Project'}
            <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={projectOptions}
            value={formData.project}
            onChange={v => {
              setSelectedPlanId('')
              if (!isEdit && v !== formData.project) {
                const selectedProject = resolveSelectedProject(v)
                setFormData(prev => ({ ...prev, project: v, city: selectedProject?.city || prev.city, installmentPlans: [] }))
              } else {
                const selectedProject = resolveSelectedProject(v)
                setFormData(prev => ({ ...prev, project: v, city: selectedProject?.city || prev.city }))
              }
            }}
            isRTL={inputLanguage === 'ar'}
            placeholder={inputLanguage === 'ar' ? 'اختر المشروع' : 'Select Project'}
          />
          {errors.project && <p className="text-red-500 text-xs">{errors.project}</p>}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="label">
            {inputLanguage === 'ar' ? 'الفئة' : 'Category'}
            <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={categoryOptions}
            value={formData.category}
            onChange={v => setFormData({ ...formData, category: v })}
            isRTL={inputLanguage === 'ar'}
            placeholder={inputLanguage === 'ar' ? 'اختر الفئة' : 'Select Category'}
            disabled={!formData.project}
          />
          {errors.category && <p className="text-red-500 text-xs">{errors.category}</p>}
        </div>
      </div>

      {/* Property Type */}
      <div className="space-y-2">
        <label className="label">
          {inputLanguage === 'ar' ? 'نوع العقار' : 'Property Type'}
          <span className="text-red-500">*</span>
        </label>
        <SearchableSelect
          options={PROPERTY_TYPES}
          value={formData.propertyType}
          onChange={v => setFormData({ ...formData, propertyType: v })}
          isRTL={inputLanguage === 'ar'}
        />
        {errors.propertyType && <p className="text-red-500 text-xs">{errors.propertyType}</p>}
      </div>

      {/* Unit Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="label">
            {inputLanguage === 'ar' ? 'رقم الوحدة' : 'Unit Number'}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
            value={formData.unitNumber}
            onChange={e => setFormData({ ...formData, unitNumber: e.target.value })}
          />
          {errors.unitNumber && <p className="text-red-500 text-xs">{errors.unitNumber}</p>}
        </div>
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'كود الوحدة' : 'Unit Code'}</label>
          <input
            type="text"
            readOnly
            placeholder="AUTO"
            className="input bg-gray-100 dark:bg-gray-700 w-full border border-black dark:border-gray-700 font-mono text-blue-500"
            value={formData.unitCode}
            onChange={e => setFormData({ ...formData, unitCode: e.target.value })}
          />
          <p className="text-[10px] text-gray-400 mt-1">{inputLanguage === 'ar' ? 'سيتم الإنشاء تلقائياً عند الحفظ' : 'Generated automatically on save'}</p>
        </div>
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <FaBuilding className="text-gray-400" />
            {inputLanguage === 'ar' ? 'المبنى' : 'Building'}
          </label>
          <input
            type="text"
            className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
            value={formData.building}
            onChange={e => setFormData({ ...formData, building: e.target.value })}
            placeholder={inputLanguage === 'ar' ? 'اسم/رقم المبنى' : 'Building Name/No'}
          />
        </div>
      </div>

      {/* Areas */}
      <div className="space-y-4 border p-4 rounded-lg  dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{inputLanguage === 'ar' ? 'المساحات' : 'Areas'}</h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={formData.hasExternalArea}
              onChange={e => setFormData({ ...formData, hasExternalArea: e.target.checked })}
              className="rounded text-blue-600"
            />
            {inputLanguage === 'ar' ? 'يوجد مساحة خارجية/حديقة؟' : 'Has External Area/Garden?'}
          </label>
        </div>

        <div className="space-y-2">
          <label className="label">
            {inputLanguage === 'ar' ? 'مساحة المباني (BUA)' : 'BUA Area'}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              value={formData.bua}
              onChange={e => setFormData({ ...formData, bua: e.target.value })}
            />
            <span className="self-center  dark:bg-gray-700 px-3 py-2 rounded">m²</span>
          </div>
        </div>

        {formData.hasExternalArea && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-2">
              <label className="label">{inputLanguage === 'ar' ? 'المساحة الداخلية' : 'Internal Area'}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
                  value={formData.internalArea}
                  onChange={e => setFormData({ ...formData, internalArea: e.target.value })}
                />
                <span className="self-center  dark:bg-gray-700 px-3 py-2 rounded">m²</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="label">{inputLanguage === 'ar' ? 'المساحة الخارجية' : 'External Area'}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
                  value={formData.externalArea}
                  onChange={e => setFormData({ ...formData, externalArea: e.target.value })}
                />
                <span className="self-center  dark:bg-gray-700 px-3 py-2 rounded">m²</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t mt-2">
          <label className="label">
            {inputLanguage === 'ar' ? 'المساحة الكلية' : 'Total Area'}
            <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              className="input bg-gray-100 dark:bg-gray-700 w-full border border-black dark:border-gray-600 font-bold"
              value={formData.totalArea}
            />
            <span className="self-center  dark:bg-gray-700 px-3 py-2 rounded">m²</span>
          </div>
          {errors.totalArea && <p className="text-red-500 text-xs">{errors.totalArea}</p>}
          <p className="text-xs text-gray-500">{inputLanguage === 'ar' ? 'يتم حسابه تلقائياً' : 'Calculated automatically'}</p>
        </div>
      </div>

      {/* Prices */}
      <div className="space-y-4 border p-4 rounded-lg  dark:bg-gray-800/50">
        <h3 className="font-medium">{inputLanguage === 'ar' ? 'الأسعار' : 'Prices'}</h3>

        {formData.hasExternalArea ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-2">
              <label className="label">{inputLanguage === 'ar' ? 'سعر المتر الداخلي' : 'Internal Meter Price'}</label>
              <input
                type="number"
                className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
                value={formData.internalMeterPrice}
                onChange={e => setFormData({ ...formData, internalMeterPrice: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="label">{inputLanguage === 'ar' ? 'سعر المتر الخارجي' : 'External Meter Price'}</label>
              <input
                type="number"
                className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
                value={formData.externalMeterPrice}
                onChange={e => setFormData({ ...formData, externalMeterPrice: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="label">{inputLanguage === 'ar' ? 'سعر المتر' : 'Meter Price'}</label>
            <input
              type="number"
              className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              value={formData.meterPrice}
              onChange={e => setFormData({ ...formData, meterPrice: e.target.value })}
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="label">
            {inputLanguage === 'ar' ? 'السعر الإجمالي' : 'Total Price'}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            readOnly
            className="input bg-gray-100 dark:bg-gray-700 w-full border border-black dark:border-gray-600 font-bold"
            value={formData.totalPrice}
          />
          {errors.totalPrice && <p className="text-red-500 text-xs">{errors.totalPrice}</p>}
          <p className="text-xs text-gray-500">{inputLanguage === 'ar' ? 'يتم حسابه تلقائياً' : 'Calculated automatically'}</p>
        </div>
      </div>

      {/* Specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'غرف النوم' : 'Bedrooms'}</label>
          <select
            value={formData.bedrooms}
            onChange={e => setFormData({ ...formData, bedrooms: e.target.value })}
            className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
          >
            <option value="">{inputLanguage === 'ar' ? 'اختر' : 'Select'}</option>
            {BEDROOMS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'الحمامات' : 'Bathrooms'}</label>
          <select
            value={formData.bathrooms}
            onChange={e => setFormData({ ...formData, bathrooms: e.target.value })}
            className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
          >
            <option value="">{inputLanguage === 'ar' ? 'اختر' : 'Select'}</option>
            {BATHROOMS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'الدور' : 'Floor'}</label>
          <select
            value={formData.floor}
            onChange={e => setFormData({ ...formData, floor: e.target.value })}
            className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
          >
            <option value="">{inputLanguage === 'ar' ? 'اختر' : 'Select'}</option>
            {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Finishing & View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'التشطيب' : 'Finishing'}</label>
          <SearchableSelect
            options={FINISHING_TYPES}
            value={formData.finishing}
            onChange={v => setFormData({ ...formData, finishing: v })}
            isRTL={inputLanguage === 'ar'}
          />
        </div>
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'الإطلالة' : 'View'}</label>
          <SearchableSelect
            options={VIEW_TYPES}
            value={formData.view}
            onChange={v => setFormData({ ...formData, view: v })}
            isRTL={inputLanguage === 'ar'}
          />
        </div>
      </div>

      {/* Purpose & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'الغرض' : 'Purpose'}</label>
          <SearchableSelect
            options={PURPOSES}
            value={formData.purpose}
            onChange={v => setFormData({ ...formData, purpose: v })}
            isRTL={inputLanguage === 'ar'}
          />
        </div>
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'الحالة' : 'Status'}</label>
          <SearchableSelect
            options={['Available', 'Reserved', 'Sold', 'Hold', 'Resale']}
            value={formData.status}
            onChange={v => setFormData({ ...formData, status: v })}
            isRTL={inputLanguage === 'ar'}
          />
        </div>
      </div>

      {/* Elevator */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="elevator"
          checked={formData.elevator}
          onChange={e => setFormData({ ...formData, elevator: e.target.checked })}
          className="w-4 h-4 text-blue-600"
        />
        <label htmlFor="elevator" className="select-none">
          {inputLanguage === 'ar' ? 'يوجد مصعد' : 'Elevator Available'}
        </label>
      </div>

      {/* Owner Info (Conditional) */}
      {(formData.purpose === 'Resale' || formData.purpose === 'Rent') && (
        <div className="space-y-4 border-t pt-4 animate-fadeIn">
          <h3 className="font-medium text-blue-600">
            {inputLanguage === 'ar' ? 'بيانات المالك' : 'Owner Details'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="label">{inputLanguage === 'ar' ? 'اسم المالك' : 'Owner Name'}</label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <label className="label">{inputLanguage === 'ar' ? 'موبايل المالك' : 'Owner Mobile'}</label>
              <input
                type="text"
                value={formData.ownerMobile}
                onChange={e => setFormData({ ...formData, ownerMobile: e.target.value })}
                className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <label className="label">{inputLanguage === 'ar' ? 'قيمة الإيجار' : 'Rent Cost'}</label>
              <input
                type="number"
                value={formData.rentCost}
                onChange={e => setFormData({ ...formData, rentCost: e.target.value })}
                className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2 pt-4 border-t">
        <label className="label flex items-center gap-2">
          <FaHeading className="text-gray-400" />
          {inputLanguage === 'ar' ? 'عنوان الإعلان' : 'Ad Title'}
        </label>
        {inputLanguage === 'ar' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showEnglish && (
              <div>
                <label className="text-xs text-[var(--muted-text)]">English</label>
                <input
                  className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700`}
                  value={formData.adTitle}
                  onChange={e => setFormData({ ...formData, adTitle: e.target.value })}
                  placeholder={'e.g., Luxury Apartment'}
                  dir={'ltr'}
                />
              </div>
            )}
            <div>
              <label className="text-xs text-[var(--muted-text)]">عربي</label>
              <input
                className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700`}
                value={formData.adTitleAr}
                onChange={e => setFormData({ ...formData, adTitleAr: e.target.value })}
                placeholder={'مثال: شقة فاخرة'}
                dir={'rtl'}
              />
            </div>
          </div>
        ) : (
          <input
            className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700`}
            value={formData.adTitle}
            onChange={e => setFormData({ ...formData, adTitle: e.target.value })}
            placeholder={'e.g., Luxury Apartment with Nile View'}
            dir={'ltr'}
          />
        )}
      </div>
      {/* Dynamic Fields */}
      <div className="border-t pt-4 border-gray-100 dark:border-gray-700">
        <DynamicFieldRenderer
          entityKey="properties"
          values={dynamicValues}
          onChange={handleDynamicChange}
          isRTL={inputLanguage === 'ar'}
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Description */}
      <div className="space-y-2">
        <label className="label flex items-center gap-2">
          <FaAlignLeft className="text-gray-400" />
          {inputLanguage === 'ar' ? 'الوصف التفصيلي' : 'Detailed Description'}
        </label>
        {inputLanguage === 'ar' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showEnglish && (
              <div>
                <label className="text-xs text-[var(--muted-text)]">English</label>
                <textarea
                  className="input dark:bg-gray-800 w-full min-h-[150px] font-sans border border-black dark:border-gray-700"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder={'Write a compelling description...'}
                  dir={'ltr'}
                />
              </div>
            )}
            <div>
              <label className="text-xs text-[var(--muted-text)]">عربي</label>
              <textarea
                className="input dark:bg-gray-800 w-full min-h-[150px] font-sans border border-black dark:border-gray-700"
                value={formData.descriptionAr}
                onChange={e => setFormData({ ...formData, descriptionAr: e.target.value })}
                placeholder={'اكتب وصفاً جذاباً للعقار...'}
                dir={'rtl'}
              />
            </div>
          </div>
        ) : (
          <textarea
            className="input dark:bg-gray-800 w-full min-h-[150px] font-sans border border-black dark:border-gray-700"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder={'Write a compelling description...'}
            dir={'ltr'}
          />
        )}
      </div>

      {/* Amenities */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">{inputLanguage === 'ar' ? 'المرافق الداخلية' : 'Indoor Amenities'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {AMENITIES_INDOOR.map(item => (
            <label key={item} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <input
                type="checkbox"
                checked={formData.amenities.includes(item)}
                onChange={e => {
                  if (e.target.checked) setFormData(prev => ({ ...prev, amenities: [...prev.amenities, item] }))
                  else setFormData(prev => ({ ...prev, amenities: prev.amenities.filter(i => i !== item) }))
                }}
                className="checkbox rounded text-blue-600"
              />
              <span className="text-sm">{item}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">{inputLanguage === 'ar' ? 'مرافق المبنى' : 'Building Amenities'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {AMENITIES_BUILDING.map(item => (
            <label key={item} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <input
                type="checkbox"
                checked={formData.amenities.includes(item)}
                onChange={e => {
                  if (e.target.checked) setFormData(prev => ({ ...prev, amenities: [...prev.amenities, item] }))
                  else setFormData(prev => ({ ...prev, amenities: prev.amenities.filter(i => i !== item) }))
                }}
                className="checkbox rounded text-blue-600"
              />
              <span className="text-sm">{item}</span>
            </label>
          ))}
        </div>
      </div>


    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Main Image */}
      <div className="space-y-2">
        <label className="label font-bold text-blue-600">
          {inputLanguage === 'ar' ? 'الصورة الرئيسية (تظهر في الكارت)' : 'Main Image (Appears on Card)'}
        </label>
        <FileUploader
          label={inputLanguage === 'ar' ? 'اسحب الصورة الرئيسية هنا' : 'Drag & Drop Main Photo Here'}
          subLabel={inputLanguage === 'ar' ? 'صورة واحدة فقط' : 'Single image only'}
          files={formData.mainImage ? [formData.mainImage] : []}
          onDrop={(files) => setFormData(prev => ({ ...prev, mainImage: files[0] }))}
          accept="image/*"
          multiple={false}
          isRTL={inputLanguage === 'ar'}
        />
      </div>

      {/* Images Gallery */}
      <div className="space-y-2">
        <label className="label">
          {inputLanguage === 'ar' ? 'معرض صور الوحدة (الجاليري)' : 'Unit Image Gallery'}
        </label>
        <FileUploader
          label={inputLanguage === 'ar' ? 'اسحب باقي صور الوحدة هنا' : 'Drag & Drop Gallery Photos Here'}
          subLabel={inputLanguage === 'ar' ? 'يمكنك اختيار عدة صور' : 'You can select multiple images'}
          files={formData.images}
          onDrop={(files) => setFormData(prev => ({ ...prev, images: [...prev.images, ...files] }))}
          accept="image/*"
          multiple={true}
          isRTL={inputLanguage === 'ar'}
        />
      </div>

      {/* Floor Plans */}
      <div className="space-y-2">
        <label className="label">{inputLanguage === 'ar' ? 'مخططات الطوابق' : 'Floor Plans'}</label>
        <FileUploader
          label={inputLanguage === 'ar' ? 'اسحب وأفلت المخططات' : 'Upload Floor Plans'}
          subLabel="2D or 3D layouts"
          files={Array.isArray(formData.floorPlans) ? formData.floorPlans : []}
          onDrop={(files) => setFormData(prev => {
            const existing = Array.isArray(prev.floorPlans) ? prev.floorPlans : []
            return ({ ...prev, floorPlans: [...existing, ...files] })
          })}
          accept="image/*,.pdf"
          isRTL={inputLanguage === 'ar'}
        />
      </div>

      <div className="space-y-2">
        <label className="label">{inputLanguage === 'ar' ? 'ملفات PDF' : 'PDF Documents'}</label>
        <FileUploader
          label={inputLanguage === 'ar' ? 'اسحب وأفلت ملفات PDF هنا' : 'Drag & Drop PDFs Here'}
          subLabel={inputLanguage === 'ar' ? 'أو اضغط للاختيار' : 'or click to browse'}
          files={Array.isArray(formData.documents) ? formData.documents : []}
          onDrop={(files) => setFormData(prev => {
            const existing = Array.isArray(prev.documents) ? prev.documents : []
            return ({ ...prev, documents: [...existing, ...files] })
          })}
          accept="application/pdf,.pdf"
          isRTL={inputLanguage === 'ar'}
        />
      </div>

      {/* Videos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <FaLink className="text-gray-400" />
            {inputLanguage === 'ar' ? 'رابط جولة الفيديو' : 'Video Tour URL'}
          </label>
          <div>
            <input
              className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 `}
              value={formData.videoUrl}
              onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="YouTube / Vimeo link"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <FaLink className="text-gray-400" />
            {inputLanguage === 'ar' ? 'رابط جولة افتراضية' : '360° Virtual Tour URL'}
          </label>
          <div>
            <input
              className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 `}
              value={formData.virtualTourUrl}
              onChange={e => setFormData({ ...formData, virtualTourUrl: e.target.value })}
              placeholder="Matterport link"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="space-y-6">
        {/* Method 1: Detailed Address */}
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <FaMapMarkedAlt className="text-gray-400" />
            {inputLanguage === 'ar' ? '1. العنوان بالتفصيل' : '1. Detailed Address'}
          </label>
          {inputLanguage === 'ar' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showEnglish && (
                <div>
                  <label className="text-xs text-[var(--muted-text)]">English</label>
                  <textarea
                    className={`input dark:bg-gray-800 w-full min-h-[80px] border border-black dark:border-gray-700 `}
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder={'Enter detailed address (Street name, Building No, Area...)'}
                    dir={'ltr'}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-[var(--muted-text)]">عربي</label>
                <textarea
                  className={`input dark:bg-gray-800 w-full min-h-[80px] border border-black dark:border-gray-700 `}
                  value={formData.addressAr}
                  onChange={e => setFormData({ ...formData, addressAr: e.target.value })}
                  placeholder={'اكتب العنوان بالتفصيل (اسم الشارع، رقم المبنى، المنطقة...)'}
                  dir={'rtl'}
                />
              </div>
            </div>
          ) : (
            <textarea
              className={`input dark:bg-gray-800 w-full min-h-[80px] border border-black dark:border-gray-700 `}
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder={'Enter detailed address (Street name, Building No, Area...)'}
              dir={'ltr'}
            />
          )}
        </div>

        {/* Method 2: Location URL */}
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <FaLink className="text-gray-400" />
            {inputLanguage === 'ar' ? '2. رابط الموقع (URL)' : '2. Location URL'}
          </label>
          <div>
            <input
              className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 `}
              value={formData.locationUrl}
              onChange={e => setFormData({ ...formData, locationUrl: e.target.value })}
              placeholder={inputLanguage === 'ar' ? 'الصق رابط موقع جوجل ماب هنا' : 'Paste Google Maps link here'}
            />
          </div>
        </div>

        {/* Method 3: Map Pin */}
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? '3. تحديد الموقع على الخريطة' : '3. Pin Location on Map'}</label>
          <div className="w-full h-80 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 relative z-0">
            {currentStep === 4 && (
              <MapContainer
                center={formData.location || [30.0444, 31.2357]} // Default to Cairo
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapPicker
                  location={formData.location}
                  setLocation={(loc) => setFormData(prev => ({ ...prev, location: loc }))}
                  setLocationUrl={(url) => setFormData(prev => ({ ...prev, locationUrl: url }))}
                />
              </MapContainer>
            )}

            {!formData.location && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400]  dark:bg-gray-900 px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-bounce pointer-events-none">
                {inputLanguage === 'ar' ? 'اضغط على الخريطة لتحديد الموقع' : 'Tap on map to pin location'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nearby */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <label className="label">{inputLanguage === 'ar' ? 'معالم قريبة' : 'Nearby Landmarks'}</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['School', 'Hospital', 'Mall', 'Metro Station', 'Airport', 'Park', 'Gym', 'Supermarket'].map(item => (
            <label key={item} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <input
                type="checkbox"
                checked={formData.nearby.includes(item)}
                onChange={e => {
                  if (e.target.checked) setFormData(prev => ({ ...prev, nearby: [...prev.nearby, item] }))
                  else setFormData(prev => ({ ...prev, nearby: prev.nearby.filter(i => i !== item) }))
                }}
                className="checkbox rounded text-blue-600"
              />
              <span className="text-sm">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Payment Plans */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center justify-between">
          {inputLanguage === 'ar' ? 'خطط الدفع' : 'Payment Plans'}
          {formData.project && (
            <div className="flex items-center gap-2">
              <select
                value={selectedPlanId}
                onChange={(e) => { setSelectedPlanId(e.target.value); const sel = availablePlans.find(p => p.id === e.target.value); applyPlanTemplate(sel) }}
                className={`input dark:bg-gray-800 text-sm w-auto border border-black dark:border-gray-700 font-normal`}
              >
                <option value="">{inputLanguage === 'ar' ? 'اختر خطة المشروع' : 'Select Project Plan'}</option>
                {availablePlans.map(pl => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </div>
          )}
        </h3>

        {/* Installment Plans List */}
        <div className="space-y-3">
          {formData.installmentPlans.map((plan, index) => (
            <div key={index} className="p-4 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 relative group animate-fadeIn space-y-4">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <FaTag className="text-gray-400" />
                        <span className="label m-0">
                          {inputLanguage === 'ar' ? 'السعر' : 'Price'} <span className="text-red-500">*</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 ${errors.price ? 'border-red-500' : ''}`}
                          value={formatWithCommas(formData.price)}
                          onChange={e => { setPriceEdited(true); setFormData({ ...formData, price: unformatNumber(e.target.value) }) }}
                          placeholder="0.00"
                        />
                        <select
                          className="input dark:bg-gray-800 w-24 border border-black dark:border-gray-700"
                          value={formData.currency}
                          onChange={e => setFormData({ ...formData, currency: e.target.value })}
                        >
                          <option value="EGP">EGP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                      {errors.price && <p className="text-red-500 text-xs">{errors.price}</p>}
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <FaPercentage className="text-gray-400" />
                        <span className="label m-0">{inputLanguage === 'ar' ? 'الخصم' : 'Discount'}</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
                          value={formData.discountType === 'amount' ? formatWithCommas(formData.discount) : formData.discount}
                          onChange={e => setFormData({ ...formData, discount: unformatNumber(e.target.value) })}
                          placeholder="0.00"
                        />
                        <select
                          className="input dark:bg-gray-800 w-32 border border-black dark:border-gray-700"
                          value={formData.discountType}
                          onChange={e => handleDiscountTypeChange(e.target.value)}
                        >
                          <option value="amount">{inputLanguage === 'ar' ? 'قيمة' : 'Amount'}</option>
                          <option value="percentage">{inputLanguage === 'ar' ? 'نسبة %' : 'Percentage %'}</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <span className="label m-0">{inputLanguage === 'ar' ? 'الإجمالي بعد الخصم' : 'Total After Discount'}</span>
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        readOnly
                        className="input bg-gray-100 dark:bg-gray-700 w-full border border-gray-600 font-bold"
                        value={formatWithCommas(formData.totalAfterDiscount)}
                      />
                    </td>
                  </tr>


                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <span className="label m-0">{inputLanguage === 'ar' ? 'مبلغ الحجز' : 'Reservation Amount'}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input dark:bg-gray-800 w-full text-sm border border-black dark:border-gray-700"
                          value={(plan.reservationType || 'amount') === 'amount' ? formatWithCommas(formData.reservationAmount) : formData.reservationAmount}
                          onChange={e => setFormData({ ...formData, reservationAmount: unformatNumber(e.target.value) })}
                          placeholder="0.00"
                        />
                        <select
                          className="input dark:bg-gray-800 w-28 text-sm border border-black dark:border-gray-700"
                          value={plan.reservationType || 'amount'}
                          onChange={e => handleReservationTypeChange(index, e.target.value)}
                        >
                          <option value="amount">{inputLanguage === 'ar' ? 'مبلغ' : 'Amount'}</option>
                          <option value="percentage">{inputLanguage === 'ar' ? 'نسبة %' : 'Percentage %'}</option>
                        </select>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <span className="label m-0">{inputLanguage === 'ar' ? 'المقدم' : 'Down Payment'}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input dark:bg-gray-800 w-full text-sm border border-black dark:border-gray-700"
                          value={(plan.downPaymentType || 'amount') === 'amount' ? formatWithCommas(plan.downPayment) : plan.downPayment}
                          onChange={e => updateInstallmentPlan(index, 'downPayment', unformatNumber(e.target.value))}
                          placeholder={plan.downPaymentType === 'percentage' ? '10' : '0.00'}
                        />
                        <select
                          className="input dark:bg-gray-800 w-28 text-sm border border-black dark:border-gray-700"
                          value={plan.downPaymentType || 'amount'}
                          onChange={e => updateInstallmentPlan(index, 'downPaymentType', e.target.value)}
                        >
                          <option value="amount">{inputLanguage === 'ar' ? 'مبلغ' : 'Amount'}</option>
                          <option value="percentage">{inputLanguage === 'ar' ? 'نسبة %' : 'Percentage %'}</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <span className="label m-0">{inputLanguage === 'ar' ? 'دفعة استلام' : 'Receipt Amount'}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input dark:bg-gray-800 w-full text-sm border border-black dark:border-gray-700"
                          value={formatWithCommas(plan.receiptAmount)}
                          onChange={e => updateInstallmentPlan(index, 'receiptAmount', unformatNumber(e.target.value))}
                          placeholder="0.00"
                        />
                        <select
                          className="input dark:bg-gray-800 w-32 text-sm border border-black dark:border-gray-700"
                          value={plan.receiptAmountType || 'amount'}
                          onChange={e => updateInstallmentPlan(index, 'receiptAmountType', e.target.value)}
                        >
                          <option value="amount">{inputLanguage === 'ar' ? 'مبلغ' : 'Amount'}</option>
                          <option value="percentage">{inputLanguage === 'ar' ? 'نسبة %' : 'Percentage %'}</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <span className="label m-0">{inputLanguage === 'ar' ? 'قيمة القسط' : 'Installment Amount'}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input dark:bg-gray-800 w-full text-sm border border-black dark:border-gray-700"
                          value={formatWithCommas(plan.installmentAmount)}
                          onChange={e => updateInstallmentPlan(index, 'installmentAmount', unformatNumber(e.target.value))}
                          placeholder="0.00"
                        />
                        <select
                          className="input dark:bg-gray-800 w-32 text-sm border border-black dark:border-gray-700"
                          value={plan.installmentFrequency}
                          onChange={e => updateInstallmentPlan(index, 'installmentFrequency', e.target.value)}
                        >
                          <option value="Monthly">{inputLanguage === 'ar' ? 'شهري' : 'Monthly'}</option>
                          <option value="Quarterly">{inputLanguage === 'ar' ? 'ربع سنوي' : 'Quarterly'}</option>
                          <option value="Semi-Annual">{inputLanguage === 'ar' ? 'نصف سنوي' : 'Semi-Annual'}</option>
                          <option value="Annual">{inputLanguage === 'ar' ? 'سنوي' : 'Annual'}</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <span className="label m-0">{inputLanguage === 'ar' ? 'المدة (سنوات)' : 'Years'}</span>
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        className="input dark:bg-gray-800 w-full text-sm border border-black dark:border-gray-700"
                        value={plan.years}
                        onChange={e => updateInstallmentPlan(index, 'years', e.target.value)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <span className="label m-0">{inputLanguage === 'ar' ? 'دفعة إضافية' : 'Additional Payment'}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          className="input bg-gray-100 dark:bg-gray-700 w-full text-sm border border-gray-600"
                          value={formatWithCommas(plan.extraPayment)}
                        />
                        <select
                          className="input dark:bg-gray-800 w-32 text-sm border border-black dark:border-gray-700"
                          value={plan.extraPaymentFrequency}
                          onChange={e => updateInstallmentPlan(index, 'extraPaymentFrequency', e.target.value)}
                        >
                          <option value="Monthly">{inputLanguage === 'ar' ? 'شهري' : 'Monthly'}</option>
                          <option value="Quarterly">{inputLanguage === 'ar' ? 'ربع سنوي' : 'Quarterly'}</option>
                          <option value="Semi-Annual">{inputLanguage === 'ar' ? 'نصف سنوي' : 'Semi-Annual'}</option>
                          <option value="Annual">{inputLanguage === 'ar' ? 'سنوي' : 'Annual'}</option>
                        </select>
                        <input
                          type="text"
                          readOnly
                          className="input bg-gray-100 dark:bg-gray-700 w-20 text-sm border border-gray-600"
                          value={plan.extraPaymentCount}
                        />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <span className="label m-0">{inputLanguage === 'ar' ? 'الاستلام' : 'Delivery'}</span>
                    </td>
                    <td className="py-2">
                      <input
                        type="date"
                        className="input dark:bg-gray-800 w-full text-sm border border-black dark:border-gray-700"
                        value={plan.deliveryDate}
                        onChange={e => updateInstallmentPlan(index, 'deliveryDate', e.target.value)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <span className="label m-0">{inputLanguage === 'ar' ? 'سعر الجراج' : 'Garage Amount'}</span>
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
                        value={formatWithCommas(formData.garageAmount)}
                        onChange={e => setFormData({ ...formData, garageAmount: unformatNumber(e.target.value) })}
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <span className="label m-0">{inputLanguage === 'ar' ? 'وديعة الصيانة' : 'Maintenance Amount'}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
                          value={formatWithCommas(formData.maintenanceAmount)}
                          onChange={e => setFormData({ ...formData, maintenanceAmount: unformatNumber(e.target.value) })}
                          placeholder="0.00"
                        />
                        <select
                          className="input dark:bg-gray-800 w-32 border border-black dark:border-gray-700"
                          value={formData.discountType}
                          onChange={e => handleDiscountTypeChange(e.target.value)}
                        >
                          <option value="amount">{inputLanguage === 'ar' ? 'قيمة' : 'Amount'}</option>
                          <option value="percentage">{inputLanguage === 'ar' ? 'نسبة %' : 'Percentage %'}</option>
                        </select>
                      </div>

                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/3 py-2 align-middle">
                      <span className="label m-0">{inputLanguage === 'ar' ? 'صافي المبلغ' : 'Net Amount'}</span>
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        readOnly
                        className="input bg-gray-100 dark:bg-gray-700 w-full border border-transparent font-bold"
                        value={formatWithCommas(formData.netAmount)}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <button
                onClick={() => removeInstallmentPlan(index)}
                className="absolute top-2 right-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
              >
                <FaTrash size={12} />
              </button>
            </div>
          ))}

          <button
            onClick={addInstallmentPlan}
            className="w-full py-3 border-2 border-dashed border-black dark:border-gray-600 rounded-xl flex items-center justify-center gap-2 text-[var(--muted-text)] hover:border-blue-500 hover:text-blue-500 transition-colors"
          >
            <FaPlus size={14} />
            {inputLanguage === 'ar' ? 'إضافة نظام تقسيط' : 'Add Installment Plan'}
          </button>
        </div>
      </div>



      {/* Legal Documents */}
      <div className="space-y-2 pt-6 border-t border-gray-200 dark:border-gray-700">
        <label className="label">
          {inputLanguage === 'ar' ? 'المستندات القانونية' : 'Legal Documents'}
          <Tooltip text="Upload Title Deeds, Permits, or Authorization letters (Private)" />
        </label>
        <FileUploader
          label={inputLanguage === 'ar' ? 'رفع المستندات' : 'Upload Documents'}
          subLabel="PDF, JPG, PNG (Max 10MB)"
          files={Array.isArray(formData.documents) ? formData.documents : []}
          onDrop={(files) => setFormData(prev => {
            const existing = Array.isArray(prev.documents) ? prev.documents : []
            return ({ ...prev, documents: [...existing, ...files] })
          })}
          accept=".pdf,.jpg,.jpeg,.png"
          isRTL={inputLanguage === 'ar'}
        />
      </div>
    </div>
  )

  const renderStepCIL = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl mb-4">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
          <FaAddressCard />
          {inputLanguage === 'ar' ? 'خطاب معلومات  العميل (CIL)' : 'Client Information Letter (CIL)'}
        </h3>
        <p className="text-xs text-blue-600 dark:text-blue-300">
          {inputLanguage === 'ar' ? 'قم بتعبئة بيانات الخطاب لإرساله.' : 'Fill in the letter details to send it.'}
        </p>
      </div>

      <div className="space-y-4">
        {/* To */}
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <FaUser className="text-gray-400" />
            {inputLanguage === 'ar' ? 'إلى' : 'To'}
          </label>
          {inputLanguage === 'ar' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showEnglish && (
                <div>
                  <label className="text-xs text-[var(--muted-text)]">English</label>
                  <input
                    className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700`}
                    value={formData.cilTo}
                    onChange={e => setFormData({ ...formData, cilTo: e.target.value })}
                    placeholder={'Recipient Name'}
                    dir={'ltr'}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-[var(--muted-text)]">عربي</label>
                <input
                  className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700`}
                  value={formData.cilToAr}
                  onChange={e => setFormData({ ...formData, cilToAr: e.target.value })}
                  placeholder={'اسم المستقبل'}
                  dir={'rtl'}
                />
              </div>
            </div>
          ) : (
            <input
              className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700`}
              value={formData.cilTo}
              onChange={e => setFormData({ ...formData, cilTo: e.target.value })}
              placeholder={'Recipient Name'}
              dir={'ltr'}
            />
          )}

        </div>

        {/* Subject */}
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <FaTag className="text-gray-400" />
            {inputLanguage === 'ar' ? 'الموضوع' : 'Subject'}
          </label>
          {inputLanguage === 'ar' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showEnglish && (
                <div>
                  <label className="text-xs text-[var(--muted-text)]">English</label>
                  <input
                    className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700`}
                    value={formData.cilSubject}
                    onChange={e => setFormData({ ...formData, cilSubject: e.target.value })}
                    placeholder={'Letter Subject'}
                    dir={'ltr'}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-[var(--muted-text)]">عربي</label>
                <input
                  className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700`}
                  value={formData.cilSubjectAr}
                  onChange={e => setFormData({ ...formData, cilSubjectAr: e.target.value })}
                  placeholder={'موضوع الخطاب'}
                  dir={'rtl'}
                />
              </div>
            </div>
          ) : (
            <input
              className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700`}
              value={formData.cilSubject}
              onChange={e => setFormData({ ...formData, cilSubject: e.target.value })}
              placeholder={'Letter Subject'}
              dir={'ltr'}
            />
          )}

        </div>

        {/* Content */}
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <FaAlignLeft className="text-gray-400" />
            {inputLanguage === 'ar' ? 'المحتوى' : 'Content'}
          </label>
          {inputLanguage === 'ar' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showEnglish && (
                <div>
                  <label className="text-xs text-[var(--muted-text)]">English</label>
                  <textarea
                    className="input dark:bg-gray-800 w-full min-h-[150px] font-sans border border-black dark:border-gray-700"
                    value={formData.cilContent}
                    onChange={e => setFormData({ ...formData, cilContent: e.target.value })}
                    placeholder={'Write letter content here...'}
                    dir={'ltr'}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-[var(--muted-text)]">عربي</label>
                <textarea
                  className="input dark:bg-gray-800 w-full min-h-[150px] font-sans border border-black dark:border-gray-700"
                  value={formData.cilContentAr}
                  onChange={e => setFormData({ ...formData, cilContentAr: e.target.value })}
                  placeholder={'اكتب محتوى الخطاب هنا...'}
                  dir={'rtl'}
                />
              </div>
            </div>
          ) : (
            <textarea
              className="input dark:bg-gray-800 w-full min-h-[150px] font-sans border border-black dark:border-gray-700"
              value={formData.cilContent}
              onChange={e => setFormData({ ...formData, cilContent: e.target.value })}
              placeholder={'Write letter content here...'}
              dir={'ltr'}
            />
          )}
        </div>

        {/* Signature */}
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <FaFileContract className="text-gray-400" />
            {inputLanguage === 'ar' ? 'التوقيع' : 'Signature'}
          </label>
          {inputLanguage === 'ar' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showEnglish && (
                <div>
                  <label className="text-xs text-[var(--muted-text)]">English</label>
                  <input
                    className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
                    value={formData.cilSignature}
                    onChange={e => setFormData({ ...formData, cilSignature: e.target.value })}
                    placeholder={'Your Signature'}
                    dir={'ltr'}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-[var(--muted-text)]">عربي</label>
                <input
                  className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
                  value={formData.cilSignatureAr}
                  onChange={e => setFormData({ ...formData, cilSignatureAr: e.target.value })}
                  placeholder={'توقيعك'}
                  dir={'rtl'}
                />
              </div>
            </div>
          ) : (
            <input
              className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              value={formData.cilSignature}
              onChange={e => setFormData({ ...formData, cilSignature: e.target.value })}
              placeholder={'Your Signature'}
              dir={'ltr'}
            />
          )}
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <FaCloudUploadAlt className="text-gray-400" />
            {inputLanguage === 'ar' ? 'المرفقات' : 'Attachments'}
          </label>
          <FileUploader
            label={inputLanguage === 'ar' ? 'رفع مرفقات' : 'Upload Attachments'}
            subLabel="PDF, JPG, PNG"
            files={formData.cilAttachments}
            onDrop={(files) => setFormData(prev => ({ ...prev, cilAttachments: [...prev.cilAttachments, ...files] }))}
            accept=".pdf,.jpg,.jpeg,.png"
            isRTL={inputLanguage === 'ar'}
          />
        </div>
      </div>
    </div>
  )

  const renderStep6 = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Contact Info Preview */}
      <div className="dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FaBullhorn className="text-blue-500" />
          {inputLanguage === 'ar' ? 'معلومات التواصل' : 'Contact Information'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-[var(--muted-text)] block text-xs uppercase tracking-wider flex items-center gap-1">
              <FaUser className="text-gray-400" />
              {inputLanguage === 'ar' ? 'الاسم' : 'Name'}
            </span>
            <div>
              <input
                className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 `}
                value={formData.contactName}
                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[var(--muted-text)] block text-xs uppercase tracking-wider flex items-center gap-1">
              <FaEnvelope className="text-gray-400" />
              {inputLanguage === 'ar' ? 'البريد الإلكتروني' : 'Email'}
            </span>
            <div>
              <input
                className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 `}
                value={formData.contactEmail}
                onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[var(--muted-text)] block text-xs uppercase tracking-wider flex items-center gap-1">
              <FaPhone className="text-gray-400" />
              {inputLanguage === 'ar' ? 'الهاتف' : 'Phone'}
            </span>
            <div>
              <input
                className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 `}
                value={formData.contactPhone}
                onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>



      {/* Channel Management */}
      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaExternalLinkAlt className="text-blue-500" />
            <h3 className="font-semibold">
              {inputLanguage === 'ar' ? 'القنوات التسويقية' : 'Channel Management'}
            </h3>
          </div>
          <span className="text-xs text-[var(--muted-text)]">
            {inputLanguage === 'ar' ? 'اختر القنوات وخطة الترقية لكل بوابة' : 'Select channels and package per portal'}
          </span>
        </div>

        <div className="space-y-3">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="rounded-xl border border-gray-200 dark:border-slate-700 dark:!bg-slate-800 p-4 flex flex-col gap-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {channel.type === 'website' ? (
                    <FaGlobe className="text-emerald-500" />
                  ) : (
                    <FaExternalLinkAlt className="text-blue-500" />
                  )}
                  <div>
                    <div className="font-semibold">{channel.name}</div>
                    <div className="text-xs text-[var(--muted-text)]">
                      {channel.type === 'website'
                        ? inputLanguage === 'ar' ? 'موقع الشركة' : 'Company website'
                        : inputLanguage === 'ar' ? 'بوابة خارجية' : 'External portal'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Re-implemented Toggle Button with fixed width container to prevent layout shifts */}
                  <div className="flex items-center gap-2" dir="ltr">
                    <span className={`text-xs font-medium ${channel.active ? 'text-blue-600' : 'text-gray-400'} w-[60px] text-right`}>
                      {channel.active
                        ? (inputLanguage === 'ar' ? 'مفعل' : 'Active')
                        : (inputLanguage === 'ar' ? 'معطل' : 'Disabled')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChannelToggle(channel.id, !channel.active)}
                      className={`
                        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
                        ${channel.active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}
                      `}
                    >
                      <span className="sr-only">Use setting</span>
                      <span
                        aria-hidden="true"
                        className={`
                          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                          transition duration-200 ease-in-out
                          ${channel.active ? 'translate-x-5' : 'translate-x-0'}
                        `}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {channel.type === 'portal' && channel.active && (
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                  <div className="text-sm text-[var(--muted-text)]">
                    {inputLanguage === 'ar' ? 'باقة التسويق' : 'Marketing package'}
                  </div>
                  <select
                    className="input dark:bg-gray-800 w-full md:w-80 border border-black dark:border-gray-700"
                    value={channel.selectedPackage}
                    onChange={(e) => handlePackageChange(channel.id, e.target.value)}
                  >
                    {channel.packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.remaining} {inputLanguage === 'ar' ? 'متبقي' : 'remaining'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-xs text-[var(--muted-text)]">
                <div className={statusBadge(channel.status)}>
                  {inputLanguage === 'ar' ? 'الحالة:' : 'Status:'}{' '}{channel.status}
                </div>
                <div className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  {inputLanguage === 'ar' ? 'آخر مزامنة:' : 'Last synced:'}{' '}
                  <span className="font-semibold">{channel.lastSyncAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Marketing Materials */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700  dark:!bg-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FaCloudDownloadAlt className="text-purple-500" />
          <h3 className="font-semibold">
            {inputLanguage === 'ar' ? 'إنشاء مواد تسويقية' : 'Marketing Materials'}
          </h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none"
            onClick={handleGenerateBrochure}
          >
            {inputLanguage === 'ar' ? 'توليد كتيب PDF' : 'Generate PDF Brochure'}
          </button>
          <button
            className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none"
            onClick={handleEmailTemplate}
          >
            {inputLanguage === 'ar' ? 'إنشاء حملة بريدية' : 'Create Email Campaign'}
          </button>
        </div>
      </div>

      {/* Main Actions */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700  dark:!bg-slate-800 p-4 flex flex-wrap justify-between gap-3 items-center">
        <div className="text-sm text-[var(--muted-text)]">
          {inputLanguage === 'ar' ? 'احفظ كمسودة أو انشر للقنوات المحددة' : 'Save as draft or publish to selected channels'}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn btn-sm bg-gray-500 hover:bg-gray-600 text-white border-none"
            onClick={handleSaveDraft}
          >
            {inputLanguage === 'ar' ? 'حفظ كمسودة' : 'Save as Draft'}
          </button>
          <button
            className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none"
            onClick={markPublish}
          >
            {inputLanguage === 'ar' ? 'نشر للقنوات المحددة' : 'Publish to Selected Channels'}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="text-sm text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
          {actionMessage}
        </div>
      )}
    </div>
  )

  const handleChannelToggle = (id, active) => {
    // Re-implemented function to handle channel toggling safely
    setChannels((prevChannels) => {
      return prevChannels.map((channel) => {
        if (channel.id === id) {
          // Update status based on active state
          const newStatus = active ? 'Pending Sync' : 'Not Published'
          return { ...channel, active, status: newStatus }
        }
        return channel
      })
    })
  }

  const handlePackageChange = (id, pkgId) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, selectedPackage: pkgId } : ch))
    )
  }

  const markPublish = () => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.active
          ? {
            ...ch,
            status: 'Pending Sync',
            lastSyncAt: new Date().toLocaleString(),
          }
          : ch
      )
    )
    setFormData(prev => ({ ...prev, publishStatus: 'Published' }))
    setActionMessage(inputLanguage === 'ar' ? 'تم تجهيز النشر وسيتم التوزيع في الخلفية.' : 'Publish queued; background syndication will start shortly.')
    if (onSave) onSave({ ...formData, custom_fields: dynamicValues, publishStatus: 'Published' })
  }

  const handleSaveDraft = () => {
    setFormData(prev => ({ ...prev, publishStatus: 'Draft' }))
    setActionMessage(inputLanguage === 'ar' ? 'تم الحفظ كمسودة دون نشر.' : 'Saved as draft without publishing.')
    if (onSave) onSave({ ...formData, custom_fields: dynamicValues, publishStatus: 'Draft' })
  }

  const handleGenerateBrochure = () => {
    setActionMessage(inputLanguage === 'ar' ? 'سيتم توليد كتيب PDF عبر الخدمة الخلفية.' : 'PDF brochure generation will be handled by backend.')
  }

  const handleEmailTemplate = () => {
    setActionMessage(inputLanguage === 'ar' ? 'سيتم تجهيز قالب بريد للتصدير من لوحة الحملات.' : 'Email template will be prepared for campaigns.')
  }

  const statusBadge = (status) => {
    const base = 'px-2 py-1 rounded font-semibold text-xs'
    if (status === 'Live') return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200`
    if (status === 'Pending Sync') return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200`
    if (status === 'Error') return `${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200`
    return `${base} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200`
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div
        className="relative z-[210]  dark:!bg-slate-950 rounded-2xl w-[900px] max-w-full h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden animate-slideUp"
        style={{ background: 'var(--panel-bg)' }}
        dir={inputLanguage === 'ar' ? 'rtl' : 'ltr'}
      >

        {/* Header & Progress Bar */}
        <div
          className="flex-shrink-0 bg-blue-50 dark:!bg-slate-900 border-b border-gray-200 dark:!border-slate-700 pt-1 px-2 pb-5 md:pt-2 md:px-3 md:pb-6"
          style={{ background: 'var(--panel-bg)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent px-4">
              {isEdit
                ? (inputLanguage === 'ar' ? 'تعديل العقار' : 'Edit Property')
                : (inputLanguage === 'ar' ? 'إضافة عقار جديد' : 'Add Property')}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setInputLanguage(prev => prev === 'en' ? 'ar' : 'en'); if (inputLanguage === 'ar') setShowEnglish(false) }}
                className={`btn btn-sm ${inputLanguage === 'ar' ? ' text-white' : ' text-gray-700'} border-none px-3`}
              >
                {inputLanguage === 'ar' ? 'English' : 'Arabic'}
              </button>
              <button
                onClick={onClose}
                className="btn btn-sm btn-circle btn-ghost text-red-500"
              >
                <FaTimes size={20} />
              </button>
            </div>
          </div>

          {/* Stepper */}
          <div ref={stepperRef} className="flex items-center justify-between relative px-2 md:px-8">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 dark:bg-gray-700 -translate-y-1/2 rounded-full" />
            <div
              className={`absolute top-1/2 ${inputLanguage === 'ar' ? 'right-0' : 'left-0'} h-0.5 bg-blue-500 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out`}
              style={{ width: `${progressWidth}px` }}
            />

            {STEPS.map((step) => {
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep
              return (
                <div ref={el => { stepRefs.current[step.id - 1] = el }} key={step.id} className="flex flex-col items-center gap-1 relative group cursor-pointer" onClick={() => setCurrentStep(step.id)}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${isActive
                      ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/30'
                      : isCompleted
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : ' dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                      }`}
                  >
                    {isCompleted ? <FaCheck size={8} /> : <step.icon size={10} />}
                  </div>
                  <span className={`absolute top-full mt-0.5 text-[9px] font-medium whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-blue-600' : 'text-gray-400'
                    } hidden md:block`}>
                    {inputLanguage === 'ar' ? step.labelAr : step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div
          id="wizard-content"
          className="flex-1 w-full overflow-y-auto overflow-x-hidden p-4 md:p-6 custom-scrollbar"
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStepCIL()}
          {currentStep === 7 && renderStep6()}
        </div>

        {/* Footer Navigation */}
        <div
          className="flex-shrink-0 w-full z-10 p-2 border-t border-blue-200 dark:border-slate-800 flex items-center justify-between overflow-hidden"
          style={{ background: 'var(--panel-bg)' }}
          dir={inputLanguage === 'ar' ? 'rtl' : 'ltr'}
        >
          <button
            onClick={onClose}
            className={`btn btn-sm bg-gray-500 hover:bg-gray-600 text-white border-none px-3 py-1 text-xs flex items-center gap-2`}
          >
            <FaTimes />
            {inputLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>

          <div className="text-xs text-[var(--muted-text)] font-medium">
            {inputLanguage === 'ar' ? `خطوة ${currentStep} من ${STEPS.length}` : `Step ${currentStep} of ${STEPS.length}`}
          </div>

          <button
            onClick={handleFinish}
            className={`btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none font-medium flex items-center gap-2`}
          >
            <FaCheck /> {inputLanguage === 'ar' ? 'حفظ' : 'Save'}
          </button>
        </div>

      </div>
    </div>
  )
}
