import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  FileEdit,
  Sliders,
  Save,
  Plus,
  Trash2,
  X,
  AlertCircle,
  Check,
  CheckCircle,
  HelpCircle,
} from 'lucide-react'

export default function InputRapor() {
  const { profile } = useAuth()
  const [periods, setPeriods] = useState([])
  const [teacherSubjects, setTeacherSubjects] = useState([])
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')

  // State loaded after choosing period & subject
  const [students, setStudents] = useState([])
  const [materials, setMaterials] = useState([])
  const [learningTargets, setLearningTargets] = useState([]) // flat list of TPs
  const [summatives, setSummatives] = useState([])
  const [scores, setScores] = useState({}) // key: student_id, value: score object

  const [isGridLoaded, setIsGridLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [showSummativeModal, setShowSummativeModal] = useState(false)

  // Material Form state
  const [newMaterialName, setNewMaterialName] = useState('')
  const [tpInputs, setTpInputs] = useState({ materialId: '', code: '', description: '' })

  // Summative Form state
  const [newSummativeName, setNewSummativeName] = useState('')

  useEffect(() => {
    if (profile) {
      fetchDropdowns()
    }
  }, [profile])

  const fetchDropdowns = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch periods
      const { data: pData, error: pErr } = await supabase
        .from('report_periods')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (pErr) throw pErr
      setPeriods(pData || [])

      // 2. Fetch subjects taught by the teacher (if admin, fetch all)
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
          .select(`
            subject:subjects(id, name, class_name)
          `)
          .eq('teacher_id', profile.id)
        if (tsErr) throw tsErr
        setTeacherSubjects(tsData.map((row) => row.subject).filter(Boolean))
      }
    } catch (err) {
      console.error('Error fetching dropdowns:', err)
      setError('Gagal memuat filter kelas/mapel.')
    } finally {
      setLoading(false)
    }
  }

  // Load grading grid
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

      // Validate that the subject class matches the period's class
      if (selectedSubject.class_name) {
        const periodClass = selectedPeriod.class_name || ''
        const subjectClass = selectedSubject.class_name

        const isMatch = periodClass.toLowerCase().startsWith(subjectClass.toLowerCase()) ||
          periodClass.toLowerCase().includes(subjectClass.toLowerCase())

        if (!isMatch) {
          throw new Error(`Anda tidak mengajar mata pelajaran ${selectedSubject.name} untuk kelas ${periodClass} (Mata pelajaran ini diset untuk Kelas ${subjectClass}).`)
        }
      }

      // 1. Fetch students in this class
      const { data: sData, error: sErr } = await supabase
        .from('students')
        .select('*')
        .eq('class_name', selectedPeriod.class_name)
        .order('name', { ascending: true })
      if (sErr) throw sErr
      setStudents(sData || [])

      // 2. Fetch materials & TPs
      await fetchMaterialsAndTps()

      // 3. Fetch summatives
      await fetchSummatives()

      // 4. Fetch existing scores
      const { data: scoreData, error: scoreErr } = await supabase
        .from('student_scores')
        .select('*')
        .eq('report_period_id', selectedPeriodId)
        .eq('subject_id', selectedSubjectId)
      if (scoreErr) throw scoreErr

      // Format scores map
      const sMap = {}
      // Initialize with default template for each student
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

      // Merge existing database scores
      scoreData.forEach((row) => {
        sMap[row.student_id] = {
          ...sMap[row.student_id],
          scores_formative: row.scores_formative || {},
          scores_summative: row.scores_summative || {},
          sts_practice: row.sts_practice !== null ? row.sts_practice : '',
          sts_written: row.sts_written !== null ? row.sts_written : '',
          sas_practice: row.sas_practice !== null ? row.sas_practice : '',
          sas_written: row.sas_written !== null ? row.sas_written : '',
          highest_achievement: row.highest_achievement || '',
          lowest_achievement: row.lowest_achievement || '',
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

  const fetchMaterialsAndTps = async () => {
    const { data: mData, error: mErr } = await supabase
      .from('materials')
      .select('*')
      .eq('report_period_id', selectedPeriodId)
      .eq('subject_id', selectedSubjectId)
      .order('created_at', { ascending: true })
    if (mErr) throw mErr
    setMaterials(mData || [])

    if (mData && mData.length > 0) {
      const { data: tpData, error: tpErr } = await supabase
        .from('learning_targets')
        .select('*')
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
      .select('*')
      .eq('report_period_id', selectedPeriodId)
      .eq('subject_id', selectedSubjectId)
      .order('created_at', { ascending: true })
    if (sumErr) throw sumErr
    setSummatives(sumData || [])
  }

  // UPDATE CELL SCORES IN STATE
  const handleScoreChange = (studentId, type, field, value) => {
    const updated = { ...scores[studentId] }

    if (type === 'formative') {
      updated.scores_formative = {
        ...updated.scores_formative,
        [field]: value === '' ? '' : Number(value),
      }
    } else if (type === 'summative') {
      updated.scores_summative = {
        ...updated.scores_summative,
        [field]: value === '' ? '' : Number(value),
      }
    } else {
      updated[field] = value === '' ? '' : value
    }

    setScores({
      ...scores,
      [studentId]: updated,
    })
  }

  // AUTO CALCULATION FORMULAS FOR DISPLAY
  const calculateFormativeAvg = (studentScoreObj) => {
    const vals = Object.values(studentScoreObj.scores_formative).filter(
      (v) => v !== '' && v !== null && !isNaN(v)
    )
    if (vals.length === 0) return 0
    const sum = vals.reduce((a, b) => a + b, 0)
    return Number((sum / vals.length).toFixed(1))
  }

  const calculateSummativeAvg = (studentScoreObj) => {
    const vals = Object.values(studentScoreObj.scores_summative).filter(
      (v) => v !== '' && v !== null && !isNaN(v)
    )
    if (vals.length === 0) return 0
    const sum = vals.reduce((a, b) => a + b, 0)
    return Number((sum / vals.length).toFixed(1))
  }

  const calculateAvgOfTwo = (v1, v2) => {
    const n1 = v1 !== '' && v1 !== null ? Number(v1) : null
    const n2 = v2 !== '' && v2 !== null ? Number(v2) : null

    if (n1 !== null && n2 !== null) return (n1 + n2) / 2
    if (n1 !== null) return n1
    if (n2 !== null) return n2
    return 0
  }

  const calculateFinalRaporScore = (studentScoreObj) => {
    const fAvg = calculateFormativeAvg(studentScoreObj)
    const sAvg = calculateSummativeAvg(studentScoreObj)
    const stsAvg = calculateAvgOfTwo(studentScoreObj.sts_practice, studentScoreObj.sts_written)
    const sasAvg = calculateAvgOfTwo(studentScoreObj.sas_practice, studentScoreObj.sas_written)

    const final = (fAvg + sAvg + stsAvg + sasAvg) / 4
    return Math.round(final)
  }

  // SAVE Penilaian
  const handleSaveScores = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const payload = Object.values(scores).map((studentScore) => {
        const finalScore = calculateFinalRaporScore(studentScore)
        return {
          student_id: studentScore.student_id,
          report_period_id: selectedPeriodId,
          subject_id: selectedSubjectId,
          scores_formative: studentScore.scores_formative,
          scores_summative: studentScore.scores_summative,
          sts_practice: studentScore.sts_practice === '' ? null : Number(studentScore.sts_practice),
          sts_written: studentScore.sts_written === '' ? null : Number(studentScore.sts_written),
          sas_practice: studentScore.sas_practice === '' ? null : Number(studentScore.sas_practice),
          sas_written: studentScore.sas_written === '' ? null : Number(studentScore.sas_written),
          highest_achievement: studentScore.highest_achievement || null,
          lowest_achievement: studentScore.lowest_achievement || null,
          final_score: finalScore,
        }
      })

      const { error } = await supabase.from('student_scores').upsert(payload, {
        onConflict: 'student_id,report_period_id,subject_id',
      })

      if (error) throw error
      setSuccess('Seluruh nilai siswa berhasil disimpan!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      console.error('Error saving scores:', err)
      setError('Gagal menyimpan nilai: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ADD MATERIAL AND TP OPERATIONS
  const handleAddMaterial = async () => {
    if (!newMaterialName.trim()) return
    try {
      const { error } = await supabase.from('materials').insert({
        report_period_id: selectedPeriodId,
        subject_id: selectedSubjectId,
        name: newMaterialName.trim(),
      })
      if (error) throw error
      setNewMaterialName('')
      await fetchMaterialsAndTps()
    } catch (err) {
      alert('Gagal menambah lingkup materi')
    }
  }

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Hapus lingkup materi ini? TP di dalamnya akan ikut terhapus.')) return
    try {
      const { error } = await supabase.from('materials').delete().eq('id', id)
      if (error) throw error
      await fetchMaterialsAndTps()
    } catch (err) {
      alert('Gagal menghapus lingkup materi')
    }
  }

  const handleAddTp = async () => {
    if (!tpInputs.materialId || !tpInputs.code || !tpInputs.description) return
    try {
      const { error } = await supabase.from('learning_targets').insert({
        material_id: tpInputs.materialId,
        code: tpInputs.code.trim(),
        description: tpInputs.description.trim(),
      })
      if (error) throw error
      setTpInputs({ ...tpInputs, code: '', description: '' })
      await fetchMaterialsAndTps()
    } catch (err) {
      alert('Gagal menambah tujuan pembelajaran')
    }
  }

  const handleDeleteTp = async (id) => {
    if (!window.confirm('Hapus TP ini?')) return
    try {
      const { error } = await supabase.from('learning_targets').delete().eq('id', id)
      if (error) throw error
      await fetchMaterialsAndTps()
    } catch (err) {
      alert('Gagal menghapus TP')
    }
  }

  // ADD SUMMATIVE OPERATIONS
  const handleAddSummative = async () => {
    if (!newSummativeName.trim()) return
    try {
      const { error } = await supabase.from('summatives').insert({
        report_period_id: selectedPeriodId,
        subject_id: selectedSubjectId,
        name: newSummativeName.trim(),
      })
      if (error) throw error
      setNewSummativeName('')
      await fetchSummatives()
    } catch (err) {
      alert('Gagal menambah sumatif')
    }
  }

  const handleDeleteSummative = async (id) => {
    if (!window.confirm('Hapus sumatif ini?')) return
    try {
      const { error } = await supabase.from('summatives').delete().eq('id', id)
      if (error) throw error
      await fetchSummatives()
    } catch (err) {
      alert('Gagal menghapus sumatif')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 m-0">Input Nilai Rapor</h2>
        <p className="text-sm text-slate-400 mt-1">
          Isi nilai formatif, sumatif, STS, SAS, dan deskripsi ketercapaian siswa.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Selectors Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Periode Rapor (Aktif)
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => {
              setSelectedPeriodId(e.target.value)
              setIsGridLoaded(false)
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">-- Pilih Periode Rapor --</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                Kelas {p.class_name} — Semester {p.semester} ({p.academic_year})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Mata Pelajaran
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value)
              setIsGridLoaded(false)
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">-- Pilih Mata Pelajaran --</option>
            {(() => {
              const currentPeriod = periods.find(p => p.id === selectedPeriodId)
              const filtered = teacherSubjects.filter(sub => {
                if (!currentPeriod) return true
                if (!sub.class_name) return true
                const pClass = currentPeriod.class_name || ''
                return pClass.toLowerCase().startsWith(sub.class_name.toLowerCase()) ||
                  pClass.toLowerCase().includes(sub.class_name.toLowerCase())
              })
              return filtered.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.class_name ? `(Kelas ${sub.class_name})` : ''}
                </option>
              ))
            })()}
          </select>
        </div>

        <button
          onClick={handleLoadGrid}
          disabled={loadingGrid}
          className="w-full md:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm tracking-wide shadow-md transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingGrid ? 'Memuat...' : 'Mulai Nilai'}
        </button>
      </div>

      {/* PENILAIAN SHEET */}
      {isGridLoaded && (
        <div className="space-y-6">
          {/* Settings / Config Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setShowMaterialModal(true)}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 hover:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sliders size={14} className="text-slate-500" />
                Atur Lingkup Materi & TP (Formatif: {learningTargets.length})
              </button>
              <button
                onClick={() => setShowSummativeModal(true)}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 hover:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sliders size={14} className="text-slate-500" />
                Atur Sumatif ({summatives.length})
              </button>
            </div>

            <button
              onClick={handleSaveScores}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Save size={14} />
              Simpan Semua Nilai
            </button>
          </div>

          {/* SPREADSHEET GRID VIEW */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[1500px]">
                <thead>
                  {/* Row 1: Category + Material Group Headers */}
                  <tr className="bg-slate-950 text-slate-450 text-[10px] uppercase font-bold tracking-widest text-center border-b border-slate-800/80">
                    <th className="py-2.5 px-4 text-left font-medium text-slate-500" rowSpan={2} style={{ width: '250px' }}>Informasi Siswa</th>
                    {/* Formatif: one column group per material */}
                    {materials.map((mat) => {
                      const tpsInMat = learningTargets.filter(tp => tp.material_id === mat.id)
                      if (tpsInMat.length === 0) return null
                      return (
                        <th key={mat.id} className="py-2.5 px-2 border-l border-slate-850 bg-indigo-500/5 text-indigo-300" colSpan={tpsInMat.length}>
                          {mat.name}
                        </th>
                      )
                    })}
                    {learningTargets.length > 0 && (
                      <th className="py-2.5 px-2 border-l border-slate-850 text-slate-500" rowSpan={2}>Rrt<br />Form</th>
                    )}
                    {summatives.length > 0 && (
                      <th className="py-2.5 px-2 border-l border-slate-850" colSpan={summatives.length + 1}>
                        Sumatif Lingkup Materi
                      </th>
                    )}
                    <th className="py-2.5 px-2 border-l border-slate-850" colSpan={3}>Sumatif Tengah Semester</th>
                    <th className="py-2.5 px-2 border-l border-slate-850" colSpan={3}>Sumatif Akhir Semester</th>
                    <th className="py-2.5 px-2 border-l border-slate-850" rowSpan={2} style={{ width: '80px' }}>Rapor</th>
                    <th className="py-2.5 px-2 border-l border-slate-850 text-left font-medium text-slate-500" rowSpan={2} style={{ width: '450px' }}>Deskripsi Capaian</th>
                  </tr>

                  {/* Row 2: Individual TP codes + Summative + STS/SAS sub-headers */}
                  <tr className="bg-slate-900 text-slate-400 text-xs font-semibold border-b border-slate-800">
                    {/* TP codes grouped under each material */}
                    {materials.map((mat) => {
                      const tpsInMat = learningTargets.filter(tp => tp.material_id === mat.id)
                      return tpsInMat.map((tp, idx) => (
                        <th key={tp.id} className={`py-3 px-1.5 text-center font-mono text-[10px] truncate ${idx === 0 ? 'border-l border-slate-850' : ''}`} title={`${mat.name}: ${tp.description}`}>
                          {tp.code}
                        </th>
                      ))
                    })}
                    {/* Summative sub-headers */}
                    {summatives.map((sum, idx) => (
                      <th key={sum.id} className={`py-3 px-1.5 text-center text-[10px] truncate ${idx === 0 ? 'border-l border-slate-850' : ''}`} title={sum.name}>
                        {sum.name}
                      </th>
                    ))}
                    {summatives.length > 0 && (
                      <th className="py-3 px-1.5 text-center border-l border-slate-850 text-slate-500 text-[10px] font-bold uppercase">Rrt</th>
                    )}
                    {/* STS */}
                    <th className="py-3 px-1 text-center border-l border-slate-850 text-[10px]">Prak</th>
                    <th className="py-3 px-1 text-center text-[10px]">Tulis</th>
                    <th className="py-3 px-1 text-center text-slate-500 text-[10px] font-bold">Rrt</th>
                    {/* SAS */}
                    <th className="py-3 px-1 text-center border-l border-slate-850 text-[10px]">Prak</th>
                    <th className="py-3 px-1 text-center text-[10px]">Tulis</th>
                    <th className="py-3 px-1 text-center text-slate-500 text-[10px] font-bold">Rrt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
                  {students.map((student) => {
                    const studentScore = scores[student.id] || {}
                    const formativeAvg = calculateFormativeAvg(studentScore)
                    const summativeAvg = calculateSummativeAvg(studentScore)
                    const stsAvg = calculateAvgOfTwo(studentScore.sts_practice, studentScore.sts_written)
                    const sasAvg = calculateAvgOfTwo(studentScore.sas_practice, studentScore.sas_written)
                    const finalRapor = calculateFinalRaporScore(studentScore)

                    return (
                      <tr key={student.id} className="hover:bg-slate-900/20 transition-all">
                        {/* Student Name */}
                        <td className="py-3.5 px-4 truncate">
                          <p className="font-semibold text-slate-200 leading-tight">{student.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{student.nisn}</p>
                        </td>

                        {/* Formative TP Columns Grouped by Material */}
                        {materials.map((mat) => {
                          const tpsInMat = learningTargets.filter(tp => tp.material_id === mat.id)
                          return tpsInMat.map((tp, idx) => (
                            <td key={tp.id} className={`py-3.5 px-1 text-center ${idx === 0 ? 'border-l border-slate-850' : ''}`}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={studentScore.scores_formative?.[tp.id] ?? ''}
                                onChange={(e) =>
                                  handleScoreChange(student.id, 'formative', tp.id, e.target.value)
                                }
                                className="w-11 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                          ))
                        })}
                        {learningTargets.length > 0 && (
                          <td className="py-3.5 px-1 border-l border-slate-850 text-center font-bold text-xs text-indigo-400">
                            {formativeAvg}
                          </td>
                        )}

                        {/* Summative Columns */}
                        {summatives.map((sum) => (
                          <td key={sum.id} className="py-3.5 px-1 border-l border-slate-850 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={studentScore.scores_summative?.[sum.id] ?? ''}
                              onChange={(e) =>
                                handleScoreChange(student.id, 'summative', sum.id, e.target.value)
                              }
                              className="w-11 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                        ))}
                        {summatives.length > 0 && (
                          <td className="py-3.5 px-1 border-l border-slate-850 text-center font-bold text-xs text-indigo-400">
                            {summativeAvg}
                          </td>
                        )}

                        {/* STS Columns */}
                        <td className="py-3.5 px-1 border-l border-slate-850 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={studentScore.sts_practice ?? ''}
                            onChange={(e) =>
                              handleScoreChange(student.id, 'other', 'sts_practice', e.target.value)
                            }
                            className="w-10 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3.5 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={studentScore.sts_written ?? ''}
                            onChange={(e) =>
                              handleScoreChange(student.id, 'other', 'sts_written', e.target.value)
                            }
                            className="w-10 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3.5 px-1 text-center font-bold text-xs text-amber-500">
                          {stsAvg}
                        </td>

                        {/* SAS Columns */}
                        <td className="py-3.5 px-1 border-l border-slate-850 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={studentScore.sas_practice ?? ''}
                            onChange={(e) =>
                              handleScoreChange(student.id, 'other', 'sas_practice', e.target.value)
                            }
                            className="w-10 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3.5 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={studentScore.sas_written ?? ''}
                            onChange={(e) =>
                              handleScoreChange(student.id, 'other', 'sas_written', e.target.value)
                            }
                            className="w-10 bg-slate-950 border border-slate-850 rounded text-center text-xs py-1 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3.5 px-1 text-center font-bold text-xs text-amber-500">
                          {sasAvg}
                        </td>

                        {/* Final Rapor Score */}
                        <td className="py-3.5 px-1 border-l border-slate-850 text-center font-extrabold text-sm text-emerald-400 bg-emerald-500/5">
                          {finalRapor}
                        </td>

                        {/* Capaian Textareas */}
                        <td className="py-3.5 px-4 border-l border-slate-850 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-wide shrink-0">Tinggi</span>
                            <textarea
                              rows="1"
                              placeholder="Capaian kompetensi tertinggi..."
                              value={studentScore.highest_achievement ?? ''}
                              onChange={(e) =>
                                handleScoreChange(
                                  student.id,
                                  'other',
                                  'highest_achievement',
                                  e.target.value
                                )
                              }
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg p-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-rose-500/80 uppercase tracking-wide shrink-0">Rendah</span>
                            <textarea
                              rows="1"
                              placeholder="Capaian kompetensi terendah..."
                              value={studentScore.lowest_achievement ?? ''}
                              onChange={(e) =>
                                handleScoreChange(
                                  student.id,
                                  'other',
                                  'lowest_achievement',
                                  e.target.value
                                )
                              }
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg p-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIG LINGKUP MATERI & TP */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Atur Lingkup Materi & TP</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tujuan Pembelajaran Formatif</p>
              </div>
              <button
                onClick={() => {
                  setShowMaterialModal(false)
                  handleLoadGrid() // Refresh grid headers
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Materials CRUD */}
              <div className="space-y-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  1. Lingkup Materi (Bab)
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nama Materi (e.g. Bab 1)"
                    value={newMaterialName}
                    onChange={(e) => setNewMaterialName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleAddMaterial}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 rounded-xl font-bold text-xs"
                  >
                    Tambah
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-850 rounded-xl p-3 bg-slate-950/40">
                  {materials.length === 0 ? (
                    <p className="text-xs text-slate-555 italic text-center py-4">Belum ada lingkup materi.</p>
                  ) : (
                    materials.map((m) => (
                      <div key={m.id} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-850 text-xs">
                        <span className="text-slate-250 truncate">{m.name}</span>
                        <button
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: TPs CRUD */}
              <div className="space-y-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  2. Tujuan Pembelajaran (TP)
                </span>

                <div className="space-y-2 border border-slate-850 p-3 rounded-xl bg-slate-950/20">
                  <select
                    value={tpInputs.materialId}
                    onChange={(e) => setTpInputs({ ...tpInputs, materialId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">-- Pilih Materi Bab --</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Kode (e.g. TP1)"
                      value={tpInputs.code}
                      onChange={(e) => setTpInputs({ ...tpInputs, code: e.target.value })}
                      className="w-20 bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Deskripsi TP..."
                      value={tpInputs.description}
                      onChange={(e) => setTpInputs({ ...tpInputs, description: e.target.value })}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleAddTp}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-1.5 rounded-lg text-xs font-bold"
                  >
                    Tambah TP
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-850 rounded-xl p-3 bg-slate-950/40">
                  {learningTargets.length === 0 ? (
                    <p className="text-xs text-slate-555 italic text-center py-4">Belum ada tujuan pembelajaran.</p>
                  ) : (
                    learningTargets.map((tp) => {
                      const mat = materials.find((m) => m.id === tp.material_id)
                      return (
                        <div key={tp.id} className="flex justify-between items-start bg-slate-950 p-2 rounded-lg border border-slate-850 text-[11px] gap-2">
                          <div className="truncate">
                            <span className="font-bold text-indigo-400 mr-1.5">{tp.code}</span>
                            <span className="text-slate-300">{tp.description}</span>
                            <span className="block text-[9px] text-slate-500 truncate mt-0.5">({mat?.name || 'Materi'})</span>
                          </div>
                          <button
                            onClick={() => handleDeleteTp(tp.id)}
                            className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer self-center"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowMaterialModal(false)
                  handleLoadGrid() // Refresh grid layout
                }}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIG SUMATIF LINGKUP MATERI */}
      {showSummativeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Atur Sumatif</h3>
                <p className="text-xs text-slate-400 mt-0.5">Lingkup Materi Sumatif</p>
              </div>
              <button
                onClick={() => {
                  setShowSummativeModal(false)
                  handleLoadGrid() // Refresh grid headers
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nama Sumatif (e.g. Sumatif Bab 1)"
                  value={newSummativeName}
                  onChange={(e) => setNewSummativeName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleAddSummative}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 rounded-xl font-bold text-xs"
                >
                  Tambah
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-850 rounded-xl p-3 bg-slate-950/40">
                {summatives.length === 0 ? (
                  <p className="text-xs text-slate-555 italic text-center py-4">Belum ada lingkup sumatif.</p>
                ) : (
                  summatives.map((s) => (
                    <div key={s.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-xs">
                      <span className="text-slate-250 truncate">{s.name}</span>
                      <button
                        onClick={() => handleDeleteSummative(s.id)}
                        className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowSummativeModal(false)
                  handleLoadGrid() // Refresh grid layout
                }}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
