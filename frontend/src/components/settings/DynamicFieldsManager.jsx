import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../utils/api'
import { FaPlus, FaTimes, FaEdit, FaTrash, FaSpinner, FaGripVertical, FaCheck } from 'react-icons/fa'
import { Toggle } from '../../shared/components'

// Define API Base URL - In production this should be in env
const API_ENDPOINT = '/api/admin/fields'

export default function DynamicFieldsManager({ entityKey, title, description }) {
  const { t, i18n } = useTranslation();
  
  // بدلاً من المتغير الثابت، استخدم useMemo لضمان التحديث عند تغيير اللغة
  const isRTL = React.useMemo(() => 
    String(i18n.language || '').startsWith('ar'), 
    [i18n.language]
  );

  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentField, setCurrentField] = useState(null)
  const [formData, setFormData] = useState(initialFormState(entityKey))

  function initialFormState(key) {
      return {
        entity_key: key,
        key: '',
        label_en: '',
        label_ar: '',
        type: 'text',
        required: false,
        active: true,
        can_filter: false,
        is_landing_page: false,
        show_my_lead: true,
        show_sales: true,
        show_manager: true,
        is_exportable: true,
        options: [], 
        sort_order: 0,
        placeholder_en: '',
        placeholder_ar: ''
      }
  }

  useEffect(() => {
    fetchFields()
  }, [entityKey])

  const fetchFields = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`${API_ENDPOINT}?entity=${entityKey}`)
      setFields(response.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load fields. Make sure Backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const [draggedItem, setDraggedItem] = useState(null)

  const handleDragStart = (e, item) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    
    // Set drag image to the row for better visual feedback
    const row = e.target.closest('tr')
    if (row) {
        e.dataTransfer.setDragImage(row, 0, 0)
    }
  }

  const handleDragEnd = (e) => {
    setDraggedItem(null)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault()
    if (!draggedItem) return

    const newFields = [...fields]
    const draggedIndex = newFields.findIndex(f => f.id === draggedItem.id)
    
    if (draggedIndex === targetIndex) return

    // Reorder
    newFields.splice(draggedIndex, 1)
    newFields.splice(targetIndex, 0, draggedItem)

    // Update sort_order
    const updatedFields = newFields.map((f, index) => ({
        ...f,
        sort_order: index + 1
    }))

    setFields(updatedFields)

    try {
        // Batch update sort orders
        // Note: In a real production app, use a batch endpoint to avoid multiple requests and race conditions
        await Promise.all(updatedFields.map(f => 
            api.put(`${API_ENDPOINT}/${f.id}`, { ...f, sort_order: f.sort_order })
        ))
    } catch (err) {
        console.error('Failed to update sort orders', err)
        // Optionally revert state here if needed
    }
  }

  const generateSlug = (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\_]+/g, '')
      .replace(/\_\_+/g, '_')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      // Validate unique sort_order
      const isSortOrderTaken = fields.some(f => 
        f.sort_order === parseInt(formData.sort_order) && 
        (!currentField || f.id !== currentField.id)
      )

      if (isSortOrderTaken) {
        alert(t('Sort Order must be unique. This value is already taken.'))
        return
      }

      const payload = { ...formData }
      // Ensure options is array
      if (typeof payload.options === 'string') {
          payload.options = payload.options.split(',').map(o => o.trim()).filter(Boolean)
      }

      if (currentField) {
        // Update
        const response = await api.put(`${API_ENDPOINT}/${currentField.id}`, payload)
        setFields(prev => prev.map(f => f.id === currentField.id ? response.data : f).sort((a, b) => a.sort_order - b.sort_order))
      } else {
        // Create
        const response = await api.post(API_ENDPOINT, payload)
        setFields(prev => [...prev, response.data].sort((a, b) => a.sort_order - b.sort_order))
      }
      setIsModalOpen(false)
      setCurrentField(null)
      setFormData(initialFormState(entityKey))
    } catch (err) {
      console.error(err)
      alert('Error saving field: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm(t('Are you sure you want to delete this input?'))) {
      try {
        await api.delete(`${API_ENDPOINT}/${id}`)
        setFields(prev => prev.filter(f => f.id !== id))
      } catch (err) {
        alert('Error deleting field')
      }
    }
  }

  const toggleActive = async (id) => {
    try {
        // Optimistic update
        setFields(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f))
        await api.patch(`${API_ENDPOINT}/${id}/toggle-active`)
    } catch (err) {
        // Revert on error
        setFields(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f))
        alert('Error toggling status')
    }
  }

  const openModal = (field = null) => {
    setCurrentField(field)
    if (field) {
        setFormData({ ...field, entity_key: entityKey })
    } else {
        const nextOrder = fields.length > 0 ? Math.max(...fields.map(f => f.sort_order)) + 1 : 1
        setFormData({ ...initialFormState(entityKey), sort_order: nextOrder })
    }
    setIsModalOpen(true)
  }

  const inputTypes = [
    { value: 'text', label: t('Text') },
    { value: 'number', label: t('Number') },
    { value: 'email', label: t('Email') },
    { value: 'date', label: t('Date') },
    { value: 'select', label: t('Select Menu') },
    { value: 'checkbox', label: t('Checkbox') },
    { value: 'textarea', label: t('Long Text') },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {!isModalOpen && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-theme-text">{t(title)}</h1>
            <p className="text-sm text-gray-500 mt-1">{t(description)}</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 font-medium"
          >
            <FaPlus />
            <span>{t('Add New Input')}</span>
          </button>
        </div>
      )}

      <div className="  rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
            <div className=" p-10 flex justify-center text-theme-text">
                <FaSpinner className="animate-spin text-2xl" />
            </div>
        ) : error ? (
            <div className="p-10  text-center text-red-500">{error}</div>
        ) : (
            <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full ">
                <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Order')}</th>
                    <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Label (En)')}</th>
                    <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Label (Ar)')}</th>
                    <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Type')}</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Required')}</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Active')}</th>
                    <th className="px-6 py-4 text-end text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Actions')}</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {fields.map((input, index) => (
                    <tr 
                        key={input.id} 
                        className={`hover:bg-blue-700/50 dark:hover:bg-gray-700/30 transition-colors ${draggedItem?.id === input.id ? 'opacity-50' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                    >
                    <td className="px-6 py-4 text-sm text-theme-text">
                        <div 
                            className="flex items-center gap-2 cursor-grab active:cursor-grabbing w-fit"
                            draggable
                            onDragStart={(e) => handleDragStart(e, input)}
                            onDragEnd={handleDragEnd}
                        >
                            <FaGripVertical className="text-gray-400 hover:text-blue-500" />
                            <span>{input.sort_order}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-theme-text">{input.label_en}</td>
                    <td className="px-6 py-4 text-sm text-theme-text font-arabic">{input.label_ar}</td>
                    <td className="px-6 py-4 text-sm text-black">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">
                        {t(input.type)}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        {input.required ? <FaCheck className="text-green-500 mx-auto" /> : <FaTimes className="text-gray-300 mx-auto" />}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                            <Toggle
                                value={input.active}
                                onChange={() => toggleActive(input.id)}
                            />
                        </div>
                    </td>
                    <td className="px-6 py-4 text-end">
                        <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => openModal(input)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                            <FaEdit />
                        </button>
                        <button
                            onClick={() => handleDelete(input.id)}
                            className="p-2 text-theme-text hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <FaTrash />
                        </button>
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-4 p-4">
                {fields.map((input, index) => (
                    <div 
                        key={input.id} 
                        className={`bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ${draggedItem?.id === input.id ? 'opacity-50' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <div 
                                    className="cursor-grab active:cursor-grabbing p-1"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, input)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <FaGripVertical className="text-theme hover:text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-theme-text">{input.label_en}</h3>
                                    <p className="text-xs text-theme font-arabic">{input.label_ar}</p>
                                </div>
                            </div>
                            <span className="px-2 py-1 bg-gray-700 rounded text-xs font-medium text-theme-text">
                                {t(input.type)}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                            <div className="flex flex-col items-end">
                                <span className="text-theme text-xs">{t('Required')}</span>
                                {input.required ? <FaCheck className="text-green-500" /> : <FaTimes className="text-gray-300" />}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-theme">{t('Active')}</span>
                                <Toggle
                                    value={input.active}
                                    onChange={() => toggleActive(input.id)}
                                    size="sm"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openModal(input)}
                                    className="p-2 text-blue-600 bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                >
                                    <FaEdit />
                                </button>
                                <button
                                    onClick={() => handleDelete(input.id)}
                                    className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="card dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-theme-text">
                {currentField ? t('Edit Input') : t('Add New Input')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-theme-text mb-1">{t('Type')} *</label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700  dark:bg-gray-900 text-theme-text focus:ring-2 focus:ring-blue-500/20 outline-none"
                        >
                            {inputTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-theme-text mb-1">{t('Label (English)')} *</label>
                        <input
                            type="text"
                            required
                            value={formData.label_en}
                            onChange={e => {
                                const val = e.target.value
                                setFormData(prev => ({
                                    ...prev,
                                    label_en: val,
                                    key: !currentField ? generateSlug(val) : prev.key
                                }))
                            }}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700  dark:bg-gray-900 text-theme-text focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-theme-text mb-1">{t('Label (Arabic)')} *</label>
                        <input
                            type="text"
                            required
                            value={formData.label_ar}
                            onChange={e => setFormData({...formData, label_ar: e.target.value})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700  text-theme-text focus:ring-2 focus:ring-blue-500/20 outline-none font-arabic"
                            dir="rtl"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-theme-text mb-1">{t('Placeholder (English)')}</label>
                        <input
                            type="text"
                            value={formData.placeholder_en || ''}
                            onChange={e => setFormData({...formData, placeholder_en: e.target.value})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700  text-theme-text focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-theme-text mb-1">{t('Placeholder (Arabic)')}</label>
                        <input
                            type="text"
                            value={formData.placeholder_ar || ''}
                            onChange={e => setFormData({...formData, placeholder_ar: e.target.value})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700  text-theme-text focus:ring-2 focus:ring-blue-500/20 outline-none font-arabic"
                            dir="rtl"
                        />
                    </div>
                </div>

                {['select', 'radio'].includes(formData.type) && (
                    <div>
                        <label className="block text-sm font-medium text-theme-text mb-1">{t('Options (Comma separated)')}</label>
                        <textarea
                            value={Array.isArray(formData.options) ? formData.options.join(', ') : formData.options}
                            onChange={e => setFormData({...formData, options: e.target.value})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-theme-text focus:ring-2 focus:ring-blue-500/20 outline-none"
                            placeholder="Option 1, Option 2, Option 3"
                        />
                    </div>
                )}

                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Toggle
                            label={t('Required')}
                            value={formData.required}
                            onChange={(val) => setFormData({...formData, required: val})}
                        />
                        <Toggle
                            label={t('Active')}
                            value={formData.active}
                            onChange={(val) => setFormData({...formData, active: val})}
                        />
                        <Toggle
                            label={t('Show in Filter')}
                            value={formData.can_filter}
                            onChange={(val) => setFormData({...formData, can_filter: val})}
                        />
                        <Toggle
                            label={t('Landing Page')}
                            value={formData.is_landing_page}
                            onChange={(val) => setFormData({...formData, is_landing_page: val})}
                        />
                        <Toggle
                            label={t('Show in My Leads')}
                            value={formData.show_my_lead}
                            onChange={(val) => setFormData({...formData, show_my_lead: val})}
                        />
                        <Toggle
                            label={t('Show in Sales')}
                            value={formData.show_sales}
                            onChange={(val) => setFormData({...formData, show_sales: val})}
                        />
                        <Toggle
                            label={t('Show in Manager')}
                            value={formData.show_manager}
                            onChange={(val) => setFormData({...formData, show_manager: val})}
                        />
                        <Toggle
                            label={t('Exportable')}
                            value={formData.is_exportable}
                            onChange={(val) => setFormData({...formData, is_exportable: val})}
                        />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-theme-text mb-1">{t('Sort Order')}</label>
                        <input
                            type="number"
                            value={formData.sort_order}
                            onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700  text-theme-text focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-black bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                    >
                        {t('Save Input')}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
