import { useState } from 'react'
import { useServices } from '@/hooks/useServices'
import { supabase } from '@/lib/supabase'
import { BottomNav } from '@/components/shared/BottomNav'
import { Spinner } from '@/components/shared/Spinner'
import type { Service } from '@/types'

export default function AdminServicesPage() {
  const { services, loading, refresh } = useServices()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', duration_minutes: 60, display_price: '' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('services').insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration_minutes: form.duration_minutes,
      display_price: form.display_price.trim() || null,
    })
    setForm({ name: '', description: '', duration_minutes: 60, display_price: '' })
    setShowForm(false)
    await refresh()
    setSaving(false)
  }

  async function handleToggleActive(service: Service) {
    await supabase.from('services').update({ is_active: !service.is_active }).eq('id', service.id)
    refresh()
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="bg-white border-b border-neutral-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-semibold text-neutral-900">Servicios</h1>
            <p className="text-xs text-neutral-500">{services.length} servicio{services.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
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

      <main className="px-4 py-5 max-w-lg mx-auto">
        {/* Formulario nuevo servicio */}
        {showForm && (
          <form onSubmit={handleCreate} className="card mb-4 flex flex-col gap-3">
            <h3 className="font-semibold text-neutral-800">Nuevo servicio</h3>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="Nombre del servicio"
              className="input"
            />
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descripción (opcional)"
              className="input"
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-neutral-500 mb-1 block">Duración (min)</label>
                <input
                  type="number"
                  value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                  required
                  min={15}
                  max={480}
                  className="input"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-neutral-500 mb-1 block">Precio (display)</label>
                <input
                  type="text"
                  value={form.display_price}
                  onChange={e => setForm(f => ({ ...f, display_price: e.target.value }))}
                  placeholder="Ej: $ 5.000"
                  className="input"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex items-center justify-center gap-2">
                {saving && <Spinner size="sm" className="border-white/40 border-t-white" />}
                Guardar
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary !w-auto px-5">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="flex flex-col gap-3">
            {services.length === 0 && !showForm && (
              <div className="text-center py-12 text-neutral-400 text-sm">
                No hay servicios. Agregá el primero.
              </div>
            )}
            {services.map(service => (
              <div key={service.id} className={`card ${!service.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-neutral-500 mt-0.5">{service.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-neutral-400">{service.duration_minutes} min</span>
                      {service.display_price && (
                        <span className="text-xs font-semibold text-brand-600">{service.display_price}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(service)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium
                      ${service.is_active ? 'bg-green-50 text-green-600' : 'bg-neutral-100 text-neutral-500'}`}
                  >
                    {service.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav role="admin" />
    </div>
  )
}
