import { supabase } from '@/lib/supabase'

export async function getReportConfigData() {
  const [periodsRes, subjectsRes, teachersRes, periodSubjectsRes, formatsRes] = await Promise.all([
    supabase
      .from('report_periods')
      .select(`
        *,
        wali_kelas:profiles(id, name),
        format:assessment_formats(id, name)
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
    supabase
      .from('assessment_formats')
      .select('id, name, is_default, is_active, calculation_mode, components:assessment_format_components(count)')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true }),
  ])

  if (periodsRes.error) throw periodsRes.error
  if (subjectsRes.error) throw subjectsRes.error
  if (teachersRes.error) throw teachersRes.error
  if (periodSubjectsRes.error) throw periodSubjectsRes.error
  if (formatsRes.error) throw formatsRes.error

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
    formats: (formatsRes.data ?? []).map((format) => ({
      ...format,
      componentCount: format.components?.[0]?.count ?? 0,
    })),
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
    // Format penilaian tidak bisa diubah setelah periode dibuat (komponen sudah tersnapshot)
    const { error } = await supabase.from('report_periods').update(payload).eq('id', id)
    if (error) throw error
    return
  }

  // ── CREATE ──────────────────────────────────────────────────────────────
  let formatId = values.format_id || null
  if (!formatId) {
    const { data: defaultFormat, error: defaultError } = await supabase
      .from('assessment_formats')
      .select('id')
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()
    if (defaultError) throw defaultError
    formatId = defaultFormat?.id ?? null
  }
  if (!formatId) {
    throw new Error('Pilih format penilaian untuk periode ini (buat dulu di menu Format Penilaian).')
  }

  const { data: format, error: formatError } = await supabase
    .from('assessment_formats')
    .select('*, components:assessment_format_components(*)')
    .eq('id', formatId)
    .single()
  if (formatError) throw formatError

  const components = (format.components ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  if (components.length === 0) {
    throw new Error(`Format "${format.name}" belum memiliki komponen. Lengkapi dulu di menu Format Penilaian.`)
  }

  const { data: inserted, error: insertError } = await supabase
    .from('report_periods')
    .insert({ ...payload, format_id: formatId, calculation_mode: format.calculation_mode })
    .select('id')
    .single()
  if (insertError) throw insertError

  // ── Snapshot komponen: salin ke period_components ──
  try {
    const rows = components.map((component, index) => ({
      report_period_id: inserted.id,
      source_component_id: component.id,
      name: component.name,
      kind: component.kind,
      with_tp: component.kind === 'countable' ? Boolean(component.with_tp) : false,
      tp_aggregation: component.tp_aggregation ?? 'global',
      sub_values: component.sub_values ?? null,
      weight: component.weight,
      sort_order: index,
    }))
    const { error: snapshotError } = await supabase.from('period_components').insert(rows)
    if (snapshotError) throw snapshotError
  } catch (err) {
    // rollback periode yang baru dibuat agar tidak ada periode tanpa komponen
    await supabase.from('report_periods').delete().eq('id', inserted.id)
    throw err
  }
}

export async function deleteReportPeriod(id) {
  const { error } = await supabase.from('report_periods').delete().eq('id', id)
  if (error) throw error
}

/** Arsipkan (is_active=false) atau aktifkan kembali sebuah periode rapor. */
export async function setReportPeriodActive({ id, isActive }) {
  const { error } = await supabase.from('report_periods').update({ is_active: isActive }).eq('id', id)
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
