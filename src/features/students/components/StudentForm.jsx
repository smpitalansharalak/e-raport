import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AlertCircle } from 'lucide-react'
import { STUDENT_STATUS, STUDENT_STATUS_OPTIONS } from '@/constants/studentStatus'
import { useStudentMutations } from '../useStudents'

export default function StudentForm({ editingStudent, onSaved, onCancel }) {
  const [formError, setFormError] = useState('')
  const { saveStudent } = useStudentMutations()
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
        status: editingStudent.status || 'aktif',
      }
      : { nisn: '', name: '', class_name: '', academic_year: '2025/2026', phase: 'D', parent_name: '', status: 'aktif' },
  })
  const unknownStatus = editingStudent?.status && !STUDENT_STATUS[editingStudent.status]
    ? editingStudent.status
    : ''

  const onSubmit = async (data) => {
    setFormError('')
    try {
      await saveStudent.mutateAsync({ id: editingStudent?.id, values: data })
      onSaved(editingStudent ? 'Data siswa berhasil diperbarui!' : 'Siswa baru berhasil ditambahkan!')
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
        <select className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          {...register('status', { required: 'Status wajib dipilih' })}>
          {unknownStatus && <option value={unknownStatus}>{unknownStatus}</option>}
          {STUDENT_STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
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
