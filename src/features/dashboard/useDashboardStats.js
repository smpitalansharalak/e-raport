import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { queryKeys } from '@/constants/queryKeys'
import { getDashboardStats } from './dashboardService'

export function useDashboardStats() {
  const { profile } = useAuth()

  const query = useQuery({
    queryKey: queryKeys.dashboard.stats(profile?.id, profile?.role),
    queryFn: () => getDashboardStats(profile),
    enabled: Boolean(profile?.id),
  })

  useEffect(() => {
    if (query.error) {
      console.error('Error fetching dashboard stats:', query.error)
    }
  }, [query.error])

  return query
}
