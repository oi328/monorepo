import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeProvider';
import { api } from '../../utils/api';
import { FaUserTie, FaTimes, FaSearch, FaUser } from 'react-icons/fa';

const ROLE_RANKS = {
  'Owner': 0,
  'Super Admin': 1,
  'Admin': 2,
  'Director': 2,
  'Sales Director': 2,
  'Operations Manager': 2,
  'Branch Manager': 3,
  'Sales Manager': 3,
  'Team Leader': 4,
  'Sales Person': 5,
  'Sales Agent': 5,
};

const getUserRole = (user) => {
  if (!user) return '';
  if (user.role) return user.role;
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles[0].name;
  return '';
};

const getRank = (role) => {
  if (!role) return 99;

  // Normalize: remove spaces, underscores, hyphens, lowercase
  const normalize = (str) => str.toLowerCase().replace(/[\s_\-]+/g, '');
  const target = normalize(role);

  const mappedKey = Object.keys(ROLE_RANKS).find(k => normalize(k) === target);
  return mappedKey ? ROLE_RANKS[mappedKey] : 99;
};

const ReAssignLeadModal = ({ isOpen, onClose, lead, onAssign, isArabic = false, currentUser }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState(['All']);
  const [filterRole, setFilterRole] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignRole, setAssignRole] = useState('sales'); // 'sales' | 'manager'

  const [assignMethod, setAssignMethod] = useState('fresh'); // 'fresh' | 'cold_call'

  const [options, setOptions] = useState({
    duplicate: false,
    sameStage: false,
    clearHistory: false
  });

  useEffect(() => {
    if (isOpen) {
      console.log('ReAssignLeadModal Opened. Current User:', currentUser);
      fetchUsers();
      fetchRoles();
      // Reset states
      setSelectedUser(null);
      setAssignRole('sales');
      setAssignMethod('fresh');
      setOptions({
        duplicate: false,
        sameStage: false,
        clearHistory: false
      });
    }
  }, [isOpen, currentUser]);

  const isLeadershipRole = (role) => {
    if (!role) return false;
    const lower = String(role).toLowerCase();
    return (
      lower.includes('manager') ||
      lower.includes('leader') ||
      lower.includes('director') ||
      lower.includes('admin') ||
      lower.includes('owner') ||
      lower.includes('operation manager') ||
      lower.includes('operations manager')
    );
  };

  const isSalesRole = (role) => {
    if (!role) return false;
    const lower = String(role).toLowerCase();
    return (
      lower.includes('sales person') ||
      lower.includes('salesperson') ||
      lower.includes('sales agent') ||
      lower.includes('agent') ||
      lower.includes('broker')
    );
  };

  // Default assignment role is driven by selected user's role.
  // Users can still override manually using the toggle.
  useEffect(() => {
    if (!selectedUser) return;
    const role = getUserRole(selectedUser);
    setAssignRole(isLeadershipRole(role) ? 'manager' : 'sales');
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) return;
    const role = getUserRole(selectedUser);
    if (isSalesRole(role) && assignRole === 'manager') {
      setAssignRole('sales');
    }
  }, [selectedUser, assignRole]);

  const fetchRoles = async () => {
    try {
      const response = await api.get('/api/roles');
      if (Array.isArray(response.data)) {
        setRoles(['All', ...response.data]);
      } else if (response.data && Array.isArray(response.data.data)) {
        // Handle paginated response if any, though controller returns array
        setRoles(['All', ...response.data.data]);
      } else {
        // Fallback or just 'All'
        setRoles(['All', ...Object.values(response.data || [])]);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/users');
      let usersData = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      console.log('Raw Users Data:', usersData.length, usersData[0]);

      // Filter by Tenant Users (excluding self)
      if (currentUser) {
        usersData = usersData.filter(u => {
          // Allow assigning to self
          // if (u.id === currentUser.id) return false;
          // Attach role to user object for display
          u.role = getUserRole(u);
          return true;
        });
      } else {
        usersData.forEach(u => {
          u.role = getUserRole(u);
        });
      }

      console.log('Filtered Users Data:', usersData.length);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const processedUsers = users.map(u => ({ ...u, role: getUserRole(u) }));

  const filteredUsers = processedUsers.filter(user => {
    const matchesRole = filterRole === 'All' || (user.role && user.role.toLowerCase() === filterRole.toLowerCase());
    const matchesSearch = (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const handleAssign = () => {
    if (!selectedUser) return;

    // Prepare payload
    const assignData = {
      userId: selectedUser.id,
      userName: selectedUser.name,
      assignRole: assignRole,
      method: assignMethod,
      options: options
    };

    onAssign(assignData);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className={`${isLight ? 'bg-white text-slate-800' : 'bg-slate-900 text-white'} w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>

        {/* Header */}
        <div className={`p-4 border-b ${isLight ? 'border-gray-100' : 'border-slate-800'} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isLight ? 'bg-blue-50 text-blue-600' : 'bg-blue-900/30 text-blue-400'}`}>
              <FaUserTie />
            </div>
            <div>
              <h2 className="font-semibold text-lg">{isArabic ? 'تعيين العميل' : 'Assign Lead'}</h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {selectedUser ? '1' : '0'} {isArabic ? 'محدد' : 'Selected'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full hover:bg-black/5 transition-colors ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">

          {/* Filter & Search */}
          <div className="flex gap-2">
            <div className="w-1/3">
              <label className={`block text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{isArabic ? 'تصفية حسب الدور' : 'Filter By Role'}</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className={`w-full text-sm rounded-lg border px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500 ${isLight ? 'bg-white border-gray-200' : 'bg-slate-800 border-slate-700'}`}
              >
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div className="w-2/3">
              <label className={`block text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{isArabic ? 'تعيين إلى' : 'Assign To'}</label>
              <div className="relative">
                <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs ${isArabic ? 'right-3 left-auto' : 'left-3'}`} />
                <input
                  type="text"
                  placeholder={isArabic ? 'بحث في أعضاء الفريق' : 'Search in team members'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full text-sm rounded-lg border pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 ${isLight ? 'bg-white border-gray-200' : 'bg-slate-800 border-slate-700'} ${isArabic ? 'pr-9 pl-3' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {loading ? (
              <div className="text-center py-4 text-sm text-gray-500">{isArabic ? 'جاري التحميل...' : 'Loading...'}</div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all ${selectedUser?.id === user.id
                      ? (isLight ? 'border-blue-500 bg-blue-50' : 'border-blue-500 bg-blue-900/20')
                      : (isLight ? 'border-transparent hover:bg-gray-50' : 'border-transparent hover:bg-slate-800')
                    }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedUser?.id === user.id ? 'border-blue-500' : 'border-gray-300'}`}>
                    {selectedUser?.id === user.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <FaUser className="text-gray-400 text-xs" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{user.name}</p>
                    <p className={`text-xs truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{user.role || 'Team Member'}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-gray-500">{isArabic ? 'لا يوجد أعضاء' : 'No members found'}</div>
            )}
          </div>

          {/* Assign With Options */}
          <div>
            <label className={`block text-xs mb-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{isArabic ? 'طريقة التعيين' : 'Assign With'}</label>
            <div className={`grid grid-cols-2 p-1 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-slate-800 border-slate-700'}`}>
              <button
                onClick={() => setAssignMethod('fresh')}
                className={`text-sm py-1.5 rounded-lg transition-all ${assignMethod === 'fresh'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {isArabic ? 'جديد' : 'Fresh'}
              </button>
              <button
                onClick={() => setAssignMethod('cold_call')}
                className={`text-sm py-1.5 rounded-lg transition-all ${assignMethod === 'cold_call'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {isArabic ? 'مكالمة باردة' : 'As cold call'}
              </button>
            </div>
          </div>

          {/* Role Selection (Manager vs Sales) */}
          {selectedUser && (
            <div>
              <label className={`block text-xs mb-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{isArabic ? 'الدور في التعيين' : 'Assignment Role'}</label>
              {(() => {
                const role = getUserRole(selectedUser);
                const canAssignAsManager = isLeadershipRole(role) && !isSalesRole(role);
                if (!canAssignAsManager) {
                  return (
                    <div className={`grid grid-cols-1 p-1 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-slate-800 border-slate-700'}`}>
                      <button
                        onClick={() => setAssignRole('sales')}
                        className="text-sm py-1.5 rounded-lg transition-all bg-white text-slate-900 shadow-sm"
                      >
                        {isArabic ? 'كمسؤول مبيعات' : 'As Sales Person'}
                      </button>
                    </div>
                  );
                }

                return (
                  <div className={`grid grid-cols-2 p-1 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-slate-800 border-slate-700'}`}>
                <button
                  onClick={() => setAssignRole('sales')}
                  className={`text-sm py-1.5 rounded-lg transition-all ${assignRole === 'sales'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {isArabic ? 'كمسؤول مبيعات' : 'As Sales Person'}
                </button>
                <button
                  onClick={() => setAssignRole('manager')}
                  className={`text-sm py-1.5 rounded-lg transition-all ${assignRole === 'manager'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {isArabic ? 'كمدير' : 'As Manager'}
                </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Checkboxes */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.duplicate}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setOptions({
                    duplicate: checked,
                    // User requirement: "Cannot select more than one of the three"
                    // So if checked, others must be false.
                    sameStage: false,
                    clearHistory: false
                  });
                  if (!checked) {
                    // If unchecked, maybe enforce default? Or allow none?
                    // "Default is same stage" - implies initial state.
                    // If user unchecks, it's fine to have none? 
                    // Usually radio behavior means clicking selected does nothing or stays selected.
                    // But these are checkboxes. 
                    // Let's allow unchecking, but if checking one, uncheck others.
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{isArabic ? 'نسخ وتعيين كجديد' : 'Duplicate and assign as fresh'}</span>
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sameStage}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setOptions({
                      duplicate: false,
                      sameStage: checked,
                      clearHistory: false
                    });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{isArabic ? 'نفس المرحلة' : 'Same stage'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.clearHistory}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setOptions({
                      duplicate: false,
                      sameStage: false,
                      clearHistory: checked
                    });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{isArabic ? 'مسح السجل' : 'Clear History'}</span>
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-slate-800/50 border-slate-800'} flex items-center justify-end gap-3`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isLight
                ? 'text-slate-600 hover:bg-gray-200 bg-white border border-gray-200'
                : 'text-slate-300 hover:bg-slate-700 bg-slate-800 border border-slate-700'
              }`}
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedUser}
            className={`px-6 py-2 text-sm font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all ${selectedUser
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            {isArabic ? 'تعيين' : 'Assign'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ReAssignLeadModal;
