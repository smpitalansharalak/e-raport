import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Printer,
  Search,
  Eye,
  AlertCircle,
  School,
  ArrowLeft,
} from 'lucide-react'

export default function CetakRapor() {
  const [periods, setPeriods] = useState([])
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  // Report Card detail state
  const [allSubjects, setAllSubjects] = useState([])
  const [allScores, setAllScores] = useState([])
  const [allAttendance, setAllAttendance] = useState([])
  
  const [previewStudent, setPreviewStudent] = useState(null) // student object currently previewed/printed

  useEffect(() => {
    fetchPeriods()
  }, [])

  const fetchPeriods = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('report_periods')
        .select(`
          *,
          wali_kelas:profiles(id, name)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPeriods(data || [])
    } catch (err) {
      console.error('Error fetching periods:', err)
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

      // 1. Fetch students filtered by class and academic year
      const { data: sData, error: sErr } = await supabase
        .from('students')
        .select('*')
        .eq('class_name', period.class_name)
        .eq('academic_year', period.academic_year)
        .order('name', { ascending: true })
      if (sErr) throw sErr
      setStudents(sData || [])

      // 2. Fetch subjects for this period
      const { data: subData, error: subErr } = await supabase
        .from('report_subjects')
        .select(`
          subject:subjects(id, name)
        `)
        .eq('report_period_id', periodId)
      if (subErr) throw subErr
      setAllSubjects(subData.map((row) => row.subject).filter(Boolean))

      // 3. Fetch all scores for this period
      const { data: scoreData, error: scoreErr } = await supabase
        .from('student_scores')
        .select('*')
        .eq('report_period_id', periodId)
      if (scoreErr) throw scoreErr
      setAllScores(scoreData || [])

      // 4. Fetch all attendance for this period
      const { data: attData, error: attErr } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('report_period_id', periodId)
      if (attErr) throw attErr
      setAllAttendance(attData || [])
    } catch (err) {
      console.error('Error loading report period details:', err)
      setError('Gagal memuat detail kelas: ' + err.message)
    } finally {
      setLoadingSheet(false)
    }
  }

  const handlePrint = (student) => {
    setPreviewStudent(student)
    // Wait a brief tick for DOM to update print structure, then call print
    setTimeout(() => {
      window.print()
    }, 300)
  }

  const getStudentScores = (studentId) => {
    return allScores.filter((sc) => sc.student_id === studentId)
  }

  const getStudentAttendance = (studentId) => {
    return (
      allAttendance.find((att) => att.student_id === studentId) || {
        sakit: 0,
        izin: 0,
        alpha: 0,
      }
    )
  }

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
      {/* 1. SCREEN VIEW CONTAINER (HIDDEN WHEN PRINTING) */}
      <div className="no-print space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 m-0">Cetak Rapor Murid</h2>
          <p className="text-sm text-slate-400 mt-1">
            Unduh atau cetak laporan hasil belajar murid per semester.
          </p>
        </div>

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
            {/* Student List (Col Span 1) */}
            <div className="lg:col-span-1 bg-slate-900/65 border border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[600px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider p-4 border-b border-slate-800 bg-slate-950/20 block">
                Daftar Murid Kelas {activePeriod?.class_name}
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
                        className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/10 border-r-2 border-emerald-500'
                            : 'hover:bg-slate-850/40'
                        }`}
                      >
                        <div className="truncate">
                          <p className="text-sm font-semibold text-slate-205 truncate">
                            {student.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            NISN: {student.nisn}
                          </p>
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
                            onClick={() => handlePrint(student)}
                            className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:text-emerald-350 hover:bg-emerald-500/20 rounded-lg transition-all cursor-pointer"
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

            {/* Print Preview (Col Span 2) */}
            <div className="lg:col-span-2 space-y-4">
              {previewStudent ? (
                <div className="space-y-4">
                  {/* Action buttons */}
                  <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-xs text-slate-350 font-medium">
                      Pratinjau Rapor: <span className="text-slate-200 font-bold">{previewStudent.name}</span>
                    </span>
                    <button
                      onClick={() => handlePrint(previewStudent)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                    >
                      <Printer size={14} />
                      Cetak Rapor (PDF)
                    </button>
                  </div>

                  {/* HTML Report Sheet Mockup */}
                  <div className="bg-white text-black p-8 rounded-2xl border border-slate-200 shadow-md max-h-[800px] overflow-y-auto select-none">
                {/* Header */}
                <div className="flex items-center justify-center border-b-2 border-black pb-4 bg-white">
                  <img src="/favicon.svg" alt="Logo" className="h-6 mr-2" />
                  <div className="text-center">
                    <p className="font-bold text-sm tracking-wide">YAYASAN AL-ANSHAR AN’NUR</p>
                    <p className="font-extrabold text-base leading-none my-1 uppercase">
                      SEKOLAH MENENGAH PERTAMA ISLAM TERPADU (SMP-IT) AL ANSHAR
                    </p>
                    <p className="text-[10px] leading-tight text-slate-650">
                      NPSN : 70055902 | Email : smpitalansharalak@gmail.com | HP : 0812 3743 8357
                    </p>
                    <p className="text-[10px] leading-tight text-slate-650 mt-0.5">
                      Jl. Waikelo No. 32, RT.26 RW 06, Kel. Penkase Oeleta, Kec. Alak, Kota Kupang-NTT
                    </p>
                  </div>
                </div>

                    {/* Title */}
                    <div className="text-center my-6">
                      <p className="font-bold text-base tracking-widest decoration-dotted underline">
                        LAPORAN HASIL BELAJAR
                      </p>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-2 text-xs gap-x-8 mb-6 leading-relaxed">
                      <div className="space-y-1">
                        <p className="flex"><span className="w-24">Nama</span>: <span className="font-bold ml-1">{previewStudent.name}</span></p>
                        <p className="flex"><span className="w-24">NIS/NISN</span>: <span className="ml-1">{previewStudent.nisn}</span></p>
                        <p className="flex"><span className="w-24">Nama Sekolah</span>: <span className="ml-1">SMP IT Al Anshar</span></p>
                      </div>
                      <div className="space-y-1">
                        <p className="flex"><span className="w-28">Kelas / Fase</span>: <span className="ml-1">{activePeriod?.class_name} / {previewStudent.phase}</span></p>
                        <p className="flex"><span className="w-28">Semester</span>: <span className="ml-1">{activePeriod?.semester}</span></p>
                        <p className="flex"><span className="w-28">Tahun Ajaran</span>: <span className="ml-1">{activePeriod?.academic_year}</span></p>
                      </div>
                    </div>

                    {/* Grades Table */}
                    <table className="w-full border-collapse border border-black text-[11px] mb-6">
                      <thead>
                      <tr className="bg-white text-black font-bold border-b border-black">
                          <th className="border border-black py-2 px-3 text-center" style={{ width: '40px' }}>No</th>
                          <th className="border border-black py-2 px-3 text-left">Mata Pelajaran</th>
                          <th className="border border-black py-2 px-3 text-center" style={{ width: '80px' }}>Nilai Akhir</th>
                          <th className="border border-black py-2 px-3 text-left" style={{ width: '220px' }}>Capaian Tertinggi</th>
                          <th className="border border-black py-2 px-3 text-left" style={{ width: '220px' }}>Capaian Terendah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {allSubjects.map((sub, index) => {
                          const score = getStudentScores(previewStudent.id).find(
                            (sc) => sc.subject_id === sub.id
                          )
                          return (
                            <tr key={sub.id}>
                              <td className="border border-black py-2.5 px-3 text-center font-mono">{index + 1}</td>
                              <td className="border border-black py-2.5 px-3 font-semibold">{sub.name}</td>
                              <td className="border border-black py-2.5 px-3 text-center font-bold">
                                {score ? score.final_score : '-'}
                              </td>
                              <td className="border border-black py-2 px-3 text-[10px] leading-snug">
                                {score?.highest_achievement || '-'}
                              </td>
                              <td className="border border-black py-2 px-3 text-[10px] leading-snug">
                                {score?.lowest_achievement || '-'}
                              </td>
                            </tr>
                          )
                        })}
                        {allSubjects.length === 0 && (
                          <tr>
                            <td colSpan="5" className="border border-black py-6 text-center text-slate-500 italic">
                              Belum ada mata pelajaran rapor dikonfigurasi.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Attendance */}
                    <div className="w-64 border border-black text-xs p-3 space-y-1 mb-8">
                      <p className="font-bold border-b border-black pb-1 mb-1.5 uppercase">Ketidakhadiran</p>
                      {(() => {
                        const att = getStudentAttendance(previewStudent.id)
                        return (
                          <>
                            <p className="flex justify-between"><span>Sakit</span> <span>: {att.sakit} hari</span></p>
                            <p className="flex justify-between"><span>Izin</span> <span>: {att.izin} hari</span></p>
                            <p className="flex justify-between"><span>Tanpa Keterangan (Alpha)</span> <span>: {att.alpha} hari</span></p>
                          </>
                        )
                      })()}
                    </div>

                    {/* Footer / Signatures */}
                    <div className="grid grid-cols-2 text-xs gap-y-12 mt-12">
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
              ) : (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-450 h-full flex flex-col justify-center items-center">
                  <School size={44} className="text-slate-700 mb-3" />
                  <p className="font-semibold">Pratinjau Rapor</p>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Pilih murid di panel sebelah kiri untuk menampilkan lembar pratinjau rapor Kurikulum Merdeka.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. PRINT-ONLY WRAPPER (HIDDEN ON SCREEN, DISPLAYED ON PRINT) */}
      {previewStudent && activePeriod && (
        <div className="hidden print:block bg-white text-black p-0">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-3">
            <h1 className="font-bold text-sm tracking-wide m-0 leading-tight">YAYASAN AL-ANSHAR AN’NUR</h1>
            <h2 className="font-extrabold text-base leading-none my-1 uppercase">
              SEKOLAH MENENGAH PERTAMA ISLAM TERPADU (SMP-IT) AL ANSHAR
            </h2>
            <p className="text-[9px] leading-tight m-0 text-slate-750">
              NPSN : 70055902 | Email : smpitalansharalak@gmail.com | HP : 0812 3743 8357
            </p>
            <p className="text-[9px] leading-tight m-0 text-slate-750 mt-0.5">
              Jl. Waikelo No. 32, RT.26 RW 06, Kel. Penkase Oeleta, Kec. Alak, Kota Kupang-NTT
            </p>
          </div>

          {/* Title */}
          <div className="text-center my-4">
            <h2 className="font-bold text-sm tracking-widest decoration-dotted underline uppercase m-0">
              LAPORAN HASIL BELAJAR (RAPOR)
            </h2>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 text-[10px] gap-x-6 mb-4 leading-relaxed">
            <div className="space-y-1">
              <p className="flex m-0"><span className="w-20 shrink-0">Nama Siswa</span>: <span className="font-bold ml-1">{previewStudent.name}</span></p>
              <p className="flex m-0"><span className="w-20 shrink-0">NIS / NISN</span>: <span className="ml-1 font-mono">{previewStudent.nisn}</span></p>
              <p className="flex m-0"><span className="w-20 shrink-0">Nama Sekolah</span>: <span className="ml-1">SMP IT Al Anshar</span></p>
            </div>
            <div className="space-y-1">
              <p className="flex m-0"><span className="w-24 shrink-0">Kelas / Fase</span>: <span className="ml-1">{activePeriod.class_name} / {previewStudent.phase}</span></p>
              <p className="flex m-0"><span className="w-24 shrink-0">Semester</span>: <span className="ml-1">{activePeriod.semester}</span></p>
              <p className="flex m-0"><span className="w-24 shrink-0">Tahun Ajaran</span>: <span className="ml-1">{activePeriod.academic_year}</span></p>
            </div>
          </div>

          {/* Grades Table */}
          <table className="w-full border-collapse border border-black text-[10px] mb-4">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-black">
                <th className="border border-black py-1.5 px-2 text-center" style={{ width: '30px' }}>No</th>
                <th className="border border-black py-1.5 px-2 text-left">Mata Pelajaran</th>
                <th className="border border-black py-1.5 px-2 text-center" style={{ width: '70px' }}>Nilai Akhir</th>
                <th className="border border-black py-1.5 px-2 text-left" style={{ width: '230px' }}>Capaian Kompetensi Tertinggi</th>
                <th className="border border-black py-1.5 px-2 text-left" style={{ width: '230px' }}>Capaian Kompetensi Terendah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {allSubjects.map((sub, index) => {
                const score = getStudentScores(previewStudent.id).find(
                  (sc) => sc.subject_id === sub.id
                )
                return (
                  <tr key={sub.id}>
                    <td className="border border-black py-2 px-2 text-center font-mono">{index + 1}</td>
                    <td className="border border-black py-2 px-2 font-semibold">{sub.name}</td>
                    <td className="border border-black py-2 px-2 text-center font-bold">
                      {score ? score.final_score : '-'}
                    </td>
                    <td className="border border-black py-1.5 px-2 text-[9px] leading-tight">
                      {score?.highest_achievement || '-'}
                    </td>
                    <td className="border border-black py-1.5 px-2 text-[9px] leading-tight">
                      {score?.lowest_achievement || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Attendance */}
          <div className="w-60 border border-black text-[10px] p-2.5 space-y-1 mb-6">
            <p className="font-bold border-b border-black pb-0.5 mb-1 uppercase m-0">Ketidakhadiran</p>
            {(() => {
              const att = getStudentAttendance(previewStudent.id)
              return (
                <>
                  <p className="flex justify-between m-0"><span>Sakit</span> <span>: {att.sakit} hari</span></p>
                  <p className="flex justify-between m-0"><span>Izin</span> <span>: {att.izin} hari</span></p>
                  <p className="flex justify-between m-0"><span>Tanpa Keterangan (Alpha)</span> <span>: {att.alpha} hari</span></p>
                </>
              )
            })()}
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 text-[10px] gap-y-10 mt-6 leading-relaxed">
            <div className="text-center">
              <p className="m-0 mb-12">Orang Tua / Wali Murid,</p>
              <p className="font-bold underline uppercase m-0">{previewStudent.parent_name || '............................'}</p>
            </div>
            <div className="text-center">
              <p className="m-0">Kota Kupang, Desember 2025</p>
              <p className="m-0 mb-12">Wali Kelas,</p>
              <p className="font-bold underline uppercase m-0">{activePeriod.wali_kelas?.name || '............................'}</p>
            </div>
            <div className="col-span-2 text-center mt-3">
              <p className="m-0">Mengetahui,</p>
              <p className="m-0 mb-12">Kepala Sekolah SMP IT Al Anshar</p>
              <p className="font-bold underline uppercase m-0">{activePeriod.kepala_sekolah_name || '............................'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
