import { useTranslation } from 'react-i18next'
import { RiUserStarLine, RiRefreshLine, RiCircleFill, RiUserSettingsLine, RiTimeLine } from 'react-icons/ri'

import { useState } from 'react'
import { useTheme } from '@shared/context/ThemeProvider'

export default function ActiveUsersChart({ users = [] }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language || 'en'
  const { theme, resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const isDark = !isLight
  const [refreshing, setRefreshing] = useState(false)
  const SCROLLBAR_CSS = `
    .scrollbar-thin-blue { scrollbar-width: thin; scrollbar-color: #94a3b8 transparent; }
    .scrollbar-thin-blue::-webkit-scrollbar { width: 8px; }
    .scrollbar-thin-blue::-webkit-scrollbar-track { background: transparent; }
    .scrollbar-thin-blue::-webkit-scrollbar-thumb { background-color: #94a3b8; border-radius: 9999px; }
    .scrollbar-thin-blue:hover::-webkit-scrollbar-thumb { background-color: #64748b; }
    .dark .scrollbar-thin-blue { scrollbar-color: #2563eb transparent; }
    .dark .scrollbar-thin-blue::-webkit-scrollbar-thumb { background-color: #2563eb; }
    .dark .scrollbar-thin-blue:hover::-webkit-scrollbar-thumb { background-color: #1d4ed8; }
  `

  const dataUsers = users || []

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const formatHM = (d) => {
    if (!d || isNaN(new Date(d).getTime())) return '--:--'
    try {
      return new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
    } catch {
      const pad = (n) => String(n).padStart(2, '0')
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  }

  const formatRelative = (d) => {
    if (!d || isNaN(new Date(d).getTime())) return lang === 'ar' ? 'غير معروف' : 'Unknown'
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const rem = mins % 60
    if (lang === 'ar') {
      if (hours <= 0) return `قبل ${rem} دقيقة`
      return `قبل ${hours} ساعة و${rem} دقيقة`
    }
    if (hours <= 0) return `${rem} min ago`
    return `${hours}h ${rem}m ago`
  }

  const formatDuration = (mins) => {
    const h = Math.floor(Math.max(mins, 0) / 60)
    const m = Math.max(mins, 0) % 60
    if (lang === 'ar') return `${h} ساعة ${m} دقيقة`
    return `${h}h ${m}m`
  }

  const getWorkStartOfDay = () => {
    const d = new Date()
    d.setHours(9, 0, 0, 0)
    return d
  }

  const getWorkingMinutes = (u) => {
    const start = getWorkStartOfDay().getTime()
    const lastSeenTime = u.lastSeen && !isNaN(u.lastSeen.getTime()) ? u.lastSeen.getTime() : Date.now()
    const end = (u.active ? Date.now() : lastSeenTime)
    return Math.floor((end - start) / 60000)
  }


  const activeCount = dataUsers.filter(u => u.active).length
  const totalCount = dataUsers.length

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div
        className={`${isLight ? 'bg-gradient-to-r from-blue-50 to-purple-100 text-slate-900 border-b border-gray-200' : 'bg-gray-900 text-white border-b border-gray-700'} p-3 flex-shrink-0`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isLight ? 'bg-white' : 'bg-gray-800'}`}>
              <RiUserStarLine className="text-2xl" />
            </div>
            <div>
              <div className={`flex items-center ${lang === 'ar' ? 'flex-row-reverse' : ''} gap-2`}>
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{t('Active Users')}</h3>
              </div>
              <p className={`${isLight ? 'text-gray-600' : 'text-gray-300'} text-sm`}>
                {activeCount} {lang === 'ar' ? 'نشط من' : 'active of'} {totalCount} {lang === 'ar' ? 'مستخدمين' : 'users'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${isLight ? 'bg-white hover:bg-gray-100' : 'bg-gray-800 hover:bg-gray-700 text-white'} ${refreshing ? 'animate-spin' : ''}`}
              title={t('Refresh')}
            >
              <RiRefreshLine className="text-lg" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <style>{SCROLLBAR_CSS}</style>
      <div className="flex-1 overflow-hidden">
        {dataUsers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm font-semibold p-4">
             {lang === 'ar' ? 'لا يوجد بيانات متاحة' : 'No data available'}
          </div>
        ) : (
          <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin-blue">
            <div className="p-2 space-y-2">
              {dataUsers.map((u, idx) => (
                <div 
                  key={idx} 
                  className={`grid grid-cols-[auto,1fr,auto] items-center gap-2 p-2 rounded-lg border ${
                    (u.active ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                      <div className={`w-9 h-9 bg-gradient-to-br from-blue-200 to-purple-300 dark:from-blue-400 dark:to-purple-500 rounded-full flex items-center justify-center text-sm font-bold shadow dark:shadow-lg ${isLight ? 'text-black' : 'text-white'}`}>
                        {u.avatar || u.name.charAt(0)}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700 ${u.active ? 'bg-emerald-500' : 'bg-red-500'}`}>
                        <RiCircleFill className="w-full h-full" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-[15px] sm:text-base truncate text-black`}>{u.name}</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs text-black`}>
                        <RiUserSettingsLine className={`text-xs ${isLight ? (u.active ? 'text-emerald-700' : 'text-red-700') : 'text-gray-300'}`} />
                        <span className="truncate text-black">{u.role}</span>
                        {u.actions_count !== undefined && (
                            <span className={`ml-1 text-[10px] px-1.5 rounded-full ${isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-900 text-blue-100'}`}>
                                {u.actions_count} {lang === 'ar' ? 'أكشن' : 'Actions'}
                            </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {u.active ? (
                        <span className={`px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-sm rounded-full font-semibold ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
                          {lang === 'ar' ? 'متصل' : 'Online'}
                        </span>
                      ) : (
                        <span className={`px-2 py-1 bg-red-100 dark:bg-red-900 text-sm rounded-full font-semibold ${isLight ? 'text-red-800' : 'text-red-300'}`}>
                          {lang === 'ar' ? 'أوفلاين' : 'Offline'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 mt-0.5">
                      <div className="flex items-center gap-2 text-xs text-black">
                        <RiTimeLine className={`text-xs ${isLight ? (u.active ? 'text-emerald-700' : 'text-red-700') : 'text-gray-300'}`} />
                        <span className="whitespace-nowrap">{lang === 'ar' ? 'مدة العمل' : 'Working Hours'}: {formatDuration(getWorkingMinutes(u))}</span>
                      </div>
                      {!u.active && (
                        <div className="text-xs text-black opacity-80 whitespace-nowrap">
                          {lang === 'ar' ? 'آخر نشاط' : 'Last Active'}: {formatHM(u.lastSeen)}
                        </div>
                      )}
                    </div>
                    <div className={`text-[11px] mt-0.5 text-black`}>
                      {formatRelative(u.lastSeen)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className={`px-3 py-2 border-t flex-shrink-0 ${isLight ? 'bg-[var(--lm-muted-surface)] border-white' : 'dark:bg-gray-700 dark:border-gray-600'}`}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className={`${isLight ? 'text-black' : 'text-white'} font-bold`}>
                {activeCount} {lang === 'ar' ? 'نشط' : 'Active'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className={`${isLight ? 'text-black' : 'text-white'} font-bold`}>
                {totalCount - activeCount} {lang === 'ar' ? 'غير نشط' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className={`${isLight ? 'text-black' : 'text-white'} font-semibold`}>
            {lang === 'ar' ? 'آخر تحديث:' : 'Last updated:'} {formatHM(new Date())}
          </div>
        </div>
      </div>
    </div>
  )
}
