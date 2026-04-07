import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../../i18n'
import { getRotationSettings, updateRotationSettings } from '../../../services/rotationService'

export default function SettingsRotation() {
  const { t } = useTranslation()
  const isRTL = i18n.language === 'ar'

  // Defaults based on screenshot semantics
  const defaultPrefs = useMemo(() => ({
    allowAssignRotation: false,
    delayAssignRotation: false,
    workFrom: '00:00',
    workTo: '23:59',
    delayWorkFrom: '00:00',
    delayWorkTo: '23:59',
    reshuffleColdLeads: false,
    reshuffleColdLeadsNumber: 0,
  }), [])

  const [prefs, setPrefs] = useState(defaultPrefs)
  const [dirty, setDirty] = useState(false)

  // Load from API
  useEffect(() => {
    let mounted = true
    getRotationSettings()
      .then(data => {
        if (!mounted || !data) return
        const mapped = {
          allowAssignRotation: !!data.allow_assign_rotation,
          delayAssignRotation: !!data.delay_assign_rotation,
          workFrom: data.work_from || '00:00',
          workTo: data.work_to || '23:59',
          delayWorkFrom: data.delay_work_from || data.work_from || '00:00',
          delayWorkTo: data.delay_work_to || data.work_to || '23:59',
          reshuffleColdLeads: !!data.reshuffle_cold_leads,
          reshuffleColdLeadsNumber: Number(data.reshuffle_cold_leads_number || 0),
        }
        setPrefs(mapped)
        try {
          localStorage.setItem('rotationSettings', JSON.stringify(mapped))
        } catch {}
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [defaultPrefs])

  const update = (patch) => {
    setPrefs(prev => ({ ...prev, ...patch }))
    setDirty(true)
  }

  const save = async () => {
    const payload = {
      allow_assign_rotation: !!prefs.allowAssignRotation,
      delay_assign_rotation: !!prefs.delayAssignRotation,
      work_from: prefs.workFrom,
      work_to: prefs.workTo,
      delay_work_from: prefs.delayWorkFrom,
      delay_work_to: prefs.delayWorkTo,
      reshuffle_cold_leads: !!prefs.reshuffleColdLeads,
      reshuffle_cold_leads_number: Number(prefs.reshuffleColdLeadsNumber || 0),
    }
    const saved = await updateRotationSettings(payload)
    if (saved) {
      setDirty(false)
      try {
        localStorage.setItem('rotationSettings', JSON.stringify(prefs))
      } catch {}
    }
  }

  const reset = () => {
    setPrefs(defaultPrefs)
    setDirty(true)
  }

  const Toggle = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between py-3">
      <div className="text-sm text-[var(--content-text)] opacity-80">{label}</div>
      <label className="inline-flex items-center cursor-pointer">
        <input type="checkbox" className="hidden" checked={!!value} onChange={(e)=>onChange(e.target.checked)} />
        <span className={`w-11 h-6 flex items-center rounded-full p-1 transition ${value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
          <span className={`w-4 h-4 rounded-full bg-white transform transition ${value ? (isRTL ? '-translate-x-0 translate-x-0' : 'translate-x-5') : 'translate-x-0'}`}></span>
        </span>
        <span className="ml-2 text-sm">{value ? t('Yes') : t('No')}</span>
      </label>
    </div>
  )

  const TimeInput = ({ label, value, onChange, disabled }) => (
    <div className="flex items-center gap-3 py-2">
      <div className="text-sm text-[var(--content-text)] opacity-80 w-28">{label}</div>
      <input
        type="time"
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        disabled={disabled}
        className="px-3 py-2 rounded-lg border bg-gray-800/70 disabled:opacity-60"
      />
    </div>
  )

  const TimeRangeInput = ({ title, fromValue, toValue, onChangeFrom, onChangeTo, disabled }) => (
    <div className={`${isRTL ? 'text-right' : ''}`}>
      <div className="text-sm text-[var(--content-text)] opacity-80 mb-2">{title}</div>
      <div className=" gap-3">
        <TimeInput label={t('From')} value={fromValue} onChange={onChangeFrom} disabled={disabled} />
        <TimeInput label={t('To')} value={toValue} onChange={onChangeTo} disabled={disabled} />
      </div>
    </div>
  )

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
          <h2 className="text-2xl font-bold">{t('Rotation Settings')}</h2>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--panel-border)] p-3">
              <Toggle label={t('Allow Assign Rotation')} value={prefs.allowAssignRotation} onChange={(v)=>update({ allowAssignRotation: v })} />
              <TimeRangeInput
                title={t('Assign Working Hours')}
                fromValue={prefs.workFrom}
                toValue={prefs.workTo}
                onChangeFrom={(v)=>update({ workFrom: v })}
                onChangeTo={(v)=>update({ workTo: v })}
                disabled={!prefs.allowAssignRotation}
              />
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] p-3">
              <Toggle label={t('Delay Assign Rotation')} value={prefs.delayAssignRotation} onChange={(v)=>update({ delayAssignRotation: v })} />
              <TimeRangeInput
                title={t('Delay Working Hours')}
                fromValue={prefs.delayWorkFrom}
                toValue={prefs.delayWorkTo}
                onChangeFrom={(v)=>update({ delayWorkFrom: v })}
                onChangeTo={(v)=>update({ delayWorkTo: v })}
                disabled={!prefs.delayAssignRotation}
              />
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] p-3">
              <Toggle label={t('Reshuffle Cold Leads')} value={prefs.reshuffleColdLeads} onChange={(v)=>update({ reshuffleColdLeads: v })} />
              <div className="pt-2">
                <div className="text-sm text-[var(--content-text)] opacity-80 mb-2">{t('Reshuffle Cold Leads Number')}</div>
                <input
                  type="number"
                  min={0}
                  value={prefs.reshuffleColdLeadsNumber}
                  onChange={(e)=>update({ reshuffleColdLeadsNumber: Number(e.target.value || 0) })}
                  disabled={!prefs.reshuffleColdLeads}
                  className="w-full px-3 py-2 rounded-lg border bg-gray-800/70 disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--panel-border)] mt-4">
            <button className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100" onClick={reset}>{t('Reset')}</button>
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-50" disabled={!dirty} onClick={save}>{t('Save')}</button>
          </div>
        </div>
      </div>
    </>
  )
}
