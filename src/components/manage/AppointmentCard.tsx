import { WhatsappButton, InstagramButton } from '@/components/shared/ContactButtons'
import { formatTime } from '@/lib/utils'
import type { Appointment, UserRole } from '@/types'

interface AppointmentCardProps {
  appointment: Appointment
  role: UserRole
  onCancel?: (id: string) => void
}

export function AppointmentCard({ appointment, role, onCancel }: AppointmentCardProps) {
  const { service, professional, client_name, client_phone, starts_at, ends_at, created_via, status } = appointment

  const apptDate = new Date(starts_at)
  const dd = String(apptDate.getDate()).padStart(2, '0')
  const mm = String(apptDate.getMonth() + 1).padStart(2, '0')
  const hh = String(apptDate.getHours()).padStart(2, '0')
  const min = String(apptDate.getMinutes()).padStart(2, '0')
  const firstName = client_name.split(' ')[0]
  const whatsappMessage = `Hola ${firstName}! Te escribo para recordarte el turno de ${service?.name} el día ${dd}/${mm} a las ${hh}:${min}hs ❤️`

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

        {!isCompleted && !isCancelled && onCancel && (
          <div className="ml-auto">
            <button
              onClick={() => onCancel(appointment.id)}
              className="px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 text-xs font-semibold active:bg-red-100"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
