/**
 * Membungkus promise dengan batas waktu agar permintaan jaringan yang menggantung
 * tidak membuat UI berputar tanpa akhir.
 */
export function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}
