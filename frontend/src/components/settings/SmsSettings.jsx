import { useEffect, useMemo, useState } from 'react'
import {
  getSmsSettings,
  updateSmsSettings,
  testSmsSettings,
  getSmsTemplates,
  createSmsTemplate,
  updateSmsTemplate,
  deleteSmsTemplate
} from '../../services/smsService'

const PlaneIcon = () => <span role="img" aria-label="Send">✈️</span>
const PlugIcon = () => <span role="img" aria-label="Gateway">🔌</span>
const TemplateIcon = () => <span role="img" aria-label="Template">📄</span>
const LogsIcon = () => <span role="img" aria-label="Logs">📜</span>
const BalanceIcon = () => <span role="img" aria-label="Balance">💳</span>

const Modal = ({ open, title, children, onClose, onConfirm, confirmText = 'Save' }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[1001] w-[92vw] max-w-[640px]">
        <div className="glass-panel rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/20 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button className="btn btn-glass" onClick={onClose}>✖️</button>
          </div>
          <div className="p-5 space-y-4">{children}</div>
          <div className="px-5 py-4 border-t border-white/20 dark:border-gray-700 flex items-center justify-end gap-3">
            <button className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={onConfirm}>{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SmsSettings() {
  // Gateway configuration
  const [provider, setProvider] = useState('Twilio')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [senderId, setSenderId] = useState('')
  const [connStatus, setConnStatus] = useState('idle') // idle | success | failed
  const [connMessage, setConnMessage] = useState('')
  const [balance, setBalance] = useState(null) // number | null
  const [fieldErrors, setFieldErrors] = useState({})

  // Templates
  const [templates, setTemplates] = useState([
    { id: 'welcome', name: 'Welcome', description: 'User registration welcome message', body: 'Welcome, {{name}}! Your account has been created.', updatedAt: new Date().toLocaleString() },
    { id: 'payment', name: 'Payment Confirmation', description: 'Payment receipt confirmation', body: 'Hi {{name}}, your payment of {{amount}} was successful.', updatedAt: new Date().toLocaleString() },
  ])
  const [openTemplateModal, setOpenTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [tplName, setTplName] = useState('')
  const [tplBody, setTplBody] = useState('')

  // Notification triggers
  const [triggers, setTriggers] = useState({
    registration: true,
    payment: true,
    renewal: false,
    failedLogin: true,
  })
  const [selectedTriggers, setSelectedTriggers] = useState({
    registration: false,
    payment: false,
    renewal: false,
    failedLogin: false,
  })
  const [selectAll, setSelectAll] = useState(false)

  // Test SMS
  const [testNumber, setTestNumber] = useState('')
  const [testTemplate, setTestTemplate] = useState('welcome')
  const [testAlert, setTestAlert] = useState(null) // { type: 'success'|'failed', message: string }

  // Logs
  const [logs, setLogs] = useState([
    { id: 'l1', recipient: '+201234567890', template: 'Welcome', status: 'Delivered', at: new Date(Date.now()-86400000).toLocaleString() },
  ])
  const [statusFilter, setStatusFilter] = useState('All')
  const [recipientQuery, setRecipientQuery] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  // Load from API
  useEffect(() => {
    fetchSettings()
    fetchTemplates()
  }, [])

  const fetchSettings = async () => {
    try {
      const s = await getSmsSettings()
      if (s) {
        if (s.provider) setProvider(s.provider)
        if (s.api_key) setApiKey(s.api_key) // Backend uses api_key
        if (s.api_secret) setApiSecret(s.api_secret) // Backend uses api_secret
        if (s.sender_id) setSenderId(s.sender_id) // Backend uses sender_id
        if (s.triggers) setTriggers(s.triggers)
      }
    } catch (error) {
      console.error('Failed to fetch SMS settings:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const tpls = await getSmsTemplates()
      if (Array.isArray(tpls)) {
        setTemplates(tpls.map(t => ({
          ...t,
          description: t.body?.slice(0, 60) || '',
          updatedAt: new Date(t.updated_at).toLocaleString()
        })))
      }
    } catch (error) {
      console.error('Failed to fetch SMS templates:', error)
    }
  }

  useEffect(() => {
    // Simulate balance availability per provider
    if (['Twilio', 'Nexmo', 'MessageBird'].includes(provider)) {
      setBalance(250)
    } else {
      setBalance(null)
    }
  }, [provider])

  const saveAll = async () => {
    try {
      setFieldErrors({})
      const payload = {
        provider,
        api_key: apiKey,
        api_secret: apiSecret,
        sender_id: senderId,
        triggers,
        status: true
      }
      await updateSmsSettings(payload)
      setTestAlert({ type: 'success', message: 'Settings saved successfully.' })
      setTimeout(() => setTestAlert(null), 2500)
    } catch (error) {
      console.error('Failed to save settings:', error)
      if (error?.response?.status === 422 && error.response.data?.errors) {
        setFieldErrors(error.response.data.errors || {})
      }
      const msg = error?.response?.data?.message || 'Failed to save settings.'
      setTestAlert({ type: 'failed', message: msg })
    }
  }

  // Listen for header save event
  useEffect(() => {
    const handler = () => saveAll()
    window.addEventListener('save-sms-settings', handler)
    return () => window.removeEventListener('save-sms-settings', handler)
  }, [saveAll])

  const testConnection = async () => {
    try {
      setFieldErrors({})
      const data = await testSmsSettings({
        provider,
        api_key: apiKey,
        api_secret: apiSecret,
        sender_id: senderId,
      })
      setConnStatus('success')
      setConnMessage(data?.message || 'Connection established successfully')
    } catch (error) {
      setConnStatus('failed')
      if (error?.response?.status === 422 && error.response.data?.errors) {
        setFieldErrors(error.response.data.errors || {})
      }
      const msg = error?.response?.data?.message || 'Failed to establish connection. Please check your credentials.'
      setConnMessage(msg)
    }
    setTimeout(() => setConnMessage(''), 3000)
  }

  const openAddTemplate = () => {
    setEditingTemplate(null)
    setTplName('')
    setTplBody('')
    setOpenTemplateModal(true)
  }

  const openEditTemplate = (tpl) => {
    setEditingTemplate(tpl)
    setTplName(tpl.name)
    setTplBody(tpl.body)
    setOpenTemplateModal(true)
  }

  const saveTemplateModal = async () => {
    if (!tplName.trim() || !tplBody.trim()) return
    
    try {
      const templateData = {
        name: tplName.trim(),
        body: tplBody.trim(),
        type: 'general', // Default type
        status: true
      }

      if (editingTemplate) {
        await updateSmsTemplate(editingTemplate.id, templateData)
      } else {
        await createSmsTemplate(templateData)
      }
      
      await fetchTemplates()
      setOpenTemplateModal(false)
    } catch (error) {
      console.error('Failed to save template:', error)
    }
  }

  const deleteTemplate = async (tpl) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return
    try {
      await deleteSmsTemplate(tpl.id)
      await fetchTemplates()
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const toggleTrigger = (key, value) => setTriggers(prev => ({ ...prev, [key]: value }))
  const selectTrigger = (key, value) => setSelectedTriggers(prev => ({ ...prev, [key]: value }))

  const onSelectAll = (checked) => {
    setSelectAll(checked)
    setSelectedTriggers({ registration: checked, payment: checked, renewal: checked, failedLogin: checked })
  }

  const applyBulk = (enable) => {
    const keys = Object.entries(selectedTriggers).filter(([k,v]) => v).map(([k]) => k)
    if (!keys.length) return
    setTriggers(prev => {
      const next = { ...prev }
      keys.forEach(k => { next[k] = enable })
      return next
    })
  }

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (statusFilter !== 'All' && l.status !== statusFilter) return false
      if (recipientQuery && !l.recipient.toLowerCase().includes(recipientQuery.toLowerCase())) return false
      if (dateStart) {
        const startTs = new Date(dateStart).getTime()
        const lTs = new Date(l.at).getTime()
        if (lTs < startTs) return false
      }
      if (dateEnd) {
        const endTs = new Date(dateEnd).getTime()
        const lTs = new Date(l.at).getTime()
        if (lTs > endTs) return false
      }
      return true
    })
  }, [logs, statusFilter, recipientQuery, dateStart, dateEnd])

  const sendTestSms = () => {
    const tpl = templates.find(t => t.id === testTemplate)
    const ok = !!tpl && !!testNumber && connStatus === 'success'
    const status = ok ? 'Delivered' : 'Failed'
    setTestAlert({ type: ok ? 'success' : 'failed', message: ok ? 'Test SMS sent successfully.' : 'Failed to send SMS. Check connection and inputs.' })
    setLogs(prev => [{ id: Math.random().toString(36).slice(2), recipient: testNumber || 'N/A', template: tpl?.name || 'N/A', status, at: new Date().toLocaleString() }, ...prev])
    setTimeout(() => setTestAlert(null), 3500)
  }

  return (
    <div className="">
      {/* Gateway Configuration */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><PlugIcon /><h3 className="text-lg font-semibold">Gateway Configuration</h3></div>
          <button className="btn btn-primary" onClick={testConnection}>Test Connection</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-500" />
              <span>SMS Provider</span>
            </label>
            <select className="input-soft w-full" value={provider} onChange={e=>setProvider(e.target.value)}>
              <option>Twilio</option>
              <option>Nexmo</option>
              <option>MessageBird</option>
              <option>Other</option>
            </select>
            <p className="text-xs text-[var(--muted-text)] mt-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              <span>Choose your SMS gateway provider.</span>
            </p>
          </div>
          <div>
            <label className="block text-sm mb-1 flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-500" />
              <span>Sender ID</span>
            </label>
            <input
              className="input-soft w-full"
              value={senderId}
              onChange={e=>setSenderId(e.target.value)}
              placeholder="e.g., BESOUHOULA or +201234567890"
            />
            {fieldErrors.sender_id && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.sender_id[0]}</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-500" />
              <span>API Key</span>
            </label>
            <input
              className="input-soft w-full"
              value={apiKey}
              onChange={e=>setApiKey(e.target.value)}
              placeholder="e.g., ACxxxxxxxxxxxxxxxxxxxx"
            />
            {fieldErrors.api_key && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.api_key[0]}</p>
            )}
            <p className="text-xs text-[var(--muted-text)] mt-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              <span>Found in your SMS provider dashboard.</span>
            </p>
          </div>
          <div>
            <label className="block text-sm mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              <span>API Secret</span>
            </label>
            <input
              type="password"
              className="input-soft w-full"
              value={apiSecret}
              onChange={e=>setApiSecret(e.target.value)}
              placeholder="Your API secret/token"
            />
            {fieldErrors.api_secret && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.api_secret[0]}</p>
            )}
            <p className="text-xs text-[var(--muted-text)] mt-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              <span>Keep this secure. Do not share it publicly.</span>
            </p>
          </div>
        </div>
        {connMessage && (
          <div className={`mt-4 text-sm px-3 py-2 rounded-md ${connStatus==='success'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{connMessage}</div>
        )}
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* SMS Balance */}
      {balance !== null && (
        <>
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2"><BalanceIcon /><h3 className="text-lg font-semibold">SMS Balance</h3></div>
            <div className="text-2xl font-bold">{balance} credits</div>
            <div className="text-xs text-[var(--muted-text)] mt-1">Balance retrieval simulated based on provider.</div>
          </div>
          <div className="h-6 md:h-8" aria-hidden="true" />
        </>
      )}

      {/* Message Templates */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><TemplateIcon /><h3 className="text-lg font-semibold">Message Templates</h3></div>
          <button className="btn btn-primary" onClick={openAddTemplate}>Add New Template</button>
        </div>
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-4 py-3 text-left">Template Name</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Last Updated</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr><td className="px-4 py-4 text-center text-gray-500" colSpan={4}>No templates</td></tr>
              ) : templates.map(tpl => (
                <tr key={tpl.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{tpl.name}</td>
                  <td className="px-4 py-2">{tpl.description}</td>
                  <td className="px-4 py-2">{tpl.updatedAt}</td>
                  <td className="px-4 py-2 flex items-center gap-2">
                    <button className="btn btn-glass btn-sm" onClick={()=>openEditTemplate(tpl)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>deleteTemplate(tpl)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View for Templates */}
        <div className="md:hidden grid gap-4">
          {templates.length === 0 ? (
            <div className="text-theme py-8 bg-transparent rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <p>No templates found</p>
            </div>
          ) : templates.map(tpl => (
            <div key={tpl.id} className="flex flex-col p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-base">{tpl.name}</h4>
                  <span className="text-xs text-theme block mt-1">{tpl.updatedAt}</span>
                </div>
              </div>
              <div className="text-sm text-theme mb-4 line-clamp-2 bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                {tpl.description}
              </div>
              <div className="mt-auto flex gap-2">
                <button 
                  onClick={() => openEditTemplate(tpl)}
                  className="flex-1 py-2 px-3 rounded-lg bg-transparent text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => deleteTemplate(tpl)}
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

      {/* Notification Triggers */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Triggers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'registration', label: 'User Registration' },
            { key: 'payment', label: 'Payment Confirmation' },
            { key: 'renewal', label: 'Subscription Renewal' },
            { key: 'failedLogin', label: 'Failed Login Attempt' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedTriggers[item.key]} onChange={e=>selectTrigger(item.key, e.target.checked)} />
                <span className="text-sm">{item.label}</span>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input type="checkbox" className="hidden" checked={!!triggers[item.key]} onChange={e=>toggleTrigger(item.key, e.target.checked)} />
                <span className={`w-10 h-6 rounded-full p-1 ${triggers[item.key]?'bg-emerald-500':'bg-gray-400'} transition-all`}>
                  <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${triggers[item.key]?'translate-x-4':'translate-x-0'}`} />
                </span>
              </label>
            </div>
          ))}
        </div>
        <div className="h-4 md:h-6" aria-hidden="true" />
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectAll} onChange={e=>onSelectAll(e.target.checked)} /> Select All</label>
          <button className="btn btn-glass btn-sm" onClick={()=>applyBulk(true)}>Enable Selected</button>
          <button className="btn btn-danger btn-sm" onClick={()=>applyBulk(false)}>Disable Selected</button>
        </div>
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* Test SMS */}
      <div id="test-sms" className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><PlaneIcon /><h3 className="text-lg font-semibold">Test SMS</h3></div>
          <button className="btn btn-primary" onClick={sendTestSms}>Send Test SMS</button>
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

      {/* SMS Logs */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><LogsIcon /><h3 className="text-lg font-semibold">SMS Logs</h3></div>
          <div className="flex items-center gap-2">
            <input className="input-soft" placeholder="Search recipient" value={recipientQuery} onChange={e=>setRecipientQuery(e.target.value)} />
            <select className="input-soft" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option>All</option>
              <option>Delivered</option>
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
                <th className="px-4 py-3 text-left">Template Used</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr><td className="px-4 py-4 text-center text-gray-500" colSpan={4}>No logs found</td></tr>
              ) : filteredLogs.map(l => (
                <tr key={l.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{l.recipient}</td>
                  <td className="px-4 py-2">{l.template}</td>
                  <td className={`px-4 py-2 font-medium ${l.status==='Delivered'?'text-emerald-600':'text-rose-600'}`}>{l.status}</td>
                  <td className="px-4 py-2">{l.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View for Logs */}
        <div className="md:hidden grid gap-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-theme py-8">No logs found</div>
          ) : filteredLogs.map(l => (
            <div key={l.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-gray-500">{l.at}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  l.status==='Delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
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
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* Save CTA pinned at bottom spacing */}
      <div className="flex items-center justify-end">
        <button className="btn btn-primary" onClick={saveAll}>Save Changes</button>
      </div>

      {/* Template Modal */}
      <Modal
        open={openTemplateModal}
        title={editingTemplate ? 'Edit Template' : 'Add New Template'}
        onClose={()=>setOpenTemplateModal(false)}
        onConfirm={saveTemplateModal}
        confirmText={editingTemplate ? 'Save Template' : 'Save Template'}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Template Name</label>
            <input className="input-soft w-full" value={tplName} onChange={e=>setTplName(e.target.value)} placeholder="e.g., Payment Confirmation" />
          </div>
          <div>
            <label className="block text-sm mb-1">Message Body</label>
            <textarea className="input-soft w-full h-32" value={tplBody} onChange={e=>setTplBody(e.target.value)} placeholder="Hi {{name}}, your order {{orderId}} is confirmed." />
            <div className="text-xs text-[var(--muted-text)] mt-1">Supports placeholders like {'{{variable}}'}</div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
