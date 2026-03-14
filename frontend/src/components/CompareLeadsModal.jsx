import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../shared/context/ThemeProvider'
import { FaClone,FaTimes,FaArrowRight,FaUserShield,FaExclamationTriangle,FaUser,FaCheck,FaEdit,FaPhone ,FaEnvelope,FaComments,FaHistory,FaCalendarAlt,FaLayerGroup,FaWhatsapp,FaBuilding ,} from 'react-icons/fa'
import TransferSalesModal from './TransferSalesModal'

const CompareLeadsModal = ({ isOpen, onClose, duplicateLead, originalLead, onResolve, usersList = [] }) => {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const isRtl = i18n.language === 'ar'

  // Local state for editing
  const [isEditingOriginal, setIsEditingOriginal] = useState(false)
  const [isEditingDuplicate, setIsEditingDuplicate] = useState(false)
  const [localOriginal, setLocalOriginal] = useState(originalLead)
  const [localDuplicate, setLocalDuplicate] = useState(duplicateLead)
  const [showTransferModal, setShowTransferModal] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Normalize data to ensure editing works correctly (avoid fallback issues)
      const normalize = (lead) => {
        if (!lead) return lead
        return {
          ...lead,
          name: lead.name || lead.fullName,
          phone: lead.phone || lead.mobile,
          notes: lead.notes || lead.description
        }
      }

      setLocalOriginal(normalize(originalLead))
      setLocalDuplicate(normalize(duplicateLead))
      setIsEditingOriginal(false)
      setIsEditingDuplicate(false)
    }
  }, [isOpen, originalLead, duplicateLead])

  const handleOriginalChange = (key, value) => {
    setLocalOriginal(prev => ({ ...prev, [key]: value }))
  }

  const handleDuplicateChange = (key, value) => {
    setLocalDuplicate(prev => ({ ...prev, [key]: value }))
  }
  
  const getAssigneeName = (lead) => {
    if (!lead) return t('Unassigned');
    // 1. Prefer explicit sales_person name
    if (lead.sales_person) return lead.sales_person;
    
    // 2. Check if assignedTo is an object with name
    if (typeof lead.assignedTo === 'object' && lead.assignedTo?.name) return lead.assignedTo.name;
    
    // 3. If assignedTo is ID/string, try to find in usersList (if provided)
    if (usersList && usersList.length > 0) {
       const user = usersList.find(u => String(u.id) === String(lead.assignedTo) || u.name === lead.assignedTo);
       if (user) return user.name;
    }
    
    // 4. Fallback to raw value or Unassigned
    return lead.assignedTo || t('Unassigned');
  }

  if (!isOpen) return null

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate time difference
  const timeDiff = originalLead && duplicateLead 
    ? Math.abs(new Date(duplicateLead.createdAt) - new Date(originalLead.createdAt))
    : 0
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

  const renderLeadDetails = (lead, isDuplicate = false) => {
    if (!lead) return null;
    
    const isEditing = isDuplicate ? isEditingDuplicate : isEditingOriginal
    const handleChange = isDuplicate ? handleDuplicateChange : handleOriginalChange

    const fields = [
        { key: 'name', label: t('Name'), icon: <FaUser />, value: lead.name, editable: true },
        { key: 'phone', label: t('Phone'), icon: <FaPhone />, value: lead.phone, editable: true },
        { key: 'email', label: t('Email'), icon: <FaEnvelope />, value: lead.email, editable: true },
        { key: 'company', label: t('Company'), icon: <FaBuilding />, value: lead.company, editable: true },
        { key: 'project', label: t('Project'), icon: <FaBuilding />, value: lead.project, editable: true },
        { key: 'source', label: t('Source'), icon: <FaWhatsapp />, value: lead.source, editable: true },
        { 
          key: 'assigned_to', 
          label: t('Sales Person'), 
          icon: <FaUserShield />, 
          value: lead.assigned_to || lead.assignedTo, 
          editable: true,
          type: 'select',
          options: usersList.map(u => ({ value: u.id, label: u.name }))
        },
        { key: 'stage', label: t('Stage'), icon: <FaLayerGroup />, value: lead.stage, editable: false },
        { key: 'status', label: t('Status'), icon: <FaCheck />, value: lead.status, editable: false },
        { key: 'priority', label: t('Priority'), icon: <FaExclamationTriangle />, value: lead.priority, editable: false },
        { key: 'createdAt', label: t('Creation Date'), icon: <FaCalendarAlt />, value: formatDate(lead.createdAt), editable: false },
        { key: 'lastContact', label: t('Last Interaction'), icon: <FaHistory />, value: formatDate(lead.lastContact), editable: false },
        { key: 'notes', label: t('Notes'), icon: <FaComments />, value: lead.notes, fullWidth: true, editable: true, type: 'textarea' },
    ];

    return (
        <div className="space-y-3">
            {fields.map((field, index) => {
                if (!field.value && field.key !== 'notes' && !isEditing) return null; 
                
                return (
                    <div key={index} className={`p-3 rounded-xl border transition-colors flex items-start gap-3 
                        ${isDuplicate 
                            ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' 
                            : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600/50 hover:border-blue-200 dark:hover:border-blue-900/50'
                        } ${field.fullWidth ? 'col-span-1' : ''}`}>
                        
                        <div className={`mt-1 ${isDuplicate ? 'text-red-400' : 'text-slate-400'}`}>
                            {field.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                {field.label}
                            </span>
                            <div className="flex items-center gap-2 w-full">
                                {isEditing && field.editable ? (
                                    field.type === 'textarea' ? (
                                        <textarea
                                            value={field.value || ''}
                                            onChange={(e) => handleChange(field.key, e.target.value)}
                                            className="w-full text-sm bg-white dark:bg-slate-800 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                            rows={2}
                                        />
                                    ) : field.type === 'select' ? (
                                        <select
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                handleChange(field.key, val);
                                                // If it's a salesperson, we might also want to update sales_person name
                                                if (field.key === 'assigned_to') {
                                                    const user = usersList.find(u => String(u.id) === String(val));
                                                    if (user) {
                                                        handleChange('sales_person', user.name);
                                                        handleChange('assignedTo', val); // Keep both for safety
                                                    }
                                                }
                                            }}
                                            className="w-full text-sm bg-white dark:bg-slate-800 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="">{t('Select Sales Person')}</option>
                                            {field.options?.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={field.value || ''}
                                            onChange={(e) => handleChange(field.key, e.target.value)}
                                            className="w-full text-black text-sm bg-white dark:bg-slate-800 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    )
                                ) : (
                                    <span className={`block text-sm font-semibold text-slate-900 dark:text-white break-words whitespace-pre-wrap`}>
                                        {field.key === 'assigned_to' ? getAssigneeName(lead) : (field.value || '-')}
                                    </span>
                                )}
                                
                                {isDuplicate && field.key === 'createdAt' && daysDiff > 0 && !isEditing && (
                                    <span className="text-xs text-red-600 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded font-medium">
                                        +{daysDiff}d
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  const handleResolve = (action, extraData = null) => {
    onResolve(action, localOriginal, localDuplicate, extraData)
  }

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div 
        className={`${!isDark ? 'bg-white/70 backdrop-blur-md text-slate-800' : 'bg-slate-800 text-white'} w-full sm:max-w-5xl max-h-[85vh] h-auto sm:rounded-3xl overflow-hidden shadow-2xl border flex flex-col ${!isDark ? 'border-gray-200' : 'border-slate-700'}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header - Aligned with Project Identity */}
        <div className={`${!isDark ? 'bg-white/60 border-gray-200' : 'bg-slate-800 border-slate-700'} p-3 sm:p-4 border-b flex justify-between items-center shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`${isDark ? 'bg-red-900/30 text-red-500' : 'bg-red-100 text-red-600'} p-2.5 rounded-xl`}>
              <FaClone size={20} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('Resolve Duplicate Lead')}</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {t('Compare and resolve conflict between two records')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className={`flex-1 overflow-y-auto p-6 ${isDark ? 'bg-transparent' : 'bg-transparent'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            
            {/* Divider Icon (Desktop) */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className={`${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'} p-2 rounded-full shadow-lg border text-slate-400`}>
                {isRtl ? <FaArrowRight size={16} className="rotate-180" /> : <FaArrowRight size={16} />}
              </div>
            </div>

            {/* Left Card: Original Owner (Primary/Blue Theme) */}
            <div className={`${isDark ? 'bg-slate-700/40 border-blue-500/20' : 'bg-white/60 border-blue-200'} rounded-xl shadow-sm border overflow-hidden flex flex-col h-full relative group hover:shadow-md transition-shadow duration-300`}>
              {/* Badge */}
              <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto flex items-center gap-2">
                 <button
                    onClick={() => setIsEditingOriginal(!isEditingOriginal)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 transition-colors ${
                        isEditingOriginal 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : (isDark ? 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')
                    }`}
                 >
                    {isEditingOriginal ? <FaCheck size={10} /> : <FaEdit size={10} />}
                    {isEditingOriginal ? t('Save') : t('Edit')}
                 </button>
                <span className={`${isDark ? 'bg-blue-900/40 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200'} text-xs font-semibold px-2.5 py-1 rounded-full border`}>
                  {t('Original Record')}
                </span>
              </div>

              <div className="p-6 flex-1">
                {/* Sales Rep Profile */}
                <div className="flex items-center gap-4 mb-6 mt-2">
                  <div className={`${isDark ? 'bg-slate-600/50 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-white'} w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-4 shadow-sm`}>
                    {getAssigneeName(originalLead).charAt(0) || 'A'}
                  </div>
                  <div>
                    <h4 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{getAssigneeName(originalLead)}</h4>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1`}>
                       <FaUserShield className="text-blue-500" size={12} /> {t('Senior Sales Agent')}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                {renderLeadDetails(localOriginal)}
              </div>
              
              {/* Footer Button - Keep Original */}
              <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
                <button 
                  onClick={() => handleResolve('keep_original')}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <FaCheck size={14} />
                  {t('Keep Original Info')}
                </button>
              </div>
            </div>

            {/* Right Card: New Sales Rep (Warning/Red Theme) */}
            <div className={`${isDark ? 'bg-slate-700/40 border-red-500/20' : 'bg-white/60 border-red-200'} rounded-xl shadow-sm border overflow-hidden flex flex-col h-full relative group hover:shadow-md transition-shadow duration-300`}>
               {/* Badge */}
               <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto flex items-center gap-2">
                 <button
                    onClick={() => setIsEditingDuplicate(!isEditingDuplicate)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 transition-colors ${
                        isEditingDuplicate 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : (isDark ? 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')
                    }`}
                 >
                    {isEditingDuplicate ? <FaCheck size={10} /> : <FaEdit size={10} />}
                    {isEditingDuplicate ? t('Save') : t('Edit')}
                 </button>
                <span className={`${isDark ? 'bg-red-900/40 text-red-300 border-red-800' : 'bg-red-100 text-red-700 border-red-200'} text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1`}>
                  <FaExclamationTriangle size={10} />
                  {t('Duplicate')}
                </span>
              </div>

              <div className="p-6 flex-1">
                {/* Sales Rep Profile */}
                <div className="flex items-center gap-4 mb-6 mt-2">
                  <div className={`${isDark ? 'bg-slate-600/50 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-white'} w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-4 shadow-sm`}>
                    {getAssigneeName(duplicateLead).charAt(0) || 'N'}
                  </div>
                  <div>
                    <h4 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{getAssigneeName(duplicateLead)}</h4>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1`}>
                       <FaUser className="text-red-500" size={12} /> {t('Sales Agent')}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                {renderLeadDetails(localDuplicate, true)}
              </div>
              
               {/* Footer Button - Keep Duplicate */}
               <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
                <button 
                  onClick={() => handleResolve('keep_duplicate')}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <FaClone size={14} />
                  {t('Keep Duplicate Info')}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions - Standardized Buttons */}
        <div className={`${!isDark ? 'bg-white/60 border-gray-200' : 'bg-slate-800 border-slate-700'} p-3 sm:p-4 border-t flex flex-col items-center gap-4 shrink-0`}>
            <button 
              onClick={() => setShowTransferModal(true)}
              className={`${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'} px-8 py-3 rounded-lg font-bold transition-colors text-sm shadow-sm border border-transparent hover:border-gray-300 dark:hover:border-slate-500`}
            >
              {t('Transfer to Other Sales')}
            </button>
        </div>
      </div>
      
      {/* Transfer Modal */}
      <TransferSalesModal 
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onConfirm={(data) => handleResolve('transfer', data)}
        usersList={usersList}
      />
    </div>,
    document.body
  )
}

export default CompareLeadsModal
