import { FilePlus, SearchX } from 'lucide-react'

/**
 * Dua kondisi kosong untuk daftar periode.
 * `no-periods` — belum ada periode sama sekali;
 * `no-results` — periode ada, tapi tidak cocok dengan filter.
 */
export default function PeriodEmptyState({ variant, onReset }) {
  if (variant === 'no-periods') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
        <FilePlus size={36} className="mx-auto text-slate-650 mb-2" />
        <p className="font-medium text-slate-400">Belum ada periode rapor.</p>
        <p className="text-xs text-slate-500 mt-1">
          Tambahkan lewat tombol "Buat Periode Rapor" di atas.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
      <SearchX size={36} className="mx-auto text-slate-650 mb-2" />
      <p className="font-medium text-slate-400">Tidak ada periode yang cocok.</p>
      <p className="text-xs text-slate-500 mt-1">Ubah pencarian atau reset filter.</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 px-4 py-2 text-xs font-bold text-slate-300 hover:text-slate-100 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          Reset filter
        </button>
      )}
    </div>
  )
}
