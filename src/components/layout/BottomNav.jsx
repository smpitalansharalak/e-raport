import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, MoreHorizontal, X } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { getNavLinks, isNavLinkActive } from './navLinks'

const tileClass =
  'flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center transition duration-150 animate-[menu-item-in_0.25s_ease-out_backwards] hover:bg-[#f1f5f9] active:scale-95 motion-reduce:animate-none'

function MoreSheet({ title, links, pathname, closing, onClose }) {
  const [activeGroup, setActiveGroup] = useState(null)
  const shownLinks = activeGroup ? activeGroup.children : links
  const sheetTitle = activeGroup?.label ?? title

  return (
    <div className="no-print fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-[rgba(15,23,42,0.5)] backdrop-blur-[2px] motion-reduce:animate-none ${
          closing ? 'animate-[fade-out_0.18s_ease-in_forwards]' : 'animate-[fade-in_0.2s_ease-out]'
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={sheetTitle}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        className={`absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-[#e2e8f0] bg-white shadow-2xl motion-reduce:animate-none ${
          closing
            ? 'animate-[sheet-down_0.18s_ease-in_forwards]'
            : 'animate-[sheet-up_0.3s_cubic-bezier(0.16,1,0.3,1)]'
        }`}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#cbd5e1]" />

        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          {activeGroup ? (
            <button
              type="button"
              onClick={() => setActiveGroup(null)}
              aria-label="Kembali"
              className="cursor-pointer rounded-lg p-1.5 text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            >
              <ChevronLeft size={18} />
            </button>
          ) : (
            <span className="w-9" aria-hidden="true" />
          )}
          <p className="text-sm font-bold text-[#0f172a]">{sheetTitle}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="cursor-pointer rounded-lg p-1.5 text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 px-3 pb-3 pt-2">
          {shownLinks.map((link, index) => {
            const Icon = link.icon
            const active = isNavLinkActive(pathname, link)
            const key = link.to ?? link.key
            const tileContent = (
              <>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-[#f1f5f9] text-[#64748b]'
                  }`}
                >
                  <Icon size={20} />
                </span>
                <span
                  className={`text-[11px] font-medium leading-tight ${
                    active ? 'text-emerald-700' : 'text-[#475569]'
                  }`}
                >
                  {link.label}
                </span>
              </>
            )

            if (link.children) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveGroup(link)}
                  aria-label={`Buka menu ${link.label}`}
                  style={{ animationDelay: `${60 + index * 35}ms` }}
                  className={tileClass}
                >
                  {tileContent}
                </button>
              )
            }

            return (
              <NavLink
                key={key}
                to={link.to}
                end={link.to === '/'}
                onClick={onClose}
                style={{ animationDelay: `${60 + index * 35}ms` }}
                className={tileClass}
              >
                {tileContent}
              </NavLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function BottomNav() {
  const { role } = useAuth()
  const { pathname } = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetClosing, setSheetClosing] = useState(false)
  const [sheetState, setSheetState] = useState(null)

  const sheetOpenRef = useRef(false)
  const closeTimerRef = useRef(null)

  const { primary, overflow } = getNavLinks(role)
  const hasMore = overflow.length > 0

  useEffect(() => {
    sheetOpenRef.current = sheetOpen
  }, [sheetOpen])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const openSheetWith = (nextSheet) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setSheetState(nextSheet)
    setSheetClosing(false)
    setSheetOpen(true)
  }

  const openGroupSheet = (group) => {
    openSheetWith({ type: 'group', key: group.key, title: group.label, links: group.children })
  }

  const openMoreSheet = () => {
    openSheetWith({ type: 'menu', title: 'Menu Lainnya', links: overflow })
  }

  const closeSheet = useCallback(() => {
    if (!sheetOpenRef.current) return
    setSheetClosing(true)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setSheetOpen(false)
      setSheetClosing(false)
    }, 180)
  }, [])

  // Tutup sheet otomatis saat pindah halaman.
  useEffect(() => {
    closeSheet()
  }, [pathname, closeSheet])

  // Tutup dengan tombol Escape.
  useEffect(() => {
    if (!sheetOpen) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeSheet()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sheetOpen, closeSheet])

  // Kunci scroll body selama sheet terbuka.
  useEffect(() => {
    if (!sheetOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [sheetOpen])

  if (primary.length === 0) return null

  const tabs = [
    ...primary.map((link) => ({ ...link, key: link.key ?? link.to })),
    ...(hasMore ? [{ key: 'more', label: 'Lainnya', icon: MoreHorizontal, isMore: true }] : []),
  ]

  const routeActiveIndex = primary.findIndex((link) => isNavLinkActive(pathname, link))
  const openGroupIndex =
    sheetOpen && sheetState?.type === 'group'
      ? primary.findIndex((link) => link.key === sheetState.key)
      : -1
  const moreActive =
    hasMore &&
    (overflow.some((link) => isNavLinkActive(pathname, link)) ||
      (sheetOpen && sheetState?.type === 'menu'))
  const activePrimaryIndex = openGroupIndex >= 0 ? openGroupIndex : routeActiveIndex
  const hasActiveTab = activePrimaryIndex >= 0 || moreActive
  const activeIndex = moreActive ? primary.length : Math.max(activePrimaryIndex, 0)

  const tabBaseClass =
    'relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-0.5 pb-1.5 pt-2 text-[10px] font-semibold transition duration-200 active:scale-95'

  return (
    <nav aria-label="Navigasi utama" className="no-print fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        className="border-t border-[#e2e8f0] bg-white/90 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl"
      >
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {/* Indikator aktif yang bergeser */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-1 left-0 transition-transform duration-300 ease-out motion-reduce:transition-none ${
              hasActiveTab ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              width: `calc(100% / ${tabs.length})`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          >
            <span className="absolute inset-x-2 inset-y-0 rounded-2xl bg-emerald-500/10" />
          </span>

          {primary.map((link) => {
            const Icon = link.icon
            if (link.children) {
              const groupOpen =
                sheetOpen && sheetState?.type === 'group' && sheetState.key === link.key
              const active = isNavLinkActive(pathname, link) || groupOpen
              return (
                <button
                  key={link.key}
                  type="button"
                  onClick={groupOpen ? closeSheet : () => openGroupSheet(link)}
                  aria-expanded={groupOpen}
                  aria-haspopup="dialog"
                  aria-label={link.label}
                  className={tabBaseClass}
                >
                  <span className="flex h-5 items-center justify-center">
                    <Icon
                      size={20}
                      className={
                        active
                          ? 'animate-[nav-pop_0.35s_ease-out] text-emerald-600 motion-reduce:animate-none'
                          : 'text-[#64748b]'
                      }
                    />
                  </span>
                  <span className={`w-full whitespace-nowrap text-center leading-none ${active ? 'text-emerald-700' : 'text-[#64748b]'}`}>
                    {link.shortLabel ?? link.label}
                  </span>
                </button>
              )
            }

            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                aria-label={link.label}
                className={tabBaseClass}
              >
                {({ isActive }) => (
                  <>
                    <span className="flex h-5 items-center justify-center">
                      <Icon
                        size={20}
                        className={
                          isActive
                            ? 'animate-[nav-pop_0.35s_ease-out] text-emerald-600 motion-reduce:animate-none'
                            : 'text-[#64748b]'
                        }
                      />
                    </span>
                    <span className={`w-full whitespace-nowrap text-center leading-none ${isActive ? 'text-emerald-700' : 'text-[#64748b]'}`}>
                      {link.shortLabel ?? link.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}

          {hasMore && (
            <button
              type="button"
              onClick={sheetOpen && sheetState?.type === 'menu' ? closeSheet : openMoreSheet}
              aria-expanded={sheetOpen && sheetState?.type === 'menu'}
              aria-label="Buka menu lainnya"
              className={tabBaseClass}
            >
              <span className="flex h-5 items-center justify-center">
                <MoreHorizontal
                  size={20}
                  className={
                    moreActive
                      ? 'animate-[nav-pop_0.35s_ease-out] text-emerald-600 motion-reduce:animate-none'
                      : 'text-[#64748b]'
                  }
                />
              </span>
              <span className={`w-full whitespace-nowrap text-center leading-none ${moreActive ? 'text-emerald-700' : 'text-[#64748b]'}`}>
                Lainnya
              </span>
            </button>
          )}
        </div>
      </div>

      {sheetOpen && sheetState && (
        <MoreSheet
          title={sheetState.title}
          links={sheetState.links}
          pathname={pathname}
          closing={sheetClosing}
          onClose={closeSheet}
        />
      )}
    </nav>
  )
}
