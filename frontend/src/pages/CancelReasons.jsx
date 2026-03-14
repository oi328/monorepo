import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import { api } from '@utils/api'

function normalize(list) {
  const arr = Array.isArray(list) ? list : []
  return arr.map(r => ({
    id: r?.id,
    title: r?.title || '',
    title_ar: r?.title_ar || '',
  }))
}

function CancelReasonRow({ r, idx, editingIndex, setEditingIndex, reasons, setReasons, t, onSaveRow, onDeleteRow }) {
  const isEditing = editingIndex === idx
  return (
    <tr className="border-t">
      <td className="p-2">{idx + 1}</td>
      <td className="p-2">
        {isEditing ? (
          <input
            className="w-full border rounded p-1"
            value={r.title}
            onChange={e => {
              const next = [...reasons]
              next[idx] = { ...next[idx], title: e.target.value }
              setReasons(next)
            }}
          />
        ) : (
          r.title
        )}
      </td>
      <td className="p-2">
        {isEditing ? (
          <input
            className="w-full border rounded p-1"
            value={r.title_ar || ''}
            onChange={e => {
              const next = [...reasons]
              next[idx] = { ...next[idx], title_ar: e.target.value }
              setReasons(next)
            }}
          />
        ) : (
          r.title_ar || ''
        )}
      </td>
      <td className="p-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded bg-green-600 text-white"
              onClick={async () => {
                await onSaveRow(reasons[idx])
                setEditingIndex(null)
              }}
            >{t('Save')}</button>
            <button
              className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700"
              onClick={() => setEditingIndex(null)}
            >{t('Cancel')}</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded bg-blue-600 text-white"
              onClick={() => setEditingIndex(idx)}
            >{t('Edit')}</button>
            <button
              className="px-2 py-1 rounded bg-red-600 text-white"
              onClick={async () => {
                await onDeleteRow(r)
              }}
            >{t('Delete')}</button>
          </div>
        )}
      </td>
    </tr>
  )
}

export default function CancelReasons() {
  const { theme, resolvedTheme } = useTheme()
  const isLight = theme === 'light'
  const { t, i18n } = useTranslation()
  const isRtl = String(i18n.language || '').startsWith('ar')

  const [reasons, setReasons] = useState([])
  const [newReason, setNewReason] = useState({ title: '', title_ar: '' })
  const [editingIndex, setEditingIndex] = useState(null)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    const fetchReasons = async () => {
      try {
        const res = await api.get('/api/cancel-reasons')
        setReasons(normalize(res.data?.data || res.data))
      } catch (_) {
        setReasons([])
      }
    }
    fetchReasons()
  }, [])

  const headerClass = resolvedTheme === 'dark' ? 'bg-[#0b2b4f]' : 'bg-gray-100'
  const thBase = 'text-left p-2 border-b'
  const thTone = resolvedTheme === 'dark' ? ' border-gray-700 text-white/80' : ''

  const addReason = async () => {
    if (!newReason.title.trim()) return
    try {
      const payload = { title: newReason.title.trim(), title_ar: String(newReason.title_ar || '').trim() }
      const res = await api.post('/api/cancel-reasons', payload)
      const created = res.data?.data || res.data
      setReasons(prev => normalize([...(prev || []), created]))
      setNewReason({ title: '', title_ar: '' })
      setShowNew(false)
    } catch (_) {}
  }

  const saveRow = async (row) => {
    try {
      if (!row?.id) return
      const payload = { title: String(row.title || '').trim(), title_ar: String(row.title_ar || '').trim() }
      const res = await api.put(`/api/cancel-reasons/${row.id}`, payload)
      const updated = res.data?.data || res.data
      setReasons(prev => normalize((prev || []).map(r => (r.id === updated.id ? updated : r))))
    } catch (_) {}
  }

  const deleteRow = async (row) => {
    try {
      if (!row?.id) return
      await api.delete(`/api/cancel-reasons/${row.id}`)
      setReasons(prev => (prev || []).filter(r => r.id !== row.id))
    } catch (_) {}
  }

  return (
    <div className={`px-2 max-[480px]:px-1 py-4 md:px-6 md:py-6 min-h-screen ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={`p-4 flex justify-between items-center gap-4 mb-6`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={`relative inline-flex items-center gap-2`}>
          <h1 className={`page-title text-2xl md:text-3xl font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-black'} flex items-center gap-2 ${isRtl ? 'text-right' : 'text-left'}`} style={{ textAlign: isRtl ? 'right' : 'left' }}>
            {t('Cancel Reasons')}
          </h1>
          <span aria-hidden className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" style={{ width: 'calc(100% + 8px)', left: isRtl ? 'auto' : '-4px', right: isRtl ? '-4px' : 'auto', bottom: '-4px' }}></span>
        </div>
        <button className="px-3 py-2 rounded bg-blue-600 text-white bg-green-500 hover:bg-blue-500" onClick={() => setShowNew(v => !v)}>
            {t('Add Cancel Reason')}
        </button>
      </div>

      <div className="glass-panel rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{t('Cancel Reasons')}</div>

        </div>

        {showNew && (
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 grid grid-cols-12 gap-3 items-center">
            <div className="col-span-12 md:col-span-6 flex flex-col gap-1">
              <span className="text-xs font-medium opacity-70">{t('Reason Title')}</span>
              <input
                className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                placeholder={t('Reason Title')}
                value={newReason.title}
                onChange={e => setNewReason(s => ({ ...s, title: e.target.value }))}
              />
            </div>
            <div className="col-span-12 md:col-span-6 flex flex-col gap-1">
              <span className="text-xs font-medium opacity-70">{t('Reason Title (Arabic)')}</span>
              <input
                className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                placeholder={t('Reason Title (Arabic)')}
                value={newReason.title_ar}
                onChange={e => setNewReason(s => ({ ...s, title_ar: e.target.value }))}
              />
            </div>
          </div>
          <div className="col-span-12 flex items-center justify-end gap-2">
            <button className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white" onClick={addReason}>{t('Add')}</button>
          </div>
        </div>
        )}

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded">
            <thead className={headerClass}>
              <tr>
                <th className={`${thBase}${thTone}`}>{t('No.')}</th>
                <th className={`${thBase}${thTone}`}>{t('Reason Title')}</th>
                <th className={`${thBase}${thTone}`}>{t('Reason Title (Arabic)')}</th>
                <th className={`${thBase}${thTone}`}>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {reasons.map((r, idx) => (
                <CancelReasonRow
                  key={`reason-${r.id || idx}-${r.title}`}
                  r={r}
                  idx={idx}
                  editingIndex={editingIndex}
                  setEditingIndex={setEditingIndex}
                  reasons={reasons}
                  setReasons={setReasons}
                  t={t}
                  onSaveRow={saveRow}
                  onDeleteRow={deleteRow}
                />
              ))}
              {reasons.length === 0 && (
                <tr>
                  <td className="p-2 text-[var(--muted-text)]" colSpan={4}>{t('No cancel reasons yet. Add your first reason above.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {reasons.length === 0 ? (
            <div className="p-4 text-sm text-[var(--muted-text)] border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
              {t('No cancel reasons yet. Add your first reason above.')}
            </div>
          ) : (
            reasons.map((r, idx) => (
              <div
                key={`reason-card-${r.id || idx}-${r.title}`}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`font-semibold ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                      {r.title}
                    </div>
                    {r.title_ar ? (
                      <div className="text-xs text-[var(--muted-text)] mt-0.5">
                        {r.title_ar}
                      </div>
                    ) : null}
                  </div>
                  <span className="text-xs text-[var(--muted-text)]">
                    #{idx + 1}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
