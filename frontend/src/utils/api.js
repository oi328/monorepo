import axios from 'axios'

const apiDebugEnabled = String(import.meta.env.VITE_API_DEBUG || (import.meta.env.DEV ? 'true' : 'false')).toLowerCase() === 'true'

const resolveTenantSlugFromHost = () => {
  if (typeof window === 'undefined') return null
  const host = String(window.location.hostname || '').toLowerCase()
  const parts = host.split('.')
  if (parts.length <= 2) return null
  const candidate = parts[0]
  if (!candidate || candidate === 'www' || candidate === 'api') return null
  return candidate
}

const getApiBaseUrl = () => {
  const raw = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '').trim()
  if (raw) return raw.replace(/\/+$/, '')
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/api`
}

const sanitizePayload = (data) => {
  if (data == null) return data
  try {
    const cloned = JSON.parse(JSON.stringify(data))
    const redactKeys = ['password', 'token', 'authorization']
    const walk = (obj) => {
      if (!obj || typeof obj !== 'object') return
      for (const key of Object.keys(obj)) {
        if (redactKeys.includes(String(key).toLowerCase())) {
          obj[key] = '[REDACTED]'
        } else {
          walk(obj[key])
        }
      }
    }
    walk(cloned)
    return cloned
  } catch {
    return '[Unserializable]'
  }
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (config.url) {
    const hasApiSuffixInBase = /\/api\/?$/.test(String(config.baseURL || ''))

    // Prevent /api/api double prefix when callers use "/api/..." while baseURL already ends with /api
    if (hasApiSuffixInBase && config.url.startsWith('/api/')) {
      config.url = config.url.substring(4)
    }

    if (hasApiSuffixInBase && config.url.startsWith('api/')) {
      config.url = config.url.substring(3)
    }

    if (!config.url.startsWith('/')) {
      config.url = '/' + config.url
    }
  }

  const token = window.localStorage.getItem('token') || window.sessionStorage.getItem('token')
  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const tenantSlug = resolveTenantSlugFromHost()
  if (tenantSlug && !config.headers?.['X-Tenant-Id'] && !config.headers?.['X-Tenant']) {
    config.headers['X-Tenant-Id'] = tenantSlug
  }

  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData
  if (isFormData) {
    try {
      if (typeof config.headers?.delete === 'function') {
        config.headers.delete('Content-Type')
        config.headers.delete('content-type')
      } else if (config.headers) {
        delete config.headers['Content-Type']
        delete config.headers['content-type']
      }
    } catch {
    }
  }

  if (apiDebugEnabled) {
    let fullUrl = `${config.baseURL || ''}${config.url || ''}`
    try {
      fullUrl = new URL(config.url || '', config.baseURL || window.location.origin).toString()
    } catch {
    }
    console.info('API REQUEST', {
      url: fullUrl,
      method: config.method,
      headers: config.headers,
      data: isFormData ? '[FormData]' : sanitizePayload(config.data),
      origin: window.location.origin,
      apiBase: config.baseURL,
    })
  }

  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (apiDebugEnabled) {
      console.warn('API ERROR', {
        url: err?.config?.url,
        method: err?.config?.method,
        status: err?.response?.status,
        data: sanitizePayload(err?.response?.data),
      })
    }
    return Promise.reject(err)
  }
)

export const logExportEvent = async ({ module, fileName, format }) => {
  try {
    await api.post('/api/exports', {
      module: module || 'Unknown',
      action: 'export',
      file_name: fileName || 'export',
      format: format || 'unknown',
    })
  } catch {
  }
}

export const logImportEvent = async ({ module, fileName, format, count, status, errorMessage, metaData }) => {
  try {
    const derivedMeta = {
      ...(typeof metaData === 'object' && metaData ? metaData : {}),
    }
    if (typeof count === 'number') {
      derivedMeta.count = count
    }
    // Imports report reads from legacy exports log with `action=import`.
    await api.post('/api/exports', {
      module: module || 'Unknown',
      action: 'import',
      file_name: fileName || 'import',
      format: format || 'unknown',
      status: status || undefined,
      error_message: errorMessage || undefined,
      meta_data: Object.keys(derivedMeta).length ? derivedMeta : undefined,
    })
  } catch {
  }
}

export const getApiUrl = () => api.defaults.baseURL || getApiBaseUrl()
