import { useState, useEffect } from 'react'
import { FaGlobe, FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaCheckCircle, FaMapMarkerAlt, FaEnvelope, FaPhone, FaArrowRight, FaArrowLeft } from 'react-icons/fa'

const getFileUrl = (path) => {
  if (!path) return ''
  if (typeof path !== 'string') return ''
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path
  
  const baseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
  
  // If path already starts with /storage, use it directly
  if (path.startsWith('/storage/')) {
     return `${baseUrl.replace(/\/+$/, '')}${path}`
  }

  const cleanPath = path.startsWith('/') ? path.substring(1) : path
  return `${baseUrl.replace(/\/+$/, '')}/storage/${cleanPath}`
}

export default function Theme2({ data }) {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [lang, setLang] = useState('ar')
  
  const isRtl = lang === 'ar'

  const translations = {
    ar: {
      aboutUs: 'من نحن:',
      nowAvailable: 'متاح الآن',
      defaultDesc: 'اكتشف فرصًا متميزة صممت خصيصًا لك. انضم إلينا اليوم واستمتع بالتميز.',
      contactUs: 'تواصل معنا',
      fillForm: 'املأ النموذج أدناه للتواصل معنا',
      fullName: 'الاسم بالكامل',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      message: 'الرسالة',
      howHelp: 'كيف يمكننا مساعدتك؟',
      submit: 'إرسال الطلب',
      processing: 'جاري المعالجة...',
      thankYou: 'شكراً لك!',
      received: 'تم استلام معلوماتك. سنتواصل معك قريباً.',
      gallery: 'المعرض',
      rightsReserved: 'جميع الحقوق محفوظة.',
      namePlaceholder: 'الاسم',
      emailPlaceholder: 'example@mail.com',
      phonePlaceholder: '05xxxxxxxx',
      switchLang: 'English'
    },
    en: {
      aboutUs: 'About Us:',
      nowAvailable: 'Now Available',
      defaultDesc: 'Discover premium opportunities tailored just for you. Join us today and experience excellence.',
      contactUs: 'Contact Us',
      fillForm: 'Fill out the form below to get in touch',
      fullName: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number',
      message: 'Message',
      howHelp: 'How can we help you?',
      submit: 'Submit Request',
      processing: 'Processing...',
      thankYou: 'Thank You!',
      received: 'Your information has been received. We will contact you shortly.',
      gallery: 'Gallery',
      rightsReserved: 'All rights reserved.',
      namePlaceholder: 'John Doe',
      emailPlaceholder: 'john@example.com',
      phonePlaceholder: '+1 (555) 000-0000',
      switchLang: 'العربية'
    }
  }

  const t = translations[lang]

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!data.slug) {
        console.error('Missing slug for submission')
        return
    }

    setLoading(true)
    const submitUrl = `${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/p/${data.slug}/lead`
    
    fetch(submitUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(res => {
        if (!res.ok) throw new Error('Submission failed')
        return res.json()
    })
    .then(data => {
        setSubmitted(true)
        setLoading(false)
    })
    .catch(err => {
        console.error('Error submitting lead:', err)
        alert('Failed to submit inquiry. Please try again.')
        setLoading(false)
    })
  }

  const {
    title,
    description,
    email,
    phone,
    logo,
    cover,
    media: rawMedia,
    facebook,
    instagram,
    twitter,
    linkedin,
    url
  } = data

  const media = Array.isArray(rawMedia) ? rawMedia : []
  const project = data?.project || null
  const property = data?.property || null
  const currency = project?.currency || property?.currency || 'EGP'
  const fmtMoney = (v) => new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(v || 0))

  console.log('Theme2 rendered with data:', data)

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-gray-100 selection:bg-blue-500/30 selection:text-blue-200" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#0f172a]/90 backdrop-blur-lg border-b border-white/10 py-4 shadow-lg' : 'bg-transparent py-6'}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className=" px-6 flex items-center justify-between gap-4">
          {/* Logo & Title - Far Left */}
          <div className="flex items-center gap-4">
            {logo ? (
              <img src={getFileUrl(logo)} alt="Logo" className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10 shadow-2xl" />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-2 ring-white/10">
                {(title || 'B').charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              {title}
            </h1>
          </div>
          
          {/* Social Icons & Lang Toggle - Far Right */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm border border-white/5 mr-2"
            >
              <FaGlobe size={16} />
              <span className="text-sm font-medium">{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {facebook && <a href={facebook} target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-white hover:bg-blue-600/20 text-gray-400 hover:text-blue-500 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/5"><FaFacebook size={18} /></a>}
            {instagram && <a href={instagram} target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-white hover:bg-pink-600/20 text-gray-400 hover:text-pink-500 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/5"><FaInstagram size={18} /></a>}
            {twitter && <a href={twitter} target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-white hover:bg-blue-400/20 text-gray-400 hover:text-blue-400 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/5"><FaTwitter size={18} /></a>}
            {linkedin && <a href={linkedin} target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-white hover:bg-blue-700/20 text-gray-400 hover:text-blue-600 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/5"><FaLinkedin size={18} /></a>}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative min-h-[80vh] flex items-center justify-center pt-20 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Background Image/Gradient */}
        <div className="absolute inset-0 z-0">
          {cover ? (
             <img src={getFileUrl(cover)} alt="Cover" className="w-full h-full object-cover opacity-50 scale-105 animate-slow-zoom" />
          ) : (
             <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-[#0f172a] to-[#0f172a]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container px-2 grid md:grid-cols-2 gap-12 items-center">
          <div className={`space-y-8 text-center ${isRtl ? 'md:text-right' : 'md:text-left'} max-w-lg `}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              {t.nowAvailable}
            </div>
            
            <h2 className="text-4xl md:text-6xl/tight font-extrabold tracking-tight">
            
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-gray-400">
                 {t.aboutUs}
              </span>
            </h2>
            
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed mx-auto md:mx-0 max-w-lg break-words whitespace-pre-wrap">
              {description || t.defaultDesc}
            </p>

            <div className="flex  sm:flex-row items-center gap-4 justify-center md:justify-start">


            </div>
          </div>

          {/* Form Card */}
          <div id="contact-form" className="w-full max-w-md mx-auto bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[25px] opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
            
            <div className="relative">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaCheckCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">{t.thankYou}</h3>
                  <p className="text-gray-400">{t.received}</p>
                </div>
              ) : (
                <>
                  <div className="mb-8 text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">{t.contactUs}</h3>
                    <p className="text-gray-400 text-sm">{t.fillForm}</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 ml-1 block text-start">{t.fullName}</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-[#0f172a]/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        placeholder={t.namePlaceholder}
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 ml-1 block text-start">{t.email}</label>
                      <input
                        type="email"
                        className="w-full bg-[#0f172a]/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        placeholder={t.emailPlaceholder}
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 ml-1 block text-start">{t.phone}</label>
                      <input
                        type="tel"
                        required
                        className="w-full bg-[#0f172a]/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        placeholder={t.phonePlaceholder}
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 ml-1 block text-start">{t.message}</label>
                      <textarea
                        rows="3"
                        className="w-full bg-[#0f172a]/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
                        placeholder={t.howHelp}
                        value={formData.message}
                        onChange={e => setFormData({...formData, message: e.target.value})}
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transform transition-all duration-200 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t.processing}
                        </span>
                      ) : (
                        t.submit
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {project && (
        <section className="py-16 bg-[#0b1120] relative">
          <div className="container mx-auto px-6">
            <div className="text-center mb-10">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">{lang === 'ar' ? 'تفاصيل المشروع' : 'Project Details'}</h3>
              <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'المطور' : 'Developer'}</div>
                    <div className="font-semibold text-white break-words">{project.developer || '—'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'المدينة' : 'City'}</div>
                    <div className="font-semibold text-white break-words">{project.city || '—'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'الحالة' : 'Status'}</div>
                    <div className="font-semibold text-white break-words">{project.status || '—'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'تاريخ التسليم' : 'Delivery Date'}</div>
                    <div className="font-semibold text-white break-words">{project.deliveryDate || '—'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'نطاق السعر' : 'Price Range'}</div>
                    <div className="font-semibold text-white break-words">{fmtMoney(project.minPrice)} - {fmtMoney(project.maxPrice)}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'نطاق المساحة' : 'Space Range'}</div>
                    <div className="font-semibold text-white break-words">{Number(project.minSpace || 0)} - {Number(project.maxSpace || 0)} m²</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm space-y-6">
                {Array.isArray(project.amenities) && project.amenities.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-white mb-3">{lang === 'ar' ? 'مرافق المشروع' : 'Amenities'}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {project.amenities.slice(0, 12).map((a, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200">
                          <FaCheckCircle className="text-green-400" />
                          <span className="break-words">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(project.masterPlanImages) && project.masterPlanImages.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-white mb-3">{lang === 'ar' ? 'المخطط العام' : 'Master Plan'}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {project.masterPlanImages.slice(0, 4).map((file, idx) => {
                        const src = typeof file === 'string' ? file : ''
                        const isPdf = src.toLowerCase().endsWith('.pdf')
                        return (
                          <div key={idx} className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                            {isPdf ? (
                              <a href={src} target="_blank" rel="noreferrer" className="flex items-center justify-center h-44 text-sm font-semibold text-blue-400 hover:underline">
                                {lang === 'ar' ? 'فتح ملف PDF' : 'Open PDF'}
                              </a>
                            ) : (
                              <img src={getFileUrl(src)} alt={`master-${idx}`} className="w-full h-44 object-contain bg-[#0f172a]" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {property && (
        <section className="py-16 bg-[#0b1120] relative">
          <div className="container mx-auto px-6">
            <div className="text-center mb-10">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">{lang === 'ar' ? 'تفاصيل الوحدة' : 'Property Details'}</h3>
              <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'السعر' : 'Price'}</div>
                    <div className="font-semibold text-white break-words">{fmtMoney(property.price)}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'النوع' : 'Type'}</div>
                    <div className="font-semibold text-white break-words">{property.propertyType || '—'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'المدينة' : 'City'}</div>
                    <div className="font-semibold text-white break-words">{property.city || '—'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'العنوان' : 'Address'}</div>
                    <div className="font-semibold text-white break-words">{property.address || '—'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'غرف النوم' : 'Bedrooms'}</div>
                    <div className="font-semibold text-white break-words">{property.bedrooms ?? '—'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'الحمامات' : 'Bathrooms'}</div>
                    <div className="font-semibold text-white break-words">{property.bathrooms ?? '—'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 sm:col-span-2">
                    <div className="text-xs text-gray-400 mb-1">{lang === 'ar' ? 'المساحة' : 'Area'}</div>
                    <div className="font-semibold text-white break-words">
                      {Number(property.area || 0)} {property.areaUnit || 'm²'}
                    </div>
                  </div>
                </div>

                {property.locationUrl && (
                  <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <FaMapMarkerAlt className="text-blue-400" />
                    <a href={property.locationUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-400 hover:underline break-all">
                      {lang === 'ar' ? 'فتح الموقع على الخريطة' : 'Open location on map'}
                    </a>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm space-y-6">
                {Array.isArray(property.floorPlans) && property.floorPlans.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-white mb-3">{lang === 'ar' ? 'مخططات الدور' : 'Floor Plans'}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {property.floorPlans.slice(0, 4).map((src, idx) => {
                        const isPdf = typeof src === 'string' && src.toLowerCase().includes('.pdf')
                        return (
                          <div key={idx} className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                            {isPdf ? (
                              <a href={src} target="_blank" rel="noreferrer" className="flex items-center justify-center h-44 text-sm font-semibold text-blue-400 hover:underline">
                                {lang === 'ar' ? 'فتح ملف PDF' : 'Open PDF'}
                              </a>
                            ) : (
                              <img src={getFileUrl(src)} alt={`floor-${idx}`} className="w-full h-44 object-contain bg-[#0f172a]" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {Array.isArray(property.documents) && property.documents.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-white mb-3">{lang === 'ar' ? 'المرفقات' : 'Documents'}</div>
                    <div className="grid grid-cols-1 gap-2">
                      {property.documents.slice(0, 6).map((src, idx) => (
                        <a key={idx} href={src} target="_blank" rel="noreferrer" className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-blue-400 hover:underline break-all">
                          {lang === 'ar' ? 'فتح المرفق' : 'Open document'}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Media Gallery Section */}
      {media && media.length > 0 && (
        <section className="py-24 bg-[#0b1120] relative">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.gallery}</h3>
              <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {media.map((item, index) => {
                const url = typeof item === 'string' ? item : item.path
                if (!url) return null
                return (
                  <div key={index} className="group relative aspect-video rounded-2xl overflow-hidden bg-gray-800 border border-white/5 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                    <img 
                      src={getFileUrl(url)} 
                      alt={`Gallery ${index + 1}`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-[#0f172a] border-t border-white/5 py-12 mt-10" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className=" px-6">
          <div className="flex  md:flex-row items-center justify-between gap-6">
            {/* Contact Info - Left */}
            <div className="flex items-center gap-6 order-2 md:order-1">
              {email && (
                <a href={`mailto:${email}`} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group">
                  <div className="p-2 rounded-full bg-white group-hover:bg-blue-600/20 transition-colors">
                    <FaEnvelope className="group-hover:text-blue-500 transition-colors" />
                  </div>
                  <span>{email}</span>
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group">
                  <div className="p-2 rounded-full bg-white group-hover:bg-green-600/20 transition-colors">
                    <FaPhone className="group-hover:text-green-500 transition-colors" />
                  </div>
                  <span>{phone}</span>
                </a>
              )}
            </div>

            {/* Copyright - Right */}
            <div className="text-white text-sm order-1 md:order-2 opacity-60 hover:opacity-100 transition-opacity">
              &copy; {new Date().getFullYear()} {title}. {t.rightsReserved}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
