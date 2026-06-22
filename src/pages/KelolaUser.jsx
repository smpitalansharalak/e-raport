import React, { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Users,
  Shield,
  BookOpen,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  KeyRound,
  User,
  X,
  Loader2,
  Plus,
  Minus,
} from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', color: 'rose' },
  { value: 'guru_mapel', label: 'Guru Mapel', color: 'indigo' },
  { value: 'wali_kelas', label: 'Wali Kelas', color: 'amber' },
]

const ROLE_BADGE = {
  admin: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  guru_mapel: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  wali_kelas: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}
const ROLE_LABEL = { admin: 'Admin', guru_mapel: 'Guru Mapel', wali_kelas: 'Wali Kelas' }

export default function KelolaUser() {
  const [profiles, setProfiles] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teacherSubjects, setTeacherSubjects] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subjectSearch, setSubjectSearch] = useState('')
  const [selected, setSelected] = useState(null) // selected profile object
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedClasses, setExpandedClasses] = useState({})
  const detailRef = useRef(null)

  const toggleClass = (className) => {
    setExpandedClasses(prev => ({
      ...prev,
      [className]: !prev[className]
    }))
  }

  useEffect(() => {
    if (selected && detailRef.current && window.innerWidth < 1024) {
      setTimeout(() => {
        detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [selected])

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

      // Sync selected if still open
      if (selected) {
        const updated = profilesData?.find(p => p.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch {
      setError('Gagal memuat data pengguna.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const flash = (msg, isErr = false) => {
    if (isErr) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleRoleChange = async (field, value) => {
    if (!selected) return
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', selected.id)
      if (error) throw error
      const updated = { ...selected, [field]: value }
      setSelected(updated)
      setProfiles(prev => prev.map(p => p.id === selected.id ? updated : p))
      flash('Peran berhasil diperbarui!')
    } catch {
      flash('Gagal memperbarui peran.', true)
    } finally {
      setSaving(false)
    }
  }

  const toggleSubject = async (subjectId) => {
    if (!selected) return
    setSaving(true)
    const current = teacherSubjects[selected.id] || []
    const isAssigned = current.includes(subjectId)
    try {
      if (isAssigned) {
        const { error } = await supabase.from('teacher_subjects').delete().eq('teacher_id', selected.id).eq('subject_id', subjectId)
        if (error) throw error
        const updated = { ...teacherSubjects, [selected.id]: current.filter(id => id !== subjectId) }
        setTeacherSubjects(updated)
      } else {
        const { error } = await supabase.from('teacher_subjects').insert({ teacher_id: selected.id, subject_id: subjectId })
        if (error) throw error
        const updated = { ...teacherSubjects, [selected.id]: [...current, subjectId] }
        setTeacherSubjects(updated)
      }
      flash('Mata pelajaran disinkronisasi!')
    } catch {
      flash('Gagal sinkronisasi mata pelajaran.', true)
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selected) return
    if (!window.confirm(`Reset password ${selected.name} menjadi 12345678?`)) return
    setResetting(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) throw new Error('Sesi tidak valid.')
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: selected.id }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Gagal mereset password.')
      flash(`Password ${selected.name} direset ke 12345678!`)
    } catch (err) {
      flash(err.message, true)
    } finally {
      setResetting(false)
    }
  }

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.username?.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  )

  const groupedSubjects = subjects.reduce((acc, sub) => {
    const className = sub.class_name || 'Tanpa Kelas';
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(sub);
    return acc;
  }, {});

  const sortedClasses = Object.keys(groupedSubjects).sort((a, b) => {
    if (a === 'Tanpa Kelas') return 1;
    if (b === 'Tanpa Kelas') return -1;
    const romanOrder = { 'I':1, 'II':2, 'III':3, 'IV':4, 'V':5, 'VI':6, 'VII':7, 'VIII':8, 'IX':9, 'X':10, 'XI':11, 'XII':12 };
    const numA = romanOrder[a.toUpperCase()];
    const numB = romanOrder[b.toUpperCase()];
    if (numA && numB) return numA - numB;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  const assignedCount = selected ? (teacherSubjects[selected.id] || []).length : 0

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
        <p className="mt-2 text-sm text-slate-400">Memuat profil pengguna...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 m-0">Kelola Pengguna</h2>
        <p className="text-sm text-slate-400 mt-1">Pilih pengguna untuk mengatur peran dan mata pelajaran.</p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle size={16} className="shrink-0" /><span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── PANEL KIRI: Daftar Pengguna ── */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-slate-800">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 max-h-[520px]">
            {filteredProfiles.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <Users size={28} className="mx-auto mb-2 text-slate-700" />
                Tidak ada pengguna.
              </div>
            ) : (
              filteredProfiles.map(p => {
                const isActive = selected?.id === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-all cursor-pointer ${isActive
                        ? 'bg-emerald-500/10 border-r-2 border-emerald-500'
                        : 'hover:bg-slate-800/30 border-r-2 border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${ROLE_BADGE[p.role] || ''}`}>
                        {ROLE_LABEL[p.role] || p.role}
                      </span>
                      <ChevronRight size={13} className={isActive ? 'text-emerald-400' : 'text-slate-600'} />
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-800/60 bg-slate-950/20">
            <span className="text-[11px] text-slate-500">{profiles.length} pengguna terdaftar</span>
          </div>
        </div>

        {/* ── PANEL KANAN: Detail Editor ── */}
        <div className="lg:col-span-3" ref={detailRef}>
          {!selected ? (
            <div className="h-full min-h-[300px] bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="p-4 bg-slate-800/40 rounded-2xl">
                <User size={36} className="text-slate-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-400 text-sm">Pilih Pengguna</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">Klik salah satu pengguna di daftar kiri untuk mengatur peran dan mata pelajarannya.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">

              {/* User card header */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center text-lg font-bold shrink-0">
                    {selected.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{selected.name}</h3>
                    {selected.username && <p className="text-xs text-slate-500">@{selected.username}</p>}
                    <p className="text-xs text-slate-500">{selected.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {saving && <Loader2 size={14} className="text-emerald-400 animate-spin" />}
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Peran Utama */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={14} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peran Utama</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map(r => {
                    const isActive = selected.role === r.value
                    return (
                      <button
                        key={r.value}
                        disabled={saving}
                        onClick={() => handleRoleChange('role', r.value)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-60 ${isActive
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                      >
                        {r.label}
                      </button>
                    )
                  })}
                </div>

                {/* Rangkap jabatan untuk wali_kelas */}
                {selected.role === 'wali_kelas' && (
                  <div className="pt-3 border-t border-slate-800/60">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Rangkap Jabatan</p>
                    <button
                      disabled={saving}
                      onClick={() => handleRoleChange('secondary_role', selected.secondary_role === 'guru_mapel' ? null : 'guru_mapel')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-60 ${selected.secondary_role === 'guru_mapel'
                          ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                    >
                      {selected.secondary_role === 'guru_mapel'
                        ? <CheckSquare size={13} className="text-indigo-400 shrink-0" />
                        : <Square size={13} className="text-slate-600 shrink-0" />}
                      Juga Guru Mapel
                    </button>
                  </div>
                )}
              </div>

              {/* Mata Pelajaran */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mata Pelajaran Diampu</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {assignedCount} dipilih
                  </span>
                </div>

                {subjects.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    Belum ada mata pelajaran. Tambahkan di menu "Buat Rapor".
                  </p>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Cari mata pelajaran atau kelas..."
                        value={subjectSearch}
                        onChange={e => setSubjectSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    
                    <div className="max-h-[380px] overflow-y-auto pr-2 space-y-3 mt-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 transition-colors">
                      {sortedClasses.map(className => {
                        const classSubjects = groupedSubjects[className].filter(sub => 
                           sub.name.toLowerCase().includes(subjectSearch.toLowerCase()) || 
                           className.toLowerCase().includes(subjectSearch.toLowerCase())
                        );

                        if (classSubjects.length === 0) return null;

                        const assignedInThisClass = classSubjects.filter(sub => (teacherSubjects[selected.id] || []).includes(sub.id)).length;
                        const isExpanded = subjectSearch !== '' || expandedClasses[className];

                        return (
                          <div key={className} className="bg-slate-950/40 border border-slate-800/80 rounded-xl overflow-hidden transition-all">
                            <button
                              onClick={() => toggleClass(className)}
                              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-900/50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  Kelas {className}
                                </h4>
                              </div>
                              <div className="flex items-center gap-3">
                                {assignedInThisClass > 0 && (
                                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    {assignedInThisClass} dipilih
                                  </span>
                                )}
                                <div className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
                                  {isExpanded ? <Minus size={12} /> : <Plus size={12} />}
                                </div>
                              </div>
                            </button>
                            
                            {isExpanded && (
                              <div className="p-3.5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-800/50 mt-1">
                                {classSubjects.map(sub => {
                                  const isAssigned = (teacherSubjects[selected.id] || []).includes(sub.id)
                                  return (
                                    <button
                                      key={sub.id}
                                      disabled={saving}
                                      onClick={() => toggleSubject(sub.id)}
                                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer disabled:opacity-60 ${isAssigned
                                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/5'
                                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                                        }`}
                                    >
                                      {isAssigned
                                        ? <CheckSquare size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                        : <Square size={14} className="text-slate-600 shrink-0 mt-0.5" />}
                                      <span className="leading-snug font-medium">
                                        {sub.name}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {Object.keys(groupedSubjects).every(className => {
                         const classSubjects = groupedSubjects[className].filter(sub => 
                            sub.name.toLowerCase().includes(subjectSearch.toLowerCase()) || 
                            className.toLowerCase().includes(subjectSearch.toLowerCase())
                         );
                         return classSubjects.length === 0;
                      }) && (
                        <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/20 rounded-xl border border-slate-800/50 border-dashed">
                           Tidak ada mata pelajaran yang cocok dengan "{subjectSearch}"
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Reset Password */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <KeyRound size={14} className="text-slate-500" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reset Password</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Password akan diubah menjadi <span className="font-mono text-slate-400">12345678</span></p>
                  </div>
                  <button
                    disabled={resetting || saving}
                    onClick={handleResetPassword}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {resetting ? <><Loader2 size={12} className="animate-spin" /> Mereset...</> : 'Reset Password'}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}