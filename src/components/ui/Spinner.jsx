const SIZES = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-4',
  lg: 'w-16 h-16 border-4',
}

export default function Spinner({ size = 'md', label, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${SIZES[size] ?? SIZES.md} rounded-full border-slate-800 border-t-emerald-500 animate-spin`}
        role="status"
        aria-label={label || 'Memuat'}
      />
      {label ? (
        <p className="mt-2 text-sm text-slate-400 font-medium">{label}</p>
      ) : null}
    </div>
  )
}
