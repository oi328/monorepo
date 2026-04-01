import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../shared/context/ThemeProvider'
import {
  FaBuilding,
  FaCalendarAlt,
  FaClone,
  FaExclamationTriangle,
  FaPhone,
  FaTimes,
  FaUser,
  FaUserShield,
  FaWhatsapp,
} from 'react-icons/fa'
import TransferSalesModal from './TransferSalesModal'

// UI for resolving duplicates (duplicates are stored inside leads).
// Allows per-field selection between Original vs Duplicate, then:
// - Save Info: merge into original + delete duplicate (resolve-duplicate keep_duplicate)
// - Enable Duplicate: convert duplicate lead into normal lead (bulk-action enable_duplicate)
// - Transfer: re-assign original lead and delete duplicate (transfer with duplicate_id)
const CompareLeadsModal = ({ isOpen, onClose, duplicateLead, originalLead, onResolve, usersList = [] }) => {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const isRtl = i18n.language === 'ar'

  const [localOriginal, setLocalOriginal] = useState(originalLead)
  const [localDuplicate, setLocalDuplicate] = useState(duplicateLead)
  const [fieldSource, setFieldSource] = useState({})
  const [showTransferModal, setShowTransferModal] = useState(false)

  const getAssigneeName = (lead) => {
    if (!lead) return t('Unassigned')

    const explicit = lead.sales_person || lead.salesPerson
    if (explicit) return explicit

    const assignedObj = lead.assignedAgent || lead.assigned_to || lead.assignedTo
    if (typeof assignedObj === 'object' && assignedObj?.name) return assignedObj.name

    const assignedIdOrName = lead.assigned_to || lead.assignedTo
    if (usersList && usersList.length > 0) {
      const user = usersList.find(
        u => String(u.id) === String(assignedIdOrName) || u.name === assignedIdOrName
      )
      if (user) return user.name
    }

    return assignedIdOrName || t('Unassigned')
  }

  const getCreatorName = (lead) => {
    if (!lead) return '-'

    const candidate =
      lead?.creator?.name ||
      lead?.createdBy?.name ||
      lead?.created_by?.name ||
      lead?.created_by_name ||
      lead?.creator_name ||
      lead?.created_by ||
      lead?.createdBy ||
      lead?.creator

    if (typeof candidate === 'string') return candidate.trim() || '-'
    if (typeof candidate === 'number' && usersList && usersList.length > 0) {
      const user = usersList.find(u => String(u.id) === String(candidate))
      if (user?.name) return user.name
    }
    if (candidate && typeof candidate === 'object' && candidate?.name) return candidate.name
    return '-'
  }

  const getCreatorRole = (lead) => {
    if (!lead) return ''
    const candidate =
      lead?.creator?.role ||
      lead?.createdBy?.role ||
      lead?.created_by?.role ||
      lead?.created_by_role ||
      lead?.creator_role
    if (!candidate) return ''
    return String(candidate).trim()
  }

  useEffect(() => {
    if (!isOpen) return

    const normalize = (lead) => {
      if (!lead) return lead
      return {
        ...lead,
        name: lead.name || lead.fullName,
        phone: lead.phone || lead.mobile,
        notes: lead.notes || lead.description,
      }
    }

    const o = normalize(originalLead)
    const d = normalize(duplicateLead)
    setLocalOriginal(o)
    setLocalDuplicate(d)
    setShowTransferModal(false)

    const keys = ['name', 'phone', 'project', 'source', 'assigned_to', 'stage', 'notes']
    const next = {}
    for (const k of keys) {
      const ov = getFieldValueForKey(o, k)
      const dv = getFieldValueForKey(d, k)
      if (isEmptyValue(ov) && !isEmptyValue(dv)) next[k] = 'duplicate'
      else next[k] = 'original'
    }
    setFieldSource(next)
  }, [isOpen, originalLead, duplicateLead])

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const mergeFields = useMemo(() => ([
    { key: 'name', label: t('Name'), icon: <FaUser /> },
    { key: 'phone', label: t('Phone'), icon: <FaPhone /> },
    { key: 'project', label: t('Project'), icon: <FaBuilding /> },
    { key: 'source', label: t('Source'), icon: <FaWhatsapp /> },
    { key: 'assigned_to', label: t('Sales Person'), icon: <FaUserShield /> },
    { key: 'stage', label: t('Stage'), icon: <FaExclamationTriangle /> },
    { key: 'notes', label: t('Last Comment'), icon: <FaExclamationTriangle /> },
  ]), [t])

  const handlePick = (key, src) => {
    setFieldSource((prev) => ({ ...prev, [key]: src }))
  }

  const resolveMergedPayload = () => {
    const pickLeadFor = (k) => (fieldSource?.[k] === 'duplicate' ? localDuplicate : localOriginal)

    const merged = {
      name: getFieldValueForKey(pickLeadFor('name'), 'name'),
      phone: getFieldValueForKey(pickLeadFor('phone'), 'phone'),
      project: getFieldValueForKey(pickLeadFor('project'), 'project'),
      source: getFieldValueForKey(pickLeadFor('source'), 'source'),
      stage: getFieldValueForKey(pickLeadFor('stage'), 'stage'),
      notes: getFieldValueForKey(pickLeadFor('notes'), 'notes'),
    }

    const assignedLead = pickLeadFor('assigned_to')
    const assignedId = getAssignedToId(assignedLead)
    if (!isEmptyValue(assignedId)) merged.assigned_to = assignedId
    const salesPersonName = getAssigneeName(assignedLead)
    if (!isEmptyValue(salesPersonName) && salesPersonName !== t('Unassigned')) merged.sales_person = salesPersonName

    Object.keys(merged).forEach((k) => {
      if (isEmptyValue(merged[k])) delete merged[k]
    })

    return merged
  }

  const handleSaveInfo = () => {
    const merged = resolveMergedPayload()
    onResolve?.('save_info', localOriginal, localDuplicate, { merged_data: merged, field_source: fieldSource })
  }

  const handleEnableDuplicate = () => {
    onResolve?.('enable_duplicate', localOriginal, localDuplicate)
  }

  const renderCreatorBlock = (lead) => {
    const name = getCreatorName(lead)
    const role = getCreatorRole(lead)
    const suffix = role ? ` (${role})` : ''
    return (
      <div className="flex items-center gap-4">
        <div className={`${isDark ? 'bg-slate-600/50 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-700 border-white'} w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-4 shadow-sm`}>
          {(name || '?').charAt(0)}
        </div>
        <div className="min-w-0">
          <div className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('Created By')}
          </div>
          <div className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'} truncate`} title={`${name}${suffix}`}>
            {name}{suffix}
          </div>
          <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1`}>
            <FaUserShield className={`${isDark ? 'text-blue-300' : 'text-blue-600'}`} size={12} />
            {t('Assigned To')}: {getAssigneeName(lead)}
          </div>
        </div>
      </div>
    )
  }

  const renderSelectableFields = (side) => {
    const lead = side === 'original' ? localOriginal : localDuplicate
    return (
      <div className="mt-4 space-y-2">
        {mergeFields.map((f) => {
          const checked = (fieldSource?.[f.key] || 'original') === side
          const value =
            f.key === 'assigned_to'
              ? getAssigneeName(lead)
              : stringifyValue(getFieldValueForKey(lead, f.key))

          return (
            <div
              key={`${side}-${f.key}`}
              className={`${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 flex items-start gap-3`}
            >
              <label className="flex items-start gap-3 cursor-pointer select-none w-full">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-blue-600"
                  checked={checked}
                  onChange={() => handlePick(f.key, side)}
                  aria-label={`${t('Pick')} ${f.label} ${t('from')} ${side}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`${isDark ? 'text-slate-300' : 'text-slate-700'} text-sm font-semibold flex items-center gap-2`}>
                      <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{f.icon}</span>
                      {f.label}
                    </span>
                  </div>
                  <div className={`${isDark ? 'text-white' : 'text-slate-900'} text-sm font-medium break-words whitespace-pre-wrap mt-1`}>
                    {value || '-'}
                  </div>
                </div>
              </label>
            </div>
          )
        })}
      </div>
    )
  }

  const createdAtOriginal = localOriginal?.created_at || localOriginal?.createdAt
  const createdAtDuplicate = localDuplicate?.created_at || localDuplicate?.createdAt

  // Important: keep all hooks (useMemo/useEffect) unconditionally executed.
  // Returning early before calling hooks causes "Rendered more/fewer hooks" errors in production.
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div
        className={`${!isDark ? 'bg-white/70 backdrop-blur-md text-slate-800' : 'bg-slate-800 text-white'} w-full sm:max-w-5xl max-h-[85vh] h-auto sm:rounded-3xl overflow-hidden shadow-2xl border flex flex-col ${!isDark ? 'border-gray-200' : 'border-slate-700'}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className={`${!isDark ? 'bg-white/60 border-gray-200' : 'bg-slate-800 border-slate-700'} p-3 sm:p-4 border-b flex justify-between items-center shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-600'} p-2.5 rounded-xl`}>
              <FaClone size={20} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('Resolve Duplicate Lead')}</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {t('Choose field values and resolve the duplicate')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            aria-label={t('Close')}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original */}
            <div className={`${isDark ? 'bg-slate-700/40 border-blue-500/20' : 'bg-white/60 border-blue-200'} rounded-xl shadow-sm border overflow-hidden flex flex-col`}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className={`${isDark ? 'bg-blue-900/40 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200'} text-xs font-semibold px-2.5 py-1 rounded-full border`}>
                    {t('Original')}
                  </span>
                </div>
                <div className="mt-4">{renderCreatorBlock(localOriginal)}</div>
                {renderSelectableFields('original')}
                <div className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-xs mt-4 flex items-center gap-2`}>
                  <FaCalendarAlt />
                  {t('Creation Date')}: {formatDate(createdAtOriginal)}
                </div>
              </div>
            </div>

            {/* Duplicate */}
            <div className={`${isDark ? 'bg-slate-700/40 border-red-500/20' : 'bg-white/60 border-red-200'} rounded-xl shadow-sm border overflow-hidden flex flex-col`}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className={`${isDark ? 'bg-red-900/40 text-red-300 border-red-800' : 'bg-red-100 text-red-700 border-red-200'} text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1`}>
                    <FaExclamationTriangle size={10} />
                    {t('Duplicate')}
                  </span>
                </div>
                <div className="mt-4">{renderCreatorBlock(localDuplicate)}</div>
                {renderSelectableFields('duplicate')}
                <div className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-xs mt-4 flex items-center gap-2`}>
                  <FaCalendarAlt />
                  {t('Creation Date')}: {formatDate(createdAtDuplicate)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`${!isDark ? 'bg-white/60 border-gray-200' : 'bg-slate-800 border-slate-700'} p-3 sm:p-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 shrink-0`}>
          <button
            onClick={handleEnableDuplicate}
            className="px-5 py-3 rounded-lg font-bold transition-colors text-sm shadow-sm bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
          >
            {t('Enable Duplicate')}
          </button>
          <button
            onClick={() => onResolve?.('keep_save', localOriginal, localDuplicate)}
            className="px-5 py-3 rounded-lg font-bold transition-colors text-sm shadow-sm bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 dark:border-slate-700"
          >
            {t('Keep & Save')}
          </button>
          <button
            onClick={handleSaveInfo}
            className="px-5 py-3 rounded-lg font-bold transition-colors text-sm shadow-sm bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {t('Save Info')}
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-5 py-3 rounded-lg font-bold transition-colors text-sm shadow-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            {t('Transfer')}
          </button>
        </div>
      </div>

      {/* Transfer Modal */}
      <TransferSalesModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onConfirm={(data) => onResolve?.('transfer', localOriginal, localDuplicate, data)}
        usersList={usersList}
      />
    </div>,
    document.body
  )
}

function stringifyValue(v) {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'string') return v.trim() || '-'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'object') {
    if (v?.name) return String(v.name)
    if (v?.label) return String(v.label)
    return '-'
  }
  return String(v)
}

function isEmptyValue(v) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

function getAssignedToId(lead) {
  if (!lead) return null
  const direct = lead.assigned_to ?? lead.assignedTo
  if (typeof direct === 'number') return direct
  if (typeof direct === 'string' && /^\d+$/.test(direct)) return Number(direct)
  const obj = lead.assignedAgent || lead.assigned_to || lead.assignedTo
  if (obj && typeof obj === 'object' && obj.id) return obj.id
  return null
}

function getFieldValueForKey(lead, key) {
  if (!lead) return null
  if (key === 'assigned_to') return getAssignedToId(lead) ?? lead.assigned_to ?? lead.assignedTo
  if (key === 'notes') return lead.last_comment || lead.lastComment || lead.notes || lead.description
  if (key === 'phone') return lead.phone || lead.mobile
  if (key === 'name') return lead.name || lead.fullName
  return lead[key]
}

export default CompareLeadsModal
