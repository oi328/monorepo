import { useState, useEffect } from 'react'
import { api } from '@utils/api'
import { useTranslation } from 'react-i18next'
import { FaTelegram, FaGlobe, FaGoogle, FaTiktok, FaFacebook } from 'react-icons/fa'
import { metaService } from '../services/metaService'
import { googleAdsService } from '../services/googleAdsService'

export function useIntegrations() {
  const { t } = useTranslation()
  const [activeIntegration, setActiveIntegration] = useState(null)
  
  // Connection States
  const [googleConnected, setGoogleConnected] = useState(false)
  const [metaConnected, setMetaConnected] = useState(false)
  const [tenantConfig, setTenantConfig] = useState(null)

  // Initialize status from local storage or services
  useEffect(() => {
    // Check Meta Status
    metaService.loadSettings().then(metaSettings => {
        const isMetaConnected = !!(metaSettings.businessManagerId || metaSettings.pixelId || metaSettings.pageId)
        setMetaConnected(isMetaConnected)
    })

    // Check Google Status
    googleAdsService.loadSettings().then(googleSettings => {
        const isGoogleConnected = !!(googleSettings.googleId || googleSettings.customerId)
        setGoogleConnected(isGoogleConnected)
    })

    // Load tenant runtime config
    api.get('/api/tenant-config').then(r => {
        setTenantConfig(r.data || null)
    }).catch(() => {
        setTenantConfig(null)
    })
  }, [])

  // Integration List
  const integrationsList = [
    { 
      id: 'meta', 
      name: 'Meta (Facebook & Instagram)', 
      icon: FaFacebook, 
      bg: 'bg-blue-600', 
      description: 'Connect Facebook & Instagram for Lead Ads, Pixel, and Messaging',
      connected: metaConnected,
      status: metaConnected ? t('Connected') : t('Disconnected')
    },
    { 
      id: 'google-ads', 
      name: 'Google Ads', 
      icon: FaGoogle, 
      bg: 'bg-yellow-500', 
      description: 'Connect Google Ads to manage and track campaigns',
      connected: googleConnected,
      status: googleConnected ? t('Connected') : t('Disconnected')
    },
    { 
      id: 'tiktok', 
      name: 'TikTok Ads', 
      icon: FaTiktok, 
      bg: 'bg-gray-900', 
      description: 'Connect TikTok Ads for performance tracking',
      connected: false,
      status: t('Coming Soon')
    },
    { 
      id: 'telegram', 
      name: 'Telegram', 
      icon: FaTelegram, 
      bg: 'bg-blue-400', 
      description: 'Connect via Telegram API for instant messaging',
      connected: false,
      status: t('Coming Soon')
    },
    { 
      id: 'webchat', 
      name: 'WebChat', 
      icon: FaGlobe, 
      bg: 'bg-purple-500', 
      description: 'Connect via WebChat API for website messaging',
      connected: false,
      status: t('Coming Soon')
    },
  ]

  const connect = (integrationId) => {
    const comingSoon = ['tiktok', 'telegram', 'webchat']
    
    if (comingSoon.includes(integrationId)) {
      alert(t('Coming Soon - Under Construction'))
      return
    }

    const supported = ['meta', 'google-ads']
    if (supported.includes(integrationId)) {
      setActiveIntegration(integrationId)
    } else {
      alert(t('Integration logic for this provider is not yet implemented.'))
    }
  }

  const configure = (integrationId) => {
    const comingSoon = ['tiktok', 'telegram', 'webchat']
    
    if (comingSoon.includes(integrationId)) {
      alert(t('Coming Soon - Under Construction'))
      return
    }
    
    setActiveIntegration(integrationId)
  }

  const closeSettings = () => {
    setActiveIntegration(null)
    // Refresh connection status
    const metaSettings = metaService.loadSettings()
    setMetaConnected(!!(metaSettings.businessManagerId || metaSettings.pixelId || metaSettings.pageId))
  }

  // OAuth Logic (Moved from original file)
  const startGoogleOAuth = () => {
    const clientId = (tenantConfig && tenantConfig.googleAdsClientId) || import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID
    const redirectUriEnv = import.meta.env.VITE_GOOGLE_ADS_REDIRECT_URI
    const redirectUri = (tenantConfig && tenantConfig.googleAdsRedirectUri) || redirectUriEnv || `${window.location.origin}/`
    const scope = encodeURIComponent('https://www.googleapis.com/auth/adwords')
    const state = `ads:${Math.random().toString(36).slice(2)}`
    
    if (!clientId) {
      alert('Google Ads Client ID missing in .env')
      return
    }
    
    try { localStorage.setItem('oauth_redirect_uri_ads', redirectUri) } catch (_) {}
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&include_granted_scopes=true&state=${state}`
    window.location.href = oauthUrl
  }

  return {
    integrationsList,
    activeIntegration,
    connect,
    configure,
    closeSettings
  }
}
