import React from 'react'
import { X, Trash2 } from 'lucide-react'

/**
 * Modal untuk mengatur Lingkup Materi (Bab) dan Tujuan Pembelajaran (TP).
 * Digunakan untuk konfigurasi kolom formatif pada tabel penilaian.
 */
export default function MaterialModal({
  materials,
  learningTargets,
  newMaterialName,
  setNewMaterialName,
  tpInputs,
  setTpInputs,
  handleAddMaterial,
  handleDeleteMaterial,
  handleAddTp,
  handleDeleteTp,
  onClose,
  modalError,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Atur Lingkup Materi & TP</h3>
            <p className="text-xs text-slate-400 mt-0.5">Tujuan Pembelajaran Formatif</p>
          </div>
          {/* FIX: Gunakan handleCloseMaterialModal, bukan handleLoadGrid langsung */}
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        
        {modalError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-xs">
            <span className="font-semibold">Perhatian:</span> {modalError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              1. Lingkup Materi (Bab)
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nama Materi (e.g. Bab 1)"
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMaterial()}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleAddMaterial}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 rounded-xl font-bold text-xs"
              >
                Tambah
              </button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-850 rounded-xl p-3 bg-slate-950/40">
              {materials.length === 0 ? (
                <p className="text-xs text-slate-555 italic text-center py-4">Belum ada lingkup materi.</p>
              ) : (
                materials.map((m) => (
                  <div key={m.id} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-850 text-xs">
                    <span className="text-slate-250 truncate">{m.name}</span>
                    <button onClick={() => handleDeleteMaterial(m.id)} className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              2. Tujuan Pembelajaran (TP)
            </span>
            <div className="space-y-2 border border-slate-850 p-3 rounded-xl bg-slate-950/20">
              <select
                value={tpInputs.materialId}
                onChange={(e) => setTpInputs({ ...tpInputs, materialId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">-- Pilih Materi Bab --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Kode (e.g. TP1)"
                  value={tpInputs.code}
                  onChange={(e) => setTpInputs({ ...tpInputs, code: e.target.value })}
                  className="w-20 bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                />
                <textarea
                  rows={1}
                  placeholder="Deskripsi TP..."
                  value={tpInputs.description}
                  onChange={(e) => setTpInputs({ ...tpInputs, description: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddTp();
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 focus:outline-none resize-none overflow-hidden"
                  style={{ minHeight: '34px' }}
                />
              </div>
              <button
                onClick={handleAddTp}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-1.5 rounded-lg text-xs font-bold"
              >
                Tambah TP
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-850 rounded-xl p-3 bg-slate-950/40">
              {learningTargets.length === 0 ? (
                <p className="text-xs text-slate-555 italic text-center py-4">Belum ada tujuan pembelajaran.</p>
              ) : (
                learningTargets.map((tp) => {
                  const mat = materials.find((m) => m.id === tp.material_id)
                  return (
                    <div key={tp.id} className="flex justify-between items-start bg-slate-950 p-2 rounded-lg border border-slate-850 text-[11px] gap-2">
                      <div className="truncate">
                        <span className="font-bold text-indigo-400 mr-1.5">{tp.code}</span>
                        <span className="text-slate-300">{tp.description}</span>
                        <span className="block text-[9px] text-slate-500 truncate mt-0.5">({mat?.name || 'Materi'})</span>
                      </div>
                      <button onClick={() => handleDeleteTp(tp.id)} className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer self-center">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
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
