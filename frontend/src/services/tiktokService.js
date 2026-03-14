
export const tiktokService = {
  loadSettings: () => {
    try {
      return JSON.parse(localStorage.getItem('tiktok.integration') || '{}')
    } catch (_) {
      return {}
    }
  },

  saveSettings: (settings) => {
    localStorage.setItem('tiktok.integration', JSON.stringify(settings))
  },

  resetSettings: () => {
    localStorage.removeItem('tiktok.integration')
  },

  simulateEvent: (settings) => {
    return {
      pixel_code: settings.pixelCode || 'TIKTOK_PIXEL_ID',
      event: 'SubmitForm',
      event_id: 'TEST_EVENT_' + Date.now(),
      timestamp: new Date().toISOString(),
      context: {
        page: { url: window.location.href },
        user: { email: 'test@example.com', phone: '+201000000000' }
      }
    }
  },

  sendTestEvent: async (payload) => {
    await new Promise(r => setTimeout(r, 800))
    return { ok: true, message: 'Event received by TikTok Events API (Simulated)' }
  }
}
