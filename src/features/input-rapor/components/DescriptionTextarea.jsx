import React, { useCallback, useRef } from 'react'
import { sanitizeText } from '@/utils/text'

/**
 * Textarea deskripsi menggunakan local state + debounce ke parent.
 * Ini mencegah setiap keystroke memicu re-render seluruh tabel (30+ baris).
 * Debounce 300ms: perubahan dikirim ke parent hanya setelah user berhenti
 * mengetik, sedangkan tampilan tetap responsif karena local state langsung
 * diupdate.
 *
 * Diekstrak dari ScoreGrid agar bisa dipakai juga oleh MobileScoreList.
 */
const DescriptionTextarea = React.memo(function DescriptionTextarea({
  disabled,
  value,
  placeholder,
  field,
  studentId,
  handleScoreChange,
  autoResize,
  colorClass,
  rows = 3,
  className = '',
}) {
  const [localValue, setLocalValue] = React.useState(value)
  const debounceRef = useRef(null)
  const isMountedRef = useRef(true)

  // Sync dari parent (misal saat handleEditRow menarik data terbaru dari DB)
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = useCallback((e) => {
    const newVal = e.target.value
    setLocalValue(newVal) // update lokal langsung → tampilan responsif

    // Debounce update ke parent state (mencegah re-render seluruh grid)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        handleScoreChange(studentId, 'other', field, newVal)
      }
    }, 300)

    // autoResize tetap instan
    autoResize(e)
  }, [studentId, field, handleScoreChange, autoResize])

  const handlePaste = useCallback((e) => {
    // Untuk paste, flush debounce dan update langsung setelah sanitasi
    if (debounceRef.current) clearTimeout(debounceRef.current)
    e.preventDefault()
    const raw = e.clipboardData.getData('text/plain')
    const cleaned = sanitizeText(raw)
    const ta = e.target
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = localValue.substring(0, start) + cleaned + localValue.substring(end)
    setLocalValue(next)
    handleScoreChange(studentId, 'other', field, next)
  }, [localValue, studentId, field, handleScoreChange])

  // Saat blur, pastikan value terbaru tersinkron (flush debounce)
  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      handleScoreChange(studentId, 'other', field, localValue)
    }
  }, [studentId, field, localValue, handleScoreChange])

  return (
    <textarea
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      value={localValue}
      onChange={handleChange}
      onPaste={handlePaste}
      onBlur={handleBlur}
      onInput={autoResize}
      className={`w-full bg-slate-950 border border-slate-800 rounded-lg p-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 resize-y disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:cursor-default ${colorClass} ${className}`}
    />
  )
})

export default DescriptionTextarea
