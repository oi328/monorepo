import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@shared/context/AppStateProvider'
import { api } from '@utils/api'

const Modal = ({ open, title, children, onClose, onConfirm, confirmText = 'Confirm' }) => {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[1001] w-[92vw] max-w-[560px]">
        <div className="glass-panel rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/20 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button className="btn btn-glass" onClick={onClose}>✖️</button>
          </div>
          <div className="p-5 space-y-4">{children}</div>
          <div className="px-5 py-4 border-t border-white/20 dark:border-gray-700 flex items-center justify-end gap-3">
            <button className="btn btn-glass" onClick={onClose}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={onConfirm}>{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const SecuritySettings = () => {
  const { t } = useTranslation()
  const { crmSettings } = useAppState()
  const canUse2FA = crmSettings?.enableTwoFactorAuth !== false
  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [twoFactor, setTwoFactor] = useState(true)
  const [twoFactorMethod, setTwoFactorMethod] = useState('email')
  const [openSetup2FA, setOpenSetup2FA] = useState(false)
  const [available2fa, setAvailable2fa] = useState({ email: true, sms: true, app: true })

  // Ensure selected method remains valid if availability changes
  useEffect(() => {
    if (!available2fa[twoFactorMethod]) {
      const next = available2fa.email ? 'email' : available2fa.sms ? 'sms' : available2fa.app ? 'app' : 'email'
      setTwoFactorMethod(next)
    }
  }, [available2fa, twoFactorMethod])

  // Load saved settings (default 2FA enabled if empty)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('securitySettings')
      if (raw) {
        const s = JSON.parse(raw)
        if (typeof s.twoFactor === 'boolean') setTwoFactor(s.twoFactor)
        if (s.twoFactorMethod) setTwoFactorMethod(s.twoFactorMethod)
        if (s.available2fa) setAvailable2fa(s.available2fa)
      }
    } catch {}
  }, [])

  const pwdStrength = useMemo(() => {
    let s = 0
    if (newPwd.length >= 8) s++
    if (/[A-Z]/.test(newPwd)) s++
    if (/[a-z]/.test(newPwd)) s++
    if (/[0-9]/.test(newPwd)) s++
    if (/[^A-Za-z0-9]/.test(newPwd)) s++
    return s
  }, [newPwd])

  const [roles] = useState([{ name: 'Admin' }, { name: 'Sales' }])
  const [permissions, setPermissions] = useState({
    viewCustomers: true,
    editCustomers: false,
    manageUsers: false,
    viewBilling: true,
  })
  const [openEditPerms, setOpenEditPerms] = useState(false)

  const [sessions, setSessions] = useState([
    { id: 1, device: 'Windows PC', location: 'Cairo, EG', lastActive: '2025-11-10 12:33' },
    { id: 2, device: 'iPhone 15', location: 'Giza, EG', lastActive: '2025-11-11 08:21' },
  ])
  const [sessionToLogout, setSessionToLogout] = useState(null)

  const [notifNewDevice, setNotifNewDevice] = useState(true)
  const [notifPwdChange, setNotifPwdChange] = useState(true)
  const [notifFailedLogins, setNotifFailedLogins] = useState(true)
  const [notifMethod, setNotifMethod] = useState('email')

  const [minLength, setMinLength] = useState(8)
  const [reqUpper, setReqUpper] = useState(true)
  const [reqLower, setReqLower] = useState(true)
  const [reqNumber, setReqNumber] = useState(true)
  const [reqSpecial, setReqSpecial] = useState(false)
  const [failedLimit, setFailedLimit] = useState(5)
  const [temporaryLockout, setTemporaryLockout] = useState(true)

  const [auditLogs, setAuditLogs] = useState([
    { id: 'a1', action: 'Password Change', by: 'John Doe', at: '2025-11-10 09:20' },
    { id: 'a2', action: '2FA Enabled', by: 'John Doe', at: '2025-11-10 09:25' },
    { id: 'a3', action: 'Permissions Updated', by: 'Admin', at: '2025-11-11 15:12' },
  ])

  const saveAll = async () => {
    const payload = {
      twoFactor,
      twoFactorMethod,
      available2fa,
      notifications: { notifNewDevice, notifPwdChange, notifFailedLogins, notifMethod },
      policies: { minLength, reqUpper, reqLower, reqNumber, reqSpecial, failedLimit, temporaryLockout },
    }
    try {
      window.localStorage.setItem('securitySettings', JSON.stringify(payload))
      const security_settings = JSON.stringify({ two_factor_auth: !!twoFactor, method: twoFactorMethod })
      await api.post('/api/profile', { security_settings })
    } catch {}
  }

  const confirmLogoutSession = () => {
    if (!sessionToLogout) return
    setSessions(prev => prev.filter(s => s.id !== sessionToLogout.id))
    setSessionToLogout(null)
  }

  const logoutAll = () => {
    setSessions([])
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('security.passwordAuth')}</h3>
              <button className="btn btn-primary" onClick={saveAll}>{t('security.save')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">{t('security.currentPassword')}</label>
                <input type="password" className="input-soft w-full" placeholder={t('security.currentPassword')} value={curPwd} onChange={e=>setCurPwd(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('security.newPassword')}</label>
                <input type="password" className="input-soft w-full border-gray-700/60" placeholder={t('security.newPassword')} value={newPwd} onChange={e=>setNewPwd(e.target.value)} />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mt-2">
                  <div className={`h-2 transition-all ${pwdStrength<=2?'bg-red-500':pwdStrength===3?'bg-yellow-500':'bg-emerald-500'}`} style={{ width: `${(pwdStrength/5)*100}%` }} />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">{t('security.confirmPassword')}</label>
                <input type="password" className="input-soft w-full border-gray-700/60" placeholder={t('security.confirmPassword')} value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} />
                {confirmPwd && confirmPwd !== newPwd && (
                  <div className="text-xs text-rose-600 mt-1">{t('security.passwordMismatch')}</div>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                <span className="text-sm">{t('security.twoFactor')}</span>
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="hidden border-gray-700/60" disabled={!canUse2FA} checked={twoFactor} onChange={e=>setTwoFactor(e.target.checked)} />
                  <span className={`w-10 h-6 rounded-full p-1 ${twoFactor?'bg-emerald-500':'bg-gray-400'} ${!canUse2FA?'opacity-50':''} transition-all`}>
                    <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${twoFactor?'translate-x-4':'translate-x-0'}`} />
                  </span>
                </label>
              </div>
              {!canUse2FA && (
                <div className="md:col-span-2 p-3 rounded-lg border bg-white/70 dark:bg-gray-800/70">
                  <div className="text-sm">{t('security.enableNotice')}</div>
                </div>
              )}
              {canUse2FA && !twoFactor && (
                <div className="md:col-span-2 p-3 rounded-lg border bg-white/70 dark:bg-gray-800/70">
                  <div className="text-sm">{t('security.enableNotice')}</div>
                </div>
              )}
              {canUse2FA && twoFactor && (
                <div className="p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                  <div className="text-sm mb-2">{t('security.defaultMethod')}</div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="twofactor" disabled={!available2fa.email} checked={twoFactorMethod==='email'} onChange={()=>setTwoFactorMethod('email')} /> {t('security.emailOtp')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="twofactor" disabled={!available2fa.sms} checked={twoFactorMethod==='sms'} onChange={()=>setTwoFactorMethod('sms')} /> {t('security.sms')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="twofactor" disabled={!available2fa.app} checked={twoFactorMethod==='app'} onChange={()=>setTwoFactorMethod('app')} /> {t('security.app')}
                    </label>
                  </div>
                </div>
              )}
              {canUse2FA && twoFactor && (
                <div className="p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                  <div className="text-sm mb-2">{t('security.enableMethods')}</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={available2fa.email} onChange={e=>setAvailable2fa(p=>({ ...p, email: e.target.checked }))} /> {t('security.emailOtp')}</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={available2fa.sms} onChange={e=>setAvailable2fa(p=>({ ...p, sms: e.target.checked }))} /> {t('security.sms')}</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={available2fa.app} onChange={e=>setAvailable2fa(p=>({ ...p, app: e.target.checked }))} /> {t('security.app')}</label>
                  </div>
                  <div className="text-xs text-[var(--muted-text)] mt-1">{t('security.enableNotice')}</div>
                </div>
              )}
              <div className="md:col-span-3 flex items-center justify-end">
                <button className="btn btn-primary" disabled={!canUse2FA || !twoFactor} onClick={()=>setOpenSetup2FA(true)}>{t('security.setup2fa')}</button>
              </div>
            </div>
          </div>
          <div className="h-6 md:h-8" aria-hidden="true" />
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{t('security.accountAccess')}</h3>
                <button className="btn btn-glass" onClick={()=>setOpenEditPerms(true)}>{t('security.editPermissions')}</button>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {roles.map(r => (
                  <span key={r.name} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-gray-800 dark:text-blue-400 border border-blue-100 dark:border-gray-700 text-xs">{r.name}</span>
                ))}
              </div>
              <div className="text-sm font-medium mb-2">{t('security.activeSessions')}</div>
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="px-4 py-3 text-left">{t('security.device')}</th>
                    <th className="px-4 py-3 text-left">{t('security.location')}</th>
                    <th className="px-4 py-3 text-left">{t('security.lastActive')}</th>
                    <th className="px-4 py-3 text-left">{t('security.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-center text-gray-500" colSpan={4}>{t('security.noSessions')}</td>
                    </tr>
                  ) : sessions.map(s => (
                    <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-2">{s.device}</td>
                      <td className="px-4 py-2">{s.location}</td>
                      <td className="px-4 py-2">{s.lastActive}</td>
                      <td className="px-4 py-2">
                        <button className="btn btn-danger btn-sm" onClick={()=>setSessionToLogout(s)}>{t('security.logout')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-end">
                <button className="btn btn-danger" onClick={logoutAll}>{t('security.logoutAll')}</button>
              </div>
            </div>
          </div>
          <div className="h-6 md:h-8" aria-hidden="true" />
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">{t('security.securityNotifications')}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                <span className="text-sm">{t('security.loginNewDevice')}</span>
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="hidden" checked={notifNewDevice} onChange={e=>setNotifNewDevice(e.target.checked)} />
                  <span className={`w-10 h-6 rounded-full p-1 ${notifNewDevice?'bg-emerald-500':'bg-gray-400'} transition-all`}>
                    <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${notifNewDevice?'translate-x-4':'translate-x-0'}`} />
                  </span>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                <span className="text-sm">{t('security.passwordChange')}</span>
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="hidden" checked={notifPwdChange} onChange={e=>setNotifPwdChange(e.target.checked)} />
                  <span className={`w-10 h-6 rounded-full p-1 ${notifPwdChange?'bg-emerald-500':'bg-gray-400'} transition-all`}>
                    <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${notifPwdChange?'translate-x-4':'translate-x-0'}`} />
                  </span>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                <span className="text-sm">{t('security.failedLogins')}</span>
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="hidden" checked={notifFailedLogins} onChange={e=>setNotifFailedLogins(e.target.checked)} />
                  <span className={`w-10 h-6 rounded-full p-1 ${notifFailedLogins?'bg-emerald-500':'bg-gray-400'} transition-all`}>
                    <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${notifFailedLogins?'translate-x-4':'translate-x-0'}`} />
                  </span>
                </label>
              </div>
              <div className="p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                <div className="text-sm mb-2">{t('security.notificationMethod')}</div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm"><input type="radio" name="notif" checked={notifMethod==='email'} onChange={()=>setNotifMethod('email')} /> Email</label>
                  <label className="flex items-center gap-2 text-sm"><input type="radio" name="notif" checked={notifMethod==='sms'} onChange={()=>setNotifMethod('sms')} /> {t('security.sms')}</label>
                  <label className="flex items-center gap-2 text-sm"><input type="radio" name="notif" checked={notifMethod==='push'} onChange={()=>setNotifMethod('push')} /> {t('security.push')}</label>
                </div>
              </div>
            </div>
          </div>
          <div className="h-6 md:h-8" aria-hidden="true" />
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">{t('security.policies')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">{t('security.minLength')}</label>
                <input type="number" min={4} className="input-soft w-full" value={minLength} onChange={e=>setMinLength(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('security.failedLimit')}</label>
                <input type="number" min={1} className="input-soft w-full" value={failedLimit} onChange={e=>setFailedLimit(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2 p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                <div className="text-sm font-medium">{t('security.charReq')}</div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reqUpper} onChange={e=>setReqUpper(e.target.checked)} /> {t('security.upper')}</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reqLower} onChange={e=>setReqLower(e.target.checked)} /> {t('security.lower')}</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reqNumber} onChange={e=>setReqNumber(e.target.checked)} /> {t('security.number')}</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reqSpecial} onChange={e=>setReqSpecial(e.target.checked)} /> {t('security.special')}</label>
              </div>
              <div className="space-y-2 p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80">
                <div className="text-sm font-medium">{t('security.lockoutPolicy')}</div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={temporaryLockout} onChange={e=>setTemporaryLockout(e.target.checked)} /> {t('security.tempLockout')}</label>
                <div className="text-xs text-[var(--muted-text)]">{t('security.lockoutNote')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">{t('security.auditLogs')}</h3>
            <div className="space-y-2">
              {auditLogs.map(l => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-400 flex items-center justify-center">🔒</span>
                    <div>
                      <div className="text-sm font-medium">{l.action}</div>
                      <div className="text-xs text-[var(--muted-text)]">{l.at}</div>
                    </div>
                  </div>
                  <div className="text-xs">{l.by}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={openSetup2FA}
        title={t('security.modal.setupTitle')}
        onClose={()=>setOpenSetup2FA(false)}
        onConfirm={()=>{ setOpenSetup2FA(false); setTwoFactor(true); setAuditLogs(prev=>[{ id: Math.random().toString(36).slice(2), action: '2FA Setup', by: 'You', at: new Date().toLocaleString() }, ...prev]) }}
        confirmText={t('security.setup2fa')}
      >
        <div className="space-y-3">
          <div className="text-sm">{t('security.modal.setupHelp')}</div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="twofactor-modal" checked={twoFactorMethod==='email'} onChange={()=>setTwoFactorMethod('email')} /> {t('security.emailOtp')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="twofactor-modal" checked={twoFactorMethod==='sms'} onChange={()=>setTwoFactorMethod('sms')} /> {t('security.sms')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="twofactor-modal" checked={twoFactorMethod==='app'} onChange={()=>setTwoFactorMethod('app')} /> {t('security.app')}</label>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!sessionToLogout}
        title={t('security.modal.logoutTitle')}
        onClose={()=>setSessionToLogout(null)}
        onConfirm={confirmLogoutSession}
        confirmText={t('security.logout')}
      >
        <div className="text-sm">{t('security.modal.logoutDesc')}</div>
      </Modal>

      <Modal
        open={openEditPerms}
        title={t('security.modal.editPermsTitle')}
        onClose={()=>setOpenEditPerms(false)}
        onConfirm={()=>{ setOpenEditPerms(false); setAuditLogs(prev=>[{ id: Math.random().toString(36).slice(2), action: 'Permissions Updated', by: 'You', at: new Date().toLocaleString() }, ...prev]) }}
        confirmText={t('common.save')}
      >
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={permissions.viewCustomers} onChange={e=>setPermissions(p=>({ ...p, viewCustomers: e.target.checked }))} /> {t('security.perms.viewCustomers')}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={permissions.editCustomers} onChange={e=>setPermissions(p=>({ ...p, editCustomers: e.target.checked }))} /> {t('security.perms.editCustomers')}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={permissions.manageUsers} onChange={e=>setPermissions(p=>({ ...p, manageUsers: e.target.checked }))} /> {t('security.perms.manageUsers')}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={permissions.viewBilling} onChange={e=>setPermissions(p=>({ ...p, viewBilling: e.target.checked }))} /> {t('security.perms.viewBilling')}</label>
        </div>
      </Modal>
    </div>
  )
}

export default SecuritySettings
