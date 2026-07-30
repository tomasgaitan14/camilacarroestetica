import { Link } from 'react-router-dom'
import { useBookingStore } from '@/store/bookingStore'

interface SuccessScreenProps {
  appointmentId: string
  onNewBooking: () => void
}

export function SuccessScreen({ appointmentId: _appointmentId, onNewBooking }: SuccessScreenProps) {
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
      <p className="text-neutral-500 text-sm max-w-xs mb-8">
        Tu turno está reservado. Podés cancelarlo o reprogramarlo hasta 24 horas antes.
      </p>

      <div className="w-full flex flex-col gap-3">
        <Link to="/cancel" className="btn-secondary flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Cancelar o reprogramar turno
        </Link>
        <button onClick={handleNewBooking} className="text-sm text-neutral-400 py-2">
          Reservar otro turno
        </button>
      </div>
    </div>
  )
}
