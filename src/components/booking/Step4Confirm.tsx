import { useState, useRef } from 'react'
import { format, parse, addMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBookingStore } from '@/store/bookingStore'
import { useServices } from '@/hooks/useServices'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/shared/Spinner'
import { capitalizeFirst } from '@/lib/utils'

interface Step4ConfirmProps {
  onBack: () => void
  onSuccess: (appointmentId: string) => void
}

export function Step4Confirm({ onBack, onSuccess }: Step4ConfirmProps) {
  const {
    selectedServiceId, selectedProfessionalId, selectedDate,
    selectedSlot, clientName, clientPhone, setClientName, setClientPhone,
  } = useBookingStore()

  const { services } = useServices()
  const selectedService = services.find(s => s.id === selectedServiceId)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameSuggestion, setNameSuggestion] = useState<string | null>(null)
  const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handlePhoneChange(phone: string) {
    setClientPhone(phone)
    setNameSuggestion(null)
    if (phoneDebounce.current) clearTimeout(phoneDebounce.current)
    if (phone.trim().length >= 8) {
      phoneDebounce.current = setTimeout(async () => {
        const { data } = await supabase.rpc('get_client_by_phone', { phone_number: phone.trim() })
        if (data?.[0]?.client_name) setNameSuggestion(data[0].client_name)
      }, 350)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedService || !selectedDate || !selectedSlot || !selectedProfessionalId) return

    setSubmitting(true)
    setError(null)

    const startsAt = parse(
      `${format(selectedDate, 'yyyy-MM-dd')} ${selectedSlot}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    )
    const endsAt = addMinutes(startsAt, selectedService.duration_minutes)

    const id = crypto.randomUUID()

    const { error } = await supabase.from('appointments').insert({
      id,
      professional_id: selectedProfessionalId,
      service_id: selectedServiceId,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      created_via: 'web',
    })

    if (error) {
      setError('Hubo un problema al reservar. Intentá de nuevo.')
      setSubmitting(false)
      return
    }

    onSuccess(id)
  }

  const slotDisplay = selectedDate && selectedSlot
    ? format(
        parse(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedSlot}`, 'yyyy-MM-dd HH:mm', new Date()),
        "EEEE d 'de' MMMM 'a las' HH:mm",
        { locale: es }
      )
    : ''

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-neutral-500 mb-4">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Volver
      </button>

      <h2 className="text-xl font-bold text-neutral-900 mb-1">Confirmá tu turno</h2>
      <p className="text-sm text-neutral-500 mb-5">Revisá los detalles y completá tus datos</p>

      {/* Resumen del turno */}
      <div className="card mb-5 bg-brand-50 border-brand-100">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Servicio</span>
            <span className="font-semibold text-neutral-800">{selectedService?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Duración</span>
            <span className="font-semibold text-neutral-800">{selectedService?.duration_minutes} min</span>
          </div>
          {selectedService?.display_price && (
            <div className="flex justify-between">
              <span className="text-neutral-500">Precio</span>
              <span className="font-semibold text-brand-600">{selectedService.display_price}</span>
            </div>
          )}
          <div className="border-t border-brand-100 mt-1 pt-2">
            <span className="text-neutral-500 block">Fecha y hora</span>
            <span className="font-semibold text-neutral-800">{capitalizeFirst(slotDisplay)}</span>
          </div>
        </div>
      </div>

      {/* Formulario de datos del cliente */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tu nombre</label>
          <input
            type="text"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            placeholder="Nombre y apellido"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tu teléfono</label>
          <input
            type="tel"
            value={clientPhone}
            onChange={e => handlePhoneChange(e.target.value)}
            required
            minLength={8}
            maxLength={20}
            placeholder="Ej: 1123456789"
            className="input"
          />
          {nameSuggestion && !clientName && (
            <button
              type="button"
              onClick={() => { setClientName(nameSuggestion); setNameSuggestion(null) }}
              className="mt-1.5 text-xs text-brand-600 font-medium flex items-center gap-1"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Completar como "{nameSuggestion}"
            </button>
          )}
          {!nameSuggestion && (
            <p className="text-xs text-neutral-400 mt-1">Lo usarás para cancelar o reprogramar si necesitás</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary mt-2 flex items-center justify-center gap-2">
          {submitting && <Spinner size="sm" className="border-white/40 border-t-white" />}
          {submitting ? 'Reservando...' : 'Confirmar turno'}
        </button>
      </form>
    </div>
  )
}
