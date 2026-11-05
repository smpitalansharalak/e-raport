import { supabase } from '@/lib/supabase'

const PERIOD_COLUMNS =
  'id, name, class_name, semester, academic_year, kepala_sekolah_name, is_active, wali_kelas:profiles(id, name)'

const STUDENT_COLUMNS =
  'id, name, nisn, class_name, academic_year, phase, parent_name, status, graduation_year, previous_class'

export async function listPrintablePeriods({ archiveMode }) {
  let query = supabase
    .from('report_periods')
    .select(PERIOD_COLUMNS)
    .order('created_at', { ascending: false })

  query = query.eq('is_active', !archiveMode)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Satu logika daftar siswa untuk SEMUA periode (aktif maupun arsip):
 * siswa yang cocok kelas + tahun ajaran, ATAU yang punya nilai/kehadiran di
 * periode ini, ATAU yang berasal dari kelas itu (previous_class) ikut tampil —
 * sehingga siswa yang sudah naik kelas/lulus tidak "hilang" dari rapor lama.
 */
async function listStudentsForPeriod({ periodId, period }) {
  const { data: scoreData } = await supabase
    .from('student_scores')
    .select('student_id')
    .eq('report_period_id', periodId)

  const { data: attendanceData } = await supabase
    .from('student_attendance')
    .select('student_id')
    .eq('report_period_id', periodId)

  const relatedIds = new Set([
    ...(scoreData ?? []).map((row) => row.student_id),
    ...(attendanceData ?? []).map((row) => row.student_id),
  ])

  const base = `and(class_name.eq."${period.class_name}",academic_year.eq."${period.academic_year}")`
  const query =
    relatedIds.size > 0
      ? supabase
          .from('students')
          .select(STUDENT_COLUMNS)
          .or(`${base},id.in.(${Array.from(relatedIds).join(',')})`)
          .order('name', { ascending: true })
      : supabase
          .from('students')
          .select(STUDENT_COLUMNS)
          .or(`${base},and(previous_class.eq."${period.class_name}",academic_year.eq."${period.academic_year}")`)
          .order('name', { ascending: true })

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function listReportSubjects(periodId) {
  const { data, error } = await supabase
    .from('report_subjects')
    .select('subject:subjects(id, name), sort_order')
    .eq('report_period_id', periodId)
    .order('sort_order', { ascending: true })

  if (error) throw error

  return (data ?? [])
    .sort((a, b) => {
      const ao = a.sort_order ?? 9999
      const bo = b.sort_order ?? 9999
      return ao !== bo ? ao - bo : (a.subject?.name || '').localeCompare(b.subject?.name || '')
    })
    .map((row) => row.subject)
    .filter(Boolean)
}

async function listPeriodScores(periodId) {
  const { data, error } = await supabase
    .from('student_scores')
    .select(
      'student_id, subject_id, scores_formative, scores_summative, fixed_scores, final_score, highest_achievement, lowest_achievement',
    )
    .eq('report_period_id', periodId)

  if (error) throw error
  return data ?? []
}

async function listPeriodAttendance(periodId) {
  const { data, error } = await supabase
    .from('student_attendance')
    .select('student_id, sakit, izin, alpha, catatan_khusus')
    .eq('report_period_id', periodId)

  if (error) throw error
  return data ?? []
}

export async function getPeriodSheetData({ periodId, period }) {
  const students = await listStudentsForPeriod({ periodId, period })

  const [subjects, scores, attendance] = await Promise.all([
    listReportSubjects(periodId),
    listPeriodScores(periodId),
    listPeriodAttendance(periodId),
  ])

  return { students, subjects, scores, attendance }
}

/** Predikat aktif (untuk badge di panel Rincian) — toleran jika migrasi belum dijalankan */
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

export async function getExportDetailData(periodId) {
  const [componentsRes, itemsRes] = await Promise.all([
    supabase
      .from('period_components')
      .select('id, name, kind, with_tp, tp_aggregation, sub_values, weight, sort_order')
      .eq('report_period_id', periodId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('assessment_items')
      .select('id, name, period_component_id, subject_id, sort_order')
      .eq('report_period_id', periodId)
      .order('sort_order', { ascending: true }),
  ])

  if (componentsRes.error) throw componentsRes.error
  if (itemsRes.error) throw itemsRes.error

  const components = componentsRes.data ?? []
  const items = itemsRes.data ?? []

  let learningTargets = []
  if (items.length > 0) {
    const { data: tpData, error: tpError } = await supabase
      .from('learning_targets')
      .select('id, code, description, assessment_item_id')
      .in('assessment_item_id', items.map((item) => item.id))
      .order('code', { ascending: true })

    if (tpError) throw tpError
    learningTargets = tpData ?? []
  }

  return { components, items, learningTargets }
}
