import React from 'react'
import {
  calculateFormativeAvg,
  calculateSummativeAvg,
  calculateAvgOfTwo,
  calculateFinalRaporScore,
} from '../../utils/scoreCalculations'

/**
 * Komponen tabel spreadsheet untuk input nilai siswa.
 * Menampilkan kolom formatif (per TP), sumatif, STS, SAS, dan deskripsi capaian.
 */
export default function ScoreGrid({
  students,
  materials,
  learningTargets,
  summatives,
  scores,
  handleScoreChange,
}) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[1500px]">
          <thead>
            <tr className="bg-slate-950 text-slate-450 text-[10px] uppercase font-bold tracking-widest text-center border-b border-slate-800/80">
              <th className="py-2.5 px-4 text-left font-medium text-slate-500" rowSpan={2} style={{ width: '250px' }}>Informasi Siswa</th>
              {materials.map((mat) => {
                const tpsInMat = learningTargets.filter((tp) => tp.material_id === mat.id)
                if (tpsInMat.length === 0) return null
                return (
                  <th key={mat.id} className="py-2.5 px-2 border-l border-slate-850 bg-indigo-500/5 text-indigo-300" colSpan={tpsInMat.length}>
                    {mat.name}
                  </th>
                )
              })}
              {learningTargets.length > 0 && (
                <th className="py-2.5 px-2 border-l border-slate-850 text-slate-500" rowSpan={2}>Rrt<br />Form</th>
              )}
              {summatives.length > 0 && (
                <th className="py-2.5 px-2 border-l border-slate-850" colSpan={summatives.length + 1}>
                  Sumatif Lingkup Materi
                </th>
              )}
              <th className="py-2.5 px-2 border-l border-slate-850" colSpan={3}>Sumatif Tengah Semester</th>
              <th className="py-2.5 px-2 border-l border-slate-850" colSpan={3}>Sumatif Akhir Semester</th>
              <th className="py-2.5 px-2 border-l border-slate-850" rowSpan={2} style={{ width: '80px' }}>Rapor</th>
              <th className="py-2.5 px-2 border-l border-slate-850 text-left font-medium text-slate-500" rowSpan={2} style={{ width: '450px' }}>Deskripsi Capaian</th>
            </tr>

            <tr className="bg-slate-900 text-slate-400 text-xs font-semibold border-b border-slate-800">
              {materials.map((mat) => {
                const tpsInMat = learningTargets.filter((tp) => tp.material_id === mat.id)
                return tpsInMat.map((tp, idx) => (
                  <th key={tp.id} className={`py-3 px-1.5 text-center font-mono text-[10px] truncate ${idx === 0 ? 'border-l border-slate-850' : ''}`} title={`${mat.name}: ${tp.description}`}>
                    {tp.code}
                  </th>
                ))
              })}
              {summatives.map((sum, idx) => (
                <th key={sum.id} className={`py-3 px-1.5 text-center text-[10px] truncate ${idx === 0 ? 'border-l border-slate-850' : ''}`} title={sum.name}>
                  {sum.name}
                </th>
              ))}
              {summatives.length > 0 && (
                <th className="py-3 px-1.5 text-center border-l border-slate-850 text-slate-500 text-[10px] font-bold uppercase">Rrt</th>
              )}
              <th className="py-3 px-1 text-center border-l border-slate-850 text-[10px]">Prak</th>
              <th className="py-3 px-1 text-center text-[10px]">Tulis</th>
              <th className="py-3 px-1 text-center text-slate-500 text-[10px] font-bold">Rrt</th>
              <th className="py-3 px-1 text-center border-l border-slate-850 text-[10px]">Prak</th>
              <th className="py-3 px-1 text-center text-[10px]">Tulis</th>
              <th className="py-3 px-1 text-center text-slate-500 text-[10px] font-bold">Rrt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
            {students.map((student) => {
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
              const formativeAvg = calculateFormativeAvg(studentScore)
              const summativeAvg = calculateSummativeAvg(studentScore)
              const stsAvg = calculateAvgOfTwo(studentScore.sts_practice, studentScore.sts_written)
              const sasAvg = calculateAvgOfTwo(studentScore.sas_practice, studentScore.sas_written)
              const finalRapor = calculateFinalRaporScore(studentScore)

              return (
                <tr key={student.id} className="hover:bg-slate-900/20 transition-all">
                  <td className="py-3.5 px-4 truncate">
                    <p className="font-semibold text-slate-200 leading-tight">{student.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{student.nisn}</p>
                  </td>

                  {materials.map((mat) => {
                    const tpsInMat = learningTargets.filter((tp) => tp.material_id === mat.id)
                    return tpsInMat.map((tp, idx) => (
                      <td key={tp.id} className={`py-3.5 px-1 text-center ${idx === 0 ? 'border-l border-slate-850' : ''}`}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={studentScore.scores_formative?.[tp.id] ?? ''}
                          onChange={(e) =>
                            handleScoreChange(student.id, 'formative', tp.id, e.target.value)
                          }
                          className="w-11 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                    ))
                  })}
                  {learningTargets.length > 0 && (
                    <td className="py-3.5 px-1 border-l border-slate-850 text-center font-bold text-xs text-indigo-400">
                      {formativeAvg}
                    </td>
                  )}

                  {summatives.map((sum) => (
                    <td key={sum.id} className="py-3.5 px-1 border-l border-slate-850 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={studentScore.scores_summative?.[sum.id] ?? ''}
                        onChange={(e) =>
                          handleScoreChange(student.id, 'summative', sum.id, e.target.value)
                        }
                        className="w-11 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                  ))}
                  {summatives.length > 0 && (
                    <td className="py-3.5 px-1 border-l border-slate-850 text-center font-bold text-xs text-indigo-400">
                      {summativeAvg}
                    </td>
                  )}

                  <td className="py-3.5 px-1 border-l border-slate-850 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={studentScore.sts_practice ?? ''}
                      onChange={(e) =>
                        handleScoreChange(student.id, 'other', 'sts_practice', e.target.value)
                      }
                      className="w-10 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-3.5 px-1 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={studentScore.sts_written ?? ''}
                      onChange={(e) =>
                        handleScoreChange(student.id, 'other', 'sts_written', e.target.value)
                      }
                      className="w-10 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-3.5 px-1 text-center font-bold text-xs text-amber-500">
                    {stsAvg || 0}
                  </td>

                  <td className="py-3.5 px-1 border-l border-slate-850 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={studentScore.sas_practice ?? ''}
                      onChange={(e) =>
                        handleScoreChange(student.id, 'other', 'sas_practice', e.target.value)
                      }
                      className="w-10 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-3.5 px-1 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={studentScore.sas_written ?? ''}
                      onChange={(e) =>
                        handleScoreChange(student.id, 'other', 'sas_written', e.target.value)
                      }
                      className="w-10 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-3.5 px-1 text-center font-bold text-xs text-amber-500">
                    {sasAvg || 0}
                  </td>

                  <td className="py-3.5 px-1 border-l border-slate-850 text-center font-extrabold text-sm text-emerald-400 bg-emerald-500/5">
                    {finalRapor}
                  </td>

                  <td className="py-3.5 px-4 border-l border-slate-850 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-wide shrink-0">Tinggi</span>
                      <textarea
                        rows="1"
                        placeholder="Capaian kompetensi tertinggi..."
                        value={studentScore.highest_achievement ?? ''}
                        onChange={(e) =>
                          handleScoreChange(student.id, 'other', 'highest_achievement', e.target.value)
                        }
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg p-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-rose-500/80 uppercase tracking-wide shrink-0">Rendah</span>
                      <textarea
                        rows="1"
                        placeholder="Capaian kompetensi terendah..."
                        value={studentScore.lowest_achievement ?? ''}
                        onChange={(e) =>
                          handleScoreChange(student.id, 'other', 'lowest_achievement', e.target.value)
                        }
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg p-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
