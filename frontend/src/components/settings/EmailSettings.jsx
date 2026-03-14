import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSmtpSettings, updateSmtpSettings, testSmtpConnection } from '../../services/smtpService'
import { api } from '../../utils/api'
import { Globe, Server, User, Mail, Shield, Bell, Save, RefreshCw, Eye, EyeOff, Check, X, CheckCircle, Send, Lock, Loader2 } from 'lucide-react'

const Section = ({ title, icon, children, className = "" }) => (
  <div className={`glass-panel rounded-2xl p-6 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 ${className}`}>
    <div className="flex items-center gap-3 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
      <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">{icon}</span>
      <h3 className="text-lg font-semibold text-theme-text">{title}</h3>
    </div>
    {children}
  </div>
)

const PROVIDERS = {
  custom: { name: 'Custom SMTP', host: '', port: 587, encryption: 'TLS' },
  gmail: { name: 'Gmail', host: 'smtp.gmail.com', port: 587, encryption: 'TLS' },
  outlook: { name: 'Outlook / Office 365', host: 'smtp.office365.com', port: 587, encryption: 'TLS' },
  sendgrid: { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, encryption: 'TLS' },
  mailgun: { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, encryption: 'TLS' },
  zoho: { name: 'Zoho Mail', host: 'smtp.zoho.com', port: 465, encryption: 'SSL' },
}

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '')
const isValidHost = (v) => /^[a-zA-Z0-9.-]+$/.test(v || '') && (v || '').includes('.')
const isValidPort = (v) => Number(v) >= 1 && Number(v) <= 65535

export default function EmailSettings() {
  const { t } = useTranslation()
  
  const initial = {
    provider: 'custom',
    smtpHost: '',
    smtpPort: 587,
    encryption: 'TLS',
    username: '',
    password: '',
    apiKey: '',
    senderName: 'Tagen Hekaya CRM',
    senderEmail: '',
    replyToEmail: '',
    notifAdmin: '',
    notifSupport: '',
    notifSales: '',
    signatureHtml: 'Best Regards,<br><b>Besouhoula Team</b><br><a href="https://www.besouhoula.com">www.besouhoula.com</a>',
  }

  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [status, setStatus] = useState('')
  const [connectionSuccess, setConnectionSuccess] = useState(false)
  const [toast, setToast] = useState(null)
  const sigRef = useRef(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (data.provider === 'gmail') {
      checkGoogleStatus()
    }
  }, [data.provider])

  const checkGoogleStatus = async () => {
    try {
      const { data: res } = await api.get('/auth/google/status')
      if (res.connected) {
        setConnectionSuccess(true)
      }
    } catch (error) {
      console.error('Failed to check Google status:', error)
    }
  }

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const settings = await getSmtpSettings()
      if (settings) {
        // Map backend fields to frontend state
        setData(prev => ({
          ...prev,
          provider: settings.provider || 'custom',
          smtpHost: settings.host || '',
          smtpPort: settings.port || 587,
          encryption: settings.encryption || 'TLS',
          username: settings.username || '',
          password: '', // Don't populate password for security
          senderName: settings.from_name || '',
          senderEmail: settings.from_email || '',
          replyToEmail: settings.reply_to || '',
          signatureHtml: settings.signature || initial.signatureHtml,
          notifAdmin: settings.recipients_config?.admin || '',
          notifSupport: settings.recipients_config?.support || '',
          notifSales: settings.recipients_config?.sales || '',
        }))
      }
    } catch (error) {
      console.error('Failed to fetch SMTP settings:', error)
      // Fallback to local storage if API fails (optional, maybe better to show error)
      const saved = localStorage.getItem('email-settings')
      if (saved) {
        try { 
          const parsed = JSON.parse(saved)
          setData({ ...initial, ...parsed }) 
        } catch {}
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const onSave = () => saveAll()
    const onReset = () => resetDefaults()
    const onTestEmail = () => testEmail()
    window.addEventListener('save-email-settings', onSave)
    window.addEventListener('reset-email-settings', onReset)
    window.addEventListener('test-email-settings', onTestEmail)
    return () => {
      window.removeEventListener('save-email-settings', onSave)
      window.removeEventListener('reset-email-settings', onReset)
      window.removeEventListener('test-email-settings', onTestEmail)
    }
  }, [data])

  const saveAll = async () => {
    try {
      const payload = {
        provider: data.provider,
        host: data.smtpHost,
        port: data.smtpPort,
        encryption: data.encryption,
        username: data.username,
        password: data.password, // Only send if changed/provided
        from_name: data.senderName,
        from_email: data.senderEmail,
        reply_to: data.replyToEmail,
        signature: data.signatureHtml,
        recipients_config: {
          admin: data.notifAdmin,
          support: data.notifSupport,
          sales: data.notifSales
        }
      }

      await updateSmtpSettings(payload)
      
      // Also save to localStorage as backup/cache if needed, but API is primary now
      // localStorage.setItem('email-settings', JSON.stringify(data))
      
      setToast({ type: 'success', message: t('Settings saved successfully') })
    } catch (error) {
      console.error('Failed to save settings:', error)
      setToast({ type: 'error', message: t('Failed to save settings') })
    }
    setTimeout(() => setToast(null), 3000)
  }

  const resetDefaults = () => {
    if(window.confirm(t('Are you sure you want to reset all settings?'))) {
      setData(initial)
      setToast({ type: 'success', message: t('Settings reset to default') })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const setField = (key, value) => setData(prev => ({ ...prev, [key]: value }))

  const connectGoogle = async () => {
    try {
      setConnecting(true)
      // Save current provider selection first
      const currentSettings = {
        provider: 'gmail',
        host: data.smtpHost,
        port: data.smtpPort,
        encryption: data.encryption,
        username: data.username,
        from_name: data.senderName,
        from_email: data.senderEmail,
        reply_to: data.replyToEmail,
        signature: data.signatureHtml,
        recipients_config: {
            admin: data.notifAdmin,
            support: data.notifSupport,
            sales: data.notifSales
        }
      }
      await updateSmtpSettings(currentSettings)
      
      const { data: res } = await api.get('/auth/google/redirect', { params: { source: 'email_settings' } })
      if (res.url) {
        window.location.href = res.url
      } else {
        setToast({ type: 'error', message: t('Failed to get redirect URL') })
      }
    } catch (err) {
      console.error('Failed to start connection:', err)
      setToast({ type: 'error', message: err.response?.data?.message || t('Failed to start connection') })
      setConnecting(false)
    }
  }

  const handleProviderChange = (providerKey) => {
    const provider = PROVIDERS[providerKey]
    setData(prev => ({
      ...prev,
      provider: providerKey,
      smtpHost: provider.host,
      smtpPort: provider.port,
      encryption: provider.encryption
    }))
  }

  // Validation
  const hostError = useMemo(() => data.smtpHost && !isValidHost(data.smtpHost) ? t('Invalid SMTP host') : '', [data.smtpHost, t])
  const portError = useMemo(() => data.smtpPort && !isValidPort(data.smtpPort) ? t('Invalid SMTP port') : '', [data.smtpPort, t])
  const senderEmailError = useMemo(() => data.senderEmail && !isValidEmail(data.senderEmail) ? t('Invalid email') : '', [data.senderEmail, t])

  const testConnection = async () => {
    setStatus(t('Testing connection...'))
    setConnectionSuccess(false)
    
    try {
      const credentials = {
        host: data.smtpHost,
        port: data.smtpPort,
        encryption: data.encryption,
        username: data.username,
        password: data.password,
        from_email: data.senderEmail || 'test@example.com',
        from_name: data.senderName || 'Test'
      }

      await testSmtpConnection(credentials)
      
      setStatus(t('Connection successful'))
      setConnectionSuccess(true)
      setToast({ type: 'success', message: t('SMTP connection verified!') })
    } catch (error) {
      console.error('Connection test failed:', error)
      setStatus(t('Connection failed'))
      setConnectionSuccess(false)
      const msg = error.response?.data?.message || error.message || t('Please check your credentials and try again.')
      setToast({ type: 'error', message: msg })
    }
    
    // Don't clear status immediately if successful so the user can see it
    setTimeout(() => {
        if (!connectionSuccess) setStatus('')
    }, 5000)
    setTimeout(() => setToast(null), 3000)
  }

  const testEmail = async () => {
    // This could also use a backend endpoint if we want to actually send a test email to a specific address
    // For now, reusing testConnection or we could add a specific test-email endpoint
    // The user requirement was about handling errors in testConnection/testEmail
    
    setStatus(t('Sending test email...'))
    try {
        const credentials = {
            provider: data.provider,
            host: data.smtpHost,
            port: data.smtpPort,
            encryption: data.encryption,
            username: data.username,
            password: data.password,
            from_email: data.senderEmail,
            from_name: data.senderName
        }
        await testSmtpConnection(credentials) // Reuse connection test which sends an email
        setStatus(t('Email sent!'))
        setToast({ type: 'success', message: t('Test email sent successfully to ' + data.senderEmail) })
    } catch (error) {
        setStatus(t('Failed'))
        setToast({ type: 'error', message: t('Invalid sender email configuration.') })
    }
    setTimeout(() => setStatus(''), 3000)
    setTimeout(() => setToast(null), 3000)
  }

  // Signature Editor Helpers
  const applyFormat = (cmd, value = null) => {
    document.execCommand(cmd, false, value)
    if (sigRef.current) setField('signatureHtml', sigRef.current.innerHTML)
  }

  if (loading) {
    return <div className="p-8 text-center text-theme">{t('Loading settings...')}</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Service Provider Selection */}
      <Section title={t('Email Service Provider')} icon={<Globe className="w-5 h-5" />}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(PROVIDERS).map(([key, info]) => (
            <button
              key={key}
              onClick={() => handleProviderChange(key)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                data.provider === key
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-700/50'
              }`}
            >
              <div className="mb-2">
                {/* Icons placeholder - in real app use SVGs/Logos */}
                {key === 'gmail' ? <span className="text-2xl">M</span> :
                 key === 'outlook' ? <span className="text-2xl">O</span> :
                 key === 'custom' ? <Server className="w-6 h-6" /> :
                 <span className="text-xl font-bold">{info.name.charAt(0)}</span>}
              </div>
              <span className="text-sm font-medium text-center">{t(info.name)}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* 2. Connection Settings */}
      <Section title={t('Connection Settings')} icon={<Server className="w-5 h-5" />}>
        {data.provider === 'gmail' ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
              <span className="text-4xl">M</span>
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-semibold text-theme-text">{t('Connect with Google Workspace')}</h3>
              <p className="text-sm text-theme-text/70">
                {t('Connect your Gmail or Google Workspace account to send emails securely without sharing your password. We use OAuth 2.0 for maximum security.')}
              </p>
            </div>
            
            <button
              onClick={connectGoogle}
              disabled={connecting || connectionSuccess}
              className={`flex items-center gap-3 px-8 py-3 rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                connectionSuccess 
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/25' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
              }`}
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {t('Connecting...')}
                </>
              ) : connectionSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  {t('Connected with Google')}
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5" />
                  {t('Connect Google Account')}
                </>
              )}
            </button>
            
            <p className="text-xs text-theme-text/50 flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              {t('Your credentials are encrypted and secure')}
            </p>
          </div>
        ) : data.provider === 'outlook' ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
              <span className="text-4xl">O</span>
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-semibold text-theme-text">{t('Connect with Microsoft Outlook')}</h3>
              <p className="text-sm text-theme-text/70">
                {t('Connect your Outlook or Office 365 account to send emails securely using modern authentication.')}
              </p>
            </div>
            
            <button
              disabled
              className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 text-gray-400 px-8 py-3 rounded-xl font-medium cursor-not-allowed"
            >
              <RefreshCw className="w-5 h-5 animate-spin" />
              {t('Coming Soon')}
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Host & Port */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme mb-1">{t('SMTP Host')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={data.smtpHost}
                  onChange={e => setField('smtpHost', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 rounded-lg border text-white bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${hostError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                  placeholder="smtp.example.com"
                  disabled={data.provider !== 'custom'}
                />
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-theme" />
              </div>
              {hostError && <p className="mt-1 text-xs text-red-500">{hostError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme mb-1">{t('Port')}</label>
                <input
                  type="number"
                  value={data.smtpPort}
                  onChange={e => setField('smtpPort', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-white bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${portError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                  placeholder="587"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme mb-1">{t('Encryption')}</label>
                <select
                  value={data.encryption}
                  onChange={e => setField('encryption', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-white bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="TLS">TLS</option>
                  <option value="SSL">SSL</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme mb-1">
                {data.provider === 'sendgrid' ? t('API User (usually "apikey")') : t('Username / Email')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={data.username}
                  onChange={e => setField('username', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-white bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder={data.provider === 'sendgrid' ? 'apikey' : 'user@example.com'}
                />
                <User className="absolute left-3 top-2.5 w-4 h-4 text-theme" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme mb-1">
                {data.provider === 'sendgrid' ? t('API Key') : t('Password / App Password')}
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={data.password}
                  onChange={e => setField('password', e.target.value)}
                  className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-white bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••••••"
                />
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-theme" />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-2.5 text-theme hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPwd ? <span className="text-xs">{t('Hide')}</span> : <span className="text-xs">{t('Show')}</span>}
                </button>
              </div>
              {(data.provider === 'gmail' || data.provider === 'outlook') && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('Use an "App Password" generated in your account security settings, not your login password.')}
                </p>
              )}
            </div>
          </div>
        </div>
        )}

        <div className="mt-6 flex justify-end items-center gap-4">
           {connectionSuccess && (
              <span className="flex items-center gap-1 text-emerald-500 text-xs">
                 <CheckCircle className="w-3 h-3" />
                 {t('Connected Now')}
              </span>
           )}
           <button 
             onClick={testConnection}
             disabled={!!status && status !== t('Connection successful')}
             className="btn btn-glass flex items-center gap-2"
           >
             {status && status !== t('Connection successful') && status !== t('Connection failed') ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
             {t('Verify Connection')}
           </button>
        </div>
      </Section>

      {/* 3. Sender Identity */}
      <Section title={t('Sender Identity')} icon={<Shield className="w-5 h-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-theme mb-1">{t('Sender Name')}</label>
            <input
              type="text"
              value={data.senderName}
              onChange={e => setField('senderName', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-white bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. Support Team"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme mb-1">{t('Sender Email')}</label>
            <input
              type="email"
              value={data.senderEmail}
              onChange={e => setField('senderEmail', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-white bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none ${senderEmailError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
              placeholder="e.g. support@company.com"
            />
          </div>
        </div>
      </Section>

      {/* 4. Signature */}
      <Section title={t('Email Signature')} icon={<Mail className="w-5 h-5" />}>
        <div className="space-y-2">
           <div className="flex gap-2 mb-2">
             <button onClick={() => applyFormat('bold')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">B</button>
             <button onClick={() => applyFormat('italic')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 italic">I</button>
             <button onClick={() => applyFormat('underline')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 underline">U</button>
           </div>
           <div
            ref={sigRef}
            className="w-full min-h-[120px] p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-white bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none overflow-y-auto"
            contentEditable
            onBlur={e => setField('signatureHtml', e.currentTarget.innerHTML)}
            dangerouslySetInnerHTML={{ __html: data.signatureHtml }}
           />
           <p className="text-xs text-theme">{t('This signature will be appended to all outgoing emails.')}</p>
        </div>
      </Section>

      {/* 5. Notifications (Simplified) */}
      <Section title={t('Notification Recipients')} icon={<User className="w-5 h-5" />}>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
               <label className="text-xs font-semibold uppercase text-theme mb-1 block">{t('Admin Alerts')}</label>
               <input 
                 value={data.notifAdmin} 
                 onChange={e => setField('notifAdmin', e.target.value)}
                 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-white bg-gray-900 text-sm"
                 placeholder="admin@example.com"
               />
            </div>
            <div>
               <label className="text-xs font-semibold uppercase text-theme mb-1 block">{t('Support Alerts')}</label>
               <input 
                 value={data.notifSupport} 
                 onChange={e => setField('notifSupport', e.target.value)}
                 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-white bg-gray-900 text-sm"
                 placeholder="support@example.com"
               />
            </div>
            <div>
               <label className="text-xs font-semibold uppercase text-theme mb-1 block">{t('Sales Alerts')}</label>
               <input 
                 value={data.notifSales} 
                 onChange={e => setField('notifSales', e.target.value)}
                 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-white bg-gray-900 text-sm"
                 placeholder="sales@example.com"
               />
            </div>
         </div>
      </Section>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button 
          onClick={saveAll}
          className="btn btn-primary flex items-center gap-2 px-6"
        >
          <CheckCircle className="w-4 h-4" />
          {t('Save Configuration')}
        </button>
        <button 
          onClick={testEmail}
          className="btn btn-glass flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {t('Send Test Email')}
        </button>
        <div className="flex-grow"></div>
        <button 
          onClick={resetDefaults}
          className="text-red-500 hover:text-red-600 text-sm font-medium"
        >
          {t('Reset to Defaults')}
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[10000] px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
