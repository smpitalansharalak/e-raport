/* eslint-disable no-control-regex */
const toAsciiNumber = (raw) =>
  String(raw ?? '')
    .normalize('NFKC')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, '')
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\uFFFC]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')

export function sanitizeScoreTyping(value) {
  let text = toAsciiNumber(value).replace(/,/g, '.')
  text = text.replace(/[^0-9.-]/g, '')

  const minus = text.startsWith('-') ? '-' : ''
  text = text.replace(/-/g, '')
  const parts = text.split('.')
  const head = parts.shift() ?? ''
  const tail = parts.join('')
  text = head + (tail ? `.${tail}` : '')
  return minus + text
}

export function clampScore(value) {
  const n = Number(String(value ?? '').trim())
  if (!Number.isFinite(n)) return ''
  return String(Math.min(100, Math.max(0, n)))
}

export function normalizeScorePaste(raw) {
  const text = toAsciiNumber(raw).replace(/,/g, '.')
  const match = text.match(/-?\d+(?:\.\d+)?/)
  if (!match) return ''
  return clampScore(match[0])
}

export function parseScoreList(raw) {
  const text = toAsciiNumber(raw).replace(/,/g, '.')
  const matches = text.match(/-?\d+(?:\.\d+)?/g) ?? []
  return matches.map((value) => clampScore(value))
}

export function applySanitizedNumberPaste(event, value, onChange, { integer = false } = {}) {
  const raw = event.clipboardData?.getData('text/plain')
  if (typeof raw !== 'string' || raw === '') return false

  event.preventDefault()
  const single = normalizeScorePaste(raw)
  if (single === '' && parseScoreList(raw).length === 0) return true
  onChange(integer ? single.replace(/\..*$/, '') : single)
  return true
}