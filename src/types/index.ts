import type { PublicService } from '../../shared/types'

export type {
  AdminCatalog,
  ApiErrorBody,
  Availability,
  BookingConfirmation,
  Catalog,
  ClientBooking,
  ClientBookingsResponse,
  Professional,
  PublicService,
  Service,
  SessionResponse,
  SlotsResponse,
} from '../../shared/types'

// Estado del flujo de reserva pública
export interface BookingState {
  selectedService: PublicService | null
  selectedDate: Date | null
  selectedSlot: string | null  // 'HH:mm'
  clientName: string
  clientPhone: string
}
