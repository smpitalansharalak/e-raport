import React from 'react'

/**
 * Komponen template lembar rapor untuk cetak / pratinjau.
 * Menggunakan forwardRef agar bisa dipasang ke useReactToPrint.
 */
const RaporSheet = React.forwardRef(function RaporSheet(
  { previewStudent, activePeriod, allSubjects, getStudentScores, getStudentAttendance },
  ref
) {
  const att = getStudentAttendance(previewStudent.id)
  const scores = getStudentScores(previewStudent.id)
  
  let catatanKhusus = att.catatan_khusus || ''
  let kokurikuler = []
  let ekstrakurikuler = []

  try {
    const parsed = JSON.parse(catatanKhusus)
    if (typeof parsed === 'object' && parsed !== null && ('catatan' in parsed || 'kokurikuler' in parsed || 'ekstrakurikuler' in parsed)) {
      catatanKhusus = parsed.catatan || ''
      kokurikuler = parsed.kokurikuler || []
      ekstrakurikuler = parsed.ekstrakurikuler || []
    }
  } catch (e) {
    // string fallback
  }

  const renderActivityTable = (title, data) => (
    <div className="mb-6" style={{ pageBreakInside: 'avoid' }}>
      <p className="font-bold text-[12px] mb-1.5">{title}</p>
      <table className="w-full border-collapse text-[11px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="bg-white text-black font-bold">
            {data.length > 0 && <th className="py-2 px-3 text-center" style={{ border: '1px solid black', width: '40px' }}>No</th>}
            <th className="py-2 px-3 text-left" style={{ border: '1px solid black', width: data.length > 0 ? '250px' : 'auto' }}>Kegiatan</th>
            {data.length > 0 && <th className="py-2 px-3 text-left" style={{ border: '1px solid black' }}>Keterangan</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="py-2 px-3" style={{ border: '1px solid black', height: '28px' }}>-</td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr key={idx}>
                <td className="py-2 px-3 text-center font-mono" style={{ border: '1px solid black' }}>{idx + 1}</td>
                <td className="py-2 px-3 font-semibold" style={{ border: '1px solid black' }}>{item.name}</td>
                <td className="py-2 px-3" style={{ border: '1px solid black' }}>{item.description}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <div
      ref={ref}
      className="bg-white text-black p-4 print:p-0 select-none rapor-sheet"
      style={{ fontFamily: 'Arial, sans-serif', width: '100%' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-center border-b-2 border-black pb-4">
        <img src="/logo.webp" alt="Logo" className="h-20 w-auto mr-4 object-contain" />
        <div className="text-center">
          <p className="font-bold text-sm tracking-wide">YAYASAN AL-ANSHAR AN'NUR</p>
          <p className="font-bold text-[14px] leading-none my-1 uppercase whitespace-nowrap">
            SEKOLAH MENENGAH PERTAMA ISLAM TERPADU (SMP-IT) AL ANSHAR
          </p>
          <p className="text-[10px] leading-tight text-gray-700">
            NPSN : 70055902 | Email : smpitalansharalak@gmail.com | HP : 0812 3743 8357
          </p>
          <p className="text-[10px] leading-tight text-gray-700 mt-0.5">
            Jl. Waikelo No. 32, RT.26 RW 06, Kel. Penkase Oeleta, Kec. Alak, Kota Kupang-NTT
          </p>
        </div>
      </div>

      {/* ── Judul ── */}
      <div className="text-center my-6">
        <p className="font-bold text-base tracking-widest underline">LAPORAN HASIL BELAJAR</p>
      </div>

      {/* ── Info Siswa ── */}
      <div className="flex justify-between text-xs mb-6 leading-relaxed">
        <div className="space-y-1 w-[48%]">
          <p className="flex"><span className="w-24 shrink-0">Nama</span>: <span className="font-bold ml-1">{previewStudent.name}</span></p>
          <p className="flex"><span className="w-24 shrink-0">NIS/NISN</span><span className="ml-1">: {previewStudent.nisn}</span></p>
          <p className="flex"><span className="w-24 shrink-0">Nama Sekolah</span><span className="ml-1">: SMP IT Al Anshar</span></p>
        </div>
        <div className="space-y-1 w-[48%]">
          <p className="flex"><span className="w-28 shrink-0">Kelas / Fase</span><span className="ml-1">: {activePeriod?.class_name} / {previewStudent.phase}</span></p>
          <p className="flex"><span className="w-28 shrink-0">Semester</span><span className="ml-1">: {activePeriod?.semester}</span></p>
          <p className="flex"><span className="w-28 shrink-0">Tahun Ajaran</span><span className="ml-1">: {activePeriod?.academic_year}</span></p>
        </div>
      </div>

      {/* ── Tabel Nilai — boleh overflow ke halaman berikutnya ── */}
      <table className="w-full border-collapse text-[11px] mb-0" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="bg-white text-black font-bold">
            <th className="py-2 px-3 text-center" style={{ border: '1px solid black', width: '40px' }}>No</th>
            <th className="py-2 px-3 text-left" style={{ border: '1px solid black' }}>Mata Pelajaran</th>
            <th className="py-2 px-3 text-center" style={{ border: '1px solid black', width: '80px' }}>Nilai Akhir</th>
            <th className="py-2 px-3 text-left" style={{ border: '1px solid black', width: '220px' }}>Capaian Tertinggi</th>
            <th className="py-2 px-3 text-left" style={{ border: '1px solid black', width: '220px' }}>Capaian Terendah</th>
          </tr>
        </thead>
        <tbody>
          {allSubjects.length === 0 ? (
            <tr>
              <td colSpan="5" className="py-6 text-center text-gray-500 italic" style={{ border: '1px solid black' }}>
                Belum ada mata pelajaran rapor dikonfigurasi.
              </td>
            </tr>
          ) : (
            allSubjects.map((sub, index) => {
              const score = scores.find(sc => sc.subject_id === sub.id)
              return (
                <tr key={sub.id}>
                  <td className="py-2.5 px-3 text-center font-mono" style={{ border: '1px solid black' }}>{index + 1}</td>
                  <td className="py-2.5 px-3 font-semibold" style={{ border: '1px solid black' }}>{sub.name}</td>
                  <td className="py-2.5 px-3 text-center font-bold" style={{ border: '1px solid black' }}>{score ? score.final_score : '-'}</td>
                  <td className="py-2 px-3 text-[10px] leading-snug" style={{ border: '1px solid black' }}>{score?.highest_achievement || '-'}</td>
                  <td className="py-2 px-3 text-[10px] leading-snug" style={{ border: '1px solid black' }}>{score?.lowest_achievement || '-'}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {/* ── Kokurikuler & Ekstrakurikuler ── */}
      <div className="mt-6">
        {renderActivityTable('Kokurikuler', kokurikuler)}
        {renderActivityTable('Ekstrakurikuler', ekstrakurikuler)}
      </div>

      {/*
        ── Blok bawah: Catatan Khusus + Kepatuhan + TTD ──
        Dibungkus dalam satu div dengan break-inside:avoid agar
        ketiga elemen ini tidak pernah dipisah di tengah oleh page break.
      */}
      <div
        className="print-avoid-break"
        style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginTop: '16px' }}
      >
        {/* ── Catatan Khusus Wali Kelas ── */}
        <div className="text-xs mb-4" style={{ border: '1px solid black', padding: '10px 12px' }}>
          <p className="font-bold uppercase pb-1 mb-2" style={{ borderBottom: '1px solid black' }}>
            Catatan Wali Kelas
          </p>
          <p
            className="leading-relaxed text-[11px] min-h-[32px]"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {catatanKhusus || <span className="text-gray-400 italic">—</span>}
          </p>
        </div>

        {/* ── Ketidakhadiran / Kepatuhan Siswa ── */}
        <div className="text-xs mb-6" style={{ border: '1px solid black', width: '256px', padding: '10px 12px' }}>
          <p className="font-bold uppercase pb-1 mb-1.5" style={{ borderBottom: '1px solid black' }}>Ketidakhadiran</p>
          <p className="flex justify-between"><span>Sakit</span> <span>: {att.sakit} hari</span></p>
          <p className="flex justify-between"><span>Izin</span> <span>: {att.izin} hari</span></p>
          <p className="flex justify-between"><span>Tanpa Keterangan (Alpha)</span> <span>: {att.alpha} hari</span></p>
        </div>

        {/* ── Tanda Tangan ── */}
        <div className="mt-10">
          {/* Baris judul */}
          <div className="flex justify-between text-xs">
            <div className="text-center w-1/2">
              <div className="h-4"></div>
              <p>Orang Tua / Wali Murid,</p>
            </div>

            <div className="text-center w-1/2">
              <p>Kota Kupang, Juni 2026</p>
              <p>Wali Kelas,</p>
            </div>
          </div>

          {/* Ruang tanda tangan */}
          <div style={{ height: '70px' }}></div>

          {/* Nama */}
          <div className="flex justify-between text-xs">
            <div className="text-center w-1/2">
              <p className="font-bold underline">
                {previewStudent.parent_name || '............................'}
              </p>
            </div>

            <div className="text-center w-1/2">
              <p className="font-bold underline">
                {activePeriod?.wali_kelas?.name || '............................'}
              </p>
            </div>
          </div>

          {/* Kepala sekolah */}
          <div className="text-center text-xs mt-8">
            <p>Mengetahui,</p>
            <p>Kepala Sekolah SMP IT Al Anshar</p>

            <div style={{ height: '70px' }}></div>

            <p className="font-bold underline">
              {activePeriod?.kepala_sekolah_name || '............................'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default RaporSheet
