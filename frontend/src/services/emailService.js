import { api } from '@utils/api'

export const getLeadEmailMessages = async (leadId) => {
  const res = await api.get(`/api/v1/leads/${leadId}/email-messages`)
  return res?.data || []
}

export const sendEmailText = async ({ lead_id, recipient_email, subject, body }) => {
  const res = await api.post('/api/v1/email/send', { lead_id, recipient_email, subject, body })
  return res?.data
}

export const emailService = {
  getLeadEmailMessages,
  sendEmailText,
}
