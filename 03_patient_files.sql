-- 03_patient_files.sql
-- Módulo de Archivos, Radiografías y Estudios por Paciente

-- 1. Crear tabla de archivos de pacientes
CREATE TABLE IF NOT EXISTS public.patient_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'doctor', -- 'doctor' | 'patient'
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL DEFAULT 'radiografia', -- 'radiografia' | 'foto_clinica' | 'consentimiento' | 'estudio' | 'otro'
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    file_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_patient_files_patient ON public.patient_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_files_type ON public.patient_files(file_type);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS:
-- Usuarios autenticados (doctores) pueden ver, insertar y borrar archivos
CREATE POLICY "Doctores autenticados pueden ver archivos"
    ON public.patient_files
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Doctores autenticados pueden insertar archivos"
    ON public.patient_files
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Doctores autenticados pueden eliminar archivos"
    ON public.patient_files
    FOR DELETE
    TO authenticated
    USING (true);

-- Permitir a usuarios anónimos (pacientes con link) subir y registrar archivos
CREATE POLICY "Pacientes pueden subir archivos vía link público"
    ON public.patient_files
    FOR INSERT
    TO anon
    WITH CHECK (source = 'patient');

-- Permitir a anónimos leer datos básicos del paciente para la pantalla de subida
CREATE POLICY "Acceso público lectura básica de paciente para upload"
    ON public.patients
    FOR SELECT
    TO anon
    USING (true);

-- 3. Crear Bucket de Supabase Storage para los archivos
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-files', 'patient-files', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para Storage en el bucket 'patient-files'
CREATE POLICY "Archivos accesibles públicamente"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'patient-files');

CREATE POLICY "Doctores autenticados pueden subir al bucket"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'patient-files');

CREATE POLICY "Pacientes anónimos pueden subir fotos al bucket"
    ON storage.objects FOR INSERT
    TO anon
    WITH CHECK (
        bucket_id = 'patient-files' 
        AND (LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'))
    );
