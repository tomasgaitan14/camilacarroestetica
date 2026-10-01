import { Link } from 'react-router-dom'
import { useBookingStore } from '@/store/bookingStore'
import { formatDay } from '@/lib/utils'
import { CLIENT_CHANGE_MIN_HOURS } from '../../../shared/booking-rules'
import type { BookingConfirmation } from '@/types'

interface SuccessScreenProps {
  confirmation: BookingConfirmation
  onNewBooking: () => void
}

export function SuccessScreen({ confirmation, onNewBooking }: SuccessScreenProps) {
  const { reset } = useBookingStore()

  function handleNewBooking() {
    reset()
    onNewBooking()
  }

  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 mb-2">¡Turno confirmado!</h2>
      <p className="text-neutral-600 text-sm max-w-xs mb-2">
        {confirmation.service_name} con {confirmation.professional_name}, el {formatDay(confirmation.date)} a las {confirmation.time}.
      </p>
      <p className="text-neutral-400 text-sm max-w-xs mb-8">
        Podés cancelarlo o reprogramarlo con tu celular hasta {CLIENT_CHANGE_MIN_HOURS} horas antes.
      </p>

      <div className="w-full flex flex-col gap-3">
        <Link to="/cancel" className="btn-secondary flex items-center justify-center gap-2">
          Cancelar o reprogramar
        </Link>
        <button onClick={handleNewBooking} className="text-sm text-neutral-400 py-2">
          Reservar otro turno
        </button>
      </div>
    </div>
  )
}
