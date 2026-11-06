-- SQL Script to set up the E-Rapor SMP IT Al Anshar Database

-- 1. PROFILES & ROLES
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'guru_mapel', 'wali_kelas')) DEFAULT 'guru_mapel',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. SUBJECTS (MATA PELAJARAN)
CREATE TABLE public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    class_name TEXT, -- Grade level (e.g. 'VII', 'VIII', 'IX')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (name, class_name)
);

-- 3. TEACHER SUBJECTS RELATION (Guru mengajar Mapel apa saja)
CREATE TABLE public.teacher_subjects (
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

-- 4. STUDENTS (DATA SISWA)
CREATE TABLE public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nisn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    phase TEXT NOT NULL DEFAULT 'D',
    parent_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4a. ASSESSMENT FORMATS (FORMAT PENILAIAN — template reusable buatan admin)
CREATE TABLE public.assessment_formats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    calculation_mode TEXT NOT NULL DEFAULT 'equal' CHECK (calculation_mode IN ('equal', 'weighted')),
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4b. ASSESSMENT FORMAT COMPONENTS (komponen di dalam sebuah format)
CREATE TABLE public.assessment_format_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    format_id UUID NOT NULL REFERENCES public.assessment_formats(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'countable' CHECK (kind IN ('countable', 'fixed')), -- countable = jumlah ditentukan guru | fixed = selalu ada
    with_tp BOOLEAN NOT NULL DEFAULT FALSE,          -- item berisi TP (Bab → TP)
    tp_aggregation TEXT NOT NULL DEFAULT 'global' CHECK (tp_aggregation IN ('global', 'per_item')),
    sub_values JSONB,                                -- NULL = nilai tunggal; [{"key","label"}] untuk sub-nilai (mis. Praktik/Tertulis)
    weight NUMERIC CHECK (weight IS NULL OR weight >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE INDEX idx_afc_format ON public.assessment_format_components(format_id);

-- 4c & 4d (period_components & assessment_items) dibuat setelah report_periods — lihat bagian 5c.

-- 5. REPORT PERIODS (PERIODE RAPOR)
CREATE TABLE public.report_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- e.g., 'Kelas VII Semester I Tahun 2025/2026'
    class_name TEXT NOT NULL, -- e.g., 'VII A'
    semester TEXT NOT NULL CHECK (semester IN ('I', 'II')),
    academic_year TEXT NOT NULL, -- e.g., '2025/2026'
    wali_kelas_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    kepala_sekolah_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    format_id UUID REFERENCES public.assessment_formats(id) ON DELETE SET NULL, -- Format penilaian yang dipakai; komponen disalin ke period_components
    calculation_mode TEXT NOT NULL DEFAULT 'equal' CHECK (calculation_mode IN ('equal', 'weighted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5c. PERIOD COMPONENTS (SNAPSHOT komponen per periode — guru bekerja dari tabel ini)
CREATE TABLE public.period_components (
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
CREATE INDEX idx_period_components_period ON public.period_components(report_period_id);

-- 5d. ASSESSMENT ITEMS (item yang ditambahkan guru per periode + mapel, mis. "Bab 1")
CREATE TABLE public.assessment_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_period_id UUID NOT NULL REFERENCES public.report_periods(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    period_component_id UUID NOT NULL REFERENCES public.period_components(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE INDEX idx_assessment_items_lookup ON public.assessment_items(report_period_id, subject_id, period_component_id);

-- 6. REPORT SUBJECTS (Mata pelajaran pada periode rapor tertentu)
CREATE TABLE public.report_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_period_id UUID REFERENCES public.report_periods(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    UNIQUE (report_period_id, subject_id)
);

-- 7. MATERIALS (LEGACY — dipertahankan untuk data lama; kode baru memakai assessment_items)
CREATE TABLE public.materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_period_id UUID REFERENCES public.report_periods(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'Bab 1 Bilangan Bulat'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. LEARNING TARGETS (TUJUAN PEMBELAJARAN - TP)
--    TP sekarang tertanam pada assessment_items (Bab). learning_targets.material_id
--    dibiarkan ada sebagai LEGACY; assessment_item_id dipakai oleh kode baru.
CREATE TABLE public.learning_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    assessment_item_id UUID REFERENCES public.assessment_items(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g., 'TP1', 'TP2'
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE INDEX idx_learning_targets_item ON public.learning_targets(assessment_item_id);

-- 9. SUMMATIVES (LEGACY — dipertahankan untuk data lama; kode baru memakai assessment_items)
CREATE TABLE public.summatives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_period_id UUID REFERENCES public.report_periods(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'Sumatif Bab 1'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. STUDENT SCORES
CREATE TABLE public.student_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    report_period_id UUID REFERENCES public.report_periods(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    scores_formative JSONB DEFAULT '{}'::jsonb, -- Format: {"<learning_target_id>": 85, ...} — dipakai untuk TP pada komponen with_tp
    scores_summative JSONB DEFAULT '{}'::jsonb, -- Format: {"<assessment_item_id>": 80, ...} — dipakai untuk komponen countable tanpa TP
    fixed_scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- Format: {"<period_component_id>": {"<subKey>": number, ...}, ...} — komponen fixed
    sts_practice NUMERIC, -- LEGACY — dipertahankan untuk data lama, tidak dipakai kode baru
    sts_written NUMERIC,  -- LEGACY
    sas_practice NUMERIC, -- LEGACY
    sas_written NUMERIC,  -- LEGACY
    highest_achievement TEXT,
    lowest_achievement TEXT,
    final_score NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (student_id, report_period_id, subject_id)
);

-- 11. STUDENT ATTENDANCE (KEPATUHAN / KETIDAKHADIRAN)
CREATE TABLE public.student_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    report_period_id UUID REFERENCES public.report_periods(id) ON DELETE CASCADE,
    sakit INTEGER DEFAULT 0,
    izin INTEGER DEFAULT 0,
    alpha INTEGER DEFAULT 0,
    catatan_khusus TEXT DEFAULT '',  -- Catatan khusus wali kelas per siswa per periode
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (student_id, report_period_id)
);

-- Migrasi: tambah kolom catatan_khusus jika tabel sudah ada
-- ALTER TABLE public.student_attendance ADD COLUMN IF NOT EXISTS catatan_khusus TEXT DEFAULT '';

-- 11b. GRADE PREDICATES (PREDIKAT NILAI — global, dikelola admin via menu "Predikat")
CREATE TABLE public.grade_predicates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT,
    min_score NUMERIC NOT NULL,
    max_score NUMERIC NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CHECK (min_score <= max_score)
);

-- 11c. PREDICATE SETTINGS (SATU baris — penempatan predikat di tabel input)
CREATE TABLE public.predicate_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    show_on_inputs BOOLEAN NOT NULL DEFAULT FALSE,
    show_on_component_averages BOOLEAN NOT NULL DEFAULT TRUE,
    show_on_final BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

INSERT INTO public.predicate_settings (id) VALUES (true);

-- Seed predikat bawaan (hanya jika tabel masih kosong)
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

-- RLS (Row Level Security) Configuration
-- For simplicity in development, we enable RLS but allow open public access for authenticated users,
-- or we can enforce basic policies. Let's create general SELECT/INSERT/UPDATE policies for authenticated users.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_format_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_predicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predicate_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow update for owners or admin" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Allow insert for system/admin" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);

-- Create generic CRUD policies for authenticated users for other tables
-- A simple, robust policy: Authenticated users can read/write everything to keep development smooth
CREATE POLICY "Allow all actions for authenticated" ON public.subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.teacher_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.report_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.report_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.materials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.learning_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.summatives FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.student_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.student_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.assessment_formats FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.assessment_format_components FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.period_components FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.assessment_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.grade_predicates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated" ON public.predicate_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 12. AUTOMATIC PROFILE CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, name, email, role)
    VALUES (
        new.id,
        LOWER(SPLIT_PART(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'name', SPLIT_PART(new.email, '@', 1)),
        new.email,
        -- The first user to sign up will be 'admin', subsequent users are 'guru_mapel'
        CASE WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin' ELSE 'guru_mapel' END
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
