import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getSmsSettings, updateSmsSettings } from '../../services/smsService'
import { toast } from 'react-hot-toast'
import { Plug, Save, RefreshCw, Key, MessageSquare } from 'lucide-react'

export default function SmsConnection() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('idle') // idle, success, error

  const [formData, setFormData] = useState({
    provider: 'Twilio',
    sender_id: '',
    api_key: '',
    api_secret: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const settings = await getSmsSettings()
      if (settings) {
        setFormData({
          provider: settings.provider || 'Twilio',
          sender_id: settings.sender_id || '',
          api_key: settings.api_key || '',
          api_secret: settings.api_secret || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch SMS settings:', error)
      toast.error(t('Failed to load settings'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Reset connection status on change
    if (connectionStatus !== 'idle') setConnectionStatus('idle')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateSmsSettings(formData)
      toast.success(t('Settings saved successfully'))
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error(t('Failed to save settings'))
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setConnectionStatus('idle')
    
    // Simulate connection test
    // In a real app, you might call a backend endpoint like /api/sms/test-connection
    setTimeout(() => {
      if (formData.api_key && formData.api_secret) {
        setConnectionStatus('success')
        toast.success(t('Connection successful'))
      } else {
        setConnectionStatus('error')
        toast.error(t('Connection failed: Missing credentials'))
      }
      setTesting(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-panel rounded-2xl p-6 border border-gray-200 dark:border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <Plug className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-theme-text">{t('Gateway Configuration')}</h3>
            <p className="text-sm opacity-60 text-theme-text">{t('Configure your SMS provider connection details')}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-theme mb-2">
                {t('SMS Provider')}
              </label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-theme-text bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="Twilio">Twilio</option>
                <option value="Nexmo">Nexmo (Vonage)</option>
                <option value="MessageBird">MessageBird</option>
                <option value="Infobip">Infobip</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme mb-2">
                {t('Sender ID')}
              </label>
              <input
                type="text"
                name="sender_id"
                value={formData.sender_id}
                onChange={handleInputChange}
                placeholder="e.g. MyCompany"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-theme-text bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <p className="text-[10px] opacity-50 mt-1 text-theme-text ml-1">
                {t('The name or number that appears as the sender')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme mb-2">
                {t('API Key / SID')}
              </label>
              <input
                type="password"
                name="api_key"
                value={formData.api_key}
                onChange={handleInputChange}
                placeholder="••••••••••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-theme-text bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme mb-2">
                {t('API Secret / Token')}
              </label>
              <input
                type="password"
                name="api_secret"
                value={formData.api_secret}
                onChange={handleInputChange}
                placeholder="••••••••••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-theme-text bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Connection Status Indicator */}
          {connectionStatus !== 'idle' && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
              connectionStatus === 'success' 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {connectionStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {t('Connection established successfully')}
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  {t('Failed to establish connection. Please check your credentials.')}
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !formData.api_key}
              className={`btn btn-glass flex items-center gap-2 ${testing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {testing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plug className="w-4 h-4" />
              )}
              {t('Test Connection')}
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className={`btn btn-primary flex items-center gap-2 px-6 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {t('Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
