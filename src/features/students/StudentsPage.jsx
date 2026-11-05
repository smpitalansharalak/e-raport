import { useState } from 'react'
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
} from 'lucide-react'
import { confirmDelete, showError, showLoading, closeLoading, showSuccess } from '@/lib/swal'
import { useAvailableClasses, useStudentMutations, useStudents } from './useStudents'
import StudentForm from './components/StudentForm'
import BulkImportPanel from './components/BulkImportPanel'

// ─── Status config ─────────────────────────────────────────────────
const STATUS_COLORS = {
  aktif: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  naik_kelas: 'bg-indigo-500/10  border-indigo-500/20  text-indigo-400',
  lulus: 'bg-amber-500/10   border-amber-500/20   text-amber-400',
  alumni: 'bg-slate-800/60   border-slate-700/40   text-slate-400',
}
const STATUS_LABELS = { aktif: 'Aktif', naik_kelas: 'Naik Kelas', lulus: 'Lulus', alumni: 'Alumni' }

export default function StudentsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('semua')
  const [filterClass, setFilterClass] = useState('semua')
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [modalKey, setModalKey] = useState(0)
  const [success] = useState('')
  const [activeTab, setActiveTab] = useState('daftar') // 'daftar' | 'import'

  const studentsQuery = useStudents()
  const students = studentsQuery.data ?? []
  const pageError = studentsQuery.isError ? 'Gagal mengambil data siswa.' : ''

  // Kelas yang sudah ada di DB
  const { classes: availableClasses } = useAvailableClasses()
  const { deleteStudent } = useStudentMutations()

  const openAddModal = () => { setEditingStudent(null); setModalKey(k => k + 1); setShowModal(true) }
  const openEditModal = (s) => { setEditingStudent(s); setModalKey(k => k + 1); setShowModal(true) }
  const closeModal = () => setShowModal(false)

  const handleSaved = (message) => {
    setShowModal(false)
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
      await deleteStudent.mutateAsync(student.id)
      closeLoading()
      showSuccess('Siswa berhasil dihapus.')
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

  if (studentsQuery.isPending && students.length === 0) {
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
          <BulkImportPanel onImportDone={studentsQuery.refetch} />
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
