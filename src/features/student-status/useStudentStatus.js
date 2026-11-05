import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/constants/queryKeys'
import {
  bulkUpdateStudentStatus,
  listStatusHistory,
  listStudentsForStatus,
  updateStudentStatus,
} from './studentStatusService'

export function useStudentStatusList(filters) {
  return useQuery({
    queryKey: queryKeys.studentStatus.list(filters),
    queryFn: () => listStudentsForStatus(filters),
  })
}

export function useStudentStatusHistory(studentId) {
  return useQuery({
    queryKey: queryKeys.studentStatus.history(studentId),
    queryFn: () => listStatusHistory(studentId),
    enabled: Boolean(studentId),
  })
}

export function useStudentStatusMutations() {
  const queryClient = useQueryClient()

  const invalidateStudentData = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.studentStatus.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.students.all })
  }

  const changeStatusMutation = useMutation({
    mutationFn: updateStudentStatus,
    onSuccess: invalidateStudentData,
  })

  const bulkChangeStatusMutation = useMutation({
    mutationFn: bulkUpdateStudentStatus,
    onSuccess: invalidateStudentData,
  })

  return {
    changeStatus: changeStatusMutation,
    bulkChangeStatus: bulkChangeStatusMutation,
  }
}
