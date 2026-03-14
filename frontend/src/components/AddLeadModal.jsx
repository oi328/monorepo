import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../shared/context/ThemeProvider.jsx';
import { api } from '../utils/api';
import { useAppState } from '../shared/context/AppStateProvider.jsx';
import { useStages } from '../hooks/useStages'; // Import hook

const AddLeadModal = ({ isOpen, onClose, onSave }) => {
  const { t, i18n } = useTranslation();
  const { theme, resolvedTheme } = useTheme();
  const { crmSettings, user } = useAppState();
  const { stages } = useStages(); // Get stages from hook
  const isLight = resolvedTheme === 'light';
  const isArabic = i18n.language === 'ar';

  const userRole = (user?.role || '').toLowerCase();
  const isSalesPerson =
    userRole.includes('sales person') ||
    userRole.includes('salesperson');

  const makeEmptyRow = () => ({
    name: '',
    phone: '',
    email: '',
    company: '',
    status: 'new',
    priority: 'medium',
    source: 'direct',
    campaign: '',
    notes: '',
    assignedTo: isSalesPerson ? (user?.name || '') : '',
    estimatedValue: '',
    country: crmSettings?.defaultCountryCode || '',
  });

  const [rows, setRows] = useState([makeEmptyRow()]);
  const [stageOptions, setStageOptions] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);

  useEffect(() => {
    try {
      // Use stages from hook
      if (Array.isArray(stages) && stages.length > 0) {
        setStageOptions(stages);
      } else {
        // Fallback
        setStageOptions([
            'new',
            'qualified',
            'in-progress',
            'converted',
            'lost'
        ]);
      }
    } catch (e) {
      // fallback
    }
    
    // Fetch campaigns
    const fetchCampaigns = async () => {
      try {
        const res = await api.get('/api/campaigns');
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setCampaignsList(list);
      } catch (error) {
        console.error('Failed to fetch campaigns', error);
      }
    };
    fetchCampaigns();
  }, [isOpen]);

  useEffect(() => {
    if (isSalesPerson && user?.name) {
      setRows(prev => prev.map(r => ({
        ...r,
        assignedTo: r.assignedTo ? r.assignedTo : user.name
      })));
    }
  }, [isSalesPerson, user?.name]);

  const handleCellChange = (index, field, value) => {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows(prev => [...prev, makeEmptyRow()]);
  const removeRow = (index) => setRows(prev => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    const prepared = rows
      .filter(r => (r.name?.trim() || r.phone?.trim() || r.email?.trim()))
      .map((r, idx) => ({
        id: Date.now() + idx,
        name: r.name?.trim() || '',
        email: r.email?.trim() || '',
        phone: r.phone?.trim() || '',
        company: r.company?.trim() || '',
        status: r.status || 'new',
        priority: r.priority || 'medium',
        source: r.source || 'direct',
        campaign: r.campaign || '',
        assignedTo: r.assignedTo?.trim() || 'Unassigned',
        createdAt: new Date().toISOString(),
        lastContact: new Date().toISOString(),
        estimatedValue: isNaN(parseFloat(r.estimatedValue)) ? 0 : parseFloat(r.estimatedValue),
        notes: r.notes?.trim() || ''
      }));
    if (prepared.length === 0) {
      onClose && onClose();
      return;
    }
    onSave && onSave(prepared);
    onClose && onClose();
    setRows([makeEmptyRow(), makeEmptyRow(), makeEmptyRow()]);
  };

  if (!isOpen) return null;

  const inputClass = `w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    isLight 
      ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400' 
      : 'bg-transparent border-slate-600 text-white placeholder-slate-500 hover:border-slate-500'
  }`;

  const selectClass = `w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    isLight 
      ? 'bg-white border-gray-300 text-gray-900' 
      : 'bg-slate-900 border-slate-600 text-white'
  }`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className={`${isLight ? 'bg-white border-gray-200' : 'bg-slate-900/90 backdrop-blur-md border-slate-700'} sm:rounded-2xl shadow-2xl border w-full h-screen sm:max-w-[1100px] sm:max-h-[90vh] sm:h-auto sm:overflow-hidden overflow-y-auto transition-colors duration-300`}>
        {/* Header */}
        <div className={`relative flex items-center justify-between p-6 border-b ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-gray-800' : 'text-white'} ${isArabic ? 'text-right' : 'text-left'}`}>
            {isArabic ? 'إضافة عملاء' : 'Add Leads'}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-red-500"
            title={t('Close')}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Grid-like Form */}
        <div className="p-6">
          <div className="overflow-x-auto dribbble-card">
            <table className={`add-lead-table min-w-[1300px] w-full table-auto text-sm md:text-base ${isLight ? 'text-gray-900' : 'text-white'}`}>
              <thead className={`sticky top-0 ${isLight ? 'bg-gray-50 text-gray-700' : 'bg-slate-800 text-gray-200'}`}>
                <tr>
                  <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>{t('Lead')}</th>
                  <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>{t('Contact')}</th>
                  <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>{t('Source')}</th>
                  <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>{t('Campaign')}</th>
                  <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>{t('Project')}</th>
                  {!isSalesPerson && (
                    <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>{t('Sales')}</th>
                  )}
                  <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>{t('Last Comment')}</th>
                  <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>{t('Stage')}</th>
                  <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>{t('Expected Revenue')}</th>
                  <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>{t('Priority')}</th>
                  <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>{t('Status')}</th>
                  <th className={`px-3 py-2 border-b text-right whitespace-nowrap ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>#</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className={`${isLight ? 'odd:bg-white even:bg-gray-50' : 'odd:bg-transparent even:bg-slate-800/30'} border-b ${isLight ? 'border-gray-100' : 'border-slate-700'}`}>
                    <td className="px-2 py-2 border-t-0 align-top whitespace-nowrap">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleCellChange(idx, 'name', e.target.value)}
                        placeholder={t('Lead Name')}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-2 border-t-0 align-top whitespace-nowrap">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-2">
                          <FaPhone className={isLight ? 'text-gray-500' : 'text-gray-400'} />
                          <input
                            type="text"
                            value={row.phone}
                            onChange={(e) => handleCellChange(idx, 'phone', e.target.value)}
                            placeholder={t('Phone')}
                            className={inputClass}
                          />
                          <FaWhatsapp className="text-green-500" />
                        </div>
                        <div className="flex items-center gap-2">
                          <FaEnvelope className={isLight ? 'text-gray-500' : 'text-gray-400'} />
                          <input
                            type="email"
                            value={row.email}
                            onChange={(e) => handleCellChange(idx, 'email', e.target.value)}
                            placeholder={t('Email')}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 border-t-0 align-top whitespace-nowrap">
                      <select
                        value={row.source}
                        onChange={(e) => handleCellChange(idx, 'source', e.target.value)}
                        className={selectClass}
                      >
                        <option value="website" className="text-gray-900">{t('Website')}</option>
                        <option value="social-media" className="text-gray-900">{t('Social Media')}</option>
                        <option value="referral" className="text-gray-900">{t('Referral')}</option>
                        <option value="email-campaign" className="text-gray-900">{t('Email Campaign')}</option>
                        <option value="direct" className="text-gray-900">{t('Direct')}</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 border-t-0 align-top whitespace-nowrap">
                      <select
                        value={row.campaign}
                        onChange={(e) => handleCellChange(idx, 'campaign', e.target.value)}
                        className={selectClass}
                      >
                        <option value="">{t('Select')}</option>
                        {campaignsList.map((c, cIdx) => (
                          <option key={c.id || cIdx} value={c.name} className="text-gray-900">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 border-t-0 align-top whitespace-nowrap">
                      <input
                        type="text"
                        value={row.company}
                        onChange={(e) => handleCellChange(idx, 'company', e.target.value)}
                        placeholder={t('Project')}
                        className={inputClass}
                      />
                    </td>
                    {!isSalesPerson && (
                      <td className="px-2 py-2 border-t-0 align-top whitespace-nowrap">
                        <input
                          type="text"
                          value={row.assignedTo}
                          onChange={(e) => handleCellChange(idx, 'assignedTo', e.target.value)}
                          placeholder={t('Sales')}
                          className={inputClass}
                        />
                      </td>
                    )}
                    <td className="px-2 py-2 border-t-0 align-top">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => handleCellChange(idx, 'notes', e.target.value)}
                        placeholder={t('Last Comment')}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-2 border-t-0 align-top whitespace-nowrap">
                      <select
                        value={row.status}
                        onChange={(e) => handleCellChange(idx, 'status', e.target.value)}
                        className={selectClass}
                      >
                        {stageOptions.map((opt) => {
                          const val = typeof opt === 'string' ? opt : opt.name;
                          const label = typeof opt === 'string' ? t(opt) : (isArabic ? (opt.name_ar || opt.name) : opt.name);
                          return (
                            <option key={val} value={val} className="text-gray-900">{label}</option>
                          )
                        })}
                      </select>
                    </td>
                    <td className="px-2 py-2 border-t-0 align-top whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.estimatedValue}
                        onChange={(e) => handleCellChange(idx, 'estimatedValue', e.target.value)}
                        placeholder={t('Expected Revenue')}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-2 border-t-0 align-top whitespace-nowrap">
                      <select
                        value={row.priority}
                        onChange={(e) => handleCellChange(idx, 'priority', e.target.value)}
                        className={selectClass}
                      >
                        <option value="low" className="text-gray-900">{t('Low')}</option>
                        <option value="medium" className="text-gray-900">{t('Medium')}</option>
                        <option value="high" className="text-gray-900">{t('High')}</option>
                        <option value="urgent" className="text-gray-900">{t('Urgent')}</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 border-t-0 align-top whitespace-nowrap">
                      <select
                        value={row.status}
                        disabled
                        className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isLight ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-slate-800/50 text-gray-400 border-slate-600'}`}
                      >
                        {stageOptions.map((opt) => {
                          const val = typeof opt === 'string' ? opt : opt.name;
                          const label = typeof opt === 'string' ? t(opt) : (isArabic ? (opt.name_ar || opt.name) : opt.name);
                          return (
                            <option key={val} value={val} className="text-gray-900">{label}</option>
                          )
                        })}
                      </select>
                    </td>
                    <td className="px-3 py-3 border-t-0 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="btn btn-sm btn-circle btn-ghost text-red-600 hover:bg-red-50"
                        title={t('Delete Row')}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 sm:gap-0">
            <button
              type="button"
              onClick={addRow}
              className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('Add Row')}
            </button>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none w-full sm:w-auto"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn bg-blue-600 hover:bg-blue-700 text-white border-none w-full sm:w-auto px-8 font-semibold"
              >
                {t('Save Leads')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLeadModal;
