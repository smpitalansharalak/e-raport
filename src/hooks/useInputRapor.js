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
 * Menghapus: null bytes, control chars, zero-width spaces, soft hyphens, BOM, dll.
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return str
  return str
    // Hapus null bytes dan ASCII control characters (kecuali tab \x09 dan newline \x0A \x0D)
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    // Hapus karakter invisible Unicode dari Word: soft hyphen, zero-width space,
    // zero-width non-joiner, zero-width joiner, BOM, object replacement char, dll
    .replace(/[\u00AD\u200B\u200C\u200D\u200E\u200F\uFEFF\uFFFC\u2028\u2029]/g, '')
    // Normalkan multiple spaces/tabs menjadi satu spasi, tapi pertahankan newlines
    .replace(/[ \t]+/g, ' ')
    // Normalkan Windows line endings (\r\n) dan Mac (\r) menjadi Unix (\n)
    .replace(/\r\n|\r/g, '\n')
    .trim()
}

/**
 * Custom hook yang mengandung semua state & business logic
 * untuk halaman Input Nilai Rapor.
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

  // Keep references to state values to prevent recreation of callback handlers
  const scoresRef = useRef(scores)
  const savingRowsRef = useRef(savingRows)

  useEffect(() => {
    scoresRef.current = scores
  }, [scores])

  useEffect(() => {
    savingRowsRef.current = savingRows
  }, [savingRows])

  useEffect(() => {
    if (profile) {
      fetchDropdowns()
    }
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

      const { data: sData, error: sErr } = await supabase
        .from('students')
        .select('id, name, nisn')
        .eq('class_name', selectedPeriod.class_name)
        .order('name', { ascending: true })
      if (sErr) throw sErr
      setStudents(sData || [])

      // Fetch materials, TPs, summatives secara paralel
      await Promise.all([
        fetchMaterialsAndTpsInternal(),
        fetchSummativesInternal(),
      ])

      const { data: scoreData, error: scoreErr } = await supabase
        .from('student_scores')
        .select('student_id, scores_formative, scores_summative, sts_practice, sts_written, sas_practice, sas_written, highest_achievement, lowest_achievement')
        .eq('report_period_id', selectedPeriodId)
        .eq('subject_id', selectedSubjectId)
      if (scoreErr) throw scoreErr

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
            sts_practice: row.sts_practice !== null && row.sts_practice !== undefined ? String(row.sts_practice) : '',
            sts_written: row.sts_written !== null && row.sts_written !== undefined ? String(row.sts_written) : '',
            sas_practice: row.sas_practice !== null && row.sas_practice !== undefined ? String(row.sas_practice) : '',
            sas_written: row.sas_written !== null && row.sas_written !== undefined ? String(row.sas_written) : '',
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

  // Internal fetch yang return data tanpa set state (untuk paralel load)
  const fetchMaterialsAndTpsInternal = async () => {
    const { data: mData, error: mErr } = await supabase
      .from('materials')
      .select('id, name')
      .eq('report_period_id', selectedPeriodId)
      .eq('subject_id', selectedSubjectId)
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
      return { materials: mData, learningTargets: tpData }
    } else {
      setLearningTargets([])
      return { materials: [], learningTargets: [] }
    }
  }

  const fetchSummativesInternal = async () => {
    const { data: sumData, error: sumErr } = await supabase
      .from('summatives')
      .select('id, name')
      .eq('report_period_id', selectedPeriodId)
      .eq('subject_id', selectedSubjectId)
      .order('created_at', { ascending: true })
    if (sumErr) throw sumErr
    setSummatives(sumData || [])
    return sumData || []
  }

  // Untuk dipanggil dari modal — hanya refresh struktur kolom, TIDAK reset scores
  const fetchMaterialsAndTps = async () => {
    const { data: mData, error: mErr } = await supabase
      .from('materials')
      .select('id, name')
      .eq('report_period_id', selectedPeriodId)
      .eq('subject_id', selectedSubjectId)
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
  }

  const fetchSummatives = async () => {
    const { data: sumData, error: sumErr } = await supabase
      .from('summatives')
      .select('id, name')
      .eq('report_period_id', selectedPeriodId)
      .eq('subject_id', selectedSubjectId)
      .order('created_at', { ascending: true })
    if (sumErr) throw sumErr
    setSummatives(sumData || [])
  }

  // handleScoreChange — konversi Number hanya untuk field numerik
  const handleScoreChange = useCallback((studentId, type, field, value) => {
    setScores((prev) => {
      const updated = { ...prev[studentId] }

      if (type === 'formative') {
        updated.scores_formative = {
          ...updated.scores_formative,
          [field]: value,
        }
      } else if (type === 'summative') {
        updated.scores_summative = {
          ...updated.scores_summative,
          [field]: value,
        }
      } else {
        // Gunakan sanitizeText untuk field teks agar invisible chars dari Word tidak lolos
        if (typeof value === 'string' && (field === 'highest_achievement' || field === 'lowest_achievement')) {
          updated[field] = sanitizeText(value)
        } else {
          updated[field] = value
        }
      }

      return {
        ...prev,
        [studentId]: updated,
      }
    })
  }, [])

  const handleSaveSingleRow = useCallback(async (studentId) => {
    // Prevent duplicate saves
    if (savingRowsRef.current?.[studentId]) return
    setSavingRows((prev) => ({ ...prev, [studentId]: true }))

    try {
      const studentScore = scoresRef.current[studentId]

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

      const finalScore = calculateFinalRaporScore(studentScore, learningTargets, summatives)

      const payload = {
        student_id: studentId,
        report_period_id: selectedPeriodId,
        subject_id: selectedSubjectId,
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
        .upsert(payload, {
          onConflict: 'student_id,report_period_id,subject_id',
        })

      if (saveErr) throw saveErr

      setEditingRows((prev) => ({ ...prev, [studentId]: false }))

      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
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
  }, [selectedPeriodId, selectedSubjectId, learningTargets, summatives])

  const handleEditRow = useCallback(async (studentId) => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('student_scores')
        .select(
          'student_id, scores_formative, scores_summative, sts_practice, sts_written, sas_practice, sas_written, highest_achievement, lowest_achievement'
        )
        .eq('student_id', studentId)
        .eq('report_period_id', selectedPeriodId)
        .eq('subject_id', selectedSubjectId)
        .maybeSingle()

      if (fetchErr) throw fetchErr

      if (data) {
        // Update scores state dengan data terbaru dari DB
        setScores((prev) => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            scores_formative: data.scores_formative || {},
            scores_summative: data.scores_summative || {},
            sts_practice:
              data.sts_practice !== null && data.sts_practice !== undefined
                ? String(data.sts_practice)
                : '',
            sts_written:
              data.sts_written !== null && data.sts_written !== undefined
                ? String(data.sts_written)
                : '',
            sas_practice:
              data.sas_practice !== null && data.sas_practice !== undefined
                ? String(data.sas_practice)
                : '',
            sas_written:
              data.sas_written !== null && data.sas_written !== undefined
                ? String(data.sas_written)
                : '',
            highest_achievement: data.highest_achievement || '',
            lowest_achievement: data.lowest_achievement || '',
          },
        }))
      }

      // Aktifkan mode edit setelah data di-load
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
  }, [selectedPeriodId, selectedSubjectId])

  const handleAddMaterial = async () => {
    setModalError('')
    const cleanName = sanitizeText(newMaterialName)
    if (!cleanName) {
      setModalError('Gagal: Nama lingkup materi tidak boleh kosong.')
      return
    }
    try {
      const { error } = await supabase.from('materials').insert({
        report_period_id: selectedPeriodId,
        subject_id: selectedSubjectId,
        name: cleanName,
      })
      if (error) throw error
      setNewMaterialName('')
      await fetchMaterialsAndTps()
    } catch (err) {
      console.error('Error in handleAddMaterial:', err)
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
      Swal.fire({
        title: 'Gagal',
        text: 'Gagal menghapus lingkup materi: ' + err.message,
        icon: 'error',
        background: '#0f172a',
        color: '#f8fafc',
      })
    }
  }

  const handleAddTp = async () => {
    setModalError('')
    
    // Sanitasi dulu sebelum validasi agar invisible chars tidak lolos
    const cleanCode = sanitizeText(tpInputs.code)
    const cleanDescription = sanitizeText(tpInputs.description)

    // Validasi setelah sanitasi
    if (!tpInputs.materialId) {
      setModalError('Gagal: Pilih Lingkup Materi (Bab) terlebih dahulu.')
      return
    }
    if (!cleanCode) {
      setModalError('Gagal: Kolom Kode TP harus diisi (contoh: TP1).')
      return
    }
    if (!cleanDescription) {
      setModalError('Gagal: Deskripsi TP kosong atau hanya berisi karakter tidak valid. Ketik ulang teks ini.')
      return
    }

    try {
      const { error } = await supabase.from('learning_targets').insert({
        material_id: tpInputs.materialId,
        code: cleanCode,
        description: cleanDescription,
      })
      
      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }
      
      setTpInputs({ ...tpInputs, code: '', description: '' })
      await fetchMaterialsAndTps()
    } catch (err) {
      console.error('Error in handleAddTp:', err)
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
      Swal.fire({
        title: 'Gagal',
        text: 'Gagal menghapus TP: ' + err.message,
        icon: 'error',
        background: '#0f172a',
        color: '#f8fafc',
      })
    }
  }

  const handleAddSummative = async () => {
    if (!newSummativeName.trim()) return
    try {
      const cleanName = newSummativeName.trim().replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      const { error } = await supabase.from('summatives').insert({
        report_period_id: selectedPeriodId,
        subject_id: selectedSubjectId,
        name: cleanName,
      })
      if (error) throw error
      setNewSummativeName('')
      await fetchSummatives()
    } catch (err) {
      Swal.fire({
        title: 'Gagal',
        text: 'Gagal menambah sumatif: ' + err.message,
        icon: 'error',
        background: '#0f172a',
        color: '#f8fafc',
      })
    }
  }

  const handleDeleteSummative = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Sumatif?',
      text: 'Anda yakin ingin menghapus Sumatif ini?',
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
      Swal.fire({
        title: 'Gagal',
        text: 'Gagal menghapus sumatif: ' + err.message,
        icon: 'error',
        background: '#0f172a',
        color: '#f8fafc',
      })
    }
  }

  // Tutup modal tanpa memanggil handleLoadGrid() agar scores tidak di-reset
  const handleCloseMaterialModal = async () => {
    setShowMaterialModal(false)
    await fetchMaterialsAndTps()
  }

  const handleCloseSummativeModal = async () => {
    setShowSummativeModal(false)
    await fetchSummatives()
  }

  return {
    // State
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

    // Handlers
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

    // Calculation helpers (re-exported for ScoreGrid)
    calculateFormativeAvg,
    calculateSummativeAvg,
    calculateAvgOfTwo,
    calculateFinalRaporScore,
  }
}
