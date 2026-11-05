import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AuthContext } from './authContext'
import {
  createMissingProfile,
  getProfileById,
  getSession,
  signOut as signOutRequest,
  subscribeToAuthChanges,
} from './authService'

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)

  const profileRequestRef = useRef(0)
  const lastUserIdRef = useRef(null)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return

    const requestId = ++profileRequestRef.current
    setProfileLoading(true)
    setProfileError(null)

    try {
      const data = await getProfileById(userId)
      if (requestId !== profileRequestRef.current) return

      if (!data) {
        // Self-healing: baris profil hilang. Buat ulang dengan kolom wajib lengkap.
        const healedProfile = await createMissingProfile(userId)
        if (requestId !== profileRequestRef.current) return
        if (!healedProfile?.role) {
          throw new Error('Profil akun tidak memiliki peran. Hubungi administrator.')
        }

        setProfile(healedProfile)
        setRole(healedProfile.role)
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
      console.error('[AuthProvider] Gagal memuat profil:', err)
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

  const scheduleProfileFetch = useCallback(
    (userId) => {
      if (!userId || lastUserIdRef.current === userId) return
      lastUserIdRef.current = userId
      // Dijadwalkan agar berjalan setelah lock internal Supabase Auth dilepas.
      setTimeout(() => {
        if (lastUserIdRef.current !== userId) return
        fetchProfile(userId)
      }, 0)
    },
    [fetchProfile],
  )

  useEffect(() => {
    let active = true

    const initializeAuth = async () => {
      try {
        const session = await getSession()
        if (!active) return
        const nextUser = session?.user ?? null
        setUser(nextUser)
        if (nextUser) scheduleProfileFetch(nextUser.id)
      } catch (err) {
        console.error('[AuthProvider] getSession gagal:', err)
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
    const unsubscribe = subscribeToAuthChanges((event, session) => {
      if (!active) return

      const nextUser = session?.user ?? null
      setUser((prev) => (prev?.id === nextUser?.id ? prev : nextUser))

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
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [scheduleProfileFetch])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      await signOutRequest()
    } catch (err) {
      console.error('[AuthProvider] signOut gagal:', err)
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
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
