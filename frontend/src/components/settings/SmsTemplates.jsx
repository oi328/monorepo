import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  getSmsTemplates, 
  createSmsTemplate, 
  updateSmsTemplate, 
  deleteSmsTemplate 
} from '../../services/smsService'
import { toast } from 'react-hot-toast'
import { Plus, X, Search, Edit2, Trash2, Save, MessageSquare } from 'lucide-react'

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="card w-full sm:max-w-lg flex flex-col max-h-[90vh] sm:rounded-2xl rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h3 className="text-lg font-bold text-theme-text">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function SmsTemplates({ onClose }) {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTpl, setEditingTpl] = useState(null)
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'OTP',
    status: 'Active',
    body: ''
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const tpls = await getSmsTemplates()
      if (Array.isArray(tpls)) {
        setTemplates(tpls.map(t => ({
          ...t,
          status: t.status ? 'Active' : 'Inactive', // Convert boolean/string if needed
          updatedAt: t.updated_at ? new Date(t.updated_at).toLocaleString() : new Date().toLocaleString()
        })))
      } else {
        // Fallback mock data if API returns nothing
        setTemplates([
            { id: 'sms-otp', name: 'otp_auth', type: 'OTP', status: 'Active', body: 'Your verification code is {{otp}}.' },
            { id: 'sms-pay', name: 'payment_reminder', type: 'Payment', status: 'Inactive', body: 'Dear {{name}}, your payment of {{amount}} is due on {{date}}.' },
        ])
      }
    } catch (error) {
      console.error('Failed to fetch SMS templates:', error)
      toast.error(t('Failed to load templates'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const openAddModal = () => {
    setEditingTpl(null)
    setFormData({
      name: '',
      type: 'OTP',
      status: 'Active',
      body: ''
    })
    setIsModalOpen(true)
  }

  const openEditModal = (tpl) => {
    setEditingTpl(tpl)
    setFormData({
      name: tpl.name,
      type: tpl.type || 'OTP',
      status: tpl.status || 'Active',
      body: tpl.body
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTpl(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = formData.name.trim()
    const body = formData.body.trim()
    
    if (!name || !body) { 
      toast.error(t('Please fill all required fields'))
      return 
    }
    
    try {
      const templateData = {
        ...formData,
        name,
        body,
        // Ensure status is boolean if backend expects boolean, or string if string.
        // Based on previous code: status: tplStatus === 'Active'
        // But let's check what I mapped in fetchTemplates.
        // Actually the previous code sent: status: tplStatus === 'Active' (boolean true/false)
        // I will stick to what the form uses (Active/Inactive string) and convert before sending if needed.
        // The previous code had `status: tplStatus === 'Active'` in payload.
        // Let's send boolean if that's what backend expects.
        status: formData.status === 'Active'
      }

      if (editingTpl) {
        await updateSmsTemplate(editingTpl.id, templateData)
        toast.success(t('Template updated successfully'))
      } else {
        await createSmsTemplate(templateData)
        toast.success(t('Template created successfully'))
      }
      
      await fetchTemplates()
      closeModal()
    } catch (error) {
      console.error('Failed to save template:', error)
      toast.error(t('Failed to save template'))
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm(t('Are you sure you want to delete this template?'))) {
      try {
        await deleteSmsTemplate(id)
        await fetchTemplates()
        toast.success(t('Template deleted successfully'))
      } catch (error) {
        console.error('Failed to delete template:', error)
        toast.error(t('Failed to delete template'))
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-theme-text">{t('SMS Templates')}</h2>
          <p className="text-sm opacity-60 mt-1 text-theme-text">{t('Manage your SMS templates for automated notifications')}</p>
        </div>
        <div className="flex gap-2">
          {onClose && (
             <button onClick={onClose} className="btn btn-glass">
               {t('Back')}
             </button>
          )}
          <button 
            onClick={openAddModal}
            className="btn btn-primary px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold tracking-wide"
          >
            <Plus className="w-5 h-5" />
            {t('New Template')}
          </button>
        </div>
      </div>

      {/* Template List */}
      <div className="w-full">
        <div className="glass-panel rounded-2xl p-6 border border-gray-200 dark:border-gray-700 bg-gray-800/50">
          <h3 className="text-lg font-semibold mb-4 text-theme-text">{t('Template List')}</h3>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="p-3 font-medium text-theme">No.</th>
                  <th className="p-3 font-medium text-theme">{t('Template Name')}</th>
                  <th className="p-3 font-medium text-theme">{t('Template Type')}</th>
                  <th className="p-3 font-medium text-theme">{t('Last Updated')}</th>
                  <th className="p-3 font-medium text-theme">{t('Status')}</th>
                  <th className="p-3 font-medium text-theme text-right">{t('Action')}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl, index) => (
                  <tr key={tpl.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-700/50 transition-colors">
                    <td className="p-3 text-theme-text">{index + 1}</td>
                    <td className="p-3 text-theme-text font-medium">{tpl.name}</td>
                    <td className="p-3 text-theme-text">
                      <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-theme">
                        {t(tpl.type)}
                      </span>
                    </td>
                    <td className="p-3 text-theme-text text-sm opacity-70">{tpl.updatedAt}</td>
                    <td className="p-3 text-theme-text">
                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full 
                            ${tpl.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {t(tpl.status)}
                        </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(tpl)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 transition-colors"
                          title={t('Edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition-colors"
                          title={t('Delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-theme">
                      {t('No templates found')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid gap-4">
            {templates.length === 0 && !loading ? (
              <div className="text-center text-theme py-8 bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p>{t('No templates found')}</p>
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="flex flex-col p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-base text-theme-text">{tpl.name}</h4>
                      <div className="mt-1">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                          {t(tpl.type)}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full 
                        ${tpl.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {t(tpl.status)}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    {t('Last Updated')}: {tpl.updatedAt}
                  </div>
                  
                  <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                    <button 
                      onClick={() => openEditModal(tpl)}
                      className="flex-1 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400"
                    >
                      <Edit2 className="w-4 h-4" /> {t('Edit')}
                    </button>
                    <button 
                      onClick={() => handleDelete(tpl.id)}
                      className="flex-1 py-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-medium hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> {t('Delete')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTpl ? t('Edit Template') : t('New Template')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              {t('Template Name')}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme-text focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. payment_reminder"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme mb-1">
                {t('Template Type')}
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme-text focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="OTP">{t('OTP')}</option>
                <option value="Payment">{t('Payment')}</option>
                <option value="Renewal">{t('Renewal')}</option>
                <option value="Reminder">{t('Reminder')}</option>
                <option value="Custom">{t('Custom')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme mb-1">
                {t('Status')}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme-text focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Active">{t('Active')}</option>
                <option value="Inactive">{t('Inactive')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              {t('Message Body')}
            </label>
            <textarea
              name="body"
              value={formData.body}
              onChange={handleInputChange}
              rows="6"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme-text focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono text-sm"
              placeholder={t('Use {{otp}} for verification code.')}
              required
            />
            <p className="text-[10px] opacity-50 mt-1 text-theme-text">{t('Use {{1}}, {{2}} for variables.')}</p>
          </div>

          <div className="flex gap-2 pt-2 justify-end">
            <button
              type="button"
              onClick={closeModal}
              className="btn btn-glass px-4"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2 px-6"
            >
              <Save className="w-4 h-4" />
              {t('Save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
