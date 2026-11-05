import { supabase } from '@/lib/supabase'

export async function getReportConfigData() {
  const [periodsRes, subjectsRes, teachersRes, periodSubjectsRes] = await Promise.all([
    supabase
      .from('report_periods')
      .select(`
        *,
        wali_kelas:profiles(id, name)
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('subjects')
      .select('id, name, class_name')
      .order('name', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, name, role')
      .neq('role', 'admin')
      .order('name', { ascending: true }),
    supabase.from('report_subjects').select('report_period_id, subject_id'),
  ])

  if (periodsRes.error) throw periodsRes.error
  if (subjectsRes.error) throw subjectsRes.error
  if (teachersRes.error) throw teachersRes.error
  if (periodSubjectsRes.error) throw periodSubjectsRes.error

  const periodSubjects = {}
  ;(periodSubjectsRes.data ?? []).forEach((row) => {
    if (!periodSubjects[row.report_period_id]) {
      periodSubjects[row.report_period_id] = []
    }
    periodSubjects[row.report_period_id].push(row.subject_id)
  })

  return {
    periods: periodsRes.data ?? [],
    subjects: subjectsRes.data ?? [],
    teachers: teachersRes.data ?? [],
    periodSubjects,
  }
}

export async function saveReportPeriod({ id, values }) {
  const payload = {
    name: values.name,
    class_name: values.class_name,
    semester: values.semester,
    academic_year: values.academic_year,
    wali_kelas_id: values.wali_kelas_id,
    kepala_sekolah_name: values.kepala_sekolah_name,
    is_active: values.is_active,
  }

  if (id) {
    const { error } = await supabase.from('report_periods').update(payload).eq('id', id)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('report_periods').insert(payload)
  if (error) throw error
}

export async function deleteReportPeriod(id) {
  const { error } = await supabase.from('report_periods').delete().eq('id', id)
  if (error) throw error
}

export async function saveSubject({ id, values }) {
  const payload = {
    name: values.name,
    class_name: values.class_name || null,
  }

  if (id) {
    const { error } = await supabase.from('subjects').update(payload).eq('id', id)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('subjects').insert(payload)
  if (error) throw error
}

export async function deleteSubject(id) {
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  if (error) throw error
}

export async function getPeriodSubjectOrder(periodId) {
  const { data, error } = await supabase
    .from('report_subjects')
    .select('subject_id, sort_order')
    .eq('report_period_id', periodId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Sinkronkan mapel aktif pada sebuah periode beserta urutannya.
 * `subjectIds` sudah dalam urutan final yang diinginkan pengguna.
 */
export async function savePeriodSubjectOrder({ periodId, subjectIds }) {
  const { data: existing, error: existingError } = await supabase
    .from('report_subjects')
    .select('subject_id')
    .eq('report_period_id', periodId)

  if (existingError) throw existingError

  const existingIds = new Set((existing ?? []).map((row) => row.subject_id))
  const wantedIds = new Set(subjectIds)

  const toInsert = subjectIds
    .filter((id) => !existingIds.has(id))
    .map((id, index) => ({
      report_period_id: periodId,
      subject_id: id,
      sort_order: index,
    }))

  if (toInsert.length > 0) {
    const { error } = await supabase.from('report_subjects').insert(toInsert)
    if (error) throw error
  }

  const toDelete = [...existingIds].filter((id) => !wantedIds.has(id))
  for (const subjectId of toDelete) {
    const { error } = await supabase
      .from('report_subjects')
      .delete()
      .eq('report_period_id', periodId)
      .eq('subject_id', subjectId)
    if (error) throw error
  }

  for (let index = 0; index < subjectIds.length; index++) {
    const { error } = await supabase
      .from('report_subjects')
      .update({ sort_order: index })
      .eq('report_period_id', periodId)
      .eq('subject_id', subjectIds[index])
    if (error) throw error
  }
}
