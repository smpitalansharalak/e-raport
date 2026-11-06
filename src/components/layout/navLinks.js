import {
  LayoutDashboard,
  Users,
  FilePlus,
  Printer,
  UserCog,
  FileEdit,
  ClipboardCheck,
  ListChecks,
  KeyRound,
  ArrowUpCircle,
  Award,
} from 'lucide-react'

// Definisi link dipakai bersama oleh Sidebar (desktop) dan BottomNav (mobile).
// `primary` = item yang tampil di bottom navigation, `overflow` = sisanya
// (dibuka lewat sheet "Lainnya"), `all` = urutan lengkap untuk sidebar.

const dashboard = { to: '/', label: 'Dashboard', shortLabel: 'Beranda', icon: LayoutDashboard }
const inputSiswa = { to: '/siswa', label: 'Input Siswa', shortLabel: 'Siswa', icon: Users }
const buatRapor = { to: '/buat-rapor', label: 'Buat Rapor', shortLabel: 'Buat', icon: FilePlus }
const formatPenilaian = { to: '/format-penilaian', label: 'Format Penilaian', icon: ListChecks }
const predikat = { to: '/predikat', label: 'Predikat', icon: Award }
const naikKelas = { to: '/manajemen-status', label: 'Naik Kelas & Alumni', icon: ArrowUpCircle }
const cetakRapor = { to: '/cetak-rapor', label: 'Cetak Rapor', shortLabel: 'Cetak', icon: Printer }
const kelolaUser = { to: '/kelola-user', label: 'Kelola User', icon: UserCog }
const gantiPassword = { to: '/ganti-password', label: 'Ganti Password', shortLabel: 'Password', icon: KeyRound }
const inputRapor = { to: '/input-rapor', label: 'Input Rapor', icon: FileEdit }
const kepatuhan = { to: '/kepatuhan', label: 'Menu Wali Kelas', shortLabel: 'Wali Kelas', icon: ClipboardCheck }

const linksByRole = {
  admin: {
    primary: [dashboard, inputSiswa, buatRapor, cetakRapor],
    overflow: [formatPenilaian, predikat, naikKelas, kelolaUser, gantiPassword],
    all: [dashboard, inputSiswa, buatRapor, formatPenilaian, predikat, naikKelas, cetakRapor, kelolaUser, gantiPassword],
  },
  guru_mapel: {
    primary: [dashboard, inputRapor, gantiPassword],
    overflow: [],
    all: [dashboard, inputRapor, gantiPassword],
  },
  wali_kelas: {
    primary: [dashboard, inputRapor, kepatuhan, gantiPassword],
    overflow: [],
    all: [dashboard, inputRapor, kepatuhan, gantiPassword],
  },
}

const EMPTY = { primary: [], overflow: [], all: [] }

export function getNavLinks(role) {
  const links = linksByRole[role] ?? EMPTY
  return { primary: links.primary, overflow: links.overflow }
}

export function getAllLinks(role) {
  return (linksByRole[role] ?? EMPTY).all
}
