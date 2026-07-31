import { useState, useEffect, useRef } from 'react'
import { format, addMinutes, parse } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/shared/Spinner'
import type { Service, StaffProfile, UserRole } from '@/types'

interface Props {
  role: UserRole
  currentProfessionalId: string
  onClose: () => void
  onSaved: () => void
}

export function NewAppointmentModal({ role, currentProfessionalId, onClose, onSaved }: Props) {
  const [professionals, setProfessionals] = useState<StaffProfile[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedProfId, setSelectedProfId] = useState(currentProfessionalId)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('09:00')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameSuggestion, setNameSuggestion] = useState<string | null>(null)
  const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (role === 'admin') {
      supabase.from('staff_profiles').select('*').eq('is_active', true).order('name')
        .then(({ data }) => { if (data) setProfessionals(data as StaffProfile[]) })
    }
  }, [role])

  useEffect(() => {
    if (!selectedProfId) return
    supabase
      .from('professional_services')
      .select('service_id, services!inner(*)')
      .eq('professional_id', selectedProfId)
      .eq('services.is_active', true)
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svcs = (data ?? []).map((r: any) => r.services as Service)
        setServices(svcs)
        setSelectedServiceId(svcs[0]?.id ?? '')
      })
  }, [selectedProfId])

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
    if (!selectedServiceId || !selectedProfId) return
    setSaving(true)
    setError(null)

    const service = services.find(s => s.id === selectedServiceId)
    if (!service) { setSaving(false); return }

    const startsAt = parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date())
    const endsAt = addMinutes(startsAt, service.duration_minutes)

    const { error } = await supabase.from('appointments').insert({
      id: crypto.randomUUID(),
      professional_id: selectedProfId,
      service_id: selectedServiceId,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: notes.trim() || null,
      created_via: 'manual',
    })

    if (error) {
      const isOverlap = error.code === '23P01'
      setError(isOverlap ? 'Ese horario ya está ocupado para esta profesional.' : 'No se pudo guardar el turno.')
      setSaving(false)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-900">Nuevo turno</h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
          {role === 'admin' && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Profesional</label>
              <select
                value={selectedProfId}
                onChange={e => setSelectedProfId(e.target.value)}
                className="input"
                required
              >
                <option value="">Seleccioná</option>
                {professionals.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Servicio</label>
            <select
              value={selectedServiceId}
              onChange={e => setSelectedServiceId(e.target.value)}
              className="input"
              required
            >
              <option value="">Seleccioná</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Hora</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Teléfono del cliente</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={e => handlePhoneChange(e.target.value)}
              required
              minLength={8}
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
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Nombre del cliente</label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              required
              minLength={2}
              placeholder="Nombre y apellido"
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Notas (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: cliente nuevo, alergia a X..."
              className="input"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <Spinner size="sm" className="border-white/40 border-t-white" />}
              Guardar turno
            </button>
            <button type="button" onClick={onClose} className="btn-secondary !w-auto px-5">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
