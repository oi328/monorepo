import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Lightweight dark-themed code editor using textarea with a gutter
function CodeEditor({ value, onChange, placeholder, fullscreen, onToggleFullscreen }) {
  const [lines, setLines] = useState(1)
  useEffect(() => {
    const count = (value || '').split('\n').length
    setLines(count)
  }, [value])

  return (
    <div className={`relative rounded-lg border ${fullscreen ? 'fixed inset-0 z-[100] p-6 bg-black/60 backdrop-blur-sm' : ''}`}>
      <div className={`grid ${fullscreen ? 'grid-cols-[48px,1fr]' : 'grid-cols-[40px,1fr]'} items-start ${fullscreen ? 'bg-gray-900' : 'bg-gray-900'} rounded-lg border border-gray-800`}>
        {/* Gutter */}
        <div className="select-none text-xs text-gray-500 p-2 pl-3 leading-5 tracking-wide border-r border-gray-800">
          {Array.from({ length: Math.max(lines, 1) }).map((_, idx) => (
            <div key={idx} className="h-5">{idx + 1}</div>
          ))}
        </div>
        {/* Editor */}
        <textarea
          className="w-full h-48 md:h-56 text-sm font-mono bg-gray-900 text-gray-100 p-3 outline-none resize-y"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
        />
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <button className="btn btn-glass btn-sm" onClick={onToggleFullscreen}>
          {fullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
        </button>
      </div>
    </div>
  )
}

function WarningBanner() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200">
      <span className="text-xl">⚠️</span>
      <div>
        <div className="font-semibold">Editing scripts may affect system behavior.</div>
        <div className="text-sm">Proceed with caution and review changes before saving.</div>
      </div>
    </div>
  )
}

function sanitizeHtml(html) {
  try {
    // Basic sanitization: remove inline event handlers and javascript: URLs
    let cleaned = String(html || '')
    cleaned = cleaned.replace(/on[a-zA-Z]+\s*=\s*"[^"]*"/g, '')
    cleaned = cleaned.replace(/on[a-zA-Z]+\s*=\s*'[^']*'/g, '')
    cleaned = cleaned.replace(/javascript:/gi, '')
    return cleaned
  } catch (_) {
    return String(html || '')
  }
}

export default function ScriptingSettings() {
  const { t } = useTranslation()

  // Persisted settings
  const [headerScripts, setHeaderScripts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('scripts.header') || 'null') || '' } catch { return '' }
  })
  const [bodyScripts, setBodyScripts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('scripts.body') || 'null') || '' } catch { return '' }
  })
  const [pageRules, setPageRules] = useState(() => {
    try { return JSON.parse(localStorage.getItem('scripts.pageRules') || 'null') || [] } catch { return [] }
  })
  const [security, setSecurity] = useState(() => {
    try { return JSON.parse(localStorage.getItem('scripts.security') || 'null') || { adminsOnlyInline: true, sanitizeHtml: true, disableAll: false } } catch { return { adminsOnlyInline: true, sanitizeHtml: true, disableAll: false } }
  })
  const [saveStatus, setSaveStatus] = useState('') // '' | 'success'
  const [modalOpen, setModalOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(null) // 'header' | 'body' | 'page:<id>' | null
  const [previewModule, setPreviewModule] = useState('Dashboard')

  const moduleOptions = useMemo(() => (
    ['Dashboard','Leads','Sales','Marketing','Customers','Reports']
  ), [])

  useEffect(() => {
    const onSave = () => handleSave()
    const onPreview = () => setModalOpen(true)
    const onReset = () => handleReset()
    window.addEventListener('save-scripting-settings', onSave)
    window.addEventListener('preview-scripting-settings', onPreview)
    window.addEventListener('reset-scripting-settings', onReset)
    return () => {
      window.removeEventListener('save-scripting-settings', onSave)
      window.removeEventListener('preview-scripting-settings', onPreview)
      window.removeEventListener('reset-scripting-settings', onReset)
    }
  }, [headerScripts, bodyScripts, pageRules, security])

  const addRule = () => {
    const id = `rule-${Date.now()}`
    setPageRules(prev => ([...prev, { id, module: 'Dashboard', code: '' }]))
  }
  const updateRule = (id, patch) => {
    setPageRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }
  const removeRule = (id) => {
    setPageRules(prev => prev.filter(r => r.id !== id))
  }

  const handleSave = () => {
    try {
      const header = security.sanitizeHtml ? sanitizeHtml(headerScripts) : headerScripts
      const body = security.sanitizeHtml ? sanitizeHtml(bodyScripts) : bodyScripts
      const rules = security.sanitizeHtml ? pageRules.map(r => ({ ...r, code: sanitizeHtml(r.code) })) : pageRules
      localStorage.setItem('scripts.header', JSON.stringify(header))
      localStorage.setItem('scripts.body', JSON.stringify(body))
      localStorage.setItem('scripts.pageRules', JSON.stringify(rules))
      localStorage.setItem('scripts.security', JSON.stringify(security))
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(''), 2500)
    } catch (e) {
      console.error('Failed to save scripts', e)
    }
  }

  const handleReset = () => {
    try {
      localStorage.removeItem('scripts.header')
      localStorage.removeItem('scripts.body')
      localStorage.removeItem('scripts.pageRules')
      localStorage.removeItem('scripts.security')
    } catch {}
    setHeaderScripts('<meta name="robots" content="noindex" />\n<script src="https://example.com/custom.js"></script>')
    setBodyScripts('<script>\n  console.log("Custom analytics loaded")\n</script>')
    setPageRules([{ id: 'rule-1', module: 'Dashboard', code: '<script>\n  console.log("Dashboard rule applied")\n</script>' }])
    setSecurity({ adminsOnlyInline: true, sanitizeHtml: true, disableAll: false })
    setSaveStatus('')
  }

  const sandboxHtml = useMemo(() => {
    if (security.disableAll) {
      return '<!doctype html><html><head><meta charset="utf-8"><title>Sandbox</title></head><body><h3>Custom scripts are disabled</h3></body></html>'
    }
    const head = security.sanitizeHtml ? sanitizeHtml(headerScripts) : headerScripts
    const body = security.sanitizeHtml ? sanitizeHtml(bodyScripts) : bodyScripts
    const pageSpecific = pageRules
      .filter(r => r.module === previewModule)
      .map(r => r.code)
      .join('\n')
    const pageSafe = security.sanitizeHtml ? sanitizeHtml(pageSpecific) : pageSpecific
    return `<!doctype html><html><head><meta charset="utf-8"><title>Sandbox</title>${head}</head><body>
      <div style="font-family: ui-sans-serif, system-ui; padding: 12px; color: #374151">
        <h2 style="margin: 0 0 8px">Sandbox Preview</h2>
        <p style="margin: 0 0 10px; color: #6b7280">Module: ${previewModule}</p>
        <div style="padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb">This is a simple sandbox page. Injected scripts may run in console.</div>
      </div>
      ${body}
      ${pageSafe}
    </body></html>`
  }, [headerScripts, bodyScripts, pageRules, previewModule, security])

  return (
    <div className="space-y-6">
      <WarningBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
          <h1 className="text-2xl font-bold">{t('Scripting Settings')}</h1>
        </div>
        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-600">
            <span>✅</span>
            <span className="text-sm">{t('Saved successfully')}</span>
          </div>
        )}
      </div>

      {/* Sections */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('Header Scripts')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('Inserted inside the <head> of all pages.')}</p>
        <CodeEditor
          value={headerScripts}
          onChange={setHeaderScripts}
          placeholder={`<meta name="robots" content="noindex" />\n<script src="https://example.com/custom.js"></script>`}
          fullscreen={fullscreen === 'header'}
          onToggleFullscreen={() => setFullscreen(v => v === 'header' ? null : 'header')}
        />
      </section>

      <div className="h-6 md:h-8" />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('Body Scripts')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('Placed before the closing </body> tag.')}</p>
        <CodeEditor
          value={bodyScripts}
          onChange={setBodyScripts}
          placeholder={`<script>\n  console.log("Custom analytics loaded")\n</script>`}
          fullscreen={fullscreen === 'body'}
          onToggleFullscreen={() => setFullscreen(v => v === 'body' ? null : 'body')}
        />
      </section>

      <div className="h-6 md:h-8" />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('Page-Specific Scripts')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('Target scripts to specific modules or pages.')}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={addRule}>{t('Add More')}</button>
        </div>
        <div className="space-y-4">
          {pageRules.length === 0 && (
            <div className="text-sm text-gray-500">{t('No rules added yet.')}</div>
          )}
          {pageRules.map(rule => (
            <div key={rule.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label className="label">{t('Module')}</label>
                  <select
                    className="input"
                    value={rule.module}
                    onChange={(e) => updateRule(rule.id, { module: e.target.value })}
                  >
                    {moduleOptions.map(m => <option key={m} value={m}>{t(m)}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-glass btn-sm" onClick={() => setFullscreen(v => v === `page:${rule.id}` ? null : `page:${rule.id}`)}>{t('Expand Fullscreen')}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => removeRule(rule.id)}>{t('Remove')}</button>
                </div>
              </div>
              <CodeEditor
                value={rule.code}
                onChange={(val) => updateRule(rule.id, { code: val })}
                placeholder={`<script>\n  console.log("Rule for ${rule.module}")\n</script>`}
                fullscreen={fullscreen === `page:${rule.id}`}
                onToggleFullscreen={() => setFullscreen(v => v === `page:${rule.id}` ? null : `page:${rule.id}`)}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="h-6 md:h-8" />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('Security & Permissions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={security.adminsOnlyInline} onChange={(e)=>setSecurity(prev=>({ ...prev, adminsOnlyInline: e.target.checked }))} />
            <span>{t('Allow inline script editing for Admins only')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={security.sanitizeHtml} onChange={(e)=>setSecurity(prev=>({ ...prev, sanitizeHtml: e.target.checked }))} />
            <span>{t('Sanitize HTML to prevent XSS')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={security.disableAll} onChange={(e)=>setSecurity(prev=>({ ...prev, disableAll: e.target.checked }))} />
            <span>{t('Disable all custom scripts temporarily')}</span>
          </label>
        </div>
      </section>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        <button className="btn btn-primary btn-sm" onClick={handleSave}>{t('Save Scripts')}</button>
        <button className="btn btn-glass btn-sm" onClick={() => setModalOpen(true)}>{t('Preview in Sandbox Mode')}</button>
        <button className="btn btn-danger btn-sm" onClick={handleReset}>{t('Reset to Default')}</button>
      </div>

      {/* Sandbox Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative w-[96%] h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <strong>{t('Sandbox Preview')}</strong>
                <select className="input" value={previewModule} onChange={(e)=>setPreviewModule(e.target.value)}>
                  {moduleOptions.map(m => <option key={m} value={m}>{t(m)}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>{t('Close')}</button>
              </div>
            </div>
            <iframe title="sandbox" className="w-full h-full" srcDoc={sandboxHtml} />
          </div>
        </div>
      )}
    </div>
  )
}