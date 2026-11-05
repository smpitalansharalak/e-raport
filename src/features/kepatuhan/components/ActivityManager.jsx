import { memo, useCallback, useRef, useState } from 'react'
import { Save, Plus, Edit2, Trash2 } from 'lucide-react'
import { sanitizeBasicText } from '@/utils/text'

const ActivityManager = memo(function ActivityManager({
  type,
  student,
  data,
  onUpdate,
  onSaveToDB,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [isSavingDB, setIsSavingDB] = useState(false)

  const nameRef = useRef(null)
  const descRef = useRef(null)

  const handleSaveLocal = () => {
    const rawName = nameRef.current?.value || ''
    const rawDesc = descRef.current?.value || ''
    const cleanName = sanitizeBasicText(rawName)
    const cleanDesc = sanitizeBasicText(rawDesc)
    if (!cleanName) return

    let newData = [...data]
    if (isEditing && editingId) {
      newData = newData.map((item) =>
        item.id === editingId ? { ...item, name: cleanName, description: cleanDesc } : item,
      )
    } else {
      newData.push({ id: Date.now().toString(), name: cleanName, description: cleanDesc })
    }

    onUpdate(student.id, type, newData)

    if (nameRef.current) nameRef.current.value = ''
    if (descRef.current) descRef.current.value = ''
    setIsEditing(false)
    setEditingId(null)
  }

  const handleCommitDB = async () => {
    setIsSavingDB(true)
    await onSaveToDB(student.id, type, student.name)
    setIsSavingDB(false)
  }

  const handleEdit = useCallback((item) => {
    setIsEditing(true)
    setEditingId(item.id)
    if (nameRef.current) nameRef.current.value = item.name
    if (descRef.current) descRef.current.value = item.description
  }, [])

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingId(null)
    if (nameRef.current) nameRef.current.value = ''
    if (descRef.current) descRef.current.value = ''
  }

  const handleDelete = (id) => {
    onUpdate(
      student.id,
      type,
      data.filter((item) => item.id !== id),
    )
  }

  const title = type === 'kokurikuler' ? 'Kokurikuler' : 'Ekstrakurikuler'

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-100">{title} Siswa</h3>
          <p className="text-xs text-slate-400 mt-0.5">{student.name}</p>
        </div>
        <button
          onClick={handleCommitDB}
          disabled={isSavingDB}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          <Save size={14} />
          {isSavingDB ? 'Menyimpan...' : 'Simpan ke Database'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Form */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Nama Kegiatan
              </label>
              <input
                ref={nameRef}
                type="text"
                placeholder={`Contoh: ${type === 'kokurikuler' ? 'Pramuka' : 'Futsal'}`}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Keterangan
              </label>
              <textarea
                ref={descRef}
                placeholder="Contoh: Sangat Baik"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 resize-y min-h-[40px]"
                rows="1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {isEditing && (
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg cursor-pointer"
              >
                Batal
              </button>
            )}
            <button
              onClick={handleSaveLocal}
              className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              {isEditing ? <Edit2 size={14} /> : <Plus size={14} />}
              {isEditing ? 'Simpan Edit (Lokal)' : 'Tambah ke Tabel'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[450px]">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-2.5 px-4 w-10 text-center">No</th>
                  <th className="py-2.5 px-4 min-w-[130px]">Nama {title}</th>
                  <th className="py-2.5 px-4 min-w-[130px]">Keterangan</th>
                  <th className="py-2.5 px-4 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-500 text-xs italic">
                      Belum ada data.
                    </td>
                  </tr>
                ) : (
                  data.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-200">{item.name}</td>
                      <td className="py-2.5 px-4 text-slate-400">{item.description}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-indigo-400 hover:bg-indigo-500/20 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
})

export default ActivityManager
