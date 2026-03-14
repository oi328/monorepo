import { api } from '@utils/api'

export const getEmailTemplates = async () => {
  const res = await api.get('/api/email-templates')
  return res?.data || []
}

export const createEmailTemplate = async (tpl) => {
  const res = await api.post('/api/email-templates', tpl)
  return res?.data
}

export const updateEmailTemplate = async (id, tpl) => {
  const res = await api.put(`/api/email-templates/${id}`, tpl)
  return res?.data
}

export const deleteEmailTemplate = async (id) => {
  const res = await api.delete(`/api/email-templates/${id}`)
  return res?.data
}

export const emailTemplateService = {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
}
