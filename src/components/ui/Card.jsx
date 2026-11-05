export default function Card({ as: Component = 'div', className = '', ...props }) {
  return (
    <Component
      className={`bg-slate-900/60 border border-slate-800 rounded-2xl ${className}`}
      {...props}
    />
  )
}
