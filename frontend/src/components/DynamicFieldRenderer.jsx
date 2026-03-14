import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import { FaSpinner } from 'react-icons/fa';

export default function DynamicFieldRenderer({ entityKey, values, onChange, isRTL, isLight }) {
  const { t, i18n } = useTranslation();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await api.get(`/api/admin/fields?entity=${entityKey}`);
        // Filter only active fields and sort them
        const activeFields = response.data
            .filter(f => f.active)
            .sort((a, b) => a.sort_order - b.sort_order);
        setFields(activeFields);
      } catch (err) {
        console.error("Failed to fetch dynamic fields", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, [entityKey]);

  if (loading) return <div className="py-4 text-center text-theme-text"><FaSpinner className="animate-spin inline-block mr-2" /> {t('Loading additional fields...')}</div>;
  if (fields.length === 0) return null;

  const labelTone = isLight ? 'text-gray-700' : 'text-theme-text';
  const inputTone = isLight 
    ? 'card border-gray-300 text-theme-text focus:border-blue-500 focus:ring-blue-500' 
    : 'card border-gray-600 text-theme-text focus:border-blue-500 focus:ring-blue-500';

  return (
    <div className="space-y-4 border-t pt-6 mt-6 border-dashed border-gray-300 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-theme-text mb-4">{t('Additional Information')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(field => {
          const label = i18n.language === 'ar' ? field.label_ar : field.label_en;
          const placeholder = i18n.language === 'ar' ? field.placeholder_ar : field.placeholder_en;
          const value = values[field.key] || '';

          return (
            <div key={field.key} className={field.type === 'textarea' ? 'col-span-2' : ''}>
              <label className={`block text-sm font-medium mb-1 ${labelTone}`}>
                {label} {field.required && <span className="text-red-500">*</span>}
              </label>
              
              {field.type === 'select' ? (
                <select
                  value={value}
                  onChange={e => onChange(field.key, e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                  required={field.required}
                >
                    <option value="">{t('Select')}</option>
                    {field.options && field.options.map((opt, idx) => (
                        <option key={idx} value={opt}>{opt}</option>
                    ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={value}
                  onChange={e => onChange(field.key, e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                  rows={3}
                  placeholder={placeholder}
                  required={field.required}
                />
              ) : field.type === 'checkbox' ? (
                 <div className="flex items-center gap-2 mt-2">
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={e => onChange(field.key, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-theme-text">{t('Yes')}</span>
                 </div>
              ) : (
                <input
                  type={field.type}
                  value={value}
                  onChange={e => onChange(field.key, e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                  placeholder={placeholder}
                  required={field.required}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
