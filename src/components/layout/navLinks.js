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
  SlidersHorizontal,
  FileText,
} from 'lucide-react'

// Definisi link dipakai bersama oleh Sidebar (desktop) dan BottomNav (mobile).
// `primary` = item yang tampil di bottom navigation, `overflow` = sisanya
// (dibuka lewat sheet "Lainnya"), `all` = urutan lengkap untuk sidebar.
// Grup memiliki `children` dan dirender sebagai satu menu induk.

const dashboard = { to: '/', label: 'Dashboard', shortLabel: 'Beranda', icon: LayoutDashboard }
const inputSiswa = { to: '/siswa', label: 'Input Siswa', icon: Users }
const buatRapor = { to: '/buat-rapor', label: 'Buat Rapor', icon: FilePlus }
const formatPenilaian = { to: '/format-penilaian', label: 'Format Penilaian', icon: ListChecks }
const predikat = { to: '/predikat', label: 'Predikat', icon: Award }
const naikKelas = { to: '/manajemen-status', label: 'Naik Kelas & Alumni', icon: ArrowUpCircle }
const cetakRapor = { to: '/cetak-rapor', label: 'Cetak Rapor', icon: Printer }
const kelolaUser = { to: '/kelola-user', label: 'Kelola User', icon: UserCog }
const gantiPassword = { to: '/ganti-password', label: 'Ganti Password', shortLabel: 'Password', icon: KeyRound }
const inputRapor = { to: '/input-rapor', label: 'Input Rapor', icon: FileEdit }
const kepatuhan = { to: '/kepatuhan', label: 'Menu Wali Kelas', shortLabel: 'Wali Kelas', icon: ClipboardCheck }

const inputSiswaGroup = {
  key: 'siswa',
  label: 'Siswa',
  shortLabel: 'Siswa',
  icon: Users,
  children: [inputSiswa, naikKelas],
}
const penilaianGroup = {
  key: 'penilaian',
  label: 'Penilaian',
  shortLabel: 'Penilaian',
  icon: SlidersHorizontal,
  children: [formatPenilaian, predikat],
}
const raporGroup = {
  key: 'rapor',
  label: 'Rapor',
  shortLabel: 'Rapor',
  icon: FileText,
  children: [buatRapor, cetakRapor],
}

const linksByRole = {
  admin: {
    primary: [dashboard, inputSiswaGroup, raporGroup],
    overflow: [penilaianGroup, kelolaUser, gantiPassword],
    all: [dashboard, inputSiswaGroup, raporGroup, penilaianGroup, kelolaUser, gantiPassword],
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

export function isNavLinkActive(pathname, link) {
  if (link?.children) return link.children.some((child) => isNavLinkActive(pathname, child))
  if (!link?.to) return false
  if (link.to === '/') return pathname === '/'
  return pathname === link.to || pathname.startsWith(`${link.to}/`)
}

export function getNavLinks(role) {
  const links = linksByRole[role] ?? EMPTY
  return { primary: links.primary, overflow: links.overflow }
}

export function getAllLinks(role) {
  return (linksByRole[role] ?? EMPTY).all
}
