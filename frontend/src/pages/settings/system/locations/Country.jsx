import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../../../utils/api'
import CountryComponent from '../../../../components/settings/locations/Country'
import { useTheme } from '@shared/context/ThemeProvider'

export default function Country() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { t } = useTranslation()

  // State
  const [countries, setCountries] = useState([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ nameEn: '', nameAr: '', code: '' })

  // Auto dial code mapping
  const DIAL_MAP = {
    'egypt': '+20',
    'saudi arabia': '+966',
    'ksa': '+966',
    'united arab emirates': '+971',
    'uae': '+971',
    'emirates': '+971',
    'morocco': '+212',
    'maroc': '+212',
    'morroco': '+212',
    'moroco': '+212',
    'tunisia': '+216',
    'algeria': '+213',
    'qatar': '+974',
    'kuwait': '+965',
    'jordan': '+962',
    'lebanon': '+961',
    'bahrain': '+973',
    'oman': '+968',
    'iraq': '+964',
    'syria': '+963',
    'yemen': '+967',
    'sudan': '+249'
  }
  const inferDialCode = (name) => {
    if (!name) return ''
    const n = String(name).trim().toLowerCase()
    if (DIAL_MAP[n]) return DIAL_MAP[n]
    // fuzzy for morocco-like
    if (n.includes('moroc')) return '+212'
    return ''
  }

  // Fetch from API
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/countries')
        const data = Array.isArray(res?.data) ? res.data : []
        setCountries(data.map(c => ({
          id: c.id,
          nameEn: c.name_en,
          nameAr: c.name_ar,
          code: c.code || '',
          status: !!c.status,
        })))
      } catch {}
    }
    load()
  }, [])

  // Handlers
  const handleEdit = (country) => {
    setEditingId(country.id)
    setFormData({ nameEn: country.nameEn, nameAr: country.nameAr, code: country.code })
    setIsModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm(t('Are you sure you want to delete this country?'))) {
      setCountries(countries.filter(c => c.id !== id))
    }
  }

  const handleToggleStatus = (id) => {
    setCountries(countries.map(c => 
      c.id === id ? { ...c, status: !c.status } : c
    ))
  }

  const handleSave = () => {
    if (!formData.nameEn || !formData.nameAr) return
    // Ensure code is set (auto if empty)
    const ensuredCode = formData.code || inferDialCode(formData.nameEn) || ''

    const payload = {
      name_en: formData.nameEn,
      name_ar: formData.nameAr,
      code: ensuredCode,
      status: true,
    }

    if (editingId) {
      api.put(`/api/countries/${editingId}`, payload)
        .then(res => {
          const saved = res?.data
          setCountries(countries.map(c => 
            c.id === editingId ? {
              id: saved?.id ?? editingId,
              nameEn: saved?.name_en ?? payload.name_en,
              nameAr: saved?.name_ar ?? payload.name_ar,
              code: saved?.code ?? payload.code,
              status: !!(saved?.status ?? true),
            } : c
          ))
          closeModal()
        })
        .catch(() => {})
    } else {
      api.post('/api/countries', payload)
        .then(res => {
          const saved = res?.data
          setCountries([
            ...countries,
            {
              id: saved?.id ?? (Math.max(0, ...countries.map(c => c.id)) + 1),
              nameEn: saved?.name_en ?? payload.name_en,
              nameAr: saved?.name_ar ?? payload.name_ar,
              code: saved?.code ?? payload.code,
              status: !!(saved?.status ?? true),
            }
          ])
          closeModal()
        })
        .catch(() => {})
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormData({ nameEn: '', nameAr: '', code: '' })
  }

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
            <h1 className={`text-2xl sm:text-3xl font-bold bg-clip-text ${isLight ? 'text-black' : 'text-white'}`}>
              {t('Locations')} <span className={`${isLight ? 'text-black' : 'text-white'} font-light`}>/</span> {t('Country')}
            </h1>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span className="font-medium">{t('Add Country')}</span>
          </button>
        </div>
        
        <CountryComponent 
            countries={countries}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
        />
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="card dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl transform transition-all">
            <div className="p-6 space-y-4">
              <h3 className={`text-xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>
                {editingId ? t('Edit Country') : t('Add Country')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${isLight ? 'text-black' : 'text-white'} mb-1`}>{t('Country Name Eng')}</label>
                  <input 
                    type="text" 
                    value={formData.nameEn}
                    onChange={e => {
                      const v = e.target.value
                      const auto = inferDialCode(v)
                      setFormData(prev => ({
                        ...prev,
                        nameEn: v,
                        code: prev.code ? prev.code : auto
                      }))
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. Egypt"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${isLight ? 'text-black' : 'text-white'} mb-1`}>{t('Country Code')}</label>
                  <input 
                    type="text" 
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. +20"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isLight ? 'text-black' : 'text-white'} mb-1`}>{t('Country Name Arabic')}</label>
                  <input 
                    type="text" 
                    value={formData.nameAr}
                    onChange={e => setFormData({...formData, nameAr: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-right"
                    placeholder="مثال: مصر"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={closeModal}
                  className={`px-4 py-2 ${isLight ? 'text-black' : 'text-white'} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium`}
                >
                  {t('Cancel')}
                </button>
                <button 
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all font-medium"
                >
                  {t('Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
