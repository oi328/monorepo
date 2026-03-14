import { useTranslation } from 'react-i18next';

export default function ReportPlaceholder({ titleKey, descKey }) {
  const { t } = useTranslation();
  return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <p className="text-gray-700 dark:text-gray-200 text-base">{t(descKey)}</p>
        <div className="mt-6 text-gray-500 dark:text-gray-400 text-sm">{t('Coming soon')}</div>
      </div>
  );
}
