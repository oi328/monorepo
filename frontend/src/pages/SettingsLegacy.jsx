import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [stages, setStages] = useState([]);
  const [newStage, setNewStage] = useState('');
  const [newStageAr, setNewStageAr] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3b82f6');
  const [newStageIcon, setNewStageIcon] = useState('🆕');
  const [iconSuggestions, setIconSuggestions] = useState([]);
  const [showIconDropdown, setShowIconDropdown] = useState(false);
  const [iconWasManuallyPicked, setIconWasManuallyPicked] = useState(false);
  const [aiIconSuggestions, setAiIconSuggestions] = useState([]);
  const [aiHint, setAiHint] = useState(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Statuses state
  const [statuses, setStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState('');
  const [newStatusAr, setNewStatusAr] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#3b82f6');
  const [newStatusIcon, setNewStatusIcon] = useState('🆕');
  const [statusIconSuggestions, setStatusIconSuggestions] = useState([]);
  const [showStatusIconDropdown, setShowStatusIconDropdown] = useState(false);
  const [statusIconWasManuallyPicked, setStatusIconWasManuallyPicked] = useState(false);
  const [statusAiIconSuggestions, setStatusAiIconSuggestions] = useState([]);
  const [statusAiHint, setStatusAiHint] = useState(null);
  const [statusAiGenerating, setStatusAiGenerating] = useState(false);
  
  // Custom icons upload state
  const [uploadedIcons, setUploadedIcons] = useState([]);

  // Preset palette keys we support in UI
  const COLOR_OPTIONS = ['blue', 'green', 'yellow', 'red', 'purple'];
  const ICON_OPTIONS = ['🆕','🎯','⏳','✅','❌','📊','⭐','💼','📞','💬','🤝','🔁','🗓️','💰','📥','📤','🏆','🗂️','🔥','🧊'];

  const defaultColorForName = (name) => {
    const key = (name || '').toLowerCase();
    if (key.includes('convert')) return '#10b981'; // green-500
    if (key.includes('progress')) return '#f59e0b'; // amber-500
    if (key.includes('lost')) return '#ef4444'; // red-500
    if (key.includes('new')) return '#3b82f6'; // blue-500
    if (key.includes('qual')) return '#8b5cf6'; // violet-500
    return '#3b82f6';
  };

  const defaultIconForName = (name) => {
    const key = (name || '').toLowerCase();
    if (key.includes('convert')) return '✅';
    if (key.includes('progress')) return '⏳';
    if (key.includes('lost')) return '❌';
    if (key.includes('new')) return '🆕';
    if (key.includes('qual')) return '🎯';
    return '📊';
  };

  // Smart icon suggestions based on EN/AR keywords
  const SUGGEST_ICON_PAIRS = [
    { icon: '🆕', keywords: ['new','جديد'] },
    { icon: '🎯', keywords: ['qual','qualified','تأهيل','مؤهل'] },
    { icon: '⏳', keywords: ['progress','in progress','قيد','انتظار'] },
    { icon: '✅', keywords: ['convert','converted','success','تحويل','نجاح'] },
    { icon: '❌', keywords: ['lost','fail','خاسر','فشل'] },
    { icon: '📊', keywords: ['analysis','stat','تحليل','إحصاء'] },
    { icon: '💼', keywords: ['deal','صفقة'] },
    { icon: '🤝', keywords: ['negotiation','تفاوض'] },
    { icon: '🔁', keywords: ['follow','follow up','متابعة'] },
    { icon: '📞', keywords: ['call','اتصال','هاتف'] },
    { icon: '💬', keywords: ['message','chat','رسالة','دردشة'] },
    { icon: '🏆', keywords: ['won','رابح','ربح'] },
    { icon: '🗂️', keywords: ['archive','أرشيف'] },
    { icon: '🗓️', keywords: ['meeting','اجتماع'] },
    { icon: '💰', keywords: ['payment','budget','قيمة','تمويل'] },
    { icon: '🔥', keywords: ['hot','ساخن'] },
    { icon: '🧊', keywords: ['cold','بارد'] },
  ];

  const computeIconSuggestions = (nameEn, nameAr) => {
    const text = `${nameEn || ''} ${nameAr || ''}`.toLowerCase();
    const picks = [];
    for (const { icon, keywords } of SUGGEST_ICON_PAIRS) {
      if (keywords.some((k) => text.includes(k))) picks.push(icon);
    }
    const uniq = Array.from(new Set(picks));
    const fallback = ICON_OPTIONS.filter((ic) => !uniq.includes(ic));
    return [...uniq, ...fallback].slice(0, 10);
  };

  const mergeUnique = (a = [], b = []) => {
    const set = new Set([...(a || []), ...(b || [])]);
    return Array.from(set);
  };

  const escapeRegExp = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isAsciiWord = (s = '') => /^[\p{Letter}]+$/u.test(s) && /^[A-Za-z]+$/.test(s);
  const keywordMatch = (text, kw) => {
    if (!kw) return false;
    const lower = (text || '').toLowerCase();
    const k = (kw || '').toLowerCase();
    // For English words, prefer word-boundary match; for Arabic/others, substring
    if (isAsciiWord(k)) {
      try {
        const re = new RegExp(`\\b${escapeRegExp(k)}\\b`, 'i');
        return re.test(text);
      } catch (_) { /* fall through */ }
    }
    return lower.includes(k);
  };

  const pickBestIcon = (nameEn, nameAr, candidateIcons = []) => {
    const text = `${nameEn || ''} ${nameAr || ''}`.toLowerCase();
    let best = null;
    let bestScore = -1;
    for (const { icon, keywords } of SUGGEST_ICON_PAIRS) {
      if (candidateIcons.length && !candidateIcons.includes(icon)) continue;
      let score = 0;
      for (const kw of keywords) {
        if (keywordMatch(text, kw)) score += 1;
      }
      if (score > bestScore) { bestScore = score; best = icon; }
    }
    // If no keyword match within candidates, fallback to local suggestions first element
    if (!best) {
      const local = computeIconSuggestions(nameEn, nameAr);
      best = local[0] || '📊';
    }
    return best;
  };

  const normalizeStages = (raw) => {
    if (!Array.isArray(raw)) return [];
    if (raw.length === 0) return [];
    const first = raw[0];
    if (typeof first === 'string') {
      return raw.map((name) => ({ name, nameAr: '', color: defaultColorForName(name), icon: defaultIconForName(name) }));
    }
    // objects
    return raw.map((s) => ({
      name: s.name || String(s),
      nameAr: s.nameAr || '',
      color: s.color || defaultColorForName(s.name || String(s)),
      icon: s.icon || defaultIconForName(s.name || String(s))
    }));
  };

  const loadStages = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('crmStages') || '[]');
      setStages(normalizeStages(saved));
    } catch (e) {
      setStages([]);
    }
  };

  const loadStatuses = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('crmStatuses') || '[]');
      setStatuses(normalizeStages(saved));
    } catch (e) {
      setStatuses([]);
    }
  };

  const saveStages = (stagesArray) => {
    try {
      localStorage.setItem('crmStages', JSON.stringify(stagesArray));
      setStages(stagesArray);
    } catch (e) {
      console.error('Failed to save stages:', e);
    }
  };

  const saveStatuses = (statusesArray) => {
    try {
      localStorage.setItem('crmStatuses', JSON.stringify(statusesArray));
      setStatuses(statusesArray);
    } catch (e) {
      console.error('Failed to save statuses:', e);
    }
  };

  // Custom icons upload functions
  const handleIconUpload = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newIcons = [];
    
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(`File ${file.name} is too large. Maximum size is 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newId = `uploaded-${Date.now()}`;
        const newIcons = [...uploadedIcons, { id: newId, src: reader.result }];
        setUploadedIcons(newIcons);
        localStorage.setItem('uploadedIcons', JSON.stringify(newIcons));

        // Automatically select the newly uploaded icon
        if (event.target.id === 'stage-icon-upload') {
          setNewStageIcon(reader.result);
          setIconWasManuallyPicked(true);
        } else if (event.target.id === 'status-icon-upload') {
          setNewStatusIcon(reader.result);
          setStatusIconWasManuallyPicked(true);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    event.target.value = '';
  };

  const handleDeleteIcon = (index) => {
    setUploadedIcons(prev => {
      const newIcons = prev.filter((_, i) => i !== index);
      // Save to localStorage
      try {
        localStorage.setItem('crmCustomIcons', JSON.stringify(newIcons));
      } catch (error) {
        console.error('Failed to save custom icons:', error);
      }
      return newIcons;
    });
  };

  useEffect(() => {
    loadStages();
    loadStatuses();
    
    // Load custom icons from localStorage
    try {
      const savedIcons = JSON.parse(localStorage.getItem('crmCustomIcons') || '[]');
      setUploadedIcons(savedIcons);
    } catch (error) {
      console.error('Failed to load custom icons:', error);
    }
  }, []);

  // Auto-suggest color and merge local+AI icon suggestions while typing
  useEffect(() => {
    const suggestedColor = defaultColorForName(newStage);
    setNewStageColor(suggestedColor);
    const local = computeIconSuggestions(newStage, newStageAr);
    const combined = mergeUnique(aiIconSuggestions, local).slice(0, 10);
    setIconSuggestions(combined);
    if (!iconWasManuallyPicked) {
      const suggestedIcon = defaultIconForName(newStage);
      setNewStageIcon(suggestedIcon);
    }
  }, [newStage, newStageAr, aiIconSuggestions]);

  // Auto-suggest color and merge local+AI icon suggestions for statuses while typing
  useEffect(() => {
    const suggestedColor = defaultColorForName(newStatus);
    setNewStatusColor(suggestedColor);
    const local = computeIconSuggestions(newStatus, newStatusAr);
    const combined = mergeUnique(statusAiIconSuggestions, local).slice(0, 10);
    setStatusIconSuggestions(combined);
    if (!statusIconWasManuallyPicked) {
      const suggestedIcon = defaultIconForName(newStatus);
      setNewStatusIcon(suggestedIcon);
    }
  }, [newStatus, newStatusAr, statusAiIconSuggestions]);

  // Fetch AI suggestions from backend (Gemini) with debounce
  useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      const text = `${newStage || ''} ${newStageAr || ''}`.trim();
      if (!text) { setAiIconSuggestions([]); return; }
      try {
        const resp = await fetch('http://localhost:8787/api/gemini/icon-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newStage, nameAr: newStageAr }),
          signal: controller.signal
        });
        const j = await resp.json();
        if (resp.ok && Array.isArray(j.icons)) {
          setAiIconSuggestions(j.icons);
          setAiHint(j.hint ? j.hint : 'online');
        } else {
          setAiIconSuggestions([]);
          setAiHint(j?.hint || 'error');
        }
      } catch (_) {
        setAiIconSuggestions([]);
        setAiHint('error');
      }
    }, 300);
    return () => { clearTimeout(handle); controller.abort(); };
  }, [newStage, newStageAr]);

  const handleGenerateIcon = async () => {
    const name = (newStage || '').trim();
    const nameAr = (newStageAr || '').trim();
    if (!name && !nameAr) return;
    
    try {
      setAiGenerating(true);
      const response = await fetch('http://localhost:8787/api/gemini/generate-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nameAr })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.icon) {
          setNewStageIcon(data.icon);
          setAiHint('online');
        } else {
          setAiHint('error');
        }
      } else {
        setAiHint('error');
      }
    } catch (error) {
      setAiHint('error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAddStage = (e) => {
    e?.preventDefault?.();
    const name = (newStage || '').trim();
    if (!name) return;
    // Prevent duplicates (case-insensitive)
    const exists = stages.some(s => (s.name || s).toLowerCase() === name.toLowerCase());
    if (exists) {
      setNewStage('');
      return;
    }
    const next = [{ name, nameAr: (newStageAr || '').trim(), color: newStageColor || defaultColorForName(name), icon: newStageIcon || defaultIconForName(name) }, ...stages];
    saveStages(next);
    setNewStage('');
    setNewStageAr('');
    setNewStageColor('#3b82f6');
    setNewStageIcon('🆕');
  };

  const handleDeleteStage = (idx) => {
    const next = stages.filter((_, i) => i !== idx);
    saveStages(next);
  };

  const handleColorChange = (idx, color) => {
    const next = stages.map((s, i) => (i === idx ? { ...s, color } : s));
    saveStages(next);
  };

  const handleIconChange = (idx, icon) => {
    const next = stages.map((s, i) => (i === idx ? { ...s, icon } : s));
    saveStages(next);
  };

  // Statuses handlers
  const handleAddStatus = (e) => {
    e?.preventDefault?.();
    const name = (newStatus || '').trim();
    if (!name) return;
    // Prevent duplicates (case-insensitive)
    const exists = statuses.some(s => (s.name || s).toLowerCase() === name.toLowerCase());
    if (exists) {
      setNewStatus('');
      return;
    }
    const next = [{ name, nameAr: (newStatusAr || '').trim(), color: newStatusColor || defaultColorForName(name), icon: newStatusIcon || defaultIconForName(name) }, ...statuses];
    saveStatuses(next);
    setNewStatus('');
    setNewStatusAr('');
    setNewStatusColor('#3b82f6');
    setNewStatusIcon('🆕');
  };

  const handleDeleteStatus = (idx) => {
    const next = statuses.filter((_, i) => i !== idx);
    saveStatuses(next);
  };

  const handleStatusColorChange = (idx, color) => {
    const next = statuses.map((s, i) => (i === idx ? { ...s, color } : s));
    saveStatuses(next);
  };

  const handleStatusIconChange = (idx, icon) => {
    const next = statuses.map((s, i) => (i === idx ? { ...s, icon } : s));
    saveStatuses(next);
  };

  const handleGenerateStatusIcon = async () => {
    const name = (newStatus || '').trim();
    const nameAr = (newStatusAr || '').trim();
    if (!name && !nameAr) return;
    
    try {
      setStatusAiGenerating(true);
      const response = await fetch('http://localhost:8787/api/gemini/generate-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nameAr })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.icon) {
          setNewStatusIcon(data.icon);
          setStatusAiHint('online');
        } else {
          setStatusAiHint('error');
        }
      } else {
        setStatusAiHint('error');
      }
    } catch (error) {
      setStatusAiHint('error');
    } finally {
      setStatusAiGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-8">
        {/* Page Title */}
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            {t('Settings')}
          </h1>
        </div>

        {/* Pipeline Stages Section */}
        <section className="dribbble-card dribbble-card--glass p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('Pipeline Stages')}</h2>
          </div>

          {/* Add Stage Form */}
          <form onSubmit={handleAddStage} className="flex flex-col md:flex-row gap-3 mb-6">
            <input
              type="text"
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
              placeholder={t('Stage Name')}
              className="input-soft w-full md:w-1/2 placeholder:text-gray-400"
            />
            <input
              type="text"
              value={newStageAr}
              onChange={(e) => setNewStageAr(e.target.value)}
              placeholder={i18n.language === 'ar' ? 'الاسم بالعربي' : t('Arabic Name')}
              className="input-soft w-full md:w-1/2 placeholder:text-gray-400"
            />
            {/* Color Picker */}
            <div className="w-full md:w-fit">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{t('Color')}</div>
              <input
                type="color"
                value={newStageColor}
                onChange={(e) => setNewStageColor(e.target.value)}
                className="h-10 w-14 p-0 border rounded-lg bg-transparent cursor-pointer"
              />
            </div>
            {/* Smart Icon Combobox */}
            <div className="relative w-full md:w-40">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{t('Icon')}</div>
              <input
                type="text"
                value={newStageIcon}
                onChange={(e) => { setNewStageIcon(e.target.value); setIconWasManuallyPicked(true); }}
                onFocus={() => setShowIconDropdown(true)}
                onBlur={() => setTimeout(() => setShowIconDropdown(false), 120)}
                placeholder={i18n.language === 'ar' ? 'اختيار أيقونة ذكي' : t('Smart Icon Picker')}
                className="input-soft w-full placeholder:text-gray-400"
              />
              {showIconDropdown && (
                <div className="absolute mt-1 w-full max-h-44 overflow-auto rounded-md border bg-[var(--content-bg)] shadow-xl z-20">
                  <div className="px-2 py-1 text-xs text-[var(--muted-text)]">
                    {i18n.language === 'ar'
                      ? `مقترحات مرتبطة بالاسم${aiHint === 'online' ? ' • Gemini' : aiHint ? ' • محلي' : ''}`
                      : `${t('Suggestions by name')}${aiHint === 'online' ? ' • Gemini' : aiHint ? ' • Local' : ''}`}
                  </div>
                  {iconSuggestions.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onMouseDown={() => { setNewStageIcon(ic); setIconWasManuallyPicked(true); setShowIconDropdown(false); }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    >
                      <span className="text-base">{ic}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Custom Icon Upload Button */}
            <div className="self-end">
              <label htmlFor="stage-icon-upload" className="px-3 py-2 border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2 cursor-pointer h-10">
                <span className="text-base">📁</span>
                <span className="text-sm">{t('Upload')}</span>
              </label>
              <input
                type="file"
                id="stage-icon-upload"
                accept="image/svg+xml,image/png,image/jpeg,image/gif"
                onChange={handleIconUpload}
                className="hidden"
                multiple
              />
            </div>
            {/* Generate AI Icon via Gemini */}
            <button
              type="button"
              onClick={handleGenerateIcon}
              disabled={aiGenerating || (!newStage && !newStageAr)}
              className={`px-3 py-2 border rounded-lg ${aiGenerating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'} flex items-center gap-2`}
              title={i18n.language === 'ar' ? 'توليد أيقونة من Gemini' : 'Generate icon via Gemini'}
              aria-label={i18n.language === 'ar' ? 'توليد أيقونة' : 'Generate Icon'}
            >
              <span className="text-base">{aiGenerating ? '⏳' : '✨'}</span>
              <span className="text-sm">{i18n.language === 'ar' ? (aiGenerating ? 'جارِ التوليد' : 'توليد أيقونة') : (aiGenerating ? 'Generating' : 'Generate Icon')}</span>
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('Add Stage')}
            </button>
          </form>

          {/* Stages Table */}
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full table-auto text-sm text-gray-900 dark:text-gray-100">
              <thead className="thead-soft sticky top-0">
                <tr>
                  <th className="px-3 py-2 border-b text-left whitespace-nowrap">{t('Stage')}</th>
                  <th className="px-3 py-2 border-b text-left whitespace-nowrap">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {stages.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-gray-500" colSpan={2}>{t('No stages added yet')}</td>
                  </tr>
                ) : (
                  stages.map((s, idx) => (
                    <tr key={(s.name || s) + idx} className="glass-row">
                      <td className="px-3 py-2 border-t align-top whitespace-nowrap flex items-center gap-2">
                        <span className="inline-block w-4 h-4 rounded" 
                          style={{ background: (typeof s.color === 'string' && s.color.startsWith('#')) ? s.color : `var(--stage-${s.color}-swatch, ${s.color || 'transparent'})` }}
                        ></span>
                        <span className="text-base">{s.icon}</span>
                        <span>{i18n.language === 'ar' ? (s.nameAr || s.name) : s.name}</span>
                      </td>
                      <td className="px-3 py-2 border-t align-top">
                        <div className="flex items-center gap-3">
                          {/* Inline Color Picker for editing */}
                          <input
                            type="color"
                            value={s.color}
                            onChange={(e) => handleColorChange(idx, e.target.value)}
                            className="h-8 w-10 p-0 border rounded-md bg-transparent cursor-pointer"
                          />
                          <select
                            value={s.icon}
                            onChange={(e) => handleIconChange(idx, e.target.value)}
                            className="select-soft"
                          >
                            {ICON_OPTIONS.map((ic) => (
                              <option key={ic} value={ic}>{ic}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteStage(idx)}
                            className="px-3 py-1 border border-red-600 text-red-600 bg-transparent rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            {t('Delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Note */}
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            {t('These stages will appear in the Stage dropdown inside Add Lead form.')}
          </p>
        </section>

        {/* Statuses Section */}
        <section className="dribbble-card dribbble-card--glass p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('Lead Statuses')}</h2>
          </div>

          {/* Add Status Form */}
          <form onSubmit={handleAddStatus} className="flex flex-col md:flex-row gap-3 mb-6">
            <input
              type="text"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              placeholder={t('Status Name')}
              className="input-soft w-full md:w-1/2 placeholder:text-gray-400"
            />
            <input
              type="text"
              value={newStatusAr}
              onChange={(e) => setNewStatusAr(e.target.value)}
              placeholder={i18n.language === 'ar' ? 'الاسم بالعربي' : t('Arabic Name')}
              className="input-soft w-full md:w-1/2 placeholder:text-gray-400"
            />
            {/* Color Picker */}
            <div className="w-full md:w-fit">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{t('Color')}</div>
              <input
                type="color"
                value={newStatusColor}
                onChange={(e) => setNewStatusColor(e.target.value)}
                className="h-10 w-14 p-0 border rounded-lg bg-transparent cursor-pointer"
              />
            </div>
            {/* Smart Icon Combobox */}
            <div className="relative w-full md:w-40">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{t('Icon')}</div>
              <input
                type="text"
                value={newStatusIcon}
                onChange={(e) => { setNewStatusIcon(e.target.value); setStatusIconWasManuallyPicked(true); }}
                onFocus={() => setShowStatusIconDropdown(true)}
                onBlur={() => setTimeout(() => setShowStatusIconDropdown(false), 120)}
                placeholder={i18n.language === 'ar' ? 'اختيار أيقونة ذكي' : t('Smart Icon Picker')}
                className="input-soft w-full placeholder:text-gray-400"
              />
              {showStatusIconDropdown && (
                <div className="absolute mt-1 w-full max-h-44 overflow-auto rounded-md border bg-[var(--content-bg)] shadow-xl z-20">
                  <div className="px-2 py-1 text-xs text-[var(--muted-text)]">
                    {t('Uploaded Icons')}
                  </div>
                  {uploadedIcons.map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      onMouseDown={() => { setNewStageIcon(ic.src); setIconWasManuallyPicked(true); setShowIconDropdown(false); }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    >
                      <img src={ic.src} alt="uploaded icon" className="w-4 h-4" />
                    </button>
                  ))}
                  <div className="px-2 py-1 text-xs text-[var(--muted-text)]">
                    {t('Uploaded Icons')}
                  </div>
                  {uploadedIcons.map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      onMouseDown={() => { setNewStatusIcon(ic.src); setStatusIconWasManuallyPicked(true); setShowStatusIconDropdown(false); }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    >
                      <img src={ic.src} alt="uploaded icon" className="w-4 h-4" />
                    </button>
                  ))}
                  <div className="px-2 py-1 text-xs text-[var(--muted-text)]">
                    {i18n.language === 'ar'
                      ? `مقترحات مرتبطة بالاسم${statusAiHint === 'online' ? ' • Gemini' : statusAiHint ? ' • محلي' : ''}`
                      : `${t('Suggestions by name')}${statusAiHint === 'online' ? ' • Gemini' : statusAiHint ? ' • Local' : ''}`}
                  </div>
                  {statusIconSuggestions.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onMouseDown={() => { setNewStatusIcon(ic); setStatusIconWasManuallyPicked(true); setShowStatusIconDropdown(false); }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    >
                      <span className="text-base">{ic}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label htmlFor="status-icon-upload" className="px-3 py-2 border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2 cursor-pointer">
              <span className="text-base">📁</span>
              <span className="text-sm">{t('Upload')}</span>
            </label>
            <input
              type="file"
              id="status-icon-upload"
              accept="image/svg+xml,image/png,image/jpeg,image/gif"
              onChange={handleIconUpload}
              className="hidden"
            />
            {/* Generate AI Icon via Gemini */}
            <button
              type="button"
              onClick={handleGenerateStatusIcon}
              disabled={statusAiGenerating || (!newStatus && !newStatusAr)}
              className={`px-3 py-2 border rounded-lg ${statusAiGenerating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'} flex items-center gap-2`}
              title={i18n.language === 'ar' ? 'توليد أيقونة من Gemini' : 'Generate icon via Gemini'}
              aria-label={i18n.language === 'ar' ? 'توليد أيقونة' : 'Generate Icon'}
            >
              <span className="text-base">{statusAiGenerating ? '⏳' : '✨'}</span>
              <span className="text-sm">{i18n.language === 'ar' ? (statusAiGenerating ? 'جارِ التوليد' : 'توليد أيقونة') : (statusAiGenerating ? 'Generating' : 'Generate Icon')}</span>
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('Add Status')}
            </button>
          </form>

          {/* Statuses Table */}
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full table-auto text-sm text-gray-900 dark:text-gray-100">
              <thead className="thead-soft sticky top-0">
                <tr>
                  <th className="px-3 py-2 border-b text-left whitespace-nowrap">{t('Status')}</th>
                  <th className="px-3 py-2 border-b text-left whitespace-nowrap">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {statuses.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-gray-500" colSpan={2}>{t('No statuses added yet')}</td>
                  </tr>
                ) : (
                  statuses.map((s, idx) => (
                    <tr key={(s.name || s) + idx} className="glass-row">
                      <td className="px-3 py-2 border-t align-top whitespace-nowrap flex items-center gap-2">
                        <span className="inline-block w-4 h-4 rounded" 
                          style={{ background: (typeof s.color === 'string' && s.color.startsWith('#')) ? s.color : `var(--stage-${s.color}-swatch, ${s.color || 'transparent'})` }}
                        ></span>
                        <span className="text-base">{s.icon}</span>
                        <span>{i18n.language === 'ar' ? (s.nameAr || s.name) : s.name}</span>
                      </td>
                      <td className="px-3 py-2 border-t align-top">
                        <div className="flex items-center gap-3">
                          {/* Inline Color Picker for editing */}
                          <input
                            type="color"
                            value={s.color}
                            onChange={(e) => handleStatusColorChange(idx, e.target.value)}
                            className="h-8 w-10 p-0 border rounded-md bg-transparent cursor-pointer"
                          />
                          <select
                            value={s.icon}
                            onChange={(e) => handleStatusIconChange(idx, e.target.value)}
                            className="select-soft"
                          >
                            {ICON_OPTIONS.map((ic) => (
                              <option key={ic} value={ic}>{ic}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteStatus(idx)}
                            className="px-3 py-1 border border-red-600 text-red-600 bg-transparent rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            {t('Delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Note */}
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            {t('These statuses will appear in the Status dropdown for leads.')}
          </p>
        </section>


      </div>
    </Layout>
  );
}