import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  calculateFormativeAvg,
  calculateSummativeAvg,
  calculateAvgOfTwo,
  calculateFinalRaporScore,
  toNullableNumber,
} from '../utils/scoreCalculations'
import Swal from 'sweetalert2'

/**
 * Sanitasi teks dari karakter tidak terlihat yang sering terbawa saat copy-paste
 * dari Microsoft Word, Notepad, atau aplikasi lain.
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u00AD\u200B\u200C\u200D\u200E\u200F\uFEFF\uFFFC\u2028\u2029]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n|\r/g, '\n')
    .trim()
}

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

  useEffect(() => {
    if (profile) fetchDropdowns()
  }, [profile])

  const fetchDropdowns = async () => {
    setLoadingDropdowns(true)
    setError('')
    try {
      const { data: pData, error: pErr } = await supabase
        .from('report_periods')
        .select('id, name, class_name, semester, academic_year')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (pErr) throw pErr
      setPeriods(pData || [])

      if (profile.role === 'admin') {
        const { data: sData, error: sErr } = await supabase
          .from('subjects')
          .select('id, name, class_name')
          .order('name', { ascending: true })
        if (sErr) throw sErr
        setTeacherSubjects(sData || [])
      } else {
        const { data: tsData, error: tsErr } = await supabase
          .from('teacher_subjects')
          .select(`subject:subjects(id, name, class_name)`)
          .eq('teacher_id', profile.id)
        if (tsErr) throw tsErr
        setTeacherSubjects(tsData.map((row) => row.subject).filter(Boolean))
      }
    } catch (err) {
      console.error('Error fetching dropdowns:', err)
      setError('Gagal memuat filter kelas/mapel.')
    } finally {
      setLoadingDropdowns(false)
    }
  }

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
        const isMatch =
          periodClass.toLowerCase().startsWith(subjectClass.toLowerCase()) ||
          periodClass.toLowerCase().includes(subjectClass.toLowerCase())
        if (!isMatch) {
          throw new Error(
            `Anda tidak mengajar mata pelajaran ${selectedSubject.name} untuk kelas ${periodClass} (Mata pelajaran ini diset untuk Kelas ${subjectClass}).`
          )
        }
      }

      // Fetch semua data secara paralel untuk mengurangi waktu tunggu
      const [studentsResult, materialsResult, summativesResult] = await Promise.all([
        supabase
          .from('students')
          .select('id, name, nisn')
          .eq('class_name', selectedPeriod.class_name)
          .eq('status', 'aktif')
          .order('name', { ascending: true }),
        supabase
          .from('materials')
          .select('id, name')
          .eq('report_period_id', selectedPeriodId)
          .eq('subject_id', selectedSubjectId)
          .order('created_at', { ascending: true }),
        supabase
          .from('summatives')
          .select('id, name')
          .eq('report_period_id', selectedPeriodId)
          .eq('subject_id', selectedSubjectId)
          .order('created_at', { ascending: true }),
      ])

      if (studentsResult.error) throw studentsResult.error
      if (materialsResult.error) throw materialsResult.error
      if (summativesResult.error) throw summativesResult.error

      const sData = studentsResult.data || []
      const mData = materialsResult.data || []
      const sumData = summativesResult.data || []

      setStudents(sData)
      setMaterials(mData)
      setSummatives(sumData)

      // Fetch TPs jika ada materials
      let tpData = []
      if (mData.length > 0) {
        const { data: tps, error: tpErr } = await supabase
          .from('learning_targets')
          .select('id, code, material_id, description')
          .in('material_id', mData.map((m) => m.id))
          .order('code', { ascending: true })
        if (tpErr) throw tpErr
        tpData = tps || []
      }
      setLearningTargets(tpData)

      // Fetch scores
      const { data: scoreData, error: scoreErr } = await supabase
        .from('student_scores')
        .select('student_id, scores_formative, scores_summative, sts_practice, sts_written, sas_practice, sas_written, highest_achievement, lowest_achievement')
        .eq('report_period_id', selectedPeriodId)
        .eq('subject_id', selectedSubjectId)
      if (scoreErr) throw scoreErr

      // Build score map
      const sMap = {}
      sData.forEach((s) => {
        sMap[s.id] = {
          student_id: s.id,
          scores_formative: {},
          scores_summative: {},
          sts_practice: '',
          sts_written: '',
          sas_practice: '',
          sas_written: '',
          highest_achievement: '',
          lowest_achievement: '',
        }
      })

      scoreData.forEach((row) => {
        if (sMap[row.student_id]) {
          sMap[row.student_id] = {
            ...sMap[row.student_id],
            scores_formative: row.scores_formative || {},
            scores_summative: row.scores_summative || {},
            sts_practice: row.sts_practice != null ? String(row.sts_practice) : '',
            sts_written: row.sts_written != null ? String(row.sts_written) : '',
            sas_practice: row.sas_practice != null ? String(row.sas_practice) : '',
            sas_written: row.sas_written != null ? String(row.sas_written) : '',
            highest_achievement: row.highest_achievement || '',
            lowest_achievement: row.lowest_achievement || '',
          }
        }
      })

      setScores(sMap)
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
    const { data: mData, error: mErr } = await supabase
      .from('materials')
      .select('id, name')
      .eq('report_period_id', periodId)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true })
    if (mErr) throw mErr
    setMaterials(mData || [])

    if (mData && mData.length > 0) {
      const { data: tpData, error: tpErr } = await supabase
        .from('learning_targets')
        .select('id, code, material_id, description')
        .in('material_id', mData.map((m) => m.id))
        .order('code', { ascending: true })
      if (tpErr) throw tpErr
      setLearningTargets(tpData || [])
    } else {
      setLearningTargets([])
    }
  }, []) // ← stable, tidak ada dep yang berubah-ubah

  const fetchSummatives = useCallback(async () => {
    const periodId = selectedPeriodIdRef.current
    const subjectId = selectedSubjectIdRef.current
    const { data: sumData, error: sumErr } = await supabase
      .from('summatives')
      .select('id, name')
      .eq('report_period_id', periodId)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true })
    if (sumErr) throw sumErr
    setSummatives(sumData || [])
  }, []) // ← stable

  // ── handleScoreChange: STABIL, tidak pernah berubah referensi ────────────────
  const handleScoreChange = useCallback((studentId, type, field, value) => {
    setScores((prev) => {
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

      return { ...prev, [studentId]: updated }
    })
  }, []) // ← ZERO deps → referensi tidak pernah berubah → ScoreRow.memo efektif

  // ── handleSaveSingleRow: STABIL karena pakai refs, bukan closure ─────────────
  const handleSaveSingleRow = useCallback(async (studentId) => {
    if (savingRowsRef.current?.[studentId]) return
    setSavingRows((prev) => ({ ...prev, [studentId]: true }))

    try {
      const studentScore = scoresRef.current[studentId]
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

      const { error: saveErr } = await supabase
        .from('student_scores')
        .upsert(payload, { onConflict: 'student_id,report_period_id,subject_id' })

      if (saveErr) throw saveErr

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
    } finally {
      setSavingRows((prev) => ({ ...prev, [studentId]: false }))
    }
  }, []) // ← ZERO deps → referensi stabil → ScoreRow.memo efektif

  // ── handleEditRow: STABIL karena pakai refs ──────────────────────────────────
  const handleEditRow = useCallback(async (studentId) => {
    try {
      const periodId = selectedPeriodIdRef.current
      const subjectId = selectedSubjectIdRef.current

      const { data, error: fetchErr } = await supabase
        .from('student_scores')
        .select(
          'student_id, scores_formative, scores_summative, sts_practice, sts_written, sas_practice, sas_written, highest_achievement, lowest_achievement'
        )
        .eq('student_id', studentId)
        .eq('report_period_id', periodId)
        .eq('subject_id', subjectId)
        .maybeSingle()

      if (fetchErr) throw fetchErr

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

  // ── Modal handlers ───────────────────────────────────────────────────────────
  const handleAddMaterial = async () => {
    setModalError('')
    const cleanName = sanitizeText(newMaterialName)
    if (!cleanName) {
      setModalError('Gagal: Nama lingkup materi tidak boleh kosong.')
      return
    }
    try {
      const { error } = await supabase.from('materials').insert({
        report_period_id: selectedPeriodIdRef.current,
        subject_id: selectedSubjectIdRef.current,
        name: cleanName,
      })
      if (error) throw error
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
      const { error } = await supabase.from('materials').delete().eq('id', id)
      if (error) throw error
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
      const { error } = await supabase.from('learning_targets').insert({
        material_id: tpInputs.materialId,
        code: cleanCode,
        description: cleanDescription,
      })
      if (error) throw error
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
      const { error } = await supabase.from('learning_targets').delete().eq('id', id)
      if (error) throw error
      await fetchMaterialsAndTps()
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: err.message, icon: 'error', background: '#0f172a', color: '#f8fafc' })
    }
  }

  const handleAddSummative = async () => {
    if (!newSummativeName.trim()) return
    try {
      const cleanName = sanitizeText(newSummativeName)
      const { error } = await supabase.from('summatives').insert({
        report_period_id: selectedPeriodIdRef.current,
        subject_id: selectedSubjectIdRef.current,
        name: cleanName,
      })
      if (error) throw error
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
      const { error } = await supabase.from('summatives').delete().eq('id', id)
      if (error) throw error
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