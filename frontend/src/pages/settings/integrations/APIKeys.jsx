import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Key, 
  Plus, 
  Shield, 
  Clock, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Copy 
} from 'lucide-react'

import { toast } from 'react-hot-toast'
import { getApiKeys, createApiKey, revokeApiKey } from '../../../services/apiKeysService'
import { useTheme } from '@shared/context/ThemeProvider'

export default function APIKeys() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { t } = useTranslation()
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState(null)
  
  // Form State
  const [newKeyName, setNewKeyName] = useState('')
  const [permissions, setPermissions] = useState('read')
  const [expiration, setExpiration] = useState('never')
  const [generatedToken, setGeneratedToken] = useState('')

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    try {
      setLoading(true)
      const data = await getApiKeys()
      const list = Array.isArray(data) ? data : []
      setKeys(list)
    } catch (error) {
      const message = error?.response?.data?.message || t('Failed to fetch API keys')
      toast.error(message)
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) return

    try {
      const res = await createApiKey({ name: newKeyName, permissions, expiration })
      setGeneratedToken(res.token)
      setKeys(prev => [res.key, ...prev])
      
      setIsCreateModalOpen(false)
      setIsTokenModalOpen(true)
      setNewKeyName('')
      setPermissions('read')
      setExpiration('never')
      toast.success(t('API Key created successfully'))
    } catch (error) {
      const message = error?.response?.data?.message || t('Failed to create API key')
      toast.error(message)
    }
  }

  const handleRevoke = async (id) => {
    setConfirmConfig({
      id,
      open: true,
    })
  }

  const copyToken = () => {
    navigator.clipboard.writeText(generatedToken)
    toast.success(t('Token copied to clipboard'))
  }

  const confirmAndRevoke = async () => {
    if (!confirmConfig || !confirmConfig.id) return
    try {
      await revokeApiKey(confirmConfig.id)
      setKeys(prev => prev.filter(k => k.id !== confirmConfig.id))
      toast.success(t('API Key revoked successfully'))
    } catch (error) {
      const message = error?.response?.data?.message || t('Failed to revoke API key')
      toast.error(message)
    } finally {
      setConfirmConfig(null)
    }
  }

  return (
    <div className="p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
          <h1 className="text-3xl font-bold text-theme">
            {t('API Integrations')}
          </h1>
        </div>
        <p className={`${isLight ? 'text-black' : 'text-white'} opacity-60 ml-4`}>
          {t('Manage your personal access tokens')}
        </p>
      </div>

      {/* Main Content */}
      <div className="card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-500" />
            <h2 className="font-semibold text-lg">{t('API Keys')}</h2>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('Create New Key')}
          </button>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('Key Name')}</th>
                <th className="px-6 py-4 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('Token')}</th>
                <th className="px-6 py-4 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('Last Used')}</th>
                <th className="px-6 py-4 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('Created')}</th>
                <th className="px-6 py-4 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('Expires')}</th>
                <th className="px-6 py-4 text-end text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-theme">
                    {t('Loading...')}
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-theme">
                    <div className="flex flex-col items-center gap-2">
                      <Key className="w-8 h-8 opacity-20" />
                      <p>{t('No API keys found')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                          <Shield className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{key.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500 dark:text-gray-400">
                      {key.token || '••••••••••••••••'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {key.last_used_at ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(key.last_used_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{t('Never')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {key.expires_at
                        ? new Date(key.expires_at).toLocaleDateString()
                        : (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                            {t('Never')}
                          </span>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-end">
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title={t('Revoke')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View for API Keys */}
        <div className="md:hidden grid gap-4 p-4">
          {loading ? (
            <div className="p-8 text-center text-theme">{t('Loading...')}</div>
          ) : keys.length === 0 ? (
            <div className="p-8 text-center text-theme bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <div className="flex flex-col items-center gap-2">
                <Key className="w-8 h-8 opacity-20" />
                <p>{t('No API keys found')}</p>
              </div>
            </div>
          ) : (
            keys.map((key) => (
              <div key={key.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-800 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base">{key.name}</h4>
                      <p className="text-xs text-theme font-mono mt-0.5 break-all">{key.token || '••••••••••••••••'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(key.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title={t('Revoke')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col gap-1">
                    <span className="opacity-70 font-medium text-theme">{t('Created')}</span>
                    <span className="font-medium text-theme">{new Date(key.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <span className="opacity-70 font-medium text-theme">{t('Last Used')}</span>
                    <span className="font-medium text-theme">
                      {key.last_used_at ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {new Date(key.last_used_at).toLocaleDateString()}
                        </div>
                      ) : (
                        t('Never')
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="opacity-70 font-medium text-theme">{t('Expires')}</span>
                    <span className="font-medium text-theme">
                      {key.expires_at
                        ? new Date(key.expires_at).toLocaleDateString()
                        : t('Never')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Key Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black backdrop-blur-sm animate-in fade-in duration-200">
          <div className="card rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold">{t('Create New Key')}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Key Name')}</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Mobile App"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Permissions')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`relative flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      permissions === 'read'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-gray-700/60 bg-black/10 text-gray-200'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{t('Read Only')}</span>
                    </div>
                    <span
                      className={`w-4 h-4 rounded-full border ${
                        permissions === 'read'
                          ? 'bg-indigo-500 border-indigo-300'
                          : 'border-gray-500'
                      }`}
                    />
                    <input
                      type="radio"
                      name="permissions"
                      value="read"
                      checked={permissions === 'read'}
                      onChange={(e) => setPermissions(e.target.value)}
                      className="hidden"
                    />
                  </label>
                  <label
                    className={`relative flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      permissions === 'read_write'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-gray-700/60 bg-black/10 text-gray-200'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{t('Read & Write')}</span>
                    </div>
                    <span
                      className={`w-4 h-4 rounded-full border ${
                        permissions === 'read_write'
                          ? 'bg-indigo-500 border-indigo-300'
                          : 'border-gray-500'
                      }`}
                    />
                    <input
                      type="radio"
                      name="permissions"
                      value="read_write"
                      checked={permissions === 'read_write'}
                      onChange={(e) => setPermissions(e.target.value)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Expiration')}</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="expiration"
                      value="never"
                      checked={expiration === 'never'}
                      onChange={(e) => setExpiration(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">{t('Never')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="expiration"
                      value="30d"
                      checked={expiration === '30d'}
                      onChange={(e) => setExpiration(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">{t('30 Days')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="expiration"
                      value="90d"
                      checked={expiration === '90d'}
                      onChange={(e) => setExpiration(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">{t('90 Days')}</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!newKeyName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success/Token Modal */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle className="w-8 h-8" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('Key Created Successfully')}</h3>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg flex gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{t('Make sure to copy your token')}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-theme">{t('Generated Token')}</label>
              <div className="flex gap-2">
                <code className="flex-1 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg font-mono text-sm break-all text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-gray-700">
                  {generatedToken}
                </code>
                <button
                  onClick={copyToken}
                  className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                  title={t('Copy')}
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsTokenModalOpen(false)}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity font-medium"
            >
              {t('Close')}
            </button>
          </div>
        </div>
      )}

      {confirmConfig?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('Are you sure you want to revoke this key?')}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('This action cannot be undone and the API key will stop working immediately.')}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmConfig(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={confirmAndRevoke}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                {t('Revoke')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
