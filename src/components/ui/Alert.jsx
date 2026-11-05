const TONES = {
  info: 'border-slate-700 bg-slate-900/60 text-slate-300',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  error: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
}

export default function Alert({ tone = 'info', title, className = '', children }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border p-4 ${TONES[tone] ?? TONES.info} ${className}`}
    >
      {title ? <p className="text-sm font-semibold">{title}</p> : null}
      {children ? <div className="mt-1 text-xs leading-relaxed">{children}</div> : null}
    </div>
  )
}
