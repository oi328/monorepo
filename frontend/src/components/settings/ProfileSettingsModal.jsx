import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { logExportEvent } from '../../utils/api'

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm rounded-t-lg transition-all duration-300 whitespace-nowrap border-b-2 ${
      active
        ? 'border-blue-500 text-blue-600 font-medium bg-white/60 dark:bg-gray-800/60 shadow-sm'
        : 'border-transparent text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-white/40 dark:hover:bg-gray-800/40'
    }`}
  >
    {children}
  </button>
)

export default function ProfileSettingsModal({ isOpen, onClose }) {
  const { t, i18n } = useTranslation()
  const [active, setActive] = useState('personal')
  const [saving, setSaving] = useState(false)

  const [fullName, setFullName] = useState('Ibrahim Mohamed')
  const [jobTitle, setJobTitle] = useState('Sales Manager')
  const [department, setDepartment] = useState('Sales')
  const [email, setEmail] = useState('ibrahim@example.com')
  const [phone, setPhone] = useState('+2010XXXXXXX')
  const [avatar, setAvatar] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')

  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurPwd, setShowCurPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  const [lang, setLang] = useState(i18n.language.startsWith('ar') ? 'Arabic' : 'English')
  const [tz, setTz] = useState('Africa/Cairo')
  const [theme, setTheme] = useState('Dark')

  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSms, setNotifSms] = useState(false)
  const [notifApp, setNotifApp] = useState(true)
  const [notifMonthly, setNotifMonthly] = useState(false)
  const [notifNewDevice, setNotifNewDevice] = useState(true)

  const [logFilterStart, setLogFilterStart] = useState('')
  const [logFilterEnd, setLogFilterEnd] = useState('')
  const [logDevice, setLogDevice] = useState('All')

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

  const saveChanges = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      onClose && onClose()
    }, 900)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-lg transition-opacity" onClick={onClose} />
      <div className="relative z-[1001] w-[92vw] max-w-[1200px] h-[85vh]">
        <div className="glass-panel rounded-2xl w-full h-full flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/20 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
                  {t('Profile Settings')}
                </h2>
                <span className="text-sm text-[var(--muted-text)]">
                  {t('Manage your personal details, security, and preferences.')}
                </span>
                {saving && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-xs animate-pulse">
                    {t('Saving...')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700" onClick={saveChanges}>
                  {t('Save Changes')}
                </button>
                <button className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600" onClick={onClose}>
                  {t('Close')}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <TabButton active={active==='personal'} onClick={() => setActive('personal')}>{t('Personal Info')}</TabButton>
              <TabButton active={active==='account'} onClick={() => setActive('account')}>{t('Account & Password')}</TabButton>
              <TabButton active={active==='notifications'} onClick={() => setActive('notifications')}>{t('Notifications')}</TabButton>
              <TabButton active={active==='preferences'} onClick={() => setActive('preferences')}>{t('Preferences')}</TabButton>
              <TabButton active={active==='log'} onClick={() => setActive('log')}>{t('Security Log')}</TabButton>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {active === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--muted-text)]">{t('Full Name')}</label>
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                      <span className="text-gray-400">👤</span>
                      <input className="flex-1 bg-transparent outline-none" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder={t('Enter full name')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--muted-text)]">{t('Job Title')}</label>
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                      <span className="text-gray-400">💼</span>
                      <input className="flex-1 bg-transparent outline-none" value={jobTitle} onChange={e=>setJobTitle(e.target.value)} placeholder={t('Enter job title')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--muted-text)]">{t('Department')}</label>
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                      <span className="text-gray-400">🏢</span>
                      <input className="flex-1 bg-transparent outline-none" value={department} onChange={e=>setDepartment(e.target.value)} placeholder={t('Enter department')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--muted-text)]">{t('Email')}</label>
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                      <span className="text-gray-400">✉️</span>
                      <input className="flex-1 bg-transparent outline-none" value={email} onChange={e=>setEmail(e.target.value)} placeholder={t('Enter email')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--muted-text)]">{t('Phone')}</label>
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                      <span className="text-gray-400">📞</span>
                      <input className="flex-1 bg-transparent outline-none" value={phone} onChange={e=>setPhone(e.target.value)} placeholder={t('Enter phone')} />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-white/30 dark:via-gray-700 to-transparent" />

                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/30">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl">👤</div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center text-xs text-white cursor-pointer">
                      {t('Update Photo')}
                      <input type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />
                    </label>
                  </div>
                </div>
                <div className="h-4" />
              </div>
            )}

            {active === 'account' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--muted-text)]">{t('Current Password')}</label>
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                      <input type={showCurPwd?'text':'password'} className="flex-1 bg-transparent outline-none" value={curPwd} onChange={e=>setCurPwd(e.target.value)} placeholder={t('Enter current password')} />
                      <button type="button" className="text-xs text-blue-600" onClick={()=>setShowCurPwd(v=>!v)}>{showCurPwd ? t('Hide') : t('Show')}</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--muted-text)]">{t('New Password')}</label>
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                      <input type={showNewPwd?'text':'password'} className="flex-1 bg-transparent outline-none" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder={t('Enter new password')} />
                      <button type="button" className="text-xs text-blue-600" onClick={()=>setShowNewPwd(v=>!v)}>{showNewPwd ? t('Hide') : t('Show')}</button>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                      <div className={`h-2 transition-all ${pwdStrength<=2?'bg-red-500':pwdStrength===3?'bg-yellow-500':'bg-emerald-500'}`} style={{ width: `${(pwdStrength/5)*100}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs text-[var(--muted-text)]">{t('Confirm Password')}</label>
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                      <input type={showConfirmPwd?'text':'password'} className="flex-1 bg-transparent outline-none" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} placeholder={t('Confirm new password')} />
                      <button type="button" className="text-xs text-blue-600" onClick={()=>setShowConfirmPwd(v=>!v)}>{showConfirmPwd ? t('Hide') : t('Show')}</button>
                    </div>
                    {confirmPwd && confirmPwd !== newPwd && (
                      <div className="text-xs text-rose-600">{t("Passwords don't match")}</div>
                    )}
                  </div>
                </div>
                <div className="h-4" />
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
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--muted-text)]">{t('Language')}</label>
                    <select className="w-full px-3 py-2 rounded-lg border bg-gray-900/40 text-gray-100" value={lang} onChange={e=>setLang(e.target.value)}>
                      <option>English</option>
                      <option>Arabic</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--muted-text)]">{t('Time Zone')}</label>
                    <select className="w-full px-3 py-2 rounded-lg border bg-gray-900/40 text-gray-100" value={tz} onChange={e=>setTz(e.target.value)}>
                      <option>Africa/Cairo</option>
                      <option>Asia/Riyadh</option>
                      <option>Europe/London</option>
                      <option>UTC</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--muted-text)]">{t('Theme')}</label>
                    <select className="w-full px-3 py-2 rounded-lg border bg-gray-900/40 text-gray-100" value={theme} onChange={e=>setTheme(e.target.value)}>
                      <option>Dark</option>
                      <option>Light</option>
                      <option>Auto</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl p-4 border bg-white/60 dark:bg-gray-800/60">
                    <div className="text-sm font-medium mb-2">{t('Live Preview')}</div>
                    <div className={`rounded-lg h-24 flex items-center justify-center ${theme==='Dark'?'bg-gradient-to-r from-gray-800 to-gray-900 text-white':'bg-gradient-to-r from-gray-100 to-white text-gray-800'}`}>
                      {theme} Theme
                    </div>
                  </div>
                </div>
                <div className="h-4" />
              </div>
            )}

            {active === 'log' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--muted-text)]">{t('Start Date')}</label>
                    <input type="date" className="w-full px-3 py-2 rounded-lg border bg-white/90 dark:bg-gray-800/80" value={logFilterStart} onChange={e=>setLogFilterStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--muted-text)]">{t('End Date')}</label>
                    <input type="date" className="w-full px-3 py-2 rounded-lg border bg-white/90 dark:bg-gray-800/80" value={logFilterEnd} onChange={e=>setLogFilterEnd(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--muted-text)]">{t('Device')}</label>
                    <select className="w-full px-3 py-2 rounded-lg border bg-white/90 dark:bg-gray-800/80" value={logDevice} onChange={e=>setLogDevice(e.target.value)}>
                      <option>All</option>
                      <option>Chrome</option>
                      <option>Edge</option>
                      <option>Safari</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button className="px-4 py-2 rounded-lg border bg-white/70 dark:bg-gray-800/70" onClick={exportExcel}>{t('Download Excel')}</button>
                    <button className="px-4 py-2 rounded-lg border bg-white/70 dark:bg-gray-800/70" onClick={exportPDF}>{t('Download PDF')}</button>
                  </div>
                </div>
                <div className="h-2" />
                <div className="overflow-auto -mx-4">
                  <table className="nova-table w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="text-left text-gray-600 dark:text-gray-300">
                        <th className="py-2 px-4">{t('Date')}</th>
                        <th className="py-2 px-4">{t('Action')}</th>
                        <th className="py-2 px-4">{t('Device')}</th>
                        <th className="py-2 px-4">{t('Location')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-800 dark:text-gray-100">
                      <tr><td className="py-1" colSpan="4"></td></tr>
                      {filteredLogs.map((l, i) => (
                        <tr key={i} className="border-t border-gray-200 dark:border-gray-800 hover:bg-white/40 dark:hover:bg-gray-800/40">
                          <td className="py-2 px-4">{l.date}</td>
                          <td className="py-2 px-4">{l.action}</td>
                          <td className="py-2 px-4">{l.device}</td>
                          <td className="py-2 px-4">{l.location}</td>
                        </tr>
                      ))}
                      <tr><td className="py-1" colSpan="4"></td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="h-4" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/20 dark:border-gray-700 flex items-center justify-between">
            <div className="text-xs text-[var(--muted-text)]">{t('Last updated: 2 days ago')}</div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700" onClick={saveChanges}>{t('Save')}</button>
              <button className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600" onClick={onClose}>{t('Cancel')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
