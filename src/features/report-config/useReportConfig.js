import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/constants/queryKeys'
import {
  deleteReportPeriod,
  deleteSubject,
  getPeriodSubjectOrder,
  getReportConfigData,
  savePeriodSubjectOrder,
  saveReportPeriod,
  saveSubject,
} from './reportConfigService'

export function useReportConfig() {
  return useQuery({
    queryKey: queryKeys.reportPeriods.list(),
    queryFn: getReportConfigData,
  })
}

export function usePeriodSubjectOrder(periodId) {
  return useQuery({
    queryKey: queryKeys.reportPeriods.periodSubjects(periodId),
    queryFn: () => getPeriodSubjectOrder(periodId),
    enabled: Boolean(periodId),
  })
}

export function useReportConfigMutations() {
  const queryClient = useQueryClient()

  const invalidateReportConfig = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.reportPeriods.all })

  const savePeriodMutation = useMutation({
    mutationFn: saveReportPeriod,
    onSuccess: invalidateReportConfig,
  })

  const deletePeriodMutation = useMutation({
    mutationFn: deleteReportPeriod,
    onSuccess: invalidateReportConfig,
  })

  const saveSubjectMutation = useMutation({
    mutationFn: saveSubject,
    onSuccess: invalidateReportConfig,
  })

  const deleteSubjectMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: invalidateReportConfig,
  })

  const saveSubjectOrderMutation = useMutation({
    mutationFn: savePeriodSubjectOrder,
    onSuccess: invalidateReportConfig,
  })

  return {
    savePeriod: savePeriodMutation,
    deletePeriod: deletePeriodMutation,
    saveSubject: saveSubjectMutation,
    deleteSubject: deleteSubjectMutation,
    saveSubjectOrder: saveSubjectOrderMutation,
  }
}
