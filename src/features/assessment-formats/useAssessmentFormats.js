import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/constants/queryKeys'
import {
  deleteAssessmentFormat,
  duplicateAssessmentFormat,
  listAssessmentFormats,
  saveAssessmentFormat,
  setDefaultAssessmentFormat,
} from './assessmentFormatsService'

export function useAssessmentFormats() {
  return useQuery({
    queryKey: queryKeys.assessmentFormats.list(),
    queryFn: listAssessmentFormats,
  })
}

export function useAssessmentFormatMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.assessmentFormats.all })

  const saveFormat = useMutation({
    mutationFn: saveAssessmentFormat,
    onSuccess: invalidate,
  })

  const deleteFormat = useMutation({
    mutationFn: deleteAssessmentFormat,
    onSuccess: invalidate,
  })

  const duplicateFormat = useMutation({
    mutationFn: duplicateAssessmentFormat,
    onSuccess: invalidate,
  })

  const setDefaultFormat = useMutation({
    mutationFn: setDefaultAssessmentFormat,
    onSuccess: invalidate,
  })

  return { saveFormat, deleteFormat, duplicateFormat, setDefaultFormat }
}
