import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useReactToPrint } from 'react-to-print'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'
import {
  Printer,
  Search,
  Eye,
  AlertCircle,
  School,
  Users,
  Download,
  FileSpreadsheet,
  ChevronDown,
  CheckCircle,
  Loader2,
} from 'lucide-react'

// ─────────────────────────────────────────
// Utilitas ekspor Excel
// ─────────────────────────────────────────

/**
 * Terapkan style ke setiap cell dalam satu baris header.
 * SheetJS community tidak mendukung styling — kita pakai
 * metode `!cols` untuk lebar kolom dan workbook properties saja.
 * Style visual (bold/color) butuh SheetJS Pro, jadi kita tangani
 * dengan cara yang kompatibel: nama sheet, kolom lebar, freeze panes.
 */
function setColWidths(ws, widths) {
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

function addFreezePanes(ws, row, col) {
  ws['!freeze'] = { xSplit: col, ySplit: row }
}

/**
 * Sheet 1 — Rekap Nilai Akhir per Siswa per Mapel
 * Kolom: No | Nama | NISN | Kelas | <setiap mapel> | Rata-rata
 */
function buildRekapSheet(students, subjects, allScores) {
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
function buildDetailSheet(students, subjects, allScores, materials, learningTargets, summatives) {
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
function buildKehadiranSheet(students, allAttendance) {
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

// ─────────────────────────────────────────
// Hook utama ekspor
// ─────────────────────────────────────────
function useExcelExport() {
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState('')

  const exportToExcel = useCallback(async ({
    mode,          // 'rekap' | 'detail' | 'lengkap'
    periodId,
    activePeriod,
    students,
    allSubjects,
    allScores,
    allAttendance,
    // detail mode needs extra data fetched on demand
    fetchDetail,
  }) => {
    setExporting(true)
    setExportSuccess('')
    try {
      const wb = XLSX.utils.book_new()
      const periodName = activePeriod
        ? `${activePeriod.class_name}_${activePeriod.semester}_${activePeriod.academic_year.replace('/', '-')}`
        : 'Rapor'

      // Info sheet selalu ada
      const infoData = [
        ['E-Rapor SMP IT Al Anshar'],
        [''],
        ['Periode', activePeriod?.name || '-'],
        ['Kelas', activePeriod?.class_name || '-'],
        ['Semester', activePeriod?.semester || '-'],
        ['Tahun Ajaran', activePeriod?.academic_year || '-'],
        ['Wali Kelas', activePeriod?.wali_kelas?.name || '-'],
        ['Kepala Sekolah', activePeriod?.kepala_sekolah_name || '-'],
        [''],
        ['Diekspor pada', new Date().toLocaleString('id-ID')],
        ['Jumlah Siswa', students.length],
        ['Jumlah Mata Pelajaran', allSubjects.length],
      ]
      const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
      setColWidths(wsInfo, [22, 40])
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Info')

      if (mode === 'rekap' || mode === 'lengkap') {
        const wsRekap = buildRekapSheet(students, allSubjects, allScores)
        XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap Nilai')
      }

      if (mode === 'detail' || mode === 'lengkap') {
        // Fetch materials, TP, summatives jika belum ada
        const { materials, learningTargets, summatives } = await fetchDetail(periodId)
        const wsDetail = buildDetailSheet(students, allSubjects, allScores, materials, learningTargets, summatives)
        XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Nilai')
      }

      if (mode === 'lengkap') {
        const wsAtt = buildKehadiranSheet(students, allAttendance)
        XLSX.utils.book_append_sheet(wb, wsAtt, 'Kehadiran')
      } else if (mode === 'rekap') {
        const wsAtt = buildKehadiranSheet(students, allAttendance)
        XLSX.utils.book_append_sheet(wb, wsAtt, 'Kehadiran')
      }

      const fileName = `Rekap_Rapor_${periodName}.xlsx`
      XLSX.writeFile(wb, fileName)
      setExportSuccess(`File "${fileName}" berhasil diunduh!`)
      setTimeout(() => setExportSuccess(''), 5000)
    } catch (err) {
      console.error('Export error:', err)
      throw err
    } finally {
      setExporting(false)
    }
  }, [])

  return { exportToExcel, exporting, exportSuccess }
}

// ─────────────────────────────────────────
// Dropdown Ekspor
// ─────────────────────────────────────────
function ExportDropdown({ onExport, disabled, exporting }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const options = [
    {
      mode: 'rekap',
      label: 'Rekap Nilai Akhir',
      desc: 'Nilai rapor final tiap siswa per mapel + kehadiran',
      icon: FileSpreadsheet,
    },
    {
      mode: 'detail',
      label: 'Detail Formatif & Sumatif',
      desc: 'Semua nilai TP, sumatif, STS, SAS, dan deskripsi',
      icon: FileSpreadsheet,
    },
    {
      mode: 'lengkap',
      label: 'Ekspor Lengkap (3 sheet)',
      desc: 'Info + Rekap + Detail + Kehadiran dalam satu file',
      icon: FileSpreadsheet,
    },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={disabled || exporting}
        className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 px-3.5 py-2 rounded-xl font-bold text-xs shadow transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {exporting ? 'Mengekspor...' : 'Ekspor Excel'}
        {!exporting && <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && !exporting && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
              Pilih format ekspor
            </p>
          </div>
          <div className="p-2 space-y-1">
            {options.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.mode}
                  onClick={() => { setOpen(false); onExport(opt.mode) }}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-slate-800/60 text-left transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg mt-0.5 group-hover:bg-indigo-500/20 transition-colors shrink-0">
                    <Icon size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{opt.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{opt.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/30">
            <p className="text-[10px] text-slate-600">
              Format: .xlsx · Kompatibel dengan Excel, LibreOffice, Google Sheets
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// Komponen Utama CetakRapor
// ─────────────────────────────────────────
export default function CetakRapor() {
  const [periods, setPeriods] = useState([])
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [alumniMode, setAlumniMode] = useState(false)

  const [allSubjects, setAllSubjects] = useState([])
  const [allScores, setAllScores] = useState([])
  const [allAttendance, setAllAttendance] = useState([])

  const [previewStudent, setPreviewStudent] = useState(null)

  const { exportToExcel, exporting, exportSuccess } = useExcelExport()

  const printRef = useRef()

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: previewStudent ? `Rapor - ${previewStudent.name}` : 'Rapor',
    pageStyle: `
      @page { size: A4 portrait; margin: 15mm; }
      .print-avoid-break {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    `,
  })

  const handlePrintStudent = (student) => {
    if (previewStudent?.id !== student.id) {
      setPreviewStudent(student)
      setTimeout(() => handlePrint(), 300)
    } else {
      handlePrint()
    }
  }

  useEffect(() => {
    fetchPeriods()
  }, [alumniMode])

  const fetchPeriods = async () => {
    setLoading(true)
    setError('')
    setStudents([])
    setSelectedPeriodId('')
    setPreviewStudent(null)
    try {
      let q = supabase
        .from('report_periods')
        .select('id, name, class_name, semester, academic_year, kepala_sekolah_name, is_active, wali_kelas:profiles(id, name)')
        .order('created_at', { ascending: false })
      if (!alumniMode) q = q.eq('is_active', true)
      const { data, error } = await q
      if (error) throw error
      setPeriods(data || [])
    } catch (err) {
      setError('Gagal mengambil data periode rapor.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPeriod = async (periodId) => {
    setSelectedPeriodId(periodId)
    setPreviewStudent(null)
    if (!periodId) { setStudents([]); return }

    setLoadingSheet(true)
    setError('')
    try {
      const period = periods.find(p => p.id === periodId)
      if (!period) throw new Error('Periode tidak ditemukan')

      let q = supabase
        .from('students')
        .select('id, name, nisn, class_name, academic_year, phase, parent_name, status, graduation_year, previous_class')
        .eq('class_name', period.class_name)
        .eq('academic_year', period.academic_year)
        .order('name', { ascending: true })

      if (alumniMode) {
        q = supabase
          .from('students')
          .select('id, name, nisn, class_name, academic_year, phase, parent_name, status, graduation_year, previous_class')
          .or(`and(class_name.eq.${period.class_name},academic_year.eq.${period.academic_year}),and(previous_class.eq.${period.class_name},academic_year.eq.${period.academic_year})`)
          .order('name', { ascending: true })
      }

      const { data: sData, error: sErr } = await q
      if (sErr) throw sErr
      setStudents(sData || [])

      const { data: subData, error: subErr } = await supabase
        .from('report_subjects')
        .select('subject:subjects(id, name)')
        .eq('report_period_id', periodId)
      if (subErr) throw subErr
      setAllSubjects(subData.map(r => r.subject).filter(Boolean))

      const { data: scoreData, error: scoreErr } = await supabase
        .from('student_scores')
        .select('student_id, subject_id, scores_formative, scores_summative, sts_practice, sts_written, sas_practice, sas_written, final_score, highest_achievement, lowest_achievement')
        .eq('report_period_id', periodId)
      if (scoreErr) throw scoreErr
      setAllScores(scoreData || [])

      const { data: attData, error: attErr } = await supabase
        .from('student_attendance')
        .select('student_id, sakit, izin, alpha, catatan_khusus')
        .eq('report_period_id', periodId)
      if (attErr) throw attErr
      setAllAttendance(attData || [])
    } catch (err) {
      setError('Gagal memuat detail kelas: ' + err.message)
    } finally {
      setLoadingSheet(false)
    }
  }

  // Fetch detail data (materials, TPs, summatives) on demand saat ekspor detail
  const fetchDetailData = useCallback(async (periodId) => {
    const { data: mData } = await supabase
      .from('materials')
      .select('id')
      .eq('report_period_id', periodId)
      .order('created_at', { ascending: true })
    const materials = mData || []

    let learningTargets = []
    if (materials.length > 0) {
      const { data: tpData } = await supabase
        .from('learning_targets')
        .select('id, code, material_id')
        .in('material_id', materials.map(m => m.id))
        .order('code', { ascending: true })
      learningTargets = tpData || []
    }

    const { data: sumData } = await supabase
      .from('summatives')
      .select('id, name')
      .eq('report_period_id', periodId)
      .order('created_at', { ascending: true })

    return { materials, learningTargets, summatives: sumData || [] }
  }, [])

  const handleExport = useCallback(async (mode) => {
    if (!selectedPeriodId || students.length === 0) return
    try {
      await exportToExcel({
        mode,
        periodId: selectedPeriodId,
        activePeriod: periods.find(p => p.id === selectedPeriodId),
        students,
        allSubjects,
        allScores,
        allAttendance,
        fetchDetail: fetchDetailData,
      })
    } catch (err) {
      setError('Gagal mengekspor Excel: ' + err.message)
    }
  }, [selectedPeriodId, students, allSubjects, allScores, allAttendance, periods, exportToExcel, fetchDetailData])

  const getStudentScores = (studentId) => allScores.filter(sc => sc.student_id === studentId)
  const getStudentAttendance = (studentId) =>
    allAttendance.find(att => att.student_id === studentId) || { sakit: 0, izin: 0, alpha: 0, catatan_khusus: '' }

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.nisn.includes(search)
  )

  const activePeriod = periods.find(p => p.id === selectedPeriodId)

  // Hitung kelengkapan nilai untuk badge
  const completedCount = students.filter(s =>
    allSubjects.length > 0 &&
    allSubjects.every(sub => allScores.some(sc => sc.student_id === s.id && sc.subject_id === sub.id && sc.final_score !== null))
  ).length

  if (loading && periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-slate-400">Memuat periode cetak...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 m-0">Cetak &amp; Ekspor Rapor</h2>
            <p className="text-sm text-slate-400 mt-1">
              Cetak PDF individual atau ekspor rekap nilai ke Excel per kelas.
            </p>
          </div>
          {/* Toggle Mode Alumni */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setAlumniMode(false)}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${!alumniMode ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <School size={13} /> Siswa Aktif
            </button>
            <button
              onClick={() => setAlumniMode(true)}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${alumniMode ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Users size={13} /> Alumni / Arsip
            </button>
          </div>
        </div>

        {/* Banner mode alumni */}
        {alumniMode && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs flex items-center gap-2">
            <Users size={14} className="shrink-0" />
            Mode Alumni — semua periode rapor (aktif maupun arsip) ditampilkan.
          </div>
        )}

        {/* Notifikasi ekspor sukses */}
        {exportSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-sm">
            <CheckCircle size={16} className="shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pilih Rapor &amp; Kelas
              </label>
              <select
                value={selectedPeriodId}
                onChange={e => handleSelectPeriod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">-- Pilih Periode Cetak --</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Kelas {p.class_name}){!p.is_active ? ' [Arsip]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedPeriodId && (
              <div className="relative w-full md:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Cari murid..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}

            {/* Tombol ekspor Excel */}
            {selectedPeriodId && students.length > 0 && (
              <ExportDropdown
                onExport={handleExport}
                disabled={loadingSheet || students.length === 0}
                exporting={exporting}
              />
            )}
          </div>

          {/* Statistik kelengkapan */}
          {selectedPeriodId && students.length > 0 && !loadingSheet && (
            <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-800/60">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>{students.length} siswa</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block"></span>
                <span>{allSubjects.length} mata pelajaran</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full inline-block ${completedCount === students.length ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className={completedCount === students.length ? 'text-emerald-400' : 'text-amber-400'}>
                  {completedCount}/{students.length} nilai lengkap
                </span>
              </div>
              {allScores.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-500 inline-block"></span>
                  <span>{allScores.length} entri nilai tersimpan</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Grid */}
        {selectedPeriodId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Daftar Murid */}
            <div className="lg:col-span-1 bg-slate-900/65 border border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[640px]">
              <div className="p-4 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Kelas {activePeriod?.class_name}
                  {alumniMode && <span className="ml-1 text-amber-400">(Arsip)</span>}
                </span>
                <span className="text-[10px] text-slate-500">
                  {filteredStudents.length} siswa
                </span>
              </div>

              <div className="divide-y divide-slate-800/50 overflow-y-auto flex-1">
                {loadingSheet ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                    Memuat data murid...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <p className="p-6 text-center text-slate-500 text-xs italic">
                    Tidak ada siswa ditemukan.
                  </p>
                ) : (
                  filteredStudents.map(student => {
                    const isSelected = previewStudent?.id === student.id
                    const hasScore = allSubjects.length > 0 &&
                      allSubjects.every(sub => allScores.some(sc => sc.student_id === student.id && sc.subject_id === sub.id && sc.final_score !== null))

                    return (
                      <div
                        key={student.id}
                        className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${isSelected ? 'bg-emerald-500/10 border-r-2 border-emerald-500' : 'hover:bg-slate-800/30'}`}
                      >
                        <div className="truncate flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-slate-200 truncate">{student.name}</p>
                            {hasScore && (
                              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" title="Nilai lengkap"></span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-[10px] text-slate-500 font-mono">NISN: {student.nisn}</p>
                            {student.status === 'alumni' && (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded uppercase">Alumni</span>
                            )}
                            {student.status === 'lulus' && (
                              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1 py-0.5 rounded uppercase">Lulus</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setPreviewStudent(student)}
                            className="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg hover:border-slate-700 transition-all cursor-pointer"
                            title="Pratinjau Rapor"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handlePrintStudent(student)}
                            className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-all cursor-pointer"
                            title="Cetak PDF"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="lg:col-span-2 space-y-4">
              {previewStudent ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl gap-3 flex-wrap">
                    <div>
                      <span className="text-xs text-slate-400">Pratinjau: </span>
                      <span className="text-sm text-slate-200 font-bold">{previewStudent.name}</span>
                      {(previewStudent.status === 'alumni' || previewStudent.status === 'lulus') && (
                        <span className="ml-2 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          {previewStudent.graduation_year ? `Lulus ${previewStudent.graduation_year}` : 'Alumni'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <ExportDropdown
                        onExport={handleExport}
                        disabled={false}
                        exporting={exporting}
                      />
                      <button
                        onClick={() => handlePrint()}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                      >
                        <Printer size={13} /> Cetak PDF
                      </button>
                    </div>
                  </div>
                  <div className="overflow-auto rounded-2xl border border-slate-200 shadow-md">
                    <RaporSheet
                      ref={printRef}
                      previewStudent={previewStudent}
                      activePeriod={activePeriod}
                      allSubjects={allSubjects}
                      getStudentScores={getStudentScores}
                      getStudentAttendance={getStudentAttendance}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center h-full flex flex-col justify-center items-center gap-3">
                  <div className="p-4 bg-slate-800/40 rounded-2xl">
                    <School size={40} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-400">Pratinjau Rapor</p>
                    <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                      Pilih murid di panel kiri untuk melihat pratinjau, atau klik{' '}
                      <span className="text-indigo-400 font-semibold">Ekspor Excel</span> untuk
                      mengunduh rekap seluruh kelas.
                    </p>
                  </div>
                  {selectedPeriodId && students.length > 0 && (
                    <ExportDropdown
                      onExport={handleExport}
                      disabled={loadingSheet}
                      exporting={exporting}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rapor Sheet — only visible during print */}
      {previewStudent && (
        <div className="hidden print:block">
          <RaporSheet
            ref={printRef}
            previewStudent={previewStudent}
            activePeriod={activePeriod}
            allSubjects={allSubjects}
            getStudentScores={getStudentScores}
            getStudentAttendance={getStudentAttendance}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// Komponen Lembar Rapor
// ─────────────────────────────────────────
const RaporSheet = React.forwardRef(function RaporSheet(
  { previewStudent, activePeriod, allSubjects, getStudentScores, getStudentAttendance },
  ref
) {
  const att = getStudentAttendance(previewStudent.id)
  const scores = getStudentScores(previewStudent.id)
  const catatanKhusus = att.catatan_khusus || ''

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 select-none"
      style={{ fontFamily: 'Arial, sans-serif', minWidth: '600px' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-center border-b-2 border-black pb-4">
        <img src="/logo.webp" alt="Logo" className="h-20 w-auto mr-4 object-contain" />
        <div className="text-center">
          <p className="font-bold text-sm tracking-wide">YAYASAN AL-ANSHAR AN'NUR</p>
          <p className="font-bold text-[14px] leading-none my-1 uppercase whitespace-nowrap">
            SEKOLAH MENENGAH PERTAMA ISLAM TERPADU (SMP-IT) AL ANSHAR
          </p>
          <p className="text-[10px] leading-tight text-gray-700">
            NPSN : 70055902 | Email : smpitalansharalak@gmail.com | HP : 0812 3743 8357
          </p>
          <p className="text-[10px] leading-tight text-gray-700 mt-0.5">
            Jl. Waikelo No. 32, RT.26 RW 06, Kel. Penkase Oeleta, Kec. Alak, Kota Kupang-NTT
          </p>
        </div>
      </div>

      {/* ── Judul ── */}
      <div className="text-center my-6">
        <p className="font-bold text-base tracking-widest underline">LAPORAN HASIL BELAJAR</p>
      </div>

      {/* ── Info Siswa ── */}
      <div className="grid grid-cols-2 text-xs gap-x-8 mb-6 leading-relaxed">
        <div className="space-y-1">
          <p className="flex"><span className="w-24">Nama</span>: <span className="font-bold ml-1">{previewStudent.name}</span></p>
          <p className="flex"><span className="w-24">NIS/NISN</span><span className="ml-1">: {previewStudent.nisn}</span></p>
          <p className="flex"><span className="w-24">Nama Sekolah</span><span className="ml-1">: SMP IT Al Anshar</span></p>
        </div>
        <div className="space-y-1">
          <p className="flex"><span className="w-28">Kelas / Fase</span><span className="ml-1">: {activePeriod?.class_name} / {previewStudent.phase}</span></p>
          <p className="flex"><span className="w-28">Semester</span><span className="ml-1">: {activePeriod?.semester}</span></p>
          <p className="flex"><span className="w-28">Tahun Ajaran</span><span className="ml-1">: {activePeriod?.academic_year}</span></p>
        </div>
      </div>

      {/* ── Tabel Nilai — boleh overflow ke halaman berikutnya ── */}
      <table className="w-full border-collapse text-[11px] mb-0" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="bg-white text-black font-bold">
            <th className="py-2 px-3 text-center" style={{ border: '1px solid black', width: '40px' }}>No</th>
            <th className="py-2 px-3 text-left" style={{ border: '1px solid black' }}>Mata Pelajaran</th>
            <th className="py-2 px-3 text-center" style={{ border: '1px solid black', width: '80px' }}>Nilai Akhir</th>
            <th className="py-2 px-3 text-left" style={{ border: '1px solid black', width: '220px' }}>Capaian Tertinggi</th>
            <th className="py-2 px-3 text-left" style={{ border: '1px solid black', width: '220px' }}>Capaian Terendah</th>
          </tr>
        </thead>
        <tbody>
          {allSubjects.length === 0 ? (
            <tr>
              <td colSpan="5" className="py-6 text-center text-gray-500 italic" style={{ border: '1px solid black' }}>
                Belum ada mata pelajaran rapor dikonfigurasi.
              </td>
            </tr>
          ) : (
            allSubjects.map((sub, index) => {
              const score = scores.find(sc => sc.subject_id === sub.id)
              return (
                <tr key={sub.id}>
                  <td className="py-2.5 px-3 text-center font-mono" style={{ border: '1px solid black' }}>{index + 1}</td>
                  <td className="py-2.5 px-3 font-semibold" style={{ border: '1px solid black' }}>{sub.name}</td>
                  <td className="py-2.5 px-3 text-center font-bold" style={{ border: '1px solid black' }}>{score ? score.final_score : '-'}</td>
                  <td className="py-2 px-3 text-[10px] leading-snug" style={{ border: '1px solid black' }}>{score?.highest_achievement || '-'}</td>
                  <td className="py-2 px-3 text-[10px] leading-snug" style={{ border: '1px solid black' }}>{score?.lowest_achievement || '-'}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {/*
        ── Blok bawah: Catatan Khusus + Kepatuhan + TTD ──
        Dibungkus dalam satu div dengan break-inside:avoid agar
        ketiga elemen ini tidak pernah dipisah di tengah oleh page break.
        Jika nilai overflow ke hal.2, blok ini mengalir setelah nilai selesai
        dan tetap menyatu (tidak paksa halaman baru, tapi tidak terpotong).
      */}
      <div
        className="print-avoid-break"
        style={{
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
          marginTop: '16px',
        }}
      >
        {/* ── Catatan Khusus Wali Kelas ── */}
        <div
          className="text-xs mb-4"
          style={{ border: '1px solid black', padding: '10px 12px' }}
        >
          <p className="font-bold uppercase pb-1 mb-2" style={{ borderBottom: '1px solid black' }}>
            Catatan Wali Kelas
          </p>
          <p
            className="leading-relaxed text-[11px] min-h-[32px]"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {catatanKhusus || <span className="text-gray-400 italic">—</span>}
          </p>
        </div>

        {/* ── Ketidakhadiran / Kepatuhan Siswa ── */}
        <div
          className="text-xs mb-6"
          style={{ border: '1px solid black', width: '256px', padding: '10px 12px' }}
        >
          <p className="font-bold uppercase pb-1 mb-1.5" style={{ borderBottom: '1px solid black' }}>Ketidakhadiran</p>
          <p className="flex justify-between"><span>Sakit</span> <span>: {att.sakit} hari</span></p>
          <p className="flex justify-between"><span>Izin</span> <span>: {att.izin} hari</span></p>
          <p className="flex justify-between"><span>Tanpa Keterangan (Alpha)</span> <span>: {att.alpha} hari</span></p>
        </div>

        {/* ── Tanda Tangan ── */}
        <div className="grid grid-cols-2 text-xs gap-y-12 mt-10">
          <div className="text-center">
            <p className="mb-16">Orang Tua / Wali Murid,</p>
            <p className="font-bold underline uppercase">{previewStudent.parent_name || '............................'}</p>
          </div>
          <div className="text-center">
            <p className="mb-0">Kota Kupang, Desember 2025</p>
            <p className="mb-16">Wali Kelas,</p>
            <p className="font-bold underline uppercase">{activePeriod?.wali_kelas?.name || '............................'}</p>
          </div>
          <div className="col-span-2 text-center mt-6">
            <p className="mb-0">Mengetahui,</p>
            <p className="mb-16">Kepala Sekolah SMP IT Al Anshar</p>
            <p className="font-bold underline uppercase">{activePeriod?.kepala_sekolah_name || '............................'}</p>
          </div>
        </div>
      </div>
    </div>
  )
})