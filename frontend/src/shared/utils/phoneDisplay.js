const splitPhoneSegments = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return []
  return raw
    .split('/')
    .map((s) => String(s || '').trim())
    .filter(Boolean)
}

const maskDigits = (digits) => {
  const d = String(digits || '').replace(/[^0-9]/g, '')
  if (!d) return ''
  if (d.length <= 3) return d
  return d.slice(0, 3) + '*'.repeat(Math.max(0, d.length - 3))
}

const maskSegment = (segment) => {
  const s = String(segment || '').trim()
  if (!s) return ''

  // Try to preserve a leading country code token like "+20" when present.
  const tokens = s.split(/\s+/).filter(Boolean)
  const first = tokens[0] || ''
  const rest = tokens.slice(1).join(' ')

  if ((first.startsWith('+') || first.startsWith('00')) && rest) {
    return `${first} ${maskDigits(rest)}`
  }

  return maskDigits(s)
}

export const maskPhoneForDisplay = (value) => {
  const segments = splitPhoneSegments(value)
  if (segments.length === 0) return ''
  return segments.map(maskSegment).join(' / ')
}

export const formatPhoneForDisplay = (value, { showFull = false } = {}) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (showFull) return raw
  return maskPhoneForDisplay(raw)
}

