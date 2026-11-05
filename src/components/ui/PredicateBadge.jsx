import { predicateIndex, predicateToneClass, activePredicates } from '@/utils/predicates'

/**
 * Badge predikat kecil. Warna otomatis berdasarkan posisi predikat
 * di antara predikat aktif (terbaik → hijau, terjelek → merah).
 *
 * @param {object} predicate  baris grade_predicates (atau null)
 * @param {Array}  predicates daftar predikat aktif (untuk menghitung posisi warna)
 * @param {string} size       'xs' (tabel padat) | 'sm' (kartu mobile)
 */
export default function PredicateBadge({ predicate, predicates = [], size = 'xs', className = '' }) {
  if (!predicate) return null

  const index = predicateIndex(predicate, predicates)
  const count = activePredicates(predicates).length
  const tone = predicateToneClass(index, count)

  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-1 py-px text-[9px]'

  return (
    <span
      title={predicate.description ? `${predicate.label} — ${predicate.description}` : predicate.label}
      className={`inline-flex items-center justify-center rounded border font-bold leading-none ${padding} ${tone} ${className}`}
    >
      {predicate.label}
    </span>
  )
}
