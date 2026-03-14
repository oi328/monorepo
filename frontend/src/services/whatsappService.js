import { api } from '@utils/api'

export const getWhatsappSettings = async () => {
  const res = await api.get('/api/whatsapp-settings')
  return res?.data
}

export const updateWhatsappSettings = async (settings) => {
  const res = await api.put('/api/whatsapp-settings', settings)
  return res?.data
}

export const getWhatsappTemplates = async () => {
  const res = await api.get('/api/whatsapp-templates')
  return res?.data
}

export const createWhatsappTemplate = async (template) => {
  const res = await api.post('/api/whatsapp-templates', template)
  return res?.data
}

export const updateWhatsappTemplate = async (id, template) => {
  const res = await api.put(`/api/whatsapp-templates/${id}`, template)
  return res?.data
}

export const deleteWhatsappTemplate = async (id) => {
  const res = await api.delete(`/api/whatsapp-templates/${id}`)
  return res?.data
}

export const sendWhatsappTest = async ({ to, template, language = 'en' }) => {
  const res = await api.post('/api/whatsapp/send-test', { to, template, language })
  return res?.data
}

export const getWhatsappMessages = async () => {
  const res = await api.get('/api/whatsapp/messages')
  return res?.data || []
}

export const getLeadWhatsappMessages = async (leadId) => {
  const res = await api.get(`/api/v1/leads/${leadId}/whatsapp-messages`)
  return res?.data || []
}

export const sendWhatsappTemplate = async ({ recipient_number, template_name, variables }) => {
  const res = await api.post('/api/v1/whatsapp/send-template', { recipient_number, template_name, variables })
  return res?.data
}

export const sendWhatsappText = async ({ recipient_number, message_body }) => {
  const res = await api.post('/api/v1/whatsapp/send-text', { recipient_number, message_body })
  return res?.data
}

export const whatsappService = {
  loadSettings: getWhatsappSettings,
  saveSettings: updateWhatsappSettings,
  resetSettings: async () => {}, // No-op or api call if needed
  simulateMessage: (settings) => {
    return {
      messaging_product: 'whatsapp',
      to: settings.testPhone || '+201000000000',
      type: 'template',
      template: {
        name: 'hello_world',
        language: { code: 'en_US' }
      }
    }
  },
  sendTestMessage: async (payload) => {
    const to = payload?.to
    const template = payload?.template?.name || 'hello_world'
    const language = payload?.template?.language?.code?.slice(0,2) || 'en'
    const j = await sendWhatsappTest({ to, template, language })
    return j
  },
  getLeadWhatsappMessages,
  sendWhatsappTemplate,
  sendWhatsappText,
}
