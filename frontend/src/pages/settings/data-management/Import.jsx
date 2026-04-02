import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { api } from '../../../utils/api'

export default function Import() {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const [target, setTarget] = useState('leads')
  const [hasHeader, setHasHeader] = useState(true)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [status, setStatus] = useState('idle')
  const [step, setStep] = useState(1) // 1 Upload, 2 Preview, 3 Mapping, 4 Summary
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [summary, setSummary] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [jobDetails, setJobDetails] = useState(null)

  const [showDetails, setShowDetails] = useState(false)
  const [jobRows, setJobRows] = useState([])
  const [jobRowsMeta, setJobRowsMeta] = useState(null)
  const [jobRowsLoading, setJobRowsLoading] = useState(false)
  const [jobRowsStatus, setJobRowsStatus] = useState('all')
  const [jobRowsSearch, setJobRowsSearch] = useState('')
  const [jobRowsPerPage, setJobRowsPerPage] = useState(25)
  const [jobRowsPage, setJobRowsPage] = useState(1)
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

  const importJobsSupportedTargets = useMemo(() => new Set(['leads']), [])
  const isTargetSupported = importJobsSupportedTargets.has(String(target || '').toLowerCase())

  const parseFile = useCallback(async (f) => {
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
  }, [hasHeader, target, targetFields])

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
  }, [allowedTypes, parseFile])

  const onDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer?.files?.[0]
    onFile(f)
  }

  const onImportConfirm = async () => {
    try {
      setStatus('processing')

      if (!isTargetSupported) {
        setStatus('error')
        setSummary({ error: 'unsupported_module', message: 'This module is not supported yet by the new import-jobs flow.' })
        return
      }

      const fileName = file?.name || `import_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`
      const resp = await api.post('/api/import-jobs', {
        module: target,
        file_name: fileName,
        rows,
        mapping,
        updateExisting,
      })

      setSummary(resp.data)
      setJobId(resp.data?.job_id ?? null)
      setStatus('success')
      setStep(4)
    } catch (e) {
      setStatus('error')
      const code = e?.response?.status
      const apiMessage = e?.response?.data?.message || e?.response?.data?.error || e?.message
      setSummary({
        error: 'import_failed',
        status: code,
        message: apiMessage || 'Import failed',
        hint: code === 404 ? 'Enable IMPORT_JOBS_ENABLED=true on the backend.' : undefined,
      })
    }
  }

  const clearFile = () => {
    setFile(null)
    setColumns([])
    setRows([])
    setMapping({})
    setSummary(null)
    setJobId(null)
    setJobDetails(null)
    setShowDetails(false)
    setJobRows([])
    setJobRowsMeta(null)
    setJobRowsStatus('all')
    setJobRowsSearch('')
    setJobRowsPerPage(25)
    setJobRowsPage(1)
    setStatus('idle')
    setStep(1)
  }

  const summaryCounters = useMemo(() => {
    const s = summary || {}
    const counters = s?.summary || s
    return {
      total_rows: Number(counters?.total_rows ?? counters?.total ?? 0) || 0,
      success_rows: Number(counters?.success_rows ?? counters?.success ?? 0) || 0,
      failed_rows: Number(counters?.failed_rows ?? counters?.failed ?? 0) || 0,
      duplicate_rows: Number(counters?.duplicate_rows ?? counters?.duplicate_count ?? 0) || 0,
      skipped_rows: Number(counters?.skipped_rows ?? 0) || 0,
      warning_rows: Number(counters?.warning_rows ?? 0) || 0,
    }
  }, [summary])

  useEffect(() => {
    if (!jobId) return
    const load = async () => {
      try {
        const res = await api.get(`/api/import-jobs/${jobId}`)
        setJobDetails(res.data)
      } catch {
        setJobDetails(null)
      }
    }
    load()
  }, [jobId])

  useEffect(() => {
    if (!showDetails || !jobId) return
    const loadRows = async () => {
      try {
        setJobRowsLoading(true)
        const params = {
          per_page: jobRowsPerPage,
          page: jobRowsPage,
        }
        if (jobRowsStatus !== 'all') params.status = jobRowsStatus
        if (jobRowsSearch.trim()) params.search = jobRowsSearch.trim()
        const res = await api.get(`/api/import-jobs/${jobId}/rows`, { params })
        const data = res.data
        setJobRows(Array.isArray(data?.data) ? data.data : [])
        setJobRowsMeta({
          current_page: data?.current_page,
          last_page: data?.last_page,
          total: data?.total,
          from: data?.from,
          to: data?.to,
        })
      } catch {
        setJobRows([])
        setJobRowsMeta(null)
      } finally {
        setJobRowsLoading(false)
      }
    }
    loadRows()
  }, [showDetails, jobId, jobRowsPerPage, jobRowsPage, jobRowsStatus, jobRowsSearch])

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
                <button
                  className={`px-3 py-2 rounded text-white ${isTargetSupported ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'}`}
                  disabled={!isTargetSupported || status === 'processing'}
                  onClick={onImportConfirm}
                  title={!isTargetSupported ? 'Phase A supports Leads only.' : undefined}
                >
                  {t('Confirm Import')}
                </button>
              </div>
            </div>
            {!isTargetSupported && (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                Phase A supports Leads only. Other modules will be enabled after the Leads flow is stable.
              </div>
            )}
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
              <div className="space-y-4">
                {summary?.message && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    <div className="font-semibold">{summary.message}</div>
                    {summary.hint && <div className="opacity-80 mt-1">{summary.hint}</div>}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-panel rounded-xl p-4">
                    <div className="text-xs text-[var(--muted-text)]">Total Rows</div>
                    <div className="text-2xl font-semibold">{summaryCounters.total_rows}</div>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <div className="text-xs text-[var(--muted-text)]">Success Rows</div>
                    <div className="text-2xl font-semibold">{summaryCounters.success_rows}</div>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <div className="text-xs text-[var(--muted-text)]">Failed Rows</div>
                    <div className="text-2xl font-semibold">{summaryCounters.failed_rows}</div>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <div className="text-xs text-[var(--muted-text)]">Duplicate Rows</div>
                    <div className="text-2xl font-semibold">{summaryCounters.duplicate_rows}</div>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <div className="text-xs text-[var(--muted-text)]">Skipped Rows</div>
                    <div className="text-2xl font-semibold">{summaryCounters.skipped_rows}</div>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <div className="text-xs text-[var(--muted-text)]">Warnings</div>
                    <div className="text-2xl font-semibold">{summaryCounters.warning_rows}</div>
                  </div>
                </div>

                {jobId && (
                  <div className="glass-panel rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="text-xs text-[var(--muted-text)]">Import Job</div>
                      <div className="font-semibold">#{jobId}</div>
                      {jobDetails?.status && <div className="text-xs opacity-80 mt-1">Status: {jobDetails.status}</div>}
                    </div>
                    <button
                      className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => {
                        setShowDetails(v => !v)
                        setJobRowsPage(1)
                      }}
                    >
                      {showDetails ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                )}

                {showDetails && jobId && (
                  <div className="glass-panel rounded-xl p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-end gap-3 justify-between">
                      <div className="flex gap-3 items-end">
                        <div>
                          <div className="text-xs text-[var(--muted-text)]">Status</div>
                          <select
                            value={jobRowsStatus}
                            onChange={(e) => { setJobRowsStatus(e.target.value); setJobRowsPage(1) }}
                            className="input-soft"
                          >
                            <option value="all">All</option>
                            <option value="success">Success</option>
                            <option value="duplicate">Duplicate</option>
                            <option value="failed">Failed</option>
                            <option value="skipped">Skipped</option>
                            <option value="warning">Warning</option>
                          </select>
                        </div>
                        <div>
                          <div className="text-xs text-[var(--muted-text)]">Per Page</div>
                          <select
                            value={jobRowsPerPage}
                            onChange={(e) => { setJobRowsPerPage(Number(e.target.value)); setJobRowsPage(1) }}
                            className="input-soft"
                          >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                      </div>
                      <div className="w-full md:w-80">
                        <div className="text-xs text-[var(--muted-text)]">Search</div>
                        <input
                          value={jobRowsSearch}
                          onChange={(e) => { setJobRowsSearch(e.target.value); setJobRowsPage(1) }}
                          className="input-soft w-full"
                          placeholder="reason / code..."
                        />
                      </div>
                    </div>

                    <div className="overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left border-b border-gray-700/40">
                            <th className="px-3 py-2">Row</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Reason</th>
                            <th className="px-3 py-2">Created ID</th>
                            <th className="px-3 py-2">Duplicate Of</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobRowsLoading && (
                            <tr><td className="px-3 py-3 opacity-70" colSpan={5}>Loading...</td></tr>
                          )}
                          {!jobRowsLoading && jobRows.length === 0 && (
                            <tr><td className="px-3 py-3 opacity-70" colSpan={5}>No rows</td></tr>
                          )}
                          {!jobRowsLoading && jobRows.map((r) => (
                            <tr key={r.id} className="border-t border-gray-700/30">
                              <td className="px-3 py-2">{r.row_number}</td>
                              <td className="px-3 py-2">{r.status}</td>
                              <td className="px-3 py-2">
                                <div className="text-xs opacity-80">{r.reason_code || ''}</div>
                                <div className="text-sm">{r.reason_message || ''}</div>
                              </td>
                              <td className="px-3 py-2">{r.created_record_id ?? '-'}</td>
                              <td className="px-3 py-2">{r.duplicate_of_id ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {jobRowsMeta?.last_page > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-xs opacity-80">
                          {jobRowsMeta.from || 0}-{jobRowsMeta.to || 0} of {jobRowsMeta.total || 0}
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1.5 rounded bg-gray-700 text-white disabled:opacity-50"
                            disabled={jobRowsPage <= 1}
                            onClick={() => setJobRowsPage(p => Math.max(1, p - 1))}
                          >
                            Prev
                          </button>
                          <div className="px-3 py-1.5 rounded bg-gray-800 text-white text-xs">
                            Page {jobRowsMeta.current_page || jobRowsPage} / {jobRowsMeta.last_page}
                          </div>
                          <button
                            className="px-3 py-1.5 rounded bg-gray-700 text-white disabled:opacity-50"
                            disabled={jobRowsPage >= jobRowsMeta.last_page}
                            onClick={() => setJobRowsPage(p => p + 1)}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
