import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import {
  calculateFinalRaporScore,
  toNullableNumber,
} from '@/utils/scoreCalculations'
import Swal from '@/lib/swal'
import { sanitizeText } from '@/utils/text'
import {
  createItem,
  createLearningTarget,
  deleteItem as deleteItemRequest,
  deleteLearningTarget,
  fetchItemsAndTargets,
  getPredicatePlacement,
  getStudentScore,
  listActiveReportPeriods,
  listGradePredicates,
  listSubjectsForUser,
  loadInputRaporGrid,
  renameItem as renameItemRequest,
  saveStudentScore,
} from './inputRaporService'

/** Konversi fixed_scores dari DB (number) → string agar cocok dengan input */
const fixedScoresToString = (fixedScores) => {
  const result = {}
  Object.entries(fixedScores ?? {}).forEach(([compId, subObj]) => {
    const subs = {}
    Object.entries(subObj ?? {}).forEach(([key, val]) => {
      subs[key] = val != null ? String(val) : ''
    })
    result[compId] = subs
  })
  return result
}

/** Konversi fixed_scores dari form (string) → number|dihapus agar bersih saat disimpan */
const fixedScoresToNumber = (fixedScores) => {
  const result = {}
  Object.entries(fixedScores ?? {}).forEach(([compId, subObj]) => {
    const subs = {}
    Object.entries(subObj ?? {}).forEach(([key, val]) => {
      const n = toNullableNumber(val)
      if (n !== null) subs[key] = n
    })
    if (Object.keys(subs).length > 0) result[compId] = subs
  })
  return result
}

/**
 * Custom hook untuk Input Nilai Rapor.
 *
 * Komponen penilaian berasal dari snapshot periode (period_components).
 * Countable dengan TP → nilai per TP (scores_formative);
 * countable input langsung → nilai per item (scores_summative);
 * fixed → nilai per sub-nilai (fixed_scores).
 */
export default function useInputRapor() {
  const { profile } = useAuth()
  const [periods, setPeriods] = useState([])
  const [teacherSubjects, setTeacherSubjects] = useState([])
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')

  const [students, setStudents] = useState([])
  const [components, setComponents] = useState([])
  const [items, setItems] = useState([])
  const [learningTargets, setLearningTargets] = useState([])
  const [calculationMode, setCalculationMode] = useState('equal')
  const [scores, setScores] = useState({})
  const [gradePredicates, setGradePredicates] = useState([])
  const [predicatePlacement, setPredicatePlacement] = useState({
    show_on_inputs: false,
    show_on_component_averages: true,
    show_on_final: true,
  })

  const [isGridLoaded, setIsGridLoaded] = useState(false)
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [savingRows, setSavingRows] = useState({})
  const [editingRows, setEditingRows] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showComponentModal, setShowComponentModal] = useState(false)

  const [itemDrafts, setItemDrafts] = useState({})
  const [tpInputs, setTpInputs] = useState({ itemId: '', code: '', description: '' })
  const [modalError, setModalError] = useState('')

  // ── Refs untuk nilai terbaru tanpa memicu re-render ──────────────────────────
  const scoresRef = useRef(scores)
  const savingRowsRef = useRef(savingRows)
  const componentsRef = useRef(components)
  const itemsRef = useRef(items)
  const learningTargetsRef = useRef(learningTargets)
  const calculationModeRef = useRef(calculationMode)
  const selectedPeriodIdRef = useRef(selectedPeriodId)
  const selectedSubjectIdRef = useRef(selectedSubjectId)

  useEffect(() => { scoresRef.current = scores }, [scores])
  useEffect(() => { savingRowsRef.current = savingRows }, [savingRows])
  useEffect(() => { componentsRef.current = components }, [components])
  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { learningTargetsRef.current = learningTargets }, [learningTargets])
  useEffect(() => { calculationModeRef.current = calculationMode }, [calculationMode])
  useEffect(() => { selectedPeriodIdRef.current = selectedPeriodId }, [selectedPeriodId])
  useEffect(() => { selectedSubjectIdRef.current = selectedSubjectId }, [selectedSubjectId])

  const fetchDropdowns = useCallback(async () => {
    if (!profile) return
    setLoadingDropdowns(true)
    setError('')
    try {
      const [periodRows, subjectRows] = await Promise.all([
        listActiveReportPeriods(),
        listSubjectsForUser(profile),
      ])
      setPeriods(periodRows)
      setTeacherSubjects(subjectRows)
    } catch (err) {
      console.error('Error fetching dropdowns:', err)
      setError('Gagal memuat filter kelas/mapel.')
    } finally {
      setLoadingDropdowns(false)
    }
  }, [profile])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDropdowns()
  }, [fetchDropdowns])

  const handleLoadGrid = async () => {
    if (!selectedPeriodId || !selectedSubjectId) {
      setError('Pilih periode rapor dan mata pelajaran terlebih dahulu.')
      return
    }
    setError('')
    setSuccess('')
    setLoadingGrid(true)
    setIsGridLoaded(false)

    try {
      const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)
      if (!selectedPeriod) throw new Error('Periode tidak ditemukan')

      const selectedSubject = teacherSubjects.find((s) => s.id === selectedSubjectId)
      if (!selectedSubject) throw new Error('Mata pelajaran tidak ditemukan')

      if (selectedSubject.class_name) {
        const periodClass = selectedPeriod.class_name || ''
        const subjectClass = selectedSubject.class_name
        const regex = new RegExp('\\b' + subjectClass + '\\b', 'i')
        const isMatch = regex.test(periodClass)
        if (!isMatch) {
          throw new Error(
            `Anda tidak mengajar mata pelajaran ${selectedSubject.name} untuk kelas ${periodClass} (Mata pelajaran ini diset untuk Kelas ${subjectClass}).`
          )
        }
      }

      const [grid, predicates, placement] = await Promise.all([
        loadInputRaporGrid({
          periodId: selectedPeriodId,
          subjectId: selectedSubjectId,
          className: selectedPeriod.class_name,
        }),
        listGradePredicates(),
        getPredicatePlacement(),
      ])

      setStudents(grid.students)
      setComponents(grid.components)
      setItems(grid.items)
      setLearningTargets(grid.learningTargets)
      setCalculationMode(grid.calculationMode)
      setScores(grid.scores)
      setGradePredicates(predicates)
      setPredicatePlacement(placement)
      setIsGridLoaded(true)
    } catch (err) {
      console.error('Load grid failed:', err)
      setError('Gagal memuat lembar penilaian: ' + err.message)
    } finally {
      setLoadingGrid(false)
    }
  }

  // ── Fetch helper: hanya refresh items & TP, TIDAK reset scores ────────────────
  const fetchItemsAndTps = useCallback(async () => {
    const periodId = selectedPeriodIdRef.current
    const subjectId = selectedSubjectIdRef.current
    if (!periodId || !subjectId) return
    const { items: itemData, learningTargets: tpData } = await fetchItemsAndTargets({
      periodId,
      subjectId,
    })
    setItems(itemData)
    setLearningTargets(tpData)
  }, []) // ← stable

  // ── handleScoreChange: STABIL ─────────────────────────────────────────────────
  const handleScoreChange = useCallback((studentId, type, field, value) => {
    const prev = scoresRef.current
    const updated = { ...prev[studentId] }

    if (type === 'formative') {
      updated.scores_formative = { ...updated.scores_formative, [field]: value }
    } else if (type === 'summative') {
      updated.scores_summative = { ...updated.scores_summative, [field]: value }
    } else if (type === 'fixed') {
      // field = "<period_component_id>:<subKey>"
      const separator = field.indexOf(':')
      const componentId = field.slice(0, separator)
      const subKey = field.slice(separator + 1)
      updated.fixed_scores = {
        ...(updated.fixed_scores ?? {}),
        [componentId]: { ...(updated.fixed_scores?.[componentId] ?? {}), [subKey]: value },
      }
    } else {
      if (typeof value === 'string' && (field === 'highest_achievement' || field === 'lowest_achievement')) {
        updated[field] = sanitizeText(value)
      } else {
        updated[field] = value
      }
    }

    const next = { ...prev, [studentId]: updated }
    scoresRef.current = next
    setScores(next)
  }, []) // ← ZERO deps → stabil

  // ── handleSaveSingleRow: STABIL karena pakai refs ────────────────────────────
  const handleSaveSingleRow = useCallback(async (studentId) => {
    if (savingRowsRef.current?.[studentId]) return false
    setSavingRows((prev) => ({ ...prev, [studentId]: true }))

    try {
      const studentScore = scoresRef.current[studentId] || {}
      const currentLearningTargets = learningTargetsRef.current
      const currentComponents = componentsRef.current
      const currentItems = itemsRef.current
      const periodId = selectedPeriodIdRef.current
      const subjectId = selectedSubjectIdRef.current

      const scoresFormativeNumeric = {}
      Object.entries(studentScore.scores_formative || {}).forEach(([key, val]) => {
        const n = toNullableNumber(val)
        if (n !== null) scoresFormativeNumeric[key] = n
      })

      const scoresSummativeNumeric = {}
      Object.entries(studentScore.scores_summative || {}).forEach(([key, val]) => {
        const n = toNullableNumber(val)
        if (n !== null) scoresSummativeNumeric[key] = n
      })

      const fixedScoresNumeric = fixedScoresToNumber(studentScore.fixed_scores)

      const finalScore = calculateFinalRaporScore(
        studentScore,
        currentComponents,
        currentItems,
        currentLearningTargets,
        calculationModeRef.current
      )

      const payload = {
        student_id: studentId,
        report_period_id: periodId,
        subject_id: subjectId,
        scores_formative: scoresFormativeNumeric,
        scores_summative: scoresSummativeNumeric,
        fixed_scores: fixedScoresNumeric,
        highest_achievement: studentScore.highest_achievement || null,
        lowest_achievement: studentScore.lowest_achievement || null,
        final_score: finalScore,
      }

      await saveStudentScore(payload)

      setEditingRows((prev) => ({ ...prev, [studentId]: false }))

      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        icon: 'success',
        title: 'Tersimpan',
      })
      return true
    } catch (err) {
      console.error('Error saving single row:', err)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        icon: 'error',
        title: 'Gagal: ' + err.message,
      })
      return false
    } finally {
      setSavingRows((prev) => ({ ...prev, [studentId]: false }))
    }
  }, []) // ← ZERO deps → stabil

  // ── handleEditRow: STABIL karena pakai refs ──────────────────────────────────
  const handleEditRow = useCallback(async (studentId) => {
    try {
      const periodId = selectedPeriodIdRef.current
      const subjectId = selectedSubjectIdRef.current

      const data = await getStudentScore({ studentId, periodId, subjectId })

      if (data) {
        setScores((prev) => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            scores_formative: data.scores_formative || {},
            scores_summative: data.scores_summative || {},
            fixed_scores: fixedScoresToString(data.fixed_scores),
            highest_achievement: data.highest_achievement || '',
            lowest_achievement: data.lowest_achievement || '',
          },
        }))
      }

      setEditingRows((prev) => ({ ...prev, [studentId]: true }))
    } catch (err) {
      console.error('Error fetching row data for edit:', err)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        icon: 'error',
        title: 'Gagal memuat data: ' + err.message,
      })
    }
  }, []) // ← ZERO deps → stabil

  const restoreStudentScore = useCallback((studentId, snapshot) => {
    const prev = scoresRef.current
    let next

    if (!snapshot) {
      next = { ...prev }
      delete next[studentId]
    } else {
      next = { ...prev, [studentId]: snapshot }
    }

    scoresRef.current = next
    setScores(next)
    setEditingRows((prevEditing) => ({ ...prevEditing, [studentId]: false }))
  }, [])

  // ── Komponen countable: tambah/ubah/hapus item ───────────────────────────────
  const setItemDraft = useCallback((componentId, value) => {
    setItemDrafts((prev) => ({ ...prev, [componentId]: value }))
  }, [])

  const handleAddItem = useCallback(async (componentId, suggestedName) => {
    setModalError('')
    const draft = itemDrafts[componentId]
    const name = sanitizeText((draft ?? suggestedName ?? '').trim())
    if (!name) {
      setModalError('Gagal: Nama item tidak boleh kosong.')
      return
    }
    try {
      await createItem({
        periodId: selectedPeriodIdRef.current,
        subjectId: selectedSubjectIdRef.current,
        componentId,
        name,
      })
      setItemDrafts((prev) => {
        const next = { ...prev }
        delete next[componentId]
        return next
      })
      await fetchItemsAndTps()
    } catch (err) {
      setModalError('Gagal menambah item: ' + err.message)
    }
  }, [itemDrafts, fetchItemsAndTps])

  const handleRenameItem = useCallback(async (itemId, name) => {
    const clean = sanitizeText((name ?? '').trim())
    if (!clean) return
    try {
      await renameItemRequest({ id: itemId, name: clean })
      await fetchItemsAndTps()
    } catch (err) {
      setModalError('Gagal mengubah nama item: ' + err.message)
    }
  }, [fetchItemsAndTps])

  const handleDeleteItem = useCallback(async (id) => {
    const result = await Swal.fire({
      title: 'Hapus item ini?',
      text: 'TP di dalamnya (jika ada) akan ikut terhapus.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
    })
    if (!result.isConfirmed) return
    try {
      await deleteItemRequest(id)
      await fetchItemsAndTps()
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: err.message, icon: 'error' })
    }
  }, [fetchItemsAndTps])

  const handleAddTp = useCallback(async () => {
    setModalError('')
    const cleanCode = sanitizeText(tpInputs.code)
    const cleanDescription = sanitizeText(tpInputs.description)

    if (!tpInputs.itemId) { setModalError('Gagal: Pilih item (Bab) terlebih dahulu.'); return }
    if (!cleanCode) { setModalError('Gagal: Kolom Kode TP harus diisi (contoh: TP1).'); return }
    if (!cleanDescription) { setModalError('Gagal: Deskripsi TP kosong atau hanya berisi karakter tidak valid.'); return }

    try {
      await createLearningTarget({
        itemId: tpInputs.itemId,
        code: cleanCode,
        description: cleanDescription,
      })
      setTpInputs((prev) => ({ ...prev, code: '', description: '' }))
      await fetchItemsAndTps()
    } catch (err) {
      setModalError('Gagal menambah TP: ' + err.message)
    }
  }, [tpInputs, fetchItemsAndTps])

  const handleDeleteTp = useCallback(async (id) => {
    const result = await Swal.fire({
      title: 'Hapus TP?',
      text: 'Anda yakin ingin menghapus Tujuan Pembelajaran ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
    })
    if (!result.isConfirmed) return
    try {
      await deleteLearningTarget(id)
      await fetchItemsAndTps()
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: err.message, icon: 'error' })
    }
  }, [fetchItemsAndTps])

  const handleCloseComponentModal = useCallback(async () => {
    setShowComponentModal(false)
    setModalError('')
    await fetchItemsAndTps()
  }, [fetchItemsAndTps])

  return {
    periods,
    teacherSubjects,
    selectedPeriodId,
    setSelectedPeriodId,
    selectedSubjectId,
    setSelectedSubjectId,
    students,
    components,
    items,
    learningTargets,
    calculationMode,
    gradePredicates,
    predicatePlacement,
    scores,
    isGridLoaded,
    setIsGridLoaded,
    loadingDropdowns,
    loadingGrid,
    savingRows,
    editingRows,
    setEditingRows,
    error,
    success,
    showComponentModal,
    setShowComponentModal,
    itemDrafts,
    setItemDraft,
    tpInputs,
    setTpInputs,
    modalError,
    setModalError,

    handleLoadGrid,
    handleScoreChange,
    handleSaveSingleRow,
    handleEditRow,
    restoreStudentScore,
    handleAddItem,
    handleRenameItem,
    handleDeleteItem,
    handleAddTp,
    handleDeleteTp,
    handleCloseComponentModal,
  }
}
