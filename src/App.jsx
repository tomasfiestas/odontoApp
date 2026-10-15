import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import PrivateRoute from './router/PrivateRoute'
import Layout from './components/Layout'

// Lazy-loaded views for instant loading and code-splitting
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Home = lazy(() => import('./pages/Home'))
const Patients = lazy(() => import('./pages/Patients'))
const PatientDetail = lazy(() => import('./pages/PatientDetail'))
const ClinicalHistory = lazy(() => import('./pages/ClinicalHistory'))
const PatientAppointments = lazy(() => import('./pages/PatientAppointments'))
const PatientOdontogram = lazy(() => import('./pages/PatientOdontogram'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Clinics = lazy(() => import('./pages/Clinics'))
const Billing = lazy(() => import('./pages/Billing'))
const Settings = lazy(() => import('./pages/Settings'))
const PatientFiles = lazy(() => import('./pages/PatientFiles'))
const PatientUpload = lazy(() => import('./pages/PatientUpload'))
const PatientTreatmentPlans = lazy(() => import('./pages/PatientTreatmentPlans'))
const AppointmentAction = lazy(() => import('./pages/AppointmentAction'))

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-3 border-accent border-t-transparent animate-spin" />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/accion/turno" element={<AppointmentAction />} />
              <Route path="/subir-archivos/:token" element={<PatientUpload />} />
              <Route path="/pacientes/:id/subir-archivos" element={<PatientUpload />} />

              {/* Protected routes with Layout */}
              <Route
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route path="/home" element={<Home />} />
                <Route path="/patients" element={<Patients />} />
                <Route path="/patients/:id" element={<PatientDetail />} />
                <Route path="/patients/:id/history" element={<ClinicalHistory />} />
                <Route path="/patients/:id/appointments" element={<PatientAppointments />} />
                <Route path="/patients/:id/odontogram" element={<PatientOdontogram />} />
                <Route path="/patients/:id/files" element={<PatientFiles />} />
                <Route path="/patients/:id/plans" element={<PatientTreatmentPlans />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/clinics" element={<Clinics />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* Redirect root to home */}
              <Route path="/" element={<Navigate to="/home" replace />} />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </Suspense>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
