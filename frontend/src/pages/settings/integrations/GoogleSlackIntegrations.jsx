import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../../utils/api'
import { 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Mail, 
  Trash2, 
  ExternalLink 
} from 'lucide-react'

export default function GoogleSlackIntegrations() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(searchParams.get('message') || null)
  const [success, setSuccess] = useState(searchParams.get('status') === 'success')

  useEffect(() => {
    fetchStatus()
  }, [])

  // Clear URL params after reading
  useEffect(() => {
    if (searchParams.get('status') || searchParams.get('message')) {
      // Remove params without reloading
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('status')
      newParams.delete('message')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/auth/google/status')
      setStatus(data)
    } catch (err) {
      console.error('Failed to fetch status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setConnecting(true)
      setError(null)
      const { data } = await api.get('/auth/google/redirect')
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Failed to get redirect URL')
        setConnecting(false)
      }
    } catch (err) {
      console.error('Failed to start connection:', err)
      setError(err.response?.data?.message || 'Failed to start connection')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect? This will stop Gmail sync and Google Ads integration.')) {
      return
    }

    try {
      setLoading(true)
      await api.post('/auth/google/disconnect')
      setStatus(null)
      setSuccess(false)
      fetchStatus()
    } catch (err) {
      console.error('Failed to disconnect:', err)
      setError(err.response?.data?.message || 'Failed to disconnect')
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Integrations</h1>
        <p className="text-[var(--muted-text)]">Manage your connections with third-party services.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-3 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{decodeURIComponent(error)}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-3 border border-green-200 dark:border-green-800">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p>Successfully connected to Google!</p>
        </div>
      )}

      <div className="grid gap-6">
        {/* Google Integration Card */}
        <div className="card rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 p-2">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Google Workspace & Ads</h2>
                <p className="text-sm text-[var(--muted-text)]">
                  Connect Gmail for email sync and Google Ads for campaign management.
                </p>
              </div>
            </div>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            ) : status?.connected ? (
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                Connected
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm font-medium">
                Not Connected
              </span>
            )}
          </div>

          {!loading && (
            <div className="space-y-6">
              {status?.connected ? (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--muted-text)]">Connected Account</span>
                    <span className="font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {status.google_email || 'Unknown Email'}
                    </span>
                  </div>
                  {status.customer_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-text)]">Google Ads Customer ID</span>
                      <span className="font-medium">{status.customer_id}</span>
                    </div>
                  )}
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Disconnect Account
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Connect your Google Account
                    </h3>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Enable 2-way email sync with Gmail and manage your Google Ads campaigns directly from the CRM.
                    </p>
                  </div>
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="whitespace-nowrap flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Connect Google
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Slack Integration Placeholder */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm opacity-60">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 p-2">
                <img src="https://cdn.icon-icons.com/icons2/2699/PNG/512/slack_logo_icon_169752.png" alt="Slack" className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Slack</h2>
                <p className="text-sm text-[var(--muted-text)]">
                  Receive notifications and updates in your Slack channels.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full text-sm font-medium">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
