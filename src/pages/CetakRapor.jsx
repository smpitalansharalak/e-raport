import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useReactToPrint } from 'react-to-print'
import { supabase } from '../lib/supabase'
import {
  Printer,
  Search,
  Eye,
  AlertCircle,
  School,
  Users,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import useExcelExport from '../hooks/useExcelExport'
import ExportDropdown from '../components/rapor/ExportDropdown'
import RaporSheet from '../components/rapor/RaporSheet'

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
    @page {
      size: A4 portrait;
      margin: 5mm 15mm 15mm 15mm;
    }

    .rapor-sheet {
      padding-top: 0 !important;
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
        .select('subject:subjects(id, name), sort_order')
        .eq('report_period_id', periodId)
        .order('sort_order', { ascending: true })
      if (subErr) throw subErr
      // Urutkan berdasarkan sort_order, fallback ke nama jika sort_order null
      setAllSubjects(
        (subData || [])
          .sort((a, b) => {
            const ao = a.sort_order ?? 9999
            const bo = b.sort_order ?? 9999
            return ao !== bo ? ao - bo : (a.subject?.name || '').localeCompare(b.subject?.name || '')
          })
          .map((r) => r.subject)
          .filter(Boolean)
      )

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

        {alumniMode && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs flex items-center gap-2">
            <Users size={14} className="shrink-0" />
            Mode Alumni — semua periode rapor (aktif maupun arsip) ditampilkan.
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