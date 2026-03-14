import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export const useDynamicFields = (entityKey) => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityKey) {
        setFields([]);
        setLoading(false);
        return;
    }

    const fetchFields = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/admin/fields?entity=${entityKey}`);
        const activeFields = response.data
            .filter(f => f.active)
            .sort((a, b) => a.sort_order - b.sort_order);
        setFields(activeFields);
      } catch (err) {
        console.error(`Failed to fetch dynamic fields for ${entityKey}`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, [entityKey]);

  return { fields, loading };
};
