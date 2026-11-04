import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const PROFILE_TIMEOUT_MS = 15000

const AuthContext = createContext({
  user: null,
  profile: null,
  role: null,
  loading: true,
  initialized: false,
  profileLoading: false,
  profileError: null,
  sidebarOpen: false,
  setSidebarOpen: () => {},
  toggleSidebar: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
})

const withTimeout = (promise, ms, message) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const profileRequestRef = useRef(0)
  const lastUserIdRef = useRef(null)

  const toggleSidebar = () => setSidebarOpen(prev => !prev)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return

    const requestId = ++profileRequestRef.current
    setProfileLoading(true)
    setProfileError(null)

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('id, username, name, email, role, secondary_role')
          .eq('id', userId)
          .maybeSingle(),
        PROFILE_TIMEOUT_MS,
        'Waktu memuat profil habis. Periksa koneksi internet lalu coba lagi.',
      )

      if (requestId !== profileRequestRef.current) return
      if (error) throw error

      if (!data) {
        // Self-healing: baris profil hilang. Buat ulang dengan kolom wajib lengkap.
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError

        const authUser = authData?.user
        if (!authUser) throw new Error('Sesi login tidak valid. Silakan masuk kembali.')

        const email = authUser.email || ''
        const fallbackName = email.split('@')[0] || 'Pengguna'
        const username = (authUser.user_metadata?.username || fallbackName).toLowerCase()
        const displayName =
          localStorage.getItem('user_display_name') ||
          authUser.user_metadata?.name ||
          fallbackName
        const derivedRole = email === 'admin@smpital-anshar.com' ? 'admin' : 'guru_mapel'

        const { data: upserted, error: upsertError } = await withTimeout(
          supabase
            .from('profiles')
            .upsert({
              id: userId,
              username,
              name: displayName,
              email,
              role: derivedRole,
            }, { onConflict: 'id' })
            .select()
            .maybeSingle(),
          PROFILE_TIMEOUT_MS,
          'Waktu membuat profil habis. Periksa koneksi internet lalu coba lagi.',
        )

        if (requestId !== profileRequestRef.current) return
        if (upsertError) throw upsertError
        if (!upserted?.role) throw new Error('Profil akun tidak memiliki peran. Hubungi administrator.')

        setProfile({ ...upserted, name: displayName || upserted.name })
        setRole(upserted.role)
        return
      }

      if (!data.role) throw new Error('Akun Anda belum memiliki peran. Hubungi administrator.')

      const displayName = localStorage.getItem('user_display_name')
      setProfile({
        ...data,
        name: displayName || data.name,
      })
      setRole(data.role)
    } catch (err) {
      if (requestId !== profileRequestRef.current) return
      console.error('[AuthContext] Gagal memuat profil:', err)
      setProfile(null)
      setRole(null)
      setProfileError(err?.message || 'Gagal memuat profil akun.')
    } finally {
      if (requestId === profileRequestRef.current) setProfileLoading(false)
    }
  }, [])

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }

  const scheduleProfileFetch = useCallback((userId) => {
    if (!userId || lastUserIdRef.current === userId) return
    lastUserIdRef.current = userId
    // Dijadwalkan agar berjalan setelah lock internal Supabase Auth dilepas.
    setTimeout(() => {
      if (lastUserIdRef.current !== userId) return
      fetchProfile(userId)
    }, 0)
  }, [fetchProfile])

  useEffect(() => {
    let active = true

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!active) return
        const nextUser = session?.user ?? null
        setUser(nextUser)
        if (nextUser) scheduleProfileFetch(nextUser.id)
      } catch (err) {
        console.error('[AuthContext] getSession gagal:', err)
        if (active) setUser(null)
      } finally {
        if (active) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    // PENTING: callback ini harus sinkron.
    // Jangan pernah await panggilan Supabase lain di dalamnya karena akan
    // deadlock dengan lock internal Supabase Auth (mis. saat TOKEN_REFRESHED).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return

        const nextUser = session?.user ?? null
        setUser(prev => (prev?.id === nextUser?.id ? prev : nextUser))

        if (!nextUser) {
          lastUserIdRef.current = null
          profileRequestRef.current += 1
          setProfile(null)
          setRole(null)
          setProfileError(null)
          setProfileLoading(false)
        } else {
          scheduleProfileFetch(nextUser.id)
        }

        setLoading(false)
        setInitialized(true)
      },
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [scheduleProfileFetch])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) console.error('[AuthContext] signOut gagal:', error)
    } catch (err) {
      console.error('[AuthContext] signOut gagal:', err)
    } finally {
      localStorage.removeItem('user_display_name')
      profileRequestRef.current += 1
      lastUserIdRef.current = null
      setUser(null)
      setProfile(null)
      setRole(null)
      setProfileError(null)
      setProfileLoading(false)
      setLoading(false)
      queryClient.clear()
    }
  }, [queryClient])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        initialized,
        loading,
        profileLoading,
        profileError,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
