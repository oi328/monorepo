import { useState, useEffect } from 'react';

export const useStages = () => {
  const [stages, setStages] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const normalizeData = (raw) => {
    if (!Array.isArray(raw)) return [];
    if (raw.length === 0) return [];
    const first = raw[0];
    if (typeof first === 'string') {
      return raw.map((name) => ({ name, nameAr: '', color: '#3b82f6', icon: '📊' }));
    }
    // objects
    return raw.map((s) => ({
      name: s.name || String(s),
      nameAr: s.nameAr || '',
      color: s.color || '#3b82f6',
      icon: s.icon || '📊',
      type: s.type || '',
      order: s.order
    }));
  };

  const loadStages = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('crmStages') || '[]');
      const normalized = normalizeData(saved);
      setStages(normalized);
      return normalized;
    } catch (e) {
      setStages([]);
      return [];
    }
  };

  const loadStatuses = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('crmStatuses') || '[]');
      const normalized = normalizeData(saved);
      setStatuses(normalized);
      return normalized;
    } catch (e) {
      setStatuses([]);
      return [];
    }
  };

  useEffect(() => {
    loadStages();
    loadStatuses();
    
    // Listen for storage changes to update data when they're modified in Settings
    const handleStorageChange = (e) => {
      if (e.key === 'crmStages') {
        loadStages();
      } else if (e.key === 'crmStatuses') {
        loadStatuses();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { stages, statuses, loadStages, loadStatuses };
};