import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Users, Shield, BookOpen, Check, Search,
  CheckSquare, Square, AlertCircle, GraduationCap,
} from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', color: 'rose' },
  { value: 'guru_mapel', label: 'Guru Mapel', color: 'indigo' },
  { value: 'wali_kelas', label: 'Wali Kelas', color: 'amber' },
]

export default function KelolaUser() {
  const [profiles, setProfiles] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teacherSubjects, setTeacherSubjects] = useState({}) // { teacher_id: [subject_id, ...] }
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [resettingId, setResettingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [
        { data: profilesData, error: pErr },
        { data: subjectsData, error: sErr },
        { data: tsData, error: tsErr },
      ] = await Promise.all([
        supabase.from('profiles').select('id, username, name, email, role, secondary_role').order('name'),
        supabase.from('subjects').select('id, name, class_name').order('name'),
        supabase.from('teacher_subjects').select('teacher_id, subject_id'),
      ])

      if (pErr) throw pErr
      if (sErr) throw sErr
      if (tsErr) throw tsErr

      setProfiles(profilesData || [])
      setSubjects(subjectsData || [])

      const tsMap = {}
      tsData.forEach(({ teacher_id, subject_id }) => {
        if (!tsMap[teacher_id]) tsMap[teacher_id] = []
        tsMap[teacher_id].push(subject_id)
      })
      setTeacherSubjects(tsMap)
    } catch (err) {
      setError('Gagal memuat data pengguna.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRoleChange = async (profileId, field, value) => {
    // field: 'role' or 'secondary_role' or 'assigned_class'
    setError('')
    setSavingId(profileId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', profileId)
      if (error) throw error

      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, [field]: value } : p))
      setSuccess('Profil pengguna berhasil diperbarui!')
      setTimeout(() => setSuccess(''), 2500)
    } catch (err) {
      setError('Gagal memperbarui profil pengguna.')
    } finally {
      setSavingId(null)
    }
  }

  const handlePasswordReset = async (profileId, profileName) => {
    setError('')
    setSuccess('')
    setResettingId(profileId)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('Sesi tidak valid. Silakan login ulang dan coba lagi.')
      }

      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: profileId }),
      })

      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.error || 'Gagal mereset password pengguna.')
      }

      setSuccess(`Password ${profileName} berhasil direset menjadi 12345678.`)
      setTimeout(() => setSuccess(''), 2500)
    } catch (err) {
      setError(err.message || 'Gagal mereset password pengguna.')
    } finally {
      setResettingId(null)
    }
  }

  const toggleSubject = async (teacherId, subjectId) => {
    setError('')
    setSavingId(teacherId)
    const current = teacherSubjects[teacherId] || []
    const isAssigned = current.includes(subjectId)

    try {
      if (isAssigned) {
        const { error } = await supabase
          .from('teacher_subjects')
          .delete()
          .eq('teacher_id', teacherId)
          .eq('subject_id', subjectId)
        if (error) throw error
        setTeacherSubjects(prev => ({ ...prev, [teacherId]: current.filter(id => id !== subjectId) }))
      } else {
        const { error } = await supabase
          .from('teacher_subjects')
          .insert({ teacher_id: teacherId, subject_id: subjectId })
        if (error) throw error
        setTeacherSubjects(prev => ({ ...prev, [teacherId]: [...current, subjectId] }))
      }
      setSuccess('Mata pelajaran guru disinkronisasi!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError('Gagal sinkronisasi mata pelajaran.')
    } finally {
      setSavingId(null)
    }
  }

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.username?.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
        <p className="mt-2 text-sm text-slate-400">Memuat profil pengguna...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 m-0">Kelola Pengguna</h2>
          <p className="text-sm text-slate-400 mt-1">Tentukan peran, kelas perwalian, dan mata pelajaran yang diampu.</p>
        </div>
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="shrink-0" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-sm">
          <Check size={18} className="shrink-0" /><span>{success}</span>
        </div>
      )}

      <div className="space-y-4">
        {filteredProfiles.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Users size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="font-semibold">Tidak Ada Pengguna</p>
          </div>
        ) : (
          filteredProfiles.map(p => (
            <div key={p.id} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5 hover:border-slate-700/60 transition-all">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-200">{p.name}</h3>
                  {p.username && <p className="text-xs text-slate-500 mt-0.5">@{p.username}</p>}
                  <p className="text-xs text-slate-500 mt-0.5">{p.email}</p>
                </div>
                {(savingId === p.id || resettingId === p.id) && (
                  <span className="text-[10px] text-emerald-400 animate-pulse font-medium">Menyimpan...</span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={resettingId === p.id || savingId === p.id}
                  onClick={() => {
                    if (window.confirm(`Reset password ${p.name} menjadi 12345678?`)) {
                      handlePasswordReset(p.id, p.name)
                    }
                  }}
                  className="text-[11px] rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                >
                  {resettingId === p.id ? 'Reset...' : 'Reset Password'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-2 border-t border-slate-800/60">
                {/* Col 1: Peran Utama */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={12} className="text-slate-500" /> Peran Utama
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {ROLE_OPTIONS.map(r => {
                      const isSelected = p.role === r.value
                      return (
                        <button
                          key={r.value}
                          onClick={() => handleRoleChange(p.id, 'role', r.value)}
                          disabled={savingId === p.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-left ${isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            }`}
                        >
                          {r.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Secondary role: wali kelas bisa rangkap guru mapel */}
                  {p.role === 'wali_kelas' && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Rangkap Jabatan
                      </span>
                      <button
                        onClick={() => handleRoleChange(p.id, 'secondary_role', p.secondary_role === 'guru_mapel' ? null : 'guru_mapel')}
                        disabled={savingId === p.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer w-full text-left ${p.secondary_role === 'guru_mapel'
                            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                      >
                        {p.secondary_role === 'guru_mapel'
                          ? <CheckSquare size={13} className="text-indigo-400 shrink-0" />
                          : <Square size={13} className="text-slate-600 shrink-0" />}
                        Juga Guru Mapel
                      </button>
                    </div>
                  )}
                </div>

                {/* Col 2-3: Mata Pelajaran */}
                <div className="lg:col-span-2 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={12} className="text-slate-500" /> Mata Pelajaran yang Diampu
                    <span className="ml-auto text-emerald-400 font-mono text-[10px]">
                      {(teacherSubjects[p.id] || []).length} dipilih
                    </span>
                  </span>

                  {subjects.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Belum ada mata pelajaran. Tambahkan di menu "Buat Rapor".</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {subjects.map(sub => {
                        const isAssigned = (teacherSubjects[p.id] || []).includes(sub.id)
                        return (
                          <button
                            key={sub.id}
                            disabled={savingId === p.id}
                            onClick={() => toggleSubject(p.id, sub.id)}
                            className={`flex items-start gap-1.5 p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${isAssigned
                                ? 'bg-slate-950 border-emerald-500/40 text-emerald-400 font-semibold'
                                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                              }`}
                          >
                            {isAssigned
                              ? <CheckSquare size={13} className="shrink-0 text-emerald-400 mt-0.5" />
                              : <Square size={13} className="shrink-0 text-slate-600 mt-0.5" />}
                            <span className="leading-tight">
                              {sub.name}
                              {sub.class_name && (
                                <span className="block text-[9px] text-slate-500 font-normal mt-0.5">Kelas {sub.class_name}</span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
