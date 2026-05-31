-- SQL Script to set up the E-Rapor SMP IT Al Anshar Database

-- 1. PROFILES & ROLES
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. REPORT SUBJECTS (Mata pelajaran pada periode rapor tertentu)
CREATE TABLE public.report_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_period_id UUID REFERENCES public.report_periods(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    UNIQUE (report_period_id, subject_id)
);

-- 7. MATERIALS (FORMATIF LINGKUP MATERI - e.g., Bab 1, Bab 2)
CREATE TABLE public.materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_period_id UUID REFERENCES public.report_periods(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'Bab 1 Bilangan Bulat'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. LEARNING TARGETS (TUJUAN PEMBELAJARAN - TP)
CREATE TABLE public.learning_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g., 'TP1', 'TP2'
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. SUMMATIVES (SUMATIF LINGKUP MATERI - e.g., Sumatif Bab 1, Sumatif Bab 2)
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
    scores_formative JSONB DEFAULT '{}'::jsonb, -- Format: {"<learning_target_id>": 85, ...}
    scores_summative JSONB DEFAULT '{}'::jsonb, -- Format: {"<summative_id>": 80, ...}
    sts_practice NUMERIC,
    sts_written NUMERIC,
    sas_practice NUMERIC,
    sas_written NUMERIC,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (student_id, report_period_id)
);

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

-- 12. AUTOMATIC PROFILE CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
        new.id,
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
