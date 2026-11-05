import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { showLoading, closeLoading, showSuccess } from '@/lib/swal'
import { useStudentMutations } from '../useStudents'

const CSV_HEADERS = ['NISN', 'Nama Lengkap', 'Kelas', 'Tahun Ajaran', 'Fase', 'Nama Orang Tua/Wali']

export default function BulkImportPanel({ onImportDone }) {
  const fileRef = useRef()
  const [previewRows, setPreviewRows] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null) // { success, failed }
  const [fileName, setFileName] = useState('')
  const { importStudents } = useStudentMutations()

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

    const { successCount, failedRows } = await importStudents.mutateAsync(previewRows)

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
