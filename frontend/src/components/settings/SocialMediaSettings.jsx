import { useEffect, useMemo, useState } from 'react'

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

const PLATFORMS = [
  { key: 'facebook', name: 'Facebook', color: '#1877F2', icon: '📘' },
  { key: 'instagram', name: 'Instagram', color: '#E1306C', icon: '📸' },
  { key: 'linkedin', name: 'LinkedIn', color: '#0A66C2', icon: '💼' },
  { key: 'twitter', name: 'Twitter (X)', color: '#1DA1F2', icon: '🐦' },
  { key: 'tiktok', name: 'TikTok', color: '#000000', icon: '🎵' },
]

export default function SocialMediaSettings() {
  const [platforms, setPlatforms] = useState(() => PLATFORMS.reduce((acc, p) => {
    acc[p.key] = { connected: false, pageName: '', lastRefreshed: null }
    return acc
  }, {}))
  const [pages, setPages] = useState([]) // {id, platform, name, active}
  const [autoPostEnabled, setAutoPostEnabled] = useState(false)
  const [autoPostPlatforms, setAutoPostPlatforms] = useState([])
  const [postTemplate, setPostTemplate] = useState('Check out {{product_name}} with {{discount}} off! {{link}}')
  const [receiveMessages, setReceiveMessages] = useState(true)
  const [replyFromCRM, setReplyFromCRM] = useState(false)
  const [messagePlatforms, setMessagePlatforms] = useState(['facebook', 'instagram'])
  const [weeklyActivity, setWeeklyActivity] = useState([12, 8, 15, 9, 20, 14, 11])
  const [followers, setFollowers] = useState({ facebook: 1200, instagram: 980, linkedin: 450, twitter: 800, tiktok: 300 })
  const [lastPostDate, setLastPostDate] = useState('2025-11-01')
  const [engagementRate, setEngagementRate] = useState(4.8)
  const [toast, setToast] = useState(null)
  const [logs, setLogs] = useState([])

  // Modals
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, platformKey: null })
  const [connectPageName, setConnectPageName] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('social-media-settings')
    if (saved) {
      try {
        const s = JSON.parse(saved)
        setPlatforms(s.platforms || platforms)
        setPages(s.pages || [])
        setAutoPostEnabled(!!s.autoPostEnabled)
        setAutoPostPlatforms(s.autoPostPlatforms || [])
        setPostTemplate(s.postTemplate || postTemplate)
        setReceiveMessages(!!s.receiveMessages)
        setReplyFromCRM(!!s.replyFromCRM)
        setMessagePlatforms(s.messagePlatforms || messagePlatforms)
        setWeeklyActivity(s.weeklyActivity || weeklyActivity)
        setFollowers(s.followers || followers)
        setLastPostDate(s.lastPostDate || lastPostDate)
        setEngagementRate(s.engagementRate || engagementRate)
        setLogs(s.logs || [])
      } catch {}
    }
  }, [])

  useEffect(() => {
    const handler = () => saveAll()
    window.addEventListener('save-social-settings', handler)
    return () => window.removeEventListener('save-social-settings', handler)
  }, [])

  // Allow header button to refresh all tokens via global event
  useEffect(() => {
    const handler = () => refreshAllTokens()
    window.addEventListener('refresh-all-social-tokens', handler)
    return () => window.removeEventListener('refresh-all-social-tokens', handler)
  }, [])

  const saveAll = () => {
    const payload = {
      platforms, pages, autoPostEnabled, autoPostPlatforms, postTemplate,
      receiveMessages, replyFromCRM, messagePlatforms, weeklyActivity,
      followers, lastPostDate, engagementRate, logs,
    }
    localStorage.setItem('social-media-settings', JSON.stringify(payload))
    setToast({ type: 'success', message: 'Settings saved.' })
    setTimeout(() => setToast(null), 2000)
  }

  const addLog = (action, platformKey, status = 'Success') => {
    const platform = PLATFORMS.find(p => p.key === platformKey)?.name || 'N/A'
    setLogs(prev => [{ id: Math.random().toString(36).slice(2), at: new Date().toLocaleString(), action, platform, status }, ...prev])
  }

  const connectedCount = useMemo(() => PLATFORMS.reduce((acc, p) => acc + (platforms[p.key]?.connected ? 1 : 0), 0), [platforms])

  const handleOpenConnect = (platformKey) => {
    setConfirmModal({ open: true, type: 'connect', platformKey })
    setConnectPageName('')
  }
  const handleOpenDisconnect = (platformKey) => setConfirmModal({ open: true, type: 'disconnect', platformKey })
  const handleOpenRefresh = (platformKey) => setConfirmModal({ open: true, type: 'refresh', platformKey })

  const doConfirm = () => {
    const { type, platformKey } = confirmModal
    if (!type || !platformKey) return
    if (type === 'connect') {
      setPlatforms(prev => ({ ...prev, [platformKey]: { connected: true, pageName: connectPageName || 'Main Page', lastRefreshed: new Date().toLocaleString() } }))
      // simulate followers bump
      setFollowers(prev => ({ ...prev, [platformKey]: (prev[platformKey] || 0) + 25 }))
      addLog('Connected Account', platformKey, 'Success')
      setToast({ type: 'success', message: 'Account connected.' })
    } else if (type === 'disconnect') {
      setPlatforms(prev => ({ ...prev, [platformKey]: { connected: false, pageName: '', lastRefreshed: null } }))
      addLog('Disconnected Account', platformKey, 'Success')
      setToast({ type: 'success', message: 'Account disconnected.' })
    } else if (type === 'refresh') {
      setPlatforms(prev => ({ ...prev, [platformKey]: { ...prev[platformKey], lastRefreshed: new Date().toLocaleString() } }))
      addLog('Token refreshed', platformKey, 'Success')
      setToast({ type: 'success', message: 'Token refreshed.' })
    }
    setConfirmModal({ open: false, type: null, platformKey: null })
    setTimeout(() => setToast(null), 2000)
  }

  const syncPages = () => {
    const connected = PLATFORMS.filter(p => platforms[p.key]?.connected)
    const samples = connected.flatMap(p => ([
      { id: `${p.key}-1`, platform: p.key, name: `${p.name} - Company Page`, active: true },
      { id: `${p.key}-2`, platform: p.key, name: `${p.name} - Product Page`, active: false },
    ]))
    setPages(samples)
    addLog('Synced Pages', 'facebook', 'Success')
    setToast({ type: 'success', message: 'Pages synced.' })
    setTimeout(() => setToast(null), 2000)
  }

  const togglePageActive = (id, active) => setPages(prev => prev.map(p => p.id === id ? { ...p, active } : p))

  const toggleAutoPostPlatform = (key, checked) => setAutoPostPlatforms(prev => checked ? [...new Set([...prev, key])] : prev.filter(x => x !== key))
  const toggleMessagePlatform = (key, checked) => setMessagePlatforms(prev => checked ? [...new Set([...prev, key])] : prev.filter(x => x !== key))

  const saveTemplate = () => {
    setToast({ type: 'success', message: 'Template saved.' })
    setTimeout(() => setToast(null), 2000)
    addLog('Saved Auto-Post Template', 'instagram', 'Success')
  }

  const refreshAllTokens = () => {
    PLATFORMS.forEach(p => {
      if (platforms[p.key]?.connected) {
        setPlatforms(prev => ({ ...prev, [p.key]: { ...prev[p.key], lastRefreshed: new Date().toLocaleString() } }))
        addLog('Token refreshed', p.key, 'Success')
      }
    })
    setToast({ type: 'success', message: 'All tokens refreshed.' })
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <div>
      {/* Connection Summary */}
      <div className="glass-panel rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🌐</span>
          <h3 className="text-lg font-semibold">Connection Summary</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--muted-text)]">{connectedCount} of {PLATFORMS.length} accounts connected</span>
          <button className="btn btn-glass btn-sm" onClick={refreshAllTokens}>Refresh All Tokens</button>
        </div>
      </div>

      {/* Platform Integration */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Platform Integration</h3>
          <div className="text-sm text-[var(--muted-text)]">Manage connections per platform</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS.map(p => {
            const state = platforms[p.key]
            const connected = !!state?.connected
            return (
              <div key={p.key} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ color: p.color }}>{p.icon}</span>
                    <div className="font-medium">{p.name}</div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${connected?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-700'}`}>{connected ? 'Connected' : 'Not Connected'}</div>
                </div>
                {connected && (
                  <div className="mt-2 text-sm">
                    <div>Linked Page: <span className="font-medium">{state.pageName || 'N/A'}</span></div>
                    <div className="text-xs text-[var(--muted-text)]">Last refreshed: {state.lastRefreshed || '—'}</div>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  {!connected && (<button className="btn btn-primary btn-sm" onClick={() => handleOpenConnect(p.key)}>Connect Account</button>)}
                  {connected && (<button className="btn btn-danger btn-sm" onClick={() => handleOpenDisconnect(p.key)}>Disconnect</button>)}
                  <button className="btn btn-glass btn-sm" onClick={() => handleOpenRefresh(p.key)}>Refresh Token</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* Page & Profile Management */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Page & Profile Management</h3>
          <button className="btn btn-primary btn-sm" onClick={syncPages}>Sync Pages</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-left">Page Name</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Active</th>
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 ? (
                <tr><td className="px-4 py-4 text-center text-gray-500" colSpan={4}>No pages synced</td></tr>
              ) : pages.map(pg => (
                <tr key={pg.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2 capitalize">{pg.platform}</td>
                  <td className="px-4 py-2">{pg.name}</td>
                  <td className={`px-4 py-2 text-sm ${pg.active ? 'text-emerald-600' : 'text-gray-500'}`}>{pg.active ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={pg.active} onChange={(e)=>togglePageActive(pg.id, e.target.checked)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* Auto Posting Settings */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Auto Posting Settings</h3>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={autoPostEnabled} onChange={e=>setAutoPostEnabled(e.target.checked)} /> Enable Auto-Post
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-medium mb-2">Platforms</div>
            <div className="flex items-center gap-3 flex-wrap">
              {PLATFORMS.map(p => (
                <label key={p.key} className="text-sm flex items-center gap-2">
                  <input type="checkbox" checked={autoPostPlatforms.includes(p.key)} onChange={e=>toggleAutoPostPlatform(p.key, e.target.checked)} /> {p.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Post Template</label>
            <textarea className="input-soft w-full h-28" value={postTemplate} onChange={e=>setPostTemplate(e.target.value)} />
            <div className="text-xs text-[var(--muted-text)] mt-1">Supports placeholders: {'{{product_name}}'}, {'{{discount}}'}, {'{{link}}'}</div>
            <div className="mt-2"><button className="btn btn-primary btn-sm" onClick={saveTemplate}>Save Template</button></div>
          </div>
        </div>
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* Message Integration */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Message Integration</h3>
          <div className="flex items-center gap-4">
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={receiveMessages} onChange={e=>setReceiveMessages(e.target.checked)} /> Receive Messages in CRM</label>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={replyFromCRM} onChange={e=>setReplyFromCRM(e.target.checked)} /> Reply from CRM</label>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {PLATFORMS.map(p => (
            <label key={p.key} className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={messagePlatforms.includes(p.key)} onChange={e=>toggleMessagePlatform(p.key, e.target.checked)} /> {p.name}
            </label>
          ))}
        </div>
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* Analytics & Insights */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Analytics & Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-[var(--muted-text)]">Total Followers</div>
            <div className="text-2xl font-semibold">{Object.values(followers).reduce((a,b)=>a+b,0)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-[var(--muted-text)]">Last Post Date</div>
            <div className="text-2xl font-semibold">{lastPostDate}</div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-[var(--muted-text)]">Engagement Rate</div>
            <div className="text-2xl font-semibold">{engagementRate}%</div>
          </div>
        </div>
        <div className="mt-6">
          <div className="text-sm text-[var(--muted-text)] mb-2">Weekly Activity</div>
          <div className="flex items-end gap-2 h-24">
            {weeklyActivity.map((v, i) => (
              <div key={i} className="w-6 bg-blue-500/80 dark:bg-blue-400 rounded" style={{ height: `${Math.min(100, v*5)}%` }} title={`Day ${i+1}: ${v} actions`} />
            ))}
          </div>
        </div>
      </div>

      <div className="h-6 md:h-8" aria-hidden="true" />

      {/* Logs & Activity */}
      <div id="logs" className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Logs & Activity</h3>
          <div className="text-sm text-[var(--muted-text)]">Track connection and posting events</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-4 py-3 text-left">Date/Time</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td className="px-4 py-4 text-center text-gray-500" colSpan={4}>No activity yet</td></tr>
              ) : logs.slice(0, 10).map(l => (
                <tr key={l.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{l.at}</td>
                  <td className="px-4 py-2">{l.action}</td>
                  <td className="px-4 py-2">{l.platform}</td>
                  <td className={`px-4 py-2 ${l.status==='Success'?'text-emerald-600':'text-rose-600'}`}>{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <Modal open={confirmModal.open} title={confirmModal.type==='connect'?'Connect Account':confirmModal.type==='disconnect'?'Disconnect Account':'Refresh Token'} onClose={()=>setConfirmModal({ open:false, type:null, platformKey:null })} onConfirm={doConfirm} confirmText={confirmModal.type==='disconnect'?'Disconnect':'Confirm'}>
        {confirmModal.type === 'connect' ? (
          <div>
            <label className="block text-sm mb-1">Linked Page Name</label>
            <input className="input-soft w-full" placeholder="e.g., Company Page" value={connectPageName} onChange={e=>setConnectPageName(e.target.value)} />
            <div className="text-xs text-[var(--muted-text)] mt-1">This will display as the connected page for the platform.</div>
          </div>
        ) : (
          <p className="text-sm">Are you sure you want to proceed?</p>
        )}
      </Modal>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-lg shadow-lg ${toast.type==='success'?'bg-emerald-600 text-white':'bg-rose-600 text-white'}`}>{toast.message}</div>
      )}
    </div>
  )
}