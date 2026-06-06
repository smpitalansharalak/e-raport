import React, { useEffect, useRef, useState } from 'react'
import { Download, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react'

/**
 * Dropdown menu untuk memilih format ekspor Excel.
 * Mendukung 3 mode: rekap, detail, dan lengkap.
 */
export default function ExportDropdown({ onExport, disabled, exporting }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const options = [
    {
      mode: 'rekap',
      label: 'Rekap Nilai Akhir',
      desc: 'Nilai rapor final tiap siswa per mapel + kehadiran',
      icon: FileSpreadsheet,
    },
    {
      mode: 'detail',
      label: 'Detail Formatif & Sumatif',
      desc: 'Semua nilai TP, sumatif, STS, SAS, dan deskripsi',
      icon: FileSpreadsheet,
    },
    {
      mode: 'lengkap',
      label: 'Ekspor Lengkap (3 sheet)',
      desc: 'Info + Rekap + Detail + Kehadiran dalam satu file',
      icon: FileSpreadsheet,
    },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={disabled || exporting}
        className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 px-3.5 py-2 rounded-xl font-bold text-xs shadow transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {exporting ? 'Mengekspor...' : 'Ekspor Excel'}
        {!exporting && <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && !exporting && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
              Pilih format ekspor
            </p>
          </div>
          <div className="p-2 space-y-1">
            {options.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.mode}
                  onClick={() => { setOpen(false); onExport(opt.mode) }}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-slate-800/60 text-left transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg mt-0.5 group-hover:bg-indigo-500/20 transition-colors shrink-0">
                    <Icon size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{opt.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{opt.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/30">
            <p className="text-[10px] text-slate-600">
              Format: .xlsx · Kompatibel dengan Excel, LibreOffice, Google Sheets
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
