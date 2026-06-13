import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Users,
  FilePlus,
  Printer,
  UserCog,
  FileEdit,
  ClipboardCheck,
  KeyRound,
  ArrowUpCircle,
} from 'lucide-react'

export default function Sidebar() {
  const { role, sidebarOpen, setSidebarOpen } = useAuth()

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
      ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500 shadow-[inset_1px_0_0_rgba(16,185,129,0.2)]'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-4 border-transparent'
    }`

  const adminLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/siswa', label: 'Input Siswa', icon: Users },
    { to: '/buat-rapor', label: 'Buat Rapor', icon: FilePlus },
    { to: '/manajemen-status', label: 'Naik Kelas & Alumni', icon: ArrowUpCircle },
    { to: '/cetak-rapor', label: 'Cetak Rapor', icon: Printer },
    { to: '/kelola-user', label: 'Kelola User', icon: UserCog },
    { to: '/ganti-password', label: 'Ganti Password', icon: KeyRound },
  ]

  const guruMapelLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/input-rapor', label: 'Input Rapor', icon: FileEdit },
    { to: '/ganti-password', label: 'Ganti Password', icon: KeyRound },
  ]

  const waliKelasLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/input-rapor', label: 'Input Rapor', icon: FileEdit },
    { to: '/kepatuhan', label: 'Menu Wali Kelas', icon: ClipboardCheck },
    { to: '/ganti-password', label: 'Ganti Password', icon: KeyRound },
  ]

  const getLinks = () => {
    switch (role) {
      case 'admin': return adminLinks
      case 'guru_mapel': return guruMapelLinks
      case 'wali_kelas': return waliKelasLinks
      default: return []
    }
  }

  return (
    <aside className={`no-print bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-4rem)] z-30 shrink-0
      transition-all duration-300 ease-in-out
      fixed lg:sticky top-16 left-0 w-64
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 block mb-3">
          Navigasi Utama
        </span>
        {getLinks().map((link) => {
          const Icon = link.icon
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={navLinkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          )
        })}
      </div>

      <div className="p-4 border-t border-slate-800/60 bg-slate-950/20">
        <p className="text-[10px] text-slate-500 text-center">© {new Date().getFullYear()} SMP IT Al Anshar</p>
        <p className="text-[9px] text-emerald-500/60 text-center font-mono mt-0.5">v1.1.0 Stable</p>
      </div>
    </aside>
  )
}