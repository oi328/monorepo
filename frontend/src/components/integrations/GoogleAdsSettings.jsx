import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import {
  CheckCircle,
  Copy,
  ExternalLink,
  KeyRound,
  LinkIcon,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserCircle2,
  XCircle,
  Zap,
} from 'lucide-react'
import { FaGoogle } from 'react-icons/fa'
import { googleAdsService } from '../../services/googleAdsService'
import { useAppState } from '@shared/context/AppStateProvider'

const statusClasses = {
  connected: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  needs_reauth: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  default: 'bg-white text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
}

const Badge = ({ children, tone = 'default' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[tone] || statusClasses.default}`}>
    {children}
  </span>
)

const InputField = ({ label, value, onChange, placeholder, type = 'text', helperText }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-theme">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-theme shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800"
    />
    {helperText ? <p className="text-xs text-theme/70">{helperText}</p> : null}
  </div>
)

export default function GoogleAdsSettings({ onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { company: currentTenant, bootstrapped } = useAppState()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [discoveringId, setDiscoveringId] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [accounts, setAccounts] = useState([])
  const [status, setStatus] = useState(null)
  const [settings, setSettings] = useState({
    conversionActionId: '',
    conversionValue: '1.00',
    conversionCurrencyCode: 'USD',
  })
  const [manualGclid, setManualGclid] = useState('')
  const [accountPreferences, setAccountPreferences] = useState({
    isPrimary: false,
    isDefaultForSync: false,
    isDefaultForConversion: false,
    webhookEnabled: true,
  })
  const autoDiscoverRef = useRef(false)

  const callbackStatus = searchParams.get('status')
  const callbackMessage = searchParams.get('message')

  const currentAccount = useMemo(
    () => accounts.find((account) => String(account.id) === String(selectedAccountId)) || null,
    [accounts, selectedAccountId]
  )

  useEffect(() => {
    if (currentTenant?.id) {
      loadData()
    } else if (bootstrapped) {
      setLoading(false)
    }
  }, [currentTenant?.id, bootstrapped])

  useEffect(() => {
    if (autoDiscoverRef.current) return
    if (connectedAccounts.length > 0 && accounts.length === 0 && !loading) {
      autoDiscoverRef.current = true
      const firstConnected = connectedAccounts[0]
      if (firstConnected?.id) {
        handleDiscover(firstConnected.id)
      }
    }
  }, [connectedAccounts, accounts.length, loading])

  useEffect(() => {
    if (!callbackStatus && !callbackMessage) return

    if (callbackStatus === 'success') {
      toast.success(t('Google account connected successfully'))
    } else if (callbackStatus === 'error' && callbackMessage) {
      toast.error(decodeURIComponent(callbackMessage))
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('status')
    nextParams.delete('message')
    setSearchParams(nextParams, { replace: true })
  }, [callbackMessage, callbackStatus, searchParams, setSearchParams, t])

  useEffect(() => {
    if (!currentAccount) return
    setAccountPreferences({
      isPrimary: !!currentAccount.is_primary,
      isDefaultForSync: !!currentAccount.is_default_for_sync,
      isDefaultForConversion: !!currentAccount.is_default_for_conversion,
      webhookEnabled: currentAccount.webhook_enabled !== false,
    })
  }, [currentAccount])

  const closeModal = () => {
    if (onClose) onClose()
    else navigate('/marketing')
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('Copied to clipboard'))
    } catch {
      toast.error(t('Failed to copy'))
    }
  }

  const loadData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    if (silent) setRefreshing(true)

    try {
      const [statusData, connectedData, accountsData] = await Promise.all([
        googleAdsService.loadSettings(),
        googleAdsService.getConnectedAccounts(),
        googleAdsService.getAccounts(currentTenant.id),
      ])

      setStatus(statusData)
      setConnectedAccounts(connectedData || [])
      setAccounts(accountsData || [])
      setSettings({
        conversionActionId: statusData?.conversionActionId || '',
        conversionValue: String(statusData?.conversionValue || '1.00'),
        conversionCurrencyCode: statusData?.conversionCurrencyCode || 'USD',
      })

      const preferredAccountId =
        selectedAccountId ||
        statusData?.defaultConversionAccountId ||
        statusData?.defaultSyncAccountId ||
        statusData?.primaryAccountId ||
        accountsData?.[0]?.id ||
        null

      setSelectedAccountId(preferredAccountId)
    } catch (error) {
      console.error('Failed to load Google Ads data', error)
      toast.error(t('Failed to load Google Ads settings'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleConnect = async () => {
    if (!currentTenant?.id) {
      toast.error(t('No active tenant found'))
      return
    }

    setConnecting(true)
    try {
      const isMockMode = import.meta.env.VITE_GOOGLE_ADS_MOCK_MODE === 'true'
      if (isMockMode) {
        await googleAdsService.connectAccount(currentTenant.id, {
          account_name: `Mock Account ${Math.floor(Math.random() * 1000)}`,
          google_ads_id: `${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 1000)}`,
          email: `mock.user.${Math.floor(Math.random() * 1000)}@example.com`,
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          is_mock: true,
        })
        toast.success(t('Mock Google Ads account connected'))
        await loadData({ silent: true })
      } else {
        await googleAdsService.connectGoogle()
      }
    } catch (error) {
      console.error(error)
      toast.error(t('Failed to start Google connection'))
    } finally {
      setConnecting(false)
    }
  }

  const handleDiscover = async (connectedAccountId) => {
    setDiscoveringId(connectedAccountId)
    try {
      const result = await googleAdsService.discoverAdsAccounts(connectedAccountId)
      toast.success(result?.message || t('Accounts discovered successfully'))
      await loadData({ silent: true })
    } catch (error) {
      console.error(error)
      const msg = error?.response?.data?.message || t('Failed to discover Google Ads accounts')
      toast.error(msg)
    } finally {
      setDiscoveringId(null)
    }
  }

  const handleSave = async () => {
    if (!currentAccount) {
      toast.error(t('Select an account first'))
      return
    }

    setSaving(true)
    try {
      await Promise.all([
        googleAdsService.saveSettings({
          ...settings,
          status: true,
          webhookKey: currentAccount.webhook_key || status?.webhookKey || null,
          customerId: currentAccount.google_ads_id || null,
        }),
        googleAdsService.updateAccount(currentAccount.id, {
          is_primary: accountPreferences.isPrimary,
          is_default_for_sync: accountPreferences.isDefaultForSync,
          is_default_for_conversion: accountPreferences.isDefaultForConversion,
          webhook_enabled: accountPreferences.webhookEnabled,
        }),
      ])

      toast.success(t('Google Ads settings saved successfully'))
      await loadData({ silent: true })
    } catch (error) {
      console.error(error)
      toast.error(t('Failed to save settings'))
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    if (!currentAccount) return
    setSyncing(true)
    try {
      const result = await googleAdsService.syncAccount(currentAccount.id)
      toast.success(result?.message || t('Sync completed successfully'))
      await loadData({ silent: true })
    } catch (error) {
      console.error(error)
      toast.error(t('Failed to sync selected account'))
    } finally {
      setSyncing(false)
    }
  }

  const handleTestConversion = async () => {
    if (!currentAccount) {
      toast.error(t('Select an account first'))
      return
    }

    try {
      await googleAdsService.sendConversionTest({
        google_ads_account_id: currentAccount.id,
        gclid: manualGclid || 'TEST-GCLID',
        conversion_time: new Date().toISOString(),
        conversion_value: Number(settings.conversionValue || 1),
        currency_code: settings.conversionCurrencyCode || 'USD',
      })
      toast.success(t('Test conversion sent successfully'))
    } catch (error) {
      console.error(error)
      toast.error(t('Failed to send test conversion'))
    }
  }

  const handleManualUpload = async () => {
    if (!currentAccount) {
      toast.error(t('Select an account first'))
      return
    }

    try {
      await googleAdsService.uploadConversion({
        google_ads_account_id: currentAccount.id,
        conversionActionId: settings.conversionActionId,
        conversionTime: new Date().toISOString(),
        conversionValue: Number(settings.conversionValue || 1),
        currencyCode: settings.conversionCurrencyCode || 'USD',
        gclid: manualGclid,
      })
      toast.success(t('Conversion uploaded successfully'))
      setManualGclid('')
    } catch (error) {
      console.error(error)
      toast.error(t('Failed to upload conversion'))
    }
  }

  const handleDisconnect = async () => {
    if (!currentAccount) return
    if (!window.confirm(t('Disconnect this Google Ads account? Historical data will remain, but sync and conversions will stop.'))) {
      return
    }

    try {
      await googleAdsService.disconnectAccount(currentTenant.id, currentAccount.id)
      toast.success(t('Account disconnected successfully'))
      await loadData({ silent: true })
    } catch (error) {
      console.error(error)
      toast.error(t('Failed to disconnect account'))
    }
  }

  const handleRegenerateWebhookKey = async () => {
    if (!currentAccount) return
    try {
      await googleAdsService.regenerateWebhookKey(currentAccount.id)
      toast.success(t('Webhook key regenerated successfully'))
      await loadData({ silent: true })
    } catch (error) {
      console.error(error)
      toast.error(t('Failed to regenerate webhook key'))
    }
  }

  const renderEmptyState = () => (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-5 dark:bg-gray-800">
        <FaGoogle className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-theme">{t('No Google Ads accounts yet')}</h3>
      <p className="mb-6 max-w-lg text-sm text-theme/70">
        {t('Connect a Google account, discover accessible ad accounts, then choose which account should be primary for sync and conversion uploads.')}
      </p>
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
        {t('Connect Google')}
      </button>
    </div>
  )

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-gray-200 bg-transparent p-5 dark:border-gray-700">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-theme">{currentAccount?.account_name || t('Select Account')}</h3>
              {currentAccount ? (
                <p className="mt-1 text-sm text-theme/70">
                  {currentAccount.google_ads_id} • {currentAccount.email || t('No linked email')}
                </p>
              ) : null}
            </div>
            {currentAccount ? <Badge tone={currentAccount.connection_status || 'connected'}>{currentAccount.connection_status || 'connected'}</Badge> : null}
          </div>

          {currentAccount ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {currentAccount.is_primary ? <Badge tone="connected">{t('Primary')}</Badge> : null}
                {currentAccount.is_default_for_sync ? <Badge tone="connected">{t('Default Sync')}</Badge> : null}
                {currentAccount.is_default_for_conversion ? <Badge tone="connected">{t('Default Conversion')}</Badge> : null}
                {currentAccount.is_manager ? <Badge tone="default">{t('Manager Account')}</Badge> : <Badge tone="default">{t('Client Account')}</Badge>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleCard
                  title={t('Primary account')}
                  description={t('Preferred account shown first in the UI.')}
                  checked={accountPreferences.isPrimary}
                  onChange={(checked) => setAccountPreferences((prev) => ({ ...prev, isPrimary: checked }))}
                />
                <ToggleCard
                  title={t('Default sync')}
                  description={t('Used as the default reporting account for this tenant.')}
                  checked={accountPreferences.isDefaultForSync}
                  onChange={(checked) => setAccountPreferences((prev) => ({ ...prev, isDefaultForSync: checked }))}
                />
                <ToggleCard
                  title={t('Default conversion')}
                  description={t('Default account selected in the conversions tab.')}
                  checked={accountPreferences.isDefaultForConversion}
                  onChange={(checked) => setAccountPreferences((prev) => ({ ...prev, isDefaultForConversion: checked }))}
                />
                <ToggleCard
                  title={t('Webhook enabled')}
                  description={t('Allows this account to receive lead form webhooks.')}
                  checked={accountPreferences.webhookEnabled}
                  onChange={(checked) => setAccountPreferences((prev) => ({ ...prev, webhookEnabled: checked }))}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <ActionButton icon={RefreshCw} loading={syncing} onClick={handleSync}>
                  {t('Sync This Account')}
                </ActionButton>
                <ActionButton icon={Save} loading={saving} onClick={handleSave}>
                  {t('Save Account Policy')}
                </ActionButton>
                <button
                  onClick={handleDisconnect}
                  className="inline-flex items-center rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('Disconnect')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-theme/70">{t('Choose an account from the sidebar to manage it.')}</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-transparent p-5 dark:border-gray-700">
          <h3 className="mb-3 text-lg font-semibold text-theme">{t('Connection Summary')}</h3>
          <div className="space-y-3 text-sm">
            <SummaryRow label={t('Connected identities')} value={status?.connectedAccountsCount ?? 0} />
            <SummaryRow label={t('Ads accounts')} value={status?.adsAccountsCount ?? 0} />
            <SummaryRow label={t('Primary account')} value={accounts.find((item) => item.id === status?.primaryAccountId)?.account_name || '—'} />
            <SummaryRow label={t('Default sync')} value={accounts.find((item) => item.id === status?.defaultSyncAccountId)?.account_name || '—'} />
            <SummaryRow label={t('Default conversion')} value={accounts.find((item) => item.id === status?.defaultConversionAccountId)?.account_name || '—'} />
          </div>
        </div>
      </div>

      {renderConnectedIdentities()}
    </div>
  )

  const renderWebhook = () => {
    if (!currentAccount) return null
    const apiBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/+$/, '')
    const webhookUrl = `${apiBase.replace(/\/api$/i, '')}/api/google/webhook`

    return (
      <div className="space-y-6 rounded-xl border border-gray-200 bg-transparent p-5 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-theme">{t('Webhook Configuration')}</h3>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/10 dark:text-blue-200">
          {t('This webhook key is bound to the selected Google Ads account, not just the tenant. Use it in Google Lead Form webhook settings for accurate account attribution.')}
        </div>

        <CopyField label={t('Webhook URL')} value={webhookUrl} onCopy={copyToClipboard} />
        <CopyField label={t('Webhook Key')} value={currentAccount.webhook_key || t('No webhook key yet')} onCopy={copyToClipboard} />

        <div className="flex flex-wrap gap-3">
          <ActionButton icon={KeyRound} onClick={handleRegenerateWebhookKey}>
            {t('Regenerate Webhook Key')}
          </ActionButton>
          <ActionButton icon={Save} loading={saving} onClick={handleSave}>
            {t('Save Webhook Policy')}
          </ActionButton>
        </div>
      </div>
    )
  }

  const renderConversions = () => (
    <div className="space-y-6 rounded-xl border border-gray-200 bg-transparent p-5 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-theme">{t('Offline Conversions')}</h3>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/10 dark:text-yellow-200">
        {t('Conversions now require an explicit Google Ads account context. The selected account below will be used for both testing and manual upload.')}
      </div>

      <InputField
        label={t('Conversion Action ID / Name')}
        value={settings.conversionActionId}
        onChange={(value) => setSettings((prev) => ({ ...prev, conversionActionId: value }))}
        placeholder="123456789"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <InputField
          label={t('Default Conversion Value')}
          value={settings.conversionValue}
          onChange={(value) => setSettings((prev) => ({ ...prev, conversionValue: value }))}
          placeholder="1.00"
          type="number"
        />
        <InputField
          label={t('Currency Code')}
          value={settings.conversionCurrencyCode}
          onChange={(value) => setSettings((prev) => ({ ...prev, conversionCurrencyCode: value.toUpperCase() }))}
          placeholder="EGP"
        />
      </div>

      <InputField
        label={t('GCLID')}
        value={manualGclid}
        onChange={setManualGclid}
        placeholder="Enter a Google Click ID for testing or upload"
        helperText={t('Use a real click id for manual upload, or leave it empty to send a test conversion with TEST-GCLID.')}
      />

      <div className="flex flex-wrap gap-3">
        <ActionButton icon={Save} loading={saving} onClick={handleSave}>
          {t('Save Conversion Settings')}
        </ActionButton>
        <ActionButton icon={ShieldCheck} onClick={handleTestConversion}>
          {t('Send Test Conversion')}
        </ActionButton>
        <button
          onClick={handleManualUpload}
          disabled={!manualGclid || !settings.conversionActionId}
          className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Zap className="mr-2 h-4 w-4" />
          {t('Upload Conversion')}
        </button>
      </div>
    </div>
  )

  const renderConnectedIdentities = () => (
    <div className="rounded-xl border border-gray-200 bg-transparent p-5 dark:border-gray-700">
      <div className="mb-4 flex items-center gap-2">
        <UserCircle2 className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-theme">{t('Connected Google identities')}</h3>
      </div>

      {connectedAccounts.length === 0 ? (
        <p className="text-sm text-theme/70">{t('No Google identities have completed OAuth yet.')}</p>
      ) : (
        <div className="space-y-3">
          {connectedAccounts.map((connected) => (
            <div key={connected.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium text-theme">{connected.google_name || connected.google_email}</div>
                <div className="text-sm text-theme/70">{connected.google_email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="default">{t('{{count}} ads accounts', { count: connected.google_ads_accounts_count || 0 })}</Badge>
                <ActionButton
                  icon={ShieldCheck}
                  loading={discoveringId === connected.id}
                  onClick={() => handleDiscover(connected.id)}
                >
                  {t('Discover Accounts')}
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/50 p-2 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex h-[92vh] max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-200 card shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:grid sm:h-[88vh] sm:max-h-[88vh] sm:grid-cols-[20rem_1fr]">
        <aside className="flex w-full flex-shrink-0 flex-col border-b border-gray-200 bg-transparent dark:border-gray-800 sm:border-b-0 sm:border-r">
          <div className="border-b border-gray-200 p-4 sm:p-6 dark:border-gray-800">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-red-600 p-2 text-white">
                  <FaGoogle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-theme">Google Ads</h2>
                  <p className="text-xs text-theme/60">{t('Multi-account control center')}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="sm:hidden shrink-0 rounded-full p-2 text-theme/60 hover:bg-white/80 hover:text-theme dark:hover:bg-gray-800 bg-white/90 shadow-md backdrop-blur dark:bg-gray-900/90"
                aria-label="Close"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => loadData({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-theme hover:bg-white/80 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t('Refresh')}
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                {t('Connect')}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:min-h-0">
            <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-theme/60">{t('Ad Accounts')}</div>
            {accounts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-theme/70 dark:border-gray-700">
                {t('No ad accounts discovered yet. Connect Google and run discovery.')}
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      String(selectedAccountId) === String(account.id)
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'border-gray-200 bg-white text-theme hover:bg-white/80 dark:border-gray-700 dark:bg-transparent dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate font-medium">{account.account_name}</div>
                      {account.is_manager ? <Badge>{t('MCC')}</Badge> : null}
                    </div>
                    <div className="mt-1 truncate text-xs text-theme/60">{account.google_ads_id}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {account.is_primary ? <Badge tone="connected">{t('Primary')}</Badge> : null}
                      {account.is_default_for_sync ? <Badge tone="connected">{t('Sync')}</Badge> : null}
                      {account.is_default_for_conversion ? <Badge tone="connected">{t('Conversion')}</Badge> : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col min-h-0">
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-transparent px-4 py-4 backdrop-blur dark:border-gray-800  sm:px-8 sm:py-5">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold text-theme">
                {currentAccount ? currentAccount.account_name : t('Google Ads Manager')}
              </h1>
              <p className="mt-1 text-sm text-theme/60">
                {currentAccount
                  ? t('Manage sync, conversion uploads, and webhook routing for the selected Google Ads account.')
                  : t('Connect Google, discover accessible ad accounts, and choose default account policies.')}
              </p>
              <div className="mt-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
                {['overview', 'webhook', 'conversions'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-theme/60 hover:text-theme'
                    }`}
                  >
                    {t(tab.charAt(0).toUpperCase() + tab.slice(1))}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={closeModal}
              className="hidden sm:inline-flex shrink-0 rounded-full p-2 text-theme/60 hover:bg-white/80 hover:text-theme dark:hover:bg-gray-800 bg-white/90 shadow-md backdrop-blur dark:bg-gray-900/90"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {callbackStatus === 'error' && callbackMessage ? (
            <div className="mx-8 mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
              {decodeURIComponent(callbackMessage)}
            </div>
          ) : null}

          {callbackStatus === 'success' ? (
            <div className="mx-8 mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300">
              {t('Google account connected successfully')}
            </div>
          ) : null}

          <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-8">
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-sm text-theme/70">{t('Loading Google Ads settings...')}</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="space-y-6">
                {renderEmptyState()}
                {renderConnectedIdentities()}
              </div>
            ) : (
              <>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'webhook' && renderWebhook()}
                {activeTab === 'conversions' && renderConversions()}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function ToggleCard({ title, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div>
        <div className="text-sm font-medium text-theme">{title}</div>
        <div className="mt-1 text-xs text-theme/60">{description}</div>
      </div>
    </label>
  )
}

function ActionButton({ icon: Icon, loading = false, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-theme hover:bg-white/80 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
      {children}
    </button>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-theme/60">{label}</span>
      <span className="text-right font-medium text-theme">{value}</span>
    </div>
  )
}

function CopyField({ label, value, onCopy }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-theme">{label}</label>
      <div className="flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700">
        <input
          type="text"
          readOnly
          value={value || ''}
          className="w-full bg-white px-3 py-2 text-sm text-theme dark:bg-gray-800"
        />
        <button
          onClick={() => onCopy(value || '')}
          className="inline-flex items-center border-l border-gray-300 px-3 text-theme hover:bg-white/80 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
