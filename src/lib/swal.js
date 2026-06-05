import Swal from 'sweetalert2'

// Base instance dengan tema sekolah (light mode sesuai index.css)
const SwalBase = Swal.mixin({
    customClass: {
        popup:
            'rounded-2xl border border-slate-200 shadow-2xl font-outfit',
        title: 'text-slate-900 font-bold text-lg',
        htmlContainer: 'text-slate-600 text-sm',
        confirmButton:
            'bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all',
        cancelButton:
            'bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-sm transition-all',
        denyButton:
            'bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all',
        icon: 'border-0',
    },
    buttonsStyling: false,
    reverseButtons: true,
})

// ── Konfirmasi hapus ───────────────────────────────────────────────
export const confirmDelete = (title = 'Hapus data ini?', text = 'Tindakan ini tidak dapat dibatalkan.') =>
    SwalBase.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal',
    })

// ── Konfirmasi umum ────────────────────────────────────────────────
export const confirmAction = (title, text, confirmText = 'Ya, Lanjutkan') =>
    SwalBase.fire({
        title,
        text,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: 'Batal',
    })

// ── Sukses ─────────────────────────────────────────────────────────
export const showSuccess = (title, text = '') =>
    SwalBase.fire({ title, text, icon: 'success', timer: 2500, showConfirmButton: false })

// ── Error ──────────────────────────────────────────────────────────
export const showError = (title, text = '') =>
    SwalBase.fire({ title, text, icon: 'error' })

// ── Info ───────────────────────────────────────────────────────────
export const showInfo = (title, text = '') =>
    SwalBase.fire({ title, text, icon: 'info' })

// ── Loading (non-blocking) ─────────────────────────────────────────
export const showLoading = (title = 'Memproses...') => {
    SwalBase.fire({ title, allowOutsideClick: false, showConfirmButton: false })
    SwalBase.showLoading()
}

export const closeLoading = () => Swal.close()

// ── Export default untuk custom usage ─────────────────────────────
export default SwalBase