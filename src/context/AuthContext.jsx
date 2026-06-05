import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({
  user: null,
  profile: null,
  role: null,
  loading: true,
  initialized: false,
  sidebarOpen: false,
  setSidebarOpen: () => {},
  toggleSidebar: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(prev => !prev)

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, email, role, secondary_role')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error.message)
        setProfile(null)
        setRole(null)
      } else if (!data) {
        // Self-healing: profile row missing, upsert to avoid duplicate key errors
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const email = authUser.email
          const displayName = localStorage.getItem('user_display_name') || email.split('@')[0]
          const derivedRole = email === 'admin@smpital-anshar.com' ? 'admin' : 'guru_mapel'

          const { data: upsertedProfile, error: upsertErr } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              name: displayName,
              email: email,
              role: derivedRole,
            }, { onConflict: 'id' })
            .select()
            .maybeSingle()

          if (upsertErr) {
            console.error('Error upserting profile:', upsertErr.message)
            setProfile(null)
            setRole(null)
          } else {
            setProfile(upsertedProfile)
            setRole(upsertedProfile?.role || derivedRole)
          }
        } else {
          setProfile(null)
          setRole(null)
        }
      } else {
        const displayName = localStorage.getItem('user_display_name')
        setProfile({
          ...data,
          name: displayName || data.name,
        })
        setRole(data.role)
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      setProfile(null)
      setRole(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    let ignoreInitialEvent = true

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          setRole(null)
        }
      } catch (err) {
        console.error('[AuthContext] getSession failed', err)
        setUser(null)
        setProfile(null)
        setRole(null)
      } finally {
        setLoading(false)
        setInitialized(true)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignoreInitialEvent) {
          ignoreInitialEvent = false
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
            return
          }
        }

        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
          setLoading(false)
          setInitialized(true)
        } else {
          setUser(null)
          setProfile(null)
          setRole(null)
          setLoading(false)
          setInitialized(true)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    localStorage.removeItem('user_display_name')
    setUser(null)
    setProfile(null)
    setRole(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        initialized,
        loading,
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
