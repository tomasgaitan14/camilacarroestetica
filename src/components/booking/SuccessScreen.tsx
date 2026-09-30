import { format, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBookingStore } from '@/store/bookingStore'
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

  const day = format(parse(confirmation.date, 'yyyy-MM-dd', new Date()), "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 mb-2">¡Turno confirmado!</h2>
      <p className="text-neutral-600 text-sm max-w-xs mb-2">
        {confirmation.service_name} con {confirmation.professional_name}, el {day} a las {confirmation.time}.
      </p>
      <p className="text-neutral-400 text-sm max-w-xs mb-8">
        Si no podés venir, avisanos con tiempo.
      </p>

      <button onClick={handleNewBooking} className="text-sm text-neutral-400 py-2">
        Reservar otro turno
      </button>
    </div>
  )
}
