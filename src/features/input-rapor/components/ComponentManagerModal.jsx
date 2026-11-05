import { useMemo } from 'react'
import { X, Trash2, Plus, Info } from 'lucide-react'

/**
 * Modal "Atur Komponen Penilaian".
 *
 * Menampilkan SEMUA komponen countable yang ada pada snapshot periode.
 * Guru menambah item (mis. "Bab 1", "Ulangan Harian 2") di setiap komponen;
 * komponen ber-TP (with_tp) juga menyediakan pengelolaan TP seperti
 * "Atur Lingkup Materi & TP" versi lama. Komponen fixed (UTS/UAS) tidak
 * bisa diubah guru — pengaturannya ada di menu Format Penilaian (admin).
 */
export default function ComponentManagerModal({
  components,
  items,
  learningTargets,
  itemDrafts,
  setItemDraft,
  onAddItem,
  onRenameItem,
  onDeleteItem,
  tpInputs,
  setTpInputs,
  onAddTp,
  onDeleteTp,
  onClose,
  modalError,
}) {
  const countableComponents = components.filter((c) => c.kind === 'countable')
  const fixedComponents = components.filter((c) => c.kind === 'fixed')

  const itemsByComponent = useMemo(() => {
    const map = new Map()
    items.forEach((item) => {
      if (!map.has(item.period_component_id)) map.set(item.period_component_id, [])
      map.get(item.period_component_id).push(item)
    })
    return map
  }, [items])

  const tpsByItem = useMemo(() => {
    const map = new Map()
    learningTargets.forEach((tp) => {
      if (!map.has(tp.assessment_item_id)) map.set(tp.assessment_item_id, [])
      map.get(tp.assessment_item_id).push(tp)
    })
    return map
  }, [learningTargets])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Atur Komponen Penilaian</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tambah/ubah item penilaian untuk mata pelajaran ini. Jumlah item ditentukan guru.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        {modalError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-xs">
            <span className="font-semibold">Perhatian:</span> {modalError}
          </div>
        )}

        {countableComponents.length === 0 && (
          <p className="text-xs text-slate-500 italic text-center py-6">
            Format periode ini tidak memiliki komponen yang bisa diatur guru.
          </p>
        )}

        {/* Satu section per komponen countable */}
        {countableComponents.map((component) => {
          const componentItems = itemsByComponent.get(component.id) ?? []
          const suggestion = component.with_tp
            ? `Bab ${componentItems.length + 1}`
            : `${component.name} ${componentItems.length + 1}`
          const draft = itemDrafts[component.id]

          return (
            <section
              key={component.id}
              className="border border-slate-800 rounded-2xl p-4 bg-slate-950/30 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <h4 className="text-sm font-bold text-slate-100 truncate">{component.name}</h4>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-slate-800 bg-slate-950 text-slate-500">
                    {component.with_tp ? 'Bab → TP' : 'Input langsung'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-600">{componentItems.length} item</span>
              </div>

              {/* Tambah item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft ?? suggestion}
                  onChange={(e) => setItemDraft(component.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onAddItem(component.id, suggestion)
                    }
                  }}
                  placeholder={suggestion}
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  onClick={() => onAddItem(component.id, suggestion)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> Tambah
                </button>
              </div>

              {/* Daftar item */}
              {componentItems.length > 0 && (
                <div className="space-y-1.5">
                  {componentItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800"
                    >
                      <input
                        key={item.id}
                        defaultValue={item.name}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          if (val && val !== item.name) onRenameItem(item.id, val)
                        }}
                        className="flex-1 min-w-0 bg-transparent border border-transparent hover:border-slate-800 focus:border-emerald-500 rounded px-1.5 py-1 text-xs text-slate-200 focus:outline-none transition-colors"
                        aria-label="Nama item"
                      />
                      {component.with_tp && (
                        <span className="shrink-0 text-[9px] text-slate-600">
                          {(tpsByItem.get(item.id) ?? []).length} TP
                        </span>
                      )}
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer transition-colors shrink-0"
                        aria-label="Hapus item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pengelolaan TP — hanya untuk komponen with_tp */}
              {component.with_tp && (
                <div className="border border-slate-800/80 rounded-xl p-3 bg-slate-950/20 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Tujuan Pembelajaran (TP)
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <select
                      value={tpInputs.itemId}
                      onChange={(e) => setTpInputs((prev) => ({ ...prev, itemId: e.target.value }))}
                      className="w-full sm:w-40 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="">-- Pilih Bab --</option>
                      {componentItems.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={tpInputs.code}
                      onChange={(e) => setTpInputs((prev) => ({ ...prev, code: e.target.value }))}
                      placeholder="Kode (TP1)"
                      className="w-20 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <input
                      type="text"
                      value={tpInputs.description}
                      onChange={(e) => setTpInputs((prev) => ({ ...prev, description: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          onAddTp()
                        }
                      }}
                      placeholder="Deskripsi TP..."
                      className="flex-1 min-w-[160px] bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      onClick={onAddTp}
                      disabled={componentItems.length === 0}
                      className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      Tambah TP
                    </button>
                  </div>

                  {learningTargets.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {learningTargets
                        .filter((tp) => componentItems.some((item) => item.id === tp.assessment_item_id))
                        .map((tp) => {
                          const item = componentItems.find((i) => i.id === tp.assessment_item_id)
                          return (
                            <div
                              key={tp.id}
                              className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] gap-2"
                            >
                              <div className="truncate min-w-0">
                                <span className="font-bold text-indigo-400 mr-1.5">{tp.code}</span>
                                <span className="text-slate-300">{tp.description}</span>
                                <span className="block text-[9px] text-slate-600 truncate mt-0.5">
                                  ({item?.name ?? 'Item'})
                                </span>
                              </div>
                              <button
                                onClick={() => onDeleteTp(tp.id)}
                                className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer shrink-0 transition-colors"
                                aria-label="Hapus TP"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )}
            </section>
          )
        })}

        {/* Komponen fixed — read-only */}
        {fixedComponents.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-[10px] text-slate-500 leading-relaxed">
            <Info size={13} className="shrink-0 mt-0.5 text-slate-600" />
            <span>
              Komponen fixed ({fixedComponents.map((c) => c.name).join(', ')}) diatur oleh admin di menu
              Format Penilaian — guru hanya mengisi nilainya di lembar penilaian.
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2 rounded-xl font-bold text-xs cursor-pointer transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}
