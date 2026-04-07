import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Plus } from 'lucide-react'
import { api } from '@utils/api'
import SearchableSelect from '@components/SearchableSelect'
import { createRotationRule } from '@services/rotationRulesService'

const normalizeSource = (s) => {
  if (!s) return ''
  return String(s)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const toBool = (v) => {
  if (v === true) return true
  if (v === false) return false
  if (v === 1) return true
  if (v === 0) return false
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true
    if (s === '0' || s === 'false' || s === 'no' || s === 'off' || s === '') return false
  }
  return !!v
}

export default function RotationRuleModal({ open, onClose, user, type }) {
  const { i18n, t } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const isAssign = type === 'assign'

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState([])
  const [items, setItems] = useState([])
  const [sources, setSources] = useState([])
  const [regions, setRegions] = useState([])
  const [companyType, setCompanyType] = useState('')

  const [projectIds, setProjectIds] = useState([])
  const [itemIds, setItemIds] = useState([])
  const [sourceValues, setSourceValues] = useState([])
  const [regionValues, setRegionValues] = useState([])
  const [position, setPosition] = useState(1)
  const [isActive, setIsActive] = useState(true)

  const title = useMemo(() => {
    if (isAssign) return isArabic ? 'Assign Rotation' : 'Assign Rotation'
    return isArabic ? 'Delay Rotation' : 'Delay Rotation'
  }, [isArabic, isAssign])

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await api.get('/api/rotation-options')
      setCompanyType(res?.data?.company_type || '')
      setProjects(res?.data?.projects || [])
      setItems(res?.data?.items || [])
      setSources(res?.data?.sources || [])
      setRegions(res?.data?.regions || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [type, user?.id])

  useEffect(() => {
    if (!open) return
    fetchData()
  }, [open, fetchData])

  useEffect(() => {
    if (!open) return
    setProjectIds([])
    setItemIds([])
    setSourceValues([])
    setRegionValues([])
    setPosition(1)
    setIsActive(true)
  }, [open, type])

  const isGeneralTenant = useMemo(() => {
    return String(companyType || '').toLowerCase().trim() === 'general'
  }, [companyType])

  const projectOptions = useMemo(() => {
    return (projects || []).map(p => ({ value: String(p.id), label: p.name || `#${p.id}` }))
  }, [projects])

  const itemOptions = useMemo(() => {
    return (items || []).map(it => ({ value: String(it.id), label: it.name || `#${it.id}` }))
  }, [items])

  const sourceOptions = useMemo(() => {
    const raw = (sources || []).map(s => {
      const name = s?.name || s?.title || s?.value || ''
      const normalized = normalizeSource(name)
      return normalized ? { value: normalized, label: name } : null
    }).filter(Boolean)

    const seen = new Set()
    return raw.filter(o => {
      if (seen.has(o.value)) return false
      seen.add(o.value)
      return true
    })
  }, [sources])

  const regionOptions = useMemo(() => {
    return (regions || []).map(r => {
      const label = isArabic ? (r.name_ar || r.name_en || r.name || `#${r.id}`) : (r.name_en || r.name || `#${r.id}`)
      const value = String(r.name_en || r.name_ar || r.name || r.id)
      return { value, label }
    })
  }, [regions, isArabic])

  const saveRule = useCallback(async () => {
    if (!user?.id) {
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { type: 'error', message: isArabic ? 'المستخدم غير محدد' : 'User not selected' },
      }))
      return
    }
    setSaving(true)
    try {
      const useItem = String(companyType || '').toLowerCase().trim() === 'general'

      const settingsRes = await api.get('/api/rotation-settings')
      const settings = (settingsRes?.data && typeof settingsRes.data === 'object') ? settingsRes.data : {}
      const allowAssignEnabled = toBool(settings?.allow_assign_rotation)
      const delayAssignEnabled = toBool(settings?.delay_assign_rotation)

      if (type === 'assign' && !allowAssignEnabled) {
        const ok = window.confirm(isArabic
          ? 'الروتيشن غير مُفعّل (Assign Rotation). هل تريد تفعيله الآن؟'
          : 'Rotation is disabled (Assign Rotation). Enable it now?')
        if (!ok) {
          window.dispatchEvent(new CustomEvent('app:toast', {
            detail: { type: 'error', message: isArabic ? 'يرجى تفعيل Assign Rotation من الإعدادات أولاً' : 'Please enable Assign Rotation in settings first' },
          }))
          return
        }
        await api.put('/api/rotation-settings', { allow_assign_rotation: true })
      }

      if (type === 'delay' && !delayAssignEnabled) {
        const ok = window.confirm(isArabic
          ? 'الروتيشن غير مُفعّل (Delay Rotation). هل تريد تفعيله الآن؟'
          : 'Rotation is disabled (Delay Rotation). Enable it now?')
        if (!ok) {
          window.dispatchEvent(new CustomEvent('app:toast', {
            detail: { type: 'error', message: isArabic ? 'يرجى تفعيل Delay Rotation من الإعدادات أولاً' : 'Please enable Delay Rotation in settings first' },
          }))
          return
        }
        await api.put('/api/rotation-settings', { delay_assign_rotation: true })
      }

      const primaryIds = useItem ? (Array.isArray(itemIds) ? itemIds : []) : (Array.isArray(projectIds) ? projectIds : [])
      const sourcesList = Array.isArray(sourceValues) ? sourceValues : []

      const primaryValues = primaryIds.length ? primaryIds : [null]
      const sourceVals = sourcesList.length ? sourcesList : [null]

      const totalCombos = primaryValues.length * sourceVals.length
      if (totalCombos > 50) {
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: { type: 'error', message: isArabic ? 'عدد الاختيارات كبير جدًا. قلّل المشاريع/المنتجات أو المصادر.' : 'Too many selections. Reduce projects/items or sources.' },
        }))
        return
      }

      let okCount = 0
      let failCount = 0

      for (const pid of primaryValues) {
        for (const src of sourceVals) {
          try {
            const payload = {
              user_id: user.id,
              type,
              project_id: useItem ? null : (pid ? Number(pid) : null),
              item_id: useItem ? (pid ? Number(pid) : null) : null,
              source: src ? String(src) : null,
              regions: Array.isArray(regionValues) && regionValues.length ? regionValues : null,
              position: isAssign ? Number(position || 1) : null,
              is_active: !!isActive,
            }
            await createRotationRule(payload)
            okCount += 1
          } catch {
            failCount += 1
          }
        }
      }

      await fetchData()

      if (okCount > 0 && failCount === 0) {
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: { type: 'success', message: isArabic ? `تمت الإضافة بنجاح (${okCount})` : `Added successfully (${okCount})` },
        }))
      } else if (okCount > 0 && failCount > 0) {
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: { type: 'error', message: isArabic ? `تمت إضافة (${okCount}) وفشل (${failCount})` : `Added (${okCount}) and failed (${failCount})` },
        }))
      } else {
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: { type: 'error', message: isArabic ? 'فشل الإضافة' : 'Add failed' },
        }))
      }
    } catch {
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { type: 'error', message: isArabic ? 'فشل الإضافة' : 'Add failed' },
      }))
    } finally {
      setSaving(false)
    }
  }, [companyType, fetchData, isActive, isArabic, isAssign, itemIds, position, projectIds, regionValues, sourceValues, type, user?.id])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[210] bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full card max-w-2xl rounded-2xl bg-[var(--bg-primary)] border border-[var(--panel-border)] shadow-xl">
        <div className="p-4 border-b border-[var(--panel-border)] flex items-center justify-between gap-3">
          <div className="font-semibold text-theme-text">
            {title} — {user?.name || user?.fullName || user?.email || ''}
          </div>
          <button className="btn btn-circle btn-sm btn-ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="card p-4 space-y-4">
          <div className=" card grid grid-cols-12 gap-3">
            {!isGeneralTenant ? (
              <div className="col-span-12 md:col-span-4">
                <SearchableSelect
                  options={[{ value: '', label: isArabic ? 'الكل' : 'All' }, ...projectOptions]}
                  value={projectIds}
                  onChange={(v) => setProjectIds(v)}
                  placeholder={isArabic ? 'Select Project' : 'Select Project'}
                  label={isArabic ? 'المشروع' : 'Project'}
                  isRTL={isArabic}
                  multiple
                  showAllOption={false}
                />
              </div>
            ) : (
              <div className="col-span-12 md:col-span-4">
                <SearchableSelect
                  options={[{ value: '', label: isArabic ? 'الكل' : 'All' }, ...itemOptions]}
                  value={itemIds}
                  onChange={(v) => setItemIds(v)}
                  placeholder={isArabic ? 'اختر منتج' : 'Select Item'}
                  label={isArabic ? 'المنتج' : 'Item'}
                  isRTL={isArabic}
                  multiple
                  showAllOption={false}
                />
              </div>
            )}
            <div className="col-span-12 md:col-span-4">
              <SearchableSelect
                options={[{ value: '', label: isArabic ? 'الكل' : 'All' }, ...sourceOptions]}
                value={sourceValues}
                onChange={(v) => setSourceValues(v)}
                placeholder={isArabic ? 'Select Source' : 'Select Source'}
                label={isArabic ? 'المصدر' : 'Source'}
                isRTL={isArabic}
                multiple
                showAllOption={false}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <SearchableSelect
                options={regionOptions}
                value={regionValues}
                onChange={(v) => setRegionValues(v)}
                placeholder={isArabic ? 'Select Regions' : 'Select Regions'}
                label={isArabic ? 'المناطق' : 'Regions'}
                isRTL={isArabic}
                multiple
                showAllOption={false}
              />
            </div>

            {isAssign && (
              <div className="col-span-12 md:col-span-4">
                <label className="label-text text-xs opacity-70 mb-1 block">{isArabic ? 'Position in Rotation' : 'Position in Rotation'}</label>
                <input
                  type="number"
                  min={1}
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value || 1))}
                  className="w-full border rounded-lg p-2 bg-[var(--dropdown-bg)]"
                />
              </div>
            )}

            <div className="col-span-12 md:col-span-4 flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={!!isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className="text-sm text-theme-text">{isArabic ? 'Active' : 'Active'}</span>
            </div>

            <div className="col-span-12 md:col-span-4 flex items-center justify-end pt-5">
              <button
                className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                onClick={saveRule}
                disabled={saving || loading}
                type="button"
              >
                <Plus size={16} />
                {isArabic ? 'إضافة' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
