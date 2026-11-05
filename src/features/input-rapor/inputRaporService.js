import { supabase } from '@/lib/supabase'

// scores_formative: { <learning_target_id>: number } — input TP komponen with_tp
// scores_summative: { <assessment_item_id>: number } — input langsung komponen countable
// fixed_scores:     { <period_component_id>: { <subKey>: number } } — komponen fixed
const SCORE_COLUMNS =
  'student_id, scores_formative, scores_summative, fixed_scores, highest_achievement, lowest_achievement'

/** Predikat aktif (tanpa memicu error jika tabel belum termigrasi) */
export async function listGradePredicates() {
  const { data, error } = await supabase
    .from('grade_predicates')
    .select('id, label, description, min_score, max_score, sort_order, is_active')
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn('Predikat belum tersedia (jalankan supabase_migration_grade_predicates.sql):', error.message)
    return []
  }
  return data ?? []
}

/** Penempatan predikat dari predicate_settings (fallback ke default) */
export async function getPredicatePlacement() {
  const fallback = { show_on_inputs: false, show_on_component_averages: true, show_on_final: true }
  const { data, error } = await supabase
    .from('predicate_settings')
    .select('show_on_inputs, show_on_component_averages, show_on_final')
    .eq('id', true)
    .maybeSingle()

  if (error) {
    console.warn('Penempatan predikat belum tersedia:', error.message)
    return fallback
  }
  return data ?? fallback
}

export async function listActiveReportPeriods() {
  const { data, error } = await supabase
    .from('report_periods')
    .select('id, name, class_name, semester, academic_year, calculation_mode')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function listSubjectsForUser(profile) {
  if (!profile) return []

  if (profile.role === 'admin') {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name, class_name')
      .order('name', { ascending: true })

    if (error) throw error
    return data ?? []
  }

  const { data, error } = await supabase
    .from('teacher_subjects')
    .select('subject:subjects(id, name, class_name)')
    .eq('teacher_id', profile.id)

  if (error) throw error
  return (data ?? []).map((row) => row.subject).filter(Boolean)
}

export async function loadInputRaporGrid({ periodId, subjectId, className }) {
  const [studentsResult, componentsResult, itemsResult, periodResult] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, nisn')
      .eq('class_name', className)
      .eq('status', 'aktif')
      .order('name', { ascending: true }),
    supabase
      .from('period_components')
      .select('id, name, kind, with_tp, tp_aggregation, sub_values, weight, sort_order')
      .eq('report_period_id', periodId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('assessment_items')
      .select('id, name, period_component_id, subject_id, sort_order, created_at')
      .eq('report_period_id', periodId)
      .eq('subject_id', subjectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('report_periods').select('id, calculation_mode').eq('id', periodId).single(),
  ])

  if (studentsResult.error) throw studentsResult.error
  if (componentsResult.error) throw componentsResult.error
  if (itemsResult.error) throw itemsResult.error
  if (periodResult.error) throw periodResult.error

  const students = studentsResult.data ?? []
  const components = componentsResult.data ?? []
  const items = itemsResult.data ?? []
  const calculationMode = periodResult.data?.calculation_mode ?? 'equal'

  let learningTargets = []
  if (items.length > 0) {
    const { data: tps, error: tpErr } = await supabase
      .from('learning_targets')
      .select('id, code, description, assessment_item_id')
      .in('assessment_item_id', items.map((item) => item.id))
      .order('code', { ascending: true })

    if (tpErr) throw tpErr
    learningTargets = tps ?? []
  }

  const { data: scoreData, error: scoreErr } = await supabase
    .from('student_scores')
    .select(SCORE_COLUMNS)
    .eq('report_period_id', periodId)
    .eq('subject_id', subjectId)

  if (scoreErr) throw scoreErr

  const scores = {}
  students.forEach((student) => {
    scores[student.id] = {
      student_id: student.id,
      scores_formative: {},
      scores_summative: {},
      fixed_scores: {},
      highest_achievement: '',
      lowest_achievement: '',
    }
  })

  ;(scoreData ?? []).forEach((row) => {
    if (!scores[row.student_id]) return

    const fixedScoresAsString = {}
    Object.entries(row.fixed_scores ?? {}).forEach(([compId, subObj]) => {
      const subs = {}
      Object.entries(subObj ?? {}).forEach(([key, val]) => {
        subs[key] = val != null ? String(val) : ''
      })
      fixedScoresAsString[compId] = subs
    })

    scores[row.student_id] = {
      ...scores[row.student_id],
      scores_formative: row.scores_formative || {},
      scores_summative: row.scores_summative || {},
      fixed_scores: fixedScoresAsString,
      highest_achievement: row.highest_achievement || '',
      lowest_achievement: row.lowest_achievement || '',
    }
  })

  return { students, components, items, learningTargets, scores, calculationMode }
}

export async function fetchItemsAndTargets({ periodId, subjectId }) {
  const { data: items, error: itemsErr } = await supabase
    .from('assessment_items')
    .select('id, name, period_component_id, subject_id, sort_order, created_at')
    .eq('report_period_id', periodId)
    .eq('subject_id', subjectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (itemsErr) throw itemsErr

  const itemRows = items ?? []

  if (itemRows.length === 0) {
    return { items: itemRows, learningTargets: [] }
  }

  const { data: tps, error: tpErr } = await supabase
    .from('learning_targets')
    .select('id, code, description, assessment_item_id')
    .in('assessment_item_id', itemRows.map((item) => item.id))
    .order('code', { ascending: true })

  if (tpErr) throw tpErr

  return { items: itemRows, learningTargets: tps ?? [] }
}

export async function createItem({ periodId, subjectId, componentId, name }) {
  const { count, error: countError } = await supabase
    .from('assessment_items')
    .select('id', { count: 'exact', head: true })
    .eq('period_component_id', componentId)
    .eq('report_period_id', periodId)
    .eq('subject_id', subjectId)

  if (countError) throw countError

  const { error } = await supabase.from('assessment_items').insert({
    report_period_id: periodId,
    subject_id: subjectId,
    period_component_id: componentId,
    name,
    sort_order: count ?? 0,
  })

  if (error) throw error
}

export async function renameItem({ id, name }) {
  const { error } = await supabase.from('assessment_items').update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteItem(id) {
  const { error } = await supabase.from('assessment_items').delete().eq('id', id)
  if (error) throw error
}

export async function createLearningTarget({ itemId, code, description }) {
  const { error } = await supabase.from('learning_targets').insert({
    assessment_item_id: itemId,
    code,
    description,
  })

  if (error) throw error
}

export async function deleteLearningTarget(id) {
  const { error } = await supabase.from('learning_targets').delete().eq('id', id)
  if (error) throw error
}

export async function saveStudentScore(payload) {
  const { error } = await supabase
    .from('student_scores')
    .upsert(payload, { onConflict: 'student_id,report_period_id,subject_id' })

  if (error) throw error
}

export async function getStudentScore({ studentId, periodId, subjectId }) {
  const { data, error } = await supabase
    .from('student_scores')
    .select(SCORE_COLUMNS)
    .eq('student_id', studentId)
    .eq('report_period_id', periodId)
    .eq('subject_id', subjectId)
    .maybeSingle()

  if (error) throw error
  return data
}
