import { useTranslation } from 'react-i18next'
import { useTheme } from '../../shared/context/ThemeProvider'
import { FaBuilding, FaTimes, FaInfoCircle, FaUserTie, FaLayerGroup, FaUsers, FaCalendarAlt } from 'react-icons/fa';

const DepartmentPreviewModal = ({ isOpen, onClose, department }) => {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const isRTL = i18n.language === 'ar'
  
  if (!isOpen || !department) return null

  const inputClass = `w-full px-4 py-2.5 rounded-xl border outline-none transition-all cursor-default text-sm font-medium ${
    isDark 
      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100' 
      : 'bg-gray-50/50 border-gray-200/60 text-gray-800'
  }`

  const labelClass = `block text-xs font-semibold mb-1.5 text-theme-text opacity-60 uppercase tracking-wider`
  const sectionTitleClass = `text-lg font-bold flex items-center gap-2 text-theme-text mb-4 pb-2 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`

  return (
    <div className="fixed inset-0 z-[2050] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className={`card relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col transform transition-all ${isDark ? 'bg-gray-900 ring-1 ring-white/10' : 'bg-white ring-1 ring-black/5'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-8 py-5 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'} bg-opacity-50`}>
          <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <FaBuilding size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-theme-text">{department.name || (isRTL ? 'قسم' : 'Department')}</h2>
                <p className="text-sm opacity-60 text-theme-text">{department.id || '-'}</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-theme-text opacity-70 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          {/* Section 1: Basic Information */}
          <section>
             <h3 className={sectionTitleClass}>
                <span className="text-blue-500"><FaInfoCircle /></span>
                {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>{isRTL ? 'اسم القسم' : 'Department Name'}</label>
                  <div className="relative group">
                    <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text opacity-40 group-hover:opacity-70 transition-opacity`}>
                        <FaBuilding />
                    </div>
                    <input type="text" value={department.name || ''} readOnly className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{isRTL ? 'المدير' : 'Manager'}</label>
                  <div className="relative group">
                    <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text opacity-40 group-hover:opacity-70 transition-opacity`}>
                        <FaUserTie />
                    </div>
                    <input type="text" value={department.manager || ''} readOnly className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`} />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>{isRTL ? 'الحالة' : 'Status'}</label>
                  <div className={`w-full px-4 py-2.5 rounded-xl border flex items-center gap-3 ${
                    department.status === 'Active' 
                        ? (isDark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-700')
                        : (isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${department.status === 'Active' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                    <span className="font-medium">{department.status || 'Inactive'}</span>
                  </div>
                </div>

                <div className="md:col-span-2">
                   <label className={labelClass}>{isRTL ? 'الوصف' : 'Description'}</label>
                   <textarea 
                     readOnly 
                     className={`${inputClass} min-h-[80px] resize-none`}
                     value={department.description || (isRTL ? 'لا يوجد وصف' : 'No description provided')}
                   />
                </div>
             </div>
          </section>

          {/* Section 2: Statistics */}
          <section>
             <h3 className={sectionTitleClass}>
                <span className="text-purple-500"><FaLayerGroup /></span>
                {isRTL ? 'الإحصائيات' : 'Statistics'}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>{isRTL ? 'عدد الفرق' : 'Teams Count'}</label>
                  <div className="relative group">
                     <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text opacity-40 group-hover:opacity-70 transition-opacity`}>
                        <FaUsers />
                     </div>
                     <input type="text" value={department.teamsCount || '0'} readOnly className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`} />
                  </div>
                </div>
                
                <div>
                  <label className={labelClass}>{isRTL ? 'عدد الموظفين' : 'Employees Count'}</label>
                  <div className="relative group">
                     <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text opacity-40 group-hover:opacity-70 transition-opacity`}>
                        <FaUsers />
                     </div>
                     <input type="text" value={department.employeesCount || '0'} readOnly className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`} />
                  </div>
                </div>

                 <div>
                  <label className={labelClass}>{isRTL ? 'تاريخ الإنشاء' : 'Created At'}</label>
                  <div className="relative group">
                     <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text opacity-40 group-hover:opacity-70 transition-opacity`}>
                        <FaCalendarAlt />
                     </div>
                     <input type="text" value={department.createdAt || '-'} readOnly className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`} dir="ltr" />
                  </div>
                </div>
             </div>
          </section>
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 px-8 py-5 border-t ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
          <button
            type="button"
            onClick={onClose}
            className="btn px-6 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-theme-text border-none rounded-xl font-medium transition-colors"
          >
            {isRTL ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DepartmentPreviewModal
