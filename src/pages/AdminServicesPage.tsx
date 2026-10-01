import { useState } from 'react'
import { useCatalog, useCatalogSave } from '@/hooks/useCatalog'
import { Spinner } from '@/components/shared/Spinner'
import type { Service } from '@/types'

type ServiceFields = Pick<Service, 'name' | 'description' | 'duration_minutes'>

const EMPTY_SERVICE: ServiceFields = { name: '', description: '', duration_minutes: 60 }
const DURATION_MIN_MINUTES = 5
const DURATION_MAX_MINUTES = 480

export default function AdminServicesPage() {
  const catalog = useCatalog()
  const { saving, error, persist } = useCatalogSave()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const activeCount = catalog.services.filter(s => s.active).length

  async function handleCreate(fields: ServiceFields) {
    const service: Service = { id: crypto.randomUUID(), ...fields, active: true }
    if (await persist({ ...catalog, services: [...catalog.services, service] })) setCreating(false)
  }

  async function handleUpdate(id: string, fields: ServiceFields) {
    const services = catalog.services.map(s => (s.id === id ? { ...s, ...fields } : s))
    if (await persist({ ...catalog, services })) setEditingId(null)
  }

  async function handleToggleActive(service: Service) {
    await persist({
      ...catalog,
      services: catalog.services.map(s => (s.id === service.id ? { ...s, active: !s.active } : s)),
    })
  }

  return (
    <>
      <header className="bg-white border-b border-neutral-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-semibold text-neutral-900">Servicios</h1>
            <p className="text-xs text-neutral-500">{activeCount} activo{activeCount !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => { setCreating(c => !c); setEditingId(null) }}
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
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {creating && (
          <ServiceForm
            title="Nuevo servicio"
            initial={EMPTY_SERVICE}
            saving={saving}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        )}

        {catalog.services.length === 0 && !creating && (
          <div className="text-center py-12 text-neutral-400 text-sm">No hay servicios. Agregá el primero.</div>
        )}

        {catalog.services.map(service => (
          editingId === service.id ? (
            <ServiceForm
              key={service.id}
              title="Editar servicio"
              initial={service}
              saving={saving}
              onSubmit={fields => handleUpdate(service.id, fields)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={service.id} className={`card ${!service.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900">{service.name}</p>
                  {service.description && <p className="text-sm text-neutral-500 mt-0.5">{service.description}</p>}
                  <span className="text-xs text-neutral-400">{service.duration_minutes} min</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditingId(service.id); setCreating(false) }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                    title="Editar"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleToggleActive(service)}
                    disabled={saving}
                    className={`px-3 py-1 rounded-full text-xs font-medium
                      ${service.active ? 'bg-green-50 text-green-600' : 'bg-neutral-100 text-neutral-500'}`}
                  >
                    {service.active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              </div>
            </div>
          )
        ))}
      </main>
    </>
  )
}

interface ServiceFormProps {
  title: string
  initial: ServiceFields
  saving: boolean
  onSubmit: (fields: ServiceFields) => void
  onCancel: () => void
}

function ServiceForm({ title, initial, saving, onSubmit, onCancel }: ServiceFormProps) {
  const [fields, setFields] = useState<ServiceFields>({
    name: initial.name,
    description: initial.description,
    duration_minutes: initial.duration_minutes,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ ...fields, name: fields.name.trim(), description: fields.description.trim() })
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
        placeholder="Nombre del servicio"
        className="input"
      />
      <input
        type="text"
        value={fields.description}
        onChange={e => setFields(f => ({ ...f, description: e.target.value }))}
        maxLength={300}
        placeholder="Descripción (opcional)"
        className="input"
      />
      <div>
        <label className="text-xs text-neutral-500 mb-1 block">Duración (min)</label>
        <input
          type="number"
          value={fields.duration_minutes}
          onChange={e => setFields(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
          required
          min={DURATION_MIN_MINUTES}
          max={DURATION_MAX_MINUTES}
          className="input"
        />
      </div>
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
