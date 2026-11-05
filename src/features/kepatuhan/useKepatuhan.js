import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { queryKeys } from '@/constants/queryKeys'
import { sanitizeBasicText } from '@/utils/text'
import {
  listHomeroomPeriods,
  loadAttendanceGrid,
  saveStudentAttendance,
} from './kepatuhanService'

export function useKepatuhan() {
  const { profile } = useAuth()

  const periodsQuery = useQuery({
    queryKey: queryKeys.kepatuhan.periods(profile?.id, profile?.role),
    queryFn: () => listHomeroomPeriods(profile),
    enabled: Boolean(profile?.id),
  })

  const periods = useMemo(() => periodsQuery.data ?? [], [periodsQuery.data])

  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const attendanceRef = useRef({})

  const [loadingGrid, setLoadingGrid] = useState(false)
  const [isGridLoaded, setIsGridLoaded] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [activeMainTab, setActiveMainTab] = useState('kehadiran')
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [savingRows, setSavingRows] = useState({})

  const successTimerRef = useRef(null)
  const { mutateAsync: saveAttendance } = useMutation({
    mutationFn: saveStudentAttendance,
  })

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    },
    [],
  )

  const showSuccess = useCallback((message) => {
    setSuccess(message)
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    successTimerRef.current = setTimeout(() => setSuccess(''), 3000)
  }, [])

  const handleLoadGrid = useCallback(async () => {
    if (!selectedPeriodId) {
      setError('Pilih kelas perwalian terlebih dahulu.')
      return
    }

    setError('')
    setSuccess('')
    setLoadingGrid(true)
    setIsGridLoaded(false)
    setSelectedStudentId(null)

    try {
      const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)
      if (!selectedPeriod) throw new Error('Kelas perwalian tidak ditemukan.')

      const grid = await loadAttendanceGrid({
        periodId: selectedPeriodId,
        className: selectedPeriod.class_name,
      })

      attendanceRef.current = grid.attendance
      setStudents(grid.students)
      setAttendance(grid.attendance)
      setIsGridLoaded(true)
    } catch (err) {
      setError('Gagal memuat data: ' + err.message)
    } finally {
      setLoadingGrid(false)
    }
  }, [periods, selectedPeriodId])

  const handleChange = useCallback((studentId, field, val) => {
    setAttendance((prev) => {
      const updatedStudent = {
        ...prev[studentId],
        [field]:
          field === 'catatan'
            ? sanitizeBasicText(val)
            : val === ''
              ? 0
              : Math.max(0, Number(val)),
      }
      const newAttendance = { ...prev, [studentId]: updatedStudent }
      attendanceRef.current = newAttendance
      return newAttendance
    })
  }, [])

  const handleSaveSingleStudent = useCallback(
    async (studentId) => {
      const att = attendanceRef.current[studentId]
      if (!att) return false

      try {
        await saveAttendance({
          student_id: att.student_id,
          report_period_id: selectedPeriodId,
          sakit: att.sakit,
          izin: att.izin,
          alpha: att.alpha,
          catatan_khusus: JSON.stringify({
            catatan: att.catatan,
            kokurikuler: att.kokurikuler,
            ekstrakurikuler: att.ekstrakurikuler,
          }),
        })
        return true
      } catch (err) {
        setError('Gagal menyimpan siswa: ' + err.message)
        return false
      }
    },
    [saveAttendance, selectedPeriodId],
  )

  const handleUpdateActivity = useCallback((studentId, tab, newData) => {
    setAttendance((prev) => {
      const updatedStudent = {
        ...prev[studentId],
        [tab]: newData,
      }
      const newAttendance = { ...prev, [studentId]: updatedStudent }
      attendanceRef.current = newAttendance
      return newAttendance
    })
  }, [])

  const handleSaveActivityDB = useCallback(
    async (studentId, tab, studentName) => {
      const saved = await handleSaveSingleStudent(studentId)
      if (saved) {
        showSuccess(
          `Data ${tab === 'kokurikuler' ? 'Kokurikuler' : 'Ekstrakurikuler'} ${studentName} berhasil disimpan!`,
        )
      }
    },
    [handleSaveSingleStudent, showSuccess],
  )

  const handleSaveRow = useCallback(
    async (studentId, studentName) => {
      setSavingRows((prev) => ({ ...prev, [studentId]: true }))
      const saved = await handleSaveSingleStudent(studentId)
      if (saved) {
        showSuccess(`Data kehadiran ${studentName} berhasil disimpan!`)
      }
      setSavingRows((prev) => ({ ...prev, [studentId]: false }))
    },
    [handleSaveSingleStudent, showSuccess],
  )

  const periodsError = periodsQuery.error
    ? 'Gagal mengambil data kelas perwalian.'
    : ''

  return {
    periods,
    loading: periodsQuery.isLoading,
    selectedPeriodId,
    setSelectedPeriodId,
    students,
    attendance,
    loadingGrid,
    isGridLoaded,
    setIsGridLoaded,
    error: error || periodsError,
    success,
    activeMainTab,
    setActiveMainTab,
    selectedStudentId,
    setSelectedStudentId,
    savingRows,
    handleLoadGrid,
    handleChange,
    handleUpdateActivity,
    handleSaveActivityDB,
    handleSaveRow,
  }
}
