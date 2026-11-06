-- ============================================================================
-- Migrasi: Student status `Pindah/Keluar`
-- ============================================================================
-- Jalankan SATU KALI di Supabase SQL Editor. Idempotent: aman dijalankan
-- berulang kali.
--
-- Yang dilakukan:
--   1. Cek nilai `students.status` yang di luar daftar yang diizinkan
--   2. Drop CHECK constraint `students_status_check`
--   3. Tambah CHECK baru yang mencakup status lama + `pindah_keluar`
--
-- Sebelum menjalankan, cek constraint lama dan nilai yang dipakai:
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.students'::regclass AND contype = 'c';
--
--   SELECT DISTINCT status FROM public.students ORDER BY status;
--
-- Jika ada nilai status di luar ('aktif','naik_kelas','lulus','alumni','pindah_keluar'),
-- tambahkan nilai itu ke kedua daftar di bawah sebelum dijalankan.
-- ============================================================================

BEGIN;

-- ─── 1. Tolak migrasi jika ada nilai status tak dikenal ────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.students
        WHERE status IS NOT NULL
          AND status NOT IN ('aktif', 'naik_kelas', 'lulus', 'alumni', 'pindah_keluar')
    ) THEN
        RAISE EXCEPTION 'Ada nilai students.status di luar daftar. Tambahkan ke daftar CHECK sebelum migrasi.';
    END IF;
END $$;

-- ─── 2. Drop constraint lama dan buat ulang dengan daftar lengkap ──────────
ALTER TABLE public.students
    DROP CONSTRAINT IF EXISTS students_status_check;

ALTER TABLE public.students
    ADD CONSTRAINT students_status_check
    CHECK (status IN ('aktif', 'naik_kelas', 'lulus', 'alumni', 'pindah_keluar'));

COMMIT;

-- ============================================================================
-- SELESAI. Verifikasi dengan:
--   SELECT pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.students'::regclass AND conname = 'students_status_check';
-- ============================================================================
