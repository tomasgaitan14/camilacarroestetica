import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { FullPageSpinner } from '@/components/shared/Spinner'
import type { UserRole } from '@/types'

// Páginas públicas
import BookingPage from '@/pages/BookingPage'
import CancelPage from '@/pages/CancelPage'
import LoginPage from '@/pages/LoginPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'

// Páginas de staff
import ManageCalendarPage from '@/pages/ManageCalendarPage'
import ManageAvailabilityPage from '@/pages/ManageAvailabilityPage'
import AdminCalendarPage from '@/pages/AdminCalendarPage'
import AdminServicesPage from '@/pages/AdminServicesPage'
import AdminProfessionalsPage from '@/pages/AdminProfessionalsPage'
import AdminStatsPage from '@/pages/AdminStatsPage'

interface ProtectedProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

function Protected({ children, requiredRole }: ProtectedProps) {
  // Lee del store directamente — la inicialización ya la hizo App con useAuth()
  const { profile, isLoading } = useAuthStore()

  if (isLoading) return <FullPageSpinner />
  if (!profile) return <Navigate to="/login" replace />
  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to={profile.role === 'admin' ? '/admin/calendar' : '/manage/calendar'} replace />
  }

  return <>{children}</>
}

export default function App() {
  // Inicializa la sesión de auth una vez al montar la app
  useAuth()

  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Navigate to="/booking" replace />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/cancel" element={<CancelPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Panel profesional */}
        <Route path="/manage/calendar" element={
          <Protected><ManageCalendarPage /></Protected>
        } />
        <Route path="/manage/availability" element={
          <Protected><ManageAvailabilityPage /></Protected>
        } />
        <Route path="/manage/stats" element={
          <Protected><AdminStatsPage /></Protected>
        } />

        {/* Panel admin */}
        <Route path="/admin/calendar" element={
          <Protected requiredRole="admin"><AdminCalendarPage /></Protected>
        } />
        <Route path="/admin/services" element={
          <Protected requiredRole="admin"><AdminServicesPage /></Protected>
        } />
        <Route path="/admin/professionals" element={
          <Protected requiredRole="admin"><AdminProfessionalsPage /></Protected>
        } />
        <Route path="/admin/stats" element={
          <Protected requiredRole="admin"><AdminStatsPage /></Protected>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/booking" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
