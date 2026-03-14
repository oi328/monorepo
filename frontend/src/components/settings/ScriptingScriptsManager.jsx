import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const MODULES = ['Leads','CIL','Brokers','Clients','Orders','Marketing','Reports']
const TRIGGERS = ['OnLoad','OnSave','OnChange']

function CodeEditor({ value, onChange }) {
  return (
    <textarea
      className="w-full h-56 md:h-64 text-sm font-mono bg-gray-900 text-gray-100 p-3 rounded-xl border border-gray-800 outline-none resize-y focus:ring-2 focus:ring-indigo-500/50"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`// JavaScript\n// Use context objects like lead, currentUser, preventSave()`}
      spellCheck={false}
    />
  )
}

function sanitizeCode(code) {
  try {
    // Remove dangerous URL schemes and inline handlers
    let cleaned = String(code || '')
    cleaned = cleaned.replace(/javascript:/gi, '')
    return cleaned
  } catch { return String(code || '') }
}

export default function ScriptingScriptsManager() {
  const { t } = useTranslation()
  const [scripts, setScripts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crm.scripts') || '[]') } catch { return [] }
  })
  const [query, setQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [preview, setPreview] = useState(null) // script to preview
  const [savedOk, setSavedOk] = useState(false)

  useEffect(() => {
    const handler = () => {
      setEditing({ id: null, name: '', module: MODULES[0], trigger: TRIGGERS[0], description: '', code: '', status: 'Active' })
      setModalOpen(true)
    }
    window.addEventListener('open-add-script-modal', handler)
    return () => window.removeEventListener('open-add-script-modal', handler)
  }, [])

  const filtered = useMemo(() => {
    return scripts
      .filter(s => !moduleFilter || s.module === moduleFilter)
      .filter(s => !statusFilter || s.status === statusFilter)
      .filter(s => !query || (s.name?.toLowerCase().includes(query.toLowerCase()) || s.description?.toLowerCase().includes(query.toLowerCase())))
      .sort((a,b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
  }, [scripts, query, moduleFilter, statusFilter])

  const onDelete = (id) => {
    setScripts(prev => {
      const next = prev.filter(s => s.id !== id)
      try { localStorage.setItem('crm.scripts', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const onEdit = (s) => {
    setEditing({ ...s })
    setModalOpen(true)
  }

  const onPreview = (s) => setPreview(s)

  const saveScript = () => {
    if (!editing) return
    const now = new Date().toISOString()
    const record = { ...editing }
    record.code = sanitizeCode(record.code)
    if (!record.id) {
      record.id = 'scr_' + Date.now()
      record.created_at = now
    }
    record.updated_at = now
    record.updated_by = 'Admin'
    setScripts(prev => {
      const exists = prev.some(s => s.id === record.id)
      const next = exists ? prev.map(s => s.id === record.id ? record : s) : [record, ...prev]
      try { localStorage.setItem('crm.scripts', JSON.stringify(next)) } catch {}
      return next
    })
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 1800)
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input"
          placeholder={t('Search by name or description')}
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
        />
        <select className="input" value={moduleFilter} onChange={(e)=>setModuleFilter(e.target.value)}>
          <option value="">{t('All Modules')}</option>
          {MODULES.map(m => <option key={m} value={m}>{t(m)}</option>)}
        </select>
        <select className="input" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
          <option value="">{t('All Status')}</option>
          <option value="Active">{t('Active')}</option>
          <option value="Inactive">{t('Inactive')}</option>
        </select>
        <button
          className="btn btn-secondary btn-sm ml-auto"
          onClick={() => {
            setEditing({ id: null, name: '', module: MODULES[0], trigger: TRIGGERS[0], description: '', code: '', status: 'Active' })
            setModalOpen(true)
          }}
        >
          {t('Add New Script')}
        </button>
        {savedOk && (
          <div className="flex items-center gap-2 text-green-600"><span>✅</span><span className="text-sm">{t('Saved successfully')}</span></div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left">{t('Script Name')}</th>
              <th className="px-4 py-2 text-left">{t('Target Module')}</th>
              <th className="px-4 py-2 text-left">{t('Trigger Type')}</th>
              <th className="px-4 py-2 text-left">{t('Status')}</th>
              <th className="px-4 py-2 text-left">{t('Last Modified')}</th>
              <th className="px-4 py-2 text-right">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">{t('No scripts found')}</td>
              </tr>
            )}
            {filtered.map(s => (
              <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2">{t(s.module)}</td>
                <td className="px-4 py-2">{t(s.trigger)}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${s.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>{t(s.status)}</span>
                </td>
                <td className="px-4 py-2">{new Date(s.updated_at || s.created_at || Date.now()).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="btn btn-glass btn-sm" onClick={() => onPreview(s)}>{t('Preview')}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => onEdit(s)}>{t('Edit')}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(s.id)}>{t('Delete')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && editing && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 md:pt-28">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative w-[96%] max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{editing?.id ? t('Edit Script') : t('Add New Script')}</h3>
              <button className="btn btn-glass btn-sm" onClick={() => setModalOpen(false)}>{t('Cancel')}</button>
            </div>
            <div className="space-y-4">
              {/* Top controls row: Module • Trigger • Status */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="label">{t('Target Module')}</label>
                  <select className="input bg-gray-100 dark:bg-gray-800" value={editing.module} onChange={(e)=>setEditing(prev=>({ ...prev, module: e.target.value }))}>
                    {MODULES.map(m => <option key={m} value={m}>{t(m)}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[220px]">
                  <label className="label">{t('Trigger Type')}</label>
                  <div className="flex items-center gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
                    {TRIGGERS.map(tr => (
                      <button
                        key={tr}
                        className={`px-3 py-1 rounded-lg text-sm ${editing.trigger===tr ? 'bg-indigo-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        onClick={() => setEditing(prev => ({ ...prev, trigger: tr }))}
                        type="button"
                      >
                        {t(tr)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="min-w-[160px]">
                  <label className="label">{t('Status')}</label>
                  <button
                    type="button"
                    onClick={() => setEditing(prev => ({ ...prev, status: prev.status === 'Active' ? 'Inactive' : 'Active' }))}
                    className={`px-4 py-2 rounded-lg text-sm ${editing.status==='Active' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
                  >
                    {t(editing.status)}
                  </button>
                </div>
              </div>
              {/* Name */}
              <div>
                <label className="label">{t('Script Name')}</label>
                <input className="input" placeholder={t('Enter a concise script name')} value={editing.name} onChange={(e)=>setEditing(prev=>({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('Description')}</label>
                <textarea className="input" rows={2} value={editing.description} onChange={(e)=>setEditing(prev=>({ ...prev, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('Code')}</label>
                <CodeEditor value={editing.code} onChange={(code)=>setEditing(prev=>({ ...prev, code }))} />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button className="btn btn-primary btn-sm" disabled={!editing.name?.trim()} onClick={saveScript}>{t('Save')}</button>
                <button className="btn btn-glass btn-sm" onClick={() => setModalOpen(false)}>{t('Cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Sandbox */}
      {preview && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPreview(null)} />
          <div className="relative w-[96%] h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <strong>{t('Sandbox Preview')}</strong>
                <span className="text-sm text-gray-600 dark:text-gray-400">{preview.name} — {t(preview.module)} — {t(preview.trigger)}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setPreview(null)}>{t('Close')}</button>
            </div>
            <iframe
              title="script-sandbox"
              className="w-full h-full"
              srcDoc={`<!doctype html><html><head><meta charset=\"utf-8\"><title>Sandbox</title></head><body>
                <div style=\"font-family: ui-sans-serif, system-ui; padding: 12px; color: #374151\">
                  <h2 style=\"margin:0 0 8px\">Preview: ${preview.name}</h2>
                  <p style=\"margin:0 0 10px; color:#6b7280\">Module: ${preview.module} • Trigger: ${preview.trigger}</p>
                  <pre style=\"padding:8px; border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb\">Open the console to see effects.</pre>
                </div>
                <script>
                  try {
                    window.sandboxContext = {
                      currentUser: { id: 'admin_1', role: 'Admin', name: 'Ibrahim' },
                      lead: { id: 'lead_001', name: 'Test Lead', phone: '' },
                      preventSave: function() { console.warn('preventSave() called'); alert('Save prevented by script.'); }
                    };
                    (function(context) {
                      ${sanitizeCode(preview.code)}
                    })(window.sandboxContext);
                  } catch (e) { console.error('Script error:', e); }
                </script>
              </body></html>`}
            />
          </div>
        </div>
      )}
    </div>
  )
}