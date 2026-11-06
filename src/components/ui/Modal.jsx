import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const SCROLL_CLASS = 'overscroll-contain'

/**
 * Modal dasar aplikasi.
 *
 * Dirender lewat portal ke `document.body` supaya tidak terkurung oleh
 * ancestor yang punya `transform` (mis. `.page-transition`). Overlay fixed
 * ke seluruh viewport dan selalu di atas Header/Sidebar.
 *
 * Konten dibagi jadi dua bagian:
 * - header/footer: `shrink-0`
 * - badan: `flex-1 overflow-y-auto`
 *
 * Struktur anak tipikal:
 *   <div className="shrink-0 ...border-b">header</div>
 *   <div className="flex-1 overflow-y-auto overscroll-contain ...">body</div>
 *
 * Varian:
 * - `dialog`  — kartu melayang di tengah, padding layar di semua ukuran.
 * - `sheet`   — layar penuh di mobile, kartu melayang di `sm` ke atas.
 * - `screen`  — layar penuh di semua ukuran (dipakai halaman input nilai).
 *
 * Fitur: Escape menutup, klik backdrop menutup, scroll body terkunci,
 * lebar scrollbar dikompensasi supaya konten tidak bergeser.
 */
export default function Modal({
  onClose,
  ariaLabel,
  variant = 'dialog',
  maxWidth = 'max-w-2xl',
  panelClassName = '',
  overlayClassName = '',
  children,
}) {
  const panelRef = useRef(null)

  // Escape menutup + scroll body terkunci selama modal tampil.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [onClose])

  // Pindahkan fokus ke panel saat dibuka, kembalikan saat ditutup.
  useEffect(() => {
    const previousActiveElement = document.activeElement
    panelRef.current?.focus()
    return () => {
      if (previousActiveElement instanceof HTMLElement) previousActiveElement.focus()
    }
  }, [])

  if (variant === 'screen') {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        ref={panelRef}
        tabIndex={-1}
        className={`fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden outline-none ${panelClassName}`}
      >
        {children}
      </div>,
      document.body,
    )
  }

  if (variant === 'sheet') {
    return createPortal(
      <div
        className={`fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 backdrop-blur-sm animate-[fade-in_0.2s_ease-out] motion-reduce:animate-none sm:items-center sm:p-4 ${overlayClassName}`}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          ref={panelRef}
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          className={`flex h-[100dvh] w-full flex-col overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl outline-none print:border-0 ${maxWidth} sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl ${panelClassName}`}
        >
          {children}
        </div>
      </div>,
      document.body,
    )
  }

  // dialog: container scroll penuh, panel tinggi maksimal dibatas 100dvh.
  return createPortal(
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s_ease-out] motion-reduce:animate-none ${SCROLL_CLASS} ${overlayClassName}`}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          ref={panelRef}
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)] ${maxWidth} ${panelClassName}`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
