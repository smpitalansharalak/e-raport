import { supabase } from '@/lib/supabase'

const FORMAT_SELECT =
  'id, name, description, calculation_mode, is_active, is_default, created_at, components:assessment_format_components(id, name, kind, with_tp, tp_aggregation, sub_values, weight, sort_order), periods:report_periods(id)'

const sortByOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)

export async function listAssessmentFormats() {
  const { data, error } = await supabase
    .from('assessment_formats')
    .select(FORMAT_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((format) => ({
    ...format,
    components: (format.components ?? []).slice().sort(sortByOrder),
    periodCount: (format.periods ?? []).length,
    periods: undefined,
  }))
}

export async function saveAssessmentFormat({ id, format, components }) {
  const payload = {
    name: format.name,
    description: format.description || null,
    calculation_mode: format.calculation_mode,
    is_active: format.is_active ?? true,
  }

  let formatId = id ?? null

  if (formatId) {
    const { error } = await supabase.from('assessment_formats').update(payload).eq('id', formatId)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('assessment_formats').insert(payload).select('id').single()
    if (error) throw error
    formatId = data.id
  }

  const keepIds = components.map((c) => c.id).filter(Boolean)

  const { data: existing, error: existingError } = await supabase
    .from('assessment_format_components')
    .select('id')
    .eq('format_id', formatId)

  if (existingError) throw existingError

  const toDelete = (existing ?? []).map((row) => row.id).filter((cid) => !keepIds.includes(cid))
  if (toDelete.length > 0) {
    const { error } = await supabase.from('assessment_format_components').delete().in('id', toDelete)
    if (error) throw error
  }

  const rows = components.map((component, index) => ({
    id: component.id ?? crypto.randomUUID(),
    format_id: formatId,
    name: component.name,
    kind: component.kind,
    with_tp: component.kind === 'countable' ? Boolean(component.with_tp) : false,
    tp_aggregation:
      component.kind === 'countable' && component.with_tp ? component.tp_aggregation ?? 'global' : 'global',
    sub_values: component.kind === 'fixed' ? component.sub_values ?? null : null,
    weight:
      format.calculation_mode === 'weighted' && component.weight !== '' && component.weight != null
        ? Number(component.weight)
        : null,
    sort_order: index,
  }))

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from('assessment_format_components')
      .upsert(rows, { onConflict: 'id' })
    if (upsertError) throw upsertError
  }

  return formatId
}

export async function deleteAssessmentFormat(id) {
  const { error } = await supabase.from('assessment_formats').delete().eq('id', id)
  if (error) throw error
}

export async function duplicateAssessmentFormat(id) {
  const { data, error } = await supabase
    .from('assessment_formats')
    .select(FORMAT_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error

  const { data: created, error: insertError } = await supabase
    .from('assessment_formats')
    .insert({
      name: `${data.name} (Salinan)`,
      description: data.description,
      calculation_mode: data.calculation_mode,
      is_active: true,
      is_default: false,
    })
    .select('id')
    .single()

  if (insertError) throw insertError

  const components = (data.components ?? []).slice().sort(sortByOrder)
  if (components.length > 0) {
    const rows = components.map((component, index) => ({
      format_id: created.id,
      name: component.name,
      kind: component.kind,
      with_tp: component.with_tp,
      tp_aggregation: component.tp_aggregation,
      sub_values: component.sub_values,
      weight: component.weight,
      sort_order: index,
    }))
    const { error: componentsError } = await supabase
      .from('assessment_format_components')
      .insert(rows)
    if (componentsError) throw componentsError
  }

  return created.id
}

export async function setDefaultAssessmentFormat(id) {
  const { error: unsetError } = await supabase
    .from('assessment_formats')
    .update({ is_default: false })
    .neq('id', id)
  if (unsetError) throw unsetError

  const { error } = await supabase.from('assessment_formats').update({ is_default: true }).eq('id', id)
  if (error) throw error
}
