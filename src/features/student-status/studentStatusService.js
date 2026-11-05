import { supabase } from '@/lib/supabase'
import { getNextClass } from '@/utils/classes'

const STUDENT_COLUMNS =
  'id, name, nisn, class_name, academic_year, status, previous_class, graduation_year'

export async function listStudentsForStatus({ status, className, academicYear }) {
  let query = supabase
    .from('students')
    .select(STUDENT_COLUMNS)
    .order('class_name', { ascending: true })
    .order('name', { ascending: true })

  if (status) query = query.eq('status', status)
  if (className) query = query.eq('class_name', className)
  if (academicYear) query = query.eq('academic_year', academicYear)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function writeStatusHistory({
  student,
  toStatus,
  toClass,
  academicYear,
  note,
}) {
  const { error } = await supabase.from('student_status_history').insert({
    student_id: student.id,
    from_status: student.status,
    to_status: toStatus,
    from_class: student.class_name,
    to_class: toClass,
    academic_year: academicYear,
    note: note || null,
  })
  if (error) throw error
}

export async function updateStudentStatus({ student, toStatus, options = {} }) {
  const updateData = {
    status: toStatus,
    status_changed_at: new Date().toISOString(),
    promotion_note: options.note || null,
  }
  if (options.toClass) {
    updateData.previous_class = student.class_name
    updateData.class_name = options.toClass
  }
  if (options.toYear) updateData.academic_year = options.toYear
  if (toStatus === 'alumni') {
    updateData.graduation_year = options.graduationYear || student.academic_year
  }

  const { error } = await supabase.from('students').update(updateData).eq('id', student.id)
  if (error) throw error

  await writeStatusHistory({
    student,
    toStatus,
    toClass: options.toClass || student.class_name,
    academicYear: options.toYear || student.academic_year,
    note: options.note,
  })
}

/**
 * Proses aksi massal (naik kelas / lulus / alumni) untuk banyak siswa.
 * Setiap siswa diproses terpisah agar satu kegagalan tidak membatalkan semuanya.
 */
export async function bulkUpdateStudentStatus({
  students,
  action,
  targetClass,
  targetYear,
  note,
}) {
  let successCount = 0

  for (const student of students) {
    try {
      let nextClass = student.class_name
      let previousClass = student.previous_class

      if (action === 'naik_kelas') {
        if (targetClass) {
          nextClass = targetClass
        } else {
          const autoNext = getNextClass(student.class_name)
          if (autoNext) nextClass = autoNext
        }
        if (nextClass !== student.class_name) {
          previousClass = student.class_name
        }
      }

      const updateData = {
        status: action,
        status_changed_at: new Date().toISOString(),
        promotion_note: note || null,
      }
      if (action === 'naik_kelas' && nextClass !== student.class_name) {
        updateData.previous_class = previousClass
        updateData.class_name = nextClass
      }
      if (targetYear) updateData.academic_year = targetYear
      if (action === 'alumni') {
        updateData.graduation_year = targetYear || student.academic_year
      }

      const { error } = await supabase.from('students').update(updateData).eq('id', student.id)
      if (error) throw error

      await writeStatusHistory({
        student,
        toStatus: action,
        toClass: action === 'naik_kelas' ? nextClass : student.class_name,
        academicYear: targetYear || student.academic_year,
        note,
      })

      successCount++
    } catch (err) {
      console.error(`Gagal update ${student.name}:`, err)
    }
  }

  return successCount
}

export async function listStatusHistory(studentId) {
  const { data, error } = await supabase
    .from('student_status_history')
    .select('id, created_at, to_status, from_class, to_class, note')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
