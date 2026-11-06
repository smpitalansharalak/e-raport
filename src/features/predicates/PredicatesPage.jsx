import { useEffect, useState } from 'react'
import {
  Award,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
  Sliders,
} from 'lucide-react'
import Swal from '@/lib/swal'
import Alert from '@/components/ui/Alert'
import PredicateBadge from '@/components/ui/PredicateBadge'
import { findPredicateOverlaps } from '@/utils/predicates'
import { usePredicates, usePredicatePlacement, usePredicateMutations } from './usePredicates'
import { DEFAULT_PLACEMENT } from './predicatesService'

const newRow = (sortOrder) => ({
  id: crypto.randomUUID(),
  label: '',
  description: '',
  min_score: '',
  max_score: '',
  sort_order: sortOrder,
  is_active: true,
})

export default function PredicatesPage() {
  const predicatesQuery = usePredicates()
  const placementQuery = usePredicatePlacement()
  const { saveList, remove, savePlacement } = usePredicateMutations()

  // ── Draft daftar predikat (disimpan sekaligus lewat tombol Simpan) ───────────
  const [rows, setRows] = useState([])
  const [draftErrors, setDraftErrors] = useState([])
  const [placement, setPlacement] = useState(DEFAULT_PLACEMENT)

  useEffect(() => {
    if (predicatesQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(predicatesQuery.data.map((p) => ({ ...p })))
    }
  }, [predicatesQuery.data])

  useEffect(() => {
    if (placementQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlacement(placementQuery.data)
    }
  }, [placementQuery.data])

  const savingList = saveList.isPending
  const savingPlacement = savePlacement.isPending

  const updateRow = (index, patch) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index) => {
    const row = rows[index]
    if (!row) return
    const confirmed = window.confirm(
      `Hapus predikat "${row.label || '(belum diberi nama)'}"?`
    )
    if (!confirmed) return

    // baris bawaan DB langsung dihapus; baris baru (belum tersimpan) cukup dibuang dari draft
    if (predicatesQuery.data?.some((p) => p.id === row.id)) {
      remove.mutate(row.id)
    }
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const moveRow = (index, direction) => {
    setRows((prev) => {
      const next = prev.slice()
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next.map((row, i) => ({ ...row, sort_order: i }))
    })
  }

  const handleSaveList = async () => {
    const errors = []
    rows.forEach((row, index) => {
      if (!String(row.label ?? '').trim()) {
        errors.push(`Baris ${index + 1}: label wajib diisi.`)
      }
      const min = Number(row.min_score)
      const max = Number(row.max_score)
      if (row.min_score === '' || row.max_score === '' || Number.isNaN(min) || Number.isNaN(max)) {
        errors.push(`Baris ${index + 1} ("${row.label || '?'}"): rentang nilai wajib diisi angka.`)
      } else if (min > max) {
        errors.push(`Baris ${index + 1} ("${row.label}"): nilai minimum tidak boleh lebih besar dari maksimum.`)
      }
    })

    const overlapErrors = findPredicateOverlaps(rows)
    errors.push(...overlapErrors)

    setDraftErrors(errors)
    if (errors.length > 0) return

    try {
      await saveList.mutateAsync({ predicates: rows })
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        icon: 'success',
        title: 'Predikat tersimpan',
      })
    } catch (err) {
      console.error('Gagal menyimpan predikat:', err)
      setDraftErrors([err?.message ?? 'Gagal menyimpan predikat.'])
    }
  }

  const handleSavePlacement = async () => {
    try {
      await savePlacement.mutateAsync(placement)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        icon: 'success',
        title: 'Penempatan predikat tersimpan',
      })
    } catch (err) {
      console.error('Gagal menyimpan penempatan:', err)
      Swal.fire({ title: 'Gagal', text: err.message, icon: 'error' })
    }
  }

  if (predicatesQuery.isLoading || placementQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2 text-sm">
        <Loader2 size={18} className="animate-spin" /> Memuat predikat...
      </div>
    )
  }

  if (predicatesQuery.isError || placementQuery.isError) {
    return (
      <Alert tone="error" title="Gagal memuat predikat">
        Pastikan migrasi database (<code>supabase_migration_grade_predicates.sql</code>) sudah dijalankan, lalu muat ulang halaman.
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 m-0 flex items-center gap-2">
          <Award size={22} className="text-emerald-500" />
          Predikat Nilai
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Tentukan predikat (mis. A–D) beserta rentang nilainya — berlaku global untuk semua periode &amp; format.
          Predikat hanya ditampilkan saat mengisi nilai di tabel Input Nilai; nilai yang tersimpan tidak berubah.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* ═══ Card 1 — Daftar Predikat ═══ */}
        <section className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Daftar Predikat</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Urutkan dari terbaik → terjelek. Warna badge otomatis mengikuti urutan.
              </p>
            </div>
            <button
              onClick={() => setRows((prev) => [...prev, newRow(prev.length)])}
              className="shrink-0 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={14} /> Tambah
            </button>
          </div>

          {draftErrors.length > 0 && (
            <div className="px-5 pt-4">
              <Alert tone="error" title="Periksa kembali isian berikut:">
                <ul className="list-disc pl-4 space-y-0.5">
                  {draftErrors.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </Alert>
            </div>
          )}

          <div className="p-4 overflow-x-auto">
            <div className="min-w-[680px] space-y-2">
            {rows.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-8">
                Belum ada predikat. Klik &quot;Tambah&quot; untuk membuat predikat pertama.
              </p>
            )}

            {/* Header kolom (desktop) */}
            {rows.length > 0 && (
              <div className="hidden md:grid grid-cols-[auto_64px_1fr_64px_120px_64px_80px_auto] gap-2 px-2 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                <span />
                <span>Label</span>
                <span>Deskripsi</span>
                <span className="text-center">Min</span>
                <span className="text-center">Maks</span>
                <span className="text-center">Aktif</span>
                <span>Pratinjau</span>
                <span />
              </div>
            )}

            {rows.map((row, index) => (
              <div
                key={row.id}
                className={`grid grid-cols-[auto_64px_1fr_64px_120px_64px_80px_auto] gap-2 items-center px-2 py-1.5 rounded-xl border ${
                  row.is_active
                    ? 'border-slate-800 bg-slate-950/50'
                    : 'border-slate-800/60 bg-slate-950/20 opacity-60'
                }`}
              >
                {/* Urutan */}
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    onClick={() => moveRow(index, -1)}
                    disabled={index === 0}
                    className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-30 cursor-pointer"
                    aria-label="Naikkan urutan"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(index, 1)}
                    disabled={index === rows.length - 1}
                    className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-30 cursor-pointer"
                    aria-label="Turunkan urutan"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>

                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => updateRow(index, { label: e.target.value })}
                  placeholder="A"
                  className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs font-bold text-slate-100 text-center focus:outline-none focus:border-emerald-500 transition-colors"
                  aria-label="Label predikat"
                />
                <input
                  type="text"
                  value={row.description ?? ''}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  placeholder="Sangat Baik"
                  className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-slate-200 min-w-0 focus:outline-none focus:border-emerald-500 transition-colors max-md:col-span-1"
                  aria-label="Deskripsi predikat"
                />
                <input
                  type="number"
                  step="any"
                  value={row.min_score}
                  onChange={(e) => updateRow(index, { min_score: e.target.value })}
                  placeholder="80"
                  className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-slate-200 text-center focus:outline-none focus:border-emerald-500 transition-colors"
                  aria-label="Nilai minimum"
                />
                <input
                  type="number"
                  step="any"
                  value={row.max_score}
                  onChange={(e) => updateRow(index, { max_score: e.target.value })}
                  placeholder="100"
                  className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-slate-200 text-center focus:outline-none focus:border-emerald-500 transition-colors"
                  aria-label="Nilai maksimum"
                />
                <label className="flex items-center justify-center cursor-pointer" title="Aktif/nonaktif predikat">
                  <input
                    type="checkbox"
                    checked={row.is_active ?? true}
                    onChange={(e) => updateRow(index, { is_active: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </label>
                <div className="flex justify-center">
                  {row.label.trim() && (
                    <PredicateBadge predicate={row} predicates={rows} size="sm" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer justify-self-end"
                  aria-label="Hapus predikat"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
              <button
                onClick={handleSaveList}
                disabled={savingList}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                {savingList ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Simpan Predikat
              </button>
            </div>
          </div>
        </section>

        {/* ═══ Card 2 — Penempatan ═══ */}
        <section className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
              <Sliders size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Penempatan Predikat</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Tentukan di kolom mana predikat tampil pada tabel Input Nilai.
              </p>
            </div>
          </div>

          <div className="p-5 space-y-3">
            <PlacementToggle
              checked={placement.show_on_inputs}
              onChange={(v) => setPlacement((p) => ({ ...p, show_on_inputs: v }))}
              title="Di setiap nilai (input)"
              description="Predikat muncul di bawah setiap kotak isian nilai — TP, item (Ulangan Harian/Bab), dan sub-nilai (Praktik/Tertulis). Tabel jadi lebih tinggi."
            />
            <PlacementToggle
              checked={placement.show_on_component_averages}
              onChange={(v) => setPlacement((p) => ({ ...p, show_on_component_averages: v }))}
              title="Di rata-rata komponen (Rrt)"
              description="Predikat muncul pada kolom Rata-rata tiap komponen (Formatif, Sumatif per Bab, STS/SAS, dst.). Direkomendasikan."
            />
            <PlacementToggle
              checked={placement.show_on_final}
              onChange={(v) => setPlacement((p) => ({ ...p, show_on_final: v }))}
              title="Di nilai akhir (Rapor)"
              description="Predikat muncul pada kolom Nilai Rapor (nilai akhir yang tercetak di rapor)."
            />

            <div className="pt-1">
              <button
                onClick={handleSavePlacement}
                disabled={savingPlacement}
                className="w-full px-4 py-2.5 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {savingPlacement ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Simpan Penempatan
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-[10px] text-slate-500 leading-relaxed">
              Perubahan penempatan berlaku langsung untuk semua tabel Input Nilai (tidak perlu snapshot per periode).
              Predikat bersifat informasional saat mengisi nilai — tidak disimpan dan tidak mengubah nilai akhir.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function PlacementToggle({ checked, onChange, title, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${
        checked ? 'border-emerald-500/50 bg-emerald-500/8' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
      }`}
    >
      <span
        className={`mt-0.5 shrink-0 w-9 h-5 rounded-full relative transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-slate-800'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className={`block text-xs font-bold ${checked ? 'text-emerald-300' : 'text-slate-200'}`}>
          {title}
        </span>
        <span className="block text-[10px] text-slate-500 mt-1 leading-snug">{description}</span>
      </span>
    </button>
  )
}
