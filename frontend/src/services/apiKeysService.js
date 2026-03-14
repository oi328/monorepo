import { api } from '@utils/api'

// For now, we assume these endpoints exist. 
// If backend implementation is pending, these will return 404 or 500.

const extractApiData = (res) => {
  if (res && res.data && Object.prototype.hasOwnProperty.call(res.data, 'data')) {
    return res.data.data
  }
  return res?.data
}

const normalizeApiError = (error, fallbackMessage) => {
  if (error && error.response) {
    const message = error.response.data?.message || fallbackMessage
    return { type: 'api', message }
  }
  if (error && error.request) {
    return { type: 'network', message: 'Network error. Please check your connection.' }
  }
  return { type: 'unknown', message: fallbackMessage }
}

export const getApiKeys = async () => {
  try {
    const res = await api.get('/api/api-keys')
    return extractApiData(res)
  } catch (error) {
    const info = normalizeApiError(error, 'Failed to fetch API keys')
    console.error('Failed to fetch API keys:', info, error)
    throw error
  }
}

export const createApiKey = async (data) => {
  try {
    const res = await api.post('/api/api-keys', data)
    return extractApiData(res)
  } catch (error) {
    const info = normalizeApiError(error, 'Failed to create API key')
    console.error('Failed to create API key:', info, error)
    throw error
  }
}

export const revokeApiKey = async (id) => {
  try {
    const res = await api.delete(`/api/api-keys/${id}`)
    return extractApiData(res)
  } catch (error) {
    const info = normalizeApiError(error, 'Failed to revoke API key')
    console.error('Failed to revoke API key:', info, error)
    throw error
  }
}
