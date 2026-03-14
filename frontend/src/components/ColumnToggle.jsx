import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaColumns, FaUndoAlt, FaGripVertical } from 'react-icons/fa';
import { Reorder } from 'framer-motion';

const ColumnToggle = ({ columns, visibleColumns, onColumnToggle, onResetColumns, align = 'right', compact = false, order, onReorder }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuStyle, setMenuStyle] = useState({});
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const isRtl = i18n?.dir ? i18n.dir() === 'rtl' : i18n?.language === 'ar';

  const updatePosition = () => {
    if (isOpen) {
      const mobile = typeof window !== 'undefined' && window.innerWidth <= 480;
      const style = {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        zIndex: 9999,
        width: mobile ? 'auto' : '18rem',
      };

      if (align === 'right') {
        if (isRtl) style.left = '0px';
        else style.right = '0px';
      } else {
        if (isRtl) style.right = '0px';
        else style.left = '0px';
      }
      setMenuStyle(style);
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, align, isRtl]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside the dropdown (which might be rendered via portal or fixed)
      // Since we are not using portal but fixed position, the DOM structure is preserved?
      // No, fixed position element is still in DOM tree.
      const insideTrigger = buttonRef.current && buttonRef.current.contains(event.target);
      const insideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      if (insideTrigger || insideDropdown) return;
      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 ${compact ? 'px-2 py-1' : 'px-3 py-2'} rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500`}
        aria-expanded={isOpen}
        aria-label={t('Display Options')}
        title={t('Display Options')}
      >
        <FaColumns className={`${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
        <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>{t('Display Options')}</span>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={menuStyle}
          className={`rounded-lg shadow-xl bg-white dark:bg-slate-800/90 dark:backdrop-blur-md text-gray-900 dark:text-white ring-1 ring-gray-200 dark:ring-slate-700/50 z-[50] pointer-events-auto max-[480px]:w-[calc(100vw-24px)] max-[480px]:mx-3`}
        >
          <div className="p-3 space-y-3" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                {t('Show/Hide Columns')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    Object.keys(columns).forEach((key) => {
                      if (!visibleColumns[key]) onColumnToggle(key);
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-200"
                  title={t('Select All')}
                >
                  <span className="inline-block w-3 h-3 rounded-sm bg-blue-600 opacity-80"></span>
                  {t('Select All')}
                </button>
                {onResetColumns && (
                  <button
                    type="button"
                    onClick={onResetColumns}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white"
                    title={t('Reset')}
                  >
                    <FaUndoAlt className="h-3 w-3" />
                    {t('Reset')}
                  </button>
                )}
              </div>
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('Search columns...')}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {searchTerm ? (
                <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {(order || Object.keys(columns))
                    .filter((key) => String(columns[key] || '').toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((key) => (
                      <label key={key} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700/50"
                          checked={visibleColumns[key]}
                          onChange={() => onColumnToggle(key)}
                        />
                        <span>{columns[key]}</span>
                      </label>
                    ))}
                </div>
              ) : (
                <Reorder.Group axis="y" values={order || Object.keys(columns)} onReorder={onReorder || (() => {})} className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {(order || Object.keys(columns)).map((key) => (
                    <Reorder.Item key={key} value={key} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700/30 bg-white dark:bg-slate-800 cursor-grab active:cursor-grabbing transition-colors">
                      <FaGripVertical className="text-gray-400 cursor-grab min-w-[12px]" />
                      <label className="flex items-center gap-3 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700/50"
                          checked={visibleColumns[key]}
                          onChange={(e) => {
                             onColumnToggle(key);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="select-none">{columns[key]}</span>
                      </label>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnToggle;
