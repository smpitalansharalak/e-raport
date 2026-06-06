import * as XLSX from 'xlsx'

/**
 * Utility functions untuk membuat sheet Excel rapor.
 * Diekstrak dari CetakRapor.jsx agar file utama lebih ringkas.
 */

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
export function buildRekapSheet(students, subjects, allScores) {
  const headers = [
    'No',
    'Nama Siswa',
    'NISN',
    'Kelas',
    ...subjects.map(s => s.name),
    'Rata-rata',
  ]

  const rows = students.map((student, idx) => {
    const scores = allScores.filter(sc => sc.student_id === student.id)
    const subjectScores = subjects.map(sub => {
      const sc = scores.find(s => s.subject_id === sub.id)
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
 * Sheet 2 — Detail Nilai Formatif, Sumatif, STS, SAS per siswa
 * Satu baris per siswa per mapel
 */
export function buildDetailSheet(students, subjects, allScores, materials, learningTargets, summatives) {
  const tpHeaders = learningTargets.map(tp => `F: ${tp.code}`)
  const sumHeaders = summatives.map(s => `S: ${s.name}`)

  const headers = [
    'Nama Siswa',
    'NISN',
    'Mata Pelajaran',
    ...tpHeaders,
    'Rata Formatif',
    ...sumHeaders,
    'Rata Sumatif',
    'STS Praktik',
    'STS Tertulis',
    'Rata STS',
    'SAS Praktik',
    'SAS Tertulis',
    'Rata SAS',
    'Nilai Rapor',
    'Capaian Tertinggi',
    'Capaian Terendah',
  ]

  const rows = []
  students.forEach(student => {
    subjects.forEach(sub => {
      const sc = allScores.find(
        s => s.student_id === student.id && s.subject_id === sub.id
      )

      const tpVals = learningTargets.map(tp =>
        sc?.scores_formative?.[tp.id] ?? ''
      )
      const sumVals = summatives.map(s =>
        sc?.scores_summative?.[s.id] ?? ''
      )

      const numTP = tpVals.filter(v => v !== '' && !isNaN(Number(v)))
      const rataF = numTP.length > 0
        ? Number((numTP.reduce((a, b) => a + Number(b), 0) / numTP.length).toFixed(1))
        : ''

      const numSum = sumVals.filter(v => v !== '' && !isNaN(Number(v)))
      const rataS = numSum.length > 0
        ? Number((numSum.reduce((a, b) => a + Number(b), 0) / numSum.length).toFixed(1))
        : ''

      const stsPrak = sc?.sts_practice ?? ''
      const stsTulis = sc?.sts_written ?? ''
      const rataSTS = stsPrak !== '' && stsTulis !== ''
        ? Number(((Number(stsPrak) + Number(stsTulis)) / 2).toFixed(1))
        : stsPrak !== '' ? Number(stsPrak)
          : stsTulis !== '' ? Number(stsTulis)
            : ''

      const sasPrak = sc?.sas_practice ?? ''
      const sasTulis = sc?.sas_written ?? ''
      const rataSAS = sasPrak !== '' && sasTulis !== ''
        ? Number(((Number(sasPrak) + Number(sasTulis)) / 2).toFixed(1))
        : sasPrak !== '' ? Number(sasPrak)
          : sasTulis !== '' ? Number(sasTulis)
            : ''

      rows.push([
        student.name,
        student.nisn,
        sub.name,
        ...tpVals,
        rataF,
        ...sumVals,
        rataS,
        stsPrak,
        stsTulis,
        rataSTS,
        sasPrak,
        sasTulis,
        rataSAS,
        sc?.final_score ?? '',
        sc?.highest_achievement ?? '',
        sc?.lowest_achievement ?? '',
      ])
    })
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  const fixedCols = [30, 15, 22] // Nama, NISN, Mapel
  const tpCols = learningTargets.map(() => 10)
  const sumCols = summatives.map(() => 14)
  setColWidths(ws, [...fixedCols, ...tpCols, 12, ...sumCols, 12, 10, 12, 10, 10, 12, 10, 12, 14, 40, 40])
  addFreezePanes(ws, 1, 3)
  return ws
}

/**
 * Sheet 3 — Kehadiran
 */
export function buildKehadiranSheet(students, allAttendance) {
  const headers = ['No', 'Nama Siswa', 'NISN', 'Kelas', 'Sakit (hari)', 'Izin (hari)', 'Alpha (hari)', 'Total Tidak Hadir']
  const rows = students.map((student, idx) => {
    const att = allAttendance.find(a => a.student_id === student.id) || { sakit: 0, izin: 0, alpha: 0 }
    const total = (att.sakit || 0) + (att.izin || 0) + (att.alpha || 0)
    return [idx + 1, student.name, student.nisn, student.class_name, att.sakit || 0, att.izin || 0, att.alpha || 0, total]
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  setColWidths(ws, [5, 30, 15, 10, 14, 14, 14, 16])
  addFreezePanes(ws, 1, 0)
  return ws
}
