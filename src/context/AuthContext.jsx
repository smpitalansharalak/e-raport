import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({
  user: null,
  profile: null,
  role: null,
  loading: true,
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(prev => !prev)

  const fetchProfile = async (userId) => {
    console.debug('[AuthContext] fetchProfile start for', userId)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      console.debug('[AuthContext] fetchProfile result', { data, error })
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
            console.debug('[AuthContext] fetchProfile upsertErr -> setRole(null)')
          } else {
            setProfile(upsertedProfile)
            setRole(upsertedProfile?.role || derivedRole)
            console.debug('[AuthContext] fetchProfile upserted role', upsertedProfile?.role || derivedRole)
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
        console.debug('[AuthContext] fetchProfile loaded role', data.role)
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      setProfile(null)
      setRole(null)
      console.debug('[AuthContext] fetchProfile caught error -> setRole(null)')
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    console.debug('[AuthContext] initializing auth listener')
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.debug('[AuthContext] getSession result:', session)
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setUser(null)
        setProfile(null)
        setRole(null)
        setLoading(false)
      }
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.debug('[AuthContext] onAuthStateChange', event, session)
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          setRole(null)
        }
        setLoading(false)
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
