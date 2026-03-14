import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    try {
      const qs = window.location.search && window.location.search.length > 1
        ? window.location.search
        : (window.location.hash && window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '')
      const params = new URLSearchParams(qs)
      const token = params.get('token')
      const next = params.get('next') || '/dashboard'
      if (token) {
        window.localStorage.setItem('token', token)
        try {
          const host = window.location.hostname
          const parts = host.split('.')
          if (parts[0] === 'www') parts.shift()
          // Fix for .test domains and general 2-part domains (e.g. alisraa.test)
          const domain = parts.includes('localhost') ? '.localhost' : (parts.length > 1 ? '.' + parts.slice(-2).join('.') : '')
          if (domain) {
            const maxAge = 7 * 24 * 60 * 60
            document.cookie = `token=${encodeURIComponent(token)};path=/;domain=${domain};max-age=${maxAge};SameSite=Lax`
          }
        } catch {}
        if (typeof window !== 'undefined') {
          const path = next.startsWith('/') ? next : `/${next}`
          window.location.href = `/#${path}`
        } else {
          navigate(next, { replace: true })
        }
      } else {
        navigate('/login', { replace: true })
      }
    } catch {
      navigate('/login', { replace: true })
    }
  }, [navigate])
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}
