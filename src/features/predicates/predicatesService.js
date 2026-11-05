import { supabase } from '@/lib/supabase'

export const DEFAULT_PLACEMENT = {
  show_on_inputs: false,
  show_on_component_averages: true,
  show_on_final: true,
}

export async function listPredicates() {
  const { data, error } = await supabase
    .from('grade_predicates')
    .select('id, label, description, min_score, max_score, sort_order, is_active')
    .order('sort_order', { ascending: true })
    .order('min_score', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Simpan seluruh daftar predikat sekaligus (upsert).
 * Penghapusan dilakukan terpisah lewat deletePredicate.
 */
export async function savePredicates({ predicates }) {
  const rows = predicates.map((p, index) => ({
    id: p.id ?? crypto.randomUUID(),
    label: String(p.label ?? '').trim(),
    description: p.description ? String(p.description).trim() : null,
    min_score: Number(p.min_score),
    max_score: Number(p.max_score),
    sort_order: index,
    is_active: p.is_active ?? true,
  }))

  if (rows.length === 0) return

  const { error } = await supabase.from('grade_predicates').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

export async function deletePredicate(id) {
  const { error } = await supabase.from('grade_predicates').delete().eq('id', id)
  if (error) throw error
}

export async function getPredicatePlacement() {
  const { data, error } = await supabase
    .from('predicate_settings')
    .select('show_on_inputs, show_on_component_averages, show_on_final')
    .eq('id', true)
    .maybeSingle()

  if (error) throw error
  return data ?? DEFAULT_PLACEMENT
}

export async function savePredicatePlacement(placement) {
  const payload = {
    id: true,
    show_on_inputs: Boolean(placement.show_on_inputs),
    show_on_component_averages: Boolean(placement.show_on_component_averages),
    show_on_final: Boolean(placement.show_on_final),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('predicate_settings').upsert(payload, { onConflict: 'id' })
  if (error) throw error
}
