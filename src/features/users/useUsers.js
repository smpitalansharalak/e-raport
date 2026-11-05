import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/constants/queryKeys'
import {
  getUsersData,
  resetUserPassword,
  toggleTeacherSubject,
  updateProfileField,
} from './usersService'

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: getUsersData,
  })
}

export function useUserMutations() {
  const queryClient = useQueryClient()

  const updateCachedUsers = (updater) => {
    queryClient.setQueryData(queryKeys.users.list(), (current) =>
      current ? updater(current) : current
    )
  }

  const updateProfileMutation = useMutation({
    mutationFn: updateProfileField,
    onSuccess: (_, { id, field, value }) => {
      updateCachedUsers((current) => ({
        ...current,
        profiles: current.profiles.map((profile) =>
          profile.id === id ? { ...profile, [field]: value } : profile
        ),
      }))
    },
  })

  const toggleSubjectMutation = useMutation({
    mutationFn: toggleTeacherSubject,
    onSuccess: (_, { teacherId, subjectId, assigned }) => {
      updateCachedUsers((current) => {
        const currentSubjects = current.teacherSubjects[teacherId] ?? []
        const nextSubjects = assigned
          ? currentSubjects.filter((id) => id !== subjectId)
          : [...currentSubjects, subjectId]

        return {
          ...current,
          teacherSubjects: {
            ...current.teacherSubjects,
            [teacherId]: nextSubjects,
          },
        }
      })
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: resetUserPassword,
  })

  return {
    updateProfileField: updateProfileMutation,
    toggleTeacherSubject: toggleSubjectMutation,
    resetUserPassword: resetPasswordMutation,
  }
}
