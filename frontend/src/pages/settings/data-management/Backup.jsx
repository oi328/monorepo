import { useEffect, useState } from 'react'
import { api } from '../../../utils/api'

export default function Backup() {
  const [backups, setBackups] = useState([])
  const [generating, setGenerating] = useState(false)
  const [schedule, setSchedule] = useState({ frequency: 'daily', time: '02:00' })
  const [savingSchedule, setSavingSchedule] = useState(false)

  const loadBackups = async () => {
    try {
      const resp = await api.get('/api/backups')
      setBackups(resp.data.items || [])
    } catch (_) {}
  }

  useEffect(() => { loadBackups() }, [])

  const generateBackup = async () => {
    try {
      setGenerating(true)
      const resp = await api.post('/api/backups', { name: 'full-backup' })
      const item = resp.data.item
      setBackups((prev) => [item, ...prev])
    } catch (_) {}
    setGenerating(false)
  }

  const deleteBackup = async (id) => {
    try {
      await api.delete(`/api/backups/${id}`)
      setBackups((prev) => prev.filter((b) => b.id !== id))
    } catch (_) {}
  }

  const saveSchedule = async () => {
    try {
      setSavingSchedule(true)
      await api.post('/api/backups/schedule', schedule)
    } catch (_) {}
    setSavingSchedule(false)
  }

  return (
    <Layout title="Backup Management">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Backup Management</h1>
            <p className="text-sm text-[var(--muted-text)]">إنشاء نسخ احتياطية كاملة، تحميلها أو حذفها، وضبط الجدولة.</p>
          </div>
          <button onClick={generateBackup} disabled={generating} className={`px-3 py-2 rounded-lg ${generating?'bg-gray-600':'bg-green-600 hover:bg-green-700'} text-white`}>
            {generating ? 'Generating…' : 'Generate Full Backup'}
          </button>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-base font-semibold mb-3">Available Backups</h3>
          {backups.length === 0 ? (
            <div className="text-sm text-[var(--muted-text)]">No backups yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Size</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id} className="border-t border-gray-700/40">
                      <td className="px-3 py-2">{b.name}</td>
                      <td className="px-3 py-2">{new Date(b.date).toLocaleString()}</td>
                      <td className="px-3 py-2">{Math.round((b.size || 0)/1024)} KB</td>
                      <td className="px-3 py-2 flex gap-2">
                        <a href={b.url} target="_blank" rel="noreferrer" className="text-blue-400 underline">Download</a>
                        <button onClick={()=>deleteBackup(b.id)} className="text-red-400">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-base font-semibold mb-3">Scheduled Backups</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Frequency</label>
              <select value={schedule.frequency} onChange={e=>setSchedule((s)=>({ ...s, frequency: e.target.value }))} className="input-soft w-full">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Time</label>
              <input type="time" value={schedule.time} onChange={e=>setSchedule((s)=>({ ...s, time: e.target.value }))} className="input-soft w-full" />
            </div>
            <div className="flex items-end">
              <button onClick={saveSchedule} disabled={savingSchedule} className={`px-3 py-2 rounded-lg ${savingSchedule?'bg-gray-600':'bg-blue-600 hover:bg-blue-700'} text-white`}>Save Schedule</button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}