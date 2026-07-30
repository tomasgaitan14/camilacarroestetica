import { useNavigate } from 'react-router-dom'
import { useBookingStore } from '@/store/bookingStore'

interface SuccessScreenProps {
  appointmentId: string
}

export function SuccessScreen({ appointmentId: _appointmentId }: SuccessScreenProps) {
  const navigate = useNavigate()
  const { reset } = useBookingStore()

  function handleNewBooking() {
    reset()
    navigate('/booking', { replace: true })
  }

  return (
    <div className="flex flex-col items-center text-center py-8">
      {/* Ícono de check animado */}
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 mb-2">¡Turno confirmado!</h2>
      <p className="text-neutral-500 text-sm max-w-xs mb-8">
        Tu turno está reservado. Podés cancelarlo o reprogramarlo hasta 24 horas antes.
      </p>

      <div className="w-full card mb-4 bg-neutral-50 border-neutral-100">
        <div className="flex items-start gap-3">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-brand-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="text-left">
            <p className="text-sm font-semibold text-neutral-800">¿Necesitás cancelar?</p>
            <p className="text-sm text-neutral-500 mt-0.5">
              Ingresá a <strong>este sitio</strong>, hacé clic en "Cancelar turno" e ingresá tu número de teléfono.
              Solo podés hacerlo con al menos 24hs de anticipación.
            </p>
          </div>
        </div>
      </div>

      <button onClick={handleNewBooking} className="btn-secondary">
        Reservar otro turno
      </button>
    </div>
  )
}
