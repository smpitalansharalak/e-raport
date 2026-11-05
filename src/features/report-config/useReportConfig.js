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
  setReportPeriodActive,
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

  const invalidateReportConfig = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reportPeriods.all })
    // jumlah "periode dipakai" yang tampil di kartu format ikut diperbarui
    queryClient.invalidateQueries({ queryKey: queryKeys.assessmentFormats.all })
  }

  const savePeriodMutation = useMutation({
    mutationFn: saveReportPeriod,
    onSuccess: invalidateReportConfig,
  })

  const deletePeriodMutation = useMutation({
    mutationFn: deleteReportPeriod,
    onSuccess: invalidateReportConfig,
  })

  const setActivePeriodMutation = useMutation({
    mutationFn: setReportPeriodActive,
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
    setActivePeriod: setActivePeriodMutation,
    saveSubject: saveSubjectMutation,
    deleteSubject: deleteSubjectMutation,
    saveSubjectOrder: saveSubjectOrderMutation,
  }
}
