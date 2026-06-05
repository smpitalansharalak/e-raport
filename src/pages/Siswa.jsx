import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useForm } from 'react-hook-form'
import * as XLSX from 'xlsx'
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  AlertCircle,
  Check,
  Upload,
  FileSpreadsheet,
  Download,
  ChevronDown,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { confirmDelete, showSuccess, showError, showLoading, closeLoading } from '../lib/swal'
import { useAvailableClasses } from '../hooks/useAvailableClasses'

// ─── Status config ─────────────────────────────────────────────────
const STATUS_COLORS = {
  aktif: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  naik_kelas: 'bg-indigo-500/10  border-indigo-500/20  text-indigo-400',
  lulus: 'bg-amber-500/10   border-amber-500/20   text-amber-400',
  alumni: 'bg-slate-800/60   border-slate-700/40   text-slate-400',
}
const STATUS_LABELS = { aktif: 'Aktif', naik_kelas: 'Naik Kelas', lulus: 'Lulus', alumni: 'Alumni' }

// ─── Template header CSV ────────────────────────────────────────────
const CSV_HEADERS = ['NISN', 'Nama Lengkap', 'Kelas', 'Tahun Ajaran', 'Fase', 'Nama Orang Tua/Wali']

// ─── StudentForm ────────────────────────────────────────────────────
function StudentForm({ editingStudent, onSaved, onCancel }) {
  const [formError, setFormError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: editingStudent
      ? {
        nisn: editingStudent.nisn,
        name: editingStudent.name,
        class_name: editingStudent.class_name,
        academic_year: editingStudent.academic_year,
        phase: editingStudent.phase,
        parent_name: editingStudent.parent_name || '',
      }
      : { nisn: '', name: '', class_name: '', academic_year: '2025/2026', phase: 'D', parent_name: '' },
  })

  const onSubmit = async (data) => {
    setFormError('')
    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update({ nisn: data.nisn, name: data.name, class_name: data.class_name, academic_year: data.academic_year, phase: data.phase, parent_name: data.parent_name })
          .eq('id', editingStudent.id)
        if (error) throw error
        onSaved('Data siswa berhasil diperbarui!')
      } else {
        const { error } = await supabase.from('students').insert({ nisn: data.nisn, name: data.name, class_name: data.class_name, academic_year: data.academic_year, phase: data.phase, parent_name: data.parent_name, status: 'aktif' })
        if (error) throw error
        onSaved('Siswa baru berhasil ditambahkan!')
      }
    } catch (err) {
      setFormError(err.message?.includes('duplicate') ? 'NISN sudah terdaftar di sistem.' : err.message || 'Gagal menyimpan data siswa.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {formError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle size={16} className="shrink-0" /><span>{formError}</span>
        </div>
      )}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">NISN</label>
        <input type="text" placeholder="Nomor Induk Siswa Nasional"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          {...register('nisn', { required: 'NISN wajib diisi', pattern: { value: /^\d+$/, message: 'NISN harus berupa angka' } })} />
        {errors.nisn && <span className="text-[11px] text-rose-500 mt-1 block">{errors.nisn.message}</span>}
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Lengkap Siswa</label>
        <input type="text" placeholder="Nama Lengkap Siswa"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          {...register('name', { required: 'Nama lengkap wajib diisi' })} />
        {errors.name && <span className="text-[11px] text-rose-500 mt-1 block">{errors.name.message}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kelas</label>
          <input type="text" placeholder="Contoh: VII A"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            {...register('class_name', { required: 'Kelas wajib diisi' })} />
          {errors.class_name && <span className="text-[11px] text-rose-500 mt-1 block">{errors.class_name.message}</span>}
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fase</label>
          <select className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            {...register('phase', { required: true })}>
            <option value="D">D (SMP)</option>
            <option value="E">E (SMA-10)</option>
            <option value="F">F (SMA-11/12)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tahun Ajaran</label>
          <input type="text" placeholder="Contoh: 2025/2026"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            {...register('academic_year', { required: 'Tahun ajaran wajib diisi' })} />
          {errors.academic_year && <span className="text-[11px] text-rose-500 mt-1 block">{errors.academic_year.message}</span>}
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Orang Tua / Wali</label>
          <input type="text" placeholder="Nama Orang Tua"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            {...register('parent_name')} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all cursor-pointer">
          Batal
        </button>
        <button type="submit" disabled={isSubmitting}
          className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
          {isSubmitting ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}

// ─── BulkImportPanel ─────────────────────────────────────────────────
function BulkImportPanel({ onImportDone }) {
  const fileRef = useRef()
  const [previewRows, setPreviewRows] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null) // { success, failed }
  const [fileName, setFileName] = useState('')

  // ── Download template ──────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      CSV_HEADERS,
      ['1234567890', 'Ahmad Fauzi', 'VII A', '2025/2026', 'D', 'Bapak Fauzi'],
      ['0987654321', 'Siti Rahayu', 'VII A', '2025/2026', 'D', 'Ibu Rahayu'],
    ])
    ws['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 6 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa')
    XLSX.writeFile(wb, 'Template_Import_Siswa.xlsx')
  }

  // ── Parse file ─────────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Skip header row (index 0)
        const dataRows = raw.slice(1).filter(r => r.some(c => String(c).trim() !== ''))

        const parsed = dataRows.map((r, idx) => ({
          _row: idx + 2, // Excel row number
          nisn: String(r[0] ?? '').trim(),
          name: String(r[1] ?? '').trim(),
          class_name: String(r[2] ?? '').trim(),
          academic_year: String(r[3] ?? '').trim(),
          phase: String(r[4] ?? '').trim() || 'D',
          parent_name: String(r[5] ?? '').trim(),
          _status: 'pending', // pending | ok | error | duplicate
          _error: '',
        }))

        // Validasi lokal
        const errors = []
        const nisnSet = new Set()
        parsed.forEach((row) => {
          if (!row.nisn) errors.push(`Baris ${row._row}: NISN kosong`)
          else if (!/^\d+$/.test(row.nisn)) errors.push(`Baris ${row._row}: NISN harus angka (${row.nisn})`)
          else if (nisnSet.has(row.nisn)) errors.push(`Baris ${row._row}: NISN duplikat dalam file (${row.nisn})`)
          else nisnSet.add(row.nisn)

          if (!row.name) errors.push(`Baris ${row._row}: Nama kosong`)
          if (!row.class_name) errors.push(`Baris ${row._row}: Kelas kosong`)
          if (!row.academic_year) errors.push(`Baris ${row._row}: Tahun Ajaran kosong`)
        })

        setValidationErrors(errors)
        setPreviewRows(parsed)
      } catch {
        setValidationErrors(['Gagal membaca file. Pastikan format Excel (.xlsx/.csv) benar.'])
        setPreviewRows([])
      }
    }
    reader.readAsBinaryString(file)
    // Reset input agar file yang sama bisa dipilih lagi
    e.target.value = ''
  }

  // ── Import ke Supabase ─────────────────────────────────────────
  const handleImport = async () => {
    if (previewRows.length === 0 || validationErrors.length > 0) return
    setImporting(true)
    setImportResult(null)

    showLoading('Mengimpor data siswa...')

    let successCount = 0
    const failedRows = []

    // Cek NISN yang sudah ada di DB
    const allNisns = previewRows.map(r => r.nisn)
    const { data: existing } = await supabase
      .from('students')
      .select('nisn')
      .in('nisn', allNisns)

    const existingNisns = new Set((existing || []).map(r => r.nisn))

    const newRows = []
    previewRows.forEach(row => {
      if (existingNisns.has(row.nisn)) {
        failedRows.push({ ...row, _error: 'NISN sudah terdaftar' })
      } else {
        newRows.push({
          nisn: row.nisn,
          name: row.name,
          class_name: row.class_name,
          academic_year: row.academic_year,
          phase: row.phase || 'D',
          parent_name: row.parent_name || null,
          status: 'aktif',
        })
      }
    })

    // Insert batch per 50 baris
    const CHUNK = 50
    for (let i = 0; i < newRows.length; i += CHUNK) {
      const chunk = newRows.slice(i, i + CHUNK)
      const { error } = await supabase.from('students').insert(chunk)
      if (error) {
        chunk.forEach(r => failedRows.push({ ...r, _error: error.message }))
      } else {
        successCount += chunk.length
      }
    }

    closeLoading()
    setImporting(false)
    setImportResult({ success: successCount, failed: failedRows })

    if (successCount > 0) {
      onImportDone()
    }
    if (failedRows.length === 0) {
      showSuccess(`Berhasil mengimpor ${successCount} siswa!`)
      setPreviewRows([])
      setFileName('')
    }
  }

  const hasErrors = validationErrors.length > 0
  const hasPreview = previewRows.length > 0

  return (
    <div className="space-y-5">

      {/* Panduan & Download Template */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2">
          <FileSpreadsheet size={15} /> Panduan Import Perkelas
        </h4>
        <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1 mb-4">
          <li>Download template Excel di bawah ini.</li>
          <li>Isi data siswa sesuai kolom: <span className="text-slate-200 font-mono">{CSV_HEADERS.join(', ')}</span></li>
          <li>Kolom <b>Fase</b> isi: D (SMP), E (SMA-10), F (SMA-11/12). Kosongkan untuk default D.</li>
          <li>Satu file bisa berisi satu kelas atau beberapa kelas sekaligus.</li>
          <li>Unggah file, pratinjau data, lalu klik <b>Import Sekarang</b>.</li>
        </ol>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer">
          <Download size={13} /> Download Template Excel
        </button>
      </div>

      {/* Upload File */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Pilih File Excel (.xlsx) atau CSV
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-8 cursor-pointer transition-all bg-slate-950/30 hover:bg-slate-950/60"
        >
          <Upload size={28} className="text-slate-500" />
          <p className="text-sm text-slate-400">
            {fileName
              ? <span className="text-emerald-400 font-semibold">{fileName}</span>
              : <><span className="text-emerald-400 font-semibold">Klik untuk memilih file</span> atau seret ke sini</>}
          </p>
          <p className="text-[10px] text-slate-600">Format: .xlsx, .xls, .csv</p>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {/* Validation Errors */}
      {hasErrors && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
            <AlertCircle size={14} /> {validationErrors.length} Kesalahan ditemukan:
          </p>
          <ul className="list-disc list-inside space-y-0.5 max-h-36 overflow-y-auto">
            {validationErrors.map((e, i) => (
              <li key={i} className="text-[11px] text-rose-400">{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Table */}
      {hasPreview && !hasErrors && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pratinjau — {previewRows.length} baris data
            </p>
            <button onClick={() => { setPreviewRows([]); setFileName(''); setImportResult(null) }}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer">
              <X size={12} /> Reset
            </button>
          </div>
          <div className="overflow-auto rounded-xl border border-slate-800 max-h-64">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead className="bg-slate-900 sticky top-0">
                <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Baris</th>
                  <th className="py-2.5 px-3">NISN</th>
                  <th className="py-2.5 px-3">Nama</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">T.A.</th>
                  <th className="py-2.5 px-3">Fase</th>
                  <th className="py-2.5 px-3">Orang Tua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {previewRows.map((row) => (
                  <tr key={row._row} className="hover:bg-slate-900/30">
                    <td className="py-2 px-3 text-slate-500 font-mono">{row._row}</td>
                    <td className="py-2 px-3 font-mono text-slate-300">{row.nisn}</td>
                    <td className="py-2 px-3 text-slate-200 font-medium">{row.name}</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded text-[10px] font-semibold">
                        {row.class_name}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{row.academic_year}</td>
                    <td className="py-2 px-3 text-slate-400 font-bold">{row.phase}</td>
                    <td className="py-2 px-3 text-slate-400 truncate max-w-[160px]">{row.parent_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {importing ? <><RefreshCw size={14} className="animate-spin" /> Mengimpor...</> : <><Upload size={14} /> Import {previewRows.length} Siswa Sekarang</>}
          </button>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="space-y-3">
          {importResult.success > 0 && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
              <CheckCircle2 size={14} /> <span>{importResult.success} siswa berhasil diimpor.</span>
            </div>
          )}
          {importResult.failed.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <XCircle size={14} /> {importResult.failed.length} baris gagal:
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {importResult.failed.map((r, i) => (
                  <p key={i} className="text-[11px] text-rose-400">
                    <span className="font-mono">{r.nisn}</span> — {r.name}: <span className="italic">{r._error}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Siswa Component ─────────────────────────────────────────────
export default function Siswa() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('semua')
  const [filterClass, setFilterClass] = useState('semua')
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [modalKey, setModalKey] = useState(0)
  const [success, setSuccess] = useState('')
  const [pageError, setPageError] = useState('')
  const [activeTab, setActiveTab] = useState('daftar') // 'daftar' | 'import'

  // Kelas yang sudah ada di DB
  const { classes: availableClasses } = useAvailableClasses()

  useEffect(() => { fetchStudents() }, [])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('class_name', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      setPageError('Gagal mengambil data siswa.')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => { setEditingStudent(null); setModalKey(k => k + 1); setShowModal(true) }
  const openEditModal = (s) => { setEditingStudent(s); setModalKey(k => k + 1); setShowModal(true) }
  const closeModal = () => setShowModal(false)

  const handleSaved = (message) => {
    setShowModal(false)
    fetchStudents()
    showSuccess(message)
  }

  const handleDelete = async (student) => {
    const result = await confirmDelete(
      `Hapus ${student.name}?`,
      'Semua data nilai yang terkait juga akan dihapus.'
    )
    if (!result.isConfirmed) return

    showLoading('Menghapus data...')
    try {
      const { error } = await supabase.from('students').delete().eq('id', student.id)
      if (error) throw error
      closeLoading()
      showSuccess('Siswa berhasil dihapus.')
      fetchStudents()
    } catch (err) {
      closeLoading()
      showError('Gagal Menghapus', err.message)
    }
  }

  // Gabungkan filter kelas dari DB + kelas yang sudah difilter
  const dynamicClasses = availableClasses

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.nisn.includes(search) || s.class_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'semua' || s.status === filterStatus
    const matchClass = filterClass === 'semua' || s.class_name === filterClass
    return matchSearch && matchStatus && matchClass
  })

  if (loading && students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-slate-400">Memuat data siswa...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 m-0">Data Siswa</h2>
          <p className="text-sm text-slate-400 mt-1">
            Kelola dan impor data murid SMP IT Al Anshar.
          </p>
        </div>
        {/* Tab */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('daftar')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'daftar' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Users size={13} /> Daftar Siswa
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'import' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Upload size={13} /> Import Perkelas
          </button>
        </div>
      </div>

      {pageError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="shrink-0" /><span>{pageError}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-sm">
          <Check size={18} className="shrink-0" /><span>{success}</span>
        </div>
      )}

      {/* ── TAB: IMPORT ────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <BulkImportPanel onImportDone={fetchStudents} />
        </div>
      )}

      {/* ── TAB: DAFTAR ────────────────────────────────────────── */}
      {activeTab === 'daftar' && (
        <>
          {/* Control Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between flex-wrap">
              {/* Search */}
              <div className="relative w-full md:w-72">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Search size={16} />
                </span>
                <input type="text" placeholder="Cari NISN, Nama, atau Kelas..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-150 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>

              {/* Filter kelas dari DB */}
              <div className="flex gap-2 items-center flex-wrap flex-1">
                <span className="text-[11px] text-slate-500 font-semibold">Kelas:</span>
                <button onClick={() => setFilterClass('semua')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${filterClass === 'semua' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  Semua
                </button>
                {dynamicClasses.map(cls => (
                  <button key={cls} onClick={() => setFilterClass(cls)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${filterClass === cls ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                    {cls}
                  </button>
                ))}
              </div>

              <button onClick={openAddModal}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all duration-200 cursor-pointer self-start md:self-auto shrink-0">
                <Plus size={16} /> Tambah Siswa
              </button>
            </div>

            {/* Filter Status */}
            <div className="flex gap-1.5 flex-wrap items-center border-t border-slate-800/60 pt-3">
              <span className="text-[11px] text-slate-500 font-semibold mr-1">Status:</span>
              {[{ val: 'semua', label: 'Semua' }, ...Object.entries(STATUS_LABELS).map(([val, label]) => ({ val, label }))].map(opt => (
                <button key={opt.val} onClick={() => setFilterStatus(opt.val)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${filterStatus === opt.val ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  {opt.label}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-400 font-medium">
                {filteredStudents.length} dari {students.length} siswa
              </span>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">NISN</th>
                    <th className="py-4 px-6">Nama Siswa</th>
                    <th className="py-4 px-6">Kelas</th>
                    <th className="py-4 px-6">Tahun Ajaran</th>
                    <th className="py-4 px-6">Fase</th>
                    <th className="py-4 px-6">Orang Tua / Wali</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-500">
                        <Users size={32} className="mx-auto mb-2 text-slate-650" />
                        Belum ada data siswa ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(s => (
                      <tr key={s.id} className="hover:bg-slate-900/30 transition-all duration-150">
                        <td className="py-3.5 px-6 font-mono font-medium text-slate-400">{s.nisn}</td>
                        <td className="py-3.5 px-6">
                          <p className="font-semibold text-slate-200">{s.name}</p>
                          {s.previous_class && <p className="text-[10px] text-slate-500 mt-0.5">Sebelumnya: {s.previous_class}</p>}
                        </td>
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded text-xs font-semibold whitespace-nowrap">
                            {s.class_name}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-400">{s.academic_year}</td>
                        <td className="py-3.5 px-6 text-center text-slate-400 font-bold">{s.phase}</td>
                        <td className="py-3.5 px-6 text-slate-350">{s.parent_name || '-'}</td>
                        <td className="py-3.5 px-6">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${STATUS_COLORS[s.status] || STATUS_COLORS.aktif}`}>
                            {STATUS_LABELS[s.status] || s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <button onClick={() => openEditModal(s)}
                              className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg transition-all duration-200 cursor-pointer" title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(s)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg transition-all duration-200 cursor-pointer" title="Hapus">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CRUD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <StudentForm key={modalKey} editingStudent={editingStudent} onSaved={handleSaved} onCancel={closeModal} />
          </div>
        </div>
      )}
    </div>
  )
}