# 📋 Instrucciones para ejecutar en Supabase

Guía paso a paso para ejecutar cuando estés en tu casa o tengas acceso al panel de **[Supabase](https://supabase.com/dashboard)**.

---

## 🚀 Pasos Generales
1. Entrá a tu proyecto en **Supabase**.
2. En el menú lateral izquierdo, hacé clic en **SQL Editor** (ícono `>_`).
3. Hacé clic en **"New query"** (arriba a la derecha).
4. Copiá y pegá el contenido de cada script en el orden indicado abajo y dale a **"Run"** (o `Ctrl + Enter`).

---

## 🗂️ Scripts a Ejecutar (En orden)

### 1️⃣ `01_odontograms.sql` (Odontograma interactivo)
* **Qué hace:** Crea la tabla `odontograms` para guardar el estado pieza por pieza de la dentición de cada paciente con sus notas de diagnóstico.
* **Archivo:** [`01_odontograms.sql`](./01_odontograms.sql)

---

### 2️⃣ `02_email_automation.sql` (Automatización de Correos & Confirmación)
* **Qué hace:**
  - Agrega columnas de preferencias de recordatorios por email a los perfiles de doctores (`email_reminders`, `reminder_days_advance`).
  - Agrega el estado `'confirmado'` a la columna `status` de los turnos.
  - Crea la función RPC `update_appointment_status` que permite a los pacientes confirmar o cancelar turnos desde el link que les llega por correo sin loguearse.
* **Archivo:** [`02_email_automation.sql`](./02_email_automation.sql)

---

### 3️⃣ `03_patient_files.sql` (Módulo de Archivos, Radiografías, Tokens de 1 solo uso y Storage)
* **Qué hace:**
  - Crea la tabla `patient_files` para registrar todas las radiografías, fotos clínicas, consentimientos y estudios de cada paciente.
  - Crea la tabla `patient_upload_tokens` para generar enlaces seguros de un solo uso con expiración a las 48 horas (se queman automáticamente apenas el paciente envía las fotos).
  - Crea el bucket de almacenamiento **`patient-files`** en Supabase Storage.
  - Configura las políticas de seguridad (RLS) para doctores y pacientes anónimos.
* **Archivo:** [`03_patient_files.sql`](./03_patient_files.sql)

---

### 4️⃣ `04_clinical_enhancements.sql` (Alertas Médicas, Presupuestos y Cuenta Corriente)
* **Qué hace:**
  - Agrega columnas de alertas médicas a `patients` (`medical_alerts`, `allergies`, `medical_notes`).
  - Crea las tablas `treatment_plans` y `treatment_plan_items` para cotizaciones y presupuestos en PDF.
  - Configura la tabla `payments` para seguimiento de cuenta corriente y pagos parciales.
* **Archivo:** [`04_clinical_enhancements.sql`](./04_clinical_enhancements.sql)

---

## 📦 Verificación en Supabase Storage
Luego de correr el script `03_patient_files.sql`:
1. En el menú lateral de Supabase, andá a **Storage**.
2. Verificá que aparezca el bucket **`patient-files`**.
3. Si por alguna razón el bucket no se creó automáticamente con el script SQL, simplemente hacé clic en **"New bucket"**, poné de nombre exacto: `patient-files`, marcalo como **Public bucket** y guardalo.

---

> 💡 **Nota:** Si necesitás consultar las credenciales de tu proyecto para Vercel o para tu `.env.local`, andá a **Project Settings > Data API** y copiá la **URL** y la clave **anon (public)**.
