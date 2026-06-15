import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAvailableClasses } from '../hooks/useAvailableClasses'
import { confirmAction, showSuccess, showError, showLoading, closeLoading } from '../lib/swal'
import {
    GraduationCap,
    ArrowUpCircle,
    Users,
    Search,
    AlertCircle,
    CheckCircle,
    History,
    X,
} from 'lucide-react'

const STATUS_LABELS = {
    aktif: { label: 'Aktif', color: 'emerald' },
    naik_kelas: { label: 'Naik Kelas', color: 'indigo' },
    lulus: { label: 'Lulus', color: 'amber' },
    alumni: { label: 'Alumni', color: 'slate' },
}

const CLASS_ORDER = ['VII', 'VIII', 'IX']

function getNextClass(currentClass) {
    const base = currentClass.replace(/\s.*/, '').trim()
    const suffix = currentClass.replace(/^[IVXLC]+/, '').trim()
    const idx = CLASS_ORDER.indexOf(base)
    if (idx === -1 || idx >= CLASS_ORDER.length - 1) return null
    return CLASS_ORDER[idx + 1] + (suffix ? ' ' + suffix : '')
}

function isLastClass(currentClass) {
    return currentClass.replace(/\s.*/, '').trim() === 'IX'
}

const colorMap = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    indigo: 'bg-indigo-500/10  border-indigo-500/20  text-indigo-400',
    amber: 'bg-amber-500/10   border-amber-500/20   text-amber-400',
    slate: 'bg-slate-800/60   border-slate-700/40   text-slate-400',
}

function StatusBadge({ status }) {
    const cfg = STATUS_LABELS[status] || { label: status, color: 'slate' }
    return (
        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${colorMap[cfg.color]}`}>
            {cfg.label}
        </span>
    )
}

export default function ManajemenStatus() {
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('aktif')
    const [filterClass, setFilterClass] = useState('')
    const [filterYear, setFilterYear] = useState('')
    const [processingIds, setProcessingIds] = useState(new Set())
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [showHistory, setShowHistory] = useState(null)
    const [history, setHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [showBulkModal, setShowBulkModal] = useState(null)
    const [bulkTargetClass, setBulkTargetClass] = useState('')
    const [bulkTargetYear, setBulkTargetYear] = useState('')
    const [bulkNote, setBulkNote] = useState('')
    const [processingBulk, setProcessingBulk] = useState(false)

    // Kelas dinamis dari DB
    const { classes: availableClasses } = useAvailableClasses({ statusFilter: filterStatus || null })

    const fetchStudents = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            let q = supabase
                .from('students')
                .select('id, name, nisn, class_name, academic_year, status, previous_class, graduation_year')
                .order('class_name', { ascending: true })
                .order('name', { ascending: true })

            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterClass) q = q.eq('class_name', filterClass)
            if (filterYear) q = q.eq('academic_year', filterYear)

            const { data, error } = await q
            if (error) throw error
            setStudents(data || [])
        } catch (err) {
            setError('Gagal memuat data siswa: ' + err.message)
        } finally {
            setLoading(false)
        }
    }, [filterStatus, filterClass, filterYear])

    useEffect(() => {
        fetchStudents()
        setSelectedIds(new Set())
    }, [fetchStudents])

    // Reset filter kelas jika tidak ada di daftar baru
    useEffect(() => {
        if (filterClass && availableClasses.length > 0 && !availableClasses.includes(filterClass)) {
            setFilterClass('')
        }
    }, [availableClasses, filterClass])

    const changeStatus = async (student, toStatus, options = {}) => {
        setProcessingIds(prev => new Set([...prev, student.id]))
        setError('')
        try {
            const updateData = {
                status: toStatus,
                status_changed_at: new Date().toISOString(),
                promotion_note: options.note || null,
            }
            if (options.toClass) { updateData.previous_class = student.class_name; updateData.class_name = options.toClass }
            if (options.toYear) updateData.academic_year = options.toYear
            if (toStatus === 'alumni') updateData.graduation_year = options.graduationYear || student.academic_year

            const { error: updateErr } = await supabase.from('students').update(updateData).eq('id', student.id)
            if (updateErr) throw updateErr

            await supabase.from('student_status_history').insert({
                student_id: student.id,
                from_status: student.status,
                to_status: toStatus,
                from_class: student.class_name,
                to_class: options.toClass || student.class_name,
                academic_year: options.toYear || student.academic_year,
                note: options.note || null,
            })

            await fetchStudents()
            showSuccess(`Status ${student.name} berhasil diubah ke "${STATUS_LABELS[toStatus]?.label}".`)
        } catch (err) {
            showError('Gagal Mengubah Status', err.message)
        } finally {
            setProcessingIds(prev => { const n = new Set(prev); n.delete(student.id); return n })
        }
    }

    const handleBulkAction = async () => {
        if (!showBulkModal) return
        setProcessingBulk(true)
        setError('')
        let successCount = 0
        const selected = students.filter(s => selectedIds.has(s.id))

        for (const student of selected) {
            try {
                let targetClass = student.class_name
                let previousClass = student.previous_class
                
                if (showBulkModal === 'naik_kelas') {
                    if (bulkTargetClass) {
                        targetClass = bulkTargetClass
                    } else {
                        const autoNext = getNextClass(student.class_name)
                        if (autoNext) {
                            targetClass = autoNext
                        }
                    }
                    if (targetClass !== student.class_name) {
                        previousClass = student.class_name
                    }
                }

                const updateData = {
                    status: showBulkModal,
                    status_changed_at: new Date().toISOString(),
                    promotion_note: bulkNote || null,
                }
                if (showBulkModal === 'naik_kelas' && targetClass !== student.class_name) {
                    updateData.previous_class = previousClass
                    updateData.class_name = targetClass
                }
                if (bulkTargetYear) updateData.academic_year = bulkTargetYear
                if (showBulkModal === 'alumni') updateData.graduation_year = bulkTargetYear || student.academic_year

                await supabase.from('students').update(updateData).eq('id', student.id)
                await supabase.from('student_status_history').insert({
                    student_id: student.id,
                    from_status: student.status,
                    to_status: showBulkModal,
                    from_class: student.class_name,
                    to_class: showBulkModal === 'naik_kelas' ? targetClass : student.class_name,
                    academic_year: bulkTargetYear || student.academic_year,
                    note: bulkNote || null,
                })
                successCount++
            } catch (e) {
                console.error(`Gagal update ${student.name}:`, e)
            }
        }

        setProcessingBulk(false)
        setShowBulkModal(null)
        setSelectedIds(new Set())
        setBulkTargetClass(''); setBulkTargetYear(''); setBulkNote('')
        await fetchStudents()
        showSuccess(`${successCount} siswa berhasil diproses.`)
    }

    const viewHistory = async (student) => {
        setShowHistory(student)
        setLoadingHistory(true)
        try {
            const { data, error } = await supabase
                .from('student_status_history')
                .select('id, created_at, to_status, from_class, to_class, note')
                .eq('student_id', student.id)
                .order('created_at', { ascending: false })
            if (error) throw error
            setHistory(data || [])
        } catch { setHistory([]) }
        finally { setLoadingHistory(false) }
    }

    const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    const toggleSelectAll = () => selectedIds.size === filteredStudents.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredStudents.map(s => s.id)))

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.nisn.includes(search) ||
        s.class_name.toLowerCase().includes(search.toLowerCase())
    )

    const uniqueYears = [...new Set(students.map(s => s.academic_year))].sort().reverse()

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-100 m-0">Manajemen Status Siswa</h2>
                <p className="text-sm text-slate-400 mt-1">Proses naik kelas, kelulusan, dan kelola data alumni siswa SMP IT Al Anshar.</p>
            </div>

            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle size={18} className="shrink-0" /><span>{error}</span>
                </div>
            )}
            {success && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-sm">
                    <CheckCircle size={18} className="shrink-0" /><span>{success}</span>
                </div>
            )}

            {/* Tab Status */}
            <div className="flex flex-wrap gap-2 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                {Object.entries(STATUS_LABELS).map(([key, val]) => (
                    <button key={key} onClick={() => { setFilterStatus(key); setSelectedIds(new Set()); setFilterClass('') }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterStatus === key ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}>
                        {val.label}
                    </button>
                ))}
            </div>

            {/* Filter & Search */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-end flex-wrap">
                {/* Search */}
                <div className="flex-1 relative min-w-[200px]">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none"><Search size={15} /></span>
                    <input type="text" placeholder="Cari nama, NISN, kelas..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
                </div>

                {/* Filter Kelas Dinamis */}
                <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-[11px] text-slate-500 font-semibold">Kelas:</span>
                    <button onClick={() => setFilterClass('')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${!filterClass ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                        Semua
                    </button>
                    {availableClasses.map(cls => (
                        <button key={cls} onClick={() => setFilterClass(cls)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${filterClass === cls ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                            {cls}
                        </button>
                    ))}
                </div>

                {/* Filter Tahun Ajaran */}
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-emerald-500">
                    <option value="">Semua T.A.</option>
                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                {/* Bulk actions */}
                {selectedIds.size > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        <span className="text-xs text-emerald-400 font-bold self-center">{selectedIds.size} dipilih</span>
                        {filterStatus === 'aktif' && (
                            <>
                                <button onClick={() => setShowBulkModal('naik_kelas')}
                                    className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-xl hover:bg-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5">
                                    <ArrowUpCircle size={13} /> Naik Kelas
                                </button>
                                <button onClick={() => setShowBulkModal('lulus')}
                                    className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5">
                                    <GraduationCap size={13} /> Luluskan
                                </button>
                            </>
                        )}
                        {(filterStatus === 'lulus' || filterStatus === 'naik_kelas') && (
                            <button onClick={() => setShowBulkModal('alumni')}
                                className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5">
                                <Users size={13} /> Jadikan Alumni
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Tabel Siswa */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-3 px-4">
                                    <input type="checkbox" checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                                        onChange={toggleSelectAll} className="accent-emerald-500 cursor-pointer w-3.5 h-3.5" />
                                </th>
                                <th className="py-3 px-4">NISN</th>
                                <th className="py-3 px-4">Nama Siswa</th>
                                <th className="py-3 px-4">Kelas</th>
                                <th className="py-3 px-4">T.A.</th>
                                <th className="py-3 px-4">Status</th>
                                {filterStatus === 'alumni' && <th className="py-3 px-4">Thn. Lulus</th>}
                                <th className="py-3 px-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-sm">
                            {loading ? (
                                <tr><td colSpan={filterStatus === 'alumni' ? 8 : 7} className="py-10 text-center text-slate-500 text-xs animate-pulse">Memuat data...</td></tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={filterStatus === 'alumni' ? 8 : 7} className="py-10 text-center text-slate-500">
                                        <Users size={32} className="mx-auto mb-2 text-slate-700" />
                                        <p className="text-xs">Tidak ada siswa ditemukan.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map(student => {
                                    const isProcessing = processingIds.has(student.id)
                                    const isSelected = selectedIds.has(student.id)
                                    const canNaikKelas = student.status === 'aktif' && !isLastClass(student.class_name)
                                    const canLulus = student.status === 'aktif' && isLastClass(student.class_name)
                                    const canAlumni = student.status === 'lulus' || student.status === 'naik_kelas'

                                    return (
                                        <tr key={student.id} className={`transition-all ${isSelected ? 'bg-emerald-500/5' : 'hover:bg-slate-900/30'}`}>
                                            <td className="py-3 px-4">
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(student.id)} className="accent-emerald-500 cursor-pointer w-3.5 h-3.5" />
                                            </td>
                                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{student.nisn}</td>
                                            <td className="py-3 px-4">
                                                <p className="font-semibold text-slate-200 text-[13px]">{student.name}</p>
                                                {student.previous_class && <p className="text-[10px] text-slate-500 mt-0.5">Sebelumnya: {student.previous_class}</p>}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded text-xs font-semibold">{student.class_name}</span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-400 text-xs">{student.academic_year}</td>
                                            <td className="py-3 px-4"><StatusBadge status={student.status} /></td>
                                            {filterStatus === 'alumni' && <td className="py-3 px-4 text-slate-400 text-xs">{student.graduation_year || '-'}</td>}
                                            <td className="py-3 px-4">
                                                <div className="flex justify-center items-center gap-1.5 flex-wrap">
                                                    <button onClick={() => viewHistory(student)}
                                                        className="p-1.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer" title="Riwayat">
                                                        <History size={12} />
                                                    </button>

                                                    {canNaikKelas && (
                                                        <button disabled={isProcessing}
                                                            onClick={async () => {
                                                                const nextClass = getNextClass(student.class_name)
                                                                if (!nextClass) return
                                                                const res = await confirmAction(`Naikkan ${student.name}?`, `Dari ${student.class_name} → ${nextClass}`, 'Ya, Naik Kelas')
                                                                if (!res.isConfirmed) return
                                                                const parts = student.academic_year.split('/')
                                                                const toYear = parts.length === 2 ? `${parseInt(parts[0]) + 1}/${parseInt(parts[1]) + 1}` : student.academic_year
                                                                changeStatus(student, 'naik_kelas', { toClass: nextClass, toYear })
                                                            }}
                                                            className="px-2.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1">
                                                            <ArrowUpCircle size={11} /> Naik Kelas
                                                        </button>
                                                    )}

                                                    {canLulus && (
                                                        <button disabled={isProcessing}
                                                            onClick={async () => {
                                                                const res = await confirmAction(`Luluskan ${student.name}?`, `Dari kelas ${student.class_name}.`, 'Ya, Luluskan')
                                                                if (!res.isConfirmed) return
                                                                changeStatus(student, 'lulus', { graduationYear: student.academic_year, note: 'Lulus SMP IT Al Anshar' })
                                                            }}
                                                            className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1">
                                                            <GraduationCap size={11} /> Luluskan
                                                        </button>
                                                    )}

                                                    {canAlumni && (
                                                        <button disabled={isProcessing}
                                                            onClick={async () => {
                                                                const res = await confirmAction(`Arsipkan ${student.name} sebagai alumni?`, '', 'Ya, Alumni')
                                                                if (!res.isConfirmed) return
                                                                changeStatus(student, 'alumni', { graduationYear: student.graduation_year || student.academic_year })
                                                            }}
                                                            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1">
                                                            <Users size={11} /> Alumni
                                                        </button>
                                                    )}

                                                    {student.status !== 'aktif' && (
                                                        <button disabled={isProcessing}
                                                            onClick={async () => {
                                                                const res = await confirmAction(`Kembalikan ${student.name} ke Aktif?`, '')
                                                                if (!res.isConfirmed) return
                                                                changeStatus(student, 'aktif')
                                                            }}
                                                            className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-40">
                                                            ↩ Aktif
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredStudents.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-800/60 bg-slate-950/20 flex justify-between items-center">
                        <span className="text-[11px] text-slate-500">Menampilkan {filteredStudents.length} dari {students.length} siswa</span>
                        {selectedIds.size > 0 && <span className="text-[11px] text-emerald-400 font-semibold">{selectedIds.size} siswa dipilih</span>}
                    </div>
                )}
            </div>

            {/* Modal Riwayat */}
            {showHistory && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100">Riwayat Status</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{showHistory.name}</p>
                            </div>
                            <button onClick={() => setShowHistory(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X size={16} /></button>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {loadingHistory ? (
                                <p className="text-xs text-slate-500 text-center py-6 animate-pulse">Memuat riwayat...</p>
                            ) : history.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-6">Belum ada riwayat perubahan status.</p>
                            ) : (
                                history.map(h => (
                                    <div key={h.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-slate-500">{new Date(h.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            <span className="text-slate-600">→</span>
                                            <StatusBadge status={h.to_status} />
                                        </div>
                                        {h.from_class && h.to_class && h.from_class !== h.to_class && (
                                            <p className="text-slate-500">{h.from_class} → {h.to_class}</p>
                                        )}
                                        {h.note && <p className="text-slate-400 italic">{h.note}</p>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Aksi Massal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-xl p-6 space-y-5">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                            <h3 className="text-sm font-bold text-slate-100">
                                {showBulkModal === 'naik_kelas' && `Naik Kelas — ${selectedIds.size} Siswa`}
                                {showBulkModal === 'lulus' && `Luluskan — ${selectedIds.size} Siswa`}
                                {showBulkModal === 'alumni' && `Jadikan Alumni — ${selectedIds.size} Siswa`}
                            </h3>
                            <button onClick={() => setShowBulkModal(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X size={16} /></button>
                        </div>
                        <div className="space-y-3">
                            {showBulkModal === 'naik_kelas' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kelas Tujuan</label>
                                    <input type="text" placeholder="Contoh: VIII A" value={bulkTargetClass} onChange={e => setBulkTargetClass(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
                                    <p className="text-[10px] text-slate-500 mt-1">Kosongkan untuk otomatis sesuai kelas masing-masing.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tahun Ajaran Baru</label>
                                <input type="text" placeholder="Contoh: 2026/2027" value={bulkTargetYear} onChange={e => setBulkTargetYear(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Catatan (opsional)</label>
                                <textarea rows={2} placeholder="Contoh: Naik kelas reguler T.A. 2026/2027" value={bulkNote} onChange={e => setBulkNote(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
                            <button onClick={() => setShowBulkModal(null)} className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:text-slate-200">Batal</button>
                            <button onClick={handleBulkAction} disabled={processingBulk}
                                className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl cursor-pointer">
                                {processingBulk ? 'Memproses...' : `Proses ${selectedIds.size} Siswa`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}