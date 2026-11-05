import { useCallback, useMemo, useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import {
  Printer,
  Search,
  Eye,
  AlertCircle,
  School,
  CheckCircle,
  Loader2,
  Archive,
  FileSearch,
} from 'lucide-react'
import useExcelExport from './useExcelExport'
import ExportDropdown from './components/ExportDropdown'
import RaporSheet from './components/RaporSheet'
import RincianModal from './components/RincianModal'
import { getExportDetailData } from './cetakRaporService'
import { usePeriodSheetData, usePrintablePeriods, useRincianDetail, useRincianPredicates } from './useCetakRapor'

const EMPTY_ATTENDANCE = { sakit: 0, izin: 0, alpha: 0, catatan_khusus: '' }

export default function CetakRaporPage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [search, setSearch] = useState('')
  const [archiveMode, setArchiveMode] = useState(false)
  const [previewStudent, setPreviewStudent] = useState(null)
  const [rincianStudent, setRincianStudent] = useState(null)
  const [localError, setLocalError] = useState('')

  const { exportToExcel, exporting, exportSuccess } = useExcelExport()

  const printRef = useRef()

  const periodsQuery = usePrintablePeriods(archiveMode)
  const periods = useMemo(() => periodsQuery.data ?? [], [periodsQuery.data])
  const activePeriod = periods.find((p) => p.id === selectedPeriodId)

  const sheetQuery = usePeriodSheetData({
    periodId: selectedPeriodId,
    period: activePeriod,
    archiveMode,
  })

  const rincianEnabled = Boolean(rincianStudent)
  const rincianDetailQuery = useRincianDetail(selectedPeriodId, rincianEnabled)
  const rincianPredicatesQuery = useRincianPredicates(rincianEnabled)

  const students = useMemo(() => sheetQuery.data?.students ?? [], [sheetQuery.data])
  const allSubjects = useMemo(() => sheetQuery.data?.subjects ?? [], [sheetQuery.data])
  const allScores = useMemo(() => sheetQuery.data?.scores ?? [], [sheetQuery.data])
  const allAttendance = useMemo(() => sheetQuery.data?.attendance ?? [], [sheetQuery.data])

  const scoresByStudentId = useMemo(() => {
    const map = new Map()
    allScores.forEach((sc) => {
      const existing = map.get(sc.student_id)
      if (existing) {
        existing.push(sc)
      } else {
        map.set(sc.student_id, [sc])
      }
    })
    return map
  }, [allScores])

  const attendanceByStudentId = useMemo(
    () => new Map(allAttendance.map((att) => [att.student_id, att])),
    [allAttendance],
  )

  const scoreByStudentSubject = useMemo(
    () =>
      new Map(
        allScores.map((sc) => [`${sc.student_id}:${sc.subject_id}`, sc]),
      ),
    [allScores],
  )

  const completedStudentIds = useMemo(() => {
    const completed = new Set()
    if (allSubjects.length === 0) return completed

    students.forEach((student) => {
      const isComplete = allSubjects.every((sub) => {
        const score = scoreByStudentSubject.get(`${student.id}:${sub.id}`)
        return score && score.final_score !== null
      })
      if (isComplete) completed.add(student.id)
    })

    return completed
  }, [allSubjects, scoreByStudentSubject, students])

  const loading = periodsQuery.isLoading
  const loadingSheet = sheetQuery.isFetching

  const periodsError = periodsQuery.error ? 'Gagal mengambil data periode rapor.' : ''
  const sheetError = sheetQuery.error
    ? 'Gagal memuat detail kelas: ' + sheetQuery.error.message
    : ''
  const error = localError || periodsError || sheetError

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: previewStudent ? `Rapor - ${previewStudent.name}` : 'Rapor',
    pageStyle: `
    @page {
      size: A4 portrait;
      margin: 2mm 15mm 2mm 15mm;
    }

    .rapor-sheet {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }

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

  // Kelompokkan periode per tahun ajaran (terbaru dulu) untuk dropdown
  const periodsByYear = useMemo(() => {
    const map = new Map()
    ;(periods ?? []).forEach((period) => {
      const year = period.academic_year || 'Lainnya'
      if (!map.has(year)) map.set(year, [])
      map.get(year).push(period)
    })
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [periods])

  const handleModeChange = (nextMode) => {
    if (nextMode === archiveMode) return
    setArchiveMode(nextMode)
    setSelectedPeriodId('')
    setPreviewStudent(null)
    setRincianStudent(null)
    setLocalError('')
  }

  const handleSelectPeriod = (periodId) => {
    setSelectedPeriodId(periodId)
    setPreviewStudent(null)
    setRincianStudent(null)
    setLocalError('')
  }

  const handleExport = useCallback(
    async (mode) => {
      if (!selectedPeriodId || students.length === 0) return
      setLocalError('')
      try {
        await exportToExcel({
          mode,
          periodId: selectedPeriodId,
          activePeriod,
          students,
          allSubjects,
          allScores,
          allAttendance,
          fetchDetail: getExportDetailData,
        })
      } catch (err) {
        setLocalError('Gagal mengekspor Excel: ' + err.message)
      }
    },
    [
      activePeriod,
      allAttendance,
      allScores,
      allSubjects,
      exportToExcel,
      selectedPeriodId,
      students,
    ],
  )

  const getStudentScores = useCallback(
    (studentId) => scoresByStudentId.get(studentId) ?? [],
    [scoresByStudentId],
  )
  const getStudentAttendance = useCallback(
    (studentId) => attendanceByStudentId.get(studentId) || EMPTY_ATTENDANCE,
    [attendanceByStudentId],
  )

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.toLowerCase()
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(normalizedSearch) || s.nisn.includes(search),
    )
  }, [search, students])

  // Hitung kelengkapan nilai untuk badge
  const completedCount = completedStudentIds.size

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
          {/* Tabs: Periode Aktif / Arsip Rapor */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl" role="tablist" aria-label="Mode tampilan rapor">
            <button
              role="tab"
              aria-selected={!archiveMode}
              onClick={() => handleModeChange(false)}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${!archiveMode ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <School size={13} /> Periode Aktif
            </button>
            <button
              role="tab"
              aria-selected={archiveMode}
              onClick={() => handleModeChange(true)}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${archiveMode ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Archive size={13} /> Arsip Rapor
            </button>
          </div>
        </div>

        {archiveMode && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs flex items-center gap-2">
            <Archive size={14} className="shrink-0" />
            <span>
              Arsip Rapor — hanya menampilkan periode rapor yang sudah diarsipkan (non-aktif).
              Nilai &amp; kehadiran siswa tetap tersimpan dan bisa dicetak/ekspor/diperiksa rinciannya.
            </span>
          </div>
        )}

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
                onChange={(e) => handleSelectPeriod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">-- Pilih Periode Cetak --</option>
                {periodsByYear.map(([year, rows]) => (
                  <optgroup key={year} label={`Tahun Ajaran ${year}`}>
                    {rows.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Kelas {p.class_name}){!p.is_active ? ' [Arsip]' : ''}
                      </option>
                    ))}
                  </optgroup>
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
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}

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
                <span
                  className={`w-2 h-2 rounded-full inline-block ${completedCount === students.length ? 'bg-emerald-500' : 'bg-amber-500'}`}
                ></span>
                <span
                  className={
                    completedCount === students.length ? 'text-emerald-400' : 'text-amber-400'
                  }
                >
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
                  {archiveMode && <span className="ml-1 text-amber-400">(Arsip)</span>}
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
                  filteredStudents.map((student) => {
                    const isSelected = previewStudent?.id === student.id
                    const hasScore = completedStudentIds.has(student.id)

                    return (
                      <div
                        key={student.id}
                        className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${isSelected ? 'bg-emerald-500/10 border-r-2 border-emerald-500' : 'hover:bg-slate-800/30'}`}
                      >
                        <div className="truncate flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-slate-200 truncate">
                              {student.name}
                            </p>
                            {hasScore && (
                              <span
                                className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500"
                                title="Nilai lengkap"
                              ></span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-[10px] text-slate-500 font-mono">
                              NISN: {student.nisn}
                            </p>
                            {student.status === 'alumni' && (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded uppercase">
                                Alumni
                              </span>
                            )}
                            {student.status === 'lulus' && (
                              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1 py-0.5 rounded uppercase">
                                Lulus
                              </span>
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
                            onClick={() => setRincianStudent(student)}
                            className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 rounded-lg transition-all cursor-pointer"
                            title="Rincian Nilai (semua komponen, read-only)"
                          >
                            <FileSearch size={13} />
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
                      <span className="text-sm text-slate-200 font-bold">
                        {previewStudent.name}
                      </span>
                      {(previewStudent.status === 'alumni' ||
                        previewStudent.status === 'lulus') && (
                        <span className="ml-2 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          {previewStudent.graduation_year
                            ? `Lulus ${previewStudent.graduation_year}`
                            : 'Alumni'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRincianStudent(previewStudent)}
                        className="px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer"
                        title="Rincian Nilai (read-only)"
                      >
                        <FileSearch size={13} /> Rincian
                      </button>
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

      {/* Modal Rincian Nilai (read-only, admin) */}
      {rincianStudent && (
        <RincianModal
          student={rincianStudent}
          period={activePeriod}
          allSubjects={allSubjects}
          allScores={allScores}
          components={rincianDetailQuery.data?.components ?? []}
          items={rincianDetailQuery.data?.items ?? []}
          learningTargets={rincianDetailQuery.data?.learningTargets ?? []}
          predicates={rincianPredicatesQuery.data ?? []}
          loading={rincianDetailQuery.isLoading}
          isError={rincianDetailQuery.isError}
          onClose={() => setRincianStudent(null)}
        />
      )}
    </div>
  )
}
