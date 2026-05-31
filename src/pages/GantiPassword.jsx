import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useForm } from 'react-hook-form'
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle, Lock } from 'lucide-react'

export default function GantiPassword() {
  const { profile } = useAuth()
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm()
  const newPassword = watch('newPassword')

  const onSubmit = async ({ oldPassword, newPassword }) => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const email = profile?.email
      if (!email) throw new Error('Tidak dapat menemukan email akun Anda.')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

      // Step 1: Re-authenticate with old password via direct REST fetch to verify identity.
      // This is completely stateless and bypasses the GoTrue SDK locks/deadlocks.
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: oldPassword,
        }),
      })

      if (!res.ok) {
        throw new Error('Password lama salah. Silakan periksa kembali.')
      }

      // Step 2: Update to new password on the main client
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) throw updateErr

      setSuccess('Password berhasil diperbarui! Silakan gunakan password baru Anda mulai sekarang.')
      reset()
      setTimeout(() => setSuccess(''), 6000)
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengganti password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 m-0">Ganti Password</h2>
        <p className="text-sm text-slate-400 mt-1">
          Perbarui password masuk Anda. Pastikan Anda ingat password baru setelah disimpan.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2.5 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2.5 text-sm">
          <CheckCircle size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {/* Readonly name display */}
        <div className="mb-6 pb-5 border-b border-slate-800">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Nama Pengguna
          </label>
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3">
            <KeyRound size={15} className="text-slate-500 shrink-0" />
            <span className="text-sm text-slate-300 font-medium">{profile?.name || '—'}</span>
            <span className="ml-auto text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">
              {profile?.role === 'admin' ? 'Admin' : profile?.role === 'wali_kelas' ? 'Wali Kelas' : 'Guru Mapel'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Password Lama */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Password Lama
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <Lock size={15} />
              </span>
              <input
                type={showOld ? 'text' : 'password'}
                placeholder="Masukkan password saat ini"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-11 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                {...register('oldPassword', { required: 'Password lama wajib diisi' })}
              />
              <button type="button" onClick={() => setShowOld(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer" tabIndex={-1}>
                {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.oldPassword && <span className="text-[11px] text-rose-500 mt-1 block">{errors.oldPassword.message}</span>}
          </div>

          {/* Password Baru */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Password Baru
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <Lock size={15} />
              </span>
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-11 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                {...register('newPassword', {
                  required: 'Password baru wajib diisi',
                  minLength: { value: 6, message: 'Password minimal 6 karakter' },
                })}
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer" tabIndex={-1}>
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.newPassword && <span className="text-[11px] text-rose-500 mt-1 block">{errors.newPassword.message}</span>}
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <Lock size={15} />
              </span>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Ulangi password baru"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-11 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                {...register('confirmPassword', {
                  required: 'Konfirmasi password wajib diisi',
                  validate: v => v === newPassword || 'Password baru dan konfirmasi tidak cocok',
                })}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer" tabIndex={-1}>
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.confirmPassword && <span className="text-[11px] text-rose-500 mt-1 block">{errors.confirmPassword.message}</span>}
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 py-2.5 rounded-xl font-bold text-sm tracking-wide shadow-md transition-all duration-200 cursor-pointer"
            >
              {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
