import { activePredicates } from '@/utils/predicates'
import PredicateBadge from '@/components/ui/PredicateBadge'

export default function PredicateLegend({ predicates = [], show = true }) {
  const active = activePredicates(predicates)
  if (!show || active.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Predikat
      </span>
      {active.map((predicate) => (
        <span key={predicate.id} className="inline-flex items-center gap-1.5">
          <PredicateBadge predicate={predicate} predicates={predicates} size="sm" />
          <span className="text-[10px] tabular-nums text-slate-500">
            {predicate.min_score}–{predicate.max_score}
          </span>
        </span>
      ))}
    </div>
  )
}