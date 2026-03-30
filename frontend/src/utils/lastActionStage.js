const ns = 'crm:lastActionStageId';

const makeKey = ({ userId, tenantId }) => `${ns}:${tenantId ?? 'tenant'}:${userId ?? 'user'}`;

export const getLastActionStageId = ({ userId, tenantId }) => {
  try {
    const key = makeKey({ userId, tenantId });
    const v = window.localStorage.getItem(key);
    const s = String(v || '').trim();
    return s ? s : null;
  } catch {
    return null;
  }
};

export const setLastActionStageId = ({ userId, tenantId, stageId }) => {
  try {
    if (!userId || !stageId) return;
    const key = makeKey({ userId, tenantId });
    window.localStorage.setItem(key, String(stageId));
  } catch {
    return;
  }
};


