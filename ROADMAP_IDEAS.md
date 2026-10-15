# 🦷 DentApp — Roadmap de Funcionalidades y Módulos de Alto Impacto

Este documento recopila las funcionalidades clave diseñadas para resolver los dolores de cabeza diarios más críticos en el ejercicio de la odontología clínica.

---

## 🗂️ 1. Módulo de Archivos, Radiografías y Estudios (En Desarrollo)

### Visión
Los odontólogos trabajan intensamente con material visual (radiografías periapicales, panorámicas, tomografías, fotos intraorales de evolución). Actualmente, este material suele dispersarse en chats de WhatsApp o carpetas locales no sincronizadas.

### Componentes Clave:
1. **Almacenamiento (Supabase Storage):**
   - Bucket: `patient-files`
   - Soporte para imágenes de alta definición y documentos médicos (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`).
2. **Carga por el Profesional (Clínica / Consultorio):**
   - Zona Drag & Drop interactiva en la ficha de cada paciente.
   - Selector manual de archivos.
   - Categorización rápida:
     - 🩻 **Radiografías** (Panorámicas, periapicales, bite-wing, oclusales).
     - 📸 **Fotos Clínicas** (Antes / Después, seguimiento estético u ortodóntico).
     - 📑 **Consentimientos y Recetas** (Documentación firmada, respaldo legal).
     - 📄 **Estudios y Tomografías** (Informes externos, análisis cefalométricos).
3. **Enlace Público para el Paciente (Mobile-First):**
   - El doctor genera un link temporal (o lo manda por WhatsApp en un clic).
   - El paciente abre el link en su celular y puede:
     - Sacar una foto con la cámara (ej. a su radiografía física o a su boca).
     - Seleccionar múltiples fotos de su galería.
     - Subir sin necesidad de crearse una cuenta ni iniciar sesión.
   - Restricción: En el portal del paciente solo se permite subida de imágenes para prevenir cargas maliciosas.
4. **Visor Integrado (Lightbox):**
   - Zoom interactivo para diagnóstico fino.
   - Modo pantalla completa.
   - Comparador "Antes vs Después".

---

## 📑 2. Planes de Tratamiento y Presupuestos

### El Problema
La mayoría de los tratamientos odontológicos abarcan varias sesiones y múltiples especialidades (limpieza, endodoncia, perno y corona). Los odontólogos pierden tiempo cotizando en cuadernos o Excel y recalculando cuotas.

### La Solución
- Crear presupuestos vinculados al Odontograma.
- Agrupar por fases clínicas (Fase 1: Salud e higiene, Fase 2: Terapéutica, Fase 3: Rehabilitación).
- **Generación de Presupuesto en PDF con un clic:** Con membrete de la clínica, detalle de prestaciones, costos y forma de pago.
- Envío directo al WhatsApp o email del paciente.
- Estado del tratamiento: *Borrador / Presentado / Aceptado / En curso / Finalizado*.

---

## 💰 3. Cuenta Corriente y Saldo del Paciente

### El Problema
Los tratamientos extensos suelen pagarse en cuotas informales entre sesiones. Saber quién debe dinero antes de sentarlo en el sillón es crítico para la rentabilidad de la clínica.

### La Solución
- **Semáforo de Saldo en la Ficha del Paciente:**
  - 🟢 **Al día**
  - 🔴 **Saldo deudor:** Muestra clara del monto pendiente (ej. `Deuda: $45.000`).
- Registro ágil de pagos parciales en cada turno (efectivo, transferencia, tarjeta).
- Historial transparente de cargos vs. abonos.

---

## ⚠️ 4. Alertas Médicas Críticas (Banderas Rojas)

### El Problema
Riesgo médico y mala praxis: un odontólogo atiende 15 pacientes al día y no siempre recuerda si el paciente de turno es alérgico a la penicilina, si toma anticoagulantes o si padece hipertensión arterial (lo cual condiciona el uso de anestesia con vasoconstrictor como epinefrina).

### La Solución
- Banner superior destacado en rojo en la ficha del paciente y en el modal de turno rápido:
  > 🚨 **ALERTA CLÍNICA:** *Alérgico a Penicilina | Hipertenso (Requiere anestésico sin vasoconstrictor)*.
- Checklist rápido de anamnesis al dar de alta al paciente.

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
