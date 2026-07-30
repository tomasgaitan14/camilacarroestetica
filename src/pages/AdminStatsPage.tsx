import { useState, useEffect } from 'react'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { BottomNav } from '@/components/shared/BottomNav'
import { Spinner } from '@/components/shared/Spinner'
import { formatTime, capitalizeFirst } from '@/lib/utils'
import type { Appointment, StaffProfile } from '@/types'

type Period = 'today' | 'week' | 'month' | 'prev_month'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  prev_month: 'Mes anterior',
}

function getRange(period: Period): { from: Date; to: Date } {
  const now = new Date()
  switch (period) {
    case 'today':      return { from: startOfDay(now), to: endOfDay(now) }
    case 'week':       return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month':      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'prev_month': {
      const prev = subMonths(now, 1)
      return { from: startOfMonth(prev), to: endOfMonth(prev) }
    }
  }
}

function StatCard({ label, value, color = 'neutral' }: { label: string; value: number; color?: 'neutral' | 'green' | 'red' | 'blue' }) {
  const colors = {
    neutral: 'bg-neutral-50 text-neutral-700',
    green:   'bg-green-50 text-green-700',
    red:     'bg-red-50 text-red-600',
    blue:    'bg-blue-50 text-blue-600',
  }
  return (
    <div className={`flex-1 rounded-2xl px-4 py-3 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-70">{label}</p>
    </div>
  )
}

export default function AdminStatsPage() {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'

  const [period, setPeriod] = useState<Period>('today')
  const [filterProfId, setFilterProfId] = useState<string | undefined>(undefined)
  const [professionals, setProfessionals] = useState<StaffProfile[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  // Carga lista de profesionales solo para admin
  useEffect(() => {
    if (!isAdmin) return
    supabase.from('staff_profiles').select('*').eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setProfessionals(data as StaffProfile[]) })
  }, [isAdmin])

  useEffect(() => {
    if (profile) fetchStats()
  }, [period, filterProfId, profile?.id])

  async function fetchStats() {
    if (!profile) return
    setLoading(true)
    const { from, to } = getRange(period)
    let query = supabase
      .from('appointments')
      .select('*, professional:staff_profiles(*), service:services(*)')
      .gte('starts_at', from.toISOString())
      .lte('starts_at', to.toISOString())
      .in('status', ['confirmed', 'completed', 'cancelled'])
      .order('starts_at')

    if (profile.role === 'professional') {
      query = query.eq('professional_id', profile.id)
    } else if (filterProfId) {
      query = query.eq('professional_id', filterProfId)
    }

    const { data } = await query
    setAppointments((data ?? []) as Appointment[])
    setLoading(false)
  }

  const confirmed = appointments.filter(a => a.status === 'confirmed')
  const completed = appointments.filter(a => a.status === 'completed')
  const cancelled = appointments.filter(a => a.status === 'cancelled')
  const total     = appointments.length

  const byDay = appointments.reduce<Record<string, Appointment[]>>((acc, a) => {
    const key = format(new Date(a.starts_at), 'yyyy-MM-dd')
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const statusBadge = (status: string) => {
    if (status === 'completed') return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Realizado</span>
    if (status === 'cancelled') return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Cancelado</span>
    return <span className="text-xs bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full">Confirmado</span>
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="bg-white border-b border-neutral-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="font-semibold text-neutral-900">Estadísticas</h1>

          {/* Filtro de período */}
          <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${period === p ? 'bg-brand-500 text-white' : 'bg-neutral-100 text-neutral-600'}`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Filtro por profesional (solo admin) */}
          {isAdmin && professionals.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5">
              <button
                onClick={() => setFilterProfId(undefined)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${!filterProfId ? 'bg-neutral-700 text-white' : 'bg-neutral-100 text-neutral-600'}`}
              >
                Todas
              </button>
              {professionals.map(p => (
                <button
                  key={p.id}
                  onClick={() => setFilterProfId(p.id === filterProfId ? undefined : p.id)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors
                    ${filterProfId === p.id ? 'bg-neutral-700 text-white' : 'bg-neutral-100 text-neutral-600'}`}
                >
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <>
            {/* Resumen */}
            <div className="flex gap-2 mb-5">
              <StatCard label="Total"       value={total}            color="neutral" />
              <StatCard label="Confirmados" value={confirmed.length} color="blue" />
              <StatCard label="Realizados"  value={completed.length} color="green" />
              <StatCard label="Cancelados"  value={cancelled.length} color="red" />
            </div>

            {/* Lista agrupada por día */}
            {Object.keys(byDay).length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-sm">
                Sin turnos en este período.
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {Object.entries(byDay).map(([day, appts]) => (
                  <div key={day}>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                      {day === format(new Date(), 'yyyy-MM-dd')
                        ? 'Hoy'
                        : capitalizeFirst(format(new Date(day + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es }))}
                    </p>
                    <div className="flex flex-col gap-2">
                      {appts.map(a => (
                        <div key={a.id} className="card flex items-center gap-3">
                          <div className="text-right shrink-0 w-12">
                            <p className="font-semibold text-brand-600 text-sm">{formatTime(new Date(a.starts_at).toTimeString())}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-neutral-800 text-sm truncate">{a.service?.name}</p>
                              {statusBadge(a.status)}
                            </div>
                            <p className="text-xs text-neutral-500 truncate">
                              {a.client_name}
                              {isAdmin && ` · ${a.professional?.name}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav role={profile?.role ?? 'admin'} />
    </div>
  )
}
