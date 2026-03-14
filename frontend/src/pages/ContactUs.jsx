import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function ContactUs() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const [mapQuery, setMapQuery] = useState('Cairo, Egypt')
  const [mapCoords, setMapCoords] = useState(null)
  const [mapZoom, setMapZoom] = useState(14)
  const [mapStatus, setMapStatus] = useState('')
  const heroText = i18n.language === 'en' ? "We'd love to hear from you" : 'سنكون سعداء بالتواصل معك'

  useEffect(() => {
    const saved = localStorage.getItem('contact_map_query')
    if (saved) setMapQuery(saved)
  }, [])
  useEffect(() => {
    localStorage.setItem('contact_map_query', mapQuery)
  }, [mapQuery])

  const mapSrc = mapCoords
    ? `https://www.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&z=${mapZoom}&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=${mapZoom}&output=embed`

  const useMyLocation = () => {
    setMapStatus('')
    if (!navigator.geolocation) {
      setMapStatus(t('Geolocation is not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setMapCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => setMapStatus(t('Unable to access your location'))
    )
  }

  const openInMaps = () => {
    const url = mapCoords
      ? `https://www.google.com/maps/search/?api=1&query=${mapCoords.lat},${mapCoords.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    window.open(url, '_blank')
  }

  const copyLocation = async () => {
    const text = mapCoords ? `${mapCoords.lat},${mapCoords.lng}` : mapQuery
    try {
      await navigator.clipboard.writeText(text)
      setMapStatus(t('Location copied to clipboard'))
    } catch {
      setMapStatus(t('Unable to copy to clipboard'))
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (sending) return
    setStatus('')
    setSending(true)
    // Simulate sending
    await new Promise(res => setTimeout(res, 1200))
    setSending(false)
    setStatus(t('Your message has been sent successfully'))
    setForm({ name: '', email: '', phone: '', subject: '', message: '' })
  }

  return (
    
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">{t('Contact us')}</h1>
        {/* Hero intro */}
        <section className={`card glass-card p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-sm text-[var(--muted-text)]">{heroText}</p>
        </section>


        {/* Status banner */}
        {status && (
          <div className={`card glass-card p-3 text-sm inline-flex items-center gap-2 ${isRTL ? 'justify-end text-right' : 'justify-start text-left'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-green-600">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{status}</span>
          </div>
        )}

 
        {/* Contact grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 items-stretch gap-6">
          {/* Form */}
          <section className="lg:col-span-2 card glass-card p-4 h-full">
            <form onSubmit={handleSubmit} className={`space-y-4 ${isRTL ? 'text-right' : ''}`}>
              {/* Row 1: Name, Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={`text-xs text-[var(--muted-text)] inline-flex items-center gap-2`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <circle cx="12" cy="8" r="3" />
                      <path d="M6 21v-2a6 6 0 0112 0v2" />
                    </svg>
                    <span>{t('Your Name')}</span>
                  </label>
                  <input name="name" value={form.name} onChange={handleChange} className="input" placeholder={t('Enter your name')} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={`text-xs text-[var(--muted-text)] inline-flex items-center gap-2`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <rect x="4" y="6" width="16" height="12" rx="2" />
                      <path d="M4 8l8 6 8-6" />
                    </svg>
                    <span>{t('Email')}</span>
                  </label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className="input" placeholder={t('Enter your email')} required />
                </div>
              </div>

              {/* Row 2: Phone, Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={`text-xs text-[var(--muted-text)] inline-flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M22 16.92v-3a2 2 0 00-2-2h-3l-2 3a16 16 0 01-7-7l3-2V4a2 2 0 00-2-2H3.08a2 2 0 00-2 2C1.08 13.91 10.09 22.92 22 22.92a2 2 0 002-2v-3z" />
                    </svg>
                    <span>{t('Phone')}</span>
                  </label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="input" placeholder={t('Enter your phone')} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={`text-xs text-[var(--muted-text)] inline-flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M4 6h16M4 12h16M4 18h10" />
                    </svg>
                    <span>{t('Subject')}</span>
                  </label>
                  <input name="subject" value={form.subject} onChange={handleChange} className="input" placeholder={t('Subject of your message')} />
                </div>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs text-[var(--muted-text)] inline-flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  <span>{t('Message')}</span>
                </label>
                <textarea name="message" value={form.message} onChange={handleChange} className="input min-h-[120px]" placeholder={t('Write your message here')} required></textarea>
              </div>

              {/* Actions */}
              <div className={`flex items-center gap-2`}>
                <button type="submit" className={`btn btn-primary inline-flex items-center gap-2`} disabled={sending}>
                  {sending ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M22 2L11 13" />
                      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  )}
                  <span>{sending ? t('Sending...') : t('Send')}</span>
                </button>
                <button type="button" className="btn" onClick={() => setForm({ name: '', email: '', phone: '', subject: '', message: '' })}>{t('Reset')}</button>
              </div>
            </form>
          </section>

          {/* Contact info */}
          <section className={`card glass-card p-4 h-full ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="text-base font-medium text-[var(--muted-text)] mb-2">{isRTL ? 'وسائل الاتصال' : 'Contact Methods'}</div>
            <div className="flex flex-col gap-3">
              <div className="group flex items-start gap-3 cm-item cm-anim delay-100 p-2">
                <span className="text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 transition-transform duration-300 group-hover:scale-110">
                    <rect x="4" y="6" width="16" height="12" rx="2" />
                    <path d="M4 8l8 6 8-6" />
                  </svg>
                </span>
                <div>
                  <div className="text-sm text-[var(--muted-text)]">{t('Support Email')}</div>
                  <a href="mailto:support@example.com" className="text-base hover:underline" target="_blank" rel="noopener noreferrer">support@example.com</a>
                </div>
              </div>
              <div className="group flex items-start gap-3 cm-item cm-anim delay-200 p-2">
                <span className="text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 transition-transform duration-300 group-hover:scale-110">
                    <path d="M22 16.92v-3a2 2 0 00-2-2h-3l-2 3a16 16 0 01-7-7l3-2V4a2 2 0 00-2-2H3.08a2 2 0 00-2 2C1.08 13.91 10.09 22.92 22 22.92a2 2 0 002-2v-3z" />
                  </svg>
                </span>
                <div>
                  <div className="text-sm text-[var(--muted-text)]">{t('Phone')}</div>
                  <a href="tel:+201000000000" className="text-base hover:underline">+20 10 000 0000</a>
                </div>
              </div>
              <div className="group flex items-start gap-3 cm-item cm-anim delay-300 p-2">
                <span className="text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 transition-transform duration-300 group-hover:scale-110">
                    <path d="M6 12l4 4 8-8" />
                  </svg>
                </span>
                <div>
                  <div className="text-sm text-[var(--muted-text)]">{t('WhatsApp')}</div>
                  <a href="https://wa.me/201000000000" className="text-base hover:underline" target="_blank" rel="noopener noreferrer">+20 10 000 0000</a>
                </div>
              </div>
              <div className="group flex items-start gap-3 cm-item cm-anim delay-400 p-2">
                <span className="text-gray-600">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 transition-transform duration-300 group-hover:scale-110">
                     <path d="M3 10l9-7 9 7" />
                     <path d="M5 10v9h14v-9" />
                   </svg>
                 </span>
                 <div>
                  <div className="text-sm text-[var(--muted-text)]">{t('Address')}</div>
                  <a href="https://www.google.com/maps/search/?api=1&query=Cairo%2C%20Egypt" className="text-base hover:underline" target="_blank" rel="noopener noreferrer">Cairo, Egypt</a>
                </div>
              </div>
              {/* Social icons */}
              <div className="pt-2 sm:col-span-2 border-t border-gray-200 dark:border-gray-800">
                <div className="text-base font-medium text-[var(--muted-text)] mb-2">{isRTL ? 'تابعنا' : 'Follow us'}</div>
                <div className={`flex items-center gap-3 justify-center`}>
                  <a href="#" aria-label="Facebook" className="inline-flex p-2 rounded-md hover:bg-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                      <path d="M22 12a10 10 0 10-11.5 9.9v-7h-2v-3h2V9.5a3 3 0 013-3h3v3h-2a1 1 0 00-1 1V12h3l-.5 3h-2.5v7A10 10 0 0022 12z" />
                    </svg>
                  </a>
                  <a href="#" aria-label="Twitter" className="inline-flex p-2 rounded-md hover:bg-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                      <path d="M22 5.9a8.2 8.2 0 01-2.3.6 4 4 0 001.8-2.2 8.3 8.3 0 01-2.6 1 4 4 0 00-6.9 3.6A11.3 11.3 0 013 5.2a4 4 0 001.2 5.3 4 4 0 01-1.8-.5v.1a4 4 0 003.2 3.9 4 4 0 01-1.8.1 4 4 0 003.7 2.8A8.1 8.1 0 012 18.6 11.4 11.4 0 008.1 20c7.4 0 11.5-6.1 11.5-11.5v-.5A8.1 8.1 0 0022 5.9z" />
                    </svg>
                  </a>
                  <a href="#" aria-label="LinkedIn" className="inline-flex p-2 rounded-md hover:bg-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                      <path d="M4 3a2 2 0 110 4 2 2 0 010-4zm0 6h4v12H4V9zm6 0h4v2.5h.1a4.4 4.4 0 013.9-2.2c4.1 0 4.8 2.7 4.8 6.2V21h-4v-5.2c0-1.3 0-3-1.8-3s-2.2 1.4-2.2 2.9V21h-4V9z" />
                    </svg>
                  </a>
                  <a href="#" aria-label="WhatsApp" className="inline-flex p-2 rounded-md hover:bg-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                      <path d="M12 2a10 10 0 00-8.7 14.9L2 22l5.3-1.3A10 10 0 1012 2zm5.6 14.3c-.2.6-1.2 1.1-1.7 1.2-.4.1-.9.1-1.5-.1-1.5-.5-3.3-1.4-4.7-2.8-1.3-1.3-2.3-3.1-2.8-4.7-.2-.6-.2-1.1-.1-1.5.1-.5.6-1.5 1.2-1.7.3-.1.7-.1 1 .1.4.2.9.7 1 1.1l.2.4c.3.6.1.9-.2 1.3l-.3.3c-.1.1-.2.3-.1.5.1.4.6 1.3 1.4 2.1.8.8 1.7 1.3 2.1 1.4.2.1.4 0 .5-.1l.3-.3c.4-.3.7-.5 1.3-.2l.4.2c.4.1.9.6 1.1 1 .2.3.2.7.1 1z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Location Map */}
        <section className="card glass-card p-4">
          <div className={`flex items-center justify-between gap-3`}>
            <h2 className="text-lg font-semibold">{t('Our Location')}</h2>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button type="button" className={`btn ${isRTL ? 'flex-row-reverse' : ''}`} onClick={openInMaps}>
                {t('Open in Maps')}
              </button>
              <button type="button" className={`btn ${isRTL ? 'flex-row-reverse' : ''}`} onClick={copyLocation}>
                {t('Copy')}
              </button>
            </div>
          </div>
          <div className={`mt-3 flex items-center gap-3`}>
            <label className="text-xs text-[var(--muted-text)]">{t('Zoom')}</label>
            <input type="range" min="3" max="20" value={mapZoom} onChange={(e) => setMapZoom(Number(e.target.value))} />
          </div>
          {mapStatus && (
            <div className={`mt-2 text-xs text-[var(--muted-text)] ${isRTL ? 'text-right' : 'text-left'}`}>{mapStatus}</div>
          )}
          <div className="mt-3 rounded-lg overflow-hidden">
            <iframe
              title="map"
              src={mapSrc}
              className="w-full h-64 rounded-lg border border-gray-200 dark:border-gray-800"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </section>
      </div>
    
  )
}