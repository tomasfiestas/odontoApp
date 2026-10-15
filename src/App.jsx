import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import PrivateRoute from './router/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import ClinicalHistory from './pages/ClinicalHistory'
import PatientAppointments from './pages/PatientAppointments'
import PatientOdontogram from './pages/PatientOdontogram'
import Calendar from './pages/Calendar'
import Clinics from './pages/Clinics'
import Billing from './pages/Billing'
import Settings from './pages/Settings'

import AppointmentAction from './pages/AppointmentAction'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/accion/turno" element={<AppointmentAction />} />

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
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
