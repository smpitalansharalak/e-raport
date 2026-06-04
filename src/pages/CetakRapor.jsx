import React, { useEffect, useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { supabase } from '../lib/supabase'
import {
  Printer,
  Search,
  Eye,
  AlertCircle,
  School,
  Users,
} from 'lucide-react'

export default function CetakRapor() {
  const [periods, setPeriods] = useState([])
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  // Apakah sedang mencari rapor alumni (tanpa filter is_active)
  const [alumniMode, setAlumniMode] = useState(false)

  const [allSubjects, setAllSubjects] = useState([])
  const [allScores, setAllScores] = useState([])
  const [allAttendance, setAllAttendance] = useState([])

  const [previewStudent, setPreviewStudent] = useState(null)

  const printRef = useRef()

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: previewStudent ? `Rapor - ${previewStudent.name}` : 'Rapor',
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 15mm 15mm 15mm 15mm;
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
        .select(`*, wali_kelas:profiles(id, name)`)
        .order('created_at', { ascending: false })

      // Mode normal: hanya rapor aktif. Mode alumni: semua rapor
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
    if (!periodId) {
      setStudents([])
      return
    }

    setLoadingSheet(true)
    setError('')
    try {
      const period = periods.find((p) => p.id === periodId)
      if (!period) throw new Error('Periode tidak ditemukan')

      // Ambil siswa berdasarkan kelas & tahun ajaran, termasuk alumni
      let q = supabase
        .from('students')
        .select('*')
        .eq('class_name', period.class_name)
        .eq('academic_year', period.academic_year)
        .order('name', { ascending: true })

      // Dalam mode alumni: juga ambil siswa yang pernah di kelas ini (berdasarkan previous_class)
      // Supabase OR filter
      if (alumniMode) {
        q = supabase
          .from('students')
          .select('*')
          .or(`and(class_name.eq.${period.class_name},academic_year.eq.${period.academic_year}),and(previous_class.eq.${period.class_name},academic_year.eq.${period.academic_year})`)
          .order('name', { ascending: true })
      }

      const { data: sData, error: sErr } = await q
      if (sErr) throw sErr
      setStudents(sData || [])

      const { data: subData, error: subErr } = await supabase
        .from('report_subjects')
        .select(`subject:subjects(id, name)`)
        .eq('report_period_id', periodId)
      if (subErr) throw subErr
      setAllSubjects(subData.map((row) => row.subject).filter(Boolean))

      const { data: scoreData, error: scoreErr } = await supabase
        .from('student_scores')
        .select('*')
        .eq('report_period_id', periodId)
      if (scoreErr) throw scoreErr
      setAllScores(scoreData || [])

      const { data: attData, error: attErr } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('report_period_id', periodId)
      if (attErr) throw attErr
      setAllAttendance(attData || [])
    } catch (err) {
      setError('Gagal memuat detail kelas: ' + err.message)
    } finally {
      setLoadingSheet(false)
    }
  }

  const getStudentScores = (studentId) =>
    allScores.filter((sc) => sc.student_id === studentId)

  const getStudentAttendance = (studentId) =>
    allAttendance.find((att) => att.student_id === studentId) || { sakit: 0, izin: 0, alpha: 0 }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn.includes(search)
  )

  const activePeriod = periods.find((p) => p.id === selectedPeriodId)

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 m-0">Cetak Rapor Murid</h2>
            <p className="text-sm text-slate-400 mt-1">
              Unduh atau cetak laporan hasil belajar murid per semester.
            </p>
          </div>

          {/* Toggle Mode Alumni */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => { setAlumniMode(false) }}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${!alumniMode ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <School size={13} />
              Siswa Aktif
            </button>
            <button
              onClick={() => { setAlumniMode(true) }}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${alumniMode ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Users size={13} />
              Alumni / Arsip
            </button>
          </div>
        </div>

        {alumniMode && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs flex items-center gap-2">
            <Users size={15} className="shrink-0" />
            <span>Mode Alumni — Menampilkan seluruh periode rapor (aktif maupun non-aktif). Rapor alumni tetap dapat dicetak kapan saja.</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pilih Rapor & Kelas
            </label>
            <select
              value={selectedPeriodId}
              onChange={(e) => handleSelectPeriod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">-- Pilih Periode Cetak --</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Kelas {p.class_name})
                  {!p.is_active ? ' [Arsip]' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedPeriodId && (
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search size={16} />
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
        </div>

        {/* Main Grid */}
        {selectedPeriodId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daftar Murid */}
            <div className="lg:col-span-1 bg-slate-900/65 border border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[600px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider p-4 border-b border-slate-800 bg-slate-950/20 block">
                Daftar Murid Kelas {activePeriod?.class_name}
                {alumniMode && <span className="ml-2 text-amber-400">(Arsip)</span>}
              </span>

              <div className="divide-y divide-slate-800/50 overflow-y-auto flex-1">
                {loadingSheet ? (
                  <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
                    Memuat data murid...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <p className="p-6 text-center text-slate-500 text-xs italic">
                    Tidak ada siswa ditemukan.
                  </p>
                ) : (
                  filteredStudents.map((student) => {
                    const isSelected = previewStudent?.id === student.id
                    return (
                      <div
                        key={student.id}
                        className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${isSelected
                            ? 'bg-emerald-500/10 border-r-2 border-emerald-500'
                            : 'hover:bg-slate-850/40'
                          }`}
                      >
                        <div className="truncate">
                          <p className="text-sm font-semibold text-slate-200 truncate">
                            {student.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-slate-500 font-mono">
                              NISN: {student.nisn}
                            </p>
                            {student.status === 'alumni' && (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase">
                                Alumni
                              </span>
                            )}
                            {student.status === 'lulus' && (
                              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase">
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
                            onClick={() => handlePrintStudent(student)}
                            className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-all cursor-pointer"
                            title="Cetak Rapor"
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

            {/* Print Preview */}
            <div className="lg:col-span-2 space-y-4">
              {previewStudent ? (
                <div className="space-y-4">
                  {/* Action bar */}
                  <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">
                        Pratinjau Rapor:{' '}
                        <span className="text-slate-200 font-bold">{previewStudent.name}</span>
                      </span>
                      {(previewStudent.status === 'alumni' || previewStudent.status === 'lulus') && (
                        <span className="ml-3 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          {previewStudent.graduation_year ? `Lulus ${previewStudent.graduation_year}` : 'Alumni'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handlePrint()}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                    >
                      <Printer size={14} />
                      Cetak Rapor (PDF)
                    </button>
                  </div>

                  {/* Preview wrapper */}
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
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-450 h-full flex flex-col justify-center items-center">
                  <School size={44} className="text-slate-700 mb-3" />
                  <p className="font-semibold text-slate-400">Pratinjau Rapor</p>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Pilih murid di panel sebelah kiri untuk menampilkan lembar pratinjau rapor
                    Kurikulum Merdeka.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RAPOR SHEET — hanya muncul saat print */}
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

// =====================
// Komponen Lembar Rapor
// =====================
const RaporSheet = React.forwardRef(function RaporSheet(
  { previewStudent, activePeriod, allSubjects, getStudentScores, getStudentAttendance },
  ref
) {
  const att = getStudentAttendance(previewStudent.id)
  const scores = getStudentScores(previewStudent.id)

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 select-none"
      style={{ fontFamily: 'Arial, sans-serif', minWidth: '600px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-center border-b-2 border-black pb-4">
        <img
          src="/logo.webp"
          alt="Logo"
          className="h-20 w-auto mr-4 object-contain"
        />
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

      {/* Title */}
      <div className="text-center my-6">
        <p className="font-bold text-base tracking-widest underline">
          LAPORAN HASIL BELAJAR
        </p>
      </div>

      {/* Info Siswa */}
      <div className="grid grid-cols-2 text-xs gap-x-8 mb-6 leading-relaxed">
        <div className="space-y-1">
          <p className="flex">
            <span className="w-24">Nama</span>:{' '}
            <span className="font-bold ml-1">{previewStudent.name}</span>
          </p>
          <p className="flex">
            <span className="w-24">NIS/NISN</span>
            <span className="ml-1">: {previewStudent.nisn}</span>
          </p>
          <p className="flex">
            <span className="w-24">Nama Sekolah</span>
            <span className="ml-1">: SMP IT Al Anshar</span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="flex">
            <span className="w-28">Kelas / Fase</span>
            <span className="ml-1">
              : {activePeriod?.class_name} / {previewStudent.phase}
            </span>
          </p>
          <p className="flex">
            <span className="w-28">Semester</span>
            <span className="ml-1">: {activePeriod?.semester}</span>
          </p>
          <p className="flex">
            <span className="w-28">Tahun Ajaran</span>
            <span className="ml-1">: {activePeriod?.academic_year}</span>
          </p>
        </div>
      </div>

      {/* Tabel Nilai */}
      <table
        className="w-full border-collapse text-[11px] mb-6"
        style={{ borderCollapse: 'collapse' }}
      >
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
              const score = scores.find((sc) => sc.subject_id === sub.id)
              return (
                <tr key={sub.id}>
                  <td className="py-2.5 px-3 text-center font-mono" style={{ border: '1px solid black' }}>{index + 1}</td>
                  <td className="py-2.5 px-3 font-semibold" style={{ border: '1px solid black' }}>{sub.name}</td>
                  <td className="py-2.5 px-3 text-center font-bold" style={{ border: '1px solid black' }}>
                    {score ? score.final_score : '-'}
                  </td>
                  <td className="py-2 px-3 text-[10px] leading-snug" style={{ border: '1px solid black' }}>
                    {score?.highest_achievement || '-'}
                  </td>
                  <td className="py-2 px-3 text-[10px] leading-snug" style={{ border: '1px solid black' }}>
                    {score?.lowest_achievement || '-'}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {/* Kehadiran */}
      <div className="text-xs p-3 space-y-1 mb-8" style={{ border: '1px solid black', width: '256px' }}>
        <p className="font-bold uppercase pb-1 mb-1.5" style={{ borderBottom: '1px solid black' }}>
          Ketidakhadiran
        </p>
        <p className="flex justify-between"><span>Sakit</span> <span>: {att.sakit} hari</span></p>
        <p className="flex justify-between"><span>Izin</span> <span>: {att.izin} hari</span></p>
        <p className="flex justify-between"><span>Tanpa Keterangan (Alpha)</span> <span>: {att.alpha} hari</span></p>
      </div>

      {/* Tanda Tangan */}
      <div className="grid grid-cols-2 text-xs gap-y-12 mt-12">
        <div className="text-center">
          <p className="mb-16">Orang Tua / Wali Murid,</p>
          <p className="font-bold underline uppercase">
            {previewStudent.parent_name || '............................'}
          </p>
        </div>
        <div className="text-center">
          <p className="mb-0">Kota Kupang, Desember 2025</p>
          <p className="mb-16">Wali Kelas,</p>
          <p className="font-bold underline uppercase">
            {activePeriod?.wali_kelas?.name || '............................'}
          </p>
        </div>
        <div className="col-span-2 text-center mt-6">
          <p className="mb-0">Mengetahui,</p>
          <p className="mb-16">Kepala Sekolah SMP IT Al Anshar</p>
          <p className="font-bold underline uppercase">
            {activePeriod?.kepala_sekolah_name || '............................'}
          </p>
        </div>
      </div>
    </div>
  )
})