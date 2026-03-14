import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../shared/context/ThemeProvider.jsx';
import { api } from '../utils/api';
import { useAppState } from '../shared/context/AppStateProvider.jsx';
import { FaTimes, FaChevronDown, FaPaperclip, FaChevronUp } from 'react-icons/fa';
import SearchableSelect from './SearchableSelect';
import DynamicFieldRenderer from './DynamicFieldRenderer';
import { useStages } from '../hooks/useStages';
import { useQueryClient } from '@tanstack/react-query';
import { usePhoneValidation } from '../hooks/usePhoneValidation';
import CountryCodeSelect from './CountryCodeSelect';

const EditLeadModal = ({ isOpen, onClose, onSave, lead, canEditInfo, canEditPhone }) => {
  const { t, i18n } = useTranslation();
  const { theme, resolvedTheme } = useTheme();
  const { crmSettings, user: currentUser, company: tenantCompany } = useAppState();
  const queryClient = useQueryClient();
  const isLight = resolvedTheme === 'light';
  const isRTL = i18n.language === 'ar';
  const isArabic = isRTL;

  const { validatePhone, COUNTRY_CODES } = usePhoneValidation();
  const [phoneErrors, setPhoneErrors] = useState([]);

  // Form States
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [campaign, setCampaign] = useState('');
  const [project, setProject] = useState('');
  const [item, setItem] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState('');
  const [tags, setTags] = useState('');
  const [expectedRevenue, setExpectedRevenue] = useState('');
  const [mobileNumbers, setMobileNumbers] = useState([{ code: '+20', number: '' }]);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dynamicValues, setDynamicValues] = useState({});
  const [primaryCollapsed, setPrimaryCollapsed] = useState(false);

  // Lists
  const { stages } = useStages();
  const [usersList, setUsersList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [sourcesList, setSourcesList] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);

  // Initialization
  useEffect(() => {
    if (lead) {
      setName(lead.fullName || lead.name || '');
      setSource(lead.source || '');
      setCampaign(lead.campaign || '');
      setProject(lead.project || '');
      setItem(lead.item_id || lead.item || '');
      setCompany(lead.company || '');
      setType(lead.type || '');
      setTags(lead.tags || '');
      setExpectedRevenue(lead.estimatedValue || lead.estimated_value || '');
      setEmail(lead.email || '');
      setNote(lead.notes || '');
      setAssignedTo(lead.assignedTo || lead.assigned_to || '');
      setStage(lead.stage || 'New');
      setStatus(lead.status || '');
      setPriority(lead.priority || 'medium');
      setDynamicValues(lead.custom_fields || {});

      // Parse mobile numbers
      const phoneStr = lead.mobile || lead.phone || '';
      if (phoneStr) {
        const parsed = phoneStr.split('/').map(p => {
          const trimmed = p.trim();
          // Try to split by space to separate code and number if possible
          // Assuming format "+Code Number" or just "Number"
          // We can try to find if it starts with a known country code
          let matchedCode = '+20'; // default
          let numberPart = trimmed;

          // Simple heuristic: if contains space, assume first part is code
          if (trimmed.includes(' ')) {
             const parts = trimmed.split(' ');
             if (parts.length >= 2) {
                 matchedCode = parts[0];
                 numberPart = parts.slice(1).join('');
             }
          } else if (trimmed.startsWith('+')) {
              // If starts with +, try to match with known codes
               const codeMatch = COUNTRY_CODES.find(c => trimmed.startsWith(c.dialCode));
               if (codeMatch) {
                   matchedCode = codeMatch.dialCode;
                   numberPart = trimmed.slice(codeMatch.dialCode.length);
               }
          }
          
          return { code: matchedCode, number: numberPart };
        });
        setMobileNumbers(parsed.length > 0 ? parsed : [{ code: '+20', number: '' }]);
      } else {
        setMobileNumbers([{ code: '+20', number: '' }]);
      }
    }
  }, [lead]);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sourcesRes, campaignsRes, usersRes] = await Promise.all([
          api.get('/api/sources?active=1'),
          api.get('/api/campaigns'),
          api.get('/api/users')
        ]);
        
        setSourcesList(Array.isArray(sourcesRes.data) ? sourcesRes.data : (sourcesRes.data?.data || []));
        setCampaignsList(Array.isArray(campaignsRes.data) ? campaignsRes.data : (campaignsRes.data?.data || []));
        setUsersList(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []));
      } catch (e) {
        console.error('Failed to fetch data', e);
      }
    };
    fetchData();
  }, []);

  // Fetch items/projects
  useEffect(() => {
    const compType = String(tenantCompany?.company_type || '').toLowerCase();
    
    if (compType === 'general') {
      const fetchItems = async () => {
        try {
          const res = await api.get('/api/items?all=1');
          setItemsList(res.data?.data || res.data || []);
        } catch (e) { console.error(e); }
      };
      fetchItems();
    } else {
      const fetchProjects = async () => {
        try {
          const res = await api.get('/api/projects?all=1');
          setProjectsList(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (e) { console.error(e); }
      };
      fetchProjects();
    }
  }, [tenantCompany?.company_type]);

  // Options
  const sourceOptions = useMemo(() => sourcesList.map(s => ({ value: s.name, label: s.name })), [sourcesList]);
  const campaignOptions = useMemo(() => campaignsList.map(c => ({ value: c.name, label: c.name })), [campaignsList]);
  const projectOptions = useMemo(() => projectsList.map(p => ({ value: p.name || p.companyName || p, label: p.name || p.companyName || p })), [projectsList]);
  const itemOptions = useMemo(() => itemsList.map(i => ({ value: i.id, label: i.name })), [itemsList]);
  const userOptions = useMemo(() => usersList.map(u => ({ value: u.id, label: u.name })), [usersList]);
  const stageOptions = useMemo(() => stages.map(s => ({ value: s.name, label: isRTL ? (s.nameAr || s.name) : s.name })), [stages, isRTL]);
  
  const typeOptions = useMemo(() => [
    { value: 'Company', label: t('Company') },
    { value: 'Individual', label: t('Individual') }
  ], [t]);
  
  const priorityOptions = useMemo(() => [
    { value: 'low', label: t('Low') },
    { value: 'medium', label: t('Medium') },
    { value: 'high', label: t('High') }
  ], [t]);

  // Handlers
  const addMobileNumber = () => setMobileNumbers(prev => [...prev, { code: prev[0]?.code || '+20', number: '' }]);
  const removeMobileNumber = (idx) => {
    setMobileNumbers(prev => prev.filter((_, i) => i !== idx));
    setPhoneErrors(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMobileNumber = (idx, field, value) => {
    setMobileNumbers(prev => {
        const next = prev.map((n, i) => (i === idx ? { ...n, [field]: value } : n));
        const current = next[idx] || { code: '+20', number: '' };
        const check = validatePhone(current.code, current.number);
        setPhoneErrors(prevErrs => {
             const arr = [...prevErrs];
             arr[idx] = check.isValid ? '' : (isRTL ? check.messageAr : check.message);
             return arr;
        });
        return next;
    });
  };
  
  const handleDynamicChange = (key, value) => setDynamicValues(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const nameTrimmed = name.trim();
    if (!nameTrimmed || !source.trim()) {
        alert(t('Please fill required fields'));
        return;
    }

    // Check phone errors
    const hasPhoneError = mobileNumbers.some((m) => {
        if (!m.number.trim()) return false; // allow empty if not required? But usually phone is required.
        const check = validatePhone(m.code, m.number);
        return !check.isValid;
    });

    if (hasPhoneError) {
        alert(isRTL ? 'يرجى تصحيح أخطاء رقم الهاتف' : 'Please fix phone number errors');
        return;
    }

    const updatedLead = {
        ...lead,
        fullName: nameTrimmed,
        name: nameTrimmed,
        email: email.trim(),
        phone: mobileNumbers.filter((m) => m.number.trim()).map((m) => `${m.code} ${m.number}`).join(' / '),
        mobile: mobileNumbers.filter((m) => m.number.trim()).map((m) => `${m.code} ${m.number}`).join(' / '),
        company: company.trim() || project.trim() || '',
        type: type || ((company.trim() || project.trim()) ? 'Company' : 'Individual'),
        stage,
        status,
        priority,
        source,
        campaign,
        assignedTo: String(assignedTo).trim(),
        notes: (note || '').trim(),
        estimatedValue: expectedRevenue,
        project: project.trim(),
        item_id: item,
        custom_fields: dynamicValues,
        lastModified: new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')
    };
    
    // In a real scenario, you might want to send attachments via API separately or here
    // But since onSave typically updates local state or calls a parent handler:
    onSave(updatedLead);
    
    // If we need to actually call API PUT here:
    try {
        await api.put(`/api/leads/${lead.id}`, updatedLead);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (e) {
        console.error("Error updating lead", e);
    }
    
    onClose();
  };

  if (!isOpen || !lead) return null;

  const formTone = isLight ? 'bg-white' : 'bg-slate-800 text-white';
  const labelTone = isLight ? 'text-gray-700' : 'text-gray-300';
  const inputTone = isLight
    ? 'bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-gray-900'
    : 'bg-gray-700 border-gray-600 text-white focus:ring-blue-400 focus:border-blue-400';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`${formTone} w-full max-w-4xl rounded-lg shadow-xl relative flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
            <h2 className="text-xl font-bold">{isArabic ? 'تعديل بيانات العميل' : 'Edit Lead'}</h2>
            <button onClick={onClose} className="text-red-500 hover:text-red-700 p-2">
                <FaTimes size={20} />
            </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
             <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{t('Primary Lead')}</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                     {/* Name */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Name')} <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                            disabled={!canEditInfo}
                        />
                     </div>

                     {/* Source */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Source')} <span className="text-red-500">*</span></label>
                        <SearchableSelect
                            options={sourceOptions}
                            value={source}
                            onChange={setSource}
                            placeholder={t('Select')}
                            isRTL={isRTL}
                            showAllOption={false}
                            isDisabled={!canEditInfo}
                        />
                     </div>

                     {/* Campaign */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Campaign')}</label>
                        <SearchableSelect
                            options={campaignOptions}
                            value={campaign}
                            onChange={setCampaign}
                            placeholder={t('Select')}
                            isRTL={isRTL}
                            showAllOption={false}
                            isDisabled={!canEditInfo}
                        />
                     </div>

                     {/* Project / Item */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>
                            {String(tenantCompany?.company_type || '').toLowerCase() === 'general' ? t('Item') : t('Project')}
                        </label>
                        {String(tenantCompany?.company_type || '').toLowerCase() === 'general' ? (
                            <SearchableSelect
                                options={itemOptions}
                                value={item}
                                onChange={setItem}
                                placeholder={t('Select item')}
                                isRTL={isRTL}
                                showAllOption={false}
                                isDisabled={!canEditInfo}
                            />
                        ) : (
                            <SearchableSelect
                                options={projectOptions}
                                value={project}
                                onChange={setProject}
                                placeholder={t('Select')}
                                isRTL={isRTL}
                                showAllOption={false}
                                isDisabled={!canEditInfo}
                            />
                        )}
                     </div>

                     {/* Type */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Type')}</label>
                        <SearchableSelect
                            options={typeOptions}
                            value={type}
                            onChange={setType}
                            placeholder={t('Select')}
                            isRTL={isRTL}
                            showAllOption={false}
                            isDisabled={!canEditInfo}
                        />
                     </div>

                     {/* Company */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Company')}</label>
                        <input
                            type="text"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                            disabled={!canEditInfo}
                        />
                     </div>

                     {/* Expected Revenue */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Expected Revenue')}</label>
                        <input
                            type="number"
                            value={expectedRevenue}
                            onChange={(e) => setExpectedRevenue(e.target.value)}
                            className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                        />
                     </div>

                     {/* Stage */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Stage')}</label>
                        <SearchableSelect
                            options={stageOptions}
                            value={stage}
                            onChange={setStage}
                            placeholder={t('Select')}
                            isRTL={isRTL}
                            showAllOption={false}
                        />
                     </div>

                     {/* Priority */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Priority')}</label>
                        <SearchableSelect
                            options={priorityOptions}
                            value={priority}
                            onChange={setPriority}
                            placeholder={t('Select')}
                            isRTL={isRTL}
                            showAllOption={false}
                        />
                     </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                     {/* Mobile */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Mobile')} <span className="text-red-500">*</span></label>
                        {mobileNumbers.map((m, idx) => (
                            <div key={idx} className="mb-2">
                                <div className="flex items-center gap-2">
                                    <CountryCodeSelect
                                        value={m.code}
                                        onChange={(val) => updateMobileNumber(idx, 'code', val)}
                                        isLight={isLight} inputTone={inputTone} isRTL={isRTL}
                                    />
                                    <input
                                        type="tel"
                                        value={m.number}
                                        onChange={(e) => updateMobileNumber(idx, 'number', e.target.value)}
                                        className={`flex-1 min-w-0 rounded-md border px-3 py-2 ${inputTone}`}
                                        placeholder={t('Mobile number')}
                                        disabled={!canEditPhone}
                                    />
                                    {idx === 0 ? (
                                        <button
                                            type="button"
                                            onClick={addMobileNumber}
                                            className={`p-2 rounded-md border ${isLight ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-700 border-gray-600 text-blue-400'}`}
                                            title={t('Add another number')}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => removeMobileNumber(idx)}
                                            className={`p-2 rounded-md border ${isLight ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-700 border-gray-600 text-red-400'}`}
                                            title={t('Remove number')}
                                        >
                                            <FaTimes className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                {phoneErrors[idx] && <p className="text-xs text-red-500 mt-1 mx-1">{phoneErrors[idx]}</p>}
                            </div>
                        ))}
                     </div>

                     {/* Email */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                            disabled={!canEditInfo}
                        />
                     </div>

                     {/* Tags */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Tags')}</label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                        />
                     </div>

                     {/* Sales (Assigned To) */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Sales (Assigned To)')}</label>
                        <SearchableSelect
                            options={userOptions}
                            value={assignedTo}
                            onChange={setAssignedTo}
                            placeholder={t('Select sales Person ')}
                            isRTL={isRTL}
                            showAllOption={false}
                        />
                     </div>

                     {/* Attachments (Display only or add new - simplified) */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Attachments')}</label>
                         <div className={`relative w-full rounded-md border px-3 py-2 ${inputTone} flex items-center`}>
                            <input
                                type="file"
                                multiple
                                onChange={(e) => setAttachments(prev => [...prev, ...Array.from(e.target.files)])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                                <FaPaperclip className="text-gray-400" />
                                <span className="text-sm truncate">
                                    {attachments.length > 0 
                                        ? `${attachments.length} ${t('files selected')}`
                                        : t('Choose files...')}
                                </span>
                            </div>
                        </div>
                     </div>

                     {/* Note */}
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Note')}</label>
                        <textarea
                            rows={4}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                        />
                     </div>
                </div>
             </div>

             {/* Dynamic Fields */}
             <div className="mt-4 border-t pt-4 border-gray-100 dark:border-gray-700">
                  <DynamicFieldRenderer 
                    entityKey="leads"
                    values={dynamicValues}
                    onChange={handleDynamicChange}
                    isRTL={isRTL}
                  />
             </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'} flex justify-end gap-3`}>
            <button
                onClick={onClose}
                className="px-4 py-2 rounded-md bg-gray-500 text-white hover:bg-gray-600"
            >
                {t('Cancel')}
            </button>
            <button
                onClick={handleSave}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
                {isArabic ? 'حفظ التعديلات' : 'Save Changes'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default EditLeadModal;
