/**
 * Utility functions untuk membuat sheet Excel rapor.
 * XLSX di-load secara dinamis agar bundle utama tidak ikut memuat library Excel.
 */
import { getComponentValue, getFixedSubs, itemsOfComponent } from '@/utils/scoreCalculations'

const loadXLSX = () => import('xlsx')

const scoreKey = (studentId, subjectId) => `${studentId}:${subjectId}`

/**
 * Terapkan style ke setiap cell dalam satu baris header.
 * SheetJS community tidak mendukung styling — kita pakai
 * metode `!cols` untuk lebar kolom dan workbook properties saja.
 * Style visual (bold/color) butuh SheetJS Pro, jadi kita tangani
 * dengan cara yang kompatibel: nama sheet, kolom lebar, freeze panes.
 */
export function setColWidths(ws, widths) {
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

export function addFreezePanes(ws, row, col) {
  ws['!freeze'] = { xSplit: col, ySplit: row }
}

/**
 * Sheet 1 — Rekap Nilai Akhir per Siswa per Mapel
 * Kolom: No | Nama | NISN | Kelas | <setiap mapel> | Rata-rata
 */
export async function buildRekapSheet(students, subjects, allScores) {
  const XLSX = await loadXLSX()

  const scoreByStudentSubject = new Map(
    allScores.map((sc) => [scoreKey(sc.student_id, sc.subject_id), sc]),
  )

  const headers = [
    'No',
    'Nama Siswa',
    'NISN',
    'Kelas',
    ...subjects.map(s => s.name),
    'Rata-rata',
  ]

  const rows = students.map((student, idx) => {
    const subjectScores = subjects.map(sub => {
      const sc = scoreByStudentSubject.get(scoreKey(student.id, sub.id))
      return sc?.final_score ?? ''
    })
    const numericScores = subjectScores.filter(v => v !== '' && !isNaN(Number(v)))
    const avg = numericScores.length > 0
      ? Number((numericScores.reduce((a, b) => a + Number(b), 0) / numericScores.length).toFixed(1))
      : ''

    return [idx + 1, student.name, student.nisn, student.class_name, ...subjectScores, avg]
  })

  const wsData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Lebar kolom: No(5), Nama(30), NISN(15), Kelas(10), mapel(14 each), Rata-rata(12)
  setColWidths(ws, [5, 30, 15, 10, ...subjects.map(() => 14), 12])
  addFreezePanes(ws, 1, 0)
  return ws
}

/**
 * Sheet 2 — Detail Nilai per Komponen (dinamis mengikuti format penilaian periode).
 * Satu baris per siswa per mapel.
 * Kolom: Nama | NISN | Mapel | [per komponen: kolom nilai/TP + Rrt] | Nilai Rapor | Capaian
 */
export async function buildDetailSheet(
  students,
  subjects,
  allScores,
  components,
  items,
  learningTargets,
) {
  const XLSX = await loadXLSX()

  const scoreByStudentSubject = new Map(
    allScores.map((sc) => [scoreKey(sc.student_id, sc.subject_id), sc]),
  )

  // Susun definisi kolom per komponen (urut sort_order)
  const componentColumns = components.map((component) => {
    if (component.kind === 'fixed') {
      const subs = getFixedSubs(component)
      return { component, subs, type: 'fixed' }
    }
    // countable / countable with_tp: kolom per TP (with_tp) atau per item
    if (component.with_tp) {
      const compItems = itemsOfComponent(component.id, items)
      const tpCols = compItems.flatMap((item) =>
        learningTargets
          .filter((tp) => tp.assessment_item_id === item.id)
          .map((tp) => ({ tp, item })),
      )
      return { component, subs: tpCols, type: 'tp' }
    }
    const compItems = itemsOfComponent(component.id, items)
    return { component, subs: compItems, type: 'item' }
  })

  const headers = [
    'Nama Siswa',
    'NISN',
    'Mata Pelajaran',
    ...componentColumns.flatMap(({ component, subs, type }) => [
      ...subs.map((sub) => {
        if (type === 'tp') return `${component.name}: ${sub.tp.code}`
        if (type === 'item') return `${component.name}: ${sub.name}`
        return `${component.name} ${sub.label}`
      }),
      `Rrt ${component.name}`,
    ]),
    'Nilai Rapor',
    'Capaian Tertinggi',
    'Capaian Terendah',
  ]

  const rows = []
  students.forEach((student) => {
    subjects.forEach((sub) => {
      const sc = scoreByStudentSubject.get(scoreKey(student.id, sub.id))

      // Item & TP milik subjek ini saja (agar nilai mapel lain tidak tercampur)
      const subjectItems = items.filter((item) => item.subject_id === sub.id)
      const subjectItemIds = new Set(subjectItems.map((item) => item.id))
      const subjectTps = learningTargets.filter((tp) => subjectItemIds.has(tp.assessment_item_id))

      const cellValues = componentColumns.flatMap(({ component, subs, type }) => {
        let values
        if (type === 'fixed') {
          const fixed = sc?.fixed_scores?.[component.id] ?? {}
          values = subs.map((sub) => fixed[sub.key] ?? '')
        } else if (type === 'tp') {
          values = subs.map(({ tp, item }) =>
            item.subject_id === sub.id ? (sc?.scores_formative?.[tp.id] ?? '') : '',
          )
        } else {
          values = subs.map((item) =>
            item.subject_id === sub.id ? (sc?.scores_summative?.[item.id] ?? '') : '',
          )
        }

        const compValue = sc
          ? getComponentValue(component, subjectItems, subjectTps, sc)
          : null

        return [...values, compValue === null ? '' : compValue]
      })

      rows.push([
        student.name,
        student.nisn,
        sub.name,
        ...cellValues,
        sc?.final_score ?? '',
        sc?.highest_achievement ?? '',
        sc?.lowest_achievement ?? '',
      ])
    })
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  const fixedCols = [30, 15, 22] // Nama, NISN, Mapel
  const perComponentCols = componentColumns.flatMap(({ subs }) => [
    ...subs.map(() => 12),
    11, // Rrt
  ])
  setColWidths(ws, [...fixedCols, ...perComponentCols, 12, 40, 40])
  addFreezePanes(ws, 1, 3)
  return ws
}

/**
 * Sheet 3 — Kehadiran
 */
export async function buildKehadiranSheet(students, allAttendance) {
  const XLSX = await loadXLSX()

  const attendanceByStudent = new Map(allAttendance.map(a => [a.student_id, a]))

  const headers = ['No', 'Nama Siswa', 'NISN', 'Kelas', 'Sakit (hari)', 'Izin (hari)', 'Alpha (hari)', 'Total Tidak Hadir']
  const rows = students.map((student, idx) => {
    const att = attendanceByStudent.get(student.id) || { sakit: 0, izin: 0, alpha: 0 }
    const total = (att.sakit || 0) + (att.izin || 0) + (att.alpha || 0)
    return [idx + 1, student.name, student.nisn, student.class_name, att.sakit || 0, att.izin || 0, att.alpha || 0, total]
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  setColWidths(ws, [5, 30, 15, 10, 14, 14, 14, 16])
  addFreezePanes(ws, 1, 0)
  return ws
}
