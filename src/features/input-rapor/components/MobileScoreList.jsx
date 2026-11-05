import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Pencil, Search } from 'lucide-react'
import Swal from 'sweetalert2'
import {
  calculateFormativeAvg,
  calculateSummativeAvg,
  calculateAvgOfTwo,
  calculateFinalRaporScore,
} from '@/utils/scoreCalculations'
import DescriptionTextarea from './DescriptionTextarea'

const EMPTY_SCORE = {
  scores_formative: {},
  scores_summative: {},
  sts_practice: '',
  sts_written: '',
  sas_practice: '',
  sas_written: '',
  highest_achievement: '',
  lowest_achievement: '',
}

const getScore = (scores, studentId) => scores[studentId] || EMPTY_SCORE

const cloneScore = (score) => ({
  ...EMPTY_SCORE,
  ...(score || {}),
  scores_formative: { ...(score?.scores_formative || {}) },
  scores_summative: { ...(score?.scores_summative || {}) },
})

const countFilled = (values, ids) =>
  ids.reduce((count, id) => {
    const value = values?.[id]
    return value !== '' && value !== null && value !== undefined ? count + 1 : count
  }, 0)

const isFilled = (value) => value !== '' && value !== null && value !== undefined

const hasAnyScore = (score, learningTargets, summatives) =>
  learningTargets.some((tp) => isFilled(score.scores_formative?.[tp.id])) ||
  summatives.some((summative) => isFilled(score.scores_summative?.[summative.id])) ||
  isFilled(score.sts_practice) ||
  isFilled(score.sts_written) ||
  isFilled(score.sas_practice) ||
  isFilled(score.sas_written)

const selectOnFocus = (event) => event.target.select()

const SWAL_DARK = { background: '#0f172a', color: '#f8fafc' }

/**
 * Tampilan input nilai untuk layar kecil.
 *
 * Alih-alih memaksa tabel 14+ kolom ke layar 360px, siswa ditampilkan sebagai
 * kartu ringkas. Tap "Edit Nilai" membuka sheet layar penuh dengan field
 * tersusun vertikal sehingga input lebih besar dan tidak perlu scroll ke samping.
 */
export default function MobileScoreList({
  students,
  materials,
  learningTargets,
  summatives,
  scores,
  handleScoreChange,
  handleSaveSingleRow,
  handleEditRow,
  restoreStudentScore,
  savingRows,
  editingRows,
}) {
  const [search, setSearch] = useState('')
  const [activeStudentId, setActiveStudentId] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [openingId, setOpeningId] = useState(null)
  const scoresRef = useRef(scores)

  useEffect(() => {
    scoresRef.current = scores
  }, [scores])

  const activeStudent = useMemo(
    () => students.find((student) => student.id === activeStudentId) || null,
    [students, activeStudentId],
  )

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return students
    return students.filter((student) => {
      const name = (student.name || '').toLowerCase()
      const nisn = (student.nisn || '').toLowerCase()
      return name.includes(keyword) || nisn.includes(keyword)
    })
  }, [students, search])

  const openEditor = useCallback(
    async (student) => {
      setSnapshot(cloneScore(scoresRef.current[student.id]))
      setDirty(false)
      setActiveStudentId(student.id)
      setOpeningId(student.id)
      try {
        await handleEditRow(student.id)
      } finally {
        setOpeningId(null)
      }
    },
    [handleEditRow],
  )

  const requestClose = useCallback(async () => {
    if (!activeStudentId) return

    if (dirty) {
      const result = await Swal.fire({
        title: 'Tutup tanpa menyimpan?',
        text: 'Perubahan nilai yang belum disimpan akan dibatalkan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#e11d48',
        confirmButtonText: 'Ya, tutup',
        cancelButtonText: 'Lanjut mengisi',
        ...SWAL_DARK,
      })
      if (!result.isConfirmed) return
    }

    restoreStudentScore(activeStudentId, snapshot)
    setActiveStudentId(null)
    setSnapshot(null)
    setDirty(false)
  }, [activeStudentId, dirty, snapshot, restoreStudentScore])

  const handleSave = useCallback(async () => {
    if (!activeStudentId) return
    const success = await handleSaveSingleRow(activeStudentId)
    if (success) {
      setActiveStudentId(null)
      setSnapshot(null)
      setDirty(false)
    }
  }, [activeStudentId, handleSaveSingleRow])

  const markDirty = useCallback(() => setDirty(true), [])

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau NISN..."
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <span className="shrink-0 text-[11px] font-medium text-slate-500">
            {filteredStudents.length} siswa
          </span>
        </div>

        {filteredStudents.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-500">
            {students.length === 0
              ? 'Belum ada siswa pada kelas/periode ini.'
              : 'Tidak ada siswa yang cocok dengan pencarian.'}
          </div>
        )}

        <div className="space-y-2.5">
          {filteredStudents.map((student) => (
            <StudentScoreCard
              key={student.id}
              student={student}
              score={getScore(scores, student.id)}
              learningTargets={learningTargets}
              summatives={summatives}
              isOpening={openingId === student.id}
              onEdit={openEditor}
            />
          ))}
        </div>
      </div>

      {activeStudent && (
        <MobileScoreSheet
          key={activeStudent.id}
          student={activeStudent}
          score={getScore(scores, activeStudent.id)}
          materials={materials}
          learningTargets={learningTargets}
          summatives={summatives}
          isSaving={!!savingRows?.[activeStudent.id]}
          isEditing={!!editingRows?.[activeStudent.id]}
          onDirty={markDirty}
          onChange={handleScoreChange}
          onClose={requestClose}
          onSave={handleSave}
        />
      )}
    </>
  )
}

const StudentScoreCard = React.memo(function StudentScoreCard({
  student,
  score,
  learningTargets,
  summatives,
  isOpening,
  onEdit,
}) {
  const finalRapor = calculateFinalRaporScore(score, learningTargets, summatives)
  const formativeAvg = calculateFormativeAvg(score, learningTargets)
  const summativeAvg = calculateSummativeAvg(score, summatives)
  const stsAvg = calculateAvgOfTwo(score.sts_practice, score.sts_written)
  const sasAvg = calculateAvgOfTwo(score.sas_practice, score.sas_written)

  const tpIds = learningTargets.map((tp) => tp.id)
  const filledFormatif = countFilled(score.scores_formative, tpIds)
  const filledSummative = countFilled(
    score.scores_summative,
    summatives.map((summative) => summative.id),
  )
  const hasSts = isFilled(score.sts_practice) || isFilled(score.sts_written)
  const hasSas = isFilled(score.sas_practice) || isFilled(score.sas_written)
  const hasScore = hasAnyScore(score, learningTargets, summatives)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{student.name}</p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-500">{student.nisn}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Rapor</p>
          <p
            className={`text-xl font-extrabold leading-none ${
              hasScore ? 'text-emerald-500' : 'text-slate-400'
            }`}
          >
            {hasScore ? finalRapor : '—'}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {learningTargets.length > 0 && (
          <>
            <span>
              Formatif{' '}
              <b className="text-indigo-500">
                {filledFormatif}/{learningTargets.length}
              </b>
            </span>
            <span>
              Rrt Form{' '}
              <b className="text-indigo-500">{filledFormatif > 0 ? formativeAvg : '—'}</b>
            </span>
          </>
        )}
        {summatives.length > 0 && (
          <span>
            Rrt Sum{' '}
            <b className="text-violet-500">{filledSummative > 0 ? summativeAvg : '—'}</b>
          </span>
        )}
        <span>
          STS <b className="text-amber-500">{hasSts ? stsAvg : '—'}</b>
        </span>
        <span>
          SAS <b className="text-orange-500">{hasSas ? sasAvg : '—'}</b>
        </span>
        {!hasScore && (
          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 font-semibold text-amber-600">
            Belum dinilai
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onEdit(student)}
        disabled={isOpening}
        className="mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 text-xs font-bold text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
      >
        {isOpening ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
        {isOpening ? 'Memuat nilai...' : 'Edit Nilai'}
      </button>
    </div>
  )
})

function MobileScoreSheet({
  student,
  score,
  materials,
  learningTargets,
  summatives,
  isSaving,
  isEditing,
  onDirty,
  onChange,
  onClose,
  onSave,
}) {
  const finalRapor = calculateFinalRaporScore(score, learningTargets, summatives)
  const formativeAvg = calculateFormativeAvg(score, learningTargets)
  const summativeAvg = calculateSummativeAvg(score, summatives)
  const stsAvg = calculateAvgOfTwo(score.sts_practice, score.sts_written)
  const sasAvg = calculateAvgOfTwo(score.sas_practice, score.sas_written)
  const hasScore = hasAnyScore(score, learningTargets, summatives)

  const tpsByMaterialId = useMemo(() => {
    const grouped = new Map()
    learningTargets.forEach((tp) => {
      const existing = grouped.get(tp.material_id)
      if (existing) existing.push(tp)
      else grouped.set(tp.material_id, [tp])
    })
    return grouped
  }, [learningTargets])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const change = useCallback(
    (type, field, value) => {
      onDirty()
      onChange(student.id, type, field, value)
    },
    [onDirty, onChange, student.id],
  )

  const autoResize = useCallback((event) => {
    event.target.style.height = 'auto'
    event.target.style.height = `${event.target.scrollHeight}px`
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-slate-950">
      <header
        className="flex shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2.5"
        style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
          aria-label="Tutup editor nilai"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">{student.name}</p>
          <p className="font-mono text-[10px] text-slate-500">{student.nisn}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-emerald-500/10 px-2.5 py-1 text-right">
          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Rapor</p>
          <p className="text-base font-extrabold leading-none text-emerald-500">
            {hasScore ? finalRapor : '—'}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        <fieldset
          disabled={!isEditing}
          className="m-0 mx-auto min-w-0 max-w-lg space-y-3 border-0 p-0"
        >
          {learningTargets.length === 0 && summatives.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900 px-3 py-3 text-center text-xs text-slate-500">
              Belum ada Lingkup Materi/TP atau Sumatif. Atur dulu lewat tombol
              &quot;Atur Lingkup Materi &amp; TP&quot; / &quot;Atur Sumatif&quot;.
            </p>
          )}

          <Section title="Formatif (TP)" badge={`Rrt ${formativeAvg}`} tone="text-indigo-500">
            {learningTargets.length === 0 ? (
              <EmptyHint text="Belum ada TP." />
            ) : (
              materials.map((material) => {
                const tps = tpsByMaterialId.get(material.id) ?? []
                if (tps.length === 0) return null
                return (
                  <div key={material.id} className="mb-3 last:mb-0">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {material.name}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {tps.map((tp) => (
                        <NumberField
                          key={tp.id}
                          label={tp.code}
                          description={tp.description}
                          value={score.scores_formative?.[tp.id]}
                          accent="text-indigo-500 focus:border-indigo-400 focus:ring-indigo-400/50"
                          onChange={(value) => change('formative', tp.id, value)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </Section>

          {summatives.length > 0 && (
            <Section
              title="Sumatif Lingkup Materi"
              badge={`Rrt ${summativeAvg}`}
              tone="text-violet-500"
            >
              <div className="grid grid-cols-2 gap-2">
                {summatives.map((summative) => (
                  <NumberField
                    key={summative.id}
                    label={summative.name}
                    value={score.scores_summative?.[summative.id]}
                    accent="text-violet-500 focus:border-violet-400 focus:ring-violet-400/50"
                    onChange={(value) => change('summative', summative.id, value)}
                  />
                ))}
              </div>
            </Section>
          )}

          <Section title="Sumatif Tengah Semester" badge={`Rrt ${stsAvg}`} tone="text-amber-500">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Praktek"
                value={score.sts_practice}
                accent="text-amber-500 focus:border-amber-400 focus:ring-amber-400/50"
                onChange={(value) => change('other', 'sts_practice', value)}
              />
              <NumberField
                label="Tulis"
                value={score.sts_written}
                accent="text-amber-500 focus:border-amber-400 focus:ring-amber-400/50"
                onChange={(value) => change('other', 'sts_written', value)}
              />
            </div>
          </Section>

          <Section title="Sumatif Akhir Semester" badge={`Rrt ${sasAvg}`} tone="text-orange-500">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Praktek"
                value={score.sas_practice}
                accent="text-orange-500 focus:border-orange-400 focus:ring-orange-400/50"
                onChange={(value) => change('other', 'sas_practice', value)}
              />
              <NumberField
                label="Tulis"
                value={score.sas_written}
                accent="text-orange-500 focus:border-orange-400 focus:ring-orange-400/50"
                onChange={(value) => change('other', 'sas_written', value)}
              />
            </div>
          </Section>

          <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Nilai Rapor
              </p>
              <p className="text-[10px] text-slate-500">
                Rata-rata formatif, sumatif, STS, dan SAS
              </p>
            </div>
            <p className="text-3xl font-extrabold leading-none text-emerald-500">{finalRapor}</p>
          </div>

          <Section title="Deskripsi Capaian" tone="text-slate-500">
            <div className="space-y-2.5">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Capaian Tertinggi
                </p>
                <DescriptionTextarea
                  rows={3}
                  value={score.highest_achievement ?? ''}
                  placeholder="Tulis capaian kompetensi tertinggi..."
                  field="highest_achievement"
                  studentId={student.id}
                  handleScoreChange={change}
                  autoResize={autoResize}
                  colorClass="focus:border-emerald-500 focus:ring-emerald-500"
                  className="min-h-[84px]"
                />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Capaian Terendah
                </p>
                <DescriptionTextarea
                  rows={3}
                  value={score.lowest_achievement ?? ''}
                  placeholder="Tulis capaian kompetensi terendah..."
                  field="lowest_achievement"
                  studentId={student.id}
                  handleScoreChange={change}
                  autoResize={autoResize}
                  colorClass="focus:border-rose-500 focus:ring-rose-500"
                  className="min-h-[84px]"
                />
              </div>
            </div>
          </Section>

          {!isEditing && (
            <p className="pb-1 text-center text-[10px] text-slate-500">
              Data nilai sedang dimuat dari server...
            </p>
          )}
        </fieldset>
      </div>

      <footer
        className="shrink-0 border-t border-slate-800 bg-slate-900 px-3 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !isEditing}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold tracking-wide text-white shadow-md transition-colors hover:bg-emerald-600 disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={17} className="animate-spin" /> : null}
          {isSaving ? 'Menyimpan...' : 'Simpan Nilai'}
        </button>
      </footer>
    </div>
  )
}

function Section({ title, badge, tone = 'text-slate-500', children }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
        {badge && <span className={`text-[11px] font-bold ${tone}`}>{badge}</span>}
      </div>
      {children}
    </section>
  )
}

function EmptyHint({ text }) {
  return <p className="py-1 text-center text-xs text-slate-500">{text}</p>
}

function NumberField({ label, description, value, onChange, accent }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 flex items-baseline justify-between gap-1">
        <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500" title={label}>
          {label}
        </span>
      </span>
      {description && (
        <span className="mb-1 block truncate text-[9px] text-slate-500" title={description}>
          {description}
        </span>
      )}
      <input
        type="number"
        inputMode="decimal"
        min="0"
        max="100"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        onFocus={selectOnFocus}
        placeholder="—"
        className={`h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-2 text-center text-base font-semibold text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 disabled:opacity-60 ${accent}`}
      />
    </label>
  )
}
