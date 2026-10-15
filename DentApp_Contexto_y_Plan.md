# 🦷 DentApp — Contexto y Plan de Desarrollo

> Aplicación web para gestión de clínicas odontológicas  
> Versión 1.0 | Stack: React + Vite + Tailwind CSS + Supabase | Deploy: Vercel

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Diseño y Branding](#diseño-y-branding)
4. [Pantallas y Funcionalidades](#pantallas-y-funcionalidades)
5. [Estructura de Base de Datos](#estructura-de-base-de-datos)
6. [Arquitectura de Rutas](#arquitectura-de-rutas)
7. [Plan de Desarrollo por Fases](#plan-de-desarrollo-por-fases)
8. [Prompts para Antigravity/Opus](#prompts-para-antigravityopus)
9. [Decisiones Técnicas Clave](#decisiones-técnicas-clave)

---

## Visión General

**DentApp** es una aplicación web orientada a profesionales de odontología. Permite gestionar pacientes, turnos, historia clínica y pagos desde una interfaz limpia y moderna. Está pensada para un doctor que puede atender en **múltiples clínicas**, con filtros para separar la información por clínica.

**Objetivo inicial:** Una sola clínica, con posibilidad de escalar.

---

## Stack Tecnológico

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| Frontend | React + Vite + Tailwind CSS | Rápido, moderno, ecosistema amplio |
| Backend / DB | Supabase (PostgreSQL) | Auth out-of-the-box, RLS, gratuito |
| Deploy Frontend | Vercel | Gratis, integración con GitHub |
| Deploy Backend | Supabase cloud | Gratis hasta 500MB / 50k req |
| Auth | Supabase Auth | Login, registro y recuperación de contraseña nativos |

---

## Diseño y Branding

### Paleta de colores

| Nombre | Hex | Uso |
|--------|-----|-----|
| Blanco | `#FFFFFF` | Fondo principal |
| Amarillo pastel claro | `#FFFDE7` | Fondos secundarios, cards |
| Amarillo pastel medio | `#FFF9C4` | Hover states, highlights |
| Amarillo acento | `#F9E04B` | Botones primarios, headers |
| Texto oscuro | `#1A1A2E` | Tipografía principal |
| Gris suave | `#F5F5F5` | Filas alternas en tablas |

### Identidad
- **Nombre:** DentApp
- **Logo:** Ícono de diente simple en SVG
- **Fuente:** Inter o Poppins (sans-serif limpia)
- **Estilo:** Moderno, clínico, limpio. Sin exceso de sombras ni gradientes.

---

## Pantallas y Funcionalidades

### 1. 🔐 Login `/login`
- Formulario email + contraseña
- Link a "Olvidé mi contraseña"
- Link a registro
- Logo y nombre de la app centrados

### 2. 📝 Registro `/register`
- Campos: nombre completo, email, contraseña, confirmar contraseña
- Validación básica de campos
- Redirige a Home tras registro exitoso

### 3. 🔑 Recuperación de contraseña `/forgot-password`
- Input de email
- Supabase envía el mail de recuperación automáticamente
- Pantalla de confirmación "Revisá tu correo"

### 4. 🏠 Home `/home`
- Header: `Bienvenido/a, {nombre}`
- Grid de botones de acceso rápido:
  - 📅 Agendar nuevo turno
  - 📆 Ver calendario
  - 👥 Pacientes
  - 📋 Historia clínica (acceso rápido)
- **FAB (+)** en esquina inferior derecha que despliega acciones secundarias (Speed Dial):
  - Nuevo paciente
  - Nueva entrada HC
  - Nuevo turno rápido

### 5. 👥 Pacientes `/patients`
- **Barra de búsqueda** por apellido (debounce 300ms)
- **Filtro por clínica** (dropdown top-right) — muestra "Todas" por defecto
- Lista con scroll infinito (Supabase range queries)
- **Card de paciente** muestra:
  - Nombre y apellido (grande)
  - DNI
  - Clínica asignada (texto pequeño, gris)
- FAB (+) para agregar nuevo paciente
- Click en card → navega a detalle

### 6. 👤 Detalle Paciente `/patients/:id`
- Todos los datos del paciente:
  - Nombre y apellido
  - DNI
  - Fecha de nacimiento / Edad calculada
  - Email
  - Obra social
  - Clínica
  - Observaciones (si tiene)
- Botones de acción:
  - `📋 Historia Clínica` → `/patients/:id/history`
  - `📅 Turnos tomados` → `/patients/:id/appointments`
  - `✏️ Editar` → Modal/Drawer de edición
  - `🗑️ Eliminar` → Confirmación antes de borrar

### 7. 📋 Historia Clínica `/patients/:id/history`
- Si no hay entradas: label *"No hay historia clínica para este paciente aún"*
- Lista de entradas ordenadas por fecha (más reciente primero)
- Cada entrada muestra:
  - Fecha de atención
  - Tratamiento realizado
  - Observaciones
  - Monto cobrado + moneda + método de pago
- FAB (+) para nueva entrada
- Al crear una entrada HC → se genera automáticamente un turno en "Turnos tomados"

### 8. 📅 Turnos Tomados `/patients/:id/appointments`
- Lista de todos los turnos del paciente (de cualquier clínica)
- Cada turno muestra:
  - Fecha y hora
  - Tratamiento
  - Clínica
  - Estado (pendiente / completado / cancelado)
- Diferenciado visualmente de la HC (puede tener turnos de otros lugares)

### 9. 📆 Calendario `/calendar`
- Vista mensual de turnos
- Click en día → muestra turnos de ese día
- Filtro por clínica
- Botón para agendar turno desde el calendario

---

## Estructura de Base de Datos

### Tabla: `auth.users` *(Supabase Auth — interna)*
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| email | varchar | UNIQUE |
| encrypted_password | varchar | Manejado por Supabase |
| created_at | timestamptz | AUTO |

---

### Tabla: `profiles`
> Se crea via trigger automático al registrar usuario

| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | uuid | PK, FK → auth.users.id |
| full_name | varchar(150) | NOT NULL |
| role | varchar(20) | admin \| doctor, DEFAULT doctor |
| avatar_url | text | NULLABLE |
| created_at | timestamptz | DEFAULT now() |

---

### Tabla: `clinics`
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | uuid | PK |
| name | varchar(150) | NOT NULL |
| address | text | NULLABLE |
| phone | varchar(30) | NULLABLE |
| created_at | timestamptz | DEFAULT now() |

---

### Tabla: `doctor_clinics` *(pivote N:M)*
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| doctor_id | uuid | FK → profiles.id |
| clinic_id | uuid | FK → clinics.id |
| is_primary | boolean | DEFAULT false |
| — | — | PK compuesta (doctor_id, clinic_id) |

---

### Tabla: `patients`
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | uuid | PK |
| first_name | varchar(100) | NOT NULL |
| last_name | varchar(100) | NOT NULL |
| dni | varchar(15) | NOT NULL |
| birth_date | date | NOT NULL |
| email | varchar(255) | NULLABLE |
| phone | varchar(30) | NULLABLE |
| obra_social | varchar(150) | NULLABLE |
| observations | text | NULLABLE |
| clinic_id | uuid | FK → clinics.id, NOT NULL |
| created_by | uuid | FK → profiles.id |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

---

### Tabla: `appointments`
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | uuid | PK |
| patient_id | uuid | FK → patients.id |
| clinic_id | uuid | FK → clinics.id |
| doctor_id | uuid | FK → profiles.id |
| date | date | NOT NULL |
| time | time | NOT NULL |
| treatment | varchar(255) | NOT NULL |
| status | varchar(20) | pendiente \| completado \| cancelado |
| notes | text | NULLABLE |
| source | varchar(20) | manual \| historia_clinica |
| created_at | timestamptz | DEFAULT now() |

---

### Tabla: `clinical_history`
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | uuid | PK |
| patient_id | uuid | FK → patients.id |
| appointment_id | uuid | FK → appointments.id, NULLABLE |
| clinic_id | uuid | FK → clinics.id |
| doctor_id | uuid | FK → profiles.id |
| date | date | NOT NULL |
| treatment | text | NOT NULL |
| observations | text | NULLABLE |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

---

### Tabla: `payments`
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | uuid | PK |
| clinical_history_id | uuid | FK → clinical_history.id |
| patient_id | uuid | FK → patients.id (desnormalizado) |
| amount | numeric(10,2) | NOT NULL, CHECK > 0 |
| currency | varchar(10) | ARS \| USD, DEFAULT ARS |
| method | varchar(30) | efectivo \| transferencia \| tarjeta |
| notes | text | NULLABLE |
| created_at | timestamptz | DEFAULT now() |

---

### Índices recomendados

```sql
CREATE INDEX idx_patients_last_name    ON patients(last_name);
CREATE INDEX idx_patients_clinic       ON patients(clinic_id);
CREATE INDEX idx_patients_dni          ON patients(dni);
CREATE INDEX idx_appointments_patient  ON appointments(patient_id, date);
CREATE INDEX idx_appointments_doctor   ON appointments(doctor_id, date);
CREATE INDEX idx_clinical_history_pat  ON clinical_history(patient_id);
CREATE INDEX idx_payments_hc           ON payments(clinical_history_id);
```

---

### Diagrama ERD (simplificado)

```
auth.users   1──1   profiles
profiles     N──M   clinics          (via doctor_clinics)
clinics      1──N   patients
patients     1──N   appointments
patients     1──N   clinical_history
clinical_history  1──1  appointments (opcional, source = historia_clinica)
clinical_history  1──N  payments
```

---

### Row Level Security (RLS)

| Tabla | Política | Regla |
|-------|---------|-------|
| profiles | SELECT | Solo su propio perfil (`id = auth.uid()`) |
| clinics | SELECT | Solo clínicas en `doctor_clinics` |
| patients | SELECT / INSERT / UPDATE | Solo pacientes de sus clínicas |
| appointments | ALL | Solo donde `doctor_id = auth.uid()` |
| clinical_history | ALL | Solo donde `doctor_id = auth.uid()` |
| payments | ALL | Via `clinical_history` del doctor |

---

## Arquitectura de Rutas

```
/                     → redirect a /login o /home
/login                → pantalla de login
/register             → pantalla de registro
/forgot-password      → recuperación de contraseña

/home                 → dashboard principal
/patients             → lista de pacientes
/patients/:id         → detalle del paciente
/patients/:id/history         → historia clínica
/patients/:id/appointments    → turnos tomados
/calendar             → vista de calendario
```

---

## Plan de Desarrollo por Fases

### ✅ Fase 1 — Setup + Auth
- Estructura de carpetas del proyecto (Vite + React + Tailwind)
- Configuración Supabase client
- AuthContext con `useContext` + `useReducer`
- Protected Routes con React Router v6
- Pantalla Login
- Pantalla Register
- Pantalla Forgot Password
- Trigger en Supabase para crear `profiles` automáticamente

### 🔲 Fase 2 — Layout + Home
- Layout base con sidebar o bottom nav
- Pantalla Home con grid de acciones
- FAB con Speed Dial
- Integración de datos del usuario logueado

### 🔲 Fase 3 — Módulo Pacientes
- Lista de pacientes con scroll infinito
- Búsqueda por apellido (debounce)
- Filtro por clínica
- Card de paciente
- Modal "Nuevo Paciente"
- Pantalla Detalle Paciente
- Editar / Eliminar paciente

### 🔲 Fase 4 — Historia Clínica
- Lista de entradas HC por paciente
- Estado vacío con mensaje
- Modal "Nueva entrada HC"
- Generación automática de turno al guardar HC
- Sección de pago dentro de la entrada

### 🔲 Fase 5 — Turnos
- Lista de turnos por paciente
- Agendar nuevo turno manual
- Vista calendario mensual
- Filtro por clínica en calendario

### 🔲 Fase 6 — Pulido y Deploy
- Responsive mobile-first
- Loading states y skeletons
- Manejo de errores global (toast notifications)
- Deploy en Vercel
- Variables de entorno en producción

---

## Prompts para Antigravity/Opus

### PROMPT FASE 1 — Setup y Auth

```
Actúa como un desarrollador senior full-stack. Vamos a construir "DentApp",
una aplicación web para gestión de clínicas odontológicas.

Stack: React + Vite + Tailwind CSS + Supabase (auth, db, rls).
Deploy: Vercel.

Paleta de colores: blanco (#FFFFFF), amarillo pastel (#FFF9C4 / #FFFDE7),
acentos en amarillo medio (#F9E04B), texto oscuro (#1a1a2e).

TAREA 1 - Configuración base:
1. Estructura de carpetas del proyecto
2. Configuración de Supabase client (src/lib/supabase.js)
3. AuthContext global con useContext + useReducer (src/context/AuthContext.jsx)
4. Protected routes con React Router v6 (src/router/PrivateRoute.jsx)
5. Pantalla de Login con email/password (src/pages/Login.jsx)
6. Pantalla de Register (src/pages/Register.jsx)
7. Pantalla de Forgot Password — usa el flow nativo de Supabase (src/pages/ForgotPassword.jsx)

El diseño debe ser moderno, limpio, con el logo de un diente simple en SVG inline.
Usar Tailwind únicamente para estilos, sin CSS externo.
Devuelve el código completo de cada archivo, uno por uno.
```

---

### PROMPT FASE 2 — Pacientes

```
Continuamos con DentApp (React + Vite + Tailwind + Supabase).

Contexto ya construido:
- Auth con Supabase (login, register, forgot-password)
- AuthContext con usuario logueado disponible via useAuth()
- React Router v6 con rutas protegidas

Tablas en Supabase: patients, clinics, doctor_clinics, profiles

TAREA 2 - Módulo Pacientes:

1. /patients — lista con:
   - Scroll infinito usando Supabase range queries (page size: 20)
   - Buscador por last_name con debounce de 300ms
   - Filtro por clínica (dropdown top-right, carga las clínicas del doctor logueado)
   - Card por paciente: nombre completo, DNI, nombre de clínica (texto pequeño abajo)
   - FAB (+) para abrir modal de nuevo paciente

2. Modal "Nuevo Paciente":
   Campos: first_name, last_name, dni, birth_date, email (opcional),
   phone (opcional), obra_social (opcional), observations (opcional), clinic_id

3. /patients/:id — detalle con todos los campos +
   - Edad calculada desde birth_date
   - Botones: Historia Clínica | Turnos | Editar | Eliminar (con confirm dialog)

Paleta: blanco (#FFFFFF), amarillo pastel (#FFFDE7), acento (#F9E04B), texto (#1A1A2E).
Devuelve código completo por archivo.
```

---

### PROMPT FASE 3 — Historia Clínica + Pagos

```
Continuamos con DentApp (React + Vite + Tailwind + Supabase).

Tablas: clinical_history, payments, appointments (ya existentes en Supabase).

TAREA 3 - Historia Clínica:

1. /patients/:id/history — lista de entradas HC:
   - Ordenadas por date DESC
   - Estado vacío: "No hay historia clínica para este paciente aún" + ícono
   - Card por entrada: fecha, tratamiento, observaciones, chip de pago (monto + método)
   - FAB (+) para nueva entrada

2. Modal "Nueva entrada HC":
   Campos:
   - date (date picker, default hoy)
   - treatment (textarea)
   - observations (textarea, opcional)
   - Sección pago: amount, currency (ARS/USD), method (efectivo/transferencia/tarjeta)
   Al guardar:
   → INSERT en clinical_history
   → INSERT en payments (si se completó la sección de pago)
   → INSERT en appointments con status='completado' y source='historia_clinica'

3. /patients/:id/appointments — lista de turnos:
   - Todos los turnos del paciente, ordenados por date DESC
   - Chip de estado (pendiente=amarillo, completado=verde, cancelado=rojo)
   - Columna de clínica para diferenciar de dónde viene cada turno

Devuelve código completo por archivo.
```

---

## Decisiones Técnicas Clave

### ¿Por qué Supabase y no Firebase?
- Base de datos **relacional real** (PostgreSQL) — ideal para las relaciones entre pacientes, clínicas, turnos e HC
- **Auth con recuperación de contraseña** nativo, sin configuración extra
- **Row Level Security** a nivel de base de datos — más seguro que validar solo en frontend
- Generoso tier gratuito: 500MB DB, 50k peticiones/mes, 2GB storage

### ¿Por qué Vercel?
- Deploy automático desde GitHub (push → deploy)
- SSL gratis, dominio custom gratis
- Sin configuración de servidor

### Scroll infinito vs paginación
Elegimos **scroll infinito** para la lista de pacientes porque es más fluido en mobile y la búsqueda por apellido ya actúa como filtro principal. Si la lista crece mucho, el debounce en la búsqueda evita queries innecesarias.

### Turnos vs Historia Clínica — diferencia clave
- **Historia Clínica** = registro médico de lo que se hizo. Pertenece a la clínica donde se atendió.
- **Turnos tomados** = vista cronológica de todas las visitas del paciente, incluyendo turnos de otros lugares que el doctor registre manualmente. Más amplio.
- Al crear una entrada HC → se genera automáticamente un turno con `source = 'historia_clinica'`

### Seguridad de contraseñas
Supabase Auth usa **bcrypt** internamente. No manejamos contraseñas en texto plano en ningún momento. El flujo de recuperación es via email con token firmado.

---

*Documento generado durante la sesión de planificación de DentApp*  
*Stack definitivo acordado: React + Vite + Tailwind + Supabase + Vercel*
