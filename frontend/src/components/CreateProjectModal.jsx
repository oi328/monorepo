import { useState, useEffect, useRef, useMemo } from 'react'
import { useMapEvents, MapContainer, TileLayer, Marker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { FaHome, FaList, FaImages, FaMapMarkedAlt,
  FaFileContract, FaAddressCard, FaExternalLinkAlt, FaTimes, FaHeading, FaAlignLeft, FaCheck,
  FaInfoCircle, FaCloudUploadAlt, FaTag, FaRulerCombined, FaShieldAlt, FaLink, FaMapMarkerAlt,
  FaHandHoldingUsd, FaPlus, FaTrash, FaUser, FaBullhorn, FaEnvelope, FaPhone, FaGlobe, FaCloudDownloadAlt
} from 'react-icons/fa'
import { useAppState } from '../shared/context/AppStateProvider'
import SearchableSelect from './SearchableSelect'

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map Component to handle clicks and sync
const MapPicker = ({ location, setLocation, setLocationUrl, address, onAddressUpdate }) => {
  const map = useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng
      setLocation(e.latlng)
      map.flyTo(e.latlng, map.getZoom())
      const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
      setLocationUrl(googleMapsUrl)

      // Reverse Geocoding
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
        const data = await res.json()
        if (data && data.display_name) {
          onAddressUpdate && onAddressUpdate(data.display_name)
        }
      } catch (err) {
        console.error("Reverse geocoding error:", err)
      }
    },
  })

  // Center map when location changes (from address search)
  useEffect(() => {
    if (location) {
      map.flyTo(location, 15)
    }
  }, [location, map])

  return location === null ? null : (
    <Marker position={location}>
      <LeafletTooltip permanent direction="top">{address || 'Project Location'}</LeafletTooltip>
    </Marker>
  )
}

// Logic for address search
const useGeocoding = (address, setLocation, setLocationUrl) => {
  useEffect(() => {
    if (!address || address.length < 5) return

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        const data = await res.json()
        if (data && data.length > 0) {
          const { lat, lon } = data[0]
          const newLoc = { lat: parseFloat(lat), lng: parseFloat(lon) }
          setLocation(newLoc)
          setLocationUrl(`https://www.google.com/maps?q=${lat},${lon}`)
        }
      } catch (err) {
        console.error("Geocoding error:", err)
      }
    }, 1500) // Debounce 1.5s

    return () => clearTimeout(timer)
  }, [address])
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

const PROJECT_CATEGORIES = ['Residential', 'Commercial', 'Administrative', 'Medical', 'Coastal', 'Mixed Use']
const DEVELOPERS = ['Palm Hills', 'Mountain View', 'Sodic', 'Emaar Misr', 'Ora Developers', 'City Edge', 'Tatweer Misr', 'Hyde Park']
const CITIES = ['New Cairo', 'Sheikh Zayed', 'New Capital', 'North Coast', 'Ain Sokhna', 'October City', 'Maadi']
const COUNTRIES = ['Egypt', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Jordan', 'Morocco', 'Tunisia']
const PROJECT_STATUS = ['Under construction', 'Launch soon', 'Ready to sale', 'Sold out']
const AMENITIES = ['Club House', 'Gym', 'Spa', 'Kids Area', 'Commercial Area', 'Mosque', 'Swimming Pools', 'Security', 'Parking', 'Medical Center', 'School', 'University']
const AMENITY_LABELS = {
  'Club House': { en: 'Club House', ar: 'النادي' },
  'Gym': { en: 'Gym', ar: 'صالة رياضية' },
  'Spa': { en: 'Spa', ar: 'سبا' },
  'Kids Area': { en: 'Kids Area', ar: 'منطقة الأطفال' },
  'Commercial Area': { en: 'Commercial Area', ar: 'منطقة تجارية' },
  'Mosque': { en: 'Mosque', ar: 'مسجد' },
  'Swimming Pools': { en: 'Swimming Pools', ar: 'مسابح' },
  'Security': { en: 'Security', ar: 'أمن' },
  'Parking': { en: 'Parking', ar: 'موقف سيارات' },
  'Medical Center': { en: 'Medical Center', ar: 'مركز طبي' },
  'School': { en: 'School', ar: 'مدرسة' },
  'University': { en: 'University', ar: 'جامعة' },
}

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

const FileUploader = ({ label, subLabel, files, onDrop, accept = "*", multiple = true }) => (
  <div className="border-2 border-dashed border-black dark:border-gray-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative">
    <input
      type="file"
      multiple={multiple}
      accept={accept}
      onChange={(e) => onDrop(Array.from(e.target.files || []))}
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
            {(() => {
              if (!f) return ''
              if (typeof f === 'string') return f.split('/').pop()
              if (f instanceof File) return f.name
              if (typeof f === 'object') {
                const name = f.name || f.originalName || f.file_name || ''
                if (name) return name
                const u = f.url || f.path || f.src || ''
                return typeof u === 'string' ? u.split('/').pop() : ''
              }
              return String(f)
            })()}
          </div>
        ))}
      </div>
    )}
  </div>
)

// --- Main Component ---
export default function CreateProjectModal({ onClose, isRTL, onSave, mode = 'create', initialValues = null, dbCities = [], dbCountries = [], developerOptions = [] }) {
  const { crmSettings } = useAppState()
  const [currentStep, setCurrentStep] = useState(1)
  const [inputLanguage, setInputLanguage] = useState('en')
  const [showEnglish, setShowEnglish] = useState(false)
  const stepperRef = useRef(null)
  const stepRefs = useRef([])
  const [progressWidth, setProgressWidth] = useState(0)
  const [formData, setFormData] = useState({
    // Step 1: Core Details
    name: '',
    nameAr: '',
    developer: '',
    developerId: null,
    developerName: '',
    categories: [],
    status: 'Under construction',
    completion: 0,
    country: '',
    description: '',
    descriptionAr: '',
    units: 0,
    phases: 0,
    docs: 0,

    // Step 2: Features
    amenities: [],

    // Step 3: Media
    logo: [],
    mainImage: [],
    gallery: [],
    masterPlan: [],
    videoUrl: '',
    brochure: [],

    // Step 4: Location
    city: '',
    address: '',
    addressAr: '',
    location: null,
    locationUrl: '',

    // Step 5: Financial
    minPrice: '',
    maxPrice: '',
    minSpace: '',
    maxSpace: '',
    currency: 'EGP',
    paymentPlans: [],

    // Step 6: CIL
    cilTo: '',
    cilToAr: '',
    cilSubject: '',
    cilSubjectAr: '',
    cilContent: '',
    cilContentAr: '',
    cilSignature: '',
    cilSignatureAr: '',
    cilAttachments: [],

    // Step 7: Publish
    contactName: 'Current User',
    contactEmail: 'user@example.com',
    contactPhone: '+20 123 456 7890',
    marketingPackage: 'standard',
    publishStatus: 'Draft',
    deliveryDate: ''
  })

  const developerSelectOptions = useMemo(() => {
    if (developerOptions && developerOptions.length > 0) return developerOptions
    return DEVELOPERS.map(name => ({ value: name, label: name }))
  }, [developerOptions])

  // Geocoding logic
  useGeocoding(
    formData.address || formData.addressAr,
    (loc) => setFormData(prev => ({ ...prev, location: loc })),
    (url) => setFormData(prev => ({ ...prev, locationUrl: url }))
  )

  useEffect(() => {
    if (!crmSettings) return
    if (mode !== 'create') return
    setFormData(prev => ({
      ...prev,
      currency: prev.currency || crmSettings.defaultCurrency || prev.currency,
      country: prev.country || crmSettings.defaultCountryCode || prev.country,
    }))
  }, [crmSettings, mode])

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

  useEffect(() => {
    if (initialValues) {
      setFormData(prev => ({
        ...prev,
        ...initialValues,
        // Map Arabic fields if they exist in initialValues
        nameAr: initialValues.nameAr || '',
        descriptionAr: initialValues.descriptionAr || '',
        addressAr: initialValues.addressAr || '',
        cilToAr: initialValues.cil?.toAr || '',
        cilSubjectAr: initialValues.cil?.subjectAr || '',
        cilContentAr: initialValues.cil?.contentAr || '',
        cilSignatureAr: initialValues.cil?.signatureAr || '',

        // Ensure arrays are arrays
        amenities: initialValues.amenities || [],
        categories: initialValues.categories || (typeof initialValues.category === 'string' ? initialValues.category.split(', ') : (initialValues.categories || [])),
        paymentPlans: initialValues.paymentPlans || [],
        // Handle files - if string url, wrap in array or keep as is depending on uploader logic
        // But FileUploader expects array of File objects usually, or we can adapt it to show existing URLs
        logo: initialValues.logo ? [initialValues.logo] : [],
        mainImage: initialValues.image ? [initialValues.image] : [],
        gallery: initialValues.galleryImages || [],
        masterPlan: initialValues.masterPlanImages || [],
        // Map other fields
        minPrice: initialValues.minPrice || '',
        maxPrice: initialValues.maxPrice || '',
        minSpace: initialValues.minSpace || '',
        maxSpace: initialValues.maxSpace || '',
        units: initialValues.units || 0,
        phases: initialValues.phases || 0,
        docs: initialValues.docs || 0,
        videoUrl: initialValues.videoUrls || '',
        // Map CIL if exists
        cilTo: initialValues.cil?.to || '',
        cilSubject: initialValues.cil?.subject || '',
        cilContent: initialValues.cil?.content || '',
        cilSignature: initialValues.cil?.signature || '',
        cilAttachments: initialValues.cil?.attachments || [],

        // Map Publish fields
        contactName: initialValues.contactName || initialValues.publish?.contactName || 'Current User',
        contactEmail: initialValues.contactEmail || initialValues.publish?.contactEmail || 'user@example.com',
        contactPhone: initialValues.contactPhone || initialValues.publish?.contactPhone || '+20 123 456 7890',
        marketingPackage: initialValues.marketingPackage || initialValues.publish?.marketingPackage || 'standard',
        deliveryDate: initialValues.deliveryDate || initialValues.delivery_date || '',
        publishStatus: initialValues.publishStatus || initialValues.publish?.publishStatus || 'Draft',
        developer: initialValues.developerId ? String(initialValues.developerId) : (initialValues.developer || ''),
        developerId: initialValues.developerId ?? null,
        developerName: initialValues.developer || '',
      }))

      // Load channels if they exist
      const existingChannels = initialValues.channels || initialValues.publish?.channels
      if (Array.isArray(existingChannels) && existingChannels.length > 0) {
        setChannels(existingChannels)
      }
    }
  }, [initialValues])

  useEffect(() => {
    if (isRTL) {
      setInputLanguage('ar')
      setShowEnglish(false)
    }
  }, [isRTL])

  const [errors, setErrors] = useState({})

  // Scroll to top
  useEffect(() => {
    const content = document.getElementById('wizard-content')
    if (content) content.scrollTop = 0
  }, [currentStep])

  // Validation
  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim() && !formData.nameAr.trim()) {
      newErrors.name = 'Project Name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFinish = () => {
    if (validateForm()) {
      const payload = {
        name_en: formData.name,
        name_ar: formData.nameAr,
        description_en: formData.description,
        description_ar: formData.descriptionAr,
        address_en: formData.address,
        address_ar: formData.addressAr,
        developer: formData.developer,
        category: Array.isArray(formData.categories) ? formData.categories.join(', ') : '',
        status: formData.status,
        completion: formData.completion,
        country: formData.country,
        city: formData.city,
        location: formData.location,
        location_url: formData.locationUrl,
        min_price: formData.minPrice,
        max_price: formData.maxPrice,
        min_space: formData.minSpace,
        max_space: formData.maxSpace,
        currency: formData.currency,
        amenities: formData.amenities,
        media: {
          logo: formData.logo,
          mainImage: formData.mainImage,
          gallery: formData.gallery,
          masterPlan: formData.masterPlan,
          videoUrl: formData.videoUrl,
          brochure: formData.brochure,
        },
        cil: {
          to_en: formData.cilTo,
          to_ar: formData.cilToAr,
          subject_en: formData.cilSubject,
          subject_ar: formData.cilSubjectAr,
          content_en: formData.cilContent,
          content_ar: formData.cilContentAr,
          signature_en: formData.cilSignature,
          signature_ar: formData.cilSignatureAr,
          attachments: formData.cilAttachments,
        },
        publish: {
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          marketingPackage: formData.marketingPackage,
          channels: channels,
        },
      }
      // Pass all form data to parent (Projects.jsx::handleSaveProject) — no direct api call here
      onSave && onSave({ ...formData, channels, category: Array.isArray(formData.categories) ? formData.categories.join(', ') : (formData.category || '') })
      // Parent (Projects.jsx) will close the modal only after a successful save.
      // Keeping the modal open prevents losing the selected files when the API fails.
    }
  }

  // --- Payment Plan Helpers ---
  const addPaymentPlan = () => {
    setFormData(prev => ({
      ...prev,
      paymentPlans: [...prev.paymentPlans, {
        downPayment: '',
        years: '',
        deliveryDate: '',
        type: 'Equal Installments'
      }]
    }))
  }

  const removePaymentPlan = (index) => {
    setFormData(prev => ({
      ...prev,
      paymentPlans: prev.paymentPlans.filter((_, i) => i !== index)
    }))
  }

  const updatePaymentPlan = (index, field, value) => {
    const newPlans = [...formData.paymentPlans]
    newPlans[index][field] = value
    setFormData(prev => ({ ...prev, paymentPlans: newPlans }))
  }

  // --- Render Steps ---

  const renderStep1 = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Project Name */}
      <div className="space-y-2">
        <label className="label flex items-center gap-2">
          <FaHeading className="text-gray-400" />
          {inputLanguage === 'ar' ? 'اسم المشروع' : 'Project Name'}
          <span className="text-red-500">*</span>
        </label>
        {inputLanguage === 'ar' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showEnglish && (
              <div>
                <label className="text-xs text-[var(--muted-text)]">English</label>
                <input
                  className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 ${errors.name ? 'border-red-500' : ''}`}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={'e.g., Palm Hills New Cairo'}
                  dir={'ltr'}
                />
              </div>
            )}
            <div>
              <label className="text-xs text-[var(--muted-text)]">عربي</label>
              <input
                className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 ${errors.name ? 'border-red-500' : ''}`}
                value={formData.nameAr}
                onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder={'مثال: بالم هيلز القاهرة الجديدة'}
                dir={'rtl'}
              />
            </div>
          </div>
        ) : (
          <input
            className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 ${errors.name ? 'border-red-500' : ''}`}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder={'e.g., Palm Hills New Cairo'}
            dir={'ltr'}
          />
        )}
        {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Country */}
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'الدولة' : 'Country'}</label>
          <SearchableSelect
            options={dbCountries.length > 0 ? dbCountries.map(c => inputLanguage === 'ar' ? (c.name_ar || c.name_en) : c.name_en) : COUNTRIES}
            value={formData.country}
            onChange={v => {
              setFormData({ ...formData, country: v, city: '' }) // Reset city when country changes
            }}
            isRTL={inputLanguage === 'ar'}
            placeholder={inputLanguage === 'ar' ? 'اختر الدولة' : 'Select Country'}
          />
        </div>

        {/* City */}
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'المدينة' : 'City'}</label>
          <SearchableSelect
            options={
              dbCities.length > 0
                ? [
                    inputLanguage === 'ar' ? 'الكل' : 'All',
                    ...dbCities
                      .filter(c => {
                        if (!formData.country) return true // if no country selected, show all
                        // Find the selected country object to match by ID
                        const selectedCountry = dbCountries.find(country =>
                          (inputLanguage === 'ar' ? (country.name_ar || country.name_en) : country.name_en) === formData.country
                        )
                        if (!selectedCountry) return true
                        return c.country_id === selectedCountry.id
                      })
                      .map(c => inputLanguage === 'ar' ? (c.name_ar || c.name_en) : c.name_en)
                  ]
                : CITIES
            }
            value={formData.city}
            onChange={v => setFormData({ ...formData, city: v })}
            isRTL={inputLanguage === 'ar'}
            placeholder={inputLanguage === 'ar' ? 'اختر المدينة' : 'Select City'}
            showAllOption={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Developer */}
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'المطور' : 'Developer'}</label>
          <SearchableSelect
            options={developerSelectOptions}
            value={formData.developer}
            onChange={v => {
              const selected = developerSelectOptions.find(o => String(o.value) === String(v))
              setFormData(prev => ({
                ...prev,
                developer: v,
                developerId: selected ? Number(selected.value) : null,
                developerName: selected ? selected.label : '',
              }))
            }}
            isRTL={inputLanguage === 'ar'}
            placeholder={inputLanguage === 'ar' ? 'اختر المطور' : 'Select Developer'}
          />
          {errors.developer && <p className="text-red-500 text-xs">{errors.developer}</p>}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'التصنيفات' : 'Categories'}</label>
          <SearchableSelect
            options={PROJECT_CATEGORIES}
            value={formData.categories}
            onChange={(arr) => setFormData({ ...formData, categories: arr })}
            isRTL={inputLanguage === 'ar'}
            multiple={true}
            placeholder={inputLanguage === 'ar' ? 'اختر التصنيفات' : 'Select Categories'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status */}
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'الحالة' : 'Status'}</label>
          <select
            className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value })}
          >
            {PROJECT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {/* Completion (%) */}
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'نسبة الإنجاز (%)' : 'Completion (%)'}</label>
          <input
            type="number"
            min={0}
            max={100}
            className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
            value={formData.completion}
            onChange={e => {
              const v = Math.max(0, Math.min(100, Number(e.target.value || 0)))
              setFormData({ ...formData, completion: v })
            }}
            placeholder={inputLanguage === 'ar' ? '0 إلى 100' : '0 to 100'}
          />
        </div>
        {/* Delivery Date */}
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'تاريخ التسليم' : 'Delivery Date'}</label>
          <input
            type="text"
            className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
            value={formData.deliveryDate}
            onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
            placeholder={inputLanguage === 'ar' ? 'مثل: 2026 أو يونيو 2026' : 'e.g. 2026 or June 2026'}
          />
        </div>
      </div>



      {/* Description */}
      <div className="space-y-2">
        <label className="label flex items-center gap-2">
          <FaAlignLeft className="text-gray-400" />
          {inputLanguage === 'ar' ? 'وصف المشروع' : 'Project Description'}
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
                  placeholder={'Write a comprehensive description...'}
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
                placeholder={'اكتب وصفاً شاملاً للمشروع...'}
                dir={'rtl'}
              />
            </div>
          </div>
        ) : (
          <textarea
            className="input dark:bg-gray-800 w-full min-h-[150px] font-sans border border-black dark:border-gray-700"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder={'Write a comprehensive description...'}
            dir={'ltr'}
          />
        )}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Price Range */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FaTag className="text-blue-500" />
          {inputLanguage === 'ar' ? 'نطاق السعر' : 'Price Range'}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label text-xs">{inputLanguage === 'ar' ? 'من' : 'From'}</label>
            <input
              type="number"
              className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 ${errors.minPrice ? 'border-red-500' : ''}`}
              value={formData.minPrice}
              onChange={e => setFormData({ ...formData, minPrice: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="label text-xs">{inputLanguage === 'ar' ? 'إلى' : 'To'}</label>
            <input
              type="number"
              className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              value={formData.maxPrice}
              onChange={e => setFormData({ ...formData, maxPrice: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Space Range */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FaRulerCombined className="text-blue-500" />
          {inputLanguage === 'ar' ? 'نطاق المساحة (متر مربع)' : 'Space Range (sqm)'}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label text-xs">{inputLanguage === 'ar' ? 'من' : 'From'}</label>
            <input
              type="number"
              className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              value={formData.minSpace}
              onChange={e => setFormData({ ...formData, minSpace: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="label text-xs">{inputLanguage === 'ar' ? 'إلى' : 'To'}</label>
            <input
              type="number"
              className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              value={formData.maxSpace}
              onChange={e => setFormData({ ...formData, maxSpace: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Project Metrics */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FaShieldAlt className="text-blue-500" />
          {inputLanguage === 'ar' ? 'مقاييس المشروع' : 'Project Metrics'}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="label text-xs">{inputLanguage === 'ar' ? 'الوحدات' : 'Units'}</label>
            <input
              type="number"
              className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              value={formData.units}
              onChange={e => setFormData({ ...formData, units: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="label text-xs">{inputLanguage === 'ar' ? 'المراحل' : 'Phases'}</label>
            <input
              type="number"
              className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              value={formData.phases}
              onChange={e => setFormData({ ...formData, phases: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="label text-xs">{inputLanguage === 'ar' ? 'المستندات' : 'Docs'}</label>
            <input
              type="number"
              className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              value={formData.docs}
              onChange={e => setFormData({ ...formData, docs: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">{inputLanguage === 'ar' ? 'مرافق المشروع' : 'Project Amenities'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {AMENITIES.map(item => (
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
              <span className="text-sm">{inputLanguage === 'ar' ? (AMENITY_LABELS[item]?.ar || item) : (AMENITY_LABELS[item]?.en || item)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo */}
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'شعار المشروع' : 'Project Logo'}</label>
          <FileUploader
            label={inputLanguage === 'ar' ? 'تحميل الشعار' : 'Upload Logo'}
            subLabel="PNG, JPG"
            files={formData.logo}
            onDrop={(files) => setFormData(prev => ({ ...prev, logo: files }))}
            accept="image/*"
            multiple={false}
          />
        </div>

        {/* Main Image */}
        <div className="space-y-2">
          <label className="label">{inputLanguage === 'ar' ? 'الصورة الرئيسية' : 'Main Image'}</label>
          <FileUploader
            label={inputLanguage === 'ar' ? 'تحميل الصورة' : 'Upload Cover'}
            subLabel="High Quality"
            files={formData.mainImage}
            onDrop={(files) => setFormData(prev => ({ ...prev, mainImage: files }))}
            accept="image/*"
            multiple={false}
          />
        </div>
      </div>

      {/* Gallery */}
      <div className="space-y-2">
        <label className="label">{inputLanguage === 'ar' ? 'معرض الصور' : 'Gallery'}</label>
        <FileUploader
          label={inputLanguage === 'ar' ? 'صور المشروع' : 'Project Photos'}
          subLabel={inputLanguage === 'ar' ? 'اسحب وأفلت الصور' : 'Drag & Drop Photos'}
          files={formData.gallery}
          onDrop={(files) => setFormData(prev => ({ ...prev, gallery: [...prev.gallery, ...files] }))}
          accept="image/*"
        />
      </div>

      {/* Master Plan */}
      <div className="space-y-2">
        <label className="label">{inputLanguage === 'ar' ? 'المخطط العام' : 'Master Plan'}</label>
        <FileUploader
          label={inputLanguage === 'ar' ? 'تحميل المخطط' : 'Upload Master Plan'}
          subLabel="Image or PDF"
          files={formData.masterPlan}
          onDrop={(files) => setFormData(prev => ({ ...prev, masterPlan: [...prev.masterPlan, ...files] }))}
          accept="image/*,.pdf"
        />
      </div>

      {/* Video URL */}
      <div className="space-y-2">
        <label className="label flex items-center gap-2">
          <FaLink className="text-gray-400" />
          {inputLanguage === 'ar' ? 'رابط الفيديو' : 'Video URL'}
        </label>
        <input
          className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
          value={formData.videoUrl}
          onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
          placeholder="YouTube / Vimeo link"
        />
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        {/* Address */}
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <FaMapMarkerAlt className="text-gray-400" />
            {inputLanguage === 'ar' ? 'العنوان' : 'Address'}
          </label>
          {inputLanguage === 'ar' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showEnglish && (
                <div>
                  <label className="text-xs text-[var(--muted-text)]">English</label>
                  <input
                    className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder={'Detailed address...'}
                    dir={'ltr'}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-[var(--muted-text)]">عربي</label>
                <input
                  className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
                  value={formData.addressAr}
                  onChange={e => setFormData({ ...formData, addressAr: e.target.value })}
                  placeholder={'العنوان بالتفصيل...'}
                  dir={'rtl'}
                />
              </div>
            </div>
          ) : (
            <input
              className="input dark:bg-gray-800 w-full border border-black dark:border-gray-700"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder={'Detailed address...'}
              dir={'ltr'}
            />
          )}
        </div>
      </div>

      {/* Map */}
      <div className="space-y-2">
        <label className="label">{inputLanguage === 'ar' ? 'تحديد الموقع على الخريطة' : 'Pin Location on Map'}</label>
        <div className="h-[300px] rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 relative z-0">
          <MapContainer center={formData.location || [30.0444, 31.2357]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapPicker
              location={formData.location}
              setLocation={(loc) => setFormData(prev => ({ ...prev, location: loc }))}
              setLocationUrl={(url) => setFormData(prev => ({ ...prev, locationUrl: url }))}
              onAddressUpdate={(newAddr) => {
                setFormData(prev => ({
                  ...prev,
                  address: newAddr,
                  addressAr: newAddr // Temporarily use same for both, or logic to split
                }))
              }}
              address={formData.address || formData.addressAr}
            />
          </MapContainer>
        </div>
        {formData.locationUrl && (
          <div className="text-xs text-blue-500 mt-1 truncate">{formData.locationUrl}</div>
        )}
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Payment Plans */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <FaHandHoldingUsd className="text-blue-500" />
            {inputLanguage === 'ar' ? 'خطط الدفع' : 'Payment Plans'}
          </h3>
          <button onClick={addPaymentPlan} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
            <FaPlus size={10} /> {inputLanguage === 'ar' ? 'إضافة خطة' : 'Add Plan'}
          </button>
        </div>

        {formData.paymentPlans.map((plan, idx) => (
          <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative group">
            <button onClick={() => removePaymentPlan(idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <FaTrash size={12} />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-text)]">{inputLanguage === 'ar' ? 'المقدم (%)' : 'Down Payment (%)'}</label>
                <input
                  type="number"
                  className="input py-1 px-2 text-sm w-full border border-black dark:border-gray-700"
                  value={plan.downPayment}
                  onChange={e => updatePaymentPlan(idx, 'downPayment', e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-text)]">{inputLanguage === 'ar' ? 'عدد السنوات' : 'Years'}</label>
                <input
                  type="number"
                  className="input py-1 px-2 text-sm w-full border border-black dark:border-gray-700"
                  value={plan.years}
                  onChange={e => updatePaymentPlan(idx, 'years', e.target.value)}
                  placeholder="8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-text)]">{inputLanguage === 'ar' ? 'الاستلام' : 'Delivery'}</label>
                <input
                  type="text"
                  className="input py-1 px-2 text-sm w-full border border-black dark:border-gray-700"
                  value={plan.deliveryDate}
                  onChange={e => updatePaymentPlan(idx, 'deliveryDate', e.target.value)}
                  placeholder="2027"
                />
              </div>
            </div>
          </div>
        ))}
        {formData.paymentPlans.length === 0 && (
          <p className="text-sm text-[var(--muted-text)] text-center py-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            {inputLanguage === 'ar' ? 'لا توجد خطط دفع مضافة' : 'No payment plans added'}
          </p>
        )}
      </div>
    </div>
  )

  const renderStepCIL = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl mb-4">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
          <FaAddressCard />
          {inputLanguage === 'ar' ? 'خطاب معلومات العميل (CIL)' : 'Customer information leter(CIL)'}
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
                    className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 ${errors.cilTo ? 'border-red-500' : ''}`}
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
                  className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 ${errors.cilTo ? 'border-red-500' : ''}`}
                  value={formData.cilToAr}
                  onChange={e => setFormData({ ...formData, cilToAr: e.target.value })}
                  placeholder={'اسم المستقبل'}
                  dir={'rtl'}
                />
              </div>
            </div>
          ) : (
            <input
              className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 ${errors.cilTo ? 'border-red-500' : ''}`}
              value={formData.cilTo}
              onChange={e => setFormData({ ...formData, cilTo: e.target.value })}
              placeholder={'Recipient Name'}
              dir={'ltr'}
            />
          )}
          {errors.cilTo && <p className="text-red-500 text-xs">{errors.cilTo}</p>}
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
                    className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 ${errors.cilSubject ? 'border-red-500' : ''}`}
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
                  className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 ${errors.cilSubject ? 'border-red-500' : ''}`}
                  value={formData.cilSubjectAr}
                  onChange={e => setFormData({ ...formData, cilSubjectAr: e.target.value })}
                  placeholder={'موضوع الخطاب'}
                  dir={'rtl'}
                />
              </div>
            </div>
          ) : (
            <input
              className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 ${errors.cilSubject ? 'border-red-500' : ''}`}
              value={formData.cilSubject}
              onChange={e => setFormData({ ...formData, cilSubject: e.target.value })}
              placeholder={'Letter Subject'}
              dir={'ltr'}
            />
          )}
          {errors.cilSubject && <p className="text-red-500 text-xs">{errors.cilSubject}</p>}
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
          />
        </div>
      </div>
    </div>
  )

  const renderStep7 = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Contact Info Preview */}
      <div className="dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FaBullhorn className="text-blue-500" />
          {inputLanguage === 'ar' ? 'معلومات التواصل' : 'Contact Information'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
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
          <div className="space-y-1">
            <span className="text-[var(--muted-text)] block text-xs uppercase tracking-wider flex items-center gap-1">
              <FaTag className="text-gray-400" />
              {inputLanguage === 'ar' ? 'باقة التسويق' : 'Marketing Package'}
            </span>
            <div>
              <select
                className={`input dark:bg-gray-800 w-full border border-black dark:border-gray-700 `}
                value={formData.marketingPackage}
                onChange={e => setFormData({ ...formData, marketingPackage: e.target.value })}
              >
                <option value="standard">{inputLanguage === 'ar' ? 'قياسي' : 'Standard'}</option>
                <option value="featured">{inputLanguage === 'ar' ? 'مميز' : 'Featured'}</option>
                <option value="premium">{inputLanguage === 'ar' ? 'فاخر' : 'Premium'}</option>
              </select>
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
    setActionMessage(inputLanguage === 'ar' ? 'تم تجهيز النشر وسيتم التوزيع في الخلفية.' : 'Publish queued; background syndication will start shortly.')
    if (onSave) onSave({ ...formData, publishStatus: 'Published' })
  }

  const handleSaveDraft = () => {
    setActionMessage(inputLanguage === 'ar' ? 'تم الحفظ كمسودة دون نشر.' : 'Saved as draft without publishing.')
    if (onSave) onSave({ ...formData, publishStatus: 'Draft' })
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
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Shell */}
      <div
        className="relative z-[210] bg-white dark:!bg-slate-950 rounded-2xl w-[900px] max-w-full h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
        style={{ background: 'var(--panel-bg)' }}
        dir={inputLanguage === 'ar' ? 'rtl' : 'ltr'}
      >

        {/* Header & Progress Bar */}
        <div className="bg-blue-50 dark:!bg-slate-900 border-b border-gray-200 dark:!border-slate-700 pt-1 px-2 pb-5 md:pt-2 md:px-3 md:pb-6"
          style={{ background: 'var(--panel-bg)' }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent px-4">
              {mode === 'edit'
                ? (inputLanguage === 'ar' ? 'تعديل المشروع' : 'Edit Project')
                : (inputLanguage === 'ar' ? 'إضافة مشروع جديد' : 'Add Project')
              }
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
          <div className="flex items-center justify-between relative px-2 md:px-8">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 dark:bg-gray-700 -translate-y-1/2 rounded-full" />
            <div
              className="absolute top-1/2 h-0.5 bg-blue-500 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
              style={{
                [inputLanguage === 'ar' ? 'right' : 'left']: 0,
                width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% + 14px)`,
                maxWidth: '100%',
              }}
            />

            {STEPS.map((step) => {
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep
              return (
                <div key={step.id} className="flex flex-col items-center gap-1 relative group cursor-pointer" onClick={() => setCurrentStep(step.id)}>
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
        <div id="wizard-content" className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStepCIL()}
          {currentStep === 7 && renderStep7()}
        </div>

        {/* Footer Actions */}
        <div
          className="p-2 dark:bg-slate-900/70 backdrop-blur-md border-t border-blue-200 dark:border-slate-800 flex items-center justify-between"
          dir={inputLanguage === 'ar' ? 'rtl' : 'ltr'}
        >
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="btn btn-sm bg-gray-500 hover:bg-gray-600 text-white border-none px-3 py-1 text-xs flex items-center gap-2"
            >
              {inputLanguage === 'ar' ? 'السابق' : 'Previous'}
            </button>
          )}

          <div className="text-xs text-[var(--muted-text)] font-medium">
            {inputLanguage === 'ar' ? `خطوة ${currentStep} من ${STEPS.length}` : `Step ${currentStep} of ${STEPS.length}`}
          </div>

          {currentStep < STEPS.length ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none font-medium flex items-center gap-2"
            >
              {inputLanguage === 'ar' ? 'التالي' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none font-medium flex items-center gap-2"
            >
              <FaCheck /> {inputLanguage === 'ar' ? 'حفظ' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
