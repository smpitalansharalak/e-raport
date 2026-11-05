import { supabase } from '@/lib/supabase'

export async function getUsersData() {
  const [profilesRes, subjectsRes, teacherSubjectsRes] = await Promise.all([
    supabase.from('profiles').select('id, username, name, email, role, secondary_role').order('name'),
    supabase.from('subjects').select('id, name, class_name').order('name'),
    supabase.from('teacher_subjects').select('teacher_id, subject_id'),
  ])

  if (profilesRes.error) throw profilesRes.error
  if (subjectsRes.error) throw subjectsRes.error
  if (teacherSubjectsRes.error) throw teacherSubjectsRes.error

  const teacherSubjects = {}
  ;(teacherSubjectsRes.data ?? []).forEach(({ teacher_id, subject_id }) => {
    if (!teacherSubjects[teacher_id]) teacherSubjects[teacher_id] = []
    teacherSubjects[teacher_id].push(subject_id)
  })

  return {
    profiles: profilesRes.data ?? [],
    subjects: subjectsRes.data ?? [],
    teacherSubjects,
  }
}

export async function updateProfileField({ id, field, value }) {
  const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', id)
  if (error) throw error
}

export async function toggleTeacherSubject({ teacherId, subjectId, assigned }) {
  if (assigned) {
    const { error } = await supabase
      .from('teacher_subjects')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('subject_id', subjectId)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('teacher_subjects')
    .insert({ teacher_id: teacherId, subject_id: subjectId })
  if (error) throw error
}

export async function resetUserPassword(userId) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) throw new Error('Sesi tidak valid.')

  const res = await fetch('/api/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ userId }),
  })

  const body = await res.json()
  if (!res.ok) throw new Error(body?.error || 'Gagal mereset password.')
}
