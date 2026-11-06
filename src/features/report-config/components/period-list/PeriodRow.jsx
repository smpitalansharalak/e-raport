import { Archive, ArchiveRestore, Edit2, Settings, Trash2 } from 'lucide-react'

/**
 * Satu baris periode rapor. Murni presentasional — seluruh aksi
 * diteruskan ke handler di parent sebagai callback.
 */
export default function PeriodRow({
  period,
  subjectCount = 0,
  isTogglingArchive = false,
  onEdit,
  onToggleArchive,
  onDelete,
  onManageSubjects,
}) {
  const isActive = period.is_active

  return (
    <li className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
            {period.class_name}
          </span>
          <p className="truncate text-sm font-semibold text-slate-100">{period.name}</p>
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-800 text-slate-500 border-slate-700/60'
            }`}
          >
            {isActive ? 'Aktif' : 'Arsip'}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Semester {period.semester} · Wali:{' '}
          <span className="text-slate-300 font-medium">
            {period.wali_kelas?.name || 'Belum diatur'}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onManageSubjects?.(period)}
          className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 hover:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Settings size={13} className="text-slate-500" />
          Mapel Rapor ({subjectCount})
        </button>

        <button
          type="button"
          onClick={() => onToggleArchive?.(period)}
          disabled={isTogglingArchive}
          className={`p-2 rounded-xl transition-all cursor-pointer border disabled:opacity-50 ${
            isActive
              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20 hover:border-amber-500/35'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/35'
          }`}
          title={isActive ? 'Arsipkan periode (nilai tetap tersimpan)' : 'Aktifkan kembali periode'}
          aria-label={isActive ? 'Arsipkan periode' : 'Aktifkan kembali periode'}
        >
          {isActive ? <Archive size={13} /> : <ArchiveRestore size={13} />}
        </button>

        <button
          type="button"
          onClick={() => onEdit?.(period)}
          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/35 rounded-xl transition-all cursor-pointer"
          title="Edit Periode"
          aria-label="Edit Periode"
        >
          <Edit2 size={13} />
        </button>

        <button
          type="button"
          onClick={() => onDelete?.(period.id)}
          disabled={!isActive}
          className={`p-2 rounded-xl border transition-all ${
            isActive
              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20 hover:border-rose-500/35 cursor-pointer'
              : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
          }`}
          title={isActive ? 'Hapus Periode' : 'Periode arsip tidak dapat dihapus'}
          aria-label="Hapus Periode"
          aria-disabled={!isActive}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </li>
  )
}
