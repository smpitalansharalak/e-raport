import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { getAllLinks, isNavLinkActive } from './navLinks'

export default function Sidebar() {
  const { role } = useAuth()
  const links = useMemo(() => getAllLinks(role), [role])
  const { pathname } = useLocation()
  const [openGroups, setOpenGroups] = useState({})

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
      ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500 shadow-[inset_1px_0_0_rgba(16,185,129,0.2)]'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-4 border-transparent'
    }`

  useEffect(() => {
    const activeGroup = links.find((link) =>
      link.children?.some((child) => isNavLinkActive(pathname, child))
    )
    if (!activeGroup) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenGroups((prev) =>
      prev[activeGroup.key] === undefined ? { ...prev, [activeGroup.key]: true } : prev
    )
  }, [links, pathname])

  const toggleGroup = (group, isOpen) => {
    setOpenGroups((prev) => ({ ...prev, [group.key]: !isOpen }))
  }

  return (
    <aside className="no-print bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col h-[calc(100vh-4rem)] z-30 shrink-0 sticky top-16 w-64">
      <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 block mb-3">
          Navigasi Utama
        </span>
        {links.map((link) => {
          if (link.children) {
            const Icon = link.icon
            const groupActive = link.children.some((child) => isNavLinkActive(pathname, child))
            const isOpen = openGroups[link.key] ?? groupActive
            return (
              <div key={link.key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(link, isOpen)}
                  aria-expanded={isOpen}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    groupActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500 shadow-[inset_1px_0_0_rgba(16,185,129,0.2)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-4 border-transparent'
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-left">{link.label}</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1">
                    {link.children.map((child) => {
                      const ChildIcon = child.icon
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end={child.to === '/'}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
                            }`
                          }
                        >
                          <ChildIcon size={16} />
                          <span>{child.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

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
