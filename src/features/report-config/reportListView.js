import { compareClassNames } from '@/utils/classes'

export const SEMESTER_OPTIONS = [
  { value: 'I', label: 'Semester I (Ganjil)' },
  { value: 'II', label: 'Semester II (Genap)' },
]

const SEMESTER_ORDER = { I: 1, II: 2 }

export function semesterLabel(value) {
  return SEMESTER_OPTIONS.find((option) => option.value === value)?.label ?? value ?? '-'
}

export function compareAcademicYearsDesc(a, b) {
  return String(b).localeCompare(String(a), undefined, { numeric: true, sensitivity: 'base' })
}

/** Daftar tahun ajaran unik, terbaru dulu. */
export function listAcademicYears(periods) {
  return [...new Set(periods.map((p) => p.academic_year).filter(Boolean))].sort(compareAcademicYearsDesc)
}

/** Periode difilter berdasarkan pencarian bebas, tahun ajaran, dan semester. */
export function filterPeriods(periods, { search = '', year = '', semester = '' } = {}) {
  const query = String(search).trim().toLowerCase()

  return periods.filter((period) => {
    if (year && period.academic_year !== year) return false
    if (semester && period.semester !== semester) return false
    if (!query) return true

    const haystack = [
      period.name,
      period.class_name,
      period.wali_kelas?.name,
      period.kepala_sekolah_name,
      period.format?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })
}

/** Urutkan dalam satu grup: semester, lalu kelas, lalu nama. */
export function comparePeriods(a, b) {
  const semA = SEMESTER_ORDER[a.semester] ?? 99
  const semB = SEMESTER_ORDER[b.semester] ?? 99
  if (semA !== semB) return semA - semB

  const classCompare = compareClassNames(a.class_name || '', b.class_name || '')
  if (classCompare !== 0) return classCompare

  return String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' })
}

/**
 * Kelompokkan periode per tahun ajaran, terbaru dulu.
 * Periode di dalam grup diurutkan semester lalu kelas.
 */
export function groupPeriodsByYear(periods) {
  const map = new Map()

  for (const period of periods) {
    const year = period.academic_year || 'Tidak Diketahui'
    const bucket = map.get(year)
    if (bucket) bucket.push(period)
    else map.set(year, [period])
  }

  return [...map.entries()]
    .map(([year, items]) => ({ year, periods: [...items].sort(comparePeriods) }))
    .sort((a, b) => compareAcademicYearsDesc(a.year, b.year))
}
