const TONES = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
}

export default function StatCard({
  icon: Icon,
  value,
  label,
  tone = 'emerald',
  valueClassName = 'text-xl sm:text-2xl',
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 flex items-center gap-3 sm:gap-4 transition-all duration-200 hover:border-slate-700/60 hover:shadow-lg">
      <div className={`p-2.5 sm:p-3 border rounded-xl ${TONES[tone] ?? TONES.emerald}`}>
        <Icon size={24} />
      </div>
      <div className="min-w-0">
        <p className={`${valueClassName} font-bold text-slate-100`}>{value}</p>
        <p className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">
          {label}
        </p>
      </div>
    </div>
  )
}
