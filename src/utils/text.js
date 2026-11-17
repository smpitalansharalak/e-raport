/* eslint-disable no-control-regex, no-misleading-character-class */
const UNICODE_SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g
const INVISIBLE_CHARS =
  /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\uFFFC]/g
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g

function stripHiddenChars(str) {
  return String(str ?? '')
    .normalize('NFKC')
    .replace(UNICODE_SPACES, ' ')
    .replace(INVISIBLE_CHARS, '')
    .replace(CONTROL_CHARS, '')
    .replace(/\r\n|\r/g, '\n')
}

/**
 * Membersihkan karakter tak terlihat yang sering terbawa saat copy-paste
 * dari Microsoft Word, Notepad, atau aplikasi lain.
 */
export function sanitizeText(str) {
  if (typeof str !== 'string') return str
  return stripHiddenChars(str)
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/**
 * Versi ringan untuk teks bebas yang tidak boleh mengubah spasi/baris.
 */
export function sanitizeBasicText(str) {
  if (typeof str !== 'string') return str
  return stripHiddenChars(str).trim()
}

/**
 * Helper paste: bersihkan teks clipboard sebelum masuk ke input.
 */
export function sanitizePastedText(str, { keepNewlines = false } = {}) {
  if (typeof str !== 'string') return ''
  const cleaned = stripHiddenChars(str)
  if (!keepNewlines) {
    return cleaned.replace(/\s+/g, ' ').trim()
  }
  return cleaned
}
