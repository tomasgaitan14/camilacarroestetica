import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { api, errorMessage } from '@/lib/api'
import { capitalizeFirst, formatDay } from '@/lib/utils'
import { useServices } from '@/hooks/useServices'
import { useBookingStore } from '@/store/bookingStore'
import { Step3DateTime } from '@/components/booking/Step3DateTime'
import { Spinner } from '@/components/shared/Spinner'
import { WhatsappButton } from '@/components/shared/WhatsappButton'
import type { BookingConfirmation, ClientBooking, ClientBookingsResponse } from '@/types'
import { CLIENT_CHANGE_MIN_HOURS } from '../../shared/booking-rules'

type View = 'search' | 'list' | 'confirm-cancel' | 'pick-new-time' | 'confirm-reschedule' | 'done'

function describeWhen(date: string, time: string): string {
  return capitalizeFirst(`${formatDay(date)} a las ${time}`)
}

export default function CancelPage() {
  const { services } = useServices()
  const { selectedDate, selectedSlot, setService, reset } = useBookingStore()
  const [phone, setPhone] = useState('')
  const [view, setView] = useState<View>('search')
  const [bookings, setBookings] = useState<ClientBooking[]>([])
  const [selected, setSelected] = useState<ClientBooking | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneMessage, setDoneMessage] = useState('')

  // El selector de fecha comparte el estado con /booking: se limpia al salir
  useEffect(() => reset, [reset])

  function show(next: View) {
    setError(null)
    setView(next)
  }

  async function run(action: () => Promise<void>) {
    setLoading(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function loadBookings() {
    void run(async () => {
      const response = await api.post<ClientBookingsResponse>('my-bookings', { client_phone: phone })
      setBookings(response.bookings)
      if (response.bookings.length === 0) {
        setView('search')
        setError('No encontramos turnos próximos con ese celular.')
        return
      }
      show('list')
    })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadBookings()
  }

  function handleCancel() {
    if (!selected) return
    void run(async () => {
      const response = await api.post<ClientBookingsResponse>('cancellations', { client_phone: phone, ref: selected.ref })
      setBookings(response.bookings)
      setDoneMessage('Tu turno fue cancelado.')
      show('done')
    })
  }

  function startReschedule(booking: ClientBooking) {
    const service = services.find(candidate => candidate.id === booking.service_id)
    if (!service) return
    setSelected(booking)
    setService(service)
    show('pick-new-time')
  }

  function handleReschedule() {
    if (!selected || !selectedDate || !selectedSlot) return
    void run(async () => {
      const confirmation = await api.post<BookingConfirmation>('reschedules', {
        client_phone: phone,
        ref: selected.ref,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedSlot,
      })
      setDoneMessage(`Tu turno quedó para el ${formatDay(confirmation.date)} a las ${confirmation.time}, con ${confirmation.professional_name}.`)
      show('done')
    })
  }

  const errorBox = error && (
    <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
  )

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/booking" className="p-1 -ml-1" aria-label="Volver a reservar">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <span className="font-semibold text-neutral-900">Cancelar o reprogramar</span>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {view === 'search' && (
          <div>
            <h2 className="text-xl font-bold text-neutral-900 mb-1">Encontrá tu turno</h2>
            <p className="text-sm text-neutral-500 mb-6">Ingresá el celular que usaste al reservar.</p>

            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1.5">Tu celular</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  minLength={8}
                  maxLength={20}
                  autoComplete="tel"
                  placeholder="Ej: 11 2345 6789"
                  className="input"
                />
              </div>

              {errorBox}

              <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
                {loading && <Spinner size="sm" className="border-white/40 border-t-white" />}
                Buscar mis turnos
              </button>
            </form>
          </div>
        )}

        {view === 'list' && (
          <div>
            <h2 className="text-xl font-bold text-neutral-900 mb-1">Tus turnos</h2>
            <p className="text-sm text-neutral-500 mb-5">Podés cancelarlos o reprogramarlos hasta {CLIENT_CHANGE_MIN_HOURS} horas antes.</p>

            {errorBox}

            <div className="flex flex-col gap-3">
              {bookings.map(booking => {
                const reschedulable = services.some(service => service.id === booking.service_id)
                return (
                  <div key={booking.ref} className="card">
                    <div className="mb-3">
                      <p className="font-semibold text-neutral-900">{booking.service_name}</p>
                      <p className="text-sm text-neutral-500 mt-0.5">con {booking.professional_name}</p>
                      <p className="text-sm text-neutral-600 mt-1 font-medium">{describeWhen(booking.date, booking.time)}</p>
                    </div>

                    {booking.can_change ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelected(booking); show('confirm-cancel') }}
                          className="flex-1 py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-semibold active:bg-red-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => startReschedule(booking)}
                          disabled={!reschedulable}
                          className="flex-1 py-2.5 rounded-xl border border-brand-300 text-brand-600 text-sm font-semibold active:bg-brand-50 disabled:opacity-40"
                        >
                          Reprogramar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 bg-neutral-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-neutral-500">Faltan menos de {CLIENT_CHANGE_MIN_HOURS} horas: escribinos para cambiarlo.</p>
                        <WhatsappButton
                          message={`Hola! Quiero cambiar mi turno de ${booking.service_name} del ${formatDay(booking.date)} a las ${booking.time}.`}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <button onClick={() => show('search')} className="w-full text-sm text-neutral-400 py-4">
              Buscar con otro celular
            </button>
          </div>
        )}

        {view === 'confirm-cancel' && selected && (
          <div>
            <h2 className="text-xl font-bold text-neutral-900 mb-1">Cancelar turno</h2>
            <p className="text-sm text-neutral-500 mb-5">¿Seguro que querés cancelar este turno?</p>

            <div className="card mb-5 bg-red-50 border-red-100">
              <p className="font-semibold text-neutral-800">{selected.service_name}</p>
              <p className="text-sm text-neutral-500 mt-0.5">con {selected.professional_name}</p>
              <p className="text-sm text-neutral-600 mt-1 font-medium">{describeWhen(selected.date, selected.time)}</p>
            </div>

            {errorBox}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="btn-primary !bg-red-500 active:!bg-red-600 flex items-center justify-center gap-2"
              >
                {loading && <Spinner size="sm" className="border-white/40 border-t-white" />}
                Sí, cancelar turno
              </button>
              <button onClick={() => show('list')} className="btn-secondary">Volver</button>
            </div>
          </div>
        )}

        {view === 'pick-new-time' && selected && (
          <div>
            <div className="card mb-4 bg-brand-50 border-brand-100 text-sm">
              <span className="text-neutral-500">Reprogramando: </span>
              <span className="font-semibold text-neutral-800">
                {selected.service_name}, {formatDay(selected.date)} a las {selected.time}
              </span>
            </div>
            <Step3DateTime onNext={() => show('confirm-reschedule')} onBack={() => show('list')} />
          </div>
        )}

        {view === 'confirm-reschedule' && selected && selectedDate && selectedSlot && (
          <div>
            <h2 className="text-xl font-bold text-neutral-900 mb-1">Confirmá el cambio</h2>
            <p className="text-sm text-neutral-500 mb-5">{selected.service_name}</p>

            <div className="card mb-5 flex flex-col gap-2 text-sm">
              <div>
                <span className="text-neutral-500 block">Antes</span>
                <span className="text-neutral-500 line-through">{describeWhen(selected.date, selected.time)}</span>
              </div>
              <div className="border-t border-neutral-100 pt-2">
                <span className="text-neutral-500 block">Ahora</span>
                <span className="font-semibold text-neutral-800">
                  {describeWhen(format(selectedDate, 'yyyy-MM-dd'), selectedSlot)}
                </span>
              </div>
            </div>

            {errorBox}

            <div className="flex flex-col gap-3">
              <button onClick={handleReschedule} disabled={loading} className="btn-primary flex items-center justify-center gap-2">
                {loading && <Spinner size="sm" className="border-white/40 border-t-white" />}
                Confirmar cambio
              </button>
              <button onClick={() => show('pick-new-time')} className="btn-secondary">Elegir otro horario</button>
            </div>
          </div>
        )}

        {view === 'done' && (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Listo</h2>
            <p className="text-neutral-500 text-sm mb-8 max-w-xs">{doneMessage}</p>
            <div className="w-full flex flex-col gap-3">
              <button onClick={loadBookings} disabled={loading} className="btn-secondary flex items-center justify-center gap-2">
                {loading && <Spinner size="sm" />}
                Ver mis turnos
              </button>
              <Link to="/booking" className="text-sm text-neutral-400 py-2">Reservar otro turno</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
