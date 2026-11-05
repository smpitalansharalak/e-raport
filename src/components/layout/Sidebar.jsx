import { NavLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { getAllLinks } from './navLinks'

export default function Sidebar() {
  const { role } = useAuth()
  const links = getAllLinks(role)

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
      ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500 shadow-[inset_1px_0_0_rgba(16,185,129,0.2)]'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-4 border-transparent'
    }`

  return (
    <aside className="no-print bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col h-[calc(100vh-4rem)] z-30 shrink-0 sticky top-16 w-64">
      <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 block mb-3">
          Navigasi Utama
        </span>
        {links.map((link) => {
          const Icon = link.icon
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={navLinkClass}
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
