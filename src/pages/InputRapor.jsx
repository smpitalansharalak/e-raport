import React from 'react'
import { FileEdit, Sliders, Save, AlertCircle, CheckCircle } from 'lucide-react'
import useInputRapor from '../hooks/useInputRapor'
import ScoreGrid from '../components/rapor/ScoreGrid'
import MaterialModal from '../components/rapor/MaterialModal'
import SummativeModal from '../components/rapor/SummativeModal'

export default function InputRapor() {
  const {
    periods,
    teacherSubjects,
    selectedPeriodId,
    setSelectedPeriodId,
    selectedSubjectId,
    setSelectedSubjectId,
    students,
    materials,
    learningTargets,
    summatives,
    scores,
    isGridLoaded,
    setIsGridLoaded,
    loadingGrid,
    savingRows,
    editingRows,
    setEditingRows,
    error,
    success,
    showMaterialModal,
    setShowMaterialModal,
    showSummativeModal,
    setShowSummativeModal,
    newMaterialName,
    setNewMaterialName,
    tpInputs,
    setTpInputs,
    newSummativeName,
    setNewSummativeName,
    handleLoadGrid,
    handleScoreChange,
    handleSaveSingleRow,
    handleEditRow,
    handleAddMaterial,
    handleDeleteMaterial,
    handleAddTp,
    handleDeleteTp,
    handleAddSummative,
    handleDeleteSummative,
    handleCloseMaterialModal,
    handleCloseSummativeModal,
    modalError,
    setModalError,
  } = useInputRapor()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 m-0">Input Nilai Rapor</h2>
        <p className="text-sm text-slate-400 mt-1">
          Isi nilai formatif, sumatif, STS, SAS, dan deskripsi ketercapaian siswa.
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

      {/* Selectors Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Periode Rapor (Aktif)
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => {
              setSelectedPeriodId(e.target.value)
              setIsGridLoaded(false)
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">-- Pilih Periode Rapor --</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                Kelas {p.class_name} — Semester {p.semester} ({p.academic_year})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Mata Pelajaran
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value)
              setIsGridLoaded(false)
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">-- Pilih Mata Pelajaran --</option>
            {(() => {
              const currentPeriod = periods.find((p) => p.id === selectedPeriodId)
              const filtered = teacherSubjects.filter((sub) => {
                if (!currentPeriod) return true
                if (!sub.class_name) return true
                const pClass = currentPeriod.class_name || ''
                return (
                  pClass.toLowerCase().startsWith(sub.class_name.toLowerCase()) ||
                  pClass.toLowerCase().includes(sub.class_name.toLowerCase())
                )
              })
              return filtered.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.class_name ? `(Kelas ${sub.class_name})` : ''}
                </option>
              ))
            })()}
          </select>
        </div>

        <button
          onClick={handleLoadGrid}
          disabled={loadingGrid}
          className="w-full md:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm tracking-wide shadow-md transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingGrid ? 'Memuat...' : 'Mulai Nilai'}
        </button>
      </div>

      {/* Penilaian Sheet */}
      {isGridLoaded && (
        <div className="space-y-6">
          {/* Settings / Config Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setShowMaterialModal(true)}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 hover:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sliders size={14} className="text-slate-500" />
                Atur Lingkup Materi & TP (Formatif: {learningTargets.length})
              </button>
              <button
                onClick={() => setShowSummativeModal(true)}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 hover:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sliders size={14} className="text-slate-500" />
                Atur Sumatif ({summatives.length})
              </button>
            </div>
          </div>

          {/* Spreadsheet Grid */}
          <ScoreGrid
            students={students}
            materials={materials}
            learningTargets={learningTargets}
            summatives={summatives}
            scores={scores}
            handleScoreChange={handleScoreChange}
            handleSaveSingleRow={handleSaveSingleRow}
            handleEditRow={handleEditRow}
            savingRows={savingRows}
            editingRows={editingRows}
            setEditingRows={setEditingRows}
          />
        </div>
      )}

      {/* Modal Lingkup Materi & TP */}
      {showMaterialModal && (
        <MaterialModal
          materials={materials}
          learningTargets={learningTargets}
          newMaterialName={newMaterialName}
          setNewMaterialName={setNewMaterialName}
          tpInputs={tpInputs}
          setTpInputs={setTpInputs}
          handleAddMaterial={handleAddMaterial}
          handleDeleteMaterial={handleDeleteMaterial}
          handleAddTp={handleAddTp}
          handleDeleteTp={handleDeleteTp}
          onClose={handleCloseMaterialModal}
          modalError={modalError}
        />
      )}

      {/* Modal Sumatif */}
      {showSummativeModal && (
        <SummativeModal
          summatives={summatives}
          newSummativeName={newSummativeName}
          setNewSummativeName={setNewSummativeName}
          handleAddSummative={handleAddSummative}
          handleDeleteSummative={handleDeleteSummative}
          onClose={handleCloseSummativeModal}
        />
      )}
    </div>
  )
}