import { createContext } from 'react'

export const defaultAuthContext = {
  user: null,
  profile: null,
  role: null,
  loading: true,
  initialized: false,
  profileLoading: false,
  profileError: null,
  signOut: async () => {},
  refreshProfile: async () => {},
}

export const AuthContext = createContext(defaultAuthContext)
