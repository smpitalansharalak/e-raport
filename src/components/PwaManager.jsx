import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download, Info, WifiOff, X } from 'lucide-react'

const INSTALL_DISMISSED_KEY = 'erapor:pwa-install-dismissed'

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function wasInstallDismissed() {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export default function PwaManager() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
  } = useRegisterSW({ immediate: true })

  const [installPrompt, setInstallPrompt] = useState(null)
  const [installDismissed, setInstallDismissed] = useState(wasInstallDismissed)
  const [installReady, setInstallReady] = useState(false)
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )
  const showInstall =
    installReady && !!installPrompt && !installDismissed && !isStandalone()

  // Simpan event install dari browser agar tombol "Pasang" bisa memicunya nanti.
  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      if (!isStandalone()) setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
    }
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Tampilkan ajakan install setelah aplikasi sempat dipakai sebentar.
  useEffect(() => {
    if (!installPrompt || installDismissed) return

    const timer = setTimeout(() => setInstallReady(true), 3000)
    return () => clearTimeout(timer)
  }, [installPrompt, installDismissed])

  // Sembunyikan notifikasi "siap offline" secara otomatis.
  useEffect(() => {
    if (!offlineReady) return
    const timer = setTimeout(() => setOfflineReady(false), 6000)
    return () => clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  const dismissInstall = () => {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
    } catch {
      // localStorage bisa diblokir (mode privat); abaikan saja.
    }
    setInstallDismissed(true)
  }

  const handleInstall = async () => {
    if (!installPrompt) return

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      setInstallPrompt(null)
      if (outcome === 'dismissed') dismissInstall()
    } catch {
      // Prompt bisa gagal jika sudah pernah dipakai; bersihkan saja.
      setInstallPrompt(null)
    }
  }

  const hasNotification =
    isOffline || offlineReady || (showInstall && !!installPrompt)

  if (!hasNotification) return null

  return (
    <div
      className="no-print fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3"
      aria-live="polite"
    >
      {isOffline && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-white p-4 shadow-lg">
          <div className="shrink-0 rounded-lg bg-amber-500/10 p-2 text-amber-600">
            <WifiOff size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">Anda sedang offline</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Koneksi internet terputus. Data terbaru belum dapat dimuat sampai koneksi kembali.
            </p>
          </div>
        </div>
      )}

      {offlineReady && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
        >
          <div className="shrink-0 rounded-lg bg-slate-500/10 p-2 text-slate-600">
            <Info size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">Aplikasi siap diakses offline</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Tampilan aplikasi sudah tersimpan di perangkat ini.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOfflineReady(false)}
            aria-label="Tutup notifikasi"
            className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {showInstall && installPrompt && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-lg"
        >
          <div className="shrink-0 rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
            <Download size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">Pasang E-Rapor</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Akses lebih cepat langsung dari layar utama perangkat.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstall}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 cursor-pointer"
              >
                Pasang
              </button>
              <button
                type="button"
                onClick={dismissInstall}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissInstall}
            aria-label="Tutup ajakan pasang aplikasi"
            className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
