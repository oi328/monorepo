import { api } from '@utils/api'

export const getErpSettings = async () => {
  const res = await api.get('/api/erp-settings')
  return res?.data
}

export const updateErpSettings = async (settings) => {
  const res = await api.put('/api/erp-settings', settings)
  return res?.data
}

export const testErpConnection = async (settings) => {
  const res = await api.post('/api/erp-settings/test', settings)
  return res?.data
}

export const getErpSyncLogs = async (params = {}) => {
  const res = await api.get('/api/erp-sync-logs', { params })
  return res?.data
}
