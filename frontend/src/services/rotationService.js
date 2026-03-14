import { api } from '@utils/api'

export const getRotationSettings = async () => {
  const res = await api.get('/api/rotation-settings')
  return res?.data
}

export const updateRotationSettings = async (settings) => {
  const res = await api.put('/api/rotation-settings', settings)
  return res?.data
}

export const preloadRotationSettings = async () => {
  try {
    const data = await getRotationSettings()
    if (data) {
      window.localStorage.setItem('rotationSettings', JSON.stringify({
        allowAssignRotation: !!data.allow_assign_rotation,
        delayAssignRotation: !!data.delay_assign_rotation,
        workFrom: data.work_from || '00:00',
        workTo: data.work_to || '23:59',
        reshuffleColdLeads: !!data.reshuffle_cold_leads,
        reshuffleColdLeadsNumber: Number(data.reshuffle_cold_leads_number || 0),
      }))
    }
  } catch {}
}

export const rotationService = {
  getRotationSettings,
  updateRotationSettings,
  preloadRotationSettings,
}
