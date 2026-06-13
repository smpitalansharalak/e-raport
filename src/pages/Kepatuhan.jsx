import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Save, AlertCircle, CheckCircle, Plus, Edit2, Trash2, X } from 'lucide-react'

function sanitizeText(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u00AD\u200B\u200C\u200D\u200E\u200F\uFEFF\uFFFC]/g, '')
    .trim()
}

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

  const [activeMainTab, setActiveMainTab] = useState('kehadiran') // 'kehadiran', 'kokurikuler', 'ekstrakurikuler'
  const [selectedStudentId, setSelectedStudentId] = useState(null)

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
    setSelectedStudentId(null)

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
        aMap[s.id] = { student_id: s.id, sakit: 0, izin: 0, alpha: 0, catatan: '', kokurikuler: [], ekstrakurikuler: [] }
      })
      aData.forEach((row) => {
        let cat = row.catatan_khusus || ''
        let catatan = cat
        let kokurikuler = []
        let ekstrakurikuler = []
        try {
          const parsed = JSON.parse(cat)
          if (typeof parsed === 'object' && parsed !== null && ('catatan' in parsed || 'kokurikuler' in parsed || 'ekstrakurikuler' in parsed)) {
            catatan = parsed.catatan || ''
            kokurikuler = parsed.kokurikuler || []
            ekstrakurikuler = parsed.ekstrakurikuler || []
          }
        } catch (e) {
          // It's a plain string
        }

        aMap[row.student_id] = {
          student_id: row.student_id,
          sakit: row.sakit || 0,
          izin: row.izin || 0,
          alpha: row.alpha || 0,
          catatan,
          kokurikuler,
          ekstrakurikuler,
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
        [field]: field === 'catatan' ? sanitizeText(val) : (val === '' ? 0 : Math.max(0, Number(val))),
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
        catatan_khusus: JSON.stringify({
          catatan: att.catatan,
          kokurikuler: att.kokurikuler,
          ekstrakurikuler: att.ekstrakurikuler
        }),
      }))
      const { error } = await supabase.from('student_attendance').upsert(payload, {
        onConflict: 'student_id,report_period_id',
      })
      if (error) throw error
      setSuccess('Seluruh data kelas berhasil disimpan!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError('Gagal menyimpan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSingleStudent = async (studentId) => {
    const att = attendance[studentId]
    if (!att) return
    
    try {
      const payload = {
        student_id: att.student_id,
        report_period_id: selectedPeriodId,
        sakit: att.sakit,
        izin: att.izin,
        alpha: att.alpha,
        catatan_khusus: JSON.stringify({
          catatan: att.catatan,
          kokurikuler: att.kokurikuler,
          ekstrakurikuler: att.ekstrakurikuler
        }),
      }
      const { error: saveErr } = await supabase.from('student_attendance').upsert(payload, {
        onConflict: 'student_id,report_period_id',
      })
      if (saveErr) throw saveErr
      return true
    } catch (err) {
      setError('Gagal menyimpan siswa: ' + err.message)
      return false
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
        <h2 className="text-2xl font-bold text-slate-100 m-0">Menu Wali Kelas</h2>
        <p className="text-sm text-slate-400 mt-1">
          Input ketidakhadiran, catatan khusus, serta data Kokurikuler & Ekstrakurikuler siswa.
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

      {isGridLoaded && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveMainTab('kehadiran')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeMainTab === 'kehadiran' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Kehadiran & Catatan
              </button>
              <button
                onClick={() => setActiveMainTab('kokurikuler')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeMainTab === 'kokurikuler' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Kokurikuler
              </button>
              <button
                onClick={() => setActiveMainTab('ekstrakurikuler')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeMainTab === 'ekstrakurikuler' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Ekstrakurikuler
              </button>
            </div>
            
            {activeMainTab === 'kehadiran' && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Save size={16} />
                {loading ? 'Menyimpan...' : 'Simpan Semua Data Kehadiran'}
              </button>
            )}
          </div>

          {activeMainTab === 'kehadiran' && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
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
                    {students.map((student, index) => {
                      const rec = attendance[student.id] || { sakit: 0, izin: 0, alpha: 0, catatan: '' }
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
                              value={rec.catatan || ''}
                              onChange={(e) => handleChange(student.id, 'catatan', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm py-1.5 px-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeMainTab === 'kokurikuler' || activeMainTab === 'ekstrakurikuler') && (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Student List */}
              <div className="w-full md:w-1/3 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[600px]">
                <div className="p-3 border-b border-slate-800 bg-slate-950/20">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pilih Siswa</h3>
                </div>
                <div className="overflow-y-auto divide-y divide-slate-800/50">
                  {students.map(student => {
                    const isSelected = selectedStudentId === student.id
                    const itemsCount = (attendance[student.id]?.[activeMainTab] || []).length
                    return (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id)}
                        className={`w-full text-left p-3.5 flex items-center justify-between transition-colors ${isSelected ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : 'hover:bg-slate-800/30'}`}
                      >
                        <div>
                          <p className={`text-sm font-semibold ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>{student.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{student.nisn}</p>
                        </div>
                        {itemsCount > 0 && (
                          <span className="text-[10px] font-bold text-slate-950 bg-emerald-500 px-2 py-0.5 rounded-full">
                            {itemsCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Activity Manager */}
              <div className="w-full md:w-2/3">
                {selectedStudentId ? (
                  <ActivityManager
                    type={activeMainTab}
                    student={students.find(s => s.id === selectedStudentId)}
                    data={attendance[selectedStudentId]?.[activeMainTab] || []}
                    onUpdate={(newData) => {
                      setAttendance(prev => ({
                        ...prev,
                        [selectedStudentId]: {
                          ...prev[selectedStudentId],
                          [activeMainTab]: newData
                        }
                      }))
                    }}
                    onSaveToDB={async () => {
                      const success = await handleSaveSingleStudent(selectedStudentId)
                      if (success) {
                        setSuccess(`Data ${activeMainTab === 'kokurikuler' ? 'Kokurikuler' : 'Ekstrakurikuler'} ${students.find(s => s.id === selectedStudentId)?.name} berhasil disimpan!`)
                        setTimeout(() => setSuccess(''), 3000)
                      }
                    }}
                  />
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center">
                    <AlertCircle size={32} className="mb-3 text-slate-600" />
                    <p>Pilih siswa dari daftar di sebelah kiri untuk mengisi data {activeMainTab === 'kokurikuler' ? 'Kokurikuler' : 'Ekstrakurikuler'}.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ActivityManager({ type, student, data, onUpdate, onSaveToDB }) {
  const [form, setForm] = useState({ id: null, name: '', description: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [isSavingDB, setIsSavingDB] = useState(false)

  const handleSaveLocal = () => {
    const cleanName = sanitizeText(form.name)
    const cleanDesc = sanitizeText(form.description)
    if (!cleanName) return
    let newData = [...data]
    if (form.id) {
      newData = newData.map(item => item.id === form.id ? { ...item, name: cleanName, description: cleanDesc } : item)
    } else {
      newData.push({ id: Date.now().toString(), name: cleanName, description: cleanDesc })
    }
    onUpdate(newData)
    setForm({ id: null, name: '', description: '' })
    setIsEditing(false)
  }

  const handleCommitDB = async () => {
    setIsSavingDB(true)
    await onSaveToDB()
    setIsSavingDB(false)
  }

  const handleEdit = (item) => {
    setForm(item)
    setIsEditing(true)
  }

  const handleDelete = (id) => {
    onUpdate(data.filter(item => item.id !== id))
  }

  const title = type === 'kokurikuler' ? 'Kokurikuler' : 'Ekstrakurikuler'

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-100">{title} Siswa</h3>
          <p className="text-xs text-slate-400 mt-0.5">{student.name}</p>
        </div>
        <button
          onClick={handleCommitDB}
          disabled={isSavingDB}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          <Save size={14} />
          {isSavingDB ? 'Menyimpan...' : 'Simpan ke Database'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Form */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Kegiatan</label>
              <input
                type="text"
                placeholder={`Contoh: ${type === 'kokurikuler' ? 'Pramuka' : 'Futsal'}`}
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Keterangan</label>
              <textarea
                placeholder="Contoh: Sangat Baik"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 resize-y min-h-[40px]"
                rows="1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {isEditing && (
              <button
                onClick={() => { setForm({ id: null, name: '', description: '' }); setIsEditing(false) }}
                className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg"
              >
                Batal
              </button>
            )}
            <button
              onClick={handleSaveLocal}
              disabled={!form.name.trim()}
              className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              {isEditing ? <Edit2 size={14} /> : <Plus size={14} />}
              {isEditing ? 'Simpan Edit (Lokal)' : 'Tambah ke Tabel'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-2.5 px-4 w-10 text-center">No</th>
                <th className="py-2.5 px-4">Nama {title}</th>
                <th className="py-2.5 px-4">Keterangan</th>
                <th className="py-2.5 px-4 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-500 text-xs italic">
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-xs">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">{item.name}</td>
                    <td className="py-2.5 px-4 text-slate-400">{item.description}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-indigo-400 hover:bg-indigo-500/20 rounded-md transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-md transition-colors"
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
    </div>
  )
}
