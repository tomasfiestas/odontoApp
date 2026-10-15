-- 1. Agregar configuración de emails a los perfiles de los doctores
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_reminders BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_days_advance INTEGER DEFAULT 2;

-- 2. Actualizar el constraint de 'status' en appointments para permitir 'confirmado'
-- Intentamos eliminar el constraint anterior buscando su nombre (generalmente 'appointments_status_check')
DO $$
DECLARE
    con_name text;
BEGIN
    SELECT constraint_name INTO con_name
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'appointments' AND column_name = 'status';
    
    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE appointments DROP CONSTRAINT IF EXISTS ' || con_name;
    END IF;
END $$;

-- Si no había constraint, simplemente lo agregamos:
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('pendiente', 'completado', 'cancelado', 'confirmado'));

-- 3. Crear RPC para actualizar el estado del turno públicamente
-- Usamos SECURITY DEFINER para que la función pueda actualizar el turno sin importar qué usuario la llame 
-- (incluso un usuario anónimo desde el backend / frontend público).
CREATE OR REPLACE FUNCTION update_appointment_status(apt_id UUID, new_status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar que el nuevo estado sea válido para esta acción
  IF new_status NOT IN ('confirmado', 'cancelado') THEN
    RETURN FALSE;
  END IF;

  -- Actualizar solo si el turno está pendiente
  UPDATE appointments
  SET status = new_status
  WHERE id = apt_id AND status = 'pendiente';

  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;
