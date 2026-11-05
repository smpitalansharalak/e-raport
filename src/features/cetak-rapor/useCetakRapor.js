import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/constants/queryKeys'
import { getPeriodSheetData, listPrintablePeriods } from './cetakRaporService'

export function usePrintablePeriods(alumniMode) {
  return useQuery({
    queryKey: queryKeys.cetakRapor.periods(alumniMode),
    queryFn: () => listPrintablePeriods({ alumniMode }),
  })
}

export function usePeriodSheetData({ periodId, period, alumniMode }) {
  return useQuery({
    queryKey: queryKeys.cetakRapor.sheet(periodId, alumniMode),
    queryFn: () => getPeriodSheetData({ periodId, period, alumniMode }),
    enabled: Boolean(periodId && period),
  })
}
