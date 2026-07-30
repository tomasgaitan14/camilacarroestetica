import { WhatsappButton, InstagramButton } from '@/components/shared/ContactButtons'
import { formatTime } from '@/lib/utils'
import type { Appointment, UserRole } from '@/types'

interface AppointmentCardProps {
  appointment: Appointment
  role: UserRole
  onCancel?: (id: string) => void
  onComplete?: (id: string) => void
}

export function AppointmentCard({ appointment, role, onCancel, onComplete }: AppointmentCardProps) {
  const { service, professional, client_name, client_phone, starts_at, ends_at, created_via, status } = appointment

  const whatsappMessage = `Hola ${client_name}! Te escribo por tu turno de ${service?.name} del ${new Date(starts_at).toLocaleDateString('es-AR')}.`

  const isCompleted = status === 'completed'
  const isCancelled = status === 'cancelled'

  return (
    <div className={`card ${isCompleted ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-neutral-900">{service?.name}</span>
            {created_via === 'manual' && (
              <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">Manual</span>
            )}
            {isCompleted && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Realizado</span>
            )}
            {isCancelled && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Cancelado</span>
            )}
          </div>
          {role === 'admin' && professional && (
            <p className="text-xs text-neutral-500 mt-0.5">con {professional.name}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-brand-600 text-sm">{formatTime(new Date(starts_at).toTimeString())}</p>
          <p className="text-xs text-neutral-400">– {formatTime(new Date(ends_at).toTimeString())}</p>
        </div>
      </div>

      <div className="bg-neutral-50 rounded-xl px-3 py-2 mb-3">
        <p className="font-medium text-neutral-800 text-sm">{client_name}</p>
        <p className="text-xs text-neutral-500">{client_phone}</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {client_phone && !isCompleted && !isCancelled && (
          <WhatsappButton phone={client_phone} message={whatsappMessage} compact />
        )}
        {role === 'admin' && professional?.instagram_handle && !isCompleted && !isCancelled && (
          <InstagramButton handle={professional.instagram_handle} compact />
        )}

        {!isCompleted && !isCancelled && (
          <div className="ml-auto flex items-center gap-3">
            {onComplete && (
              <button
                onClick={() => onComplete(appointment.id)}
                className="text-xs text-green-600 font-medium flex items-center gap-1"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                Realizado
              </button>
            )}
            {onCancel && (
              <button
                onClick={() => onCancel(appointment.id)}
                className="text-xs text-red-500 font-medium"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
