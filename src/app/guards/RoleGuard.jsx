import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

export default function RoleGuard({ allowedRoles, children }) {
  const { role, loading, user, initialized, profileLoading, profileError, refreshProfile, signOut } = useAuth()
  const location = useLocation()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (profileError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-slate-100">Gagal memuat profil akun</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400 break-words">{profileError}</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={refreshProfile}
              disabled={profileLoading}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
            >
              {profileLoading ? 'Memuat...' : 'Coba Lagi'}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!allowedRoles.includes(role)) {
    if (location.pathname === '/') {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
          <div className="text-center">
            <p className="font-semibold">Anda tidak memiliki akses ke halaman ini.</p>
          </div>
        </div>
      )
    }
    return <Navigate to="/" replace />
  }

  return children
}
