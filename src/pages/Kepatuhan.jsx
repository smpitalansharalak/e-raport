import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  ClipboardCheck,
  Save,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

export default function Kepatuhan() {
  const { profile } = useAuth()
  const [periods, setPeriods] = useState([])
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({}) // key: student_id, value: { sakit, izin, alpha }
  
  const [loading, setLoading] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [isGridLoaded, setIsGridLoaded] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (profile) {
      fetchPeriods()
    }
  }, [profile])

  const fetchPeriods = async () => {
    setLoading(true)
    setError('')
    try {
      // Wali kelas can only view report periods assigned to them
      let query = supabase
        .from('report_periods')
        .select('*')
        .eq('is_active', true)

      if (profile.role !== 'admin') {
        query = query.eq('wali_kelas_id', profile.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setPeriods(data || [])
    } catch (err) {
      console.error('Error fetching periods:', err)
      setError('Gagal mengambil data kelas perwalian.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadGrid = async () => {
    if (!selectedPeriodId) {
      setError('Pilih kelas perwalian terlebih dahulu.')
      return
    }
    setError('')
    setSuccess('')
    setLoadingGrid(true)
    setIsGridLoaded(false)

    try {
      const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)
      if (!selectedPeriod) throw new Error('Kelas perwalian tidak ditemukan.')

      // 1. Fetch students in this class
      const { data: sData, error: sErr } = await supabase
        .from('students')
        .select('*')
        .eq('class_name', selectedPeriod.class_name)
        .order('name', { ascending: true })
      if (sErr) throw sErr
      setStudents(sData || [])

      // 2. Fetch existing attendance
      const { data: aData, error: aErr } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('report_period_id', selectedPeriodId)
      if (aErr) throw aErr

      const aMap = {}
      sData.forEach((s) => {
        aMap[s.id] = {
          student_id: s.id,
          sakit: 0,
          izin: 0,
          alpha: 0,
        }
      })

      aData.forEach((row) => {
        aMap[row.student_id] = {
          student_id: row.student_id,
          sakit: row.sakit || 0,
          izin: row.izin || 0,
          alpha: row.alpha || 0,
        }
      })

      setAttendance(aMap)
      setIsGridLoaded(true)
    } catch (err) {
      console.error('Error loading attendance sheet:', err)
      setError('Gagal memuat daftar ketidakhadiran: ' + err.message)
    } finally {
      setLoadingGrid(false)
    }
  }

  const handleValueChange = (studentId, field, val) => {
    setAttendance({
      ...attendance,
      [studentId]: {
        ...attendance[studentId],
        [field]: val === '' ? 0 : Math.max(0, Number(val)),
      },
    })
  }

  const handleSaveAttendance = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const payload = Object.values(attendance).map((att) => ({
        student_id: att.student_id,
        report_period_id: selectedPeriodId,
        sakit: att.sakit,
        izin: att.izin,
        alpha: att.alpha,
      }))

      const { error } = await supabase.from('student_attendance').upsert(payload, {
        onConflict: 'student_id,report_period_id',
      })

      if (error) throw error
      setSuccess('Data kepatuhan kehadiran berhasil disimpan!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      console.error('Error saving attendance:', err)
      setError('Gagal menyimpan kehadiran: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-slate-400">Memuat data perwalian...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 m-0">Kepatuhan Kehadiran Murid</h2>
        <p className="text-sm text-slate-400 mt-1">
          Input data absensi sakit, izin, dan tanpa keterangan (alpha) siswa kelas perwalian Anda.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Select Period Dropdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Kelas Perwalian
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => {
              setSelectedPeriodId(e.target.value)
              setIsGridLoaded(false)
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">-- Pilih Kelas Perwalian --</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Kelas {p.class_name})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleLoadGrid}
          disabled={loadingGrid}
          className="w-full md:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm tracking-wide shadow-md transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingGrid ? 'Memuat...' : 'Mulai Input'}
        </button>
      </div>

      {/* ATTENDANCE SHEET */}
      {isGridLoaded && (
        <div className="space-y-6 max-w-4xl">
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold">
              Wali Kelas: <span className="text-slate-200">{profile?.name}</span>
            </span>
            <button
              onClick={handleSaveAttendance}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Save size={14} />
              Simpan Data Kehadiran
            </button>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">No.</th>
                    <th className="py-4 px-6">NISN</th>
                    <th className="py-4 px-6">Nama Lengkap Murid</th>
                    <th className="py-4 px-6 text-center" style={{ width: '110px' }}>Sakit (Hari)</th>
                    <th className="py-4 px-6 text-center" style={{ width: '110px' }}>Izin (Hari)</th>
                    <th className="py-4 px-6 text-center" style={{ width: '110px' }}>Alpha (Hari)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500">
                        Belum ada data siswa terdaftar di kelas perwalian ini.
                      </td>
                    </tr>
                  ) : (
                    students.map((student, index) => {
                      const record = attendance[student.id] || { sakit: 0, izin: 0, alpha: 0 }
                      return (
                        <tr key={student.id} className="hover:bg-slate-900/20 transition-all">
                          <td className="py-3 px-6 text-slate-400 font-mono">{index + 1}.</td>
                          <td className="py-3 px-6 font-mono font-medium text-slate-400">{student.nisn}</td>
                          <td className="py-3 px-6 font-semibold text-slate-250">{student.name}</td>
                          
                          {/* Sakit */}
                          <td className="py-3 px-6 text-center">
                            <input
                              type="number"
                              min="0"
                              value={record.sakit}
                              onChange={(e) => handleValueChange(student.id, 'sakit', e.target.value)}
                              className="w-16 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs py-1.5 text-slate-250 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>

                          {/* Izin */}
                          <td className="py-3 px-6 text-center">
                            <input
                              type="number"
                              min="0"
                              value={record.izin}
                              onChange={(e) => handleValueChange(student.id, 'izin', e.target.value)}
                              className="w-16 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs py-1.5 text-slate-250 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>

                          {/* Alpha */}
                          <td className="py-3 px-6 text-center">
                            <input
                              type="number"
                              min="0"
                              value={record.alpha}
                              onChange={(e) => handleValueChange(student.id, 'alpha', e.target.value)}
                              className="w-16 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs py-1.5 text-slate-250 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
        </div>
      )}
    </div>
  )
}
