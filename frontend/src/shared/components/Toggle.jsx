import { useTranslation } from 'react-i18next'

export default function Toggle({ label, value, onChange, disabled = false, hint = '' }) {
  const { t } = useTranslation()
  return (
    <div className={`p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent ${disabled ? 'opacity-60' : ''} transition-colors`}>
      <label className={`flex items-center justify-between ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} hover:bg-gray-700/30 rounded-lg px-2 py-1`}>
        <span className="text-sm font-medium text-theme-text">{label}</span>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${value ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {value ? t('Yes') : t('No')}
          </span>
          <div className="relative inline-flex items-center">
            <input type="checkbox" className="sr-only" checked={value} disabled={disabled} onChange={e => onChange(e.target.checked)} />
            <span className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${disabled ? 'bg-gray-300 dark:bg-gray-700' : (value ? 'bg-emerald-500 justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start')}`}>
              <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition ${value ? 'shadow-[0_0_0_2px_rgba(16,185,129,0.4)]' : ''}`} />
            </span>
          </div>
        </div>
      </label>
      {hint ? <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</div> : null}
    </div>
  )
}
