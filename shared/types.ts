// Tipos que comparten el front y las funciones de /api

export interface Service {
  id: string
  name: string
  description: string
  duration_minutes: number
  active: boolean
}

export interface Professional {
  id: string
  name: string
  calendar_id: string
  service_ids: string[]
  active: boolean
}

// Bloque semanal en que trabaja una profesional, en hora de Argentina
export interface Availability {
  professional_id: string
  day_of_week: number  // 0=domingo, 6=sábado
  start_time: string   // 'HH:mm'
  end_time: string
}

// Todo lo que se configura en /admin; vive en la Google Sheet
export interface Catalog {
  services: Service[]
  professionals: Professional[]
  availability: Availability[]
}

export interface AdminCatalog extends Catalog {
  // Cuenta con la que hay que compartir cada calendario
  service_account_email: string
}

// Lo que ve /booking de un servicio: sin profesionales ni calendarios
export interface PublicService {
  id: string
  name: string
  description: string
  duration_minutes: number
  weekdays: number[]  // días en que al menos una profesional lo hace
}

export interface SlotsResponse {
  slots: string[]  // 'HH:mm'
}

export interface BookingConfirmation {
  date: string  // 'yyyy-MM-dd'
  time: string  // 'HH:mm'
  service_name: string
  professional_name: string
}

// Turno futuro de un cliente, tal como lo ve en /cancel (sin su nombre)
export interface ClientBooking {
  ref: string
  service_id: string | null  // null si el servicio ya no existe en el catálogo
  service_name: string
  professional_name: string
  date: string  // 'yyyy-MM-dd'
  time: string  // 'HH:mm'
  can_change: boolean  // falta más de 24 h
}

export interface ClientBookingsResponse {
  bookings: ClientBooking[]
}

export interface SessionResponse {
  authenticated: boolean
}

export interface ApiErrorBody {
  error: string
  fields?: Record<string, string>
}
