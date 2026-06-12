import React, { useMemo, useCallback, useRef } from 'react'
import { Check, Loader2, Edit2 } from 'lucide-react'
import {
  calculateFormativeAvg,
  calculateSummativeAvg,
  calculateAvgOfTwo,
  calculateFinalRaporScore,
} from '../../utils/scoreCalculations'

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
  setEditingRows,
}) {
  const totalWidth = useMemo(() => {
    let w = COL_WIDTHS.student
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
  }, [learningTargets.length, summatives.length])

  const totalCols =
    1 +
    learningTargets.length +
    (learningTargets.length > 0 ? 1 : 0) +
    summatives.length +
    (summatives.length > 0 ? 1 : 0) +
    6 + 1 + 1 + 1

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex-wrap">
        <span className="text-[11px] text-slate-500 font-medium">{students.length} siswa</span>
        <span className="text-slate-700">•</span>
        <span className="text-[11px] text-indigo-400 font-medium">{learningTargets.length} kolom formatif (TP)</span>
        <span className="text-slate-700">•</span>
        <span className="text-[11px] text-violet-400 font-medium">{summatives.length} kolom sumatif LM</span>
        <span className="ml-auto text-[10px] text-slate-600 italic hidden sm:inline">
          ← geser horizontal untuk melihat semua kolom
        </span>
      </div>

      <div className="overflow-auto max-h-[65vh] custom-scrollbar">
        <table
          className="text-left border-collapse"
          style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
        >
          <colgroup>
            <col style={{ width: `${COL_WIDTHS.student}px`, minWidth: `${COL_WIDTHS.student}px` }} />
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

          <thead className="sticky top-0 z-30 shadow-md">
            <tr className="bg-slate-950 text-slate-450 text-[10px] uppercase font-bold tracking-widest text-center border-b border-slate-800/80">
              <th
                className="py-2.5 px-3 text-left font-medium text-slate-500 sticky left-0 z-40 bg-slate-950 border-r border-slate-800"
                rowSpan={2}
              >
                Informasi Siswa
              </th>

              {materials.map((mat) => {
                const tpsInMat = learningTargets.filter((tp) => tp.material_id === mat.id)
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
                const tpsInMat = learningTargets.filter((tp) => tp.material_id === mat.id)
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

  // FIX: sanitizePaste stabil dengan useCallback
  const sanitizePaste = useCallback((e, field) => {
    e.preventDefault()
    const raw = e.clipboardData.getData('text/plain')
    const cleaned = raw
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/[\u00AD\u200B\u200C\u200D\u200E\u200F\uFEFF\uFFFC\u2028\u2029]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\r\n|\r/g, '\n')
    const ta = e.target
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const current = ta.value
    const next = current.substring(0, start) + cleaned + current.substring(end)
    handleScoreChange(student.id, 'other', field, next)
  }, [student.id, handleScoreChange])

  return (
    <tr className={`hover:bg-slate-800/30 transition-colors ${rowBg}`}>
      {/* Nama — sticky */}
      <td className="py-3 px-3 sticky left-0 z-10 bg-slate-900 border-r border-slate-800">
        <p className="font-semibold text-slate-200 leading-tight text-xs truncate max-w-[180px]" title={student.name}>
          {student.name}
        </p>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{student.nisn}</p>
      </td>

      {/* Formatif per TP */}
      {materials.map((mat) => {
        const tpsInMat = learningTargets.filter((tp) => tp.material_id === mat.id)
        return tpsInMat.map((tp, idx) => (
          <td
            key={tp.id}
            className={`py-2 px-0.5 text-center bg-indigo-500/3 ${idx === 0 ? 'border-l border-slate-800' : ''}`}
          >
            <input
              type="number"
              min="0"
              max="100"
              disabled={!isEditing}
              value={studentScore.scores_formative?.[tp.id] ?? ''}
              onChange={(e) => handleScoreChange(student.id, 'formative', tp.id, e.target.value)}
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded text-center text-xs py-1 px-0.5 text-slate-200 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
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
            min="0"
            max="100"
            disabled={!isEditing}
            value={studentScore.scores_summative?.[sum.id] ?? ''}
            onChange={(e) => handleScoreChange(student.id, 'summative', sum.id, e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs py-1 px-0.5 text-slate-200 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
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
        <input type="number" min="0" max="100" disabled={!isEditing}
          value={studentScore.sts_practice ?? ''}
          onChange={(e) => handleScoreChange(student.id, 'other', 'sts_practice', e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs py-1 px-0.5 text-slate-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
        />
      </td>
      <td className="py-2 px-0.5 text-center">
        <input type="number" min="0" max="100" disabled={!isEditing}
          value={studentScore.sts_written ?? ''}
          onChange={(e) => handleScoreChange(student.id, 'other', 'sts_written', e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs py-1 px-0.5 text-slate-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
        />
      </td>
      <td className="py-2 px-1 text-center font-bold text-xs text-amber-400">{stsAvg || 0}</td>

      {/* SAS */}
      <td className="py-2 px-0.5 border-l border-slate-800 text-center">
        <input type="number" min="0" max="100" disabled={!isEditing}
          value={studentScore.sas_practice ?? ''}
          onChange={(e) => handleScoreChange(student.id, 'other', 'sas_practice', e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs py-1 px-0.5 text-slate-200 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
        />
      </td>
      <td className="py-2 px-0.5 text-center">
        <input type="number" min="0" max="100" disabled={!isEditing}
          value={studentScore.sas_written ?? ''}
          onChange={(e) => handleScoreChange(student.id, 'other', 'sas_written', e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs py-1 px-0.5 text-slate-200 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
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
          <DebouncedTextarea
            disabled={!isEditing}
            value={studentScore.highest_achievement ?? ''}
            placeholder={isEditing ? 'Capaian kompetensi tertinggi...' : '-'}
            field="highest_achievement"
            studentId={student.id}
            handleScoreChange={handleScoreChange}
            autoResize={autoResize}
            sanitizePaste={sanitizePaste}
            colorClass="focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-rose-500/80 uppercase tracking-wide shrink-0 w-10">Rendah</span>
          <DebouncedTextarea
            disabled={!isEditing}
            value={studentScore.lowest_achievement ?? ''}
            placeholder={isEditing ? 'Capaian kompetensi terendah...' : '-'}
            field="lowest_achievement"
            studentId={student.id}
            handleScoreChange={handleScoreChange}
            autoResize={autoResize}
            sanitizePaste={sanitizePaste}
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
    prevProps.materials === nextProps.materials
    // handleScoreChange, handleSaveSingleRow, handleEditRow selalu stabil (zero-dep useCallback)
    // sehingga tidak perlu dibandingkan
  )
})

// ─── DebouncedTextarea ────────────────────────────────────────────────────────
// FIX: Textarea deskripsi menggunakan local state + debounce ke parent.
// Ini mencegah setiap keystroke memicu re-render seluruh tabel (30+ baris).
// Debounce 300ms: perubahan dikirim ke parent hanya setelah user berhenti mengetik,
// sedangkan tampilan tetap responsif karena local state langsung diupdate.
const DebouncedTextarea = React.memo(function DebouncedTextarea({
  disabled,
  value,
  placeholder,
  field,
  studentId,
  handleScoreChange,
  autoResize,
  sanitizePaste,
  colorClass,
}) {
  const [localValue, setLocalValue] = React.useState(value)
  const debounceRef = useRef(null)
  const isMountedRef = useRef(true)

  // Sync dari parent (misal saat handleEditRow menarik data terbaru dari DB)
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = useCallback((e) => {
    const newVal = e.target.value
    setLocalValue(newVal) // update lokal langsung → tampilan responsif

    // Debounce update ke parent state (mencegah re-render seluruh grid)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        handleScoreChange(studentId, 'other', field, newVal)
      }
    }, 300)

    // autoResize tetap instan
    autoResize(e)
  }, [studentId, field, handleScoreChange, autoResize])

  const handlePaste = useCallback((e) => {
    // Untuk paste, flush debounce dan update langsung setelah sanitasi
    if (debounceRef.current) clearTimeout(debounceRef.current)
    e.preventDefault()
    const raw = e.clipboardData.getData('text/plain')
    const cleaned = raw
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/[\u00AD\u200B\u200C\u200D\u200E\u200F\uFEFF\uFFFC\u2028\u2029]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\r\n|\r/g, '\n')
    const ta = e.target
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = localValue.substring(0, start) + cleaned + localValue.substring(end)
    setLocalValue(next)
    handleScoreChange(studentId, 'other', field, next)
  }, [localValue, studentId, field, handleScoreChange])

  // Saat blur, pastikan value terbaru tersinkron (flush debounce)
  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      handleScoreChange(studentId, 'other', field, localValue)
    }
  }, [studentId, field, localValue, handleScoreChange])

  return (
    <textarea
      rows={3}
      placeholder={placeholder}
      disabled={disabled}
      value={localValue}
      onChange={handleChange}
      onPaste={handlePaste}
      onBlur={handleBlur}
      onInput={autoResize}
      className={`w-full bg-slate-950 border border-slate-800 rounded-lg p-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 resize-y disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default ${colorClass}`}
    />
  )
})