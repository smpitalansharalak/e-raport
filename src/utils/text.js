/* eslint-disable no-control-regex, no-misleading-character-class */
/**
 * Membersihkan karakter tak terlihat yang sering terbawa saat copy-paste
 * dari Microsoft Word, Notepad, atau aplikasi lain.
 */
export function sanitizeText(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u00AD\u200B\u200C\u200D\u200E\u200F\uFEFF\uFFFC\u2028\u2029]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n|\r/g, '\n')
    .trim()
}

/**
 * Versi ringan untuk teks bebas yang tidak boleh mengubah spasi/baris.
 */
export function sanitizeBasicText(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u00AD\u200B\u200C\u200D\u200E\u200F\uFEFF\uFFFC]/g, '')
    .trim()
}
