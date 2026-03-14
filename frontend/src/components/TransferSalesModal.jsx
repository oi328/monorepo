import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaUserTie, FaHistory, FaLayerGroup } from 'react-icons/fa';
import SearchableSelect from './SearchableSelect'; // Assuming this component exists and works for selecting users

const TransferSalesModal = ({ isOpen, onClose, onConfirm, usersList = [] }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [selectedSalesPerson, setSelectedSalesPerson] = useState('');
  const [historyOption, setHistoryOption] = useState('keep_history'); // 'keep_history' | 'assign_as_new'
  const [stageOption, setStageOption] = useState('same_stage'); // 'same_stage' | 'new_lead' | 'cold_calls'

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSalesPerson('');
      setHistoryOption('keep_history');
      setStageOption('same_stage');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedSalesPerson) return;
    
    onConfirm({
      salesPersonId: selectedSalesPerson,
      historyOption,
      stageOption
    });
    onClose();
  };

  const salesOptions = usersList.map(u => ({ value: u.id, label: u.name }));

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <FaUserTie />
            </div>
            <h2 className="font-semibold text-lg text-slate-900 dark:text-white">{t('Transfer to Other Sales')}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors text-slate-400">
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Select Sales Person */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{t('Select Sales Person')}</label>
            {usersList.length > 0 ? (
              <SearchableSelect 
                options={salesOptions}
                value={selectedSalesPerson}
                onChange={setSelectedSalesPerson}
                placeholder={t('Select Sales Person')}
                className="w-full"
              />
            ) : (
              <div className="p-3 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800">
                {t('No sales persons available or still loading...')}
              </div>
            )}
          </div>

          {/* History Option */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block flex items-center gap-2">
              <FaHistory className="text-slate-400" /> {t('History Options')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setHistoryOption('keep_history')}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  historyOption === 'keep_history'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
                }`}
              >
                {t('Keep History')}
                <div className="text-[10px] font-normal mt-1 opacity-80">{t('Sales sees everything')}</div>
              </button>
              <button
                onClick={() => setHistoryOption('assign_as_new')}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  historyOption === 'assign_as_new'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
                }`}
              >
                {t('Assign As New')}
                <div className="text-[10px] font-normal mt-1 opacity-80">{t('History hidden for Sales')}</div>
              </button>
            </div>
          </div>

          {/* Stage Option */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block flex items-center gap-2">
              <FaLayerGroup className="text-slate-400" /> {t('Target Stage')}
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <input 
                  type="radio" 
                  name="stage_option" 
                  value="same_stage"
                  checked={stageOption === 'same_stage'}
                  onChange={() => setStageOption('same_stage')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{t('Same Stage')}</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <input 
                  type="radio" 
                  name="stage_option" 
                  value="new_lead"
                  checked={stageOption === 'new_lead'}
                  onChange={() => setStageOption('new_lead')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{t('New Lead')}</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <input 
                  type="radio" 
                  name="stage_option" 
                  value="cold_calls"
                  checked={stageOption === 'cold_calls'}
                  onChange={() => setStageOption('cold_calls')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{t('Cold Calls')}</span>
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {t('Cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedSalesPerson}
            className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-all ${
              selectedSalesPerson 
                ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20' 
                : 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed'
            }`}
          >
            {t('Transfer')}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default TransferSalesModal;
