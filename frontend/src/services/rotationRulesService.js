import { api } from '@utils/api'

export const getRotationRules = async (params = {}) => {
  const res = await api.get('/api/rotation-rules', { params })
  return res?.data
}

export const createRotationRule = async (payload) => {
  const res = await api.post('/api/rotation-rules', payload)
  return res?.data
}

export const updateRotationRule = async (id, payload) => {
  const res = await api.put(`/api/rotation-rules/${id}`, payload)
  return res?.data
}

export const deleteRotationRule = async (id) => {
  const res = await api.delete(`/api/rotation-rules/${id}`)
  return res?.data
}

export const rotationRulesService = {
  getRotationRules,
  createRotationRule,
  updateRotationRule,
  deleteRotationRule,
}

