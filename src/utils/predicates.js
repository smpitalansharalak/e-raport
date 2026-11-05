/**
 * Utility predikat nilai (murni JavaScript — tanpa dependency React).
 *
 * Predikat global: satu daftar dipakai semua periode & format.
 * Pencocokan rentang bersifat inklusif [min, max].
 * Urutan (sort_order, terbaik → terjelek) menentukan warna badge otomatis.
 */

const filledNumber = (val) => {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(val)
  return Number.isNaN(n) ? null : n
}

/** Predikat yang cocok untuk satu nilai. null jika nilai kosong / di luar semua rentang / predikat nonaktif. */
export const predicateForScore = (score, predicates = []) => {
  const n = filledNumber(score)
  if (n === null) return null
  const active = (predicates ?? [])
    .filter((p) => p.is_active !== false)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  return active.find((p) => n >= Number(p.min_score) && n <= Number(p.max_score)) ?? null
}

/** Predikat aktif, terurut terbaik → terjelek. */
export const activePredicates = (predicates = []) =>
  (predicates ?? [])
    .filter((p) => p.is_active !== false)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

/**
 * Nada warna otomatis berdasarkan posisi dalam daftar predikat aktif
 * (terbaik = hijau, terjelek = merah). Kelas Tailwind literal agar
 * terdeteksi oleh build.
 */
const GRADIENT = [
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'bg-lime-500/15 text-lime-400 border-lime-500/30',
  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'bg-rose-500/15 text-rose-400 border-rose-500/30',
]

export const predicateToneClass = (index, count) => {
  if (!Number.isFinite(index) || count <= 1) return GRADIENT[0]
  const position = Math.round((index * (GRADIENT.length - 1)) / (count - 1))
  return GRADIENT[Math.max(0, Math.min(GRADIENT.length - 1, position))]
}

/** Cari posisi predikat di antara predikat aktif (untuk warna). -1 jika tidak aktif/tidak ada. */
export const predicateIndex = (predicate, predicates = []) =>
  activePredicates(predicates).findIndex((p) => p.id === predicate?.id)

/**
 * Deteksi tumpang tindih rentang predikat aktif (diurutkan berdasarkan min).
 * Mengembalikan array pesan error (kosong jika tidak ada tumpang tindih).
 */
export const findPredicateOverlaps = (predicates = []) => {
  const active = activePredicates(predicates)
    .slice()
    .sort((a, b) => Number(a.min_score) - Number(b.min_score))
  const errors = []
  for (let i = 1; i < active.length; i += 1) {
    const prev = active[i - 1]
    const curr = active[i]
    if (Number(curr.min_score) <= Number(prev.max_score)) {
      errors.push(
        `Rentang "${curr.label}" (${curr.min_score}–${curr.max_score}) tumpang tindih dengan "${prev.label}" (${prev.min_score}–${prev.max_score}).`
      )
    }
  }
  return errors
}
