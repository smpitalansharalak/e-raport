import { supabase } from '@/lib/supabase'

const STUDENT_LIST_COLUMNS =
  'id, name, nisn, class_name, academic_year, phase, parent_name, status, previous_class'

const IMPORT_CHUNK_SIZE = 50

export async function listStudents() {
  const { data, error } = await supabase
    .from('students')
    .select(STUDENT_LIST_COLUMNS)
    .order('class_name', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function listAvailableClasses({ statusFilter = null } = {}) {
  let query = supabase.from('students').select('class_name')
  if (Array.isArray(statusFilter)) query = query.in('status', statusFilter)
  else if (statusFilter) query = query.eq('status', statusFilter)

  const { data, error } = await query
  if (error) throw error

  const unique = [...new Set((data ?? []).map((row) => row.class_name).filter(Boolean))]
  const romanOrder = ['VII', 'VIII', 'IX']

  unique.sort((a, b) => {
    const aIdx = romanOrder.indexOf(a.split(' ')[0])
    const bIdx = romanOrder.indexOf(b.split(' ')[0])
    if (aIdx !== -1 && bIdx !== -1) {
      if (aIdx !== bIdx) return aIdx - bIdx
      return a.localeCompare(b)
    }
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return a.localeCompare(b)
  })

  return unique
}

export async function saveStudent({ id, values }) {
  const payload = {
    nisn: values.nisn,
    name: values.name,
    class_name: values.class_name,
    academic_year: values.academic_year,
    phase: values.phase,
    parent_name: values.parent_name,
  }

  if (id) {
    const { error } = await supabase.from('students').update(payload).eq('id', id)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('students')
    .insert({ ...payload, status: 'aktif' })
  if (error) throw error
}

export async function deleteStudent(id) {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw error
}

/**
 * Impor baris hasil parsing Excel/CSV ke tabel students.
 * Baris dengan NISN yang sudah terdaftar dilewati dan dikembalikan sebagai
 * `failedRows` agar bisa ditampilkan di panel pratinjau.
 */
export async function importStudents(rows) {
  const failedRows = []
  const successCountHolder = { value: 0 }

  const allNisns = rows.map((row) => row.nisn)
  const { data: existing } = await supabase
    .from('students')
    .select('nisn')
    .in('nisn', allNisns)

  const existingNisns = new Set((existing ?? []).map((row) => row.nisn))
  const newRows = []

  rows.forEach((row) => {
    if (existingNisns.has(row.nisn)) {
      failedRows.push({ ...row, _error: 'NISN sudah terdaftar' })
      return
    }

    newRows.push({
      nisn: row.nisn,
      name: row.name,
      class_name: row.class_name,
      academic_year: row.academic_year,
      phase: row.phase || 'D',
      parent_name: row.parent_name || null,
      status: 'aktif',
    })
  })

  for (let i = 0; i < newRows.length; i += IMPORT_CHUNK_SIZE) {
    const chunk = newRows.slice(i, i + IMPORT_CHUNK_SIZE)
    const { error } = await supabase.from('students').insert(chunk)

    if (error) {
      chunk.forEach((row) => failedRows.push({ ...row, _error: error.message }))
    } else {
      successCountHolder.value += chunk.length
    }
  }

  return { successCount: successCountHolder.value, failedRows }
}
