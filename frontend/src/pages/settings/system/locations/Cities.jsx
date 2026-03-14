import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import { api } from '../../../../utils/api'
import toast from 'react-hot-toast'
import CitiesComponent from '../../../../components/settings/locations/Cities'

// Helper Component for Searchable Select
const SearchableSelect = ({ options, value, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef(null)
  const { theme } = useTheme()
  const isLight = theme === 'light'

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(o => o.id === parseInt(value))
  
  // Sync search text with selected value when closed or initial load
  useEffect(() => {
    if (!isOpen && selectedOption) {
      setSearch(selectedOption.nameEn)
    } else if (!isOpen && !value) {
      setSearch('')
    }
  }, [isOpen, selectedOption, value])

  const filteredOptions = options.filter(option => 
    option.nameEn.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={wrapperRef}>
      <label className={`block text-sm font-medium ${isLight ? 'text-black' : 'text-white'} mb-1`}>{label}</label>
      <div className="relative">
        <input
          type="text"
          className="w-full pl-4 pr-10 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder={placeholder}
          value={isOpen ? search : (selectedOption ? selectedOption.nameEn : '')}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
            if (!e.target.value) onChange('')
          }}
          onFocus={() => {
            setIsOpen(true)
            setSearch('')
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-600 last:border-0"
                  onClick={() => {
                    onChange(option.id)
                    setIsOpen(false)
                    setSearch(option.nameEn)
                  }}
                >
                  {option.nameEn}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500 dark:text-gray-400">No results found</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Cities() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  // State
  const [cities, setCities] = useState([])

  // Mock countries for dropdown
  const [countries, setCountries] = useState([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ nameEn: '', nameAr: '', countryId: '' })

  // Load countries and cities from API
  useEffect(() => {
    const load = async () => {
      try {
        const [resCountries, resCities] = await Promise.all([
          api.get('/api/countries'),
          api.get('/api/cities'),
        ])
        const cs = Array.isArray(resCountries?.data) ? resCountries.data : []
        setCountries(cs.map(c => ({ id: c.id, nameEn: c.name_en, nameAr: c.name_ar })))
        const citiesData = Array.isArray(resCities?.data) ? resCities.data : []
        setCities(citiesData.map(c => ({
          id: c.id,
          nameEn: c.name_en,
          nameAr: c.name_ar,
          countryId: c.country_id,
          countryName: c.country?.name_en || '',
          status: !!c.status,
        })))
      } catch {}
    }
    load()
  }, [])

  // Handlers
  const handleEdit = (city) => {
    setEditingId(city.id)
    setFormData({ nameEn: city.nameEn, nameAr: city.nameAr, countryId: city.countryId })
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm(t('Are you sure you want to delete this city?'))) {
      try {
        await api.delete(`/api/cities/${id}`)
        setCities(prev => prev.filter(c => c.id !== id))
        toast.success(t('City deleted successfully'))
      } catch (err) {
        console.error('Failed to delete city', err)
        toast.error(t('Failed to delete city'))
      }
    }
  }

  const handleToggleStatus = (id) => {
    setCities(cities.map(c => 
      c.id === id ? { ...c, status: !c.status } : c
    ))
  }

  const handleSave = () => {
    if (!formData.nameEn || !formData.nameAr || !formData.countryId) return

    const payload = {
      name_en: formData.nameEn,
      name_ar: formData.nameAr,
      country_id: parseInt(formData.countryId),
      status: true,
    }

    if (editingId) {
      api.put(`/api/cities/${editingId}`, payload)
        .then(res => {
          const saved = res?.data
          const selectedCountry = countries.find(c => c.id === payload.country_id)
          const countryName = selectedCountry ? selectedCountry.nameEn : (saved?.country?.name_en || '')
          setCities(cities.map(c => 
            c.id === editingId ? {
              id: saved?.id ?? editingId,
              nameEn: saved?.name_en ?? payload.name_en,
              nameAr: saved?.name_ar ?? payload.name_ar,
              countryId: saved?.country_id ?? payload.country_id,
              countryName,
              status: !!(saved?.status ?? true),
            } : c
          ))
          closeModal()
        })
        .catch(() => {})
    } else {
      api.post('/api/cities', payload)
        .then(res => {
          const saved = res?.data
          const selectedCountry = countries.find(c => c.id === payload.country_id)
          const countryName = selectedCountry ? selectedCountry.nameEn : (saved?.country?.name_en || '')
          setCities([
            ...cities,
            {
              id: saved?.id ?? (Math.max(0, ...cities.map(c => c.id)) + 1),
              nameEn: saved?.name_en ?? payload.name_en,
              nameAr: saved?.name_ar ?? payload.name_ar,
              countryId: saved?.country_id ?? payload.country_id,
              countryName,
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
    setFormData({ nameEn: '', nameAr: '', countryId: '' })
  }

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
            <h1 className={`text-2xl sm:text-3xl font-bold bg-clip-text ${isLight ? 'text-black' : 'text-white'}`}>
              {t('Locations')} <span className={`${isLight ? 'text-black' : 'text-white'} font-light`}>/</span> {t('Cities')}
            </h1>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span className="font-medium">{t('Add City')}</span>
          </button>
        </div>
        
        <CitiesComponent 
          cities={cities}
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
                {editingId ? t('Edit City') : t('Add City')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${isLight ? 'text-black' : 'text-white'} mb-1`}>{t('City Name Eng')}</label>
                  <input 
                    type="text" 
                    value={formData.nameEn}
                    onChange={e => setFormData({...formData, nameEn: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. Cairo"
                  />
                </div>
                
                <SearchableSelect
                  label={t('Select Country')}
                  placeholder={t('Search Country...')}
                  options={countries}
                  value={formData.countryId}
                  onChange={(id) => setFormData({...formData, countryId: id})}
                />

                <div>
                  <label className={`block text-sm font-medium ${isLight ? 'text-black' : 'text-white'} mb-1`}>{t('City Name Arabic')}</label>
                  <input 
                    type="text" 
                    value={formData.nameAr}
                    onChange={e => setFormData({...formData, nameAr: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-right"
                    placeholder="مثال: القاهرة"
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
