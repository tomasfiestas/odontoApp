-- Crear tabla de odontogramas
CREATE TABLE IF NOT EXISTS public.odontograms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    tooth_number integer NOT NULL,
    condition varchar(50) NOT NULL, -- Ej: 'healthy', 'caries', 'extracted', 'crown', etc.
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(patient_id, tooth_number) -- Un paciente solo puede tener un registro activo por diente
);

-- Políticas RLS (Row Level Security)
ALTER TABLE public.odontograms ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Permitir si el usuario autenticado tiene al menos una clínica en común con la clínica asignada al paciente de este odontograma
CREATE POLICY "Select odontograms from assigned clinics" ON public.odontograms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.patients p
            JOIN public.doctor_clinics dc ON p.clinic_id = dc.clinic_id
            WHERE p.id = odontograms.patient_id AND dc.doctor_id = auth.uid()
        )
    );

-- Política INSERT: Permitir si el usuario autenticado tiene acceso al paciente (igual a select)
CREATE POLICY "Insert odontograms" ON public.odontograms
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.patients p
            JOIN public.doctor_clinics dc ON p.clinic_id = dc.clinic_id
            WHERE p.id = odontograms.patient_id AND dc.doctor_id = auth.uid()
        )
    );

-- Política UPDATE: Permitir cambiar condicion
CREATE POLICY "Update odontograms" ON public.odontograms
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.patients p
            JOIN public.doctor_clinics dc ON p.clinic_id = dc.clinic_id
            WHERE p.id = odontograms.patient_id AND dc.doctor_id = auth.uid()
        )
    );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_odontograms_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_odontograms_updated_at
BEFORE UPDATE ON public.odontograms
FOR EACH ROW
EXECUTE FUNCTION update_odontograms_updated_at_column();
