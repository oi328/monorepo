const splitPhoneSegments = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return []
  return raw
    .split('/')
    .map((s) => String(s || '').trim())
    .filter(Boolean)
}

const stripMetaSuffix = (segment) => {
  const s = String(segment || '').trim()
  if (!s) return ''
  const parts = s.split('_')
  if (parts.length < 2) return s
  const last = parts[parts.length - 1]
  if (/^\d{6,}$/.test(String(last || ''))) {
    return parts.slice(0, -1).join('_').trim()
  }
  return s
}

const normalizeCountryCode = (code) => {
  const raw = String(code || '').trim()
  if (!raw) return ''
  if (raw.startsWith('+')) return raw
  if (raw.startsWith('00')) return '+' + raw.slice(2)
  if (/^\d+$/.test(raw)) return '+' + raw
  return raw
}

const getCountryDigits = (code) => {
  const c = normalizeCountryCode(code)
  const digits = String(c).replace(/[^0-9]/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) return digits.slice(2)
  return digits
}

const normalizeSegmentForDisplay = (segment, defaultCountryCode) => {
  const s0 = stripMetaSuffix(segment)
  const s = String(s0 || '').trim()
  if (!s) return ''

  if (s.startsWith('+') || s.startsWith('00')) return s

  const digits = String(s).replace(/[^0-9]/g, '')
  const cc = getCountryDigits(defaultCountryCode)
  if (cc && digits.startsWith(cc) && digits.length >= cc.length + 7) {
    return `+${digits}`
  }

  const code = normalizeCountryCode(defaultCountryCode)
  if (!code) return s
  return `${code} ${s}`
}

function maskDigits(digits) {
  const d = String(digits || '').replace(/[^0-9]/g, '')
  if (!d) return ''
  if (d.length <= 3) return d
  return d.slice(0, 3) + '*'.repeat(Math.max(0, d.length - 3))
}

function maskSegment(segment) {
  const s = String(segment || '').trim()
  if (!s) return ''

  const tokens = s.split(/\s+/).filter(Boolean)
  const first = tokens[0] || ''
  const rest = tokens.slice(1).join(' ')

  if ((first.startsWith('+') || first.startsWith('00')) && rest) {
    return `${first} ${maskDigits(rest)}`
  }

  return maskDigits(s)
}

export const getPhoneDigits = (value, { defaultCountryCode = '+20' } = {}) => {
  const seg = splitPhoneSegments(value)[0] || ''
  const normalized = normalizeSegmentForDisplay(seg, defaultCountryCode)
  if (!normalized) return ''

  let digits = String(normalized).replace(/[^0-9]/g, '')
  if (!digits) return ''
  if (String(normalized).trim().startsWith('00')) digits = digits.replace(/^00/, '')

  const cc = getCountryDigits(defaultCountryCode)
  if (cc && !String(normalized).trim().startsWith('+') && !String(normalized).trim().startsWith('00')) {
    const localDigits = String(stripMetaSuffix(seg)).replace(/[^0-9]/g, '')
    if (localDigits.startsWith('0')) return cc + localDigits.slice(1)
    return cc + localDigits
  }

  return digits
}

export const getPhoneLines = (value, { showFull = false, defaultCountryCode = '+20' } = {}) => {
  const segments = splitPhoneSegments(value)
  return segments.map((seg) => {
    const normalized = normalizeSegmentForDisplay(seg, defaultCountryCode)
    const display = showFull ? normalized : maskSegment(normalized)
    const digits = getPhoneDigits(seg, { defaultCountryCode })
    return { display, digits }
  }).filter((x) => x.display)
}

export const maskPhoneForDisplay = (value) => {
  const segments = splitPhoneSegments(value)
  if (segments.length === 0) return ''
  return segments.map(maskSegment).join(' / ')
}

export const formatPhoneForDisplay = (value, { showFull = false, defaultCountryCode = '+20' } = {}) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const normalized = splitPhoneSegments(raw).map((s) => normalizeSegmentForDisplay(s, defaultCountryCode)).filter(Boolean).join(' / ')
  if (showFull) return normalized
  return maskPhoneForDisplay(normalized)
}
