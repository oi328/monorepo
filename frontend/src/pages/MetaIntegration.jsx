import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useIntegrations } from '../hooks/useIntegrations'
import IntegrationCard from '../components/IntegrationCard'
import MetaSettings from '../components/integrations/MetaSettings'
import GoogleAdsSettings from '../components/integrations/GoogleAdsSettings'
import TikTokSettings from '../components/integrations/TikTokSettings'
import TelegramSettings from '../components/integrations/TelegramSettings'
import WebChatSettings from '../components/integrations/WebChatSettings'

export default function MetaIntegration() {
  const { t } = useTranslation()
  const { 
    integrationsList, 
    activeIntegration, 
    connect, 
    configure, 
    closeSettings 
  } = useIntegrations()

  // Check for callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      const pendingProvider = localStorage.getItem('pending_integration_provider')
      if (pendingProvider === 'google-ads') {
        connect('google-ads')
        localStorage.removeItem('pending_integration_provider')
      } else if (pendingProvider === 'meta') {
        connect('meta')
        localStorage.removeItem('pending_integration_provider')
      } else {
        // Legacy fallback: default to meta if no provider found (or assume user clicked card)
        // Or do nothing to avoid errors
        connect('meta') 
      }
    }
  }, [connect])

  // Routing to specific settings pages
  if (activeIntegration === 'meta') return <MetaSettings onClose={closeSettings} />
  if (activeIntegration === 'google-ads') return <GoogleAdsSettings onClose={closeSettings} />
  if (activeIntegration === 'tiktok') return <TikTokSettings onClose={closeSettings} />
  if (activeIntegration === 'telegram') return <TelegramSettings onClose={closeSettings} />
  if (activeIntegration === 'webchat') return <WebChatSettings onClose={closeSettings} />

  // Otherwise, show the main dashboard (The Manager)
  return (
    <div className="space-y-6 bg-transparent text-[var(--content-text)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('Integrations')}</h1>
          <p className="text-sm text-[var(--muted-text)] mt-1">
            {t('Manage all your external connections in one place.')}
          </p>
        </div>
      </div>

      <div className="py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {integrationsList.map((integration) => (
            <IntegrationCard 
              key={integration.id} 
              integration={integration} 
              onConnect={() => connect(integration.id)} 
              onConfigure={() => configure(integration.id)} 
            />
          ))}
        </div>
      </div>
      
      {/* General Tips Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="card glass-card p-4 md:col-span-3">
            <h3 className="text-base font-semibold mb-2">{t('Integration Tips')}</h3>
            <ul className="text-sm space-y-2 list-disc pl-5">
              <li>{t('Connect Meta to sync Lead Ads directly to your CRM.')}</li>
              <li>{t('Enable CAPI for better ad optimization and tracking accuracy.')}</li>
              <li>{t('Connect Google Ads to view campaign performance alongside sales data.')}</li>
            </ul>
          </div>
      </div>
    </div>
  )
}
