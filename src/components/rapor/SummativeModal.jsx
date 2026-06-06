import React from 'react'
import { X, Trash2 } from 'lucide-react'

/**
 * Modal untuk mengatur kolom Sumatif Lingkup Materi.
 */
export default function SummativeModal({
  summatives,
  newSummativeName,
  setNewSummativeName,
  handleAddSummative,
  handleDeleteSummative,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Atur Sumatif</h3>
            <p className="text-xs text-slate-400 mt-0.5">Lingkup Materi Sumatif</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nama Sumatif (e.g. Sumatif Bab 1)"
              value={newSummativeName}
              onChange={(e) => setNewSummativeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSummative()}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleAddSummative}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 rounded-xl font-bold text-xs"
            >
              Tambah
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-850 rounded-xl p-3 bg-slate-950/40">
            {summatives.length === 0 ? (
              <p className="text-xs text-slate-555 italic text-center py-4">Belum ada lingkup sumatif.</p>
            ) : (
              summatives.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-xs">
                  <span className="text-slate-250 truncate">{s.name}</span>
                  <button onClick={() => handleDeleteSummative(s.id)} className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}
