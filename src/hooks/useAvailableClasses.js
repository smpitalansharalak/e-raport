import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useAvailableClasses
 * Mengambil daftar kelas yang sudah ada di tabel students (distinct).
 * Hasil diurutkan sesuai urutan standar SMP (VII → VIII → IX → lain-lain).
 */
export function useAvailableClasses({ statusFilter = null } = {}) {
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        const fetchClasses = async () => {
            setLoading(true)
            try {
                let q = supabase.from('students').select('class_name')
                if (statusFilter) q = q.eq('status', statusFilter)

                const { data, error } = await q
                if (error || cancelled) return

                // Ambil nilai unik
                const unique = [...new Set((data || []).map(r => r.class_name).filter(Boolean))]

                // Urutkan: VII* < VIII* < IX* < sisanya alfabet
                const romanOrder = ['VII', 'VIII', 'IX']
                unique.sort((a, b) => {
                    const aBase = a.split(' ')[0]
                    const bBase = b.split(' ')[0]
                    const aIdx = romanOrder.indexOf(aBase)
                    const bIdx = romanOrder.indexOf(bBase)
                    if (aIdx !== -1 && bIdx !== -1) {
                        if (aIdx !== bIdx) return aIdx - bIdx
                        return a.localeCompare(b)
                    }
                    if (aIdx !== -1) return -1
                    if (bIdx !== -1) return 1
                    return a.localeCompare(b)
                })

                if (!cancelled) setClasses(unique)
            } catch {
                // silent
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        fetchClasses()
        return () => { cancelled = true }
    }, [statusFilter])

    return { classes, loading }
}