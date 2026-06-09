import React, { useMemo } from 'react'
import { Check, Loader2, Edit2 } from 'lucide-react'
import {
  calculateFormativeAvg,
  calculateSummativeAvg,
  calculateAvgOfTwo,
  calculateFinalRaporScore,
} from '../../utils/scoreCalculations'

// Lebar kolom yang bisa disesuaikan
const COL_WIDTHS = {
  student: 200,      // Informasi Siswa (sticky)
  formative: 52,     // Setiap kolom TP formatif
  formativeAvg: 52,  // Rata-rata formatif
  summative: 58,     // Setiap kolom sumatif
  summativeAvg: 52,  // Rata-rata sumatif LM
  stsOrSas: 50,      // Prak/Tulis STS atau SAS
  stsOrSasAvg: 46,   // Rrt STS / SAS
  rapor: 68,         // Nilai akhir rapor
  description: 340,  // Deskripsi capaian
  action: 50,        // Aksi per baris
}

/**
 * Komponen tabel spreadsheet untuk input nilai siswa.
 * Lebar tabel dihitung secara dinamis berdasarkan jumlah kolom formatif & sumatif.
 */
export default function ScoreGrid({
  students,
  materials,
  learningTargets,
  summatives,
  scores,
  handleScoreChange,
  handleSaveSingleRow,
  savingRows,
  editingRows,
  setEditingRows,
}) {
  // Hitung total lebar tabel secara dinamis
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
    // STS: Prak + Tulis + Rrt
    w += COL_WIDTHS.stsOrSas * 2 + COL_WIDTHS.stsOrSasAvg
    // SAS: Prak + Tulis + Rrt
    w += COL_WIDTHS.stsOrSas * 2 + COL_WIDTHS.stsOrSasAvg
    // Rapor + Deskripsi + Aksi
    w += COL_WIDTHS.rapor + COL_WIDTHS.description + COL_WIDTHS.action
    return w
  }, [learningTargets.length, summatives.length])

  const totalCols =
    1 + // No/Nama
    learningTargets.length +
    (learningTargets.length > 0 ? 1 : 0) + // avg formatif
    summatives.length +
    (summatives.length > 0 ? 1 : 0) + // avg sumatif LM
    6 + // STS (prak, tulis, rrt) + SAS (prak, tulis, rrt)
    1 + // Rapor
    1 + // Deskripsi
    1   // Aksi

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      {/* Info bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex-wrap">
        <span className="text-[11px] text-slate-500 font-medium">
          {students.length} siswa
        </span>
        <span className="text-slate-700">•</span>
        <span className="text-[11px] text-indigo-400 font-medium">
          {learningTargets.length} kolom formatif (TP)
        </span>
        <span className="text-slate-700">•</span>
        <span className="text-[11px] text-violet-400 font-medium">
          {summatives.length} kolom sumatif LM
        </span>
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
            {learningTargets.length > 0 && (
              <col style={{ width: `${COL_WIDTHS.formativeAvg}px` }} />
            )}
            {summatives.map((sum) => (
              <col key={`sum-${sum.id}`} style={{ width: `${COL_WIDTHS.summative}px` }} />
            ))}
            {summatives.length > 0 && (
              <col style={{ width: `${COL_WIDTHS.summativeAvg}px` }} />
            )}
            {/* STS: Prak, Tulis, Rrt */}
            <col style={{ width: `${COL_WIDTHS.stsOrSas}px` }} />
            <col style={{ width: `${COL_WIDTHS.stsOrSas}px` }} />
            <col style={{ width: `${COL_WIDTHS.stsOrSasAvg}px` }} />
            {/* SAS: Prak, Tulis, Rrt */}
            <col style={{ width: `${COL_WIDTHS.stsOrSas}px` }} />
            <col style={{ width: `${COL_WIDTHS.stsOrSas}px` }} />
            <col style={{ width: `${COL_WIDTHS.stsOrSasAvg}px` }} />
            {/* Rapor */}
            <col style={{ width: `${COL_WIDTHS.rapor}px` }} />
            {/* Deskripsi */}
            <col style={{ width: `${COL_WIDTHS.description}px`, minWidth: `${COL_WIDTHS.description}px` }} />
            {/* Aksi */}
            <col style={{ width: `${COL_WIDTHS.action}px` }} />
          </colgroup>

          <thead className="sticky top-0 z-30 shadow-md">
            {/* Row 1: Group headers */}
            <tr className="bg-slate-950 text-slate-450 text-[10px] uppercase font-bold tracking-widest text-center border-b border-slate-800/80">
              {/* Nama siswa — sticky */}
              <th
                className="py-2.5 px-3 text-left font-medium text-slate-500 sticky left-0 z-40 bg-slate-950 border-r border-slate-800"
                rowSpan={2}
              >
                Informasi Siswa
              </th>

              {/* Group formatif per material */}
              {materials.map((mat) => {
                const tpsInMat = learningTargets.filter((tp) => tp.material_id === mat.id)
                if (tpsInMat.length === 0) return null
                return (
                  <th
                    key={mat.id}
                    className="py-2 px-2 border-l border-slate-800 bg-indigo-500/8 text-indigo-300 leading-tight"
                    colSpan={tpsInMat.length}
                    title={mat.name}
                  >
                    <span className="block truncate max-w-full">{mat.name}</span>
                  </th>
                )
              })}

              {/* Rata-rata formatif */}
              {learningTargets.length > 0 && (
                <th
                  className="py-2 px-1 border-l border-slate-800 text-slate-500 bg-indigo-500/5"
                  rowSpan={2}
                >
                  Rrt<br />Form
                </th>
              )}

              {/* Sumatif Lingkup Materi */}
              {summatives.length > 0 && (
                <th
                  className="py-2 px-2 border-l border-slate-800 bg-violet-500/8 text-violet-300"
                  colSpan={summatives.length + 1}
                >
                  Sumatif Lingkup Materi
                </th>
              )}

              {/* STS */}
              <th className="py-2 px-1 border-l border-slate-800 text-amber-300/80" colSpan={3}>
                Sumatif Tengah Semester
              </th>

              {/* SAS */}
              <th className="py-2 px-1 border-l border-slate-800 text-orange-300/80" colSpan={3}>
                Sumatif Akhir Semester
              </th>

              {/* Nilai Rapor */}
              <th
                className="py-2 px-1 border-l border-slate-800 bg-emerald-500/8 text-emerald-300"
                rowSpan={2}
              >
                Rapor
              </th>

              {/* Deskripsi */}
              <th
                className="py-2 px-3 border-l border-slate-800 text-left font-medium text-slate-500"
                rowSpan={2}
              >
                Deskripsi Capaian
              </th>

              {/* Aksi */}
              <th
                className="py-2 px-1 border-l border-slate-800 text-center font-medium text-slate-500 sticky right-0 z-40 bg-slate-950"
                rowSpan={2}
              >
                Aksi
              </th>
            </tr>

            {/* Row 2: Sub-headers */}
            <tr className="bg-slate-900 text-slate-400 text-[10px] font-semibold border-b border-slate-800">
              {/* TP codes */}
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

              {/* Sumatif LM names */}
              {summatives.map((sum, idx) => (
                <th
                  key={sum.id}
                  className={`py-2.5 px-1 text-center truncate bg-violet-500/5 ${idx === 0 ? 'border-l border-slate-800' : ''}`}
                  title={sum.name}
                >
                  {sum.name}
                </th>
              ))}
              {summatives.length > 0 && (
                <th className="py-2.5 px-1 text-center border-l border-slate-800 text-slate-500 font-bold bg-violet-500/5">
                  Rrt
                </th>
              )}

              {/* STS sub-cols */}
              <th className="py-2.5 px-1 text-center border-l border-slate-800 text-amber-300/70">Prak</th>
              <th className="py-2.5 px-1 text-center text-amber-300/70">Tulis</th>
              <th className="py-2.5 px-1 text-center text-amber-500/80 font-bold">Rrt</th>

              {/* SAS sub-cols */}
              <th className="py-2.5 px-1 text-center border-l border-slate-800 text-orange-300/70">Prak</th>
              <th className="py-2.5 px-1 text-center text-orange-300/70">Tulis</th>
              <th className="py-2.5 px-1 text-center text-orange-500/80 font-bold">Rrt</th>
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
              const formativeAvg = calculateFormativeAvg(studentScore, learningTargets)
              const summativeAvg = calculateSummativeAvg(studentScore, summatives)
              const stsAvg = calculateAvgOfTwo(studentScore.sts_practice, studentScore.sts_written)
              const sasAvg = calculateAvgOfTwo(studentScore.sas_practice, studentScore.sas_written)
              const finalRapor = calculateFinalRaporScore(studentScore, learningTargets, summatives)

              const rowBg = rowIdx % 2 === 0 ? '' : 'bg-slate-900/20'
              const isEditing = editingRows?.[student.id]

              return (
                <tr key={student.id} className={`hover:bg-slate-800/30 transition-colors ${rowBg}`}>
                  {/* Nama — sticky */}
                  <td className="py-3 px-3 sticky left-0 z-10 bg-slate-900 border-r border-slate-800 group-hover:bg-slate-800/50">
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
                          onChange={(e) =>
                            handleScoreChange(student.id, 'formative', tp.id, e.target.value)
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs py-1 px-0.5 text-slate-200 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
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
                        onChange={(e) =>
                          handleScoreChange(student.id, 'summative', sum.id, e.target.value)
                        }
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

                  {/* STS Praktek */}
                  <td className="py-2 px-0.5 border-l border-slate-800 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      disabled={!isEditing}
                      value={studentScore.sts_practice ?? ''}
                      onChange={(e) =>
                        handleScoreChange(student.id, 'other', 'sts_practice', e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs py-1 px-0.5 text-slate-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
                    />
                  </td>
                  {/* STS Tulis */}
                  <td className="py-2 px-0.5 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      disabled={!isEditing}
                      value={studentScore.sts_written ?? ''}
                      onChange={(e) =>
                        handleScoreChange(student.id, 'other', 'sts_written', e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs py-1 px-0.5 text-slate-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
                    />
                  </td>
                  {/* STS Rrt */}
                  <td className="py-2 px-1 text-center font-bold text-xs text-amber-400">
                    {stsAvg || 0}
                  </td>

                  {/* SAS Praktek */}
                  <td className="py-2 px-0.5 border-l border-slate-800 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      disabled={!isEditing}
                      value={studentScore.sas_practice ?? ''}
                      onChange={(e) =>
                        handleScoreChange(student.id, 'other', 'sas_practice', e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs py-1 px-0.5 text-slate-200 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
                    />
                  </td>
                  {/* SAS Tulis */}
                  <td className="py-2 px-0.5 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      disabled={!isEditing}
                      value={studentScore.sas_written ?? ''}
                      onChange={(e) =>
                        handleScoreChange(student.id, 'other', 'sas_written', e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded text-center text-xs py-1 px-0.5 text-slate-200 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
                    />
                  </td>
                  {/* SAS Rrt */}
                  <td className="py-2 px-1 text-center font-bold text-xs text-orange-400">
                    {sasAvg || 0}
                  </td>

                  {/* Nilai Rapor */}
                  <td className="py-2 px-1 border-l border-slate-800 text-center font-extrabold text-sm text-emerald-400 bg-emerald-500/5">
                    {finalRapor}
                  </td>

                  {/* Deskripsi Capaian */}
                  <td className="py-2 px-3 border-l border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-wide shrink-0 w-10">Tinggi</span>
                      <textarea
                        rows={1}
                        placeholder={isEditing ? "Capaian kompetensi tertinggi..." : "-"}
                        disabled={!isEditing}
                        value={studentScore.highest_achievement ?? ''}
                        onChange={(e) =>
                          handleScoreChange(student.id, 'other', 'highest_achievement', e.target.value)
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-rose-500/80 uppercase tracking-wide shrink-0 w-10">Rendah</span>
                      <textarea
                        rows={1}
                        placeholder={isEditing ? "Capaian kompetensi terendah..." : "-"}
                        disabled={!isEditing}
                        value={studentScore.lowest_achievement ?? ''}
                        onChange={(e) =>
                          handleScoreChange(student.id, 'other', 'lowest_achievement', e.target.value)
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-y disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
                      />
                    </div>
                  </td>

                  {/* Aksi Simpan / Edit Per Baris */}
                  <td className="py-2 px-2 border-l border-slate-800 text-center sticky right-0 z-10 bg-slate-900 group-hover:bg-slate-800/50">
                    {isEditing ? (
                      <button
                        onClick={() => handleSaveSingleRow(student.id)}
                        disabled={savingRows?.[student.id]}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Simpan Nilai"
                      >
                        {savingRows?.[student.id] ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingRows((prev) => ({ ...prev, [student.id]: true }))}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors cursor-pointer"
                        title="Edit Nilai"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
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
