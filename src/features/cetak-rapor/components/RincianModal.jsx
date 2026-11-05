import { useEffect, useMemo } from 'react'
import { X, Loader2, AlertCircle, Archive, ClipboardCheck, ClipboardX } from 'lucide-react'
import {
  calculateFinalRaporScore,
  getComponentValue,
  getFixedSubs,
  itemsOfComponent,
} from '@/utils/scoreCalculations'
import { predicateForScore } from '@/utils/predicates'
import PredicateBadge from '@/components/ui/PredicateBadge'

const EMPTY_SCORE = {
  scores_formative: {},
  scores_summative: {},
  fixed_scores: {},
  highest_achievement: '',
  lowest_achievement: '',
}

/**
 * Panel Rincian Nilai — tampilan read-only khusus admin.
 * Menampilkan SELURUH input guru per mata pelajaran untuk satu siswa:
 * nilai per TP / item / sub-nilai, rata-rata per komponen, predikat,
 * deskripsi capaian, dan nilai akhir. Bekerja untuk periode aktif & arsip.
 */
export default function RincianModal({
  student,
  period,
  allSubjects = [],
  allScores = [],
  components = [],
  items = [],
  learningTargets = [],
  predicates = [],
  loading = false,
  isError = false,
  onClose,
}) {
  // tutup dengan Escape + kunci scroll body
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const scoresBySubject = useMemo(() => {
    const map = new Map()
    ;(allScores ?? []).forEach((sc) => {
      if (sc.student_id === student.id) map.set(sc.subject_id, sc)
    })
    return map
  }, [allScores, student.id])

  const learningTargetsByItem = useMemo(() => {
    const map = new Map()
    ;(learningTargets ?? []).forEach((tp) => {
      if (!map.has(tp.assessment_item_id)) map.set(tp.assessment_item_id, [])
      map.get(tp.assessment_item_id).push(tp)
    })
    return map
  }, [learningTargets])

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4 print:hidden">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Rincian nilai ${student.name}`}
        className="bg-slate-900 border border-slate-800 w-full max-w-3xl flex flex-col sm:rounded-2xl sm:max-h-[90vh] h-full sm:h-auto overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-100">Rincian Nilai — {student.name}</h3>
              {!period?.is_active && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Archive size={9} /> Arsip
                </span>
              )}
              {(student.status === 'alumni' || student.status === 'lulus') && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {student.status === 'alumni' ? 'Alumni' : 'Lulus'}
                  {student.graduation_year ? ` ${student.graduation_year}` : ''}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              NISN {student.nisn} · Kelas {period?.class_name} · Semester {period?.semester} · TA {period?.academic_year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 text-slate-500 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup rincian"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 gap-2 text-sm">
              <Loader2 size={18} className="animate-spin" /> Memuat rincian nilai...
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span>Gagal memuat komponen periode. Muat ulang halaman.</span>
            </div>
          ) : allSubjects.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-16">
              Belum ada mata pelajaran pada periode ini.
            </p>
          ) : (
            allSubjects.map((subject) => (
              <SubjectSection
                key={subject.id}
                subject={subject}
                score={scoresBySubject.get(subject.id) ?? null}
                components={components}
                items={items}
                learningTargets={learningTargets}
                learningTargetsByItem={learningTargetsByItem}
                predicates={predicates}
                calculationMode={period?.calculation_mode ?? 'equal'}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Satu section per mata pelajaran ───────────────────────────────────────────
function SubjectSection({
  subject,
  score,
  components,
  items,
  learningTargets,
  learningTargetsByItem,
  predicates,
  calculationMode,
}) {
  const subjectItems = useMemo(
    () => items.filter((item) => item.subject_id === subject.id),
    [items, subject.id]
  )
  const subjectItemIds = useMemo(() => new Set(subjectItems.map((item) => item.id)), [subjectItems])
  const subjectTps = useMemo(
    () => learningTargets.filter((tp) => subjectItemIds.has(tp.assessment_item_id)),
    [learningTargets, subjectItemIds]
  )

  const studentScore = score ?? EMPTY_SCORE
  const filledCount = components.filter(
    (component) => getComponentValue(component, subjectItems, subjectTps, studentScore) !== null
  ).length
  const finalScore = score ? calculateFinalRaporScore(studentScore, components, subjectItems, subjectTps, calculationMode) : null
  const finalPredicate = finalScore !== null ? predicateForScore(finalScore, predicates) : null

  return (
    <section className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
      {/* Header mapel */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900/60 border-b border-slate-800">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-100 truncate">{subject.name}</h4>
          <p className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
            {filledCount === components.length && components.length > 0 ? (
              <>
                <ClipboardCheck size={10} className="text-emerald-500" />
                <span className="text-emerald-500/90">Semua {components.length} komponen terisi</span>
              </>
            ) : (
              <>
                <ClipboardX size={10} className="text-amber-500" />
                <span className="text-amber-500/90">{filledCount}/{components.length} komponen terisi</span>
              </>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Nilai Akhir</p>
          <p className="text-2xl font-extrabold leading-none text-emerald-400">
            {finalScore ?? '—'}
          </p>
          {finalPredicate && <PredicateBadge predicate={finalPredicate} predicates={predicates} size="sm" className="mt-1" />}
        </div>
      </div>

      {/* Isi komponen */}
      <div className="px-4 py-3 space-y-3">
        {!score && (
          <p className="text-xs text-slate-500 italic text-center py-2">
            Belum ada nilai tersimpan untuk mapel ini.
          </p>
        )}

        {score &&
          components.map((component) => {
            const value = getComponentValue(component, subjectItems, subjectTps, studentScore)
            const predicate = value !== null ? predicateForScore(value, predicates) : null

            return (
              <div key={component.id}>
                {/* Baris komponen + Rrt */}
                <div className="flex items-center justify-between gap-2 bg-slate-900/80 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {component.name}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      Rrt {value === null ? '—' : value}
                    </span>
                    {predicate && <PredicateBadge predicate={predicate} predicates={predicates} />}
                  </span>
                </div>

                {/* Detail isi komponen */}
                <div className="pl-3 mt-1 space-y-0.5">
                  {component.kind === 'fixed' && <FixedRows component={component} score={studentScore} />}
                  {component.kind === 'countable' && !component.with_tp && (
                    <DirectRows component={component} items={subjectItems} score={studentScore} />
                  )}
                  {component.kind === 'countable' && component.with_tp && (
                    <TpRows
                      component={component}
                      items={subjectItems}
                      score={studentScore}
                      learningTargetsByItem={learningTargetsByItem}
                    />
                  )}
                </div>
              </div>
            )
          })}

        {/* Capaian kompetensi */}
        {score && (studentScore.highest_achievement || studentScore.lowest_achievement) && (
          <div className="border-t border-slate-800/80 pt-3 space-y-2">
            <CapaianBlock label="Capaian Tertinggi" text={studentScore.highest_achievement} tone="emerald" />
            <CapaianBlock label="Capaian Terendah" text={studentScore.lowest_achievement} tone="rose" />
          </div>
        )}
      </div>
    </section>
  )
}

// ── Baris-baris nilai ──────────────────────────────────────────────────────────
function ScoreRow({ label, description, value }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 items-baseline border-b border-slate-800/40 last:border-0 py-1.5 px-1">
      <span className="min-w-0 text-xs text-slate-300">
        {label}
        {description && (
          <span className="block text-[9px] text-slate-500 leading-snug">{description}</span>
        )}
      </span>
      <span className="text-xs font-mono font-semibold text-slate-100 tabular-nums w-10 text-right">
        {value ?? '—'}
      </span>
    </div>
  )
}

function TpRows({ component, items, score, learningTargetsByItem }) {
  const compItems = itemsOfComponent(component.id, items)
  if (compItems.length === 0) {
    return <p className="text-[10px] text-slate-600 italic px-1 py-1">Belum ada item pada komponen ini.</p>
  }
  return compItems.map((item) => (
    <div key={item.id} className="pt-1.5 first:pt-0.5">
      <p className="text-[10px] font-bold text-slate-400 px-1">{item.name}</p>
      {(learningTargetsByItem.get(item.id) ?? []).length === 0 ? (
        <p className="text-[9px] text-slate-600 italic pl-4 py-0.5">Belum ada TP.</p>
      ) : (
        (learningTargetsByItem.get(item.id) ?? []).map((tp) => (
          <div key={tp.id} className="pl-4">
            <ScoreRow
              label={<span className="font-mono text-indigo-400">{tp.code}</span>}
              description={tp.description}
              value={score.scores_formative?.[tp.id]}
            />
          </div>
        ))
      )}
    </div>
  ))
}

function DirectRows({ component, items, score }) {
  const compItems = itemsOfComponent(component.id, items)
  if (compItems.length === 0) {
    return <p className="text-[10px] text-slate-600 italic px-1 py-1">Belum ada item pada komponen ini.</p>
  }
  return compItems.map((item) => (
    <ScoreRow key={item.id} label={item.name} value={score.scores_summative?.[item.id]} />
  ))
}

function FixedRows({ component, score }) {
  const subs = getFixedSubs(component)
  const fixed = score.fixed_scores?.[component.id] ?? {}
  return subs.map((sub) => <ScoreRow key={sub.key} label={sub.label} value={fixed[sub.key]} />)
}

function CapaianBlock({ label, text, tone }) {
  if (!text) return null
  const labelClass = tone === 'emerald' ? 'text-emerald-500/80' : 'text-rose-500/80'
  return (
    <div>
      <p className={`text-[9px] font-bold uppercase tracking-wider ${labelClass}`}>{label}</p>
      <p className="text-xs text-slate-300 leading-relaxed mt-0.5 whitespace-pre-line">{text}</p>
    </div>
  )
}
