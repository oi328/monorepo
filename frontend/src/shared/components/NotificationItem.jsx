import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const typeIcon = (type) => {
  const common = { className: 'w-5 h-5' }
  switch (type) {
    case 'task':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 11l2 2 4-4" />
          <rect x="3" y="4" width="18" height="16" rx="2" />
        </svg>
      )
    case 'lead':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21a6.5 6.5 0 0113 0" />
        </svg>
      )
    case 'campaign':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 12h14" />
          <path d="M7 9l3-3 3 3" />
          <path d="M17 15l-3 3-3-3" />
        </svg>
      )
    case 'inventory':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
        </svg>
      )
    case 'comment':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a4 4 0 01-4 4H7l-4 4V7a4 4 0 014-4h10a4 4 0 014 4z" />
        </svg>
      )
    case 'system':
    default:
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      )
  }
}

const timeAgo = (ts) => {
  try {
    const diff = Date.now() - Number(ts || 0)
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'now'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    const d = Math.floor(h / 24)
    return `${d}d`
  } catch { return '' }
}

export default function NotificationItem({ data, onToggleRead, onArchive, onUnarchive, onClick }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const tone = useMemo(() => {
    switch (data?.type) {
      case 'task': return 'text-green-600 dark:text-green-400'
      case 'lead': return 'text-blue-600 dark:text-blue-400'
      case 'campaign': return 'text-purple-600 dark:text-purple-400'
      case 'inventory': return 'text-amber-600 dark:text-amber-400'
      case 'comment': return 'text-pink-600 dark:text-pink-400'
      case 'system':
      default: return 'text-gray-600 dark:text-gray-300'
    }
  }, [data?.type])

  const borderUnread = !data?.read ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-800'
  const bgUnread = !data?.read ? 'bg-blue-900/20' : 'bg-[var(--content-bg)]'
  const shadowUnread = !data?.read ? 'shadow-sm shadow-blue-500/10' : 'shadow-xs'

  const handleLinkClick = (e) => {
    if (onClick) {
      e.preventDefault()
      onClick(data)
    }
  }

  return (
    <div className={`rounded-xl border ${borderUnread} ${bgUnread} ${shadowUnread} p-3 sm:p-4 flex items-start gap-3 transition-colors transition-shadow duration-150 hover:shadow-md hover:border-blue-300/70 dark:hover:border-blue-600/70`}>
      <div className={`flex-shrink-0 mt-0.5 ${tone} hidden sm:block`}>{typeIcon(data?.type)}</div>
      <div className="flex-1 min-w-0">
        {/* Content */}
        <div className="min-w-0">
          {data?.link ? (
            <Link to={data.link} className="block group" onClick={handleLinkClick}>
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`flex-shrink-0 ${tone} sm:hidden`}>{typeIcon(data?.type)}</div>
                <h3 className="font-medium truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 text-sm sm:text-base">{data?.title || ''}</h3>
                {data?.archived && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-600 dark:text-gray-300">{t('Archived', 'Archived')}</span>
                )}
                {!data?.read && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white">{t('New', 'New')}</span>
                )}
              </div>
              <p className="text-xs sm:text-sm opacity-80 truncate group-hover:opacity-100 mt-0.5">{data?.body || ''}</p>
              <div className="text-xs opacity-60 mt-0.5">{timeAgo(data?.createdAt)} • {t(data?.source) || data?.source}</div>
            </Link>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`flex-shrink-0 ${tone} sm:hidden`}>{typeIcon(data?.type)}</div>
                <h3 className="font-medium truncate text-sm sm:text-base">{data?.title || ''}</h3>
                {data?.archived && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{t('Archived', 'Archived')}</span>
                )}
                {!data?.read && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white">{t('New', 'New')}</span>
                )}
              </div>
              <p className="text-xs sm:text-sm opacity-80 truncate mt-0.5">{data?.body || ''}</p>
              <div className="text-xs opacity-60 mt-0.5">{timeAgo(data?.createdAt)} • {t(data?.source) || data?.source}</div>
            </>
          )}
        </div>

        {/* Actions - icon buttons */}
        <div className="flex items-center gap-1.5 mt-2 sm:mt-1.5 justify-end">
          <button
            onClick={() => setOpen(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-expanded={open}
            title={open ? t('Collapse', 'Collapse') : t('Expand', 'Expand')}
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {!data?.read && (
            <button
              onClick={onToggleRead}
              className="w-7 h-7 flex items-center justify-center rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              title={t('Mark as read', 'Mark as read')}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
            </button>
          )}
          {!data?.archived && (
            <button
              onClick={onArchive}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('Archive', 'Archive')}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8" /><path d="M10 12h4" /></svg>
            </button>
          )}
          {data?.archived && onUnarchive && (
            <button
              onClick={onUnarchive}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('Unarchive', 'Unarchive')}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8" /><path d="M12 12v6" /><path d="M9 15l3-3 3 3" /></svg>
            </button>
          )}
        </div>

        {open && (
          <div className="pt-3 mt-2 border-t border-gray-200 dark:border-gray-800 text-sm">
            <div className="opacity-90 whitespace-pre-wrap">{data?.body || ''}</div>
          </div>
        )}
      </div>
    </div>
  )
}
