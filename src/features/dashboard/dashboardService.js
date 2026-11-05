import { supabase } from '@/lib/supabase'

export const EMPTY_DASHBOARD_STATS = {
  totalStudents: 0,
  totalTeachers: 0,
  totalReports: 0,
  totalSubjects: 0,
  teacherSubjectsCount: 0,
  waliKelasClasses: [],
}

async function getAdminStats() {
  const [studentsRes, teachersRes, periodsRes, subjectsRes] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['guru_mapel', 'wali_kelas']),
    supabase
      .from('report_periods')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase.from('subjects').select('*', { count: 'exact', head: true }),
  ])

  const firstError = studentsRes.error || teachersRes.error || periodsRes.error || subjectsRes.error
  if (firstError) throw firstError

  return {
    totalStudents: studentsRes.count || 0,
    totalTeachers: teachersRes.count || 0,
    totalReports: periodsRes.count || 0,
    totalSubjects: subjectsRes.count || 0,
  }
}

async function getTeacherStats(userId) {
  const [teacherSubjectsRes, waliKelasRes] = await Promise.all([
    supabase
      .from('teacher_subjects')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', userId),
    supabase
      .from('report_periods')
      .select('class_name')
      .eq('wali_kelas_id', userId)
      .eq('is_active', true)
      .order('class_name', { ascending: true }),
  ])

  if (teacherSubjectsRes.error) throw teacherSubjectsRes.error
  if (waliKelasRes.error) throw waliKelasRes.error

  const waliKelasClasses = [
    ...new Set((waliKelasRes.data || []).map((period) => period.class_name).filter(Boolean)),
  ]

  return {
    teacherSubjectsCount: teacherSubjectsRes.count || 0,
    waliKelasClasses,
  }
}

export async function getDashboardStats(profile) {
  if (!profile?.id) return EMPTY_DASHBOARD_STATS

  if (profile.role === 'admin') {
    return getAdminStats()
  }

  return getTeacherStats(profile.id)
}
