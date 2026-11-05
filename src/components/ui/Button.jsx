const BASE_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60'

const VARIANTS = {
  primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
  secondary: 'border border-slate-700 text-slate-300 hover:bg-slate-800',
  danger: 'bg-rose-500 text-white hover:bg-rose-400',
  ghost: 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`${BASE_CLASS} ${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.md} ${className}`}
      {...props}
    />
  )
}
