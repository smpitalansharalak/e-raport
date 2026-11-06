export const STUDENT_STATUS = {
  aktif: {
    label: 'Aktif',
    color: 'emerald',
    className: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  },
  naik_kelas: {
    label: 'Naik Kelas',
    color: 'indigo',
    className: 'bg-indigo-500/10  border-indigo-500/20  text-indigo-400',
  },
  lulus: {
    label: 'Lulus',
    color: 'amber',
    className: 'bg-amber-500/10   border-amber-500/20   text-amber-400',
  },
  alumni: {
    label: 'Alumni',
    color: 'slate',
    className: 'bg-slate-800/60   border-slate-700/40   text-slate-400',
  },
  pindah_keluar: {
    label: 'Pindah/Keluar',
    color: 'rose',
    className: 'bg-rose-500/10    border-rose-500/20    text-rose-400',
  },
}

export const STUDENT_STATUS_OPTIONS = Object.entries(STUDENT_STATUS).map(([value, cfg]) => ({
  value,
  ...cfg,
}))

export const getStudentStatusClass = (status) =>
  STUDENT_STATUS[status]?.className || STUDENT_STATUS.aktif.className

export const getStudentStatusLabel = (status) =>
  STUDENT_STATUS[status]?.label || status
