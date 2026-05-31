Berikut adalah **PRD (Product Requirements Document)** untuk aplikasi **E-Rapor SMP IT Al Anshar** yang dapat langsung dijadikan acuan pengembangan menggunakan **ReactJS + TailwindCSS + Supabase + Vercel**.

# PRD E-RAPOR SMP IT AL ANSHAR

## 1. Informasi Umum

### Nama Produk

E-Rapor SMP IT Al Anshar

### Tujuan

Membangun sistem rapor digital yang memungkinkan:

* Admin mengelola data siswa
* Admin membuat periode rapor
* Guru Mapel menginput nilai
* Guru Wali Kelas menginput kepatuhan dan ketidakhadiran
* Admin mencetak rapor otomatis

### Teknologi

Frontend:

* ReactJS (Vite)
* TailwindCSS
* React Router
* React Hook Form
* TanStack Query

Backend:

* Supabase Authentication
* Supabase Database (PostgreSQL)
* Supabase Storage

Hosting:

* Vercel

---

# 2. Role dan Hak Akses

## Admin

Hak akses:

* Dashboard
* Input Siswa
* Buat Rapor
* Cetak Rapor
* Kelola User
* Menentukan Wali Kelas

Tidak dapat:

* Menginput nilai mapel

---

## Guru Mapel

Hak akses:

* Dashboard
* Input Rapor

Tidak dapat:

* Input siswa
* Buat rapor
* Cetak rapor
* Kepatuhan siswa

---

## Guru Wali Kelas

Hak akses:

* Dashboard
* Input Rapor (mapel miliknya)
* Kepatuhan Siswa

Tidak dapat:

* Input siswa
* Buat rapor
* Cetak rapor

---

# 3. Struktur Sidebar

## Admin

* Dashboard
* Input Siswa
* Buat Rapor
* Cetak Rapor

---

## Guru Mapel

* Dashboard
* Input Rapor

---

## Guru Wali Kelas

* Dashboard
* Input Rapor
* Kepatuhan Siswa

---

# 4. Modul Login

## Fitur

Login menggunakan:

* Email
* Password

Authentication:

* Supabase Auth

Setelah login:

Redirect berdasarkan role.

| Role       | Redirect  |
| ---------- | --------- |
| Admin      | Dashboard |
| Guru Mapel | Dashboard |
| Wali Kelas | Dashboard |

---

# 5. Dashboard

Menampilkan:

### Admin

* Total siswa
* Total guru
* Total rapor aktif
* Total kelas

### Guru

* Jumlah kelas yang diajar
* Jumlah rapor yang harus diisi

---

# 6. Modul Input Siswa

Hanya Admin.

## CRUD Siswa

Field:

* NISN
* Nama Siswa
* Kelas
* Tahun Ajaran
* Fase
* Nama Orang Tua/Wali

Fitur:

* Tambah
* Edit
* Hapus
* Cari siswa

---

# 7. Modul Buat Rapor

Hanya Admin.

## Contoh

Kelas VII Semester I Tahun 2025/2026

Admin dapat:

* Tambah rapor
* Edit rapor
* Hapus rapor

---

## Field

* Nama Rapor
* Kelas
* Semester
* Tahun Ajaran
* Wali Kelas
* Kepala Sekolah

---

## Mata Pelajaran

Admin dapat menambah:

* Pendidikan Agama
* Bahasa Indonesia
* Matematika
* IPA
* IPS
* dst

CRUD mata pelajaran.

---

## Aturan

Jika rapor belum dibuat:

Guru Mapel tidak dapat melihat data pada menu Input Rapor.

---

# 8. Relasi Guru dan Mata Pelajaran

Setiap guru memiliki:

* Nama
* Email
* Role
* Mata Pelajaran

Contoh:

Guru A

Mapel:

* Matematika

Guru tersebut hanya dapat mengisi nilai Matematika.

---

# 9. Penentuan Wali Kelas

Admin memilih guru yang menjadi wali kelas.

Contoh:

Kelas VII A

Wali Kelas:

Guru B

Guru B otomatis mendapatkan menu:

* Kepatuhan Siswa

---

# 10. Modul Input Rapor

Hak akses:

* Guru Mapel
* Guru Wali Kelas (untuk mapel miliknya)

---

## Alur

Pilih:

* Tahun Ajaran
* Semester
* Kelas
* Mata Pelajaran

Lalu klik:

"Buat"

---

## Formatif

CRUD Materi

Contoh:

* Bab 1
* Bab 2

---

### TP (Tujuan Pembelajaran)

Setiap materi memiliki TP.

Contoh:

Bab 1

TP:

* TP1
* TP2
* TP3

CRUD TP.

---

## Sumatif Lingkup Materi

CRUD Sumatif.

Contoh:

* Sumatif Bab 1
* Sumatif Bab 2

---

# 11. Input Nilai

Setelah klik Buat.

Muncul tabel siswa.

| NISN | Nama  |
| --- | ----- |
| 001 | Ahmad |

---

## Kolom Formatif

Untuk setiap TP.

Contoh:

TP1

TP2

TP3

---

## Nilai Akhir Formatif

Otomatis:

```text
(Total Nilai TP) / Jumlah TP
```

---

## Sumatif Lingkup Materi

Input guru.

---

## Nilai Akhir Sumatif

```text
(Total Sumatif) / Jumlah Sumatif
```

---

# 12. Sumatif Tengah Semester

Terdiri dari:

* Praktik
* Tertulis

---

## Nilai Akhir STS

Jika satu terisi:

```text
Nilai akhir = nilai yang terisi
```

Jika dua terisi:

```text
(Praktik + Tertulis) / 2
```

---

# 13. Sumatif Akhir Semester

Terdiri dari:

* Praktik
* Tertulis

---

## Nilai Akhir SAS

Jika satu terisi:

```text
Nilai akhir = nilai yang terisi
```

Jika dua terisi:

```text
(Praktik + Tertulis) / 2
```

---

# 14. Deskripsi Ketercapaian Kompetensi

Diisi guru.

Field:

### Capaian Tertinggi

Textarea

---

### Capaian Terendah

Textarea

---

# 15. Nilai Rapor

Otomatis dihitung.

Formula:

```text
(
Nilai Akhir Formatif
+
Nilai Akhir Sumatif
+
Nilai Akhir STS
+
Nilai Akhir SAS
)
/
4
```

Dibulatkan:

```javascript
Math.round(nilai)
```

---

# 16. Modul Kepatuhan Siswa

Hanya Wali Kelas.

Field:

* Sakit
* Izin
* Tanpa Keterangan

Contoh:

| Sakit | Izin | Alpha |
| ----- | ---- | ----- |
| 2     | 1    | 0     |

Jika sudah diisi:

Tidak perlu input ulang.

Bisa edit.

---

# 17. Modul Cetak Rapor

Hanya Admin.

---

## Filter

* Kelas
* Semester
* Tahun Ajaran

Klik:

"Tampilkan"

---

## Tabel Nilai

| No | Mata Pelajaran | Nilai Akhir |
| -- | -------------- | ----------- |

---

## Deskripsi Kompetensi

Kolom:

* Capaian Tertinggi
* Capaian Terendah

---

# 18. Format Cetak PDF

## Header

```text
YAYASAN AL-ANSHAR AN’NUR

SEKOLAH MENENGAH PERTAMA ISLAM TERPADU (SMP-IT) AL ANSHAR

NPSN : 70055902
Email : smpitalansharalak@gmail.com
HP : 0812 3743 8357

Jl. Waikelo No. 32,
RT.26 RW 06,
Kel. Penkase Oeleta,
Kec. Alak,
Kota Kupang-NTT
```

---

## Judul

```text
LAPORAN HASIL BELAJAR
```

---

## Informasi Siswa

Kiri:

```text
Nama
NIS/NISN
Nama Sekolah
```

Kanan:

```text
Alamat
Kelas
Fase
Semester
Tahun Ajaran
```

---

## Tabel Nilai

| No | Mata Pelajaran | Nilai Akhir | Capaian Tertinggi | Capaian Terendah |
| -- | -------------- | ----------- | ----------------- | ---------------- |

---

## Ketidakhadiran

```text
Ketidakhadiran

Sakit :
Izin :
Tanpa Keterangan :
```

---

## Tanda Tangan

```text
Kota Kupang, Desember 2025

Orang Tua/Wali      Wali Kelas

Nama Orang Tua      Nama Wali Kelas

Mengetahui

Kepala Sekolah

Nama Kepala Sekolah
```

---

# 19. Struktur Database Supabase

Tabel utama:

```text
profiles
roles
subjects
students
teachers
report_periods
report_subjects
materials
learning_targets
summatives
student_scores
student_attendance
student_behavior
```

Relasi:

```text
users
 └── profiles

report_periods
 └── report_subjects

students
 └── student_scores

teachers
 └── subjects

report_periods
 └── wali_kelas

report_periods
 └── kepala_sekolah
```

---

# 20. Target MVP

Versi pertama harus sudah mendukung:

✅ Login

✅ Role Admin

✅ Role Guru Mapel

✅ Role Wali Kelas

✅ CRUD Siswa

✅ CRUD Rapor

✅ CRUD Mata Pelajaran

✅ Input Nilai

✅ Perhitungan Otomatis

✅ Kepatuhan Siswa

✅ Cetak PDF

✅ Hosting di Vercel

✅ Database Supabase


database saya :
VITE_SUPABASE_URL=https://oerkrgwsdjkeoweibomh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_9QQOMNUsP-rS4n4svW9t3Q_7KrAY7x5

