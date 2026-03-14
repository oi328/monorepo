import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { 
  Server, 
  RefreshCw, 
  Database, 
  Activity,
  Save,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getErpSettings, updateErpSettings, testErpConnection, getErpSyncLogs } from '../../../services/erpService'
import { useTheme } from '@shared/context/ThemeProvider'

export default function ERPIntegrations() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('connection')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [connectionData, setConnectionData] = useState({
    provider: 'Generic REST API',
    baseUrl: '',
    authType: 'Bearer Token',
    apiKey: '',
    username: '',
    password: '',
    advancedSettings: '',
  })

  // Sync Settings State
  const [syncSettings, setSyncSettings] = useState([
    { id: 1, entity: 'Customers', enabled: false, direction: 'Two-way Sync', frequency: 'Real-time' },
    { id: 2, entity: 'Products', enabled: false, direction: 'Pull from ERP', frequency: 'Every Day' },
    { id: 3, entity: 'Orders', enabled: false, direction: 'Push to ERP', frequency: 'Real-time' },
    { id: 4, entity: 'Invoices', enabled: false, direction: 'Push to ERP', frequency: 'Every Hour' },
  ])

  // Mapping State
  const [activeMappingEntity, setActiveMappingEntity] = useState('Customers')
  const [mappings, setMappings] = useState({
    'Customers': [
      { id: 1, local: 'name', erp: 'customer_name' },
      { id: 2, local: 'email', erp: 'email_address' },
      { id: 3, local: 'phone', erp: 'contact_number' },
    ],
    'Products': [
      { id: 1, local: 'name', erp: 'product_title' },
      { id: 2, local: 'sku', erp: 'sku_code' },
      { id: 3, local: 'price', erp: 'unit_price' },
    ]
  })

  const [logs, setLogs] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getErpSettings()
        if (data) {
          setConnectionData(prev => ({
            ...prev,
            provider: data.provider || prev.provider,
            baseUrl: data.base_url || '',
            authType: data.auth_type || prev.authType,
            apiKey: data.api_key || '',
            username: data.username || '',
            password: data.password || '',
            advancedSettings: data.advanced_settings
              ? JSON.stringify(data.advanced_settings, null, 2)
              : '',
          }))
          if (Array.isArray(data.sync_settings)) {
            setSyncSettings(data.sync_settings)
          }
          if (data.field_mappings && typeof data.field_mappings === 'object') {
            setMappings(data.field_mappings)
          }
        }
      } catch (error) {
        console.error('Failed to load ERP settings', error)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await getErpSyncLogs()
        if (Array.isArray(data)) {
          setLogs(data)
        }
      } catch (error) {
        console.error('Failed to load ERP sync logs', error)
      }
    }
    if (activeTab === 'logs') {
      loadLogs()
    }
  }, [activeTab])

  const buildPayload = () => {
    let advanced = undefined

    if (connectionData.advancedSettings && connectionData.advancedSettings.trim() !== '') {
      try {
        advanced = JSON.parse(connectionData.advancedSettings)
      } catch (e) {
        const error = new Error('ADVANCED_SETTINGS_INVALID')
        throw error
      }
    }

    return {
      provider: connectionData.provider,
      base_url: connectionData.baseUrl,
      auth_type: connectionData.authType,
      api_key: connectionData.apiKey,
      username: connectionData.username,
      password: connectionData.password,
      sync_settings: syncSettings,
      field_mappings: mappings,
      advanced_settings: advanced,
    }
  }

  const handleConnectionSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = buildPayload()

      const testResult = await testErpConnection({
        provider: payload.provider,
        base_url: payload.base_url,
        auth_type: payload.auth_type,
        api_key: payload.api_key,
        username: payload.username,
        password: payload.password,
      })
      await updateErpSettings(payload)

      toast.success(testResult?.message || t('Connection established successfully'))
    } catch (error) {
      if (error?.message === 'ADVANCED_SETTINGS_INVALID') {
        toast.error(t('Advanced settings must be valid JSON'))
      } else {
        const msg = error?.response?.data?.message || t('Failed to establish connection. Please check your credentials.')
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveOnly = async () => {
    setSaving(true)
    try {
      const payload = buildPayload()
      await updateErpSettings(payload)
      toast.success(t('Settings saved successfully'))
    } catch (error) {
      if (error?.message === 'ADVANCED_SETTINGS_INVALID') {
        toast.error(t('Advanced settings must be valid JSON'))
      } else {
        const msg = error?.response?.data?.message || t('Failed to save settings.')
        toast.error(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleSync = (id) => {
    setSyncSettings(prev => prev.map(item => 
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ))
  }

  const updateSyncSetting = (id, field, value) => {
    setSyncSettings(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const addMapping = () => {
    const newMapping = { id: Date.now(), local: '', erp: '' }
    setMappings(prev => ({
      ...prev,
      [activeMappingEntity]: [...(prev[activeMappingEntity] || []), newMapping]
    }))
  }

  const removeMapping = (id) => {
    setMappings(prev => ({
      ...prev,
      [activeMappingEntity]: prev[activeMappingEntity].filter(m => m.id !== id)
    }))
  }

  const updateMapping = (id, field, value) => {
    setMappings(prev => ({
      ...prev,
      [activeMappingEntity]: prev[activeMappingEntity].map(m => 
        m.id === id ? { ...m, [field]: value } : m
      )
    }))
  }

  return (

      <div className="p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full"></div>
            <h1 className="text-3xl font-bold text-theme">
              {t('ERP Integrations')}
            </h1>
          </div>
          <p className={`${isLight ? 'text-black' : 'text-white'} opacity-60 ml-4`}>
            {t('Configure your ERP system connections here.')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl w-fit">
          {[
            { id: 'connection', icon: Server, label: 'ERP Connection' },
            { id: 'sync', icon: RefreshCw, label: 'Sync Settings' },
            { id: 'mapping', icon: Database, label: 'Field Mapping' },
            { id: 'logs', icon: Activity, label: 'Sync Logs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t(tab.label)}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Connection Tab */}
          {activeTab === 'connection' && (
            <div className="glass-panel rounded-2xl p-6 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 max-w-4xl">
              <form onSubmit={handleConnectionSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t('ERP Provider')}</label>
                    <select 
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={connectionData.provider}
                      onChange={(e) => setConnectionData({...connectionData, provider: e.target.value})}
                    >
                      <option>Generic REST API</option>
                      <option>SAP S/4HANA</option>
                      <option>Microsoft Dynamics 365</option>
                      <option>Oracle NetSuite</option>
                      <option>Odoo</option>
                      <option>Salesforce</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t('Base URL')}</label>
                    <input 
                      type="url" 
                      required
                      placeholder="https://api.erp-system.com/v1"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={connectionData.baseUrl}
                      onChange={(e) => setConnectionData({...connectionData, baseUrl: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t('Auth Type')}</label>
                    <select 
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={connectionData.authType}
                      onChange={(e) => setConnectionData({...connectionData, authType: e.target.value})}
                    >
                      <option>Bearer Token</option>
                      <option>Basic Auth</option>
                      <option>API Key</option>
                    </select>
                  </div>
                  
                  {connectionData.authType === 'Bearer Token' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1.5">{t('Bearer Token')}</label>
                      <input 
                        type="password" 
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={connectionData.apiKey}
                        onChange={(e) => setConnectionData({...connectionData, apiKey: e.target.value})}
                      />
                    </div>
                  )}

                  {connectionData.authType === 'API Key' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1.5">{t('API Key')}</label>
                      <input 
                        type="password" 
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={connectionData.apiKey}
                        onChange={(e) => setConnectionData({...connectionData, apiKey: e.target.value})}
                      />
                    </div>
                  )}

                  {connectionData.authType === 'Basic Auth' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">{t('Username')}</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={connectionData.username}
                          onChange={(e) => setConnectionData({...connectionData, username: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">{t('Password')}</label>
                        <input 
                          type="password" 
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={connectionData.password}
                          onChange={(e) => setConnectionData({...connectionData, password: e.target.value})}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1.5">
                    {t('Advanced Settings (JSON, optional)')}
                  </label>
                  <textarea
                    rows={6}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
                    placeholder="{&#10;  &quot;webhookUrl&quot;: &quot;https://example.com/webhook&quot;,&#10;  &quot;timeout&quot;: 30&#10;}"
                    value={connectionData.advancedSettings}
                    onChange={(e) => setConnectionData({ ...connectionData, advancedSettings: e.target.value })}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="btn btn-primary flex items-center gap-2 px-6"
                  >
                    {loading ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {t('Test & Save Connection')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sync Settings Tab */}
          {activeTab === 'sync' && (
            <div className="space-y-4 max-w-5xl">
              <div className="grid gap-4">
                {syncSettings.map(setting => (
                  <div key={setting.id} className="glass-panel p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-[200px]">
                      <div className={`p-2 rounded-lg ${setting.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                        <RefreshCw className={`w-5 h-5 ${setting.enabled ? 'animate-spin-slow' : ''}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold">{t(setting.entity)}</h4>
                        <p className="text-xs opacity-60">{setting.enabled ? t('Active') : t('Inactive')}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 flex-1 justify-end">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium opacity-60">{t('Sync Direction')}</label>
                        <div className="flex items-center gap-2 text-theme bg-transparent p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                          <select 
                            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                            value={setting.direction}
                            onChange={(e) => updateSyncSetting(setting.id, 'direction', e.target.value)}
                            disabled={!setting.enabled}
                          >
                            <option>{t('Two-way Sync')}</option>
                            <option>{t('Push to ERP')}</option>
                            <option>{t('Pull from ERP')}</option>
                          </select>
                          {setting.direction === 'Two-way Sync' && <ArrowLeftRight className="w-4 h-4 text-emerald-500" />}
                          {setting.direction === 'Push to ERP' && <ArrowRight className="w-4 h-4 text-blue-500" />}
                          {setting.direction === 'Pull from ERP' && <ArrowLeft className="w-4 h-4 text-orange-500" />}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium opacity-60">{t('Sync Frequency')}</label>
                        <div className="flex items-center gap-2 text-theme bg-transparent p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                          <select 
                            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                            value={setting.frequency}
                            onChange={(e) => updateSyncSetting(setting.id, 'frequency', e.target.value)}
                            disabled={!setting.enabled}
                          >
                            <option>{t('Real-time')}</option>
                            <option>{t('Every Hour')}</option>
                            <option>{t('Every Day')}</option>
                          </select>
                          <Clock className="w-4 h-4 text-gray-500" />
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={setting.enabled}
                          onChange={() => toggleSync(setting.id)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveOnly}
                  className="btn btn-primary flex items-center gap-2 px-6"
                >
                  {saving ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t('Save Changes')}
                </button>
              </div>
            </div>
          )}

          {/* Mapping Tab */}
          {activeTab === 'mapping' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {['Customers', 'Products', 'Orders', 'Invoices'].map(entity => (
                  <button
                    key={entity}
                    onClick={() => setActiveMappingEntity(entity)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      activeMappingEntity === entity
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {t(entity)}
                  </button>
                ))}
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">{t('Map Fields')} - {t(activeMappingEntity)}</h3>
                  <button onClick={addMapping} className="btn btn-sm btn-outline flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {t('Add Field')}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-sm font-medium opacity-60">
                    <div className="col-span-5">{t('Local Field')}</div>
                    <div className="col-span-2 text-center"><ArrowLeftRight className="w-4 h-4 mx-auto" /></div>
                    <div className="col-span-4">{t('ERP Field Key')}</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {(mappings[activeMappingEntity] || []).map(mapping => (
                    <div key={mapping.id} className="flex flex-col md:grid md:grid-cols-12 gap-4 items-center animate-in fade-in slide-in-from-left-2 duration-300 p-4 md:p-0 bg-gray-50/50 dark:bg-gray-800/50 md:bg-transparent rounded-xl md:rounded-none border md:border-0 border-gray-100 dark:border-gray-700">
                      <div className="w-full md:col-span-5">
                        <label className="md:hidden text-xs font-medium opacity-60 mb-1 block">{t('Local Field')}</label>
                        <input 
                          type="text" 
                          placeholder="e.g. name"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme bg-transparent outline-none focus:ring-1 focus:ring-emerald-500"
                          value={mapping.local}
                          onChange={(e) => updateMapping(mapping.id, 'local', e.target.value)}
                        />
                      </div>
                      <div className="hidden md:flex md:col-span-2 justify-center text-gray-400">
                        <ArrowLeftRight className="w-4 h-4" />
                      </div>
                      <div className="w-full md:col-span-4">
                        <label className="md:hidden text-xs font-medium opacity-60 mb-1 block">{t('ERP Field Key')}</label>
                        <input 
                          type="text" 
                          placeholder="e.g. customer_name"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-theme bg-transparent outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
                          value={mapping.erp}
                          onChange={(e) => updateMapping(mapping.id, 'erp', e.target.value)}
                        />
                      </div>
                      <div className="w-full md:col-span-1 text-right flex justify-end">
                        <button 
                          onClick={() => removeMapping(mapping.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="md:hidden ml-2 text-sm font-medium">Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {(!mappings[activeMappingEntity] || mappings[activeMappingEntity].length === 0) && (
                    <p className="text-center py-8 opacity-50 italic">{t('No fields mapped yet.')}</p>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveOnly}
                    className="btn btn-primary flex items-center gap-2 px-6"
                  >
                    {saving ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {t('Save Changes')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="glass-panel overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="p-4 font-medium text-sm">{t('Date')}</th>
                      <th className="p-4 font-medium text-sm">{t('Entity')}</th>
                      <th className="p-4 font-medium text-sm">{t('Action')}</th>
                      <th className="p-4 font-medium text-sm">{t('Status')}</th>
                      <th className="p-4 font-medium text-sm">{t('Message')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {logs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-4 text-center text-sm opacity-60"
                        >
                          {t('No data')}
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="p-4 text-sm font-mono opacity-80">{log.date}</td>
                          <td className="p-4 text-sm font-medium">{t(log.entity)}</td>
                          <td className="p-4 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              log.action === 'Import' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}>
                              {t(log.action)}
                            </span>
                          </td>
                          <td className="p-4">
                            {log.status === 'Success' ? (
                              <div className="flex items-center gap-1 text-emerald-600 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                <span>{t('Success')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>{t('Failed')}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-sm opacity-80">{log.message}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View for Logs */}
              <div className="md:hidden grid gap-4 p-4">
                {logs.length === 0 ? (
                  <div className="text-center text-theme py-8">{t('No data')}</div>
                ) : logs.map(log => (
                  <div key={log.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{log.date}</span>
                      {log.status === 'Success' ? (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          <span>{t('Success')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          <span>{t('Failed')}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">{t(log.entity)}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.action === 'Import' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      }`}>
                        {t(log.action)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                      {log.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    
  )
}
