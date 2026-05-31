import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Users,
  GraduationCap,
  FileSpreadsheet,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  CheckCircle,
  FileEdit,
} from 'lucide-react'

export default function Dashboard() {
  const { profile, role } = useAuth()
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalReports: 0,
    totalSubjects: 0,
    teacherSubjectsCount: 0,
    waliKelasCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [profile])

  const fetchStats = async () => {
    if (!profile) return
    setLoading(true)
    try {
      if (profile.role === 'admin') {
        // Admin stats
        const { count: sCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })

        const { count: tCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('role', ['guru_mapel', 'wali_kelas'])

        const { count: rCount } = await supabase
          .from('report_periods')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)

        const { count: subCount } = await supabase
          .from('subjects')
          .select('*', { count: 'exact', head: true })

        setStats({
          totalStudents: sCount || 0,
          totalTeachers: tCount || 0,
          totalReports: rCount || 0,
          totalSubjects: subCount || 0,
        })
      } else {
        // Guru/Wali stats
        const { count: tsCount } = await supabase
          .from('teacher_subjects')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', profile.id)

        const { count: wCount } = await supabase
          .from('report_periods')
          .select('*', { count: 'exact', head: true })
          .eq('wali_kelas_id', profile.id)
          .eq('is_active', true)

        setStats({
          teacherSubjectsCount: tsCount || 0,
          waliKelasCount: wCount || 0,
        })
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-slate-400 font-medium">Membuat rekapitulasi data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full filter blur-[80px] -z-10"></div>

        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight m-0">
            Selamat Datang, {profile?.name}!
          </h2>
          <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
            Anda login sebagai{' '}
            <span className="text-emerald-400 font-semibold">
              {profile?.role === 'admin'
                ? 'Administrator'
                : profile?.role === 'wali_kelas'
                ? 'Wali Kelas'
                : 'Guru Mata Pelajaran'}
            </span>
            . Kelola data nilai, kehadiran, dan cetak rapor dalam satu platform terintegrasi.
          </p>
        </div>

        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl hidden md:block">
          <LayoutDashboard size={40} />
        </div>
      </div>

      {/* KPI Cards */}
      {profile?.role === 'admin' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 transition-all duration-200 hover:border-slate-700/60 hover:shadow-lg">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{stats.totalStudents}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Total Siswa</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 transition-all duration-200 hover:border-slate-700/60 hover:shadow-lg">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{stats.totalTeachers}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Total Guru</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 transition-all duration-200 hover:border-slate-700/60 hover:shadow-lg">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{stats.totalReports}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Rapor Aktif</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 transition-all duration-200 hover:border-slate-700/60 hover:shadow-lg">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{stats.totalSubjects}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Mata Pelajaran</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
          {/* Guru Card 1 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 transition-all duration-200 hover:border-slate-700/60 hover:shadow-lg">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{stats.teacherSubjectsCount}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Mapel Yang Diajar</p>
            </div>
          </div>

          {/* Guru Card 2 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 transition-all duration-200 hover:border-slate-700/60 hover:shadow-lg">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">
                {stats.waliKelasCount > 0 ? `Kelas Wali (${stats.waliKelasCount} Rapor)` : 'Bukan Wali Kelas'}
              </p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Status Perwalian</p>
            </div>
          </div>
        </div>
      )}

      {/* Helpful Quick Instructions */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
          <CheckCircle size={18} className="text-emerald-400" />
          Panduan Singkat Alur Kerja Sistem:
        </h3>
        <ol className="list-decimal list-inside space-y-2.5 text-sm text-slate-400 pl-1 leading-relaxed">
          {profile?.role === 'admin' ? (
            <>
              <li>Tambahkan mata pelajaran sekolah di halaman <b>Buat Rapor & Mapel</b>.</li>
              <li>Input data siswa dengan NISN, nama, kelas, dan tahun ajaran di halaman <b>Input Siswa</b>.</li>
              <li>Buat periode Rapor Baru dan tunjuk <b>Wali Kelas</b> beserta mata pelajaran untuk kelas tersebut.</li>
              <li>Buka halaman <b>Kelola Pengguna</b> untuk memverifikasi pendaftaran guru lain dan menetapkan hak mengajar mata pelajaran mereka.</li>
              <li>Setelah guru menginput nilai formatif & sumatif dan wali kelas menginput kehadiran, masuk ke halaman <b>Cetak Rapor</b> untuk mengunduh laporan PDF resmi.</li>
            </>
          ) : (
            <>
              <li>Buka halaman <b>Input Rapor</b> untuk memilih periode rapor aktif, mata pelajaran, dan kelas yang Anda ampu.</li>
              <li>Buat daftar **Bab Materi** (Formatif) beserta **Tujuan Pembelajaran (TP)** serta kategori **Sumatif** di dalamnya.</li>
              <li>Input nilai formatif TP, sumatif, Nilai Tengah Semester (STS), dan Nilai Akhir Semester (SAS) bagi setiap siswa.</li>
              <li>{profile?.role === 'wali_kelas' ? 'Sebagai Wali Kelas, silakan masuk ke halaman Kepatuhan Siswa untuk menginput data ketidakhadiran (Sakit, Izin, Alpha) untuk siswa di kelas Anda.' : 'Pastikan seluruh nilai formatif dan sumatif siswa telah terisi lengkap agar Admin dapat mencetak Rapor.'}</li>
            </>
          )}
        </ol>
      </div>
    </div>
  )
}
