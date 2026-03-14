import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../utils/api'
import { useAppState } from '../shared/context/AppStateProvider'

export default function SupportTickets() {
  const { t } = useTranslation()
  const { user } = useAppState()

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const supportModulePerms = Array.isArray(modulePermissions.Support) ? modulePermissions.Support : []

  const effectiveSupportPerms = supportModulePerms.length ? supportModulePerms : (() => {
    const role = user?.role || ''
    if (role === 'Sales Admin') return ['showModule']
    if (role === 'Operation Manager') return ['showModule', 'addTickets', 'sla', 'reports']
    if (role === 'Branch Manager') return ['showModule']
    if (role === 'Director') return ['showModule']
    if (role === 'Support Manager') return ['showModule', 'addTickets', 'sla', 'reports', 'exportReports', 'deleteTickets']
    if (role === 'Support Team Leader') return ['showModule', 'addTickets', 'sla', 'reports']
    if (role === 'Support Agent') return ['showModule', 'addTickets']
    return []
  })()

  const roleLower = String(user?.role || '').toLowerCase()
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'

  const canViewSupportTickets =
    effectiveSupportPerms.includes('showModule') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  const canAddTicket =
    effectiveSupportPerms.includes('addTickets') ||
    user?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director')

  if (!canViewSupportModule) {
    return (
      <div className="p-6 text-center text-sm text-red-500">
        {t('You do not have permission to view support tickets.')}
      </div>
    )
  }

  // حالات وفق المواصفات
  const statusOptions = ['Open', 'In Progress', 'Escalated', 'Closed']
  const priorityOptions = ['Low', 'Medium', 'High', 'Urgent']
  const typeOptions = ['Complaint', 'Inquiry', 'Request']
  const channelOptions = ['Email', 'Phone', 'WhatsApp', 'Customer Portal', 'Social Media']

  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('')
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  // نموذج إنشاء
  const [form, setForm] = useState({
    customerId: '',
    subject: '',
    description: '',
    type: typeOptions[1],
    priority: 'Low',
    status: 'Open',
    channel: 'Email',
    contactPhone: '',
    contactEmail: '',
    contactWhatsapp: '',
    assignedAgent: '',
    slaDeadline: '',
    resolutionNotes: '',
    attachments: [],
  })
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(false)

  const overdue = (item) => {
    if (!item?.slaDeadline) return false
    if (String(item.status) === 'Closed') return false
    try {
      return new Date(item.slaDeadline) < new Date()
    } catch { return false }
  }

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (selectedStatus) params.status = selectedStatus
      if (query) params.q = query
      const r = await api.get('/api/tickets', { params })
      setTickets(Array.isArray(r.data?.items) ? r.data.items : [])
    } catch (e) {
      console.warn('tickets_load_failed', e)
    } finally {
      setLoading(false)
    }
  }, [selectedStatus, query])

  useEffect(() => { loadTickets() }, [loadTickets])

  const searchCustomers = useCallback(async () => {
    try {
      setCustomersLoading(true)
      const r = await api.get('/api/customers', { params: { q: customerSearch, limit: 10 } })
      setCustomers(Array.isArray(r.data?.items) ? r.data.items : [])
    } catch (e) {
      console.warn('customers_load_failed', e)
    } finally {
      setCustomersLoading(false)
    }
  }, [customerSearch])

  useEffect(() => { searchCustomers() }, [searchCustomers])

  const onPickCustomer = (id) => setForm(prev => ({ ...prev, customerId: id }))
  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const onUploadAttachment = async (file) => {
    if (!file) return
    try {
      const toBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(f)
      })
      const dataUrl = await toBase64(file)
      const r = await api.post('/api/uploads/base64', { fileName: file.name, dataUrl })
      const url = r.data?.url
      if (url) setForm(prev => ({ ...prev, attachments: [...prev.attachments, url] }))
    } catch (e) {
      console.warn('upload_failed', e)
    }
  }

  const onCreate = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form }
      // تحويل الـ datetime-local إلى ISO إن وُجد
      if (payload.slaDeadline) {
        try { payload.slaDeadline = new Date(payload.slaDeadline).toISOString() } catch (e) { void e }
      }
      const r = await api.post('/api/tickets', payload)
      const item = r.data?.item
      if (item) setTickets((prev) => [item, ...prev])
      setShowCreate(false)
      setForm({
        customerId: '', subject: '', description: '', type: typeOptions[1], priority: 'Low', status: 'Open', channel: 'Email',
        contactPhone: '', contactEmail: '', contactWhatsapp: '', assignedAgent: '', slaDeadline: '', resolutionNotes: '', attachments: [],
      })
    } catch (e) {
      console.warn('create_failed', e)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('Tickets')}</h1>
        {canAddTicket && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            {t('Create New Ticket')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' ? loadTickets() : null}
          placeholder={t('Search tickets...')}
          className="px-3 py-1 rounded bg-white/5 border border-white/10 text-sm"
        />
        {statusOptions.map(s => (
          <button
            key={s}
            onClick={() => setSelectedStatus(prev => prev === s ? '' : s)}
            className={`px-3 py-1 rounded text-sm ${selectedStatus === s ? 'bg-blue-600' : 'bg-white/10 dark:bg-gray-800/40'}`}
          >{t(s)}</button>
        ))}
        <button onClick={loadTickets} className="px-3 py-1 rounded bg-white/10 text-sm">{t('Apply')}</button>
      </div>

      <div className="card p-4 sm:p-6 bg-transparent" style={{ backgroundColor: 'transparent' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left opacity-70">
              <th className="py-2">{t('ID')}</th>
              <th className="py-2">{t('Customer')}</th>
              <th className="py-2">{t('Subject')}</th>
              <th className="py-2">{t('Agent')}</th>
              <th className="py-2">{t('Type')}</th>
              <th className="py-2">{t('Priority')}</th>
              <th className="py-2">{t('Status')}</th>
              <th className="py-2">{t('Channel')}</th>
              <th className="py-2">{t('SLA')}</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((it) => (
              <tr key={it.id} className="border-t border-white/10">
                <td className="py-2">{String(it.ticketNumber || it.id).slice(0, 12)}</td>
                <td className="py-2">{it.customerId ? it.customerId : '-'}</td>
                <td className="py-2">{it.subject}</td>
                <td className="py-2">{it.assignedAgent || '-'}</td>
                <td className="py-2">{it.type}</td>
                <td className="py-2">{it.priority}</td>
                <td className="py-2">{it.status}</td>
                <td className="py-2">{it.channel}</td>
                <td className={`py-2 ${overdue(it) ? 'text-red-500' : ''}`}>{it.slaDeadline ? new Date(it.slaDeadline).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="mt-3 text-sm opacity-70">{t('Loading...')}</div>}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-start" style={{ paddingTop: '80px' }}>
          <div className="bg-gray-900 p-4 sm:p-6 rounded w-full max-w-2xl max-h-[80vh] overflow-auto sidebar-scrollbar">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{t('Create New Ticket')}</h2>
              <button onClick={() => setShowCreate(false)} className="px-3 py-1 rounded bg-white/10">{t('Close')}</button>
            </div>
            <form onSubmit={onCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">{t('Customer')}</label>
                <div className="flex gap-2">
                  <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder={t('Search customers...')} className="flex-1 px-3 py-2 rounded bg-white/5 border border-white/10" />
                  <SearchableSelect value={form.customerId} onChange={(v) => onPickCustomer(v)} className="px-3 py-2">
                    <option value="">{t('Select')}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                    ))}
                  </SearchableSelect>
                </div>
                {customersLoading && <div className="text-xs mt-1 opacity-70">{t('Loading customers...')}</div>}
              </div>

              <div>
                <label className="block text-sm mb-1">{t('Subject')}</label>
                <input value={form.subject} onChange={(e) => setField('subject', e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Type')}</label>
                <SearchableSelect value={form.type} onChange={(v) => setField('type', v)}>
                  {typeOptions.map((x) => <option key={x} value={x}>{t(x)}</option>)}
                </SearchableSelect>
              </div>

              <div>
                <label className="block text-sm mb-1">{t('Priority')}</label>
                <SearchableSelect value={form.priority} onChange={(v) => setField('priority', v)}>
                  {priorityOptions.map((x) => <option key={x} value={x}>{t(x)}</option>)}
                </SearchableSelect>
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Status')}</label>
                <SearchableSelect value={form.status} onChange={(v) => setField('status', v)}>
                  {statusOptions.map((x) => <option key={x} value={x}>{t(x)}</option>)}
                </SearchableSelect>
              </div>

              <div>
                <label className="block text-sm mb-1">{t('Channel')}</label>
                <SearchableSelect value={form.channel} onChange={(v) => setField('channel', v)}>
                  {channelOptions.map((x) => <option key={x} value={x}>{t(x)}</option>)}
                </SearchableSelect>
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Assigned To')}</label>
                <input value={form.assignedAgent} onChange={(e) => setField('assignedAgent', e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10" />
              </div>

              <div>
                <label className="block text-sm mb-1">{t('Contact Phone')}</label>
                <input value={form.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Contact Email')}</label>
                <input value={form.contactEmail} onChange={(e) => setField('contactEmail', e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('WhatsApp')}</label>
                <input value={form.contactWhatsapp} onChange={(e) => setField('contactWhatsapp', e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">{t('Description')}</label>
                <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={4} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">{t('SLA Deadline')}</label>
                <input type="datetime-local" value={form.slaDeadline} onChange={(e) => setField('slaDeadline', e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">{t('Resolution Notes')}</label>
                <textarea value={form.resolutionNotes} onChange={(e) => setField('resolutionNotes', e.target.value)} rows={3} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">{t('Attachments')}</label>
                <input type="file" onChange={(e) => onUploadAttachment(e.target.files?.[0])} className="w-full" />
                {!!form.attachments.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.attachments.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="text-blue-400 underline text-xs">{url}</a>
                    ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded bg-white/10">{t('Cancel')}</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600">{t('Create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
