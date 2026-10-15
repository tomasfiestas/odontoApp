# 🦷 DentApp — Roadmap de Funcionalidades y Módulos de Alto Impacto

Este documento recopila las funcionalidades clave diseñadas para resolver los dolores de cabeza diarios más críticos en el ejercicio de la odontología clínica.

---

## 🗂️ 1. Módulo de Archivos, Radiografías y Estudios (✅ Implementado v1.0)

### Visión
Los odontólogos trabajan intensamente con material visual (radiografías periapicales, panorámicas, tomografías, fotos intraorales de evolución). Actualmente, este material suele dispersarse en chats de WhatsApp o carpetas locales no sincronizadas.

### Componentes Implementados:
1. **Almacenamiento (Supabase Storage):**
   - Bucket: `patient-files` (script `03_patient_files.sql`).
   - Soporte para imágenes de alta definición y documentos médicos (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`).
2. **Carga y Gestión por el Profesional (`PatientFiles.jsx`):**
   - Acceso directo desde la ficha del paciente (`PatientDetail.jsx`).
   - Zona **Drag & Drop** interactiva + selector manual de archivos de la PC.
   - Categorización rápida:
     - 🩻 **Radiografías** (Panorámicas, periapicales, bite-wing, oclusales).
     - 📸 **Fotos Clínicas** (Antes / Después, seguimiento estético u ortodóntico).
     - 📑 **Consentimientos y Recetas** (Documentación firmada, respaldo legal).
     - 📄 **Estudios y Tomografías** (Informes externos, análisis cefalométricos).
   - Distintivo visual de origen: `👨‍⚕️ Doctor` o `📸 Paciente`.
3. **Enlaces Seguros de Un Solo Uso (`PatientUpload.jsx`):**
   - Generación de token UUID único con validez de 48 horas (`patient_upload_tokens`).
   - **Quema automática:** Apenas el paciente envía sus fotos, el enlace se marca como `used = true` y queda desactivado permanentemente para proteger la privacidad.
   - Pantalla explicativa amigable si el paciente intenta volver a ingresar a un enlace ya utilizado o vencido.
   - Botón directo para compartir por **WhatsApp** con mensaje prearmado.
   - Mobile-First: Cámara del celular o selección múltiple desde la galería de fotos.
4. **Negatoscopio Digital (Lightbox):**
   - Zoom interactivo (`+` y `-`).
   - Rotación en 90° para inspección anatómica.
   - Navegación entre imágenes con teclado (flechas) y botones.
   - Descarga directa en alta resolución.

---

## 📑 2. Planes de Tratamiento y Presupuestos (✅ Implementado v1.0)

### Componentes Implementados:
- **Gestión Multi-Prestación (`PatientTreatmentPlans.jsx` & `TreatmentPlanModal.jsx`):**
  - Armado de presupuestos con título, notas y múltiples prestaciones desglosadas por pieza dental (FDI 11 a 48 o General), costo unitario y estado del procedimiento (*Pendiente, En curso, Realizado*).
  - Cálculo dinámico de totales en tiempo real.
  - Flujo de estados del presupuesto: *Borrador ➔ Presentado ➔ Aceptado ➔ En curso ➔ Finalizado ➔ Rechazado*.
- **Generación de Presupuesto Imprimible / PDF:**
  - Vista clínica formal (`window.print()`) con membrete de la clínica, datos completos del paciente, tabla detallada de prestaciones y firmas de conformidad (Profesional y Paciente).
- **Compartir por WhatsApp en 1 Clic:**
  - Generador de mensaje preformateado con el desglose del plan y el total para enviar instantáneamente al chat del paciente.

---

## 💰 3. Cuenta Corriente y Saldo del Paciente (✅ Implementado v1.0)

### Componentes Implementados:
- **Semáforo de Saldo en la Ficha del Paciente (`PatientDetail.jsx`):**
  - 🟢 **Al día (Sin saldo pendiente):** Cuando todos los planes aceptados/en curso están saldados.
  - 🔴 **Saldo Deudor:** Muestra destacada del monto pendiente en pesos (ej. `$ 45.000`), parpadeante para máxima atención.
- **Registro Rápido de Cobros (`PaymentModal.jsx`):**
  - Botón directo `💰 + Registrar Cobro` en la cabecera del paciente y en el panel de presupuestos.
  - Selección de método de pago: *Efectivo, Transferencia bancaria, Tarjeta de débito/crédito, Otro*.
  - Posibilidad de imputar el pago a un presupuesto específico o como pago a cuenta general.
- **Historial de Cobros y Balance:**
  - Tabla de recibos con fecha, método de pago, presupuesto asociado y notas del pago.

---

## ⚠️ 4. Alertas Médicas Críticas / Banderas Rojas (✅ Implementado v1.0)

### Componentes Implementados:
- **Checklist Clínico en Alta/Edición (`PatientModal.jsx`):**
  - Selector interactivo tipo badge de condiciones de alto riesgo:
    - 💊 **Alérgico a Penicilina**
    - ❤️ **Hipertensión (Sin vasoconstrictor)**
    - 🩸 **Anticoagulado**
    - 💉 **Diabetes**
    - 🫀 **Cardiopatía**
    - 🤰 **Embarazo**
    - 🧤 **Alergia al Látex**
    - 💊 **Alergia a AINEs**
  - Campos abiertos para alergias adicionales y medicación habitual / antecedentes clínicos.
- **Banner de Máxima Visibilidad en la Ficha (`PatientDetail.jsx`):**
  - Franja roja superior con ícono de advertencia pulsante `⚠️ ALERTAS MÉDICAS CRÍTICAS (ANAMNESIS)` visible al instante para evitar cualquier error de medicación o anestesia.
- **Badges en el Listado de Pacientes (`Patients.jsx`):**
  - Indicador `🚨 Alerta Médica` visible directamente en la tarjeta de cada paciente para advertir al profesional antes de abrir su expediente.

---

## 📲 5. Plantillas de WhatsApp en 1 Clic

### El Problema
Repetir las mismas instrucciones postoperatorias y recordatorios docenas de veces al día por chat.

### La Solución
- Botón de acción directa de WhatsApp en la cabecera del paciente:
  - 🧊 **Indicaciones Post-Extracción / Cirugía:** (Hielo local, no tomar mate, medicación pautada, evitar esfuerzos).
  - 🦷 **Indicaciones de Blanqueamiento:** (Dieta blanca, qué alimentos evitar).
  - 📅 **Recordatorio de Turno Personalizado:** Con fecha, hora y dirección de la clínica correspondiente.
  - 🔔 **Control Preventivo:** Recordatorio a los 6 meses de inactividad para fidelización.

---

## 🦷 6. Gestión de Laboratorio / Mecánico Dental

### El Problema
Descoordinación entre las impresiones/escaneos enviados al mecánico dental y la fecha del turno del paciente para prueba o instalación de prótesis/coronas.

### La Solución
- Tablero ágil de órdenes de laboratorio:
  - *Enviado a laboratorio ➔ En confección ➔ Recibido en clínica ➔ Instalado en paciente*.
- Alerta si un paciente tiene turno agendado pero su trabajo de laboratorio figura como "No recibido".
