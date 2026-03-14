import { useTranslation } from 'react-i18next';
import { useAppState } from '@shared/context/AppStateProvider';
import { useTheme } from '@shared/context/ThemeProvider';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useStages } from '../hooks/useStages';
import { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { FaChevronDown, FaChevronUp, FaTimes, FaPaperclip } from 'react-icons/fa';
import SearchableSelect from '../components/SearchableSelect';
import { useDynamicFields } from '../hooks/useDynamicFields';
import DynamicFieldRenderer from '../components/DynamicFieldRenderer';
import { usePhoneValidation } from '../hooks/usePhoneValidation';
import CountryCodeSelect from '../components/CountryCodeSelect';

export const AddNewLead = () => {
  const { t, i18n } = useTranslation();
  const { theme, resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isRTL = String(i18n.language || '').startsWith('ar');
  const { validatePhone } = usePhoneValidation();

  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [campaign, setCampaign] = useState('');
  const [project, setProject] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState('');
  const [tags, setTags] = useState('');
  const [expectedRevenue, setExpectedRevenue] = useState('');
  const [mobileNumbers, setMobileNumbers] = useState([{ code: '+20', number: '' }]);
  
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState([]);
  const { stages, statuses } = useStages();
  const [assignedTo, setAssignedTo] = useState('');
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('medium');
  const [primaryCollapsed, setPrimaryCollapsed] = useState(false);
  const [projectsList, setProjectsList] = useState([]);
  
  const { user: currentUser, company: tenantCompany } = useAppState();
  const modulePermissions = (currentUser?.meta_data && currentUser.meta_data.module_permissions) || {};
  const hasExplicitLeadPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Leads');
  const leadModulePerms = hasExplicitLeadPerms && Array.isArray(modulePermissions.Leads) ? modulePermissions.Leads : [];
  const effectiveLeadPerms = hasExplicitLeadPerms ? leadModulePerms : (() => {
    const role = currentUser?.role || '';
    if (role === 'Sales Admin') return ['addLead','importLeads'];
    if (role === 'Operation Manager') return ['addLead','importLeads','editInfo','editPhone'];
    if (role === 'Branch Manager') return ['addLead','importLeads','editInfo'];
    if (role === 'Director') return ['addLead','importLeads','editInfo'];
    if (role === 'Sales Manager') return ['addLead','importLeads','editInfo'];
    if (role === 'Team Leader') return ['addLead','importLeads'];
    if (role === 'Sales Person') return ['addLead','importLeads'];
    return [];
  })();
  const roleLower = String(currentUser?.role || '').toLowerCase();
  const isSalesPerson =
    roleLower.includes('sales person') ||
    roleLower.includes('salesperson');
  const isTenantAdmin =
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin';
  const canAddLead =
    effectiveLeadPerms.includes('addLead') ||
    currentUser?.is_super_admin ||
    isTenantAdmin ||
    roleLower.includes('director');
  const [usersList, setUsersList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [sourcesList, setSourcesList] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);
  const [item, setItem] = useState('');

  // Fetch sources & campaigns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sourcesRes, campaignsRes] = await Promise.all([
          api.get('/api/sources?active=1'),
          api.get('/api/campaigns')
        ]);
        
        setSourcesList(Array.isArray(sourcesRes.data) ? sourcesRes.data : (sourcesRes.data?.data || []));
        setCampaignsList(Array.isArray(campaignsRes.data) ? campaignsRes.data : (campaignsRes.data?.data || []));
      } catch (e) {
        console.error('Failed to fetch data', e);
      }
    };
    fetchData();
  }, []);

  // Fetch items or projects based on company type
  useEffect(() => {
    const type = String(tenantCompany?.company_type || '').toLowerCase();
    
    if (type === 'general') {
      const fetchItems = async () => {
        try {
          const res = await api.get('/api/items?all=1');
          const data = res.data?.data || res.data || [];
          setItemsList(data);
        } catch (e) {
          console.error('Failed to fetch items', e);
        }
      };
      fetchItems();
    } else {
      const fetchProjects = async () => {
        try {
          const res = await api.get('/api/projects?all=1');
          const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setProjectsList(data);
        } catch (e) {
          console.error('Failed to fetch projects', e);
        }
      };
      fetchProjects();
    }
  }, [tenantCompany?.company_type]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/api/users');
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setUsersList(data);
      } catch (e) {
        console.error('Failed to fetch users', e);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isSalesPerson && currentUser?.id) {
      setAssignedTo(currentUser.id);
    }
  }, [isSalesPerson, currentUser]);

  const userOptions = useMemo(() => usersList.map(u => ({
    value: u.id,
    label: u.name
  })), [usersList]);

  const handleAssignedToChange = (val) => {
    if (!val) {
        setAssignedTo('');
        return;
    }
    
    const isTeamLeader = currentUser?.role?.toLowerCase().includes('team leader');
    
    if (isTeamLeader) {
        if (Number(val) !== Number(currentUser.id)) {
             const selectedUser = usersList.find(u => u.id === val || u.id === Number(val));
             if (selectedUser && Number(selectedUser.manager_id) !== Number(currentUser.id)) {
                 alert(t('This user is not under your management'));
                 return;
             }
        }
    }
    
    setAssignedTo(val);
  };

  const sourceOptions = useMemo(() => sourcesList.map(s => ({
    value: s.name,
    label: s.name
  })), [sourcesList]);

  const campaignOptions = useMemo(() => campaignsList.map(c => ({
    value: c.name,
    label: c.name
  })), [campaignsList]);

  const projectOptions = useMemo(() => projectsList.map(p => ({
    value: p.name || p.companyName || p,
    label: p.name || p.companyName || p
  })), [projectsList]);

  const itemOptions = useMemo(() => itemsList.map(i => ({
    value: i.id,
    label: i.name
  })), [itemsList]);

  const typeOptions = useMemo(() => [
    { value: 'Company', label: t('Company') },
    { value: 'Individual', label: t('Individual') }
  ], [t]);

  const stageOptions = useMemo(() => stages.map(s => ({
    value: s.name,
    label: i18n.language === 'ar' ? (s.nameAr || s.name) : s.name
  })), [stages, i18n.language]);

  const priorityOptions = useMemo(() => [
    { value: 'low', label: t('Low') },
    { value: 'medium', label: t('Medium') },
    { value: 'high', label: t('High') }
  ], [t]);

  const [extraLeads, setExtraLeads] = useState([]);
  
  // Dynamic fields state
  const [dynamicValues, setDynamicValues] = useState({});

  const handleDynamicChange = (key, value) => {
    setDynamicValues(prev => ({ ...prev, [key]: value }));
  };

  const addExtraLead = () => {
    setExtraLeads((prev) => [
      ...prev,
      {
        name: '',
        source: '',
        project: '',
        company: '',
        type: '',
        tags: '',
        expectedRevenue: '',
        mobileNumbers: [{ code: mobileNumbers[0]?.code || '+20', number: '' }],
        email: '',
        assignedTo: isSalesPerson ? (currentUser?.name || '') : '',
        stage: '',
        status: '',
        priority: 'medium',
        note: '',
        collapsed: false,
      },
    ]);
  };

  const updateExtraLeadField = (idx, field, value) => {
    setExtraLeads((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    );
  };

  // إضافة/تحديث أرقام الموبايل لليدز الإضافية
  const addExtraLeadNumber = (idx) => {
    setExtraLeads((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              mobileNumbers: [
                ...(l.mobileNumbers || [{ code: '+20', number: '' }]),
                { code: l.mobileNumbers?.[0]?.code || '+20', number: '' },
              ],
}
          : l
      )
    );
  };

  const updateExtraLeadNumber = (idx, nIdx, field, value) => {
    setExtraLeads((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const arr = l.mobileNumbers || [{ code: '+20', number: '' }];
        const updated = arr.map((n, j) => (j === nIdx ? { ...n, [field]: value } : n));
        return { ...l, mobileNumbers: updated };
      })
    );
  };

  const toggleExtraLeadCollapse = (idx) => {
    setExtraLeads((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, collapsed: !l.collapsed } : l))
    );
  };

  const deleteExtraLead = (idx) => {
    setExtraLeads((prev) => prev.filter((_, i) => i !== idx));
  };

  const addMobileNumber = () => {
    setMobileNumbers(prev => [...prev, { code: prev[0]?.code || '+20', number: '' }]);
  };

  const removeMobileNumber = (idx) => {
    setMobileNumbers(prev => prev.filter((_, i) => i !== idx));
  };

  const deleteExtraLeadNumber = (idx, nIdx) => {
    setExtraLeads((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const arr = l.mobileNumbers || [{ code: '+20', number: '' }];
        const updated = arr.filter((_, j) => j !== nIdx);
        return { ...l, mobileNumbers: updated };
      })
    );
  };

  const updateMobileNumber = (idx, field, value) => {
    setMobileNumbers(prev => {
      const next = prev.map((n, i) => (i === idx ? { ...n, [field]: value } : n));
      // validate current index
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

  const formTone = isLight ? 'bg-white border-gray-200' : 'bg-blue-900/40 border-blue-800';
  const labelTone = isLight ? 'text-gray-700' : 'text-gray-200';
  const inputTone = isLight
    ? 'bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500'
    : 'bg-gray-900/50 border-gray-700 text-white focus:ring-blue-400 focus:border-blue-400';

  const [phoneErrors, setPhoneErrors] = useState([]); // per index messages

  const isPrimaryValid =
    name.trim().length > 0 &&
    source.trim().length > 0 &&
    (String(tenantCompany?.company_type || '').toLowerCase() === 'general' ? item : project.trim().length > 0) &&
    mobileNumbers.length > 0 &&
    mobileNumbers.some((n) => n.number.trim().length > 0) &&
    mobileNumbers.every((n) => validatePhone(n.code, n.number).isValid);

  const isLeadValid = (l) =>
    (l.name || '').trim().length > 0 &&
    (l.source || '').trim().length > 0 &&
    (String(tenantCompany?.company_type || '').toLowerCase() === 'general' ? l.item : (l.project || '').trim().length > 0) &&
    Array.isArray(l.mobileNumbers) &&
    l.mobileNumbers.length > 0 &&
    l.mobileNumbers.some((n) => (n.number || '').trim().length > 0);

  const isFormValid = isPrimaryValid && extraLeads.every(isLeadValid);



  const handleSave = async () => {
    if (!canAddLead) {
      alert(t('You do not have permission to add leads'));
      return;
    }
    const nameTrimmed = name.trim();
    const missing = [];

    if (!nameTrimmed) missing.push(t('Name'));
    if (!source.trim()) missing.push(t('Source'));
    
    const compType = String(tenantCompany?.company_type || '').toLowerCase();

    if (compType === 'general') {
       if (!item) missing.push(t('Item'));
    } else {
       if (!project.trim()) missing.push(t('Project'));
    }
    
    if (!mobileNumbers.length || !mobileNumbers.some((n) => n.number.trim())) missing.push(t('Mobile'));

    if (missing.length > 0) {
      alert(`${t('Please fill all fields (except notes)')}:\n- ${missing.join('\n- ')}`);
      return;
    }

    // Check extra leads
    const invalidExtrasIndices = extraLeads
      .map((l, i) => (!isLeadValid(l) ? i + 1 : null))
      .filter(Boolean);
    if (invalidExtrasIndices.length) {
      alert(`${t('Some additional leads are incomplete')}: ${invalidExtrasIndices.join(', ')}\n${t('Please fill all fields (except notes)')}.`);
      return;
    }

    try {
      // Primary Lead
      const formData = new FormData();
      formData.append('name', nameTrimmed);
      formData.append('email', email.trim());
      formData.append('phone', mobileNumbers.filter((m) => m.number.trim()).map((m) => `${m.code} ${m.number}`).join(' / '));
      formData.append('company', company.trim() || project.trim() || '');
      formData.append('type', type || ((company.trim() || project.trim()) ? 'Company' : 'Individual'));
      formData.append('stage', stage || 'New');
      formData.append('status', status || '');
      formData.append('priority', priority);
      formData.append('source', source);
      if (campaign) formData.append('campaign', campaign);
      if (assignedTo) formData.append('assigned_to', String(assignedTo).trim());
      formData.append('notes', (note || '').trim());
      if (expectedRevenue) formData.append('estimated_value', expectedRevenue);
      
      if (compType === 'general') {
          if (item) formData.append('item_id', item);
      } else {
          if (project.trim()) {
            formData.append('project', project.trim());
            // Optionally try to find project ID if project is selected from list
            const projObj = projectsList.find(p => (p.name || p.companyName || p) === project);
            if (projObj && projObj.id) formData.append('project_id', projObj.id);
          }
      }

      // Dynamic Fields
      Object.entries(dynamicValues).forEach(([key, value]) => {
          formData.append(`custom_fields[${key}]`, value);
      });

      // Attachments
      attachments.forEach((file) => {
          formData.append('attachments[]', file);
      });

      await api.post('/api/leads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Extra Leads
      for (const l of extraLeads) {
          const extraFormData = new FormData();
          extraFormData.append('name', l.name.trim());
          extraFormData.append('email', l.email?.trim() || '');
          extraFormData.append('phone', (l.mobileNumbers || []).filter((m) => m.number.trim()).map((m) => `${m.code} ${m.number}`).join(' / '));
          extraFormData.append('company', l.company?.trim() || l.project?.trim() || '');
          extraFormData.append('type', l.type || ((l.company || l.project) ? 'Company' : 'Individual'));
          extraFormData.append('stage', l.stage || 'New');
          extraFormData.append('status', l.status || '');
          extraFormData.append('priority', l.priority || 'medium');
          extraFormData.append('source', l.source || '');
          extraFormData.append('assigned_to', l.assignedTo?.trim() || '');
          extraFormData.append('notes', l.note?.trim() || '');
          extraFormData.append('estimated_value', l.expectedRevenue || '');
          
          if (compType === 'general') {
              if (l.item) extraFormData.append('item_id', l.item);
          } else {
              if (l.project?.trim()) {
                extraFormData.append('project', l.project.trim());
                const projObj = projectsList.find(p => (p.name || p.companyName || p) === l.project);
                if (projObj && projObj.id) extraFormData.append('project_id', projObj.id);
              }
          }

          await api.post('/api/leads', extraFormData);
      }

      // Invalidate leads list and stats to force refresh on navigation
      try {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['leads-stats'] });
      } catch {}
      alert(t('Lead saved successfully'));
      navigate('/leads');
      
    } catch (error) {
      console.error('Failed to save lead:', error);
      alert(t('Failed to save lead'));
    }
  };

  return (
    <div className={`p-3 sm:p-6 pb-24 bg-[var(--content-bg)] text-[var(--content-text)]`}>
      <div className={`relative flex items-center justify-between mb-2`}>
        <h1 className={`page-title text-2xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>{t('Add New Lead')}</h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md border ${isLight ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-gray-800 border-gray-700 text-red-300 hover:bg-gray-700'}`}
          aria-label={t('Close')}
          title={t('Close')}
        >
          <FaTimes className="w-4 h-4" />
        </button>
        <span
          aria-hidden
          className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent"
          style={{
            width: 'calc(100% + 8px)',
            left: isRTL ? 'auto' : '-4px',
            right: isRTL ? '-4px' : 'auto',
            bottom: '-4px'
          }}
        ></span>
      </div>

      <div className={`p-4 md:p-6 rounded-lg border ${formTone}`}>
              {/* Two-column layout */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">{t('Primary Lead')}</h2>
                <button
                  type="button"
                  onClick={() => setPrimaryCollapsed(!primaryCollapsed)}
                  className={`p-2 rounded-md ${isLight ? 'bg-gray-100 text-gray-700' : 'bg-gray-800 text-gray-200'} hover:opacity-90`}
                  aria-label={i18n.language === 'ar' ? (primaryCollapsed ? 'فتح' : 'طي') : (primaryCollapsed ? t('Expand') : t('Collapse'))}
                >
                  {primaryCollapsed ? <FaChevronDown className="w-4 h-4" /> : <FaChevronUp className="w-4 h-4" />}
                </button>
              </div>
              {!primaryCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Name')} <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                      placeholder={t('Enter name')}
                      required
                    />
                  </div>

                  {/* Source (select) */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Source')} <span className="text-red-500">*</span></label>
                    <SearchableSelect
                      options={sourceOptions}
                      value={source}
                      onChange={setSource}
                      placeholder={t('Select')}
                      isRTL={isRTL}
                      required
                      showAllOption={false}
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
                    />
                  </div>

                  {/* Project or Item */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${labelTone}`}>
                       {String(tenantCompany?.company_type || '').toLowerCase() === 'general' ? t('Item') : t('Project')} <span className="text-red-500">*</span>
                    </label>
                    {String(tenantCompany?.company_type || '').toLowerCase() === 'general' ? (
                        <SearchableSelect
                          options={itemOptions}
                          value={item}
                          onChange={setItem}
                          placeholder={t('Select item')}
                          isRTL={isRTL}
                          required
                          showAllOption={false}
                        />
                    ) : (
                        <SearchableSelect
                          options={projectOptions}
                          value={project}
                          onChange={setProject}
                          placeholder={t('Select')}
                          isRTL={isRTL}
                          required
                          showAllOption={false}
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
                      placeholder={t('Company')}
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
                      placeholder={t('0.00')}
                      min="0"
                      step="0.01"
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

                {/* Right column */}
                <div className="space-y-4">
                  {/* Mobile: country code select + main input + plus button */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Mobile')} <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <CountryCodeSelect
                        value={mobileNumbers[0]?.code}
                        onChange={(val) => updateMobileNumber(0, 'code', val)}
                        isLight={isLight} inputTone={inputTone} isRTL={isRTL}
                      />
                      <input
                        type="tel"
                        value={mobileNumbers[0]?.number}
                        onChange={(e) => updateMobileNumber(0, 'number', e.target.value)}
                        className={`flex-1 min-w-0 rounded-md border px-3 py-2 ${inputTone}`}
                        placeholder={t('Mobile number')}
                      />
                      {phoneErrors[0] ? (
                        <span className="text-xs text-red-600">{phoneErrors[0]}</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={addMobileNumber}
                        className={`inline-flex items-center justify-center px-3 py-2 rounded-md border ${isLight ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100' : 'bg-gray-800 border-gray-700 text-blue-300 hover:bg-gray-700'}`}
                        aria-label={t('Add another number')}
                        title={t('Add another number')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                    {/* Extra mobile numbers */}
                    {mobileNumbers.slice(1).map((m, idx) => (
                      <div key={idx} className="mt-2 flex items-center gap-2 sm:gap-3">
                        <CountryCodeSelect
                          value={m.code}
                          onChange={(val) => updateMobileNumber(idx + 1, 'code', val)}
                          isLight={isLight} inputTone={inputTone} isRTL={isRTL}
                        />
                        <input
                          type="tel"
                          value={m.number}
                          onChange={(e) => updateMobileNumber(idx + 1, 'number', e.target.value)}
                          className={`flex-1 min-w-0 rounded-md border px-3 py-2 ${inputTone}`}
                          placeholder={t('Another mobile number')}
                        />
                        {phoneErrors[idx + 1] ? (
                          <span className="text-xs text-red-600">{phoneErrors[idx + 1]}</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeMobileNumber(idx + 1)}
                          className={`inline-flex items-center justify-center px-3 py-2 rounded-md border ${isLight ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100' : 'bg-gray-800 border-gray-700 text-red-300 hover:bg-gray-700'}`}
                          aria-label={t('Remove number')}
                          title={t('Remove number')}
                        >
                          <FaTimes className="w-4 h-4" />
                        </button>
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
                      placeholder={t('Enter email address')}
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
                      placeholder={t('Comma-separated tags')}
                    />
                  </div>

                  {/* Sales (Assigned To) */}
                  {!isSalesPerson && (
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Sales (Assigned To)')}</label>
                    <SearchableSelect
                      options={userOptions}
                      value={assignedTo}
                      onChange={handleAssignedToChange}
                      placeholder={t('Select sales Person ')}
                      className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                      isRTL={isRTL}
                      showAllOption={false}
                    />
                  </div>
                  )}

                  {/* Attachments */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${labelTone}`}>
                        {t('Attachments')}
                    </label>
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
                    {attachments.length > 0 && (
                        <div className="mt-2 text-xs space-y-1">
                            {attachments.map((file, index) => (
                                <div key={index} className={`flex items-center justify-between px-2 py-1 rounded ${isLight ? 'bg-gray-100' : 'bg-gray-800'}`}>
                                    <span className="truncate max-w-[200px]">{file.name}</span>
                                    <button 
                                        type="button"
                                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Note')}</label>
                    <textarea
                      rows={4}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className={`w-full rounded-md border px-3 py-2 ${inputTone}`}
                      placeholder={t('Write notes here')}
                    />
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
              )}

              <div className="mt-6">
                {extraLeads.map((l, i) => (
                  <div key={i} className={`mt-3 rounded-lg border p-4 ${formTone}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {l.name?.trim() ? l.name : `${t('Lead #')}${i + 1}`}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => toggleExtraLeadCollapse(i)}
                          className={`p-2 rounded-md ${isLight ? 'bg-gray-100 text-gray-700' : 'bg-gray-800 text-gray-200'} hover:opacity-90`}
                          aria-label={l.collapsed ? t('Expand') : t('Collapse')}
                          title={l.collapsed ? t('Expand') : t('Collapse')}
                        >
                          {l.collapsed ? <FaChevronDown className="w-4 h-4" /> : <FaChevronUp className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteExtraLead(i)}
                          className={`px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700`}
                        >
                          {t('Delete')}
                        </button>
                      </div>
                    </div>
                    {!l.collapsed && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Name')}</label>
                          <input type="text" value={l.name} onChange={(e) => updateExtraLeadField(i, 'name', e.target.value)} className={`w-full rounded-md border px-3 py-2 ${inputTone}`} />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Source')}</label>
                          <SearchableSelect
                            options={sourceOptions}
                            value={l.source}
                            onChange={(val) => updateExtraLeadField(i, 'source', val)}
                            placeholder={t('Select')}
                            isRTL={isRTL}
                            showAllOption={false}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${labelTone}`}>
                             {String(tenantCompany?.company_type || '').toLowerCase() === 'general' ? t('Item') : t('Project')}
                          </label>
                          {String(tenantCompany?.company_type || '').toLowerCase() === 'general' ? (
                            <SearchableSelect
                              options={itemOptions}
                              value={l.item}
                              onChange={(val) => updateExtraLeadField(i, 'item', val)}
                              placeholder={t('Select item')}
                              isRTL={isRTL}
                              showAllOption={false}
                            />
                          ) : (
                            <SearchableSelect
                              options={projectOptions}
                              value={l.project}
                              onChange={(val) => updateExtraLeadField(i, 'project', val)}
                              placeholder={t('Select')}
                              isRTL={isRTL}
                              showAllOption={false}
                            />
                          )}
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Type')}</label>
                          <SearchableSelect
                            options={typeOptions}
                            value={l.type || ''}
                            onChange={(val) => updateExtraLeadField(i, 'type', val)}
                            placeholder={t('Select')}
                            isRTL={isRTL}
                            showAllOption={false}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Company')}</label>
                          <input type="text" value={l.company || ''} onChange={(e) => updateExtraLeadField(i, 'company', e.target.value)} className={`w-full rounded-md border px-3 py-2 ${inputTone}`} />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Expected Revenue')}</label>
                          <input type="number" value={l.expectedRevenue} onChange={(e) => updateExtraLeadField(i, 'expectedRevenue', e.target.value)} className={`w-full rounded-md border px-3 py-2 ${inputTone}`} />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Mobile')} <span className="text-red-500">*</span></label>
                          <div className="flex items-center gap-3">
                            <CountryCodeSelect value={l.mobileNumbers?.[0]?.code || '+20'} onChange={(val) => updateExtraLeadNumber(i, 0, 'code', val)} isLight={isLight} inputTone={inputTone} isRTL={isRTL} />
                            <input type="tel" value={l.mobileNumbers?.[0]?.number || ''} onChange={(e) => updateExtraLeadNumber(i, 0, 'number', e.target.value)} className={`flex-1 rounded-md border px-3 py-2 ${inputTone}`} />
                            <button type="button" onClick={() => addExtraLeadNumber(i)} className={`inline-flex items-center justify-center px-3 py-2 rounded-md border ${isLight ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100' : 'bg-gray-800 border-gray-700 text-blue-300 hover:bg-gray-700'}`} aria-label={t('Add another number')} title={t('Add another number')}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                          {(l.mobileNumbers || []).slice(1).map((m, idx) => (
                            <div key={idx} className="mt-2 flex items-center gap-3">
                              <CountryCodeSelect value={m.code} onChange={(val) => updateExtraLeadNumber(i, idx + 1, 'code', val)} isLight={isLight} inputTone={inputTone} isRTL={isRTL} />
                              <input type="tel" value={m.number} onChange={(e) => updateExtraLeadNumber(i, idx + 1, 'number', e.target.value)} className={`flex-1 rounded-md border px-3 py-2 ${inputTone}`} />
                              <button type="button" onClick={() => deleteExtraLeadNumber(i, idx + 1)} className={`inline-flex items-center justify-center px-3 py-2 rounded-md border ${isLight ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100' : 'bg-gray-800 border-gray-700 text-red-300 hover:bg-gray-700'}`} aria-label={t('Remove number')} title={t('Remove number')}>
                                <FaTimes className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Email')}</label>
                          <input type="email" value={l.email} onChange={(e) => updateExtraLeadField(i, 'email', e.target.value)} className={`w-full rounded-md border px-3 py-2 ${inputTone}`} />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Tags')}</label>
                          <input type="text" value={l.tags || ''} onChange={(e) => updateExtraLeadField(i, 'tags', e.target.value)} className={`w-full rounded-md border px-3 py-2 ${inputTone}`} />
                        </div>
                        {!isSalesPerson && (
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Sales')}</label>
                          <input type="text" value={l.assignedTo} onChange={(e) => updateExtraLeadField(i, 'assignedTo', e.target.value)} className={`w-full rounded-md border px-3 py-2 ${inputTone}`} />
                        </div>
                        )}
                        <div>
                           <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Stage')}</label>
                           <SearchableSelect
                             options={stageOptions}
                             value={l.stage}
                             onChange={(val) => updateExtraLeadField(i, 'stage', val)}
                             placeholder={t('Select')}
                             isRTL={isRTL}
                             showAllOption={false}
                           />
                         </div>
                         <div>
                           <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Priority')}</label>
                           <SearchableSelect
                             options={priorityOptions}
                             value={l.priority}
                             onChange={(val) => updateExtraLeadField(i, 'priority', val)}
                             placeholder={t('Select')}
                             isRTL={isRTL}
                             showAllOption={false}
                           />
                         </div>
                        <div className="md:col-span-2">
                          <label className={`block text-sm font-medium mb-1 ${labelTone}`}>{t('Note')}</label>
                          <textarea rows={3} value={l.note} onChange={(e) => updateExtraLeadField(i, 'note', e.target.value)} className={`w-full rounded-md border px-3 py-2 ${inputTone}`} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              </div>



      </div>

      <div className={`sticky bottom-0 left-0 right-0 z-50 border-t-2 ${isLight ? 'bg-white border-gray-300 shadow-2xl' : 'bg-gray-900 border-gray-600 shadow-2xl'} backdrop-blur-md mt-6`}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className={`text-lg font-bold ${isLight ? 'text-purple-700' : 'text-cyan-300'}`}>
              {t('Additional Leads')}
            </h2>
            <button
              type="button"
              onClick={addExtraLead}
              className={`inline-flex items-center justify-center p-2 rounded-md border-2 transition-all duration-200 ${isLight ? 'bg-blue-50 border-blue-400 text-blue-700 hover:bg-blue-100 hover:border-blue-500' : 'bg-gray-800 border-gray-600 text-blue-300 hover:bg-gray-700 hover:border-gray-500'} hover:opacity-95 hover:shadow-lg active:scale-95`}
              aria-label={t('Add Lead')}
              title={t('Add Lead')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          <div className="inline-flex w-fit">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isFormValid}
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-md font-bold transition-all duration-150 ease-out transform disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none hover:opacity-95 hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 shadow-lg hover:shadow-xl ${isLight ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border-2 border-green-500' : 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white border-2 border-emerald-600'}`}
            >
              {t('Confirm Add')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddNewLead;
