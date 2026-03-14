import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../shared/context/ThemeProvider'


const ROLE_OPTIONS = [
  { id: 1, name: 'Admin / Super Admin' },
  { id: 2, name: 'Operations Manager' },
  { id: 3, name: 'Sales Director' },
  { id: 4, name: 'Sales Manager' },
  { id: 5, name: 'Team Leader' },
  { id: 6, name: 'Sales Representative' },
  { id: 7, name: 'Customer Service' },
  { id: 8, name: 'Accountant' },
  { id: 9, name: 'Marketing Manager' },
  { id: 10, name: 'Marketing Specialist' },
]

const DEFAULT_USERS = [
  { id: 1, name: 'Ahmed Ali', email: 'ahmed@example.com', role: 'Sales Representative', status: 'Active' },
  { id: 2, name: 'Sara Youssef', email: 'sara@example.com', role: 'Team Leader', status: 'Suspended' },
  { id: 3, name: 'Omar Hassan', email: 'omar@example.com', role: 'Operations Manager', status: 'Active' },
]

const PERMISSIONS = [
  'view clients', 'add client', 'edit client', 'delete client',
  'view invoices', 'add invoice', 'edit invoice', 'delete invoice',
  'view reports', 'manage settings'
]

const UsersAndRoles = () => {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const isRTL = String(i18n.language || '').startsWith('ar')
  const isDark = theme === 'dark'
  const navigate = useNavigate()

  const [users, setUsers] = useState(DEFAULT_USERS)
  const [showPanel, setShowPanel] = useState(false)
  const [q, setQ] = useState('')
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: ROLE_OPTIONS[0].name })
  
  const [matrix, setMatrix] = useState(() => {
    const roles = ROLE_OPTIONS.map(r => r.name)
    const m = {}
    roles.forEach(role => {
      m[role] = {}
      PERMISSIONS.forEach(p => { m[role][p] = role.includes('Admin') })
    })
    return m
  })

  const addUser = () => {
    if (!newUser.username || !newUser.password) return
    const email = `${newUser.username}@contractedCompany.com`
    setUsers(prev => [...prev, { id: Date.now(), name: newUser.username, email, role: newUser.role, status: 'Active' }])
    setShowPanel(false)
    setNewUser({ username: '', password: '', role: ROLE_OPTIONS[0].name })
  }

  const deleteUser = (id) => setUsers(prev => prev.filter(u => u.id !== id))
  
  const togglePermission = (role, perm) => setMatrix(prev => ({ ...prev, [role]: { ...prev[role], [perm]: !prev[role][perm] } }))

  const filteredUsers = useMemo(() => {
    if (!q) return users
    return users.filter(u => 
      u.name.toLowerCase().includes(q.toLowerCase()) || 
      u.email.toLowerCase().includes(q.toLowerCase())
    )
  }, [users, q])

  // Common Styles from Customers page
  const tableHeaderBgClass = 'bg-gray-50/50 dark:bg-gray-800/50'
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header & Actions */}
      <div className="rounded-xl p-4 md:p-6 relative mb-6">
        <div className="flex flex-wrap lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-start text-theme-text dark:text-white flex items-center gap-2">
              <FaShieldAlt className="text-blue-600" />
              {isRTL ? 'المستخدمين والأدوار' : 'Users & Roles'}
            </h1>
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {users.length} {isRTL ? 'مستخدم' : 'Users'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
             <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <input 
                type="text"
                className="input-soft w-full ps-10"
                placeholder={isRTL ? 'بحث عن مستخدم...' : 'Search users...'}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            
            <button 
              onClick={() => setShowPanel(true)}
              className="btn btn-primary flex items-center justify-center gap-2"
            >
              <FaPlus size={14} />
              {isRTL ? 'إضافة مستخدم' : 'Add User'}
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className={`${tableHeaderBgClass} text-xs uppercase text-theme-text font-semibold backdrop-blur-sm`}>
              <tr>
                <th className="p-4 whitespace-nowrap">{isRTL ? 'الاسم' : 'Name'}</th>
                <th className="p-4 whitespace-nowrap">{isRTL ? 'البريد الإلكتروني' : 'Email'}</th>
                <th className="p-4 whitespace-nowrap">{isRTL ? 'الدور' : 'Role'}</th>
                <th className="p-4 whitespace-nowrap">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="p-4 whitespace-nowrap text-end">{isRTL ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="p-4 font-medium text-theme-text">{u.name}</td>
                    <td className="p-4 text-theme-text opacity-80">{u.email}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'Active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-end">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => navigate(`/user-management/users/${u.id}?edit=1`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button 
                          onClick={() => deleteUser(u.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {isRTL ? 'لا يوجد مستخدمين' : 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden">
          {filteredUsers.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map(u => (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-theme-text">{u.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.status === 'Active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {u.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {u.role}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate(`/user-management/users/${u.id}?edit=1`)}
                        className="p-2 text-blue-600 bg-blue-50 rounded-lg dark:text-blue-400 dark:bg-blue-900/20"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button 
                        onClick={() => deleteUser(u.id)}
                        className="p-2 text-red-600 bg-red-50 rounded-lg dark:text-red-400 dark:bg-red-900/20"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {isRTL ? 'لا يوجد مستخدمين' : 'No users found'}
            </div>
          )}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm mt-8">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="text-lg font-semibold text-theme-text flex items-center gap-2">
            <FaShieldAlt className="text-purple-600" />
            {isRTL ? 'مصفوفة الصلاحيات' : 'Role Permissions Matrix'}
          </h3>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-start border-b-2 border-gray-200 dark:border-gray-700 min-w-[200px] bg-gray-50 dark:bg-gray-900/50 sticky left-0 z-10">
                  {isRTL ? 'الصلاحية' : 'Permission'}
                </th>
                {ROLE_OPTIONS.map((r) => (
                  <th key={r.id} className="p-3 text-center border-b-2 border-gray-200 dark:border-gray-700 min-w-[100px]">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {PERMISSIONS.map(p => (
                <tr key={p} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-3 font-medium text-theme-text bg-white dark:bg-gray-900/80 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    {p}
                  </td>
                  {ROLE_OPTIONS.map((r) => (
                    <td key={r.id} className="p-3 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="checkbox checkbox-sm checkbox-primary rounded"
                          checked={!!matrix[r.name]?.[p]} 
                          onChange={()=>togglePermission(r.name, p)} 
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Side Panel (Styled) */}
      {showPanel && (
        <div className="fixed inset-0 z-[1001] flex justify-end bg-black/40 backdrop-blur-sm transition-all" onClick={() => setShowPanel(false)}>
          <div 
            className="w-full sm:w-[440px] h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col transform transition-transform duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <h4 className="text-lg font-bold text-theme-text">
                {isRTL ? 'إضافة مستخدم جديد' : 'Add New User'}
              </h4>
              <button 
                onClick={()=>setShowPanel(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-theme-text">
                  {isRTL ? 'اسم المستخدم' : 'Username'}
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    value={newUser.username || ''} 
                    onChange={e=>setNewUser(prev=>({ ...prev, username: e.target.value }))} 
                    className="input-soft w-full" 
                    placeholder="johndoe"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">@company.com</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-theme-text">
                  {isRTL ? 'كلمة المرور' : 'Password'}
                </label>
                <input 
                  type="password" 
                  value={newUser.password} 
                  onChange={e=>setNewUser(prev=>({ ...prev, password: e.target.value }))} 
                  className="input-soft w-full"
                  placeholder="••••••••" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-theme-text">
                  {isRTL ? 'الدور' : 'Role'}
                </label>
                <select
                  value={newUser.role}
                  onChange={e=>setNewUser(prev=>({ ...prev, role: e.target.value }))}
                  className="input-soft w-full appearance-none"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <button 
                  className="btn bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 flex-1"
                  onClick={()=>setShowPanel(false)}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button 
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  onClick={addUser}
                >
                  <FaSave />
                  {isRTL ? 'حفظ' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersAndRoles
