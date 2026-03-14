import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';

export default function TaskDetailsModal({ isOpen, onClose, task }) {
  const { i18n } = useTranslation();
  const isArabic = (i18n?.language || '').toLowerCase().startsWith('ar');
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    if (isOpen && task?.id) {
       api.get(`/api/visits?task_id=${task.id}`)
          .then(res => setVisits(res.data?.data || res.data || []))
          .catch(err => console.error(err));
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const labels = {
    title: isArabic ? 'العنوان' : 'Title',
    description: isArabic ? 'الوصف' : 'Description',
    assigned: isArabic ? 'المسند إليه' : 'Assigned To',
    status: isArabic ? 'الحالة' : 'Status',
    due: isArabic ? 'تاريخ الاستحقاق' : 'Due Date',
    start: isArabic ? 'تاريخ البداية' : 'Start Date',
    salesman: isArabic ? 'المندوب' : 'Sales Person',
    priority: isArabic ? 'الأولوية' : 'Priority',
    attachment: isArabic ? 'المرفقات' : 'Attachments',
    createdBy: isArabic ? 'أنشئت بواسطة' : 'Created By',
    taskType: isArabic ? 'نوع المهمة' : 'Task Type',
    relatedTo: isArabic ? 'مرتبط بـ' : 'Related To',
    reference: isArabic ? 'مرجع/رقم' : 'Reference',
    tags: isArabic ? 'الوسوم' : 'Tags',
    progress: isArabic ? 'نسبة الإنجاز' : 'Progress',
    reminder: isArabic ? 'تذكير' : 'Reminder',
    recurring: isArabic ? 'تكرار' : 'Recurring',
    details: isArabic ? 'تفاصيل المهمة' : 'Task Details',
    close: isArabic ? 'إغلاق' : 'Close'
  };

  // Helper to render a field with consistent styling
  const RenderField = ({ label, value, fullWidth = false, isTag = false, isLink = false }) => {
    if (!value) return null;
    
    return (
      <div className={fullWidth ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
        <label className="text-sm font-medium text-[var(--content-text)] opacity-70 block">
          {label}
        </label>
        <div className={`text-[var(--content-text)] font-medium ${isTag ? 'flex flex-wrap gap-2' : ''}`}>
          {isTag ? (
             Array.isArray(value) && value.length > 0 ? (
               value.map((tag, idx) => (
                 <span key={idx} className="px-2 py-1 rounded-md bg-[var(--dropdown-bg)] border border-[var(--divider)] text-xs">
                   {tag}
                 </span>
               ))
             ) : '—'
          ) : isLink ? (
             value
          ) : (
            value
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-start justify-center pt-8 sm:pt-12 px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full sm:w-[600px] bg-[var(--content-bg)] rounded-xl shadow-2xl flex flex-col max-h-[85vh] animate-fade-in overflow-hidden border border-[var(--divider)]">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--divider)] bg-[var(--content-bg)]/95 backdrop-blur">
          <h2 className="text-lg font-semibold text-[var(--content-text)]">
            {labels.details}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-[var(--hover-bg)] text-[var(--content-text)] opacity-70 hover:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--content-text)]/20"
            aria-label={labels.close}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Title - Full Width */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-[var(--content-text)] opacity-70 block">
                {labels.title}
              </label>
              <div className="text-lg font-semibold text-[var(--content-text)]">
                {task.name}
              </div>
            </div>

            {/* Description - Full Width */}
            {task.sub && (
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-[var(--content-text)] opacity-70 block">
                  {labels.description}
                </label>
                <div className="text-sm text-[var(--content-text)] whitespace-pre-wrap leading-relaxed p-3 rounded-lg bg-[var(--dropdown-bg)]/50 border border-[var(--divider)]">
                  {task.sub}
                </div>
              </div>
            )}

            <RenderField label={labels.status} value={task.status || '—'} />
            <RenderField label={labels.priority} value={task.priority || '—'} />
            
            <RenderField label={labels.assigned} value={task.assignee || '—'} />
            <RenderField label={labels.salesman} value={task.salesman || '—'} />
            
            <RenderField label={labels.due} value={task.due || '—'} />
            <RenderField label={labels.start} value={task.startDate || '—'} />

            {/* Progress Bar/Value */}
            {typeof task.progress !== 'undefined' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--content-text)] opacity-70 block">
                  {labels.progress}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[var(--divider)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-[var(--content-text)]">{task.progress}%</span>
                </div>
              </div>
            )}

            <RenderField label={labels.taskType} value={task.taskType} />
            
            {/* Conditional Fields */}
            {task.relatedType && <RenderField label={labels.relatedTo} value={task.relatedType} />}
            {task.relatedRef && <RenderField label={labels.reference} value={task.relatedRef} />}
            {task.reminderBefore && <RenderField label={labels.reminder} value={task.reminderBefore} />}
            {task.recurring && <RenderField label={labels.recurring} value={task.recurring} />}
            {task.createdBy && <RenderField label={labels.createdBy} value={task.createdBy} />}

            {/* Tags - Full Width */}
            {task.tags && task.tags.length > 0 && (
              <RenderField label={labels.tags} value={task.tags} isTag={true} fullWidth={true} />
            )}

            {/* Attachments - Full Width */}
            {task.attachment && (
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-[var(--content-text)] opacity-70 block">
                  {labels.attachment}
                </label>
                <a 
                  href={task.attachment.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] hover:bg-[var(--hover-bg)] transition-colors group"
                >
                  <div className="p-2 rounded-md bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M21.44 11.05l-9.9 9.9a5.5 5.5 0 01-7.78-7.78l9.9-9.9a3.5 3.5 0 015 5l-9.2 9.2a1.5 1.5 0 01-2.12-2.12l8.49-8.49" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--content-text)] truncate">
                      {task.attachment.name || labels.attachment}
                    </div>
                    <div className="text-xs text-[var(--content-text)] opacity-50">
                      {isArabic ? 'انقر للفتح' : 'Click to open'}
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-[var(--content-text)] opacity-30 group-hover:opacity-100 transition-opacity">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            )}
          </div>
                 <div className="sm:col-span-2 mt-6 pt-6 border-t border-[var(--divider)]">
            <h3 className="text-md font-semibold text-[var(--content-text)] mb-4">
              {isArabic ? 'سجل الحضور والانصراف' : 'Check-In/Out History'}
            </h3>
            {visits.length > 0 ? (
              <div className="overflow-x-auto border border-[var(--divider)] rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--hover-bg)] text-[var(--content-text)] font-medium text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">
                         <div className="flex items-center gap-2">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-indigo-500 dark:text-indigo-400"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                           <span className="opacity-80">{isArabic ? 'وقت الدخول' : 'Check In'}</span>
                         </div>
                       </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                         <div className="flex items-center gap-2">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-indigo-500 dark:text-indigo-400"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                           <span className="opacity-80">{isArabic ? 'وقت الخروج' : 'Check Out'}</span>
                         </div>
                       </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-indigo-500 dark:text-indigo-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                          <span className="opacity-80">{isArabic ? 'الموقع' : 'Location'}</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-indigo-500 dark:text-indigo-400"><path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                          <span className="opacity-80">{isArabic ? 'الحالة' : 'Status'}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--divider)]">
                    {visits.map((visit, idx) => (
                      <tr key={visit.id || idx} className="hover:bg-[var(--hover-bg)]/50 transition-colors">
                        <td className="px-4 py-3 text-[var(--content-text)] opacity-90">
                          {visit.checkInDate ? new Date(visit.checkInDate).toLocaleString(isArabic ? 'ar-EG' : 'en-US') : '-'}
                        </td>
                        <td className="px-4 py-3 text-[var(--content-text)] opacity-90">
                          {visit.checkOutDate ? new Date(visit.checkOutDate).toLocaleString(isArabic ? 'ar-EG' : 'en-US') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 max-w-[350px]">
                            <span className="truncate text-[var(--content-text)] opacity-80" title={visit.location?.address}>
                              {visit.location?.address || '-'}
                            </span>
                            {visit.location?.lat && visit.location?.lng && (
                              <a
                                href={`https://www.google.com/maps?q=${visit.location.lat},${visit.location.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-110 hover:shadow-md dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-all duration-200 shrink-0"
                                title={isArabic ? 'عرض الموقع' : 'Preview Location'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            visit.status === 'completed' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {visit.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--content-text)] opacity-60 italic text-center py-4 border border-dashed border-[var(--divider)] rounded-lg">
                {isArabic ? 'لا يوجد سجلات حضور لهذه المهمة' : 'No check-in records found for this task'}
              </p>
            )}
          </div>
        </div>

        {/* Footer (Optional - purely for spacing or if we add actions later) */}

      </div>
    </div>
  );
}
