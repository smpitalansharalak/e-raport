import { useMemo, useState } from 'react'
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
  Archive,
  Minus,
} from 'lucide-react'
import { groupSubjectsByClass, sortClassNames } from '@/utils/classes'
import { useAvailableClasses } from '@/features/students/useStudents'
import { useReportConfig, useReportConfigMutations } from './useReportConfig'
import SubjectOrderModal from './components/SubjectOrderModal'
import PeriodList from './components/PeriodList'
import Modal from '@/components/ui/Modal'

export default function ReportConfigPage() {
  const [activeTab, setActiveTab] = useState('periode') // 'periode' or 'mapel'
  const [expandedClasses, setExpandedClasses] = useState({})

  const toggleClass = (className) => {
    setExpandedClasses((prev) => ({
      ...prev,
      [className]: !prev[className],
    }))
  }

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals state
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState(null)
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configPeriod, setConfigPeriod] = useState(null)

  const periodForm = useForm()
  const subjectForm = useForm()

  const configQuery = useReportConfig()
  const { classes: availableClasses, isPending: classesLoading, isError: classesError } =
    useAvailableClasses({ statusFilter: ['aktif', 'naik_kelas'] })

  // Opsi kelas dari data siswa; saat edit, kelas lama selalu disertakan
  // agar periode yang sudah tidak punya siswa tetap bisa disimpan.
  const classOptions = useMemo(() => {
    const current = editingPeriod?.class_name
    const base = availableClasses ?? []
    return sortClassNames(current && !base.includes(current) ? [...base, current] : base)
  }, [availableClasses, editingPeriod])
  const hasClassOptions = classOptions.length > 0

  const periods = configQuery.data?.periods ?? []
  const subjects = configQuery.data?.subjects ?? []
  const teachers = configQuery.data?.teachers ?? []
  const periodSubjects = configQuery.data?.periodSubjects ?? {}
  const formats = configQuery.data?.formats ?? []
  const defaultFormatId = formats.find((f) => f.is_default)?.id ?? formats[0]?.id ?? ''

  const {
    savePeriod,
    deletePeriod,
    setActivePeriod,
    saveSubject,
    deleteSubject,
  } = useReportConfigMutations()

  const submittingPeriod = savePeriod.isPending
  const submittingSubject = saveSubject.isPending
  const displayError = error || (configQuery.isError ? 'Gagal memuat konfigurasi dari database.' : '')

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
      format_id: defaultFormatId,
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
      format_id: period.format?.id ?? period.format_id ?? '',
    })
    setError('')
    setShowPeriodModal(true)
  }

  const onPeriodSubmit = async (data) => {
    setError('')
    setSuccess('')

    // Parse empty uuid
    const waliId = data.wali_kelas_id === '' ? null : data.wali_kelas_id

    try {
      await savePeriod.mutateAsync({
        id: editingPeriod?.id,
        values: { ...data, wali_kelas_id: waliId },
      })

      setSuccess(editingPeriod ? 'Periode rapor berhasil diperbarui!' : 'Periode rapor baru berhasil dibuat!')
      setShowPeriodModal(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Period save failed:', err)
      setError(err?.message ?? 'Gagal menyimpan periode rapor.')
    }
  }

  const handleDeletePeriod = async (id) => {
    const target = periods.find((p) => p.id === id)
    if (target && !target.is_active) {
      setError('Periode arsip tidak dapat dihapus. Aktifkan kembali periode ini terlebih dahulu bila memang perlu dihapus.')
      return
    }
    if (!window.confirm('Hapus periode rapor ini? Seluruh data nilai, deskripsi, dan kehadiran siswa di dalamnya akan dihapus permanen!')) return
    setError('')
    setSuccess('')

    try {
      await deletePeriod.mutateAsync(id)
      setSuccess('Periode rapor berhasil dihapus.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Delete period failed:', err)
      setError('Gagal menghapus periode rapor.')
    }
  }

  const handleToggleArchivePeriod = async (period) => {
    const archiving = period.is_active
    const confirmed = window.confirm(
      archiving
        ? `Arsipkan periode "${period.name}"?\n\nPeriode tidak akan muncul untuk diisi guru, tetapi seluruh nilai & kehadiran siswa tetap tersimpan dan bisa dicetak/ekspor kapan pun lewat tab Arsip Rapor di Cetak Rapor. Anda bisa mengaktifkan kembali kapan pun.`
        : `Aktifkan kembali periode "${period.name}"?\n\nGuru dapat mengisi nilai lagi pada periode ini.`
    )
    if (!confirmed) return

    setError('')
    setSuccess('')
    try {
      await setActivePeriod.mutateAsync({ id: period.id, isActive: !period.is_active })
      setSuccess(archiving ? 'Periode berhasil diarsipkan.' : 'Periode berhasil diaktifkan kembali.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Toggle archive failed:', err)
      setError('Gagal mengubah status periode: ' + (err?.message ?? 'coba lagi.'))
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

    try {
      await saveSubject.mutateAsync({ id: editingSubject?.id, values: data })

      setSuccess(editingSubject ? 'Mata pelajaran berhasil diubah!' : 'Mata pelajaran baru berhasil ditambahkan!')
      setShowSubjectModal(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Subject save failed:', err)
      setError('Gagal menyimpan mata pelajaran. Nama mapel mungkin duplikat.')
    }
  }

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Hapus mata pelajaran ini? Hubungan pengajar dan Rapor terkait akan terputus.')) return
    setError('')
    setSuccess('')

    try {
      await deleteSubject.mutateAsync(id)
      setSuccess('Mata pelajaran berhasil dihapus.')
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

  // Called by SubjectOrderModal after saving
  const handleConfigSaved = () => {
    setSuccess('Urutan mata pelajaran berhasil disimpan!')
    setTimeout(() => setSuccess(''), 3000)
  }

  if (configQuery.isPending && periods.length === 0) {
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

      {displayError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{displayError}</span>
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

          <PeriodList
            periods={periods}
            periodSubjects={periodSubjects}
            isTogglingArchive={setActivePeriod.isPending}
            onEditPeriod={openEditPeriodModal}
            onToggleArchive={handleToggleArchivePeriod}
            onDeletePeriod={handleDeletePeriod}
            onManageSubjects={openConfigModal}
          />

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

          {subjects.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <BookOpen size={36} className="mx-auto text-slate-650 mb-2" />
              Belum ada mata pelajaran.
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const groupedSubjects = groupSubjectsByClass(subjects)
                const sortedClasses = sortClassNames(Object.keys(groupedSubjects))

                return sortedClasses.map(className => {
                  const classSubjects = groupedSubjects[className]
                  const isExpanded = expandedClasses[className]

                  return (
                    <div key={className} className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden transition-all">
                      <button
                        onClick={() => toggleClass(className)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            Kelas {className}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {classSubjects.length} Mapel
                          </span>
                          <div className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            {isExpanded ? <Minus size={12} /> : <Plus size={12} />}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-800/50 bg-slate-900/20">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[400px]">
                              <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
                                {classSubjects.map((sub, idx) => (
                                  <tr key={sub.id} className="hover:bg-slate-900/40 transition-all">
                                    <td className="py-3 px-6 text-slate-400 font-mono font-medium w-16 text-center">{idx + 1}.</td>
                                    <td className="py-3 px-4 font-semibold text-slate-250">{sub.name}</td>
                                    <td className="py-3 px-6 text-center w-32">
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
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* PERIOD EDIT/CREATE MODAL */}
      {showPeriodModal && (
        <Modal onClose={() => setShowPeriodModal(false)} maxWidth="max-w-md" ariaLabel={editingPeriod ? 'Edit Periode Rapor' : 'Buat Periode Rapor Baru'}>
          <div className="flex shrink-0 justify-between items-center gap-4 px-6 pt-6 pb-3 border-b border-slate-800">
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

            <form onSubmit={periodForm.handleSubmit(onPeriodSubmit)} className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5 space-y-4">
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
                  <select
                    disabled={classesLoading || (!hasClassOptions && !editingPeriod?.class_name)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60"
                    {...periodForm.register('class_name', { required: 'Kelas wajib diisi' })}
                  >
                    <option value="">
                      {classesLoading ? '-- Memuat kelas --' : '-- Pilih Kelas --'}
                    </option>
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {classesError && (
                    <p className="text-[11px] text-rose-500 mt-1">
                      Gagal memuat daftar kelas. Periksa koneksi lalu muat ulang.
                    </p>
                  )}
                  {!classesLoading && !classesError && classOptions.length === 0 && (
                    <p className="text-[11px] text-amber-500 mt-1">
                      Belum ada kelas di data siswa. Tambahkan siswa dulu di menu Input Siswa.
                    </p>
                  )}
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
                    <option value="I">Semester I (Satu) - (Ganjil)</option>
                    <option value="II">Semester II (Dua) - (Genap)</option>
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

              {/* Format Penilaian — pilih saat membuat periode, tidak bisa diubah setelahnya */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Format Penilaian
                </label>
                {!editingPeriod ? (
                  <>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                      {...periodForm.register('format_id', {
                        required: 'Pilih format penilaian (buat dulu di menu Format Penilaian)',
                      })}
                    >
                      <option value="">-- Pilih Format Penilaian --</option>
                      {formats.map((format) => (
                        <option key={format.id} value={format.id}>
                          {format.name} — {format.componentCount} komponen
                        </option>
                      ))}
                    </select>
                    {periodForm.formState.errors.format_id && (
                      <span className="text-[11px] text-rose-500 mt-1 block">
                        {periodForm.formState.errors.format_id.message}
                      </span>
                    )}
                    {formats.length === 0 && (
                      <span className="text-[11px] text-amber-500 mt-1 block">
                        Belum ada format aktif. Buat format dulu lewat menu Format Penilaian.
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Komponen format akan disalin ke periode ini (snapshot). Guru menentukan jumlah itemnya nanti.
                    </span>
                  </>
                ) : (
                  <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-400">
                    {editingPeriod.format?.name ?? 'Format bawaan (snapshot)'}
                    <span className="block text-[10px] text-slate-600 mt-0.5">
                      Ditetapkan saat periode dibuat — tidak bisa diubah agar nilai yang sudah diinput tetap konsisten.
                    </span>
                  </div>
                )}
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

              <div className="flex items-center gap-2 pt-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                <Archive size={14} className="text-slate-500 shrink-0" />
                <p className="text-[10px] text-slate-500 leading-snug">
                  Form ini tidak mengubah status arsip. Periode baru selalu aktif — pengarsipan dilakukan lewat tombol{' '}
                  <b>Arsipkan</b> di kartu periode.
                </p>
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
                  disabled={submittingPeriod || !hasClassOptions}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl transition-all cursor-pointer"
                >
                  {submittingPeriod ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* SUBJECT EDIT/CREATE MODAL */}
      {showSubjectModal && (
        <Modal onClose={() => setShowSubjectModal(false)} maxWidth="max-w-sm" ariaLabel={editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}>
          <div className="flex shrink-0 justify-between items-center gap-4 px-6 pt-6 pb-3 border-b border-slate-800">
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

            <form onSubmit={subjectForm.handleSubmit(onSubjectSubmit)} className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5 space-y-4">
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
        </Modal>
      )}

      {/* CONFIGURE SUBJECTS FOR A SPECIFIC REPORT PERIOD — pakai SubjectOrderModal */}
      {showConfigModal && configPeriod && (
        <SubjectOrderModal
          period={configPeriod}
          allSubjects={subjects}
          onClose={() => setShowConfigModal(false)}
          onSaved={handleConfigSaved}
        />
      )}
    </div>
  )
}
