import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../shared/context/ThemeProvider'
import { api } from '../utils/api'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-markup'
import 'prismjs/themes/prism.css'
import { FaGlobe, FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaCode, FaPaintBrush, FaImages, FaShareAlt, FaChartPie, FaCheck, FaTimes } from 'react-icons/fa'

export default function AddLandingPage({ isOpen, onClose, onAdd, initialData = null }) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [campaigns, setCampaigns] = useState([])
  const [sources, setSources] = useState([])

  useEffect(() => {
    if (isOpen) {
        api.get('/api/campaigns').then(res => {
            setCampaigns(res.data.data || [])
        }).catch(err => console.error('Failed to fetch campaigns', err))

        api.get('/api/sources').then(res => {
            setSources(res.data || [])
        }).catch(err => console.error('Failed to fetch sources', err))
    }
  }, [isOpen])

  const [form, setForm] = useState({
    title: '',
    source: '',
    email: '',
    phone: '',
    url: '',
    description: '',
    media: [],
    logo: null,
    cover: null,
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    campaign_id: '',
    headerScript: '',
    headerScriptEnabled: true,
    bodyScript: '',
    bodyScriptEnabled: true,
    pixelId: '',
    isPixelEnabled: true,
    gtmId: '',
    isGtmEnabled: true,
    theme: 'theme1',
  })

  // Auto-generate URL from Title (Only if creating new)
  useEffect(() => {
    if (initialData) return // Don't auto-generate if editing

    if (!form.title) {
      setForm(prev => ({ ...prev, url: '' }))
      return
    }
    const slug = form.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
      .replace(/^-+|-+$/g, '') // Trim dashes
    
    // Assume system domain is current origin + pathname + /#/
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.href.split('#')[0].replace(/\/$/, '') 
      : 'https://app.besouhoula.com'
    setForm(prev => ({ ...prev, url: `${baseUrl}/#/p/${slug}` }))
  }, [form.title, initialData])

  // Reset/Populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
            title: initialData.title || '',
            source: initialData.source || '',
            email: initialData.email || '',
            phone: initialData.phone || '',
            url: initialData.url || '',
            description: initialData.description || '',
            media: initialData.media || [], // Existing media URLs or objects
            logo: initialData.logo || null,
            cover: initialData.cover || null,
            facebook: initialData.facebook || '',
            instagram: initialData.instagram || '',
            twitter: initialData.twitter || '',
            linkedin: initialData.linkedin || '',
            campaign_id: initialData.campaignId || '',
            headerScript: initialData.headerScript || '',
            headerScriptEnabled: initialData.headerScriptEnabled !== false, // Default true
            bodyScript: initialData.bodyScript || '',
            bodyScriptEnabled: initialData.bodyScriptEnabled !== false, // Default true
            pixelId: initialData.pixelId || '',
            isPixelEnabled: initialData.isPixelEnabled !== false,
            gtmId: initialData.gtmId || '',
            isGtmEnabled: initialData.isGtmEnabled !== false,
            theme: initialData.theme || 'theme1',
        })
      } else {
        setForm({
            title: '',
            source: '',
            email: '',
            phone: '',
            url: '',
            description: '',
            media: [],
            logo: null,
            cover: null,
            facebook: '',
            instagram: '',
            twitter: '',
            linkedin: '',
            campaign_id: '',
            headerScript: '',
            headerScriptEnabled: true,
            bodyScript: '',
            bodyScriptEnabled: true,
            pixelId: '',
            isPixelEnabled: true,
            gtmId: '',
            isGtmEnabled: true,
            theme: 'theme1',
        })
      }
      setActiveTab('general')
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || [])
    setForm(prev => ({ ...prev, media: [...(prev.media || []), ...files] }))
  }

  const removeMedia = (index) => {
      setForm(prev => ({
          ...prev,
          media: prev.media.filter((_, i) => i !== index)
      }))
  }

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (file) setForm(prev => ({ ...prev, logo: file }))
  }

  const handleCover = (e) => {
    const file = e.target.files[0]
    if (file) setForm(prev => ({ ...prev, cover: file }))
  }

  const getPreviewUrl = (fileOrUrl) => {
    if (!fileOrUrl) return null
    if (typeof fileOrUrl === 'string') {
        // Ensure it's a full URL if it's a relative path
        if (fileOrUrl.startsWith('/storage')) {
             return `${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}${fileOrUrl}`
        }
        return fileOrUrl
    }
    return URL.createObjectURL(fileOrUrl)
  }

  const ensureUrl = (str) => {
      if (!str) return '';
      if (str.startsWith('http://') || str.startsWith('https://')) return str;
      return `https://${str}`;
  }

  const onSave = async () => {
    if (saving) return
    setSaving(true)
    
    try {
      const formData = new FormData()
      if (initialData) {
          formData.append('_method', 'PUT')
      }
      formData.append('title', form.title)
      if (form.source) formData.append('source', form.source)
      if (form.campaign_id && form.campaign_id !== '') formData.append('campaign_id', form.campaign_id)
      if (form.email) formData.append('email', form.email)
      if (form.phone) formData.append('phone', form.phone)
      if (form.theme) formData.append('theme', form.theme)
      if (form.description) formData.append('description', form.description)
      if (form.facebook) formData.append('facebook', ensureUrl(form.facebook))
      if (form.instagram) formData.append('instagram', ensureUrl(form.instagram))
      if (form.twitter) formData.append('twitter', ensureUrl(form.twitter))
      if (form.linkedin) formData.append('linkedin', ensureUrl(form.linkedin))
      
      // Scripts & Tracking
      if (form.pixelId) formData.append('pixel_id', form.pixelId)
      formData.append('is_pixel_enabled', form.isPixelEnabled ? '1' : '0')
      
      if (form.gtmId) formData.append('gtm_id', form.gtmId)
      formData.append('is_gtm_enabled', form.isGtmEnabled ? '1' : '0')
      
      // Header Script
      if (form.headerScript) formData.append('header_script', form.headerScript)
      formData.append('header_script_enabled', form.headerScriptEnabled ? '1' : '0')
      
      // Body Script
      if (form.bodyScript) formData.append('body_script', form.bodyScript)
      formData.append('body_script_enabled', form.bodyScriptEnabled ? '1' : '0')

      formData.append('update_media', '1')
      
      // Validate File Sizes (Client Side)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      
      if (form.logo && typeof form.logo !== 'string') {
        if (form.logo.size > 2 * 1024 * 1024) throw new Error(isRTL ? 'حجم الشعار يجب أن يكون أقل من 2 ميجابايت' : 'Logo size must be less than 2MB');
        formData.append('logo', form.logo)
      }
      if (form.cover && typeof form.cover !== 'string') {
        if (form.cover.size > 2 * 1024 * 1024) throw new Error(isRTL ? 'حجم الغلاف يجب أن يكون أقل من 2 ميجابايت' : 'Cover size must be less than 2MB');
        formData.append('cover', form.cover)
      }
      
      // Append existing media (objects with path) to retain them
      if (form.media && form.media.length > 0) {
          form.media.forEach((file) => {
              if (file && ! (file instanceof File) && file.path) {
                  formData.append('existing_media[]', file.path)
              } else if (typeof file === 'string') {
                  formData.append('existing_media[]', file)
              }
          })
      }
      
      if (form.media && form.media.length > 0) {
          for (const file of form.media) {
              if (typeof file !== 'string' && file instanceof File) {
                  if (file.size > MAX_FILE_SIZE) {
                      throw new Error(isRTL ? `حجم الملف ${file.name} يتجاوز 10 ميجابايت` : `File ${file.name} exceeds 10MB limit`);
                  }
                  // Use media[] to let Laravel handle indices
                  formData.append('media[]', file)
              }
          }
      }

      const url = initialData ? `/api/landing-pages/${initialData.id}` : '/api/landing-pages'

      await api.post(url, formData, {
          headers: {
              'Content-Type': 'multipart/form-data'
          }
      })
      
      if (onAdd) {
        onAdd()
      }

      setSaving(false)
      onClose()
    } catch (error) {
      console.error('Error saving landing page:', error)
      setSaving(false)
      const msg = error.response?.data?.message || error.message || 'Failed to save landing page.'
      if (error.response?.data?.errors) {
         const errors = Object.values(error.response.data.errors).flat().join('\n')
         alert(`Validation Error:\n${errors}`)
      } else {
         alert(msg)
      }
    }
  }

  return (
    <div className={`fixed inset-0 z-[2000] ${isRTL ? 'rtl' : 'ltr'} flex items-start justify-center pt-20`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div 
        className="relative max-w-2xl w-full mx-4 rounded-2xl shadow-2xl border flex flex-col max-h-[85vh] transition-all duration-300 animate-in fade-in zoom-in-95"
        style={{
          backgroundColor: isDark ? '#172554' : 'white', // Matches project modal theme (e.g. BrokersImportModal)
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
              <FaGlobe className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold">
              {isRTL 
                ? (initialData ? 'تعديل صفحة هبوط' : 'إنشاء صفحة هبوط') 
                : (initialData ? 'Edit Landing Page' : 'Create Landing Page')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar">
            {['general', 'social', 'description', 'media', 'script'].map(tab => (
              <button
                key={tab}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab 
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'general' && (isRTL ? 'عام' : 'General')}
                {tab === 'social' && (isRTL ? 'التواصل الاجتماعي' : 'Social Media')}
                {tab === 'description' && (isRTL ? 'الوصف' : 'Description')}
                {tab === 'media' && (isRTL ? 'الوسائط' : 'Media')}
                {tab === 'script' && (isRTL ? 'الأكواد' : 'Script')}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'general' && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isRTL ? 'text-right' : ''}`}>
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">{isRTL ? 'العنوان' : 'Title'}</label>
                <input 
                  name="title" 
                  value={form.title} 
                  onChange={handleChange} 
                  className="input w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder={isRTL ? 'أدخل العنوان' : 'Enter title'} 
                />
              </div>

              {/* Source */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">{isRTL ? 'المصدر' : 'Source'}</label>
                <select 
                  name="source" 
                  value={form.source} 
                  onChange={handleChange} 
                  className="select w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">{isRTL ? 'اختر المصدر' : 'Select Source'}</option>
                  {sources.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Linked Campaign */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">{isRTL ? 'الحملة المرتبطة' : 'Linked Campaign'}</label>
                <select 
                  name="campaign_id" 
                  value={form.campaign_id} 
                  onChange={handleChange} 
                  className="select w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">{isRTL ? 'اختر حملة' : 'Select Campaign'}</option>
                  {campaigns.map(camp => (
                    <option key={camp.id} value={camp.id}>{camp.name}</option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">{isRTL ? 'البريد الإلكتروني' : 'Email'}</label>
                <input 
                  type="email"
                  name="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  className="input w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="example@domain.com" 
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">{isRTL ? 'رقم الهاتف' : 'Phone Number'}</label>
                <input 
                  name="phone" 
                  value={form.phone} 
                  onChange={handleChange} 
                  className="input w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="+1 234 567 890" 
                />
              </div>

              {/* Theme Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">{isRTL ? 'القالب' : 'Theme'}</label>
                <select 
                  name="theme" 
                  value={form.theme} 
                  onChange={handleChange} 
                  className="select w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="theme1">{isRTL ? 'فاتح' : 'Light'}</option>
                  <option value="theme2">{isRTL ? 'داكن' : 'Dark'}</option>
                </select>
              </div>

              {/* URL */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">{isRTL ? 'الرابط (تلقائي)' : 'URL (Auto-generated)'}</label>
                <input 
                  name="url" 
                  value={form.url} 
                  readOnly
                  disabled
                  className="input w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-500 cursor-not-allowed select-all" 
                  placeholder={isRTL ? 'سيتم إنشاء الرابط تلقائياً...' : 'URL will be generated automatically...'} 
                />
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isRTL ? 'text-right' : ''}`}>
              {/* Facebook */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">Facebook</label>
                <input 
                  name="facebook" 
                  value={form.facebook} 
                  onChange={handleChange} 
                  className="input w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="https://facebook.com/..." 
                />
              </div>

              {/* Instagram */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">Instagram</label>
                <input 
                  name="instagram" 
                  value={form.instagram} 
                  onChange={handleChange} 
                  className="input w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="https://instagram.com/..." 
                />
              </div>

              {/* Twitter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">Twitter / X</label>
                <input 
                  name="twitter" 
                  value={form.twitter} 
                  onChange={handleChange} 
                  className="input w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="https://twitter.com/..." 
                />
              </div>

              {/* LinkedIn */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">LinkedIn</label>
                <input 
                  name="linkedin" 
                  value={form.linkedin} 
                  onChange={handleChange} 
                  className="input w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="https://linkedin.com/..." 
                />
              </div>
            </div>
          )}

          {activeTab === 'description' && (
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">{isRTL ? 'وصف قصير' : 'Short Description'}</label>
                <textarea 
                  name="description" 
                  value={form.description} 
                  onChange={handleChange} 
                  className="input w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[140px]" 
                  placeholder={isRTL ? 'وصف قصير' : 'Short Description'}
                ></textarea>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="grid grid-cols-1 gap-4">
              {/* Logo Upload */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">{isRTL ? 'الشعار (Logo)' : 'Logo'}</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-800 overflow-hidden group">
                    {form.logo ? (
                      <img src={getPreviewUrl(form.logo)} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-xs text-center px-2">{isRTL ? 'رفع الشعار' : 'Upload Logo'}</span>
                    )}
                    <input 
                      type="file" 
                      onChange={handleLogo} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept="image/*" 
                    />
                  </div>
                  <div className="text-xs text-[var(--muted-text)]">
                    {isRTL ? 'يوصى بحجم 512x512 بكسل' : 'Recommended 512x512px'}
                    <br />
                    {form.logo && <span className="text-blue-500 font-medium">{form.logo.name || 'Current Logo'}</span>}
                  </div>
                </div>
              </div>

              {/* Cover Photo Upload */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">{isRTL ? 'صورة الغلاف' : 'Cover Photo'}</label>
                <div className="relative w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-800 overflow-hidden">
                  {form.cover ? (
                    <img src={getPreviewUrl(form.cover)} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 text-sm">{isRTL ? 'اضغط لرفع صورة الغلاف' : 'Click to upload Cover Photo'}</span>
                  )}
                  <input 
                    type="file" 
                    onChange={handleCover} 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept="image/*" 
                  />
                </div>
                {form.cover && <div className="text-xs text-blue-500 mt-1">{form.cover.name || 'Current Cover'}</div>}
              </div>

              {/* Other Media */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--muted-text)] font-medium">{isRTL ? 'وسائط أخرى' : 'Other Media'}</label>
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFiles} 
                  className="input w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  accept="image/*,video/*" 
                />
              </div>
              {form.media.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                  {form.media.map((f, idx) => (
                    <div key={idx} className="card p-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg relative group">
                      <button 
                        type="button"
                        onClick={() => removeMedia(idx)} 
                        className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-full shadow-sm"
                        title="Remove"
                      >
                          <FaTimes size={12} />
                      </button>
                      <div className="font-medium truncate pr-6">{f.name || (typeof f === 'string' ? f.split('/').pop() : (f.path ? f.path.split('/').pop() : 'Unknown File'))}</div>
                      <div className="text-[var(--muted-text)]">{(Number(f.size || 0)/1024).toFixed(1)} KB</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'script' && (
            <div className="grid grid-cols-1 gap-6">
              {/* Standard Integrations */}
              <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-100 border-b dark:border-gray-700 pb-2">
                    {isRTL ? 'التكاملات القياسية (موصى به)' : 'Standard Integrations (Recommended)'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Meta Pixel ID */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-[var(--muted-text)] font-medium">Meta Pixel ID</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="isPixelEnabled" 
                                    checked={form.isPixelEnabled} 
                                    onChange={handleChange} 
                                    className="sr-only peer"
                                />
                                <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <input 
                        name="pixelId" 
                        value={form.pixelId} 
                        onChange={handleChange} 
                        disabled={!form.isPixelEnabled}
                        className={`input w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm ${!form.isPixelEnabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}
                        placeholder="e.g. 1234567890" 
                        />
                    </div>
                    {/* GTM ID */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-[var(--muted-text)] font-medium">Google Tag Manager ID (GTM)</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="isGtmEnabled" 
                                    checked={form.isGtmEnabled} 
                                    onChange={handleChange} 
                                    className="sr-only peer"
                                />
                                <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <input 
                        name="gtmId" 
                        value={form.gtmId} 
                        onChange={handleChange} 
                        disabled={!form.isGtmEnabled}
                        className={`input w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm ${!form.isGtmEnabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}
                        placeholder="e.g. GTM-XXXXXX" 
                        />
                    </div>
                  </div>
              </div>

              {/* Advanced Custom Scripts */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-100 border-b dark:border-gray-700 pb-2 flex items-center justify-between">
                    <span>{isRTL ? 'أكواد مخصصة (متقدم)' : 'Custom Scripts (Advanced)'}</span>
                    <span className="text-xs font-normal text-amber-500 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {isRTL ? 'استخدم الأكواد الموثوقة فقط' : 'Use only trusted scripts'}
                    </span>
                </h4>

                {/* Header Script */}
                <div className="flex flex-col gap-2 p-4 bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-[var(--muted-text)] font-medium flex items-center gap-2">
                            {isRTL ? 'كود الرأس (Header)' : 'Header Script'}
                            {form.headerScript && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                    form.headerScript.trim().startsWith('<script') && form.headerScript.trim().endsWith('</script>')
                                    ? 'text-green-700 border-green-200 bg-green-900/30 dark:text-green-400 dark:border-green-800' 
                                    : 'text-amber-700 border-amber-200 bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                }`}>
                                    {form.headerScript.trim().startsWith('<script') && form.headerScript.trim().endsWith('</script>') 
                                      ? (isRTL ? 'كود صالح' : 'Valid Script') 
                                      : (isRTL ? 'تحقق من الوسوم' : 'Check Tags')}
                                </span>
                            )}
                        </label>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium transition-colors ${form.headerScriptEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                {form.headerScriptEnabled ? (isRTL ? 'مفعل' : 'Enabled') : (isRTL ? 'معطل' : 'Disabled')}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="headerScriptEnabled" 
                                    checked={form.headerScriptEnabled} 
                                    onChange={handleChange} 
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                    <div className="relative group">
                        <Editor
                        value={form.headerScript || ''}
                        onValueChange={code => setForm(prev => ({ ...prev, headerScript: code }))}
                        highlight={code => highlight(code, languages.markup, 'markup')}
                        padding={12}
                        disabled={!form.headerScriptEnabled}
                        className={`min-h-[140px] font-mono text-xs leading-relaxed border rounded-lg transition-all duration-200 ${
                            !form.headerScriptEnabled 
                            ? 'bg-gray-800/50 opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700 grayscale' 
                            : 'bg-[#0d1117] border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 shadow-sm'
                        }`}
                        style={{
                            fontFamily: '"Fira code", "Fira Mono", monospace',
                            fontSize: 12,
                        }}
                        placeholder="<!-- <script>...</script> -->"
                        />
                        {!form.headerScriptEnabled && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-medium text-gray-500 shadow-sm border border-gray-200 dark:border-gray-700">
                                    {isRTL ? 'تم تعطيل الكود' : 'Script Disabled'}
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 px-1">
                        {isRTL ? 'يتم حقن هذا الكود داخل وسم <head>' : 'Injected inside <head> tag'}
                    </p>
                </div>

                {/* Body Script */}
                <div className="flex flex-col gap-2 p-4 bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-[var(--muted-text)] font-medium flex items-center gap-2">
                            {isRTL ? 'كود الجسم (Body)' : 'Body Script'}
                            {form.bodyScript && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                    form.bodyScript.trim().startsWith('<script') && form.bodyScript.trim().endsWith('</script>')
                                    ? ' text-green-700 border-green-200 bg-green-900/30 dark:text-green-400 dark:border-green-800' 
                                    : ' text-amber-700 border-amber-200 bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                }`}>
                                    {form.bodyScript.trim().startsWith('<script') && form.bodyScript.trim().endsWith('</script>') 
                                      ? (isRTL ? 'كود صالح' : 'Valid Script') 
                                      : (isRTL ? 'تحقق من الوسوم' : 'Check Tags')}
                                </span>
                            )}
                        </label>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium transition-colors ${form.bodyScriptEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                {form.bodyScriptEnabled ? (isRTL ? 'مفعل' : 'Enabled') : (isRTL ? 'معطل' : 'Disabled')}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="bodyScriptEnabled" 
                                    checked={form.bodyScriptEnabled} 
                                    onChange={handleChange} 
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                    <div className="relative group">
                        <Editor
                        value={form.bodyScript || ''}
                        onValueChange={code => setForm(prev => ({ ...prev, bodyScript: code }))}
                        highlight={code => highlight(code, languages.markup, 'markup')}
                        padding={12}
                        disabled={!form.bodyScriptEnabled}
                        className={`min-h-[140px] font-mono text-xs leading-relaxed border rounded-lg transition-all duration-200 ${
                            !form.bodyScriptEnabled 
                            ? 'bg-gray-800/50 opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700 grayscale' 
                            : 'bg-[#0d1117] border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 shadow-sm'
                        }`}
                        style={{
                            fontFamily: '"Fira code", "Fira Mono", monospace',
                            fontSize: 12,
                        }}
                        placeholder="<!-- <script>...</script> -->"
                        />
                        {!form.bodyScriptEnabled && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-medium text-gray-500 shadow-sm border border-gray-200 dark:border-gray-700">
                                    {isRTL ? 'تم تعطيل الكود' : 'Script Disabled'}
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 px-1">
                        {isRTL ? 'يتم حقن هذا الكود قبل إغلاق </body>' : 'Injected before </body> closing tag'}
                    </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div 
          className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t transition-colors duration-200"
          style={{ borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}
        >
          <button 
            type="button" 
            className="btn btn-ghost hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" 
            onClick={onClose}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button 
            type="button" 
            className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md inline-flex items-center gap-2 px-6" 
            onClick={onSave} 
            disabled={saving}
          >
            {saving ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
            <span>{saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? (initialData ? 'تحديث' : 'إنشاء') : (initialData ? 'Update' : 'Create'))}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
