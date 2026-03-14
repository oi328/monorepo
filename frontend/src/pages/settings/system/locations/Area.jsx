import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import { api } from '../../../../utils/api'
import AreaComponent from '../../../../components/settings/locations/Area'

// Helper Component for Searchable Select
const SearchableSelect = ({ options, value, onChange, placeholder, label, disabled = false }) => {
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
          disabled={disabled}
          className={`w-full pl-4 pr-10 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder={placeholder}
          value={isOpen ? search : (selectedOption ? selectedOption.nameEn : '')}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
            if (!e.target.value) onChange('')
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true)
              setSearch('')
            }
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        {isOpen && !disabled && (
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

export default function Area() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [areas, setAreas] = useState([])

  // Countries, Cities, Regions from API
  const [countries, setCountries] = useState([])

  const [cities, setCities] = useState([])

  const [regions, setRegions] = useState([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ nameEn: '', nameAr: '', regionId: '', cityId: '', countryId: '' })

  // Initial load: Countries
  useEffect(() => {
    const load = async () => {
      try {
        const resCountries = await api.get('/api/countries')
        const cs = Array.isArray(resCountries?.data) ? resCountries.data : []
        setCountries(cs.map(c => ({ id: c.id, nameEn: c.name_en, nameAr: c.name_ar })))
      } catch {}
    }
    load()
  }, [])

  // Load cities when country changes
  useEffect(() => {
    const fetchCities = async () => {
      try {
        if (!formData.countryId) {
          setCities([])
          setFormData(prev => ({ ...prev, cityId: '', regionId: '' }))
          return
        }
        const res = await api.get('/api/cities', { params: { country_id: formData.countryId } })
        const data = Array.isArray(res?.data) ? res.data : []
        setCities(data.map(c => ({ id: c.id, nameEn: c.name_en, nameAr: c.name_ar, countryId: c.country_id })))
        setFormData(prev => ({ ...prev, cityId: '', regionId: '' }))
      } catch {}
    }
    fetchCities()
  }, [formData.countryId])

  // Load regions when city changes
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        if (!formData.cityId) {
          setRegions([])
          setFormData(prev => ({ ...prev, regionId: '' }))
          return
        }
        const res = await api.get('/api/regions', { params: { city_id: formData.cityId } })
        const data = Array.isArray(res?.data) ? res.data : []
        setRegions(data.map(r => ({ id: r.id, nameEn: r.name_en, nameAr: r.name_ar, cityId: r.city_id })))
        setFormData(prev => ({ ...prev, regionId: '' }))
      } catch {}
    }
    fetchRegions()
  }, [formData.cityId])

  const handleEdit = (area) => {
    setEditingId(area.id)
    
    // Find hierarchy based on regionId
    const region = regions.find(r => r.id === area.regionId)
    const cityId = region ? region.cityId : ''
    
    const city = cities.find(c => c.id === cityId)
    const countryId = city ? city.countryId : ''

    setFormData({ nameEn: area.nameEn, nameAr: area.nameAr, regionId: area.regionId, cityId, countryId })
    setIsModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm(t('Are you sure you want to delete this area?'))) {
      setAreas(areas.filter(a => a.id !== id))
    }
  }

  const handleToggleStatus = (id) => {
    setAreas(areas.map(a => 
      a.id === id ? { ...a, status: !a.status } : a
    ))
  }

  const handleSave = () => {
    if (!formData.nameEn || !formData.regionId) return
    const payload = {
      name_en: formData.nameEn,
      name_ar: formData.nameAr || null,
      region_id: parseInt(formData.regionId),
      status: true,
    }
    const save = async () => {
      try {
        if (editingId) {
          await api.put(`/api/areas/${editingId}`, payload)
        } else {
          await api.post('/api/areas', payload)
        }
        const res = await api.get('/api/areas', { params: { city_id: formData.cityId } })
        const data = Array.isArray(res?.data) ? res.data : []
        setAreas(data.map(a => ({
          id: a.id,
          nameEn: a.name_en,
          nameAr: a.name_ar,
          regionId: a.region_id,
          regionName: a.region?.name_en ?? '',
          status: a.status,
        })))
        closeModal()
      } catch {}
    }
    save()
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormData({ nameEn: '', nameAr: '', regionId: '', cityId: '', countryId: '' })
  }

  const filteredCities = cities

  const filteredRegions = regions

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
            <h1 className={`text-2xl sm:text-3xl font-bold bg-clip-text ${isLight ? 'text-black' : 'text-white'}`}>
              {t('Locations')} <span className={`${isLight ? 'text-black' : 'text-white'} font-light`}>/</span> {t('Area')}
            </h1>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span className="font-medium">{t('Add Area')}</span>
          </button>
        </div>
        <AreaComponent 
          areas={areas} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
          onToggleStatus={handleToggleStatus} 
        />
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="card dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl transform transition-all">
            <div className="p-6 space-y-4">
              <h3 className={`text-xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>
                {editingId ? t('Edit Area') : t('Add Area')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${isLight ? 'text-black' : 'text-white'} mb-1`}>{t('Area Name Eng')}</label>
                  <input 
                    type="text" 
                    value={formData.nameEn}
                    onChange={e => setFormData({...formData, nameEn: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. Fifth Settlement"
                  />
                </div>
                
                {/* Searchable Country Select */}
                <SearchableSelect
                  label={t('Select Country')}
                  placeholder={t('Search Country...')}
                  options={countries}
                  value={formData.countryId}
                  onChange={(id) => setFormData({...formData, countryId: id, cityId: '', regionId: ''})} // Reset dependents
                />

                {/* Searchable City Select - Dependent on Country */}
                <SearchableSelect
                  label={t('Select City')}
                  placeholder={formData.countryId ? t('Search City...') : t('Select Country First')}
                  options={filteredCities}
                  value={formData.cityId}
                  onChange={(id) => setFormData({...formData, cityId: id, regionId: ''})} // Reset dependent
                  disabled={!formData.countryId}
                />

                {/* Searchable Region Select - Dependent on City */}
                <SearchableSelect
                  label={t('Select Region')}
                  placeholder={formData.cityId ? t('Search Region...') : t('Select City First')}
                  options={filteredRegions}
                  value={formData.regionId}
                  onChange={(id) => setFormData({...formData, regionId: id})}
                  disabled={!formData.cityId}
                />

                <div>
                  <label className={`block text-sm font-medium ${isLight ? 'text-black' : 'text-white'} mb-1`}>{t('Area Name Arabic')}</label>
                  <input 
                    type="text" 
                    value={formData.nameAr}
                    onChange={e => setFormData({...formData, nameAr: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-right"
                    placeholder="مثال: التجمع الخامس"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={closeModal}
                  className={`px-4 py-2 ${isLight ? 'text-black' : 'text-white'} hover:bg-gray-700 rounded-xl transition-colors font-medium`}
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
