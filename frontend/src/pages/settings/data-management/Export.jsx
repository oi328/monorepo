import { useState } from 'react'
import { api } from '../../../utils/api'

export default function Export() {
  const [dataset, setDataset] = useState('customers')
  const [format, setFormat] = useState('csv')
  const [status, setStatus] = useState('idle')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assignedTo, setAssignedTo] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')

  const onExport = async () => {
    try {
      setStatus('processing')
      setDownloadUrl('')
      const filters = { dateFrom, dateTo, status: statusFilter, assignedTo }
      const resp = await api.post('/api/export', { module: dataset, format, filters })
      const { url } = resp.data || {}
      if (url) {
        setDownloadUrl(url)
        // Trigger browser download
        window.open(url, '_blank')
      }
      setStatus('success')
    } catch (e) {
      setStatus('error')
    }
  }

  return (
    <Layout title="Export">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Export Data</h1>
          <p className="text-sm text-[var(--muted-text)]">صدّر البيانات من النظام بصيغة CSV/XLSX.</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <div>
            <label className="block text-sm mb-1">Dataset</label>
            <select value={dataset} onChange={e=>setDataset(e.target.value)} className="input-soft w-full">
              <option value="customers">Customers</option>
              <option value="leads">Leads</option>
              <option value="products">Products</option>
              <option value="users">Users</option>
              <option value="projects">Projects</option>
              <option value="properties">Properties</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Format</label>
            <select value={format} onChange={e=>setFormat(e.target.value)} className="input-soft w-[200px]">
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
            </select>
          </div>
          <div>
            <button className="text-xs text-blue-400" onClick={()=>setShowAdvanced((v)=>!v)}>
              {showAdvanced ? 'Hide Export Options' : 'Show Export Options'}
            </button>
          </div>
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Date From</label>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="input-soft w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Date To</label>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="input-soft w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Status</label>
                <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="input-soft w-full">
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="new">New</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Assigned User/Team</label>
                <input type="text" placeholder="e.g. Ahmed / Team A" value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} className="input-soft w-full" />
              </div>
            </div>
          )}
          <div className="pt-2 flex items-center gap-3">
            <button onClick={onExport} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">تصدير</button>
            {status === 'processing' && <span className="text-sm text-blue-400">جارٍ التصدير...</span>}
            {status === 'success' && <span className="text-sm text-green-400">تم إنشاء الملف.</span>}
            {status === 'error' && <span className="text-sm text-red-400">حدث خطأ أثناء التصدير.</span>}
            {downloadUrl && <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-300 underline">فتح الملف</a>}
          </div>
        </div>
      </div>
    </Layout>
  )
}