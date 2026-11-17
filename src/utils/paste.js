import { sanitizePastedText } from '@/utils/text'

/**
 * Sisipkan teks clipboard yang sudah dibersihkan ke posisi kursor input.
 * Kembalikan true jika berhasil menangani paste.
 */
export function applySanitizedPaste(event, value, onChange, options = {}) {
  const raw = event.clipboardData?.getData('text/plain')
  if (typeof raw !== 'string' || raw === '') return false

  event.preventDefault()
  const input = event.currentTarget
  const start = Number.isFinite(input.selectionStart) ? input.selectionStart : String(value ?? '').length
  const end = Number.isFinite(input.selectionEnd) ? input.selectionEnd : String(value ?? '').length
  const clean = sanitizePastedText(raw, options)
  const next = String(value ?? '').slice(0, start) + clean + String(value ?? '').slice(end)

  onChange(next)
  return true
}

export function getPastedText(event) {
  return event.clipboardData?.getData('text/plain') ?? ''
}