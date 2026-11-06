import { useMemo, useState } from 'react'
import { X, Plus, Trash2, ArrowUp, ArrowDown, ListChecks, Scale, Equal } from 'lucide-react'
import Swal from '@/lib/swal'
import Alert from '@/components/ui/Alert'
import Modal from '@/components/ui/Modal'
import { useAssessmentFormatMutations } from '../useAssessmentFormats'

const newId = () => crypto.randomUUID()

// ── Preset komponen ───────────────────────────────────────────────────────────
const PRESETS = {
  merdeka: {
    label: 'Kurikulum Merdeka',
    build: () => [
      { id: newId(), name: 'Formatif', kind: 'countable', with_tp: true, tp_aggregation: 'global', weight: '25', subMode: 'single', customSubs: [] },
      { id: newId(), name: 'Sumatif Lingkup Materi', kind: 'countable', with_tp: false, tp_aggregation: 'global', weight: '25', subMode: 'single', customSubs: [] },
      { id: newId(), name: 'STS', kind: 'fixed', with_tp: false, tp_aggregation: 'global', weight: '25', subMode: 'practice_written', customSubs: [] },
      { id: newId(), name: 'SAS', kind: 'fixed', with_tp: false, tp_aggregation: 'global', weight: '25', subMode: 'practice_written', customSubs: [] },
    ],
  },
  uh: {
    label: 'UH + UTS/UAS',
    build: () => [
      { id: newId(), name: 'Ulangan Harian', kind: 'countable', with_tp: false, tp_aggregation: 'global', weight: '40', subMode: 'single', customSubs: [] },
      { id: newId(), name: 'UTS / STS', kind: 'fixed', with_tp: false, tp_aggregation: 'global', weight: '30', subMode: 'practice_written', customSubs: [] },
      { id: newId(), name: 'UAS / SAS', kind: 'fixed', with_tp: false, tp_aggregation: 'global', weight: '30', subMode: 'practice_written', customSubs: [] },
    ],
  },
  kosong: {
    label: 'Kosong',
    build: () => [],
  },
}

const emptyComponent = () => ({
  id: newId(),
  name: '',
  kind: 'countable',
  with_tp: false,
  tp_aggregation: 'global',
  weight: '',
  subMode: 'single',
  customSubs: [],
})

const PRACTICE_WRITTEN = [
  { key: 'practice', label: 'Praktik' },
  { key: 'written', label: 'Tertulis' },
]

// ── Konversi server ↔ state form ─────────────────────────────────────────────
const fixedSubValuesOf = (component) => {
  if (component.subMode === 'practice_written') return PRACTICE_WRITTEN
  if (component.subMode === 'custom') {
    return component.customSubs
      .map((sub) => ({ key: sub.key, label: (sub.label ?? '').trim() }))
      .filter((sub) => sub.label)
  }
  return null
}

const toClientComponent = (component) => {
  let subMode = 'single'
  let customSubs = []
  const subs = component.sub_values
  if (Array.isArray(subs) && subs.length > 0) {
    const keys = subs.map((sub) => sub.key).join(',')
    if (keys === 'practice,written') {
      subMode = 'practice_written'
    } else {
      subMode = 'custom'
      customSubs = subs.map((sub) => ({ key: sub.key, label: sub.label }))
    }
  }
  return {
    id: component.id ?? newId(),
    name: component.name ?? '',
    kind: component.kind ?? 'countable',
    with_tp: Boolean(component.with_tp),
    tp_aggregation: component.tp_aggregation ?? 'global',
    weight: component.weight ?? '',
    subMode,
    customSubs,
  }
}

const toServiceComponents = (components, mode) =>
  components.map((component, index) => ({
    id: component.id,
    name: component.name.trim(),
    kind: component.kind,
    with_tp: component.kind === 'countable' ? component.with_tp : false,
    tp_aggregation: component.tp_aggregation,
    sub_values: component.kind === 'fixed' ? fixedSubValuesOf(component) : null,
    weight: mode === 'weighted' ? component.weight : null,
    sort_order: index,
  }))

// ── Validasi ─────────────────────────────────────────────────────────────────
function validate({ name, components, mode }) {
  const errors = []
  if (!name.trim()) errors.push('Nama format wajib diisi.')
  if (components.length === 0) errors.push('Minimal 1 komponen penilaian.')

  const seen = new Set()
  components.forEach((component) => {
    const label = component.name.trim() || '(tanpa nama)'
    if (!component.name.trim()) errors.push(`Nama komponen wajib diisi (posisi ${components.indexOf(component) + 1}).`)
    const key = component.name.trim().toLowerCase()
    if (key && seen.has(key)) errors.push(`Nama komponen "${label}" duplikat.`)
    seen.add(key)

    if (component.kind === 'fixed' && component.subMode === 'custom') {
      const filled = component.customSubs.filter((sub) => (sub.label ?? '').trim())
      if (filled.length < 2) errors.push(`Komponen "${label}": minimal 2 sub-nilai dengan label terisi.`)
    }

    if (mode === 'weighted') {
      const w = Number(component.weight)
      if (component.weight === '' || Number.isNaN(w) || w < 0) {
        errors.push(`Komponen "${label}": bobot wajib diisi (angka ≥ 0).`)
      }
    }
  })

  return errors
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function FormatFormModal({ format, onClose }) {
  const isEdit = Boolean(format)
  const { saveFormat } = useAssessmentFormatMutations()

  const [name, setName] = useState(format?.name ?? '')
  const [description, setDescription] = useState(format?.description ?? '')
  const [isActive, setIsActive] = useState(format?.is_active ?? true)
  const [mode, setMode] = useState(format?.calculation_mode ?? 'equal')
  const [components, setComponents] = useState(() =>
    format ? format.components.map(toClientComponent) : PRESETS.merdeka.build()
  )
  const [errors, setErrors] = useState([])

  const saving = saveFormat.isPending

  const totalWeight = useMemo(
    () => components.reduce((sum, component) => sum + (Number(component.weight) || 0), 0),
    [components]
  )

  const applyPreset = (presetKey) => {
    const build = PRESETS[presetKey].build
    if (components.length > 0) {
      const confirmed = window.confirm('Komponen yang sudah diisi akan diganti dengan preset. Lanjutkan?')
      if (!confirmed) return
    }
    setComponents(build())
  }

  const updateComponent = (id, patch) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const removeComponent = (id) => {
    setComponents((prev) => prev.filter((c) => c.id !== id))
  }

  const moveComponent = (index, direction) => {
    setComponents((prev) => {
      const next = prev.slice()
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    if (nextMode === 'weighted') {
      // isi bobot otomatis rata jika masih kosong
      setComponents((prev) => {
        const n = Math.max(prev.length, 1)
        const share = (100 / n).toFixed(1)
        return prev.map((c) => (c.weight === '' || c.weight == null ? { ...c, weight: share } : c))
      })
    }
  }

  const addCustomSub = (componentId) => {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === componentId && c.customSubs.length < 4
          ? { ...c, customSubs: [...c.customSubs, { key: `sub_${crypto.randomUUID().slice(0, 8)}`, label: '' }] }
          : c
      )
    )
  }

  const updateCustomSub = (componentId, key, label) => {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === componentId
          ? { ...c, customSubs: c.customSubs.map((sub) => (sub.key === key ? { ...sub, label } : sub)) }
          : c
      )
    )
  }

  const removeCustomSub = (componentId, key) => {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === componentId ? { ...c, customSubs: c.customSubs.filter((sub) => sub.key !== key) } : c
      )
    )
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const validationErrors = validate({ name, components, mode })
    setErrors(validationErrors)
    if (validationErrors.length > 0) return

    try {
      await saveFormat.mutateAsync({
        id: format?.id ?? null,
        format: {
          name: name.trim(),
          description: description.trim(),
          calculation_mode: mode,
          is_active: isActive,
        },
        components: toServiceComponents(components, mode),
      })

      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2200,
        icon: 'success',
        title: isEdit ? 'Format berhasil diperbarui' : 'Format berhasil dibuat',
      })
      onClose()
    } catch (err) {
      console.error('Gagal menyimpan format:', err)
      setErrors([err?.message ?? 'Gagal menyimpan format. Coba lagi.'])
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl" ariaLabel={isEdit ? 'Edit Format Penilaian' : 'Buat Format Penilaian'}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <ListChecks size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-100 leading-tight">
                {isEdit ? 'Edit Format Penilaian' : 'Buat Format Penilaian'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Tentukan komponen apa saja yang dipakai menilai.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer p-1"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

      <form onSubmit={handleSave} className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
          {errors.length > 0 && (
            <Alert tone="error" title="Periksa kembali isian berikut:">
              <ul className="list-disc pl-4 space-y-0.5">
                {errors.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Nama & deskripsi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nama Format *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Format Kurikulum Merdeka 2026/2027"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <label className="flex items-center gap-2 h-[38px] px-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-medium">Format aktif</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Deskripsi (opsional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan singkat tentang format ini..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Mode perhitungan */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Mode Perhitungan Nilai Akhir
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchMode('equal')}
                aria-pressed={mode === 'equal'}
                className={`flex items-start gap-2.5 text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  mode === 'equal'
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <Equal size={16} className={`mt-0.5 shrink-0 ${mode === 'equal' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>
                  <span className="block text-xs font-bold text-slate-200">Rata-rata</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Nilai akhir = rata-rata komponen yang terisi (seperti /4 sekarang)
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('weighted')}
                aria-pressed={mode === 'weighted'}
                className={`flex items-start gap-2.5 text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  mode === 'weighted'
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <Scale size={16} className={`mt-0.5 shrink-0 ${mode === 'weighted' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>
                  <span className="block text-xs font-bold text-slate-200">Bobot</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Setiap komponen punya bobot; dinormalisasi otomatis (tidak harus 100)
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Komponen */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Komponen Penilaian ({components.length})
              </label>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="hidden sm:inline">Isi dari preset:</span>
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className="px-2 py-1 rounded-lg border border-slate-800 bg-slate-950 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors cursor-pointer font-semibold"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {components.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-4 py-6 text-center text-xs text-slate-500">
                Belum ada komponen. Klik preset di atas atau &quot;+ Tambah Komponen&quot;.
              </div>
            )}

            <div className="space-y-2">
              {components.map((component, index) => (
                <ComponentRow
                  key={component.id}
                  component={component}
                  index={index}
                  total={components.length}
                  mode={mode}
                  onChange={updateComponent}
                  onRemove={removeComponent}
                  onMove={moveComponent}
                  onAddCustomSub={addCustomSub}
                  onUpdateCustomSub={updateCustomSub}
                  onRemoveCustomSub={removeCustomSub}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setComponents((prev) => [...prev, emptyComponent()])}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-800 text-xs font-bold text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Tambah Komponen
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 flex-wrap border-t border-slate-800 pt-4">
            <div className="text-[10px] text-slate-500 leading-snug">
              {mode === 'weighted' ? (
                <>
                  Total bobot: <b className="text-slate-300">{totalWeight.toFixed(1)}</b> — dinormalisasi otomatis,
                  tidak wajib 100. Komponen kosong tetap dilewati.
                </>
              ) : (
                <>Komponen yang kosong dilewati saat menghitung nilai akhir.</>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl transition-all cursor-pointer"
              >
                {saving ? 'Menyimpan...' : 'Simpan Format'}
              </button>
            </div>
          </div>
        </form>
    </Modal>
  )
}

// ── Baris komponen ────────────────────────────────────────────────────────────
function ComponentRow({
  component,
  index,
  total,
  mode,
  onChange,
  onRemove,
  onMove,
  onAddCustomSub,
  onUpdateCustomSub,
  onRemoveCustomSub,
}) {
  const inputClass =
    'bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors'

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
      {/* Baris 1: urutan, nama, bobot, hapus */}
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col shrink-0">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-30 cursor-pointer"
            aria-label="Naikkan urutan"
          >
            <ArrowUp size={13} />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-30 cursor-pointer"
            aria-label="Turunkan urutan"
          >
            <ArrowDown size={13} />
          </button>
        </div>
        <span className="text-[10px] font-mono text-slate-600 w-4 text-center shrink-0">{index + 1}</span>
        <input
          type="text"
          value={component.name}
          onChange={(e) => onChange(component.id, { name: e.target.value })}
          placeholder="Nama komponen (mis. Sumatif per Bab)"
          className={`${inputClass} flex-1 min-w-0`}
        />
        {mode === 'weighted' && (
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min="0"
              step="any"
              value={component.weight}
              onChange={(e) => onChange(component.id, { weight: e.target.value })}
              placeholder="0"
              className={`${inputClass} w-16 text-center`}
              aria-label="Bobot komponen"
            />
            <span className="text-[10px] text-slate-500 font-bold">bobot</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => onRemove(component.id)}
          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
          aria-label="Hapus komponen"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Baris 2: tipe */}
      <div className="flex items-center gap-2 flex-wrap pl-7">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tipe</span>
        <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5">
          <button
            type="button"
            onClick={() => onChange(component.id, { kind: 'countable' })}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
              component.kind === 'countable' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Jumlah diisi guru
          </button>
          <button
            type="button"
            onClick={() => onChange(component.id, { kind: 'fixed' })}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
              component.kind === 'fixed' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Selalu ada (fixed)
          </button>
        </div>
      </div>

      {/* Baris 3: opsi spesifik */}
      <div className="pl-7">
        {component.kind === 'countable' ? (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={component.with_tp}
                onChange={(e) => onChange(component.id, { with_tp: e.target.checked })}
                className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[10px] text-slate-300 font-medium">Item berisi TP (mis. Bab → TP)</span>
            </label>
            {component.with_tp && (
              <label className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Cara hitung</span>
                <select
                  value={component.tp_aggregation}
                  onChange={(e) => onChange(component.id, { tp_aggregation: e.target.value })}
                  className={`${inputClass} py-1`}
                >
                  <option value="global">Rata-rata semua TP</option>
                  <option value="per_item">Rata-rata per item, lalu antar item</option>
                </select>
              </label>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Sub-nilai</span>
              <select
                value={component.subMode}
                onChange={(e) => {
                  const subMode = e.target.value
                  onChange(component.id, {
                    subMode,
                    customSubs:
                      subMode === 'custom' && component.customSubs.length === 0
                        ? [
                            { key: `sub_${crypto.randomUUID().slice(0, 8)}`, label: 'Praktik' },
                            { key: `sub_${crypto.randomUUID().slice(0, 8)}`, label: 'Tertulis' },
                          ]
                        : component.customSubs,
                  })
                }}
                className={`${inputClass} py-1`}
              >
                <option value="single">Nilai tunggal</option>
                <option value="practice_written">Praktik + Tertulis</option>
                <option value="custom">Custom…</option>
              </select>
            </label>

            {component.subMode === 'custom' && (
              <div className="space-y-1.5 pl-1">
                {component.customSubs.map((sub) => (
                  <div key={sub.key} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={sub.label}
                      onChange={(e) => onUpdateCustomSub(component.id, sub.key, e.target.value)}
                      placeholder="Label sub-nilai"
                      className={`${inputClass} flex-1 min-w-0`}
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveCustomSub(component.id, sub.key)}
                      className="p-1 text-slate-600 hover:text-rose-400 cursor-pointer"
                      aria-label="Hapus sub-nilai"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {component.customSubs.length < 4 && (
                  <button
                    type="button"
                    onClick={() => onAddCustomSub(component.id)}
                    className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={11} /> Tambah sub-nilai
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
