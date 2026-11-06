import { Archive, FilePlus, Search, X } from 'lucide-react'
import { SEMESTER_OPTIONS } from '../../reportListView'

const segmentBase =
  'px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer'
const inputClass =
  'bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors'

/**
 * Segmented Aktif/Arsip + pencarian + filter tahun ajaran/semester.
 * Seluruh state ada di parent; komponen ini hanya meneruskan event.
 */
export default function PeriodToolbar({
  view,
  counts,
  onViewChange,
  search,
  onSearchChange,
  years,
  year,
  onYearChange,
  semester,
  onSemesterChange,
  onReset,
  isFiltered,
}) {
  const showArchive = counts.arsip > 0 || view === 'arsip'

  return (
    <div className="space-y-3 bg-slate-900/60 border border-slate-800 p-3 sm:p-4 rounded-2xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Segmented Aktif / Arsip */}
        <div
          className="flex bg-slate-900 border border-slate-850 p-1 rounded-xl w-full lg:w-auto"
          role="tablist"
          aria-label="Jenis periode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'aktif'}
            onClick={() => onViewChange('aktif')}
            className={`${segmentBase} flex-1 lg:flex-none justify-center ${
              view === 'aktif'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <FilePlus size={14} />
            Aktif ({counts.aktif})
          </button>
          {showArchive && (
            <button
              type="button"
              role="tab"
              aria-selected={view === 'arsip'}
              onClick={() => onViewChange('arsip')}
              className={`${segmentBase} flex-1 lg:flex-none justify-center ${
                view === 'arsip'
                  ? 'bg-slate-800 text-slate-200 shadow-md'
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              <Archive size={14} />
              Arsip ({counts.arsip})
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="flex flex-col sm:flex-row gap-2 lg:items-center">
          <div className="relative flex-1 lg:w-64 lg:flex-none">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Cari nama / kelas / wali…"
              aria-label="Cari periode rapor"
              className={`${inputClass} w-full pl-9 py-2.5`}
            />
          </div>

          <select
            value={year}
            onChange={(event) => onYearChange(event.target.value)}
            aria-label="Filter tahun ajaran"
            className={`${inputClass} py-2.5`}
          >
            <option value="">Semua tahun ajaran</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={semester}
            onChange={(event) => onSemesterChange(event.target.value)}
            aria-label="Filter semester"
            className={`${inputClass} py-2.5`}
          >
            <option value="">Semua semester</option>
            {SEMESTER_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset filter"
              title="Reset filter"
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
