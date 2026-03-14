import { api } from '@utils/api'

export const getSmsSettings = async () => {
  const res = await api.get('/api/sms-settings')
  return res?.data
}

export const updateSmsSettings = async (settings) => {
  const res = await api.put('/api/sms-settings', settings)
  return res?.data
}

export const testSmsSettings = async (settings) => {
  const res = await api.post('/api/sms-settings/test', settings)
  return res?.data
}

export const getSmsTemplates = async () => {
  const res = await api.get('/api/sms-templates')
  return res?.data
}

export const createSmsTemplate = async (template) => {
  const res = await api.post('/api/sms-templates', template)
  return res?.data
}

export const updateSmsTemplate = async (id, template) => {
  const res = await api.put(`/api/sms-templates/${id}`, template)
  return res?.data
}

export const deleteSmsTemplate = async (id) => {
  const res = await api.delete(`/api/sms-templates/${id}`)
  return res?.data
}
