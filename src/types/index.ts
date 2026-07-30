export type UserRole = 'admin' | 'professional'

export interface StaffProfile {
  id: string
  name: string
  role: UserRole
  whatsapp_number: string | null
  instagram_handle: string | null
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  display_price: string | null
  is_active: boolean
  created_at: string
}

export interface ProfessionalService {
  professional_id: string
  service_id: string
}

export interface Availability {
  id: string
  professional_id: string
  day_of_week: number  // 0=domingo, 6=sábado
  start_time: string   // "HH:MM:SS"
  end_time: string
}

export interface BlockedDate {
  id: string
  professional_id: string
  date: string  // "YYYY-MM-DD"
  reason: string | null
}

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'rescheduled'
export type AppointmentSource = 'web' | 'manual'

export interface Appointment {
  id: string
  professional_id: string
  service_id: string
  client_name: string
  client_phone: string
  starts_at: string   // ISO string
  ends_at: string
  status: AppointmentStatus
  created_via: AppointmentSource
  cancel_token: string
  google_event_id: string | null
  notes: string | null
  created_at: string
  // joined
  professional?: StaffProfile
  service?: Service
}

// Para el flujo de reserva pública (estado en Zustand)
export interface BookingState {
  selectedServiceId: string | null
  selectedProfessionalId: string | null
  selectedDate: Date | null
  selectedSlot: string | null  // "HH:MM"
  clientName: string
  clientPhone: string
}

// Slot de tiempo disponible
export interface TimeSlot {
  time: string    // "HH:MM"
  available: boolean
}
