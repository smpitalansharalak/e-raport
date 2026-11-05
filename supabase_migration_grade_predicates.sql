-- ============================================================================
-- Migrasi: Predikat Nilai (Grade Predicates)
-- ============================================================================
-- Jalankan SATU KALI di Supabase SQL Editor (boleh setelah migrasi Format
-- Penilaian, urutan bebas — tidak saling bergantung). Idempotent: aman
-- dijalankan berulang kali.
--
-- Yang dilakukan:
--   1. Tabel grade_predicates: daftar predikat (label, deskripsi, rentang)
--   2. Tabel predicate_settings: SATU baris — penempatan predikat
--      (input / rata-rata komponen / nilai akhir)
--   3. Seed 4 predikat bawaan (A-D) HANYA jika tabel masih kosong
-- ============================================================================

BEGIN;

-- ─── 1. GRADE PREDICATES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grade_predicates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    label TEXT NOT NULL,                    -- mis. 'A' atau 'Sangat Baik'
    description TEXT,                       -- mis. 'Sangat Baik' (opsional)
    min_score NUMERIC NOT NULL,             -- inklusif
    max_score NUMERIC NOT NULL,             -- inklusif (boleh desimal, mis. 89.99)
    sort_order INTEGER NOT NULL DEFAULT 0,  -- urutan terbaik → terjelek (untuk warna otomatis)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CHECK (min_score <= max_score)
);

ALTER TABLE public.grade_predicates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all actions for authenticated" ON public.grade_predicates;
CREATE POLICY "Allow all actions for authenticated" ON public.grade_predicates
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 2. PREDICATE SETTINGS (satu baris) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.predicate_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),  -- hanya boleh 1 baris
    show_on_inputs BOOLEAN NOT NULL DEFAULT FALSE,           -- predikat di setiap sel input (TP/item/sub)
    show_on_component_averages BOOLEAN NOT NULL DEFAULT TRUE, -- predikat di kolom Rrt komponen
    show_on_final BOOLEAN NOT NULL DEFAULT TRUE,             -- predikat di kolom Rapor
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.predicate_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all actions for authenticated" ON public.predicate_settings;
CREATE POLICY "Allow all actions for authenticated" ON public.predicate_settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.predicate_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- ─── 3. Seed predikat bawaan (hanya jika tabel kosong) ───────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.grade_predicates) THEN
        INSERT INTO public.grade_predicates (label, description, min_score, max_score, sort_order, is_active) VALUES
            ('A', 'Sangat Baik', 90,   100,    0, TRUE),
            ('B', 'Baik',         80,   89.99,  1, TRUE),
            ('C', 'Cukup',        75,   79.99,  2, TRUE),
            ('D', 'Perlu Bimbingan', 0, 74.99,  3, TRUE);
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- SELESAI. Pengelolaan predikat dilakukan lewat menu admin "Predikat".
-- ============================================================================
