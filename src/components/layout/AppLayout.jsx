import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import BottomNav from './BottomNav'
import Header from './Header'
import Sidebar from './Sidebar'

export default function AppLayout() {
  const { user, loading, initialized } = useAuth()
  const { pathname } = useLocation()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
          {/* Rotating emerald sector */}
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-400 text-sm font-medium animate-pulse">
          Memuat data sistem...
        </p>
      </div>
    )
  }

  // Redirect to login if not logged in
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 relative">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8 bg-slate-950">
          <div key={pathname} className="page-transition pb-24 lg:pb-0 print:pb-0">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
