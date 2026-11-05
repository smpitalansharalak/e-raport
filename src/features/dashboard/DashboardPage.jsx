import { useAuth } from '@/features/auth/useAuth'
import StatCard from '@/components/ui/StatCard'
import Spinner from '@/components/ui/Spinner'
import {
  Users,
  GraduationCap,
  FileSpreadsheet,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  CheckCircle,
} from 'lucide-react'
import { useDashboardStats } from './useDashboardStats'
import { EMPTY_DASHBOARD_STATS } from './dashboardService'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { data, isPending } = useDashboardStats()
  const stats = data ?? EMPTY_DASHBOARD_STATS

  if (isPending) {
    return <Spinner label="Membuat rekapitulasi data..." className="min-h-[50vh]" />
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
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          <StatCard
            icon={GraduationCap}
            value={stats.totalStudents}
            label="Total Siswa"
            tone="emerald"
          />
          <StatCard
            icon={Users}
            value={stats.totalTeachers}
            label="Total Guru"
            tone="indigo"
          />
          <StatCard
            icon={FileSpreadsheet}
            value={stats.totalReports}
            label="Rapor Aktif"
            tone="rose"
          />
          <StatCard
            icon={BookOpen}
            value={stats.totalSubjects}
            label="Mata Pelajaran"
            tone="amber"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-3xl">
          <StatCard
            icon={BookOpen}
            value={stats.teacherSubjectsCount}
            label="Mapel Yang Diajar"
            tone="emerald"
          />
          <StatCard
            icon={ClipboardCheck}
            value={
              stats.waliKelasClasses.length > 0
                ? `Wali Kelas ${stats.waliKelasClasses.join(', ')}`
                : 'Bukan Wali Kelas'
            }
            label="Status Perwalian"
            tone="indigo"
            valueClassName="text-base sm:text-2xl"
          />
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
              <li>{profile?.role === 'wali_kelas' ? 'Sebagai Wali Kelas, silakan masuk ke halaman Kepatuhan Siswa untuk menginput data ketidakhadiran (Sakit, Izin, Alpha) untuk siswa di kelas Anda.' : 'Pastikan seluruh nilai formatif dan sumatif siswa telah lengkap agar Admin dapat mencetak Rapor.'}</li>
            </>
          )}
        </ol>
      </div>
    </div>
  )
}
