import { useServices } from '@/hooks/useServices'
import { useBookingStore } from '@/store/bookingStore'
import { Spinner } from '@/components/shared/Spinner'

interface Step1ServiceProps {
  onNext: () => void
}

export function Step1Service({ onNext }: Step1ServiceProps) {
  const { services, loading } = useServices()
  const { selectedServiceId, setService } = useBookingStore()

  function handleSelect(id: string) {
    setService(id)
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

      <div className="flex flex-col gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => handleSelect(service.id)}
            className={`w-full text-left card p-4 active:bg-brand-50 transition-colors
              ${selectedServiceId === service.id ? 'border-brand-400 bg-brand-50' : 'hover:border-neutral-300'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900">{service.name}</p>
                {service.description && (
                  <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">{service.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                {service.display_price && (
                  <p className="font-semibold text-brand-600">{service.display_price}</p>
                )}
                <p className="text-xs text-neutral-400 mt-0.5">{service.duration_minutes} min</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
