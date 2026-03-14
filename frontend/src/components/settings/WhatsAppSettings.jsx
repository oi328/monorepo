import { useEffect, useMemo, useState } from 'react'
import { 
  getWhatsappSettings, 
  updateWhatsappSettings, 
  getWhatsappTemplates, 
  createWhatsappTemplate, 
  updateWhatsappTemplate, 
  deleteWhatsappTemplate,
  getWhatsappMessages 
} from '../../services/whatsappService'

const Modal = ({ open, title, children, onClose, onConfirm, confirmText = 'Confirm' }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="btn btn-glass" onClick={onClose}>Cancel</button>
        </div>
        <div>{children}</div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button className="btn btn-glass" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

const WaIcon = () => (<span role="img" aria-label="WhatsApp">🟢</span>)
const SendIcon = () => (<span role="img" aria-label="Send">✈️</span>)
const RefreshIcon = () => (<span role="img" aria-label="Refresh">🔄</span>)

export default function WhatsAppSettings() {
  // Integration setup state
  const [provider, setProvider] = useState('Meta API')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [connStatus, setConnStatus] = useState('disconnected') // disconnected | connected | failed
  const [connMessage, setConnMessage] = useState('')
  const [monthlyCount, setMonthlyCount] = useState(0)

  // Templates
  const [templates, setTemplates] = useState([
    { id: 'wa-otp', name: 'OTP Auth', category: 'Authentication', language: 'en', status: 'Approved', body: 'Hi {{name}}, your WhatsApp verification code is {{otp}}.' },
    { id: 'wa-pay', name: 'Payment Confirmation', category: 'Utility', language: 'en', status: 'Pending', body: 'Dear {{name}}, we received {{amount}} on {{date}}.' },
    { id: 'wa-promo', name: 'Promo Offer', category: 'Marketing', language: 'en', status: 'Rejected', body: 'Hi {{name}}, check our new offers today!' },
  ])
  const [openTplModal, setOpenTplModal] = useState(false)
  const [editingTpl, setEditingTpl] = useState(null)
  const [tplName, setTplName] = useState('')
  const [tplCategory, setTplCategory] = useState('Marketing')
  const [tplLanguage, setTplLanguage] = useState('en')
  const [tplBody, setTplBody] = useState('')

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState({ open: false, tpl: null })

  // Triggers
  const [triggers, setTriggers] = useState({
    registration: { enabled: true, template: 'wa-otp' },
    payment: { enabled: true, template: 'wa-pay' },
    expiry: { enabled: false, template: 'wa-promo' },
    newNote: { enabled: false, template: 'wa-promo' },
  })

  // Test message
  const [testNumber, setTestNumber] = useState('')
  const [testTemplate, setTestTemplate] = useState('wa-otp')
  const [testAlert, setTestAlert] = useState(null) // { type, message }

  // Logs
  const [logs, setLogs] = useState([])
  const [recipientQuery, setRecipientQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 5

  // Auto replies (optional)
  const [autoReplies, setAutoReplies] = useState([
    { id: 'ar-hello', keyword: 'hello', message: 'Hello! How can we help you?', status: 'Active' },
  ])
  const [openARModal, setOpenARModal] = useState(false)
  const [editingAR, setEditingAR] = useState(null)
  const [arKeyword, setArKeyword] = useState('')
  const [arMessage, setArMessage] = useState('')
  const [arStatus, setArStatus] = useState('Active')

  // Toast
  const [toast, setToast] = useState(null)

  // Load from API
  useEffect(() => {
    fetchSettings()
    fetchTemplates()
    fetchMessages()
  }, [])

  const fetchSettings = async () => {
    try {
      const s = await getWhatsappSettings()
      if (s) {
        setProvider(s.provider || 'Meta API')
        setApiKey(s.api_key || '')
        setApiSecret(s.api_secret || '')
        setBusinessNumber(s.business_number || '')
        setBusinessId(s.business_id || '')
        setWebhookUrl(s.webhook_url || '')
        setConnStatus(s.status ? 'connected' : 'disconnected')
        // setMonthlyCount(s.monthlyCount || 0) // Not in backend yet
        if (s.triggers) setTriggers(s.triggers)
        if (s.auto_replies) setAutoReplies(s.auto_replies)
      }
    } catch (error) {
      console.error('Failed to fetch WhatsApp settings:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const tpls = await getWhatsappTemplates()
      if (Array.isArray(tpls)) {
        setTemplates(tpls.map(t => ({
          ...t,
          updatedAt: new Date(t.updated_at).toLocaleString()
        })))
      }
    } catch (error) {
      console.error('Failed to fetch WhatsApp templates:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      const items = await getWhatsappMessages()
      const mapped = items.map(m => ({
        id: m.id,
        recipient: m?.direction === 'outbound' ? (m?.to || '') : (m?.from || ''),
        template: m?.type || 'message',
        status: (m?.status === 'accepted' ? 'Delivered' : m?.status === 'received' ? 'Read' : 'Failed'),
        at: new Date(m?.created_at || Date.now()).toLocaleString(),
      }))
      setLogs(mapped)
    } catch (error) {
      console.error('Failed to fetch WhatsApp messages:', error)
    }
  }

  const saveAll = async () => {
    const payload = {
      provider, 
      api_key: apiKey, 
      api_secret: apiSecret, 
      business_number: businessNumber, 
      business_id: businessId, 
      webhook_url: webhookUrl,
      status: connStatus === 'connected', 
      // monthlyCount, 
      triggers, 
      auto_replies: autoReplies,
    }
    
    try {
      await updateWhatsappSettings(payload)
      setToast({ type: 'success', message: 'Settings saved.' })
      setTimeout(() => setToast(null), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setToast({ type: 'error', message: 'Failed to save settings.' })
      setTimeout(() => setToast(null), 2000)
    }
  }

  // Listen for header save event
  useEffect(() => {
    const handler = () => saveAll()
    window.addEventListener('save-wa-settings', handler)
    return () => window.removeEventListener('save-wa-settings', handler)
  }, [saveAll]) // Added dependency

  const testConnection = () => {
    const ok = provider && apiKey && apiSecret && businessNumber
    setConnStatus(ok ? 'connected' : 'failed')
    setConnMessage(ok ? 'Connected to WhatsApp API.' : 'Failed to connect. Check inputs.')
    if (ok) setMonthlyCount(c => c + 1)
    setTimeout(() => setConnMessage(''), 3500)
  }

  const openAddTemplate = () => {
    setEditingTpl(null); setTplName(''); setTplCategory('Marketing'); setTplLanguage('en'); setTplBody(''); setOpenTplModal(true)
  }
  const openEditTemplate = (tpl) => {
    setEditingTpl(tpl); setTplName(tpl.name); setTplCategory(tpl.category); setTplLanguage(tpl.language); setTplBody(tpl.body); setOpenTplModal(true)
  }
  const saveTemplate = async () => {
    const name = tplName.trim(); const body = tplBody.trim()
    if (!name || !body) { setToast({ type:'error', message:'Please fill all fields.' }); setTimeout(()=>setToast(null),2000); return }
    
    try {
      const templateData = {
        name,
        category: tplCategory,
        language: tplLanguage,
        body,
        status: 'Active' // Default
      }

      if (editingTpl) {
        await updateWhatsappTemplate(editingTpl.id, templateData)
        setToast({ type:'success', message:'Template updated.' })
      } else {
        await createWhatsappTemplate(templateData)
        setToast({ type:'success', message:'Template added.' })
      }
      
      await fetchTemplates()
      setOpenTplModal(false)
      setTimeout(()=>setToast(null),2000)
    } catch (error) {
      console.error('Failed to save template:', error)
      setToast({ type:'error', message:'Failed to save template.' })
      setTimeout(()=>setToast(null),2000)
    }
  }
  const requestDeleteTemplate = (tpl) => setConfirmDelete({ open:true, tpl })
  const confirmDeleteTemplate = async () => {
    const tpl = confirmDelete.tpl
    try {
      await deleteWhatsappTemplate(tpl.id)
      await fetchTemplates()
      setConfirmDelete({ open:false, tpl:null })
      setToast({ type:'success', message:'Template deleted.' })
      setTimeout(()=>setToast(null),2000)
    } catch (error) {
      console.error('Failed to delete template:', error)
      setToast({ type:'error', message:'Failed to delete template.' })
      setTimeout(()=>setToast(null),2000)
    }
  }

  const toggleTrigger = (key, enabled) => setTriggers(prev => ({ ...prev, [key]: { ...prev[key], enabled } }))
  const setTriggerTemplate = (key, tplId) => setTriggers(prev => ({ ...prev, [key]: { ...prev[key], template: tplId } }))

  const sendTestMessage = () => {
    const tpl = templates.find(t => t.id === testTemplate)
    const ok = !!tpl && !!testNumber && connStatus === 'connected'
    const status = ok ? 'Sent' : 'Failed'
    setTestAlert({ type: ok ? 'success' : 'failed', message: ok ? 'Test message sent.' : 'Failed to send.' })
    setLogs(prev => [{ id: Math.random().toString(36).slice(2), recipient: testNumber || 'N/A', template: tpl?.name || 'N/A', status: ok ? 'Delivered' : 'Failed', at: new Date().toLocaleString() }, ...prev])
    setTimeout(() => setTestAlert(null), 3000)
  }

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const byRecipient = !recipientQuery || l.recipient.toLowerCase().includes(recipientQuery.trim().toLowerCase())
      const byStatus = statusFilter === 'All' || l.status === statusFilter
      const byDateStart = !dateStart || new Date(l.at) >= new Date(dateStart)
      const byDateEnd = !dateEnd || new Date(l.at) <= new Date(dateEnd)
      return byRecipient && byStatus && byDateStart && byDateEnd
    })
  }, [logs, recipientQuery, statusFilter, dateStart, dateEnd])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const pageItems = filteredLogs.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { if (page > totalPages) setPage(1) }, [totalPages, page])

  return (
    <div className="">
      {/* Connection Status */}
      <div className="glass-panel rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2"><WaIcon /><h3 className="text-lg font-semibold">WhatsApp Connection</h3></div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${connStatus==='connected'?'bg-emerald-100 text-emerald-700':connStatus==='failed'?'bg-rose-100 text-rose-700':'bg-gray-100 text-gray-700'}`}>{connStatus==='connected'?'Connected':connStatus==='failed'?'Disconnected':'Disconnected'}</div>
      </div>

      {/* Integration Setup */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><WaIcon /><h3 className="text-lg font-semibold">Integration Setup</h3></div>
          <button className="btn btn-primary" onClick={testConnection}><RefreshIcon /> Test Connection</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Provider</label>
            <select className="input-soft w-full" value={provider} onChange={e=>setProvider(e.target.value)}>
              <option>Meta API</option>
              <option>Twilio</option>
              <option>360Dialog</option>
              <option>WATI</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Business Number</label>
            <input className="input-soft w-full" value={businessNumber} onChange={e=>setBusinessNumber(e.target.value)} placeholder="e.g., +201234567890" />
          </div>
          <div>
            <label className="block text-sm mb-1">API Key</label>
            <input className="input-soft w-full" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="API Key" />
          </div>
          <div>
            <label className="block text-sm mb-1">API Secret</label>
            <input className="input-soft w-full" value={apiSecret} onChange={e=>setApiSecret(e.target.value)} placeholder="API Secret" />
          </div>
          <div>
            <label className="block text-sm mb-1">WhatsApp Business ID</label>
            <input className="input-soft w-full" value={businessId} onChange={e=>setBusinessId(e.target.value)} placeholder="Business ID" />
          </div>
          <div>
            <label className="block text-sm mb-1">Webhook URL</label>
            <input className="input-soft w-full" value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)} placeholder="https://example.com/webhook" />
          </div>
        </div>
        {connMessage && (
          <div className={`mt-4 text-sm px-3 py-2 rounded-md ${connStatus==='connected'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{connMessage}</div>
        )}
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* WhatsApp Templates */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">WhatsApp Templates</h3>
          <button className="btn btn-primary" onClick={openAddTemplate}>Add New Template</button>
        </div>
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-4 py-3 text-left">Template Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Language</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr><td className="px-4 py-4 text-center text-theme" colSpan={5}>No templates</td></tr>
              ) : templates.map(t => (
                <tr key={t.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{t.name}</td>
                  <td className="px-4 py-2">{t.category}</td>
                  <td className="px-4 py-2">{t.language}</td>
                  <td className={`px-4 py-2 font-medium ${t.status==='Approved'?'text-emerald-600':t.status==='Pending'?'text-amber-600':'text-rose-600'}`}>{t.status}</td>
                  <td className="px-4 py-2 flex items-center gap-1">
                    <button className="btn btn-glass btn-sm text-xs scale-90" onClick={()=>setTplBody(t.body)}><WaIcon /> Preview</button>
                    <button className="btn btn-danger btn-sm text-xs scale-90" onClick={()=>requestDeleteTemplate(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View for Templates */}
        <div className="md:hidden grid gap-4">
          {templates.length === 0 ? (
            <div className="text-center text-theme py-8 bg-transparent rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <p>No templates found</p>
            </div>
          ) : templates.map(t => (
            <div key={t.id} className="flex flex-col p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-base">{t.name}</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-medium text-theme">
                      {t.category}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase">
                      {t.language}
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  t.status==='Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                  t.status==='Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                }`}>
                  {t.status}
                </span>
              </div>
              
              <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <button 
                  onClick={() => setTplBody(t.body)}
                  className="flex-1 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <WaIcon /> Preview
                </button>
                <button 
                  onClick={() => requestDeleteTemplate(t)}
                  className="flex-1 py-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-medium hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* Message Triggers */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Message Triggers</h3>
          <div className="text-sm text-[var(--muted-text)]">Monthly messages: {monthlyCount}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key:'registration', label:'New Registration' },
            { key:'payment', label:'Payment Confirmation' },
            { key:'expiry', label:'Subscription Expiry' },
            { key:'newNote', label:'New Note Added' },
          ].map(item => (
            <div key={item.key} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{item.label}</div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!triggers[item.key]?.enabled} onChange={e=>toggleTrigger(item.key, e.target.checked)} /> Enable
                </label>
              </div>
              <div className="mt-3">
                <label className="block text-sm mb-1">Template</label>
                <select className="input-soft w-full" value={triggers[item.key]?.template} onChange={e=>setTriggerTemplate(item.key, e.target.value)}>
                  {templates.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* Test WhatsApp Message */}
      <div id="test-wa" className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><SendIcon /><h3 className="text-lg font-semibold">Test WhatsApp Message</h3></div>
          <button className="btn btn-primary" onClick={sendTestMessage}>Send Test Message</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Phone Number</label>
            <input className="input-soft w-full" value={testNumber} onChange={e=>setTestNumber(e.target.value)} placeholder="e.g., +201234567890" />
          </div>
          <div>
            <label className="block text-sm mb-1">Template</label>
            <select className="input-soft w-full" value={testTemplate} onChange={e=>setTestTemplate(e.target.value)}>
              {templates.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
        </div>
        {testAlert && (
          <div className={`mt-4 text-sm px-3 py-2 rounded-md ${testAlert.type==='success'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{testAlert.message}</div>
        )}
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* Logs */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><WaIcon /><h3 className="text-lg font-semibold">Logs</h3></div>
          <div className="flex items-center gap-2">
            <input className="input-soft" placeholder="Search recipient" value={recipientQuery} onChange={e=>setRecipientQuery(e.target.value)} />
            <select className="input-soft" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option>All</option>
              <option>Delivered</option>
              <option>Read</option>
              <option>Failed</option>
            </select>
            <input type="date" className="input-soft" value={dateStart} onChange={e=>setDateStart(e.target.value)} />
            <input type="date" className="input-soft" value={dateEnd} onChange={e=>setDateEnd(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-4 py-3 text-left">Recipient</th>
                <th className="px-4 py-3 text-left">Template</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td className="px-4 py-4 text-center text-gray-500" colSpan={4}>No logs found</td></tr>
              ) : pageItems.map(l => (
                <tr key={l.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{l.recipient}</td>
                  <td className="px-4 py-2">{l.template}</td>
                  <td className={`px-4 py-2 font-medium ${l.status==='Delivered'?'text-emerald-600':l.status==='Read'?'text-blue-600':'text-rose-600'}`}>{l.status}</td>
                  <td className="px-4 py-2">{l.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View for Logs */}
        <div className="md:hidden grid gap-4">
          {pageItems.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No logs found</div>
          ) : pageItems.map(l => (
            <div key={l.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-gray-500">{l.at}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  l.status==='Delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                  l.status==='Read' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                }`}>
                  {l.status}
                </span>
              </div>
              <div className="mb-2">
                <span className="text-sm font-semibold block">{l.recipient}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                <span className="opacity-70">Template:</span> <span className="text-gray-700 dark:text-gray-300 font-medium">{l.template}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-[var(--muted-text)]">Showing {pageItems.length} of {filteredLogs.length}</div>
          <div className="flex items-center gap-2">
            <button className="btn btn-glass btn-sm" disabled={page===1} onClick={()=>setPage(p=>Math.max(1, p-1))}>Prev</button>
            <button className="btn btn-glass btn-sm" disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages, p+1))}>Next</button>
          </div>
        </div>
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* Auto Replies (optional) */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Auto Replies</h3>
          <button className="btn btn-primary" onClick={()=>{ setEditingAR(null); setArKeyword(''); setArMessage(''); setArStatus('Active'); setOpenARModal(true) }}>Add New Auto Reply</button>
        </div>
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-4 py-3 text-left">Keyword</th>
                <th className="px-4 py-3 text-left">Auto Reply Message</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {autoReplies.length === 0 ? (
                <tr><td className="px-4 py-4 text-center text-gray-500" colSpan={4}>No auto replies</td></tr>
              ) : autoReplies.map(ar => (
                <tr key={ar.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{ar.keyword}</td>
                  <td className="px-4 py-2">{ar.message}</td>
                  <td className={`px-4 py-2 font-medium ${ar.status==='Active'?'text-emerald-600':'text-rose-600'}`}>{ar.status}</td>
                  <td className="px-4 py-2 flex items-center gap-1">
                    <button className="btn btn-glass btn-sm text-xs scale-90" onClick={()=>{ setEditingAR(ar); setArKeyword(ar.keyword); setArMessage(ar.message); setArStatus(ar.status); setOpenARModal(true) }}>Edit</button>
                    <button className="btn btn-danger btn-sm text-xs scale-90" onClick={()=>setAutoReplies(prev => prev.filter(x => x.id !== ar.id))}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View for Auto Replies */}
        <div className="md:hidden grid gap-4">
          {autoReplies.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No auto replies</div>
          ) : autoReplies.map(ar => (
            <div key={ar.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-base">{ar.keyword}</h4>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  ar.status==='Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                }`}>
                  {ar.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700 mb-3">
                {ar.message}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="flex-1 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={()=>{ setEditingAR(ar); setArKeyword(ar.keyword); setArMessage(ar.message); setArStatus(ar.status); setOpenARModal(true) }}
                >
                  Edit
                </button>
                <button 
                  className="flex-1 py-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                  onClick={()=>setAutoReplies(prev => prev.filter(x => x.id !== ar.id))}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <Modal open={openTplModal} title={editingTpl ? 'Edit Template' : 'Add New Template'} onClose={()=>setOpenTplModal(false)} onConfirm={saveTemplate} confirmText={editingTpl?'Save Template':'Save Template'}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Template Name</label>
            <input className="input-soft w-full" value={tplName} onChange={e=>setTplName(e.target.value)} placeholder="e.g., Payment Confirmation" />
          </div>
          <div>
            <label className="block text-sm mb-1">Category</label>
            <select className="input-soft w-full" value={tplCategory} onChange={e=>setTplCategory(e.target.value)}>
              <option>Marketing</option>
              <option>Utility</option>
              <option>Authentication</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Language</label>
            <select className="input-soft w-full" value={tplLanguage} onChange={e=>setTplLanguage(e.target.value)}>
              <option>en</option>
              <option>ar</option>
              <option>fr</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Body Message</label>
            <textarea className="input-soft w-full h-32" value={tplBody} onChange={e=>setTplBody(e.target.value)} placeholder="Hi {{name}}, your verification code is {{otp}}." />
            <div className="text-xs text-[var(--muted-text)] mt-1">Supports placeholders like {'{{name}}'}, {'{{amount}}'}, {'{{date}}'}, {'{{otp}}'}.</div>
          </div>
        </div>
      </Modal>

      <Modal open={confirmDelete.open} title={'Confirm Delete'} onClose={()=>setConfirmDelete({ open:false, tpl:null })} onConfirm={confirmDeleteTemplate} confirmText={'Delete'}>
        <p className="text-sm">Are you sure you want to delete template <span className="font-semibold">{confirmDelete.tpl?.name}</span>?</p>
      </Modal>

      <Modal open={openARModal} title={editingAR ? 'Edit Auto Reply' : 'Add New Auto Reply'} onClose={()=>setOpenARModal(false)} onConfirm={()=>{
        const keyword = arKeyword.trim(); const message = arMessage.trim(); if (!keyword || !message) { setToast({ type:'error', message:'Please fill all fields.' }); setTimeout(()=>setToast(null),2000); return }
        if (editingAR) {
          setAutoReplies(prev => prev.map(a => a.id === editingAR.id ? { ...a, keyword, message, status: arStatus } : a))
        } else {
          const id = 'ar-' + keyword.toLowerCase().replace(/\s+/g,'-') + '-' + Math.random().toString(36).slice(2)
          setAutoReplies(prev => [{ id, keyword, message, status: arStatus }, ...prev])
        }
        setOpenARModal(false); setToast({ type:'success', message:'Auto reply saved.' }); setTimeout(()=>setToast(null),2000)
      }} confirmText={editingAR?'Save':'Save'}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Keyword</label>
            <input className="input-soft w-full" value={arKeyword} onChange={e=>setArKeyword(e.target.value)} placeholder="e.g., hello" />
          </div>
          <div>
            <label className="block text-sm mb-1">Auto Reply Message</label>
            <textarea className="input-soft w-full h-28" value={arMessage} onChange={e=>setArMessage(e.target.value)} placeholder="Hello! How can we help you?" />
          </div>
          <div>
            <label className="block text-sm mb-1">Status</label>
            <select className="input-soft w-full" value={arStatus} onChange={e=>setArStatus(e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-lg shadow-lg ${toast.type==='success'?'bg-emerald-600 text-white':'bg-rose-600 text-white'}`}>{toast.message}</div>
      )}
    </div>
  )
}
