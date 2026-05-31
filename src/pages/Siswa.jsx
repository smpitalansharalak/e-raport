import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useForm } from 'react-hook-form'
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  AlertCircle,
  Check,
  User,
} from 'lucide-react'

export default function Siswa() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      console.error('Error fetching students:', err)
      setError('Gagal mengambil data siswa.')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingStudent(null)
    reset({
      nisn: '',
      name: '',
      class_name: '',
      academic_year: '2025/2026',
      phase: 'D',
      parent_name: '',
    })
    setError('')
    setShowModal(true)
  }

  const openEditModal = (student) => {
    setEditingStudent(student)
    reset({
      nisn: student.nisn,
      name: student.name,
      class_name: student.class_name,
      academic_year: student.academic_year,
      phase: student.phase,
      parent_name: student.parent_name,
    })
    setError('')
    setShowModal(true)
  }

  const onSubmit = async (data) => {
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (editingStudent) {
        // Edit flow
        const { error } = await supabase
          .from('students')
          .update({
            nisn: data.nisn,
            name: data.name,
            class_name: data.class_name,
            academic_year: data.academic_year,
            phase: data.phase,
            parent_name: data.parent_name,
          })
          .eq('id', editingStudent.id)

        if (error) throw error
        setSuccess('Data siswa berhasil diperbarui!')
      } else {
        // Add flow
        const { error } = await supabase.from('students').insert({
          nisn: data.nisn,
          name: data.name,
          class_name: data.class_name,
          academic_year: data.academic_year,
          phase: data.phase,
          parent_name: data.parent_name,
        })

        if (error) throw error
        setSuccess('Siswa baru berhasil ditambahkan!')
      }

      setShowModal(false)
      fetchStudents()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Save student failed:', err)
      setError(err.message?.includes('duplicate') ? 'NISN sudah terdaftar di sistem.' : 'Gagal menyimpan data siswa.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus siswa ini? Semua data nilai yang terkait juga akan dihapus.')) return
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.from('students').delete().eq('id', id)
      if (error) throw error
      setSuccess('Siswa berhasil dihapus.')
      fetchStudents()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Delete student failed:', err)
      setError('Gagal menghapus data siswa.')
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn.includes(search) ||
      s.class_name.toLowerCase().includes(search.toLowerCase())
  )

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
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 m-0">Data Siswa</h2>
          <p className="text-sm text-slate-400 mt-1">
            Kelola data murid SMP IT Al Anshar untuk setiap angkatan dan kelas.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all duration-200 cursor-pointer self-start md:self-auto"
        >
          <Plus size={16} />
          Tambah Siswa
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-sm">
          <Check size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Cari berdasarkan NISN, Nama, atau Kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-150 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Menampilkan {filteredStudents.length} dari {students.length} siswa
        </span>
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
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    <Users size={32} className="mx-auto mb-2 text-slate-650" />
                    Belum ada data siswa terdaftar.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/30 transition-all duration-150">
                    <td className="py-3.5 px-6 font-mono font-medium text-slate-400">{s.nisn}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-200">{s.name}</td>
                    <td className="py-3.5 px-6">
                      <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded text-xs font-semibold">
                        {s.class_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">{s.academic_year}</td>
                    <td className="py-3.5 px-6 text-center text-slate-400 font-bold">{s.phase}</td>
                    <td className="py-3.5 px-6 text-slate-350">{s.parent_name || '-'}</td>
                    <td className="py-3.5 px-6 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg transition-all duration-200 cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg transition-all duration-200 cursor-pointer"
                          title="Hapus"
                        >
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

      {/* CRUD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  NISN
                </label>
                <input
                  type="text"
                  placeholder="Nomor Induk Siswa Nasional"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  {...register('nisn', {
                    required: 'NISN wajib diisi',
                    pattern: { value: /^\d+$/, message: 'NISN harus berupa angka' },
                  })}
                />
                {errors.nisn && (
                  <span className="text-[11px] text-rose-500 mt-1 block">
                    {errors.nisn.message}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  placeholder="Nama Lengkap Siswa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  {...register('name', { required: 'Nama lengkap wajib diisi' })}
                />
                {errors.name && (
                  <span className="text-[11px] text-rose-500 mt-1 block">
                    {errors.name.message}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Kelas
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: VII A"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    {...register('class_name', { required: 'Kelas wajib diisi' })}
                  />
                  {errors.class_name && (
                    <span className="text-[11px] text-rose-500 mt-1 block">
                      {errors.class_name.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Fase
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    {...register('phase', { required: 'Fase wajib dipilih' })}
                  >
                    <option value="D">D (SMP)</option>
                    <option value="E">E (SMA-10)</option>
                    <option value="F">F (SMA-11/12)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 2025/2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    {...register('academic_year', { required: 'Tahun ajaran wajib diisi' })}
                  />
                  {errors.academic_year && (
                    <span className="text-[11px] text-rose-500 mt-1 block">
                      {errors.academic_year.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Orang Tua / Wali
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Orang Tua"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    {...register('parent_name')}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl transition-all cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
