import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../shared/context/ThemeProvider';
import { FaKey, FaTimes, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

const UserChangePasswordModal = ({ isOpen, onClose, user, onSubmit }) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isRTL = i18n.language === 'ar';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    onSubmit(user.id, password);
    onClose();
    // Reset form
    setPassword('');
    setConfirmPassword('');
  };

  const inputClass = `w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm font-medium ${
    isDark 
      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 focus:border-blue-500/50' 
      : 'bg-gray-50/50 border-gray-200/60 text-gray-800 focus:border-blue-500'
  }`;

  const labelClass = `block text-xs font-semibold mb-1.5 text-theme-text opacity-80 uppercase tracking-wider`;

  return (
    <div className="fixed inset-0 z-[2050] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className={`card relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl flex flex-col transform transition-all ${isDark ? 'bg-gray-900 ring-1 ring-white/10' : 'bg-white ring-1 ring-black/5'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'} bg-opacity-50`}>
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                <FaKey size={20} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-theme-text">{isRTL ? 'تغيير كلمة المرور' : 'Change Password'}</h2>
                <p className="text-xs opacity-60 text-theme-text">{user.fullName}</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-theme-text opacity-70 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {error && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${isDark ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-600'}`}>
              <span className="font-bold">!</span> {error}
            </div>
          )}

          <div>
            <label className={labelClass}>{isRTL ? 'كلمة المرور الجديدة' : 'New Password'}</label>
            <div className="relative group">
              <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text opacity-40`}>
                  <FaLock />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                placeholder="******"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-3 text-theme-text opacity-40 hover:opacity-80 transition-opacity`}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>{isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
            <div className="relative group">
              <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-theme-text opacity-40`}>
                  <FaLock />
              </div>
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${inputClass} ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                placeholder="******"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-3 text-theme-text opacity-40 hover:opacity-80 transition-opacity`}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn px-5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-theme-text border-none rounded-xl font-medium transition-colors"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn px-6 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20"
            >
              {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default UserChangePasswordModal;
