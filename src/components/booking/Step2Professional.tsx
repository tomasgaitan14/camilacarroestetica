import { useProfessionalsForService } from '@/hooks/useServices'
import { useBookingStore } from '@/store/bookingStore'
import { Spinner } from '@/components/shared/Spinner'

interface Step2ProfessionalProps {
  onNext: () => void
  onBack: () => void
}

export function Step2Professional({ onNext, onBack }: Step2ProfessionalProps) {
  const { selectedServiceId, selectedProfessionalId, setProfessional } = useBookingStore()
  const { professionals, loading } = useProfessionalsForService(selectedServiceId)

  function handleSelect(id: string) {
    setProfessional(id)
    onNext()
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <Spinner />
    </div>
  )

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-neutral-500 mb-4">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Volver
      </button>

      <h2 className="text-xl font-bold text-neutral-900 mb-1">¿Con quién querés atenderte?</h2>
      <p className="text-sm text-neutral-500 mb-6">Seleccioná la profesional de tu preferencia</p>

      {professionals.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <p>No hay profesionales disponibles para este servicio.</p>
          <button onClick={onBack} className="mt-4 text-brand-500 font-semibold">Volver a servicios</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {professionals.map((prof) => (
            <button
              key={prof.id}
              onClick={() => handleSelect(prof.id)}
              className={`w-full text-left card p-4 active:bg-brand-50 transition-colors
                ${selectedProfessionalId === prof.id ? 'border-brand-400 bg-brand-50' : 'hover:border-neutral-300'}`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar con iniciales */}
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="text-brand-600 font-bold text-sm">
                    {prof.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{prof.name}</p>
                  <p className="text-sm text-neutral-500">Profesional</p>
                </div>
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-300 ml-auto" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
