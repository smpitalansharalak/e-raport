import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/constants/queryKeys'
import {
  deletePredicate,
  getPredicatePlacement,
  listPredicates,
  savePredicatePlacement,
  savePredicates,
} from './predicatesService'

export function usePredicates() {
  return useQuery({
    queryKey: queryKeys.predicates.list(),
    queryFn: listPredicates,
  })
}

export function usePredicatePlacement() {
  return useQuery({
    queryKey: queryKeys.predicates.placement(),
    queryFn: getPredicatePlacement,
  })
}

export function usePredicateMutations() {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.predicates.all })

  const saveList = useMutation({
    mutationFn: savePredicates,
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: deletePredicate,
    onSuccess: invalidate,
  })

  const savePlacement = useMutation({
    mutationFn: savePredicatePlacement,
    onSuccess: invalidate,
  })

  return { saveList, remove, savePlacement }
}
