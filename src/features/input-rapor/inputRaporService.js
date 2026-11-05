import { supabase } from '@/lib/supabase'

const SCORE_COLUMNS =
  'student_id, scores_formative, scores_summative, sts_practice, sts_written, sas_practice, sas_written, highest_achievement, lowest_achievement'

export async function listActiveReportPeriods() {
  const { data, error } = await supabase
    .from('report_periods')
    .select('id, name, class_name, semester, academic_year')
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
  const [studentsResult, materialsResult, summativesResult] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, nisn')
      .eq('class_name', className)
      .eq('status', 'aktif')
      .order('name', { ascending: true }),
    supabase
      .from('materials')
      .select('id, name')
      .eq('report_period_id', periodId)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true }),
    supabase
      .from('summatives')
      .select('id, name')
      .eq('report_period_id', periodId)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true }),
  ])

  if (studentsResult.error) throw studentsResult.error
  if (materialsResult.error) throw materialsResult.error
  if (summativesResult.error) throw summativesResult.error

  const students = studentsResult.data ?? []
  const materials = materialsResult.data ?? []
  const summatives = summativesResult.data ?? []

  let learningTargets = []
  if (materials.length > 0) {
    const { data: tps, error: tpErr } = await supabase
      .from('learning_targets')
      .select('id, code, material_id, description')
      .in('material_id', materials.map((m) => m.id))
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
      sts_practice: '',
      sts_written: '',
      sas_practice: '',
      sas_written: '',
      highest_achievement: '',
      lowest_achievement: '',
    }
  })

  ;(scoreData ?? []).forEach((row) => {
    if (!scores[row.student_id]) return

    scores[row.student_id] = {
      ...scores[row.student_id],
      scores_formative: row.scores_formative || {},
      scores_summative: row.scores_summative || {},
      sts_practice: row.sts_practice != null ? String(row.sts_practice) : '',
      sts_written: row.sts_written != null ? String(row.sts_written) : '',
      sas_practice: row.sas_practice != null ? String(row.sas_practice) : '',
      sas_written: row.sas_written != null ? String(row.sas_written) : '',
      highest_achievement: row.highest_achievement || '',
      lowest_achievement: row.lowest_achievement || '',
    }
  })

  return { students, materials, learningTargets, summatives, scores }
}

export async function fetchMaterialsAndTargets({ periodId, subjectId }) {
  const { data: materials, error: materialsErr } = await supabase
    .from('materials')
    .select('id, name')
    .eq('report_period_id', periodId)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true })

  if (materialsErr) throw materialsErr

  const materialRows = materials ?? []

  if (materialRows.length === 0) {
    return { materials: materialRows, learningTargets: [] }
  }

  const { data: tps, error: tpErr } = await supabase
    .from('learning_targets')
    .select('id, code, material_id, description')
    .in('material_id', materialRows.map((m) => m.id))
    .order('code', { ascending: true })

  if (tpErr) throw tpErr

  return { materials: materialRows, learningTargets: tps ?? [] }
}

export async function fetchSummatives({ periodId, subjectId }) {
  const { data, error } = await supabase
    .from('summatives')
    .select('id, name')
    .eq('report_period_id', periodId)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
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

export async function createMaterial({ periodId, subjectId, name }) {
  const { error } = await supabase.from('materials').insert({
    report_period_id: periodId,
    subject_id: subjectId,
    name,
  })

  if (error) throw error
}

export async function deleteMaterial(id) {
  const { error } = await supabase.from('materials').delete().eq('id', id)
  if (error) throw error
}

export async function createLearningTarget({ materialId, code, description }) {
  const { error } = await supabase.from('learning_targets').insert({
    material_id: materialId,
    code,
    description,
  })

  if (error) throw error
}

export async function deleteLearningTarget(id) {
  const { error } = await supabase.from('learning_targets').delete().eq('id', id)
  if (error) throw error
}

export async function createSummative({ periodId, subjectId, name }) {
  const { error } = await supabase.from('summatives').insert({
    report_period_id: periodId,
    subject_id: subjectId,
    name,
  })

  if (error) throw error
}

export async function deleteSummative(id) {
  const { error } = await supabase.from('summatives').delete().eq('id', id)
  if (error) throw error
}
