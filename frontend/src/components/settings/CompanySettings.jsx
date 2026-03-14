import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../shared/context/ThemeProvider'
import { useAppState } from '../../shared/context/AppStateProvider'
import { api } from '@utils/api'
import { Calendar, TrendingUp, Info, MapPin, Target, Upload, Building, Activity, Globe, FileText, CreditCard, Clock, Lock, Phone, Hash } from 'lucide-react'

export default function CompanySettings() {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()
  const { fetchCompanyInfo, crmSettings } = useAppState()
  const [activeTab, setActiveTab] = useState('general')
  const [companyTargets, setCompanyTargets] = useState({
    monthly: 0,
    quarterly: 0,
    yearly: 0
  })

  const currencySymbol = crmSettings?.defaultCurrency || crmSettings?.default_currency || 'SAR'

  useEffect(() => {
    const fetchUsersAndCalculateTargets = async () => {
      try {
        const res = await api.get('/api/users')
        const users = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        
        let monthly = 0
        let quarterly = 0
        let yearly = 0
        
        users.forEach(user => {
            monthly += parseFloat(user.monthly_target || 0)
            quarterly += parseFloat(user.quarterly_target || 0)
            yearly += parseFloat(user.yearly_target || 0)
        })
        
        setCompanyTargets({
            monthly: monthly.toFixed(2),
            quarterly: quarterly.toFixed(2),
            yearly: yearly.toFixed(2)
        })
      } catch (err) {
        console.error('Failed to fetch users for targets', err)
      }
    }
    
    if (activeTab === 'targets') {
        fetchUsersAndCalculateTargets()
    }
  }, [activeTab])

  // Root domain for subdomain display
  const rootDomain = useMemo(() => {
    try {
      const appUrl = import.meta.env.VITE_APP_URL;
      if (appUrl) {
        const u = new URL(appUrl);
        return u.host;
      }
    } catch {}
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const parts = host.split('.');
      if (parts[0] === 'www') parts.shift();
      return parts.join('.');
    }
    return 'besouholacrm.net';
  }, []);

  // Initial values
  const initial = useMemo(() => ({
    name: '',
    description: '',
    type: '',
    slug: '',
    subscriptionPlan: '',
    startDate: '',
    endDate: '',
    status: '',
    logo: '',
    logoPreview: '',
    country: '',
    city: '',
    state: '',
    addressLine1: '',
    addressLine2: '',
    phone: '',
    taxId: '',
    websiteUrl: '',
  }), [])

  const [savedValues, setSavedValues] = useState(initial)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('')
  const [slug, setSlug] = useState('')
  const [subscriptionPlan, setSubscriptionPlan] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')
  const [logo, setLogo] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [phone, setPhone] = useState('')
  const [taxId, setTaxId] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  // Fetch Company Data
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await api.get('/api/company-info')
        const tenant = res.data.tenant || {}
        const profile = tenant.profile || {}

        const newValues = {
          name: tenant.name || '',
          description: profile.description || '',
          type: tenant.company_type || '',
          slug: tenant.slug || '',
          subscriptionPlan: tenant.subscription_plan || '',
          startDate: tenant.start_date || '',
          endDate: tenant.end_date || '',
          status: tenant.status || '',
          logo: '',
          logoPreview: profile.logo_url || '',
          country: tenant.country || '',
          city: tenant.city || '',
          state: tenant.state || '',
          addressLine1: tenant.address_line_1 || '',
          addressLine2: tenant.address_line_2 || '',
          phone: profile.phone || '',
          taxId: profile.tax_id || '',
          websiteUrl: tenant.website_url || '',
        }

        setSavedValues(newValues)

        // Update Form State
        setName(newValues.name)
        setDescription(newValues.description)
        setType(newValues.type)
        setSlug(newValues.slug)
        setSubscriptionPlan(newValues.subscriptionPlan)
        setStartDate(newValues.startDate)
        setEndDate(newValues.endDate)
        setStatus(newValues.status)
        setLogoPreview(newValues.logoPreview)
        setCountry(newValues.country)
        setCity(newValues.city)
        setState(newValues.state)
        setAddressLine1(newValues.addressLine1)
        setAddressLine2(newValues.addressLine2)
        setPhone(newValues.phone || '')
        setTaxId(newValues.taxId || '')
        setWebsiteUrl(newValues.websiteUrl || '')

      } catch (err) {
        console.error('Failed to fetch company info', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCompany()
  }, [])

  const onLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert(t('File size exceeds 2MB limit'))
      return
    }

    setLogo(file)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result || '')
    reader.readAsDataURL(file)
  }

  const hasChanges = useMemo(() => {
    if (description !== savedValues.description) return true
    if (logo !== savedValues.logo) return true
    if (country !== savedValues.country) return true
    if (city !== savedValues.city) return true
    if (state !== savedValues.state) return true
    if (addressLine1 !== savedValues.addressLine1) return true
    if (addressLine2 !== savedValues.addressLine2) return true
    if (phone !== savedValues.phone) return true
    if (taxId !== savedValues.taxId) return true
    if (websiteUrl !== savedValues.websiteUrl) return true
    return false
  }, [
    savedValues,
    description, logo, country, city, state, addressLine1, addressLine2, phone, taxId, websiteUrl
  ])

  const saveChanges = async () => {
    if (!hasChanges) return

    setSaving(true)

    try {
      const formData = new FormData()
      formData.append('description', description)
      formData.append('country', country)
      formData.append('city', city)
      formData.append('state', state)
      formData.append('address_line_1', addressLine1)
      formData.append('address_line_2', addressLine2)
      formData.append('phone', phone)
      formData.append('tax_id', taxId)
      formData.append('website_url', websiteUrl)

      if (logo instanceof File) {
        formData.append('logo', logo)
      }

      const res = await api.post('/api/company-info', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const tenant = res.data.tenant
      const profile = tenant.profile || {}

      const currentValues = {
        ...savedValues,
        description: profile.description || '',
        phone: profile.phone || '',
        taxId: profile.tax_id || '',
        websiteUrl: tenant.website_url || websiteUrl,
        logo: '',
        logoPreview: profile.logo_url || logoPreview,
        country: tenant.country || '',
        city: tenant.city || '',
        state: tenant.state || '',
        addressLine1: tenant.address_line_1 || '',
        addressLine2: tenant.address_line_2 || '',
      }

      setSavedValues(currentValues)
      setLogo('') // Clear file input
      if (profile.logo_url) setLogoPreview(profile.logo_url)

      await fetchCompanyInfo()
      alert(t('Company settings updated successfully'))
    } catch (err) {
      console.error('Failed to save company settings', err)
      alert(t('Failed to save changes'))
    } finally {
      setSaving(false)
    }
  }

  const resetChanges = () => {
    setDescription(savedValues.description)
    setLogo(savedValues.logo)
    setLogoPreview(savedValues.logoPreview)
    setCountry(savedValues.country)
    setCity(savedValues.city)
    setState(savedValues.state)
    setAddressLine1(savedValues.addressLine1)
    setAddressLine2(savedValues.addressLine2)
    setPhone(savedValues.phone)
    setTaxId(savedValues.taxId)
    setWebsiteUrl(savedValues.websiteUrl)
  }

  const formatDate = (dateString) => {
    if (String(subscriptionPlan).toUpperCase() === 'LIFETIME' && (!dateString || activeTab === 'general')) {
       // If it is lifetime, end date is effectively "Lifetime" or "N/A" depending on context, user asked for "Lifetime" display? 
       // User said "When subscription is lifetime, appear here as lifetime not N/A".
       // Assuming this is for the subscription period display.
       return isArabic ? 'مدى الحياة' : 'Lifetime';
    }
    if (!dateString) return t('N/A')
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl glass-panel w-full overflow-hidden shadow-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/20 dark:border-gray-700">

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        
        {/* Tabs */}
        <div className="w-full mb-8">
          <div className="flex p-1 bg-transparent rounded-xl border border-gray-200/50 dark:border-gray-700/50 w-full md:w-fit backdrop-blur-sm">
            <button 
              type="button" 
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300 font-medium ${
                activeTab === 'general' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`} 
              onClick={()=>setActiveTab('general')}
            >
              <Info size={18} className={activeTab === 'general' ? 'animate-pulse' : ''} />
              <span>{t('General Info')}</span>
            </button>
            <button 
              type="button" 
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300 font-medium ${
                activeTab === 'location' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`} 
              onClick={()=>setActiveTab('location')}
            >
              <MapPin size={18} className={activeTab === 'location' ? 'animate-pulse' : ''} />
              <span>{t('Location')}</span>
            </button>
            <button 
              type="button" 
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300 font-medium ${
                activeTab === 'targets' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`} 
              onClick={()=>setActiveTab('targets')}
            >
              <Target size={18} className={activeTab === 'targets' ? 'animate-pulse' : ''} />
              <span>{t('Company Targets')}</span>
            </button>
          </div>
        </div>

        {activeTab === 'general' && (
          <>
          <div className="flex flex-col max-w-5xl mx-auto animate-in fade-in duration-300 p-4 sm:p-6 space-y-8">
            
            {/* Top Section: Identity & Web Presence */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              
              {/* Logo Upload - Compact & Focused */}
              <div className="w-full md:w-auto flex justify-center md:justify-start">
                <label className="group relative flex flex-col items-center justify-center w-40 h-40 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-transparent hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer overflow-hidden shadow-sm">
                   <div className="w-full h-full flex items-center justify-center p-2">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Company Logo" className="w-full h-full object-contain rounded-xl" loading="lazy" />
                    ) : (
                      <Building className="text-gray-300 dark:text-gray-500 group-hover:scale-110 transition-transform duration-300" size={48} />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[1px]">
                    <Upload className="text-white mb-1" size={24} />
                    <span className="text-xs font-semibold text-white">{t('Change Logo')}</span>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={onLogoChange} />
                </label>
              </div>

              {/* Identity Fields Grid */}
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                    {t('Company Name')} <Lock size={12} />
                  </label>
                  <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-transparent">
                    <Building className="text-gray-400" size={18} />
                    <span className="text-theme-text font-semibold text-lg truncate">{name}</span>
                  </div>
                </div>

                {/* Company Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                    {t('Company Type')} <Lock size={12} />
                  </label>
                  <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-transparent">
                    <Activity className="text-gray-400" size={18} />
                    <span className="text-theme-text font-medium truncate">{type || t('Not Specified')}</span>
                  </div>
                </div>

                {/* Website URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
                    {t('Website URL')}
                  </label>
                  <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-transparent focus-within:ring-2 ring-blue-500/20 focus-within:border-blue-500/50 transition-all hover:border-blue-500/30 group">
                    <Globe className="text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium"
                      value={websiteUrl}
                      onChange={e => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>

                {/* Subdomain */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                    {t('Subdomain')} <Lock size={12} />
                  </label>
                  <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-transparent">
                    <Globe className="text-gray-400" size={18} />
                    <span className="text-theme-text font-medium truncate dir-ltr">{slug ? `${slug}.${rootDomain}` : t('Not Assigned')}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Middle Section: Description */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-theme-text ml-1 flex items-center gap-2">
                <FileText className="text-blue-500" size={18} />
                {t('Description')}
              </label>
              <div className="relative group">
                <textarea
                  className="w-full bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 focus:ring-4 ring-blue-500/10 focus:border-blue-500/50 transition-all min-h-[120px] resize-none"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('Enter company description...')}
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none bg-white/50 dark:bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm">
                  {description.length} chars
                </div>
              </div>
            </div>

            {/* Bottom Section: Subscription Details (Visual Card) */}
            <div className="bg-transparent p-6">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CreditCard size={16} />
                {t('Subscription Details')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Current Plan */}
                <div className="flex flex-col gap-1">
                   <span className="text-xs text-gray-400">{t('Current Plan')}</span>
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <CreditCard size={16} />
                      </div>
                      <span className="font-bold text-theme-text text-lg uppercase">{subscriptionPlan || t('Free Tier')}</span>
                   </div>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1">
                   <span className="text-xs text-gray-400">{t('Status')}</span>
                   <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                        <Activity size={16} />
                      </div>
                      <span className={`font-bold text-lg capitalize ${status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {status || t('Inactive')}
                      </span>
                   </div>
                </div>

                 {/* Period */}
                <div className="flex flex-col gap-1">
                   <span className="text-xs text-gray-400">{t('Subscription Period')}</span>
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Clock size={16} />
                      </div>
                      <span className="font-medium text-theme-text text-sm">
                        {formatDate(startDate)} - {formatDate(endDate)}
                      </span>
                   </div>
                </div>

              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-6 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center justify-end gap-3 bg-transparent backdrop-blur-sm">
            <button
              onClick={resetChanges}
              disabled={!hasChanges || saving}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${!hasChanges
                ? 'text-gray-400 cursor-not-allowed bg-transparent'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
            >
              {t('Cancel')}
            </button>
            <button
              onClick={saveChanges}
              disabled={!hasChanges || saving}
              className={`px-8 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-blue-500/20 transition-all duration-200 flex items-center gap-2 ${!hasChanges || saving
                ? 'bg-blue-400 cursor-not-allowed opacity-70'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 active:scale-95'
                }`}
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>}
              {saving ? t('Saving...') : t('Save Changes')}
            </button>
          </div>
          </>
        )}

      {activeTab === 'location' && (
        <>
          <div className="flex flex-col items-center justify-center max-w-5xl mx-auto animate-in fade-in duration-300 p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
               
               {/* Location Details Header */}
               <div className="col-span-full pt-4 border-b border-gray-200/50 dark:border-gray-700/50 pb-4 mb-2">
                 <h3 className="text-lg font-semibold text-theme-text flex items-center gap-2">
                   <MapPin className="text-theme" size={20} />
                   {t('Location Details')}
                 </h3>
               </div>

               {/* Country */}
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-theme-text ml-1 flex items-center gap-1">
                   {t('Country')}
                 </label>
                 <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-transparent focus-within:ring-4 ring-blue-500/10 focus-within:border-blue-500/50 transition-all shadow-sm hover:border-blue-500/30 group">
                   <Globe className="text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                   <input
                     className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium"
                     value={country}
                     onChange={(e) => setCountry(e.target.value)}
                     placeholder={t('Enter country')}
                     aria-label={t('Country')}
                   />
                 </div>
               </div>

               {/* City */}
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-theme-text ml-1 flex items-center gap-1">
                   {t('City')}
                 </label>
                 <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-transparent focus-within:ring-4 ring-blue-500/10 focus-within:border-blue-500/50 transition-all shadow-sm hover:border-blue-500/30 group">
                   <Building className="text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                   <input
                     className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium"
                     value={city}
                     onChange={(e) => setCity(e.target.value)}
                     placeholder={t('Enter city')}
                     aria-label={t('City')}
                   />
                 </div>
               </div>

               {/* Address Line 1 */}
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-theme-text ml-1 flex items-center gap-1">
                   {t('Address Line 1')}
                 </label>
                 <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-transparent focus-within:ring-4 ring-blue-500/10 focus-within:border-blue-500/50 transition-all shadow-sm hover:border-blue-500/30 group">
                   <MapPin className="text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                   <input
                     className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium"
                     value={addressLine1}
                     onChange={(e) => setAddressLine1(e.target.value)}
                     placeholder={t('Enter address line 1')}
                     aria-label={t('Address Line 1')}
                   />
                 </div>
               </div>

               {/* State */}
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-theme-text ml-1 flex items-center gap-1">
                   {t('State / Province')}
                 </label>
                 <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-transparent focus-within:ring-4 ring-blue-500/10 focus-within:border-blue-500/50 transition-all shadow-sm hover:border-blue-500/30 group">
                   <MapPin className="text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                   <input
                     className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium"
                     value={state}
                     onChange={(e) => setState(e.target.value)}
                     placeholder={t('Enter state or province')}
                     aria-label={t('State')}
                   />
                 </div>
               </div>

               {/* Address Line 2 */}
               <div className="space-y-2 col-span-full">
                 <label className="text-sm font-semibold text-theme-text ml-1 flex items-center gap-1">
                   {t('Address Line 2')}
                 </label>
                 <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-transparent focus-within:ring-4 ring-blue-500/10 focus-within:border-blue-500/50 transition-all shadow-sm hover:border-blue-500/30 group">
                   <MapPin className="text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                   <input
                     className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium"
                     value={addressLine2}
                     onChange={(e) => setAddressLine2(e.target.value)}
                     placeholder={t('Enter address line 2')}
                     aria-label={t('Address Line 2')}
                   />
                 </div>
               </div>

               {/* Phone */}
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-theme-text ml-1 flex items-center gap-1">
                   {t('Phone')}
                 </label>
                 <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-transparent focus-within:ring-4 ring-blue-500/10 focus-within:border-blue-500/50 transition-all shadow-sm hover:border-blue-500/30 group">
                   <Phone className="text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                   <input
                     className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium"
                     value={phone}
                     onChange={(e) => setPhone(e.target.value)}
                     placeholder={t('Enter company phone')}
                     aria-label={t('Phone')}
                   />
                 </div>
               </div>

               {/* Tax ID */}
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-theme-text ml-1 flex items-center gap-1">
                   {t('Tax ID')}
                 </label>
                 <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-transparent focus-within:ring-4 ring-blue-500/10 focus-within:border-blue-500/50 transition-all shadow-sm hover:border-blue-500/30 group">
                   <Hash className="text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                   <input
                     className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium"
                     value={taxId}
                     onChange={(e) => setTaxId(e.target.value)}
                     placeholder={t('Enter Tax ID')}
                     aria-label={t('Tax ID')}
                   />
                 </div>
               </div>

            </div>
          </div>
          {/* Footer Actions */}
          <div className="p-4 sm:p-6 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center justify-end gap-3 bg-transparent backdrop-blur-sm">
            <button
              onClick={resetChanges}
              disabled={!hasChanges || saving}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${!hasChanges
                ? 'text-gray-400 cursor-not-allowed bg-transparent'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
            >
              {t('Cancel')}
            </button>
            <button
              onClick={saveChanges}
              disabled={!hasChanges || saving}
              className={`px-8 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-blue-500/20 transition-all duration-200 flex items-center gap-2 ${!hasChanges || saving
                ? 'bg-blue-400 cursor-not-allowed opacity-70'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 active:scale-95'
                }`}
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>}
              {saving ? t('Saving...') : t('Save Changes')}
            </button>
          </div>
        </>
      )}

      {activeTab === 'targets' && (
        <div className="flex flex-col items-center justify-center max-w-5xl mx-auto animate-in fade-in duration-300 p-4 sm:p-6 space-y-6 sm:space-y-8">
           <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-xl w-full">
            <div className="flex items-start gap-3">
              <Info className="text-blue-400 mt-0.5" size={20} />
              <div>
                 <p className="text-sm text-blue-400 font-bold mb-1">
                   {isArabic ? 'معلومة:' : 'Info:'}
                 </p>
                 <p className="text-sm text-blue-400/90">
                   {isArabic ? 'هذه الأرقام تمثل مجموع التارجت الشخصي لجميع المستخدمين في الشركة.' : 'These figures represent the sum of personal targets for all users in the company.'}
                 </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full relative">
             <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200/10 -z-10 hidden md:block"></div>
             
             {/* Monthly Target */}
             <div className="group">
               <div className="glass-panel p-5 rounded-xl border border-gray-200/5 bg-gray-100/20 dark:bg-gray-800/20 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between">
                 <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Clock size={40} className="text-blue-500" />
                 </div>
                 
                 <label className="label pt-0 justify-start gap-2 mb-2 flex items-center">
                   <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                     <Clock size={16} />
                   </div>
                   <span className="label-text font-medium text-theme-text/80 ml-2 rtl:mr-2">
                     {isArabic ? 'تارجت شهري (الكلي)' : 'Monthly Target (Total)'}
                   </span>
                 </label>
                 
                 <div className="relative mt-2">
                   <div className="w-full bg-transparent font-mono text-2xl font-bold text-theme-text pr-12 rtl:pl-12 rtl:pr-0">
                    {companyTargets.monthly}
                   </div>
                   <div className="absolute inset-y-0 right-3 rtl:right-auto rtl:left-3 flex items-center pointer-events-none text-theme-text/30 text-xs font-mono">
                    {currencySymbol}
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-theme-text/40 flex justify-between pt-3 border-t border-theme-text/5">
                  <span>{isArabic ? 'القيمة الأساسية' : 'Base Value'}</span>
                  <span className="font-mono">1x</span>
                </div>
              </div>
            </div>

            {/* Quarterly Target */}
            <div className="group">
              <div className="glass-panel p-5 rounded-xl border border-gray-200/5 bg-gray-100/20 dark:bg-gray-800/20 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Calendar size={40} className="text-purple-500" />
                </div>
                
                <label className="label pt-0 justify-start gap-2 mb-2 flex items-center">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500">
                    <Calendar size={16} />
                  </div>
                  <span className="label-text font-medium text-theme-text/80 ml-2 rtl:mr-2">
                    {isArabic ? 'تارجت ربع سنوي (الكلي)' : 'Quarterly Target (Total)'}
                  </span>
                </label>
                
                <div className="relative mt-2">
                   <div className="w-full bg-transparent font-mono text-2xl font-bold text-theme-text pr-12 rtl:pl-12 rtl:pr-0">
                    {companyTargets.quarterly}
                   </div>
                   <div className="absolute inset-y-0 right-3 rtl:right-auto rtl:left-3 flex items-center pointer-events-none text-theme-text/30 text-xs font-mono">
                    {currencySymbol}
                  </div>
                </div>

                <div className="mt-3 text-xs text-theme-text/40 flex justify-between pt-3 border-t border-theme-text/5">
                  <span>{isArabic ? 'تراكمي' : 'Accumulated'}</span>
                  <span className="font-mono">3 Months</span>
                </div>
              </div>
            </div>

            {/* Yearly Target */}
            <div className="group">
              <div className="glass-panel p-5 rounded-xl border border-gray-200/5 bg-gray-100/20 dark:bg-gray-800/20 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp size={40} className="text-green-500" />
                </div>
                
                <label className="label pt-0 justify-start gap-2 mb-2 flex items-center">
                  <div className="p-1.5 bg-green-500/10 rounded-lg text-green-500">
                    <TrendingUp size={16} />
                  </div>
                  <span className="label-text font-medium text-theme-text/80 ml-2 rtl:mr-2">
                    {isArabic ? 'تارجت سنوي (الكلي)' : 'Yearly Target (Total)'}
                  </span>
                </label>
                
                <div className="relative mt-2">
                   <div className="w-full bg-transparent font-mono text-2xl font-bold text-theme-text pr-12 rtl:pl-12 rtl:pr-0">
                    {companyTargets.yearly}
                   </div>
                   <div className="absolute inset-y-0 right-3 rtl:right-auto rtl:left-3 flex items-center pointer-events-none text-theme-text/30 text-xs font-mono">
                    {currencySymbol}
                  </div>
                 </div>

                 <div className="mt-3 text-xs text-theme-text/40 flex justify-between pt-3 border-t border-theme-text/5">
                   <span>{isArabic ? 'الهدف الكلي' : 'Total Goal'}</span>
                   <span className="font-mono">12 Months</span>
                 </div>
               </div>
             </div>

          </div>
        </div>
      )}
      </div>
    </div>
  )
}
