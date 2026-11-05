import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import {
  calculateFormativeAvg,
  calculateSummativeAvg,
  calculateAvgOfTwo,
  calculateFinalRaporScore,
  toNullableNumber,
} from '@/utils/scoreCalculations'
import Swal from 'sweetalert2'
import { sanitizeText } from '@/utils/text'
import {
  createLearningTarget,
  createMaterial,
  createSummative,
  deleteLearningTarget,
  deleteMaterial as deleteMaterialRequest,
  deleteSummative as deleteSummativeRequest,
  fetchMaterialsAndTargets,
  fetchSummatives as fetchSummativesRequest,
  getStudentScore,
  listActiveReportPeriods,
  listSubjectsForUser,
  loadInputRaporGrid,
  saveStudentScore,
} from './inputRaporService'

/**
 * Custom hook untuk Input Nilai Rapor.
 *
 * PERBAIKAN PERFORMA (laptop RAM 6GB sering hang):
 * 1. learningTargetsRef + summativesRef → handleSaveSingleRow tidak perlu
 *    di-recreate saat array berubah, memutus re-render chain di seluruh ScoreGrid.
 * 2. selectedPeriodIdRef + selectedSubjectIdRef → sama, untuk save & edit row.
 * 3. handleScoreChange sudah pakai useCallback tanpa dep → stabil.
 * 4. Semua handler save/edit stabil → ScoreRow React.memo benar-benar bekerja,
 *    hanya baris yang berubah yang re-render, bukan seluruh tabel.
 */
export default function useInputRapor() {
  const { profile } = useAuth()
  const [periods, setPeriods] = useState([])
  const [teacherSubjects, setTeacherSubjects] = useState([])
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')

  const [students, setStudents] = useState([])
  const [materials, setMaterials] = useState([])
  const [learningTargets, setLearningTargets] = useState([])
  const [summatives, setSummatives] = useState([])
  const [scores, setScores] = useState({})

  const [isGridLoaded, setIsGridLoaded] = useState(false)
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [savingRows, setSavingRows] = useState({})
  const [editingRows, setEditingRows] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [showSummativeModal, setShowSummativeModal] = useState(false)

  const [newMaterialName, setNewMaterialName] = useState('')
  const [tpInputs, setTpInputs] = useState({ materialId: '', code: '', description: '' })
  const [newSummativeName, setNewSummativeName] = useState('')
  const [modalError, setModalError] = useState('')

  // ── Refs untuk nilai terbaru tanpa memicu re-render ──────────────────────────
  const scoresRef = useRef(scores)
  const savingRowsRef = useRef(savingRows)
  // FIX: Tambahkan refs untuk arrays & IDs agar callback tidak perlu di-recreate
  const learningTargetsRef = useRef(learningTargets)
  const summativesRef = useRef(summatives)
  const selectedPeriodIdRef = useRef(selectedPeriodId)
  const selectedSubjectIdRef = useRef(selectedSubjectId)

  useEffect(() => { scoresRef.current = scores }, [scores])
  useEffect(() => { savingRowsRef.current = savingRows }, [savingRows])
  useEffect(() => { learningTargetsRef.current = learningTargets }, [learningTargets])
  useEffect(() => { summativesRef.current = summatives }, [summatives])
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

      const grid = await loadInputRaporGrid({
        periodId: selectedPeriodId,
        subjectId: selectedSubjectId,
        className: selectedPeriod.class_name,
      })

      setStudents(grid.students)
      setMaterials(grid.materials)
      setSummatives(grid.summatives)
      setLearningTargets(grid.learningTargets)
      setScores(grid.scores)
      setIsGridLoaded(true)
    } catch (err) {
      console.error('Load grid failed:', err)
      setError('Gagal memuat lembar penilaian: ' + err.message)
    } finally {
      setLoadingGrid(false)
    }
  }

  // ── Fetch helper: hanya refresh kolom, TIDAK reset scores ────────────────────
  const fetchMaterialsAndTps = useCallback(async () => {
    const periodId = selectedPeriodIdRef.current
    const subjectId = selectedSubjectIdRef.current
    const { materials: mData, learningTargets: tpData } = await fetchMaterialsAndTargets({
      periodId,
      subjectId,
    })
    setMaterials(mData)
    setLearningTargets(tpData)
  }, []) // ← stable, tidak ada dep yang berubah-ubah

  const fetchSummatives = useCallback(async () => {
    const periodId = selectedPeriodIdRef.current
    const subjectId = selectedSubjectIdRef.current
    const sumData = await fetchSummativesRequest({ periodId, subjectId })
    setSummatives(sumData)
  }, []) // ← stable

  // ── handleScoreChange: STABIL, tidak pernah berubah referensi ────────────────
  const handleScoreChange = useCallback((studentId, type, field, value) => {
    const prev = scoresRef.current
    const updated = { ...prev[studentId] }

    if (type === 'formative') {
      updated.scores_formative = { ...updated.scores_formative, [field]: value }
    } else if (type === 'summative') {
      updated.scores_summative = { ...updated.scores_summative, [field]: value }
    } else {
      if (typeof value === 'string' && (field === 'highest_achievement' || field === 'lowest_achievement')) {
        updated[field] = sanitizeText(value)
      } else {
        updated[field] = value
      }
    }

    // Sinkronkan ref langsung agar save yang dipicu tepat setelah blur
    // (mis. tombol Simpan di sheet mobile) membaca nilai terbaru.
    const next = { ...prev, [studentId]: updated }
    scoresRef.current = next
    setScores(next)
  }, []) // ← ZERO deps → referensi tidak pernah berubah → ScoreRow.memo efektif

  // ── handleSaveSingleRow: STABIL karena pakai refs, bukan closure ─────────────
  const handleSaveSingleRow = useCallback(async (studentId) => {
    if (savingRowsRef.current?.[studentId]) return false
    setSavingRows((prev) => ({ ...prev, [studentId]: true }))

    try {
      const studentScore = scoresRef.current[studentId] || {}
      // Ambil dari refs, bukan closure → tidak perlu LT/summatives di dep array
      const currentLearningTargets = learningTargetsRef.current
      const currentSummatives = summativesRef.current
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

      const finalScore = calculateFinalRaporScore(studentScore, currentLearningTargets, currentSummatives)

      const payload = {
        student_id: studentId,
        report_period_id: periodId,
        subject_id: subjectId,
        scores_formative: scoresFormativeNumeric,
        scores_summative: scoresSummativeNumeric,
        sts_practice: toNullableNumber(studentScore.sts_practice),
        sts_written: toNullableNumber(studentScore.sts_written),
        sas_practice: toNullableNumber(studentScore.sas_practice),
        sas_written: toNullableNumber(studentScore.sas_written),
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
        background: '#0f172a',
        color: '#f8fafc',
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
        background: '#0f172a',
        color: '#f8fafc',
      })
      return false
    } finally {
      setSavingRows((prev) => ({ ...prev, [studentId]: false }))
    }
  }, []) // ← ZERO deps → referensi stabil → ScoreRow.memo efektif

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
            sts_practice: data.sts_practice != null ? String(data.sts_practice) : '',
            sts_written: data.sts_written != null ? String(data.sts_written) : '',
            sas_practice: data.sas_practice != null ? String(data.sas_practice) : '',
            sas_written: data.sas_written != null ? String(data.sas_written) : '',
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
        background: '#0f172a',
        color: '#f8fafc',
      })
    }
  }, []) // ← ZERO deps → stabil

  /**
   * Kembalikan nilai siswa ke snapshot sebelum diedit, lalu matikan mode edit.
   * Dipakai oleh editor mobile saat pengguna menutup tanpa menyimpan.
   */
  const restoreStudentScore = useCallback((studentId, snapshot) => {
    const prev = scoresRef.current
    let next

    if (!snapshot) {
      next = { ...prev }
      delete next[studentId]
    } else {
      next = { ...prev, [studentId]: snapshot }
    }

    // Sinkronkan ref langsung agar snapshot berikutnya tidak memakai nilai
    // yang sudah dibatalkan.
    scoresRef.current = next
    setScores(next)
    setEditingRows((prevEditing) => ({ ...prevEditing, [studentId]: false }))
  }, [])

  // ── Modal handlers ───────────────────────────────────────────────────────────
  const handleAddMaterial = async () => {
    setModalError('')
    const cleanName = sanitizeText(newMaterialName)
    if (!cleanName) {
      setModalError('Gagal: Nama lingkup materi tidak boleh kosong.')
      return
    }
    try {
      await createMaterial({
        periodId: selectedPeriodIdRef.current,
        subjectId: selectedSubjectIdRef.current,
        name: cleanName,
      })
      setNewMaterialName('')
      await fetchMaterialsAndTps()
    } catch (err) {
      setModalError('Gagal menambah lingkup materi: ' + err.message)
    }
  }

  const handleDeleteMaterial = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Lingkup Materi?',
      text: 'TP di dalamnya akan ikut terhapus.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#f43f5e',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      background: '#0f172a',
      color: '#f8fafc',
    })
    if (!result.isConfirmed) return
    try {
      await deleteMaterialRequest(id)
      await fetchMaterialsAndTps()
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: err.message, icon: 'error', background: '#0f172a', color: '#f8fafc' })
    }
  }

  const handleAddTp = async () => {
    setModalError('')
    const cleanCode = sanitizeText(tpInputs.code)
    const cleanDescription = sanitizeText(tpInputs.description)

    if (!tpInputs.materialId) { setModalError('Gagal: Pilih Lingkup Materi (Bab) terlebih dahulu.'); return }
    if (!cleanCode) { setModalError('Gagal: Kolom Kode TP harus diisi (contoh: TP1).'); return }
    if (!cleanDescription) { setModalError('Gagal: Deskripsi TP kosong atau hanya berisi karakter tidak valid. Ketik ulang teks ini.'); return }

    try {
      await createLearningTarget({
        materialId: tpInputs.materialId,
        code: cleanCode,
        description: cleanDescription,
      })
      setTpInputs({ ...tpInputs, code: '', description: '' })
      await fetchMaterialsAndTps()
    } catch (err) {
      setModalError('Gagal menambah TP: ' + err.message)
    }
  }

  const handleDeleteTp = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus TP?',
      text: 'Anda yakin ingin menghapus Tujuan Pembelajaran ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#f43f5e',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      background: '#0f172a',
      color: '#f8fafc',
    })
    if (!result.isConfirmed) return
    try {
      await deleteLearningTarget(id)
      await fetchMaterialsAndTps()
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: err.message, icon: 'error', background: '#0f172a', color: '#f8fafc' })
    }
  }

  const handleAddSummative = async () => {
    if (!newSummativeName.trim()) return
    try {
      const cleanName = sanitizeText(newSummativeName)
      await createSummative({
        periodId: selectedPeriodIdRef.current,
        subjectId: selectedSubjectIdRef.current,
        name: cleanName,
      })
      setNewSummativeName('')
      await fetchSummatives()
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: err.message, icon: 'error', background: '#0f172a', color: '#f8fafc' })
    }
  }

  const handleDeleteSummative = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Sumatif?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#f43f5e',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      background: '#0f172a',
      color: '#f8fafc',
    })
    if (!result.isConfirmed) return
    try {
      await deleteSummativeRequest(id)
      await fetchSummatives()
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: err.message, icon: 'error', background: '#0f172a', color: '#f8fafc' })
    }
  }

  const handleCloseMaterialModal = useCallback(async () => {
    setShowMaterialModal(false)
    await fetchMaterialsAndTps()
  }, [fetchMaterialsAndTps])

  const handleCloseSummativeModal = useCallback(async () => {
    setShowSummativeModal(false)
    await fetchSummatives()
  }, [fetchSummatives])

  return {
    periods,
    teacherSubjects,
    selectedPeriodId,
    setSelectedPeriodId,
    selectedSubjectId,
    setSelectedSubjectId,
    students,
    materials,
    learningTargets,
    summatives,
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
    showMaterialModal,
    setShowMaterialModal,
    showSummativeModal,
    setShowSummativeModal,
    newMaterialName,
    setNewMaterialName,
    tpInputs,
    setTpInputs,
    newSummativeName,
    setNewSummativeName,
    modalError,
    setModalError,

    handleLoadGrid,
    handleScoreChange,
    handleSaveSingleRow,
    handleEditRow,
    restoreStudentScore,
    handleAddMaterial,
    handleDeleteMaterial,
    handleAddTp,
    handleDeleteTp,
    handleAddSummative,
    handleDeleteSummative,
    handleCloseMaterialModal,
    handleCloseSummativeModal,

    calculateFormativeAvg,
    calculateSummativeAvg,
    calculateAvgOfTwo,
    calculateFinalRaporScore,
  }
}