# 🦷 DentApp

A modern web application for dental professionals to manage their practice — patients, clinical history, appointments, payments, and scheduling — all from a clean, mobile-friendly interface.

## Features

- **Authentication** — Login, register, password recovery via Supabase Auth
- **Patient Management** — CRUD with infinite scroll, search by last name, clinic filter
- **Clinical History** — Per-patient HC entries with linked payments (ARS/USD, cash/transfer/card)
- **Appointments** — Manual scheduling + auto-generated from HC entries, with status tracking (pending/completed/cancelled)
- **Calendar** — Monthly grid view with colored dots, day drill-down, and inline appointment creation
- **Responsive** — Desktop sidebar + mobile bottom navigation, fullscreen modals on mobile

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Backend/DB:** Supabase (PostgreSQL + Auth + RLS)
- **Deploy:** Vercel

## Getting Started

```bash
git clone https://github.com/JTSject/odontoApp.git
cd odontoApp
npm install
cp .env.example .env   # Add your Supabase URL and anon key
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anon key |

## Project Structure

```
src/
├── components/       # Reusable UI (Layout, Modals, Skeleton, Toast, etc.)
├── context/          # AuthContext, ToastContext
├── lib/              # Supabase client, translateError
├── pages/            # Home, Patients, PatientDetail, ClinicalHistory, Calendar, Auth pages
└── router/           # PrivateRoute
```

## License

MIT
