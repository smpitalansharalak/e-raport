import { useCallback, useSyncExternalStore } from 'react'

/**
 * Hook untuk membaca media query secara reaktif.
 * Menggunakan useSyncExternalStore agar snapshot awal sudah benar saat render
 * pertama (tidak ada flash desktop → mobile atau sebaliknya).
 */
export default function useMediaQuery(query) {
  const subscribe = useCallback(
    (onStoreChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener('change', onStoreChange)
      return () => mediaQuery.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  }, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
