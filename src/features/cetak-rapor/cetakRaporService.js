import { supabase } from '@/lib/supabase'

const PERIOD_COLUMNS =
  'id, name, class_name, semester, academic_year, kepala_sekolah_name, is_active, wali_kelas:profiles(id, name)'

const STUDENT_COLUMNS =
  'id, name, nisn, class_name, academic_year, phase, parent_name, status, graduation_year, previous_class'

export async function listPrintablePeriods({ alumniMode }) {
  let query = supabase
    .from('report_periods')
    .select(PERIOD_COLUMNS)
    .order('created_at', { ascending: false })

  query = query.eq('is_active', !alumniMode)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function listStudentsForPeriod({ periodId, period, alumniMode }) {
  let query = supabase
    .from('students')
    .select(STUDENT_COLUMNS)
    .eq('class_name', period.class_name)
    .eq('academic_year', period.academic_year)
    .order('name', { ascending: true })

  if (alumniMode) {
    // Siswa yang punya nilai atau kehadiran pada periode ini.
    const { data: scoreData } = await supabase
      .from('student_scores')
      .select('student_id')
      .eq('report_period_id', periodId)

    const { data: attendanceData } = await supabase
      .from('student_attendance')
      .select('student_id')
      .eq('report_period_id', periodId)

    const studentIds = new Set([
      ...(scoreData ?? []).map((row) => row.student_id),
      ...(attendanceData ?? []).map((row) => row.student_id),
    ])

    if (studentIds.size > 0) {
      const idList = Array.from(studentIds).join(',')
      query = supabase
        .from('students')
        .select(STUDENT_COLUMNS)
        .or(
          `and(class_name.eq."${period.class_name}",academic_year.eq."${period.academic_year}"),id.in.(${idList})`,
        )
        .order('name', { ascending: true })
    } else {
      query = supabase
        .from('students')
        .select(STUDENT_COLUMNS)
        .or(
          `and(class_name.eq."${period.class_name}",academic_year.eq."${period.academic_year}"),and(previous_class.eq."${period.class_name}",academic_year.eq."${period.academic_year}")`,
        )
        .order('name', { ascending: true })
    }
  }

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
      'student_id, subject_id, scores_formative, scores_summative, sts_practice, sts_written, sas_practice, sas_written, final_score, highest_achievement, lowest_achievement',
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

export async function getPeriodSheetData({ periodId, period, alumniMode }) {
  const students = await listStudentsForPeriod({ periodId, period, alumniMode })

  const [subjects, scores, attendance] = await Promise.all([
    listReportSubjects(periodId),
    listPeriodScores(periodId),
    listPeriodAttendance(periodId),
  ])

  return { students, subjects, scores, attendance }
}

export async function getExportDetailData(periodId) {
  const { data: materialData } = await supabase
    .from('materials')
    .select('id')
    .eq('report_period_id', periodId)
    .order('created_at', { ascending: true })

  const materials = materialData ?? []

  let learningTargets = []
  if (materials.length > 0) {
    const { data: tpData } = await supabase
      .from('learning_targets')
      .select('id, code, material_id')
      .in('material_id', materials.map((m) => m.id))
      .order('code', { ascending: true })

    learningTargets = tpData ?? []
  }

  const { data: summativeData } = await supabase
    .from('summatives')
    .select('id, name')
    .eq('report_period_id', periodId)
    .order('created_at', { ascending: true })

  return {
    materials,
    learningTargets,
    summatives: summativeData ?? [],
  }
}
