import { useEffect, useMemo, useRef } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { useKepatuhan } from './useKepatuhan'
import KehadiranRow from './components/KehadiranRow'
import ActivityManager from './components/ActivityManager'
import StudentButton from './components/StudentButton'

export default function KepatuhanPage() {
  const {
    periods,
    loading,
    selectedPeriodId,
    setSelectedPeriodId,
    students,
    attendance,
    loadingGrid,
    isGridLoaded,
    setIsGridLoaded,
    error,
    success,
    activeMainTab,
    setActiveMainTab,
    selectedStudentId,
    setSelectedStudentId,
    savingRows,
    handleLoadGrid,
    handleChange,
    handleUpdateActivity,
    handleSaveActivityDB,
    handleSaveRow,
  } = useKepatuhan()

  const activityRef = useRef(null)
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  )

  useEffect(() => {
    if (selectedStudentId && activityRef.current && window.innerWidth < 768) {
      const timer = setTimeout(() => {
        activityRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [selectedStudentId])

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
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle size={16} className="shrink-0" />
          <span>{success}</span>
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
            onChange={(e) => {
              setSelectedPeriodId(e.target.value)
              setIsGridLoaded(false)
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">-- Pilih Kelas --</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Kelas {p.class_name})
              </option>
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
                Kehadiran &amp; Catatan
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
          </div>

          {activeMainTab === 'kehadiran' && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-900/40">
                      <th className="py-3 px-4 w-8">#</th>
                      <th className="py-3 px-4 min-w-[150px]">Nama Siswa</th>
                      <th className="py-3 px-4 text-center w-20">Sakit</th>
                      <th className="py-3 px-4 text-center w-20">Izin</th>
                      <th className="py-3 px-4 text-center w-20">Alpha</th>
                      <th className="py-3 px-4 min-w-[200px]">Catatan Wali Kelas</th>
                      <th className="py-3 px-4 text-center w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {students.map((student, index) => {
                      const rec =
                        attendance[student.id] || { sakit: 0, izin: 0, alpha: 0, catatan: '' }
                      return (
                        <KehadiranRow
                          key={student.id}
                          student={student}
                          index={index}
                          rec={rec}
                          onChange={handleChange}
                          onSave={handleSaveRow}
                          isSavingRow={savingRows[student.id]}
                        />
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
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Pilih Siswa
                  </h3>
                </div>
                <div className="overflow-y-auto divide-y divide-slate-800/50">
                  {students.map((student) => {
                    const isSelected = selectedStudentId === student.id
                    const itemsCount = (attendance[student.id]?.[activeMainTab] || []).length
                    return (
                      <StudentButton
                        key={student.id}
                        student={student}
                        isSelected={isSelected}
                        itemsCount={itemsCount}
                        onClick={() => setSelectedStudentId(student.id)}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Activity Manager */}
              <div className="w-full md:w-2/3" ref={activityRef}>
                {selectedStudentId ? (
                  <ActivityManager
                    type={activeMainTab}
                    student={selectedStudent}
                    data={attendance[selectedStudentId]?.[activeMainTab] || []}
                    onUpdate={handleUpdateActivity}
                    onSaveToDB={handleSaveActivityDB}
                  />
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center">
                    <AlertCircle size={32} className="mb-3 text-slate-600" />
                    <p>
                      Pilih siswa dari daftar di sebelah kiri untuk mengisi data{' '}
                      {activeMainTab === 'kokurikuler' ? 'Kokurikuler' : 'Ekstrakurikuler'}.
                    </p>
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
