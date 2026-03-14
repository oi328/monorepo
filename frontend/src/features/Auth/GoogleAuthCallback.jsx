import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function GoogleAuthCallback() {
  const { t } = useTranslation()

  useEffect(() => {
    // Extract query parameters from search or hash
    let search = window.location.search
    if (!search && window.location.hash.includes('?')) {
      search = '?' + window.location.hash.split('?')[1]
    }
    
    const params = new URLSearchParams(search)
    const code = params.get('code')
    let state = params.get('state')
    const error = params.get('error')

    if (error) {
      window.location.href = '/#/settings/integrations/google-slack?status=error&message=' + encodeURIComponent(error)
      return
    }

    if (code) {
       // Fix: Ensure state is properly formatted (restore + if turned to space)
       // Base64 strings don't have spaces, so any space is likely a decoded +
       if (state) {
         state = state.replace(/ /g, '+')
       }

       // Construct backend URL
       // We use the configured API URL or default to the known API domain
       // Based on .env, backend is at https://api.besouholacrm.net
       const backendBase = 'https://api.besouholacrm.net' 
       const backendUrl = `${backendBase}/api/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`
       
       // Redirect to backend to complete the OAuth exchange
       window.location.href = backendUrl
    } else {
       // No code found, redirect to login or dashboard
       window.location.href = '/#/dashboard'
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600 dark:text-gray-300 font-medium">
        {t('Connecting to Google... Please wait.')}
      </p>
    </div>
  )
}
