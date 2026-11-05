import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/constants/queryKeys'
import {
  deleteStudent,
  importStudents,
  listAvailableClasses,
  listStudents,
  saveStudent,
} from './studentsService'

export function useStudents() {
  return useQuery({
    queryKey: queryKeys.students.list(),
    queryFn: listStudents,
  })
}

export function useAvailableClasses({ statusFilter = null } = {}) {
  const query = useQuery({
    queryKey: queryKeys.students.classes(statusFilter),
    queryFn: () => listAvailableClasses({ statusFilter }),
  })

  return { ...query, classes: query.data ?? [] }
}

export function useStudentMutations() {
  const queryClient = useQueryClient()

  const invalidateStudents = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.students.all })

  const saveStudentMutation = useMutation({
    mutationFn: saveStudent,
    onSuccess: invalidateStudents,
  })

  const deleteStudentMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: invalidateStudents,
  })

  const importStudentsMutation = useMutation({
    mutationFn: importStudents,
    onSuccess: invalidateStudents,
  })

  return {
    saveStudent: saveStudentMutation,
    deleteStudent: deleteStudentMutation,
    importStudents: importStudentsMutation,
  }
}
