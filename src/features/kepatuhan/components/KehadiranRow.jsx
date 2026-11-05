import { memo } from 'react'
import { Save } from 'lucide-react'

const KehadiranRow = memo(function KehadiranRow({
  student,
  index,
  rec,
  onChange,
  onSave,
  isSavingRow,
}) {
  return (
    <tr className="hover:bg-slate-800/20 transition-colors">
      <td className="py-3 px-4 text-xs text-slate-500 font-mono">{index + 1}</td>
      <td className="py-3 px-4 min-w-[150px]">
        <p className="text-sm font-semibold text-slate-200 leading-tight">{student.name}</p>
        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{student.nisn}</p>
      </td>
      {['sakit', 'izin', 'alpha'].map((field) => (
        <td key={field} className="py-3 px-4 text-center">
          <input
            type="number"
            min="0"
            value={rec[field]}
            onChange={(e) => onChange(student.id, field, e.target.value)}
            className="w-14 bg-slate-950 border border-slate-800 rounded-lg text-center text-sm py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
          />
        </td>
      ))}
      <td className="py-2.5 px-4 min-w-[200px]">
        <textarea
          rows="2"
          placeholder="Catatan khusus (opsional)..."
          value={rec.catatan || ''}
          onChange={(e) => onChange(student.id, 'catatan', e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm py-2 px-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors resize-y min-h-[42px]"
        />
      </td>
      <td className="py-2.5 px-4 text-center">
        <button
          onClick={() => onSave(student.id, student.name)}
          disabled={isSavingRow}
          className="p-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-lg transition-colors cursor-pointer flex items-center justify-center mx-auto"
          title="Simpan baris ini"
        >
          {isSavingRow ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
        </button>
      </td>
    </tr>
  )
})

export default KehadiranRow
