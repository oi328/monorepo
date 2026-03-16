import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../shared/context/ThemeProvider'
import { useAppState } from '../../shared/context/AppStateProvider'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { api, logExportEvent } from '@utils/api'
import { useLocation } from 'react-router-dom'
import ProfileNotificationSettings from './profile/ProfileNotificationSettings'
import AvatarImage from '../AvatarImage' // Import custom avatar component

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 sm:px-6 py-3 text-sm font-medium transition-all duration-300 whitespace-nowrap relative ${
      active
        ? 'text-blue-600 dark:text-blue-400 bg-blue-900/10 rounded-t-xl'
        : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-gray-800/30 rounded-t-xl'
    }`}
  >
    {children}
    {active && (
      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-full shadow-[0_-2px_6px_rgba(59,130,246,0.4)]"></span>
    )}
  </button>
)

export default function ProfileSettingsPanel() {
  const { t, i18n } = useTranslation()
  const { crmSettings } = useAppState()
  const location = useLocation()
  const [active, setActive] = useState('personal')
  const [saving, setSaving] = useState(false)
  const devicesRef = useRef(null)

  // Initial values
  const initial = useMemo(() => ({
    fullName: '',
    jobTitle: '',
    department: '',
    email: '',
    phone: '',
    username: '',
    lang: i18n.language.startsWith('ar') ? 'Arabic' : 'English',
    tz: 'Africa/Cairo',
    theme: 'Dark',
    notifEmail: true,
    notifSms: false,
    notifApp: true,
    notifMonthly: false,
    notifNewDevice: true,
    securityLoginNewDev: true,
    securityChangePwd: true,
    security2FA: false,
    maxLogin: 3,
    avatar: '',
    avatarPreview: ''
  }), [])

  const [savedValues, setSavedValues] = useState(initial)
  const [loading, setLoading] = useState(true)

  const [fullName, setFullName] = useState(savedValues.fullName)
  const [jobTitle, setJobTitle] = useState(savedValues.jobTitle)
  const [department, setDepartment] = useState(savedValues.department)
  const [email, setEmail] = useState(savedValues.email)
  const [phone, setPhone] = useState(savedValues.phone)
  const [username, setUsername] = useState(savedValues.username)
  const [avatar, setAvatar] = useState(savedValues.avatar)
  const [avatarPreview, setAvatarPreview] = useState(savedValues.avatarPreview)

  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurPwd, setShowCurPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  const [notifEmail, setNotifEmail] = useState(savedValues.notifEmail)
  const [notifSms, setNotifSms] = useState(savedValues.notifSms)
  const [notifApp, setNotifApp] = useState(savedValues.notifApp)
  const [notifMonthly, setNotifMonthly] = useState(savedValues.notifMonthly)
  const [notifNewDevice, setNotifNewDevice] = useState(savedValues.notifNewDevice)

  const [securityLoginNewDev, setSecurityLoginNewDev] = useState(savedValues.securityLoginNewDev)
  const [securityChangePwd, setSecurityChangePwd] = useState(savedValues.securityChangePwd)
  const [security2FA, setSecurity2FA] = useState(savedValues.security2FA)
  const [maxLogin, setMaxLogin] = useState(savedValues.maxLogin)

  const [lang, setLang] = useState(savedValues.lang)
  const [tz, setTz] = useState(savedValues.tz)
  const { theme: globalTheme, setTheme: setGlobalTheme, resolvedTheme } = useTheme()
  const isLight = resolvedTheme !== 'dark'
  const [localTheme, setLocalTheme] = useState(globalTheme)

  const [userRole, setUserRole] = useState('')
  const [userTarget, setUserTarget] = useState({ monthly: 0, yearly: 0 })

  // Sync local state with i18n language changes
  useEffect(() => {
    setLang(i18n.language.startsWith('ar') ? 'Arabic' : 'English')
  }, [i18n.language])

  // Sync local theme state with global theme changes (e.g. Topbar toggle)
  useEffect(() => {
    setLocalTheme(globalTheme)
  }, [globalTheme])

  // Fetch Profile Data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/api/profile')
        const user = res.data
        
        setUserRole(user.roles?.[0]?.name || user.role || '')
        setUserTarget({
          monthly: parseFloat(user.monthly_target || 0),
          yearly: parseFloat(user.yearly_target || 0)
        })

        const notif = user.notification_settings || {}
        const sec = user.security_settings || {}

        const newValues = {
          ...initial,
          id: user.id, // Add ID
          fullName: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          jobTitle: user.job_title || '',
          department: user.department?.name || user.team?.department?.name || user.managed_department?.name || '',
          username: user.username || '',
          avatar: '', // Reset file object
          avatarPreview: user.avatar_url || '',
          lang: user.locale === 'ar' ? 'Arabic' : 'English',
          tz: user.timezone || 'Africa/Cairo',
          theme: user.theme_mode || 'auto',
          
          notifEmail: notif.email ?? true,
          notifSms: notif.sms ?? false,
          notifApp: notif.app ?? true,
          notifMonthly: notif.monthly_report ?? false,
          notifNewDevice: notif.new_device ?? true,
          
          securityLoginNewDev: sec.login_new_device_alert ?? true,
          securityChangePwd: sec.password_change_alert ?? true,
          security2FA: sec.two_factor_auth ?? false,
          maxLogin: sec.max_login_sessions ?? 3,
        }
        
        setSavedValues(newValues)
        setFullName(newValues.fullName)
        setEmail(newValues.email)
        setPhone(newValues.phone)
        setJobTitle(newValues.jobTitle)
        setDepartment(newValues.department)
        setUsername(newValues.username)
        setAvatarPreview(newValues.avatarPreview)
        setLang(newValues.lang)
        setTz(newValues.tz)
        // Theme sync removed to prevent overriding user's current session choice
        // The localTheme is already initialized with globalTheme
        
        setNotifEmail(newValues.notifEmail)
        setNotifSms(newValues.notifSms)
        setNotifApp(newValues.notifApp)
        setNotifMonthly(newValues.notifMonthly)
        setNotifNewDevice(newValues.notifNewDevice)
        
        setSecurityLoginNewDev(newValues.securityLoginNewDev)
        setSecurityChangePwd(newValues.securityChangePwd)
        setSecurity2FA(newValues.security2FA)
        setMaxLogin(newValues.maxLogin)
      } catch (err) {
        console.error('Failed to fetch profile', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [initial])
  
  useEffect(() => {
    const hash = (location.hash || '').replace('#', '').toLowerCase()
    const params = new URLSearchParams(location.search || '')
    const tabParam = (params.get('tab') || '').toLowerCase()
    const key = hash || tabParam
    if (key === 'security') setActive('log')
    else if (key === 'notifications') setActive('notifications')
    else if (key === 'preferences') setActive('preferences')
    else if (key === 'personal') setActive('personal')
    if (key.includes('devices')) {
      setActive('log')
      requestAnimationFrame(() => {
        const el = devicesRef.current
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [location])

  const [logFilterStart, setLogFilterStart] = useState('')
  const [logFilterEnd, setLogFilterEnd] = useState('')
  const [logDevice, setLogDevice] = useState('All')

  const [devices, setDevices] = useState([])
  const [subordinates, setSubordinates] = useState([])

  const isSalesPerson = useMemo(() => {
    const r = (userRole || '').toLowerCase()
    return r.includes('sales person') || r.includes('salesperson')
  }, [userRole])

  const fetchDevices = async () => {
    try {
      const res = await api.get('/api/profile/sessions')
      const mapped = res.data.map(d => {
        // Simple User Agent Parsing (Basic)
        let deviceName = 'Unknown Device'
        let icon = '💻' // Default Desktop
        
        if (d.user_agent) {
          const ua = d.user_agent.toLowerCase()
          if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
            icon = '📱'
          }
          
          if (ua.includes('windows')) deviceName = 'Windows PC'
          else if (ua.includes('macintosh') || ua.includes('mac os')) deviceName = 'MacBook/iMac'
          else if (ua.includes('linux')) deviceName = 'Linux PC'
          else if (ua.includes('iphone')) deviceName = 'iPhone'
          else if (ua.includes('ipad')) deviceName = 'iPad'
          else if (ua.includes('android')) deviceName = 'Android Device'
          
          // Browser
          let browser = ''
          if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome'
          else if (ua.includes('firefox')) browser = 'Firefox'
          else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
          else if (ua.includes('edg')) browser = 'Edge'
          
          if (browser) deviceName = `${browser} (${deviceName})`
        }

        return {
          id: d.id,
          dev: deviceName,
          ip: d.ip_address || 'Unknown',
          loc: d.location || 'Unknown',
          last: d.is_current ? 'Active now' : new Date(d.last_used_at || d.created_at).toLocaleDateString(),
          icon: icon,
          current: d.is_current
        }
      })
      setDevices(mapped)
    } catch (err) {
      console.error('Failed to fetch sessions', err)
    }
  }

  useEffect(() => {
    if (active === 'log') fetchDevices()
  }, [active])

  const fetchSubordinates = async () => {
    try {
      const res = await api.get('/api/reports/team-stats')
      let data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      setSubordinates(data)
    } catch (err) {
      console.error('Failed to fetch subordinates', err)
    }
  }

  const teamTargets = useMemo(() => {
    const totalMonthly = subordinates.reduce((acc, curr) => acc + (parseFloat(curr.monthly_target) || 0), 0)
    const totalYearly = subordinates.reduce((acc, curr) => acc + (parseFloat(curr.yearly_target) || 0), 0)
    return { totalMonthly, totalYearly }
  }, [subordinates])

  const handleDeviceAction = async (id) => {
    if (!window.confirm(t('Are you sure you want to revoke this session?'))) return
    try {
      await api.delete(`/api/profile/sessions/${id}`)
      setDevices(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error('Failed to revoke session', err)
      alert(t('Failed to revoke session'))
    }
  }

  const pwdStrength = useMemo(() => {
    let score = 0
    if (newPwd.length >= 8) score++
    if (/[A-Z]/.test(newPwd)) score++
    if (/[a-z]/.test(newPwd)) score++
    if (/\d/.test(newPwd)) score++
    if (/[^A-Za-z0-9]/.test(newPwd)) score++
    return score
  }, [newPwd])

  const logs = useMemo(() => ([
    { date: '2025-11-12', action: 'Login', device: 'Chrome (Windows)', location: 'Cairo, Egypt' },
    { date: '2025-11-11', action: 'Password Change', device: 'Edge (Windows)', location: 'Giza, Egypt' },
    { date: '2025-11-09', action: 'Login', device: 'Safari (iOS)', location: 'Alexandria, Egypt' },
  ]), [])

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const okDevice = logDevice === 'All' || (l.device || '').toLowerCase().includes(logDevice.toLowerCase())
      const okStart = !logFilterStart || l.date >= logFilterStart
      const okEnd = !logFilterEnd || l.date <= logFilterEnd
      return okDevice && okStart && okEnd
    })
  }, [logs, logDevice, logFilterStart, logFilterEnd])

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLogs)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SecurityLog')
    const fileName = 'security_log.xlsx'
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Security Log',
      fileName,
      format: 'xlsx',
    })
  }
  const exportPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4')
    doc.setFontSize(14)
    doc.text('Security Log', 40, 40)
    const head = [['Date','Action','Device','Location']]
    const body = filteredLogs.map(l => [l.date, l.action, l.device, l.location])
    doc.autoTable({ head, body, startY: 60 })
    doc.save('security_log.pdf')
    logExportEvent({
      module: 'Security Log',
      fileName: 'security_log.pdf',
      format: 'pdf',
    })
  }

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatar(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result || '')
    reader.readAsDataURL(file)
  }

  const hasChanges = useMemo(() => {
    if (newPwd || confirmPwd) return true
    if (fullName !== savedValues.fullName) return true
    if (jobTitle !== savedValues.jobTitle) return true
    if (department !== savedValues.department) return true
    if (email !== savedValues.email) return true
    if (phone !== savedValues.phone) return true
    if (username !== savedValues.username) return true
    if (lang !== savedValues.lang) return true
    if (tz !== savedValues.tz) return true
    if (localTheme !== savedValues.theme) return true
    if (notifEmail !== savedValues.notifEmail) return true
    if (notifSms !== savedValues.notifSms) return true
    if (notifApp !== savedValues.notifApp) return true
    if (notifMonthly !== savedValues.notifMonthly) return true
    if (notifNewDevice !== savedValues.notifNewDevice) return true
    if (securityLoginNewDev !== savedValues.securityLoginNewDev) return true
    if (securityChangePwd !== savedValues.securityChangePwd) return true
    if (security2FA !== savedValues.security2FA) return true
    if (String(maxLogin) !== String(savedValues.maxLogin)) return true
    if (avatar !== savedValues.avatar) return true
    return false
  }, [
    savedValues,
    fullName, jobTitle, department, email, phone, username,
    lang, tz, localTheme,
    notifEmail, notifSms, notifApp, notifMonthly, notifNewDevice,
    securityLoginNewDev, securityChangePwd, security2FA, maxLogin,
    avatar, newPwd, confirmPwd
  ])

  const saveChanges = async () => {
    if (!hasChanges) return
    setSaving(true)
    
    try {
      const formData = new FormData()
      formData.append('name', fullName)
      formData.append('email', email)
      if (phone) formData.append('phone', phone)
      if (avatar instanceof File) {
        formData.append('avatar', avatar)
      }
      formData.append('locale', lang === 'Arabic' ? 'ar' : 'en')
      formData.append('timezone', tz)
      formData.append('theme_mode', localTheme)

      if (newPwd) {
        formData.append('password', newPwd)
        formData.append('password_confirmation', confirmPwd)
      }

      const notificationSettings = {
        email: notifEmail,
        sms: notifSms,
        app: notifApp,
        monthly_report: notifMonthly,
        new_device: notifNewDevice
      }
      formData.append('notification_settings', JSON.stringify(notificationSettings))

      const securitySettings = {
        login_new_device_alert: securityLoginNewDev,
        password_change_alert: securityChangePwd,
        two_factor_auth: security2FA,
        max_login_sessions: maxLogin
      }
      formData.append('security_settings', JSON.stringify(securitySettings))

      const res = await api.post('/api/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const user = res.data.user
      
      const notif = user.notification_settings || {}
      const sec = user.security_settings || {}

      const currentValues = {
        ...savedValues,
        fullName: user.name || fullName,
        jobTitle: user.job_title || jobTitle,
        department: user.department?.name || department,
        email: user.email || email,
        phone: user.phone || phone,
        username: user.username || username,
        avatar: '', // Reset file input
        avatarPreview: user.avatar_url || avatarPreview, // Update with new URL
        lang: user.locale === 'ar' ? 'Arabic' : 'English',
        tz: user.timezone || tz,
        theme: user.theme_mode || localTheme,
        notifEmail: notif.email ?? notifEmail,
        notifSms: notif.sms ?? notifSms,
        notifApp: notif.app ?? notifApp,
        notifMonthly: notif.monthly_report ?? notifMonthly,
        notifNewDevice: notif.new_device ?? notifNewDevice,
        securityLoginNewDev: sec.login_new_device_alert ?? securityLoginNewDev,
        securityChangePwd: sec.password_change_alert ?? securityChangePwd,
        security2FA: sec.two_factor_auth ?? security2FA,
        maxLogin: sec.max_login_sessions ?? maxLogin
      }
      setSavedValues(currentValues)
      setAvatar('') // Clear file input state
      if (user.avatar_url) setAvatarPreview(user.avatar_url)

      // Clear password fields on save
      setCurPwd('')
      setNewPwd('')
      setConfirmPwd('')
      setGlobalTheme(localTheme)
      alert(t('Changes saved successfully'))
    } catch (err) {
      console.error('Failed to save profile', err)
      alert(t('Failed to save changes'))
    } finally {
      setSaving(false)
    }
  }

  const resetChanges = () => {
    setFullName(savedValues.fullName)
    setJobTitle(savedValues.jobTitle)
    setUsername(savedValues.username)
    setDepartment(savedValues.department)
    setEmail(savedValues.email)
    setPhone(savedValues.phone)
    setAvatar(savedValues.avatar)
    setAvatarPreview(savedValues.avatarPreview)
    setCurPwd('')
    setNewPwd('')
    setConfirmPwd('')
    setShowCurPwd(false)
    setShowNewPwd(false)
    setShowConfirmPwd(false)
    setNotifEmail(savedValues.notifEmail)
    setNotifSms(savedValues.notifSms)
    setNotifApp(savedValues.notifApp)
    setNotifMonthly(savedValues.notifMonthly)
    setNotifNewDevice(savedValues.notifNewDevice)
    setSecurityLoginNewDev(savedValues.securityLoginNewDev)
    setSecurityChangePwd(savedValues.securityChangePwd)
    setSecurity2FA(savedValues.security2FA)
    setMaxLogin(savedValues.maxLogin)
    setLang(savedValues.lang)
    setTz(savedValues.tz)
    setLocalTheme(savedValues.theme)
    setLogFilterStart('')
    setLogFilterEnd('')
    setLogDevice('All')
    setActive('personal')
  }

  const currencyCode = crmSettings?.defaultCurrency || 'EGP'
  const appLocale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US'

  return (
    <div className="rounded-2xl glass-panel w-full overflow-hidden shadow-2xl">

      {/* Tabs */}
      <div className="px-3 sm:px-4 pt-2 sm:pt-3">
        <div className="flex text-theme-text items-center gap-2 overflow-x-auto no-scrollbar">
          <TabButton active={active==='personal'} onClick={() => setActive('personal')}>{t('Profile Info')}</TabButton>
          <TabButton active={active==='log'} onClick={() => setActive('log')}>{t('Security Settings')}</TabButton>
          {isSalesPerson ? (
             <TabButton active={active==='target'} onClick={() => setActive('target')}>{t('My Target')}</TabButton>
          ) : (
             <TabButton active={active==='team'} onClick={() => { setActive('team'); fetchSubordinates(); }}>{t('My Team')}</TabButton>
          )}
          <TabButton active={active==='notifications'} onClick={() => setActive('notifications')}>{t('Notifications')}</TabButton>
          <TabButton active={active==='preferences'} onClick={() => setActive('preferences')}>{t('Preferences')}</TabButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {active === 'personal' && (
          <div className="flex flex-col md:flex-row gap-8 md:gap-16 justify-center items-start max-w-5xl mx-auto">
            
            


            {/* Right Column: Fields */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-theme-text ml-1">{t('Full Name')}</label>
                <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-700/60 bg-transparent focus-within:ring-4 ring-blue-500/10 focus-within:border-blue-500/50 transition-all shadow-sm hover:border-blue-500/30">
                  <input className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder={t('Enter full name')} />
                </div>
              </div>
                            {/* User Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-theme-text ml-1">{t('User name @')}</label>
                <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-700/60 bg-transparent focus-within:ring-4 ring-blue-500/10 focus-within:border-blue-500/50 transition-all shadow-sm hover:border-blue-500/30">
                  <input className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium" value={username} onChange={e=>setUsername(e.target.value)} placeholder={t('Enter username')} />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-theme-text ml-1">{t('Phone')}</label>
                <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-700/60 bg-transparent focus-within:ring-4 ring-blue-500/10 focus-within:border-blue-500/50 transition-all shadow-sm hover:border-blue-500/30">
                  <input className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium" value={phone} onChange={e=>setPhone(e.target.value)} placeholder={t('Enter phone number')} />
                </div>
              </div>





              {/* Email */}
              <div className="space-y-2 ">
                <label className="text-sm font-semibold text-theme-text ml-1">{t('Email @')}</label>
                <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-700/60 bg-transparent focus-within:ring-4 ring-blue-500/10 focus-within:border-blue-500/50 transition-all shadow-sm hover:border-blue-500/30">
                  <input className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400 font-medium" value={email} onChange={e=>setEmail(e.target.value)} placeholder={t('Enter email address')} />
                </div>
              </div>
              {/* Title (Admin) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-theme-text ml-1">{t('Title ')}</label>
                <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gray-700/60 bg-transparent opacity-75 cursor-not-allowed shadow-sm">
                  <input 
                    className="flex-1 bg-transparent outline-none text-theme font-medium cursor-not-allowed select-none" 
                    value={jobTitle} 
                    disabled 
                    readOnly 
                    title={t('This field can only be edited by administrators')}
                  />
                  <span className="text-lg opacity-50" title={t('Read only')}>🔒</span>
                </div>
              </div>
              
              {/* New Upload Component */}
              <label className="col-span-1 md:col-span-2 mt-6 flex flex-col items-center justify-center h-[80px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-transparent hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group relative overflow-hidden">
                  <div className="flex items-center gap-4 z-10 px-6 w-full">
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${avatarPreview ? 'overflow-hidden border-2 border-white dark:border-gray-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                          {avatarPreview ? (
                             // If it's a blob URL (uploaded preview), show it directly
                             avatarPreview.startsWith('blob:') || avatarPreview.startsWith('data:') ? (
                               <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                             ) : (
                               // If it's a URL from backend, use AvatarImage
                               <AvatarImage 
                                 user={{ id: savedValues.id, avatar: savedValues.avatar, avatar_url: avatarPreview, name: fullName }} 
                                 className="w-full h-full object-cover"
                               />
                             )
                          ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                          )}
                       </div>
                       <div className="flex flex-col items-start flex-1">
                           <span className="text-base font-semibold text-theme-text group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t('Upload new profile image')}</span>
                           <span className="text-xs text-gray-400 font-medium mt-0.5">{t('JPG, PNG – Max 5MB')}</span>
                       </div>
                       <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-600 text-gray-400 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300 shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                       </div>
                  </div>
                  <input type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {active === 'target' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="glass-panel rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <span className="text-xl">🎯</span> {t('My Target')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{t('Monthly Target')}</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      {new Intl.NumberFormat(appLocale, { style: 'currency', currency: currencyCode }).format(userTarget.monthly)}
                    </p>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{t('Yearly Target')}</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      {new Intl.NumberFormat(appLocale, { style: 'currency', currency: currencyCode }).format(userTarget.yearly)}
                    </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {active === 'team' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 gap-6">
              {/* Team Targets Overview */}
              <div className="glass-panel rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-800 dark:text-blue-300">
                  <span className="text-xl">🎯</span> {t('Total Team Target')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                     <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{t('Total Monthly Target')}</p>
                     <p className="text-2xl font-bold text-gray-800 dark:text-white">
                        {new Intl.NumberFormat(appLocale, { style: 'currency', currency: currencyCode }).format(teamTargets.totalMonthly)}
                     </p>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                     <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{t('Total Yearly Target')}</p>
                     <p className="text-2xl font-bold text-gray-800 dark:text-white">
                        {new Intl.NumberFormat(appLocale, { style: 'currency', currency: currencyCode }).format(teamTargets.totalYearly)}
                     </p>
                  </div>
                </div>
              </div>

              {/* Employee Targets */}
              <div className="glass-panel rounded-2xl p-4">
                <h3 className="text-lg font-semibold mb-4">{t('Team Performance (This Month)')}</h3>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {subordinates.map(u => (
                    <div key={u.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                              {u.name.charAt(0).toUpperCase()}
                           </div>
                           <div>
                             <div className="font-semibold text-theme-text">{u.name}</div>
                             <div className="text-xs text-theme">{u.job_title || u.role}</div>
                           </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          (u.achievement_percent || 0) >= 100 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                          (u.achievement_percent || 0) >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {u.achievement_percent || 0}%
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-3 py-3 border-y border-gray-100 dark:border-gray-700/50">
                         <div>
                           <div className="text-xs text-theme mb-1">{t('Target')}</div>
                           <div className="font-semibold text-theme text-lg">
                              {new Intl.NumberFormat(appLocale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(u.monthly_target || 0)}
                           </div>
                         </div>
                         <div>
                           <div className="text-xs text-theme mb-1">{t('Achieved')}</div>
                           <div className="font-semibold text-green-600 dark:text-green-400 text-lg">
                              {new Intl.NumberFormat(appLocale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(u.revenue || 0)}
                           </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                            <div className="text-xs text-gray-500">{t('Leads')}</div>
                            <div className="font-bold text-theme-text">{u.leads_count || 0}</div>
                         </div>
                         <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                            <div className="text-xs text-gray-500">{t('Activities')}</div>
                            <div className="font-bold text-theme-text">{u.activities_count || 0}</div>
                         </div>
                      </div>
                    </div>
                  ))}
                  {subordinates.length === 0 && (
                    <div className="text-center text-gray-500 py-8">{t('No team members found')}</div>
                  )}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700/40 bg-gray-800/50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">{t('Employee')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">{t('Target')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">{t('Achieved')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">{t('%')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">{t('Leads')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">{t('Activities')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subordinates.map(u => (
                        <tr key={u.id} className="border-b border-gray-800/40 hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                  {u.name.charAt(0).toUpperCase()}
                               </div>
                               <div>
                                 <div className="text-theme-text">{u.name}</div>
                                 <div className="text-xs text-gray-500">{u.job_title || u.role}</div>
                               </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                               {new Intl.NumberFormat(appLocale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(u.monthly_target || 0)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-green-600 dark:text-green-400">
                               {new Intl.NumberFormat(appLocale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(u.revenue || 0)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-bold ${
                              (u.achievement_percent || 0) >= 100 ? 'text-green-600 dark:text-green-400' : 
                              (u.achievement_percent || 0) >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 
                              'text-red-600 dark:text-red-400'
                            }`}>
                               {u.achievement_percent || 0}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-theme-text">
                            {u.leads_count || 0}
                          </td>
                          <td className="py-3 px-4 text-theme-text">
                            {u.activities_count || 0}
                          </td>
                        </tr>
                      ))}
                      {subordinates.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[var(--muted-text)]">
                            {t('No team members found')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}


        {active === 'notifications' && (
          <ProfileNotificationSettings
            notifEmail={notifEmail}
            setNotifEmail={setNotifEmail}
            notifSms={notifSms}
            setNotifSms={setNotifSms}
            notifApp={notifApp}
            setNotifApp={setNotifApp}
            notifMonthly={notifMonthly}
            setNotifMonthly={setNotifMonthly}
            notifNewDevice={notifNewDevice}
            setNotifNewDevice={setNotifNewDevice}
          />
        )}

        {active === 'preferences' && (
          <div className="max-w-2xl space-y-8">
            {/* Language & Region */}
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-theme-text px-1 flex items-center gap-2">
                <span className="text-xl">🌐</span> {t('Language & Region')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme-text">{t('Language')}</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:ring-2 ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm outline-none text-theme-text"
                      value={lang} 
                      onChange={e=>setLang(e.target.value)}
                    >
                      <option value="English">English</option>
                      <option value="Arabic">Arabic</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-theme-text">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme-text">{t('Time Zone')}</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:ring-2 ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm outline-none text-theme-text"
                      value={tz} 
                      onChange={e=>setTz(e.target.value)}
                    >
                      <option>Africa/Cairo</option>
                      <option>Asia/Riyadh</option>
                      <option>Europe/London</option>
                      <option>UTC</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-theme-text">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Appearance */}
            <div className="space-y-5">
              <h3 className={`text-base font-semibold px-1 flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}>
                <span className="text-xl">🎨</span> {t('Appearance')}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['Light', 'Dark', 'Auto'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLocalTheme(mode.toLowerCase())}
                    className={`group relative p-3 rounded-xl border text-left transition-all duration-200 flex flex-col gap-3 overflow-hidden ${
                      localTheme === mode.toLowerCase()
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-500 shadow-sm' 
                        : 'border-gray-200 dark:border-gray-700 bg-transparent hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className={`w-full aspect-video rounded-lg border shadow-sm flex flex-col overflow-hidden ${
                      mode === 'Dark' ? 'bg-gray-900 border-gray-700' : 
                      mode === 'Light' ? 'bg-white border-gray-200' : 
                      'bg-gradient-to-br from-white via-gray-100 to-gray-900 border-gray-300'
                    }`}>
                      <div className="flex-1 p-2 space-y-1.5 opacity-60">
                        <div className={`h-1.5 w-1/2 rounded-full ${mode==='Dark'?'bg-gray-700':'bg-gray-200'}`}></div>
                        <div className={`h-1.5 w-3/4 rounded-full ${mode==='Dark'?'bg-gray-800':'bg-gray-100'}`}></div>
                        <div className={`h-1.5 w-1/3 rounded-full ${mode==='Dark'?'bg-gray-800':'bg-gray-100'}`}></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-sm font-medium ${
                          localTheme === mode.toLowerCase()
                            ? (isLight ? 'text-blue-600' : 'text-blue-400')
                            : (isLight ? 'text-black' : 'text-white')
                        }`}
                      >
                        {t(mode + ' Mode')}
                      </span>
                      {localTheme === mode.toLowerCase() && (
                        <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">✓</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {active === 'log' && (
          
          <div className="max-w-4xl space-y-8">
              <h3 className="text-base font-semibold text-theme-text px-1 flex items-center gap-2">
                 <span className="text-xl">🔒</span> {t('Change Password')}
              </h3>
             {/* Password Change */}
             <div className="flex flex-col md:flex-row gap-4">

               


               {/* New Password */}
               <div className="space-y-1.5 ">
                  <label className="text-sm font-medium text-theme-text">{t('New Password')}</label>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus-within:ring-2 ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
                    <input type={showNewPwd?'text':'password'} className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder={t('Enter new password')} />
                    <button type="button" className="text-xs text-blue-600 hover:underline font-medium" onClick={()=>setShowNewPwd(v=>!v)}>{showNewPwd ? t('Hide') : t('Show')}</button>
                  </div>
                  {newPwd && (
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                      <div className={`h-full transition-all duration-500 ${pwdStrength<=2?'bg-red-500':pwdStrength===3?'bg-yellow-500':'bg-emerald-500'}`} style={{ width: `${(pwdStrength/5)*100}%` }} />
                    </div>
                  )}
               </div>

               {/* Confirm Password */}
               <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme-text">{t('Confirm New Password')}</label>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus-within:ring-2 ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
                    <input type={showConfirmPwd?'text':'password'} className="flex-1 bg-transparent outline-none text-theme-text placeholder-gray-400" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} placeholder={t('Confirm new password')} />
                    <button type="button" className="text-xs text-blue-600 hover:underline font-medium" onClick={()=>setShowConfirmPwd(v=>!v)}>{showConfirmPwd ? t('Hide') : t('Show')}</button>
                  </div>
                  {confirmPwd && confirmPwd !== newPwd && (
                    <div className="text-xs text-rose-600 font-medium flex items-center gap-1">⚠️ {t("Passwords don't match")}</div>
                  )}
               </div>
             </div>

             <hr className="border-gray-200 dark:border-gray-700" />

   
             {/* Security Notifications */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-theme-text px-1 flex items-center gap-2">
                <span className="text-xl">🛡️</span> {t('Security Notifications')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {key:'newDev', label:'Login from New Devices', desc: 'Alert when login from unrecognized device', state:securityLoginNewDev, set:setSecurityLoginNewDev, icon:'🖥️'},
                  {key:'chgPwd', label:'Password Changes', desc: 'Notify when password is changed', state:securityChangePwd, set:setSecurityChangePwd, icon:'🔑'},
                  {key:'2fa', label:'Two-Factor Authentication', desc: 'Enable extra security layer', state:security2FA, set:setSecurity2FA, icon:'🔒'}
                ].map((row)=> (
                  <div key={row.key} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-lg">
                        {row.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-theme-text">{t(row.label)}</div>
                        <div className="text-xs text-theme-text mt-0.5">{t(row.desc)}</div>
                      </div>
                    </div>
                    <label className="inline-flex items-center cursor-pointer relative">
                      <input type="checkbox" className="sr-only peer" checked={row.state} onChange={e=>row.set(e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
                              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent inline-flex items-center cursor-pointer relative">
                <div>
                  <div className="text-sm font-semibold text-theme-text"><span className="text-xl">🚪</span>{t('Maximum Login Sessions')}</div>
                  <div className="text-xs text-theme-text mt-1">{t('Limit how many devices can be logged in simultaneously')}</div>
                </div>
                <div className="flex items-center gap-3   p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <button className="w-8 h-8 flex items-center justify-center rounded bg-gray-900/50   text-theme-text transition" onClick={()=>setMaxLogin(Math.max(1, parseInt(maxLogin)-1))}>-</button>
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    className="w-12 text-center bg-transparent font-semibold outline-none" 
                    value={maxLogin} 
                    onChange={e=>setMaxLogin(e.target.value)} 
                  />
                  <button className="w-8 h-8 flex items-center justify-center rounded bg-gray-900/50   text-theme-text transition" onClick={()=>setMaxLogin(Math.min(10, parseInt(maxLogin)+1))}>+</button>
                </div>
              
            </div>
              </div>
              


            </div>

            <hr className="border-gray-200 dark:border-gray-700" />



            {/* Linked Devices */}
            <div ref={devicesRef} className="space-y-4">
              <h3 className="text-base font-semibold text-theme-text px-1 flex items-center gap-2">
                <span className="text-xl">📱</span> {t('Linked Devices')}
              </h3>
              {/* Desktop View */}
              <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full text-sm text-left relative">
                    <thead className="bg-gray-800/80 text-white font-medium backdrop-blur-sm sticky top-0 z-10">
                      <tr>
                        <th className="px-5 py-3.5 whitespace-nowrap">{t('Device')}</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">{t('IP Address')}</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">{t('Location')}</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">{t('Last Active')}</th>
                        <th className="px-5 py-3.5 text-right whitespace-nowrap">{t('Action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700  bg-transparent">
                      {devices.map((d)=>(
                        <tr key={d.id} className="hover:bg-blue-900/10 transition-colors">
                          <td className="px-5 py-4 font-medium flex items-center gap-3 whitespace-nowrap">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${d.current ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-theme-text dark:bg-gray-800 '}`}>
                              {d.icon}
                            </div>
                            <div>
                              <div className="text-theme-text">{d.dev}</div>
                              {d.current && <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded border border-green-100">{t('Current Session')}</span>}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-theme-text whitespace-nowrap font-mono text-xs">{d.ip}</td>
                          <td className="px-5 py-4 text-theme-text whitespace-nowrap text-sm text-gray-500">{d.loc}</td>
                          <td className="px-5 py-4 text-theme-text whitespace-nowrap">{d.last}</td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleDeviceAction(d.id)}
                                className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 dark:bg-transparent dark:border-gray-600 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 font-medium transition shadow-sm hover:shadow"
                              >
                                {t('Log out')}
                              </button>
                              <button 
                                onClick={() => handleDeviceAction(d.id)}
                                className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 dark:bg-transparent dark:border-gray-600 dark:hover:bg-gray-800 rounded-lg text-rose-600 dark:text-rose-400 font-medium transition shadow-sm hover:shadow"
                              >
                                {t('Revoke')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile View (Cards) */}
              <div className="md:hidden space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {devices.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${d.current ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-theme-text dark:bg-gray-800 '}`}>
                          {d.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-theme-text text-sm">{d.dev}</div>
                          <div className="text-xs text-[var(--muted-text)] font-mono">{d.ip}</div>
                        </div>
                      </div>
                      {d.current && <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded border border-green-100 whitespace-nowrap">{t('Current')}</span>}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-[var(--muted-text)]">{d.last}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDeviceAction(d.id)} className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 dark:bg-transparent dark:border-gray-600 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 font-medium transition shadow-sm">
                          {t('Log out')}
                        </button>
                        <button onClick={() => handleDeviceAction(d.id)} className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 dark:bg-transparent dark:border-gray-600 dark:hover:bg-gray-800 rounded-lg text-rose-600 dark:text-rose-400 font-medium transition shadow-sm">
                          {t('Revoke')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 w-full sm:px-4 md:px-6 py-4 border-t border-white/20 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-[var(--muted-text)] w-full sm:w-auto text-center sm:text-left">{t('Last updated: Just now')}</div>
        <div className="flex flex-wrap justify-between gap-4 w-full sm:w-auto  ">
          <button 
            className="px-4 py-2 rounded-lg bg-gray-700/50 text-theme-text hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={resetChanges}
            disabled={saving || !hasChanges}
          >
            {t('Cancel')}
          </button>
          <button 
            className="px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" 
            onClick={saveChanges}
            disabled={saving || !hasChanges}
          >
            {saving && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {saving ? t('Saving...') : t('Save')}
          </button>
        </div>
      </div>
    </div>
  )
}
