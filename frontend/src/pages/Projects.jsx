
import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../shared/context/ThemeProvider'
import * as XLSX from 'xlsx'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Font Awesome icons
import {
  FaFileImport,
  FaPlus,
  FaFileExport,
  FaChevronDown,
  FaFilter,
  FaSearch,
  FaBuilding,
  FaCity,
  FaTags,
  FaMapMarkerAlt,
  FaUser,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaDownload,
  FaFileExcel,
  FaFilePdf,
  FaEye,
  FaEdit,
  FaTrash,
  FaShareAlt,
  FaImage,
  FaVideo,
  FaCloudDownloadAlt,
  FaPaperclip,
  FaCheck,
  FaList,
  FaImages,
  FaFileContract,
  FaAddressCard,
  FaExternalLinkAlt,
  FaUpload
} from 'react-icons/fa'

// Lucide icons
import { Bar } from 'react-chartjs-2'
import {
  MapPin,
  Building2,
  Home,
  FileText,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react'

const DEFAULT_PROJECT_IMAGE = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop'

function pickImage(seed) {
  return DEFAULT_PROJECT_IMAGE
}

const getApiOrigin = () => {
  const apiUrl = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'https://api.besouholacrm.net/api'
  const clean = String(apiUrl).replace(/\/+$/, '')
  return clean.endsWith('/api') ? clean.slice(0, -4) : clean
}
import { useCompanySetup } from './settings/company-setup/store/CompanySetupContext.jsx'
import { api, logExportEvent } from '../utils/api'
import { useAppState } from '../shared/context/AppStateProvider'
import SearchableSelect from '../components/SearchableSelect'
import CreateProjectModal from '../components/CreateProjectModal'
import CreatePropertyModal from '../components/CreatePropertyModal'

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

export default function Projects() {
  const { i18n } = useTranslation()
  const isRTL = String(i18n.language || '').startsWith('ar')
  const { companySetup } = useCompanySetup()
  const { user, refreshInventoryBadges } = useAppState()
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

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const hasExplicitInventoryPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Inventory')
  const inventoryModulePerms = hasExplicitInventoryPerms && Array.isArray(modulePermissions.Inventory) ? modulePermissions.Inventory : []
  const effectiveInventoryPerms = hasExplicitInventoryPerms ? inventoryModulePerms : (() => {
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
  const canManageProjects =
    effectiveInventoryPerms.includes('addProject') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  useEffect(() => {
    try { document.documentElement.dir = isRTL ? 'rtl' : 'ltr' } catch { }
  }, [isRTL])

  const [showAllFilters, setShowAllFilters] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [editProject, setEditProject] = useState(null)
  const [toasts, setToasts] = useState([])
  const [_importLogs, setImportLogs] = useState([])
  const [showCreateUnitModal, setShowCreateUnitModal] = useState(false)
  const [unitProject, setUnitProject] = useState(null)

  const [filters, setFilters] = useState({
    search: '',
    project: '',
    developer: '',
    city: '',
    status: '',
    country: '',
    category: '',
    paymentPlan: '',
    createdBy: '',
    createdDate: '',
    minPrice: '',
    maxPrice: '',
    minSpace: '',
    maxSpace: ''
  })

  const exportProjectsCsv = () => {
    const headers = ['Project', 'Developer', 'City', 'Status', 'Units', 'Min Price', 'Max Price']
    const csvContent = [
      headers.join(','),
      ...projects.map(p => [
        `"${p.name}"`,
        `"${p.developer}"`,
        `"${p.city}"`,
        `"${p.status}"`,
        p.units,
        p.minPrice,
        p.maxPrice
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'projects.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  const exportProjectsPdf = async (items) => {
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = await import('jspdf-autotable')
      const doc = new jsPDF()

      const tableColumn = ["Project", "Developer", "City", "Status", "Units", "Min Price", "Max Price"]
      const tableRows = []

      items.forEach(item => {
        const projectData = [
          item.name,
          item.developer,
          item.city,
          item.status,
          item.units,
          new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(item.minPrice || 0),
          new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(item.maxPrice || 0)
        ]
        tableRows.push(projectData)
      })

      doc.text("Projects List", 14, 15)
      autoTable.default(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      })
      doc.save("projects_list.pdf")
    } catch (error) {
      console.error("Export PDF Error:", error)
    }
  }


  const [projects, setProjects] = useState([])
  const [dbCities, setDbCities] = useState([])
  const [dbCountries, setDbCountries] = useState([])
  const [dbUsers, setDbUsers] = useState([])
  const [developerOptions, setDeveloperOptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const markSeen = async () => {
      try {
        await api.post('/api/inventory/mark-seen', { page: 'projects' })
        await refreshInventoryBadges()
      } catch {}
    }
    markSeen()
  }, [refreshInventoryBadges])

  const mapProject = (p) => {
    const getStorageUrl = (path) => {
      if (!path) return null
      const pathStr = String(path)
      if (pathStr.startsWith('http') || pathStr.startsWith('data:') || pathStr.startsWith('blob:')) return pathStr
      
      const baseUrl = getApiOrigin()
      
      // If path starts with /storage/ or storage/, strip it to get the relative path for api/public-files
      let cleanPath = pathStr
      if (cleanPath.startsWith('/storage/')) cleanPath = cleanPath.substring(9)
      else if (cleanPath.startsWith('storage/')) cleanPath = cleanPath.substring(8)
      else if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1)
      
      return `${baseUrl}/api/public-files/${cleanPath}`
    }

    return {
      ...p,
      nameAr: p.name_ar || '',
      descriptionAr: p.description_ar || '',
      addressAr: p.address_ar || '',
      currency: p.currency || 'EGP',
      amenities: p.amenities || [],
      publish: p.publish_data || null,
      minPrice: Number(p.min_price) || 0,
      maxPrice: Number(p.max_price) || 0,
      minSpace: Number(p.min_space) || 0,
      maxSpace: Number(p.max_space) || 0,
      units: Number(p.units) || 0,
      phases: Number(p.phases) || 0,
      docs: Number(p.docs) || 0,
      completion: Number(p.completion) || 0,
      image: getStorageUrl(p.image),
      logo: getStorageUrl(p.logo),
      galleryImages: (Array.isArray(p.gallery_images) ? p.gallery_images : []).map(getStorageUrl),
      masterPlanImages: (Array.isArray(p.master_plan_images) ? p.master_plan_images : []).map(getStorageUrl),
      paymentPlan: p.payment_plan || [],
      paymentPlans: p.payment_plan || [],
      videoUrls: p.video_urls || '',
      location: (p.lat && p.lng) ? { lat: Number(p.lat), lng: Number(p.lng) } : null,
      lat: p.lat,
      lng: p.lng,
      locationUrl: p.location_url || '',
      mapUrl: (p.lat && p.lng) ? `https://maps.google.com/maps?q=${p.lat},${p.lng}&z=15&output=embed` : '',
      deliveryDate: p.delivery_date || '',
      createdBy: p.created_by,
      createdDate: p.created_at?.split('T')[0],
      lastUpdated: p.updated_at?.split('T')[0],
      cilTo: p.cil?.to || '',
      cilToAr: p.cil?.to_ar || '',
      cilSubject: p.cil?.subject || '',
      cilSubjectAr: p.cil?.subject_ar || '',
      cilContent: p.cil?.content || '',
      cilContentAr: p.cil?.content_ar || '',
      cilSignature: p.cil?.signature || '',
      cilSignatureAr: p.cil?.signature_ar || '',
      cilAttachments: (Array.isArray(p.cil?.attachments) ? p.cil.attachments : []).map(getStorageUrl),
      contactName: p.publish_data?.contactName || '',
      contactEmail: p.publish_data?.contactEmail || '',
      contactPhone: p.publish_data?.contactPhone || '',
      marketingPackage: p.publish_data?.marketingPackage || 'standard',
      categories: p.category ? p.category.split(', ').filter(Boolean) : [],
      developerId: p.developer_id ?? p.developerId ?? null,
    }
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const [
        { data: projectsData },
        { data: citiesData },
        { data: countriesData },
        { data: usersData },
        { data: developersData },
      ] = await Promise.all([
        api.get('/api/projects'),
        api.get('/api/cities'),
        api.get('/api/countries'),
        api.get('/api/users'),
        api.get('/api/developers'),
      ])
      const mapped = (projectsData.data || []).map(p => mapProject(p))
      setProjects(mapped)
      setDbCities(citiesData || [])
      setDbCountries(countriesData?.data || countriesData || [])
      setDbUsers(usersData || [])
      const devs = developersData?.data || developersData || []
      setDeveloperOptions(
        devs
          .map(d => ({
            value: String(d.id),
            label: d.name || '',
          }))
          .sort((a, b) => (a.label || '').localeCompare(b.label || ''))
      )
    } catch (err) {
      console.error('Failed to fetch projects', err)
      addToast('error', isRTL ? 'فشل تحميل المشاريع' : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleSaveProject = async (form) => {
    const toNum = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

    const selectedDev = developerOptions.find(o => String(o.value) === String(form.developer))
    const developerId = form.developerId ?? (selectedDev ? Number(selectedDev.value) : null)
    const developerName = form.developerName ?? (selectedDev ? selectedDev.label : (form.developer || null))

    const payload = {
      name: form.name || form.nameEn || '',
      developer: developerName || null,
      city: form.city || null,
      country: form.country || null,
      category: (Array.isArray(form.categories) && form.categories.length > 0) ? form.categories.join(', ') : (form.category || null),
      status: form.status || 'Active',
      min_price: toNum(form.minPrice),
      max_price: toNum(form.maxPrice),
      min_space: toNum(form.minSpace),
      max_space: toNum(form.maxSpace),
      units: toNum(form.units) ?? 0,
      phases: toNum(form.phases) ?? 0,
      docs: toNum(form.docs) ?? 0,
      completion: toNum(form.completion) ?? 0,
      lat: form.location?.lat || form.lat || null,
      lng: form.location?.lng || form.lng || null,
      address: form.address || form.address_en || null,
      address_ar: form.addressAr || form.address_ar || null,
      description: form.description || form.description_en || null,
      description_ar: form.descriptionAr || form.description_ar || null,
      name_ar: form.nameAr || form.name_ar || null,
      delivery_date: form.deliveryDate || null,
      currency: form.currency || null,
      amenities: form.amenities || [],
      publish_data: {
        contactName: form.contactName || '',
        contactEmail: form.contactEmail || '',
        contactPhone: form.contactPhone || '',
        marketingPackage: form.marketingPackage || '',
        channels: form.channels || []
      },
      video_urls: form.videoUrl || form.video_urls || null,
      gallery_images: (form.gallery || form.galleryImages || []).filter(f => typeof f === 'string'),
      master_plan_images: (form.masterPlan || form.masterPlanImages || []).filter(f => typeof f === 'string'),
      payment_plan: form.paymentPlans || form.payment_plan || [],
      developer_id: developerId || null,
      cil: (form.cilTo || form.cilSubject || form.cilContent || form.cilSignature || (form.cilAttachments || []).length)
        ? {
          to: form.cilTo || '',
          to_ar: form.cilToAr || '',
          subject: form.cilSubject || '',
          subject_ar: form.cilSubjectAr || '',
          content: form.cilContent || '',
          content_ar: form.cilContentAr || '',
          signature: form.cilSignature || '',
          signature_ar: form.cilSignatureAr || '',
          attachments: (form.cilAttachments || []).filter(f => typeof f === 'string')
        }
        : (form.cil || null)
    }

    const buildFormData = () => {
      const formDataObj = new FormData()

      // JSON fields (must be serialized)
      const jsonFields = ['publish_data', 'payment_plan', 'cil', 'amenities', 'gallery_images', 'master_plan_images']

      Object.keys(payload).forEach(key => {
        const val = payload[key]
        if (jsonFields.includes(key)) {
          formDataObj.append(key, JSON.stringify(val))
        } else if (val !== null && val !== undefined && val !== '') {
          formDataObj.append(key, val)
        }
      })

      // Handle image: File takes priority, else keep existing URL
      if (form.mainImage?.[0] instanceof File) {
        formDataObj.append('image', form.mainImage[0])
      } else if (form.mainImage?.[0] && typeof form.mainImage[0] === 'string') {
        formDataObj.append('image', form.mainImage[0])
      } else if (form.image && typeof form.image === 'string') {
        formDataObj.append('image', form.image)
      }

      // Handle logo: File takes priority, else keep existing URL
      if (form.logo?.[0] instanceof File) {
        formDataObj.append('logo', form.logo[0])
      } else if (form.logo?.[0] && typeof form.logo[0] === 'string') {
        formDataObj.append('logo', form.logo[0])
      }

      // Gallery files
      if (Array.isArray(form.gallery)) {
        form.gallery.forEach(f => {
          if (f instanceof File) formDataObj.append('gallery_files[]', f)
        })
      }
      // Master plan files
      if (Array.isArray(form.masterPlan)) {
        form.masterPlan.forEach(f => {
          if (f instanceof File) formDataObj.append('master_plan_files[]', f)
        })
      }
      // CIL attachments
      if (Array.isArray(form.cilAttachments)) {
        form.cilAttachments.forEach(f => {
          if (f instanceof File) formDataObj.append('cil_attachments_files[]', f)
        })
      }

      return formDataObj
    }

    try {
      if (editProject) {
        const formData = buildFormData()
        formData.append('_method', 'PUT') // Laravel multipart PUT workaround
        const { data } = await api.post(`/api/projects/${editProject.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        const updated = mapProject(data.data || data)
        setProjects(prev => prev.map(p => p.id === editProject.id ? updated : p))
        setShowCreateModal(false) // Close modal immediately
        setEditProject(null)
        addToast('success', isRTL ? 'تم تحديث المشروع' : 'Project updated')
      } else {
        const formData = buildFormData()
        const { data } = await api.post('/api/projects', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        const newProject = mapProject(data.data || data)
        setProjects(prev => [newProject, ...prev])
        setShowCreateModal(false) // Close modal immediately
        addToast('success', isRTL ? 'تم إضافة المشروع' : 'Project added')
      }
    } catch (err) {
      console.error('Failed to save project', err?.response?.data || err)
      const msg = err?.response?.data?.message || err?.response?.data?.errors
        ? JSON.stringify(err?.response?.data?.errors)
        : (isRTL ? 'فشل حفظ المشروع' : 'Failed to save project')
      addToast('error', msg)
    }
  }

  const handleDeleteProject = async (proj) => {
    if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا المشروع؟' : 'Are you sure you want to delete this project?')) {
      try {
        await api.delete(`/api/projects/${proj.id}`)
        setProjects(prev => prev.filter(p => p.id !== proj.id))
        addToast('success', isRTL ? 'تم حذف المشروع' : 'Project deleted')
      } catch (err) {
        console.error('Failed to delete project', err)
        addToast('error', isRTL ? 'فشل حذف المشروع' : 'Failed to delete project')
      }
    }
  }

  const handleAddUnit = (project) => {
    setUnitProject(project)
    setShowCreateUnitModal(true)
  }

  const shareProjectLanding = async (p) => {
    try {
      const companyInfo = (companySetup && companySetup.companyInfo) || {}

      const galleryImages = Array.isArray(p.galleryImages) ? p.galleryImages.filter(Boolean) : []
      const masterPlanImages = Array.isArray(p.masterPlanImages) ? p.masterPlanImages.filter(Boolean) : []
      const isPdfUrl = (u) => typeof u === 'string' && u.toLowerCase().includes('.pdf')
      const safeMedia = [...galleryImages, ...masterPlanImages].filter(u => !isPdfUrl(u))

      const payload = {
        theme: 'theme1',
        title: p.name || '',
        description: isRTL ? (p.descriptionAr || p.description || '') : (p.description || p.descriptionAr || ''),
        email: companyInfo.email || '',
        phone: companyInfo.phone || '',
        logo: companyInfo.logoUrl || p.logo || '',
        cover: p.image || galleryImages[0] || '',
        media: safeMedia,
        facebook: companyInfo.facebook || '',
        instagram: companyInfo.instagram || '',
        twitter: companyInfo.twitter || '',
        linkedin: companyInfo.linkedin || '',
        url: companyInfo.websiteUrl || '',
        project: {
          id: p.id,
          name: p.name,
          nameAr: p.nameAr,
          developer: p.developer,
          city: p.city,
          country: p.country,
          address: p.address,
          addressAr: p.addressAr,
          category: p.category,
          categories: Array.isArray(p.categories) ? p.categories : [],
          status: p.status,
          completion: p.completion,
          deliveryDate: p.deliveryDate,
          currency: p.currency,
          minPrice: p.minPrice,
          maxPrice: p.maxPrice,
          minSpace: p.minSpace,
          maxSpace: p.maxSpace,
          units: p.units,
          phases: p.phases,
          docs: p.docs,
          amenities: Array.isArray(p.amenities) ? p.amenities : [],
          logo: p.logo,
          image: p.image,
          galleryImages,
          masterPlanImages,
          videoUrls: p.videoUrls || '',
          mapUrl: p.mapUrl || '',
          locationUrl: p.locationUrl || '',
          lat: p.lat,
          lng: p.lng,
          paymentPlan: Array.isArray(p.paymentPlan) ? p.paymentPlan : [],
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
        await navigator.share({ title: payload.title || 'Project', text: isRTL ? 'عرض تفاصيل المشروع' : 'View project details', url })
      } else {
        navigator.clipboard && navigator.clipboard.writeText(url)
        addToast('success', isRTL ? 'تم نسخ رابط المشاركة' : 'Share link copied')
      }
    } catch (e) {
      console.error('Share project error:', e)
      addToast('error', isRTL ? 'فشل إنشاء رابط المشاركة' : 'Failed to generate share link')
    }
  }

  const exportProjectPdf = async (p) => {
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = await import('jspdf-autotable')
      const doc = new jsPDF()
      
      const isRTL = String(i18n.language || '').startsWith('ar')
      
      // Add Logo if exists
      if (p.logo) {
        try {
          // Convert logo to base64 if needed, for now just use text as placeholder
          // doc.addImage(p.logo, 'PNG', 10, 10, 30, 30);
        } catch (e) { console.error('Logo add error', e) }
      }

      doc.setFontSize(22)
      doc.setTextColor(30, 58, 138) // blue-900
      doc.text(p.name || 'Project Details', 14, 25)
      
      doc.setFontSize(12)
      doc.setTextColor(107, 114, 128) // gray-500
      doc.text(`${p.developer || '-'} | ${p.city || '-'}`, 14, 35)

      const details = [
        [isRTL ? 'الحالة' : 'Status', p.status || '-'],
        [isRTL ? 'التصنيف' : 'Category', p.category || '-'],
        [isRTL ? 'الوحدات' : 'Units', String(p.units || 0)],
        [isRTL ? 'المساحة' : 'Space', `${p.minSpace || 0} - ${p.maxSpace || 0} m²`],
        [isRTL ? 'نطاق السعر' : 'Price Range', `${new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP' }).format(p.minPrice || 0)} - ${new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP' }).format(p.maxPrice || 0)}`],
        [isRTL ? 'تاريخ الاستلام' : 'Delivery Date', p.deliveryDate || '-'],
        [isRTL ? 'نسبة الإنجاز' : 'Completion', `${p.completion || 0}%`]
      ]

      autoTable.default(doc, {
        startY: 45,
        head: [[isRTL ? 'المعلومات الأساسية' : 'Basic Information', '']],
        body: details,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }, // blue-600
        styles: { font: 'helvetica', halign: isRTL ? 'right' : 'left' }
      })

      if (p.description || p.descriptionAr) {
        const finalY = doc.lastAutoTable.result.finalY + 10
        doc.setFontSize(14)
        doc.setTextColor(30, 58, 138)
        doc.text(isRTL ? 'وصف المشروع' : 'Description', 14, finalY)
        doc.setFontSize(10)
        doc.setTextColor(55, 65, 81) // gray-700
        const splitDesc = doc.splitTextToSize(isRTL ? (p.descriptionAr || p.description) : p.description, 180)
        doc.text(splitDesc, 14, finalY + 7)
      }

      // Add QR Code or link to project
      const finalY2 = (doc.lastAutoTable.result.finalY || 100) + 40
      doc.setFontSize(8)
      doc.setTextColor(156, 163, 175) // gray-400
      doc.text(isRTL ? 'تم إنشاؤه بواسطة نظام بي سهولة' : 'Generated by Be Souhola CRM', 14, 285)

      doc.save(`${p.name || 'project'}_details.pdf`)
      addToast('success', isRTL ? 'تم إنشاء ملف PDF بنجاح' : 'PDF generated successfully')
    } catch (error) {
      console.error("Export PDF Error:", error)
      addToast('error', isRTL ? 'فشل إنشاء ملف PDF' : 'Failed to generate PDF')
    }
  }

  const handleSaveUnit = (newUnit) => {
    setShowCreateUnitModal(false)
    setUnitProject(null)
    setToasts([...toasts, { id: Date.now(), message: isRTL ? 'تمت إضافة الوحدة بنجاح' : 'Unit added successfully', type: 'success' }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== Date.now())), 3000)
  }

  // Derive allCities from DB instead of strictly from projects
  const allCities = useMemo(() => {
    return Array.from(new Set(dbCities.map(c => isRTL ? (c.name_ar || c.name_en) : c.name_en))).sort()
  }, [dbCities, isRTL])

  // Get unique cities from actual projects for summary filter
  const projectCities = useMemo(() => {
    return Array.from(new Set(projects.map(p => p.city).filter(Boolean))).sort()
  }, [projects])

  const allCountries = useMemo(() => Array.from(new Set(projects.map(p => p.country || 'Egypt'))).sort(), [projects])
  const allProjects = useMemo(() => Array.from(new Set(projects.map(p => p.name))).sort(), [projects])
  const allCategories = ['Residential', 'Commercial', 'Administrative', 'Medical', 'Coastal', 'Mixed Use']
  // const allPaymentPlans = useMemo(() => Array.from(new Set(projects.map(p => p.paymentPlan).filter(Boolean))).sort(), [projects])
  const allPaymentPlans = [] // Disabled as paymentPlan is now an array of objects
  const allUsers = useMemo(() => {
    return dbUsers.map(u => ({ label: u.name, value: u.id })).sort((a, b) => (a.label || '').localeCompare(b.label || ''))
  }, [dbUsers])
  const priceLimits = useMemo(() => {
    const prices = projects.flatMap(p => [p.minPrice, p.maxPrice].filter(x => x != null))
    return { min: Math.min(...prices, 0), max: Math.max(...prices, 10000000) }
  }, [projects])
  const spaceLimits = useMemo(() => {
    const spaces = projects.flatMap(p => [p.minSpace, p.maxSpace].filter(x => x != null))
    return { min: Math.min(...spaces, 0), max: Math.max(...spaces, 1000) }
  }, [projects])
  const allStatuses = ['Planning', 'Active', 'Sales', 'Completed']

  const filtered = useMemo(() => {
    const selectedDeveloper = developerOptions.find(o => String(o.value) === String(filters.developer))
    const selectedDeveloperId = selectedDeveloper ? String(selectedDeveloper.value) : null
    const selectedDeveloperName = selectedDeveloper ? selectedDeveloper.label : null

    return projects.filter(p => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!(p.name || '').toLowerCase().includes(q) &&
          !(p.developer || '').toLowerCase().includes(q) &&
          !(p.city || '').toLowerCase().includes(q)) return false
      }
      if (filters.project && p.name !== filters.project) return false
      if (filters.developer && (selectedDeveloperId || selectedDeveloperName)) {
        const projectDevId = p.developerId ?? p.developer_id ?? null
        const projectDevIdStr = projectDevId != null ? String(projectDevId) : null
        const projectDevName = p.developer || null
        if (projectDevIdStr !== selectedDeveloperId && projectDevName !== selectedDeveloperName) return false
      }
      if (filters.city && filters.city !== 'All' && p.city !== filters.city) return false
      if (filters.status && filters.status !== 'All' && p.status !== filters.status) return false
      if (filters.country && !(p.country || 'Egypt').toLowerCase().includes(filters.country.toLowerCase())) return false
      if (filters.category && !(p.category || '').toLowerCase().includes(filters.category.toLowerCase())) return false
      if (filters.createdBy && Number(p.createdBy) !== Number(filters.createdBy)) return false
      if (filters.createdDate && (p.createdDate || p.lastUpdated) !== filters.createdDate) return false
      if (filters.minPrice && (p.maxPrice || 0) < Number(filters.minPrice)) return false
      if (filters.maxPrice && (p.minPrice || 0) > Number(filters.maxPrice)) return false
      if (filters.minSpace && (p.maxSpace || 0) < Number(filters.minSpace)) return false
      if (filters.maxSpace && (p.minSpace || 0) > Number(filters.maxSpace)) return false

      return true
    })
  }, [projects, filters, developerOptions])

  // Pagination state and derived values
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered, pageSize])
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize), [filtered, page, pageSize])
  useEffect(() => { setPage(1) }, [filters, pageSize])
  const shownFrom = useMemo(() => (filtered.length === 0 ? 0 : (page - 1) * pageSize + 1), [page, pageSize, filtered.length])
  const shownTo = useMemo(() => Math.min(page * pageSize, filtered.length), [page, pageSize, filtered.length])
  const goPrevPage = () => setPage(p => Math.max(1, p - 1))
  const goNextPage = () => setPage(p => Math.min(totalPages, p + 1))

  const seededProjects = []

  /* 
  useEffect(() => {
    setProjects(seededProjects)
  }, [])
  */

  const addToast = (type, message) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      project: '',
      developer: '',
      city: '',
      status: '',
      country: '',
      category: '',
      paymentPlan: '',
      createdBy: '',
      createdDate: '',
      minPrice: '',
      maxPrice: '',
      minSpace: '',
      maxSpace: ''
    })
  }

  const Label = {
    title: isRTL ? 'المشاريع' : 'Projects',
    search: isRTL ? 'بحث' : 'Search',
    filter: isRTL ? 'تصفية' : 'Filter',
    importProjects: isRTL ? 'استيراد' : 'Import',
    createProject: isRTL ? 'إنشاء مشروع' : 'Add project',
    location: isRTL ? 'الموقع' : 'Location',
    units: isRTL ? 'وحدات' : 'Units',
    share: isRTL ? 'مشاركة' : 'Share',
    more: isRTL ? 'المزيد' : 'More',
    developer: isRTL ? 'المطور' : 'Developer',
    status: isRTL ? 'الحالة' : 'Status',
    city: isRTL ? 'المدينة' : 'City',
    phases: isRTL ? 'المراحل' : 'Phases',
    clearFilters: isRTL ? 'اعادة تعيين' : 'reset',
    exportPdf: isRTL ? 'تصدير PDF' : 'Export PDF',
    createdBy: isRTL ? 'بواسطة' : 'Created By',
    createdDate: isRTL ? 'تاريخ الإنشاء' : 'Created Date',
    category: isRTL ? 'التصنيف' : 'Category',
    country: isRTL ? 'الدولة' : 'Country',
    priceRange: isRTL ? 'نطاق السعر' : 'Price Range',
    spaceRange: isRTL ? 'نطاق المساحة' : 'Space Range'
  }

  return (
    <div className="pspace-y-6 pt-4 px-4 sm:px-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-4 md:p-6 relative z-30">

        <div className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3">
            <div className="relative flex flex-wrap items-start gap-1">
              <h1 className="page-title text-xl md:text-2xl font-bold text-start">{Label.title}</h1>
              <span
                aria-hidden="true"
                className="inline-block h-[2px] w-full rounded
               bg-gradient-to-r from-blue-500 to-purple-600"
              />
            </div>

          </div>

          <div className="w-full lg:w-auto flex flex-wrap lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
            <button className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2" onClick={() => setShowImportModal(true)}>
              <FaFileImport className='text-white'/> <span className="text-white">{Label.importProjects}</span>
            </button>

            {canManageProjects && (
              <button className="btn btn-sm w-full lg:w-auto bg-green-600 hover:bg-green-500 text-white border-none flex items-center justify-center gap-2" onClick={() => setShowCreateModal(true)}>
                <FaPlus className='text-white'/>  <span className="text-white">{Label.createProject}</span>
              </button>
            )}

            <div className="relative w-full lg:w-auto">
              <button
                className="btn btn-sm w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <FaFileExport className='text-white'/> <span className="text-white">{isRTL ? 'تصدير' : 'Export'}</span>
                <FaChevronDown className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} size={10} />
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 w-full sm:w-32 overflow-hidden ltr:right-0 rtl:left-0">
                    <button
                      className="w-full text-black text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      onClick={() => {
                        exportProjectsCsv()
                        setShowExportMenu(false)
                      }}
                    >
                      CSV
                    </button>
                    <button
                      className="w-full text-black text-start px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      onClick={() => {
                        exportProjectsPdf(filtered)
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

            {/* 3. City */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaCity className="text-blue-500" size={10} /> {Label.city}</label>
              <SearchableSelect
                options={allCities}
                value={filters.city}
                onChange={val => setFilters({ ...filters, city: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 4. Status */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaTags className="text-blue-500" size={10} /> {Label.status}</label>
              <SearchableSelect
                options={allStatuses}
                value={filters.status}
                onChange={val => setFilters({ ...filters, status: val })}
                isRTL={isRTL}
              />
            </div>
          </div>

          {/* Collapsible Section (Rest of the filters) */}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 transition-all duration-300 overflow-hidden ${showAllFilters ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>

            {/* 5. Project Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaBuilding className="text-blue-500" size={10} /> {Label.title}</label>
              <SearchableSelect
                options={allProjects}
                value={filters.project}
                onChange={val => setFilters({ ...filters, project: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 6. Country */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaMapMarkerAlt className="text-blue-500" size={10} /> {Label.country}</label>
              <SearchableSelect
                options={allCountries}
                value={filters.country}
                onChange={val => setFilters({ ...filters, country: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 7. Category */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaTags className="text-blue-500" size={10} /> {Label.category}</label>
              <SearchableSelect
                options={allCategories}
                value={filters.category}
                onChange={val => setFilters({ ...filters, category: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 8. Created By */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaUser className="text-blue-500" size={10} /> {Label.createdBy}</label>
              <SearchableSelect
                options={allUsers}
                value={filters.createdBy}
                onChange={val => setFilters({ ...filters, createdBy: val })}
                isRTL={isRTL}
              />
            </div>

            {/* 9. Created Date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1"><FaFilter className="text-blue-500" size={10} /> {Label.createdDate}</label>
              <input
                type="date"
                className="input w-full"
                value={filters.createdDate}
                onChange={e => setFilters({ ...filters, createdDate: e.target.value })}
              />
            </div>

            {/* 10. Price Range */}
            <div className="col-span-1 md:col-span-2">
              <RangeSlider
                min={priceLimits.min}
                max={priceLimits.max}
                value={[Number(filters.minPrice) || priceLimits.min, Number(filters.maxPrice) || priceLimits.max]}
                onChange={([min, max]) => setFilters({ ...filters, minPrice: min, maxPrice: max })}
                label={Label.priceRange}
                isRTL={isRTL}
              />
            </div>

            {/* 11. Space Range */}
            <div className="col-span-1 md:col-span-2">
              <RangeSlider
                min={spaceLimits.min}
                max={spaceLimits.max}
                value={[Number(filters.minSpace) || spaceLimits.min, Number(filters.maxSpace) || spaceLimits.max]}
                onChange={([min, max]) => setFilters({ ...filters, minSpace: min, maxSpace: max })}
                label={Label.spaceRange}
                isRTL={isRTL}
              />
            </div>
          </div>
        </div>

      </div>


      {/* Summary row (full width) */}
      <div className="mt-4 relative z-10">
        <SummaryPanel projects={filtered} allCities={projectCities} isRTL={isRTL} onFilterStatus={(s) => setFilters(prev => ({ ...prev, status: s === 'All' ? '' : s }))} onFilterCity={(c) => setFilters(prev => ({ ...prev, city: c === 'All' ? '' : c }))} />
      </div>

      {/* Projects list: two per row */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
        {paginated.map((p, idx) => (
          <div key={idx} className="glass-panel rounded-xl overflow-hidden">
            <ProjectCard
              p={p}
              isRTL={isRTL}
              Label={Label}
              companySetup={companySetup}
              onView={(proj) => setSelectedProject(proj)}
              onEdit={(proj) => { setEditProject(proj); setShowCreateModal(true) }}
              onDelete={handleDeleteProject}
              onAddUnit={handleAddUnit}
              onShare={shareProjectLanding}
            />
          </div>
        ))}

      </div>
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
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Import Projects Modal */}
      {showImportModal && (
        <ProjectsImportModal onClose={() => setShowImportModal(false)} isRTL={isRTL} addToast={addToast} addLog={(log) => setImportLogs(prev => [log, ...prev])} />
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <CreateProjectModal
            onClose={() => { setShowCreateModal(false); setEditProject(null) }}
            onSave={handleSaveProject}
            isRTL={isRTL}
            mode={editProject ? 'edit' : 'create'}
            initialValues={editProject}
            dbCities={dbCities}
            dbCountries={dbCountries}
            developerOptions={developerOptions}
          />
        </div>
      )}

      {/* Create Unit Modal */}
      {showCreateUnitModal && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <CreatePropertyModal
            onClose={() => { setShowCreateUnitModal(false); setUnitProject(null) }}
            onSave={handleSaveUnit}
            isRTL={isRTL}
            initialData={{ project: unitProject?.name }}
          />
        </div>
      )}

      {selectedProject && (
        <ProjectDetailsModal p={selectedProject} isRTL={isRTL} onClose={() => setSelectedProject(null)} />
      )}
      {/* Toasts */}
      <div className="fixed z-50 top-20 end-4 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-lg shadow-lg ${t.type === 'success' ? 'bg-emerald-600 text-white' : t.type === 'error' ? 'bg-rose-600 text-white' : 'bg-gray-800 text-white'}`}>{t.message}</div>
        ))}
      </div>
    </div>
  )
}



// Import Modal Component
function ProjectsImportModal({ onClose, isRTL, addToast, addLog }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importSummary, setImportSummary] = useState(null)
  const { t } = useTranslation() // Using hook if possible, otherwise fallback to hardcoded

  // Template Generator
  const generateTemplate = () => {
    const templateData = [
      {
        'Project Name': 'مشروع المثال',
        'Developer': 'اسم المطور',
        'City': 'القاهرة الجديدة',
        'Status': 'Active',
        'Units': '100',
        'Min Price': '1000000',
        'Max Price': '5000000',
        'Delivery Date': '2026-01-01',
        'Description': 'وصف المشروع'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects Template')
    const fileName = 'projects_template.xlsx'
    XLSX.writeFile(workbook, fileName)
    logExportEvent({
      module: 'Projects',
      fileName,
      format: 'xlsx',
    })
  }

  // Validate Fields
  const validateRequiredFields = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

          if (rows.length === 0) {
            reject(new Error(isRTL ? 'الملف فارغ' : 'File is empty'))
            return
          }

          const headers = rows[0].map(h => h?.toString()?.toLowerCase()?.trim())
          const requiredFields = ['project', 'developer', 'city']
          const missingFields = []

          requiredFields.forEach(field => {
            const found = headers.some(header =>
              header.includes(field) ||
              (header.includes('name') && field === 'project') ||
              (header.includes('اسم') && field === 'project') ||
              (header.includes('مطور') && field === 'developer') ||
              (header.includes('مدينة') && field === 'city')
            )
            if (!found) {
              missingFields.push(field)
            }
          })

          if (missingFields.length > 0) {
            reject(new Error((isRTL ? 'الحقول المطلوبة مفقودة: ' : 'Missing required fields: ') + missingFields.join(', ')))
          } else {
            resolve(true)
          }
        } catch (error) {
          reject(new Error(isRTL ? 'خطأ في قراءة الملف' : 'Error reading file'))
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  // Handle File Upload
  const handleFileUpload = async (file) => {
    if (!file) return
    setImportError(null)
    setImportSummary(null)

    try {
      await validateRequiredFields(file)
      setExcelFile(file)
    } catch (error) {
      setImportError(error.message)
      setExcelFile(null)
    }
  }

  // Handle Import
  const handleImport = async () => {
    if (!excelFile) return
    setImporting(true)
    setImportError(null)

    try {
      // Simulate processing
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const ws = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws)

        // Log the import
        if (addLog) {
          addLog({
            fileName: excelFile.name,
            user: 'Current User',
            timestamp: new Date().toISOString(),
            status: 'Success',
            count: json.length
          })
        }

        if (addToast) {
          addToast('success', isRTL ? 'تم الاستيراد بنجاح' : 'Import successful')
        }

        setImportSummary({ added: json.length })
        setImporting(false)

        // Close after a short delay to show success
        setTimeout(() => {
          onClose()
        }, 1500)
      }
      reader.readAsArrayBuffer(excelFile)
    } catch (err) {
      setImportError(isRTL ? 'فشل الاستيراد' : 'Import failed')
      setImporting(false)
    }
  }

  return (
    <div className={`fixed inset-0 z-[2000] ${isRTL ? 'rtl' : 'ltr'} flex items-start justify-center pt-20`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative max-w-2xl w-full mx-4 rounded-2xl shadow-2xl border flex flex-col max-h-[85vh] transition-colors duration-200"
        style={{
          backgroundColor: isDark ? '#172554' : 'white',
          borderColor: isDark ? '#1e3a8a' : '#e5e7eb',
          color: isDark ? 'white' : '#111827'
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b transition-colors duration-200"
          style={{ borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <FaDownload className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold" style={{ color: isDark ? 'white' : '#111827' }}>{isRTL ? 'استيراد المشاريع' : 'Import Projects'}</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto custom-scrollbar">
          {/* Template Download Section */}
          <div
            className="mb-6 p-4 rounded-xl border transition-colors duration-200"
            style={{
              backgroundColor: isDark ? 'rgba(30, 58, 138, 0.4)' : '#eff6ff',
              borderColor: isDark ? '#1e40af' : '#bfdbfe'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaFileExcel className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="text-sm font-semibold" style={{ color: isDark ? 'white' : '#111827' }}>
                    {isRTL ? 'تحميل نموذج Excel' : 'Download Excel Template'}
                  </h4>
                  <p className="text-xs" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>
                    {isRTL ? 'استخدم هذا النموذج لإضافة مشاريع جديدة' : 'Use this template to add new projects'}
                  </p>
                </div>
              </div>
              <button
                onClick={generateTemplate}
                className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none flex items-center gap-2"
              >
                <FaDownload className="w-3 h-3" />
                {isRTL ? 'تحميل' : 'Download'}
              </button>
            </div>
            <div className="mt-3 text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              <strong>{isRTL ? 'الحقول المطلوبة: ' : 'Required Fields: '}</strong> Project Name, Developer, City
            </div>
          </div>

          {/* Dropzone */}
          <div
            className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-colors duration-300"
            style={{
              backgroundColor: isDark ? 'rgba(30, 58, 138, 0.2)' : 'rgba(255, 255, 255, 0.7)',
              borderColor: isDark ? '#3b82f6' : '#93c5fd'
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file && (/\.xlsx$|\.xls$/i).test(file.name)) {
                await handleFileUpload(file)
              }
            }}
          >
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0l-3 3m3-3l3 3m7 4v12m0 0l-3-3m3 3l3-3" />
            </svg>
            <p className="text-sm text-center" style={{ color: isDark ? '#d1d5db' : '#374151' }}>
              {isRTL ? 'اسحب وأفلت ملف Excel هنا أو اضغط للاختيار' : 'Drag & drop Excel file here or click to browse'}
            </p>
            <input
              id="modal-excel-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={async (e) => {
                const file = e.target.files?.[0] || null
                if (file) {
                  await handleFileUpload(file)
                } else {
                  setExcelFile(null)
                }
              }}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => document.getElementById('modal-excel-file-input')?.click()}
              className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none"
            >
              {isRTL ? 'اختيار ملف' : 'Browse File'}
            </button>

            {excelFile ? (
              <div className="mt-2 text-xs" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>{isRTL ? 'تم اختيار: ' + excelFile.name : 'Selected: ' + excelFile.name}</div>
            ) : (
              <div className="mt-2 text-xs" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>{isRTL ? 'لم يتم اختيار ملف' : 'No file selected'}</div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              onClick={handleImport}
              disabled={!excelFile || importing}
              className={`btn btn-sm ${importing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white border-none flex items-center gap-2`}
            >
              <FaDownload className="w-4 h-4" />
              {importing ? (isRTL ? 'جاري الاستيراد...' : 'Importing...') : (isRTL ? 'استيراد البيانات' : 'Import Data')}
            </button>
            <span className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{isRTL ? 'الملفات المدعومة: .xlsx, .xls' : 'Supported files: .xlsx, .xls'}</span>
          </div>

          {/* Feedback */}
          {importError && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800">
              {importError}
            </div>
          )}
          {importSummary && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800">
              {isRTL ? `تم استيراد ${importSummary.added} مشروع بنجاح` : `Successfully imported ${importSummary.added} projects`}
            </div>
          )}

          <div className="mt-3 text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            {isRTL ? 'الحقول المدعومة: اسم المشروع، المطور، المدينة، الحالة، الوحدات، السعر، الوصف' : 'Supported Fields: Project Name, Developer, City, Status, Units, Price, Description'}
          </div>
        </div>
      </div>
    </div>
  )
}



function FileUploadBox({ id, isRTL, multiple = false, accept, onChange, selectedText }) {
  const [files, setFiles] = useState([])
  const handleChange = (e) => {
    const arr = Array.from(e.target.files || [])
    setFiles(arr)
    if (onChange) onChange(e)
  }
  const rightText = selectedText !== undefined
    ? (selectedText || (isRTL ? 'لم يتم اختيار ملف' : 'No file chosen'))
    : (files.length ? files.map(f => f.name).join(', ') : (isRTL ? 'لم يتم اختيار ملف' : 'No file chosen'))
  const buttonLabel = multiple ? (isRTL ? 'اختر الملفات' : 'Choose Files') : (isRTL ? 'اختر ملف' : 'Choose File')
  return (
    <div className="relative">
      <input id={id} type="file" multiple={multiple} accept={accept} onChange={handleChange} className="hidden" />
      <label htmlFor={id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/40 px-3 py-2 cursor-pointer hover:bg-gray-100/60 dark:hover:bg-gray-700/60">
        <span className="inline-flex items-center gap-2">
          <FaUpload className="text-blue-500" />
          <span className="text-sm font-medium">{buttonLabel}</span>
        </span>
        <span className="text-sm text-[var(--muted-text)] truncate max-w-[60%]">{rightText}</span>
      </label>
    </div>
  )
}

function MapTab({ isRTL, form, setForm, onClose, onSave }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [coords, setCoords] = useState({ lat: Number(form.latitude) || 30.0444, lng: Number(form.longitude) || 31.2357 })
  const [zoom, setZoom] = useState(Number(form.mapZoom) || 12)
  const [status, setStatus] = useState('')
  const [mapError, setMapError] = useState(false)

  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const abortController = useRef(null)

  const updateForm = (newCoords, newZoom) => {
    const lat = Number(newCoords.lat).toFixed(6)
    const lng = Number(newCoords.lng).toFixed(6)
    setForm(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      mapZoom: newZoom,
      mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${Math.round(newZoom)}/${lat}/${lng}`
    }))
  }

  useEffect(() => {
    if (!mapContainer.current) return
    if (mapRef.current) return

    try {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'google-streets': {
              type: 'raster',
              tiles: ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'],
              tileSize: 256,
              attribution: '&copy; Google Maps'
            }
          },
          layers: [{
            id: 'google-streets',
            type: 'raster',
            source: 'google-streets',
            minzoom: 0,
            maxzoom: 22
          }]
        },
        center: [coords.lng, coords.lat],
        zoom: zoom
      })

      mapRef.current = map

      const marker = new maplibregl.Marker({ draggable: true })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map)
      markerRef.current = marker

      marker.on('dragend', () => {
        const { lng, lat } = marker.getLngLat()
        setCoords({ lat, lng })
        updateForm({ lat, lng }, map.getZoom())
      })

      map.on('click', (e) => {
        marker.setLngLat(e.lngLat)
        setCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng })
        updateForm({ lat: e.lngLat.lat, lng: e.lngLat.lng }, map.getZoom())
      })

      map.on('zoomend', () => {
        const z = map.getZoom()
        setZoom(z)
        updateForm(coords, z)
      })

      map.on('error', (e) => {
        console.warn('Map error:', e)
      })

    } catch (err) {
      console.error('Map init error:', err)
      setMapError(true)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  const handleSearch = async (q) => {
    if (!q) return
    setSearching(true)
    setStatus('')
    if (abortController.current) abortController.current.abort()
    abortController.current = new AbortController()

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`, {
        signal: abortController.current.signal,
        headers: { 'User-Agent': 'besouhoula-app/1.0', 'Accept': 'application/json' }
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data)
      if (data.length === 0) setStatus(isRTL ? 'لا توجد نتائج' : 'No results found')
    } catch (err) {
      if (err.name !== 'AbortError') setStatus(isRTL ? 'خطأ في البحث' : 'Search error')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2) handleSearch(query)
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  const selectResult = (r) => {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    setCoords({ lat, lng })
    setResults([])
    setQuery(r.display_name)
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 14 })
      if (markerRef.current) markerRef.current.setLngLat([lng, lat])
    }
    updateForm({ lat, lng }, 14)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setStatus(isRTL ? 'غير مدعوم' : 'Not supported')
      return
    }
    setSearching(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lng: longitude })
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [longitude, latitude], zoom: 14 })
          if (markerRef.current) markerRef.current.setLngLat([longitude, latitude])
        }
        updateForm({ lat: latitude, lng: longitude }, 14)
        setSearching(false)
      },
      () => {
        setStatus(isRTL ? 'تعذر تحديد الموقع' : 'Location denied')
        setSearching(false)
      }
    )
  }

  const getEmbedUrl = () => {
    const { lat, lng } = coords
    return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`
  }

  return (
    <div className="flex flex-col h-[650px] w-full gap-4">
      {/* Top Bar: Search & URL Inputs */}
      <div className="flex flex-col md:flex-row gap-3 items-end md:items-center justify-between">
        <div className="relative flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Search Input */}
          <div>
            <label className="text-xs text-[var(--muted-text)] mb-1 block">{isRTL ? 'بحث عن موقع' : 'Search Location'}</label>
            <div className="relative">
              <input
                className="input w-full ps-9"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={isRTL ? 'ابحث في خرائط جوجل...' : 'Search Google Maps...'}
              />
              <FaSearch className={`absolute top-1/2 -translate-y-1/2 text-[var(--muted-text)] ${isRTL ? 'right-3' : 'left-3'}`} />
              {searching && <div className={`absolute top-1/2 -translate-y-1/2 text-xs animate-pulse ${isRTL ? 'left-8' : 'right-3'}`}>...</div>}
              {results.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-[var(--content-bg)] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                  {results.map((r, i) => (
                    <li key={i} onClick={() => selectResult(r)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-sm border-b border-gray-50 dark:border-gray-800 last:border-0">
                      {r.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* URL Input */}
          <div>
            <label className="text-xs text-[var(--muted-text)] mb-1 block">{isRTL ? 'رابط الخريطة' : 'Map URL'}</label>
            <div className="flex gap-2">
              <input
                className="input w-full"
                value={form.mapUrl || ''}
                onChange={e => setForm(f => ({ ...f, mapUrl: e.target.value }))}
                placeholder="https://maps.google.com/..."
              />
              <button className="btn btn-sm btn-ghost text-blue-600" onClick={() => {
                navigator.clipboard.writeText(form.mapUrl)
                setStatus(isRTL ? 'تم النسخ' : 'Copied')
              }} title={isRTL ? 'نسخ الرابط' : 'Copy URL'}>
                <FaShareAlt />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto self-end pb-[2px]">
          <button className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none flex-1 md:flex-none" onClick={useMyLocation}>
            <FaMapMarkerAlt /> {isRTL ? 'موقعي' : 'My Location'}
          </button>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-gray-900">
        <div ref={mapContainer} className={`absolute inset-0 z-10 ${mapError ? 'hidden' : 'block'}`} />

        {/* Coordinates Overlay */}
        <div className={`absolute bottom-4 ${isRTL ? 'right-4' : 'left-4'} z-20 bg-white/90 dark:bg-black/80 backdrop-blur px-3 py-2 rounded-lg shadow text-xs font-mono flex gap-3 pointer-events-none`}>
          <div>
            <span className="text-[var(--muted-text)] mr-1">Lat:</span>
            {coords.lat.toFixed(5)}
          </div>
          <div>
            <span className="text-[var(--muted-text)] mr-1">Lng:</span>
            {coords.lng.toFixed(5)}
          </div>
        </div>

        {mapError && (
          <div className="absolute inset-0 z-0">
            <iframe
              className="w-full h-full border-0"
              src={getEmbedUrl()}
              title="map-fallback"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="text-xs text-[var(--muted-text)]">
          {status && <span className="text-amber-600">{status}</span>}
        </div>
        <div className="flex gap-3">
          <button className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none" onClick={onClose}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
          <button className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none" onClick={onSave}>{isRTL ? 'حفظ' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function PaymentPlanTab({ isRTL, onClose, onSave }) {
  const [payment, setPayment] = useState({ basePrice: '', downPct: '', installments: '', startDate: '', frequency: 'monthly', graceMonths: '0', interestPct: '' })
  const [schedule, setSchedule] = useState([])
  const [showExportMenu, setShowExportMenu] = useState(false)
  const setPayVal = (key) => (e) => setPayment(v => ({ ...v, [key]: e.target.value }))
  const addMonths = (dateStr, months) => { const d = new Date(dateStr || new Date()); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10) }
  const gen = () => {
    const base = Number(payment.basePrice) || 0
    const dp = Math.max(0, Math.min(100, Number(payment.downPct) || 0))
    const n = Math.max(0, Math.floor(Number(payment.installments) || 0))
    const grace = Math.max(0, Math.floor(Number(payment.graceMonths) || 0))
    const start = payment.startDate || new Date().toISOString().slice(0, 10)
    const step = payment.frequency === 'quarterly' ? 3 : 1
    const dpAmount = +(base * dp / 100).toFixed(2)
    const remain = +(base - dpAmount).toFixed(2)
    const each = n > 0 ? +(remain / n).toFixed(2) : 0
    const rows = []
    if (dpAmount > 0) rows.push({ no: 0, label: isRTL ? 'مقدم' : 'Down Payment', dueDate: start, amount: dpAmount })
    let curDate = addMonths(start, grace)
    for (let i = 1; i <= n; i++) {
      rows.push({ no: i, label: isRTL ? 'قسط' : 'Installment', dueDate: curDate, amount: each })
      curDate = addMonths(curDate, step)
    }
    const sum = rows.reduce((a, b) => a + (b.amount || 0), 0)
    const diff = +(base - sum).toFixed(2)
    if (Math.abs(diff) >= 0.01 && rows.length) rows[rows.length - 1].amount = +(rows[rows.length - 1].amount + diff).toFixed(2)
    setSchedule(rows)
  }
  const exportCsv = () => {
    const headers = ['No', 'Label', 'DueDate', 'Amount']
    const csv = headers.join(',') + '\n' + schedule.map(r => [r.no, r.label, r.dueDate, r.amount].join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'payment_plan.csv'; a.click(); URL.revokeObjectURL(url)
  }
  const exportPdf = async () => {
    const jsPDF = (await import('jspdf')).default
    const autoTable = await import('jspdf-autotable')
    const doc = new jsPDF()
    const head = [['No', 'Label', 'DueDate', 'Amount']]
    const body = schedule.map(r => [String(r.no), r.label, r.dueDate, String(r.amount)])
    autoTable.default(doc, { head, body })
    doc.save('payment_plan.pdf')
  }
  const total = schedule.reduce((a, b) => a + (b.amount || 0), 0)
  return (
    <div className="space-y-4 text-[var(--content-text)]">
      <h3 className="text-lg font-semibold">{isRTL ? 'خطة الدفع' : 'Payment Plan'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--muted-text)] mb-1">{isRTL ? 'السعر الإجمالي' : 'Base Price'}</label>
          <input type="number" className="input w-full" value={payment.basePrice} onChange={setPayVal('basePrice')} placeholder={isRTL ? 'EGP' : 'EGP'} />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted-text)] mb-1">{isRTL ? 'المقدم (%)' : 'Down Payment (%)'}</label>
          <input type="number" className="input w-full" value={payment.downPct} onChange={setPayVal('downPct')} placeholder={isRTL ? 'مثال: 10' : 'e.g., 10'} />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted-text)] mb-1">{isRTL ? 'عدد الأقساط' : 'Installments Count'}</label>
          <input type="number" className="input w-full" value={payment.installments} onChange={setPayVal('installments')} placeholder={isRTL ? 'مثال: 48' : 'e.g., 48'} />
        </div>
        <div>
          <label className="block text_sm text-[var(--muted-text)] mb-1">{isRTL ? 'تاريخ البداية' : 'Start Date'}</label>
          <input type="date" className="input w-full" value={payment.startDate} onChange={setPayVal('startDate')} />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted-text)] mb-1">{isRTL ? 'التكرار' : 'Frequency'}</label>
          <select className="input w-full" value={payment.frequency} onChange={setPayVal('frequency')}>
            <option value="monthly">{isRTL ? 'شهري' : 'Monthly'}</option>
            <option value="quarterly">{isRTL ? 'ربع سنوي' : 'Quarterly'}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-[var(--muted-text)] mb-1">{isRTL ? 'شهور سماح' : 'Grace Months'}</label>
          <input type="number" className="input w-full" value={payment.graceMonths} onChange={setPayVal('graceMonths')} placeholder={isRTL ? '0' : '0'} />
        </div>
      </div>
      <div className={`flex items-center justify-end gap-3`}>
        <button className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none" onClick={gen}>{isRTL ? 'توليد' : 'Generate'}</button>
      </div>
      {schedule.length > 0 && (
        <div className="space-y-3">
          <div className="glass-panel rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">{isRTL ? 'الإجمالي' : 'Total'}: <span className="font-semibold">{new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(total)}</span></div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center gap-2" onClick={() => setShowExportMenu(!showExportMenu)}>
                    <span className="text-white">{isRTL ? 'تصدير' : 'Export'}</span> <FaChevronDown size={12} />
                  </button>
                  {showExportMenu && (
                    <div className="absolute bottom-full mb-1 end-0 bg-[var(--card-bg)] border border-[var(--panel-border)] rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                      <button className="w-full text-start px-4 py-2 hover:bg-[var(--hover-bg)] text-sm" onClick={() => { exportCsv(); setShowExportMenu(false) }}>
                        CSV
                      </button>
                      <button className="w-full text-start px-4 py-2 hover:bg-[var(--hover-bg)] text-sm" onClick={() => { exportPdf(); setShowExportMenu(false) }}>
                        PDF
                      </button>
                    </div>
                  )}
                </div>
                <button className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none" onClick={() => onSave && onSave(schedule)}>{isRTL ? 'حفظ' : 'Save'}</button>
              </div>
            </div>
          </div>
          <div className="rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-start p-2">#</th>
                  <th className="text-start p-2">{isRTL ? 'النوع' : 'Label'}</th>
                  <th className="text-start p-2">{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                  <th className="text-start p-2">{isRTL ? 'القيمة' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((r) => (
                  <tr key={r.no} className="border-t">
                    <td className="p-2">{r.no}</td>
                    <td className="p-2">{r.label}</td>
                    <td className="p-2">{r.dueDate}</td>
                    <td className="p-2">{new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className={`flex items-center justify-end gap-3`}>
        <button className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none" onClick={onClose}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
      </div>
    </div>
  )
}

function CilTab({ isRTL, onClose, onSave }) {
  const [cil, setCil] = useState({
    to: '',
    subject: '',
    content: '',
    signature: '',
    attachment: null
  })
  const setVal = (key) => (e) => setCil(v => ({ ...v, [key]: e.target.value }))
  const onFileChange = (e) => {
    const file = e.target.files && e.target.files[0]
    setCil(v => ({ ...v, attachment: file || null }))
  }

  const exportPdf = async () => {
    const jsPDF = (await import('jspdf')).default
    const autoTable = await import('jspdf-autotable')
    const doc = new jsPDF()
    autoTable.default(doc, {
      head: [[isRTL ? 'بيان CIL' : 'CIL Statement']],
      body: [
        [(isRTL ? 'إلى: ' : 'To: ') + (cil.to || '-')],
        [(isRTL ? 'الموضوع: ' : 'Subject: ') + (cil.subject || '-')],
        [(isRTL ? 'المحتوى: ' : 'Content: ') + (cil.content || '-')],
        [(isRTL ? 'مرفق: ' : 'Attachment: ') + (cil.attachment ? cil.attachment.name : '-')],
        [(isRTL ? 'التوقيع: ' : 'Signature: ') + (cil.signature || '-')],
      ],
      styles: { halign: isRTL ? 'right' : 'left' },
    })
    doc.save('cil_statement.pdf')
  }

  const save = () => { onSave && onSave(cil) }

  return (
    <div className="space-y-4 text-[var(--content-text)]">
      <h3 className="text-lg font-semibold">CIL</h3>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm text-[var(--muted-text)] mb-1">{isRTL ? 'إلى' : 'To'}</label>
          <input className="input w-full" value={cil.to} onChange={setVal('to')} placeholder={isRTL ? 'اسم المستلم' : 'Recipient Name'} />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted-text)] mb-1">{isRTL ? 'الموضوع' : 'Subject'}</label>
          <input className="input w-full" value={cil.subject} onChange={setVal('subject')} placeholder={isRTL ? 'موضوع الرسالة' : 'Subject'} />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted-text)] mb-1">{isRTL ? 'المحتوى' : 'Content'}</label>
          <textarea className="input w-full min-h-[150px]" value={cil.content} onChange={setVal('content')} placeholder={isRTL ? 'اكتب المحتوى هنا...' : 'Write content here...'} />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted-text)] mb-1">{isRTL ? 'مرفق' : 'Attachment'}</label>
          <input type="file" className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
            " onChange={onFileChange} />
          {cil.attachment && <div className="text-xs mt-1 text-[var(--muted-text)]">{cil.attachment.name}</div>}
        </div>
        <div>
          <label className="block text-sm text-[var(--muted-text)] mb-1">{isRTL ? 'التوقيع' : 'Signature'}</label>
          <input className="input w-full" value={cil.signature} onChange={setVal('signature')} placeholder={isRTL ? 'التوقيع' : 'Signature'} />
        </div>
      </div>
      <div className={`flex items-center justify-end gap-3`}>
        <button className="btn btn-glass" onClick={exportPdf}>PDF</button>
        <button className="btn btn-primary" onClick={save}>{isRTL ? 'حفظ' : 'Save'}</button>
        <button className="btn btn-glass" onClick={onClose}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
      </div>
    </div>
  )
}

function ProjectCard({ p, isRTL, Label, onView, onEdit, onDelete, onAddUnit, onShare, companySetup }) {
  const img = p.image || pickImage(p.name)
  return (
    <div className="p-3 group">
      <div className="flex items-center gap-3 min-w-0 mb-2">
        {p.logo && <img src={p.logo} alt={`${p.name} logo`} className="h-7 w-auto" />}
        <h3 className="text-base font-semibold truncate flex-1">{p.name}</h3>

        <div className={`flex items-center gap-1`}>
          <button
            className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm transition hover:scale-110 active:scale-95 focus:outline-none"
            title={isRTL ? 'عرض' : 'View'} aria-label={isRTL ? 'عرض' : 'View'} onClick={() => onView && onView(p)}
            style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          >
            <FaEye className="w-3 h-3 text-[var(--nova-accent)] dark:text-white" />
          </button>
          <button
            className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm transition hover:scale-110 active:scale-95 focus:outline-none"
            title={isRTL ? 'إضافة وحدة' : 'Add Unit'} aria-label={isRTL ? 'إضافة وحدة' : 'Add Unit'} onClick={(e) => { e.stopPropagation(); onAddUnit && onAddUnit(p); }}
            style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          >
            <FaPlus className="w-3 h-3 text-[var(--nova-accent)] dark:text-white" />
          </button>
          <button
            className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm transition hover:scale-110 active:scale-95 focus:outline-none"
            title={isRTL ? 'تعديل' : 'Edit'} aria-label={isRTL ? 'تعديل' : 'Edit'} onClick={() => onEdit && onEdit(p)}
            style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          >
            <FaEdit className="w-3 h-3 text-[var(--nova-accent)] dark:text-white" />
          </button>
          <button
            className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm transition hover:scale-110 active:scale-95 focus:outline-none text-red-500"
            title={isRTL ? 'حذف' : 'Delete'} aria-label={isRTL ? 'حذف' : 'Delete'} onClick={() => onDelete && onDelete(p)}
            style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          >
            <FaTrash className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between">
        {p.status && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${(p.status === 'Active' || p.status === 'Sales') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            p.status === 'Completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}>
            {p.status}
          </span>
        )}
      </div>

      {img && (
        <div className="mt-2 rounded-lg overflow-hidden relative">
          <img src={img} alt={p.name} className="w-full h-40 md:h-56 object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Compact line details */}
      <div className={`mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs leading-snug ${isRTL ? 'text-end' : 'text-start'}`}>
        <div className={`glass-panel tinted-blue px-2 py-1.5 rounded-lg flex items-center gap-1.5 min-w-0 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20`} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          <FaMapMarkerAlt className="text-blue-500 flex-shrink-0" />
          <span className="min-w-0 font-medium" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{p.city}</span>
        </div>
        <div className={`glass-panel tinted-indigo px-2 py-1.5 rounded-lg flex items-center gap-1.5 min-w-0 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20`} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          <FaBuilding className="text-indigo-500 flex-shrink-0" />
          <span className="min-w-0 font-medium" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{p.developer}</span>
        </div>
        <div className="glass-panel tinted-emerald px-2 py-1.5 rounded-lg min-w-0 font-medium transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          <span className="text-emerald-600 dark:text-emerald-400">{Label.units}:</span> <span className="font-bold">{p.units}</span>
        </div>
        <div className="glass-panel tinted-violet px-2 py-1.5 rounded-lg min-w-0 font-medium transition-colors hover:bg-violet-50 dark:hover:bg-violet-900/20" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          <span className="text-violet-600 dark:text-violet-400">{isRTL ? 'التصنيف' : 'Category'}:</span> <span className="font-bold">{p.category}</span>
        </div>
        <div className="glass-panel tinted-amber px-2 py-1.5 rounded-lg min-w-0 font-medium transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          <span className="text-amber-600 dark:text-amber-400">{isRTL ? 'الحالة' : 'Status'}:</span> <span className="font-bold">{p.status}</span>
        </div>
        <div className="glass-panel tinted-blue px-2 py-1.5 rounded-lg min-w-0 font-medium transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          <span className="text-blue-600 dark:text-blue-400">{isRTL ? 'آخر تحديث' : 'Updated'}:</span> <span className="font-bold">{p.lastUpdated}</span>
        </div>
      </div>

      {/* Progress + Price Range */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div className={`${isRTL ? 'text-end' : 'text-start'}`}>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">{isRTL ? 'نسبة الإنجاز' : 'Completion'}</div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000" style={{ width: `${p.completion || 0}%` }} />
          </div>
        </div>
        <div className={`${isRTL ? 'text-end' : 'text-start'}`}>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">{isRTL ? 'نطاق السعر' : 'Price Range'}</div>
          <div className="text-sm font-bold flex flex-col gap-0.5">
            <div className={`inline-flex items-center ${isRTL ? 'justify-end' : 'justify-start'} gap-1.5`}>
              <span className="text-slate-400 text-[10px] font-medium">{isRTL ? 'من' : 'From'}:</span>
              <span className="text-blue-600 dark:text-blue-400">{new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(p.minPrice || 0)}</span>
            </div>
            <div className={`inline-flex items-center ${isRTL ? 'justify-end' : 'justify-start'} gap-1.5`}>
              <span className="text-slate-400 text-[10px] font-medium">{isRTL ? 'إلى' : 'To'}:</span>
              <span className="text-blue-600 dark:text-blue-400">{new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(p.maxPrice || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Action */}
      <div className="mt-4 flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold shadow-lg shadow-slate-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all duration-200 group/btn"
          title={Label.share}
          onClick={(e) => {
            e.stopPropagation();
            onShare && onShare(p);
          }}
        >
          <FaShareAlt className={isRTL ? 'scale-x-[-1]' : ''} />
          <span>{Label.share}</span>
        </button>
      </div>
    </div>
  )
}
function SummaryPanel({ projects, allCities, isRTL, onFilterStatus, onFilterCity }) {
  const totalUnits = projects.reduce((sum, p) => sum + (p.units || 0), 0)
  const rawCities = allCities || Array.from(new Set(projects.map(p => p.city).filter(Boolean)))
  const cities = (() => {
    const seen = new Set()
    const out = []
    for (const c of rawCities) {
      const s = String(c || '').trim()
      if (!s) continue
      const lower = s.toLowerCase()
      if (lower === 'all' || s === 'الكل') continue
      if (seen.has(lower)) continue
      seen.add(lower)
      out.push(s)
    }
    return out
  })()
  const activeCount = projects.filter(p => (p.status || '').toLowerCase() === 'active' || (p.status || '').toLowerCase() === 'sales').length
  const statusCounts = ['Planning', 'Active', 'Sales', 'Completed'].map(s => ({ s, count: projects.filter(p => p.status === s).length }))

  return (
    <div className="glass-panel rounded-xl p-3">
      <h3 className="text-sm font-semibold">{isRTL ? 'ملخص المشاريع' : 'Projects Summary'}</h3>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <button className="glass-panel tinted-blue p-3 rounded-lg text-start" onClick={() => onFilterStatus && onFilterStatus('All')}>
          <div className="text-[var(--muted-text)]">{isRTL ? 'عدد المشاريع' : 'Projects'}</div>
          <div className="text-xl font-bold">{projects.length}</div>
        </button>
        <div className="glass-panel tinted-indigo p-3 rounded-lg">
          <div className="text-[var(--muted-text)]">{isRTL ? 'إجمالي الوحدات' : 'Total Units'}</div>
          <div className="text-xl font-bold">{totalUnits}</div>
        </div>
        <button className="glass-panel tinted-emerald p-3 rounded-lg text-start" onClick={() => onFilterStatus && onFilterStatus('Active')}>
          <div className="text-[var(--muted-text)]">{isRTL ? 'النشط' : 'Active'}</div>
          <div className="text-xl font-bold">{activeCount}</div>
        </button>
      </div>
      <div className="mt-2 text-sm text-[var(--muted-text)]">
        <div className="flex flex-wrap items-center gap-2">
          <span>{isRTL ? 'المدن' : 'Cities'}:</span>
          <button className="px-2 py-0.5 text-xs rounded-md bg-transparent border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => onFilterCity && onFilterCity('All')}>{isRTL ? 'الكل' : 'All'}</button>
          {cities.map(c => (
            <button key={c} className="px-2 py-0.5 text-xs rounded-md bg-transparent border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => onFilterCity && onFilterCity(c)}>{c}</button>
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <div className="h-36 min-w-[600px]" style={{ width: `${Math.max((projects || []).length * 90, 600)}px` }}>
          <Bar
            data={{
              labels: projects.map(p => (p.name || '').length > 12 ? (p.name || '').slice(0, 12) + '…' : (p.name || '')),
              datasets: [{ label: isRTL ? 'الوحدات' : 'Units', data: projects.map(p => p.units || 0), backgroundColor: 'rgba(59,130,246,0.6)', borderRadius: 6 }]
            }}
            options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } }, y: { ticks: { callback: v => `${v}` } } } }}
          />
        </div>
      </div>
    </div>
  )
}

// Export helpers
function ExportProjectsExcel(rows) {
  const data = rows.map(p => ({
    Name: p.name,
    City: p.city,
    Developer: p.developer,
    Status: p.status,
    Units: p.units,
    Phases: p.phases,
    Docs: p.docs,
    LastUpdated: p.lastUpdated,
    MinPrice: p.minPrice || 0,
    MaxPrice: p.maxPrice || 0,
    Completion: (p.completion || 0) + '%'
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Projects')
  const fileName = 'projects_export.xlsx'
  XLSX.writeFile(wb, fileName)
  logExportEvent({
    module: 'Projects',
    fileName,
    format: 'xlsx',
  })
}



// View details modal
function ProjectDetailsModal({ p, isRTL, onClose }) {
  const [activeTab, setActiveTab] = useState('core')
  const [preview, setPreview] = useState({ list: [], index: -1 })

  const tabs = [
    { id: 'core', label: isRTL ? 'التفاصيل الأساسية' : 'Details' },
    { id: 'features', label: isRTL ? 'مواصفات المشروع' : 'Features' },
    { id: 'media', label: isRTL ? 'الوسائط' : 'Media' },
    { id: 'location', label: isRTL ? 'الموقع' : 'Location' },
    { id: 'financial', label: isRTL ? 'المالية' : 'Financial' },
    { id: 'cil', label: isRTL ? 'بيانات العميل' : 'CIL' },
    { id: 'publish', label: isRTL ? 'النشر والتوزيع' : 'Publish & Marketing' },
  ]

  const ReadOnlyField = ({ label, value }) => (
    <div>
      <label className="block text-xs text-[var(--muted-text)] mb-1">{label}</label>
      <div className="p-2 rounded-lg bg-transparent border border-gray-200 dark:border-gray-700 text-sm min-h-[38px]">
        {value || '-'}
      </div>
    </div>
  )

  const SectionTitle = ({ children }) => (
    <h3 className="text-lg font-semibold mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">{children}</h3>
  )
  const normalizeSrc = (img) => typeof img === 'string' ? img : (img ? URL.createObjectURL(img) : '')
  const openPreview = (list, idx) => setPreview({ list: (Array.isArray(list) ? list : []).map(normalizeSrc).filter(Boolean), index: idx })
  const closePreview = () => setPreview({ list: [], index: -1 })
  const prevImg = () => setPreview(v => ({ ...v, index: (v.index - 1 + v.list.length) % v.list.length }))
  const nextImg = () => setPreview(v => ({ ...v, index: (v.index + 1) % v.list.length }))
  const toDataUrl = async (src) => {
    if (src instanceof File) {
      return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(src) })
    }
    const resp = await fetch(src)
    const blob = await resp.blob()
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob) })
  }
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
    const list = [
      ...(p.image ? [p.image] : []),
      ...(Array.isArray(p.galleryImages) ? p.galleryImages : []),
      ...(Array.isArray(p.masterPlanImages) ? p.masterPlanImages : []),
    ]
    if (list.length === 0) return
    const jsPDF = (await import('jspdf')).default
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    for (let i = 0; i < list.length; i++) {
      const src = list[i]
      const dataUrl = typeof src === 'string' ? await toDataUrl(src) : await toDataUrl(src)
      await fitAddImage(doc, dataUrl)
      if (i < list.length - 1) doc.addPage()
    }
    doc.save(`${(p.name || 'project').replace(/[\\/:*?\"<>|]/g, '_')}_media.pdf`)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[210] bg-[var(--content-bg)] text-[var(--content-text)] w-full h-screen sm:w-[900px] sm:max-w-[92vw] sm:max-h-[88vh] sm:h-auto sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-xl font-bold truncate flex-1">{p.name}</h2>
            <span className={`px-2 py-0.5 text-xs rounded-full ${p.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
              {p.status}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title={isRTL ? 'إغلاق' : 'Close'}>
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-4">
          <div className={`flex items-center gap-4 ${isRTL ? 'justify-end' : 'justify-start'} overflow-x-auto`} dir={isRTL ? 'rtl' : 'ltr'}>
            {(isRTL ? [...tabs].slice().reverse() : tabs).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-3 py-2 text-sm rounded-lg border whitespace-nowrap ${activeTab === t.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 text-[var(--content-text)]'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 min-h-[400px]">
          {activeTab === 'core' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <ReadOnlyField label={isRTL ? 'اسم المشروع' : 'Project Name'} value={p.name} />
                <ReadOnlyField label={isRTL ? 'اسم المشروع (عربي)' : 'Project Name (AR)'} value={p.nameAr} />
                <ReadOnlyField label={isRTL ? 'المطور' : 'Developer'} value={p.developer} />
                <ReadOnlyField label={isRTL ? 'التصنيف' : 'Category'} value={p.categories?.join(', ')} />
                <ReadOnlyField label={isRTL ? 'الحالة' : 'Status'} value={p.status} />
                <ReadOnlyField label={isRTL ? 'الدولة' : 'Country'} value={p.country} />
                <ReadOnlyField label={isRTL ? 'نسبة الإنجاز (%)' : 'Completion (%)'} value={p.completion ? `${p.completion}%` : '0%'} />
                <ReadOnlyField label={isRTL ? 'تاريخ التسليم' : 'Delivery Date'} value={p.deliveryDate} />
              </div>

              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'وصف المشروع' : 'Project Description'}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--muted-text)] mb-1">English</label>
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/10 border border-gray-200 dark:border-gray-700 text-sm min-h-[120px] whitespace-pre-wrap">
                      {p.description || '-'}
                    </div>
                  </div>
                  <div dir="rtl">
                    <label className="block text-xs text-[var(--muted-text)] mb-1">عربي</label>
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/10 border border-gray-200 dark:border-gray-700 text-sm min-h-[120px] whitespace-pre-wrap">
                      {p.descriptionAr || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'نطاق السعر' : 'Price Range'}</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField label={isRTL ? 'من' : 'From'} value={p.minPrice ? new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(p.minPrice) : '-'} />
                  <ReadOnlyField label={isRTL ? 'إلى' : 'To'} value={p.maxPrice ? new Intl.NumberFormat('en-EG', { style: 'currency', currency: p.currency || 'EGP', maximumFractionDigits: 0 }).format(p.maxPrice) : '-'} />
                </div>
              </div>

              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'نطاق المساحة (متر مربع)' : 'Space Range (sqm)'}</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField label={isRTL ? 'من' : 'From'} value={p.minSpace ? `${p.minSpace} sqm` : '-'} />
                  <ReadOnlyField label={isRTL ? 'إلى' : 'To'} value={p.maxSpace ? `${p.maxSpace} sqm` : '-'} />
                </div>
              </div>

              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'مقاييس المشروع' : 'Project Metrics'}</SectionTitle>
                <div className="grid grid-cols-3 gap-4">
                  <ReadOnlyField label={isRTL ? 'الوحدات' : 'Units'} value={p.units} />
                  <ReadOnlyField label={isRTL ? 'المراحل' : 'Phases'} value={p.phases} />
                  <ReadOnlyField label={isRTL ? 'المستندات' : 'Docs'} value={p.docs} />
                </div>
              </div>

              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'مرافق المشروع' : 'Project Amenities'}</SectionTitle>
                {Array.isArray(p.amenities) && p.amenities.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {p.amenities.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-gray-50/50 dark:bg-gray-800/10 transition-colors">
                        <FaCheck className="text-blue-500 text-xs" />
                        {item}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--muted-text)] border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    {isRTL ? 'لا توجد مرافق' : 'No amenities'}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="label">{isRTL ? 'شعار المشروع' : 'Project Logo'}</label>
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-24 w-24 bg-transparent flex items-center justify-center">
                    {p.logo ? <img src={p.logo} alt="logo" className="w-full h-full object-contain p-2" /> : <FaImage className="text-2xl text-gray-300" />}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="label">{isRTL ? 'الصورة الرئيسية' : 'Main Image'}</label>
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-48 bg-transparent flex items-center justify-center">
                    {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <FaImage className="text-4xl text-gray-300" />}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <SectionTitle>{isRTL ? 'معرض الصور' : 'Gallery'}</SectionTitle>
                  <button className="btn btn-glass inline-flex items-center gap-2 text-xs" onClick={downloadImagesPdf} title={isRTL ? 'تنزيل PDF' : 'Download PDF'}>
                    <FaCloudDownloadAlt /> {isRTL ? 'تنزيل PDF' : 'Download PDF'}
                  </button>
                </div>
                {Array.isArray(p.galleryImages) && p.galleryImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {p.galleryImages.map((img, idx) => {
                      const src = typeof img === 'string' ? img : URL.createObjectURL(img)
                      return (
                        <button key={idx} className="rounded-lg overflow-hidden h-32 border border-gray-200 dark:border-gray-700 focus:outline-none" onClick={() => openPreview(p.galleryImages, idx)} title={isRTL ? 'عرض' : 'View'}>
                          <img src={src} alt={`gallery-${idx}`} className="w-full h-full object-cover" />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-[var(--muted-text)]">{isRTL ? 'لا توجد صور' : 'No images'}</div>
                )}
              </div>
              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'المخطط العام' : 'Master Plan'}</SectionTitle>
                {Array.isArray(p.masterPlanImages) && p.masterPlanImages.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {p.masterPlanImages.map((file, idx) => {
                      const src = typeof file === 'string' ? file : URL.createObjectURL(file)
                      const isPdf = src.toLowerCase().endsWith('.pdf') || (file instanceof File && file.type === 'application/pdf')
                      
                      return (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/10">
                          {isPdf ? (
                            <div className="flex flex-col items-center justify-center p-8 h-48">
                              <FaFilePdf className="text-red-500 text-5xl mb-3" />
                              <span className="text-xs font-medium text-[var(--muted-text)] truncate max-w-full px-4">
                                {typeof file === 'string' ? file.split('/').pop() : file.name}
                              </span>
                              <a href={src} target="_blank" rel="noreferrer" className="mt-4 btn btn-sm btn-glass text-xs">
                                {isRTL ? 'فتح الملف' : 'Open PDF'}
                              </a>
                            </div>
                          ) : (
                            <button className="w-full focus:outline-none" onClick={() => openPreview(p.masterPlanImages, idx)} title={isRTL ? 'عرض' : 'View'}>
                              <img src={src} alt={`master-plan-${idx}`} className="w-full h-48 object-contain" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-[var(--muted-text)] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    {isRTL ? 'لا توجد صور' : 'No images'}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'رابط الفيديو' : 'Video URL'}</SectionTitle>
                {p.videoUrls ? (
                  <div className="space-y-2">
                    {p.videoUrls.split('\n').map((url, i) => (
                      url.trim() && (
                        <div key={i} className="p-3 rounded-lg bg-transparent border border-gray-200 dark:border-gray-700">
                          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                            <FaVideo /> {url}
                          </a>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--muted-text)]">{isRTL ? 'لا يوجد فيديو' : 'No videos'}</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-4 h-full min-h-[400px] flex flex-col">
              <SectionTitle>{isRTL ? 'العنوان' : 'Address'}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadOnlyField label={isRTL ? 'العنوان' : 'Address'} value={p.address} />
                <ReadOnlyField label={isRTL ? 'العنوان (عربي)' : 'Address (AR)'} value={p.addressAr} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyField label={isRTL ? 'المدينة' : 'City'} value={p.city} />
              </div>
              <SectionTitle>{isRTL ? 'الموقع على الخريطة' : 'Location Map'}</SectionTitle>
              <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 relative">
                {p.mapUrl ? (
                  <iframe src={p.mapUrl} className="w-full h-full border-0" title="project-map" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--muted-text)]">
                    <div className="text-center">
                      <FaMapMarkerAlt className="mx-auto text-4xl mb-2 opacity-30" />
                      <p>{isRTL ? 'الخريطة غير متوفرة' : 'Map not available'}</p>
                      {p.lat && p.lng && <p className="text-xs mt-1">Lat: {p.lat}, Lng: {p.lng}</p>}
                    </div>
                  </div>
                )}
              </div>
              {p.lat && p.lng && (
                <div className="flex gap-4 text-sm text-[var(--muted-text)]">
                  <span>Lat: {p.lat}</span>
                  <span>Lng: {p.lng}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'خطط الدفع' : 'Payment Plans'}</SectionTitle>
                {Array.isArray(p.paymentPlan) && p.paymentPlan.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {p.paymentPlan.map((plan, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100/30 dark:bg-gray-800/30">
                        <div className="grid grid-cols-3 gap-4 text-sm text-center">
                          <div className="space-y-1">
                            <span className="text-[var(--muted-text)] block text-[10px] uppercase tracking-wider">{isRTL ? 'المقدم (%)' : 'Down Payment (%)'}</span>
                            <span className="font-bold text-blue-600">{plan.downPayment}%</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[var(--muted-text)] block text-[10px] uppercase tracking-wider">{isRTL ? 'عدد السنوات' : 'Years'}</span>
                            <span className="font-bold">{plan.years}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[var(--muted-text)] block text-[10px] uppercase tracking-wider">{isRTL ? 'الاستلام' : 'Delivery'}</span>
                            <span className="font-bold">{plan.deliveryDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--muted-text)] border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    {isRTL ? 'لا توجد خطط دفع' : 'No payment plans'}
                  </div>
                )}
              </div>
            </div>
          )}


          {activeTab === 'cil' && (
            <div className="space-y-4">
              <SectionTitle>{isRTL ? 'بيانات العميل' : 'CIL'}</SectionTitle>
              {p.cil ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ReadOnlyField label={isRTL ? 'إلى' : 'To'} value={p.cil.to || p.cil.to_en} />
                    <ReadOnlyField label={isRTL ? 'إلى (عربي)' : 'To (AR)'} value={p.cil.to_ar} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ReadOnlyField label={isRTL ? 'الموضوع' : 'Subject'} value={p.cil.subject || p.cil.subject_en} />
                    <ReadOnlyField label={isRTL ? 'الموضوع (عربي)' : 'Subject (AR)'} value={p.cil.subject_ar} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[var(--muted-text)] mb-1">{isRTL ? 'المحتوى' : 'Content'}</label>
                      <div className="p-4 rounded-lg bg-transparent border border-gray-200 dark:border-gray-700 text-sm whitespace-pre-wrap min-h-[100px]">
                        {p.cil.content || p.cil.content_en || '-'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--muted-text)] mb-1">{isRTL ? 'المحتوى (عربي)' : 'Content (AR)'}</label>
                      <div className="p-4 rounded-lg bg-transparent border border-gray-200 dark:border-gray-700 text-sm whitespace-pre-wrap min-h-[100px]">
                        {p.cil.content_ar || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ReadOnlyField label={isRTL ? 'التوقيع' : 'Signature'} value={p.cil.signature || p.cil.signature_en} />
                    <ReadOnlyField label={isRTL ? 'التوقيع (عربي)' : 'Signature (AR)'} value={p.cil.signature_ar} />
                  </div>
                  {Array.isArray(p.cil.attachments) && p.cil.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {p.cil.attachments.map((att, i) => {
                        const fileName = typeof att === 'string' ? att.split('/').pop() : (att.name || 'Attachment');
                        const fileUrl = typeof att === 'string' ? att : '#';
                        return (
                          <a
                            key={i}
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                          >
                            <FaPaperclip className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                            <span className="text-sm font-medium text-blue-600 truncate flex-1">
                              {fileName}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--muted-text)] flex items-center gap-2">
                      <FaPaperclip className="opacity-30" />
                      {isRTL ? 'لا توجد مرفقات' : 'No attachments'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--muted-text)]">{isRTL ? 'لا توجد بيانات' : 'No CIL data'}</div>
              )}
            </div>
          )}

          {activeTab === 'publish' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <SectionTitle>{isRTL ? 'معلومات النشر' : 'Publishing Info'}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ReadOnlyField label={isRTL ? 'تاريخ التسليم' : 'Delivery Date'} value={p.deliveryDate} />
                  <ReadOnlyField label={isRTL ? 'البريد الإلكتروني للتواصل' : 'Contact Email'} value={p.contactEmail} />
                  <ReadOnlyField label={isRTL ? 'هاتف التواصل' : 'Contact Phone'} value={p.contactPhone} />
                  <ReadOnlyField label={isRTL ? 'اسم جهة الاتصال' : 'Contact Name'} value={p.contactName} />
                  <ReadOnlyField label={isRTL ? 'باقة التسويق' : 'Marketing Package'} value={p.marketingPackage} />
                </div>
              </div>

              {((p.channels && p.channels.length > 0) || (p.publish_data?.channels && p.publish_data.channels.length > 0)) && (
                <div className="space-y-4">
                  <SectionTitle>{isRTL ? 'قنوات النشر' : 'Publishing Channels'}</SectionTitle>
                  <div className="grid grid-cols-1 gap-3">
                    {(p.channels || p.publish_data?.channels || []).map((ch, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${ch.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                          <div>
                            <span className="font-semibold text-sm">{ch.name}</span>
                            <span className="text-xs text-[var(--muted-text)] ml-2">({ch.type})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {ch.selectedPackage && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 rounded text-[10px] font-bold uppercase tracking-wider">
                              {ch.selectedPackage}
                            </span>
                          )}
                          <span className={`text-xs font-medium ${ch.status === 'Live' ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {ch.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
        {preview.index >= 0 && (
          <div className="absolute inset-0 z-[220] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={closePreview} />
            <div className="relative z-[230] max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3">
              <img src={preview.list[preview.index]} alt="preview" className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl border border-gray-200 dark:border-gray-700" />
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
      </div>
    </div>
  )
}
