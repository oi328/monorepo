import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { COUNTRY_CODES } from '../hooks/usePhoneValidation';

const CountryCodeSelect = ({ value, onChange, isLight, inputTone, isRTL, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter list based on input
  const filteredCodes = COUNTRY_CODES.filter((c) => {
    const val = value || '';
    if (!val) return true;

    // Normalize: remove +, 00, 0 from start
    const normalize = (str) => str.replace(/^(\+|00|0)/, '');
    const normVal = normalize(val);
    const normDial = normalize(c.dialCode);

    return (
      normDial.startsWith(normVal) ||
      c.dialCode.toLowerCase().includes(val.toLowerCase()) ||
      c.nameEn.toLowerCase().includes(val.toLowerCase()) ||
      c.nameAr.includes(val)
    );
  });

  const optionsToShow = filteredCodes.length > 0 ? filteredCodes : [];

  return (
    <div className="relative w-24 sm:w-28 shrink-0">
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          if (disabled) return;
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (disabled) return;
          setIsOpen(true);
        }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className={`w-full rounded-md border px-2 py-2 text-center text-sm ${inputTone} disabled:opacity-60 disabled:cursor-not-allowed`}
        placeholder="+20"
        dir="ltr"
      />
      <FaChevronDown 
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${isLight ? 'text-gray-500' : 'text-gray-400'}`} 
      />
      
      {isOpen && !disabled && (
        <div className={`absolute top-full ${isRTL ? 'right-0' : 'left-0'} mt-1 max-h-60 w-56 sm:w-64 overflow-y-auto rounded-md border shadow-lg z-50 ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
          {optionsToShow.map((c) => (
            <div
              key={c.iso2}
              className={`cursor-pointer px-3 py-2 text-sm flex items-center gap-2 transition-colors duration-150
                ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'} 
                ${value === c.dialCode ? (isLight ? 'bg-blue-100/50' : 'bg-blue-900/30') : ''}`}
              onClick={() => onChange(c.dialCode)}
            >
              <span className="text-lg">{c.flag}</span>
              <span className="font-bold min-w-[3rem] text-left" dir="ltr">{c.dialCode}</span>
              <span className={`truncate flex-1 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{isRTL ? c.nameAr : c.nameEn}</span>
            </div>
          ))}
          {optionsToShow.length === 0 && (
              <div className={`px-3 py-2 text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  {isRTL ? 'لا توجد نتائج' : 'No results'}
              </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CountryCodeSelect;
