import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '../../services/emailTemplateService'
import { Plus, X, Edit2, Trash2, Save } from 'lucide-react'

// Simple Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h3 className="text-lg font-semibold text-theme">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-700/50  transition-colors">
            <X className="w-5 h-5 text-theme" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function EmailTemplates() {
  const { t } = useTranslation()

  const [templates, setTemplates] = useState([])

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    related: 'Leads',
    subject: '',
    body: ''
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const relatedOptions = ['Leads', 'Customers', 'Invoices', 'Tickets']

  useEffect(() => {
    let mounted = true
    getEmailTemplates()
      .then(list => {
        if (!mounted) return
        setTemplates(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: formData.name.trim(),
      related: formData.related,
      subject: formData.subject.trim(),
      body: formData.body.trim(),
      status: 'Approved',
    }
    if (!payload.name || !payload.body) return
    try {
      if (isEditing && formData.id) {
        await updateEmailTemplate(formData.id, payload)
      } else {
        await createEmailTemplate(payload)
      }
      const list = await getEmailTemplates()
      setTemplates(Array.isArray(list) ? list : [])
      closeModal()
    } catch {}
  }

  const openAddModal = () => {
    resetForm()
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const openEditModal = (template) => {
    setFormData(template)
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    resetForm()
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('Are you sure you want to delete this template?'))) return
    try {
      await deleteEmailTemplate(id)
      const list = await getEmailTemplates()
      setTemplates(Array.isArray(list) ? list : [])
    } catch {}
  }

  const resetForm = () => {
    setFormData({
      id: null,
      name: '',
      related: 'Leads',
      subject: '',
      body: ''
    })
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Actions */}
      <div className="flex justify-end w-full md:w-auto">
        <button 
          onClick={openAddModal}
          className="btn btn-primary w-full md:w-auto flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('Add New Template')}
        </button>
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
                  <th className="p-3 font-medium text-theme">{t('Related')}</th>
                  <th className="p-3 font-medium text-theme">{t('Subject')}</th>
                  <th className="p-3 font-medium text-theme text-right">{t('Action')}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl, index) => (
                  <tr key={tpl.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-700/50  transition-colors">
                    <td className="p-3 text-theme-text">{index + 1}</td>
                    <td className="p-3 text-theme-text font-medium">{tpl.name}</td>
                    <td className="p-3 text-theme-text">
                      <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-black dark:text-indigo-300">
                        {tpl.related}
                      </span>
                    </td>
                    <td className="p-3 text-theme-text truncate max-w-[200px]">{tpl.subject}</td>
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
                {templates.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-theme">
                      {t('No templates found')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid gap-4">
            {templates.length === 0 ? (
              <div className="text-center text-theme py-8 bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p>{t('No templates found')}</p>
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="flex flex-col p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-800 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-base text-theme-text">{tpl.name}</h4>
                      <div className="mt-1">
                        <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-black dark:text-indigo-300">
                          {tpl.related}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-theme mb-4 bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="font-medium text-xs text-theme mb-1">{t('Subject')}:</div>
                    {tpl.subject}
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
        title={isEditing ? t('Edit Template') : t('Add New Template')}
        className="card"
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
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600  text-theme-text focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder={t('Enter template name')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              {t('Related')}
            </label>
            <select
              name="related"
              value={formData.related}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600  text-theme-text focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {relatedOptions.map(opt => (
                <option key={opt} value={opt}>{t(opt)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              {t('Subject')}
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600  text-theme-text focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder={t('Enter email subject')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              {t('Body')}
            </label>
            <textarea
              name="body"
              value={formData.body}
              onChange={handleInputChange}
              rows="6"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600  text-theme-text focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              placeholder={t('Enter email body...')}
              required
            />
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
