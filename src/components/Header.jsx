import React from 'react'
import { useAuth } from '../context/AuthContext'
import { LogOut, User, GraduationCap, School, Menu, X } from 'lucide-react'

export default function Header() {
  const { profile, signOut, sidebarOpen, toggleSidebar } = useAuth()

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
      case 'wali_kelas':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
      case 'guru_mapel':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
    }
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Admin'
      case 'wali_kelas':
        return 'Wali Kelas'
      case 'guru_mapel':
        return 'Guru Mapel'
      default:
        return 'Guru'
    }
  }

  return (
    <header className="no-print h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle Sidebar Button for Mobile */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400 shrink-0">
          <School size={20} />
        </div>
        <div>
          <h1 className="text-md sm:text-lg font-bold text-slate-100 m-0 tracking-tight leading-none">
            E-Rapor
          </h1>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium block mt-0.5 sm:mt-1 leading-none">SMP IT Al Anshar</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 border-r border-slate-800 pr-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-200">
              {profile?.name || 'User'}
            </p>
            <p className="text-[11px] text-slate-400 m-0">
              {profile?.email}
            </p>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(
              profile?.role
            )}`}
          >
            {getRoleLabel(profile?.role)}
          </span>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  )
}
