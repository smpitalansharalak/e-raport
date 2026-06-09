import React, { useState, useEffect } from 'react'
import { X, GripVertical, CheckSquare, Square, ChevronUp, ChevronDown, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/**
 * Modal untuk mengkonfigurasi dan mengurutkan mata pelajaran pada sebuah periode rapor.
 * Mendukung centang/uncentang mapel dan drag menggunakan tombol ↑↓ untuk mengubah urutan.
 * Urutan disimpan ke kolom `sort_order` di tabel `report_subjects`.
 */
export default function SubjectOrderModal({ period, allSubjects, onClose, onSaved }) {
  // State: array of { subject_id, name, class_name, sort_order, assigned }
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load current assignments for this period on mount
  useEffect(() => {
    if (!period) return
    loadAssignments()
  }, [period])

  const loadAssignments = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchErr } = await supabase
        .from('report_subjects')
        .select('subject_id, sort_order')
        .eq('report_period_id', period.id)
        .order('sort_order', { ascending: true })

      if (fetchErr) throw fetchErr

      // Build a map of assigned subjects with their sort_order
      const assignedMap = {}
      ;(data || []).forEach((r) => {
        assignedMap[r.subject_id] = r.sort_order ?? 9999
      })

      // Filter subjects relevant to this period's class
      const filtered = allSubjects.filter((sub) => {
        if (!sub.class_name) return true
        const pClass = (period.class_name || '').toLowerCase()
        return pClass.startsWith(sub.class_name.toLowerCase()) ||
               pClass.includes(sub.class_name.toLowerCase())
      })

      // Split into assigned (ordered) and unassigned
      const assigned = filtered
        .filter((s) => s.id in assignedMap)
        .sort((a, b) => (assignedMap[a.id] ?? 9999) - (assignedMap[b.id] ?? 9999))
        .map((s) => ({ ...s, assigned: true }))

      const unassigned = filtered
        .filter((s) => !(s.id in assignedMap))
        .map((s) => ({ ...s, assigned: false }))

      setItems([...assigned, ...unassigned])
    } catch (err) {
      setError('Gagal memuat data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Toggle a subject's assignment
  const toggleItem = (subjectId) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === subjectId ? { ...item, assigned: !item.assigned } : item
      )
    )
  }

  // Move item up in the list
  const moveUp = (index) => {
    if (index === 0) return
    setItems((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  // Move item down in the list
  const moveDown = (index) => {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  // Save: upsert / delete rows in report_subjects with updated sort_order
  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      // 1. Get current assignments from DB
      const { data: existing, error: existErr } = await supabase
        .from('report_subjects')
        .select('subject_id')
        .eq('report_period_id', period.id)

      if (existErr) throw existErr

      const existingIds = new Set((existing || []).map((r) => r.subject_id))
      const wantedItems = items.filter((i) => i.assigned)
      const wantedIds = new Set(wantedItems.map((i) => i.id))

      // 2. Insert newly assigned subjects
      const toInsert = wantedItems
        .filter((i) => !existingIds.has(i.id))
        .map((i, idx) => ({
          report_period_id: period.id,
          subject_id: i.id,
          sort_order: wantedItems.indexOf(i),
        }))

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase.from('report_subjects').insert(toInsert)
        if (insertErr) throw insertErr
      }

      // 3. Delete unassigned subjects
      const toDelete = [...existingIds].filter((id) => !wantedIds.has(id))
      for (const subjectId of toDelete) {
        const { error: delErr } = await supabase
          .from('report_subjects')
          .delete()
          .eq('report_period_id', period.id)
          .eq('subject_id', subjectId)
        if (delErr) throw delErr
      }

      // 4. Update sort_order for all assigned subjects
      for (let idx = 0; idx < wantedItems.length; idx++) {
        const { error: updErr } = await supabase
          .from('report_subjects')
          .update({ sort_order: idx })
          .eq('report_period_id', period.id)
          .eq('subject_id', wantedItems[idx].id)
        if (updErr) throw updErr
      }

      onSaved?.()
      onClose()
    } catch (err) {
      console.error('Error saving subject order:', err)
      setError('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const assignedItems = items.filter((i) => i.assigned)
  const unassignedItems = items.filter((i) => !i.assigned)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Konfigurasi & Urutan Mapel</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Periode: <span className="text-slate-200 font-semibold">{period.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400 text-sm">
            <Loader2 size={18} className="animate-spin" />
            Memuat daftar mapel...
          </div>
        ) : (
          <>
            {/* Assigned subjects — ordered list */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Mapel Aktif di Rapor
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold">
                  {assignedItems.length} mapel
                </span>
              </div>

              {assignedItems.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2 text-center">
                  Belum ada mapel dipilih. Centang dari daftar di bawah.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {assignedItems.map((item, visualIdx) => {
                    const realIdx = items.findIndex((i) => i.id === item.id)
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 bg-slate-950 border border-emerald-500/20 rounded-xl px-3 py-2"
                      >
                        {/* Nomor urut */}
                        <span className="text-[10px] font-bold text-emerald-400/70 w-5 shrink-0 text-center">
                          {visualIdx + 1}
                        </span>

                        {/* Grip icon (dekoratif) */}
                        <GripVertical size={13} className="text-slate-600 shrink-0" />

                        {/* Nama mapel */}
                        <span className="flex-1 text-xs font-semibold text-emerald-300 truncate">
                          {item.name}
                          {item.class_name && (
                            <span className="block text-[9px] text-slate-500 font-normal">
                              Kelas {item.class_name}
                            </span>
                          )}
                        </span>

                        {/* Tombol atas bawah */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveUp(realIdx)}
                            disabled={visualIdx === 0}
                            className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-default transition-colors"
                            title="Pindah ke atas"
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            onClick={() => moveDown(realIdx)}
                            disabled={visualIdx === assignedItems.length - 1}
                            className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-default transition-colors"
                            title="Pindah ke bawah"
                          >
                            <ChevronDown size={13} />
                          </button>
                        </div>

                        {/* Tombol hapus centang */}
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors ml-1"
                          title="Hapus dari rapor"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            {unassignedItems.length > 0 && (
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Mapel Tersedia (klik untuk tambahkan)
                </span>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {unassignedItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className="flex items-center gap-2 p-2 rounded-xl border border-slate-800 bg-slate-950/40 text-left text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-950 transition-all cursor-pointer"
                    >
                      <Square size={13} className="shrink-0 text-slate-600" />
                      <span className="truncate leading-tight">
                        {item.name}
                        {item.class_name && (
                          <span className="block text-[9px] text-slate-600 mt-0.5">
                            Kelas {item.class_name}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <p className="text-[10px] text-slate-600 italic">
            Urutan ini akan diterapkan saat cetak rapor.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <><Loader2 size={13} className="animate-spin" /> Menyimpan...</>
              ) : (
                <><Save size={13} /> Simpan Urutan</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
