# Arsitektur E-Rapor

Dokumen ini menjelaskan struktur kode, arah dependensi, dan aturan penempatan
file agar aplikasi mudah dirawat saat fitur bertambah.

## Struktur folder

```
src/
├── app/                  # Shell aplikasi: provider, router, guard
│   ├── App.jsx
│   ├── queryClient.js
│   ├── routes.jsx
│   └── guards/
├── components/
│   ├── layout/           # Header, Sidebar, AppLayout
│   ├── pwa/              # PwaManager
│   └── ui/               # Primitif UI yang dapat dipakai ulang
├── features/             # Satu folder per domain/fitur
│   ├── auth/             # Provider auth, halaman login & ganti password
│   ├── dashboard/
│   ├── students/         # Data siswa + impor Excel
│   ├── users/            # Kelola pengguna & mapel diampu
│   ├── student-status/   # Naik kelas, kelulusan, alumni
│   ├── report-config/    # Periode rapor & mata pelajaran
│   ├── input-rapor/      # Grid penilaian formatif/sumatif
│   ├── kepatuhan/        # Kehadiran, kokurikuler, ekstrakurikuler
│   └── cetak-rapor/      # Pratinjau, cetak PDF, ekspor Excel
├── lib/                  # Integrasi pihak ketiga & util infrastruktur
├── utils/                # Fungsi murni (perhitungan, format, teks)
├── constants/            # Nilai tetap bersama (query keys, role, route)
└── main.jsx
```

## Arah dependensi

```
pages / components (UI)
        ↓
hooks (state + React Query)
        ↓
services (query Supabase)
        ↓
lib/supabase
```

Aturan:

1. **Page/component tidak boleh mengimpor `lib/supabase` secara langsung.**
   Semua akses data lewat hook dan service.
2. **Service hanya berisi query/mutation.** Tidak boleh memakai React, state,
   `swal`, atau navigasi. Service boleh melempar error.
3. **Hook mengatur loading, error, cache, dan invalidasi React Query.**
4. **Component UI hanya menerima props.** Tidak tahu asal data.
5. **`utils` dan `constants` bersifat murni** dan boleh dipakai semua layer.
6. **Antar fitur tidak saling mengimpor.** Jika butuh komponen bersama,
   pindahkan ke `components/ui` atau `utils`.

## Alias impor

Gunakan `@/` untuk menunjuk ke `src/`.

```js
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'
```

## Pola fitur dengan React Query

```
features/<fitur>/
├── <Fitur>Page.jsx        # UI halaman
├── use<Fitur>.js          # useQuery / useMutation
├── <fitur>Service.js      # query Supabase
└── components/            # komponen khusus fitur
```

Contoh:

```js
// studentsService.js
export async function listStudents() {
  const { data, error } = await supabase.from('students').select('*').order('name')
  if (error) throw error
  return data ?? []
}

// useStudents.js
export function useStudents() {
  return useQuery({
    queryKey: queryKeys.students.list(),
    queryFn: listStudents,
  })
}
```

## Konvensi React Query

- Kunci cache wajib diambil dari `src/constants/queryKeys.js`.
- Halaman read-heavy memakai `useQuery`.
- Operasi tulis memakai `useMutation`, lalu `invalidateQueries` pada key terkait.
- Grid editable (Input Rapor, Kepatuhan) tetap memakai state lokal dan mutation
  per baris, bukan menyimpan seluruh isian di cache query.
- Konfigurasi global: `refetchOnWindowFocus: false`, `retry: 1`.
- Data siswa yang dipakai lintas fitur (mis. daftar kelas untuk filter) memakai
  hook `useAvailableClasses` dari fitur `students`. Ini satu-satunya dependensi
  read-only antar fitur yang disengaja; jangan menambah dependensi serupa tanpa
  memindahkan kontraknya ke layer bersama.

## Catatan fitur tertentu

- **Input Rapor** dan **Kepatuhan** tetap memakai state lokal untuk grid editable
  dan mutation per baris. Keduanya tidak menyimpan seluruh isian ke cache query;
  React Query dipakai untuk data yang memang read-heavy (mis. daftar periode).
- **Cetak Rapor** memakai `useQuery` untuk daftar periode dan data lembar rapor.
  Query `sheet` dipisah menjadi `students` + `subjects` + `scores` + `attendance`
  dan menyertakan `alumniMode` pada key agar arsip tidak tercampur data aktif.
- **Auth** mengekspor provider/hook dari `src/features/auth/`; halaman login dan
  ganti password berada di fitur yang sama dan mengakses Supabase lewat
  `authService.js`.

## Status migrasi

Struktur target sudah diterapkan seluruhnya. Semua halaman berada di
`src/features/*/`, hook dan service terpisah, dan tidak ada lagi shim di
`src/context/`, `src/pages/`, atau `src/hooks/`. Setiap tahap harus lolos
`npm run lint` dan `npm run build`.
