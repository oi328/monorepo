import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@shared/context/ThemeProvider';
import { useAppState } from '@shared/context/AppStateProvider';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, User, Lock, Menu, X } from 'lucide-react';

const FlagUS = () => (
  <svg viewBox="0 0 640 480" className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
    <path fill="#bd3d44" d="M0 0h640v480H0"/>
    <path stroke="#fff" strokeWidth="37" d="M0 55.3h640M0 129h640M0 202.8h640M0 276.5h640M0 350.2h640M0 423.9h640"/>
    <path fill="#192f5d" d="M0 0h296.4v258.5H0"/>
    <g fill="#fff">
      <circle cx="35" cy="30" r="13" />
      <circle cx="135" cy="30" r="13" />
      <circle cx="235" cy="30" r="13" />
      <circle cx="85" cy="80" r="13" />
      <circle cx="185" cy="80" r="13" />
      <circle cx="35" cy="130" r="13" />
      <circle cx="135" cy="130" r="13" />
      <circle cx="235" cy="130" r="13" />
    </g>
  </svg>
)

const FlagEG = () => (
  <svg viewBox="0 0 900 600" className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
    <rect width="900" height="600" fill="#ce1126"/>
    <rect width="900" height="400" y="200" fill="#fff"/>
    <rect width="900" height="200" y="400" fill="#000"/>
    <path fill="#c09300" d="M450 250 c50 0 80 30 80 80 s-30 80 -80 80 s-80 -30 -80 -80 s30 -80 80 -80 z" />
  </svg>
)

export default function SuperAdminTopbar({ onMobileToggle, mobileSidebarOpen }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const { user, logout } = useAppState();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  
  const profileRef = useRef(null);
  const languageRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target)) {
        setIsLanguageOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const headerTone = isLight ? 'bg-white border-b border-gray-200' : 'bg-[#0f172a] border-b border-gray-800';
  const iconBtnClass = `p-2 rounded-lg transition-colors duration-200 ${isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-800 text-gray-300'}`;

  return (
    <header className={`sticky top-0 z-40 h-16 flex items-center justify-between px-4 md:px-6 ${headerTone}`}>
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileToggle}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {mobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        <h1 className="text-lg font-bold truncate">
          {t('Super Admin Panel')}
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <div className="relative" ref={languageRef}>
          <button 
            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
            className={iconBtnClass}
            title={t('Change Language')}
          >
            {i18n.language === 'ar' ? <FlagEG /> : <FlagUS />}
          </button>
          
          {isLanguageOpen && (
            <div className={`absolute top-12 ${isRTL ? 'left-0' : 'right-0'} w-40 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50`}>
              <button 
                onClick={() => { i18n.changeLanguage('en'); setIsLanguageOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
              >
                <FlagUS /> <span>English</span>
              </button>
              <button 
                onClick={() => { i18n.changeLanguage('ar'); setIsLanguageOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
              >
                <FlagEG /> <span>العربية</span>
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className={iconBtnClass}
          title={t('Toggle Theme')}
        >
          {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              SA
            </div>
          </button>

          {isProfileOpen && (
            <div className={`absolute top-12 ${isRTL ? 'left-0' : 'right-0'} w-56 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50`}>
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium truncate">{user?.name || 'Super Admin'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || 'system@besouhoula.com'}</p>
              </div>
              
              <div className="py-1">
                <button
                  onClick={() => navigate('/system/profile')}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <User size={16} />
                  <span>{t('Profile')}</span>
                </button>
                <button
                  onClick={() => navigate('/system/security')}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Lock size={16} />
                  <span>{t('Change Password')}</span>
                </button>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                <button
                  onClick={logout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut size={16} />
                  <span>{t('Logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
