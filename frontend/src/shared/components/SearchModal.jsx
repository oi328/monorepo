import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@shared/context/ThemeProvider'
import SearchableSelect from './SearchableSelect'

export default function SearchModal({ onClose, variant = 'modal' }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [filterField, setFilterField] = useState('all');
  const [query, setQuery] = useState('');
  const [flagEmoji, setFlagEmoji] = useState('')
  const flagsMapRef = useRef(null)
  const flagsLoadingRef = useRef(false)

  const normalizeCode = (s) => {
    const v = (s || '').trim().replace(/\s|-/g, '')
    if (!v) return ''
    if (v.startsWith('+')) return v
    const m = v.match(/^0+(\d{1,4})/)
    if (m) return `+${m[1]}`
    const d = v.match(/^(\d{1,4})$/)
    if (d) return `+${d[1]}`
    return ''
  }
  useEffect(() => {
    if (!flagsMapRef.current && !flagsLoadingRef.current) {
      flagsLoadingRef.current = true
      fetch('https://restcountries.com/v3.1/all?fields=idd,flag')
        .then(r => r.json())
        .then(arr => {
          const map = new Map()
          if (Array.isArray(arr)) {
            arr.forEach(c => {
              const root = (c?.idd?.root || '').trim()
              const suffixes = Array.isArray(c?.idd?.suffixes) ? c.idd.suffixes : []
              suffixes.forEach(s => {
                const full = `${root}${s}`
                if (full) map.set(full, c?.flag || '')
              })
            })
          }
          flagsMapRef.current = map
        })
        .catch(() => { flagsMapRef.current = new Map() })
        .finally(() => { flagsLoadingRef.current = false })
    }
  }, [])
  useEffect(() => {
    const code = normalizeCode(query)
    if (!code) { setFlagEmoji(''); return }
    const map = flagsMapRef.current
    if (map && map.has(code)) {
      setFlagEmoji(map.get(code) || '')
    } else {
      setFlagEmoji('')
    }
  }, [query])

  const applySearch = () => {
    try {
      const payload = { filterField, query, ts: Date.now() };
      localStorage.setItem('globalSearch', JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('globalSearch', { detail: payload }));

      // Navigate to Leads page with search query
      if (query.trim()) {
        navigate(`/leads?s=${encodeURIComponent(query)}`);
      }
    } catch {}
    onClose && onClose();
  };

  if (variant === 'dropdown') {
    return (
      <div
        className={`${isLight ? 'bg-white' : 'backdrop-blur-md bg-gray-900/95'} z-[110]
        fixed top-16 max-[320px]:top-14
        left-1/2 -translate-x-1/2 w-[85vw] sm:w-[80vw] max-w-[28rem]
        md:translate-x-0 ${isRTL ? 'md:left-0 md:right-auto' : 'md:right-0 md:left-auto'} md:w-[28rem]
        border-t md:border ${isLight ? 'border-gray-200' : 'border-gray-700'}
        rounded-xl shadow-2xl`}
        role="dialog"
        aria-label={t('Search')}
      >
        <div className="px-3 py-2 md:px-4 md:py-3 space-y-2 md:space-y-3 max-h-[60vh] overflow-auto">
          <div className="flex items-center gap-2">
            <label className={`text-xs md:text-sm max-[480px]:hidden ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>{isRTL ? 'الفلتر' : 'Filter'}</label>
            <div className="relative w-64 max-[480px]:w-52 sm:w-72 md:w-80">
              <SearchableSelect
                value={filterField}
                onChange={(v) => setFilterField(v)}
                className={`w-full text-xs md:text-sm`}
                usePortal={true}
              >
                <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                <option value="lead">{isRTL ? 'الليد' : 'Lead'}</option>
                <option value="mobile">{isRTL ? 'الموبايل' : 'Mobile'}</option>
                <option value="comment">{isRTL ? 'تعليق' : 'Comment'}</option>
                <option value="country">{isRTL ? 'الدولة' : 'Country'}</option>
              </SearchableSelect>
            </div>

            <label className={`text-xs md:text-sm max-[480px]:hidden ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>{t('Search')}</label>
            {flagEmoji ? <span className={`text-lg ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{flagEmoji}</span> : null}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder={isRTL ? 'اكتب للبحث...' : 'Type to search...'}
              className={`flex-1 px-2 py-2 md:px-3 md:py-2 text-[12px] md:text-[14px] placeholder:text-[11px] md:placeholder:text-[13px] rounded-lg border ${isLight ? 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500' : 'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setQuery(''); setFilterField('all'); try { localStorage.removeItem('globalSearch'); window.dispatchEvent(new Event('globalSearchCleared')); } catch {} }}
              className={`text-xs px-2 py-1 md:px-3 md:py-2 rounded-md border ${isLight ? 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200' : 'dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700'}`}
            >
              {isRTL ? 'مسح' : 'Clear'}
            </button>
            <button
              onClick={() => { applySearch(); onClose && onClose(); }}
              className="text-xs px-2 py-1 md:px-3 md:py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isRTL ? 'بحث' : 'Search'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100]" aria-label={t('Search')}>
      {/* طبقة خارجية لإغلاق القائمة عند النقر خارجها */}
      <div
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
        aria-label={isRTL ? 'إغلاق البحث' : 'Close search'}
      />

      {/* القائمة المنسدلة أسفل التوب بار */}
      <div
        className={`absolute top-14 ${isRTL ? 'left-4' : 'right-4'} w-[90vw] max-w-md rounded-xl ${isLight ? 'bg-white border border-gray-200 shadow-2xl' : 'backdrop-blur-md bg-gray-900/90 border border-gray-700 shadow-2xl'}`}
        role="dialog"
        aria-modal="true"
      >
        {/* رأس القائمة */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : ''}`}>
            {t('Search')}
          </div>
          <button
            onClick={onClose}
            className={`text-xs px-2 py-1 rounded-md border ${isLight ? 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200' : 'dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700'}`}
          >
            {isRTL ? 'إغلاق' : 'Close'}
          </button>
        </div>

        {/* محتوى البحث والفلتر */}
        <div className="px-4 py-3 space-y-3">
          {/* اختيار الحقل (الدولة أو الليد) */}
          <div className="flex items-center gap-2">
            <label className={`text-sm min-w-[70px] ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>
              {isRTL ? 'الفلتر' : 'Filter'}
            </label>
            <SearchableSelect
              value={filterField}
              onChange={(v) => setFilterField(v)}
              className="flex-1 text-sm"
              menuWidth={360}
              usePortal={false}
            >
              <option value="all">{isRTL ? 'الكل' : 'All'}</option>
              <option value="lead">{isRTL ? 'الليد' : 'Lead'}</option>
              <option value="mobile">{isRTL ? 'الموبايل' : 'Mobile'}</option>
              <option value="comment">{isRTL ? 'تعليق' : 'Comment'}</option>
              <option value="country">{isRTL ? 'الدولة' : 'Country'}</option>
            </SearchableSelect>
          </div>

          {/* حقل البحث */}
          <div className="flex items-center gap-2">
            <label className={`text-sm min-w-[70px] ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>
              {t('Search')}
            </label>
            {flagEmoji ? <span className={`text-lg ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{flagEmoji}</span> : null}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder={isRTL ? 'اكتب للبحث...' : 'Type to search...'}
              className={`flex-1 px-3 py-2 placeholder:text-[11px] md:placeholder:text-[13px] rounded-lg border ${isLight ? 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500' : 'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* أزرار التحكم */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setQuery(''); }}
              className={`text-xs px-3 py-2 rounded-md border ${isLight ? 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200' : 'dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700'}`}
            >
              {isRTL ? 'مسح' : 'Clear'}
            </button>
            <button
              onClick={applySearch}
              className="text-xs px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isRTL ? 'بحث' : 'Search'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
