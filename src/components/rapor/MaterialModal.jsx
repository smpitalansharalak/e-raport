import React, { useState, useCallback, useRef, useEffect, memo } from 'react'
import { X, Trash2 } from 'lucide-react'

/**
 * Sanitasi teks dari invisible chars yang sering terbawa saat copy-paste
 * dari Microsoft Word, Notepad, Google Docs, dsb.
 */
function sanitizePastedText(raw) {
  return raw
    // ASCII control chars (kecuali tab \x09, LF \x0A, CR \x0D)
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    // Unicode invisible: soft hyphen, zero-width space/joiner/non-joiner, BOM, dll
    .replace(/[\u00AD\u200B\u200C\u200D\u200E\u200F\uFEFF\uFFFC\u2028\u2029]/g, '')
    // Multiple spaces/tabs → satu spasi
    .replace(/[ \t]+/g, ' ')
    // Windows/Mac line endings → Unix
    .replace(/\r\n|\r/g, '\n')
    .trim()
}

/**
 * Input teks biasa dengan paste sanitasi dan local state (agar tidak
 * memicu re-render parent setiap keystroke).
 */
const SanitizedInput = memo(function SanitizedInput({
  value,
  onChange,
  placeholder,
  className,
  type = 'text',
}) {
  const [local, setLocal] = useState(value)
  const debounceRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Sync dari parent (misal reset form)
  useEffect(() => {
    setLocal(value)
  }, [value])

  const handleChange = useCallback((e) => {
    const val = e.target.value
    setLocal(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (mountedRef.current) onChange(val)
    }, 150) // 150ms — lebih responsif dari textarea karena input pendek
  }, [onChange])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const raw = e.clipboardData.getData('text/plain')
    const cleaned = sanitizePastedText(raw)
    const ta = e.target
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = local.substring(0, start) + cleaned + local.substring(end)
    setLocal(next)
    onChange(next) // langsung flush untuk input pendek
  }, [local, onChange])

  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      onChange(local)
    }
  }, [local, onChange])

  return (
    <input
      type={type}
      value={local}
      placeholder={placeholder}
      onChange={handleChange}
      onPaste={handlePaste}
      onBlur={handleBlur}
      className={className}
    />
  )
})

/**
 * Textarea dengan debounce + paste sanitasi untuk field deskripsi panjang.
 * Keystroke → update lokal (tampilan responsif), update parent di-debounce 300ms.
 * Paste dari Word → sanitasi invisible chars, update langsung (flush).
 */
const SanitizedTextarea = memo(function SanitizedTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 2,
  onKeyDown,
}) {
  const [local, setLocal] = useState(value)
  const debounceRef = useRef(null)
  const mountedRef = useRef(true)
  const taRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    setLocal(value)
  }, [value])

  const autoResize = useCallback(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.style.height = taRef.current.scrollHeight + 'px'
    }
  }, [])

  const handleChange = useCallback((e) => {
    const val = e.target.value
    setLocal(val)
    autoResize()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (mountedRef.current) onChange(val)
    }, 300)
  }, [onChange, autoResize])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const raw = e.clipboardData.getData('text/plain')
    const cleaned = sanitizePastedText(raw)
    const ta = e.target
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = local.substring(0, start) + cleaned + local.substring(end)
    setLocal(next)
    onChange(next) // flush langsung saat paste
    // autoResize setelah DOM update
    requestAnimationFrame(autoResize)
  }, [local, onChange, autoResize])

  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      onChange(local)
    }
  }, [local, onChange])

  return (
    <textarea
      ref={taRef}
      rows={rows}
      value={local}
      placeholder={placeholder}
      onChange={handleChange}
      onPaste={handlePaste}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      onInput={autoResize}
      className={className}
      style={{ minHeight: '34px', overflow: 'hidden' }}
    />
  )
})

/**
 * Modal untuk mengatur Lingkup Materi (Bab) dan Tujuan Pembelajaran (TP).
 * Semua field input menggunakan komponen lokal agar tidak memicu re-render
 * seluruh modal setiap keystroke — mencegah stack/hang di laptop.
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
  // Handler yang stabil untuk tiap field — tidak dibuat ulang setiap render
  const handleMaterialNameChange = useCallback((val) => {
    setNewMaterialName(val)
  }, [setNewMaterialName])

  const handleTpMaterialId = useCallback((e) => {
    setTpInputs((prev) => ({ ...prev, materialId: e.target.value }))
  }, [setTpInputs])

  const handleTpCodeChange = useCallback((val) => {
    setTpInputs((prev) => ({ ...prev, code: val }))
  }, [setTpInputs])

  const handleTpDescChange = useCallback((val) => {
    setTpInputs((prev) => ({ ...prev, description: val }))
  }, [setTpInputs])

  const handleTpDescKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddTp()
    }
  }, [handleAddTp])

  const handleMaterialKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleAddMaterial()
  }, [handleAddMaterial])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Atur Lingkup Materi &amp; TP</h3>
            <p className="text-xs text-slate-400 mt-0.5">Tujuan Pembelajaran Formatif</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Kolom Kiri: Lingkup Materi ── */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              1. Lingkup Materi (Bab)
            </span>

            <div className="flex gap-2">
              <SanitizedInput
                value={newMaterialName}
                onChange={handleMaterialNameChange}
                placeholder="Nama Materi (e.g. Bab 1)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                onClick={handleAddMaterial}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Tambah
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-800 rounded-xl p-3 bg-slate-950/40">
              {materials.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">
                  Belum ada lingkup materi.
                </p>
              ) : (
                materials.map((m) => (
                  <div
                    key={m.id}
                    className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs"
                  >
                    <span className="text-slate-300 truncate">{m.name}</span>
                    <button
                      onClick={() => handleDeleteMaterial(m.id)}
                      className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer transition-colors shrink-0 ml-2"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Kolom Kanan: Tujuan Pembelajaran ── */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              2. Tujuan Pembelajaran (TP)
            </span>

            <div className="space-y-2 border border-slate-800 p-3 rounded-xl bg-slate-950/20">
              {/* Pilih Materi */}
              <select
                value={tpInputs.materialId}
                onChange={handleTpMaterialId}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">-- Pilih Materi Bab --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>

              {/* Kode + Deskripsi TP */}
              <div className="flex gap-2">
                <SanitizedInput
                  value={tpInputs.code}
                  onChange={handleTpCodeChange}
                  placeholder="Kode (e.g. TP1)"
                  className="w-20 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <SanitizedTextarea
                  rows={1}
                  value={tpInputs.description}
                  onChange={handleTpDescChange}
                  onKeyDown={handleTpDescKeyDown}
                  placeholder="Deskripsi TP (bisa paste dari Word)..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none overflow-hidden"
                />
              </div>

              <button
                onClick={handleAddTp}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Tambah TP
              </button>
            </div>

            {/* Daftar TP */}
            <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-800 rounded-xl p-3 bg-slate-950/40">
              {learningTargets.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">
                  Belum ada tujuan pembelajaran.
                </p>
              ) : (
                learningTargets.map((tp) => {
                  const mat = materials.find((m) => m.id === tp.material_id)
                  return (
                    <div
                      key={tp.id}
                      className="flex justify-between items-start bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] gap-2"
                    >
                      <div className="truncate min-w-0">
                        <span className="font-bold text-indigo-400 mr-1.5">{tp.code}</span>
                        <span className="text-slate-300">{tp.description}</span>
                        <span className="block text-[9px] text-slate-500 truncate mt-0.5">
                          ({mat?.name || 'Materi'})
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTp(tp.id)}
                        className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer self-center shrink-0 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
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