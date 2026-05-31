import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { LogIn, Lock, User, Eye, EyeOff, AlertCircle, Info, School } from 'lucide-react'

export default function Login() {
  const { user, loading } = useAuth()
  console.debug('[Login] render', { user, loading })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  const onSubmit = async ({ name, password }) => {
    setError('')
    setSubmitting(true)
    const trimmed = name.trim()
    const email = trimmed.toLowerCase() === 'admin' || trimmed === 'admin@smpital-anshar.com'
      ? 'admin@smpital-anshar.com'
      : 'guru@smpital-anshar.com'

    try {
      localStorage.setItem('user_display_name', trimmed)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      navigate('/')
    } catch (err) {
      localStorage.removeItem('user_display_name')
      setError(
        err.message === 'Invalid login credentials'
          ? 'Password salah atau akun belum terdaftar di Supabase.'
          : err.message || 'Terjadi kesalahan. Silakan coba lagi.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full filter blur-[100px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[100px] -z-10" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-4">
            <School size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-1 text-center">
            E-Rapor SMP IT Al Anshar
          </h1>
          <p className="text-slate-400 text-sm text-center">Sistem Laporan Hasil Belajar Kurikulum Merdeka</p>
        </div>

        <div className="mb-6 p-3.5 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-xs text-indigo-300">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-indigo-200 block mb-0.5">Sistem Autentikasi:</span>
            Gunakan nama <code className="text-emerald-400 font-bold bg-slate-950 px-1 py-0.5 rounded">admin</code> untuk Administrator, atau nama Anda sendiri untuk guru pengajar.
          </div>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2.5 text-xs">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nama */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Nama Lengkap
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <User size={16} />
              </span>
              <input
                type="text"
                placeholder="Contoh: Admin atau Nama Anda"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                {...register('name', { required: 'Nama lengkap wajib diisi' })}
              />
            </div>
            {errors.name && <span className="text-[11px] text-rose-500 mt-1 block">{errors.name.message}</span>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password Anda"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-11 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                {...register('password', {
                  required: 'Password wajib diisi',
                  minLength: { value: 6, message: 'Password minimal 6 karakter' },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="text-[11px] text-rose-500 mt-1 block">{errors.password.message}</span>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 py-2.5 rounded-xl font-bold text-sm tracking-wide shadow-md transition-all duration-200 mt-6 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogIn size={15} />
            {submitting ? 'Memproses...' : 'Masuk Aplikasi'}
          </button>
        </form>
      </div>
    </div>
  )
}
