import { useState, useMemo } from 'react';

export const COUNTRY_CODES = [
  // Arab Countries First
  { iso2: 'EG', nameAr: 'مصر', nameEn: 'Egypt', dialCode: '+20', flag: '🇪🇬', minLen: 10, maxLen: 11 },
  { iso2: 'SA', nameAr: 'السعودية', nameEn: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', minLen: 9, maxLen: 9 },
  { iso2: 'AE', nameAr: 'الإمارات', nameEn: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', minLen: 9, maxLen: 9 },
  { iso2: 'KW', nameAr: 'الكويت', nameEn: 'Kuwait', dialCode: '+965', flag: '🇰🇼', minLen: 8, maxLen: 8 },
  { iso2: 'QA', nameAr: 'قطر', nameEn: 'Qatar', dialCode: '+974', flag: '🇶🇦', minLen: 8, maxLen: 8 },
  { iso2: 'BH', nameAr: 'البحرين', nameEn: 'Bahrain', dialCode: '+973', flag: '🇧🇭', minLen: 8, maxLen: 8 },
  { iso2: 'OM', nameAr: 'عُمان', nameEn: 'Oman', dialCode: '+968', flag: '🇴🇲', minLen: 8, maxLen: 8 },
  { iso2: 'JO', nameAr: 'الأردن', nameEn: 'Jordan', dialCode: '+962', flag: '🇯🇴', minLen: 9, maxLen: 9 },
  { iso2: 'LB', nameAr: 'لبنان', nameEn: 'Lebanon', dialCode: '+961', flag: '🇱🇧', minLen: 7, maxLen: 8 },
  { iso2: 'SY', nameAr: 'سوريا', nameEn: 'Syria', dialCode: '+963', flag: '🇸🇾', minLen: 9, maxLen: 9 },
  { iso2: 'IQ', nameAr: 'العراق', nameEn: 'Iraq', dialCode: '+964', flag: '🇮🇶', minLen: 10, maxLen: 10 },
  { iso2: 'PS', nameAr: 'فلسطين', nameEn: 'Palestine', dialCode: '+970', flag: '🇵🇸', minLen: 9, maxLen: 9 },
  { iso2: 'MA', nameAr: 'المغرب', nameEn: 'Morocco', dialCode: '+212', flag: '🇲🇦', minLen: 9, maxLen: 9 },
  { iso2: 'DZ', nameAr: 'الجزائر', nameEn: 'Algeria', dialCode: '+213', flag: '🇩🇿', minLen: 9, maxLen: 9 },
  { iso2: 'TN', nameAr: 'تونس', nameEn: 'Tunisia', dialCode: '+216', flag: '🇹🇳', minLen: 8, maxLen: 8 },
  { iso2: 'LY', nameAr: 'ليبيا', nameEn: 'Libya', dialCode: '+218', flag: '🇱🇾', minLen: 9, maxLen: 9 },
  { iso2: 'SD', nameAr: 'السودان', nameEn: 'Sudan', dialCode: '+249', flag: '🇸🇩', minLen: 9, maxLen: 9 },
  { iso2: 'SO', nameAr: 'الصومال', nameEn: 'Somalia', dialCode: '+252', flag: '🇸🇴', minLen: 7, maxLen: 9 }, // Range estimate
  { iso2: 'DJ', nameAr: 'جيبوتي', nameEn: 'Djibouti', dialCode: '+253', flag: '🇩🇯', minLen: 8, maxLen: 8 },
  { iso2: 'KM', nameAr: 'جزر القمر', nameEn: 'Comoros', dialCode: '+269', flag: '🇰🇲', minLen: 7, maxLen: 7 },
  { iso2: 'MR', nameAr: 'موريتانيا', nameEn: 'Mauritania', dialCode: '+222', flag: '🇲🇷', minLen: 8, maxLen: 8 },
  { iso2: 'YE', nameAr: 'اليمن', nameEn: 'Yemen', dialCode: '+967', flag: '🇾🇪', minLen: 9, maxLen: 9 },
  
  // Rest of the world (Common ones)
  { iso2: 'US', nameAr: 'الولايات المتحدة', nameEn: 'United States', dialCode: '+1', flag: '🇺🇸', minLen: 10, maxLen: 10 },
  { iso2: 'CA', nameAr: 'كندا', nameEn: 'Canada', dialCode: '+1', flag: '🇨🇦', minLen: 10, maxLen: 10 },
  { iso2: 'GB', nameAr: 'المملكة المتحدة', nameEn: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', minLen: 10, maxLen: 10 }, // Mobile often 10 excluding 0
  { iso2: 'FR', nameAr: 'فرنسا', nameEn: 'France', dialCode: '+33', flag: '🇫🇷', minLen: 9, maxLen: 9 },
  { iso2: 'DE', nameAr: 'ألمانيا', nameEn: 'Germany', dialCode: '+49', flag: '🇩🇪', minLen: 10, maxLen: 11 },
  { iso2: 'IT', nameAr: 'إيطاليا', nameEn: 'Italy', dialCode: '+39', flag: '🇮🇹', minLen: 9, maxLen: 10 },
  { iso2: 'ES', nameAr: 'إسبانيا', nameEn: 'Spain', dialCode: '+34', flag: '🇪🇸', minLen: 9, maxLen: 9 },
  { iso2: 'JP', nameAr: 'اليابان', nameEn: 'Japan', dialCode: '+81', flag: '🇯🇵', minLen: 10, maxLen: 10 },
  { iso2: 'KR', nameAr: 'كوريا الجنوبية', nameEn: 'South Korea', dialCode: '+82', flag: '🇰🇷', minLen: 9, maxLen: 11 },
  { iso2: 'CN', nameAr: 'الصين', nameEn: 'China', dialCode: '+86', flag: '🇨🇳', minLen: 11, maxLen: 11 },
  { iso2: 'IN', nameAr: 'الهند', nameEn: 'India', dialCode: '+91', flag: '🇮🇳', minLen: 10, maxLen: 10 },
  { iso2: 'PK', nameAr: 'باكستان', nameEn: 'Pakistan', dialCode: '+92', flag: '🇵🇰', minLen: 10, maxLen: 10 },
  { iso2: 'BD', nameAr: 'بنغلاديش', nameEn: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', minLen: 10, maxLen: 10 },
  { iso2: 'ID', nameAr: 'إندونيسيا', nameEn: 'Indonesia', dialCode: '+62', flag: '🇮🇩', minLen: 9, maxLen: 12 },
  { iso2: 'PH', nameAr: 'الفلبين', nameEn: 'Philippines', dialCode: '+63', flag: '🇵🇭', minLen: 10, maxLen: 10 },
  { iso2: 'MY', nameAr: 'ماليزيا', nameEn: 'Malaysia', dialCode: '+60', flag: '🇲🇾', minLen: 9, maxLen: 10 },
  { iso2: 'SG', nameAr: 'سنغافورة', nameEn: 'Singapore', dialCode: '+65', flag: '🇸🇬', minLen: 8, maxLen: 8 },
  { iso2: 'TH', nameAr: 'تايلاند', nameEn: 'Thailand', dialCode: '+66', flag: '🇹🇭', minLen: 9, maxLen: 9 },
  { iso2: 'VN', nameAr: 'فيتنام', nameEn: 'Vietnam', dialCode: '+84', flag: '🇻🇳', minLen: 9, maxLen: 9 },
  { iso2: 'IR', nameAr: 'إيران', nameEn: 'Iran', dialCode: '+98', flag: '🇮🇷', minLen: 10, maxLen: 10 },
  { iso2: 'TR', nameAr: 'تركيا', nameEn: 'Turkey', dialCode: '+90', flag: '🇹🇷', minLen: 10, maxLen: 10 },
  { iso2: 'RU', nameAr: 'روسيا', nameEn: 'Russia', dialCode: '+7', flag: '🇷🇺', minLen: 10, maxLen: 10 },
  { iso2: 'UA', nameAr: 'أوكرانيا', nameEn: 'Ukraine', dialCode: '+380', flag: '🇺🇦', minLen: 9, maxLen: 9 },
  { iso2: 'AU', nameAr: 'أستراليا', nameEn: 'Australia', dialCode: '+61', flag: '🇦🇺', minLen: 9, maxLen: 9 },
  { iso2: 'NZ', nameAr: 'نيوزيلندا', nameEn: 'New Zealand', dialCode: '+64', flag: '🇳🇿', minLen: 8, maxLen: 10 },
  { iso2: 'BR', nameAr: 'البرازيل', nameEn: 'Brazil', dialCode: '+55', flag: '🇧🇷', minLen: 10, maxLen: 11 },
  { iso2: 'MX', nameAr: 'المكسيك', nameEn: 'Mexico', dialCode: '+52', flag: '🇲🇽', minLen: 10, maxLen: 10 },
  { iso2: 'AR', nameAr: 'الأرجنتين', nameEn: 'Argentina', dialCode: '+54', flag: '🇦🇷', minLen: 10, maxLen: 10 },
  { iso2: 'ZA', nameAr: 'جنوب أفريقيا', nameEn: 'South Africa', dialCode: '+27', flag: '🇿🇦', minLen: 9, maxLen: 9 },
  { iso2: 'NG', nameAr: 'نيجيريا', nameEn: 'Nigeria', dialCode: '+234', flag: '🇳🇬', minLen: 10, maxLen: 10 },
  { iso2: 'KE', nameAr: 'كينيا', nameEn: 'Kenya', dialCode: '+254', flag: '🇰🇪', minLen: 9, maxLen: 9 },
  { iso2: 'ET', nameAr: 'إثيوبيا', nameEn: 'Ethiopia', dialCode: '+251', flag: '🇪🇹', minLen: 9, maxLen: 9 },
  { iso2: 'IL', nameAr: 'إسرائيل', nameEn: 'Israel', dialCode: '+972', flag: '🇮🇱', minLen: 9, maxLen: 9 },
  { iso2: 'SE', nameAr: 'السويد', nameEn: 'Sweden', dialCode: '+46', flag: '🇸🇪', minLen: 7, maxLen: 9 },
  { iso2: 'NO', nameAr: 'النرويج', nameEn: 'Norway', dialCode: '+47', flag: '🇳🇴', minLen: 8, maxLen: 8 },
  { iso2: 'DK', nameAr: 'الدنمارك', nameEn: 'Denmark', dialCode: '+45', flag: '🇩🇰', minLen: 8, maxLen: 8 },
  { iso2: 'FI', nameAr: 'فنلندا', nameEn: 'Finland', dialCode: '+358', flag: '🇫🇮', minLen: 5, maxLen: 12 },
  { iso2: 'NL', nameAr: 'هولندا', nameEn: 'Netherlands', dialCode: '+31', flag: '🇳🇱', minLen: 9, maxLen: 9 },
  { iso2: 'BE', nameAr: 'بلجيكا', nameEn: 'Belgium', dialCode: '+32', flag: '🇧🇪', minLen: 9, maxLen: 9 },
  { iso2: 'CH', nameAr: 'سويسرا', nameEn: 'Switzerland', dialCode: '+41', flag: '🇨🇭', minLen: 9, maxLen: 9 },
  { iso2: 'AT', nameAr: 'النمسا', nameEn: 'Austria', dialCode: '+43', flag: '🇦🇹', minLen: 10, maxLen: 13 },
  { iso2: 'PT', nameAr: 'البرتغال', nameEn: 'Portugal', dialCode: '+351', flag: '🇵🇹', minLen: 9, maxLen: 9 },
  { iso2: 'GR', nameAr: 'اليونان', nameEn: 'Greece', dialCode: '+30', flag: '🇬🇷', minLen: 10, maxLen: 10 },
  { iso2: 'PL', nameAr: 'بولندا', nameEn: 'Poland', dialCode: '+48', flag: '🇵🇱', minLen: 9, maxLen: 9 },
  { iso2: 'CZ', nameAr: 'التشيك', nameEn: 'Czech Republic', dialCode: '+420', flag: '🇨🇿', minLen: 9, maxLen: 9 },
  { iso2: 'HU', nameAr: 'المجر', nameEn: 'Hungary', dialCode: '+36', flag: '🇭🇺', minLen: 9, maxLen: 9 },
];

export const validatePhoneNumber = (code, number) => {
  const sanitizePhone = (input) => input.replace(/[^0-9]/g, '');
  const cleanNumber = sanitizePhone(number);
  // Optional: decide if empty is valid or not. For form validation, usually checked separately.
  // Here we return isValid:false for empty to be safe if called.
  if (!cleanNumber) return { isValid: false, message: 'Required' };

  const rule = COUNTRY_CODES.find(c => c.dialCode === code);
  if (!rule) return { isValid: true, message: '' };

  if (cleanNumber.length < rule.minLen || cleanNumber.length > rule.maxLen) {
    return {
      isValid: false,
      message: `Must be ${rule.minLen === rule.maxLen ? rule.minLen : `${rule.minLen}-${rule.maxLen}`} digits`,
      messageAr: `يجب أن يكون ${rule.minLen === rule.maxLen ? rule.minLen : `${rule.minLen}-${rule.maxLen}`} رقمًا`
    };
  }

  return { isValid: true, message: '' };
};

export const usePhoneValidation = () => {
  const sanitizePhone = (input) => {
    return input.replace(/[^0-9]/g, '');
  };

  const getCountryRule = (code) => {
    return COUNTRY_CODES.find(c => c.dialCode === code);
  };

  const validatePhone = (code, number) => {
    return validatePhoneNumber(code, number);
  };

  return {
    COUNTRY_CODES,
    sanitizePhone,
    validatePhone,
    getCountryRule
  };
};
