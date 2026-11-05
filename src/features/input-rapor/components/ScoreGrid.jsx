import React, { useMemo, useCallback, useRef } from 'react'
import { Check, Loader2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  calculateFormativeAvg,
  calculateSummativeAvg,
  calculateAvgOfTwo,
  calculateFinalRaporScore,
} from '@/utils/scoreCalculations'
import useMediaQuery from '@/hooks/useMediaQuery'
import DescriptionTextarea from './DescriptionTextarea'

const selectOnFocus = (e) => e.target.select()

const COL_WIDTHS = {
  student: 200,
  formative: 65,
  formativeAvg: 55,
  summative: 55,
  summativeAvg: 55,
  stsOrSas: 65,
  stsOrSasAvg: 55,
  rapor: 70,
  description: 340,
  action: 50,
}

export default function ScoreGrid({
  students,
  materials,
  learningTargets,
  summatives,
  scores,
  handleScoreChange,
  handleSaveSingleRow,
  handleEditRow,
  savingRows,
  editingRows,
}) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const studentColWidth = isMobile ? 112 : COL_WIDTHS.student
  const scrollRef = useRef(null)

  const scrollByScreen = useCallback((direction) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }, [])

  const totalWidth = useMemo(() => {
    let w = studentColWidth
    if (learningTargets.length > 0) {
      w += learningTargets.length * COL_WIDTHS.formative
      w += COL_WIDTHS.formativeAvg
    }
    if (summatives.length > 0) {
      w += summatives.length * COL_WIDTHS.summative
      w += COL_WIDTHS.summativeAvg
    }
    w += COL_WIDTHS.stsOrSas * 2 + COL_WIDTHS.stsOrSasAvg
    w += COL_WIDTHS.stsOrSas * 2 + COL_WIDTHS.stsOrSasAvg
    w += COL_WIDTHS.rapor + COL_WIDTHS.description + COL_WIDTHS.action
    return w
  }, [learningTargets.length, summatives.length, studentColWidth])

  const totalCols =
    1 +
    learningTargets.length +
    (learningTargets.length > 0 ? 1 : 0) +
    summatives.length +
    (summatives.length > 0 ? 1 : 0) +
    6 + 1 + 1 + 1

  const tpsByMaterialId = useMemo(() => {
    const grouped = new Map()
    learningTargets.forEach((tp) => {
      const existing = grouped.get(tp.material_id)
      if (existing) {
        existing.push(tp)
      } else {
        grouped.set(tp.material_id, [tp])
      }
    })
    return grouped
  }, [learningTargets])

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex-wrap">
        <span className="text-[11px] text-slate-500 font-medium">{students.length} siswa</span>
        <span className="text-slate-700">•</span>
        <span className="text-[11px] text-indigo-400 font-medium">{learningTargets.length} kolom formatif (TP)</span>
        <span className="text-slate-700">•</span>
        <span className="text-[11px] text-violet-400 font-medium">{summatives.length} kolom sumatif LM</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 italic hidden md:inline">
            ← geser horizontal untuk melihat semua kolom
          </span>
          <button
            type="button"
            onClick={() => scrollByScreen(-1)}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-200 hover:border-slate-700 transition-colors cursor-pointer"
            aria-label="Geser tabel ke kiri"
            title="Geser ke kiri"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => scrollByScreen(1)}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-200 hover:border-slate-700 transition-colors cursor-pointer"
            aria-label="Geser tabel ke kanan"
            title="Geser ke kanan"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-auto overscroll-x-contain md:max-h-[65vh] custom-scrollbar">
        <table
          className="text-left border-collapse"
          style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
        >
          <colgroup>
            <col style={{ width: `${studentColWidth}px`, minWidth: `${studentColWidth}px` }} />
            {learningTargets.map((tp) => (
              <col key={`tp-${tp.id}`} style={{ width: `${COL_WIDTHS.formative}px` }} />
            ))}
            {learningTargets.length > 0 && <col style={{ width: `${COL_WIDTHS.formativeAvg}px` }} />}
            {summatives.map((sum) => (
              <col key={`sum-${sum.id}`} style={{ width: `${COL_WIDTHS.summative}px` }} />
            ))}
            {summatives.length > 0 && <col style={{ width: `${COL_WIDTHS.summativeAvg}px` }} />}
            <col style={{ width: `${COL_WIDTHS.stsOrSas}px` }} />
            <col style={{ width: `${COL_WIDTHS.stsOrSas}px` }} />
            <col style={{ width: `${COL_WIDTHS.stsOrSasAvg}px` }} />
            <col style={{ width: `${COL_WIDTHS.stsOrSas}px` }} />
            <col style={{ width: `${COL_WIDTHS.stsOrSas}px` }} />
            <col style={{ width: `${COL_WIDTHS.stsOrSasAvg}px` }} />
            <col style={{ width: `${COL_WIDTHS.rapor}px` }} />
            <col style={{ width: `${COL_WIDTHS.description}px`, minWidth: `${COL_WIDTHS.description}px` }} />
            <col style={{ width: `${COL_WIDTHS.action}px` }} />
          </colgroup>

          <thead className="md:sticky md:top-0 z-30 shadow-md">
            <tr className="bg-slate-950 text-slate-450 text-[10px] uppercase font-bold tracking-widest text-center border-b border-slate-800/80">
              <th
                className="py-2.5 px-3 text-left font-medium text-slate-500 sticky left-0 z-40 bg-slate-950 border-r border-slate-800"
                rowSpan={2}
              >
                Informasi Siswa
              </th>

              {materials.map((mat) => {
                const tpsInMat = tpsByMaterialId.get(mat.id) ?? []
                if (tpsInMat.length === 0) return null
                return (
                  <th
                    key={mat.id}
                    className="py-2 px-2 border-l border-slate-800 bg-indigo-500/8 text-indigo-300 leading-tight whitespace-normal wrap-break-word align-middle"
                    colSpan={tpsInMat.length}
                    title={mat.name}
                  >
                    <span className="block whitespace-normal wrap-break-word leading-tight">
                      {mat.name}
                    </span>
                  </th>
                )
              })}

              {learningTargets.length > 0 && (
                <th className="py-2 px-1 border-l border-slate-800 text-slate-500 bg-indigo-500/5" rowSpan={2}>
                  Rrt<br />Form
                </th>
              )}

              {summatives.length > 0 && (
                <th className="py-2 px-2 border-l border-slate-800 text-black" colSpan={summatives.length + 1}>
                  Sumatif Lingkup Materi
                </th>
              )}

              <th className="py-2 px-1 border-l border-slate-800 text-black" colSpan={3}>Sumatif Tengah Semester</th>
              <th className="py-2 px-1 border-l border-slate-800 text-black" colSpan={3}>Sumatif Akhir Semester</th>
              <th className="py-2 px-1 border-l border-slate-800 bg-emerald-500/8 text-emerald-300" rowSpan={2}>Rapor</th>
              <th className="py-2 px-3 border-l border-slate-800 text-left font-medium text-slate-500" rowSpan={2}>Deskripsi Capaian</th>
              <th className="py-2 px-1 border-l border-slate-800 text-center font-medium text-slate-500 sticky right-0 z-40 bg-slate-950" rowSpan={2}>Aksi</th>
            </tr>

            <tr className="bg-slate-900 text-slate-400 text-[10px] font-semibold border-b border-slate-800">
              {materials.map((mat) => {
                const tpsInMat = tpsByMaterialId.get(mat.id) ?? []
                return tpsInMat.map((tp, idx) => (
                  <th
                    key={tp.id}
                    className={`py-2.5 px-1 text-center font-mono truncate bg-indigo-500/5 ${idx === 0 ? 'border-l border-slate-800' : ''}`}
                    title={`${mat.name}: ${tp.description}`}
                  >
                    {tp.code}
                  </th>
                ))
              })}

              {summatives.map((sum, idx) => (
                <th
                  key={sum.id}
                  className={`
                  py-2
                  px-1
                  text-center
                  whitespace-normal
                  wrap-break-word
                  leading-tight
                  min-h-[60px]
                  bg-violet-500/5
                  ${idx === 0 ? 'border-l border-slate-800' : ''}
                `}
                  title={sum.name}
                >
                  {sum.name}
                </th>
              ))}
              {summatives.length > 0 && (
                <th className="py-2.5 px-1 text-center border-l border-slate-800 text-slate-500 font-bold bg-violet-500/5">Rrt</th>
              )}

              <th className="py-2.5 px-1 text-center border-l border-slate-800 text-black">Prak</th>
              <th className="py-2.5 px-1 text-center text-black">Tulis</th>
              <th className="py-2.5 px-1 text-center text-black font-bold">Rrt</th>
              <th className="py-2.5 px-1 text-center border-l border-slate-800 text-black">Prak</th>
              <th className="py-2.5 px-1 text-center text-black">Tulis</th>
              <th className="py-2.5 px-1 text-center text-black font-bold">Rrt</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
            {students.map((student, rowIdx) => {
              const studentScore = scores[student.id] || {
                scores_formative: {},
                scores_summative: {},
                sts_practice: '',
                sts_written: '',
                sas_practice: '',
                sas_written: '',
                highest_achievement: '',
                lowest_achievement: '',
              }

              return (
                <ScoreRow
                  key={student.id}
                  student={student}
                  studentScore={studentScore}
                  materials={materials}
                  learningTargets={learningTargets}
                  summatives={summatives}
                  isEditing={!!editingRows?.[student.id]}
                  tpsByMaterialId={tpsByMaterialId}
                  isSaving={!!savingRows?.[student.id]}
                  handleScoreChange={handleScoreChange}
                  handleSaveSingleRow={handleSaveSingleRow}
                  handleEditRow={handleEditRow}
                  rowIdx={rowIdx}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      {students.length > 0 && (
        <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">
            {students.length} siswa × {totalCols} kolom
          </span>
          <span className="text-[10px] text-slate-600 italic">
            Scroll ke kanan untuk kolom STS, SAS &amp; Deskripsi →
          </span>
        </div>
      )}
    </div>
  )
}

// ─── ScoreRow ─────────────────────────────────────────────────────────────────
// FIX: Gunakan custom comparison di React.memo agar hanya re-render saat
// data baris ini benar-benar berubah, bukan saat baris lain berubah.
const ScoreRow = React.memo(function ScoreRow({
  student,
  studentScore,
  materials,
  learningTargets,
  summatives,
  tpsByMaterialId,
  isEditing,
  isSaving,
  handleScoreChange,
  handleSaveSingleRow,
  handleEditRow,
  rowIdx,
}) {
  const formativeAvg = calculateFormativeAvg(studentScore, learningTargets)
  const summativeAvg = calculateSummativeAvg(studentScore, summatives)
  const stsAvg = calculateAvgOfTwo(studentScore.sts_practice, studentScore.sts_written)
  const sasAvg = calculateAvgOfTwo(studentScore.sas_practice, studentScore.sas_written)
  const finalRapor = calculateFinalRaporScore(studentScore, learningTargets, summatives)

  const rowBg = rowIdx % 2 === 0 ? '' : 'bg-slate-900/20'

  // FIX: autoResize stabil dengan useCallback, tidak dibuat ulang tiap render
  const autoResize = useCallback((e) => {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }, [])

  return (
    <tr className={`hover:bg-slate-800/30 transition-colors ${rowBg}`}>
      {/* Nama — sticky */}
      <td className="py-3 px-3 sticky left-0 z-10 bg-slate-900 border-r border-slate-800 shadow-[4px_0_8px_-6px_rgba(15,23,42,0.35)]">
        <p className="font-semibold text-slate-200 leading-tight text-xs line-clamp-2" title={student.name}>
          {student.name}
        </p>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5 hidden sm:block">{student.nisn}</p>
      </td>

      {/* Formatif per TP */}
      {materials.map((mat) => {
        const tpsInMat = tpsByMaterialId.get(mat.id) ?? []
        return tpsInMat.map((tp, idx) => (
          <td
            key={tp.id}
            className={`py-2 px-0.5 text-center bg-indigo-500/3 ${idx === 0 ? 'border-l border-slate-800' : ''}`}
          >
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              disabled={!isEditing}
              onFocus={selectOnFocus}
              value={studentScore.scores_formative?.[tp.id] ?? ''}
              onChange={(e) => handleScoreChange(student.id, 'formative', tp.id, e.target.value)}
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded text-center text-xs h-9 md:h-8 py-0 px-0.5 text-slate-200 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
              title={`${tp.code} — ${tp.description}`}
            />
          </td>
        ))
      })}

      {/* Rata-rata formatif */}
      {learningTargets.length > 0 && (
        <td className="py-2 px-1 border-l border-slate-800 text-center font-bold text-xs text-indigo-400 bg-indigo-500/5">
          {formativeAvg}
        </td>
      )}

      {/* Sumatif LM */}
      {summatives.map((sum, idx) => (
        <td
          key={sum.id}
          className={`py-2 px-0.5 text-center bg-violet-500/3 ${idx === 0 ? 'border-l border-slate-800' : ''}`}
        >
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            disabled={!isEditing}
            onFocus={selectOnFocus}
            value={studentScore.scores_summative?.[sum.id] ?? ''}
            onChange={(e) => handleScoreChange(student.id, 'summative', sum.id, e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs h-9 md:h-8 py-0 px-0.5 text-slate-200 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
            title={sum.name}
          />
        </td>
      ))}
      {summatives.length > 0 && (
        <td className="py-2 px-1 border-l border-slate-800 text-center font-bold text-xs text-violet-400 bg-violet-500/5">
          {summativeAvg}
        </td>
      )}

      {/* STS */}
      <td className="py-2 px-0.5 border-l border-slate-800 text-center">
        <input type="number" inputMode="decimal" min="0" max="100" disabled={!isEditing} onFocus={selectOnFocus}
          value={studentScore.sts_practice ?? ''}
          onChange={(e) => handleScoreChange(student.id, 'other', 'sts_practice', e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs h-9 md:h-8 py-0 px-0.5 text-slate-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
        />
      </td>
      <td className="py-2 px-0.5 text-center">
        <input type="number" inputMode="decimal" min="0" max="100" disabled={!isEditing} onFocus={selectOnFocus}
          value={studentScore.sts_written ?? ''}
          onChange={(e) => handleScoreChange(student.id, 'other', 'sts_written', e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs h-9 md:h-8 py-0 px-0.5 text-slate-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
        />
      </td>
      <td className="py-2 px-1 text-center font-bold text-xs text-amber-400">{stsAvg || 0}</td>

      {/* SAS */}
      <td className="py-2 px-0.5 border-l border-slate-800 text-center">
        <input type="number" inputMode="decimal" min="0" max="100" disabled={!isEditing} onFocus={selectOnFocus}
          value={studentScore.sas_practice ?? ''}
          onChange={(e) => handleScoreChange(student.id, 'other', 'sas_practice', e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs h-9 md:h-8 py-0 px-0.5 text-slate-200 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
        />
      </td>
      <td className="py-2 px-0.5 text-center">
        <input type="number" inputMode="decimal" min="0" max="100" disabled={!isEditing} onFocus={selectOnFocus}
          value={studentScore.sas_written ?? ''}
          onChange={(e) => handleScoreChange(student.id, 'other', 'sas_written', e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs h-9 md:h-8 py-0 px-0.5 text-slate-200 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
        />
      </td>
      <td className="py-2 px-1 text-center font-bold text-xs text-orange-400">{sasAvg || 0}</td>

      {/* Nilai Rapor */}
      <td className="py-2 px-1 border-l border-slate-800 text-center font-extrabold text-sm text-emerald-400 bg-emerald-500/5">
        {finalRapor}
      </td>

      {/* Deskripsi Capaian */}
      <td className="py-2 px-3 border-l border-slate-800 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-wide shrink-0 w-10">Tinggi</span>
          <DescriptionTextarea
            disabled={!isEditing}
            value={studentScore.highest_achievement ?? ''}
            placeholder={isEditing ? 'Capaian kompetensi tertinggi...' : '-'}
            field="highest_achievement"
            studentId={student.id}
            handleScoreChange={handleScoreChange}
            autoResize={autoResize}
            colorClass="focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-rose-500/80 uppercase tracking-wide shrink-0 w-10">Rendah</span>
          <DescriptionTextarea
            disabled={!isEditing}
            value={studentScore.lowest_achievement ?? ''}
            placeholder={isEditing ? 'Capaian kompetensi terendah...' : '-'}
            field="lowest_achievement"
            studentId={student.id}
            handleScoreChange={handleScoreChange}
            autoResize={autoResize}
            colorClass="focus:border-rose-500 focus:ring-rose-500"
          />
        </div>
      </td>

      {/* Aksi */}
      <td className="py-2 px-2 border-l border-slate-800 text-center sticky right-0 z-10 bg-slate-900">
        {isEditing ? (
          <button
            onClick={() => handleSaveSingleRow(student.id)}
            disabled={isSaving}
            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
            title="Simpan Nilai"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          </button>
        ) : (
          <button
            onClick={() => handleEditRow(student.id)}
            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors cursor-pointer"
            title="Edit Nilai"
          >
            <Edit2 size={16} />
          </button>
        )}
      </td>
    </tr>
  )
}, (prevProps, nextProps) => {
  // Custom equality: hanya re-render jika data baris ini yang berubah
  return (
    prevProps.studentScore === nextProps.studentScore &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.isSaving === nextProps.isSaving &&
    prevProps.learningTargets === nextProps.learningTargets &&
    prevProps.summatives === nextProps.summatives &&
    prevProps.materials === nextProps.materials &&
    prevProps.tpsByMaterialId === nextProps.tpsByMaterialId
    // handleScoreChange, handleSaveSingleRow, handleEditRow selalu stabil (zero-dep useCallback)
    // sehingga tidak perlu dibandingkan
  )
})
