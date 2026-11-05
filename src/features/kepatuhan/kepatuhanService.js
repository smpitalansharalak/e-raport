import { supabase } from '@/lib/supabase'

function parseCatatanKhusus(rawValue) {
  const raw = rawValue || ''
  let catatan = raw
  let kokurikuler = []
  let ekstrakurikuler = []

  try {
    const parsed = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      ('catatan' in parsed || 'kokurikuler' in parsed || 'ekstrakurikuler' in parsed)
    ) {
      catatan = parsed.catatan || ''
      kokurikuler = parsed.kokurikuler || []
      ekstrakurikuler = parsed.ekstrakurikuler || []
    }
  } catch {
    // Data lama berupa string biasa.
  }

  return { catatan, kokurikuler, ekstrakurikuler }
}

export async function listHomeroomPeriods(profile) {
  if (!profile) return []

  let query = supabase
    .from('report_periods')
    .select('id, name, class_name')
    .eq('is_active', true)

  if (profile.role !== 'admin') {
    query = query.eq('wali_kelas_id', profile.id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function loadAttendanceGrid({ periodId, className }) {
  const [studentsResult, attendanceResult] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, nisn')
      .eq('class_name', className)
      .order('name', { ascending: true }),
    supabase
      .from('student_attendance')
      .select('student_id, sakit, izin, alpha, catatan_khusus')
      .eq('report_period_id', periodId),
  ])

  if (studentsResult.error) throw studentsResult.error
  if (attendanceResult.error) throw attendanceResult.error

  const students = studentsResult.data ?? []
  const attendance = {}

  students.forEach((student) => {
    attendance[student.id] = {
      student_id: student.id,
      sakit: 0,
      izin: 0,
      alpha: 0,
      catatan: '',
      kokurikuler: [],
      ekstrakurikuler: [],
    }
  })

  ;(attendanceResult.data ?? []).forEach((row) => {
    const parsed = parseCatatanKhusus(row.catatan_khusus)
    attendance[row.student_id] = {
      student_id: row.student_id,
      sakit: row.sakit || 0,
      izin: row.izin || 0,
      alpha: row.alpha || 0,
      ...parsed,
    }
  })

  return { students, attendance }
}

export async function saveStudentAttendance(payload) {
  const { error } = await supabase
    .from('student_attendance')
    .upsert(payload, { onConflict: 'student_id,report_period_id' })

  if (error) throw error
}
