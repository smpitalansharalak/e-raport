-- ============================================================================
-- Migrasi: Format Penilaian (Assessment Formats)
-- ============================================================================
-- Jalankan SATU KALI di Supabase SQL Editor SEBELUM deploy frontend baru.
-- Aman untuk database yang sudah berisi data production:
--   - Tidak ada DROP TABLE / DROP COLUMN
--   - Tabel & kolom lama (materials, summatives, sts_practice, dst.) dibiarkan
--   - Periode existing dibuatkan snapshot "Format Legacy" sehingga nilai rapor
--     lama dihitung dengan rumus yang persis sama seperti sebelumnya
--
-- Yang dilakukan:
--   1. Membuat tabel: assessment_formats, assessment_format_components,
--      period_components, assessment_items
--   2. Menambah kolom: report_periods.format_id, report_periods.calculation_mode,
--      learning_targets.assessment_item_id, student_scores.fixed_scores
--   3. Mengisi "Format Legacy" (Formatif TP global + Sumatif input langsung +
--      STS/SAS Praktik & Tertulis, mode rata-rata) dan men-snapshot-nya ke
--      SEMUA periode rapor yang sudah ada
--   4. Memindahkan materials & summatives menjadi assessment_items (id dipakai
--      ulang → skor di scores_formative / scores_summative tetap valid)
--   5. Memindahkan sts_practice / sts_written / sas_practice / sas_written
--      menjadi student_scores.fixed_scores
-- ============================================================================

BEGIN;

-- ─── 1. TABEL BARU ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.assessment_formats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    calculation_mode TEXT NOT NULL DEFAULT 'equal'
        CHECK (calculation_mode IN ('equal', 'weighted')),
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.assessment_format_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    format_id UUID NOT NULL REFERENCES public.assessment_formats(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- countable = guru menentukan jumlah itemnya | fixed = selalu ada, jumlah tidak bisa diubah guru
    kind TEXT NOT NULL DEFAULT 'countable' CHECK (kind IN ('countable', 'fixed')),
    with_tp BOOLEAN NOT NULL DEFAULT FALSE,           -- item berisi TP (hadir untuk Bab → TP)
    tp_aggregation TEXT NOT NULL DEFAULT 'global'
        CHECK (tp_aggregation IN ('global', 'per_item')),  -- global = rata2 semua TP | per_item = rata2 per item lalu antar item
    sub_values JSONB,                                 -- NULL = nilai tunggal; [{"key","label"}, ...] untuk sub-nilai (mis. Praktik/Tertulis)
    weight NUMERIC CHECK (weight IS NULL OR weight >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_afc_format ON public.assessment_format_components(format_id);

-- Snapshot komponen per periode rapor. Guru bekerja dengan tabel INI,
-- sehingga mengedit format tidak mempengaruhi periode yang sudah berjalan.
CREATE TABLE IF NOT EXISTS public.period_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_period_id UUID NOT NULL REFERENCES public.report_periods(id) ON DELETE CASCADE,
    source_component_id UUID REFERENCES public.assessment_format_components(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'countable' CHECK (kind IN ('countable', 'fixed')),
    with_tp BOOLEAN NOT NULL DEFAULT FALSE,
    tp_aggregation TEXT NOT NULL DEFAULT 'global' CHECK (tp_aggregation IN ('global', 'per_item')),
    sub_values JSONB,
    weight NUMERIC,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_period_components_period ON public.period_components(report_period_id);

-- Item penilaian yang ditambahkan guru per periode + mapel + komponen
-- (mis. "Bab 1", "Ulangan Harian 2", "Sumatif Bab 1")
CREATE TABLE IF NOT EXISTS public.assessment_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_period_id UUID NOT NULL REFERENCES public.report_periods(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    period_component_id UUID NOT NULL REFERENCES public.period_components(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assessment_items_lookup
    ON public.assessment_items(report_period_id, subject_id, period_component_id);

-- RLS (pola yang sama dengan tabel lain: authenticated boleh semua)
ALTER TABLE public.assessment_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_format_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;

-- DROP IF EXISTS dulu agar migrasi bisa dijalankan ulang tanpa error (idempotent)
DROP POLICY IF EXISTS "Allow all actions for authenticated" ON public.assessment_formats;
DROP POLICY IF EXISTS "Allow all actions for authenticated" ON public.assessment_format_components;
DROP POLICY IF EXISTS "Allow all actions for authenticated" ON public.period_components;
DROP POLICY IF EXISTS "Allow all actions for authenticated" ON public.assessment_items;

CREATE POLICY "Allow all actions for authenticated" ON public.assessment_formats FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.assessment_format_components FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.period_components FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.assessment_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 2. KOLOM BARU ───────────────────────────────────────────────────────────

ALTER TABLE public.report_periods
    ADD COLUMN IF NOT EXISTS format_id UUID REFERENCES public.assessment_formats(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS calculation_mode TEXT NOT NULL DEFAULT 'equal'
        CHECK (calculation_mode IN ('equal', 'weighted'));

ALTER TABLE public.learning_targets
    ADD COLUMN IF NOT EXISTS assessment_item_id UUID REFERENCES public.assessment_items(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_learning_targets_item ON public.learning_targets(assessment_item_id);

ALTER TABLE public.student_scores
    -- Format: { "<period_component_id>": { "<subKey>": number, ... }, ... }
    ADD COLUMN IF NOT EXISTS fixed_scores JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ─── 3-8. SEED FORMAT LEGACY + SNAPSHOT + BACKFILL ───────────────────────────

DO $$
DECLARE
    legacy_format_id UUID;
    period_rec RECORD;
BEGIN
    -- ── 3. Format Legacy (hanya dibuat sekali) ──
    SELECT id INTO legacy_format_id
    FROM public.assessment_formats
    WHERE name = 'Format Legacy'
    LIMIT 1;

    IF legacy_format_id IS NULL THEN
        INSERT INTO public.assessment_formats (name, description, calculation_mode, is_active, is_default)
        VALUES (
            'Format Legacy',
            'Format bawaan yang mereplikasi penilaian sebelumnya: Formatif (TP, rata-rata semua TP), Sumatif Lingkup Materi (input langsung), STS & SAS (Praktik/Tertulis), nilai akhir = rata-rata.',
            'equal', TRUE, TRUE
        )
        RETURNING id INTO legacy_format_id;

        INSERT INTO public.assessment_format_components
            (format_id, name, kind, with_tp, tp_aggregation, sub_values, weight, sort_order)
        VALUES
            (legacy_format_id, 'Formatif', 'countable', TRUE, 'global', NULL, 25, 0),
            (legacy_format_id, 'Sumatif Lingkup Materi', 'countable', FALSE, 'global', NULL, 25, 1),
            (legacy_format_id, 'STS', 'fixed', FALSE, 'global',
                '[{"key":"practice","label":"Praktik"},{"key":"written","label":"Tertulis"}]'::jsonb, 25, 2),
            (legacy_format_id, 'SAS', 'fixed', FALSE, 'global',
                '[{"key":"practice","label":"Praktik"},{"key":"written","label":"Tertulis"}]'::jsonb, 25, 3);
    END IF;

    -- ── 4. Snapshot komponen ke semua periode yang belum punya komponen ──
    FOR period_rec IN SELECT id FROM public.report_periods LOOP
        IF NOT EXISTS (SELECT 1 FROM public.period_components WHERE report_period_id = period_rec.id) THEN
            INSERT INTO public.period_components
                (report_period_id, source_component_id, name, kind, with_tp, tp_aggregation, sub_values, weight, sort_order)
            SELECT period_rec.id, c.id, c.name, c.kind, c.with_tp, c.tp_aggregation, c.sub_values, c.weight, c.sort_order
            FROM public.assessment_format_components c
            WHERE c.format_id = legacy_format_id
            ORDER BY c.sort_order;

            UPDATE public.report_periods
            SET format_id = legacy_format_id,
                calculation_mode = 'equal'
            WHERE id = period_rec.id;
        END IF;
    END LOOP;

    -- ── 5. materials → assessment_items (id DIPAKE ULANG) ──
    --      FK learning_targets.material_id tetap valid sampai frontend baru aktif.
    INSERT INTO public.assessment_items
        (id, report_period_id, subject_id, period_component_id, name, sort_order, created_at)
    SELECT m.id, m.report_period_id, m.subject_id, pc.id, m.name, 0, m.created_at
    FROM public.materials m
    JOIN public.period_components pc
        ON pc.report_period_id = m.report_period_id
       AND pc.kind = 'countable'
       AND pc.with_tp = TRUE
    WHERE NOT EXISTS (SELECT 1 FROM public.assessment_items ai WHERE ai.id = m.id);

    -- ── 6. summatives → assessment_items (id DIPAKE ULANG)
    --      scores_summative (keyed by summative id) tetap valid. ──
    INSERT INTO public.assessment_items
        (id, report_period_id, subject_id, period_component_id, name, sort_order, created_at)
    SELECT s.id, s.report_period_id, s.subject_id, pc.id, s.name, 0, s.created_at
    FROM public.summatives s
    JOIN public.period_components pc
        ON pc.report_period_id = s.report_period_id
       AND pc.kind = 'countable'
       AND pc.with_tp = FALSE
    WHERE NOT EXISTS (SELECT 1 FROM public.assessment_items ai WHERE ai.id = s.id);

    -- Rapikan sort_order item berdasarkan created_at
    WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY report_period_id, subject_id, period_component_id
                   ORDER BY created_at
               ) - 1 AS rn
        FROM public.assessment_items
    )
    UPDATE public.assessment_items ai
    SET sort_order = ranked.rn
    FROM ranked
    WHERE ranked.id = ai.id;

    -- ── 7. Re-link TP ke assessment_items (id item == material_id lama) ──
    UPDATE public.learning_targets lt
    SET assessment_item_id = lt.material_id
    WHERE lt.assessment_item_id IS NULL
      AND EXISTS (SELECT 1 FROM public.assessment_items ai WHERE ai.id = lt.material_id);

    -- ── 8. sts_practice / sts_written / sas_practice / sas_written → fixed_scores ──
    UPDATE public.student_scores sc
    SET fixed_scores = COALESCE((
        SELECT jsonb_object_agg(comp_id::text, obj)
        FROM (
            SELECT pc.id AS comp_id,
                   jsonb_strip_nulls(jsonb_build_object(
                       'practice', sc.sts_practice,
                       'written',  sc.sts_written
                   )) AS obj
            FROM public.period_components pc
            WHERE pc.report_period_id = sc.report_period_id
              AND pc.name = 'STS'
              AND pc.kind = 'fixed'
              AND (sc.sts_practice IS NOT NULL OR sc.sts_written IS NOT NULL)

            UNION ALL

            SELECT pc.id AS comp_id,
                   jsonb_strip_nulls(jsonb_build_object(
                       'practice', sc.sas_practice,
                       'written',  sc.sas_written
                   )) AS obj
            FROM public.period_components pc
            WHERE pc.report_period_id = sc.report_period_id
              AND pc.name = 'SAS'
              AND pc.kind = 'fixed'
              AND (sc.sas_practice IS NOT NULL OR sc.sas_written IS NOT NULL)
        ) parts
    ), '{}'::jsonb)
    WHERE (
            sc.sts_practice IS NOT NULL OR sc.sts_written IS NOT NULL
            OR sc.sas_practice IS NOT NULL OR sc.sas_written IS NOT NULL
          )
      AND sc.fixed_scores = '{}'::jsonb;

END $$;

COMMIT;

-- ============================================================================
-- SELESAI. Verifikasi cepat (opsional):
--
--   SELECT p.name, p.calculation_mode, count(pc.id) AS jumlah_komponen
--   FROM public.report_periods p
--   LEFT JOIN public.period_components pc ON pc.report_period_id = p.id
--   GROUP BY p.id, p.name, p.calculation_mode
--   ORDER BY p.created_at DESC;
--
--   SELECT count(*) AS item_count FROM public.assessment_items;
--   SELECT count(*) AS tp_belum_ter_link FROM public.learning_targets WHERE assessment_item_id IS NULL;
--     (seharusnya 0; jika tidak, berarti ada TP yatim — periksa manual)
-- ============================================================================
