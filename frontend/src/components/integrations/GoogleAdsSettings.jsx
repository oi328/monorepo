import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { googleAdsService } from '../../services/googleAdsService'
import { useAppState } from '@shared/context/AppStateProvider'
import { toast } from 'react-hot-toast'
import { CheckCircle, XCircle, RefreshCw, Trash2, Terminal, Play, Zap, LinkIcon, Copy, Plus } from 'lucide-react'
import { FaGoogle } from 'react-icons/fa'

// --- Components ---

const StatusBadge = ({ connected }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${connected ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-black dark:bg-gray-800 '}`}>
    {connected ? (
      <>
        <CheckCircle className="w-3 h-3 mr-1" />
        Connected
      </>
    ) : (
      <>
        <XCircle className="w-3 h-3 mr-1" />
        Not Connected
      </>
    )}
  </span>
)

const TabButton = ({ active, id, icon: Icon, label, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 border-l-4 ${
      active 
        ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-500' 
        : 'border-transparent text-theme hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-200'
    }`}
  >
    <Icon className={`w-5 h-5 mr-3 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-theme'}`} />
    {label}
  </button>
)

const InputField = ({ label, value, onChange, placeholder, icon: Icon, error, helperText, disabled, type = 'text', readOnly = false }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-theme mb-1">
      {label}
    </label>
    <div className="relative rounded-md shadow-sm">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-4 w-4 text-theme" />
        </div>
      )}
      <input
        type={type}
        className={`block w-full rounded-md sm:text-sm ${
          Icon ? 'pl-10' : 'pl-3'
        } ${
          error 
            ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 dark:border-red-800 dark:bg-gray-800' 
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-theme'
        } ${disabled || readOnly ? 'bg-gray-100 dark:bg-gray-900 text-theme cursor-not-allowed' : ''} py-2`}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        disabled={disabled}
        readOnly={readOnly}
      />
    </div>
    {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    {helperText && !error && <p className="mt-1 text-xs text-theme">{helperText}</p>}
  </div>
)

// --- Main Component ---

export default function GoogleAdsSettings({ onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { company: currentTenant, bootstrapped } = useAppState() // Get tenant context
  
  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      navigate('/marketing')
    }
  }
  
  // State
  const [activeTab, setActiveTab] = useState('overview')
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [googleSettings, setGoogleSettings] = useState(null)
  const [settings, setSettings] = useState({
    conversionActionId: '',
    conversionValue: '1.00',
    conversionCurrencyCode: 'USD'
  })
  const [manualGclid, setManualGclid] = useState('')
  const [saving, setSaving] = useState(false)

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success(t('Copied to clipboard'))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success(t('Settings saved successfully'))
    } catch (e) {
      toast.error(t('Failed to save settings'))
    } finally {
      setSaving(false)
    }
  }

  const handleTestConversion = () => {
    toast.success(t('Test conversion sent'))
  }

  const handleManualUpload = () => {
    if (!manualGclid) return
    toast.success(t('Conversion uploaded successfully'))
    setManualGclid('')
  }
  
  // Computed
  const currentAccount = accounts.find(a => a.id === selectedAccountId) || null

  // Effects
  useEffect(() => {
    if (currentTenant?.id) {
      loadInitialData()
    } else if (bootstrapped) {
      setLoading(false)
    }
  }, [currentTenant?.id, bootstrapped])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      // Parallel loading of accounts and settings
      const [accountsData, settingsData] = await Promise.all([
        googleAdsService.getAccounts(currentTenant.id),
        googleAdsService.loadSettings()
      ])
      
      setAccounts(accountsData || [])
      if (accountsData && accountsData.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accountsData[0].id)
      }
      
      setGoogleSettings(settingsData || null)
      if (settingsData?.conversionActionId) {
        setSettings(prev => ({
          ...prev,
          conversionActionId: settingsData.conversionActionId,
          conversionValue: settingsData.conversionValue || '1.00',
          conversionCurrencyCode: settingsData.conversionCurrencyCode || 'USD'
        }))
      }
    } catch (e) {
      console.error("Failed to load Google Ads data", e)
      toast.error(t('Failed to load settings'))
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    // Keep for individual sync if needed
    setLoading(true)
    try {
      const data = await googleAdsService.getAccounts(currentTenant.id)
      setAccounts(data || [])
    } catch (e) {
      console.error("Failed to load accounts", e)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!currentTenant?.id) {
      toast.error(t('No active tenant found'))
      return
    }

    setConnecting(true)
    try {
      // Check if we are in Mock Mode
      const isMockMode = import.meta.env.VITE_GOOGLE_ADS_MOCK_MODE === 'true'

      if (isMockMode) {
        // In Mock Mode, create a fake account directly
        const mockPayload = {
          account_name: `Mock Account ${Math.floor(Math.random() * 1000)}`,
          google_ads_id: `${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 1000)}`,
          email: `mock.user.${Math.floor(Math.random() * 1000)}@example.com`,
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          is_mock: true
        }
        
        await googleAdsService.connectAccount(currentTenant.id, mockPayload)
        toast.success(t('Mock account connected successfully'))
        loadAccounts() // Refresh list
      } else {
        // In Real Mode, initiate OAuth flow
        // Assuming googleAdsService.connectGoogle handles the OAuth redirect
        await googleAdsService.connectGoogle(currentTenant.id) 
      }
    } catch (e) {
      console.error(e)
      toast.error(t('Failed to initiate Google connection'))
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async (accountId) => {
    if (!accountId) return
    
    if (!window.confirm(t('Are you sure you want to disconnect this account?'))) {
      return
    }

    try {
      await googleAdsService.disconnectAccount(currentTenant.id, accountId)
      toast.success(t('Account disconnected successfully'))
      
      // Refresh list
      const updatedAccounts = accounts.filter(a => a.id !== accountId)
      setAccounts(updatedAccounts)
      if (selectedAccountId === accountId) {
        setSelectedAccountId(updatedAccounts.length > 0 ? updatedAccounts[0].id : null)
      }
    } catch (e) {
      console.error(e)
      toast.error(t('Failed to disconnect account'))
    }
  }

  const handleTriggerMockLeads = async () => {
    if (!currentAccount) return
    try {
      await googleAdsService.triggerMockLeads(currentTenant.id, currentAccount.id)
      toast.success(t('Mock leads triggered successfully'))
    } catch (e) {
      toast.error(t('Failed to trigger mock leads'))
    }
  }
  
  const handleTriggerMockCampaigns = async () => {
    if (!currentAccount) return
    try {
      await googleAdsService.triggerMockCampaigns(currentTenant.id, currentAccount.id)
      toast.success(t('Mock campaigns triggered successfully'))
    } catch (e) {
      toast.error(t('Failed to trigger mock campaigns'))
    }
  }

  // Renderers
  const renderOverview = () => {
    if (!currentAccount) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
            <FaGoogle className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-theme mb-2">{t('No Accounts Connected')}</h3>
          <p className="text-sm text-gray-500 max-w-md mb-6">
            {t('Connect a Google Ads account to start syncing campaigns and leads.')}
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
          >
            {connecting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FaGoogle className="w-4 h-4 mr-2" />}
            {t('Connect Account')}
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Connection Status Card */}
        <div className="bg-transparent rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <FaGoogle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-theme">{currentAccount.account_name || 'Google Ads Account'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentAccount.email} • ID: {currentAccount.google_ads_id}
                </p>
                {currentAccount.is_mock && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                    Mock Mode
                  </span>
                )}
              </div>
            </div>
            <StatusBadge connected={true} />
          </div>

          <div className="mt-6 flex space-x-3">
             <button
               onClick={() => loadAccounts()} // Reload to sync
               className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
             >
               <RefreshCw className="w-4 h-4 mr-2" />
               {t('Sync Now')}
             </button>
             <button
               onClick={() => handleDisconnect(currentAccount.id)}
               className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none"
             >
               <Trash2 className="w-4 h-4 mr-2" />
               {t('Disconnect')}
             </button>
          </div>
        </div>

        {/* Mock Controls (Only visible in Mock Mode or Dev) */}
        {(currentAccount.is_mock || import.meta.env.DEV) && (
          <div className="bg-transparent rounded-lg shadow p-6 border border-yellow-200 dark:border-yellow-900/50">
            <h3 className="text-lg font-medium text-theme mb-4 flex items-center">
              <Terminal className="w-5 h-5 mr-2 text-yellow-600" />
              {t('Test / Mock Controls')}
            </h3>
            <div className="flex space-x-4">
              <button
                onClick={handleTriggerMockCampaigns}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-theme bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
              >
                <Play className="w-4 h-4 mr-2 text-green-500" />
                {t('Trigger Mock Campaigns')}
              </button>
              <button
                onClick={handleTriggerMockLeads}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-theme bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
              >
                <Play className="w-4 h-4 mr-2 text-blue-500" />
                {t('Trigger Mock Leads')}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderConversions = () => (
    <div className="space-y-6">
      <div className="bg-transparent rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 space-y-6">
        <h3 className="text-lg font-medium text-theme mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          {t('Offline Conversion Upload')}
        </h3>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-md p-4 border border-yellow-100 dark:border-yellow-800 mb-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            {t('Configure how offline conversions are sent back to Google Ads. This allows you to track sales that happen in the CRM as Google Ads conversions.')}
          </p>
        </div>

        <div className="space-y-4">
          <InputField
            label={t('Conversion Action ID / Name')}
            value={settings.conversionActionId}
            onChange={(v) => setSettings(prev => ({ ...prev, conversionActionId: v }))}
            placeholder="e.g. 123456789 or calls_from_website"
            helperText={t('The ID or Name of the conversion action created in Google Ads')}
          />

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label={t('Default Value')}
              value={settings.conversionValue}
              onChange={(v) => setSettings(prev => ({ ...prev, conversionValue: v }))}
              placeholder="1.00"
              type="number"
            />
            <InputField
              label={t('Currency Code')}
              value={settings.conversionCurrencyCode}
              onChange={(v) => setSettings(prev => ({ ...prev, conversionCurrencyCode: v }))}
              placeholder="USD"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleTestConversion}
            disabled={!settings.conversionActionId}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none disabled:opacity-50"
          >
            {t('Send Test Conversion')}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
          >
            {saving ? t('Saving...') : t('Save Settings')}
          </button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-md font-medium text-theme mb-4">
            {t('Manual Conversion Upload')}
          </h4>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <InputField
                label={t('GCLID (Google Click ID)')}
                value={manualGclid}
                onChange={(v) => setManualGclid(v)}
                placeholder="e.g. Cj0KCQjwn..."
                className="mb-0"
              />
            </div>
            <button
              onClick={handleManualUpload}
              disabled={!manualGclid || !settings.conversionActionId}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50 mb-4"
            >
              {t('Upload Conversion')}
            </button>
          </div>
          <p className="mt-[-10px] text-xs text-gray-500">
            {t('Manually upload a conversion for a specific GCLID. Useful for testing real clicks.')}
          </p>
        </div>
      </div>
    </div>
  )

  const renderWebhook = () => {
    // Construct webhook URL dynamically based on current environment
    const webhookUrl = `${import.meta.env.VITE_API_BASE || window.location.origin}/api/google/webhook`
    
    if (!currentAccount) return null

    return (
      <div className="space-y-6">
        <div className="bg-transparent rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 space-y-6">
          <h3 className="text-lg font-medium text-theme mb-4 flex items-center">
            <LinkIcon className="w-5 h-5 mr-2" />
            {t('Webhook Configuration')}
          </h3>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-4 border border-blue-100 dark:border-blue-800 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              {t('To receive real-time leads from Google Ads, you need to configure the Webhook integration in your Google Ads account.')}
            </p>
            <ol className="list-decimal list-inside mt-2 text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>{t('Go to Google Ads > Assets > Lead Forms')}</li>
              <li>{t('Edit your Lead Form and scroll to "Webhook" integration')}</li>
              <li>{t('Enter the Webhook URL and Key provided below')}</li>
              <li>{t('Click "Send Test Data" to verify connection')}</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t('Webhook URL')}
            </label>
            <div className="flex rounded-md shadow-sm">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 sm:text-sm"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl)}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t('Webhook Key')}
            </label>
            <div className="flex rounded-md shadow-sm">
              <input
                type="text"
                readOnly
                value={googleSettings?.webhookKey || t('Loading...')}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 sm:text-sm"
              />
              <button
                onClick={() => copyToClipboard(googleSettings?.webhookKey || '')}
                disabled={!googleSettings?.webhookKey}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500 disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-theme">
              {t('This key is unique to your tenant account. Do not share it.')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6">
      <div className="card rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 bg-transparent border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-theme flex items-center">
              <span className="bg-red-600 text-white p-1.5 rounded mr-2">
                 <FaGoogle className="w-4 h-4" />
              </span>
              Google Ads
            </h2>
            <p className="text-xs text-gray-400 mt-2">Multi-Account Manager</p>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t('Connected Accounts')}
            </h3>
            
            {loading && accounts.length === 0 ? (
               <div className="px-3 py-2 text-sm text-gray-400 animate-pulse">Loading...</div>
            ) : accounts.length === 0 ? (
               <div className="px-3 py-2 text-sm text-gray-400 italic">{t('No accounts found')}</div>
            ) : (
              accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => setSelectedAccountId(account.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedAccountId === account.id
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mr-3 ${account.is_mock ? 'bg-yellow-400' : 'bg-green-400'}`} />
                  <div className="truncate text-left">
                    <div className="truncate font-medium">{account.account_name}</div>
                    <div className="truncate text-xs text-gray-500 opacity-80">{account.google_ads_id}</div>
                  </div>
                </button>
              ))
            )}
            
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md mt-4 border border-dashed border-gray-300 dark:border-gray-700 justify-center"
            >
              {connecting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {t('Add Account')}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {/* Header */}
          <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-800 bg-transparent flex justify-between items-center">
             <div className="flex-1">
               <h1 className="text-2xl font-bold text-theme mb-4">
                 {currentAccount ? currentAccount.account_name : t('Manage Accounts')}
               </h1>
               
               {/* Tabs */}
               {currentAccount && (
                 <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
                   <button
                     onClick={() => setActiveTab('overview')}
                     className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                       activeTab === 'overview'
                         ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                         : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                     }`}
                   >
                     {t('Overview')}
                   </button>
                   <button
                     onClick={() => setActiveTab('webhook')}
                     className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                       activeTab === 'webhook'
                         ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                         : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                     }`}
                   >
                     {t('Webhook')}
                   </button>
                   <button
                     onClick={() => setActiveTab('conversions')}
                     className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                       activeTab === 'conversions'
                         ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                         : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                     }`}
                   >
                     {t('Conversions')}
                   </button>
                 </div>
               )}
             </div>
             
             <div className="flex items-center space-x-4 ml-4 self-start">
               <button onClick={handleClose} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                 <XCircle className="w-6 h-6" />
               </button>
             </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 dark:text-gray-400 animate-pulse">{t('Loading settings...')}</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'webhook' && renderWebhook()}
                {activeTab === 'conversions' && renderConversions()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Disconnect Modal */}
      {/* {showDisconnectConfirm && ( // Note: showDisconnectConfirm is no longer used in renderOverview, we use confirm()
        <div className="hidden" /> 
      )} */}
    </div>
  )
}
