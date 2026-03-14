import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// نافذة إنشاء مهمة جديدة - تدعم الدارك/لايت عبر متغيرات CSS المستخدمة في المشروع
export default function NewTaskModal({ isOpen, onClose, onSave, users = [] }) {
  const { t, i18n } = useTranslation();
  const isArabic = (i18n?.language || '').toLowerCase().startsWith('ar');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [taskType, setTaskType] = useState('visit');
  const [relatedType, setRelatedType] = useState('');
  const [relatedRef, setRelatedRef] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [progress, setProgress] = useState(0);
  const [reminderBefore, setReminderBefore] = useState('');
  const [recurring, setRecurring] = useState('none');

  const assignees = useMemo(() => {
    if (users && users.length > 0) {
      return users.map(u => ({ value: u.id, label: u.name }));
    }
    return [];
  }, [users]);
  
  const relatedModules = useMemo(() => [
    'Lead', 'Deal', 'Contact', 'Opportunity', 'Ticket', 'Project'
  ], []);
  const taskTypes = useMemo(() => [
    'visit', 'mission', 'delivery', 'email', 'meeting', 'call'
  ], []);
  const reminderOptions = useMemo(() => [
    { value: '5m', label: isArabic ? 'قبل 5 دقائق' : '5 minutes before' },
    { value: '15m', label: isArabic ? 'قبل 15 دقيقة' : '15 minutes before' },
    { value: '30m', label: isArabic ? 'قبل 30 دقيقة' : '30 minutes before' },
    { value: '1h', label: isArabic ? 'قبل ساعة' : '1 hour before' },
    { value: '2h', label: isArabic ? 'قبل ساعتين' : '2 hours before' },
    { value: '1d', label: isArabic ? 'قبل يوم' : '1 day before' }
  ], [isArabic]);
  const recurringOptions = useMemo(() => [
    { value: 'none', label: isArabic ? 'بدون' : 'None' },
    { value: 'daily', label: isArabic ? 'يومي' : 'Daily' },
    { value: 'weekly', label: isArabic ? 'أسبوعي' : 'Weekly' },
    { value: 'monthly', label: isArabic ? 'شهري' : 'Monthly' }
  ], [isArabic]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) {
      setError(isArabic ? 'العنوان مطلوب' : 'Title is required');
      return;
    }
    // نمرر due لضمان الربط مع الجدول وتفاصيل المهمة، ونحتفظ بـ endDate للتوافق
    const payload = {
      title: title.trim(),
      description: description.trim(),
      assignedTo,
      due: endDate,
      endDate,
      startDate,
      priority,
      attachment,
      taskType,
      relatedType,
      relatedRef,
      tags: tagsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      progress,
      reminderBefore,
      recurring,
    };
    onSave?.(payload);
    // إعادة تعيين الحقول بعد الحفظ
    setTitle(''); setDescription(''); setAssignedTo(''); setEndDate(''); setStartDate(''); setPriority('medium'); setAttachment(null); setTaskType('visit'); setRelatedType(''); setRelatedRef(''); setTagsInput(''); setProgress(0); setReminderBefore(''); setRecurring('none'); setError('');
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) { setAttachment(null); return; }
    const url = URL.createObjectURL(file);
    setAttachment({ file, name: file.name, size: file.size, type: file.type, url });
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-start justify-center pt-8 sm:pt-12">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full sm:w-[95%] sm:max-w-3xl sm:max-h-[85vh] overflow-y-auto bg-[var(--content-bg)] text-[var(--content-text)] border border-[var(--divider)] shadow-2xl rounded-t-2xl sm:rounded-2xl animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--divider)] bg-[var(--content-bg)]/95 backdrop-blur">
          <h2 className="text-xl font-bold tracking-tight">{isArabic ? 'مهمة جديدة' : 'New Task'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--table-row-hover)] transition-colors" aria-label={isArabic ? 'إغلاق' : 'Close'}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-6 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium opacity-90">{isArabic ? 'العنوان' : 'Title'} <span className="text-red-500">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isArabic ? 'أدخل عنوان المهمة...' : 'Enter task title...'}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium opacity-90">{isArabic ? 'الوصف' : 'Description'}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isArabic ? 'أدخل تفاصيل المهمة...' : 'Enter task details...'}
              className="w-full min-h-[100px] px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] resize-y focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          {/* Grid Layout for compact fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Assigned To */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium opacity-90">{isArabic ? 'مسند إلى' : 'Assigned To'}</label>
              <div className="relative">
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] appearance-none pr-10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                >
                  <option value="">{isArabic ? 'اختر شخص/فريق' : 'Select person/team'}</option>
                  {assignees.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium opacity-90">{isArabic ? 'الأولوية' : 'Priority'} <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] appearance-none pr-10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                >
                  <option value="low">{isArabic ? 'منخفضة' : 'Low'}</option>
                  <option value="medium">{isArabic ? 'متوسطة' : 'Medium'}</option>
                  <option value="high">{isArabic ? 'عالية' : 'High'}</option>
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Start date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium opacity-90">{isArabic ? 'تاريخ البداية' : 'Start date'}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium opacity-90">{isArabic ? 'تاريخ الاستحقاق' : 'Due date'}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            {/* Task Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium opacity-90">{isArabic ? 'نوع المهمة' : 'Task type'}</label>
              <div className="relative">
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] appearance-none pr-10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                >
                  {taskTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Attached File */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium opacity-90">{isArabic ? 'ملف مرفق' : 'Attached File'}</label>
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  onChange={onFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] cursor-pointer hover:bg-[var(--table-row-hover)] transition-colors focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500"
                >
                  <span className="text-sm opacity-70 truncate max-w-[180px]">
                    {attachment ? attachment.name : (isArabic ? 'اختر ملف...' : 'Choose file...')}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 opacity-50">
                    <path d="M21.44 11.05l-9.9 9.9a5.5 5.5 0 01-7.78-7.78l9.9-9.9a3.5 3.5 0 015 5l-9.2 9.2a1.5 1.5 0 01-2.12-2.12l8.49-8.49" />
                  </svg>
                </label>
                {attachment && (
                   <button 
                     type="button" 
                     onClick={(e) => { e.preventDefault(); setAttachment(null); }} 
                     className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-red-500/10 text-red-500"
                     title={isArabic ? 'إزالة' : 'Remove'}
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                       <path d="M18 6L6 18M6 6l12 12" />
                     </svg>
                   </button>
                )}
              </div>
            </div>

            {/* Related To */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium opacity-90">{isArabic ? 'مرتبط بـ' : 'Related to'}</label>
              <div className="relative">
                <select
                  value={relatedType}
                  onChange={(e) => setRelatedType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] appearance-none pr-10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                >
                  <option value="">{isArabic ? 'اختر الكيان' : 'Select entity'}</option>
                  {relatedModules.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Reference ID */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium opacity-90">{isArabic ? 'مرجع/رقم' : 'Reference/ID'}</label>
              <input
                value={relatedRef}
                onChange={(e) => setRelatedRef(e.target.value)}
                placeholder={isArabic ? 'مثال: LEAD-102' : 'e.g., LEAD-102'}
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            {/* Reminder */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium opacity-90">{isArabic ? 'تذكير' : 'Reminder'}</label>
              <div className="relative">
                <select
                  value={reminderBefore}
                  onChange={(e) => setReminderBefore(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] appearance-none pr-10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                >
                  {reminderOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Recurring */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium opacity-90">{isArabic ? 'تكرار المهمة' : 'Recurring'}</label>
              <div className="relative">
                <select
                  value={recurring}
                  onChange={(e) => setRecurring(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] appearance-none pr-10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                >
                  {recurringOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tags (Full Width) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium opacity-90">{isArabic ? 'وسوم/تصنيفات' : 'Tags/Labels'}</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={isArabic ? 'افصل بين الوسوم بفواصل (مثال: عاجل, مبيعات)' : 'Comma-separated tags (e.g. urgent, sales)'}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          {/* Progress (Full Width) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium opacity-90">{isArabic ? 'نسبة الإنجاز' : 'Progress'}</label>
              <span className="text-sm font-bold text-indigo-500">{progress}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:bg-gray-700"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--divider)] bg-[var(--content-bg)]/95 backdrop-blur rounded-b-2xl">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 rounded-lg border border-[var(--divider)] bg-[var(--dropdown-bg)] text-sm font-medium hover:bg-[var(--table-row-hover)] transition-colors"
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <button 
            onClick={handleSave} 
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isArabic ? 'حفظ المهمة' : 'Save Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
