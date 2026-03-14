export const canAssignNow = (now = new Date()) => {
  try {
    const raw = window.localStorage.getItem('rotationSettings')
    const prefs = raw ? JSON.parse(raw) : null
    if (!prefs) return { ok: true }

    if (prefs.allowAssignRotation === false) {
      return { ok: false, reason: 'Rotation disabled' }
    }

    const parseHM = (t) => {
      const [h, m] = String(t || '00:00').split(':').map(x => parseInt(x, 10))
      return h * 60 + m
    }
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const from = parseHM(prefs.workFrom)
    const to = parseHM(prefs.workTo)
    if (currentMinutes < from || currentMinutes > to) {
      return { ok: false, reason: 'Outside working hours' }
    }

    if (prefs.delayAssignRotation === true) {
      return { ok: false, reason: 'Delayed assignment enabled' }
    }

    return { ok: true }
  } catch {
    return { ok: true }
  }
}
