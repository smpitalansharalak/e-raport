import { createContext } from 'react'

export const defaultAuthContext = {
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
}

export const AuthContext = createContext(defaultAuthContext)
