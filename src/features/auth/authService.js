import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/async'

export const PROFILE_TIMEOUT_MS = 15000

const PROFILE_COLUMNS = 'id, username, name, email, role, secondary_role'

const PROFILE_LOAD_TIMEOUT_MESSAGE =
  'Waktu memuat profil habis. Periksa koneksi internet lalu coba lagi.'

const PROFILE_CREATE_TIMEOUT_MESSAGE =
  'Waktu membuat profil habis. Periksa koneksi internet lalu coba lagi.'

export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw error
  return session ?? null
}

export async function getAuthUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data?.user ?? null
}

export async function getProfileById(userId) {
  const { data, error } = await withTimeout(
    supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle(),
    PROFILE_TIMEOUT_MS,
    PROFILE_LOAD_TIMEOUT_MESSAGE,
  )

  if (error) throw error
  return data
}

/**
 * Membuat ulang baris profil yang hilang (self-healing) menggunakan data dari
 * sesi Supabase Auth.
 */
export async function createMissingProfile(userId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('Sesi login tidak valid. Silakan masuk kembali.')

  const email = authUser.email || ''
  const fallbackName = email.split('@')[0] || 'Pengguna'
  const username = (authUser.user_metadata?.username || fallbackName).toLowerCase()
  const displayName =
    localStorage.getItem('user_display_name') ||
    authUser.user_metadata?.name ||
    fallbackName
  const derivedRole = email === 'admin@smpital-anshar.com' ? 'admin' : 'guru_mapel'

  const { data, error } = await withTimeout(
    supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          username,
          name: displayName,
          email,
          role: derivedRole,
        },
        { onConflict: 'id' },
      )
      .select()
      .maybeSingle(),
    PROFILE_TIMEOUT_MS,
    PROFILE_CREATE_TIMEOUT_MESSAGE,
  )

  if (error) throw error
  return { ...data, name: displayName || data?.name }
}

const escapeLikePattern = (value) => value.replace(/[\\%_]/g, '\\$&')

export async function findProfileByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, name')
    .ilike('username', escapeLikePattern(username))
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error(
        'Ditemukan lebih dari satu akun dengan username tersebut. Hubungi administrator.',
      )
    }
    throw error
  }

  return data
}

export async function signInWithPassword({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function changePassword({ email, oldPassword, newPassword }) {
  // Re-autentikasi memakai Supabase SDK agar klien memiliki sesi yang valid.
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: oldPassword,
  })

  if (signInError) {
    throw new Error(
      signInError.message === 'Invalid login credentials'
        ? 'Password lama salah. Silakan periksa kembali.'
        : 'Gagal memverifikasi password lama. Silakan coba lagi.',
    )
  }

  const accessToken = signInData?.session?.access_token
  if (!accessToken) {
    throw new Error('Gagal membuat sesi autentikasi. Silakan login ulang dan coba lagi.')
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const updateRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: newPassword }),
  })

  if (!updateRes.ok) {
    const errorBody = await updateRes.json().catch(() => null)
    const message =
      errorBody?.error_description ||
      errorBody?.error ||
      'Gagal menyimpan password baru. Silakan coba lagi.'
    throw new Error(message)
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function subscribeToAuthChanges(handler) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(handler)
  return () => subscription.unsubscribe()
}
