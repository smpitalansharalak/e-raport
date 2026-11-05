import { useState } from 'react'
import {
  Plus,
  Edit2,
  Copy,
  Trash2,
  ListChecks,
  Star,
  Scale,
  Equal,
  Inbox,
  Loader2,
} from 'lucide-react'
import Swal from 'sweetalert2'
import Alert from '@/components/ui/Alert'
import { useAssessmentFormats, useAssessmentFormatMutations } from './useAssessmentFormats'
import FormatFormModal from './components/FormatFormModal'

export default function AssessmentFormatsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingFormat, setEditingFormat] = useState(null)

  const formatsQuery = useAssessmentFormats()
  const formats = formatsQuery.data ?? []
  const { deleteFormat, duplicateFormat, setDefaultFormat } = useAssessmentFormatMutations()

  const openCreateModal = () => {
    setEditingFormat(null)
    setShowModal(true)
  }

  const openEditModal = (format) => {
    setEditingFormat(format)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingFormat(null)
  }

  const handleDelete = async (format) => {
    const usedText =
      format.periodCount > 0
        ? `Format ini dipakai oleh ${format.periodCount} periode rapor. Komponen pada periode lama TIDAK terpengaruh (sudah tersnapshot), hanya format template ini yang dihapus.`
        : 'Format ini belum dipakai periode mana pun.'

    const confirmed = window.confirm(`Hapus format "${format.name}"?\n\n${usedText}`)
    if (!confirmed) return

    try {
      await deleteFormat.mutateAsync(format.id)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        icon: 'success',
        title: 'Format dihapus',
        background: '#0f172a',
        color: '#f8fafc',
      })
    } catch (err) {
      console.error('Gagal menghapus format:', err)
      Swal.fire({ title: 'Gagal', text: err.message, icon: 'error', background: '#0f172a', color: '#f8fafc' })
    }
  }

  const handleDuplicate = async (format) => {
    try {
      await duplicateFormat.mutateAsync(format.id)
    } catch (err) {
      console.error('Gagal menduplikasi format:', err)
      Swal.fire({ title: 'Gagal', text: err.message, icon: 'error', background: '#0f172a', color: '#f8fafc' })
    }
  }

  const handleSetDefault = async (format) => {
    try {
      await setDefaultFormat.mutateAsync(format.id)
    } catch (err) {
      console.error('Gagal mengatur default format:', err)
      Swal.fire({ title: 'Gagal', text: err.message, icon: 'error', background: '#0f172a', color: '#f8fafc' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 m-0 flex items-center gap-2">
            <ListChecks size={22} className="text-emerald-500" />
            Format Penilaian
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Tentukan komponen apa saja yang dipakai untuk menilai (mis. Ulangan Harian, Sumatif per Bab, UTS, UAS).
            Saat membuat periode rapor, admin memilih format yang dipakai — komponen disalin (snapshot) ke periode,
            dan guru yang menentukan jumlah itemnya.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="shrink-0 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
        >
          <Plus size={16} /> Buat Format
        </button>
      </div>

      {formatsQuery.isError && (
        <Alert tone="error" title="Gagal memuat format">
          Pastikan migrasi database sudah dijalankan, lalu muat ulang halaman.
        </Alert>
      )}

      {/* Daftar format */}
      {formatsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Memuat format...
        </div>
      ) : formats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-14 text-center space-y-3">
          <Inbox size={32} className="mx-auto text-slate-700" />
          <div>
            <p className="text-sm font-semibold text-slate-300">Belum ada Format Penilaian</p>
            <p className="text-xs text-slate-500 mt-1">
              Buat format pertama — atau klik &quot;Buat Format&quot;, komponen bawaan Kurikulum Merdeka langsung terisi.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold gap-1.5 items-center transition-colors cursor-pointer"
          >
            <Plus size={14} /> Buat Format Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {formats.map((format) => (
            <FormatCard
              key={format.id}
              format={format}
              onEdit={() => openEditModal(format)}
              onDelete={() => handleDelete(format)}
              onDuplicate={() => handleDuplicate(format)}
              onSetDefault={() => handleSetDefault(format)}
            />
          ))}
        </div>
      )}

      {/* Modal buat/edit */}
      {showModal && <FormatFormModal format={editingFormat} onClose={closeModal} />}
    </div>
  )
}

function FormatCard({ format, onEdit, onDelete, onDuplicate, onSetDefault }) {
  const weighted = format.calculation_mode === 'weighted'

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-slate-700 transition-colors">
      {/* Baris atas: nama + default star */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-100 leading-snug">{format.name}</p>
          {format.description && (
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{format.description}</p>
          )}
        </div>
        <button
          onClick={onSetDefault}
          title={format.is_default ? 'Format default (dipilih otomatis saat buat periode)' : 'Jadikan format default'}
          aria-pressed={format.is_default}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            format.is_default
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10'
          }`}
        >
          <Star size={16} fill={format.is_default ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Badge */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            weighted
              ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
              : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
          }`}
        >
          {weighted ? <Scale size={10} /> : <Equal size={10} />}
          {weighted ? 'Bobot' : 'Rata-rata'}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-800 bg-slate-950 text-slate-400">
          {format.components.length} komponen
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-800 bg-slate-950 text-slate-400">
          {format.periodCount} periode
        </span>
        {!format.is_active && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-300">
            Nonaktif
          </span>
        )}
      </div>

      {/* Komponen ringkas */}
      <ol className="text-[11px] text-slate-400 space-y-1 border-t border-slate-800/80 pt-2.5 min-h-[72px]">
        {format.components.map((component) => (
          <li key={component.id} className="flex items-center gap-1.5 min-w-0">
            <span className="text-slate-600 font-mono shrink-0">•</span>
            <span className="truncate">{component.name}</span>
            <span className="text-slate-600 shrink-0">
              {component.kind === 'fixed' ? '· fixed' : component.with_tp ? '· TP' : '· fleksibel'}
            </span>
          </li>
        ))}
        {format.components.length === 0 && <li className="text-slate-600 italic">Tanpa komponen</li>}
      </ol>

      {/* Aksi */}
      <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-800/80">
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors cursor-pointer"
        >
          <Edit2 size={13} /> Edit
        </button>
        <button
          onClick={onDuplicate}
          title="Duplikat format"
          aria-label="Duplikat format"
          className="p-2 rounded-xl text-slate-500 bg-slate-950 border border-slate-800 hover:text-slate-200 hover:border-slate-700 transition-colors cursor-pointer"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={onDelete}
          title="Hapus format"
          aria-label="Hapus format"
          className="p-2 rounded-xl text-slate-500 bg-slate-950 border border-slate-800 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
