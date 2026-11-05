import { memo } from 'react'

const StudentButton = memo(function StudentButton({ student, isSelected, itemsCount, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 flex items-center justify-between transition-colors cursor-pointer ${
        isSelected
          ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
          : 'hover:bg-slate-800/30'
      }`}
    >
      <div>
        <p className={`text-sm font-semibold ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
          {student.name}
        </p>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{student.nisn}</p>
      </div>
      {itemsCount > 0 && (
        <span className="text-[10px] font-bold text-slate-950 bg-emerald-500 px-2 py-0.5 rounded-full">
          {itemsCount}
        </span>
      )}
    </button>
  )
})

export default StudentButton
