import React, { useMemo, useCallback, useRef } from 'react'
import { Check, Loader2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  calculateFinalRaporScore,
  getComponentValue,
  getFixedSubs,
  itemsOfComponent,
} from '@/utils/scoreCalculations'
import { predicateForScore } from '@/utils/predicates'
import PredicateBadge from '@/components/ui/PredicateBadge'
import useMediaQuery from '@/hooks/useMediaQuery'
import DescriptionTextarea from './DescriptionTextarea'

const selectOnFocus = (e) => e.target.select()

const COL_WIDTHS = {
  student: 200,
  tp: 65,
  item: 88,
  fixed: 65,
  avg: 55,
  rapor: 70,
  description: 340,
  action: 50,
}

const TONES = [
  { text: 'text-indigo-400', soft: 'bg-indigo-500/5', head: 'bg-indigo-500/8 text-indigo-300', ring: 'focus:border-indigo-400 focus:ring-indigo-400/50' },
  { text: 'text-violet-400', soft: 'bg-violet-500/5', head: 'bg-violet-500/8 text-violet-300', ring: 'focus:border-violet-400 focus:ring-violet-400/50' },
  { text: 'text-amber-400', soft: 'bg-amber-500/5', head: 'bg-amber-500/8 text-amber-300', ring: 'focus:border-amber-400 focus:ring-amber-400/50' },
  { text: 'text-orange-400', soft: 'bg-orange-500/5', head: 'bg-orange-500/8 text-orange-300', ring: 'focus:border-orange-400 focus:ring-orange-400/50' },
  { text: 'text-sky-400', soft: 'bg-sky-500/5', head: 'bg-sky-500/8 text-sky-300', ring: 'focus:border-sky-400 focus:ring-sky-400/50' },
  { text: 'text-rose-400', soft: 'bg-rose-500/5', head: 'bg-rose-500/8 text-rose-300', ring: 'focus:border-rose-400 focus:ring-rose-400/50' },
]

const toneFor = (index) => TONES[index % TONES.length]

/**
 * Bangun "rencana kolom" dari komponen snapshot periode.
 * Komponen countable kosong (belum ada item/TP) TIDAK dirender.
 */
function buildPlan(components, items, learningTargets) {
  const sections = []
  ;(components ?? []).forEach((component, index) => {
    const tone = toneFor(index)

    if (component.kind === 'fixed') {
      const subs = getFixedSubs(component)
      sections.push({ component, type: 'fixed', subs, tone })
      return
    }

    const compItems = itemsOfComponent(component.id, items)

    if (component.with_tp) {
      const cells = []
      compItems.forEach((item) => {
        learningTargets
          .filter((tp) => tp.assessment_item_id === item.id)
          .forEach((tp) => cells.push({ tp, item }))
      })
      if (cells.length === 0) return
      sections.push({ component, type: 'tp', items: compItems, cells, tone })
      return
    }

    if (compItems.length === 0) return
    sections.push({ component, type: 'direct', items: compItems, tone })
  })
  return sections
}

const sectionInputCount = (section) =>
  section.type === 'fixed' ? section.subs.length : section.type === 'tp' ? section.cells.length : section.items.length

const sectionColumnCount = (section) => sectionInputCount(section) + 1 // + kolom Rrt

const sectionWidth = (section) => {
  const col = section.type === 'direct' ? COL_WIDTHS.item : section.type === 'tp' ? COL_WIDTHS.tp : COL_WIDTHS.fixed
  return sectionInputCount(section) * col + COL_WIDTHS.avg
}

export default function ScoreGrid({
  students,
  components,
  items,
  learningTargets,
  calculationMode,
  predicates,
  predicatePlacement,
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

  const plan = useMemo(
    () => buildPlan(components, items, learningTargets),
    [components, items, learningTargets]
  )

  const totalInputCols = useMemo(
    () => plan.reduce((sum, section) => sum + sectionInputCount(section), 0),
    [plan]
  )

  const totalWidth = useMemo(() => {
    let w = studentColWidth
    plan.forEach((section) => {
      w += sectionWidth(section)
    })
    w += COL_WIDTHS.rapor + COL_WIDTHS.description + COL_WIDTHS.action
    return w
  }, [plan, studentColWidth])

  const totalCols = useMemo(
    () => 1 + plan.reduce((sum, section) => sum + sectionColumnCount(section), 0) + 1 + 1 + 1,
    [plan]
  )

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex-wrap">
        <span className="text-[11px] text-slate-500 font-medium">{students.length} siswa</span>
        {plan.map((section) => (
          <React.Fragment key={section.component.id}>
            <span className="text-slate-700">•</span>
            <span className={`text-[11px] font-medium ${section.tone.text}`}>
              {section.type === 'tp'
                ? `${section.cells.length} kolom ${section.component.name} (TP)`
                : section.type === 'direct'
                  ? `${section.items.length} kolom ${section.component.name}`
                  : `${section.subs.length} kolom ${section.component.name}`}
            </span>
          </React.Fragment>
        ))}
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

      {totalInputCols === 0 && (
        <div className="px-4 py-6 text-center text-xs text-amber-500/90 border-b border-slate-800 bg-amber-500/5">
          Belum ada item penilaian untuk komponen countable. Klik <b>Atur Komponen Penilaian</b> di atas untuk menambah (mis. Bab 1, Bab 2…).
        </div>
      )}

      <div ref={scrollRef} className="overflow-auto overscroll-x-contain md:max-h-[65vh] custom-scrollbar">
        <table
          className="text-left border-collapse"
          style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
        >
          <colgroup>
            <col style={{ width: `${studentColWidth}px`, minWidth: `${studentColWidth}px` }} />
            {plan.map((section) => {
              const col = section.type === 'direct' ? COL_WIDTHS.item : section.type === 'tp' ? COL_WIDTHS.tp : COL_WIDTHS.fixed
              return [
                ...Array.from({ length: sectionInputCount(section) }).map((_, index) => (
                  <col
                    key={`${section.component.id}-col-${index}`}
                    style={{ width: `${col}px` }}
                  />
                )),
                <col key={`${section.component.id}-avg`} style={{ width: `${COL_WIDTHS.avg}px` }} />,
              ]
            })}
            <col style={{ width: `${COL_WIDTHS.rapor}px` }} />
            <col style={{ width: `${COL_WIDTHS.description}px`, minWidth: `${COL_WIDTHS.description}px` }} />
            <col style={{ width: `${COL_WIDTHS.action}px` }} />
          </colgroup>

          <thead className="md:sticky md:top-0 z-30 shadow-md">
            {/* Baris header 1: nama komponen */}
            <tr className="bg-slate-950 text-[10px] uppercase font-bold tracking-widest text-center border-b border-slate-800/80">
              <th
                className="py-2.5 px-3 text-left font-medium text-slate-500 sticky left-0 z-40 bg-slate-950 border-r border-slate-800"
                rowSpan={2}
              >
                Informasi Siswa
              </th>

              {plan.map((section) => (
                <th
                  key={section.component.id}
                  className={`py-2 px-2 border-l border-slate-800 leading-tight whitespace-normal wrap-break-word align-middle ${section.tone.head}`}
                  colSpan={sectionColumnCount(section)}
                  title={section.component.name}
                >
                  <span className="block whitespace-normal wrap-break-word leading-tight">
                    {section.component.name}
                  </span>
                </th>
              ))}

              <th className="py-2 px-1 border-l border-slate-800 bg-emerald-500/8 text-emerald-300" rowSpan={2}>Rapor</th>
              <th className="py-2 px-3 border-l border-slate-800 text-left font-medium text-slate-500" rowSpan={2}>Deskripsi Capaian</th>
              <th className="py-2 px-1 border-l border-slate-800 text-center font-medium text-slate-500 sticky right-0 z-40 bg-slate-950" rowSpan={2}>Aksi</th>
            </tr>

            {/* Baris header 2: label kolom */}
            <tr className="bg-slate-900 text-slate-400 text-[10px] font-semibold border-b border-slate-800">
              {plan.map((section) => (
                <React.Fragment key={`${section.component.id}-labels`}>
                  {section.type === 'tp' &&
                    section.cells.map(({ tp, item }, idx) => (
                      <th
                        key={tp.id}
                        className={`py-2.5 px-1 text-center font-mono truncate ${section.tone.soft} ${
                          idx === 0 ? 'border-l border-slate-800' : ''
                        }`}
                        title={`${item.name}: ${tp.description}`}
                      >
                        {tp.code}
                      </th>
                    ))}
                  {section.type === 'direct' &&
                    section.items.map((item, idx) => (
                      <th
                        key={item.id}
                        className={`py-2 px-1 text-center whitespace-normal wrap-break-word leading-tight bg-slate-900 ${
                          idx === 0 ? 'border-l border-slate-800' : ''
                        }`}
                        title={item.name}
                      >
                        {item.name}
                      </th>
                    ))}
                  {section.type === 'fixed' &&
                    section.subs.map((sub, idx) => (
                      <th
                        key={sub.key}
                        className={`py-2.5 px-1 text-center bg-slate-900 ${idx === 0 ? 'border-l border-slate-800' : ''}`}
                        title={sub.label}
                      >
                        {sub.label}
                      </th>
                    ))}
                  <th className={`py-2.5 px-1 text-center border-l border-slate-800 text-slate-500 font-bold ${section.tone.soft}`}>
                    Rrt
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
            {students.map((student, rowIdx) => {
              const studentScore = scores[student.id] || {
                scores_formative: {},
                scores_summative: {},
                fixed_scores: {},
                highest_achievement: '',
                lowest_achievement: '',
              }

              return (
                <ScoreRow
                  key={student.id}
                  student={student}
                  studentScore={studentScore}
                  plan={plan}
                  components={components}
                  items={items}
                  learningTargets={learningTargets}
                  calculationMode={calculationMode}
                  isEditing={!!editingRows?.[student.id]}
                  isSaving={!!savingRows?.[student.id]}
                  handleScoreChange={handleScoreChange}
                  handleSaveSingleRow={handleSaveSingleRow}
                  handleEditRow={handleEditRow}
                  rowIdx={rowIdx}
                  predicates={predicates}
                  predicatePlacement={predicatePlacement}
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
            Scroll ke kanan untuk kolom lainnya &amp; Deskripsi →
          </span>
        </div>
      )}
    </div>
  )
}

// ─── ScoreRow ─────────────────────────────────────────────────────────────────
const ScoreRow = React.memo(function ScoreRow({
  student,
  studentScore,
  plan,
  components,
  items,
  learningTargets,
  calculationMode,
  isEditing,
  isSaving,
  handleScoreChange,
  handleSaveSingleRow,
  handleEditRow,
  rowIdx,
  predicates,
  predicatePlacement,
}) {
  const finalRapor = calculateFinalRaporScore(studentScore, components, items, learningTargets, calculationMode)
  const rowBg = rowIdx % 2 === 0 ? '' : 'bg-slate-900/20'

  const showInputBadges = Boolean(predicatePlacement?.show_on_inputs)
  const showAverageBadges = Boolean(predicatePlacement?.show_on_component_averages)
  const showFinalBadge = Boolean(predicatePlacement?.show_on_final)

  const anyFilled = (components ?? []).some(
    (component) => getComponentValue(component, items, learningTargets, studentScore) !== null
  )

  /** Badge predikat untuk sebuah nilai (input / rata-rata / final). */
  const badgeFor = (value, { enabled = true, size = 'xs', className = '' } = {}) => {
    if (!enabled) return null
    const predicate = predicateForScore(value, predicates ?? [])
    if (!predicate) return null
    return <PredicateBadge predicate={predicate} predicates={predicates ?? []} size={size} className={className} />
  }

  const autoResize = useCallback((e) => {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }, [])

  const numberInputClass =
    'w-full min-w-0 bg-slate-950 border border-slate-800 rounded text-center text-xs h-9 md:h-8 py-0 px-0.5 text-slate-200 focus:outline-none focus:ring-1 transition-colors disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default'

  return (
    <tr className={`hover:bg-slate-800/30 transition-colors ${rowBg}`}>
      {/* Nama — sticky */}
      <td className="py-3 px-3 sticky left-0 z-10 bg-slate-900 border-r border-slate-800 shadow-[4px_0_8px_-6px_rgba(15,23,42,0.35)]">
        <p className="font-semibold text-slate-200 leading-tight text-xs line-clamp-2" title={student.name}>
          {student.name}
        </p>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5 hidden sm:block">{student.nisn}</p>
      </td>

      {/* Kolom dinamis per komponen */}
      {plan.map((section) => (
        <React.Fragment key={section.component.id}>
          {section.type === 'tp' &&
            section.cells.map(({ tp, item }, idx) => {
              const value = studentScore.scores_formative?.[tp.id] ?? ''
              return (
                <td
                  key={tp.id}
                  className={`py-2 px-0.5 text-center ${section.tone.soft} ${idx === 0 ? 'border-l border-slate-800' : ''}`}
                >
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    disabled={!isEditing}
                    onFocus={selectOnFocus}
                    value={value}
                    onChange={(e) => handleScoreChange(student.id, 'formative', tp.id, e.target.value)}
                    className={`${numberInputClass} ${section.tone.ring}`}
                    title={`${item.name} — ${tp.code}: ${tp.description}`}
                  />
                  {badgeFor(value, { enabled: showInputBadges, className: 'mt-0.5' })}
                </td>
              )
            })}

          {section.type === 'direct' &&
            section.items.map((item, idx) => {
              const value = studentScore.scores_summative?.[item.id] ?? ''
              return (
                <td
                  key={item.id}
                  className={`py-2 px-0.5 text-center bg-slate-900/40 ${idx === 0 ? 'border-l border-slate-800' : ''}`}
                >
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    disabled={!isEditing}
                    onFocus={selectOnFocus}
                    value={value}
                    onChange={(e) => handleScoreChange(student.id, 'summative', item.id, e.target.value)}
                    className={`${numberInputClass} ${section.tone.ring}`}
                    title={`${section.component.name} — ${item.name}`}
                  />
                  {badgeFor(value, { enabled: showInputBadges, className: 'mt-0.5' })}
                </td>
              )
            })}

          {section.type === 'fixed' &&
            section.subs.map((sub, idx) => {
              const value = studentScore.fixed_scores?.[section.component.id]?.[sub.key] ?? ''
              return (
                <td
                  key={sub.key}
                  className={`py-2 px-0.5 text-center bg-slate-900/40 ${idx === 0 ? 'border-l border-slate-800' : ''}`}
                >
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    disabled={!isEditing}
                    onFocus={selectOnFocus}
                    value={value}
                    onChange={(e) => handleScoreChange(student.id, 'fixed', `${section.component.id}:${sub.key}`, e.target.value)}
                    className={`${numberInputClass} ${section.tone.ring}`}
                    title={`${section.component.name} — ${sub.label}`}
                  />
                  {badgeFor(value, { enabled: showInputBadges, className: 'mt-0.5' })}
                </td>
              )
            })}

          {/* Rata-rata komponen */}
          {(() => {
            const value = getComponentValue(section.component, items, learningTargets, studentScore)
            return (
              <td
                className={`py-2 px-1 border-l border-slate-800 text-center font-bold text-xs ${section.tone.text} ${section.tone.soft}`}
              >
                <span className="block">{value === null ? '—' : value}</span>
                {badgeFor(value, { enabled: showAverageBadges && value !== null, className: 'mt-0.5' })}
              </td>
            )
          })()}
        </React.Fragment>
      ))}

      {/* Nilai Rapor */}
      <td className="py-2 px-1 border-l border-slate-800 text-center font-extrabold text-sm text-emerald-400 bg-emerald-500/5">
        <span className="block">{finalRapor}</span>
        {badgeFor(finalRapor, { enabled: showFinalBadge && anyFilled, size: 'sm', className: 'mt-0.5' })}
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
  return (
    prevProps.studentScore === nextProps.studentScore &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.isSaving === nextProps.isSaving &&
    prevProps.plan === nextProps.plan &&
    prevProps.components === nextProps.components &&
    prevProps.items === nextProps.items &&
    prevProps.learningTargets === nextProps.learningTargets &&
    prevProps.calculationMode === nextProps.calculationMode &&
    prevProps.predicates === nextProps.predicates &&
    prevProps.predicatePlacement === nextProps.predicatePlacement
  )
})
