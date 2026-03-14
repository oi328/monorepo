import { api } from '@utils/api'

export const getSmtpSettings = async () => {
  const res = await api.get('/api/smtp-settings')
  return res?.data
}

export const updateSmtpSettings = async (settings) => {
  const res = await api.put('/api/smtp-settings', settings)
  return res?.data
}

export const testSmtpConnection = async (credentials) => {
  const res = await api.post('/api/smtp-settings/test', credentials)
  return res?.data
}
