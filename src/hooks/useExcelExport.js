import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  buildRekapSheet,
  buildDetailSheet,
  buildKehadiranSheet,
  setColWidths,
} from '../utils/excelSheetBuilders'

/**
 * Custom hook untuk ekspor data rapor ke file Excel (.xlsx).
 * Mendukung 3 mode: rekap, detail, dan lengkap (gabungan).
 */
export default function useExcelExport() {
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState('')

  const exportToExcel = useCallback(async ({
    mode,          // 'rekap' | 'detail' | 'lengkap'
    periodId,
    activePeriod,
    students,
    allSubjects,
    allScores,
    allAttendance,
    // detail mode needs extra data fetched on demand
    fetchDetail,
  }) => {
    setExporting(true)
    setExportSuccess('')
    try {
      const wb = XLSX.utils.book_new()
      const periodName = activePeriod
        ? `${activePeriod.class_name}_${activePeriod.semester}_${activePeriod.academic_year.replace('/', '-')}`
        : 'Rapor'

      // Info sheet selalu ada
      const infoData = [
        ['E-Rapor SMP IT Al Anshar'],
        [''],
        ['Periode', activePeriod?.name || '-'],
        ['Kelas', activePeriod?.class_name || '-'],
        ['Semester', activePeriod?.semester || '-'],
        ['Tahun Ajaran', activePeriod?.academic_year || '-'],
        ['Wali Kelas', activePeriod?.wali_kelas?.name || '-'],
        ['Kepala Sekolah', activePeriod?.kepala_sekolah_name || '-'],
        [''],
        ['Diekspor pada', new Date().toLocaleString('id-ID')],
        ['Jumlah Siswa', students.length],
        ['Jumlah Mata Pelajaran', allSubjects.length],
      ]
      const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
      setColWidths(wsInfo, [22, 40])
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Info')

      if (mode === 'rekap' || mode === 'lengkap') {
        const wsRekap = buildRekapSheet(students, allSubjects, allScores)
        XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap Nilai')
      }

      if (mode === 'detail' || mode === 'lengkap') {
        // Fetch materials, TP, summatives jika belum ada
        const { materials, learningTargets, summatives } = await fetchDetail(periodId)
        const wsDetail = buildDetailSheet(students, allSubjects, allScores, materials, learningTargets, summatives)
        XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Nilai')
      }

      if (mode === 'lengkap') {
        const wsAtt = buildKehadiranSheet(students, allAttendance)
        XLSX.utils.book_append_sheet(wb, wsAtt, 'Kehadiran')
      } else if (mode === 'rekap') {
        const wsAtt = buildKehadiranSheet(students, allAttendance)
        XLSX.utils.book_append_sheet(wb, wsAtt, 'Kehadiran')
      }

      const fileName = `Rekap_Rapor_${periodName}.xlsx`
      XLSX.writeFile(wb, fileName)
      setExportSuccess(`File "${fileName}" berhasil diunduh!`)
      setTimeout(() => setExportSuccess(''), 5000)
    } catch (err) {
      console.error('Export error:', err)
      throw err
    } finally {
      setExporting(false)
    }
  }, [])

  return { exportToExcel, exporting, exportSuccess }
}
