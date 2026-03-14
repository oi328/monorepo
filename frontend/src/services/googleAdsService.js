
import { api } from '@utils/api'

export const googleAdsService = {
  // Load settings from backend
  loadSettings: async () => {
    try {
      const res = await api.get('/api/auth/google/status')
      const data = res.data
      
      // Map backend response to frontend state
      return {
        connected: data.connected,
        googleId: data.google_id,
        googleEmail: data.google_email,
        customerId: data.customer_id,
        webhookKey: data.webhook_key,
        status: data.status
      }
    } catch (error) {
      console.error("Failed to load Google settings", error)
      return {}
    }
  },

  // Save settings to backend
  saveSettings: async (settings) => {
    try {
      const payload = {
        customer_id: settings.customerId,
        webhook_key: settings.webhookKey,
        status: settings.status,
        conversion_action_id: settings.conversionActionId,
        conversion_currency_code: settings.conversionCurrencyCode,
        conversion_value: settings.conversionValue
      }
      const res = await api.post('/api/auth/google/settings', payload)
      return res.data
    } catch (error) {
      console.error("Failed to save Google settings", error)
      throw error
    }
  },

  // Disconnect
  resetSettings: async () => {
    try {
      await api.post('/api/auth/google/disconnect')
    } catch (error) {
      console.error("Failed to disconnect Google", error)
      throw error
    }
  },

  // Auth: Initiate connection
  connectGoogle: async () => {
    try {
      localStorage.setItem('pending_integration_provider', 'google-ads')
      const res = await api.get('/api/auth/google/redirect')
      if (res.data && res.data.url) {
        window.location.href = res.data.url
      }
    } catch (error) {
      console.error("Failed to get Google redirect URL", error)
      localStorage.removeItem('pending_integration_provider')
      throw error
    }
  },

  // Auth: Handle callback (usually handled by redirect to specific route, but if manual handling needed)
  handleCallback: async (code) => {
    try {
      const res = await api.post('/api/auth/google/callback', { code })
      return res.data
    } catch (error) {
      console.error("Failed to handle Google callback", error)
      throw error
    }
  },

  // Simulation (Keep for UI testing if needed, otherwise optional)
  simulateConversion: (settings) => {
    return {
      conversionActionId: settings.conversionActionId || 'CONVERSION_ACTION_ID',
      conversionTime: new Date().toISOString(),
      conversionValue: 100,
      currencyCode: 'USD',
      gclid: 'TEST_GCLID_' + Math.floor(Math.random() * 1000000),
      user_data: { email: 'lead@example.com', phone: '+201234567890' }
    }
  },

  sync: async () => {
    try {
      const res = await api.post('/api/auth/google/sync')
      return res.data
    } catch (error) {
      console.error("Failed to sync Google Ads", error)
      throw error
    }
  },

  // --- Multi-Account Methods ---
  
  getAccounts: async (tenantId) => {
    try {
      const res = await api.get(`/api/tenant/${tenantId}/google-ads/accounts`)
      return res.data
    } catch (error) {
      console.error("Failed to get Google Ads accounts", error)
      return []
    }
  },

  connectAccount: async (tenantId, payload) => {
     try {
       const res = await api.post(`/api/tenant/${tenantId}/google-ads/connect`, payload)
       return res.data
     } catch (error) {
       console.error("Failed to connect Google Ads account", error)
       throw error
     }
  },

  disconnectAccount: async (tenantId, accountId) => {
    try {
      const res = await api.delete(`/api/tenant/${tenantId}/google-ads/${accountId}`)
      return res.data
    } catch (error) {
      console.error("Failed to disconnect Google Ads account", error)
      throw error
    }
  },
  
  getCampaigns: async (tenantId, accountId) => {
    try {
      const res = await api.get(`/api/tenant/${tenantId}/google-ads/${accountId}/campaigns`)
      return res.data
    } catch (error) {
      console.error("Failed to get Google Ads campaigns", error)
      throw error
    }
  },

  getLeads: async (tenantId, accountId) => {
     try {
       const res = await api.get(`/api/tenant/${tenantId}/google-ads/${accountId}/leads`)
       return res.data
     } catch (error) {
       console.error("Failed to get Google Ads leads", error)
       throw error
     }
  },

  // Mock Trigger Methods
  triggerMockCampaigns: async (tenantId, accountId, count = 5) => {
     try {
       const res = await api.post(`/api/mock/tenant/${tenantId}/google-ads/${accountId}/campaigns`, { count })
       return res.data
     } catch (error) {
       console.error("Failed to trigger mock campaigns", error)
       throw error
     }
  },

  triggerMockLeads: async (tenantId, accountId, count = 10) => {
      try {
        const res = await api.post(`/api/mock/tenant/${tenantId}/google-ads/${accountId}/leads`, { count })
        return res.data
      } catch (error) {
        console.error("Failed to trigger mock leads", error)
        throw error
      }
  },

  sendConversionTest: async (payload) => {
    try {
      const res = await api.post('/api/auth/google/conversion/test', payload)
      return res.data
    } catch (error) {
      console.error("Failed to send conversion test", error)
      throw error
    }
  },

  uploadConversion: async (payload) => {
    try {
      const res = await api.post('/api/auth/google/conversion/upload', payload)
      return res.data
    } catch (error) {
      console.error("Failed to upload conversion", error)
      throw error
    }
  }
}
