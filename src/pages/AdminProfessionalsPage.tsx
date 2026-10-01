import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog, useCatalogSave } from '@/hooks/useCatalog'
import { Spinner } from '@/components/shared/Spinner'
import type { Professional, Service } from '@/types'

type ProfessionalFields = Pick<Professional, 'name' | 'calendar_id'>

export default function AdminProfessionalsPage() {
  const catalog = useCatalog()
  const { saving, error, persist } = useCatalogSave()
  const [creating, setCreating] = useState(false)

  function replace(updated: Professional) {
    return persist({
      ...catalog,
      professionals: catalog.professionals.map(p => (p.id === updated.id ? updated : p)),
    })
  }

  async function handleCreate(fields: ProfessionalFields) {
    const professional: Professional = { id: crypto.randomUUID(), ...fields, service_ids: [], active: true }
    if (await persist({ ...catalog, professionals: [...catalog.professionals, professional] })) setCreating(false)
  }

  return (
    <>
      <header className="bg-white border-b border-neutral-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="font-semibold text-neutral-900">Equipo</h1>
          <button
            onClick={() => setCreating(c => !c)}
            className="flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-semibold active:bg-brand-600"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Agregar
          </button>
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto flex flex-col gap-3">
        <div className="card text-xs text-neutral-600 bg-brand-50 border-brand-100">
          Compartí el Google Calendar de cada profesional con{' '}
          <span className="font-mono font-semibold break-all select-all">{catalog.service_account_email}</span>{' '}
          con el permiso <span className="font-semibold">"Hacer cambios en los eventos"</span>. El ID está en la
          configuración del calendario, en "Integrar el calendario".
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {creating && (
          <ProfessionalForm
            title="Nueva profesional"
            initial={{ name: '', calendar_id: '' }}
            saving={saving}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        )}

        {catalog.professionals.length === 0 && !creating && (
          <div className="text-center py-12 text-neutral-400 text-sm">Todavía no hay profesionales. Agregá la primera.</div>
        )}

        {catalog.professionals.map(professional => (
          <ProfessionalCard
            key={professional.id}
            professional={professional}
            services={catalog.services}
            hasSchedule={catalog.availability.some(block => block.professional_id === professional.id)}
            saving={saving}
            onChange={replace}
          />
        ))}
      </main>
    </>
  )
}

interface ProfessionalFormProps {
  title: string
  initial: ProfessionalFields
  saving: boolean
  onSubmit: (fields: ProfessionalFields) => void
  onCancel: () => void
}

function ProfessionalForm({ title, initial, saving, onSubmit, onCancel }: ProfessionalFormProps) {
  const [fields, setFields] = useState<ProfessionalFields>(initial)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ name: fields.name.trim(), calendar_id: fields.calendar_id.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <h3 className="font-semibold text-neutral-800">{title}</h3>
      <input
        type="text"
        value={fields.name}
        onChange={e => setFields(f => ({ ...f, name: e.target.value }))}
        required
        maxLength={100}
        placeholder="Nombre"
        className="input"
      />
      <input
        type="text"
        value={fields.calendar_id}
        onChange={e => setFields(f => ({ ...f, calendar_id: e.target.value }))}
        required
        maxLength={255}
        placeholder="ID del calendario (ej: abc123@group.calendar.google.com)"
        className="input"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex items-center justify-center gap-2">
          {saving && <Spinner size="sm" className="border-white/40 border-t-white" />}
          Guardar
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary !w-auto px-5">Cancelar</button>
      </div>
    </form>
  )
}

interface ProfessionalCardProps {
  professional: Professional
  services: Service[]
  hasSchedule: boolean
  saving: boolean
  onChange: (updated: Professional) => Promise<boolean>
}

function ProfessionalCard({ professional, services, hasSchedule, saving, onChange }: ProfessionalCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)

  const initials = professional.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()

  function toggleService(serviceId: string) {
    const serviceIds = professional.service_ids.includes(serviceId)
      ? professional.service_ids.filter(id => id !== serviceId)
      : [...professional.service_ids, serviceId]
    void onChange({ ...professional, service_ids: serviceIds })
  }

  async function handleEdit(fields: ProfessionalFields) {
    if (await onChange({ ...professional, ...fields })) setEditing(false)
  }

  if (editing) {
    return (
      <ProfessionalForm
        title="Editar profesional"
        initial={professional}
        saving={saving}
        onSubmit={handleEdit}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className={`card ${!professional.active ? 'opacity-60' : ''}`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 text-left">
        <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
          <span className="text-brand-600 font-bold text-sm">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-900 text-sm">{professional.name}</p>
          <p className="text-xs text-neutral-500 truncate">{professional.calendar_id}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
          ${professional.active ? 'bg-green-50 text-green-600' : 'bg-neutral-100 text-neutral-500'}`}>
          {professional.active ? 'Activa' : 'Inactiva'}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {professional.active && !hasSchedule && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Sin horarios: sus servicios no aparecen en /booking.{' '}
          <Link to="/admin/availability" className="font-semibold underline">Cargar horarios</Link>
        </p>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold text-neutral-600 mb-2">Servicios que hace</p>
            {services.length === 0 ? (
              <p className="text-xs text-neutral-400">Primero cargá los servicios.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {services.map(service => {
                  const assigned = professional.service_ids.includes(service.id)
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      disabled={saving}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                        ${assigned
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white text-neutral-600 border-neutral-200 active:bg-neutral-50'
                        }`}
                    >
                      {service.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-neutral-300 text-neutral-600"
            >
              Editar nombre o calendario
            </button>
            <button
              onClick={() => void onChange({ ...professional, active: !professional.active })}
              disabled={saving}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border
                ${professional.active ? 'border-red-300 text-red-500' : 'border-green-300 text-green-600'}`}
            >
              {professional.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
