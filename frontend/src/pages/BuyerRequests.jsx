import { useTranslation } from 'react-i18next';

const BuyerRequests = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t('buyerRequests.title', 'Buyer Requests')}</h1>
      <div className="bg-white rounded-lg shadow p-4">
        <p>{t('buyerRequests.comingSoon', 'Buyer Requests page is coming soon...')}</p>
      </div>
    </div>
  );
};

export default BuyerRequests;
