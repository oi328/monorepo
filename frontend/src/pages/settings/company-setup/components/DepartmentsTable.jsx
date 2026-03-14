import { useMemo, useState } from 'react'

export default function DepartmentsTable({ departments, onAdd, onUpdate, onDelete }) {
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ name: '', role: 'Sales', users: 0 })

  const filtered = useMemo(() => (
    departments.filter(d => !q || `${d.name} ${d.role}`.toLowerCase().includes(q.toLowerCase()))
  ), [departments, q])

  const startEdit = (d) => { setEditing(d.id); setDraft({ name: d.name, role: d.role, users: d.users }) }
  const cancelEdit = () => { setEditing(null); setDraft({ name: '', role: 'Sales', users: 0 }) }
  const saveEdit = () => { onUpdate && onUpdate(editing, draft); cancelEdit() }

  const addDept = () => {
    if (!draft.name) return
    onAdd && onAdd({ ...draft })
    setDraft({ name: '', role: 'Sales', users: 0 })
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 mb-3">
        <input className="input w-full sm:w-64" placeholder="Search departments" value={q} onChange={e => setQ(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2 sm:gap-2">
          <input className="input w-full sm:w-auto" placeholder="Name" value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} />
          <select className="input w-full sm:w-auto" value={draft.role} onChange={e => setDraft(prev => ({ ...prev, role: e.target.value }))}>
            {['Sales','Ops','Finance'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="input w-24 sm:w-24" type="number" value={draft.users} onChange={e => setDraft(prev => ({ ...prev, users: Number(e.target.value || 0) }))} />
          <button className="px-3 py-2 bg-green-600 text-white rounded w-full sm:w-auto" onClick={addDept}>Add</button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="company-table nova-table w-full text-xs sm:text-sm min-w-[560px]">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Name</th>
              <th className="py-2">Role</th>
              <th className="py-2">Users</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id}>
                <td className="py-2">
                  {editing === d.id ? (
                  <input className="input w-full" value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} />
                  ) : d.name}
                </td>
                <td className="py-2">
                  {editing === d.id ? (
                  <select className="input w-full" value={draft.role} onChange={e => setDraft(prev => ({ ...prev, role: e.target.value }))}>
                    {['Sales','Ops','Finance'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  ) : d.role}
                </td>
                <td className="py-2">
                  {editing === d.id ? (
                  <input className="input w-24" type="number" value={draft.users} onChange={e => setDraft(prev => ({ ...prev, users: Number(e.target.value || 0) }))} />
                  ) : d.users}
                </td>
                <td className="py-2">
                  {editing === d.id ? (
                  <div className="flex gap-2">
                    <button className="px-2 py-1 bg-indigo-600 text-white rounded" onClick={saveEdit}>Save</button>
                    <button className="px-2 py-1 bg-gray-300 rounded" onClick={cancelEdit}>Cancel</button>
                  </div>
                  ) : (
                  <div className="flex gap-2">
                    <button className="px-2 py-1 bg-yellow-500 text-white rounded" onClick={() => startEdit(d)}>Edit</button>
                    <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => onDelete && onDelete(d.id)}>Delete</button>
                  </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile List View */}
      <div className="md:hidden space-y-3">
        {filtered.map(d => (
          <div key={d.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            {editing === d.id ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
                  <input className="input w-full" value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Role</label>
                  <select className="input w-full" value={draft.role} onChange={e => setDraft(prev => ({ ...prev, role: e.target.value }))}>
                    {['Sales','Ops','Finance'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Users</label>
                  <input className="input w-full" type="number" value={draft.users} onChange={e => setDraft(prev => ({ ...prev, users: Number(e.target.value || 0) }))} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button className="flex-1 py-2 bg-indigo-600 text-white rounded text-sm font-medium" onClick={saveEdit}>Save</button>
                  <button className="flex-1 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded text-sm font-medium" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{d.name}</h3>
                    <span className="inline-block px-2 py-0.5 mt-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                      {d.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button className="p-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg" onClick={() => startEdit(d)}>Edit</button>
                     <button className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg" onClick={() => onDelete && onDelete(d.id)}>Delete</button>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{d.users}</span> Users
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}