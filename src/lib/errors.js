const DEFAULT_MESSAGE = 'Terjadi kesalahan. Silakan coba lagi.'

/**
 * Mengubah error apa pun (Error, objek Supabase, string) menjadi pesan yang aman
 * untuk ditampilkan ke pengguna.
 */
export function getErrorMessage(error, fallback = DEFAULT_MESSAGE) {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }
  return fallback
}

/**
 * Error khusus ketika baris profil pengguna tidak ditemukan.
 */
export function isMissingProfileError(error) {
  return error?.code === 'PGRST116' || error?.code === '22P02'
}
