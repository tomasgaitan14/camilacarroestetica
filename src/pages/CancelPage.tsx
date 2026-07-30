import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { canCancelOrReschedule, formatDateTime } from '@/lib/utils'
import { Spinner } from '@/components/shared/Spinner'
import type { Appointment } from '@/types'

type ViewState = 'search' | 'list' | 'confirm-cancel' | 'confirm-reschedule' | 'done'

export default function CancelPage() {
  const [phone, setPhone] = useState('')
  const [view, setView] = useState<ViewState>('search')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneMessage, setDoneMessage] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.rpc('get_appointments_by_phone', {
      phone_number: phone.trim(),
    })

    if (error) {
      setError('No pudimos buscar tus turnos. Intentá de nuevo.')
    } else if (!data || data.length === 0) {
      setError('No encontramos turnos activos con ese número de teléfono.')
    } else {
      setAppointments(data as Appointment[])
      setView('list')
    }
    setLoading(false)
  }

  async function handleCancel() {
    if (!selected) return
    setLoading(true)

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', selected.id)

    if (error) {
      setError('No pudimos cancelar el turno. Intentá de nuevo.')
    } else {
      setDoneMessage('Tu turno fue cancelado exitosamente.')
      setView('done')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/booking" className="p-1 -ml-1">
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
            <p className="text-sm text-neutral-500 mb-6">
              Ingresá el número de teléfono que usaste al reservar.
            </p>

            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Número de teléfono</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Ej: 1123456789"
                  className="input"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

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
            <p className="text-sm text-neutral-500 mb-5">Seleccioná el turno que querés gestionar.</p>

            <div className="flex flex-col gap-3">
              {appointments.map(appt => {
                const cancellable = canCancelOrReschedule(appt.starts_at)
                return (
                  <div key={appt.id} className="card">
                    <div className="mb-3">
                      <p className="font-semibold text-neutral-900">{appt.service?.name}</p>
                      <p className="text-sm text-neutral-500 mt-0.5">con {appt.professional?.name}</p>
                      <p className="text-sm text-neutral-600 mt-1 font-medium">
                        {formatDateTime(appt.starts_at)}
                      </p>
                    </div>

                    {cancellable ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelected(appt); setView('confirm-cancel') }}
                          className="flex-1 py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-semibold active:bg-red-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => { setSelected(appt); setView('confirm-reschedule') }}
                          className="flex-1 py-2.5 rounded-xl border border-brand-300 text-brand-600 text-sm font-semibold active:bg-brand-50"
                        >
                          Reprogramar
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 bg-neutral-50 rounded-lg px-3 py-2">
                        Solo podés cancelar con al menos 24hs de anticipación.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === 'confirm-cancel' && selected && (
          <div>
            <h2 className="text-xl font-bold text-neutral-900 mb-1">Cancelar turno</h2>
            <p className="text-sm text-neutral-500 mb-5">¿Estás segura/o que querés cancelar este turno?</p>

            <div className="card mb-5 bg-red-50 border-red-100">
              <p className="font-semibold text-neutral-800">{selected.service?.name}</p>
              <p className="text-sm text-neutral-500 mt-0.5">con {selected.professional?.name}</p>
              <p className="text-sm text-neutral-600 mt-1 font-medium">{formatDateTime(selected.starts_at)}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="btn-primary !bg-red-500 active:!bg-red-600 flex items-center justify-center gap-2"
              >
                {loading && <Spinner size="sm" className="border-white/40 border-t-white" />}
                Sí, cancelar turno
              </button>
              <button onClick={() => setView('list')} className="btn-secondary">
                Volver
              </button>
            </div>
          </div>
        )}

        {view === 'confirm-reschedule' && selected && (
          <div>
            <h2 className="text-xl font-bold text-neutral-900 mb-1">Reprogramar turno</h2>
            <p className="text-sm text-neutral-500 mb-4">
              Para reprogramar, cancelamos tu turno actual y te llevamos al proceso de reserva para elegir un nuevo horario.
            </p>
            <div className="card mb-5 bg-brand-50 border-brand-100">
              <p className="font-semibold text-neutral-800">{selected.service?.name}</p>
              <p className="text-sm text-neutral-500 mt-0.5">con {selected.professional?.name}</p>
              <p className="text-sm text-neutral-600 mt-1 font-medium">{formatDateTime(selected.starts_at)}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  setLoading(true)
                  await supabase.from('appointments').update({ status: 'rescheduled' }).eq('id', selected.id)
                  setDoneMessage('Turno cancelado. Ahora podés elegir un nuevo horario.')
                  setView('done')
                  setLoading(false)
                }}
                disabled={loading}
                className="btn-primary flex items-center justify-center gap-2"
              >
                {loading && <Spinner size="sm" className="border-white/40 border-t-white" />}
                Cancelar y reprogramar
              </button>
              <button onClick={() => setView('list')} className="btn-secondary">
                Volver
              </button>
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
            <p className="text-neutral-500 text-sm mb-8">{doneMessage}</p>
            <Link to="/booking" className="btn-primary max-w-xs">
              Reservar un nuevo turno
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
