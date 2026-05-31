import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useForm } from 'react-hook-form'
import {
  FilePlus,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Check,
  CheckSquare,
  Square,
  ChevronRight,
  Settings,
} from 'lucide-react'

export default function BuatRapor() {
  const [activeTab, setActiveTab] = useState('periode') // 'periode' or 'mapel'
  const [periods, setPeriods] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([]) // profiles with role = 'wali_kelas' or others
  const [periodSubjects, setPeriodSubjects] = useState({}) // key: period_id, value: array of subject_ids

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals state
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState(null)
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configPeriod, setConfigPeriod] = useState(null)

  const [savingConfig, setSavingConfig] = useState(false)
  const [submittingPeriod, setSubmittingPeriod] = useState(false)
  const [submittingSubject, setSubmittingSubject] = useState(false)

  const periodForm = useForm()
  const subjectForm = useForm()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch periods
      const { data: pData, error: pErr } = await supabase
        .from('report_periods')
        .select(`
          *,
          wali_kelas:profiles(id, name)
        `)
        .order('created_at', { ascending: false })
      if (pErr) throw pErr
      setPeriods(pData || [])

      // 2. Fetch subjects
      const { data: sData, error: sErr } = await supabase
        .from('subjects')
        .select('id, name, class_name')
        .order('name', { ascending: true })
      if (sErr) throw sErr
      setSubjects(sData || [])

      // 3. Fetch teachers (profiles) — only non-admin
      const { data: tData, error: tErr } = await supabase
        .from('profiles')
        .select('id, name, role')
        .neq('role', 'admin')
        .order('name', { ascending: true })
      if (tErr) throw tErr
      setTeachers(tData || [])

      // 4. Fetch period subjects
      const { data: psData, error: psErr } = await supabase
        .from('report_subjects')
        .select('*')
      if (psErr) throw psErr

      const psMap = {}
      psData.forEach((row) => {
        if (!psMap[row.report_period_id]) {
          psMap[row.report_period_id] = []
        }
        psMap[row.report_period_id].push(row.subject_id)
      })
      setPeriodSubjects(psMap)
    } catch (err) {
      console.error('Error fetching config data:', err)
      setError('Gagal memuat konfigurasi dari database.')
    } finally {
      setLoading(false)
    }
  }

  // PERIOD CRUD ACTIONS
  const openAddPeriodModal = () => {
    setEditingPeriod(null)
    periodForm.reset({
      name: '',
      class_name: '',
      semester: 'I',
      academic_year: '2025/2026',
      wali_kelas_id: '',
      kepala_sekolah_name: '',
      is_active: true,
    })
    setError('')
    setShowPeriodModal(true)
  }

  const openEditPeriodModal = (period) => {
    setEditingPeriod(period)
    periodForm.reset({
      name: period.name,
      class_name: period.class_name,
      semester: period.semester,
      academic_year: period.academic_year,
      wali_kelas_id: period.wali_kelas_id || '',
      kepala_sekolah_name: period.kepala_sekolah_name,
      is_active: period.is_active,
    })
    setError('')
    setShowPeriodModal(true)
  }

  const onPeriodSubmit = async (data) => {
    setError('')
    setSuccess('')
    setSubmittingPeriod(true)

    // Parse empty uuid
    const waliId = data.wali_kelas_id === '' ? null : data.wali_kelas_id

    try {
      if (editingPeriod) {
        const { error } = await supabase
          .from('report_periods')
          .update({
            name: data.name,
            class_name: data.class_name,
            semester: data.semester,
            academic_year: data.academic_year,
            wali_kelas_id: waliId,
            kepala_sekolah_name: data.kepala_sekolah_name,
            is_active: data.is_active,
          })
          .eq('id', editingPeriod.id)

        if (error) throw error
        setSuccess('Periode rapor berhasil diperbarui!')
      } else {
        const { error } = await supabase.from('report_periods').insert({
          name: data.name,
          class_name: data.class_name,
          semester: data.semester,
          academic_year: data.academic_year,
          wali_kelas_id: waliId,
          kepala_sekolah_name: data.kepala_sekolah_name,
          is_active: data.is_active,
        })

        if (error) throw error
        setSuccess('Periode rapor baru berhasil dibuat!')
      }

      setShowPeriodModal(false)
      fetchData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Period save failed:', err)
      setError('Gagal menyimpan periode rapor.')
    } finally {
      setSubmittingPeriod(false)
    }
  }

  const handleDeletePeriod = async (id) => {
    if (!window.confirm('Hapus periode rapor ini? Seluruh data nilai, deskripsi, dan kehadiran siswa di dalamnya akan dihapus permanen!')) return
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.from('report_periods').delete().eq('id', id)
      if (error) throw error
      setSuccess('Periode rapor berhasil dihapus.')
      fetchData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Delete period failed:', err)
      setError('Gagal menghapus periode rapor.')
    }
  }

  // SUBJECT CRUD ACTIONS
  const openAddSubjectModal = () => {
    setEditingSubject(null)
    subjectForm.reset({ name: '', class_name: '' })
    setError('')
    setShowSubjectModal(true)
  }

  const openEditSubjectModal = (sub) => {
    setEditingSubject(sub)
    subjectForm.reset({ name: sub.name, class_name: sub.class_name || '' })
    setError('')
    setShowSubjectModal(true)
  }

  const onSubjectSubmit = async (data) => {
    setError('')
    setSuccess('')
    setSubmittingSubject(true)

    try {
      if (editingSubject) {
        const { error } = await supabase
          .from('subjects')
          .update({ name: data.name, class_name: data.class_name || null })
          .eq('id', editingSubject.id)

        if (error) throw error
        setSuccess('Mata pelajaran berhasil diubah!')
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert({ name: data.name, class_name: data.class_name || null })

        if (error) throw error
        setSuccess('Mata pelajaran baru berhasil ditambahkan!')
      }

      setShowSubjectModal(false)
      fetchData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Subject save failed:', err)
      setError('Gagal menyimpan mata pelajaran. Nama mapel mungkin duplikat.')
    } finally {
      setSubmittingSubject(false)
    }
  }

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Hapus mata pelajaran ini? Hubungan pengajar dan Rapor terkait akan terputus.')) return
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id)
      if (error) throw error
      setSuccess('Mata pelajaran berhasil dihapus.')
      fetchData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Delete subject failed:', err)
      setError('Gagal menghapus mata pelajaran.')
    }
  }

  // SUBJECT CONFIG TO PERIOD MAPPINGS
  const openConfigModal = (period) => {
    setConfigPeriod(period)
    setError('')
    setShowConfigModal(true)
  }

  const togglePeriodSubject = async (periodId, subjectId) => {
    setError('')
    setSuccess('')

    const currentMap = periodSubjects[periodId] || []
    const isAssigned = currentMap.includes(subjectId)

    try {
      if (isAssigned) {
        // Remove relation
        const { error } = await supabase
          .from('report_subjects')
          .delete()
          .eq('report_period_id', periodId)
          .eq('subject_id', subjectId)
        if (error) throw error

        setPeriodSubjects({
          ...periodSubjects,
          [periodId]: currentMap.filter((id) => id !== subjectId),
        })
      } else {
        // Add relation
        const { error } = await supabase
          .from('report_subjects')
          .insert({ report_period_id: periodId, subject_id: subjectId })
        if (error) throw error

        setPeriodSubjects({
          ...periodSubjects,
          [periodId]: [...currentMap, subjectId],
        })
      }
    } catch (err) {
      console.error('Toggle period subject failed:', err)
      setError('Gagal menyinkronkan mata pelajaran ke periode rapor.')
    }
  }

  if (loading && periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-slate-400">Memuat konfigurasi rapor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 m-0">Pengaturan Rapor</h2>
          <p className="text-sm text-slate-400 mt-1">
            Konfigurasi periode cetak rapor aktif dan daftar mata pelajaran.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-900 border border-slate-850 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('periode')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'periode'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-450 hover:text-slate-200'
              }`}
          >
            <FilePlus size={14} />
            Periode Rapor
          </button>
          <button
            onClick={() => setActiveTab('mapel')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'mapel'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-450 hover:text-slate-200'
              }`}
          >
            <BookOpen size={14} />
            Mata Pelajaran
          </button>
        </div>
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

      {/* ACTIVE TAB PANEL - PERIODE RAPOR */}
      {activeTab === 'periode' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold">
              Terdaftar {periods.length} periode rapor
            </span>
            <button
              onClick={openAddPeriodModal}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Buat Periode Rapor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {periods.length === 0 ? (
              <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                <FilePlus size={36} className="mx-auto text-slate-650 mb-2" />
                Belum ada periode rapor yang aktif. Silakan tambahkan.
              </div>
            ) : (
              periods.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4 transition-all duration-200 hover:border-slate-700/60 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-100 text-lg leading-tight">
                        {p.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${p.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 border border-slate-700/60'
                          }`}
                      >
                        {p.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-slate-400 pt-2">
                      <p> Kelas: <span className="text-slate-200 font-semibold">{p.class_name}</span></p>
                      <p> Semester: <span className="text-slate-200 font-semibold">{p.semester}</span></p>
                      <p> Tahun Ajaran: <span className="text-slate-200 font-semibold">{p.academic_year}</span></p>
                      <p> Wali Kelas: <span className="text-emerald-450 font-semibold">{p.wali_kelas?.name || 'Belum diatur'}</span></p>
                      <p className="col-span-2 truncate"> Kepala Sekolah: <span className="text-slate-200 font-semibold">{p.kepala_sekolah_name}</span></p>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
                    {/* Subject Setup */}
                    <button
                      onClick={() => openConfigModal(p)}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 hover:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Settings size={14} className="text-slate-500" />
                      Mapel Rapor ({periodSubjects[p.id]?.length || 0})
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditPeriodModal(p)}
                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/35 rounded-xl transition-all cursor-pointer"
                        title="Edit Periode"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeletePeriod(p.id)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/35 rounded-xl transition-all cursor-pointer"
                        title="Hapus Periode"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ACTIVE TAB PANEL - MATA PELAJARAN */}
      {activeTab === 'mapel' && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold">
              Terdaftar {subjects.length} mata pelajaran
            </span>
            <button
              onClick={openAddSubjectModal}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Tambah Mapel
            </button>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">No.</th>
                    <th className="py-4 px-6">Nama Mata Pelajaran</th>
                    <th className="py-4 px-6">Kelas</th>
                    <th className="py-4 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
                  {subjects.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-500">
                        <BookOpen size={32} className="mx-auto mb-2 text-slate-650" />
                        Belum ada mata pelajaran.
                      </td>
                    </tr>
                  ) : (
                    subjects.map((sub, idx) => (
                      <tr key={sub.id} className="hover:bg-slate-900/20 transition-all">
                        <td className="py-3 px-6 text-slate-400 font-mono font-medium">{idx + 1}.</td>
                        <td className="py-3 px-6 font-semibold text-slate-250">{sub.name}</td>
                        <td className="py-3 px-6 text-slate-400 text-xs">{sub.class_name || <span className="italic text-slate-600">—</span>}</td>
                        <td className="py-3 px-6 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openEditSubjectModal(sub)}
                              className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-all cursor-pointer"
                              title="Edit Mapel"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(sub.id)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-all cursor-pointer"
                              title="Hapus Mapel"
                            >
                              <Trash2 size={13} />
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
        </div>
      )}

      {/* PERIOD EDIT/CREATE MODAL */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">
                {editingPeriod ? 'Edit Periode Rapor' : 'Buat Periode Rapor Baru'}
              </h3>
              <button
                onClick={() => setShowPeriodModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={periodForm.handleSubmit(onPeriodSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Rapor
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rapor Kelas VII A Semester I"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  {...periodForm.register('name', { required: 'Nama rapor wajib diisi' })}
                />
                {periodForm.formState.errors.name && (
                  <span className="text-[11px] text-rose-500 mt-1 block">
                    {periodForm.formState.errors.name.message}
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
                    {...periodForm.register('class_name', { required: 'Kelas wajib diisi' })}
                  />
                  {periodForm.formState.errors.class_name && (
                    <span className="text-[11px] text-rose-500 mt-1 block">
                      {periodForm.formState.errors.class_name.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Semester
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    {...periodForm.register('semester', { required: true })}
                  >
                    <option value="I">Semester I (Ganjil)</option>
                    <option value="II">Semester II (Genap)</option>
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
                    {...periodForm.register('academic_year', { required: 'Tahun ajaran wajib diisi' })}
                  />
                  {periodForm.formState.errors.academic_year && (
                    <span className="text-[11px] text-rose-500 mt-1 block">
                      {periodForm.formState.errors.academic_year.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Wali Kelas
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    {...periodForm.register('wali_kelas_id')}
                  >
                    <option value="">-- Pilih Wali Kelas --</option>
                    {teachers
                      .filter((t) => t.role === 'wali_kelas' || t.role === 'guru_mapel')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  placeholder="Nama Kepala Sekolah untuk TTD"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  {...periodForm.register('kepala_sekolah_name', { required: 'Nama Kepsek wajib diisi' })}
                />
                {periodForm.formState.errors.kepala_sekolah_name && (
                  <span className="text-[11px] text-rose-500 mt-1 block">
                    {periodForm.formState.errors.kepala_sekolah_name.message}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  {...periodForm.register('is_active')}
                />
                <label htmlFor="is_active" className="text-xs text-slate-350 cursor-pointer font-medium select-none">
                  Jadikan periode rapor ini aktif
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPeriod}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl transition-all cursor-pointer"
                >
                  {submittingPeriod ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBJECT EDIT/CREATE MODAL */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">
                {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
              </h3>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={subjectForm.handleSubmit(onSubjectSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Mata Pelajaran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Matematika"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  {...subjectForm.register('name', { required: 'Nama mapel wajib diisi' })}
                />
                {subjectForm.formState.errors.name && (
                  <span className="text-[11px] text-rose-500 mt-1 block">
                    {subjectForm.formState.errors.name.message}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Kelas (Opsional)
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  {...subjectForm.register('class_name')}
                >
                  <option value="">-- Semua Kelas --</option>
                  {['VII', 'VIII', 'IX'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingSubject}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl transition-all cursor-pointer"
                >
                  {submittingSubject ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURE SUBJECTS FOR A SPECIFIC REPORT PERIOD */}
      {showConfigModal && configPeriod && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  Konfigurasi Mata Pelajaran Rapor
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Periode: <span className="text-slate-200 font-semibold">{configPeriod.name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Centang mata pelajaran yang akan dimasukkan ke rapor ini:
              </span>

              {subjects.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  Belum ada mata pelajaran terdaftar. Silakan buat mata pelajaran terlebih dahulu di tab "Mata Pelajaran".
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {(() => {
                    const filtered = subjects.filter(sub => {
                      if (!sub.class_name) return true
                      const pClass = configPeriod.class_name || ''
                      return pClass.toLowerCase().startsWith(sub.class_name.toLowerCase()) ||
                             pClass.toLowerCase().includes(sub.class_name.toLowerCase())
                    })
                    if (filtered.length === 0) {
                      return (
                        <p className="col-span-2 text-xs text-slate-500 italic py-2">
                          Tidak ada mata pelajaran yang cocok dengan kelas {configPeriod.class_name}. Tambahkan mapel untuk kelas ini di tab "Mata Pelajaran".
                        </p>
                      )
                    }
                    return filtered.map((sub) => {
                      const isAssigned = (periodSubjects[configPeriod.id] || []).includes(
                        sub.id
                      )
                      return (
                        <button
                          key={sub.id}
                          onClick={() => togglePeriodSubject(configPeriod.id, sub.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${isAssigned
                              ? 'bg-slate-950 border-emerald-500/40 text-emerald-400 font-semibold'
                              : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-350'
                            }`}
                        >
                          {isAssigned ? (
                            <CheckSquare size={14} className="shrink-0 text-emerald-400" />
                          ) : (
                            <Square size={14} className="shrink-0 text-slate-650" />
                          )}
                          <span className="truncate leading-tight">
                            {sub.name}
                            {sub.class_name && (
                              <span className="block text-[9px] text-slate-500 font-normal mt-0.5">Kelas {sub.class_name}</span>
                            )}
                          </span>
                        </button>
                      )
                    })
                  })()}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowConfigModal(false)
                  fetchData() // refresh counts
                }}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
