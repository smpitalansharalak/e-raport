import { ChevronDown } from 'lucide-react'
import PeriodRow from './PeriodRow'

/**
 * Satu grup tahun ajaran berupa accordion.
 * Navigasi keyboard: tombol header `aria-expanded`, panel memakai `aria-hidden`.
 */
export default function PeriodYearGroup({
  year,
  periods,
  open,
  onToggle,
  periodSubjects,
  isTogglingArchive,
  onEditPeriod,
  onToggleArchive,
  onDeletePeriod,
  onManageSubjects,
}) {
  const panelId = `period-year-panel-${String(year).replace(/[^a-z0-9]/gi, '-')}`

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/60 px-4 py-3 text-left transition-colors hover:bg-slate-900 cursor-pointer"
      >
        <span className="flex items-center gap-3 min-w-0">
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform duration-200 motion-reduce:transition-none ${
              open ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <span className="text-sm font-bold text-slate-100 truncate">{year}</span>
        </span>
        <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
          {periods.length} periode
        </span>
      </button>

      {open && (
        <ul id={panelId} className="divide-y divide-slate-800/80">
          {periods.map((period) => (
            <PeriodRow
              key={period.id}
              period={period}
              subjectCount={periodSubjects?.[period.id]?.length ?? 0}
              isTogglingArchive={isTogglingArchive}
              onEdit={onEditPeriod}
              onToggleArchive={onToggleArchive}
              onDelete={onDeletePeriod}
              onManageSubjects={onManageSubjects}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
