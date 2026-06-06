import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Save, AlertCircle, CheckCircle } from 'lucide-react'

export default function Kepatuhan() {
  const { profile } = useAuth()
  const [periods, setPeriods] = useState([])
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})

  const [loading, setLoading] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [isGridLoaded, setIsGridLoaded] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (profile) fetchPeriods()
  }, [profile])

  const fetchPeriods = async () => {
    setLoading(true)
    setError('')
    try {
      let query = supabase
        .from('report_periods')
        .select('id, name, class_name')
        .eq('is_active', true)

      if (profile.role !== 'admin') {
        query = query.eq('wali_kelas_id', profile.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setPeriods(data || [])
    } catch (err) {
      setError('Gagal mengambil data kelas perwalian.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadGrid = async () => {
    if (!selectedPeriodId) { setError('Pilih kelas perwalian terlebih dahulu.'); return }
    setError(''); setSuccess(''); setLoadingGrid(true); setIsGridLoaded(false)

    try {
      const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)
      if (!selectedPeriod) throw new Error('Kelas perwalian tidak ditemukan.')

      const { data: sData, error: sErr } = await supabase
        .from('students')
        .select('id, name, nisn')
        .eq('class_name', selectedPeriod.class_name)
        .order('name', { ascending: true })
      if (sErr) throw sErr
      setStudents(sData || [])

      const { data: aData, error: aErr } = await supabase
        .from('student_attendance')
        .select('student_id, sakit, izin, alpha, catatan_khusus')
        .eq('report_period_id', selectedPeriodId)
      if (aErr) throw aErr

      const aMap = {}
      sData.forEach((s) => {
        aMap[s.id] = { student_id: s.id, sakit: 0, izin: 0, alpha: 0, catatan_khusus: '' }
      })
      aData.forEach((row) => {
        aMap[row.student_id] = {
          student_id: row.student_id,
          sakit: row.sakit || 0,
          izin: row.izin || 0,
          alpha: row.alpha || 0,
          catatan_khusus: row.catatan_khusus || '',
        }
      })

      setAttendance(aMap)
      setIsGridLoaded(true)
    } catch (err) {
      setError('Gagal memuat data: ' + err.message)
    } finally {
      setLoadingGrid(false)
    }
  }

  const handleChange = (studentId, field, val) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: field === 'catatan_khusus' ? val : (val === '' ? 0 : Math.max(0, Number(val))),
      },
    }))
  }

  const handleSave = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      const payload = Object.values(attendance).map((att) => ({
        student_id: att.student_id,
        report_period_id: selectedPeriodId,
        sakit: att.sakit,
        izin: att.izin,
        alpha: att.alpha,
        catatan_khusus: att.catatan_khusus || '',
      }))
      const { error } = await supabase.from('student_attendance').upsert(payload, {
        onConflict: 'student_id,report_period_id',
      })
      if (error) throw error
      setSuccess('Data berhasil disimpan!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError('Gagal menyimpan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
        <p className="mt-2 text-sm text-slate-400">Memuat data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 m-0">Kepatuhan Kehadiran Murid</h2>
        <p className="text-sm text-slate-400 mt-1">
          Input ketidakhadiran dan catatan khusus siswa kelas perwalian.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle size={16} className="shrink-0" /><span>{success}</span>
        </div>
      )}

      {/* Pilih Kelas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Kelas Perwalian
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => { setSelectedPeriodId(e.target.value); setIsGridLoaded(false) }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">-- Pilih Kelas --</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (Kelas {p.class_name})</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleLoadGrid}
          disabled={loadingGrid || !selectedPeriodId}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingGrid ? 'Memuat...' : 'Tampilkan'}
        </button>
      </div>

      {/* Tabel terpadu */}
      {isGridLoaded && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
            <span className="text-xs text-slate-400">
              Wali Kelas: <span className="text-slate-200 font-semibold">{profile?.name}</span>
              <span className="ml-3 text-slate-600">·</span>
              <span className="ml-3">{students.length} siswa</span>
            </span>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save size={13} />
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>

          {/* Tabel */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-900/40">
                  <th className="py-3 px-4 w-8">#</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4 text-center w-20">Sakit</th>
                  <th className="py-3 px-4 text-center w-20">Izin</th>
                  <th className="py-3 px-4 text-center w-20">Alpha</th>
                  <th className="py-3 px-4">Catatan Wali Kelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-500 text-sm">
                      Belum ada siswa terdaftar di kelas ini.
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => {
                    const rec = attendance[student.id] || { sakit: 0, izin: 0, alpha: 0, catatan_khusus: '' }
                    return (
                      <tr key={student.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 px-4 text-xs text-slate-500 font-mono">{index + 1}</td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-semibold text-slate-200 leading-tight">{student.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">{student.nisn}</p>
                        </td>
                        {['sakit', 'izin', 'alpha'].map((field) => (
                          <td key={field} className="py-3 px-4 text-center">
                            <input
                              type="number"
                              min="0"
                              value={rec[field]}
                              onChange={(e) => handleChange(student.id, field, e.target.value)}
                              className="w-14 bg-slate-950 border border-slate-800 rounded-lg text-center text-sm py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                            />
                          </td>
                        ))}
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            placeholder="Catatan khusus (opsional)..."
                            value={rec.catatan_khusus || ''}
                            onChange={(e) => handleChange(student.id, 'catatan_khusus', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm py-1.5 px-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
