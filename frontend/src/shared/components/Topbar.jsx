import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@shared/context/ThemeProvider'
import { useAppState } from '@shared/context/AppStateProvider'
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom'
import { NotificationsContent } from '../../pages/Notifications'
import CalendarModal from './CalendarModal'
import SearchModal from './SearchModal'
import TaskDetailsModal from '../../components/TaskDetailsModal'
import lightLogo from '@assets/be-souhola-logo-light.png'
import darkLogo from '@assets/be-souhola-logo-dark.png'
import { api } from '@utils/api' // Ensure api utility is imported
import AvatarImage from '@components/AvatarImage'

// Custom Avatar Component removed - now imported from @components/AvatarImage

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

const BellBadge = ({ count }) => (
  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-500 text-white">
    {count}
  </span>
)

const IconButton = ({ children, label, className, onClick, showLabel = true }) => (
  <button
    type="button"
    className={className ?? "btn flex-col gap-1 px-3 py-2"}
    title={label}
    aria-label={label}
    onClick={onClick}
  >
    {children}
    {showLabel && (
      <span className="text-[8px] leading-none opacity-75 font-medium max-[480px]:hidden">{label}</span>
    )}
  </button>
)

function WelcomeSection({ isLight, text }) {
  return (
    <div className="flex items-center gap-3 max-[800px]:gap-2 max-[480px]:gap-1 max-[320px]:gap-1 pl-0 ml-0" style={{ paddingInlineStart: 0, marginInlineStart: 0 }}>
      
      <span className={`text-sm max-[480px]:text-xs font-semibold whitespace-nowrap flex-shrink-0 min-w-fit max-w-[40vw] truncate ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>{text}</span>
    </div>
  )
}

export default function Topbar({ onMobileToggle, mobileSidebarOpen, notifications, unreadCount }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  const navigate = useNavigate()
  const currentLogo = theme === 'dark' ? darkLogo : lightLogo;
  const { user, logout, fetchCompanyInfo } = useAppState()
  
  // Helper to resolve full image URL
  const getFullAvatarUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    
    // Get API URL from env or default
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.besouholacrm.net/api';
    // Extract root domain (remove /api)
    const rootUrl = apiUrl.replace(/\/api\/?$/, '');
    
    // Ensure path starts with /
    const path = url.startsWith('/') ? url : `/${url}`;
    
    // If path doesn't start with /storage and isn't a full URL, maybe prepend /storage? 
    // Usually backend returns full relative path like /storage/avatars/... or just avatars/...
    // Let's assume if it doesn't start with /storage, we might need to check, but for now just prepend root.
    
    return `${rootUrl}${path}`;
  }

  const rawAvatarUrl = user?.avatar_url || user?.avatar || ''
  const avatarUrl = getFullAvatarUrl(rawAvatarUrl)
  
  const avatarLetter = (String(user?.name || user?.email || 'User').trim()[0] || 'U').toUpperCase()
  const [isExtrasOpen, setIsExtrasOpen] = useState(false)
  
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
  
  const [isProfileMobileOpen, setIsProfileMobileOpen] = useState(false)
  const [profileMenuPos, setProfileMenuPos] = useState({ top: 64, left: 8, right: 8 })
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false)
  // unreadCount is now a prop
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isMobileLanguageOpen, setIsMobileLanguageOpen] = useState(false)
  const searchRef = useRef(null)
  const notificationsRef = useRef(null)
  const languageRef = useRef(null)
  const profileRef = useRef(null)
  const profileMobileRef = useRef(null)
  const mobileLanguageRef = useRef(null)

  const [selectedTask, setSelectedTask] = useState(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('language') || localStorage.getItem('lang')
      if (savedLang && savedLang !== i18n.language) {
        i18n.changeLanguage(savedLang)
      }
    } catch {}
  }, [i18n])

  const [calendarOpen, setCalendarOpen] = useState(false)

  // Notifications fetching logic removed in favor of real-time prop


  useEffect(() => {
    const onDocClick = (e) => {
      if (isSearchDropdownOpen && searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false)
      }
      if (isNotificationsOpen && notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setIsNotificationsOpen(false)
      }
      if (isLanguageOpen && languageRef.current && !languageRef.current.contains(e.target)) {
        setIsLanguageOpen(false)
      }
      if (isMobileLanguageOpen && mobileLanguageRef.current && !mobileLanguageRef.current.contains(e.target)) {
        setIsMobileLanguageOpen(false)
      }
      if (profilePreviewOpen && profileRef.current && !profileRef.current.contains(e.target)) {
        setProfilePreviewOpen(false)
      }
      if (isProfileMobileOpen && profileMobileRef.current && !profileMobileRef.current.contains(e.target)) {
        setIsProfileMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('touchstart', onDocClick)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('touchstart', onDocClick)
    }
  }, [isSearchDropdownOpen, isNotificationsOpen, isLanguageOpen, isMobileLanguageOpen, profilePreviewOpen, isProfileMobileOpen])

  // Header buttons unified styles with glass morphism effects
  const headerBtnBase = 'inline-flex items-center justify-center p-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const headerBtnTone = isLight 
    ? 'text-gray-600 hover:text-gray-800 backdrop-blur-md bg-white/20 hover:bg-white/40 border border-white/30 hover:border-white/50 shadow-lg hover:shadow-xl hover:scale-105 hover:-translate-y-0.5' 
    : 'text-gray-400 hover:text-gray-200 backdrop-blur-md bg-gray-800/20 hover:bg-gray-700/40 border border-gray-600/30 hover:border-gray-500/50 shadow-lg hover:shadow-xl hover:scale-105 hover:-translate-y-0.5';
  const headerTone = isLight 
    ? 'bg-white/35 backdrop-blur-md border-white/30 shadow-sm'
    : 'bg-gray-900 border-gray-800';
  const mobileExtrasBase = 'flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/40';
  const mobileExtrasSearch = isLight ? 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700' : 'bg-purple-900/20 border-purple-600 hover:bg-purple-900/30 text-purple-300';
  const mobileExtrasTasks = isLight ? 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700' : 'bg-green-900/20 border-green-600 hover:bg-green-900/30 text-green-300';
  const mobileExtrasLang = isLight ? 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700' : 'bg-orange-900/20 border-orange-600 hover:bg-orange-900/30 text-orange-300';

  

  const toggleTheme = () => {
    setTheme(isLight ? 'dark' : 'light');
  };

  const isSuperAdmin = !!(
    user?.is_super_admin || 
    user?.role?.toLowerCase()?.includes('super admin') || 
    user?.role?.toLowerCase()?.includes('superadmin') || 
    user?.role?.toLowerCase() === 'owner' ||
    String(user?.email || '').toLowerCase() === 'system@besouhoula.com' ||
    String(user?.email || '').toLowerCase() === 'admin@example.com' ||
    String(user?.email || '').toLowerCase() === 'admin@besouhoula.com'
  )
  
  const canViewCompanyProfile = (() => {
    const role = (user?.role || '').toLowerCase();
    const allowed = [
      'admin', 
      'sales admin', 
      'tenant admin', 
      'tenant-admin', 
      'director', 
      'sales director', 
      'operation manager', 
      'operations manager'
    ];
    return isSuperAdmin || allowed.includes(role);
  })();

  return (
    <>
    <header 
      className={`main-header nova-topbar fixed top-0 z-[120] border-b ${headerTone}`}>
      <div className="header-inner relative w-full h-16 max-[320px]:h-14 flex items-center justify-between px-2 max-[480px]:px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { if (typeof onMobileToggle === 'function') { onMobileToggle() } }}
            className={`md:hidden ${headerBtnBase} ${headerBtnTone} p-1.5`}
            aria-label={mobileSidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileSidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-500">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label={t('Dashboard')}
            className="md:hidden flex items-center gap-2 cursor-pointer">
            <img src={currentLogo} alt="Be Souhola" className=" h-8" />
          </button>
          <div className="hidden md:flex">
            <WelcomeSection
              isLight={isLight}
              text={isRTL ? `مرحباً، ${String(user?.name || '').trim() || 'المستخدم'}!` : `Welcome, ${String(user?.name || '').trim() || 'User'}!`}
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className={`flex items-center gap-2 max-[768px]:gap-1.5 max-[480px]:gap-1`}>
          {!isSuperAdmin && (
            <div className="relative" ref={searchRef}>
              <IconButton
                label={t('Search')}
                className={`${headerBtnBase} ${headerBtnTone} p-1.5 ${isSearchDropdownOpen ? (isLight ? 'ring-2 ring-blue-400 bg-white/40' : 'ring-2 ring-blue-500 bg-gray-800/40') : ''}`}
                onClick={() => setIsSearchDropdownOpen((v) => !v)}
                aria-expanded={isSearchDropdownOpen}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 max-[480px]:w-3 max-[480px]:h-3">
                  <circle cx="11" cy="11" r="6" />
                  <path d="M21 21l-4.5-4.5" />
                </svg>
              </IconButton>
              {isSearchDropdownOpen && (
                <SearchModal onClose={() => setIsSearchDropdownOpen(false)} variant="dropdown" />
              )}
            </div>
          )}

          {!isSuperAdmin && (
            <div>
              <IconButton 
                label={t('Calendar')} 
                className={`${headerBtnBase} ${headerBtnTone} ${isLight ? '' : 'text-white bg-gray-700/40 hover:bg-gray-600/50 border border-gray-500/50'}`}
                onClick={() => setCalendarOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 max-[480px]:w-4 max-[480px]:h-4">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <path d="M3 10h18" />
                  <path d="M8 2v4M16 2v4" />
                </svg>
              </IconButton>
            </div>
          )}

          {/* Theme toggle */}
          <div className="max-[768px]:hidden">
            <IconButton label={t('Theme')} className={`${headerBtnBase} ${headerBtnTone}`} onClick={toggleTheme}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 max-[480px]:w-4 max-[480px]:h-4">
                <path d="M12 3v1m0 16v1m8-9h-1M4 12H3m15.36-6.36l-.71.71M6.35 17.65l-.71.71m12.01 0l-.71-.71M6.35 6.35l-.71-.71" />
                <circle cx="12" cy="12" r="5" />
              </svg>
            </IconButton>
          </div>

          

          {!isSuperAdmin && (
            <div className="max-[768px]:hidden">
              <IconButton label={t('Tasks')} className={`${headerBtnBase} ${headerBtnTone}`} onClick={() => navigate('/tasks')}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                  <path d="M9 11l2 2 4-4" />
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                </svg>
              </IconButton>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="relative" ref={notificationsRef}>
              <IconButton label={t('Notifications')} className={`${headerBtnBase} ${headerBtnTone} ${isNotificationsOpen ? (isLight ? 'ring-2 ring-blue-400 bg-white/40' : 'ring-2 ring-blue-500 bg-gray-800/40') : ''}`} onClick={() => setIsNotificationsOpen((v)=>!v)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 max-[480px]:w-4 max-[480px]:h-4">
                  <path d="M18 8a6 6 0 10-12 0v4l-2 2h16l-2-2V8" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </IconButton>
              {unreadCount > 0 && <BellBadge count={unreadCount} />}
              {isNotificationsOpen && (
                <div className={`notifications-dropdown dropdown-panel absolute top-12 ${isRTL ? 'left-0' : 'right-0'} w-[520px] max-w-[90vw] max-h-[70vh] overflow-auto backdrop-blur-md backdrop-saturate-150 ${isLight ? 'bg-white/95 border border-white/40 ring-1 ring-black/10' : 'bg-gray-900/95 border border-gray-600/40 ring-1 ring-white/10'} rounded-xl shadow-xl z-50`} role="menu" aria-label={t('Notifications')}>
                  <div className="p-3">
                    <NotificationsContent 
                      embedded={true} 
                      onClose={() => setIsNotificationsOpen(false)}
                      onOpenTask={(task) => {
                        setSelectedTask(task)
                        setIsTaskModalOpen(true)
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Language */}
          <div className="max-[768px]:hidden relative" ref={languageRef}>
            <IconButton label={t('Language')} className={`${headerBtnBase} ${headerBtnTone} ${isLanguageOpen ? (isLight ? 'ring-2 ring-blue-400 bg-white/40' : 'ring-2 ring-blue-500 bg-gray-800/40') : ''}`} onClick={() => setIsLanguageOpen((v)=>!v)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18" />
                <path d="M12 3v18" />
              </svg>
            </IconButton>
            {isLanguageOpen && (
              <div className={`dropdown-panel absolute top-12 ${isRTL ? 'left-0' : 'right-0'} w-44 backdrop-blur-md ${isLight ? 'bg-white/80 border border-white/30' : 'bg-gray-900/80 border border-gray-600/30'} rounded-xl shadow-2xl z-50`} role="menu" aria-label={t('Language')}>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm hover:bg-[var(--table-row-hover)]" onClick={() => { i18n.changeLanguage('en'); try { localStorage.setItem('language','en'); } catch {} setIsLanguageOpen(false); }}>
                  <FlagUS /> {isRTL ? 'الانجليزية' : 'English'}
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm hover:bg-[var(--table-row-hover)]" onClick={() => { i18n.changeLanguage('ar'); try { localStorage.setItem('language','ar'); } catch {} setIsLanguageOpen(false); }}>
                  <FlagEG /> {isRTL ? 'العربية' : 'Arabic'}
                </button>
              </div>
            )}
          </div>

          


          {/* Profile dropdown */}
          <div className="relative max-[768px]:hidden" ref={profileRef}>
            <button 
              onClick={() => setProfilePreviewOpen(!profilePreviewOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLight 
                ? 'backdrop-blur-md bg-white/20 hover:bg-white/40 border border-white/30 hover:border-white/50 shadow-lg hover:shadow-xl hover:scale-105 hover:-translate-y-0.5' 
                : 'backdrop-blur-md bg-gray-800/20 hover:bg-gray-700/40 border border-gray-600/30 hover:border-gray-500/50 shadow-lg hover:shadow-xl hover:scale-105 hover:-translate-y-0.5'}`}>
              <AvatarImage
                user={user}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
                onError={() => { try { fetchCompanyInfo() } catch {} }}
              />
              <div className="max-[880px]:hidden text-left">
                <div className="text-sm font-semibold truncate">{user?.name || t('Administrator')}</div>
                <div className="text-xs text-[var(--muted-text)] truncate">
                  {(user?.role?.toLowerCase() === 'tenant admin' || user?.role?.toLowerCase() === 'tenant-admin') ? 'admin' : (user?.role || t('Admin'))}
                </div>
              </div>
            </button>
            {profilePreviewOpen && (
              <div className={`dropdown-panel absolute top-12 ${isRTL ? 'left-0' : 'right-0'} w-64 max-w-[85vw] ${isLight ? 'bg-white border border-gray-200' : 'bg-gray-900 border border-gray-700'} rounded-xl shadow-2xl z-50`} role="menu" aria-label={t('Profile menu')}>
                <div className={`absolute -top-2 ${isRTL ? 'left-6' : 'right-6'} w-3 h-3 ${isLight ? 'bg-white border-t border-l border-gray-200' : 'bg-gray-900 border-t border-l border-gray-700'} rotate-45`}></div>

                <div className="px-4 py-3 flex items-center gap-3">
                  <AvatarImage
                    user={user}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20"
                    onError={() => { try { fetchCompanyInfo() } catch {} }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{user?.name || t('Administrator')}</div>
                    <div className="text-xs text-[var(--muted-text)] truncate">{user?.email || 'admin@example.com'}</div>
                    <button
                      className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      onClick={() => { navigate('/settings/profile') }}
                    >
                      {t('My Profile')} ▸
                    </button>
                  </div>
                  <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-green-500" aria-hidden></span>
                </div>
                <div className="h-px bg-[var(--divider)]"></div>

                <button
                  onClick={() => { navigate('/settings/profile#security') }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--content-text)] hover:bg-[var(--table-row-hover)] transition-colors"
                  role="menuitem"
                >
                  <span className="w-5 h-5 inline-flex items-center justify-center">🔐</span>
                  <span>{t('Security Settings')}</span>
                </button>

                <button
                  onClick={() => { navigate('/settings/profile#security-devices') }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--content-text)] hover:bg-[var(--table-row-hover)] transition-colors"
                  role="menuitem"
                >
                  <span className="w-5 h-5 inline-flex items-center justify-center">📱</span>
                  <span>{t('Linked Devices')}</span>
                </button>

                {canViewCompanyProfile && (
                <button
                  onClick={() => { navigate('/settings/profile/company') }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--content-text)] hover:bg-[var(--table-row-hover)] transition-colors"
                  role="menuitem"
                >
                  <span className="w-5 h-5 inline-flex items-center justify-center">🏢</span>
                  <span>{t('Company Profile')}</span>
                </button>
                )}

                <div className="h-px bg-[var(--divider)]"></div>

                <button
                  onClick={() => { navigate('/settings/profile') }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--content-text)] hover:bg-[var(--table-row-hover)] transition-colors"
                  role="menuitem"
                >
                  <span className="w-5 h-5 inline-flex items-center justify-center">🖼️</span>
                  <span>{t('Change Profile Picture')}</span>
                </button>

                <button
                  onClick={() => { navigate('/settings/profile#security') }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--content-text)] hover:bg-[var(--table-row-hover)] transition-colors"
                  role="menuitem"
                >
                  <span className="w-5 h-5 inline-flex items-center justify-center">🔑</span>
                  <span>{t('Change Password')}</span>
                </button>

                <div className="h-px bg-[var(--divider)]"></div>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--content-text)] hover:bg-[var(--table-row-hover)] transition-colors"
                  role="menuitem"
                >
                  <span className="w-5 h-5 inline-flex items-center justify-center">↪️</span>
                  <span>{t('Logout')}</span>
                </button>
              </div>
            )}
          </div>
          {/* Mobile extras toggle */}
          <div className="md:hidden">
            <IconButton label={t('More')} className={`${headerBtnBase} ${headerBtnTone}`} onClick={() => setIsExtrasOpen(!isExtrasOpen)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </IconButton>
          </div>
        </div>
      </div>
    </header>

    {isExtrasOpen && (
      <div className="md:hidden fixed inset-x-0 top-16 max-[320px]:top-14 z-40">
      <div className={`py-2 px-3 border-b backdrop-blur-sm ${headerTone}`}>
          <div className="grid grid-cols-4 gap-3">
            <IconButton label={t('Tasks')} className={`${mobileExtrasBase} ${mobileExtrasTasks}`} onClick={() => { setIsExtrasOpen(false); navigate('/tasks'); }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
              </svg>
            </IconButton>
            
            
            
            <IconButton label={t('Language')} className={`${mobileExtrasBase} ${mobileExtrasLang}`} onClick={() => {
              setIsMobileLanguageOpen(v => !v)
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18" />
                <path d="M12 3v18" />
              </svg>
            </IconButton>
            <IconButton label={t('Theme')} className={`${mobileExtrasBase} ${isLight ? 'bg-gray-100 border-gray-200 text-gray-600' : 'bg-gray-800 border-gray-700 text-gray-300'}`} onClick={toggleTheme}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path d="M12 3v1m0 16v1m8-9h-1M4 12H3m15.36-6.36l-.71.71M6.35 17.65l-.71.71m12.01 0l-.71-.71M6.35 6.35l-.71-.71" />
                <circle cx="12" cy="12" r="5" />
              </svg>
            </IconButton>
            <IconButton label={t('Profile')} className={`${mobileExtrasBase} ${isLight ? 'bg-gray-100 border-gray-200 text-gray-600' : 'bg-gray-800 border-gray-700 text-gray-300'}`} onClick={(e) => {
              setIsExtrasOpen(false);
              try {
                const rect = e.currentTarget.getBoundingClientRect();
                const top = Math.min(rect.bottom + 8, window.innerHeight - 10);
                const left = Math.max(8, rect.left);
                const right = Math.max(8, window.innerWidth - rect.right);
                setProfileMenuPos({ top, left, right });
              } catch {}
              setIsProfileMobileOpen(v=>!v);
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 20a6 6 0 0112 0" />
              </svg>
            </IconButton>
            {isMobileLanguageOpen && (
              <div ref={mobileLanguageRef} className={`col-span-4 mt-2 rounded-lg border ${isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700'} p-2`}>
                <div className="grid grid-cols-2 gap-2">
                  <button className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm ${isLight ? 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200' : 'bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700'}`} onClick={() => { i18n.changeLanguage('en'); try { localStorage.setItem('language','en') } catch {} setIsExtrasOpen(false); }}>
                    <FlagUS /> {isRTL ? 'الانجليزية' : 'English'}
                  </button>
                  <button className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm ${isLight ? 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200' : 'bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700'}`} onClick={() => { i18n.changeLanguage('ar'); try { localStorage.setItem('language','ar') } catch {} setIsExtrasOpen(false); }}>
                    <FlagEG /> {isRTL ? 'العربية' : 'Arabic'}
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )}

    {isProfileMobileOpen && (
      <div ref={profileMobileRef} className="md:hidden fixed z-50" style={{ top: profileMenuPos.top, left: isRTL ? profileMenuPos.left : undefined, right: isRTL ? undefined : profileMenuPos.right }}>
        <div className={`dropdown-panel w-[260px] max-w-[90vw] ${isLight ? 'bg-white border border-gray-200' : 'bg-gray-900 border border-gray-700'} rounded-xl shadow-2xl`} role="menu" aria-label={t('Profile menu')}>
          <div className="px-3 py-2 flex items-center gap-2">
            <AvatarImage
              user={user}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
              onError={() => { try { fetchCompanyInfo() } catch {} }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name || t('Administrator')}</div>
              <div className="text-[11px] text-[var(--muted-text)] truncate">{user?.email || 'admin@example.com'}</div>
              <button className="mt-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700" onClick={() => { navigate('/settings/profile'); }}>{t('My Profile')} ▸</button>
            </div>
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-green-500" aria-hidden></span>
          </div>
          <div className="h-px bg-[var(--divider)]"></div>
          <button onClick={() => { navigate('/settings/profile#security') }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--content-text)] hover:bg-[var(--table-row-hover)]" role="menuitem"><span className="w-5 h-5 inline-flex items-center justify-center">🔐</span><span>{t('Security Settings')}</span></button>
          <button onClick={() => { navigate('/settings/profile#security-devices') }} className="w-full flex items_center gap-2 px-3 py-2 text-xs text-[var(--content-text)] hover:bg-[var(--table-row-hover)]" role="menuitem"><span className="w-5 h-5 inline-flex items_center justify_center">📱</span><span>{t('Linked Devices')}</span></button>
          {canViewCompanyProfile && (
            <button onClick={() => { navigate('/settings/profile/company') }} className="w-full flex items_center gap-2 px-3 py-2 text-xs text-[var(--content-text)] hover:bg-[var(--table-row-hover)]" role="menuitem"><span className="w-5 h-5 inline-flex items_center justify_center">🏢</span><span>{t('Company Profile')}</span></button>
          )}
          <div className="h-px bg-[var(--divider)]"></div>
          <button onClick={() => { navigate('/settings/profile') }} className="w-full flex items_center gap-2 px-3 py-2 text-xs text-[var(--content-text)] hover:bg-[var(--table-row-hover)]" role="menuitem"><span className="w-5 h-5 inline-flex items_center justify_center">🖼️</span><span>{t('Change Profile Picture')}</span></button>
          <button onClick={() => { navigate('/settings/system/security') }} className="w-full flex items_center gap-2 px-3 py-2 text-xs text-[var(--content-text)] hover:bg-[var(--table-row-hover)]" role="menuitem"><span className="w-5 h-5 inline-flex items_center justify_center">🔑</span><span>{t('Change Password')}</span></button>
          <div className="h-px bg-[var(--divider)]"></div>
          <button onClick={logout} className="w-full flex items_center gap-2 px-3 py-2 text-xs text-[var(--content_text)] hover:bg-[var(--table-row-hover)]" role="menuitem"><span className="w-5 h-5 inline-flex items_center justify_center">↪️</span><span>{t('Logout')}</span></button>
        </div>
      </div>
    )}

    {/* Calendar modal */}
    {calendarOpen && <CalendarModal open={calendarOpen} onClose={() => setCalendarOpen(false)} />}

    {/* Search modal handled inline as dropdown */}

    {/* Task Details Modal - Placed here to persist after notification dropdown closes */}
    {isTaskModalOpen && selectedTask && (
      <TaskDetailsModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
      />
    )}

    </>
  );
}
