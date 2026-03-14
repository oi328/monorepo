
import { api } from '@utils/api'

const serverURL = import.meta.env.VITE_SERVER_URL || 'http://crm.test:8000'
const defaultCallback = `${serverURL}/api/meta/webhook`

export const metaService = {
  // Local Storage Management (Keep for fallback/cache if needed, but primary is API)
  loadSettings: async () => {
    try {
      const res = await api.get('/api/auth/meta/status')
      return res.data
    } catch (_) {
      return {}
    }
  },

  saveSettings: async (settings) => {
    try {
      // For multi-account, we might not have a single settings endpoint anymore
      // or we use it for global settings like fieldMap/autoSync
      const payload = {
        settings: {
          events: settings.events,
          enableCapi: settings.enableCapi,
          autoSync: settings.autoSync,
          fieldMap: settings.fieldMap
        }
      }
      await api.post('/api/auth/meta/settings', payload)
    } catch (e) {
      console.error("Failed to save meta settings", e)
    }
  },

  disconnectConnection: async (connectionId) => {
    try {
      await api.post('/api/auth/meta/disconnect', { connection_id: connectionId })
    } catch (_) {}
  },

  resetSettings: async () => {
    try {
      await api.post('/api/auth/meta/disconnect')
    } catch (_) {}
  },

  // Auth Helpers
  connectMeta: async () => {
    try {
      localStorage.setItem('pending_integration_provider', 'meta')
      const res = await api.get('/api/auth/meta/redirect')
      if (res.data && res.data.url) {
        window.location.href = res.data.url
      }
    } catch (e) {
      console.error("Failed to get meta redirect url", e)
      localStorage.removeItem('pending_integration_provider')
      throw e
    }
  },

  handleCallback: async (code) => {
    try {
      const res = await api.post('/api/auth/meta/callback', { code })
      return res.data
    } catch (e) {
      console.error("Failed to handle meta callback", e)
      throw e
    }
  },

  toggleAsset: async (type, id, isActive) => {
    try {
      const res = await api.post('/api/auth/meta/asset/toggle', { type, id, is_active: isActive })
      return res.data
    } catch (e) {
      console.error("Failed to toggle asset", e)
      throw e
    }
  },

  linkPage: async (pageId, adAccountId) => {
    try {
      const res = await api.post('/api/auth/meta/page/link', { page_id: pageId, ad_account_id: adAccountId })
      return res.data
    } catch (e) {
      console.error("Failed to link page", e)
      throw e
    }
  },

  deleteAsset: async (type, id) => {
    try {
      const res = await api.post('/api/auth/meta/asset/delete', { type, id })
      return res.data
    } catch (e) {
      console.error("Failed to delete asset", e)
      throw e
    }
  },

  // Simulation & Testing
  simulatePixelEvent: (settings, events, enableCapi) => {
    return {
      pixel_id: settings.pixelId || 'PIXEL_ID',
      event_name: Object.keys(events).find(k => events[k]) || 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: window.location.href,
      action_source: enableCapi ? 'website+capi' : 'website',
      user_data: { email: 'lead@example.com', phone: '+201234567890' },
      custom_data: { value: 0, currency: 'USD' }
    }
  },

  sendCapiTest: async (payload) => {
    const res = await api.post(`/api/meta/capi/test`, payload)
    return res.data
  },

  verifyWebhook: async (token) => {
    const url = `/api/meta/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token || '')}&hub.challenge=TEST`
    const r = await api.get(url)
    // Backend returns challenge string if successful, or error json
    return { ok: r.status === 200, text: r.data }
  },
  
  defaultCallback
}
