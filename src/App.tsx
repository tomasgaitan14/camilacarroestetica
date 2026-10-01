import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BookingPage from '@/pages/BookingPage'
import CancelPage from '@/pages/CancelPage'
import LoginPage from '@/pages/LoginPage'
import AdminServicesPage from '@/pages/AdminServicesPage'
import AdminProfessionalsPage from '@/pages/AdminProfessionalsPage'
import AdminAvailabilityPage from '@/pages/AdminAvailabilityPage'
import { AdminLayout } from '@/components/admin/AdminLayout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/booking" replace />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/cancel" element={<CancelPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/services" replace />} />
          <Route path="services" element={<AdminServicesPage />} />
          <Route path="professionals" element={<AdminProfessionalsPage />} />
          <Route path="availability" element={<AdminAvailabilityPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/booking" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
