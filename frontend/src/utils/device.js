
export const captureDeviceInfo = () => {
  if (typeof window === 'undefined') return {};
  
  return {
    userAgent: window.navigator?.userAgent || '',
    platform: window.navigator?.platform || '',
    language: window.navigator?.language || '',
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
};

export const saveDeviceForUser = async (userId, deviceInfo) => {
  // Placeholder for deleted functionality
  // If backend endpoint exists (e.g. /api/devices), it can be restored here
  // For now, we just resolve to prevent errors
  return Promise.resolve(true);
};
