import { Children, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'

function normalizeOptions(options) {
  return (options || []).map((opt) => {
    if (typeof opt === 'string') return { value: opt, label: opt }
    return { value: opt.value, label: opt.label ?? String(opt.value) }
  })
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  children,
  menuWidth,
  usePortal = true,
  multiple = false,
}) {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const { theme, resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const opts = useMemo(() => {
    if (!options && children) {
      const items = []
      Children.forEach(children, (child) => {
        if (!child || typeof child !== 'object') return
        if (child.type === 'option') {
          const val = child.props?.value ?? (Array.isArray(child.props?.children) ? child.props.children.join(' ') : child.props?.children)
          const lbl = Array.isArray(child.props?.children) ? child.props.children.join(' ') : child.props?.children
          items.push({ value: String(val ?? lbl ?? ''), label: String(lbl ?? val ?? '') })
        }
      })
      return items
    }
    return normalizeOptions(options)
  }, [options, children])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const menuRef = useRef(null)
  const inputRef = useRef(null)
  const [menuStyle, setMenuStyle] = useState({})
  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase()
    if (!q) return opts
    return opts.filter(o => (o.label || '').toLowerCase().includes(q))
  }, [opts, query])

  const selectedLabel = useMemo(() => {
    if (multiple) {
      if (!Array.isArray(value) || value.length === 0) return ''
      if (value.length > 2) return `${value.length} selected`
      return value.map(v => {
        const found = opts.find(o => o.value === v)
        return found ? found.label : v
      }).join(', ')
    }
    const found = opts.find(o => o.value === value)
    return found ? found.label : ''
  }, [opts, value, multiple])

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return
      const clickedInsideTrigger = ref.current.contains(e.target)
      const clickedInsideMenu = menuRef.current && menuRef.current.contains(e.target)
      if (!clickedInsideTrigger && !clickedInsideMenu) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    const updatePosition = () => {
      if (!open || !ref.current) return
      const rect = ref.current.getBoundingClientRect()
      if (usePortal) {
        setMenuStyle({
          position: 'fixed',
          left: `${rect.left}px`,
          top: `${rect.bottom + 4}px`,
          width: menuWidth ? `${menuWidth}px` : `${rect.width}px`,
          zIndex: 9999,
        })
      } else {
        setMenuStyle({
          position: 'absolute',
          left: 0,
          top: 'calc(100% + 4px)',
          width: menuWidth ? `${menuWidth}px` : '100%',
          zIndex: 9999,
        })
      }
    }
    updatePosition()
    if (!open) return
    const handler = () => updatePosition()
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
    }
  }, [open, menuWidth, usePortal])

  useEffect(() => {
    if (open && inputRef.current) {
      try {
        inputRef.current.focus({ preventScroll: true })
      } catch {
        inputRef.current.focus()
      }
    }
  }, [open])

  return (
    <div ref={ref} className={`relative ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <button
        type="button"
        className={`w-full flex items-center justify-between rounded-md border px-3 py-2 bg-[var(--dropdown-bg)] border-[var(--dropdown-border)] text-[var(--content-text)] dark:text-white shadow-sm hover:border-[var(--nova-accent)]/60 transition-colors ${className}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate`}>{selectedLabel || (placeholder ?? (isArabic ? 'اختر...' : 'Select...'))}</span>
        <svg className={`w-4 h-4 opacity-80 ${isLight ? 'text-gray-700' : 'text-white'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        usePortal
          ? createPortal(
              <div ref={menuRef} style={menuStyle} className="rounded-xl shadow-xl bg-[var(--dropdown-bg)] border border-[var(--dropdown-border)] backdrop-blur-md" onMouseDown={(e) => e.stopPropagation()}>
                <div className="p-2 border-b border-[var(--dropdown-border)]/70">
                  <input
                    className={`input input-sm w-full bg-[var(--dropdown-bg)] border border-[var(--dropdown-border)]/80 text-sm ${isLight ? 'text-theme-text placeholder-gray-500' : 'text-gray-100 placeholder-gray-400'} focus:outline-none focus:ring-0 focus:border-[var(--nova-accent)]`}
                    placeholder={isArabic ? 'ابحث بالكتابة...' : 'Type to search...'}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    ref={inputRef}
                  />
                </div>
                <ul role="listbox" className="max-h-52 overflow-auto py-1 scrollbar-thin-blue">
                  {filtered.length === 0 && (
                    <li className="px-3 py-2 text-sm text-[var(--muted-text)]">{isArabic ? 'لا توجد نتائج' : 'No results'}</li>
                  )}
                  {filtered.map((o) => {
                    const isSelected = multiple 
                      ? (Array.isArray(value) && value.includes(o.value))
                      : o.value === value
                    
                    return (
                    <li
                      key={o.value}
                      role="option"
                      aria-selected={isSelected}
                      className={`mx-1 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${isSelected ? 'bg-[rgba(37,99,235,0.28)] text-white' : 'hover:bg-[rgba(37,99,235,0.18)]'} ${isLight ? 'text-theme-text' : 'text-gray-100'}`}
                      onClick={() => { 
                        if (multiple) {
                          const currentVal = Array.isArray(value) ? value : []
                          const newVal = currentVal.includes(o.value)
                            ? currentVal.filter(v => v !== o.value)
                            : [...currentVal, o.value]
                          onChange && onChange(newVal)
                          inputRef.current?.focus()
                        } else {
                          onChange && onChange(o.value)
                          setOpen(false)
                          setQuery('') 
                        }
                      }}
                    >
                      <span>{o.label}</span>
                      {isSelected && multiple && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    </li>
                  )})}
                </ul>
              </div>,
              document.body
            )
          : (
              <div ref={menuRef} style={menuStyle} className="rounded-xl shadow-xl bg-[var(--dropdown-bg)] border border-[var(--dropdown-border)] backdrop-blur-md" onMouseDown={(e) => e.stopPropagation()}>
                <div className="p-2 border-b border-[var(--dropdown-border)]/70">
                  <input
                    className={`input input-sm w-full bg-[var(--dropdown-bg)] border border-[var(--dropdown-border)]/80 text-sm ${isLight ? 'text-theme-text placeholder-gray-500' : 'text-gray-100 placeholder-gray-400'} focus:outline-none focus:ring-0 focus:border-[var(--nova-accent)]`}
                    placeholder={isArabic ? 'ابحث بالكتابة...' : 'Type to search...'}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    ref={inputRef}
                  />
                </div>
                <ul role="listbox" className="max-h-52 overflow-auto py-1 scrollbar-thin-blue">
                  {filtered.length === 0 && (
                    <li className="px-3 py-2 text-sm text-[var(--muted-text)]">{isArabic ? 'لا توجد نتائج' : 'No results'}</li>
                  )}
                  {filtered.map((o) => {
                    const isSelected = multiple 
                      ? (Array.isArray(value) && value.includes(o.value))
                      : o.value === value

                    return (
                    <li
                      key={o.value}
                      role="option"
                      aria-selected={isSelected}
                      className={`mx-1 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${isSelected ? 'bg-[rgba(37,99,235,0.28)] text-white' : 'hover:bg-[rgba(37,99,235,0.18)]'} ${isLight ? 'text-theme-text' : 'text-gray-100'}`}
                      onClick={() => { 
                        if (multiple) {
                          const currentVal = Array.isArray(value) ? value : []
                          const newVal = currentVal.includes(o.value)
                            ? currentVal.filter(v => v !== o.value)
                            : [...currentVal, o.value]
                          onChange && onChange(newVal)
                          inputRef.current?.focus()
                        } else {
                          onChange && onChange(o.value)
                          setOpen(false)
                          setQuery('') 
                        }
                      }}
                    >
                      <span>{o.label}</span>
                      {isSelected && multiple && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    </li>
                  )})}
                </ul>
              </div>
            )
      )}
    </div>
  )
}
