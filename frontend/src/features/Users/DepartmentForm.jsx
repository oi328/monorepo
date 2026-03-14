import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../utils/api'
import { Building2, X, AlertCircle } from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'

export default function UserManagementDepartmentForm({ onClose, onSuccess, initialData = null }) {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const mode = initialData ? 'edit' : 'create'

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    status: 'Active',
    managerId: '',
  })
  
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/users');
            // Assuming /users returns a list of users. 
            // We might want to filter for managers, but for now allow any user.
            setManagers(res.data.map(u => ({ value: u.id, label: u.name })));
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    }
    fetchUsers();

    if (initialData) {
      setForm({
        name: initialData.name || '',
        code: initialData.code || '',
        description: initialData.description || '',
        status: initialData.status || 'Active',
        managerId: initialData.manager_id || initialData.managerId || '',
      })
    }
  }, [initialData])

  const validate = () => {
    const e = {}
    if (!form.name?.trim()) e.name = isArabic ? 'اسم القسم مطلوب' : 'Department Name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    
    try {
        const payload = {
            name: form.name,
            code: form.code,
            description: form.description,
            status: form.status,
            manager_id: form.managerId,
        };

        let response;
        if (mode === 'edit') {
            response = await api.put(`/api/departments/${initialData.id}`, payload);
        } else {
            response = await api.post('/api/departments', payload);
        }

        if (onSuccess) {
            onSuccess(response.data)
        }

        // Dispatch toast
        const evt = new CustomEvent('app:toast', { 
            detail: { 
            type: 'success', 
            message: mode === 'edit' 
                ? (isArabic ? 'تم تحديث القسم بنجاح' : 'Department updated successfully')
                : (isArabic ? 'تم إضافة القسم بنجاح' : 'Department created successfully')
            } 
        })
        window.dispatchEvent(evt)

        if (onClose) onClose()
    } catch (err) {
        console.error(err);
        const evt = new CustomEvent('app:toast', { 
            detail: { 
            type: 'error', 
            message: isArabic ? 'حدث خطأ' : 'An error occurred'
            } 
        })
        window.dispatchEvent(evt)
    } finally {
        setLoading(false)
    }
  }

  const inputStyle = "input input-bordered w-full bg-[rgba(255,255,255,0.06)] border-base-content/10 focus:border-primary focus:bg-[rgba(255,255,255,0.1)] transition-all placeholder:text-base-content/30"

  return (
    <div className="card bg-base-100 shadow-xl w-full p-4 md:p-6 space-y-6 pb-5 h-full overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-base-content/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {mode === 'edit' ? (isArabic ? 'تعديل القسم' : 'Edit Department') : (isArabic ? 'إضافة قسم جديد' : 'Add New Department')}
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
              {isArabic ? 'أدخل تفاصيل القسم' : 'Enter department details'}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn btn-circle btn-ghost btn-sm">
            <X size={20} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Info Section */}
        <div className="glass-panel rounded-xl p-6 border border-base-content/5 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-base-content/10 pb-4">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="card-title text-lg">{isArabic ? 'المعلومات الأساسية' : 'Basic Information'}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label pt-0"><span className="label-text font-medium text-base-content/80">{isArabic ? 'اسم القسم' : 'Department Name'} <span className="text-[#FF6B6B]">*</span></span></label>
              <input 
                className={inputStyle} 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder={isArabic ? 'مثال: المبيعات' : 'e.g. Sales'} 
              />
              {errors.name && <div className="flex items-center gap-1 mt-1.5 text-[#FF6B6B] text-xs"><AlertCircle size={12}/> {errors.name}</div>}
            </div>

            <div>
              <label className="label pt-0"><span className="label-text font-medium text-base-content/80">{isArabic ? 'كود القسم' : 'Department Code'}</span></label>
              <input 
                className={inputStyle} 
                value={form.code} 
                onChange={e => setForm({...form, code: e.target.value})} 
                placeholder={isArabic ? 'مثال: SALES-01' : 'e.g. SALES-01'} 
              />
            </div>

            <div className="md:col-span-2">
              <label className="label pt-0"><span className="label-text font-medium text-base-content/80">{isArabic ? 'المدير' : 'Manager'}</span></label>
              <SearchableSelect
                className="w-full"
                options={managers}
                value={form.managerId}
                onChange={(val)=>setForm({...form, managerId: val})}
                placeholder={isArabic ? 'اختر مديرًا' : 'Select a manager'}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label pt-0"><span className="label-text font-medium text-base-content/80">{isArabic ? 'الحالة' : 'Status'}</span></label>
              <SearchableSelect
                className="w-full"
                options={[
                  { value: 'Active', label: isArabic ? 'نشط' : 'Active' },
                  { value: 'Inactive', label: isArabic ? 'غير نشط' : 'Inactive' },
                ]}
                value={form.status}
                onChange={(val)=>setForm({...form, status: val})}
                placeholder={isArabic ? 'اختر الحالة' : 'Select status'}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label pt-0"><span className="label-text font-medium text-base-content/80">{isArabic ? 'الوصف' : 'Description'}</span></label>
              <textarea 
                className={`${inputStyle} min-h-[100px] py-3`} 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})} 
                placeholder={isArabic ? 'وصف مختصر للقسم...' : 'Brief description of the department...'} 
              />
            </div>
          </div>
        </div>



        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-base-content/10">
          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={onClose}
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <button 
            type="submit" 
            className="btn btn-primary px-8"
            disabled={loading}
          >
            {loading && <span className="loading loading-spinner loading-xs"></span>}
            {mode === 'edit' ? (isArabic ? 'تحديث' : 'Update') : (isArabic ? 'إنشاء' : 'Create')}
          </button>
        </div>

      </form>
    </div>
  )
}
