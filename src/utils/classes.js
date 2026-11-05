/**
 * Utilitas pengolahan nama kelas dan pengelompokan mata pelajaran.
 * Murni JavaScript — tidak ada dependency React/Supabase.
 */

export const CLASS_ORDER = ['VII', 'VIII', 'IX']

const ROMAN_ORDER = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
}

export function getNextClass(currentClass) {
  const base = currentClass.replace(/\s.*/, '').trim()
  const suffix = currentClass.replace(/^[IVXLC]+/, '').trim()
  const idx = CLASS_ORDER.indexOf(base)
  if (idx === -1 || idx >= CLASS_ORDER.length - 1) return null
  return CLASS_ORDER[idx + 1] + (suffix ? ' ' + suffix : '')
}

export function isLastClass(currentClass) {
  return currentClass.replace(/\s.*/, '').trim() === 'IX'
}

/**
 * Urutkan nama kelas: I → XII, "Tanpa Kelas" selalu di akhir,
 * sisanya alfabetis dengan angka natural.
 */
export function compareClassNames(a, b) {
  if (a === 'Tanpa Kelas') return 1
  if (b === 'Tanpa Kelas') return -1
  const numA = ROMAN_ORDER[a.toUpperCase()]
  const numB = ROMAN_ORDER[b.toUpperCase()]
  if (numA && numB) return numA - numB
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export function sortClassNames(names) {
  return [...names].sort(compareClassNames)
}

/**
 * Kelompokkan daftar mata pelajaran berdasarkan `class_name`.
 * Mapel tanpa kelas masuk ke kelompok "Tanpa Kelas".
 */
export function groupSubjectsByClass(subjects) {
  return subjects.reduce((acc, subject) => {
    const className = subject.class_name || 'Tanpa Kelas'
    if (!acc[className]) acc[className] = []
    acc[className].push(subject)
    return acc
  }, {})
}
