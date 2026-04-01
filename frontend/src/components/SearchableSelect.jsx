﻿﻿﻿﻿﻿import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import * as LucideIcons from 'lucide-react'
import { FaSearch, FaTimes, FaChevronDown } from 'react-icons/fa'

export default function SearchableSelect({ options, value, onChange, placeholder, label, isRTL, icon: Icon, multiple = false, className = '', showAllOption = true, dropdownZIndex = 20050 }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const wrapperRef = useRef(null)
  const dropdownRef = useRef(null)

  const renderIcon = (icon) => {
    if (!icon) return null;
    if (typeof icon !== 'string') return icon;
    const LucideIcon = LucideIcons[icon];
    if (LucideIcon) return <LucideIcon size={14} />;
    return icon;
  };

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedWrapper = wrapperRef.current && wrapperRef.current.contains(event.target)
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(event.target)
      if (!clickedWrapper && !clickedDropdown) {
        setIsOpen(false)
      }
    }

    function handleScroll(event) {
      if (!isOpen) return
      // If the scroll happened inside the dropdown itself, don't close
      const target = event?.target
      const insideDropdown = target && dropdownRef.current && (dropdownRef.current === target || dropdownRef.current.contains(target))
      if (insideDropdown) return

      // If scrolling happens outside (e.g. window or parent container), we might want to update position or close.
      // Usually, closing on outside scroll is good UX for select menus.
      // But if user wants to scroll the page while menu is open, it might be annoying if it closes.
      // Given the requirement "don't close on scroll inside list", the above check handles it.
      // However, to fix "menu closes on ANY scroll", we should be careful.
      // The previous logic closed it if not inside wrapper AND not inside dropdown.
      
      const insideWrapper = target && wrapperRef.current && (wrapperRef.current === target || wrapperRef.current.contains(target))
      
      // If we are using Portal, wrapperRef scroll won't trigger this usually unless wrapper itself scrolls.
      // The issue is likely window scroll or parent scroll.
      // If we want it to STICK to the element, we need to update coords on scroll.
      // If we want it to close, we keep it as is.
      // The user complaint "when I scroll the menu closes alone" implies scrolling THE MENU content closes it.
      // So 'insideDropdown' check is critical.
      
      if (!insideWrapper && !insideDropdown) {
         // If we are scrolling the window, let's close it to avoid floating menu in wrong place
         // UNLESS we update position. Updating position is complex. Closing is standard.
         setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("scroll", handleScroll, true)
    window.addEventListener("resize", handleScroll)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("scroll", handleScroll, true)
      window.removeEventListener("resize", handleScroll)
    }
  }, [isOpen])

  const toggleOpen = () => {
    if (!isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
    setIsOpen(!isOpen)
  }

  const filteredOptions = (options || []).filter(opt => {
    if (!opt) return false;
    const label = (typeof opt === 'object' && opt !== null && 'label' in opt) ? opt.label : String(opt)
    return String(label).toLowerCase().includes(search.toLowerCase())
  })

  const getOptionValue = (opt) => (typeof opt === 'object' && opt !== null && 'value' in opt ? opt.value : opt)

  const isSelected = (opt) => {
    const val = getOptionValue(opt)
    return multiple ? Array.isArray(value) && value.includes(val) : value === val
  }
  
  const clearValue = () => multiple ? onChange([]) : onChange('')
  const allOptionValues = multiple
    ? Array.from(new Set((options || []).map(getOptionValue).filter(v => v !== undefined && v !== null && v !== '')))
    : []
  const allSelected =
    multiple &&
    Array.isArray(value) &&
    allOptionValues.length > 0 &&
    allOptionValues.every(v => value.includes(v))

  const isEmpty = multiple
    ? !Array.isArray(value) || value.length === 0 || allSelected
    : !value

  const getDisplayValue = () => {
    if (multiple) {
      if (allSelected) return (isRTL ? 'Ø§Ù„ÙƒÙ„' : 'All')
      if (Array.isArray(value) && value.length > 0) {
        return value.map(v => {
          const opt = (options || []).find(o => (typeof o === 'object' && o !== null && 'value' in o ? o.value : o) === v)
          return opt ? (typeof opt === 'object' && 'label' in opt ? opt.label : opt) : v
        }).join(', ')
      }
      return placeholder || (showAllOption ? (isRTL ? 'Ø§Ù„ÙƒÙ„' : 'All') : '')
    }
    if (!value) return placeholder || (showAllOption ? (isRTL ? 'Ø§Ù„ÙƒÙ„' : 'All') : '')
    const opt = (options || []).find(o => (typeof o === 'object' && o !== null && 'value' in o ? o.value : o) === value)
    return opt ? (typeof opt === 'object' && 'label' in opt ? opt.label : opt) : value
  }

  const dropdownContent = (
    <div 
      ref={dropdownRef}
      data-searchable-select-dropdown="true"
      style={{
        position: 'absolute',
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: dropdownZIndex
      }}
      className="rounded-xl shadow-xl bg-[var(--card-bg)] border border-[var(--panel-border)] backdrop-blur-md max-h-60 overflow-hidden flex flex-col"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="p-2 border-b border-[var(--panel-border)]/70">
        <div className="relative">
          <FaSearch className={`absolute top-1/2 -translate-y-1/2 text-[var(--theme-text)] ${isRTL ? 'right-3' : 'left-3'}`} size={12} />
          <input
            autoFocus
            type="text"
            className={`input input-sm w-full bg-[var(--app-bg)] border border-[var(--panel-border)]/80 text-sm ${isRTL ? 'pr-8 pl-2' : 'pl-8 pr-2'} text-[var(--theme-text)] placeholder-slate-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-[var(--nova-accent)]`}
            placeholder={isRTL ? 'Ø¨Ø­Ø«...' : 'Search...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      <div className="overflow-y-auto max-h-48 py-1 scrollbar-thin-blue">
          {showAllOption && (
            <div
              className={`mx-1 rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${(!multiple && value === '') || (multiple && allSelected) ? 'bg-[rgba(37,99,235,0.28)] text-white' : 'text-[var(--theme-text)] hover:bg-[rgba(37,99,235,0.18)]'}`}
              onClick={() => {
                if (multiple) {
                  onChange(allSelected ? [] : allOptionValues)
                  setIsOpen(false)
                } else {
                  clearValue()
                  setIsOpen(false)
                }
                setSearch('')
              }}
            >
              {isRTL ? 'Ø§Ù„ÙƒÙ„' : 'All'}
            </div>
          )}
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt, idx) => {
            const label = typeof opt === 'object' && opt !== null && 'label' in opt ? opt.label : opt
            const val = typeof opt === 'object' && opt !== null && 'value' in opt ? opt.value : opt
            const color = typeof opt === 'object' && opt !== null && 'color' in opt ? opt.color : null
            const icon = typeof opt === 'object' && opt !== null && 'icon' in opt ? opt.icon : null
            return (
              <div
                key={idx}
                className={`mx-1 rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${isSelected(opt) ? 'bg-[rgba(37,99,235,0.28)] text-white' : 'text-[var(--theme-text)] hover:bg-[rgba(37,99,235,0.18)]'}`}
                onClick={() => {
                  if (multiple) {
                    const cur = Array.isArray(value) ? value : []
                    const exists = cur.includes(val)
                    const next = exists ? cur.filter(v => v !== val) : [...cur, val]
                    onChange(next)
                  } else {
                    onChange(val)
                    setIsOpen(false)
                  }
                  setSearch('')
                }}
              >
                <div className="flex items-center gap-2">
                   {icon && <span className="shrink-0">{renderIcon(icon)}</span>}
                   {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }}></span>}
                   {label}
                </div>
              </div>
            )
          })
        ) : (
          <div className="px-3 py-4 text-center text-sm text-[var(--muted-text)]">
            {isRTL ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬' : 'No results found'}
          </div>
        )}
      </div>
    </div>
  )

  return (
  <div className={`relative ${isOpen ? 'z-50' : ''}`} ref={wrapperRef}>
      <div
        className={`input w-full flex items-center justify-between cursor-pointer bg-[var(--card-bg)] border border-[var(--panel-border)] text-[var(--theme-text)] ${className}`}
        onClick={toggleOpen}
      >
        <span className={`text-sm ${isEmpty ? 'text-[var(--muted-text)] opacity-100' : 'text-[var(--theme-text)]'}`}>
          {getDisplayValue()}
        </span>
        <div className="flex items-center gap-2">
           {(!multiple && value && value !== 'All' && value !== 'Ø§Ù„ÙƒÙ„') || (multiple && Array.isArray(value) && value.length > 0) ? (
             <FaTimes 
               className="text-[var(--theme-text)] hover:text-red-500 z-10" 
               size={12}
               onClick={(e) => {
                 e.stopPropagation()
                 clearValue()
               }}
             />
           ) : null}
           <FaChevronDown className={`text-[var(--theme-text)] transition-transform ${isOpen ? 'rotate-180' : ''}`} size={10} />
        </div>
      </div>

      {isOpen && createPortal(dropdownContent, document.body)}
    </div>
  )
}

