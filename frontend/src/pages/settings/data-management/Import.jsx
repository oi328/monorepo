import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { api } from '../../../utils/api'

export default function Import() {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const [target, setTarget] = useState('customers')
  const [hasHeader, setHasHeader] = useState(true)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [status, setStatus] = useState('idle')
  const [step, setStep] = useState(1) // 1 Upload, 2 Preview, 3 Mapping, 4 Summary
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [summary, setSummary] = useState(null)
  const inputRef = useRef(null)

  const allowedTypes = useMemo(() => ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], [])

  const targetFields = useMemo(() => ({
    customers: ['id','name','phone','email','status'],
    leads: ['id','name','phone','source','status'],
    products: ['id','name','sku','price','stock'],
    users: ['id','name','email','role'],
    projects: ['id','name','city','status'],
    properties: ['id','type','area','price']
  }), [])

  const parseFile = async (f) => {
    const buf = await f.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const wsName = wb.SheetNames[0]
    const ws = wb.Sheets[wsName]
    const data = XLSX.utils.sheet_to_json(ws, { header: hasHeader ? 1 : 0 })
    let cols = []
    let parsedRows = []
    if (hasHeader) {
      cols = (data[0] || []).map((c) => String(c || '').trim())
      parsedRows = (data.slice(1) || []).map((r) => {
        const obj = {}
        cols.forEach((c, i) => { obj[c] = r[i] })
        return obj
      })
    } else {
      // auto-generate column names C1..Cn
      const maxLen = Math.max(...data.map((r) => r.length))
      cols = Array.from({ length: maxLen }, (_, i) => `C${i+1}`)
      parsedRows = data.map((r) => {
        const obj = {}
        cols.forEach((c, i) => { obj[c] = r[i] })
        return obj
      })
    }
    setColumns(cols)
    setRows(parsedRows)
    // initialize mapping
    const initMap = {}
    cols.forEach((c, i) => { initMap[c] = targetFields[target][i] || '' })
    setMapping(initMap)
    setStep(2)
  }

  const onFile = useCallback(async (f) => {
    if (!f) return
    if (!(allowedTypes.includes(f.type) || f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))) {
      setStatus('error')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setStatus('error')
      return
    }
    setFile(f)
    setStatus('idle')
    await parseFile(f)
  }, [allowedTypes, hasHeader, target])

  const onDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer?.files?.[0]
    onFile(f)
  }

  const onImportConfirm = async () => {
    try {
      setStatus('processing')
      const resp = await api.post('/api/import', { module: target, rows, mapping, updateExisting })
      setSummary(resp.data)
      setStatus('success')
      setStep(4)
    } catch (e) {
      setStatus('error')
    }
  }

  const clearFile = () => {
    setFile(null)
    setColumns([])
    setRows([])
    setMapping({})
    setSummary(null)
    setStatus('idle')
    setStep(1)
  }

  const disabled = !file || status === 'processing'

  return (
    <>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{t('Import Data')}</h1>
            <p className="text-sm text-[var(--muted-text)]">{t('import.uploadDescription')}</p>
          </div>
        </div>

        {/* Wizard Steps */}
        <div className="flex gap-2 text-xs">
          {[1,2,3,4].map((s) => (
            <div key={s} className={`px-2 py-1 rounded ${step===s ? 'bg-blue-600 text-white':'bg-gray-700 text-gray-200'}`}>{s===1?t('Upload'):s===2?t('Preview'):s===3?t('Mapping'):t('Summary')}</div>
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-base font-semibold mb-3">{t('import.uploadFile')}</h3>
              <div
                onDragOver={(e)=>e.preventDefault()}
                onDrop={onDrop}
                className="border-2 border-dashed border-gray-500/40 rounded-xl p-6 text-center hover:border-blue-500/60 transition"
              >
                {!file ? (
                  <>
                    <p className="text-sm mb-2">{t('import.dropHint')}</p>
                    <button
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => inputRef.current?.click()}
                    >
                      {t('import.chooseFile')}
                    </button>
                    <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e)=>onFile(e.target.files?.[0])} />
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm">{file.name} · {(file.size/1024).toFixed(1)} KB</div>
                    <div className="flex items-center justify-center gap-3">
                      <button className="px-3 py-2 rounded-lg bg-gray-700 text-white" onClick={clearFile}>{t('Remove')}</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 text-xs text-[var(--muted-text)]">{t('import.supportedFormats')}</div>
            </div>

            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <h3 className="text-base font-semibold">{t('Settings')}</h3>
              <label className="block text-sm">{t('import.target')}</label>
              <select value={target} onChange={e=>setTarget(e.target.value)} className="input-soft w-full">
                <option value="customers">{t('Customers')}</option>
                <option value="leads">{t('Leads')}</option>
                <option value="products">{t('Products')}</option>
                <option value="users">{t('Users')}</option>
                <option value="projects">{t('Projects')}</option>
                <option value="properties">{t('Properties')}</option>
              </select>
              <div className="flex items-center gap-2 mt-2">
                <input id="hasHeader" type="checkbox" checked={hasHeader} onChange={e=>setHasHeader(e.target.checked)} />
                <label htmlFor="hasHeader" className="text-sm">{t('import.hasHeader')}</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="updateExisting" type="checkbox" checked={updateExisting} onChange={e=>setUpdateExisting(e.target.checked)} />
                <label htmlFor="updateExisting" className="text-sm">{t('import.updateExisting')}</label>
              </div>
              <div className="pt-2 flex items-center gap-3">
                <button disabled={!file} onClick={() => setStep(2)} className={`px-3 py-2 rounded-lg ${!file? 'bg-gray-600 cursor-not-allowed':'bg-green-600 hover:bg-green-700'} text-white`}>{t('Next')}</button>
                {status === 'error' && <span className="text-sm text-red-400">{t('import.unsupportedType')}</span>}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">{t('Preview')}</h3>
              <div className="flex gap-2">
                <button className="px-3 py-2 rounded bg-gray-700 text-white" onClick={() => setStep(1)}>{t('Back')}</button>
                <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => setStep(3)}>{t('Next')}</button>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>{columns.map((c) => (<th key={c} className="px-3 py-2 text-left">{c}</th>))}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, idx) => (
                    <tr key={idx} className="border-t border-gray-700/40">
                      {columns.map((c) => (<td key={c} className="px-3 py-2">{String(r[c] ?? '')}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">{t('Mapping')}</h3>
              <div className="flex gap-2">
                <button className="px-3 py-2 rounded bg-gray-700 text-white" onClick={() => setStep(2)}>{t('Back')}</button>
                <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={onImportConfirm}>{t('Confirm Import')}</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {columns.map((c) => (
                <div key={c} className="flex items-center gap-3">
                  <div className="w-1/2">
                    <div className="text-xs text-[var(--muted-text)]">{t('Column')}</div>
                    <div className="text-sm">{c}</div>
                  </div>
                  <div className="w-1/2">
                    <div className="text-xs text-[var(--muted-text)]">{t('Map to field')}</div>
                    <select value={mapping[c] || ''} onChange={(e)=>setMapping((m)=>({ ...m, [c]: e.target.value }))} className="input-soft w-full">
                      <option value="">—</option>
                      {(targetFields[target] || []).map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">{t('Summary')}</h3>
              <div className="flex gap-2">
                <button className="px-3 py-2 rounded bg-gray-700 text-white" onClick={clearFile}>{t('Start New')}</button>
              </div>
            </div>
            {status === 'processing' && <span className="text-sm text-blue-400">{t('import.processing')}</span>}
            {status === 'error' && <span className="text-sm text-red-400">{t('Error')}</span>}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel rounded-xl p-4">
                  <div className="text-xs text-[var(--muted-text)]">{t('New Records')}</div>
                  <div className="text-2xl font-semibold">{summary.newRecords}</div>
                </div>
                <div className="glass-panel rounded-xl p-4">
                  <div className="text-xs text-[var(--muted-text)]">{t('Updated Records')}</div>
                  <div className="text-2xl font-semibold">{summary.updatedRecords}</div>
                </div>
                <div className="glass-panel rounded-xl p-4">
                  <div className="text-xs text-[var(--muted-text)]">{t('Failed Rows')}</div>
                  <div className="text-2xl font-semibold">{summary.failedCount}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-base font-semibold mb-2">{t('import.formatGuidelines')}</h3>
          <ul className="text-sm list-disc pl-5 space-y-1 text-[var(--muted-text)]">
            <li>{t('import.guidelineUtf8')}</li>
            <li>{t('import.guidelineColumns')}</li>
            <li>{t('import.guidelineHeaders')}</li>
          </ul>
        </div>
      </div>
    </>
  )
}
