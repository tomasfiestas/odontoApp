-- 04_clinical_enhancements.sql
-- Módulo de Alertas Médicas Críticas, Planes de Tratamiento (Presupuestos) y Cuenta Corriente

-- 1. Agregar columnas de Alertas Médicas a la tabla patients
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS medical_alerts TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS medical_notes TEXT;

-- 2. Crear tabla de Planes de Tratamiento / Presupuestos
CREATE TABLE IF NOT EXISTS public.treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL DEFAULT 'Plan de Tratamiento',
    status VARCHAR(30) NOT NULL DEFAULT 'borrador', -- 'borrador' | 'presentado' | 'aceptado' | 'en_curso' | 'finalizado' | 'cancelado'
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS', -- 'ARS' | 'USD'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON public.treatment_plans(status);

-- 3. Crear tabla de Ítems / Prestaciones de cada Plan
CREATE TABLE IF NOT EXISTS public.treatment_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
    tooth_number VARCHAR(10), -- '11', '36', 'General', etc.
    procedure_name VARCHAR(255) NOT NULL,
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'en_proceso' | 'completado'
    notes TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON public.treatment_plan_items(plan_id);

-- 4. Asegurar tabla payments con soporte para pagos parciales y cuentas corrientes
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    clinical_history_id UUID REFERENCES public.clinical_history(id) ON DELETE SET NULL,
    treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS', -- 'ARS' | 'USD'
    method VARCHAR(30) NOT NULL DEFAULT 'efectivo', -- 'efectivo' | 'transferencia' | 'tarjeta' | 'otro'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_patient ON public.payments(patient_id);

-- 5. Habilitar RLS en las nuevas tablas
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Políticas para doctores autenticados
CREATE POLICY "Doctores pueden gestionar planes de tratamiento"
    ON public.treatment_plans FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Doctores pueden gestionar ítems de planes"
    ON public.treatment_plan_items FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Doctores pueden gestionar pagos"
    ON public.payments FOR ALL
    TO authenticated USING (true) WITH CHECK (true);
