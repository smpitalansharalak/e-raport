/**
 * Utility functions untuk kalkulasi nilai rapor.
 * Murni JavaScript — tidak ada dependency React.
 *
 * Model nilai baru (Format Penilaian):
 * - Komponen diambil dari snapshot periode (period_components), BUKAN dari format.
 * - Komponen countable (guru menentukan jumlah item):
 *   - with_tp = true  → nilai item = rata-rata TP; tp_aggregation menentukan
 *     bagaimana nilai komponen dihitung dari TP ('global' = rata-rata semua TP,
 *     'per_item' = rata-rata per item lalu rata-rata antar item)
 *   - with_tp = false → nilai komponen = rata-rata nilai item (input langsung guru)
 * - Komponen fixed → nilai komponen = rata-rata sub_values yang terisi
 *   (sub_values = null berarti nilai tunggal, subKey = 'value')
 * - Komponen yang kosong (tidak ada satu pun nilai terisi) DILEWATI.
 * - Nilai akhir: calculationMode 'equal' = rata-rata komponen terisi,
 *   'weighted' = Σ(nilai × bobot) / Σ(bobot komponen terisi).
 */

export const toNullableNumber = (val) => {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(val)
  return Number.isNaN(n) ? null : n
}

export const toNumberOrEmpty = (val) => {
  if (val === '' || val === null || val === undefined) return ''
  const n = Number(val)
  return Number.isNaN(n) ? '' : n
}

const filledNumber = (val) => {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(val)
  return Number.isNaN(n) ? null : n
}

const avg = (nums) => {
  if (!nums || nums.length === 0) return null
  const sum = nums.reduce((a, b) => a + b, 0)
  return Number((sum / nums.length).toFixed(1))
}

export const DEFAULT_FIXED_SUB = [{ key: 'value', label: 'Nilai' }]

export const getFixedSubs = (component) => {
  const subs = component?.sub_values
  return Array.isArray(subs) && subs.length > 0 ? subs : DEFAULT_FIXED_SUB
}

/** Item-item milik satu komponen, urut sort_order lalu created_at. */
export const itemsOfComponent = (componentId, items = []) =>
  items
    .filter((item) => item.period_component_id === componentId)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))

/** TP-TP milik satu komponen (with_tp), dikelompokkan per item. */
export const tpsOfComponent = (componentId, items = [], learningTargets = []) => {
  const itemIds = new Set(itemsOfComponent(componentId, items).map((item) => item.id))
  return learningTargets.filter((tp) => itemIds.has(tp.assessment_item_id))
}

/** Nilai TP per item → { [itemId]: number | null } */
export const itemTpAverages = (component, items, learningTargets, formativeScores) => {
  const result = {}
  itemsOfComponent(component.id, items).forEach((item) => {
    const tpValues = learningTargets
      .filter((tp) => tp.assessment_item_id === item.id)
      .map((tp) => filledNumber(formativeScores?.[tp.id]))
      .filter((n) => n !== null)
    result[item.id] = avg(tpValues)
  })
  return result
}

/** Rata-rata TP untuk keperluan tampilan (semua TP pada komponen with_tp). */
export const calculateTpAverage = (studentScore, learningTargets = []) =>
  avg(
    (learningTargets ?? [])
      .map((tp) => filledNumber(studentScore.scores_formative?.[tp.id]))
      .filter((n) => n !== null)
  ) ?? 0

/** Rata-rata input langsung untuk keperluan tampilan. */
export const calculateItemAverage = (studentScore, items = []) =>
  avg(
    (items ?? [])
      .map((item) => filledNumber(studentScore.scores_summative?.[item.id]))
      .filter((n) => n !== null)
  ) ?? 0

/** Nilai komponen with_tp berdasarkan tp_aggregation di snapshot komponen. */
export const calculateTpComponentValue = (component, items, learningTargets, formativeScores) => {
  if (component.tp_aggregation === 'per_item') {
    const itemValues = itemsOfComponent(component.id, items).map((item) => {
      const tpValues = learningTargets
        .filter((tp) => tp.assessment_item_id === item.id)
        .map((tp) => filledNumber(formativeScores?.[tp.id]))
        .filter((n) => n !== null)
      return avg(tpValues)
    })
    return avg(itemValues.filter((n) => n !== null))
  }
  const allTpValues = tpsOfComponent(component.id, items, learningTargets)
    .map((tp) => filledNumber(formativeScores?.[tp.id]))
    .filter((n) => n !== null)
  return avg(allTpValues)
}

/** Nilai komponen countable tanpa TP (input langsung guru). */
export const calculateItemComponentValue = (component, items, summativeScores) =>
  avg(
    itemsOfComponent(component.id, items)
      .map((item) => filledNumber(summativeScores?.[item.id]))
      .filter((n) => n !== null)
  )

/** Nilai komponen fixed (rata-rata sub_values yang terisi). */
export const calculateFixedComponentValue = (component, fixedScores) => {
  const subs = getFixedSubs(component)
  const compScores = fixedScores?.[component.id] ?? {}
  return avg(
    subs.map((sub) => filledNumber(compScores[sub.key])).filter((n) => n !== null)
  )
}

/** Nilai satu komponen apa pun jenisnya. null jika kosong. */
export const getComponentValue = (component, items, learningTargets, studentScore) => {
  if (!component) return null
  if (component.kind === 'fixed') {
    return calculateFixedComponentValue(component, studentScore.fixed_scores)
  }
  if (component.with_tp) {
    return calculateTpComponentValue(component, items, learningTargets, studentScore.scores_formative)
  }
  return calculateItemComponentValue(component, items, studentScore.scores_summative)
}

/** { [componentId]: number | null } */
export const computeComponentValues = (components, items, learningTargets, studentScore) => {
  const result = {}
  ;(components ?? []).forEach((component) => {
    result[component.id] = getComponentValue(component, items, learningTargets, studentScore)
  })
  return result
}

/**
 * Nilai akhir rapor.
 * @param {object} studentScore
 * @param {Array} components  period_components (snapshot), urut sort_order
 * @param {Array} items       assessment_items
 * @param {Array} learningTargets
 * @param {string} calculationMode 'equal' | 'weighted'
 */
export const calculateFinalRaporScore = (studentScore, components, items, learningTargets, calculationMode = 'equal') => {
  const comps = components ?? []
  if (comps.length === 0) return 0

  const filled = comps
    .map((component) => ({
      value: getComponentValue(component, items, learningTargets, studentScore),
      weight: filledNumber(component.weight) ?? 0,
    }))
    .filter((entry) => entry.value !== null)

  if (filled.length === 0) return 0

  if (calculationMode === 'weighted') {
    const totalWeight = filled.reduce((sum, entry) => sum + entry.weight, 0)
    if (totalWeight > 0) {
      const weighted = filled.reduce((sum, entry) => sum + entry.value * entry.weight, 0)
      return Math.round(weighted / totalWeight)
    }
    // semua bobot 0 → fallback ke rata-rata biasa
  }

  const sum = filled.reduce((total, entry) => total + entry.value, 0)
  return Math.round(sum / filled.length)
}
