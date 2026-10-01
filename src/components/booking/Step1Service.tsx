import { useBookingStore } from '@/store/bookingStore'
import { Spinner } from '@/components/shared/Spinner'
import type { PublicService } from '@/types'

interface Step1ServiceProps {
  services: PublicService[]
  loading: boolean
  error: string | null
  onNext: () => void
}

export function Step1Service({ services, loading, error, onNext }: Step1ServiceProps) {
  const { selectedService, setService } = useBookingStore()

  function handleSelect(service: PublicService) {
    setService(service)
    onNext()
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <Spinner />
    </div>
  )

  return (
    <div>
      <h2 className="text-xl font-bold text-neutral-900 mb-1">¿Qué servicio querés?</h2>
      <p className="text-sm text-neutral-500 mb-6">Elegí el servicio para tu turno</p>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {!error && services.length === 0 && (
        <div className="text-center py-12 text-neutral-500 text-sm">Por ahora no hay turnos disponibles.</div>
      )}

      <div className="flex flex-col gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => handleSelect(service)}
            className={`w-full text-left card p-4 active:bg-brand-50 transition-colors
              ${selectedService?.id === service.id ? 'border-brand-400 bg-brand-50' : 'hover:border-neutral-300'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900">{service.name}</p>
                {service.description && (
                  <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">{service.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-neutral-500">{service.duration_minutes} min</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
