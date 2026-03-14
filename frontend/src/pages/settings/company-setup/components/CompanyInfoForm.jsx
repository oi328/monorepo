import { useState, useEffect } from 'react'

export default function CompanyInfoForm({ initial, onChange }) {
  const [form, setForm] = useState(initial || { companyName: '', industry: '', address: '', phone: '', logoUrl: '' })

  useEffect(() => { setForm(initial || { companyName: '', industry: '', address: '', phone: '', logoUrl: '' }) }, [initial])

  const update = (key, value) => {
    const next = { ...form, [key]: value }
    setForm(next)
    onChange && onChange(next)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label className="flex flex-col">
        <span className="text-sm text-gray-600">Company Name</span>
        <input className="input" value={form.companyName} onChange={e => update('companyName', e.target.value)} />
      </label>
      <label className="flex flex-col">
        <span className="text-sm text-gray-600">Industry</span>
        <input className="input" value={form.industry} onChange={e => update('industry', e.target.value)} />
      </label>
      <label className="flex flex-col md:col-span-2">
        <span className="text-sm text-gray-600">Address</span>
        <input className="input" value={form.address} onChange={e => update('address', e.target.value)} />
      </label>
      <label className="flex flex-col">
        <span className="text-sm text-gray-600">Phone</span>
        <input className="input" value={form.phone} onChange={e => update('phone', e.target.value)} />
      </label>
      <label className="flex flex-col">
        <span className="text-sm text-gray-600">Logo URL</span>
        <input className="input" value={form.logoUrl} onChange={e => update('logoUrl', e.target.value)} />
      </label>
    </div>
  )
}