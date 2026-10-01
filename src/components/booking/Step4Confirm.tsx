import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBookingStore } from '@/store/bookingStore'
import { api, errorMessage } from '@/lib/api'
import { Spinner } from '@/components/shared/Spinner'
import { capitalizeFirst } from '@/lib/utils'
import type { BookingConfirmation } from '@/types'

interface Step4ConfirmProps {
  onBack: () => void
  onSuccess: (confirmation: BookingConfirmation) => void
}

export function Step4Confirm({ onBack, onSuccess }: Step4ConfirmProps) {
  const {
    selectedService, selectedDate, selectedSlot,
    clientName, clientPhone, setClientName, setClientPhone,
  } = useBookingStore()

  // Campo trampa: está oculto, así que solo lo completa un bot
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!selectedService || !selectedDate || !selectedSlot) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedService || !selectedDate || !selectedSlot) return

    setSubmitting(true)
    setError(null)
    try {
      const confirmation = await api.post<BookingConfirmation>('bookings', {
        service_id: selectedService.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedSlot,
        client_name: clientName,
        client_phone: clientPhone,
        website,
      })
      onSuccess(confirmation)
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  const slotDisplay = `${format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} a las ${selectedSlot}`

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

      <div className="card mb-5 bg-brand-50 border-brand-100">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Servicio</span>
            <span className="font-semibold text-neutral-800">{selectedService.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Duración</span>
            <span className="font-semibold text-neutral-800">{selectedService.duration_minutes} min</span>
          </div>
          <div className="border-t border-brand-100 mt-1 pt-2">
            <span className="text-neutral-500 block">Fecha y hora</span>
            <span className="font-semibold text-neutral-800">{capitalizeFirst(slotDisplay)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tu nombre</label>
          <input
            type="text"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            placeholder="Nombre y apellido"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tu celular</label>
          <input
            type="tel"
            value={clientPhone}
            onChange={e => setClientPhone(e.target.value)}
            required
            minLength={8}
            maxLength={20}
            autoComplete="tel"
            placeholder="Ej: 11 2345 6789"
            className="input"
          />
          <p className="text-xs text-neutral-400 mt-1">Con código de área, sin 0 ni 15</p>
        </div>

        <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
          <label>
            No completar
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
          </label>
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
