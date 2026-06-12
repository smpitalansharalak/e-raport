import React, { useState, useCallback, useRef, useEffect, memo } from 'react'
import { X, Trash2 } from 'lucide-react'

/**
 * Sanitasi teks dari invisible chars yang sering terbawa saat copy-paste
 * dari Microsoft Word, Notepad, Google Docs, dsb.
 */
function sanitizePastedText(raw) {
  return raw
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u00AD\u200B\u200C\u200D\u200E\u200F\uFEFF\uFFFC\u2028\u2029]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n|\r/g, '\n')
    .trim()
}

/**
 * Input dengan local state + paste sanitasi.
 * Update ke parent di-debounce agar tidak memicu re-render modal setiap keystroke.
 */
const SanitizedInput = memo(function SanitizedInput({
  value,
  onChange,
  placeholder,
  className,
  onKeyDown,
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

  // Sync dari parent saat value direset (misal setelah tambah berhasil)
  useEffect(() => {
    setLocal(value)
  }, [value])

  const handleChange = useCallback((e) => {
    const val = e.target.value
    setLocal(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (mountedRef.current) onChange(val)
    }, 150)
  }, [onChange])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const raw = e.clipboardData.getData('text/plain')
    const cleaned = sanitizePastedText(raw)
    const el = e.target
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = local.substring(0, start) + cleaned + local.substring(end)
    setLocal(next)
    onChange(next) // flush langsung untuk input pendek
  }, [local, onChange])

  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      onChange(local)
    }
  }, [local, onChange])

  return (
    <input
      type="text"
      value={local}
      placeholder={placeholder}
      onChange={handleChange}
      onPaste={handlePaste}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      className={className}
    />
  )
})

/**
 * Modal untuk mengatur kolom Sumatif Lingkup Materi.
 * Field nama sumatif menggunakan SanitizedInput agar paste dari Word berjalan
 * lancar dan tidak menyebabkan stack/hang di laptop.
 */
export default function SummativeModal({
  summatives,
  newSummativeName,
  setNewSummativeName,
  handleAddSummative,
  handleDeleteSummative,
  onClose,
}) {
  // Handler stabil — tidak dibuat ulang setiap render
  const handleNameChange = useCallback((val) => {
    setNewSummativeName(val)
  }, [setNewSummativeName])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleAddSummative()
  }, [handleAddSummative])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Atur Sumatif</h3>
            <p className="text-xs text-slate-400 mt-0.5">Lingkup Materi Sumatif</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Tambah */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <SanitizedInput
              value={newSummativeName}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              placeholder="Nama Sumatif (e.g. Sumatif Bab 1, bisa paste dari Word)"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              onClick={handleAddSummative}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 rounded-xl font-bold text-xs cursor-pointer transition-colors"
            >
              Tambah
            </button>
          </div>

          {/* Daftar Sumatif */}
          <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-800 rounded-xl p-3 bg-slate-950/40">
            {summatives.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">
                Belum ada lingkup sumatif.
              </p>
            ) : (
              summatives.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs"
                >
                  <span className="text-slate-300 truncate">{s.name}</span>
                  <button
                    onClick={() => handleDeleteSummative(s.id)}
                    className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer transition-colors shrink-0 ml-2"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
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