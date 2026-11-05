import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/constants/queryKeys'
import { getExportDetailData, getPeriodSheetData, listGradePredicates, listPrintablePeriods } from './cetakRaporService'

export function usePrintablePeriods(archiveMode) {
  return useQuery({
    queryKey: queryKeys.cetakRapor.periods(archiveMode),
    queryFn: () => listPrintablePeriods({ archiveMode }),
  })
}

export function usePeriodSheetData({ periodId, period, archiveMode }) {
  return useQuery({
    queryKey: queryKeys.cetakRapor.sheet(periodId, archiveMode),
    queryFn: () => getPeriodSheetData({ periodId, period }),
    enabled: Boolean(periodId && period),
  })
}

/** Komponen/item/TP periode — dipakai oleh panel Rincian (read-only, admin). */
export function useRincianDetail(periodId, enabled) {
  return useQuery({
    queryKey: queryKeys.cetakRapor.rincian(periodId),
    queryFn: () => getExportDetailData(periodId),
    enabled: Boolean(enabled && periodId),
    staleTime: 60_000,
  })
}

/** Daftar predikat untuk badge di panel Rincian. */
export function useRincianPredicates(enabled) {
  return useQuery({
    queryKey: queryKeys.cetakRapor.rincianPredicates(),
    queryFn: listGradePredicates,
    enabled: Boolean(enabled),
    staleTime: 60_000,
  })
}
