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
│   ├── assessment-formats/ # Format Penilaian: template komponen buatan admin
│   ├── predicates/       # Predikat nilai global + penempatan badge di tabel input
│   ├── report-config/    # Periode rapor & mata pelajaran (snapshot format saat periode dibuat)
│   ├── input-rapor/      # Grid penilaian dinamis berdasarkan snapshot komponen
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

- **Format Penilaian** (`assessment-formats/`): admin menyusun template komponen
  penilaian (mis. Formatif TP, Sumatif per Bab, Ulangan Harian, STS, SAS).
  Dua tipe komponen: `countable` (jumlah item ditentukan guru, bisa berisi TP —
  `with_tp`, dengan cara hitung `global` / `per_item`) dan `fixed` (selalu ada,
  sub-nilai tunggal atau praktik/tertulis/custom). Mode hitung nilai akhir:
  `equal` (rata-rata komponen terisi) atau `weighted` (bobot, dinormalisasi).
- **Snapshot**: saat periode rapor dibuat, komponen format disalin ke
  `period_components`. Guru Input Rapor bekerja dari snapshot ini — mengubah
  format tidak mempengaruhi periode berjalan. Item yang ditambahkan guru
  disimpan sebagai `assessment_items` (per periode + mapel + komponen).
- **Nilai** disimpan pada `student_scores`: TP → `scores_formative`, input
  langsung item → `scores_summative`, komponen fixed → `fixed_scores`.
  Komponen yang kosong selalu dilewati saat menghitung nilai akhir.
- **Migrasi** database lama → baru ada di `supabase/migrations/assessment_formats.sql`
  dan `supabase/migrations/grade_predicates.sql` (keduanya idempotent, tidak
  menghapus data lama; periode existing di-snapshot ke "Format Legacy" sehingga
  nilai rapor lama tetap dihitung dengan rumus lama).
- **Predikat** (`predicates/`): daftar predikat global (label + rentang, urutan
  terbaik→terjelek menentukan warna otomatis) dan satu baris `predicate_settings`
  untuk penempatan badge (`show_on_inputs` / `show_on_component_averages` /
  `show_on_final`). Badge hanya display saat mengisi nilai — tidak disimpan dan
  tidak mempengaruhi `final_score`.
- **Arsip Rapor**: periode non-aktif = arsip. Di Cetak Rapor ada 2 tab
  (Periode Aktif / Arsip Rapor) dengan SATU logika daftar siswa: union cocok
  kelas+tahun ajaran ∪ punya nilai/kehadiran di periode itu ∪ `previous_class`.
  Pengarsipan dilakukan lewat tombol "Arsipkan" di kartu periode (Buat Rapor);
  periode arsip tidak dapat dihapus dari UI.
- **Rincian Nilai** (admin, Cetak Rapor): tombol "Rincian" per siswa membuka
  modal read-only berisi seluruh input guru per mapel (nilai TP/item/sub-nilai,
  Rrt per komponen + predikat, deskripsi, nilai akhir). Berjalan untuk periode
  aktif maupun arsip.
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
