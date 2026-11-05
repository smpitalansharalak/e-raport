import { useMemo, useState } from 'react'
import { Sliders, AlertCircle, CheckCircle, LayoutGrid, Table2 } from 'lucide-react'
import useInputRapor from './useInputRapor'
import useMediaQuery from '@/hooks/useMediaQuery'
import ScoreGrid from './components/ScoreGrid'
import MobileScoreList from './components/MobileScoreList'
import ComponentManagerModal from './components/ComponentManagerModal'

const MOBILE_VIEW_KEY = 'input-rapor:mobile-view'

function getInitialMobileView() {
  if (typeof window === 'undefined') return 'cards'
  try {
    return window.localStorage.getItem(MOBILE_VIEW_KEY) === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

export default function InputRaporPage() {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [mobileView, setMobileView] = useState(getInitialMobileView)
  const {
    periods,
    teacherSubjects,
    selectedPeriodId,
    setSelectedPeriodId,
    selectedSubjectId,
    setSelectedSubjectId,
    students,
    components,
    items,
    learningTargets,
    calculationMode,
    gradePredicates,
    predicatePlacement,
    scores,
    isGridLoaded,
    setIsGridLoaded,
    loadingGrid,
    savingRows,
    editingRows,
    error,
    success,
    showComponentModal,
    setShowComponentModal,
    itemDrafts,
    setItemDraft,
    tpInputs,
    setTpInputs,
    modalError,
    handleLoadGrid,
    handleScoreChange,
    handleSaveSingleRow,
    handleEditRow,
    restoreStudentScore,
    handleAddItem,
    handleRenameItem,
    handleDeleteItem,
    handleAddTp,
    handleDeleteTp,
    handleCloseComponentModal,
  } = useInputRapor()

  const filteredTeacherSubjects = useMemo(() => {
    const currentPeriod = periods.find((p) => p.id === selectedPeriodId)
    return teacherSubjects.filter((sub) => {
      if (!currentPeriod) return true
      if (!sub.class_name) return true
      const pClass = currentPeriod.class_name || ''
      const regex = new RegExp(`\\b${sub.class_name}\\b`, 'i')
      return regex.test(pClass)
    })
  }, [periods, selectedPeriodId, teacherSubjects])

  const changeMobileView = (view) => {
    setMobileView(view)
    try {
      window.localStorage.setItem(MOBILE_VIEW_KEY, view)
    } catch {
      // localStorage bisa diblokir (mode privat) — abaikan, cukup state saja.
    }
  }

  const countableItemCount = items.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 m-0">Input Nilai Rapor</h2>
        <p className="text-sm text-slate-400 mt-1">
          Isi nilai siswa sesuai komponen penilaian pada format periode ini, lalu isi deskripsi ketercapaian.
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
            {filteredTeacherSubjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} {sub.class_name ? `(Kelas ${sub.class_name})` : ''}
              </option>
            ))}
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
        <div className="space-y-4 md:space-y-6">
          {/* Settings / Config Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setShowComponentModal(true)}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 hover:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sliders size={14} className="text-slate-500" />
                Atur Komponen Penilaian ({countableItemCount} item)
              </button>
              {calculationMode === 'weighted' && (
                <span className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-violet-300 border border-violet-500/30 bg-violet-500/10 rounded-xl flex items-center">
                  Mode bobot (diatur admin)
                </span>
              )}
            </div>

            {!isDesktop && (
              <div
                role="group"
                aria-label="Mode tampilan penilaian"
                className="flex rounded-xl border border-slate-800 bg-slate-950 p-1"
              >
                <button
                  type="button"
                  onClick={() => changeMobileView('cards')}
                  aria-pressed={mobileView === 'cards'}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    mobileView === 'cards'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid size={14} />
                  Kartu
                </button>
                <button
                  type="button"
                  onClick={() => changeMobileView('table')}
                  aria-pressed={mobileView === 'table'}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    mobileView === 'table'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  <Table2 size={14} />
                  Tabel
                </button>
              </div>
            )}
          </div>

          {/* Spreadsheet Grid (desktop) / Kartu + editor (mobile) */}
          {isDesktop || mobileView === 'table' ? (
            <ScoreGrid
              students={students}
              components={components}
              items={items}
              learningTargets={learningTargets}
              calculationMode={calculationMode}
              predicates={gradePredicates}
              predicatePlacement={predicatePlacement}
              scores={scores}
              handleScoreChange={handleScoreChange}
              handleSaveSingleRow={handleSaveSingleRow}
              handleEditRow={handleEditRow}
              savingRows={savingRows}
              editingRows={editingRows}
            />
          ) : (
            <MobileScoreList
              students={students}
              components={components}
              items={items}
              learningTargets={learningTargets}
              calculationMode={calculationMode}
              predicates={gradePredicates}
              predicatePlacement={predicatePlacement}
              scores={scores}
              handleScoreChange={handleScoreChange}
              handleSaveSingleRow={handleSaveSingleRow}
              handleEditRow={handleEditRow}
              restoreStudentScore={restoreStudentScore}
              savingRows={savingRows}
              editingRows={editingRows}
            />
          )}
        </div>
      )}

      {/* Modal Atur Komponen Penilaian */}
      {showComponentModal && (
        <ComponentManagerModal
          components={components}
          items={items}
          learningTargets={learningTargets}
          itemDrafts={itemDrafts}
          setItemDraft={setItemDraft}
          onAddItem={handleAddItem}
          onRenameItem={handleRenameItem}
          onDeleteItem={handleDeleteItem}
          tpInputs={tpInputs}
          setTpInputs={setTpInputs}
          onAddTp={handleAddTp}
          onDeleteTp={handleDeleteTp}
          onClose={handleCloseComponentModal}
          modalError={modalError}
        />
      )}
    </div>
  )
}
