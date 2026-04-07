import { useEffect, useState } from 'react'
import {
  GripVertical, ChevronDown, BarChart2, List, Link as LinkIcon
} from 'lucide-react'
import { motion } from 'framer-motion'

import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import { api } from '../../utils/api'
import IconSelector, { ICON_MAP } from './IconSelector'

function sortByOrder(list) {
  return [...list].sort((a, b) => Number(a.order) - Number(b.order))
}

const DEFAULT_TYPE_OPTIONS = ['cold_calls', 'follow_up', 'meeting', 'proposal', 'reservation', 'rent', 'closing_deals', 'cancel']

function normalizeStages(list) {
  const arr = Array.isArray(list) ? list : []
  return arr.map(s => ({
    id: s?.id,
    name: s?.name || '',
    nameAr: s?.name_ar || s?.nameAr || '',
    type: s?.type || 'follow_up',
    notifyTime: s?.notify_time || s?.notifyTime || '',
    delayTime: Number(s?.delay_time ?? s?.delayTime ?? 0),
    order: s?.order ?? 0,
    color: s?.color || '#3B82F6',
    icon: s?.icon || 'BarChart2',
    iconUrl: s?.iconUrl || '',
  }))
}

function StageTableRow({ s, idx, editingIndex, setEditingIndex, onUpdate, onDelete, t, onHandleDragStart, onHandleDragEnd }) {
  const isEditing = editingIndex === idx
  const [editState, setEditState] = useState({ ...s })

  useEffect(() => {
    if (isEditing) {
      setEditState({ ...s })
    }
  }, [isEditing, s])

  const handleSave = () => {
    onUpdate(s.id, editState)
    setEditingIndex(null)
  }

  return (
    <>
      <td className="p-2 w-8 text-center">
        <div
          className="drag-handle cursor-move inline-flex items-center justify-center p-1 text-gray-400 hover:text-gray-600"
          draggable
          onDragStart={onHandleDragStart}
          onDragEnd={onHandleDragEnd}
        >
           <GripVertical size={16} />
        </div>
      </td>
      <td className="p-2">
        {isEditing ? (
          <input
            className="w-full border rounded p-1"
            value={editState.name}
            onChange={e => setEditState({ ...editState, name: e.target.value })}
          />
        ) : (
          s.name
        )}
      </td>
      <td className="p-2">
        {isEditing ? (
          <input
            className="w-full border rounded p-1"
            value={editState.nameAr}
            onChange={e => setEditState({ ...editState, nameAr: e.target.value })}
          />
        ) : (
          s.nameAr || ''
        )}
      </td>
      <td className="p-2">
        {isEditing ? (
          <select
            className="w-full border rounded p-1"
            value={editState.type}
            onChange={e => setEditState({ ...editState, type: e.target.value })}
          >
            {DEFAULT_TYPE_OPTIONS.map(k => (
              <option key={k} value={k}>{t(k)}</option>
            ))}
          </select>
        ) : (
          t(s.type)
        )}
      </td>
      <td className="p-2">
        {isEditing ? (
          <input
            className="w-full border rounded p-1"
            value={editState.notifyTime || ''}
            onChange={e => setEditState({ ...editState, notifyTime: e.target.value })}
            placeholder="00:15:00"
          />
        ) : (
          s.notifyTime || ''
        )}
      </td>
      <td className="p-2">
        {isEditing ? (
          <input
            className="w-full border rounded p-1"
            type="number"
            min={0}
            value={Number(editState.delayTime || 0)}
            onChange={e => setEditState({ ...editState, delayTime: Number(e.target.value || 0) })}
          />
        ) : (
          String(Number(s.delayTime || 0))
        )}
      </td>
      <td className="p-2">
        {isEditing ? (
          <input
            className="border rounded p-0 h-8 w-12"
            type="color"
            value={editState.color || '#3B82F6'}
            onChange={e => setEditState({ ...editState, color: e.target.value })}
          />
        ) : (
          <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: s.color || '#3B82F6' }}></span>
        )}
      </td>
      <td className="p-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <IconSelector
              value={editState.icon || 'BarChart2'}
              onChange={val => setEditState({ ...editState, icon: val, iconUrl: '' })}
            />
          </div>
        ) : (
          s.iconUrl ? (
            <img src={s.iconUrl} alt="icon" className="w-6 h-6 inline-block rounded" />
          ) : (
            <span className="text-lg inline-block">
              {(() => {
                const Icon = ICON_MAP[s.icon] || BarChart2
                return <Icon className="w-5 h-5" />
              })()}
            </span>
          )
        )}
      </td>
      <td className="p-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded bg-green-600 text-white"
              onClick={handleSave}
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
              onClick={() => onDelete(s.id)}
            >{t('Delete')}</button>
          </div>
        )}
      </td>
    </>
  )
}

function PipelineStagesManager() {
  const { t, i18n } = useTranslation()
  const { theme, resolvedTheme } = useTheme()
  const isLight = resolvedTheme !== 'dark'
  const isRtl = String(i18n.language || '').startsWith('ar')

  const [pipelineStages, setPipelineStages] = useState([])
  const [newStage, setNewStage] = useState({ name: '', nameAr: '', type: 'follow_up', notifyTime: '', delayTime: 0, order: '', color: '#3B82F6', icon: 'BarChart2', iconUrl: '' })
  const [iconInputMode, setIconInputMode] = useState('select') // 'select' | 'url'
  const [editingIndex, setEditingIndex] = useState(null)
  const [showNewStage, setShowNewStage] = useState(false)

  const fetchStages = async () => {
    try {
      const { data } = await api.get('/api/stages')
      setPipelineStages(normalizeStages(sortByOrder(data)))
    } catch (err) {
      console.error('Failed to fetch stages', err)
    }
  }

  const [draggedId, setDraggedId] = useState(null)

  const moveStage = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return

    setPipelineStages((prev) => {
      const fromIndex = prev.findIndex(s => s.id === fromId)
      const toIndex = prev.findIndex(s => s.id === toId)
      if (fromIndex === -1 || toIndex === -1) return prev

      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next.map((s, idx) => ({ ...s, order: idx + 1 }))
    })
  }

  const persistOrder = async (stages) => {
    const stagesToUpdate = (Array.isArray(stages) ? stages : []).map((s, idx) => ({
      id: s.id,
      order: idx + 1
    }))

    try {
      await api.post('/api/stages/reorder', { stages: stagesToUpdate })
    } catch (err) {
      console.error('Failed to reorder stages', err)
      await fetchStages()
    }
  }

  const handleHandleDragStart = (e, stageId) => {
    setDraggedId(stageId)
    try {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(stageId))
    } catch {}
  }

  const handleHandleDragEnd = async () => {
    setDraggedId(null)
    await persistOrder(pipelineStages)
  }

  useEffect(() => {
    fetchStages()
  }, [])

  const headerClass = resolvedTheme === 'dark' ? 'bg-[#0b2b4f]' : 'bg-gray-100'
  const thBase = 'text-left p-2 border-b'
  const thTone = resolvedTheme === 'dark' ? ' border-gray-700 text-white/80' : ''

  const addStage = async () => {
    if (!newStage.name.trim()) return
    
    try {
      const payload = {
        name: newStage.name.trim(),
        name_ar: String(newStage.nameAr || '').trim(),
        type: newStage.type,
        notify_time: String(newStage.notifyTime || '').trim() || null,
        delay_time: Number(newStage.delayTime || 0),
        order: pipelineStages.length + 1,
        color: newStage.color,
        icon: newStage.icon
        // iconUrl is not supported in backend yet
      }
      
      await api.post('/api/stages', payload)
      
      await fetchStages() // Reload from DB
      
      setNewStage({ name: '', nameAr: '', type: 'follow_up', notifyTime: '', delayTime: 0, order: '', color: '#3B82F6', icon: 'BarChart2', iconUrl: '' })
      setIconInputMode('select')
      setShowNewStage(false)
    } catch (err) {
      console.error('Failed to create stage', err)
      alert(t('Failed to create stage'))
    }
  }

  const handleUpdateStage = async (id, updatedData) => {
    try {
      const payload = {
        name: updatedData.name,
        name_ar: updatedData.nameAr,
        type: updatedData.type,
        notify_time: String(updatedData.notifyTime || '').trim() || null,
        delay_time: Number(updatedData.delayTime || 0),
        order: updatedData.order,
        color: updatedData.color,
        icon: updatedData.icon
      }
      await api.put(`/api/stages/${id}`, payload)
      await fetchStages()
    } catch (err) {
      console.error('Failed to update stage', err)
      alert(t('Failed to update stage'))
    }
  }

  const handleDeleteStage = async (id) => {
    if (!window.confirm(t('Are you sure you want to delete this stage?'))) return
    try {
      await api.delete(`/api/stages/${id}`)
      await fetchStages()
    } catch (err) {
      console.error('Failed to delete stage', err)
      alert(t('Failed to delete stage'))
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`}>{t('Pipeline Setup Stages')}</div>
        <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => setShowNewStage(v => !v)}>
          {t('New Stage')}
        </button>
      </div>

      {showNewStage && (
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 md:col-span-4 flex flex-col gap-1">
            <span className="text-xs font-medium opacity-70">{t('Stage Name')}</span>
            <input
              className={`w-full border rounded p-2 dark:bg-gray-800 ${isLight ? 'text-black' : 'text-white'}`}
              placeholder={t('Stage Name')}
              value={newStage.name}
              onChange={e => setNewStage(s => ({ ...s, name: e.target.value }))}
            />
          </div>
          <div className="col-span-12 md:col-span-4 flex flex-col gap-1">
            <span className="text-xs font-medium opacity-70">{t('Stage Name (Arabic)')}</span>
            <input
              className={`w-full border rounded p-2 dark:bg-gray-800 ${isLight ? 'text-black' : 'text-white'}`}
              placeholder={t('Stage Name (Arabic)')}
              value={newStage.nameAr}
              onChange={e => setNewStage(s => ({ ...s, nameAr: e.target.value }))}
            />
          </div>
          <div className="col-span-12 md:col-span-4 flex flex-col gap-1">
            <span className="text-xs font-medium opacity-70">{t('Stage Type')}</span>
            <div className="relative">
              <select
                className={`w-full border rounded p-2 pr-10 dark:bg-gray-800 ${isLight ? 'text-black' : 'text-white'}`}
                value={newStage.type}
                onChange={e => setNewStage(s => ({ ...s, type: e.target.value }))}
              >
                {DEFAULT_TYPE_OPTIONS.map(k => (
                  <option key={k} value={k}>{t(k)}</option>
                ))}
              </select>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                onMouseDown={e => {
                  const el = e.currentTarget.previousElementSibling
                  if (el && typeof el.focus === 'function') el.focus()
                }}
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="col-span-12 grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 md:col-span-6 flex flex-col gap-1">
            <span className="text-xs font-medium opacity-70">{t('Notify Time')}</span>
            <input
              className={`w-full border rounded p-2 dark:bg-gray-800 ${isLight ? 'text-black' : 'text-white'}`}
              placeholder="00:15:00"
              value={newStage.notifyTime || ''}
              onChange={e => setNewStage(s => ({ ...s, notifyTime: e.target.value }))}
            />
          </div>
          <div className="col-span-12 md:col-span-6 flex flex-col gap-1">
            <span className="text-xs font-medium opacity-70">{t('Delay Time')}</span>
            <input
              type="number"
              min={0}
              className={`w-full border rounded p-2 dark:bg-gray-800 ${isLight ? 'text-black' : 'text-white'}`}
              value={Number(newStage.delayTime || 0)}
              onChange={e => setNewStage(s => ({ ...s, delayTime: Number(e.target.value || 0) }))}
            />
          </div>
        </div>
        <div className="col-span-12 grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 sm:col-span-6 md:col-span-3 flex flex-col gap-1">
            <span className="text-xs font-medium opacity-70">{t('Stage Color')}</span>
            <div className="flex items-center gap-2">
              <input
                className="border rounded p-0 h-10 w-16"
                type="color"
                value={newStage.color}
                onChange={e => setNewStage(s => ({ ...s, color: e.target.value }))}
              />
              <span className="text-xs opacity-70">{newStage.color}</span>
            </div>
          </div>
          <div className="col-span-12 md:col-span-6 flex flex-col gap-1">
            <span className="text-xs font-medium opacity-70">{t('Stage Icon')}</span>
            <div className="flex items-center border rounded p-1 dark:bg-gray-800 dark:border-gray-700 bg-white">
              {iconInputMode === 'url' ? (
                <input 
                  type="text" 
                  placeholder={t('Paste')} 
                  className={`flex-1 min-w-0 bg-transparent border-none focus:ring-0 p-2 text-sm ${isLight ? 'text-black' : 'text-white'}`}
                  value={newStage.iconUrl || ''}
                  onChange={(e) => setNewStage(s => ({ ...s, iconUrl: e.target.value }))}
                />
              ) : (
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <IconSelector
                    value={newStage.icon || 'BarChart2'}
                    onChange={val => setNewStage(s => ({ ...s, icon: val, iconUrl: '' }))}
                  />
                </div>
              )}

              <div className="flex items-center gap-1 border-l pl-1 dark:border-gray-700">
                {/* Preview */}
                <div className="w-8 h-8 flex items-center justify-center rounded bg-gray-50 dark:bg-gray-700 overflow-hidden">
                  {newStage.iconUrl ? (
                    <img src={newStage.iconUrl} alt="icon" className="w-full h-full object-contain" />
                  ) : (
                    <span className={`${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                      {(() => {
                        const Icon = ICON_MAP[newStage.icon] || BarChart2
                        return <Icon className="w-5 h-5" />
                      })()}
                    </span>
                  )}
                </div>

                {/* Toggle Mode */}
                <button 
                  type="button"
                  title={iconInputMode === 'url' ? t('Select from list') : t('Paste')}
                  className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}
                  onClick={() => {
                    const nextMode = iconInputMode === 'url' ? 'select' : 'url'
                    setIconInputMode(nextMode)
                    // If switching to select mode, clear URL
                    if (nextMode === 'select') {
                      setNewStage(s => ({ ...s, iconUrl: '' }))
                    }
                  }}
                >
                  {iconInputMode === 'url' ? <List size={16} /> : <LinkIcon size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-12 flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white" onClick={addStage}>{t('Save')}</button>
        </div>
      </div>
      )}

      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded">
          <thead className={headerClass}>
            <tr>
              <th className={`${thBase}${thTone} w-8`}>
                <GripVertical className="mx-auto text-gray-400" size={16} />
              </th>
              <th className={`${thBase}${thTone}`}>{t('Stage Name')}</th>
              <th className={`${thBase}${thTone}`}>{t('Stage Name (Arabic)')}</th>
              <th className={`${thBase}${thTone}`}>{t('Stage Type')}</th>
              <th className={`${thBase}${thTone}`}>{t('Notify Time')}</th>
              <th className={`${thBase}${thTone}`}>{t('Delay Time')}</th>
              <th className={`${thBase}${thTone}`}>{t('Stage Color')}</th>
              <th className={`${thBase}${thTone}`}>{t('Stage Icon')}</th>
              <th className={`${thBase}${thTone}`}>{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pipelineStages.map((s, idx) => (
              <motion.tr
                key={`stage-${s.id || idx}-${s.name}`}
                className={`border-t ${draggedId === s.id ? 'opacity-50' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => {
                  if (draggedId) moveStage(draggedId, s.id)
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <StageTableRow
                  s={s}
                  idx={idx}
                  editingIndex={editingIndex}
                  setEditingIndex={setEditingIndex}
                  onUpdate={handleUpdateStage}
                  onDelete={handleDeleteStage}
                  t={t}
                  onHandleDragStart={(e) => handleHandleDragStart(e, s.id)}
                  onHandleDragEnd={handleHandleDragEnd}
                />
              </motion.tr>
            ))}
            {pipelineStages.length === 0 && (
              <tr>
                <td className="p-2 text-[var(--muted-text)]" colSpan={9}>{t('No data')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {pipelineStages.length === 0 ? (
          <div className="p-4 text-sm text-[var(--muted-text)] border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
            {t('No data')}
          </div>
        ) : (
          pipelineStages.map((s, idx) => (
            <div
              key={`stage-card-${s.id || idx}-${s.name}`}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`}>
                    {s.name || t('Stage Name')}
                  </div>
                  {s.nameAr ? (
                    <div className="text-xs text-[var(--muted-text)] mt-0.5">
                      {s.nameAr}
                    </div>
                  ) : null}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {t(s.type)}
                </span>
              </div>

              <div className={`mt-3 grid grid-cols-2 gap-2 text-xs ${isLight ? 'text-black' : 'text-white'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t('Stage Color')}</span>
                  <span
                    className="inline-block w-4 h-4 rounded"
                    style={{ backgroundColor: s.color || '#3B82F6' }}
                  ></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t('Notify Time')}</span>
                  <span className="text-[var(--muted-text)]">{s.notifyTime || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t('Delay Time')}</span>
                  <span className="text-[var(--muted-text)]">{String(Number(s.delayTime || 0))}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ConfigurationManager() {
  const { t, i18n } = useTranslation()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme !== 'dark'
  const isRtl = String(i18n.language || '').startsWith('ar')

  return (
    <div className={`px-2 max-[480px]:px-1 py-4 md:px-6 md:py-6 min-h-screen ${isLight ? 'text-black' : 'text-white'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={`p-4 flex justify-between items-center gap-4 mb-6`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={`relative inline-flex items-center ${isRtl ? 'flex-row-reverse' : ''} gap-2`}>
          <h1 className={`page-title text-2xl md:text-3xl font-bold ${isLight ? 'text-black' : 'text-white'} flex items-center gap-2 ${isRtl ? 'text-right' : 'text-left'}`} style={{ textAlign: isRtl ? 'right' : 'left' }}>
            {t('Pipeline Stages Setup')}
          </h1>
          <span aria-hidden className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" style={{ width: 'calc(100% + 8px)', left: isRtl ? 'auto' : '-4px', right: isRtl ? '-4px' : 'auto', bottom: '-4px' }}></span>
        </div>
      </div>

      <div className="animate-fadeIn">
        <PipelineStagesManager />
      </div>
    </div>
  )
}

export default ConfigurationManager
