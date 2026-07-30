import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useServices } from '@/hooks/useServices'
import { BottomNav } from '@/components/shared/BottomNav'
import { Spinner } from '@/components/shared/Spinner'
import type { StaffProfile } from '@/types'

interface PendingUser {
  id: string
  email: string
  created_at: string
}

export default function AdminProfessionalsPage() {
  const [professionals, setProfessionals] = useState<StaffProfile[]>([])
  const [pending, setPending] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const { services } = useServices()

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [profsRes, pendingRes] = await Promise.all([
      supabase.from('staff_profiles').select('*').order('name'),
      supabase.rpc('get_pending_staff'),
    ])
    setProfessionals((profsRes.data as StaffProfile[]) ?? [])
    setPending((pendingRes.data as PendingUser[]) ?? [])
    setLoading(false)
  }

  async function handleApprove(user: PendingUser, name: string, role: 'professional' | 'admin') {
    await supabase.from('staff_profiles').insert({ id: user.id, name, role })
    fetchAll()
  }

  async function handleToggleActive(prof: StaffProfile) {
    await supabase.from('staff_profiles').update({ is_active: !prof.is_active }).eq('id', prof.id)
    fetchAll()
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="bg-white border-b border-neutral-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="font-semibold text-neutral-900">Equipo</h1>
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Pendientes de aprobación */}
            {pending.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  Pendientes de aprobación ({pending.length})
                </p>
                <div className="flex flex-col gap-3">
                  {pending.map(user => (
                    <PendingCard key={user.id} user={user} onApprove={handleApprove} />
                  ))}
                </div>
              </div>
            )}

            {/* Equipo activo */}
            <div>
              {pending.length > 0 && (
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  Equipo
                </p>
              )}
              <div className="flex flex-col gap-3">
                {professionals.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400 text-sm">
                    Ninguna profesional en el equipo aún.
                  </div>
                ) : professionals.map(prof => (
                  <ProfessionalCard
                    key={prof.id}
                    prof={prof}
                    serviceOptions={services}
                    onToggleActive={handleToggleActive}
                    onUpdate={fetchAll}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav role="admin" />
    </div>
  )
}

interface PendingCardProps {
  user: PendingUser
  onApprove: (user: PendingUser, name: string, role: 'professional' | 'admin') => Promise<void>
}

function PendingCard({ user, onApprove }: PendingCardProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<'professional' | 'admin'>('professional')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onApprove(user, name.trim(), role)
    setSaving(false)
  }

  return (
    <div className="card border-amber-200 bg-amber-50">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-800 truncate">{user.email}</p>
          <p className="text-xs text-amber-600 font-medium">Esperando aprobación</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre completo"
          required
          className="input text-sm py-2"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRole('professional')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors
              ${role === 'professional' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-neutral-600 border-neutral-200'}`}
          >
            Profesional
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors
              ${role === 'admin' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-neutral-600 border-neutral-200'}`}
          >
            Admin
          </button>
        </div>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="btn-primary text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving && <Spinner size="sm" className="border-white/40 border-t-white" />}
          Agregar al equipo
        </button>
      </form>
    </div>
  )
}

interface ProfessionalCardProps {
  prof: StaffProfile
  serviceOptions: import('@/types').Service[]
  onToggleActive: (prof: StaffProfile) => void
  onUpdate: () => void
}

function ProfessionalCard({ prof, serviceOptions, onToggleActive, onUpdate }: ProfessionalCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [assignedIds, setAssignedIds] = useState<string[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [editPhone, setEditPhone] = useState(prof.whatsapp_number ?? '')
  const [editInsta, setEditInsta] = useState(prof.instagram_handle ?? '')
  const [saving, setSaving] = useState(false)

  async function handleExpand() {
    if (!expanded) {
      setLoadingServices(true)
      const { data } = await supabase
        .from('professional_services')
        .select('service_id')
        .eq('professional_id', prof.id)
      setAssignedIds((data ?? []).map((r: { service_id: string }) => r.service_id))
      setLoadingServices(false)
    }
    setExpanded(e => !e)
  }

  async function handleToggleService(serviceId: string) {
    const isAssigned = assignedIds.includes(serviceId)
    if (isAssigned) {
      await supabase.from('professional_services')
        .delete()
        .eq('professional_id', prof.id)
        .eq('service_id', serviceId)
      setAssignedIds(ids => ids.filter(id => id !== serviceId))
    } else {
      await supabase.from('professional_services').insert({ professional_id: prof.id, service_id: serviceId })
      setAssignedIds(ids => [...ids, serviceId])
    }
  }

  async function handleSaveContact() {
    setSaving(true)
    await supabase.from('staff_profiles').update({
      whatsapp_number: editPhone.trim() || null,
      instagram_handle: editInsta.trim() || null,
    }).eq('id', prof.id)
    await onUpdate()
    setSaving(false)
  }

  return (
    <div className={`card ${!prof.is_active ? 'opacity-60' : ''}`}>
      <button onClick={handleExpand} className="w-full flex items-center gap-3 text-left">
        <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
          <span className="text-brand-600 font-bold text-sm">
            {prof.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-900 text-sm">{prof.name}</p>
          <p className="text-xs text-neutral-500">{prof.role === 'admin' ? 'Administradora' : 'Profesional'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
            ${prof.is_active ? 'bg-green-50 text-green-600' : 'bg-neutral-100 text-neutral-500'}`}>
            {prof.is_active ? 'Activa' : 'Inactiva'}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth={2}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-col gap-4">
          {/* Contacto */}
          <div>
            <p className="text-xs font-semibold text-neutral-600 mb-2">Datos de contacto</p>
            <div className="flex flex-col gap-2">
              <input
                type="tel"
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                placeholder="WhatsApp (ej: 5491123456789)"
                className="input text-sm py-2"
              />
              {prof.role === 'admin' && (
                <input
                  type="text"
                  value={editInsta}
                  onChange={e => setEditInsta(e.target.value)}
                  placeholder="Instagram (@usuario)"
                  className="input text-sm py-2"
                />
              )}
              <button
                onClick={handleSaveContact}
                disabled={saving}
                className="self-start px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold active:bg-brand-600 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar contacto'}
              </button>
            </div>
          </div>

          {/* Servicios */}
          <div>
            <p className="text-xs font-semibold text-neutral-600 mb-2">Servicios que ofrece</p>
            {loadingServices ? (
              <Spinner size="sm" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map(s => {
                  const assigned = assignedIds.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleToggleService(s.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                        ${assigned
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white text-neutral-600 border-neutral-200 active:bg-neutral-50'
                        }`}
                    >
                      {s.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Toggle activa/inactiva */}
          <button
            onClick={() => onToggleActive(prof)}
            className={`self-start text-xs font-medium px-3 py-1.5 rounded-full border
              ${prof.is_active
                ? 'border-red-300 text-red-500 active:bg-red-50'
                : 'border-green-300 text-green-600 active:bg-green-50'
              }`}
          >
            {prof.is_active ? 'Desactivar profesional' : 'Activar profesional'}
          </button>
        </div>
      )}
    </div>
  )
}
